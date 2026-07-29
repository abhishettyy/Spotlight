import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';

const router = Router();

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

router.put('/edit', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const { full_name, usn, branch, phone, year, sem } = req.body;

    const currentProfile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!currentProfile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    let finalUsn = currentProfile.usn;
    if (!finalUsn && usn && typeof usn === 'string' && usn.trim()) {
      const cleanUsn = usn.trim();
      const existing = await prisma.profile.findUnique({ where: { usn: cleanUsn } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'This USN is already registered to another account.' });
      }
      finalUsn = cleanUsn;
    }

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        fullName: full_name !== undefined ? (full_name ? String(full_name).trim() : null) : undefined,
        usn: finalUsn !== undefined ? (finalUsn ? String(finalUsn).trim() : null) : undefined,
        branch: branch !== undefined ? (branch ? String(branch).trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        year: year !== undefined && year !== '' ? parseInt(String(year), 10) : undefined,
        sem: sem !== undefined && sem !== '' ? parseInt(String(sem), 10) : undefined,
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

router.get('/:id/stats', async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.params.id as string;

    const eventsCount = await prisma.registration.count({
      where: { userId: userId },
    });

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
