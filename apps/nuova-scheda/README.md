# Nuova scheda

Pagina personale con ricerca Google e 41 scorciatoie iniziali approvate.
Aspetto basato sullo screenshot fornito il 29 settembre 2026.

- HTML, CSS e JavaScript statici; nessuna dipendenza di build.
- Aggiunta e modifica tramite dialogo, rimozione con conferma nativa.
- Scorciatoie salvate in localStorage, chiave `lg-new-tab.shortcuts.v1`.
- Salvataggio locale per browser e profilo; sincronizzazione fra le schede della stessa origine.
- Il menu Personalizza permette di ripristinare le 41 scorciatoie iniziali.
- Il progetto non raccoglie password e non modifica le impostazioni di Chrome.
- Le icone iniziali sono locali; per i nuovi collegamenti si richiede la favicon del dominio a Google, senza percorso né parametri dell'URL.
- La ricerca usa Google; microfono tramite Web Speech API del browser, immagini tramite Google Lens.

## Pubblicazione

Sito Firebase Hosting dedicato `lg-nuova-scheda`, nel progetto esistente `tabellone-produzione-liv-e313e`.

```sh
firebase deploy --only hosting --project tabellone-produzione-liv-e313e --config firebase.nuova-scheda.json --non-interactive
```

Questo comando pubblica esclusivamente il sito dedicato. La configurazione Hosting del tabellone rimane separata.

Le personalizzazioni restano disponibili dopo i deploy perché la chiave locale e l'origine pubblica rimangono stabili. L'eliminazione dei dati del sito nel browser elimina anche queste preferenze.

## Interfaccia e micro-estensione Chrome

Misure desktop verificate a 1920 × 916: logo 272 × 92 alla quota 122, barra di ricerca 746 × 48 alla quota 251, tessere 112 × 112, icone circolari 48 × 48 alla quota 333. Font `system-ui`, corrispondente al WebUI di Chrome su Mac. La griglia conserva le misure sulle righe aggiuntive.

L'estensione Manifest V3 **LG Nuova Scheda 1.1.0** include HTML, CSS, JavaScript e icone locali. `chrome_url_overrides.newtab` apre direttamente `newtab.html`, senza redirect o richieste di rete. I nuovi collegamenti personalizzati usano un'iniziale locale. Nessun permesso aggiuntivo, host permission, content script o service worker. La ricerca Google e l'apertura dei siti richiedono Internet.

Per ricostruire i file dell'estensione dalle sorgenti web condivise:

```sh
python3 apps/nuova-scheda/build-extension.py
```

Aggiornare il contenuto della stessa cartella già caricata e premere Ricarica in `chrome://extensions`. Per una prima installazione abilitare Modalità sviluppatore, scegliere Carica estensione non pacchettizzata e selezionare la cartella. Le istruzioni sono in `extension/LEGGIMI.txt`.

Le preferenze locali dell'estensione hanno un'origine distinta da quella del sito Firebase. Le personalizzazioni precedenti si trasferiscono dalla pagina online con Personalizza → Esporta scorciatoie, quindi nell'estensione con Personalizza → Importa scorciatoie. L'importazione valida il contenuto e chiede conferma prima di sostituire le preferenze; è disponibile Annulla. Il sito online mantiene i propri dati.

Verifica del 29 settembre 2026 in Chrome for Testing su Mac: apertura nuova scheda con rete disattivata e zero richieste HTTP; icone iniziali disponibili; ricerca navigata all'URL previsto; esportazione web e importazione locale; aggiunta, modifica, rimozione offline, sincronizzazione fra schede, conservazione dopo il riavvio del browser e rifiuto di un'importazione non valida. Nessun errore JavaScript o CSP.
