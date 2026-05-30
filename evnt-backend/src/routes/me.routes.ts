import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { authRequired } from "../middleware/auth";
import { publicUser, serializeEvent } from "../utils/serialize";

// Authenticated user-centric endpoints (profile, my events/bookmarks).
export const meRouter = Router();
meRouter.use(authRequired);

const eventInclude = {
  category: { include: { interest: true } },
  creator: true,
  _count: { select: { participations: true } }
};

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional(),
  city: z.string().optional(),
  image: z.string().url().optional(),
  interests: z.array(z.string()).optional()
});

async function resolveInterests(names: string[] = []) {
  if (names.length === 0) return [];

  const [interests, categories] = await Promise.all([
    prisma.interest.findMany({ where: { name: { in: names } } }),
    prisma.category.findMany({ where: { name: { in: names } }, include: { interest: true } })
  ]);

  const byId = new Map<number, (typeof interests)[number]>();
  interests.forEach((interest) => byId.set(interest.id, interest));
  categories.forEach((category) => byId.set(category.interest.id, category.interest));
  return [...byId.values()];
}

meRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const interestRecords = body.interests ? await resolveInterests(body.interests) : null;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name: body.name,
        bio: body.bio,
        city: body.city,
        image: body.image,
        ...(interestRecords
          ? {
              interests: {
                deleteMany: {},
                create: interestRecords.map((i) => ({ interestId: i.id }))
              }
            }
          : {})
      },
      include: { interests: { include: { interest: { include: { categories: true } } } } }
    });
    res.json({ user: publicUser(user) });
  })
);

meRouter.get(
  "/events",
  asyncHandler(async (req, res) => {
    const events = await prisma.event.findMany({
      where: { creatorId: req.userId },
      include: eventInclude,
      orderBy: { dateHour: "asc" }
    });
    res.json({ events: events.map((e) => serializeEvent(e)) });
  })
);

meRouter.get(
  "/bookmarks",
  asyncHandler(async (req, res) => {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.userId },
      include: { event: { include: eventInclude } },
      orderBy: { savedAt: "desc" }
    });
    res.json({ events: bookmarks.map((b) => serializeEvent(b.event, { favorite: true })) });
  })
);

meRouter.get(
  "/participations",
  asyncHandler(async (req, res) => {
    const parts = await prisma.participation.findMany({
      where: { userId: req.userId },
      include: { event: { include: eventInclude } },
      orderBy: { joinedAt: "desc" }
    });
    res.json({ events: parts.map((p) => serializeEvent(p.event, { registered: true })) });
  })
);
