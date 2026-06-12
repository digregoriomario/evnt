-- The PostGIS geom column is generated from latitude/longitude.
-- Drop it before `prisma db push`, then recreate it with postgis.sql.
ALTER TABLE IF EXISTS "events" DROP COLUMN IF EXISTS "geom";
