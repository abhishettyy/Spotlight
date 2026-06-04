import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables immediately before importing anything that depends on them
dotenv.config();

import { ClerkExpressWithAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';

// Import routers
import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import eventsRouter from './routes/events';
import clubsRouter from './routes/clubs';
import registrationsRouter from './routes/registrations';
import notificationsRouter from './routes/notifications';

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

const app = express();
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(ClerkExpressWithAuth() as any);

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

const PORT = parseInt(process.env.PORT || '5000', 10);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api', registrationsRouter); // Keep base path compatibility for /api/register and /api/teams/*
app.use('/api/notifications', notificationsRouter);

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server cleanly listening on port ${PORT}`);
});
