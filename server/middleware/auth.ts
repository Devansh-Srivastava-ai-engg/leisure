import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Admin-secret guard (existing – unchanged)
// ---------------------------------------------------------------------------
export const requireAdminSecret = (req: Request, res: Response, next: NextFunction) => {
  const adminSecret = process.env.ADMIN_SECRET || 'dukaankhata-secret-key-123';
  const providedSecret = req.headers['x-admin-secret'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!providedSecret || providedSecret !== adminSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Valid admin secret required for backup/restore operations',
    });
  }

  next();
};

// ---------------------------------------------------------------------------
// JWT auth middleware
// ---------------------------------------------------------------------------

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

/** Reads JWT_SECRET from env, enforcing safe behavior in production. */
export const getJwtSecret = (): string => {
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

/** The JWT payload shape stored when a token is signed. */
interface JwtPayload {
  userId: string;
}

/**
 * Extends Express's Request with an optional `userId` that is populated by
 * `requireAuth` upon successful token verification.
 */
export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Express middleware that enforces JWT authentication.
 *
 * Expects the client to send:
 *   Authorization: Bearer <token>
 *
 * On success  → attaches `req.userId` and calls `next()`.
 * On failure  → returns HTTP 401 with `{ error: "Unauthorized: ..." }`.
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized: Authorization header missing or malformed. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7); // strip 'Bearer '
  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    if (!decoded?.userId) {
      res.status(401).json({ error: 'Unauthorized: Token payload is invalid' });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    const message =
      err instanceof jwt.TokenExpiredError
        ? 'Unauthorized: Token has expired'
        : err instanceof jwt.JsonWebTokenError
          ? 'Unauthorized: Token is invalid'
          : 'Unauthorized: Token verification failed';

    res.status(401).json({ error: message });
  }
};
