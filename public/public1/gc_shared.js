/* General Copper — Shared UI (NO app.js/app.css interference)
   File: public1/gc_shared.js
   Adds a desktop-only "Torna indietro" button (top-left) that points to hub_centrale.html
*/
(function(){
  "use strict";

  // ---- Config (can be overridden per-page) ----
  // Optional overrides:
  // 1) <meta name="gc-hub" content="./hub_centrale.html">
  // 2) <body data-gc-hub="./hub_centrale.html">
  // 3) Disable on a page: <body data-gc-back="off">
  var DEFAULT_HUB_HREF = "./hub_centrale.html";

  function isDesktop(){
    try{
      if(!window.matchMedia) return false;
      var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
      return finePointer && (window.innerWidth || 0) >= 900;
    }catch(_e){
      return false;
    }
  }

  function isHubPage(){
    try{
      var p = (location.pathname || "").toLowerCase();
      // matches ".../hub_centrale.html" or ".../hub_centrale"
      return p.endsWith("/hub_centrale.html") || p.endsWith("hub_centrale.html") || p.endsWith("/hub_centrale");
    }catch(_e){
      return false;
    }
  }

  function getOverrideHubHref(){
    try{
      var meta = document.querySelector('meta[name="gc-hub"]');
      var m = meta && meta.getAttribute("content");
      if(m && String(m).trim()) return String(m).trim();

      var b = document.body && document.body.getAttribute("data-gc-hub");
      if(b && String(b).trim()) return String(b).trim();
    }catch(_e){}
    return "";
  }

  function shouldDisable(){
    try{
      var v = document.body && document.body.getAttribute("data-gc-back");
      return String(v || "").trim().toLowerCase() === "off";
    }catch(_e){
      return false;
    }
  }

  function buildNode(hubHref){
    var wrap = document.createElement("div");
    wrap.className = "gcBackWrap";
    wrap.setAttribute("data-gc-shared", "back");

    var a = document.createElement("a");
    a.className = "gcBackBtn";
    a.href = hubHref;
    a.setAttribute("aria-label", "Torna al hub centrale");
    a.title = "Torna al hub centrale";

    // Inline SVG (no external deps)
    a.innerHTML = (
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>' +
      '<span>Torna indietro</span>'
    );

    wrap.appendChild(a);
    return wrap;
  }

  function init(){
    try{
      if(shouldDisable()) return;
      if(isHubPage()) return;
      if(!isDesktop()) return;

      // Don't duplicate
      if(document.querySelector(".gcBackWrap[data-gc-shared='back']")) return;

      var hubHref = getOverrideHubHref() || DEFAULT_HUB_HREF;

      // Insert as first element in body
      var node = buildNode(hubHref);
      document.body.insertBefore(node, document.body.firstChild);
    }catch(_e){}
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init, { once:true });
  }else{
    init();
  }
})();