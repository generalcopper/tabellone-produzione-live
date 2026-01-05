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
