import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// GET /api/profiles/:id — get profile by ID (Public)
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = req.params.id as string;
    const profile = await prisma.profile.findUnique({ where: { id } });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ profile: safeProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/update — Onboarding update (USN / branch / phone) (Protected)
router.put('/update', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { usn, branch, phone } = req.body;

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: { usn, branch, phone }
    });

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Profile updated successfully', profile: safeProfile });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/profiles/edit — Full profile edit (name, USN, branch, phone, year, sem) (Protected)
router.put('/edit', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { full_name, usn, branch, phone, year, sem } = req.body;

    if (usn) {
      const existing = await prisma.profile.findUnique({ where: { usn } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'This USN is already registered to another account.' });
      }
    }

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        fullName: full_name || undefined,
        usn: usn || undefined,
        branch: branch || undefined,
        phone: phone || undefined,
        year: year ? parseInt(year, 10) : undefined,
        sem: sem ? parseInt(sem, 10) : undefined,
      }
    });

    const { password: _pw, ...safeProfile } = profile as any;
    safeProfile.hasPassword = !!profile.password;
    return res.status(200).json({ message: 'Profile updated successfully', profile: safeProfile });
  } catch (error: any) {
    console.error('Profile edit error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/profiles/:id/stats — Profile Stats (Public)
router.get('/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.params.id as string;

    // Count total registrations (events attended/registered)
    const eventsCount = await prisma.registration.count({
      where: { userId: userId },
    });

    // Count distinct clubs from the user's registered events
    const registrations = await prisma.registration.findMany({
      where: { userId: userId },
      include: { event: { select: { clubId: true } } },
    });

    const uniqueClubIds = new Set(
      registrations
        .map(r => r.event?.clubId)
        .filter((id): id is string => id != null)
    );

    return res.status(200).json({
      eventsCount,
      clubsCount: uniqueClubIds.size,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
