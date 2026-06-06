import dotenv from "dotenv";

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: optionalNumber("PORT", 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET", "change-me-in-production"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  eventCleanupTimeOffsetHours: optionalNumber("EVENT_CLEANUP_TIME_OFFSET_HOURS", 0)
};
