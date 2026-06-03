import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';

const router = Router();

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

// GET /api/user/tickets — fetch tickets for the logged-in user (Protected)
router.get('/user/tickets', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;

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

// POST /api/register — Solo registration (Protected)
router.post('/register', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth!.userId;
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

// POST /api/teams/create — Create a team (Protected)
router.post('/teams/create', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth!.userId;
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

// POST /api/teams/join — Join a team (Protected)
router.post('/teams/join', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const clerkUserId = req.auth!.userId;
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

// PUT /api/registrations/:id/approve — Approve a pending registration (Protected)
router.put('/registrations/:id/approve', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;

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

export default router;
