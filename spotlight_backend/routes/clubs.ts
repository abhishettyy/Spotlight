import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
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

router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, logoUrl, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Club name and email are required.' });
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

        return updatedClub;
      });

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

      return newClub;
    });

    console.log(`Club created: "${club.name}" (${club.id}) by user ${userId}`);
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

    const upcomingEventsCount = clubEvents.filter(
      e => e.eventDate && new Date(e.eventDate) >= new Date()
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
        .filter(r => r.teamId && r.paymentProofUrl !== null)
        .map(r => r.teamId)
    );

    const confirmedTeamIds = new Set(
      registrations
        .filter(r => r.teamId && r.status === 'CONFIRMED')
        .map(r => r.teamId)
    );

    const filteredRegistrations = registrations.filter(r => {
      if (r.event.fee === 0) return true;
      if (r.status === 'CONFIRMED') return true;           
      if (r.paymentProofUrl !== null) return true;         
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

    const mappedEvents = clubEvents.map(e => ({
      id: e.id,
      title: e.name,
      date: e.eventDate ? e.eventDate.toISOString().split('T')[0] : null,
      venue: e.venue ?? 'TBD',
      capacity: e.registrationLimit ?? 0,
      type: e.eventType ?? 'Solo',
      club: e.club?.name ?? '',
      club_id: e.clubId,
      status: e.eventDate && new Date(e.eventDate) < new Date() ? 'previous' : 'upcoming',
      price: e.fee,
      qrUrl: e.qrUrl ?? (e.fee > 0 && e.club ? e.club.qrUrl : null),
      bannerUrl: e.bannerUrl ?? null,
      registrationDeadline: e.registrationDeadline ? e.registrationDeadline.toISOString() : null,
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
