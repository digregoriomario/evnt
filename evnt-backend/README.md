# Evnt Backend

API REST e WebSocket per l'app Evnt. Il backend usa Node.js, Express, TypeScript, Prisma e PostgreSQL/PostGIS.

## Stack

- Node.js `>=20 <26`
- Express 4
- TypeScript
- Prisma 5
- PostgreSQL 16 + PostGIS
- Docker Compose per sviluppo locale
- JWT per autenticazione
- WebSocket su `/ws` per chat/notifiche realtime

## Avvio consigliato con Docker

Da questa cartella:

```bash
docker compose up -d --build
```

Il comando costruisce e avvia tre servizi:

| Servizio | Descrizione | Porta host |
|---|---|---|
| `db` | PostgreSQL + PostGIS | `5433` |
| `api` | Express/TypeScript | `4000` |
| `nginx` | proxy HTTP verso `/api` | `8080` |

Verifica:

```bash
docker compose ps
curl http://localhost:4000/api/health
curl http://localhost:8080/api/health
```

L'healthcheck deve restituire `"status": "ok"`.

Durante l'avvio il container API esegue:

```bash
npm run db:setup
npm run prisma:generate
npm run bootstrap
npm run dev
```

Quindi il database locale viene preparato automaticamente con schema, estensione PostGIS, catalogo e account demo.

## Account demo

Password per tutti: `password123`.

```text
mariodigregorio@evnt.app
lauranigro@evnt.app
riccardolaporta@evnt.app
simonesquitieri@evnt.app
```

## Variabili d'ambiente

Per Docker Compose le variabili principali sono già definite in `docker-compose.yml`.

Per eseguire l'API fuori da Docker copia l'esempio:

```bash
cp .env.example .env
```

Valori principali:

| Variabile | Uso | Default locale |
|---|---|---|
| `PORT` | porta HTTP API | `4000` |
| `DATABASE_URL` | connessione PostgreSQL | `postgresql://evnt:evnt@localhost:5433/evnt?schema=public` |
| `JWT_SECRET` | firma dei token JWT | `change-me-in-production` |
| `JWT_EXPIRES_IN` | durata token | `7d` |
| `CORS_ORIGIN` | origini abilitate | `*` |
| `EVENT_CLEANUP_TIME_OFFSET_HOURS` | offset solo per test cleanup eventi | `0` |

## Sviluppo con API Node locale e solo database Docker

Usa questa modalità quando vuoi lavorare sull'API fuori dal container.

```bash
cp .env.example .env
npm ci
docker compose up -d db
npm run prisma:generate
npm run db:setup
npm run bootstrap
npm run dev
```

Se lo stack Docker completo era già attivo, libera la porta `4000`:

```bash
docker compose stop api nginx
```

L'API sarà disponibile su:

```text
http://localhost:4000/api
ws://localhost:4000/ws
```

## Script npm

| Script | Descrizione |
|---|---|
| `npm run dev` | avvia l'API in watch mode con `tsx` |
| `npm run build` | compila TypeScript in `dist/` |
| `npm start` | avvia il build compilato |
| `npm run typecheck` | controlla TypeScript senza generare file |
| `npm run db:up` | avvia tutto lo stack Docker Compose |
| `npm run db:down` | ferma lo stack Docker Compose |
| `npm run prisma:generate` | genera il Prisma Client |
| `npm run prisma:push` | applica lo schema Prisma al database |
| `npm run prisma:postgis` | applica colonna `geom` e indice PostGIS |
| `npm run db:setup` | esegue drop `geom`, push schema e setup PostGIS |
| `npm run bootstrap` | crea/aggiorna catalogo e account demo minimi |
| `npm run seed` | resetta i dati locali e ricrea dati demo completi |
| `npm run seed:demo` | crea/aggiorna solo gli account demo |

## Database e seed

Ricreare schema e PostGIS senza cancellare tutto:

```bash
npm run db:setup
```

Creare catalogo e account demo minimi:

```bash
npm run bootstrap
```

Reset completo dei dati applicativi demo:

```bash
npm run seed
```

Con API dentro Docker:

```bash
docker compose exec api npm run seed
```

Ripartire da database vuoto cancellando il volume locale:

```bash
docker compose down -v
docker compose up -d --build
```

## PostGIS

Prisma mantiene `latitude` e `longitude` come campi numerici. Lo script `prisma/sql/postgis.sql` aggiunge una colonna generata:

```text
geom geometry(Point,4326)
```

La colonna deriva da `ST_MakePoint(longitude, latitude)` e ha indice GiST. Il feed eventi usa query raw PostGIS per calcolare la distanza quando arrivano `lat` e `lng`.

## API principali

Base path: `/api`.

### Health

```text
GET /health
```

### Auth

```text
GET  /auth/email-available?email=<email>
POST /auth/register
POST /auth/login
GET  /auth/me
```

`/auth/register` richiede almeno 16 anni e accetta:

```json
{
  "email": "utente@example.com",
  "password": "password123",
  "name": "Nome Utente",
  "birthDate": "2000-01-01",
  "city": "Avellino",
  "bio": "opzionale",
  "image": "opzionale",
  "interests": ["Sport", "Musica"]
}
```

### Catalogo

```text
GET /catalog/interests
GET /catalog/categories
```

### Eventi

```text
GET    /events?category=&q=&maxPrice=&sort=&lat=&lng=
GET    /events/:id
POST   /events
PUT    /events/:id
DELETE /events/:id
POST   /events/:id/join
DELETE /events/:id/join
POST   /events/:id/bookmark
DELETE /events/:id/bookmark
GET    /events/:id/messages
POST   /events/:id/messages
```

`sort` può essere `affinity`, `distance`, `price`, `popularity` o `date`.

### Area personale

Tutti richiedono token JWT.

```text
PUT /me
GET /me/events
GET /me/bookmarks
GET /me/participations
```

### Chat private

Tutti richiedono token JWT.

```text
GET  /chats/direct
POST /chats/direct
GET  /chats/direct/:id/messages
POST /chats/direct/:id/messages
```

`POST /chats/direct` apre o recupera una conversazione tramite email:

```json
{ "email": "lauranigro@evnt.app" }
```

### Utenti

```text
GET /users/search?email=<email>
```

### Notifiche

Tutti richiedono token JWT.

```text
GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all
DELETE /notifications/:id
DELETE /notifications
POST   /notifications/push-token
DELETE /notifications/push-token
GET    /notifications/push-status
POST   /notifications/test-push
```

## Autenticazione

Gli endpoint protetti richiedono header:

```text
Authorization: Bearer <token>
```

Login di esempio:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mariodigregorio@evnt.app","password":"password123"}'
```

## Errori

Gli errori JSON hanno formato:

```json
{
  "error": "Messaggio errore",
  "details": {}
}
```

Codici usati più spesso:

| Codice | Significato |
|---|---|
| `400` | validazione fallita |
| `401` | token mancante/non valido |
| `403` | azione non consentita |
| `404` | risorsa non trovata |
| `409` | conflitto, per esempio email già registrata o evento pieno |
| `410` | evento annullato/non più accessibile |
| `503` | database non pronto |

## Troubleshooting

### Porta 4000 occupata

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

Se la sta usando Docker:

```bash
docker compose stop api nginx
```

### Database non pronto

```bash
docker compose ps
docker compose logs -f db
docker compose logs -f api
```

Poi prova a ricreare lo stack:

```bash
docker compose down -v
docker compose up -d --build
```

### Prisma Client non generato

```bash
npm run prisma:generate
```

### Verifica finale

```bash
npm run typecheck
curl http://localhost:4000/api/health
```
