# Requirements: DukaanKhata (दुकान खाता)

**Defined:** 2026-11-06
**Core Value:** Zero-latency, reliable ledger recording that works completely offline in bright sunlight conditions, ensuring small shop owners never lose track of credit (उधार) or cash (रोकड़).

## v1 Requirements

Requirements for initial stabilization milestone. Each maps to roadmap phases.

### Testing & Verification

- [x] **TEST-01**: Developer can execute `npx vitest run` without running an external server process, and all API integration and security tests pass via an automated in-process test harness
- [x] **TEST-02**: Developer can run `npx vitest run` without Playwright E2E tests colliding with the Vitest test runner (isolated via `vitest.config.ts`)
- [x] **TEST-03**: Developer can run end-to-end browser tests independently via `npx playwright test`

### Code Quality & Linting

- [x] **LINT-01**: Oxlint linter (`npm run lint`) reports 0 warnings for synchronous `setState` in effects across all modals (`CustomerModal`, `QuickKeypadModal`, `CashDrawerView`, `VoiceInputModal`)
- [x] **LINT-02**: Oxlint linter reports 0 warnings for `useMemo` customer array reference instability and effect dependencies in `src/components/LedgerView.tsx` and `src/components/VoiceInputModal.tsx`
- [x] **BUG-01**: Credit limit conversion during server pull in `src/db/operations.ts` safely parses numeric values falling back to 500 instead of evaluating to `NaN`

### Security & Deployment

- [ ] **SEC-01**: `render.yaml` configuration auto-generates `JWT_SECRET` on deployment to prevent fatal server startup crashes in production mode
- [ ] **SEC-02**: Server boots cleanly in production without missing secret errors and serves static PWA assets reliably

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Retail Capabilities

- **FEAT-01**: Thermal Bluetooth receipt printer integration for customer bill slips
- **FEAT-02**: Camera barcode scanning for quick stock lookup in CounterView
- **FEAT-03**: Automated monthly PDF ledger report generation

### Cloud Infrastructure

- **INFRA-01**: Persistent disk volume mounting on Render starter tier for SQLite retention
- **INFRA-02**: GitHub Actions CI pipeline running lint, test, and build on every push

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Payment Gateway SDK (Razorpay/Stripe) | Incurs transaction fees; dynamic UPI deep links (`upi://pay`) provide zero-fee instant settlements |
| PostgreSQL / MySQL Database Migration | Adds network latency and server overhead; Better-SQLite3 in WAL mode provides microsecond response times |
| UI Theme Redesign | Existing bilingual, high-contrast sunlight mode is already tested and tailored for outdoor shop counters |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 1 | Complete |
| TEST-02 | Phase 1 | Complete |
| TEST-03 | Phase 1 | Complete |
| LINT-01 | Phase 2 | Complete |
| LINT-02 | Phase 2 | Complete |
| BUG-01 | Phase 2 | Complete |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 8 total
- Mapped to phases: 8
- Unmapped: 0

---
*Requirements defined: 2026-11-06*
*Last updated: 2026-11-06 after initialization*
