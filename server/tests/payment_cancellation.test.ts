import request from 'supertest';
import { app } from '../src/app';
import { pool } from '../src/db/pool';

let customerToken: string;
let createdBookingId: number;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'customer@eventflow.dev', password: 'Password123!' });
  customerToken = loginRes.body.token;

  // Create a new booking for Schedule 2, Seat 4 (E-4), Category 4 ($100.00)
  const bookRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({
      schedule_id: 2,
      seats: [{ seat_id: 4, ticket_category_id: 4 }],
    });
  createdBookingId = bookRes.body.booking.bookingId;
});

afterAll(async () => {
  await pool.end();
});

describe('Payment, Ticket Issuance, and Cancellation Tests', () => {
  it('should handle failed payment simulation without issuing tickets', async () => {
    const payRes = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: createdBookingId,
        payment_method: 'Simulated Card',
        simulation_outcome: 'Failed',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(false);
    expect(payRes.body.tickets.length).toBe(0);
  });

  it('should successfully confirm booking and issue tickets upon successful payment', async () => {
    const payRes = await request(app)
      .post('/api/payments/process')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: createdBookingId,
        payment_method: 'Simulated UPI',
        simulation_outcome: 'Successful',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.success).toBe(true);
    expect(payRes.body.tickets.length).toBe(1);
    expect(payRes.body.tickets[0].ticket_status).toBe('Valid');
  });

  it('should process whole-booking cancellation with 80% refund policy', async () => {
    const cancelRes = await request(app)
      .post('/api/cancellations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        booking_id: createdBookingId,
        reason: 'Change of plans for test scenario',
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.cancellation).toHaveProperty('refund_amount');
    // $100 * 80% = $80.00
    expect(parseFloat(cancelRes.body.cancellation.refund_amount)).toBe(80.00);
  });

  it('should reject review submission for an event the customer never booked', async () => {
    // Event 3 (Midnight Hamlet) - Customer 4 has no bookings for it
    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        event_id: 3,
        rating: 5,
        review_text: 'I did not attend this event',
      });

    expect(reviewRes.status).toBe(403);
  });
});
