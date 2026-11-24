# Picking WhatsApp sul NUC

Installazione del 24 novembre 2026. WhatsApp Business è collegato al NUC e il
motore è in stato `READY`, anche dopo il riavvio del solo servizio Picking.
La sessione è stata abbinata dall’Android, mostrando il QR sul MacBook.
Prova reale inviata e consegnata al destinatario concordato alle 20:06
del 24/11/2026 (Europe/Rome); ricezione confermata dal titolare.
Avvisi automatici attivati alle 20:07. Nessun arretrato recuperato.

## Componenti

- Sorgenti: branch locale `feature/picking-whatsapp-nuc`, worktree
  `/Users/ludovicogiarola/Projects/tabellone-whatsapp-nuc` sul Mac mini.
- NUC Windows `DESKTOP-134S49F`: `C:\ProgramData\LGTrading\PickingWhatsApp`.
- Attività Windows `LGTrading Picking WhatsApp`, account **LocalService**, avvio al
  boot, riavvio dopo errore e verifica di avvio ogni cinque minuti; `IgnoreNew`
  impedisce istanze sovrapposte. L'eseguibile `PickingWhatsApp.exe` deriva da
  `launcher.cs`. Non modifica la policy PowerShell del sistema.
- Windows Job Object sull'intero albero Node/Chrome: memoria massima **1536 MB**,
  CPU massima **10%**, priorità BelowNormal; chiudendo il supervisore terminano
  anche i suoi processi figli. Con meno di 2 GB liberi il worker chiude il proprio
  browser e sospende gli invii. Il profilo Chrome è separato da quelli esistenti.
- API separata `pickingWhatsAppApi`, codebase `picking-whatsapp`, progetto
  `tabellone-produzione-liv-e313e`, regione `europe-west1`, Node 22, minInstances 0.
  Sono aggiornate soltanto pickingEmailApi, pickingEmailFba, pickingEmailWrite,
  pickingEmailFbmMorning e pickingEmailDelivery per gestire i due canali.
  warehouseMonitor e pickingAutoCerea non sono ridistribuite.
- Nessuna porta di ascolto sul NUC, nessun cambiamento a firewall, VM Forex,
  VM Wazuh o agent Wazuh. Nessun workflow GitHub eseguito.

## Flusso e controlli

I produttori degli avvisi FBA, Write e riepilogo creano le code dei canali
selezionati. Email e WhatsApp sono indipendenti: la sola selezione WhatsApp non
crea un’email. Il lettore dei registri email precedenti rimane compatibile con
lo stesso ID deterministico, impedendo duplicati durante il rilascio.

La schermata Notifiche contiene un unico elenco con flag Email e WhatsApp.
Toccando nome o riga si apre il dialogo con email e telefono e il pulsante Salva.
L’email di notifica è distinta dall’email di accesso Firebase; il login non viene
modificato. Il salvataggio dei due contatti è atomico e controlla entrambe le
revisioni. Lo stesso numero non può essere attivo su due dipendenti.
Non sono presenti pulsanti di prova. L’API amministrativa conserva la prova
interna per il collaudo. Il riepilogo manuale esistente resta disponibile.

Le didascalie indicano l’ultimo invio. Consegna e lettura WhatsApp compaiono solo
quando arriva una conferma del messaggio effettivamente inviato. L’orario della
lettura è quello di ricezione della conferma; se questa manca, la UI lo indica.
Le conferme sono persistenti nel registro locale e applicate soltanto all’ultimo
messaggio del numero/revisione correnti. Non vengono elaborati altri messaggi.

L'attivazione generale richiede una prova inviata. Ogni attivazione riparte dal
momento attuale: niente arretrati. Un avviso scade dopo 15 minuti. La perdita di
connessione o un esito incerto non comportano reinvio automatico dopo il dispatch.
Il registro SQLite locale usa transazioni persistenti e deduplicazione per ID;
il server usa lease e transazioni Firestore. `SENT` indica accettazione da parte
del client WhatsApp, non lettura o consegna sul telefono del destinatario.

L'API amministrativa verifica il token Firebase e il ruolo protetto `isAdmin`.
Il worker utilizza HMAC su corpo e timestamp, con chiave dedicata protetta da ACL
Windows e Secret Manager. Le nuove collezioni hanno default deny nelle regole
Firestore esistenti: il browser passa solo dall'API amministrativa. Non scrivere
chiavi, telefoni, testo dei messaggi o QR nei log né in Git.

Il client locale è `whatsapp-web.js` **1.34.8** con il fix ufficiale del 24/11/2026
per il nuovo login WhatsApp Web (PR #201990), bloccato al commit
`38eb45b2759450cc6fccb6a7a3f2cbc3bdb87db2`. Il confronto con il tag 1.34.8
contiene solo questa modifica a `src/Client.js`. Il tarball e la relativa integrità
sono fissati nel lockfile. Usa Puppeteer **25.18.1** e Zod
**4.6.7** bloccati tramite override. I componenti opzionali RemoteAuth non sono
installati perché la sessione rimane sul NUC. `browser.cjs` mantiene l'alias
`Browser.isConnected()` usato dalla pulizia del client con Puppeteer 25.
È un collegamento non ufficiale a
WhatsApp Web. Può richiedere nuovo abbinamento o aggiornamenti e non garantisce
continuità né assenza di restrizioni dell'account. L'email resta disponibile.
Non usa le tariffe per messaggio della piattaforma Meta; le richieste Firebase
e le risorse del NUC restano normali consumi dell'infrastruttura.

## Primo collegamento

1. Attivare WhatsApp Business sull'Android con il numero dedicato. Inserire il
   codice SMS direttamente nell'app, senza comunicarlo in chat.
2. Quando il telefono è pronto, creare esclusivamente
   `C:\ProgramData\LGTrading\PickingWhatsApp\data\pair.request`.
3. Entro un minuto il worker genera `data\pairing.png`, accessibile solo agli
   account autorizzati del NUC. Mostrarlo al titolare per la scansione da
   **WhatsApp Business → Dispositivi collegati → Collega un dispositivo**.
   Il tentativo dura cinque minuti; il QR viene eliminato dopo il collegamento.
4. Verificare `READY` in `data\status.json`. In Picking salvare il numero del
   destinatario di prova concordato. Eseguire una prova tramite l’API amministrativa
   autenticata (`sendTest` con requestId stabile), senza aggiungere pulsanti alla UI.
5. Controllare il messaggio sul telefono, quindi attivare gli avvisi WhatsApp.

La SIM serve per la registrazione sul telefono. Il collegamento al NUC avviene
tramite QR, non tramite il codice SMS. Non è presente un assistente IA e il
motore non elabora domande o messaggi in ingresso.

## Stato e manutenzione

- `data\status.json`: stato, ultima risposta API, memoria del worker e libera.
- `data\events.log`: soli eventi tecnici, rotazione a 1 MB più un file precedente.
- `data\outbox.sqlite`: registro persistente; risultati confermati conservati 90 giorni.
- `data\session`: sessione WhatsApp privata, mai pubblicare o includere nello ZIP.
- `data\probe-result.json`: prova Chrome con sandbox attiva, LocalService e limiti.

Per mettere in pausa tutti gli invii usare l’API amministrativa autenticata
`setEnabled: false`; i flag di Picking controllano i singoli dipendenti. Per sospendere
anche il browser creare il file `data\pause`; rimuoverlo per consentire la ripresa.
Per manutenzione completa disabilitare **questa sola attività** Windows e poi
fermarla; il controllo ogni cinque minuti altrimenti può riavviarla.
Non usare comandi che arrestino tutti i processi Node/Chrome o le VM.

I pacchetti sono bloccati da `package-lock.json`. Per installare dipendenze usare
`npm ci --ignore-scripts --omit=optional`; Chrome è quello già installato, con profilo separato.
Il runtime NUC richiede Node 24 per SQLite. Non aggiornare Node o Chrome globali
come parte della manutenzione del worker senza verificare gli altri servizi.

## Verifiche e rilascio

- 15 test backend WhatsApp passati con Firestore Emulator su `127.0.0.1:8794`, progetto
  fittizio `demo-picking-whatsapp-tests`; nessun dato operativo nei test.
- 92 test del backend notifiche passati nell’emulatore separato sulla porta 8791:
  invii email esistenti, canali indipendenti, contatti atomici e protezione da
  conferme tardive dirette a contatti precedenti.
- 10 test del worker passati anche sul NUC: deduplicazione, invio ambiguo,
  annullamento, numero non registrato, persistenza dopo riavvio e conferme di lettura.
- Test UI headless: lista unica, due flag indipendenti, dialogo contatti,
  salvataggio e ricaricamento, conflitti di modifica, riepilogo WhatsApp-only,
  conferme effettive, mobile 390 px e pulizia dei contatti al logout.
- Chrome avviato con successo come LocalService senza disabilitare la sandbox.
- QR di collegamento generato sul NUC con il fix ufficiale per il nuovo login.
  Associazione completata; sessione recuperata dopo riavvio del worker.
- API pubblica senza credenziali: HTTP 401. Worker autenticato: risposta corretta.
- Audit delle dipendenze installate del worker (`--omit=dev --omit=optional`)
  e del backend (`--omit=dev`): zero vulnerabilità note al controllo del 24/11/2026.
  Il backend usa Firebase Functions 7.4.0 e override UUID 11.1.1; test ripetuti
  dopo l'aggiornamento. Gli override restano specifici di questi nuovi componenti.
- Verifica finale: Forex/controller/IB Gateway/account monitor attivi; Wazuh
  manager/indexer/dashboard e WazuhSvc attivi; uptime delle due VM preservato.

Hosting è stato rilasciato clonando la versione corrente, modificando solo
`picking.html`, `picking.js`, `picking-notifications.js`, `picking-notifications.css`
e `picking-whatsapp.js` (compatibilità con le pagine già aperte). Gli altri **252 file** e la configurazione
hosting sono stati preservati e confrontati prima del rilascio. Hash dei cinque
file pubblici verificati dopo il rilascio. Le versioni degli asset cambiano per
aggiornare correttamente anche la cache PWA.

Versione hosting precedente alla prima integrazione: `9bd53dc99a1f48a2`.
Prima integrazione: `cedab8518d2d13f1`.
Lista unica e contatti indipendenti: `7bbecfe4f4a36a76`.
Ultima versione con dicitura ricevute aggiornata: `35be964dabb09fb6`.
I dettagli del rilascio sono in `reports/hosting-release.json` sul Mac mini.

Per un rollback dell'interfaccia ripubblicare la versione precedente, poi
sospendere solo l'attività WhatsApp. Le email e i servizi Forex/Wazuh non
dipendono dal nuovo worker. Il registro del collaudo reale è conservato nelle collezioni riservate del
servizio, senza telefoni o contenuti dei messaggi in Git.

## Formato operativo WhatsApp e letture

Gli avvisi WhatsApp usano tre modelli distinti: `FBA da preparare`,
`Ordini FBM da preparare` e `Linea liquidi · Da produrre`. Ogni messaggio
contiene una sola categoria. FBA conserva prodotto, SKU, quantità e ripartizione
per spedizione; FBM raggruppa i prodotti sotto ciascun ordine; la linea liquidi
mantiene l'ordine numerato della coda, quantità e unità esatte. `NUOVO` compare
accanto al prodotto aggiunto; le modifiche sono indicate come `QUANTITÀ AGGIORNATA`.
Non si ripetono azienda, sede, data, totali, prodotto in apertura o istruzioni.
Non sono inclusi link o inviti ad aprire l'app. Le categorie vuote restano silenziose.
Un riepilogo con FBA e FBM genera due avvisi distinti con ID deterministici;
l'email esistente resta singola. I registri del nuovo produttore sono marcati
per impedire che il vecchio importatore generi un riepilogo WhatsApp aggiuntivo.
I blocchi restano interi entro 6000 caratteri; gli elementi non riportati sono
conteggiati. La riga Write interessata e il suo numero reale sono sempre inclusi,
anche in una coda lunga. Nessun cambiamento a frequenze di polling o letture.

L'API amministrativa offre `previewWriteNotice` e `sendWriteNotice` per un
avviso unico del prodotto pendente inserito più di recente. Verifica la versione
del prodotto, i destinatari già abilitati e la disponibilità del worker; non
modifica la coda né seleziona nuovi destinatari. Il requestId stabile impedisce
reinoltri anche dopo una risposta persa. Invio esclusivamente WhatsApp, massimo
una nuova richiesta al minuto, nessun pulsante di prova aggiunto all'interfaccia.

Collaudo del 24/11/2026: 98 test notifiche e 16 test backend WhatsApp passati.
Inclusi separazione categorie, invii concorrenti, blocco del vecchio importatore,
selezione vuota e sorgente modificata, assenza di mutazioni alla coda di produzione.

Le ricevute arrivano normalmente tramite evento WhatsApp. Un controllo di
recupero locale legge solo gli ID effettivamente inviati, ancora senza lettura,
con massimo due messaggi per ciclo. Intervalli: un minuto nei primi 5 minuti,
5 minuti entro un’ora, 30 minuti entro 24 ore, 6 ore entro 7 giorni, poi una
volta al giorno fino a 30 giorni. Dopo la lettura i controlli cessano.
Il controllo interroga WhatsApp dal NUC; non aggiunge polling Firestore.
L’API riceve una conferma solo se lo stato locale non è già stato confermato.
Le informazioni `getInfo()` sono verificate sull’ID del messaggio e sulle date;
nessuna lettura viene dedotta dalla sola consegna o da un testo del destinatario.

Collaudo reale concluso alle 20:24 del 24/11/2026: dopo la risposta del
titolare nella chat, il secondo messaggio ha ricevuto ACK 3, riportato una sola
volta al cloud. Picking mostra «Ultimo invio 24/11, 20:23 · Letto 24/11, 20:23».
Il primo contatto resta con sola consegna, senza attribuire una lettura non
comunicata da WhatsApp. La guida ufficiale indica che al primo messaggio la
ricevuta può non essere inviata: https://faq.whatsapp.com/665923838265756/
Forex e Wazuh verificati attivi, con uptime delle VM preservato.

## Collaudo operativo dei modelli separati — 24/11/2026

Pubblicati pickingWhatsAppApi e i quattro produttori pickingEmailApi,
pickingEmailFba, pickingEmailWrite, pickingEmailFbmMorning. Nessun rilascio hosting,
workflow GitHub o riavvio del NUC. Il ritocco dei nomi commerciali mantiene
formato, SKU e quantità: sette test del formatter passati dopo l'ultimo ritocco.
Le descrizioni dei prodotti archiviate non vengono modificate.

Richiesta unica `oneoff_write_20261124_models_v1`: due destinatari WhatsApp già
abilitati, due invii confermati `SENT` tra le 20:50 e le 20:51 Europe/Rome.
La marcatura `NUOVO` riguarda l'ultimo prodotto ancora in coda; nessuna modifica
ai documenti di produzione, nessuna email e nessuna nuova selezione destinatari.
Il riepilogo del server è stato letto soltanto per verificare questo collaudo;
non sono stati introdotti controlli periodici aggiuntivi.
