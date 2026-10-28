# Testing

Vitest + Testing Library + jsdom, configured in `vite.config.js`
(`include: src/**/*.{test,spec}.{ts,tsx}`, `globals`, `restoreMocks`).

```bash
npm test           # CI mode
npm run test:watch # watch mode
npm test -- transaction   # one area (substring match)
npm run verify     # typecheck → test → build
```

`src/test/setup.ts` runs before every file: jest-dom matchers, jsdom gap
stubs (`matchMedia`, `ResizeObserver`, `IntersectionObserver`, `scrollTo`,
`crypto.randomUUID`), React Testing Library cleanup, and `storage.clearAll()`
before/after each test — **every test starts from empty, deterministic storage.**

---

## What we test (and what we don't)

| Level | Where | Purpose |
| --- | --- | --- |
| **Behaviour** | `store/transaction/*.test.tsx` | the six ACID invariants (see [ACID.md](ACID.md) §6) |
| **Contract** | `mocks/adapter.test.ts` | the demo transport behaves like Express: envelope, auth, scoping, validation |
| **Domain** | `entities/**/*.test.ts` | pure maths and projections, no DOM needed |
| **Conformance** | `src/test/architecture.test.ts` | the dependency rule in [ARCHITECTURE.md](ARCHITECTURE.md) §1 is actually true |
| **Conformance** | `src/test/i18n.test.ts` | every statically written translation key resolves |
| **Conformance** | `src/test/docs.test.ts` | every relative link in `README.md` and `docs/` resolves |
| **Pure helpers** | `lib/**/*.test.ts` | formatters, validators |

We do **not** snapshot-render components: a snapshot asserts that JSX is JSX.
Component behaviour is covered where it is a contract (the transaction pipeline,
the transport, the projections); the rest is asserted through types and the
conformance suites.

## Conventions

1. **Name the guarantee, not the function.** `restores the exact previous cache
   value when the request fails` — not `test rollback #2`.
2. **Assert behaviour, not implementation.** The ACID tests assert cache state
   and journal transitions; they never reach into provider internals.
3. **Build fixtures with factories.** `src/test/factories.ts` exports
   `buildUser`, `buildProject`, `buildProposal`, `buildCategory`,
   `daysFromNow(…)`. Spreading a factory keeps a test compiling when a required
   field is added; a hand-written `as Project` object silently rots.
4. **Deterministic storage is free.** Anything persisted goes through
   `lib/storage`; the setup file wipes it between tests, so durability can be
   tested by writing a journal entry and mounting the provider again — which is
   exactly how cross-session replay is covered.
5. **Mock at the seam.** `vi.mock("@/services", …)` for command replay,
   `vi.fn()` for a request closure. Never mock React Query internals.
6. **A passing suite must mean something.** Conformance suites assert their own
   signal (`SOURCE_FILES > 150`, `usedKeys > 80`): a rule that silently stops
   matching anything is a failure, not a pass.

## Adding coverage

| You changed… | Add… |
| --- | --- |
| a pure function in `entities/` | a sibling `*.test.ts` covering the boundary values |
| the transaction pipeline | an invariant test in `TransactionProvider.test.tsx` — and update [ACID.md](ACID.md) §6 if the invariant changed |
| a demo route | happy path + one refusal in `adapter.test.ts` |
| a new command | see [ACID.md](ACID.md) §7 (registry + replay test) |
| an import edge | nothing — `architecture.test.ts` already enforces the rules |
| a translation key | nothing — `i18n.test.ts` already checks both directions |

## Reading order when something fails

1. `architecture.test.ts` / `i18n.test.ts` / `docs.test.ts` → a structural
   invariant broke (wrong layer, missing key, dead link).
2. `TransactionProvider.test.tsx` → a write-pipeline guarantee broke.
3. `adapter.test.ts` → the demo contract and the client disagree.
4. `entities/**` → a projection's maths changed.

---

## Accessibility testing

We mandate WCAG 2.1 AA accessibility across all UI components and pages. Rather than
relying solely on manual audits or heavy end-to-end browser harnesses, automated
accessibility checks run in CI alongside unit tests.

### Custom a11y checker

Our automated accessibility checker executes directly inside jsdom during Vitest runs,
evaluating rendered DOM subtrees against accessibility heuristics:

```ts
// Example: verifying a modal or form in a component test
import { assertAccessible } from "@/test/a11y";

it("renders an accessible proposal dialog", async () => {
  const { container } = render(<ProposalForm project={project} />);
  await assertAccessible(container);
});
```

### What it tests

1. **Form Controls & Labels**: Every `<input>`, `<select>`, and `<textarea>` must
   possess an associated `<label>`, an explicit `aria-label`, or an `aria-labelledby` reference.
2. **Landmarks & Regions**: Landmark elements (`<main>`, `<nav>`, `<aside>`, `<header>`)
   must be unique or distinguished via descriptive `aria-label` attributes.
3. **Interactive Roles & Names**: Icon buttons and interactive elements must expose
   an accessible name (non-empty `aria-label` or visible text content). Decorative SVGs
   must declare `aria-hidden="true"`.
4. **Modal & Dialog Wiring**: Modals must carry `role="dialog"` or `role="alertdialog"`,
   `aria-modal="true"`, an `aria-labelledby` heading target, and must trap keyboard focus.
5. **Live Region Announcements**: Dynamic feedback, toasts, and SPA page changes must
   be hooked into `aria-live="polite"` regions (such as `NavigationAnnouncer`).
6. **Heading Hierarchy**: Headings must not skip levels (e.g. `h1` directly to `h3`),
   ensuring predictable document outlines for screen readers.

### How to add new rules

To add a new rule to the accessibility validator:

1. Open or extend the rule set in the testing suite.
2. Define the rule evaluator conforming to the rule contract:
   ```ts
   export const imgAltRule: A11yRule = {
     id: "image-alt-required",
     description: "All <img> elements must provide an alt attribute",
     check(root: HTMLElement) {
       const violations: A11yViolation[] = [];
       root.querySelectorAll("img").forEach((img) => {
         if (!img.hasAttribute("alt")) {
           violations.push({ node: img, message: "Missing required alt attribute" });
         }
       });
       return violations;
     },
   };
   ```
3. Register the rule in the active rule runner. Any violation will fail the test
   with a descriptive DOM snippet and line location.

---

## Architecture conformance

The architectural integrity of the application is continuously validated by
`src/test/architecture.test.ts`.

### Updated rule count

The suite asserts **7 core architectural constraints** across **9 distinct automated tests**:

| Rule # | Invariant | Tested Assertion |
| --- | --- | --- |
| **Rule 1** | Layer direction | Imports point strictly downwards through layers (`app/pages` → `features` → `components/store/hooks` → `entities/services/mocks` → `config/lib` → `types`). Upward imports immediately fail the build. |
| **Rule 2** | Pure domain | `lib/**` and `entities/**` import no React, no React DOM, no UI components, and no state containers. Business logic remains 100% pure and DOM-independent. |
| **Rule 3a** | Feature isolation | Features in `features/` cannot import each other's internals (only `features/dashboard` is permitted as an aggregator). |
| **Rule 3b** | Presentational purity | Presentational `components/` never imports from `features/` or `pages/`. |
| **Rule 4** | HTTP boundary | The HTTP client (`@/lib/http`) is restricted to `services/`, transport adapters, the app shell, and `main.tsx`. |
| **Rule 5** | Path alias discipline | Cross-folder imports must use the `@/` path alias rather than multi-level relative climbing (`../../`). |
| **Rule 6** | Real file resolution | Every `@/` import path must resolve to an existing `.ts`, `.tsx`, or `.d.ts` source file. |
| **Rule 7** | Acyclic import graph | The runtime import graph must be strictly acyclic (evaluated via Tarjan/DFS cycle detection). |
| **Coverage Guard** | Suite validity | Asserts that the test scans >150 source files and >120 active import edges so the suite can never silently pass on an empty match. |

