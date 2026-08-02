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
        leaderId: r.team.leaderId,
        members: (() => {
          if (!r.team?.registrations) return [];
          const isTicketConfirmed = r.status === 'CONFIRMED';
          const validRegs = r.team.registrations.filter((reg: any) => {
            if (!reg.profile || reg.status === 'REJECTED') return false;
            if (isTicketConfirmed) {
              return reg.status === 'CONFIRMED';
            }
            return reg.status === 'CONFIRMED' || reg.status === 'PENDING';
          });

          // Sort so Leader comes first, then CONFIRMED, then PENDING
          validRegs.sort((a: any, b: any) => {
            const aIsLeader = a.profile.id === r.team?.leaderId;
            const bIsLeader = b.profile.id === r.team?.leaderId;
            if (aIsLeader && !bIsLeader) return -1;
            if (!aIsLeader && bIsLeader) return 1;
            if (a.status === 'CONFIRMED' && b.status !== 'CONFIRMED') return -1;
            if (a.status !== 'CONFIRMED' && b.status === 'CONFIRMED') return 1;
            return 0;
          });

          const seen = new Set<string>();
          const result: any[] = [];
          for (const reg of validRegs) {
            if (!seen.has(reg.profile.id)) {
              seen.add(reg.profile.id);
              result.push({
                id: reg.profile.id,
                name: reg.profile.fullName,
                isLeader: reg.profile.id === r.team?.leaderId,
                status: reg.status
              });
            }
          }
          return result;
        })()
      } : null,
      event: r.event ? {
        id: r.event.id,
        title: r.event.name,
        venue: r.event.venue ?? 'TBD',
        date: r.event.eventDate ? r.event.eventDate.toISOString().split('T')[0] : null,
        eventDate: r.event.eventDate ? r.event.eventDate.toISOString() : null,
        eventEndDate: (r.event as any).eventEndDate ? new Date((r.event as any).eventEndDate).toISOString() : null,

        price: r.event.fee ?? 0,
        image_url: r.event.bannerUrl,
        qr_url: r.event.qrUrl ?? (r.event.fee > 0 && r.event.club ? r.event.club.qrUrl : null),
        upi_id: (r.event as any).upiId ?? r.event.club?.upiId ?? null,
        team_size_limit: r.event.teamSizeLimit ?? null,
        min_team_size: (r.event as any).minTeamSize ?? 2,
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

    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed.' });
    }

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId, status: { in: ['PENDING', 'CONFIRMED'] } }
    });
    if (alreadyRegistered) {
      return res.status(400).json({ error: 'You are already registered for this event.' });
    }

    if (event.registrationLimit) {
      const activeCount = await prisma.registration.count({
        where: { eventId: eventId, status: { in: ['PENDING', 'CONFIRMED'] } }
      });
      if (activeCount >= event.registrationLimit) return res.status(400).json({ error: 'Registration full. Capacity reached for this event.' });
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

    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed. You cannot create a new team.' });
    }

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId, status: { in: ['PENDING', 'CONFIRMED'] } }
    });
    if (alreadyRegistered) {
      return res.status(400).json({ error: 'You are already registered for this event.' });
    }

    if (event.registrationLimit) {
      const activeCount = await prisma.registration.count({
        where: { eventId: eventId, status: { in: ['PENDING', 'CONFIRMED'] } }
      });
      if (activeCount >= event.registrationLimit) return res.status(400).json({ error: 'Registration full. Capacity reached for this event.' });
    }

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

    if (team.event?.registrationDeadline && new Date() > new Date(team.event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed. You cannot join this team.' });
    }

    const alreadyRegistered = await prisma.registration.findFirst({
      where: { eventId: eventId, userId: clerkUserId, status: { in: ['PENDING', 'CONFIRMED'] } }
    });
    if (alreadyRegistered) {
      return res.status(400).json({ error: 'You are already registered for this event.' });
    }

    // Check team size limit
    const currentMemberCount = await prisma.registration.count({
      where: { teamId: team.id, status: { in: ['PENDING', 'CONFIRMED'] } }
    });
    const maxTeamSize = team.event?.teamSizeLimit;
    if (maxTeamSize && currentMemberCount >= maxTeamSize) {
      return res.status(400).json({
        error: 'This team is already full.'
      });
    }

    const status = (team.event?.fee === 0) ? 'CONFIRMED' : 'PENDING';

    const existingCheckedIn = await prisma.registration.findFirst({
      where: { teamId: team.id, checkedInAt: { not: null } } as any
    });

    const registration = await prisma.registration.create({
      data: { 
        eventId: eventId, 
        userId: clerkUserId, 
        teamId: team.id, 
        status,
        ...(existingCheckedIn ? { checkedInAt: (existingCheckedIn as any).checkedInAt } : {})
      } as any
    });

    return res.status(201).json({ success: true, registration });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error.' });
  }
});

router.put('/registrations/:id/payment', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { transactionId } = req.body;

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ error: 'Transaction ID is required.' });
    }

    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { event: true }
    });

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found.' });
    }

    if (registration.userId !== req.auth!.userId) {
      return res.status(403).json({ error: 'Forbidden: You cannot upload payment details for another user.' });
    }

    if (registration.event?.registrationDeadline && new Date() > new Date(registration.event.registrationDeadline)) {
      return res.status(400).json({ error: 'Registration deadline has passed.' });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: {
        paymentProofUrl: null,
        transactionId: transactionId.trim()
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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (registration.event?.eventDate && new Date(registration.event.eventDate) < todayStart) {
      return res.status(400).json({ error: 'Cannot approve registrations for an event that has already finished.' });
    }
    if (registration.status === 'CONFIRMED') {
      return res.status(400).json({ error: 'Already confirmed.' });
    }

    const eventName = registration.event?.name ?? 'an event';
    const clubName = registration.event?.club?.name ?? 'the club';

    if (registration.teamId && registration.team) {
      const isLeader = registration.userId === registration.team.leaderId;

      const existingCheckedIn = await prisma.registration.findFirst({
        where: { teamId: registration.teamId, checkedInAt: { not: null } } as any
      });
      const checkedInAtData = existingCheckedIn ? { checkedInAt: (existingCheckedIn as any).checkedInAt } : {};

      if (isLeader) {
        await prisma.registration.update({
          where: { id },
          data: { 
            status: 'CONFIRMED',
            paymentProofUrl: null,
            ...checkedInAtData,
          } as any,
        });

        if (registration.paymentProofUrl) {
          deleteImage(registration.paymentProofUrl).catch(err => console.error('[Storage] Async delete failed:', err));
        }

        await prisma.notification.create({
          data: {
            userId: registration.userId!,
            type: 'registration_approved',
            title: 'Registration Approved',
            body: `Your team leader registration for ${eventName} by ${clubName} has been confirmed.`,
            eventId: registration.eventId,
          },
        });
      } else {
        await prisma.registration.update({
          where: { id },
          data: { 
            status: 'CONFIRMED',
            paymentProofUrl: null,
            ...checkedInAtData,
          } as any,
        });

        await prisma.notification.create({
          data: {
            userId: registration.userId!,
            type: 'registration_approved',
            title: 'Team Join Request Approved',
            body: `Your request to join team "${registration.team.teamName}" for ${eventName} has been approved by ${clubName}!`,
            eventId: registration.eventId,
          },
        });
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

    return res.status(200).json({ message: 'Registration approved and notification sent.' });
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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (registration.event?.eventDate && new Date(registration.event.eventDate) < todayStart) {
      return res.status(400).json({ error: 'Cannot reject registrations for an event that has already finished.' });
    }

    const eventName = registration.event?.name ?? 'an event';
    const clubName = registration.event?.club?.name ?? 'the club';

    if (registration.teamId && registration.team) {
      const isLeader = registration.userId === registration.team.leaderId;

      if (isLeader) {
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
          title: 'Team Registration Rejected',
          body: `Your team registration for ${eventName} by ${clubName} was rejected because the team leader request was rejected. You can now create or join a new team.`,
          eventId: registration.eventId,
        }));

        if (notifData.length > 0) {
          await prisma.notification.createMany({ data: notifData });
        }
      } else {
        await prisma.registration.update({
          where: { id },
          data: { 
            status: 'REJECTED',
            paymentProofUrl: null
          },
        });

        await prisma.notification.create({
          data: {
            userId: registration.userId!,
            type: 'registration_rejected',
            title: 'Team Join Request Rejected',
            body: `Your request to join team "${registration.team.teamName}" for ${eventName} was rejected by ${clubName}. You can now join another team or create your own.`,
            eventId: registration.eventId,
          },
        });
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

router.post('/registrations/verify-ticket', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const { ticketId, eventId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: 'Ticket QR payload is required.' });
    }

    let registration = await prisma.registration.findUnique({
      where: { id: ticketId },
      include: {
        event: { include: { club: true } },
        profile: true,
        team: {
          include: {
            registrations: {
              include: { profile: true },
            },
          },
        },
      },
    });

    if (!registration) {
      // Fallback: check if payload is a Team Passkey
      const teamMatch = await prisma.team.findUnique({
        where: { passkey: ticketId.trim().toUpperCase() },
        include: {
          registrations: {
            include: {
              event: { include: { club: true } },
              profile: true,
              team: {
                include: {
                  registrations: { include: { profile: true } },
                },
              },
            },
          },
        },
      });

      if (teamMatch && teamMatch.registrations.length > 0) {
        const leaderReg = teamMatch.registrations.find((r) => r.profile?.id === teamMatch.leaderId) || teamMatch.registrations[0];
        registration = leaderReg as any;
      }
    }

    if (!registration) {
      return res.status(404).json({ error: 'Invalid or unrecognized ticket QR code or Passkey.' });
    }

    if (eventId && registration.eventId !== eventId) {
      return res.status(400).json({
        error: `This ticket is registered for a different event ("${registration.event.name}"), not this event.`,
      });
    }

    // Check if already checked in — use checkedInAt (separate from approval status)
    if (registration.teamId) {
      const alreadyCheckedIn = !!(registration as any).checkedInAt ||
        (registration.team?.registrations ?? []).some((r: any) => !!(r as any).checkedInAt);
      if (alreadyCheckedIn) {
        return res.status(200).json({
          valid: true,
          alreadyCheckedIn: true,
          message: `Team "${registration.team?.teamName || 'this team'}" has already been checked in.`,
        });
      }
    } else {
      if ((registration as any).checkedInAt) {
        return res.status(200).json({
          valid: true,
          alreadyCheckedIn: true,
          message: 'This ticket has already been checked in.',
        });
      }
    }

    // Mark as checked in using checkedInAt — does NOT touch approval status
    const now = new Date();
    if (registration.teamId) {
      await prisma.registration.updateMany({
        where: { teamId: registration.teamId },
        data: { checkedInAt: now } as any,
      });
    } else {
      await prisma.registration.update({
        where: { id: registration.id },
        data: { checkedInAt: now } as any,
      });
    }
    (registration as any).checkedInAt = now;

    const attendee = registration.profile
      ? {
          id: registration.profile.id,
          name: registration.profile.fullName,
          email: registration.profile.email,
          usn: registration.profile.usn,
          branch: registration.profile.branch,
          phone: registration.profile.phone,
          year: registration.profile.year,
          sem: registration.profile.sem,
          status: registration.status,
        }
      : null;

    let teamData: any = null;
    if (registration.team) {
      const leaderId = registration.team.leaderId;
      const teamRegs = registration.team.registrations || [];

      const members = teamRegs
        .filter((r) => r.profile && r.status !== 'REJECTED')
        .map((r) => ({
          id: r.profile!.id,
          name: r.profile!.fullName,
          email: r.profile!.email,
          usn: r.profile!.usn,
          branch: r.profile!.branch,
          phone: r.profile!.phone,
          year: r.profile!.year,
          sem: r.profile!.sem,
          status: r.status,
          isLeader: r.profile!.id === leaderId,
        }))
        .sort((a, b) => (a.isLeader ? -1 : b.isLeader ? 1 : 0));

      const leader = members.find((m) => m.isLeader) || null;

      teamData = {
        id: registration.team.id,
        name: registration.team.teamName,
        passkey: registration.team.passkey,
        leader,
        members,
      };
    }

    return res.status(200).json({
      valid: true,
      ticket: {
        id: registration.id,
        status: registration.status,
        createdAt: registration.createdAt,
        event: {
          id: registration.event.id,
          title: registration.event.name,
          date: registration.event.eventDate,
          venue: registration.event.venue,
          eventType: registration.event.eventType,
        },
        attendee,
        team: teamData,
      },
    });
  } catch (error: any) {
    console.error('Ticket verification failed:', error);
    return res.status(500).json({ error: error.message || 'Server error during ticket verification.' });
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
