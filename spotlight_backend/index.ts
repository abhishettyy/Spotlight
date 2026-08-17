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

app.get('/privacy-policy', (req: Request, res: Response): any => {
  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Spotlight</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 24px; background: #0f0f12; color: #e5e5e5; }
        h1 { color: #ffffff; border-bottom: 2px solid #ef4444; padding-bottom: 8px; }
        h2 { color: #f87171; margin-top: 24px; }
        .card { background: #1a1a20; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #2a2a32; }
        ul { padding-left: 20px; }
        a { color: #38bdf8; text-decoration: none; }
    </style>
</head>
<body>
    <h1>Privacy Policy - Spotlight</h1>
    <p><strong>Last Updated: August 17, 2026</strong></p>
    <div class="card">
        <p>Spotlight respects your privacy. This policy explains what information we collect, how it is used, and how we protect your data when using the Spotlight Mobile Application and Club Dashboard.</p>
    </div>
    <div class="card">
        <h2>1. Information We Collect</h2>
        <ul>
            <li><strong>Account & Profile Data:</strong> Full Name, Email, Phone Number, USN/Roll Number, Branch, Year, and Semester.</li>
            <li><strong>Event Registrations:</strong> Metadata regarding events you register for, generated team passkeys, and team memberships.</li>
            <li><strong>Payment Verification:</strong> Entered UPI Transaction ID (UTR) and uploaded payment screenshot proofs for paid club events.</li>
        </ul>
    </div>
    <div class="card">
        <h2>2. How We Use Your Information</h2>
        <p>We process your data strictly to manage account access, process event registrations, verify payment status, provide QR ticket passes, and deliver internal push notifications.</p>
    </div>
    <div class="card">
        <h2>3. Data Shared With Event Organizers</h2>
        <p>When you register for an event, your profile data (Name, USN, Phone, Email) and payment proof are shared with the verified college club organizing that event via their Spotlight Dashboard.</p>
    </div>
    <div class="card">
        <h2>4. Data Security</h2>
        <p>All communication between the Spotlight app and server is encrypted using HTTPS. We do not sell or rent personal data to third parties.</p>
    </div>
    <div class="card">
        <h2>5. Contact & Data Deletion</h2>
        <p>If you have any questions or wish to request data deletion, contact us at: <a href="mailto:spotlightapp.help@gmail.com">spotlightapp.help@gmail.com</a></p>
    </div>
</body>
</html>
  `);
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
