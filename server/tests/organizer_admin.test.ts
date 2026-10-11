import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';

let organizerToken: string;
let adminToken: string;

beforeAll(async () => {
  const orgLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'organizer@eventflow.dev', password: 'Password123!' });
  organizerToken = orgLogin.body.token;

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@eventflow.dev', password: 'Password123!' });
  adminToken = adminLogin.body.token;
});

afterAll(async () => {
  await pool.end();
});

describe('Organizer and Admin Tests', () => {
  it('should prevent an organizer from modifying another organizer event', async () => {
    // Event 3 is owned by Organizer 3 (Pulse Arts Media), not Organizer 2 (Apex Entertainment)
    const updateRes = await request(app)
      .put('/api/organizer/events/3')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        category_id: 1,
        title: 'Hacked Title Attempt',
        description: 'Unauthorized update',
      });

    expect(updateRes.status).toBe(403);
  });

  it('should allow admin to review and approve an event', async () => {
    // Event 4 (NextGen Quantum Computing Summit) is in Pending status
    const reviewRes = await request(app)
      .patch('/api/admin/events/4/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approval_status: 'Approved',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.event.approval_status).toBe('Approved');
  });

  it('should allow admin to toggle user status between Active and Inactive', async () => {
    const statusRes = await request(app)
      .patch('/api/admin/users/6/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        account_status: 'Inactive',
      });

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.user.account_status).toBe('Inactive');

    // Restore to Active
    await request(app)
      .patch('/api/admin/users/6/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        account_status: 'Active',
      });
  });
});
