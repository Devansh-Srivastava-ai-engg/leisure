# DukaanKhata (दुकान खाता)

## What This Is

DukaanKhata is an ultra-fast, offline-first bilingual (Hindi/English) Progressive Web App with an Express 5 backend designed for micro-retailers (panwadi shops, chai tapris, and local kirana stalls). It replaces manual paper bahi-khata with a touch-first digital ledger, voice-to-ledger entries, one-tap UPI WhatsApp payment links, granular loose-stock inventory tracking, and daily cash drawer reconciliation with multi-tenant data isolation.

## Core Value

Zero-latency, reliable ledger recording that works completely offline in bright sunlight conditions, ensuring small shop owners never lose track of credit (उधार) or cash (रोकड़).

## Business Context

- **Customer**: Micro-retail shop owners and stall operators across India.
- **Revenue model**: Free open-source core with zero-fee dynamic UPI payment links.
- **Success metric**: 100% daily cash drawer reconciliation accuracy and sub-3-second transaction entry speed.
- **Strategy notes**: Maintain minimal dependencies, touch-first ergonomics, and robust local persistence.

## Requirements

### Validated

- ✓ Touch-first bilingual ledger (Jama/Udhar) with pinned regulars & WhatsApp payment links — existing
- ✓ Loose-unit inventory counter & stock deduction engine — existing
- ✓ Daily cash drawer reconciliation & note counter — existing
- ✓ Daily business summary report generation & WhatsApp sharing — existing
- ✓ Wholesale supplier bill & payment ledger — existing
- ✓ Hindi/English voice-to-ledger transcription & auto-confirm parser — existing
- ✓ Offline-first Dexie.js persistence with delta outbox sync to SQLite WAL backend — existing
- ✓ Multi-tenant user registration, JWT authentication, and isolated database storage — existing

### Active

- [ ] **TEST-01**: Refactor API integration and security tests to automatically bind an in-memory/ephemeral server harness (using supertest) eliminating `ECONNREFUSED` errors during test runs
- [ ] **TEST-02**: Add dedicated `vitest.config.ts` excluding Playwright E2E suites from the Vitest runner
- [ ] **LINT-01**: Resolve React 19 / Oxlint state synchronization warnings (cascading renders in modals and `useMemo` hooks)
- [ ] **BUG-01**: Fix `Number()` fallback operator bug on customer credit limit conversion during sync
- [ ] **SEC-01**: Add automatic `JWT_SECRET` provisioning to `render.yaml` to prevent production startup fatal errors

### Out of Scope

- External payment gateway SDKs (Razorpay/Stripe) — sticking to direct, zero-fee browser dynamic UPI intent links.
- Migrating database from SQLite to PostgreSQL — single-file SQLite in WAL mode satisfies local and single-store requirements with lowest complexity.
- Full UI redesign — current sunlight mode and mobile thumb-friendly layouts are verified and working.

## Context

- **Technical Environment**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Zustand, Dexie.js (IndexedDB), Express 5, Better-SQLite3 (WAL mode).
- **Codebase Map**: Completed in `.planning/codebase/` covering architecture, stack, integrations, conventions, testing, and concerns.
- **Current State**: Application is fully functional end-to-end, but automated testing and linter warnings require stabilization before expanding features.

## Constraints

- **Tech Stack**: Must preserve React 19 + TypeScript + Express 5 + SQLite in WAL mode.
- **Offline Reliability**: All core store operations must function without an active network connection.
- **Performance**: Transaction entries must complete in under 3 seconds on low-end mobile devices.
- **Security**: Strict multi-tenant data isolation via `user_id` query scoping and JWT validation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vitest Config Isolation | Separates Vitest unit/integration tests from Playwright E2E tests | — Pending |
| Supertest Integration Harness | Allows API integration tests to execute without manually running `npm run server` | — Pending |
| Auto-Provision Render JWT_SECRET | Prevents production boot crashes on cloud deployment | — Pending |
| Retain Better-SQLite3 WAL Mode | Fast synchronous reads/writes with ACID transactions without external DB services | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-06 after initialization*
