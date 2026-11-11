/**
 * Authentication and role-based access control (RBAC) middleware.
 *
 * Flow:
 *  1. POST /api/auth/login checks the bcrypt hash and returns a signed JWT
 *     containing the user's id and role.
 *  2. The React client sends it on every request as `Authorization: Bearer <token>`.
 *  3. `authenticate` verifies the signature and expiry, reloads the user from
 *     MySQL (so deactivated accounts and role changes take effect at once),
 *     and attaches the user to `req.user`.
 *  4. `requireAuth` / `requireRole(...)` guard each protected endpoint.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, SafeUser } from './repository.ts';

export type Role = 'admin' | 'organizer' | 'student';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
  username: string;
}

const DEV_FALLBACK_SECRET = 'dev-only-secret-change-me';

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (at least 16 characters) in production');
  }
  return DEV_FALLBACK_SECRET;
};

/** Issues a signed token for a logged-in user (default lifetime: 8 hours). */
export const signToken = (user: Pick<SafeUser, 'user_id' | 'role' | 'username'>): string =>
  jwt.sign({ role: user.role, username: user.username }, getSecret(), {
    subject: String(user.user_id),
    expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'],
  });

/** Global middleware: reads the Bearer token if present. Requests without a token continue as guests. */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) return next();

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Malformed Authorization header. Use: Bearer <token>' });
  }

  try {
    const payload = jwt.verify(token, getSecret()) as unknown as TokenPayload;
    const user = await db.findUserById(Number(payload.sub));
    if (!user) return res.status(401).json({ error: 'Account no longer exists. Please log in again.' });
    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact the administrator.' });
    }
    const { password: _pw, ...safeUser } = user;
    req.user = safeUser;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
};

/** Rejects guests with 401 Unauthorized. */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required. Please log in.' });
  return next();
};

/** Rejects guests with 401 and users of other roles with 403 Forbidden. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required. Please log in.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. This action requires the ${roles.join(' or ')} role.` });
    }
    return next();
  };
