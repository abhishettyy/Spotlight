import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db';
import { requireAuth } from '../middlewares/auth';
import { campusNow, campusTodayStart } from '../utils/time';

const router = Router();

function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

router.get('/', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const now = campusNow();

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

router.put('/:id/read', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const id = req.params.id as string;
    console.log(`[Notifications] PUT /${id}/read requested by user ${userId}`);

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) {
      console.log(`[Notifications] PUT /${id}/read - notification not found in database.`);
      return res.status(404).json({ error: 'Notification not found.' });
    }

    console.log(`[Notifications] PUT /${id}/read - found notification: owner=${notif.userId}, requestUser=${userId}`);
    if (notif.userId !== userId) {
      console.log(`[Notifications] PUT /${id}/read - unauthorized: owner ${notif.userId} != requester ${userId}`);
      return res.status(404).json({ error: 'Notification not found.' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    console.log(`[Notifications] PUT /${id}/read - successfully updated in DB: isRead=${updated.isRead}`);

    return res.status(200).json({ message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error(`[Notifications] PUT /:id/read error:`, error);
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', requireAuth, async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.auth!.userId;
    const id = req.params.id as string;
    console.log(`[Notifications] DELETE /${id} requested by user ${userId}`);

    const notif = await prisma.notification.findUnique({ where: { id } });
    if (!notif) {
      console.log(`[Notifications] DELETE /${id} - notification not found in database.`);
      return res.status(404).json({ error: 'Notification not found.' });
    }

    console.log(`[Notifications] DELETE /${id} - found notification: owner=${notif.userId}, requestUser=${userId}`);
    if (notif.userId !== userId) {
      console.log(`[Notifications] DELETE /${id} - unauthorized: owner ${notif.userId} != requester ${userId}`);
      return res.status(404).json({ error: 'Notification not found.' });
    }

    await prisma.notification.delete({
      where: { id },
    });
    console.log(`[Notifications] DELETE /${id} - successfully deleted from DB.`);

    return res.status(200).json({ message: 'Notification deleted.' });
  } catch (error: any) {
    console.error(`[Notifications] DELETE /:id error:`, error);
    return res.status(500).json({ error: error.message });
  }
});

// Sends "event is today" reminders. Meant for a scheduled job, which must send the
// X-Cron-Secret header matching CRON_SECRET; without CRON_SECRET set the endpoint is off.
router.post('/event-reminders', async (req: Request, res: Response): Promise<any> => {
  const cronSecret = process.env.CRON_SECRET;
  const sentSecret = req.headers['x-cron-secret'];
  if (!cronSecret || typeof sentSecret !== 'string' || !secretsMatch(sentSecret, cronSecret)) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  try {
    const startOfDay = campusTodayStart();
    const endOfDay   = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate(), 23, 59, 59);

    const todayEvents = await prisma.event.findMany({
      where: {
        eventDate: { gte: startOfDay, lte: endOfDay },
        isDraft: false,
      },
      include: { club: true },
    });

    if (todayEvents.length === 0) {
      return res.status(200).json({ message: 'No events today.' });
    }

    let totalSent = 0;

    for (const event of todayEvents) {

      const [registrations, alreadyReminded] = await Promise.all([
        prisma.registration.findMany({
          where: { eventId: event.id, status: 'CONFIRMED' },
          select: { userId: true },
        }),
        prisma.notification.findMany({
          where: { eventId: event.id, type: 'event_reminder' },
          select: { userId: true },
        }),
      ]);

      // A second run on the same day only reaches people not reminded yet
      const remindedIds = new Set(alreadyReminded.map(n => n.userId));
      const userIds = [...new Set(registrations.map(r => r.userId))].filter(id => !remindedIds.has(id));
      if (userIds.length === 0) continue;

      const eventTime = event.eventDate
        ? event.eventDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'today';

      const notifData = userIds.map(userId => ({
        userId,
        type: 'event_reminder',
        title: `${event.name} is Today!`,
        body: `Your event starts at ${eventTime}. Venue: ${event.venue || 'TBD'}.`,
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
