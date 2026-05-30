-- PostGIS setup for Evnt: run AFTER `prisma db push`.
-- Enables PostGIS, adds a generated geometry column derived from
-- latitude/longitude on events, and a GiST spatial index.

CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "geom" geometry(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)) STORED;

CREATE INDEX IF NOT EXISTS "events_geom_gix" ON "events" USING GIST ("geom");
