/* auth_ios.js — Google/Firebase Auth stabilizer for iOS/PWA
   Obiettivi:
   - evitare “flash/crash” al rientro in web-app (iOS standalone) coprendo il boot con overlay
   - ridurre falsi “signed-out” dovuti a race condition di re-idratazione auth
   - impostare persistence robusta (Firebase compat) quando possibile
   - esportare un hook globale e un evento per sincronizzare UI senza toccare le tue logiche esistenti

   Non modifica app.js/app.css: si limita a creare overlay + ascoltare auth state.

   Integrazione (opzionale):
   - window.authFixOnUser(user)  // chiamata ad ogni cambio utente (user=null => signed-out)
   - ascolta evento: window.addEventListener("authfix:ready", (e)=>{ console.log(e.detail.user) })
*/
(() => {
  "use strict";
  if (window.__AUTH_FIX_V1__) return;
  window.__AUTH_FIX_V1__ = true;

  const docEl = document.documentElement;

  // --- iOS / standalone detection (best effort) ---
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

  // --- Overlay ---
  let overlayEl = null;
  function ensureOverlay(){
    try{
      if (overlayEl) return overlayEl;
      overlayEl = document.createElement("div");
      overlayEl.className = "authFixOverlay";
      overlayEl.setAttribute("aria-hidden", "true");
      overlayEl.innerHTML = `
        <div>
          <div class="authFixSpinner" aria-label="Loading" role="img"></div>
        </div>
      `;
      (document.body || document.documentElement).appendChild(overlayEl);
      return overlayEl;
    }catch(_e){
      return null;
    }
  }

  let pending = false;
  function setPending(on){
    pending = !!on;
    try{
      if(on){
        docEl.classList.add("authFix-pending");
        ensureOverlay()?.classList.add("is-on");
      }else{
        docEl.classList.remove("authFix-pending");
        if (overlayEl) overlayEl.classList.remove("is-on");
      }
    }catch(_e){}
  }

  // start pending early on iOS PWA to mask the “momentary crash”
  if (isIOS && isStandalone) setPending(true);

  // --- Tiny state ---
  const SS_KEY_UID  = "authfix:last_uid";
  const SS_KEY_TS   = "authfix:last_ts";
  const SS_KEY_BOOT = "authfix:boot_id";

  const now = () => Date.now();

  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(_e){ return null; } }
  function ssSet(k,v){ try{ sessionStorage.setItem(k, String(v)); }catch(_e){} }

  // Unique boot id to detect “fresh” vs BFCache return
  (function markBoot(){
    const bootId = Math.random().toString(16).slice(2) + "-" + now();
    ssSet(SS_KEY_BOOT, bootId);
  })();

  // --- Public promise to allow other scripts to await auth readiness ---
  let resolveReady;
  const readyPromise = new Promise((res) => { resolveReady = res; });
  window.__AUTH_READY__ = readyPromise;

  function emitReady(user){
    try{
      const ev = new CustomEvent("authfix:ready", { detail: { user: user || null }});
      window.dispatchEvent(ev);
    }catch(_e){}
  }

  function notifyHook(user){
    try{
      if (typeof window.authFixOnUser === "function") window.authFixOnUser(user || null);
    }catch(_e){}
  }

  // --- Auth resolver gating (prevents false sign-out flicker) ---
  let authResolved = false;
  let lastUser = undefined;

  function markResolved(user){
    authResolved = true;
    lastUser = user || null;

    if (user && user.uid) {
      ssSet(SS_KEY_UID, user.uid);
      ssSet(SS_KEY_TS, now());
    } else {
      ssSet(SS_KEY_UID, "");
      ssSet(SS_KEY_TS, now());
    }

    setPending(false);
    try{ resolveReady(user || null); }catch(_e){}
    emitReady(user);
    notifyHook(user);
  }

  // When returning to foreground, re-apply pending briefly if we *expect* a user
  function maybeGateOnResume(){
    try{
      if (!isIOS || !isStandalone) return;
      const expectedUid = ssGet(SS_KEY_UID);
      const ts = parseInt(ssGet(SS_KEY_TS) || "0", 10);
      const fresh = (now() - ts) < 6 * 60 * 60 * 1000; // 6h
      if (expectedUid && fresh){
        // show overlay while auth re-hydrates to avoid “signed-out flash”
        setPending(true);
        // safety timeout: never hang indefinitely
        window.setTimeout(() => { if (!authResolved) setPending(false); }, 9000);
      }
    }catch(_e){}
  }

  // --- Generic "waitFor" helper ---
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

  // --- Firebase compat integration (best effort) ---
  async function initFirebaseCompat(){
    const fb = await waitFor(() => window.firebase, { timeoutMs: 12000 }).catch(() => null);
    if (!fb || !fb.auth) return false;

    let auth;
    try{ auth = fb.auth(); }catch(_e){ return false; }
    if (!auth) return false;

    // Persistence: try LOCAL then SESSION (iOS sometimes blocks certain storage)
    try{
      const P = fb.auth.Auth.Persistence;
      if (P && auth.setPersistence){
        try{ await auth.setPersistence(P.LOCAL); }
        catch(_e1){ try{ await auth.setPersistence(P.SESSION); }catch(_e2){} }
      }
    }catch(_e){}

    // Clear redirect "in-flight" if any (prevents weird half-states)
    try{
      if (typeof auth.getRedirectResult === "function") {
        // don't block; just trigger
        auth.getRedirectResult().catch(() => {});
      }
    }catch(_e){}

    // Main listener
    auth.onAuthStateChanged((user) => {
      // First resolution wins the “boot gating”
      if (!authResolved) {
        markResolved(user);
        return;
      }
      // Subsequent changes
      lastUser = user || null;
      emitReady(user);
      notifyHook(user);
    }, (_err) => {
      // If listener errors, stop gating so UI isn't stuck
      if (!authResolved) markResolved(null);
    });

    // Safety timer in case onAuthStateChanged is slow / never fires
    window.setTimeout(() => {
      if (!authResolved) {
        // Soft decision: if we expected a uid, keep pending a bit longer; else resolve null
        const expectedUid = ssGet(SS_KEY_UID);
        if (expectedUid) {
          setPending(false);
        } else {
          markResolved(null);
        }
      }
    }, 12000);

    return true;
  }

  // --- Minimal generic integration (non-Firebase) ---
  async function initGenericAuth(){
    // If you expose a global `window.auth` compatible with onAuthStateChanged
    const auth = await waitFor(() => window.auth, { timeoutMs: 6000 }).catch(() => null);
    if (!auth || typeof auth.onAuthStateChanged !== "function") return false;

    auth.onAuthStateChanged((user) => {
      if (!authResolved) markResolved(user);
      else { lastUser = user || null; emitReady(user); notifyHook(user); }
    }, () => {
      if (!authResolved) markResolved(null);
    });

    window.setTimeout(() => { if (!authResolved) markResolved(null); }, 12000);
    return true;
  }

  async function boot(){
    // If not iOS standalone, still helps (but we avoid overlay unless needed)
    if (!(isIOS && isStandalone)) {
      // small gate to avoid flicker even on desktop
      setPending(true);
      window.setTimeout(() => { if (!authResolved) setPending(false); }, 4000);
    }

    // try Firebase compat first, then generic
    const ok1 = await initFirebaseCompat().catch(() => false);
    if (!ok1) await initGenericAuth().catch(() => false);

    // If nothing hooked, drop gating quickly
    window.setTimeout(() => { if (!authResolved) setPending(false); }, 1500);
  }

  // --- Resume / BFCache handling ---
  window.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      authResolved = false; // allow re-gate on resume until listener fires again
      maybeGateOnResume();
      // Let the browser settle (iOS needs a beat)
      setTimeout(() => { authResolved = false; }, 0);
    }
  });

  window.addEventListener("pageshow", (e) => {
    // BFCache return often triggers weird “state flashes”
    authResolved = false;
    if (e && e.persisted) maybeGateOnResume();
  });

  window.addEventListener("online", () => {
    // When coming back online, don't force sign-in; just re-gate briefly
    authResolved = false;
    maybeGateOnResume();
  });

  // Boot timing
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

})();
