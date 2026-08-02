import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { uploadBase64Image, deleteImage } from '../utils/storage';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const events = await prisma.event.findMany({
      include: {
        club: true,
        _count: {
          select: { registrations: true }
        }
      },
      orderBy: { eventDate: 'asc' },
    });

    const mapped = events.map((e) => {
      const normalizedType = e.eventType === 'Individual' ? 'Solo' : (e.eventType ?? 'Solo');
      return {
        id: e.id,
        title: e.name,
        venue: e.venue ?? 'TBD',
        image_url: e.bannerUrl ?? null,
        category: normalizedType,
        price: e.fee ?? 0,
        description: e.description ?? '',
        date: e.eventDate ? e.eventDate.toISOString() : null,
        eventDate: e.eventDate ? e.eventDate.toISOString() : null,
        eventEndDate: e.eventEndDate ? e.eventEndDate.toISOString() : null,
        eventType: normalizedType,
        teamSizeLimit: e.teamSizeLimit,
        minTeamSize: e.minTeamSize ?? null,
        registration_deadline: e.registrationDeadline ? e.registrationDeadline.toISOString() : null,
        registration_limit: e.registrationLimit,
        club: e.club ? { id: e.club.id, name: e.club.name, upiId: (e as any).upiId ?? e.club.upiId } : null,
        upiId: (e as any).upiId ?? e.club?.upiId ?? null,
        qrUrl: e.qrUrl ?? (e.fee > 0 && e.club ? e.club.qrUrl : null),
        bannerUrl: e.bannerUrl ?? null,
        registrationCount: e._count?.registrations ?? 0,
      };
    });

    return res.status(200).json({ events: mapped });
  } catch (error: any) {
    console.error('Events fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.post('/create', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { name, description, venue, eventDate, eventEndDate, registrationDeadline, fee, registrationLimit, eventType, teamSizeLimit, minTeamSize, bannerUrl, qrUrl, upiId } = req.body;
    let { clubId } = req.body;

    if (!name) return res.status(400).json({ error: 'Event name is required.' });

    // If clubId is missing or empty, resolve it from the authenticated user's profile
    if (!clubId || clubId.trim() === '') {
      console.warn(`[Events] clubId not provided or empty. Attempting to resolve from profile for userId: ${userId}`);
      const profile = await prisma.profile.findUnique({ where: { id: userId } });
      if (profile?.clubId) {
        clubId = profile.clubId;
        console.log(`[Events] Resolved clubId ${clubId} from user profile.`);
      } else {
        console.error(`[Events] Cannot create event: no clubId found for userId ${userId}`);
        return res.status(400).json({ error: 'Your account is not linked to a club. Please complete club setup before creating events.' });
      }
    }

    // Verify the club actually exists
    const club = await prisma.club.findUnique({ where: { id: clubId } });
    if (!club) {
      return res.status(404).json({ error: 'Club not found. Please refresh the page and try again.' });
    }

    const parsedFee = fee ? parseFloat(fee) : 0;

    const finalBannerUrl = bannerUrl ? await uploadBase64Image(bannerUrl, 'events/banners') : null;

    let finalQrUrl = qrUrl || null;

    if (finalQrUrl) {
      finalQrUrl = await uploadBase64Image(finalQrUrl, 'events/qrs');
    }

    const startDate = eventDate ? new Date(eventDate) : new Date();
    const defaultEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999);
    const finalEndDate = eventEndDate ? new Date(eventEndDate) : defaultEndDate;

    const event = await (prisma.event as any).create({
      data: {
        name,
        description: description || "",
        venue: venue || "TBD",
        eventType: eventType || "Solo",
        teamSizeLimit: eventType === "Team" && teamSizeLimit ? parseInt(teamSizeLimit) : null,
        minTeamSize: eventType === "Team" && minTeamSize ? Math.max(2, parseInt(minTeamSize)) : (eventType === "Team" ? 2 : null),
        fee: parsedFee,
        registrationLimit: registrationLimit ? Math.max(2, parseInt(registrationLimit)) : 100,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : new Date(),
        eventDate: startDate,
        eventEndDate: finalEndDate,
        clubId,
        bannerUrl: finalBannerUrl,
        qrUrl: finalQrUrl,
        upiId: upiId || null,
      },

      include: { club: true },
    });

    return res.status(201).json({ event });
  } catch (error: any) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { eventDate, eventEndDate, registrationDeadline, venue, registrationLimit, teamSizeLimit, minTeamSize, bannerUrl, password } = req.body;

    const userId = req.auth!.userId;
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    const existingEvent = await prisma.event.findUnique({ where: { id: id as string }, include: { club: true } });
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const club = existingEvent.club || (profile?.clubId ? await prisma.club.findUnique({ where: { id: profile.clubId } }) : null);
    const clubPassword = club?.password || profile?.password;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to save changes.' });
    }
    if (clubPassword) {
      const isMatch = await bcrypt.compare(password, clubPassword);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Please try again later.' });
      }
    }

    let finalBannerUrl = existingEvent.bannerUrl;
    if (bannerUrl !== undefined) {
      if (bannerUrl && typeof bannerUrl === 'string' && bannerUrl.startsWith('data:image/')) {
        finalBannerUrl = await uploadBase64Image(bannerUrl, 'events/banners');
        if (existingEvent.bannerUrl && existingEvent.bannerUrl !== finalBannerUrl) {
          deleteImage(existingEvent.bannerUrl).catch(err =>
            console.error('[Storage] Error deleting old banner:', err)
          );
        }
      } else if (!bannerUrl) {
        finalBannerUrl = null;
        if (existingEvent.bannerUrl) {
          deleteImage(existingEvent.bannerUrl).catch(err =>
            console.error('[Storage] Error deleting old banner:', err)
          );
        }
      } else {
        finalBannerUrl = bannerUrl;
      }
    }

    const updatedEvent = await prisma.event.update({
      where: { id: id as string },
      data: {
        ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
        ...(eventEndDate ? { eventEndDate: new Date(eventEndDate) } : {}),
        ...(registrationDeadline ? { registrationDeadline: new Date(registrationDeadline) } : {}),
        ...(venue !== undefined ? { venue } : {}),
        ...(registrationLimit !== undefined ? { registrationLimit: parseInt(registrationLimit) } : {}),
        ...(teamSizeLimit !== undefined ? { teamSizeLimit: parseInt(teamSizeLimit) } : {}),
        ...(minTeamSize !== undefined ? { minTeamSize: Math.max(2, parseInt(minTeamSize)) } : {}),
        bannerUrl: finalBannerUrl,
      },
      include: { club: true },
    });

    return res.status(200).json({ event: updatedEvent });
  } catch (error: any) {
    console.error('Update event error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/:id/registrations', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const registrations = await prisma.registration.findMany({
      where: { eventId: id },
      include: { profile: true, team: true, event: true },
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

    const mapped = filteredRegistrations.map(r => ({
      id: r.id,
      status: r.status,
      checkedInAt: (r as any).checkedInAt,
      payment_proof_url: r.paymentProofUrl,
      transaction_id: r.transactionId,
      created_at: r.createdAt,
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

    return res.status(200).json({ registrations: mapped });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id/deadline', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const { registrationDeadline } = req.body;

    if (!registrationDeadline) {
      return res.status(400).json({ error: 'Registration deadline is required.' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: id as string },
      data: {
        registrationDeadline: new Date(registrationDeadline)
      },
      include: { club: true }
    });

    return res.status(200).json({ event: updatedEvent });
  } catch (error: any) {
    console.error('Update event deadline error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
