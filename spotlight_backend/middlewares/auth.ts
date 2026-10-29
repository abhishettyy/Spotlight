import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Add a long random value to the environment before starting the API.');
}

export const JWT_SECRET: string = process.env.JWT_SECRET;

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * The user id from a Spotlight session token, or null. Only tokens this API signed are accepted;
 * Google tokens are exchanged for a session token at /auth/google and /auth/google-student instead.
 */
function userIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as { userId?: string };
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): any => {
  if (req.auth?.userId) return next();
  const userId = userIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  req.auth = { userId };
  return next();
};
