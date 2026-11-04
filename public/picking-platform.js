/* Rilevamento piattaforma precoce: aggiunge .is-android / .is-ios su <html>
       per ottimizzazioni CSS mirate. Nessun impatto sulla logica. */
(function () {
  try {
    var ua = navigator.userAgent || "";
    var isApple =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/.test(ua);
    var de = document.documentElement;
    if (isAndroid && !isApple) de.classList.add("is-android");
    else if (isApple) de.classList.add("is-ios");
  } catch (_e) {}
})();
