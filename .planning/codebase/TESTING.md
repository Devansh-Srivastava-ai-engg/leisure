---
last_mapped_commit: c5702e47e5385757718f758a91a31d5da4cd79c7
last_mapped_at: 2026-11-06
---
# Testing Patterns

**Analysis Date:** 2026-11-06

## Test Framework

**Runner:**
- Vitest 5.0.5 (`vitest`) for unit, integration, and security tests.
- Playwright 1.64.1 (`@playwright/test`) for browser E2E verification.
- Config: Configured primarily via CLI arguments; no dedicated `vitest.config.ts` file currently exists in the root directory.

**Assertion Library:**
- Vitest built-in assertions (`expect`, `describe`, `it`, `beforeAll`).
- Playwright assertions (`expect(page).toHaveTitle(...)`).

**Run Commands:**
```bash
npx vitest run                               # Run all Vitest test suites
npx vitest run tests/unit                    # Run unit tests only
npx vitest --watch                           # Run in watch mode
npx playwright test                          # Run Playwright E2E suites
npm run lint                                 # Static analysis via Oxlint
```

## Test File Organization

**Location:**
- Dedicated `tests/` directory at the project root separated by test tier:
  - `tests/unit/`: Domain logic and math calculation tests.
  - `tests/integration/`: Express API endpoint verification.
  - `tests/security/`: Multi-tenant data isolation and privilege tests.
  - `tests/load/`: Autocannon performance benchmarking.
  - `tests/e2e/`: Playwright browser interaction flows.

**Naming:**
- Unit, integration, security tests: `*.test.ts`.
- Playwright end-to-end tests: `*.spec.ts`.
- Performance benchmarks: `*.ts`.

**Structure:**
```
tests/
├── unit/
│   └── domain.test.ts
├── integration/
│   └── api.test.ts
├── security/
│   └── tenant-isolation.test.ts
├── load/
│   └── load-benchmark.ts
└── e2e/
    └── auth-flow.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = 'http://localhost:5000/api';

describe('Security Test: Multi-Tenant Isolation', () => {
  let tokenA = '';
  let tokenB = '';
  let customerAId = '';

  beforeAll(async () => {
    // Register independent tenant users
    const resA = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tenant A', email: `tenant_a_${Date.now()}@test.com`, password: 'password123' }),
    });
    tokenA = (await resA.json()).token;
    // ...
  });

  it('Tenant A creates a private customer', async () => {
    // Create record as Tenant A
  });

  it('Tenant B receives 404 when querying Tenant A customer ID', async () => {
    // Assert 404 response when Tenant B attempts unauthorized access
  });
});
```

**Patterns:**
- Suite setup: `beforeAll()` registers dynamic test users using timestamped emails to prevent collision (`test_${Date.now()}@example.com`).
- Teardown: In-memory or temporary DB cleanup.
- Assertions: Direct validation of HTTP status codes (`expect(res.status).toBe(201)`) and response payload structure (`expect(body).toHaveProperty('token')`).

## Mocking

**Framework:**
- Vitest `vi` mock utilities available; minimal mocking is currently used in the test suite.

**What to Mock:**
- External third-party HTTP requests (e.g., QR server generator API).
- SpeechRecognition and Web SpeechSynthesis browser APIs in headless environments.

**What NOT to Mock:**
- Database operations: Prefer SQLite in-memory or test databases to verify actual SQL migrations and foreign keys.
- Authentication JWT signing and bcrypt verification: Test the real cryptographic routines to guarantee security correctness.

## Fixtures and Factories

**Test Data:**
- Factory approach using inline objects and timestamps (`tenant_a_${Date.now()}@test.com`, random customer phone numbers).
- Pre-seeded datasets defined in `src/db/db.ts` (`DEFAULT_SETTINGS`, `SEED_CUSTOMERS`, `SEED_INVENTORY`) used for client initial state.

**Location:**
- Predefined mock items: `src/db/db.ts`.
- Test-specific mock data: Defined inline within test files (`tests/integration/api.test.ts`, `tests/security/tenant-isolation.test.ts`).

## Coverage

**Requirements:**
- No strict minimum coverage threshold enforced in CI.

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests (`tests/unit/domain.test.ts`):**
- Scope: Pure functions, balance calculations, currency calculations, input normalization.
- Execution: Instant (~5ms), no external server or database required.

**Integration Tests (`tests/integration/api.test.ts`):**
- Scope: End-to-end API route testing (registration, token authentication, customer CRUD).
- Current Requirement: Requires the backend server to be running on `http://localhost:5000` prior to running Vitest.

**Security Tests (`tests/security/tenant-isolation.test.ts`):**
- Scope: Verifies that Tenant B cannot read or modify Tenant A's customer records, even with a valid JWT token.

**E2E Tests (`tests/e2e/auth-flow.spec.ts`):**
- Scope: Playwright browser test checking login flow, title rendering, and local storage token cleanup on logout.

## Common Patterns

**Async Testing:**
```typescript
it('allows authenticated requests to /customers', async () => {
  const res = await fetch(`${BASE_URL}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  expect(res.status).toBe(200);
  expect(Array.isArray(body.data)).toBe(true);
});
```

**Error Testing:**
```typescript
it('rejects invalid amounts', () => {
  expect(() => calculateCustomerBalance(100, { type: 'CREDIT', amount: -20 })).toThrow();
  expect(() => calculateCustomerBalance(100, { type: 'CREDIT', amount: 0 })).toThrow();
});
```

---

*Testing analysis: 2026-11-06*
