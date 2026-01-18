/*
  GC PERF BOOT (v2)
  - fix scroll “app-like” iOS (anti-freeze + momentum su contenitori scrollabili)
  - ottimizzazioni Android (lite mode + vh/visualViewport)
  - warm-resume: migliora rientro dopo lock/unlock (auth + cache locale)
  - non tocca la tua logica app: patch difensive, tutto in try/catch
*/

(function () {
  // ------------------------------------------------------------
  // 0) Passive touch/wheel: evita scroll lock (iOS/Android)
  // ------------------------------------------------------------
  patchPassiveListeners();

  try {
    const ua = (navigator.userAgent || "").toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua) || !!window.navigator.standalone;

    const root = document.documentElement;
    const body = document.body;

    if (isAndroid) {
      root.classList.add("is-android");
      body.classList.add("is-android");
    }
    if (isIOS) {
      root.classList.add("is-ios");
      body.classList.add("is-ios");
    }

    // Safe-area multiplier:
    // - iOS: leggermente ridotta (ma non azzerata)
    // - Android: praticamente nulla (0) per evitare spazio sprecato
    let safeMult = 0.82;
    if (isAndroid) safeMult = 0.0;
    root.style.setProperty("--gc-safe-mult", String(safeMult));

    // Android low-end => modalità ultra-lite (riduce blur/ombre/animazioni)
    initLiteMode(isAndroid, root, body);

    // Fix viewport height (100vh) su WebView/PWA + keyboard/notch (Android + iOS)
    initDynamicVh(isAndroid, isIOS, root);

    // iOS: momentum scroll ovunque + anti-freeze per contenitori scrollabili
    if (isIOS) initIOSScrollFix();

    // Sensazione “app”: torna sulla stessa posizione scroll quando rientri su un HTML
    initScrollPersist();

    // Warm-resume auth/dati:
    // - Auth persistence (LOCAL)
    // - Firestore persistence (IndexedDB)
    // - Refresh token su resume
    initFirebaseWarmResume();

    // Cache locale “app shell” (html/css/js) via Service Worker
    initServiceWorker();
  } catch (_e) {
    // silenzioso
  }

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------

  function patchPassiveListeners() {
    try {
      const origAdd = EventTarget.prototype.addEventListener;
      if (!origAdd || origAdd.__gc_patched) return;

      const passiveTypes = { touchstart: true, touchmove: true, wheel: true };

      EventTarget.prototype.addEventListener = function (type, listener, options) {
        try {
          if (passiveTypes[type]) {
            let opts = options;

            if (opts == null) {
              opts = { passive: true };
            } else if (typeof opts === "boolean") {
              opts = { capture: opts, passive: true };
            } else if (typeof opts === "object") {
              // clone per non mutare l’oggetto del chiamante
              const o = {};
              for (const k in opts) o[k] = opts[k];

              if (o.passive === undefined) o.passive = true;

              // se qualcuno prova a bloccare lo scroll sul root, lo rendiamo passivo
              if (
                (type === "touchmove" || type === "wheel") &&
                (this === window ||
                  this === document ||
                  this === document.documentElement ||
                  this === document.body)
              ) {
                o.passive = true;
              }

              opts = o;
            }

            return origAdd.call(this, type, listener, opts);
          }
        } catch (_e) {}

        return origAdd.call(this, type, listener, options);
      };

      EventTarget.prototype.addEventListener.__gc_patched = true;
    } catch (_e) {}
  }

  function initLiteMode(isAndroid, root, body) {
    if (!isAndroid) return;

    let lite = false;

    try {
      const conn =
        navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn && conn.saveData) lite = true;
    } catch (_e) {}

    try {
      const mem = navigator.deviceMemory;
      if (typeof mem === "number" && mem > 0 && mem <= 4) lite = true;
    } catch (_e) {}

    try {
      const hc = navigator.hardwareConcurrency;
      if (typeof hc === "number" && hc > 0 && hc <= 4) lite = true;
    } catch (_e) {}

    if (lite) {
      root.classList.add("gc-lite");
      body.classList.add("gc-lite");
    }
  }

  function initDynamicVh(isAndroid, isIOS, root) {
    try {
      const vv = window.visualViewport;
      if (!vv || !(isAndroid || isIOS)) return;

      let raf = 0;
      const setVh = () => {
        raf = 0;
        const h = Math.round(vv.height || window.innerHeight || 0);
        if (h > 0) root.style.setProperty("--gc-vh", h + "px");
      };
      const schedule = () => {
        if (raf) return;
        raf = requestAnimationFrame(setVh);
      };

      schedule();
      vv.addEventListener("resize", schedule, { passive: true });
      vv.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener(
        "orientationchange",
        () => {
          setTimeout(schedule, 60);
        },
        { passive: true }
      );
    } catch (_e) {}
  }

  function initIOSScrollFix() {
    try {
      const SCROLL_HINT_SELECTORS = [
        ".modalShell",
        ".rowsScroll",
        "#warehouseBody",
        ".sheet .sbd",
        ".card .bd",
      ];

      const addClass = (el) => {
        try {
          if (!el || !el.classList) return;
          el.classList.add("gc-ios-scroll");
        } catch (_e) {}
      };

      const scan = () => {
        try {
          // 1) Selettori noti
          SCROLL_HINT_SELECTORS.forEach((sel) => {
            try {
              document.querySelectorAll(sel).forEach(addClass);
            } catch (_e) {}
          });

          // 2) Heuristica: elementi con overflow-y auto/scroll e contenuto più lungo
          // (cap per non fare casino su DOM enormi)
          let added = 0;
          const candidates = document.querySelectorAll(
            "div,main,section,article,ul,ol,table,tbody,aside"
          );
          for (let i = 0; i < candidates.length; i++) {
            if (added >= 450) break;
            const el = candidates[i];
            try {
              if (!el || el.clientHeight < 40) continue;
              if (el.scrollHeight <= el.clientHeight + 2) continue;

              const cs = getComputedStyle(el);
              const oy = cs && cs.overflowY;
              if (oy === "auto" || oy === "scroll") {
                addClass(el);
                added++;
              }
            } catch (_e) {}
          }
        } catch (_e) {}
      };

      const kick = () => {
        // Hack iOS: ogni tanto -webkit-overflow-scrolling si “addormenta”
        try {
          const els = document.querySelectorAll(".gc-ios-scroll");
          els.forEach((el) => {
            try {
              el.style.webkitOverflowScrolling = "auto";
              // reflow
              void el.offsetHeight;
              el.style.webkitOverflowScrolling = "touch";
            } catch (_e) {}
          });
        } catch (_e) {}
      };

      const kickLater = () => {
        // 2 frame + micro delay => più affidabile dopo cambi layout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(kick, 50);
          });
        });
      };

      const boot = () => {
        scan();
        kickLater();
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { passive: true });
      } else {
        boot();
      }

      // Rescan quando il DOM cambia (menu/section swap)
      try {
        let t = 0;
        const mo = new MutationObserver(() => {
          if (t) return;
          t = setTimeout(() => {
            t = 0;
            scan();
          }, 120);
        });
        mo.observe(document.documentElement, { childList: true, subtree: true });
      } catch (_e) {}

      // Resume events
      window.addEventListener("pageshow", boot, { passive: true });
      window.addEventListener("focus", boot, { passive: true });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (!document.hidden) boot();
        },
        { passive: true }
      );

      // Keyboard open/close spesso cambia viewport e può “freezare” scroll
      document.addEventListener("focusin", kickLater);
      document.addEventListener("focusout", kickLater);
    } catch (_e) {}
  }

  function initScrollPersist() {
    try {
      const key = "__gc_scroll:" + location.pathname + location.search;

      const getKeyForEl = (el, idx) => {
        try {
          if (el.id) return "#" + el.id;
          const dk = el.getAttribute && el.getAttribute("data-gc-scrollkey");
          if (dk) return "data:" + dk;
        } catch (_e) {}
        return "_s" + idx;
      };

      const save = () => {
        try {
          const data = {
            t: Date.now(),
            winY: typeof window.scrollY === "number" ? window.scrollY : 0,
            els: {},
          };

          let idx = 0;
          document
            .querySelectorAll(".rowsScroll,#warehouseBody,.sheet .sbd")
            .forEach((el) => {
              try {
                const k = getKeyForEl(el, idx++);
                data.els[k] = el.scrollTop || 0;
              } catch (_e) {}
            });

          sessionStorage.setItem(key, JSON.stringify(data));
        } catch (_e) {}
      };

      const restore = () => {
        try {
          const raw = sessionStorage.getItem(key);
          if (!raw) return;
          const data = JSON.parse(raw);
          if (!data) return;

          requestAnimationFrame(() => {
            try {
              if (typeof data.winY === "number") window.scrollTo(0, data.winY);
            } catch (_e) {}

            try {
              let idx = 0;
              document
                .querySelectorAll(".rowsScroll,#warehouseBody,.sheet .sbd")
                .forEach((el) => {
                  const k = getKeyForEl(el, idx++);
                  const v = data.els && data.els[k];
                  if (typeof v === "number") el.scrollTop = v;
                });
            } catch (_e) {}
          });
        } catch (_e) {}
      };

      // Page lifecycle (non usare unload: rompe BFCache iOS)
      window.addEventListener("pagehide", save);
      window.addEventListener("pageshow", restore);
    } catch (_e) {}
  }

  function initFirebaseWarmResume() {
    try {
      let didInit = false;

      const tryInit = () => {
        if (didInit) return true;

        const fb = window.firebase;
        if (!fb) return false;

        // AUTH persistence
        try {
          if (fb.auth && fb.auth().setPersistence && fb.auth.Auth?.Persistence) {
            fb.auth()
              .setPersistence(fb.auth.Auth.Persistence.LOCAL)
              .catch(() => {});
          }
        } catch (_e) {}

        // FIRESTORE persistence
        try {
          if (fb.firestore && fb.firestore().enablePersistence) {
            fb.firestore()
              .enablePersistence({ synchronizeTabs: true })
              .catch(() => {});
          }
        } catch (_e) {}

        didInit = true;
        return true;
      };

      // firebase potrebbe caricare dopo gc_perf.js: poll breve e poi stop
      let tries = 0;
      const tick = () => {
        tries++;
        if (tryInit()) return;
        if (tries < 60) setTimeout(tick, 120);
      };
      tick();

      const refreshToken = () => {
        try {
          const fb = window.firebase;
          const cu = fb?.auth?.().currentUser;
          if (cu && cu.getIdToken) cu.getIdToken(true).catch(() => {});
        } catch (_e) {}
      };

      // Resume: token refresh (evita “permessi insufficienti” dopo lunga pausa)
      window.addEventListener("pageshow", refreshToken, { passive: true });
      window.addEventListener("focus", refreshToken, { passive: true });
      document.addEventListener(
        "visibilitychange",
        () => {
          if (!document.hidden) refreshToken();
        },
        { passive: true }
      );
    } catch (_e) {}
  }

  function initServiceWorker() {
    try {
      if (!("serviceWorker" in navigator)) return;
      if (
        location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1"
      ) {
        return;
      }

      const register = async () => {
        try {
          // Non sovrascrivere service worker già presente su scope '/'
          const regs = await navigator.serviceWorker.getRegistrations();
          const rootScope = location.origin + "/";

          const hasOtherRoot = regs.find((r) => {
            try {
              const s = r.scope;
              const script = r.active && r.active.scriptURL;
              return s === rootScope && script && !/\/gc_sw\.js(\?|$)/.test(script);
            } catch (_e) {
              return false;
            }
          });
          if (hasOtherRoot) return;

          const existing = regs.find((r) => {
            try {
              const s = r.scope;
              const script = r.active && r.active.scriptURL;
              return s === rootScope && script && /\/gc_sw\.js(\?|$)/.test(script);
            } catch (_e) {
              return false;
            }
          });

          if (existing) {
            try {
              existing.update();
            } catch (_e) {}
            return;
          }

          await navigator.serviceWorker.register("/gc_sw.js", { scope: "/" });
        } catch (_e) {}
      };

      // leggermente posticipato: non deve impattare il first paint
      if (document.readyState === "complete") {
        setTimeout(register, 180);
      } else {
        window.addEventListener(
          "load",
          () => {
            setTimeout(register, 180);
          },
          { passive: true }
        );
      }
    } catch (_e) {}
  }
})();
