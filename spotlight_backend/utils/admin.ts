import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { JWT_SECRET } from '../middlewares/auth';

export const ADMIN_PROFILE_ID = 'admin';
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'spotlightapp.help@gmail.com').trim().toLowerCase();
const SALT_ROUNDS = 10;

export async function ensureAdminProfile(): Promise<void> {
  try {
    const existing = await prisma.profile.findUnique({ where: { id: ADMIN_PROFILE_ID } });
    if (existing) {
      if (existing.email !== ADMIN_EMAIL) {
        const taken = await prisma.profile.findUnique({ where: { email: ADMIN_EMAIL } });
        if (taken) {
          console.error(`[Admin] Cannot set the admin email to ${ADMIN_EMAIL}: another account already uses it.`);
        } else {
          await prisma.profile.update({ where: { id: ADMIN_PROFILE_ID }, data: { email: ADMIN_EMAIL } });
          console.log(`[Admin] Admin email set to ${ADMIN_EMAIL}.`);
        }
      }
      return;
    }
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(12).toString('base64url');
    const hashed = await bcrypt.hash(initialPassword, SALT_ROUNDS);
    await prisma.profile.create({
      data: { id: ADMIN_PROFILE_ID, fullName: 'admin', email: ADMIN_EMAIL, password: hashed },
    });
    if (process.env.ADMIN_INITIAL_PASSWORD) {
      console.log('[Admin] Created admin profile with the password from ADMIN_INITIAL_PASSWORD.');
    } else {
      console.log(`[Admin] Created admin profile. Initial password: ${initialPassword} (change it in the admin console)`);
    }
  } catch (error: any) {
    console.error('[Admin] Could not ensure admin profile:', error.message);
  }
}

export function signAdminToken(): string {
  return jwt.sign({ adminId: ADMIN_PROFILE_ID }, JWT_SECRET, { expiresIn: '12h' });
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction): any => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.substring(7), JWT_SECRET) as { adminId?: string };
      if (decoded && decoded.adminId === ADMIN_PROFILE_ID) return next();
    } catch {
    }
  }
  return res.status(401).json({ error: 'Unauthorized: admin sign-in required.' });
};

const attempts = new Map<string, { count: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function isThrottled(key: string): boolean {
  const rec = attempts.get(key);
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

export function recordFailure(key: string): void {
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) attempts.set(key, { count: 1, first: Date.now() });
  else rec.count += 1;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}
