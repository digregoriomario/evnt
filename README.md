# Evnt

Evnt è un progetto nato per riconnetterti con il tuo territorio e con le tue passioni. Trasformiamo la scoperta di un evento in partecipazione reale, abbattendo le barriere del disordine informativo per farti vivere solo le esperienze che ami davvero.

---

##  Perché Evnt?
In un mondo digitalmente frammentato, Evnt combatte l'isolamento sociale facilitando incontri reali basati su passioni comuni.
* **Addio inefficienza:** Risolviamo l'inefficienza dei metodi di ricerca tradizionali, spesso dispersivi e non personalizzati.
* **Community vere:** Aggreghiamo le persone attorno a una preferenza condivisa, facilitando una socializzazione spontanea e di qualità.

##  Cosa rende speciale Evnt
* **Esplorazione su misura:** Trovare cosa fare non è più una ricerca faticosa, ma un viaggio semplice e personalizzato, pensato apposta per i tuoi gusti.
* **Passioni in primo piano:** Ricevi solo gli aggiornamenti sulle attività che ami davvero. Niente più notifiche infinite o la confusione tipica delle grandi chat!
* **Incontri spontanei:** Ti è venuta voglia di uscire all'improvviso? Puoi proporre un'idea al volo e trovare subito la compagnia giusta.
* **Nuove amicizie:** Non vogliamo fermarci alla singola uscita. L'obiettivo è unire le persone, trasformando i nuovi incontri in una bella e affiatata compagnia.

##  Target
L'applicazione è rivolta a un target **16+**, con eventi caratterizzati e filtrati in base alla fascia d'età per garantire sempre la massima pertinenza.

##  Risorse
Consulta la documentazione strategica completa:
👉 **[Documentazione su Google Drive](https://drive.google.com/drive/folders/1rA5eZXwl1qi7YixnvFl7J1aURynljoFk?usp=drive_link)**

## Avvio dell'app da zero

Queste istruzioni sono pensate per una persona che ha appena clonato la repository.

### Prerequisiti

- Node.js LTS 20, 22 o 24 consigliato. Se compaiono warning con versioni non LTS, usare Node 24.
- npm, incluso con Node.js.
- Docker Desktop avviato, necessario per backend, PostgreSQL e PostGIS.
- Expo Go su smartphone, oppure Xcode Simulator per iOS, oppure Android Emulator.

Clonare la repository e entrare nella cartella del progetto:

```bash
git clone <URL_DELLA_REPOSITORY>
cd Evnt
```

### Primo avvio backend

Il backend è il primo servizio da avviare. Con Docker vengono creati automaticamente API, database PostgreSQL/PostGIS, Nginx, schema Prisma, catalogo e account demo.

Da un terminale:

```bash
cd evnt-backend
docker compose up -d --build
```

Controllare che sia tutto attivo:

```bash
docker compose ps
curl http://localhost:4000/api/health
```

La risposta dell'healthcheck deve contenere:

```json
{
  "status": "ok"
}
```

Endpoint disponibili:

```text
Backend API: http://localhost:4000/api
Nginx/proxy: http://localhost:8080
Database:    localhost:5433
```

Account demo creati automaticamente:

```text
demo1@evnt.app / password123
demo2@evnt.app / password123
```

### Primo avvio frontend

Aprire un secondo terminale dalla cartella principale del progetto:

```bash
cd evnt-frontend
npm ci
npm start
```

Da Expo si può scegliere dove aprire l'app. In alternativa:

```bash
npm run ios
npm run android
npm run web
```

URL backend usato dal frontend:

- Web e iOS Simulator: `http://localhost:4000/api`
- Android Emulator: `http://10.0.2.2:4000/api`
- Smartphone fisico: Expo prova a usare l'IP locale del computer; se non funziona, impostarlo manualmente.

Per avviare Expo su smartphone fisico indicando l'IP del computer:

```bash
EXPO_PUBLIC_API_URL=http://TUO_IP_LOCALE:4000/api npm start
```

Esempio:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000/api npm start
```

Telefono e computer devono essere collegati alla stessa rete Wi-Fi.

### Avvii successivi

Backend:

```bash
cd evnt-backend
docker compose up -d
```

Frontend:

```bash
cd evnt-frontend
npm start
```

### Comandi utili backend

Vedere lo stato dei container:

```bash
cd evnt-backend
docker compose ps
```

Vedere i log dell'API:

```bash
cd evnt-backend
docker compose logs -f api
```

Riavviare il backend dopo modifiche al codice:

```bash
cd evnt-backend
docker compose restart api
```

Ricostruire il backend dopo modifiche a dipendenze, Dockerfile o package:

```bash
cd evnt-backend
docker compose up -d --build
```

Spegnere backend e proxy, lasciando acceso il database:

```bash
cd evnt-backend
docker compose stop api nginx
```

Spegnere tutto:

```bash
cd evnt-backend
docker compose down
```

Ripartire da un database vuoto, cancellando anche il volume locale:

```bash
cd evnt-backend
docker compose down -v
docker compose up -d --build
```

### Se la porta 4000 è occupata

Controllare chi usa la porta:

```bash
lsof -nP -iTCP:4000 -sTCP:LISTEN
```

Se la porta è occupata da Docker, fermare il container API:

```bash
cd evnt-backend
docker compose stop api nginx
```

Se resta occupata, controllare i container attivi:

```bash
docker ps
docker stop evnt-api
```

### Avvio backend senza Docker API

Questa modalità è utile solo per sviluppo locale del backend. Il database resta comunque su Docker.

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

Se il container `evnt-api` è già attivo, fermarlo prima perché usa la porta `4000`:

```bash
docker compose stop api nginx
```


---

##  Stato d'avanzamento
<table>
  <thead>
    <tr>
      <th align="center">Fase</th>
      <th align="center">Modulo</th>
      <th align="center">Stato</th>
      <th align="center">Progresso</th>
      <th align="left">Note</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2" valign="middle" align="center" style="background-color:#f6f8fa"><strong>Studio di Fattibilità</strong></td>
      <td align="center" style="background-color:#f6f8fa">Idea progettuale</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Analisi di mercato</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td rowspan="2" valign="middle" align="center"><strong>Analisi dei Requisiti</strong></td>
      <td align="center">Requisiti</td>
      <td align="center"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center"><code>100%</code></td>
      <td></td>
    </tr>
    <tr>
      <td align="center">Casi d'uso</td>
      <td align="center"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center"><code>100%</code></td>
      <td></td>
    </tr>
    <tr>
      <td rowspan="3" valign="middle" align="center" style="background-color:#f6f8fa"><strong>Progettazione</strong></td>
      <td align="center" style="background-color:#f6f8fa">Schema ER</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Diagrammi UML</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa">Diagrammi allineati alla versione attuale del dominio applicativo.</td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Architettura del sistema</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-done-success" alt="Done"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa">Frontend Expo/React Native, backend Express/Prisma, PostgreSQL/PostGIS e Docker.</td>
    </tr>
    <tr>
      <td rowspan="2" valign="middle" align="center"><strong>Implementazione</strong></td>
      <td align="center">Moduli/Componenti</td>
      <td align="center"><img src="https://img.shields.io/badge/-in_progress-blue" alt="In progress"/></td>
      <td align="center"><code>95%</code></td>
      <td>Componenti UI, API, autenticazione, database, Docker, Nginx e integrazione mappe/chat implementati.</td>
    </tr>
    <tr>
      <td align="center">Sviluppo App</td>
      <td align="center"><img src="https://img.shields.io/badge/-in_progress-blue" alt="In progress"/></td>
      <td align="center"><code>95%</code></td>
      <td>Login/registrazione, Home, Mappa, Creazione evento, Chat, Profilo, modifica profilo/eventi e sessione persistente presenti.</td>
    </tr>
    <tr>
      <td rowspan="2" valign="middle" align="center" style="background-color:#f6f8fa"><strong>Testing</strong></td>
      <td align="center" style="background-color:#f6f8fa">Test funzionali</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-in_progress-blue" alt="In progress"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>70%</code></td>
      <td style="background-color:#f6f8fa">Typecheck frontend/backend, build backend ed export web verificati; resta QA completa su device reali.</td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Test di accettazione</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-in_progress-blue" alt="In progress"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>60%</code></td>
      <td style="background-color:#f6f8fa">Flussi principali validati manualmente; da completare revisione finale con casi limite.</td>
    </tr>
    <tr>
      <td rowspan="1" valign="middle" align="center"><strong>Rilascio</strong></td>
      <td align="center">Distribuzione</td>
      <td align="center"><img src="https://img.shields.io/badge/-in_progress-blue" alt="In progress"/></td>
      <td align="center"><code>60%</code></td>
      <td>Ambiente Docker e istruzioni di avvio disponibili; manca deploy definitivo in ambiente pubblico/produzione.</td>
    </tr>
  </tbody>
</table>

## 👥 Team
 - [Mario Di Gregorio](mailto:m.digregorio22@studenti.unisa.it)
 - [Laura Nigro](mailto:l.nigro12@studenti.unisa.it)
 - [Riccardo La Porta](mailto:r.laporta6@studenti.unisa.it)
 - [Simone Squitieri](mailto:s.squitieri6@studenti.unisa.it)
