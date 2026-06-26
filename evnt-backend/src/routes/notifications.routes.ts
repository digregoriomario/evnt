import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";
import { authRequired } from "../middleware/auth";
import { cleanupOldNotifications, runScheduledEventNotifications } from "../utils/notifications";

export const notificationsRouter = Router();
notificationsRouter.use(authRequired);

const notificationIdSchema = z.coerce.number().int().positive();

function notificationEventId(notification: { dedupeKey: string | null; eventId: number | null }) {
  if (notification.eventId) {
    return String(notification.eventId);
  }

  return notification.dedupeKey?.match(/^event-cancelled:\d+:(\d+)$/)?.[1];
}

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    await cleanupOldNotifications();
    await runScheduledEventNotifications();
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      take: 80,
      orderBy: { createdAt: "desc" }
    });
    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        eventId: notificationEventId(n),
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString()
      }))
    });
  })
);

notificationsRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({
      where: { userId: req.userId }
    });
    res.json({ ok: true });
  })
);

notificationsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = notificationIdSchema.parse(req.params.id);
    await prisma.notification.deleteMany({
      where: { id, userId: req.userId }
    });
    res.json({ ok: true });
  })
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const id = notificationIdSchema.parse(req.params.id);
    await prisma.notification.updateMany({
      where: { id, userId: req.userId },
      data: { isRead: true }
    });
    res.json({ ok: true });
  })
);

notificationsRouter.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ ok: true });
  })
);
