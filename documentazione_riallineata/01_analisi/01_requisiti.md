# Evnt - Analisi dei requisiti riallineata

Versione aggiornata rispetto all'app attuale presente nel repository `Evnt`.

## Fonti di riallineamento

- Backend Express/Prisma: `evnt-backend/src/routes/*`, `evnt-backend/prisma/schema.prisma`.
- Frontend Expo/React Native: `evnt-frontend/App.tsx`, `src/screens/*`, `src/api/index.ts`.
- Documentazione originale estratta dalla zip: PDF e fogli Excel in `documentazione_originale`.

## Legenda categorie

| Categoria | Significato |
|---|---|
| Account | Registrazione, login, sessione, profilo, interessi |
| UX/UI | Navigazione, schermate, filtri, feedback visivo |
| Data | Persistenza, database, cache/sessione, cataloghi |
| Device | Geolocalizzazione, mappe, push su dispositivo |
| Messaging | Chat evento, annunci, messaggi diretti, realtime |
| Notification | Centro notifiche, push, reminder automatici |
| Security | Autenticazione, autorizzazioni, password, validazione |
| Performance | Tempi di risposta, query geospaziali, polling/realtime |
| Portability | Expo cross-platform, web/iOS/Android |

## Legenda priorita

| Priorita | Significato |
|---|---|
| 0 - Critical | Il sistema non funziona se il requisito non e soddisfatto |
| 1 - Mandatory | Richiesto per il rilascio della versione attuale |
| 2 - Desiderable | Migliora l'esperienza ma non blocca la versione attuale |
| 3 - Minor | Utile ma rimandabile |
| 4 - Cosmetic | Solo rifinitura visiva |

## Requisiti funzionali

### Account e autenticazione

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-01 | Registrazione con email, password, conferma password, nome, data di nascita, citta, bio opzionale, avatar opzionale e interessi. | Account | 0 - Critical | Implementato |
| RF-02 | Verifica disponibilita email prima del completamento della registrazione. | Account | 1 - Mandatory | Implementato |
| RF-03 | Accesso con email e password. | Account | 0 - Critical | Implementato |
| RF-04 | Sessione persistente tramite token JWT salvato localmente; ripristino automatico all'avvio se il token e valido. | Account | 1 - Mandatory | Implementato |
| RF-05 | Logout con rimozione sessione locale e disregistrazione del push token, se presente. | Account | 1 - Mandatory | Implementato |
| RF-06 | Verifica eta minima: l'utente deve avere almeno 16 anni. | Account | 0 - Critical | Implementato |
| RF-07 | Selezione obbligatoria di almeno 3 interessi/categorie durante onboarding e modifica profilo. | Account | 1 - Mandatory | Implementato |
| RF-08 | Profilo utente con nome, email, citta, data di nascita, bio, avatar e interessi. | Account | 1 - Mandatory | Implementato |
| RF-09 | Modifica profilo: nome, citta validata dai suggerimenti, bio, avatar e interessi. | Account | 1 - Mandatory | Implementato |
| RF-10 | Recupero password via email. | Security | 2 - Desiderable | Non implementato nella versione attuale |
| RF-11 | Login Google/Apple SSO. | Security | 3 - Minor | Non implementato nella versione attuale |
| RF-12 | Cancellazione definitiva account e dati associati. | Data | 2 - Desiderable | Non implementato nella versione attuale |

### Catalogo, feed e ricerca eventi

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-13 | Lettura catalogo interessi e categorie dal backend. | Data | 1 - Mandatory | Implementato |
| RF-14 | Feed eventi attivi/non annullati con card contenenti titolo, categoria, data, ora, luogo, costo, partecipanti, distanza, affinita e stato. | UX/UI | 0 - Critical | Implementato |
| RF-15 | Ricerca testuale per titolo, descrizione, luogo, indirizzo, citta e tag. | UX/UI | 1 - Mandatory | Implementato |
| RF-16 | Filtro categoria su feed e mappa. | UX/UI | 1 - Mandatory | Implementato |
| RF-17 | Filtro prezzo gratuito/a pagamento. | UX/UI | 1 - Mandatory | Implementato |
| RF-18 | Filtro raggio chilometrico quando la geolocalizzazione e disponibile; fallback alla citta del profilo se la posizione non e concessa. | Device | 1 - Mandatory | Implementato |
| RF-19 | Ordinamento eventi per affinita, distanza, prezzo, popolarita e data a livello API; feed locale ordinato per affinita/distanza. | UX/UI | 2 - Desiderable | Implementato parzialmente |
| RF-20 | Filtro data/orario esplicito. | UX/UI | 2 - Desiderable | Non implementato nella versione attuale |
| RF-21 | Evidenza eventi live/trending/cancellati tramite stato calcolato. | UX/UI | 3 - Minor | Implementato parzialmente |

### Mappa e dettaglio evento

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-22 | Vista mappa con pin colorati per categoria, posizione utente e raggio di ricerca. | Device | 1 - Mandatory | Implementato |
| RF-23 | Anteprima evento al click/tap del pin e apertura dettaglio evento. | UX/UI | 1 - Mandatory | Implementato |
| RF-24 | Filtri sincronizzati tra lista e mappa. | UX/UI | 1 - Mandatory | Implementato |
| RF-25 | Apertura luogo evento in Google Maps, Apple Maps o URL web equivalente. | Portability | 2 - Desiderable | Implementato |
| RF-26 | Scheda dettaglio con immagine, titolo, descrizione, categoria/sottocategoria, data, ora, indirizzo, mini-mappa, costo, partecipanti, capienza e organizzatore. | UX/UI | 0 - Critical | Implementato |
| RF-27 | Azioni da dettaglio: preferito, iscrizione/disiscrizione, chat evento se iscritto, modifica/cancellazione per creatore. | UX/UI | 1 - Mandatory | Implementato |

### Preferiti e partecipazioni

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-28 | Salvataggio e rimozione evento dai preferiti. | Data | 1 - Mandatory | Implementato |
| RF-29 | Visualizzazione eventi preferiti nel profilo. | UX/UI | 1 - Mandatory | Implementato |
| RF-30 | Iscrizione a evento con controllo capienza e gestione concorrente lato database. | Data | 0 - Critical | Implementato |
| RF-31 | Disiscrizione da evento e aggiornamento numero partecipanti. | Data | 1 - Mandatory | Implementato |
| RF-32 | Visualizzazione eventi a cui l'utente e iscritto nel profilo. | UX/UI | 1 - Mandatory | Implementato |
| RF-33 | Pagamento reale o simulato per eventi a pagamento. | Data | 2 - Desiderable | Non implementato: il prezzo e informativo |

### Creazione e gestione eventi

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-34 | Creazione evento in 3 step: tipo/contenuto, luogo/orari, pubblicazione. | UX/UI | 0 - Critical | Implementato |
| RF-35 | Selezione categoria e sottocategoria, anche personalizzata. | UX/UI | 1 - Mandatory | Implementato |
| RF-36 | Ricerca luogo con autocompletamento e selezione POI su mappa; geocoding/reverse geocoding per indirizzi italiani. | Device | 1 - Mandatory | Implementato |
| RF-37 | Validazione evento: titolo minimo 3 e massimo 90 caratteri, descrizione massimo 500, data/ora futura, indirizzo massimo 180, capienza intera positiva o illimitata, prezzo massimo EUR 10000. | UX/UI | 1 - Mandatory | Implementato |
| RF-38 | Configurazione capienza massima opzionale. | Data | 1 - Mandatory | Implementato |
| RF-39 | Configurazione costo evento, con 0 o campo vuoto equivalente a gratuito. | Data | 1 - Mandatory | Implementato |
| RF-40 | Scelta modalita chat evento: gruppo aperto o solo annunci. | Messaging | 1 - Mandatory | Implementato |
| RF-41 | Opzione per contare o meno il creatore tra i partecipanti iniziali. | UX/UI | 2 - Desiderable | Implementato |
| RF-42 | Modifica evento da parte del solo creatore. | Data | 1 - Mandatory | Implementato |
| RF-43 | Notifica agli iscritti quando cambiano data/ora o luogo dell'evento. | Notification | 1 - Mandatory | Implementato |
| RF-44 | Cancellazione evento da parte del creatore tramite annullamento logico, rimozione dal feed e notifica a partecipanti/preferiti. | Notification | 1 - Mandatory | Implementato |

### Chat, messaggistica e realtime

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-45 | Accesso alla chat evento riservato a creatore e partecipanti. | Messaging | 1 - Mandatory | Implementato |
| RF-46 | Invio e lettura messaggi evento in ordine cronologico, massimo 2000 caratteri. | Messaging | 1 - Mandatory | Implementato |
| RF-47 | Modalita solo annunci: solo il creatore puo scrivere. | Messaging | 1 - Mandatory | Implementato |
| RF-48 | Consegna realtime dei messaggi evento via WebSocket agli utenti coinvolti. | Messaging | 1 - Mandatory | Implementato |
| RF-49 | Ricerca utente per email per avviare una chat diretta. | Messaging | 1 - Mandatory | Implementato |
| RF-50 | Conversazioni dirette 1:1 con cronologia, ultimo messaggio e consegna realtime. | Messaging | 1 - Mandatory | Implementato |
| RF-51 | Notifica per nuovi messaggi evento, annunci organizzatore e messaggi diretti. | Notification | 1 - Mandatory | Implementato |

### Notifiche

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RF-52 | Centro notifiche con elenco ordinato, badge non lette e apertura del contesto evento/chat. | Notification | 1 - Mandatory | Implementato |
| RF-53 | Marcatura singola/tutte come lette. | Notification | 1 - Mandatory | Implementato |
| RF-54 | Cancellazione singola o totale delle notifiche. | Notification | 1 - Mandatory | Implementato |
| RF-55 | Registrazione, aggiornamento, disabilitazione e test del token push Expo. | Device | 1 - Mandatory | Implementato |
| RF-56 | Notifica nuovo evento compatibile con interessi e citta dell'utente. | Notification | 1 - Mandatory | Implementato |
| RF-57 | Reminder automatici per eventi salvati il giorno prima e per eventi iscritti un'ora prima dell'inizio. | Notification | 1 - Mandatory | Implementato |
| RF-58 | Notifiche capienza: pochi posti e evento al completo. | Notification | 2 - Desiderable | Implementato |
| RF-59 | Pulizia automatica notifiche lette dopo 24 ore e hard delete dopo 7 giorni. | Data | 2 - Desiderable | Implementato |

## Requisiti non funzionali

| ID | Descrizione | Categoria | Priorita | Stato app attuale |
|---|---|---|---|---|
| RNF-01 | Password salvate con hashing bcrypt. | Security | 0 - Critical | Implementato |
| RNF-02 | Autenticazione tramite JWT firmato, scadenza configurabile con default 7 giorni. | Security | 0 - Critical | Implementato |
| RNF-03 | Il token viene inviato come Bearer token e validato dal middleware backend. | Security | 0 - Critical | Implementato |
| RNF-04 | Storage sessione: SecureStore su mobile, localStorage su web. | Security | 1 - Mandatory | Implementato |
| RNF-05 | Validazione input lato backend con Zod per auth, eventi, profilo, chat, notifiche e utenti. | Security | 1 - Mandatory | Implementato |
| RNF-06 | Permesso esplicito per geolocalizzazione; fallback su citta profilo quando negato o non disponibile. | Device | 0 - Critical | Implementato |
| RNF-07 | Persistenza su PostgreSQL con PostGIS per query geospaziali. | Data | 0 - Critical | Implementato |
| RNF-08 | Colonna `geom` generata da latitudine/longitudine e indice GiST per calcolo distanze. | Performance | 1 - Mandatory | Implementato |
| RNF-09 | Realtime via WebSocket autenticato con token JWT e riconnessione automatica lato client. | Performance | 1 - Mandatory | Implementato |
| RNF-10 | Polling periodico lato app per eventi e notifiche, piu refresh all'attivazione dell'app. | Performance | 2 - Desiderable | Implementato |
| RNF-11 | API REST con errori strutturati e codici coerenti: 400 validazione, 401/403 auth, 404 risorsa, 409 conflitto. | UX/UI | 1 - Mandatory | Implementato |
| RNF-12 | Supporto cross-platform tramite Expo/React Native: web, iOS, Android. | Portability | 0 - Critical | Implementato |
| RNF-13 | Push native non disponibile su web, simulatori ed Expo Go; l'app degrada senza bloccare il flusso. | Portability | 1 - Mandatory | Implementato |
| RNF-14 | Nessuna memorizzazione di dati di pagamento. | Security | 1 - Mandatory | Implementato per assenza pagamenti |
| RNF-15 | Refresh token dedicato. | Security | 2 - Desiderable | Non implementato: e usato solo JWT con scadenza |
| RNF-16 | Crittografia dei dati applicativi a riposo oltre a password e storage protetto token. | Security | 2 - Desiderable | Non documentata/Non implementata |
| RNF-17 | Interfaccia multilingua. | Portability | 3 - Minor | Non implementato |
| RNF-18 | SLA uptime 99% e carico 10000 utenti attivi simultanei. | Performance | 2 - Desiderable | Non verificato nel repository |

## Requisiti rimossi o rinviati rispetto alla documentazione originale

| Requisito originale | Decisione di riallineamento | Motivazione |
|---|---|---|
| Login Google/Apple SSO | Rinviato, non requisito attivo | Nessuna route o UI SSO presente |
| Recupero password email | Rinviato, non requisito attivo | Nessuna route reset password/email presente |
| Cancellazione definitiva account | Rinviato, non requisito attivo | Nessuna route delete account presente |
| Pagamento simulato/PCI-DSS | Rimosso dalla versione attuale | Il prezzo e informativo, non esiste flusso pagamento |
| Filtri data/orario | Rinviati | UI e API attuali filtrano ricerca/categoria/prezzo/raggio |
| Refresh token | Rimosso dalla descrizione corrente | L'app usa JWT con scadenza configurabile, non refresh token |
| Multilingua | Rinviato | UI attuale in italiano |
