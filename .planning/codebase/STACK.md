---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# Technology Stack

**Analysis Date:** 2026-11-06

## Languages

**Primary:**
- TypeScript ~6.0.2 - Full-stack type definitions across client UI (`src/`), server backend (`server/`), and automated test suites (`tests/`). Target configured in `tsconfig.json`, `tsconfig.app.json`, and `tsconfig.node.json`.

**Secondary:**
- JavaScript (ES Modules) - Bundled output (`server-dist/index.js`, `dist/`), configuration scripts (`vite.config.ts`, `.oxlintrc.json`).
- HTML5 / CSS3 - Client entry markup in `index.html`, styling in `src/index.css` and `src/App.css` using Tailwind CSS v4.

## Runtime

**Environment:**
- Node.js >=20.0.0 (engines field in `package.json`). Specified as Node 24 in `.nvmrc`, `.node-version`, and Render configuration `render.yaml`.
- Browser runtime: Modern evergreen browsers supporting IndexedDB, Service Workers, Web Audio API, and Web SpeechSynthesis / SpeechRecognition.

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present (lockfileVersion 3).

## Frameworks

**Core:**
- React 19.2.8 (`react`, `react-dom`) - Touch-first mobile PWA frontend with concurrent features.
- Express 5.3.0 (`express`) - Server backend REST API and static asset host in `server/index.ts`.
- Dexie.js 4.4.6 (`dexie`, `dexie-react-hooks`) - Client-side IndexedDB wrapper providing offline-first local persistence and live reactive queries.
- Zustand 5.0.15 (`zustand`) - Lightweight client state management for UI, offline status, and authentication sessions (`src/store/useAppStore.ts`, `src/store/authStore.ts`).

**Testing:**
- Vitest 5.0.5 (`vitest`) - Unit and integration test runner.
- Playwright 1.64.1 (`@playwright/test`) - End-to-end browser automation suite (`tests/e2e/auth-flow.spec.ts`).
- Supertest 7.3.1 (`supertest`) - HTTP integration assertion library.
- Autocannon 8.0.0 (`autocannon`) - HTTP benchmarking and load testing (`tests/load/load-benchmark.ts`).

**Build/Dev:**
- Vite 8.3.0 (`vite`) with `@vitejs/plugin-react` (6.1.1) - Client development server and production bundler.
- Tailwind CSS 4.3.3 (`tailwindcss`, `@tailwindcss/vite`) - Utility-first styling engine.
- vite-plugin-pwa 2.0.0 (`vite-plugin-pwa`) - Service worker generation and PWA manifest management in `vite.config.ts`.
- esbuild 0.28.2 (`esbuild`) - Server build pipeline bundling `server/index.ts` to `server-dist/index.js`.
- tsx 4.23.15 (`tsx`) - TypeScript execute engine for zero-compile local server development (`npm run server`).
- Oxlint 1.81.0 (`oxlint`) - High-performance Rust-based linter configured via `.oxlintrc.json`.

## Key Dependencies

**Critical:**
- `better-sqlite3` ^13.0.3 - Synchronous, C++ binding SQLite3 database engine powering backend persistence in WAL mode (`server/config/database.ts`).
- `jsonwebtoken` ^9.0.3 - JWT token issuance and verification for stateless multi-tenant authentication (`server/middleware/auth.ts`, `server/models/User.ts`).
- `bcryptjs` ^3.0.3 - Salted password hashing for user accounts (`server/routes/authRoutes.ts`).
- `lucide-react` ^1.56.0 - Mobile touch icons across all PWA bottom navigation and ledger views.

**Infrastructure:**
- `helmet` ^8.3.0 - HTTP security headers and Content Security Policy configured in `server/index.ts`.
- `cors` ^2.8.6 - Cross-Origin Resource Sharing middleware.
- `express-rate-limit` ^8.7.1 - API rate limiting (300 requests / 15 minutes per IP).
- `dotenv` ^18.0.7 - Environment variable parsing from `.env`.
- `canvas-confetti` ^1.9.4 - Confetti animation for register closing celebrations.

## Configuration

**Environment:**
- Managed via `.env` (loaded by `dotenv` in `server/index.ts`). Template provided in `.env.example`.
- Key variables:
  - `PORT`: HTTP port for Express server (default `5000` locally, `10000` on Render).
  - `JWT_SECRET`: Secret key for signing user auth tokens (fatal in production if unset).
  - `ADMIN_SECRET`: Shared secret for `/api/backup` and `/api/backup/restore`.
  - `DATA_DIR` / `DB_PATH`: Storage directory and path for `dukaankhata.db`.
  - `ALLOWED_ORIGINS`: Comma-separated CORS origins or `*`.
  - `NODE_ENV`: Runtime mode (`development` vs `production`).

**Build:**
- Client build: `tsc -b && vite build` outputs to `dist/`.
- Server build: `esbuild server/index.ts --bundle --packages=external --platform=node --target=node20 --format=esm --outfile=server-dist/index.js`.
- Unified build: `npm run build` runs both sequentially.
- TypeScript configs: `tsconfig.json` (solution), `tsconfig.app.json` (browser client), `tsconfig.node.json` (Vite config & tools).

## Platform Requirements

**Development:**
- Node.js 20+ or 24+.
- C++ build tools (Python 3, Visual Studio C++ Build Tools on Windows / gcc/make on Linux) required for compiling `better-sqlite3` native binaries.
- Port 5000 (backend API) and Port 5173 (Vite frontend dev server).

**Production:**
- Target: Render Web Service (`render.yaml`), Node 24 runtime.
- Build command: `npm install --include=dev && npm rebuild better-sqlite3 --build-from-source && npm run build`.
- Start command: `npm start` (`node server-dist/index.js`).
- Persistent disk recommended for `/server/data` to retain SQLite data across deploys and restarts.

---

*Stack analysis: 2026-11-06*
