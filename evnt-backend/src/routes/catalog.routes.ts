import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/http";

export const catalogRouter = Router();

catalogRouter.get(
  "/interests",
  asyncHandler(async (_req, res) => {
    const interests = await prisma.interest.findMany({ orderBy: { name: "asc" } });
    res.json({ interests: interests.map((i) => ({ id: i.id, name: i.name })) });
  })
);

catalogRouter.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
      include: { interest: true }
    });
    res.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.iconCategory,
        interest: c.interest.name
      }))
    });
  })
);
