import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, withTransaction } from '../db/pool';
import { registerSchema, loginSchema } from '../validators/schemas';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'eventflow_default_jwt_secret_key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Register a new customer or organizer
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await query('SELECT user_id FROM app_user WHERE email = $1', [data.email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await withTransaction(async (client) => {
      const userRes = await client.query(
        `INSERT INTO app_user (name, email, phone, role, account_status)
         VALUES ($1, $2, $3, $4, 'Active')
         RETURNING user_id, name, email, phone, role, account_status`,
        [data.name, data.email, data.phone || null, data.role]
      );
      const user = userRes.rows[0];

      await client.query(
        `INSERT INTO user_credential (user_id, password_hash)
         VALUES ($1, $2)`,
        [user.user_id, passwordHash]
      );

      return user;
    });

    const token = jwt.sign(
      { userId: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
});

// Login with email and password
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const result = await query(
      `SELECT u.user_id, u.name, u.email, u.phone, u.role, u.account_status, c.password_hash
       FROM app_user u
       JOIN user_credential c ON c.user_id = u.user_id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];

    if (user.account_status !== 'Active') {
      return res.status(403).json({ message: 'This account has been deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.account_status,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get current profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT user_id, name, email, phone, role, account_status, created_at
       FROM app_user
       WHERE user_id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
