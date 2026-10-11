import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

const router = Router();

// Get customer's tickets
router.get('/my-tickets', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT 
        t.ticket_id,
        t.ticket_code,
        t.ticket_status,
        t.generated_at,
        e.event_id,
        e.title AS event_title,
        s.schedule_id,
        s.start_datetime,
        s.end_datetime,
        v.venue_name,
        v.address AS venue_address,
        sec.section_name,
        st.seat_number,
        tc.category_name AS ticket_category,
        bs.price AS ticket_price,
        b.booking_id,
        u.name AS customer_name
       FROM ticket t
       JOIN booking_seat bs ON bs.booking_seat_id = t.booking_seat_id
       JOIN booking b ON b.booking_id = bs.booking_id
       JOIN app_user u ON u.user_id = b.user_id
       JOIN event_schedule s ON s.schedule_id = b.schedule_id
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       JOIN seat st ON st.seat_id = bs.seat_id
       JOIN section sec ON sec.section_id = st.section_id
       JOIN ticket_category tc ON tc.ticket_category_id = bs.ticket_category_id
       WHERE b.user_id = $1
       ORDER BY s.start_datetime DESC, t.ticket_id ASC`,
      [userId]
    );

    res.json({ tickets: result.rows });
  } catch (error) {
    next(error);
  }
});

// Verify ticket code (scanner or validation check)
router.get('/verify/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    const result = await query(
      `SELECT 
        t.ticket_id,
        t.ticket_code,
        t.ticket_status,
        t.generated_at,
        e.title AS event_title,
        s.start_datetime,
        s.end_datetime,
        v.venue_name,
        sec.section_name,
        st.seat_number,
        u.name AS customer_name
       FROM ticket t
       JOIN booking_seat bs ON bs.booking_seat_id = t.booking_seat_id
       JOIN booking b ON b.booking_id = bs.booking_id
       JOIN app_user u ON u.user_id = b.user_id
       JOIN event_schedule s ON s.schedule_id = b.schedule_id
       JOIN event e ON e.event_id = s.event_id
       JOIN venue v ON v.venue_id = s.venue_id
       JOIN seat st ON st.seat_id = bs.seat_id
       JOIN section sec ON sec.section_id = st.section_id
       WHERE t.ticket_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Invalid ticket code' });
    }

    const ticket = result.rows[0];
    res.json({
      valid: ticket.ticket_status === 'Valid',
      ticket,
    });
  } catch (error) {
    next(error);
  }
});

// Check-in / mark ticket as Used (Organizer or Admin)
router.patch('/:id/use', authenticate, requireRole('Organizer', 'Admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticketId = parseInt(req.params.id, 10);

    const result = await query(
      `UPDATE ticket
       SET ticket_status = 'Used'
       WHERE ticket_id = $1 AND ticket_status = 'Valid'
       RETURNING ticket_id, ticket_code, ticket_status`,
      [ticketId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Ticket not found or is not in Valid status' });
    }

    res.json({ message: 'Ticket verified and marked as Used', ticket: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
