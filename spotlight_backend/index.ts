import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { ClerkExpressWithAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';

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
app.use(cors({
  origin: true,
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

app.get('/', (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});

app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/events', eventsRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api', registrationsRouter); 
app.use('/api/notifications', notificationsRouter);

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server cleanly listening on port ${PORT}`);
  });
}

export default app;
export { app };

