# Phase 3: Production Security & Cloud Deployment - Research
**Researched:** 2026-11-06
**Domain:** Cloud Deployment & Production Security (Render Blueprints, Express 5, JWT, Static PWA Asset Delivery)
**Confidence:** HIGH

## Summary

DukaanKhata's production deployment target is a Node.js web service orchestrated via Render Infrastructure-as-Code (`render.yaml`). The application enforces strict production guards: upon starting in production (`process.env.NODE_ENV === 'production'`), `server/middleware/auth.ts` verifies that `JWT_SECRET` is set and non-empty. If missing, it immediately throws a fatal exception preventing insecure execution. Currently, `render.yaml` declares `generateValue: true` for `ADMIN_SECRET` but omits `JWT_SECRET`, which would cause production deployments on Render to crash fatally on boot.

In addition, DukaanKhata uses a unified build pipeline (`npm run build`) comprising client compilation (`tsc -b && vite build` -> `dist/`) and server compilation (`esbuild server/index.ts ...` -> `server-dist/index.js`). In production (`npm start`), Express hosts both the REST API under `/api` and serves the compiled PWA static assets from `dist/` with an SPA HTML fallback and secure Helmet Content Security Policy headers. 

During research, an empirical build probe (`npm run build`) surfaced 3 TypeScript compile errors in `src/components/` (missing `DailyRegister` type import in `CashDrawerView.tsx`, and mismatched translation keys `'name'` vs `'customerName'` in `CustomerModal.tsx` and `'voiceInputTitle'` vs `'voiceInputPrompt'` in `VoiceInputModal.tsx`). Resolving these type discrepancies is a prerequisite for generating `dist/` so that `npm run build` and `npm start` boot cleanly.

**Primary recommendation:** Update `render.yaml` with `- key: JWT_SECRET` set to `generateValue: true`, fix the 3 TypeScript client build blockers, and create an automated test suite verifying `render.yaml` schema, production JWT guard behavior, and clean production boot with static PWA asset serving.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Secret Provisioning | Cloud Orchestration (Render Blueprint) | Operating System Env | Render generates cryptographically secure 256-bit secrets injected at process launch |
| JWT Secret Guard | Server Middleware (`auth.ts`) | Server Entry (`index.ts`) | Guards against starting the server in production mode with absent or default secrets |
| Static PWA Asset Serving | Server Static Middleware (`index.ts`) | Reverse Proxy / CDN | Express serves `dist/` with Helmet CSP headers and client-side SPA route fallback |
| Offline PWA Execution | Browser Client (Service Worker) | Browser IndexedDB | Client caches assets via Workbox service worker and operates offline without server connection |
| SQLite Data Persistence | Server Database Layer (`database.ts`) | Host Storage (Persistent Disk) | Better-SQLite3 accesses disk; Render Starter requires persistent volume mount at `/var/data` |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | `render.yaml` configuration auto-generates `JWT_SECRET` on deployment to prevent fatal server startup crashes in production mode | Render Blueprint specification supports `generateValue: true` under `envVars` to generate high-entropy secrets |
| SEC-02 | Server boots cleanly in production without missing secret errors and serves static PWA assets reliably | Fix client TypeScript compilation errors, verify `npm run build`, and test production boot with `server-dist/index.js` serving `dist/index.html` |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express` | ^5.3.0 | Web server & static asset host | Standard Node.js HTTP server [VERIFIED: package.json:26] |
| `helmet` | ^8.3.0 | Secure HTTP header & CSP enforcement | Protects PWA against clickjacking, XSS, and unauthorized external resources [VERIFIED: package.json:28] |
| `jsonwebtoken` | ^9.0.3 | JWT token signing & verification | Industry-standard stateless authentication [VERIFIED: package.json:29] |
| `better-sqlite3` | ^13.0.3 | WAL-mode SQLite database engine | Synchronous, high-throughput embedded relational database [VERIFIED: package.json:20] |
| `esbuild` | ^0.28.2 | Server compilation pipeline | Fast ESM bundler packaging `server/index.ts` to `server-dist/index.js` [VERIFIED: package.json:53] |
| `vite` | ^8.3.0 | Client PWA bundling | Produces optimized production client bundle in `dist/` [VERIFIED: package.json:58] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `supertest` | ^7.3.1 | HTTP endpoint assertions | Testing production routes and headers without port collisions [VERIFIED: package.json:55] |
| `vitest` | ^5.0.5 | Automated test runner | Running unit, integration, and configuration test suites [VERIFIED: package.json:60] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `generateValue: true` in `render.yaml` | Manual env var in Render Dashboard | Manual setup is error-prone and breaks IaC reproducibility across deployments |
| Express static asset serving | Standalone S3/Cloudflare Pages | DukaanKhata is a single-container deployment; hosting SPA directly from Express simplifies deployment on Render |

## Package Legitimacy Audit

No new external runtime or development dependencies are required for Phase 3. All necessary tools (`vitest`, `supertest`, `esbuild`, `helmet`, `jsonwebtoken`) are already installed and locked in `package.json`.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `express` | npm | 14 yrs | 35M/wk | github.com/expressjs/express | [OK] | Approved |
| `helmet` | npm | 12 yrs | 3.5M/wk | github.com/helmetjs/helmet | [OK] | Approved |
| `jsonwebtoken` | npm | 11 yrs | 18M/wk | github.com/auth0/node-jsonwebtoken | [OK] | Approved |
| `supertest` | npm | 12 yrs | 5M/wk | github.com/ladjs/supertest | [OK] | Approved |

## Architecture Patterns

### System Architecture Diagram

```
                 [ Render Cloud Platform ]
                             │
     1. Reads Blueprint      │ 2. Auto-provisions 256-bit
        render.yaml          │    secrets on deployment
                             ▼
               ┌───────────────────────────┐
               │  Render Environment Vars  │
               │  - NODE_ENV: production   │
               │  - JWT_SECRET: <auto-gen> │
               │  - ADMIN_SECRET: <auto-gen│
               └─────────────┬─────────────┘
                             │
            3. Spawns process (npm start)
                             ▼
             ┌───────────────────────────────┐
             │ Node.js: server-dist/index.js │
             └───────────────┬───────────────┘
                             │
              4. Import server/middleware/auth.ts
                             ▼
               [ JWT Production Guard ]
              Is JWT_SECRET set & non-empty?
                    /             \
                 NO                YES
                /                   \
        [Fatal Startup Crash]    [Safe Server Initialization]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
                       ▼                                           ▼
             [ /api/* API Routes ]                     [ Express Static: dist/ ]
             - /api/health (200 OK)                    - / (index.html)
             - /api/auth/login                         - /assets/*.js, *.css
             - /api/sync                               - SPA fallback to index.html
```

### Pattern 1: Render Blueprint Environment Auto-Generation
**What:** Declare `generateValue: true` for sensitive cryptographic keys in `render.yaml`.
**When to use:** Whenever a service requires a secure, high-entropy random string (e.g., session cookies, encryption keys, JWT signing secrets) that should not be committed to source control.
**Code Example:**
```yaml
# Source: C:/Users/Devansh/Desktop/leisure/render.yaml
services:
  - type: web
    name: dukaankhata
    runtime: node
    plan: free # Change to starter if attaching persistent disk
    buildCommand: npm install --include=dev && npm rebuild better-sqlite3 --build-from-source && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_VERSION
        value: 24
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: ALLOWED_ORIGINS
        value: "*"
      - key: ADMIN_SECRET
        generateValue: true
      - key: JWT_SECRET
        generateValue: true
```

### Pattern 2: Multi-Stage Production Build & Static PWA Serving
**What:** Client compilation produces `dist/` containing `index.html`, PWA manifest, service worker (`sw.js`), and hashed assets; server compilation produces `server-dist/index.js`. At boot, Express detects `dist/` and serves both API routes and frontend assets.
**Implementation in codebase:**
In `package.json:6-12`:
```json
    "build:client": "tsc -b && vite build",
    "build:server": "esbuild server/index.ts --bundle --packages=external --platform=node --target=node20 --format=esm --outfile=server-dist/index.js",
    "build": "npm run build:client && npm run build:server",
    "start": "node server-dist/index.js",
```
In `server/index.ts:94-105`:
```typescript
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
} else {
  // If dist has not been built yet (e.g. backend-only dev)
  app.get('/', HealthController.getDashboard);
}
```

### Anti-Patterns to Avoid
- **Hardcoding fallback secrets in production:** Allowing fallback string `'dukaankhata-dev-jwt-secret-change-in-production'` to run in production invalidates all cryptographic guarantees. The server must throw fatally if `JWT_SECRET` is missing when `NODE_ENV === 'production'`.
- **Catching and swallowing the fatal guard error:** The check in `server/middleware/auth.ts:28-35` must remain a top-level unhandled exception or fail-fast exit on import/start so that misconfigured instances refuse to traffic requests.
- **Serving static index.html on `/api/*` requests:** The SPA fallback middleware must explicitly check `!req.path.startsWith('/api')` to prevent HTML error responses on nonexistent API endpoints.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret Generation | Custom deployment shell scripts generating random tokens | Render `generateValue: true` | Render handles persistence, generation entropy, and secure storage in platform keystore |
| Security Headers | Custom header manipulation middleware | `helmet()` with CSP directives | Helmet properly formats complex CSP syntax, clickjacking protections, and MIME-sniffing defenses |
| SPA Route Fallback | Custom regex url rewrite filters | `app.use((req, res, next) => { if (req.method === 'GET' && !req.path.startsWith('/api')) ... })` | Clean, predictable single-point routing boundary |

## Common Pitfalls

### Pitfall 1: Missing `JWT_SECRET` in Production Mode
**What goes wrong:** Deploying on Render causes the container to crash immediately with:
`FATAL: JWT_SECRET environment variable is unset. Server cannot safely run in production mode without a secure JWT secret.` [VERIFIED: server/middleware/auth.ts:32-34]
**Why it happens:** `render.yaml` omitted `JWT_SECRET` under `envVars`.
**How to avoid:** Add `- key: JWT_SECRET` with `generateValue: true` to `render.yaml`.
**Warning signs:** Server container restarts in a crash loop on Render immediately after deployment.

### Pitfall 2: Client TypeScript Build Failures Blocking Production Build
**What goes wrong:** Running `npm run build` exits with code 1 during `build:client` (`tsc -b`).
**Why it happens:** Empirical build probe revealed 3 existing TypeScript type errors in `src/components/`:
1. `src/components/CashDrawerView.tsx:56`: `useState<DailyRegister | undefined>` — `DailyRegister` is not imported from `../types`.
2. `src/components/CustomerModal.tsx:88`: `getTranslation(language, 'name')` — translation key is `'customerName'`.
3. `src/components/VoiceInputModal.tsx:248`: `getTranslation(language, 'voiceInputTitle')` — translation key is `'voiceInputPrompt'`.
**How to avoid:** Correct the type import and the 2 translation keys before running `npm run build`.

### Pitfall 3: Render Free Tier Ephemeral Storage vs Persistent Disks
**What goes wrong:** Changes written to SQLite (`dukaankhata.db`) are wiped whenever Render spins down or redeploys on the free tier.
**Why it happens:** Free web services on Render have an ephemeral filesystem; disks can only be attached on paid Starter plans.
**How to avoid:** In `server/config/database.ts`, the database path is configurable via `DATA_DIR` and `DB_PATH`. Document that users upgrading to the paid Starter plan can uncomment the `disk:` block in `render.yaml` (`mountPath: /var/data`) and set `DATA_DIR: /var/data`.

### Pitfall 4: Port Collisions and libuv Handles During Automated Verification
**What goes wrong:** Starting the production server directly via `node server-dist/index.js` in a test script can hang the process or fail with `EADDRINUSE` if port 5000 is occupied.
**Why it happens:** `server/index.ts` automatically calls `app.listen(PORT)` when `process.env.NODE_ENV !== 'test'`.
**How to avoid:** In automated verification tests, either import `app` with `supertest` (setting `process.env.NODE_ENV = 'test'` during app creation) or spawn `node server-dist/index.js` with an isolated ephemeral port (e.g. `PORT=5999`) and terminate the child process with `kill()` and graceful exit handlers.

## Code Examples

### 1. In-Repo Verbatim Definitions

#### Render Blueprint Configuration
```yaml
# Source: C:/Users/Devansh/Desktop/leisure/render.yaml:8-18
    envVars:
      - key: NODE_VERSION
        value: 24
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: ALLOWED_ORIGINS
        value: "*"
      - key: ADMIN_SECRET
        generateValue: true
```

#### JWT Secret Production Guard
```typescript
// Source: C:/Users/Devansh/Desktop/leisure/server/middleware/auth.ts:28-35
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim())
) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is unset. Server cannot safely run in production mode without a secure JWT secret.',
  );
}
```

#### getJwtSecret Helper
```typescript
// Source: C:/Users/Devansh/Desktop/leisure/server/middleware/auth.ts:38-48
export const getJwtSecret = (): string => {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim())
  ) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is unset. Server cannot safely run in production mode without a secure JWT secret.',
    );
  }
  return process.env.JWT_SECRET || 'dukaankhata-dev-jwt-secret-change-in-production';
};
```

#### Static Asset and SPA Fallback Serving
```typescript
// Source: C:/Users/Devansh/Desktop/leisure/server/index.ts:94-105
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
} else {
  // If dist has not been built yet (e.g. backend-only dev)
  app.get('/', HealthController.getDashboard);
}
```

### 2. Client TypeScript Fixes Required for `npm run build`

```typescript
// 1. src/components/CashDrawerView.tsx
// Before:
import type { Denominations } from '../types';
// After:
import type { Denominations, DailyRegister } from '../types';

// 2. src/components/CustomerModal.tsx
// Before:
{getTranslation(language, 'name')}
// After:
{getTranslation(language, 'customerName')}

// 3. src/components/VoiceInputModal.tsx
// Before:
{getTranslation(language, 'voiceInputTitle')}
// After:
{getTranslation(language, 'voiceInputPrompt')}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded or committed JWT secret | Render `generateValue: true` dynamic provisioning | Render Blueprints v1 | Cryptographically random unique secret generated per service deployment |
| Static frontend hosted on separate S3 bucket | Express unified SPA static server | Modern Node.js PWAs | Single unified deployment artifact on Render web service |
| Manual dotenv files in production containers | Cloud environment injection (`envVars`) | Cloud 12-factor apps | Zero secret leakage in git or build logs |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Render generates 256-bit random string for `generateValue: true` | Architectural Patterns | Negligible — Render guarantees sufficient entropy for auth tokens |

## Open Questions

1. **Persistent disk cost on Render:**
   - What we know: Render free plan does not support persistent disks. SQLite changes reset if the container is reaped.
   - What's unclear: Does the user intend to run on Free tier for demo/testing or upgrade to Starter tier for persistence?
   - Recommendation: Keep `plan: free` as the active default in `render.yaml` with commented-out `disk:` configuration instructions for paid Starter tier.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v24.19.0 | — |
| npm | Package management & scripts | ✓ | 11.1.0 | — |
| Python | PyYAML validation & build tools | ✓ | 3.14.6 | Node regex parser |
| Oxlint | Code quality verification | ✓ | 1.81.0 | — |
| Vitest | Test execution | ✓ | 5.0.5 | — |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT secret enforced at boot via `getJwtSecret()` [VERIFIED: server/middleware/auth.ts:28-35] |
| V3 Session Management | yes | Stateless JWT with expiration and token verification [VERIFIED: server/middleware/auth.ts:90-108] |
| V4 Access Control | yes | Multi-tenant row isolation via `user_id` query scoping in all database queries |
| V5 Input Validation | yes | Express JSON payload limit (`100kb`) and rate limiting (300 req/15min) [VERIFIED: server/index.ts:64,70] |
| V6 Cryptography | yes | Render `generateValue: true` cryptographic secret provisioning, bcryptjs for passwords |
| V14 Configuration | yes | Helmet security headers with strict CSP [VERIFIED: server/index.ts:22-37] |

### Known Threat Patterns for Express / Render Deployment

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure default secret in production | Elevation of Privilege | Fatal boot crash if `JWT_SECRET` is unset when `NODE_ENV === 'production'` |
| Secret leaked to repository | Information Disclosure | `generateValue: true` in `render.yaml`; `.env` in `.gitignore` |
| Denial of Service via large requests | Denial of Service | `express.json({ limit: '100kb' })` and `express-rate-limit` |
| Clickjacking / XSS | Tampering | Helmet CSP headers set in `server/index.ts` |

## Sources

### Primary (HIGH confidence)
- In-repo verification: `render.yaml:8-18`
- In-repo verification: `server/middleware/auth.ts:28-48`
- In-repo verification: `server/index.ts:14-17, 94-105`
- In-repo verification: `server/config/database.ts:9-15`
- In-repo verification: `package.json:6-12`
- Empirical execution: `npm run build` and `npx tsc -b` identifying 3 compile errors in `src/components/`
- Empirical execution: `node server-dist/index.js` verifying fatal crash on missing `JWT_SECRET` and clean boot with healthy `/api/health` and PWA asset response when `JWT_SECRET` is set

### Secondary (MEDIUM confidence)
- Render Blueprint Specification: `render.com/docs/blueprint-spec` for `generateValue: true` and `disk` syntax.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Directly verified against `package.json` and in-repo build scripts.
- Architecture: HIGH - Verified against existing server entry, auth middleware, and client PWA build pipeline.
- Pitfalls: HIGH - Empirically reproduced and confirmed via compiler and runtime test executions.

**Research date:** 2026-11-06
**Valid until:** 2026-12-06
