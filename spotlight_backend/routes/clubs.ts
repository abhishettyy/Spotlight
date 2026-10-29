import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { uploadBase64Image, deleteImage } from '../utils/storage';
import { filterVisibleRegistrations, mapClubRegistration } from '../utils/registrations';
import { campusNow, campusEventHasEnded } from '../utils/time';
import { ADMIN_PROFILE_ID, requireAdmin, signAdminToken, isThrottled, recordFailure, clearFailures } from '../utils/admin';
import { claimRegistrationKey, KeyAlreadyUsed } from '../utils/registrationKeys';

const router = Router();
const SALT_ROUNDS = 10;

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const clubs = await prisma.club.findMany({
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
    }));

    return res.status(200).json({ clubs: mapped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A random key like SPOTLIGHT-7KQM-X2PD, from a cryptographic source so it can't be predicted. */
function generateRegistrationKeyCode(): string {
  const part = () => Array.from(crypto.randomBytes(4), b => KEY_CHARS[b % KEY_CHARS.length]).join('');
  return `SPOTLIGHT-${part()}-${part()}`;
}

async function ensureActiveRegistrationKey(): Promise<string> {
  try {
    const active = await prisma.registrationKey.findFirst({
      where: { isUsed: false },
    });
    if (active) return active.code;

    const newCode = generateRegistrationKeyCode();

    const created = await prisma.registrationKey.create({
      data: { code: newCode },
    });
    console.log(`[RegistrationKey] Auto-generated fresh active key: ${created.code}`);
    return created.code;
  } catch (err) {
    console.error('[RegistrationKey] Auto-generation failed:', err);
    return 'SPOTLIGHT-KEY-FAIL';
  }
}

ensureActiveRegistrationKey();

router.post('/verify-key', async (req: Request, res: Response): Promise<any> => {
  try {
    const { key } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Registration key is required.' });
    }

    const cleanKey = key.trim().toUpperCase();
    const record = await prisma.registrationKey.findFirst({
      where: { code: cleanKey, isUsed: false },
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired registration key. Please contact Spotlight admins for an authorization code.' });
    }

    return res.status(200).json({ valid: true, message: 'Authorization key verified successfully.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/check-email', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingProfile = await prisma.profile.findUnique({ where: { email: cleanEmail } });
    if (existingProfile) {
      if (existingProfile.clubId === null && existingProfile.password !== null) {
        return res.status(400).json({ exists: true, error: 'This email address is already registered to a student account.' });
      }
      return res.status(400).json({ exists: true, error: 'This email address is already registered.' });
    }

    const existingClub = await prisma.club.findUnique({ where: { email: cleanEmail } });
    if (existingClub) {
      return res.status(400).json({ exists: true, error: 'This email address is already registered to a club.' });
    }

    return res.status(200).json({ exists: false, message: 'Email is available.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const key = req.ip || 'unknown';
    if (isThrottled(key)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    const { password } = req.body;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }
    const admin = await prisma.profile.findUnique({ where: { id: ADMIN_PROFILE_ID } });
    const ok = !!admin?.password && await bcrypt.compare(password, admin.password);
    if (!ok) {
      recordFailure(key);
      return res.status(401).json({ error: 'Incorrect admin password.' });
    }
    clearFailures(key);
    return res.status(200).json({ token: signAdminToken() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/change-password', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Old and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    const admin = await prisma.profile.findUnique({ where: { id: ADMIN_PROFILE_ID } });
    if (!admin?.password || !(await bcrypt.compare(oldPassword, admin.password))) {
      return res.status(401).json({ error: 'Old password is incorrect.' });
    }
    await prisma.profile.update({
      where: { id: ADMIN_PROFILE_ID },
      data: { password: await bcrypt.hash(newPassword, SALT_ROUNDS) },
    });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/registration-keys', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    await ensureActiveRegistrationKey();

    const keys = await prisma.registrationKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: { usedByClub: { select: { id: true, name: true, email: true } } },
    });

    return res.status(200).json({ keys });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/registration-keys/generate', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const { customCode } = req.body;
    let codeToUse = '';

    if (customCode && typeof customCode === 'string' && customCode.trim()) {
      codeToUse = customCode.trim().toUpperCase();
      const existing = await prisma.registrationKey.findUnique({ where: { code: codeToUse } });
      if (existing) {
        return res.status(400).json({ error: 'This registration code already exists.' });
      }
    } else {
      codeToUse = generateRegistrationKeyCode();
    }

    const key = await prisma.registrationKey.create({
      data: { code: codeToUse },
    });

    return res.status(201).json({ key });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Registers a new club with a single-use key. It only ever creates a new club and a new club-admin
// profile: an email that already belongs to a club or any profile is refused, so a spare key can't be
// used to reset an existing club's password or take over someone's account.
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, logoUrl, password, registrationKey } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Club name, email and password are required.' });
    }

    if (!registrationKey || typeof registrationKey !== 'string') {
      return res.status(400).json({ error: 'Registration key is required to register a club.' });
    }

    const cleanKey = registrationKey.trim().toUpperCase();
    const keyRecord = await prisma.registrationKey.findFirst({
      where: { code: cleanKey, isUsed: false },
    });

    if (!keyRecord) {
      return res.status(400).json({ error: 'Invalid or expired registration key. Please enter a valid key provided by Spotlight admins.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const [existingClub, existingProfile] = await Promise.all([
      prisma.club.findUnique({ where: { email: cleanEmail } }),
      prisma.profile.findUnique({ where: { email: cleanEmail } }),
    ]);
    if (existingClub) {
      return res.status(400).json({ error: 'This email address is already registered to a club. Please sign in instead.' });
    }
    if (existingProfile) {
      return res.status(400).json({ error: 'This email address is already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const finalLogoUrl = logoUrl ? await uploadBase64Image(logoUrl, 'clubs/logos') : null;
    const userId = `user_${crypto.randomBytes(6).toString('hex')}`;

    const club = await prisma.$transaction(async (tx) => {
      await claimRegistrationKey(tx, keyRecord.id);

      const newClub = await tx.club.create({
        data: {
          name,
          email: cleanEmail,
          logoUrl: finalLogoUrl,
          password: hashedPassword,
        },
      });

      await tx.profile.create({
        data: {
          id: userId,
          fullName: name,
          email: cleanEmail,
          password: hashedPassword,
          clubId: newClub.id,
        },
      });

      await tx.registrationKey.update({
        where: { id: keyRecord.id },
        data: { usedByClubId: newClub.id },
      });

      return newClub;
    });

    console.log(`Club created: "${club.name}" (${club.id}) using key ${keyRecord.code}`);

    await ensureActiveRegistrationKey();

    return res.status(201).json({ club });
  } catch (error: any) {
    if (error instanceof KeyAlreadyUsed) {
      return res.status(400).json({ error: 'This registration key has just been used. Please ask Spotlight admins for a new one.' });
    }
    console.error('Create club error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { name, email, logoUrl, upiId, qrUrl, password } = req.body;

    const userId = req.auth!.userId;
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile || profile.clubId !== id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to update this club.' });
    }

    const existingClub = await prisma.club.findUnique({ where: { id } });
    if (!existingClub) {
      return res.status(404).json({ error: 'Club not found.' });
    }

    const clubPassword = existingClub.password || profile.password;
    if (!password) {
      return res.status(400).json({ error: 'Password is required to save changes.' });
    }
    if (clubPassword) {
      const isMatch = await bcrypt.compare(password, clubPassword);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Please try again later.' });
      }
    }

    let finalLogoUrl = existingClub.logoUrl;
    if (logoUrl !== undefined) {
      if (logoUrl) {
        finalLogoUrl = await uploadBase64Image(logoUrl, 'clubs/logos');
        if (existingClub.logoUrl && existingClub.logoUrl !== finalLogoUrl) {
          deleteImage(existingClub.logoUrl).catch(err => 
            console.error('[Storage] Error deleting old logo:', err)
          );
        }
      } else {
        finalLogoUrl = null;
        if (existingClub.logoUrl) {
          deleteImage(existingClub.logoUrl).catch(err => 
            console.error('[Storage] Error deleting old logo:', err)
          );
        }
      }
    }

    let finalQrUrl = existingClub.qrUrl;
    if (qrUrl !== undefined) {
      if (qrUrl) {
        finalQrUrl = await uploadBase64Image(qrUrl, 'clubs/qrs');
        if (existingClub.qrUrl && existingClub.qrUrl !== finalQrUrl) {
          deleteImage(existingClub.qrUrl).catch(err => 
            console.error('[Storage] Error deleting old QR:', err)
          );
        }
      } else {
        finalQrUrl = null;
        if (existingClub.qrUrl) {
          deleteImage(existingClub.qrUrl).catch(err => 
            console.error('[Storage] Error deleting old QR:', err)
          );
        }
      }
    }

    const updatedClub = await prisma.club.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        logoUrl: finalLogoUrl,
        ...(upiId !== undefined && { upiId }),
        qrUrl: finalQrUrl,
      },
    });

    if (name || email) {
      await prisma.profile.updateMany({
        where: { clubId: id },
        data: {
          ...(name && { fullName: name }),
          ...(email && { email }),
        },
      });
    }

    return res.status(200).json({ club: updatedClub });
  } catch (error: any) {
    console.error('Update club error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Every visible registration across the club's events, in one request (same rows as /events/:id/registrations)
router.get('/:id/registrations', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clubId = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { id: req.auth!.userId }, select: { clubId: true } });
    if (!profile || profile.clubId !== clubId) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this club's registrations." });
    }

    const registrations = await prisma.registration.findMany({
      where: { event: { clubId } },
      include: { profile: true, team: true, event: { select: { fee: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = filterVisibleRegistrations(registrations).map(r => ({
      ...mapClubRegistration(r),
      eventId: r.eventId,
      eventTitle: r.event.name,
    }));

    return res.status(200).json({ registrations: mapped });
  } catch (error: any) {
    console.error('Failed to fetch club registrations:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id/dashboard-stats', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clubId = req.params.id as string;

    const profile = await prisma.profile.findUnique({ where: { id: req.auth!.userId } });
    if (!profile || profile.clubId !== clubId) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this club's statistics." });
    }

    const clubEvents = await prisma.event.findMany({
      where: { clubId },
      include: { club: true },
      orderBy: { eventDate: 'asc' },
    });

    const getEventStatus = (eventDate: Date | null, eventEndDate?: Date | null): 'live' | 'upcoming' | 'previous' => {
      if (!eventDate) return 'upcoming';
      if (campusNow() < new Date(eventDate)) return 'upcoming';
      return campusEventHasEnded({ eventDate, eventEndDate: eventEndDate ?? null }) ? 'previous' : 'live';
    };

    const totalEvents = clubEvents.length;
    const upcomingEventsCount = clubEvents.filter(
      e => getEventStatus(e.eventDate, e.eventEndDate) !== 'previous'
    ).length;

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

    const filteredRegistrations = filterVisibleRegistrations(registrations);

    const uniqueTeamIds = new Set(
      filteredRegistrations
        .map(r => r.teamId)
        .filter((id): id is string => id !== null)
    );
    const soloCount = filteredRegistrations.filter(r => r.teamId === null).length;
    const totalRegistrations = soloCount + uniqueTeamIds.size;

    const pendingTeamIds = new Set(
      filteredRegistrations
        .filter(r => r.status === 'PENDING' && r.teamId !== null)
        .map(r => r.teamId)
    );
    const pendingSoloCount = filteredRegistrations.filter(
      r => r.status === 'PENDING' && r.teamId === null
    ).length;
    const pendingCount = pendingSoloCount + pendingTeamIds.size;

    const recentActivity = filteredRegistrations.slice(0, 5).map(r => ({
      id: r.id,
      status: r.status,
      created_at: r.createdAt.toISOString(),
      eventTitle: r.event.name,
      eventId: r.eventId,
      paymentProofUrl: r.paymentProofUrl,
      transactionId: r.transactionId,
      user: r.profile ? {
        id: r.profile.id,
        name: r.profile.fullName,
        email: r.profile.email,
        usn: r.profile.usn,
        branch: r.profile.branch,
        phone: r.profile.phone,
        year: r.profile.year,
        sem: r.profile.sem,
      } : null,
      team: r.team ? {
        id: r.team.id,
        name: r.team.teamName,
        passkey: r.team.passkey,
        leaderId: r.team.leaderId,
      } : null,
    }));

    // Pending count per event (a team counts once), built in one pass instead of filtering per event
    const pendingByEvent = new Map<string, { solo: number; teams: Set<string> }>();
    for (const r of filteredRegistrations) {
      if (r.status !== 'PENDING') continue;
      let entry = pendingByEvent.get(r.eventId);
      if (!entry) pendingByEvent.set(r.eventId, entry = { solo: 0, teams: new Set() });
      if (r.teamId === null) entry.solo++;
      else entry.teams.add(r.teamId);
    }

    const mappedEvents = clubEvents.map(e => {
      const pendingEntry = pendingByEvent.get(e.id);
      const eventPendingCount = pendingEntry ? pendingEntry.solo + pendingEntry.teams.size : 0;

      return {
        id: e.id,
        title: e.name,
        date: e.eventDate ? e.eventDate.toISOString() : null,
        eventDate: e.eventDate ? e.eventDate.toISOString() : null,
        eventEndDate: e.eventEndDate ? e.eventEndDate.toISOString() : null,
        venue: e.venue ?? 'TBD',
        capacity: e.registrationLimit ?? 0,
        type: e.eventType ?? 'Solo',
        eventType: e.eventType ?? 'Solo',
        teamSizeLimit: e.teamSizeLimit,
        minTeamSize: e.minTeamSize ?? null,
        club: e.club?.name ?? '',
        club_id: e.clubId,
        status: getEventStatus(e.eventDate, e.eventEndDate),
        price: e.fee,
        qrUrl: e.qrUrl ?? (e.fee > 0 && e.club ? e.club.qrUrl : null),
        bannerUrl: e.bannerUrl ?? null,
        registrationDeadline: e.registrationDeadline ? e.registrationDeadline.toISOString() : null,
        pendingCount: eventPendingCount,
      };
    });

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

export default router;
