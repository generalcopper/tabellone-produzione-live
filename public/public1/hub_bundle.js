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

    const html = "<div id=\"viewInventory\" class=\"view modalOverlay\">\n  <article class=\"card\" id=\"stockCard\">\n    <div class=\"hd\">\n      <div class=\"overlayHeaderTitle\">\n        <button class=\"iconBtn overlayBack\" id=\"btnBackInv\" type=\"button\" aria-label=\"Indietro\">\u2039</button>\n        <h2>Inventario</h2>\n      </div>\n      <div class=\"inlineRow\" style=\"gap:8px; justify-content:flex-end;\">\n        <div class=\"pill\" id=\"pillInvWarehouse\" style=\"display:none\">\u2014</div>\n        <div class=\"pill\" id=\"pillStock\">0 righe</div>\n        <button class=\"iconBtn\" id=\"btnCloseInv\" type=\"button\" aria-label=\"Chiudi\">\u00d7</button>\n      </div>\n    </div>\n    <div class=\"bd\">\n\n      <!-- Step 1: scelta inventario -->\n      <div id=\"invPicker\" class=\"stack\">\n        <div class=\"hero-sub\">Seleziona inventario</div>\n        <div class=\"homeActions\" style=\"grid-template-columns: 1fr; gap: 14px;\">\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickCerea\" type=\"button\" aria-label=\"Inventario Cerea\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CEREA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Cerea</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickConcamarise\" type=\"button\" aria-label=\"Inventario Concamarise\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CONCA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Concamarise</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n        </div>\n      </div>\n\n      <!-- Step 2: dettaglio inventario selezionato -->\n      <div id=\"invDetail\" class=\"stack\" style=\"display:none;\">\n        <div class=\"inlineRow\" style=\"justify-content:space-between; align-items:flex-end; gap:12px;\">\n          <div class=\"stack\" style=\"flex:1; min-width: 220px;\">\n            <div class=\"hero-sub\" id=\"invDetailTitle\">Inventario</div>\n            <div class=\"muted\">Stock e categorie per sede</div>\n          </div>\n          <button class=\"btn btn-ghost btn-xs\" id=\"btnInvBackPicker\" type=\"button\">\u2190 Cambia inventario</button>\n        </div>\n\n        <div class=\"inlineRow listStickyBar\" style=\"justify-content: space-between;\">\n          <div class=\"inlineRow\" style=\"flex: 1 1 auto;\">\n            <div class=\"field\" style=\"min-width: 220px;\">\n              <label for=\"searchStock\">Cerca</label>\n              <input id=\"searchStock\" placeholder=\"Fornitore / codice / articolo\u2026\" />\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCustomer\">Fornitore</label>\n              <select id=\"filterCustomer\">\n                <option value=\"\">Tutti</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterLow\">Filtro</label>\n              <select id=\"filterLow\">\n                <option value=\"all\">Tutti</option>\n                <option value=\"low\">Solo scorta bassa</option>\n                <option value=\"zero\">Solo zero</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCategory\">Categoria</label>\n              <select id=\"filterCategory\">\n                <option value=\"\">Tutte</option>\n                <option value=\"__none\">Non assegnata</option>\n              </select>\n            </div>\n          </div>\n        </div>\n\n        <!-- STOCK (per inventario selezionato) -->\n        <div class=\"tableWrap\" style=\"max-height: 420px; overflow:auto; margin-top: 10px;\">\n          <table class=\"dataGrid\">\n            <thead>\n              <tr>\n                <th>Nome articolo</th>\n                <th>Cod. articolo</th>\n                <th>Categoria</th>\n                <th class=\"qty\">Pezzi</th>\n              </tr>\n            </thead>\n            <tbody id=\"stockTbody\">\n              <tr><td class=\"td-muted\" colspan=\"4\">Seleziona un inventario.</td></tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n    </div>\n  </article>\n</div>";

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
          '<td data-label="Pezzi" class="qty">'+Number(qty).toLocaleString("it-IT")+'</td>' +
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
    push("Pezzi", String((api.safeInt ? api.safeInt(mv.qty) : mv.qty) ?? ""));
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
  let selectedSnapshot = { name: "", color: "" };

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
      selectedSnapshot = { name:"", color:"" };
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

    const used = (typeof hub.categoryUsageCount === "function") ? (hub.categoryUsageCount(selectedKey) || 0) : 0;

    const nameInp = $("catEditName");
    const colorInp = $("catEditColor");
    const pill = $("catDetailCount");
    const btnSave = $("btnCatSave");
    const btnDel = $("btnCatDelete");
    const hint = $("catDeleteHint");

    if (pill) pill.textContent = `${Number(used||0).toLocaleString("it-IT")} articol${used===1 ? "o" : "i"}`;

    // snapshot base per enable/disable
    if (!selectedSnapshot || selectedSnapshot.key !== selectedKey){
      selectedSnapshot = { key: selectedKey, name: nm, color: col };
    }

    if (nameInp) nameInp.value = nm;
    if (colorInp) colorInp.value = col;

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
      btnSave.disabled = (curName === String(selectedSnapshot.name||"")) && (curCol === safeColor(selectedSnapshot.color||""));
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
      if (!name) { try{ hub.showToast("Inserisci un nome categoria", "warn"); }catch(_){ } return; }

      try{
        const created = await hub.createCategory(name, color);
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

    // save
    $("btnCatSave")?.addEventListener("click", async () => {
      if (!selectedKey) return;
      const name = String($("catEditName")?.value || "").trim();
      const color = String($("catEditColor")?.value || "").trim();
      if (!name) { try{ hub.showToast("Nome categoria non valido", "warn"); }catch(_){ } return; }

      try{
        await hub.updateCategory(selectedKey, { name, color });
        selectedSnapshot = { key: selectedKey, name, color };
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
