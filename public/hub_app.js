/****************************************************************
     * Firebase (Auth + Firestore + Storage) — Realtime sync
     * - Google login persistente tra pagine (stesso progetto Firebase)
     * - Fornitori + Prodotti + Movimenti inventario in tempo reale
     ****************************************************************/
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
    import {initializeFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, deleteField, getDocs, runTransaction} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
    import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-storage.js";

/* ============================================================
   MERGED FILE: mainModule.js + hub_bundle.js
   - hub_bundle.js viene eseguito prima del core, così le view
     (OCR, Inventario, ecc.) sono già presenti quando il core
     prende i riferimenti al DOM.
   ============================================================ */

/* ===== hub_bundle.js (merged) ===== */
/* ============================================================
   HUB INVENTARIO — Bundle sezioni (auto-merge)
   Contiene:
   - inventario.js
   - movimenti.js
   - flussi.js
   - hub_trash.js
   - categorie.js
   - prodotti.js
   - ocr.js

   Nota: app.js rimane separato (core).
   ============================================================ */


;
/* ===== inventario.js ===== */
/* Hub Inventario — Sezione Inventario (viewInventory)
 * Estratta da hub_inventario.html per alleggerire l'HTML.
 * File: /public1/inventario.js
 */
(function(){
  try {
    if (document.getElementById("viewInventory")) return;

    const html = "<div id=\"viewInventory\" class=\"view modalOverlay\">\n  <article class=\"card\" id=\"stockCard\">\n    <div class=\"hd\">\n      <div class=\"overlayHeaderTitle\">\n        <button class=\"iconBtn overlayBack\" id=\"btnBackInv\" type=\"button\" aria-label=\"Indietro\">\u2039</button>\n        <h2>Inventario</h2>\n      </div>\n      <div class=\"inlineRow\" style=\"gap:8px; justify-content:flex-end;\">\n        <div class=\"pill\" id=\"pillInvWarehouse\" style=\"display:none\">\u2014</div>\n        <div class=\"pill\" id=\"pillStock\">0 righe</div>\n        <button class=\"iconBtn\" id=\"btnCloseInv\" type=\"button\" aria-label=\"Chiudi\">\u00d7</button>\n      </div>\n    </div>\n    <div class=\"bd\">\n\n      <!-- Step 1: scelta inventario -->\n      <div id=\"invPicker\" class=\"stack\">\n        <div class=\"hero-sub\">Seleziona inventario</div>\n        <div class=\"homeActions\" style=\"grid-template-columns: 1fr; gap: 14px;\">\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickCerea\" type=\"button\" aria-label=\"Inventario Cerea\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CEREA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Cerea</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickConcamarise\" type=\"button\" aria-label=\"Inventario Concamarise\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CONCA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Concamarise</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n        </div>\n      </div>\n\n      <!-- Step 2: dettaglio inventario selezionato -->\n      <div id=\"invDetail\" class=\"stack\" style=\"display:none;\">\n        <div class=\"inlineRow\" style=\"justify-content:space-between; align-items:flex-end; gap:12px;\">\n          <div class=\"stack\" style=\"flex:1; min-width: 220px;\">\n            <div class=\"hero-sub\" id=\"invDetailTitle\">Inventario</div>\n            <div class=\"muted\">Stock e categorie per sede</div>\n          </div>\n          <button class=\"btn btn-ghost btn-xs\" id=\"btnInvBackPicker\" type=\"button\">\u2190 Cambia inventario</button>\n        </div>\n\n        <div class=\"inlineRow listStickyBar\" style=\"justify-content: space-between;\">\n          <div class=\"inlineRow\" style=\"flex: 1 1 auto;\">\n            <div class=\"field\" style=\"min-width: 220px;\">\n              <label for=\"searchStock\">Cerca</label>\n              <input id=\"searchStock\" placeholder=\"Fornitore / codice / articolo\u2026\" />\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCustomer\">Fornitore</label>\n              <select id=\"filterCustomer\">\n                <option value=\"\">Tutti</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterLow\">Filtro</label>\n              <select id=\"filterLow\">\n                <option value=\"all\">Tutti</option>\n                <option value=\"low\">Solo scorta bassa</option>\n                <option value=\"zero\">Solo zero</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCategory\">Categoria</label>\n              <select id=\"filterCategory\">\n                <option value=\"\">Tutte</option>\n                <option value=\"__none\">Non assegnata</option>\n              </select>\n            </div>\n          </div>\n        </div>\n\n        <!-- STOCK (per inventario selezionato) -->\n        <div class=\"tableWrap\" style=\"max-height: 420px; overflow:auto; margin-top: 10px;\">\n          <table class=\"dataGrid\">\n            <thead>\n              <tr>\n                <th>Nome articolo</th>\n                <th>Cod. articolo</th>\n                <th>Categoria</th>\n                <th class=\"qty\">Q.tà</th>\n              </tr>\n            </thead>\n            <tbody id=\"stockTbody\">\n              <tr><td class=\"td-muted\" colspan=\"4\">Seleziona un inventario.</td></tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n    </div>\n  </article>\n</div>";

    const tpl = document.createElement("template");
    tpl.innerHTML = html;

    const anchor =
      document.getElementById("viewMovements") ||
      document.getElementById("viewFlows") ||
      document.getElementById("viewAnag") ||
      document.getElementById("toast") ||
      document.getElementById("centerPop") ||
      document.getElementById("mainModuleCode") ||
      null;

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(tpl.content, anchor);
    } else {
      document.body.appendChild(tpl.content);
    }
  } catch (e) {
    try { console.error("[inventario.js] inject failed", e); } catch (_) {}
  }
})();


;
/* ===== movimenti.js ===== */
(function(){
  "use strict";

  var api = null;
  var els = {};

  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, function(ch){
      return ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[ch] || ch;
    });
  }

  function norm(s){ return String(s ?? "").trim().toLowerCase(); }

  function isDocLike(mv){
    try{
      var src = String(mv.source || "").toUpperCase();
      if (src === "OCR") return true;
      var note = String(mv.note || "");
      if (/\bDDT\b|DOCUMENTO|TRASPORTO|BOLLA|FATTURA/i.test(note)) return true;
      if (String(mv.docNum || "").trim()) return true;
      return false;
    }catch(_){ return false; }
  }

  function buildDocKeyFromMovement(mv){
    if (!api || !mv) return "";
    try{
      var meta = {
        customer: mv.customer || "",
        date: mv.date || "",
        source: mv.source || "OCR",
        note: mv.note || "",
        docNum: mv.docNum || "",
        vatNorm: mv.supplierVat || mv.vatNorm || mv.vat || ""
      };
      if (typeof api.docKeyFromMeta === "function") return String(api.docKeyFromMeta(meta) || "");
    }catch(_){}
    return "";
  }

  function getAllMovements(){
    try{
      var arr = (api && api.state && Array.isArray(api.state.movements)) ? api.state.movements : [];
      return arr.slice();
    }catch(_){ return []; }
  }

  function applyFilters(list){
    var q = norm(els.movSearch && els.movSearch.value);
    var t = String(els.movTypeFilter && els.movTypeFilter.value || "").trim().toUpperCase();
    var wh = String(els.movWhFilter && els.movWhFilter.value || "").trim().toLowerCase();
    var from = String(els.movFrom && els.movFrom.value || "").trim();
    var to   = String(els.movTo && els.movTo.value || "").trim();

    return list.filter(function(mv){
      if (!mv) return false;

      if (t && String(mv.type || "").toUpperCase() !== t) return false;

      if (wh){
        var w = (api && typeof api.normalizeWarehouse === "function")
          ? api.normalizeWarehouse(mv.warehouse || "")
          : String(mv.warehouse || "").trim().toLowerCase();
        if (w !== wh) return false;
      }

      // Date filter uses mv.date (YYYY-MM-DD). If missing, fall back to createdAt ISO date.
      var d = String(mv.date || "").trim();
      if (!d){
        var ca = String(mv.createdAt || "").trim();
        if (ca && ca.length >= 10) d = ca.slice(0,10);
      }
      if (from && d && d < from) return false;
      if (to && d && d > to) return false;

      if (q){
        var hay = [
          mv.customer, mv.code, mv.item, mv.note, mv.source, mv.docNum, mv.docType
        ].map(norm).join(" ");
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
  }

  function applySort(list){
    var s = String(els.movSort && els.movSort.value || "createdAtDesc");

    function cmpStr(a,b){
      a = String(a || "");
      b = String(b || "");
      if (a && b && a !== b) return a.localeCompare(b);
      if (a !== b) return (a ? 1 : 0) - (b ? 1 : 0);
      return 0;
    }

    function cmpNum(a,b){
      a = Number(a || 0);
      b = Number(b || 0);
      if (a !== b) return a - b;
      return 0;
    }

    list.sort(function(A,B){
      var a = A || {}, b = B || {};

      if (s === "createdAtAsc" || s === "createdAtDesc"){
        var ca = String(a.createdAt || a.createdAtIso || "");
        var cb = String(b.createdAt || b.createdAtIso || "");
        var c = cmpStr(ca, cb);
        if (s === "createdAtDesc") c = -c;
        if (c !== 0) return c;
      }

      if (s === "dateAsc" || s === "dateDesc"){
        var da = String(a.date || "");
        var db = String(b.date || "");
        var c2 = cmpStr(da, db);
        if (s === "dateDesc") c2 = -c2;
        if (c2 !== 0) return c2;
      }

      if (s === "customerAsc"){
        var c3 = cmpStr(a.customer, b.customer);
        if (c3 !== 0) return c3;
      }

      if (s === "codeAsc"){
        var c4 = cmpStr(a.code, b.code);
        if (c4 !== 0) return c4;
      }

      // stable-ish fallback
      var cc = cmpStr(a.customer, b.customer); if (cc !== 0) return cc;
      var cd = cmpStr(a.code, b.code); if (cd !== 0) return cd;
      var ci = cmpStr(a.item, b.item); if (ci !== 0) return ci;
      return cmpNum(a.qty, b.qty);
    });

    return list;
  }

  function badgeHtml(type){
    var t = String(type || "").toUpperCase() === "OUT" ? "OUT" : "IN";
    var cls = (t === "OUT") ? "badge out" : "badge in";
    var label = (t === "OUT") ? "OUT" : "IN";
    return '<span class="'+cls+'">'+label+'</span>';
  }

  function whLabel(v){
    if (api && typeof api.warehouseLabel === "function") return api.warehouseLabel(v);
    var s = String(v || "").toLowerCase();
    if (s.includes("conca")) return "Concamarise";
    return "Cerea";
  }

  function shortWh(v){
    var s = (api && typeof api.normalizeWarehouse === "function") ? api.normalizeWarehouse(v) : String(v || "").toLowerCase();
    return (s === "concamarise") ? "Conca" : "Cerea";
  }

  function renderTable(list, totalCount){
    if (!els.movementsAllTbody) return;

    // pills / meta
    try{
      if (els.pillMovementsCount) els.pillMovementsCount.textContent = String(totalCount || 0);
      if (els.movementsMeta) {
        var shown = list.length;
        els.movementsMeta.textContent = (shown === totalCount)
          ? (shown.toLocaleString("it-IT") + " movimenti")
          : ("Mostrati " + shown.toLocaleString("it-IT") + " su " + (totalCount||0).toLocaleString("it-IT"));
      }
    }catch(_){}

    if (!list.length){
      els.movementsAllTbody.innerHTML = '<tr><td class="td-muted" colspan="9">Nessun movimento.</td></tr>';
      return;
    }

    // safety cap (UI)
    var cap = 2000;
    var sliced = list;
    var capped = false;
    if (list.length > cap){
      sliced = list.slice(0, cap);
      capped = true;
    }

    els.movementsAllTbody.innerHTML = sliced.map(function(mv){
      var id = String(mv.id || "");
      var date = String(mv.date || "").trim();
      if (!date){
        var ca = String(mv.createdAt || "");
        if (ca && ca.length >= 10) date = ca.slice(0,10);
      }
      var customer = String(mv.customer || "");
      var code = String(mv.code || "");
      var item = String(mv.item || "");
      var qty = (api && typeof api.safeInt === "function") ? api.safeInt(mv.qty) : (Number(mv.qty)||0);
      var uom = String(mv.uom || "").trim();
      var qtyTxt = String(mv.qtyRaw || "").trim();
      if (!qtyTxt){
        qtyTxt = Number(qty).toLocaleString("it-IT") + (uom ? (" " + uom) : "");
      }
      var wh = shortWh(mv.warehouse || "");
      var src = String(mv.source || "");
      var showDoc = isDocLike(mv);

      return '' +
        '<tr data-mvid="'+esc(id)+'" title="Dettagli">' +
          '<td data-label="Data">'+esc(date || "—")+'</td>' +
          '<td data-label="Tipo">'+badgeHtml(mv.type)+'</td>' +
          '<td data-label="Fornitore">'+esc(customer)+'</td>' +
          '<td data-label="Codice" class="td-muted"><span class="kbd">'+esc(code)+'</span></td>' +
          '<td data-label="Articolo">'+esc(item)+'</td>' +
          '<td data-label="Q.tà" class="qty">'+Number(qty).toLocaleString("it-IT")+'</td>' +
          '<td data-label="Sede" class="colHideSm">'+esc(wh)+'</td>' +
          '<td data-label="Fonte" class="colHideSm">'+esc(src)+'</td>' +
          '<td data-label="">' +
            (showDoc ? '<button class="btn btn-ghost mini jsOpenDoc" type="button" data-mvid="'+esc(id)+'" title="Apri documento">Doc</button>' : '') +
          '</td>' +
        '</tr>';
    }).join("");

    if (capped){
      els.movementsAllTbody.insertAdjacentHTML("beforeend",
        '<tr><td class="td-muted" colspan="9">Mostrati i primi '+cap.toLocaleString("it-IT")+' movimenti. Usa i filtri per restringere.</td></tr>');
    }
  }

  function openDetails(mv){
    if (!api || !mv) return;
    var lines = [];
    function push(k,v){
      var s = String(v ?? "").trim();
      if (!s) s = "—";
      lines.push(k + ": " + s);
    }
    push("Tipo", (String(mv.type || "").toUpperCase() === "OUT") ? "OUT (scarico)" : "IN (carico)");
    push("Data documento", mv.date);
    push("Creato il", mv.createdAt);
    push("Fornitore", mv.customer);
    push("Codice", mv.code);
    push("Articolo", mv.item);
    push("Q.tà", String(String(mv.qtyRaw || "").trim() || (((api.safeInt ? api.safeInt(mv.qty) : mv.qty) ?? "") + (String(mv.uom||"").trim() ? (" " + String(mv.uom||"").trim()) : ""))));
    push("Sede", whLabel(mv.warehouse || ""));
    push("Fonte", mv.source);
    push("Note", mv.note);
    if (mv.docType || mv.docNum || mv.docDateRaw){
      push("Doc tipo", mv.docType);
      push("Doc n.", mv.docNum);
      push("Doc data (raw)", mv.docDateRaw);
    }
    if (mv.lineIndex != null && String(mv.lineIndex).trim() !== "") push("Riga", mv.lineIndex);
    if (mv.rawText) push("RawText", String(mv.rawText).slice(0, 800) + (String(mv.rawText).length > 800 ? "…" : ""));
    try{
      api.openModal("Dettaglio movimento", lines.join("\n"));
    }catch(_){}
  }

  function bindEvents(){
    var inputs = [els.movSearch, els.movTypeFilter, els.movWhFilter, els.movSort, els.movFrom, els.movTo];
    inputs.forEach(function(el){
      if (!el) return;
      el.addEventListener("input", render);
      el.addEventListener("change", render);
    });

    if (els.btnMovExport){
      els.btnMovExport.addEventListener("click", function(){
        try{
          api.exportMovementsCSV();
          api.showToast && api.showToast("CSV movimenti scaricato");
        }catch(e){
          try{ api.openModal("Export fallito", String(e && (e.message || e) || e)); }catch(_){}
        }
      });
    }

    if (els.movementsAllTbody){
      els.movementsAllTbody.addEventListener("click", function(e){
        var btn = e.target && e.target.closest ? e.target.closest("button.jsOpenDoc") : null;
        if (btn){
          e.preventDefault(); e.stopPropagation();
          var id = btn.getAttribute("data-mvid") || "";
          var mv = (getAllMovements().find(function(x){ return String(x && x.id || "") === String(id); })) || null;
          if (!mv) return;
          var key = buildDocKeyFromMovement(mv);
          if (key && typeof api.openDocDetail === "function") {
            api.openDocDetail(key);
            return;
          }
          // fallback: show details
          openDetails(mv);
          return;
        }

        var tr = e.target && e.target.closest ? e.target.closest("tr[data-mvid]") : null;
        if (!tr) return;
        var id2 = tr.getAttribute("data-mvid") || "";
        var mv2 = (getAllMovements().find(function(x){ return String(x && x.id || "") === String(id2); })) || null;
        if (mv2) openDetails(mv2);
      });
    }
  }

  function cacheEls(){
    els.viewMovements = $("viewMovements");
    els.movSearch = $("movSearch");
    els.movTypeFilter = $("movTypeFilter");
    els.movWhFilter = $("movWhFilter");
    els.movSort = $("movSort");
    els.movFrom = $("movFrom");
    els.movTo = $("movTo");
    els.btnMovExport = $("btnMovExport");
    els.pillMovementsCount = $("pillMovementsCount");
    els.movementsAllTbody = $("movementsAllTbody");
    els.movementsMeta = $("movementsMeta");
  }

  function render(){
    if (!api) return;

    cacheEls();

    // Se la vista non esiste, stop
    if (!els.viewMovements) return;

    var all = getAllMovements();
    var total = all.length;

    // se la pagina non è aperta, aggiorna solo il contatore (evita lavoro)
    if (!els.viewMovements.classList.contains("active")){
      try{
        if (els.pillMovementsCount) els.pillMovementsCount.textContent = String(total);
      }catch(_){}
      return;
    }

    var filtered = applyFilters(all);
    applySort(filtered);
    renderTable(filtered, total);
  }

  function refresh(){
    try{
      // default: apri sui più recenti
      cacheEls();
      if (els.movSort && !els.movSort.value) els.movSort.value = "createdAtDesc";
    }catch(_){}
    render();
  }

  function init(_api){
    api = _api || (window && window.HubInv) || null;
    if (!api) return;
    cacheEls();
    bindEvents();
    // prima render
    render();
  }

  // Public hook used by main module
  window.HubMovements = {
    init: init,
    render: render,
    refresh: refresh
  };

  // Wait for app
  window.addEventListener("HubInvReady", function(ev){
    try{ init(ev && ev.detail); }catch(_){}
  });

  // If already there (hot reload)
  if (window.HubInv){
    try{ init(window.HubInv); }catch(_){}
  }
})();


;
/* ===== flussi.js ===== */
// /public1/flussi.js
// Inject "DDT Caricati" (Flussi) view markup into #viewFlows
(function(){
  try{
    var root = document.getElementById("viewFlows");
    if (!root) return;
    if (root.dataset && root.dataset.injected === "1") return;
    if (root.dataset) root.dataset.injected = "1";
    root.innerHTML = `<article class="card" id="flowsCard">
    <div class="hd">
      <div class="overlayHeaderTitle">
        <button class="iconBtn overlayBack" id="btnBackFlows" type="button" aria-label="Indietro">‹</button>
        <h2>DDT Caricati</h2>
      </div>
      <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
        <div class="pill" id="pillFlowsCount">0</div>
        <button class="iconBtn" id="btnCloseFlows" type="button" aria-label="Chiudi">×</button>
      </div>
    </div>
    <div class="bd">
      <div class="inlineRow" style="justify-content:space-between; align-items:flex-end; gap:12px;">
        <div class="stack" style="flex:1; min-width: 220px;">
          <div class="hero-sub">DDT caricati</div>
          <div class="muted">Click su un DDT per modificarlo</div>
        </div>
        <button class="btn btn-secondary" id="btnFlowsExport" type="button">Esporta CSV</button>
      </div>

      <div class="tableWrap" style="max-height: 520px; overflow:auto; margin-top: 10px;">
        <table class="dataGrid">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Fornitore</th>
              <th class="qty">Righe</th>
              <th class="qty">Pezzi</th>
            </tr>
          </thead>
          <tbody id="flowsTbody">
            <tr><td class="td-muted" colspan="4">Nessun flusso ancora.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </article>`;
  }catch(e){
    try{ console.warn("flussi.js inject failed", e); }catch(_){ }
  }
})();


;
/* ===== hub_trash.js ===== */
/* hub_trash.js - Cestino (soft delete + restore)
   Richiede: globalThis.__HUB = { fb, ORG_ID, setView, closeSideMenu, FS, orgCol }
*/
(function(){
  "use strict";

  const S = {
    ready: false,
    unsub: null,
    items: [],
    selected: new Set(),
    ui: {},
    lastFilter: { q:"", kind:"", sort:"deletedDesc" }
  };

  function hub(){ return globalThis.__HUB || null; }

  function $(id){ return document.getElementById(id); }

  function safeStr(v){ return (v == null) ? "" : String(v); }

  function fmtDate(ts){
    try{
      if (!ts) return "—";
      // Firestore Timestamp
      if (typeof ts.toDate === "function") return ts.toDate().toLocaleString("it-IT");
      if (ts instanceof Date) return ts.toLocaleString("it-IT");
      if (typeof ts === "number") return new Date(ts).toLocaleString("it-IT");
      return "—";
    }catch(_){ return "—"; }
  }

  function ensureUI(){
    S.ui.view = $("viewTrash");
    if (!S.ui.view) return false;

    S.ui.search = $("trashSearch");
    S.ui.kind = $("trashKind");
    S.ui.sort = $("trashSort");
    S.ui.selAll = $("trashSelAll");
    S.ui.tbody = $("trashTbody");
    S.ui.pillCount = $("pillTrashCount");
    S.ui.selInfo = $("trashSelInfo");
    S.ui.btnRestore = $("btnTrashRestore");
    S.ui.btnDelete = $("btnTrashDelete");

    return true;
  }

  function updateSelectionUI(){
    const n = S.selected.size;
    if (S.ui.selInfo) S.ui.selInfo.textContent = "Selezionati: " + n;
    if (S.ui.btnRestore) S.ui.btnRestore.disabled = (n === 0);
    if (S.ui.btnDelete) S.ui.btnDelete.disabled = (n === 0);
  }

  function applyFilters(items){
    let out = items.slice();

    const q = safeStr(S.ui.search && S.ui.search.value).trim().toLowerCase();
    const kind = safeStr(S.ui.kind && S.ui.kind.value).trim();

    if (kind){
      out = out.filter(x => safeStr(x.kind).toLowerCase() === kind);
    }
    if (q){
      out = out.filter(x => {
        const label = safeStr(x.label).toLowerCase();
        const k = safeStr(x.kind).toLowerCase();
        const target = safeStr((x.target && (x.target.code || x.target.id || x.target.col)) || "").toLowerCase();
        return label.includes(q) || k.includes(q) || target.includes(q);
      });
    }

    const sort = safeStr(S.ui.sort && S.ui.sort.value) || "deletedDesc";
    out.sort((a,b) => {
      const ad = a.deletedAt && (typeof a.deletedAt.toMillis==="function" ? a.deletedAt.toMillis() : (a.deletedAt.toDate? a.deletedAt.toDate().getTime():0)) || 0;
      const bd = b.deletedAt && (typeof b.deletedAt.toMillis==="function" ? b.deletedAt.toMillis() : (b.deletedAt.toDate? b.deletedAt.toDate().getTime():0)) || 0;
      const al = safeStr(a.label).toLowerCase();
      const bl = safeStr(b.label).toLowerCase();
      if (sort === "deletedAsc") return ad - bd;
      if (sort === "labelAsc") return al.localeCompare(bl, "it");
      if (sort === "labelDesc") return bl.localeCompare(al, "it");
      return bd - ad; // deletedDesc
    });

    return out;
  }

  function render(){
    if (!ensureUI()) return;

    const filtered = applyFilters(S.items);

    if (S.ui.pillCount) S.ui.pillCount.textContent = String(filtered.length);

    // Keep selection consistent with filtered view
    const filteredIds = new Set(filtered.map(x => x._id));
    for (const id of Array.from(S.selected)){
      if (!filteredIds.has(id)) S.selected.delete(id);
    }
    updateSelectionUI();

    if (!S.ui.tbody) return;

    if (!filtered.length){
      S.ui.tbody.innerHTML = '<tr><td colspan="5" class="muted" style="padding:14px;">Nessun elemento nel cestino.</td></tr>';
      if (S.ui.selAll) S.ui.selAll.checked = false;
      return;
    }

    const rows = filtered.map(item => {
      const checked = S.selected.has(item._id) ? "checked" : "";
      const kind = safeStr(item.kind || "—");
      const label = safeStr(item.label || "—");
      const when = fmtDate(item.deletedAt);
      return `
        <tr data-id="${item._id}">
          <td><input type="checkbox" class="trashSel" data-id="${item._id}" ${checked}></td>
          <td>${kind}</td>
          <td style="white-space:normal; line-height:1.25;">${label}</td>
          <td>${when}</td>
          <td style="text-align:right;">
            <button class="btn btn-ghost btn-sm trashRestoreOne" data-id="${item._id}" type="button">Ripristina</button>
            <button class="btn btn-danger btn-sm trashDeleteOne" data-id="${item._id}" type="button">Elimina</button>
          </td>
        </tr>
      `;
    }).join("");

    S.ui.tbody.innerHTML = rows;

    // selAll status
    if (S.ui.selAll){
      const allOn = filtered.length > 0 && filtered.every(x => S.selected.has(x._id));
      S.ui.selAll.checked = allOn;
    }
  }

  async function restoreItem(item){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) throw new Error("Firebase non pronto");
    const { doc, setDoc, deleteDoc } = H.FS;

    const kind = safeStr(item.kind).toLowerCase();
    const t = item.target || {};
    if (kind === "product"){
      const id = safeStr(t.id);
      if (!id) throw new Error("Target mancante (product)");
      const ref = doc(H.fb.db, "orgs", H.ORG_ID, "products", id);
      const data = item.data || {};
      await setDoc(ref, data, { merge: true });
    } else if (kind === "supplier"){
      const id = safeStr(t.id);
      if (!id) throw new Error("Target mancante (supplier)");
      const ref = doc(H.fb.db, "orgs", H.ORG_ID, "suppliers", id);
      const data = (item.data && (item.data.supplier || item.data)) || {};
      await setDoc(ref, data, { merge: true });
      // NB: eventuali linkedDocs/attachments non vengono ripristinati automaticamente
    } else if (kind === "flow"){
      const movements = (item.data && (item.data.movements || item.data.movement || item.data.rows)) || [];
      if (Array.isArray(movements) && movements.length){
        for (const mv of movements){
          const mid = safeStr(mv && mv.id);
          if (!mid) continue;
          const ref = doc(H.fb.db, "orgs", H.ORG_ID, "movements", mid);
          const payload = Object.assign({}, mv);
          // Firestore doc non deve contenere id duplicato per forza, ma non fa danni
          await setDoc(ref, payload, { merge: true });
        }
      } else {
        throw new Error("Nessuna riga movimento da ripristinare");
      }
    } else {
      throw new Error("Tipo non ripristinabile: " + kind);
    }

    // rimuovi dal cestino
    await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "trash", item._id));
  }

  async function deleteTrashItem(item){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) throw new Error("Firebase non pronto");
    const { doc, deleteDoc } = H.FS;
    await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "trash", item._id));
  }

  function bindEvents(){
    if (S.ready) return;
    if (!ensureUI()) return;

    // Menu click (se esiste)
    const btnMenu = $("menuGoTrash");
    if (btnMenu){
      btnMenu.addEventListener("click", () => {
        try{ hub()?.closeSideMenu && hub().closeSideMenu(); }catch(_){}
        try{ hub()?.setView && hub().setView("trash"); }catch(_){}
        refresh();
      });
    }

    // Close/back
    $("btnCloseTrash")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ hub()?.setView && hub().setView("home"); }catch(_){}
    });
    $("btnBackTrash")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{ hub()?.setView && hub().setView("home"); }catch(_){}
    });

    // Filters
    S.ui.search?.addEventListener("input", () => render());
    S.ui.kind?.addEventListener("change", () => render());
    S.ui.sort?.addEventListener("change", () => render());

    // Select all
    S.ui.selAll?.addEventListener("change", () => {
      const filtered = applyFilters(S.items);
      if (S.ui.selAll.checked){
        filtered.forEach(x => S.selected.add(x._id));
      }else{
        filtered.forEach(x => S.selected.delete(x._id));
      }
      render();
    });

    // Table delegated events
    S.ui.tbody?.addEventListener("click", async (e) => {
      const t = e.target;
      if (!t) return;

      // checkbox
      if (t.classList && t.classList.contains("trashSel")){
        const id = t.getAttribute("data-id");
        if (!id) return;
        if (t.checked) S.selected.add(id);
        else S.selected.delete(id);
        updateSelectionUI();
        // update selAll state
        render();
        return;
      }

      // restore one
      if (t.classList && t.classList.contains("trashRestoreOne")){
        const id = t.getAttribute("data-id");
        const item = S.items.find(x => x._id === id);
        if (!item) return;
        if (!confirm("Ripristinare questo elemento?")) return;
        try{
          await restoreItem(item);
        }catch(err){
          console.warn(err);
          alert("Ripristino non riuscito: " + (err && err.message ? err.message : err));
        }
        return;
      }

      // delete one
      if (t.classList && t.classList.contains("trashDeleteOne")){
        const id = t.getAttribute("data-id");
        const item = S.items.find(x => x._id === id);
        if (!item) return;
        if (!confirm("Eliminare definitivamente questo elemento?")) return;
        try{
          await deleteTrashItem(item);
        }catch(err){
          console.warn(err);
          alert("Eliminazione non riuscita: " + (err && err.message ? err.message : err));
        }
        return;
      }
    });

    // Mass actions
    S.ui.btnRestore?.addEventListener("click", async () => {
      const ids = Array.from(S.selected);
      if (!ids.length) return;
      if (!confirm("Ripristinare gli elementi selezionati?")) return;
      for (const id of ids){
        const item = S.items.find(x => x._id === id);
        if (!item) continue;
        try{
          await restoreItem(item);
          S.selected.delete(id);
        }catch(err){
          console.warn(err);
          alert("Ripristino non riuscito per un elemento: " + (err && err.message ? err.message : err));
        }
      }
      render();
    });

    S.ui.btnDelete?.addEventListener("click", async () => {
      const ids = Array.from(S.selected);
      if (!ids.length) return;
      if (!confirm("Eliminare definitivamente gli elementi selezionati?")) return;
      for (const id of ids){
        const item = S.items.find(x => x._id === id);
        if (!item) continue;
        try{
          await deleteTrashItem(item);
          S.selected.delete(id);
        }catch(err){
          console.warn(err);
          alert("Eliminazione non riuscita per un elemento: " + (err && err.message ? err.message : err));
        }
      }
      render();
    });

    S.ready = true;
  }

  function subscribe(){
    const H = hub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return false;

    if (S.unsub) return true;

    const { collection, query, orderBy, onSnapshot } = H.FS;
    try{
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "trash");
      const q = query(col, orderBy("deletedAt", "desc"));
      S.unsub = onSnapshot(q, (snap) => {
        const items = [];
        snap.forEach(docu => {
          const d = docu.data() || {};
          items.push(Object.assign({_id: docu.id}, d));
        });
        S.items = items;
        render();
      }, (err) => {
        console.warn("Trash snapshot error:", err);
      });
      return true;
    }catch(e){
      console.warn("subscribe failed", e);
      return false;
    }
  }

  function refresh(){
    bindEvents();
    if (!subscribe()){
      // fallback: just render (empty) + message
      render();
    }
  }

  function waitForHub(attempt){
    attempt = attempt || 0;
    const H = hub();
    if (H && H.fb && H.fb.db && H.FS){
      refresh();
      return;
    }
    if (attempt > 200) return; // ~20s max
    setTimeout(() => waitForHub(attempt+1), 100);
  }

  // expose API
  globalThis.HubTrash = globalThis.HubTrash || {};
  globalThis.HubTrash.refresh = refresh;

  // init
  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => waitForHub(0));
  } else {
    waitForHub(0);
  }
})();


;
/* ===== categorie.js ===== */
/* Hub Inventario — Sezione Categorie
   - UI + eventi
   - CRUD via HubInv (main module)
*/
(function(){
  "use strict";

  const $ = (id) => document.getElementById(id);

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }
  function escAttr(s){
    return esc(s).replace(/\n/g, " ");
  }
  function safeColor(v){
    const s = String(v || "").trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
  }

  let hub = null;
  let selectedKey = "";
  let selectedSnapshot = { key: "", name: "", color: "", macro: "" };

  function closeSideMenuSafe(){
    try{
      document.body.classList.remove("menu-open");
      const sideMenu = $("sideMenu");
      const sideMenuOverlay = $("sideMenuOverlay");
      sideMenu && sideMenu.setAttribute("aria-hidden", "true");
      sideMenuOverlay && sideMenuOverlay.setAttribute("aria-hidden", "true");
    }catch(_){}
  }

  function setCreateOpen(open){
    const row = $("catCreateRow");
    if (!row) return;
    row.style.display = open ? "" : "none";
    if (open) {
      try{ $("catNewName")?.focus(); }catch(_){}
    } else {
      try{ $("catNewName").value = ""; }catch(_){}
    }
  }

  function setDetailOpen(open){
    const modal = $("modalCategory");
    if (!modal) return;

    if (open) {
      modal.classList.add("open");
      document.body.classList.add("modal-open");
      try{ setTimeout(() => $("catEditName")?.focus(), 0); }catch(_){}
    } else {
      modal.classList.remove("open");
      // Rimuovi lock scroll solo se nessun altro modale è aperto
      try{
        if (!document.querySelector(".modal.open")) document.body.classList.remove("modal-open");
      }catch(_){ document.body.classList.remove("modal-open"); }

      selectedKey = "";
      selectedSnapshot = { key:"", name:"", color:"", macro:"" };
      try{ $("catProdTbody").innerHTML = '<tr><td class="td-muted" colspan="2">Seleziona una categoria.</td></tr>'; }catch(_){}
    }
  }

  function pickCategory(key){
    selectedKey = String(key || "").trim().toLowerCase();
    setDetailOpen(!!selectedKey);
    renderDetail();
  }

  function isActive(){
    const v = $("viewCategories");
    return !!(v && v.classList.contains("active"));
  }

  function renderList(){
    if (!hub) return;
    const tbody = $("catTbody");
    const pill = $("pillCategoriesCount");
    if (!tbody) return;

    const q = String($("catSearch")?.value || "").trim().toLowerCase();

    const cats = (hub.getCategories && hub.getCategories()) || [];
    const filtered = q
      ? cats.filter(c => String(c.name || c.key || "").toLowerCase().includes(q))
      : cats;

    if (pill) pill.textContent = String(filtered.length || 0);

    if (!filtered.length){
      tbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessuna categoria.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(c => {
      const key = String(c.key || "").trim().toLowerCase();
      const name = String(c.name || key || "").trim() || "—";
      const col = safeColor(c.color || "") || "";
      const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(key) || 0) : 0;

      const dot = `<span class="catDot" style="${col ? ("background:" + escAttr(col) + ";") : ""}"></span>`;
      const isSel = selectedKey && key === selectedKey;

      return `
        <tr data-catkey="${escAttr(key)}" style="${isSel ? "background: rgba(10,132,255,.08);" : ""}" title="Apri dettaglio">
          <td data-label="Colore">
            <div class="inlineRow" style="justify-content:flex-start; gap:10px;">
              ${dot}
              <span class="td-muted">${esc(col || "—")}</span>
            </div>
          </td>
          <td data-label="Categoria"><strong>${esc(name)}</strong></td>
          <td data-label="Articoli" class="qty">${Number(used||0).toLocaleString("it-IT")}</td>
          <td data-label="Azioni" class="td-actions" style="text-align:right;">
            <button class="btn btn-ghost btn-xs jsCatOpen" type="button" data-catkey="${escAttr(key)}">Apri</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function renderDetail(){
    if (!hub) return;
    if (!selectedKey) return;

    const cats = (hub.getCategories && hub.getCategories()) || [];
    const cat = cats.find(x => String(x.key||"").toLowerCase() === selectedKey) || null;

    const nm = String(cat?.name || selectedKey || "").trim();
    const col = safeColor(cat?.color || "") || "#1c6fe6";
    const mgRaw = String(cat?.macro || "").trim().toLowerCase();
    const mg = (mgRaw === "materie_prime") ? "materie_prime" : "imballaggi";

    const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(selectedKey) || 0) : 0;

    const nameInp = $("catEditName");
    const colorInp = $("catEditColor");
    const macroInp = $("catEditMacro");
    const pill = $("catDetailCount");
    const btnSave = $("btnCatSave");
    const btnDel = $("btnCatDelete");
    const hint = $("catDeleteHint");

    if (pill) pill.textContent = `${Number(used||0).toLocaleString("it-IT")} articol${used===1 ? "o" : "i"}`;

    // snapshot base per enable/disable (solo quando apro una nuova categoria)
    const shouldHydrate = (!selectedSnapshot || selectedSnapshot.key !== selectedKey);
    if (shouldHydrate){
      selectedSnapshot = { key: selectedKey, name: nm, color: col, macro: mg };
    }

    // Non sovrascrivere mentre sto editando (focus sul campo)
    const activeEl = document.activeElement;
    if (nameInp && (shouldHydrate || activeEl !== nameInp)) nameInp.value = nm;
    if (colorInp && (shouldHydrate || activeEl !== colorInp)) colorInp.value = col;
    if (macroInp && (shouldHydrate || activeEl !== macroInp)) macroInp.value = mg;

    const canDelete = (Number(used||0) === 0);

    if (btnDel) btnDel.disabled = !canDelete;
    if (hint){
      hint.textContent = canDelete
        ? "Puoi eliminare questa categoria: non ci sono articoli assegnati."
        : "Questa categoria è già assegnata ad articoli: puoi modificarne nome e colore, ma non eliminarla.";
    }

    // products list
    const prodTbody = $("catProdTbody");
    if (prodTbody){
      if (!used){
        prodTbody.innerHTML = '<tr><td class="td-muted" colspan="2">Nessun articolo assegnato.</td></tr>';
      } else {
        const list = (typeof hub.categoryProducts === "function") ? (hub.categoryProducts(selectedKey) || []) : [];
        const show = list.slice(0, 600);
        prodTbody.innerHTML = show.map(p => `
          <tr class="jsCatProdRow" data-code="${escAttr(p.code || "")}" title="Apri prodotto">
            <td data-label="Codice"><span class="kbd">${esc(p.code || "—")}</span></td>
            <td data-label="Nome">${esc(p.name || "—")}</td>
          </tr>
        `).join("") + (list.length > show.length ? `<tr><td colspan="2" class="td-muted">+${list.length - show.length} altri…</td></tr>` : "");
      }
    }

    // Save enable
    const syncSave = () => {
      if (!btnSave || !nameInp || !colorInp) return;
      const curName = String(nameInp.value || "").trim();
      const curCol = safeColor(colorInp.value || "") || "";
      const curMacro = macroInp ? String(macroInp.value || "").trim().toLowerCase() : "";
      const snapMacro = String(selectedSnapshot.macro || "").trim().toLowerCase();

      btnSave.disabled =
        (curName === String(selectedSnapshot.name||"")) &&
        (curCol === safeColor(selectedSnapshot.color||"")) &&
        (!macroInp || curMacro === snapMacro);
    };
    syncSave();
  }

  function render(){
    if (!hub) return;
    if (!isActive()) return;
    renderList();
    if (selectedKey) renderDetail();
  }

  function bindEvents(){
    // menu open
    $("menuGoCategories")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      closeSideMenuSafe();
      try{ hub.setView("categories"); }catch(_){}
      setCreateOpen(false);
      render();
    });

    // back/close
    $("btnBackCategories")?.addEventListener("click", () => { setDetailOpen(false); try{ hub.setView("home"); }catch(_){ } });
    $("btnCloseCategories")?.addEventListener("click", () => { setDetailOpen(false); try{ hub.setView("home"); }catch(_){ } });

    // search
    $("catSearch")?.addEventListener("input", () => render());

    // new category toggle
    $("btnCatNew")?.addEventListener("click", () => {
      const row = $("catCreateRow");
      const open = !!(row && row.style.display === "none");
      setCreateOpen(open);
    });
    $("btnCatCancelCreate")?.addEventListener("click", () => setCreateOpen(false));

    // create
    $("btnCatCreate")?.addEventListener("click", async () => {
      const name = String($("catNewName")?.value || "").trim();
      const color = String($("catNewColor")?.value || "").trim();
      const macro = String($("catNewMacro")?.value || "").trim();
      if (!name) { try{ hub.showToast("Inserisci un nome categoria", "warn"); }catch(_){ } return; }

      try{
        const created = await hub.createCategory(name, color, macro);
        setCreateOpen(false);
        if (created && created.key) {
          pickCategory(created.key);
        }
        render();
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore creazione categoria", "err"); }catch(_){ }
      }
    });

    // table click (open row)
    $("catTbody")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button.jsCatOpen");
      const tr = e.target?.closest?.("tr[data-catkey]");
      const key = (btn?.getAttribute("data-catkey") || tr?.getAttribute("data-catkey") || "").trim();
      if (!key) return;
      if (btn) { e.preventDefault(); e.stopPropagation(); }
      pickCategory(key);
      render();
    });

    // detail close

    // modal close (categoria)
    $("btnCatDone")?.addEventListener("click", () => { setDetailOpen(false); renderList(); });
    $("catModalClose")?.addEventListener("click", () => { setDetailOpen(false); renderList(); });
    $("modalCategory")?.addEventListener("click", (e) => {
      if (e.target === $("modalCategory")) { setDetailOpen(false); renderList(); }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("modalCategory")?.classList.contains("open")) {
        setDetailOpen(false); renderList();
      }
    });
// detail inputs
    $("catEditName")?.addEventListener("input", () => renderDetail());
    $("catEditColor")?.addEventListener("input", () => renderDetail());
    $("catEditMacro")?.addEventListener("change", () => renderDetail());

    // save
    $("btnCatSave")?.addEventListener("click", async () => {
      if (!selectedKey) return;
      const name = String($("catEditName")?.value || "").trim();
      const color = String($("catEditColor")?.value || "").trim();
      if (!name) { try{ hub.showToast("Nome categoria non valido", "warn"); }catch(_){ } return; }

      try{
        const macro = String($("catEditMacro")?.value || "").trim();
        await hub.updateCategory(selectedKey, { name, color, macro });
        selectedSnapshot = { key: selectedKey, name, color, macro: String(macro||"").trim().toLowerCase() };
        render();
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore salvataggio categoria", "err"); }catch(_){ }
      }
    });

    // delete
    $("btnCatDelete")?.addEventListener("click", async () => {
      if (!selectedKey) return;
      const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(selectedKey) || 0) : 0;
      if (used > 0) { try{ hub.showToast("Categoria usata: non eliminabile", "warn"); }catch(_){ } return; }

      const ok = confirm("Eliminare questa categoria? Operazione irreversibile.");
      if (!ok) return;

      try{
        const done = await hub.deleteCategory(selectedKey);
        if (done) {
          setDetailOpen(false);
          render();
        }
      }catch(e){
        console.error(e);
        try{ hub.showToast("Errore eliminazione categoria", "err"); }catch(_){ }
      }
    });

    // products click
    $("catProdTbody")?.addEventListener("click", (e) => {
      const tr = e.target?.closest?.("tr.jsCatProdRow");
      if (!tr) return;
      const code = String(tr.getAttribute("data-code") || "").trim();
      if (!code) return;
      e.preventDefault(); e.stopPropagation();
      try{
        hub.openProductModal(code, { __mode: "master", code: code });
      }catch(_){}
    });
  }

  function onHubReady(h){
    hub = h || window.HubInv;
    if (!hub) return;
    bindEvents();

    // expose render so main renderAll can call it
    window.HubCategories = {
      render
    };

    // if view already active (rare), render now
    try{ render(); }catch(_){}
  }

  // Wait HubInv
  if (window.HubInv) onHubReady(window.HubInv);
  window.addEventListener("HubInvReady", (e) => onHubReady(e?.detail));
})();


;
/* ===== prodotti.js ===== */
/* ============================================================
   HUB INVENTARIO — Sezione PROD0TTI (estratta dall'HTML)
   File: /public1/prodotti.js

   Scopo: alleggerire hub_inventario.html spostando la logica
   di rendering della tab "Prodotti" (Anagrafica) in un file esterno.

   Richiede: viene chiamato dal main module tramite:
   window.HubProducts.renderAnagProducts({ products, fbUser, ... });

   NOTE:
   - Non gestisce navigazione / click: quelli restano nel main.
   - Aggiorna e restituisce una Map dei gruppi (alias/codice) per
     compatibilità con openProductAliasGroup e click-row.
   ============================================================ */
(function () {
  "use strict";

  function _safeDecodeUri(s) {
    try { return decodeURIComponent(String(s ?? "")); } catch (_) { return String(s ?? ""); }
  }

  function _escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c];
    });
  }
  function _escapeHtmlAttr(s) { return _escapeHtml(s).replace(/\n/g, " "); }

  window.HubProducts = window.HubProducts || {};

  /**
   * Render "Anagrafica -> Prodotti" dentro la tabella già esistente (#anagTable)
   * e restituisce una Map(gruppoKey -> gruppoObj)
   */
  window.HubProducts.renderAnagProducts = function (ctx) {
    ctx = (ctx && typeof ctx === "object") ? ctx : {};

    var products = Array.isArray(ctx.products) ? ctx.products : [];
    var fbUser = ctx.fbUser || null;

    var anagTbody = ctx.anagTbody || null;
    var anagTheadRow = ctx.anagTheadRow || null;
    var anagTable = ctx.anagTable || null;
    var searchAnag = ctx.searchAnag || null;

    var escapeHtml = (typeof ctx.escapeHtml === "function") ? ctx.escapeHtml : _escapeHtml;
    var escapeHtmlAttr = (typeof ctx.escapeHtmlAttr === "function") ? ctx.escapeHtmlAttr : _escapeHtmlAttr;
    var normTextKey = (typeof ctx.normTextKey === "function")
      ? ctx.normTextKey
      : function (v) { return String(v || "").toLowerCase().trim(); };
    var safeDecodeUri = (typeof ctx.safeDecodeUri === "function") ? ctx.safeDecodeUri : _safeDecodeUri;

    // UI: stile tabella + placeholder
    try { if (anagTable) anagTable.classList.add("anagTableProducts"); } catch (_) {}
    try { if (searchAnag) searchAnag.placeholder = "Nome, codice, alias…"; } catch (_) {}

    // Header
    try {
      if (anagTheadRow) anagTheadRow.innerHTML =
        "<th>Alias / Nome</th>" +
        "<th>Codici</th>" +
        "<th class=\"qty\">N.</th>" +
        "<th>Azioni</th>";
    } catch (_) {}

    // Auth guard
    if (!fbUser) {
      try {
        if (anagTbody) anagTbody.innerHTML =
          "<tr><td class=\"td-muted\" colspan=\"4\">Accedi con Google per sincronizzare i prodotti.</td></tr>";
      } catch (_) {}
      var empty = new Map();
      window.HubProducts.groupsMap = empty;
      return empty;
    }

    // Search
    var qRaw = "";
    try { qRaw = String((searchAnag && searchAnag.value) || "").trim(); } catch (_) { qRaw = ""; }
    var q = normTextKey(qRaw);

    var unifiedFilter = String(ctx.unifiedFilter || "all").toLowerCase();
    if (["all","unified","single"].indexOf(unifiedFilter) === -1) unifiedFilter = "all";

    var sortMode = String(ctx.sortMode || "name_asc").toLowerCase();
    if (["name_asc","codes_desc","codes_asc"].indexOf(sortMode) === -1) sortMode = "name_asc";


    // Raggruppa per alias (se presente), altrimenti per codice
    var map = new Map();

    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (!p) continue;

      var code = String(p.code || safeDecodeUri(p.id) || "").trim();
      if (!code) continue;

      var alias = String(p.alias || p.aliasName || "").trim();
      var aliasKey = alias ? ("alias:" + normTextKey(alias)) : "";
      var key = aliasKey || ("code:" + code.toLowerCase());

      var label = (alias || String(p.name || code)).trim();
      var cur = map.get(key) || { key: key, label: label, alias: alias, items: [] };

      // preferisci label stabile se alias presente
      if (alias && !cur.alias) { cur.alias = alias; cur.label = alias; }
      if (alias && cur.alias && normTextKey(cur.alias) === normTextKey(alias)) {
        // mantieni il primo alias come label
      } else if (!cur.label) {
        cur.label = label;
      }

      cur.items.push({ code: code, name: String(p.name || code).trim(), alias: alias });
      map.set(key, cur);
    }

    var groups = Array.from(map.values()).map(function (g) {
      var codes = (g.items || []).map(function (x) { return x && x.code; }).filter(Boolean);
      var uniq = Array.from(new Set(codes));
      g.codes = uniq;
      g.count = uniq.length;
      return g;
    });

    // filtro ricerca (ignora spazi/maiuscole)
    var filtered = q ? groups.filter(function (g) {
      var hay = [g.label || "", g.alias || ""]
        .concat(g.codes || [])
        .concat((g.items || []).map(function (x) { return x && x.name; }))
        .join(" ");
      return normTextKey(hay).indexOf(q) !== -1;
    }) : groups;


    // filtro stato (unificati / singoli)
    if (unifiedFilter === "unified") {
      filtered = filtered.filter(function (g) { return (g.codes || []).length > 1; });
    } else if (unifiedFilter === "single") {
      filtered = filtered.filter(function (g) { return (g.codes || []).length <= 1; });
    }

    // ordinamento
    filtered = filtered.slice().sort(function (a, b) {
      var ac = (a.codes || []).length;
      var bc = (b.codes || []).length;
      if (sortMode === "codes_desc") {
        if (bc !== ac) return bc - ac;
      } else if (sortMode === "codes_asc") {
        if (ac !== bc) return ac - bc;
      }
      return String(a.label || "").localeCompare(String(b.label || ""), "it", { sensitivity: "base" });
    });

    var groupsMap = new Map(filtered.map(function (g) { return [g.key, g]; }));
    window.HubProducts.groupsMap = groupsMap;

    if (!anagTbody) return groupsMap;

    if (!filtered.length) {
      anagTbody.innerHTML = "<tr><td class=\"td-muted\" colspan=\"4\">Nessun prodotto.</td></tr>";
      return groupsMap;
    }

    anagTbody.innerHTML = filtered.slice(0, 600).map(function (g) {
      var codes = g.codes || [];
      var preview = codes.slice(0, 2).join(", ");
      var more = Math.max(0, codes.length - 2);
      var codesTxt = preview + (more ? (" +" + more) : "");
      var badge = (codes.length > 1)
        ? "<span class=\"pill pill-unified\" aria-label=\"Unificati\" title=\"Unificati\"></span>"
        : "";

      return (
        "<tr data-pg=\"" + escapeHtmlAttr(g.key) + "\" title=\"Apri dettagli\">" +
          "<td data-label=\"Alias / Nome\"><strong>" + escapeHtml(g.label || "—") + "</strong>" + badge + "</td>" +
          "<td data-label=\"Codici\"><span class=\"kbd\">" + escapeHtml(codesTxt || "—") + "</span></td>" +
          "<td data-label=\"N.\" class=\"qty\">" + Number(codes.length || 0).toLocaleString("it-IT") + "</td>" +
          "<td data-label=\"Azioni\" class=\"td-actions\">" +
            "<button class=\"btn btn-ghost btn-xs\" type=\"button\" data-action=\"openProdGroup\" data-id=\"" + escapeHtmlAttr(g.key) + "\">Apri</button>" +
          "</td>" +
        "</tr>"
      );
    }).join("");

    return groupsMap;
  };

})();


;
/* ===== ocr.js ===== */
/* Auto-generated: OCR view injected into hub_inventario.html */
(function(){
  try{
    var host = document.getElementById('viewOcr');
    if (!host) return;
    if (host.dataset && host.dataset.injected === '1') return;
    if (host.dataset) host.dataset.injected = '1';
    // Ensure base classes
    if (!host.className) host.className = 'view modalOverlay';

    host.innerHTML = `
<article class="card" id="captureCard">
            <div class="hd">
              <div class="overlayHeaderTitle">
                <button class="iconBtn overlayBack" id="btnBackOcr" type="button" aria-label="Indietro">‹</button>
                <h2>Carica OCR</h2>
              </div>
              <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
                <div class="pill">OCR</div>
                <button class="iconBtn" id="btnCloseOcr" type="button" aria-label="Chiudi">×</button>
              </div>
            </div>
            <div class="bd">
              <div class="stack">
                <div class="inlineRow" style="justify-content: space-between;">
                  <div class="hero-sub">Scatta un documento, etichetta, DDT o foglio inventario. Il testo viene letto e poi convertito in movimento.</div>
                  <div class="seg" aria-label="Tipo movimento" style="display:none">
                    <button type="button" id="segIn" class="active">Carico</button>
                    <button type="button" id="segOut">Scarico</button>
                  </div>
                </div>

                <div class="inlineRow ocrPickRow">
                  <button class="btn btn-primary" id="btnOpenGallery" type="button">Carica documento</button>
                </div>

                <input type="file" id="cameraInput" accept="image/*" capture="environment" multiple aria-label="Seleziona fotocamera" style="display:none" />
                <input type="file" id="galleryInput" accept="image/*" multiple aria-label="Seleziona da galleria" style="display:none" />

                <div class="previewArea">
                  <div class="imagePreview" id="imagePreview">
                    <img id="previewImg" alt="Anteprima immagine" />
                    <div class="placeholder" id="previewPlaceholder">Nessuna immagine selezionata</div>
                  </div>


                  <div class="pagesMeta" id="pagesMeta" style="display:none">
                    <div class="pagesLeft">Pagine acquisite: <span id="pagesCount">0</span></div>
                    <button type="button" class="btn btn-secondary mini" id="btnRemoveLastPage" style="display:none">Rimuovi ultima</button>
                  </div>
                  <div class="pagesThumbs" id="pagesThumbs" style="display:none"></div>
                  <div class="progressShell">
                    <div class="progressTop">
                      <div class="progressLabel" id="progressLabel">In attesa di acquisizione</div>
                      <div class="winSpinner" id="progressSpinner" aria-hidden="true" style="display:none"></div>
                    </div>
                    <div class="progressBar" aria-hidden="true"><div class="progressFill" id="progressFill"></div></div>
                  </div>

                  <div class="stack">
                    <label class="hero-sub" for="ocrResult">Testo OCR (grezzo)</label>
                    <textarea id="ocrResult" placeholder="Testo estratto" readonly></textarea>
                  </div>

                  <div id="docExtractPanel" class="stack" style="display:none">
                    <div class="hero-sub">Dati documento (estratti)</div>

                    <div class="doc-kvgrid">
                      <div class="doc-kv"><div class="k">Tipo</div><div class="v" id="docType">-</div></div>
                      <div class="doc-kv"><div class="k">Numero</div><div class="v" id="docNumber">-</div></div>
                      <div class="doc-kv"><div class="k">Data</div><div class="v" id="docDate">-</div></div>
                      <div class="doc-kv"><div class="k">Colli</div><div class="v" id="docPackages">-</div></div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Fornitore</div>
                      <div class="v" id="docSupplier">-</div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Fiscali</div>
                      <div class="v" id="docFiscal">-</div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Indirizzo</div>
                      <div class="v" id="docSupplierAddr">-</div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Rif. ordine</div>
                      <div class="v" id="docOrders">-</div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Vettore</div>
                      <div class="v" id="docCarrier">-</div>
                    </div>

                    <div class="doc-kvline">
                      <div class="k">Note</div>
                      <div class="v" id="docNotes">-</div>
                    </div>

                    <div class="doc-tableWrap">
                      <div class="doc-tableTitle">N. Articoli</div>
                      <div class="doc-tableHint">Righe già posizionate: pronte per import (campi non modificabili).</div>
                      <table class="doc-table dataGrid" id="docItemsTable">
                        <thead>
                          <tr>
                            <th style="width:140px">Codice</th>
                            <th>Descrizione</th>
                            <th style="width:80px" class="num">U.M.</th>
                            <th style="width:120px" class="num">Q.tà</th>
                          </tr>
                        </thead>
                        <tbody></tbody>
                      </table>
                    </div>
                  </div>

<div id="movementFooter" class="movementFooter">
<div class="stack mvMeta">
                    <div class="hero-sub">Dati movimento (puoi correggerli prima di confermare)</div>
                    <div class="fieldGrid">
                      <div class="field">
                        <label for="fCustomer">Fornitore</label>
                        <input id="fCustomer" autocomplete="off" placeholder="Fornitore (da documento)" readonly />
                      </div>
                      <div class="field">
                        <label for="fDate">Data</label>
                        <input id="fDate" type="date" disabled />
                      </div>
                      <div class="field" style="display:none">
                        <label for="fCode">Codice articolo</label>
                        <input id="fCode" autocomplete="off" placeholder="Es: GC-123 / SKU / ART..." />
                      </div>
                      <div class="field" style="display:none">
                        <label for="fQty">Pezzi</label>
                        <input id="fQty" type="number" min="0" step="1" placeholder="0" />
                      </div>
                      <div class="field" style="grid-column: 1 / -1; display:none;">
                        <label for="fItem">Articolo</label>
                        <input id="fItem" autocomplete="off" placeholder="Nome articolo / descrizione" />
                      </div>
                      <div class="field" style="grid-column: 1 / -1; display:none;">
                        <label for="fNote">Note</label>
                        <input id="fNote" autocomplete="off" placeholder="DDT, lotto, ubicazione, bancale, ecc." />
                      </div>
                    </div>
                  </div>

                  <div class="movementActions">
                    <button class="btn btn-primary btnConfirmBig" id="btnConfirmMovement" type="button" disabled>Conferma carico</button>
                    <button class="btn btn-ghost btnResetMini" id="btnReset" type="button">Reset</button>
                  </div>

                  <div class="hero-sub" id="hintPrivate" style="display:none;">
                    OCR privato: se vedi 403/Forbidden dal browser, serve un proxy server oppure rendere il servizio pubblico.
                  </div>
</div>
                </div>
              </div>
            </div>
          </article>
          
`;
  }catch(e){
    try{ console.warn('OCR inject failed', e); }catch(_){}
  }
})();

/* ===== mainModule.js (core) ===== */
// 🔧 INCOLLA QUI la config del tuo progetto Firebase (Console > Project settings)
    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyBiyB4pilnPpVj8vImD4PI6LF2_RtyDnv4",
      authDomain: "tabellone-produzione-liv-e313e.firebaseapp.com",
      projectId: "tabellone-produzione-liv-e313e",
      storageBucket: "tabellone-produzione-liv-e313e.firebasestorage.app",
      messagingSenderId: "537555699968",
      appId: "1:537555699968:web:4d04cb9596b67bfb0e4be5"
    };

    // Un unico "contenitore" dati (così domani puoi aggiungere altre aziende)
    const ORG_ID = "generalcopper";

    /****************************************************************
     * CONFIG (salvate in localStorage via impostazioni)
     ****************************************************************/
    const DEFAULT_SETTINGS = Object.freeze({
      ocrUrl: "https://ocrproxy-537555699968.europe-west1.run.app",
      ocrKey: "",              // header X-OCR-KEY se attivo sul server
      lowThreshold: 1000,
      maxRecent: 30
    });

    const STORE_KEY_SETTINGS = "hubInventario.settings.v1";
    const STORE_KEY_LOCALDATA = "hubInventario.localdata.v1";
    const STORE_KEY_LEGACY = "hubInventario.v1";

    /****************************************************************
     * UI refs
     ****************************************************************/
    const previewImg = document.getElementById("previewImg");
    const previewPlaceholder = document.getElementById("previewPlaceholder");
    const progressLabel = document.getElementById("progressLabel");
    const progressFill = document.getElementById("progressFill");
    const progressSpinner = document.getElementById("progressSpinner");
    const ocrResult = document.getElementById("ocrResult");

    const btnConfirmMovement = document.getElementById("btnConfirmMovement");
    const btnReset = document.getElementById("btnReset");
    const toastEl = document.getElementById("toast");
    const centerPopEl = document.getElementById("centerPop");

    // Auth / Sync pills
    const btnLogout = document.getElementById("btnLogout");
    const pillUser = document.getElementById("pillUser");
    const pillUserText = document.getElementById("pillUserText");
    const pillSync = document.getElementById("pillSync");
    const pillSyncText = document.getElementById("pillSyncText");
    const btnMenuToggle = document.getElementById("btnMenuToggle");
    const btnMenuClose = document.getElementById("btnMenuClose");
    const sideMenu = document.getElementById("sideMenu");
    const sideMenuOverlay = document.getElementById("sideMenuOverlay");

    // Anagrafica
    const segSuppliers = document.getElementById("segSuppliers");
    const segProducts = document.getElementById("segProducts");
    const btnReloadAnag = document.getElementById("btnReloadAnag");
    const searchAnag = document.getElementById("searchAnag");
    const anagProductsFilters = document.getElementById("anagProductsFilters");
    const anagProdCategoryFilter = document.getElementById("anagProdCategoryFilter");
    const anagProdUnifiedFilter = document.getElementById("anagProdUnifiedFilter");
    const anagProdSort = document.getElementById("anagProdSort");
    const anagTable = document.getElementById("anagTable");
    const anagTbody = document.getElementById("anagTbody");
    const anagTheadRow = document.getElementById("anagTheadRow");

    // Supplier modal
    const modalSupplier = document.getElementById("modalSupplier");
    const supTitle = document.getElementById("supTitle");
    const supSub = document.getElementById("supSub");
    const supFields = document.getElementById("supFields");
    const supDocsTbody = document.getElementById("supDocsTbody");
    const supClose = document.getElementById("supClose");
    const btnSupDone = document.getElementById("btnSupDone");
    const btnSupDelete = document.getElementById("btnSupDelete");
    const btnSupEdit = document.getElementById("btnSupEdit");
    const btnSupSave = document.getElementById("btnSupSave");
    const btnSupCancelEdit = document.getElementById("btnSupCancelEdit");
// Product modal
    const modalProduct = document.getElementById("modalProduct");
    const prodTitle = document.getElementById("prodTitle");
    const prodFields = document.getElementById("prodFields");
    const prodClose = document.getElementById("prodClose");
    const btnProdDone = document.getElementById("btnProdDone");
    const modalUnified = document.getElementById("modalUnified");
    const unifiedTitle = document.getElementById("unifiedTitle");
    const unifiedSubtitle = document.getElementById("unifiedSubtitle");
    const unifiedButtons = document.getElementById("unifiedButtons");
    const unifiedClose = document.getElementById("unifiedClose");
    const btnUnifiedDone = document.getElementById("btnUnifiedDone");

    // DDT detail modal
    const modalDocDetail = document.getElementById("modalDocDetail");
    const docDetailTitle = document.getElementById("docDetailTitle");
    const docDetailSubtitle = document.getElementById("docDetailSubtitle");
    const docDetailTbody = document.getElementById("docDetailTbody");
    const docDetailTotals = document.getElementById("docDetailTotals");

const docDetailPhotosWrap = document.getElementById("docDetailPhotosWrap");
const docDetailPhotosGrid = document.getElementById("docDetailPhotosGrid");
const docDetailPhotosMeta = document.getElementById("docDetailPhotosMeta");
    const btnCloseDocDetail = document.getElementById("btnCloseDocDetail");

    // Flow edit modal
    const modalFlowEdit = document.getElementById("modalFlowEdit");
    const flowEditTitle = document.getElementById("flowEditTitle");
    const flowEditSub = document.getElementById("flowEditSub");
    const flowEditCustomer = document.getElementById("flowEditCustomer");
    const flowEditDate = document.getElementById("flowEditDate");
    const flowEditNote = document.getElementById("flowEditNote");
    const btnCloseFlowEdit = document.getElementById("btnCloseFlowEdit");
    const btnCancelFlowEdit = document.getElementById("btnCancelFlowEdit");
    const btnSaveFlowEdit = document.getElementById("btnSaveFlowEdit");
    const btnDeleteFlowFromEdit = document.getElementById("btnDeleteFlowFromEdit");
    const flowEditItemsMeta = document.getElementById("flowEditItemsMeta");
    const flowEditItemsTbody = document.getElementById("flowEditItemsTbody");






    const modalQuick = document.getElementById("modalQuick");
    const modalTitle = document.getElementById("modalTitle");
    const modalBody = document.getElementById("modalBody");

    const modalSettings = document.getElementById("modalSettings");
    const sOcrUrl = document.getElementById("sOcrUrl");
    const sOcrKey = document.getElementById("sOcrKey");
    const sLowThreshold = document.getElementById("sLowThreshold");
    const sMaxRecent = document.getElementById("sMaxRecent");
    const ocrTestResult = document.getElementById("ocrTestResult");

    const cameraInput = document.getElementById("cameraInput");
    const galleryInput = document.getElementById("galleryInput");
    const pagesMeta = document.getElementById("pagesMeta");
    const pagesCount = document.getElementById("pagesCount");
    const pagesThumbs = document.getElementById("pagesThumbs");
    const btnRemoveLastPage = document.getElementById("btnRemoveLastPage");

    const segIn = document.getElementById("segIn");
    const segOut = document.getElementById("segOut");

    const fCustomer = document.getElementById("fCustomer");
    const fDate = document.getElementById("fDate");
    const fCode = document.getElementById("fCode");
    const fQty = document.getElementById("fQty");
    const fItem = document.getElementById("fItem");
    const fNote = document.getElementById("fNote");

    // Click su una riga documento => precompila i campi movimento
    const docItemsTable = document.getElementById("docItemsTable");

    // ===== NAV (Home / OCR / Anagrafica / Inventario) =====
    const __views = {
      home: document.getElementById("viewHome"),
      ocr: document.getElementById("viewOcr"),
      inventory: document.getElementById("viewInventory"),
      flows: document.getElementById("viewFlows"),
      movements: document.getElementById("viewMovements"),
      categories: document.getElementById("viewCategories"),
      trash: document.getElementById("viewTrash"),
      anag: document.getElementById("viewAnag")
    };
    const __hdrTitle = document.getElementById("hdrPageTitle");
    const __btnBack = document.getElementById("btnNavBack");
    const btnBackOcr = document.getElementById("btnBackOcr");
    const btnBackFlows = document.getElementById("btnBackFlows");
    const btnBackMovements = document.getElementById("btnBackMovements");
    const btnBackAnag = document.getElementById("btnBackAnag");

    // Porta overlay/modali come figli diretti di <body> per evitare stacking-context (transform/filter) sui parent
    (function __liftOverlaysToBody(){
      try{
        ["viewOcr","viewInventory","viewFlows","viewMovements","viewCategories","viewTrash","viewAnag"].forEach(id => {
          const el = document.getElementById(id);
          if (el && el.parentElement !== document.body) document.body.appendChild(el);
        });
        document.querySelectorAll(".modal").forEach(m => {
          if (m && m.parentElement !== document.body) document.body.appendChild(m);
        });
      }catch(_){}
    })();


    function syncHeaderBackVisibility(){
      if (!__btnBack) return;
      const hasModal = !!document.querySelector(".modal.open");
      const hasOverlay = !!document.querySelector(".view.modalOverlay.active");
      __btnBack.style.display = (hasModal || hasOverlay) ? "inline-flex" : "none";
    }

    function setView(name){
      const key = String(name || "home");
      const overlayKeys = ["ocr","inventory","flows","movements","categories","trash","anag"];
      const isOverlay = overlayKeys.includes(key);

      // Home resta sempre visibile dietro (come un gestionale iOS)
      if (__views.home) __views.home.classList.add("active");

      // Chiudi tutte le overlay
      for (const k of overlayKeys) {
        const el = __views[k];
        if (!el) continue;
        el.classList.toggle("active", isOverlay && k === key);
      }

      // Se richiesto "home", chiudi overlay e stop
      if (!isOverlay) {
        for (const k of overlayKeys) {
          const el = __views[k];
          if (el) el.classList.remove("active");
        }
      }


      // OCR: conferma/reset solo dopo acquisizione documento
      try{
        const vOcr = (__views && __views.ocr) ? __views.ocr : document.getElementById("viewOcr");
        if (vOcr){
          if (key === "ocr"){
            const has = (capture && capture.files && capture.files.length) ? true : false;
            vOcr.classList.toggle("hasScan", has);
          } else {
            vOcr.classList.remove("hasScan");
          }
        }
      }catch(_){}


      if (__hdrTitle) {
        __hdrTitle.textContent =
          (key === "home") ? "Home" :
          (key === "ocr") ? "Carica" :
          (key === "inventory") ? "Inventario" :
          (key === "flows") ? "DDT Caricati" :
          (key === "movements") ? "Movimenti" :
          (key === "categories") ? "Categorie" :
          (key === "trash") ? "Cestino" :
          "Anagrafica";
      }
      syncHeaderBackVisibility();
      try { window.scrollTo(0, 0); } catch(_){}
    }

    function __isMobileDevice(){
      try {
        return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "") || (window.matchMedia && window.matchMedia("(pointer:coarse)").matches);
      } catch(_){
        return false;
      }
    }

    function startHomeOcr(){
      setView("ocr");
      // forza carico
      capture.movementType = "IN";
      try{ segIn.classList.add("active"); segOut.classList.remove("active"); }catch(_){}
      // NON aprire automaticamente fotocamera/upload: l'operatore deve cliccare "Carica documento"
      try{
        const v = document.getElementById("viewOcr");
        if (v){
          const has = (capture.files && capture.files.length) ? true : false;
          v.classList.toggle("hasScan", has);
        }
      }catch(_){}
    }

    function openSideMenu(){
      document.body.classList.add("menu-open");
      sideMenu?.setAttribute("aria-hidden", "false");
      sideMenuOverlay?.setAttribute("aria-hidden", "false");
    }

    function closeSideMenu(){
      document.body.classList.remove("menu-open");
      sideMenu?.setAttribute("aria-hidden", "true");
      sideMenuOverlay?.setAttribute("aria-hidden", "true");
    }

    btnMenuToggle?.addEventListener("click", () => {
      if (document.body.classList.contains("menu-open")) closeSideMenu();
      else openSideMenu();
    });
    btnMenuClose?.addEventListener("click", closeSideMenu);
    sideMenuOverlay?.addEventListener("click", closeSideMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSideMenu();
    });

    const homeInvSelect = document.getElementById("homeInvSelect");
    const menuInvSummary = document.getElementById("menuInvSummary");

    document.getElementById("btnGoOcr")?.addEventListener("click", startHomeOcr);
    document.getElementById("btnGoFlows")?.addEventListener("click", () => { setView("flows"); try{ renderFlowsTable(); }catch(_){ } });
    document.getElementById("btnGoMovements")?.addEventListener("click", () => {
      setView("movements");
      try{ window.HubMovements && window.HubMovements.refresh && window.HubMovements.refresh(); }catch(_){ }
    });
    document.getElementById("btnGoCategories")?.addEventListener("click", () => {
      setView("categories");
      try{ window.HubCategories && window.HubCategories.render && window.HubCategories.render(); }catch(_){ }
    });
    document.getElementById("btnCloseInv")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    // Close inventario anche con tap/click sul backdrop
    document.getElementById("viewInventory")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) setView("home"); }catch(_){ } });
    document.getElementById("viewMovements")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) setView("home"); }catch(_){ } });
    document.getElementById("btnCloseOcr")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackOcr?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnGoAnag")?.addEventListener("click", () => {
      activeAnagTab = "suppliers";
      syncAnagHeaderTitle();
      try{ segSuppliers && segSuppliers.classList.add("active"); segProducts && segProducts.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
    document.getElementById("btnGoProdAnag")?.addEventListener("click", () => {
      activeAnagTab = "products";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.add("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
    document.getElementById("btnGoInvCerea")?.addEventListener("click", () => { openInventoryOverlay(WAREHOUSE_CEREA); });
    document.getElementById("btnGoInvConcamarise")?.addEventListener("click", () => { openInventoryOverlay(WAREHOUSE_CONCA); });


    // 🔌 Bridge globale per script esterni (Cestino, ecc.)
    try{
      globalThis.__HUB = globalThis.__HUB || {};
      globalThis.__HUB.fb = fb;
      globalThis.__HUB.ORG_ID = ORG_ID;
      globalThis.__HUB.setView = setView;
      globalThis.__HUB.closeSideMenu = closeSideMenu;
      globalThis.__HUB.orgCol = orgCol;
      globalThis.__HUB.FS = {
        collection, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
        onSnapshot, query, orderBy, serverTimestamp, deleteField
      };
    }catch(_){}

document.getElementById("menuGoHome")?.addEventListener("click", () => { closeSideMenu(); setView("home"); });
    document.getElementById("menuGoOcr")?.addEventListener("click", () => { closeSideMenu(); startHomeOcr(); });
    document.getElementById("menuGoInvCerea")?.addEventListener("click", () => { closeSideMenu(); openInventoryOverlay(WAREHOUSE_CEREA); });
    document.getElementById("menuGoInvConcamarise")?.addEventListener("click", () => { closeSideMenu(); openInventoryOverlay(WAREHOUSE_CONCA); });
    document.getElementById("menuGoFlows")?.addEventListener("click", () => { closeSideMenu(); setView("flows"); try{ renderFlowsTable(); }catch(_){ } });
    document.getElementById("menuGoMovements")?.addEventListener("click", () => { closeSideMenu(); setView("movements"); try{ window.HubMovements && window.HubMovements.refresh && window.HubMovements.refresh(); }catch(_){ } });
    document.getElementById("menuGoTrash")?.addEventListener("click", () => { closeSideMenu(); setView("trash"); try{ window.HubTrash && window.HubTrash.refresh && window.HubTrash.refresh(); }catch(_){ } });
    document.getElementById("menuGoSuppliers")?.addEventListener("click", () => {
      closeSideMenu();
      activeAnagTab = "suppliers";
      activeProductsMacroGroup = "";
      syncAnagHeaderTitle();
      try{ segSuppliers && segSuppliers.classList.add("active"); segProducts && segProducts.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
        document.getElementById("menuGoProductsRaw")?.addEventListener("click", () => {
      closeSideMenu();
      activeAnagTab = "products";
      activeProductsMacroGroup = "materie_prime";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.add("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
    document.getElementById("menuGoProductsPack")?.addEventListener("click", () => {
      closeSideMenu();
      activeAnagTab = "products";
      activeProductsMacroGroup = "imballaggi";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.add("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
        document.getElementById("btnCloseTrash")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
document.getElementById("btnCloseFlows")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnCloseMovements")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
        document.getElementById("btnBackTrash")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
btnBackAnag?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackFlows?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackMovements?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnFlowsExport")?.addEventListener("click", () => { try{ exportMovementsCSV(); }catch(_){ } });
    function closeHeaderModalIfOpen(){
      const modalOrder = [
        { el: modalFlowEdit, close: closeFlowEdit },
        { el: modalDocDetail, close: closeDocDetail },
        { el: modalMovement, close: closeMovementModal },
        { el: modalUnified, close: () => { modalUnified?.classList.remove("open"); __syncBodyLockFromModals(); } },
        { el: modalProduct, close: () => { modalProduct?.classList.remove("open"); __syncBodyLockFromModals(); } },
        { el: modalSupplier, close: closeSupplierModal },
        { el: document.getElementById("modalCategory"), close: () => {
          const closeBtn = document.getElementById("catModalClose") || document.getElementById("btnCatDone");
          if (closeBtn) closeBtn.click();
          else {
            document.getElementById("modalCategory")?.classList.remove("open");
            __syncBodyLockFromModals();
          }
        }},
        { el: modalSettings, close: closeSettings },
        { el: modalQuick, close: closeModal }
      ];

      for (const item of modalOrder){
        if (item.el && item.el.classList.contains("open")){
          try{ item.close(); }catch(_){ }
          return true;
        }
      }
      return false;
    }

    __btnBack?.addEventListener("click", () => {
      if (closeHeaderModalIfOpen()) return;
      setView("home");
    });
    homeInvSelect?.addEventListener("change", () => {
      const value = homeInvSelect.value;
      if (!value) return;
      openInventoryOverlay(value);
      homeInvSelect.value = "";
    });
    menuInvSummary?.addEventListener("click", (event) => {
      event.preventDefault();
      closeSideMenu();
    });

    // default view
    setView("home");

    // Chiudi i modali cliccando fuori dal contenuto (overlay)
    ["ocr","inventory","flows","anag"].forEach((k) => {
      const el = __views[k];
      if (!el) return;
      el.addEventListener("click", (e) => { if (e.target === el) setView("home"); });
    });

    if (docItemsTable) {
      docItemsTable.addEventListener("click", (ev) => {
        // Se stai editando la quantità, non interferire con la selezione riga
        if (ev.target && ev.target.closest && ev.target.closest("input.qtyInputInline")) return;

        const tr = ev.target && ev.target.closest ? ev.target.closest("tr[data-code]") : null;
        if (!tr) return;

        // Elimina riga (minus a sinistra)
        const btnMinus = ev.target && ev.target.closest ? ev.target.closest(".rowMinus") : null;
        if (btnMinus) {
          ev.preventDefault();
          ev.stopPropagation();

          const i = Number(tr.dataset.i);
          if (Number.isNaN(i)) return;

          // Conferma eliminazione (OCR)
          const codeLbl = String(tr.dataset.code || "").trim();
          const descLbl = String(tr.dataset.desc || "").trim();
          const lineLbl = [codeLbl, descLbl].filter(Boolean).join(" • ");
          const ok = confirm(lineLbl ? ("Eliminare questa riga?\n\n" + lineLbl) : "Eliminare questa riga?");
          if (!ok) return;

          __deleteDocItemByIndex(i);
          return;
        }

        // Modifica quantità: click sulla cella Q.tà
        const qtyCell = ev.target && ev.target.closest ? ev.target.closest(".qtyCell") : null;
        if (qtyCell) {
          ev.preventDefault();
          ev.stopPropagation();
          __beginInlineQtyEdit(tr);
          return;
        }

// UI selection
        docItemsTable.querySelectorAll("tbody tr.is-selected").forEach(r => r.classList.remove("is-selected"));
        tr.classList.add("is-selected");

        const code = (tr.dataset.code || "").trim();
        const desc = (tr.dataset.desc || "").trim();
        const qty = (tr.dataset.qty || "").trim();

        if (__isConaiCode(code) || __isConaiLine(code) || __isConaiLine(desc)) return;
        if (fCode) fCode.value = code;
        if (fItem) fItem.value = desc;
        if (fQty) fQty.value = qty;

        // Se abbiamo info documento, completa data / nota / fornitore
        const doc = __lastDocExtract || {};
        const docDateISO = doc.__docDateISO || coerceToISODate(doc.documentDateRaw || doc.documentDate || "");
        if (fDate && docDateISO) fDate.value = docDateISO;

        const sup = doc.supplier || {};
        if (fCustomer && !fCustomer.value && sup.name) fCustomer.value = sup.name;

        const docType = doc.__docType || doc.documentTypeRaw || doc.documentType || "";
        const docNum = doc.__docNumber || doc.documentNumberRaw || doc.documentNumber || "";
        const docDate = doc.__docDateRaw || doc.documentDateRaw || doc.documentDate || "";
        const noteAuto = [docType, docNum, docDate].filter(Boolean).join(" ");
        if (fNote && (!fNote.value || fNote.value === "-") && noteAuto) fNote.value = noteAuto;
      });
    }

    const statTotalItems = document.getElementById("statTotalItems");
    const statTotalPieces = document.getElementById("statTotalPieces");
    const statTotalFlows = document.getElementById("statTotalFlows");
    const statLowStock = document.getElementById("statLowStock");
    const statLastUpdate = document.getElementById("statLastUpdate");

    [statTotalItems, statTotalPieces, statTotalFlows, statLowStock].forEach((el) => {
      if (el) el.textContent = "0";
    });


    // Home: riquadro sotto-scorta (visual)
    const lowStockBoard = document.getElementById("lowStockBoard");
    const lowStockListCerea = document.getElementById("lowStockListCerea");
    const lowStockListConca = document.getElementById("lowStockListConca");
    const lowStockCountCerea = document.getElementById("lowStockCountCerea");
    const lowStockCountConca = document.getElementById("lowStockCountConca");

    // Home: riquadro Categorie (Dashboard)
    const categoryListCerea = document.getElementById("categoryListCerea");
    const categoryTotalCerea = document.getElementById("categoryTotalCerea");

    // Home: Andamento inventario (grafico temporale)
    const invTrendTotal = document.getElementById("invTrendTotal");
    const invTrendRanges = document.getElementById("invTrendRanges");
    const invTrendChart = document.getElementById("invTrendChart");
    const invTrendTooltip = document.getElementById("invTrendTooltip");


    const stockTbody = document.getElementById("stockTbody");
    const movTbody = document.getElementById("movTbody");
    const flowsTbody = document.getElementById("flowsTbody");
    const pillFlowsCount = document.getElementById("pillFlowsCount");
    const pillStock = document.getElementById("pillStock");
    const pillInvWarehouse = document.getElementById("pillInvWarehouse");

    // Inventario: picker (Cerea / Concamarise)
    const invPicker = document.getElementById("invPicker");
    const invDetail = document.getElementById("invDetail");
    const invDetailTitle = document.getElementById("invDetailTitle");
    const btnPickCerea = document.getElementById("btnPickCerea");
    const btnPickConcamarise = document.getElementById("btnPickConcamarise");
    const btnInvBackPicker = document.getElementById("btnInvBackPicker");
    const btnBackInv = document.getElementById("btnBackInv");
    const pillMov = document.getElementById("pillMov");

    const searchStock = document.getElementById("searchStock");
    const filterCustomer = document.getElementById("filterCustomer");
    const filterLow = document.getElementById("filterLow");
    const filterCategory = document.getElementById("filterCategory");

    const pillOcr = document.getElementById("pillOcr");
    const dotOcr = document.getElementById("dotOcr");
    const pillOcrText = document.getElementById("pillOcrText");
    const hintPrivate = document.getElementById("hintPrivate");

    const importMovementsInput = document.getElementById("importMovementsInput");

    // Manual movement modal
    const modalMovement = document.getElementById("modalMovement");
    const movSegIn = document.getElementById("movSegIn");
    const movSegOut = document.getElementById("movSegOut");
    const mCustomer = document.getElementById("mCustomer");
    const mDate = document.getElementById("mDate");
    const mCode = document.getElementById("mCode");
    const mQty = document.getElementById("mQty");
    const mItem = document.getElementById("mItem");
    const mNote = document.getElementById("mNote");



    // ===== Inventario: UI picker + stato =====
    function setInventoryWarehouse(w){
      const wh = (String(w || "").trim()) ? normalizeWarehouse(w) : "";
      __currentWarehouse = wh;

      if (invPicker) invPicker.style.display = wh ? "none" : "";
      if (invDetail) invDetail.style.display = wh ? "" : "none";

      if (pillInvWarehouse) {
        pillInvWarehouse.style.display = wh ? "inline-flex" : "none";
        pillInvWarehouse.textContent = wh ? warehouseLabel(wh) : "—";
      }
      if (invDetailTitle) invDetailTitle.textContent = wh ? warehouseLabel(wh) : "Inventario";

      // UX: quando non hai ancora scelto, non mostrare "0 righe"
      if (pillStock && !wh) pillStock.textContent = "Seleziona";
    }

    function openInventoryOverlay(warehouse){
      setView("inventory");
      setInventoryWarehouse(warehouse || ""); // mostra picker se vuoto
      try{ renderAll(); }catch(_){}
    }

    // binder (safe)
    try{
      btnPickCerea && btnPickCerea.addEventListener("click", () => { setInventoryWarehouse(WAREHOUSE_CEREA); renderAll(); });
      btnPickConcamarise && btnPickConcamarise.addEventListener("click", () => { setInventoryWarehouse(WAREHOUSE_CONCA); renderAll(); });
      btnInvBackPicker && btnInvBackPicker.addEventListener("click", () => { setInventoryWarehouse(""); renderAll(); });
      btnBackInv && btnBackInv.addEventListener("click", () => {
        if (invDetail && invDetail.style.display !== "none") {
          setInventoryWarehouse("");
          renderAll();
          return;
        }
        setView("home");
      });
    }catch(_){}
/****************************************************************
     * State
     ****************************************************************/
    let state = {
      settings: { ...DEFAULT_SETTINGS },
      movements: [], // array of Movement
      thresholds: {}, // per-item threshold overrides: key -> number
      productCategories: {}, // per-code categoria (offline fallback)
      productUoms: {}, // per-code unità di misura (offline fallback)
      categories: [] // elenco categorie (offline fallback)
    };

    let capture = {
      files: [],            // pagine acquisite (File[])
      rawPages: [],         // OCR per pagina (stesso indice di files)
      structuredPages: [],  // structured OCR per pagina (se disponibile)
      activePageIndex: 0,   // pagina attiva per preview
      file: null,           // ultima/attiva (compatibilità)
      rawText: "",
      movementType: "IN" // IN/OUT
    };

    // OCR session token: increment to cancel any in-flight OCR processing
    let __ocrSessionToken = 0;


    /****************************************************************
     * Firebase runtime state
     ****************************************************************/
    let fb = {
      app: null,
      auth: null,
      db: null,
      storage: null,
      user: null,
      ready: false,
      // listeners
      unsub: {
        suppliers: null,
        products: null,
        categories: null,
        movements: null,
        thresholds: null,
        supplierDocs: null
      }
    };

    let suppliers = [];
    let products = [];
    let thresholds = {}; // key -> number (from Firestore)
    let activeAnagTab = "suppliers"; // suppliers|products
    let activeProductsMacroGroup = ""; // materie_prime|imballaggi|"" (tutti)


    function syncAnagHeaderTitle(){
      const el = document.getElementById("anagHeaderTitle");
      if (!el) return;
      if (activeAnagTab === "products") {
        const mg = String(activeProductsMacroGroup || "").trim();
        if (mg === "materie_prime") el.textContent = "Prodotti — Materie prime";
        else if (mg === "imballaggi") el.textContent = "Prodotti — Imballaggi";
        else el.textContent = "Prodotti";
      } else {
        el.textContent = "Fornitori";
      }
    }

    let currentSupplierId = null;

    function isFirebaseConfigured() {
      return FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !String(FIREBASE_CONFIG.apiKey).includes("YOUR_");
    }

    function orgCol(name) {
      return collection(fb.db, "orgs", ORG_ID, name);
    }


    // ===== CESTINO (soft delete) =====
    async function trashPut(entry){
      try{
        if (!fb.db) return;
        const col = collection(fb.db, "orgs", ORG_ID, "trash");
        const payload = {
          kind: String(entry && entry.kind || "unknown"),
          label: String(entry && entry.label || ""),
          target: entry && entry.target ? entry.target : null,
          data: entry && entry.data ? entry.data : null,
          deletedAt: serverTimestamp(),
          deletedBy: fb.user ? (fb.user.email || fb.user.uid || null) : null
        };
        await addDoc(col, payload);
      }catch(e){
        console.warn("trashPut failed", e);
      }
    }

    function keyToDocId(k) {
      // Firestore docId cannot contain "/" — everything else ok.
      return encodeURIComponent(String(k || ""));
    }

    function tsToIso(ts) {
      try {
        if (!ts) return "";
        if (typeof ts.toDate === "function") return ts.toDate().toISOString();
      } catch {}
      // already string or invalid
      return String(ts || "");
    }
    // --- Helpers: normalizzazione pagine documento (docPages/docImages) ---
    function __isRenderableUrl(u){
      if (u == null) return false;
      const s = String(u).trim();
      if (!s) return false;
      // URL comuni
      if (/^https?:\/\//i.test(s)) return true;
      if (s.startsWith("data:image/")) return true;
      if (s.startsWith("blob:")) return true;
      if (s.startsWith("gs://")) return true; // Firebase Storage path (renderabile dopo getDownloadURL)
      if (s.startsWith("/")) return true;
      // anche path relativi
      return true;
    }

    function __sanitizeDocPages(pages){
      try {
        if (!pages) return [];
        const out = [];
        const pushOne = (obj) => {
          if (!obj) return;
          let url = obj.url || obj.downloadURL || obj.downloadUrl || obj.src || obj.href || obj.path || obj.storagePath || obj.gsPath || "";
          url = (url == null) ? "" : String(url).trim();
          if (!url) return;
          if (!__isRenderableUrl(url)) return;
          out.push({
            page: safeInt(obj.page) || 0,
            url,
            path: obj.path || obj.storagePath || obj.gsPath || "",
            name: obj.name || obj.fileName || ""
          });
        };

        // Stringa singola
        if (typeof pages === "string") {
          pushOne({ url: pages });
        }
        // Array
        else if (Array.isArray(pages)) {
          for (const p of pages) {
            if (!p) continue;
            if (typeof p === "string") pushOne({ url: p });
            else if (typeof p === "object") pushOne(p);
          }
        }
        // Oggetto singolo o mappa
        else if (typeof pages === "object") {
          // oggetto con url/path
          if (pages.url || pages.path || pages.storagePath || pages.gsPath || pages.downloadURL || pages.downloadUrl) {
            pushOne(pages);
          } else {
            // mappa {0:...,1:...}
            for (const k of Object.keys(pages)) {
              const v = pages[k];
              if (!v) continue;
              if (typeof v === "string") pushOne({ url: v, page: safeInt(k)+1 });
              else if (typeof v === "object") pushOne({ ...v, page: safeInt(v.page) || (safeInt(k)+1) });
            }
          }
        }

        // Dedup e re-index
        const seen = new Set();
        const clean = [];
        for (const it of out) {
          const key = String(it.url || it.path || "").trim();
          if (!key) continue;
          const lk = key.toLowerCase();
          if (seen.has(lk)) continue;
          seen.add(lk);
          clean.push(it);
        }
        for (let i = 0; i < clean.length; i++) {
          clean[i].page = i + 1;
        }
        return clean;
      } catch (e) {
        console.warn("__sanitizeDocPages failed", e);
        return [];
      }
    }


    function setSyncPill(status, text) {
      const el = document.getElementById("pillSync");
      const txt = document.getElementById("pillSyncText");
      if (!el || !txt) return;
      el.style.display = "inline-flex";
      txt.textContent = text || "Sync";
      // dot is first child
      const dot = el.querySelector(".dot");
      if (dot) {
        dot.classList.remove("ok","warn","bad");
        dot.classList.add(status === "ok" ? "ok" : (status === "bad" ? "bad" : "warn"));
      }
    }

    async function initFirebase() {
      const btnLogin = document.getElementById("btnLoginGoogle");
      const btnLogout = document.getElementById("btnLogout");
      const pillUser = document.getElementById("pillUser");
      const pillUserText = document.getElementById("pillUserText");

      if (!isFirebaseConfigured()) {
        setSyncPill("warn", "Sync: configura Firebase");
        // keep login visible as hint (if present), but it won't work
        btnLogin?.addEventListener("click", () => {
          openModal("Config mancante", "Manca la FIREBASE_CONFIG nel file. Incolla apiKey, authDomain, projectId, storageBucket, senderId e appId.");
        });
        return;
      }

      try {
        fb.app = initializeApp(FIREBASE_CONFIG);
        fb.auth = getAuth(fb.app);
        await setPersistence(fb.auth, browserLocalPersistence);
        fb.db = initializeFirestore(fb.app, { experimentalAutoDetectLongPolling: true, useFetchStreams: false });
        fb.storage = getStorage(fb.app);

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        const humanAuthErr = (err) => {
          const code = String(err?.code || err?.message || "").toLowerCase();
          const map = {
            "auth/unauthorized-domain": "Dominio non autorizzato (Firebase Auth → Settings → Authorized domains).",
            "auth/operation-not-allowed": "Provider Google non abilitato (Firebase Auth → Sign-in method).",
            "auth/popup-blocked": "Popup bloccato dal browser. Passo al reindirizzamento…",
            "auth/popup-closed-by-user": "Popup chiuso. Riprova.",
            "auth/cancelled-popup-request": "Richiesta annullata. Riprova.",
            "auth/network-request-failed": "Connessione instabile. Riprova tra qualche secondo.",
            "auth/invalid-api-key": "Config Firebase non valida (apiKey).",
            "auth/invalid-oauth-client-id": "Client OAuth non valido. Controlla la configurazione Web SDK.",
            "auth/redirect-cancelled-by-user": "Accesso annullato. Riprova."
          };
          for (const k in map) { if (code.includes(k)) return map[k]; }
          return "Errore accesso. Controlla rete e riprova.";
        };

        // Completa eventuale login via redirect (iOS / popup bloccati)
        try { await getRedirectResult(fb.auth); } catch (e) {
          console.warn("getRedirectResult error", e);
          // Non blocco l'app, ma mostro un hint.
          openModal("Accesso", humanAuthErr(e));
        }


        btnLogin?.addEventListener("click", async () => {
          try {
            setSyncPill("warn", "Sync: accesso…");
            await signInWithPopup(fb.auth, provider);
          } catch (e) {
            console.warn("Google popup error", e);
            const msg = humanAuthErr(e);
            // Fallback: su iOS / popup bloccati
            if (String(e?.code || "").includes("popup-blocked") || String(e?.code || "").includes("operation-not-supported-in-this-environment")) {
              try {
                await signInWithRedirect(fb.auth, provider);
                return;
              } catch (e2) {
                console.warn("Google redirect error", e2);
                openModal("Accesso non riuscito", humanAuthErr(e2));
                setSyncPill("bad", "Sync: errore login");
                return;
              }
            }
            openModal("Accesso non riuscito", msg);
            setSyncPill("bad", "Sync: errore login");
          }
        });
btnLogout.addEventListener("click", async () => {
          try {
            await signOut(fb.auth);
          } catch (e) {
            console.error(e);
            openModal("Errore", "Non sono riuscito a fare logout.");
          }
        });

        onAuthStateChanged(fb.auth, (user) => {
          fb.user = user || null;

          if (user) {
            // UI
            pillUser.style.display = "inline-flex";
            const label = user.displayName || user.email || "Utente";
            pillUserText.textContent = label;
            btnLogin?.style && (btnLogin.style.display = "none");
            btnLogout.style.display = "none";
            setSyncPill("ok", "Sync: connesso");

            startRealtime();
          } else {
            pillUser.style.display = "none";
            btnLogin?.style && (btnLogin.style.display = "inline-flex");
            btnLogout.style.display = "none";
            setSyncPill("warn", "Sync: non connesso");

            stopRealtime();
            // fallback: local-only
            loadLocalData();
            renderAll();
    renderAnag();
            renderAnag();
          }
        });

        fb.ready = true;
      } catch (e) {
        console.error("Firebase init failed", e);
        setSyncPill("bad", "Sync: init error");
        openModal("Firebase non configurato", "Ho trovato un problema nel collegamento a Firebase. Controlla la config e i domini autorizzati.");
      }
    }

    function stopRealtime() {
      for (const k of Object.keys(fb.unsub)) {
        try { fb.unsub[k] && fb.unsub[k](); } catch {}
        fb.unsub[k] = null;
      }
      suppliers = [];
      products = [];
      thresholds = {};
      currentSupplierId = null;
      try {
        if (!Array.isArray(state.categories) || !state.categories.length) state.categories = DEFAULT_CATEGORIES.slice();
        __applyRuntimeCategories(state.categories);
        renderCategoryOptions();
      } catch(_){ }
    }

    function startRealtime() {
      stopRealtime();

      // Suppliers
      fb.unsub.suppliers = onSnapshot(
        query(orgCol("suppliers"), orderBy("nameLower")),
        (snap) => {
          suppliers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderAnag();
        },
        (err) => {
          console.error("suppliers watch error", err);
          // Evita di cambiare lo stato Sync globale per singole collezioni.
        }
      );

      // Products
      fb.unsub.products = onSnapshot(
        query(orgCol("products"), orderBy("nameLower")),
        (snap) => {
          products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          renderAll();
          renderAnag();
},
        (err) => {
          console.error("products watch error", err);
          // Evita di cambiare lo stato Sync globale per singole collezioni.
        }
      );

      // Categories
      fb.unsub.categories = onSnapshot(
        query(orgCol("categories"), orderBy("nameLower")),
        (snap) => {
          const list = snap.docs.map(d => {
            const data = d.data() || {};
            const key = decodeURIComponent(d.id || "");
            return {
              key,
              name: String(data.name || data.label || key || "").trim() || key,
              color: String(data.color || "").trim()
            };
          }).filter(x => x && x.key);

          if (!list.length) {
            // UI continua a funzionare con i default, ma proviamo anche a seedare sul cloud
            __applyRuntimeCategories(DEFAULT_CATEGORIES.slice());
            try { renderCategoryOptions(); } catch(_){}
            try { __seedDefaultCategoriesIfEmpty(); } catch(_){}
          } else {
            __applyRuntimeCategories(list);
            try { renderCategoryOptions(); } catch(_){}
          }

          renderAll();
          renderAnag();
        },
        (err) => {
          console.error("categories watch error", err);
          // Evita di cambiare lo stato Sync globale per singole collezioni.
        }
      );

      // Thresholds
      fb.unsub.thresholds = onSnapshot(
        orgCol("thresholds"),
        (snap) => {
          thresholds = {};
          snap.docs.forEach(d => {
            const data = d.data() || {};
            const n = Number(data.value);
            if (Number.isFinite(n)) thresholds[decodeURIComponent(d.id)] = Math.floor(n);
          });
          renderAll();
        },
        (err) => console.warn("thresholds watch error", err)
      );

      // Movements (all, ordered by createdAt)
      fb.unsub.movements = onSnapshot(
        query(orgCol("inventoryMovements"), orderBy("createdAt")),
        (snap) => {
          state.movements = snap.docs.map(d => {
            const data = d.data() || {};
            return {
              id: d.id,
              type: data.type || "IN",
              customer: data.customer || "",
              code: data.code || "",
              item: data.item || "",
              uom: String(data.uom || "").trim(),
              qtyRaw: String(data.qtyRaw || "").trim(),
              qty: safeInt(data.qty),
              date: data.date || "",
              note: data.note || "",
              source: data.source || "Manual",
              rawText: data.rawText || "",
              docType: data.docType || "",
              docNum: data.docNum || "",
              docDateRaw: data.docDateRaw || "",
              lineIndex: safeInt(data.lineIndex),
              docPages: __sanitizeDocPages(data.docPages || data.docImages),
              warehouse: normalizeWarehouse(data.warehouse || ""),
              createdAt: tsToIso(data.createdAt) || data.createdAtIso || ""
            };
          });
          renderAll();
        },
        (err) => {
          console.error("movements watch error", err);
          // Evita di cambiare lo stato Sync globale per singole collezioni.
        }
      );
    }

    function watchSupplierDocs(supplierId) {
      // Legacy: prima erano "allegati" su Firestore. Ora la lista documenti del fornitore
      // è derivata dai DDT / documenti caricati (OCR) e si aggiorna via renderAll().
      try { fb.unsub.supplierDocs && fb.unsub.supplierDocs(); } catch {}
      fb.unsub.supplierDocs = null;
      renderSupplierLinkedDocs();
    }


    /****************************************************************
     * Utils
     ****************************************************************/
    function nowIso() { return new Date().toISOString(); }

    function safeInt(v) {
      const n = Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.max(0, Math.floor(n));
    }

    function formatDateIT(isoDate) {
      if (!isoDate) return "—";
      const d = new Date(isoDate);
      if (Number.isNaN(d.getTime())) return "—";
      return d.toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" });
    }

    function todayYYYYMMDD() {
      const d = new Date();
      const pad = (x) => String(x).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }


// ===== Scroll lock (blocca pagina sotto ai modali) =====
let __modalLockScrollY = 0;

function __setBodyLocked(locked){
  try{
    const b = document.body;
    const d = document.documentElement;
    if (!b || !d) return;

    if (locked){
      if (b.classList.contains("modal-open")) return;
      __modalLockScrollY = window.scrollY || window.pageYOffset || 0;
      b.classList.add("modal-open");
      d.classList.add("modal-open");
      // iOS: evita scroll della pagina sotto
      b.style.position = "fixed";
      b.style.top = `-${__modalLockScrollY}px`;
      b.style.left = "0";
      b.style.right = "0";
      b.style.width = "100%";
    } else {
      if (!b.classList.contains("modal-open")) return;
      b.classList.remove("modal-open");
      d.classList.remove("modal-open");
      b.style.position = "";
      b.style.top = "";
      b.style.left = "";
      b.style.right = "";
      b.style.width = "";
      try{ window.scrollTo(0, __modalLockScrollY || 0); }catch{}
    }
  }catch(e){}
}

function __syncBodyLockFromModals(){
  try{
    const anyOpen = !!document.querySelector(".modal.open");
    __setBodyLocked(anyOpen);
    syncHeaderBackVisibility();
  }catch(e){}
}


function __shouldCenterPop(msg, kind){
      try{
        const s = String(msg ?? "").trim();
        if(!s || s.toLowerCase() === "pronto") return false;
        if(kind === "silent") return false;

        const errRe = /(errore|attenzione|impossibile|non trovato|non valida|non valido)/i;
        const okRe  = /(salv|aggiorn|moviment|spostat|caricat|importat|creat|eliminat|conferm|applicat|rimosso|ok|fatto|complet|quantità aggiornata|sincronizzat)/i;

        if(kind === "err" || kind === "warn") return true;
        if(errRe.test(s)) return true;
        return okRe.test(s);
      }catch(_){ return true; }
    }

    function showCenterPop(msg, kind="ok"){
      if(!centerPopEl) return;
      const s = String(msg ?? "").trim();
      if(!s) return;
      const k = (kind === "err") ? "err" : (kind === "warn" ? "warn" : "ok");
      centerPopEl.classList.remove("ok","warn","err");
      centerPopEl.classList.add(k);
      centerPopEl.textContent = s;
      centerPopEl.classList.add("show");
      clearTimeout(showCenterPop._t);
      const ttl = (k === "err") ? 1700 : (k === "warn" ? 1500 : 1250);
      showCenterPop._t = setTimeout(() => centerPopEl.classList.remove("show"), ttl);
    }

    function showToast(msg, kind) {
      const s = String(msg ?? "").trim();
      const useCenter = __shouldCenterPop(s, kind);

      if (useCenter) {
        showCenterPop(s, kind);
        return;
      }

      if (toastEl) {
        toastEl.textContent = s || "";
        toastEl.classList.add("show");
        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1900);
      }
    }

    function openModal(title, body) {
      modalTitle.textContent = title;
      modalBody.textContent = body;
      modalQuick.classList.add("open");
      __syncBodyLockFromModals();
    }
    function closeModal() { modalQuick.classList.remove("open");
      __syncBodyLockFromModals(); }

    function closeDocDetail() {
      try { __docDetailRenderToken++; } catch(_){}
      try { __revokeDocDetailBlobUrls(); } catch(_){}
      if (modalDocDetail) modalDocDetail.classList.remove("open");
      __syncBodyLockFromModals();
    }

    // ===== Flussi: modifica / elimina (documento) =====
    let __currentFlowEditKey = null;

    function openFlowEdit(docKey) {
      const g = __docGroupsMap.get(String(docKey || ""));
      if (!g) { showToast("Flusso non trovato"); return; }
      if (!modalFlowEdit) return;

      __currentFlowEditKey = String(g.key || "");
      if (flowEditTitle) flowEditTitle.textContent = `Modifica flusso`;
      if (flowEditSub) flowEditSub.textContent = `Documento: ${formatDocLabel(g)} • ${safeInt((g.movements || []).length)} righe`;

      if (flowEditCustomer) flowEditCustomer.value = (g.customer || "");
      if (flowEditDate) flowEditDate.value = (g.date || "");
      if (flowEditNote) flowEditNote.value = (g.note || "");

      try { renderFlowEditItems(g); } catch(_){ }

      modalFlowEdit.classList.add("open");
      __syncBodyLockFromModals();
      try { flowEditCustomer && flowEditCustomer.focus(); } catch {}
    }

    function closeFlowEdit() {
      __currentFlowEditKey = null;
      if (modalFlowEdit) modalFlowEdit.classList.remove("open");
      __syncBodyLockFromModals();
    }



function renderFlowEditItems(groupMaybe){
  try{
    if (!flowEditItemsTbody) return;

    const g = (groupMaybe && typeof groupMaybe === "object")
      ? groupMaybe
      : __docGroupsMap.get(String(__currentFlowEditKey || ""));

    if (!g) {
      if (flowEditItemsMeta) flowEditItemsMeta.textContent = "0 righe";
      flowEditItemsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Flusso non trovato.</td></tr>';
      return;
    }

    const label = formatDocLabel(g);
    const mvArr = Array.isArray(g.movements) ? g.movements.slice() : [];

    // Header meta
    try{
      if (flowEditSub) flowEditSub.textContent = `Documento: ${label} • ${safeInt(mvArr.length)} righe`;
    }catch(_){}

    const rows = mvArr
      .filter((mv) => {
        const code = String(mv.code || "").trim();
        const item = String(mv.item || "").trim();
        if (!code && !item) return false;
        // prudente: ignora eventuali righe CONAI rimaste (in teoria già filtrate a monte)
        if (__isConaiLine(code) || __isConaiLine(item) || __isConaiCode(code) || __isConaiCode(item)) return false;
        return true;
      })
      .map((mv) => ({
        id: String(mv.id || ""),
        code: String(mv.code || "").trim(),
        item: String(mv.item || "").trim(),
        qty: safeInt(mv.qty),
        lineIndex: safeInt(mv.lineIndex),
        createdAt: String(mv.createdAt || "")
      }))
      .filter(r => !!r.id);

    rows.sort((a, b) => {
      const ai = safeInt(a.lineIndex);
      const bi = safeInt(b.lineIndex);
      if (ai && bi && ai !== bi) return ai - bi;
      if ((ai || bi) && ai !== bi) return (ai || 0) - (bi || 0);

      const ca = String(a.createdAt || "");
      const cb = String(b.createdAt || "");
      if (ca && cb && ca !== cb) return ca.localeCompare(cb);

      const cc = String(a.code || "").localeCompare(String(b.code || ""));
      if (cc !== 0) return cc;
      return String(a.item || "").localeCompare(String(b.item || ""));
    });

    const pieces = rows.reduce((sum, r) => sum + safeInt(r.qty), 0);
    if (flowEditItemsMeta) flowEditItemsMeta.textContent = `${rows.length} righe • ${Number(pieces).toLocaleString("it-IT")} pezzi`;

    if (!rows.length) {
      flowEditItemsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessuna riga.</td></tr>';
      return;
    }

    const canDelete = rows.length > 1;

    flowEditItemsTbody.innerHTML = rows.map(r => {
      const minusHtml = canDelete
        ? `<button class="rowMinus jsFlowRowDelete" type="button" data-id="${escapeHtmlAttr(r.id)}" title="Elimina riga">−</button>`
        : ``;

      return `
        <tr data-mvid="${escapeHtmlAttr(r.id)}">
          <td data-label="">${minusHtml}</td>
          <td data-label="Codice">
            <input class="qtyEditInput flowCellInput jsFlowCodeInput" type="text"
              value="${escapeHtmlAttr(r.code || "")}" data-id="${escapeHtmlAttr(r.id)}" data-orig="${escapeHtmlAttr(r.code || "")}" />
          </td>
          <td data-label="Articolo">
            <input class="qtyEditInput flowCellInput jsFlowItemInput" type="text"
              value="${escapeHtmlAttr(r.item || "")}" data-id="${escapeHtmlAttr(r.id)}" data-orig="${escapeHtmlAttr(r.item || "")}" />
          </td>
          <td data-label="Pezzi" class="qty">
            <input class="qtyEditInput jsFlowQtyInput" type="number" inputmode="numeric" min="0" step="1"
              value="${safeInt(r.qty)}" data-id="${escapeHtmlAttr(r.id)}" data-orig="${safeInt(r.qty)}" />
          </td>
        </tr>
      `;
    }).join("");

  }catch(e){
    console.warn("renderFlowEditItems failed", e);
  }
}

    async function updateMovementsBulk(ids, patch) {
      const list = (Array.isArray(ids) ? ids : []).filter(Boolean);
      if (!list.length) return;

      // optimistic update (UI immediata)
      const nowIso = new Date().toISOString();
      for (const m of state.movements) {
        if (list.includes(m.id)) {
          Object.assign(m, patch || {});
          m.updatedAtIso = nowIso;
          m.updatedBy = (fb.user && (fb.user.email || fb.user.uid)) ? (fb.user.email || fb.user.uid) : "local";
        }
      }
      renderAll();

      // realtime (Firestore)
      if (fb.user && fb.db) {
        const updatedBy = (fb.user.email || fb.user.uid || "user");
        const data = Object.assign({}, patch || {}, { updatedAt: serverTimestamp(), updatedBy });
        await Promise.all(list.map(async (id) => {
          await setDoc(doc(fb.db, "orgs", ORG_ID, "inventoryMovements", id), data, { merge: true });
        }));
        return;
      }

      // local fallback
      saveLocalData();
    }


function __getDocKeyFromMovementFn(){
  // Safe resolver: avoids ReferenceError if docKeyFromMovement is block-scoped or missing
  try {
    if (typeof docKeyFromMovement === "function") return docKeyFromMovement;
  } catch(_){}
  try {
    if (typeof globalThis !== "undefined" && typeof globalThis.docKeyFromMovement === "function") return globalThis.docKeyFromMovement;
  } catch(_){}

  // Fallback: try meta-based key builder
  try {
    if (typeof docKeyFromMeta === "function") return (mv) => docKeyFromMeta(mv || {});
  } catch(_){}

  // Last-resort fallback: best-effort stable key
  return (mv) => {
    const m = (mv && typeof mv === "object") ? mv : {};
    const customer = String(m.customer || m.supplierName || m.supplier || "").trim().toLowerCase();
    const date = String(m.date || m.dateISO || "").trim();
    const note = String(m.note || "").trim().toLowerCase();
    const docNum = String(m.docNum || "").trim().toLowerCase();
    const keyPart = (docNum || note || String(m.id || "").trim().toLowerCase());
    const source = String(m.source || "").trim().toLowerCase();
    return [customer, date, keyPart, source].join("|");
  };
}

async function deleteMovementsBulk(ids) {
  const list = (Array.isArray(ids) ? ids : []).filter(Boolean);
  if (!list.length) return;

  const set = new Set(list);

  const __docKeyFn = __getDocKeyFromMovementFn();

  // Collect doc-pages paths grouped by documento (elimina foto solo se sparisce tutto il documento)
  const deletedByDocKey = new Map(); // docKey -> Set(paths)
  const deletedTripletByDocKey = new Map(); // docKey -> Set(ddtTripletKey)
  for (const mv of (state.movements || [])) {
    if (!set.has(mv.id)) continue;
    const dk = __docKeyFn(mv);
    const pages = __sanitizeDocPages((mv && (mv.docPages || mv.docImages)) || []);
    if (!pages.length) continue;
    const s = deletedByDocKey.get(dk) || new Set();
    pages.forEach(p => { if (p && p.path) s.add(String(p.path)); });
    deletedByDocKey.set(dk, s);
    const tk = String((mv && (mv.ddtTripletKey || mv.ddtKey)) || "").trim();
    if (tk) {
      const ts = deletedTripletByDocKey.get(dk) || new Set();
      ts.add(tk);
      deletedTripletByDocKey.set(dk, ts);
    }
  }

  // optimistic update (UI immediata)
  state.movements = (state.movements || []).filter(m => !set.has(m.id));
  renderAll();

  // Which docs still exist after deletion?
  const remainingDocKeys = new Set();
  (state.movements || []).forEach(mv => {
    try { remainingDocKeys.add(__docKeyFn(mv)); } catch {}
  });

  const pathsToDelete = new Set();
  deletedByDocKey.forEach((paths, dk) => {
    if (!remainingDocKeys.has(dk)) {
      paths.forEach(p => pathsToDelete.add(p));
    }
  });

  const tripletKeysToDelete = new Set();
  deletedTripletByDocKey.forEach((keys, dk) => {
    if (!remainingDocKeys.has(dk)) {
      keys.forEach(k => tripletKeysToDelete.add(k));
    }
  });

  // realtime (Firestore)
  if (fb.user && fb.db) {
    await Promise.all(list.map(async (id) => {
      try {
        await deleteDoc(doc(fb.db, "orgs", ORG_ID, "inventoryMovements", id));
      } catch (e) {
        console.error("delete movement failed", id, e);
      }
    }));
    // best-effort: delete immagini (solo se il documento non esiste più)
    await deleteStoragePaths(pathsToDelete);
    // best-effort: delete indice anti-duplicato (solo se il documento non esiste più)
    await Promise.all(Array.from(tripletKeysToDelete).map(k => __releaseDocTripletKey(k)));
    return;
  }

  // local fallback
  saveLocalData();
}

    async function saveFlowEdit() {
      const g = __docGroupsMap.get(String(__currentFlowEditKey || ""));
      if (!g) { showToast("Flusso non trovato"); return; }

      const customerNew = String(flowEditCustomer ? flowEditCustomer.value : "").trim();
      const dateNew = String(flowEditDate ? flowEditDate.value : "").trim();
      const noteNew = String(flowEditNote ? flowEditNote.value : "").trim();

      if (!customerNew) return openModal("Dato mancante", "Inserisci il fornitore.");
      if (!dateNew) return openModal("Dato mancante", "Inserisci la data.");

      // Leggi righe dal modale (codice / articolo / qty)
      const rowsEls = Array.from(flowEditItemsTbody ? flowEditItemsTbody.querySelectorAll('tr[data-mvid]') : []);
      const rowDrafts = [];
      for (const tr of rowsEls) {
        const id = String(tr.getAttribute("data-mvid") || "").trim();
        if (!id) continue;

        const codeInp = tr.querySelector("input.jsFlowCodeInput");
        const itemInp = tr.querySelector("input.jsFlowItemInput");
        const qtyInp  = tr.querySelector("input.jsFlowQtyInput");

        const code = String(codeInp ? codeInp.value : "").trim();
        const item = String(itemInp ? itemInp.value : "").trim();
        let qty = safeInt(qtyInp ? qtyInp.value : 0);
        if (!Number.isFinite(qty) || qty < 0) qty = 0;

        const origCode = String(codeInp ? (codeInp.dataset.orig || "") : "").trim();
        const origItem = String(itemInp ? (itemInp.dataset.orig || "") : "").trim();

        if (!code || !item) {
          openModal("Dati mancanti", "Ogni riga deve avere Codice e Articolo.");
          return;
        }

        rowDrafts.push({ id, code, item, qty, origCode, origItem });
      }

      const idsAll = (g.movements || []).map(m => m && m.id).filter(Boolean);
      if (!idsAll.length) { showToast("Nessuna riga da salvare"); return; }

      const basePatch = { customer: customerNew, date: dateNew, note: noteNew };

      // Un solo giro di update: patch base su TUTTE le righe, e patch specifica su quelle visibili nel modale
      const patchById = new Map(idsAll.map(id => [String(id), Object.assign({}, basePatch)]));

      for (const r of rowDrafts) {
        const p = patchById.get(r.id) || Object.assign({}, basePatch);
        p.code = r.code;
        p.item = r.item;
        p.qty  = safeInt(r.qty);
        patchById.set(r.id, p);
      }

      // Helpers: update many (1 render) + persist
      const __updateMovementsMany = async (pairs) => {
        const list = Array.isArray(pairs) ? pairs.filter(x => x && x.id && x.patch) : [];
        if (!list.length) return;

        const nowIso = new Date().toISOString();

        // Optimistic local
        const byId = new Map((state.movements || []).map(mv => [String(mv && mv.id || ""), mv]));
        for (const it of list) {
          const mv = byId.get(String(it.id));
          if (mv) {
            Object.assign(mv, it.patch || {});
            mv.updatedAtIso = nowIso;
            mv.updatedBy = (fb.user && (fb.user.email || fb.user.uid)) ? (fb.user.email || fb.user.uid) : "local";
          }
        }
        renderAll();

        // Realtime (Firestore)
        if (fb.user && fb.db) {
          const updatedBy = (fb.user.email || fb.user.uid || "user");
          await Promise.all(list.map(async (it) => {
            const data = Object.assign({}, it.patch || {}, { updatedAt: serverTimestamp(), updatedBy });
            await setDoc(doc(fb.db, "orgs", ORG_ID, "inventoryMovements", String(it.id)), data, { merge: true });
          }));
          return;
        }

        // Local fallback
        saveLocalData();
      };

      // Helpers: code used?
      const __isCodeUsed = (codeLow) => {
        const low = String(codeLow || "").trim().toLowerCase();
        if (!low) return false;
        return (state.movements || []).some(mv => String(mv && mv.code || "").trim().toLowerCase() === low);
      };

      // Helpers: (customer+code) used?
      const __isThrKeyUsed = (thrKey) => {
        const k = String(thrKey || "").trim().toLowerCase();
        if (!k) return false;
        return (state.movements || []).some(mv => movementKey(mv.customer || "", mv.code || "") === k);
      };

      const oldCustomer = String(g.customer || "").trim();

      // Salva
      try {
        if (btnSaveFlowEdit) {
          btnSaveFlowEdit.disabled = true;
          btnSaveFlowEdit.dataset.prevText = btnSaveFlowEdit.textContent || "";
          btnSaveFlowEdit.textContent = "Salvo…";
        }

        // 1) Movimenti: update in un colpo
        const pairs = Array.from(patchById.entries()).map(([id, patch]) => ({ id, patch }));
        await __updateMovementsMany(pairs);

        // 2) Migrazione soglie (best effort): customer e/o codice cambiati
        try {
          const thrOps = rowDrafts
            .filter(r => (oldCustomer && customerNew && normSupplierKey(oldCustomer) !== normSupplierKey(customerNew))
              || (r.origCode && String(r.origCode).trim().toLowerCase() !== String(r.code).trim().toLowerCase()))
            .map(r => ({
              oldKey: movementKey(oldCustomer || customerNew, r.origCode || r.code),
              newKey: movementKey(customerNew, r.code)
            }));

          for (const op of thrOps) {
            const ok = String(op.oldKey || "");
            const nk = String(op.newKey || "");
            if (!ok || !nk || ok === nk) continue;

            const hasOld =
              (thresholds && Object.prototype.hasOwnProperty.call(thresholds, ok) && Number.isFinite(Number(thresholds[ok])))
              || (state && state.thresholds && Object.prototype.hasOwnProperty.call(state.thresholds, ok) && Number.isFinite(Number(state.thresholds[ok])));
            const hasNew =
              (thresholds && Object.prototype.hasOwnProperty.call(thresholds, nk) && Number.isFinite(Number(thresholds[nk])))
              || (state && state.thresholds && Object.prototype.hasOwnProperty.call(state.thresholds, nk) && Number.isFinite(Number(state.thresholds[nk])));

            if (hasOld && !hasNew) {
              const v = getThresholdForKey(ok);
              await setThresholdForKey(nk, v);
            }

            // se nessun movimento usa più la vecchia chiave, pulisci
            if (!__isThrKeyUsed(ok)) {
              await clearThresholdForKey(ok);
            }
          }
        } catch (e) {
          console.warn("threshold migrate skipped", e);
        }

        // 3) Anagrafica prodotti: upsert + (eventuale) migrazione docId se il codice cambia
        try {
          if (fb.user && fb.db) {
            // dedup per nuovo codice
            const prodMap = new Map();
            for (const r of rowDrafts) {
              const nCode = String(r.code || "").trim();
              const nName = String(r.item || "").trim() || nCode;
              const oCode = String(r.origCode || "").trim();
              if (!nCode) continue;
              prodMap.set(nCode.toLowerCase(), { oldCode: oCode, newCode: nCode, name: nName });
            }

            for (const it of prodMap.values()) {
              const oldCode = String(it.oldCode || "").trim();
              const newCode = String(it.newCode || "").trim();
              const newLow = newCode.toLowerCase();
              const nm = String(it.name || "").trim() || newCode;
              const nmLow = nm.toLowerCase();

              // carry fields from old (alias/categoria) if useful
              const oldP = oldCode ? findProductByCode(oldCode) : null;
              const newP = findProductByCode(newCode);

              const payload = {
                code: newCode,
                codeLower: newLow,
                name: nm,
                nameLower: nmLow,
                updatedAt: serverTimestamp(),
                updatedBy: (fb.user.email || fb.user.uid || "")
              };

              // carry alias/categoria solo se non già presente sul target
              const tgtHasAlias = !!(newP && (newP.alias || newP.aliasName));
              const tgtHasCat = !!(newP && newP.category);
              const tgtHasUom = !!(newP && __normalizeUom(newP.uom || ""));
              if (oldP && !tgtHasAlias) {
                const al = String(oldP.alias || oldP.aliasName || "").trim();
                if (al) {
                  payload.alias = al;
                  payload.aliasLower = al.toLowerCase();
                }
              }
              if (oldP && !tgtHasCat) {
                const cat = String(oldP.category || "").trim();
                if (cat) payload.category = cat;
              }

              if (oldP && !tgtHasUom) {
                const u = __normalizeUom(oldP.uom || "");
                if (u) payload.uom = u;
              }

              await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(newLow)), payload, { merge: true });

              // migra productCategories (fallback locale)
              try{
                const oLow = String(oldCode || "").trim().toLowerCase();
                if (oLow && state && state.productCategories && (oLow in state.productCategories) && !(newLow in state.productCategories)) {
                  state.productCategories[newLow] = state.productCategories[oLow];
                  delete state.productCategories[oLow];
                  saveLocalData();
                }
              }catch(_){}

              // se il codice è cambiato, prova a eliminare il vecchio doc SOLO se non più usato da nessun movimento
              if (oldCode && newCode && oldCode.toLowerCase() !== newLow) {
                const oLow = oldCode.toLowerCase();
                if (!__isCodeUsed(oLow)) {
                  try { await deleteDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(oLow))); } catch(_){}
                }
              }
            }
          }
        } catch (e) {
          console.warn("product upsert/migrate skipped", e);
        }

        showToast("Modifiche salvate");
        closeFlowEdit();
      } catch (e) {
        console.error("saveFlowEdit failed", e);
        openModal("Errore", "Non sono riuscito a salvare le modifiche.");
      } finally {
        if (btnSaveFlowEdit) {
          btnSaveFlowEdit.disabled = false;
          btnSaveFlowEdit.textContent = btnSaveFlowEdit.dataset.prevText || "Salva";
          delete btnSaveFlowEdit.dataset.prevText;
        }
      }
    }

    async function deleteFlowByKey(docKey) {
      const g = __docGroupsMap.get(String(docKey || ""));
      if (!g) { showToast("Flusso non trovato"); return; }

      const label = formatDocLabel(g);
      const n = safeInt((g.movements || []).length);
      const ok = confirm(`Eliminare il flusso?\n\n${label}\n\nVerranno eliminate ${n} righe.`);
      if (!ok) return;

      const ids = (g.movements || []).map(m => m.id).filter(Boolean);
      try{ await trashPut({ kind:"flow", label: label, target:{ col:"movements", ids: ids }, data: { movements: (g.movements || []).map(mv => ({...mv})) } }); }catch(_){ }
      await deleteMovementsBulk(ids);
      showToast("Flusso eliminato");
      closeFlowEdit();
    }



    function openDocDetail(docKey) {
      const g = __docGroupsMap.get(String(docKey || ""));
      if (!g) { showToast("Documento non trovato"); return; }

      const rows = (g.movements || [])
        .filter((mv) => {
          const code = String(mv.code || "").trim();
          const item = String(mv.item || "").trim();
          if (!code && !item) return false;
          if (__isConaiLine(code) || __isConaiLine(item) || __isConaiCode(code) || __isConaiCode(item)) return false;
          return true;
        })
        .map((mv) => ({
          code: String(mv.code || "").trim(),
          item: String(mv.item || "").trim(),
          qty: safeInt(mv.qty),
          lineIndex: safeInt(mv.lineIndex),
          createdAt: String(mv.createdAt || "")
        }));

      const totalPieces = rows.reduce((sum, r) => sum + safeInt(r.qty), 0);

      rows.sort((a, b) => {
        const ai = safeInt(a.lineIndex);
        const bi = safeInt(b.lineIndex);
        if (ai && bi && ai !== bi) return ai - bi;
        if ((ai || bi) && ai !== bi) return (ai || 0) - (bi || 0);

        const ca = String(a.createdAt || "");
        const cb = String(b.createdAt || "");
        if (ca && cb && ca !== cb) return ca.localeCompare(cb);

        const cc = String(a.code || "").localeCompare(String(b.code || ""));
        if (cc !== 0) return cc;
        return String(a.item || "").localeCompare(String(b.item || ""));
      });

      if (docDetailTitle) docDetailTitle.textContent = formatDocLabel(g);
      if (docDetailSubtitle) {
        const d = formatDateOnlyIT(g.date);
        docDetailSubtitle.textContent = `${g.customer || "—"}${d ? " · " + d : ""}`;
      }


      renderDocDetailPhotos(g);

      if (docDetailTbody) {
        if (rows.length === 0) {
          docDetailTbody.innerHTML = '<tr><td class="td-muted" colspan="3">Nessuna riga.</td></tr>';
        } else {
          docDetailTbody.innerHTML = rows.map(r => `
            <tr>
              <td data-label="Codice" class="td-muted">${escapeHtml(r.code || "")}</td>
              <td data-label="Articolo">${escapeHtml(r.item || "")}</td>
              <td data-label="Pezzi" class="qty">${safeInt(r.qty).toLocaleString("it-IT")}</td>
            </tr>
          `).join("");
        }
      }

      if (docDetailTotals) {
        docDetailTotals.textContent = `Righe: ${rows.length.toLocaleString("it-IT")} · Pezzi: ${totalPieces.toLocaleString("it-IT")}`;
      }

      if (modalDocDetail) modalDocDetail.classList.add("open");
      __syncBodyLockFromModals();
    }


    function openSettings() { modalSettings.classList.add("open"); }
    function closeSettings() { modalSettings.classList.remove("open"); }

    function openMovementModal() { modalMovement.classList.add("open");
      __syncBodyLockFromModals(); }
    function closeMovementModal() { modalMovement.classList.remove("open");
      __syncBodyLockFromModals(); }

    function movementKey(customer, code) {
      return `${(customer||"").trim().toLowerCase()}||${(code||"").trim().toLowerCase()}`;
    }

    // ===== Inventari (Cerea / Concamarise) =====
    const WAREHOUSE_CEREA = "cerea";
    const WAREHOUSE_CONCA = "concamarise";

    function normalizeWarehouse(v){
      const s = String(v || "").trim().toLowerCase();
      if (!s) return WAREHOUSE_CEREA;
      if (s === "concamarise") return WAREHOUSE_CONCA;
      if (s === "cerea") return WAREHOUSE_CEREA;
      if (s.includes("conca")) return WAREHOUSE_CONCA;
      if (s.includes("cerea") || s.startsWith("cer")) return WAREHOUSE_CEREA;
      return WAREHOUSE_CEREA;
    }

    function warehouseLabel(v){
      const w = normalizeWarehouse(v);
      return (w === WAREHOUSE_CONCA) ? "Inventario Concamarise" : "Inventario Cerea";
    }

    function stockRowKey(customer, code, warehouse){
      return `${normalizeWarehouse(warehouse)}||${movementKey(customer, code)}`;
    }

    // "" => nessun inventario selezionato (picker)
    let __currentWarehouse = "";function downloadBlob(filename, content, mime="text/plain") {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function csvEscape(s) {
      const v = String(s ?? "");
      if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
      return v;
    }

    function parseCSV(text) {
      // Minimal CSV parser: comma separated with quotes
      const rows = [];
      let row = [];
      let cur = "";
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i+1];
        if (inQuotes) {
          if (ch === '"' && next === '"') { cur += '"'; i++; continue; }
          if (ch === '"') { inQuotes = false; continue; }
          cur += ch;
        } else {
          if (ch === '"') { inQuotes = true; continue; }
          if (ch === ',') { row.push(cur); cur = ""; continue; }
          if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ""; continue; }
          if (ch === '\r') { continue; }
          cur += ch;
        }
      }
      row.push(cur);
      rows.push(row);
      return rows.filter(r => r.some(x => String(x).trim() !== ""));
    }

    /****************************************************************
     * Persistence
     ****************************************************************/

    /****************************************************************
     * Persistence (local)
     * - Settings: sempre in localStorage (per-browser)
     * - Dati (movimenti / soglie): in Firebase se sei loggato, altrimenti localStorage
     ****************************************************************/
    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORE_KEY_SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            state.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
          }
        } else {
          // migrazione legacy
          const legacyRaw = localStorage.getItem(STORE_KEY_LEGACY);
          if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw);
            if (parsed && typeof parsed === "object") {
              state.settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
              saveSettings();
            }
          }
        }

        // Migrazione: se avevi il vecchio endpoint Cloud Run diretto, passa al proxy di default
        const oldUrl = String(state.settings.ocrUrl || "");
        if (/gemini-ocr-537555699968\.europe-west1\.run\.app/i.test(oldUrl) || /\/__sandbox\/ocr-image\s*$/i.test(oldUrl)) {
          state.settings.ocrUrl = DEFAULT_SETTINGS.ocrUrl;
        }
      } catch (e) {
        console.warn("loadSettings failed", e);
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(STORE_KEY_SETTINGS, JSON.stringify({ settings: state.settings }));
      } catch {}
    }

    function loadLocalData() {
      try {
        const raw = localStorage.getItem(STORE_KEY_LOCALDATA) || localStorage.getItem(STORE_KEY_LEGACY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.movements = Array.isArray(parsed.movements) ? parsed.movements : [];
          state.thresholds = parsed.thresholds && typeof parsed.thresholds === "object" ? parsed.thresholds : {};
          state.productCategories = parsed.productCategories && typeof parsed.productCategories === "object" ? parsed.productCategories : {};
          state.productUoms = parsed.productUoms && typeof parsed.productUoms === "object" ? parsed.productUoms : {};
          state.categories = Array.isArray(parsed.categories) ? parsed.categories : (Array.isArray(state.categories) ? state.categories : []);
          // Categorie: default + indice runtime
          if (!Array.isArray(state.categories) || !state.categories.length) state.categories = DEFAULT_CATEGORIES.slice();
          try{ __applyRuntimeCategories(state.categories); }catch(_){ }

        }
      } catch (e) {
        console.warn("loadLocalData failed", e);
      }
    }

    function saveLocalData() {
      try {
        localStorage.setItem(STORE_KEY_LOCALDATA, JSON.stringify({
          movements: state.movements,
          thresholds: state.thresholds,
          productCategories: state.productCategories,
          productUoms: state.productUoms,
          categories: state.categories
        }));
      } catch {}
    }

/****************************************************************
     * OCR integration (via proxy / Cloud Run)
     ****************************************************************/
    async function ensureHeic2AnyLoaded() {
      if (window.heic2any) return true;
      // load from CDN dynamically only if needed
      return new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/heic2any/dist/heic2any.min.js";
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.head.appendChild(s);
      });
    }

    async function maybeConvertHeic(file) {
      const t = (file?.type || "").toLowerCase();
      const name = (file?.name || "").toLowerCase();
      const isHeic = t.includes("heic") || t.includes("heif") || name.endsWith(".heic") || name.endsWith(".heif");
      if (!isHeic) return file;

      progressLabel.textContent = "Conversione HEIC → JPEG…";
      progressFill.style.width = "22%";

      const ok = await ensureHeic2AnyLoaded();
      if (!ok || !window.heic2any) {
        openModal("HEIC non supportato", "Questa foto è in formato HEIC. Per ora: converti in JPG oppure imposta iPhone su “Più compatibile” (Impostazioni > Fotocamera > Formati).");
        throw new Error("HEIC conversion library not available");
      }

        const outBlob = await window.heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
  const blob = Array.isArray(outBlob) ? outBlob[0] : outBlob;
  if (!(blob instanceof Blob)) return file;
  const newName = (file && file.name ? file.name : "image.heic").replace(/\.(heic|heif)$/i, ".jpg");
  return new File([blob], newName, { type: "image/jpeg" });
}

    // ===== OCR speed-up (client-side) =====
    // Riduce tempo di upload + tempo server: ridimensiona e comprime l'immagine prima di inviarla all'OCR.
    function __ocrMaxDim(){
      const v = Number(state && state.settings && state.settings.ocrMaxDim);
      if (Number.isFinite(v) && v >= 1200 && v <= 4200) return Math.round(v);
      return 2200; // default: veloce ma leggibile
    }
    function __ocrJpegQuality(){
      const v = Number(state && state.settings && state.settings.ocrJpegQ);
      if (Number.isFinite(v) && v >= 0.5 && v <= 0.98) return v;
      return 0.82;
    }
    function __ocrParallel(){
      const v = Number(state && state.settings && state.settings.ocrParallel);
      if (Number.isFinite(v) && v >= 1 && v <= 3) return Math.round(v);
      const hc = Number(navigator && navigator.hardwareConcurrency || 4);
      return (hc >= 6) ? 2 : 1;
    }
    function __canvasToBlob(canvas, type, quality){
      return new Promise((resolve) => {
        try { canvas.toBlob((b) => resolve(b), type, quality); }
        catch(_){ resolve(null); }
      });
    }
    async function maybeOptimizeForOCR(file){
      try{
        if (!file) return file;
        const type = String(file.type || "").toLowerCase();
        if (!type.startsWith("image/")) return file;

        const bytes = Number(file.size || 0);
        const isJpeg = type.includes("jpeg") || type.includes("jpg");
        // Se è già un JPEG piccolo, non fare nulla
        if (isJpeg && bytes > 0 && bytes <= 1400 * 1024) return file;

        const maxDim = __ocrMaxDim();
        const jpegQ  = __ocrJpegQuality();

        let bmp = null;
        try{
          bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
        }catch(_){
          bmp = await createImageBitmap(file);
        }

        const w = bmp.width || 0;
        const h = bmp.height || 0;
        const m = Math.max(w, h);

        // Se è già in range e JPEG, evita re-encode (risparmia tempo client)
        if (isJpeg && m > 0 && m <= maxDim && bytes > 0 && bytes <= 2200 * 1024){
          try{ bmp.close && bmp.close(); }catch(_){}
          return file;
        }

        const scale = (m > maxDim && m > 0) ? (maxDim / m) : 1;
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement("canvas");
        canvas.width = tw;
        canvas.height = th;

        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
        try{
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
        }catch(_){}
        ctx.drawImage(bmp, 0, 0, tw, th);

        try{ bmp.close && bmp.close(); }catch(_){}

        const blob = await __canvasToBlob(canvas, "image/jpeg", jpegQ);
        if (!blob) return file;

        const base = String(file.name || "scan").replace(/\.(heic|heif|png|jpg|jpeg|webp|bmp|tif|tiff)$/i, "") || "scan";
        const name = base + ".jpg";
        return new File([blob], name, { type: "image/jpeg", lastModified: file.lastModified || Date.now() });
      }catch(e){
        console.warn("maybeOptimizeForOCR skipped", e);
        return file;
      }
    }

    async function runGeminiOCR(imageFile) {
      const url = (state.settings.ocrUrl || "").trim();
      if (!url) throw new Error("OCR URL mancante. Apri Impostazioni e inseriscilo.");

      const headers = {};
      const key = (state.settings.ocrKey || "").trim();
      if (key) headers["X-OCR-KEY"] = key;

      // Best practice: do not send cookies; Cloud Run CORS will handle
      const fd = new FormData();
      fd.append("file", imageFile);

      const res = await fetch(url, { method: "POST", headers, body: fd });
      const ct = res.headers.get("content-type") || "";
      let data;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const txt = await res.text();
        data = { raw: txt };
      }

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.data = data;
        throw err;
      }

      return data;
    }

    function setOcrPill(status, text) {
      if (!pillOcrText || !dotOcr) return;
      pillOcrText.textContent = text;
      dotOcr.classList.remove("ok","warn","bad");
      if (status === "ok") dotOcr.classList.add("ok");
      else if (status === "bad") dotOcr.classList.add("bad");
      else dotOcr.classList.add("warn");
    }

    async function testOcrHealth() {
      const url = (state.settings.ocrUrl || "").trim();
      if (!url) { setOcrPill("warn", "OCR: da configurare"); return false; }

      try {
        const headers = {};
        const key = (state.settings.ocrKey || "").trim();
        if (key) headers["X-OCR-KEY"] = key;

        // Test “pulito”: creiamo una piccola immagine "TEST" e facciamo una POST.
        // Così otteniamo 200 (niente 400 rosso in console).
        const blob = await new Promise((resolve) => {
          const c = document.createElement("canvas");
          c.width = 240; c.height = 90;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.fillStyle = "#000000";
          ctx.font = "bold 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
          ctx.textBaseline = "middle";
          ctx.fillText("TEST", 20, c.height / 2);
          c.toBlob((b) => resolve(b), "image/png");
        });

        const fd = new FormData();
        fd.append("file", blob, "health-test.png");

        const r = await fetch(url, { method: "POST", headers, body: fd });

        if (r.ok || r.status === 400) {
          setOcrPill("ok", "OCR: collegato");
          return true;
        }

        setOcrPill("warn", `OCR: risposta ${r.status}`);
        return false;
      } catch (e) {
        setOcrPill("bad", "OCR: non raggiungibile");
        return false;
      }
    }

    /****************************************************************
     * Parsing (best-effort) + user confirmation
     ****************************************************************/
    function normalizeText(t) {
      return String(t || "").replace(/\r/g, "").trim();
    }

// OCR filtering (CRITICO): ignora righe CONAI B1 / CONAI B2
function __isConaiCode(v){
  const s = String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
  return s === "conai b1" || s === "conai b2";
}
function __isConaiLine(v){
  const s = String(v || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return false;
  const hasConai = (s.includes("conai b1") || s.includes("conai b2"));
  if (!hasConai) return false;
  // regola richiesta: "codice articolo: CONAI B1/B2" (anche in varianti/spaziature)
  const hasMarker = (s.includes("codice") && s.includes("articolo"));
  return hasMarker || __isConaiCode(s);
}
function __isConaiItem(it){
  if (!it) return false;
  const code = String(it.code || "").toLowerCase().replace(/\s+/g, " ").trim();
  const desc = String(it.description || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (__isConaiCode(code)) return true;
  // alcune OCR mettono "codice articolo: CONAI B1 / CONAI B2" in descrizione/testo
  if (__isConaiLine(code) || __isConaiLine(desc)) return true;
  const merged = `${code} ${desc}`.trim();
  if (!merged) return false;
  // fallback prudente
  if ((merged.includes("conai b1") || merged.includes("conai b2")) && (merged.includes("codice") && merged.includes("articolo"))) return true;
  return false;
}

    function extractFieldsFromText(text) {
      const t = normalizeText(text);
      const lines = t.split(/\n+/).map(x => x.trim()).filter(Boolean).filter(ln => !__isConaiLine(ln));

      const joined = lines.join(" \n ");
      const out = { customer: "", code: "", item: "", qty: "", date: "", note: "" };

      // date
      const m1 = joined.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
      if (m1) out.date = `${m1[3]}-${m1[2]}-${m1[1]}`;
      const m2 = joined.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
      if (!out.date && m2) out.date = `${m2[1]}-${m2[2]}-${m2[3]}`;

      // qty: look for labels then first integer
      const qtyLabel = joined.match(/\b(qta|qtà|qty|quantit[aà]|pezzi|pcs|pieces)\b[^0-9]{0,12}(\d{1,7})\b/i);
      if (qtyLabel) out.qty = qtyLabel[2];

      // code: labels
      const codeLabel = joined.match(/\b(cod(ice)?|sku|art(icolo)?|item)\b[^A-Z0-9]{0,10}([A-Z0-9][A-Z0-9\-\_\.]{2,})\b/i);
      if (codeLabel) out.code = codeLabel[3];

      // customer
      const custLabel = joined.match(/\b(cliente|client)\b\s*[:\-]?\s*([^\n]{3,40})/i);
      if (custLabel) out.customer = custLabel[2].split("  ")[0].trim();

      // item
      const itemLabel = joined.match(/\b(articolo|descrizione|prodotto)\b\s*[:\-]?\s*([^\n]{4,80})/i);
      if (itemLabel) out.item = itemLabel[2].trim();

      // fallback item: first meaningful line without obvious labels
      if (!out.item) {
        const candidate = lines.find(l => l.length >= 6 && !/\b(cliente|cod|sku|qta|qty|data|ddt|totale|pz|pcs)\b/i.test(l));
        if (candidate) out.item = candidate.slice(0, 80);
      }

      // fallback qty: first standalone integer near words
      if (!out.qty) {
        const anyInt = joined.match(/\b(\d{1,6})\b/);
        if (anyInt) out.qty = anyInt[1];
      }

      // note: store compact snippet
      out.note = lines.slice(0, 6).join(" | ").slice(0, 180);

      return out;
    }


    // --- Documento (estratto OCR) ---
    let __lastDocExtract = null;

    function coerceToISODate(v){
      if (!v) return "";
      const s = String(v).trim();
      // already ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      // dd/mm/yyyy or d/m/yyyy
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m){
        const dd = String(m[1]).padStart(2,"0");
        const mm = String(m[2]).padStart(2,"0");
        const yyyy = m[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // try yyyy/mm/dd
      const m2 = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (m2){
        const yyyy = m2[1];
        const mm = String(m2[2]).padStart(2,"0");
        const dd = String(m2[3]).padStart(2,"0");
        return `${yyyy}-${mm}-${dd}`;
      }
      return "";
    }

    // ===== U.M. (unità di misura) normalizzazione =====
    // Canoniche richieste: nr / pz / kg / ton
    function __normalizeUom(v){
      const raw = String(v ?? "").trim().toLowerCase();
      if (!raw) return "";

      // Togli spazi/punteggiatura “soft” (preserva ° per n°)
      let k = raw
        .replace(/\s+/g, "")
        .replace(/[,;:]/g, "")
        .replace(/\.+$/g, "");

      // Normalizza alcuni simboli comuni
      k = k.replace(/º/g, "°");

      // pezzi
      if (k === "pz" || k === "p.z" || k === "p.z." || k === "pc" || k === "pcs" || k === "pezzi") return "pz";
      // numero
      if (k === "nr" || k === "n" || k === "n°" || k === "no") return "nr";
      // peso
      if (k === "kg" || k === "kgs" || k === "k" || k === "kilo" || k === "kilogrammi" || k === "kilogrammo") return "kg";
      // tonnellate
      if (k === "ton" || k === "tons" || k === "tonn" || k === "tonne" || k === "t" || k === "tonnellate" || k === "tonnellata") return "ton";

      return "";
    }

    // Estrae (qtyRaw, uom) da una stringa quantità, supportando:
    // - "1760 PZ", "1760pz", "NR 10", "10 nr", "48 kg", "1,2 t", "0.5 ton" …
    function __splitQtyUom(qtyPart){
      const s0 = String(qtyPart ?? "").trim();
      if (!s0) return { qtyRaw: "", uom: "" };

      let s = s0.replace(/\s+/g, " ").trim();
      let uom = "";
      let qtyRaw = s;

      // 1) uom in coda (anche attaccata al numero)
      const end = s.match(/(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\s*$/i);
      if (end && end.index != null) {
        const cand = __normalizeUom(end[1]);
        if (cand) {
          uom = cand;
          qtyRaw = s.slice(0, end.index).trim();
        }
      }

      // 2) uom in testa (es: "NR 10")
      if (!uom) {
        const beg = s.match(/^\s*(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\b\s*/i);
        if (beg) {
          const cand = __normalizeUom(beg[1]);
          if (cand) {
            uom = cand;
            qtyRaw = s.slice(beg[0].length).trim();
          }
        }
      }

      // Pulizia qtyRaw (solo per evitare residui tipo "x" finali)
      qtyRaw = String(qtyRaw || "").trim();
      return { qtyRaw, uom };
    }

    function __normalizeDocItems(items){
      const arr = Array.isArray(items) ? items : [];
      return arr.map((it) => {
        const o = (it && typeof it === "object") ? it : {};
        const out = { ...o };

        // compatibilità chiavi
        if (out.description == null && out.item != null) out.description = out.item;
        if (out.code == null && out.sku != null) out.code = out.sku;

        // qtyRaw sorgente (anche se la struttura usa altri nomi)
        const rawQtyStr = String(
          (out.qtyRaw ?? out.quantityRaw ?? out.qtaRaw ?? out.qta ?? out.quantity ?? out.qty ?? "")
        ).trim();

        // uom sorgente
        let uom = __normalizeUom(out.uom ?? out.um ?? out.unit ?? out.unitOfMeasure ?? out.unitaMisura ?? "");

        // se qtyRaw include già l'unità, separala
        const split = __splitQtyUom(rawQtyStr);
        if (!uom && split.uom) uom = split.uom;

        const qtyOnly = split.qtyRaw || rawQtyStr;

        out.uom = uom || "";
        out.qtyRaw = (qtyOnly ? `${qtyOnly}${uom ? " " + uom : ""}`.trim() : "");

        // parse qty (best effort) mantenendo supporto a virgola italiana
        if (qtyOnly) {
          const norm = String(qtyOnly).replace(/\./g, "").replace(",", ".");
          const n = Number(norm);
          if (!Number.isNaN(n)) out.qty = n;
        }

        return out;
      });
    }

    function parseItemsFromRawText(rawText){
      const out = [];
      const lines = String(rawText || "").split(/\r?\n/).map(l => l.trim());
      for (const ln of lines){
        if (__isConaiLine(ln)) continue;
        if (!ln.startsWith("-")) continue;
        const parts = ln.replace(/^\-\s*/, "").split(" | ").map(p => p.trim()).filter(Boolean);
        if (parts.length < 3) continue;

        const code = parts[0];
        const qtyPart = parts[1]; // es: "1.760,00 PZ" / "1760pz" / "NR 10"
        const desc = parts.slice(2).join(" | ");
        if (__isConaiCode(code) || __isConaiLine(code) || __isConaiLine(desc)) continue;

        const split = __splitQtyUom(qtyPart);
        const uom = split.uom || "";
        const qtyOnly = split.qtyRaw || String(qtyPart || "").trim();

        let qty = null;
        if (qtyOnly){
          const norm = String(qtyOnly).replace(/\./g, "").replace(",", ".");
          const n = Number(norm);
          if (!Number.isNaN(n)) qty = n;
        }

        out.push({
          code,
          description: desc,
          uom,
          qtyRaw: (qtyOnly ? `${qtyOnly}${uom ? " " + uom : ""}`.trim() : String(qtyPart || "").trim()),
          qty
        });
      }
      return out;
    }

    function setElText(id, v){
      const el = document.getElementById(id);
      if (!el) return;
      const t = (v == null || v === "") ? "-" : String(v);
      el.textContent = t;
    }

    function setElHtml(id, html){
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = html;
    }

    function formatQtyForCell(item){
      if (item && item.qtyRaw) return String(item.qtyRaw);
      if (item && typeof item.qty === "number") return item.qty.toLocaleString("it-IT", { maximumFractionDigits: 2 });
      return "";
    }

    // === OCR items table: solo Quantità editabile + Elimina riga (minus) ===
    function __docItemsRowsHtml(items){
      const arr = Array.isArray(items) ? items : [];
      return arr.map((it, i) => {
        const code = (it.code || "").trim();
        const desc = (it.description || "").trim();
        const uom = (it.uom || "").trim();
        const qtyDisp = formatQtyForCell(it);
        const qtyVal = (it.qty != null && it.qty !== "" && !Number.isNaN(Number(it.qty))) ? String(it.qty) : (it.qtyRaw ? String(it.qtyRaw).replace(/[^\d,\.]/g,"").trim() : "");
        return `<tr data-i="${i}" data-code="${escapeHtmlAttr(code)}" data-desc="${escapeHtmlAttr(desc)}" data-uom="${escapeHtmlAttr(uom)}" data-qty="${escapeHtmlAttr(qtyVal)}">
          <td data-label="Codice" class="code"><div class="codeCellWrap"><button type="button" class="rowMinus" aria-label="Elimina riga">–</button><span class="codeTxt">${escapeHtml(code || "-")}</span></div></td>
          <td data-label="Descrizione">${escapeHtml(desc || "-")}</td>
          <td data-label="U.M." class="num">${escapeHtml(uom || "-")}</td>
          <td data-label="Q.tà" class="num"><span class="qtyCell" title="Clicca per modificare">${escapeHtml(qtyDisp || "-")}</span></td>
        </tr>`;
      }).join("");
    }

    function __getDocItemsArr(){
      const doc = __lastDocExtract || {};
      const arr = Array.isArray(doc.items) ? doc.items : (Array.isArray(doc.__items) ? doc.__items : []);
      if (!Array.isArray(doc.items) && Array.isArray(arr)) doc.items = arr;
      if (!Array.isArray(doc.__items) && Array.isArray(arr)) doc.__items = arr;
      return arr;
    }

    function __refreshConfirmMovementEnabled(){
      try{
        const btn = document.getElementById("btnConfirmMovement");
        const customerEl = document.getElementById("fCustomer");
        if (!btn) return;
        const items = __getDocItemsArr();
        const hasValid = (items || []).some(it => {
          const key = String(it.code || it.description || "").trim();
          const qRaw = (it.qty != null && it.qty !== "") ? String(it.qty) : String(it.qtyRaw || "");
          const q = Number(qRaw.replace(",", ".").replace(/[^\d.]/g,""));
          return !!key && !Number.isNaN(q) && q > 0;
        });
        btn.disabled = !(String(customerEl && customerEl.value || "").trim() && hasValid);
      } catch (_e) {}
    }

    function __rerenderDocItemsTable(){
      const tbody = document.querySelector("#docItemsTable tbody");
      if (!tbody) return;
      const items = __getDocItemsArr();
      tbody.innerHTML = __docItemsRowsHtml(items) || `<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--muted)">Nessuna riga trovata.</td></tr>`;
      __refreshConfirmMovementEnabled();
    }

    function __deleteDocItemByIndex(i){
      const items = __getDocItemsArr();
      if (!Array.isArray(items)) return;
      if (Number.isNaN(i) || i < 0 || i >= items.length) return;
      items.splice(i, 1);
      __rerenderDocItemsTable();
    }

    function __beginInlineQtyEdit(tr){
      if (!tr) return;
      const idx = Number(tr.dataset.i);
      if (Number.isNaN(idx)) return;

      const items = __getDocItemsArr();
      const it = items[idx];
      if (!it) return;

      const tdQty = tr.querySelector('td[data-label="Q.tà"]');
      if (!tdQty) return;

      if (tdQty.querySelector("input.qtyInputInline")) return;

      const currentRaw = ((it.qty != null && it.qty !== "") ? String(it.qty) : String(it.qtyRaw || "")).trim();
      const currentNum = Number(currentRaw.replace(",", ".").replace(/[^\d.]/g,""));
      const value = (!Number.isNaN(currentNum) ? String(currentNum) : (currentRaw || ""));

      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.01";
      input.inputMode = "decimal";
      input.className = "qtyInputInline";
      input.value = value;

      tdQty.innerHTML = "";
      tdQty.appendChild(input);
      input.focus();
      try { input.select(); } catch(_e){}

      let cancelled = false;

      const commit = () => {
        if (cancelled) return;
        const v = String(input.value || "").trim();
        if (v === "") {
          it.qty = "";
          it.qtyRaw = "";
        } else {
          const n = Number(v.replace(",", ".").replace(/[^\d.]/g,""));
          if (!Number.isNaN(n)) {
            it.qty = n;
            it.qtyRaw = v;
          }
        }
        __rerenderDocItemsTable();
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        if (e.key === "Escape") { e.preventDefault(); cancelled = true; __rerenderDocItemsTable(); }
      });
      input.addEventListener("blur", commit);
    }


    function renderDocExtract(structured, rawText){
      const panel = document.getElementById("docExtractPanel");
      const tbody = document.querySelector("#docItemsTable tbody");
      if (!panel || !tbody) return;

      __lastDocExtract = null;
      panel.style.display = "none";
      tbody.innerHTML = "";

      const s = (structured && typeof structured === "object") ? structured : null;
      if (!s) return;

      const sup = s.supplier || {};
      const tot = s.totals || {};
      const car = s.carrier || {};
      const supName = String((sup && sup.name) || "").trim();

      const docType = s.documentTypeRaw || s.documentType || "";
      const docNumber = s.documentNumberRaw || s.documentNumber || "";
      const docDateRaw = s.documentDateRaw || s.documentDate || "";
      const docDateISO = coerceToISODate(docDateRaw) || coerceToISODate(s.documentDate);

      let items = Array.isArray(s.items) ? s.items.slice() : [];
      if (!items.length && rawText) items = parseItemsFromRawText(rawText);
      // Normalizza chiavi + U.M. (nr/pz/kg/ton) + qtyRaw
      items = __normalizeDocItems(items);
      // OCR filtering (CRITICO): ignora CONAI B1/B2
      items = (items || []).filter(it => !__isConaiItem(it));

      const hasAny = !!(docType || docNumber || docDateRaw || (sup && sup.name) || items.length);
      if (!hasAny) return;

      __lastDocExtract = { ...s, items, __items: items, __docType: docType, __docNumber: docNumber, __docDateISO: docDateISO, __docDateRaw: docDateRaw };
      // Auto: campi documento + abilita "Conferma carico"
      try {
        if (supName && fCustomer) fCustomer.value = supName;
        if (docDateISO && fDate) fDate.value = docDateISO;

        const hasValid = (items || []).some(it => {
          const key = String(it.code || it.description || "").trim();
          const qRaw = (it.qty != null && it.qty !== "") ? String(it.qty) : String(it.qtyRaw || "");
          const q = Number(qRaw.replace(",", ".").replace(/[^\d.]/g,""));
          return !!key && !Number.isNaN(q) && q > 0;
        });

        btnConfirmMovement.disabled = !(String(fCustomer.value || "").trim() && hasValid);
      } catch (_e) {}


      panel.style.display = "";

      setElText("docType", docType);
      setElText("docNumber", docNumber);
      setElText("docDate", docDateRaw || (docDateISO || ""));
      setElText("docPackages", (tot.totalPackagesRaw || tot.totalPackages || ""));

      setElText("docSupplier", (sup.name || ""));
      const fiscal = [
        sup.vatNumber ? `P.IVA ${sup.vatNumber}` : "",
        sup.taxCode ? `CF ${sup.taxCode}` : "",
        sup.rea ? `REA ${sup.rea}` : ""
      ].filter(Boolean).join(" | ");
      setElText("docFiscal", fiscal);

      setElText("docSupplierAddr", (sup.address || ""));

      const orders = Array.isArray(s.orderReferences) ? s.orderReferences.filter(Boolean) : [];
      if (orders.length){
        const lis = orders.map(o => `<li>${escapeHtml(String(o))}</li>`).join("");
        setElHtml("docOrders", `<ul style="margin:0; padding-left:18px">${lis}</ul>`);
      } else {
        setElText("docOrders", "-");
      }

      const carrierTxt = [car.name || "", car.address || ""].filter(Boolean).join(" — ");
      setElText("docCarrier", carrierTxt || "-");

      const notes = Array.isArray(s.notes) ? s.notes.filter(Boolean) : [];
      if (notes.length){
        const lis = notes.map(n => `<li>${escapeHtml(String(n))}</li>`).join("");
        setElHtml("docNotes", `<ul style="margin:0; padding-left:18px">${lis}</ul>`);
      } else {
        setElText("docNotes", "-");
      }

      // rows
      const rowsHtml = __docItemsRowsHtml(items);
      tbody.innerHTML = rowsHtml || `<tr><td colspan="4" style="text-align:center; padding:12px; color:var(--muted)">Nessuna riga trovata.</td></tr>`;
}

function validateMovementFields(fields) {
      const customer = (fields.customer || "").trim();
      const code = (fields.code || "").trim();
      const item = (fields.item || "").trim();
      const qty = safeInt(fields.qty);
      const date = (fields.date || "").trim();

      if (!customer || !code || !item || qty <= 0 || !date) return false;
      return true;
    }

    function __canConfirmMovement(){
      try{
        if (__lastDocExtract && Array.isArray(__lastDocExtract.items) && __lastDocExtract.items.length){
          const customerOk = String((fCustomer && fCustomer.value) || "").trim().length > 0;
          const hasValid = __lastDocExtract.items.some(it => {
            const q = safeInt(it && it.qty);
            const codeOk = String((it && it.code) || "").trim().length > 0;
            const itemOk = String((it && it.item) || "").trim().length > 0;
            return q > 0 && (codeOk || itemOk);
          });
          return customerOk && hasValid;
        }
      }catch(_){}
      return validateMovementFields({
        customer: (fCustomer && fCustomer.value) || "",
        code: (fCode && fCode.value) || "",
        item: (fItem && fItem.value) || "",
        qty: (fQty && fQty.value) || "",
        date: (fDate && fDate.value) || ""
      });
    }



    /****************************************************************
     * Business logic (stock computed from movements)
     ****************************************************************/
    function computeStock() {
      const stock = new Map(); // key -> {customer, code, item, qty, lastMoveAt, threshold}
      const latestByKey = new Map();

      for (const mv of state.movements) {
        const customer = (mv.customer || "").trim();
        const code = (mv.code || "").trim();
        const item = (mv.item || "").trim();
        const k = movementKey(customer, code);
        const cur = stock.get(k) || { customer, code, item, uom: "", qty: 0, lastMoveAt: "", threshold: getThresholdForKey(k) };
        const q = safeInt(mv.qty);
        cur.qty += (mv.type === "OUT" ? -q : q);
        if (!cur.item && item) cur.item = item;
        const __u = __normalizeUom(mv.uom || "");
        if (__u) cur.uom = __u;
        // last move timestamp by createdAt (or date)
        const ts = mv.createdAt || mv.date || "";
        const prev = latestByKey.get(k) || "";
        if (!prev || String(ts) > String(prev)) {
          latestByKey.set(k, String(ts));
          cur.lastMoveAt = String(ts);
        }
        stock.set(k, cur);
      }

      // normalize negative to 0? In a real ERP you might allow negative to signal errors
      // Here we keep negatives visible so you can spot issues.
      const arr = Array.from(stock.values());
      return arr;
    }


    function computeStockByWarehouse() {
      const stock = new Map(); // key -> {warehouse, customer, code, item, qty, lastMoveAt, threshold}
      const latestByKey = new Map();

      for (const mv of (state.movements || [])) {
        const warehouse = normalizeWarehouse(mv.warehouse || mv.site || mv.magazzino || mv.location || "");
        const customer = (mv.customer || "").trim();
        const code = (mv.code || "").trim();
        const item = (mv.item || "").trim();
        const itemK = movementKey(customer, code);
        const k = `${warehouse}||${itemK}`;

        const cur = stock.get(k) || {
          warehouse,
          customer,
          code,
          item,
          uom: "",
          qty: 0,
          lastMoveAt: "",
          threshold: getThresholdForKey(itemK)
        };

        const q = safeInt(mv.qty);
        cur.qty += (mv.type === "OUT" ? -q : q);
        if (!cur.item && item) cur.item = item;
        const __u = __normalizeUom(mv.uom || "");
        if (__u) cur.uom = __u;

        const ts = mv.createdAt || mv.date || "";
        const prev = latestByKey.get(k) || "";
        if (!prev || String(ts) > String(prev)) {
          latestByKey.set(k, String(ts));
          cur.lastMoveAt = String(ts);
        }

        stock.set(k, cur);
      }

      return Array.from(stock.values());
    }



// === Inventario: righe per sede includendo prodotti senza movimenti ===
// Regola visibilità:
// - se un codice è 0 nella sede corrente MA >0 nell'altra sede => NON mostrare
// - se un codice è 0 in entrambe le sedi => mostrare (utile per articoli nuovi / mai movimentati)
function buildInventoryRowsForWarehouse(wh, stockByWh){
  const w = normalizeWarehouse(wh);
  const other = (w === WAREHOUSE_CEREA) ? WAREHOUSE_CONCA : WAREHOUSE_CEREA;

    let rows = (Array.isArray(stockByWh) ? stockByWh : []).filter(x => normalizeWarehouse(x.warehouse) === w).map(r => Object.assign({}, r));

  // Filtra per visibilità sede (solo se impostata in anagrafica)
  rows = rows.filter(r => {
    const code = String(r && r.code || "").trim();
    if (!code) return true;
    return isCodeVisibleInWarehouse(code, w);
  });

  // Totali per codice (somma per sede, indipendente dal customer)
  const totByCode = new Map(); // codeLower -> {cerea:number, concamarise:number}
  for (const r of (Array.isArray(stockByWh) ? stockByWh : [])) {
    if (!r) continue;
    const code = String(r.code || "").trim();
    if (!code) continue;
    const low = code.toLowerCase();
    const ww = normalizeWarehouse(r.warehouse || "");
    const info = totByCode.get(low) || { cerea: 0, concamarise: 0 };
    const q = Number(r.qty);
    info[ww] += (Number.isFinite(q) ? q : 0);
    totByCode.set(low, info);
  }

  // Aggiungi placeholder per prodotti presenti in anagrafica ma senza movimenti
  const prodArr = Array.isArray(products) ? products : [];
  for (const p of prodArr) {
    const code = String(p.code || safeDecodeUri(p.id || "") || "").trim();
    if (!code) continue;

    // Se l’articolo non è abilitato su questa sede, non inserirlo qui
    if (!isCodeVisibleInWarehouse(code, w)) continue;
    const low = code.toLowerCase();
    const info = totByCode.get(low) || { cerea: 0, concamarise: 0 };
    const curQty = Number(info[w] || 0);
    const othQty = Number(info[other] || 0);

    const hasInRows = rows.some(r => String(r.code || "").trim().toLowerCase() === low);
    if (!hasInRows) {
      // Se entrambe le sedi sono a 0, vogliamo mostrarlo comunque in entrambe
      if (curQty === 0 && othQty === 0) {
        const name = String(p.name || code).trim();
        const cust = String(p.customer || "").trim();
        const itemK = movementKey(cust, code);
        rows.push({
          warehouse: w,
          customer: cust,
          code: code,
          item: name,
          uom: getUomResolvedForCode(code) || "",
          qty: 0,
          lastMoveAt: "",
          threshold: getThresholdForKey(itemK),
          __bothZero: true
        });
      }
    }
  }

  // Filtra: riga a 0 nella sede corrente MA altra sede >0 => nascondi
  const filtered = rows.filter(r => {
    const code = String(r.code || "").trim();
    if (!code) return true;
    const low = code.toLowerCase();
    const info = totByCode.get(low) || { cerea: 0, concamarise: 0 };
    const cur = Number(info[w] || 0);
    const oth = Number(info[other] || 0);
    const q = Number(r.qty) || 0;

    // Marca "both zero" anche per righe esistenti (net 0 su entrambe)
    if (cur === 0 && oth === 0) r.__bothZero = true;

    if (q !== 0) return true;
    if (oth > 0) return false;
    return true;
  });

  return filtered;
}

function getThresholdForKey(k) {
      // priorità: Firestore (realtime), poi local fallback
      const cloud = thresholds[k];
      const nCloud = Number(cloud);
      if (Number.isFinite(nCloud) && nCloud >= 0) return Math.floor(nCloud);

      const v = state.thresholds[k];
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);

      return Math.max(1000, Math.floor(Number(state.settings.lowThreshold) || 0));
    }

    async function setThresholdForKey(k, n) {
      const value = Math.max(0, Math.floor(Number(n) || 0));

      // realtime (Firestore)
      if (fb.user && fb.db) {
        try {
          thresholds[k] = value; // optimistic
          const ref = doc(fb.db, "orgs", ORG_ID, "thresholds", keyToDocId(k));
          await setDoc(ref, {
            value,
            updatedAt: serverTimestamp(),
            updatedBy: fb.user.email || fb.user.uid
          }, { merge: true });
          return;
        } catch (e) {
          console.warn("threshold write failed, fallback local", e);
        }
      }

      // local fallback
      state.thresholds[k] = value;
      saveLocalData();
    }


    async function clearThresholdForKey(k) {
      const key = String(k || "");
      if (!key) return;

      // realtime (Firestore)
      if (fb.user && fb.db) {
        try {
          delete thresholds[key]; // optimistic
          const ref = doc(fb.db, "orgs", ORG_ID, "thresholds", keyToDocId(key));
          await deleteDoc(ref);
          return;
        } catch (e) {
          console.warn("threshold delete failed, fallback local", e);
        }
      }

      // local fallback
      try { delete state.thresholds[key]; } catch(_){}
      saveLocalData();
    }



    // Aggiunge più movimenti in un colpo solo (utile per rettifiche su articoli unificati)
    async function addMovementsBatch(movements) {
      const list = (Array.isArray(movements) ? movements : []).filter(Boolean);
      if (!list.length) return;

      // realtime (Firestore)
      if (fb.user && fb.db) {
        let hadLocalFallback = false;
        for (const mv of list) {
          try {
            const payload = {
              type: mv.type || "IN",
              customer: mv.customer || "",
              code: mv.code || "",
              item: mv.item || "",
              uom: String(mv.uom || "").trim(),
              qtyRaw: String(mv.qtyRaw || "").trim(),
              qty: safeInt(mv.qty),
              date: mv.date || "",
              note: mv.note || "",
              source: mv.source || "Manual",
              rawText: mv.rawText || "",

              warehouse: normalizeWarehouse(mv.warehouse || ""),

              docType: mv.docType || "",
              docNum: mv.docNum || "",
              docDateRaw: mv.docDateRaw || "",
              lineIndex: safeInt(mv.lineIndex),
              docPages: __sanitizeDocPages(mv.docPages || mv.docImages),
              supplierVat: mv.supplierVat || "",
              docNumKey: mv.docNumKey || "",
              ddtTripletKey: mv.ddtTripletKey || "",
              createdAt: serverTimestamp(),
              createdBy: fb.user.email || fb.user.uid
            };
            await addDoc(orgCol("inventoryMovements"), payload);
          } catch (e) {
            console.error("movement batch write failed, fallback local", e);
            hadLocalFallback = true;
            showToast("Errore sync: salvo in locale", "warn");
            try { state.movements.push(mv); } catch(_){}
          }
        }
        if (hadLocalFallback) {
          try { saveLocalData(); renderAll(); } catch(_){}
        }
        return; // listener aggiorna UI per i movimenti scritti su cloud
      }

      // local fallback
      state.movements.push(...list);
      saveLocalData();
      renderAll();
    }

    async function addMovement(mv) {
      // realtime (Firestore)
      if (fb.user && fb.db) {
        try {
          const payload = {
            type: mv.type || "IN",
            customer: mv.customer || "",
            code: mv.code || "",
            item: mv.item || "",
            uom: String(mv.uom || "").trim(),
            qtyRaw: String(mv.qtyRaw || "").trim(),
            qty: safeInt(mv.qty),
            date: mv.date || "",
            note: mv.note || "",
            source: mv.source || "Manual",
            rawText: mv.rawText || "",

            warehouse: normalizeWarehouse(mv.warehouse || ""),

            docType: mv.docType || "",
docNum: mv.docNum || "",
docDateRaw: mv.docDateRaw || "",
lineIndex: safeInt(mv.lineIndex),
docPages: __sanitizeDocPages(mv.docPages || mv.docImages),
            supplierVat: mv.supplierVat || "",
            docNumKey: mv.docNumKey || "",
            ddtTripletKey: mv.ddtTripletKey || "",
            createdAt: serverTimestamp(),
            createdBy: fb.user.email || fb.user.uid
          };
          await addDoc(orgCol("inventoryMovements"), payload);
          return; // listener aggiorna UI
        } catch (e) {
          console.error("movement write failed, fallback local", e);
          showToast("Errore sync: salvo in locale");
        }
      }

      // local fallback
      state.movements.push(mv);
      saveLocalData();
      renderAll();
    }


async function deleteMovement(id) {
  if (!id) return;
  await deleteMovementsBulk([id]);
}

    function makeMovement(fields) {
  const f = (fields && typeof fields === "object") ? fields : {};
  const mv = {
    id: "mv_" + Date.now() + "_" + Math.random().toString(16).slice(2),
    type: f.type || "IN",
    customer: (f.customer || "").trim(),
    code: (f.code || "").trim(),
    item: (f.item || "").trim(),
    qty: safeInt(f.qty),
    date: f.date || todayYYYYMMDD(),
    note: (f.note || "").trim(),
    source: f.source || "Manual",
    rawText: f.rawText || "",
    warehouse: normalizeWarehouse(f.warehouse || ""),
    createdAt: nowIso()
  };

  // extras (doc meta, immagini, ecc.)
  const extras = Object.assign({}, f);
  delete extras.id; delete extras.createdAt;
  delete extras.type; delete extras.customer; delete extras.code; delete extras.item; delete extras.warehouse;
  delete extras.qty; delete extras.date; delete extras.note; delete extras.source; delete extras.rawText;

  for (const k of Object.keys(extras)) {
    if (extras[k] == null) continue;
    mv[k] = extras[k];
  }

  // normalize docPages / legacy docImages
  if (Array.isArray(mv.docPages) || Array.isArray(mv.docImages)) {
    mv.docPages = __sanitizeDocPages(mv.docPages || mv.docImages);
    delete mv.docImages;
  }

  // normalize lineIndex
  if (mv.lineIndex != null) mv.lineIndex = safeInt(mv.lineIndex);

  return mv;
}

    /****************************************************************
     * Rendering
     ****************************************************************/
    // ===== Cockpit: contatori animati (0 → valore reale) =====
    const __counterAnim = (() => {
      const wm = new WeakMap();

      const prefersReducedMotion = () => {
        try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
        catch (_) { return false; }
      };

      const easeOutCubic = (t) => (1 - Math.pow(1 - t, 3));
      const fmt = (n) => (Number(n) || 0).toLocaleString("it-IT");

      function setNow(el, n) {
        if (!el) return;
        el.textContent = fmt(n);
      }

      function animate(el, target, opts) {
        if (!el) return;

        const to = Number(target);
        const end = Number.isFinite(to) ? to : 0;

        const endInt = Math.max(0, Math.round(end));
        const key = String(endInt);

        if (prefersReducedMotion()) {
          el.dataset.animTarget = key;
          el.dataset.animPlayed = "1";
          setNow(el, endInt);
          return;
        }

        if (el.dataset.animTarget === key && el.dataset.animPlayed === "1") {
          setNow(el, endInt);
          return;
        }

        el.dataset.animTarget = key;
        el.dataset.animPlayed = "1";

        try {
          const prev = wm.get(el);
          if (prev && typeof prev.cancel === "function") prev.cancel();
        } catch (_) {}

        const duration = Math.max(300, Math.floor((opts && opts.duration) || 950));

        const from = 0;
        setNow(el, from);
        if (endInt === 0) return;

        const t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

        let raf = 0;
        const tick = (now) => {
          const t1 = (typeof now === "number") ? now : ((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now());
          const p = Math.min(1, (t1 - t0) / duration);
          const v = Math.round(from + (endInt - from) * easeOutCubic(p));
          el.textContent = fmt(v);
          if (p < 1) raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        wm.set(el, { cancel: () => { try { cancelAnimationFrame(raf); } catch (_) {} } });
      }

      return { animate, setNow };
    })();

    function renderStats(stockArr) {
      const items = stockArr.length;
      const totalPieces = stockArr.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);

      const low = stockArr.filter(x => {
        const q = (Number(x.qty) || 0);
        const t = (Number(x.threshold) || 0);
        return q > 0 && t > 0 && q < t;
      }).length;
      const last = state.movements.slice().sort((a,b) => String(b.createdAt||"").localeCompare(String(a.createdAt||"")))[0];

      __counterAnim.animate(statTotalItems, items);
      __counterAnim.animate(statTotalPieces, totalPieces);
      // Flussi (cockpit) = numero documenti (DDT) caricati, non numero righe/articoli
      let docsCount = 0;
      try {
        if (Array.isArray(__docGroups)) {
          docsCount = __docGroups.length;
        } else if (typeof buildDocGroupsFromMovements === "function") {
          const out = buildDocGroupsFromMovements(state.movements);
          docsCount = (out && Array.isArray(out.list)) ? out.list.length : 0;
        }
      } catch (e) { docsCount = 0; }

      if (typeof statTotalFlows !== "undefined" && statTotalFlows) __counterAnim.animate(statTotalFlows, docsCount);
      __counterAnim.animate(statLowStock, low);
      statLastUpdate.textContent = last ? formatDateIT(last.createdAt) : "—";
    }



    function renderLowStockBoard(stockByWh) {
      try {
        if (!lowStockBoard || !lowStockListCerea || !lowStockListConca) return;

        const arr0 = Array.isArray(stockByWh) ? stockByWh : [];
        const arr = groupStockRowsByAlias(arr0);

        const isLow = (r) => {
        const q = (Number(r && r.qty) || 0);
        const t = (Number(r && r.threshold) || 0);
        return q > 0 && t > 0 && q < t;
      };

        const cerea = arr.filter(r => normalizeWarehouse(r.warehouse) === WAREHOUSE_CEREA && isLow(r));
        const conca = arr.filter(r => normalizeWarehouse(r.warehouse) === WAREHOUSE_CONCA && isLow(r));

        const sortFn = (a, b) => (Number(a && a.qty) || 0) - (Number(b && b.qty) || 0);
        cerea.sort(sortFn);
        conca.sort(sortFn);

        if (lowStockCountCerea) lowStockCountCerea.textContent = String(cerea.length);
        if (lowStockCountConca) lowStockCountConca.textContent = String(conca.length);

        const fmt = (n) => (Number(n) || 0).toLocaleString("it-IT");
        const maxShow = 12;

        const renderList = (list, el) => {
          if (!el) return;
          if (!list.length) {
            el.innerHTML = '<div class="td-muted">Nessun articolo sotto scorta.</div>';
            return;
          }

          const show = list.slice(0, maxShow);
          const more = list.length - show.length;

          el.innerHTML = show.map(r => {
            const code = escapeHtml(r.__displayCode || r.code || "");
            const item = escapeHtml(r.item || "");
            const cust = escapeHtml(r.customer || "");
            const qty = fmt(safeInt(r.qty));
            const thr = fmt(safeInt(r.threshold));

            return `
              <div class="lowStockItem">
                <div class="lowStockItemMain">
                  <div class="lowStockCode">${code || "—"}</div>
                  <div class="lowStockName">${item || "—"}</div>
                  ${cust ? `<div class="lowStockMeta">${cust}</div>` : ``}
                </div>
                <div class="lowStockQty">
                  <div class="n">${qty}</div>
                  <div class="t">soglia ${thr}</div>
                </div>
              </div>
            `;
          }).join("") + (more > 0 ? `<div class="td-muted">+${more} altri…</div>` : "");
        };

        renderList(cerea, lowStockListCerea);
        renderList(conca, lowStockListConca);
      } catch (e) {
        console.warn("renderLowStockBoard failed", e);
      }
    }

    function __isHexColor(v){
      const s = String(v || "").trim();
      return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
    }

    // Dashboard: riquadro "Categorie" (pezzi per categoria) — Inventario Cerea
    function renderCategoryBoardCerea(stockByWh){
      try{
        if (!categoryListCerea || !categoryTotalCerea) return;

        const rows = Array.isArray(stockByWh) ? stockByWh : [];
        const codeTotals = new Map(); // codeLower -> qty

        for (const r of rows){
          if (!r) continue;
          if (normalizeWarehouse(r.warehouse || "") !== WAREHOUSE_CEREA) continue;
          const code = String(r.code || "").trim();
          if (!code) continue;
          const low = code.toLowerCase();
          const q = safeInt(r.qty);
          codeTotals.set(low, (codeTotals.get(low) || 0) + q);
        }

        const catTotals = new Map(); // catKey -> qty (clamped >=0)
        for (const [codeLow, qtyRaw] of codeTotals.entries()){
          const catKeyRaw = (typeof getMacroCategoryForCode === "function") ? getMacroCategoryForCode(codeLow) : "";
          const catKey = String(catKeyRaw || "").trim().toLowerCase() || "non_classificati";
          const qty = Math.max(0, Number(qtyRaw) || 0);
          if (qty <= 0) continue; // evita categorie "0" che sporcano il widget
          catTotals.set(catKey, (catTotals.get(catKey) || 0) + qty);
        }

        const list = Array.from(catTotals.entries()).map(([key, qty]) => {
          const name = (typeof macroCatLabel === "function") ? (macroCatLabel(key) || key) : key;
          const color = (typeof macroCatColor === "function") ? (macroCatColor(key) || "") : "";
          return { key, name, color, qty: Number(qty) || 0 };
        }).sort((a,b) => (Number(b.qty)||0) - (Number(a.qty)||0));

        const total = list.reduce((s, x) => s + (Number(x.qty)||0), 0);
        categoryTotalCerea.textContent = total ? Number(total).toLocaleString("it-IT") : "0";

        if (!list.length){
          categoryListCerea.innerHTML = '<div class="categoryPlaceholder">Nessuna categoria disponibile</div>';
          return;
        }

        const max = Math.max(1, ...list.map(x => Math.max(0, Number(x.qty) || 0)));
        categoryListCerea.innerHTML = list.map(item => {
          const pct = Math.max(0, Math.min(100, Math.round((Math.max(0, Number(item.qty)||0) / max) * 100)));
          const col = __isHexColor(item.color) ? item.color : "";
          const fillStyle = col ? `background:${escapeHtmlAttr(col)};` : "";
          return `
            <div class="categoryRow">
              <div class="categoryTrack">
                <div class="categoryFill" data-pct="${pct}" style="width:0%; ${fillStyle}"></div>
                <div class="categoryContent">
                  <div class="categoryName">${escapeHtml(item.name || item.key || "")}</div>
                  <div class="categoryValue">${Number(item.qty||0).toLocaleString("it-IT")}</div>
                </div>
              </div>
            </div>
          `;
        }).join("");

        if (__invTrendPrefersReducedMotion()) return;
        try {
          const fills = Array.from(categoryListCerea.querySelectorAll(".categoryFill"));
          requestAnimationFrame(() => {
            fills.forEach(fill => {
              const pct = String(fill.getAttribute("data-pct") || "0");
              fill.style.width = pct + "%";
            });
          });
        } catch (_) {}
      }catch(e){
        console.warn("renderCategoryBoardCerea failed", e);
      }
    }




    // ===== Dashboard: Andamento inventario (totale pezzi nel tempo) =====
    let __invTrendRange = "30";           // "7" | "30" | "90" | "all"
    let __invTrendDidBind = false;
    let __invTrendSvgBound = false;
    let __invTrendActivePoints = [];      // [{day,value,x,y}]
    let __invTrendActiveIdx = -1;

    function __invTrendPrefersReducedMotion(){
      try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
      catch(_) { return false; }
    }

    function __invTrendPad2(n){ return String(n).padStart(2, "0"); }
    function __invTrendTodayISO(){
      const d = new Date();
      return `${d.getFullYear()}-${__invTrendPad2(d.getMonth()+1)}-${__invTrendPad2(d.getDate())}`;
    }
    function __invTrendAddDays(iso, delta){
      const d = new Date(String(iso || "") + "T00:00:00");
      if (Number.isNaN(d.getTime())) return "";
      d.setDate(d.getDate() + (Number(delta) || 0));
      return `${d.getFullYear()}-${__invTrendPad2(d.getMonth()+1)}-${__invTrendPad2(d.getDate())}`;
    }
    function __invTrendFmtDateShort(iso){
      try{
        const d = new Date(String(iso || "") + "T00:00:00");
        if (Number.isNaN(d.getTime())) return String(iso || "");
        return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
      }catch(_){ return String(iso || ""); }
    }

    function __invTrendGetMvDay(mv){
      let d = String((mv && mv.date) || "").trim();
      if (!d || d.length < 10){
        const ca = String((mv && mv.createdAt) || "").trim();
        if (ca && ca.length >= 10) d = ca.slice(0, 10);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
      return d;
    }

    function __initInvTrendUI(){
      if (__invTrendDidBind) return;
      __invTrendDidBind = true;

      // range persist (localStorage)
      try{
        const saved = String(localStorage.getItem("invTrendRange") || "").trim();
        if (saved && ["7","30","90","all"].includes(saved)) __invTrendRange = saved;
      }catch(_){}

      if (invTrendRanges){
        invTrendRanges.addEventListener("click", (e) => {
          const btn = e.target && e.target.closest ? e.target.closest("button[data-range]") : null;
          if (!btn) return;
          const r = String(btn.getAttribute("data-range") || "").trim();
          if (!["7","30","90","all"].includes(r)) return;
          __invTrendRange = r;
          try{ localStorage.setItem("invTrendRange", r); }catch(_){}
          renderInventoryTrend(); // redraw now
        });
      }

      // Bind tooltip tracking once
      __bindInvTrendSvg();
    }

    function __setInvTrendActiveBtn(){
      if (!invTrendRanges) return;
      const btns = invTrendRanges.querySelectorAll("button[data-range]");
      btns.forEach(b => {
        const r = String(b.getAttribute("data-range") || "").trim();
        b.classList.toggle("is-active", r === __invTrendRange);
      });
    }

    function __buildInvTrendSeries(movements, range){
      const movs = Array.isArray(movements) ? movements : [];

      // delta per giorno
      const deltaByDay = new Map(); // day -> signed int
      let minDay = "";
      let maxDay = "";

      for (const mv of movs){
        const day = __invTrendGetMvDay(mv);
        if (!day) continue;
        const q = safeInt(mv.qty);
        const sign = String(mv.type || "").toUpperCase() === "OUT" ? -1 : 1;
        const delta = sign * q;
        if (!delta) continue;

        deltaByDay.set(day, (deltaByDay.get(day) || 0) + delta);

        if (!minDay || day < minDay) minDay = day;
        if (!maxDay || day > maxDay) maxDay = day;
      }

      const today = __invTrendTodayISO();
      let endDay = maxDay || today;
      if (today && today > endDay) endDay = today;

      if (!minDay) minDay = endDay;

      let startDay = minDay;
      if (String(range) !== "all"){
        const n = Math.max(1, safeInt(range));
        const wantStart = __invTrendAddDays(endDay, -(n-1));
        if (wantStart && wantStart > startDay) startDay = wantStart;
      }

      // baseline = somma delta dei giorni < startDay
      let base = 0;
      if (deltaByDay.size){
        const daysSorted = Array.from(deltaByDay.keys()).sort((a,b) => a.localeCompare(b));
        for (const d of daysSorted){
          if (d < startDay) base += (deltaByDay.get(d) || 0);
          else break;
        }
      }

      // serie giornaliera (con carry)
      const points = [];
      let level = base;
      let guard = 0;
      for (let d = startDay; d <= endDay && guard < 6000; d = __invTrendAddDays(d, 1), guard++){
        level += (deltaByDay.get(d) || 0);
        points.push({ day: d, value: level });
      }

      // se per qualche motivo è vuota
      if (!points.length){
        points.push({ day: endDay, value: 0 });
      }

      // downsample (tutto) per evitare troppo carico su SVG
      const MAX_PTS = 220;
      if (points.length > MAX_PTS){
        const step = Math.ceil(points.length / MAX_PTS);
        const out = [];
        for (let i = 0; i < points.length; i += step) out.push(points[i]);
        if (out[out.length - 1] !== points[points.length - 1]) out.push(points[points.length - 1]);
        return out;
      }

      return points;
    }

    function __bindInvTrendSvg(){
      if (__invTrendSvgBound) return;
      if (!invTrendChart) return;
      __invTrendSvgBound = true;

      const onMove = (clientX, clientY) => {
        if (!invTrendChart || !invTrendTooltip) return;
        const pts = Array.isArray(__invTrendActivePoints) ? __invTrendActivePoints : [];
        if (!pts.length) return;

        const rect = invTrendChart.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const px = Math.max(0, Math.min(rect.width, (clientX - rect.left)));
        const t = rect.width ? (px / rect.width) : 0;
        const idx = Math.max(0, Math.min(pts.length - 1, Math.round(t * (pts.length - 1))));
        __invTrendActiveIdx = idx;

        const p = pts[idx];
        if (!p) return;

        // focus dot
        try{
          const dot = invTrendChart.querySelector("circle.trendDotFocus");
          if (dot){
            dot.setAttribute("cx", String(p.x));
            dot.setAttribute("cy", String(p.y));
            dot.style.opacity = "1";
          }
        }catch(_){}

        // tooltip position in px
        const xPx = (p.x / 480) * rect.width;
        const yPx = (p.y / 180) * rect.height;

        const valTxt = Number(p.value || 0).toLocaleString("it-IT");
        const dateTxt = __invTrendFmtDateShort(p.day);
        invTrendTooltip.textContent = `${valTxt} • ${dateTxt}`;
        invTrendTooltip.style.left = `${xPx}px`;
        invTrendTooltip.style.top = `${yPx}px`;
        invTrendTooltip.classList.add("is-visible");
        invTrendTooltip.setAttribute("aria-hidden", "false");
      };

      const hide = () => {
        if (!invTrendTooltip) return;
        invTrendTooltip.classList.remove("is-visible");
        invTrendTooltip.setAttribute("aria-hidden", "true");
        try{
          const dot = invTrendChart && invTrendChart.querySelector ? invTrendChart.querySelector("circle.trendDotFocus") : null;
          if (dot) dot.style.opacity = "0";
        }catch(_){}
      };

      invTrendChart.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
      invTrendChart.addEventListener("mouseleave", hide);
      invTrendChart.addEventListener("touchstart", (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        onMove(t.clientX, t.clientY);
      }, { passive: true });
      invTrendChart.addEventListener("touchmove", (e) => {
        const t = e.touches && e.touches[0];
        if (!t) return;
        onMove(t.clientX, t.clientY);
      }, { passive: true });
      invTrendChart.addEventListener("touchend", hide);
      invTrendChart.addEventListener("touchcancel", hide);
    }

    function __renderInvTrendSvg(points){
      if (!invTrendChart) return;

      const ptsIn = Array.isArray(points) ? points : [];
      const pts = ptsIn.length ? ptsIn.slice() : [{ day: __invTrendTodayISO(), value: 0 }];

      // Ensure at least 2 points for a line
      if (pts.length === 1){
        pts.push({ day: pts[0].day, value: pts[0].value });
      }

      // viewbox dims
      const W = 480, H = 180;
      const padX = 14, padTop = 12, padBot = 16;

      const values = pts.map(p => Number(p.value) || 0);
      let vMin = Math.min(...values);
      let vMax = Math.max(...values);
      if (vMin === vMax){ vMin -= 1; vMax += 1; }

      // a little breathing room
      const span = Math.max(1, vMax - vMin);
      const extra = span * 0.08;
      vMin -= extra; vMax += extra;

      const xStep = (W - padX*2) / Math.max(1, (pts.length - 1));
      const ySpan = Math.max(1e-9, (vMax - vMin));

      const toY = (v) => {
        const t = (vMax - v) / ySpan;
        return padTop + t * (H - padTop - padBot);
      };

      // Compute final points (with x/y)
      __invTrendActivePoints = pts.map((p, i) => {
        const x = padX + xStep * i;
        const y = toY(Number(p.value) || 0);
        return { day: p.day, value: Number(p.value) || 0, x, y };
      });

      const buildSmoothPath = (pointsIn) => {
        if (!pointsIn || pointsIn.length === 0) return "";
        if (pointsIn.length === 1){
          return `M${pointsIn[0].x.toFixed(2)} ${pointsIn[0].y.toFixed(2)}`;
        }
        let d = `M${pointsIn[0].x.toFixed(2)} ${pointsIn[0].y.toFixed(2)}`;
        for (let i = 0; i < pointsIn.length - 1; i++){
          const p0 = pointsIn[i - 1] || pointsIn[i];
          const p1 = pointsIn[i];
          const p2 = pointsIn[i + 1];
          const p3 = pointsIn[i + 2] || p2;
          const c1x = p1.x + (p2.x - p0.x) / 6;
          const c1y = p1.y + (p2.y - p0.y) / 6;
          const c2x = p2.x - (p3.x - p1.x) / 6;
          const c2y = p2.y - (p3.y - p1.y) / 6;
          d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
        }
        return d;
      };

      // Grid
      const gridLines = [];
      const gCount = 4;
      for (let i = 1; i <= gCount; i++){
        const y = padTop + (i/(gCount+1)) * (H - padTop - padBot);
        gridLines.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${W}" y2="${y.toFixed(2)}"></line>`);
      }

      // Path
      const d = buildSmoothPath(__invTrendActivePoints);
      const last = __invTrendActivePoints[__invTrendActivePoints.length - 1];

      invTrendChart.innerHTML = `
        <g class="trendGrid">${gridLines.join("")}</g>
        <path class="trendLine" d="${d}"></path>
        <circle class="trendDot" cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="4.2"></circle>
        <circle class="trendDot trendDotFocus" cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="5.0" style="opacity:0;"></circle>
      `;

      // Animate line draw (only if motion allowed)
      try{
        if (__invTrendPrefersReducedMotion()) return;
        const path = invTrendChart.querySelector("path.trendLine");
        if (!path || !path.getTotalLength) return;
        const len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
        // force layout
        path.getBoundingClientRect();
        path.classList.add("animate");
      }catch(_){}
    }

    function renderInventoryTrend(stockArrMaybe){
      try{
        if (!invTrendChart || !invTrendTotal) return;

        __initInvTrendUI();
        __setInvTrendActiveBtn();

        // Totale = pezzi totali attuali (come cockpit)
        const stockArr = Array.isArray(stockArrMaybe) ? stockArrMaybe : (typeof computeStock === "function" ? computeStock() : []);
        const total = (stockArr || []).reduce((s, x) => s + (Number(x && x.qty) || 0), 0);
        invTrendTotal.textContent = Number(total || 0).toLocaleString("it-IT");

        const series = __buildInvTrendSeries(state && state.movements, __invTrendRange);
        __renderInvTrendSvg(series);
      }catch(e){
        console.warn("renderInventoryTrend failed", e);
      }
    }




    function renderCustomerOptions(stockArr) {
      const customers = Array.from(new Set(stockArr.map(x => x.customer).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
      const current = filterCustomer.value;
      filterCustomer.innerHTML = '<option value="">Tutti</option>' + customers.map(c => `<option value="${escapeHtmlAttr(c)}">${escapeHtml(c)}</option>`).join("");
      if (customers.includes(current)) filterCustomer.value = current;
    }

    function escapeHtml(s) {
      return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
    }
    function escapeHtmlAttr(s) {
      return escapeHtml(s).replace(/\n/g, " ");
    }


    /****************************************************************
     * Documenti (DDT) derivati dai movimenti — grouping (frontend)
     ****************************************************************/
    let __docGroups = [];
    let __docGroupsMap = new Map();

    function formatDateOnlyIT(isoDate) {
      const d = new Date(String(isoDate || "").trim());
      if (!isoDate) return "";
      if (Number.isNaN(d.getTime())) return String(isoDate);
      return d.toLocaleDateString("it-IT");
    }

    function extractDocNumber(note) {
      const raw = String(note || "");
      const s = raw.toUpperCase();

      // Remove dates to avoid confusing day/month with a doc number
      const noDates = s.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, " ");

      const clean = (v) => String(v || "").trim().replace(/\s+/g, "");

      // Support: DDT 1756, DDT n. 1756, DDT 1.756, DDT 1.756/23
      let m = noDates.match(/\b(?:DDT|D\.?D\.?T\.?|DOCUMENTO\s+DI\s+TRASPORTO)\b[^0-9]{0,18}((?:\d{1,3}(?:[\.\s]\d{3})*|\d{4,10})(?:[\/\-]\d{1,6})?)\b/);
      if (m && m[1]) return clean(m[1]);

      m = noDates.match(/\b(?:N\.?|N°|NR\.?|NUM\.?|NUMERO)\s*[:\-]?\s*((?:\d{1,3}(?:[\.\s]\d{3})*|\d{3,10})(?:[\/\-]\d{1,6})?)\b/);
      if (m && m[1]) return clean(m[1]);

      // Fallback: take a "real-looking" number (prefer long or dotted thousands)
      m = noDates.match(/\b(\d{1,3}(?:[\.\s]\d{3})+|\d{4,10})\b/);
      return (m && m[1]) ? clean(m[1]) : "";
    }




    /****************************************************************
     * Anti-duplicato DDT (regola rigida):
     * stesso numero DDT + stessa P.IVA + stessa data => NON si può ricaricare
     ****************************************************************/
    function __docNumToKey(v){
      const raw = String(v || "").toUpperCase().trim();
      if (!raw) return "";
      // Rimuove spazi e qualsiasi carattere non alfanumerico
      // Esempi: "1.756" -> "1756", "1756/23" -> "175623"
      let k = raw.replace(/\s+/g,"").replace(/[^A-Z0-9]/g,"");
      // Se è solo numerico, normalizza zeri iniziali (001756 -> 1756)
      if (/^\d+$/.test(k)) k = k.replace(/^0+(?=\d)/, "");
      return k;
    }

    function __buildDdtTripletKey(vatNorm, docNumKey, dateISO){
      const v = String(vatNorm || "").trim();
      const n = String(docNumKey || "").trim();
      const d = String(dateISO || "").trim();
      if (!v || !n || !d) return "";
      return [v, n, d].join("|");
    }

        function __findSupplierByVat(vatNorm){
      const v = __sup_cleanVat(vatNorm);
      if (!v) return null;
      const list = Array.isArray(suppliers) ? suppliers : [];
      for (const s of list){
        if (!s) continue;
        const sv = __sup_cleanVat(s.vat || s.vatNumber || s.piva || s.partitaIva || "");
        if (sv && sv === v) return s;
      }
      return null;
    }

    function __findSupplierNameByVat(vatNorm){
      const s = __findSupplierByVat(vatNorm);
      return s && s.name ? String(s.name).trim() : "";
    }

    function __extractVatFromText(raw){
      const t = String(raw || "");
      if (!t) return "";
      // preferenze: pattern espliciti P.IVA / PARTITA IVA / VAT
      const patterns = [
        /\bP\.?\s*I\.?\s*V\.?\s*A\.?\s*[:\s]*([0-9]{11})\b/i,
        /\bPARTITA\s+IVA\s*[:\s]*([0-9]{11})\b/i,
        /\bVAT\s*(?:ID)?\s*[:\s]*([0-9]{11})\b/i
      ];
      for (const re of patterns){
        const m = t.match(re);
        if (m && m[1]) {
          const v = __sup_cleanVat(m[1]);
          if (v) return v;
        }
      }
      // fallback (più rischioso): prendi 11 cifre SOLO se vicine a "IVA"
      const m2 = t.match(/\bIVA\b[\s\S]{0,25}\b([0-9]{11})\b/i);
      if (m2 && m2[1]) {
        const v = __sup_cleanVat(m2[1]);
        if (v) return v;
      }
      return "";
    }

    function __resolveVatFromDocOrCustomer(doc, customer){
      // 1) Preferisci VAT dal documento (più affidabile)
      try {
        const sup = (doc && typeof doc === "object") ? (doc.supplier || doc.__supplier || {}) : {};
        const cand = sup.vatNumber || sup.vat || sup.partitaIva || sup.piva || sup.vatId || "";
        const v1 = __sup_cleanVat(cand);
        if (v1) return v1;
      } catch(_) {}

      // 1b) Prova a estrarre da testo OCR (grezzo) se presente
      try {
        const raw = String((doc && (doc.rawText || doc.__rawText || "")) || "") || String(capture && capture.rawText || "");
        const vTxt = __extractVatFromText(raw);
        if (vTxt) return vTxt;
      } catch(_) {}

      // 2) Fallback: usa anagrafica fornitori già salvata (match per nome)
      try {
        const name = String(customer || "").trim();
        if (!name) return "";
        const list = Array.isArray(suppliers) ? suppliers : [];
        for (const s of list) {
          if (!s) continue;
          if (supplierMatchesCustomer(s, name)) {
            const v2 = __sup_cleanVat(s.vat || s.vatNumber || s.piva || s.partitaIva || "");
            if (v2) return v2;
          }
        }
      } catch(_) {}

      return "";
    }



    function __buildSupplierDetailsFromDoc(doc, customerName, vatNorm){
      const d = (doc && typeof doc === "object") ? doc : {};
      const sup = (d.supplier || d.__supplier || {}) || {};
      const name = String(customerName || "").trim();

      const cf = __sup_cleanFiscalCode(sup.taxCode || sup.fiscalCode || sup.cf || sup.codiceFiscale || "");

      const details = {
        name: name,
        vat: __sup_cleanVat(vatNorm || sup.vatNumber || sup.vat || sup.piva || ""),
        fiscalCode: cf || "",
        address: sup.address || "",
        cap: sup.postalCode || sup.cap || "",
        city: sup.city || "",
        province: sup.province || "",
        country: sup.country || "",
        phone: sup.phone || "",
        mobile: sup.mobile || "",
        email: sup.email || "",
        pec: sup.pec || ""
      };

      // se abbiamo già un fornitore per P.IVA, forza il nome "canonico" (non sovrascrivere con OCR sporco)
      try{
        const byVat = __findSupplierByVat(details.vat);
        if (byVat && byVat.name) details.name = String(byVat.name).trim() || details.name;
      }catch(_){}

      return details;
    }

function __findExistingDocGroupByTriplet(vatNorm, docNumKey, dateISO){
      try { rebuildDocGroupsCache(); } catch(_) {}
      const v = String(vatNorm || "").trim();
      const n = String(docNumKey || "").trim();
      const d = String(dateISO || "").trim();
      if (!v || !n || !d) return null;

      const groups = Array.isArray(__docGroups) ? __docGroups : [];
      for (const g of groups) {
        if (!g) continue;
        if (String(g.date || "").trim() !== d) continue;
        const gNumKey = __docNumToKey(g.docNum || extractDocNumber(g.note));
        if (!gNumKey || gNumKey !== n) continue;

        const gv = __resolveVatFromDocOrCustomer(null, g.customer);
        if (gv && gv === v) return g;
      }
      return null;
    }

    function __hasTripletInMovements(tripletKey){
      const key = String(tripletKey || "").trim();
      if (!key) return false;
      const arr = Array.isArray(state.movements) ? state.movements : [];
      return arr.some(mv => String(mv?.ddtTripletKey || mv?.ddtKey || "").trim() === key);
    }

    async function __reserveDocTripletKey(tripletKey, meta){
      // Usa una "index collection" per bloccare i doppi upload anche cross-device.
      // Best effort: se non abbiamo Firestore o permessi, torniamo true e ci affidiamo al check locale.
      const key = String(tripletKey || "").trim();
      if (!key) return true;
      if (!fb.user || !fb.db) return true;

      try {
        const ref = doc(fb.db, "orgs", ORG_ID, "inventoryDocIndex", keyToDocId(key));

        await runTransaction(fb.db, async (tx) => {
          const snap = await tx.get(ref);
          if (snap.exists()) {
            const err = new Error("DUPLICATE_DDT");
            err.code = "DUPLICATE_DDT";
            throw err;
          }
          const m = (meta && typeof meta === "object") ? meta : {};
          tx.set(ref, {
            key,
            vat: String(m.vatNorm || ""),
            docNum: String(m.docNumResolved || ""),
            date: String(m.dateISO || ""),
            customer: String(m.customer || ""),
            createdAt: serverTimestamp(),
            createdBy: fb.user.email || fb.user.uid
          });
        });

        return true;
      } catch (e) {
        const msg = String(e?.code || e?.message || e || "");
        if (msg.includes("DUPLICATE_DDT")) return false;
        console.warn("reserveDocTripletKey failed (ignored)", e);
        return true;
      }
    }

    async function __releaseDocTripletKey(tripletKey){
      const key = String(tripletKey || "").trim();
      if (!key) return;
      if (!fb.user || !fb.db) return;
      try {
        await deleteDoc(doc(fb.db, "orgs", ORG_ID, "inventoryDocIndex", keyToDocId(key)));
      } catch (e) {
        console.warn("releaseDocTripletKey failed (ignored)", e);
      }
    }

    async function __checkDuplicateDdtBeforeUpload(ctx){
      const c = (ctx && typeof ctx === "object") ? ctx : {};
      const tripletKey = String(c.ddtTripletKey || "").trim();

      // 1) Se ho la tripla (VAT+NUM+DATA), check super rigido
      if (tripletKey) {
        if (__hasTripletInMovements(tripletKey)) return { duplicate: true, reason: "triplet" };
        const g = __findExistingDocGroupByTriplet(c.vatNorm, c.docNumKey, c.dateISO);
        if (g) return { duplicate: true, reason: "triplet" };
      }

      // 2) Fallback: blocca comunque se esiste già lo stesso docKey (stesso fornitore+data+numero/nota)
      try { rebuildDocGroupsCache(); } catch(_) {}
      if (__docGroupsMap && c.docKey && __docGroupsMap.get(c.docKey)) return { duplicate: true, reason: "docKey" };

      // 3) Extra fallback: stesso fornitore (normalizzato) + stessa data + stesso numero (normalizzato)
      const custKey = normSupplierKey(c.customer || "");
      const dateISO = String(c.dateISO || "").trim();
      const numKey = String(c.docNumKey || "").trim();
      if (custKey && dateISO && numKey) {
        const groups = Array.isArray(__docGroups) ? __docGroups : [];
        const hit = groups.find(g => (
          normSupplierKey(g?.customer || "") === custKey &&
          String(g?.date || "").trim() === dateISO &&
          __docNumToKey(g?.docNum || extractDocNumber(g?.note)) === numKey
        ));
        if (hit) return { duplicate: true, reason: "meta" };
      }

      return { duplicate: false };
    }

function buildDocGroupsFromMovements(movements) {
      const groups = new Map();

      (Array.isArray(movements) ? movements : []).forEach((mv) => {
        const source = String(mv.source || "");
        const note = String(mv.note || "").trim();
        // Considera "documento caricato" soprattutto gli OCR, o quando c'è una nota con tipo/numero/data
        const isDocLike = (source.toUpperCase() === "OCR") || /\bDDT\b|DOCUMENTO|TRASPORTO|BOLLA|FATTURA/i.test(note);
        if (!isDocLike) return;

        const vatKey = __sup_cleanVat(mv.supplierVat || mv.vat || "");
        const docNumKey = String(mv.docNum || "").trim().toLowerCase();

        // Key stabile: se ho P.IVA uso quella (così nomi OCR diversi non spezzano il collegamento)
        const customerKey = vatKey ? ("vat_" + vatKey) : String(mv.customer || "").trim().toLowerCase();

        const key = [
          customerKey,
          String(mv.date || "").trim(),
          (docNumKey || note.toLowerCase()),
          source.toLowerCase()
        ].join("|");

        // Customer display: se ho P.IVA e ho un fornitore salvato, uso il nome "canonico"
        let customerDisplay = mv.customer || "";
        try{
          if (vatKey) {
            const nm = __findSupplierNameByVat(vatKey);
            if (nm) customerDisplay = nm;
          }
        }catch(_){}

        const g = groups.get(key) || {
          key,
          customer: customerDisplay,
          supplierVat: vatKey || "",
          date: mv.date || "",
          note,
          source,
          docNum: (String(mv.docNum || "").trim() || extractDocNumber(note)),
          createdAtMax: "",
          movements: []
        };

        // Mantieni supplierVat (se arriva successivamente su righe vecchie)
        if (!g.supplierVat && vatKey) g.supplierVat = vatKey;

        // Mantieni customer display "canonico" se disponibile
        if (vatKey) {
          const nm2 = __findSupplierNameByVat(vatKey);
          if (nm2) g.customer = nm2;
        }

        g.movements.push(mv);

        const cAt = String(mv.createdAt || "");
        if (!g.createdAtMax || cAt.localeCompare(g.createdAtMax) > 0) g.createdAtMax = cAt;

        groups.set(key, g);
      });

      const list = Array.from(groups.values())
        .sort((a, b) => String(b.createdAtMax || "").localeCompare(String(a.createdAtMax || "")));

      const map = new Map(list.map(g => [g.key, g]));
      return { list, map };
    }




// ===== Doc groups cache (needed by renderAll + duplicate checks) =====
function rebuildDocGroupsCache(){
  try{
    const movs = (() => {
      try { return (state && Array.isArray(state.movements)) ? state.movements : []; }
      catch(e){ return []; }
    })();
    const out = (typeof buildDocGroupsFromMovements === "function")
      ? buildDocGroupsFromMovements(movs)
      : { list: [], map: new Map() };
    __docGroups = (out && Array.isArray(out.list)) ? out.list : [];
    __docGroupsMap = (out && out.map instanceof Map) ? out.map : new Map();
  }catch(e){
    __docGroups = [];
    __docGroupsMap = new Map();
  }
}

// ===== Stable docKey from meta (used during OCR confirm) =====
function docKeyFromMeta(meta){
  const m = (meta && typeof meta === "object") ? meta : {};
  const customer = String(m.customer || "").trim();
  const date = String(m.date || m.dateISO || "").trim();
  const source = String(m.source || "OCR").trim() || "OCR";
  const note = String(m.note || "").trim();
  const docNum = String(m.docNum || "").trim();

  // Try to resolve VAT for stable grouping (best effort)
  let vatNorm = "";
  try { vatNorm = String(m.vatNorm || "").trim(); } catch(_){}
  if (!vatNorm) {
    // From customer string (e.g. "Fornitore 12345678901" or "IT12345678901")
    const compact = customer.replace(/\s+/g, "");
    const mm = compact.match(/\b(?:IT)?(\d{11})\b/i);
    if (mm && mm[1]) {
      try { vatNorm = __sup_cleanVat(mm[1]); } catch(_){}
    }
  }
  if (!vatNorm) {
    // From suppliers registry by name match
    try{
      const list = Array.isArray(suppliers) ? suppliers : [];
      for (const s of list) {
        if (!s) continue;
        if (supplierMatchesCustomer(s, customer)) {
          const v = __sup_cleanVat(s.vat || s.vatNumber || s.piva || s.partitaIva || "");
          if (v) { vatNorm = v; break; }
        }
      }
    }catch(_){}
  }

  const customerKey = vatNorm ? ("vat_" + vatNorm) : customer.toLowerCase();
  const docNumKey = (typeof __docNumToKey === "function") ? __docNumToKey(docNum || extractDocNumber(note)) : String(docNum || "").trim();
  const keyPart = docNumKey || note.toLowerCase();

  return [customerKey, date, keyPart, source.toLowerCase()].join("|");
}



/****************************************************************
 * Local doc pages storage (IndexedDB) — evita base64 in localStorage
 ****************************************************************/
let __idbDocPagesPromise = null;

function __idbDocPagesOpen(){
  if (__idbDocPagesPromise) return __idbDocPagesPromise;
  __idbDocPagesPromise = new Promise((resolve) => {
    try{
      if (!("indexedDB" in window)) return resolve(null);
      const req = indexedDB.open("hub_inventario_db", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("docPages")) {
          db.createObjectStore("docPages", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch(e){
      resolve(null);
    }
  });
  return __idbDocPagesPromise;
}

async function __idbPutDocPage(id, blob){
  const db = await __idbDocPagesOpen();
  if (!db) return false;
  return await new Promise((resolve) => {
    try{
      const tx = db.transaction("docPages", "readwrite");
      const store = tx.objectStore("docPages");
      store.put({ id: String(id), blob, ts: Date.now(), type: String(blob && blob.type || "") });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    }catch(e){
      resolve(false);
    }
  });
}

async function __idbGetDocPage(id){
  const db = await __idbDocPagesOpen();
  if (!db) return null;
  return await new Promise((resolve) => {
    try{
      const tx = db.transaction("docPages", "readonly");
      const store = tx.objectStore("docPages");
      const req = store.get(String(id));
      req.onsuccess = () => resolve((req.result && req.result.blob) ? req.result.blob : null);
      req.onerror = () => resolve(null);
    }catch(e){
      resolve(null);
    }
  });
}

async function __idbDeleteDocPage(id){
  const db = await __idbDocPagesOpen();
  if (!db) return false;
  return await new Promise((resolve) => {
    try{
      const tx = db.transaction("docPages", "readwrite");
      const store = tx.objectStore("docPages");
      store.delete(String(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    }catch(e){
      resolve(false);
    }
  });
}

// Fallback: convert file->dataURL (se IndexedDB non disponibile)
function __fileToDataURL(file){
  return new Promise((resolve) => {
    try{
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = () => resolve("");
      fr.readAsDataURL(file);
    } catch(e){
      resolve("");
    }
  });
}


async function uploadDocPagesToStorage(docKey, files){
  const picked = Array.from(files || []).filter(Boolean);
  if (!picked.length) return [];

  // Cloud: Firebase Storage (se disponibile). Se fallisce, fallback local.
  if (fb.user && fb.storage){
    try{
      const folder = `orgs/${ORG_ID}/docPages/${keyToDocId(docKey)}/${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const out = [];
      for (let i = 0; i < picked.length; i++){
        const f = picked[i];
        const typeExt = (f && f.type && String(f.type).includes("/")) ? String(f.type).split("/")[1] : "";
        const nameExt = String(f && f.name || "").includes(".") ? String(f.name).split(".").pop() : "";
        const ext = (typeExt || nameExt || "jpg");
        const safeExt = String(ext || "jpg").replace(/[^a-z0-9]/gi,"").toLowerCase() || "jpg";
        const path = `${folder}/page_${String(i+1).padStart(2,"0")}.${safeExt}`;
        const r = sRef(fb.storage, path);
        await uploadBytes(r, f);
        const url = await getDownloadURL(r);
        out.push({ url, path, page: i + 1 });
      }
      return out;
    } catch(e){
      console.warn("uploadDocPagesToStorage: upload failed, fallback local", e);
      // continua al fallback local
    }
  }

  // Local: IndexedDB (fallback su dataURL)
  const out = [];
  const folder = `docPages/${keyToDocId(docKey)}/${Date.now()}_${Math.random().toString(16).slice(2)}`;
  for (let i = 0; i < picked.length; i++){
    const f = picked[i];
    const id = `${folder}/page_${String(i+1).padStart(2,"0")}`;
    const ok = await __idbPutDocPage(id, f);
    if (ok){
      out.push({ url: "", path: `idb:${id}`, page: i + 1 });
    } else {
      const dataUrl = await __fileToDataURL(f);
      if (dataUrl) out.push({ url: dataUrl, path: "", page: i + 1 });
    }
  }
  return out;
}




async function deleteStoragePaths(paths){
  const arr = Array.from(paths || []).filter(Boolean).map(p => String(p));
  if (!arr.length) return;

  const idbArr = arr.filter(p => p.startsWith("idb:"));
  const cloudArr = arr.filter(p => !p.startsWith("idb:"));

  if (idbArr.length){
    await Promise.all(idbArr.map(async (p) => {
      try{
        await __idbDeleteDocPage(p.slice(4));
      }catch(e){
        console.warn("idb delete failed", p, e);
      }
    }));
  }

  if (cloudArr.length && (fb.user && fb.storage)){
    await Promise.all(cloudArr.map(async (p) => {
      try{
        const r = sRef(fb.storage, String(p));
        await deleteObject(r);
      } catch(e){
        console.warn("deleteObject failed", p, e);
      }
    }));
  }
}



function getDocPagesFromGroup(g){
  const pages = [];
  const movs = (g && Array.isArray(g.movements)) ? g.movements : [];
  movs.forEach(mv => {
    const a = __sanitizeDocPages((mv && mv.docPages) || (mv && mv.docImages) || []);
    a.forEach(x => pages.push(x));
  });

  const seen = new Set();
  const out = [];
  pages.forEach(p => {
    const k = String(p.url || "") || String(p.path || "");
    if (!k) return;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(p);
  });

  out.sort((a,b) => safeInt(a.page) - safeInt(b.page));
  out.forEach((p, idx) => { if (!safeInt(p.page)) p.page = idx + 1; });
  return out;
}

const __BLANK_IMG = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
let __docDetailBlobUrls = [];
let __docDetailRenderToken = 0;

function __revokeDocDetailBlobUrls(){
  if (!__docDetailBlobUrls || !__docDetailBlobUrls.length) return;
  __docDetailBlobUrls.forEach(u => {
    try { URL.revokeObjectURL(u); } catch(_){}
  });
  __docDetailBlobUrls = [];
}

async function __resolveDocPageToUrl(p){
  const url = String((p && p.url) || "").trim();
  if (url && __isRenderableUrl(url)) return url;

  let path = String((p && p.path) || "").trim();
  // legacy: a volte il path finisce in url
  if (!path && url && !__isRenderableUrl(url)) path = url;

  if (!path) return "";
  if (__isRenderableUrl(path)) return path;

  if (path.startsWith("idb:")) {
    const id = path.slice(4);
    const blob = await __idbGetDocPage(id);
    if (!blob) return "";
    const u = URL.createObjectURL(blob);
    __docDetailBlobUrls.push(u);
    return u;
  }

  if (fb && fb.storage) {
    try {
      const r = sRef(fb.storage, path);
      const u = await getDownloadURL(r);
      return u;
    } catch(e) {
      return "";
    }
  }

  return "";
}

function renderDocDetailPhotos(g){
  if (!docDetailPhotosWrap || !docDetailPhotosGrid) return;

  // revoke eventuali blob url precedenti
  __revokeDocDetailBlobUrls();
  const token = ++__docDetailRenderToken;

  const pages = getDocPagesFromGroup(g);
  if (!pages.length){
    docDetailPhotosWrap.style.display = "none";
    docDetailPhotosGrid.innerHTML = "";
    if (docDetailPhotosMeta) docDetailPhotosMeta.textContent = "";
    return;
  }

  docDetailPhotosWrap.style.display = "";
  if (docDetailPhotosMeta) docDetailPhotosMeta.textContent = `${pages.length} pagina${pages.length === 1 ? "" : "e"}`;

  docDetailPhotosGrid.innerHTML = pages.map((p, idx) => {
    const page = safeInt(p.page) || (idx + 1);
    const path = escapeHtmlAttr(String(p.path || ""));
    const url = escapeHtmlAttr(String(p.url || ""));
    return `
      <a class="docPhoto" href="#" data-idx="${idx}" data-page="${page}" data-path="${path}" data-url="${url}" target="_blank" rel="noopener" onclick="return false;">
        <img src="${__BLANK_IMG}" alt="Pagina ${page}">
        <div class="docPhotoBadge">${page}</div>
      </a>
    `;
  }).join("");

  // resolve URLs async (Storage / IndexedDB)
  const anchors = Array.from(docDetailPhotosGrid.querySelectorAll(".docPhoto"));
  pages.forEach(async (p, idx) => {
    try {
      const u = await __resolveDocPageToUrl(p);
      if (token !== __docDetailRenderToken) return;
      const a = anchors[idx];
      if (!a) return;
      const img = a.querySelector("img");
      if (u) {
        if (img) img.src = u;
        a.href = u;
        a.onclick = null;
        try { a.removeAttribute("onclick"); } catch(_){ }
      } else {
        if (img) img.alt = "Immagine non disponibile";
      }
    } catch(e){}
  });
}




    // ===== Categorie (gestibili) =====
// NOTE: le categorie sono condivise (Firebase orgs/{ORG_ID}/categories) e disponibili subito in Inventario / Prodotti.
// Ogni categoria ha: key (slug), name (label), color (hex).
const DEFAULT_CATEGORIES = [
  { key: "non_classificati", name: "Non classificati", color: "#9aa0a6" },
  { key: "scatole",          name: "Scatole",          color: "#1c6fe6" },
  { key: "divisori",         name: "Divisori",         color: "#1455b3" },
  { key: "flaconi",          name: "Flaconi",          color: "#34c759" },
  { key: "trigger",          name: "Trigger",          color: "#ff9f0a" },
  { key: "tappi",            name: "Tappi",            color: "#ff3b30" },
  { key: "bobine",           name: "Bobine",           color: "#5856d6" },
  { key: "materie_prime",    name: "Materie prime",    color: "#8e8e93" }
];

let categories = [];           // runtime list [{key,name,color}]
let MACRO_CATEGORIES = [];     // runtime keys (compat per UI già esistente)
let __catMap = new Map();      // key -> def

function __safeCssColor(v){
  const s = String(v || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s : "";
}

function __slugCategoryKey(name){
  const s = String(name || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "categoria";
}

function __applyRuntimeCategories(list){
  const arr = Array.isArray(list) ? list : [];
  const norm = [];
  const seen = new Set();

  for (const c of arr) {
    if (!c) continue;
    const key = String(c.key || c.id || c.slug || "").trim().toLowerCase();
    const name = String(c.name || c.label || key || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    norm.push({ key, name: name || key, color: __safeCssColor(c.color || ""), macro: normalizeProductsMacroGroup(c.macro || c.macroGroup || c.group || "") || ((key === "materie_prime") ? "materie_prime" : "imballaggi") });
  }

  // fallback: se vuoto, usa defaults
  const baseList = norm.length ? norm : DEFAULT_CATEGORIES.slice();

  const finalList = baseList.map(c => {
    const key = String(c.key||"").trim().toLowerCase();
    const name = String(c.name||key||"").trim() || key;
    const color = __safeCssColor(c.color || "");
    const macro = normalizeProductsMacroGroup(c.macro || c.macroGroup || c.group || "") || ((key === "materie_prime") ? "materie_prime" : "imballaggi");
    return { key, name, color, macro };
  });

  // ordina: per nome (it), ma tenendo "non_classificati" in cima
  finalList.sort((a,b) => {
    if (a.key === "non_classificati") return -1;
    if (b.key === "non_classificati") return 1;
    return String(a.name||"").localeCompare(String(b.name||""), "it", { sensitivity:"base" });
  });

  categories = finalList;
  MACRO_CATEGORIES = finalList.map(x => x.key);
  __catMap = new Map(finalList.map(x => [x.key, x]));
  try { state.categories = finalList.slice(); saveLocalData(); } catch(_){}
}

function normalizeMacroCategory(v) {
  const s = String(v || "").trim().toLowerCase();
  return __catMap.has(s) ? s : "";
}
function macroCatLabel(v) {
  const s = normalizeMacroCategory(v);
  if (!s) return "";
  const def = __catMap.get(s);
  if (def && def.name) return String(def.name);
  if (s === "non_classificati") return "Non classificati";
  const pretty = s.replace(/_/g, " ");
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}
function macroCatColor(v){
  const s = normalizeMacroCategory(v);
  const def = s ? __catMap.get(s) : null;
  return def && def.color ? def.color : "";
}

// Macro gruppi prodotti (menu Prodotti)
const PRODUCT_MACRO_GROUPS = [
  { key: "materie_prime", name: "Materie prime" },
  { key: "imballaggi", name: "Imballaggi" }
];
function normalizeProductsMacroGroup(v){
  const s = String(v || "").trim().toLowerCase();
  return (s === "materie_prime" || s === "imballaggi") ? s : "";
}
function productsMacroLabel(v){
  const s = normalizeProductsMacroGroup(v);
  if (!s) return "";
  return (s === "materie_prime") ? "Materie prime" : "Imballaggi";
}
function categoryMacroGroup(catKey){
  const k = normalizeMacroCategory(catKey);
  const def = k ? __catMap.get(k) : null;
  const mg = normalizeProductsMacroGroup(def && def.macro);
  if (mg) return mg;
  // fallback: se non definito, trattiamo come imballaggi (tradizionale)
  return (k === "materie_prime") ? "materie_prime" : "imballaggi";
}


// (UI) Popola select categorie in Inventario (filtro)
function renderCategoryOptions(){
  if (!filterCategory) return;
  const cur = String(filterCategory.value || "");
  const base = [
    '<option value="">Tutte</option>',
    '<option value="__none">Non assegnata</option>'
  ];

  const opts = categories.map(c => {
    const key = escapeHtmlAttr(c.key);
    const lab = escapeHtml(c.name || c.key);
    return `<option value="${key}">${lab}</option>`;
  });

  filterCategory.innerHTML = base.join("") + opts.join("");
  // restore se possibile
  const allVals = new Set(["", "__none", ...categories.map(x => x.key)]);
  if (allVals.has(cur)) filterCategory.value = cur;
}

function renderAnagProductsFiltersUI(){
  try{
    if (!anagProductsFilters) return;
    const isProd = (activeAnagTab === "products");
    anagProductsFilters.style.display = isProd ? "flex" : "none";
    if (!isProd) return;

    const mg = normalizeProductsMacroGroup(activeProductsMacroGroup) || "imballaggi";

    // Categoria (solo quelle dentro la macro selezionata)
    if (anagProdCategoryFilter){
      const cur = String(anagProdCategoryFilter.value || "");
      const base = ['<option value="">Tutte</option>'];
      if (mg === "imballaggi") base.push('<option value="__none">Non assegnata</option>');

      const list = (Array.isArray(categories) ? categories : [])
        .filter(c => c && categoryMacroGroup(c.key) === mg)
        .slice()
        .sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), "it", { sensitivity:"base" }));

      const opts = list.map(c => `<option value="${escapeHtmlAttr(c.key)}">${escapeHtml(c.name || c.key)}</option>`);

      anagProdCategoryFilter.innerHTML = base.join("") + opts.join("");

      const allowed = new Set(["", "__none", ...list.map(x => x.key)]);
      anagProdCategoryFilter.value = allowed.has(cur) ? cur : "";
    }

    // Stato unificazione
    if (anagProdUnifiedFilter){
      const cur = String(anagProdUnifiedFilter.value || "");
      if (!["all","unified","single"].includes(cur)) anagProdUnifiedFilter.value = "all";
    }

    // Ordinamento
    if (anagProdSort){
      const cur = String(anagProdSort.value || "");
      if (!["name_asc","codes_desc","codes_asc"].includes(cur)) anagProdSort.value = "name_asc";
    }
  }catch(_){}
}

// ===== CRUD categorie =====
let __didSeedCategories = false;

async function __seedDefaultCategoriesIfEmpty(){
  if (__didSeedCategories) return;
  if (!(fb.user && fb.db)) return;

  // seed solo se su cloud non c'è nulla (chiamata fatta dal watcher quando snap è vuoto)
  __didSeedCategories = true;

  try{
    for (const c of DEFAULT_CATEGORIES) {
      const key = String(c.key || "").trim().toLowerCase();
      if (!key) continue;
      const ref = doc(fb.db, "orgs", ORG_ID, "categories", keyToDocId(key));
      await setDoc(ref, {
        key,
        name: String(c.name || key),
        nameLower: String(c.name || key).toLowerCase(),
        color: __safeCssColor(c.color || ""),
        createdAt: serverTimestamp(),
        createdBy: fb.user.email || fb.user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: fb.user.email || fb.user.uid
      }, { merge: true });
    }
  }catch(e){
    console.warn("seedDefaultCategories skipped", e);
  }
}

function __categoryUsageCount(catKey){
  const key = normalizeMacroCategory(catKey);
  if (!key) return 0;

  const codeSet = new Set();
  try{
    for (const p of (Array.isArray(products) ? products : [])) {
      const c = String(p && (p.code || safeDecodeUri(p.id || "")) || "").trim();
      if (c) codeSet.add(c.toLowerCase());
    }
  }catch(_){}

  try{
    const pc = (state && state.productCategories) ? state.productCategories : {};
    for (const k of Object.keys(pc || {})) codeSet.add(String(k || "").trim().toLowerCase());
  }catch(_){}

  let n = 0;
  for (const low of codeSet) {
    const cat = getMacroCategoryForCode(low);
    if (cat === key) n++;
  }
  return n;
}

function __categoryProducts(catKey){
  const key = normalizeMacroCategory(catKey);
  if (!key) return [];

  const out = [];
  const seen = new Set();

  const pushCode = (code) => {
    const c = String(code || "").trim();
    if (!c) return;
    const low = c.toLowerCase();
    if (seen.has(low)) return;
    if (getMacroCategoryForCode(c) !== key) return;
    seen.add(low);
    out.push({
      code: c,
      name: getDisplayNameForCode(c, "")
    });
  };

  try{
    for (const p of (Array.isArray(products) ? products : [])) {
      const c = String(p && (p.code || safeDecodeUri(p.id || "")) || "").trim();
      if (!c) continue;
      pushCode(c);
    }
  }catch(_){}

  try{
    const pc = (state && state.productCategories) ? state.productCategories : {};
    for (const k of Object.keys(pc || {})) pushCode(k);
  }catch(_){}

  out.sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), "it", { sensitivity:"base" }));
  return out;
}

async function createCategory(name, color, macro){
  const nm = String(name || "").trim();
  if (!nm) return null;

  let key = __slugCategoryKey(nm);
  // evita collisioni
  const existing = new Set((categories || []).map(x => String(x.key||"").toLowerCase()));
  if (existing.has(key)) {
    let i = 2;
    while (existing.has(`${key}_${i}`)) i++;
    key = `${key}_${i}`;
  }

  const mg = normalizeProductsMacroGroup(macro) || ((key === "materie_prime") ? "materie_prime" : "imballaggi");

  const cat = { key, name: nm, color: __safeCssColor(color || ""),
        macro: mg };

  // optimistic local
  const next = (Array.isArray(categories) ? categories.slice() : []).filter(c => c && c.key);
  next.push(cat);
  __applyRuntimeCategories(next);
  try{ renderCategoryOptions(); }catch(_){}
  try{ renderAll(); renderAnag(); }catch(_){}
  try{ showToast("Categoria creata"); }catch(_){}

  // cloud
  if (fb.user && fb.db) {
    try{
      await setDoc(doc(fb.db, "orgs", ORG_ID, "categories", keyToDocId(key)), {
        key,
        name: nm,
        nameLower: nm.toLowerCase(),
        color: __safeCssColor(color || ""),
        macro: mg,
        createdAt: serverTimestamp(),
        createdBy: fb.user.email || fb.user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: fb.user.email || fb.user.uid
      }, { merge: true });
    }catch(e){
      console.error("createCategory failed", e);
      showToast("Errore creazione categoria", "err");
    }
  }

  return cat;
}

async function updateCategory(key, patch){
  const k = normalizeMacroCategory(key) || String(key || "").trim().toLowerCase();
  if (!k) return false;

  const cur = (categories || []).find(x => String(x.key||"").toLowerCase() === k);
  if (!cur) return false;

  const nm = (patch && patch.name != null) ? String(patch.name || "").trim() : String(cur.name || "");
  const col = (patch && patch.color != null) ? __safeCssColor(patch.color || "") : __safeCssColor(cur.color || "");
  const mg = (patch && patch.macro != null) ? (normalizeProductsMacroGroup(patch.macro) || categoryMacroGroup(k)) : categoryMacroGroup(k);

  // optimistic local
  const next = (categories || []).map(x => (String(x.key||"").toLowerCase() === k) ? ({...x, name: nm, color: col,
        macro: mg}) : x);
  __applyRuntimeCategories(next);
  try{ renderCategoryOptions(); }catch(_){}
  try{ renderAll(); renderAnag(); }catch(_){}

  // cloud
  if (fb.user && fb.db) {
    try{
      await setDoc(doc(fb.db, "orgs", ORG_ID, "categories", keyToDocId(k)), {
        key: k,
        name: nm,
        nameLower: nm.toLowerCase(),
        color: col,
        macro: mg,
        updatedAt: serverTimestamp(),
        updatedBy: fb.user.email || fb.user.uid
      }, { merge: true });
    }catch(e){
      console.error("updateCategory failed", e);
      showToast("Errore salvataggio categoria", "err");
      return false;
    }
  }

  showToast("Categoria salvata");
  return true;
}

async function deleteCategory(key){
  const k = normalizeMacroCategory(key) || String(key || "").trim().toLowerCase();
  if (!k) return false;

  const used = __categoryUsageCount(k);
  if (used > 0) {
    showToast("Categoria usata: non eliminabile", "warn");
    return false;
  }

  const next = (categories || []).filter(x => String(x.key||"").toLowerCase() !== k);
  __applyRuntimeCategories(next);
  try{ renderCategoryOptions(); }catch(_){}
  try{ renderAll(); renderAnag(); }catch(_){}

  if (fb.user && fb.db) {
    try{
      await deleteDoc(doc(fb.db, "orgs", ORG_ID, "categories", keyToDocId(k)));
    }catch(e){
      console.error("deleteCategory failed", e);
      showToast("Errore eliminazione categoria", "err");
      return false;
    }
  }

  showToast("Categoria eliminata");
  return true;
}

// init runtime categorie (best effort)
try{
  if (!Array.isArray(state.categories) || !state.categories.length) state.categories = DEFAULT_CATEGORIES.slice();
  __applyRuntimeCategories(state.categories);
}catch(_){ }
    function safeDecodeUri(s) { try { return decodeURIComponent(s); } catch { return s; } }
    function findProductByCode(code) {
      const low = String(code || "").trim().toLowerCase();
      if (!low) return null;
      return (products || []).find(p => {
        const pCode = String(p.code || "").trim().toLowerCase();
        const pId = String(p.id || "").trim().toLowerCase();
        const pIdDec = safeDecodeUri(String(p.id || "")).trim().toLowerCase();
        return pCode === low || pId === low || pIdDec === low;
      }) || null;
    }



// === Fornitore (per prodotto): derivato dall'ultimo carico per quel codice ===
function __getLastSupplierInfoForCode(code){
  const low = String(code || "").trim().toLowerCase();
  if (!low) return null;

  const arr = (state.movements || []).filter(m => {
    const c = String((m && m.code) || "").trim().toLowerCase();
    if (c !== low) return false;
    const t = String((m && m.type) || "IN").toUpperCase();
    return t === "IN";
  });

  if (!arr.length) return null;
  arr.sort((a,b) => String(b.createdAt||"").localeCompare(String(a.createdAt||"")));

  const mv = arr[0] || {};
  let name = String(mv.customer || mv.supplierName || mv.supplier || "").trim();
  const vat = (typeof __sup_cleanVat === "function")
    ? __sup_cleanVat(mv.supplierVat || mv.vat || "")
    : String(mv.supplierVat || "").trim();

  // Se ho P.IVA e ho anagrafica fornitori, usa il nome canonico
  try{
    if (vat) {
      const s = __findSupplierByVat(vat);
      if (s && s.name) name = String(s.name).trim();
    } else if (name && Array.isArray(suppliers)) {
      const s2 = (suppliers || []).find(s => supplierMatchesCustomer(s, name));
      if (s2 && s2.name) name = String(s2.name).trim();
    }
  }catch(_){}

  const docNum = String(mv.docNum || "").trim() || extractDocNumber(mv.note || "");
  const day = String(mv.date || "").trim();

  return {
    name,
    vat,
    docNum,
    date: day,
    note: String(mv.note || "").trim()
  };
}

    // === Alias (unificazione codici) ===
    function normTextKey(v) {
      return String(v || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
    }

    function getAliasForCode(code) {
      const p = findProductByCode(code);
      const a = String((p && (p.alias || p.aliasName)) || "").trim();
      return a;
    }

    function getDisplayNameForCode(code, fallbackName) {
      const p = findProductByCode(code);
      const a = String((p && (p.alias || p.aliasName)) || "").trim();
      if (a) return a;
      const n = String((p && p.name) || "").trim();
      if (n) return n;
      return String(fallbackName || "").trim();
    }

    async function setProductNameForCode(code, name) {
      const key = String(code || "").trim();
      if (!key) return;
      const nm = String(name || "").trim();
      if (!nm) return;

      // optimistic local
      const p = findProductByCode(key);
      if (p) { p.name = nm; p.nameLower = nm.toLowerCase(); p.updatedAtIso = new Date().toISOString(); }

      if (!fb.user || !fb.db) { renderAll(); renderAnag(); return; }

      try {
        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(key.toLowerCase())), {
          code: key,
          codeLower: key.toLowerCase(),
          name: nm,
          nameLower: nm.toLowerCase(),
          updatedAt: serverTimestamp(),
          updatedBy: (fb.user.email || fb.user.uid || "")
        }, { merge: true });
        renderAll(); renderAnag();
        showToast("Nome prodotto salvato");
      } catch (e) {
        console.error("setProductNameForCode failed", e);
        showToast("Errore salvataggio nome", "err");
      }
    }


    async function setProductAliasForCode(code, alias, opts) {
      const key = String(code || "").trim();
      if (!key) return;
      const al = String(alias || "").trim();
      const alLower = al ? al.toLowerCase() : "";
      const silent = !!(opts && opts.silent);

      // optimistic local
      const p = findProductByCode(key);
      if (p) {
        if (al) { p.alias = al; p.aliasLower = alLower; }
        else { delete p.alias; delete p.aliasLower; }
        p.updatedAtIso = new Date().toISOString();
      }

      if (!fb.user || !fb.db) {
        renderAll(); renderAnag();
        if (!silent) showToast(al ? "Alias salvato" : "Alias rimosso");
        return;
      }

      try {
        const patch = {
          code: key,
          codeLower: key.toLowerCase(),
          updatedAt: serverTimestamp(),
          updatedBy: (fb.user.email || fb.user.uid || "")
        };
        if (al) {
          patch.alias = al;
          patch.aliasLower = alLower;
        } else {
          patch.alias = deleteField();
          patch.aliasLower = deleteField();
        }
        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(key.toLowerCase())), patch, { merge: true });
        renderAll(); renderAnag();
        if (!silent) showToast(al ? "Alias salvato" : "Alias rimosso");
      } catch (e) {
        console.error("setProductAliasForCode failed", e);
        if (!silent) showToast("Errore salvataggio alias", "err");
      }
    }



    async function setProductAliasForCodes(codes, alias) {
      const list = (Array.isArray(codes) ? codes : []).map(x => String(x || "").trim()).filter(Boolean);
      if (!list.length) return;

      const al = String(alias || "").trim();
      const alLower = al ? al.toLowerCase() : "";

      // optimistic local (immediato)
      for (const c of list) {
        const p = findProductByCode(c);
        if (p) {
          if (al) { p.alias = al; p.aliasLower = alLower; }
          else { delete p.alias; delete p.aliasLower; }
          p.updatedAtIso = new Date().toISOString();
        }
      }

      if (!fb.user || !fb.db) {
        renderAll(); renderAnag();
        showToast(al ? "Alias applicato" : "Alias rimosso");
        return;
      }

      try {
        await Promise.all(list.map(async (key) => {
          const patch = {
            code: key,
            codeLower: key.toLowerCase(),
            updatedAt: serverTimestamp(),
            updatedBy: (fb.user.email || fb.user.uid || "")
          };
          if (al) {
            patch.alias = al;
            patch.aliasLower = alLower;
          } else {
            patch.alias = deleteField();
            patch.aliasLower = deleteField();
          }
          await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(key.toLowerCase())), patch, { merge: true });
        }));
        renderAll(); renderAnag();
        showToast(al ? "Alias applicato" : "Alias rimosso");
      } catch (e) {
        console.error("setProductAliasForCodes failed", e);
        showToast("Errore salvataggio alias", "err");
      }
    }



    // ===== Prodotti: eliminazione (solo anagrafica) =====
    async function deleteProductByCode(code, opts) {
      const key = String(code || "").trim();
      if (!key) return false;
      const low = key.toLowerCase();
      const silent = !!(opts && opts.silent);
      const skipConfirm = !!(opts && opts.skipConfirm);

      // Nota: operazione disponibile solo in realtime (Firestore)
      if (!fb.user || !fb.db) {
        openModal("Accesso richiesto", "Accedi con Google per eliminare un prodotto.");
        return false;
      }

      // Info (best effort) per conferma
      const p = findProductByCode(key);
      const nm = String((p && p.name) || "").trim() || "—";
      const al = String((p && (p.alias || p.aliasName)) || "").trim() || "—";
      const cat = (typeof macroCatLabel === "function") ? (macroCatLabel(getMacroCategoryForCode(key)) || "—") : "—";

      let nMov = 0;
      let stockSum = 0;
      try {
        nMov = (state && Array.isArray(state.movements))
          ? state.movements.filter(m => String(m && m.code || "").trim().toLowerCase() === low).length
          : 0;
      } catch(_) {}

      try {
        const rows = (typeof computeStock === "function") ? computeStock() : [];
        stockSum = (rows || []).filter(r => String(r && r.code || "").trim().toLowerCase() === low)
          .reduce((s, r) => s + safeInt(r && r.qty), 0);
      } catch(_) {}

      if (!skipConfirm) {
        const ok = confirm(
          `Eliminare il prodotto dall’anagrafica?\n\n` +
          `Codice: ${key}\n` +
          `Nome: ${nm}\n` +
          `Alias: ${al}\n` +
          `Categoria: ${cat}\n\n` +
          `Nota: elimina SOLO l’anagrafica prodotto (nome/alias/categoria). Movimenti e stock restano.\n` +
          `Movimenti che lo contengono: ${nMov}\n` +
          `Stock totale attuale: ${Number(stockSum||0).toLocaleString("it-IT")}`
        );
        if (!ok) return false;
      }

      // Optimistic local
      try {
        products = (products || []).filter(pp => {
          const a = String(pp && (pp.code || pp.id || "")).trim().toLowerCase();
          const b = safeDecodeUri(String(pp && pp.id || "")).trim().toLowerCase();
          return !(a === low || b === low);
        });
      } catch(_) {}

      try {
        if (state && state.productCategories && (low in state.productCategories)) {
          delete state.productCategories[low];
          saveLocalData();
        }
      } catch(_) {}

      try { renderAll(); renderAnag(); } catch(_) {}

      // Firestore delete
      try {
        try{ await trashPut({ kind:"product", label: `${key} — ${nm}`, target:{ col:"products", id:keyToDocId(low), code:key }, data: (p ? {...p} : { code:key, name:nm, alias:al }) }); }catch(_){ }
        await deleteDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)));
        try { renderAll(); renderAnag(); } catch(_) {}
        if (!silent) showToast("Prodotto eliminato");
        return true;
      } catch (e) {
        console.error("deleteProductByCode failed", e);
        if (!silent) showToast("Errore eliminazione prodotto", "err");
        return false;
      }
    }


function getMacroCategoryForCode(code) {
      const low = String(code || "").trim().toLowerCase();
      const p = findProductByCode(code);
      const fromProducts = normalizeMacroCategory(p && p.category);
      const fromLocal = normalizeMacroCategory(state.productCategories && state.productCategories[low]);
      return fromProducts || fromLocal || "";
    }


    
    // ===== Prodotti: Visibilità sedi (Cerea / Concamarise) =====
    // Se non impostata => default: visibile in entrambe le sedi.
    // Campo prodotto: warehouses: ["cerea","concamarise"] (oppure [])
    function __normalizeWarehousesList(raw){
      try{
        if (raw == null) return [];
        let arr = [];
        if (Array.isArray(raw)) arr = raw.slice();
        else if (typeof raw === "string") arr = String(raw).split(/[;,\s]+/g).filter(Boolean);
        else if (raw && typeof raw === "object") {
          // compat: {cerea:true, concamarise:false} / {cerea:1, conca:0}
          const out = [];
          const c = raw.cerea;
          const k = (raw.concamarise !== undefined) ? raw.concamarise : raw.conca;
          if (c === true || c === 1 || c === "1") out.push(WAREHOUSE_CEREA);
          if (k === true || k === 1 || k === "1") out.push(WAREHOUSE_CONCA);
          return Array.from(new Set(out.map(normalizeWarehouse))).filter(w => w === WAREHOUSE_CEREA || w === WAREHOUSE_CONCA);
        }
        const out2 = [];
        for (const x of arr) {
          const w = normalizeWarehouse(x);
          if (w === WAREHOUSE_CEREA || w === WAREHOUSE_CONCA) out2.push(w);
        }
        return Array.from(new Set(out2));
      }catch(_){ return []; }
    }

    function getWarehousesSettingForCode(code){
      const low = String(code || "").trim().toLowerCase();
      if (!low) return null;

      // 1) products cloud
      const p = findProductByCode(code);
      if (p && (p.warehouses !== undefined)) {
        return __normalizeWarehousesList(p.warehouses);
      }

      // 2) local fallback
      try{
        if (state && state.productWarehouses && (low in state.productWarehouses)) {
          return __normalizeWarehousesList(state.productWarehouses[low]);
        }
      }catch(_){}

      // default: entrambe
      return null;
    }

    function isCodeVisibleInWarehouse(code, wh){
      const setting = getWarehousesSettingForCode(code);
      if (setting == null) return true; // default: show in both
      const w = normalizeWarehouse(wh);
      return setting.includes(w);
    }

    async function setProductWarehousesForCode(code, warehouses, opts){
      const key = String(code || "").trim();
      if (!key) return;
      const low = key.toLowerCase();
      const silent = !!(opts && opts.silent);

      const list = __normalizeWarehousesList(warehouses);

      // Offline fallback + UI immediata
      state.productWarehouses = state.productWarehouses || {};
      state.productWarehouses[low] = list;
      saveLocalData();

      // optimistic local products (se già presente)
      const p = findProductByCode(key);
      if (p){
        p.warehouses = list;
        p.updatedAtIso = new Date().toISOString();
      }

      if (!fb.user || !fb.db) {
        renderAll(); renderAnag();
        if (!silent) showToast("Visibilità salvata");
        return;
      }

      try{
        const patch = {
          code: key,
          codeLower: low,
          warehouses: list,
          updatedAt: serverTimestamp(),
          updatedBy: (fb.user.email || fb.user.uid || "")
        };
        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)), patch, { merge: true });
        renderAll(); renderAnag();
        if (!silent) showToast("Visibilità salvata");
      }catch(e){
        console.error("setProductWarehousesForCode failed", e);
        if (!silent) showToast("Errore salvataggio visibilità", "err");
      }
    }

// ===== Prodotti: Unità di misura (U.M.) =====
    // Canoniche: nr / pz / kg / ton
    function getUomSettingForCode(code){
      const low = String(code || "").trim().toLowerCase();
      const p = findProductByCode(code);
      const fromProducts = __normalizeUom(p && (p.uom || p.um || p.unit || p.unitOfMeasure));
      const fromLocal = __normalizeUom(state.productUoms && state.productUoms[low]);
      return fromProducts || fromLocal || "";
    }

    function getUomResolvedForCode(code){
      const low = String(code || "").trim().toLowerCase();
      const explicit = getUomSettingForCode(code);
      if (explicit) return explicit;

      // fallback: ultimo movimento che contiene U.M.
      try{
        const list = (state && Array.isArray(state.movements)) ? state.movements : [];
        // movements sono già in ordine (createdAt asc). tengo l'ultima U.M. non vuota
        let last = "";
        for (const mv of list){
          if (!mv) continue;
          if (String(mv.code || "").trim().toLowerCase() !== low) continue;
          const u = __normalizeUom(mv.uom || "");
          if (u) last = u;
        }
        if (last) return last;
      }catch(_){}
      return "";
    }

    function getUomResolvedForCodes(codes){
      const arr = Array.isArray(codes) ? codes : [];
      const set = new Set();
      for (const c of arr){
        const u = getUomResolvedForCode(c);
        if (u) set.add(u);
      }
      if (set.size === 1) return Array.from(set)[0];
      // se mix o vuoto: non forzare
      return "";
    }

    async function setProductUomForCode(code, uom, opts){
      const key = String(code || "").trim();
      if (!key) return;
      const low = key.toLowerCase();
      const u = __normalizeUom(uom || "");
      const silent = !!(opts && opts.silent);

      // Offline fallback + UI immediata
      state.productUoms = state.productUoms || {};
      if (u) state.productUoms[low] = u;
      else delete state.productUoms[low];
      saveLocalData();

      // optimistic local products (se già presente)
      const p = findProductByCode(key);
      if (p){
        if (u) p.uom = u;
        else { try{ delete p.uom; }catch(_){ p.uom = ""; } }
        p.updatedAtIso = new Date().toISOString();
      }

      if (!fb.user || !fb.db) {
        renderAll(); renderAnag();
        if (!silent) showToast(u ? "U.M. salvata" : "U.M. rimossa");
        return;
      }

      try{
        const patch = {
          code: key,
          codeLower: low,
          updatedAt: serverTimestamp(),
          updatedBy: (fb.user.email || fb.user.uid || "")
        };
        if (u) patch.uom = u;
        else patch.uom = deleteField();

        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)), patch, { merge: true });
        renderAll(); renderAnag();
        if (!silent) showToast(u ? "U.M. salvata" : "U.M. rimossa");
      }catch(e){
        console.error("setProductUomForCode failed", e);
        if (!silent) showToast("Errore salvataggio U.M.", "err");
      }
    }

    async function setProductUomForCodes(codes, uom){
      const list = (Array.isArray(codes) ? codes : []).map(x => String(x || "").trim()).filter(Boolean);
      if (!list.length) return;
      const u = __normalizeUom(uom || "");

      // optimistic local
      state.productUoms = state.productUoms || {};
      for (const c of list){
        const low = c.toLowerCase();
        if (u) state.productUoms[low] = u;
        else delete state.productUoms[low];

        const p = findProductByCode(c);
        if (p){
          if (u) p.uom = u;
          else { try{ delete p.uom; }catch(_){ p.uom = ""; } }
          p.updatedAtIso = new Date().toISOString();
        }
      }
      saveLocalData();

      if (!fb.user || !fb.db) { renderAll(); renderAnag(); showToast(u ? "U.M. salvata" : "U.M. rimossa"); return; }

      try{
        await Promise.all(list.map(async (c) => {
          const low = c.toLowerCase();
          const patch = {
            code: c,
            codeLower: low,
            updatedAt: serverTimestamp(),
            updatedBy: (fb.user.email || fb.user.uid || "")
          };
          if (u) patch.uom = u;
          else patch.uom = deleteField();
          await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)), patch, { merge: true });
        }));
        renderAll(); renderAnag();
        showToast(u ? "U.M. salvata" : "U.M. rimossa");
      }catch(e){
        console.error("setProductUomForCodes failed", e);
        showToast("Errore salvataggio U.M.", "err");
      }
    }

    async function setMacroCategoryForCode(code, category, nameHint) {
      const key = String(code || "").trim();
      const low = key.toLowerCase();
      const cat = normalizeMacroCategory(category);

      // Offline fallback + UI immediata
      state.productCategories = state.productCategories || {};
      if (cat) state.productCategories[low] = cat;
      else delete state.productCategories[low];
      saveLocalData();

      // Optimistic local products (se già presente)
      const p = findProductByCode(key);
      if (p) p.category = cat;

      if (!fb.user || !fb.db) return;

      const patch = {
        code: key,
        codeLower: low,
        category: cat,
        updatedAt: serverTimestamp(),
        updatedBy: (fb.user.email || fb.user.uid || "")
      };
      const nm = String(nameHint || "").trim();
      if (nm) {
        patch.name = nm;
        patch.nameLower = nm.toLowerCase();
      }

      try {
        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)), patch, { merge: true });
      } catch (e) {
        console.error("setMacroCategoryForCode failed", e);
        showToast("Errore salvataggio categoria", "err");
      }
    }


    function groupStockRowsByAlias(rows){
      try{
        const arr = Array.isArray(rows) ? rows : [];
        const map = new Map();

        for (const r of arr) {
          if (!r) continue;
          const code = String(r.code || "").trim();
          const alias = getAliasForCode(code);
          const aliasKey = alias ? normTextKey(alias) : "";
          const gk = aliasKey ? ("alias:" + aliasKey) : ("code:" + code.toLowerCase());

          const wh = normalizeWarehouse(r.warehouse || "");
          const cust = String(r.customer || "").trim();
          const custKey = cust.toLowerCase();

          // Per alias unificati: ignora customer così in inventario si vede UN SOLO articolo unificato
          const k = aliasKey ? `${wh}||${gk}` : `${wh}||${custKey}||${gk}`;

          let g = map.get(k);
          if (!g) {
            g = {
              customer: cust || "",
              warehouse: wh,
              __groupKey: gk,
              __isAliasGroup: !!aliasKey,
              __alias: alias,
              __codes: [],
              __members: [],
              __customers: [],
              __bothZero: (r && r.__bothZero) === true,
              code: code, // primary (will be overwritten below)
              item: "",
              qty: 0,
              threshold: null,
              lastMoveAt: "",
              uom: "",
              __uoms: []
            };
          }

          g.qty += safeInt(r.qty);
          const thr = safeInt(r.threshold);
          g.threshold = (g.threshold == null) ? thr : Math.min(safeInt(g.threshold), thr);
          const ts = String(r.lastMoveAt || "");
          if (!g.lastMoveAt || (ts && ts > String(g.lastMoveAt))) g.lastMoveAt = ts;

          g.__codes.push(code);
          g.__members.push(Object.assign({}, r));
          try{
            const __u = __normalizeUom(r.uom || "") || getUomResolvedForCode(code) || "";
            if (__u) g.__uoms.push(__u);
          }catch(_){ }

          if (cust) g.__customers.push(cust);
          g.__bothZero = (g.__bothZero === true) && ((r && r.__bothZero) === true);
          map.set(k, g);
        }

        const out = Array.from(map.values());
        out.forEach(g => {
          const codes = Array.from(new Set(g.__codes.filter(Boolean)));
          g.__codes = codes;
          g.code = codes[0] || "";

          const custs = Array.from(new Set((g.__customers || []).map(x => String(x||"").trim()).filter(Boolean)));
          g.__customers = custs;
          if (custs.length === 1) g.customer = custs[0];
          else g.customer = "";

          try{
            const __uoms = Array.from(new Set((g.__uoms || []).map(x => __normalizeUom(x)).filter(Boolean)));
            g.uom = (__uoms.length === 1) ? __uoms[0] : "";
          }catch(_){ g.uom = g.uom || ""; }
          try{ delete g.__uoms; }catch(_){ }

          g.item = g.__isAliasGroup ? (g.__alias || getDisplayNameForCode(g.code, "")) : getDisplayNameForCode(g.code, "");
          g.__displayCode = g.__isAliasGroup && codes.length > 1 ? `${g.code} (+${codes.length-1})` : g.code;
        });
        return out;
      }catch(e){
        console.warn("groupStockRowsByAlias failed", e);
        return Array.isArray(rows) ? rows : [];
      }
    }


let __stockRowByKey = new Map();

    function renderStockTable(stockArr) {
      const qRaw = (searchStock.value || "").trim();
      const q = normTextKey(qRaw);
      const cust = (filterCustomer.value || "").trim();
      const flt = (filterLow.value || "all");
      const catF = (filterCategory && filterCategory.value ? String(filterCategory.value) : "").trim().toLowerCase();

      let rows = Array.isArray(stockArr) ? stockArr : [];

      if (cust) rows = rows.filter(x => x.customer === cust);

      // Unificazione per alias (solo visual, i movimenti restano separati per codice)
      rows = groupStockRowsByAlias(rows);

      // ricerca "furba": include alias, nome e codici del gruppo
      if (q) rows = rows.filter(r => {
        const hay = [
          r.customer || "",
          r.item || "",
          r.__alias || "",
          ...(Array.isArray(r.__codes) ? r.__codes : []),
          ...(Array.isArray(r.__members) ? r.__members.map(m => (m.item || "")) : []),
          ...(Array.isArray(r.__members) ? r.__members.map(m => (m.customer || "")) : [])
        ].join(" ");
        return normTextKey(hay).includes(q);
      });

      // filtro categoria (macro) — usa codice primario
      if (catF) {
        if (catF === "__none") rows = rows.filter(x => !getMacroCategoryForCode(x.code));
        else rows = rows.filter(x => getMacroCategoryForCode(x.code) === catF);
      }

      // Inventario per sede: di default nasconde le righe con 0 pezzi (articolo non presente in questa sede)
      if (flt === "all") rows = rows.filter(x => (Number(x.qty) || 0) !== 0 || x.__bothZero === true);

      // mantiene la logica "scorta bassa" basata su soglia
      if (flt === "low") rows = rows.filter(x => (Number(x.qty)||0) < (Number(x.threshold)||0));
      if (flt === "zero") rows = rows.filter(x => (Number(x.qty)||0) === 0);

      if (pillStock) pillStock.textContent = `${rows.length} righe`;
      if (!stockTbody) return;

      __stockRowByKey = new Map();

      if (rows.length === 0) {
        stockTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessun risultato.</td></tr>';
        return;
      }

      // Limite per performance (mobile)
      const max = 800;
      const show = rows.slice(0, max);

      // cache per click riga
      __stockRowByKey = new Map(show.map(r => [stockRowKey(r.customer, r.code, r.warehouse), r]));

      stockTbody.innerHTML = show.map(r => {
        const k = stockRowKey(r.customer, r.code, r.warehouse);
        const warn = (Number(r.qty)||0) < (Number(r.threshold)||0);
        const qtyColor = warn ? "var(--danger)" : "rgba(0,0,0,.86)";
        const qtyVal = safeInt(r.qty);
        const uom = __normalizeUom(r.uom || "") || getUomResolvedForCode(r.code || "") || "pz";

        const isGroup = (r.__isAliasGroup && Array.isArray(r.__codes) && r.__codes.length > 1);

        const qtyCell = `
            <div class="qty-editor">
              <input class="qtyEditInput jsQtyEdit" type="number" inputmode="numeric" min="0" step="1"
                value="${qtyVal}" data-orig="${qtyVal}" style="color:${qtyColor}" />
              <span class="td-muted" style="font-size:12px; font-weight:900; min-width:34px; text-align:left;">${escapeHtml(uom)}</span>
              <button class="btn btn-primary btn-xs jsQtySave" type="button" disabled>Salva</button>
            </div>`;

        const cat = getMacroCategoryForCode(r.code);
        const col = macroCatColor(cat);
        const dot = `<span class="catDot" style="${col ? ("background:" + escapeHtmlAttr(col) + ";") : ""}"></span>`;
        const catHtml = cat ? `<span class="pill catPill" style="padding:2px 8px;">${dot}${escapeHtml(macroCatLabel(cat))}</span>` : '<span class="td-muted">—</span>';

        const displayCode = escapeHtml(r.__displayCode || r.code || "");
        const displayName = escapeHtml(r.item || "");

        return `
          <tr data-k="${escapeHtmlAttr(k)}" title="${isGroup ? "Apri gruppo alias" : "Apri dettagli / imposta categoria"}">
            <td data-label="Nome articolo">${displayName}</td>
            <td data-label="Cod. articolo">${displayCode}</td>
            <td data-label="Categoria">${catHtml}</td>
            <td data-label="Q.tà" class="qty">${qtyCell}</td>
          </tr>`;
      }).join("");

      // niente più bottoni Carico/Scarico in tabella
    }



    async function adjustStockAbsoluteFromRow(row, newAbsQty) {
      const r = row || {};
      const oldQty = safeInt(r.qty);
      let newQty = safeInt(newAbsQty);
      if (!Number.isFinite(newQty) || newQty < 0) newQty = 0;
      const delta = newQty - oldQty;
      if (!delta) return;

      const __uom = __normalizeUom(r.uom || "") || getUomResolvedForCode(r.code || "") || "pz";

      const mv = makeMovement({
        type: delta > 0 ? "IN" : "OUT",
        customer: r.customer || "",
        code: r.code || "",
        item: r.item || "",
        qty: Math.abs(delta),
        date: todayYYYYMMDD(),
        note: `Rettifica inventario: da ${oldQty} ${__uom} a ${newQty} ${__uom}`,
        uom: __uom,
        qtyRaw: `${Math.abs(delta)} ${__uom}`.trim(),
        warehouse: r.warehouse || __currentWarehouse || "",
        source: "Rettifica rapida",
        rawText: ""
      });

      await addMovement(mv);
      showToast(`Quantità aggiornata (${oldQty}→${newQty}) ${__uom}`);
    }


    // Rettifica quantità per ARTICOLO UNIFICATO (alias group):
    // - Il totale mostrato è la somma dei membri (codici) nella stessa sede
    // - Se aumento: carico sul membro "primario" (o il primo disponibile)
    // - Se diminuisco: scarico distribuendo sui membri (parto da quello con più pezzi)
    async function adjustStockAbsoluteFromAliasGroupRow(row, newAbsQty) {
      const g = row || {};
      const oldTotal = safeInt(g.qty);
      let newTotal = safeInt(newAbsQty);
      if (!Number.isFinite(newTotal) || newTotal < 0) newTotal = 0;

      const delta = newTotal - oldTotal;
      if (!delta) return;

      const wh = normalizeWarehouse(g.warehouse || __currentWarehouse || "");
      const __uom = __normalizeUom(g.uom || "") || getUomResolvedForCodes(g.__codes || []) || "pz";
      const noteBase = `Rettifica inventario (alias): totale da ${oldTotal} ${__uom} a ${newTotal} ${__uom}`;

      const membersRaw = Array.isArray(g.__members) ? g.__members.slice() : [];
      const members = membersRaw.map(m => ({
        customer: String(m && m.customer || "").trim(),
        code: String(m && m.code || "").trim(),
        item: String(m && m.item || "").trim(),
        qty: safeInt(m && m.qty),
        warehouse: normalizeWarehouse((m && m.warehouse) || wh)
      })).filter(m => !!m.code);

      if (!members.length) {
        // fallback (non dovrebbe succedere): usa la riga così com'è
        await adjustStockAbsoluteFromRow(g, newTotal);
        return;
      }

      // Customer fallback (non creare mai un "nuovo" cliente vuoto se posso evitarlo)
      const custFallback = Array.isArray(g.__customers)
        ? String(g.__customers.find(x => String(x || "").trim()) || "").trim()
        : "";

      const mvs = [];

      if (delta > 0) {
        // Preferisci il codice primario
        const primaryCode = String(g.code || "").trim();
        let target = members.find(m => m.code === primaryCode && m.customer) ||
                     members.find(m => m.code === primaryCode) ||
                     members.find(m => m.customer) ||
                     members[0];

        const cust = target.customer || custFallback || String(g.customer || "").trim();
        const code = target.code || primaryCode || String(g.code || "").trim();
        const item = target.item || String(g.item || "") || code;

        mvs.push(makeMovement({
          type: "IN",
          customer: cust,
          code,
          item,
          qty: Math.abs(delta),
          date: todayYYYYMMDD(),
          note: noteBase,
        uom: __uom,
        qtyRaw: `${Math.abs(delta)} ${__uom}`.trim(),
          warehouse: wh,
          source: "Rettifica rapida",
          rawText: ""
        }));
      } else {
        let remaining = Math.abs(delta);
        const available = members.reduce((sum, m) => sum + safeInt(m.qty), 0);
        if (available < remaining) {
          showToast("Errore: lo stock del gruppo non è sufficiente per questa rettifica", "err");
          return;
        }

        const sorted = members.slice().sort((a, b) => safeInt(b.qty) - safeInt(a.qty));

        for (const m of sorted) {
          if (remaining <= 0) break;
          const take = Math.min(safeInt(m.qty), remaining);
          if (!take) continue;

          const cust = m.customer || custFallback || String(g.customer || "").trim();
          const code = m.code || String(g.code || "").trim();
          const item = m.item || String(g.item || "") || code;

          mvs.push(makeMovement({
            type: "OUT",
            customer: cust,
            code,
            item,
            qty: take,
            date: todayYYYYMMDD(),
            note: noteBase,
        uom: __uom,
        qtyRaw: `${take} ${__uom}`.trim(),
            warehouse: wh,
            source: "Rettifica rapida",
            rawText: ""
          }));

          remaining -= take;
        }
      }

      if (!mvs.length) return;

      // Batch write (1 render locale invece di N)
      await addMovementsBatch(mvs);

      showToast(`Quantità aggiornata (${oldTotal}→${newTotal}) ${__uom}`);
    }


    function renderMovementsTable() {
      const max = Math.max(5, Math.floor(Number(state.settings.maxRecent) || 30));
      const docs = (__docGroups || []).slice(0, max);

      if (pillMov) pillMov.textContent = String((__docGroups || []).length);
      if (!movTbody) return;

      if (docs.length === 0) {
        movTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessun documento ancora.</td></tr>';
        return;
      }

      movTbody.innerHTML = docs.map(g => {
        const label = formatDocLabel(g);
        const lines = (g.movements || []).length;
        const pieces = (g.movements || []).reduce((sum, mv) => sum + safeInt(mv.qty), 0);

        return `
          <tr class="docRow" data-dockey="${escapeHtmlAttr(g.key)}" title="Apri dettaglio">
            <td data-label="Documento"><strong>${escapeHtml(label)}</strong></td>
            <td data-label="Fornitore">${escapeHtml(g.customer || "")}</td>
            <td data-label="Righe" class="qty">${Number(lines).toLocaleString("it-IT")}</td>
            <td data-label="Pezzi" class="qty">${Number(pieces).toLocaleString("it-IT")}</td>
          </tr>
        `;
      }).join("");
    }

    function renderFlowsTable() {
      if (!flowsTbody) return;
      const max = Math.max(10, Math.floor(Number(state.settings.maxRecent) || 50));
      const docs = (__docGroups || []).slice(0, max);

      if (pillFlowsCount) pillFlowsCount.textContent = String((__docGroups || []).length);

      if (docs.length === 0) {
        flowsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessun flusso ancora.</td></tr>';
        return;
      }

      flowsTbody.innerHTML = docs.map(g => {
        const label = formatDocLabel(g);
        const lines = (g.movements || []).length;
        const pieces = (g.movements || []).reduce((sum, mv) => sum + safeInt(mv.qty), 0);

        return `
          <tr class="docRow" data-dockey="${escapeHtmlAttr(g.key)}" title="Modifica flusso">
            <td data-label="Documento"><strong>${escapeHtml(label)}</strong></td>
            <td data-label="Fornitore">${escapeHtml(g.customer || "")}</td>
            <td data-label="Righe" class="qty">${Number(lines).toLocaleString("it-IT")}</td>
            <td data-label="Pezzi" class="qty">${Number(pieces).toLocaleString("it-IT")}</td>
          </tr>
        `;
      }).join("");
    }

function renderAll() {
      const stockArr = computeStock();
      const stockByWh = computeStockByWarehouse();
      rebuildDocGroupsCache();

      // Home / KPI: totale (somma di tutti i magazzini)
      renderStats(stockArr);
      renderLowStockBoard(stockByWh);
      renderCategoryBoardCerea(stockByWh);
      renderInventoryTrend(stockArr);


      // Inventario: mostra tabella solo dopo scelta sede
      if (__currentWarehouse) {
        const wh = normalizeWarehouse(__currentWarehouse);
        const invRows = buildInventoryRowsForWarehouse(wh, stockByWh || []);
        renderCustomerOptions(invRows);
        renderCategoryOptions();
        renderStockTable(invRows);
      } else {
        try {
          if (filterCustomer) filterCustomer.innerHTML = '<option value="">Tutti</option>';
          try{ renderCategoryOptions(); }catch(_){ }
          if (pillStock) pillStock.textContent = "Seleziona";
          if (stockTbody) stockTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Seleziona un inventario.</td></tr>';
        } catch(_){}
      }

      renderMovementsTable();
      renderFlowsTable();
      try{ window.HubMovements && typeof window.HubMovements.render === "function" && window.HubMovements.render(); }catch(_){ }
      try{ window.HubCategories && typeof window.HubCategories.render === "function" && window.HubCategories.render(); }catch(_){ }
      // Se il modale Modifica flusso è aperto, aggiorna anche la lista righe
      if (modalFlowEdit && modalFlowEdit.classList.contains("open") && __currentFlowEditKey) {
        try { renderFlowEditItems(); } catch(_){ }
      }
      // Se la vista dettaglio fornitore è aperta, aggiorna i documenti collegati (DDT / OCR)
      if (modalSupplier && modalSupplier.classList.contains("open")) {
        try { renderSupplierLinkedDocs(); } catch {}
      }
    }



    /****************************************************************
     * Anagrafica (Fornitori / Prodotti) — realtime render
     ****************************************************************/
    function h(s) {
      return String(s ?? "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[ch]));
    }

    // cache gruppi prodotti (alias) per apertura dettaglio
    let __prodGroupsMap = new Map();

    function renderAnag() {
      if (!anagTbody || !anagTheadRow) return;

      const qRaw = (searchAnag?.value || "").trim();
      const q = normTextKey(qRaw);

      // UI: filtri specifici prodotti (tendine)
      try{ renderAnagProductsFiltersUI(); }catch(_){ }


      // Tabs
      if (activeAnagTab === "products") {
                // filtro macro (Materie prime / Imballaggi)
        let __filteredProducts = Array.isArray(products) ? products.slice() : [];
        try{
          const mg = normalizeProductsMacroGroup(activeProductsMacroGroup);
          if (mg){
            __filteredProducts = __filteredProducts.filter(p => {
              const code = String(p?.code || p?.id || "").trim();
              const catKey = getMacroCategoryForCode(code);
              return categoryMacroGroup(catKey) === mg;
            });
          }
        }catch(_){ }

        // sotto-filtro categoria (tendina)
        try{
          const catSel = String(anagProdCategoryFilter?.value || "").trim();
          if (catSel){
            __filteredProducts = __filteredProducts.filter(p => {
              const code = String(p?.code || p?.id || "").trim();
              const catKey = getMacroCategoryForCode(code);
              if (catSel === "__none") return !catKey;
              return catKey === catSel;
            });
          }
        }catch(_){ }

        const __unifiedFilter = String(anagProdUnifiedFilter?.value || "all");
        const __sortMode = String(anagProdSort?.value || "name_asc");

try{
          if (window.HubProducts && typeof window.HubProducts.renderAnagProducts === "function") {
            __prodGroupsMap = window.HubProducts.renderAnagProducts({
              products: __filteredProducts,
              fbUser: fb.user,
              anagTbody,
              anagTheadRow,
              anagTable,
              searchAnag,
              escapeHtml,
              escapeHtmlAttr,
              normTextKey,
              safeDecodeUri,
              unifiedFilter: __unifiedFilter,
              sortMode: __sortMode
            }) || new Map();
            return;
          }
        }catch(e){
          console.warn("HubProducts render failed", e);
        }

        // Fallback (se il file non è caricato)
        try { if (anagTable) anagTable.classList.add("anagTableProducts"); } catch(_){}
        try { if (searchAnag) searchAnag.placeholder = "Nome, codice, alias…"; } catch(_){}
        try {
          anagTheadRow.innerHTML = `
            <th>Alias / Nome</th>
            <th>Codici</th>
            <th class="qty">N.</th>
            <th>Azioni</th>
          `;
        } catch(_){}
        if (anagTbody) anagTbody.innerHTML = `<tr><td class="td-muted" colspan="4">Modulo prodotti non caricato.</td></tr>`;
        return;
      }

      if (anagTable) anagTable.classList.remove("anagTableProducts");
      // Default: fornitori
      try { if (searchAnag) searchAnag.placeholder = "Nome, P.IVA, città, codice…"; } catch(_){}

      anagTheadRow.innerHTML = `
        <th>Nome</th><th>P.IVA</th><th>Città</th><th>Prov.</th><th>Contatti</th><th>Azioni</th>
      `;

      if (!fb.user) {
        anagTbody.innerHTML = `<tr><td class="td-muted" colspan="6">Accedi con Google per sincronizzare i fornitori.</td></tr>`;
        return;
      }

      const list = Array.isArray(suppliers) ? suppliers : [];
      const filtered = q ? list.filter(s => {
        const hay = [
          s?.name || "", s?.vat || "", s?.code || "", s?.city || "", s?.province || "",
          ...(Array.isArray(s?.search) ? s.search : [])
        ].join(" ");
        return normSupplierKey(hay).includes(q);
      }) : list;

      if (!filtered.length) {
        anagTbody.innerHTML = `<tr><td class="td-muted" colspan="6">Nessun fornitore.</td></tr>`;
        return;
      }

      const show = filtered.slice(0, 500);

      anagTbody.innerHTML = show.map(s => {
        const name = escapeHtml(s.name || "—");
        const vat = escapeHtml(s.vat || "—");
        const city = escapeHtml(s.city || "—");
        const prov = escapeHtml(s.province || "—");
        const contacts = [s.phone, s.email].filter(Boolean).map(x => escapeHtml(x)).join("<br>") || '<span class="td-muted">—</span>';

        return `
          <tr data-supplier-id="${escapeHtmlAttr(s.id)}" title="Apri fornitore">
            <td data-label="Nome"><strong>${name}</strong></td>
            <td data-label="P.IVA">${vat}</td>
            <td data-label="Città">${city}</td>
            <td data-label="Prov.">${prov}</td>
            <td data-label="Contatti" class="td-muted">${contacts}</td>
            <td data-label="Azioni" class="td-actions">
              <div class="inlineRow" style="justify-content:flex-end; gap:8px;">
                <button class="btn btn-ghost btn-xs" type="button" data-action="supplierDocs" data-id="${escapeHtmlAttr(s.id)}">Apri</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }



// ===== Fornitore: modalità Edit + Salva (senza staccare i documenti collegati) =====
let __supEditMode = false;
let __supEditSnapshot = null;
let __supSaving = false;

const __SUP_EDIT_FIELDS = [
  { k: "name", label: "Nome / Ragione sociale", spanAll: true, required: true },
  { k: "code", label: "Codice", spanAll: false },
  { k: "vat", label: "P.IVA", spanAll: false },
  { k: "fiscalCode", label: "Codice Fiscale", spanAll: false },
  { k: "address", label: "Indirizzo", spanAll: true },
  { k: "cap", label: "CAP", spanAll: false },
  { k: "city", label: "Città", spanAll: false },
  { k: "province", label: "Provincia", spanAll: false },
  { k: "region", label: "Regione", spanAll: false },
  { k: "country", label: "Nazione", spanAll: false },
  { k: "phone", label: "Telefono", spanAll: false },
  { k: "mobile", label: "Cellulare", spanAll: false },
  { k: "email", label: "Email", spanAll: true },
  { k: "pec", label: "PEC", spanAll: true },
  { k: "homepage", label: "Home page", spanAll: true },
  { k: "loginWeb", label: "Login web", spanAll: true },
];

function renderSupplierFieldsUI(sup, isEdit) {
  if (!supFields) return;
  const s = sup || {};
  const cells = [];

  for (const f of __SUP_EDIT_FIELDS) {
    let v = "";
    if (f.k === "code") v = String(s.code || "");
    else v = String(s[f.k] || "");

    const trimmed = String(v || "").trim();

    // View mode: mostra solo i campi compilati (niente vuoti / niente placeholder)
    if (!isEdit && !trimmed) continue;

    const style = f.spanAll ? ' style="grid-column: 1 / -1;"' : "";
    const label = `${h(f.label)}${(isEdit && f.required) ? " *" : ""}`;

    if (isEdit) {
      cells.push(`
        <div class="field"${style}>
          <label>${label}</label>
          <input id="supEdit_${h(f.k)}" value="${h(v || "")}" ${f.required ? 'required' : ''} />
        </div>
      `);
    } else {
      cells.push(`
        <div class="kv"${style}>
          <div class="k">${h(f.label)}</div>
          <div class="v">${h(trimmed)}</div>
        </div>
      `);
    }
  }

  if (!cells.length && !isEdit) {
    supFields.innerHTML = `<div class="td-muted" style="padding: 6px 0;">Nessun dettaglio disponibile.</div>`;
    return;
  }

  supFields.innerHTML = cells.join("");
}

function setSupplierEditMode(on) {
  const sup = getSupplierByIdLocal(currentSupplierId);
  if (!sup) return;

  __supEditMode = !!on;

  // toggle buttons
  try { if (btnSupEdit) btnSupEdit.style.display = __supEditMode ? "none" : "inline-flex"; } catch {}
  try { if (btnSupSave) btnSupSave.style.display = __supEditMode ? "inline-flex" : "none"; } catch {}
  try { if (btnSupCancelEdit) btnSupCancelEdit.style.display = __supEditMode ? "inline-flex" : "none"; } catch {}

  // snapshot only when entering edit
  if (__supEditMode) {
    __supEditSnapshot = JSON.parse(JSON.stringify(sup || {}));
  }

  // title/sub
  try { supTitle.textContent = sup.name || "Fornitore"; } catch {}
  try {
    const _code = String(sup.code || sup.id || "").trim();
    const _loc = [sup.city, sup.province].filter(x => String(x || "").trim()).join(" ").trim();
    const _parts = [];
    if (_code) _parts.push(`Codice: ${_code}`);
    if (_loc) _parts.push(_loc);
    supSub.textContent = _parts.join(" • ");
  } catch {}

  renderSupplierFieldsUI(sup, __supEditMode);

  if (__supEditMode) {
    try { document.getElementById("supEdit_name")?.focus(); } catch {}
  }
}

function __readSupplierEditDraft() {
  const out = {};
  for (const f of __SUP_EDIT_FIELDS) {
    const el = document.getElementById("supEdit_" + f.k);
    out[f.k] = (el && typeof el.value === "string") ? el.value.trim() : "";
  }
  return out;
}

function __mergeSupplierSearchKeepingHistory(currentSup, snapshotSup, nextSup) {
  const prev = Array.isArray(currentSup?.search) ? currentSup.search : [];
  const extras = [
    currentSup?.name, currentSup?.vat, currentSup?.code,
    snapshotSup?.name, snapshotSup?.vat, snapshotSup?.code,
    nextSup?.name, nextSup?.vat, nextSup?.code
  ].filter(Boolean);

  const all = prev.concat(extras);
  const merged = [];
  const seen = new Set();
  for (const x of all) {
    const v = String(x || "").trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(v);
  }
  return merged.slice(0, 50);
}

// ===== Auto-merge fornitori duplicati (stesso Nome + stessa P.IVA) =====
let __supAutoMerging = false;

function __supplierMergeKeyFromSup(s){
  try{
    const nameKey = normSupplierKey((s && s.name) ? s.name : "");
    const vatKey = __sup_cleanVat((s && (s.vat || s.vatNumber || s.piva || s.partitaIva)) ? (s.vat || s.vatNumber || s.piva || s.partitaIva) : "");
    if (!nameKey || !vatKey) return "";
    return nameKey + "|" + vatKey;
  }catch(_){
    return "";
  }
}

function __pickSupplierFieldMergeValue(primaryVal, secondaryVal){
  const p = String(primaryVal || "").trim();
  if (p) return primaryVal;
  const s = String(secondaryVal || "").trim();
  if (s) return secondaryVal;
  return primaryVal;
}

async function __mergeOneSupplierIntoPrimary(primaryId, secondaryId){
  const pid = String(primaryId || "");
  const sid = String(secondaryId || "");
  if (!pid || !sid || pid === sid) return;

  const p = getSupplierByIdLocal(pid);
  const s = getSupplierByIdLocal(sid);
  if (!p || !s) return;

  // Merge fields: non sovrascrive campi già presenti sul primary, ma riempie i vuoti prendendo dal secondary
  const merged = {};
  for (const f of __SUP_EDIT_FIELDS){
    const k = f && f.k;
    if (!k) continue;
    merged[k] = __pickSupplierFieldMergeValue(p[k], s[k]);
  }
  // Name + VAT: sono già uguali, ma assicurati che restino quelli del primary (quello che stai modificando)
  merged.name = p.name;
  merged.vat = p.vat;

  // Helpers / metadata
  merged.nameLower = String(merged.name || "").toLowerCase();
  merged.search = __mergeSupplierSearchKeepingHistory(p, s, merged);
  merged.updatedAt = serverTimestamp();
  merged.updatedBy = (fb.user && (fb.user.email || fb.user.uid)) ? (fb.user.email || fb.user.uid) : "";
  merged.lastSource = "MergeAuto";

  // Salva merge su primary
  await setDoc(doc(fb.db, "orgs", ORG_ID, "suppliers", pid), merged, { merge: true });

  // Elimina secondary (duplicato)
  try{
    await deleteDoc(doc(fb.db, "orgs", ORG_ID, "suppliers", sid));
  }catch(e){
    console.warn("delete duplicate supplier failed", e);
  }

  // Update locale immediato (oltre al realtime snapshot)
  try{
    const localPatch = { ...merged };
    delete localPatch.updatedAt;
    localPatch.updatedAtIso = new Date().toISOString();

    suppliers = (suppliers || [])
      .filter(x => String(x && x.id) !== sid)
      .map(x => (String(x && x.id) === pid ? { ...x, ...localPatch } : x));
  }catch(_){}
}

async function __maybeUnifySuppliersByNameVat(primaryId){
  if (__supAutoMerging) return false;
  if (!fb.user || !fb.db) return false;

  const pid = String(primaryId || "");
  const p = getSupplierByIdLocal(pid);
  if (!p) return false;

  const key = __supplierMergeKeyFromSup(p);
  if (!key) return false;

  const dups = (suppliers || []).filter(x => x && String(x.id) !== pid && __supplierMergeKeyFromSup(x) === key);
  if (!dups.length) return false;

  __supAutoMerging = true;
  try{
    // Merge tutti i duplicati nel primary
    for (const d of dups){
      await __mergeOneSupplierIntoPrimary(pid, d.id);
    }
    return true;
  }catch(e){
    console.warn("__maybeUnifySuppliersByNameVat failed", e);
    return false;
  }finally{
    __supAutoMerging = false;
  }
}


async function saveSupplierEdits() {
  if (__supSaving) return;
  if (!fb.user || !fb.db) return openModal("Accesso richiesto", "Accedi con Google per modificare l’anagrafica.");

  const sid = String(currentSupplierId || "");
  if (!sid) return;

  const currentSup = getSupplierByIdLocal(sid);
  if (!currentSup) return;

  const draft = __readSupplierEditDraft();

  const name = (typeof __sup_normSpaces === "function") ? __sup_normSpaces(draft.name) : String(draft.name || "").trim();
  if (!name) {
    openModal("Nome mancante", "Inserisci il nome / ragione sociale del fornitore.");
    return;
  }

  // Normalizzazioni soft (non aggressive)
  const clean = (v) => (typeof __sup_normSpaces === "function") ? __sup_normSpaces(v) : String(v || "").trim();

  const vatNorm = (typeof __sup_cleanVat === "function") ? __sup_cleanVat(draft.vat) : clean(draft.vat).toUpperCase();
  const cfNorm  = (typeof __sup_cleanFiscalCode === "function") ? __sup_cleanFiscalCode(draft.fiscalCode) : clean(draft.fiscalCode).toUpperCase();

  const patch = {
    name,
    nameLower: name.toLowerCase(),
    code: clean(draft.code),
    vat: vatNorm || "",
    fiscalCode: cfNorm || "",
    address: clean(draft.address),
    cap: clean(draft.cap),
    city: (typeof __sup_titleCase === "function") ? __sup_titleCase(clean(draft.city)) : clean(draft.city),
    province: clean(draft.province).toUpperCase(),
    region: (typeof __sup_titleCase === "function") ? __sup_titleCase(clean(draft.region)) : clean(draft.region),
    country: clean(draft.country).toUpperCase(),
    phone: clean(draft.phone),
    mobile: clean(draft.mobile),
    email: clean(draft.email),
    pec: clean(draft.pec),
    homepage: clean(draft.homepage),
    loginWeb: clean(draft.loginWeb),
    updatedAt: serverTimestamp(),
    updatedBy: fb.user.email || fb.user.uid,
    lastSource: "Manual"
  };

  // Regola critica: non "staccare" i documenti già collegati.
  // Manteniamo in `search` anche i valori precedenti (nome/PIVA/codice), così il matching resta valido.
  patch.search = __mergeSupplierSearchKeepingHistory(currentSup, __supEditSnapshot || {}, patch);

  __supSaving = true;
  try {
    if (btnSupSave) btnSupSave.disabled = true;

    await setDoc(doc(fb.db, "orgs", ORG_ID, "suppliers", sid), patch, { merge: true });

    // UI immediata (oltre al realtime snapshot)
    const localPatch = { ...patch };
    delete localPatch.updatedAt;
    localPatch.updatedAtIso = new Date().toISOString();

    suppliers = (suppliers || []).map(x => (String(x.id) === sid ? { ...x, ...localPatch } : x));

    // Se, dopo modifica, questo fornitore diventa uguale ad un altro (stesso Nome + stessa P.IVA), unificali automaticamente
    try { await __maybeUnifySuppliersByNameVat(sid); } catch(e){ console.warn("supplier auto-merge failed", e); }

    renderAnag();

    // refresh modal header + fields
    try { supTitle.textContent = patch.name || "Fornitore"; } catch {}
    try { supSub.textContent = `Codice: ${patch.code || sid || "—"} • ${patch.city || ""} ${patch.province || ""}`.trim(); } catch {}
    renderSupplierFieldsUI(getSupplierByIdLocal(sid) || { id: sid, ...localPatch }, false);

    // docs list should keep working (match via search storico)
    try { renderSupplierLinkedDocs(); } catch {}

    setSupplierEditMode(false);
    showToast("Fornitore aggiornato");
  } catch (e) {
    console.error("saveSupplierEdits failed", e);
    openModal("Errore", "Non sono riuscito a salvare le modifiche.");
  } finally {
    __supSaving = false;
    try { if (btnSupSave) btnSupSave.disabled = false; } catch {}
  }
}



function openSupplierModal(id) {
      if (!modalSupplier) return;
      const s = suppliers.find(x => x.id === id) || suppliers.find(x => String(x.code) === String(id));
      if (!s) return;

      currentSupplierId = s.id;

      // reset edit mode/UI
      __supEditMode = false;
      __supEditSnapshot = null;
      try { if (btnSupEdit) btnSupEdit.style.display = "inline-flex"; } catch {}
      try { if (btnSupSave) btnSupSave.style.display = "none"; } catch {}
      try { if (btnSupCancelEdit) btnSupCancelEdit.style.display = "none"; } catch {}

      supTitle.textContent = s.name || "Fornitore";
      supSub.textContent = `Codice: ${s.code || s.id || "—"} • ${s.city || ""} ${s.province || ""}`.trim();

      // View: mostra solo campi compilati
      renderSupplierFieldsUI(s, false);

      // docs
      supDocsTbody.innerHTML = `<tr><td class="td-muted" colspan="4">Caricamento…</td></tr>`;
      modalSupplier.classList.add("open");
      __syncBodyLockFromModals();
      renderSupplierLinkedDocs();
    }


function closeSupplierModal() {
      if (!modalSupplier) return;
      modalSupplier.classList.remove("open");
      __syncBodyLockFromModals();
      currentSupplierId = null;

      // reset edit mode
      __supEditMode = false;
      __supEditSnapshot = null;
      try { if (btnSupEdit) btnSupEdit.style.display = "inline-flex"; } catch {}
      try { if (btnSupSave) btnSupSave.style.display = "none"; } catch {}
      try { if (btnSupCancelEdit) btnSupCancelEdit.style.display = "none"; } catch {}

      try { fb.unsub.supplierDocs && fb.unsub.supplierDocs(); } catch {}
      fb.unsub.supplierDocs = null;
    }

    function normSupplierKey(v) {
      return String(v || "")
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
    }

    function supplierMatchesCustomer(sup, customerName) {
      const c = normSupplierKey(customerName);
      if (!c) return false;

      const candidates = []
        .concat(sup?.name || "")
        .concat(sup?.code || "")
        .concat(sup?.vat || "")
        .concat(Array.isArray(sup?.search) ? sup.search : [])
        .filter(Boolean)
        .map(normSupplierKey);

      if (candidates.includes(c)) return true;

      // token containment (tollerante a "SRL", punteggiatura, spazi)
      const cTok = new Set(c.split(" ").filter(Boolean));
      for (const cand of candidates) {
        const t = cand.split(" ").filter(Boolean);
        if (t.length >= 2 && t.every(w => cTok.has(w))) return true;
        if (t.length === 1 && t[0] && t[0].length >= 5 && c.includes(t[0])) return true;
      }
      return false;
    }

    function getSupplierByIdLocal(id) {
      const sid = String(id || "");
      return (suppliers || []).find(x => String(x.id) === sid) || null;
    }

    function renderSupplierLinkedDocs() {
      if (!supDocsTbody) return;

      const sup = getSupplierByIdLocal(currentSupplierId);
      if (!sup) {
        supDocsTbody.innerHTML = `<tr><td class="td-muted" colspan="4">Fornitore non trovato.</td></tr>`;
        return;
      }

      const supVat = __sup_cleanVat(sup.vat || sup.vatNumber || sup.piva || sup.partitaIva || "");
      const docs = (__docGroups || []).filter(g => {
        const gVat = __sup_cleanVat(g.supplierVat || g.vat || g.supplierVatNorm || "");
        if (supVat && gVat && supVat === gVat) return true;
        return supplierMatchesCustomer(sup, g.customer);
      });
      if (!docs.length) {
        supDocsTbody.innerHTML = `<tr><td class="td-muted" colspan="4">Nessun documento collegato a questo fornitore.</td></tr>`;
        return;
      }

      const rows = docs.slice(0, 200).map(g => {
        const label = formatDocLabel(g);
        const day = formatDateOnlyIT(g.date) || "—";
        const noteTxt = String(g.note || "").trim();
        const lines = safeInt((g.movements || []).length);
        const pieces = (g.movements || []).reduce((sum, mv) => sum + safeInt(mv.qty), 0);

        const noteHtml = noteTxt ? `<div>${h(noteTxt)}</div>` : "";
        const metaHtml = `<div class="td-muted">Righe: ${h(lines.toLocaleString("it-IT"))} · Pezzi: ${h(pieces.toLocaleString("it-IT"))}</div>`;

        return `
          <tr class="docRow" data-dockey="${escapeHtmlAttr(g.key)}" title="Apri dettaglio">
            <td data-label="Data">${h(day)}</td>
            <td data-label="Nome file"><strong>${h(label)}</strong></td>
            <td data-label="Note" class="td-muted">${noteHtml}${metaHtml}</td>
            <td data-label="Apri"><button class="btn btn-ghost btn-xs" type="button" data-open-doc="${escapeHtmlAttr(g.key)}">Apri</button></td>
          </tr>
        `;
      }).join("");

      supDocsTbody.innerHTML = rows;
    }

// ===== Fornitore: eliminazione con cascata documenti (DDT/OCR) =====
let __deletingSupplier = false;

async function __deleteLegacySupplierAttachments(supplierId){
  // Best effort: elimina eventuali allegati legacy in /suppliers/{id}/documents (se esistono),
  // inclusi i file su Storage quando c'è storagePath.
  if (!fb.user || !fb.db) return;
  try{
    const colRef = collection(fb.db, "orgs", ORG_ID, "suppliers", String(supplierId), "documents");
    const snap = await getDocs(colRef);
    if (!snap || !snap.docs || snap.docs.length === 0) return;

    await Promise.all(snap.docs.map(async (d) => {
      const data = d.data ? (d.data() || {}) : {};
      const storagePath = String(data.storagePath || "");
      try { await deleteDoc(d.ref); } catch(e){ console.warn("delete legacy doc ref failed", e); }
      if (storagePath && fb.storage) {
        try { await deleteObject(sRef(fb.storage, storagePath)); } catch(e){ /* ignore */ }
      }
    }));
  }catch(e){
    console.warn("__deleteLegacySupplierAttachments warning", e);
  }
}

async function deleteSupplierCascade(supplierId){
  const sid = String(supplierId || "");
  if (!sid) return;

  if (__deletingSupplier) return;
  if (!fb.user || !fb.db) {
    openModal("Accesso richiesto", "Accedi con Google per eliminare un fornitore.");
    return;
  }

  const sup = getSupplierByIdLocal(sid);
  if (!sup) { showToast("Fornitore non trovato"); return; }

  // aggiorna cache documenti per coerenza
  try { rebuildDocGroupsCache(); } catch(_){ }

  // Documenti collegati = stessi che vedi in dettaglio fornitore (derivati dai DDT/OCR)
  const linkedDocs = (__docGroups || []).filter(g => supplierMatchesCustomer(sup, g.customer));

  const idSet = new Set();
  linkedDocs.forEach(g => (g.movements || []).forEach(mv => { if (mv && mv.id) idSet.add(mv.id); }));
  const ids = Array.from(idSet);

  const labelName = (sup.name || "Fornitore");
  const nDocs = linkedDocs.length;
  const nRows = ids.length;

  const ok = confirm(
    `Eliminare il fornitore?\n\n${labelName}\n\nRegola critica: verranno eliminati anche tutti i documenti associati (cascata).\nDocumenti: ${nDocs}\nRighe: ${nRows}`
  );
  if (!ok) return;

  __deletingSupplier = true;

  // UI: prevenzione doppio click
  try { if (btnSupDelete) btnSupDelete.disabled = true; } catch(_){}
  try { closeDocDetail(); } catch(_){}

  try{
    // 1) Elimina movimenti/documenti (DDT/OCR) collegati
    if (ids.length) {
      try{ await trashPut({ kind:"flow", label: label, target:{ col:"movements", ids: ids }, data: { movements: (g.movements || []).map(mv => ({...mv})) } }); }catch(_){ }
      await deleteMovementsBulk(ids);
    }

    // 2) Elimina eventuali allegati legacy (best effort)
    await __deleteLegacySupplierAttachments(sid);

    // 3) Salva nel cestino (best effort)
    try{ await trashPut({ kind:"supplier", label: String((sup && sup.name) || (sup && sup.customer) || sid), target:{ col:"suppliers", id:sid }, data: { supplier: (sup ? {...sup} : null), linkedDocs: (linkedDocs || []).map(x => ({ ...x })) } }); }catch(_){ }

    // 4) Elimina fornitore
    await deleteDoc(doc(fb.db, "orgs", ORG_ID, "suppliers", sid));

    // UI immediata (oltre al realtime snapshot)
    suppliers = (suppliers || []).filter(x => String(x.id) !== sid);
    renderAnag();

    if (currentSupplierId === sid) closeSupplierModal();
    showToast("Fornitore eliminato");
  }catch(e){
    console.error("deleteSupplierCascade failed", e);
    openModal("Errore", "Non sono riuscito a eliminare il fornitore.");
  }finally{
    __deletingSupplier = false;
    try { if (btnSupDelete) btnSupDelete.disabled = false; } catch(_){}
  }
}


    function openProductAliasGroup(groupId){
      try{
        if (!modalProduct) return;
        const gid = String(groupId || "").trim();
        if (!gid) return;

        const g = (__prodGroupsMap && __prodGroupsMap.get) ? __prodGroupsMap.get(gid) : null;
        if (!g) {
          showToast("Gruppo non trovato");
          return;
        }

        const codes = Array.isArray(g.codes) ? g.codes : [];
        const alias = String(g.alias || g.label || "").trim();

        prodTitle.textContent = alias || "Prodotti";

        const rowsHtml = (g.items || []).slice(0, 300).map(it => {
          const code = String(it.code || "").trim();
          const name = String(it.name || code).trim();
          return `
            <tr>
              <td data-label="Codice"><span class="kbd">${escapeHtml(code)}</span></td>
              <td data-label="Nome">
                <div class="qty-editor" style="justify-content:flex-start;">
                  <input class="qtyEditInput jsProdNameInline" type="text" value="${escapeHtmlAttr(name)}" data-code="${escapeHtmlAttr(code)}" data-orig="${escapeHtmlAttr(name)}" />
                  <button class="btn btn-primary btn-xs jsProdNameSave" type="button" data-code="${escapeHtmlAttr(code)}" disabled>Salva</button>
                </div>
              </td>
              <td data-label="Azioni" class="td-actions">
                <div class="inlineRow flowActRow" style="justify-content:flex-end;">
                  <button class="btn btn-ghost btn-xs" type="button" data-open-code="${escapeHtmlAttr(code)}">Apri</button>
                  <button class="btn btn-danger btn-xs jsProdDeleteInline" type="button" data-code="${escapeHtmlAttr(code)}">Elimina</button>
                </div>
              </td>
            </tr>
          `;
        }).join("");

        prodFields.innerHTML = `
          <div class="field" style="grid-column: 1 / -1;">
            <label>Alias (unifica codici)</label>
            <div class="qty-editor" style="justify-content:flex-start;">
              <input id="prodGroupAlias" class="qtyEditInput" type="text" placeholder="Es. tappo d50" value="${escapeHtmlAttr(alias)}" />
              <button id="prodGroupAliasSave" class="btn btn-primary btn-xs" type="button">Applica a tutti</button>
              <button id="prodGroupAliasClear" class="btn btn-ghost btn-xs" type="button">Rimuovi</button>
            </div>
            <div class="td-muted" style="margin-top:6px;">
              Se due articoli hanno lo stesso alias, qui risultano <strong>unificati</strong>.
            </div>
          </div>

          <div class="field" style="grid-column: 1 / -1;">
            <label>Articoli raggruppati</label>
            <div class="tableWrap" style="max-height: 320px; overflow:auto;">
              <table class="dataGrid">
                <thead>
                  <tr>
                    <th style="width:180px">Codice</th>
                    <th>Nome</th>
                    <th style="width:120px">Apri</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || `<tr><td class="td-muted" colspan="3">Nessun articolo.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;

        const aInp = document.getElementById("prodGroupAlias");
        const aSave = document.getElementById("prodGroupAliasSave");
        const aClear = document.getElementById("prodGroupAliasClear");
        if (aSave && aInp) {
          aSave.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            const v = String(aInp.value || "").trim();
            await setProductAliasForCodes(codes, v);
          });
        }
        if (aClear && aInp) {
          aClear.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            aInp.value = "";
            await setProductAliasForCodes(codes, "");
          });
        }

        // inline name save enable + handlers
        prodFields.querySelectorAll("input.jsProdNameInline").forEach(inp => {
          const sync = () => {
            const wrap = inp.closest ? inp.closest(".qty-editor") : null;
            const btn = wrap ? wrap.querySelector("button.jsProdNameSave") : null;
            if (!btn) return;
            btn.disabled = String(inp.value || "").trim() === String(inp.dataset.orig || "").trim();
          };
          inp.addEventListener("input", sync);
          sync();
        });

        prodFields.querySelectorAll("button.jsProdNameSave").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            const wrap = btn.closest ? btn.closest(".qty-editor") : null;
            const inp = wrap ? wrap.querySelector("input.jsProdNameInline") : null;
            const code = String((inp && inp.dataset.code) || btn.dataset.code || "");
            if (!inp) return;
            const v = String(inp.value || "").trim();
            if (!v) return;
            btn.disabled = true;
            await setProductNameForCode(code, v);
            inp.dataset.orig = v;
          });
        });

        // inline delete (anagrafica prodotti)
        prodFields.querySelectorAll("button.jsProdDeleteInline").forEach(btn => {
          btn.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            const code = String(btn.getAttribute("data-code") || "").trim();
            if (!code) return;
            const ok = confirm(
              `Eliminare il prodotto dall’anagrafica?\n\nCodice: ${code}\n\nNota: elimina SOLO l’anagrafica prodotto (nome/alias/categoria). Movimenti e stock restano.`
            );
            if (!ok) return;
            const done = await deleteProductByCode(code, { skipConfirm: true, silent: true });
            if (done) {
              try { const tr = btn.closest("tr"); if (tr) tr.remove(); } catch(_){}
              showToast("Prodotto eliminato");
              // aggiorna contatori/lista in background
              try { renderAll(); renderAnag(); } catch(_){}
            }
          });
        });


        prodFields.querySelectorAll("button[data-open-code]").forEach(btn => {
          btn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            const code = String(btn.getAttribute("data-open-code") || "").trim();
            if (code) openProductModal(code, { __mode: "master", code });
          });
        });

        modalProduct.classList.add("open");
      }catch(e){
        console.warn("openProductAliasGroup failed", e);
      }
    }


    function openProductModal(id, ctx) {
      if (!modalProduct) return;

      // ctx opzionale: se assente, apriamo in modalità "master" (Anagrafica → Prodotti) usando lo stesso modale dell'Inventario
      const __hasCtx = !!(ctx && typeof ctx === "object");
      let __ctx = __hasCtx ? ctx : null;

      const code = String((__ctx && __ctx.code) || id || "").trim();
      if (!code) return;

      if (!__ctx) {
        __ctx = { __mode: "master", code };
      }

      // Auto: se l'alias unifica più codici, prepara il contesto gruppo (layout e bottoni identici all'Inventario)
      try{
        if (!__hasCtx) {
          const a0 = String(getAliasForCode(code) || "").trim();
          if (a0) {
            const aKey = normTextKey(a0);
            const codes = Array.from(new Set(
              (Array.isArray(products) ? products : [])
                .map(p => ({
                  code: String((p && (p.code || safeDecodeUri(p.id) || "")) || "").trim(),
                  alias: String((p && (p.alias || p.aliasName || "")) || "").trim()
                }))
                .filter(x => x.code && x.alias && normTextKey(x.alias) === aKey)
                .map(x => x.code)
            ));

            if (codes.length > 1) {
              __ctx.__isAliasGroup = true;
              __ctx.__alias = a0;
              __ctx.__codes = codes;

              // scegli sede "principale" per mostrare quantità dei membri come in Inventario
              let stockByWh = [];
              try { stockByWh = (typeof computeStockByWarehouse === "function") ? computeStockByWarehouse() : []; } catch(_){}
              const sumForWh = (w) => {
                const ww = normalizeWarehouse(w);
                let s = 0;
                for (const r of (stockByWh || [])) {
                  if (!r) continue;
                  if (normalizeWarehouse(r.warehouse || "") !== ww) continue;
                  const rc = String(r.code || "").trim();
                  if (!rc || !codes.includes(rc)) continue;
                  s += safeInt(r.qty);
                }
                return s;
              };
              const qC = sumForWh(WAREHOUSE_CEREA);
              const qK = sumForWh(WAREHOUSE_CONCA);
              const bestWh = (qK > qC) ? WAREHOUSE_CONCA : WAREHOUSE_CEREA;
              __ctx.warehouse = bestWh;

              const mem = (stockByWh || []).filter(r => r &&
                normalizeWarehouse(r.warehouse || "") === normalizeWarehouse(bestWh) &&
                codes.includes(String(r.code || "").trim())
              );
              __ctx.__members = mem;

              __ctx.qty = (normalizeWarehouse(bestWh) === normalizeWarehouse(WAREHOUSE_CONCA)) ? qK : qC;

              let thrMin = null;
              let last = "";
              for (const r of (mem || [])) {
                const t = safeInt(r.threshold);
                if (thrMin == null) thrMin = t;
                else thrMin = Math.min(thrMin, t);
                const ts = String(r.lastMoveAt || "");
                if (ts && (!last || ts > last)) last = ts;
              }
              __ctx.threshold = (thrMin == null) ? 0 : thrMin;
              if (last) __ctx.lastMoveAt = last;
            }
          }
        }
      }catch(_){}

      ctx = __ctx;

      const mode = (ctx && ctx.__mode) ? String(ctx.__mode) : ""; // "master" | ""
      const p = findProductByCode(code) || (products || []).find(x => x && (x.id === id)) || null;

      const isStockCtx = !!(ctx && (ctx.customer || ctx.warehouse || (ctx.qty !== undefined)));
      const isAliasGroup = !!(ctx && ctx.__isAliasGroup && Array.isArray(ctx.__codes) && ctx.__codes.length > 1);

      const alias = String((p && (p.alias || p.aliasName)) || (ctx && ctx.__alias) || "").trim();
      const title = (isAliasGroup ? (alias || String((ctx && ctx.item) || "Alias")) : String((p && p.name) || (ctx && ctx.item) || code)).trim() || "Prodotto";
      const cat = getMacroCategoryForCode(code);
      const uomSetting = (isAliasGroup && ctx && Array.isArray(ctx.__codes))
        ? (() => {
            const s = new Set();
            (ctx.__codes || []).forEach(c => { const u = getUomSettingForCode(c); if (u) s.add(u); });
            return (s.size === 1) ? Array.from(s)[0] : "";
          })()
        : getUomSettingForCode(code);
      const uomResolved = (isAliasGroup && ctx && Array.isArray(ctx.__codes)) ? (getUomResolvedForCodes(ctx.__codes) || "") : (getUomResolvedForCode(code) || "");
      const uomLabel = uomResolved || uomSetting || "";

      const wh = normalizeWarehouse((ctx && ctx.warehouse) || "");
      const lastTxt = (ctx && ctx.lastMoveAt) ? formatDateIT(ctx.lastMoveAt) : "—";
      const updTxt = (p && (p.updatedAt || p.updatedAtIso)) ? (tsToIso(p.updatedAt) || p.updatedAtIso || "") : "";

      prodTitle.textContent = title;

      // --- Header fields (Nome + Alias) ---
      const nameVal = String((p && p.name) || (ctx && ctx.item) || code).trim();
      const aliasHint = isAliasGroup ? "Alias del gruppo (applica a tutti i codici)" : "Alias (se uguale = unifica)";

      const headerHtml = `
        <div class="field" style="grid-column: 1 / -1;">
          <label>Nome (DB)</label>
          <div class="qty-editor" style="justify-content:flex-start;">
            <input id="prodNameEdit" class="qtyEditInput" type="text" value="${escapeHtmlAttr(nameVal)}" />
            <button id="prodNameSave" class="btn btn-primary btn-xs" type="button" disabled>Salva</button>
          </div>
          <div class="td-muted" style="margin-top:6px;">Modifica il nome salvato in anagrafica.</div>
        </div>

        <div class="field" style="grid-column: 1 / -1;">
          <label>Alias</label>
          <div class="qty-editor" style="justify-content:flex-start;">
            <input id="prodAliasEdit" class="qtyEditInput" type="text" placeholder="${escapeHtmlAttr(aliasHint)}" value="${escapeHtmlAttr(alias)}" />
            <button id="prodAliasSave" class="btn btn-primary btn-xs" type="button">Salva</button>
            <button id="prodAliasClear" class="btn btn-ghost btn-xs" type="button">Rimuovi</button>
          </div>
        </div>
      `;

      // --- Core fields ---
      const baseFields = [];
      if (!mode && isStockCtx && !isAliasGroup) {
        baseFields.push(`
          <div class="field">
            <label>Fornitore</label>
            <input value="${h((ctx && ctx.customer) || "")}" readonly />
          </div>
        `);
      }

      baseFields.push(`
        <div class="field">
          <label>Codice</label>
          <input value="${h(code)}" />
        </div>
      `);
      baseFields.push(`
        <div class="field">
          <label>U.M.</label>
          <select id="prodUomSelect">
            <option value="">Auto</option>
            <option value="nr">nr</option>
            <option value="pz">pz</option>
            <option value="kg">kg</option>
            <option value="ton">ton</option>
          </select>
          <div class="td-muted" style="margin-top:6px;">Auto = usa l’unità vista negli ultimi movimenti. Impostala per mostrare sempre la quantità corretta in Inventario e Movimenti.</div>
        </div>
      `);




// Fornitore (solo in Anagrafica prodotti)
if (mode === "master") {
  const supInfo = __getLastSupplierInfoForCode(code);
  const supName = (supInfo && supInfo.name) ? String(supInfo.name).trim() : "—";

  const metaParts = [];
  if (supInfo && supInfo.vat) metaParts.push(`P.IVA: ${h(supInfo.vat)}`);
  if (supInfo && supInfo.docNum) metaParts.push(`DDT: ${h(supInfo.docNum)}`);
  if (supInfo && supInfo.date) metaParts.push(`Data: ${h(formatDateOnlyIT(supInfo.date) || supInfo.date)}`);

  const meta = metaParts.join(" • ");

  baseFields.push(`
    <div class="field" style="grid-column: 1 / -1;">
      <label>Fornitore (ultimo carico)</label>
      <input value="${h(supName)}" readonly />
      <div class="td-muted" style="margin-top:6px;">
        ${meta ? meta : (supInfo ? "Derivato dall’ultimo documento di carico per questo codice." : "Nessun documento di carico trovato per questo codice.")}
      </div>
    </div>
  `);
}
      baseFields.push(`
        <div class="field" style="grid-column: 1 / -1;">
          <label>Categoria</label>
          <select id="prodCategorySelect">
            <option value="">Non assegnata</option>
            ${MACRO_CATEGORIES.map(c => `<option value="${h(c)}">${h(macroCatLabel(c))}</option>`).join("")}
          </select>
        </div>
      `);


      
      // Visibilità sedi (Cerea / Concamarise)
      if (!isAliasGroup) {
        baseFields.push(`
          <div class="field" style="grid-column: 1 / -1;">
            <label>Visibilità inventari</label>
            <div class="inlineRow" style="gap:16px; align-items:center;">
              <label class="inlineRow" style="gap:8px; font-weight:900; color: rgba(0,0,0,.82);">
                <input id="prodVisCerea" type="checkbox" />
                <span>Inventario Cerea</span>
              </label>
              <label class="inlineRow" style="gap:8px; font-weight:900; color: rgba(0,0,0,.82);">
                <input id="prodVisConca" type="checkbox" />
                <span>Inventario Concamarise</span>
              </label>
              <button id="prodVisSave" class="btn btn-primary btn-xs" type="button" disabled>Salva</button>
            </div>
            <div class="td-muted" style="margin-top:6px;">
              Se togli una sede, l’articolo non sarà visibile in quell’inventario.
            </div>
          </div>
        `);
      } else {
        baseFields.push(`
          <div class="field" style="grid-column: 1 / -1;">
            <label>Visibilità inventari</label>
            <div class="td-muted">
              Alias di più codici: apri un articolo univoco per impostare la visibilità sede.
            </div>
          </div>
        `);
      }

// Stock summary (solo master): totali per sede + apertura rapido del dettaglio inventario
      if (mode === "master") {
        try{
          const scopeCodes = (isAliasGroup && ctx && Array.isArray(ctx.__codes) && ctx.__codes.length) ? ctx.__codes : [code];
          let stockByWh = [];
          try { stockByWh = (typeof computeStockByWarehouse === "function") ? computeStockByWarehouse() : []; } catch(_){ stockByWh = []; }

          const sumWh = (w) => {
            const ww = normalizeWarehouse(w);
            let s = 0;
            for (const r of (stockByWh || [])) {
              if (!r) continue;
              if (normalizeWarehouse(r.warehouse || "") !== ww) continue;
              const rc = String(r.code || "").trim();
              if (!rc || !scopeCodes.includes(rc)) continue;
              s += safeInt(r.qty);
            }
            return s;
          };

          const qCerea = sumWh(WAREHOUSE_CEREA);
          const qConca = sumWh(WAREHOUSE_CONCA);

          const pickRow = (w) => {
            const ww = normalizeWarehouse(w);
            let best = null;
            for (const r of (stockByWh || [])) {
              if (!r) continue;
              if (normalizeWarehouse(r.warehouse || "") !== ww) continue;
              const rc = String(r.code || "").trim();
              if (!rc || !scopeCodes.includes(rc)) continue;
              const cust = String(r.customer || "").trim();
              if (!cust) continue;
              const q = safeInt(r.qty);
              if (!best || q > safeInt(best.qty)) best = r;
            }
            return best;
          };

          ctx.__pickStockCerea = pickRow(WAREHOUSE_CEREA);
          ctx.__pickStockConca = pickRow(WAREHOUSE_CONCA);

          const canC = !!ctx.__pickStockCerea;
          const canK = !!ctx.__pickStockConca;

          baseFields.push(`
            <div class="field" style="grid-column: 1 / -1;">
              <label>Stock per sede</label>
              <div class="stack" style="gap:8px;">
                <div class="inlineRow" style="justify-content: space-between; gap:10px; align-items:center; flex-wrap:wrap;">
                  <div>
                    <div><strong>Inventario Cerea</strong></div>
                    <div class="td-muted">Totale: ${Number(qCerea||0).toLocaleString("it-IT")} ${h(uomLabel || "pz")}</div>
                  </div>
                  <button id="prodOpenStockCerea" class="btn btn-secondary btn-xs" type="button" ${canC ? "" : "disabled"}>Apri dettaglio</button>
                </div>
                <div class="inlineRow" style="justify-content: space-between; gap:10px; align-items:center; flex-wrap:wrap;">
                  <div>
                    <div><strong>Inventario Concamarise</strong></div>
                    <div class="td-muted">Totale: ${Number(qConca||0).toLocaleString("it-IT")} ${h(uomLabel || "pz")}</div>
                  </div>
                  <button id="prodOpenStockConca" class="btn btn-secondary btn-xs" type="button" ${canK ? "" : "disabled"}>Apri dettaglio</button>
                </div>
              </div>
            </div>
          `);
        }catch(_){}
      }

      // Group members (stock alias groups)
      let groupHtml = "";
      if (isAliasGroup) {
        const codes = Array.isArray(ctx.__codes) ? ctx.__codes : [];
        const members = Array.isArray(ctx.__members) ? ctx.__members : [];
        const sumQty = Number(ctx.qty || 0);
        const thr = Number(ctx.threshold || 0);
        const uomG = getUomResolvedForCodes(codes) || uomLabel || "pz";

        const membersHtml = (members.length ? members : codes.map(c => ({ code: c }))).map(m => {
          const c = String(m.code || "").trim();
          const nm = getDisplayNameForCode(c, m.item || "");
          const q = (m.qty !== undefined) ? (safeInt(m.qty).toLocaleString("it-IT") + " " + uomG) : "—";
          return `
            <tr>
              <td data-label="Codice"><span class="kbd">${escapeHtml(c)}</span></td>
              <td data-label="Nome">${escapeHtml(nm || "—")}</td>
              <td data-label="Pezzi" class="qty">${escapeHtml(q)}</td>
              <td data-label="Apri" class="td-actions">
                <button class="btn btn-ghost btn-xs" type="button" data-open-code="${escapeHtmlAttr(c)}">Apri</button>
              </td>
            </tr>
          `;
        }).join("");

        groupHtml = `
          <div class="field" style="grid-column: 1 / -1;">
            <label>Stock totale (alias)</label>
            <input value="${Number(sumQty||0).toLocaleString("it-IT")} ${h(uomG)} (soglia min ${Number(thr||0).toLocaleString("it-IT")} ${h(uomG)})" readonly />
            <div class="td-muted" style="margin-top:6px;">Per rettifiche: apri un singolo codice dal gruppo.</div>
          </div>

          <div class="field" style="grid-column: 1 / -1;">
            <label>Articoli raggruppati</label>
            <div class="tableWrap" style="max-height: 320px; overflow:auto;">
              <table class="dataGrid">
                <thead>
                  <tr>
                    <th style="width:180px">Codice</th>
                    <th>Nome</th>
                    <th class="qty" style="width:110px">Q.tà</th>
                    <th style="width:120px">Apri</th>
                  </tr>
                </thead>
                <tbody>
                  ${membersHtml || `<tr><td class="td-muted" colspan="4">Nessun articolo.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Stock fields (single code only)
      let stockHtml = "";
      if (!isAliasGroup && !mode && isStockCtx) {
        const qtyVal = safeInt(ctx.qty);
        const thrKey = movementKey((ctx && ctx.customer) || "", code);

        stockHtml = `
          <div class="field">
            <label>Quantità in stock</label>
            ${(ctx && (ctx.qty !== undefined))
              ? `<div class="qty-editor" style="justify-content:flex-start;">
                  <input id="prodQtyEdit" class="qtyEditInput" type="number" inputmode="numeric" min="0" step="1"
                    value="${qtyVal}" data-orig="${qtyVal}" />
                  <span class="td-muted" style="font-size:12px; font-weight:900;">${h(uomLabel || "pz")}</span>
                  <button id="prodQtySave" class="btn btn-primary btn-xs" type="button" disabled>Salva</button>
                </div>`
              : `<input value="${h(Number(qtyVal).toLocaleString("it-IT"))}" readonly />`}
            <div class="td-muted" style="margin-top:6px;">Modifica la quantità per rettificare lo stock (crea un movimento IN/OUT di differenza).</div>
          </div>

          <div class="field">
            <label>Soglia sottoscorta</label>
            <div class="qty-editor" style="justify-content:flex-start;">
              <input id="prodThrEdit" class="qtyEditInput" type="number" inputmode="numeric" min="0" step="1"
                value="${safeInt((ctx && (ctx.threshold !== undefined)) ? ctx.threshold : getThresholdForKey(thrKey))}"
                data-orig="${safeInt((ctx && (ctx.threshold !== undefined)) ? ctx.threshold : getThresholdForKey(thrKey))}"
                placeholder="1000" />
              <button id="prodThrSave" class="btn btn-primary btn-xs" type="button" disabled>Salva</button>
              <button id="prodThrReset" class="btn btn-ghost btn-xs" type="button">Default</button>
            </div>
            <div class="td-muted" style="margin-top:6px;">Se non impostata: sotto scorta se &lt; 1000 ${h(uomLabel || "pz")}. (La soglia è per articolo, vale su entrambe le sedi)</div>
          </div>

          <div class="field">
            <label>Ultimo mov.</label>
            <input value="${h(lastTxt)}" readonly />
          </div>
          <div class="field">
            <label>Aggiornato</label>
            <input value="${h(updTxt || "—")}" readonly />
          </div>

          <div class="field" style="grid-column: 1 / -1;">
            <label>Inventario</label>
            <div class="inlineRow" style="justify-content: space-between; gap:10px; align-items:center; flex-wrap: wrap;">
              <input id="prodWarehouseMoveQty" class="qtyEditInput" type="number" inputmode="numeric" min="1" step="1"
                value="${qtyVal}" data-orig="${qtyVal}" placeholder="Q.tà" style="max-width: 140px;" />
              <select id="prodWarehouseSelect" style="flex: 1 1 220px; min-width: 220px;">
                <option value="cerea">Inventario Cerea</option>
                <option value="concamarise">Inventario Concamarise</option>
              </select>
              <button id="prodWarehouseMove" class="btn btn-secondary btn-xs" type="button" disabled>Sposta</button>
            </div>
          </div>
        `;
      }


      // Danger zone: elimina articolo (Inventario)
      let invDangerHtml = "";
      if (!mode && isStockCtx && !isAliasGroup) {
        const whLabel = wh ? warehouseLabel(wh) : "";
        invDangerHtml = `
          <div class="field" style="grid-column: 1 / -1;">
            <label>Azioni (Inventario)</label>
            <div class="inlineRow" style="justify-content:flex-end;">
              <button id="prodDeleteInventory" class="btn btn-danger" type="button">Elimina articolo</button>
            </div>
            <div class="td-muted" style="margin-top:6px;">
              Elimina tutte le righe/movimenti per questo <strong>Fornitore + Codice</strong> (anche su entrambe le sedi). Operazione irreversibile.
              ${whLabel ? (" (Stai visualizzando: " + h(whLabel) + ")") : ""}
            </div>
          </div>
        `;
      }

// Danger zone: elimina prodotto (solo da Anagrafica Prodotti)
      let dangerHtml = "";
      if (mode === "master" && !isAliasGroup) {
        dangerHtml = `
          <div class="field" style="grid-column: 1 / -1;">
            <label>Azioni</label>
            <div class="inlineRow" style="justify-content:flex-end;">
              <button id="prodDelete" class="btn btn-danger" type="button">Elimina prodotto</button>
            </div>
          </div>
        `;
      }

      prodFields.innerHTML = headerHtml + baseFields.join("") + groupHtml + stockHtml + invDangerHtml + dangerHtml;

      // U.M. select
      const uSel = document.getElementById("prodUomSelect");
      if (uSel) {
        uSel.value = uomSetting || "";
        uSel.addEventListener("change", async () => {
          const v = String(uSel.value || "");
          if (isAliasGroup) await setProductUomForCodes(ctx.__codes || [], v);
          else await setProductUomForCode(code, v);
          renderAll();
          showToast("U.M. salvata");
        });
      }

// Category select
      const sel = document.getElementById("prodCategorySelect");
      if (sel) {
        sel.value = cat || "";
        sel.addEventListener("change", async () => {
          await setMacroCategoryForCode(code, sel.value, (document.getElementById("prodNameEdit")?.value || title));
          renderAll();
          showToast("Categoria salvata");
        });
      }


      // Visibilità sedi (Cerea / Concamarise)
      const vC = document.getElementById("prodVisCerea");
      const vK = document.getElementById("prodVisConca");
      const vSave = document.getElementById("prodVisSave");
      if (vC && vK && vSave && !isAliasGroup) {
        const init = getWarehousesSettingForCode(code);
        const initC = (init == null) ? true : init.includes(WAREHOUSE_CEREA);
        const initK = (init == null) ? true : init.includes(WAREHOUSE_CONCA);

        vC.checked = !!initC;
        vK.checked = !!initK;

        vC.dataset.orig = vC.checked ? "1" : "0";
        vK.dataset.orig = vK.checked ? "1" : "0";

        const sync = () => {
          const oc = (vC.dataset.orig === "1");
          const ok = (vK.dataset.orig === "1");
          vSave.disabled = (vC.checked === oc) && (vK.checked === ok);
        };

        vC.addEventListener("click", (e) => e.stopPropagation());
        vK.addEventListener("click", (e) => e.stopPropagation());
        vC.addEventListener("change", sync);
        vK.addEventListener("change", sync);
        sync();

        vSave.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();

          const list = [];
          if (vC.checked) list.push(WAREHOUSE_CEREA);
          if (vK.checked) list.push(WAREHOUSE_CONCA);

          if (!list.length) {
            const ok0 = confirm("Stai togliendo l’articolo da entrambe le sedi. Non sarà più visibile in Inventario. Continuare?");
            if (!ok0) { sync(); return; }
          }

          vSave.disabled = true;
          const old = String(vSave.textContent || "Salva");
          vSave.textContent = "Salvo…";
          try{
            await setProductWarehousesForCode(code, list, { silent: true });
            vC.dataset.orig = vC.checked ? "1" : "0";
            vK.dataset.orig = vK.checked ? "1" : "0";
            showToast("Visibilità salvata");
            try{ renderAll(); }catch(_){}
          }catch(err){
            console.error(err);
            showToast("Errore salvataggio visibilità", "err");
          }finally{
            vSave.textContent = old;
            sync();
          }
        });
      }

      // Name save
      const nInp = document.getElementById("prodNameEdit");
      const nSave = document.getElementById("prodNameSave");
      if (nInp && nSave) {
        const sync = () => {
          const cur = String(nInp.value || "").trim();
          nSave.disabled = (cur === nameVal);
        };
        nInp.addEventListener("input", sync);
        sync();
        nSave.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();
          const v = String(nInp.value || "").trim();
          if (!v) return;
          nSave.disabled = true;
          await setProductNameForCode(code, v);
        });
      }

      // Alias save/clear
      const aInp = document.getElementById("prodAliasEdit");
      const aSave = document.getElementById("prodAliasSave");
      const aClear = document.getElementById("prodAliasClear");
      if (aSave && aInp) {
        aSave.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();
          const v = String(aInp.value || "").trim();
          if (isAliasGroup) {
            await setProductAliasForCodes(ctx.__codes || [], v);
          } else {
            await setProductAliasForCode(code, v);
          }
        });
      }
      if (aClear && aInp) {
        aClear.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();
          aInp.value = "";
          if (isAliasGroup) await setProductAliasForCodes(ctx.__codes || [], "");
          else await setProductAliasForCode(code, "");
        });
      }

      // Group open code buttons
      prodFields.querySelectorAll("button[data-open-code]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          const c = String(btn.getAttribute("data-open-code") || "").trim();
          if (!c) return;
          // try find member ctx
          const mem = (ctx && Array.isArray(ctx.__members)) ? ctx.__members.find(x => String(x.code||"").trim() === c) : null;
          if (mem && String(mem.customer || "").trim()) {
            openProductModal(c, mem);
          } else {
            openProductModal(c, { __mode: "master", code: c });
          }
        });
      });


      // Stock quick open (solo master)
      const openC = document.getElementById("prodOpenStockCerea");
      if (openC && ctx && ctx.__pickStockCerea) {
        openC.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          openProductModal(String(ctx.__pickStockCerea.code || code), ctx.__pickStockCerea);
        });
      }
      const openK = document.getElementById("prodOpenStockConca");
      if (openK && ctx && ctx.__pickStockConca) {
        openK.addEventListener("click", (e) => {
          e.preventDefault(); e.stopPropagation();
          openProductModal(String(ctx.__pickStockConca.code || code), ctx.__pickStockConca);
        });
      }


      // Stock-only bindings (qty/threshold/warehouse)
      const qInput = document.getElementById("prodQtyEdit");
      const qSave = document.getElementById("prodQtySave");
      if (qInput && qSave && ctx && (ctx.qty !== undefined) && !isAliasGroup) {
        const syncBtn = () => {
          let val = safeInt(qInput.value);
          if (!Number.isFinite(val) || val < 0) val = 0;
          const base = Number.isFinite(safeInt(qInput.dataset.orig)) ? safeInt(qInput.dataset.orig) : safeInt(ctx.qty);
          qSave.disabled = (val === base);
        };

        qInput.addEventListener("click", (e) => e.stopPropagation());
        qSave.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          let newQty = safeInt(qInput.value);
          if (!Number.isFinite(newQty) || newQty < 0) newQty = 0;

          const oldQty = safeInt(ctx.qty);
          if (newQty === oldQty) {
            qInput.value = String(oldQty);
            qInput.dataset.orig = String(oldQty);
            qSave.disabled = true;
            return;
          }

          qInput.disabled = true;
          qSave.disabled = true;
          qSave.textContent = "Salvo…";
          try {
            await adjustStockAbsoluteFromRow(ctx, newQty);
            ctx.qty = newQty;
            qInput.dataset.orig = String(newQty);
            qSave.textContent = "Salvato";
            setTimeout(() => { try { qSave.textContent = "Salva"; } catch(_){} }, 600);
          } catch (err) {
            console.error(err);
            showToast("Errore salvataggio quantità");
            qSave.textContent = "Salva";
          } finally {
            qInput.disabled = false;
            syncBtn();
          }
        });

        qInput.addEventListener("input", syncBtn);
        qInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (!qSave.disabled) qSave.click();
            else qInput.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            const base = safeInt(qInput.dataset.orig);
            qInput.value = String(Number.isFinite(base) ? base : 0);
            syncBtn();
            qInput.blur();
          }
        });

        syncBtn();
      }

      // Threshold bindings (single only)
      const tInput = document.getElementById("prodThrEdit");
      const tSave = document.getElementById("prodThrSave");
      const tReset = document.getElementById("prodThrReset");
      if (tInput && tSave && !isAliasGroup) {
        const thrKey = movementKey((ctx && ctx.customer) || "", code);

        const syncThrBtn = () => {
          const cur = String(tInput.value || "").trim();
          const base = String(tInput.dataset.orig || "").trim();
          tSave.disabled = (cur === base);
        };

        tInput.addEventListener("input", syncThrBtn);
        tInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); if (!tSave.disabled) tSave.click(); else tInput.blur(); }
          if (e.key === "Escape") { e.preventDefault(); tInput.value = String(tInput.dataset.orig || ""); syncThrBtn(); tInput.blur(); }
        });

        tSave.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();
          let v = safeInt(tInput.value);
          if (!Number.isFinite(v) || v < 0) v = 0;
          tSave.disabled = true;
          try {
            await setThresholdForKey(thrKey, v);
            tInput.dataset.orig = String(v);
            showToast("Soglia salvata");
            renderAll();
          } catch (err) {
            console.error(err);
            showToast("Errore salvataggio soglia");
          } finally {
            syncThrBtn();
          }
        });

        if (tReset) {
          tReset.addEventListener("click", async (e) => {
            e.preventDefault(); e.stopPropagation();
            tReset.disabled = true;
            try {
              await clearThresholdForKey(thrKey);
              const baseThr = getThresholdForKey(thrKey);
              ctx.threshold = baseThr;
              tInput.value = "";
              tInput.dataset.orig = "";
              renderAll();
              showToast("Soglia ripristinata");
            } catch (err) {
              console.error(err);
              showToast("Errore ripristino soglia");
            } finally {
              tReset.disabled = false;
              syncThrBtn();
            }
          });
        }

        // iniziale: se il valore coincide col default (nessun override), mostra input vuoto
        try {
          const hasOverride =
            (thresholds && Object.prototype.hasOwnProperty.call(thresholds, thrKey) && Number.isFinite(Number(thresholds[thrKey])))
            || (state && state.thresholds && Object.prototype.hasOwnProperty.call(state.thresholds, thrKey) && Number.isFinite(Number(state.thresholds[thrKey])));
          if (hasOverride) {
            const curThr = getThresholdForKey(thrKey);
            tInput.value = String(curThr);
            tInput.dataset.orig = String(curThr);
          } else {
            tInput.value = "";
            tInput.dataset.orig = "";
          }
          syncThrBtn();
        } catch (_) {}

        // Warehouse move (single only)
      const wSel = document.getElementById("prodWarehouseSelect");
      const wQty = document.getElementById("prodWarehouseMoveQty");
      const wBtn = document.getElementById("prodWarehouseMove");
      if (wSel && wBtn && wQty && ctx && !isAliasGroup) {
        wSel.value = wh;

        // default: tutto (come prima) se input vuoto/0
        try {
          const baseNow = safeInt(ctx.qty);
          const cur0 = safeInt(wQty.value);
          if (!cur0) wQty.value = String(Math.max(0, baseNow));
          if (wQty.dataset && (wQty.dataset.orig === undefined || wQty.dataset.orig === "")) {
            wQty.dataset.orig = String(Math.max(0, baseNow));
          }
        } catch(_) {}

        const sync = () => {
          const to = normalizeWarehouse(wSel.value);
          const qtyNow = safeInt(ctx.qty);
          let mvQty = safeInt(wQty.value);
          if (!Number.isFinite(mvQty)) mvQty = 0;
          wBtn.disabled = (to === wh) || qtyNow <= 0 || mvQty <= 0 || mvQty > qtyNow;
        };

        wSel.addEventListener("change", sync);
        wQty.addEventListener("input", sync);
        wQty.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); if (!wBtn.disabled) wBtn.click(); }
          if (e.key === "Escape") { e.preventDefault(); wQty.value = String(wQty.dataset.orig || ""); sync(); try{ wQty.blur(); }catch(_){ } }
        });
        sync();

        wBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const to = normalizeWarehouse(wSel.value);
          const qtyNow = safeInt(ctx.qty);
          let mvQty = safeInt(wQty.value);

          if (!Number.isFinite(mvQty) || mvQty <= 0) { showToast("Quantità non valida"); sync(); return; }
          if (mvQty > qtyNow) { showToast("Quantità superiore allo stock"); sync(); return; }
          if (to === wh) { showToast("Scegli un inventario diverso"); sync(); return; }

          const noteTxt = `Spostamento inventario (${mvQty} ${(uomLabel || 'pz')}): ${warehouseLabel(wh)} → ${warehouseLabel(to)}`;

          // Sposta quantità: scarico da WH attuale + carico su WH target (movimenti)
          const outMv = makeMovement({
            type: "OUT",
            customer: ctx.customer || "",
            code: code,
            item: (ctx.item || title || ""),
            qty: mvQty,
            uom: (uomLabel || ""),
            qtyRaw: `${mvQty} ${(uomLabel || "").trim()}`.trim(),
            date: todayYYYYMMDD(),
            note: noteTxt,
            warehouse: wh,
            source: "Spostamento"
          });
          const inMv = makeMovement({
            type: "IN",
            customer: ctx.customer || "",
            code: code,
            item: (ctx.item || title || ""),
            qty: mvQty,
            uom: (uomLabel || ""),
            qtyRaw: `${mvQty} ${(uomLabel || "").trim()}`.trim(),
            date: todayYYYYMMDD(),
            note: noteTxt,
            warehouse: to,
            source: "Spostamento"
          });

          wBtn.disabled = true;
          try {
            await addMovement(outMv);
            await addMovement(inMv);
            showToast(`Spostato ${mvQty} ${(uomLabel || 'pz')}`);
          } catch (err) {
            console.error(err);
            showToast("Errore spostamento");
          } finally {
            renderAll();
          }
        });
      }
      }
      // Elimina prodotto (solo anagrafica prodotti, non stock)
      const delBtn = document.getElementById("prodDelete");
      if (delBtn) {
        delBtn.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();
          try { delBtn.disabled = true; } catch(_){}
          const done = await deleteProductByCode(code);
          if (done) {
            try { modalProduct.classList.remove("open"); } catch(_){}
          } else {
            try { delBtn.disabled = false; } catch(_){}
          }
        });
      }

      // Elimina articolo (Inventario): rimuove tutti i movimenti per questo Cliente+Codice (tutte le sedi)
      const delInvBtn = document.getElementById("prodDeleteInventory");
      if (delInvBtn && !mode && isStockCtx && !isAliasGroup) {
        delInvBtn.addEventListener("click", async (e) => {
          e.preventDefault(); e.stopPropagation();

          const cust = String((ctx && ctx.customer) || "").trim();
          const itemK = movementKey(cust, code);

          // movimenti da eliminare (cliente+codice, tutte le sedi)
          let ids = [];
          try {
            ids = (state && Array.isArray(state.movements))
              ? state.movements
                  .filter(m => movementKey(String(m?.customer || ""), String(m?.code || "")) === itemK)
                  .map(m => String(m.id || "")).filter(Boolean)
              : [];
          } catch(_) { ids = []; }

          // stock attuale per sede (best effort)
          let qCerea = 0, qConca = 0;
          try{
            const rows = (typeof computeStockByWarehouse === "function") ? computeStockByWarehouse() : [];
            for (const r of (rows || [])) {
              if (!r) continue;
              if (movementKey(String(r.customer || ""), String(r.code || "")) !== itemK) continue;
              const w = normalizeWarehouse(r.warehouse || "");
              if (w === WAREHOUSE_CONCA) qConca += safeInt(r.qty);
              else qCerea += safeInt(r.qty);
            }
          }catch(_){}

          const ok = confirm(
            `Eliminare l’articolo dall’inventario?\n\n` +
            `Fornitore: ${cust || "—"}\n` +
            `Codice: ${code}\n` +
            `Nome: ${title || "—"}\n\n` +
            `Stock attuale: Cerea ${Number(qCerea||0).toLocaleString("it-IT")} • Concamarise ${Number(qConca||0).toLocaleString("it-IT")}\n` +
            `Movimenti da eliminare: ${Number(ids.length||0).toLocaleString("it-IT")}\n\n` +
            `Nota: verranno eliminate tutte le righe/movimenti per questo Fornitore+Codice (anche su entrambe le sedi).\n` +
            `Operazione irreversibile.`
          );
          if (!ok) return;

          try { delInvBtn.disabled = true; } catch(_){}
          const oldTxt = String(delInvBtn.textContent || "");
          try { delInvBtn.textContent = "Elimino…"; } catch(_){}

          try {
            // rimuovi anche eventuale soglia custom per questa coppia (cliente+codice)
            try { await clearThresholdForKey(itemK); } catch(_){}

            if (ids.length) try{ await trashPut({ kind:"flow", label: label, target:{ col:"movements", ids: ids }, data: { movements: (g.movements || []).map(mv => ({...mv})) } }); }catch(_){ }
      await deleteMovementsBulk(ids);

            showToast("Articolo eliminato");
            try { modalProduct.classList.remove("open"); } catch(_){}
            try { renderAll(); } catch(_){}
          } catch (err) {
            console.error(err);
            showToast("Errore eliminazione articolo", "err");
            try { delInvBtn.disabled = false; } catch(_){}
          } finally {
            try { delInvBtn.textContent = oldTxt || "Elimina articolo"; } catch(_){}
          }
        });
      }

modalProduct.classList.add("open");
    }

    function openUnifiedArticleModal(row){
      if (!modalUnified || !unifiedButtons) return;
      const ctx = row || {};
      const codes = Array.isArray(ctx.__codes) ? Array.from(new Set(ctx.__codes.map(x => String(x || "").trim()).filter(Boolean))) : [];
      if (!codes.length) return;

      const aliasLabel = String(ctx.__alias || ctx.item || "").trim();
      if (unifiedTitle) unifiedTitle.textContent = "Articolo unificato";
      if (unifiedSubtitle) {
        unifiedSubtitle.textContent = aliasLabel ? `Alias: ${aliasLabel}` : "Seleziona l’articolo univoco da aprire.";
      }

      const members = Array.isArray(ctx.__members) ? ctx.__members : [];
      unifiedButtons.innerHTML = codes.map(code => {
        const mem = members.find(m => String(m?.code || "").trim() === code);
        const name = getDisplayNameForCode(code, mem ? mem.item : "");
        const label = `${name || code} • ${code}`;
        return `
          <button class="btn btn-secondary" type="button" data-open-code="${escapeHtmlAttr(code)}">
            ${escapeHtml(label)}
          </button>
        `;
      }).join("");

      unifiedButtons.querySelectorAll("button[data-open-code]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const code = String(btn.getAttribute("data-open-code") || "").trim();
          if (!code) return;
          const mem = members.find(m => String(m?.code || "").trim() === code);
          try { modalUnified.classList.remove("open"); } catch(_){}
          if (mem && String(mem.customer || "").trim()) openProductModal(code, mem);
          else openProductModal(code, { __mode: "master", code });
        });
      });

      modalUnified.classList.add("open");
    }

/****************************************************************
     * Capture & flow
     ****************************************************************/
    function setCaptureType(t) {
      capture.movementType = t;
      segIn.classList.toggle("active", t === "IN");
      segOut.classList.toggle("active", t === "OUT");
      btnConfirmMovement.textContent = t === "IN" ? "Conferma carico" : "Conferma scarico";
    }

    function resetCapture() {
      try { __ocrSessionToken++; } catch(_) { __ocrSessionToken = 1; }
      capture.files = [];
      capture.rawPages = [];
      capture.structuredPages = [];
      capture.activePageIndex = 0;
      capture.file = null;
      capture.rawText = "";

      // allow re-select same file again
      try { cameraInput.value = ""; } catch(_){}
      try { galleryInput.value = ""; } catch(_){}

      // clear preview
      previewImg.src = "";
      previewImg.style.display = "none";
      previewPlaceholder.style.display = "grid";

      try { if (pagesMeta) pagesMeta.style.display = "none"; } catch(_){ }
      try { if (pagesThumbs) { pagesThumbs.style.display = "none"; pagesThumbs.innerHTML = ""; } } catch(_){ }

      // clear extracted document panel + state
      try { __lastDocExtract = null; } catch(_){}
      try { renderDocExtract(null, ""); } catch(_){}
      try {
        if (docItemsTable) {
          docItemsTable.querySelectorAll("tbody tr.is-selected").forEach(r => r.classList.remove("is-selected"));
        }
      } catch(_){}

      // ui
      ocrResult.value = "";
      progressFill.style.width = "0%";
      progressLabel.textContent = "In attesa di acquisizione";
      if (progressSpinner) progressSpinner.style.display = "none";
      btnConfirmMovement.disabled = true;

      // movement fields
      fCustomer.value = "";
      fCode.value = "";
      fItem.value = "";
      fQty.value = "";
      fNote.value = "";
      fDate.value = todayYYYYMMDD();
      try{ document.getElementById("viewOcr")?.classList.remove("hasScan"); }catch(_){ }
    }



    function __renderPagesUI(){
      const n = (capture.files && capture.files.length) ? capture.files.length : 0;
      if (!pagesMeta || !pagesCount || !pagesThumbs) return;
      if (!n){
        pagesMeta.style.display = "none";
        pagesThumbs.style.display = "none";
        pagesThumbs.innerHTML = "";
        return;
      }
      pagesMeta.style.display = "flex";
      pagesCount.textContent = String(n);
      if (btnRemoveLastPage){
        btnRemoveLastPage.style.display = (n > 1) ? "inline-flex" : "none";
      }

      pagesThumbs.style.display = "flex";
      pagesThumbs.innerHTML = "";

      const active = (typeof capture.activePageIndex === "number") ? capture.activePageIndex : (n - 1);

      capture.files.forEach((f, idx) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "pageThumb" + (idx === active ? " is-active" : "");
        b.title = "Pagina " + String(idx + 1);

        const img = document.createElement("img");
        const url = URL.createObjectURL(f);
        img.src = url;
        img.onload = () => URL.revokeObjectURL(url);
        b.appendChild(img);

        const badge = document.createElement("div");
        badge.className = "badge";
        badge.textContent = String(idx + 1);
        b.appendChild(badge);

        b.addEventListener("click", () => __setActivePage(idx));
        pagesThumbs.appendChild(b);
      });
    }

    function __setActivePage(idx){
      if (!capture.files || !capture.files[idx]) return;
      capture.activePageIndex = idx;
      capture.file = capture.files[idx];

      const url = URL.createObjectURL(capture.file);
      previewImg.src = url;
      previewImg.onload = () => URL.revokeObjectURL(url);
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";

      __renderPagesUI();
    }

    function __rebuildCombinedOCR(){
      const parts = Array.isArray(capture.rawPages) ? capture.rawPages.filter(t => t && String(t).trim()) : [];
      capture.rawText = parts.join("\n\n");
      ocrResult.value = capture.rawText;
      const merged = __mergeStructuredPages(Array.isArray(capture.structuredPages) ? capture.structuredPages : []);
      renderDocExtract(merged, capture.rawText);
      btnConfirmMovement.disabled = !__canConfirmMovement();
    }

    function __isEmptyVal(v){
      if (v == null) return true;
      if (typeof v === "string") return !v.trim();
      if (Array.isArray(v)) return v.length === 0;
      return false;
    }

    function __deepMergeKeepFirst(target, src){
      if (!src || typeof src !== "object") return target;
      if (!target || typeof target !== "object") target = {};
      for (const k of Object.keys(src)){
        const v = src[k];
        if (v == null) continue;

        if (Array.isArray(v)){
          if (!Array.isArray(target[k])) target[k] = [];
          target[k] = target[k].concat(v).filter(Boolean);
          continue;
        }

        if (typeof v === "object"){
          target[k] = __deepMergeKeepFirst(target[k], v);
          continue;
        }

        if (__isEmptyVal(target[k]) && !__isEmptyVal(v)){
          target[k] = v;
        }
      }
      return target;
    }

    function __mergeStructuredPages(pages){
      const arr = Array.isArray(pages) ? pages.filter(p => p && typeof p === "object") : [];
      if (!arr.length) return null;

      let out = {};
      arr.forEach(s => { out = __deepMergeKeepFirst(out, s); });

      // Dedupe items base (se presenti)
      if (out && Array.isArray(out.items)){
        const seen = new Set();
        out.items = out.items.filter(it => {
          if (!it || typeof it !== "object") return false;
          const key = [it.code || "", it.description || "", it.qtyRaw || it.qty || ""].map(x => String(x||"").trim()).join("|");
          if (!key.trim()) return true;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return out;
    }

    function __removeLastPage(){
      if (!capture.files || !capture.files.length) return;
      capture.files.pop();
      if (Array.isArray(capture.rawPages)) capture.rawPages.pop();
      if (Array.isArray(capture.structuredPages)) capture.structuredPages.pop();

      const n = capture.files.length;
      capture.activePageIndex = Math.max(0, n - 1);
      capture.file = n ? capture.files[capture.activePageIndex] : null;

      if (!n){
        resetCapture();
        return;
      }

      __setActivePage(capture.activePageIndex);
      __renderPagesUI();
      __rebuildCombinedOCR();
      showToast("Pagina rimossa");
    }
async function handleFileSelection(fileList) {
      const picked = Array.from(fileList || []).filter(Boolean);
      if (!picked.length) return;

      try{
        document.getElementById("viewOcr")?.classList.add("hasScan");
      }catch(_){}

      // allow re-select same file again
      try { cameraInput.value = ""; } catch(_){}
      try { galleryInput.value = ""; } catch(_){}

      if (!Array.isArray(capture.files)) capture.files = [];
      if (!Array.isArray(capture.rawPages)) capture.rawPages = [];
      if (!Array.isArray(capture.structuredPages)) capture.structuredPages = [];
      if (typeof capture.activePageIndex !== "number") capture.activePageIndex = 0;

      const startIdx = capture.files.length;
      const isNewDoc = (startIdx === 0);

      // append pages
      capture.files = capture.files.concat(picked);

      // set active last
      capture.activePageIndex = capture.files.length - 1;
      capture.file = capture.files[capture.activePageIndex];

      // preview active
      const url = URL.createObjectURL(capture.file);
      previewImg.src = url;
      previewImg.onload = () => URL.revokeObjectURL(url);
      previewImg.style.display = "block";
      previewPlaceholder.style.display = "none";

      __renderPagesUI();

      if (isNewDoc) {
        ocrResult.value = "";
        renderDocExtract(null, "");
        btnConfirmMovement.disabled = true;
        try { __lastDocExtract = null; } catch(_){}
        setOcrPill("idle", "OCR: in attesa");
        hintPrivate.style.display = "none";
      }

      if (progressSpinner) progressSpinner.style.display = "block";

      progressLabel.textContent = "Preparazione…";
      progressFill.style.width = "10%";

      // session token (cancella eventuali OCR in corso)
      const myToken = ++__ocrSessionToken;

      try {
        try { imagePreview.classList.add("decrypting"); } catch(_) {}

        const total = capture.files.length;
        let doneNow = 0;

        const parallel = Math.max(1, Math.min(2, __ocrParallel()));

        const queue = [];
        for (let i = startIdx; i < capture.files.length; i++) queue.push(i);

        const refreshPreviewIfActive = (i, f) => {
          try{
            if (capture.activePageIndex === i) {
              capture.file = f;
              const url2 = URL.createObjectURL(f);
              previewImg.src = url2;
              previewImg.onload = () => URL.revokeObjectURL(url2);
            }
          }catch(_){}
        };

        const afterOne = () => {
          if (__ocrSessionToken !== myToken) throw new Error("OCR annullato");
          doneNow++;

          // live update combined result (tutte le pagine nello stesso documento)
          __rebuildCombinedOCR();

          const processed = startIdx + doneNow;
          const pct = Math.min(95, Math.round(10 + 85 * (processed / Math.max(1, total))));
          progressFill.style.width = pct + "%";
          progressLabel.textContent = `OCR in corso… ${processed}/${total}`;

          __renderPagesUI();
        };

        const processOne = async (i) => {
          if (__ocrSessionToken !== myToken) return;

          // convert if HEIC
          let f = await maybeConvertHeic(capture.files[i]);

          // optimize (resize + JPEG compress)
          f = await maybeOptimizeForOCR(f);

          capture.files[i] = f;
          refreshPreviewIfActive(i, f);

          const data = await runGeminiOCR(f);

          const text = (data && (data.text || data.rawText || data.raw || "")) || "";
          capture.rawPages[i] = String(text || "");
          capture.structuredPages[i] = (data && data.structured) ? data.structured : null;

          afterOne();
        };

        const worker = async () => {
          while (queue.length) {
            if (__ocrSessionToken !== myToken) return;
            const i = queue.shift();
            await processOne(i);
          }
        };

        await Promise.all(Array.from({ length: parallel }, () => worker()));

        if (__ocrSessionToken !== myToken) return;

        const merged = __mergeStructuredPages(capture.structuredPages);

        // Auto: salva/aggiorna anagrafica fornitore (best-effort)
        try {
          const supDetails = merged && merged.supplier ? merged.supplier : null;
          if (supDetails && supDetails.name) await ensureSupplierUpsert(supDetails);
        } catch (e) {
          console.warn("supplier OCR upsert skipped", e);
        }

        progressFill.style.width = "100%";
        progressLabel.textContent = "OCR completato";
        if (progressSpinner) progressSpinner.style.display = "none";
        showToast("OCR completato");
        try { imagePreview.classList.remove("decrypting"); } catch(_) {}

        // fill fields best-effort (senza sovrascrivere editing manuale)
        const parsed = extractFieldsFromText(capture.rawText);
        if (fCustomer && !String(fCustomer.value || "").trim()) fCustomer.value = parsed.customer || "";
        if (fCode && !String(fCode.value || "").trim()) fCode.value = parsed.code || "";
        if (fItem && !String(fItem.value || "").trim()) fItem.value = parsed.item || "";
        if (fQty && !String(fQty.value || "").trim()) fQty.value = parsed.qty || "";
        if (fDate && (!fDate.value || fDate.value === "1970-01-01")) fDate.value = parsed.date || todayYYYYMMDD();
        if (fNote && !String(fNote.value || "").trim()) fNote.value = parsed.note || "";

        // Se esiste lo structured (merge), usalo per pre-compilare (senza rompere l'editing manuale)
        if (merged && typeof merged === "object") {
          const sup = merged.supplier || {};
          const docType = merged.documentTypeRaw || merged.documentType || "";
          const docNum = merged.documentNumberRaw || merged.documentNumber || "";
          const docDateISO = coerceToISODate(merged.documentDateRaw || merged.documentDate || "");

          if (fCustomer && !String(fCustomer.value || "").trim() && sup.name) fCustomer.value = sup.name;
          if (fDate && (!fDate.value || fDate.value === "1970-01-01") && docDateISO) fDate.value = docDateISO;

          const noteAuto = [docType, docNum, (merged.documentDateRaw || merged.documentDate || "")].filter(Boolean).join(" ");
          if (fNote && !String(fNote.value || "").trim() && noteAuto) fNote.value = noteAuto;
        }

        btnConfirmMovement.disabled = !__canConfirmMovement();

        // update OCR pill
        setOcrPill("ok", "OCR: pronto");
        hintPrivate.style.display = "none";
      } catch (e) {
        try { imagePreview.classList.remove("decrypting"); } catch(_) {}
        console.error(e);

        if (String(e && e.message || "").toLowerCase().includes("annullato")) {
          progressFill.style.width = "0%";
          progressLabel.textContent = "OCR annullato";
          if (progressSpinner) progressSpinner.style.display = "none";
          setOcrPill("warn", "OCR: annullato");
          return;
        }

        progressFill.style.width = "0%";
        progressLabel.textContent = "Errore OCR";
        if (progressSpinner) progressSpinner.style.display = "none";
        setOcrPill("bad", "OCR: errore");

        const status = e && e.status ? e.status : 0;
        if (status === 403) {
          hintPrivate.style.display = "block";
          openModal("OCR privato (403)", "Il servizio OCR risponde 403. Se stai usando Cloud Run privato, assicurati che l'endpoint punti al proxy pubblico (es. ocrproxy-…a.run.app) e non al servizio Cloud Run privato.");
        } else {
          openModal("Errore OCR", String(e.message || e));
        }
      }
    }


    function bindFieldValidation() {
      const check = () => {
        btnConfirmMovement.disabled = !__canConfirmMovement();
        };
      [fCustomer, fCode, fItem, fQty, fDate].forEach(el => el.addEventListener("input", check));
      [fCustomer, fCode, fItem, fQty, fDate].forEach(el => el.addEventListener("change", check));
    }

    async function handlePaste() {
      try {
        if (!navigator.clipboard || !navigator.clipboard.read) {
          openModal("Incolla non disponibile", "Il browser non supporta l’incolla immagini in questa modalità.");
          return;
        }
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const file = new File([blob], "clipboard.png", { type });
              await handleFileSelection([file]);
              return;
            }
          }
        }
        showToast("Nessuna immagine negli appunti");
      } catch (e) {
        openModal("Incolla fallita", String(e.message || e));
      }
    }

    /****************************************************************
     * Settings + CSV import/export
     ****************************************************************/
    function applySettingsToUI() {
      sOcrUrl.value = state.settings.ocrUrl || "";
      sOcrKey.value = state.settings.ocrKey || "";
      sLowThreshold.value = String(Math.max(1000, Math.floor(Number(state.settings.lowThreshold) || 0)));
      sMaxRecent.value = String(Math.floor(Number(state.settings.maxRecent) || 30));
    }

    function saveSettingsFromUI() {
      state.settings.ocrUrl = (sOcrUrl.value || "").trim();
      state.settings.ocrKey = (sOcrKey.value || "").trim();
      state.settings.lowThreshold = Math.max(1000, safeInt(sLowThreshold.value));
      state.settings.maxRecent = Math.max(5, safeInt(sMaxRecent.value) || 30);
      saveSettings();
    }

    function exportStockCSV() {
      const stockArr = computeStock().slice().sort((a,b) => (a.customer||"").localeCompare(b.customer||"") || (a.code||"").localeCompare(b.code||""));
      const rows = [
        ["Fornitore","Codice","Articolo","Pezzi","Soglia","UltimoMovimento"]
      ].concat(stockArr.map(x => [
        x.customer, x.code, x.item, x.qty, x.threshold, x.lastMoveAt
      ]));
      const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
      downloadBlob(`inventario_${todayYYYYMMDD()}.csv`, csv, "text/csv;charset=utf-8");
    }

    function exportMovementsCSV() {
      const rows = [
        ["Id","Data","Tipo","Fornitore","Codice","Articolo","Pezzi","Note","Fonte","CreatoIl"]
      ].concat(state.movements.map(m => [
        m.id, m.date, m.type, m.customer, m.code, m.item, m.qty, m.note, m.source, m.createdAt
      ]));
      const csv = rows.map(r => r.map(csvEscape).join(",")).join("\n");
      downloadBlob(`movimenti_${todayYYYYMMDD()}.csv`, csv, "text/csv;charset=utf-8");
    }


    async function importMovementsCSVFile(file) {
      const txt = await file.text();
      const rows = parseCSV(txt);
      if (rows.length < 2) throw new Error("CSV vuoto o non valido.");

      const header = rows[0].map(h => String(h).trim().toLowerCase());
      const idx = (name) => header.indexOf(name);

      // support both "tipo" and "type"
      const iDate = idx("data");
      const iType = idx("tipo") >= 0 ? idx("tipo") : idx("type");
      const iCustomer = idx("cliente");
      const iCode = idx("codice");
      const iItem = idx("articolo");
      const iQty = idx("pezzi");
      const iNote = idx("note");
      const iSource = idx("fonte");
      const iRaw = idx("rawtext");

      const imported = [];
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || row.every(x => String(x || "").trim() === "")) continue;

        const mv = makeMovement({
          type: String(row[iType] || "").toUpperCase().includes("OUT") || String(row[iType] || "").toUpperCase().includes("SCAR") ? "OUT" : "IN",
          customer: String(row[iCustomer] || "").trim(),
          code: String(row[iCode] || "").trim(),
          item: String(row[iItem] || "").trim(),
          qty: safeInt(row[iQty]),
          date: String(row[iDate] || "").trim() || formatDate(new Date()),
          note: String(row[iNote] || "").trim(),
          source: String(row[iSource] || "Import").trim(),
          rawText: String(row[iRaw] || "").trim()
        });

        if (validateMovementFields(mv)) imported.push(mv);
      }

      if (!imported.length) {
        showToast("Nessun movimento valido nel CSV");
        return;
      }

      // Se sei loggato, proponi import cloud (realtime)
      if (fb.user && fb.db) {
        const ok = confirm(`Sei loggato. Vuoi importare ${imported.length} movimenti su Firebase (condivisione realtime)?\n\nOK = Cloud (consigliato)\nAnnulla = Solo locale`);
        if (ok) {
          showToast("Import cloud in corso…");
          let done = 0;
          for (const mv of imported) {
            await addDoc(orgCol("inventoryMovements"), {
              type: mv.type,
              customer: mv.customer,
              code: mv.code,
              item: mv.item,
              qty: safeInt(mv.qty),
              date: mv.date,
              note: mv.note,
              source: "Import",
              rawText: mv.rawText || "",
              warehouse: normalizeWarehouse(mv.warehouse || ""),
              createdAt: serverTimestamp(),
              createdBy: fb.user.email || fb.user.uid
            });
            done++;
            if (done % 25 === 0) await new Promise(res => setTimeout(res, 0));
          }
          showToast(`Importati ${done} movimenti su cloud`);
          return;
        }
      }

      // fallback: locale
      state.movements.push(...imported);
      saveLocalData();
      renderAll();
      showToast(`Importati ${imported.length} movimenti (locale)`);
    }

/****************************************************************
     * Manual modal helpers
     ****************************************************************/
    let modalMovType = "IN";

    function setModalMovType(t) {
      modalMovType = t;
      movSegIn.classList.toggle("active", t === "IN");
      movSegOut.classList.toggle("active", t === "OUT");
    }

    function resetManualModal() {
      setModalMovType("IN");
      mCustomer.value = "";
      mCode.value = "";
      mItem.value = "";
      mQty.value = "";
      mNote.value = "";
      mDate.value = todayYYYYMMDD();
    }

    function saveManualModalMovement() {
      const mv = makeMovement({
        type: modalMovType,
        customer: mCustomer.value,
        code: mCode.value,
        item: mItem.value,
        qty: mQty.value,
        date: mDate.value || todayYYYYMMDD(),
        note: mNote.value,
        source: "Manual",
        rawText: ""
      });

      if (!validateMovementFields(mv)) {
        openModal("Dati mancanti", "Compila almeno: Fornitore, Codice, Articolo, Pezzi (>0), Data.");
        return;
      }

      addMovement(mv);
      closeMovementModal();
      showToast("Movimento salvato");
    }

    /****************************************************************
     * Events
     ****************************************************************/
    const __btnOpenCamera = document.getElementById("btnOpenCamera");
    if (__btnOpenCamera) __btnOpenCamera.addEventListener("click", () => cameraInput.click());
    const __btnOpenGallery = document.getElementById("btnOpenGallery");
    if (__btnOpenGallery) __btnOpenGallery.addEventListener("click", () => galleryInput.click());
    document.getElementById("btnPaste")?.addEventListener("click", handlePaste);

    btnRemoveLastPage?.addEventListener("click", __removeLastPage);

    cameraInput.addEventListener("change", (e) => handleFileSelection(e.target.files));
    galleryInput.addEventListener("change", (e) => handleFileSelection(e.target.files));

    segIn.addEventListener("click", () => setCaptureType("IN"));
    segOut.addEventListener("click", () => setCaptureType("OUT"));

    btnReset.addEventListener("click", resetCapture);

    // Anagrafica tabs + search
    if (segSuppliers && segProducts) {
      segSuppliers.addEventListener("click", () => { activeAnagTab = "suppliers";
      syncAnagHeaderTitle(); segSuppliers.classList.add("active"); segProducts.classList.remove("active"); renderAnag(); });
      segProducts.addEventListener("click", () => { activeAnagTab = "products";
      syncAnagHeaderTitle(); segProducts.classList.add("active"); segSuppliers.classList.remove("active"); renderAnag(); });
    }
    if (searchAnag) searchAnag.addEventListener("input", () => renderAnag());
    if (anagProdCategoryFilter) anagProdCategoryFilter.addEventListener("change", () => renderAnag());
    if (anagProdUnifiedFilter) anagProdUnifiedFilter.addEventListener("change", () => renderAnag());
    if (anagProdSort) anagProdSort.addEventListener("change", () => renderAnag());
    if (btnReloadAnag) btnReloadAnag.addEventListener("click", () => { renderAnag(); showToast("Anagrafica aggiornata"); });

    // Supplier modal
    if (supClose) supClose.addEventListener("click", closeSupplierModal);
    if (btnSupDone) btnSupDone.addEventListener("click", closeSupplierModal);
    if (btnSupDelete) btnSupDelete.addEventListener("click", () => { if (currentSupplierId) deleteSupplierCascade(currentSupplierId); });

    // Edit / Salva
    if (btnSupEdit) btnSupEdit.addEventListener("click", () => { try { setSupplierEditMode(true); } catch(e){ console.warn(e); } });
    if (btnSupCancelEdit) btnSupCancelEdit.addEventListener("click", () => { try { setSupplierEditMode(false); } catch(e){ console.warn(e); } });
    if (btnSupSave) btnSupSave.addEventListener("click", () => { try { saveSupplierEdits(); } catch(e){ console.warn(e); } });
    if (supDocsTbody) supDocsTbody.addEventListener("click", (e) => {
      const btn = e.target.closest('button[data-open-doc]');
      const tr = e.target.closest('tr[data-dockey]');
      const key = (btn && btn.getAttribute("data-open-doc")) || (tr && tr.getAttribute("data-dockey")) || "";
      if (key) {
        e.preventDefault();
        e.stopPropagation();
        openDocDetail(key);
      }
    });
// Product modal
    if (prodClose) prodClose.addEventListener("click", () => modalProduct.classList.remove("open"));
    if (btnProdDone) btnProdDone.addEventListener("click", () => modalProduct.classList.remove("open"));
    if (unifiedClose) unifiedClose.addEventListener("click", () => modalUnified.classList.remove("open"));
    if (btnUnifiedDone) btnUnifiedDone.addEventListener("click", () => modalUnified.classList.remove("open"));
    if (modalUnified) modalUnified.addEventListener("click", (e) => { if (e.target === modalUnified) modalUnified.classList.remove("open"); });


    // Table actions (delegation)
    if (anagTbody) {
      anagTbody.addEventListener("click", (e) => {
        const targetEl = (e && e.target && e.target.nodeType === 3) ? e.target.parentElement : (e ? e.target : null);

        // Click riga (fornitori): apri dettaglio fornitore cliccando ovunque sulla riga
        // (escludi elementi interattivi come bottoni/link/input)
        if (activeAnagTab !== "products") {
          const isInteractive = !!(targetEl && targetEl.closest && targetEl.closest("button, a, input, select, textarea, label"));
          if (!isInteractive) {
            const trSup = targetEl && targetEl.closest ? targetEl.closest("tr[data-supplier-id]") : null;
            const sid = trSup ? (trSup.getAttribute("data-supplier-id") || "") : "";
            if (sid) {
              openSupplierModal(sid);
              return;
            }
          }
        }

        // Click riga (prodotti): apri dettaglio prodotto (stesso modale Inventario)
        if (activeAnagTab === "products") {
          const tr = targetEl && targetEl.closest ? targetEl.closest("tr[data-pg]") : null;
          if (tr && (!targetEl || !targetEl.closest || !targetEl.closest("button[data-action]"))) {
            const gid = tr.getAttribute("data-pg") || "";
            if (gid) {
              try{
                const g = (__prodGroupsMap && __prodGroupsMap.get) ? __prodGroupsMap.get(gid) : null;
                const code = (g && Array.isArray(g.codes) && g.codes.length) ? String(g.codes[0] || "").trim() : "";
                if (code) { openProductModal(code); return; }
              }catch(_){}
              showToast("Prodotto non trovato");
              return;
            }
          }
        }

        const btn = targetEl && targetEl.closest ? targetEl.closest("button[data-action]") : null;
        if (!btn) return;
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!action || !id) return;

        if (action === "supplierDocs") { openSupplierModal(id); return; }
        if (action === "deleteSupplier") { deleteSupplierCascade(id); return; }
        if (action === "openProdGroup") {
          try{
            const g = (__prodGroupsMap && __prodGroupsMap.get) ? __prodGroupsMap.get(id) : null;
            const code = (g && Array.isArray(g.codes) && g.codes.length) ? String(g.codes[0] || "").trim() : "";
            if (code) { openProductModal(code); return; }
          }catch(_){}
          showToast("Prodotto non trovato");
          return;
        }
      });
    }
btnConfirmMovement.addEventListener("click", async () => {
      // Import completo dal documento (multi-riga)
      const doc = __lastDocExtract || null;
      const items = (doc && Array.isArray(doc.__items)) ? doc.__items : ((doc && Array.isArray(doc.items)) ? doc.items : []);
      const safeItems = (items || []).filter(it => !__isConaiItem(it));

      // Flusso OCR Home = solo CARICO
      capture.movementType = "IN";

      let customer = (fCustomer && fCustomer.value ? String(fCustomer.value).trim() : "");
      const docDateISO = (doc && (doc.__docDateISO || coerceToISODate(doc.documentDateRaw || doc.documentDate || ""))) || (fDate && fDate.value) || todayYYYYMMDD();

      const docType = doc && (doc.__docType || doc.documentTypeRaw || doc.documentType || "");
      const docNum  = doc && (doc.__docNumber || doc.documentNumberRaw || doc.documentNumber || "");
      const docDateRaw = doc && (doc.__docDateRaw || doc.documentDateRaw || doc.documentDate || "");
      const baseNote = [docType, docNum, docDateRaw].filter(Boolean).join(" ").trim();

      // Anti-duplicato DDT (rigido): stesso numero + stessa P.IVA + stessa data => blocca il re-upload
      const docNumResolved = String(docNum || "").trim() || extractDocNumber(baseNote) || extractDocNumber(capture.rawText || "");
      const docNumKey = __docNumToKey(docNumResolved);
      const vatNorm = __resolveVatFromDocOrCustomer(doc, customer);

      // Se P.IVA presente: aggancia SEMPRE al fornitore con la stessa P.IVA (nome può essere diverso per OCR)
      try {
        const byVat = __findSupplierByVat(vatNorm);
        if (byVat && byVat.name) {
          customer = String(byVat.name).trim() || customer;
        } else if (!customer && vatNorm) {
          customer = `Fornitore ${vatNorm}`;
        }
        if (fCustomer && customer) fCustomer.value = customer;
      } catch(_) {}

      const docKey = docKeyFromMeta({ customer, date: docDateISO, note: baseNote, source: "OCR", docNum: docNum });

      if (!customer) {
        openModal("Fornitore mancante", "Non riesco a leggere il nome fornitore dal documento. Riprova con una foto più nitida.");
        return;
      }
      if (!items.length) {
        openModal("Nessuna riga trovata", "Non ho trovato righe inventario nel documento. Riprova con una foto più nitida.");
        return;
      }

      const ddtTripletKey = __buildDdtTripletKey(vatNorm, docNumKey, docDateISO);

const dupCheck = await __checkDuplicateDdtBeforeUpload({
        ddtTripletKey,
        vatNorm,
        docNumKey,
        dateISO: docDateISO,
        docKey,
        customer
      });

      if (dupCheck && dupCheck.duplicate) {
        const dateTxt = formatDateOnlyIT(docDateISO) || (docDateISO || "—");
        const numTxt = (docNumResolved || "").trim() || (String(docNum || "").trim() || "—");
        const vatTxt = vatNorm ? vatNorm : "—";
        openModal("Documento già caricato",
          `Questo DDT risulta già presente.\n\nNumero: ${numTxt}\nData: ${dateTxt}\nP.IVA: ${vatTxt}\n\nSe devi reimportarlo, elimina prima il documento esistente (e i suoi movimenti) dall’anagrafica/flussi.`);
        return;
      }

      // Riserva il tripletKey su Firestore (cross-device) per rendere il blocco davvero "rigido"
      let __reservedDocTripletKey = "";
      if (ddtTripletKey) {
        const reserved = await __reserveDocTripletKey(ddtTripletKey, { vatNorm, docNumResolved, dateISO: docDateISO, customer });
        if (!reserved) {
          const dateTxt = formatDateOnlyIT(docDateISO) || (docDateISO || "—");
          openModal("Documento già caricato",
            `Questo DDT (Numero ${docNumResolved || "—"} del ${dateTxt}, P.IVA ${vatNorm || "—"}) risulta già caricato.\n\nNon è possibile caricarlo una seconda volta.`);
          return;
        }
        __reservedDocTripletKey = ddtTripletKey;
      }


      btnConfirmMovement.disabled = true;
      progressLabel.textContent = "Import in corso…";
      progressFill.style.width = "88%";

      try {

let docPages = [];
try {
  if (capture.files && capture.files.length) {
    progressLabel.textContent = "Caricamento foto…";
    progressFill.style.width = "80%";
    docPages = await uploadDocPagesToStorage(docKey, capture.files);
  }
} catch (e) {
  console.warn("upload doc pages failed", e);
  docPages = [];
}

        await ensureSupplierUpsert(__buildSupplierDetailsFromDoc(doc, customer, vatNorm));
        await ensureProductsUpsert(items);

        let ok = 0;
        let skip = 0;
        let lineIndex = 0;

        for (const it of safeItems) {
          lineIndex++;
          const rawCode = String(it.code || "").trim();
          const rawDesc = String(it.description || "").trim();

          const code = (rawCode || rawDesc || "").trim();
          if (__isConaiCode(code) || __isConaiLine(code) || __isConaiLine(rawDesc)) { skip++; continue; }
          const item = (rawDesc || rawCode || "").trim();

          // U.M. + qtyRaw: supporta nr / pz / kg / ton (anche in formati tipo "1760pz" o "NR 10")
          const split = __splitQtyUom(String(it.qtyRaw ?? ""));
          const uom = __normalizeUom(it.uom ?? "") || split.uom || "";
          const qtyOnlyFromRaw = String(split.qtyRaw || "").trim();

          const qtyStr = (it.qty != null && it.qty !== "" && !Number.isNaN(Number(it.qty)))
            ? String(it.qty)
            : (qtyOnlyFromRaw ? qtyOnlyFromRaw.replace(/[^\d,\.]/g,"").trim()
               : (it.qtyRaw ? String(it.qtyRaw).replace(/[^\d,\.]/g,"").trim() : ""));

          const qtyRaw = (qtyOnlyFromRaw || it.qtyRaw) ? `${(qtyOnlyFromRaw || String(it.qtyRaw || "")).trim()}${uom ? " " + uom : ""}`.trim() : "";

          const mv = makeMovement({
            type: "IN",
            customer,
            code,
            item,
            qty: qtyStr,
            uom: uom,
            qtyRaw: qtyRaw,
            date: docDateISO,
            note: baseNote,
            docType: String(docType || ""),
            docNum: String(docNum || ""),
            docDateRaw: String(docDateRaw || ""),
            supplierVat: vatNorm || "",
            docNumKey: docNumKey || "",
            ddtTripletKey: (__reservedDocTripletKey || ddtTripletKey || ""),
            docPages: docPages,
            lineIndex: lineIndex,
            source: "OCR",
            rawText: capture.rawText
          });

          if (!validateMovementFields(mv)) { skip++; continue; }
          await addMovement(mv);
          ok++;
        }

        if (ok > 0) showToast(`Carico importato: ${ok} righe${skip ? " (alcune righe scartate)" : ""}`);
        else showToast("Nessuna riga valida da importare");

        resetCapture();
        setView("ocr");
      } catch (e) {
        console.error(e);
        try { if (__reservedDocTripletKey) await __releaseDocTripletKey(__reservedDocTripletKey); } catch(_) {}
        openModal("Errore import", String(e.message || e));
        btnConfirmMovement.disabled = false;
      }
    });

        /****************************************************************
     * Fornitori: mappatura affidabile da OCR (best effort)
     ****************************************************************/
    function __sup_normSpaces(s){
      return String(s || "").replace(/\s+/g, " ").trim();
    }

    function __sup_titleCase(s){
      const str = __sup_normSpaces(s);
      if (!str) return "";
      return str.toLowerCase().replace(/\b([a-zà-ÿ])([a-zà-ÿ]*)/g, (m,a,b) => a.toUpperCase() + b);
    }

    function __sup_cleanVat(v){
      const raw = String(v || "").toUpperCase();
      const compact = raw.replace(/\s+/g,"").replace(/[.\-]/g,"");
      // Prefer IT VAT (11 digits)
      const mIt = compact.match(/\b(?:IT)?(\d{11})\b/);
      if (mIt) return mIt[1];
      // Generic EU VAT (country + 8-14 alnum)
      const mEu = compact.match(/\b([A-Z]{2}[A-Z0-9]{8,14})\b/);
      if (mEu) return mEu[1];
      return "";
    }

    function __sup_cleanFiscalCode(v){
      const raw = String(v || "").toUpperCase();
      const compact = raw.replace(/\s+/g,"").replace(/[^A-Z0-9]/g,"");
      // Avoid mistaking VAT for CF
      if (/^\d{11}$/.test(compact)) return "";
      // Italian CF is 16 chars, but keep other formats if present
      if (compact.length >= 8) return compact;
      return "";
    }

    function __sup_isValidCap(v){
      return /^\d{5}$/.test(String(v || "").trim());
    }

    function __sup_isValidProvince(v){
      return /^[A-Z]{2}$/.test(String(v || "").trim().toUpperCase());
    }

    function __sup_looksLikeAddress(v){
      const s = String(v || "");
      if (!s) return false;
      return /\b(via|viale|piazza|corso|strada|localit[aà]|loc\.|frazione|contrada|cap)\b/i.test(s) || /\b\d{5}\b/.test(s);
    }

    function __sup_looksLikeCompany(v){
      const s = String(v || "");
      return /\b(srl|s\.r\.l\.|spa|s\.p\.a\.|sas|snc|societ[aà]|coop|cooperativa|ditta)\b/i.test(s);
    }


    // ===== Phone helpers (OCR supplier) =====
    function __sup_phoneDigits(v){
      return String(v || "").replace(/[^\d]/g,"");
    }

    function __sup_cleanPhone(v){
      const raw = String(v || "").trim();
      if (!raw) return "";
      // keep the first phone-like chunk
      const m = raw.match(/(\+?\d[\d\s().\/-]{6,}\d)/);
      let s = (m && m[1]) ? m[1] : raw;

      // Normalize spaces
      s = String(s || "").replace(/\s+/g," ").trim();
      const compact = s.replace(/\s+/g,"");

      // If international format 00xx -> +xx
      if (/^00\d{6,}/.test(compact)){
        const d = compact.replace(/[^\d]/g,"").replace(/^00/,"");
        return d ? ("+" + d) : "";
      }

      // If +xx keep plus
      if (/^\+\d{6,}/.test(compact)){
        const d = compact.replace(/[^\d]/g,"");
        return d ? ("+" + d) : "";
      }

      // Default: digits only
      const digits = compact.replace(/[^\d]/g,"");
      return digits || "";
    }

    function __sup_isLikelyPhone(v, vat){
      const digits = __sup_phoneDigits(v);
      if (!digits) return false;
      if (digits.length < 8 || digits.length > 13) return false;
      if (/^0{8,}$/.test(digits)) return false;

      const vatDigits = __sup_phoneDigits(vat || "");
      if (vatDigits && digits === vatDigits) return false;

      return true;
    }

    function __sup_extractPhonesFromText(rawText, vat){
      const t = String(rawText || "").replace(/\r/g,"");
      const lines = t.split(/\n+/).map(x => String(x || "").trim()).filter(Boolean);

      const candidates = [];
      const push = (val, kind, labeled) => {
        const cleaned = __sup_cleanPhone(val);
        if (!cleaned) return;
        if (!__sup_isLikelyPhone(cleaned, vat)) return;

        const digits = __sup_phoneDigits(cleaned);
        if (digits.length === 5) return; // CAP

        let score = digits.length;
        if (labeled) score += 10;
        if (/^\+/.test(cleaned)) score += 2;
        if (/[\s().\/-]/.test(String(val || ""))) score += 1;

        candidates.push({ kind, cleaned, score });
      };

      const phoneLabel = /\b(tel(?:efono)?|telefono|phone)\b/i;
      const mobLabel = /\b(cell(?:ulare)?|mobile)\b/i;

      for (const line of lines){
        // skip lines that clearly describe VAT
        if (/\b(p\.?\s*iva|partita\s*iva|vat\s*(?:no\.?|number)?)\b/i.test(line)) continue;

        const labeledPhone = phoneLabel.test(line);
        const labeledMob = mobLabel.test(line);

        if (labeledPhone || labeledMob){
          const ms = line.match(/(\+?\d[\d\s().\/-]{6,}\d)/g) || [];
          for (const m of ms){
            push(m, labeledMob ? "mobile" : "phone", true);
          }
        }
      }

      // Generic +39 (often phone)
      const plus39 = t.match(/(\+39[\d\s().\/-]{6,}\d)/g) || [];
      for (const m of plus39) push(m, "phone", false);

      // Generic Italian patterns
      const generic = t.match(/\b(?:0\d{1,4}[\s.\/-]?\d{4,8}|3\d{2}[\s.\/-]?\d{6,8})\b/g) || [];
      for (const m of generic) push(m, "phone", false);

      const best = (kind) => {
        const arr = candidates.filter(c => c.kind === kind).sort((a,b) => b.score - a.score);
        return arr.length ? arr[0].cleaned : "";
      };

      return { phone: best("phone"), mobile: best("mobile") };
    }

    function __sup_parseAddressParts(text){
      const s0 = String(text || "").replace(/\r/g," ").replace(/\n+/g," ").replace(/\s*\|\s*/g," ").trim();
      const s = __sup_normSpaces(s0);
      let cap = "", city = "", province = "", country = "";

      // CAP + city + (PR)
      let m = s.match(/\b(\d{5})\s+([A-ZÀ-Ü][A-ZÀ-Ü' \-]{1,})\s*\(([A-Z]{2})\)\b/i);
      if (m){
        cap = m[1];
        city = __sup_titleCase(m[2]);
        province = String(m[3] || "").toUpperCase();
      } else {
        // CAP + city (no province)
        const m2 = s.match(/\b(\d{5})\s+([A-ZÀ-Ü][A-ZÀ-Ü' \-]{1,})\b/i);
        if (m2){
          cap = m2[1];
          city = __sup_titleCase(String(m2[2]).split(/[,\-–]/)[0]);
        }
        const m3 = s.match(/\(([A-Z]{2})\)/);
        if (m3) province = String(m3[1] || "").toUpperCase();
      }

      if (/\bitalia\b/i.test(s) || /\bIT\b/.test(s)) country = "IT";

      // Street/address = everything before CAP (if CAP exists)
      let address = s;
      if (cap){
        const idx = s.indexOf(cap);
        if (idx > 0){
          address = s.slice(0, idx).replace(/[,\-–]+$/,"").trim();
        }
      }

      // Clean obvious junk
      address = __sup_normSpaces(address);
      if (/^\d{5}\b/.test(address)) address = "";
      if (address && city && address.toLowerCase() === city.toLowerCase()) address = "";

      // If we still have a full string with commas, keep only the first chunk as street
      if (address && address.includes(",") && __sup_looksLikeAddress(address)){
        address = address.split(",")[0].trim();
      }

      return { address, cap, city, province, country };
    }

    function __sup_parseSupplierFromText(rawText){
      const t = String(rawText || "").replace(/\r/g,"").trim();
      const lines = t.split(/\n+/).map(x => String(x || "").trim()).filter(Boolean);
      const up = lines.map(l => l.toUpperCase());

      const supplierKeys = ["CEDENTE", "PRESTATORE", "CEDENTE/PREST", "FORNITORE", "MITTENTE", "EMITTENTE", "VENDITORE"];
      const buyerKeys = ["CESSIONARIO", "COMMITTENTE", "DESTINATARIO", "CLIENTE"];

      let start = 0;
      for (let i = 0; i < up.length; i++){
        if (supplierKeys.some(k => up[i].includes(k))){
          start = Math.min(up.length - 1, i + 1);
          break;
        }
      }

      let end = Math.min(lines.length, start + 18);
      for (let i = start; i < up.length; i++){
        if (buyerKeys.some(k => up[i].includes(k))){
          end = i;
          break;
        }
      }

      const block = lines.slice(start, end);

      // VAT
      let vat = "";
      const vatRe = /\b(?:P\.?\s*IVA|PARTITA\s*IVA|VAT)\b[^A-Z0-9]{0,12}(?:IT)?\s*([0-9]{11})\b/i;
      for (const l of block){
        const m = l.match(vatRe);
        if (m){ vat = m[1]; break; }
      }
      if (!vat){
        const m2 = t.match(vatRe);
        if (m2) vat = m2[1];
      }

      // Name (best score)
      const badNameRe = /\b(ddt|fattura|documento|trasporto|ordine|totale|pagamento)\b/i;
      const labelRe = /\b(p\.?\s*iva|partita\s*iva|codice\s*fiscale|c\.?f\.?)\b/i;
      const buyerRe = /^\s*(spett\.?le|destinatario|cliente)\b/i;

      let best = "";
      let bestScore = -1;
      for (const l0 of block){
        const l = __sup_normSpaces(l0);
        if (!l || l.length < 3 || l.length > 80) continue;
        if (buyerRe.test(l)) continue;
        if (badNameRe.test(l)) continue;
        if (labelRe.test(l)) continue;
        if (/\b\d{5}\b/.test(l)) continue;
        if (__sup_looksLikeAddress(l)) continue;

        let score = 0;
        if (__sup_looksLikeCompany(l)) score += 3;
        if (/^[A-ZÀ-Ü0-9 '._-]+$/.test(l) && /[A-ZÀ-Ü]/.test(l)) score += 1; // uppercase-ish
        if ((l.match(/[A-ZÀ-Üa-zà-ÿ]/g) || []).length >= 8) score += 1;
        if ((l.match(/\d/g) || []).length === 0) score += 1;

        if (score > bestScore){
          bestScore = score;
          best = l;
        }
      }

      // Address: pick street + cap line if present
      const streetKw = /\b(via|viale|piazza|corso|strada|localit[aà]|loc\.|frazione|contrada|v\.le|v\.)\b/i;
      let streetLine = "";
      let capLine = "";
      for (const l of block){
        if (!streetLine && streetKw.test(l)) streetLine = __sup_normSpaces(l);
        if (!capLine && /\b\d{5}\b/.test(l)) capLine = __sup_normSpaces(l);
      }
      const addressRaw = __sup_normSpaces([streetLine, capLine].filter(Boolean).join(", "));

      const parts = __sup_parseAddressParts(addressRaw || capLine || "");
      return {
        name: best || "",
        vat: __sup_cleanVat(vat),
        fiscalCode: "",
        address: parts.address || "",
        cap: parts.cap || "",
        city: parts.city || "",
        province: parts.province || "",
        country: parts.country || "",
        addressRaw: addressRaw || ""
      };
    }

    function buildSupplierFromOcr(structured, rawText){
      const s = (structured && typeof structured === "object") ? structured : {};
      const sup = (s && s.supplier && typeof s.supplier === "object") ? s.supplier : {};

      const structuredName = __sup_normSpaces(sup.name || "");
      const structuredVat  = __sup_cleanVat(sup.vatNumber || sup.vat || sup.piva || "");
      const structuredCF   = __sup_cleanFiscalCode(sup.taxCode || sup.fiscalCode || "");
      const structuredAddr = String(sup.address || sup.fullAddress || "").trim();

      const fromText = __sup_parseSupplierFromText(rawText || "");

      const phones = __sup_extractPhonesFromText(rawText || "", structuredVat || fromText.vat || "");
      const structuredPhone = __sup_cleanPhone(sup.phone || sup.telephone || sup.tel || sup.telefono || "");
      const structuredMobile = __sup_cleanPhone(sup.mobile || sup.cell || sup.cellulare || "");

      // Name: prefer structured unless it clearly looks like an address / label
      let name = structuredName;
      if (!name || __sup_looksLikeAddress(name) || /\b(p\.?\s*iva|partita\s*iva)\b/i.test(name)) name = fromText.name || name;

      // VAT: prefer valid structured, else from text
      let vat = structuredVat || fromText.vat || "";

      // Address parts: parse structured address; if weak/missing, fallback to text-derived
      let parts = __sup_parseAddressParts(structuredAddr || "");
      const weakParts = !(parts.address || parts.cap || parts.city || parts.province);
      if (weakParts){
        parts = __sup_parseAddressParts(fromText.addressRaw || fromText.address || "");
      }

      // Merge last-mile fields from text if still missing
      if (!parts.cap && fromText.cap) parts.cap = fromText.cap;
      if (!parts.city && fromText.city) parts.city = fromText.city;
      if (!parts.province && fromText.province) parts.province = fromText.province;
      if (!parts.country && fromText.country) parts.country = fromText.country;

      // Final clean + validate
      name = __sup_normSpaces(name);
      if (name && name.length > 120) name = name.slice(0, 120);

      const cap = __sup_isValidCap(parts.cap) ? parts.cap : "";
      const province = __sup_isValidProvince(parts.province) ? String(parts.province).toUpperCase() : "";
      const city = parts.city ? __sup_titleCase(parts.city) : "";
      const country = parts.country ? String(parts.country).toUpperCase() : (province || cap ? "IT" : "");

      let address = __sup_normSpaces(parts.address || "");
      if (address && address.length > 140) address = address.slice(0, 140);

      const phone = structuredPhone || phones.phone || "";
      const mobile = structuredMobile || phones.mobile || "";

      return {
        name,
        vat,
        fiscalCode: structuredCF || fromText.fiscalCode || "",
        address,
        cap,
        city,
        province,
        country,
        phone,
        mobile
      };
    }

    // Upsert anagrafica fornitore (se manca) — best effort
    // Accetta sia stringa (nome) che oggetto con campi {name, vat, address, cap, city, province, ...}
    async function ensureSupplierUpsert(input){
      try {
        if (!(fb.user && fb.db)) return;

        const details = (typeof input === "string") ? { name: input } : (input && typeof input === "object" ? input : {});
        const name = __sup_normSpaces(details.name || "");
        if (!name) return;

        const nameLower = name.toLowerCase();
        const vatNorm = __sup_cleanVat(details.vat || details.vatNumber || details.piva || "");
        const cfNorm  = __sup_cleanFiscalCode(details.fiscalCode || details.taxCode || details.cf || "");

        // Find existing supplier (prefer VAT match)
        let existing = null;
        if (vatNorm){
          existing = (suppliers || []).find(s => __sup_cleanVat(s.vat || s.vatNumber || s.piva || "") === vatNorm) || null;
        }
        if (!existing){
          existing = (suppliers || []).find(s => {
            const a = String(s.nameLower || "").toLowerCase();
            const b = String(s.name || "").toLowerCase();
            return a === nameLower || b === nameLower;
          }) || null;
        }

        // Doc id strategy: stable on VAT when possible, else on nameLower
        let docId = "";
        if (existing && existing.id) {
          docId = existing.id;
        } else if (vatNorm && /^\d{11}$/.test(vatNorm)) {
          docId = keyToDocId("vat_" + vatNorm);
        } else {
          docId = keyToDocId(nameLower);
        }

        const ref = doc(orgCol("suppliers"), docId);

        // Address / components
        const parts = __sup_parseAddressParts(details.address || "");
        const cap = __sup_isValidCap(details.cap) ? String(details.cap) : (parts.cap || "");
        const city = __sup_normSpaces(details.city || parts.city || "");
        const province = __sup_isValidProvince(details.province) ? String(details.province).toUpperCase() : (parts.province || "");
        const country = __sup_normSpaces(details.country || parts.country || "");

        const payload = {
          updatedAt: serverTimestamp(),
          updatedBy: fb.user.email || fb.user.uid,
          lastSource: "OCR"
        };

        // Se il fornitore esiste già, NON sovrascrivere nome/codice: riempi solo se mancano
        if (!existing){
          payload.name = name;
          payload.nameLower = nameLower;
          payload.createdAt = serverTimestamp();
          payload.createdBy = fb.user.email || fb.user.uid;
        } else {
          const exName = __sup_normSpaces(existing.name || "");
          if (!exName){
            payload.name = name;
            payload.nameLower = nameLower;
          } else if (!existing.nameLower){
            payload.nameLower = exName.toLowerCase();
          }
        }


        // Only set fields if they look valid (anti-scambio campi)
        if (vatNorm) {
          const exVat = existing ? __sup_cleanVat(existing.vat || existing.vatNumber || existing.piva || existing.partitaIva || "") : "";
          if (!exVat) payload.vat = vatNorm;
        }
        if (cfNorm) {
          const exCf = existing ? __sup_cleanFiscalCode(existing.fiscalCode || existing.taxCode || existing.cf || existing.codiceFiscale || "") : "";
          if (!exCf) payload.fiscalCode = cfNorm;
        }

        const addr = __sup_normSpaces(details.address || parts.address || "");
        if (addr && __sup_looksLikeAddress(addr)) payload.address = addr;

        if (cap) payload.cap = cap;
        if (city) payload.city = __sup_titleCase(city);
        if (province) payload.province = province;
        if (country) payload.country = String(country).toUpperCase();


        // Phone: non sovrascrivere valori esistenti con vuoti/inaffidabili
        const phoneCand = __sup_cleanPhone(details.phone || details.telefono || details.tel || "");
        const mobileCand = __sup_cleanPhone(details.mobile || details.cell || details.cellulare || "");
        const existingPhone = __sup_cleanPhone(existing?.phone || existing?.telefono || "");
        const existingMobile = __sup_cleanPhone(existing?.mobile || "");

        if (phoneCand && __sup_isLikelyPhone(phoneCand, vatNorm)) {
          if (!existingPhone || __sup_phoneDigits(existingPhone) === __sup_phoneDigits(phoneCand)) {
            payload.phone = phoneCand;
            // alias compatibilità
            payload.telefono = phoneCand;
          }
        }

        if (mobileCand && __sup_isLikelyPhone(mobileCand, vatNorm)) {
          if (!existingMobile || __sup_phoneDigits(existingMobile) === __sup_phoneDigits(mobileCand)) {
            payload.mobile = mobileCand;
          }
        }

        await setDoc(ref, payload, { merge: true });
      } catch (e) {
        console.warn("supplier upsert skipped", e);
      }
    }

// Upsert prodotti (best effort)
    async function ensureProductsUpsert(items){
      try {
        if (!(fb.user && fb.db)) return;
        if (!Array.isArray(items) || !items.length) return;

        const seen = new Set();
        const safeItemsArr = (items || []).filter(it => it && !__isConaiItem(it));
        for (const it of safeItemsArr) {
          const rawCode = String(it.code || "").trim();
          const rawDesc = String(it.description || "").trim();
          const code = (rawCode || rawDesc || "").trim();
          if (!code) continue;
          if (__isConaiCode(code) || __isConaiLine(rawCode) || __isConaiLine(rawDesc)) continue;

          const key = code.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          const already = (products || []).some(p => {
            const a = String(p.code || p.id || "").toLowerCase();
            return a === key;
          });
          if (already) continue;

          const id = keyToDocId(key);
          const ref = doc(orgCol("products"), id);

          const payload = {
            code: code,
            name: rawDesc || code,
            nameLower: (rawDesc || code).toLowerCase(),
            createdAt: serverTimestamp(),
            createdBy: fb.user.email || fb.user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: fb.user.email || fb.user.uid
          };

          // se disponibile, salva anche l'unità di misura letta dall'OCR
          try { const u0 = __normalizeUom(it.uom || it.um || it.unit || ""); if (u0) payload.uom = u0; } catch(_) {}

          await setDoc(ref, payload, { merge: true });
        }
      } catch (e) {
        console.warn("products upsert skipped", e);
      }
    }


    document.getElementById("btnHeaderRefresh").addEventListener("click", () => {
      showToast("Aggiornamento…");
      renderAll();
    });

    // Quick modal controls
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modalOk").addEventListener("click", closeModal);
    modalQuick.addEventListener("click", (e) => { if (e.target === modalQuick) closeModal(); });

    // DDT detail modal controls
    if (btnCloseDocDetail) btnCloseDocDetail.addEventListener("click", closeDocDetail);
    if (modalDocDetail) modalDocDetail.addEventListener("click", (e) => { if (e.target === modalDocDetail) closeDocDetail(); });

    // Flow edit modal controls
    if (btnCloseFlowEdit) btnCloseFlowEdit.addEventListener("click", closeFlowEdit);
    if (btnCancelFlowEdit) btnCancelFlowEdit.addEventListener("click", closeFlowEdit);
    if (btnSaveFlowEdit) btnSaveFlowEdit.addEventListener("click", saveFlowEdit);
    if (btnDeleteFlowFromEdit) btnDeleteFlowFromEdit.addEventListener("click", () => {
      if (__currentFlowEditKey) deleteFlowByKey(__currentFlowEditKey);
    });
    if (modalFlowEdit) modalFlowEdit.addEventListener("click", (e) => { if (e.target === modalFlowEdit) closeFlowEdit(); });

// Flow edit: elimina singola riga (minus) + modifica quantità
if (modalFlowEdit) {
  // Delete row (minus)
  modalFlowEdit.addEventListener("click", async (e) => {
    const btn = e.target && e.target.closest ? e.target.closest("button.jsFlowRowDelete") : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const id = btn.getAttribute("data-id") || "";
    if (!id) return;

    const ok = confirm("Eliminare questa riga dal flusso?");
    if (!ok) return;

    try {
      await deleteMovementsBulk([id]);
      showToast("Riga eliminata");
      // refresh list
      try { renderFlowEditItems(); } catch(_){}
    } catch (err) {
      console.error("delete flow row failed", err);
      openModal("Errore", "Non sono riuscito a eliminare la riga.");
    }
  });

  // Enter/Esc on flow edit inputs (codice / articolo / pezzi)
  modalFlowEdit.addEventListener("keydown", (e) => {
    const inp = e.target && e.target.closest
      ? e.target.closest("input.jsFlowQtyInput, input.jsFlowCodeInput, input.jsFlowItemInput")
      : null;
    if (!inp) return;

    if (e.key === "Enter") {
      e.preventDefault();
      inp.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      const orig = (inp.dataset && inp.dataset.orig != null) ? String(inp.dataset.orig) : "";
      if (inp.classList.contains("jsFlowQtyInput")) {
        const base = safeInt(orig);
        inp.value = String(Number.isFinite(base) ? base : 0);
      } else {
        inp.value = orig;
      }
      inp.blur();
    }
  });

  // Commit qty on blur: niente auto-save (salvataggio via "Salva" del modale)
  modalFlowEdit.addEventListener("focusout", (e) => {
    const inp = e.target && e.target.closest ? e.target.closest("input.jsFlowQtyInput") : null;
    if (!inp) return;
    let v = safeInt(inp.value);
    if (!Number.isFinite(v) || v < 0) v = 0;
    inp.value = String(v);
  });
}


    // Document row click (Movimenti recenti / Flussi)
    if (movTbody) movTbody.addEventListener("click", (e) => {
      const tr = e.target.closest('tr[data-dockey]');
      if (tr) openDocDetail(tr.getAttribute("data-dockey"));
    });
    if (flowsTbody) flowsTbody.addEventListener("click", (e) => {
      const tr = e.target.closest('tr[data-dockey]');
      if (!tr) return;
      const key = tr.getAttribute("data-dockey");
      if (key) openFlowEdit(key);
    });


    // Settings (nascosto se non usato)
    const __btnHdrSettings = document.getElementById("btnHeaderSettings");
    if (__btnHdrSettings) {
      __btnHdrSettings.addEventListener("click", () => {
        applySettingsToUI();
        openSettings();
      });
    }
    const __settingsClose = document.getElementById("settingsClose");
    if (__settingsClose) __settingsClose.addEventListener("click", closeSettings);
    if (modalSettings) modalSettings.addEventListener("click", (e) => { if (e.target === modalSettings) closeSettings(); });

    const __btnSaveSettings = document.getElementById("btnSaveSettings");
    if (__btnSaveSettings) __btnSaveSettings.addEventListener("click", async () => {
      saveSettingsFromUI();
      await testOcrHealth();
      closeSettings();
      showToast("Impostazioni salvate");
    });

    document.getElementById("btnTestOcr").addEventListener("click", async () => {
      ocrTestResult.textContent = "Test in corso…";
      const ok = await testOcrHealth();
      ocrTestResult.textContent = ok ? "OK" : "Errore";
    });

    document.getElementById("btnResetLocal").addEventListener("click", () => {
      openModal("Reset dati locali", "Vuoi cancellare TUTTI i movimenti e le soglie su questo dispositivo?");
      const okBtn = document.getElementById("modalOk");
      const prev = okBtn.onclick;
      okBtn.onclick = () => {
        okBtn.onclick = prev;
        closeModal();
        localStorage.removeItem(STORE_KEY_SETTINGS);
        localStorage.removeItem(STORE_KEY_LOCALDATA);
        localStorage.removeItem(STORE_KEY_LEGACY);
        loadSettings();
        loadLocalData();
        renderAll();
        resetCapture();
        closeSettings();
        showToast("Dati locali resettati");
      };
    });

    // Gestionale actions
    const btnRecalc = document.getElementById("btnRecalc");
    if (btnRecalc) btnRecalc.addEventListener("click", () => renderAll());
searchStock.addEventListener("input", () => renderAll());
    filterCustomer.addEventListener("change", () => renderAll());
    filterLow.addEventListener("change", () => renderAll());
    if (filterCategory) filterCategory.addEventListener("change", () => renderAll());

    // Click su riga stock: dettaglio + categoria
    if (stockTbody) {
      stockTbody.addEventListener("click", async (e) => {
        const btnSave = e.target.closest("button.jsQtySave");
        if (btnSave) {
          e.preventDefault();
          e.stopPropagation();

          const tr = btnSave.closest("tr[data-k]");
          if (!tr) return;
          const k = tr.getAttribute("data-k") || "";
          const row = __stockRowByKey.get(k);
          if (!row) return;

          const inp = tr.querySelector("input.jsQtyEdit");
          if (!inp) return;

          let newQty = safeInt(inp.value);
          if (!Number.isFinite(newQty) || newQty < 0) newQty = 0;

          const oldQty = safeInt(row.qty);
          if (newQty === oldQty) {
            inp.value = String(oldQty);
            inp.dataset.orig = String(oldQty);
            btnSave.disabled = true;
            return;
          }

          inp.disabled = true;
          btnSave.disabled = true;
          btnSave.textContent = "Salvo…";
          try {
            if (row && row.__isAliasGroup && Array.isArray(row.__codes) && row.__codes.length > 1) {
              await adjustStockAbsoluteFromAliasGroupRow(row, newQty);
            } else {
              await adjustStockAbsoluteFromRow(row, newQty);
            }
            // update in-memory row for immediate UI coherence
            row.qty = newQty;
            inp.dataset.orig = String(newQty);
            btnSave.textContent = "Salvato";
            setTimeout(() => { try { btnSave.textContent = "Salva"; } catch(_){} }, 600);
          } catch (err) {
            console.error(err);
            showToast("Errore salvataggio quantità");
            btnSave.textContent = "Salva";
          } finally {
            inp.disabled = false;
          }
          return;
        }

        if (e.target.closest("input.jsQtyEdit")) return;

        const tr = e.target.closest("tr[data-k]");
        if (!tr) return;
        const k = tr.getAttribute("data-k") || "";
        const row = __stockRowByKey.get(k);
        if (!row) return;
        if (row.__isAliasGroup && Array.isArray(row.__codes) && row.__codes.length > 1) {
          openUnifiedArticleModal(row);
        } else {
          openProductModal(row.code, row);
        }
      });

// Quantità: modifica con tasto Salva
      stockTbody.addEventListener("input", (e) => {
        const inp = e.target;
        if (!inp || !inp.matches || !inp.matches("input.jsQtyEdit")) return;

        const tr = inp.closest("tr[data-k]");
        if (!tr) return;

        const btn = tr.querySelector("button.jsQtySave");
        if (!btn) return;

        const k = tr.getAttribute("data-k") || "";
        const row = __stockRowByKey.get(k);

        const base = Number.isFinite(safeInt(inp.dataset.orig)) ? safeInt(inp.dataset.orig) : safeInt(row ? row.qty : 0);
        let val = safeInt(inp.value);
        if (!Number.isFinite(val) || val < 0) val = 0;

        btn.disabled = (val === base);
      });

      stockTbody.addEventListener("keydown", (e) => {
        const inp = e.target;
        if (!inp || !inp.matches || !inp.matches("input.jsQtyEdit")) return;

        if (e.key === "Enter") {
          e.preventDefault();
          const tr = inp.closest("tr[data-k]");
          const btn = tr ? tr.querySelector("button.jsQtySave") : null;
          if (btn && !btn.disabled) btn.click();
          else inp.blur();
        }

        if (e.key === "Escape") {
          e.preventDefault();
          const base = safeInt(inp.dataset.orig);
          inp.value = String(Number.isFinite(base) ? base : 0);
          const tr = inp.closest("tr[data-k]");
          const btn = tr ? tr.querySelector("button.jsQtySave") : null;
          if (btn) btn.disabled = true;
          inp.blur();
        }
      });

}

    const btnNewMovementManual = document.getElementById("btnNewMovementManual");
    if (btnNewMovementManual) btnNewMovementManual.addEventListener("click", () => {
resetManualModal();
      openMovementModal();
    });

    const btnExportStock = document.getElementById("btnExportStock");
    if (btnExportStock) btnExportStock.addEventListener("click", exportStockCSV);
const btnViewMovements = document.getElementById("btnViewMovements");
    if (btnViewMovements) btnViewMovements.addEventListener("click", () => {
      exportMovementsCSV();
      showToast("CSV movimenti scaricato");
    });

    const btnImportMovements = document.getElementById("btnImportMovements");
    if (btnImportMovements && importMovementsInput) btnImportMovements.addEventListener("click", () => importMovementsInput.click());
if (importMovementsInput) importMovementsInput.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        await importMovementsCSVFile(f);
      } catch (err) {
        openModal("Import fallito", String(err.message || err));
      } finally {
        importMovementsInput.value = "";
      }
    });

    // Manual modal controls
    document.getElementById("movClose").addEventListener("click", closeMovementModal);
    modalMovement.addEventListener("click", (e) => { if (e.target === modalMovement) closeMovementModal(); });
    movSegIn.addEventListener("click", () => setModalMovType("IN"));
    movSegOut.addEventListener("click", () => setModalMovType("OUT"));
    document.getElementById("btnSaveMovement").addEventListener("click", saveManualModalMovement);

    bindFieldValidation();

    /****************************************************************
     * Init
     ****************************************************************/
    loadSettings();
    loadLocalData();
    initFirebase();

    setCaptureType("IN");
    resetCapture();
    applySettingsToUI();
    renderAll();

    // API globale (per moduli esterni, es. pagina Movimenti)
    try{
      window.HubInv = {
        state,
        setView,
        renderAll,
        safeInt,
        formatDateIT,
        normalizeWarehouse,
        warehouseLabel,
        openModal,
        showToast,
        exportMovementsCSV,
        openDocDetail,

        // Categorie
        getCategories: () => (Array.isArray(categories) ? categories.slice() : []),
        createCategory,
        updateCategory,
        deleteCategory,
        categoryUsageCount: __categoryUsageCount,
        categoryProducts: __categoryProducts,
        macroCatLabel,
        macroCatColor,
        normalizeMacroCategory,
        getMacroCategoryForCode,
        setMacroCategoryForCode,
        openProductModal,

        docKeyFromMeta
      };
      window.dispatchEvent(new CustomEvent("HubInvReady", { detail: window.HubInv }));
    }catch(_){}
// Niente test automatico all'avvio (evita richieste inutili)
    if ((state.settings.ocrUrl || "").trim()) {
      setOcrPill("warn", "OCR: configurato (premi Test)");
    } else {
      setOcrPill("warn", "OCR: da configurare");
    }

    // ===== Formatting helpers =====
    function formatDocLabel(docLike){
      try{
        const g = (docLike && typeof docLike === "object") ? docLike : {};
        const note = String(g.note || g.notes || g.ocrText || g.text || "").trim();
        const noteU = note.toUpperCase();

        // Detect document type (fallback DDT)
        let type = "DDT";
        if (/(FATTURA|FAT\.)/.test(noteU)) type = "Fattura";
        else if (/(DDT|DOCUMENTO\s+DI\s+TRASPORTO|BOLLA|TRASPORTO)/.test(noteU)) type = "DDT";
        else if (/(ORDINE)/.test(noteU)) type = "Ordine";
        else if (/(RICEVUTA)/.test(noteU)) type = "Ricevuta";
        else if (/(DOCUMENTO)/.test(noteU)) type = "Documento";

        // Number
        let num = String(g.docNum || g.docNumber || g.numero || "").trim();
        if (!num && typeof extractDocNumber === "function") {
          try { num = String(extractDocNumber(note) || "").trim(); } catch(_){}
        }
        if (!num) {
          const m = note.match(/\b(?:DDT|FATTURA|FAT\.)\s*(?:n\.?|nr\.?|n°)?\s*([0-9]{1,3}(?:[.\s]?[0-9]{3})*|[0-9]{1,6})\b/i);
          if (m) num = String(m[1] || "").replace(/\s+/g,"");
        }
        if (num) num = num.replace(/\s+/g,"");

        // Date (prefer ISO if present)
        let dateISO = String(g.date || g.dateISO || g.docDate || g.data || "").trim();
        if (!dateISO && note) {
          const m = note.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/);
          if (m) dateISO = String(m[1] || "").replace(/\./g,"/").replace(/-/g,"/");
        }
        if (typeof coerceToISODate === "function") {
          try { dateISO = coerceToISODate(dateISO) || dateISO; } catch(_){}
        }
        const dateLabel = (typeof formatDateOnlyIT === "function")
          ? (formatDateOnlyIT(dateISO) || String(dateISO || "").trim())
          : String(dateISO || "").trim();

        // Compose
        const parts = [];
        parts.push(type + (num ? (" " + num) : ""));
        if (dateLabel) parts.push("del " + dateLabel);

        // Last fallback: use key/id
        let out = parts.join(" ");
        if (!out.trim() || out.trim() === "DDT") {
          const k = String(g.key || g.id || "").trim();
          out = (k ? ("Documento " + k) : "Documento");
        }
        return out;
      } catch(e){
        return "Documento";
      }
    }
    try { if (typeof globalThis !== "undefined") globalThis.formatDocLabel = formatDocLabel; } catch(_){}
