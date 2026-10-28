# Contributing to FreelanceHub

Thank you for your interest in contributing to FreelanceHub! This document outlines our development workflow, architectural standards, quality gates, and code conventions. Following these guidelines ensures that our codebase remains maintainable, reliable, and accessible.

---

## 1. Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (LTS recommended)
- **npm**: v9.0.0 or later
- **Git**: Modern version with commit signing support (recommended)
- Modern browser (Chrome, Edge, Firefox, or Safari)

### Repository Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/freelancer-app-frontend.git
   cd freelancer-app-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   We provide two pre-configured environment setups:
   - **Demo Mode** (zero backend setup, seeded in-browser data):
     ```bash
     cp .env.demo .env.local
     ```
   - **Live Mode** (connects to Express + MongoDB backend):
     ```bash
     cp .env.example .env.local
     ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser. In demo mode, sign in using any seeded account with OTP `111111`.

### Key Development Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Vite dev server with HMR at `http://localhost:3000` |
| `npm run build` | Builds production bundle with chunk splitting to `dist/` |
| `npm run preview` | Locally serves production build |
| `npm run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `npm test` | Runs Vitest test suite in CI single-run mode |
| `npm run test:watch` | Runs Vitest in interactive watch mode |
| `npm run verify` | Full CI gate: typecheck → tests → production build |

---

## 2. Architecture Overview

FreelanceHub follows a strict **Feature-Sliced Architecture** layered from generic primitives up to application entry points:

```
app | pages  ──►  features  ──►  components | store | hooks  ──►  entities | services | mocks  ──►  config | lib  ──►  types
```

For the complete architectural specification, consult [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Golden Architectural Rules

1. **Imports only point downwards**: Modules in a lower layer can NEVER import from higher layers.
2. **React-free pure domain**: `lib/` and `entities/` MUST NOT import React, DOM APIs, or UI libraries. All business maths and projections are pure functions.
3. **Feature isolation**: Features in `features/` must NOT import each other's internals. Cross-feature coordination occurs via `store/`, the event bus (`@/lib/eventBus`), or query keys. The only exception is `features/dashboard`, which aggregates read models.
4. **Services encapsulate HTTP**: Only `services/`, transport adapters, and application entry points may import `@/lib/http`. Components never perform direct API calls.
5. **Path aliases**: Use `@/` for cross-folder imports. Relative imports (`./` or `../`) are permitted only between siblings within the same folder.
6. **No circular imports**: The import graph must remain strictly acyclic.

> **Note**: These rules are enforced automatically by `src/test/architecture.test.ts` during testing.

---

## 3. Code Standards & Conventions

### TypeScript Guidelines

- **Strict Type Safety**: Strict null checks and explicit types are enforced. Avoid `any` at all costs; use `unknown`, generics, or union types with type narrowing.
- **Contracts First**: Declare shared domain models in `src/types/index.ts`.
- **TSDoc / JSDoc**: Add JSDoc comments to all public functions, hooks, custom utilities, and components detailing parameter contracts and invariants.
- **Type-only Imports**: Use `import type { ... }` when importing types to avoid unnecessary runtime bundling and circular dependency false-positives.

### React Patterns

- **Functional Components**: Use arrow functions or named function expressions with TypeScript interfaces for props (`interface Props { ... }`).
- **State Ownership**:
  - Server state: TanStack Query (via `queryKeys`).
  - URL state: React Router search params (`useQueryParams`).
  - Global UI state: Context providers in `src/store/`.
  - Local state: `useState` only for purely ephemeral UI states (toggles, input focus).
- **Mutations & ACID Write Pipeline**: Mutations must be executed via `useTransactions().run(...)` with an optimistic patch, inverse capture, and serialisable command twin for durability. Never call `http` directly from components.
- **Custom Hooks**: Extract stateful logic into custom hooks prefixed with `use` in `src/hooks/` or feature-specific hook directories.

### Naming Conventions

| Category | Convention | Example |
| --- | --- | --- |
| React Components | PascalCase | `ProjectCard.tsx`, `PriceSimulator.tsx` |
| Custom Hooks | camelCase with `use` prefix | `useProjects.ts`, `useVirtualList.ts` |
| Utilities & Pure Models | camelCase | `formatCurrency.ts`, `matching.ts` |
| Types & Interfaces | PascalCase | `Project`, `ProposalStatus`, `ValidationIssue` |
| Constants & Enums | UPPER_SNAKE_CASE | `PLATFORM_FEE_RATE`, `DEFAULT_PAGE_SIZE` |
| Query Keys | camelCase object tree | `queryKeys.projects.list(filters)` |

---

## 4. Git Commit Message Conventions

We adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Commit Types

- `feat`: A new user-facing feature or capability
- `fix`: A bug fix
- `docs`: Documentation updates or additions
- `style`: Formatting, missing semi-colons, white-space changes (no functional impact)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or correcting unit/integration/conformance tests
- `chore`: Tooling, build config, dependency adjustments

### Commit Rules

- Keep the first line concise (≤ 72 characters).
- Use the imperative present tense: "add feature", not "added feature" or "adds feature".
- Scopes correspond to layers or features: `feat(proposals): add bid simulator`, `fix(transaction): ensure outbox replays on reconnect`.

---

## 5. Pull Request (PR) Process

1. **Create a topic branch** from `main`:
   ```bash
   git checkout -b feat/ai-recommendation-engine
   ```
2. **Implement changes** following the code standards and architecture guidelines.
3. **Write tests** for any new pure domain models, transaction behaviors, or utility functions.
4. **Verify quality gates**:
   ```bash
   npm run verify
   ```
   Ensure `npm run typecheck`, `npm test`, and `npm run build` all pass without errors or warnings.
5. **Open a PR** with a clear title and description:
   - Summary of changes and motivation.
   - List of domains touched (referencing [docs/CROSS_DOMAIN.md](docs/CROSS_DOMAIN.md)).
   - Testing steps and evidence (e.g. unit test results or manual test walkthrough).
   - Link related issue numbers.

---

## 6. Testing Requirements

All contributions must preserve or improve test coverage. See [docs/TESTING.md](docs/TESTING.md) for details.

### What Must Be Tested

1. **Entities & Pure Models**: 100% boundary testing for domain calculations (scoring, trust, matching, ledger).
2. **ACID Transactions**: Invariants such as optimistic patching, rollback on rejection, offline queueing, and idempotency.
3. **Demo Transport**: Ensure mocked endpoints match live API contracts and envelope standards.
4. **Conformance Gates**:
   - `src/test/architecture.test.ts`: Confirms layer isolation and acyclic graph.
   - `src/test/i18n.test.ts`: Verifies complete coverage of translation keys.
   - `src/test/docs.test.ts`: Ensures all relative documentation links resolve.

---

## 7. Internationalization (i18n) Guidelines

The application is **Persian-first (RTL)** with full bilingual support (`fa` and `en`).

### Guidelines

- **No Hardcoded Strings**: Every user-facing label, placeholder, error, or notification must use the `t("key")` function.
- **Dual Dictionary Maintenance**: Whenever adding a translation key, add it to **both** the `fa` and `en` dictionaries in `src/store/i18n/translations.ts`.
- **Key Naming Convention**: Use dot notation hierarchically: `<domain>.<context>.<actionOrElement>`.
  - Example: `projects.list.emptyTitle`, `tx.proposal.accept`, `a11y.skipToContent`.
- **Pluralization and Interpolation**: Use `{placeholder}` interpolation:
  ```ts
  t("projects.foundCount", { count: 5 });
  ```
- **Numbers and Dates**: Never format dates or numbers with custom string manipulation. Use formatters in `src/lib/format/` which leverage the `Intl` API (`fa-IR` for Jalali calendar and Eastern Arabic numerals; `en-GB` for Gregorian calendar and Latin numerals).

---

## 8. Checklists

### Adding a New Feature Checklist

- [ ] **Types**: Define required interfaces and wire contracts in `src/types/index.ts`.
- [ ] **Pure Domain Logic**: Implement domain calculations in `src/entities/<domain>/` without React or DOM imports.
- [ ] **Domain Tests**: Write unit tests in `src/entities/<domain>/<name>.test.ts`.
- [ ] **Service & Query Keys**: Create/update API calls in `src/services/` and register hierarchical query keys in `src/config/queryKeys.ts`.
- [ ] **Demo Mode Support**: Add mock responses in `src/mocks/adapter.ts` so the feature functions in offline demo mode.
- [ ] **ACID Mutation**: Wrap mutations in `useTransactions().run(...)` with compensation commands where reversible.
- [ ] **Cross-Domain Impact**: Declare side-effects in `src/entities/activity/impact.ts` (see [docs/CROSS_DOMAIN.md](docs/CROSS_DOMAIN.md)).
- [ ] **UI Slices**: Build components and hooks within `src/features/<feature>/`.
- [ ] **Translations**: Add Persian and English keys to `src/store/i18n/translations.ts`.
- [ ] **Verification**: Run `npm run verify` to confirm conformance.

### Adding a New Page Checklist

- [ ] **Page Component**: Create `src/pages/<Name>Page.tsx` with proper layout wrapping and document title (`useDocumentTitle`).
- [ ] **Lazy Route**: Register route in `src/app/router/AppRouter.tsx` using `React.lazy()` with `Suspense` and `PageLoader`.
- [ ] **Route Guard**: Apply `ProtectedRoute` with applicable role restrictions (`client`, `freelancer`, `admin`).
- [ ] **Navigation Model**: Add navigation entry to `src/config/navigation.ts` with label key and `IconName`.
- [ ] **Documentation**: Update [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/FEATURES.md](docs/FEATURES.md) if introducing new workflows.

---

## 9. CSS & Styling Guidelines

- **Tailwind Utility Classes**: Use Tailwind classes for all layouts, typography, and spacing.
- **Design Tokens**: Rely on CSS custom properties defined in `src/index.css` (`--color-surface`, `--color-ink`, `--color-line`, `--color-primary`, etc.) to guarantee seamless light/dark mode switching.
- **RTL Logical Properties**: Never use directional classes like `ml-`, `mr-`, `pl-`, `pr-`, `left-`, or `right-`. Always use logical properties:
  - `ms-` (margin-inline-start) / `me-` (margin-inline-end)
  - `ps-` (padding-inline-start) / `pe-` (padding-inline-end)
  - `start-` / `end-`
  - `text-start` / `text-end`
- **No Inline Styles**: Avoid `style={{ ... }}` unless dealing with dynamic SVG coordinates or computed virtual list offsets.

---

## 10. Accessibility (a11y) Requirements

We target **WCAG 2.1 AA** compliance throughout the application:

- **Semantic HTML**: Use proper HTML5 landmark elements (`<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>`, `<section>`).
- **Headings Structure**: Ensure logical heading hierarchy (`h1` through `h6`) without skipping levels.
- **Keyboard Navigation**:
  - Interactive elements must be reachable via `Tab` and show clear focus rings (`focus-visible:ring-2`).
  - Modals and drawers must trap focus, close on `Esc`, and restore focus to trigger elements upon dismissal.
  - Lists and tabs must implement roving `tabindex` and arrow key navigation where appropriate.
- **Screen Reader Support**:
  - Provide `aria-label` or `aria-labelledby` for icon-only buttons.
  - Ensure all form inputs have linked `<label>` and `aria-describedby` for validation error messages.
  - SPA navigations must announce route changes using `NavigationAnnouncer`.
- **Motion Preferences**: Respect user motion sensitivity. CSS transitions must gracefully disable when `prefers-reduced-motion: reduce` is detected.
