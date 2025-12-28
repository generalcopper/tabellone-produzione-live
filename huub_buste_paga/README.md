# Hub Buste Paga

Mini-app standalone per upload, estrazione e consultazione delle buste paga. Utilizza Firebase Auth/Firestore/Storage e l'endpoint Gemini già configurato nel progetto originale.

## Struttura
- `index.html`: shell UI mobile-first, senza modali.
- `styles.css`: stile minimale “card” e layout responsive.
- `js/app.js`: bootstrap dell'app, gestione auth e stato viste.
- `js/state.js`: stato condiviso, costanti e reset payroll.
- `js/services/firebase.js`: init Firebase con `browserLocalPersistence`, auth Google, Firestore/Storage.
- `js/services/gemini.js`: upload PDF verso endpoint Gemini e parsing risposta.
- `js/features/upload.js`: logica upload/match/invio payroll, directory dipendenti, anteprima pagine, chart utente.
- `js/features/viewer.js`: azioni viewer utente (apri/stampa/condividi) e saluto header.
- `js/ui/charts.js`: donut canvas leggero per riepilogo matched/non matched.

## Flow di test
1. Apri la pagina (GitHub Pages o locale): vedi skeleton poi login Google.
2. Primo accesso: clicca **Accedi con Google**; se autorizzato entri direttamente nella dashboard.
3. Reload: se la sessione persiste con `browserLocalPersistence` passi subito alla dashboard; in caso contrario appare messaggio “Sessione scaduta, accedi di nuovo”.
4. Logout con il link in header, poi login di nuovo.
5. Admin: nella sezione “Upload Buste Paga” carica un PDF, verifica preview, match e invia. Directory dipendenti inline con elimina/aggiungi.
6. Utente: in “Le tue buste paga” seleziona mese, apri il PDF, stampa o condividi. Se non ci sono documenti, i campi restano vuoti.
7. Bottone Indietro: se c'è history usa `history.back()`, altrimenti `document.referrer` o `DEFAULT_BACK_URL` in `state.js`.

## Note
- L'endpoint Gemini, il `firebaseConfig` e le collection (`payrollDocs`, `payrollDirectory`, `payrollIngestLogs`) sono identici al sorgente.
- Nessuna build: tutto è ES Modules e gira su GitHub Pages.
- Errori runtime compaiono nel banner in pagina e in console.
