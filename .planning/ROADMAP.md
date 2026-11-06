# Roadmap: DukaanKhata (दुकान खाता)

## Overview

Stabilize and harden DukaanKhata across test execution, static analysis, code quality, and production cloud configuration. This milestone resolves all known technical debt identified during codebase mapping, ensuring reliable CI/CD-ready test suites and zero-warning builds.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Test Harness & Runner Isolation** - Isolate Vitest from Playwright and automate integration test server lifecycle
- [ ] **Phase 2: Code Quality & Sync Resilience** - Eliminate Oxlint cascading render warnings and fix credit limit parsing
- [ ] **Phase 3: Production Security & Cloud Deployment** - Auto-provision JWT secrets on Render and verify production builds

## Phase Details

### Phase 1: Test Harness & Runner Isolation
**Goal**: Isolate Playwright E2E tests from Vitest with `vitest.config.ts`, and refactor API integration and security tests to automatically bind an in-process server harness via supertest so `npx vitest run` passes 100% out-of-the-box.
**Depends on**: Nothing (first phase)
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. `npx vitest run` executes all unit, integration, and security tests without requiring an out-of-band running server and exits with status 0.
  2. Vitest runner does not discover or execute `@playwright/test` specs from `tests/e2e/`.
  3. `npx playwright test` continues to target E2E browser flows independently.
**Plans**: 2 plans

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Configure Vitest to exclude Playwright E2E specs and isolate test runners

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Implement in-process server test harness with supertest in API and security tests

### Phase 2: Code Quality & Sync Resilience
**Goal**: Clean up React 19 / Oxlint state synchronization warnings (cascading renders in modals and `useMemo` reference stability) and fix customer credit limit conversion during sync operations.
**Depends on**: Phase 1
**Requirements**: LINT-01, LINT-02, BUG-01
**Success Criteria** (what must be TRUE):
  1. `npm run lint` (`oxlint`) passes with 0 warnings.
  2. Modal components render without triggering `react(set-state-in-effect)` compiler warnings.
  3. Credit limit conversion during server pull in `src/db/operations.ts` safely parses numbers falling back to 500 without `NaN`.
**Plans**: 2 plans

Plans:
- [ ] 02-01: Fix credit limit numeric conversion logic in `src/db/operations.ts`
- [ ] 02-02: Refactor state synchronization in modals and memoization in `LedgerView.tsx` / `VoiceInputModal.tsx`

### Phase 3: Production Security & Cloud Deployment
**Goal**: Auto-provision `JWT_SECRET` in `render.yaml` and verify that the production server build boots cleanly without runtime configuration exceptions.
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02
**Success Criteria** (what must be TRUE):
  1. `render.yaml` declares `generateValue: true` for `JWT_SECRET` preventing production boot failures.
  2. `npm run build` and `npm start` boot Express cleanly in production mode.
**Plans**: 1 plan

Plans:
- [ ] 03-01: Update `render.yaml` with auto-generated `JWT_SECRET` and verify production build & startup

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Test Harness & Runner Isolation | 2/2 | Complete | 2026-11-06 |
| 2. Code Quality & Sync Resilience | 0/2 | Not started | - |
| 3. Production Security & Cloud Deployment | 0/1 | Not started | - |
