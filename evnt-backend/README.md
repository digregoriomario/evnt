# Evnt — Backend API

REST API for the Evnt mobile app. Built with **Node + Express + TypeScript**,
**Prisma** ORM and **PostgreSQL + PostGIS**. Implements the full E-R model:
User, Interest, Category, Event, UserInterest, Bookmark, Participation,
ChatMessage, Notification.

## Requirements

- Node LTS (20 / 22 / 24)
- Docker (for PostgreSQL + PostGIS)

## Quick start

```bash
cd evnt-backend
cp .env.example .env          # adjust JWT_SECRET / DATABASE_URL if needed
npm install

npm run db:up                 # start Postgres+PostGIS in Docker
npm run prisma:generate       # generate the Prisma client
npm run db:setup              # push schema + add PostGIS geom column & index
npm run seed                  # load demo data (events, users, categories...)

npm run dev                   # API on http://localhost:4000/api
```

Demo login created by the seed: **demo@evnt.app / password123**

> First run of `prisma:generate` downloads the query engine — needs internet access.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the API with hot reload (tsx) |
| `npm run build` / `npm start` | Compile to `dist/` and run |
| `npm run typecheck` | Type-check without emitting |
| `npm run db:up` / `db:down` | Start / stop the Postgres container |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run db:setup` | `prisma db push` + apply `prisma/sql/postgis.sql` |
| `npm run seed` | Seed the database |

## PostGIS

`Event.latitude` / `Event.longitude` are stored as floats by Prisma.
`prisma/sql/postgis.sql` adds a generated `geom geometry(Point,4326)` column
(`ST_MakePoint(longitude, latitude)`) plus a GiST index. The events feed uses a
raw `ST_Distance(...::geography)` query to compute per-user distances when
`?lat=&lng=` are supplied.

## API overview

Base path: `/api`

Auth
- `POST /auth/register` — `{ email, password, name, birthDate, city?, bio?, image?, interests? }` → `{ token, user }` (enforces 16+)
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- `GET  /auth/me` *(auth)* → `{ user }`

Catalog
- `GET /catalog/interests`
- `GET /catalog/categories`

Events
- `GET    /events?category=&q=&maxPrice=&sort=&lat=&lng=` — feed (auth optional; adds favorite/registered flags)
- `GET    /events/:id`
- `POST   /events` *(auth)*
- `PUT    /events/:id` *(auth, creator)*
- `DELETE /events/:id` *(auth, creator)*
- `POST/DELETE /events/:id/join` *(auth)* — participation
- `POST/DELETE /events/:id/bookmark` *(auth)* — favorites
- `GET  /events/:id/messages` — chat
- `POST /events/:id/messages` *(auth)* — chat (announcements channels: creator only)

Me *(auth)*
- `PUT  /me` — update profile / interests
- `GET  /me/events` · `GET /me/bookmarks` · `GET /me/participations`

Notifications *(auth)*
- `GET  /notifications`
- `POST /notifications/:id/read` · `POST /notifications/read-all`

All errors return `{ error, details? }`. Validation uses Zod (400);
auth failures 401/403; conflicts 409.
