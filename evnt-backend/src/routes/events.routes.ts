import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../utils/http";
import { authOptional, authRequired } from "../middleware/auth";
import { publishToUser } from "../realtime";
import {
  notifyCapacityMilestones,
  notifyChatMessage,
  notifyEventCancelled,
  notifyEventUpdated,
  notifyNewMatchingEvent
} from "../utils/notifications";
import {
  cancelledEventTag,
  cityTagPrefix,
  cityFromTags,
  eventStatusTagPrefix,
  labelToChatType,
  serializeEvent,
  subcategoryFromTags,
  subcategoryTagPrefix
} from "../utils/serialize";

export const eventsRouter = Router();

// Returns a map eventId -> distanceKm from a given point using PostGIS.
async function distanceMap(lat: number, lng: number): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<{ id: number; km: number }[]>(Prisma.sql`
    SELECT "event_id" AS id,
           ST_Distance("geom"::geography,
                       ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) / 1000 AS km
    FROM "events"
    WHERE NOT (${cancelledEventTag} = ANY("tags"))
  `);
  return new Map(rows.map((r) => [Number(r.id), Number(r.km)]));
}

const eventInclude = {
  category: { include: { interest: true } },
  creator: true,
  _count: { select: { participations: true } }
} satisfies Prisma.EventInclude;

const chatSenderSelect = {
  email: true,
  id: true,
  image: true,
  name: true
} satisfies Prisma.UserSelect;

async function buildContext(userId?: number) {
  if (!userId) return { favorites: new Set<number>(), registered: new Set<number>(), interests: new Set<string>() };
  const [bookmarks, participations, user] = await Promise.all([
    prisma.bookmark.findMany({ where: { userId }, select: { eventId: true } }),
    prisma.participation.findMany({ where: { userId }, select: { eventId: true } }),
    prisma.user.findUnique({
      where: { id: userId },
      include: { interests: { include: { interest: true } } }
    })
  ]);
  return {
    favorites: new Set(bookmarks.map((b) => b.eventId)),
    registered: new Set(participations.map((p) => p.eventId)),
    interests: new Set(user?.interests.map((i) => i.interest.name) ?? [])
  };
}

const listQuery = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  sort: z.enum(["affinity", "distance", "price", "popularity", "date"]).optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional()
});

const knownCategoryTaxonomy: Record<string, { icon: string; interest: string }> = {
  Arte: { icon: "🎨", interest: "Cultura" },
  Benessere: { icon: "🧘", interest: "Benessere" },
  Cinema: { icon: "🎬", interest: "Cinema" },
  Concerto: { icon: "🎸", interest: "Musica" },
  Food: { icon: "🍔", interest: "Gastronomia" },
  Gaming: { icon: "🎮", interest: "Gaming" },
  Serata: { icon: "🌙", interest: "Nightlife" },
  Social: { icon: "🤝", interest: "Socialità" },
  Sport: { icon: "⚽", interest: "Sport" },
  Tech: { icon: "💻", interest: "Tecnologia" },
  Viaggi: { icon: "🧳", interest: "Viaggi" }
};

async function findOrCreateCategory(name: string) {
  const category = await prisma.category.findUnique({ where: { name } });
  if (category) return category;

  const fallback = knownCategoryTaxonomy[name];
  if (!fallback) throw new HttpError(400, `Categoria sconosciuta: ${name}`);

  const interest = await prisma.interest.upsert({
    where: { name: fallback.interest },
    create: { name: fallback.interest },
    update: {}
  });

  return prisma.category.create({
    data: { name, iconCategory: fallback.icon, interestId: interest.id }
  });
}

const optionalTrimmed = (max: number) => z.string().trim().min(1).max(max).optional();

const latitudeSchema = z
  .number()
  .finite()
  .min(-90, "Latitudine non valida")
  .max(90, "Latitudine non valida");

const longitudeSchema = z
  .number()
  .finite()
  .min(-180, "Longitudine non valida")
  .max(180, "Longitudine non valida");

const countryCodeSchema = z
  .string()
  .trim()
  .length(2, "Il codice paese deve avere 2 caratteri")
  .refine((value) => /^[a-z]{2}$/i.test(value), "Codice paese non valido")
  .transform((value) => value.toUpperCase())
  .optional();

function eventIdFromParams(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "Evento non valido");
  }
  return id;
}

function normalizeEventTags(tags: string[], subcategory?: string, city?: string) {
  const seen = new Set<string>();
  const publicTags = tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      if (
        !tag ||
        tag.startsWith(subcategoryTagPrefix) ||
        tag.startsWith(cityTagPrefix) ||
        tag.startsWith(eventStatusTagPrefix)
      ) {
        return false;
      }
      const key = tag.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  const normalizedSubcategory = subcategory?.trim();
  const normalizedCity = city?.trim();

  return [
    ...publicTags,
    normalizedSubcategory ? `${subcategoryTagPrefix}${normalizedSubcategory}` : "",
    normalizedCity ? `${cityTagPrefix}${normalizedCity}` : ""
  ].filter(Boolean);
}

function serializeChatMessage(message: {
  eventId: number;
  id: number;
  sender: {
    email: string;
    id: number;
    image: string | null;
    name: string;
  };
  sentAt: Date;
  text: string;
}) {
  return {
    id: message.id,
    eventId: message.eventId,
    text: message.text,
    sentAt: message.sentAt.toISOString(),
    sender: {
      id: message.sender.id,
      email: message.sender.email,
      name: message.sender.name,
      image: message.sender.image ?? undefined
    }
  };
}

async function getEventChatForUser(eventId: number, userId: number) {
  if (!Number.isInteger(eventId)) {
    throw new HttpError(400, "Evento non valido");
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participations: { select: { userId: true } } }
  });
  if (!event) throw new HttpError(404, "Evento non trovato");
  if (event.tags.includes(cancelledEventTag)) throw new HttpError(410, "Evento annullato");

  const canAccess =
    event.creatorId === userId || event.participations.some((participation) => participation.userId === userId);
  if (!canAccess) {
    throw new HttpError(403, "Iscriviti all'evento per accedere alla chat");
  }

  return event;
}

// GET /events
eventsRouter.get(
  "/",
  authOptional,
  asyncHandler(async (req, res) => {
    const q = listQuery.parse(req.query);

    const where: Prisma.EventWhereInput = {
      NOT: { tags: { has: cancelledEventTag } }
    };
    if (q.category) where.category = { name: q.category };
    if (typeof q.maxPrice === "number") where.price = { lte: q.maxPrice };
    if (q.q) {
      where.OR = [
        { title: { contains: q.q, mode: "insensitive" } },
        { description: { contains: q.q, mode: "insensitive" } },
        { place: { contains: q.q, mode: "insensitive" } },
        { address: { contains: q.q, mode: "insensitive" } },
        { city: { contains: q.q, mode: "insensitive" } },
        { tags: { has: q.q } }
      ];
    }

    const [events, ctx, distances] = await Promise.all([
      prisma.event.findMany({ where, include: eventInclude, orderBy: { dateHour: "asc" } }),
      buildContext(req.userId),
      typeof q.lat === "number" && typeof q.lng === "number"
        ? distanceMap(q.lat, q.lng)
        : Promise.resolve(null)
    ]);

    let result = events.map((e) =>
      serializeEvent(e, {
        favorite: ctx.favorites.has(e.id),
        registered: ctx.registered.has(e.id),
        distanceKm: distances?.get(e.id) ?? null,
        affinity: ctx.interests.has(e.category.interest.name) ? 95 : 72
      })
    );

    switch (q.sort) {
      case "price":
        result = result.sort((a, b) => a.price - b.price);
        break;
      case "popularity":
        result = result.sort((a, b) => b.popularity - a.popularity);
        break;
      case "distance":
        result = result.sort((a, b) => a.distanceKm - b.distanceKm);
        break;
      case "affinity":
        result = result.sort((a, b) => b.affinity - a.affinity);
        break;
      default:
        break;
    }

    res.json({ events: result });
  })
);

// GET /events/:id
eventsRouter.get(
  "/:id",
  authOptional,
  asyncHandler(async (req, res) => {
    const id = eventIdFromParams(req.params.id);
    const event = await prisma.event.findUnique({ where: { id }, include: eventInclude });
    if (!event) throw new HttpError(404, "Evento non trovato");
    const ctx = await buildContext(req.userId);
    res.json({
      event: serializeEvent(event, {
        favorite: ctx.favorites.has(event.id),
        registered: ctx.registered.has(event.id),
        affinity: ctx.interests.has(event.category.interest.name) ? 95 : 72
      })
    });
  })
);

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).default(""),
  dateHour: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date"),
  place: z.string().trim().min(1).max(255),
  address: optionalTrimmed(255),
  city: optionalTrimmed(120),
  province: optionalTrimmed(120),
  region: optionalTrimmed(120),
  postcode: optionalTrimmed(20),
  countryCode: countryCodeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  price: z.number().finite().min(0).max(10000).default(0),
  maxSeats: z.number().int().positive().max(10000).nullable().optional(),
  category: z.string().trim().min(1).max(120),
  chatMode: z.string().optional(),
  countCreator: z.boolean().default(true),
  image: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(140)).max(20).default([]),
  isLive: z.boolean().optional(),
  subcategory: z.string().trim().min(1).max(50).optional()
});

// POST /events
eventsRouter.post(
  "/",
  authRequired,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const category = await findOrCreateCategory(body.category);

    const event = await prisma.event.create({
      data: {
        title: body.title,
        description: body.description,
        dateHour: new Date(body.dateHour),
        place: body.place,
        address: body.address ?? body.place,
        city: body.city,
        province: body.province,
        region: body.region,
        postcode: body.postcode,
        countryCode: body.countryCode,
        latitude: body.latitude,
        longitude: body.longitude,
        price: body.price,
        maxSeats: body.maxSeats ?? null,
        categoryId: category.id,
        chatType: labelToChatType(body.chatMode),
        image: body.image,
        tags: normalizeEventTags(body.tags, body.subcategory, body.city),
        isLive: body.isLive ?? false,
        creatorId: req.userId!,
        participations: body.countCreator ? { create: { userId: req.userId! } } : undefined
      },
      include: eventInclude
    });

    await notifyNewMatchingEvent(event.id);

    res.status(201).json({ event: serializeEvent(event, { registered: body.countCreator }) });
  })
);

// PUT /events/:id (creator only)
eventsRouter.put(
  "/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const id = eventIdFromParams(req.params.id);
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing || existing.tags.includes(cancelledEventTag)) throw new HttpError(404, "Evento non trovato");
    if (existing.creatorId !== req.userId) throw new HttpError(403, "Non sei il creatore");

    const body = createSchema.partial().parse(req.body);
    let categoryId: number | undefined;
    if (body.category) {
      const category = await findOrCreateCategory(body.category);
      categoryId = category.id;
    }
    const nextSubcategory = body.subcategory ?? subcategoryFromTags(existing.tags);
    const nextCity = body.city ?? existing.city ?? cityFromTags(existing.tags);
    const tags =
      body.tags || body.subcategory || body.city
        ? normalizeEventTags(body.tags ?? existing.tags, nextSubcategory, nextCity)
        : undefined;

    const event = await prisma.event.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        dateHour: body.dateHour ? new Date(body.dateHour) : undefined,
        place: body.place,
        address: body.address ?? (body.place ? body.place : undefined),
        city: body.city,
        province: body.province,
        region: body.region,
        postcode: body.postcode,
        countryCode: body.countryCode,
        latitude: body.latitude,
        longitude: body.longitude,
        price: body.price,
        maxSeats: body.maxSeats,
        categoryId,
        chatType: body.chatMode ? labelToChatType(body.chatMode) : undefined,
        image: body.image,
        tags,
        isLive: body.isLive
      },
      include: eventInclude
    });
    await notifyEventUpdated(existing, event);
    res.json({ event: serializeEvent(event) });
  })
);

// DELETE /events/:id (creator only)
eventsRouter.delete(
  "/:id",
  authRequired,
  asyncHandler(async (req, res) => {
    const id = eventIdFromParams(req.params.id);
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) throw new HttpError(404, "Evento non trovato");
    if (existing.creatorId !== req.userId) throw new HttpError(403, "Non sei il creatore");
    if (!existing.tags.includes(cancelledEventTag)) {
      await notifyEventCancelled(existing);
      await prisma.event.update({
        where: { id },
        data: { tags: [...existing.tags, cancelledEventTag] }
      });
    }
    res.status(204).send();
  })
);

// POST /events/:id/join  &  DELETE /events/:id/join
eventsRouter.post(
  "/:id/join",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    const count = await prisma
      .$transaction(
        async (tx) => {
          const event = await tx.event.findUnique({
            where: { id: eventId },
            include: { _count: { select: { participations: true } } }
          });
          if (!event || event.tags.includes(cancelledEventTag)) throw new HttpError(404, "Evento non trovato");

          const already = await tx.participation.findUnique({
            where: { userId_eventId: { userId: req.userId!, eventId } }
          });
          if (!already && event.maxSeats && event._count.participations >= event.maxSeats) {
            throw new HttpError(409, "Evento al completo");
          }

          await tx.participation.upsert({
            where: { userId_eventId: { userId: req.userId!, eventId } },
            create: { userId: req.userId!, eventId },
            update: {}
          });
          return tx.participation.count({ where: { eventId } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
      .catch((error) => {
        if (error instanceof HttpError) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
          throw new HttpError(409, "Evento al completo. Riprova tra poco.");
        }
        throw error;
      });
    await notifyCapacityMilestones(eventId);
    res.json({ registered: true, participants: count });
  })
);

eventsRouter.delete(
  "/:id/join",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    await prisma.participation
      .delete({ where: { userId_eventId: { userId: req.userId!, eventId } } })
      .catch(() => undefined);
    const count = await prisma.participation.count({ where: { eventId } });
    res.json({ registered: false, participants: count });
  })
);

// POST /events/:id/bookmark  &  DELETE /events/:id/bookmark
eventsRouter.post(
  "/:id/bookmark",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, tags: true } });
    if (!event || event.tags.includes(cancelledEventTag)) throw new HttpError(404, "Evento non trovato");
    await prisma.bookmark.upsert({
      where: { userId_eventId: { userId: req.userId!, eventId } },
      create: { userId: req.userId!, eventId },
      update: {}
    });
    res.json({ favorite: true });
  })
);

eventsRouter.delete(
  "/:id/bookmark",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    await prisma.bookmark
      .delete({ where: { userId_eventId: { userId: req.userId!, eventId } } })
      .catch(() => undefined);
    res.json({ favorite: false });
  })
);

// ---- Chat messages -------------------------------------------------------
eventsRouter.get(
  "/:id/messages",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    await getEventChatForUser(eventId, req.userId!);
    const messages = await prisma.chatMessage.findMany({
      where: { eventId },
      orderBy: { sentAt: "asc" },
      include: { sender: { select: chatSenderSelect } }
    });
    res.json({ messages: messages.map(serializeChatMessage) });
  })
);

const messageSchema = z.object({ text: z.string().min(1).max(2000) });

eventsRouter.post(
  "/:id/messages",
  authRequired,
  asyncHandler(async (req, res) => {
    const eventId = eventIdFromParams(req.params.id);
    const { text } = messageSchema.parse(req.body);
    const event = await getEventChatForUser(eventId, req.userId!);
    if (event.chatType === "ANNOUNCEMENTS" && event.creatorId !== req.userId) {
      throw new HttpError(403, "Solo il creatore puo scrivere in questa chat");
    }
    const message = await prisma.chatMessage.create({
      data: { eventId, senderId: req.userId!, text },
      include: { sender: { select: chatSenderSelect } }
    });
    const serializedMessage = serializeChatMessage(message);
    const audience = [...new Set([event.creatorId, ...event.participations.map((participation) => participation.userId)])];
    audience.forEach((userId) => {
      publishToUser(userId, {
        payload: { eventId: String(eventId), message: serializedMessage },
        type: "event-message"
      });
    });
    await notifyChatMessage(eventId, req.userId!, message.sender.name);
    res.status(201).json({ message: serializedMessage });
  })
);
