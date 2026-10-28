# Architecture decision records

Short, opinionated records of the choices that are expensive to reverse. Each
one names the alternatives that were rejected and *why* — the trade-off is the
point, not the choice.

---

## 1. Feature-sliced layers with an enforced import graph

**Context.** The codebase was originally organised by type (`components/`,
`hooks/`, `pages/`), so a single capability was spread across six folders and
nobody could tell which direction code was allowed to flow.

**Decision.** Six layers — `types → config|lib → entities|services|store|hooks|components → features → pages|app` — with a written dependency rule
([ARCHITECTURE.md](ARCHITECTURE.md) §1) **and a test that fails the build when
the graph violates it** (`src/test/architecture.test.ts`, seven rules including
"no cycles", "lib and entities are React-free", "features do not import each
other except the dashboard aggregator").

**Alternatives rejected.**
- *Type-first folders:* simple at 10 files, unmanageable at 100; a change to
  bidding touched five directories.
- *Rules in a style guide / PR review:* proven to decay within a few commits;
  the test costs 20 ms and never forgets.
- *`eslint-plugin-boundaries`:* the project cannot run ESLint today (TypeScript
  7 vs `@typescript-eslint` peer ranges — see README), so an ESLint-based rule
  would enforce nothing.

**Consequences.** A new capability lands in one folder; upward imports are
caught immediately with a file:line message; the two documented exceptions
(`features/dashboard` as aggregator, `components/layout` as presentational) are
visible in the test instead of being folklore.

## 2. Pure read models in `entities/`

**Context.** Dashboards, analytics, trust, matching, the ledger and the audit
feed are all *functions of data the client already has*. They were being
computed inside components, twice, differently.

**Decision.** All derivations live in `entities/` as pure functions with no
React, no cache and no I/O. Features memoise them; pages and exporters call the
same function; tests call them without a DOM.

**Alternatives rejected.**
- *Server-computed analytics:* requires new endpoints for a client that must
  also work fully offline in demo mode.
- *Component-local `useMemo` with inline maths:* untestable and impossible to
  keep consistent between the wallet page and the dashboard.

**Consequences.** One implementation per number; ~60 unit tests run without
jsdom; the domain layer is reusable from the CSV exporters, the demo transport
and future native clients.

## 3. Serialisable commands instead of closures in the journal

**Context.** The ACID pipeline journals every write for durability, but a
closure (`request: () => …`) cannot be persisted — so "queued offline" entries
used to be *marked* as synced on reconnect rather than actually re-sent. The
durability claim was weaker than the documentation.

**Decision.** Every write declares a serialisable twin
(`{ name, args }`, a discriminated union in `types/index.ts`, executed by
`store/transaction/commands.ts`). The journal stores the descriptor, so the
outbox re-sends the *same request* after reconnect, after a reload, or from the
inspector. In-session replays fall back to the closure when no descriptor is
declared.

**Alternatives rejected.**
- *Persist the request spec ad hoc (URL + body):* duplicates the HTTP layer and
  drifts from services.
- *Drop entries the build cannot re-send:* silently loses user work — instead
  they are quarantined as `rolled-back` + `tx.unreplayable` and their query keys
  are invalidated.
- *IndexedDB / a service-worker queue:* heavier, browser-support-sensitive, and
  still needs the same command catalogue.

**Consequences.** Durability is literal (asserted by tests that count request
invocations); adding a write without registering it is a *compile* error; the
same catalogue powers undo.

## 4. Demo mode as an axios adapter

**Context.** The product must demo end-to-end with no backend, and the same
code must run against Express.

**Decision.** In `mock` mode an axios **adapter** answers the *same URLs* with
the *same envelope, status codes and authorization rules*, over a seeded dataset
persisted to `localStorage`. Wiring lives in `mocks/install.ts` (composition
root), so `lib/http` never imports the demo layer.

**Alternatives rejected.**
- *MSW:* excellent, but adds a dependency and a worker lifecycle to a project
  that deliberately keeps its runtime lean; the adapter also lets us model
  Express's *authorization* rules, not just its responses.
- *A second `mockService` layer:* doubles the surface and guarantees demo and
  live drift apart — exactly the bug class this avoids.
- *Mocking `fetch`:* axios is the transport; mocking below it bypasses
  interceptors (refresh, envelope, errors), hiding real bugs.

**Consequences.** Demo and live exercise identical services/hooks/components;
`adapter.test.ts` acts as the client's contract suite for the API; the adapter
is dynamically imported so it never ships in live bundles.

## 5. Derived notifications and audit instead of a push backend

**Context.** There is no websocket or notification endpoint.

**Decision.** Notifications come from two honest sources: a *state* observer
(`useDerivedNotifications` — new proposal, accepted bid, deadline inside three
days, moderation backlog) and an *event* bridge
(`useTransactionNotifications` — your own writes and their outcomes). The audit
trail merges reconstructed server events with the local journal
(`entities/activity/feed.ts`).

**Alternatives rejected.**
- *Polling a notifications endpoint:* there isn't one, and polling is already
  what `RealtimeProvider` does for data.
- *Faking server events:* the feed labels every row `source: remote|local`
  precisely so nothing pretends to be something it is not.

**Consequences.** The feature works offline and in demo mode; deterministic ids
make it idempotent; no backend change is required to ship it.

## 6. Compensation, not deletion, for undo

**Context.** Users want "undo" after a write already reached the server.

**Decision.** Undo restores the captured inverse locally **and** issues the
serialised compensating command (reverse status write, un-close, …). If the
server refuses the compensation, the entry stays committed and the user is told
— an optimistic undo that never landed would be a lie.

**Alternatives rejected.**
- *Local-only undo:* diverges from the server on the next refetch.
- *Tombstone/delete-and-recreate:* changes history, breaks audit semantics.
- *Full command sourcing with redo:* not needed by any screen here.

## 7. Zero-dependency SVG charts

**Context.** Dashboards need area/bar/donut/sparkline charts.

**Decision.** `components/charts/*` renders SVG directly, themed with CSS
variables, accessible via `role="img"` + titles.

**Alternatives rejected.** Recharts/Chart.js: 40–300 kB of runtime, theming
that fights the token system, and no benefit for four chart shapes.

**Consequences.** Dark mode is a variable swap; charts reflow without JS; the
bundle keeps only app code.

## 8. Data-driven navigation and icon keys

**Context.** Sidebar, mobile drawer, breadcrumbs and command palette must agree
about what exists — and `config/` must not import React (rule 1).

**Decision.** Navigation is a data model (`config/navigation.ts`) whose entries
carry an `IconName` key; `components/ui/IconFor` resolves keys to glyphs.

**Alternatives rejected.** Storing JSX elements in config: convenient, but it
inverts the dependency rule and puts `.tsx` in the configuration layer.

## 9. Persian-first i18n on `Intl`

**Context.** The primary audience reads Persian; the calendar and numerals are
not Latin.

**Decision.** One dictionary per locale (`en` typed as `Record<TranslationKey,
string>` so the compiler enforces English coverage; `i18n.test.ts` enforces
Persian), `Intl` for Jalali/Gregorian dates and digits, logical CSS properties
for RTL, and normalisation helpers for Arabic letter forms, ZWNJ and Persian
digits in inputs/search.

**Alternatives rejected.** moment-jalaali / date-fns-jalali: a dependency for
what `Intl.DateTimeFormat('fa-IR-u-ca-persian')` already does.

## 10. Documentation as a build gate

**Context.** README, architecture and ACID docs already described behaviour that
had silently drifted (five linked documents did not exist).

**Decision.** `src/test/docs.test.ts` resolves every relative link in
`README.md`, `CHANGELOG.md` and `docs/*.md`; the architecture rules are tested
(see #1); docs are written next to the code they describe and updated in the
same change.

**Consequences.** A renamed file breaks the build with a message, instead of
shipping a README with dead links.

## 11. Feature-level error boundaries

**Context.** A single global error boundary causes the entire application shell
to unmount whenever an unhandled rendering error occurs in a sub-view (such as a
broken chart widget or malformed table row). The user loses their active session
context, draft inputs, and navigation state.

**Decision.** Introduce granular, feature-level error boundaries around isolated
route outlets, complex dashboard widgets, and transactional panels. When a
child component throws, the boundary traps the failure locally, displays an inline
recovery card with a retry button, and keeps the surrounding shell, sidebar, and
active route functional.

**Alternatives rejected.**
- *React Router `errorElement` exclusively:* only catches errors thrown during
  route loaders or top-level route renders, leaving deep nested component crashes
  unhandled or escalating them to root.
- *Try-catch blocks in every component:* highly verbose, repetitive, violates
  declarative React paradigms, and cannot catch lifecycle rendering errors.

**Consequences.** A single crashing widget no longer brings down the whole screen;
users can recover gracefully; error telemetry captures isolated stack traces with
feature scope tags.

## 12. Plugin architecture for extensibility

**Context.** As the platform expands, third-party extensions, custom analytics
reporters, external payment processors, and workflow integrations need to tap into
the application lifecycle without modifying core feature bundles or creating merge
conflicts.

**Decision.** Implement a lightweight plugin registry in the `lib` layer with
declarative lifecycle hooks (`onInit`, `onTransaction`, `onNavigate`, `onDestroy`).
Plugins register capabilities via typed contracts and communicate with core modules
solely through standard event bus signals and state descriptors.

**Alternatives rejected.**
- *Micro-frontends:* introduces tremendous operational complexity, multiple build
  pipelines, CSS leakage issues, and excessive bundle duplication for a single-team
  product.
- *Higher-Order Component (HOC) composition:* tightly couples components to external
  wrappers, complicates debugging and props passing, and creates deeply nested React trees.

**Consequences.** Core modules remain lean and independent; new features can be
packaged as modular plugins; plugin discovery and registration happen at composition roots
without violating downward-only layer dependencies.

## 13. Client-side AI recommendation engine

**Context.** Freelancers need an intelligent, personalized feed matching them with
high-probability projects. However, the backend does not provide machine learning
ranking endpoints, and server resources are intentionally constrained.

**Decision.** Build a multi-factor recommendation engine in `entities/proposal/matching.ts`
that executes entirely client-side. The engine computes normalized affinity across
skill overlap, budget alignment, category familiarity, deadline flexibility, and
competitive density, exposing an explainable factor scorecard for every project.

**Alternatives rejected.**
- *Server-side ML services:* requires dedicated backend infrastructure, embeddings
  storage, and runtime inference costs that are unavailable in offline demo mode.
- *Random or simple chronological ranking:* surfaces irrelevant projects, degrading
  user engagement and proposal conversion rates.
- *Manual curation by administrators:* completely non-scalable as project volume
  increases.

**Consequences.** Recommendations are computed instantly in memory; zero additional
backend latency; 100% testable with deterministic unit tests; fully functional in
offline demo mode.

## 14. Lightweight Web Vitals without dependencies

**Context.** Continuous monitoring of Core Web Vitals (LCP, FID/INP, CLS, FCP, TTFB)
is essential for maintaining top-tier user experience and SEO performance, but third-party
monitoring SDKs add heavy runtime overhead and introduce third-party privacy concerns.

**Decision.** Implement a custom, dependency-free Web Vitals observer (~100 LOC)
directly utilizing the native browser `PerformanceObserver` API. Metrics are sampled,
buffered, and reported via the internal telemetry event bus.

**Alternatives rejected.**
- *The `web-vitals` npm package:* adds extra bundle weight and external maintenance overhead
  for capabilities natively available in modern browsers.
- *Google Analytics / third-party trackers:* introduces external tracking scripts,
  violates user privacy principles, and requires complex cookie consent banners.
- *Heavy APM agents (e.g. New Relic, Datadog):* excessive cost, high network overhead,
  and unnecessary complexity for a client-side SPA.

**Consequences.** Zero external dependencies; zero impact on Lighthouse scores; strict
control over data telemetry and user privacy.

## 15. CSS-only animations respecting user preferences

**Context.** Micro-interactions, slide transitions, and state changes provide critical
spatial awareness and visual polish, but animation libraries can introduce significant
JavaScript overhead and cause motion sickness if accessibility settings are ignored.

**Decision.** Rely exclusively on GPU-accelerated CSS transitions and transforms driven
by semantic data attributes (`data-state`, `data-transition`). Animations are conditioned
on media queries (`prefers-reduced-motion: reduce`) and the application-level accessibility
toggle, instantly snapping states without motion when reduction is requested.

**Alternatives rejected.**
- *Framer Motion:* adds ~80 KB to the bundle, requires React-level render loops, and
  frequently complicates simple DOM transitions.
- *React Spring:* adds ~45 KB and relies on physics calculations running on the main thread.
- *GSAP:* proprietary commercial licensing constraints, non-declarative DOM manipulation,
  and significant script payload.

**Consequences.** Butter-smooth 60 fps transitions utilizing compositor threads; negligible
bundle size contribution; built-in WCAG 2.1 compliance for motion sensitivity.

