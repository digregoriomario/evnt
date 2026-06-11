import { env } from "../config/env";
import { prisma } from "../lib/prisma";

export type DatabaseHealth =
  | { ok: true; target: string }
  | { ok: false; error: string; target: string };

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const target = databaseTarget(env.databaseUrl);

  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, target };
  } catch (error) {
    return {
      ok: false,
      target,
      error: error instanceof Error ? error.message : "Errore sconosciuto"
    };
  }
}

export async function assertDatabaseReady() {
  const health = await checkDatabaseHealth();
  if (health.ok) {
    return;
  }

  throw new Error(
    `Database non raggiungibile (${health.target}). Avvia PostgreSQL con "docker compose up -d db" oppure controlla DATABASE_URL. Dettaglio: ${health.error}`
  );
}

function databaseTarget(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const database = url.pathname.replace(/^\/+/, "") || "database";
    return `${url.hostname}:${url.port || "5432"}/${database}`;
  } catch {
    return "DATABASE_URL non valida";
  }
}
