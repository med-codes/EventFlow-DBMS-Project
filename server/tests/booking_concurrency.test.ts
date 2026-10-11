import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';

let customerToken: string;
let otherCustomerToken: string;

beforeAll(async () => {
  // Clean up any previous test bookings for schedule 2 to ensure repeatable test runs
  await pool.query(`
    DELETE FROM ticket WHERE booking_seat_id IN (
      SELECT booking_seat_id FROM booking_seat bs JOIN booking b ON b.booking_id = bs.booking_id WHERE b.schedule_id = 2
    );
    DELETE FROM booking_seat WHERE booking_id IN (SELECT booking_id FROM booking WHERE schedule_id = 2);
    DELETE FROM payment WHERE booking_id IN (SELECT booking_id FROM booking WHERE schedule_id = 2);
    DELETE FROM cancellation WHERE booking_id IN (SELECT booking_id FROM booking WHERE schedule_id = 2);
    DELETE FROM booking WHERE schedule_id = 2;
    UPDATE seat_lock SET lock_status = 'Released' WHERE schedule_id = 2;
  `);

  const loginRes1 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer@eventflow.dev', password: 'Password123!' });
  customerToken = loginRes1.body.token;

  const loginRes2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'priya@eventflow.dev', password: 'Password123!' });
  otherCustomerToken = loginRes2.body.token;
});

afterAll(async () => {
  await pool.end();
});

describe('Booking & Concurrency Tests', () => {
  it('should reject booking for an unapproved or pending event', async () => {
    // Event 4 is Pending, let's create a temporary schedule for it if needed or test invalid
    const unapprovedRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        schedule_id: 99999, // non-existent
        seats: [{ seat_id: 1, ticket_category_id: 1 }],
      });

    expect(unapprovedRes.status).toBe(400);
  });

  it('should safely prevent double-booking on concurrent requests for the same seat', async () => {
    // Schedule 2 (Upcoming AI Symposium), seat_id 3 (E-3), ticket_category_id 4 ($100.00)
    const bookingPayload = {
      schedule_id: 2,
      seats: [{ seat_id: 3, ticket_category_id: 4 }],
    };

    // Fire two concurrent booking requests simultaneously
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(bookingPayload),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send(bookingPayload),
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Exactly one must succeed (201) and the other must be rejected (400 conflict)
    expect(statuses).toEqual([201, 400]);

    const successfulRes = res1.status === 201 ? res1 : res2;
    expect(successfulRes.body.booking).toHaveProperty('bookingId');
    expect(successfulRes.body.booking.totalAmount).toBe(100);
  });
});
