import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Join waitlist for a schedule
router.post('/join', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const scheduleId = parseInt(req.body.schedule_id, 10);

    if (!scheduleId || isNaN(scheduleId)) {
      return res.status(400).json({ message: 'Valid schedule_id is required' });
    }

    // Verify schedule exists
    const scheduleRes = await query('SELECT schedule_id FROM event_schedule WHERE schedule_id = $1', [scheduleId]);
    if (scheduleRes.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }

    // Compute next queue position
    const posRes = await query(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_pos
       FROM waitlist
       WHERE schedule_id = $1`,
      [scheduleId]
    );

    const position = posRes.rows[0].next_pos;

    const insertRes = await query(
      `INSERT INTO waitlist (user_id, schedule_id, joined_at, position, waitlist_status)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'Waiting')
       RETURNING waitlist_id, user_id, schedule_id, joined_at, position, waitlist_status`,
      [userId, scheduleId, position]
    );

    res.status(201).json({
      message: `Joined waitlist at position #${position}`,
      waitlist: insertRes.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'You are already in the waitlist for this schedule' });
    }
    next(error);
  }
});

// Get user's waitlist entries
router.get('/my-waitlist', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT 
        w.waitlist_id,
        w.schedule_id,
        w.joined_at,
        w.position,
        w.waitlist_status,
        e.title AS event_title,
        s.start_datetime,
        s.end_datetime,
        v.venue_name
       FROM waitlist w
       JOIN event_schedule s ON s.schedule_id = w.schedule_id
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       WHERE w.user_id = $1
       ORDER BY w.joined_at DESC`,
      [userId]
    );

    res.json({ waitlist: result.rows });
  } catch (error) {
    next(error);
  }
});

// Leave waitlist
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const waitlistId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    const result = await query(
      `UPDATE waitlist
       SET waitlist_status = 'Cancelled'
       WHERE waitlist_id = $1 AND user_id = $2
       RETURNING waitlist_id`,
      [waitlistId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Waitlist entry not found' });
    }

    res.json({ message: 'Removed from waitlist' });
  } catch (error) {
    next(error);
  }
});

export default router;
