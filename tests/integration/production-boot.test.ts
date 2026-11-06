import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import app from '../../server/index';
import { getJwtSecret } from '../../server/middleware/auth';

describe('Integration Test: Production Configuration & Cloud Deployment', () => {
  it('validates render.yaml secret auto-provisioning and production env vars', () => {
    const renderYamlPath = path.resolve(__dirname, '../../render.yaml');
    expect(fs.existsSync(renderYamlPath)).toBe(true);

    const content = fs.readFileSync(renderYamlPath, 'utf8');

    // Verify key production environment variables
    expect(content).toContain('key: NODE_ENV');
    expect(content).toContain('value: production');

    // Verify SEC-01 auto-generated secrets
    expect(content).toContain('key: ADMIN_SECRET');
    expect(content).toContain('key: JWT_SECRET');

    // Verify generateValue: true is attached to JWT_SECRET
    const jwtSecretBlock = content.slice(content.indexOf('key: JWT_SECRET'));
    expect(jwtSecretBlock).toMatch(/key:\s*JWT_SECRET[\r\n\s]+generateValue:\s*true/);
  });

  it('enforces JWT_SECRET fatal guard when NODE_ENV is production and secret is unset', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => getJwtSecret()).toThrow(/FATAL: JWT_SECRET environment variable is unset/);

      // Verify that when secret is present, it returns correctly
      process.env.JWT_SECRET = 'a-secure-production-secret-value-12345';
      expect(getJwtSecret()).toBe('a-secure-production-secret-value-12345');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret !== undefined) {
        process.env.JWT_SECRET = originalSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    }
  });

  it('serves /api/health with status 200 and json content-type', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.status).toBe('healthy');
  });

  it('serves static PWA index.html or dashboard at root /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  it('returns 404 for unknown /api routes without falling back to SPA html', async () => {
    const res = await request(app).get('/api/unknown-endpoint-test-404');
    expect(res.status).toBe(404);
  });
});
