import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// GET /api/notifications — fetch notifications for the logged-in user (Protected)
router.get('/', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;

    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.status(200).json({ notifications, unreadCount });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read — mark all notifications as read (Protected)
router.put('/read', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;

    await prisma.notification.updateMany({
      where: { userId: userId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'All notifications marked as read.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/notifications/event-reminders — called by a daily cron job (Public with secure validation)
router.post('/event-reminders', async (req: Request, res: Response): Promise<any> => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    // Find all events happening today
    const todayEvents = await prisma.event.findMany({
      where: {
        eventDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { club: true },
    });

    if (todayEvents.length === 0) {
      return res.status(200).json({ message: 'No events today.' });
    }

    let totalSent = 0;

    for (const event of todayEvents) {
      // Find all confirmed registrations for this event
      const registrations = await prisma.registration.findMany({
        where: { eventId: event.id, status: 'CONFIRMED' },
      });

      if (registrations.length === 0) continue;

      const eventTime = event.eventDate
        ? event.eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'today';

      const notifData = registrations
        .filter(r => r.userId)
        .map(r => ({
          userId: r.userId!,
          type: 'event_reminder',
          title: `${event.name} is Today! 📅`,
          body: `Your event starts at ${eventTime}. Venue: ${event.club?.name ?? 'TBD'}. Don't forget to bring your ticket!`,
        }));

      await prisma.notification.createMany({ data: notifData });
      totalSent += notifData.length;
    }

    return res.status(200).json({ message: `Sent ${totalSent} event reminder notifications.` });
  } catch (error: any) {
    console.error('Event reminders error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
