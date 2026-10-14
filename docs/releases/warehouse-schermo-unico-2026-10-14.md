# Capannone: interfaccia a schermo unico, 14 ottobre 2026

Richiesta: pubblicare lo ZIP aggiornato dall’utente sul monitor Firebase esistente.

Sorgente approvata: `capannone_3d_interfaccia_2026-10-14_schermo-unico.zip`.
SHA-256: `124af1cc61a1d9831e2bac5cb6f898d3611950116646d243a926a19cbf9c2787`.
Baseline Git e live: `b6cb2ab7051a09c58215805b13b0a3281ee1ce0e`, Hosting `a10e4335a65a5f75`.

Il layout passa a quattro colonne con iLovePaghe sotto Sistemi e sicurezza. I volumi di oggi passano in Economia. I dispositivi usano barre compatte e il dettaglio conserva tutti i parametri. La classifica iLovePaghe ruota ogni 12 secondi senza chiamate di rete; i dati continuano ad aggiornarsi ogni 15 minuti.

Nel confronto delle dichiarazioni JavaScript, 261 funzioni preesistenti risultano identiche. Le sole funzioni esistenti cambiate dallo ZIP sono `cl`, `ll`, `xl` e `Sl` (presentazione), oltre alla media query `vo`, all’import iLovePaghe e a cinque helper di presentazione aggiunti. Login, letture API, scadenze, modulo Wazuh e blocco di polling iLovePaghe restano identici. I dati e i trigger email non sono modificati.

Due correzioni emerse dalla verifica a 1100×760 con più allarmi: spazio minimo per i KPI iLovePaghe, con scorrimento dei soli sistemi quando necessario; apertura della tabella completa dal KPI Aziende attive quando la classifica è nascosta. Sono contenute nel modulo e nel CSS iLovePaghe. I nomi dei file restano invariati.

Verifica: 14 file con dimensione e SHA-256, 8 casi delle regole di sicurezza, 30 verifiche di layout (4 stati, 6 dimensioni complessive, tema chiaro e scuro). Tutte le richieste nei test sono intercettate; nessuna chiamata a dati reali. Verificati 369 dipendenti delle aziende classificate, esclusione delle voci non associate, tabella completa, dati scaduti, errori di caricamento, cambio giornata e assenza di nuove richieste durante rotazione o ritorno alla scheda.

L’integrità della presentazione è ora vincolata allo ZIP del 14 ottobre, non al precedente layout del 12 ottobre. I test di sicurezza e il vincolo del polling autenticato sono mantenuti.
