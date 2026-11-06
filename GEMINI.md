<!-- GSD:project-start source:PROJECT.md -->

## Project

**DukaanKhata (दुकान खाता)**

DukaanKhata is an ultra-fast, offline-first bilingual (Hindi/English) Progressive Web App with an Express 5 backend designed for micro-retailers (panwadi shops, chai tapris, and local kirana stalls). It replaces manual paper bahi-khata with a touch-first digital ledger, voice-to-ledger entries, one-tap UPI WhatsApp payment links, granular loose-stock inventory tracking, and daily cash drawer reconciliation with multi-tenant data isolation.

**Core Value:** Zero-latency, reliable ledger recording that works completely offline in bright sunlight conditions, ensuring small shop owners never lose track of credit (उधार) or cash (रोकड़).

### Constraints

- **Tech Stack**: Must preserve React 19 + TypeScript + Express 5 + SQLite in WAL mode.
- **Offline Reliability**: All core store operations must function without an active network connection.
- **Performance**: Transaction entries must complete in under 3 seconds on low-end mobile devices.
- **Security**: Strict multi-tenant data isolation via `user_id` query scoping and JWT validation.

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- TypeScript ~6.0.2 - Full-stack type definitions across client UI (`src/`), server backend (`server/`), and automated test suites (`tests/`). Target configured in `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`.
- JavaScript (ES Modules) - Bundled output (`server-dist/index.js`, `dist/`), configuration scripts (`vite.config.ts`, `.oxlintrc.json`).
- HTML5 / CSS3 - Client entry markup in `index.html`, styling in `src/index.css` and `src/App.css` using Tailwind CSS v4.

## Runtime

- Node.js >=20.0.0 (engines field in `package.json`). Specified as Node 24 in `.nvmrc`, `.node-version`, and Render configuration `render.yaml`.
- Browser runtime: Modern evergreen browsers supporting IndexedDB, Service Workers, Web Audio API, and Web SpeechSynthesis / SpeechRecognition.
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3).

## Frameworks

- React 19.2.8 (`react`, `react-dom`) - Touch-first mobile PWA frontend with concurrent features.
- Express 5.3.0 (`express`) - Server backend REST API and static asset host in `server/index.ts`.
- Dexie.js 4.4.6 (`dexie`, `dexie-react-hooks`) - Client-side IndexedDB wrapper providing offline-first local persistence and live reactive queries.
- Zustand 5.0.15 (`zustand`) - Lightweight client state management for UI, offline status, and authentication sessions (`src/store/useAppStore.ts`, `src/store/authStore.ts`).
- Vitest 5.0.5 (`vitest`) - Unit and integration test runner.
- Playwright 1.64.1 (`@playwright/test`) - End-to-end browser automation suite (`tests/e2e/auth-flow.spec.ts`).
- Supertest 7.3.1 (`supertest`) - HTTP integration assertion library.
- Autocannon 8.0.0 (`autocannon`) - HTTP benchmarking and load testing (`tests/load/load-benchmark.ts`).
- Vite 8.3.0 (`vite`) with `@vitejs/plugin-react` (6.1.1) - Client development server and production bundler.
- Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`) - Utility-first styling engine.
- vite-plugin-pwa 2.0.0 (`vite-plugin-pwa`) - Service worker generation and PWA manifest management in `vite.config.ts`.
- esbuild 0.28.2 (`esbuild`) - Server build pipeline bundling `server/index.ts` to `server-dist/index.js`.
- tsx 4.23.15 (`tsx`) - TypeScript execute engine for zero-compile local server development (`npm run server`).
- Oxlint 1.81.0 (`oxlint`) - High-performance Rust-based linter configured via `.oxlintrc.json`.

## Key Dependencies

- `better-sqlite3` ^13.0.3 - Synchronous, C++ binding SQLite3 database engine powering backend persistence in WAL mode (`server/config/database.ts`).
- `jsonwebtoken` ^9.0.3 - JWT token issuance and verification for stateless multi-tenant authentication (`server/middleware/auth.ts`, `server/models/User.ts`).
- `bcryptjs` ^3.0.3 - Salted password hashing for user accounts (`server/routes/authRoutes.ts`).
- `lucide-react` ^1.56.0 - Mobile touch icons across all PWA bottom navigation and ledger views.
- `helmet` ^8.3.0 - HTTP security headers and Content Security Policy configured in `server/index.ts`.
- `cors` ^2.8.6 - Cross-Origin Resource Sharing middleware.
- `express-rate-limit` ^8.7.1 - API rate limiting (300 requests / 15 minutes per IP).
- `dotenv` ^18.0.7 - Environment variable parsing from `.env`.
- `canvas-confetti` ^1.9.4 - Confetti animation for register closing celebrations.

## Configuration

- Managed via `.env` (loaded by `dotenv` in `server/index.ts`). Template provided in `.env.example`.
- Key variables:
- Client build: `tsc -b && vite build` outputs to `dist/`.
- Server build: `esbuild server/index.ts --bundle --packages=external --platform=node --target=node20 --format=esm --outfile=server-dist/index.js`.
- Unified build: `npm run build` runs both sequentially.
- TypeScript configs: `tsconfig.json` (solution), `tsconfig.app.json` (browser client), `tsconfig.node.json` (Vite config & tools).

## Platform Requirements

- Node.js 20+ or 24+.
- C++ build tools (Python 3, Visual Studio C++ Build Tools on Windows / gcc/make on Linux) required for compiling `better-sqlite3` native binaries.
- Port 5000 (backend API) and Port 5173 (Vite frontend dev server).
- Target: Render Web Service (`render.yaml`), Node 24 runtime.
- Build command: `npm install --include=dev && npm rebuild better-sqlite3 --build-from-source && npm run build`.
- Start command: `npm start` (`node server-dist/index.js`).
- Persistent disk recommended for `/server/data` to retain SQLite data across deploys and restarts.

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- React components: PascalCase with `.tsx` extension (e.g. `src/components/CashDrawerView.tsx`, `src/components/Header.tsx`).
- Server controllers & models: PascalCase with `.ts` extension (e.g. `server/controllers/CustomerController.ts`, `server/models/Customer.ts`).
- Server routes, views, client utilities, stores: camelCase with `.ts` extension (e.g. `server/routes/customerRoutes.ts`, `src/store/useAppStore.ts`, `src/utils/voiceParser.ts`).
- Test files: kebab-case or camelCase with `.test.ts` (Vitest) or `.spec.ts` (Playwright) (e.g. `tests/security/tenant-isolation.test.ts`, `tests/e2e/auth-flow.spec.ts`).
- camelCase for functions and methods across both client and server (e.g. `calculateCustomerBalance`, `parseVoiceInput`, `flushSyncOutbox`, `speakConfirmation`).
- React functional components use PascalCase (e.g. `export const CounterView: React.FC = () => { ... }`).
- Express route handlers are static methods on PascalCase controller classes (e.g. `CustomerController.getAll`, `HealthController.getHealth`).
- camelCase for standard local variables, object properties, and state hooks (e.g. `sunlightMode`, `activeTab`, `isDbReady`).
- UPPER_SNAKE_CASE for global constants, configuration defaults, and table mappings (e.g. `DEFAULT_SETTINGS`, `SEED_CUSTOMERS`, `DOMAIN_TABLES`, `DIST_DIR`, `TOKEN_KEY`).
- Database column names in SQLite: snake_case (e.g. `user_id`, `created_at`, `credit_limit`, `balance_owed`, `units_per_parent`).
- PascalCase for TypeScript interfaces and type aliases (e.g. `Customer`, `Transaction`, `InventoryItem`, `DailyRegister`, `AuthenticatedRequest`).
- PascalCase with `Data` suffix for database model records (e.g. `CustomerData`, `UserData`, `InventoryData`).
- Enum-like string unions for bounded domain states (e.g. `TransactionType = 'CREDIT' | 'DEBIT'`, `SyncAction = 'CREATE' | 'UPDATE' | 'DELETE'`).

## Code Style

- Indentation: 2 spaces.
- Quotes: Single quotes (`'`) for strings in TypeScript; double quotes (`"`) in JSON.
- Semicolons: Semicolons used consistently throughout all TypeScript files.
- Trailing commas: Used for multiline arrays and objects.
- Linter: Oxlint (`oxlint`), configured in `.oxlintrc.json`.
- Rules active: standard ESLint and React compiler rules.
- Run command: `npm run lint`.
- Note: Several React components currently trigger `react(set-state-in-effect)` and `react-hooks(exhaustive-deps)` warnings in Oxlint during state synchronization.

## Import Organization

- Relative path imports used throughout (e.g. `../config/database`, `./components/BottomNav`). No `@/...` tsconfig path aliases configured.

## Error Handling

- Server API routes: Asynchronous controller methods wrap logic in `try ... catch` blocks and invoke `res.status(500).json({ success: false, error: err.message })` or forward to Express's centralized error handler (`server/index.ts`).
- Tenant isolation guards: Return HTTP 404 (or 401 for missing/invalid auth) when a record exists for another user or is missing, preventing user enumeration (`CustomerModel.findById` in `server/models/Customer.ts`).
- Client IndexedDB operations: Wrapped in `try ... catch` blocks with fallback logging (`console.warn('Initialization error:', err)` in `src/App.tsx`).
- Production error hygiene: Server error middleware conceals stack traces and internal exceptions when `NODE_ENV === 'production'`.

## Logging

- Native `console.log` and `console.error`.
- Server startup and banner messages formatted with Unicode box-drawing characters for clean console feedback (`server/index.ts`).
- Server schema migrations log each applied column migration with tag prefix `[Migration]` (`server/config/database.ts`).
- Unhandled errors log with `[Unhandled Error]` prefix (`server/index.ts`).
- Sync events recorded to `sync_audit_log` SQLite table rather than relying solely on ephemeral stdout.

## Comments

- Section division headers using dashed separators (e.g. `// ---------------------------------------------------------------------------`).
- Explaining security measures (e.g. CSP directives, CORS origins, body limits, tenant isolation migration).
- Explaining complex business formulas (e.g. cash drawer reconciliation formula in `README.md` and `CashDrawerView.tsx`).
- Used on exported middleware functions and critical models (e.g. `AuthenticatedRequest`, `runMigrations()`, `requireAuth()` in `server/middleware/auth.ts`).

## Function Design

- Single-responsibility helper functions in `src/utils/` (~20-80 lines).
- React components range from ~80 lines (nav/header) to ~250 lines (complex drawers and ledger list).
- Controllers delegate all database interactions directly to corresponding Model classes.
- Controllers use standard Express `(req: Request, res: Response)` parameters.
- Model methods require `userId: string` as the first or mandatory parameter to enforce tenant isolation.
- Server endpoints return JSON payloads matching `{ success: boolean, data?: T, error?: string }` or standardized views.
- Client utility functions return strongly-typed result interfaces (e.g. `ParsedVoiceResult` in `src/utils/voiceParser.ts`).

## Module Design

- Named exports preferred for React components, stores, utilities, and models (e.g. `export const App: React.FC`, `export class CustomerModel`, `export const useAuthStore`).
- Default exports used for the Express `app` instance (`server/index.ts`) and Express route modules (`server/routes/customerRoutes.ts`).
- `server/routes/index.ts` serves as a routing barrel mounting all resource routers onto `apiRouter`.
- `src/types/index.ts` serves as the central type contract barrel for all client models.

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

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

- **Zero-Latency Local Writes**: Client performs all user operations against IndexedDB first via Dexie.js before queueing an outbox entry.
- **Bi-directional Delta Synchronization**: Client flushes queued mutations to `POST /api/sync`; server processes mutations in atomic transactions and logs an audit trail in `sync_audit_log`. Multi-device pulls occur via `GET /api/pull?since={timestamp}`.
- **Strict Multi-Tenant Row Isolation**: Backend models scope every database query (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) with `WHERE user_id = ?`.
- **Stateless Authentication**: JWT tokens issued on login/registration encode the user ID; client purges local Dexie data on user switch/logout to prevent cross-account data leakage.

## Layers

- Purpose: High-speed, thumb-friendly touch UI optimized for outdoor sunlight conditions.
- Location: `src/components/`
- Contains: React components (`LedgerView.tsx`, `CounterView.tsx`, `CashDrawerView.tsx`, `DaySummaryView.tsx`, `AuthScreen.tsx`, modal drawers).
- Depends on: `src/store/`, `src/db/operations.ts`, `src/utils/`.
- Used by: Browser DOM via `src/App.tsx`.
- Purpose: Local IndexedDB data persistence, offline change tracking, and server sync invocation.
- Location: `src/db/`
- Contains: `db.ts` (Dexie schema, seed defaults), `operations.ts` (CRUD operations and sync handlers).
- Depends on: `src/services/api.ts`, `src/types/index.ts`.
- Used by: React components and Zustand stores.
- Purpose: HTTP request routing, input validation, authentication enforcement, and JSON response formatting.
- Location: `server/routes/`, `server/controllers/`
- Contains: Express routers (`authRoutes.ts`, `customerRoutes.ts`, `syncRoutes.ts`, etc.) and controller classes.
- Depends on: `server/models/`, `server/middleware/auth.ts`, `server/views/responseView.ts`.
- Used by: `server/index.ts`.
- Purpose: SQL query encapsulation, transaction coordination, and SQLite table migrations.
- Location: `server/models/`, `server/config/`
- Contains: Model classes (`Customer.ts`, `Transaction.ts`, `Inventory.ts`, `DailyRegister.ts`, `Sync.ts`, `User.ts`) and `database.ts`.
- Depends on: `better-sqlite3`.
- Used by: Controllers.

## Data Flow

### Primary Request Path (Ledger Transaction Entry)

### Secondary Flow (Voice-to-Ledger Entry)

- Client UI State: Managed via `useAppStore` (active navigation tab, sunlight mode flag, online status, language preference) and `useAuthStore` (token, user details, session recovery).
- Domain Data State: Reactive queries using `useLiveQuery` from `dexie-react-hooks` directly subscribed to Dexie IndexedDB tables.

## Key Abstractions

- Purpose: Tracks uncommitted client mutations across offline periods.
- Location: `src/types/index.ts`, `src/db/db.ts`.
- Pattern: Outbox pattern for reliable eventual consistency.
- Purpose: Express Request extension injecting validated `userId` from JWT payload.
- Location: `server/middleware/auth.ts`.
- Pattern: Middleware decorator pattern.
- Purpose: Encapsulates SQL queries with required `userId` parameter scoping.
- Location: `server/models/`.
- Pattern: Active Record / Table Data Gateway.

## Entry Points

- Location: `src/main.tsx` → `src/App.tsx`.
- Triggers: Browser loading `index.html`.
- Responsibilities: Mounts React root, initializes Dexie DB, restores auth session, registers online/offline event listeners.
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

### Playwright Test Mixed with Vitest Test Runner

## Error Handling

- Server: Express error middleware catches all uncaught exceptions, logs detail to console, and returns sanitized JSON with status code (`server/index.ts`).
- Client: IndexedDB operations catch exceptions and fall back to in-memory state; network sync failures leave items in `syncOutbox` for retry.

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agents/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
