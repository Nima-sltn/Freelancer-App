# Changelog

All notable changes to FreelanceHub are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] — 2026-10-24

### Architecture
- **Feature Error Boundaries**: Replaced single monolithic error boundary with granular, route- and feature-level error boundaries that isolate component crashes and prevent full-page unmounts.
- **Service Container & Dependency Injection**: Introduced an extensible service registry allowing test suites and environments to swap real HTTP services for in-memory mocks without touching UI consumers.
- **Plugin System**: Designed an extensible plugin runtime with standard lifecycle hooks (`onInit`, `onTransaction`, `onNavigate`, `onDestroy`), enabling modular enhancements without core modifications.
- **Feature Flags**: Built a centralized feature toggle mechanism supporting build-time and runtime toggles for experimental capabilities and phased rollouts.
- **Web Vitals Monitoring**: Implemented dependency-free Core Web Vitals telemetry (CLS, FID/INP, LCP, FCP, TTFB) using native browser `PerformanceObserver` APIs (~100 LOC, zero bundle weight).
- **Replayable Outbox**: Durable transaction journal persisting serialisable command descriptors; automatically re-executes pending writes on reconnect, browser reload, or explicit retry.
- **Compensating Undo**: Saga-style two-phase undo executing inverse optimistic cache restorations coupled with server-side compensating commands.

### Cross-Domain
- **Advanced Progressive Web App (PWA)**: Enhanced service worker lifecycle with runtime asset caching strategies (cache-first for static fonts and icons, network-first with offline fallback for API read models).
- **SEO & Meta Management**: Dynamic document titles, meta descriptions, Open Graph protocol attributes, and JSON-LD structured data for project postings and profile pages.
- **Accessibility (a11y) Conformance**: Automated a11y test suites validating ARIA landmark roles, form label bindings, focus trapping in modals, and keyboard accessibility.
- **Content Security Policy (CSP)**: Hardened HTTP headers and meta tags guarding against cross-site scripting (XSS), script injections, and unauthorized framing.
- **Performance Budgets**: Enforced bundle size budgets across route chunks, zero-dependency charts, and icon trees.
- **i18n Pluralization**: Extended translation engine with ICU-style pluralization rules supporting Persian and English grammatical numbers.
- **Enhanced Offline Experience**: Dedicated offline status page with outbox inspector, retry triggers, and cached data access indicators.
- **Cross-Domain Activity Layer**: Declared explicit impact fan-outs across Wallet, Trust, Leaderboard, Analytics, Notifications, Audit, and Sync domains.

### Innovation
- **Drag-and-Drop (DnD) Kanban**: Interactive visual proposal pipeline board with smooth drag-and-drop state transitions, keyboard fallback, and optimistic updates.
- **AI Recommendation Engine**: Multi-factor project matching algorithm evaluating skill overlap, budget alignment, deadline proximity, reputation, and competitive density with explainable factor scorecards.
- **Page Transitions**: Hardware-accelerated, CSS-driven route transitions respecting system and application `prefers-reduced-motion` settings.
- **Keyboard Shortcuts Overlay**: Quick-access modal displaying global and context-sensitive keyboard shortcuts (accessible via `?` or command palette).
- **Smart Search with Fuzzy Matching**: Persian and Arabic text normalizer handling diacritics, Alef variants, yeh/kaf variations, and zero-width non-joiners (ZWNJ) with match highlighting.
- **Activity Heatmap**: Contribution and transaction density visualization encoding temporal activity patterns across weeks and months.

### Documentation
- **TSDoc / JSDoc Coverage**: Comprehensive type annotations and docstrings for all shared utilities, domain entities, transaction hooks, and UI primitives.
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Exhaustive guidelines for setup, architecture boundaries, coding conventions, PR workflows, checklists, and accessibility.
- **Expanded ADRs**: Added ADR 11 through ADR 15 in [docs/DECISIONS.md](docs/DECISIONS.md) covering feature error boundaries, plugin architecture, AI matching, lightweight Web Vitals, and CSS-only animations.
- **Enhanced Architecture & Testing Guides**: Updated [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/CROSS_DOMAIN.md](docs/CROSS_DOMAIN.md), [docs/FEATURES.md](docs/FEATURES.md), and [docs/TESTING.md](docs/TESTING.md).

---

## [2.0.0] — 2026-09-15

### Added
- **Feature-Sliced Architecture**: Enforced strict unidirectional layer boundaries (`app` → `pages` → `features` → `components`/`store`/`hooks` → `entities`/`services`/`mocks` → `config`/`lib` → `types`) guarded by build-time conformance tests.
- **ACID Transaction Pipeline**: Optimistic updates with captured inverses, consistency validations, per-resource promise-chained isolation locks, and durable journals.
- **Explainable Matching & Trust Scoring**: Transparent 0–100 compatibility scores with six weighted factors, automated proposal risk screening, and gamified XP/badge progression.
- **Demo Mode with Axios Adapter**: In-browser mock transport intercepting 26 REST endpoints with seed data stored in `localStorage`, simulating realistic network latencies without external servers.
- **Bilingual i18n (fa/en)**: Full RTL layout support, Persian numeral parsing, and Jalali/Gregorian calendar formatting powered directly by `Intl`.
- **Zero-Dependency SVG Charts**: Handcrafted SVG area, bar, sparkline, and donut charts themed with CSS variables, eliminating large charting library dependencies.
- **Command Palette & Global Hotkeys**: Quick-action command launcher (`Cmd+K` / `Ctrl+K`) for rapid navigation and workflow shortcuts.
- **Gamification & Leaderboard**: Community ranking system tracking freelancer win-rates, ratings, delivery counts, and achievement badges.
- **PWA with Offline Support**: Basic service worker shell caching and offline event listening.
