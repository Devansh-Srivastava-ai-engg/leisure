---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# Codebase Concerns

**Analysis Date:** 2026-11-06

## Tech Debt

**Test Harness Server Dependency:**
- Issue: Integration (`tests/integration/api.test.ts`) and security (`tests/security/tenant-isolation.test.ts`) tests use hardcoded `http://localhost:5000/api` fetch calls without starting the Express server automatically in a test harness hook (`beforeAll`).
- Files: `tests/integration/api.test.ts`, `tests/security/tenant-isolation.test.ts`
- Impact: Running `npx vitest run` fails with `ECONNREFUSED` unless the developer manually runs `npm run server` in another terminal.
- Fix approach: Refactor integration tests to use `supertest(app)` with the exported Express instance from `server/index.ts`, or bind an ephemeral port server in `beforeAll` and close it in `afterAll`.

**Playwright Test Collision in Vitest:**
- Issue: Vitest automatically discovers `tests/e2e/auth-flow.spec.ts` because it defaults to matching `**/*.spec.ts`.
- Files: `tests/e2e/auth-flow.spec.ts`
- Impact: `vitest run` fails with `Playwright Test did not expect test() to be called here`.
- Fix approach: Create a `vitest.config.ts` file that explicitly sets `test.exclude: ['**/tests/e2e/**', '**/node_modules/**']`.

**React Compiler & Oxlint Warnings:**
- Issue: Several modals use synchronous `setState` calls inside `useEffect` on `isOpen` changes (e.g. `setAmountStr('')`, `setName()`), and `useMemo` hooks in `src/components/LedgerView.tsx` depend on `customers` from `useLiveQuery` which creates new object references on every render.
- Files: `src/components/QuickKeypadModal.tsx`, `src/components/CustomerModal.tsx`, `src/components/CashDrawerView.tsx`, `src/components/LedgerView.tsx`, `src/components/VoiceInputModal.tsx`, `src/db/operations.ts`
- Impact: 15 Oxlint warnings, triggers cascading renders, and prevents React Compiler from optimizing components.
- Fix approach: Derive state during render, initialize state on open via keys or event handlers, and memoize `useLiveQuery` outputs.

## Known Bugs

**Unintended Fallback Operator on Number Conversion:**
- Symptoms: `creditLimit: Number(c.credit_limit) ?? 500` evaluates constantly to the left-hand side because `Number()` never returns `null` or `undefined` (it returns `NaN` if unparseable).
- Files: `src/db/operations.ts:673`
- Trigger: When a customer with an invalid or undefined credit limit is pulled from server sync, `creditLimit` becomes `NaN` instead of falling back to `500`.
- Workaround: Change to `Number(c.credit_limit) || 500`.

## Security Considerations

**Production Server Startup Crash on Missing JWT_SECRET:**
- Risk: In `render.yaml`, `ADMIN_SECRET` is generated dynamically, but `JWT_SECRET` is not specified. In `server/middleware/auth.ts:28-35`, the server crashes fatally on boot in production if `JWT_SECRET` is unset:
  `throw new Error('FATAL: JWT_SECRET environment variable is unset...')`.
- Files: `render.yaml`, `server/middleware/auth.ts`
- Current mitigation: A guard exists to prevent running with an insecure default secret in production.
- Recommendations: Add `JWT_SECRET` with `generateValue: true` to `render.yaml` so Render automatically provisions a cryptographically random secret on deployment.

**Default Dev Secrets in Source:**
- Risk: If running in non-production (`NODE_ENV !== 'production'`), fallback secrets `'dukaankhata-secret-key-123'` and `'dukaankhata-dev-jwt-secret-change-in-production'` are used.
- Files: `server/middleware/auth.ts`
- Current mitigation: Production runtime rejects missing JWT_SECRET.
- Recommendations: Always require `.env` secret overrides even in staging or QA environments.

## Performance Bottlenecks

**Large Customer List Filter on Every Keystroke:**
- Problem: Searching customers iterates and filters over all customer records in memory inside React component render loops.
- Files: `src/components/LedgerView.tsx`
- Cause: `useLiveQuery(() => db.customers.toArray())` pulls all records into component memory and runs Javascript `.filter()` on every input change.
- Improvement path: Leverage IndexedDB indexes with Dexie's `.where('name').startsWithIgnoreCase()` or `.where('phone').equals()` to filter in the database engine rather than in React state.

## Fragile Areas

**SpeechRecognition API Browser Variability:**
- Files: `src/components/VoiceInputModal.tsx`, `src/utils/voiceParser.ts`
- Why fragile: Web SpeechRecognition is vendor-dependent (prefixed as `webkitSpeechRecognition` in Chrome, unsupported in Firefox desktop and some mobile WebViews). Also requires active internet connection for Google speech recognition services on many mobile browsers.
- Safe modification: Check `window.SpeechRecognition || window.webkitSpeechRecognition` before mounting, display clear fallback UI when unavailable, and preserve manual keypad entry.
- Test coverage: Zero automated test coverage due to browser speech synthesis/recognition API mocking requirements.

**Synchronous SQLite File Locking under Concurrency:**
- Files: `server/config/database.ts`, `server/models/Sync.ts`
- Why fragile: `better-sqlite3` is synchronous. While WAL mode allows concurrent readers, write operations lock the SQLite database file. High concurrent batch sync requests can block the Node.js event loop.
- Safe modification: Keep write transactions short; avoid nested synchronous calls or heavy computations inside SQLite transactions.
- Test coverage: Load benchmark script in `tests/load/load-benchmark.ts` tests `GET /api/health` with 50 connections, but not concurrent write mutations.

## Scaling Limits

**Single-Instance SQLite Database Storage:**
- Current capacity: Single-disk local file (`dukaankhata.db`). Suitable for micro-retailers (< 100,000 transactions).
- Limit: File corruption risk if running across ephemeral cloud containers without persistent volume mounts. Render free tier spins down and has an ephemeral filesystem, wiping database changes upon restart.
- Scaling path: Attach a persistent disk (`mountPath: /var/data` in `render.yaml`), or migrate domain models to PostgreSQL / SQLite Cloud for distributed multi-tenant deployments.

## Dependencies at Risk

**Better-SQLite3 Native Addon Compilations:**
- Package: `better-sqlite3` v13.0.3
- Risk: Native C++ binary addon dependent on host Node ABI version and C++ compiler tools (Python, node-gyp, make/MSBuild).
- Impact: Builds fail if host environment Node version drifts or lack development compilers (as documented in commit `febb4b4` and `c07227a`).
- Migration plan: Maintain pre-bundled deployment scripts or evaluate pure-Wasm SQLite drivers (`sql.js` or `@libsql/client`) if serverless deployment without C++ build chains is required.

## Missing Critical Features

**Automated CI Pipeline:**
- Problem: No GitHub Actions or CI pipeline exists to run `npm run lint`, `npx vitest run`, and `npm run build` on push or pull request.
- Blocks: Regressions in linting or tests can be committed and merged unnoticed.

## Test Coverage Gaps

**Client-Side Dexie Operations and Store Reducers:**
- What's not tested: `src/db/operations.ts`, `src/store/useAppStore.ts`, and `src/store/authStore.ts` have no unit tests.
- Files: `src/db/operations.ts`, `src/store/authStore.ts`
- Risk: Edge cases in local outbox mutation queueing, offline synchronization conflicts, or user session wipes could break silently.
- Priority: High

**Voice Parser Rule Parsing:**
- What's not tested: Devanagari numbers conversion, Hindi word numbers extraction, and regex boundary handling in `src/utils/voiceParser.ts`.
- Files: `src/utils/voiceParser.ts`
- Risk: Voice commands with combined amounts or irregular phrasing may fail to extract the correct amounts.
- Priority: Medium

---

*Concerns audit: 2026-11-06*
