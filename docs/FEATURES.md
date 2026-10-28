# Feature catalogue

Every capability in the product, the *idea* behind it, the maths it runs and the
file that owns it. Sections map to the domains in
[CROSS_DOMAIN.md](CROSS_DOMAIN.md); the write pipeline that ties them together
is in [ACID.md](ACID.md).

The numbers here are contracts: each one is asserted in the test file named
beside it.

---

## 1. Explainable matching — `entities/proposal/matching.ts`

Instead of a black-box "93% match", a project gets a 0–100 score with six
factors, each carrying its own 0–100 value and weight, so the UI can answer
*why*:

| Factor | Weight | Value comes from |
| --- | --- | --- |
| skills | 0.30 | normalised overlap between the freelancer's skills and the project tags |
| budget | 0.20 | bid position against the project budget band |
| category | 0.15 | does the freelancer have history in this category |
| deadline | 0.15 | does the delivery window fit their capacity |
| competition | 0.10 | number of competing proposals |
| reputation | 0.10 | rating and completed projects |

```
score = Σ valueᵢ × weightᵢ          (weights sum to 1.0, clamped 0–100)
tier  = excellent ≥ 80 · good ≥ 60 · fair ≥ 40 · else weak
```

`rankProjectsForUser` sorts a freelancer's feed by that score.
Tests: `src/entities/proposal/matching.test.ts`.

## 2. Trust and gamification — `entities/user/trust.ts`

Trust is rebuilt from observable behaviour rather than a mutable counter, so it
cannot drift from what actually happened:

| Signal | Weight | Passes when |
| --- | --- | --- |
| verified | 25 | `status === 2` and the account is active |
| completed projects | 25 | ≥ 5 deliveries |
| rating | 20 | ≥ 4.2 with ≥ 3 reviews |
| response time | 15 | ≤ 12 h median |
| history | 15 | account older than 60 days |

```
score = Σ weight of passed signals          (bands: ≥85 platinum · ≥65 gold · ≥40 silver · else bronze)
xp    = 12·bids + 60·accepted + 90·delivered + 25·verified + 15·review
level = while xp ≥ 120 + 60·(level−1) …      (XP_PER_LEVEL_BASE grows linearly)
```

Badges (`firstProposal`, `tenProposals`, `accepted`, `verified`, `highRating`,
`veteran`) are derived from the same inputs.
Tests: `src/entities/user/trust.test.ts`.

## 3. Risk screening for moderators — `assessProposalRisk`

A rule engine over the queue an admin would otherwise read row by row:

- price ÷ category budget outside **0.25 – 2.2** → **high** (45);
- price ÷ budget below **0.45** → medium (25);
- price-per-day outside **0.25× – 4×** the category baseline → medium (25);
- account younger than 7 days with zero deliveries → medium (25);
- rating below 3.2 → low (10).

```
level = score ≥ 45 high · ≥ 25 medium · else low
```

The queue is *advisory*: decisions are injected from the page
(`RiskQueue`'s `onDecide`), keeping `features/trust` free of any import from
`features/proposals`.
Tests: `src/entities/proposal/matching.test.ts`.

## 4. What-if bid simulator — `simulateProposal`

A transparent, interactive guide rather than a statistical claim:

```
priceImpact     = clamp(60 · (1 − |price/budget − 0.8| / 0.8), −60, 40)
durationImpact  = clamp(45 · (1 − |duration − 30| / 30), −45, 30)
competition     = clamp(−4 · competitors, −30, 0)
raw             = 55 + 0.5·price + 0.35·duration + 0.3·competition
probability     = clamp(round(raw), 4, 96) / 100
verdict         = strong ≥ 0.60 · ok ≥ 0.35 · else weak
suggested bid   = 0.62 × budget … 0.96 × budget (rounded to 100 000)
```

Fee and payout: `fee = round(price × 0.07)`, `net = price − fee`
(`PLATFORM_FEE_RATE`, `netPayout`).

## 5. The ledger — `entities/ledger.ts`

There is no payments endpoint, so money is **derived** from the proposal
pipeline and labelled as such in the UI — one function, one source of truth, so
the wallet page, the analytics escrow figure and the CSV export cannot disagree:

- accepted bid → `escrow-in` (settled) + `payout` (net) + `fee` (7 %);
- pending bid → `escrow-in` (pending), counted as in-flight escrow;
- rejected bid → no rows (no money ever moved);
- rows are sorted newest-first, counterparty recorded as a *role* so the view
  localises it.

Tests: `src/entities/ledger.test.ts`.

## 6. Analytics engine — `entities/analytics/overview.ts`

Everything the dashboards show is computed client-side from data the browser
already holds: no analytics endpoint, no third-party tracker.

- 8-month timeline buckets (projects vs proposals);
- category mix, status mix, budget buckets (<5, 5–15, 15–40, 40–100, >100 M);
- `acceptanceRate = accepted / decided`;
- `escrow = Σ accepted + 0.35 × Σ pending`; `released = Σ accepted × 0.93`;
- `buildInsights` turns the snapshot into four human sentences (best category,
  urgent deadlines, moderation backlog, acceptance rate);
- `snapshotToRows` flattens it for CSV.

Tests: `src/entities/analytics/overview.test.ts`.

## 7. Portfolio selectors — `entities/project/metrics.ts`

`filterProjects → sortProjects → paginate` is the *single* definition of
"filtered" used by tables, boards and exports — each component used to
reimplement it slightly differently. Plus `buildOwnerPortfolio`,
`buildFreelancerPortfolio`, `projectUrgency` and `dedupeById`.
Tests: `src/entities/project/metrics.test.ts`.

## 8. The ACID write pipeline — `store/transaction`

Optimistic patches with captured inverses, a consistency gate, a per-resource
lock, and a **durable journal whose entries are serialisable commands** — a
write queued offline is re-sent after reconnect *or after a reload*, and undo is
a compensating transaction that reaches the server. See [ACID.md](ACID.md);
tests: `src/store/transaction/*.test.ts`.

## 9. Cross-domain activity — `entities/activity`

- `buildAuditFeed` merges server-reconstructed events (project created/closed,
  proposal submitted/decided, moderation outcomes) with the local journal into
  one chronological trail;
- `describeImpact` projects any write onto the domains it touches (see
  [CROSS_DOMAIN.md](CROSS_DOMAIN.md)).

Tests: `src/entities/activity/activity.test.ts`.

## 10. Demo transport — `mocks/`

`VITE_API_MODE=mock` installs an axios adapter on the same client instance:
services, hooks and components are untouched, and the adapter answers **26
routes** with the same paths, envelope, status codes and authorization rules as
Express — backed by a seeded dataset persisted to `localStorage` (see
[API.md](API.md)). Mutations survive reloads; `?demo=reset` restores the seed.
Tests: `src/mocks/adapter.test.ts`.

## 11. Offline, realtime and resilience

- offline banner with a *degraded* (server up-but-unreachable) distinction;
- outbox replay on reconnect and on boot;
- single-flight token refresh; one `ApiError` shape with a `kind`;
- background revalidation every 45 s, paused when hidden or offline;
- fail-safe storage (Safari private mode, quota) with an in-memory fallback.

## 12. Internationalisation, a11y and performance

- ~1 000 keys in `fa` and `en`; `en` coverage is compiler-enforced, `fa`
  coverage by `src/test/i18n.test.ts`;
- Jalali/Gregorian dates and Persian digits through `Intl`; Arabic-letter and
  ZWNJ normalisation for search; Persian/Arabic digit input parsing;
- every page lazy-loaded, vendor chunks split, `NavigationAnnouncer` moves focus
  on route change, `Modal` traps focus, tables expose captions and sort state;
- zero-dependency SVG charts, virtualised long tables, debounced search,
  memoised derivations.

---

## 13. AI-powered recommendations — `entities/proposal/matching.ts`

Freelancers need to discover relevant, high-conversion projects quickly without
wading through hundreds of unqualified listings. The recommendation engine provides
transparent, explainable matching computed entirely client-side.

### Algorithm description

Every open project is evaluated against the authenticated freelancer's profile,
portfolio history, and real-time marketplace state. The algorithm computes a 0–100
affinity score that sorts the recommended projects feed (`rankProjectsForUser`).

### Factors and weights

| Factor | Weight | Evaluation criteria |
| --- | --- | --- |
| **Skill Overlap** | 0.30 | Jaccard index between user's verified skills and project required tags |
| **Budget Alignment** | 0.20 | Proximity of project budget band to freelancer's historical median winning bid |
| **Category Affinity** | 0.15 | Ratio of freelancer's past deliveries within the project's category |
| **Capacity & Deadline** | 0.15 | Delivery window fit against active project commitments and estimated turnaround |
| **Competitive Density** | 0.10 | Inverted proposal count (lower competition yields higher opportunity score) |
| **Client Reputation** | 0.10 | Client verification status, rating history, and past proposal acceptance rate |

```
score = clamp(round(Σ valueᵢ × weightᵢ), 0, 100)
tier  = excellent ≥ 80 · good ≥ 60 · fair ≥ 40 · weak < 40
```

### Skill gap analysis

The engine inspects high-value projects where the freelancer's fit is in the "fair"
or "good" band and identifies specific missing skills. The UI displays actionable
upskilling tips (e.g. *"Adding 'TypeScript' to your skills would boost your match score by +18 points"*).

### Optimal bid prediction

Using category-level pricing distributions and historical win ratios, the simulator
recommends an optimal bidding sweet spot:

```
suggestedBid = clamp(budgetMin + (budgetMax - budgetMin) × 0.78, budgetMin, budgetMax)
```

The prediction balances profit maximization with win probability, accompanied by an
interactive platform fee breakdown.

---

## 14. Smart search with fuzzy matching — `lib/format/text.ts`

Standard substring matching fails in Persian due to complex orthography, character
variants, and typo sensitivity. The smart search utility ensures resilient query resolution.

### How fuzzy search works

The search pipeline employs character trigram indexing and Levenshtein distance
thresholding:

1. Query and candidate strings are stripped of punctuation and normalized.
2. Exact substring matches receive top priority (rank 1.0).
3. Prefix and boundary matches receive rank 0.8.
4. Typo-tolerant fuzzy matches (distance ≤ 2 edits for words > 4 characters) receive rank 0.5.

### Persian/Arabic normalization

Text normalizer (`normalizeSearch`) canonicalizes Unicode codepoints:

- **Arabic letters**: Converts `ي` (Arabic Yeh) to `ی` (Persian Yeh), `ك` (Kaf) to `ک`,
  and `ة` (Teh Marbuta) to `ه`.
- **Harakat (Diacritics)**: Strips Fatha, Damma, Kasra, Tanwin, Shadda, and Sukun (`[\u064B-\u065F]`).
- **Zero-Width Non-Joiner (ZWNJ)**: Standardizes `\u200C` (نیم‌فاصله) so that `می شود`
  matches `می‌شود` seamlessly.
- **Numerals**: Maps Eastern Arabic/Persian digits (`۰۱۲۳۴۵۶۷۸۹`) to standard ASCII (`0123456789`).

### Highlighting

Matching substrings are marked using token boundary offsets, outputting safe React
elements (`<mark className="bg-primary/20 text-ink font-medium">`) without relying
on vulnerable `dangerouslySetInnerHTML`.

---

## 15. Activity heatmap — `entities/activity/`

Dashboards and profile views feature a GitHub-style activity matrix visualizing
marketplace engagement across time.

### How activity data is computed

The activity engine aggregates timestamped events across all domains over a rolling
52-week period:

- Proposal submissions and status updates (`features/proposals`).
- Project creation and milestone deliveries (`features/projects`).
- Wallet transactions and escrow settlements (`entities/ledger.ts`).
- Verification badges and reputation achievements (`entities/user/trust.ts`).

Events are bucketed into a 7×52 matrix (day of week × week of year).

### Visual encoding

Rendered as a responsive SVG matrix with CSS variable-themed color ramps:

| Level | Events / Day | Visual Fill |
| --- | --- | --- |
| **0** | 0 events | `var(--color-surface-hover)` |
| **1** | 1–2 events | `var(--color-primary-200)` |
| **2** | 3–5 events | `var(--color-primary-400)` |
| **3** | 6–8 events | `var(--color-primary-600)` |
| **4** | 9+ events | `var(--color-primary-800)` |

Hovering any cell presents an accessible tooltip detailing the Jalali date and
event summary.

---

## 16. Plugin system — `lib/plugins/`

FreelanceHub exposes an extensible plugin architecture allowing developers to extend
capabilities, inject analytics, or connect third-party APIs.

### Plugin interface

Every plugin conforms to the typed `Plugin` contract:

```ts
export interface Plugin {
  id: string;
  name: string;
  version: string;
  onInit?: (context: PluginContext) => void | Promise<void>;
  onTransaction?: (event: TransactionEvent) => void;
  onNavigate?: (path: string) => void;
  onDestroy?: () => void;
}
```

### Built-in hooks

- **`onInit`**: Bootstraps services, registers command listeners, and accesses locale/theme context.
- **`onTransaction`**: Observes ACID writes (`committed`, `queued`, `rolled-back`) with full payload descriptors.
- **`onNavigate`**: Receives route transitions to power external tracking.
- **`onDestroy`**: Disposes background listeners and active timers.

### Sample plugins

1. **`AuditTelemetryPlugin`**: Hooks into `onTransaction` to stream committed marketplace
   actions to remote SOC2-compliant audit endpoints.
2. **`SlackWebhookPlugin`**: Triggers webhook notifications to team Slack channels when
   high-value projects (> 50,000,000 IRR) receive verified bids.
3. **`CustomThemePlugin`**: Dynamically overrides root CSS custom properties (`--color-primary`,
   `--color-surface`) to support white-labeled corporate branding.

