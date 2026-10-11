import { Router, Request, Response, NextFunction } from 'express';
import { query, withTransaction } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { lockSeatsSchema } from '../validators/schemas';

const router = Router();
const LOCK_DURATION_MINUTES = parseInt(process.env.SEAT_LOCK_DURATION_MINUTES || '10', 10);

// Get schedule details and ticket categories
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);

    const scheduleRes = await query(
      `SELECT 
        s.schedule_id,
        s.event_id,
        s.venue_id,
        s.start_datetime,
        s.end_datetime,
        s.schedule_status,
        e.title AS event_title,
        e.description AS event_description,
        v.venue_name,
        v.address AS venue_address,
        v.capacity
       FROM event_schedule s
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       WHERE s.schedule_id = $1`,
      [scheduleId]
    );

    if (scheduleRes.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const categoriesRes = await query(
      `SELECT ticket_category_id, category_name, price
       FROM ticket_category
       WHERE schedule_id = $1
       ORDER BY price DESC`,
      [scheduleId]
    );

    res.json({
      schedule: scheduleRes.rows[0],
      ticketCategories: categoriesRes.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Get interactive seating layout with real-time seat statuses
router.get('/:id/seating', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const userId = req.headers.authorization ? (req as any).user?.userId : null;

    // First, expire any stale locks in database
    await query(`SELECT fn_cleanup_expired_seat_locks()`);

    // Fetch schedule and venue info
    const scheduleRes = await query(
      `SELECT s.schedule_id, s.venue_id, v.venue_name, s.schedule_status
       FROM event_schedule s
       JOIN venue v ON v.venue_id = s.venue_id
       WHERE s.schedule_id = $1`,
      [scheduleId]
    );

    if (scheduleRes.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    const venueId = scheduleRes.rows[0].venue_id;

    // Fetch all sections and seats for this venue
    const seatsRes = await query(
      `SELECT 
        sec.section_id,
        sec.section_name,
        st.seat_id,
        st.seat_number,
        -- Check if seat is booked
        EXISTS (
          SELECT 1 FROM booking_seat bs
          JOIN booking b ON b.booking_id = bs.booking_id
          WHERE bs.seat_id = st.seat_id 
            AND b.schedule_id = $1 
            AND b.booking_status IN ('Confirmed', 'Pending')
        ) AS is_booked,
        -- Check if seat is actively locked
        sl.lock_id,
        sl.user_id AS locked_by_user_id,
        sl.expires_at AS lock_expires_at
       FROM section sec
       JOIN seat st ON st.section_id = sec.section_id
       LEFT JOIN seat_lock sl ON sl.seat_id = st.seat_id 
                             AND sl.schedule_id = $1 
                             AND sl.lock_status = 'Active' 
                             AND sl.expires_at > CURRENT_TIMESTAMP
       WHERE sec.venue_id = $2
       ORDER BY sec.section_id, st.seat_number`,
      [scheduleId, venueId]
    );

    // Map each seat to status: 'Booked' | 'Locked' | 'MyLock' | 'Available'
    const seats = seatsRes.rows.map(row => {
      let status: 'Booked' | 'Locked' | 'MyLock' | 'Available' = 'Available';
      if (row.is_booked) {
        status = 'Booked';
      } else if (row.lock_id) {
        status = (userId && row.locked_by_user_id === userId) ? 'MyLock' : 'Locked';
      }

      return {
        sectionId: row.section_id,
        sectionName: row.section_name,
        seatId: row.seat_id,
        seatNumber: row.seat_number,
        status,
        lockExpiresAt: row.lock_expires_at,
      };
    });

    res.json({
      scheduleId,
      venueId,
      venueName: scheduleRes.rows[0].venue_name,
      seats,
    });
  } catch (error) {
    next(error);
  }
});

// Acquire temporary locks on selected seats (Customer role)
router.post('/:id/locks', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;
    const { seat_ids } = lockSeatsSchema.parse({ schedule_id: scheduleId, seat_ids: req.body.seat_ids });

    // Use transaction to lock seats safely and avoid race conditions
    const result = await withTransaction(async (client) => {
      // 1. Expire past locks
      await client.query(`SELECT fn_cleanup_expired_seat_locks()`);

      // 2. Check if any requested seat is already booked
      const bookedCheck = await client.query(
        `SELECT bs.seat_id, st.seat_number
         FROM booking_seat bs
         JOIN booking b ON b.booking_id = bs.booking_id
         JOIN seat st ON st.seat_id = bs.seat_id
         WHERE bs.seat_id = ANY($1) 
           AND b.schedule_id = $2 
           AND b.booking_status IN ('Confirmed', 'Pending')`,
        [seat_ids, scheduleId]
      );

      if (bookedCheck.rows.length > 0) {
        throw new Error(`Seat ${bookedCheck.rows[0].seat_number} has already been booked`);
      }

      // 3. Check if any requested seat is currently locked by another user
      const lockCheck = await client.query(
        `SELECT sl.seat_id, st.seat_number
         FROM seat_lock sl
         JOIN seat st ON st.seat_id = sl.seat_id
         WHERE sl.seat_id = ANY($1)
           AND sl.schedule_id = $2
           AND sl.lock_status = 'Active'
           AND sl.expires_at > CURRENT_TIMESTAMP
           AND sl.user_id != $3`,
        [seat_ids, scheduleId, userId]
      );

      if (lockCheck.rows.length > 0) {
        throw new Error(`Seat ${lockCheck.rows[0].seat_number} is temporarily locked by another user`);
      }

      // 4. Release any existing locks by this user on these seats to refresh
      await client.query(
        `UPDATE seat_lock 
         SET lock_status = 'Released' 
         WHERE user_id = $1 AND schedule_id = $2 AND seat_id = ANY($3) AND lock_status = 'Active'`,
        [userId, scheduleId, seat_ids]
      );

      // 5. Insert new locks with configurable expiration
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      const insertedLocks = [];

      for (const seatId of seat_ids) {
        const ins = await client.query(
          `INSERT INTO seat_lock (user_id, seat_id, schedule_id, locked_at, expires_at, lock_status)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, 'Active')
           RETURNING lock_id, seat_id, expires_at`,
          [userId, seatId, scheduleId, expiresAt]
        );
        insertedLocks.push(ins.rows[0]);
      }

      return {
        message: `Successfully locked ${insertedLocks.length} seat(s)`,
        expiresAt,
        locks: insertedLocks,
      };
    });

    res.json(result);
  } catch (error: any) {
    if (error.message.includes('already been booked') || error.message.includes('temporarily locked')) {
      return res.status(409).json({ message: error.message });
    }
    next(error);
  }
});

// Release seat locks manually (e.g., if user cancels selection)
router.post('/:id/locks/release', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const result = await query(
      `UPDATE seat_lock 
       SET lock_status = 'Released'
       WHERE user_id = $1 AND schedule_id = $2 AND lock_status = 'Active'`,
      [userId, scheduleId]
    );

    res.json({ message: `Released ${result.rowCount} seat lock(s)` });
  } catch (error) {
    next(error);
  }
});

export default router;
