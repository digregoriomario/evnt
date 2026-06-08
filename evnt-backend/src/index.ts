import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { attachRealtime } from "./realtime";
import { startExpiredEventsCleanup } from "./utils/eventsCleanup";
import { startScheduledNotifications } from "./utils/notifications";

async function main() {
  const app = createApp();
  const stopExpiredEventsCleanup = startExpiredEventsCleanup();
  const stopScheduledNotifications = startScheduledNotifications();
  const server = app.listen(env.port, () => {
    console.log(`Evnt API listening on http://localhost:${env.port}/api`);
  });
  const stopRealtime = attachRealtime(server);

  const shutdown = async () => {
    stopRealtime();
    stopExpiredEventsCleanup();
    stopScheduledNotifications();
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
