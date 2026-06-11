# Evnt - Riepilogo riallineamento documentazione

## Documenti prodotti

| Documento | Scopo |
|---|---|
| `01_requisiti.md` | Requisiti funzionali/non funzionali riallineati all'app attuale. |
| `02_casi_uso.md` | Casi d'uso aggiornati, con casi rimossi/rinviati esplicitati. |
| `03_schema_database.md` | Schema database aggiornato da Prisma/PostGIS, con Mermaid ER. |

## Punti confermati dalla documentazione originale

- Registrazione email/password con vincolo 16+.
- Scelta interessi per personalizzare feed e affinita.
- Feed eventi, ricerca, filtri, mappa e dettaglio evento.
- Preferiti/bookmark.
- Iscrizione/disiscrizione evento con capienza opzionale.
- Creazione evento in 3 step.
- Modifica/cancellazione evento da parte del creatore.
- Chat evento con modalita gruppo aperto o solo annunci.
- Centro notifiche.

## Punti aggiornati rispetto all'app reale

- Il prezzo dell'evento e solo informativo: non esistono pagamento, pagamento simulato o tabella `Payment`.
- I filtri disponibili sono ricerca, categoria, prezzo e raggio; non sono presenti filtri data/orario dedicati.
- L'app usa JWT con scadenza configurabile, non refresh token dedicati.
- L'app non implementa SSO Google/Apple.
- L'app non implementa recupero password email.
- L'app non implementa cancellazione definitiva account.
- La chat non e solo per eventi: sono implementate conversazioni dirette 1:1 cercando utenti per email.
- Il database include `direct_conversations`, `direct_messages` e `push_tokens`, assenti nel vecchio ER.
- Le notifiche includono tipologia, dedupe key, event id opzionale e consegna push Expo.
- L'annullamento evento e un soft delete tramite tag tecnico `status:cancelled`, non una cancellazione fisica immediata.
- La geolocalizzazione usa PostGIS con colonna `geom` generata e fallback sulla citta del profilo.

## File originali preservati

La zip e stata estratta in `documentazione_originale` solo come copia di lettura. I nuovi documenti sono separati in `documentazione_riallineata`, cosi il materiale originale resta confrontabile.
