---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# Codebase Structure

**Analysis Date:** 2026-11-06

## Directory Layout

```
leisure/
├── .planning/               # GSD planning directory, roadmaps, and codebase maps
│   └── codebase/            # Codebase intelligence reference documents
├── public/                  # Static assets and PWA icons
│   ├── favicon.svg          # Application icon
│   ├── icons.svg            # UI SVG icon bundle
│   ├── pwa-192x192.svg      # PWA 192px home screen icon
│   └── pwa-512x512.svg      # PWA 512px splash screen icon
├── server/                  # Backend Express 5 MVC server source
│   ├── config/              # Database initialization and schema migrations
│   │   └── database.ts      # SQLite connection, WAL mode, user_id migration
│   ├── controllers/         # HTTP request handlers
│   │   ├── BackupController.ts
│   │   ├── CustomerController.ts
│   │   ├── HealthController.ts
│   │   ├── InventoryController.ts
│   │   ├── RegisterController.ts
│   │   ├── SyncController.ts
│   │   ├── TransactionController.ts
│   │   └── VendorController.ts
│   ├── data/                # SQLite database and WAL files
│   │   ├── .gitkeep
│   │   └── dukaankhata.db   # Embedded SQLite file (excluded in git)
│   ├── middleware/          # Express middleware
│   │   └── auth.ts          # JWT authentication and admin secret guards
│   ├── models/              # SQLite data access and business logic models
│   │   ├── Customer.ts
│   │   ├── DailyRegister.ts
│   │   ├── Inventory.ts
│   │   ├── Sync.ts
│   │   ├── Transaction.ts
│   │   ├── User.ts
│   │   └── Vendor.ts
│   ├── routes/              # Express API route modules
│   │   ├── authRoutes.ts
│   │   ├── backupRoutes.ts
│   │   ├── customerRoutes.ts
│   │   ├── healthRoutes.ts
│   │   ├── index.ts         # Main API router mounting all sub-routes
│   │   ├── inventoryRoutes.ts
│   │   ├── registerRoutes.ts
│   │   ├── syncRoutes.ts
│   │   ├── transactionRoutes.ts
│   │   └── vendorRoutes.ts
│   ├── views/               # HTML template string renderers
│   │   ├── dashboardView.ts # Status dashboard HTML renderer
│   │   └── responseView.ts  # Standardized API response formatters
│   └── index.ts             # Express server entry point
├── src/                     # Frontend React 19 PWA application
│   ├── assets/              # Client images and SVGs
│   ├── components/          # Touch-first UI views and modals
│   │   ├── AuthScreen.tsx   # Login and registration view
│   │   ├── BottomNav.tsx    # Mobile navigation bar
│   │   ├── CashDrawerView.tsx
│   │   ├── CounterView.tsx
│   │   ├── CustomerHistoryDrawer.tsx
│   │   ├── CustomerModal.tsx
│   │   ├── DaySummaryView.tsx
│   │   ├── ExpenseModal.tsx
│   │   ├── Header.tsx       # Top bar with language and sunlight toggle
│   │   ├── ItemModal.tsx
│   │   ├── LedgerView.tsx   # Main ledger and customer list
│   │   ├── QuickKeypadModal.tsx
│   │   ├── SelectCustomerModal.tsx
│   │   ├── UpiQrModal.tsx
│   │   ├── VendorModal.tsx
│   │   ├── VendorsView.tsx
│   │   └── VoiceInputModal.tsx
│   ├── db/                  # Client Dexie.js persistence and sync
│   │   ├── db.ts            # Dexie schema, default settings, seed data
│   │   └── operations.ts    # Dexie CRUD functions and server sync triggers
│   ├── services/            # Client-side API clients
│   │   └── api.ts           # Fetch wrappers with auth token headers
│   ├── store/               # Zustand state stores
│   │   ├── authStore.ts     # User authentication and token store
│   │   └── useAppStore.ts   # UI state, active tab, sunlight mode
│   ├── types/               # TypeScript interfaces and data models
│   │   └── index.ts         # Shared client data contracts
│   ├── utils/               # Client helper utilities
│   │   ├── audio.ts         # Web Audio API and SpeechSynthesis engine
│   │   ├── i18n.ts          # Hindi and English translation dictionaries
│   │   └── voiceParser.ts   # Speech transcription parsing logic
│   ├── App.css              # Custom UI animations and overrides
│   ├── App.tsx              # Root React component and lifecycle coordinator
│   ├── index.css            # Tailwind CSS imports and global styling
│   ├── main.tsx             # React DOM mounting entry point
│   └── vite-env.d.ts        # Vite client type declarations
├── tests/                   # Automated test suites
│   ├── e2e/                 # Playwright end-to-end tests
│   │   └── auth-flow.spec.ts
│   ├── integration/         # API integration tests
│   │   └── api.test.ts
│   ├── load/                # Performance benchmarks
│   │   └── load-benchmark.ts
│   ├── security/            # Multi-tenant isolation verification tests
│   │   └── tenant-isolation.test.ts
│   └── unit/                # Pure unit tests
│       └── domain.test.ts
├── .env.example             # Example environment variable specifications
├── .gitignore               # Git ignored patterns
├── .node-version            # Node version indicator (24)
├── .nvmrc                   # NVM Node version indicator (24)
├── .oxlintrc.json           # Oxlint linter rules
├── index.html               # Main HTML entry with PWA manifest links
├── package.json             # Dependencies, scripts, and engine specifications
├── render.yaml              # Render PaaS deployment infrastructure blueprint
├── tsconfig.app.json        # TypeScript config for client application
├── tsconfig.json            # Root TypeScript solution configuration
├── tsconfig.node.json       # TypeScript config for build tools
└── vite.config.ts           # Vite, React, Tailwind, and PWA plugin config
```

## Directory Purposes

**`server/`:**
- Purpose: Contains the complete Express 5 backend application, following MVC separation.
- Contains: `config/`, `controllers/`, `data/`, `middleware/`, `models/`, `routes/`, `views/`, and `index.ts`.
- Key files: `server/index.ts`, `server/config/database.ts`, `server/middleware/auth.ts`.

**`src/`:**
- Purpose: Touch-first client single-page application built with React 19.
- Contains: `components/`, `db/`, `services/`, `store/`, `types/`, `utils/`, styles, and root application files.
- Key files: `src/App.tsx`, `src/main.tsx`, `src/store/useAppStore.ts`, `src/db/db.ts`.

**`tests/`:**
- Purpose: Contains automated verification suites divided by test tier.
- Contains: `unit/` (domain calculations), `integration/` (HTTP APIs), `security/` (tenant isolation), `load/` (autocannon benchmark), `e2e/` (Playwright flow).
- Key files: `tests/unit/domain.test.ts`, `tests/security/tenant-isolation.test.ts`.

**`public/`:**
- Purpose: Static assets copied as-is to output root during build.
- Contains: PWA manifest icons, favicon, SVG assets.

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Client frontend application entry.
- `server/index.ts`: Backend Express server entry.
- `index.html`: Client HTML document shell.

**Configuration:**
- `vite.config.ts`: Vite bundling, Tailwind plugin, and PWA manifest generation.
- `render.yaml`: Cloud deployment definition for Render.
- `tsconfig.json` & `tsconfig.app.json`: TypeScript compiler options.
- `.oxlintrc.json`: Linter rule definitions.

**Core Logic:**
- `server/config/database.ts`: SQLite schema creation, WAL pragma setup, and safe table migrations.
- `server/models/Sync.ts`: Server-side delta synchronization engine with audit logging.
- `src/db/operations.ts`: Client-side Dexie CRUD operations and sync push/pull triggers.
- `src/utils/voiceParser.ts`: Speech transcription parser handling Hindi/English numbers and terms.
- `src/utils/audio.ts`: Web Audio API synthesizer, TTS, and vibration coordinator.

**Testing:**
- `tests/unit/domain.test.ts`: Calculation logic testing.
- `tests/integration/api.test.ts`: API route integration testing.
- `tests/security/tenant-isolation.test.ts`: Multi-tenant data segregation testing.
- `tests/e2e/auth-flow.spec.ts`: Playwright end-to-end user journey.

## Naming Conventions

**Files:**
- React Components: PascalCase ending in `.tsx` (e.g. `src/components/LedgerView.tsx`, `src/components/CashDrawerView.tsx`).
- Controllers & Models: PascalCase ending in `.ts` (e.g. `server/controllers/CustomerController.ts`, `server/models/Transaction.ts`).
- Routes & Stores: camelCase ending in `.ts` (e.g. `server/routes/customerRoutes.ts`, `src/store/authStore.ts`).
- Utilities & Helpers: camelCase ending in `.ts` (e.g. `src/utils/voiceParser.ts`, `src/utils/audio.ts`).
- Test Files: `.test.ts` for unit/integration/security tests, `.spec.ts` for Playwright E2E tests.

**Directories:**
- lowercase or kebab-case (e.g. `src/components`, `server/models`, `tests/e2e`).

## Where to Add New Code

**New Feature (e.g., Supplier Purchase Invoices):**
- Database Model: `server/models/Invoice.ts` with tenant isolation (`user_id = ?`).
- Controller: `server/controllers/InvoiceController.ts`.
- Routes: `server/routes/invoiceRoutes.ts` mounted in `server/routes/index.ts`.
- Client Types: Add interface to `src/types/index.ts`.
- Client Store / DB: Add Dexie table to `src/db/db.ts` and operations in `src/db/operations.ts`.
- UI View / Component: `src/components/InvoiceView.tsx`.
- Tests: Add unit tests in `tests/unit/` and integration tests in `tests/integration/`.

**New Component/Modal:**
- Implementation: `src/components/YourModal.tsx`.
- Connect to App: Import and conditionally render inside `src/App.tsx` or parent view.

**Utilities:**
- Shared helper logic: `src/utils/yourHelper.ts`.

## Special Directories

**`server/data/`:**
- Purpose: Stores the persistent SQLite database (`dukaankhata.db`) along with WAL (`-wal`) and shared memory (`-shm`) files.
- Generated: Yes.
- Committed: No (only `.gitkeep` is tracked in version control).

**`dist/` & `server-dist/`:**
- Purpose: Production build artifacts generated by Vite and esbuild.
- Generated: Yes.
- Committed: No (ignored via `.gitignore`).

---

*Structure analysis: 2026-11-06*
