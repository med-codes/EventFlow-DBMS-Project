import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

router.use(authenticate, requireRole('Admin'));

// List all events with approval status
router.get('/events', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT 
        e.event_id,
        e.title,
        e.description,
        e.approval_status,
        e.rejection_reason,
        e.created_at,
        c.category_name,
        u.name AS organizer_name,
        u.email AS organizer_email,
        admin.name AS reviewed_by_name
       FROM event e
       JOIN event_category c ON c.category_id = e.category_id
       JOIN app_user u ON u.user_id = e.organizer_id
       LEFT JOIN app_user admin ON admin.user_id = e.reviewed_by
       ORDER BY e.created_at DESC`
    );

    res.json({ events: result.rows });
  } catch (error) {
    next(error);
  }
});

// Review event: Approve or Reject
const reviewEventSchema = z.object({
  approval_status: z.enum(['Approved', 'Rejected']),
  rejection_reason: z.string().optional(),
});

router.patch('/events/:id/review', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const adminId = req.user!.userId;
    const { approval_status, rejection_reason } = reviewEventSchema.parse(req.body);

    const result = await query(
      `UPDATE event
       SET approval_status = $1, reviewed_by = $2, rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = $4
       RETURNING event_id, title, approval_status, reviewed_by, rejection_reason, updated_at`,
      [approval_status, adminId, rejection_reason || null, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json({
      message: `Event ${approval_status.toLowerCase()} successfully`,
      event: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Manage user accounts (safely excludes password hashes)
router.get('/users', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT user_id, name, email, phone, role, account_status, created_at
       FROM app_user
       ORDER BY user_id ASC`
    );
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

// Toggle user account status (Active / Inactive)
router.patch('/users/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { account_status } = z.object({ account_status: z.enum(['Active', 'Inactive']) }).parse(req.body);

    // Prevent admin from deactivating themselves
    if (targetUserId === req.user!.userId && account_status === 'Inactive') {
      return res.status(400).json({ message: 'Cannot deactivate your own administrator account' });
    }

    const result = await query(
      `UPDATE app_user
       SET account_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2
       RETURNING user_id, name, email, role, account_status`,
      [account_status, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `Account status updated to ${account_status}`,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Create new event category
router.post('/categories', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category_name, description } = z.object({
      category_name: z.string().min(2),
      description: z.string().optional(),
    }).parse(req.body);

    const result = await query(
      `INSERT INTO event_category (category_name, description)
       VALUES ($1, $2)
       RETURNING category_id, category_name, description`,
      [category_name, description || null]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0],
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Category already exists' });
    }
    next(error);
  }
});

// Admin system-wide metrics and SQL aggregations
router.get('/analytics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userStats = await query(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN role = 'Customer' THEN 1 END) AS total_customers,
        COUNT(CASE WHEN role = 'Organizer' THEN 1 END) AS total_organizers,
        COUNT(CASE WHEN role = 'Admin' THEN 1 END) AS total_admins
      FROM app_user
    `);

    const bookingStats = await query(`
      SELECT 
        COUNT(*) AS total_bookings,
        COUNT(CASE WHEN booking_status = 'Confirmed' THEN 1 END) AS confirmed_bookings,
        COUNT(CASE WHEN booking_status = 'Cancelled' THEN 1 END) AS cancelled_bookings,
        COALESCE(SUM(CASE WHEN booking_status = 'Confirmed' THEN total_amount ELSE 0 END), 0) AS total_revenue
      FROM booking
    `);

    const ticketStats = await query(`
      SELECT 
        COUNT(*) AS total_tickets,
        COUNT(CASE WHEN ticket_status = 'Valid' THEN 1 END) AS valid_tickets,
        COUNT(CASE WHEN ticket_status = 'Used' THEN 1 END) AS used_tickets,
        COUNT(CASE WHEN ticket_status = 'Cancelled' THEN 1 END) AS cancelled_tickets
      FROM ticket
    `);

    const eventStats = await query(`
      SELECT 
        COUNT(*) AS total_events,
        COUNT(CASE WHEN approval_status = 'Approved' THEN 1 END) AS approved_events,
        COUNT(CASE WHEN approval_status = 'Pending' THEN 1 END) AS pending_events,
        COUNT(CASE WHEN approval_status = 'Rejected' THEN 1 END) AS rejected_events
      FROM event
    `);

    res.json({
      users: userStats.rows[0],
      bookings: bookingStats.rows[0],
      tickets: ticketStats.rows[0],
      events: eventStats.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
