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
