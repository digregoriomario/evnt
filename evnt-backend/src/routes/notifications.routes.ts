import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";
import { authRequired } from "../middleware/auth";

export const notificationsRouter = Router();
notificationsRouter.use(authRequired);

notificationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString()
      }))
    });
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
