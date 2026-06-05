import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authRequired } from "../middleware/auth";
import { asyncHandler } from "../utils/http";

export const usersRouter = Router();
usersRouter.use(authRequired);

const searchQuery = z.object({
  email: z.string().trim().toLowerCase().email()
});

usersRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { email } = searchQuery.parse(req.query);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, city: true, image: true }
    });

    if (!user || user.id === req.userId) {
      res.json({ user: null });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        city: user.city ?? "",
        avatar: user.image ?? undefined
      }
    });
  })
);
