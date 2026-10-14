# Monitor capannone: web app iPhone

Richiesta: installazione dalla Home di iPhone, con icona LG Trading e interfaccia adattata a iOS.

Baseline Git: `e34d2240ed273a6b2385c6a0388036c7d10702cb`; baseline Hosting: `b584ab182a3d81c5`.

Manifest con identità stabile, avvio sul cockpit e modalità standalone. Icone LG da 180, 192 e 512 px, renderizzate dal logo già presente, in arancione su fondo blu. Apple touch icon e metadati iOS. Nessun file esistente rinominato.

CSS aggiuntivo per safe area, finestre di dettaglio, pulsanti touch da 44 px, classifica leggibile e orientamento orizzontale. Il comando schermo intero viene nascosto quando non è disponibile o l’app è già standalone. Banner di connessione assente.

Service worker limitato a `/minimal-originale/`: documento sempre dalla rete, cache solo degli asset statici elencati e versionati. In assenza di connessione si apre una pagina essenziale con logo LG e pulsante Riprova. Nessuna cache di API, dati aziendali, autenticazione o documenti del cockpit. Il worker conserva cache e registrazioni delle altre applicazioni. Controllo aggiornamenti dopo una ripresa al massimo ogni sei ore; nessun polling Firebase aggiuntivo.

Il bundle principale è byte-identico alla baseline: stessi login Google, account autorizzato, sessione persistente, API, scadenze e conteggi. Nessuna modifica al backend o agli avvisi email.

Verifica: 21 asset con SHA-256, 8 casi di sicurezza, 26 combinazioni di layout WebKit (iPhone 320–430 px, orizzontale, tablet e controllo desktop; temi chiaro/scuro), 30 controlli Chromium di regressione. Service worker verificato con navigazione aggiornata, accessi API non memorizzati, conservazione dell’altra web app, perdita di connessione e ritorno online. I test usano solo fixture e server locale.

Limite del banco di prova: la modalità offline del protocollo Playwright WebKit 2359 impedisce le navigazioni servite dal worker (https://github.com/microsoft/playwright/issues/42775). Per WebKit il test interrompe realmente la connessione del server locale; Chromium usa la modalità offline del browser. L’installazione dalla Home e il login Google su un iPhone fisico richiedono il dispositivo dell’utente.

Installazione: aprire il cockpit in Safari, Condividi, Aggiungi alla schermata Home, lasciare attivo Apri come app web. Al primo avvio dall’icona accedere con Google.
