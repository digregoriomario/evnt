import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { hashPassword, verifyPassword } from "../utils/password";
import { signToken } from "../utils/jwt";
import { publicUser } from "../utils/serialize";
import { authRequired } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  birthDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  city: z.string().optional(),
  bio: z.string().optional(),
  image: z.string().url().optional(),
  interests: z.array(z.string()).optional()
});

const ageInYears = (birth: Date) => {
  const diff = Date.now() - birth.getTime();
  return diff / (1000 * 60 * 60 * 24 * 365.25);
};

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

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const birthday = new Date(body.birthDate);
    if (ageInYears(birthday) < 16) {
      throw new HttpError(403, "Devi avere almeno 16 anni per registrarti");
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) throw new HttpError(409, "Email gia registrata");

    const interestRecords = await resolveInterests(body.interests);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        password: await hashPassword(body.password),
        birthday,
        city: body.city,
        bio: body.bio,
        image: body.image,
        interests: {
          create: interestRecords.map((i) => ({ interestId: i.id }))
        }
      },
      include: { interests: { include: { interest: { include: { categories: true } } } } }
    });

    const token = signToken({ userId: user.id });
    res.status(201).json({ token, user: publicUser(user) });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { interests: { include: { interest: { include: { categories: true } } } } }
    });
    if (!user || !(await verifyPassword(body.password, user.password))) {
      throw new HttpError(401, "Credenziali non valide");
    }
    const token = signToken({ userId: user.id });
    res.json({ token, user: publicUser(user) });
  })
);

authRouter.get(
  "/me",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { interests: { include: { interest: { include: { categories: true } } } } }
    });
    if (!user) throw new HttpError(404, "Utente non trovato");
    res.json({ user: publicUser(user) });
  })
);
