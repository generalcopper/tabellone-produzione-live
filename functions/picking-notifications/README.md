# Picking: notifiche email e riepiloghi

Nel menu Notifiche l'amministratore seleziona gli account già registrati.
Nome, email e ultimo accesso provengono da Firebase Auth; gli inviti per email
e i documenti UID vengono ricondotti allo stesso account.
Ultimo accesso indica lastSignInTime, cioè l'ultima autenticazione dell'account.

## Invii

- WRITE / linea automatica liquidi: email immediata all'inserimento di una riga
  visibile in producedDays/linea_liquidi/queue/{queueId} o a una modifica reale
  della sua quantità/unità. Ricevono solo gli utenti con notifiche già attive.
  L'email contiene esclusivamente la coda attuale da produrre, nello stesso ordine
  del tabellone: prodotto, codice e quantità. Non include i riordini nascosti,
  le taniche/formati 5-10 kg/l o le quantità sotto soglia che la UI esclude.
  I prodotti finiti manuali mantengono l'esenzione UI dalla soglia. Le righe
  degli ordini richiedono orderKey nella allowlist della linea; righe completate,
  annullate, a zero o concluse nello storico sono escluse.
  I test di contratto confrontano direttamente i filtri con tabellone_write.html.
- Oggetto WRITE: «Nuovi prodotti in coda · Linea automatica liquidi», anche
  per le modifiche. Ogni riga indica «Quantità da produrre». Il corpo mostra soltanto
  l'elenco operativo, il collegamento alla coda e la data di aggiornamento.
- Amazon e Write restano email separate. Gli inserimenti usano la chiave WRITE:
  con createTime; le quantità usano WRITE_QUANTITY: con updateTime per distinguere
  ogni modifica e deduplicare i retry concorrenti. Riordini, metadati e salvataggi
  della stessa quantità non inviano. Gli eventi con quantità ormai superata non
  inviano dati vecchi. Una modifica a una riga creata prima dell'attivazione
  può notificare, mentre l'attivazione da sola non invia arretrati.
  Nei retry SMTP la coda viene riletta e il contenuto ricostruito; se il prodotto
  non è più visibile, è completato o la quantità è superata, il retry è annullato.
- FBA: email all'arrivo di ogni nuovo flusso operativo in
  amzInventory/concamarise/logs/{flowId}. Il registro dell'evento evita duplicati
  per risincronizzazioni, modifiche ordinarie e retry di Eventarc.
- FBM: riepilogo ogni giorno alle 08:00 Europe/Rome, con cambio automatico
  tra ora solare e legale. Nessun invio all'arrivo del singolo ordine FBM.
- Invia riepilogo: invio manuale ai soli utenti spuntati, con totali aggiornati
  dei pezzi e prodotti FBA e degli ordini e pezzi FBM ancora da evadere. Si può inviare anche con zero
  ordini. Il riepilogo giornaliero mostra entrambi i totali, anche se sono zero.
- Le email usano HTML e testo semplice. Grafica operativa ispirata alle email
  transazionali Amazon: fondo bianco, testo scuro, separatori grigi, pulsante
  giallo e tabelle compatte. L'identità del mittente resta LG Trading SRL / Picking.
  L'avviso include la procedura per lo stabilimento LG Trading SRL di
  Concamarise. Se ci sono prodotti FBA, l'avviso richiede preparazione prioritaria
  per il carico Amazon, senza inventare una data o un orario di ritiro.
- Ogni mail Picking Amazon indica in alto Incaricato: Nome Cognome. Il nome viene risolto sul
  server dall'account del singolo destinatario, con gli stessi criteri del
  pannello utenti (Auth, profilo, email in assenza di nome). Il contenuto viene
  generato separatamente per ogni destinatario; il browser non può indicare il
  nome dell'incaricato nel payload dell'invio.
- Il mittente visualizzato è LG Trading SRL - Picking Concamarise. L'oggetto
  ha un massimo di 100 caratteri: priorità FBA, pezzi FBA e ordini FBM. Ad esempio:
  Picking Concamarise | FBA urgente: 348 pezzi | FBM: 5 ordini.
  Il limite usa formulazioni complete, senza tagliare parole o quantità.
  HTML e testo riportano sempre tutti i prodotti, i riferimenti di spedizione
  Amazon o di ordine FBM e le quantità assegnate a ciascuno. Il totale FBA
  distingue pezzi da preparare e prodotti distinti (SKU), senza contare i flussi.
- I titoli provengono dall'ordine; per vecchie righe senza nome viene consultato
  il catalogo fisico di Concamarise. Non vengono inclusi dati dei clienti.
- I conteggi leggono le fonti operative in una transazione. Escludono annullati,
  completati, prelevati e duplicati dei log Shopify. Per FBM si sottrae il
  maggiore tra shippedQty e inventoryAppliedQty; righe già azzerate non vengono
  recuperate dai vecchi dettagli dell'ordine.

## Accessi e affidabilità

Si riutilizzano la collezione email e l'estensione Firebase già attiva,
con mittente info@generalcoppersrl.com, senza nuove credenziali email.
Le collezioni pickingEmailConfig, pickingEmailRecipients, pickingEmailEvents e
pickingEmailDeliveries sono protette dalle regole Firestore default deny.
L'API verifica il token revocato e rilegge il flag isAdmin protetto dalle regole
per ogni richiesta. I campi liberi role/admin non conferiscono autorizzazioni.

Un utente disattivato, con email non verificata o cambiata dopo la selezione non
riceve avvisi. Le modifiche ai destinatari usano una revisione concorrente.
L'invio manuale accetta un identificatore univoco della richiesta, mantenuto dal
frontend anche quando la risposta di rete va persa; una transazione permette
un solo riepilogo per richiesta e un nuovo invio manuale al massimo al minuto.
I destinatari vengono sempre ricavati sul server, mai dal payload del browser.

L'ultimo invio viene aggiornato solo dopo SUCCESS, accettazione SMTP dell'email
prevista e delivery.endTime. Non indica la lettura da parte del lavoratore.
Non sono presenti tracking delle aperture, pulsanti di conferma lettura o
richieste di risposta. I collegamenti Apri Picking aprono soltanto l'applicazione.
Per errori SMTP temporanei espliciti sono consentiti tre tentativi totali,
con attesa di 60 e poi 300 secondi nella funzione Eventarc esistente.
Esiti ambigui dopo DATA non vengono ritentati, per evitare invii duplicati.
I retry ricontrollano account, selezione e validità del riepilogo o flusso.
Gli invii per singolo FBM della versione precedente non vengono ritentati.

## Pianificazione e deploy

pickingEmailFbmMorning usa Cloud Scheduler, già attivo nel progetto:
cron 0 8 * * *, timeZone Europe/Rome, invocazione privata tramite l'identità
Compute esistente 537555699968-compute@developer.gserviceaccount.com.
Non vengono creati service account o assegnati ruoli a livello di progetto.
La chiave DAILY_FBM:data-italiana evita duplicati, anche con job concorrenti.
Le esecuzioni fuori orario o troppo vecchie vengono ignorate. Il destinatario
deve essere già selezionato all'ora prevista; non vengono inviati arretrati.

Il timestamp activatedAt in pickingEmailConfig/system è preservato.
writeActivatedAt abilita solo gli eventi Write successivi all'attivazione;
non invia arretrati della coda già esistente.
Per aggiornare questo solo codebase:

    firebase deploy --only functions:picking-notifications --project tabellone-produzione-liv-e313e --non-interactive

Funzioni finali: pickingEmailApi, pickingEmailFba, pickingEmailWrite, pickingEmailDelivery,
pickingEmailFbmMorning. Il vecchio trigger pickingEmailFbm è già stato rimosso.
Hosting viene pubblicato dal workflow esistente dopo un unico push su main.

## Verifica

    npm test

Con Firestore Emulator attivo esclusivamente su 127.0.0.1:8791:

    FIRESTORE_EMULATOR_HOST=127.0.0.1:8791 npm test

Contratto con la UI: node --test tests/write-email-visibility.test.cjs (dalla root).
I test di integrazione usano solo demo-picking-email-tests. Coprono selezione,
accessi, riepiloghi manuali, conteggi e dettaglio prodotti, deduplicazione,
orario italiano, retry e ultimo invio confermato. Nessuna email di prova viene
spedita ai lavoratori.


## Automatic temporary Cerea placement

`pickingAutoCerea` listens to writes on `amzInventory/concamarise/items/{sku}`.
For items whose production area is Cerea, it assigns all currently unallocated
pieces to `cereaAllocations`, by lot. They remain in Picking's **Da ubicare**
and retain its green Cerea badge. Rack transfers reduce the temporary balance.

The transaction reads current stock on every retry and only writes Cerea fields
on the inventory document and its existing product mirror. It never changes
stock totals, reservations, rack allocations or authoritative stock timestamps.
Manual Cerea allocations for other production areas are unaffected.

Deploy only this handler: `firebase deploy --only functions:picking-notifications:pickingAutoCerea --project tabellone-produzione-liv-e313e --non-interactive`.
Run the backend and Picking contract tests from the repository root with
`node --test tests/*.test.cjs functions/picking-notifications/*.test.js`.
