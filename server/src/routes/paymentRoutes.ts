import { Router, Response, NextFunction } from 'express';
import { withTransaction } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { paymentSchema } from '../validators/schemas';

const router = Router();

// Process simulated payment attempt
router.post('/process', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { booking_id, payment_method, simulation_outcome } = paymentSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      // 1. Fetch booking with row-level lock
      const bookingRes = await client.query(
        `SELECT booking_id, user_id, schedule_id, total_amount, booking_status
         FROM booking
         WHERE booking_id = $1
         FOR UPDATE`,
        [booking_id]
      );

      if (bookingRes.rows.length === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingRes.rows[0];

      if (booking.user_id !== userId) {
        throw new Error('You do not have permission to pay for this booking');
      }

      if (booking.booking_status === 'Confirmed') {
        throw new Error('This booking is already paid and confirmed');
      }

      if (booking.booking_status === 'Cancelled') {
        throw new Error('Cannot process payment for a cancelled booking');
      }

      const txnRef = `SIM-TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. Handle Failed Simulation outcome (supports retry later)
      if (simulation_outcome === 'Failed') {
        const paymentRes = await client.query(
          `INSERT INTO payment (booking_id, amount, payment_method, transaction_reference, payment_date, payment_status)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Failed')
           RETURNING payment_id, booking_id, amount, payment_method, transaction_reference, payment_status, payment_date`,
          [booking_id, booking.total_amount, payment_method, txnRef]
        );

        return {
          success: false,
          message: 'Payment simulation failed as requested. You may retry payment.',
          payment: paymentRes.rows[0],
          tickets: [],
        };
      }

      // 3. Handle Successful Simulation outcome
      const paymentRes = await client.query(
        `INSERT INTO payment (booking_id, amount, payment_method, transaction_reference, payment_date, payment_status)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Successful')
         RETURNING payment_id, booking_id, amount, payment_method, transaction_reference, payment_status, payment_date`,
        [booking_id, booking.total_amount, payment_method, txnRef]
      );

      // Confirm booking
      await client.query(
        `UPDATE booking SET booking_status = 'Confirmed', updated_at = CURRENT_TIMESTAMP WHERE booking_id = $1`,
        [booking_id]
      );

      // 4. Generate unique tickets for each booking_seat
      const seatsRes = await client.query(
        `SELECT booking_seat_id, seat_id FROM booking_seat WHERE booking_id = $1`,
        [booking_id]
      );

      const issuedTickets = [];
      for (const seat of seatsRes.rows) {
        const ticketCode = `EF-${booking_id}-${seat.seat_id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const ticketInsert = await client.query(
          `INSERT INTO ticket (booking_seat_id, ticket_code, ticket_status, generated_at)
           VALUES ($1, $2, 'Valid', CURRENT_TIMESTAMP)
           RETURNING ticket_id, booking_seat_id, ticket_code, ticket_status, generated_at`,
          [seat.booking_seat_id, ticketCode]
        );

        issuedTickets.push(ticketInsert.rows[0]);
      }

      // 5. Create in-app notification
      await client.query(
        `INSERT INTO notification (user_id, title, message, type)
         VALUES ($1, 'Booking Confirmed!', 'Payment was successful and your tickets have been generated.', 'BookingConfirmation')`,
        [userId]
      );

      return {
        success: true,
        message: 'Payment simulated successfully. Booking confirmed and tickets issued.',
        payment: paymentRes.rows[0],
        tickets: issuedTickets,
      };
    });

    res.json(result);
  } catch (error: any) {
    if (
      error.message.includes('already paid') ||
      error.message.includes('cancelled booking') ||
      error.message.includes('permission')
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

export default router;
