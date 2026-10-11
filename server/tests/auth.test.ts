import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';

beforeAll(async () => {
  // Ensure test database connection
  await pool.query('SELECT 1');
});

afterAll(async () => {
  await pool.end();
});

describe('Authentication & Authorization Tests', () => {
  it('should successfully log in as Customer using demo credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@eventflow.dev', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('Customer');
  });

  it('should successfully log in as Admin using demo credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@eventflow.dev', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('Admin');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'customer@eventflow.dev', password: 'WrongPassword' });

    expect(res.status).toBe(401);
  });

  it('should register a new customer', async () => {
    const testEmail = `newcustomer_${Date.now()}@test.dev`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Tester',
        email: testEmail,
        password: 'Password123!',
        role: 'Customer',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(testEmail);
  });

  it('should disallow public registration with Admin role', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'hacker@test.dev',
        password: 'Password123!',
        role: 'Admin',
      });

    expect(res.status).toBe(400);
  });
});
