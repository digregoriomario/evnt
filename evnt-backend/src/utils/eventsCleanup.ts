import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const eventClosureDelayMs = 3 * 24 * 60 * 60 * 1000;
const cleanupIntervalMs = 60 * 60 * 1000;
const cleanupTimeOffsetMs = env.eventCleanupTimeOffsetHours * 60 * 60 * 1000;

export function eventCleanupNow(now = new Date()) {
  return new Date(now.getTime() + cleanupTimeOffsetMs);
}

export function expiredEventsCutoff(now = eventCleanupNow()) {
  return new Date(now.getTime() - eventClosureDelayMs);
}

export async function closeExpiredEvents(now = eventCleanupNow()) {
  return prisma.event.deleteMany({
    where: {
      dateHour: {
        lt: expiredEventsCutoff(now)
      }
    }
  });
}

export function startExpiredEventsCleanup() {
  void runExpiredEventsCleanup();

  const timer = setInterval(() => {
    void runExpiredEventsCleanup();
  }, cleanupIntervalMs);

  return () => clearInterval(timer);
}

async function runExpiredEventsCleanup() {
  try {
    await closeExpiredEvents();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore sconosciuto";
    console.warn(`Pulizia eventi scaduti saltata: ${message}`);
  }
}
