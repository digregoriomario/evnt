# Evnt Frontend

App mobile/web di Evnt sviluppata con Expo, React Native e TypeScript.

## Funzionalità implementate

- onboarding e autenticazione con età minima 16+;
- scelta interessi utente;
- feed eventi dal backend con ricerca, categoria, prezzo, distanza e ordinamento;
- mappa interattiva su web e native;
- dettaglio evento con iscrizione, preferiti, luogo e chat evento;
- creazione evento guidata;
- profilo con eventi creati, preferiti e partecipazioni;
- inbox per chat private;
- notifiche e sessione persistente.

## Prerequisiti

- Node.js `>=20 <26`.
- npm.
- Backend Evnt avviato, se lavori in locale.
- Expo Go, simulatore iOS/Android o browser.

Installa le dipendenze:

```bash
npm ci
```

## Configurazione backend

Il frontend legge l'URL dell'API da `EXPO_PUBLIC_API_URL`.

Per sviluppo locale imposta sempre la variabile quando avvii Expo:

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm start
```

Se la variabile non è impostata, l'app usa il backend remoto configurato in `src/api/config.ts`:

```text
http://evnt.dedor.it:8080/api
```

URL locali consigliati:

| Ambiente | URL API |
|---|---|
| Web browser | `http://localhost:4000/api` |
| iOS Simulator | `http://localhost:4000/api` |
| Android Emulator | `http://10.0.2.2:4000/api` |
| Smartphone fisico | `http://TUO_IP_LOCALE:4000/api` |

Per smartphone fisico, telefono e computer devono essere sulla stessa rete Wi-Fi.

## Avvio

### Web

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm run web
```

### iOS Simulator

```bash
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm run ios
```

### Android Emulator

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api npm run android
```

### Smartphone fisico con Expo Go

Sostituisci `TUO_IP_LOCALE` con l'indirizzo IP del computer nella rete Wi-Fi.

```bash
EXPO_PUBLIC_API_URL=http://TUO_IP_LOCALE:4000/api npm start
```

Esempio:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/api npm start
```

## Script npm

| Script | Descrizione |
|---|---|
| `npm start` | apre Expo Dev Server |
| `npm run web` | apre la versione web |
| `npm run ios` | apre su iOS Simulator |
| `npm run android` | apre su Android Emulator |
| `npm run typecheck` | controlla TypeScript senza generare file |

## Struttura principale

```text
src/
├── api/              # client HTTP, URL backend, tipi API
├── application/      # logica applicativa e filtri
├── components/       # componenti riutilizzabili
├── components/ui/    # primitive UI locali
├── data/             # dati statici di supporto
├── domain/           # logica dominio, es. distanza geografica
├── presentation/     # hook di presentazione
├── screens/          # schermate principali
├── styles/           # setup stile web
├── theme.ts          # palette e token UI
└── types.ts          # tipi condivisi frontend
```

## Sessione e autenticazione

Dopo login o registrazione il token JWT viene salvato localmente:

- su web in `localStorage`;
- su mobile con `expo-secure-store`.

Il client invia automaticamente:

```text
Authorization: Bearer <token>
```

## Realtime

La chat realtime usa WebSocket derivando l'URL dall'API attiva:

```text
http://localhost:4000/api -> ws://localhost:4000/ws
```

Per questo in locale è consigliato puntare il frontend direttamente a `localhost:4000` o all'IP del computer sulla porta `4000`.

## Account demo

Se il backend locale è stato avviato con Docker o bootstrap, puoi accedere con:

```text
mariodigregorio@evnt.app / password123
lauranigro@evnt.app / password123
riccardolaporta@evnt.app / password123
simonesquitieri@evnt.app / password123
```

## Type-check

```bash
npm run typecheck
```

## Troubleshooting

### L'app mostra backend non raggiungibile

Controlla il backend:

```bash
curl http://localhost:4000/api/health
```

Poi riavvia Expo con `EXPO_PUBLIC_API_URL` corretto.

### Android Emulator non raggiunge `localhost`

Usa `10.0.2.2`, che dall'emulatore Android punta al computer host:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api npm run android
```

### Smartphone fisico non raggiunge il backend

- usa l'IP locale del computer, non `localhost`;
- verifica che telefono e computer siano sulla stessa Wi-Fi;
- verifica firewall/VPN;
- prova dal browser del telefono: `http://TUO_IP_LOCALE:4000/api/health`.

### Expo segnala problemi con la versione Node

Il progetto dichiara compatibilità `>=20 <26`. Usa una versione LTS come Node 20, 22 o 24.

### Pulire cache Expo

```bash
npx expo start -c
```

## Backend

Il backend si trova in `../evnt-backend`. Per avviarlo in locale:

```bash
cd ../evnt-backend
docker compose up -d --build
curl http://localhost:4000/api/health
```
