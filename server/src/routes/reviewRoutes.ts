import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';
import { reviewSchema } from '../validators/schemas';

const router = Router();

// Submit review for an event (enforces eligibility rule)
router.post('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const { event_id, rating, review_text } = reviewSchema.parse(req.body);

    // Verify eligibility in query before DB trigger
    const eligibilityCheck = await query(
      `SELECT COUNT(*) AS count
       FROM booking b
       JOIN event_schedule s ON s.schedule_id = b.schedule_id
       WHERE b.user_id = $1 AND s.event_id = $2 AND b.booking_status = 'Confirmed'`,
      [userId, event_id]
    );

    if (parseInt(eligibilityCheck.rows[0].count, 10) === 0) {
      return res.status(403).json({
        message: 'Eligibility requirement: You can only review events you have a confirmed booking for.',
      });
    }

    const insertRes = await query(
      `INSERT INTO review (user_id, event_id, rating, review_text, review_date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING review_id, user_id, event_id, rating, review_text, review_date`,
      [userId, event_id, rating, review_text || null]
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      review: insertRes.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'You have already submitted a review for this event' });
    }
    if (error.message.includes('Customer must have a confirmed booking')) {
      return res.status(403).json({ message: error.message });
    }
    next(error);
  }
});

// Get reviews for an event
router.get('/event/:id', async (req, res, next) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    const result = await query(
      `SELECT 
        r.review_id,
        r.rating,
        r.review_text,
        r.review_date,
        u.name AS customer_name
       FROM review r
       JOIN app_user u ON u.user_id = r.user_id
       WHERE r.event_id = $1
       ORDER BY r.review_date DESC`,
      [eventId]
    );

    res.json({ reviews: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
