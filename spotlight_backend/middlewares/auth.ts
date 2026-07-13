import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'spotlight_dev_secret_change_in_production';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {

    if (req.auth?.userId) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        if (decoded && decoded.userId) {
          req.auth = { userId: decoded.userId } as any;
          return next();
        }
      } catch (err) {

      }

      try {
        const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (googleRes.ok) {
          const googleData = await googleRes.json() as any;
          if (googleData && googleData.sub) {
            req.auth = { userId: `google_${googleData.sub}` } as any;
            return next();
          }
        }
      } catch (err) {
        console.error('[Auth] Google ID token verification error:', err);
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  } catch (error: any) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
  }
};
