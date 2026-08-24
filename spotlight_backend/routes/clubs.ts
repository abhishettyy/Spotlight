import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { requireAuth, requireOptionalAuth } from '../middlewares/auth';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { uploadBase64Image, deleteImage } from '../utils/storage';

const router = Router();
const SALT_ROUNDS = 10;

router.get('/', async (req: Request, res: Response): Promise<any> => {
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

async function ensureActiveRegistrationKey(): Promise<string> {
  try {
    const active = await prisma.registrationKey.findFirst({
      where: { isUsed: false },
    });
    if (active) return active.code;

    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `SPOTLIGHT-${part1}-${part2}`;

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

router.post('/verify-admin-secret', async (req: Request, res: Response): Promise<any> => {
  try {
    const { secret } = req.body;
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) return res.status(500).json({ error: 'Admin secret not configured on server.' });
    if (!secret || secret.trim() !== adminSecret.trim()) {
      return res.status(401).json({ error: 'Invalid admin passcode.' });
    }
    return res.status(200).json({ valid: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/registration-keys', async (req: Request, res: Response): Promise<any> => {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || req.headers['x-admin-secret'] !== adminSecret) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin secret.' });
    }
    await ensureActiveRegistrationKey();

    const keys = await prisma.registrationKey.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const enrichedKeys = await Promise.all(keys.map(async (key) => {
      if (key.usedByClubId) {
        const club = await prisma.club.findUnique({
          where: { id: key.usedByClubId },
          select: { id: true, name: true, email: true },
        });
        return { ...key, usedByClub: club };
      }
      return { ...key, usedByClub: null };
    }));

    return res.status(200).json({ keys: enrichedKeys });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/registration-keys/generate', async (req: Request, res: Response): Promise<any> => {
  try {
    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || req.headers['x-admin-secret'] !== adminSecret) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin secret.' });
    }
    const { customCode } = req.body;
    let codeToUse = '';

    if (customCode && typeof customCode === 'string' && customCode.trim()) {
      codeToUse = customCode.trim().toUpperCase();
      const existing = await prisma.registrationKey.findUnique({ where: { code: codeToUse } });
      if (existing) {
        return res.status(400).json({ error: 'This registration code already exists.' });
      }
    } else {
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      codeToUse = `SPOTLIGHT-${part1}-${part2}`;
    }

    const key = await prisma.registrationKey.create({
      data: { code: codeToUse },
    });

    return res.status(201).json({ key });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', requireOptionalAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, logoUrl, password, registrationKey } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Club name and email are required.' });
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

    let userId = (req as any).auth?.userId;
    if (!userId && req.body.clerkUserId) {
      const targetClerkId = req.body.clerkUserId;
      if (targetClerkId.startsWith('user_')) {
        try {
          const clerkUser = await clerkClient.users.getUser(targetClerkId);
          const matchesEmail = clerkUser.emailAddresses.some(
            e => e.emailAddress.toLowerCase() === email.toLowerCase()
          );
          if (!matchesEmail) {
            return res.status(403).json({ error: 'Forbidden: Email mismatch with Clerk user ID.' });
          }
          userId = targetClerkId;
        } catch (err) {
          return res.status(401).json({ error: 'Unauthorized: Clerk verification failed.' });
        }
      } else {
        return res.status(401).json({ error: 'Unauthorized: Google token required for social users.' });
      }
    }

    if (!userId) return res.status(401).json({ error: 'Unauthorized. No user ID provided.' });

    let profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) {
      const existingProfile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
      if (existingProfile) {
        if (existingProfile.clubId === null && existingProfile.password !== null) {
          return res.status(400).json({ error: 'This email is already registered to a student account.' });
        }

        console.log(`[Clubs] Stale Clerk-synced profile with email ${email} exists under ID: ${existingProfile.id}. Replacing with new Clerk ID: ${userId}.`);
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

    if (profile.clubId) {
      const existingClub = await prisma.club.findUnique({ where: { id: profile.clubId } });
      if (existingClub) {
        return res.status(200).json({ club: existingClub, alreadyExists: true });
      }
    }

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

        await tx.registrationKey.update({
          where: { id: keyRecord.id },
          data: {
            isUsed: true,
            usedByClubId: updatedClub.id,
            usedAt: new Date(),
          },
        });

        return updatedClub;
      });

      await ensureActiveRegistrationKey();
      return res.status(200).json({ club, alreadyLinked: true });
    }

    const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
    const finalLogoUrl = logoUrl ? await uploadBase64Image(logoUrl, 'clubs/logos') : null;

    const club = await prisma.$transaction(async (tx) => {
      const newClub = await tx.club.create({
        data: {
          name,
          email: email.toLowerCase(),
          logoUrl: finalLogoUrl,
          password: hashedPassword,
        },
      });

      await tx.profile.update({
        where: { id: userId },
        data: { clubId: newClub.id },
      });

      await tx.registrationKey.update({
        where: { id: keyRecord.id },
        data: {
          isUsed: true,
          usedByClubId: newClub.id,
          usedAt: new Date(),
        },
      });

      return newClub;
    });

    console.log(`Club created: "${club.name}" (${club.id}) using key ${keyRecord.code} by user ${userId}`);

    await ensureActiveRegistrationKey();

    return res.status(201).json({ club });
  } catch (error: any) {
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

    return res.status(200).json({ club: updatedClub });
  } catch (error: any) {
    console.error('Update club error:', error);
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

    const totalEvents = await prisma.event.count({
      where: { clubId },
    });

    const clubEvents = await prisma.event.findMany({
      where: { clubId },
      include: { club: true },
      orderBy: { eventDate: 'asc' },
    });

    const getEventStatus = (eventDate: Date | null, eventEndDate?: Date | null): 'live' | 'upcoming' | 'previous' => {
      if (!eventDate) return 'upcoming';
      const now = new Date();
      const startDate = new Date(eventDate);
      let endDate: Date;
      if (eventEndDate) {
        endDate = new Date(eventEndDate);
      } else {
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999);
      }

      if (now < startDate) return 'upcoming';
      if (now >= startDate && now <= endDate) return 'live';
      return 'previous';
    };

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

    const teamIdsWithPayment = new Set(
      registrations
        .filter(r => r.teamId && r.transactionId !== null)
        .map(r => r.teamId)
    );

    const confirmedTeamIds = new Set(
      registrations
        .filter(r => r.teamId && r.status === 'CONFIRMED')
        .map(r => r.teamId)
    );

    const filteredRegistrations = registrations.filter(r => {
      if (r.event.fee === 0) return true;
      if (r.status === 'CONFIRMED' || r.status === 'REJECTED') return true;
      if (r.transactionId !== null) return true;
      if (r.teamId && teamIdsWithPayment.has(r.teamId)) return true;
      if (r.teamId && confirmedTeamIds.has(r.teamId)) return true;
      return false;
    });

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

    const mappedEvents = clubEvents.map(e => {
      const eventRegs = filteredRegistrations.filter(r => r.eventId === e.id && r.status === 'PENDING');
      const pendingTeamIds = new Set(eventRegs.filter(r => r.teamId !== null).map(r => r.teamId));
      const pendingSolo = eventRegs.filter(r => r.teamId === null).length;
      const eventPendingCount = pendingSolo + pendingTeamIds.size;

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
