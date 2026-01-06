/* app.js (v2) — iOS/PWA fullscreen hardening
   - Inject meta tags for iOS standalone (helps remove Safari bars when launched from Home Screen)
   - Robust viewport height var (--vh) without setting fixed heights (so scroll stays OK)
   - Statusbar background sync (optional, best-effort)
   - Press feedback (adds .is-pressed)
*/
(() => {
  "use strict";

  const docEl = document.documentElement;

  function upsertMeta(name, content){
    try{
      const head = document.head || document.getElementsByTagName("head")[0];
      if(!head) return;

      let meta = head.querySelector(`meta[name="${name}"]`);
      if(!meta){
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    }catch(_e){}
  }

  function ensureViewportMeta(){
    try{
      const head = document.head || document.getElementsByTagName("head")[0];
      if(!head) return;

      let meta = head.querySelector('meta[name="viewport"]');
      const want = "viewport-fit=cover";
      const base = "width=device-width, initial-scale=1";

      if(!meta){
        meta = document.createElement("meta");
        meta.setAttribute("name", "viewport");
        meta.setAttribute("content", `${base}, ${want}`);
        head.appendChild(meta);
        return;
      }

      const content = String(meta.getAttribute("content") || "");
      const hasFit = content.toLowerCase().includes(want);
      const next = hasFit ? content : (content.trim() ? (content.replace(/,\s*$/, "") + ", " + want) : `${base}, ${want}`);
      meta.setAttribute("content", next);
    }catch(_e){}
  }

  // These meta tags are what usually removes the Safari top/bottom toolbars
  // when the app is launched from the Home Screen on iOS.
  function ensureAppleStandaloneMeta(){
    upsertMeta("apple-mobile-web-app-capable", "yes");
    // 'black-translucent' lets your page extend under the status bar
    upsertMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
  }

  // Standalone detection (best effort)
  const isStandalone = (() => {
    try{
      if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
      return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    }catch(_e){ return false; }
  })();
  if (isStandalone) docEl.classList.add("is-standalone");

  ensureViewportMeta();
  ensureAppleStandaloneMeta();

  // --- Viewport height fix (no fixed heights, only CSS vars) ---
  let raf = 0;
  function syncVh(){
    try{
      if(raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        const vv = window.visualViewport;
        const h = (vv && vv.height) ? vv.height : window.innerHeight;
        const vh = h * 0.01;
        docEl.style.setProperty("--vh", `${vh}px`);
        docEl.style.setProperty("--app-height", `${Math.round(h)}px`);
      });
    }catch(_e){}
  }

  // --- Status bar bg sync (optional) ---
  function syncStatusBarBg(){
    try{
      const header =
        document.querySelector(".hero") ||
        document.querySelector(".app-header") ||
        document.querySelector("header");

      const target = header || document.body;
      const cs = window.getComputedStyle(target);
      let bg = cs.backgroundColor;

      if(!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent"){
        bg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
      }
      docEl.style.setProperty("--statusbar-bg", bg);
    }catch(_e){}
  }

  function boot(){
    syncVh();
    syncStatusBarBg();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
  window.addEventListener("load", () => { syncVh(); syncStatusBarBg(); }, { once:true });

  window.addEventListener("resize", syncVh, { passive:true });
  window.addEventListener("orientationchange", syncVh, { passive:true });
  if(window.visualViewport){
    window.visualViewport.addEventListener("resize", syncVh, { passive:true });
    window.visualViewport.addEventListener("scroll", syncVh, { passive:true });
  }

  // --- Press effect (event delegation) ---
  const PRESS_SELECTOR = [
    ".tile",".pill",".primaryBtn",".ghostBtn",".iconBtn",".modalTile","[data-press]"
  ].join(",");

  let active = null;
  function clearActive(){
    if(!active) return;
    try{ active.classList.remove("is-pressed"); }catch(_e){}
    active = null;
  }
  function onDown(e){
    if(e.button != null && e.button !== 0) return;
    const t = e.target && e.target.closest ? e.target.closest(PRESS_SELECTOR) : null;
    if(!t) return;
    if(t.hasAttribute("data-no-press")) return;
    clearActive();
    active = t;
    try{ active.classList.add("is-pressed"); }catch(_e){}
  }

  document.addEventListener("pointerdown", onDown, { passive:true });
  document.addEventListener("pointerup", clearActive, { passive:true });
  document.addEventListener("pointercancel", clearActive, { passive:true });
  document.addEventListener("visibilitychange", () => { if(document.hidden) clearActive(); });

})();
