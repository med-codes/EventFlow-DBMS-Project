import { Router, Response, NextFunction } from 'express';
import { withTransaction } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { cancellationSchema } from '../validators/schemas';

const router = Router();
const REFUND_PERCENTAGE = parseInt(process.env.CANCELLATION_REFUND_PERCENTAGE || '80', 10);

// Request whole-booking cancellation with simulated refund
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { booking_id, reason } = cancellationSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      // 1. Fetch booking with lock
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
        throw new Error('You do not have permission to cancel this booking');
      }

      if (booking.booking_status === 'Cancelled') {
        throw new Error('This booking is already cancelled');
      }

      // Check if cancellation already exists
      const existingCancel = await client.query(
        `SELECT cancellation_id FROM cancellation WHERE booking_id = $1`,
        [booking_id]
      );

      if (existingCancel.rows.length > 0) {
        throw new Error('A cancellation has already been processed for this booking');
      }

      // Calculate refund according to documented policy
      const totalAmount = parseFloat(booking.total_amount);
      const refundAmount = booking.booking_status === 'Confirmed' 
        ? Math.round(totalAmount * (REFUND_PERCENTAGE / 100) * 100) / 100 
        : 0;

      // 2. Insert cancellation record
      const cancelInsert = await client.query(
        `INSERT INTO cancellation (booking_id, cancelled_at, reason, refund_amount, cancellation_status)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3, 'Processed')
         RETURNING cancellation_id, booking_id, cancelled_at, reason, refund_amount, cancellation_status`,
        [booking_id, reason, refundAmount]
      );

      // Update booking and tickets status to 'Cancelled'
      await client.query(
        `UPDATE booking SET booking_status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE booking_id = $1`,
        [booking_id]
      );
      await client.query(
        `UPDATE ticket SET ticket_status = 'Cancelled' WHERE booking_seat_id IN (
           SELECT booking_seat_id FROM booking_seat WHERE booking_id = $1
         )`,
        [booking_id]
      );

      // 3. If booking was confirmed, record refund in payment table
      if (booking.booking_status === 'Confirmed') {
        await client.query(
          `INSERT INTO payment (booking_id, amount, payment_method, transaction_reference, payment_date, payment_status)
           VALUES ($1, $2, 'Simulated Refund', $3, CURRENT_TIMESTAMP, 'Refunded')`,
          [booking_id, refundAmount, `REFUND-${booking_id}-${Date.now()}`]
        );
      }

      // 4. Notify customer of cancellation
      await client.query(
        `INSERT INTO notification (user_id, title, message, type)
         VALUES ($1, 'Booking Cancelled', $2, 'BookingCancellation')`,
        [userId, `Booking #${booking_id} cancelled. Refund amount: $${refundAmount.toFixed(2)} (${REFUND_PERCENTAGE}% policy).`]
      );

      // 5. Promote the first person on the waitlist for this schedule
      const waitlistNext = await client.query(
        `SELECT waitlist_id, user_id
         FROM waitlist
         WHERE schedule_id = $1 AND waitlist_status = 'Waiting'
         ORDER BY position ASC
         LIMIT 1
         FOR UPDATE`,
        [booking.schedule_id]
      );

      if (waitlistNext.rows.length > 0) {
        const promoted = waitlistNext.rows[0];
        await client.query(
          `UPDATE waitlist SET waitlist_status = 'Promoted' WHERE waitlist_id = $1`,
          [promoted.waitlist_id]
        );

        await client.query(
          `INSERT INTO notification (user_id, title, message, type)
           VALUES ($1, 'Seats Opened Up!', 'A seat is now available for your waitlisted schedule. Book now!', 'WaitlistPromotion')`,
          [promoted.user_id]
        );
      }

      return cancelInsert.rows[0];
    });

    res.json({
      message: 'Booking cancelled successfully. Refund processed.',
      cancellation: result,
    });
  } catch (error: any) {
    if (
      error.message.includes('already cancelled') ||
      error.message.includes('permission') ||
      error.message.includes('already been processed')
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

export default router;
