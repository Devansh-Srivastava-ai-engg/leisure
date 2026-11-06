import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/index';

describe('Integration Test: Authentication & Customer APIs', () => {
  let token = '';
  const testEmail = `test_${Date.now()}@example.com`;

  it('registers a new user and receives a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Integration User', email: testEmail, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('blocks unauthenticated requests to /customers', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });

  it('allows authenticated requests to /customers', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
