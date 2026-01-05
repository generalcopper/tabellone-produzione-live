/* public/app.js
   Shared behavior for all hubs:
   - iOS statusbar background sync
   - Consistent "press" feedback (adds .is-pressed) with event delegation
*/
(() => {
  "use strict";

  const docEl = document.documentElement;

  // Detect standalone (Home Screen) mode on iOS
  const isStandalone = (() => {
    try {
      // iOS Safari
      if (typeof navigator !== "undefined" && navigator.standalone === true) return true;
      // Modern display-mode
      return !!(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    } catch (_e) {
      return false;
    }
  })();

  if (isStandalone) docEl.classList.add("is-standalone");

  // Try to sync the statusbar background with the top header/hero background.
  function syncStatusBarBg() {
    try {
      const header =
        document.querySelector(".hero") ||
        document.querySelector(".app-header") ||
        document.querySelector("header");

      const target = header || document.body;
      const cs = window.getComputedStyle(target);
      let bg = cs.backgroundColor;

      // If transparent, fall back to body/html
      if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
        bg = window.getComputedStyle(document.body).backgroundColor || "#ffffff";
      }

      docEl.style.setProperty("--statusbar-bg", bg);
    } catch (_e) {}
  }

  // Run ASAP + after load (fonts/images can change computed bg in rare cases)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncStatusBarBg, { once: true });
  } else {
    syncStatusBarBg();
  }
  window.addEventListener("load", syncStatusBarBg, { once: true });

  // --- Press effect (event delegation) ---
  // Add .is-pressed to common tappable elements. Your CSS already defines
  // styles for .tile.is-pressed, buttons, etc. This makes it reliable on iOS.
  const PRESS_SELECTOR = [
    ".tile",
    ".pill",
    ".primaryBtn",
    ".ghostBtn",
    ".iconBtn",
    ".modalTile",
    "[data-press]"
  ].join(",");

  let active = null;

  function clearActive() {
    if (!active) return;
    try { active.classList.remove("is-pressed"); } catch (_e) {}
    active = null;
  }

  function onDown(e) {
    // Ignore right click / non-primary
    if (e.button != null && e.button !== 0) return;

    const t = e.target && e.target.closest ? e.target.closest(PRESS_SELECTOR) : null;
    if (!t) return;

    // Opt-out
    if (t.hasAttribute("data-no-press")) return;

    // Avoid interfering with text inputs
    const tag = (t.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    clearActive();
    active = t;
    try { active.classList.add("is-pressed"); } catch (_e) {}
  }

  function onUp() { clearActive(); }
  function onCancel() { clearActive(); }

  // pointer events are supported on modern iOS; we keep it simple and safe
  document.addEventListener("pointerdown", onDown, { passive: true });
  document.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointercancel", onCancel, { passive: true });
  document.addEventListener("pointerleave", onCancel, { passive: true });

  // Safety: clear if page gets hidden (app switcher)
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) clearActive();
  });


  // --- iOS-like page transitions between hubs (no HTML edits needed) ---
  const NAV_DIR_KEY = "gc_nav_dir_v1";
  const NAV_TS_KEY = "gc_nav_ts_v1";
  const NAV_MAX_AGE_MS = 8000;
  let navLocked = false;

  function nowMs(){ return Date.now ? Date.now() : (new Date()).getTime(); }

  function setNextNavDir(dir){
    try{
      sessionStorage.setItem(NAV_DIR_KEY, dir === "back" ? "back" : "forward");
      sessionStorage.setItem(NAV_TS_KEY, String(nowMs()));
    } catch(_e) {}
  }

  function consumeNavDir(){
    try{
      const dir = sessionStorage.getItem(NAV_DIR_KEY);
      const ts = parseInt(sessionStorage.getItem(NAV_TS_KEY) || "0", 10);
      sessionStorage.removeItem(NAV_DIR_KEY);
      sessionStorage.removeItem(NAV_TS_KEY);
      if (!dir) return null;
      if (!ts || (nowMs() - ts) > NAV_MAX_AGE_MS) return null;
      return dir === "back" ? "back" : "forward";
    } catch(_e) {
      return null;
    }
  }

  function parseMs(v){
    const s = String(v || "").trim();
    if (!s) return null;
    if (s.endsWith("ms")) {
      const n = parseFloat(s.slice(0, -2));
      return Number.isFinite(n) ? n : null;
    }
    if (s.endsWith("s")) {
      const n = parseFloat(s.slice(0, -1));
      return Number.isFinite(n) ? n * 1000 : null;
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  function getCssDurMs(){
    try{
      const v = getComputedStyle(docEl).getPropertyValue("--gc-dur");
      const ms = parseMs(v);
      return (ms == null) ? 240 : ms;
    } catch(_e) {
      return 240;
    }
  }

  function ensureCover(){
    try{
      if (!document.body) return null;
      let cover = document.querySelector(".gc-cover");
      if (cover) return cover;
      cover = document.createElement("div");
      cover.className = "gc-cover";
      document.body.appendChild(cover);
      return cover;
    } catch(_e) {
      return null;
    }
  }

  // Enter animation (runs once right after navigation)
  const enterDir = consumeNavDir();
  if (enterDir) {
    docEl.classList.add(enterDir === "back" ? "gc-enter-back" : "gc-enter-forward");
    window.setTimeout(() => {
      try { docEl.classList.remove("gc-enter-back", "gc-enter-forward"); } catch(_e) {}
    }, 450);
  }

  function normalizeUrl(href){
    try{
      return new URL(href, location.href).toString();
    } catch(_e) {
      return href;
    }
  }

  function shouldHandleAnchor(a){
    try{
      if (!a) return false;
      if (a.hasAttribute("download")) return false;
      if (a.getAttribute("target") && a.getAttribute("target") !== "_self") return false;
      if (a.hasAttribute("data-no-transition")) return false;

      const href = (a.getAttribute("href") || "").trim();
      if (!href) return false;
      if (href.startsWith("#")) return false;
      if (/^(mailto:|tel:|sms:|javascript:)/i.test(href)) return false;

      // Same-origin only (keep external links normal)
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return false;

      return true;
    } catch(_e) {
      return false;
    }
  }

  function inferDirFromHref(href){
    try{
      const h = String(href || "").toLowerCase();
      if (h.includes("hub_centrale")) return "back";
    } catch(_e) {}
    return "forward";
  }

  function navigateWithTransition(url, dir){
    const to = normalizeUrl(url);
    if (!to) return;

    // Avoid double nav
    if (navLocked) {
      try { location.href = to; } catch(_e) {}
      return;
    }

    // Avoid self-nav
    try { if (to === location.href) return; } catch(_e) {}

    navLocked = true;

    const direction = (dir === "back") ? "back" : "forward";
    setNextNavDir(direction);

    // Make sure cover exists before we animate
    ensureCover();

    // Apply leave classes
    try{
      docEl.classList.add("gc-transitioning", direction === "back" ? "gc-leave-back" : "gc-leave-forward");
      // Force a reflow so animations start reliably
      void docEl.offsetHeight;
    } catch(_e) {}

    const delay = Math.max(0, getCssDurMs());

    window.setTimeout(() => {
      try { location.href = to; } catch(_e) {}
    }, delay);
  }

  // Expose helper (optional usage in your pages without changing this file again)
  try { window.gcNavigate = navigateWithTransition; } catch(_e) {}

  // Intercept same-origin <a href="..."> clicks and animate the redirect
  document.addEventListener("click", (e) => {
    try{
      if (!e || e.defaultPrevented) return;

      // Respect modified clicks (new tab / new window)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      if (!shouldHandleAnchor(a)) return;

      const href = a.getAttribute("href");
      const dir = (a.getAttribute("data-nav") || "").toLowerCase() === "back"
        ? "back"
        : inferDirFromHref(href);

      e.preventDefault();
      navigateWithTransition(href, dir);
    } catch(_e) {}
  }, false);



  // --- Desktop-only "Back to Hub" button (injected) ---
  const HUB_KEY = "gc_hub_home_url";

  function isHubHomePage() {
    try {
      const p = String(location.pathname || "").toLowerCase();
      if (p.includes("hub_centrale")) return true;
      const t = String(document.title || "").toLowerCase();
      if (t.includes("hub centrale")) return true;
      return false;
    } catch (_e) {
      return false;
    }
  }

  function rememberHubHomeUrl() {
    try { sessionStorage.setItem(HUB_KEY, location.href); } catch (_e) {}
  }

  // If we're on Hub Centrale, remember its URL (so subpages can always come back).
  if (isHubHomePage()) {
    rememberHubHomeUrl();
    // Also refresh the stored value on any navigation click from the hub.
    document.addEventListener("click", (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      rememberHubHomeUrl();
    }, { capture: true, passive: true });
  }

  function isDesktop() {
    try {
      return !!(window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches);
    } catch (_e) {
      return false;
    }
  }

  function getHubUrl() {
    // 1) Best: sessionStorage (set when leaving Hub Centrale)
    try {
      const stored = sessionStorage.getItem(HUB_KEY);
      if (stored) return stored;
    } catch (_e) {}

    // 2) Fallback: assume hub is in the same folder as current page
    try {
      const path = String(location.pathname || "/");
      const dir = path.slice(0, path.lastIndexOf("/") + 1);
      return new URL(dir + "hub_centrale.html", location.origin).toString();
    } catch (_e) {}

    // 3) Last resort
    return "hub_centrale.html";
  }

  function shouldSkipBackBtn() {
    try {
      if (!document.body) return true;
      if (document.body.classList.contains("locked")) return true;
      if (document.body.classList.contains("authPending")) return true;
      const ov = document.getElementById("authOverlay");
      if (ov && ov.hidden === false) return true;
    } catch (_e) {}
    return false;
  }

  function injectBackBtn() {
    try {
      if (!isDesktop()) return;
      if (isHubHomePage()) return;
      if (shouldSkipBackBtn()) return;
      if (document.querySelector(".gc-back-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gc-back-btn";
      btn.setAttribute("data-press", "");
      btn.setAttribute("aria-label", "Torna al Hub Centrale");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
          '<path d="M15 18l-6-6 6-6"></path>' +
          '<path d="M9 12h12"></path>' +
        '</svg>' +
        '<span>Hub Centrale</span>';

      btn.addEventListener("click", () => {
        try { navigateWithTransition(getHubUrl(), "back"); } catch (_e) {}
      });

      document.body.appendChild(btn);
    } catch (_e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectBackBtn, { once: true });
  } else {
    injectBackBtn();
  }

})();
