import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import eventsRouter from './routes/events';
import clubsRouter from './routes/clubs';
import registrationsRouter from './routes/registrations';
import notificationsRouter from './routes/notifications';
import { ensureAdminProfile } from './utils/admin';
import { UPLOAD_DIR, rememberApiBase } from './utils/storage';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
      };
    }
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  if (!process.env.PUBLIC_API_URL) rememberApiBase(`${req.protocol}://${req.get('host')}`);
  next();
});

const serveUploads = express.static(UPLOAD_DIR, {
  dotfiles: 'deny',
  index: false,
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
});
app.use('/api/uploads', serveUploads);
app.use('/uploads', serveUploads);

const PORT = parseInt(process.env.PORT || '5000', 10);

app.get(['/', '/api', '/api/health', '/health'], (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});

const mountRoutes = (basePath: string) => {
  const prefix = basePath ? `/${basePath.replace(/^\/+|\/+$/g, '')}` : '';
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/profiles`, profilesRouter);
  app.use(`${prefix}/events`, eventsRouter);
  app.use(`${prefix}/clubs`, clubsRouter);
  app.use(`${prefix}/notifications`, notificationsRouter);
  app.use(prefix || '/', registrationsRouter);
};

mountRoutes('api');
mountRoutes('');

ensureAdminProfile();

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server cleanly listening on port ${PORT}`);
  });
}

export default app;
export { app };
