# Evnt

Evnt è un’applicazione React Native per scoprire eventi locali, creare e gestire eventi, partecipare alle attività, salvare preferiti, comunicare tramite chat e ricevere notifiche in tempo reale. Il progetto comprende un frontend Expo multipiattaforma e un backend Node.js con API REST, WebSocket e database PostgreSQL/PostGIS.

## Documentazione

- [Documentazione tecnica completa](https://drive.google.com/drive/folders/1rA5eZXwl1qi7YixnvFl7J1aURynljoFk?usp=drive_link)

## Avvio del progetto

Sono richiesti Node.js `>=20 <26`, npm e Docker.

### Backend

```bash
cd evnt-backend
docker compose up -d --build
```

Il backend è disponibile su `http://localhost:4000/api`.

```bash
curl http://localhost:4000/api/health
```

### Frontend
In un secondo terminale:
#### Caso 1: host locale
```bash
cd evnt-frontend
npm ci
EXPO_PUBLIC_API_URL=http://localhost:4000/api npm start
```

#### Caso 2: host remoto
```bash
cd evnt-frontend
npm ci
npm start
```

L’istanza remota predefinita è `http://evnt.dedor.it:8080/api`.

## Partecipanti

- [Mario Di Gregorio](mailto:m.digregorio22@studenti.unisa.it)
- [Laura Nigro](mailto:l.nigro12@studenti.unisa.it)
- [Riccardo La Porta](mailto:r.laporta6@studenti.unisa.it)
- [Simone Squitieri](mailto:s.squitieri6@studenti.unisa.it)
