import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { uploadBase64Image, deleteImage } from '../utils/storage';
import { filterVisibleRegistrations, mapClubRegistration } from '../utils/registrations';
import { campusNow, campusEventHasEnded } from '../utils/time';
import { readAllowedBranches } from '../utils/branches';
import { getClubSignupAlertEmails, cleanAlertEmails, saveClubSignupAlertEmails, MAX_ALERT_EMAILS } from '../utils/settings';
import { ADMIN_PROFILE_ID, requireAdmin, signAdminToken, isThrottled, recordFailure, clearFailures } from '../utils/admin';
import { verifyGoogleUser } from '../utils/google';
import { sendClubApprovedEmail } from '../utils/mailer';
import { submitClubApplication, readApplicationDetails, ClubApplicationError } from '../utils/clubApplications';

const router = Router();
const SALT_ROUNDS = 10;

router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    // Students only ever see approved clubs
    const clubs = await prisma.club.findMany({
      where: { status: 'APPROVED' },
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

router.post('/check-email', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [existingClub, existingProfile] = await Promise.all([
      prisma.club.findUnique({ where: { email: cleanEmail } }),
      prisma.profile.findUnique({ where: { email: cleanEmail } }),
    ]);

    if (existingClub?.status === 'PENDING') {
      return res.status(400).json({ exists: true, error: 'A registration for this email is already awaiting admin approval.' });
    }
    if (existingClub?.status === 'APPROVED') {
      return res.status(400).json({ exists: true, error: 'This email address is already registered to a club.' });
    }

    // A rejected club may sign up again with the same email (its own club-admin profile included)
    if (existingProfile && !(existingClub && existingProfile.clubId === existingClub.id)) {
      if (existingProfile.clubId === null && existingProfile.password !== null) {
        return res.status(400).json({ exists: true, error: 'This email address is already registered to a student account.' });
      }
      return res.status(400).json({ exists: true, error: 'This email address is already registered.' });
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
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const admin = await prisma.profile.findUnique({ where: { id: ADMIN_PROFILE_ID } });
    const emailOk = !!admin && admin.email.toLowerCase() === email.trim().toLowerCase();
    const ok = emailOk && !!admin?.password && await bcrypt.compare(password, admin.password);
    if (!ok) {
      recordFailure(key);
      return res.status(401).json({ error: 'Incorrect admin email or password.' });
    }
    clearFailures(key);
    return res.status(200).json({ token: signAdminToken() });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin sign-in with the Google account whose email is the admin profile's email
router.post('/admin/google', async (req: Request, res: Response): Promise<any> => {
  try {
    const key = req.ip || 'unknown';
    if (isThrottled(key)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
    const { credential, access_token } = req.body;
    if (!credential && !access_token) {
      return res.status(400).json({ error: 'Google credential or access token is required.' });
    }
    const googleUser = await verifyGoogleUser(credential, access_token);
    if (!googleUser) {
      return res.status(401).json({ error: 'Google sign-in could not be verified. Please try again.' });
    }
    const admin = await prisma.profile.findUnique({ where: { id: ADMIN_PROFILE_ID } });
    if (!admin || admin.email.toLowerCase() !== googleUser.email.toLowerCase()) {
      recordFailure(key);
      return res.status(403).json({ error: 'This Google account is not the Spotlight admin.' });
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

// Admin settings: the emails told about each new club sign-up
router.get('/admin/settings', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    return res.status(200).json({ signupAlertEmails: await getClubSignupAlertEmails(), maxSignupAlertEmails: MAX_ALERT_EMAILS });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/admin/settings', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const result = cleanAlertEmails(req.body?.signupAlertEmails);
    if ('error' in result) return res.status(400).json({ error: result.error });
    await saveClubSignupAlertEmails(result.emails);
    return res.status(200).json({ signupAlertEmails: result.emails });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ── Admin: students ─────────────────────────────────────────────────────────
// Student accounts are profiles with no club, other than the admin's own profile.
const studentWhere = { clubId: null, NOT: { id: ADMIN_PROFILE_ID } } as const;

// Every student with only the details the admin list shows, A-Z by name
router.get('/admin/students', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const profiles = await prisma.profile.findMany({
      where: studentWhere,
      select: { id: true, fullName: true, usn: true, branch: true, email: true },
      orderBy: { fullName: 'asc' },
    });
    const students = profiles.map((p) => ({ id: p.id, name: p.fullName, usn: p.usn, branch: p.branch, email: p.email }));
    return res.status(200).json({ students });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Permanently deletes a student account with its registrations, tickets and notifications.
// A team the student leads passes to its earliest other member, or is removed if nobody is left.
router.delete('/admin/students/:id', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const student = await prisma.profile.findFirst({ where: { id, ...studentWhere }, select: { id: true, email: true, fullName: true } });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    await prisma.$transaction(async (tx) => {
      const ledTeams = await tx.team.findMany({ where: { leaderId: id }, select: { id: true } });
      for (const team of ledTeams) {
        const nextLeader = await tx.registration.findFirst({
          where: { teamId: team.id, userId: { not: id }, status: { in: ['PENDING', 'CONFIRMED'] } },
          orderBy: { createdAt: 'asc' },
          select: { userId: true },
        });
        if (nextLeader) await tx.team.update({ where: { id: team.id }, data: { leaderId: nextLeader.userId } });
        else await tx.team.delete({ where: { id: team.id } });
      }
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.passwordReset.deleteMany({ where: { email: student.email } });
      // Registrations go with the profile (onDelete: Cascade)
      await tx.profile.delete({ where: { id } });
    });

    console.log(`[Admin] Deleted student ${student.email}`);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete student error:', error);
    return res.status(500).json({ error: error.message });
  }
});

const applicationSelect = {
  id: true,
  name: true,
  email: true,
  logoUrl: true,
  description: true,
  department: true,
  coordinatorName: true,
  coordinatorPhone: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  reviewedAt: true,
} as const;

// Every club with its sign-up details and approval state, newest first, for the admin console
router.get('/applications', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const clubs = await prisma.club.findMany({
      select: applicationSelect,
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ clubs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/approve', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return res.status(404).json({ error: 'Club not found.' });
    if (club.status === 'APPROVED') return res.status(400).json({ error: 'This club is already approved.' });

    const updated = await prisma.club.update({
      where: { id },
      data: { status: 'APPROVED', rejectionReason: null, reviewedAt: new Date() },
      select: applicationSelect,
    });
    console.log(`[Admin] Approved club "${updated.name}" (${updated.id})`);

    const emailSent = await sendClubApprovedEmail(updated);
    return res.status(200).json({ club: updated, emailSent });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/:id/reject', requireAdmin, async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    const club = await prisma.club.findUnique({ where: { id } });
    if (!club) return res.status(404).json({ error: 'Club not found.' });
    if (club.status !== 'PENDING') return res.status(400).json({ error: 'Only pending registrations can be rejected.' });

    const updated = await prisma.club.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason || null, reviewedAt: new Date() },
      select: applicationSelect,
    });
    console.log(`[Admin] Rejected club "${updated.name}" (${updated.id})`);
    return res.status(200).json({ club: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Club sign-up. Files the registration as PENDING; the club can sign in once the admin approves it.
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const details = readApplicationDetails(req.body);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const club = await submitClubApplication({ email, passwordHash, details });

    console.log(`Club registration submitted: "${club.name}" (${club.id})`);
    return res.status(201).json({
      pending: true,
      message: 'Registration submitted. You can sign in once an admin approves your club.',
      club: { id: club.id, name: club.name, email: club.email, status: club.status },
    });
  } catch (error: any) {
    if (error instanceof ClubApplicationError) {
      return res.status(400).json({ error: error.message });
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
        allowedBranches: readAllowedBranches(e.allowedBranches),
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
