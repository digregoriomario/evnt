import { NotificationType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { eventCleanupNow } from "./eventsCleanup";
import { cityFromPlace, cityFromTags } from "./serialize";

const scheduledNotificationIntervalMs = 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;
const readNotificationRetentionMs = dayMs;
const hardNotificationRetentionMs = 7 * dayMs;
const expoPushEndpoint = "https://exp.host/--/api/v2/push/send";
const pushEnabledTypes = new Set<NotificationType>([
  "NEW_MATCH",
  "SAVED_EVENT_REMINDER",
  "EVENT_STARTING",
  "EVENT_UPDATED",
  "EVENT_CANCELLED",
  "LOW_SEATS",
  "EVENT_FULL",
  "CHAT_MESSAGE",
  "ORGANIZER_ANNOUNCEMENT"
]);

type NotificationInput = {
  dedupeKey?: string;
  eventId?: number;
  message: string;
  pushMode?: PushDeliveryMode;
  title: string;
  type: NotificationType;
  userId: number;
};

type PushDeliveryMode = "await" | "background";

type EventSnapshot = {
  address?: string | null;
  city?: string | null;
  creatorId: number;
  dateHour: Date;
  id: number;
  maxSeats: number | null;
  place: string;
  title: string;
};

type CreatedNotification = {
  eventId: number | null;
  id: number;
  message: string;
  title: string;
  type: NotificationType;
  userId: number;
};

type ExpoPushTicket = {
  details?: { error?: string };
  id?: string;
  message?: string;
  status: "ok" | "error";
};

type ExpoPushResponse = {
  data?: ExpoPushTicket | ExpoPushTicket[];
  errors?: unknown[];
};

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function eventTimeLabel(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function uniqueUserIds(ids: number[]) {
  return [...new Set(ids.filter((id) => Number.isInteger(id)))];
}

async function createNotification(input: NotificationInput) {
  const data = {
    eventId: input.eventId,
    message: input.message,
    title: input.title,
    type: input.type,
    userId: input.userId
  };

  if (!input.dedupeKey) {
    const notification = await prisma.notification.create({ data });
    await dispatchPushForNotification(notification, input.pushMode);
    return;
  }

  const existing = await prisma.notification.findFirst({
    where: { dedupeKey: input.dedupeKey },
    select: { id: true }
  });
  if (existing) {
    return;
  }

  const notification = await prisma.notification.create({ data: { ...data, dedupeKey: input.dedupeKey } });
  await dispatchPushForNotification(notification, input.pushMode);
}

async function createNotifications(inputs: NotificationInput[]) {
  await Promise.all(inputs.map((input) => createNotification(input)));
}

export async function cleanupOldNotifications(now = eventCleanupNow()) {
  const readCutoff = new Date(now.getTime() - readNotificationRetentionMs);
  const hardCutoff = new Date(now.getTime() - hardNotificationRetentionMs);

  return prisma.notification.deleteMany({
    where: {
      OR: [
        { isRead: true, createdAt: { lt: readCutoff } },
        { createdAt: { lt: hardCutoff } }
      ]
    }
  });
}

async function sendPushForNotification(notification: CreatedNotification) {
  if (!pushEnabledTypes.has(notification.type)) {
    return;
  }

  try {
    const pushTokens = await prisma.pushToken.findMany({
      where: { disabled: false, userId: notification.userId },
      select: { token: true }
    });
    if (pushTokens.length === 0) {
      return;
    }

    const messages = pushTokens.map(({ token }) => ({
      to: token,
      sound: "default",
      title: notification.title,
      body: notification.message,
      channelId: "events",
      data: {
        eventId: notification.eventId ? String(notification.eventId) : undefined,
        notificationId: String(notification.id),
        type: notification.type
      }
    }));

    const response = await fetch(expoPushEndpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed with ${response.status}`);
    }

    const payload = (await response.json()) as ExpoPushResponse;
    const tickets = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
    const invalidTokens = tickets
      .map((ticket, index) =>
        ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered"
          ? pushTokens[index]?.token
          : null
      )
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      await prisma.pushToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { disabled: true }
      });
    }
  } catch (error) {
    console.error("Failed to send push notification", error);
  }
}

async function dispatchPushForNotification(
  notification: CreatedNotification,
  mode: PushDeliveryMode = "background"
) {
  if (mode === "await") {
    await sendPushForNotification(notification);
    return;
  }

  void sendPushForNotification(notification);
}

export async function notifyNewMatchingEvent(eventId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { category: true }
  });
  if (!event) {
    return;
  }

  const eventAddress = event.address ?? event.place;
  const eventCity = event.city ?? cityFromTags(event.tags) ?? cityFromPlace(eventAddress);
  const users = await prisma.user.findMany({
    where: {
      id: { not: event.creatorId },
      interests: { some: { interestId: event.category.interestId } }
    },
    select: { city: true, id: true }
  });
  const audience = users.filter(
    (user) => !eventCity || !user.city || normalizeText(user.city) === normalizeText(eventCity)
  );
  const cityLabel = eventCity || eventAddress;

  await createNotifications(
    audience.map((user) => ({
      dedupeKey: `new-match:${user.id}:${event.id}`,
      eventId: event.id,
      message: `C'e un evento di ${event.category.name} vicino a ${cityLabel} che combacia con i tuoi interessi.`,
      title: "Nuovo evento per te",
      type: "NEW_MATCH",
      userId: user.id
    }))
  );
}

export async function notifyEventUpdated(before: EventSnapshot, after: EventSnapshot) {
  const changedDate = before.dateHour.getTime() !== after.dateHour.getTime();
  const changedPlace =
    normalizeText(before.address ?? before.place) !== normalizeText(after.address ?? after.place);
  if (!changedDate && !changedPlace) {
    return;
  }

  const participants = await prisma.participation.findMany({
    where: { eventId: after.id, userId: { not: after.creatorId } },
    select: { userId: true }
  });

  await createNotifications(
    uniqueUserIds(participants.map((participant) => participant.userId)).map((userId) => ({
      eventId: after.id,
      message: `L'organizzatore ha modificato orario o luogo di ${after.title}.`,
      title: "Evento aggiornato",
      type: "EVENT_UPDATED",
      userId
    }))
  );
}

export async function notifyEventCancelled(event: EventSnapshot) {
  const [participants, bookmarks] = await Promise.all([
    prisma.participation.findMany({ where: { eventId: event.id }, select: { userId: true } }),
    prisma.bookmark.findMany({ where: { eventId: event.id }, select: { userId: true } })
  ]);

  const userIds = uniqueUserIds([
    ...participants.map((participant) => participant.userId),
    ...bookmarks.map((bookmark) => bookmark.userId)
  ]).filter((userId) => userId !== event.creatorId);

  await createNotifications(
    userIds.map((userId) => ({
      dedupeKey: `event-cancelled:${userId}:${event.id}`,
      message: `${event.title} e stato annullato dall'organizzatore.`,
      pushMode: "await",
      title: "Evento annullato",
      type: "EVENT_CANCELLED",
      userId
    }))
  );
}

export async function notifyCapacityMilestones(eventId: number) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      bookmarks: { select: { userId: true } },
      _count: { select: { participations: true } }
    }
  });
  if (!event?.maxSeats) {
    return;
  }

  const participants = event._count.participations;
  const remainingSeats = event.maxSeats - participants;
  const lowSeatThreshold = Math.max(1, Math.min(3, Math.ceil(event.maxSeats * 0.2)));

  if (remainingSeats > 0 && remainingSeats <= lowSeatThreshold) {
    await createNotifications(
      uniqueUserIds(event.bookmarks.map((bookmark) => bookmark.userId))
        .filter((userId) => userId !== event.creatorId)
        .map((userId) => ({
          dedupeKey: `low-seats:${userId}:${event.id}`,
          eventId: event.id,
          message: `Restano pochi posti per ${event.title}.`,
          title: "Ultimi posti disponibili",
          type: "LOW_SEATS",
          userId
        }))
    );
  }

  if (remainingSeats <= 0) {
    const usersToNotify = uniqueUserIds([
      event.creatorId,
      ...event.bookmarks.map((bookmark) => bookmark.userId)
    ]);
    await createNotifications(
      usersToNotify.map((userId) => ({
        dedupeKey: `event-full:${userId}:${event.id}`,
        eventId: event.id,
        message: `${event.title} ha raggiunto il numero massimo di partecipanti.`,
        title: "Evento al completo",
        type: "EVENT_FULL",
        userId
      }))
    );
  }
}

export async function notifyChatMessage(eventId: number, senderId: number, senderName: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { participations: { select: { userId: true } } }
  });
  if (!event) {
    return;
  }

  const isOrganizerMessage = event.creatorId === senderId;
  const title = isOrganizerMessage ? "Messaggio dall'organizzatore" : "Nuovo messaggio";
  const message = isOrganizerMessage
    ? `${senderName} ha pubblicato un aggiornamento per ${event.title}.`
    : `${senderName} ha scritto nella chat di ${event.title}.`;
  const type: NotificationType = isOrganizerMessage ? "ORGANIZER_ANNOUNCEMENT" : "CHAT_MESSAGE";

  await createNotifications(
    uniqueUserIds(event.participations.map((participant) => participant.userId))
      .filter((userId) => userId !== senderId)
      .map((userId) => ({
        eventId,
        message,
        title,
        type,
        userId
      }))
  );
}

export async function notifyDirectMessage(recipientId: number, senderName: string) {
  await createNotification({
    message: `${senderName} ti ha scritto in privato.`,
    title: "Nuovo messaggio",
    type: "CHAT_MESSAGE",
    userId: recipientId
  });
}

export async function notifyTestPush(userId: number) {
  await createNotification({
    message: "Se leggi questa notifica, le push di Evnt sono configurate correttamente.",
    pushMode: "await",
    title: "Test push Evnt",
    type: "CHAT_MESSAGE",
    userId
  });
}

export async function runScheduledEventNotifications(now = eventCleanupNow()) {
  const savedReminderAfter = new Date(now.getTime() + hourMs);
  const savedReminderBefore = new Date(now.getTime() + dayMs);
  const startingReminderBefore = new Date(now.getTime() + hourMs);

  const [bookmarks, participations] = await Promise.all([
    prisma.bookmark.findMany({
      where: {
        event: {
          dateHour: {
            gt: savedReminderAfter,
            lte: savedReminderBefore
          }
        }
      },
      include: { event: true }
    }),
    prisma.participation.findMany({
      where: {
        event: {
          dateHour: {
            gt: now,
            lte: startingReminderBefore
          }
        }
      },
      include: { event: true }
    })
  ]);

  await createNotifications([
    ...bookmarks.map((bookmark) => ({
      dedupeKey: `saved-reminder:${bookmark.userId}:${bookmark.eventId}:${bookmark.event.dateHour.toISOString()}`,
      eventId: bookmark.eventId,
      message: `${bookmark.event.title} e domani alle ${eventTimeLabel(bookmark.event.dateHour)}. Vuoi partecipare?`,
      title: "Evento salvato domani",
      type: "SAVED_EVENT_REMINDER" as NotificationType,
      userId: bookmark.userId
    })),
    ...participations.map((participation) => ({
      dedupeKey: `event-starting:${participation.userId}:${participation.eventId}:${participation.event.dateHour.toISOString()}`,
      eventId: participation.eventId,
      message: `${participation.event.title} inizia tra 1 ora. Apri la mappa per raggiungere il luogo.`,
      title: "Si parte tra poco",
      type: "EVENT_STARTING" as NotificationType,
      userId: participation.userId
    }))
  ]);
}

export function startScheduledNotifications() {
  void runNotificationJobs();

  const timer = setInterval(() => {
    void runNotificationJobs();
  }, scheduledNotificationIntervalMs);

  return () => clearInterval(timer);
}

async function runNotificationJobs() {
  const results = await Promise.allSettled([
    cleanupOldNotifications(),
    runScheduledEventNotifications()
  ]);

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      return;
    }
    const label = index === 0 ? "pulizia notifiche" : "notifiche programmate";
    const message = result.reason instanceof Error ? result.reason.message : "Errore sconosciuto";
    console.warn(`Job ${label} saltato: ${message}`);
  });
}
