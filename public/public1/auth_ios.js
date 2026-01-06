/* auth_ios_v4.js
   - Auth stabilizer (Firebase compat best-effort)
   - Adds safe-area padding to main container so content stays visible near notch
   - Adds bottom safe-area bar background; top bar optional (default invisible)

   Cache-bust recommended: ?v=4
*/
(() => {
  "use strict";
  if (window.__AUTH_FIX_V4__) return;
  window.__AUTH_FIX_V4__ = true;

  const isIOS = (() => {
    try{
      const ua = navigator.userAgent || "";
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    }catch(_e){ return false; }
  })();

  const isStandalone = (() => {
    try{
      if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
      return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    }catch(_e){ return false; }
  })();

  // ----- Safe area -----
  function pickBg(){
    try{
      const candidates = [
        "header", ".header", "#header",
        "#app header", "#root header",
        "#app", "#root", "main", ".app", ".page",
        "body", "html"
      ];
      const isTransparent = (v) => !v || v === "transparent" || v === "rgba(0, 0, 0, 0)";
      for (const sel of candidates){
        const el = document.querySelector(sel);
        if (!el) continue;
        const bg = getComputedStyle(el).backgroundColor;
        if (!isTransparent(bg)) return bg;
      }
    }catch(_e){}
    return "#fff";
  }

  function setCssVar(name, value){
    try{ document.documentElement.style.setProperty(name, value); }catch(_e){}
  }

  function ensureBars(){
    if (!isIOS) return;
    try{
      const bg = pickBg();
      setCssVar("--authfix-bar-bg", bg);
      setCssVar("--authfix-bg", bg);

      if (!document.getElementById("authFixSafeBottom")){
        const b = document.createElement("div");
        b.id = "authFixSafeBottom";
        b.className = "authFixSafeBottom";
        (document.body || document.documentElement).appendChild(b);
      }
      if (!document.getElementById("authFixSafeTop")){
        const t = document.createElement("div");
        t.id = "authFixSafeTop";
        t.className = "authFixSafeTop";
        (document.body || document.documentElement).appendChild(t);
      }
    }catch(_e){}
  }

  function ensureSafeContentPadding(){
    if (!isIOS || !isStandalone) return;
    if (window.__AUTHFIX_DISABLE_SAFE_CONTENT__ === true) return;

    try{
      const selectors = ["#app", "#root", "main", ".app", ".page", "body"];
      let target = null;
      for (const sel of selectors){
        const el = document.querySelector(sel);
        if (el) { target = el; break; }
      }
      if (!target) return;
      if (!target.classList.contains("authFixSafeContent")){
        target.classList.add("authFixSafeContent");
      }
    }catch(_e){}
  }

  function refreshSafeArea(){
    ensureBars();
    ensureSafeContentPadding();
  }

  // ----- Overlay gating -----
  let overlayEl = null;
  function ensureOverlay(){
    try{
      if (overlayEl) return overlayEl;
      overlayEl = document.createElement("div");
      overlayEl.className = "authFixOverlay";
      overlayEl.setAttribute("aria-hidden", "true");
      overlayEl.innerHTML = `<div><div class="authFixSpinner" aria-label="Loading" role="img"></div></div>`;
      (document.body || document.documentElement).appendChild(overlayEl);
      return overlayEl;
    }catch(_e){ return null; }
  }

  let authResolved = false;
  function setPending(on){
    try{
      ensureOverlay();
      if (overlayEl) overlayEl.classList.toggle("is-on", !!on);
    }catch(_e){}
  }

  if (isIOS && isStandalone) setPending(true);

  // Session hints
  const SS_KEY_UID  = "authfix:last_uid";
  const SS_KEY_TS   = "authfix:last_ts";
  const now = () => Date.now();
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(_e){ return null; } }
  function ssSet(k,v){ try{ sessionStorage.setItem(k, String(v)); }catch(_e){} }

  // Public readiness promise
  let resolveReady;
  window.__AUTH_READY__ = new Promise((res) => { resolveReady = res; });

  function emitReady(user){
    try{
      window.dispatchEvent(new CustomEvent("authfix:ready", { detail: { user: user || null }}));
    }catch(_e){}
  }
  function notifyHook(user){
    try{
      if (typeof window.authFixOnUser === "function") window.authFixOnUser(user || null);
    }catch(_e){}
  }

  function markResolved(user){
    authResolved = true;

    if (user && user.uid) { ssSet(SS_KEY_UID, user.uid); ssSet(SS_KEY_TS, now()); }
    else { ssSet(SS_KEY_UID, ""); ssSet(SS_KEY_TS, now()); }

    setPending(false);
    try{ resolveReady(user || null); }catch(_e){}
    emitReady(user);
    notifyHook(user);
  }

  function maybeGateOnResume(){
    try{
      if (!isIOS || !isStandalone) return;
      const expectedUid = ssGet(SS_KEY_UID);
      const ts = parseInt(ssGet(SS_KEY_TS) || "0", 10);
      const fresh = (now() - ts) < 6 * 60 * 60 * 1000;
      if (expectedUid && fresh){
        setPending(true);
        window.setTimeout(() => { if (!authResolved) setPending(false); }, 9000);
      }
    }catch(_e){}
  }

  function waitFor(getter, { timeoutMs=8000, intervalMs=80 } = {}){
    return new Promise((resolve, reject) => {
      const t0 = now();
      const tick = () => {
        let v = null;
        try{ v = getter(); }catch(_e){}
        if (v) return resolve(v);
        if (now() - t0 > timeoutMs) return reject(new Error("timeout"));
        setTimeout(tick, intervalMs);
      };
      tick();
    });
  }

  async function initFirebaseCompat(){
    const fb = await waitFor(() => window.firebase, { timeoutMs: 12000 }).catch(() => null);
    if (!fb || !fb.auth) return false;

    let auth;
    try{ auth = fb.auth(); }catch(_e){ return false; }
    if (!auth) return false;

    try{
      const P = fb.auth.Auth.Persistence;
      if (P && auth.setPersistence){
        try{ await auth.setPersistence(P.LOCAL); }
        catch(_e1){ try{ await auth.setPersistence(P.SESSION); }catch(_e2){} }
      }
    }catch(_e){}

    try{
      if (typeof auth.getRedirectResult === "function") auth.getRedirectResult().catch(() => {});
    }catch(_e){}

    auth.onAuthStateChanged((user) => {
      if (!authResolved) return markResolved(user);
      emitReady(user); notifyHook(user);
    }, () => {
      if (!authResolved) markResolved(null);
    });

    window.setTimeout(() => { if (!authResolved) markResolved(null); }, 12000);
    return true;
  }

  async function initGenericAuth(){
    const auth = await waitFor(() => window.auth, { timeoutMs: 6000 }).catch(() => null);
    if (!auth || typeof auth.onAuthStateChanged !== "function") return false;

    auth.onAuthStateChanged((user) => {
      if (!authResolved) markResolved(user);
      else { emitReady(user); notifyHook(user); }
    }, () => {
      if (!authResolved) markResolved(null);
    });

    window.setTimeout(() => { if (!authResolved) markResolved(null); }, 12000);
    return true;
  }

  async function boot(){
    refreshSafeArea();

    if (!(isIOS && isStandalone)) {
      setPending(true);
      window.setTimeout(() => { if (!authResolved) setPending(false); }, 1200);
    }

    const ok1 = await initFirebaseCompat().catch(() => false);
    if (!ok1) await initGenericAuth().catch(() => false);

    window.setTimeout(() => { if (!authResolved) setPending(false); }, 1200);
  }

  window.addEventListener("resize", refreshSafeArea, { passive:true });
  window.addEventListener("orientationchange", refreshSafeArea, { passive:true });

  window.addEventListener("pageshow", (e) => {
    authResolved = false;
    refreshSafeArea();
    if (e && e.persisted) maybeGateOnResume();
  });

  window.addEventListener("visibilitychange", () => {
    if (!document.hidden){
      authResolved = false;
      refreshSafeArea();
      maybeGateOnResume();
    }
  });

  window.addEventListener("online", () => {
    authResolved = false;
    maybeGateOnResume();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
