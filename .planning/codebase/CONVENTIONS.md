---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# Coding Conventions

**Analysis Date:** 2026-11-06

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g. `src/components/CashDrawerView.tsx`, `src/components/Header.tsx`).
- Server controllers & models: PascalCase with `.ts` extension (e.g. `server/controllers/CustomerController.ts`, `server/models/Customer.ts`).
- Server routes, views, client utilities, stores: camelCase with `.ts` extension (e.g. `server/routes/customerRoutes.ts`, `src/store/useAppStore.ts`, `src/utils/voiceParser.ts`).
- Test files: kebab-case or camelCase with `.test.ts` (Vitest) or `.spec.ts` (Playwright) (e.g. `tests/security/tenant-isolation.test.ts`, `tests/e2e/auth-flow.spec.ts`).

**Functions:**
- camelCase for functions and methods across both client and server (e.g. `calculateCustomerBalance`, `parseVoiceInput`, `flushSyncOutbox`, `speakConfirmation`).
- React functional components use PascalCase (e.g. `export const CounterView: React.FC = () => { ... }`).
- Express route handlers are static methods on PascalCase controller classes (e.g. `CustomerController.getAll`, `HealthController.getHealth`).

**Variables:**
- camelCase for standard local variables, object properties, and state hooks (e.g. `sunlightMode`, `activeTab`, `isDbReady`).
- UPPER_SNAKE_CASE for global constants, configuration defaults, and table mappings (e.g. `DEFAULT_SETTINGS`, `SEED_CUSTOMERS`, `DOMAIN_TABLES`, `DIST_DIR`, `TOKEN_KEY`).
- Database column names in SQLite: snake_case (e.g. `user_id`, `created_at`, `credit_limit`, `balance_owed`, `units_per_parent`).

**Types:**
- PascalCase for TypeScript interfaces and type aliases (e.g. `Customer`, `Transaction`, `InventoryItem`, `DailyRegister`, `AuthenticatedRequest`).
- PascalCase with `Data` suffix for database model records (e.g. `CustomerData`, `UserData`, `InventoryData`).
- Enum-like string unions for bounded domain states (e.g. `TransactionType = 'CREDIT' | 'DEBIT'`, `SyncAction = 'CREATE' | 'UPDATE' | 'DELETE'`).

## Code Style

**Formatting:**
- Indentation: 2 spaces.
- Quotes: Single quotes (`'`) for strings in TypeScript; double quotes (`"`) in JSON.
- Semicolons: Semicolons used consistently throughout all TypeScript files.
- Trailing commas: Used for multiline arrays and objects.

**Linting:**
- Linter: Oxlint (`oxlint`), configured in `.oxlintrc.json`.
- Rules active: standard ESLint and React compiler rules.
- Run command: `npm run lint`.
- Note: Several React components currently trigger `react(set-state-in-effect)` and `react-hooks(exhaustive-deps)` warnings in Oxlint during state synchronization.

## Import Organization

**Order:**
1. External core libraries (e.g. `import React, { useEffect, useState } from 'react';`, `import express from 'express';`).
2. Third-party packages (e.g. `import cors from 'cors';`, `import { create } from 'zustand';`, `import Dexie from 'dexie';`).
3. Internal domain modules and stores (e.g. `import { useAppStore } from './store/useAppStore';`, `import { db } from '../config/database';`).
4. Internal components and views (e.g. `import { Header } from './components/Header';`).
5. Type definitions (`import type { Customer, Transaction } from '../types';`).

**Path Aliases:**
- Relative path imports used throughout (e.g. `../config/database`, `./components/BottomNav`). No `@/...` tsconfig path aliases configured.

## Error Handling

**Patterns:**
- Server API routes: Asynchronous controller methods wrap logic in `try ... catch` blocks and invoke `res.status(500).json({ success: false, error: err.message })` or forward to Express's centralized error handler (`server/index.ts`).
- Tenant isolation guards: Return HTTP 404 (or 401 for missing/invalid auth) when a record exists for another user or is missing, preventing user enumeration (`CustomerModel.findById` in `server/models/Customer.ts`).
- Client IndexedDB operations: Wrapped in `try ... catch` blocks with fallback logging (`console.warn('Initialization error:', err)` in `src/App.tsx`).
- Production error hygiene: Server error middleware conceals stack traces and internal exceptions when `NODE_ENV === 'production'`.

## Logging

**Framework:**
- Native `console.log` and `console.error`.

**Patterns:**
- Server startup and banner messages formatted with Unicode box-drawing characters for clean console feedback (`server/index.ts`).
- Server schema migrations log each applied column migration with tag prefix `[Migration]` (`server/config/database.ts`).
- Unhandled errors log with `[Unhandled Error]` prefix (`server/index.ts`).
- Sync events recorded to `sync_audit_log` SQLite table rather than relying solely on ephemeral stdout.

## Comments

**When to Comment:**
- Section division headers using dashed separators (e.g. `// ---------------------------------------------------------------------------`).
- Explaining security measures (e.g. CSP directives, CORS origins, body limits, tenant isolation migration).
- Explaining complex business formulas (e.g. cash drawer reconciliation formula in `README.md` and `CashDrawerView.tsx`).

**JSDoc/TSDoc:**
- Used on exported middleware functions and critical models (e.g. `AuthenticatedRequest`, `runMigrations()`, `requireAuth()` in `server/middleware/auth.ts`).

## Function Design

**Size:**
- Single-responsibility helper functions in `src/utils/` (~20-80 lines).
- React components range from ~80 lines (nav/header) to ~250 lines (complex drawers and ledger list).
- Controllers delegate all database interactions directly to corresponding Model classes.

**Parameters:**
- Controllers use standard Express `(req: Request, res: Response)` parameters.
- Model methods require `userId: string` as the first or mandatory parameter to enforce tenant isolation.

**Return Values:**
- Server endpoints return JSON payloads matching `{ success: boolean, data?: T, error?: string }` or standardized views.
- Client utility functions return strongly-typed result interfaces (e.g. `ParsedVoiceResult` in `src/utils/voiceParser.ts`).

## Module Design

**Exports:**
- Named exports preferred for React components, stores, utilities, and models (e.g. `export const App: React.FC`, `export class CustomerModel`, `export const useAuthStore`).
- Default exports used for the Express `app` instance (`server/index.ts`) and Express route modules (`server/routes/customerRoutes.ts`).

**Barrel Files:**
- `server/routes/index.ts` serves as a routing barrel mounting all resource routers onto `apiRouter`.
- `src/types/index.ts` serves as the central type contract barrel for all client models.

---

*Convention analysis: 2026-11-06*
