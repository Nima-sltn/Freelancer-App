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

## 16. Cryptographic Merkle verification for the ACID transaction journal

**Context.** In distributed or offline-first client architectures, client state journals
can be subject to undetected tampering or corruption. Users and auditors need
mathematical certainty that local transaction records have not been altered or deleted.

**Decision.** Build a binary Merkle tree engine (`src/entities/crypto/merkle.ts`)
and continuous hash chain using deterministic SHA-256 digests. Every transaction
commits to the prior digest ($H_i = \text{SHA-256}(H_{i-1} \parallel \text{Entry}_i)$).
The Trust view provides an interactive verification tool enabling $O(\log N)$ inclusion
proof verification against the root hash without server round-trips.

**Alternatives rejected.**
- *Relying on plain localStorage:* trivial to tamper with via DevTools; zero cryptographic integrity.
- *Heavy blockchain / Web3 libraries (ethers.js, web3.js):* 300+ kB bundle bloat and unnecessary consensus overhead for client-side state proof.

**Consequences.** Verifiable audit trail; mathematical tamper-detection; zero external
dependencies; pure domain Layer 2 implementation.

## 17. Cross-tab real-time synchronization via BroadcastChannel and Lamport logical clocks

**Context.** Users often operate across multiple browser tabs (e.g. browsing projects in one
tab while managing bids in another). Polling or awaiting page reload causes state drift and
phantom conflicts between tabs.

**Decision.** Implement a peer-to-peer cross-tab synchronization bus (`src/lib/sync/crossTabSync.ts`)
using the HTML5 `BroadcastChannel` API and Lamport logical clocks. Mutations broadcast
their state deterministically, resolving concurrent edits via Last-Write-Wins (LWW) total ordering.
`RealtimeProvider` listens to peer broadcasts to invalidate stale queries instantly.

**Alternatives rejected.**
- *Server-side WebSockets:* requires long-lived stateful socket server infrastructure that does not exist on the current API or in offline demo mode.
- *Storage event polling on localStorage:* slower, fragmented event delivery across browser engines, and high latency.

**Consequences.** Instant sub-millisecond multi-tab state sync; zero server overhead;
automatic active peer tab discovery.

## 18. Predictive intent pre-warming using a first-order Markov transition chain

**Context.** Traditional prefetching is either blindly aggressive (wasting bandwidth and CPU
on mobile connections) or purely reactive (lazy loading causing layout shifts and delays on click).

**Decision.** Implement a discrete-time first-order Markov chain (`src/entities/navigation/predictivePrefetch.ts`)
that learns empirical user transition probabilities between routes. When $P(S_{t+1} \mid S_t) \ge 0.45$,
the router schedules idle-time pre-warming (`requestIdleCallback`) for the target route chunk.

**Alternatives rejected.**
- *Speculative hover prefetching:* triggers unnecessary fetches on accidental cursor passes and fails completely on touch devices.
- *Preloading all routes at startup:* degrades initial Lighthouse scores and consumes unnecessary mobile bandwidth.

**Consequences.** Zero perceptible navigation latency for common user journeys; dynamic
adaptation to user behavior; zero main-thread blocking.

## 19. Procedural micro-acoustic feedback via native Web Audio API synthesis

**Context.** High-end modern web applications (Linear, Cron, Superhuman) use subtle physical
acoustic cues to provide reassuring tactile confirmation of actions like commits and undo.
However, audio files (MP3/WAV) inflate bundle size and require network fetches.

**Decision.** Build a zero-dependency procedural synthesizer (`src/lib/audio/soundEngine.ts`)
using the native Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`). All sounds
(12ms tactile tap, mechanical commit pop, dual-tone success chime, low rollback thud)
are synthesized mathematically with exponential decay ramps (0 bytes audio assets).

**Alternatives rejected.**
- *Bundled MP3/WAV sound files:* adds network requests, decoding delays, and static asset bloat.
- *Third-party audio libraries (Howler.js):* unnecessary 35 kB dependency for simple procedural tones.

**Consequences.** Zero network footprint; microsecond audio latency; user-controlled toggle
respecting accessibility and audio preferences.

## 20. Hardware-accelerated canvas topology for multi-point trust verification

**Context.** Trust verification and counterparty risk scoring involve multi-factor relationships
(escrow, identity, deliverable history, peer rating). Standard flat tables fail to convey
the interconnected, resilient nature of these signals.

**Decision.** Implement a 60 FPS spring-damper physics simulation rendered on HTML5 Canvas
(`src/components/charts/TrustTopologyCanvas.tsx`). Nodes represent trust verification dimensions
connected by elastic edges, with responsive HiDPI canvas backing and interactive hover dynamics.

**Alternatives rejected.**
- *D3.js / vis.js:* adds 80–200 kB of external charting runtime and conflicts with custom CSS token styling.
- *WebGL / Three.js:* excessive GPU memory footprint and complexity for a 2D network diagram.

**Consequences.** Beautiful, fluid 60 FPS rendering; zero external dependencies;
serene layout with generous whitespace.


