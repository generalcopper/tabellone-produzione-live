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
})();
