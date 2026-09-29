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

Misure desktop verificate a 1920 × 916: logo 272 × 92 alla quota 122, barra di ricerca 746 × 48 alla quota 251, tessere 112 × 112, icone circolari 48 × 48 alla quota 333. Font `system-ui`, corrispondente a quello del WebUI di Chrome su Mac. La griglia conserva queste misure anche sulle righe aggiuntive.

La cartella `extension` contiene **LG Nuova Scheda**, estensione Manifest V3 che dichiara solo `chrome_url_overrides.newtab`. Non richiede permessi, host permissions, content script o service worker. La pagina locale esegue immediatamente `location.replace('https://lg-nuova-scheda.web.app/')`; il browser mantiene pertanto le personalizzazioni nello stesso localStorage della pagina ospitata.

Installazione: aprire `chrome://extensions`, abilitare Modalità sviluppatore, scegliere Carica estensione non pacchettizzata e selezionare la cartella `extension` (oppure `LGNuovaScheda` nella distribuzione ZIP). Non spostare la cartella dopo il caricamento. Le istruzioni complete sono in `extension/LEGGIMI.txt`.

Verifica del 29 settembre 2026: apertura reale di due pagine `chrome://newtab/` con l'estensione caricata in un profilo Chrome for Testing separato, redirect riuscito e conservazione dello storage della medesima origine. Verificati anche aggiunta, modifica, rimozione e persistenza delle scorciatoie, nessun errore JavaScript e nessuna eccedenza orizzontale a 390 pixel.
