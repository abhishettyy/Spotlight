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
app.use(cors({
  origin: (origin, callback) => {
    // Dynamically mirror any requesting origin for flawless local and mobile Wi-Fi development
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

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
    await prisma.profile.update({ where: { id: upgradeId }, data: { password: hashed } });
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
    const existing = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    if (usn) {
      const existingUsn = await prisma.profile.findUnique({ where: { usn: usn.trim() } });
      if (existingUsn) {
        return res.status(400).json({ error: 'An account with this USN already exists.' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = `user_${crypto.randomBytes(6).toString('hex')}`;

    const profile = await prisma.profile.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        password: hashedPassword,
        fullName: name,
        usn: usn || null,
        branch: branch || null,
        phone: phone || null,
        year: year ? parseInt(year, 10) : null,
        sem: sem ? parseInt(sem, 10) : null,
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
    let profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });

    if (!profile) {
      // Fallback: Check if a Club with this email exists!
      const club = await prisma.club.findUnique({ where: { email: email.toLowerCase() } });
      if (club && club.password) {
        const isMatch = await bcrypt.compare(password, club.password);
        if (!isMatch) {
          return res.status(401).json({ error: 'Incorrect password for club account. Please try again.' });
        }

        // Auto-generate a Profile linked to this club so they can cleanly log in and access the dashboard
        const userId = `user_${crypto.randomBytes(6).toString('hex')}`;
        profile = await prisma.profile.create({
          data: {
            id: userId,
            email: email.toLowerCase(),
            password: club.password, // Keep password hash in sync
            fullName: `${club.name} Admin`,
            clubId: club.id,
          }
        });
        console.log(`Auto-created profile ${profile.email} from existing club during login fallback`);
      } else {
        return res.status(404).json({ error: 'No account found with this email. Please sign up first.' });
      }
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
    const profile = await prisma.profile.findUnique({ where: { id: userId } });

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
    const clerkUserId = (req as any).auth?.userId || req.body.clerkUserId;
    const { email, name } = req.body;

    console.log("[Sync] Incoming payload: clerkUserId:", clerkUserId, "email:", email, "name:", name);

    if (!clerkUserId) {
      return res.status(401).json({ error: 'Unauthorized: No clerkUserId found.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required to sync profile.' });
    }

    // Gracefully handle case where a profile with this email already exists under a different Clerk ID
    let profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (profile) {
      if (profile.id !== clerkUserId) {
        console.log(`[Sync] Profile with email ${email} already exists under different ID: ${profile.id}. Merging to new Clerk ID: ${clerkUserId}`);
        const existingClubId = profile.clubId;
        const usn = profile.usn;
        const branch = profile.branch;
        const phone = profile.phone;
        const year = profile.year;
        const sem = profile.sem;

        // Delete stale profile first to release the unique email/usn constraints
        await prisma.profile.delete({ where: { id: profile.id } });

        profile = await prisma.profile.create({
          data: {
            id: clerkUserId,
            fullName: name || profile.fullName,
            email: email.toLowerCase(),
            clubId: existingClubId,
            usn,
            branch,
            phone,
            year,
            sem,
          }
        });
      } else {
        // Just update the name
        profile = await prisma.profile.update({
          where: { id: clerkUserId },
          data: { fullName: name || undefined },
        });
      }
    } else {
      // Upsert by ID if no email conflict exists
      profile = await prisma.profile.upsert({
        where: { id: clerkUserId },
        update: { fullName: name || undefined, email: email || undefined },
        create: { id: clerkUserId, fullName: name || 'Spotlight User', email: email || '' },
      });
    }

    // Check if a club is already registered with this administrator's email!
    if (!profile.clubId) {
      const existingClub = await prisma.club.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingClub) {
        // Automatically link their profile to the existing club!
        profile = await prisma.profile.update({
          where: { id: clerkUserId },
          data: { clubId: existingClub.id },
        });
        console.log(`Auto-linked user ${profile.email} to existing club ID: ${existingClub.id}`);
      }
    }

    console.log("[Sync] Synced profile result in DB:", JSON.stringify(profile, null, 2));
    return res.status(200).json({ message: 'Profile synced', profile });
  } catch (error: any) {
    console.error('Profile Sync Error:', error);
    return res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
});

// ── Profiles ──────────────────────────────────────────────────────────────────

app.get('/api/profiles/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const profile = await prisma.profile.findUnique({ where: { id: req.params.id as string } });

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

    const profile = await prisma.profile.update({
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
      const existing = await prisma.profile.findUnique({ where: { usn } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'This USN is already registered to another account.' });
      }
    }

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        fullName: full_name || undefined,
        usn: usn || undefined,
        branch: branch || undefined,
        phone: phone || undefined,
        year: year ? parseInt(year, 10) : undefined,
        sem: sem ? parseInt(sem, 10) : undefined,
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
    const events = await prisma.event.findMany({
      include: { club: true },
      orderBy: { eventDate: 'asc' },
    });

    const mapped = events.map((e) => ({
      id: e.id,
      title: e.name,
      venue: e.venue ?? 'TBD',
      image_url: e.bannerUrl ?? null,
      category: e.eventType ?? 'Other',
      price: e.fee ?? 0,
      description: e.description ?? '',
      date: e.eventDate ? e.eventDate.toISOString().split('T')[0] : null,
      eventType: e.eventType ?? 'Solo',
      teamSizeLimit: e.teamSizeLimit,
      registration_deadline: e.registrationDeadline,
      registration_limit: e.registrationLimit,
      club: e.club ? { id: e.club.id, name: e.club.name, upiId: e.club.upiId } : null,
      qrUrl: e.qrUrl ?? (e.fee > 0 && e.club ? e.club.qrUrl : null),
      bannerUrl: e.bannerUrl ?? null,
    }));

    return res.status(200).json({ events: mapped });
  } catch (error: any) {
    console.error('Events fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs', async (req: Request, res: Response): Promise<any> => {
  try {
    const clubs = await prisma.club.findMany({
      include: { admins: true },
      orderBy: { name: 'asc' },
    });

    const mapped = clubs.map((c) => ({
      id:       c.id,
      name:     c.name,
      email:    c.email,
      logoUrl:  c.logoUrl ?? null,
      logo_url: c.logoUrl ?? null,
      upiId:    c.upiId ?? null,
      qrUrl:    c.qrUrl ?? null,
      adminIds: (c.admins ?? []).map(a => a.id),
    }));

    return res.status(200).json({ clubs: mapped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new club (called during first-time onboarding)
// NOTE: This is intentionally placed before the Clerk middleware so it can
// accept both Clerk-authenticated requests (req.auth.userId) and the
// clerkUserId body fallback used during the onboarding flow.
app.post('/api/clubs', async (req: Request, res: Response): Promise<any> => {
  try {
    // Accept userId from Clerk auth header OR from body (onboarding flow sends both)
    const userId = (req as any).auth?.userId || req.body.clerkUserId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized. No user ID provided.' });

    const { name, email, logoUrl, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Club name and email are required.' });
    }

    // Verify the profile exists before creating the club (or auto-create it if this is the first-time custom registration)
    // To prevent unique constraint violations, if a profile with the same email already exists under a different ID, delete it first.
    let profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      const existingProfile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
      if (existingProfile) {
        console.log(`[Clubs] Stale profile with email ${email} already exists under ID: ${existingProfile.id}. Deleting it first.`);
        await prisma.profile.delete({ where: { id: existingProfile.id } });
      }

      profile = await prisma.profile.create({
        data: {
          id: userId,
          fullName: name || 'Club Admin',
          email: email.toLowerCase(),
        }
      });
      console.log(`Auto-created profile ${profile.email} during club creation fallback`);
    }

    // If this user already has a club, return it instead of creating a duplicate
    if (profile.clubId) {
      const existingClub = await prisma.club.findUnique({ where: { id: profile.clubId } });
      if (existingClub) {
        return res.status(200).json({ club: existingClub, alreadyExists: true });
      }
    }

    // Check if a club with this email already exists
    // If it does, we link the user's profile to it and update the password rather than throwing a duplicate error!
    const existingClub = await prisma.club.findUnique({ where: { email: email.toLowerCase() } });
    if (existingClub) {
      console.log(`[Clubs] Club with email ${email} already exists. Linking and updating password...`);
      const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : existingClub.password;
      
      const club = await prisma.$transaction(async (tx) => {
        const updatedClub = await tx.club.update({
          where: { id: existingClub.id },
          data: {
            password: hashedPassword,
          }
        });

        await tx.profile.update({
          where: { id: userId },
          data: { clubId: updatedClub.id },
        });

        return updatedClub;
      });

      return res.status(200).json({ club, alreadyLinked: true });
    }

    // Hash the password if provided for legacy custom logins
    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    // Atomic write: create club row + assign clubId to profile in one transaction
    const club = await prisma.$transaction(async (tx) => {
      const newClub = await tx.club.create({
        data: {
          name,
          email: email.toLowerCase(),
          logoUrl: logoUrl || null,
          password: hashedPassword,
        },
      });

      await tx.profile.update({
        where: { id: userId },
        data: { clubId: newClub.id },
      });

      return newClub;
    });

    console.log(`Club created: "${club.name}" (${club.id}) by user ${userId}`);
    return res.status(201).json({ club });
  } catch (error: any) {
    console.error('Create club error:', error);
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
    const existing = await prisma.team.findUnique({ where: { passkey } });
    if (!existing) isUnique = true;
  }
  return passkey;
};

app.get('/api/user/tickets', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.query.userId as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const registrations = await prisma.registration.findMany({
      where: { userId: userId },
      include: { 
        event: { include: { club: true } }, 
        team: { include: { registrations: { include: { profile: true } } } } 
      },
      orderBy: { createdAt: 'desc' },
    });

    const tickets = registrations.map((r) => ({
      id: r.id,
      status: r.status,
      payment_proof_url: r.paymentProofUrl,
      created_at: r.createdAt,
      team: r.team ? { 
        id: r.team.id, 
        name: r.team.teamName, 
        passkey: r.team.passkey,
        members: r.team.registrations.map((reg: any) => ({
          id: reg.profile.id,
          name: reg.profile.fullName,
          isLeader: reg.profile.id === r.team?.leaderId
        }))
      } : null,
      event: r.event ? {
        id: r.event.id,
        title: r.event.name,
        venue: r.event.venue ?? 'TBD',
        date: r.event.eventDate ? r.event.eventDate.toISOString().split('T')[0] : null,

        price: r.event.fee ?? 0,
        image_url: r.event.bannerUrl,
        qr_url: r.event.qrUrl ?? (r.event.fee > 0 && r.event.club ? r.event.club.qrUrl : null),
        club: r.event.club ? { id: r.event.club.id, name: r.event.club.name } : null,
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

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    if (event.registrationLimit) {
      const count = await prisma.registration.count({ where: { eventId: eventId } });
      if (count >= event.registrationLimit) return res.status(400).json({ error: 'Event is full.' });
    }

    const status = (event.fee === 0) ? 'CONFIRMED' : 'PENDING';
    const registration = await prisma.registration.create({
      data: { eventId: eventId, userId: clerkUserId, status }
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

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    const passkey = await generateUniquePasskey();

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: { eventId: eventId, teamName: teamName, passkey, leaderId: clerkUserId }
      });
      const status = (event.fee === 0) ? 'CONFIRMED' : 'PENDING';
      const registration = await tx.registration.create({
        data: { eventId: eventId, userId: clerkUserId, teamId: team.id, status }
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

    const team = await prisma.team.findFirst({
      where: { eventId: eventId, passkey: passkey.toUpperCase() },
      include: { event: true }
    });
    if (!team) return res.status(404).json({ error: 'Invalid passkey.' });

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId }
    });
    if (alreadyRegistered) return res.status(400).json({ error: 'You are already registered for this event.' });

    const status = (team.event?.fee === 0) ? 'CONFIRMED' : 'PENDING';
    const registration = await prisma.registration.create({
      data: { eventId: eventId, userId: clerkUserId, teamId: team.id, status }
    });

    return res.status(201).json({ success: true, registration });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

// ── Event Registrations (for dashboard) ──────────────────────────────────────

app.get('/api/events/:id/registrations', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const registrations = await prisma.registration.findMany({
      where: { eventId: id },
      include: { profile: true, team: true },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = registrations.map(r => ({
      id: r.id,
      status: r.status,
      payment_proof_url: r.paymentProofUrl,
      created_at: r.createdAt,
      user: r.profile ? {
        id: r.profile.id,
        name: r.profile.fullName,
        email: r.profile.email,
        usn: r.profile.usn,
        branch: r.profile.branch,
        phone: r.profile.phone,
      } : null,
      team: r.team ? {
        id: r.team.id,
        name: r.team.teamName,
        passkey: r.team.passkey,
      } : null,
    }));

    return res.status(200).json({ registrations: mapped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Create Event (for dashboard) ──────────────────────────────────────────────

app.post('/api/events/create', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth?.userId || req.body.clerkUserId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const { name, description, venue, eventDate, registrationDeadline, fee, registrationLimit, eventType, teamSizeLimit, clubId, bannerUrl, qrUrl } = req.body;

    console.log("[CreateEvent] Incoming body keys:", Object.keys(req.body));
    console.log("[CreateEvent] bannerUrl length:", bannerUrl ? bannerUrl.length : 0);
    console.log("[CreateEvent] qrUrl length:", qrUrl ? qrUrl.length : 0);

    if (!name) return res.status(400).json({ error: 'Event name is required.' });

    const parsedFee = fee ? parseFloat(fee) : 0;
    
    let finalQrUrl = qrUrl || null;
    if (!finalQrUrl && parsedFee > 0 && clubId) {
      // Auto-fetch default club QR if not provided
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (club?.qrUrl) {
        finalQrUrl = club.qrUrl;
      }
    }

    const event = await prisma.event.create({
      data: {
        name,
        description: description || "",
        venue: venue || "TBD",
        eventType: eventType || "Solo",
        teamSizeLimit: eventType === "Team" && teamSizeLimit ? parseInt(teamSizeLimit) : null,
        fee: parsedFee,
        registrationLimit: registrationLimit ? parseInt(registrationLimit) : 100,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : new Date(),
        eventDate: eventDate ? new Date(eventDate) : new Date(),
        clubId: clubId || "",
        bannerUrl: bannerUrl || null,
        qrUrl: finalQrUrl,
      },
      include: { club: true },
    });

    return res.status(201).json({ event });
  } catch (error: any) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── Profile Stats ─────────────────────────────────────────────────────────────

app.get('/api/profiles/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.params.id;

    // Count total registrations (events attended/registered)
    const eventsCount = await prisma.registration.count({
      where: { userId: userId },
    });

    // Count distinct clubs from the user's registered events
    const registrations = await prisma.registration.findMany({
      where: { userId: userId },
      include: { event: { select: { clubId: true } } },
    });

    const uniqueClubIds = new Set(
      registrations
        .map(r => r.event?.clubId)
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

    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

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

    await prisma.notification.updateMany({
      where: { userId: userId, isRead: false },
      data: { isRead: true },
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

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: {
        event: { include: { club: true } },
        team: { include: { registrations: true } },
      },
    });

    if (!registration) return res.status(404).json({ error: 'Registration not found.' });
    if (registration.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Already confirmed.' });
    }

    const eventName = registration.event?.name ?? 'an event';
    const clubName = registration.event?.club?.name ?? 'the club';

    // If it's a team registration, approve all team members' registrations
    if (registration.teamId && registration.team) {
      const teamRegistrations = registration.team.registrations;

      // Confirm all registrations in the team
      await prisma.registration.updateMany({
        where: { teamId: registration.teamId },
        data: { status: 'CONFIRMED' },
      });

      // Notify only the team members whose registration was PENDING
      const newlyApproved = teamRegistrations.filter(r => r.status === 'PENDING');
      const notifData = newlyApproved.map(r => ({
        userId: r.userId!,
        type: 'registration_approved',
        title: 'Registration Approved! 🎉',
        body: `Your registration for ${eventName} by ${clubName} has been confirmed. See you there!`,
      }));

      if (notifData.length > 0) {
        await prisma.notification.createMany({ data: notifData });
      }
    } else {
      // Solo registration
      await prisma.registration.update({
        where: { id },
        data: { status: 'CONFIRMED' },
      });

      await prisma.notification.create({
        data: {
          userId: registration.userId!,
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
    const todayEvents = await prisma.event.findMany({
      where: {
        eventDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { club: true },
    });

    if (todayEvents.length === 0) {
      return res.status(200).json({ message: 'No events today.' });
    }

    let totalSent = 0;

    for (const event of todayEvents) {
      // Find all confirmed registrations for this event
      const registrations = await prisma.registration.findMany({
        where: { eventId: event.id, status: 'CONFIRMED' },
      });

      if (registrations.length === 0) continue;

      const eventTime = event.eventDate
        ? event.eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'today';

      const notifData = registrations
        .filter(r => r.userId)
        .map(r => ({
          userId: r.userId!,
          type: 'event_reminder',
          title: `${event.name} is Today! 📅`,
          body: `Your event starts at ${eventTime}. Venue: ${event.club?.name ?? 'TBD'}. Don't forget to bring your ticket!`,
        }));

      await prisma.notification.createMany({ data: notifData });
      totalSent += notifData.length;
    }

    return res.status(200).json({ message: `Sent ${totalSent} event reminder notifications.` });
  } catch (error: any) {
    console.error('Event reminders error:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/clubs/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, email, logoUrl, upiId, qrUrl, password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to save changes.' });
    }

    const existingClub = await prisma.club.findUnique({ where: { id } });
    if (!existingClub) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    if (existingClub.password) {
      const isMatch = await bcrypt.compare(password, existingClub.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Changes not saved.' });
      }
    }

    const updatedClub = await prisma.club.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(upiId !== undefined && { upiId }),
        ...(qrUrl !== undefined && { qrUrl }),
      },
    });

    return res.status(200).json({ club: updatedClub });
  } catch (error: any) {
    console.error('Update club error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── Dashboard Overview Metrics & Stats ────────────────────────────────────────

app.get('/api/clubs/:id/dashboard-stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id: clubId } = req.params;

    // Fetch total events for the club
    const totalEvents = await prisma.event.count({
      where: { clubId },
    });

    // Fetch club events to count upcoming
    const clubEvents = await prisma.event.findMany({
      where: { clubId },
      include: { club: true },
      orderBy: { eventDate: 'asc' },
    });

    const upcomingEventsCount = clubEvents.filter(
      e => e.eventDate && new Date(e.eventDate) >= new Date()
    ).length;

    // Fetch all registrations across all events of this club
    const registrations = await prisma.registration.findMany({
      where: {
        event: { clubId },
      },
      include: {
        profile: true,
        team: true,
        event: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRegistrations = registrations.length;
    const pendingCount = registrations.filter(
      r => r.status === 'PENDING'
    ).length;

    // Get 5 most recent registrations
    const recentActivity = registrations.slice(0, 5).map(r => ({
      id: r.id,
      status: r.status,
      created_at: r.createdAt.toISOString(),
      eventTitle: r.event.name,
      eventId: r.eventId,
      user: r.profile ? {
        id: r.profile.id,
        name: r.profile.fullName,
        email: r.profile.email,
        usn: r.profile.usn,
        branch: r.profile.branch,
        phone: r.profile.phone,
      } : null,
      team: r.team ? {
        id: r.team.id,
        name: r.team.teamName,
        passkey: r.team.passkey,
      } : null,
    }));

    const mappedEvents = clubEvents.map(e => ({
      id: e.id,
      title: e.name,
      date: e.eventDate ? e.eventDate.toISOString().split('T')[0] : null,
      venue: e.venue ?? 'TBD',
      capacity: e.registrationLimit ?? 0,
      type: e.fee > 0 ? 'paid' : 'free',
      club: e.club?.name ?? '',
      club_id: e.clubId,
      status: e.eventDate && new Date(e.eventDate) < new Date() ? 'previous' : 'upcoming',
      price: e.fee,
      qrUrl: e.qrUrl ?? (e.fee > 0 && e.club ? e.club.qrUrl : null),
      bannerUrl: e.bannerUrl ?? null,
    }));

    return res.status(200).json({
      totalEvents,
      upcomingEventsCount,
      totalRegistrations,
      pendingCount,
      recentActivity,
      clubEvents: mappedEvents,
    });
  } catch (error: any) {
    console.error('Failed to fetch dashboard stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

// ── Start Server ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log("Server cleanly listening on port 5000");
});
