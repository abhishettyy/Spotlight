import { Router, Request, Response } from 'express';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';

const router = Router();

// GET /api/notifications — fetch notifications for the logged-in user (Protected)
// Automatically filters out notifications associated with past events.
router.get('/', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const now = new Date();

    const notifications = await prisma.notification.findMany({
      where: { 
        userId: userId,
        OR: [
          { eventId: null },
          {
            event: {
              eventDate: { gte: now }
            }
          }
        ]
      },
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

// PUT /api/notifications/:id/read — mark a single notification as read (Protected)
router.put('/:id/read', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const id = req.params.id as string;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notifications/:id — delete a single notification (Protected)
router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const id = req.params.id as string;

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif || notif.userId !== userId) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'Notification deleted.' });
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
          eventId: event.id,
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
