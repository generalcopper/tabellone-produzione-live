/* ============================================================
   HUB INVENTARIO — BUNDLE (views + moduli UI)
   Caricalo PRIMA di hub_core.js
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

    const html = "<div id=\"viewInventory\" class=\"view modalOverlay\">\n  <article class=\"card\" id=\"stockCard\">\n    <div class=\"hd\">\n      <div class=\"overlayHeaderTitle\">\n        <button class=\"iconBtn overlayBack\" id=\"btnBackInv\" type=\"button\" aria-label=\"Indietro\">\u2039</button>\n        <h2>Inventario</h2>\n      </div>\n      <div class=\"inlineRow\" style=\"gap:8px; justify-content:flex-end;\">\n        <div class=\"pill\" id=\"pillInvWarehouse\" style=\"display:none\">\u2014</div>\n        <div class=\"pill\" id=\"pillStock\">0 righe</div>\n        <button class=\"iconBtn\" id=\"btnCloseInv\" type=\"button\" aria-label=\"Chiudi\">\u00d7</button>\n      </div>\n    </div>\n    <div class=\"bd\">\n\n      <!-- Step 1: scelta inventario -->\n      <div id=\"invPicker\" class=\"stack\">\n        <div class=\"hero-sub\">Seleziona inventario</div>\n        <div class=\"homeActions\" style=\"grid-template-columns: 1fr; gap: 14px;\">\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickCerea\" type=\"button\" aria-label=\"Inventario Cerea\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CEREA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Cerea</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n\n          <button class=\"btn btn-primary homeTile\" id=\"btnPickConcamarise\" type=\"button\" aria-label=\"Inventario Concamarise\">\n            <div class=\"homeTileTop\">\n              <svg class=\"homeTileIcon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n                <path d=\"M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6zm0 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z\"/>\n              </svg>\n              <span class=\"homeTileBadge\">CONCA</span>\n            </div>\n            <div class=\"homeTileText\">\n              <div class=\"homeTileTitle\">Inventario Concamarise</div>\n              <div class=\"homeTileSub\">Apri stock e categorie</div>\n            </div>\n          </button>\n        </div>\n      </div>\n\n      <!-- Step 2: dettaglio inventario selezionato -->\n      <div id=\"invDetail\" class=\"stack\" style=\"display:none;\">\n        <div class=\"inlineRow\" style=\"justify-content:space-between; align-items:flex-end; gap:12px;\">\n          <div class=\"stack\" style=\"flex:1; min-width: 220px;\">\n            <div class=\"hero-sub\" id=\"invDetailTitle\">Inventario</div>\n            <div class=\"muted\">Stock e categorie per sede</div>\n          </div>\n          <button class=\"btn btn-ghost btn-xs\" id=\"btnInvBackPicker\" type=\"button\">\u2190 Cambia inventario</button>\n        </div>\n\n        <div class=\"inlineRow listStickyBar\" style=\"justify-content: space-between;\">\n          <div class=\"inlineRow\" style=\"flex: 1 1 auto;\">\n            <div class=\"field\" style=\"min-width: 220px;\">\n              <label for=\"searchStock\">Cerca</label>\n              <input id=\"searchStock\" placeholder=\"Fornitore / codice / articolo\u2026\" />\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCustomer\">Fornitore</label>\n              <select id=\"filterCustomer\">\n                <option value=\"\">Tutti</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterLow\">Filtro</label>\n              <select id=\"filterLow\">\n                <option value=\"all\">Tutti</option>\n                <option value=\"low\">Solo scorta bassa</option>\n                <option value=\"zero\">Solo zero</option>\n              </select>\n            </div>\n            <div class=\"field\" style=\"min-width: 180px;\">\n              <label for=\"filterCategory\">Categoria</label>\n              <select id=\"filterCategory\">\n                <option value=\"\">Tutte</option>\n                <option value=\"__none\">Non assegnata</option>\n              </select>\n            </div>\n          </div>\n          <div class=\"inlineRow\" style=\"gap:8px; align-items:flex-end;\">\n            <button class=\"btn btn-secondary btn-xs\" id=\"btnPdfBackup\" type=\"button\">PDF backup</button>\n          </div>\n        </div>\n\n        <!-- STOCK (per inventario selezionato) -->\n        <div class=\"tableWrap\" style=\"max-height: 420px; overflow:auto; margin-top: 10px;\">\n          <table class=\"dataGrid\">\n            <thead>\n              <tr>\n                <th>Nome articolo</th>\n                <th>Cod. articolo</th>\n                <th>Categoria</th>\n                <th class=\"qty\">Q.tà</th>\n              </tr>\n            </thead>\n            <tbody id=\"stockTbody\">\n              <tr><td class=\"td-muted\" colspan=\"4\">Seleziona un inventario.</td></tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n\n    </div>\n  </article>\n</div>";

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

  // ===== DaneaXML (Scarica flussi DDT): raggruppo i movimenti OUT per DDT =====
  var __daneaGroupsByKey = Object.create(null);

  function __normWh(v){
    try{
      if (api && typeof api.normalizeWarehouse === "function") return api.normalizeWarehouse(v || "");
    }catch(_){ }
    return String(v || "").trim().toLowerCase();
  }

  function isDaneaXmlOut(mv){
    try{
      if (!mv) return false;
      if (String(mv.type || "").toUpperCase() !== "OUT") return false;
      var src = String(mv.source || "").trim().toLowerCase();
      if (src !== "daneaxml") return false;
      // Nel realtime mapping alcune proprietà custom (es. daneaDdtKey) potrebbero
      // non essere presenti su mv. Consideriamo valido se riusciamo a derivare
      // una chiave di raggruppamento dal numero documento.
      var k = String(mv.daneaDdtKey || mv.docNum || "").trim();
      return !!k;
    }catch(_){ return false; }
  }

  function getDaneaGroupKey(mv){
    // Priorità: chiave completa salvata dal flusso DaneaXML (numero__data)
    var k = String((mv && mv.daneaDdtKey) || "").trim();
    if (k) return k;

    // Fallback robusto: ricostruisci da docNum + docDateRaw/date
    var num = String((mv && mv.docNum) || "").trim();
    var date = String((mv && (mv.docDateRaw || mv.date)) || "").trim();
    if (num && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return num + "__" + date;

    // Ultimo fallback: solo numero (potrebbe non permettere drill-down righe DDT)
    return String((mv && mv.docNum) || "").trim();
  }

  function getDaneaGroupByKey(k){
    var key = String(k || "").trim();
    if (!key) return null;
    try{ return __daneaGroupsByKey[key] || null; }catch(_){ return null; }
  }

  function buildDaneaGroups(allMovements){
    var byKey = Object.create(null);
    (Array.isArray(allMovements) ? allMovements : []).forEach(function(mv){
      if (!isDaneaXmlOut(mv)) return;
      var k = getDaneaGroupKey(mv);
      if (!k) return;
      var g = byKey[k];
      if (!g){
        var ca0 = String(mv.createdAt || mv.createdAtIso || "").trim();
        g = byKey[k] = {
          __kind: "danea_ddt",
          key: k,
          id: "danea__" + encodeURIComponent(k),
          type: "OUT",
          source: "DaneaXML",
          customer: "Scarico DDT",
          code: "",
          item: "",
          qty: 0,
          uom: "",
          qtyRaw: "",
          date: String(mv.date || "").trim() || "",
          note: String(mv.note || "").trim() || "",
          docType: String(mv.docType || "DDT").trim() || "DDT",
          docNum: String(mv.docNum || "").trim() || "",
          docDateRaw: String(mv.docDateRaw || mv.date || "").trim() || "",
          warehouse: "",
          _warehouses: [],
          createdAtMax: ca0,
          createdAt: ca0,
          movements: []
        };
      }

      g.movements.push(mv);

      // warehouses list (unique)
      var w = __normWh(mv.warehouse || "");
      if (w && g._warehouses.indexOf(w) < 0) g._warehouses.push(w);

      var ca = String(mv.createdAt || mv.createdAtIso || "").trim();
      if (ca && (!g.createdAtMax || ca.localeCompare(g.createdAtMax) > 0)) g.createdAtMax = ca;

      if (!g.date && mv.date) g.date = String(mv.date || "").trim();
      if (!g.docNum && mv.docNum) g.docNum = String(mv.docNum || "").trim();
      if (!g.docDateRaw && (mv.docDateRaw || mv.date)) g.docDateRaw = String(mv.docDateRaw || mv.date || "").trim();
      if (!g.note && mv.note) g.note = String(mv.note || "").trim();
    });

    __daneaGroupsByKey = byKey;

    var groups = [];
    Object.keys(byKey).forEach(function(k){
      var g = byKey[k];
      if (!g) return;
      g.qty = (g.movements || []).length;
      g.qtyRaw = g.qty + " righe";
      g.code = (g.docNum ? ("DDT " + g.docNum) : ("DDT " + g.key));
      g.item = "Scarico DDT · " + g.qty + " righe";
      g.createdAt = g.createdAtMax || g.createdAt || "";
      if (g._warehouses.length === 1) g.warehouse = g._warehouses[0];
      else if (g._warehouses.length > 1) g.warehouse = "split";
      else g.warehouse = "";
      groups.push(g);
    });

    return groups;
  }

  function buildUiRows(allMovements){
    var all = Array.isArray(allMovements) ? allMovements : [];
    var groups = buildDaneaGroups(all);

    // ids to skip (movimenti "figli" del DDT)
    var skip = Object.create(null);
    groups.forEach(function(g){
      (g.movements || []).forEach(function(mv){
        var id = String(mv && mv.id || "").trim();
        if (id) skip[id] = 1;
      });
    });

    var rows = [];
    all.forEach(function(mv){
      if (!mv) return;
      var id = String(mv.id || "").trim();
      if (id && skip[id]) return;
      rows.push(mv);
    });

    // add groups
    rows.push.apply(rows, groups);
    return rows;
  }

  function applyFilters(list){
    var q = norm(els.movSearch && els.movSearch.value);
    var t = String(els.movTypeFilter && els.movTypeFilter.value || "").trim().toUpperCase();
    var wh = String(els.movWhFilter && els.movWhFilter.value || "").trim().toLowerCase();
    var from = String(els.movFrom && els.movFrom.value || "").trim();
    var to   = String(els.movTo && els.movTo.value || "").trim();

    return (Array.isArray(list) ? list : []).filter(function(mv){
      if (!mv) return false;

      var isGroup = (mv && mv.__kind === "danea_ddt");

      if (t && String(mv.type || "").toUpperCase() !== t) return false;

      if (wh){
        if (isGroup){
          var ws = Array.isArray(mv._warehouses) ? mv._warehouses : [];
          if (ws.indexOf(wh) < 0) return false;
        } else {
          var w = (api && typeof api.normalizeWarehouse === "function")
            ? api.normalizeWarehouse(mv.warehouse || "")
            : String(mv.warehouse || "").trim().toLowerCase();
          if (w !== wh) return false;
        }
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
          mv.customer, mv.code, mv.item, mv.note, mv.source, mv.docNum, mv.docType, mv.daneaDdtKey
        ].map(norm).join(" ");

        // group: include anche righe interne (codici/articoli)
        if (isGroup){
          try{
            (mv.movements || []).forEach(function(x){
              hay += " " + [x.code, x.item, x.qtyRaw, x.uom, x.warehouse].map(norm).join(" ");
            });
          }catch(_){ }
        }

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
    s = String(s || "").trim().toLowerCase();
    if (s === "split") return "Split";
    return (s === "concamarise") ? "Conca" : "Cerea";
  }

  function renderTable(list, totalCount){
    if (!els.movementsAllTbody) return;

    // pills / meta
    try{
      if (els.pillMovementsCount) els.pillMovementsCount.textContent = String(totalCount || 0);
      if (els.movementsMeta) {
        var shown = (Array.isArray(list) ? list.length : 0);
        els.movementsMeta.textContent = (shown === totalCount)
          ? (shown.toLocaleString("it-IT") + " righe")
          : ("Mostrate " + shown.toLocaleString("it-IT") + " su " + (totalCount||0).toLocaleString("it-IT"));
      }
    }catch(_){ }

    if (!list || !list.length){
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
      var isGroup = (mv && mv.__kind === "danea_ddt");

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

      var wh = shortWh(mv.warehouse || "");
      var src = String(mv.source || "");
      var showDoc = (!isGroup) && isDocLike(mv);

      var attrs = 'data-mvid="'+esc(id)+'"';
      if (isGroup){
        attrs += ' data-kind="danea" data-daneakey="'+esc(String(mv.key || ""))+'"';
      }

      return '' +
        '<tr '+attrs+' title="Dettagli">' +
          '<td data-label="Data">'+esc(date || "—")+'</td>' +
          '<td data-label="Tipo">'+badgeHtml(mv.type)+'</td>' +
          '<td data-label="Fornitore">'+esc(customer)+'</td>' +
          '<td data-label="Codice" class="td-muted"><span class="kbd">'+esc(code || "—")+'</span></td>' +
          '<td data-label="Articolo">'+esc(item)+'</td>' +
          '<td data-label="Q.tà" class="qty">'+Number(qty).toLocaleString("it-IT")+'</td>' +
          '<td data-label="Sede" class="colHideSm">'+esc(wh)+'</td>' +
          '<td data-label="Fonte" class="colHideSm">'+esc(src)+'</td>' +
          '<td data-label="">' +
            (isGroup
              ? '<button class="btn btn-ghost mini jsOpenDaneaDdt" type="button" data-daneakey="'+esc(String(mv.key || ""))+'" title="Dettagli DDT">Dettagli</button>'
              : (showDoc ? '<button class="btn btn-ghost mini jsOpenDoc" type="button" data-mvid="'+esc(id)+'" title="Apri documento">Doc</button>' : '')
            ) +
          '</td>' +
        '</tr>';
    }).join("");

    if (capped){
      els.movementsAllTbody.insertAdjacentHTML("beforeend",
        '<tr><td class="td-muted" colspan="9">Mostrate le prime '+cap.toLocaleString("it-IT")+' righe. Usa i filtri per restringere.</td></tr>');
    }
  }

    var __detailCtx = { id:"", docKey:"" };

  function __setVal(el, v){
    if (!el) return;
    var s = (v == null) ? "" : String(v);
    try{
      // input/textarea => .value, altrimenti testo (div/span/pre)
      if (typeof el.value !== "undefined") el.value = s;
      else el.textContent = s;
    }catch(_){
      try{ el.textContent = s; }catch(__){}
    }
  }

  function __openDetailModal(){
    if (!els.modalMovementDetail) return;
    try{ els.modalMovementDetail.classList.add("open"); }catch(_){}
    try{ (typeof __syncBodyLockFromModals === "function") && __syncBodyLockFromModals(); }catch(_){}
  }

  function __closeDetailModal(){
    if (!els.modalMovementDetail) return;
    try{ els.modalMovementDetail.classList.remove("open"); }catch(_){}
    try{ (typeof __syncBodyLockFromModals === "function") && __syncBodyLockFromModals(); }catch(_){}
  }

  
  // ===== Dettaglio DDT (DaneaXML) — ordinato + drill-down per prodotto =====
  var __ddtDetailCtx = { key: "", group: null, done: null, rows: [], selectedIdx: -1 };

  var __fpCache = { loaded: false, loading: null, fpByCode: new Map(), catByKey: new Map() };

  function __resetDdtDetailCtx(){
    __ddtDetailCtx = { key: "", group: null, done: null, rows: [], selectedIdx: -1 };
    try{ if (els.movDetDdtProdWrap) els.movDetDdtProdWrap.style.display = "none"; }catch(_){ }
    try{ if (els.movDetDdtProdTbody) els.movDetDdtProdTbody.innerHTML = '<tr><td class="td-muted" colspan="5">Seleziona una riga prodotto sopra.</td></tr>'; }catch(_){ }
    try{
      if (els.movDetDdtRowsTbody){
        var sel = els.movDetDdtRowsTbody.querySelectorAll('tr.is-selected');
        sel && sel.forEach && sel.forEach(function(tr){ try{ tr.classList.remove('is-selected'); }catch(_){ } });
      }
    }catch(_){ }
  }

  function __setDdtMode(on){
    try{ if (els.movDetDdtWrap) els.movDetDdtWrap.style.display = on ? "" : "none"; }catch(_){ }
    if (!on) __resetDdtDetailCtx();
  }

  function __getHub(){
    try{ return (window && window.__HUB) ? window.__HUB : null; }catch(_){ return null; }
  }

  async function __fetchDaneaCompletedByKey(key){
    var k = String(key || "").trim();
    if (!k) return null;
    var H = __getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return null;
    if (typeof H.FS.doc !== "function" || typeof H.FS.getDoc !== "function") return null;
    try{
      var doneId = encodeURIComponent(k);
      var ref = H.FS.doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted", doneId);
      var snap = await H.FS.getDoc(ref);
      if (!snap || !snap.exists || !snap.exists()) return null;
      var data = (typeof snap.data === "function") ? (snap.data() || {}) : (snap.data || {});
      data._id = snap.id || doneId;
      return data;
    }catch(e){
      try{ console.warn("fetch daneaDdtCompleted failed", e); }catch(_){ }
      return null;
    }
  }

  // Fallback: se manca il record "completato", prova a leggere il DDT dalla cache daneaDdts
  // (dove vengono salvate le righe parse dell'XML). Così nel dettaglio Movimenti riesci
  // comunque a vedere le righe DDT.
  async function __fetchDaneaCacheByKey(key){
    var k = String(key || "").trim();
    if (!k) return null;
    var H = __getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return null;
    if (typeof H.FS.doc !== "function" || typeof H.FS.getDoc !== "function") return null;
    try{
      var id = encodeURIComponent(k);
      var ref = H.FS.doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdts", id);
      var snap = await H.FS.getDoc(ref);
      if (!snap || !snap.exists || !snap.exists()) return null;
      var data = (typeof snap.data === "function") ? (snap.data() || {}) : (snap.data || {});
      data._id = snap.id || id;
      return data;
    }catch(e){
      try{ console.warn("fetch daneaDdts failed", e); }catch(_){ }
      return null;
    }
  }

  function __parseFraction(v){
    var s = String(v || "").trim();
    if (!s) return null;
    // 1/20
    var m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (m){
      var a = Number(String(m[1]).replace(",", "."));
      var b = Number(String(m[2]).replace(",", "."));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    }
    // number with comma
    var n = Number(s.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
    return null;
  }

  function __compQtyPerUnit(comp){
    var c = comp || {};
    if (c.qty != null && Number.isFinite(Number(c.qty))) return Number(c.qty);
    var raw = c.qtyRaw || c.qtaRaw || "";
    var p = __parseFraction(raw);
    if (p != null && Number.isFinite(p)) return p;
    return null;
  }

  async function __ensureFinishedProductsCache(){
    if (__fpCache.loaded) return true;
    if (__fpCache.loading) {
      try{ await __fpCache.loading; }catch(_){ }
      return !!__fpCache.loaded;
    }

    var H = __getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return false;
    if (typeof H.FS.collection !== "function" || typeof H.FS.getDocs !== "function") return false;

    __fpCache.loading = (async function(){
      try{
        var fpByCode = new Map();
        var catByKey = new Map();

        // finishedProducts
        var colFp = H.FS.collection(H.fb.db, "orgs", H.ORG_ID, "finishedProducts");
        var snapFp = await H.FS.getDocs(colFp);
        var docsFp = (snapFp && snapFp.docs) ? snapFp.docs : [];
        docsFp.forEach(function(d){
          try{
            var data = d.data ? (d.data() || {}) : {};
            var code = String(data.code || data.codeLower || "").trim();
            var codeLower = String(data.codeLower || code).trim().toLowerCase();
            if (!codeLower) return;
            data.id = d.id;
            fpByCode.set(codeLower, data);
          }catch(_){ }
        });

        // finishedProductCategories
        var colCat = H.FS.collection(H.fb.db, "orgs", H.ORG_ID, "finishedProductCategories");
        var snapCat = await H.FS.getDocs(colCat);
        var docsCat = (snapCat && snapCat.docs) ? snapCat.docs : [];
        docsCat.forEach(function(d){
          try{
            var data = d.data ? (d.data() || {}) : {};
            var key = String(data.key || data.name || d.id || "").trim();
            var keyLower = String(key).toLowerCase();
            if (!keyLower) return;
            data.id = d.id;
            catByKey.set(keyLower, data);
          }catch(_){ }
        });

        __fpCache.fpByCode = fpByCode;
        __fpCache.catByKey = catByKey;
        __fpCache.loaded = true;
      }catch(e){
        __fpCache.loaded = false;
        try{ console.warn("ensureFinishedProductsCache failed", e); }catch(_){ }
      }finally{
        __fpCache.loading = null;
      }
    })();

    try{ await __fpCache.loading; }catch(_){ }
    return !!__fpCache.loaded;
  }

  function __getFpForCode(code){
    var low = norm(code || "");
    if (!low) return null;
    try{ return __fpCache.fpByCode.get(low) || null; }catch(_){ return null; }
  }

  function __getFpCategoryForFp(fp){
    if (!fp) return null;
    var k = norm(fp.categoryKey || fp.category || fp.catKey || fp.categoryId || "");
    if (!k) return null;
    try{ return __fpCache.catByKey.get(k) || null; }catch(_){ return null; }
  }

  function __getFpComponents(fp){
    if (!fp) return [];
    var arr = (fp.components || fp.bom || fp.distintaBase);
    var direct = Array.isArray(arr) ? arr : [];
    if (direct.length) return direct;
    var cat = __getFpCategoryForFp(fp);
    var bom = (cat && (cat.bom || cat.components || cat.distintaBase)) || [];
    return Array.isArray(bom) ? bom : [];
  }

  function __macroGroupForCode(code){
    var catKey = "";
    try{ catKey = (api && typeof api.getMacroCategoryForCode === "function") ? String(api.getMacroCategoryForCode(code) || "") : ""; }catch(_){ catKey = ""; }
    catKey = String(catKey || "").trim().toLowerCase();

    // prova a risalire al macro group della categoria
    var mg = "";
    try{
      var cats = (api && typeof api.getCategories === "function") ? (api.getCategories() || []) : [];
      if (catKey && Array.isArray(cats)){
        for (var i=0;i<cats.length;i++){
          var c = cats[i];
          if (!c) continue;
          if (String(c.key || "").trim().toLowerCase() === catKey){
            mg = String(c.macro || c.macroGroup || c.group || "").trim().toLowerCase();
            break;
          }
        }
      }
    }catch(_){ }

    if (mg !== "materie_prime" && mg !== "imballaggi"){
      if (catKey === "materie_prime") mg = "materie_prime";
      else if (catKey === "imballaggi") mg = "imballaggi";
      else mg = "";
    }
    return mg;
  }

  function __macroGroupLabel(mg){
    if (mg === "materie_prime") return "Materie prime";
    if (mg === "imballaggi") return "Imballaggi";
    return "—";
  }

  function __aggComponentsFromMovements(movs){
    var map = new Map();
    (Array.isArray(movs) ? movs : []).forEach(function(mv){
      try{
        var code = String(mv && mv.code || "").trim();
        if (!code) return;
        var low = code.toLowerCase();
        var item = String(mv.item || mv.name || mv.articolo || code).trim();
        var uom = String(mv.uom || "").trim();
        var q = (api && typeof api.safeInt === "function") ? api.safeInt(mv.qty) : (Number(mv.qty) || 0);
        if (!q) return;
        var wh = __normWh(mv.warehouse || "");

        var rec = map.get(low) || { code: code, item: item || code, uom: uom, total: 0, cerea: 0, concamarise: 0 };
        rec.total += q;
        if (wh === "concamarise") rec.concamarise += q;
        else rec.cerea += q;
        if (!rec.item) rec.item = item || code;
        if (!rec.uom) rec.uom = uom;
        map.set(low, rec);
      }catch(_){ }
    });
    return Array.from(map.values());
  }

  function __renderDdtRows(rows){
    if (!els.movDetDdtRowsTbody) return;
    var arr = Array.isArray(rows) ? rows : [];
    if (!arr.length){
      els.movDetDdtRowsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessuna riga nel DDT.</td></tr>';
      return;
    }

    els.movDetDdtRowsTbody.innerHTML = arr.map(function(r, idx){
      var code = String(r && r.code || "").trim();
      var desc = String(r && (r.desc || r.item || r.articolo) || "").trim();
      var uom = String(r && r.uom || "").trim();

      var qtyN = (r && r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : __parseFraction(r && r.qtyRaw);
      var qtyDisp = (qtyN != null && Number.isFinite(qtyN)) ? qtyN.toLocaleString("it-IT") : String(r && r.qtyRaw || "").trim();
      if (!qtyDisp) qtyDisp = "—";

      return '<tr class="jsMovDetDdtRow" data-ddt-idx="'+idx+'">'
        + '<td data-label="Codice"><span class="kbd">'+esc(code || "—")+'</span></td>'
        + '<td data-label="Articolo">'+esc(desc || code || "—")+'</td>'
        + '<td data-label="Q.tà" class="qty" style="text-align:right;">'+esc(qtyDisp)+'</td>'
        + '<td data-label="U.M.">'+esc(uom || "")+'</td>'
        + '</tr>';
    }).join("");
  }

  function __renderDdtComponentsTable(comps){
    if (!els.movDetDdtCompsTbody) return;
    var arr = Array.isArray(comps) ? comps.slice() : [];
    if (!arr.length){
      els.movDetDdtCompsTbody.innerHTML = '<tr><td class="td-muted" colspan="7">Nessun componente scaricato.</td></tr>';
      return;
    }

    // sort: Materie prime -> Imballaggi -> altri, poi codice
    function typeRank(mg){
      if (mg === "materie_prime") return 1;
      if (mg === "imballaggi") return 2;
      return 3;
    }

    arr.sort(function(a,b){
      var ra = typeRank(__macroGroupForCode(a.code));
      var rb = typeRank(__macroGroupForCode(b.code));
      if (ra !== rb) return ra - rb;
      var ca = String(a.code||"");
      var cb = String(b.code||"");
      if (ca !== cb) return ca.localeCompare(cb);
      return String(a.item||"").localeCompare(String(b.item||""));
    });

    els.movDetDdtCompsTbody.innerHTML = arr.map(function(it){
      var mg = __macroGroupForCode(it.code);
      var tipo = __macroGroupLabel(mg);
      var code = String(it.code || "").trim();
      var item = String(it.item || code).trim();
      var uom = String(it.uom || "").trim();
      var tot = Number(it.total || 0);
      var c = Number(it.cerea || 0);
      var k = Number(it.concamarise || 0);
      return '<tr>'
        + '<td data-label="Tipo">'+esc(tipo)+'</td>'
        + '<td data-label="Codice"><span class="kbd">'+esc(code || "—")+'</span></td>'
        + '<td data-label="Articolo">'+esc(item || "—")+'</td>'
        + '<td data-label="Totale" class="qty" style="text-align:right;">'+tot.toLocaleString("it-IT")+'</td>'
        + '<td data-label="Cerea" class="qty" style="text-align:right;">'+c.toLocaleString("it-IT")+'</td>'
        + '<td data-label="Concamarise" class="qty" style="text-align:right;">'+k.toLocaleString("it-IT")+'</td>'
        + '<td data-label="U.M.">'+esc(uom)+'</td>'
        + '</tr>';
    }).join("");
  }

  function __renderDdtProdPlaceholder(msg){
    try{ if (els.movDetDdtProdWrap) els.movDetDdtProdWrap.style.display = ""; }catch(_){ }
    if (!els.movDetDdtProdTbody) return;
    els.movDetDdtProdTbody.innerHTML = '<tr><td class="td-muted" colspan="5">'+esc(msg || "Seleziona una riga prodotto sopra.")+'</td></tr>';
  }

  function __selectDdtRow(idx){
    idx = (idx == null) ? -1 : Number(idx);
    if (!Number.isFinite(idx) || idx < 0) return;

    if (!__ddtDetailCtx || !Array.isArray(__ddtDetailCtx.rows) || !__ddtDetailCtx.rows[idx]) return;

    __ddtDetailCtx.selectedIdx = idx;

    // highlight
    try{
      if (els.movDetDdtRowsTbody){
        var trs = els.movDetDdtRowsTbody.querySelectorAll('tr.jsMovDetDdtRow');
        trs && trs.forEach && trs.forEach(function(tr){ try{ tr.classList.remove('is-selected'); }catch(_){ } });
        var trSel = els.movDetDdtRowsTbody.querySelector('tr[data-ddt-idx="'+idx+'"]');
        if (trSel) trSel.classList.add('is-selected');
      }
    }catch(_){ }

    var r = __ddtDetailCtx.rows[idx];
    var code = String(r && r.code || "").trim();
    var desc = String(r && (r.desc || r.item || r.articolo) || "").trim();

    var qtyN = (r && r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : __parseFraction(r && r.qtyRaw);
    var qLine = (qtyN != null && Number.isFinite(qtyN)) ? qtyN : 0;
    if (qLine <= 0){
      try{ if (els.movDetDdtProdTitle) els.movDetDdtProdTitle.textContent = "Dettaglio prodotto"; }catch(_){ }
      __renderDdtProdPlaceholder("Quantità non valida per questa riga.");
      return;
    }

    try{
      if (els.movDetDdtProdTitle){
        var title = (code ? (code + (desc ? (" — " + desc) : "")) : (desc || "Prodotto"));
        var qlbl = qLine.toLocaleString("it-IT");
        els.movDetDdtProdTitle.textContent = title + " (Q.tà " + qlbl + ")";
      }
    }catch(_){ }

    __renderDdtProdPlaceholder("Calcolo componenti…");

    // calcolo async (best effort)
    (async function(){
      try{
        var ok = await __ensureFinishedProductsCache();
        if (!ok) {
          __renderDdtProdPlaceholder("Non riesco a caricare la distinta base (permessi / rete).");
          return;
        }

        // se nel frattempo hai aperto un altro DDT
        if (!__ddtDetailCtx || __ddtDetailCtx.selectedIdx !== idx) return;

        var fp = __getFpForCode(code);
        if (!fp){
          __renderDdtProdPlaceholder("Prodotto finito non trovato per questo codice.");
          return;
        }

        var comps = __getFpComponents(fp);
        if (!comps || !comps.length){
          __renderDdtProdPlaceholder("Distinta base vuota per questo prodotto.");
          return;
        }

        var out = [];
        for (var i=0;i<comps.length;i++){
          var c = comps[i] || {};
          var cCode = String(c.code || "").trim();
          if (!cCode) continue;
          var per = __compQtyPerUnit(c);
          if (per == null || !Number.isFinite(per) || per <= 0) continue;
          var qty = per * qLine;
          var qtyInt = Math.round(qty);
          if (!qtyInt) continue;
          out.push({
            code: cCode,
            item: String(c.name || c.articolo || cCode).trim(),
            uom: String(c.uom || "").trim(),
            qty: qtyInt,
            mg: __macroGroupForCode(cCode)
          });
        }

        if (!out.length){
          __renderDdtProdPlaceholder("Nessun componente calcolabile (quantità 0). Controlla la distinta base.");
          return;
        }

        // sort
        out.sort(function(a,b){
          var ra = (a.mg === "materie_prime") ? 1 : (a.mg === "imballaggi") ? 2 : 3;
          var rb = (b.mg === "materie_prime") ? 1 : (b.mg === "imballaggi") ? 2 : 3;
          if (ra !== rb) return ra - rb;
          var ca = String(a.code||"");
          var cb = String(b.code||"");
          if (ca !== cb) return ca.localeCompare(cb);
          return String(a.item||"").localeCompare(String(b.item||""));
        });

        if (!els.movDetDdtProdTbody) return;
        try{ if (els.movDetDdtProdWrap) els.movDetDdtProdWrap.style.display = ""; }catch(_){ }

        els.movDetDdtProdTbody.innerHTML = out.map(function(it){
          var tipo = __macroGroupLabel(it.mg);
          return '<tr>'
            + '<td data-label="Tipo">'+esc(tipo)+'</td>'
            + '<td data-label="Codice"><span class="kbd">'+esc(String(it.code||""))+'</span></td>'
            + '<td data-label="Articolo">'+esc(String(it.item||it.code||"—"))+'</td>'
            + '<td data-label="Q.tà" class="qty" style="text-align:right;">'+Number(it.qty||0).toLocaleString("it-IT")+'</td>'
            + '<td data-label="U.M.">'+esc(String(it.uom||""))+'</td>'
            + '</tr>';
        }).join("");

      }catch(e){
        try{ console.warn("DDT per-prodotto calc failed", e); }catch(_){ }
        __renderDdtProdPlaceholder("Errore calcolo dettaglio prodotto.");
      }
    })();
  }

  function openDaneaGroupDetails(g){
    if (!api || !g) return;

    cacheEls();
    __setDdtMode(true);

    var rows = Array.isArray(g.movements) ? g.movements.slice() : [];
    try{
      rows.sort(function(a,b){
        var wa = __normWh(a && a.warehouse || "");
        var wb = __normWh(b && b.warehouse || "");
        if (wa && wb && wa !== wb) return wa.localeCompare(wb);
        var ca = String(a && a.code || "");
        var cb = String(b && b.code || "");
        if (ca && cb && ca !== cb) return ca.localeCompare(cb);
        var ia = String(a && a.item || "");
        var ib = String(b && b.item || "");
        return ia.localeCompare(ib);
      });
    }catch(_){ }

    // aggiorna ctx
    __ddtDetailCtx.key = String(g.key || "").trim();
    __ddtDetailCtx.group = g;
    __ddtDetailCtx.done = null;
    __ddtDetailCtx.rows = [];
    __ddtDetailCtx.selectedIdx = -1;

    // titolo + sub (prima passata)
    try{
      if (els.movDetTitle) els.movDetTitle.textContent = "Dettaglio DDT (DaneaXML)";
      if (els.movDetSubtitle){
        var whSum = (g.warehouse === "split") ? "Cerea + Concamarise" : whLabel(g.warehouse || "");
        els.movDetSubtitle.textContent = [
          ("DDT " + (g.docNum || g.key || "—")),
          (String(g.date || "").trim() || "—"),
          (whSum || "—"),
          ((g.qty || 0) + " righe")
        ].join(" · ");
      }
    }catch(_){ }

    // campi base (KV)
    __setVal(els.movDetDate, String(g.date || "").trim() || "—");
    __setVal(els.movDetType, "OUT (scarico)");
    __setVal(els.movDetWarehouse, (g.warehouse === "split") ? "Cerea + Concamarise" : whLabel(g.warehouse || ""));
    __setVal(els.movDetSource, "DaneaXML");
    __setVal(els.movDetCustomer, "—");
    __setVal(els.movDetCode, String(g.code || "").trim() || "—");
    __setVal(els.movDetItem, "Scarico DDT · " + (g.qty || 0) + " righe");
    __setVal(els.movDetQty, String(g.qty || 0) + " righe");
    __setVal(els.movDetUom, "righe");
    __setVal(els.movDetNote, String(g.note || "").trim() || "—");
    __setVal(els.movDetDocType, "DDT");
    __setVal(els.movDetDocNum, String(g.docNum || "").trim() || "—");
    __setVal(els.movDetDocDateRaw, String(g.docDateRaw || g.date || "").trim() || "—");
    __setVal(els.movDetLineIndex, "—");
    __setVal(els.movDetVat, "—");
    __setVal(els.movDetTriplet, String(g.key || "").trim() || "—");
    __setVal(els.movDetCreatedAt, (api && typeof api.formatDateIT === "function") ? api.formatDateIT(g.createdAt || "") : (String(g.createdAt || "").trim() || "—"));
    __setVal(els.movDetId, String(g.id || "").trim() || "—");

    // RawText nascosto (ora c'è la tabella)
    try{ if (els.movDetRawWrap) els.movDetRawWrap.style.display = "none"; }catch(_){ }

    // bottoni: in DDT non apro doc e non annullo singola riga
    try{ if (els.movDetOpenDoc) els.movDetOpenDoc.style.display = "none"; }catch(_){ }
    try{ if (els.movDetUndo) els.movDetUndo.disabled = true; }catch(_){ }

    // Tabelle
    try{
      if (els.movDetDdtRowsTbody) els.movDetDdtRowsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Carico dettagli…</td></tr>';
      if (els.movDetDdtCompsTbody) els.movDetDdtCompsTbody.innerHTML = '<tr><td class="td-muted" colspan="7">Carico…</td></tr>';
      if (els.movDetDdtProdWrap) els.movDetDdtProdWrap.style.display = "none";
    }catch(_){ }

    // 1) Scarico componenti (dai movimenti effettivi)
    var compsAgg = __aggComponentsFromMovements(rows);
    __renderDdtComponentsTable(compsAgg);

    // 2) Righe DDT
    (async function(){
      var k = String(g.key || "").trim();
      if (!k) { __renderDdtRows([]); return; }
      // Prova prima da "completati" (contiene anche allocations), poi fallback su cache DDT
      var done = await __fetchDaneaCompletedByKey(k);
      var ddtSrc = done || (await __fetchDaneaCacheByKey(k));
      // se nel frattempo hai aperto un altro DDT
      if (!__ddtDetailCtx || __ddtDetailCtx.key !== k) return;

      if (!ddtSrc){
        __renderDdtRows([]);
        try{ __setVal(els.movDetCustomer, "—"); }catch(_){ }
        return;
      }

      __ddtDetailCtx.done = done || null;
      __ddtDetailCtx.rows = Array.isArray(ddtSrc.rows) ? ddtSrc.rows : [];
      __renderDdtRows(__ddtDetailCtx.rows);

      // aggiorna cliente/subtitle (seconda passata)
      try{
        var cust = String(ddtSrc.customer || "").trim();
        if (cust) __setVal(els.movDetCustomer, cust);
        if (els.movDetSubtitle){
          var whSum = (g.warehouse === "split") ? "Cerea + Concamarise" : whLabel(g.warehouse || "");
          els.movDetSubtitle.textContent = [
            (cust || "—"),
            ("DDT " + (ddtSrc.number || g.docNum || g.key || "—")),
            (String(ddtSrc.date || g.date || "").trim() || "—"),
            (whSum || "—")
          ].join(" · ");
        }
      }catch(_){ }

    })();

    // hint: tradizionale e chiaro
    try{
      if (els.movDetHint) els.movDetHint.textContent = "Questo DDT ha generato uno scarico automatico di componenti (distinta base).";
    }catch(_){ }

    __openDetailModal();
  }



  
  function openDetails(mv){
    if (!api || !mv) return;

    cacheEls();

    // DaneaXML group row
    if (mv && mv.__kind === "danea_ddt") { openDaneaGroupDetails(mv); return; }

    // modal standard: nascondi sezioni DDT
    try{ __setDdtMode(false); }catch(_){ }

    // Se non abbiamo il modale dedicato, fallback alla modale testuale legacy
    if (!els.modalMovementDetail){
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
      try{ api.openModal("Dettaglio movimento", lines.join("\n")); }catch(_){ }
      return;
    }

    // Doc key (se presente)
    var docKey = "";
    try{ docKey = buildDocKeyFromMovement(mv) || ""; }catch(_){ docKey = ""; }
    __detailCtx.id = String(mv.id || "");
    __detailCtx.docKey = String(docKey || "");

    // Titolo + sub
    try{
      if (els.movDetTitle) els.movDetTitle.textContent = "Dettaglio movimento";
      if (els.movDetSubtitle){
        var d = String(mv.date || "").trim();
        var wh = whLabel(mv.warehouse || "");
        var cust = String(mv.customer || "").trim();
        els.movDetSubtitle.textContent = [cust || "—", (d || "—"), (wh || "—")].join(" · ");
      }
    }catch(_){ }

    // Campi (ordine)
    var typeLbl = (String(mv.type || "").toUpperCase() === "OUT") ? "OUT (scarico)" : "IN (carico)";
    var uom = String(mv.uom || "").trim();
    var qty = (api && typeof api.safeInt === "function") ? api.safeInt(mv.qty) : (Number(mv.qty)||0);
    var qtyRaw = String(mv.qtyRaw || "").trim();
    if (!qtyRaw) qtyRaw = Number(qty).toLocaleString("it-IT") + (uom ? (" " + uom) : "");

    __setVal(els.movDetDate, String(mv.date || "").trim() || "—");
    __setVal(els.movDetType, typeLbl);
    __setVal(els.movDetWarehouse, whLabel(mv.warehouse || ""));
    __setVal(els.movDetSource, String(mv.source || "").trim() || "—");
    __setVal(els.movDetCustomer, String(mv.customer || "").trim() || "—");
    __setVal(els.movDetCode, String(mv.code || "").trim() || "—");
    __setVal(els.movDetItem, String(mv.item || "").trim() || "—");
    __setVal(els.movDetQty, String(qtyRaw || "").trim() || "—");
    __setVal(els.movDetUom, uom || "—");
    __setVal(els.movDetNote, String(mv.note || "").trim() || "—");
    __setVal(els.movDetDocType, String(mv.docType || "").trim() || "—");
    __setVal(els.movDetDocNum, String(mv.docNum || "").trim() || "—");
    __setVal(els.movDetDocDateRaw, String(mv.docDateRaw || "").trim() || "—");
    __setVal(els.movDetLineIndex, (mv.lineIndex != null && String(mv.lineIndex).trim() !== "") ? String(mv.lineIndex) : "—");
    __setVal(els.movDetVat, String(mv.supplierVat || mv.vatNorm || mv.vat || "").trim() || "—");
    __setVal(els.movDetTriplet, String(mv.ddtTripletKey || mv.ddtKey || "").trim() || "—");
    __setVal(els.movDetCreatedAt, (api && typeof api.formatDateIT === "function") ? api.formatDateIT(mv.createdAt) : (String(mv.createdAt || "").trim() || "—"));
    __setVal(els.movDetId, String(mv.id || "").trim() || "—");

    var raw = String(mv.rawText || "").trim();
    __setVal(els.movDetRawText, raw || "");
    try{ if (els.movDetRawWrap) els.movDetRawWrap.style.display = raw ? "" : "none"; }catch(_){ }

    // Bottone documento
    try{
      var show = !!(__detailCtx.docKey && typeof api.openDocDetail === "function");
      if (els.movDetOpenDoc) els.movDetOpenDoc.style.display = show ? "" : "none";
    }catch(_){ }

    // Bottone annulla (richiede API)
    try{
      if (els.movDetUndo) els.movDetUndo.disabled = !(api && typeof api.deleteMovement === "function" && __detailCtx.id);
    }catch(_){ }

    // hint standard
    try{
      if (els.movDetHint) els.movDetHint.textContent = "Annulla movimento = elimina questa riga e ripristina lo stock come prima.";
    }catch(_){ }

    __openDetailModal();
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
        var btnDanea = e.target && e.target.closest ? e.target.closest("button.jsOpenDaneaDdt") : null;
        if (btnDanea){
          e.preventDefault(); e.stopPropagation();
          var k0 = btnDanea.getAttribute("data-daneakey") || "";
          var g0 = getDaneaGroupByKey(k0);
          if (g0) openDaneaGroupDetails(g0);
          return;
        }

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

        // DaneaXML group row
        var kind = String(tr.getAttribute("data-kind") || "").trim().toLowerCase();
        if (kind === "danea"){
          var k1 = tr.getAttribute("data-daneakey") || "";
          var g1 = getDaneaGroupByKey(k1);
          if (g1) openDaneaGroupDetails(g1);
          return;
        }

        var id2 = tr.getAttribute("data-mvid") || "";
        var mv2 = (getAllMovements().find(function(x){ return String(x && x.id || "") === String(id2); })) || null;
        if (mv2) openDetails(mv2);
      });
    }
    // Detail modal controls (bind once)
    try{
      cacheEls();
      if (els.modalMovementDetail && !(els.modalMovementDetail.dataset && els.modalMovementDetail.dataset.bound === "1")){
        if (els.modalMovementDetail.dataset) els.modalMovementDetail.dataset.bound = "1";

        // click fuori = chiudi
        els.modalMovementDetail.addEventListener("click", function(ev){
          if (ev && ev.target === els.modalMovementDetail) __closeDetailModal();
        });

        if (els.movDetClose) els.movDetClose.addEventListener("click", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
          __closeDetailModal();
        });
        if (els.movDetDone) els.movDetDone.addEventListener("click", function(e){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
          __closeDetailModal();
        });

        // Click su riga prodotto (DDT) => dettaglio componenti per quel prodotto
        try{
          if (els.movDetDdtRowsTbody && !(els.movDetDdtRowsTbody.dataset && els.movDetDdtRowsTbody.dataset.bound === "1")){
            if (els.movDetDdtRowsTbody.dataset) els.movDetDdtRowsTbody.dataset.bound = "1";
            els.movDetDdtRowsTbody.addEventListener("click", function(ev){
              var tr = ev && ev.target && ev.target.closest ? ev.target.closest("tr[data-ddt-idx]") : null;
              if (!tr) return;
              try{ ev.preventDefault(); ev.stopPropagation(); }catch(_){ }
              var idx = parseInt(tr.getAttribute("data-ddt-idx") || "", 10);
              if (!Number.isFinite(idx)) return;
              try{ __selectDdtRow(idx); }catch(_){ }
            });
          }
        }catch(_){ }


        if (els.movDetOpenDoc) els.movDetOpenDoc.addEventListener("click", function(e){
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
          if (!api || typeof api.openDocDetail !== "function") return;
          var k = String(__detailCtx.docKey || "").trim();
          if (!k) return;
          try{ api.openDocDetail(k); }catch(_){}
          __closeDetailModal();
        });

        if (els.movDetUndo) els.movDetUndo.addEventListener("click", async function(e){
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
          if (!api || typeof api.deleteMovement !== "function") {
            try{ api && api.openModal && api.openModal("Operazione non disponibile", "Per annullare un movimento serve l'API deleteMovement."); }catch(_){}
            return;
          }
          var id = String(__detailCtx.id || "").trim();
          if (!id) return;

          var ok = confirm("Annullare questo movimento?\n\nVerrà eliminata questa riga e lo stock tornerà come prima.");
          if (!ok) return;

          try{ els.movDetUndo.disabled = true; }catch(_){}
          try{ await api.deleteMovement(id); }catch(err){
            try{ api.openModal && api.openModal("Errore", String(err && (err.message || err) || err)); }catch(_){}
            try{ els.movDetUndo.disabled = false; }catch(_){}
            return;
          }

          try{ api.showToast && api.showToast("Movimento annullato"); }catch(_){}
          __closeDetailModal();
        });
      }
    }catch(_){}

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

    // Dettaglio movimento (modal)
    els.modalMovementDetail = $("modalMovementDetail");
    els.movDetTitle = $("movDetTitle");
    els.movDetSubtitle = $("movDetSubtitle");
    els.movDetClose = $("movDetClose");
    els.movDetDone = $("movDetDone");
    els.movDetOpenDoc = $("movDetOpenDoc");
    els.movDetUndo = $("movDetUndo");

    els.movDetDate = $("movDetDate");
    els.movDetType = $("movDetType");
    els.movDetWarehouse = $("movDetWarehouse");
    els.movDetSource = $("movDetSource");
    els.movDetCustomer = $("movDetCustomer");
    els.movDetCode = $("movDetCode");
    els.movDetItem = $("movDetItem");
    els.movDetQty = $("movDetQty");
    els.movDetUom = $("movDetUom");
    els.movDetNote = $("movDetNote");
    els.movDetDocType = $("movDetDocType");
    els.movDetDocNum = $("movDetDocNum");
    els.movDetDocDateRaw = $("movDetDocDateRaw");
    els.movDetLineIndex = $("movDetLineIndex");
    els.movDetVat = $("movDetVat");
    els.movDetTriplet = $("movDetTriplet");
    els.movDetCreatedAt = $("movDetCreatedAt");
    els.movDetId = $("movDetId");
    els.movDetRawText = $("movDetRawText");

    // DDT (DaneaXML) dettaglio ordinato
    els.movDetRawWrap = $("movDetRawWrap");
    els.movDetKvGrid = $("movDetKvGrid");
    els.movDetDdtWrap = $("movDetDdtWrap");
    els.movDetDdtRowsTbody = $("movDetDdtRowsTbody");
    els.movDetDdtCompsTbody = $("movDetDdtCompsTbody");
    els.movDetDdtProdWrap = $("movDetDdtProdWrap");
    els.movDetDdtProdTitle = $("movDetDdtProdTitle");
    els.movDetDdtProdTbody = $("movDetDdtProdTbody");

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

    var ui = buildUiRows(all);
    var totalRows = ui.length;

    var filtered = applyFilters(ui);
    applySort(filtered);
    renderTable(filtered, totalRows);
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
        </div>
      </div>

      <div class="inlineRow listStickyBar" style="justify-content:space-between; align-items:flex-end; gap:12px; margin-top: 10px;">
        <div class="field" style="flex: 1 1 auto; min-width: 220px;">
          <label for="flowsSearch">Cerca</label>
          <input id="flowsSearch" placeholder="Documento, fornitore, numero, codice, articolo…" autocomplete="off" />
        </div>
        <div class="inlineRow" style="gap:8px; justify-content:flex-end; margin-left:auto;">
          <button class="btn btn-ghost mini" id="btnFlowsClear" type="button" title="Svuota ricerca">Reset</button>
          <div class="hero-sub" id="flowsMeta">—</div>
        </div>
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
/* ===== danea_ddt_download_view.js ===== */
// Inject "Scarica flussi DDT" view markup into #viewDaneaDdt
(function(){
  try{
    var root = document.getElementById("viewDaneaDdt");
    if (!root) return;
    if (root.dataset && root.dataset.injected === "1") return;
    if (root.dataset) root.dataset.injected = "1";

    root.innerHTML = `<article class="card" id="daneaDdtCard">
      <div class="hd">
        <div class="overlayHeaderTitle">
          <button class="iconBtn overlayBack" id="btnBackDaneaDdt" type="button" aria-label="Indietro">‹</button>
          <h2>Scarica flussi DDT</h2>
        </div>
        <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
          <div class="seg daneaTabs">
            <button id="daneaTabVerify" class="active" type="button">Da verificare <span class="pill" id="pillDaneaVerify" style="height:auto; padding:2px 8px; border-radius:999px; border:0; background:rgba(10,132,255,.12); color:rgba(0,0,0,.86);">0</span></button>
            <button id="daneaTabDone" type="button">Completati <span class="pill" id="pillDaneaDone" style="height:auto; padding:2px 8px; border-radius:999px; border:0; background:rgba(0,0,0,.06); color:rgba(0,0,0,.86);">0</span></button>
          </div>
          <div class="daneaAutoCtl" id="daneaAutoCtl" title="Se ON: scarica automaticamente tutti i DDT verdi che arrivano. Se OFF: modalità manuale.">
            <span class="daneaAutoLbl" id="daneaAutoLbl">MANUALE</span>
            <label class="iosSwitch" aria-label="Scarico automatico DDT">
              <input id="daneaAutoSwitch" type="checkbox" />
              <span class="iosSlider"></span>
            </label>
          </div>
          <div class="pill" id="pillDaneaCount">0</div>
          <button class="iconBtn" id="btnCloseDaneaDdt" type="button" aria-label="Chiudi">×</button>
        </div>
      </div>

      <div class="bd">

        <!-- LIST -->
        <div id="daneaListWrap" class="stack" style="gap:10px;">
          <div class="inlineRow listStickyBar" style="justify-content:space-between; align-items:flex-end; gap:12px; margin-top: 10px;">
            <div class="field" style="flex: 1 1 auto; min-width: 220px;">
              <label for="daneaSearch">Cerca</label>
              <input id="daneaSearch" placeholder="Numero, data, cliente…" autocomplete="off" />
            </div>
            <div class="inlineRow" style="gap:8px; justify-content:flex-end; margin-left:auto;">
              <button class="btn btn-ghost mini" id="btnDaneaClear" type="button">Reset</button>
              <div class="hero-sub" id="daneaMeta">—</div>
            </div>
          </div>

          <div class="tableWrap" style="max-height: 520px; overflow:auto; margin-top: 0; width:100%;">
            <table class="dataGrid">
              <thead>
                <tr>
                  <th style="width: 120px;">Data</th>
                  <th style="width: 120px;">Numero</th>
                  <th>Cliente</th>
                  <th class="qty" style="width: 90px;">Righe</th>
                  <th class="qty" style="width: 120px;">Stato</th>
                  <th style="width: 120px;"></th>
                </tr>
              </thead>
              <tbody id="daneaTbody">
                <tr><td class="td-muted" colspan="6">Carico XML…</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- DETAIL -->
        <div id="daneaDetailWrap" class="stack" style="gap:10px; display:none;">
          <div class="inlineRow" style="justify-content:space-between; align-items:flex-end; gap:12px;">
            <div class="stack" style="flex:1; min-width:240px;">
              <div class="hero-sub" id="daneaDetTitle">DDT</div>
              <div class="muted" id="daneaDetSubtitle" style="font-weight:900;">—</div>
            </div>
            <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
              <button class="btn btn-primary" id="btnDaneaSend" type="button" disabled>Completa (scarica)</button>
            </div>
          </div>

          <div class="tableWrap" style="max-height: 520px; overflow:auto; width:100%;">
            <table class="dataGrid">
              <thead>
                <tr>
                  <th style="width: 44px;"></th>
                  <th style="width: 160px;">Codice</th>
                  <th>Articolo</th>
                  <th class="qty" style="width: 120px;">Q.tà</th>
                  <th style="width: 90px;">U.M.</th>
                  <th style="width: 170px; text-align:right;">Azioni</th>
                </tr>
              </thead>
              <tbody id="daneaItemsTbody">
                <tr><td class="td-muted" colspan="6">Apri un DDT.</td></tr>
              </tbody>
            </table>
          </div>

          <div class="muted" id="daneaDetFooter" style="font-size:12px; font-weight:900;">—</div>
        </div>
      </div>
    </article>`;
  }catch(e){
    try{ console.warn("danea view inject failed", e); }catch(_){ }
  }
})();
;

/* ===== revenue_view.js ===== */
// Inject "Fatturato" view markup into #viewRevenue
(function(){
  try{
    var root = document.getElementById("viewRevenue");
    if (!root) return;
    if (root.dataset && root.dataset.injected === "1") return;
    if (root.dataset) root.dataset.injected = "1";

    root.innerHTML = `<article class="card" id="revenueCard">
      <div class="hd">
        <div class="overlayHeaderTitle">
          <button class="iconBtn overlayBack" id="btnBackRevenue" type="button" aria-label="Indietro">‹</button>
          <h2>Fatturato</h2>
        </div>
        <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
          <div class="pill" id="pillRevenueCount">0</div>
          <button class="iconBtn" id="btnCloseRevenue" type="button" aria-label="Chiudi">×</button>
        </div>
      </div>

      <div class="bd">
        <!-- LIST -->
        <div id="revListWrap" class="stack" style="gap:10px;">
          <div class="inlineRow listStickyBar" style="justify-content:space-between; align-items:flex-end; gap:12px; margin-top: 10px;">
            <div class="field" style="flex: 1 1 auto; min-width: 220px;">
              <label for="revSearch">Cerca</label>
              <input id="revSearch" placeholder="Numero, cliente, codice…" autocomplete="off" />
            </div>
            <div class="inlineRow" style="gap:8px; justify-content:flex-end; margin-left:auto;">
              <button class="btn btn-ghost mini" id="btnRevClear" type="button">Reset</button>
              <div class="hero-sub" id="revMeta">—</div>
            </div>
          </div>

          <div class="tableWrap" style="max-height: 520px; overflow:auto; margin-top: 0; width:100%;">
            <table class="dataGrid" id="revTable">
              <thead>
                <tr>
                  <th style="width: 120px;">Data</th>
                  <th style="width: 120px;">Numero</th>
                  <th>Cliente</th>
                  <th class="qty" style="width: 160px; text-align:right;">Imponibile</th>
                  <th class="qty" style="width: 140px; text-align:right;">IVA</th>
                  <th class="qty" style="width: 160px; text-align:right;">Totale</th>
                  <th style="width: 120px;"></th>
                </tr>
              </thead>
              <tbody id="revTbody">
                <tr><td class="td-muted" colspan="7">Carico…</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- DETAIL -->
        <div id="revDetailWrap" class="stack" style="gap:10px; display:none;">
          <div class="inlineRow" style="justify-content:space-between; align-items:flex-end; gap:12px;">
            <div class="stack" style="flex:1; min-width:240px;">
              <div class="hero-sub" id="revDetTitle">DDT</div>
              <div class="muted" id="revDetSubtitle" style="font-weight:900;">—</div>
            </div>
            <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
              <button class="btn btn-ghost btn-xs" id="btnRevBackList" type="button">← Elenco</button>
            </div>
          </div>

          <div class="inlineRow" style="gap:10px; justify-content:flex-end;">
            <div class="pill" id="revDetNet">Imponibile: —</div>
            <div class="pill" id="revDetVat">IVA: —</div>
            <div class="pill" id="revDetGross">Totale: —</div>
          </div>

          <div class="tableWrap" style="max-height: 520px; overflow:auto; width:100%;">
            <table class="dataGrid" id="revItemsTable">
              <thead>
                <tr>
                  <th style="width: 160px;">Codice</th>
                  <th>Articolo</th>
                  <th class="qty" style="width: 110px; text-align:right;">Q.tà</th>
                  <th class="qty" style="width: 160px; text-align:right;">Imponibile</th>
                  <th class="qty" style="width: 140px; text-align:right;">IVA</th>
                  <th class="qty" style="width: 160px; text-align:right;">Totale</th>
                </tr>
              </thead>
              <tbody id="revItemsTbody">
                <tr><td class="td-muted" colspan="6">Apri un DDT.</td></tr>
              </tbody>
            </table>
          </div>

          <div class="muted" id="revDetFooter" style="font-size:12px; font-weight:900;">—</div>
        </div>
      </div>
    </article>`;
  }catch(e){
    try{ console.warn("revenue view inject failed", e); }catch(_){ }
  }
})();


;
/* ===== fp_categories_view.js ===== */
// Inject "Categorie prodotti finiti" view markup into #viewFPCategories
(function(){
  try{
    var root = document.getElementById("viewFPCategories");
    if (!root) return;
    if (root.dataset && root.dataset.injected === "1") return;
    if (root.dataset) root.dataset.injected = "1";

    root.innerHTML = `<article class="card" id="fpCategoriesCard">
      <div class="hd">
        <div class="overlayHeaderTitle">
          <button class="iconBtn overlayBack" id="btnBackFPCategories" type="button" aria-label="Indietro">‹</button>
          <h2>Categorie prodotti finiti</h2>
        </div>
        <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
          <div class="pill" id="pillFPCategoriesCount">0</div>
          <button class="iconBtn" id="btnCloseFPCategories" type="button" aria-label="Chiudi">×</button>
        </div>
      </div>
      <div class="bd">

        <div class="inlineRow listStickyBar" style="justify-content:space-between; align-items:flex-end; gap:12px;">
          <div class="field" style="flex: 1 1 auto; min-width: 220px;">
            <label for="fpCatSearch">Cerca</label>
            <input id="fpCatSearch" placeholder="Nome categoria o prodotto finito…" autocomplete="off" />
          </div>
          <button class="btn btn-secondary" id="btnFpCatNew" type="button">Nuova categoria</button>
        </div>

        <div id="fpCatCreateRow" class="fieldGrid" style="display:none; grid-template-columns: 1fr; gap:10px; margin-top: 6px;">
          <div class="field" style="grid-column: 1 / -1;">
            <label>Nuova categoria prodotti finiti</label>
            <div class="inlineRow" style="justify-content:flex-start; gap:10px;">
              <input id="fpCatNewName" class="qtyEditInput" type="text" placeholder="Nome categoria (es. Sacchetti 1 kg)" style="flex:1 1 260px; min-width: 220px;" />
              <button class="btn btn-primary btn-xs" id="btnFpCatCreate" type="button">Crea</button>
              <button class="btn btn-ghost btn-xs" id="btnFpCatCancelCreate" type="button">Annulla</button>
            </div>
            <div class="td-muted" style="margin-top:6px;">Definisci una distinta base per categoria e assegna i prodotti finiti: saranno configurati subito dappertutto.</div>
          </div>
        </div>

        <div class="tableWrap" style="max-height: 520px; overflow:auto; margin-top: 10px;">
          <table class="dataGrid" id="fpCatTable">
            <thead>
              <tr>
                <th>Categoria</th>
                <th class="qty" style="width: 110px;">Prodotti</th>
                <th class="qty" style="width: 110px;">BOM</th>
                <th style="width: 160px; text-align:right;">Azioni</th>
              </tr>
            </thead>
            <tbody id="fpCatTbody">
              <tr><td class="td-muted" colspan="4">Carico categorie…</td></tr>
            </tbody>
          </table>
        </div>

      </div>
    </article>`;
  }catch(e){
    try{ console.warn("fp_categories_view inject failed", e); }catch(_){ }
  }
})();

/* ===== danea_ddt_download.js ===== */
/* Scarica flussi DDT (Easyfatt-Xml/Danea) + verifica distinta base + scarico automatico componenti */
(function(){
  "use strict";

  const LS_URL = "hubinv_danea_xml_url";
  const LS_AUTO_DISCH = "hubinv_danea_auto_discharge"; // 1=on, 0=off (scarico su 'Completa')
  const LS_AUTO_MODE = "hubinv_danea_auto_mode"; // 1=auto, 0=manual (scarica automaticamente i DDT verdi)
  // Default endpoint (Cloud Run proxy). If you deploy a new service, update this.
  const DEFAULT_XML_URL_BASE = "https://danea-xml-proxy-537555699968.europe-west8.run.app";

  const S = {
    xmlUrl: "",
    autoDischarge: true,
    autoMode: false,
    autoModeTimer: null,
    autoModeLastRun: 0,
    lastXmlHash: "",
    lastFetchedAt: "",
    ddts: [],             // from XML (solo per sync, NON per UI)
    lastParsedCount: 0,
    lastSyncError: "",
    tab: "verify",        // verify | done
    selectedKey: "",
    selected: null,
    completed: [],        // from Firestore (scaricati)
    completedMap: new Map(),
    cache: [],            // from Firestore (DDT persistenti)
    cacheMap: new Map(),
    cacheReady: false,
    finished: [],         // finishedProducts snapshot
    fpByCode: new Map(),  // codeLower -> fp
    fpCats: [],
    fpCatByKey: new Map(),
    timer: null,
    busy: false,
    hub: null,
    pendingParsed: null,  // buffer RAM (solo finché Firestore non è pronto)
    unsub: { completed:null, finished:null, cache:null, fpcats:null }
  };

  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escAttr(s){ return esc(s).replace(/\n/g, " "); }

  function norm(s){ return String(s ?? "").trim().toLowerCase(); }

  function __readAutoFromLS(){
    try{
      const v = String(localStorage.getItem(LS_AUTO_DISCH) || "").trim().toLowerCase();
      if (!v) return true; // default ON
      if (v === "0" || v === "false" || v === "off" || v === "no") return false;
      return true;
    }catch(_){ return true; }
  }

  function __writeAutoToLS(on){
    try{ localStorage.setItem(LS_AUTO_DISCH, on ? "1" : "0"); }catch(_){ }
  }

  // ===== AUTO MODE (switch) — scarica automaticamente i DDT verdi che arrivano =====
  function __readAutoModeFromLS(){
    try{
      const v = String(localStorage.getItem(LS_AUTO_MODE) || "").trim().toLowerCase();
      if (!v) return false; // default: MANUALE
      if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
      return false;
    }catch(_){ return false; }
  }

  function __writeAutoModeToLS(on){
    try{ localStorage.setItem(LS_AUTO_MODE, on ? "1" : "0"); }catch(_){ }
  }

  function __ensureAutoModeCss(){
    try{
      if (document.getElementById("daneaAutoModeCss")) return;
      const st = document.createElement("style");
      st.id = "daneaAutoModeCss";
      st.textContent = `
/* Danea — Auto mode switch (iOS-ish) */
.daneaAutoCtl{ display:inline-flex; align-items:center; gap:8px; height:36px; padding:0 10px; border-radius:999px; border:1px solid rgba(0,0,0,.12); background:rgba(0,0,0,.02); user-select:none; }
.daneaAutoCtl.is-on{ border-color: rgba(37,185,79,.35); background: rgba(37,185,79,.12); }
.daneaAutoCtl.is-running{ border-color: rgba(10,132,255,.28); background: rgba(10,132,255,.10); }
.daneaAutoLbl{ font-size:12px; font-weight:950; letter-spacing:.02em; color: rgba(0,0,0,.86); white-space:nowrap; }
.iosSwitch{ position:relative; width:44px; height:24px; display:inline-block; flex:0 0 auto; }
.iosSwitch input{ position:absolute; opacity:0; width:0; height:0; }
.iosSwitch .iosSlider{ position:absolute; inset:0; border-radius:999px; background: rgba(0,0,0,.22); transition: background .18s ease; }
.iosSwitch .iosSlider::before{ content:""; position:absolute; width:20px; height:20px; left:2px; top:2px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.18); transition: transform .18s ease; }
.iosSwitch input:checked + .iosSlider{ background: rgba(37,185,79,.72); }
.iosSwitch input:checked + .iosSlider::before{ transform: translateX(20px); }
`;
      document.head.appendChild(st);
    }catch(_){ }
  }

  function __syncAutoModeUi(tmpLabel){
    const ctl = $("daneaAutoCtl");
    const lbl = $("daneaAutoLbl");
    const sw  = $("daneaAutoSwitch");
    const on = !!S.autoMode;

    try{ __ensureAutoModeCss(); }catch(_){ }

    if (sw){
      try{ sw.checked = on; }catch(_){ }
    }
    if (ctl){
      try{ ctl.classList.toggle("is-on", on); }catch(_){ }
      try{ ctl.classList.toggle("is-off", !on); }catch(_){ }
    }
    if (lbl){
      try{ lbl.textContent = tmpLabel ? String(tmpLabel) : (on ? "AUTO" : "MANUALE"); }catch(_){ }
    }
  }

  function __autoModeSetRunning(running){
    const ctl = $("daneaAutoCtl");
    if (!ctl) return;
    try{ ctl.classList.toggle("is-running", !!running); }catch(_){ }
  }

  function setAutoMode(on){
    S.autoMode = !!on;
    __writeAutoModeToLS(S.autoMode);
    __syncAutoModeUi();
    try{ window.HubInv?.renderHomeDaneaCockpit?.(); }catch(_){ }

    // stop timers
    try{ if (!S.autoMode && S.autoModeTimer) { clearTimeout(S.autoModeTimer); S.autoModeTimer = null; } }catch(_){ }

    // se accendo: prova subito a scaricare i verdi (best-effort)
    if (S.autoMode){
      try{ maybeAutoModeTick("toggleOn"); }catch(_){ }
    }
  }

  function scheduleAutoModeTick(delayMs){
    if (!S.autoMode) return;
    let d = Number(delayMs);
    if (!Number.isFinite(d) || d < 0) d = 900;
    d = Math.max(250, Math.min(60000, d));
    try{ if (S.autoModeTimer) clearTimeout(S.autoModeTimer); }catch(_){ }
    S.autoModeTimer = setTimeout(() => {
      S.autoModeTimer = null;
      autoModeTick().catch(()=>{});
    }, d);
  }

  function maybeAutoModeTick(reason){
    if (!S.autoMode) return;
    // piccolo debounce (evita loop troppo aggressivi)
    const now = Date.now();
    if (now - (S.autoModeLastRun || 0) < 500) {
      scheduleAutoModeTick(1200);
      return;
    }
    scheduleAutoModeTick(700);
  }

  async function autoModeTick(){
    if (!S.autoMode) { __syncAutoModeUi(); return; }
    if (S.busy) { scheduleAutoModeTick(1500); return; }
    if (!S.cacheReady) { scheduleAutoModeTick(1500); return; }

    // serve la configurazione prodotti finiti per sapere se un DDT è verde
    try{
      if (!(S.fpByCode instanceof Map) || S.fpByCode.size === 0){
        scheduleAutoModeTick(2000);
        return;
      }
    }catch(_){ scheduleAutoModeTick(2000); return; }

    cacheCompletedMap();

    const baseVerify = (S.cache || []);
    const verifyList = baseVerify.filter(d => d && d.key && !S.completedMap.has(d.key));
    const green = verifyList.filter(d => { try{ return !!ddtStatus(d).ok; }catch(_){ return false; } });

    if (!green.length){
      __syncAutoModeUi();
      return;
    }

    // run
    S.autoModeLastRun = Date.now();
    __autoModeSetRunning(true);
    __syncAutoModeUi(`AUTO ${green.length}`);

    try{
      await dischargeAllGreenDdts({ silent: true, fromAuto: true });
    }catch(e){
      try{ console.warn("autoModeTick discharge failed", e); }catch(_){ }
      try{ window.HubInv?.showToast?.("Auto-scarico DDT: errore", "err"); }catch(_){ }
    }finally{
      __autoModeSetRunning(false);
      __syncAutoModeUi();
      if (S.autoMode) scheduleAutoModeTick(2500);
    }
  }

  function __initAutoMode(){
    try{ __ensureAutoModeCss(); }catch(_){ }
    try{ S.autoMode = __readAutoModeFromLS(); }catch(_){ S.autoMode = false; }
    __syncAutoModeUi();
    if (S.autoMode){
      try{ maybeAutoModeTick("init"); }catch(_){ }
    }
  }

  function __bindAutoModeSwitch(){
    const sw = $("daneaAutoSwitch");
    if (!sw) return;
    if (sw.dataset && sw.dataset.bound === "1") return;
    try{ if (sw.dataset) sw.dataset.bound = "1"; }catch(_){ }

    try{ sw.addEventListener("change", () => { try{ setAutoMode(!!sw.checked); }catch(_){ } }); }catch(_){ }

    // click sul testo = toggle (più comodo)
    try{
      const lbl = $("daneaAutoLbl");
      if (lbl && !(lbl.dataset && lbl.dataset.bound === "1")){
        if (lbl.dataset) lbl.dataset.bound = "1";
        lbl.style.cursor = "pointer";
        lbl.addEventListener("click", () => {
          try{ sw.checked = !sw.checked; }catch(_){ }
          try{ setAutoMode(!!sw.checked); }catch(_){ }
        });
      }
    }catch(_){ }

    // init state
    __initAutoMode();
  }

  function __autoModeKick(reason){
    if (!S.autoMode) return;
    try{ maybeAutoModeTick(reason || "kick"); }catch(_){ }
  }

  function __syncAutoToggleUi(){
    const btn = $("btnDaneaAutoToggle");
    const on = !!S.autoDischarge;

    if (btn){
      try{ btn.setAttribute("aria-pressed", on ? "true" : "false"); }catch(_){ }
      try{ btn.textContent = on ? "Scarica DDT verdi" : "Scarica DDT verdi (scarico OFF)"; }catch(_){ }
      try{
        // Colori: verde = ON, grigio = OFF (override anche se in overlay i bottoni sono blu)
        if (on){
          btn.style.setProperty("background", "rgba(37,185,79,.14)", "important");
          btn.style.setProperty("border-color", "rgba(37,185,79,.35)", "important");
          btn.style.setProperty("color", "rgba(0,70,20,.92)", "important");
        } else {
          btn.style.setProperty("background", "rgba(0,0,0,.06)", "important");
          btn.style.setProperty("border-color", "rgba(0,0,0,.12)", "important");
          btn.style.setProperty("color", "rgba(0,0,0,.84)", "important");
        }
      }catch(_){ }
    }

    const btnSend = $("btnDaneaSend");
    if (btnSend){
      try{ btnSend.textContent = on ? "Completa (scarica)" : "Completa (senza scarico)"; }catch(_){ }
    }
  }

  function setAutoDischarge(on){
    S.autoDischarge = !!on;
    __writeAutoToLS(S.autoDischarge);
    __syncAutoToggleUi();
    // se dettaglio aperto, aggiorna footer + stato bottone
    try{
      const wrap = $("daneaDetailWrap");
      if (S.selected && wrap && wrap.style.display !== "none"){
        renderDetail(S.selected, S.tab === "done" ? "done" : "verify");
      }
    }catch(_){ }
  }

  function hashStr(str){
    // fast non-crypto hash (deterministico)
    const s = String(str || "");
    let h = 2166136261;
    for (let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return String((h>>>0));
  }

  function getHub(){
    try{ return globalThis.__HUB || null; }catch(_){ return null; }
  }

  function getText(el, sel){
    try{
      const n = el.querySelector(sel);
      return n ? String(n.textContent || "").trim() : "";
    }catch(_){ return ""; }
  }

  function parseEasyfattXml(xmlText){
    const text = String(xmlText || "").trim();
    if (!text) return [];

    // Parse numeri: supporta sia formato IT (1.234,56) che formato Easyfatt (1234.56)
    function __numIT(v){
      let s = String(v ?? "").trim();
      if (!s) return null;
      s = s.replace(/\s+/g, "");
      s = s.replace(/[^0-9,\.-]/g, "");
      if (!s) return null;
      if (s.includes(",") && s.includes(".")) {
        // assume "." migliaia e "," decimali
        s = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        // assume "," decimale
        s = s.replace(",", ".");
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }

    function __numFrom(node, tags){
      const list = Array.isArray(tags) ? tags : [];
      for (let i=0; i<list.length; i++){
        const t = String(list[i] || "").trim();
        if (!t) continue;
        const raw = getText(node, t);
        const n = __numIT(raw);
        if (n != null && Number.isFinite(n)) return n;
      }
      return null;
    }

    function __vatPercFromVatCode(rowNode){
      try{
        const el = rowNode ? rowNode.querySelector("VatCode") : null;
        if (!el) return null;
        // Easyfatt: <VatCode Perc="22" ...>22</VatCode>
        let raw = String(el.getAttribute("Perc") || el.getAttribute("perc") || "").trim();
        let n = __numIT(raw);
        if (n != null && Number.isFinite(n)) return n;
        raw = String(el.textContent || "").trim();
        n = __numIT(raw);
        if (n != null && Number.isFinite(n)) return n;
      }catch(_){ }
      return null;
    }

    function __discountMul(raw){
      const s = String(raw || "").trim();
      if (!s) return 1;
      let mul = 1;
      const re = /(-?\d+(?:[\.,]\d+)?)\s*%/g;
      let m;
      while ((m = re.exec(s))){
        const p = __numIT(m[1]);
        if (p == null || !Number.isFinite(p)) continue;
        mul *= (1 - (p/100));
      }
      if (!Number.isFinite(mul)) return 1;
      return mul;
    }

    function __round4(v){
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return Math.round(n * 10000) / 10000;
    }

    const dom = new DOMParser().parseFromString(text, "text/xml");
    const perr = dom.querySelector("parsererror");
    if (perr) throw new Error("XML non valido (parsererror)");

    // Supporta: <EasyfattDocuments><Documents><Document>...
    const docs = Array.from(dom.querySelectorAll("EasyfattDocuments > Documents > Document, Documents > Document"));
    const out = [];

    for (const d of docs){
      const type = getText(d, "DocumentType");
      // D = DDT (Documento di trasporto)
      if (type && String(type).trim().toUpperCase() !== "D") continue;

      const date = getText(d, "Date");     // YYYY-MM-DD
      const number = getText(d, "Number"); // numerico
      const customer = getText(d, "CustomerName") || getText(d, "Customer") || getText(d, "DeliveryName") || "";

      if (!date || !number) continue;
      const key = `${String(number).trim()}__${String(date).trim()}`;

      const rows = Array.from(d.querySelectorAll("Rows > Row")).map((r, idx) => {
        const code = getText(r, "Code");
        const desc = getText(r, "Description");
        const qtyRaw = getText(r, "Qty");
        const umRaw = getText(r, "Um") || getText(r, "UM") || getText(r, "Uom") || getText(r, "Unit") || "";

        const discountsRaw = getText(r, "Discounts") || getText(r, "Discount") || "";
        const discMul = __discountMul(discountsRaw);

        // Importi (best-effort): unitari
        let unitNet = __numFrom(r, [
          "UnitNetPrice","UnitPriceNet","NetUnitPrice",
          "UnitPrice","Price","NetPrice","PriceNet","PriceNoVat"
        ]);
        let unitGross = __numFrom(r, [
          "UnitPriceWithVat","UnitGrossPrice","GrossUnitPrice","PriceWithVat"
        ]);

        // IVA: percentuale (supporto Easyfatt <VatCode Perc="...")
        let vatPerc = __numFrom(r, [
          "VatPerc","VatPercent","VatRate","VatPercentage",
          "IvaPerc","IvaPercent","IvaRate","TaxPercent"
        ]);
        if (vatPerc == null) vatPerc = __vatPercFromVatCode(r);

        // Totali riga (se presenti)
        let net = __numFrom(r, [
          "TotalNet","TotalNoVat","NetAmount","TaxableAmount","Taxable",
          "RowNet","Net","LineNet","AmountNet",
          "TotalWithoutTax","TotalWithoutVat"
        ]);
        let vat = __numFrom(r, [
          "VatAmount","VATAmount","IvaAmount",
          "TaxAmount","TotalVat","VatTotal"
        ]);
        let gross = __numFrom(r, [
          "TotalWithVat","TotalGross","GrossAmount","RowTotalWithVat",
          "Gross","AmountWithVat","TotalAmount"
        ]);

        let qty = null;
        if (qtyRaw){
          const n = __numIT(qtyRaw);
          if (n != null && Number.isFinite(n)) qty = n;
        }

        // Derivazioni (best-effort)
        const qLine = (qty != null && Number.isFinite(Number(qty))) ? Number(qty) : null;

        const netFromXml = (net != null);
        const grossFromXml = (gross != null);

        // Sconti: in Easyfatt spesso hai Price + Discounts (senza Totals)
        if (!netFromXml && unitNet != null && discMul !== 1) unitNet = unitNet * discMul;
        if (!grossFromXml && unitGross != null && discMul !== 1) unitGross = unitGross * discMul;

        if (net == null && unitNet != null && qLine != null) net = unitNet * qLine;
        if (gross == null && unitGross != null && qLine != null) gross = unitGross * qLine;

        if (vat == null && net != null && vatPerc != null) vat = net * (vatPerc / 100);
        if (gross == null && net != null && vat != null) gross = net + vat;

        if (net == null && gross != null && vat != null) net = gross - vat;
        if (vat == null && gross != null && net != null) vat = gross - net;

        if (vatPerc == null && net != null && vat != null && net !== 0) vatPerc = (vat / net) * 100;

        // fallback: gross + vatPerc
        if (net == null && gross != null && vatPerc != null && (1 + (vatPerc/100)) !== 0){
          net = gross / (1 + (vatPerc/100));
          if (vat == null && net != null) vat = gross - net;
        }
        if (gross == null && net != null && vatPerc != null) gross = net * (1 + (vatPerc/100));

        return {
          idx,
          code: String(code || "").trim(),
          desc: String(desc || "").trim(),
          qtyRaw: String(qtyRaw || "").trim(),
          qty: (qty == null) ? null : qty,
          uom: String(umRaw || "").trim(),

          // fatturato (best-effort)
          unitNet: (unitNet == null) ? null : __round4(unitNet),
          unitGross: (unitGross == null) ? null : __round4(unitGross),
          vatPerc: (vatPerc == null) ? null : __round4(vatPerc),
          net: (net == null) ? null : __round4(net),
          vat: (vat == null) ? null : __round4(vat),
          gross: (gross == null) ? null : __round4(gross)
        };
      }).filter(r => {
        if (!r.code) return false; // importa solo righe con codice articolo
        if (r.qty != null && r.qty === 0) return false;
        const m = `${r.code || ""} ${r.desc || ""}`.toLowerCase().replace(/\s+/g, " ").trim();
        if (m.includes("rif. conferma ordine") || m.includes("rif conferma ordine")) return false;
        return true;
      });

      // Totali da righe
      const tot = rows.reduce((acc, r) => {
        const n = (r && r.net != null) ? Number(r.net) : 0;
        const v = (r && r.vat != null) ? Number(r.vat) : 0;
        const g = (r && r.gross != null) ? Number(r.gross) : (n + v);
        acc.net += (Number.isFinite(n) ? n : 0);
        acc.vat += (Number.isFinite(v) ? v : 0);
        acc.gross += (Number.isFinite(g) ? g : 0);
        return acc;
      }, { net: 0, vat: 0, gross: 0 });

      // Totali testata (Easyfatt)
      const headNet = __numFrom(d, [
        "TotalWithoutTax","TotalWithoutVat","TotalNet","TotalNoVat","TotalTaxable","TaxableAmount"
      ]);
      const headVat = __numFrom(d, [
        "VatAmount","TotalVat","VatTotal","TotalVatAmount","VATAmount","IvaAmount"
      ]);
      const headGross = __numFrom(d, [
        "TotalWithVat","TotalAmount","TotalGross","GrossTotal","GrandTotal","Total"
      ]);

      let netTotal = (headNet != null) ? headNet : tot.net;
      let vatTotal = (headVat != null) ? headVat : null;
      let grossTotal = (headGross != null) ? headGross : null;

      if (grossTotal == null){
        if (netTotal != null && vatTotal != null) grossTotal = netTotal + vatTotal;
        else grossTotal = tot.gross;
      }
      if (vatTotal == null){
        if (grossTotal != null && netTotal != null) vatTotal = grossTotal - netTotal;
        else vatTotal = tot.vat;
      }
      if (netTotal == null){
        if (grossTotal != null && vatTotal != null) netTotal = grossTotal - vatTotal;
        else netTotal = tot.net;
      }

      netTotal = __round4(netTotal);
      if (netTotal == null) netTotal = 0;
      vatTotal = __round4(vatTotal);
      if (vatTotal == null) vatTotal = 0;
      grossTotal = __round4(grossTotal);
      if (grossTotal == null) grossTotal = __round4(netTotal + vatTotal) || 0;

      // anti rumore floating
      if (vatTotal < 0 && vatTotal > -0.02) vatTotal = 0;
      if (netTotal < 0 && netTotal > -0.02) netTotal = 0;
      if (grossTotal < 0 && grossTotal > -0.02) grossTotal = 0;

      const hash = hashStr(JSON.stringify(rows.map(x => [
        x.code, x.desc, x.qty, x.uom,
        x.unitNet, x.unitGross, x.vatPerc,
        x.net, x.vat, x.gross
      ])));

      out.push({
        key,
        date: String(date).trim(),
        number: String(number).trim(),
        customer: String(customer || "").trim(),
        rows,
        netTotal: Number(netTotal || 0),
        vatTotal: Number(vatTotal || 0),
        grossTotal: Number(grossTotal || 0),
        currency: "EUR",
        hash
      });
    }

    // latest first
    out.sort((a,b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.number||"").localeCompare(String(a.number||"")));
    return out;
  }

  function normalizeWarehouse(v){
    const s = norm(v);
    if (s.includes("conca")) return "concamarise";
    return "cerea";
  }

  function normalizeDaneaXmlUrl(u){
    u = String(u || "").trim();
    if (!u) return "";
    try{
      // add scheme if user pasted only hostname
      if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u) && /^[\w.-]+\.[\w.-]+(\/.*)?$/.test(u)){
        u = "https://" + u;
      }
      const url = new URL(u);
      const path = String(url.pathname || "/").trim();
      const looksXml = /\.xml$/i.test(path);
      const isRoot = (path === "" || path === "/");
      if (isRoot && !looksXml){
        url.pathname = "/danea/latest.xml";
      }
      return url.toString();
    }catch(_){
      return String(u || "").trim();
    }
  }

  function fmtDateIT(iso){
    try{
      const d = new Date(String(iso || ""));
      if (Number.isNaN(d.getTime())) return String(iso || "—");
      return d.toLocaleDateString("it-IT");
    }catch(_){ return String(iso || "—"); }
  }

  function getFpForRow(row){
    const code = norm(row && row.code);
    if (!code) return null;
    return S.fpByCode.get(code) || null;
  }

  function getFpCategoryForFp(fp){
    if (!fp) return null;
    const k = norm(fp.categoryKey || fp.category || fp.catKey || fp.categoryId || "");
    if (!k) return null;
    return (S.fpCatByKey instanceof Map) ? (S.fpCatByKey.get(k) || null) : null;
  }

  function getFpComponents(fp){
    if (!fp) return [];
    const arr = (fp.components || fp.bom || fp.distintaBase);
    const direct = Array.isArray(arr) ? arr : [];
    if (direct.length > 0) return direct;

    const cat = getFpCategoryForFp(fp);
    const bom = (cat && (cat.bom || cat.components || cat.distintaBase)) || [];
    return Array.isArray(bom) ? bom : [];
  }

  function isRowConfigured(row){
    const fp = getFpForRow(row);
    if (!fp) return { ok: false, why: "missing", fp: null };
    const comps = getFpComponents(fp);
    if (comps.length > 0) return { ok: true, why: "ok", fp };
    return { ok: false, why: "empty", fp };
  }

  function ddtStatus(ddt){
    const rows = Array.isArray(ddt?.rows) ? ddt.rows : [];
    if (!rows.length) return { ok: false, green: 0, total: 0 };
    let green = 0;
    for (const r of rows){
      if (isRowConfigured(r).ok) green++;
    }
    return { ok: green === rows.length, green, total: rows.length };
  }

  function cacheCompletedMap(){
    S.completedMap = new Map();
    for (const c of (S.completed || [])){
      const k = String(c && c.key || c && c._id || "").trim();
      if (k) S.completedMap.set(k, c);
    }
  }

  function setTab(tab){
    S.tab = (tab === "done") ? "done" : "verify";
    try{ setDetailOpen(false); }catch(_){}
    try{ S.selected=null; S.selectedKey=""; }catch(_){}
    try{
      $("daneaTabVerify")?.classList.toggle("active", S.tab === "verify");
      $("daneaTabDone")?.classList.toggle("active", S.tab === "done");
    }catch(_){}
    render();
  }

  function setDetailOpen(open){
    const list = $("daneaListWrap");
    const det = $("daneaDetailWrap");
    if (!list || !det) return;
    list.style.display = open ? "none" : "";
    det.style.display = open ? "" : "none";

    try{ window.__syncDockedControlsVisibility && window.__syncDockedControlsVisibility(); }catch(_){}
  }

  function backToList(){
    try{ setDetailOpen(false); }catch(_){}
    try{ S.selected=null; S.selectedKey=""; }catch(_){}
    try{ render(); }catch(_){}
  }

  function render(){
    const view = $("viewDaneaDdt");
    const isActive = !!(view && view.classList.contains("active"));

    try{ __syncAutoToggleUi(); }catch(_){ }
    try{ __syncAutoModeUi(); }catch(_){ }

    const pillCount = $("pillDaneaCount");
    const pillV = $("pillDaneaVerify");
    const pillD = $("pillDaneaDone");
    const lastMeta = $("daneaLastMeta");
    const meta = $("daneaMeta");
    const tbody = $("daneaTbody");

    const search = norm($("daneaSearch")?.value);

    cacheCompletedMap();

    const baseVerify = (S.cacheReady ? (S.cache || []) : []);
    const verifyList = baseVerify.filter(d => !S.completedMap.has(d.key));
    const doneList = (S.completed || []).slice();

    try{
      pillV && (pillV.textContent = String(verifyList.length));
      pillD && (pillD.textContent = String(doneList.length));
      pillCount && (pillCount.textContent = String(S.tab === "done" ? doneList.length : verifyList.length));
    }catch(_){}

    if (lastMeta){
      if (S.lastFetchedAt) {
        const d = new Date(S.lastFetchedAt);
        lastMeta.textContent = "Ultimo XML: " + (Number.isNaN(d.getTime()) ? S.lastFetchedAt : d.toLocaleString("it-IT"));
      } else {
        lastMeta.textContent = "Ultimo XML: —";
      }
    }

    // se la vista non è aperta, aggiorna solo pill e stop (evita lavoro)
    if (!isActive) return;

    // LIST rendering
    if (!tbody) return;

    if (S.tab === "done"){
      const filtered = doneList.filter(x => {
        const num = norm(x?.number || x?.docNum || x?.num);
        const date = norm(x?.date || x?.docDate || "");
        const cust = norm(x?.customer || x?.customerName || x?.client || "");
        const k = norm(x?.key || x?._id || "");
        if (!search) return true;
        return (num && num.includes(search)) || (date && date.includes(search)) || (cust && cust.includes(search)) || (k && k.includes(search));
      });

      if (meta) meta.textContent = `${filtered.length} DDT completati`;

      tbody.innerHTML = filtered.length ? filtered.map(c => {
        const k = String(c.key || c._id || "");
        const date = String(c.date || "");
        const number = String(c.number || "");
        const cust = String(c.customer || "");
        const rows = Array.isArray(c.rows) ? c.rows : [];
        const n = rows.length;

        return `<tr class=\"jsDaneaRow daneaRowOk\" data-key=\"${escAttr(k)}\" data-mode=\"done\" title="Apri">
          <td data-label="Data">${esc(fmtDateIT(date) || "—")}</td>
          <td data-label="Numero"><span class="kbd">${esc(number || "—")}</span></td>
          <td data-label="Cliente">${esc(cust || "—")}</td>
          <td data-label="Righe" class="qty">${Number(n||0).toLocaleString("it-IT")}</td>
          <td data-label="Stato" class="qty"><span class="dot ok"></span>OK</td>
          <td data-label="" style="text-align:right;">
            <button class="btn btn-ghost btn-xs jsDaneaOpen" data-key="${escAttr(k)}" data-mode="done" type="button">Apri</button>
            <button class="btn btn-danger btn-xs jsDaneaDeleteDone" data-key="${escAttr(k)}" type="button">Elimina</button>
          </td>
        </tr>`;
      }).join("") : `<tr><td class="td-muted" colspan="6">${search ? "Nessun completato trovato." : "Nessun DDT completato."}</td></tr>`;
      return;
    }

    // verify tab
    const filtered = verifyList.filter(d => {
      const num = norm(d.number);
      const date = norm(d.date);
      const cust = norm(d.customer);
      if (!search) return true;
      return (num && num.includes(search)) || (date && date.includes(search)) || (cust && cust.includes(search));
    });

    if (meta) meta.textContent = `${filtered.length} DDT da verificare`;

    tbody.innerHTML = filtered.length ? filtered.map(d => {
      const st = ddtStatus(d);
      const okDot = st.ok ? '<span class="dot ok"></span>' : '<span class="dot bad"></span>';
      const stTxt = `${st.green}/${st.total}`;
      const btnDisabled = st.ok ? "" : "disabled";
      return `<tr class=\"jsDaneaRow ${st.ok ? 'daneaRowOk' : 'daneaRowBad'}\" data-key=\"${escAttr(d.key)}\" data-mode=\"verify\" title="Apri">
        <td data-label="Data">${esc(fmtDateIT(d.date) || "—")}</td>
        <td data-label="Numero"><span class="kbd">${esc(d.number || "—")}</span></td>
        <td data-label="Cliente">${esc(d.customer || "—")}</td>
        <td data-label="Righe" class="qty">${Number((d.rows||[]).length||0).toLocaleString("it-IT")}</td>
        <td data-label="Stato" class="qty">${okDot} ${esc(stTxt)}</td>
        <td data-label="" style="text-align:right;">
          <button class="btn btn-secondary btn-xs jsDaneaOpen" data-key="${escAttr(d.key)}" data-mode="verify" type="button">Apri</button>
          <button class="btn btn-primary btn-xs jsDaneaSendFromList" data-key="${escAttr(d.key)}" type="button" ${btnDisabled}>Completa</button>
        </td>
      </tr>`;
    }).join("") : `<tr><td class="td-muted" colspan="6">${(!S.cacheReady) ? "Caricamento DDT da Firebase…" : (search ? "Nessun DDT trovato." : ((S.lastParsedCount > 0 && S.lastSyncError) ? ("Trovati " + Number(S.lastParsedCount||0).toLocaleString("it-IT") + " DDT nell’XML ma non salvati su Firebase (rules).") : "Nessun DDT su Firebase."))}</td></tr>`;
  }

  function renderDetail(ddt, mode){
    const title = $("daneaDetTitle");
    const sub = $("daneaDetSubtitle");
    const tbody = $("daneaItemsTbody");
    const btnSend = $("btnDaneaSend");
    const foot = $("daneaDetFooter");

    if (!ddt || !tbody) return;

    const isDone = (mode === "done");
    const rows = Array.isArray(ddt.rows) ? ddt.rows : [];

    // title + subtitle
    if (title) title.textContent = isDone ? "DDT (completato)" : "DDT (da verificare)";
    if (sub) sub.textContent = `Numero ${ddt.number || "—"} • ${fmtDateIT(ddt.date || "")} • ${ddt.customer || "—"}`;

    // send button
    if (btnSend){
      btnSend.style.display = isDone ? "none" : "";
      const st = ddtStatus(ddt);
      btnSend.disabled = !st.ok;
      btnSend.textContent = (S.autoDischarge ? "Completa (scarica)" : "Completa (senza scarico)");
    }
    tbody.innerHTML = rows.length ? rows.map(r => {
      const code = String(r.code || "").trim();
      const desc = String(r.desc || "").trim();
      const qtyDisp = (r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty).toLocaleString("it-IT", { maximumFractionDigits: 2 }) : (r.qtyRaw || "—");
      const uom = String(r.uom || "").trim() || "—";

      const st = isRowConfigured(r);
      const dot = st.ok ? '<span class="dot ok"></span>' : '<span class="dot bad"></span>';

      const fidRow = String(st.fp?.id || st.fp?._id || "").trim();
      const rowWhy = String(st.why || "");
      const rowCls = st.ok ? '' : ' daneaRowBad';
      const rowStyle = ' style="cursor:pointer;"';
      const rowTitle = st.ok ? "Apri distinta base" : "Configura distinta base";

      let act = "";
      if (st.why === "missing"){
        act = `<button class="btn btn-secondary btn-xs jsDaneaImportFp" data-code="${escAttr(code)}" data-desc="${escAttr(desc)}" type="button">Importa</button>`;
      } else if (st.why === "empty"){
        const fid = String(st.fp?.id || st.fp?._id || "").trim();
        act = `<button class="btn btn-secondary btn-xs jsDaneaConfigFp" data-fpid="${escAttr(fid)}" type="button">Configura</button>`;
      } else {
        const fid = String(st.fp?.id || st.fp?._id || "").trim();
        act = fid ? `<button class="btn btn-ghost btn-xs jsDaneaOpenFp" data-fpid="${escAttr(fid)}" type="button">Apri</button>` : `<span class="td-muted">OK</span>`;
      }

      return `<tr class="jsDaneaItemRow${rowCls}" data-code="${escAttr(code)}" data-desc="${escAttr(desc)}" data-fpid="${escAttr(fidRow)}" data-why="${escAttr(rowWhy)}" title="${escAttr(rowTitle)}"${rowStyle}>
        <td data-label="">${dot}</td>
        <td data-label="Codice"><span class="kbd">${esc(code || "—")}</span></td>
        <td data-label="Articolo">${esc(desc || "—")}</td>
        <td data-label="Q.tà" class="qty">${esc(qtyDisp)}</td>
        <td data-label="U.M.">${esc(uom)}</td>
        <td data-label="Azioni" style="text-align:right;">${act}</td>
      </tr>`;
    }).join("") : `<tr><td class="td-muted" colspan="6">Nessuna riga nel DDT.</td></tr>`;

    if (foot){
      const st = ddtStatus(ddt);
      const autoOn = !!S.autoDischarge;
      const msg = isDone ? "Questo DDT è già stato scaricato: eliminandolo (in tab Completati) si resetta lo scarico." :
        (st.ok ? (autoOn ? "Tutte le righe sono configurate: puoi completare e scaricare componenti." : "Tutte le righe sono configurate: puoi completare (scarico automatico DISATTIVATO).") : "Configura le righe rosse (distinta base) per poter completare.");
      foot.textContent = msg;
    }
  }

  function openDetailByKey(key, mode){
    const k = String(key || "").trim();
    if (!k) return;

    if (mode === "done"){
      const c = (S.completed || []).find(x => String(x?.key || x?._id || "") === k) || null;
      if (!c) return;
      S.selectedKey = k;
      S.selected = {
        key: k,
        number: String(c.number || ""),
        date: String(c.date || ""),
        customer: String(c.customer || ""),
        rows: Array.isArray(c.rows) ? c.rows : [],
        warehouse: c.warehouse || "",
        movementIds: Array.isArray(c.movementIds) ? c.movementIds : []
      };
      setDetailOpen(true);
      renderDetail(S.selected, "done");
      return;
    }

    const d = (S.cache || []).find(x => String(x?.key || "") === k) || null;
    if (!d) return;
    S.selectedKey = k;
    S.selected = d;
    setDetailOpen(true);
    renderDetail(S.selected, "verify");
  }

  async function maybeAutoImportFinishedProducts(ddts){
    const H = S.hub;
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (!H.fb.user) return;

    // best-effort: crea placeholder per codici nuovi (una sola volta per fetch)
    try{
      const { addDoc, collection, serverTimestamp } = H.FS;
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "finishedProducts");

      const toCreate = [];
      for (const d of (ddts || [])){
        for (const r of (d.rows || [])){
          const code = String(r.code || "").trim();
          if (!code) continue;
          const low = code.toLowerCase();
          if (S.fpByCode.has(low)) continue;
          toCreate.push({ code, name: String(r.desc || code).trim(), uom: String(r.uom || "").trim() });
        }
      }

      // de-dup in-memory
      const seen = new Set();
      const uniq = [];
      for (const x of toCreate){
        const k = String(x.code || "").toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        uniq.push(x);
      }

      for (const x of uniq){
        // ricontrollo (in caso di race con snapshot)
        if (S.fpByCode.has(String(x.code||"").toLowerCase())) continue;
        const payload = {
          name: x.name,
          nameLower: x.name.toLowerCase(),
          updatedAt: serverTimestamp(),
          updatedBy: H.fb.user.email || H.fb.user.uid || "",
          createdAt: serverTimestamp(),
          createdBy: H.fb.user.email || H.fb.user.uid || ""
        };
        if (x.code){
          payload.code = x.code;
          payload.codeLower = String(x.code).toLowerCase();
        }
        if (x.uom) payload.uom = x.uom;
        // components vuoti (non configurato)
        payload.components = [];
        await addDoc(col, payload);
      }
    }catch(e){
      // silenzioso: se regole non permettono, non bloccare la lettura XML
      try{ console.warn("auto-import finishedProducts skipped", e); }catch(_){}
    }
  }

  function parseFraction(v){
    const s = String(v || "").trim();
    if (!s) return null;
    // 1/20
    const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (m){
      const a = Number(m[1].replace(",", "."));
      const b = Number(m[2].replace(",", "."));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    }
    // number with comma
    const n = Number(s.replace(/\./g,"").replace(",", "."));
    if (Number.isFinite(n)) return n;
    return null;
  }

  function compQtyPerUnit(comp){
    const c = comp || {};
    if (c.qty != null && Number.isFinite(Number(c.qty))) return Number(c.qty);
    const raw = c.qtyRaw || c.qtaRaw || "";
    const p = parseFraction(raw);
    if (p != null && Number.isFinite(p)) return p;
    return null;
  }

    async function sendSelectedFromDetail(){
    if (S.busy) return;
    const ddt = S.selected;
    if (!ddt || !ddt.key) return;

    const H = S.hub;
    if (!H || !H.fb || !H.fb.db || !H.FS) { alert("Hub non pronto"); return; }
    if (!H.fb.user) { try{ window.HubInv?.showToast?.("Accedi con Google per inviare", "warn"); }catch(_){ alert("Accedi con Google"); } return; }

    cacheCompletedMap();
    if (S.completedMap.has(ddt.key)) { alert("Questo DDT risulta già completato."); return; }

    const st = ddtStatus(ddt);
    if (!st.ok) { alert("Non tutte le righe sono configurate (cerchi rossi)."); return; }

    const autoOn = !!S.autoDischarge;

    const ok = confirm(autoOn ? `Completare e scaricare componenti?

DDT ${ddt.number} del ${fmtDateIT(ddt.date)}
Righe: ${st.total}` : `Completare SENZA scarico automatico?

• Il DDT finirà in "Completati"
• NON verranno creati movimenti di inventario

DDT ${ddt.number} del ${fmtDateIT(ddt.date)}
Righe: ${st.total}`);
    if (!ok) return;

    S.busy = true;
    try{
      const { addDoc, setDoc, doc, collection, serverTimestamp } = H.FS;

      // Se lo scarico automatico è disattivato: segna solo come completato (senza movimenti)
      if (!autoOn){
        const doneId = encodeURIComponent(String(ddt.key || '').trim());
        const doneRef = doc(H.fb.db, 'orgs', H.ORG_ID, 'daneaDdtCompleted', doneId);
        await setDoc(doneRef, {
          key: String(ddt.key || '').trim(),
          number: String(ddt.number || '').trim(),
          date: String(ddt.date || '').trim(),
          customer: String(ddt.customer || '').trim(),
          rows: (ddt.rows || []).map(x => ({
            idx: (x && x.idx != null) ? x.idx : null,
            code: x.code || '',
            desc: x.desc || '',
            qty: x.qty ?? null,
            qtyRaw: x.qtyRaw || '',
            uom: x.uom || '',

            // fatturato (best-effort)
            unitNet: (x && x.unitNet != null) ? x.unitNet : null,
            unitGross: (x && x.unitGross != null) ? x.unitGross : null,
            vatPerc: (x && x.vatPerc != null) ? x.vatPerc : null,
            net: (x && x.net != null) ? x.net : null,
            vat: (x && x.vat != null) ? x.vat : null,
            gross: (x && x.gross != null) ? x.gross : null
          })),
          netTotal: (ddt && ddt.netTotal != null) ? ddt.netTotal : null,
          vatTotal: (ddt && ddt.vatTotal != null) ? ddt.vatTotal : null,
          grossTotal: (ddt && ddt.grossTotal != null) ? ddt.grossTotal : null,
          currency: String(ddt.currency || 'EUR'),
          warehouse: 'none',
          allocations: [],
          xmlHash: String(ddt.hash || ''),
          movementIds: [],
          autoDischarge: false,
          createdAt: serverTimestamp(),
          createdBy: H.fb.user.email || H.fb.user.uid
        }, { merge: true });

        try{ window.HubInv?.showToast?.('DDT completato (senza scarico)'); }catch(_){ }
        setDetailOpen(false);
        setTab('done');
        await fetchNow(true);
        return;
      }

      // 1) calcola fabbisogni componenti (somma per codice)
      const req = new Map(); // codeLower -> {code,name,uom,qtyFloat}
      for (const r of (ddt.rows || [])){
        const qtyLine = (r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : parseFraction(r.qtyRaw);
        const qLine = (qtyLine != null && Number.isFinite(qtyLine)) ? qtyLine : 0;
        if (qLine <= 0) continue;

        const fp = getFpForRow(r);
        const comps = getFpComponents(fp);
        for (const c of comps){
          const cCode = String(c.code || "").trim();
          if (!cCode) continue;

          const per = compQtyPerUnit(c);
          if (per == null || !Number.isFinite(per) || per <= 0) continue;

          const add = per * qLine;
          const low = cCode.toLowerCase();
          const cur = req.get(low) || { code: cCode, name: String(c.name || c.articolo || cCode).trim(), uom: String(c.uom || "").trim(), qty: 0 };
          cur.qty += add;
          if (!cur.name) cur.name = cCode;
          if (!cur.uom) cur.uom = String(c.uom || "").trim();
          req.set(low, cur);
        }
      }

      if (!req.size){
        alert("Nessun componente calcolabile (distinta base vuota o quantità non valide).");
        return;
      }

      // 2) inventario globale: calcola disponibilità per sede (ignorando fornitore)
      let movs = (H.state && Array.isArray(H.state.movements)) ? H.state.movements : [];

      // Se l'app ha appena aperto, può capitare che lo snapshot dei movimenti non sia
      // ancora arrivato: in quel caso facciamo un fetch one-shot e poi riproviamo.
      if (!movs.length){
        try{
          const FS = H.FS || {};
          if (H.fb && H.fb.db && typeof FS.getDocs === "function" && typeof FS.collection === "function" && typeof FS.query === "function" && typeof FS.orderBy === "function"){
            try{ H.showToast?.("Carico inventario…", "warn"); }catch(_){ }
            const col = FS.collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");
            const q = FS.query(col, FS.orderBy("createdAt"));
            const snap = await FS.getDocs(q);
            movs = snap.docs.map(d => {
              const data = d.data() || {};
              return {
                id: d.id,
                type: data.type || "IN",
                code: data.code || "",
                qty: data.qty,
                warehouse: data.warehouse || ""
              };
            });
            if (H.state) H.state.movements = movs;
          }
        }catch(e){
          try{ console.warn("fetch inventoryMovements failed", e); }catch(_){ }
        }
      }

      if (!movs.length){
        if (!silent){
          alert("Inventario non pronto: movimenti non caricati.");
        } else {
          try{ window.HubInv?.showToast?.("Auto-scarico: inventario non pronto", "warn"); }catch(_){ }
        }
        return;
      }

      const _normWh = (w) => {
        try{
          if (H && typeof H.normalizeWarehouse === "function") return H.normalizeWarehouse(w);
        }catch(_){}
        // fallback minimale (nel caso il bridge non esponga normalizeWarehouse)
        const s = String(w || "").trim().toLowerCase();
        if (s.includes("conca") || s.includes("concamarise")) return "concamarise";
        return "cerea";
      };
      const _safeInt = (v) => {
        try{
          if (H && typeof H.safeInt === "function") return H.safeInt(v);
        }catch(_){}
        const n = parseInt(String(v||"").replace(/[^0-9\-]/g,""), 10);
        return Number.isFinite(n) ? n : 0;
      };

      const avail = { cerea: new Map(), concamarise: new Map() }; // codeLower -> qtyInt
      for (const mv of movs){
        const code = String(mv && mv.code || "").trim();
        if (!code) continue;
        const low = code.toLowerCase();
        const w = _normWh(mv.warehouse || mv.site || mv.magazzino || mv.location || "");
        const q = _safeInt(mv.qty);
        if (!q) continue;
        const delta = (String(mv.type || "").toUpperCase() === "OUT") ? -q : q;
        const m = (w === "concamarise") ? avail.concamarise : avail.cerea;
        m.set(low, (m.get(low) || 0) + delta);
      }

      // 3) validazione scorte (globale) prima di scrivere
      const needList = Array.from(req.values()).map(it => {
        const qtyInt = Math.round(Number(it.qty) || 0);
        return Object.assign({}, it, { qtyInt });
      }).filter(x => x.qtyInt);

      for (const it of needList){
        const low = String(it.code || "").trim().toLowerCase();
        const aC = Math.max(0, _safeInt(avail.cerea.get(low)));
        const aK = Math.max(0, _safeInt(avail.concamarise.get(low)));
        const tot = aC + aK;
        if (tot < it.qtyInt){
          alert(`Scorta insufficiente per ${it.code} — ${it.name || ""}

Richiesti: ${it.qtyInt.toLocaleString("it-IT")} ${String(it.uom||"").trim()}
Disponibili: ${(tot).toLocaleString("it-IT")} (Cerea ${aC.toLocaleString("it-IT")}, Concamarise ${aK.toLocaleString("it-IT")})`);
          return;
        }
      }

      // 4) crea movimenti OUT (split automatico tra sedi, senza scelta manuale)
      const movementIds = [];
      const allocations = [];
      const movCol = collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");

      const noteBase = `Scarico componenti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;
      for (const it of needList){
        const low = String(it.code || "").trim().toLowerCase();
        let need = it.qtyInt;

        let aC = Math.max(0, _safeInt(avail.cerea.get(low)));
        let aK = Math.max(0, _safeInt(avail.concamarise.get(low)));

        // scegli sede primaria = quella con più disponibilità (riduce split)
        const first = (aK > aC) ? "concamarise" : "cerea";
        const second = (first === "cerea") ? "concamarise" : "cerea";

        const takeFrom = (wh) => {
          if (need <= 0) return 0;
          const cur = (wh === "concamarise") ? aK : aC;
          const take = Math.min(need, cur);
          if (take <= 0) return 0;
          need -= take;
          if (wh === "concamarise") aK -= take;
          else aC -= take;
          return take;
        };

        const t1 = takeFrom(first);
        const t2 = takeFrom(second);

        // aggiorna disponibilità residue
        avail.cerea.set(low, aC);
        avail.concamarise.set(low, aK);

        allocations.push({ code: it.code, name: it.name || it.code, uom: String(it.uom||"").trim(), qty: it.qtyInt, byWarehouse: { cerea: (first==="cerea"?t1:t2) || 0, concamarise: (first==="concamarise"?t1:t2) || 0 } });

        const makePayload = (warehouse, qtyInt) => ({
          type: "OUT",
          customer: "Scarico DDT",
          code: it.code,
          item: it.name || it.code,
          uom: String(it.uom || "").trim(),
          qtyRaw: `${it.qty} ${String(it.uom||"").trim()}`.trim(),
          qty: qtyInt,
          date: String(ddt.date || "").trim(),
          note: noteBase,
          source: "DaneaXML",
          rawText: "",
          warehouse: warehouse,

          docType: "DDT",
          docNum: String(ddt.number || "").trim(),
          docDateRaw: String(ddt.date || "").trim(),
          daneaDdtKey: String(ddt.key || "").trim(),

          createdAt: serverTimestamp(),
          createdBy: H.fb.user.email || H.fb.user.uid
        });

        if (t1 > 0){
          const ref = await addDoc(movCol, makePayload(first, t1));
          if (ref && ref.id) movementIds.push(ref.id);
        }
        if (t2 > 0){
          const ref = await addDoc(movCol, makePayload(second, t2));
          if (ref && ref.id) movementIds.push(ref.id);
        }
      }

      // 5) salva completato (id deterministico)
      const doneId = encodeURIComponent(String(ddt.key || "").trim());
      const doneRef = doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted", doneId);
      await setDoc(doneRef, {
        key: String(ddt.key || "").trim(),
        number: String(ddt.number || "").trim(),
        date: String(ddt.date || "").trim(),
        customer: String(ddt.customer || "").trim(),
        rows: (ddt.rows || []).map(x => ({
          idx: (x && x.idx != null) ? x.idx : null,
          code: x.code || "",
          desc: x.desc || "",
          qty: x.qty ?? null,
          qtyRaw: x.qtyRaw || "",
          uom: x.uom || "",

          // fatturato (best-effort)
          unitNet: (x && x.unitNet != null) ? x.unitNet : null,
          unitGross: (x && x.unitGross != null) ? x.unitGross : null,
          vatPerc: (x && x.vatPerc != null) ? x.vatPerc : null,
          net: (x && x.net != null) ? x.net : null,
          vat: (x && x.vat != null) ? x.vat : null,
          gross: (x && x.gross != null) ? x.gross : null
        })),
        netTotal: (ddt && ddt.netTotal != null) ? ddt.netTotal : null,
        vatTotal: (ddt && ddt.vatTotal != null) ? ddt.vatTotal : null,
        grossTotal: (ddt && ddt.grossTotal != null) ? ddt.grossTotal : null,
        currency: String(ddt.currency || "EUR"),
        warehouse: "global",
        allocations: allocations,
        xmlHash: String(ddt.hash || ""),
        movementIds: movementIds,
        autoDischarge: true,
        createdAt: serverTimestamp(),
        createdBy: H.fb.user.email || H.fb.user.uid
      }, { merge: true });

      try{ window.HubInv?.showToast?.("DDT completato e scaricato"); }catch(_){}
      // refresh lists
      setDetailOpen(false);
      setTab("done");
      await fetchNow(true);
    }catch(e){
      console.error(e);
      try{ window.HubInv?.showToast?.("Errore completamento DDT", "err"); }catch(_){}
      alert("Errore completamento DDT");
    }finally{
      S.busy = false;
    }
  }



  // ===== BULK: scarica automaticamente TUTTI i DDT verdi (OK) =====
  async function dischargeAllGreenDdts(opts){
    opts = (opts && typeof opts === "object") ? opts : {};
    const silent = !!opts.silent;
    const fromAuto = !!opts.fromAuto;

    if (S.busy) return;

    const H = S.hub;
    if (!H || !H.fb || !H.fb.db || !H.FS) {
      if (!silent) alert("Hub non pronto");
      return;
    }

    // "a prescindere da accesso utente": procediamo anche senza login.
    const actor = (H.fb.user && (H.fb.user.email || H.fb.user.uid)) || "auto";
    if (!H.fb.user && !silent){
      try{ window.HubInv?.showToast?.("Auto-scarico: nessun utente loggato (procedo se le regole lo consentono)", "warn"); }catch(_){ }
    }

    cacheCompletedMap();

    if (!S.cacheReady){
      if (!silent){ try{ window.HubInv?.showToast?.("Caricamento DDT da Firebase… riprova tra un attimo", "warn"); }catch(_){ } }
      return;
    }

    const baseVerify = (S.cache || []);
    const verifyList = baseVerify.filter(d => d && d.key && !S.completedMap.has(d.key));
    const green = verifyList.filter(d => {
      try{ return !!ddtStatus(d).ok; }catch(_){ return false; }
    });

    if (!green.length){
      if (!silent){ try{ window.HubInv?.showToast?.("Nessun DDT verde da scaricare", "warn"); }catch(_){ } }
      return;
    }

    // Ordine "tradizionale": prima i più vecchi
    green.sort((a,b) => String(a?.date||"").localeCompare(String(b?.date||"")) || String(a?.number||"").localeCompare(String(b?.number||"")));

    if (!silent){
      const ok = confirm(`Scaricare automaticamente ${green.length} DDT verdi?

• Verranno creati movimenti di scarico (materie prime + imballaggi)
• I DDT passeranno in "Completati"`);
      if (!ok) return;
    }

    const swEl = $("daneaAutoSwitch");
    const modeWord = S.autoMode ? "AUTO" : "MANUALE";
    const setProg = (n) => { try{ __syncAutoModeUi(`${modeWord} ${n}/${green.length}`); }catch(_){ } };

    S.busy = true;
    try{
      try{ __autoModeSetRunning(true); }catch(_){ }
      try{ if (swEl) swEl.disabled = true; }catch(_){ }
      setProg(0);

      const { addDoc, setDoc, doc, collection, serverTimestamp, getDocs, query, orderBy } = H.FS;

      // 1) Carica inventario (movimenti) una sola volta
      let movs = (H.state && Array.isArray(H.state.movements)) ? H.state.movements : [];

      if (!movs.length){
        try{
          if (H.fb && H.fb.db && typeof getDocs === "function" && typeof collection === "function" && typeof query === "function" && typeof orderBy === "function"){
            try{ H.showToast?.("Carico inventario…", "warn"); }catch(_){ }
            const col = collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");
            const q = query(col, orderBy("createdAt"));
            const snap = await getDocs(q);
            movs = snap.docs.map(d => {
              const data = d.data() || {};
              return {
                id: d.id,
                type: data.type || "IN",
                code: data.code || "",
                qty: data.qty,
                warehouse: data.warehouse || ""
              };
            });
            if (H.state) H.state.movements = movs;
          }
        }catch(e){
          try{ console.warn("fetch inventoryMovements failed", e); }catch(_){ }
        }
      }

      if (!movs.length){
        if (!silent){
          alert("Inventario non pronto: movimenti non caricati.");
        } else {
          try{ window.HubInv?.showToast?.("Auto-scarico: inventario non pronto", "warn"); }catch(_){ }
        }
        return;
      }

      const _normWh = (w) => {
        try{ if (H && typeof H.normalizeWarehouse === "function") return H.normalizeWarehouse(w); }catch(_){ }
        const s = String(w || "").trim().toLowerCase();
        if (s.includes("conca") || s.includes("concamarise")) return "concamarise";
        return "cerea";
      };
      const _safeInt = (v) => {
        try{ if (H && typeof H.safeInt === "function") return H.safeInt(v); }catch(_){ }
        const n = parseInt(String(v||"").replace(/[^0-9\-]/g,""), 10);
        return Number.isFinite(n) ? n : 0;
      };

      // Disponibilità aggiornata "live" durante il bulk (così non scarichi più del disponibile)
      const avail = { cerea: new Map(), concamarise: new Map() };
      for (const mv of movs){
        const code = String(mv && mv.code || "").trim();
        if (!code) continue;
        const low = code.toLowerCase();
        const w = _normWh(mv.warehouse || mv.site || mv.magazzino || mv.location || "");
        const q = _safeInt(mv.qty);
        if (!q) continue;
        const delta = (String(mv.type || "").toUpperCase() === "OUT") ? -q : q;
        const m = (w === "concamarise") ? avail.concamarise : avail.cerea;
        m.set(low, (m.get(low) || 0) + delta);
      }

      const movCol = collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");

      let doneCount = 0;
      for (let i=0; i<green.length; i++){
        const ddt = green[i];
        if (!ddt || !ddt.key) continue;

        // se nel frattempo è diventato completato, salta
        if (S.completedMap.has(ddt.key)) continue;

        try{ setProg(doneCount); }catch(_){ }

        // 2) calcola fabbisogni componenti (somma per codice)
        const req = new Map();
        for (const r of (ddt.rows || [])){
          const qtyLine = (r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : parseFraction(r.qtyRaw);
          const qLine = (qtyLine != null && Number.isFinite(qtyLine)) ? qtyLine : 0;
          if (qLine <= 0) continue;

          const fp = getFpForRow(r);
          const comps = getFpComponents(fp);
          for (const c of comps){
            const cCode = String(c.code || "").trim();
            if (!cCode) continue;

            const per = compQtyPerUnit(c);
            if (per == null || !Number.isFinite(per) || per <= 0) continue;

            const add = per * qLine;
            const low = cCode.toLowerCase();
            const cur = req.get(low) || { code: cCode, name: String(c.name || c.articolo || cCode).trim(), uom: String(c.uom || "").trim(), qty: 0 };
            cur.qty += add;
            if (!cur.name) cur.name = cCode;
            if (!cur.uom) cur.uom = String(c.uom || "").trim();
            req.set(low, cur);
          }
        }

        if (!req.size){
          // DDT verde ma senza componenti: lo segnaliamo e lo saltiamo
          try{ window.HubInv?.showToast?.(`DDT ${ddt.number || "?"}: nessun componente calcolabile`, "warn"); }catch(_){ }
          continue;
        }

        // 3) validazione scorte (globale) prima di scrivere
        const needList = Array.from(req.values()).map(it => {
          const qtyInt = Math.round(Number(it.qty) || 0);
          return Object.assign({}, it, { qtyInt });
        }).filter(x => x.qtyInt);

        for (const it of needList){
          const low = String(it.code || "").trim().toLowerCase();
          const aC = Math.max(0, _safeInt(avail.cerea.get(low)));
          const aK = Math.max(0, _safeInt(avail.concamarise.get(low)));
          const tot = aC + aK;
          if (tot < it.qtyInt){
            if (!silent){
              alert(`Scarico interrotto\n\nScorta insufficiente per ${it.code} — ${it.name || ""}\n\nDDT ${ddt.number || "—"} del ${fmtDateIT(ddt.date)}\nRichiesti: ${it.qtyInt.toLocaleString("it-IT")} ${String(it.uom||"").trim()}\nDisponibili: ${(tot).toLocaleString("it-IT")} (Cerea ${aC.toLocaleString("it-IT")}, Concamarise ${aK.toLocaleString("it-IT")})`);
            } else {
              try{ window.HubInv?.showToast?.(`Auto-scarico: scorta insufficiente per ${it.code}`, "warn"); }catch(_){ }
            }
            return;
          }
        }

        // 4) crea movimenti OUT (split automatico tra sedi) + aggiorna avail in RAM
        const movementIds = [];
        const allocations = [];

        const noteBase = `Scarico componenti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;

        for (const it of needList){
          const low = String(it.code || "").trim().toLowerCase();
          let need = it.qtyInt;

          let aC = Math.max(0, _safeInt(avail.cerea.get(low)));
          let aK = Math.max(0, _safeInt(avail.concamarise.get(low)));

          const first = (aK > aC) ? "concamarise" : "cerea";
          const second = (first === "cerea") ? "concamarise" : "cerea";

          const takeFrom = (wh) => {
            if (need <= 0) return 0;
            const cur = (wh === "concamarise") ? aK : aC;
            const take = Math.min(need, cur);
            if (take <= 0) return 0;
            need -= take;
            if (wh === "concamarise") aK -= take;
            else aC -= take;
            return take;
          };

          const t1 = takeFrom(first);
          const t2 = takeFrom(second);

          // aggiorna disponibilità residue in RAM
          avail.cerea.set(low, aC);
          avail.concamarise.set(low, aK);

          allocations.push({ code: it.code, name: it.name || it.code, uom: String(it.uom||"").trim(), qty: it.qtyInt, byWarehouse: { cerea: (first==="cerea"?t1:t2) || 0, concamarise: (first==="concamarise"?t1:t2) || 0 } });

          const makePayload = (warehouse, qtyInt) => ({
            type: "OUT",
            customer: "Scarico DDT",
            code: it.code,
            item: it.name || it.code,
            uom: String(it.uom || "").trim(),
            qtyRaw: `${it.qty} ${String(it.uom||"").trim()}`.trim(),
            qty: qtyInt,
            date: String(ddt.date || "").trim(),
            note: noteBase,
            source: "DaneaXML",
            rawText: "",
            warehouse: warehouse,

            docType: "DDT",
            docNum: String(ddt.number || "").trim(),
            docDateRaw: String(ddt.date || "").trim(),
            daneaDdtKey: String(ddt.key || "").trim(),

            createdAt: serverTimestamp(),
            createdBy: actor
          });

          if (t1 > 0){
            const ref = await addDoc(movCol, makePayload(first, t1));
            if (ref && ref.id) movementIds.push(ref.id);
          }
          if (t2 > 0){
            const ref = await addDoc(movCol, makePayload(second, t2));
            if (ref && ref.id) movementIds.push(ref.id);
          }
        }

        // 5) salva completato (id deterministico)
        const doneId = encodeURIComponent(String(ddt.key || "").trim());
        const doneRef = doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted", doneId);
        await setDoc(doneRef, {
          key: String(ddt.key || "").trim(),
          number: String(ddt.number || "").trim(),
          date: String(ddt.date || "").trim(),
          customer: String(ddt.customer || "").trim(),
          rows: (ddt.rows || []).map(x => ({
            idx: (x && x.idx != null) ? x.idx : null,
            code: x.code || "",
            desc: x.desc || "",
            qty: x.qty ?? null,
            qtyRaw: x.qtyRaw || "",
            uom: x.uom || "",

            // fatturato (best-effort)
            unitNet: (x && x.unitNet != null) ? x.unitNet : null,
            unitGross: (x && x.unitGross != null) ? x.unitGross : null,
            vatPerc: (x && x.vatPerc != null) ? x.vatPerc : null,
            net: (x && x.net != null) ? x.net : null,
            vat: (x && x.vat != null) ? x.vat : null,
            gross: (x && x.gross != null) ? x.gross : null
          })),
          netTotal: (ddt && ddt.netTotal != null) ? ddt.netTotal : null,
          vatTotal: (ddt && ddt.vatTotal != null) ? ddt.vatTotal : null,
          grossTotal: (ddt && ddt.grossTotal != null) ? ddt.grossTotal : null,
          currency: String(ddt.currency || "EUR"),
          warehouse: "global",
          allocations: allocations,
          xmlHash: String(ddt.hash || ""),
          movementIds: movementIds,
          autoDischarge: true,
          createdAt: serverTimestamp(),
          createdBy: actor
        }, { merge: true });

        // aggiorna cache locale (evita doppi se la snapshot è lenta)
        try{ S.completedMap.set(String(ddt.key||"").trim(), { key: String(ddt.key||"").trim() }); }catch(_){ }

        doneCount++;
        try{ setProg(doneCount); }catch(_){ }

      }

      try{ window.HubInv?.showToast?.(`Scarico completato: ${doneCount} DDT`, "ok"); }catch(_){ }

      // refresh xml (best effort)
      try{ await fetchNow(true); }catch(_){ }

    }catch(e){
      console.error(e);
      try{ window.HubInv?.showToast?.("Errore scarico automatico", "err"); }catch(_){ }
      if (!silent) alert("Errore scarico automatico");
    }finally{
      try{ if (swEl) swEl.disabled = false; }catch(_){ }
      try{ __autoModeSetRunning(false); }catch(_){ }
      try{ __syncAutoModeUi(); }catch(_){ }
      S.busy = false;
    }
  }
  async function deleteCompletedByKey(key){
    const k = String(key || "").trim();
    if (!k) return;

    const H = S.hub;
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (!H.fb.user) { alert("Accedi con Google"); return; }

    const c = S.completedMap.get(k) || null;
    if (!c) return;

    const ok = confirm(`Eliminare questo DDT completato e resettare lo scarico?\n\nDDT ${c.number || "—"} del ${fmtDateIT(c.date || "")}`);
    if (!ok) return;

    S.busy = true;
    try{
      const { deleteDoc, doc } = H.FS;
      const ids = Array.isArray(c.movementIds) ? c.movementIds : [];
      for (const id of ids){
        const mid = String(id || "").trim();
        if (!mid) continue;
        try{
          await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements", mid));
        }catch(e){ console.warn("delete movement failed", mid, e); }
      }

      const doneId = encodeURIComponent(String(k));
      await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted", doneId));

      try{ window.HubInv?.showToast?.("DDT eliminato: scarico resettato"); }catch(_){}
    }catch(e){
      console.error(e);
      alert("Errore eliminazione");
    }finally{
      S.busy = false;
    }
  }

  function bindEvents(){
    $("btnDaneaClear")?.addEventListener("click", () => { const i=$("daneaSearch"); if (i) i.value=""; render(); });
    $("daneaSearch")?.addEventListener("input", () => render());

    $("daneaTabVerify")?.addEventListener("click", () => setTab("verify"));
    $("daneaTabDone")?.addEventListener("click", () => setTab("done"));
    $("btnDaneaSend")?.addEventListener("click", () => sendSelectedFromDetail());

    // Scarico DDT automatico (switch)
    try{ __bindAutoModeSwitch(); }catch(_){ }

    // list click
    $("daneaTbody")?.addEventListener("click", (e) => {
          const btnOpen = e.target?.closest?.("button.jsDaneaOpen");
          const btnSend = e.target?.closest?.("button.jsDaneaSendFromList");
          const btnDelDone = e.target?.closest?.("button.jsDaneaDeleteDone");
          const tr = e.target?.closest?.("tr.jsDaneaRow");

          if (btnDelDone){
            e.preventDefault(); e.stopPropagation();
            const k = btnDelDone.getAttribute("data-key") || "";
            deleteCompletedByKey(k);
            return;
          }
          if (btnSend){
            e.preventDefault(); e.stopPropagation();
            const k = btnSend.getAttribute("data-key") || "";
            openDetailByKey(k, "verify");
            // auto invia solo se ok
            setTimeout(() => { try{ sendSelectedFromDetail(); }catch(_){ } }, 0);
            return;
          }
          if (btnOpen){
            e.preventDefault(); e.stopPropagation();
            const k = btnOpen.getAttribute("data-key") || "";
            const mode = btnOpen.getAttribute("data-mode") || (tr?.getAttribute("data-mode") || "verify");
            openDetailByKey(k, mode);
            return;
          }
          if (tr){
            const k = tr.getAttribute("data-key") || "";
            const mode = tr.getAttribute("data-mode") || "verify";
            openDetailByKey(k, mode);
          }
        });

    // detail row actions
    if (!S._boundDetailClicks){
      S._boundDetailClicks = true;

      // delegated: funziona anche se la vista viene re-renderizzata
      document.addEventListener("click", async (e) => {
        const root = e.target?.closest?.("#viewDaneaDdt");
        if (!root) return;

        const btnImport = e.target?.closest?.("button.jsDaneaImportFp");
        const btnConfig = e.target?.closest?.("button.jsDaneaConfigFp");
        const btnOpenFp = e.target?.closest?.("button.jsDaneaOpenFp");

        const prefillNewFinishedProduct = (code, desc) => {
          try{
            if (!window.openFinishedProductModal) return;
            window.openFinishedProductModal(null);
            setTimeout(() => {
              try{
                const nameEl = document.getElementById("fpName");
                const codeEl = document.getElementById("fpCode");
                if (nameEl && !String(nameEl.value || "").trim()) nameEl.value = String(desc || "").trim();
                if (codeEl && !String(codeEl.value || "").trim()) codeEl.value = String(code || "").trim();
              }catch(_){}
            }, 0);
          }catch(_){}
        };

        if (btnOpenFp){
          e.preventDefault(); e.stopPropagation();
          const id = String(btnOpenFp.getAttribute("data-fpid") || "").trim();
          if (id) { try{ window.openFinishedProductModal && window.openFinishedProductModal(id); }catch(_){ } }
          return;
        }

        if (btnConfig){
          e.preventDefault(); e.stopPropagation();
          const id = String(btnConfig.getAttribute("data-fpid") || "").trim();
          if (id) { try{ window.openFinishedProductModal && window.openFinishedProductModal(id); }catch(_){ } }
          return;
        }

        if (btnImport){
          e.preventDefault(); e.stopPropagation();

          const tr = btnImport.closest("tr.jsDaneaItemRow");
          const fid = String(tr?.getAttribute("data-fpid") || "").trim();
          const code = String(btnImport.getAttribute("data-code") || tr?.getAttribute("data-code") || "").trim();
          const desc = String(btnImport.getAttribute("data-desc") || tr?.getAttribute("data-desc") || "").trim() || code;

          try{
            if (fid){
              window.openFinishedProductModal && window.openFinishedProductModal(fid);
            } else {
              prefillNewFinishedProduct(code, desc);
            }
          }catch(err){
            console.error(err);
          }
          return;
        }

        // click sulla riga (anche senza bottone): apre la distinta base
        const tr = e.target?.closest?.("tr.jsDaneaItemRow");
        if (tr){
          e.preventDefault(); e.stopPropagation();

          const fid = String(tr.getAttribute("data-fpid") || "").trim();
          const code = String(tr.getAttribute("data-code") || "").trim();
          const desc = String(tr.getAttribute("data-desc") || "").trim() || code;

          try{
            if (fid){
              window.openFinishedProductModal && window.openFinishedProductModal(fid);
            } else {
              prefillNewFinishedProduct(code, desc);
            }
          }catch(err){
            console.error(err);
          }
        }
      });
    }
  }

  function ingestXml(text, force){
    const h = hashStr(text);
    if (!force && h && h === S.lastXmlHash) return;

    let ddts = [];
    try{
      ddts = parseEasyfattXml(text);
    }catch(err){
      console.warn(err);
      try{ window.HubInv?.showToast?.("XML non valido", "err"); }catch(_){}
            return;
    }

    S.lastXmlHash = h;
    S.lastFetchedAt = new Date().toISOString();
    S.ddts = ddts;
    S.lastParsedCount = Array.isArray(ddts) ? ddts.length : 0;

    // Persistenza su Firestore (nessuna cache locale)
    try{ syncParsedToFirestore(ddts).catch(()=>{}); }catch(_){ }

    // auto import placeholder (solo se loggato)
    try{ maybeAutoImportFinishedProducts(ddts); }catch(_){}

    render();
    try{ __autoModeKick("xml"); }catch(_){ }
  }

  async function fetchNow(force){
    const url = String(S.xmlUrl || "").trim();
    if (!url) { render(); return; }

    try{
      // NOTE: CORS is handled by the proxy. We never send cookies.
      const r = await fetch(url, { cache: "no-store", mode: "cors", credentials: "omit" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const body = await r.text();
      ingestXml(body, !!force);
    }catch(err){
      console.warn("fetch XML failed", err);
      const msg = String(err && (err.message || err) || "");
      if (/Failed to fetch/i.test(msg) || /CORS/i.test(msg)){
        try{ window.HubInv?.showToast?.("Impossibile leggere XML (CORS/proxy)", "warn"); }catch(_){}
      } else {
        try{ window.HubInv?.showToast?.("Impossibile leggere XML", "warn"); }catch(_){}
      }
      try{
        if (/Failed to fetch/i.test(msg)){
          console.warn("[DANEA] Tipico errore CORS: il proxy deve rispondere con Access-Control-Allow-Origin per " + (location && location.origin ? location.origin : "questa origin") + ".");
        }
      }catch(_){}
    }
  }


  function startPolling(){
    if (S.timer) return;
    // every minute (XML is overwritten ~10 min)
    S.timer = setInterval(() => fetchNow(false), 60 * 1000);
  }

  function subscribeCompleted(){
    const H = getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (S.unsub.completed) return;

    try{
      const { collection, query, orderBy, onSnapshot } = H.FS;
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted");
      const q = query(col, orderBy("date", "desc"));
      S.unsub.completed = onSnapshot(q, (snap) => {
        const arr = [];
        snap.forEach(docu => {
          const d = docu.data() || {};
          arr.push(Object.assign({ _id: docu.id }, d));
        });
        S.completed = arr;
        cacheCompletedMap();
        render();
        try{ __autoModeKick("completed"); }catch(_){ }
      }, (err) => {
        console.warn("completed snapshot error", err);
      });
    }catch(e){
      console.warn("subscribeCompleted failed", e);
    }
  }

  
  function keyToId(k){
    // docId deterministico: numero__data (sanitizzato)
    return encodeURIComponent(String(k || "").trim());
  }

  function rebuildCacheMap(){
    const map = new Map();
    for (const d of (S.cache || [])){
      const k = String(d.key || "").trim();
      if (!k) continue;
      map.set(k, d);
    }
    S.cacheMap = map;
  }

  function subscribeCache(){
    const H = getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (S.unsub.cache) return;

    try{
      const { collection, query, orderBy, onSnapshot } = H.FS;
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "daneaDdts");
      const q = query(col, orderBy("date", "desc"));
      S.unsub.cache = onSnapshot(q, (snap) => {
        const arr = [];
        snap.forEach(docu => {
          const d = docu.data() || {};
          let key = String(d.key || d.ddtKey || "").trim();
          if (!key){
            try{ key = decodeURIComponent(String(docu.id||"")); }catch(_){ key = String(docu.id||""); }
            key = String(key||"").trim();
          }
          if (!key) return;
          arr.push(Object.assign({ _id: docu.id, key }, d));
        });
        S.cache = arr;
        S.cacheReady = true;
        rebuildCacheMap();
        render();
        try{ __autoModeKick("cache"); }catch(_){ }
      }, (err) => {
        console.warn("daneaDdts snapshot error", err);
        S.cacheReady = true;
        render();
        try{ __autoModeKick("cache_err"); }catch(_){ }
      });
    }catch(e){
      console.warn("subscribeCache failed", e);
      S.cacheReady = true;
    }
  }

  async function syncParsedToFirestore(parsed){
    const arr = Array.isArray(parsed) ? parsed : [];
    if (!arr.length) return;

    const H = S.hub || getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) {
      S.pendingParsed = arr;
      return;
    }

    const { doc, setDoc, serverTimestamp } = H.FS;

    // Upsert solo per NEW/UPDATED (hash diverso o doc mancante)
    for (const d of arr){
      if (!d || !d.key) continue;
      const k = String(d.key).trim();
      if (!k) continue;

      const newHash = String(d.hash || "");
      const existing = (S.cacheMap instanceof Map) ? S.cacheMap.get(k) : null;
      const oldHash = String(existing?.xmlHash || existing?.hash || "");

      // se identico, non scriviamo (niente spam). Il sistema lo sa perché hash uguale.
      if (oldHash && newHash && oldHash === newHash) continue;

      const isNew = !existing;
      const payload = {
        key: k,
        number: String(d.number || "").trim(),
        date: String(d.date || "").trim(),
        customer: String(d.customer || "").trim(),
        rows: (d.rows || []).map(x => ({
          idx: (x && x.idx != null) ? x.idx : null,
          code: String(x?.code || "").trim(),
          desc: String(x?.desc || "").trim(),
          qty: (x && x.qty != null) ? x.qty : null,
          qtyRaw: String(x?.qtyRaw || "").trim(),
          uom: String(x?.uom || "").trim(),

          // fatturato (best-effort)
          unitNet: (x && x.unitNet != null) ? x.unitNet : null,
          unitGross: (x && x.unitGross != null) ? x.unitGross : null,
          vatPerc: (x && x.vatPerc != null) ? x.vatPerc : null,
          net: (x && x.net != null) ? x.net : null,
          vat: (x && x.vat != null) ? x.vat : null,
          gross: (x && x.gross != null) ? x.gross : null
        })),
        rowsCount: Array.isArray(d.rows) ? d.rows.length : 0,
        netTotal: (d && d.netTotal != null) ? d.netTotal : null,
        vatTotal: (d && d.vatTotal != null) ? d.vatTotal : null,
        grossTotal: (d && d.grossTotal != null) ? d.grossTotal : null,
        currency: String(d.currency || "EUR"),
        xmlHash: newHash,
        syncState: isNew ? "new" : "updated",
        updatedAt: serverTimestamp(),
        lastSeenAt: serverTimestamp()
      };

      if (isNew){
        payload.createdAt = serverTimestamp();
        payload.rev = 1;
      } else {
        const prev = Number(existing?.rev || 1);
        payload.rev = (Number.isFinite(prev) ? prev : 1) + 1;
      }

      try{
        const ref = doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdts", keyToId(k));
        await setDoc(ref, payload, { merge: true });
        S.lastSyncError = "";
      }catch(e){
        const msg = String(e?.code || e?.message || e || "");
        S.lastSyncError = msg;
        console.warn("sync daneaDdts failed", msg);
        try{ window.HubInv?.showToast?.("Permessi Firebase: non posso salvare i DDT (rules)", "err"); }catch(_){}
        if (/permission|insufficient|PERMISSION_DENIED/i.test(msg)) return;
      }
    }
  }
function subscribeFinishedProducts(){
    const H = getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (S.unsub.finished) return;

    try{
      const { collection, onSnapshot, query, orderBy } = H.FS;
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "finishedProducts");
      const q = query(col, orderBy("nameLower", "asc"));
      S.unsub.finished = onSnapshot(q, (snap) => {
        const arr = [];
        const map = new Map();
        snap.forEach(docu => {
          const d = docu.data() || {};
          const id = docu.id;
          const obj = Object.assign({ id }, d);
          arr.push(obj);
          const code = String(obj.code || "").trim();
          if (code) map.set(code.toLowerCase(), obj);
        });
        S.finished = arr;
        S.fpByCode = map;
        render();
        try{ __autoModeKick("fp"); }catch(_){ }
        // se dettaglio aperto, re-render
        if (S.selected && $("daneaDetailWrap")?.style.display !== "none"){
          renderDetail(S.selected, "verify");
        }
      }, (err) => {
        console.warn("finishedProducts snapshot error", err);
      });
    }catch(e){
      console.warn("subscribeFinishedProducts failed", e);
    }
  }

  

function subscribeFinishedProductCategories(){
    const H = getHub();
    if (!H || !H.fb || !H.fb.db || !H.FS) return;
    if (S.unsub.fpcats) return;

    try{
      const { collection, onSnapshot, query, orderBy } = H.FS;
      const col = collection(H.fb.db, "orgs", H.ORG_ID, "finishedProductCategories");
      const q = query(col, orderBy("nameLower", "asc"));
      S.unsub.fpcats = onSnapshot(q, (snap) => {
        const arr = [];
        const map = new Map();
        snap.forEach(docu => {
          const d = docu.data() || {};
          let key = String(d.key || "").trim();
          if (!key) {
            try{ key = decodeURIComponent(String(docu.id||"")); }catch(_){ key = String(docu.id||""); }
          }
          key = String(key||"").trim().toLowerCase();
          if (!key) return;
          const obj = Object.assign({ key }, d);
          arr.push(obj);
          map.set(key, obj);
        });
        S.fpCats = arr;
        S.fpCatByKey = map;
        render();
        try{ __autoModeKick("fpcats"); }catch(_){ }
        if (S.selected && $("daneaDetailWrap")?.style.display !== "none"){
          renderDetail(S.selected, "verify");
        }
      }, (err) => {
        console.warn("finishedProductCategories snapshot error", err);
      });
    }catch(e){
      console.warn("subscribeFinishedProductCategories failed", e);
    }
  }
function waitForHub(attempt){
    attempt = attempt || 0;
    const H = getHub();
    if (H && H.fb && H.fb.db && H.FS){
      S.hub = H;
      subscribeCompleted();
      subscribeCache();
      subscribeFinishedProducts();
      subscribeFinishedProductCategories();

      // se abbiamo parsato XML prima che Firestore fosse pronto, sincronizza ora
      try{
        if (Array.isArray(S.pendingParsed) && S.pendingParsed.length){
          const p = S.pendingParsed;
          S.pendingParsed = null;
          syncParsedToFirestore(p).catch(()=>{});
        }
      }catch(_){ }
      return;
    }
    if (attempt > 200) return;
    setTimeout(() => waitForHub(attempt+1), 100);
  }

  function init(){
    const root = $("viewDaneaDdt");
    if (!root) return;

    // restore prefs (hidden UI) — always auto-load XML when you enter
    try{
      const stored = String(localStorage.getItem(LS_URL) || "").trim();
      const base = stored || DEFAULT_XML_URL_BASE;
      S.xmlUrl = normalizeDaneaXmlUrl(base);
      try{ localStorage.setItem(LS_URL, S.xmlUrl); }catch(_){}
    }catch(_){}

    // restore toggle (default ON)
    try{ setAutoDischarge(__readAutoFromLS()); }catch(_){ }

    bindEvents();
    render();

    // start polling even if not logged
    startPolling();
    fetchNow(false);

    // subscribe Firestore (when hub ready)
    waitForHub(0);

    // expose hook (called by menu click)
    window.HubDaneaDdt = window.HubDaneaDdt || {};
    window.HubDaneaDdt.refresh = function(){
      try{ render(); }catch(_){}
      try{ fetchNow(true); }catch(_){}
    };
    window.HubDaneaDdt.backToList = function(){
      try{ backToList(); }catch(_){}
    };
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();




;
/* ===== revenue.js ===== */
/* Sezione: Fatturato
   - Mostra il fatturato per DDT COMPLETATI con movimenti creati
   - Dati letti da Firestore:
     • orgs/{ORG_ID}/daneaDdtCompleted
     • orgs/{ORG_ID}/daneaDdts (fallback/importi riga)
*/
(function(){
  "use strict";

  const S = {
    ready: false,
    hub: null,
    completed: [],
    completedMap: new Map(),
    cacheMap: new Map(),
    selectedKey: "",
    unsub: { done: null, cache: null }
  };

  function H(){ try{ return globalThis.__HUB || null; }catch(_){ return null; } }
  function $(id){ return document.getElementById(id); }

  function esc(s){
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
  function escAttr(s){ return esc(s).replace(/\n/g, " "); }
  function norm(s){ return String(s ?? "").trim().toLowerCase(); }

  function fmtDateIT(iso){
    try{
      const d = new Date(String(iso || ""));
      if (Number.isNaN(d.getTime())) return String(iso || "—");
      return d.toLocaleDateString("it-IT");
    }catch(_){ return String(iso || "—"); }
  }

  function toNum(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function fmtMoney(v, cur){
    const n = toNum(v);
    if (n == null) return "—";
    const c = String(cur || "EUR").trim() || "EUR";
    try{ return n.toLocaleString("it-IT", { style: "currency", currency: c }); }catch(_){
      try{ return "€ " + n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }catch(__){
        return String(n);
      }
    }
  }

  function fmtQty(q, raw){
    const n = toNum(q);
    if (n == null) return String(raw || "—");
    try{ return n.toLocaleString("it-IT", { maximumFractionDigits: 3 }); }catch(_){ return String(n); }
  }

  function isMovementsCreated(d){
    try{
      const ids = Array.isArray(d && d.movementIds) ? d.movementIds : [];
      return ids.length > 0;
    }catch(_){ return false; }
  }

  function rebuildCompletedMap(){
    const m = new Map();
    for (const c of (S.completed || [])){
      const k = String(c && (c.key || c._id) || "").trim();
      if (k) m.set(k, c);
    }
    S.completedMap = m;
  }

  function rebuildCacheMap(list){
    const m = new Map();
    for (const d of (list || [])){
      const k = String(d && d.key || "").trim();
      if (k) m.set(k, d);
    }
    S.cacheMap = m;
  }

  function setDetailOpen(open){
    const list = $("revListWrap");
    const det = $("revDetailWrap");
    if (list) list.style.display = open ? "none" : "";
    if (det) det.style.display = open ? "" : "none";
    try{ window.__syncDockedControlsVisibility && window.__syncDockedControlsVisibility(); }catch(_){ }
  }

  function computeTotalsFromRows(rows){
    const out = { net: 0, vat: 0, gross: 0 };
    const arr = Array.isArray(rows) ? rows : [];
    for (const r of arr){
      const net = toNum(r && r.net);
      const vat = toNum(r && r.vat);
      const gross = toNum(r && r.gross);
      const n = (net == null) ? 0 : net;
      const v = (vat == null) ? 0 : vat;
      const g = (gross == null) ? (n + v) : gross;
      out.net += n;
      out.vat += v;
      out.gross += g;
    }
    return out;
  }

  function getDdtModel(key){
    const k = String(key || "").trim();
    if (!k) return null;

    const done = S.completedMap.get(k) || null;
    const cached = S.cacheMap.get(k) || null;

    // Fonte principale: cache (daneaDdts) perché è l’ultimo parse dell’XML
    const base = cached || done;
    if (!base) return null;

    const currency = String((cached && cached.currency) || (done && done.currency) || "EUR");
    const rows = (cached && Array.isArray(cached.rows) && cached.rows.length)
      ? cached.rows
      : (done && Array.isArray(done.rows) ? done.rows : []);

    const tDone = {
      net: toNum(done && done.netTotal),
      vat: toNum(done && done.vatTotal),
      gross: toNum(done && done.grossTotal)
    };
    const tCache = {
      net: toNum(cached && cached.netTotal),
      vat: toNum(cached && cached.vatTotal),
      gross: toNum(cached && cached.grossTotal)
    };

    // Preferisci i totali della cache (aggiornabili anche per DDT già completati)
    let netTotal = (tCache.net != null) ? tCache.net : (tDone.net != null) ? tDone.net : null;
    let vatTotal = (tCache.vat != null) ? tCache.vat : (tDone.vat != null) ? tDone.vat : null;
    let grossTotal = (tCache.gross != null) ? tCache.gross : (tDone.gross != null) ? tDone.gross : null;

    if (netTotal == null || vatTotal == null || grossTotal == null){
      const tr = computeTotalsFromRows(rows);
      if (netTotal == null) netTotal = tr.net;
      if (vatTotal == null) vatTotal = tr.vat;
      if (grossTotal == null) grossTotal = tr.gross;
    }

    return {
      key: k,
      number: String(base.number || "").trim(),
      date: String(base.date || "").trim(),
      customer: String(base.customer || "").trim(),
      currency,
      rows,
      netTotal: netTotal || 0,
      vatTotal: vatTotal || 0,
      grossTotal: grossTotal || 0,
      __done: done
    };
  }

  function listDdts(){
    const list = (S.completed || []).filter(isMovementsCreated);
    // ordina: più recenti prima (data, numero)
    return list.slice().sort((a,b) => {
      const da = String(a?.date || "");
      const db = String(b?.date || "");
      const na = String(a?.number || "");
      const nb = String(b?.number || "");
      return db.localeCompare(da) || nb.localeCompare(na);
    });
  }

  

  /* =========================================================
     HOME — Cockpit fatturato (Dashboard)
     - usa i DDT completati con movimenti creati
     - KPI: Oggi / 7g / Mese / IVA mese
     ========================================================= */
  let __homeRevBound = false;
  let __homeRevLockedTileH = 0;
  // Dashboard cockpit: nessun toggle giorno/settimana/mese nel box.
  // Manteniamo la vista mensile (12 mesi). I dettagli si vedono nella sezione "Fatturato".
  let __homeRevPeriod = "month";

  function __pad2(n){ return String(n).padStart(2, "0"); }
  function __todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${__pad2(d.getMonth()+1)}-${__pad2(d.getDate())}`;
  }


  function __addDays(iso, delta){
    const d = new Date(String(iso||"") + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + (Number(delta)||0));
    return `${d.getFullYear()}-${__pad2(d.getMonth()+1)}-${__pad2(d.getDate())}`;
  }
  
  function __isoFromDate(d){
    try{
      if (!d || Number.isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${__pad2(d.getMonth()+1)}-${__pad2(d.getDate())}`;
    }catch(_){ return ""; }
  }

  function __weekStartISO(iso){
    try{
      const d = new Date(String(iso||"") + "T00:00:00");
      if (Number.isNaN(d.getTime())) return "";
      const dow = d.getDay();
      const diff = (dow === 0 ? -6 : 1 - dow);
      d.setDate(d.getDate() + diff);
      return __isoFromDate(d);
    }catch(_){ return ""; }
  }

  function __fmtEuro0(v){
    const n = toNum(v);
    if (n == null) return "—";
    const x = Math.round(n);
    try{ return "€ " + x.toLocaleString("it-IT"); }catch(_){ return "€ " + String(x); }
  }

  function __lockHomeRevenueCockpitHeight(){
    const el = $("homeRevenueCockpit");
    if (!el) return (__homeRevLockedTileH || 0);
    const ref = document.getElementById("btnGoCategories");
    const r = ref && ref.getBoundingClientRect ? ref.getBoundingClientRect() : null;

    // Altezza cockpit = come prima (stessa scala del tile "Categorie")
    // (+30%: leggibilita' KPI senza far "saltare" la dashboard)
    const baseH = Math.round((r && r.height) || 0);
    const h = Math.round(baseH * 1.30);

    if (h > 10){
      if (h !== __homeRevLockedTileH){
        __homeRevLockedTileH = h;
        el.style.height = h + "px";
        el.style.minHeight = h + "px";
        el.style.maxHeight = h + "px";
      }
      return h;
    }
    return (__homeRevLockedTileH || 0);
  }
  function renderHomeCockpit(){
    const boxTotal = $("homeRevenueTotalCockpit");
    const boxPack  = $("homeRevenuePackCockpit");
    if (!boxTotal && !boxPack) return;

    const elTotal = $("homeRevTotal");
    const elMeta  = $("homeRevMeta");
    const elTopPack     = $("homeRevTopPackaging");
    const elTopPackMeta = $("homeRevTopPackagingMeta");

    const today = __todayISO();
    const weekStart = __addDays(today, -6);
    const monthStart = today ? (today.slice(0,8) + "01") : "";

    // Periodo (best-effort): default mese corrente.
    let pickedLabel = "Mese corrente";
    let fromISO = monthStart;
    let toISO = today;
    if (__homeRevPeriod === "day"){
      pickedLabel = "Oggi";
      fromISO = today;
      toISO = today;
    } else if (__homeRevPeriod === "week"){
      pickedLabel = "Ultimi 7 giorni";
      fromISO = weekStart;
      toISO = today;
    } else {
      __homeRevPeriod = "month";
      pickedLabel = "Mese corrente";
      fromISO = monthStart;
      toISO = today;
    }

    function __isIsoDate(s){ return /^\d{4}-\d{2}-\d{2}$/.test(String(s||"")); }
    function __inRange(day){
      const d = String(day||"").trim();
      if (!__isIsoDate(d)) return false;
      if (!fromISO || !toISO) return true;
      return d >= fromISO && d <= toISO;
    }

    function __macroGroup(code){
      try{
        if (typeof getMacroCategoryForCode === "function") return String(getMacroCategoryForCode(code) || "").trim().toLowerCase();
      }catch(_){ }
      return "";
    }

    // Aggregazioni (solo DDT nel periodo)
    let sumGross = 0;
    let ddtCount = 0;
    const packAgg = new Map(); // codeLower -> {code,name,uom,qty}

    const list = listDdts();
    for (const d of (Array.isArray(list) ? list : [])){
      const k = String(d?.key || d?._id || "").trim();
      const m = getDdtModel(k);
      if (!m) continue;

      const day = String(m.date || "").trim();
      if (!__inRange(day)) continue;

      const grossTot = Number(toNum(m.grossTotal) || 0);
      sumGross += grossTot;
      ddtCount++;

      // Imballaggi movimentati (allocazioni componenti)
      const done = m.__done || null;
      const allocs = (done && Array.isArray(done.allocations)) ? done.allocations : [];
      for (const a of allocs){
        const code = String(a?.code || "").trim();
        if (!code) continue;
        if (__macroGroup(code) !== "imballaggi") continue;

        const qty = Number(a?.qty || 0);
        if (!Number.isFinite(qty) || qty <= 0) continue;

        const low = code.toLowerCase();
        const name = String(a?.name || a?.item || "").trim() || code;
        const uom = String(a?.uom || "").trim();

        const rec = packAgg.get(low) || { code, name, uom, qty: 0 };
        rec.qty += qty;
        if ((!rec.name || rec.name === rec.code) && name) rec.name = name;
        if (!rec.uom && uom) rec.uom = uom;
        packAgg.set(low, rec);
      }
    }

    function __pickTop(map, cmp){
      let best = null;
      for (const v of map.values()){
        if (!best) { best = v; continue; }
        if (cmp(v, best) > 0) best = v;
      }
      return best;
    }

    const topPack = __pickTop(packAgg, (a,b) => {
      const qa = Number(a?.qty || 0);
      const qb = Number(b?.qty || 0);
      if (qa !== qb) return qa - qb;
      return String(a?.name || a?.code || "").localeCompare(String(b?.name || b?.code || ""), "it", { sensitivity:"base" });
    });

    // UI: fatturato totale
    if (elTotal) elTotal.textContent = __fmtEuro0(sumGross);
    if (elMeta) elMeta.textContent = `${pickedLabel} · ${Number(ddtCount || 0).toLocaleString("it-IT")} DDT`;

    // UI: imballaggio più movimentato
    if (elTopPack) elTopPack.textContent = topPack ? String(topPack.name || topPack.code || "—") : "—";
    if (elTopPackMeta){
      if (!topPack) {
        elTopPackMeta.textContent = "—";
      } else {
        const q = Number(topPack.qty || 0);
        const u = String(topPack.uom || "").trim();
        elTopPackMeta.textContent = q ? (q.toLocaleString("it-IT") + (u ? (" " + u) : "")) : "—";
      }
    }

    // Tooltip (riassunto)
    const tip = "Cockpit fatturato — " + [
      `${pickedLabel}: ${__fmtEuro0(sumGross)} (${Number(ddtCount||0).toLocaleString("it-IT")} DDT)`,
      topPack ? (`Imballaggio: ${String(topPack.name || topPack.code || "—")} · ${Number(topPack.qty||0).toLocaleString("it-IT")}${topPack.uom ? (" " + String(topPack.uom)) : ""}`) : "Imballaggio: —"
    ].join(" — ");
    try{ if (boxTotal) boxTotal.title = tip; }catch(_){ }
    try{ if (boxPack) boxPack.title = tip; }catch(_){ }

    // Bind una sola volta: click -> apri sezione Fatturato
    if (!__homeRevBound){
      __homeRevBound = true;

      function openRevenue(e){
        try{ e && e.preventDefault && e.preventDefault(); }catch(_){ }
        try{ e && e.stopPropagation && e.stopPropagation(); }catch(_){ }
        try{
          if (window.HubInv && typeof window.HubInv.setView === "function") window.HubInv.setView("revenue");
          if (window.HubRevenue && typeof window.HubRevenue.refresh === "function") window.HubRevenue.refresh();
        }catch(_){ }
      }

      const bindBox = (el) => {
        if (!el) return;
        el.addEventListener("pointerdown", (e) => {
          try{ e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation(); }catch(_){ }
        }, true);
        el.addEventListener("click", openRevenue, true);
        el.addEventListener("keydown", (e) => {
          if (!e) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
          openRevenue(e);
        });
      };

      bindBox(boxTotal);
      bindBox(boxPack);
    }
  }
function renderList(){
    const view = $("viewRevenue");
    const isActive = !!(view && view.classList.contains("active"));

    const list = listDdts();
    try{ const pill = $("pillRevenueCount"); if (pill) pill.textContent = String(list.length); }catch(_){ }

    if (!isActive) return;

    const q = norm($("revSearch")?.value);
    const meta = $("revMeta");
    const tbody = $("revTbody");
    if (!tbody) return;

    const filtered = q ? list.filter(d => {
      const k = String(d?.key || d?._id || "").trim();
      const base = [d?.number, d?.date, d?.customer, k].map(x => norm(x)).join(" ");
      if (base.includes(q)) return true;
      // include codici/articoli (solo se cache disponibile)
      const m = getDdtModel(k);
      if (!m) return false;
      try{
        for (const r of (m.rows || [])){
          const hay = norm((r?.code || "") + " " + (r?.desc || r?.item || ""));
          if (hay.includes(q)) return true;
        }
      }catch(_){ }
      return false;
    }) : list;

    try{ if (meta) meta.textContent = `${filtered.length} DDT completati`; }catch(_){ }

    if (!filtered.length){
      tbody.innerHTML = `<tr><td class="td-muted" colspan="7">${q ? "Nessun DDT trovato." : "Nessun DDT completato (movimenti creati)."}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(d => {
      const k = String(d?.key || d?._id || "").trim();
      const m = getDdtModel(k) || { key:k, number: d?.number, date: d?.date, customer: d?.customer, currency:"EUR", netTotal:0, vatTotal:0, grossTotal:0 };
      const cur = m.currency || "EUR";

      return `<tr class="jsRevRow" data-key="${escAttr(k)}" title="Apri">
        <td data-label="Data">${esc(fmtDateIT(m.date) || "—")}</td>
        <td data-label="Numero"><span class="kbd">${esc(m.number || "—")}</span></td>
        <td data-label="Cliente">${esc(m.customer || "—")}</td>
        <td data-label="Imponibile" class="qty" style="text-align:right;">${esc(fmtMoney(m.netTotal, cur))}</td>
        <td data-label="IVA" class="qty" style="text-align:right;">${esc(fmtMoney(m.vatTotal, cur))}</td>
        <td data-label="Totale" class="qty" style="text-align:right;">${esc(fmtMoney(m.grossTotal, cur))}</td>
        <td data-label="" style="text-align:right;">
          <button class="btn btn-ghost btn-xs jsRevOpen" type="button" data-key="${escAttr(k)}">Apri</button>
        </td>
      </tr>`;
    }).join("");
  }

  function renderDetail(key){
    const m = getDdtModel(key);
    const rows = m ? (m.rows || []) : [];

    const title = $("revDetTitle");
    const sub = $("revDetSubtitle");
    const netP = $("revDetNet");
    const vatP = $("revDetVat");
    const groP = $("revDetGross");
    const foot = $("revDetFooter");
    const tbody = $("revItemsTbody");

    if (!m || !tbody){
      if (tbody) tbody.innerHTML = '<tr><td class="td-muted" colspan="6">DDT non trovato.</td></tr>';
      return;
    }

    const cur = m.currency || "EUR";
    if (title) title.textContent = "Dettaglio DDT";
    if (sub) sub.textContent = [
      (m.customer || "—"),
      (m.number ? ("DDT " + m.number) : ("DDT " + m.key)),
      (fmtDateIT(m.date) || "—")
    ].join(" · ");

    if (netP) netP.textContent = "Imponibile: " + fmtMoney(m.netTotal, cur);
    if (vatP) vatP.textContent = "IVA: " + fmtMoney(m.vatTotal, cur);
    if (groP) groP.textContent = "Totale: " + fmtMoney(m.grossTotal, cur);

    if (!rows.length){
      tbody.innerHTML = '<tr><td class="td-muted" colspan="6">Nessuna riga nel DDT.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(r => {
        const code = String(r?.code || "").trim();
        const desc = String(r?.desc || r?.item || "").trim();
        const qtyDisp = fmtQty(r?.qty, r?.qtyRaw);

        // importi riga (fallback in UI)
        let net = toNum(r?.net);
        let vat = toNum(r?.vat);
        let gross = toNum(r?.gross);
        const q = toNum(r?.qty);
        const unitNet = toNum(r?.unitNet);
        const unitGross = toNum(r?.unitGross);
        const vatPerc = toNum(r?.vatPerc);

        if (net == null && unitNet != null && q != null) net = unitNet * q;
        if (gross == null && unitGross != null && q != null) gross = unitGross * q;
        if (vat == null && net != null && vatPerc != null) vat = net * (vatPerc/100);
        if (gross == null && net != null && vat != null) gross = net + vat;
        if (net == null && gross != null && vat != null) net = gross - vat;
        if (vat == null && gross != null && net != null) vat = gross - net;

        return `<tr>
          <td data-label="Codice"><span class="kbd">${esc(code || "—")}</span></td>
          <td data-label="Articolo">${esc(desc || code || "—")}</td>
          <td data-label="Q.tà" class="qty" style="text-align:right;">${esc(qtyDisp || "—")}</td>
          <td data-label="Imponibile" class="qty" style="text-align:right;">${esc(fmtMoney(net, cur))}</td>
          <td data-label="IVA" class="qty" style="text-align:right;">${esc(fmtMoney(vat, cur))}</td>
          <td data-label="Totale" class="qty" style="text-align:right;">${esc(fmtMoney(gross, cur))}</td>
        </tr>`;
      }).join("");
    }

    if (foot){
      const hasMoney = (toNum(m.netTotal) || 0) > 0 || (toNum(m.grossTotal) || 0) > 0;
      foot.textContent = hasMoney
        ? "Valori letti dall’XML (imponibile + IVA)."
        : "Nell’XML non trovo i campi importo (imponibile/IVA) per queste righe.";
    }
  }

  function openDetail(key){
    const k = String(key || "").trim();
    if (!k) return;
    S.selectedKey = k;
    setDetailOpen(true);
    renderDetail(k);
  }

  function backToList(){
    S.selectedKey = "";
    setDetailOpen(false);
    renderList();
    try{ renderHomeCockpit(); }catch(_){ }
  }

  function bindEvents(){
    if (S.ready) return;
    S.ready = true;

    $("btnRevClear")?.addEventListener("click", () => {
      const i = $("revSearch");
      if (i) i.value = "";
      renderList();
      try{ i && i.focus && i.focus(); }catch(_){ }
    });
    $("revSearch")?.addEventListener("input", () => renderList());

    $("btnRevBackList")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
      backToList();
    });

    $("revTbody")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button.jsRevOpen");
      const tr = e.target?.closest?.("tr.jsRevRow");
      const key = String(btn?.getAttribute("data-key") || tr?.getAttribute("data-key") || "").trim();
      if (!key) return;
      if (btn){ try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } }
      openDetail(key);
    });
  }

  function subscribe(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) return false;
    if (S.unsub.done || S.unsub.cache) return true;

    try{
      const { collection, query, orderBy, onSnapshot } = h.FS;

      // completed
      S.unsub.done = onSnapshot(
        query(collection(h.fb.db, "orgs", h.ORG_ID, "daneaDdtCompleted"), orderBy("date", "desc")),
        (snap) => {
          const arr = [];
          snap.forEach(docu => {
            const d = docu.data() || {};
            arr.push(Object.assign({ _id: docu.id }, d));
          });
          S.completed = arr;
          rebuildCompletedMap();
          renderList();
          if (S.selectedKey) renderDetail(S.selectedKey);
          try{ renderHomeCockpit(); }catch(_){ }
        },
        (err) => { try{ console.warn("revenue completed snapshot error", err); }catch(_){ } }
      );

      // cache ddts (importi)
      S.unsub.cache = onSnapshot(
        query(collection(h.fb.db, "orgs", h.ORG_ID, "daneaDdts"), orderBy("date", "desc")),
        (snap) => {
          const arr = [];
          snap.forEach(docu => {
            const d = docu.data() || {};
            let key = String(d.key || d.ddtKey || "").trim();
            if (!key){
              try{ key = decodeURIComponent(String(docu.id||"")); }catch(_){ key = String(docu.id||""); }
              key = String(key||"").trim();
            }
            if (!key) return;
            arr.push(Object.assign({ _id: docu.id, key }, d));
          });
          rebuildCacheMap(arr);
          renderList();
          if (S.selectedKey) renderDetail(S.selectedKey);
          try{ renderHomeCockpit(); }catch(_){ }
        },
        (err) => { try{ console.warn("revenue daneaDdts snapshot error", err); }catch(_){ } }
      );

      return true;
    }catch(e){
      try{ console.warn("revenue subscribe failed", e); }catch(_){ }
      return false;
    }
  }

  function refresh(){
    bindEvents();
    subscribe();
    // se riapro la vista, default su lista
    if (!S.selectedKey) setDetailOpen(false);
    renderList();
    try{ renderHomeCockpit(); }catch(_){ }
  }

  function waitForHub(attempt){
    attempt = attempt || 0;
    const h = H();
    if (h && h.fb && h.fb.db && h.FS){
      refresh();
      return;
    }
    if (attempt > 200) return;
    setTimeout(() => waitForHub(attempt+1), 100);
  }

  // expose
  window.HubRevenue = window.HubRevenue || {};
  window.HubRevenue.refresh = refresh;
  window.HubRevenue.backToList = backToList;
  window.HubRevenue.openDetail = openDetail;
  window.HubRevenue.renderHomeCockpit = renderHomeCockpit;

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", () => waitForHub(0));
  } else {
    waitForHub(0);
  }
})();

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

  function backToList(){
    try{ setDetailOpen(false); }catch(_){}
    try{ S.selected=null; S.selectedKey=""; }catch(_){}
    try{ render(); }catch(_){}
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
/* ===== fp_categories.js ===== */
/* Hub Inventario — Sezione Categorie prodotti finiti
   - CRUD categorie (collection: finishedProductCategories)
   - BOM per categoria
   - Assegnazione prodotti finiti (field su finishedProducts: categoryKey)
*/
(function(){
  "use strict";

  const S = {
    ready:false,
    cats:[],
    catMap:new Map(),
    products:[],
    prodMap:new Map(),
    finished:[],
    fpByCode:new Map(),
    selectedKey:"",
    draft:null,

    // edit state (nome + chiave)
    keyManual:false,

    unsub:{ cats:null, products:null, finished:null }
  };

  function H(){ try{ return globalThis.__HUB || null; }catch(_){ return null; } }
  function $(id){ return document.getElementById(id); }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function norm(s){ return String(s ?? "").trim().toLowerCase(); }
  function keyToId(k){ return encodeURIComponent(String(k||"")); }

  function slugKey(name){
    return String(name||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_")
      .slice(0, 64);
  }

  function showToast(msg, kind){
    try{ window.HubInv?.showToast?.(msg, kind); return; }catch(_){ }
    try{ alert(String(msg||"")); }catch(_){ }
  }

  function closeSideMenuSafe(){
    try{ window.HubInv?.closeSideMenu?.(); }catch(_){ }
    try{ H()?.closeSideMenu?.(); }catch(_){ }
  }

  function setViewSafe(key){
    try{ window.HubInv?.setView?.(key); return; }catch(_){ }
    try{ H()?.setView?.(key); }catch(_){ }
  }

  // UI patch: modal categoria prodotti finiti
  // - niente aggiunta prodotti finiti qui (si fa da sezione Prodotti finiti)
  // - input componenti: niente datalist infinito (solo ricerca intelligente)
  // - modal full-screen con margini
  function __fpCatPatchModalUI(){
    try{
      const modal = $("modalFPCategory");
      if (!modal) return;

      // CSS full screen (desktop: con margini del backdrop, mobile: full)
      try{
        if (!document.getElementById("fpCatFullCss")){
          const st = document.createElement("style");
          st.id = "fpCatFullCss";
          st.textContent = `
#modalFPCategory .modalProductContent{\n  width: calc(100vw - 32px) !important;\n  max-width: none !important;\n  height: calc(100dvh - var(--header-h) - 32px) !important;\n  max-height: calc(100dvh - var(--header-h) - 32px) !important;\n}\n@media (max-width: 768px){\n  #modalFPCategory .modalProductContent{\n    width: 100vw !important;\n    height: calc(100dvh - var(--header-h)) !important;\n    max-height: none !important;\n  }\n}`;
          document.head.appendChild(st);
        }
      }catch(_){ }

      // CSS: header/footer fissi, body scroll (tasti sempre visibili)
      try{
        if (!document.getElementById("fpCatDockCss")){
          const st2 = document.createElement("style");
          st2.id = "fpCatDockCss";
          st2.textContent = `
#modalFPCategory .modalProductContent{
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  overflow: hidden !important;
}
#modalFPCategory .fpCatModalHeader{
  flex: 0 0 auto;
  padding: 18px 18px 12px;
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,.08);
}
#modalFPCategory .fpCatModalBody{
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 18px;
  -webkit-overflow-scrolling: touch;
}
#modalFPCategory .fpCatModalFooter{
  flex: 0 0 auto;
  padding: 12px 18px calc(12px + var(--safe-bot));
  background: #fff;
  border-top: 1px solid rgba(0,0,0,.08);
}
@media (max-width: 768px){
  #modalFPCategory .fpCatModalHeader{ padding: 14px 14px 10px; }
  #modalFPCategory .fpCatModalBody{ padding: 12px 14px; }
  #modalFPCategory .fpCatModalFooter{ padding: 10px 14px calc(10px + var(--safe-bot)); }
}
`;
          document.head.appendChild(st2);
        }
      }catch(_){ }

      // CSS: tabella componenti (BOM) senza righe azzurre, identica alle altre dataGrid
      try{
        if (!document.getElementById("fpCatBomTableCss")){
          const st3 = document.createElement("style");
          st3.id = "fpCatBomTableCss";
          st3.textContent = `
#modalFPCategory #fpCatCompTable tbody tr td{ background: transparent !important; }
#modalFPCategory #fpCatCompTable tbody tr:hover td{ background: rgba(11,31,58,.04) !important; }
`;
          document.head.appendChild(st3);
        }
      }catch(_){ }

      // Subtitle coerente col nuovo workflow
      try{
        const sub = $("fpCatModalSub");
        if (sub) sub.textContent = "Crea la distinta base (componenti) e visualizza i prodotti finiti associati. I prodotti si aggiungono da sezione Prodotti finiti.";
      }catch(_){ }

      // Rimuovi datalist infinito su componenti (solo ricerca intelligente)
      try{
        const comp = $("fpCatCompPick");
        if (comp) comp.removeAttribute("list");
      }catch(_){ }
      try{ const dl = $("fpCatComponentList"); if (dl) dl.innerHTML = ""; }catch(_){ }

      // Nascondi UI aggiunta prodotti finiti (si aggiungono altrove)
      try{
        const inp = $("fpCatMemberPick");
        if (inp){
          const row = inp.closest?.(".inlineRow") || inp.parentElement;
          if (row) row.style.display = "none";
          inp.disabled = true;
        }
      }catch(_){ }
      try{ const btn = $("btnFpCatMemberAdd"); if (btn){ const r = btn.closest?.(".inlineRow") || btn.parentElement; if (r) r.style.display = "none"; btn.disabled = true; } }catch(_){ }
      try{ const w = $("fpCatMemberSuggestWrap"); if (w) w.style.display = "none"; }catch(_){ }
      try{ const dlm = $("fpCatMemberList"); if (dlm) dlm.innerHTML = ""; }catch(_){ }

// Collassa lista prodotti finiti: visibile solo cliccando "Prodotti: X · BOM: Y"
try{
  const meta = $("fpCatDetailMeta");
  const membersTable = $("fpCatMembersTable");
  const membersStack = membersTable ? membersTable.closest(".stack") : null;
  if (meta && membersStack){
    // default: chiuso
    membersStack.style.display = "none";
    meta.style.cursor = "pointer";
    meta.title = "Clicca per mostrare/nascondere i prodotti finiti";
    meta.setAttribute("role","button");
    meta.setAttribute("tabindex","0");

    if (!(meta.dataset && meta.dataset.fpToggleBound === "1")){
      if (meta.dataset) meta.dataset.fpToggleBound = "1";
      const toggle = () => {
        const open = membersStack.style.display !== "none";
        membersStack.style.display = open ? "none" : "";
      };
      meta.addEventListener("click", (e)=>{
        try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
        toggle();
      });
      meta.addEventListener("keydown", (e)=>{
        if (!e) return;
        if (e.key === "Enter" || e.key === " "){
          e.preventDefault();
          toggle();
        }
      });
    }
  }
}catch(_){ }

    }catch(_){ }
  }


  function parseQty(v){
    const s = String(v || "").trim();
    if (!s) return { num:null, raw:"" };
    const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
    if (m){
      const a = Number(m[1].replace(",","."));
      const b = Number(m[2].replace(",","."));
      if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return { num: a/b, raw: s };
    }
    const n = Number(s.replace(/\./g,"").replace(",","."));
    if (Number.isFinite(n)) return { num:n, raw:s };
    return { num:null, raw:s };
  }

  // ===== Smart qty parsing/conversion (componenti in distinta base) =====
  // Permette di scrivere nel campo di ricerca: "... 20 gr" / "... 0,02 kg" / "... 250 ml".
  // Se il componente è in kg e scrivi "20 gr", verrà precompilato automaticamente "0,02" nella Q.tà.
  let __fpCatPendingCompQty = null; // { qty:Number, uom:"g|kg|ton|ml|lt|pz|nr" }

  function __fpCatNormUom(v){
    try{ if (typeof __normalizeUom === "function") return __normalizeUom(v); }catch(_){ }
    const raw = String(v ?? "").trim().toLowerCase();
    if (!raw) return "";
    let k = raw.replace(/\s+/g, "").replace(/[,;:]/g, "").replace(/\.+$/g, "");
    k = k.replace(/º/g, "°");

    if (k === "pz" || k === "p.z" || k === "p.z." || k === "pc" || k === "pcs" || k === "pezzi") return "pz";
    if (k === "nr" || k === "n" || k === "n°" || k === "no") return "nr";

    if (k === "kg" || k === "kgs" || k === "k" || k === "kilo" || k === "kilogrammi" || k === "kilogrammo") return "kg";
    if (k === "g" || k === "gr" || k === "grammi" || k === "grammo") return "g";
    if (k === "ton" || k === "tons" || k === "tonn" || k === "tonne" || k === "t" || k === "tonnellate" || k === "tonnellata") return "ton";

    if (k === "l" || k === "lt" || k === "ltri" || k === "litri" || k === "litro" || k === "litri." || k === "litro.") return "lt";
    if (k === "ml" || k === "millilitri" || k === "millilitro") return "ml";

    return "";
  }

  function __fpCatParseNumPart(v){
    let s = String(v ?? "").trim().replace(/\s+/g, "");
    if (!s) return null;
    // se ho sia . che , assumo . come separatore migliaia e , come decimale
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    // solo . => decimale
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  function __fpCatParseNumSmart(v){
    const s0 = String(v ?? "").trim();
    if (!s0) return null;
    const s = s0.replace(/\s+/g, "");
    if (s.includes("/")){
      const parts = s.split("/");
      if (parts.length === 2){
        const a = __fpCatParseNumPart(parts[0]);
        const b = __fpCatParseNumPart(parts[1]);
        if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
      }
      return null;
    }
    return __fpCatParseNumPart(s);
  }

  function __fpCatExtractTrailingQty(raw){
    const s0 = String(raw || "").trim();
    if (!s0) return { clean:"", qty:null, uom:"", qtyRaw:"" };

    // cattura solo se c'è l'unità in coda (kg/gr/ml/lt/ton/pz/nr)
    const m = s0.match(/^(.*?)(?:\s+|^)(-?\d+(?:[\.,]\d+)?|-?\d+\s*\/\s*\d+(?:[\.,]\d+)?)\s*(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|g(?:r|rammi|rammo)?\.?|ml\.?|l(?:t|itri|itro)?\.?|lt\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\s*$/i);
    if (!m) return { clean:s0, qty:null, uom:"", qtyRaw:"" };

    const clean = String(m[1] || "").trim();
    const qtyStr = String(m[2] || "").trim();
    const uom = __fpCatNormUom(m[3] || "");
    const qty = __fpCatParseNumSmart(qtyStr);

    if (!uom || !Number.isFinite(qty)) return { clean:s0, qty:null, uom:"", qtyRaw:"" };
    return { clean, qty, uom, qtyRaw: qtyStr };
  }

  function __fpCatExtractQtyOnly(raw){
    const s0 = String(raw || "").trim();
    if (!s0) return { qty:null, uom:"", qtyRaw:"" };
    const m = s0.match(/^(-?\d+(?:[\.,]\d+)?|-?\d+\s*\/\s*\d+(?:[\.,]\d+)?)\s*(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|g(?:r|rammi|rammo)?\.?|ml\.?|l(?:t|itri|itro)?\.?|lt\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\s*$/i);
    if (!m) return { qty:null, uom:"", qtyRaw:"" };
    const qtyStr = String(m[1] || "").trim();
    const uom = __fpCatNormUom(m[2] || "");
    const qty = __fpCatParseNumSmart(qtyStr);
    if (!uom || !Number.isFinite(qty)) return { qty:null, uom:"", qtyRaw:"" };
    return { qty, uom, qtyRaw: qtyStr };
  }

  function __fpCatConvertQty(qty, fromUom, toUom){
    const a = __fpCatNormUom(fromUom);
    const b = __fpCatNormUom(toUom);
    const q = Number(qty);
    if (!a || !b || !Number.isFinite(q)) return null;
    if (a === b) return q;

    // pezzi: nr <-> pz
    if ((a === "pz" || a === "nr") && (b === "pz" || b === "nr")) return q;

    // massa: g <-> kg <-> ton
    const mass = new Set(["g","kg","ton"]);
    if (mass.has(a) && mass.has(b)){
      const toG = (u, v) => (u === "g") ? v : (u === "kg") ? (v * 1000) : (v * 1000 * 1000);
      const fromG = (u, g) => (u === "g") ? g : (u === "kg") ? (g / 1000) : (g / (1000 * 1000));
      const g = toG(a, q);
      return fromG(b, g);
    }

    // volume: ml <-> lt
    const vol = new Set(["ml","lt"]);
    if (vol.has(a) && vol.has(b)){
      const toMl = (u, v) => (u === "ml") ? v : (v * 1000);
      const fromMl = (u, ml) => (u === "ml") ? ml : (ml / 1000);
      const ml = toMl(a, q);
      return fromMl(b, ml);
    }

    return null;
  }

  function __fpCatFmtNum(v){
    try{
      const n = Number(v);
      if (!Number.isFinite(n)) return "";
      return n.toLocaleString("it-IT", { maximumFractionDigits: 6 });
    }catch(_){
      return String(v ?? "");
    }
  }

  function __fpCatUpdatePendingFromPick(rawAll){
    const parsed = __fpCatExtractTrailingQty(rawAll);
    if (parsed && parsed.qty != null && parsed.uom){
      __fpCatPendingCompQty = { qty: Number(parsed.qty), uom: String(parsed.uom) };
      return String(parsed.clean || "").trim();
    }
    __fpCatPendingCompQty = null;
    return String(rawAll || "").trim();
  }

  function __fpCatAutofillQtyFromPending(code, uomHint){
    try{
      const pend = __fpCatPendingCompQty;
      if (!pend || pend.qty == null || !pend.uom) { __fpCatPendingCompQty = null; return; }

      const qtyEl = $("fpCatCompQty");
      if (qtyEl && String(qtyEl.value || "").trim()) { __fpCatPendingCompQty = null; return; }

      // target uom: dal suggerimento o dal prodotto
      let targetUom = __fpCatNormUom(uomHint);
      if (!targetUom){
        const p = S && S.prodMap ? (S.prodMap.get(norm(code)) || null) : null;
        targetUom = __fpCatNormUom(p && (p.uom || p.um || ""));
      }
      if (!targetUom) { __fpCatPendingCompQty = null; return; }

      const conv = __fpCatConvertQty(pend.qty, pend.uom, targetUom);
      if (conv == null) { __fpCatPendingCompQty = null; return; }

      if (qtyEl) qtyEl.value = __fpCatFmtNum(conv);
    }catch(_){ }
    __fpCatPendingCompQty = null;
  }

  function __fpCatParseQtyForTarget(rawQty, targetUom){
    const s0 = String(rawQty || "").trim();
    if (!s0) return { num:null, raw:"" };

    const target = __fpCatNormUom(targetUom) || "";

    // se l'utente ha scritto anche l'unità (es. "20 gr"), converti
    const pu = __fpCatExtractQtyOnly(s0);
    if (pu && pu.qty != null && pu.uom && target){
      const conv = __fpCatConvertQty(pu.qty, pu.uom, target);
      if (conv != null) return { num: conv, raw: __fpCatFmtNum(conv) };
    }

    // fallback: numero/frazione senza unità
    const n = __fpCatParseNumSmart(s0);
    if (Number.isFinite(n)) return { num: n, raw: s0 };

    // ultimo fallback (vecchia logica)
    try{ return parseQty(s0); }catch(_){ return { num:null, raw:s0 }; }
  }


  function isActive(){
    const v = $("viewFPCategories");
    return !!(v && v.classList.contains("active"));
  }

  function setCreateOpen(open){
    const row = $("fpCatCreateRow");
    if (!row) return;
    row.style.display = open ? "" : "none";
    if (open){
      try{ $("fpCatNewName")?.focus(); }catch(_){ }
    } else {
      try{ $("fpCatNewName").value = ""; }catch(_){ }
    }
  }

  function setDetailOpen(open){
    const modal = $("modalFPCategory");
    if (!modal) return;
    if (open){
      modal.classList.add("open");
      try{ __fpCatPatchModalUI(); }catch(_){ }
      document.body.classList.add("modal-open");
      try{ setTimeout(()=>$("fpCatEditName")?.focus(), 0); }catch(_){ }
    } else {
      modal.classList.remove("open");
      try{ if (!document.querySelector(".modal.open")) document.body.classList.remove("modal-open"); }catch(_){ document.body.classList.remove("modal-open"); }
      S.selectedKey = "";
      S.draft = null;
      S.keyManual = false;
    }
  }

  function rebuildMaps(){
    S.catMap = new Map();
    for (const c of (S.cats || [])){
      const k = norm(c && (c.key || c.id || ""));
      if (k) S.catMap.set(k, c);
    }
    S.prodMap = new Map();
    for (const p of (S.products || [])){
      const code = norm(p && (p.code || ""));
      const id = norm(p && (p.id || ""));
      if (code) S.prodMap.set(code, p);
      if (id && !S.prodMap.has(id)) S.prodMap.set(id, p);
    }
    S.fpByCode = new Map();
    for (const fp of (S.finished || [])){
      const code = norm(fp && (fp.code || ""));
      if (code) S.fpByCode.set(code, fp);
    }
  }

  function membersForKey(key){
    const k = norm(key);
    if (!k) return [];
    return (S.finished || []).filter(fp => {
      const v = norm(fp?.categoryKeyLower || fp?.categoryKey || fp?.category || fp?.catKey || "");
      return v === k;
    });
  }

  function renderDatalists(){
    const dlComp = $("fpCatComponentList");
    if (dlComp){
      const opts = (S.products || []).slice(0, 2500).map(p => {
        const code = String(p.code || "").trim();
        const name = String(p.name || p.nome || "").trim();
        const label = (code && name) ? (code + " — " + name) : (name || code);
        return `<option value="${esc(label)}"></option>`;
      });
      dlComp.innerHTML = opts.join("");
    }

    const dlMem = $("fpCatMemberList");
    if (dlMem){
      const opts = (S.finished || []).slice(0, 2500).map(fp => {
        const code = String(fp.code || "").trim();
        const name = String(fp.name || fp.nome || "").trim();
        const label = (code && name) ? (code + " — " + name) : (name || code);
        return `<option value="${esc(label)}"></option>`;
      });
      dlMem.innerHTML = opts.join("");
    }
  }

  // ===== Smart search (ricerca intelligente) =====
  function __fpCatKey(v){
    return String(v || "")
      .toLowerCase()
      .trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function __fpCatBuildLabel(code, name){
    const c = String(code || "").trim();
    const n = String(name || "").trim();
    return (c && n) ? (c + " — " + n) : (n || c);
  }

  function __fpCatScore(code, name, qKey){
    const c = __fpCatKey(code).replace(/\s+/g, "");
    const n = __fpCatKey(name);
    const q = String(qKey || "");
    const qNo = q.replace(/\s+/g, "");
    if (!qNo) return -1;
    if (c && c.startsWith(qNo)) return 100;
    if (n && n.startsWith(q)) return 80;
    const hay = (c + " " + n).trim();
    if (hay.includes(qNo) || hay.includes(q)) return 60;
    const toks = q.split(" ").filter(Boolean);
    if (toks.length){
      for (const t of toks){
        if (!hay.includes(t)) return -1;
      }
      return 40;
    }
    return -1;
  }

  function __fpCatGetMatchList(kind, raw){
    const qRaw = String(raw || "").trim();

    // Components: support "categoria + dettagli" (es. "scatola 20 kg", "bobina 480")
    // - se la prima parola sembra una categoria, filtra subito su quella
    // - il resto del testo restringe ulteriormente i risultati
    let compCat = "";
    let compRest = qRaw;

    if (kind !== "member"){
      try{
        const toks = __fpCatKey(qRaw).split(" ").filter(Boolean);
        if (toks.length){
          const stem = (w)=>{
            let s = String(w||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"");
            if (!s) return "";
            if (/[aeiou]$/.test(s) && s.length > 3) s = s.slice(0,-1); // scatola->scatol, bobina->bobin
            return s;
          };

          const getProdCat = (it)=>{
            try{
              const code = String(it?.code || "").trim().toLowerCase();
              let cat = "";
              if (typeof window.getMacroCategoryForCode === "function"){
                cat = String(window.getMacroCategoryForCode(code) || "").trim().toLowerCase();
              }
              if (!cat){
                cat = String(it?.categoryKey || it?.category || it?.catKey || it?.cat || it?.macroCategory || it?.macro || "").trim().toLowerCase();
              }
              cat = cat.replace(/\s+/g,"_")
                .replace(/[^a-z0-9_]+/g,"_")
                .replace(/_+/g,"_")
                .replace(/^_+|_+$/g,"");
              return cat;
            }catch(_){ return ""; }
          };

          // elenco categorie presenti sui prodotti
          const catsSet = new Set();
          const list0 = (S.products || []);
          for (let i=0; i<list0.length; i++){
            const c = getProdCat(list0[i]);
            if (c) catsSet.add(c);
          }
          const cats = Array.from(catsSet);

          const matchTokToCat = (tok)=>{
            const t0 = stem(tok);
            if (!t0) return "";
            for (const c of cats){
              const parts = String(c||"").split("_").filter(Boolean);
              for (const w of parts){
                const ws = stem(w);
                if (!ws) continue;
                if (ws === t0 || ws.startsWith(t0) || t0.startsWith(ws)) return c;
              }
            }
            return "";
          };

          let usedIdx = -1;
          compCat = matchTokToCat(toks[0]) || "";
          if (compCat) usedIdx = 0;

          if (!compCat){
            for (let i=0; i<toks.length; i++){
              const c = matchTokToCat(toks[i]);
              if (c){ compCat = c; usedIdx = i; break; }
            }
          }

          if (compCat && usedIdx >= 0){
            const rest = toks.filter((_,i)=> i !== usedIdx);
            compRest = rest.join(" ").trim();
          }
        }
      }catch(_){}
    }

    const qKey = __fpCatKey(compRest);
    const qNo = qKey.replace(/\s+/g, "");
    // se ho riconosciuto la categoria, posso mostrare tutto anche senza dettagli
    const wantAllInCat = !!(kind !== "member" && compCat && !qNo);

    if (!qNo && !wantAllInCat) return [];

    const list = (kind === "member") ? (S.finished || []) : (S.products || []);
    const already = (kind === "member" && S.selectedKey)
      ? new Set(membersForKey(S.selectedKey).map(x => norm(x?.code || "")))
      : null;

    const cap = (kind !== "member" && compCat) ? 300 : 40;

    const getProdCat2 = (it)=>{
      try{
        const code = String(it?.code || "").trim().toLowerCase();
        let cat = "";
        if (typeof window.getMacroCategoryForCode === "function"){
          cat = String(window.getMacroCategoryForCode(code) || "").trim().toLowerCase();
        }
        if (!cat){
          cat = String(it?.categoryKey || it?.category || it?.catKey || it?.cat || it?.macroCategory || it?.macro || "").trim().toLowerCase();
        }
        cat = cat.replace(/\s+/g,"_")
          .replace(/[^a-z0-9_]+/g,"_")
          .replace(/_+/g,"_")
          .replace(/^_+|_+$/g,"");
        return cat;
      }catch(_){ return ""; }
    };

    const out = [];
    for (const it of list){
      const code = String(it?.code || "").trim();
      const name = String(it?.name || it?.nome || "").trim();
      if (!code && !name) continue;

      if (kind !== "member" && compCat){
        const ccat = getProdCat2(it);
        if (ccat !== compCat) continue;
      }

      let sc = 0;
      if (wantAllInCat){
        sc = 50;
      } else {
        sc = __fpCatScore(code, name, qKey);
        if (sc < 0) continue;
      }

      const uom = String(it?.uom || it?.um || it?.unit || "").trim();
      const disabled = !!(already && code && already.has(norm(code)));

      out.push({ code, name, uom, score: sc, disabled, __cat: compCat || "" });
    }

    out.sort((a,b) => (b.score - a.score) || String(a.name||a.code||"").localeCompare(String(b.name||b.code||""), "it", { sensitivity:"base" }));
    return out.slice(0, cap);
  }

  function __fpCatHideSuggest(kind){
    const wrap = $(kind === "member" ? "fpCatMemberSuggestWrap" : "fpCatCompSuggestWrap");
    const list = $(kind === "member" ? "fpCatMemberSuggest" : "fpCatCompSuggest");
    if (wrap) wrap.style.display = "none";
    if (list) list.innerHTML = "";
  }

  function __fpCatRenderSuggest(kind){
    const input = $(kind === "member" ? "fpCatMemberPick" : "fpCatCompPick");
    const wrap = $(kind === "member" ? "fpCatMemberSuggestWrap" : "fpCatCompSuggestWrap");
    const listEl = $(kind === "member" ? "fpCatMemberSuggest" : "fpCatCompSuggest");
    if (!input || !wrap || !listEl) return;

    const rawAll = String(input.value || "").trim();
    const raw = (kind !== "member") ? __fpCatUpdatePendingFromPick(rawAll) : rawAll;
    const qNo = __fpCatKey(raw).replace(/\s+/g, "");
    if (!qNo){
      __fpCatHideSuggest(kind);
      return;
    }

    const matches = __fpCatGetMatchList(kind, raw);
    if (!matches.length){
      __fpCatHideSuggest(kind);
      return;
    }

    const __cat = (kind !== "member" && matches[0] && matches[0].__cat) ? String(matches[0].__cat||"") : "";
    const __catLabel = __cat ? __cat.replace(/_/g," ") : "";
    const __head = __catLabel ? ('<div class="td-muted" style="padding:8px 10px; font-weight:900;">Categoria: ' + esc(__catLabel) + '</div>') : '';
    listEl.innerHTML = __head + matches.map(m => {
      const label = __fpCatBuildLabel(m.code, m.name);
      const right = m.uom ? ('<span class="kbd" style="margin-left:10px;">' + esc('U.M. ' + m.uom) + '</span>') : '';
      const sub = m.disabled ? '<span class="td-muted" style="font-size:12px; font-weight:900; margin-left:10px;">Già in categoria</span>' : '';
      const dis = m.disabled ? 'disabled' : '';
      const op = m.disabled ? 'opacity:.55;' : '';
      return (
        '<button class="btn btn-ghost mini jsFpCatSuggestPick" type="button" ' +
        'data-kind="' + esc(kind) + '" data-code="' + esc(m.code) + '" data-name="' + esc(m.name) + '" data-uom="' + esc(m.uom) + '" ' + dis +
        ' style="width:100%; justify-content:space-between; border-radius: 12px; box-shadow:none; ' + op + '">' +
          '<span style="text-align:left; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + esc(label) + '</span>' +
          '<span style="display:flex; align-items:center;">' + sub + right + '</span>' +
        '</button>'
      );
    }).join('');

    wrap.style.display = '';
  }

  function __fpCatResolveUnique(kind, raw){
    const s0 = String(raw || "").trim();
    if (!s0) return null;

    const pickedCode = pickCodeFromLabel(s0);
    if (pickedCode){
      if (kind === "member"){
        const fp = S.fpByCode.get(norm(pickedCode)) || null;
        if (fp) return { code: String(fp.code || pickedCode).trim(), name: String(fp.name || fp.nome || "").trim(), uom: String(fp.uom || "").trim() };
      } else {
        const p = S.prodMap.get(norm(pickedCode)) || null;
        if (p) return { code: String(p.code || pickedCode).trim(), name: String(p.name || p.nome || "").trim(), uom: String(p.uom || p.um || "").trim() };
      }
    }

    const key = __fpCatKey(s0);
    const keyNo = key.replace(/\s+/g, "");
    const src = (kind === "member") ? (S.finished || []) : (S.products || []);

    const byCode = keyNo ? src.filter(it => __fpCatKey(it?.code || "").replace(/\s+/g, "") === keyNo) : [];
    if (byCode.length === 1){
      const it = byCode[0] || {};
      return { code: String(it.code || "").trim(), name: String(it.name || it.nome || "").trim(), uom: String(it.uom || it.um || "").trim() };
    }

    const byName = src.filter(it => __fpCatKey(it?.name || it?.nome || "") === key);
    if (byName.length === 1){
      const it = byName[0] || {};
      return { code: String(it.code || "").trim(), name: String(it.name || it.nome || "").trim(), uom: String(it.uom || it.um || "").trim() };
    }

    const matches = __fpCatGetMatchList(kind, s0);
    if (matches.length === 1){
      const m = matches[0];
      return { code: String(m.code || "").trim(), name: String(m.name || "").trim(), uom: String(m.uom || "").trim() };
    }

    return null;
  }


  function renderList(){
    const tbody = $("fpCatTbody");
    const pill = $("pillFPCategoriesCount");
    if (!tbody) return;

    const qRaw = String($("fpCatSearch")?.value || "");
    const q = norm(qRaw);

    const list = (S.cats || []).slice().sort((a,b)=>String(a?.name||"").localeCompare(String(b?.name||""), "it", {sensitivity:"base"}));

    // match "categoria + dettagli" (es. "scatola 20 kg", "bobina 480")
    const qKey = __fpCatKey(qRaw);
    const toks = qKey.split(" ").filter(Boolean);

    const stem = (w)=>{
      let s = String(w||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"");
      if (!s) return "";
      if (/[aeiou]$/.test(s) && s.length > 3) s = s.slice(0,-1);
      return s;
    };

    function catMatchesToken(cat, tok){
      const t = stem(tok);
      if (!t) return false;

      const nm = __fpCatKey(cat?.name || cat?.key || "");
      const words = nm.split(" ").filter(Boolean);

      for (const w of words){
        const ws = stem(w);
        if (!ws) continue;
        if (ws === t || ws.startsWith(t) || t.startsWith(ws)) return true;
      }

      // prova anche sulla key (underscore)
      const kk = __fpCatKey(String(cat?.key || "").replace(/_/g," "));
      const kws = kk.split(" ").filter(Boolean);
      for (const w of kws){
        const ws = stem(w);
        if (!ws) continue;
        if (ws === t || ws.startsWith(t) || t.startsWith(ws)) return true;
      }

      return false;
    }

    function memberMatchesTokens(fp, tokens){
      if (!tokens || !tokens.length) return true;
      const code = String(fp?.code || "").trim();
      const name = String(fp?.name || fp?.nome || "").trim();
      const hay = __fpCatKey(code + " " + name);
      for (const t of tokens){
        if (t && !hay.includes(t)) return false;
      }
      return true;
    }

    let modeCat = false;
    let catTok = "";
    let restToks = [];
    let filtered = [];

    if (toks.length){
      catTok = toks[0];
      const byCatToken = list.filter(c => catMatchesToken(c, catTok));
      if (byCatToken.length){
        modeCat = true;
        restToks = toks.slice(1);
        filtered = byCatToken;
      }
    }

    // fallback: filtro classico (categoria o prodotti finiti)
    if (!q){
      filtered = list;
      modeCat = false;
    } else if (!modeCat){
      filtered = list.filter(c => {
        const nm = norm(c?.name || c?.key || "");
        if (nm.includes(q)) return true;
        const k = norm(c?.key || "");
        if (!k) return false;
        const mem = membersForKey(k);
        for (const fp of mem){
          const s = (String(fp?.code||"") + " " + String(fp?.name||fp?.nome||"")).toLowerCase();
          if (s.includes(q)) return true;
        }
        return false;
      });
    }

    if (pill) pill.textContent = String(filtered.length || 0);

    if (!filtered.length){
      tbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessuna categoria.</td></tr>';
      return;
    }

    const rows = [];
    for (const c of filtered){
      const key = norm(c?.key || c?.id || "");
      const name = String(c?.name || key || "").trim() || key;
      const memAll = membersForKey(key);
      const memCount = memAll.length;
      const bom = Array.isArray(c?.bom) ? c.bom : (Array.isArray(c?.components) ? c.components : []);
      const bomCount = bom.length;

      // Categoria (sempre)
      rows.push(`<tr class="jsFpCatRow" data-key="${esc(key)}">
        <td>${esc(name)}</td>
        <td class="qty">${esc(memCount)}</td>
        <td class="qty">${esc(bomCount)}</td>
        <td style="text-align:right;">
          <button class="btn btn-ghost mini jsFpCatOpen" type="button">Apri</button>
        </td>
      </tr>`);

      // Se l'utente sta cercando "categoria + dettagli", mostra la lista prodotti finiti sotto
      if (modeCat){
        const memSorted = memAll.slice().sort((a,b)=>String(a?.name||"").localeCompare(String(b?.name||""), "it", {sensitivity:"base"}));
        const memFiltered = restToks.length ? memSorted.filter(fp => memberMatchesTokens(fp, restToks)) : memSorted;

        if (!memFiltered.length){
          rows.push(`<tr class="jsFpCatRow" data-key="${esc(key)}">
            <td class="td-muted" colspan="4" style="padding-left: 22px;">Nessun prodotto finito corrispondente.</td>
          </tr>`);
        } else {
          for (const fp of memFiltered){
            const code = String(fp?.code || "").trim();
            const nm = String(fp?.name || fp?.nome || "").trim();
            const label = (code && nm) ? (code + " — " + nm) : (nm || code || "—");
            rows.push(`<tr class="jsFpCatRow" data-key="${esc(key)}">
              <td style="padding-left: 22px;">
                <span class="td-muted" style="font-weight:900;">↳</span>
                <span class="kbd" style="margin-left:6px;">${esc(code || "—")}</span>
                <span style="margin-left:8px;">${esc(nm || "")}</span>
              </td>
              <td class="qty"></td>
              <td class="qty"></td>
              <td></td>
            </tr>`);
          }
        }
      }
    }

    tbody.innerHTML = rows.join("");
  }

  function renderDetail(){
    const key = norm(S.selectedKey);
    const cat = key ? (S.catMap.get(key) || null) : null;
    const d = S.draft || null;

    const activeEl = (typeof document !== "undefined") ? document.activeElement : null;
    const elKey = $("fpCatEditKey");
    const elName = $("fpCatEditName");

    if (elKey){
      const v = String((d && d.key) ? d.key : (key || ""));
      if (activeEl !== elKey) elKey.value = v;
    }
    if (elName && d){
      const v = String(d.name || "");
      if (activeEl !== elName) elName.value = v;
    }

    const bom = (d && Array.isArray(d.bom)) ? d.bom : [];
    if ($("fpCatBomCount")) $("fpCatBomCount").value = String(bom.length) + "";

    // BOM table
    const tb = $("fpCatCompTbody");
    if (tb){
      if (!bom.length){
        tb.innerHTML = '<tr><td class="td-muted" colspan="5">Nessun componente.</td></tr>';
      } else {
        tb.innerHTML = bom.map((c, idx) => {
          const code = String(c?.code||"").trim();
          const name = String(c?.name||"").trim();
          const qtyRaw = String(c?.qtyRaw||"").trim();
          const qty = (c?.qty != null) ? String(c.qty) : (qtyRaw || "");
          const uom = String(c?.uom||"").trim();
          return `<tr class="jsFpCatCompRow" data-idx="${idx}">
            <td>${esc(code)}</td>
            <td>${esc(name || code)}</td>
            <td class="qty">${esc(qty)}</td>
            <td>${esc(uom)}</td>
            <td style="text-align:right;"><button class="btn btn-ghost mini jsFpCatCompDel" type="button">–</button></td>
          </tr>`;
        }).join("");
      }
    }

    // Members
    const members = membersForKey(key);
    if ($("fpCatMembersCount")) $("fpCatMembersCount").textContent = String(members.length);
    const mtb = $("fpCatMembersTbody");
    if (mtb){
      if (!members.length){
        mtb.innerHTML = '<tr><td class="td-muted" colspan="3">Nessun prodotto finito nella categoria.</td></tr>';
      } else {
        const rows = members.slice().sort((a,b)=>String(a?.name||"").localeCompare(String(b?.name||""),"it",{sensitivity:"base"})).map(fp => {
          const id = String(fp?.id||"");
          const code = String(fp?.code||"").trim();
          const name = String(fp?.name||fp?.nome||"").trim();
          return `<tr class="jsFpCatMemberRow" data-id="${esc(id)}">
            <td>${esc(code)}</td>
            <td>${esc(name || code)}</td>
            <td style="text-align:right;"><button class="btn btn-ghost mini jsFpCatMemberDel" type="button">Rimuovi</button></td>
          </tr>`;
        });
        mtb.innerHTML = rows.join("");
      }
    }

    const meta = $("fpCatDetailMeta");
    if (meta){
      const bomCount = bom.length;
      const memCount = members.length;
      meta.textContent = `Prodotti: ${memCount} · BOM: ${bomCount}`;
    }

    const delHint = $("fpCatDeleteHint");
    if (delHint){
      delHint.textContent = members.length ? `Nota: eliminando la categoria verrà rimossa da ${members.length} prodotti finiti.` : "";
    }
  }

  function openDetail(key){
    S.selectedKey = norm(key);
    S.keyManual = false;
    const cat = S.catMap.get(S.selectedKey) || null;
    const nm = String(cat?.name || cat?.key || "").trim() || S.selectedKey;
    S.draft = {
      key: S.selectedKey,
      name: nm,
      bom: Array.isArray(cat?.bom) ? cat.bom.slice() : (Array.isArray(cat?.components) ? cat.components.slice() : [])
    };
    setDetailOpen(true);
    renderDatalists();
    renderDetail();

    // reset barre di ricerca + suggerimenti
    try{ if ($("fpCatCompPick")) $("fpCatCompPick").value = ""; }catch(_){ }
    try{ if ($("fpCatCompQty")) $("fpCatCompQty").value = ""; }catch(_){ }
    try{ if ($("fpCatMemberPick")) $("fpCatMemberPick").value = ""; }catch(_){ }
    try{ __fpCatHideSuggest("comp"); __fpCatHideSuggest("member"); }catch(_){ }
  }

  async function createCategory(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const name = String($("fpCatNewName")?.value || "").trim();
    if (!name) { showToast("Inserisci un nome categoria", "warn"); return; }

    let key = slugKey(name);
    if (!key) key = "cat";

    // avoid collisions
    const exists = new Set((S.cats||[]).map(c => norm(c?.key || "")));
    if (exists.has(key)){
      let i=2;
      while (exists.has(key + "_" + i)) i++;
      key = key + "_" + i;
    }

    try{
      const { doc, setDoc, serverTimestamp } = h.FS;
      const ref = doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(key));
      await setDoc(ref, {
        key,
        name,
        nameLower: name.toLowerCase(),
        bom: [],
        createdAt: serverTimestamp(),
        createdBy: h.fb.user.email || h.fb.user.uid || "",
        updatedAt: serverTimestamp(),
        updatedBy: h.fb.user.email || h.fb.user.uid || ""
      }, { merge: true });
      showToast("Categoria creata");
      setCreateOpen(false);
      openDetail(key);
    }catch(e){
      console.warn("create finishedProductCategories failed", e);
      showToast("Errore creazione categoria", "err");
    }
  }

  function __cleanKey(v){
    return slugKey(String(v || ""));
  }

  async function __renameCategoryKey(oldKey, newKey, name, bom){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return false; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return false; }

    const fromKey = norm(oldKey);
    const toKey = norm(newKey);
    if (!fromKey || !toKey) return false;
    if (fromKey == toKey) return true;

    // collision guard
    if (S.catMap && S.catMap.has(toKey)) {
      showToast("Esiste già una categoria con questa chiave", "warn");
      return false;
    }

    const { doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp } = h.FS;
    const actor = (h.fb.user && (h.fb.user.email || h.fb.user.uid)) || "";

    // Leggi doc sorgente (così preservi eventuali campi extra)
    let src = null;
    try{
      const snap = await getDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(fromKey)));
      if (!snap || !snap.exists || !snap.exists()) {
        showToast("Categoria non trovata", "err");
        return false;
      }
      src = snap.data() || {};
    }catch(e){
      console.warn("rename category getDoc failed", e);
      showToast("Errore lettura categoria", "err");
      return false;
    }

    // 1) Crea (o aggiorna) nuovo doc
    const dstRef = doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(toKey));
    const payload = Object.assign({}, src, {
      key: toKey,
      name: String(name || "").trim(),
      nameLower: String(name || "").trim().toLowerCase(),
      bom: Array.isArray(bom) ? bom : [],
      updatedAt: serverTimestamp(),
      updatedBy: actor
    });
    if (!payload.createdAt) payload.createdAt = serverTimestamp();
    if (!payload.createdBy) payload.createdBy = actor;

    try{
      await setDoc(dstRef, payload, { merge: true });
    }catch(e){
      console.warn("rename category setDoc failed", e);
      showToast("Errore creazione nuova categoria", "err");
      return false;
    }

    // 2) Aggiorna tutti i prodotti finiti collegati
    const mem = membersForKey(fromKey);
    let okN = 0, failN = 0;

    for (const fp of (mem || [])){
      const id = String(fp?.id || "").trim();
      if (!id) continue;
      try{
        await updateDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", id), {
          categoryKey: toKey,
          categoryKeyLower: toKey,
          updatedAt: serverTimestamp(),
          updatedBy: actor
        });
        okN++;
      }catch(e){
        console.warn("rename category update finishedProducts failed", id, e);
        failN++;
      }
    }

    // 3) Elimina il doc vecchio SOLO se tutti i prodotti sono stati aggiornati
    if (failN === 0){
      try{
        await deleteDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(fromKey)));
      }catch(e){
        console.warn("rename category delete old failed", e);
        showToast("Categoria rinominata, ma non riesco a eliminare la vecchia (permessi)", "warn");
      }
      showToast("Categoria rinominata");
      return true;
    }

    showToast(`Categoria rinominata, ma ${failN} prodotti non aggiornati (ho lasciato anche la vecchia categoria)`, "warn");
    return true;
  }

  async function saveCategory(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const oldKey = norm(S.selectedKey);
    if (!oldKey) return;

    const name = String($("fpCatEditName")?.value || "").trim();
    if (!name) { showToast("Nome categoria non valido", "warn"); return; }

    const bom = (S.draft && Array.isArray(S.draft.bom)) ? S.draft.bom : [];

    // key può essere editata: se vuota, la rigenero dal nome
    const keyRaw = String($("fpCatEditKey")?.value || "").trim();
    let newKey = __cleanKey(keyRaw) || __cleanKey(name);
    newKey = norm(newKey);

    if (!newKey){ showToast("Chiave non valida", "warn"); return; }

    // collision (se cambio chiave)
    if (newKey !== oldKey && (S.catMap && S.catMap.has(newKey))){
      showToast("Esiste già una categoria con questa chiave", "warn");
      return;
    }

    // Rinominare anche la chiave = cambia docId + aggiorna i prodotti finiti
    if (newKey !== oldKey){
      const memCount = membersForKey(oldKey).length;
      const ok = confirm(`Rinominare la categoria?

Da: ${oldKey}
A: ${newKey}
Prodotti collegati: ${memCount}

Verrà aggiornata anche la chiave su tutti i prodotti finiti.`);
      if (!ok) return;

      // allinea draft
      if (S.draft){
        S.draft.name = name;
        S.draft.key = newKey;
        S.draft.bom = bom;
      }

      const done = await __renameCategoryKey(oldKey, newKey, name, bom);
      if (done){
        S.selectedKey = newKey;
        S.keyManual = false;
        if (S.draft) S.draft.key = newKey;
        try{ const elKey = $("fpCatEditKey"); if (elKey) elKey.value = newKey; }catch(_){ }
        try{ renderList(); renderDetail(); }catch(_){ }
      }
      return;
    }

    // Salvataggio normale (chiave invariata)
    try{
      const { doc, setDoc, serverTimestamp } = h.FS;
      const ref = doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(oldKey));
      await setDoc(ref, {
        key: oldKey,
        name,
        nameLower: name.toLowerCase(),
        bom,
        updatedAt: serverTimestamp(),
        updatedBy: h.fb.user.email || h.fb.user.uid || ""
      }, { merge: true });
      showToast("Categoria salvata");
    }catch(e){
      console.warn("save finishedProductCategories failed", e);
      showToast("Errore salvataggio categoria", "err");
    }
  }

  async function deleteCategory(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const key = norm(S.selectedKey);
    if (!key) return;

    const mem = membersForKey(key);
    const ok = confirm(mem.length
      ? `Eliminare questa categoria?\n\nVerrà rimossa da ${mem.length} prodotti finiti.`
      : "Eliminare questa categoria?");
    if (!ok) return;

    try{
      const { doc, deleteDoc, updateDoc, deleteField } = h.FS;

      // remove category from finished products (best effort)
      for (const fp of mem.slice(0, 500)){
        const id = String(fp?.id || "");
        if (!id) continue;
        try{
          await updateDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", id), {
            categoryKey: deleteField(),
            categoryKeyLower: deleteField()
          });
        }catch(e){
          console.warn("unassign fp from category failed", e);
        }
      }

      await deleteDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories", keyToId(key)));
      showToast("Categoria eliminata");
      setDetailOpen(false);
      renderList();
    }catch(e){
      console.warn("delete finishedProductCategories failed", e);
      showToast("Errore eliminazione categoria", "err");
    }
  }

  function pickCodeFromLabel(label){
    const s = String(label || "").trim();
    if (!s) return "";
    const parts = s.split(" — ");
    return String(parts[0] || "").trim();
  }

  function addBomItem(){
    if (!S.draft) return;

    // Supporto: quantità scritta direttamente nel campo ricerca (es. "SOLFATO 20 gr")
    let rawPickAll = "";
    let rawPickClean = "";
    try{
      rawPickAll = String($("fpCatCompPick")?.value || "");
      rawPickClean = __fpCatUpdatePendingFromPick(rawPickAll);
    }catch(_){ rawPickAll = String($("fpCatCompPick")?.value || ""); rawPickClean = rawPickAll; }

    // prova risoluzione automatica se l'utente ha scritto solo il nome/codice
    try{
      const resolved = __fpCatResolveUnique("comp", rawPickClean);
      if (resolved && resolved.code){
        $("fpCatCompPick").value = __fpCatBuildLabel(resolved.code, resolved.name);
        // se avevo una qty nel campo ricerca, precompila (solo se Q.tà vuota)
        __fpCatAutofillQtyFromPending(String(resolved.code||""), String(resolved.uom||""));
      }
    }catch(_){ }

    const code = pickCodeFromLabel($("fpCatCompPick")?.value || "");
    if (!code) { showToast("Seleziona un componente", "warn"); return; }

    // prodotto + U.M. target
    const p = S.prodMap.get(norm(code)) || null;
    const name = String(p?.name || p?.nome || "").trim() || code;
    const uomTarget = __fpCatNormUom(p?.uom || p?.um || "") || "pz";

    // quantità: 1) campo Q.tà, 2) fallback dal campo ricerca (pending)
    let q = String($("fpCatCompQty")?.value || "").trim();
    if (!q && __fpCatPendingCompQty && __fpCatPendingCompQty.qty != null && __fpCatPendingCompQty.uom){
      const conv = __fpCatConvertQty(__fpCatPendingCompQty.qty, __fpCatPendingCompQty.uom, uomTarget);
      if (conv != null){
        q = __fpCatFmtNum(conv);
        try{ $("fpCatCompQty").value = q; }catch(_){ }
      }
      __fpCatPendingCompQty = null;
    }

    if (!q) { showToast("Inserisci una quantità", "warn"); return; }

    const pq = __fpCatParseQtyForTarget(q, uomTarget);

    const bom = Array.isArray(S.draft.bom) ? S.draft.bom : [];
    const existingIdx = bom.findIndex(x => norm(x?.code) === norm(code));

    const item = {
      productId: String(p?.id || "").trim() || keyToId(norm(code)),
      code: String(code).trim(),
      name,
      qty: (pq.num != null) ? Number(pq.num) : null,
      qtyRaw: String(pq.raw || "").trim(),
      uom: uomTarget
    };

    if (existingIdx >= 0) bom[existingIdx] = item; else bom.push(item);
    S.draft.bom = bom;

    try{ $("fpCatCompPick").value = ""; }catch(_){ }
    try{ __fpCatHideSuggest("comp"); }catch(_){ }
    try{ $("fpCatCompQty").value = ""; }catch(_){ }
    try{ __fpCatPendingCompQty = null; }catch(_){ }

    renderDetail();
  }


  function removeBomIdx(idx){
    if (!S.draft) return;
    const bom = Array.isArray(S.draft.bom) ? S.draft.bom : [];
    const i = Number(idx);
    if (!Number.isFinite(i) || i < 0 || i >= bom.length) return;
    bom.splice(i, 1);
    S.draft.bom = bom;
    renderDetail();
  }

  async function addMember(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const key = norm(S.selectedKey);

    // prova risoluzione automatica se l'utente ha scritto solo il nome/codice
    try{
      const raw = String($("fpCatMemberPick")?.value || "");
      const resolved = __fpCatResolveUnique("member", raw);
      if (resolved && resolved.code){
        $("fpCatMemberPick").value = __fpCatBuildLabel(resolved.code, resolved.name);
      }
    }catch(_){ }

    const code = pickCodeFromLabel($("fpCatMemberPick")?.value || "");
    if (!key) return;
    if (!code) { showToast("Seleziona un prodotto finito", "warn"); return; }

    const fp = S.fpByCode.get(norm(code)) || null;
    if (!fp || !fp.id){ showToast("Prodotto finito non trovato", "warn"); return; }

    try{
      const { doc, updateDoc } = h.FS;
      await updateDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", fp.id), {
        categoryKey: key,
        categoryKeyLower: key
      });
      showToast("Prodotto finito assegnato");
      try{ $("fpCatMemberPick").value = ""; }catch(_){ }
      try{ __fpCatHideSuggest("member"); }catch(_){ }
    }catch(e){
      console.warn("assign finishedProduct failed", e);
      showToast("Errore assegnazione prodotto finito", "err");
    }
  }

  async function removeMemberById(id){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const fid = String(id || "").trim();
    if (!fid) return;

    try{
      const { doc, updateDoc, deleteField } = h.FS;
      await updateDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", fid), {
        categoryKey: deleteField(),
        categoryKeyLower: deleteField()
      });
      showToast("Prodotto finito rimosso");
    }catch(e){
      console.warn("remove member failed", e);
      showToast("Errore rimozione", "err");
    }
  }

  function subscribe(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) return false;
    if (S.unsub.cats) return true;

    try{
      const { collection, query, orderBy, onSnapshot } = h.FS;

      // categories
      S.unsub.cats = onSnapshot(
        query(collection(h.fb.db, "orgs", h.ORG_ID, "finishedProductCategories"), orderBy("nameLower", "asc")),
        (snap) => {
          const arr = [];
          snap.forEach(d => {
            const data = d.data() || {};
            let key = String(data.key || "").trim();
            if (!key){
              try{ key = decodeURIComponent(String(d.id||"")); }catch(_){ key = String(d.id||""); }
            }
            key = norm(key);
            if (!key) return;
            arr.push(Object.assign({ key }, data));
          });
          S.cats = arr;
          rebuildMaps();
          if (isActive()) renderList();
          if (S.selectedKey) renderDetail();
        },
        (err) => console.warn("finishedProductCategories watch error", err)
      );

      // finished products
      S.unsub.finished = onSnapshot(
        query(collection(h.fb.db, "orgs", h.ORG_ID, "finishedProducts"), orderBy("nameLower", "asc")),
        (snap) => {
          const arr = [];
          snap.forEach(d => arr.push(Object.assign({ id:d.id }, (d.data()||{}))));
          S.finished = arr;
          rebuildMaps();
          if (isActive()) renderList();
          if (S.selectedKey) renderDetail();
          renderDatalists();
        },
        (err) => console.warn("finishedProducts watch error", err)
      );

      // products (components)
      S.unsub.products = onSnapshot(
        query(collection(h.fb.db, "orgs", h.ORG_ID, "products"), orderBy("nameLower", "asc")),
        (snap) => {
          const arr = [];
          snap.forEach(d => arr.push(Object.assign({ id:d.id }, (d.data()||{}))));
          S.products = arr;
          rebuildMaps();
          renderDatalists();
          if (S.selectedKey) renderDetail();
        },
        (err) => console.warn("products watch error", err)
      );

      return true;
    }catch(e){
      console.warn("subscribe fp_categories failed", e);
      return false;
    }
  }

  function bindEvents(){
    // menu
    $("menuGoFinishedCategories")?.addEventListener("click", (e) => {
      e.preventDefault();
      closeSideMenuSafe();
      setViewSafe("fpCategories");
      setCreateOpen(false);
      renderDatalists();
      renderList();
    });

    // close/back
    $("btnBackFPCategories")?.addEventListener("click", ()=>{ setCreateOpen(false); try{ setDetailOpen(false); }catch(_){ } setViewSafe("home"); });
    $("btnCloseFPCategories")?.addEventListener("click", ()=>{ setCreateOpen(false); try{ setDetailOpen(false); }catch(_){ } setViewSafe("home"); });

    // list actions
    $("fpCatSearch")?.addEventListener("input", ()=>{ if (isActive()) renderList(); });
    $("btnFpCatNew")?.addEventListener("click", ()=> setCreateOpen(true));
    $("btnFpCatCancelCreate")?.addEventListener("click", ()=> setCreateOpen(false));
    $("btnFpCatCreate")?.addEventListener("click", ()=> createCategory());

    $("fpCatTbody")?.addEventListener("click", (e) => {
      const tr = e.target?.closest?.("tr.jsFpCatRow");
      if (!tr) return;
      const key = String(tr.getAttribute("data-key") || "").trim();
      if (!key) return;
      e.preventDefault(); e.stopPropagation();
      openDetail(key);
    });

    // modal close
    $("btnFpCatDone")?.addEventListener("click", ()=> setDetailOpen(false));
    $("fpCatModalClose")?.addEventListener("click", ()=> setDetailOpen(false));
    $("modalFPCategory")?.addEventListener("click", (e)=>{ if (e.target === $("modalFPCategory")) setDetailOpen(false); });

    // edit: nome + chiave (rinomina anche docId)
    try{
      const nameEl = $("fpCatEditName");
      const keyEl  = $("fpCatEditKey");

      if (nameEl && !(nameEl.dataset && nameEl.dataset.boundFpCatName === "1")){
        if (nameEl.dataset) nameEl.dataset.boundFpCatName = "1";
        nameEl.addEventListener("input", () => {
          if (!S.draft) return;
          const nm = String(nameEl.value || "").trim();
          S.draft.name = nm;
          if (!S.keyManual){
            const autoKey = slugKey(nm);
            if (autoKey){
              S.draft.key = autoKey;
              try{ if (keyEl && document.activeElement !== keyEl) keyEl.value = autoKey; }catch(_){ }
            }
          }
        });
      }

      if (keyEl && !(keyEl.dataset && keyEl.dataset.boundFpCatKey === "1")){
        if (keyEl.dataset) keyEl.dataset.boundFpCatKey = "1";

        keyEl.addEventListener("focus", () => { S.keyManual = true; });

        keyEl.addEventListener("input", () => {
          if (!S.draft) return;
          S.keyManual = true;
          const clean = slugKey(String(keyEl.value || ""));
          S.draft.key = clean || "";
        });

        keyEl.addEventListener("blur", () => {
          if (!S.draft) return;
          const clean = slugKey(String(keyEl.value || ""));
          if (clean){
            keyEl.value = clean;
            S.draft.key = clean;
            S.keyManual = true;
          } else {
            // se svuota: torna in auto dal nome
            S.keyManual = false;
            const nm = String(nameEl && nameEl.value || "").trim();
            const autoKey = slugKey(nm);
            if (autoKey){
              keyEl.value = autoKey;
              S.draft.key = autoKey;
            } else {
              keyEl.value = "";
              S.draft.key = "";
            }
          }
        });
      }
    }catch(_){ }

    // smart search bars (componenti + prodotti finiti)
    $("fpCatCompPick")?.addEventListener("input", ()=>{ try{ __fpCatRenderSuggest("comp"); }catch(_){ } });
    $("fpCatCompPick")?.addEventListener("focus", ()=>{ try{ __fpCatRenderSuggest("comp"); }catch(_){ } });
    $("fpCatMemberPick")?.addEventListener("input", ()=>{ try{ __fpCatRenderSuggest("member"); }catch(_){ } });
    $("fpCatMemberPick")?.addEventListener("focus", ()=>{ try{ __fpCatRenderSuggest("member"); }catch(_){ } });

    // click sui suggerimenti
    $("fpCatCompSuggestWrap")?.addEventListener("click", (e)=>{
      const btn = e.target?.closest?.("button.jsFpCatSuggestPick");
      if (!btn || btn.disabled) return;
      e.preventDefault(); e.stopPropagation();
      const code = String(btn.getAttribute("data-code") || "").trim();
      const name = String(btn.getAttribute("data-name") || "").trim();
      const uom  = String(btn.getAttribute("data-uom") || "").trim();
      if (!code) return;
      try{ $("fpCatCompPick").value = __fpCatBuildLabel(code, name); }catch(_){ }
      try{ __fpCatHideSuggest("comp"); }catch(_){ }
      // se nel campo ricerca avevo scritto una quantità (es. "20 gr"), la converte e la mette in Q.tà
      try{ __fpCatAutofillQtyFromPending(code, uom); }catch(_){ }
      try{ $("fpCatCompQty")?.focus(); }catch(_){ }
    });

    $("fpCatMemberSuggestWrap")?.addEventListener("click", (e)=>{
      const btn = e.target?.closest?.("button.jsFpCatSuggestPick");
      if (!btn || btn.disabled) return;
      e.preventDefault(); e.stopPropagation();
      const code = String(btn.getAttribute("data-code") || "").trim();
      const name = String(btn.getAttribute("data-name") || "").trim();
      if (!code) return;
      try{ $("fpCatMemberPick").value = __fpCatBuildLabel(code, name); }catch(_){ }
      try{ __fpCatHideSuggest("member"); }catch(_){ }
      try{ $("btnFpCatMemberAdd")?.focus(); }catch(_){ }
    });

    // esc = chiudi suggerimenti
    $("modalFPCategory")?.addEventListener("keydown", (e)=>{
      if (e.key === "Escape"){
        try{ __fpCatHideSuggest("comp"); __fpCatHideSuggest("member"); }catch(_){ }
      }
    });

    // modal actions
    $("btnFpCatCompAdd")?.addEventListener("click", ()=> addBomItem());
    $("btnFpCatMemberAdd")?.addEventListener("click", ()=> addMember());
    $("btnFpCatSave")?.addEventListener("click", ()=> saveCategory());
    $("btnFpCatDelete")?.addEventListener("click", ()=> deleteCategory());

    $("fpCatCompTbody")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button.jsFpCatCompDel");
      const tr = e.target?.closest?.("tr.jsFpCatCompRow");
      if (!btn || !tr) return;
      const idx = tr.getAttribute("data-idx");
      removeBomIdx(idx);
    });

    $("fpCatMembersTbody")?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("button.jsFpCatMemberDel");
      const tr = e.target?.closest?.("tr.jsFpCatMemberRow");
      if (!btn || !tr) return;
      const id = tr.getAttribute("data-id");
      removeMemberById(id);
    });

    // enter to add + risoluzione smart
    $("fpCatCompPick")?.addEventListener("keydown", (e)=>{
      if (e.key !== "Enter") return;
      e.preventDefault();
      try{
        const rawAll = String($("fpCatCompPick")?.value || "");
        const raw = __fpCatUpdatePendingFromPick(rawAll);
        const resolved = __fpCatResolveUnique("comp", raw);
        if (resolved && resolved.code){
          $("fpCatCompPick").value = __fpCatBuildLabel(resolved.code, resolved.name);
          __fpCatHideSuggest("comp");
          try{ __fpCatAutofillQtyFromPending(String(resolved.code||""), String(resolved.uom||"")); }catch(_){ }
          $("fpCatCompQty")?.focus();
          return;
        }
      }catch(_){ }
      try{ __fpCatRenderSuggest("comp"); }catch(_){ }
    });

    $("fpCatCompQty")?.addEventListener("keydown", (e)=>{ if (e.key === "Enter") { e.preventDefault(); addBomItem(); } });

    $("fpCatMemberPick")?.addEventListener("keydown", (e)=>{
      if (e.key !== "Enter") return;
      e.preventDefault();
      try{
        const raw = String($("fpCatMemberPick")?.value || "");
        const resolved = __fpCatResolveUnique("member", raw);
        if (resolved && resolved.code){
          $("fpCatMemberPick").value = __fpCatBuildLabel(resolved.code, resolved.name);
          __fpCatHideSuggest("member");
        }
      }catch(_){ }
      addMember();
    });
  }

  function refresh(){
    bindEvents();
    subscribe();
    renderDatalists();
    if (isActive()) renderList();
    S.ready = true;
  }

  function waitForHub(attempt){
    attempt = attempt || 0;
    const h = H();
    if (h && h.fb && h.fb.db && h.FS){
      refresh();
      return;
    }
    if (attempt > 200) return;
    setTimeout(()=>waitForHub(attempt+1), 100);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", ()=>waitForHub(0));
  } else {
    waitForHub(0);
  }

  // expose (optional)
  window.HubFPCategories = window.HubFPCategories || {};
  window.HubFPCategories.render = function(){ try{ renderList(); }catch(_){ } };
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
                      <div class="doc-tableHint">Righe pronte per import: puoi modificare Codice, Descrizione, U.M. e Q.tà (clicca sulla cella).</div>
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

