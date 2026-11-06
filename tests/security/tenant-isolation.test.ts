import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../server/index';

describe('Security Test: Multi-Tenant Isolation', () => {
  let tokenA = '';
  let tokenB = '';
  let customerAId = '';

  beforeAll(async () => {
    const resA = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Tenant A', email: `tenant_a_${Date.now()}@test.com`, password: 'password123' });
    tokenA = resA.body.token;

    const resB = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Tenant B', email: `tenant_b_${Date.now()}@test.com`, password: 'password123' });
    tokenB = resB.body.token;
  });

  it('Tenant A creates a private customer', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Classified Account', phone: '9999999999' });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('id');
    customerAId = res.body.data.id;
  });

  it('Tenant B receives 404 when querying Tenant A customer ID', async () => {
    const res = await request(app)
      .get(`/api/customers/${customerAId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });
});
