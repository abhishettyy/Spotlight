import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { clerkClient } from '@clerk/clerk-sdk-node';

const router = Router();
const SALT_ROUNDS = 10;

// GET /api/clubs — Fetch all clubs (Public)
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

// POST /api/clubs — Create a new club (called during first-time onboarding)
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, logoUrl, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Club name and email are required.' });
    }

    // Accept userId from Clerk auth header OR verify body fallback via Clerk API
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

// PUT /api/clubs/:id — Update a club (Legacy Verification Required)
router.put('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
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

// GET /api/clubs/:id/dashboard-stats — Fetch dashboard overview metrics and statistics (Protected)
router.get('/:id/dashboard-stats', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clubId = req.params.id as string;

    // Permissions check: Enforce that the user belongs to the requested club
    const profile = await prisma.profile.findUnique({ where: { id: req.auth!.userId } });
    if (!profile || profile.clubId !== clubId) {
      return res.status(403).json({ error: "Forbidden: You do not have access to this club's statistics." });
    }

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

export default router;
