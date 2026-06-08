import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";
import { authRequired } from "../middleware/auth";
import { cleanupOldNotifications, notifyTestPush, runScheduledEventNotifications } from "../utils/notifications";

export const notificationsRouter = Router();
notificationsRouter.use(authRequired);

const pushTokenSchema = z.object({
  deviceId: z.string().trim().max(120).optional(),
  platform: z.string().trim().min(1).max(40),
  token: z.string().trim().min(10).max(255)
});

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
        eventId: n.eventId ? String(n.eventId) : undefined,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString()
      }))
    });
  })
);

notificationsRouter.post(
  "/push-token",
  asyncHandler(async (req, res) => {
    const body = pushTokenSchema.parse(req.body);
    await prisma.pushToken.upsert({
      where: { token: body.token },
      create: {
        deviceId: body.deviceId,
        platform: body.platform,
        token: body.token,
        userId: req.userId!
      },
      update: {
        deviceId: body.deviceId,
        disabled: false,
        platform: body.platform,
        userId: req.userId!
      }
    });
    res.json({ ok: true });
  })
);

notificationsRouter.get(
  "/push-status",
  asyncHandler(async (req, res) => {
    const activeTokens = await prisma.pushToken.count({
      where: { disabled: false, userId: req.userId }
    });
    res.json({ activeTokens });
  })
);

notificationsRouter.post(
  "/test-push",
  asyncHandler(async (req, res) => {
    await notifyTestPush(req.userId!);
    res.json({ ok: true });
  })
);

notificationsRouter.delete(
  "/push-token",
  asyncHandler(async (req, res) => {
    const body = pushTokenSchema.pick({ token: true }).parse(req.body);
    await prisma.pushToken.updateMany({
      where: { token: body.token, userId: req.userId },
      data: { disabled: true }
    });
    res.json({ ok: true });
  })
);

notificationsRouter.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
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
