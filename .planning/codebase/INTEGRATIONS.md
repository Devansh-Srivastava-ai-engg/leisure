---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# External Integrations

**Analysis Date:** 2026-11-06

## APIs & External Services

**Payment & Banking:**
- UPI Dynamic Payment Strings - Client-side intent URL generation (`upi://pay?pa={upi}&pn={shop}&am={balance}&cu=INR`) for instant payment requests via WhatsApp in `src/components/CustomerHistoryDrawer.tsx` and `src/components/LedgerView.tsx`.
- QR Server API - Dynamic QR code image generation (`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=...`) used in `src/components/UpiQrModal.tsx`. Whitelisted in Helmet Content Security Policy (`imgSrc: ["'self'", "data:", "blob:", "https://api.qrserver.com"]` in `server/index.ts`).

**Messaging & Sharing:**
- WhatsApp Web / Mobile Protocol - Pre-formatted sharing links (`https://wa.me/{phone}?text=...` and `whatsapp://send?text=...`) for sending billing reminders and daily ledger reports in `src/components/CustomerHistoryDrawer.tsx` and `src/components/DaySummaryView.tsx`.

**Browser Multimedia APIs:**
- Web SpeechSynthesis API - Text-to-speech engine providing spoken balance and transaction confirmations in Hindi and English (`src/utils/audio.ts`).
- Web SpeechRecognition API - Colloquial speech-to-text audio input parsing for hands-free counter transactions (`src/components/VoiceInputModal.tsx`, `src/utils/voiceParser.ts`).
- Web Audio API - Programmatic metallic coin and cash register chimes generated via `AudioContext` oscillators (`src/utils/audio.ts`).
- Navigator Vibration API - Tactile haptic feedback (`navigator.vibrate`) on mobile transaction commits (`src/utils/audio.ts`).

## Data Storage

**Databases:**
- SQLite 3 (Server): Embedded SQL database stored in `server/data/dukaankhata.db`.
  - Client: `better-sqlite3` driver in `server/config/database.ts`.
  - Mode: Write-Ahead Logging (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;`).
  - Connection: Local disk path configured via `DB_PATH` or `DATA_DIR` environment variables.
- IndexedDB (Client PWA): Browser-native persistent storage named `DukaanKhataDB`.
  - Client: Dexie.js v4 in `src/db/db.ts` and `src/db/operations.ts`.
  - Tables: `customers`, `transactions`, `inventory`, `vendors`, `vendorTransactions`, `dailyRegisters`, `syncOutbox`, `settings`.

**File Storage:**
- Local filesystem only (`server/data/` for SQLite database, WAL, and SHM files).
- Static assets bundled in `dist/` and `public/` (PWA icons, SVGs, favicon).

**Caching:**
- Service Worker Cache (Client): Workbox offline precaching configured via `vite-plugin-pwa` in `vite.config.ts`.
- In-memory SQLite PRAGMA cache on backend (`server/config/database.ts`).

## Authentication & Identity

**Auth Provider:**
- Custom JWT Authentication:
  - Tokens: Signed using `jsonwebtoken` with 30-day expiration (`jwt.sign({ userId }, secret, { expiresIn: '30d' })` in `server/models/User.ts`).
  - Passwords: Salted bcrypt hashes using `bcryptjs` (10 rounds in `server/routes/authRoutes.ts`).
  - Storage: Client token stored in browser `localStorage` under key `dukaankhata_token` (`src/store/authStore.ts`).
  - Transport: Sent as HTTP Bearer token in `Authorization: Bearer <token>` header (`src/services/api.ts`).
  - Isolation: All database queries enforce tenant isolation via `user_id` foreign keys (`server/middleware/auth.ts`, `server/config/database.ts`).

**Admin Guard:**
- Static admin secret (`ADMIN_SECRET` env var or header `x-admin-secret`) for database backup and restore endpoints in `server/middleware/auth.ts`.

## Monitoring & Observability

**Error Tracking:**
- None external (no Sentry, Datadog, or external APM configured).
- Centralized Express error handler in `server/index.ts` logs unhandled exceptions to `console.error` and sanitizes error messages in production mode.
- Sync audit log table `sync_audit_log` records every client mutation in SQLite (`server/models/Sync.ts`).

**Logs:**
- Console output: Standard `console.log` / `console.error` with server startup banners, graceful shutdown notices, and migration output.
- Health Check: `GET /api/health` reports status, uptime in seconds, memory usage (RSS, heapTotal, heapUsed), and total database row counts across all tables (`server/controllers/HealthController.ts`).
- Dashboard View: HTML server status dashboard at `GET /dashboard` (`server/views/dashboardView.ts`).

## CI/CD & Deployment

**Hosting:**
- Render (`render.yaml`): Node.js Web Service running `node server-dist/index.js` on port 10000.
  - Native compile build step: `npm rebuild better-sqlite3 --build-from-source`.

**CI Pipeline:**
- None detected (no `.github/workflows/` or `.gitlab-ci.yml` present).
- Local linting via `npm run lint` (`oxlint`).
- Automated tests run via `vitest` and Playwright (`@playwright/test`).

## Environment Configuration

**Required env vars:**
- `NODE_ENV`: `production` or `development`.
- `PORT`: Server listen port (e.g., `5000` or `10000`).
- `JWT_SECRET`: Mandatory in production for signing and verifying customer authentication tokens (`server/middleware/auth.ts`).
- `ADMIN_SECRET`: Required for authorizing `/api/backup` and `/api/backup/restore` operations.
- `ALLOWED_ORIGINS`: Comma-separated list of origins allowed by CORS (e.g., `http://localhost:5173,https://my-domain.onrender.com`).
- `DATA_DIR` / `DB_PATH`: Optional path overrides for server SQLite storage.

**Secrets location:**
- Stored in local untracked `.env` file (pattern in `.env.example`).
- Render environment variables configured in cloud dashboard (`render.yaml`).

## Webhooks & Callbacks

**Incoming:**
- None (no Stripe, Razorpay, or external webhook receivers).

**Outgoing:**
- None (no outgoing webhooks; push synchronization is initiated from PWA client via `POST /api/sync`).

---

*Integration audit: 2026-11-06*
