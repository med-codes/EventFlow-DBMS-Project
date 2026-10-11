import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';

const router = Router();

// Get event categories
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT category_id, category_name, description FROM event_category ORDER BY category_name');
    res.json({ categories: result.rows });
  } catch (error) {
    next(error);
  }
});

// Browse approved events with optional search and category filter
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category_id } = req.query;
    let sql = `
      SELECT 
        e.event_id,
        e.title,
        e.description,
        e.approval_status,
        c.category_id,
        c.category_name,
        u.name AS organizer_name,
        COALESCE(r.average_rating, 0.00) AS average_rating,
        COALESCE(r.total_reviews, 0) AS total_reviews,
        MIN(tc.price) AS min_price
      FROM event e
      JOIN event_category c ON c.category_id = e.category_id
      JOIN app_user u ON u.user_id = e.organizer_id
      LEFT JOIN vw_event_rating_summary r ON r.event_id = e.event_id
      LEFT JOIN event_schedule s ON s.event_id = e.event_id AND s.schedule_status = 'Scheduled'
      LEFT JOIN ticket_category tc ON tc.schedule_id = s.schedule_id
      WHERE e.approval_status = 'Approved'
    `;
    const params: any[] = [];

    if (search && typeof search === 'string') {
      params.push(`%${search.trim()}%`);
      sql += ` AND (e.title ILIKE $${params.length} OR e.description ILIKE $${params.length})`;
    }

    if (category_id) {
      params.push(parseInt(category_id as string, 10));
      sql += ` AND e.category_id = $${params.length}`;
    }

    sql += ` GROUP BY e.event_id, e.title, e.description, e.approval_status, c.category_id, c.category_name, u.name, r.average_rating, r.total_reviews ORDER BY e.created_at DESC`;

    const result = await query(sql, params);
    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single event details with schedules, ticket categories, and reviews
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.id, 10);

    const eventResult = await query(
      `SELECT 
        e.event_id,
        e.title,
        e.description,
        e.approval_status,
        e.organizer_id,
        c.category_name,
        u.name AS organizer_name,
        COALESCE(r.average_rating, 0.00) AS average_rating,
        COALESCE(r.total_reviews, 0) AS total_reviews
       FROM event e
       JOIN event_category c ON c.category_id = e.category_id
       JOIN app_user u ON u.user_id = e.organizer_id
       LEFT JOIN vw_event_rating_summary r ON r.event_id = e.event_id
       WHERE e.event_id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const event = eventResult.rows[0];

    // Fetch schedules for this event
    const schedulesResult = await query(
      `SELECT 
        s.schedule_id,
        s.venue_id,
        v.venue_name,
        v.address AS venue_address,
        v.capacity,
        s.start_datetime,
        s.end_datetime,
        s.schedule_status
       FROM event_schedule s
       JOIN venue v ON v.venue_id = s.venue_id
       WHERE s.event_id = $1
       ORDER BY s.start_datetime ASC`,
      [eventId]
    );

    // Fetch reviews for this event
    const reviewsResult = await query(
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

    res.json({
      event,
      schedules: schedulesResult.rows,
      reviews: reviewsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
