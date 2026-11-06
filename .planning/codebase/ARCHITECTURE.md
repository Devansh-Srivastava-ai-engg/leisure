---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
<!-- refreshed: 2026-11-06 -->
# Architecture

**Analysis Date:** 2026-11-06

## System Overview

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Client: React 19 PWA                            │
├────────────────────┬────────────────────┬──────────────────────────────┤
│  Touch UI & Views  │  Zustand Stores    │  Voice / Audio Engines       │
│  `src/components/` │  `src/store/`      │  `src/utils/`                │
└─────────┬──────────┴─────────┬──────────┴──────────────┬───────────────┘
          │                    │                         │
          ▼                    ▼                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Local Offline-First Persistence & Sync Outbox              │
│             Dexie.js (IndexedDB) `src/db/db.ts`, `src/db/operations.ts` │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTPS / Delta Sync
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Server: Express 5 MVC & Security                    │
│      Helmet CSP, CORS, Rate Limit, JWT Auth Middleware (`server/`)      │
├─────────────────────────┬──────────────────────────┬───────────────────┤
│  Controllers & Routes   │  Domain Models           │  Views            │
│  `server/controllers/`  │  `server/models/`        │  `server/views/`  │
└─────────────────────────┴────────────┬─────────────┴───────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│          SQLite 3 with Write-Ahead Logging (WAL) & Multi-Tenant        │
│          `better-sqlite3` in `server/config/database.ts`               │
└────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Server Entry & Middleware | Bootstraps Express 5, configures Helmet CSP, CORS, body limits, rate limits, mounts API routes and SPA static handler | `server/index.ts` |
| SQLite Engine & Migrations | Initializes `better-sqlite3`, applies WAL pragmas, runs idempotent schema migrations for `user_id` tenant isolation | `server/config/database.ts` |
| Auth Middleware | Enforces JWT token verification, attaches `userId` to `AuthenticatedRequest`, checks admin secret | `server/middleware/auth.ts` |
| Customer Domain | Manages customer ledgers, credit limits, pinned regulars, and per-user customer search | `server/models/Customer.ts`, `server/controllers/CustomerController.ts` |
| Transaction Domain | Records debit/credit entries, calculates balances, tracks items and payment methods | `server/models/Transaction.ts`, `server/controllers/TransactionController.ts` |
| Inventory Domain | Tracks micro-inventory items, loose unit stock conversions, cost vs selling prices, presets | `server/models/Inventory.ts`, `server/controllers/InventoryController.ts` |
| Sync Engine | Bidirectional synchronization processing client mutations with Last-Write-Wins and audit logging | `server/models/Sync.ts`, `server/controllers/SyncController.ts` |
| Daily Register Domain | Manages daily cash drawer tallies, physical denomination counters, and day closure reconciliation | `server/models/DailyRegister.ts`, `server/controllers/RegisterController.ts` |
| Client DB & Sync Client | Dexie.js IndexedDB schema, seed datasets, mutation queue (`syncOutbox`), and pull reconciliation | `src/db/db.ts`, `src/db/operations.ts` |
| App State Store | Global UI state: active tab, sunlight mode, offline status, language, audio toggles | `src/store/useAppStore.ts` |
| Auth Store | Authentication state: token, active user, login/logout, session restoration, and DB wipe | `src/store/authStore.ts` |
| Voice Parser | Natural language parser for Hindi, Hinglish, and English voice commands into ledger transactions | `src/utils/voiceParser.ts` |
| Audio Feedback Engine | Synthesized metallic chimes, Web SpeechSynthesis text-to-speech, and haptic vibration triggers | `src/utils/audio.ts` |

## Pattern Overview

**Overall:** Offline-First Progressive Web App (Client) with MVC Multi-Tenant REST API Backend (Server).

**Key Characteristics:**
- **Zero-Latency Local Writes**: Client performs all user operations against IndexedDB first via Dexie.js before queueing an outbox entry.
- **Bi-directional Delta Synchronization**: Client flushes queued mutations to `POST /api/sync`; server processes mutations in atomic transactions and logs an audit trail in `sync_audit_log`. Multi-device pulls occur via `GET /api/pull?since={timestamp}`.
- **Strict Multi-Tenant Row Isolation**: Backend models scope every database query (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) with `WHERE user_id = ?`.
- **Stateless Authentication**: JWT tokens issued on login/registration encode the user ID; client purges local Dexie data on user switch/logout to prevent cross-account data leakage.

## Layers

**Client Presentation Layer:**
- Purpose: High-speed, thumb-friendly touch UI optimized for outdoor sunlight conditions.
- Location: `src/components/`
- Contains: React components (`LedgerView.tsx`, `CounterView.tsx`, `CashDrawerView.tsx`, `DaySummaryView.tsx`, `AuthScreen.tsx`, modal drawers).
- Depends on: `src/store/`, `src/db/operations.ts`, `src/utils/`.
- Used by: Browser DOM via `src/App.tsx`.

**Client Persistence & Sync Layer:**
- Purpose: Local IndexedDB data persistence, offline change tracking, and server sync invocation.
- Location: `src/db/`
- Contains: `db.ts` (Dexie schema, seed defaults), `operations.ts` (CRUD operations and sync handlers).
- Depends on: `src/services/api.ts`, `src/types/index.ts`.
- Used by: React components and Zustand stores.

**Server Routing & Controller Layer:**
- Purpose: HTTP request routing, input validation, authentication enforcement, and JSON response formatting.
- Location: `server/routes/`, `server/controllers/`
- Contains: Express routers (`authRoutes.ts`, `customerRoutes.ts`, `syncRoutes.ts`, etc.) and controller classes.
- Depends on: `server/models/`, `server/middleware/auth.ts`, `server/views/responseView.ts`.
- Used by: `server/index.ts`.

**Server Data & Model Layer:**
- Purpose: SQL query encapsulation, transaction coordination, and SQLite table migrations.
- Location: `server/models/`, `server/config/`
- Contains: Model classes (`Customer.ts`, `Transaction.ts`, `Inventory.ts`, `DailyRegister.ts`, `Sync.ts`, `User.ts`) and `database.ts`.
- Depends on: `better-sqlite3`.
- Used by: Controllers.

## Data Flow

### Primary Request Path (Ledger Transaction Entry)

1. User taps Jama or Udhar on `src/components/QuickKeypadModal.tsx` or `src/components/LedgerView.tsx`.
2. `recordTransaction()` in `src/db/operations.ts` inserts the record into Dexie's `transactions` table, updates customer balance in `customers` table, and enqueues mutation in `syncOutbox`.
3. Audio chime and optional Hindi/English spoken confirmation triggered via `src/utils/audio.ts`.
4. If browser is online, `flushSyncOutbox()` sends pending mutations to `POST /api/sync` (`src/services/api.ts`).
5. `SyncController.sync()` in `server/controllers/SyncController.ts` delegates payload to `SyncModel.processBatch()` in `server/models/Sync.ts`.
6. SQLite transaction executes within WAL journal mode, updates backend domain tables with `user_id`, and writes audit record to `sync_audit_log`.

### Secondary Flow (Voice-to-Ledger Entry)

1. User clicks persistent microphone button, opening `src/components/VoiceInputModal.tsx`.
2. Speech recognition stream captures audio and calls `parseVoiceInput()` in `src/utils/voiceParser.ts`.
3. Parser extracts customer name, numerical amount (supporting Devanagari numerals and Hindi word-numbers like "पचास", "सौ"), and transaction type (`CREDIT` vs `DEBIT`).
4. UI displays extracted card with a 3-second auto-confirmation countdown.
5. On expiry or user tap, transaction is committed to Dexie and queued for sync.

**State Management:**
- Client UI State: Managed via `useAppStore` (active navigation tab, sunlight mode flag, online status, language preference) and `useAuthStore` (token, user details, session recovery).
- Domain Data State: Reactive queries using `useLiveQuery` from `dexie-react-hooks` directly subscribed to Dexie IndexedDB tables.

## Key Abstractions

**`SyncOutboxItem`:**
- Purpose: Tracks uncommitted client mutations across offline periods.
- Location: `src/types/index.ts`, `src/db/db.ts`.
- Pattern: Outbox pattern for reliable eventual consistency.

**`AuthenticatedRequest`:**
- Purpose: Express Request extension injecting validated `userId` from JWT payload.
- Location: `server/middleware/auth.ts`.
- Pattern: Middleware decorator pattern.

**Domain Models (`CustomerModel`, `TransactionModel`, `InventoryModel`):**
- Purpose: Encapsulates SQL queries with required `userId` parameter scoping.
- Location: `server/models/`.
- Pattern: Active Record / Table Data Gateway.

## Entry Points

**Client Web Entry:**
- Location: `src/main.tsx` → `src/App.tsx`.
- Triggers: Browser loading `index.html`.
- Responsibilities: Mounts React root, initializes Dexie DB, restores auth session, registers online/offline event listeners.

**Server Application Entry:**
- Location: `server/index.ts`.
- Triggers: Executed by Node runtime via `npm run server` (`tsx server/index.ts`) or `npm start` (`node server-dist/index.js`).
- Responsibilities: Configures security middleware, runs DB migrations, mounts routes, serves SPA assets, binds HTTP port.

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop with synchronous SQLite queries via `better-sqlite3`. WAL mode prevents reader blocking while writes are executed.
- **Global State:** Database handle singleton `db` in `server/config/database.ts` and Dexie client singleton `db` in `src/db/db.ts`.
- **Client Cache Isolation:** Switching accounts requires a full purge of local IndexedDB data (`clearLocalDatabase()` in `src/db/db.ts`) followed by a pull from the cloud to avoid mixing tenant records on shared devices.
- **JWT Secret Mandatory:** Production environments enforce that `JWT_SECRET` is set; startup throws a fatal error if missing (`server/middleware/auth.ts`).

## Anti-Patterns

### Raw `fetch()` in Integration Tests without Server Lifecyle Management

**What happens:** Tests in `tests/integration/api.test.ts` and `tests/security/tenant-isolation.test.ts` call `fetch('http://localhost:5000/api/...')` expecting an external server to already be running.
**Why it's wrong:** Vitest runs fail immediately with `ECONNREFUSED` if the server process is not started out-of-band before test execution.
**Do this instead:** Use `supertest` with the exported Express `app` instance from `server/index.ts` (e.g. `request(app).get('/api/customers')`), or spin up the server in a `beforeAll` hook.

### Playwright Test Mixed with Vitest Test Runner

**What happens:** `tests/e2e/auth-flow.spec.ts` imports `@playwright/test` but is picked up by Vitest's default glob matching.
**Why it's wrong:** Throws `Error: Playwright Test did not expect test() to be called here` during `vitest run`.
**Do this instead:** Configure `vitest.config.ts` to exclude `tests/e2e/**`, reserving `tests/e2e/` for Playwright's CLI runner (`npx playwright test`).

## Error Handling

**Strategy:** Fail-safe defaults with localized recovery.
- Server: Express error middleware catches all uncaught exceptions, logs detail to console, and returns sanitized JSON with status code (`server/index.ts`).
- Client: IndexedDB operations catch exceptions and fall back to in-memory state; network sync failures leave items in `syncOutbox` for retry.

## Cross-Cutting Concerns

**Logging:** Console-based logging for migrations and startup; sync audit logged to SQLite table `sync_audit_log`.
**Validation:** Basic type checking and sanitize checks in controllers; voice parsing normalization handles both Devanagari numerals and written Hindi words.
**Authentication:** JWT Bearer tokens with 30-day validity; bcrypt password hashing with 10 salt rounds.

---

*Architecture analysis: 2026-11-06*
