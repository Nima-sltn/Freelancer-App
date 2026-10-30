# FreelanceHub — Frontend

A Persian-first (RTL) job-board client for a three-role marketplace: **clients**
post projects, **freelancers** bid on them, **admins** moderate the platform.
Built as a React 18 + TypeScript single-page app on Vite, with a typed HTTP
layer, role-aware feature modules and an ACID-inspired write pipeline for
optimistic updates.

> The project ships with a **fully offline demo mode**: the entire product runs
> in the browser against a seeded dataset, no backend required.

---

## Quick start

```bash
npm install

# 1. Demo mode — no backend, deterministic seed data
cp .env.demo .env.local
npm run dev            # http://localhost:3000

# 2. Live mode — talks to the Express + MongoDB API
cp .env.example .env.local     # VITE_API_MODE=live, VITE_PROXY_TARGET=…
npm run dev
```

Demo sign-in accepts any of the seeded accounts with the OTP code the API
echoes back (`111111`):

| Role | Phone | Purpose |
| --- | --- | --- |
| Admin | `09120000001` | moderation console, users, categories |
| Client (owner) | `09120000002` | projects, proposals received, wallet |
| Freelancer | `09120000003` | ranked projects, bids, board, leaderboard |
| Pending client | `09120000004` | exercises the "awaiting approval" flow |

Append `?demo=reset` to any URL to restore the deterministic seed.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000, `/api` proxied to `VITE_PROXY_TARGET` |
| `npm run build` | Production build with vendor chunk splitting |
| `npm run preview` | Serve the built bundle |
| `npm run typecheck` | `tsc --noEmit` over `src` |
| `npm test` | Vitest in CI mode (domain, pipeline, transport **and** conformance suites) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run verify` | typecheck → tests → build, in that order |
| `npm run lint` | ESLint — see the note below |

> **Known toolchain limitation.** `npm run lint` cannot currently run: the
> project pins TypeScript **7.0.2**, while `@typescript-eslint/parser` v7 (used
> by `.eslintrc.cjs`) and v8 both declare a peer range of `typescript < 6.1`.
> The parser crashes at load time (`ts.BarBarToken` is gone in TS 7). This is an
> upstream incompatibility, not a rule violation in the codebase, so the enforced
> gates are `npm run typecheck`, `npm test` and `npm run build` — all three run
> in `npm run verify`. Track typescript-eslint's TS 7 support to re-enable lint.

---

## Environment variables

Every read of `import.meta.env` happens in [`src/config/env.ts`](src/config/env.ts);
nothing else touches it, which keeps the runtime contract typed and mockable.

| Variable | Default | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | `/api` | API base URL (same-origin in dev via the Vite proxy) |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Where the dev server forwards `/api` |
| `VITE_API_MODE` | `live` | `live` → Express/Mongo, `mock` → in-browser demo dataset |
| `VITE_MOCK_LATENCY` | `320` | Artificial latency (ms) so optimistic UI is observable |
| `VITE_REQUEST_TIMEOUT` | `20000` | Per-request timeout (ms) |
| `VITE_ENABLE_DEVTOOLS` | dev | React Query devtools |
| `VITE_ENABLE_SERVICE_WORKER` | `false` | Offline shell registration |
| `VITE_ENABLE_REALTIME` | `true` | Background revalidation |

---

## What makes this client different

- **Explainable matching.** Every project gets a 0–100 fit score whose six
  weighted factors (skills, category, budget, deadline, competition,
  reputation) are shown to the user instead of a black-box number.
- **ACID write pipeline & Merkle verification.** Optimistic cache patches with captured inverses, a
  per-resource lock, a consistency gate, durable journal replay across reloads, and **cryptographic Merkle tree hash-chains** allowing mathematical verification of transaction integrity.
- **Cross-tab realtime synchronization.** Peer-to-peer state replication across open tabs using HTML5 BroadcastChannel and monotonic Lamport logical clocks with deterministic conflict resolution.
- **Predictive intent pre-warming.** Discrete first-order Markov transition chain anticipating user navigation patterns and scheduling idle-time route chunk pre-warming.
- **Procedural acoustic feedback & canvas topology.** Zero-asset micro-audio synthesis via the native Web Audio API and 60 FPS hardware-accelerated spring physics canvas visualizing multi-point trust affinity.
- **Cross-domain, on purpose.** Accepting a bid moves money, changes trust and
  XP, raises a notification and lands in the audit trail; those fan-outs are
  declared once as data and rendered per row in the inspector and audit views
  ([docs/CROSS_DOMAIN.md](docs/CROSS_DOMAIN.md)).
- **Architecture that is tested, not just documented.** Seven dependency rules
  (layer direction, React-free domain, feature isolation, no import cycles…) are
  asserted by `src/test/architecture.test.ts` on every run.
- **Trust, risk and pricing.** Trust scores from observable behaviour, proposal
  risk screening for moderators, and an interactive bid simulator with a
  platform-fee breakdown.
- **Cross-domain insight.** An analytics engine, portfolio/pipeline aggregates,
  wallet ledger, activity timeline, audit trail and gamified leaderboard — all
  derived client-side from data the user may already see.
- **Bilingual by construction.** ~1 000 translation keys, `fa`/`en` with
  automatic RTL, Jalali/Gregorian dates and Persian-digit numerics everywhere
  through `Intl`.

Full details: [docs/FEATURES.md](docs/FEATURES.md).

---

## Project structure

```
src/
├─ app/            composition roots: router, providers, guards, authenticated shell
├─ components/     design system — ui/, form/, charts/, layout/, feedback/
├─ config/         env, constants, navigation model (data), query-key factory
├─ entities/       pure domain logic — metrics, matching, trust, analytics,
│                  ledger, activity (audit feed + cross-domain impact map)
├─ features/       feature modules (each owns its UI + hooks + mutations)
├─ hooks/          reusable, dependency-free hooks
├─ lib/            http client, formatters, validators, storage, export, events
├─ mocks/          demo transport, seeded dataset, durable db, transport install
├─ pages/          route-level components (lazy-loaded)
├─ services/       one thin module per API resource
├─ store/          cross-cutting providers: i18n, theme, command, notifications,
│                  transaction (ACID), realtime
├─ test/           vitest setup, fixture factories, conformance suites
└─ types/          shared domain contracts
```

The dependency rule is one-directional
(`app|pages → features → components/store/hooks → entities/services → config/lib → types`)
and it is **enforced**: `src/test/architecture.test.ts` fails the build on an
upward import, a cross-feature import, a React import inside `lib`/`entities`, a
misplaced HTTP-client import, an unresolvable path or an import cycle.
`lib` and `entities` never import React, which is what makes them testable
without a DOM.

---

## Documentation

Every relative link in this table is verified by `src/test/docs.test.ts`, so a
renamed document fails the build instead of shipping a dead link.

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Layers, data flow, state ownership, rendering and performance strategy |
| [docs/ACID.md](docs/ACID.md) | The transaction pipeline: atomicity, consistency, isolation, durability |
| [docs/CROSS_DOMAIN.md](docs/CROSS_DOMAIN.md) | The domain map: which write reaches which domain, and where each coupling lives |
| [docs/FEATURES.md](docs/FEATURES.md) | Cross-domain feature catalogue with the maths behind each |
| [docs/API.md](docs/API.md) | Endpoint contracts the client depends on, and demo-mode coverage |
| [docs/TESTING.md](docs/TESTING.md) | Test strategy, conventions, factories, how to add coverage |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture decision records with alternatives and trade-offs |
| [CHANGELOG.md](CHANGELOG.md) | What changed in the 2.0 rewrite and the hardening pass |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Contribution standards, code style, and developer workflow |

---

## Tech stack

React 18 · TypeScript 7 · Vite 5 · Tailwind CSS 3 · TanStack Query 5 ·
React Router 6 · Axios · React Hook Form · Headless UI · react-hot-toast ·
Vitest + Testing Library.

Charts are hand-written SVG components (`src/components/charts`) rather than a
charting dependency, so the dashboards ship zero extra runtime weight.

## License

See [LICENSE](LICENSE).
