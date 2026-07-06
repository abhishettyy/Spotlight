import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { uploadBase64Image } from '../utils/storage';


const router = Router();

// GET /api/events — Fetch all events (Public)
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
      registrationCount: e._count?.registrations ?? 0,
    }));

    return res.status(200).json({ events: mapped });
  } catch (error: any) {
    console.error('Events fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/events/create — Create a new event (Protected)
router.post('/create', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { name, description, venue, eventDate, registrationDeadline, fee, registrationLimit, eventType, teamSizeLimit, clubId, bannerUrl, qrUrl } = req.body;


    if (!name) return res.status(400).json({ error: 'Event name is required.' });

    const parsedFee = fee ? parseFloat(fee) : 0;
    
    // Upload banner to Supabase if it is base64 encoded
    const finalBannerUrl = bannerUrl ? await uploadBase64Image(bannerUrl, 'events/banners') : null;

    let finalQrUrl = qrUrl || null;
    if (!finalQrUrl && parsedFee > 0 && clubId) {
      // Auto-fetch default club QR if not provided
      const club = await prisma.club.findUnique({ where: { id: clubId } });
      if (club?.qrUrl) {
        finalQrUrl = club.qrUrl;
      }
    }

    // Upload QR to Supabase if it is base64 encoded
    if (finalQrUrl) {
      finalQrUrl = await uploadBase64Image(finalQrUrl, 'events/qrs');
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
        bannerUrl: finalBannerUrl,
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

// GET /api/events/:id/registrations — Fetch event registrations (Protected)
router.get('/:id/registrations', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const registrations = await prisma.registration.findMany({
      where: { eventId: id },
      include: { profile: true, team: true, event: true },
      orderBy: { createdAt: 'desc' },
    });

    // Helper: Identify which teams have a leader who uploaded a payment proof
    const teamIdsWithPayment = new Set(
      registrations
        .filter(r => r.teamId && r.paymentProofUrl !== null)
        .map(r => r.teamId)
    );

    // Helper: Identify teams that have at least one CONFIRMED member
    const confirmedTeamIds = new Set(
      registrations
        .filter(r => r.teamId && r.status === 'CONFIRMED')
        .map(r => r.teamId)
    );

    // Filter registrations to show to the club:
    // CONFIRMED regs always show (proof was cleared after approval — that's expected)
    const filteredRegistrations = registrations.filter(r => {
      if (r.event.fee === 0) return true;
      if (r.status === 'CONFIRMED') return true;
      if (r.paymentProofUrl !== null) return true;
      if (r.teamId && teamIdsWithPayment.has(r.teamId)) return true;
      if (r.teamId && confirmedTeamIds.has(r.teamId)) return true;
      return false;
    });


    const mapped = filteredRegistrations.map(r => ({
      id: r.id,
      status: r.status,
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

export default router;
