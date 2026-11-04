# Picking — interfaccia del 4 novembre 2026

Release ricavata dal pacchetto fornito dall'utente `Picking(7).zip`, basato sul commit
`80733b85435d568fb760716107271111ee8b53d4`.

SHA-256 del pacchetto:
`7aacf336e34e0973699ec7e41fc9ba2747f1f52cc6ad9b1257e0dac7ecdf9c6c`.

Il comando `npm run build` del pacchetto prepara i file mantenendo i nomi e aggiungendo
versioni derivate dal contenuto agli URL di CSS e moduli JavaScript. I file `picking*`
generati sono integrati in `public/`. Le risorse condivise dell'Hub, il controller 3D
e il backend restano quelli del repository. Il foglio Home precedente è conservato
per le pagine già aperte; la nuova pagina usa `picking-app.css`.

La pagina include Home, navigazione mobile, mappa 2D, ricerca delle posizioni,
schermata Ubica e conferme dell'app. Le funzioni di stock, lotti e transazioni restano
nei moduli forniti. L'integrazione non modifica il codice applicativo dello ZIP oltre
alle versioni degli asset prodotte dalla sua build.

Verifiche prima della pubblicazione:

- Controllo del pacchetto: 11 JavaScript, 4 CSS, 114 identificativi HTML e 16 riferimenti locali.
- 7 test del pacchetto e 57 test del repository per stock, lotti, Cerea, alias, ubicazioni e picking.
- Test UI sul risultato della build in Chrome a 390, 768 e 1440 px: quantità parziali,
  ubicazione concorrente, spostamento, annullamento senza scritture, prelievo FBA,
  ripristino dallo storico, Trova e uscita. Rete intercettata, nessuna scrittura in produzione.
- Controllo della struttura approvata del capannone e delle altre sezioni del sito.

I test esistenti leggono ora `public/picking.js`; le verifiche dei dialoghi e della
navigazione seguono la nuova interfaccia. Le pipeline eseguono i 57 test prima del deploy.
Gli header di Picking evitano che il browser conservi una vecchia pagina o vecchi asset.
