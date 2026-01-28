// dashboard.js — iLovePaghe (SPA dashboard)
const initPagheiaDashboard = () => {
  const root = document.getElementById("dashboardView");
  if(!root) return;
  if(root.dataset.bound === "true") return;
  root.dataset.bound = "true";
  const $ = (id) => document.getElementById(id);

  // ===== Config Firebase (stesso progetto di pagheia.js) =====
  const firebaseConfig = {
    apiKey: "AIzaSyD_2Eb6ni7E08hUbEkozP85LzyfesutO6M",
    authDomain: "ilovepaghe-ludo-2026.firebaseapp.com",
    projectId: "ilovepaghe-ludo-2026",
    storageBucket: "ilovepaghe-ludo-2026.firebasestorage.app",
    messagingSenderId: "162609991629",
    appId: "1:162609991629:web:5e4b367a928fe8e4823e84"
  };

  const APPCHECK_SITE_KEY = "6LcwcVUsAAAAAK4A6obrpGbGFHYGw3Wparj1626K"; // reCAPTCHA v3 site key (public)
  const FIREBASE_VER = "12.7.0";
  const CDN_BASES = [
    { name: "gstatic", base: `https://www.gstatic.com/firebasejs/${FIREBASE_VER}/` },
    { name: "jsdelivr", base: `https://cdn.jsdelivr.net/npm/firebase@${FIREBASE_VER}/` },
    { name: "unpkg", base: `https://unpkg.com/firebase@${FIREBASE_VER}/` }
  ];

  // Billing (Stripe) — usa lo stesso override del progetto principale, se presente
  const PAYROLL_PREMIUM_PRICE_LABEL = "19,90 €/mese";
  const DEFAULT_BILLING_ENDPOINT = ""; // opzionale: puoi lasciarlo vuoto se setti globalThis.PAGHEIA_BILLING_ENDPOINT
  const COL_PAYROLL_USAGE = "payrollUsage";
  const COL_USER_PREFS = "userPrefs";
  const LS_SAVE_EMAILS = "payroll_save_emails_v1"; // compatibilità con pagheia.js

  function getBillingBase(){
    try{
      return String(
        globalThis.PAGHEIA_BILLING_ENDPOINT ||
        globalThis.PAGHEIA_BILLING_URL ||
        globalThis.PAGHEIA_PREMIUM_URL ||
        globalThis.BILLING_URL ||
        DEFAULT_BILLING_ENDPOINT ||
        ""
      ).trim();
    }catch(_e){ return (DEFAULT_BILLING_ENDPOINT || ""); }
  }

  // ===== UI helpers =====
  let toastTimer = null;
  function toast(msg, ms=2200){
    const el = $("toast");
    if(!el) return;
    el.textContent = String(msg || "").trim() || "Ok";
    el.setAttribute("aria-hidden", "false");
    try{ clearTimeout(toastTimer); }catch(_e){}
    toastTimer = setTimeout(() => {
      el.setAttribute("aria-hidden", "true");
    }, ms);
  }

  function setLoading(on){
    const el = $("loading");
    if(!el) return;
    el.style.display = on ? "flex" : "none";
  }

  function fmtDate(iso){
    try{
      if(!iso) return "—";
      const d = new Date(iso);
      if(Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleString("it-IT", { year:"numeric", month:"long", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    }catch(_e){ return "—"; }
  }

  function providerLabel(user){
    try{
      const p = (user?.providerData || []).map(x=>x?.providerId).filter(Boolean);
      if(p.includes("google.com")) return "Google";
      // Email link / password possono risultare "password"
      if(p.includes("password")) return "Email";
      if(p.length) return p[0];
      return "—";
    }catch(_e){ return "—"; }
  }

  // ===== SPA nav =====
  function setView(view){
    const views = ["profile","plans","settings"];
    for(const v of views){
      const sec = $(`view-${v}`);
      if(sec) sec.setAttribute("aria-hidden", v === view ? "false" : "true");
    }
    const items = document.querySelectorAll(".navItem");
    items.forEach(btn => {
      const is = btn?.getAttribute("data-view") === view;
      if(is) btn.setAttribute("aria-current", "page");
      else btn.removeAttribute("aria-current");
    });
    const title = $("pageTitle");
    if(title){
      title.textContent =
        view === "profile" ? "Profilo" :
        view === "plans" ? "Piani Premium" :
        view === "settings" ? "Impostazioni" : "Dashboard";
    }
    const sub = $("pageSub");
    if(sub){
      sub.textContent =
        view === "profile" ? "Dati utente essenziali, sempre aggiornati." :
        view === "plans" ? "Gestisci l’abbonamento Premium e lo stato del piano." :
        view === "settings" ? "Preferenze rapide per l’invio delle buste paga." :
        "Gestisci profilo, piani e impostazioni.";
    }

    // Mobile: chiudi sidebar
    closeSidebar();
    try{ location.hash = view; }catch(_e){}
  }

  function openSidebar(){
    const side = $("dashSide");
    const back = $("sideBackdrop");
    if(side) side.setAttribute("aria-hidden","false");
    if(back) back.setAttribute("aria-hidden","false");
  }
  function closeSidebar(){
    const side = $("dashSide");
    const back = $("sideBackdrop");
    // Su desktop la sidebar resta visibile: ma non fa male tenerla "aperta"
    // Qui usiamo aria-hidden per la variante mobile.
    if(window.matchMedia && window.matchMedia("(max-width: 920px)").matches){
      if(side) side.setAttribute("aria-hidden","true");
      if(back) back.setAttribute("aria-hidden","true");
    }else{
      if(side) side.setAttribute("aria-hidden","false");
      if(back) back.setAttribute("aria-hidden","true");
    }
  }

  // ===== Firebase loader =====
  async function importWithFallback(file){
    let lastErr = null;
    for(const c of CDN_BASES){
      try{
        return await import(c.base + file);
      }catch(err){
        lastErr = err;
      }
    }
    throw lastErr || new Error("Impossibile caricare Firebase.");
  }

  async function initFirebase(){
    const appMod = await importWithFallback("firebase-app.js");
    const authMod = await importWithFallback("firebase-auth.js");
    const fsMod = await importWithFallback("firebase-firestore.js");

    // App Check (best effort)
    try{
      const appCheckMod = await importWithFallback("firebase-app-check.js");
      const { initializeAppCheck, ReCaptchaV3Provider } = appCheckMod;
      // inizializziamo dopo createApp
      var appCheckInit = { initializeAppCheck, ReCaptchaV3Provider };
    }catch(_e){
      var appCheckInit = null;
    }

    const { initializeApp } = appMod;
    const { getAuth, onAuthStateChanged, signOut } = authMod;
    const { getFirestore, doc, getDoc, setDoc } = fsMod;

    const app = initializeApp(firebaseConfig);

    try{
      if(appCheckInit?.initializeAppCheck && appCheckInit?.ReCaptchaV3Provider){
        appCheckInit.initializeAppCheck(app, {
          provider: new appCheckInit.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      }
    }catch(_e){}

    const auth = getAuth(app);
    const db = getFirestore(app);

    return {
      app, auth, db,
      api: { doc, getDoc, setDoc },
      authMod: { onAuthStateChanged, signOut }
    };
  }

  // ===== Data loaders =====
  async function readPlanFromClaims(user, force=false){
    try{
      const res = await user.getIdTokenResult(!!force);
      const c = res?.claims || {};
      const plan = String(c.plan || c.tier || c.subscription || "").toLowerCase();
      const isPremium = (c.isPremium === true) || (c.premium === true) || (plan === "premium" || plan === "pro" || plan === "plus");
      return { isPremium, planFrom: "claims", rawPlan: plan || "" };
    }catch(_e){
      return { isPremium:false, planFrom:"claims", rawPlan:"" };
    }
  }

  async function readPlanFromFirestore(env, uid){
    try{
      const { api, db } = env;
      const ref = api.doc(db, COL_PAYROLL_USAGE, uid);
      const snap = await api.getDoc(ref);
      if(!snap || !snap.exists()) return { ok:true, exists:false };
      const d = snap.data() || {};
      const plan = String(d.plan || d.tier || d.subscription || "").toLowerCase();
      const isPremium = (d.isPremium === true) || (plan === "premium" || plan === "pro" || plan === "plus");
      return { ok:true, exists:true, isPremium, plan, raw:d };
    }catch(err){
      return { ok:false, err };
    }
  }

  function applyPlanUI(planState){
    const isPremium = !!planState?.isPremium;
    const pending = !!planState?.pending;

    const topBadge = $("topBadge");
    const profileBadge = $("profileBadge");
    const settingsBadge = $("settingsBadge");
    const planBadge = $("planBadge");

    const badgeText = pending ? "Verifica in corso" : (isPremium ? "Premium" : "Free");
    const badgeClass = pending ? "pending" : (isPremium ? "premium" : "free");

    [topBadge, profileBadge, settingsBadge, planBadge].forEach(el=>{
      if(!el) return;
      el.textContent = badgeText;
      el.classList.remove("premium","free","pending");
      el.classList.add(badgeClass);
    });

    const sidePlan = $("sideUserPlan");
    if(sidePlan){
      sidePlan.textContent = pending ? "Abbonamento: verifica in corso" : (isPremium ? "Abbonamento: Premium attivo" : "Abbonamento: Free");
    }

    const planStatus = $("planStatus");
    const planDetails = $("planDetails");
    const planNote = $("planNote");
    if(planStatus) planStatus.textContent = pending ? "Verifica in corso…" : (isPremium ? "Premium attivo" : "Free");
    if(planDetails){
      if(pending) planDetails.textContent = "Stiamo aggiornando lo stato dopo il pagamento.";
      else if(isPremium) planDetails.textContent = "Sbloccato invio illimitato · " + PAYROLL_PREMIUM_PRICE_LABEL;
      else planDetails.textContent = "1 invio gratuito · poi Premium";
    }
    if(planNote){
      planNote.textContent = isPremium
        ? "Puoi gestire o annullare l’abbonamento in qualsiasi momento dal portale di pagamento."
        : "Quando vuoi puoi passare a Premium e continuare subito, senza interruzioni.";
    }

    const btnGoPremium = $("btnGoPremium");
    const btnManage = $("btnManagePlan");
    if(btnGoPremium) btnGoPremium.style.display = (!isPremium && !pending) ? "" : "none";
    if(btnManage) btnManage.style.display = isPremium ? "" : "none";
  }

  // ===== Billing actions =====
  async function startPremiumCheckout(env, user){
    const base = getBillingBase();
    if(!base) throw new Error("Backend billing non configurato.");
    const endpoint = base.replace(/\/$/,"") + "/create-checkout-session";
    const tok = await user.getIdToken();
    const here = location.href.split("#")[0];
    const successUrl = here + "?premium=success#plans";
    const cancelUrl = here + "#plans";

    const resp = await fetch(endpoint, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + tok
      },
      body: JSON.stringify({ successUrl, cancelUrl })
    });

    const data = await resp.json().catch(()=> ({}));
    if(!resp.ok || !data?.url) throw new Error(data?.error || "Impossibile avviare il checkout.");
    location.href = data.url;
  }

  async function openCustomerPortal(env, user){
    const base = getBillingBase();
    if(!base) throw new Error("Backend billing non configurato.");
    const endpoint = base.replace(/\/$/,"") + "/create-portal-session";
    const tok = await user.getIdToken();
    const returnUrl = location.href.split("?")[0] + "#plans";

    const resp = await fetch(endpoint, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":"Bearer " + tok
      },
      body: JSON.stringify({ returnUrl })
    });

    const data = await resp.json().catch(()=> ({}));
    if(!resp.ok || !data?.url) throw new Error(data?.error || "Portale abbonamento non disponibile.");
    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  // ===== Prefs (save emails) =====
  async function loadSaveEmailsPref(env, uid){
    // Priority:
    // 1) Firestore userPrefs/{uid}.saveEmailsForNext
    // 2) localStorage payroll_save_emails_v1
    // 3) default ON
    let val = null;

    try{
      const ref = env.api.doc(env.db, COL_USER_PREFS, uid);
      const snap = await env.api.getDoc(ref);
      if(snap && snap.exists()){
        const d = snap.data() || {};
        if(typeof d.saveEmailsForNext === "boolean") val = !!d.saveEmailsForNext;
      }
    }catch(_e){}

    if(typeof val !== "boolean"){
      try{
        const stored = localStorage.getItem(LS_SAVE_EMAILS);
        if(stored === "0") val = false;
        else if(stored === "1") val = true;
      }catch(_e){}
    }

    if(typeof val !== "boolean") val = true;
    return val;
  }

  async function persistSaveEmailsPref(env, uid, val){
    // Sempre: localStorage (compatibilità immediata)
    try{ localStorage.setItem(LS_SAVE_EMAILS, val ? "1" : "0"); }catch(_e){}

    // Best effort: Firestore
    try{
      const ref = env.api.doc(env.db, COL_USER_PREFS, uid);
      await env.api.setDoc(ref, { saveEmailsForNext: !!val, updatedAt: Date.now() }, { merge:true });
      return { ok:true, stored:"cloud" };
    }catch(_e){
      return { ok:false, stored:"local" };
    }
  }

  // ===== Boot =====
  let ENV = null;
  let CURRENT_USER = null;

  async function refreshPlan(forceToken=false){
    const user = CURRENT_USER;
    if(!ENV || !user) return;

    // Verifica in corso se rientri da Stripe
    const url = new URL(location.href);
    const pending = url.searchParams.get("premium") === "success";

    let planState = { isPremium:false, pending: !!pending };
    // 1) claims
    const c = await readPlanFromClaims(user, !!forceToken || !!pending);
    if(c.isPremium){
      planState.isPremium = true;
      planState.pending = false;
      applyPlanUI(planState);
      return;
    }

    // 2) Firestore payrollUsage/{uid}
    const fs = await readPlanFromFirestore(ENV, user.uid);
    if(fs.ok && fs.exists){
      planState.isPremium = !!fs.isPremium;
      // se ancora pending e non premium, restiamo pending per un attimo e suggeriamo refresh
      planState.pending = pending && !planState.isPremium;
    }else{
      // se non possiamo leggere, mostriamo free (ma senza bloccare la UI)
      planState.pending = false;
    }

    applyPlanUI(planState);
  }

  function bindNav(){
    document.querySelectorAll(".navItem").forEach(btn=>{
      btn.addEventListener("click", ()=> setView(btn.getAttribute("data-view")));
    });

    $("btnProfileToPlans")?.addEventListener("click", ()=> setView("plans"));
    $("btnProfileToSettings")?.addEventListener("click", ()=> setView("settings"));
    $("btnSettingsToProfile")?.addEventListener("click", ()=> setView("profile"));
    $("btnSettingsToPlans")?.addEventListener("click", ()=> setView("plans"));

    $("btnHamb")?.addEventListener("click", ()=> openSidebar());
    $("sideBackdrop")?.addEventListener("click", ()=> closeSidebar());

    // Hash deep-link
    try{
      const h = (location.hash || "").replace("#","").trim();
      if(h === "plans" || h === "settings" || h === "profile") setView(h);
      else setView("profile");
    }catch(_e){ setView("profile"); }

    // Ensure sidebar state
    closeSidebar();
    window.addEventListener("resize", ()=> closeSidebar());
  }

  async function bindActions(){
    $("btnGoApp")?.addEventListener("click", ()=>{
      if(typeof globalThis.pagheiaSpaNavigate === "function"){
        globalThis.pagheiaSpaNavigate("home");
        return;
      }
      location.href = "./pagheia.html";
    });

    $("btnSignOut")?.addEventListener("click", async ()=>{
      try{
        if(!ENV?.authMod?.signOut || !ENV?.auth) return;
        await ENV.authMod.signOut(ENV.auth);
      }catch(_e){}
      if(typeof globalThis.pagheiaSpaNavigate === "function"){
        globalThis.pagheiaSpaNavigate("home");
        return;
      }
      location.href = "./pagheia.html";
    });

    $("btnRefreshPlan")?.addEventListener("click", async ()=>{
      toast("Verifico lo stato dell’abbonamento…");
      await refreshPlan(true);
    });

    $("btnGoPremium")?.addEventListener("click", async ()=>{
      try{
        if(!CURRENT_USER) throw new Error("Accedi per continuare.");
        toast("Apro il checkout…");
        await startPremiumCheckout(ENV, CURRENT_USER);
      }catch(err){
        toast(err?.message || "Impossibile avviare il checkout.");
      }
    });

    $("btnManagePlan")?.addEventListener("click", async ()=>{
      try{
        if(!CURRENT_USER) throw new Error("Accedi per continuare.");
        toast("Apro gestione abbonamento…");
        await openCustomerPortal(ENV, CURRENT_USER);
      }catch(err){
        // Se il portale non è configurato, lasciamo un messaggio chiaro e tradizionale: una cosa alla volta.
        toast((err?.message || "Portale abbonamento non disponibile.") + " Usa il link “Segnala un problema” nel footer dell’app.");
      }
    });
  }

  async function renderUser(user){
    const name = (user.displayName || user.email || "Utente").trim();
    const email = (user.email || "—").trim();
    const created = fmtDate(user?.metadata?.creationTime);
    const last = fmtDate(user?.metadata?.lastSignInTime);
    const provider = providerLabel(user);

    $("p_name").textContent = name || "—";
    $("p_email").textContent = email || "—";
    $("p_created").textContent = created || "—";
    $("p_last").textContent = last || "—";
    $("p_provider").textContent = provider || "—";

    $("sideUserName").textContent = name || "—";
    $("sideUserEmail").textContent = email || "—";
  }

  async function renderSettings(user){
    const uid = user.uid;
    const toggle = $("toggleSaveEmails");
    const note = $("saveEmailsNote");
    if(!toggle) return;

    const current = await loadSaveEmailsPref(ENV, uid);
    toggle.checked = !!current;
    if(note){
      note.textContent = current
        ? "Attivo: quando inserisci un’email, la memorizziamo per i prossimi invii."
        : "Disattivo: userai le email solo per l’invio corrente (nessuna memorizzazione).";
    }

    toggle.addEventListener("change", async ()=>{
      const val = !!toggle.checked;
      const res = await persistSaveEmailsPref(ENV, uid, val);
      if(note){
        note.textContent = val
          ? (res.ok ? "Attivo e salvato nel tuo account." : "Attivo (salvato su questo dispositivo).")
          : (res.ok ? "Disattivo e salvato nel tuo account." : "Disattivo (salvato su questo dispositivo).");
      }
      toast(val ? "Impostazione aggiornata: ON" : "Impostazione aggiornata: OFF");
    }, { passive:true });
  }

  async function boot(){
    setLoading(true);

    bindNav();
    await bindActions();

    ENV = await initFirebase();

    ENV.authMod.onAuthStateChanged(ENV.auth, async (user)=>{
      try{
        CURRENT_USER = user || null;

        // Sidebar visibility default (desktop on)
        closeSidebar();

        if(!user || user.isAnonymous){
          // Non autenticato: messaggio semplice e rimando all’accesso
          setLoading(false);
          toast("Accedi per vedere la dashboard.");
          $("p_name").textContent = "Accesso richiesto";
          $("p_email").textContent = "—";
          $("p_created").textContent = "—";
          $("p_last").textContent = "—";
          $("p_provider").textContent = "—";
          $("sideUserName").textContent = "Accesso richiesto";
          $("sideUserEmail").textContent = "—";
          $("sideUserPlan").textContent = "—";
          applyPlanUI({ isPremium:false, pending:false });
          $("planNote").textContent = "Per gestire piani e impostazioni devi accedere.";
          // Forza view profilo
          setView("profile");
          return;
        }

        // Auth OK
        await renderUser(user);
        await refreshPlan(false);
        await renderSettings(user);

        // Sidebar on (desktop)
        closeSidebar();

        setLoading(false);
      }catch(_e){
        setLoading(false);
      }
    });
  }

  boot().catch(()=> setLoading(false));
};

globalThis.initPagheiaDashboard = initPagheiaDashboard;
initPagheiaDashboard();
