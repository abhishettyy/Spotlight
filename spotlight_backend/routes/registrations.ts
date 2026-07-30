import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { uploadBase64Image, deleteImage } from '../utils/storage';

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
        club: r.event.club ? { 
          id: r.event.club.id, 
          name: r.event.club.name,
          logoUrl: r.event.club.logoUrl
        } : null,
      } : null,
    }));

    return res.status(200).json({ tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

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

    return res.status(201).json({ success: true, passkey, teamId: result.team.id, registrationId: result.registration.id });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

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

    const leaderReg = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: team.leaderId }
    });
    const status = (team.event?.fee === 0 || leaderReg?.status === 'CONFIRMED') ? 'CONFIRMED' : 'PENDING';

    const registration = await prisma.registration.create({
      data: { eventId: eventId, userId: clerkUserId, teamId: team.id, status }
    });

    return res.status(201).json({ success: true, registration });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

router.put('/registrations/:id/payment', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { paymentProof, transactionId } = req.body;

    if (!paymentProof || !transactionId) {
      return res.status(400).json({ error: 'Payment proof image and Transaction ID are required.' });
    }

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    if (registration.userId !== req.auth!.userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot upload payment proof for another user.' });
    }

    const publicUrl = await uploadBase64Image(paymentProof, 'payments/proofs');

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        paymentProofUrl: publicUrl,
        transactionId: transactionId
      }
    });

    return res.status(200).json({ success: true, registration: updated });
  } catch (error: any) {
    console.error('Submit payment proof error:', error);
    return res.status(500).json({ error: error.message });
  }
});

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

    if (registration.teamId && registration.team) {
      const teamRegistrations = registration.team.registrations;

      const proofUrls = teamRegistrations
        .map(r => r.paymentProofUrl)
        .filter((url): url is string => url !== null && url !== undefined);

      await prisma.registration.updateMany({
        where: { teamId: registration.teamId },
        data: { 
          status: 'CONFIRMED',
          paymentProofUrl: null
        },
      });

      for (const url of proofUrls) {
        deleteImage(url).catch(err => console.error('[Storage] Async delete failed:', err));
      }

      const newlyApproved = teamRegistrations.filter(r => r.status === 'PENDING');
      const notifData = newlyApproved.map(r => ({
        userId: r.userId!,
        type: 'registration_approved',
        title: 'Registration Approved',
        body: `Your registration for ${eventName} by ${clubName} has been confirmed. See you there!`,
        eventId: registration.eventId,
      }));

      if (notifData.length > 0) {
        await prisma.notification.createMany({ data: notifData });
      }
    } else {

      const proofUrl = registration.paymentProofUrl;

      await prisma.registration.update({
        where: { id },
        data: { 
          status: 'CONFIRMED',
          paymentProofUrl: null
        },
      });

      if (proofUrl) {
        deleteImage(proofUrl).catch(err => console.error('[Storage] Async delete failed:', err));
      }

      await prisma.notification.create({
        data: {
          userId: registration.userId!,
          type: 'registration_approved',
          title: 'Registration Approved',
          body: `Your registration for ${eventName} by ${clubName} has been confirmed. See you there!`,
          eventId: registration.eventId,
        },
      });
    }

    return res.status(200).json({ message: 'Registration approved and notifications sent.' });
  } catch (error: any) {
    console.error('Approve error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/registrations/:id/reject', requireAuth, async (req: Request, res: Response): Promise<any> => {
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

    const eventName = registration.event?.name ?? 'an event';
    const clubName = registration.event?.club?.name ?? 'the club';

    if (registration.teamId && registration.team) {
      const teamRegistrations = registration.team.registrations;
      const proofUrls = teamRegistrations
        .map(r => r.paymentProofUrl)
        .filter((url): url is string => url !== null && url !== undefined);

      await prisma.registration.updateMany({
        where: { teamId: registration.teamId },
        data: { 
          status: 'REJECTED',
          paymentProofUrl: null
        },
      });

      for (const url of proofUrls) {
        deleteImage(url).catch(err => console.error('[Storage] Async delete failed:', err));
      }

      const notifData = teamRegistrations.filter(r => r.userId).map(r => ({
        userId: r.userId!,
        type: 'registration_rejected',
        title: 'Registration Update',
        body: `Your registration for ${eventName} by ${clubName} was not approved. Please contact the club for details.`,
        eventId: registration.eventId,
      }));

      if (notifData.length > 0) {
        await prisma.notification.createMany({ data: notifData });
      }
    } else {
      const proofUrl = registration.paymentProofUrl;

      await prisma.registration.update({
        where: { id },
        data: { 
          status: 'REJECTED',
          paymentProofUrl: null
        },
      });

      if (proofUrl) {
        deleteImage(proofUrl).catch(err => console.error('[Storage] Async delete failed:', err));
      }

      if (registration.userId) {
        await prisma.notification.create({
          data: {
            userId: registration.userId,
            type: 'registration_rejected',
            title: 'Registration Update',
            body: `Your registration for ${eventName} by ${clubName} was not approved. Please contact the club for details.`,
            eventId: registration.eventId,
          },
        });
      }
    }

    return res.status(200).json({ message: 'Registration rejected successfully.' });
  } catch (error: any) {
    console.error('Reject error:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/public/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const liveEvents = await prisma.event.count({
      where: {
        eventDate: {
          gte: todayStart,
        },
      },
    });

    const registrations = await prisma.registration.count();

    const clubs = await prisma.club.count();

    const totalEvents = await prisma.event.count();

    const totalStudents = await prisma.profile.count({
      where: {
        clubId: null,
      },
    });

    return res.status(200).json({
      liveEvents,
      registrations,
      clubs,
      totalEvents,
      totalStudents,
    });
  } catch (error: any) {
    console.error('Failed to fetch public stats:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
