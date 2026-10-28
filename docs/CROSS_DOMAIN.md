# Cross-domain map

A freelance marketplace is not five features that happen to share a login; it is
one transaction fan-out. A bid is simultaneously a proposal, a piece of money, a
trust signal, a gamification event, a notification and an audit record. When
those couplings are *implicit* — rediscovered in six files by whoever edits them
next — the product reads as six silos: the wallet disagrees with the board, the
badge counter misses what the journal recorded.

This document is the map. Every coupling below is declared **once, as data**, in
[`src/entities/activity/impact.ts`](../src/entities/activity/impact.ts), and a
test asserts the fan-out (`src/entities/activity/activity.test.ts`). The
transaction inspector renders it per row; the audit trail renders it per event.

---

## 1. The domains

| Domain | Owns | Read model | Write path |
| --- | --- | --- | --- |
| **projects** | listings, budgets, deadlines | `entities/project/metrics.ts` | `project.*` commands |
| **proposals** | bids, review decisions, the Kanban board | `entities/proposal/matching.ts` | `proposal.*` commands |
| **users** | roles, verification, moderation | `features/users` | `user.changeStatus` |
| **wallet** | escrow, payouts, platform fee | `entities/ledger.ts` | derived from proposals |
| **trust** | trust score, risk flags, XP, badges | `entities/user/trust.ts` | derived from users + proposals |
| **leaderboard** | ranking, win rate | `entities/user/trust.ts` (`buildLeaderboard`) | derived from proposals + users |
| **analytics** | snapshot, trends, insights | `entities/analytics/overview.ts` | derived from everything |
| **notifications** | the user's "what happened" feed | `store/notifications` | event bridge + derived observer |
| **audit** | chronological record of change | `entities/activity/feed.ts` | journal + reconstructed events |
| **sync** | the offline outbox | `store/transaction/journal.ts` | `TransactionProvider` |

Read models are **pure functions in `entities/`**: no React, no I/O, no cache
access. A page never computes a number twice — it calls the same function the
dashboard, the CSV export and the test call.

---

## 2. The write fan-out

One accepted proposal, end to end:

```
owner taps Accept
  │
  ├─ store/transaction ── validate (Consistency)
  │        │               patch cache + capture inverse (Atomicity)
  │        │               serialise per proposal:<id> (Isolation)
  │        │               journal entry with { command, compensateCommand } (Durability)
  │        │
  │        ├─► http ─► POST /proposal/:id  (or the demo transport)
  │        │        on success: invalidate proposals/projects/detail keys
  │        │
  │        ├─► event: transactionCommitted
  │        │        ├─► store/notifications   → "your bid was accepted"
  │        │        └─► (any listener, no import edge required)
  │        │
  │        └─► derived views recompute from the cache:
  │                 entities/ledger        → escrow-in, payout, fee rows
  │                 entities/user/trust    → XP +60, possible badge, trust band
  │                 entities/.../overview  → acceptance rate, escrow total
  │                 entities/activity      → audit entry, impact chips
  └─► audit page, journey inspector, dashboards all agree
```

The rule that keeps this honest: **no domain reads another domain's *cache*
directly.** They read shared *inputs* (the same `Proposal[]`) through pure
functions, or they listen to the event bus. There is exactly one writer (the
transaction pipeline) and one reader shape (an entity function).

---

## 3. The couplings, in code

| Event | Domains reached | Where |
| --- | --- | --- |
| `proposal` submitted | proposals, analytics, notifications, audit | `describeImpact` → `proposalImpacts` |
| `proposal` **accepted** | proposals, **wallet**, **trust**, **leaderboard**, analytics, notifications, audit | `entities/activity/impact.ts` |
| `proposal` rejected | proposals, analytics, notifications, audit | — |
| `project` created / closed / edited | projects, analytics, notifications, audit | `projectImpacts` |
| `user` **verified** | users, **trust** (the 25-point verified signal), analytics, notifications, audit | `userImpacts` |
| any write while offline | + **sync** (the outbox owns it until the server confirms) | `describeImpact` |

Rendering:

- **Journey page** — every journal row shows its impact chips, plus a summary
  card counting how many times each domain was touched by this browser.
- **Audit page** — every event (local *and* reconstructed) shows the same chips,
  so a server event and a local write are visibly comparable.
- **Notification centre** — receives committed/queued/rolled-back writes from
  the event bridge (`features/notifications/useTransactionNotifications.ts`),
  independently of the state-derived feed
  (`features/notifications/useDerivedNotifications.ts`).

---

## 4. Why this matters for correctness

Three failure modes this design removes:

1. **Silent disagreement.** `useChangeUserStatus` used to bypass the
   transaction pipeline, so a moderation decision produced no journal entry, no
   audit event and no notification while the users list flipped instantly. It now
   runs through `run()` like every other write — one writer, four surfaces in
   agreement.
2. **Untraceable money.** The ledger is derived from proposals by one function
   (`entities/ledger.ts`), so the wallet page, the analytics escrow figure and
   the CSV export can never diverge — there is no second implementation.
3. **Silent fan-out.** A coupling nobody can name is a coupling nobody
   maintains. `describeImpact` names them, tests pin them, the UI shows them.

---

## 5. Adding a coupling

1. Declare it in `describeImpact` (`entities/activity/impact.ts`) — one line,
   with a tone.
2. If it needs a label, add `impact.<domain>` to **both** dictionaries in
   `store/i18n/translations.ts` (the compiler fails if `en` is missing).
3. Assert it in `entities/activity/activity.test.ts`.
4. If the new write must survive a reload, register its command in
   `store/transaction/commands.ts` (see [ACID.md](ACID.md) §2).

If a future change needs domain A to *read* domain B's state, prefer adding a
pure function over shared inputs in `entities/` — that keeps the fan-out testable
and keeps the import graph pointing downwards (enforced by
`src/test/architecture.test.ts`).

---

## 6. Progressive Web App (PWA)

FreelanceHub is engineered as an offline-first Progressive Web Application, bridging
the gap between standard web applications and native desktop/mobile clients.

### Caching strategies

The service worker (`public/sw.js` and `src/lib/serviceWorker.ts`) implements tiered
caching strategies tailored to resource categories:

1. **Precached App Shell (Cache-First)**: Core HTML entry point, bundled scripts,
   stylesheets, and the web app manifest are pre-cached on service worker install,
   enabling instant boot-up even without an active internet connection.
2. **Static Assets & Fonts (Cache-First with SWR)**: Immutable fonts, icons, and
   media assets are served directly from cache while revalidating in the background.
3. **API Read Models (Network-First with Offline Fallback)**: Read queries
   (`/api/project/list`, `/api/user/profile`) attempt live fetch with a tight timeout,
   falling back to indexed offline snapshots if the device is disconnected.
4. **Mutations**: Write requests are NEVER cached by the service worker; they are
   intercepted and routed through the client-side ACID outbox pipeline (see [ACID.md](ACID.md)).

### Background sync

For browsers supporting the Background Sync API (`registration.sync`), offline
transactions register a sync tag (`freelancehub-outbox-sync`). When the browser
regains connectivity, the service worker awakens and notifies the client via the
broadcast channel to trigger an immediate, idempotent replay of queued commands.

### Install prompt

Modern browsers suppress automatic install banners to prevent user annoyance.
FreelanceHub intercepts the `beforeinstallprompt` event:

- The event is captured and stored in application state.
- An accessible, non-intrusive install banner and topbar prompt are presented to the user.
- Tapping "Install App" triggers the native installation prompt, providing a standalone
  windowed experience on Windows, macOS, Android, and iOS.

### Push notification readiness

The service worker includes a push event handler and subscription helper:

- Subscribes to web push notifications using the browser's `PushManager` and VAPID public key.
- Handles incoming `push` events to display rich notifications for urgent marketplace
  events (e.g. accepted bids, escrow deposits, or new proposal submissions).
- Clicking a notification brings the app window to the front and navigates directly
  to the relevant proposal or project detail route.

---

## 7. SEO and meta management

Even though FreelanceHub is an authenticated SPA, public listings (such as project
boards, public profiles, and landing pages) require robust search engine visibility
and social sharing previews.

### How page meta works

Route-level metadata is managed dynamically via `useDocumentTitle` and head managers:

- **Document Titles**: Formatted hierarchically (`<Page Title> — FreelanceHub`)
  with automatic bilingual translation based on active locale.
- **Canonical URLs**: Automatically generated based on current route path, stripping
  ephemeral tracking and query parameters.
- **Bilingual Alternates**: Dynamically injects `<link rel="alternate" hreflang="fa" />`
  and `<link rel="alternate" hreflang="en" />` tags, informing search engine crawlers
  of Persian and English language representations.

### JSON-LD support

Structured data in JSON-LD format is injected into the `<head>` for public entities:

- **`JobPosting` Schema**: Injected on project detail pages (`ProjectDetailPage`),
  specifying job title, description, category, budget currency (`IRR`), deadline,
  and hiring organization metadata.
- **`Person` / `ProfilePage` Schema**: Injected on user profiles, indexing skills,
  reputation score, and verification status.
- **`BreadcrumbList` Schema**: Emitted along with top-level navigation, enabling
  search engines to display rich breadcrumbs in search engine results pages (SERPs).

### Open Graph tags

When links are shared on messaging platforms (Telegram, WhatsApp, LinkedIn, Twitter/X),
Open Graph tags provide rich, branded preview cards:

- `og:title` & `twitter:title`: Clean localized page title.
- `og:description` & `twitter:description`: Brief synopsis of project description or profile summary.
- `og:image`: Dynamic branded preview graphic.
- `og:type`: `website` for landing pages, `article` for project announcements.

---

## 8. Performance monitoring & Web Vitals

To guarantee optimal user experience and fast interactions, FreelanceHub tracks
Core Web Vitals and enforces strict performance budgets without relying on external
heavy SDKs.

### Web Vitals tracking

Telemetry is implemented using the browser's native `PerformanceObserver` API (~100 LOC,
zero runtime dependencies):

| Metric | Target | What it measures |
| --- | --- | --- |
| **LCP** (Largest Contentful Paint) | < 2.5 s | Perceived load speed of the main visual content |
| **FID / INP** (Interaction to Next Paint) | < 200 ms | Responsiveness to user clicks, taps, and key presses |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Visual stability; zero unexpected shifts during paint |
| **FCP** (First Contentful Paint) | < 1.8 s | Time until the browser renders the first DOM content |
| **TTFB** (Time to First Byte) | < 600 ms | Server and network latency for the initial document |

### Performance budgets

The build configuration and CI pipeline enforce strict performance budgets:

- **Initial bundle size**: Initial JS bundle ≤ 150 KB gzip.
- **Route chunks**: Lazy-loaded route chunks ≤ 80 KB gzip each.
- **Zero chart runtime**: SVG visualizations (`components/charts`) add 0 KB external charting dependencies.
- **Icon tree shaking**: Only actively referenced icons from `react-icons` and Lucide are bundled.

### How metrics are collected

1. The observer initializes on page load and monitors layout shifts, largest paints,
   and first inputs.
2. Metrics are buffered in `lib/vitals` with a debounced flush interval.
3. In development mode, metrics are logged to the console with color-coded performance thresholds.
4. In production mode, metrics emit over the internal event bus, allowing optional
   plugins (see [ARCHITECTURE.md](ARCHITECTURE.md) §12) to forward aggregates to an
   internal analytics receiver without violating user privacy.

