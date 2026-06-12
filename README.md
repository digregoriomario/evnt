# Evnt

Evnt è una piattaforma per scoprire eventi locali, iscriversi, salvare preferiti, chattare con gli altri partecipanti e ricevere notifiche. Il repository contiene due applicazioni:

```text
Evnt/
├── evnt-backend/   # API REST + WebSocket, Prisma, PostgreSQL/PostGIS
└── evnt-frontend/  # app Expo / React Native / Web
```

## Prerequisiti

- Node.js LTS compatibile con il progetto: `>=20 <26`.
- npm, incluso con Node.js.
- Docker Desktop avviato, necessario per PostgreSQL/PostGIS e consigliato per il backend.
- Expo Go su smartphone, oppure simulatore iOS/Android, oppure browser per la versione web.

Verifica rapida:

```bash
node -v
npm -v
docker --version
docker compose version
```

## Avvio rapido in locale

Apri due terminali: uno per il backend e uno per il frontend.

### 1. Backend

```bash
cd evnt-backend
docker compose up -d --build
```

Il comando avvia:

- PostgreSQL + PostGIS su `localhost:5433`;
- API Express su `http://localhost:4000`;
- proxy Nginx HTTP su `http://localhost:8080`.

Controlla lo stato:

```bash
docker compose ps
curl http://localhost:4000/api/health
```

La risposta deve avere `"status": "ok"`.

Durante l'avvio Docker esegue automaticamente schema Prisma, PostGIS, catalogo interessi/categorie e account demo minimi.

### 2. Frontend

In un secondo terminale:

```bash
cd evnt-frontend
npm ci
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm start
```

Poi scegli dal pannello Expo se aprire l'app su web, iOS, Android o dispositivo fisico.

Comandi diretti:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm run web
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm run ios
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api npm run android
```

Per uno smartphone fisico usa l'IP locale del computer:

```bash
EXPO_PUBLIC_API_URL=http://TUO_IP_LOCALE:4000/api npm start
```

Esempio:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/api npm start
```

Computer e telefono devono stare sulla stessa rete Wi-Fi. Il backend deve essere raggiungibile dal telefono sulla porta `4000`.

> Nota: se non imposti `EXPO_PUBLIC_API_URL`, il frontend usa il backend remoto configurato nel codice (`http://evnt.dedor.it:8080/api`). Per sviluppo locale è meglio impostare sempre la variabile.

## Account demo

Gli script di bootstrap/seed creano questi utenti, tutti con password `password123`:

```text
mariodigregorio@evnt.app
lauranigro@evnt.app
riccardolaporta@evnt.app
simonesquitieri@evnt.app
```

## Avvii successivi

Backend:

```bash
cd evnt-backend
docker compose up -d
```

Frontend:

```bash
cd evnt-frontend
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm start
```

## Dati demo completi

Il bootstrap automatico crea catalogo e account. Per cancellare i dati locali e ricreare anche eventi, chat, preferiti e messaggi demo:

```bash
cd evnt-backend
docker compose exec api npm run seed
```

## Comandi utili

### Backend Docker

```bash
cd evnt-backend

docker compose ps                 # stato container
docker compose logs -f api         # log API
docker compose restart api         # riavvio API
docker compose up -d --build       # rebuild dopo modifiche a Dockerfile/package
docker compose down                # stop container, mantiene il volume database
docker compose down -v             # stop e cancella il database locale
```

### Type-check

```bash
cd evnt-backend
npm ci
npm run typecheck

cd ../evnt-frontend
npm ci
npm run typecheck
```

## Backend senza container API

Questa modalità serve se vuoi eseguire l'API direttamente con Node sul computer, lasciando solo PostgreSQL/PostGIS in Docker.

```bash
cd evnt-backend
cp .env.example .env
npm ci
docker compose up -d db
npm run prisma:generate
npm run db:setup
npm run bootstrap
npm run dev
```

Se prima avevi avviato lo stack completo, ferma API e Nginx per liberare la porta `4000`:

```bash
docker compose stop api nginx
```

## Porte locali

| Servizio | URL/porta |
|---|---|
| API backend | `http://localhost:4000/api` |
| WebSocket realtime | `ws://localhost:4000/ws` |
| Nginx HTTP proxy | `http://localhost:8080` |
| PostgreSQL/PostGIS | `localhost:5433` |

## Risoluzione problemi

### La porta 4000 è occupata

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

Se è occupata dal container API:

```bash
cd evnt-backend
docker compose stop api nginx
```

Se resta occupata:

```bash
docker ps
docker stop evnt-api
```

### Il frontend non vede il backend

Controlla prima l'healthcheck:

```bash
curl http://localhost:4000/api/health
```

Poi riavvia Expo passando esplicitamente la variabile:

```bash
cd evnt-frontend
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm start
```

Su Android Emulator usa invece:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api npm run android
```

Su smartphone fisico sostituisci `localhost` con l'IP locale del computer.

### Database da ricreare da zero

```bash
cd evnt-backend
docker compose down -v
docker compose up -d --build
```

## Documentazione dettagliata

- Backend: [`evnt-backend/README.md`](./evnt-backend/README.md)
- Frontend: [`evnt-frontend/README.md`](./evnt-frontend/README.md)
- Documentazione strategica: [Google Drive](https://drive.google.com/drive/folders/1rA5eZXwl1qi7YixnvFl7J1aURynljoFk?usp=drive_link)

## Team

- [Mario Di Gregorio](mailto:m.digregorio22@studenti.unisa.it)
- [Laura Nigro](mailto:l.nigro12@studenti.unisa.it)
- [Riccardo La Porta](mailto:r.laporta6@studenti.unisa.it)
- [Simone Squitieri](mailto:s.squitieri6@studenti.unisa.it)
