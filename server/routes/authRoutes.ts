import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { db } from '../config/database.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// Production guard: fatal error if JWT_SECRET is unset in production
// ---------------------------------------------------------------------------
if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim())
) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is unset. Server cannot safely run in production mode without a secure JWT secret.',
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SALT_ROUNDS = 10;

/** Reads JWT_SECRET from env, enforcing fatal error if unset in production. */
const jwtSecret = (): string => {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.JWT_SECRET || !process.env.JWT_SECRET.trim())
  ) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is unset. Server cannot safely run in production mode without a secure JWT secret.',
    );
  }
  return process.env.JWT_SECRET || 'dukaankhata-dev-jwt-secret-change-in-production';
};

/** Signs a token containing { userId } with a 7-day expiry. */
function signToken(userId: string): string {
  return jwt.sign({ userId }, jwtSecret(), { expiresIn: '7d' });
}

/** Basic email format check – avoids pulling in a heavy validation lib. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body ?? {};

  // --- Input validation ---
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Validation: name must not be empty' });
    return;
  }
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'Validation: a valid email address is required' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Validation: password must be at least 6 characters' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  // --- Uniqueness check ---
  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (existing) {
    res.status(409).json({ error: 'Conflict: an account with this email already exists' });
    return;
  }

  // --- Hash & insert ---
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const id = `user-${randomUUID()}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, name.trim(), normalizedEmail, password_hash, now);

  const token = signToken(id);

  res.status(201).json({
    token,
    user: { id, name: name.trim(), email: normalizedEmail },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body ?? {};

  // --- Presence check (no detail leakage about which field is missing) ---
  if (!email || !password) {
    res.status(400).json({ error: 'Validation: email and password are required' });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  // --- Lookup ---
  const user = db
    .prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(normalizedEmail) as
    | { id: string; name: string; email: string; password_hash: string }
    | undefined;

  // Constant-time comparison even when user doesn't exist (dummy hash)
  const hashToCompare =
    user?.password_hash ?? '$2a$10$invalidhashpaddingtomakeittimeconst';

  const match = await bcrypt.compare(String(password), hashToCompare);

  if (!user || !match) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = signToken(user.id);

  res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me   (protected)
// ---------------------------------------------------------------------------
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  const user = db
    .prepare('SELECT id, name, email, created_at FROM users WHERE id = ?')
    .get(req.userId) as
    | { id: string; name: string; email: string; created_at: string }
    | undefined;

  if (!user) {
    // Token was valid but the account has since been deleted
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({ user });
});

export default router;

