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

## Avvio dell'app

### Prerequisiti

- Node.js LTS 20, 22 o 24. Evitare Node 25 perché non è supportato dagli script del progetto.
- Docker Desktop avviato, necessario per PostgreSQL + PostGIS.
- Expo Go su smartphone oppure Xcode Simulator / Android Emulator per avviare l'app mobile.

### Primo avvio del backend

Aprire un terminale dalla cartella principale del progetto:

```bash
cd evnt-backend
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run db:setup
npm run seed
npm run dev
```

Il backend sarà disponibile su `http://localhost:4000/api`.

Credenziali demo create dal seed:

```text
Email: demo@evnt.app
Password: password123
```

Nota: il file `.env` contiene configurazioni locali e non deve essere pushato su GitHub.

### Avvio del frontend

Aprire un secondo terminale dalla cartella principale del progetto:

```bash
cd evnt-frontend
npm install
npm start
```

Da Expo si può poi scegliere dove aprire l'app. In alternativa:

```bash
npm run ios
npm run android
npm run web
```

Su iOS Simulator e web il frontend usa automaticamente `http://localhost:4000/api`.
Su Android Emulator usa automaticamente `http://10.0.2.2:4000/api`.

Se l'app viene aperta da uno smartphone fisico, impostare l'URL del backend con l'IP locale del computer:

```bash
EXPO_PUBLIC_API_URL=http://TUO_IP_LOCALE:4000/api npm start
```

### Avvii successivi

Dopo il primo setup, bastano due terminali:

```bash
cd evnt-backend
npm run db:up
npm run dev
```

```bash
cd evnt-frontend
npm start
```

Per spegnere il database:

```bash
cd evnt-backend
npm run db:down
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
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Architettura del sistema</td>
      <td align="center" style="background-color:#f6f8fa"></td>
      <td align="center" style="background-color:#f6f8fa"><code>100%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td rowspan="2" valign="middle" align="center"><strong>Implementazione</strong></td>
      <td align="center">Moduli/Componenti</td>
      <td align="center"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center"><code>0%</code></td>
      <td>Componenti, API, Docker, Design</td>
    </tr>
    <tr>
      <td align="center">Sviluppo App</td>
      <td align="center"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center"><code>0%</code></td>
      <td></td>
    </tr>
    <tr>
      <td rowspan="2" valign="middle" align="center" style="background-color:#f6f8fa"><strong>Testing</strong></td>
      <td align="center" style="background-color:#f6f8fa">Test funzionali</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>0%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td align="center" style="background-color:#f6f8fa">Test di accettazione</td>
      <td align="center" style="background-color:#f6f8fa"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center" style="background-color:#f6f8fa"><code>0%</code></td>
      <td style="background-color:#f6f8fa"></td>
    </tr>
    <tr>
      <td rowspan="1" valign="middle" align="center"><strong>Rilascio</strong></td>
            <td align="center">Distribuzione</td>
      <td align="center"><img src="https://img.shields.io/badge/-backlog-lightgrey" alt="Backlog"/></td>
      <td align="center"><code>0%</code></td>
      <td></td>
    </tr>
  </tbody>
</table>

## 👥 Team
 - [Mario Di Gregorio](mailto:m.digregorio22@studenti.unisa.it)
 - [Laura Nigro](mailto:l.nigro12@studenti.unisa.it)
 - [Riccardo La Porta](mailto:r.laporta6@studenti.unisa.it)
 - [Simone Squitieri](mailto:s.squitieri6@studenti.unisa.it)
