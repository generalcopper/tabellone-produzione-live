# Picking FBA: completamento per operatori

Gli utenti già abilitati a Picking possono salvare il prelievo FBA/PDF per SKU,
per intero flusso o in gruppo. La pagina era già abilitata; il blocco era nella
regola Firestore di aggiornamento dei documenti amzInventory/{loc}/logs/{id}.

La nuova eccezione riguarda solo scarichi FBA/PDF aperti e i campi status,
reservation e picking. Verifica l'operatore registrato e la coerenza dello
stato completato/parziale. Modifica delle righe, cancellazione, annullamento,
flussi Shopify e account non abilitati conservano i permessi precedenti.
Inventario e movimenti continuano nella stessa transazione dell'applicazione.

## Provenienza e rilascio

security/firestore.rules contiene le regole effettivamente pubblicate, con la
sola aggiunta di canCompleteFbaPicking e dell'eccezione update per i log.
Snapshot iniziale: projects/tabellone-produzione-liv-e313e/rulesets/b8c4a77d-07af-488b-9ee6-7251a5e562a1.
La release iniziale cloud.firestore era aggiornata il 3 agosto 2026.
Il rilascio avviene solo tramite Firebase Rules, controllando prima che il
ruleset iniziale sia ancora quello attivo. Non richiede un deploy Hosting.
Per rollback si può riassociare cloud.firestore al ruleset iniziale, dopo
aver verificato che non siano intervenute modifiche successive.

## Verifiche

- Riprodotto il diniego con le regole precedenti; inventario invariato.
- 30 test su Firestore Emulator: ordine FBA di 13 righe, prelievo parziale e
  completamento, tentativo ripetuto, operazioni in gruppo, Cerea, identificazione
  per UID/email/directory, admin, utenti disabilitati e non abilitati.
- Verificati dinieghi per alterazione ordine, annullamento, cancellazione,
  attribuzione a un altro operatore e aggiornamento movimenti esistenti.
- 57 test esistenti di picking, inventario, ubicazioni, alias e Cerea superati.
- Controlli della struttura capannone e delle altre sezioni superati.

I test eseguono la funzione commitPickingCloudTransaction di public/picking.js
con un adattatore REST per l'emulatore. I percorsi stock/movimenti sono
rappresentativi; l'aritmetica inventario resta coperta dai test esistenti.
Nessun ordine reale viene completato durante la verifica.

Avviare un emulatore isolato con Java 21 (locale en_US), progetto
demo-picking-permissions e security/firestore.rules. Eseguire:

    FIRESTORE_EMULATOR_HOST=127.0.0.1:8795 node --test tests/picking-fba-permissions.test.cjs

Il test accetta solo localhost/127.0.0.1 e resetta esclusivamente il database
locale demo-picking-permissions. Per riprodurre il blocco precedente impostare
anche PICKING_RULES_FILE al relativo snapshot e PICKING_EXPECT_LEGACY_DENIAL=1.
