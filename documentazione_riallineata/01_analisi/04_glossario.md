# Evnt - Glossario riallineato

| Termine | Definizione | Categoria | Stato |
|---|---|---|---|
| Affinita | Valore usato dall'app per ordinare/rendere piu rilevanti eventi coerenti con gli interessi dell'utente. | Dominio | Implementato |
| Bookmark / Preferito | Salvataggio di un evento nella lista personale dell'utente. | Dominio | Implementato |
| Capienza | Numero massimo di partecipanti a un evento; se nullo l'evento e illimitato. | Dominio | Implementato |
| Categoria | Classificazione principale dell'evento, collegata a un interesse. | Dominio | Implementato |
| Sottocategoria | Etichetta piu specifica della categoria evento, salvata anche nei tag tecnici. | Dominio | Implementato |
| Feed | Lista eventi mostrata in home e ordinata/filtrata secondo ricerca, categoria, prezzo, raggio e affinita. | UX/UI | Implementato |
| Mappa eventi | Vista con pin evento, posizione utente/fallback citta e raggio di ricerca. | UX/UI | Implementato |
| POI | Punto di interesse geografico selezionato per il luogo dell'evento. | Dominio | Implementato |
| Geocoding | Conversione di un indirizzo o luogo in coordinate geografiche. | Device | Implementato |
| Reverse geocoding | Conversione di coordinate selezionate su mappa in indirizzo leggibile. | Device | Implementato |
| PostGIS | Estensione PostgreSQL usata per `geom` e calcolo distanza geospaziale. | Architettura | Implementato |
| `geom` | Colonna geometry(Point,4326) generata da longitudine/latitudine evento. | Database | Implementato |
| JWT | Token firmato usato per autenticare richieste REST e WebSocket. | Security | Implementato |
| Bearer token | Modalita con cui il JWT viene inviato nell'header `Authorization`. | Security | Implementato |
| Bcrypt | Algoritmo usato per salvare hash delle password. | Security | Implementato |
| SecureStore | Storage sicuro usato su mobile per conservare la sessione. | Security | Implementato |
| WebSocket | Canale realtime usato per messaggi evento e diretti. | Messaging | Implementato |
| Chat evento | Conversazione associata a un evento, accessibile a creatore e partecipanti. | Messaging | Implementato |
| Solo annunci | Modalita chat in cui solo l'organizzatore puo scrivere. | Messaging | Implementato |
| Chat diretta | Conversazione privata 1:1 tra due utenti, avviata cercando l'email dell'altro utente. | Messaging | Implementato |
| Push token | Token Expo associato a un dispositivo per ricevere notifiche push. | Notification | Implementato |
| Dedupe key | Chiave applicativa che impedisce la creazione di notifiche duplicate. | Notification | Implementato |
| Reminder | Notifica programmata per eventi salvati o eventi imminenti a cui l'utente e iscritto. | Notification | Implementato |
| Soft delete evento | Annullamento logico dell'evento tramite tag `status:cancelled`, escluso da feed/mappa. | Data | Implementato |
| SSO | Login tramite provider esterni come Google/Apple. | Security | Rinviato |
| Refresh token | Token dedicato al rinnovo sessione senza nuovo login. | Security | Non implementato |
| Reset password | Flusso email per impostare una nuova password. | Security | Rinviato |
| PCI-DSS | Standard legato a pagamenti con carta. | Security | Non applicabile alla versione attuale |
| Pagamento simulato | Checkout fittizio previsto nella vecchia documentazione. | Data | Rimosso: il prezzo e informativo |
