/* auth_ios.js (v2) — Google/Firebase Auth stabilizer for iOS/PWA
   Fix v2: ripristina “no bars” su iOS assicurando viewport-fit=cover e meta PWA,
   senza interferire con la tua UI. Overlay solo durante re-idratazione auth.

   Eventi/Hooks:
   - window.__AUTH_READY__ Promise<user|null>
   - window.addEventListener("authfix:ready", (e)=>{ ... })
   - window.authFixOnUser = (user)=>{ ... }  // opzionale
*/
(() => {
  "use strict";
  if (window.__AUTH_FIX_V2__) return;
  window.__AUTH_FIX_V2__ = true;

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

  // --- Meta hardening (prevents iOS top/bottom white bars) ---
  function upsertMeta(name, content){
    try{
      const head = document.head || document.getElementsByTagName("head")[0];
      if(!head) return null;
      let m = head.querySelector(`meta[name="${name}"]`);
      if(!m){
        m = document.createElement("meta");
        m.setAttribute("name", name);
        head.appendChild(m);
      }
      m.setAttribute("content", content);
      return m;
    }catch(_e){ return null; }
  }

  function normalizeViewportMeta(){
    try{
      const head = document.head || document.getElementsByTagName("head")[0];
      if(!head) return;

      const metas = Array.from(head.querySelectorAll('meta[name="viewport"]'));
      let meta = metas[0] || null;

      // Remove duplicates (iOS can pick the “wrong” one and reintroduce bars)
      for (let i=1;i<metas.length;i++){
        try{ metas[i].parentNode && metas[i].parentNode.removeChild(metas[i]); }catch(_e){}
      }

      if(!meta){
        meta = document.createElement("meta");
        meta.setAttribute("name","viewport");
        head.appendChild(meta);
      }

      const base = "width=device-width, initial-scale=1";
      const fit = "viewport-fit=cover";

      // Preserve existing params but ensure viewport-fit=cover exists
      const cur = (meta.getAttribute("content") || "").trim();
      const parts = cur ? cur.split(",").map(s => s.trim()).filter(Boolean) : [];
      const hasWidth = parts.some(p => p.startsWith("width="));
      const hasInit  = parts.some(p => p.startsWith("initial-scale="));
      const hasFit   = parts.some(p => p === fit);

      const next = [];
      if (hasWidth || hasInit || parts.length){
        // keep as much as possible
        for (const p of parts){
          // drop “minimal-ui” / weird tokens if present (iOS ignores or causes oddities)
          if (p === "minimal-ui") continue;
          next.push(p);
        }
        if(!hasFit) next.push(fit);
        if(!hasWidth) next.unshift("width=device-width");
        if(!hasInit) next.push("initial-scale=1");
      } else {
        next.push(base, fit);
      }

      meta.setAttribute("content", Array.from(new Set(next)).join(", "));
    }catch(_e){}
  }

  function ensurePWAMetas(){
    if (!isIOS) return;
    // iOS standalone + Safari need these to avoid UI bars / odd relayout on resume
    upsertMeta("apple-mobile-web-app-capable", "yes");
    upsertMeta("mobile-web-app-capable", "yes");
    // black-translucent lets the page fill under the status bar (with safe-area insets)
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    normalizeViewportMeta();
  }

  // Run meta hardening ASAP (before auth gating)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePWAMetas, { once:true });
  } else {
    ensurePWAMetas();
  }

  // --- Overlay ---
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

  let pending = false;
  function setPending(on){
    pending = !!on;
    try{
      ensureOverlay();
      if (overlayEl){
        overlayEl.classList.toggle("is-on", pending);
      }
    }catch(_e){}
  }

  // start pending early on iOS PWA to mask the “momentary crash”
  if (isIOS && isStandalone) setPending(true);

  // --- Session hints (reduce signed-out flicker) ---
  const SS_KEY_UID  = "authfix:last_uid";
  const SS_KEY_TS   = "authfix:last_ts";

  const now = () => Date.now();
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(_e){ return null; } }
  function ssSet(k,v){ try{ sessionStorage.setItem(k, String(v)); }catch(_e){} }

  // --- Public promise to allow other scripts to await auth readiness ---
  let resolveReady;
  const readyPromise = new Promise((res) => { resolveReady = res; });
  window.__AUTH_READY__ = readyPromise;

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

  // --- Auth resolver gating ---
  let authResolved = false;

  function markResolved(user){
    authResolved = true;

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

  function maybeGateOnResume(){
    try{
      if (!isIOS || !isStandalone) return;
      const expectedUid = ssGet(SS_KEY_UID);
      const ts = parseInt(ssGet(SS_KEY_TS) || "0", 10);
      const fresh = (now() - ts) < 6 * 60 * 60 * 1000; // 6h
      if (expectedUid && fresh){
        setPending(true);
        window.setTimeout(() => { if (!authResolved) setPending(false); }, 9000);
      }
    }catch(_e){}
  }

  // --- waitFor helper ---
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

    // Persistence: try LOCAL then SESSION
    try{
      const P = fb.auth.Auth.Persistence;
      if (P && auth.setPersistence){
        try{ await auth.setPersistence(P.LOCAL); }
        catch(_e1){ try{ await auth.setPersistence(P.SESSION); }catch(_e2){} }
      }
    }catch(_e){}

    // Kick redirect result (non-blocking)
    try{
      if (typeof auth.getRedirectResult === "function") auth.getRedirectResult().catch(() => {});
    }catch(_e){}

    auth.onAuthStateChanged((user) => {
      if (!authResolved) return markResolved(user);
      emitReady(user);
      notifyHook(user);
    }, () => {
      if (!authResolved) markResolved(null);
    });

    window.setTimeout(() => { if (!authResolved) markResolved(null); }, 12000);
    return true;
  }

  // --- Generic integration (optional) ---
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
    // Non-iOS: keep gating short just to avoid flicker
    if (!(isIOS && isStandalone)) {
      setPending(true);
      window.setTimeout(() => { if (!authResolved) setPending(false); }, 1500);
    }

    const ok1 = await initFirebaseCompat().catch(() => false);
    if (!ok1) await initGenericAuth().catch(() => false);

    // If nothing hooked, drop gating quickly
    window.setTimeout(() => { if (!authResolved) setPending(false); }, 1200);
  }

  // Resume / BFCache handling
  window.addEventListener("pageshow", (e) => {
    authResolved = false;
    if (e && e.persisted) maybeGateOnResume();
  });

  window.addEventListener("visibilitychange", () => {
    if (!document.hidden){
      authResolved = false;
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
