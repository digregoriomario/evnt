import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { attachRealtime } from "./realtime";
import { startExpiredEventsCleanup } from "./utils/eventsCleanup";
import { startScheduledNotifications } from "./utils/notifications";

async function main() {
  const app = createApp();
  const server = createServer(app);
  const stopRealtime = attachRealtime(server);
  let stopExpiredEventsCleanup: () => void = () => undefined;
  let stopScheduledNotifications: () => void = () => undefined;

  const cleanup = async () => {
    stopRealtime();
    stopExpiredEventsCleanup();
    stopScheduledNotifications();
    await prisma.$disconnect();
  };

  server.on("error", (error: NodeJS.ErrnoException) => {
    void cleanup().finally(() => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Porta ${env.port} gia in uso. Ferma Docker con "docker compose stop api nginx" oppure chiudi il processo che occupa la porta.`
        );
      } else {
        console.error(error.message || "Errore di avvio del server.");
      }
      process.exit(1);
    });
  });

  server.listen(env.port, () => {
    stopExpiredEventsCleanup = startExpiredEventsCleanup();
    stopScheduledNotifications = startScheduledNotifications();
    console.log(`Evnt API listening on http://localhost:${env.port}/api`);
  });

  const shutdown = async () => {
    server.close();
    await cleanup();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
