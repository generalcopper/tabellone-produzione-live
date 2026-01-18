/* gc_back_to_index.js
   Desktop-only back button (top-left) that navigates to index.
   Usage (inside each HTML):
   <script defer src="/public1/gc_back_to_index.js" data-back-href="./index.html"></script>

   Optional:
   - data-back-href: destination (default: "./index.html")
   - data-back-label: label text (default: "Index")
*/
(function(){
  "use strict";

  const BTN_ID = "gcBackToIndex";
  const STYLE_ID = "gcBackToIndexStyle";
  const DESKTOP_MIN_W = 1024;

  function getScriptEl(){
    // document.currentScript works when script is NOT "defer" in some browsers;
    // with defer we also fallback to the last matching script tag.
    try{
      const cs = document.currentScript;
      if(cs) return cs;
    }catch(_e){}
    const all = document.querySelectorAll('script[src*="gc_back_to_index.js"]');
    return all && all.length ? all[all.length-1] : null;
  }

  function resolveCfg(){
    const s = getScriptEl();
    const ds = (s && s.dataset) ? s.dataset : {};
    const meta = document.querySelector('meta[name="gc-back-index"]');
    const href = (ds.backHref || ds.href || (meta && meta.content) || "./index.html").trim();
    const label = (ds.backLabel || "Index").trim();
    return { href, label };
  }

  function isDesktop(){
    try{
      return !!(window.matchMedia && window.matchMedia(`(min-width:${DESKTOP_MIN_W}px)`).matches);
    }catch(_e){
      return (window.innerWidth || 0) >= DESKTOP_MIN_W;
    }
  }

  function isAtIndex(){
    try{
      const p = (location.pathname || "").toLowerCase();
      const base = (p.split("/").pop() || "").trim();
      return (base === "index.html" || base === "index.htm" || base === "index");
    }catch(_e){
      return false;
    }
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;

    const css = `
#${BTN_ID}.gcBackToIndex{
  position: fixed;
  top: calc(14px + env(safe-area-inset-top, 0px));
  left: calc(14px + env(safe-area-inset-left, 0px));
  z-index: 9999;

  display: none;
  align-items: center;
  gap: 10px;

  padding: 10px 12px;
  border-radius: 16px;

  border: 1px solid rgba(12,22,52,.12);
  background: rgba(255,255,255,.70);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);

  box-shadow: 0 12px 26px rgba(0,0,0,.10);
  color: rgba(12,16,26,.88);

  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-weight: 900;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;

  transition: transform .14s cubic-bezier(.22,.61,.36,1), box-shadow .16s ease, background .16s ease, opacity .16s ease;
}

#${BTN_ID}.gcBackToIndex:hover{
  background: rgba(255,255,255,.82);
  box-shadow: 0 14px 30px rgba(0,0,0,.12);
  transform: translateY(-1px);
}

#${BTN_ID}.gcBackToIndex:active{
  transform: translateY(1px);
  box-shadow: 0 10px 18px rgba(0,0,0,.10);
  opacity: .94;
}

#${BTN_ID}.gcBackToIndex:focus-visible{
  outline: 2px solid rgba(10,132,255,.28);
  outline-offset: 2px;
}

#${BTN_ID} .gcBackIcon{
  width: 28px;
  height: 28px;
  border-radius: 12px;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  background: rgba(0,0,0,.05);
  border: 1px solid rgba(0,0,0,.08);

  font-size: 18px;
  line-height: 1;
}

#${BTN_ID} .gcBackLabel{
  font-size: 13px;
  letter-spacing: .02em;
  text-transform: uppercase;
  opacity: .92;
}

@media (min-width: ${DESKTOP_MIN_W}px){
  #${BTN_ID}.gcBackToIndex{ display: inline-flex; }
}
@media (max-width: ${DESKTOP_MIN_W-1}px){
  #${BTN_ID}.gcBackToIndex{ display: none !important; }
}
@media print{
  #${BTN_ID}.gcBackToIndex{ display: none !important; }
}
`;
    const st = document.createElement("style");
    st.id = STYLE_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  function ensureButton(){
    if(document.getElementById(BTN_ID)) return document.getElementById(BTN_ID);

    const cfg = resolveCfg();

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = BTN_ID;
    btn.className = "gcBackToIndex";
    btn.setAttribute("aria-label", "Torna a index");
    btn.innerHTML = `<span class="gcBackIcon" aria-hidden="true">←</span><span class="gcBackLabel"></span>`;

    const labelEl = btn.querySelector(".gcBackLabel");
    if(labelEl) labelEl.textContent = cfg.label || "Index";

    btn.addEventListener("click", ()=>{
      const href = (cfg.href || "./index.html").trim();
      if(!href || href === "#") return;
      try{ window.location.href = href; }
      catch(_e){ location.href = href; }
    });

    // Insert without altering layout: fixed position, so body is fine
    document.body.appendChild(btn);

    // Hide on index itself (optional)
    if(isAtIndex()){
      btn.style.display = "none";
    }

    // If JS runs on mobile, keep it hidden (CSS already does, but double-safety)
    if(!isDesktop()){
      btn.style.display = "none";
    }

    return btn;
  }

  function boot(){
    try{
      ensureStyle();
      ensureButton();
    }catch(e){
      // never break the page
      try{ console.warn("gc_back_to_index init failed", e); }catch(_e){}
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
})();