/* public/app.js
   Shared behavior for all hubs:
   - iOS statusbar background sync
   - Consistent "press" feedback (adds .is-pressed) with event delegation
*/
(() => {
  "use strict";

  const docEl = document.documentElement;

  // --- Firebase/Google Auth persistence (shared across all hubs) ---
  // Obiettivo: mantenere la sessione login stabile tra tutte le pagine HTML
  // SENZA toccare gli HTML. Questo file è già incluso ovunque.
  //
  // Nota importante: la persistenza è condivisa SOLO se i 7 HTML stanno sullo stesso ORIGIN
  // (stesso dominio + protocollo + porta). Se sono su origin diversi, il browser non condivide
  // lo storage e non esiste un fix lato JS.
  (function ensureAuthPersistenceOnce() {
    if (window.__gcAuthPersistenceStarted) return;
    window.__gcAuthPersistenceStarted = true;

    const MAX_TRIES = 30;      // ~3s
    const DELAY_MS = 100;
    let tries = 0;

    function safeDebugLog(...args) {
      // Debug opzionale: localStorage.setItem('gc_debug_persist','1')
      try {
        if (localStorage.getItem("gc_debug_persist") === "1") {
          console.log("[gc:persist]", ...args);
        }
      } catch (_e) {}
    }

    function tryCompatFirebase() {
      const fb = window.firebase;
      if (!fb || typeof fb.auth !== "function" || !fb.auth.Auth || !fb.auth.Auth.Persistence) return false;
      try {
        const auth = fb.auth();
        if (!auth || typeof auth.setPersistence !== "function") return false;
        // Prefer LOCAL; fallback SESSION (iOS private mode / storage restrictions)
        auth.setPersistence(fb.auth.Auth.Persistence.LOCAL)
          .then(() => safeDebugLog("compat: LOCAL ok"))
          .catch(() => auth.setPersistence(fb.auth.Auth.Persistence.SESSION)
            .then(() => safeDebugLog("compat: SESSION fallback ok"))
            .catch(() => safeDebugLog("compat: persistence failed"))
          );
        return true;
      } catch (_e) {
        return false;
      }
    }

    function tryModularBridge() {
      // Se nel tuo codice modular esponi un bridge, lo agganciamo qui senza toccare gli HTML.
      // Esempio bridge (una volta nel codice dove crei auth):
      // window.gcAuth = { auth, setPersistence, browserLocalPersistence, browserSessionPersistence };
      const b = window.gcAuth || window.__gcAuth || null;
      if (!b || !b.auth || typeof b.setPersistence !== "function") return false;
      const local = b.browserLocalPersistence || b.localPersistence || null;
      const session = b.browserSessionPersistence || b.sessionPersistence || null;
      if (!local) return false;
      Promise.resolve()
        .then(() => b.setPersistence(b.auth, local))
        .then(() => safeDebugLog("modular: LOCAL ok"))
        .catch(() => {
          if (!session) return;
          return b.setPersistence(b.auth, session)
            .then(() => safeDebugLog("modular: SESSION fallback ok"))
            .catch(() => safeDebugLog("modular: persistence failed"));
        });
      return true;
    }

    function tryCommonGlobals() {
      // Ultima spiaggia: alcune app espongono auth/persistence helper su window.
      const auth = window.auth || window.firebaseAuth || window.gcFirebaseAuth || null;
      const setPersistence = window.setPersistence || null;
      const local = window.browserLocalPersistence || window.LOCAL_PERSISTENCE || null;
      const session = window.browserSessionPersistence || window.SESSION_PERSISTENCE || null;
      if (!auth || typeof setPersistence !== "function" || !local) return false;
      Promise.resolve()
        .then(() => setPersistence(auth, local))
        .then(() => safeDebugLog("globals: LOCAL ok"))
        .catch(() => {
          if (!session) return;
          return setPersistence(auth, session)
            .then(() => safeDebugLog("globals: SESSION fallback ok"))
            .catch(() => safeDebugLog("globals: persistence failed"));
        });
      return true;
    }

    function tick() {
      tries++;
      const ok = tryCompatFirebase() || tryModularBridge() || tryCommonGlobals();
      if (ok) {
        window.__gcAuthPersistenceDone = true;
        return;
      }
      if (tries < MAX_TRIES) setTimeout(tick, DELAY_MS);
    }

    // Esegui subito: più presto = meglio (prima che partano eventuali flow di login)
    tick();
  })();

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
        try { location.href = getHubUrl(); } catch (_e) {}
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
