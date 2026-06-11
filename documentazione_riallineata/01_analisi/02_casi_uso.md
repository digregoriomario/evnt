# Evnt - Casi d'uso riallineati

Questa versione adatta i casi d'uso originali all'app effettivamente implementata.

## Attori

| Attore | Descrizione |
|---|---|
| Guest | Utente non autenticato o con sessione assente/scaduta. Puo registrarsi o accedere. |
| Utente registrato | Utente autenticato. Puo esplorare eventi, salvarli, iscriversi, chattare e modificare il profilo. |
| Organizzatore | Utente registrato che ha creato un evento. Puo modificare o annullare i propri eventi e scrivere nelle chat solo annunci. |
| Sistema | Backend/app che valida dati, aggiorna stato, calcola distanze, invia realtime e crea notifiche. |
| Servizi esterni | Geocoding/OpenStreetMap, mappe esterne, Expo Push Notification Service. |

## Account e autenticazione

### UC1 - Registrazione nuovo account

| Campo | Dettaglio |
|---|---|
| Attori | Guest, Sistema |
| Precondizioni | L'utente non e autenticato. Backend raggiungibile. |
| Postcondizioni | Account creato, token JWT salvato, sessione avviata, feed iniziale caricato. |
| Flusso normale | 1. L'utente apre la schermata di registrazione. 2. Inserisce email, password e conferma password. 3. Il sistema verifica formato e disponibilita email. 4. Inserisce nome, data di nascita e citta. 5. Il sistema valida eta minima 16 anni e citta dai suggerimenti. 6. Inserisce avatar/bio opzionali e seleziona almeno 3 interessi. 7. Il sistema crea l'utente e restituisce token e profilo. 8. L'app salva la sessione e apre la home. |
| Flussi alternativi | Email gia registrata; password minore di 6 caratteri; password non coincidenti; eta inferiore a 16 anni; citta non valida; meno di 3 interessi; backend non raggiungibile. |

### UC2 - Login account

| Campo | Dettaglio |
|---|---|
| Attori | Guest, Sistema |
| Precondizioni | L'utente possiede un account. Backend raggiungibile. |
| Postcondizioni | Sessione attiva, token salvato, dati app idratati da API. |
| Flusso normale | 1. L'utente inserisce email e password. 2. Il sistema valida le credenziali. 3. Il backend restituisce token JWT e profilo pubblico. 4. L'app salva sessione e apre la home. |
| Flussi alternativi | Credenziali errate; backend non raggiungibile; token non valido durante il ripristino sessione. |

### UC3 - Ripristino sessione

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Esiste una sessione salvata localmente. |
| Postcondizioni | L'utente rientra in home se il token e valido; altrimenti torna ad autenticarsi. |
| Flusso normale | 1. All'avvio l'app legge la sessione da SecureStore/localStorage. 2. Imposta il Bearer token. 3. Verifica il profilo con `/auth/me`. 4. Aggiorna sessione, eventi, preferiti, iscrizioni e notifiche. |
| Flussi alternativi | Backend offline: resta visibile il profilo salvato ma le azioni remote sono bloccate; token scaduto/non valido: sessione cancellata. |

### UC4 - Logout account

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | L'utente e autenticato. |
| Postcondizioni | Token locale rimosso, push token disabilitato se presente, utente riportato alla schermata auth. |
| Flusso normale | 1. L'utente apre il profilo e seleziona Esci. 2. L'app prova a disregistrare il push token. 3. Rimuove token e sessione locale. 4. Svuota dati utente, notifiche e stato app. |
| Flussi alternativi | Backend non raggiungibile: il logout locale viene comunque completato. |

## Profilo utente

### UC5 - Modifica informazioni profilo

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | L'utente e autenticato e apre la sezione profilo. |
| Postcondizioni | Profilo aggiornato localmente e, se online, persistito nel backend. |
| Flusso normale | 1. L'utente tocca modifica profilo. 2. Aggiorna avatar, nome, citta, bio e interessi. 3. Il sistema valida nome minimo, citta dai suggerimenti e almeno 3 interessi. 4. L'app invia `PUT /me`. 5. I dati locali e gli eventi creati vengono riallineati al nuovo nome. |
| Flussi alternativi | Backend offline: aggiornamento locale con avviso; citta non selezionata dai suggerimenti; meno di 3 interessi; errore API. |

### UC6 - Visualizzazione riepilogo profilo

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Organizzatore |
| Precondizioni | L'utente e autenticato. |
| Postcondizioni | Sono visibili eventi creati, preferiti e iscrizioni. |
| Flusso normale | 1. L'utente apre il profilo. 2. Il sistema mostra dati profilo e sezioni espandibili. 3. L'utente apre card evento da eventi creati, preferiti o iscrizioni. |
| Flussi alternativi | Sezioni vuote con stato vuoto. |

## Ricerca e navigazione eventi

### UC7 - Ricerca testuale eventi

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | L'utente e autenticato e sono disponibili eventi. |
| Postcondizioni | Feed/mappa mostrano gli eventi coerenti con la query. |
| Flusso normale | 1. L'utente digita nella barra ricerca. 2. L'app filtra eventi per titolo, luogo, indirizzo, citta e tag. 3. Il backend supporta anche ricerca su descrizione. 4. La lista viene aggiornata. |
| Flussi alternativi | Nessun risultato; backend offline con dati correnti mantenuti. |

### UC8 - Filtraggio eventi

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Feed o mappa visibili. |
| Postcondizioni | Sono mostrati solo gli eventi che soddisfano i filtri. |
| Flusso normale | 1. L'utente apre il pannello filtri. 2. Seleziona categorie, prezzo gratuito/a pagamento e raggio. 3. Il sistema calcola distanze dalla posizione utente o usa la citta di fallback. 4. Feed e mappa si aggiornano con badge filtri attivi. |
| Flussi alternativi | Posizione negata: filtro raggio disabilitato e fallback sulla citta profilo; nessun evento nel raggio: proposta di eventi piu lontani. |

### UC9 - Visualizzazione eventi su mappa

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema, Servizi esterni |
| Precondizioni | L'utente apre la tab Mappa. |
| Postcondizioni | Eventi filtrati visualizzati come pin; posizione/raggio mostrati se disponibili. |
| Flusso normale | 1. L'app richiede permesso posizione. 2. Se concesso, centra la mappa sulla posizione utente. 3. Mostra pin colorati per categoria. 4. L'utente seleziona un pin e vede anteprima evento. 5. Puo espandere la mappa o aprire i filtri. |
| Flussi alternativi | Permesso negato, servizi posizione assenti o caricamento: fallback su citta profilo. |

### UC10 - Visualizzazione dettaglio evento

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Organizzatore |
| Precondizioni | L'utente seleziona una card o un pin evento. |
| Postcondizioni | Dettaglio evento visibile con azioni coerenti con ruolo e stato. |
| Flusso normale | 1. L'utente apre il dettaglio. 2. Il sistema mostra immagine, titolo, descrizione, data/ora, luogo, mini-mappa, costo, partecipanti/capienza, preferito e iscrizione. 3. Se iscritto, l'utente puo aprire la chat. 4. Se creatore, vede modifica e cancellazione. |
| Flussi alternativi | Evento annullato: azioni disabilitate e avviso visibile; apertura mappe esterne non riuscita: fallback a URL web. |

## Preferiti e iscrizioni

### UC11 - Gestione preferiti

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Backend online, evento remoto non annullato. |
| Postcondizioni | Stato preferito aggiornato in app e database. |
| Flusso normale | 1. L'utente tocca l'icona preferito da card o dettaglio. 2. L'app aggiorna ottimisticamente lo stato. 3. Il backend crea o rimuove il bookmark. 4. Il profilo mostra l'evento nella sezione preferiti. |
| Flussi alternativi | Backend non raggiungibile; rollback se l'API fallisce; evento cancellato non salvabile. |

### UC12 - Iscrizione a evento

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Backend online, evento attivo, utente non iscritto. |
| Postcondizioni | Partecipazione registrata e conteggio aggiornato. |
| Flusso normale | 1. L'utente apre il dettaglio e tocca Partecipa. 2. L'app aggiorna ottimisticamente iscrizione e partecipanti. 3. Il backend esegue transazione serializable, verifica capienza e crea la partecipazione. 4. L'app aggiorna conteggio dal backend e abilita la chat evento. |
| Flussi alternativi | Evento al completo; conflitto concorrente; backend offline; evento annullato. |
| Nota | Non esiste flusso pagamento: anche gli eventi con prezzo sono gestiti come iscrizione diretta. |

### UC13 - Annullamento iscrizione

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Utente iscritto a un evento. |
| Postcondizioni | Partecipazione rimossa e conteggio aggiornato. |
| Flusso normale | 1. L'utente tocca Annulla dal dettaglio. 2. L'app aggiorna ottimisticamente lo stato. 3. Il backend elimina la partecipazione se presente. 4. Il conteggio partecipanti viene riallineato. |
| Flussi alternativi | Backend offline; errore API con rollback locale. |

## Gestione eventi

### UC14 - Creazione nuovo evento

| Campo | Dettaglio |
|---|---|
| Attori | Organizzatore, Sistema, Servizi esterni |
| Precondizioni | L'utente e autenticato e backend online. |
| Postcondizioni | Evento pubblicato, visibile in feed/mappa, creatore eventualmente iscritto. |
| Flusso normale | 1. Step tipo: sceglie categoria/sottocategoria, titolo e descrizione. 2. Step luogo/orari: cerca indirizzo o sposta POI su mappa, imposta data/ora futura, capienza e prezzo. 3. Step pubblicazione: sceglie chat, decide se contarsi come partecipante e conferma. 4. L'app valida campi e coordinate italiane. 5. Il backend crea l'evento e, se richiesto, la partecipazione del creatore. 6. Il sistema notifica utenti con interessi/citta compatibili. |
| Flussi alternativi | Backend offline; indirizzo non riconosciuto; data passata; capienza/prezzo non validi; categoria sconosciuta non presente nella tassonomia. |

### UC15 - Modifica evento

| Campo | Dettaglio |
|---|---|
| Attori | Organizzatore, Sistema |
| Precondizioni | Utente creatore dell'evento; evento non annullato. |
| Postcondizioni | Evento aggiornato e, se luogo/data cambiano, partecipanti notificati. |
| Flusso normale | 1. L'organizzatore apre il dettaglio e seleziona modifica. 2. Aggiorna i campi nel form evento. 3. L'app invia `PUT /events/:id`. 4. Il backend verifica proprieta e aggiorna. 5. Se cambia data/ora o luogo, crea notifiche `EVENT_UPDATED`. |
| Flussi alternativi | Utente non creatore; backend offline; evento annullato; validazione fallita. |

### UC16 - Annullamento evento

| Campo | Dettaglio |
|---|---|
| Attori | Organizzatore, Sistema |
| Precondizioni | Utente creatore dell'evento. |
| Postcondizioni | Evento escluso da feed/mappa e notifiche inviate. |
| Flusso normale | 1. L'organizzatore tocca elimina dal dettaglio. 2. Conferma il dialogo. 3. L'app rimuove l'evento localmente. 4. Il backend aggiunge il tag `status:cancelled` e crea notifiche per partecipanti/preferiti. |
| Flussi alternativi | Backend offline; errore API con rollback locale; evento gia annullato. |

## Chat e comunicazione

### UC17 - Visualizzazione chat evento

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Organizzatore, Sistema |
| Precondizioni | Utente creatore o iscritto all'evento. |
| Postcondizioni | Cronologia messaggi evento visibile in ordine cronologico. |
| Flusso normale | 1. L'utente apre Inbox o Chat dal dettaglio evento. 2. Il sistema carica i messaggi con `GET /events/:id/messages`. 3. La conversazione evento viene mostrata insieme a eventuali chat dirette. |
| Flussi alternativi | Utente non iscritto: accesso negato; evento annullato: accesso negato; backend offline: restano messaggi gia in stato locale. |

### UC18 - Invio messaggio in chat evento

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Organizzatore, Sistema |
| Precondizioni | Utente autorizzato alla chat; testo non vuoto. |
| Postcondizioni | Messaggio salvato e pubblicato realtime agli utenti coinvolti. |
| Flusso normale | 1. L'utente scrive il messaggio. 2. L'app mostra messaggio ottimistico. 3. Il backend salva `ChatMessage`. 4. Il backend pubblica evento WebSocket e crea notifiche chat. 5. L'app sostituisce il messaggio locale con quello confermato. |
| Flussi alternativi | Modalita solo annunci: solo organizzatore puo inviare; errore API: messaggio marcato fallito; testo oltre 2000 caratteri respinto. |

### UC19 - Avvio chat diretta

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Backend online. |
| Postcondizioni | Conversazione 1:1 creata o riaperta. |
| Flusso normale | 1. L'utente apre Inbox e cerca una persona per email. 2. Il sistema valida formato email e impedisce autoconversazione. 3. Il backend cerca l'utente. 4. L'app crea o apre la conversazione diretta. |
| Flussi alternativi | Email non valida; utente non trovato; backend offline; tentativo di chat con se stessi. |

### UC20 - Invio messaggio diretto

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Conversazione diretta esistente; testo non vuoto. |
| Postcondizioni | Messaggio salvato, conversazione aggiornata, destinatario notificato. |
| Flusso normale | 1. L'utente scrive nella conversazione diretta. 2. L'app mostra messaggio ottimistico. 3. Il backend salva `DirectMessage`, aggiorna `DirectConversation.updatedAt` e pubblica WebSocket a mittente e destinatario. 4. Il destinatario riceve notifica `CHAT_MESSAGE`. |
| Flussi alternativi | Utente non parte della conversazione; errore API; backend offline. |

## Notifiche

### UC21 - Visualizzazione centro notifiche

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Utente autenticato. |
| Postcondizioni | Elenco notifiche visibile, ordinate dalla piu recente. |
| Flusso normale | 1. L'utente tocca la campanella in home. 2. Il backend esegue pulizia e job reminder. 3. Restituisce fino a 80 notifiche. 4. L'app mostra badge non lette e lista. |
| Flussi alternativi | Lista vuota; backend offline; notifica relativa a evento non piu disponibile. |

### UC22 - Gestione lettura e cancellazione notifiche

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema |
| Precondizioni | Notifiche presenti. |
| Postcondizioni | Stato notifica aggiornato o notifica eliminata. |
| Flusso normale | 1. L'utente apre una notifica: l'app la marca letta e apre evento o inbox. 2. L'utente puo marcare tutte come lette. 3. Puo cancellare singola notifica o tutte. 4. Il backend aggiorna o elimina solo notifiche dell'utente corrente. |
| Flussi alternativi | Backend offline: aggiornamento locale temporaneo; errore cancellazione: refresh notifiche. |

### UC23 - Registrazione push token

| Campo | Dettaglio |
|---|---|
| Attori | Utente registrato, Sistema, Servizi esterni |
| Precondizioni | Utente online su dispositivo supportato, non web/simulatore/Expo Go. |
| Postcondizioni | Push token salvato o aggiornato nel backend. |
| Flusso normale | 1. L'app chiede permesso notifiche. 2. Configura canale Android se necessario. 3. Recupera Expo push token. 4. Invia token, piattaforma e device al backend. 5. Il backend lo salva in `PushToken`. |
| Flussi alternativi | Permesso negato; progetto Expo mancante; dispositivo non supportato; token disabilitato in logout. |

### UC24 - Notifiche automatiche di sistema

| Campo | Dettaglio |
|---|---|
| Attori | Sistema, Utente registrato, Organizzatore |
| Precondizioni | Eventi, preferiti, iscrizioni o messaggi generano condizioni di notifica. |
| Postcondizioni | Notifiche in-app e, se possibile, push inviate. |
| Flusso normale | 1. Nuovo evento: notifica agli utenti con interesse e citta compatibili. 2. Evento modificato/cancellato: notifica a partecipanti/preferiti interessati. 3. Capienza: notifica pochi posti o evento pieno. 4. Chat: notifica messaggi evento, annunci e diretti. 5. Scheduler: reminder evento salvato domani e evento iscritto tra un'ora. |
| Flussi alternativi | Dedupe key gia presente; push token assente/invalidato; Expo segnala device non registrato e il token viene disabilitato. |

## Casi d'uso originali rimossi o rinviati

| Caso originale | Stato riallineato | Motivazione |
|---|---|---|
| UC4 Recupero password | Rinviato | Nessuna UI o API di reset password presente. |
| UC7 Cancellazione definitiva account | Rinviato | Nessuna API delete account presente. |
| UC18 Esecuzione pagamento simulato | Rimosso dalla versione attuale | L'app registra direttamente la partecipazione anche se `price > 0`; non esiste Payment entity o checkout. |
| Filtraggio per data/orario nel vecchio UC10 | Rinviato | I filtri attuali sono query, categoria, prezzo e raggio. |
| Dashboard statistiche organizzatore avanzata | Rinviato | Il profilo mostra liste/eventi, non una dashboard statistica dedicata. |
