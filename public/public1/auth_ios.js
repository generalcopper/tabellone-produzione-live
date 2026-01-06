/* auth_ios.js (v4) — Google/Firebase Auth stabilizer for iOS/PWA + header docking
   v4 change:
   - Only on iOS + PWA (standalone): docks the page header under the status bar
     (safe-area fused) and keeps it fixed while scrolling, with auto spacer.
   - Keeps existing: auth gating + safe-area bottom bar background
   - Still DOES NOT edit viewport/status-bar metas (avoids layout jump)

   Hooks:
   - window.__AUTH_READY__ Promise<user|null>
   - window.addEventListener("authfix:ready", (e)=>{ ... })
   - window.authFixOnUser = (user)=>{ ... } // optional
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

  // --- Safe-area background bars (top/bottom) ---
  function pickBg(){
    try{
      const body = document.body;
      const html = document.documentElement;
      const bgBody = body ? getComputedStyle(body).backgroundColor : "";
      const bgHtml = html ? getComputedStyle(html).backgroundColor : "";
      const isTransparent = (v) => !v || v === "transparent" || v === "rgba(0, 0, 0, 0)";
      if (!isTransparent(bgBody)) return bgBody;
      if (!isTransparent(bgHtml)) return bgHtml;
    }catch(_e){}
    return "#fff";
  }

  function isTransparentColor(v){
    return !v || v === "transparent" || v === "rgba(0, 0, 0, 0)";
  }

  function pickSolidBgFrom(el){
    try{
      let cur = el;
      for (let i=0; i<8 && cur; i++){
        const bg = getComputedStyle(cur).backgroundColor;
        if (!isTransparentColor(bg)) return bg;
        cur = cur.parentElement;
      }
    }catch(_e){}
    return pickBg();
  }

  function setVars({ barBg, headerBg } = {}){
    try{
      const root = document.documentElement;
      if (barBg) root.style.setProperty("--authfix-bar-bg", barBg);
      if (headerBg) root.style.setProperty("--authfix-header-bg", headerBg);
      // also set overlay bg if unset
      const ov = root.style.getPropertyValue("--authfix-bg");
      if (!ov && (barBg || headerBg)) root.style.setProperty("--authfix-bg", (barBg || headerBg));
    }catch(_e){}
  }

  function ensureSafeBars(){
    if (!isIOS) return;
    try{
      setVars({ barBg: pickBg() });
      const topId = "authFixSafeTop";
      const botId = "authFixSafeBottom";

      if (!document.getElementById(topId)){
        const t = document.createElement("div");
        t.id = topId;
        t.className = "authFixSafeTop";
        (document.body || document.documentElement).appendChild(t);
      }
      if (!document.getElementById(botId)){
        const b = document.createElement("div");
        b.id = botId;
        b.className = "authFixSafeBottom";
        (document.body || document.documentElement).appendChild(b);
      }
    }catch(_e){}
  }

  function refreshBars(){
    try{
      if (!isIOS) return;
      setVars({ barBg: pickBg() });
    }catch(_e){}
  }

  // --- Header docking (iOS + PWA only) ---
  const HEADER_SELECTORS = [
    "[data-authfix-header]",
    "header",
    "[role='banner']",
    "#appHeader", "#header", ".app-header", ".appHeader",
    ".topbar", ".topBar", ".navbar", ".navBar",
    ".site-header", ".siteHeader",
    ".header"
  ];

  function isVisible(el){
    try{
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }catch(_e){ return false; }
  }

  function findHeaderCandidate(){
    try{
      const candidates = [];
      for (const sel of HEADER_SELECTORS){
        const nodes = document.querySelectorAll(sel);
        nodes.forEach((el) => {
          if (!isVisible(el)) return;
          // avoid docking modal headers/toolbars (best effort)
          const inDialog = el.closest("[role='dialog'], .modal, .overlay, .sheet, .drawer");
          if (inDialog) return;
          candidates.push(el);
        });
        if (candidates.length) break;
      }
      if (!candidates.length) return null;

      // Pick the one closest to the top of the page
      candidates.sort((a,b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const nearTop = candidates.find(el => el.getBoundingClientRect().top < 120) || candidates[0];
      return nearTop;
    }catch(_e){ return null; }
  }

  function hasTransformedAncestor(el){
    try{
      let p = el && el.parentElement;
      while (p && p !== document.body && p !== document.documentElement){
        const cs = getComputedStyle(p);
        if ((cs.transform && cs.transform !== "none") ||
            (cs.filter && cs.filter !== "none") ||
            (cs.perspective && cs.perspective !== "none")) return true;
        p = p.parentElement;
      }
    }catch(_e){}
    return false;
  }

  let dockedHeader = null;
  let spacerEl = null;

  function ensureDockedHeader(){
    if (!isIOS || !isStandalone) return;
    try{
      const html = document.documentElement;
      html.classList.add("authfix-ios-standalone");

      const header = findHeaderCandidate();
      if (!header) return;

      // already docked
      if (header.classList.contains("authFixDockHeader")) {
        dockedHeader = header;
        return;
      }

      dockedHeader = header;
      html.classList.add("authfix-has-header");

      const bg = pickSolidBgFrom(header);
      setVars({ barBg: bg, headerBg: bg });

      header.classList.add("authFixDockHeader");
      if (hasTransformedAncestor(header)) header.classList.add("authFixDockSticky");

      // Spacer (only when fixed; sticky stays in flow)
      if (!header.classList.contains("authFixDockSticky")){
        const spacerId = "authFixHeaderSpacer";
        spacerEl = document.getElementById(spacerId);
        if (!spacerEl){
          spacerEl = document.createElement("div");
          spacerEl.id = spacerId;
          spacerEl.className = "authFixHeaderSpacer";
          spacerEl.setAttribute("aria-hidden", "true");
          if (header.parentNode) header.parentNode.insertBefore(spacerEl, header.nextSibling);
          else (document.body || html).appendChild(spacerEl);
        }
      } else {
        spacerEl = null;
      }

      updateHeaderMetrics();
      // Re-measure after fonts/layout settle
      requestAnimationFrame(() => requestAnimationFrame(updateHeaderMetrics));
    }catch(_e){}
  }

  function updateHeaderMetrics(){
    try{
      if (!dockedHeader) return;
      const html = document.documentElement;
      const r = dockedHeader.getBoundingClientRect();
      const h = Math.max(0, Math.round(r.height));
      html.style.setProperty("--authfix-header-h", h + "px");
      if (spacerEl) spacerEl.style.height = h + "px";
    }catch(_e){}
  }

  // --- Overlay gating (auth hydration) ---
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

    // non-blocking redirect result
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
    ensureSafeBars();
    refreshBars();

    // Dock header before first paint (as much as possible)
    ensureDockedHeader();

    // If not iOS standalone, keep gating short
    if (!(isIOS && isStandalone)) {
      setPending(true);
      window.setTimeout(() => { if (!authResolved) setPending(false); }, 1200);
    }

    const ok1 = await initFirebaseCompat().catch(() => false);
    if (!ok1) await initGenericAuth().catch(() => false);

    // If nothing hooked, drop gating quickly
    window.setTimeout(() => { if (!authResolved) setPending(false); }, 1200);
  }

  // Update on resize/orientation (safe-area + header height can change)
  window.addEventListener("resize", () => {
    ensureSafeBars(); refreshBars();
    ensureDockedHeader(); updateHeaderMetrics();
  }, { passive:true });

  window.addEventListener("orientationchange", () => {
    ensureSafeBars(); refreshBars();
    ensureDockedHeader(); updateHeaderMetrics();
  }, { passive:true });

  // Resume / BFCache handling
  window.addEventListener("pageshow", (e) => {
    authResolved = false;
    ensureSafeBars(); refreshBars();
    ensureDockedHeader(); updateHeaderMetrics();
    if (e && e.persisted) maybeGateOnResume();
  });

  window.addEventListener("visibilitychange", () => {
    if (!document.hidden){
      authResolved = false;
      ensureSafeBars(); refreshBars();
      ensureDockedHeader(); updateHeaderMetrics();
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
