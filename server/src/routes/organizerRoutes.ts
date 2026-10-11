import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { createEventSchema, createScheduleSchema, createTicketCategorySchema } from '../validators/schemas';

const router = Router();

router.use(authenticate, requireRole('Organizer'));

// List all venues for schedule creation
router.get('/venues', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query('SELECT venue_id, venue_name, address, capacity FROM venue ORDER BY venue_name');
    res.json({ venues: result.rows });
  } catch (error) {
    next(error);
  }
});

// List organizer's own events
router.get('/events', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizerId = req.user!.userId;

    const result = await query(
      `SELECT 
        e.event_id,
        e.title,
        e.description,
        e.approval_status,
        e.rejection_reason,
        e.created_at,
        c.category_name,
        c.category_id,
        COUNT(s.schedule_id) AS schedules_count
       FROM event e
       JOIN event_category c ON c.category_id = e.category_id
       LEFT JOIN event_schedule s ON s.event_id = e.event_id
       WHERE e.organizer_id = $1
       GROUP BY e.event_id, e.title, e.description, e.approval_status, e.rejection_reason, e.created_at, c.category_name, c.category_id
       ORDER BY e.created_at DESC`,
      [organizerId]
    );

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create new event (starts in Pending status awaiting admin review)
router.post('/events', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizerId = req.user!.userId;
    const { category_id, title, description } = createEventSchema.parse(req.body);

    const result = await query(
      `INSERT INTO event (organizer_id, category_id, title, description, approval_status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING event_id, organizer_id, category_id, title, description, approval_status, created_at`,
      [organizerId, category_id, title, description || null]
    );

    res.status(201).json({
      message: 'Event created and submitted for admin approval',
      event: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Update event details (Organizer can only update their own event; resubmission supported)
router.put('/events/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const organizerId = req.user!.userId;
    const { category_id, title, description } = createEventSchema.parse(req.body);

    // Verify ownership
    const check = await query('SELECT organizer_id, approval_status FROM event WHERE event_id = $1', [eventId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (check.rows[0].organizer_id !== organizerId) {
      return res.status(403).json({ message: 'Forbidden: You cannot edit events belonging to another organizer' });
    }

    // If event was Rejected, updating it resets approval_status to 'Pending' for resubmission
    const newStatus = check.rows[0].approval_status === 'Rejected' ? 'Pending' : check.rows[0].approval_status;

    const result = await query(
      `UPDATE event
       SET category_id = $1, title = $2, description = $3, approval_status = $4, rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $5 AND organizer_id = $6
       RETURNING event_id, title, description, approval_status, updated_at`,
      [category_id, title, description || null, newStatus, eventId, organizerId]
    );

    res.json({
      message: newStatus === 'Pending' ? 'Event updated and resubmitted for admin review' : 'Event updated successfully',
      event: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Add schedule to an event
router.post('/events/:id/schedules', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const organizerId = req.user!.userId;
    const { venue_id, start_datetime, end_datetime } = createScheduleSchema.parse(req.body);

    // Verify ownership
    const eventCheck = await query('SELECT organizer_id FROM event WHERE event_id = $1', [eventId]);
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (eventCheck.rows[0].organizer_id !== organizerId) {
      return res.status(403).json({ message: 'Cannot add schedules to another organizer event' });
    }

    const result = await query(
      `INSERT INTO event_schedule (event_id, venue_id, start_datetime, end_datetime, schedule_status)
       VALUES ($1, $2, $3, $4, 'Scheduled')
       RETURNING schedule_id, event_id, venue_id, start_datetime, end_datetime, schedule_status`,
      [eventId, venue_id, start_datetime, end_datetime]
    );

    res.status(201).json({
      message: 'Schedule added successfully',
      schedule: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23P01') {
      return res.status(409).json({ message: 'Venue schedule conflict: Another event is already booked at this venue during this time' });
    }
    next(error);
  }
});

// Add ticket category to a schedule
router.post('/schedules/:id/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const scheduleId = parseInt(req.params.id, 10);
    const organizerId = req.user!.userId;
    const { category_name, price } = createTicketCategorySchema.parse(req.body);

    // Verify schedule belongs to an event owned by this organizer
    const check = await query(
      `SELECT e.organizer_id 
       FROM event_schedule s 
       JOIN event e ON e.event_id = s.event_id 
       WHERE s.schedule_id = $1`,
      [scheduleId]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Schedule not found' });
    }
    if (check.rows[0].organizer_id !== organizerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const result = await query(
      `INSERT INTO ticket_category (schedule_id, category_name, price)
       VALUES ($1, $2, $3)
       RETURNING ticket_category_id, schedule_id, category_name, price`,
      [scheduleId, category_name, price]
    );

    res.status(201).json({
      message: 'Ticket category added successfully',
      ticketCategory: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'A ticket category with this name already exists for this schedule' });
    }
    next(error);
  }
});

// Organizer revenue and sales analytics from view
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizerId = req.user!.userId;
    const result = await query('SELECT * FROM vw_organizer_revenue_report WHERE organizer_id = $1', [organizerId]);
    res.json({ analytics: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
