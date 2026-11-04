/* Keep navigation inside standalone/app mode (iOS A2HS + PWA) */
(function () {
  var isStandalone = false;
  try {
    isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      !!window.navigator.standalone;
  } catch (e) {}
  if (!isStandalone) return;

  document.addEventListener(
    "click",
    function (e) {
      var a = e.target && (e.target.closest ? e.target.closest("a[href]") : null);
      if (!a) return;
      if (a.target && a.target.toLowerCase() === "_blank") return;

      var href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))
        return;

      try {
        var url = new URL(a.href, location.href);
        if (url.origin === location.origin) {
          e.preventDefault();
          location.href = url.href;
        }
      } catch (_e) {}
    },
    true,
  );
})();

/* Register shared Service Worker so app-mode navigation/cache/auth helpers stay consistent with Index */
(function () {
  if (!("serviceWorker" in navigator)) return;
  const registerSw = function () {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
  };
  const schedule = function () {
    if ("requestIdleCallback" in window) {
      requestIdleCallback(registerSw, { timeout: 2500 });
      return;
    }
    setTimeout(registerSw, 1200);
  };
  if (document.readyState === "complete") {
    schedule();
    return;
  }
  window.addEventListener("load", schedule, { once: true });
})();
