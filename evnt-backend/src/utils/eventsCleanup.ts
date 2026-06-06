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
  if (env.eventCleanupTimeOffsetHours !== 0) {
    console.warn(
      `Event cleanup time offset active: ${env.eventCleanupTimeOffsetHours} hours. Use only for local testing.`
    );
  }

  void closeExpiredEvents().catch((error) => {
    console.error("Failed to close expired events", error);
  });

  const timer = setInterval(() => {
    void closeExpiredEvents().catch((error) => {
      console.error("Failed to close expired events", error);
    });
  }, cleanupIntervalMs);

  return () => clearInterval(timer);
}
