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
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

const PORT = parseInt(process.env.PORT || '5000', 10);

app.get(['/', '/api', '/api/health', '/health'], (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});

// Support both /api/... and direct /... (resilient to Passenger/Apache prefix stripping)
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

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server cleanly listening on port ${PORT}`);
  });
}

export default app;
export { app };
