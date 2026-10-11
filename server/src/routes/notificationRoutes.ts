import { Router, Response, NextFunction } from 'express';
import { query } from '../db/pool';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get customer notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT notification_id, title, message, type, is_read, created_at
       FROM notification
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ notifications: result.rows });
  } catch (error) {
    next(error);
  }
});

// Mark single notification as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifId = parseInt(req.params.id, 10);
    const userId = req.user!.userId;

    await query(
      `UPDATE notification SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2`,
      [notifId, userId]
    );

    res.json({ message: 'Marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all as read
router.patch('/mark-all-read', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    await query(
      `UPDATE notification SET is_read = TRUE WHERE user_id = $1`,
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
