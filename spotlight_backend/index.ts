import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ClerkExpressWithAuth, StrictAuthProp } from '@clerk/clerk-sdk-node';

dotenv.config();

declare global {
  namespace Express {
    interface Request extends StrictAuthProp {}
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error'],
});

const PORT = parseInt(process.env.PORT || '5000', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'spotlight_dev_secret_change_in_production';
const SALT_ROUNDS = 10;

function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

/** Returns true if the string looks like a bcrypt hash. */
function isBcryptHash(value: string): boolean {
  return value.startsWith('$2b$') || value.startsWith('$2a$');
}

/**
 * Compares a plaintext password against a stored value.
 * Handles both bcrypt hashes and legacy plaintext passwords.
 * If a legacy plaintext match is found, upgrades the stored value to bcrypt.
 */
async function checkPassword(
  plain: string,
  stored: string,
  upgradeId: string
): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext comparison
  const match = plain === stored;
  if (match) {
    // Silently upgrade to bcrypt
    const hashed = await bcrypt.hash(plain, SALT_ROUNDS);
    await prisma.profiles.update({ where: { id: upgradeId }, data: { password: hashed } });
  }
  return match;
}

// ── Health Check ─────────────────────────────────────────────────────────────

app.get('/', (req: Request, res: Response): any => {
  return res.status(200).json({ status: 'success', message: 'Spotlight API Server is live!' });
});

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req: Request, res: Response): Promise<any> => {
  const { email, password, name, usn, branch, phone, year, sem } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, Password, and Name are required.' });
  }

  try {
    const existing = await prisma.profiles.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = `user_${crypto.randomBytes(6).toString('hex')}`;

    const profile = await prisma.profiles.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        password: hashedPassword,
        full_name: name,
        usn: usn || null,
        branch: branch || null,
        phone: phone || null,
        year: year || null,
        sem: sem || null,
      }
    });

    const token = signToken(userId);
    console.log(`New user signed up: ${profile.email}`);

    const { password: _pw, ...safeProfile } = profile as any;
    return res.status(201).json({ message: 'Account created successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Signup Error:', error);
    return res.status(500).json({ error: 'Failed to create account: ' + error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and Password are required.' });
  }

  try {
    const profile = await prisma.profiles.findUnique({ where: { email: email.toLowerCase() } });

    if (!profile) {
      return res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
    }

    if (!profile.password) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please use the Google button.' });
    }

    const match = await checkPassword(password, profile.password, profile.id);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = signToken(profile.id);
    console.log(`User logged in: ${profile.email}`);

    const { password: _pw, ...safeProfile } = profile as any;
    return res.status(200).json({ message: 'Logged in successfully', profile: safeProfile, token });
  } catch (error: any) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

app.post('/api/auth/verify-password', async (req: Request, res: Response): Promise<any> => {
  const { userId, password } = req.body;

  if (!userId || !password) {
    return res.status(400).json({ error: 'userId and password are required.' });
  }

  try {
    const profile = await prisma.profiles.findUnique({ where: { id: userId } });

    if (!profile) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!profile.password) {
      // Social login — no password set, allow through
      return res.status(200).json({ valid: true });
    }

    const match = await checkPassword(password, profile.password, userId);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    return res.status(200).json({ valid: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Social Auth Sync ──────────────────────────────────────────────────────────

app.post('/api/auth/sync', async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth?.userId || req.body.clerkUserId;
    const { email, name } = req.body;

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: No clerkUserId found.' });
    }

    const profile = await prisma.profiles.upsert({
      where: { id: clerkUserId },
      update: { full_name: name || undefined, email: email || undefined },
      create: { id: clerkUserId, full_name: name || 'Spotlight User', email: email || '' }
    });

    return res.status(200).json({ message: 'Profile synced', profile });
  } catch (error: any) {
    console.error('Profile Sync Error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// ── Profiles ──────────────────────────────────────────────────────────────────

app.get('/api/profiles/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const profile = await prisma.profiles.findUnique({ where: { id: req.params.id as string } });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { password: _pw, ...safeProfile } = profile as any;
    return res.status(200).json({ profile: safeProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Onboarding update (USN / branch / phone)
app.put('/api/profiles/update', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.body.clerkUserId;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated.' });

    const { usn, branch, phone } = req.body;

    const profile = await prisma.profiles.update({
      where: { id: userId },
      data: { usn, branch, phone }
    });

    const { password: _pw, ...safeProfile } = profile as any;
    return res.status(200).json({ message: 'Profile updated successfully', profile: safeProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Full profile edit (name, USN, branch, phone, year, sem)
app.put('/api/profiles/edit', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthenticated.' });

    const { full_name, usn, branch, phone, year, sem } = req.body;

    if (usn) {
      const existing = await prisma.profiles.findUnique({ where: { usn } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'This USN is already registered to another account.' });
      }
    }

    const profile = await prisma.profiles.update({
      where: { id: userId },
      data: {
        full_name: full_name || undefined,
        usn: usn || undefined,
        branch: branch || undefined,
        phone: phone || undefined,
        year: year || undefined,
        sem: sem || undefined,
      }
    });

    const { password: _pw, ...safeProfile } = profile as any;
    return res.status(200).json({ message: 'Profile updated successfully', profile: safeProfile });
  } catch (error: any) {
    console.error('Profile edit error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── Events & Clubs ────────────────────────────────────────────────────────────

app.get('/api/events', async (req: Request, res: Response): Promise<any> => {
  try {
    const events = await prisma.events.findMany({
      include: { clubs: true },
      orderBy: { event_date: 'asc' },
    });

    const mapped = events.map((e) => ({
      id: e.id,
      title: e.name,
      venue: e.clubs?.name ?? 'TBD',
      image_url: e.qr_url ?? null,
      category: e.event_type ?? 'Other',
      price: e.fee ?? 0,
      description: e.description ?? '',
      date: e.event_date ? e.event_date.toISOString().split('T')[0] : null,
      registration_deadline: e.registration_deadline,
      registration_limit: e.registration_limit,
      club: e.clubs ? { id: e.clubs.id, name: e.clubs.name } : null,
    }));

    return res.status(200).json({ events: mapped });
  } catch (error: any) {
    console.error('Events fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs', async (req: Request, res: Response): Promise<any> => {
  try {
    const clubs = await prisma.clubs.findMany({ orderBy: { name: 'asc' } });

    const mapped = clubs.map((c) => ({
      id: c.id,
      name: c.name,
      logo_url: c.logo_url ?? null,
    }));

    return res.status(200).json({ clubs: mapped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Protected routes (Clerk middleware) ───────────────────────────────────────

app.use(ClerkExpressWithAuth() as any);

const generateUniquePasskey = async (): Promise<string> => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let passkey = '';
  let isUnique = false;
  while (!isUnique) {
    const bytes = crypto.randomBytes(5);
    passkey = '';
    for (let i = 0; i < 5; i++) {
      passkey += chars.charAt(bytes[i] % chars.length);
    }
    const existing = await prisma.teams.findUnique({ where: { passkey } });
    if (!existing) isUnique = true;
  }
  return passkey;
};

app.get('/api/user/tickets', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const registrations = await prisma.registrations.findMany({
      where: { user_id: userId },
      include: { events: { include: { clubs: true } }, teams: true },
      orderBy: { created_at: 'desc' },
    });

    const tickets = registrations.map((r) => ({
      id: r.id,
      status: r.status,
      payment_proof_url: r.payment_proof_url,
      created_at: r.created_at,
      team: r.teams ? { id: r.teams.id, name: r.teams.team_name, passkey: r.teams.passkey } : null,
      event: r.events ? {
        id: r.events.id,
        title: r.events.name,
        venue: r.events.clubs?.name ?? 'TBD',
        date: r.events.event_date ? r.events.event_date.toISOString().split('T')[0] : null,
        price: r.events.fee ?? 0,
        qr_url: r.events.qr_url,
        club: r.events.clubs ? { id: r.events.clubs.id, name: r.events.clubs.name } : null,
      } : null,
    }));

    return res.status(200).json({ tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth?.userId || req.body.clerkUserId;
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized.' });

    const { eventId, name, usn } = req.body;
    if (!eventId || !name || !usn) return res.status(400).json({ error: 'Missing fields.' });

    const event = await prisma.events.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const alreadyRegistered = await prisma.registrations.findFirst({
      where: { event_id: eventId, user_id: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    if (event.registration_limit) {
      const count = await prisma.registrations.count({ where: { event_id: eventId } });
      if (count >= event.registration_limit) return res.status(400).json({ error: 'Event is full.' });
    }

    const status = (event.fee === 0) ? 'CONFIRMED' : 'PENDING';
    const registration = await prisma.registrations.create({
      data: { event_id: eventId, user_id: clerkUserId, status }
    });

    return res.status(201).json({ success: true, registration });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

app.post('/api/teams/create', async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth?.userId || req.body.clerkUserId;
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized.' });

    const { eventId, teamName, leaderUsn } = req.body;
    if (!eventId || !teamName || !leaderUsn) return res.status(400).json({ error: 'Missing fields.' });

    const event = await prisma.events.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const alreadyRegistered = await prisma.registrations.findFirst({
      where: { event_id: eventId, user_id: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    const passkey = await generateUniquePasskey();

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.teams.create({
        data: { event_id: eventId, team_name: teamName, passkey, leader_id: clerkUserId }
      });
      const status = (event.fee === 0) ? 'CONFIRMED' : 'PENDING';
      const registration = await tx.registrations.create({
        data: { event_id: eventId, user_id: clerkUserId, team_id: team.id, status }
      });
      return { team, registration };
    });

    return res.status(201).json({ success: true, passkey, teamId: result.team.id });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

app.post('/api/teams/join', async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth?.userId || req.body.clerkUserId;
    if (!clerkUserId) return res.status(401).json({ error: 'Unauthorized.' });

    const { eventId, passkey } = req.body;
    if (!eventId || !passkey) return res.status(400).json({ error: 'Missing fields.' });

    const team = await prisma.teams.findFirst({
      where: { event_id: eventId, passkey: passkey.toUpperCase() },
      include: { events: true }
    });
    if (!team) return res.status(404).json({ error: 'Invalid passkey.' });

    const alreadyRegistered = await prisma.registrations.findFirst({
      where: { event_id: eventId, user_id: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    const status = (team.events?.fee === 0) ? 'CONFIRMED' : 'PENDING';
    const registration = await prisma.registrations.create({
      data: { event_id: eventId, user_id: clerkUserId, team_id: team.id, status }
    });

    return res.status(201).json({ success: true, registration });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

// ── Profile Stats ─────────────────────────────────────────────────────────────

app.get('/api/profiles/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.params.id;

    // Count total registrations (events attended/registered)
    const eventsCount = await prisma.registrations.count({
      where: { user_id: userId },
    });

    // Count distinct clubs from the user's registered events
    const registrations = await prisma.registrations.findMany({
      where: { user_id: userId },
      include: { events: { select: { club_id: true } } },
    });

    const uniqueClubIds = new Set(
      registrations
        .map(r => r.events?.club_id)
        .filter((id): id is string => id != null)
    );

    return res.status(200).json({
      eventsCount,
      clubsCount: uniqueClubIds.size,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────────

// GET /api/notifications — fetch notifications for the logged-in user
app.get('/api/notifications', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const notifications = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return res.status(200).json({ notifications, unreadCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read — mark all notifications as read
app.put('/api/notifications/read', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.body.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    await prisma.notifications.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });

    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/registrations/:id/approve — approve a pending registration
// This is called by club admins. It sets status to CONFIRMED and notifies all team members.
app.put('/api/registrations/:id/approve', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    const registration = await prisma.registrations.findUnique({
      where: { id },
      include: {
        events: { include: { clubs: true } },
        teams: { include: { registrations: true } },
      },
    });

    if (!registration) return res.status(404).json({ error: 'Registration not found.' });
    if (registration.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Already confirmed.' });
    }

    const eventName = registration.events?.name ?? 'an event';
    const clubName = registration.events?.clubs?.name ?? 'the club';

    // If it's a team registration, approve all team members' registrations
    if (registration.team_id && registration.teams) {
      const teamRegistrations = registration.teams.registrations;

      // Confirm all registrations in the team
      await prisma.registrations.updateMany({
        where: { team_id: registration.team_id },
        data: { status: 'CONFIRMED' },
      });

      // Notify every team member
      const notifData = teamRegistrations.map(r => ({
        user_id: r.user_id!,
        type: 'registration_approved',
        title: 'Registration Approved! 🎉',
        body: `Your registration for ${eventName} by ${clubName} has been confirmed. See you there!`,
      }));

      await prisma.notifications.createMany({ data: notifData });
    } else {
      // Solo registration
      await prisma.registrations.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      await prisma.notifications.create({
        data: {
          user_id: registration.user_id!,
          type: 'registration_approved',
          title: 'Registration Approved! 🎉',
          body: `Your registration for ${eventName} by ${clubName} has been confirmed. See you there!`,
        },
      });
    }

    return res.status(200).json({ message: 'Registration approved and notifications sent.' });
  } catch (error: any) {
    console.error('Approve error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/event-reminders — called by a daily cron job
// Sends "event is today" notifications to all registered users for today's events.
app.post('/api/notifications/event-reminders', async (req: Request, res: Response): Promise<any> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Find all events happening today
    const todayEvents = await prisma.events.findMany({
      where: {
        event_date: { gte: startOfDay, lte: endOfDay },
      },
      include: { clubs: true },
    });

    if (todayEvents.length === 0) {
      return res.status(200).json({ message: 'No events today.' });
    }

    let totalSent = 0;

    for (const event of todayEvents) {
      // Find all confirmed registrations for this event
      const registrations = await prisma.registrations.findMany({
        where: { event_id: event.id, status: 'CONFIRMED' },
      });

      if (registrations.length === 0) continue;

      const eventTime = event.event_date
        ? event.event_date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'today';

      const notifData = registrations
        .filter(r => r.user_id)
        .map(r => ({
          user_id: r.user_id!,
          type: 'event_reminder',
          title: `${event.name} is Today! 📅`,
          body: `Your event starts at ${eventTime}. Venue: ${event.clubs?.name ?? 'TBD'}. Don't forget to bring your ticket!`,
        }));

      await prisma.notifications.createMany({ data: notifData, skipDuplicates: false });
      totalSent += notifData.length;
    }

    return res.status(200).json({ message: `Sent ${totalSent} event reminder notifications.` });
  } catch (error: any) {
    console.error('Event reminders error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Spotlight API running on http://0.0.0.0:${PORT}`);
});
