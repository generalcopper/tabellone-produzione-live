# Picking WhatsApp sul NUC

Installazione del 24 novembre 2026. Il motore locale è acceso in stato `UNPAIRED`.
Gli avvisi automatici sono disattivati fino a collegamento del telefono e prova.
Nessun messaggio WhatsApp reale è stato inviato durante il collaudo.

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
  Le funzioni email esistenti non sono state ridistribuite.
- Nessuna porta di ascolto sul NUC, nessun cambiamento a firewall, VM Forex,
  VM Wazuh o agent Wazuh. Nessun workflow GitHub eseguito.

## Flusso e controlli

Il worker legge tramite l'API autenticata i nuovi registri `pickingEmailDeliveries`:
FBA, Write, riepilogo quotidiano e riepilogo manuale. La coda email resta il flusso
originario. WhatsApp è un canale aggiuntivo per i dipendenti che hanno email
attive, account abilitato, numero valido e opzione WhatsApp salvata.

La schermata Notifiche di Picking permette numero con prefisso internazionale,
attivazione per dipendente, salvataggio esplicito, prova e pausa generale.
Lo stesso numero non può essere attivo su due dipendenti. Il server ricontrolla
account, selezione, revisione del numero e validità dell'avviso prima dell'invio.

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
   destinatario di prova concordato e premere **Invia prova**.
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

Per mettere in pausa solo gli invii usare il pulsante in Picking. Per sospendere
anche il browser creare il file `data\pause`; rimuoverlo per consentire la ripresa.
Per manutenzione completa disabilitare **questa sola attività** Windows e poi
fermarla; il controllo ogni cinque minuti altrimenti può riavviarla.
Non usare comandi che arrestino tutti i processi Node/Chrome o le VM.

I pacchetti sono bloccati da `package-lock.json`. Per installare dipendenze usare
`npm ci --ignore-scripts --omit=optional`; Chrome è quello già installato, con profilo separato.
Il runtime NUC richiede Node 24 per SQLite. Non aggiornare Node o Chrome globali
come parte della manutenzione del worker senza verificare gli altri servizi.

## Verifiche e rilascio

- 13 test backend passati con Firestore Emulator su `127.0.0.1:8794`, progetto
  fittizio `demo-picking-whatsapp-tests`; nessun dato operativo nei test.
- 5 test del worker passati anche sul NUC: deduplicazione, invio ambiguo,
  annullamento, numero non registrato e persistenza dopo riavvio.
- Test UI headless: mobile 390 px, salvataggio, blocco prima del pairing,
  invio email indipendente, pulizia al logout, modulo WhatsApp non raggiungibile.
- Chrome avviato con successo come LocalService senza disabilitare la sandbox.
- QR di collegamento generato sul NUC con il fix ufficiale per il nuovo login.
  Associazione del telefono e invio reale ancora da completare.
- API pubblica senza credenziali: HTTP 401. Worker autenticato: risposta corretta.
- Audit delle dipendenze installate del worker (`--omit=dev --omit=optional`)
  e del backend (`--omit=dev`): zero vulnerabilità note al controllo del 24/11/2026.
  Il backend usa Firebase Functions 7.4.0 e override UUID 11.1.1; test ripetuti
  dopo l'aggiornamento. Gli override restano specifici di questi nuovi componenti.
- Verifica finale: Forex/controller/IB Gateway/account monitor attivi; Wazuh
  manager/indexer/dashboard e WazuhSvc attivi; uptime delle due VM preservato.

Hosting è stato rilasciato clonando la versione corrente, modificando solo
`picking.html`, `picking.js`, `picking-notifications.js`, `picking-notifications.css`
e aggiungendo `picking-whatsapp.js`. Gli altri **252 file** e la configurazione
hosting sono stati preservati e confrontati prima del rilascio. Hash dei cinque
file pubblici verificati dopo il rilascio. Le versioni degli asset cambiano per
aggiornare correttamente anche la cache PWA.

Versione hosting precedente: `9bd53dc99a1f48a2`.
Versione con WhatsApp: `cedab8518d2d13f1`.
I dettagli del rilascio sono in `reports/hosting-release.json` sul Mac mini.

Per un rollback dell'interfaccia ripubblicare la versione precedente, poi
sospendere solo l'attività WhatsApp. Le email e i servizi Forex/Wazuh non
dipendono dal nuovo worker. Il pairing e l'invio reale restano da collaudare con
il telefono del titolare: i test software non sostituiscono questa prova.
