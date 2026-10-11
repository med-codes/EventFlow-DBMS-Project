import { Router, Response, NextFunction } from 'express';
import { query, withTransaction } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createBookingSchema } from '../validators/schemas';

const router = Router();

// Create booking order from selected seats and ticket categories
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { schedule_id, seats } = createBookingSchema.parse(req.body);

    const bookingResult = await withTransaction(async (client) => {
      // 1. Verify schedule and event approval status
      const scheduleRes = await client.query(
        `SELECT s.schedule_id, s.venue_id, s.schedule_status, e.approval_status
         FROM event_schedule s
         JOIN event e ON e.event_id = s.event_id
         WHERE s.schedule_id = $1`,
        [schedule_id]
      );

      if (scheduleRes.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const schedule = scheduleRes.rows[0];
      if (schedule.approval_status !== 'Approved') {
        throw new Error('Cannot book tickets for an unapproved event');
      }
      if (schedule.schedule_status !== 'Scheduled') {
        throw new Error(`Cannot book tickets for a schedule in status ${schedule.schedule_status}`);
      }

      const seatIds = seats.map(s => s.seat_id);

      // 2. Concurrency Control: Lock the seat rows for update
      const seatRows = await client.query(
        `SELECT s.seat_id, s.seat_number, sec.venue_id
         FROM seat s
         JOIN section sec ON sec.section_id = s.section_id
         WHERE s.seat_id = ANY($1)
         FOR UPDATE`,
        [seatIds]
      );

      if (seatRows.rows.length !== seatIds.length) {
        throw new Error('One or more selected seats do not exist');
      }

      // Verify all seats belong to the schedule's venue
      for (const row of seatRows.rows) {
        if (row.venue_id !== schedule.venue_id) {
          throw new Error(`Seat ${row.seat_number} does not belong to the venue of this schedule`);
        }
      }

      // 3. Double-booking check: Ensure seats are not already in a Confirmed or Pending booking
      const conflictCheck = await client.query(
        `SELECT bs.seat_id, st.seat_number
         FROM booking_seat bs
         JOIN booking b ON b.booking_id = bs.booking_id
         JOIN seat st ON st.seat_id = bs.seat_id
         WHERE bs.seat_id = ANY($1)
           AND b.schedule_id = $2
           AND b.booking_status IN ('Confirmed', 'Pending')`,
        [seatIds, schedule_id]
      );

      if (conflictCheck.rows.length > 0) {
        throw new Error(`Seat ${conflictCheck.rows[0].seat_number} is already booked or being processed`);
      }

      // 4. Calculate total amount strictly from server-side database prices
      let totalAmount = 0;
      const seatDetails: Array<{ seat_id: number; ticket_category_id: number; price: number }> = [];

      for (const item of seats) {
        const catRes = await client.query(
          `SELECT ticket_category_id, price, schedule_id
           FROM ticket_category
           WHERE ticket_category_id = $1`,
          [item.ticket_category_id]
        );

        if (catRes.rows.length === 0) {
          throw new Error(`Ticket category ${item.ticket_category_id} not found`);
        }

        const category = catRes.rows[0];
        if (category.schedule_id !== schedule_id) {
          throw new Error('Ticket category does not match this schedule');
        }

        const price = parseFloat(category.price);
        totalAmount += price;
        seatDetails.push({
          seat_id: item.seat_id,
          ticket_category_id: item.ticket_category_id,
          price,
        });
      }

      // 5. Create booking record with Pending status
      const bookingInsert = await client.query(
        `INSERT INTO booking (user_id, schedule_id, booking_date, total_amount, booking_status)
         VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'Pending')
         RETURNING booking_id, user_id, schedule_id, booking_date, total_amount, booking_status`,
        [userId, schedule_id, totalAmount]
      );

      const newBooking = bookingInsert.rows[0];

      // 6. Insert booking_seat items
      for (const detail of seatDetails) {
        await client.query(
          `INSERT INTO booking_seat (booking_id, seat_id, ticket_category_id, price)
           VALUES ($1, $2, $3, $4)`,
          [newBooking.booking_id, detail.seat_id, detail.ticket_category_id, detail.price]
        );
      }

      // 7. Mark active seat locks for this user as Converted
      await client.query(
        `UPDATE seat_lock
         SET lock_status = 'Converted'
         WHERE user_id = $1 AND schedule_id = $2 AND seat_id = ANY($3) AND lock_status = 'Active'`,
        [userId, schedule_id, seatIds]
      );

      return {
        bookingId: newBooking.booking_id,
        scheduleId: newBooking.schedule_id,
        totalAmount: parseFloat(newBooking.total_amount),
        bookingStatus: newBooking.booking_status,
        bookingDate: newBooking.booking_date,
        seatsCount: seatDetails.length,
      };
    });

    res.status(201).json({
      message: 'Booking created successfully. Please complete payment to confirm.',
      booking: bookingResult,
    });
  } catch (error: any) {
    if (
      error.message.includes('already booked') ||
      error.message.includes('unapproved') ||
      error.message.includes('does not belong') ||
      error.message.includes('not found') ||
      error.message.includes('status') ||
      error.message.includes('Schedule')
    ) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// Get authenticated customer's booking history
router.get('/my-bookings', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT 
        b.booking_id,
        b.schedule_id,
        b.booking_date,
        b.total_amount,
        b.booking_status,
        e.title AS event_title,
        e.event_id,
        s.start_datetime,
        s.end_datetime,
        v.venue_name,
        v.address AS venue_address,
        p.payment_status,
        p.transaction_reference,
        cn.cancellation_id,
        cn.refund_amount,
        cn.cancelled_at,
        COUNT(bs.booking_seat_id) AS total_seats
       FROM booking b
       JOIN event_schedule s ON s.schedule_id = b.schedule_id
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       LEFT JOIN booking_seat bs ON bs.booking_id = b.booking_id
       LEFT JOIN payment p ON p.booking_id = b.booking_id AND p.payment_status = 'Successful'
       LEFT JOIN cancellation cn ON cn.booking_id = b.booking_id
       WHERE b.user_id = $1
       GROUP BY b.booking_id, b.schedule_id, b.booking_date, b.total_amount, b.booking_status,
                e.title, e.event_id, s.start_datetime, s.end_datetime, v.venue_name, v.address,
                p.payment_status, p.transaction_reference, cn.cancellation_id, cn.refund_amount, cn.cancelled_at
       ORDER BY b.booking_date DESC`,
      [userId]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single booking by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const role = req.user!.role;

    const bookingRes = await query(
      `SELECT 
        b.booking_id,
        b.user_id,
        b.schedule_id,
        b.booking_date,
        b.total_amount,
        b.booking_status,
        e.title AS event_title,
        e.event_id,
        s.start_datetime,
        s.end_datetime,
        v.venue_name,
        v.address AS venue_address,
        u.name AS customer_name,
        u.email AS customer_email
       FROM booking b
       JOIN app_user u ON u.user_id = b.user_id
       JOIN event_schedule s ON s.schedule_id = b.schedule_id
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       WHERE b.booking_id = $1`,
      [bookingId]
    );

    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingRes.rows[0];

    // Check ownership unless Admin
    if (role !== 'Admin' && booking.user_id !== userId) {
      return res.status(403).json({ message: 'Access denied to this booking' });
    }

    // Fetch booked seats and tickets
    const seatsRes = await query(
      `SELECT 
        bs.booking_seat_id,
        bs.seat_id,
        bs.price,
        st.seat_number,
        sec.section_name,
        tc.category_name,
        t.ticket_id,
        t.ticket_code,
        t.ticket_status
       FROM booking_seat bs
       JOIN seat st ON st.seat_id = bs.seat_id
       JOIN section sec ON sec.section_id = st.section_id
       JOIN ticket_category tc ON tc.ticket_category_id = bs.ticket_category_id
       LEFT JOIN ticket t ON t.booking_seat_id = bs.booking_seat_id
       WHERE bs.booking_id = $1`,
      [bookingId]
    );

    // Fetch payment records
    const paymentsRes = await query(
      `SELECT payment_id, amount, payment_method, transaction_reference, payment_date, payment_status
       FROM payment
       WHERE booking_id = $1
       ORDER BY payment_date DESC`,
      [bookingId]
    );

    res.json({
      booking,
      seats: seatsRes.rows,
      payments: paymentsRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
