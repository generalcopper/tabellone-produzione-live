    const firebaseConfig = {
      apiKey: "AIzaSyD_2Eb6ni7E08hUbEkozP85LzyfesutO6M",
      authDomain: "ilovepaghe-ludo-2026.firebaseapp.com",
      projectId: "ilovepaghe-ludo-2026",
      storageBucket: "ilovepaghe-ludo-2026.firebasestorage.app",
      messagingSenderId: "162609991629",
      appId: "1:162609991629:web:5e4b367a928fe8e4823e84"
    };
    const APPCHECK_SITE_KEY = "6LcwcVUsAAAAAK4A6obrpGbGFHYGw3Wparj1626K"; // reCAPTCHA v3 site key (public)

    const PAYROLL_EXTRACT_ENDPOINT = "https://gemini-pdf-extract-162609991629.europe-west1.run.app/extract";

    // Privacy / compliance: NON archiviare i PDF (niente Firebase Storage).
    // Il PDF resta in RAM nel browser e viene inviato come allegato tramite un endpoint server (Cloud Run / Function).
    const PAYROLL_PERSIST_UPLOADS = false; // false = NON salva PDF su Storage/DB
    const PAYROLL_MAIL_ENDPOINT = "https://pagheia-mailer-162609991629.europe-west1.run.app/send"; // Cloud Run mailer
    globalThis.PAYROLL_MAIL_ENDPOINT = PAYROLL_MAIL_ENDPOINT;
    globalThis.PAYROLL_EXTRACT_ENDPOINT = PAYROLL_EXTRACT_ENDPOINT;

// Billing (Stripe) — Premium 19,90 €/mese
    // Nota: l'URL qui sotto è il backend Cloud Run che crea la Checkout Session Stripe.
    // Se cambi URL, puoi anche settare globalThis.PAGHEIA_BILLING_ENDPOINT prima di caricare questo script.
    const PAYROLL_PREMIUM_PRICE_LABEL = "19,90 €/mese";
    const PAGHEIA_BILLING_ENDPOINT = "https://pagheia-billing-162609991629.europe-west1.run.app"; // Cloud Run billing
    globalThis.PAYROLL_PREMIUM_PRICE_LABEL = PAYROLL_PREMIUM_PRICE_LABEL;
    globalThis.PAGHEIA_BILLING_ENDPOINT = globalThis.PAGHEIA_BILLING_ENDPOINT || PAGHEIA_BILLING_ENDPOINT;

    const state = {
      user: null,
      authHydrated: false,
      authGateState: "unknown",
      authGateMessage: "",
      firebase: { ok:false, app:null, auth:null, db:null, api:null, storage:null, storageApi:null },
      payroll: {},
      absences: { list:[], filters:{ status:"", type:"", search:"" }, loading:false }
    };


    // --- Fix loop login (Safari/iOS bfcache) ---
    // Quando rientri dalla pagina di autenticazione usando "Indietro", iOS può ripristinare la pagina da cache (bfcache)
    // mantenendo in memoria lo stato "signed-out". Questo portava a un loop: "Accedi" -> auth -> indietro -> ancora "Accedi".
    const SS_PAGHEIA_AUTH_INFLIGHT = "pagheia_auth_inflight_ts_v1";
    const SS_PAGHEIA_AUTH_INTENT = "pagheia_auth_inflight_intent_v1";
    const SS_PAGHEIA_AUTH_REASON = "pagheia_auth_inflight_reason_v1";

    function markAuthInflight(reason = "", intent = ""){
      try{
        sessionStorage.setItem(SS_PAGHEIA_AUTH_INFLIGHT, String(Date.now()));
        if(reason) sessionStorage.setItem(SS_PAGHEIA_AUTH_REASON, String(reason));
        if(intent) sessionStorage.setItem(SS_PAGHEIA_AUTH_INTENT, String(intent));
      }catch(_e){}
    }
    function clearAuthInflight(){
      try{
        sessionStorage.removeItem(SS_PAGHEIA_AUTH_INFLIGHT);
        sessionStorage.removeItem(SS_PAGHEIA_AUTH_INTENT);
        sessionStorage.removeItem(SS_PAGHEIA_AUTH_REASON);
      }catch(_e){}
    }
    function authInflight(maxAgeMs = 5 * 60 * 1000){
      try{
        const ts = parseInt(sessionStorage.getItem(SS_PAGHEIA_AUTH_INFLIGHT) || "0", 10);
        if(!Number.isFinite(ts) || ts <= 0) return false;
        return (Date.now() - ts) < maxAgeMs;
      }catch(_e){ return false; }
    }

    (function bindAuthBfcacheFix(){
      // Reload SOLO se:
      // - stiamo tornando da un tentativo di login (flag in sessionStorage)
      // - la navigazione è "back/forward" o la pagina arriva da bfcache
      const isBackForward = (ev)=>{
        try{ if(ev && ev.persisted) return true; }catch(_e){}
        try{
          const nav = performance.getEntriesByType?.("navigation")?.[0];
          if(nav && nav.type === "back_forward") return true;
        }catch(_e){}
        return false;
      };
      window.addEventListener("pageshow", (ev)=>{
        try{
          if(authInflight() && isBackForward(ev)){
            location.reload();
          }
        }catch(_e){}
      });
    })();

    const scrollLockState = { locked:false, y:0, prev:{} };
    const updateAppHeight = ()=>{ try{ const h = Math.max(window.innerHeight || 0, document.documentElement?.clientHeight || 0); if(h) document.documentElement.style.setProperty("--app-height", `${h}px`); }catch(_e){} };
    const updateKeyboardOffset = ()=>{
      try{
        const vv = window.visualViewport;
        if(!vv){
          document.documentElement.style.setProperty("--keyboard-offset", "0px");
          return;
        }
        const offset = Math.max(0, Math.round((window.innerHeight || 0) - vv.height - vv.offsetTop));
        document.documentElement.style.setProperty("--keyboard-offset", `${offset}px`);
      }catch(_e){}
    };
    window.addEventListener("resize", updateAppHeight, { passive:true });
    window.addEventListener("orientationchange", ()=>setTimeout(updateAppHeight, 160), { passive:true });
    updateAppHeight();
    setTimeout(updateAppHeight, 320);
    updateKeyboardOffset();
    setTimeout(updateKeyboardOffset, 320);
    window.addEventListener("resize", updateKeyboardOffset, { passive:true });
    window.addEventListener("orientationchange", ()=>setTimeout(updateKeyboardOffset, 160), { passive:true });
    if(window.visualViewport){
      window.visualViewport.addEventListener("resize", updateKeyboardOffset, { passive:true });
      window.visualViewport.addEventListener("scroll", updateKeyboardOffset, { passive:true });
    }

    const syncFixedBars = ()=>{
      try{
        const header = document.querySelector("header.headerRow");
        const footer = document.getElementById("appFooter");
        const h = header ? Math.round(header.getBoundingClientRect().height) : 0;
        const f = footer ? Math.round(footer.getBoundingClientRect().height) : 0;
        if(h) document.documentElement.style.setProperty("--fixed-header-h", `${h}px`);
        if(f) document.documentElement.style.setProperty("--fixed-footer-h", `${f}px`);
      }catch(_e){}
    };
    window.addEventListener("resize", ()=>requestAnimationFrame(syncFixedBars), { passive:true });
    window.addEventListener("orientationchange", ()=>setTimeout(syncFixedBars, 160), { passive:true });
    syncFixedBars();
    setTimeout(syncFixedBars, 320);

    // Mantieni sempre aggiornate le altezze (evita gap tra contenuti e footer/header su iOS)
    let fixedBarsRO = null;
    const watchFixedBars = ()=>{
      try{
        if(fixedBarsRO) return;
        if(!("ResizeObserver" in window)) return;
        const header = document.querySelector("header.headerRow");
        const footer = document.getElementById("appFooter");
        fixedBarsRO = new ResizeObserver(()=>syncFixedBars());
        if(header) fixedBarsRO.observe(header);
        if(footer) fixedBarsRO.observe(footer);
      }catch(_e){}
    };
    watchFixedBars();
    window.addEventListener("load", ()=>{ try{ syncFixedBars(); watchFixedBars(); }catch(_e){} }, { passive:true });

const toast = document.getElementById("toast");
    const toastTitle = document.getElementById("toastTitle");
    const toastBody = document.getElementById("toastBody");
    let toastTimer = null;
    function showToast(title, body="", ms=2600){
      if(toastTimer) clearTimeout(toastTimer);
      toastTitle.textContent = title || "Info";
      toastBody.textContent = body || "";
      toast.classList.add("show");
      toastTimer = setTimeout(()=> toast.classList.remove("show"), ms);
    }

    function lockBodyScroll(){
      try{
        if(scrollLockState.locked) return;
        scrollLockState.locked = true;
        scrollLockState.y = window.scrollY || document.documentElement.scrollTop || 0;
        const bodyStyle = document.body.style;
        scrollLockState.prev = {
          position: bodyStyle.position || "",
          top: bodyStyle.top || "",
          width: bodyStyle.width || "",
          overflow: bodyStyle.overflow || ""
        };
        bodyStyle.position = "fixed";
        bodyStyle.top = `-${scrollLockState.y}px`;
        bodyStyle.width = "100%";
        bodyStyle.overflow = "hidden";
        document.body.classList.add("scroll-locked");
      }catch(_e){}
    }

    function unlockBodyScroll(){
      try{
        if(!scrollLockState.locked) return;
        scrollLockState.locked = false;
        const bodyStyle = document.body.style;
        bodyStyle.position = scrollLockState.prev?.position || "";
        bodyStyle.top = scrollLockState.prev?.top || "";
        bodyStyle.width = scrollLockState.prev?.width || "";
        bodyStyle.overflow = scrollLockState.prev?.overflow || "";
        document.body.classList.remove("scroll-locked");
        const y = scrollLockState.y || 0;
        window.scrollTo(0, y);
      }catch(_e){}
    }

    function syncBodyScrollLock(){
      const adminOpen = document.getElementById("adminModal")?.classList.contains("show");
      const logOpen = document.getElementById("sendLogModal")?.classList.contains("show");
      const pdfOpen = document.getElementById("pdfPreviewOverlay")?.getAttribute("aria-hidden") === "false";
      const authOpen = document.getElementById("authOverlay")?.getAttribute("aria-hidden") === "false";
      const shouldLock = !!(adminOpen || logOpen || pdfOpen || authOpen);
      if(shouldLock) lockBodyScroll(); else unlockBodyScroll();
    }

    function getDisplayNameFromUser(user = state.user){
      if(user?.displayName) return user.displayName;
      const emailUser = (user?.email || "").split("@")[0] || "";
      return emailUser || "utente";
    }

    function updateGreetingUI(){
      const name = getDisplayNameFromUser();
      const heroGreeting = document.getElementById("heroGreeting");
      const heroLead = document.getElementById("heroGreetingLead");
      const heroSubtitle = document.getElementById("heroSubtitle");
      const payrollGreeting = document.getElementById("payrollGreeting");
      if(heroGreeting) heroGreeting.textContent = "Portale buste paga";
      if(heroLead) heroLead.textContent = "Consulta e scarica le tue buste paga. Se sei amministratore puoi caricare i PDF, assegnarli ai dipendenti e controllare lo storico invii.";
      if(true){
        // Nome utente: mostrato nel riquadro profilo
        const userNameEl = document.getElementById("userName");
        if(userNameEl) userNameEl.textContent = name;
        // Header subtitle non usato nella UI: se esiste lo lasciamo vuoto
        if(heroSubtitle) heroSubtitle.textContent = "";
      }
if(payrollGreeting) payrollGreeting.textContent = `Ciao, ${name}.`;
    }

    function updateAuthUI(){
      const pill = document.getElementById("pillAuth");
      const dot = document.getElementById("dotAuth");
      const status = document.getElementById("authStatus");
      const hint = document.getElementById("authHint");
      const absenceBadge = document.getElementById("absenceStatusBadge");
      const hasUser = !!state.user;
      const isAnon = !!state.user?.isAnonymous;
      const isAuthed = hasUser && !isAnon;
      const isPremium = !!state.user?.isPremium;
      const premiumSyncPending = !!state.user?.premiumSyncPending;
      const payrollFreeUsed = !!state.user?.payrollFreeUsed;
      const payrollUsageLoaded = !!state.user?.payrollUsageLoaded;
      const payrollUsageLoading = !!state.user?.payrollUsageLoading;
      const payrollUsageError = !!state.user?.payrollUsageError;

      // Premium sync: dopo un pagamento Stripe mostriamo "verifica in corso" e NON blocchiamo come "trial usata"
      const uploadLocked = isAuthed && !isPremium && !premiumSyncPending && payrollFreeUsed;
      const uploadPending = isAuthed && !isPremium && (premiumSyncPending || (!payrollFreeUsed && !payrollUsageLoaded && !payrollUsageError));
      const uploadError = isAuthed && !isPremium && !premiumSyncPending && !payrollFreeUsed && payrollUsageError;
      const uploadBlocked = uploadLocked || uploadPending || uploadError;
      if(isAuthed){
        pill?.classList.add("ok");
        dot?.classList.add("ok");
        if(status) status.textContent = `Accesso: ${state.user.displayName || state.user.email || "utente"}`;
        if(hint){
          if(uploadPending) hint.textContent = premiumSyncPending ? "Attivazione Premium in corso…" : "Verifica piano in corso…";
          else if(uploadError) hint.textContent = "Verifica piano non riuscita: ricarica la pagina e riprova.";
          else if(uploadLocked) hint.textContent = "Prova gratuita già utilizzata: per continuare attiva Premium (" + (globalThis.PAYROLL_PREMIUM_PRICE_LABEL || "19,90 €/mese") + ").";
          else if(isPremium) hint.textContent = "Premium attivo: caricamenti illimitati.";
          else if(state.user.isAdmin) hint.textContent = "Accesso admin attivo: upload abilitato.";
          else if(state.user.isWhitelisted===false) hint.textContent = "Account non abilitato alle buste paga. Contatta l'admin.";
          else hint.textContent = "Accesso attivo.";
        }
      }else{
        pill?.classList.remove("ok");
        dot?.classList.remove("ok");
        if(status) status.textContent = "Accesso non attivo";
        if(hint) hint.textContent = isAnon ? "Accesso anonimo disattivato. Accedi con Google." : "Sessione non attiva.";
      }
      if(absenceBadge){
        absenceBadge.textContent = isAuthed ? "Pronto a inviare" : "Accesso richiesto";
      }
      // Hero badges (top)
      const badgeRoleText = document.getElementById("badgeRoleText");
      const badgeAuthText = document.getElementById("badgeAuthText");
      if(badgeRoleText){
        const roleLabel = isAuthed ? (state.user?.isAdmin ? "Amministratore" : "Dipendente") : "—";
        badgeRoleText.textContent = `Ruolo: ${roleLabel}`;
      }
      if(badgeAuthText){
        badgeAuthText.textContent = `Accesso: ${isAuthed ? "attivo" : "non attivo"}`;
      }

      document.body.classList.toggle("role-admin", isAuthed && !!state.user?.isAdmin);
      document.body.classList.toggle("role-operator", isAuthed && !state.user?.isAdmin);

      // Header buttons
      const btnLogin = document.getElementById("btnGoogleLogin");
      const btnLogoutBottom = document.getElementById("btnLogoutBottom");

      // Mostra "Accedi" sempre quando NON autenticato (niente schermate di caricamento)
      const showLogin = (!isAuthed);
      if(btnLogin){
        btnLogin.style.display = showLogin ? "" : "none";
        const ready = !!state.firebase?.ok;
        // abilita quando Firebase è pronto
        btnLogin.disabled = !ready;
        // feedback visivo mentre Firebase carica
        try{ const sp = btnLogin.querySelector("span"); if(sp) sp.textContent = ready ? "Accedi" : "Caricamento…"; }catch(_e){}
      }

      // "Esci" sempre in fondo (solo quando autenticato)
      if(btnLogoutBottom) btnLogoutBottom.style.display = isAuthed ? "" : "none";

      // CTA principale (home):
      // - se non autenticato: "Accedi e carica PDF"
      // - se autenticato:
      //    - se Premium: "Carica PDF"
      //    - se prova gratuita già usata: "Diventa Premium"
      try{
        const cta = document.getElementById("btnOpenPayrollAdmin");
        if(cta){
          // Se stiamo ancora verificando il piano, blocca la CTA (evita bypass da incognito)
          if(!isAuthed){
            cta.textContent = "Accedi e carica PDF";
            cta.classList.remove("locked");
            cta.disabled = false;
          }else if(uploadPending){
            cta.textContent = payrollUsageLoading ? "Verifico…" : "Verifica…";
            cta.classList.add("locked");
            cta.disabled = true;
          }else if(uploadError){
            cta.textContent = "Ricarica e riprova";
            cta.classList.add("locked");
            cta.disabled = false;
          }else if(uploadLocked){
            cta.textContent = "Diventa Premium";
            cta.classList.add("locked");
            cta.disabled = false;
          }else{
            cta.textContent = "Carica PDF";
            cta.classList.remove("locked");
            cta.disabled = false;
          }
          cta.setAttribute("aria-label", cta.textContent);
        }

        const hintEl = document.querySelector(".homeHeroHint");
        if(hintEl){
          if(!isAuthed) hintEl.textContent = "Accedi per caricare un PDF.";
          else if(uploadPending) hintEl.textContent = premiumSyncPending ? "Attivazione Premium in corso…" : "Verifica piano in corso…";
          else if(uploadError) hintEl.textContent = "Verifica piano non riuscita: ricarica la pagina.";
          else if(uploadLocked) hintEl.textContent = "Hai già usato il caricamento gratuito: attiva Premium (" + (globalThis.PAYROLL_PREMIUM_PRICE_LABEL || "19,90 €/mese") + ").";
          else hintEl.textContent = "o trascina e lascia il file PDF qui";
        }

        // Hint nella modale upload (step idle): mostra il blocco Premium
        const idleHint = document.getElementById("payrollIdleHint");
        if(idleHint){
          if(uploadPending) idleHint.textContent = premiumSyncPending ? "Attivazione Premium in corso…" : "Verifica piano in corso…";
          else if(uploadError) idleHint.textContent = "Verifica piano non riuscita: ricarica la pagina.";
          else if(uploadLocked) idleHint.textContent = "Premium richiesto: prova gratuita già utilizzata (" + (globalThis.PAYROLL_PREMIUM_PRICE_LABEL || "19,90 €/mese") + ").";
          else idleHint.textContent = "Stato: inattivo.";
        }

        const drop = document.getElementById("payrollDrop");
        if(drop){
          drop.classList.toggle("locked", uploadBlocked);
        }

        // Menu: badge lock sul pulsante Carica
        const navUp = document.getElementById("btnNavUpload");
        if(navUp){
          if(isAuthed && uploadPending) navUp.textContent = "Carica ⏳";
          else navUp.textContent = (isAuthed && uploadBlocked) ? "Carica 🔒" : "Carica";
        }
      }catch(_e){}

      // Overlays disabilitati (nessun pending/auth full-screen)
      try{ togglePendingOverlay(false); }catch(_e){}
      try{ toggleAuthOverlay(false); }catch(_e){}


updateGreetingUI();
    }

    // Richiesta accesso (login/registrazione):
    // - se è configurato un AUTH URL esterno, redirect lì (con return URL)
    // - altrimenti usa Firebase Google Sign-In (preferendo il redirect)
    function goToAuth(reason="", intent=""){
      const msg = String(reason || "Accedi per continuare.");

      // 1) Redirect a pagina auth esterna (opzionale)
      try{
        const authUrl = String(globalThis.PAGHEIA_AUTH_URL || globalThis.AUTH_URL || "").trim();
        if(authUrl){
          try{ markAuthInflight(msg, intent); }catch(_e){}
          const next = encodeURIComponent(location.href);
          const sep = authUrl.includes("?") ? "&" : "?";
          location.href = authUrl + sep + "next=" + next;
          return true;
        }
      }catch(_e){}

      // 2) Firebase Auth (Google) — usa la stessa logica del bottone "Accedi" (popup-first, redirect solo se serve)
      try{
        const act = state.authActions || {};
        if(typeof act.signIn === "function"){
          act.signIn();
          return true;
        }
        if(typeof act.signInRedirect === "function"){
          try{ markAuthInflight(msg, intent); }catch(_e){}
          act.signInRedirect();
          return true;
        }
      }catch(_e){}

      // 3) Fallback: focus/click sul bottone "Accedi"
      try{
        const btn = document.getElementById("btnGoogleLogin");
        if(btn){
          try{ btn.focus?.(); }catch(_e){}
          try{ if(!btn.disabled) btn.click(); }catch(_e){}
        }
      }catch(_e){}

      try{ showToast("Accesso richiesto", msg, 1800); }catch(_e){}
      return false;
    }


    // Pagamento/Upgrade Premium (opzionale):
    // - se è configurato un BILLING URL esterno, redirect lì (con return URL)
    // - altrimenti mostra solo un messaggio
    function getBillingBase(){
      try{
        return String(
          globalThis.PAGHEIA_BILLING_ENDPOINT ||
          globalThis.PAGHEIA_BILLING_URL ||
          globalThis.PAGHEIA_PREMIUM_URL ||
          globalThis.BILLING_URL ||
          ""
        ).trim();
      }catch(_e){ return ""; }
    }

    async function startPremiumCheckout(nextUrl){
      const base = getBillingBase();
      if(!base) throw new Error("Backend billing non configurato.");

      const endpoint = base.replace(/\/$/,"") + "/create-checkout-session";

      if(!(state && state.firebase && state.firebase.auth)) throw new Error("Servizio non pronto. Ricarica la pagina.");
      const u = state.firebase.auth.currentUser;
      if(!u || u.isAnonymous) throw new Error("Accedi con Google per attivare Premium.");

      let tok = "";
      try{ tok = await u.getIdToken(); }catch(_e){}
      if(!tok) throw new Error("Token non disponibile. Accedi di nuovo e riprova.");

      const headers = { "Content-Type":"application/json", "Authorization":"Bearer " + tok };

      // App Check token (anti-abuso)
      try{
        const ac = state.firebase?.appCheck;
        const acApi = state.firebase?.appCheckApi;
        if(ac && acApi && typeof acApi.getToken === "function"){
          const resp = await acApi.getToken(ac, /* forceRefresh= */ false);
          if(resp && resp.token) headers["X-Firebase-AppCheck"] = resp.token;
        }
      }catch(err){
        console.warn("appcheck token (billing)", err);
      }

      const successUrl = (()=>{
        try{
          const u = new URL(location.href);
          u.searchParams.set("premium","success");
          u.searchParams.delete("premium_cancel");
          u.searchParams.delete("premium_error");
          return u.toString();
        }catch(_e){ return location.href; }
      })();

      const cancelUrl = (nextUrl || location.href);

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ successUrl, cancelUrl })
      });

      let text = "";
      try{ text = await res.text(); }catch(_e){}
      let data = null;
      try{ data = text ? JSON.parse(text) : null; }catch(_e){ data = null; }

      if(!res.ok){
        const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : (text || ("HTTP " + res.status));
        throw new Error(errMsg);
      }

      const url = data?.url || data?.checkoutUrl || "";
      if(!url) throw new Error("Checkout URL non ricevuto dal backend.");

      location.href = url;
    }

    function goToPremium(reason=""){
      const price = String(globalThis.PAYROLL_PREMIUM_PRICE_LABEL || "19,90 €/mese");
      const msg = String(reason || ("Per continuare, attiva l’abbonamento Premium (" + price + ")."));

      (async ()=>{
        try{
          // Se non sei loggato, prima login
          if(!state?.firebase?.auth?.currentUser || state.firebase.auth.currentUser.isAnonymous){
            try{ goToAuth("Accedi per attivare Premium."); }catch(_e){}
            return;
          }
          try{ showToast("Premium", "Apro il pagamento Stripe…", 1800); }catch(_e){}
          await startPremiumCheckout(location.href);
        }catch(err){
          console.warn("goToPremium", err);
          try{ showToast("Premium richiesto", (err?.message || msg), 5200); }catch(_e){}
        }
      })();

      return true;
    }


        function updateModalOpenState(){
      try{
        const adminOpen = document.getElementById("adminModal")?.classList.contains("show");
        const logOpen = document.getElementById("sendLogModal")?.classList.contains("show");
        const pdfOpen = document.getElementById("pdfPreviewOverlay")?.getAttribute("aria-hidden") === "false";
        const authOpen = document.getElementById("authOverlay")?.getAttribute("aria-hidden") === "false";
        const pendingOpen = document.getElementById("pendingOverlay")?.getAttribute("aria-hidden") === "false";
        const anyOpen = !!(adminOpen || logOpen || pdfOpen || authOpen || pendingOpen);
        document.body.classList.toggle("admin-modal-open", anyOpen);
        syncBodyScrollLock();
      }catch(_e){}
    }


    function togglePendingOverlay(show){
      const ov = document.getElementById("pendingOverlay");
      if(!ov) return;
      ov.setAttribute("aria-hidden", show ? "false" : "true");
      updateModalOpenState();
    }

    function toggleAuthOverlay(show){
      const ov = document.getElementById("authOverlay");
      if(!ov) return;
      ov.setAttribute("aria-hidden", show ? "false" : "true");
      updateModalOpenState();
    }

    
function toggleAdminModal(show, focusId){
      const modal = document.getElementById("adminModal");
      if(!modal) return;

      window.__lastFocusAdmin__ = window.__lastFocusAdmin__ || null;

      if(show){
        try{ window.__lastFocusAdmin__ = document.activeElement || null; }catch(_e){}
        modal.classList.add("show");
        modal.setAttribute("aria-hidden","false");
        try{ modal.removeAttribute("inert"); }catch(_e){}
        updateModalOpenState();
        if(focusId){
          const target = document.getElementById(focusId);
          target && target.scrollIntoView({ behavior:"smooth", block:"start" });
        }
        setTimeout(()=>{ try{ U("btnCloseAdmin")?.focus?.(); }catch(_e){} }, 10);
      }else{
        try{
          if(document.activeElement && modal.contains(document.activeElement)) document.activeElement.blur();
        }catch(_e){}
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden","true");
        try{ modal.setAttribute("inert",""); }catch(_e){}
        updateModalOpenState();
        setTimeout(()=>{ try{ window.__lastFocusAdmin__?.focus?.(); }catch(_e){} }, 10);
      }
    }

    
function toggleSendLogModal(show){
      const modal = document.getElementById("sendLogModal");
      if(!modal) return;

      // Fix focus: evita aria-hidden su un elemento che contiene il focus
      window.__lastFocusSendLog__ = window.__lastFocusSendLog__ || null;

      if(show){
        try{ window.__lastFocusSendLog__ = document.activeElement || null; }catch(_e){}
        modal.classList.add("show");
        modal.setAttribute("aria-hidden","false");
        try{ const st = ensureEmployeesState(); st.ui.view = "list"; }catch(_e){}
        try{ modal.classList.remove("empDetailMode"); }catch(_e){}
        try{ modal.removeAttribute("inert"); }catch(_e){}
        updateModalOpenState();
        setTimeout(()=>{ try{ U("btnCloseSendLogModal")?.focus?.(); }catch(_e){} }, 10);
      }else{
        try{
          if(document.activeElement && modal.contains(document.activeElement)) document.activeElement.blur();
        }catch(_e){}
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden","true");
        try{ modal.classList.remove("empDetailMode"); }catch(_e){}
        try{ modal.setAttribute("inert",""); }catch(_e){}
        updateModalOpenState();
        setTimeout(()=>{ try{ window.__lastFocusSendLog__?.focus?.(); }catch(_e){} }, 10);
      }
    }

    // Payroll module
    /* =========================
       PAYROLL (Buste paga) — Gemini extract + split PDF + Storage
       ========================= */
    const Payroll = (()=>{
      const N = state;
      const U = (id)=>document.getElementById(id);

      const showBootSpinner = (on)=>{
        try{
          const el = document.getElementById("bootSpinner");
          if(!el) return;
          el.style.display = on ? "flex" : "none";
        }catch(_e){}
      };

      const Ao = (s)=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
      const Ve = (title, body)=>{ try{ showToast(String(title||"Info"), String(body||"")); }catch(_e){ alert(String(title||"Info")+"\\n\\n"+String(body||"")); } };

      const COL_PAYROLL_DIRECTORY="payrollDirectory",COL_PAYROLL_DOCS="payrollDocs",COL_PAYROLL_DOCS_LEGACY="payrolls",COL_PAYROLL_SEND_LOGS="payrollSendLogs",COL_EMAIL="email",COL_ABSENCE_REQUESTS="absenceRequests";
      const PAYROLL_DOC_COLS=[COL_PAYROLL_DOCS,COL_PAYROLL_DOCS_LEGACY];
      // Premium gate (trial: 1 invio gratuito)
      const COL_PAYROLL_USAGE = "payrollUsage";
      const LS_PAYROLL_FREE_USED = "ilovepaghe_payroll_free_used_v1";
      const LS_PAYROLL_PREMIUM_OVERRIDE = "ilovepaghe_premium_override_v1";
      const PAYROLL_FREE_SEND_LIMIT = 1;

      function readLocalPayrollEntitlements(){
        try{
          if(!N.user) return;
          // Trial used (solo questo device, fallback)
          try{
            const v = localStorage.getItem(LS_PAYROLL_FREE_USED);
            if(v === "1") N.user.payrollFreeUsed = true;
          }catch(_e){}
          // Premium override (solo ON) — utile per test/demo
          try{
            const v2 = localStorage.getItem(LS_PAYROLL_PREMIUM_OVERRIDE);
            if(v2 === "1") N.user.isPremium = true;
          }catch(_e){}
        }catch(_e){}
      }

      // Prova a leggere entitlements da Custom Claims (se presenti).
      // Utile quando la sincronizzazione Stripe aggiorna claims prima di Firestore (o come fallback a problemi di lettura).
      async function syncPayrollEntitlementsFromIdToken(force=false){
        try{
          if(!(N.firebase?.ok && N.user && !N.user.isAnonymous)) return false;
          const authUser = N.firebase?.auth?.currentUser;
          if(!authUser || authUser.isAnonymous) return false;

          const res = await authUser.getIdTokenResult(!!force);
          const c = (res && res.claims) ? res.claims : {};

          const plan = String(c.plan || c.tier || c.subscription || c.role || c.stripeRole || "").toLowerCase().trim();
          const prem = (c.isPremium === true) || (c.premium === true) || (plan === "premium" || plan === "pro" || plan === "plus");

          const usedN = (typeof c.freeSendsUsed === "number") ? c.freeSendsUsed
                      : (typeof c.freeUsedCount === "number") ? c.freeUsedCount
                      : (c.trialUsed ? 1 : 0);
          const freeUsed = (Number.isFinite(usedN) && usedN >= PAYROLL_FREE_SEND_LIMIT);

          let changed = false;
          if(prem && !N.user.isPremium){ N.user.isPremium = true; changed = true; }
          if(freeUsed && !N.user.payrollFreeUsed){
            N.user.payrollFreeUsed = true;
            changed = true;
            try{ localStorage.setItem(LS_PAYROLL_FREE_USED, "1"); }catch(_e){}
          }

          if(changed){
            N.user.payrollUsageLoaded = true;
            N.user.payrollUsageLoading = false;
            N.user.payrollUsageError = "";
            if(prem) N.user.premiumSyncPending = false;
            try{ updateAuthUI(); }catch(_e){}
          }

          return prem || freeUsed;
        }catch(_e){
          return false;
        }
      }

      // Fallback opzionale: prova a chiedere lo status al backend billing (se espone un endpoint pubblico).
      async function tryLoadPayrollEntitlementsFromBillingBackend(){
        try{
          if(!(N.firebase?.ok && N.user && !N.user.isAnonymous)) return false;
          const base = (typeof getBillingBase === "function") ? getBillingBase() : "";
          if(!base) return false;

          const authUser = N.firebase?.auth?.currentUser;
          if(!authUser || authUser.isAnonymous) return false;

          let tok = "";
          try{ tok = await authUser.getIdToken(); }catch(_e){}
          if(!tok) return false;

          const headers = { "Authorization": "Bearer " + tok };

          // App Check token (anti-abuso) — opzionale
          try{
            const ac = N.firebase?.appCheck;
            const acApi = N.firebase?.appCheckApi;
            if(ac && acApi && typeof acApi.getToken === "function"){
              const resp = await acApi.getToken(ac, /* forceRefresh= */ false);
              if(resp && resp.token) headers["X-Firebase-AppCheck"] = resp.token;
            }
          }catch(_e){}

          const baseUrl = String(base).replace(/\/$/,"");
          const endpoints = ["/entitlements", "/status", "/me", "/whoami", "/subscription"];

          for(const path of endpoints){
            try{
              const res = await fetch(baseUrl + path, { method:"GET", headers });
              if(!res || !res.ok) continue;
              const data = await res.json().catch(()=>null);
              if(!data) continue;

              const plan = String(data.plan || data.tier || data.subscription || data.role || "").toLowerCase().trim();
              const prem = (data.isPremium === true) || (plan === "premium" || plan === "pro" || plan === "plus");
              const usedN = (typeof data.freeSendsUsed === "number") ? data.freeSendsUsed
                          : (typeof data.freeUsedCount === "number") ? data.freeUsedCount
                          : (data.trialUsed ? 1 : 0);
              const freeUsed = (Number.isFinite(usedN) && usedN >= PAYROLL_FREE_SEND_LIMIT);

              if(prem) N.user.isPremium = true;
              if(freeUsed){
                N.user.payrollFreeUsed = true;
                try{ localStorage.setItem(LS_PAYROLL_FREE_USED, "1"); }catch(_e){}
              }

              N.user.payrollUsageLoaded = true;
              N.user.payrollUsageLoading = false;
              N.user.payrollUsageError = "";
              if(prem) N.user.premiumSyncPending = false;
              try{ updateAuthUI(); }catch(_e){}
              return true;
            }catch(_e){}
          }
        }catch(_e){}
        return false;
      }


      async function loadPayrollEntitlementsFromServer(force=false){
        if(!(N.firebase?.ok && N.user && !N.user.isAnonymous)) return;

        // Evita richieste duplicate (utile su incognito / refresh)
        try{
          if(N.user.payrollUsageLoading && !force) return;
          N.user.payrollUsageLoading = true;
          N.user.payrollUsageError = "";
        }catch(_e){}

        const api = N.firebase.api, db = N.firebase.db;

        const uid = String(N.user.uid || "").trim();
        const emailLower = String(N.user.emailLower || (N.user.email||"").toLowerCase() || "").trim();

        const ids = [];
        if(uid) ids.push(uid);
        if(emailLower && !ids.includes(emailLower)) ids.push(emailLower);

        // Fast-path: prova a ricavare Premium da Custom Claims (se presenti).
        // Usiamo force=true quando rientri da Stripe (premium=success) per forzare refresh token.
        try{
          await syncPayrollEntitlementsFromIdToken(!!force);
          if(N.user?.isPremium){
            try{
              N.user.payrollUsageLoaded = true;
              N.user.payrollUsageLoading = false;
              N.user.payrollUsageError = "";
              N.user.premiumSyncPending = false;
            }catch(_e){}
            try{ updateAuthUI(); }catch(_e){}
            return;
          }
        }catch(_e){}

        if(!ids.length){
          try{
            if(N.user){
              N.user.payrollUsageLoaded = true;
              N.user.payrollUsageLoading = false;
              N.user.payrollUsageError = "";
            }
          }catch(_e){}
          try{ updateAuthUI(); }catch(_e){}
          return;
        }

        let anySuccess = false;
        let snap = null;
        let usedId = "";
        let lastErr = null;

        try{
          for(const id of ids){
            try{
              const s = await api.getDoc(api.doc(db, COL_PAYROLL_USAGE, id));
              anySuccess = true;
              if(s && s.exists()){
                snap = s;
                usedId = id;
                break;
              }
            }catch(err){
              lastErr = err;
            }
          }

          // Se non siamo riusciti a leggere nulla (tutti errori), prima proviamo fallback e poi gestiamo retry/errore
          if(!anySuccess){
            // 1) Fallback: se il backend billing espone uno status, proviamo lì (evita blocchi dovuti a regole Firestore)
            try{
              const ok = await tryLoadPayrollEntitlementsFromBillingBackend();
              if(ok){
                // lo stato utente è già stato aggiornato dalla funzione
                return;
              }
            }catch(_e){}

            const code = String(lastErr?.code || "").toLowerCase();
            const msg = String(lastErr?.message || "").toLowerCase();
            const transient = (
              code === "unavailable" ||
              code === "deadline-exceeded" ||
              code === "resource-exhausted" ||
              code === "internal" ||
              msg.includes("network") ||
              msg.includes("timeout")
            );

            // 2) Errori transienti: non mostrare subito "errore", riprova in background
            if(transient){
              try{ if(N.user) N.user.__entRetryCount = (Number(N.user.__entRetryCount||0) + 1); }catch(_e){}
              const n = Number(N.user?.__entRetryCount || 1);

              try{
                if(N.user){
                  N.user.payrollUsageLoaded = false;
                  N.user.payrollUsageLoading = false;
                  N.user.payrollUsageError = "";
                }
              }catch(_e){}
              try{ updateAuthUI(); }catch(_e){}

              if(n <= 5){
                const delay = Math.min(8000, 900 * n);
                setTimeout(()=>{ try{ loadPayrollEntitlementsFromServer(true); }catch(_e){} }, delay);
              }else{
                // dopo diversi tentativi, segnala errore
                try{
                  if(N.user){
                    N.user.payrollUsageError = (lastErr?.code || lastErr?.message || "entitlements_load_failed");
                    N.user.payrollUsageLoaded = true;
                    N.user.payrollUsageLoading = false;
                  }
                }catch(_e){}
                if(code !== "permission-denied") console.warn("payroll entitlements load", lastErr);
                try{ updateAuthUI(); }catch(_e){}
              }
              return;
            }

            // 3) Errori non transienti: segnala blocco
            try{
              if(N.user){
                N.user.payrollUsageError = (lastErr?.code || lastErr?.message || "entitlements_load_failed");
                N.user.payrollUsageLoaded = true;
                N.user.payrollUsageLoading = false;
              }
            }catch(_e){}
            if(code !== "permission-denied"){
              console.warn("payroll entitlements load", lastErr);
            }
            try{ updateAuthUI(); }catch(_e){}
            return;
          }

          // Doc assente → significa "mai usato" (trial disponibile)
          if(!snap || !snap.exists()){
            // Se siamo rientrati da Stripe e stiamo sincronizzando Premium, riprova per qualche secondo
            try{
              const pending = !!N.user?.premiumSyncPending;
              const t0 = Number(N.user?.premiumSyncStartedAt || 0);
              const age = t0 ? (Date.now() - t0) : 0;
              if(pending && t0 && age < 120000){
                if(N.user){
                  N.user.payrollUsageLoaded = false;
                  N.user.payrollUsageLoading = false;
                  N.user.payrollUsageError = "";
                }
                try{ updateAuthUI(); }catch(_e){}
                setTimeout(()=>{ try{ loadPayrollEntitlementsFromServer(true); }catch(_e){} }, 2200);
                return;
              }
            }catch(_e){}

            try{
              if(N.user){
                N.user.payrollUsageLoaded = true;
                N.user.payrollUsageLoading = false;
                N.user.payrollUsageError = "";
              }
            }catch(_e){}
            try{ updateAuthUI(); }catch(_e){}
            return;
          }

          const d = snap.data() || {};
          const plan = String(d.plan || d.tier || d.subscription || "").toLowerCase();
          const isPrem = (d.isPremium === true) || (plan === "premium" || plan === "pro" || plan === "plus");
          let freeUsed = false;
          const usedN = (typeof d.freeSendsUsed === "number") ? d.freeSendsUsed
                      : (typeof d.freeUsedCount === "number") ? d.freeUsedCount
                      : (d.trialUsed ? 1 : 0);
          if(Number.isFinite(usedN) && usedN >= PAYROLL_FREE_SEND_LIMIT) freeUsed = true;

          try{
            if(N.user){
              if(isPrem){
                N.user.isPremium = true;
                N.user.premiumSyncPending = false;
              }
              if(freeUsed) N.user.payrollFreeUsed = true;
              N.user.payrollUsageLoaded = true;
              N.user.payrollUsageLoading = false;
              N.user.payrollUsageError = "";
            }
          }catch(_e){}

          // Se rientri da Stripe e stiamo ancora aspettando il webhook, continua a riprovare per un breve periodo
          try{
            const pending = !!N.user?.premiumSyncPending;
            const t0 = Number(N.user?.premiumSyncStartedAt || 0);
            const age = t0 ? (Date.now() - t0) : 0;

            if(pending && t0 && !isPrem && age < 120000){
              if(N.user){
                N.user.payrollUsageLoaded = false;
                N.user.payrollUsageLoading = false;
                N.user.payrollUsageError = "";
              }
              try{ updateAuthUI(); }catch(_e){}
              setTimeout(()=>{ try{ loadPayrollEntitlementsFromServer(true); }catch(_e){} }, 2200);
              return;
            }

            if(pending && t0 && !isPrem && age >= 120000){
              // timeout: smettiamo di mostrare "in corso"
              if(N.user) N.user.premiumSyncPending = false;
            }
          }catch(_e){}

          // Cache locale (solo flag "trial used") — utile su questo device
          if(freeUsed){
            try{ localStorage.setItem(LS_PAYROLL_FREE_USED, "1"); }catch(_e){}
          }

          // Migrazione soft: se troviamo il doc su emailLower, copialo anche su uid (best-effort)
          try{
            if(usedId && uid && usedId !== uid){
              const payload = {
                ...d,
                uid: uid,
                emailLower: emailLower || d.emailLower || "",
                updatedAt: api.serverTimestamp(),
                updatedAtClient: Date.now()
              };
              try{ await api.setDoc(api.doc(db, COL_PAYROLL_USAGE, uid), payload, { merge:true }); }catch(_e){}
            }
          }catch(_e){}

          try{ updateAuthUI(); }catch(_e){}
        }catch(err){
          try{
            if(N.user){
              N.user.payrollUsageError = (err?.code || err?.message || "entitlements_load_failed");
              N.user.payrollUsageLoaded = true;
              N.user.payrollUsageLoading = false;
            }
          }catch(_e){}
          if(err?.code !== "permission-denied"){
            console.warn("payroll entitlements load", err);
          }
          try{ updateAuthUI(); }catch(_e){}
        }
      }

      function payrollUploadIsLocked(){
        const isAuthed = !!(N.user && !N.user.isAnonymous);
        if(!isAuthed) return false;
        if(N.user?.isPremium) return false;
        if(!N.user?.payrollFreeUsed) return false;
        return true;
      }

      function showPayrollPremiumGate(){
        const msg = "Hai già utilizzato la prova gratuita. Per continuare, attiva Premium (" + (globalThis.PAYROLL_PREMIUM_PRICE_LABEL || "19,90 €/mese") + ").";
        try{ Ve("Premium richiesto", msg); }catch(_e){}
      }

      function ensurePayrollCanUpload(opts = {}){
        const o = opts || {};
        const show = (o.toast !== false);
        const openBilling = !!o.openBilling;

        // Login
        if(!N.user || N.user.isAnonymous){
          if(show){
            try{ goToAuth("Accedi per caricare i PDF."); }catch(_e){}
          }
          return false;
        }

        // Verifica entitlements (evita bypass da incognito / nuovo device)
        try{
          const u = N.user;
          if(u && !u.isAnonymous && !u.isPremium){
            const loaded = (u.payrollUsageLoaded === true);
            const err = u.payrollUsageError;

            // Se non abbiamo ancora verificato dal server, blocca e fai partire la fetch
            if(!loaded){
              try{ loadPayrollEntitlementsFromServer(); }catch(_e){}
              if(show){
                try{ Ve("Verifica in corso", "Sto verificando il tuo piano. Riprova tra qualche secondo."); }catch(_e){}
              }
              return false;
            }

            // Se la verifica non è riuscita, blocca (altrimenti incognito bypassa)
            if(err){
              // Riprova una verifica forzata prima di proporre il checkout (evita loop dopo pagamento)
              try{ loadPayrollEntitlementsFromServer(true); }catch(_e){}
              if(show){
                try{ Ve("Verifica in corso", "Sto riprovando a verificare il tuo piano. Se non si sblocca, ricarica la pagina."); }catch(_e){}
              }
              return false;
            }
          }
        }catch(_e){}

        // Paywall
        if(payrollUploadIsLocked()){
          if(openBilling){
            try{ goToPremium("Per continuare, attiva l’abbonamento Premium."); }catch(_e){}
          }else if(show){
            showPayrollPremiumGate();
          }
          return false;
        }
        return true;
      }

      async function markPayrollTrialUsed(reason=""){
        try{
          if(!N.user || N.user.isAnonymous) return;
          if(N.user.isPremium) return;
          if(N.user.payrollFreeUsed) return;

          N.user.payrollFreeUsed = true;
          try{ localStorage.setItem(LS_PAYROLL_FREE_USED, "1"); }catch(_e){}
          try{ updateAuthUI(); }catch(_e){}

          // Prefer backend write (Admin SDK) to prevent incognito/new-device bypass.
          try{
            const base = getBillingBase();
            if(base && N.firebase?.auth){
              const endpoint = base.replace(/\/$/,"") + "/mark-trial-used";
              const u = N.firebase.auth.currentUser;
              if(u && !u.isAnonymous){
                let tok = "";
                try{ tok = await u.getIdToken(); }catch(_e){}
                if(tok){
                  const headers = { "Content-Type":"application/json", "Authorization":"Bearer " + tok };

                  // App Check token (anti-abuso) — opzionale
                  try{
                    const ac = N.firebase?.appCheck;
                    const acApi = N.firebase?.appCheckApi;
                    if(ac && acApi && typeof acApi.getToken === "function"){
                      const resp = await acApi.getToken(ac, /* forceRefresh= */ false);
                      if(resp && resp.token) headers["X-Firebase-AppCheck"] = resp.token;
                    }
                  }catch(_e){}

                  const r = await fetch(endpoint, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ reason: String(reason||"") })
                  });
                  if(r && r.ok) return;
                  throw new Error("mark_trial_backend_http_" + (r?.status || "0"));
                }
              }
            }
          }catch(err){
            console.warn("mark trial used (backend)", err);
          }

          // Fallback (best-effort): try to write on Firestore if rules allow it.
          if(!(N.firebase?.ok)) return;
          const api = N.firebase.api, db = N.firebase.db;
          const uid = N.user.uid || "";
          const emailLower = N.user.emailLower || (N.user.email||"").toLowerCase();
          const ids = [];
          if(uid) ids.push(uid);
          if(emailLower && !ids.includes(emailLower)) ids.push(emailLower);
          if(!ids.length) return;

          const payload = {
            uid: uid,
            emailLower: emailLower,
            trialUsed: true,
            freeSendsUsed: PAYROLL_FREE_SEND_LIMIT,
            lastReason: String(reason||""),
            trialUsedAt: api.serverTimestamp(),
            trialUsedAtClient: Date.now(),
            updatedAt: api.serverTimestamp(),
            updatedAtClient: Date.now()
          };

          for(const id of ids){
            try{ await api.setDoc(api.doc(db, COL_PAYROLL_USAGE, id), payload, { merge:true }); }
            catch(err){ if(err?.code !== "permission-denied") console.warn("payroll usage write", err); }
          }
        }catch(_e){}
      }


      async function tryGetPayrollDocSnap(api, db, id){
        for(const col of PAYROLL_DOC_COLS){
          try{ const s = await api.getDoc(api.doc(db, col, id)); if(s && s.exists()) return { snap: s, col }; }catch(_e){}
        }
        return { snap: null, col: null };
      }

      async function trySetPayrollDoc(api, db, id, data, opts){
        let wrote=false, lastErr=null;
        for(const col of PAYROLL_DOC_COLS){
          try{ await api.setDoc(api.doc(db, col, id), data, opts); wrote=true; return { col }; }catch(e){ lastErr=e; }
        }
        if(!wrote) throw lastErr || new Error("Impossibile salvare payroll doc");
        return { col: null };
      }

      function D() {
        const prev = N.payroll || {};
        const prevDir = prev.directory || {};
        const prevEmail = prev.emailLink || {};
        const prevUserView = prev.userView || {};
        N.payroll = {
            admin: {
              step: "idle",
              lastFlowStep: prev.admin && prev.admin.lastFlowStep ? prev.admin.lastFlowStep : "idle",
              filters: (()=>{ const f = prev.admin?.filters || {}; return { search: (f.search||""), showIssues: !!f.showIssues, showSent: !!f.showSent }; })(),
              files: [],
              originalPdfBytes: null,
              sourceFileName: "",
            sourceFileHash: "",
            gemini: { loading: !1, error: "", pages: [] },
            groupedRows: [],
              match: { pages: [], grouped: [], unmatched: [], matchedCount: 0, ambiguousCount: 0, unmatchedCount: 0 },
              previewRowKey: "",
              users: [],
              loadingUsers: !1,
              sending: !1,
              sendSummary: null,
              uploadHistory: [],
              historySelection: {},
              sentCounts: {},
              sendUI: null,
              sendLogs: prev.admin?.sendLogs || [],
              sendLogSelection: prev.admin?.sendLogSelection || {},
              openedByDocKey: prev.admin?.openedByDocKey || {}
            },
          userView: {
            docs: [],
            ready: !1,
            error: "",
            selectedMonth: "",
            months: [],
            loading: !1,
            emailLower: prevUserView.emailLower || ""
          ,
              unsub: prevUserView.unsub || null,
              live: !!prevUserView.live,
              _watchEmail: prevUserView._watchEmail || ""},
          directory: {
            entries: Array.isArray(prevDir.entries) ? prevDir.entries : [],
            ready: !!prevDir.ready,
            unsub: prevDir.unsub || null,
            suggestions: Array.isArray(prevDir.suggestions) ? prevDir.suggestions : [],
            error: prevDir.error || ""
          },
          emailLink: {
            sending: !!prevEmail.sending,
            error: prevEmail.error || "",
            sentTo: prevEmail.sentTo || ""
          }
        }
        N.absences = { list:[], filters:{ status:"", type:"", search:"" }, loading:false };
      }

      D();

      function scrollToSection(id){
        try{
          if(id === "adminArea"){
            toggleAdminModal(true);
            return;
          }
          const el = document.getElementById(id);
          if(el) el.scrollIntoView({ behavior:"smooth", block:"start" });
        }catch(_e){}
      }

      // Header "Carica": pagina standalone (niente hub esterni)
      try{ document.getElementById("btnNavUpload")?.addEventListener("click", ()=>scrollToSection("adminArea")); }catch(_e){}


      function ji() {
        const e = N.payroll.admin;
        e.files = [], e.originalPdfBytes = null, e.gemini = { loading: !1, error: "", pages: [] }, e.match = { pages: [], grouped: [], unmatched: [], matchedCount: 0, ambiguousCount: 0, unmatchedCount: 0 }, e.groupedRows = [], e.sendSummary = null, e.sourceFileName = "", e.sourceFileHash = "", Di("idle"), Bi(), Ii(), Pi();
        const bar = U("payrollProgressFill"), lab = U("payrollProgressLabel");
        if(bar) bar.style.width = "0%";
        if(lab) lab.textContent = "Pronto";
        const sp = U("payrollProgressSpinner");
        if(sp) sp.style.display = "none";
        const sp2 = U("payrollProgressSpinnerExtract");
        if(sp2) sp2.style.display = "none";
        const bar2 = U("payrollProgressFillExtract"), lab2 = U("payrollProgressLabelExtract");
        if(bar2) bar2.style.width = "0%";
        if(lab2) lab2.textContent = "Parsing PDF in corso";
      }

      function normalizeNameStrict(e) {
        return String(e || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toUpperCase().replace(/[^A-Z\\s]/g, " ").replace(/\\s+/g, " ").trim()
      }
      function jaccardTokens(e, t) {
        const n = new Set(e), o = new Set(t);
        if (!n.size && !o.size) return 1;
        const i = Array.from(n).filter(e => o.has(e)).length, a = n.size + o.size - i;
        return a ? i / a : 0
      }
      function normalizeFiscalCode(v){ return String(v||"").toUpperCase().replace(/[^A-Z0-9]/g,""); }
      function normalizeMonthKey(val){
        const t = String(val ?? "").trim();
        if (!t) return "";
        if (/^\d{4}-\d{2}$/.test(t)) return t;
        if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.slice(0, 7);

        const lowered = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
        const yearMatch = lowered.match(/(20[0-9]{2})/);

        const monthMap = {
          // Italiano (abbrev + esteso)
          gen:1, gennaio:1,
          feb:2, febbraio:2,
          mar:3, marzo:3,
          apr:4, aprile:4,
          mag:5, maggio:5,
          giu:6, giugno:6,
          lug:7, luglio:7,
          ago:8, agosto:8,
          set:9, sett:9, settembre:9,
          ott:10, ottobre:10,
          nov:11, novembre:11,
          dic:12, dicembre:12,
          // English (abbrev + full)
          jan:1, january:1,
          feb:2, february:2,
          mar:3, march:3,
          apr:4, april:4,
          may:5,
          jun:6, june:6,
          jul:7, july:7,
          aug:8, august:8,
          sep:9, sept:9, september:9,
          oct:10, october:10,
          nov:11, november:11,
          dec:12, december:12
        };

        const nameMatch = lowered.match(/\b(gennaio|febbraio|february|marzo|march|aprile|april|maggio|giugno|june|luglio|july|agosto|august|settembre|september|ottobre|october|novembre|november|dicembre|december|gen|feb|mar|apr|mag|giu|lug|ago|sett|sept|sep|set|ott|oct|nov|dic|jan|may|jun|jul|aug|dec|january)\b/);
        if(yearMatch && nameMatch){
          const key = nameMatch[1];
          const num = monthMap[key] || "";
          if(num) return `${yearMatch[1]}-${String(num).padStart(2,"0")}`;
        }

        // Numeric compact: YYYYMM (es. 202509)
        const yyyymm = lowered.match(/\b(20[0-9]{2})(0[1-9]|1[0-2])\b/);
        if(yyyymm) return `${yyyymm[1]}-${yyyymm[2]}`;

        // Numeric compact: MMYYYY (es. 092025)
        const mmYYYY = lowered.match(/\b(0?[1-9]|1[0-2])\s*(20[0-9]{2})\b/);
        if(mmYYYY) return `${mmYYYY[2]}-${String(mmYYYY[1]).padStart(2,"0")}`;

        // Pattern: YYYY<sep>MM
        const n = lowered.match(/(20[0-9]{2})\D(0?[1-9]|1[0-2])/);
        if(n) return `${n[1]}-${String(n[2]).padStart(2,"0")}`;

        // Pattern: MM<sep>YYYY (funziona anche su date tipo 30/09/2025 grazie al match su '09/2025')
        const reverse = lowered.match(/(0?[1-9]|1[0-2])\D(20[0-9]{2})/);
        return reverse ? `${reverse[2]}-${String(reverse[1]).padStart(2,"0")}` : "";
      }
      
      function normalizeEmail(v){
        return String(v||"").replace(/[\s\u200B-\u200D\uFEFF]+/g,"").trim().toLowerCase();
      }
      function isValidEmail(v){
        const s = normalizeEmail(v);
        if(!s) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
      }


      // === Cache locale email (fallback) + match nome "orderless" ===
      // Se lo switch "Salva email" è ON, ricordiamo le email inserite per i prossimi invii.
      // - Admin: proviamo anche a salvarle su Firestore (payrollDirectory)
      // - Non-admin / permessi negati: fallback in localStorage (vale su questo dispositivo)
      const LS_PAYROLL_EMAIL_CACHE = "payroll_email_cache_v1";

      function normalizeNameKeyOrderless(name){
        const norm = normalizeNameStrict(name);
        if(!norm) return "";
        const toks = norm.split(/\s+/).filter(Boolean);
        if(!toks.length) return "";
        toks.sort();
        const out = [];
        for(const t of toks){
          if(!out.length || out[out.length-1] !== t) out.push(t);
        }
        return out.join(" ");
      }

      function payrollReadEmailCache(){
        try{
          const raw = localStorage.getItem(LS_PAYROLL_EMAIL_CACHE);
          if(!raw) return {};
          const obj = JSON.parse(raw);
          return (obj && typeof obj === "object") ? obj : {};
        }catch(_e){ return {}; }
      }

      function payrollWriteEmailCache(cache){
        try{ localStorage.setItem(LS_PAYROLL_EMAIL_CACHE, JSON.stringify(cache || {})); }catch(_e){}
      }

      function payrollCacheEmailForNext(row, emailLower){
        try{
          const em = normalizeEmail(emailLower || row?.email || "");
          if(!isValidEmail(em)) return;

          const cache = payrollReadEmailCache();
          const cf = normalizeFiscalCode(row?.fiscalCode || "");
          const name = String(row?.displayName || "").trim();
          const nameExact = normalizeNameStrict(name);
          const nameKey = normalizeNameKeyOrderless(name);

          if(cf) cache["cf:" + cf] = em;
          if(nameKey) cache["name:" + nameKey] = em;
          if(nameExact) cache["nameExact:" + nameExact] = em;

          // best-effort: evita crescita infinita
          try{
            const keys = Object.keys(cache);
            if(keys.length > 4000){
              keys.slice(0, keys.length - 2500).forEach(k=>{ delete cache[k]; });
            }
          }catch(_e){}

          payrollWriteEmailCache(cache);
        }catch(_e){}
      }

      function payrollGetCachedEmail(cache, { fiscalCode, displayName } = {}){
        try{
          const cf = normalizeFiscalCode(fiscalCode || "");
          if(cf && cache && cache["cf:" + cf]) return cache["cf:" + cf];

          const name = String(displayName || "").trim();
          const nameKey = normalizeNameKeyOrderless(name);
          if(nameKey && cache && cache["name:" + nameKey]) return cache["name:" + nameKey];

          const nameExact = normalizeNameStrict(name);
          if(nameExact && cache && cache["nameExact:" + nameExact]) return cache["nameExact:" + nameExact];
        }catch(_e){}
        return "";
      }
      // Heuristics: controlla se l'email "sembra" coerente con il nome del dipendente.
      // Serve solo per mostrare un pop-up di conferma quando l'utente inserisce una mail "strana".
      function __normalizeLooseToken(s){
        return String(s || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "");
      }
      function __nameTokensForEmailCheck(displayName){
        const raw = String(displayName || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const parts = raw.split(/[^a-z0-9]+/).filter(Boolean);
        const stop = new Set(["di","de","del","della","dello","dei","degli","da","la","il","lo","le","gli","i"]);
        return parts.filter(t => t.length >= 2 && !stop.has(t));
      }
      function emailLooksLikeEmployeeName(email, displayName){
        const em = normalizeEmail(email);
        const name = String(displayName || "").trim();
        if(!em || !name) return true; // niente controllo se manca qualcosa

        const local = (em.split("@")[0] || "");
        const localNorm = __normalizeLooseToken(local);
        if(!localNorm) return true;

        const tokens = __nameTokensForEmailCheck(name);
        if(!tokens.length) return true;

        const significant = tokens.filter(t => t.length >= 3);
        const toCheck = significant.length ? significant : tokens;

        for(const t of toCheck){
          const tn = __normalizeLooseToken(t);
          if(tn && localNorm.includes(tn)) return true;
        }

        // fallback: iniziale + cognome (es. mrossi)
        const first = tokens[0] || "";
        const last = tokens[tokens.length - 1] || "";
        const fi = __normalizeLooseToken(first).slice(0,1);
        const ln = __normalizeLooseToken(last);
        if(fi && ln && (localNorm.includes(fi + ln) || localNorm.includes(ln + fi))) return true;

        return false;
      }
      function cssEscape(v){
        try{ return (window.CSS && CSS.escape) ? CSS.escape(String(v)) : String(v).replace(/[^a-zA-Z0-9_-]/g, "\\$&"); }catch(_e){ return String(v||""); }
      }
      function formatEuroFromCents(cents){
        const n = Number(cents);
        if(!isFinite(n)) return "";
        const v = n / 100;
        try{ return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(v); }
        catch(_e){ return (Math.round(v*100)/100).toFixed(2).replace(".", ",") + " €"; }
      }
      function bytesToBase64(bytes){
        try{
          const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
          let bin = "";
          const chunk = 0x8000;
          for(let i=0;i<u8.length;i+=chunk){
            bin += String.fromCharCode.apply(null, u8.subarray(i, i+chunk));
          }
          return btoa(bin);
        }catch(err){
          console.warn("bytesToBase64", err);
          return "";
        }
      }
      function base64ToBytes(b64){
        const bin = atob(String(b64||""));
        const len = bin.length;
        const u8 = new Uint8Array(len);
        for(let i=0;i<len;i++) u8[i] = bin.charCodeAt(i);
        return u8;
      }
function __payrollLoadScript(src){
        return new Promise((resolve,reject)=>{
          try{
            const existing = Array.from(document.getElementsByTagName("script")).find(s=>s && s.src===src);
            if(existing){ if(existing.dataset && existing.dataset.loaded==="1") return resolve(); }
            const s=document.createElement("script");
            s.src=src; s.async=true;
            s.onload=()=>{ try{ s.dataset.loaded="1"; }catch(e){} resolve(); };
            s.onerror=()=>reject(new Error("Impossibile caricare libreria PDF (pdf-lib)."));
            document.head.appendChild(s);
          }catch(e){ reject(e); }
        });
      }

      async function __payrollGetPDFLib(){
        if(globalThis.PDFLib && globalThis.PDFLib.PDFDocument) return globalThis.PDFLib;
        if(!globalThis.__PAYROLL_PDFLIB_PROMISE__){
          globalThis.__PAYROLL_PDFLIB_PROMISE__ = (async ()=>{
            await __payrollLoadScript("https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js");
            if(!globalThis.PDFLib || !globalThis.PDFLib.PDFDocument) throw new Error("pdf-lib non disponibile");
            return globalThis.PDFLib;
          })();
        }
        return await globalThis.__PAYROLL_PDFLIB_PROMISE__;
      }

      async function xi(e, t) {
        const lib = await __payrollGetPDFLib();
        const PDFDocument = lib.PDFDocument;
        const src = await PDFDocument.load(e);
        const out = await PDFDocument.create();
        (await out.copyPages(src, t)).forEach(p => out.addPage(p));
        return await out.save();
      }

      async function $i(e, t, n, r=null) {
        if (!(N.firebase && N.firebase.storage && N.firebase.storageApi)) throw new Error("Storage non disponibile");

        // Nota: molte regole di Storage non permettono upload da accesso ospite (anonimo).
        // Qui intercettiamo l'errore e mostriamo un messaggio chiaro.
        const o = N.firebase.storageApi, i = N.firebase.storage;
        const a = `payroll/${t}/${(r||e||"").replace(/[^a-zA-Z0-9._-]/g,"")}.pdf`;
        const storageRef = o.ref(i, a);

        try{
          const s = await o.uploadBytes(storageRef, n, { contentType: "application/pdf" });
          return { path: a, url: await o.getDownloadURL(s.ref) };
        }catch(err){
          const code = String(err?.code || "");
          const msg = String(err?.message || "");
          const isUnauthorized = code.includes("storage/unauthorized") || msg.toLowerCase().includes("does not have permission") || msg.toLowerCase().includes("permission");
          if(isUnauthorized){
            const isAnon = !!N.firebase?.auth?.currentUser?.isAnonymous;
            if(isAnon){
              try{ showToast("Permessi Storage", "Accesso ospite non autorizzato. Accedi con Google e riprova."); }catch(_e){}
              try{ toggleAuthOverlay(true); }catch(_e){}
            }else{
              try{ showToast("Permessi Storage", "Il tuo account non ha accesso a Firebase Storage per questo upload. Verifica whitelist/regole."); }catch(_e){}
            }
          }else{
            try{ showToast("Errore upload", msg || "Upload non riuscito"); }catch(_e){}
          }
          throw err;
        }
      }

            async function ki(e) {
        const api = N.firebase.api, db = N.firebase.db;
        const id = e.docId || `${e.emailLower}_${e.monthKey}`;

        // Non sovrascrivere campi sensibili con stringhe vuote (es. uid)
        const payload = { ...e };
        if(payload.uid === "" || payload.uid === null || typeof payload.uid === "undefined") delete payload.uid;
        if(payload.storagePath === "" || payload.storagePath === null || typeof payload.storagePath === "undefined") delete payload.storagePath;

        const data = { ...payload, updatedAt: api.serverTimestamp(), createdAt: payload.createdAt || api.serverTimestamp() };

        // Compatibilità: prova prima payrollDocs, poi payrolls
        await trySetPayrollDoc(api, db, id, data, { merge: true });
      }


      // === Payroll Index (fallback quando le query Firestore sono bloccate dalle regole) ===
      function getRecentMonthKeys(count=36){
        const out = [];
        const now = new Date();
        let y = now.getFullYear();
        let m = now.getMonth() + 1; // 1..12
        for(let i=0;i<count;i++){
          out.push(`${y}-${String(m).padStart(2,"0")}`);
          m--;
          if(m<=0){ m=12; y--; }
        }
        return out;
      }

      async function upsertPayrollIndex(info){
        try{
          if(!(N.firebase?.ok)) return;
          const api = N.firebase.api, db = N.firebase.db;
          const emailLower = String(info?.emailLower||"").toLowerCase();
          const monthKey = normalizeMonthKey(info?.monthKey||"") || String(info?.monthKey||"").trim();
          if(!emailLower || !monthKey) return;

          const ref = api.doc(db, "payrollIndex", emailLower);
          let prev = {};
          try{
            const snap = await api.getDoc(ref);
            if(snap?.exists()) prev = snap.data() || {};
          }catch(_e){}

          const months = Array.isArray(prev.months) ? prev.months.slice() : [];
          if(!months.includes(monthKey)) months.push(monthKey);
          months.sort((a,b)=> String(b).localeCompare(String(a)));

          const docsByMonth = (prev.docsByMonth && typeof prev.docsByMonth === "object") ? { ...prev.docsByMonth } : {};
          docsByMonth[monthKey] = {
            docId: info.docId || `${emailLower}_${monthKey}`,
            monthKey,
            netPayText: info.netPayText || "",
            netPayCents: (typeof info.netPayCents === "number" ? info.netPayCents : (info.netPayCents ?? null)),
            downloadUrl: info.downloadUrl || "",
            fileName: info.fileName || info.sourceFileName || "",
            pagesCount: info.pagesCount ?? null,
            lastSentAtClient: Date.now(),
            lastSentBy: info.adminEmail || N.user?.email || ""
          };

          await api.setDoc(ref, {
            emailLower,
            months,
            docsByMonth,
            updatedAt: api.serverTimestamp(),
            updatedAtClient: Date.now()
          }, { merge: true });
        }catch(err){
          console.warn("payroll index upsert", err);
        }
      }

      function appendLocalSendLog(evt){
        try{
          const key = "payroll_send_logs_local_v1";
          const arr = JSON.parse(localStorage.getItem(key) || "[]");
          arr.unshift(evt);
          localStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
        }catch(_e){}
      }
      function readLocalSendLogs(){
        try{
          const key = "payroll_send_logs_local_v1";
          return JSON.parse(localStorage.getItem(key) || "[]");
        }catch(_e){ return []; }
      }
      async function upsertSendLogIndex(evt){
        try{
          if(!(N.firebase?.ok)) return;
          const api = N.firebase.api, db = N.firebase.db;
          const ref = api.doc(db, "payrollSendLogIndex", "global");
          let logs = [];
          try{
            const snap = await api.getDoc(ref);
            if(snap?.exists()){
              const d = snap.data() || {};
              logs = Array.isArray(d.logs) ? d.logs.slice() : [];
            }
          }catch(_e){}
          logs.unshift(evt);
          logs = logs.slice(0, 200);
          await api.setDoc(ref, { logs, updatedAt: api.serverTimestamp(), updatedAtClient: Date.now() }, { merge: true });
        }catch(err){
          console.warn("send log index upsert", err);
        }
      }


      function Ei(e) {
        const t = String(e || ""), n = t.match(/\\b(20[0-9]{2})[-/.](0[1-9]|1[0-2])\\b/), o = n ? `${n[1]}-${n[2]}` : null, i = t.match(/(?:netto|paga|compenso)[^0-9]{0,12}([0-9]{1,3}(?:[.][0-9]{3})*(?:,[0-9]{2})?)/i) || t.match(/([0-9]{1,3}(?:[.][0-9]{3})*(?:,[0-9]{2}))\\s*(?:€|euro|eur)/i), a = i ? i[1] : null, r = t.match(/\\b([A-Z]{6}[A-Z0-9]{2}[A-Z][A-Z0-9]{2}[A-Z][A-Z0-9]{3}[A-Z])\\b/i), s = r ? r[1].toUpperCase() : null;
        let l = null;
        if (a) {
          const e = a.replace(/\\./g, "").replace(/,/g, "."), t = parseFloat(e);
          Number.isFinite(t) && (l = Math.round(100 * t))
        }
        let c = null;
        const d = t.match(/\\b([A-ZÀ-Ü]{2,}(?:\\s+[A-ZÀ-Ü]{2,}){1,4})\\b/);
        return d && (c = d[1].replace(/\\s+/g, " ").trim()), { monthKey: o, netPayText: a, netPayCents: l, fullName: c, fiscalCode: s }
      }

      function Ii() {
        const e = N.payroll.admin.gemini.pages || [], t = U("payrollPreviewTable"), n = U("payrollMissingPages"), o = U("payrollMissingList");
        if (!t) return;
        const i = e.map(e => {
          const t = e.fields || {}, n = e.errorReason ? "tone-bad" : t.fullName && t.monthKey && t.netPayText ? "tone-ok" : "tone-warn", o = e.errorReason ? "ERRORE" : t.fullName && t.monthKey && t.netPayText ? "OK" : "CAMPI MANCANTI", i = String(e.rawText || "").slice(0, 180).replace(/\\s+/g, " ").trim();
          return `<tr><td>${e.pageIndex+1}</td><td>${Ao(t.fullName||"—")}</td><td>${Ao(t.fiscalCode||"—")}</td><td>${Ao(t.monthKey||"—")}</td><td>${Ao(t.netPayText||"—")}</td><td>${null!=e.confidence?(100*e.confidence).toFixed(0)+"%":"—"}</td><td><div class="snippet">${Ao(i)}</div></td><td><span class="badgeTone ${n}">${o}</span></td></tr>`
        }).join("");
        t.innerHTML = "<tr><th>#</th><th>Nome</th><th>Codice fiscale</th><th>Mese</th><th>Netto</th><th>Conf.</th><th>Snippet</th><th>Stato</th></tr>" + i;
        const a = e.filter(e => !e.fields || !e.fields.monthKey || !e.fields.netPayText);
        n && (n.style.display = a.length ? "block" : "none", o && (o.textContent = a.map(e => e.pageIndex+1).join(", ")));
        const r = U("payrollPreviewMeta"); r && (r.textContent = `${e.length} pagine dal file`);
        const s = U("payrollPreviewBadge"); s && (s.textContent = a.length ? "Campi mancanti" : "OK")
      }

      function refreshGroupedValidation(){
        const rows = N.payroll?.admin?.groupedRows || [];
        const filters = N.payroll?.admin?.filters || {};
        const search = (filters.search || "").toLowerCase();
        const showIssues = !!filters.showIssues;
        const showSent = !!filters.showSent;
        const btn = U("btnPayrollSend");
        const summary = U("payrollMatchSummary");
        const matchCount = U("payrollMatchCount");
        const matchResultsTitle = U("payrollMatchResultsTitle");
        // Side menu counters (fase match)
        const selectedTotalEl = U("payrollSelectedTotal");
        const missingEmailTotalEl = U("payrollMissingEmailTotal");
        const conflictPages = N.payroll?.admin?.match?.conflictPages || [];
        const unassignedPages = N.payroll?.admin?.match?.unassignedPages || [];
        const messages = [];
        let selectableCount = 0;
        let selectedCount = 0;

        rows.forEach(r=>{
          r.missingEmail = !isValidEmail(r.email);
          r.missingMonth = !r.monthKey;
          if(!r.fiscalCode) r.warning = "CF mancante: raggruppo per nome";

          // Già inviata: non selezionabile / non reinviabile
          if(r.sent){
            r.enabled = false;
          }

          if(r.missingEmail) messages.push(`Email mancante per ${r.displayName||r.fiscalCode||r.key}`);
          if(r.missingMonth) messages.push(`Data/mese mancante per pagine ${r.pages?.map(p=>p.pageIndex+1).join(", ")||""}`);
          if(r.conflict) messages.push(`Conflitto su ${r.displayName||r.fiscalCode||r.key}`);

          const emailInput = document.querySelector(`input[data-payroll-field="email"][data-key="${cssEscape(r.key)}"]`);
          const toggle = document.querySelector(`input[data-payroll-row-toggle="${cssEscape(r.key)}"]`);
          const rowEl = document.querySelector(`[data-payroll-row="${cssEscape(r.key)}"]`);

          if(emailInput){
            emailInput.classList.toggle("invalid", r.missingEmail);
            emailInput.readOnly = !!r.sent;
          }

          const monthEl = document.querySelector(`[data-payroll-month="${cssEscape(r.key)}"]`);
          if(monthEl) monthEl.classList.toggle("invalid", r.missingMonth);

          const hasDocs = (r.pageNos?.length||r.pages?.length||0) > 0;
          const ok = !(r.missingEmail || r.missingMonth || r.conflict || !hasDocs) && !r.sent;

          if(toggle){
            if(!ok) r.enabled = false;
            toggle.disabled = !ok;
            // se "già inviata" mostro check ma disabilitato
            toggle.checked = r.sent ? true : (ok && (r.enabled !== false));
          }

          if(ok){
            selectableCount += 1;
            if(r.enabled !== false) selectedCount += 1;
          }

          // Colori riga (rosso se email mancante/errata) + verde se già inviata
          if(rowEl){
            rowEl.classList.remove("warn","conflict","badEmail","sentRow");
            if(r.sent) rowEl.classList.add("sentRow");
            else if(r.missingEmail) rowEl.classList.add("badEmail");
            else if(r.conflict) rowEl.classList.add("conflict");
            else if(r.missingMonth || !hasDocs) rowEl.classList.add("warn");
          }
        });

        if(conflictPages.length) messages.push(`Pagine in conflitto: ${conflictPages.map(p=>p+1).join(", ")}`);
        if(unassignedPages.length) messages.push(`Pagine non assegnate: ${unassignedPages.map(p=>p+1).join(", ")}`);

        const readyRows = rows.filter(r=>r.enabled!==false && !r.sent && !r.missingEmail && !r.missingMonth && !r.conflict && ((r.pageNos?.length||r.pages?.length||0)>0));
        if(btn) btn.disabled = !(readyRows.length);

        // Se NON esistono più righe non inviate, nascondi la CTA "Invia"
        const remainingToSend = rows.filter(r=>!r.sent).length;
        if(btn){
          btn.style.display = (remainingToSend <= 0) ? "none" : "";
        }


        const totalPages = rows.reduce((a,r)=>a+(r.pageNos?.length||r.pages?.length||0),0);
        const filteredRows = rows.filter(row=>{
          if(!showSent && row.sent) return false;
          const text = [row.displayName,row.fiscalCode,row.email].join(" ").toLowerCase();
          const hasIssue = row.missingEmail || row.missingMonth || row.conflict || row.warning;
          return (!search || text.includes(search)) && (!showIssues || hasIssue);
        });
        const filteredPages = filteredRows.reduce((a,r)=>a+(r.pageNos?.length||r.pages?.length||0),0);

        if(summary){ summary.textContent = `${rows.length} righe · ${totalPages} pagine`; }
        if(matchCount){ matchCount.textContent = `${filteredRows.length} righe · ${filteredPages} pagine`; }

        if(matchResultsTitle){
          const count = filteredRows.length;
          const countLabel = (count === 1) ? "1 busta paga" : `${count} buste paga`;

          // Mese: se unico lo mostro nel titolo; se diverso segnalo.
          const monthKeys = filteredRows.map(r=>normalizeMonthKey(r.monthKey||"")).filter(Boolean);
          const uniq = Array.from(new Set(monthKeys));

          if(uniq.length === 1){
            const mLabel = formatPayrollMonthLabel(uniq[0]);
            matchResultsTitle.innerHTML = `<span class="rmMain">Risultati: ${Ao(countLabel)},</span><span class="rmMonth">del mese ${Ao(mLabel)}</span>`;
          }else if(uniq.length > 1){
            matchResultsTitle.textContent = `Risultati: ${countLabel} (mesi diversi)`;
          }else{
            matchResultsTitle.textContent = `Risultati: ${countLabel}`;
          }
        }

        const headerToggle = U("payrollToggleAll");
        if(headerToggle){
          headerToggle.disabled = selectableCount === 0;
          headerToggle.checked = selectableCount > 0 && selectedCount === selectableCount;
          headerToggle.indeterminate = selectedCount > 0 && selectedCount < selectableCount;
        }

        // Side menu: conteggi richiesti
        if(selectedTotalEl) selectedTotalEl.textContent = String(rows.filter(r=>r.enabled!==false && !r.sent).length);
        if(missingEmailTotalEl) missingEmailTotalEl.textContent = String(rows.filter(r=>r.missingEmail).length);

        try{ updateSentToggleUI(); }catch(_e){}
      }

      function updateSentToggleUI(){
        const btn = U("btnPayrollToggleSent");
        if(!btn) return;
        const rows = N.payroll?.admin?.groupedRows || [];
        const sentCount = rows.filter(r=>!!r.sent).length;

        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        N.payroll.admin.filters = N.payroll.admin.filters || { search:"", showIssues:false, showSent:false };

        const showSent = !!N.payroll.admin.filters.showSent;

        if(sentCount <= 0){
          btn.disabled = true;
          btn.textContent = "Vedi già inviate";
          btn.setAttribute("aria-pressed","false");
          N.payroll.admin.filters.showSent = false;
          return;
        }
        btn.disabled = false;
        btn.setAttribute("aria-pressed", showSent ? "true" : "false");
        btn.textContent = showSent ? "Vedi da inviare" : `Vedi già inviate (${sentCount})`;
      }

      function isPayrollRowSelectable(row){
        if(!row) return false;
        if(row.sent) return false;
        const missingEmail = row.missingEmail ?? !isValidEmail(row.email);
        const missingMonth = row.missingMonth ?? !row.monthKey;
        const hasDocs = (row.pageNos?.length||row.pages?.length||0) > 0;
        row.missingEmail = missingEmail;
        row.missingMonth = missingMonth;
        return !(missingEmail || missingMonth || row.conflict || !hasDocs);
      }

      function buildGroupedRows(){
        const pages = N.payroll?.admin?.gemini?.pages || [];
        const docs = N.payroll?.admin?.gemini?.docs || [];
        const totalPages = N.payroll?.admin?.gemini?.totalPages || 0;
        const dirEntries = N.payroll?.directory?.entries || [];
        const localEmailCache = payrollReadEmailCache();
        const existing = new Map((N.payroll?.admin?.groupedRows||[]).map(r=>[r.key,r]));
        const dirByFiscal = new Map();
        const dirByName = new Map();
        const dirByNameKey = new Map();
        dirEntries.forEach(e=>{
          const fiscal = normalizeFiscalCode(e.fiscalCode || e.id || "");
          const nameNorm = normalizeNameStrict(e.displayName || e.fullName || "");
          const nameKey = normalizeNameKeyOrderless(e.displayName || e.fullName || "");
          if(fiscal) dirByFiscal.set(fiscal, e);
          if(nameNorm){
            if(!dirByName.has(nameNorm)) dirByName.set(nameNorm, []);
            dirByName.get(nameNorm).push(e);
          }
          if(nameKey){
            if(!dirByNameKey.has(nameKey)) dirByNameKey.set(nameKey, []);
            dirByNameKey.get(nameKey).push(e);
          }
        });
        const items = (docs && docs.length) ? docs : pages.map(p=>({
          ...p, pageIndices: [p.pageIndex],
          fullName: p.fields?.fullName || "",
          fiscalCode: p.fields?.fiscalCode || "",
          documentDate: p.fields?.monthKey || p.fields?.documentDate || p.fields?.document_date || p.fields?.date || p.fields?.month || p.fields?.period || "",
          netPayText: p.fields?.netPayText || "",
          netPayCents: p.fields?.netPayCents ?? null
        }));
        const fallbackNameCounts = new Map();
        items.forEach(item=>{
          const fiscalCode = normalizeFiscalCode(item.fiscalCode || item.fields?.fiscalCode || item.fields?.codiceFiscale || item.fields?.taxCode || "");
          if(fiscalCode) return;
          const nameNorm = normalizeNameStrict(item.fullName || item.fields?.fullName || "");
          if(!nameNorm) return;
          fallbackNameCounts.set(nameNorm, (fallbackNameCounts.get(nameNorm)||0)+1);
        });
        const pageOwners = new Map();
        const conflictPages = new Set();
        const groups = new Map();
        items.forEach((item, idx)=>{
          const fields = item.fields || {};
          const fullName = (item.fullName || fields.fullName || "").trim();
          const fiscalCodeRaw = item.fiscalCode || fields.fiscalCode || fields.codiceFiscale || fields.taxCode || "";
          const fiscalCode = normalizeFiscalCode(fiscalCodeRaw);
          const monthKey = normalizeMonthKey(item.documentDate || item.monthKey || fields.monthKey || fields.documentDate || fields.document_date || fields.date || fields.month || fields.period || "");
          const netPayText = item.netPayText || fields.netPayText || "";
          const netPayCents = item.netPayCents ?? fields.netPayCents ?? null;
          const nameNorm = normalizeNameStrict(fullName || "");
          const nameKey = normalizeNameKeyOrderless(fullName || "");
          const employeeKey = fiscalCode ? `cf:${fiscalCode.toLowerCase()}` : (nameNorm ? `name:${nameNorm}` : `anon:${idx}`);
          const prev = existing.get(employeeKey);
          let row = groups.get(employeeKey);

          let dirCandidates = [];
          if(fiscalCode){
            const m = dirByFiscal.get(fiscalCode);
            dirCandidates = m ? [m] : [];
          }else if(nameNorm){
            dirCandidates = (dirByName.get(nameNorm)||[]);
            if(!dirCandidates.length && nameKey){
              dirCandidates = (dirByNameKey.get(nameKey)||[]);
            }
          }
          const dirMatch = dirCandidates[0];
          const cachedEmail = payrollGetCachedEmail(localEmailCache, { fiscalCode, displayName: fullName });

          if(!row){
            const emailLower = (prev?.email || dirMatch?.emailLower || cachedEmail || "").toLowerCase();
            row = {
              key: employeeKey,
              displayName: prev?.displayName || fullName || dirMatch?.displayName || dirMatch?.fullName || "",
              fiscalCode: prev?.fiscalCode || fiscalCode || dirMatch?.fiscalCode || "",
              monthKey: prev?.monthKey || monthKey || "",
              documentDate: prev?.documentDate || monthKey || "",
              netPayText: prev?.netPayText || netPayText,
              netPayCents: prev?.netPayCents ?? netPayCents ?? null,
              email: emailLower || "",
              emailLocked: prev?.emailLocked ?? Boolean(dirMatch && emailLower),
              emailSource: prev?.emailSource || (dirMatch ? (fiscalCode ? "directory-cf" : "directory-name") : (cachedEmail ? "cache" : "")),
              saveState: prev?.saveState || "idle",
              enabled: prev?.enabled ?? true,
              sent: prev?.sent || false,
              sentReason: prev?.sentReason || "",
              sentAtClient: prev?.sentAtClient || 0,
              pages: [],
              pageNos: [],
              sources: [],
              warning: "",
              conflict: false,
              missingMonth: false,
              missingEmail: false,
              dirCandidatesCount: dirCandidates.length
            };
          }
          const pageIndices = Array.from(new Set((item.pageIndices||[]).filter(v=>Number.isFinite(v)).map(v=>Math.max(0,Math.round(v))))).sort((a,b)=>a-b);
          pageIndices.forEach(pi=>{
            const owner = pageOwners.get(pi);
            if(owner && owner!==employeeKey){ conflictPages.add(pi); }else{ pageOwners.set(pi, employeeKey); }
          });
          row.pages.push(...pageIndices.map(pi=>({pageIndex: pi, monthKey, netPayText, netPayCents, fields})));
          row.sources.push(item);
          if(!row.netPayText && netPayText) row.netPayText = netPayText;
          if(null == row.netPayCents && null != netPayCents) row.netPayCents = netPayCents;
          if(!row.monthKey && monthKey) row.monthKey = monthKey;
          if(!row.documentDate && monthKey) row.documentDate = monthKey;
          if(!row.fiscalCode && fiscalCode) row.fiscalCode = fiscalCode;
          if(!row.displayName && fullName) row.displayName = fullName;
          row.dirCandidatesCount = dirCandidates.length || row.dirCandidatesCount;
          groups.set(employeeKey, row);
        });
        const rows = Array.from(groups.values()).map(r=>{
          const fiscalNorm = normalizeFiscalCode(r.fiscalCode);
          const nameNorm = normalizeNameStrict(r.displayName || "");
          const uniquePages = Array.from(new Set(r.pages.map(p=>p.pageIndex))).filter(pi=>!conflictPages.has(pi)).sort((a,b)=>a-b);
          r.pages = uniquePages.map(pi=>({pageIndex: pi}));
          r.pageNos = uniquePages.map(pi=>pi+1);
          const monthValues = Array.from(new Set((r.sources||[]).map(src=>normalizeMonthKey(src.documentDate || src.monthKey || src.fields?.monthKey || "")))).filter(Boolean);
          if(!r.monthKey && monthValues[0]) r.monthKey = monthValues[0];
          r.amountText = r.netPayText || (null != r.netPayCents ? formatEuroFromCents(r.netPayCents) : "");
          let warning = fiscalNorm ? "" : "CF mancante: raggruppo per nome";
          if(monthValues.length > 1) warning = warning ? `${warning}; date multiple rilevate` : "Date multiple rilevate";
          if(!r.email){
            let dirMatch = null;
            if(fiscalNorm){
              dirMatch = dirByFiscal.get(fiscalNorm);
            }else if(nameNorm){
              dirMatch = (dirByName.get(nameNorm)||[])[0] || null;
              if(!dirMatch){
                const k = normalizeNameKeyOrderless(r.displayName || "");
                if(k) dirMatch = (dirByNameKey.get(k)||[])[0] || null;
              }
            }

            if(dirMatch?.emailLower){
              r.email = dirMatch.emailLower;
              r.emailLocked = true;
              r.emailSource = r.emailSource || "directory-auto";
            }else{
              const cached = payrollGetCachedEmail(localEmailCache, { fiscalCode: fiscalNorm, displayName: r.displayName || "" });
              if(cached){
                r.email = cached;
                // cache locale: non blocco l'input (l'utente può correggere)
                r.emailLocked = false;
                r.emailSource = r.emailSource || "cache";
              }
            }
          }
          r.warning = warning;
          const nameCollision = !fiscalNorm && nameNorm && (fallbackNameCounts.get(nameNorm)||0) > 1;
          r.conflict = nameCollision || (!fiscalNorm && r.dirCandidatesCount > 1) || r.conflict || uniquePages.some(pi=>conflictPages.has(pi)) || uniquePages.length===0;
          r.missingMonth = !r.monthKey;
          r.missingEmail = !isValidEmail(r.email);
          return r;
        });
        const assignedPages = new Set();
        rows.forEach(r=>{ (r.pages||[]).forEach(p=>assignedPages.add(p.pageIndex)); });
        const unassignedPages = (N.payroll?.admin?.gemini?.pages || []).map(p=>p.pageIndex).filter(pi=>!assignedPages.has(pi));
        N.payroll.admin.groupedRows = rows;
        N.payroll.admin.match = {
          rows,
          conflictPages: Array.from(conflictPages.values()),
          unassignedPages,
          totalPages
        };
        Pi();
      }

      
      
      async function openPayrollPages(key){
        try{
          const row = (N.payroll?.admin?.groupedRows || []).find(r=>r.key===key);
          if(!row){ Ve("Anteprima non disponibile","Riga non trovata."); return; }
          if(!N.payroll?.admin?.originalPdfBytes) throw new Error("PDF origine mancante.");
          const pages = (row.pages||[]).map(p=>p.pageIndex);
          if(!pages.length) throw new Error("Nessuna pagina assegnata.");

          const bytes = await xi(N.payroll.admin.originalPdfBytes, pages);
          if(!bytes || !bytes.byteLength) throw new Error("Impossibile preparare l’anteprima.");

          const blob = new Blob([bytes], { type:"application/pdf" });
          const objUrl = URL.createObjectURL(blob);
          const pageLabel = (row.pageNos && row.pageNos.length) ? row.pageNos.join(", ") : pages.map(p=>p+1).join(", ");
          const title = `Anteprima · ${row.displayName || row.fiscalCode || row.email || "PDF"}`;
          const sub = `${row.monthKey || "—"} · pagine ${pageLabel}`;

          showPdfPreview({
            title,
            sub,
            srcUrl: objUrl,
            fileName: buildSafePdfName(`${row.displayName || row.fiscalCode || "busta_paga"} ${row.monthKey || ""}`),
            markOpenedVia: null
          });
        }catch(err){
          console.warn("openPayrollPages", err);
          Ve("Anteprima non disponibile", err?.message || String(err));
        }
      }

function closePayrollPages(){
        if(N.payroll?.admin) N.payroll.admin.previewRowKey = "";
      }
function Bi() {
        const e = U("payrollAdminFileLabel");
        if (!e) return;
        const t = N.payroll.admin.files?.[0];
        e.textContent = t ? t.name : "Nessun file"
      }

      function Oi() {
        const isAuthed = Boolean(N.user && !N.user.isAnonymous);
        const isAdmin = Boolean(N.user && !N.user.isAnonymous && N.user.isAdmin);
        const adminPanel = U("adminArea");
        // Upload buste paga: visibile anche per utenti NON admin (incluso accesso ospite)
        if (adminPanel) adminPanel.style.display = isAuthed ? "" : "none";
        const pagesPanel = U("payrollPagesPanel");
        if (pagesPanel && !isAdmin) pagesPanel.style.display = "none";
        const n = U("payrollUserBadge"), o = U("payrollUserHint"), i = N.payroll?.userView || {};
        if (n) { const e = i.months?.[0] || "—"; n.textContent = i.ready ? `Ultimo: ${e||"—"}` : "Sync" }
        o && (i.error ? (o.textContent = i.error, o.style.color = "var(--bad)") : o.textContent = "Accesso riservato al tuo profilo.");
        const a = U("payrollAdminStatus"); if (a) { const e = N.payroll?.admin?.step || "idle"; a.textContent = e.toUpperCase() }
      }

      function Di(e) {
        N.payroll.admin.step = e;

	      // Segnala lo step corrente al DOM (utile per CSS/UX)
	      try{
	        const m = document.getElementById("adminModal");
	        if(m) m.setAttribute("data-payroll-step", String(e||""));
	      }catch(_e){}

        const t = {
          idle: U("payrollStepIdle"),
          extracting: U("payrollStepExtract"),
          preview: U("payrollStepPreview"),
          match: U("payrollStepMatch"),
          sending: U("payrollStepSending"),
          history: U("payrollStepHistory"),
          directory: U("payrollDirectoryPane")
        };
        Object.entries(t).forEach(([t, n]) => { n && (n.style.display = t === e ? "flex" : "none") });
        const n = U("payrollAdminStepLabel"); n && (n.textContent = e==="directory" ? "Dipendenti" : (e==="history" ? "Storico invii" : e.charAt(0).toUpperCase() + e.slice(1)));
        const u=U("payrollTabUpload"), c=U("payrollTabDirectory"), w=U("payrollTabWorkflow");
        const uploadSteps = ["idle","extracting","preview"];
        const workflowSteps = ["match","sending","history"];
        u && u.classList.toggle("active", uploadSteps.includes(e));
        c && c.classList.toggle("active", "directory"===e);
        w && w.classList.toggle("active", workflowSteps.includes(e) || (!uploadSteps.includes(e) && "directory"!==e));
        if(e==="extracting"){ startPayrollBusyRotator(); } else { stopPayrollBusyRotator(); }

	      // Richiesta: in fase MATCH i pulsanti devono stare nel menu laterale
	      try{
	        const closeBtn = U("btnCloseAdmin");
	        if(closeBtn) closeBtn.style.display = (e === "match") ? "none" : "";
	      }catch(_e){}

      try{ if(e==="match") Pi(); }catch(_e){}
      }

      const __payrollBusyPhrases = [
        "Attendere prego…",
        "Lavorazione in corso…",
        "Stiamo verificando i dati: grazie per la pazienza.",
        "Controlli automatici e sicurezza in esecuzione.",
        "Prepariamo il match delle righe…",
        "Quasi fatto: non chiudere la pagina."
      ];

      function startPayrollBusyRotator(){
        try{
          const a = N.payroll?.admin; if(!a) return;
          a.__busyRot = a.__busyRot || { timer:null, t2:null, idx:0 };
          const rot = U("payrollBusyRotator");
          if(!rot) return;

          stopPayrollBusyRotator();
          a.__busyRot.idx = 0;
          rot.textContent = __payrollBusyPhrases[0];
          rot.style.opacity = "1";

          a.__busyRot.timer = setInterval(()=>{
            try{
              const st = N.payroll?.admin?.step;
              if(st !== "extracting"){ stopPayrollBusyRotator(); return; }
              const next = (a.__busyRot.idx + 1) % __payrollBusyPhrases.length;
              a.__busyRot.idx = next;
              rot.style.opacity = "0";
              a.__busyRot.t2 = setTimeout(()=>{
                rot.textContent = __payrollBusyPhrases[next];
                rot.style.opacity = "1";
              }, 180);
            }catch(_e){}
          }, 1700);
        }catch(_e){}
      }

      function stopPayrollBusyRotator(){
        try{
          const a = N.payroll?.admin;
          if(a && a.__busyRot){
            try{ a.__busyRot.timer && clearInterval(a.__busyRot.timer); }catch(_e){}
            try{ a.__busyRot.t2 && clearTimeout(a.__busyRot.t2); }catch(_e){}
            a.__busyRot.timer = null;
            a.__busyRot.t2 = null;
          }
          const rot = U("payrollBusyRotator");
          if(rot){
            rot.textContent = "";
            rot.style.opacity = "1";
          }
        }catch(_e){}
      }

function renderDirectoryUI(){
  const entries = N.payroll?.directory?.entries || [];
  const tbody = U("payrollDirectoryBody");
  const count = U("payrollDirectoryCount");
  const cfList = U("dirCfSuggestions");
  const emailList = U("dirEmailSuggestions");
  const errBox = U("payrollDirectoryError");

  const dir = N.payroll.directory = N.payroll.directory || {};
  dir.ui = dir.ui || { selected:{}, editing:{}, drafts:{}, inEdit:false };
  const ui = dir.ui;

  if(errBox){
    const msg = dir.error || "";
    errBox.style.display = msg ? "block" : "none";
    errBox.textContent = msg ? ("Accesso negato a payrollDirectory (Firestore rules). " + msg) : "";
  }

  if(count) count.textContent = `${entries.length} dipendenti whitelist`;

  if(cfList) cfList.innerHTML = entries.map(e => `<option value="${Ao(e.fiscalCode||"")}"></option>`).join("");
  if(emailList) emailList.innerHTML = entries.map(e => `<option value="${Ao(e.emailLower||e.id||"")}"></option>`).join("");

  const selectedCount = Object.values(ui.selected||{}).filter(Boolean).length;
  const bulkHint = U("dirBulkHint");
  if(bulkHint){
    bulkHint.textContent = ui.inEdit
      ? `Modifica attiva · ${Object.values(ui.editing||{}).filter(Boolean).length} righe`
      : `${selectedCount} selezionati`;
  }

  // Toggle pulsanti bulk
  const btnEdit = U("btnDirEditSelected");
  const btnDel = U("btnDirDeleteSelected");
  const btnSave = U("btnDirSaveEdits");
  const btnCancel = U("btnDirCancelEdits");
  if(btnSave) btnSave.style.display = ui.inEdit ? "" : "none";
  if(btnCancel) btnCancel.style.display = ui.inEdit ? "" : "none";
  if(btnEdit) btnEdit.style.display = ui.inEdit ? "none" : "";
  if(btnDel) btnDel.style.display = ui.inEdit ? "none" : "";

  if(!tbody) return;

  if(!entries.length){
    tbody.innerHTML = '<tr><td colspan="5" class="muted">Nessun dipendente whitelist.</td></tr>';
    return;
  }

  const rowsHtml = entries.map(e=>{
    const emailLower = normalizeEmail(e.emailLower || e.email || e.id || "");
    const selected = !!ui.selected[emailLower];
    const editing = !!ui.editing[emailLower];
    const draft = ui.drafts[emailLower] || {};
    const nameVal = editing ? (draft.displayName ?? (e.displayName||"")) : (e.displayName||"—");
    const emailVal = editing ? (draft.emailLower ?? emailLower) : (emailLower||"—");
    const cfVal = e.fiscalCode || "—";
    const sent = (N.payroll?.admin?.sentCounts || {})[emailLower] || 0;

    return `
      <tr data-dir-row="${Ao(emailLower)}">
        <td><input type="checkbox" data-dir-select="${Ao(emailLower)}" ${selected?"checked":""} ${ui.inEdit && !editing ? "disabled": ""}></td>
        <td>${editing ? `<input class="dirEditInput" data-dir-edit-name="${Ao(emailLower)}" value="${Ao(nameVal)}" placeholder="Nome Cognome">` : Ao(nameVal)}</td>
        <td>${Ao(cfVal)}</td>
        <td>${editing ? `<input class="dirEditInput" data-dir-edit-email="${Ao(emailLower)}" value="${Ao(emailVal)}" placeholder="email@azienda.it" inputmode="email" autocomplete="email">` : Ao(emailVal)}</td>
        <td>${Ao(String(sent))}</td>
      </tr>
    `;
  }).join("");

  tbody.innerHTML = rowsHtml;
}

async function saveDirectoryEntry() {
        if (!(N.firebase?.ok && N.user?.isAdmin)) return;
        const cfInput = U("dirCfInput"), emailInput = U("dirEmailInput"), feedback = U("dirFeedback"), firstInput = U("dirFirstNameInput"), lastInput = U("dirLastNameInput");
        const emailLower = normalizeEmail(emailInput?.value), fiscalCode = (cfInput?.value || "").replace(/\\s+/g, " ").trim().toUpperCase(), firstName = (firstInput?.value || "").trim(), lastName = (lastInput?.value || "").trim(), displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || fiscalCode, fullNameNorm = normalizeNameStrict(displayName || fiscalCode || emailLower);
        if (!emailLower || !fiscalCode) return void(feedback && (feedback.textContent = "Inserisci email e codice fiscale (nome/cognome facoltativi)"));
        const payload = {
          emailLower,
          fiscalCode,
          firstName,
          lastName,
          displayName,
          fullNameNorm,
          enabled: !0,
          updatedAt: N.firebase.api.serverTimestamp(),
          updatedBy: N.user?.email || "",
          id: emailLower
        };
        try {
          await N.firebase.api.setDoc(N.firebase.api.doc(N.firebase.db,COL_PAYROLL_DIRECTORY, emailLower), payload, { merge: !0 });
          feedback && (feedback.textContent = "Salvato");
          await zi()
        } catch (err) {
          console.warn("saveDirectoryEntry", err);
          feedback && (feedback.textContent = err?.message || "Errore salvataggio")
        }
      }

      async function deleteDirectoryEntry(emailLower){
        if (!(N.firebase?.ok && N.user?.isAdmin) || !emailLower) return;
        try{
          await N.firebase.api.deleteDoc(N.firebase.api.doc(N.firebase.db, COL_PAYROLL_DIRECTORY, emailLower));
          await zi();
        }catch(err){
          console.warn("deleteDirectoryEntry", err);
          Ve("Eliminazione non riuscita", err?.message || String(err));
        }
      }

      async function deletePayrollDocs(mode="last"){
        if (!(N.firebase?.ok && N.user?.isAdmin)) return;
        const view = N.payroll?.userView || {};
        const docs = view.docs || [];
        if(!docs.length) return;
        const email = (view.emailLower || N.user?.emailLower || "").toLowerCase();
        const api = N.firebase.api;
        const db = N.firebase.db;
        const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : [COL_PAYROLL_DOCS, COL_PAYROLL_DOCS_LEGACY].filter(Boolean));
        try{
          if(mode==="all"){
            for(const col of cols){
              try{
                const q = api.query(api.collection(db, col), api.where("emailLower","==",email));
                const snap = await api.getDocs(q);
                for(const d of snap.docs || []){ await api.deleteDoc(d.ref); }
              }catch(err){
                if(err?.code !== "permission-denied") console.warn("deletePayrollDocs list", col, err);
              }
            }
            Ve("Documenti eliminati","Tutti i documenti per il profilo corrente sono stati rimossi.");
          }else{
            const last = docs[0];
            if(last?.docId){
              for(const col of cols){
                try{ await api.deleteDoc(api.doc(db, col, last.docId)); }catch(_e){}
              }
            }
            Ve("Eliminato","Ultimo documento rimosso.");
          }
          await Fi();
        }catch(err){
          console.warn("deletePayrollDocs", err);
          Ve("Errore eliminazione", err?.message || String(err));
        }
      }


      
function Pi(){
  const grouped = N.payroll?.admin?.groupedRows || [];
  const body = U("payrollGroupedBody");
  const counter = U("payrollListCount");
  if(!body) return;

  const filters = N.payroll?.admin?.filters || {};
  const search = (filters.search || "").trim().toLowerCase();
  const showIssues = !!filters.showIssues;
  const showSent = !!filters.showSent;

  // aggiorna flags
  grouped.forEach(r=>{ r.missingEmail = !isValidEmail(r.email); r.missingMonth = !r.monthKey; });

  const filtered = grouped.filter(row=>{
    if(!showSent && row.sent) return false;
    const text = [row.displayName,row.fiscalCode,row.email].join(" ").toLowerCase();
    const hasIssue = row.missingEmail || row.missingMonth || row.conflict || row.warning;
    return (!search || text.includes(search)) && (!showIssues || hasIssue);
  });

  const html = filtered.map(row=>{
    const pagesRaw = (row.pageNos || row.pages || []);
    const pages = pagesRaw.map(p=>{
      if(typeof p === "number") return p;
      if(p && typeof p.pageIndex === "number") return p.pageIndex + 1;
      if(p && typeof p.pageNo === "number") return p.pageNo;
      return null;
    }).filter(v=>v!=null);

    const pagesCount = pages.length;
    const pagesLabel = pagesCount ? (pagesCount===1 ? "1 pagina" : `${pagesCount} pagine`) : "—";
    const cf = row.fiscalCode || "";
    const amount = row.amountText || row.netPayText || "";
    const missingDocs = !((row.pageNos?.length||row.pages?.length||0));

    // classi riga: rosso se mail errata, verde se già inviata
    const issueClass = row.missingEmail ? "badEmail" : (row.conflict ? "conflict" : ((row.missingMonth || missingDocs) ? "warn" : ""));
    const rowClass = row.sent ? "sentRow" : issueClass;
    const sentBadge = row.sent ? `<span class="sentBadge">già inviata</span>` : "";
    const flagChecked = row.sent ? "checked" : (row.enabled!==false ? "checked" : "");
    const flagDisabled = row.sent ? "disabled" : "";
    const safeKey = String(row.key||"").replace(/[^a-zA-Z0-9_-]/g,"").slice(0,40) || "row";
    const autoSection = `section-payroll-${safeKey}`;
    const emailCell = row.sent
      ? `<span class="emailText" title="${Ao(row.email||"")}">${Ao(row.email||"—")}</span>`
      : `<input class="emailInput ${row.missingEmail?"invalid":""}" data-payroll-field="email" data-key="${Ao(row.key)}" name="payroll_email_${safeKey}" value="${Ao(row.email||"")}" placeholder="nome@azienda.it" inputmode="email" autocomplete="${autoSection} email" autocapitalize="none" spellcheck="false">`;

    return `
      <tr class="${rowClass}" data-payroll-row="${Ao(row.key)}">
        <td class="flagCell">
          <input class="rowFlag" type="checkbox" data-payroll-row-toggle="${Ao(row.key)}" ${flagChecked} ${flagDisabled} aria-label="${row.sent ? "Riga già inviata" : "Seleziona riga"}">
        </td>
        <td class="nameCell" title="${Ao(row.displayName||"")}">${Ao(row.displayName||"—")}${sentBadge}</td>
        <td class="cfCell" title="Codice fiscale">${Ao(cf||"—")}</td>
        <td class="amountCell">${Ao(amount||"—")}</td>
        <td class="emailCell">${emailCell}</td>
        <td class="pagesCell" title="Apri PDF"><button type="button" class="pageLink" data-payroll-open-pages="${Ao(row.key)}">${Ao(pagesLabel)}</button></td>
      </tr>
    `;
  }).join("");

  if(html){
    body.innerHTML = html;
  }else{
    const allSent = grouped.length > 0 && grouped.every(r=>!!r.sent);
    if(allSent && !showSent){
      body.innerHTML = `
        <tr>
          <td colspan="6" style="padding:18px 14px;text-align:center">
            <div style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap">
            <div style="text-align:center">
              <div class="pcTitle" style="font-size:16px;margin:0;color:#0b5d2a">✅ Tutte le buste paga sono state inviate correttamente.</div>
              <div class="pcSub" style="margin-top:6px;color:rgba(15,23,42,.62)">Grazie per aver usato iLovePaghe.</div>
            </div>
          </div>
        </td>
      </tr>
    `;
    }else{
      body.innerHTML = '<tr><td colspan="6" class="muted" style="padding:14px">Nessuna riga.</td></tr>';
    }
  }
  if(counter) counter.textContent = `${filtered.length} righe`;
  refreshGroupedValidation();
}

function renderUploadHistory(){
        const list = U("payrollHistoryList");
        const meta = U("payrollHistoryMeta");
        const history = N.payroll?.admin?.uploadHistory || [];
        const sel = (N.payroll?.admin?.historySelection) || {};
        const selCount = Object.values(sel).filter(Boolean).length;

        if(meta){
          const last = history.length ? (history[0].createdAt || "—") : "—";
          meta.textContent = history.length ? `Ultimo: ${last}` : "—";
          if(selCount) meta.textContent += ` · Selezionati: ${selCount}`;
        }

        const btnDel = U("btnHistoryDeleteSel");
        if(btnDel) btnDel.disabled = selCount === 0;

        if(!list) return;

        if(!history.length){
          list.innerHTML = '<div class="pcHint"></div>';
          return;
        }

        list.innerHTML = history.map(item=>{
          const statusClass = item.status==="ok" ? "ok" : "err";
          const checked = !!sel[item.id];
          return `<div class="uploadHistoryItem" data-history-id="${Ao(item.id||"")}">
            <div class="historyCheck">
              <input class="historyCk" type="checkbox" data-history-check="${Ao(item.id||"")}" ${checked ? "checked" : ""}>
            </div>
            <div class="uploadHistoryMeta">
              <div class="uploadHistoryTitle">${Ao(item.fileName||"Documento")}</div>
              <div>${Ao(item.createdAt||"")}</div>
            </div>
            <div class="uploadHistoryBadges">
              <span class="pillTone ${statusClass}">${Ao(item.status||"ok")}</span>
              <span class="pillTone">${Ao(String(item.totalPages||0))}p</span>
            </div>
          </div>`;
        }).join("");
      }

      async function loadUploadHistory(){
        if(!(N.firebase?.ok && N.user?.isAdmin)) return;
        try{
          const api = N.firebase.api, db = N.firebase.db;
          const q = api.query(api.collection(db,"payrollIngestLogs"), api.orderBy("createdAt","desc"), api.limit(25));
          const snap = await api.getDocs(q);
          const hist = [];
          snap?.forEach(doc=>{
            const d = doc.data() || {};
            hist.push({
              id: doc.id,
              fileName: d.sourceFileName || "",
              totalPages: d.totalPages || 0,
              status: d.status || "ok",
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString("it-IT") : ""
            });
          });
          N.payroll.admin.uploadHistory = hist;
          renderUploadHistory();
        }catch(err){
          const msg = String(err?.message || err || "").toLowerCase();
          if(err?.code === "permission-denied" || msg.includes("insufficient permissions") || msg.includes("missing or insufficient permissions")){
            // Regole Firestore: lettura non consentita → non sporcare la console e non rompere la UI
            N.payroll = N.payroll || {};
            N.payroll.admin = N.payroll.admin || {};
            N.payroll.admin.uploadHistory = [];
            renderUploadHistory();
            return;
          }
          console.warn("history load", err);
        }
      }

      async function logPayrollSendEvent(payload){
        try{
          const emailLower = String(payload?.emailLower || payload?.email || "").toLowerCase();
          const monthKey = String(payload?.monthKey || "");
          const rand = Math.random().toString(36).slice(2,7);
          const eventKey = String(`${Date.now()}_${rand}_${emailLower}_${monthKey}`).replace(/[\/]/g,"_");

          const evt = {
            ...payload,
            adminEmail: payload?.adminEmail || N.user?.email || "",
            adminUid: payload?.adminUid || N.user?.uid || "",
            adminName: payload?.adminName || N.user?.displayName || "",
            eventKey,
            sentAtClient: Date.now(),
            sentAtISO: new Date().toISOString()
          };

          // Sempre: salva in locale + tenta indice (fallback se le regole bloccano LIST)
          try{ appendLocalSendLog(evt); }catch(_e){}
          try{ upsertSendLogIndex(evt); }catch(_e){}

          // Best-effort: log classico su collection (se consentito)
          if(!(N.firebase?.ok && N.user?.isAdmin)) return;
          const api = N.firebase.api, db = N.firebase.db;
          await api.setDoc(
            api.doc(db, COL_PAYROLL_SEND_LOGS, eventKey),
            { ...evt, sentAt: api.serverTimestamp(), createdAt: api.serverTimestamp() },
            { merge: true }
          );
        }catch(err){
          console.warn("payroll send log write", err);
        }
      }

      async function markPayrollDocOpened(via){
        try{
          if(!N.firebase?.ok || !N.user) return;
          const docKey = N.payroll?.userView?.currentDocKey;
          if(!docKey) return;
          const api = N.firebase.api, db = N.firebase.db;

          // prova a scrivere sul doc reale (payrollDocs o payrolls)
          let col = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS[0] : "payrollDocs");
          try{
            const found = await tryGetPayrollDocSnap(api, db, docKey);
            if(found?.col) col = found.col;
          }catch(_e){}

          await api.setDoc(api.doc(db, col, docKey), {
            openedAt: api.serverTimestamp(),
            openedByUid: N.user?.uid || "",
            openedByEmail: (N.user?.email || "").toLowerCase(),
            openedVia: via || "view"
          }, { merge:true });
        }catch(err){
          console.warn("markPayrollDocOpened", err);
        }
      }


      function renderPayrollSendLogs(){
        const logs = N.payroll?.admin?.sendLogs || [];
        const source = String(N.payroll?.admin?._sendLogSource || "");
        const readOnly = source.startsWith("reconstruct");
        const openedMap = N.payroll?.admin?.openedByDocKey || {};
        const sel = (N.payroll?.admin?.sendLogSelection) || {};
        const selCount = Object.values(sel).filter(Boolean).length;

        const targets = [
          { list: U("payrollSendLogList"), meta: U("payrollSendLogMeta"), deleteBtn: U("btnSendLogDeleteSel") }
        ];
        const cardMeta = U("sendLogCardMeta");
        if(cardMeta) cardMeta.textContent = logs.length ? `Ultimi ${logs.length} invii registrati` : "Nessun invio registrato";

        const fmt = (ts)=>{
          try{
            if(!ts) return "";
            if(ts.toDate) return ts.toDate().toLocaleString("it-IT");
            if(ts instanceof Date) return ts.toLocaleString("it-IT");
          }catch(_e){}
          return "";
        };

        targets.forEach(target=>{
          if(target?.deleteBtn) target.deleteBtn.disabled = readOnly || (selCount === 0);
          if(target?.meta){
            target.meta.textContent = logs.length ? `Ultimi ${logs.length} invii` : "Nessun invio";
            if(readOnly) target.meta.textContent += " · Solo lettura";
            if(selCount) target.meta.textContent += ` · Selezionati: ${selCount}`;
          }
          if(!target?.list) return;

          if(!logs.length){
            target.list.innerHTML = '<div class="pcHint">Ancora nessun invio.</div>';
            return;
          }

          target.list.innerHTML = logs.map(item=>{
          const checked = !!sel[item.id];
          const opened = openedMap[item.docKey] || {};
          const openedAt = opened.openedAt || null;
          const sentAt = item.sentAt || null;
          let isOpened = false;
          try{
            const s = sentAt?.toDate ? sentAt.toDate().getTime() : (sentAt instanceof Date ? sentAt.getTime() : 0);
            const o = openedAt?.toDate ? openedAt.toDate().getTime() : (openedAt instanceof Date ? openedAt.getTime() : 0);
            if(o && s) isOpened = o >= s;
            else if(o && !s) isOpened = true;
          }catch(_e){}

          const openedLabel = isOpened ? "Aperto" : "Non aperto";
          const statusClass = isOpened ? "ok" : "";

          const title = item.fullName || item.emailLower || "—";
          const sub = item.emailLower || "";
          const month = item.monthKey || "—";
          const pages = item.pagesCount != null ? (item.pagesCount===1 ? "1 pagina" : `${item.pagesCount} pagine`) : "—";
          const amount = item.netPayText ? item.netPayText : "";

          return `<div class="uploadHistoryItem sendLogItem" data-sendlog-id="${Ao(item.id||"")}">
            <div class="historyCheck">
              <input class="historyCk" type="checkbox" data-sendlog-check="${Ao(item.id||"")}" ${checked ? "checked" : ""} ${readOnly || item.readonly ? "disabled" : ""}>
            </div>
            <div class="uploadHistoryMeta" style="min-width:0">
              <div class="uploadHistoryTitle">${Ao(title)}</div>
              <div style="font-weight:820">${Ao(sub)}</div>
              <div>${Ao(month)} · ${Ao(pages)}${amount ? " · " + Ao(amount) : ""}</div>
              <div>${Ao(fmt(item.sentAt) || "")}</div>
            </div>
            <div class="uploadHistoryBadges">
              ${ (readOnly || item.readonly) ? '<span class="pillTone">Solo lettura</span>' : '' }
              <span class="pillTone ${statusClass}">${openedLabel}</span>
              <span class="pillTone">${Ao(item.adminEmail || "")}</span>
            </div>
          </div>`;
        }).join("");
        });
      }

      
      async function loadPayrollSendLogs(){
        if(!(N.firebase?.ok && N.user?.isAdmin)) return;
        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        const api = N.firebase.api, db = N.firebase.db;

        let rawLogs = [];
        let source = "query";

        // 1) prova query classica (LIST)
        try{
          const q = api.query(api.collection(db, COL_PAYROLL_SEND_LOGS), api.orderBy("sentAt","desc"), api.limit(200));
          const snap = await api.getDocs(q);
          snap?.forEach(d=>{
            const x = d.data() || {};
            rawLogs.push({ id: d.id, ...x });
          });
        }catch(err){
          source = "fallback";
          if(err?.code !== "permission-denied"){
            console.warn("payroll send logs load", err);
          }
          // 2) fallback: indice doc noto (GET)
          try{
            const idxSnap = await api.getDoc(api.doc(db, "payrollSendLogIndex", "global"));
            if(idxSnap?.exists()){
              const d = idxSnap.data() || {};
              if(Array.isArray(d.logs)) rawLogs = d.logs.slice();
              source = "index";
            }
          }catch(_e){}
          // 3) fallback finale: localStorage
          if(!rawLogs.length){
            try{ rawLogs = readLocalSendLogs() || []; source = "local"; }catch(_e){}
          }
        }

        // Se la LIST è vuota, prova comunque indice/local (utile quando scriviamo solo su index)
        if(!rawLogs.length){
          try{
            const idxSnap = await api.getDoc(api.doc(db, "payrollSendLogIndex", "global"));
            if(idxSnap?.exists()){
              const d = idxSnap.data() || {};
              if(Array.isArray(d.logs)) rawLogs = d.logs.slice();
              source = "index";
            }
          }catch(_e){}
          if(!rawLogs.length){
            try{ rawLogs = readLocalSendLogs() || []; source = "local"; }catch(_e){}
          }
        }

        // 4) Ricostruzione (solo lettura): se non esistono log, prova a derivarli dai documenti payrollDocs
        if(!rawLogs.length){
          try{
            const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : ["payrollDocs","payrolls"]);
            for(const col of cols){
              try{
                const q2 = api.query(api.collection(db, col), api.orderBy("updatedAt","desc"), api.limit(120));
                const snap2 = await api.getDocs(q2);
                const tmp = [];
                snap2?.forEach(d=>{
                  const x = d.data() || {};
                  if(!x.emailLower || !x.monthKey) return;
                  if(!(x.downloadUrl || x.storagePath)) return;
                  tmp.push({
                    _reconstructed: true,
                    payrollDocId: d.id,
                    docKey: d.id,
                    downloadUrl: x.downloadUrl || "",
                    storagePath: x.storagePath || "",
                    sourceFileName: x.sourceFileName || x.fileName || "",
                    fileName: x.fileName || x.sourceFileName || "",
                    sentAt: x.updatedAt || x.createdAt || null,
                    sentAtClient: x.updatedAtClient || x.createdAtClient || null,
                    emailLower: String(x.emailLower||"").toLowerCase(),
                    monthKey: x.monthKey || "",
                    fullName: x.fullName || "",
                    fiscalCode: x.fiscalCode || "",
                    netPayText: x.netPayText || "",
                    netPayCents: x.netPayCents ?? null,
                    pageIndices: x.pageIndices || [],
                    pagesCount: x.pagesCount ?? (Array.isArray(x.pageIndices) ? x.pageIndices.length : 0),
                    adminEmail: x.adminEmail || "",
                    lastSentBy: x.adminEmail || "",
                    status: "reconstructed"
                  });
                });
                if(tmp.length){
                  rawLogs = tmp;
                  source = "reconstruct:" + col;
                  break;
                }
              }catch(_e){}
            }
          }catch(_e){}
        }


        // Normalizza
        const logs = [];
        const docKeys = new Set();
        const validIds = new Set();

        (rawLogs || []).forEach((i, idx)=>{
          const emailLower = (i.emailLower || "").toLowerCase();
          const monthKey = i.monthKey || "";
          const docKey = i.payrollDocId || i.docKey || (emailLower && monthKey ? `${emailLower}_${monthKey}` : "");
          if(docKey) docKeys.add(docKey);

          const sentAtDate =
            (i.sentAt?.toDate ? i.sentAt.toDate() :
            (i.sentAtClient ? new Date(i.sentAtClient) :
            (i.sentAtISO ? new Date(i.sentAtISO) : null)));

          const sentAtMs = (typeof i.sentAtClient === "number" && i.sentAtClient) ? i.sentAtClient :
            (sentAtDate instanceof Date ? sentAtDate.getTime() : (i.sentAtISO ? Date.parse(i.sentAtISO) : 0)) || 0;

          const stableId = String(
            i._reconstructed ? (`recon_${docKey||emailLower||"?"}_${monthKey||"?"}_${idx}`) :
            (i.id || i.eventKey || `${sentAtMs}_${emailLower||"?"}_${monthKey||"?"}_${docKey||"?"}`)
          );
          validIds.add(stableId);

          logs.push({
            id: stableId,
            sentAt: sentAtDate || null,
            sentAtClient: sentAtMs || null,
            sentAtISO: i.sentAtISO || (sentAtDate ? sentAtDate.toISOString() : ""),
            emailLower,
            monthKey,
            fullName: i.fullName || "",
            netPayText: i.netPayText || "",
            netPayCents: i.netPayCents || null,
            pagesCount: (typeof i.pagesCount === "number" ? i.pagesCount : (Array.isArray(i.pageIndices) ? i.pageIndices.length : 0)),
            readonly: !!i._reconstructed,
            docKey,
            payrollDocId: i.payrollDocId || "",
            downloadUrl: i.downloadUrl || "",
            storagePath: i.storagePath || "",
            sourceFileName: i.sourceFileName || i.fileName || "",
            fileName: i.fileName || i.sourceFileName || "",
            adminEmail: i.adminEmail || i.lastSentBy || "",
            status: i.status || ""
          });
        });

        // Ordina (preferisci client time se manca server time in fallback)
        logs.sort((a,b)=> (b.sentAtClient||0) - (a.sentAtClient||0));

        N.payroll.admin.sendLogs = logs;
        N.payroll.admin._sendLogSource = source;

        // Mantieni selezione valida
        const cleanedSelection = {};
        const currentSel = N.payroll.admin.sendLogSelection || {};
        Object.keys(currentSel).forEach(id=>{ if(validIds.has(id) && currentSel[id]) cleanedSelection[id] = true; });
        N.payroll.admin.sendLogSelection = cleanedSelection;

        // prefetch openedAt per payrollDocs (join via GET docId)
        const openedByDocKey = {};
        const keys = Array.from(docKeys).slice(0, 120);
        for(const k of keys){
          try{
            const found = await tryGetPayrollDocSnap(api, db, k);
            if(found?.snap && found.snap.exists()){
              const d = found.snap.data() || {};
              openedByDocKey[k] = { openedAt: d.openedAt || null };
            }
          }catch(_e){}
        }
        N.payroll.admin.openedByDocKey = openedByDocKey;

        // Meta UI
        const ro = String(source||"").startsWith("reconstruct") ? " · solo lettura" : "";
        const metaTxt = logs.length ? `Totale log: ${logs.length} (fonte: ${source})${ro}` : `Nessun log. (fonte: ${source})${ro}`;
        const metaA = U("payrollSendLogMeta");
        const metaB = U("sendLogCardMeta");
        if(metaA) metaA.textContent = metaTxt;
        if(metaB) metaB.textContent = metaTxt;

        renderPayrollSendLogs();
      }

      function sendLogSelectAll(){
        N.payroll.admin.sendLogSelection = N.payroll.admin.sendLogSelection || {};
        const logs = N.payroll?.admin?.sendLogs || [];
        logs.forEach(l=>{ if(l?.id) N.payroll.admin.sendLogSelection[l.id] = true; });
        renderPayrollSendLogs();
      }
      function sendLogClearSelection(){
        N.payroll.admin.sendLogSelection = {};
        renderPayrollSendLogs();
      }
      async function deleteSelectedSendLogs(){
        try{
          const source = String(N.payroll?.admin?._sendLogSource || "");
          if(source.startsWith("reconstruct")){
            try{ Ve("Storico invii", "Modalità sola lettura: i log sono stati ricostruiti dai documenti. Per eliminare, serve il log vero."); }catch(_e){}
            return;
          }
          const sel = N.payroll?.admin?.sendLogSelection || {};
          const ids = Object.keys(sel).filter(k=>sel[k]);
          if(!ids.length) return;

          // 1) Local storage (sempre)
          try{
            const key = "payroll_send_logs_local_v1";
            const arr = readLocalSendLogs() || [];
            const keep = (arr||[]).filter((e)=>{
              const em = (e.emailLower || e.email || "").toLowerCase();
              const mk = e.monthKey || "";
              const dk = e.payrollDocId || e.docKey || (em && mk ? `${em}_${mk}` : "");
              const sentKey = e.sentAtClient || (e.sentAtISO ? Date.parse(e.sentAtISO) : 0) || 0;
              const stable = String(e.id || e.eventKey || `${sentKey}_${em||"?"}_${mk||"?"}_${dk||"?"}`);
              return !ids.includes(stable);
            });
            localStorage.setItem(key, JSON.stringify(keep.slice(0, 200)));
          }catch(_e){}

          // 2) Fallback index doc (best-effort)
          if(N.firebase?.ok){
            try{
              const api = N.firebase.api, db = N.firebase.db;
              const ref = api.doc(db, "payrollSendLogIndex", "global");
              const snap = await api.getDoc(ref);
              if(snap?.exists()){
                const d = snap.data() || {};
                let logs = Array.isArray(d.logs) ? d.logs.slice() : [];
                logs = logs.filter((e)=>{
                  const em = (e.emailLower || e.email || "").toLowerCase();
                  const mk = e.monthKey || "";
                  const dk = e.payrollDocId || e.docKey || (em && mk ? `${em}_${mk}` : "");
                  const sentKey = e.sentAtClient || (e.sentAtISO ? Date.parse(e.sentAtISO) : 0) || 0;
                  const stable = String(e.id || e.eventKey || `${sentKey}_${em||"?"}_${mk||"?"}_${dk||"?"}`);
                  return !ids.includes(stable);
                });
                await api.setDoc(ref, { logs, updatedAt: api.serverTimestamp(), updatedAtClient: Date.now() }, { merge: true });
              }
            }catch(_e){}
          }

          // 3) Collection logs (se consentito)
          if(N.firebase?.ok && N.user?.isAdmin){
            const api = N.firebase.api, db = N.firebase.db;
            for(const id of ids){
              try{ await api.deleteDoc(api.doc(db, COL_PAYROLL_SEND_LOGS, id)); }catch(_e){}
            }
          }

          if(N.payroll?.admin) N.payroll.admin.sendLogSelection = {};
          await loadPayrollSendLogs();
          Ve("Eliminati","Log invii eliminati.");
        }catch(err){
          console.warn("delete send logs", err);
          Ve("Errore eliminazione", err?.message || String(err));
        }
      }



      async function deleteSelectedHistory(){
        if(!(N.firebase?.ok && N.user?.isAdmin)) return;
        const sel = N.payroll?.admin?.historySelection || {};
        const ids = Object.keys(sel).filter(id=>sel[id]);
        if(!ids.length) return;
        try{
          const api = N.firebase.api, db = N.firebase.db;
          // cancella solo lo storico (log) - non elimina i PDF già archiviati
          await Promise.all(ids.map(id => api.deleteDoc(api.doc(db, "payrollIngestLogs", id))));
          N.payroll.admin.historySelection = {};
          Ve("Storico aggiornato", `Eliminati ${ids.length} record.`);
          await loadUploadHistory();
        }catch(err){
          console.warn("history delete", err);
          Ve("Errore", err?.message || String(err));
        }
      }

      function historySelectAll(){
        const hist = N.payroll?.admin?.uploadHistory || [];
        const sel = N.payroll.admin.historySelection = N.payroll.admin.historySelection || {};
        hist.forEach(h=>{ if(h?.id) sel[h.id] = true; });
        renderUploadHistory();
      }
      function historyClearSelection(){
        N.payroll.admin.historySelection = {};
        renderUploadHistory();
      }

      async function loadPayrollSentCounts(){
        if(!(N.firebase?.ok)) return;
        if(!(N.user && N.user.isAdmin)) return;
        try{
          const api = N.firebase.api, db = N.firebase.db;
          const CAP = 8000;
          const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : ["payrollDocs","payrolls"]);
          const seen = {}; // emailLower -> Set(monthKey/docId)

          for(const col of cols){
            try{
              const q = api.query(api.collection(db, col), api.limit(CAP));
              const snap = await api.getDocs(q);
              snap?.forEach(doc=>{
                const d = doc.data() || {};
                const email = String(d.emailLower || "").toLowerCase();
                if(!email) return;
                const mk = String(d.monthKey || "").trim();
                if(!seen[email]) seen[email] = new Set();
                seen[email].add(mk || doc.id);
              });
            }catch(err){
              if(err?.code !== "permission-denied"){
                console.warn("sent counts load", err);
              }
            }
          }

          const counts = {};
          for(const email of Object.keys(seen)){
            counts[email] = seen[email].size;
          }

          N.payroll.admin.sentCounts = counts;
          try{ renderPayrollUserList && renderPayrollUserList(); }catch(_e){}
        }catch(err){
          if(err?.code !== "permission-denied") console.warn("sent counts load outer", err);
        }
      }




      function renderAbsenceAdminList(){
        const list = U("absenceAdminList");
        const count = U("absenceAdminCount");
        const hint = U("absenceAdminHint");
        const data = (state.absences && Array.isArray(state.absences.list)) ? state.absences.list : [];
        const filters = state.absences?.filters || { status:"", type:"", search:"" };
        const search = (filters.search || "").toLowerCase();
        const filtered = data.filter(item=>{
          const statusOk = !filters.status || (item.status||"").toLowerCase() === filters.status;
          const typeOk = !filters.type || (item.type||"").toLowerCase() === filters.type;
          const text = `${item.displayName||""} ${item.note||""}`.toLowerCase();
          const searchOk = !search || text.includes(search);
          return statusOk && typeOk && searchOk;
        });
        if(count) count.textContent = `${filtered.length} richieste`;
        if(list){
          list.innerHTML = filtered.length ? filtered.map(item=>{
            const badgeStatus = (item.status||"richiesta").toLowerCase();
            return `<div class="absenceItem">
              <div class="absenceMeta">
                <div class="pcTitle" style="font-size:15px;margin:0">${Ao(item.displayName||"Senza nome")}</div>
                <div class="pcSub">${Ao(item.date||"Data non indicata")} · ${Ao(item.time||"--:--")}</div>
                <div class="pcHint" style="margin-top:4px">${Ao(item.note||"Nessuna nota")}</div>
              </div>
              <div class="absenceBadges">
                <span class="absenceBadge">${Ao(item.type||"")}</span>
                <span class="absenceBadge">${Ao(badgeStatus)}</span>
              </div>
            </div>`;
          }).join("") : '<div class="pcHint">Nessuna richiesta da mostrare.</div>';
        }
        if(hint) hint.textContent = state.absences?.loading ? "Caricamento richieste…" : "";
      }

      async function loadAbsenceRequests(){
        if(!(state.firebase?.ok && state.user?.isAdmin)) return;
        state.absences = state.absences || { list:[], filters:{ status:"", type:"", search:"" }, loading:false };
        state.absences.loading = true;
        renderAbsenceAdminList();
        try{
          const api = state.firebase.api, db = state.firebase.db;
          const q = api.query(api.collection(db, COL_ABSENCE_REQUESTS), api.orderBy("createdAt","desc"), api.limit(200));
          const snap = await api.getDocs(q);
          const list = [];
          snap?.forEach(doc=>{
            const d = doc.data() || {};
            list.push({
              id: doc.id,
              type: (d.type||"").toLowerCase(),
              date: d.date || "",
              time: d.time || "",
              note: d.note || "",
              status: (d.status||"richiesta").toLowerCase(),
              displayName: d.displayName || d.email || "Utente",
              email: d.email || "",
              createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString("it-IT") : ""
            });
          });
          state.absences.list = list;
        }catch(err){
          const msg = String(err?.message || err || "").toLowerCase();
          if(err?.code === "permission-denied" || msg.includes("insufficient permissions") || msg.includes("missing or insufficient permissions")){
            // Regole Firestore: lettura non consentita → UI pulita
            state.absences.list = [];
          }else{
            console.warn("absence load", err);
            Ve("Assenze non caricate", err?.message || String(err));
          }
        }finally{
          state.absences.loading = false;
          renderAbsenceAdminList();
        }
      }

      async function submitAbsenceRequest(){
        const badge = U("absenceStatusBadge");
        const feedback = U("absenceFeedback");
        if(feedback) feedback.style.color = "var(--muted)";
        if(!(state.firebase?.ok)){
          feedback && (feedback.textContent = "Servizio non pronto.");
          return;
        }
        if(!state.user){
          feedback && (feedback.textContent = "Accedi per inviare la richiesta.");
          return;
        }
        const type = (U("absenceType")?.value || "").trim();
        const date = U("absenceDate")?.value || "";
        const time = U("absenceTime")?.value || "";
        const note = (U("absenceNote")?.value || "").trim();
        if(!(type && date && time)){
          feedback && (feedback.textContent = "Compila tipologia, data e ora.");
          badge && (badge.textContent = "Completa i campi");
          return;
        }
        const payload = {
          type,
          date,
          time,
          note,
          status: "richiesta",
          displayName: getDisplayNameFromUser(),
          email: state.user?.email || "",
          emailLower: (state.user?.email || "").toLowerCase(),
          uid: state.user?.uid || "",
          createdAt: state.firebase.api.serverTimestamp(),
          monthKey: date.slice(0,7)
        };
        try{
          await state.firebase.api.addDoc(state.firebase.api.collection(state.firebase.db, COL_ABSENCE_REQUESTS), payload);
          badge && (badge.textContent = "Richiesta inviata");
          feedback && (feedback.textContent = "L'admin riceverà subito il dettaglio.");
          U("absenceNote") && (U("absenceNote").value = "");
          if(state.user?.isAdmin) await loadAbsenceRequests();
        }catch(err){
          console.warn("absence submit", err);
          feedback && (feedback.textContent = err?.message || "Errore invio.");
          if(feedback) feedback.style.color = "var(--bad)";
          badge && (badge.textContent = "Errore");
        }
      }

      function updateGroupedRowField(key, field, value){
        const rows = N.payroll?.admin?.groupedRows || [];
        const row = rows.find(r=>r.key===key);
        if(!row) return;

        if(field==="monthKey"){
          row.monthKey = normalizeMonthKey(value) || String(value||"").trim();
          refreshGroupedValidation();
          return;
        }

        if(field==="email"){
          const wasMissing = (row.missingEmail != null) ? !!row.missingEmail : !isValidEmail(row.email);
          const next = normalizeEmail(value);
          row.email = next;

          // UX: quando la mail diventa valida (completa), seleziona subito la riga
          // (solo se prima era mancante/errata, così non sovrascriviamo una scelta manuale).
          if(wasMissing && isValidEmail(next) && !row.sent){
            row.enabled = true;
          }

          refreshGroupedValidation();
          return;
        }

        row[field] = value;
        refreshGroupedValidation();
      }

      async function startPayrollDirectoryWatch(){
        try{ N.payroll?.directory?.unsub && N.payroll.directory.unsub(); }catch(_e){}
        if(!(N.firebase?.ok)) return;
        const api = N.firebase.api;
        const db = N.firebase.db;
        const q = api.query(api.collection(db, COL_PAYROLL_DIRECTORY), api.where("enabled", "==", !0));
        N.payroll.directory.unsub = api.onSnapshot(q, snap=>{
          const entries = [];
          snap?.forEach(doc=>{ const d = doc.data(); d.id = doc.id; d.emailLower = (d.emailLower || d.email || d.id || "").toLowerCase(); entries.push(d); });
          entries.sort((a,b)=> (a.displayName||a.emailLower||"").localeCompare(b.displayName||b.emailLower||""));
          N.payroll.directory.entries = entries;
          N.payroll.directory.ready = true;
          N.payroll.directory.error = "";
          renderDirectoryUI();
          buildGroupedRows();
        }, err=>{
          if(err?.code !== "permission-denied") console.warn("payroll directory watch", err);
          N.payroll.directory.error = err?.message || String(err);
          N.payroll.directory.ready = false;
          renderDirectoryUI();
        });
      }

      async function zi() {
        if(!(N.firebase?.ok)) return;
        const api = N.firebase.api, db = N.firebase.db;
        try{ N.payroll.admin.loadingUsers = !0; }catch(_e){}
        try {
          const q = api.query(api.collection(db, COL_PAYROLL_DIRECTORY), api.where("enabled","==",!0));
          const snap = await api.getDocs(q);
          const entries = [];
          snap.forEach(doc => { 
            const d = doc.data() || {}; 
            d.id = doc.id; 
            d.emailLower = (d.emailLower || d.email || d.id || "").toLowerCase(); 
            entries.push(d); 
          });
          entries.sort((a,b)=> (a.displayName||a.emailLower||"").localeCompare(b.displayName||b.emailLower||""));
          N.payroll.directory = N.payroll.directory || {};
          N.payroll.directory.entries = entries;
          N.payroll.directory.ready = true;
          N.payroll.directory.error = "";
        } catch (e) {
          if(e?.code !== "permission-denied") console.warn("payroll directory fetch", e);
          try{
            N.payroll.directory = N.payroll.directory || {};
            N.payroll.directory.error = e?.message || String(e);
            N.payroll.directory.ready = false;
          }catch(_e){}
        }
        try{ N.payroll.admin.loadingUsers = !1; }catch(_e){}
        renderDirectoryUI();
        try{ buildGroupedRows(); }catch(_e){}
      }

      function setProgress(pct, label){
        const bar = U("payrollProgressFill");
        const lbl = U("payrollProgressLabel");
        const barExtract = U("payrollProgressFillExtract");
        const lblExtract = U("payrollProgressLabelExtract");
        const sp = U("payrollProgressSpinner");
        const spEx = U("payrollProgressSpinnerExtract");
        const p = Math.max(0, Math.min(100, Number(pct)||0));
        const active = p > 0 && p < 100;
        if(sp) sp.style.display = active ? "" : "none";
        if(spEx) spEx.style.display = active ? "" : "none";
        if(bar) bar.style.width = `${p}%`;
        if(barExtract){ barExtract.style.width = `${p}%`; barExtract.classList.toggle("active", p<100); }
        if(lbl && label) lbl.textContent = label;
        if(lblExtract && label) lblExtract.textContent = label;
      }

      async function Vi() {
        const e = N.payroll.admin, t = U("payrollIdleHint"), dbg = U("payrollGeminiDebug");
        if (!e.files || !e.files.length) return void(dbg && (dbg.textContent = "Seleziona un PDF per iniziare"));

        // Gate premium (sicurezza): evita bypass su incognito / device nuovi
        if(!ensurePayrollCanUpload({ toast:true, openBilling:true })){
          try{ setProgress(0, "Bloccato"); }catch(_e){}
          return;
        }

        const t0 = performance.now();
        setProgress(5, "Preparazione…");
        try {
          const t = e.files[0];
          e.sourceFileName = t.name || "documento.pdf";
          if (!t.type.includes("pdf")) return Ve("Formato non valido", "Carica un file PDF."), void(t0 && setProgress(0,"Errore formato"));
          e.gemini.loading = !0;
          Di("extracting");
          const n = await t.arrayBuffer();
          e.originalPdfBytes = n;
          const totalPages = await __payrollGetPDFLib().then(lib=>lib.PDFDocument.load(n)).then(pdf=>pdf.getPageCount()).catch(()=>0);
          e.gemini.totalPages = totalPages;
          try { const hash = await crypto.subtle.digest("SHA-256", n); e.sourceFileHash = Array.from(new Uint8Array(hash)).map(e => e.toString(16).padStart(2, "0")).join("") } catch (_t) { e.sourceFileHash = "" }
          const endpoint = (globalThis.__PAYROLL_EXTRACT_ENDPOINT__ || globalThis.PAYROLL_EXTRACT_ENDPOINT || PAYROLL_EXTRACT_ENDPOINT);
          const fmtMoney = (val)=>{ const t = Number(val); if (!Number.isFinite(t)) return ""; const n = Math.round(t); const o = (n / 100).toFixed(2).replace(".", ","); const [i, a] = o.split(","); const r = i.replace(/\\B(?=(\\d{3})+(?!\\d))/g, "."); return `${r},${a}` };
          const formData = new FormData;
          formData.append("file", new Blob([n], { type: "application/pdf" }), t.name || "documento.pdf");
          const uploadWithProgress = (fd)=> new Promise((resolve,reject)=>{
            const xhr = new XMLHttpRequest();
            xhr.open("POST", endpoint, !0);
            xhr.upload.onprogress = evt=>{
              if(evt && evt.lengthComputable){
                const p = Math.round((evt.loaded/evt.total)*100);
                setProgress(Math.round(p*0.6), "Caricamento…");
              }else{ setProgress(25, "Caricamento…"); }
            };
            xhr.onreadystatechange = ()=>{ if(xhr.readyState===4){ if(xhr.status>=200 && xhr.status<300){ resolve(xhr.responseText); }else{ reject(new Error(`HTTP ${xhr.status}`)); } } };
            xhr.onerror = ()=>reject(new Error("Upload fallito"));
            xhr.send(fd);
          });
          setProgress(8, "Preparo PDF…");
          const raw = await uploadWithProgress(formData);
          setProgress(70, "Analisi in corso…");
          let c;
          try{ c = JSON.parse(raw); }catch(_e){ throw new Error("Risposta non valida dal servizio di estrazione"); }
          setProgress(100, "Analisi completata");
          dbg && (dbg.textContent = `Estrazione HTTP 200 · ${Math.round(performance.now() - t0)}ms`);
          const d = Array.isArray(c.documents) ? c.documents : [];
          const normalizePageList = (val)=>{ if(Array.isArray(val)) return val; if(typeof val==="number" && Number.isFinite(val)) return [val]; if(typeof val==="string"){ const parts = val.split(/[,;\\s]+/).map(v=>Number(v)).filter(v=>Number.isFinite(v)); if(parts.length) return parts; } return []; };
          const toZeroBasedPages = (arr)=>{ const unique = Array.from(new Set((arr||[]).map(v=>Number(v)).filter(v=>Number.isFinite(v)).map(v=>Math.round(v)))); if(!unique.length) return []; const hasZero = unique.some(v=>v===0); const min = Math.min(...unique); const max = Math.max(...unique); const assumeOneBased = !hasZero && min>=1 && (!e.gemini.totalPages || max<=e.gemini.totalPages); return Array.from(new Set(unique.map(v=>assumeOneBased ? v-1 : v))).filter(v=>v>=0).sort((a,b)=>a-b); };
          const docs = [];
          const pagesFlat = [];
          const fileMonthKey = normalizeMonthKey(e.sourceFileName);
          for (let iDoc = 0; iDoc < d.length; iDoc++) {
            const t = d[iDoc] || {};
            const rawText = String(t.rawText || t.text || "").trim();
            const fullName = String(t.fullName || "").trim();
            const fiscalCode = String(t.fiscalCode || t.codiceFiscale || t.taxCode || "").replace(/\\s+/g,"").toUpperCase();
            const monthRaw = t.documentDate || t.monthKey || t.document_date || t.date || t.month || t.period || t.payPeriod || t.pay_period || "";
            const monthKey = normalizeMonthKey(monthRaw)
              || normalizeMonthKey(t.fields?.documentDate || t.fields?.monthKey || t.fields?.document_date || "")
              || fileMonthKey
              || normalizeMonthKey(rawText);
            const netPayCents = t.netPayCents ?? null;
            let netPayText = String(t.netPayText || "").trim();
            netPayText || null==netPayCents || (netPayText = fmtMoney(netPayCents));
            const pageIndicesRaw = normalizePageList(t.pageNos || t.pageIndices || t.pages || t.pageIndex);
            let pageIndices = toZeroBasedPages(pageIndicesRaw);
            if(!pageIndices.length && Number.isFinite(t.pageIndex)) pageIndices = toZeroBasedPages([t.pageIndex]);
            if(!pageIndices.length) pageIndices = [iDoc];
            const doc = {
              docIndex: iDoc,
              rawText,
              confidence: t.confidence ?? null,
              fields: { fullName, monthKey, fiscalCode, netPayText, netPayCents },
              fullName,
              fiscalCode,
              documentDate: monthKey,
              netPayText,
              netPayCents,
              pageIndices,
              pageNosOriginal: pageIndicesRaw
            };
            docs.push(doc);
            pageIndices.forEach(pi=>{
              pagesFlat.push({ pageIndex: pi, rawText, confidence: doc.confidence, fields: { fullName, monthKey, fiscalCode, netPayText, netPayCents }, sourceDocIndex: iDoc });
            });
          }
          e.gemini.docs = docs;
          e.gemini.pages = pagesFlat;
          t && (t.textContent = `PREVIEW (${pagesFlat.length})`), dbg && (dbg.textContent = `Estrazione OK · pagine ${pagesFlat.length} · ${Math.round(performance.now() - t0)}ms`), setProgress(100, "Analisi completata"), buildGroupedRows(), Ii(), Pi(), (N.payroll?.admin && (N.payroll.admin.lastUploadStep="preview")), Di("match")
        } catch (t) {
          e.gemini.error = t?.message || String(t), dbg && (dbg.textContent = `Estrazione ERRORE · ${Math.round(performance.now() - t0)}ms\\n${e.gemini.error}`), console.warn("payroll extract error", t), Ve("Estrazione fallita", e.gemini.error), setProgress(0, "Errore"), Di("idle")
        } finally {
          e.gemini.loading = !1
        }
      }

      async function Gi(setStep=true) {
        const e = N.payroll.admin, t = e.gemini.pages || [];
        if (!t.length) return void Ve("Nessuna pagina", "Esegui prima l’estrazione.");
        await zi();
        buildGroupedRows();
        Pi();
        if(setStep) Di("match");
      }

      
      const nextFrame = ()=> new Promise(res=> requestAnimationFrame(()=>res()));

      const withTimeout = (promise, ms, msg="Operazione troppo lenta")=> Promise.race([
        promise,
        new Promise((_, rej)=> setTimeout(()=> rej(new Error(msg)), ms))
      ]);


      function initPayrollSendUI(allRows, selectedRows){
        stopPayrollSendDocWatches();
        const all = Array.isArray(allRows) ? allRows : [];
        const sel = Array.isArray(selectedRows) ? selectedRows : [];
        const selKeys = new Set(sel.map(r=>{
          try{
            const email = normalizeEmail(r?.emailLower || r?.email || r?.id || "");
            return r?.key || `${email}_${r?.monthKey || ""}`;
          }catch(_e){ return r?.key || ""; }
        }).filter(Boolean));

        const ui = N.payroll.admin.sendUI = {
          total: sel.length,
          done: 0,
          items: [],
          byKey: {},
          selectedKeys: selKeys,
          deliveryUnsubs: {},
          mailUnsubs: {},
          finalStatus: ""
        };

        ui.items = all.map(r=>{
          const email = normalizeEmail(r?.emailLower || r?.email || r?.id || "");
          const key = r?.key || `${email}_${r?.monthKey || ""}`;
          const selected = selKeys.has(key);
          const item = { key, name: r?.displayName || r?.fullName || email || "—", email, selected, status: selected ? "queue" : "skip", detail: "", mailStatus: "idle", mailDetail: "", row: r };
          ui.byKey[key] = item;
          return item;
        });

        const title = U("payrollSendTitle"); 
        if(title) title.textContent = "Invio in corso…";
        const doneBtn = U("btnPayrollSendDone"); 
        if(doneBtn) doneBtn.style.display = "none";
        const histBtn = U("btnPayrollSendGoHistory"); 
        if(histBtn) histBtn.style.display = "none";

        setPayrollSendProgress(0, ui.total, "0%");
        renderPayrollSendList();
        updatePayrollSendMatchSummary();
        const sendSearch = U("payrollSendSearch");
        if(sendSearch) sendSearch.value = "";
        N.payroll.admin.sendFilters = { search:"", view:"pending" };
      }

      function stopPayrollSendDocWatches(){
        try{
          const ui = N.payroll?.admin?.sendUI;
          const m = ui?.deliveryUnsubs || {};
          Object.keys(m).forEach(k=>{ try{ m[k] && m[k](); }catch(_e){} });

          const mm = ui?.mailUnsubs || {};
          Object.keys(mm).forEach(k=>{ try{ mm[k] && mm[k](); }catch(_e){} });

          if(ui){ ui.deliveryUnsubs = {}; ui.mailUnsubs = {}; }
        }catch(_e){}
      }

      function watchPayrollDocDelivery(sendKey, docId){
        try{
          if(!(N.firebase?.ok) || !docId) return;
          const ui = N.payroll?.admin?.sendUI;
          if(!ui) return;

          ui.deliveryUnsubs = ui.deliveryUnsubs || {};
          if(ui.deliveryUnsubs[sendKey]) return;

          const api = N.firebase.api;
          const db = N.firebase.db;
          const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : [COL_PAYROLL_DOCS, COL_PAYROLL_DOCS_LEGACY].filter(Boolean));

          let done = false;
          const unsubs = [];
          let timer = null;
          const cleanup = ()=>{
            if(done) return;
            done = true;
            try{ timer && clearTimeout(timer); }catch(_e){}
            try{ unsubs.forEach(fn=>{ try{ fn && fn(); }catch(_e){} }); }catch(_e){}
            try{ delete ui.deliveryUnsubs[sendKey]; }catch(_e){}
          };

          // fallback: se non posso leggere lo stato, non blocco l’invio
          timer = setTimeout(()=>{
            if(done) return;
            try{ setPayrollSendRowStatus(sendKey, "ok", "scritto"); }catch(_e){}
            cleanup();
          }, 8000);

          for(const col of cols){
            try{
              const ref = api.doc(db, col, docId);
              const unsub = api.onSnapshot(ref, snap=>{
                if(done) return;
                if(snap.exists()){
                  try{ clearTimeout(timer); }catch(_e){}
                  setPayrollSendRowStatus(sendKey, "live", "arrivato");
                  cleanup();
                }
              }, err=>{
                if(done) return;
                try{ clearTimeout(timer); }catch(_e){}
                if(err?.code === "permission-denied"){
                  try{ setPayrollSendRowStatus(sendKey, "ok", "scritto"); }catch(_e){}
                }else{
                  try{ setPayrollSendRowStatus(sendKey, "ok", "stato non disponibile"); }catch(_e){}
                }
                cleanup();
              });
              unsubs.push(unsub);
            }catch(_e){}
          }

          ui.deliveryUnsubs[sendKey] = cleanup;
        }catch(_e){}
      }

      function watchPayrollMailDelivery(sendKey, mailDocId){
        try{
          if(!(N.firebase?.ok) || !mailDocId) return;
          const ui = N.payroll?.admin?.sendUI;
          if(!ui) return;

          ui.mailUnsubs = ui.mailUnsubs || {};
          if(ui.mailUnsubs[sendKey]) return;

          const api = N.firebase.api;
          const db = N.firebase.db;

          let done = false;
          let unsub = null;

          const cleanup = ()=>{
            if(done) return;
            done = true;
            try{ delete ui.mailUnsubs[sendKey]; }catch(_e){}
          };

          const timer = setTimeout(()=>{
            try{ setPayrollSendRowMailStatus(sendKey, "queue", "stato non disponibile"); }catch(_e){}
            try{ unsub && unsub(); }catch(_e){}
            cleanup();
          }, 60000);

          const ref = api.doc(db, COL_EMAIL, mailDocId);
          unsub = api.onSnapshot(ref, snap=>{
            if(done) return;
            if(!snap.exists()) return;
            const d = snap.data() || {};
            const st = String(d?.delivery?.state || "").toUpperCase();

            if(!st){
              setPayrollSendRowMailStatus(sendKey, "queue", "in coda");
              return;
            }
            if(st === "PROCESSING"){
              setPayrollSendRowMailStatus(sendKey, "run", "in invio");
              return;
            }
            if(st === "SUCCESS"){
              setPayrollSendRowMailStatus(sendKey, "ok", "andata a buon fine");
              try{ clearTimeout(timer); }catch(_e){}
              try{ unsub && unsub(); }catch(_e){}
              cleanup();
              return;
            }
            if(st === "ERROR"){
              const err = (d?.delivery?.error || "errore");
              setPayrollSendRowMailStatus(sendKey, "err", err);
              try{ clearTimeout(timer); }catch(_e){}
              try{ unsub && unsub(); }catch(_e){}
              cleanup();
              return;
            }
          }, err=>{
            console.warn("watchPayrollMailDelivery watch", err);
            if(err?.code === "permission-denied"){
              try{ setPayrollSendRowMailStatus(sendKey, "queue", "stato non disponibile"); }catch(_e){}
            }else{
              try{ setPayrollSendRowMailStatus(sendKey, "err", err?.message || String(err)); }catch(_e){}
            }
            try{ clearTimeout(timer); }catch(_e){}
            try{ unsub && unsub(); }catch(_e){}
            cleanup();
          });

          ui.mailUnsubs[sendKey] = ()=>{ try{ clearTimeout(timer); }catch(_e){}; try{ unsub && unsub(); }catch(_e){}; cleanup(); };
        }catch(_e){}
      }

      function updatePayrollSendMatchSummary(){
        const ui = N.payroll?.admin?.sendUI;
        const el = U("payrollSendSummary");
        if(!ui || !el) return;
        const items = ui.items || [];
        const selItems = items.filter(it=>it && it.selected);
        const total = ui.total || selItems.length || 0;

        const sentTotal = items.filter(it=>it && it.row && it.row.sent).length;
        const sentBefore = items.filter(it=>it && it.row && it.row.sent && !it.selected).length;

        const delivered = selItems.filter(it=>it.status==="live" || it.status==="ok").length;
        const run = selItems.filter(it=>it.status==="run").length;
        const err = selItems.filter(it=>it.status==="err").length;
        const queued = selItems.filter(it=>it.status==="queue").length;

        const mailOk = selItems.filter(it=>it.mailStatus==="ok").length;
        const mailRun = selItems.filter(it=>it.mailStatus==="run" || it.mailStatus==="processing").length;
        const mailErr = selItems.filter(it=>it.mailStatus==="err").length;
        const mailQueued = selItems.filter(it=>it.mailStatus==="queue" || it.mailStatus==="pending").length;

        const head = ui.finalStatus ? `Esito: ${ui.finalStatus} · ` : "";
        let msg = `${head}Invio: ${(ui.done||0)}/${total}`;
        if(sentBefore){
          const sentLabel = sentTotal===1 ? "Inviata" : "Inviate";
          const totLabel = sentTotal===1 ? "totale" : "totali";
          msg += ` · ${sentLabel}: ${sentTotal} ${totLabel}`;
        }
        if(run) msg += ` · In invio: ${run}`;
        if(queued) msg += ` · In coda: ${queued}`;
        if(delivered) msg += ` · Completati: ${delivered}`;
        if(err) msg += ` · Errori: ${err}`;

        if(mailOk || mailRun || mailErr || mailQueued){
          msg += ` · Mail: ${mailOk} ok`;
          if(mailRun) msg += `, ${mailRun} in invio`;
          if(mailQueued) msg += `, ${mailQueued} in coda`;
          if(mailErr) msg += `, ${mailErr} errori`;
        }

        el.textContent = msg;
      }

      function setPayrollSendProgress(done, total, label){
        const ui = N.payroll?.admin?.sendUI;
        if(ui){ ui.done = done; ui.total = total; }
        const pct = total ? Math.round((done / total) * 100) : 0;
        const fill = U("payrollSendProgressFill"); 
        if(fill) fill.style.width = pct + "%";
        const lab = U("payrollSendProgressLabel"); 
        if(lab) lab.textContent = label || (pct + "%");
        const counter = U("payrollSendCounter"); 
        if(counter) counter.textContent = `${done}/${total}`;
        updatePayrollSendMatchSummary();
      }

      function setPayrollSendRowStatus(key, status, detail){
        const ui = N.payroll?.admin?.sendUI;
        if(!ui) return;
        const item = ui.byKey?.[key];
        if(item){
          item.status = status;
          item.detail = detail || "";
        }
        renderPayrollSendList();
        updatePayrollSendMatchSummary();
      }

      function setPayrollSendRowMailStatus(key, status, detail){
        const ui = N.payroll?.admin?.sendUI;
        if(!ui) return;
        const item = ui.byKey?.[key];
        if(item){
          item.mailStatus = status;
          item.mailDetail = detail || "";
        }
        renderPayrollSendList();
        updatePayrollSendMatchSummary();
      }


      function updatePayrollSendSentToggleUI(){
        const btn = U("btnPayrollSendToggleSent");
        if(!btn) return;

        const ui = N.payroll?.admin?.sendUI;
        const items = ui?.items || [];

        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        N.payroll.admin.sendFilters = N.payroll.admin.sendFilters || { search:"", view:"pending" };

        const view = (N.payroll.admin.sendFilters.view || "pending");
        const showingSent = view === "sent";

        const sentCount = items.filter(it=>it && it.row && it.row.sent).length;

        if(sentCount <= 0){
          btn.disabled = true;
          btn.textContent = "Vedi inviate";
          btn.setAttribute("aria-pressed","false");
          N.payroll.admin.sendFilters.view = "pending";
          return;
        }

        btn.disabled = false;
        btn.setAttribute("aria-pressed", showingSent ? "true" : "false");
        btn.textContent = showingSent ? "Vedi da inviare" : `Vedi inviate (${sentCount})`;
      }

      function renderPayrollSendList(){
        const body = U("payrollSendTableBody");
        const ui = N.payroll?.admin?.sendUI;
        if(!body || !ui) return;

        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        N.payroll.admin.sendFilters = N.payroll.admin.sendFilters || { search:"", view:"pending" };

        const filters = N.payroll.admin.sendFilters;
        const search = (filters.search || "").trim().toLowerCase();
        const view = (filters.view || "pending");
        const showSent = view === "sent";
        const items = ui.items || [];

        // Vista invio: per default mostro SOLO le righe ancora da inviare (selezionate + non inviate).
        // Con toggle: mostro SOLO le righe già inviate.
        const visible = items.filter(it=>{
          if(!it) return false;
          const row = it.row || {};
          const isSent = !!row.sent;

          // Default: mostra SOLO le righe selezionate e non ancora inviate.
          // Toggle: mostra TUTTE le righe già inviate (anche da invii precedenti).
          if(showSent){
            if(!isSent) return false;
          }else{
            if(!it.selected) return false;
            if(isSent) return false;
          }

          const text = [it.name, it.email, row.displayName, row.fiscalCode].join(" ").toLowerCase();
          return !search || text.includes(search);
        });

        const html = visible.map(it=>{
          const row = it.row || {};
          const pagesRaw = (row.pageNos || row.pages || []);
          const pages = pagesRaw.map(p=>{
            if(typeof p === "number") return p;
            if(p && typeof p.pageIndex === "number") return p.pageIndex + 1;
            if(p && typeof p.pageNo === "number") return p.pageNo;
            return null;
          }).filter(v=>v!=null);
          const pagesCount = pages.length;
          const pagesLabel = pagesCount ? (pagesCount===1 ? "1 pagina" : `${pagesCount} pagine`) : "—";
          const cf = row.fiscalCode || "";
          const amount = row.amountText || row.netPayText || "";
          const missingDocs = !((row.pageNos?.length||row.pages?.length||0));
          const missingEmail = row.missingEmail ?? !isValidEmail(row.email || it.email);
          const missingMonth = row.missingMonth ?? !row.monthKey;
          const issueClass = missingEmail ? "badEmail" : (row.conflict ? "conflict" : ((missingMonth || missingDocs) ? "warn" : ""));

          const selected = !!it.selected;
          const checked = selected || !!row.sent;
          const spinning = selected && (it.status === "queue" || it.status === "run");
          const hasErr = selected && (it.status === "err" || it.mailStatus === "err");
          const spinner = spinning
            ? '<span class="rowSpinner" aria-hidden="true"></span>'
            : (hasErr ? '<span class="rowSpinnerErr" aria-hidden="true">!</span>' : '<span class="rowSpinner placeholder" aria-hidden="true"></span>');

          return `
            <tr class="${issueClass}" data-payroll-send-row="${Ao(it.key)}">
              <td class="flagCell">
                <input class="rowFlag" type="checkbox" ${checked ? "checked":""} disabled aria-label="${row && row.sent ? "Riga già inviata" : (selected ? "Riga selezionata per invio" : "Riga non selezionata")}">
              </td>
              <td class="nameCell" title="${Ao(it.name||"")}">${Ao(it.name||"—")}</td>
              <td class="cfCell" title="Codice fiscale">${Ao(cf||"—")}</td>
              <td class="amountCell">${Ao(amount||"—")}</td>
              <td class="emailCell">
                <input class="emailInput ${missingEmail?"invalid":""}" value="${Ao(it.email||"")}" placeholder="nome@azienda.it" inputmode="email" autocomplete="off" readonly aria-readonly="true">
              </td>
              <td class="pagesCell" title="Apri PDF">
                <div class="sendRowTail">${spinner}<button type="button" class="pageLink" data-payroll-open-pages="${Ao(row.key || it.key)}">${Ao(pagesLabel)}</button></div>
              </td>
            </tr>
          `;
        }).join("");

              if(html){
          body.innerHTML = html;
        }else{
          const totalSelected = items.filter(it=>it && it.selected).length;
          const pending = items.filter(it=>it && it.selected && !(it.row && it.row.sent)).length;
          const allCompleted = totalSelected > 0 && pending === 0;

          if(allCompleted){
            const allRowsNow = (N.payroll?.admin?.groupedRows || []);
            const remainingRows = allRowsNow.filter(r=>!r.sent);
            const remainingCount = remainingRows.length;

            if(remainingCount === 0){
              body.innerHTML = `
                <tr>
                  <td colspan="6" style="padding:18px 14px;text-align:center">
                    <div class="pcTitle" style="font-size:16px;margin:0;color:#0b5d2a">✅ Tutte le buste paga sono state inviate correttamente.</div>
                    <div class="pcSub" style="margin-top:6px;color:rgba(15,23,42,.62)">Grazie per aver usato iLovePaghe.</div>
                  </td>
                </tr>
              `;
            }else{
              const missingEmailCount = remainingRows.filter(r=>!isValidEmail(r?.email)).length;
              const plural = (remainingCount === 1) ? "1 busta paga" : `${remainingCount} buste paga`;
              const extra = missingEmailCount ? ` (email mancanti/errate: ${missingEmailCount})` : "";
              body.innerHTML = `
                <tr>
                  <td colspan="6" style="padding:18px 14px;text-align:center">
                    <div class="pcTitle" style="font-size:16px;margin:0;color:rgba(12,16,26,.92)">Invio completato</div>
                    <div class="pcSub" style="margin-top:6px;color:rgba(15,23,42,.62)">Restano ${plural} da inviare${extra}. Torna indietro per inviare le buste paga residue.</div>
                  </td>
                </tr>
              `;
            }
          }else{
            body.innerHTML = '<tr><td colspan="6" class="muted" style="padding:14px">Nessuna riga.</td></tr>';
          }
        }

        const remainingSelected = items.filter(it=>it.selected && !(it.row && it.row.sent)).length;
        const remainingMissingEmail = items.filter(it=>!(it.row && it.row.sent) && !isValidEmail(it.row?.email || it.email)).length;

        const selectedTotalEl = U("payrollSendSelectedTotal");
        const missingEmailTotalEl = U("payrollSendMissingEmailTotal");
        if(selectedTotalEl) selectedTotalEl.textContent = String(remainingSelected);
        if(missingEmailTotalEl) missingEmailTotalEl.textContent = String(remainingMissingEmail);

        try{ updatePayrollSendSentToggleUI(); }catch(_e){}
      }

      function buildPayrollEmailDoc({ toEmail, fullName, monthKey, netPayText, downloadUrl, fileName, payrollDocId, storagePath }){
        const monthLabel = formatPayrollMonthLabel(monthKey);
        const who = String(fullName || "").trim() || String(toEmail || "").trim() || "—";
        const amount = (netPayText && String(netPayText).trim()) ? String(netPayText).trim() : "";
        const subj = `Busta paga ${monthLabel} · Documento in allegato`;

        const text = `Ciao ${who},\n\nin allegato trovi la tua busta paga relativa a ${monthLabel}${amount ? " ("+amount+")" : ""}.\n\nPer qualsiasi dubbio, contatta l’ufficio amministrazione.`;
        const html = `<p>Ciao ${Ao(who)},</p><p>in allegato trovi la tua busta paga relativa a <b>${Ao(monthLabel)}</b>${amount ? " (<b>"+Ao(amount)+"</b>)" : ""}.</p><p style="margin-top:14px;color:#6b7280">Per qualsiasi dubbio, contatta l’ufficio amministrazione.</p>`;

        const url = String(downloadUrl || "").trim();
        const attachments = url ? [{ filename: fileName || "busta_paga.pdf", path: url, contentType: "application/pdf" }] : [];

        return {
          to: [String(toEmail || "").trim()].filter(Boolean),
          message: {
            subject: subj,
            text,
            html,
            attachments
          },
          payroll: {
            payrollDocId: payrollDocId || "",
            storagePath: storagePath || "",
            monthKey: monthKey || "",
            emailLower: String(toEmail || "").trim().toLowerCase()
          },
          createdAt: N.firebase?.api?.serverTimestamp ? N.firebase.api.serverTimestamp() : null
        };
      }



      // === INVIO SENZA ARCHIVIAZIONE (NO Storage) ===
      function buildPayrollMailContent({ toEmail, fullName, monthKey, netPayText }){
        const monthLabel = formatPayrollMonthLabel(monthKey);
        const who = String(fullName || "").trim() || String(toEmail || "").trim() || "—";
        const amount = (netPayText && String(netPayText).trim()) ? String(netPayText).trim() : "";
        const subject = `Busta paga ${monthLabel} · Documento in allegato`;
        const text = `Ciao ${who},\n\nin allegato trovi la tua busta paga relativa a ${monthLabel}${amount ? " ("+amount+")" : ""}.\n\nPer qualsiasi dubbio, contatta l’ufficio amministrazione.`;
        const html = `<p>Ciao ${Ao(who)},</p><p>in allegato trovi la tua busta paga relativa a <b>${Ao(monthLabel)}</b>${amount ? " (<b>"+Ao(amount)+"</b>)" : ""}.</p><p style="margin-top:14px;color:#6b7280">Per qualsiasi dubbio, contatta l’ufficio amministrazione.</p>`;
        return { subject, text, html };
      }

      async function sendPayrollPdfViaEndpoint({ toEmail, fullName, monthKey, netPayText, pdfBytes, fileName }){
        const endpoint = String(globalThis.PAYROLL_MAIL_ENDPOINT || "").trim();
        if(!endpoint) throw new Error("PAYROLL_MAIL_ENDPOINT non configurato (serve un endpoint mail su Cloud Run/Fn).");

        const email = String(toEmail || "").trim().toLowerCase();
        if(!isValidEmail(email)) throw new Error("Email destinatario non valida.");

        const { subject, text, html } = buildPayrollMailContent({ toEmail: email, fullName, monthKey, netPayText });

        const safeName = fileName || "busta_paga.pdf";
        const fd = new FormData();
        fd.append("to", email);
        fd.append("subject", subject);
        fd.append("text", text);
        fd.append("html", html);
        fd.append("filename", safeName);
        fd.append("pdf", new Blob([pdfBytes], { type:"application/pdf" }), safeName);

        const headers = {};
        // Richiede utente loggato (niente accesso anonimo): serve un token per chiamare il mailer.
        const u = N.firebase?.auth?.currentUser;
        if(!u || u.isAnonymous) throw new Error("Accesso richiesto: accedi con Google per inviare le buste paga.");
        let tok = "";
        try{ tok = await u.getIdToken(); }catch(_e){}
        if(tok) headers["Authorization"] = "Bearer " + tok;
        else throw new Error("Impossibile ottenere il token di accesso. Accedi di nuovo e riprova.");

        // App Check token (anti-abuso)
        try{
          const ac = N.firebase?.appCheck;
          const acApi = N.firebase?.appCheckApi;
          if(ac && acApi && typeof acApi.getToken === "function"){
            const resp = await acApi.getToken(ac, /* forceRefresh= */ false);
            if(resp && resp.token) headers["X-Firebase-AppCheck"] = resp.token;
          }
        }catch(err){
          console.warn("appcheck token", err);
        }

        const res = await fetch(endpoint, { method:"POST", body: fd, headers });
        let bodyText = "";
        if(!res.ok){
          try{ bodyText = await res.text(); }catch(_e){}
          throw new Error(bodyText || (`HTTP ${res.status}`));
        }
        let j = null;
        try{ j = await res.json(); }catch(_e){}
        if(j && j.ok === false) throw new Error(j.error || "Invio non riuscito");
        return j || { ok:true };
      }


function markPayrollRowSent(row, reason=""){
        try{
          if(!row) return;
          row.sent = true;
          row.sentReason = reason || row.sentReason || "";
          row.sentAtClient = Date.now();
          row.enabled = false;

          // Aggiorna subito la UI (così la riga sparisce appena inviata)
          try{ renderPayrollSendList(); }catch(_e){}
          try{ updatePayrollSendSentToggleUI(); }catch(_e){}
          try{ updateSentToggleUI(); }catch(_e){}
        }catch(_e){}
      }

async function Yi() {
        const e = N.payroll.admin;
        const __dedupByFile = new Set();
        const allRows = (e.groupedRows || []);
        const rows = allRows.filter(r=>r.enabled!==false && !r.sent);
        try{ e.filters = e.filters || (N.payroll.admin.filters = (N.payroll.admin.filters || { search:"", showIssues:false, showSent:false })); N.payroll.admin.filters.showSent = false; }catch(_e){}
        if (!rows.length) return void Ve("Nessun dato", "Esegui l’estrazione e abilita almeno una riga.");
        const invalid = rows.filter(r=>r.missingEmail || r.missingMonth || r.conflict);
        if (invalid.length) return void Ve("Completa i dati", "Email valida e data/mese obbligatoria per le righe attive.");
        if (!e.originalPdfBytes) return Ve("PDF mancante", "Riestrai l’estrazione."), void Di("preview");

        // Switch (menu laterale): salva le email inserite in payrollDirectory per i prossimi invii
        // Default: ON (a meno che l'utente lo disattivi esplicitamente).
        const saveEmailsForNext = (N.payroll?.admin?.saveEmailsForNext !== false);

        // Auto-salvataggio dipendenti (payrollDirectory) — usato sia in modalità privacy che in modalità con Storage.
        const _dirKnown = new Set(((N.payroll?.directory?.entries) || [])
          .map(d=>normalizeEmail(d.emailLower||d.email||d.id||""))
          .filter(Boolean));
        let __dirSaveWarned = false;
        const _ensureDir = async (row, emailLower) => {
          if(!saveEmailsForNext) return;
          try{
            const em = normalizeEmail(emailLower || row?.email || "");
            if(!em || !isValidEmail(em)) return;

            // Sempre: salva in cache locale (fallback su questo dispositivo)
            try{ payrollCacheEmailForNext(row, em); }catch(_e){}

            // Server: salva in payrollDirectory (Firebase) per ricordare l'email ai prossimi accessi
            if(!(N.firebase?.ok && N.user)) return;
            if(_dirKnown.has(em)) return;

            const name = String(row?.displayName || "").trim() || String(row?.fiscalCode || "").trim() || em;
            const parts = name.split(/\s+/).filter(Boolean);
            const firstName = parts[0] || "";
            const lastName = parts.slice(1).join(" ");
            const _fc = normalizeFiscalCode(row?.fiscalCode || "");
            const fiscalCode = (_fc && _fc.length===16) ? _fc : "";
            const payload = {
              emailLower: em,
              fiscalCode,
              firstName,
              lastName,
              displayName: name,
              fullNameNorm: normalizeNameStrict(name || fiscalCode || em),
              enabled: true,
              updatedAt: N.firebase.api.serverTimestamp(),
              updatedBy: N.user?.email || "",
              id: em
            };
            await N.firebase.api.setDoc(N.firebase.api.doc(N.firebase.db, COL_PAYROLL_DIRECTORY, em), payload, { merge:true });
            _dirKnown.add(em);
          }catch(err){
            console.warn("auto directory save", err);
            // fallback già salvato in locale sopra
            try{
              if(!__dirSaveWarned){
                __dirSaveWarned = true;
                const low = String(err?.message || "").toLowerCase();
                const body = (err?.code === "permission-denied" || low.includes("permission"))
                  ? "Permessi insufficienti: email salvata solo su questo dispositivo."
                  : "Impossibile salvare in Dipendenti: email salvata solo su questo dispositivo.";
                try{ showToast("Salvataggio email", body, 4200); }catch(_e){}
              }
            }catch(_e){}
          }
        };

        // Accesso: il portale usa accesso ospite (anonimo) automatico.
        // Non chiediamo login Google all’utente finale.
        // (Il backend verifica comunque un token Firebase, generato dalla sessione anonima.)
// === Modalità privacy (NO Storage): invio diretto senza archiviazione ===
        if(typeof PAYROLL_PERSIST_UPLOADS !== "undefined" && !PAYROLL_PERSIST_UPLOADS){
          Di("sending");
          initPayrollSendUI(allRows, rows);
          const summary = { matched: rows.length, ambiguous: rows.filter(r=>r.conflict).length, unmatched: 0, status: "ok" };
          try{
            let done = 0; const total = rows.length;
            for(const row of rows){
              const emailLower = (row.email || "").toLowerCase();
              const baseId = `${emailLower}_${row.monthKey}`;
              const sendKey = row.key || baseId;

              const __srcName = String(e.sourceFileName || "").trim();
              const __dupKey = __srcName ? `${emailLower}__${__srcName.toLowerCase()}` : "";
              if(__dupKey && __dedupByFile.has(__dupKey)){
                setPayrollSendRowStatus(sendKey, "ok", "duplicato (stesso file)");
                setPayrollSendRowMailStatus(sendKey, "ok", "skip");
                try{ markPayrollRowSent(row, "duplicato"); }catch(_e){}
                try{ await _ensureDir(row, emailLower); }catch(_e){}
                done++;
                setPayrollSendProgress(done, total);
                await nextFrame();
                continue;
              }
              if(__dupKey) __dedupByFile.add(__dupKey);

              setPayrollSendRowStatus(sendKey, "run");
              setPayrollSendRowMailStatus(sendKey, "run", "preparo PDF");
              setPayrollSendProgress(done, total, `Invio ${done+1}/${total}`);
              await nextFrame();

              const pageIndices = (row.pages || []).map(p=>p.pageIndex);
              if(!pageIndices.length){
                summary.status = summary.status === "ok" ? "Errori su alcune righe" : summary.status;
                setPayrollSendRowStatus(sendKey, "err", "pagine mancanti");
                setPayrollSendRowMailStatus(sendKey, "err", "pagine mancanti");
                try{ await _ensureDir(row, emailLower); }catch(_e){}
                done++;
                setPayrollSendProgress(done, total);
                await nextFrame();
                continue;
              }

              try{
                const pdfBytes = await xi(e.originalPdfBytes, pageIndices);
                const fnameBase = `${row.displayName || row.fiscalCode || emailLower} ${row.monthKey}`.trim();
                const attachmentName = buildSafePdfName(fnameBase);

                setPayrollSendRowMailStatus(sendKey, "run", "invio…");
                await sendPayrollPdfViaEndpoint({
                  toEmail: emailLower,
                  fullName: row.displayName || row.fiscalCode || "",
                  monthKey: row.monthKey,
                  netPayText: row.netPayText || "",
                  pdfBytes,
                  fileName: attachmentName
                });
                setPayrollSendRowMailStatus(sendKey, "ok", "inviata");
                setPayrollSendRowStatus(sendKey, "live", "inviato");
                try{ markPayrollRowSent(row, "ok"); }catch(_e){}
              }catch(err){
                summary.status = summary.status === "ok" ? "Errori su alcune righe" : summary.status;
                setPayrollSendRowMailStatus(sendKey, "err", err?.message || String(err));
                setPayrollSendRowStatus(sendKey, "err", "errore invio");
              }

              // Se attivo, salva l'email in payrollDirectory per il prossimo invio (best-effort)
              try{ await _ensureDir(row, emailLower); }catch(_e){}

              done++;
              setPayrollSendProgress(done, total);
              await nextFrame();
            }

            if(summary.status === "ok") Ve("Inviato", "Buste paga inviate (senza archiviazione).");
            else Ve("Invio completato", summary.status);
          }catch(err){
            console.warn("payroll send transient error", err);
            summary.status = err?.message || String(err);
            Ve("Errore invio", summary.status);
          }

          // Trial: dopo il primo invio riuscito, segna la prova gratuita come usata
          try{
            const sentAny = rows.some(r=>r && r.sent);
            if(sentAny) await markPayrollTrialUsed("send_privacy");
          }catch(_e){}

          e.sendSummary = summary;
          const ui = N.payroll?.admin?.sendUI;
          if(ui) ui.finalStatus = summary.status || "—";
          updatePayrollSendMatchSummary();
          const title = U("payrollSendTitle");
          if(title) title.textContent = summary.status === "ok" ? "Invio completato" : "Invio terminato";
          const doneBtn = U("btnPayrollSendDone");
          if(doneBtn) doneBtn.style.display = "";
          const histBtn = U("btnPayrollSendGoHistory");
          if(histBtn) histBtn.style.display = "";
          try{ setPayrollSendProgress(N.payroll?.admin?.sendUI?.done || rows.length, rows.length); }catch(_e){}
          try{ loadPayrollSentCounts(); }catch(_e){}
          try{ Pi(); }catch(_e){}
          return;
        }

        Di("sending");
        initPayrollSendUI(allRows, rows);

        // Auto-salvataggio dipendenti (payrollDirectory): controllato da switch nel menu laterale
        // (usa _ensureDir definita sopra)

        const summary = { matched: rows.length, ambiguous: rows.filter(r=>r.conflict).length, unmatched: 0, status: "ok" };
        try {
          let done = 0; const total = rows.length;
          for (const row of rows) {
            const o = N.firebase.api, i = N.firebase.db, emailLower = (row.email || "").toLowerCase(), baseId = `${emailLower}_${row.monthKey}`, sendKey = row.key || baseId;
            const __srcName = String(e.sourceFileName || "").trim();
            const __dupKey = __srcName ? `${emailLower}__${__srcName.toLowerCase()}` : "";
            if(__dupKey && __dedupByFile.has(__dupKey)){
              setPayrollSendRowStatus(sendKey, "ok", "duplicato (stesso file)");
              setPayrollSendRowMailStatus(sendKey, "ok", "skip");
              try{ markPayrollRowSent(row, "duplicato"); }catch(_e){}
              try{ await _ensureDir(row, emailLower); }catch(_e){}
              done++;
              setPayrollSendProgress(done, total);
              await nextFrame();
              continue;
            }
            if(__dupKey) __dedupByFile.add(__dupKey);

            setPayrollSendRowStatus(sendKey, "run");
            setPayrollSendRowMailStatus(sendKey, "idle");
            setPayrollSendProgress(done, total, `Inviando ${done+1}/${total}`);
            await nextFrame();
            let s = null;
            let sCol = null;
            try{
              const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : ["payrollDocs","payrolls"]);
              for(const col of cols){
                try{
                  const q = o.query(o.collection(i,col), o.where("emailLower","==",emailLower), o.where("monthKey","==",row.monthKey), o.limit(1));
                  const snap = await o.getDocs(q);
                  const d0 = snap.docs?.[0] || null;
                  if(d0){ s = d0; sCol = col; break; }
                }catch(_e){}
              }
            }catch(_err){}

            const existingData = s?.data ? s.data() : (s && typeof s.get === "function" ? s.data() : null);
            const existingId = s?.id || baseId;
            const __srcName2 = String(e.sourceFileName || "").trim();
            const __alreadySameFile = !!(existingData && __srcName2 && String(existingData.sourceFileName || "") === __srcName2);
            if(__alreadySameFile){
              setPayrollSendRowStatus(sendKey, "ok", "già inviato (stesso file)");
              setPayrollSendRowMailStatus(sendKey, "ok", "skip");
              try{ markPayrollRowSent(row, "gia_inviato"); }catch(_e){}
              try{ await _ensureDir(row, emailLower); }catch(_e){}
              done++;
              setPayrollSendProgress(done, total);
              await nextFrame();
              continue;
            }

            const sameHash = existingData && existingData.sourceFileHash === e.sourceFileHash;
            const samePages = existingData && Array.isArray(existingData.pageIndices) && Array.isArray(row.pages) && existingData.pageIndices.join(",") === row.pages.map(p=>p.pageIndex).join(",");
            let docId = existingId;
            let uploaded = { path: existingData?.storagePath || `payroll/${row.monthKey}/${existingId}.pdf`, url: existingData?.downloadUrl };
            const pageIndices = (row.pages || []).map(p=>p.pageIndex);
            if(!pageIndices.length){
              summary.status = summary.status === "ok" ? "Errori su alcune righe" : summary.status;
              setPayrollSendRowStatus(sendKey, "err", "pagine mancanti");
              done++;
              setPayrollSendProgress(done, total);
              Ve("Errore invio","Nessuna pagina associata a una riga. Riesegui l'estrazione.");
              await nextFrame();
              continue;
            }
            if (!sameHash || !samePages) {
              docId = `${baseId}_${Date.now()}`;
              const nBytes = await xi(e.originalPdfBytes, pageIndices);
              uploaded = await $i(docId, row.monthKey, nBytes, docId);
            }
            await withTimeout(ki({
              docId,
              emailLower,
              uid: (N.user && N.user.emailLower===emailLower ? N.user.uid : ""),
              fullName: row.displayName || row.fiscalCode || "",
              fiscalCode: row.fiscalCode || "",
              monthKey: row.monthKey,
              netPayCents: row.netPayCents,
              netPayText: row.netPayText,
              storagePath: uploaded.path,
              downloadUrl: uploaded.url || existingData?.downloadUrl || "",
              source: "gemini",
              sourceFileName: e.sourceFileName,
              sourceFileHash: e.sourceFileHash,
              pageIndices,
              matchScore: row.matchScore || 0,
              adminEmail: N.user?.email || "",
              adminUid: N.user?.uid || "",
              adminName: N.user?.displayName || ""
            }
            ), 60000, "Timeout invio");
            try{
              await upsertPayrollIndex({
                emailLower,
                monthKey: row.monthKey,
                docId,
                netPayText: row.netPayText || "",
                netPayCents: (typeof row.netPayCents === "number" ? row.netPayCents : (row.netPayCents ?? null)),
                downloadUrl: uploaded.url || existingData?.downloadUrl || "",
                fileName: e.sourceFileName || "",
                pagesCount: (pageIndices||[]).length,
                adminEmail: N.user?.email || "",
                adminUid: N.user?.uid || ""
              });
            }catch(_e){}

            try{
              await logPayrollSendEvent({
                docKey: `${emailLower}_${row.monthKey}`,
                payrollDocId: docId,
                emailLower,
                fullName: row.displayName || row.fiscalCode || "",
                fiscalCode: row.fiscalCode || "",
                monthKey: row.monthKey,
                pagesCount: (pageIndices||[]).length,
                pageIndices: pageIndices || [],
                netPayText: row.netPayText || "",
                netPayCents: row.netPayCents ?? null,
                downloadUrl: uploaded.url || existingData?.downloadUrl || "",
                storagePath: uploaded.path || existingData?.storagePath || "",
                sourceFileName: e.sourceFileName || "",
                sourceFileHash: e.sourceFileHash || "",
                adminUid: N.user?.uid || "",
                adminEmail: N.user?.email || "",
                adminName: N.user?.displayName || ""
              });
            }catch(_e){}

            await _ensureDir(row, emailLower);

            // Invio email con PDF allegato (Trigger Email extension)
            try{
              const dl = (uploaded.url || existingData?.downloadUrl || "").trim();
              if(!dl) throw new Error("downloadUrl mancante");
              const fnameBase = `${row.displayName || row.fiscalCode || emailLower} ${row.monthKey}`.trim();
              const attachmentName = buildSafePdfName(fnameBase);
              const mailDocId = `payrollMail_${docId}_${Date.now()}`;
              const mailDoc = buildPayrollEmailDoc({
                toEmail: emailLower,
                fullName: row.displayName || row.fiscalCode || "",
                monthKey: row.monthKey,
                netPayText: row.netPayText || "",
                downloadUrl: dl,
                fileName: attachmentName,
                payrollDocId: docId,
                storagePath: uploaded.path || existingData?.storagePath || ""
              });

              setPayrollSendRowMailStatus(sendKey, "queue", "in coda");
              await withTimeout(
                N.firebase.api.setDoc(N.firebase.api.doc(N.firebase.db, COL_EMAIL, mailDocId), mailDoc, { merge: false }),
                20000,
                "Timeout invio mail"
              );
              watchPayrollMailDelivery(sendKey, mailDocId);
              try{ markPayrollRowSent(row, "ok"); }catch(_e){}
            }catch(err){
              console.warn("payroll email enqueue", err);
              setPayrollSendRowMailStatus(sendKey, "err", err?.message || String(err));
            }


            done++;
            setPayrollSendRowStatus(sendKey, "ok", "scritto");
            watchPayrollDocDelivery(sendKey, docId);
            setPayrollSendProgress(done, total);
            await nextFrame();
          }
          // Trial: dopo il primo invio riuscito, segna la prova gratuita come usata
          try{
            const sentAny = rows.some(r=>r && r.sent);
            if(sentAny) await markPayrollTrialUsed("send");
          }catch(_e){}
          await (async function(payload) {
            try {
              const t = N.firebase.api, n = N.firebase.db, o = t.collection(n, "payrollIngestLogs");
              await t.addDoc(o, payload)
            } catch (_e) {}
          })({
            createdAt: N.firebase.api.serverTimestamp(),
            adminUid: N.user?.uid || "",
            sourceFileName: e.sourceFileName,
            sourceFileHash: e.sourceFileHash,
            totalPages: e.gemini.pages?.length || 0,
            matchedCount: summary.matched,
            ambiguousCount: summary.ambiguous,
            unmatchedCount: summary.unmatched,
            status: summary.status || "ok",
            details: rows
          });
          if(summary.status === "ok"){
            Ve("Inviato", "Buste paga inviate.");
          } else {
            Ve("Invio completato", summary.status);
          }
          await Fi();
          await loadUploadHistory()
        } catch (err) {
          console.warn("payroll send error", err), summary.status = err?.message || String(err), Ve("Errore invio", summary.status)
        }
        e.sendSummary = summary;
        const ui = N.payroll?.admin?.sendUI;
        if(ui) ui.finalStatus = summary.status || "—";
        updatePayrollSendMatchSummary();
        const title = U("payrollSendTitle");
        if(title) title.textContent = summary.status === "ok" ? "Invio completato" : "Invio terminato";
        const doneBtn = U("btnPayrollSendDone");
        if(doneBtn) doneBtn.style.display = "";
        const histBtn = U("btnPayrollSendGoHistory");
        if(histBtn) histBtn.style.display = "";
        try{ setPayrollSendProgress(N.payroll?.admin?.sendUI?.done || 0, rows.length); }catch(_e){}
        loadPayrollSentCounts();
      }

      async function openAdminModalFlow(targetPane, opts){
        if(!N.user || N.user.isAnonymous){
          try{ goToAuth("Accedi per continuare."); }catch(_e){}
          return;
        }

        const options = opts || {};

        // Se richiesto, forza sempre la tab "Carica" prima di aprire la modale
        try{
          if(options.forceUpload){
            try{ N.payroll = N.payroll || {}; N.payroll.admin = N.payroll.admin || {}; N.payroll.admin.lastUploadStep = "idle"; }catch(_e){}
            try{ Di("idle"); }catch(_e){}
          }
        }catch(_e){}

        // Apri subito la modale (zero attese)
        toggleAdminModal(true, targetPane || "adminArea");

        // Se richiesto, apri subito il selettore file (serve gesto utente)
        if(options.autoUpload){
          // Gate premium
          if(!ensurePayrollCanUpload({ toast:true, openBilling:true })) return;
          try{
            const input = U("payrollFileInput");
            if(input){
              input.value = ""; // consenti di ricaricare lo stesso file
              input.click();
            }
          }catch(_e){}
        }

        // Carica dati admin in background (non blocca la UX)
        try{ zi(); }catch(_e){}
      }


      // Nuovo percorso upload:
      // 1) click su "carica buste paga" => apre SUBITO il selettore file (senza modale intermedia)
      // 2) dopo la selezione: apre la modale e parte analisi + risultati
      function openPayrollUploadPicker(){
        // Gate login + Premium (1 invio gratuito)
        if(!ensurePayrollCanUpload({ toast:true, openBilling:true })) return;

        // reset (così ogni upload riparte pulito)
        try{ ji(); }catch(_e){}

        // Apri subito il selettore file (gesto utente)
        try{
          const input = U("payrollFileInput");
          if(input){
            input.value = ""; // consenti di ricaricare lo stesso file
            input.click();
          }else{
            Ve("Caricamento", "Input file non disponibile.");
          }
        }catch(err){
          console.warn("openPayrollUploadPicker", err);
          try{ Ve("Caricamento", "Impossibile aprire il selettore file."); }catch(_e){}
        }
      }


      
      // Dipendenti (vista admin) — lista utenti + storico invii + modifica dati
      function ensureEmployeesState(){
        N.payroll = N.payroll || {};
        N.payroll.employees = N.payroll.employees || {};
        const st = N.payroll.employees;
        st.ui = st.ui || { search:"", sort:"last", showDisabled:true, view:"list" };
        if(!st.ui.view) st.ui.view = "list";
        st.selectedEmail = st.selectedEmail || "";
        return st;
      }

      async function loadPayrollDirectoryAllEmployees(){
        if(!(N.firebase?.ok && N.user?.isAdmin)) return [];
        const api = N.firebase.api, db = N.firebase.db;
        const out = [];
        const snap = await api.getDocs(api.collection(db, COL_PAYROLL_DIRECTORY));
        snap?.forEach(docSnap=>{
          const x = docSnap.data() || {};
          const emailLower = normalizeEmail(x.emailLower || docSnap.id || x.email || "");
          if(!emailLower) return;
          out.push({
            id: docSnap.id,
            emailLower,
            displayName: x.displayName || x.fullName || "",
            firstName: x.firstName || "",
            lastName: x.lastName || "",
            fiscalCode: x.fiscalCode || "",
            enabled: x.enabled !== false,
            createdAt: x.createdAt || null,
            updatedAt: x.updatedAt || null
          });
        });
        N.payroll.directory = N.payroll.directory || {};
        N.payroll.directory.allEntries = out;
        return out;
      }

      function _fmtIt(ts){
        try{
          if(!ts) return "";
          if(ts.toDate) return ts.toDate().toLocaleString("it-IT");
          if(ts instanceof Date) return ts.toLocaleString("it-IT");
          if(typeof ts === "number") return new Date(ts).toLocaleString("it-IT");
        }catch(_e){}
        return "";
      }

      function renderEmployeesModal(){
        const st = ensureEmployeesState();
        const listEl = U("empList");
        const detailEl = U("empDetail");
        const metaEl = U("sendLogModalMeta");
        if(!listEl || !detailEl) return;

        // keep UI controls in sync
        const searchEl = U("empSearch");
        const sortEl = U("empSort");
        const showEl = U("empShowDisabled");
        if(searchEl && searchEl.value !== String(st.ui.search||"")) searchEl.value = String(st.ui.search||"");
        if(sortEl && sortEl.value !== String(st.ui.sort||"last")) sortEl.value = String(st.ui.sort||"last");
        if(showEl) showEl.checked = !!st.ui.showDisabled;

        const entriesRaw = (N.payroll?.directory?.allEntries || []).slice();
        const logs = (N.payroll?.admin?.sendLogs || []).slice();
        const openedByDocKey = N.payroll?.admin?.openedByDocKey || {};

        // Group logs by emailLower
        const logsByEmail = {};
        logs.forEach(l=>{
          const em = String(l.emailLower || "").toLowerCase();
          if(!em) return;
          (logsByEmail[em] = logsByEmail[em] || []).push(l);
        });

        // Include emails that appear in logs but aren't in directory (best-effort)
        const knownEmails = new Set(entriesRaw.map(e=>String(e.emailLower||"").toLowerCase()).filter(Boolean));
        Object.keys(logsByEmail).forEach(em=>{
          if(knownEmails.has(em)) return;
          const first = logsByEmail[em]?.[0] || {};
          entriesRaw.push({
            id: em,
            emailLower: em,
            displayName: first.fullName || "",
            firstName: "",
            lastName: "",
            fiscalCode: first.fiscalCode || "",
            enabled: false,
            _ghost: true
          });
        });

        const search = String(st.ui.search || "").toLowerCase().trim();
        const showDisabled = !!st.ui.showDisabled;
        const sort = String(st.ui.sort || "last");

        const withStats = entriesRaw.map(e=>{
          const em = String(e.emailLower||"").toLowerCase();
          const arr = logsByEmail[em] || [];
          const last = arr.length ? (arr[0].sentAtClient || 0) : 0;
          return {
            ...e,
            _sentCount: arr.length,
            _lastSentAt: last
          };
        });

        let filtered = withStats.filter(e=>{
          if(!showDisabled && e.enabled === false) return false;
          if(!search) return true;
          const hay = `${e.displayName||""} ${e.emailLower||""} ${e.fiscalCode||""}`.toLowerCase();
          return hay.includes(search);
        });

        filtered.sort((a,b)=>{
          if(sort==="name"){
            return String(a.displayName||a.emailLower||"").localeCompare(String(b.displayName||b.emailLower||""), "it", { sensitivity:"base" });
          }
          if(sort==="email"){
            return String(a.emailLower||"").localeCompare(String(b.emailLower||""), "it", { sensitivity:"base" });
          }
          if(sort==="count"){
            return (b._sentCount||0) - (a._sentCount||0);
          }
          // last
          return (b._lastSentAt||0) - (a._lastSentAt||0);
        });

        if(metaEl){
          metaEl.textContent = `Utenti: ${filtered.length} · Log: ${logs.length}`;
        }

        if(!filtered.length){
          listEl.innerHTML = '<div class="pcHint">Nessun dipendente trovato.</div>';
          detailEl.innerHTML = '<div class="pcHint">Seleziona un dipendente a sinistra.</div>';
          return;
        }

        // Auto-select first if none selected
        if(!st.selectedEmail || !filtered.find(e=>e.emailLower === st.selectedEmail)){
          st.selectedEmail = filtered[0].emailLower;
        }

        listEl.innerHTML = filtered.map(e=>{
          const active = e.emailLower === st.selectedEmail;
          const name = e.displayName || e.emailLower || "—";
          const badge = e.enabled === false ? "Disabilitato" : "Abilitato";
          const badgeCls = e.enabled === false ? "" : "ok";
          const lastTxt = e._lastSentAt ? _fmtIt(e._lastSentAt) : "—";
          const ghostPill = e._ghost ? '<span class="pillTone">Ghost</span>' : '';
          const sentCount = (e._sentCount||0);

          return `
            <button type="button" class="empUserItem ${active ? "active" : ""}" data-emp-select="${Ao(e.emailLower)}">
              <div class="empUserTop">
                <div class="empUserName">${Ao(name)}</div>
                <div class="empUserPills">
                  ${ghostPill}
                  <span class="pillTone ${badgeCls}">${badge}</span>
                </div>
              </div>
              <div class="empUserSub">${Ao(e.emailLower||"")}</div>
              <div class="empUserMeta">${Ao(sentCount)} invii · Ultimo: ${Ao(lastTxt)}</div>
            </button>
          `;
        }).join("");

        // Render detail
        const selected = filtered.find(e=>e.emailLower === st.selectedEmail) || filtered[0];
        const selEmail = selected.emailLower;
        const selLogs = (logsByEmail[String(selEmail||"").toLowerCase()] || []).slice();

        const enabled = selected.enabled !== false;
        const statusPill = enabled ? '<span class="pillTone ok">Abilitato</span>' : '<span class="pillTone">Disabilitato</span>';
        const ghostNote = selected._ghost ? '<div class="pcHint">Questo indirizzo compare nei log, ma non esiste in payrollDirectory (anagrafica).</div>' : '';

        const logsHtml = selLogs.length ? selLogs.map((l,i)=>{
          const opened = openedByDocKey[l.docKey] || {};
          const openedAt = opened.openedAt || null;
          let isOpened = false;
          try{
            const s = l.sentAt?.toDate ? l.sentAt.toDate().getTime() : (l.sentAt instanceof Date ? l.sentAt.getTime() : 0);
            const o = openedAt?.toDate ? openedAt.toDate().getTime() : (openedAt instanceof Date ? openedAt.getTime() : 0);
            if(o && s) isOpened = o >= s;
            else if(o && !s) isOpened = true;
          }catch(_e){}
          const openedLabel = isOpened ? "Aperto" : "Non aperto";
          const openedCls = isOpened ? "ok" : "";
          const status = String(l.status || "inviato");
          const fileRef = l.sourceFileName || l.fileName || l.payrollDocId || l.docKey || "—";
          const logKey = String(l.eventKey || `${l.docKey||""}_${l.sentAtISO||l.sentAtClient||i}` || i);
          try{ st.logMap = st.logMap || {}; st.logMap[logKey] = l; }catch(_e){}

          const when = _fmtIt(l.sentAt) || _fmtIt(l.sentAtClient) || "—";
          const url = l.downloadUrl || "";
          return `
            <div class="empLogRow">
              <div class="empLogMain">
                <div class="empLogTop">
                  <div class="empLogTitle">${Ao(l.monthKey||"—")}</div>
                  <div class="empLogPills">
                    <span class="pillTone ${openedCls}">${openedLabel}</span>
                    <span class="pillTone">${Ao(status)}</span>
                  </div>
                </div>
                <div class="empLogSub">${Ao(when)} · ${Ao(fileRef)}${l.netPayText ? " · " + Ao(l.netPayText) : ""}</div>
              </div>
              <div class="empLogActions">
                <button class="empMiniBtn" type="button"
                  data-emp-preview="1"
                  data-emp-url="${Ao(url)}"
                  data-emp-dockey="${Ao(l.docKey||"")}"
                  data-emp-docid="${Ao(l.payrollDocId||"")}"
                  data-emp-fn="${Ao((l.sourceFileName||l.fileName||"busta_paga.pdf"))}"
                  >Anteprima</button>
                <button class="empMiniBtn" type="button"
                  data-emp-open="1"
                  data-emp-url="${Ao(url)}"
                  data-emp-dockey="${Ao(l.docKey||"")}"
                  data-emp-docid="${Ao(l.payrollDocId||"")}"
                  >Apri</button>
                <button class="empMiniBtn" type="button"
                  data-emp-resend="1"
                  data-emp-logkey="${Ao(logKey)}"
                  >Reinvia</button>
              </div>
            </div>
          `;
        }).join("") : '<div class="pcHint">Nessun invio trovato.</div>';


        detailEl.innerHTML = `
          <div class="pcHead" style="padding:0; margin-bottom:10px">
            <div style="min-width:0">
              <div class="pcTitle" style="margin:0">${Ao(selected.displayName || selected.emailLower || "Dipendente")}</div>
              <div class="pcSub">${Ao(selected.emailLower||"")}</div>
            </div>
            <div class="pcPills">${statusPill}</div>
          </div>

          ${ghostNote}

          <div class="row2" style="margin-top:10px">
            <div class="field">
              <div class="pcSub">Nome</div>
              <input id="empEditName" type="text" value="${Ao(selected.displayName||"")}" placeholder="Nome e cognome" />
            </div>
            <div class="field">
              <div class="pcSub">Email</div>
              <input id="empEditEmail" type="email" value="${Ao(selected.emailLower||"")}" placeholder="email@dominio.it" />
            </div>
          </div>

          <div class="row2" style="margin-top:10px">
            <div class="field">
              <div class="pcSub">Codice Fiscale (opzionale)</div>
              <input id="empEditCf" type="text" value="${Ao(selected.fiscalCode||"")}" placeholder="CF" />
            </div>
            <div class="field">
              <div class="pcSub">Stato</div>
              <label class="toggleSwitch" style="justify-content:flex-start; gap:10px">
                <input id="empEditEnabled" type="checkbox" ${enabled ? "checked" : ""} />
                <span>${enabled ? "Abilitato" : "Disabilitato"}</span>
              </label>
            </div>
          </div>

          <div class="pcPills" style="margin-top:12px; justify-content:flex-end">
            <button class="pillBtn" id="btnEmpSave" type="button">Salva</button>
          </div>

          <div class="empSectionBar">
            <div class="empSectionTitle">Storico invii</div>
            <div class="empSectionMeta">${Ao(selLogs.length||0)} log</div>
          </div>

          <div class="empLogList">${logsHtml}</div>
        `;
      
        // Single-column view: lista -> dettaglio
        try{
          const modal = document.getElementById("sendLogModal");
          const view = String(st.ui?.view || "list");
          const finalView = (view === "detail" && st.selectedEmail) ? "detail" : "list";
          if(modal) modal.classList.toggle("empDetailMode", finalView === "detail");
          st.ui.view = finalView;
        }catch(_e){}

      }

      async function saveSelectedEmployeeEdits(){
        try{
          try{ showBootSpinner(true); }catch(_e){}
          if(!(N.firebase?.ok && N.user?.isAdmin)) { Ve("Solo admin", "Funzione riservata."); return; }
          const st = ensureEmployeesState();
          const oldEmail = String(st.selectedEmail || "").toLowerCase();
          const name = String(U("empEditName")?.value || "").trim();
          const newEmail = normalizeEmail(U("empEditEmail")?.value || "");
          const cf = (typeof normalizeFiscalCode==="function") ? normalizeFiscalCode(U("empEditCf")?.value || "") : String(U("empEditCf")?.value || "").trim();
          const enabled = !!U("empEditEnabled")?.checked;

          if(!newEmail){ Ve("Email non valida", "Inserisci una email valida."); return; }

          const api = N.firebase.api, db = N.firebase.db;

          const parts = name.split(/\s+/).filter(Boolean);
          const firstName = parts.length ? parts[0] : "";
          const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

          const payload = {
            emailLower: newEmail,
            displayName: name,
            firstName,
            lastName,
            fiscalCode: cf,
            enabled,
            updatedAt: api.serverTimestamp(),
            updatedBy: (N.user?.email || "").toLowerCase()
          };

          await api.setDoc(api.doc(db, COL_PAYROLL_DIRECTORY, newEmail), payload, { merge:true });

          if(oldEmail && oldEmail !== newEmail){
            try{ await api.deleteDoc(api.doc(db, COL_PAYROLL_DIRECTORY, oldEmail)); }catch(_e){}
          }

          // refresh watch (match usa solo enabled==true)
          try{ await zi(); }catch(_e){}
          await loadPayrollDirectoryAllEmployees();

          st.selectedEmail = newEmail;
          renderEmployeesModal();
          try{ Ve("Salvato", "Dipendente aggiornato."); }catch(_e){}
          try{ showBootSpinner(false); }catch(_e){}
        }catch(err){
          try{ showBootSpinner(false); }catch(_e){}
          console.warn("saveSelectedEmployeeEdits", err);
          try{ Ve("Errore", "Impossibile salvare il dipendente."); }catch(_e){}
        }
      }

      async function resolvePayrollDocUrl({ directUrl, docKey, docId } = {}){
        let url = directUrl || "";
        let fileName = "busta_paga.pdf";
        if(url) return { url, fileName };
        if(!(N.firebase?.ok)) return { url:"", fileName };
        const api = N.firebase.api, db = N.firebase.db;
        const tryKey = docKey || docId || "";
        if(!tryKey) return { url:"", fileName };
        try{
          const found = await tryGetPayrollDocSnap(api, db, tryKey);
          const snap = found?.snap;
          if(snap?.exists()){
            const x = snap.data() || {};
            url = x.downloadUrl || "";
            fileName = x.fileName || x.sourceFileName || fileName;
          }
        }catch(_e){}
        return { url, fileName };
      }

      async function openEmployeePdf({ directUrl, docKey, docId, title, sub } = {}){
        const r = await resolvePayrollDocUrl({ directUrl, docKey, docId });
        if(!r.url){ Ve("PDF non disponibile", "Non trovo un link al PDF per questo log."); return; }
        showPdfPreview({ title: title || "Busta paga", sub: sub || "—", srcUrl: r.url, fileName: r.fileName });
      }

      async function resendEmployeePayrollFromLogKey(logKey){
        try{
          if(!(N.firebase?.ok && N.user?.isAdmin)) { try{ Ve("Solo admin", "Funzione riservata."); }catch(_e){}; return; }
          const st = ensureEmployeesState();
          const key = String(logKey || "");
          const log = (st.logMap || {})[key] || null;
          if(!log){ try{ Ve("Log non trovato", "Ricarica la lista e riprova."); }catch(_e){}; return; }

          st.resendLocks = st.resendLocks || {};
          if(st.resendLocks[key]) return;
          st.resendLocks[key] = true;

          try{ showBootSpinner(true); }catch(_e){}

          const api = N.firebase.api, db = N.firebase.db;

          const emailLower = normalizeEmail(log.emailLower || log.email || log.toEmail || "");
          const monthKey = normalizeMonthKey(log.monthKey || log.month || "");
          const docKey = String(log.docKey || (emailLower && monthKey ? `${emailLower}_${monthKey}` : ""));
          const docId = String(log.payrollDocId || log.docId || "");

          if(!emailLower){ try{ Ve("Email mancante", "Impossibile reinviare senza email."); }catch(_e){}; return; }

          const fullName = String(log.fullName || log.displayName || log.name || log.fiscalCode || "");
          const netPayText = String(log.netPayText || "");
          const storagePath = String(log.storagePath || "");

          const resolved = await resolvePayrollDocUrl({ directUrl: log.downloadUrl || "", docKey, docId });
          const dl = String(resolved.url || log.downloadUrl || "").trim();
          if(!dl){ try{ Ve("PDF non disponibile", "Non trovo un link al PDF per questo log."); }catch(_e){}; return; }

          const srcName = String(log.sourceFileName || log.fileName || "").trim();
          const fnameBase = String((srcName || `${fullName || emailLower} ${monthKey}` || "busta_paga")).replace(/\.pdf$/i,"").trim();
          const attachmentName = (typeof buildSafePdfName==="function") ? buildSafePdfName(fnameBase) : (fnameBase + ".pdf");

          const mailDoc = buildPayrollEmailDoc({
            toEmail: emailLower,
            fullName: fullName,
            monthKey: monthKey,
            netPayText: netPayText,
            downloadUrl: dl,
            fileName: attachmentName,
            payrollDocId: docId || docKey || "",
            storagePath: storagePath || ""
          });

          // Anti doppio invio: stesso utente + stesso nome file (stabile) => un solo reinvio possibile
          const stableBase = String(`${emailLower}__${srcName.toLowerCase()}__${monthKey}`).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0, 140);
          const mailDocId = `payrollResend_${stableBase || String(key).replace(/[^a-zA-Z0-9_-]/g,"_").slice(0, 140)}`;

          const ref = api.doc(db, COL_EMAIL, mailDocId);
          let snap = null;
          try{ snap = await api.getDoc(ref); }catch(_e){}
          if(snap && snap.exists && snap.exists()){
            try{ Ve("Bloccato", "Questa busta paga risulta già reinviata (stesso nome file)."); }catch(_e){}
            return;
          }

          await api.setDoc(ref, {
            ...mailDoc,
            createdAt: api.serverTimestamp(),
            createdAtClient: Date.now(),
            _payrollResend: {
              originalEventKey: log.eventKey || "",
              docKey: docKey || "",
              payrollDocId: docId || "",
              sourceFileName: srcName,
              monthKey,
              emailLower
            }
          });

          try{
            await logPayrollSendEvent({
              action: "resend",
              originalEventKey: log.eventKey || "",
              docKey: docKey || "",
              emailLower,
              monthKey,
              payrollDocId: docId || "",
              netPayText,
              downloadUrl: dl,
              fileName: srcName || attachmentName,
              sourceFileName: srcName || "",
              storagePath: storagePath || "",
              note: "resend_from_employees"
            });
          }catch(_e){}

          try{ Ve("Reinviato", "Mail reinviata (in coda)."); }catch(_e){}
          try{ await loadPayrollSendLogs(); }catch(_e){}
          try{ renderEmployeesModal(); }catch(_e){}
        }catch(err){
          console.warn("resendEmployeePayrollFromLogKey", err);
          try{ Ve("Errore", "Impossibile reinviare la mail."); }catch(_e){}
        }finally{
          try{ showBootSpinner(false); }catch(_e){}
          try{
            const st = ensureEmployeesState();
            const key = String(logKey || "");
            if(st && st.resendLocks) delete st.resendLocks[key];
          }catch(_e){}
        }
      }


      async function reloadEmployeesModal(){
        try{
          await loadPayrollDirectoryAllEmployees();
        }catch(err){
          console.warn("loadPayrollDirectoryAllEmployees", err);
        }
        try{
          await loadPayrollSendLogs();
        }catch(_e){}
        renderEmployeesModal();
      }


      async function openSendLogModal(){
        if(!N.user?.isAdmin) return;
        toggleSendLogModal(true);
        await reloadEmployeesModal();
      }

      const bindPayrollBtn=(selector,handler)=>{document.addEventListener("click",async evt=>{const btn=evt.target?.closest?.(selector);if(!btn)return;try{await handler(evt);}catch(e){console.warn("payroll btn error",e);}});};

      // Back button removed per nuova UX
      U("btnHeaderPayrollUser")?.addEventListener("click", async () => { await Fi().catch(e=>{console.warn("payroll user load error",e);try{Ve("Buste paga","Impossibile caricare (permessi o rete).");}catch(_){}}); scrollToSection("userArea"); });
      U("btnHeaderPayrollAdmin")?.addEventListener("click", () => { try{ openPayrollUploadPicker(); }catch(_e){} });
      bindPayrollBtn("#btnOpenPayrollUser", async () => { await Fi().catch(e=>{console.warn("payroll user load error",e);try{Ve("Buste paga","Impossibile caricare (permessi o rete).");}catch(_){}}); scrollToSection("userArea"); });
      bindPayrollBtn("#btnOpenPayrollAdmin", () => { openPayrollUploadPicker(); });
      bindPayrollBtn("#btnOpenSendLogModal", async () => { await openSendLogModal(); });
      U("btnPayrollPreviewPage")?.addEventListener("click", () => openPayrollPdfWindow());
      U("btnPayrollUserReload")?.addEventListener("click", async ()=>{ try{ await Fi(); }catch(_e){} try{ startPayrollUserDocsWatch(); }catch(_e){} });
      U("btnPayrollOpenPdf")?.addEventListener("click", () => openPayrollPdfWindow());
      U("btnPayrollPrint")?.addEventListener("click", () => { const e = N.payroll.userView.currentUrl; if (!e) return void Ve("PDF non pronto", "Seleziona un mese disponibile."); const t = window.open(e, "_blank"); try { t?.print() } catch (e) {} });
      // PDF preview overlay buttons
      U("btnPdfPreviewClose")?.addEventListener("click", ()=> closePdfPreview());
      U("pdfPreviewOverlay")?.addEventListener("click", (evt)=>{ if(evt.target?.id === "pdfPreviewOverlay") closePdfPreview(); });
      U("btnPdfPreviewDownload")?.addEventListener("click", ()=>{
        const u = N.ui?.pdfPreview?.directUrl;
        if(!u) return;
        const a = document.createElement("a");
        a.href = u;
        a.download = N.ui?.pdfPreview?.fileName || "busta_paga.pdf";
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      U("btnPdfPreviewPrint")?.addEventListener("click", ()=>{
        const frame = U("pdfPreviewFrame");
        const u = N.ui?.pdfPreview?.directUrl;
        try{
          if(frame?.contentWindow){
            frame.contentWindow.focus();
            frame.contentWindow.print();
            return;
          }
        }catch(_e){}
        if(u){
          const w = window.open(u, "_blank");
          try{ w?.print?.(); }catch(_e){}
        }
      });

      document.addEventListener("keydown", (e)=>{
        if(e.key === "Escape"){
          const ov = U("pdfPreviewOverlay");
          if(ov && ov.getAttribute("aria-hidden")==="false") closePdfPreview();
          const logModal = U("sendLogModal");
          if(logModal?.classList?.contains("show")) toggleSendLogModal(false);
        }
      });

      U("btnPayrollShare")?.addEventListener("click", async () => { const e = N.payroll.userView.currentUrl; if (e) try { navigator.share ? await navigator.share({ title: "Busta paga", url: e }) : navigator.clipboard && (await navigator.clipboard.writeText(e), Ve("Link copiato", "URL copiato negli appunti.")) } catch (e) { Ve("Condivisione non riuscita", "Riprovare.") } else Ve("PDF non pronto", "Seleziona un mese disponibile.") });
      U("btnLaunchAdmin")?.addEventListener("click", ()=>openAdminModalFlow());
      U("btnLaunchAdminAbsences")?.addEventListener("click", ()=>{
        try{ toggleAdminModal(false); }catch(_e){}
        scrollToSection("adminAbsenceHome");
      });
      U("btnCloseAdmin")?.addEventListener("click", ()=>toggleAdminModal(false));
	      // Fase MATCH: annulla dal menu laterale
	      U("btnPayrollCancelMatch")?.addEventListener("click", ()=>toggleAdminModal(false));
      U("adminModal")?.addEventListener("click", evt=>{ if(evt.target===evt.currentTarget) toggleAdminModal(false); });
      U("btnCloseSendLogModal")?.addEventListener("click", ()=>toggleSendLogModal(false));
      U("sendLogModal")?.addEventListener("click", evt=>{ if(evt.target===evt.currentTarget) toggleSendLogModal(false); });

      // Dipendenti modal: ricerca/sorting + click lista + dettaglio + anteprima PDF
      (function bindEmployeesModal(){
        const modal = U("sendLogModal");
        if(!modal || modal.dataset.empBound) return;
        modal.dataset.empBound = "1";

        U("empSearch")?.addEventListener("input", ()=>{
          const st = ensureEmployeesState();
          st.ui.search = String(U("empSearch")?.value || "");
          renderEmployeesModal();
        });
        U("empSort")?.addEventListener("change", ()=>{
          const st = ensureEmployeesState();
          st.ui.sort = String(U("empSort")?.value || "last");
          renderEmployeesModal();
        });
        U("empShowDisabled")?.addEventListener("change", ()=>{
          const st = ensureEmployeesState();
          st.ui.showDisabled = !!U("empShowDisabled")?.checked;
          renderEmployeesModal();
        });

        U("btnEmpReload")?.addEventListener("click", async ()=>{
          await reloadEmployeesModal();
        });

        modal.addEventListener("click", async (evt)=>{
          const back = evt.target.closest("[data-emp-back]");
          if(back){
            const st = ensureEmployeesState();
            st.ui.view = "list";
            renderEmployeesModal();
            return;
          }

          const sel = evt.target.closest("[data-emp-select]");
          if(sel){
            const st = ensureEmployeesState();
            st.selectedEmail = String(sel.getAttribute("data-emp-select") || "").toLowerCase();
            st.ui.view = "detail";
            renderEmployeesModal();
            return;
          }

          if(evt.target.closest("#btnEmpSave")){
            await saveSelectedEmployeeEdits();
            return;
          }

          const rs = evt.target.closest("[data-emp-resend]");
          if(rs){
            const key = String(rs.getAttribute("data-emp-logkey") || "");
            await resendEmployeePayrollFromLogKey(key);
            return;
          }

          const prev = evt.target.closest("[data-emp-preview]");
          if(prev){
            const directUrl = String(prev.getAttribute("data-emp-url") || "");
            const docKey = String(prev.getAttribute("data-emp-dockey") || "");
            const docId = String(prev.getAttribute("data-emp-docid") || "");
            const title = String(prev.getAttribute("data-emp-fn") || "Busta paga");
            const sub = String(ensureEmployeesState().selectedEmail || "—");
            await openEmployeePdf({ directUrl, docKey, docId, title, sub });
            return;
          }

          const op = evt.target.closest("[data-emp-open]");
          if(op){
            const directUrl = String(op.getAttribute("data-emp-url") || "");
            const docKey = String(op.getAttribute("data-emp-dockey") || "");
            const docId = String(op.getAttribute("data-emp-docid") || "");
            const r = await resolvePayrollDocUrl({ directUrl, docKey, docId });
            if(!r.url){ Ve("PDF non disponibile", "Non trovo un link al PDF per questo log."); return; }
            window.open(r.url, "_blank", "noopener");
            return;
          }
        });
      })();


      // Storico invii (send logs): selezione righe + pulsanti
      const bindSendLogList = (el)=>{
        if(!el || el.dataset.sendlogBound) return;
        el.dataset.sendlogBound = "1";

        el.addEventListener("change", (evt)=>{
          const t = evt.target;
          if(!(t && t.matches('input[data-sendlog-check]'))) return;
          const id = t.getAttribute("data-sendlog-check") || "";
          if(!id) return;
          N.payroll = N.payroll || {};
          N.payroll.admin = N.payroll.admin || {};
          N.payroll.admin.sendLogSelection = N.payroll.admin.sendLogSelection || {};
          N.payroll.admin.sendLogSelection[id] = !!t.checked;
          renderPayrollSendLogs();
        });

        el.addEventListener("click", (evt)=>{
          const row = evt.target.closest(".sendLogItem");
          if(!row) return;
          if(evt.target.closest('input[data-sendlog-check]')) return;
          const id = row.getAttribute("data-sendlog-id") || "";
          if(!id) return;
          N.payroll = N.payroll || {};
          N.payroll.admin = N.payroll.admin || {};
          const sel = N.payroll.admin.sendLogSelection = N.payroll.admin.sendLogSelection || {};
          sel[id] = !sel[id];
          renderPayrollSendLogs();
        });
      };
      bindSendLogList(U("payrollSendLogList"));
      bindSendLogList(U("sendLogModalList"));

      const selectAllSendLogs = ()=>{
        const logs = N.payroll?.admin?.sendLogs || [];
        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        const sel = N.payroll.admin.sendLogSelection = {};
        logs.forEach(l=>{ if(l?.id) sel[l.id] = true; });
        renderPayrollSendLogs();
      };
      const clearSendLogsSelection = ()=>{
        N.payroll = N.payroll || {};
        N.payroll.admin = N.payroll.admin || {};
        N.payroll.admin.sendLogSelection = {};
        renderPayrollSendLogs();
      };

      U("btnSendLogReload")?.addEventListener("click", ()=>{ loadPayrollSendLogs(); });
      U("btnSendLogSelectAll")?.addEventListener("click", ()=>{ selectAllSendLogs(); });
      U("btnSendLogClearSel")?.addEventListener("click", ()=>{ clearSendLogsSelection(); });
      U("btnSendLogDeleteSel")?.addEventListener("click", ()=>{ deleteSelectedSendLogs(); });

      U("btnSendLogModalSelectAll")?.addEventListener("click", ()=>{ selectAllSendLogs(); });
      U("btnSendLogModalClearSel")?.addEventListener("click", ()=>{ clearSendLogsSelection(); });
      U("btnSendLogModalDeleteSel")?.addEventListener("click", ()=>{ deleteSelectedSendLogs(); });

      U("btnSubmitAbsence")?.addEventListener("click", ()=>submitAbsenceRequest());
      U("absenceFilterStatus")?.addEventListener("change", evt=>{ state.absences.filters = state.absences.filters || {}; state.absences.filters.status = evt.target.value; renderAbsenceAdminList(); });
      U("absenceFilterType")?.addEventListener("change", evt=>{ state.absences.filters = state.absences.filters || {}; state.absences.filters.type = evt.target.value; renderAbsenceAdminList(); });
      U("absenceFilterSearch")?.addEventListener("input", evt=>{ state.absences.filters = state.absences.filters || {}; state.absences.filters.search = (evt.target.value||"").toLowerCase(); renderAbsenceAdminList(); });

      U("btnPayrollReloadUsers")?.addEventListener("click", () => zi());
      U("btnSaveDirectory")?.addEventListener("click", () => saveDirectoryEntry());

// Bulk actions (Dipendenti)
const btnDirSelectAll = U("btnDirSelectAll");
const btnDirClearSel = U("btnDirClearSel");
const btnDirEditSelected = U("btnDirEditSelected");
const btnDirDeleteSelected = U("btnDirDeleteSelected");
const btnDirSaveEdits = U("btnDirSaveEdits");
const btnDirCancelEdits = U("btnDirCancelEdits");

function ensureDirUI(){
  const dir = N.payroll.directory = N.payroll.directory || {};
  dir.ui = dir.ui || { selected:{}, editing:{}, drafts:{}, inEdit:false };
  return dir.ui;
}

btnDirSelectAll && (btnDirSelectAll.onclick = ()=>{
  const ui = ensureDirUI();
  const entries = N.payroll?.directory?.entries || [];
  const selectedCount = Object.values(ui.selected||{}).filter(Boolean).length;
  const all = entries.length && selectedCount === entries.length;
  ui.selected = {};
  if(!all){
    entries.forEach(e=>{
      const em = normalizeEmail(e.emailLower || e.email || e.id || "");
      if(em) ui.selected[em] = true;
    });
  }
  renderDirectoryUI();
});

btnDirClearSel && (btnDirClearSel.onclick = ()=>{
  const ui = ensureDirUI();
  ui.selected = {};
  ui.editing = {};
  ui.drafts = {};
  ui.inEdit = false;
  renderDirectoryUI();
});

btnDirEditSelected && (btnDirEditSelected.onclick = ()=>{
  const ui = ensureDirUI();
  const selected = Object.entries(ui.selected||{}).filter(([,v])=>v).map(([k])=>k);
  if(!selected.length){ Ve("Selezione vuota","Seleziona almeno una riga."); return; }
  ui.inEdit = true;
  ui.editing = {};
  selected.forEach(k=>{
    ui.editing[k] = true;
    const entry = (N.payroll?.directory?.entries || []).find(e=>normalizeEmail(e.emailLower||e.email||e.id||"")===k);
    ui.drafts[k] = ui.drafts[k] || {};
    ui.drafts[k].displayName = ui.drafts[k].displayName ?? (entry?.displayName || "");
    ui.drafts[k].emailLower = ui.drafts[k].emailLower ?? k;
  });
  renderDirectoryUI();
});

btnDirCancelEdits && (btnDirCancelEdits.onclick = ()=>{
  const ui = ensureDirUI();
  ui.inEdit = false;
  ui.editing = {};
  ui.drafts = {};
  renderDirectoryUI();
});

btnDirDeleteSelected && (btnDirDeleteSelected.onclick = async ()=>{
  const ui = ensureDirUI();
  const selected = Object.entries(ui.selected||{}).filter(([,v])=>v).map(([k])=>k);
  if(!selected.length){ Ve("Selezione vuota","Seleziona almeno una riga."); return; }
  for(const emailLower of selected){
    await deleteDirectoryEntry(emailLower);
  }
  ui.selected = {};
  renderDirectoryUI();
  await zi();
});

btnDirSaveEdits && (btnDirSaveEdits.onclick = async ()=>{
  if(!(N.firebase?.ok && N.user?.isAdmin)){ Ve("Non autorizzato","Solo admin."); return; }
  const ui = ensureDirUI();
  const entries = N.payroll?.directory?.entries || [];
  const byEmail = new Map(entries.map(e=>[normalizeEmail(e.emailLower||e.email||e.id||""), e]));
  const toEdit = Object.entries(ui.editing||{}).filter(([,v])=>v).map(([k])=>k);
  if(!toEdit.length){ Ve("Nessuna modifica",""); return; }

  for(const oldEmail of toEdit){
    const entry = byEmail.get(oldEmail);
    if(!entry) continue;

    const draft = ui.drafts[oldEmail] || {};
    const newName = String(draft.displayName ?? entry.displayName ?? "").trim();
    const newEmail = normalizeEmail(draft.emailLower ?? oldEmail);

    if(!newName){ Ve("Nome mancante", `Completa il nome per ${oldEmail}`); continue; }
    if(!isValidEmail(newEmail)){ Ve("Email non valida", `Controlla: ${newEmail||oldEmail}`); continue; }

    const parts = newName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");

    const payload = {
      emailLower: newEmail,
      fiscalCode: (entry.fiscalCode || "").toUpperCase(),
      firstName,
      lastName,
      displayName: newName,
      fullNameNorm: normalizeNameStrict(newName || entry.fiscalCode || newEmail),
      enabled: true,
      updatedAt: N.firebase.api.serverTimestamp(),
      updatedBy: N.user?.email || "",
      id: newEmail
    };

    try{
      await N.firebase.api.setDoc(N.firebase.api.doc(N.firebase.db, COL_PAYROLL_DIRECTORY, newEmail), payload, { merge:true });
      if(newEmail !== oldEmail){
        await N.firebase.api.deleteDoc(N.firebase.api.doc(N.firebase.db, COL_PAYROLL_DIRECTORY, oldEmail));
      }
    }catch(err){
      console.warn("directory bulk save", err);
      Ve("Salvataggio non riuscito", err?.message || String(err));
    }
  }

  ui.inEdit = false;
  ui.selected = {};
  ui.editing = {};
  ui.drafts = {};
  renderDirectoryUI();
  await zi();
});
      U("payrollTabDirectory")?.addEventListener("click", () => {
        const s = N.payroll?.admin?.step || "idle";
        const uploadSteps = ["idle","extracting","preview"];
        const flowSteps = ["match","sending"];
        if(uploadSteps.includes(s)) N.payroll.admin.lastUploadStep = s;
        if(flowSteps.includes(s)) N.payroll.admin.lastFlowStep = s;
        Di("directory");
        loadPayrollSentCounts();
      });
      U("payrollTabUpload")?.addEventListener("click", () => {
        const s = N.payroll?.admin?.step || "idle";
        const uploadSteps = ["idle","extracting","preview"];
        const flowSteps = ["match","sending"];
        if(flowSteps.includes(s)) N.payroll.admin.lastFlowStep = s;
        if(uploadSteps.includes(s)) N.payroll.admin.lastUploadStep = s;
        const a = N.payroll.admin;
        const step = a.gemini?.loading ? "extracting" : ((a.gemini?.pages||[]).length ? (a.lastUploadStep && uploadSteps.includes(a.lastUploadStep) ? a.lastUploadStep : "preview") : (a.lastUploadStep || "idle"));
        Di(step);
      });
      U("payrollTabWorkflow")?.addEventListener("click", () => {
        const s = N.payroll?.admin?.step || "idle";
        const uploadSteps = ["idle","extracting","preview"];
        const flowSteps = ["match","sending"];
        if(uploadSteps.includes(s)) N.payroll.admin.lastUploadStep = s;
        if(flowSteps.includes(s)) N.payroll.admin.lastFlowStep = s;
        const step = (N.payroll?.admin?.lastFlowStep && flowSteps.includes(N.payroll.admin.lastFlowStep)) ? N.payroll.admin.lastFlowStep : "match";
        Di(step);
      });

      // Storico invii (selezione + elimina)
      U("payrollHistoryList")?.addEventListener("change", (evt)=>{
        const el = evt.target;
        const id = el?.getAttribute?.("data-history-check");
        if(!id) return;
        N.payroll.admin.historySelection = (N.payroll.admin.historySelection || {});
        N.payroll.admin.historySelection[id] = !!el.checked;
        renderUploadHistory();
      });
      U("btnHistorySelectAll")?.addEventListener("click", historySelectAll);
      U("btnHistoryClearSel")?.addEventListener("click", historyClearSelection);
      U("btnHistoryDeleteSel")?.addEventListener("click", deleteSelectedHistory);

      // Storico invii (logs)
      document.addEventListener("change", (evt)=>{
        const el = evt.target;
        if(el && el.matches && el.matches("[data-sendlog-check]")){
          const id = el.getAttribute("data-sendlog-check");
          if(!id) return;
          N.payroll.admin.sendLogSelection = (N.payroll.admin.sendLogSelection || {});
          N.payroll.admin.sendLogSelection[id] = !!el.checked;
          renderPayrollSendLogs();
        }
      });
      U("btnSendLogReload")?.addEventListener("click", ()=>{ loadPayrollSendLogs(); });
      U("btnSendLogModalReload")?.addEventListener("click", ()=>{ reloadEmployeesModal(); });
      ["btnSendLogSelectAll","btnSendLogModalSelectAll"].forEach(id=>U(id)?.addEventListener("click", sendLogSelectAll));
      ["btnSendLogClearSel","btnSendLogModalClearSel"].forEach(id=>U(id)?.addEventListener("click", sendLogClearSelection));
      ["btnSendLogDeleteSel","btnSendLogModalDeleteSel"].forEach(id=>U(id)?.addEventListener("click", deleteSelectedSendLogs));
      U("btnSendLogBack")?.addEventListener("click", ()=>Di("match"));


      // Azioni invio (per evitare "Invio in corso…" bloccato)
      U("btnPayrollSendDone")?.addEventListener("click", ()=>{
        try{
          // Torna alla lista dei residui da inviare (nascondi "già inviate")
          N.payroll = N.payroll || {};
          N.payroll.admin = N.payroll.admin || {};
          N.payroll.admin.filters = N.payroll.admin.filters || { search:"", showIssues:false, showSent:false };
          N.payroll.admin.filters.showSent = false;
          N.payroll.admin.filters.search = "";
          const s = U("payrollMatchSearch");
          if(s) s.value = "";
        }catch(_e){}
        try{ Di("match"); }catch(_e){}
        try{ Pi(); }catch(_e){}
      });
      U("btnPayrollSendGoHistory")?.addEventListener("click", async ()=>{
        Di("history");
        await loadPayrollSendLogs();
      });
const payrollDirAutofill = () => {
        const e = U("dirEmailInput"), t = U("dirCfInput"), n = U("dirFirstNameInput"), o = U("dirLastNameInput"), i = normalizeEmail(e?.value);
        if (!i) return;
        const a = (N.payroll.directory.entries || []).find(e => e.emailLower === i);
        if (!a) return;
        t && (t.value = a.fiscalCode || a.fullName || a.emailLower || "");
        n && (n.value = a.firstName || "");
        o && (o.value = a.lastName || "");
      };
      U("dirEmailInput")?.addEventListener("change", payrollDirAutofill);
      U("dirEmailInput")?.addEventListener("input", payrollDirAutofill);
      U("dirCfInput")?.addEventListener("change", payrollDirAutofill);
      const t = U("payrollDrop"), n = U("payrollFileInput");
      const o = (files) => {
        const has = files && files.length;
        N.payroll.admin.files = has ? [files[0]] : [];
        Bi();

        // Se l’utente annulla la selezione, non apriamo nulla
        if(!has) return;

        // Gate: niente accesso anonimo. Serve login Google per caricare.
        if(!N.user || N.user.isAnonymous){
          try{
            N.payroll.admin.files = [];
            Bi();
          }catch(_e){}
          try{ if(n) n.value = ""; }catch(_e){}
          try{ goToAuth("Accedi per caricare i PDF."); }catch(_e){}
          return;
        }

        // Gate Premium: 1 invio gratuito
        if(!ensurePayrollCanUpload({ toast:true, openBilling:true })){
          try{
            N.payroll.admin.files = [];
            Bi();
          }catch(_e){}
          try{ if(n) n.value = ""; }catch(_e){}
          return;
        }

        // Apri la modale SOLO dopo la selezione (niente modale intermedia con un altro bottone "carica")
        try{ Di("extracting"); }catch(_e){}
        try{ toggleAdminModal(true, "adminArea"); }catch(_e){}

        Vi();
      };
      t && (["dragover", "dragenter"].forEach(e => t.addEventListener(e, e => { e.preventDefault(), t.classList.add("drag") })), ["dragleave", "drop"].forEach(e => t.addEventListener(e, e => { e.preventDefault(), t.classList.remove("drag") })), t.addEventListener("drop", e => { e.preventDefault(), e.dataTransfer?.files?.length && o(e.dataTransfer.files) }), t.addEventListener("click", e => { if(e?.target?.closest && e.target.closest(".uploadActions")) return; if(!ensurePayrollCanUpload({ toast:true, openBilling:true })) return; n?.click() }));
      n?.addEventListener("change", () => o(n.files));
      U("btnPayrollUpload")?.addEventListener("click", () => { if(!ensurePayrollCanUpload({ toast:true, openBilling:true })) return; const f = N.payroll.admin.files?.[0]; if (!f) { n?.click(); return; } Vi(); });
      U("btnPayrollRetry")?.addEventListener("click", () => Vi());
      U("btnPayrollReset")?.addEventListener("click", () => ji());
      U("btnPayrollReset2")?.addEventListener("click", () => ji());
      U("btnPayrollReset3")?.addEventListener("click", () => ji());
      U("btnPayrollMatch")?.addEventListener("click", () => Gi());
      U("btnPayrollBackPreview")?.addEventListener("click", () => Di("preview"));
      U("btnPayrollSend")?.addEventListener("click", () => Yi());
      U("btnToggleDirForm")?.addEventListener("click", ()=>{ const form = U("dirForm"); form?.classList.toggle("isOpen"); });
      document.addEventListener("click", async evt=>{
        const btn = evt.target?.closest?.("[data-payroll-open-pages]");
        if(btn){
          const key = btn.getAttribute("data-payroll-open-pages");
          if(key) await openPayrollPages(key);
        }
      });
      document.addEventListener("change", evt=>{
        const toggleAll = evt.target?.dataset?.payrollToggleAll;
        if(toggleAll){
          const shouldEnable = !!evt.target.checked;
          const rows = N.payroll?.admin?.groupedRows || [];
          rows.forEach(row=>{
            if(isPayrollRowSelectable(row)) row.enabled = shouldEnable;
            else row.enabled = false;
          });
          refreshGroupedValidation();
          return;
        }
        const toggleKey = evt.target?.dataset?.payrollRowToggle;
        if(toggleKey){
          const row = (N.payroll?.admin?.groupedRows || []).find(r=>r.key===toggleKey);
          if(row){ row.enabled = evt.target.checked; refreshGroupedValidation(); }
        }
      });
      
      // Conferma modifica email già compilata (sezione "risultati match")
      // - se il campo era già valorizzato e cambia, chiede conferma
      // - se annulli, ripristina il valore precedente
      document.addEventListener("focusin", (evt)=>{
        const el = evt.target;
        if(el && el.matches && el.matches('input[data-payroll-field="email"][data-key]')){
          el.dataset.prevEmail = el.value || "";
        }
      });

      document.addEventListener("change", (evt)=>{
        const el = evt.target;
        if(!(el && el.matches && el.matches('input[data-payroll-field="email"][data-key]'))) return;
        try{
          const key = el.getAttribute("data-key") || "";
          const prevRaw = String(el.dataset.prevEmail || "");
          const prevNorm = normalizeEmail(prevRaw);
          const nextNorm = normalizeEmail(el.value);

          // Solo se era già compilata
          if(prevNorm && prevNorm !== nextNorm){
            const ok = window.confirm(`Confermi la modifica dell’email?\n\nDa: ${prevNorm}\nA: ${nextNorm || "—"}`);
            if(!ok){
              el.value = prevNorm;
              if(key) updateGroupedRowField(key, "email", prevNorm);
              el.dataset.prevEmail = prevNorm;
              try{ showToast("Modifica annullata", "Email ripristinata."); }catch(_e){}
              return;
            }
          }

          // Se l'email era vuota e viene inserita ora: se sembra non coerente col nome, chiedi conferma
          if(!prevNorm && nextNorm && isValidEmail(nextNorm)){
            try{
              const row = (N.payroll?.admin?.groupedRows || []).find(r=>r.key===key);
              const displayName = String(row?.displayName || "").trim();
              const looksNameOk = displayName ? emailLooksLikeEmployeeName(nextNorm, displayName) : true;
              if(displayName && !looksNameOk){
                const ok2 = window.confirm(
                  `Sei sicuro che sia corretta?\n\n`+
                  `L'email inserita sembra non corrispondere al nome del dipendente.\n\n`+
                  `Nome: ${displayName}\n`+
                  `Email: ${nextNorm}`
                );
                if(!ok2){
                  el.value = prevNorm;
                  if(key) updateGroupedRowField(key, "email", prevNorm);
                  el.dataset.prevEmail = prevNorm;
                  try{ showToast("Inserimento annullato", "Email rimossa."); }catch(_e){}
                  return;
                }
              }
            }catch(_e){}
          }

          // Commit (normalizza e salva nello state)
          el.value = nextNorm;
          if(key) updateGroupedRowField(key, "email", nextNorm);
          el.dataset.prevEmail = nextNorm;

          // Salva subito su Firebase (se toggle ON) così viene ricordata al prossimo accesso
          try{
            if(key && nextNorm && isValidEmail(nextNorm)){
              const row = (N.payroll?.admin?.groupedRows || []).find(r=>r.key===key);
              if(row) { row.email = nextNorm; persistRowToDirectory(row, { prevEmail: prevNorm }); }
            }
          }catch(_e){}
        }catch(err){
          console.warn("email confirm change", err);
        }
      });

// Input live: email match rows + directory edit drafts
      document.addEventListener("input", (evt)=>{
        const el = evt.target;
        if(!el) return;

        // Match rows (email)
        const pf = el.getAttribute && el.getAttribute("data-payroll-field");
        if(pf === "email"){
          const key = el.getAttribute("data-key") || "";
          // Chrome autofill può tentare di riempire più campi insieme.
          // Accettiamo SOLO il campo effettivamente selezionato (quello con focus).
          if(document.activeElement !== el){
            try{
              const row = (N.payroll?.admin?.groupedRows || []).find(r=>r.key===key);
              const v = row ? (row.email || "") : "";
              if(typeof v === "string" && el.value !== v) el.value = v;
            }catch(_e){}
            return;
          }
          if(key) updateGroupedRowField(key, "email", el.value);
        }

        // Directory edits
        const editNameKey = el.getAttribute && el.getAttribute("data-dir-edit-name");
        if(editNameKey){
          const dir = N.payroll.directory = N.payroll.directory || {};
          dir.ui = dir.ui || { selected:{}, editing:{}, drafts:{}, inEdit:false };
          dir.ui.drafts[editNameKey] = dir.ui.drafts[editNameKey] || {};
          dir.ui.drafts[editNameKey].displayName = el.value;
        }
        const editEmailKey = el.getAttribute && el.getAttribute("data-dir-edit-email");
        if(editEmailKey){
          const dir = N.payroll.directory = N.payroll.directory || {};
          dir.ui = dir.ui || { selected:{}, editing:{}, drafts:{}, inEdit:false };
          dir.ui.drafts[editEmailKey] = dir.ui.drafts[editEmailKey] || {};
          dir.ui.drafts[editEmailKey].emailLower = el.value;
        }
      });

      // Selezione directory (bulk)
      document.addEventListener("change", (evt)=>{
        const key = evt.target?.getAttribute?.("data-dir-select");
        if(!key) return;
        const dir = N.payroll.directory = N.payroll.directory || {};
        dir.ui = dir.ui || { selected:{}, editing:{}, drafts:{}, inEdit:false };
        dir.ui.selected[key] = !!evt.target.checked;
        renderDirectoryUI();
      });

      const payrollSearchInput = U("payrollSearchInput");
      if (payrollSearchInput) {
        N.payroll.userView = N.payroll.userView || {};
        payrollSearchInput.value = N.payroll.userView.searchTerm || "";
        payrollSearchInput.addEventListener("input", () => {
          const term = (payrollSearchInput.value || "").toLowerCase();
          const view = N.payroll.userView = N.payroll.userView || {};
          view.searchTerm = term;
          view.filteredMonths = term ? (view.months || []).filter(m => String(m||"").toLowerCase().includes(term)) : [];
          Ri();
        });
      }
      const payrollMatchSearch = U("payrollMatchSearch");
      if(payrollMatchSearch){
        payrollMatchSearch.value = N.payroll?.admin?.filters?.search || "";
        payrollMatchSearch.addEventListener("input", ()=>{
          N.payroll.admin.filters = N.payroll.admin.filters || { search:"", showIssues:false, showSent:false };
          N.payroll.admin.filters.search = payrollMatchSearch.value.trim().toLowerCase();
          Pi();
        });
      }

      // Switch (menu laterale): salva le email inserite per i prossimi invii (default ON)
      const payrollSaveEmailsToggle = U("payrollSaveEmailsToggle");
      if(payrollSaveEmailsToggle && !payrollSaveEmailsToggle.__bound){
        payrollSaveEmailsToggle.__bound = true;
        const LS_KEY = "payroll_save_emails_v1";
        try{
          N.payroll = N.payroll || {};
          N.payroll.admin = N.payroll.admin || {};

          let stored = null;
          try{ stored = localStorage.getItem(LS_KEY); }catch(_e){}

          if(stored === null || stored === undefined){
            // default ON
            if(typeof N.payroll.admin.saveEmailsForNext !== "boolean") N.payroll.admin.saveEmailsForNext = true;
          }else{
            N.payroll.admin.saveEmailsForNext = (stored !== "0");
          }

          payrollSaveEmailsToggle.checked = (N.payroll.admin.saveEmailsForNext !== false);
        }catch(_e){
          payrollSaveEmailsToggle.checked = true;
        }

        payrollSaveEmailsToggle.addEventListener("change", ()=>{
          try{
            N.payroll.admin = N.payroll.admin || {};
            N.payroll.admin.saveEmailsForNext = !!payrollSaveEmailsToggle.checked;
            localStorage.setItem(LS_KEY, payrollSaveEmailsToggle.checked ? "1" : "0");
          }catch(_e){}
        });
      }

      const btnToggleSent = U("btnPayrollToggleSent");
      if(btnToggleSent && !btnToggleSent.__bound){
        btnToggleSent.__bound = true;
        btnToggleSent.addEventListener("click", ()=>{
          N.payroll.admin.filters = N.payroll.admin.filters || { search:"", showIssues:false, showSent:false };
          N.payroll.admin.filters.showSent = !N.payroll.admin.filters.showSent;
          Pi();
        });
      }

      const payrollSendSearch = U("payrollSendSearch");
      if(payrollSendSearch){
        payrollSendSearch.value = N.payroll?.admin?.sendFilters?.search || "";
        payrollSendSearch.addEventListener("input", ()=>{
          N.payroll.admin.sendFilters = N.payroll.admin.sendFilters || { search:"", view:"pending" };
          N.payroll.admin.sendFilters.search = payrollSendSearch.value.trim().toLowerCase();
          renderPayrollSendList();
        });
      }

      const btnPayrollSendToggleSent = U("btnPayrollSendToggleSent");
      if(btnPayrollSendToggleSent && !btnPayrollSendToggleSent.__bound){
        btnPayrollSendToggleSent.__bound = true;
        btnPayrollSendToggleSent.addEventListener("click", ()=>{
          N.payroll.admin.sendFilters = N.payroll.admin.sendFilters || { search:"", view:"pending" };
          N.payroll.admin.sendFilters.view = (N.payroll.admin.sendFilters.view === "sent") ? "pending" : "sent";
          renderPayrollSendList();
          try{ updatePayrollSendSentToggleUI(); }catch(_e){}
        });
      }

      const payrollShowIssues = U("payrollShowIssues");
      if(payrollShowIssues){
        payrollShowIssues.checked = !!N.payroll?.admin?.filters?.showIssues;
        payrollShowIssues.addEventListener("change", ()=>{
          N.payroll.admin.filters = N.payroll.admin.filters || { search:"", showIssues:false, showSent:false };
          N.payroll.admin.filters.showIssues = payrollShowIssues.checked;
          Pi();
        });
      }
      async function persistRowToDirectory(row, opts = {}) {
        // Salva l'email del dipendente in Firestore (payrollDirectory) così viene ricordata ai prossimi accessi.
        // Richiesta: se l'email viene aggiornata, deve aggiornarsi subito anche su Firebase (evita duplicati).
        if(!(row && N.firebase?.ok && N.user)) return;
        if(N.payroll?.admin?.saveEmailsForNext === false) return;

        const em = normalizeEmail(row.email);
        if(!isValidEmail(em)) return;

        // Fallback locale (utile se i permessi Firestore vengono negati)
        try{ payrollCacheEmailForNext(row, em); }catch(_e){}

        const name = String(row?.displayName || "").trim() || String(row?.fiscalCode || "").trim() || em;
        const parts = name.split(/\s+/).filter(Boolean);
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ");
        const _fc = normalizeFiscalCode(row?.fiscalCode || "");
        const fiscalCode = (_fc && _fc.length===16) ? _fc : "";
        const fullNameNorm = normalizeNameStrict(name || fiscalCode || em);

        const payload = {
          emailLower: em,
          fiscalCode,
          firstName,
          lastName,
          displayName: name,
          fullNameNorm,
          enabled: true,
          updatedAt: N.firebase.api.serverTimestamp(),
          updatedBy: (N.user?.email || "").toLowerCase(),
          id: em
        };

        const prevEmail = normalizeEmail(opts?.prevEmail || opts?.prevEmailLower || "");
        const api = N.firebase.api;
        const db = N.firebase.db;

        // Se stiamo "cambiando" email, proviamo a rinominare il record evitando duplicati.
        // Regola di sicurezza: eliminiamo il vecchio doc SOLO se siamo confident che sia lo stesso dipendente
        // (match per codice fiscale oppure nome normalizzato).
        let oldDocId = "";
        try{
          const entries = (N.payroll?.directory?.entries || []);

          // 1) Match forte per codice fiscale (preferibile)
          if(fiscalCode){
            const hit = entries.find(e => normalizeFiscalCode(e?.fiscalCode || "") === fiscalCode);
            const id = hit ? normalizeEmail(hit?.emailLower || hit?.email || hit?.id || "") : "";
            if(id && id !== em) oldDocId = id;
          }

          // 2) Fallback: usa l'email precedente solo se coincide con lo stesso dipendente (FC o nome)
          if(!oldDocId && prevEmail && prevEmail !== em){
            const hit2 = entries.find(e => normalizeEmail(e?.emailLower || e?.email || e?.id || "") === prevEmail);
            if(hit2){
              const fc2 = normalizeFiscalCode(hit2?.fiscalCode || "");
              const nm2 = normalizeNameStrict(hit2?.displayName || hit2?.fullName || "");
              const confident = (fiscalCode && fc2 === fiscalCode) || (fullNameNorm && nm2 === fullNameNorm);
              if(confident) oldDocId = prevEmail;
            }
          }
        }catch(_e){}

        try{
          // Upsert nuovo record (immediato)
          await api.setDoc(api.doc(db, COL_PAYROLL_DIRECTORY, em), payload, { merge:true });

          // Cleanup vecchio record (best-effort, solo se confident)
          if(oldDocId && oldDocId !== em){
            try{
              const oldRef = api.doc(db, COL_PAYROLL_DIRECTORY, oldDocId);
              const oldSnap = await api.getDoc(oldRef);
              if(oldSnap && oldSnap.exists()){
                const d = oldSnap.data() || {};
                const oldFc = normalizeFiscalCode(d?.fiscalCode || "");
                const oldNm = normalizeNameStrict(d?.displayName || d?.fullName || "");
                const confident2 = (fiscalCode && oldFc === fiscalCode) || (fullNameNorm && oldNm === fullNameNorm);
                if(confident2){
                  await api.deleteDoc(oldRef);
                }
              }
            }catch(err2){
              console.warn("persistRowToDirectory cleanup", err2);
            }
          }

          // Aggiorna subito la cache in memoria (così il match usa la mail nuova anche prima del realtime update)
          try{
            const dir = N.payroll?.directory;
            if(dir && Array.isArray(dir.entries)){
              const normId = (e)=> normalizeEmail(e?.emailLower || e?.email || e?.id || "");
              if(oldDocId){
                dir.entries = dir.entries.filter(e => normId(e) !== oldDocId);
              }
              const existing = dir.entries.find(e => normId(e) === em);
              if(existing){
                Object.assign(existing, payload);
                existing.id = em;
                existing.emailLower = em;
              }else{
                dir.entries.push({ ...payload, id: em, emailLower: em });
                dir.entries.sort((a,b)=> (a.displayName||a.emailLower||"").localeCompare(b.displayName||b.emailLower||""));
              }
            }
          }catch(_e){}
        }catch(err){
          console.warn("persistRowToDirectory", err);
          // Se Firestore fallisce, abbiamo comunque salvato localmente sopra
          try{
            const low = String(err?.message || "").toLowerCase();
            const body = (err?.code === "permission-denied" || low.includes("permission"))
              ? "Permessi insufficienti: email salvata solo su questo dispositivo."
              : "Impossibile salvare su Firebase: email salvata solo su questo dispositivo.";
            try{ showToast("Salvataggio email", body, 4200); }catch(_e){}
          }catch(_e){}
        }
      }

      // PDF Preview overlay (same file, no #)

// Helpers: prova a nascondere toolbar/nav del viewer PDF (parametri PDF Open) — usato SOLO nel fallback iframe
function withHiddenPdfUi(url){
  const raw = String(url || "").trim();
  if(!raw || raw === "about:blank") return raw;

  const desired = {
    toolbar: "0",
    navpanes: "0",
    scrollbar: "0",
    statusbar: "0",
    messages: "0"
  };

  const hashIndex = raw.indexOf("#");
  const base = (hashIndex >= 0) ? raw.slice(0, hashIndex) : raw;
  const frag = (hashIndex >= 0) ? raw.slice(hashIndex + 1) : "";

  const parts = frag ? frag.split("&").filter(Boolean) : [];
  const present = new Set();
  for(const p of parts){
    const k = String(p.split("=")[0] || "").toLowerCase();
    if(k) present.add(k);
  }
  for(const k of Object.keys(desired)){
    if(!present.has(k)) parts.push(`${k}=${desired[k]}`);
  }

  const nextFrag = parts.join("&");
  return base + "#" + nextFrag;
}

async function __payrollGetPDFJS(){
  // pdf.js (render su canvas) — caricato on-demand
  if(globalThis.pdfjsLib && globalThis.pdfjsLib.getDocument) return globalThis.pdfjsLib;

  if(!globalThis.__PAYROLL_PDFJS_PROMISE__){
    globalThis.__PAYROLL_PDFJS_PROMISE__ = (async ()=>{
      const base = "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/";
      await __payrollLoadScript(base + "pdf.min.js");
      if(!globalThis.pdfjsLib || !globalThis.pdfjsLib.getDocument) throw new Error("pdf.js non disponibile");
      try{ globalThis.pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js"; }catch(_e){}
      return globalThis.pdfjsLib;
    })();
  }

  return await globalThis.__PAYROLL_PDFJS_PROMISE__;
}

async function renderPdfPreview(url){
  const overlay = U("pdfPreviewOverlay");
  const wrap = U("pdfPreviewCanvasWrap");
  const frame = U("pdfPreviewFrame");

  const src = String(url || "").trim();
  if(!wrap || !overlay) return;

  // Se l'overlay è già chiuso, evita lavoro inutile
  if(overlay.getAttribute("aria-hidden") !== "false") return;

  // reset UI
  try{ wrap.innerHTML = ""; wrap.scrollTop = 0; }catch(_e){}
  try{ wrap.style.display = "flex"; }catch(_e){}
  try{ if(frame){ frame.style.display = "none"; frame.src = "about:blank"; } }catch(_e){}

  if(!src) return;

  N.ui = N.ui || {};
  N.ui.pdfPreview = N.ui.pdfPreview || {};

  // token per interrompere render se chiudi/cambi PDF
  const token = String(Date.now()) + ":" + Math.random().toString(16).slice(2);
  N.ui.pdfPreview._renderToken = token;

  // interrompi eventuale task precedente
  try{
    if(N.ui.pdfPreview._pdfTask && typeof N.ui.pdfPreview._pdfTask.destroy === "function"){
      N.ui.pdfPreview._pdfTask.destroy();
    }
  }catch(_e){}
  N.ui.pdfPreview._pdfTask = null;

  let pdfjs = null;
  try{
    pdfjs = await __payrollGetPDFJS();
  }catch(err){
    pdfjs = null;
  }

  // Se pdf.js non disponibile, fallback iframe (meno “pulito”, ma almeno funziona)
  if(!pdfjs){
    if(frame){
      try{ frame.style.display = "block"; }catch(_e){}
      try{ frame.src = withHiddenPdfUi(src); }catch(_e){}
    }
    return;
  }

  try{
    const task = pdfjs.getDocument({ url: src });
    N.ui.pdfPreview._pdfTask = task;

    const pdf = await task.promise;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const targetWidth = Math.max(320, (wrap.clientWidth || window.innerWidth || 1024) - 20);

    for(let pageNum = 1; pageNum <= pdf.numPages; pageNum++){
      if(N.ui.pdfPreview._renderToken !== token) break;
      if(overlay.getAttribute("aria-hidden") !== "false") break;

      const page = await pdf.getPage(pageNum);

      // calcola scala per larghezza
      const baseVp = page.getViewport({ scale: 1 });
      const scale = targetWidth / baseVp.width;
      const vp = page.getViewport({ scale: scale * dpr });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = Math.floor(vp.width / dpr) + "px";
      canvas.style.height = Math.floor(vp.height / dpr) + "px";
      canvas.style.display = "block";
      canvas.style.background = "#fff";

      const pageWrap = document.createElement("div");
      pageWrap.className = "pdfPreviewPage";
      pageWrap.appendChild(canvas);
      wrap.appendChild(pageWrap);

      const ctx = canvas.getContext("2d", { alpha: false });
      // fondo bianco (evita trasparenze)
      if(ctx){
        try{
          ctx.save();
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }catch(_e){}
      }

      const renderTask = page.render({ canvasContext: ctx, viewport: vp });
      await renderTask.promise;
    }

    try{ pdf.cleanup?.(); }catch(_e){}
  }catch(err){
    console.warn("pdf preview render failed", err);
    if(frame){
      try{ frame.style.display = "block"; }catch(_e){}
      try{ frame.src = withHiddenPdfUi(src); }catch(_e){}
    }
  }
}

      
function showPdfPreview({ title, sub, srcUrl, fileName, markOpenedVia } = {}){
        const overlay = U("pdfPreviewOverlay");
        const frame = U("pdfPreviewFrame");
        const t = U("pdfPreviewTitle");
        const s = U("pdfPreviewSub");
        if(!overlay || !frame) return;

        // Evita warning aria-hidden: gestisci il focus
        try{ window.__lastFocusPdf__ = document.activeElement || null; }catch(_e){ window.__lastFocusPdf__ = null; }
        try{ overlay.removeAttribute("inert"); }catch(_e){}

        N.ui = N.ui || {};
        N.ui.pdfPreview = N.ui.pdfPreview || { objectUrl:"", directUrl:"", fileName:"" };

        const nextUrl = srcUrl || "";
        const prevObjUrl = N.ui.pdfPreview.objectUrl || "";

        // cleanup old object URL (evita di revocare quello che stiamo per mostrare)
        try{
          if(prevObjUrl && prevObjUrl !== nextUrl){
            URL.revokeObjectURL(prevObjUrl);
          }
        }catch(_e){}

        N.ui.pdfPreview.directUrl = nextUrl;
        N.ui.pdfPreview.objectUrl = (nextUrl && String(nextUrl).startsWith("blob:")) ? nextUrl : "";
        N.ui.pdfPreview.fileName = fileName || "busta_paga.pdf";
        N.ui.pdfPreview.title = title || "Anteprima PDF";
        N.ui.pdfPreview.sub = sub || "—";

        if(t) t.textContent = N.ui.pdfPreview.title;
        if(s) s.textContent = N.ui.pdfPreview.sub;

        // Render PDF full-screen senza toolbar (canvas via pdf.js). Fallback iframe se serve.
try{ frame.src = "about:blank"; }catch(_e){}
try{ frame.style.display = "none"; }catch(_e){}
try{
  const wrap = U("pdfPreviewCanvasWrap");
  if(wrap){ wrap.innerHTML = ""; wrap.scrollTop = 0; }
}catch(_e){}

overlay.setAttribute("aria-hidden","false");
        document.body.classList.add("modalOpen");
        updateModalOpenState();
// Render del PDF (solo pagina, niente UI)
setTimeout(()=>{ try{ renderPdfPreview(N.ui?.pdfPreview?.directUrl || ""); }catch(_e){} }, 0);



        setTimeout(()=>{ try{ U("btnPdfPreviewClose")?.focus?.(); }catch(_e){} }, 10);

        try{
          if(markOpenedVia) markPayrollDocOpened(markOpenedVia);
        }catch(_e){}
      }


function closePdfPreview(){
        const overlay = U("pdfPreviewOverlay");
        const frame = U("pdfPreviewFrame");
        if(!overlay || !frame) return;

        try{
          if(document.activeElement && overlay.contains(document.activeElement)) document.activeElement.blur();
        }catch(_e){}

        overlay.setAttribute("aria-hidden","true");
        try{ overlay.setAttribute("inert",""); }catch(_e){}
        document.body.classList.remove("modalOpen");
        updateModalOpenState();
        try{ frame.src = "about:blank"; }catch(_e){}
try{ frame.style.display = "none"; }catch(_e){}
try{
  const wrap = U("pdfPreviewCanvasWrap");
  if(wrap) wrap.innerHTML = "";
}catch(_e){}
try{
  if(N.ui?.pdfPreview){
    N.ui.pdfPreview._renderToken = "";
    if(N.ui.pdfPreview._pdfTask && typeof N.ui.pdfPreview._pdfTask.destroy === "function"){
      N.ui.pdfPreview._pdfTask.destroy();
    }
    N.ui.pdfPreview._pdfTask = null;
  }
}catch(_e){}

        try{
          if(N.ui?.pdfPreview?.objectUrl){
            URL.revokeObjectURL(N.ui.pdfPreview.objectUrl);
          }
        }catch(_e){}
        try{
          if(N.ui?.pdfPreview){
            N.ui.pdfPreview.objectUrl = "";
            N.ui.pdfPreview.directUrl = "";
            N.ui.pdfPreview.fileName = "";
          }
        }catch(_e){}

        setTimeout(()=>{ try{ window.__lastFocusPdf__?.focus?.(); }catch(_e){} }, 10);
      }

function buildSafePdfName(base){
        const clean = String(base||"busta_paga").trim()
          .replace(/[\/:*?"<>|]+/g," ")
          .replace(/\s+/g," ")
          .slice(0, 80);
        return (clean || "busta_paga") + ".pdf";
      }

      async function openPayrollPdfWindow(){
        const view = N.payroll.userView || (N.payroll.userView = {});
        if(!view.currentUrl){ try{ await Fi(); }catch(_e){} }
        const url = view.currentUrl || "";
        if(!url){ Ve("PDF non pronto","Seleziona un mese disponibile."); return; }
        markPayrollDocOpened("pdf");
        let w=null;
        try{ w = window.open(url, "_blank"); }catch(_e){}
        if(!w){ try{ window.location.href = url; }catch(_e){} }
      }

      async function openPayrollPreviewPage(){
        const view = N.payroll.userView || (N.payroll.userView = {});
        if(!view.currentUrl){ try{ await Fi(); }catch(_e){} }
        const url = view.currentUrl || "";
        if(!url){ Ve("PDF non pronto","Seleziona un mese disponibile."); return; }

        const docs = view.docs || [];
        const current = docs.find(d=>d.monthKey===view.selectedMonth) || docs[0] || {};
        const month = current.monthKey || view.selectedMonth || "—";
        const amount = current.netPayText || "";
        const title = `Busta paga · ${getDisplayNameFromUser()}`;
        const sub = `${formatPayrollMonthLabel(month)}${amount ? " · " + amount : ""}`;

        const fnameBase = `${getDisplayNameFromUser()} ${month}`.trim();
        showPdfPreview({
          title,
          sub,
          srcUrl: url,
          fileName: buildSafePdfName(fnameBase),
          markOpenedVia: "preview"
        });
      }

      // === Payroll: helpers mancanti (fix ReferenceError) ===
      function formatPayrollMonthLabel(monthKey){
        const mk = normalizeMonthKey(monthKey) || String(monthKey||"").trim();
        const m = mk.match(/^(\d{4})-(\d{2})$/);
        if(!m) return mk || "—";
        const y = Number(m[1]);
        const mm = Number(m[2]);
        try{
          const d = new Date(y, mm-1, 1);
          const fmt = new Intl.DateTimeFormat("it-IT", { month:"long", year:"numeric" });
          const s = fmt.format(d);
          return s ? (s.charAt(0).toUpperCase() + s.slice(1)) : mk;
        }catch(_e){}
        return `${m[2]}/${m[1]}`;
      }

      function renderPayrollUserList(){
        const list = U("payrollUserList");
        const chips = U("payrollMonthChips");
        const badge = U("payrollUserMonthBadge");
        const meta = U("payrollUserMeta");

        const docsRaw = (N.payroll?.userView?.docs || []);
        const docs = Array.isArray(docsRaw) ? docsRaw.slice() : [];
        const selected = normalizeMonthKey(N.payroll?.userView?.selectedMonth || "");

        if(badge){
          badge.textContent = selected ? formatPayrollMonthLabel(selected) : "Seleziona un mese";
        }
        if(meta){
          meta.textContent = docs.length ? `${docs.length} mesi disponibili` : "Nessuna busta paga trovata";
        }
        if(!list) return;

        if(!docs.length){
          list.innerHTML = '<div class="pcHint">Nessun mese disponibile.</div>';
          return;
        }

        // Unico per monthKey (se ci sono duplicati teniamo l'ultimo)
        const byMonth = {};
        docs.forEach(d=>{
          const mk = normalizeMonthKey(d?.monthKey || d?.month || "");
          if(!mk) return;
          const prev = byMonth[mk];
          const prevTs = prev?.updatedAtClient || prev?.updatedAt || 0;
          const curTs = d?.updatedAtClient || d?.updatedAt || 0;
          if(!prev || curTs >= prevTs) byMonth[mk] = d;
        });

        const items = Object.keys(byMonth)
          .sort((a,b)=> String(b).localeCompare(String(a)))
          .map(k=>({ monthKey:k, ...byMonth[k] }));

        list.innerHTML = items.map(item=>{
          const mk = normalizeMonthKey(item.monthKey || "");
          const isSel = !!(selected && mk === selected);
          const amount = item.netPayText ? String(item.netPayText) : "";
          const pages = (item.pagesCount != null) ? `${item.pagesCount}p` : "";
          const sub = [amount, pages].filter(Boolean).join(" · ");
          const hasPdf = !!(item.downloadUrl || item.url || item.pdfUrl);
          const statusBadge = hasPdf ? `<span class="pcHint">Disponibile</span>`
                                : `<span class="pcHint">Nessun PDF</span>`;
          return `
            <div class="payrollUserRow ${isSel ? "active":""}" data-payroll-select-month="${Ao(mk)}">
              <div style="min-width:0">
                <div class="pcTitle" style="font-size:15px;margin:0">${Ao(formatPayrollMonthLabel(mk))}</div>
                <div class="pcSub">${Ao(sub || "—")}</div>
              </div>
              <div>${statusBadge}</div>
            </div>
          `;
        }).join("");
        // Chips orizzontali (mobile-first)
        if(chips){
          const fallbackSel = (!selected && items.length) ? normalizeMonthKey(items[0].monthKey||"") : selected;
          chips.innerHTML = items.map(item=>{
            const mk = normalizeMonthKey(item.monthKey || "");
            const isSel = !!(fallbackSel && mk === fallbackSel);
            const label = formatPayrollMonthLabel(mk) || mk || "—";
            return `
              <button type="button" class="monthChip ${isSel ? "active":""}" data-payroll-select-month="${Ao(mk)}" aria-pressed="${isSel ? "true":"false"}">
                ${Ao(label)}
              </button>
            `;
          }).join("");
          if(!chips.__bound){
            chips.__bound = true;
            chips.addEventListener("click", (ev)=>{
              const btn = ev.target?.closest?.("[data-payroll-select-month]");
              if(btn){
                const mk = btn.getAttribute("data-payroll-select-month") || "";
                N.payroll = N.payroll || {};
                N.payroll.userView = N.payroll.userView || {};
                N.payroll.userView.selectedMonth = mk;
                Ri();
              }
            });
          }
        }


        // Event delegation (bind una sola volta)
        if(!list.__bound){
          list.__bound = true;
          list.addEventListener("click", (ev)=>{
            const row = ev.target?.closest?.("[data-payroll-select-month]");
            if(row){
              const mk = row.getAttribute("data-payroll-select-month") || "";
              N.payroll = N.payroll || {};
              N.payroll.userView = N.payroll.userView || {};
              N.payroll.userView.selectedMonth = mk;
              Ri();
            }
          });
        }
      }

      // Alias di compatibilità: alcune parti del codice chiamano ancora renderPayrollUserView()
      function renderPayrollUserView(){
        try{
          if(typeof Ri === "function"){ Ri(); return; }
          if(typeof renderPayrollUserList === "function"){ renderPayrollUserList(); }
        }catch(err){
          console.warn("renderPayrollUserView failed", err);
        }
      }




      function Ri(){
        const view = N.payroll?.userView || {};
        const docs = view.docs || [];
        const select = U("payrollMonthSelect");
        const badgeMonth = U("payrollUserMonthBadge");
        const badgeAmount = U("payrollUserAmountBadge");
        const greetingSub = U("payrollGreetingSub");
        const net = U("payrollUserNet");
        const meta = U("payrollUserDocMeta");
        const date = U("payrollUserDate");
        const errBox = U("payrollUserError");

        const filtered = view.searchTerm ? (view.filteredMonths || []) : (view.months || []);
        const options = (filtered && filtered.length) ? filtered : (view.months || []);

        if(errBox){
          const msg = String(view.error||"").trim();
          errBox.style.display = msg ? "block" : "none";
          errBox.textContent = msg || "";
        }

        if(select){
          if(!docs.length){
            select.innerHTML = `<option value="">Nessun mese disponibile</option>`;
            select.disabled = true;
          }else{
            if(!view.selectedMonth || !options.includes(view.selectedMonth)){
              view.selectedMonth = options[0] || docs[0]?.monthKey || "";
            }
            const listMonths = (options.length ? options : docs.map(d=>d.monthKey)).filter(Boolean);
            select.innerHTML = listMonths.map(m=> {
              const label = formatPayrollMonthLabel(m);
              const sel = (m===view.selectedMonth) ? " selected" : "";
              return `<option value="${Ao(m)}"${sel}>${Ao(label)}</option>`;
            }).join("");
            select.disabled = false;
            select.value = view.selectedMonth || "";
            select.onchange = ()=>{ view.selectedMonth = select.value; Ri(); };
          }
        }

        const current = docs.find(d=>d.monthKey===view.selectedMonth) || docs[0] || null;
        if(current){
          const label = formatPayrollMonthLabel(current.monthKey || "");
          badgeMonth && (badgeMonth.textContent = label || current.monthKey || "—");
          badgeAmount && (badgeAmount.textContent = current.netPayText || "—");
          net && (net.textContent = current.netPayText || "—");
          const file = current.fileName || "";
          if(meta){
            // Documento principale: label + valore (più leggibile su mobile)
            meta.innerHTML = "";
            const l = document.createElement("div");
            l.className = "payrollMetaLabel";
            l.textContent = "Documento principale";
            const v = document.createElement("div");
            v.className = "payrollMetaValue";
            v.textContent = file ? file : (label || current.monthKey || "—");
            meta.appendChild(l);
            meta.appendChild(v);
          }
          date && (date.textContent = current.updatedAt || "Aggiornato —");
          greetingSub && (greetingSub.textContent = "Seleziona un mese e apri il PDF.");
          view.currentUrl = current.downloadUrl || "";
          view.currentDocKey = current.docId || "";
        }else{
          badgeMonth && (badgeMonth.textContent = "—");
          badgeAmount && (badgeAmount.textContent = "—");
          net && (net.textContent = "—");
          meta && (meta.textContent = "Documento: —");
          date && (date.textContent = "Aggiornato —");
          view.currentUrl = "";
          greetingSub && (greetingSub.textContent = "Nessun documento disponibile. Se sei admin, carica e invia. Se sei dipendente, attendi la pubblicazione.");
        }

        renderPayrollUserList();
      }


            async function Fi() {
              const view = N.payroll.userView = N.payroll.userView || {};
              // reset
              try{ if(view.unsub){ view.unsub(); } }catch(_e){}
              view.unsub = null;

              if(!(N.firebase && N.firebase.ok)){
                view.loading = false;
                view.ready = true;
                view.error = "Firebase non pronto.";
                renderPayrollUserView();
                return;
              }

              view.loading = true;
              view.ready = false;
              view.error = "";
              renderPayrollUserView();

              const api = N.firebase.api, db = N.firebase.db;
              const emailLower = normalizeEmail(view.emailLower || N.user?.emailLower || (N.user?.email || "").toLowerCase());
              view.emailLower = emailLower;

              if(!emailLower){
                view.loading = false;
                view.ready = true;
                view.error = "Email utente non valida.";
                renderPayrollUserView();
                return;
              }

              const cols = (typeof PAYROLL_DOC_COLS!=="undefined" ? PAYROLL_DOC_COLS : [COL_PAYROLL_DOCS, COL_PAYROLL_DOCS_LEGACY].filter(Boolean));

              const mapDoc = (docSnap, col) => {
                const d = docSnap.data() || {};
                const mk = normalizeMonthKey(d.monthKey || "");
                let updatedAtMs = 0;
                try{
                  const ts = d.updatedAt;
                  if(ts && typeof ts.toMillis === "function") updatedAtMs = ts.toMillis();
                  else if(ts && typeof ts.seconds === "number") updatedAtMs = ts.seconds * 1000;
                }catch(_e){}
                return {
                  docId: docSnap.id,
                  monthKey: mk || "",
                  netPayText: d.netPayText || "",
                  netPayCents: typeof d.netPayCents === "number" ? d.netPayCents : null,
                  fileName: d.fileName || d.sourceFileName || "busta_paga.pdf",
                  pagesCount: Array.isArray(d.pageIndices) ? d.pageIndices.length : (d.pagesCount ?? null),
                  downloadUrl: d.downloadUrl || d.pdfUrl || d.url || "",
                  storagePath: d.storagePath || "",
                  updatedAtMs,
                  updatedAt: (()=>{ try{ return d.updatedAt?.toDate ? d.updatedAt.toDate().toLocaleString("it-IT") : ""; }catch(_e){ return ""; } })(),
                  _col: col || ""
                };
              };

              const dedupeByMonth = (docs) => {
                const best = {};
                for(const d of (docs || [])){
                  const mk = d.monthKey || "";
                  if(!mk) continue;
                  if(!best[mk]){ best[mk] = d; continue; }
                  const cur = best[mk];
                  const score = (x)=> (x.updatedAtMs || 0) + (x.downloadUrl ? 1e13 : 0);
                  if(score(d) > score(cur)) best[mk] = d;
                }
                return Object.values(best).sort((a,b)=> String(b.monthKey).localeCompare(String(a.monthKey)));
              };

              const applyDocs = (rawDocs) => {
                const docs = dedupeByMonth(rawDocs || []);
                view.docs = docs;
                view.months = docs.map(d=>d.monthKey);
                const current = normalizeMonthKey(view.selectedMonth || "");
                if(!current || !view.months.includes(current)) view.selectedMonth = view.months[0] || "";
                const sel = docs.find(d=>d.monthKey === view.selectedMonth) || null;
                view.currentUrl = sel?.downloadUrl || "";
                view.currentDocKey = sel?.docId || "";
                view.currentCol = sel?._col || "";
                view.netPayText = sel?.netPayText || "";
                view.updatedAtText = sel?.updatedAt || "";
                view.pagesCount = sel?.pagesCount ?? null;
                view.fileName = sel?.fileName || "busta_paga.pdf";
                view.error = docs.length ? "" : "Nessuna busta paga trovata per questo utente.";
              };

              let usedCol = null;
              let watchQuery = null;
              let docsFound = [];

              // 1) Prova LIST/QUERY su payrollDocs e payrolls
              for(const col of cols){
                try{
                  const q = api.query(api.collection(db, col), api.where("emailLower","==",emailLower), api.limit(200));
                  const snap = await api.getDocs(q);
                  const docs = [];
                  snap?.forEach(ds=> docs.push(mapDoc(ds, col)));
                  if(docs.length){
                    usedCol = col;
                    watchQuery = q;
                    docsFound = docs;
                    break;
                  }
                  // conserva almeno il primo query per watch
                  if(!watchQuery){ usedCol = col; watchQuery = q; }
                }catch(err){
                  if(err?.code !== "permission-denied") console.warn("payroll user list", col, err);
                }
              }

              // 2) Se vuoto, prova INDEX + GET singoli docId
              if(!docsFound.length){
                try{
                  const idxRef = api.doc(db, "payrollIndex", emailLower);
                  const idxSnap = await api.getDoc(idxRef);
                  if(idxSnap?.exists()){
                    const idx = idxSnap.data() || {};
                    const months = Array.isArray(idx.months) ? idx.months : [];
                    const docsByMonth = (idx.docsByMonth && typeof idx.docsByMonth === "object") ? idx.docsByMonth : {};
                    const ids = months.slice(0, 24).map(m=> docsByMonth[m]?.docId || `${emailLower}_${m}`).filter(Boolean);
                    const out = [];
                    for(const id of ids){
                      const found = await tryGetPayrollDocSnap(api, db, id);
                      if(found?.snap && found.snap.exists()){
                        out.push(mapDoc(found.snap, found.col));
                      }
                    }
                    if(out.length) docsFound = out;
                  }
                }catch(err){
                  if(err?.code !== "permission-denied") console.warn("payroll index fallback", err);
                }
              }

              // 3) Ultimo tentativo: scan ultimi 36 mesi con docId deterministico
              if(!docsFound.length){
                try{
                  const keys = getRecentMonthKeys(36).map(m=>`${emailLower}_${m}`);
                  const out = [];
                  for(const id of keys){
                    const found = await tryGetPayrollDocSnap(api, db, id);
                    if(found?.snap && found.snap.exists()){
                      out.push(mapDoc(found.snap, found.col));
                    }
                  }
                  if(out.length) docsFound = out;
                }catch(_e){}
              }

              applyDocs(docsFound);
              view.loading = false;
              view.ready = true;
              renderPayrollUserView();

              // 4) Live watch (solo se abbiamo un query valido)
              if(watchQuery){
                try{
                  view.unsub = api.onSnapshot(watchQuery, snap=>{
                    try{
                      const docs = [];
                      snap?.forEach(ds=> docs.push(mapDoc(ds, usedCol)));
                      applyDocs(docs);
                      renderPayrollUserView();
                    }catch(err){ console.warn("payroll user watch parse", err); }
                  }, err=>{
                    if(err?.code !== "permission-denied") console.warn("payroll user watch", err);
                  });
                }catch(err){
                  if(err?.code !== "permission-denied") console.warn("payroll user watch start", err);
                }
              }
            }

      function stopPayrollUserDocsWatch(){
        try{
          const view = N.payroll?.userView;
          if(view?.unsub){ try{ view.unsub(); }catch(_e){} }
          if(view){
            view.unsub = null;
            view.live = false;
            view._watchEmail = "";
          }
        }catch(_e){}
      }

      function startPayrollUserDocsWatch(){
        // Delegato a Fi(): gestisce sia query che fallback (no LIST)
        try{ Fi(); }catch(_e){}
      }


      function onSignedIn(){
        try{ D(); }catch(_e){}
        try{
          if(N.user && N.user.email) N.user.emailLower = String(N.user.email).toLowerCase();
          N.payroll = N.payroll || {};
          N.payroll.userView = N.payroll.userView || {};
          N.payroll.userView.emailLower = N.user?.emailLower || N.payroll.userView.emailLower || "";
        }catch(_e){}
        // Entitlements (Premium / prova gratuita): sync da localStorage + async da server
        try{ readLocalPayrollEntitlements(); }catch(_e){}
        try{ updateAuthUI(); }catch(_e){}
        try{ loadPayrollEntitlementsFromServer(); }catch(_e){}
        try{
          const u = new URL(location.href);
          const p = u.searchParams;

          // Rientro da Stripe Checkout: aggiorna subito Premium
          if(p.get("premium") === "success"){
            // Rientro da Stripe: avvia sincronizzazione Premium (il webhook può impiegare qualche secondo)
            try{
              if(N.user){
                N.user.premiumSyncPending = true;
                N.user.premiumSyncStartedAt = Date.now();
                N.user.payrollUsageLoaded = false;
                N.user.payrollUsageLoading = false;
                N.user.payrollUsageError = "";
              }
            }catch(_e){}
            try{ updateAuthUI(); }catch(_e){}
            try{ showToast("Premium", "Pagamento completato. Sto sincronizzando l’abbonamento…", 2600); }catch(_e){}
            try{ syncPayrollEntitlementsFromIdToken(true); }catch(_e){}
            try{ loadPayrollEntitlementsFromServer(true); }catch(_e){}
            try{
              p.delete("premium"); p.delete("session_id");
              history.replaceState({}, "", u.toString());
            }catch(_e){}
          }else if(p.get("premium") === "cancel" || p.get("premium_cancel") === "1"){
            try{ showToast("Pagamento annullato", "Nessun addebito. Puoi riprovare quando vuoi.", 2600); }catch(_e){}
            try{
              p.delete("premium"); p.delete("premium_cancel"); p.delete("session_id");
              history.replaceState({}, "", u.toString());
            }catch(_e){}
          }
        }catch(_e){}

        try{ Oi(); }catch(_e){}
        try{ Fi(); }catch(_e){}
        try{ startPayrollUserDocsWatch(); }catch(_e){}
        try{ startPayrollDirectoryWatch(); }catch(_e){}
        try{ if(N.user?.isAdmin || N.user?.isWhitelisted !== false) startPayrollUserDocsWatch(); else { N.payroll.userView = N.payroll.userView || {}; N.payroll.userView.error = "Non sei abilitato alle buste paga."; N.payroll.userView.ready = false; Oi(); } }catch(_e){}
        try{ /* directory handled by watch */ }catch(_e){}
        // Riprendi invio se avevi cliccato "Invia" da ospite
        try{
          const a = N.payroll?.admin;
          const pending = (a && a._sendAfterLogin) || (sessionStorage.getItem("payroll_send_after_login")==="1");
          if(pending){
            if(a) a._sendAfterLogin = false;
            try{ sessionStorage.removeItem("payroll_send_after_login"); }catch(_e){}
            if(a && a.step === "match" && a.originalPdfBytes){
              setTimeout(()=>{ try{ Yi(); }catch(err){ console.warn("resume send", err); } }, 250);
            }
          }
        }catch(_e){}
        try{ /* absences load: lazy */ }catch(_e){}
      }

      function onSignedOut(){
        try{ stopPayrollUserDocsWatch(); }catch(_e){}
        try{ N.payroll?.directory?.unsub && N.payroll.directory.unsub(); }catch(_e){}
        try{ stopPayrollSendDocWatches && stopPayrollSendDocWatches(); }catch(_e){}
        try{ D(); }catch(_e){}
        try{ Oi(); }catch(_e){}
        try{ state.absences = { list:[], filters:{ status:"", type:"", search:"" }, loading:false }; renderAbsenceAdminList(); }catch(_e){}
      }

      function setExtractEndpoint(url){
        if(url && typeof url==="string") globalThis.__PAYROLL_EXTRACT_ENDPOINT__ = url.trim();
        return globalThis.__PAYROLL_EXTRACT_ENDPOINT__ || "";
      }

      return {
        onSignedIn,
        onSignedOut,
        setExtractEndpoint,
        openUser: ()=>{ try{ scrollToSection("userArea"); }catch(_e){} },
        openAdmin: ()=>{ try{ openAdminModalFlow(); }catch(_e){} },
        reset: ()=>{ try{ ji(); }catch(_e){} },
      };
    })();

    async function initFirebase(){
      try{
                // Firebase SDK loader con fallback CDN (utile se www.gstatic.com è bloccato da rete/adblock)
        const FIREBASE_VER = "12.7.0";
        const cdnAttempts = [
          { name: "gstatic", base: "https://www.gstatic.com/firebasejs/" + FIREBASE_VER + "/" },
          { name: "jsdelivr", base: "https://cdn.jsdelivr.net/npm/firebase@" + FIREBASE_VER + "/" },
          { name: "unpkg", base: "https://unpkg.com/firebase@" + FIREBASE_VER + "/" }
        ];
        let mods = null;
        let loadedFrom = "";
        let lastErr = null;
        for(const a of cdnAttempts){
          try{
            mods = await Promise.all([
              import(a.base + "firebase-app.js"),
              import(a.base + "firebase-auth.js"),
              import(a.base + "firebase-firestore.js"),
              import(a.base + "firebase-storage.js"),
              import(a.base + "firebase-app-check.js")
            ]);
            loadedFrom = a.name;
            break;
          }catch(err){
            lastErr = err;
            console.warn("Firebase CDN load failed:", a.name, err);
          }
        }
        if(!mods) throw lastErr || new Error("Firebase SDK non disponibile");
        const [{ initializeApp }, authMod, fsMod, storageMod, appCheckMod] = mods;
        try{ console.info("✅ Firebase SDK loaded from", loadedFrom); }catch(_e){}
const app = initializeApp(firebaseConfig);
        // --- Firebase App Check (reCAPTCHA v3) ---
        let appCheck = null;
        try{
          if(APPCHECK_SITE_KEY && !String(APPCHECK_SITE_KEY).includes("RECAPTCHA_SITE_KEY_HERE")){
            appCheck = appCheckMod.initializeAppCheck(app, {
              provider: new appCheckMod.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
              isTokenAutoRefreshEnabled: true
            });
          }else{
            console.warn("⚠️ App Check: imposta APPCHECK_SITE_KEY (reCAPTCHA site key) per proteggere le API.");
          }
        }catch(e){
          console.warn("App Check init", e);
        }

        const auth = authMod.getAuth(app);

        // Mantieni l'accesso tra pagine/redirect (stesso dominio) + supporto popup bloccati
        async function setBestAuthPersistence(authApi, auth){
          // In modalità app (iOS standalone) evitiamo browserSessionPersistence: può "spostare" la sessione in sessionStorage
          // e far perdere l'accesso alle altre pagine. Preferiamo sempre persistenze "local".
          const ua = String(navigator.userAgent || "").toLowerCase();
          const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform==="MacIntel" && (navigator.maxTouchPoints||0) > 1);
          const isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator.standalone === true);

          const preferred = (isIOS && isStandalone)
            ? [authApi.browserLocalPersistence, authApi.indexedDBLocalPersistence]
            : [authApi.indexedDBLocalPersistence, authApi.browserLocalPersistence];

          const attempts = preferred.filter(Boolean);
          for(const p of attempts){
            try{
              await authApi.setPersistence(auth, p);
              return true;
            }catch(_e){}
          }
          return false;
        }
        try{ await setBestAuthPersistence(authMod, auth); }catch(e){ console.warn('auth persistence', e); }
        // Login/Redirect non gestiti qui: questa pagina non deve MAI avviare login.
        const db = fsMod.getFirestore(app);
        const storage = storageMod.getStorage(app);
        state.firebase = {
          ok: true,
          app,
          auth,
          db,
          storage,
          appCheck,
          appCheckApi: { getToken: appCheckMod.getToken, getLimitedUseToken: appCheckMod.getLimitedUseToken },
          api: {
            collection: fsMod.collection,
            doc: fsMod.doc,
            addDoc: fsMod.addDoc,
            getDoc: fsMod.getDoc,
            setDoc: fsMod.setDoc,
            updateDoc: fsMod.updateDoc,
            deleteDoc: fsMod.deleteDoc,
            serverTimestamp: fsMod.serverTimestamp,
            query: fsMod.query,
            where: fsMod.where,
            orderBy: fsMod.orderBy,
            limit: fsMod.limit,
            getDocs: fsMod.getDocs,
            onSnapshot: fsMod.onSnapshot
          },
          authApi: authMod,
          storageApi: {
            ref: storageMod.ref,
            uploadBytes: storageMod.uploadBytes,
            getDownloadURL: storageMod.getDownloadURL
          }
        };

        // UI immediata: niente schermate di caricamento (abilita subito "Accedi")
        try{ updateAuthUI(); }catch(_e){}

        // === Google Sign-In (indipendente: accedi/esci qui) ===
        const googleProvider = new authMod.GoogleAuthProvider();
        try{ googleProvider.setCustomParameters({ prompt: "select_account" }); }catch(_e){}

        const __ua = String(navigator.userAgent || "").toLowerCase();
        const __isIOS = /iphone|ipad|ipod/.test(__ua) || (navigator.platform==="MacIntel" && (navigator.maxTouchPoints||0) > 1);
        const __isStandalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || (navigator.standalone === true);
        const __preferRedirect = (__isIOS);

                function describeAuthError(err){
          try{
            const code = String(err?.code || "");
            const msg = String(err?.message || "");
            const host = (typeof location !== "undefined" && location.hostname) ? location.hostname : "";
            if(code === "auth/unauthorized-domain"){
              return {
                title: "Dominio non autorizzato",
                body: host
                  ? `In Firebase Console → Authentication → Settings → Authorized domains aggiungi: ${host}.`
                  : "Dominio non autorizzato in Firebase Auth."
              };
            }
            if(code === "auth/popup-blocked"){
              return { title: "Popup bloccato", body: "Il browser ha bloccato il popup. Riprova o usa il login tramite redirect." };
            }
            if(code === "auth/popup-closed-by-user"){
              return { title: "Accesso annullato", body: "Hai chiuso il popup. Riprova quando vuoi." };
            }
            if(code === "auth/cancelled-popup-request"){
              return { title: "Accesso annullato", body: "Richiesta annullata. Riprova." };
            }
            if(code){
              return { title: "Accesso non riuscito", body: `${code}${msg ? " · " + msg : ""}` };
            }
            return { title: "Accesso non riuscito", body: msg || "Operazione non completata." };
          }catch(_e){
            return { title: "Accesso non riuscito", body: "Operazione non completata." };
          }
        }

        async function signInWithGoogle(){
          try{
            // Best-effort: persistenza (aiuta a mantenere la sessione tra pagine/refresh)
            try{ await setBestAuthPersistence(authMod, auth); }catch(_e){}

            // Desktop: prova popup (più affidabile in alcuni hosting). iOS PWA/standalone: preferisci redirect.
            const preferRedirect = !!__preferRedirect;

            if(!preferRedirect){
              try{
                try{ markAuthInflight("Accedi con Google", "login_popup"); }catch(_e){}
                await authMod.signInWithPopup(auth, googleProvider);
                return;
              }catch(err){
                const code = String(err?.code || "");
                // Se l'utente chiude il popup, non forzare redirect.
                if(code === "auth/popup-closed-by-user"){
                  try{ clearAuthInflight(); }catch(_e){}
                  const d = describeAuthError(err);
                  showToast(d.title, d.body, 2600);
                  return;
                }
                // Fallback a redirect (popup bloccato / ambiente non supportato / COOP warning, ecc.)
                console.warn("google popup fallback → redirect", err);
              }
            }

            try{ markAuthInflight("Accedi con Google", "login_redirect"); }catch(_e){}
            await authMod.signInWithRedirect(auth, googleProvider);
            return;
          }catch(err){
            console.warn("google login", err);
            try{ clearAuthInflight(); }catch(_e){}
            const d = describeAuthError(err);
            showToast(d.title, d.body, 5200);
          }
        }

        async function signOutGoogle(){
          try{
            await authMod.signOut(auth);
            try{ localStorage.removeItem(LS_AUTH_OK); localStorage.removeItem(LS_AUTH_EMAIL); }catch(_e){}
          }catch(err){
            console.warn("logout", err);
            showToast("Logout non riuscito", err?.message || String(err));
          }
        }

        // Esponi azioni auth (usate anche dal CTA upload)
        try{
          state.authActions = {
            signIn: signInWithGoogle,
            signInRedirect: ()=> authMod.signInWithRedirect(auth, googleProvider),
            signOut: signOutGoogle
          };
        }catch(_e){}

        // Wire UI buttons (header + overlay)
        try{
          document.getElementById("btnGoogleLogin")?.addEventListener("click", ()=>signInWithGoogle());
          document.getElementById("btnGoogleLoginOverlay")?.addEventListener("click", ()=>signInWithGoogle());
          document.getElementById("btnLogoutBottom")?.addEventListener("click", ()=>signOutGoogle());
          document.getElementById("btnLogout")?.addEventListener("click", ()=>signOutGoogle());
          document.getElementById("btnAuthBack")?.addEventListener("click", ()=>{
            toggleAuthOverlay(false);
          });
        }catch(_e){}

        // Redirect flow: se rientri dal login, intercetta errori (evita loop "silenziosi")
        try{
          await authMod.getRedirectResult(auth);
        }catch(err){
          console.warn("redirect result", err);
          try{ clearAuthInflight(); }catch(_e){}
          try{
            const d = (typeof describeAuthError === "function") ? describeAuthError(err) : { title:"Accesso non riuscito", body: (err?.message || String(err)) };
            showToast(d.title, d.body, 5200);
          }catch(_e){}
        }

        // Accesso anonimo DISATTIVATO: se non c'è sessione, resta signed-out e chiedi login Google.
// Role resolution (admin + whitelist) — evita query non autorizzate
        // Ruoli: su iLovePaghe ogni utente autenticato è admin
        async function resolveUserRole(_authUser){
          try{
            if(state.user){
              state.user.isAdmin = true;
              state.user.isWhitelisted = true;
            }
          }catch(_e){}
        }

// Auth gate: se la sessione esiste entri, altrimenti chiedi login Google.
        const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
        const LS_AUTH_OK = "ilovepaghe_auth_ok_ts_v1";
        const LS_AUTH_EMAIL = "ilovepaghe_auth_last_email_v1";
        const RESTORE_TIMEOUT_MS = 20000;
        const RESTORE_TIMEOUT_SHORT_MS = 1200;

        function isMobileAuth(){
          try{
            if(navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean"){
              return navigator.userAgentData.mobile;
            }
          }catch(_e){}
          const ua = (navigator.userAgent || navigator.vendor || "").toLowerCase();
          const uaMobile = /\b(android|mobile|iemobile|opera mini)\b/.test(ua) || /mobi/.test(ua);
          const coarse = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) || false;
          return uaMobile || coarse;
        }
        function recentAuthOkWithinTTL(){
          try{
            const ts = parseInt(localStorage.getItem(LS_AUTH_OK) || "0", 10);
            if(!Number.isFinite(ts) || ts<=0) return false;
            return (Date.now() - ts) < AUTH_TTL_MS;
          }catch(_e){ return false; }
        }
        function markAuthOk(email=""){
          try{
            localStorage.setItem(LS_AUTH_OK, String(Date.now()));
            if(email) localStorage.setItem(LS_AUTH_EMAIL, String(email));
          }catch(_e){}
        }

                // Evita che "Indietro" ti riporti su accounts.google.com dopo un login via redirect.
        (()=>{})();

        function openAuthOverlay(reason){
          try{
            const msg = reason || "Sessione non attiva. Accedi con Google per continuare.";
            state.authGateMessage = msg;
            state.authGateState = "signed_out";
            updateAuthUI();
            try{ showToast("Accesso richiesto", msg, 1800); }catch(_e){}
          }catch(_e){}
        }

        function clearRestoreTimeout(){
          if(globalThis.__BUSTE_RESTORE_T__){
            clearTimeout(globalThis.__BUSTE_RESTORE_T__);
            globalThis.__BUSTE_RESTORE_T__ = null;
          }
        }
        function startOrKeepRestoreTimeout(onExpire, ms){
          if(globalThis.__BUSTE_RESTORE_T__) return;
          const delay = Math.max(0, Number(ms) || RESTORE_TIMEOUT_MS);
          globalThis.__BUSTE_RESTORE_T__ = setTimeout(()=>{
            globalThis.__BUSTE_RESTORE_T__ = null;
            try{
              if(auth && auth.currentUser) return;
            }catch(_e){}
            if(typeof onExpire === "function") onExpire();
          }, delay);
        }
        function enterRestoringMode(message="Ripristino sessione…"){
          state.authGateState = "restoring";
          state.authGateMessage = message || "";
          updateAuthUI();
        }
        function enterSignedOut(message=""){
          state.authGateState = "signed_out";
          state.authGateMessage = message || "";
          updateAuthUI();
          //
        }
        function enterSignedIn(){
          state.authGateState = "signed_in";
          state.authGateMessage = "";
          updateAuthUI();
        }
        function handleAuthResume(){
          if(!isMobileAuth()) return;
          if(state.authGateState === "signed_out") return;
          if(auth && auth.currentUser) return;
          enterRestoringMode("Ripristino sessione…");
          startOrKeepRestoreTimeout(()=> enterSignedOut("Sessione non attiva. Accedi con Google per continuare."), (recentAuthOkWithinTTL() ? RESTORE_TIMEOUT_MS : RESTORE_TIMEOUT_SHORT_MS));
        }
        function wireAuthResumeHandlers(){
          if(globalThis.__BUSTE_AUTH_RESUME_BOUND__) return;
          globalThis.__BUSTE_AUTH_RESUME_BOUND__ = true;
          const resume = ()=> handleAuthResume();
          window.addEventListener("pageshow", resume);
          document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState === "visible") resume(); });
          window.addEventListener("focus", resume);
        }
        wireAuthResumeHandlers();

        // Prime UI: aspetta SEMPRE l’hydration auth (evita redirect prematuri / loop)
        if(isMobileAuth() && !auth.currentUser){
          enterRestoringMode("Ripristino sessione…");
          startOrKeepRestoreTimeout(()=> enterSignedOut("Sessione non attiva. Accedi con Google per continuare."), (recentAuthOkWithinTTL() ? RESTORE_TIMEOUT_MS : RESTORE_TIMEOUT_SHORT_MS));
        }

        authMod.onAuthStateChanged(auth, async user=>{
          state.authHydrated = true;
          const returningFromAuth = authInflight();
          if(user && user.isAnonymous){
            // Sessioni anonime non più abilitate: chiedi login Google.
            try{ await authMod.signOut(auth); }catch(_e){}
            try{ clearAuthInflight(); }catch(_e){}
            try{ state.user = null; }catch(_e){}
            try{ Payroll.onSignedOut(); }catch(_e){}
            try{ clearRestoreTimeout(); }catch(_e){}
            try{ enterSignedOut("Accesso anonimo disattivato. Accedi con Google per continuare."); }catch(_e){}
            try{ showToast("Accesso richiesto", "Accesso anonimo disattivato. Accedi con Google per continuare.", 2200); }catch(_e){}
            return;
          }
          if(user){
            try{ clearAuthInflight(); }catch(_e){}
            state.user = {
              uid: user.uid,
              email: user.email || "",
              emailLower: (user.email||"").toLowerCase(),
              isAnonymous: !!user.isAnonymous,
              displayName: (user.isAnonymous ? "Ospite" : (user.displayName || user.email || "Utente")),
              isAdmin: false,
              isWhitelisted: null,
              isPremium: false,
              payrollFreeUsed: false,
              payrollUsageLoaded: false,
              payrollUsageLoading: false,
              payrollUsageError: "",
              premiumSyncPending: false,
              premiumSyncStartedAt: 0
            };
            try{ clearRestoreTimeout(); }catch(_e){}
            try{ markAuthOk(user.email || ""); }catch(_e){}
            state.authGateState = "signed_in";
            // Premium gate: bootstrap rapido da localStorage (evita flicker)
            try{
              const used = localStorage.getItem("ilovepaghe_payroll_free_used_v1")==="1";
              if(used) state.user.payrollFreeUsed = true;
              const prem = localStorage.getItem("ilovepaghe_premium_override_v1")==="1";
              if(prem) state.user.isPremium = true;
            }catch(_e){}
            updateAuthUI();
            await resolveUserRole(user);
            updateAuthUI();
            Payroll.onSignedIn();
          
          }else{
            state.user = null;
            Payroll.onSignedOut();

            // Se stavamo rientrando da un login (redirect/back) ma non c'è una sessione,
            // evita loop silenziosi: avvisa l'utente e pulisci il flag.
            if(returningFromAuth){
              try{
                const msg = "Accesso annullato o non completato. Riprova ad accedere.";
                try{ showToast("Accesso non completato", msg, 2400); }catch(_e){}
              }catch(_e){
                try{ showToast("Accesso non completato", "Accesso non completato. Riprova.", 2400); }catch(_e2){}
              }
              try{ clearAuthInflight(); }catch(_e){}
            }

            if(isMobileAuth()){
              enterRestoringMode("Ripristino sessione…");
              startOrKeepRestoreTimeout(()=> enterSignedOut("Sessione non attiva. Accedi con Google per continuare."), (recentAuthOkWithinTTL() ? RESTORE_TIMEOUT_MS : RESTORE_TIMEOUT_SHORT_MS));
            }else{
              clearRestoreTimeout();
              enterSignedOut("Sessione non attiva. Accedi con Google per continuare.");
            }
          }
        });
}catch(err){
        console.error("Firebase init error", err);
        showToast("Errore Firebase", err?.message || String(err));
      }
    }

    updateAuthUI();
    initFirebase();
  