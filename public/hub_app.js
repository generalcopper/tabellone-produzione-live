/****************************************************************
     * Firebase (Auth + Firestore + Storage) — Realtime sync
     * - Google login persistente tra pagine (stesso progetto Firebase)
     * - Fornitori + Prodotti + Movimenti inventario in tempo reale
     ****************************************************************/
    import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
    import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
    import {initializeFirestore, collection, doc, setDoc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, deleteField, getDocs, runTransaction, updateDoc, getDoc} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
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
/* ===== inventario_prodotti_finiti.js ===== */
/* Hub Inventario — Sezione Inventario Prodotti Finiti (viewFinishedInventory)
 * UI + rettifica rapida per sede.
 */
(function(){
  try {
    if (document.getElementById("viewFinishedInventory")) return;

    const html = `
<div id="viewFinishedInventory" class="view modalOverlay">
  <article class="card" id="fpStockCard">
    <div class="hd">
      <div class="overlayHeaderTitle">
        <button class="iconBtn overlayBack" id="btnBackFpInv" type="button" aria-label="Indietro">‹</button>
        <h2>Inventario prodotti finiti</h2>
      </div>
      <div class="inlineRow" style="gap:8px; justify-content:flex-end;">
        <div class="pill" id="pillFpInvWarehouse">Sede unica</div>
        <div class="pill" id="pillFpStock">—</div>
        <button class="iconBtn" id="btnCloseFpInv" type="button" aria-label="Chiudi">×</button>
      </div>
    </div>
    <div class="bd">
      <div id="fpInvDetail" class="stack">
        <div class="inlineRow" style="justify-content:space-between; align-items:flex-end; gap:12px;">
          <div class="stack" style="flex:1; min-width: 220px;">
            <div class="hero-sub" id="fpInvDetailTitle">Inventario prodotti finiti</div>
            <div class="muted">Sede unica • salva per rettifica, oppure <b>Produci</b> per carico PF + scarico componenti</div>
          </div>
        </div>

        <div class="inlineRow listStickyBar" style="justify-content: space-between;">
          <div class="inlineRow" style="flex: 1 1 auto;">
            <div class="field" style="min-width: 220px;">
              <label for="fpInvSearch">Cerca</label>
              <input id="fpInvSearch" placeholder="Codice / nome…" />
            </div>
            <div class="field" style="min-width: 220px;">
              <label for="fpInvFilterCategory">Categoria</label>
              <select id="fpInvFilterCategory">
                <option value="">Tutte</option>
                <option value="__none">Non assegnata</option>
              </select>
            </div>
          </div>
        </div>

        <div class="tableWrap" style="max-height: 420px; overflow:auto; margin-top: 10px;">
          <table class="dataGrid">
            <thead>
              <tr>
                <th>Nome prodotto</th>
                <th>Codice</th>
                <th>Categoria</th>
                <th class="qty">Q.tà</th>
              </tr>
            </thead>
            <tbody id="fpStockTbody">
              <tr><td class="td-muted" colspan="4">Carico inventario PF…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </article>
</div>`;

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

    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(tpl.content, anchor);
    else document.body.appendChild(tpl.content);
  } catch (e) {
    try { console.error("[inventario_prodotti_finiti.js] inject failed", e); } catch (_) {}
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

    // 1) Distinta dalla categoria (se presente) — prevale sul singolo
    const cat = getFpCategoryForFp(fp);
    const catBom = (cat && (cat.bom || cat.components || cat.distintaBase)) || [];
    const catArr = Array.isArray(catBom) ? catBom : [];
    if (catArr.length > 0) return catArr;

    // 2) Distinta del singolo prodotto finito
    const arr = (fp.components || fp.bom || fp.distintaBase);
    const direct = Array.isArray(arr) ? arr : [];
    if (direct.length > 0) return direct;

    // 3) fallback (categoria vuota)
    return catArr;
  }

  function rowQtyInt(row){
    try{
      const qtyLine = (row && row.qty != null && Number.isFinite(Number(row.qty))) ? Number(row.qty) : parseFraction(row && row.qtyRaw);
      const qLine = (qtyLine != null && Number.isFinite(qtyLine)) ? qtyLine : 0;
      const qi = Math.round(qLine || 0);
      return (qi > 0) ? qi : 0;
    }catch(_){ return 0; }
  }

  let __fpStockCacheSig = "";
  let __fpStockCacheMap = new Map();

  function getFinishedStockMap(){
    try{
      const H = S.hub || getHub();
      const mvs = (H && H.state && Array.isArray(H.state.finishedMovements)) ? H.state.finishedMovements : [];
      const last = (mvs && mvs.length) ? (mvs[mvs.length-1].createdAt || mvs[mvs.length-1].date || "") : "";
      const sig = String(mvs.length) + "|" + String(last);
      if (sig && sig === __fpStockCacheSig && __fpStockCacheMap) return __fpStockCacheMap;

      const map = new Map();
      for (const mv of (mvs || [])){
        const code = norm(mv && mv.code);
        if (!code) continue;
        const q = (mv && mv.qty != null && Number.isFinite(Number(mv.qty))) ? Math.round(Number(mv.qty)) : 0;
        if (!q) continue;
        const delta = (String(mv.type || "").toUpperCase() === "OUT") ? -q : q;
        map.set(code, (map.get(code) || 0) + delta);
      }

      __fpStockCacheSig = sig;
      __fpStockCacheMap = map;
      return map;
    }catch(_){ return new Map(); }
  }

  function finishedStockAvailable(code){
    const k = norm(code);
    if (!k) return 0;
    const m = getFinishedStockMap();
    const v = Number(m.get(k) || 0);
    return Number.isFinite(v) ? v : 0;
  }

  function isRowConfigured(row){
    const fp = getFpForRow(row);
    if (!fp) return { ok: false, why: "missing", fp: null };

    const qi = rowQtyInt(row);
    if (qi <= 0) return { ok: true, why: "skip", fp };

    const comps = getFpComponents(fp);
    if (comps.length > 0) return { ok: true, why: "ok", fp };

    // Se non c'e' distinta base, va bene SOLO se la giacenza PF copre tutta la quantita' del DDT
    const stock = finishedStockAvailable(row && row.code);
    if (stock >= qi) return { ok: true, why: "stock", fp };

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
        movementIds: Array.isArray(c.movementIds) ? c.movementIds : [],
        finishedMovementIds: Array.isArray(c.finishedMovementIds) ? c.finishedMovementIds : []
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
    if (!H.fb.user) {
      try{ window.HubInv?.showToast?.("Accedi con Google per inviare", "warn"); }catch(_){ alert("Accedi con Google"); }
      return;
    }

    cacheCompletedMap();
    if (S.completedMap.has(ddt.key)) { alert("Questo DDT risulta gia' completato."); return; }

    const st = ddtStatus(ddt);
    if (!st.ok) { alert("Non tutte le righe sono configurate (cerchi rossi)."); return; }

    const autoOn = !!S.autoDischarge;

    const ok = confirm(autoOn ? `Completare e scaricare?

• Se la giacenza PF e' disponibile, scarico PRIMA i prodotti finiti
• Se la giacenza PF non copre tutta la quantita', scarico gli imballaggi (distinta base/categoria)

DDT ${ddt.number} del ${fmtDateIT(ddt.date)}
Righe: ${st.total}` : `Completare SENZA scarico automatico?

• Il DDT finira' in "Completati"
• NON verranno creati movimenti di inventario

DDT ${ddt.number} del ${fmtDateIT(ddt.date)}
Righe: ${st.total}`);
    if (!ok) return;

    S.busy = true;
    try{
      const { addDoc, setDoc, doc, collection, serverTimestamp, getDocs, query, orderBy } = H.FS;

      // Se lo scarico automatico e' disattivato: segna solo come completato (senza movimenti)
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
          finishedAllocations: [],
          xmlHash: String(ddt.hash || ''),
          movementIds: [],
          finishedMovementIds: [],
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

      // 1) Carica inventario PF e crea disponibilita' (sede unica)
      let fpMovs = (H.state && Array.isArray(H.state.finishedMovements)) ? H.state.finishedMovements : [];
      if (!fpMovs.length){
        try{
          const col = collection(H.fb.db, 'orgs', H.ORG_ID, 'finishedInventoryMovements');
          const q = query(col, orderBy('createdAt'));
          const snap = await getDocs(q);
          fpMovs = snap.docs.map(d => {
            const data = d.data() || {};
            return { id: d.id, type: data.type || 'IN', code: data.code || '', qty: data.qty };
          });
          if (H.state) H.state.finishedMovements = fpMovs;
        }catch(e){ try{ console.warn('fetch finishedInventoryMovements failed', e); }catch(_){ } }
      }

      const availFp = new Map();
      for (const mv of (fpMovs || [])){
        const code = String(mv && mv.code || '').trim();
        if (!code) continue;
        const low = code.toLowerCase();
        const q = (mv && mv.qty != null && Number.isFinite(Number(mv.qty))) ? Math.round(Number(mv.qty)) : 0;
        if (!q) continue;
        const delta = (String(mv.type || '').toUpperCase() === 'OUT') ? -q : q;
        availFp.set(low, (availFp.get(low) || 0) + delta);
      }

      // 2) Calcola fabbisogni: prima PF (giacenza), poi componenti sul residuo
      const req = new Map(); // componenti: codeLower -> {code,name,uom,qtyFloat}
      const reqFp = new Map(); // PF: codeLower -> {code,name,uom,qtyInt}

      for (const r of (ddt.rows || [])){
        const code = String(r.code || '').trim();
        if (!code) continue;

        const qtyLine = (r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : parseFraction(r.qtyRaw);
        const qLine = (qtyLine != null && Number.isFinite(qtyLine)) ? qtyLine : 0;
        if (qLine <= 0) continue;

        const fp = getFpForRow(r);
        if (!fp) continue;

        const qInt = Math.round(qLine);
        if (qInt <= 0) continue;

        const low = code.toLowerCase();
        const aFp = Math.max(0, Math.round(Number(availFp.get(low) || 0)));
        const useFp = Math.min(qInt, aFp);

        if (useFp > 0){
          const name = String(fp.name || fp.nome || r.desc || code).trim() || code;
          const uom = String(fp.uom || r.uom || 'pz').trim() || 'pz';
          const cur = reqFp.get(low) || { code, name, uom, qtyInt: 0 };
          cur.qtyInt += useFp;
          if (!cur.name) cur.name = name;
          if (!cur.uom) cur.uom = uom;
          reqFp.set(low, cur);
          availFp.set(low, aFp - useFp);
        }

        const rem = qInt - useFp;
        if (rem <= 0) continue;

        const comps = getFpComponents(fp);
        if (!comps || !comps.length){
          alert(`Distinta base mancante per ${code} (${fp.name || fp.nome || ''}).\n\nGiacenza PF insufficiente: rimangono ${rem} pz da scaricare come componenti.`);
          return;
        }

        for (const c of comps){
          const cCode = String(c.code || '').trim();
          if (!cCode) continue;

          const per = compQtyPerUnit(c);
          if (per == null || !Number.isFinite(per) || per <= 0) continue;

          const add = per * rem;
          const clow = cCode.toLowerCase();
          const cur = req.get(clow) || { code: cCode, name: String(c.name || c.articolo || cCode).trim(), uom: String(c.uom || '').trim(), qty: 0 };
          cur.qty += add;
          if (!cur.name) cur.name = cCode;
          if (!cur.uom) cur.uom = String(c.uom || '').trim();
          req.set(clow, cur);
        }
      }

      if (!req.size && !reqFp.size){
        alert('Nessun movimento calcolabile (controlla righe e quantita).');
        return;
      }

      // 3) Componenti: calcola disponibilita' per sede e valida scorte
      const movementIds = [];
      const allocations = [];

      if (req.size){
        let movs = (H.state && Array.isArray(H.state.movements)) ? H.state.movements : [];
        if (!movs.length){
          try{
            const col = collection(H.fb.db, 'orgs', H.ORG_ID, 'inventoryMovements');
            const q = query(col, orderBy('createdAt'));
            const snap = await getDocs(q);
            movs = snap.docs.map(d => {
              const data = d.data() || {};
              return { id: d.id, type: data.type || 'IN', code: data.code || '', qty: data.qty, warehouse: data.warehouse || '' };
            });
            if (H.state) H.state.movements = movs;
          }catch(e){ try{ console.warn('fetch inventoryMovements failed', e); }catch(_){ } }
        }

        if (!movs.length){
          alert('Inventario non pronto: movimenti non caricati.');
          return;
        }

        const _normWh = (w) => {
          try{ if (H && typeof H.normalizeWarehouse === 'function') return H.normalizeWarehouse(w); }catch(_){ }
          const ss = String(w || '').trim().toLowerCase();
          if (ss.includes('conca') || ss.includes('concamarise')) return 'concamarise';
          return 'cerea';
        };
        const _safeInt = (v) => {
          const n = parseInt(String(v||'').replace(/[^0-9\-]/g,''), 10);
          return Number.isFinite(n) ? n : 0;
        };

        const avail = { cerea: new Map(), concamarise: new Map() };
        for (const mv of movs){
          const code = String(mv && mv.code || '').trim();
          if (!code) continue;
          const low = code.toLowerCase();
          const w = _normWh(mv.warehouse || mv.site || mv.magazzino || mv.location || '');
          const q = _safeInt(mv.qty);
          if (!q) continue;
          const delta = (String(mv.type || '').toUpperCase() === 'OUT') ? -q : q;
          const m = (w === 'concamarise') ? avail.concamarise : avail.cerea;
          m.set(low, (m.get(low) || 0) + delta);
        }

        const needList = Array.from(req.values()).map(it => {
          const qtyInt = Math.round(Number(it.qty) || 0);
          return Object.assign({}, it, { qtyInt });
        }).filter(x => x.qtyInt);

        for (const it of needList){
          const low = String(it.code || '').trim().toLowerCase();
          const aC = Math.max(0, _safeInt(avail.cerea.get(low)));
          const aK = Math.max(0, _safeInt(avail.concamarise.get(low)));
          const tot = aC + aK;
          if (tot < it.qtyInt){
            alert(`Scorta insufficiente per ${it.code} — ${it.name || ''}\n\nRichiesti: ${it.qtyInt.toLocaleString('it-IT')} ${String(it.uom||'').trim()}\nDisponibili: ${(tot).toLocaleString('it-IT')} (Cerea ${aC.toLocaleString('it-IT')}, Concamarise ${aK.toLocaleString('it-IT')})`);
            return;
          }
        }

        // 4) crea movimenti OUT componenti (split automatico tra sedi)
        const movCol = collection(H.fb.db, 'orgs', H.ORG_ID, 'inventoryMovements');
        const noteBase = `Scarico componenti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;

        for (const it of needList){
          const low = String(it.code || '').trim().toLowerCase();
          let need = it.qtyInt;

          let aC = Math.max(0, _safeInt(avail.cerea.get(low)));
          let aK = Math.max(0, _safeInt(avail.concamarise.get(low)));

          const first = (aK > aC) ? 'concamarise' : 'cerea';
          const second = (first === 'cerea') ? 'concamarise' : 'cerea';

          const takeFrom = (wh) => {
            if (need <= 0) return 0;
            const cur = (wh === 'concamarise') ? aK : aC;
            const take = Math.min(need, cur);
            if (take <= 0) return 0;
            need -= take;
            if (wh === 'concamarise') aK -= take;
            else aC -= take;
            return take;
          };

          const t1 = takeFrom(first);
          const t2 = takeFrom(second);

          avail.cerea.set(low, aC);
          avail.concamarise.set(low, aK);

          allocations.push({ code: it.code, name: it.name || it.code, uom: String(it.uom||'').trim(), qty: it.qtyInt, byWarehouse: { cerea: (first==='cerea'?t1:t2) || 0, concamarise: (first==='concamarise'?t1:t2) || 0 } });

          const makePayload = (warehouse, qtyInt) => ({
            type: 'OUT',
            customer: 'Scarico DDT',
            code: it.code,
            item: it.name || it.code,
            uom: String(it.uom || '').trim(),
            qtyRaw: `${it.qty} ${String(it.uom||'').trim()}`.trim(),
            qty: qtyInt,
            date: String(ddt.date || '').trim(),
            note: noteBase,
            source: 'DaneaXML',
            rawText: '',
            warehouse: warehouse,
            docType: 'DDT',
            docNum: String(ddt.number || '').trim(),
            docDateRaw: String(ddt.date || '').trim(),
            daneaDdtKey: String(ddt.key || '').trim(),
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
      }

      // 4b) Prodotti finiti: crea movimenti OUT su sede unica
      const finishedMovementIds = [];
      const finishedAllocations = [];
      if (reqFp.size){
        const col = collection(H.fb.db, 'orgs', H.ORG_ID, 'finishedInventoryMovements');
        const noteBase = `Scarico prodotti finiti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;
        for (const it of Array.from(reqFp.values())){
          if (!it || !it.qtyInt) continue;
          finishedAllocations.push({ code: it.code, name: it.name || it.code, uom: String(it.uom||'').trim(), qty: it.qtyInt, warehouse: 'prodotti_finiti' });
          const payload = {
            type: 'OUT',
            code: it.code,
            item: it.name || it.code,
            uom: String(it.uom || '').trim(),
            qtyRaw: `${it.qtyInt} ${String(it.uom||'').trim()}`.trim(),
            qty: it.qtyInt,
            date: String(ddt.date || '').trim(),
            note: noteBase,
            source: 'DaneaXML',
            warehouse: 'prodotti_finiti',
            docType: 'DDT',
            docNum: String(ddt.number || '').trim(),
            docDateRaw: String(ddt.date || '').trim(),
            daneaDdtKey: String(ddt.key || '').trim(),
            createdAt: serverTimestamp(),
            createdBy: H.fb.user.email || H.fb.user.uid
          };
          const ref = await addDoc(col, payload);
          if (ref && ref.id) finishedMovementIds.push(ref.id);
        }
      }

      // 5) salva completato (id deterministico)
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
        warehouse: 'global',
        allocations: allocations,
        finishedAllocations: finishedAllocations,
        xmlHash: String(ddt.hash || ''),
        movementIds: movementIds,
        finishedMovementIds: finishedMovementIds,
        autoDischarge: true,
        createdAt: serverTimestamp(),
        createdBy: H.fb.user.email || H.fb.user.uid
      }, { merge: true });

      try{ window.HubInv?.showToast?.('DDT completato e scaricato'); }catch(_){ }
      setDetailOpen(false);
      setTab('done');
      await fetchNow(true);

    }catch(e){
      console.error(e);
      try{ window.HubInv?.showToast?.('Errore completamento DDT', 'err'); }catch(_){ }
      alert('Errore completamento DDT');
    }finally{
      S.busy = false;
    }
  }


// ===== BULK: scarica automaticamente TUTTI i DDT verdi (OK) =====
  async function dischargeAllGreenDdts(opts){
    opts = (opts && typeof opts === "object") ? opts : {};
    const silent = !!opts.silent;

    if (S.busy) return;

    const H = S.hub;
    if (!H || !H.fb || !H.fb.db || !H.FS) {
      if (!silent) alert("Hub non pronto");
      return;
    }

    // procedi anche senza login (auto-mode), ma evita errori in rules
    const actor = (H.fb.user && (H.fb.user.email || H.fb.user.uid)) || "auto";

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

    green.sort((a,b) => String(a?.date||"").localeCompare(String(b?.date||"")) || String(a?.number||"").localeCompare(String(b?.number||"")));

    if (!silent){
      const ok = confirm(`Scaricare automaticamente ${green.length} DDT verdi?\n\n• Scarico PF (se disponibili) + componenti (se necessari)\n• I DDT passeranno in "Completati"`);
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

      // 1) Carica inventario componenti (una sola volta)
      let movs = (H.state && Array.isArray(H.state.movements)) ? H.state.movements : [];
      if (!movs.length){
        try{
          const col = collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");
          const q = query(col, orderBy("createdAt"));
          const snap = await getDocs(q);
          movs = snap.docs.map(d => {
            const data = d.data() || {};
            return { id: d.id, type: data.type || "IN", code: data.code || "", qty: data.qty, warehouse: data.warehouse || "" };
          });
          if (H.state) H.state.movements = movs;
        }catch(e){ try{ console.warn("fetch inventoryMovements failed", e); }catch(_){ } }
      }

      // 2) Carica inventario PF (una sola volta)
      let fpMovs = (H.state && Array.isArray(H.state.finishedMovements)) ? H.state.finishedMovements : [];
      if (!fpMovs.length){
        try{
          const col = collection(H.fb.db, "orgs", H.ORG_ID, "finishedInventoryMovements");
          const q = query(col, orderBy("createdAt"));
          const snap = await getDocs(q);
          fpMovs = snap.docs.map(d => {
            const data = d.data() || {};
            return { id: d.id, type: data.type || "IN", code: data.code || "", qty: data.qty };
          });
          if (H.state) H.state.finishedMovements = fpMovs;
        }catch(e){ try{ console.warn("fetch finishedInventoryMovements failed", e); }catch(_){ } }
      }

      const _normWh = (w) => {
        try{ if (H && typeof H.normalizeWarehouse === "function") return H.normalizeWarehouse(w); }catch(_){ }
        const ss = String(w || "").trim().toLowerCase();
        if (ss.includes("conca") || ss.includes("concamarise")) return "concamarise";
        return "cerea";
      };
      const _safeInt = (v) => {
        const n = parseInt(String(v||"").replace(/[^0-9\-]/g,""), 10);
        return Number.isFinite(n) ? n : 0;
      };

      // Disponibilita' live componenti (cosi' non scarichi piu' del disponibile)
      const avail = { cerea: new Map(), concamarise: new Map() };
      for (const mv of (movs || [])){
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

      // Disponibilita' live PF (sede unica)
      const availFp = new Map();
      for (const mv of (fpMovs || [])){
        const code = String(mv && mv.code || "").trim();
        if (!code) continue;
        const low = code.toLowerCase();
        const q = _safeInt(mv.qty);
        if (!q) continue;
        const delta = (String(mv.type || "").toUpperCase() === "OUT") ? -q : q;
        availFp.set(low, (availFp.get(low) || 0) + delta);
      }

      const movCol = collection(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements");
      const fpCol = collection(H.fb.db, "orgs", H.ORG_ID, "finishedInventoryMovements");

      let doneCount = 0;
      for (let i=0; i<green.length; i++){
        const ddt = green[i];
        if (!ddt || !ddt.key) continue;
        if (S.completedMap.has(ddt.key)) continue;

        try{ setProg(doneCount); }catch(_){ }

        // 3) calcola fabbisogni (PF prima, componenti dopo)
        const req = new Map();
        const reqFp = new Map();

        for (const r of (ddt.rows || [])){
          const code = String(r.code || "").trim();
          if (!code) continue;

          const qtyLine = (r.qty != null && Number.isFinite(Number(r.qty))) ? Number(r.qty) : parseFraction(r.qtyRaw);
          const qLine = (qtyLine != null && Number.isFinite(qtyLine)) ? qtyLine : 0;
          if (qLine <= 0) continue;

          const fp = getFpForRow(r);
          if (!fp) continue;

          const qInt = Math.round(qLine);
          if (qInt <= 0) continue;

          const low = code.toLowerCase();
          const aFp = Math.max(0, _safeInt(availFp.get(low)));
          const useFp = Math.min(qInt, aFp);

          if (useFp > 0){
            const name = String(fp.name || fp.nome || r.desc || code).trim() || code;
            const uom = String(fp.uom || r.uom || "pz").trim() || "pz";
            const cur = reqFp.get(low) || { code, name, uom, qtyInt: 0 };
            cur.qtyInt += useFp;
            reqFp.set(low, cur);
            availFp.set(low, aFp - useFp);
          }

          const rem = qInt - useFp;
          if (rem <= 0) continue;

          const comps = getFpComponents(fp);
          if (!comps || !comps.length){
            if (!silent){
              alert(`DDT ${ddt.number || "?"}: distinta base mancante per ${code}.\n\nGiacenza PF insufficiente: rimangono ${rem} pz.`);
            }
            // ripristina PF allocati per questo codice (best-effort)
            if (useFp > 0){ availFp.set(low, (availFp.get(low) || 0) + useFp); }
            continue;
          }

          for (const c of comps){
            const cCode = String(c.code || "").trim();
            if (!cCode) continue;
            const per = compQtyPerUnit(c);
            if (per == null || !Number.isFinite(per) || per <= 0) continue;
            const add = per * rem;
            const clow = cCode.toLowerCase();
            const cur = req.get(clow) || { code: cCode, name: String(c.name || c.articolo || cCode).trim(), uom: String(c.uom || "").trim(), qty: 0 };
            cur.qty += add;
            if (!cur.name) cur.name = cCode;
            if (!cur.uom) cur.uom = String(c.uom || "").trim();
            req.set(clow, cur);
          }
        }

        if (!req.size && !reqFp.size){
          try{ window.HubInv?.showToast?.(`DDT ${ddt.number || "?"}: nessun movimento calcolabile`, "warn"); }catch(_){ }
          continue;
        }

        // 4) validazione scorte componenti (se necessari)
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
              alert(`Scarico interrotto\n\nScorta insufficiente per ${it.code} — ${it.name || ""}\nRichiesti: ${it.qtyInt}\nDisponibili: ${tot} (Cerea ${aC}, Concamarise ${aK})`);
            }
            return;
          }
        }

        // 5) scrittura movimenti
        const movementIds = [];
        const finishedMovementIds = [];
        const allocations = [];
        const finishedAllocations = [];

        const noteComp = `Scarico componenti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;
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
            note: noteComp,
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

        const noteFp = `Scarico prodotti finiti per DDT ${ddt.number} del ${fmtDateIT(ddt.date)} (DaneaXML)`;
        for (const it of Array.from(reqFp.values())){
          if (!it || !it.qtyInt) continue;
          finishedAllocations.push({ code: it.code, name: it.name || it.code, uom: String(it.uom||"").trim(), qty: it.qtyInt, warehouse: "prodotti_finiti" });
          const payload = {
            type: "OUT",
            code: it.code,
            item: it.name || it.code,
            uom: String(it.uom || "").trim(),
            qtyRaw: `${it.qtyInt} ${String(it.uom||"").trim()}`.trim(),
            qty: it.qtyInt,
            date: String(ddt.date || "").trim(),
            note: noteFp,
            source: "DaneaXML",
            warehouse: "prodotti_finiti",
            docType: "DDT",
            docNum: String(ddt.number || "").trim(),
            docDateRaw: String(ddt.date || "").trim(),
            daneaDdtKey: String(ddt.key || "").trim(),
            createdAt: serverTimestamp(),
            createdBy: actor
          };
          const ref = await addDoc(fpCol, payload);
          if (ref && ref.id) finishedMovementIds.push(ref.id);
        }

        // 6) salva completato
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
          finishedAllocations: finishedAllocations,
          xmlHash: String(ddt.hash || ""),
          movementIds: movementIds,
          finishedMovementIds: finishedMovementIds,
          autoDischarge: true,
          createdAt: serverTimestamp(),
          createdBy: actor
        }, { merge: true });

        try{ S.completedMap.set(String(ddt.key||"").trim(), { key: String(ddt.key||"").trim() }); }catch(_){ }

        doneCount++;
        try{ setProg(doneCount); }catch(_){ }

      }

      try{ window.HubInv?.showToast?.(`Scarico completato: ${doneCount} DDT`, "ok"); }catch(_){ }
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
      const fpIds = Array.isArray(c.finishedMovementIds) ? c.finishedMovementIds : [];

      for (const id of ids){
        const mid = String(id || "").trim();
        if (!mid) continue;
        try{ await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "inventoryMovements", mid)); }
        catch(e){ console.warn("delete inventory movement failed", mid, e); }
      }

      for (const id of fpIds){
        const mid = String(id || "").trim();
        if (!mid) continue;
        try{ await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "finishedInventoryMovements", mid)); }
        catch(e){ console.warn("delete finished movement failed", mid, e); }
      }

      const doneId = encodeURIComponent(String(k));
      await deleteDoc(doc(H.fb.db, "orgs", H.ORG_ID, "daneaDdtCompleted", doneId));

      try{ window.HubInv?.showToast?.("DDT eliminato: scarico resettato"); }catch(_){ }
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
      const fpIds = Array.isArray(d && d.finishedMovementIds) ? d.finishedMovementIds : [];
      return ids.length > 0 || fpIds.length > 0;
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
    fpById:new Map(),

    // dettaglio: può essere "category" o "product" (singolo)
    detailMode:"category",
    selectedKey:"",
    selectedFpId:"",
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
        try{
          if (meta && meta.dataset && meta.dataset.fpMode === "product") return;
        }catch(_){}
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
      S.detailMode = "category";
      S.selectedKey = "";
      S.selectedFpId = "";
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
    S.fpById = new Map();
    for (const fp of (S.finished || [])){
      const code = norm(fp && (fp.code || ""));
      if (code) S.fpByCode.set(code, fp);
      const fid = String(fp && fp.id || "").trim();
      if (fid) S.fpById.set(fid, fp);
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

  function __fpCatSetFieldLabel(inputId, label){
    try{
      const el = $(inputId);
      const lbl = el ? (el.closest(".field") ? el.closest(".field").querySelector("label") : null) : null;
      if (lbl) lbl.textContent = String(label || "");
    }catch(_){ }
  }

  function __fpCatApplyDetailModeUi(){
    const isProd = S.detailMode === "product";

    try{
      const title = $("fpCatModalTitle");
      const sub = $("fpCatModalSub");
      if (title) title.textContent = isProd ? "Distinta base prodotto finito" : "Categoria prodotto finito";
      if (sub){
        if (isProd){
          sub.textContent = "Modifica la distinta base del prodotto singolo (fuori categoria).";
        } else {
          sub.textContent = "Crea la distinta base (componenti) e visualizza i prodotti finiti associati. I prodotti si aggiungono da sezione Prodotti finiti.";
        }
      }
    }catch(_){ }

    // meta: usato per toggle membri (disabilita in modo prodotto)
    try{
      const meta = $("fpCatDetailMeta");
      if (meta && meta.dataset){
        meta.dataset.fpMode = isProd ? "product" : "category";
        meta.style.cursor = isProd ? "default" : "pointer";
      }
    }catch(_){ }

    // labels + readonly
    try{
      __fpCatSetFieldLabel("fpCatEditName", isProd ? "Nome prodotto" : "Nome categoria");
      __fpCatSetFieldLabel("fpCatEditKey", isProd ? "Codice" : "Chiave");
    }catch(_){ }

    try{
      const nameEl = $("fpCatEditName");
      const keyEl = $("fpCatEditKey");
      if (nameEl) nameEl.readOnly = !!isProd;
      if (keyEl) keyEl.readOnly = !!isProd;
    }catch(_){ }

    // members stack: forzata nascosta per prodotto singolo
    try{
      const membersTable = $("fpCatMembersTable");
      const membersStack = membersTable ? membersTable.closest(".stack") : null;
      if (membersStack){
        if (isProd){
          membersStack.style.display = "none";
          membersStack.dataset.fpForceHidden = "1";
        } else if (membersStack.dataset && membersStack.dataset.fpForceHidden === "1"){
          // torna in modalità categoria: chiusa di default, ma sbloccabile dal toggle
          delete membersStack.dataset.fpForceHidden;
          membersStack.style.display = "none";
        }
      }
    }catch(_){ }

    // pulsanti
    try{
      const btnDel = $("btnFpCatDelete");
      if (btnDel) btnDel.style.display = isProd ? "none" : "";
    }catch(_){ }
  }

  function renderDetailProduct(){
    const d = S.draft || null;
    __fpCatApplyDetailModeUi();

    const activeEl = (typeof document !== "undefined") ? document.activeElement : null;
    const elKey = $("fpCatEditKey");
    const elName = $("fpCatEditName");

    if (elKey){
      const v = String((d && d.key) ? d.key : "");
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

    // Members: nascosti (ma pulisco conteggi per coerenza)
    if ($("fpCatMembersCount")) $("fpCatMembersCount").textContent = "0";
    const mtb = $("fpCatMembersTbody");
    if (mtb) mtb.innerHTML = '<tr><td class="td-muted" colspan="3">—</td></tr>';

    const meta = $("fpCatDetailMeta");
    if (meta){
      meta.textContent = `BOM: ${bom.length}`;
    }
    const delHint = $("fpCatDeleteHint");
    if (delHint) delHint.textContent = "";
  }

  function renderDetail(){
    if (S.detailMode === "product"){
      renderDetailProduct();
      return;
    }
    const key = norm(S.selectedKey);
    const cat = key ? (S.catMap.get(key) || null) : null;
    const d = S.draft || null;

    __fpCatApplyDetailModeUi();

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
    S.detailMode = "category";
    S.selectedFpId = "";
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

  function __fpCatGetFinishedById(id){
    const fid = String(id || "").trim();
    if (!fid) return null;
    try{
      if (S.fpById && S.fpById.has && S.fpById.has(fid)) return S.fpById.get(fid) || null;
    }catch(_){ }
    try{
      return (S.finished || []).find(x => String(x && x.id || "") === fid) || null;
    }catch(_){ return null; }
  }

  function __fpCatGetFinishedBom(fp){
    try{
      if (!fp) return [];
      const arr = Array.isArray(fp && (fp.components || fp.bom || fp.distintaBase)) ? (fp.components || fp.bom || fp.distintaBase) : [];
      return Array.isArray(arr) ? arr : [];
    }catch(_){ return []; }
  }

  function openSingleProduct(fpId){
    const fp = __fpCatGetFinishedById(fpId);
    if (!fp){ showToast("Prodotto finito non trovato", "warn"); return; }

    S.detailMode = "product";
    S.selectedFpId = String(fpId || "").trim();
    S.selectedKey = "";
    S.keyManual = true;

    const code = String(fp?.code || "").trim();
    const nm = String(fp?.name || fp?.nome || "").trim() || code || "Prodotto finito";
    const bom0 = __fpCatGetFinishedBom(fp);

    const prevCat = norm(fp?.categoryKeyLower || fp?.categoryKey || fp?.category || fp?.catKey || "");
    S.draft = {
      key: code,
      name: nm,
      bom: Array.isArray(bom0) ? bom0.slice() : [],
      __prevCat: prevCat
    };

    setDetailOpen(true);
    renderDatalists();
    renderDetail();

    // reset barre di ricerca + suggerimenti
    try{ if ($("fpCatCompPick")) $("fpCatCompPick").value = ""; }catch(_){ }
    try{ if ($("fpCatCompQty")) $("fpCatCompQty").value = ""; }catch(_){ }
    try{ if ($("fpCatMemberPick")) $("fpCatMemberPick").value = ""; }catch(_){ }
    try{ __fpCatHideSuggest("comp"); __fpCatHideSuggest("member"); }catch(_){ }

    // focus componente
    try{ setTimeout(() => $("fpCatCompPick")?.focus(), 0); }catch(_){ }
  }

  function openForFinishedProduct(fpId){
    const fp = __fpCatGetFinishedById(fpId);
    if (!fp){ showToast("Prodotto finito non trovato", "warn"); return; }

    // Se ha una BOM propria => è singolo
    const direct = __fpCatGetFinishedBom(fp);
    if (direct && direct.length){
      openSingleProduct(fpId);
      return;
    }

    const catKey = norm(fp?.categoryKeyLower || fp?.categoryKey || fp?.category || fp?.catKey || "");
    if (catKey && catKey !== "singolo" && S.catMap && S.catMap.has(catKey)){
      openDetail(catKey);
      return;
    }

    // nessuna categoria: usa modalità prodotto singolo
    openSingleProduct(fpId);
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

  async function saveSingleProductBom(){
    const h = H();
    if (!h || !h.fb || !h.fb.db || !h.FS) { showToast("Firebase non pronto", "warn"); return; }
    if (!h.fb.user) { showToast("Accedi con Google", "warn"); return; }

    const fid = String(S.selectedFpId || "").trim();
    if (!fid){ showToast("Prodotto finito non valido", "warn"); return; }

    const bom0 = (S.draft && Array.isArray(S.draft.bom)) ? S.draft.bom : [];
    const bom = bom0.map(c => {
      const code = String(c?.code || "").trim();
      if (!code) return null;
      const name = String(c?.name || "").trim();
      const uom = String(c?.uom || "").trim();
      const qtyRaw = String(c?.qtyRaw || "").trim();
      const qtyNum = (c && c.qty != null && Number.isFinite(Number(c.qty))) ? Number(c.qty) : (c?.qty != null ? Number(c.qty) : null);
      const productId = String(c?.productId || "").trim() || keyToId(code.toLowerCase());
      return { productId, code, name, qty: (Number.isFinite(qtyNum) ? qtyNum : null), qtyRaw, uom };
    }).filter(Boolean);

    try{
      const { doc, setDoc, serverTimestamp, deleteField } = h.FS;
      const ref = doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", fid);

      const payload = {
        components: bom,
        updatedAt: serverTimestamp(),
        updatedBy: h.fb.user.email || h.fb.user.uid || ""
      };

      if (bom.length){
        payload.categoryKey = "singolo";
        payload.categoryKeyLower = "singolo";
      } else {
        const prev = norm(S.draft && S.draft.__prevCat || "");
        if (prev === "singolo"){
          payload.categoryKey = deleteField();
          payload.categoryKeyLower = deleteField();
        }
      }

      await setDoc(ref, payload, { merge: true });
      showToast("Distinta salvata");
    }catch(e){
      console.warn("save finishedProduct BOM failed", e);
      showToast("Errore salvataggio distinta", "err");
    }
  }

  async function saveCategory(){
    if (S.detailMode === "product"){
      await saveSingleProductBom();
      return;
    }
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
    if (S.detailMode === "product"){
      showToast("Operazione non disponibile sul prodotto singolo", "warn");
      return;
    }
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
    if (S.detailMode === "product"){
      showToast("Funzione disponibile solo per categorie", "warn");
      return;
    }
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
      const { doc, updateDoc, deleteField } = h.FS;
      await updateDoc(doc(h.fb.db, "orgs", h.ORG_ID, "finishedProducts", fp.id), {
        categoryKey: key,
        categoryKeyLower: key,
        // Se era "Singolo", quando lo assegno a una categoria deve ereditare la distinta base della categoria
        components: deleteField(),
        bom: deleteField(),
        distintaBase: deleteField()
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
    if (S.detailMode === "product"){
      showToast("Funzione disponibile solo per categorie", "warn");
      return;
    }
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
  window.HubFPCategories.openDetail = function(key){ try{ openDetail(key); }catch(_){ } };
  window.HubFPCategories.openSingleProduct = function(fpId){ try{ openSingleProduct(fpId); }catch(_){ } };
  window.HubFPCategories.openForFinishedProduct = function(fpId){ try{ openForFinishedProduct(fpId); }catch(_){ } };
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

    let lastFocusBeforeMenu = null;

    function setInert(el, on){
      if(!el) return;
      try{ if ("inert" in el) el.inert = !!on; }catch(_){}
      if(on) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    }

    // Desktop (min-width:1200px): menu è "pinned" sempre visibile via CSS.
    // Mobile/tablet: menu è overlay → deve essere inert/aria-hidden quando chiuso.
    const __mqPinnedMenu = (window.matchMedia ? window.matchMedia("(min-width: 1200px)") : null);
    function __isPinnedMenu(){
      try{ return __mqPinnedMenu ? !!__mqPinnedMenu.matches : (window.innerWidth >= 1200); }catch(_){ return (window.innerWidth >= 1200); }
    }

    function syncSideMenuA11y(){
      const pinned = __isPinnedMenu();

      if (pinned){
        // pinned: sempre interattivo + accessibile
        try{ document.body.classList.remove("menu-open"); }catch(_){}
        if (sideMenu){
          sideMenu.setAttribute("aria-hidden","false");
          setInert(sideMenu,false);
        }
        if (sideMenuOverlay){
          sideMenuOverlay.setAttribute("aria-hidden","true");
          setInert(sideMenuOverlay,true);
        }
        return;
      }

      const open = document.body.classList.contains("menu-open");
      if (sideMenu){
        sideMenu.setAttribute("aria-hidden", open ? "false" : "true");
        setInert(sideMenu, !open);
      }
      if (sideMenuOverlay){
        sideMenuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
        setInert(sideMenuOverlay, !open);
      }
    }

    try{
      if (__mqPinnedMenu && typeof __mqPinnedMenu.addEventListener === "function"){
        __mqPinnedMenu.addEventListener("change", syncSideMenuA11y);
      } else if (__mqPinnedMenu && typeof __mqPinnedMenu.addListener === "function") {
        __mqPinnedMenu.addListener(syncSideMenuA11y);
      }
      window.addEventListener("resize", syncSideMenuA11y, { passive: true });
    }catch(_){}
    // Init
    try{ syncSideMenuA11y(); }catch(_){}

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

    // Nuovo articolo (Materie prime / Imballaggi)
    const btnAnagAddProduct = document.getElementById("btnAnagAddProduct");
    const modalNewProduct = document.getElementById("modalNewProduct");
    const newProdClose = document.getElementById("newProdClose");
    const newProdCancel = document.getElementById("newProdCancel");
    const newProdCreate = document.getElementById("newProdCreate");
    const newProdCode = document.getElementById("newProdCode");
    const newProdName = document.getElementById("newProdName");

    // Anagrafica prodotti finiti (distinta base)
    const btnNewFinishedProduct = document.getElementById("btnNewFinishedProduct");
    const modalFinishedProduct = document.getElementById("modalFinishedProduct");
    const fpTitle = document.getElementById("fpTitle");
    const fpName = document.getElementById("fpName");
    const fpCode = document.getElementById("fpCode");
    const fpUom = document.getElementById("fpUom");

    const fpCompMeta = document.getElementById("fpCompMeta");
    const fpCompCat = document.getElementById("fpCompCat");
    const fpCompBrowseWrap = document.getElementById("fpCompBrowseWrap");
    const fpCompBrowse = document.getElementById("fpCompBrowse");
    const fpCompPick = document.getElementById("fpCompPick");
    const fpCompQty = document.getElementById("fpCompQty");
    const fpCompUom = document.getElementById("fpCompUom");
    const fpComponentList = document.getElementById("fpComponentList");
    const fpCompTbody = document.getElementById("fpCompTbody");

    const btnFpCompAdd = document.getElementById("btnFpCompAdd");
    const btnFpSave = document.getElementById("btnFpSave");
    const btnFpCancel = document.getElementById("btnFpCancel");
    const btnFpDelete = document.getElementById("btnFpDelete");
    const btnFpDone = document.getElementById("btnFpDone");
    const fpClose = document.getElementById("fpClose");

    // Click su una riga documento => precompila i campi movimento
    const docItemsTable = document.getElementById("docItemsTable");

    // ===== NAV (Home / OCR / Anagrafica / Inventario) =====
    const __views = {
      home: document.getElementById("viewHome"),
      ocr: document.getElementById("viewOcr"),
      inventory: document.getElementById("viewInventory"),
      finishedInventory: document.getElementById("viewFinishedInventory"),
      flows: document.getElementById("viewFlows"),
      movements: document.getElementById("viewMovements"),
      categories: document.getElementById("viewCategories"),
      trash: document.getElementById("viewTrash"),
      moveInv: document.getElementById("viewMoveInventory"),
      anag: document.getElementById("viewAnag"),
      daneaDdt: document.getElementById("viewDaneaDdt"),
      revenue: document.getElementById("viewRevenue"),
      fpCategories: document.getElementById("viewFPCategories")
    };
    const __hdrTitle = document.getElementById("hdrPageTitle");
    const __btnBack = document.getElementById("btnNavBack");
    const btnBackOcr = document.getElementById("btnBackOcr");
    const btnBackFlows = document.getElementById("btnBackFlows");
    const btnBackMovements = document.getElementById("btnBackMovements");
    const btnBackAnag = document.getElementById("btnBackAnag");
    const btnBackMoveInv = document.getElementById("btnBackMoveInv");

    // Porta overlay/modali come figli diretti di <body> per evitare stacking-context (transform/filter) sui parent
    (function __liftOverlaysToBody(){
      try{
        ["viewOcr","viewInventory","viewFinishedInventory","viewFlows","viewDaneaDdt","viewRevenue","viewMovements","viewMoveInventory","viewCategories","viewFPCategories","viewTrash","viewAnag"].forEach(id => {
          const el = document.getElementById(id);
          if (el && el.parentElement !== document.body) document.body.appendChild(el);
        });
        document.querySelectorAll(".modal").forEach(m => {
          if (m && m.parentElement !== document.body) document.body.appendChild(m);
        });
      }catch(_){}



    })();

    // =========================================================
    // Dock: cerca / filtri / bottoni nella stessa riga del tasto indietro
    // (sposta le .listStickyBar dentro la .hd di ogni overlay)
    // =========================================================
    function __dockBackRowControls(){
      try{
        const views = document.querySelectorAll('.view.modalOverlay');
        views.forEach((view) => {
          const card = view.querySelector('article.card');
          if (!card) return;

          const hd = card.querySelector(':scope > .hd') || card.querySelector('.hd');
          const bd = card.querySelector(':scope > .bd') || card.querySelector('.bd');
          if (!hd || !bd) return;

          // Right cluster (pill + close). Se manca, ok.
          try{
            const kids = Array.from(hd.children || []);
            const right = hd.querySelector('.hdrRight') || kids.find(el => el && el.classList && el.classList.contains('inlineRow') && !el.classList.contains('overlayHeaderTitle')) || null;
            if (right && right.classList) right.classList.add('hdrRight');
          }catch(_){ }

          // Dock slot (between title and right)
          let slot = hd.querySelector('.hdrDockSlot');
          if (!slot){
            slot = document.createElement('div');
            slot.className = 'hdrDockSlot';
            const title = hd.querySelector('.overlayHeaderTitle');
            const right2 = hd.querySelector('.hdrRight');
            if (title && title.nextSibling) hd.insertBefore(slot, title.nextSibling);
            else if (right2) hd.insertBefore(slot, right2);
            else hd.appendChild(slot);
          }

          // Primary bar: la prima .listStickyBar dentro la bd
          const bar = bd.querySelector('.listStickyBar');
          if (!bar) return;
          if (bar.closest && bar.closest('.hd')) return; // già dockata

          // show/hide: usa l'antenato con id più vicino (es. invDetail / moveInvList / daneaListWrap)
          let showWhen = '';
          try{
            let p = bar.parentElement;
            while (p && p !== bd){
              if (p.id){ showWhen = String(p.id||''); break; }
              p = p.parentElement;
            }
          }catch(_){ }
          try{ if (showWhen) bar.dataset.dockShowWhen = showWhen; }catch(_){ }

          // pulizia inline styles che occupavano spazio in bd
          try{ bar.style.marginTop = '0'; }catch(_){ }
          try{ bar.style.padding = '0'; }catch(_){ }
          try{ bar.style.background = 'transparent'; }catch(_){ }
          try{ bar.style.position = 'static'; }catch(_){ }
          try{ bar.classList.add('inHeaderDock'); }catch(_){ }

          slot.appendChild(bar);
        });
      }catch(_){ }
    }

    function __isVisibleEl(el){
      if (!el) return false;
      try{
        const cs = window.getComputedStyle(el);
        return !!(cs && cs.display !== 'none' && cs.visibility !== 'hidden');
      }catch(_){
        return true;
      }
    }

    function __syncDockedControlsVisibility(){
      try{
        document.querySelectorAll('.view.modalOverlay article.card > .hd .listStickyBar.inHeaderDock').forEach((bar) => {
          const id = (bar && bar.dataset) ? String(bar.dataset.dockShowWhen || '') : '';
          if (!id){
            try{ bar.style.display = ''; }catch(_){ }
            return;
          }
          const src = document.getElementById(id);
          const vis = __isVisibleEl(src);
          try{ bar.style.display = vis ? '' : 'none'; }catch(_){ }
        });
      }catch(_){ }
    }

    try{ window.__syncDockedControlsVisibility = __syncDockedControlsVisibility; }catch(_){ }
    try{ __dockBackRowControls(); __syncDockedControlsVisibility(); }catch(_){ }



    function syncHeaderBackVisibility(){
      if (!__btnBack) return;
      const hasModal = !!document.querySelector(".modal.open");
      const hasOverlay = !!document.querySelector(".view.modalOverlay.active");
      __btnBack.style.display = (hasModal || hasOverlay) ? "inline-flex" : "none";
    }

    function setView(name){
      const key = String(name || "home");
      const overlayKeys = ["ocr","inventory","finishedInventory","flows","daneaDdt","revenue","movements","moveInv","categories","fpCategories","trash","anag"];
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
          (key === "finishedInventory") ? "Inventario prodotti finiti" :
          (key === "flows") ? "DDT Caricati" :
          (key === "daneaDdt") ? "Scarica flussi DDT" :
          (key === "revenue") ? "Fatturato" :
          (key === "movements") ? "Movimenti" :
          (key === "categories") ? "Categorie" :
          (key === "fpCategories") ? "Categorie prodotti finiti" :
          (key === "trash") ? "Cestino" :
          (key === "moveInv") ? "Sposta inventario" :
          "Anagrafica";
      }
      syncHeaderBackVisibility();
      try{ __dockBackRowControls && __dockBackRowControls(); }catch(_){ }
      try{ __syncDockedControlsVisibility && __syncDockedControlsVisibility(); }catch(_){}
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

      // Warm-up ScanBridge appena entri nella vista OCR (non apre lo scanner):
      // riduce il caso "parte solo al secondo clic".
      try{ __scanbridgeWarmup(false).catch(()=>{}); }catch(_){ }

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
      // Desktop pinned: niente overlay, ma riallineiamo aria/inert nel caso fosse rimasto sporco
      if (__isPinnedMenu()) { try{ syncSideMenuA11y(); }catch(_){} return; }

      // Remember focus so we can restore it on close (prevents aria-hidden warnings)
      try{ lastFocusBeforeMenu = document.activeElement; }catch(_){ lastFocusBeforeMenu = null; }

      document.body.classList.add("menu-open");
      try{ syncSideMenuA11y(); }catch(_){}

      // Move focus into the menu (close button first, otherwise first focusable)
      try{
        const first = sideMenu && sideMenu.querySelector("#btnMenuClose, button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
        first && first.focus && first.focus({ preventScroll: true });
      }catch(_){}
    }

    function closeSideMenu(){
      if (__isPinnedMenu()) { try{ syncSideMenuA11y(); }catch(_){} return; }

      // If focus is inside the menu, move it OUT before hiding (prevents aria-hidden on focused ancestor)
      try{
        const ae = document.activeElement;
        if (sideMenu && ae && sideMenu.contains(ae)){
          const restore = (lastFocusBeforeMenu && typeof lastFocusBeforeMenu.focus === "function")
            ? lastFocusBeforeMenu
            : btnMenuToggle;
          try{ ae.blur && ae.blur(); }catch(_){}
          restore && restore.focus && restore.focus({ preventScroll: true });
        }
      }catch(_){}

      document.body.classList.remove("menu-open");
      try{ syncSideMenuA11y(); }catch(_){}
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
    document.getElementById("viewFinishedInventory")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) setView("home"); }catch(_){ } });
    document.getElementById("viewMovements")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) setView("home"); }catch(_){ } });
    document.getElementById("viewMoveInventory")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) { resetMoveInvDirection(); setView("home"); } }catch(_){ } });
    document.getElementById("btnCloseOcr")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackOcr?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnGoMoveInventory")?.addEventListener("click", () => {
      try{ resetMoveInvDirection(); }catch(_){ }
      setView("moveInv");
      try{ renderMoveInv && renderMoveInv(); }catch(_){ }
    });
    document.getElementById("btnGoProdAnag")?.addEventListener("click", () => {
      activeAnagTab = "products";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.add("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
    
    document.getElementById("btnGoFinishedAnag")?.addEventListener("click", () => {
      activeAnagTab = "finished";
      activeProductsMacroGroup = "";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.remove("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
document.getElementById("btnGoInvCerea")?.addEventListener("click", () => { openInventoryOverlay(WAREHOUSE_CEREA); });
    document.getElementById("btnGoInvConcamarise")?.addEventListener("click", () => { openInventoryOverlay(WAREHOUSE_CONCA); });
    document.getElementById("btnGoFinishedInventory")?.addEventListener("click", () => { openFinishedInventoryOverlay(); });
document.getElementById("menuGoHome")?.addEventListener("click", () => { closeSideMenu(); setView("home"); });
    document.getElementById("menuGoOcr")?.addEventListener("click", () => { closeSideMenu(); startHomeOcr(); });
    document.getElementById("menuGoInvCerea")?.addEventListener("click", () => { closeSideMenu(); openInventoryOverlay(WAREHOUSE_CEREA); });
    document.getElementById("menuGoInvConcamarise")?.addEventListener("click", () => { closeSideMenu(); openInventoryOverlay(WAREHOUSE_CONCA); });
    document.getElementById("menuGoFinishedInventory")?.addEventListener("click", () => { closeSideMenu(); openFinishedInventoryOverlay(); });
    document.getElementById("menuGoMoveInventory")?.addEventListener("click", () => { closeSideMenu(); try{ resetMoveInvDirection(); }catch(_){ } setView("moveInv"); try{ renderMoveInv && renderMoveInv(); }catch(_){ } });
    document.getElementById("menuGoFlows")?.addEventListener("click", () => { closeSideMenu(); setView("flows"); try{ renderFlowsTable(); }catch(_){ } });
    document.getElementById("menuGoDaneaDdt")?.addEventListener("click", () => { closeSideMenu(); setView("daneaDdt"); try{ window.HubDaneaDdt && window.HubDaneaDdt.refresh && window.HubDaneaDdt.refresh(); }catch(_){ } });
    document.getElementById("menuGoRevenue")?.addEventListener("click", () => { closeSideMenu(); setView("revenue"); try{ window.HubRevenue && window.HubRevenue.refresh && window.HubRevenue.refresh(); }catch(_){ } });
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
        
    document.getElementById("menuGoFinishedProducts")?.addEventListener("click", () => {
      closeSideMenu();
      activeAnagTab = "finished";
      activeProductsMacroGroup = "";
      syncAnagHeaderTitle();
      try{ segProducts && segProducts.classList.remove("active"); segSuppliers && segSuppliers.classList.remove("active"); }catch(_){ }
      setView("anag");
      try{ renderAnag(); }catch(_){ }
    });
document.getElementById("btnCloseTrash")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
document.getElementById("btnCloseFlows")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });

    document.getElementById("btnCloseDaneaDdt")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnBackDaneaDdt")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      try{
        if (window.HubDaneaDdt && typeof window.HubDaneaDdt.backToList === "function"){
          window.HubDaneaDdt.backToList();
          return;
        }
      }catch(_){}
      setView("home");
    });

    // Fatturato (DDT completati con movimenti)
    document.getElementById("viewRevenue")?.addEventListener("click", (e) => { try{ if (e.target === e.currentTarget) setView("home"); }catch(_){ } });
    document.getElementById("btnCloseRevenue")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnBackRevenue")?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
      try{
        const det = document.getElementById("revDetailWrap");
        const isDet = !!(det && det.style.display !== "none");
        if (isDet && window.HubRevenue && typeof window.HubRevenue.backToList === "function"){
          window.HubRevenue.backToList();
          return;
        }
      }catch(_){ }
      setView("home");
    });
    document.getElementById("btnCloseMovements")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    document.getElementById("btnCloseMoveInv")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} try{ resetMoveInvDirection(); }catch(_){ } setView("home"); });
        document.getElementById("btnBackTrash")?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
btnBackAnag?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackFlows?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackMovements?.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){} setView("home"); });
    btnBackMoveInv?.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){}
      const hasMoveInvModal = !!(modalMoveInvQty && modalMoveInvQty.classList && modalMoveInvQty.classList.contains("open"));
      const hasMoveInvDirection = !!__moveInvFromWh;
      if (hasMoveInvModal){
        try{ closeMoveInvQtyModal(); }catch(_){ }
        return;
      }
      if (hasMoveInvDirection){
        try{ resetMoveInvDirection(); }catch(_){ }
        setView("moveInv");
        return;
      }
      setView("home");
    });
    document.getElementById("btnFlowsExport")?.addEventListener("click", () => { try{ exportMovementsCSV(); }catch(_){ } });
    // Flussi: ricerca intelligente (DDT caricati)
    const __flowsSearch = document.getElementById("flowsSearch");
    const __btnFlowsClear = document.getElementById("btnFlowsClear");
    if (__flowsSearch){
      __flowsSearch.addEventListener("input", () => { try{ renderFlowsTable(); }catch(_){ } });
      __flowsSearch.addEventListener("keydown", (e) => {
        if (!e) return;
        if (e.key === "Escape"){
          e.preventDefault();
          __flowsSearch.value = "";
          try{ renderFlowsTable(); }catch(_){ }
          return;
        }
        if (e.key === "Enter"){
          e.preventDefault();
          try{
            const list = renderFlowsTable && renderFlowsTable._lastFiltered ? renderFlowsTable._lastFiltered : [];
            const first = (Array.isArray(list) && list.length) ? list[0] : null;
            if (first && first.key) openFlowEdit(first.key);
          }catch(_){ }
        }
      });
    }
    if (__btnFlowsClear){
      __btnFlowsClear.addEventListener("click", () => {
        try{ if (__flowsSearch) __flowsSearch.value = ""; }catch(_){}
        try{ renderFlowsTable(); }catch(_){ }
        try{ __flowsSearch && __flowsSearch.focus(); }catch(_){}
      });
    }
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
    ["ocr","inventory","finishedInventory","flows","moveInv","anag"].forEach((k) => {
      const el = __views[k];
      if (!el) return;
      el.addEventListener("click", (e) => { if (e.target === el) setView("home"); });
    });

    if (docItemsTable) {
      docItemsTable.addEventListener("click", (ev) => {
        // Se stai editando la quantità, non interferire con la selezione riga
        if (ev.target && ev.target.closest && ev.target.closest("input.qtyInputInline, input.txtInputInline")) return;

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

        // Modifica codice / descrizione: click sul testo
        const codeCell = ev.target && ev.target.closest ? ev.target.closest(".jsEditCode") : null;
        if (codeCell) {
          ev.preventDefault();
          ev.stopPropagation();
          __beginInlineTextEdit(tr, "code");
          return;
        }
        const descCell = ev.target && ev.target.closest ? ev.target.closest(".jsEditDesc") : null;
        if (descCell) {
          ev.preventDefault();
          ev.stopPropagation();
          __beginInlineTextEdit(tr, "desc");
          return;
        }

        // Modifica U.M.: click sulla cella U.M.
        const uomCell = ev.target && ev.target.closest ? ev.target.closest(".jsEditUom") : null;
        if (uomCell) {
          ev.preventDefault();
          ev.stopPropagation();
          __beginInlineUomEdit(tr);
          return;
        }


// UI selection
        docItemsTable.querySelectorAll("tbody tr.is-selected").forEach(r => r.classList.remove("is-selected"));
        tr.classList.add("is-selected");

        try{ __docSelectedIndex = Number(tr.dataset.i); }catch(_){ __docSelectedIndex = -1; }

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

    // Home: cockpit "Scarichi flussi" (DaneaXML)
    const homeDaneaCockpit = document.getElementById("homeDaneaCockpit");
    const homeDaneaTicker = document.getElementById("homeDaneaTicker");
    const homeDaneaTickerTrack = document.getElementById("homeDaneaTickerTrack");
    const homeDaneaTickerSeq = document.getElementById("homeDaneaTickerSeq");
    const homeDaneaTickerSeqClone = document.getElementById("homeDaneaTickerSeqClone");
    const homeDaneaToggleBtn = document.getElementById("homeDaneaToggleBtn");


    const stockTbody = document.getElementById("stockTbody");
    const movTbody = document.getElementById("movTbody");
    const flowsTbody = document.getElementById("flowsTbody");
    const flowsSearch = document.getElementById("flowsSearch");
    const flowsMeta = document.getElementById("flowsMeta");
    const btnFlowsClear = document.getElementById("btnFlowsClear");
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

    // ===== Inventario prodotti finiti =====
    const fpInvPicker = document.getElementById("fpInvPicker");
    const fpInvDetail = document.getElementById("fpInvDetail");
    const fpInvDetailTitle = document.getElementById("fpInvDetailTitle");
    const pillFpInvWarehouse = document.getElementById("pillFpInvWarehouse");
    const pillFpStock = document.getElementById("pillFpStock");
    const btnFpInvPickCerea = document.getElementById("btnFpInvPickCerea");
    const btnFpInvPickConcamarise = document.getElementById("btnFpInvPickConcamarise");
    const btnFpInvBackPicker = document.getElementById("btnFpInvBackPicker");
    const btnBackFpInv = document.getElementById("btnBackFpInv");
    const btnCloseFpInv = document.getElementById("btnCloseFpInv");
    const fpInvSearch = document.getElementById("fpInvSearch");
    const fpInvFilterCategory = document.getElementById("fpInvFilterCategory");
    const fpStockTbody = document.getElementById("fpStockTbody");

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

      try{ __syncDockedControlsVisibility && __syncDockedControlsVisibility(); }catch(_){}

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

    // ===== Inventario prodotti finiti: sede unica =====
    function setFinishedInventoryWarehouse(){
      const wh = WAREHOUSE_FINISHED;
      __currentFinishedWarehouse = wh;

      // Sede unica: niente picker
      if (fpInvPicker) fpInvPicker.style.display = "none";
      if (fpInvDetail) fpInvDetail.style.display = "";

      try{ __syncDockedControlsVisibility && __syncDockedControlsVisibility(); }catch(_){ }

      if (pillFpInvWarehouse) {
        pillFpInvWarehouse.style.display = "inline-flex";
        pillFpInvWarehouse.textContent = "Sede unica";
      }
      if (fpInvDetailTitle) fpInvDetailTitle.textContent = "Inventario prodotti finiti";
    }

    function openFinishedInventoryOverlay(){
      setView("finishedInventory");
      setFinishedInventoryWarehouse();
      try{ renderAll(); }catch(_){ }
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

      // Inventario prodotti finiti
      btnFpInvPickCerea && btnFpInvPickCerea.addEventListener("click", () => { setFinishedInventoryWarehouse(WAREHOUSE_CEREA); renderAll(); });
      btnFpInvPickConcamarise && btnFpInvPickConcamarise.addEventListener("click", () => { setFinishedInventoryWarehouse(WAREHOUSE_CONCA); renderAll(); });
      btnFpInvBackPicker && btnFpInvBackPicker.addEventListener("click", () => { setFinishedInventoryWarehouse(""); renderAll(); });
      btnBackFpInv && btnBackFpInv.addEventListener("click", () => {
        setView("home");
      });
      btnCloseFpInv && btnCloseFpInv.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } setView("home"); });
    }catch(_){}
/****************************************************************
     * State
     ****************************************************************/
    let state = {
      settings: { ...DEFAULT_SETTINGS },
      movements: [], // array of Movement
      finishedMovements: [], // movimenti inventario prodotti finiti (sync)
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
        finishedMovements: null,
        thresholds: null,
        supplierDocs: null,
        finishedProducts: null,
        finishedProductCategories: null,
        daneaCompleted: null
      }
    };

    // 🔌 Bridge globale per moduli (DDT, Cestino, ecc.) — inizializzato DOPO fb (evita TDZ)
    function syncHubBridge(){
      try{
        globalThis.__HUB = globalThis.__HUB || {};
        globalThis.__HUB.fb = fb;
        globalThis.__HUB.ORG_ID = ORG_ID;
        globalThis.__HUB.setView = setView;
        globalThis.__HUB.closeSideMenu = closeSideMenu;
        globalThis.__HUB.orgCol = orgCol;

        // Espone anche state + util: serve a moduli esterni (es. Scarica Flussi DDT)
        // per poter leggere movimenti inventario e normalizzazioni.
        globalThis.__HUB.state = state;
        globalThis.__HUB.safeInt = safeInt;
        globalThis.__HUB.normalizeWarehouse = normalizeWarehouse;
        globalThis.__HUB.warehouseLabel = warehouseLabel;
        globalThis.__HUB.showToast = showToast;
        globalThis.__HUB.openModal = openModal;
        globalThis.__HUB.FS = (()=>{
          const FS = {
            collection, doc, setDoc, addDoc, deleteDoc, getDocs,
            onSnapshot, query, orderBy, serverTimestamp, deleteField, runTransaction
          };
          // opzionali (non far fallire il bridge se non importati)
          try { FS.updateDoc = updateDoc; } catch(_){}
          try { FS.getDoc = getDoc; } catch(_){}
          return FS;
        })();
        globalThis.__HUB.ready = true;
      }catch(e){
        console.warn("syncHubBridge failed", e);
      }
    }


    let suppliers = [];
    let products = [];
    let thresholds = {};
    let finishedProducts = []; // key -> number (from Firestore)

    // ===== Prodotti finiti: anti-duplicati per codice =====
    // Obiettivo: in Firestore non devono esistere 2+ documenti finishedProducts con lo stesso codeLower.
    // - Dedup automatico (best-effort) quando arriva lo snapshot realtime
    // - Creazione: se il codice esiste gia', aggiorna il doc esistente invece di crearne uno nuovo
    let __fpDedupRunning = false;
    let __fpDedupLastSig = "";
    let __fpDedupLastAt = 0;

    function __fpNormCode(v){
      return String(v || "").trim().toLowerCase();
    }

    function __fpTsMs(ts){
      try{
        if (!ts) return 0;
        if (typeof ts.toMillis === "function") return ts.toMillis();
        if (typeof ts.toDate === "function") return ts.toDate().getTime();
        if (ts instanceof Date) return ts.getTime();
        const s = String(ts || "");
        const d = new Date(s);
        const n = d.getTime();
        return Number.isFinite(n) ? n : 0;
      }catch(_){ return 0; }
    }

    function __fpGetComponents(fp){
      if (!fp) return [];
      const a = fp.components || fp.bom || fp.distintaBase || fp.distinta_base || [];
      return Array.isArray(a) ? a : [];
    }

    function __fpScoreDoc(fp){
      const name = String(fp && (fp.name || fp.nome) || "").trim();
      const uom = String(fp && (fp.uom || fp.um) || "").trim();
      const cat = String(fp && (fp.categoryKey || fp.category || fp.catKey || fp.categoryId) || "").trim();
      const comps = __fpGetComponents(fp);

      let score = 0;
      if (name) score += Math.min(20, Math.floor(name.length / 3));
      if (uom) score += 10;
      if (cat) score += 20;
      if (comps && comps.length) score += 100 + Math.min(50, comps.length);

      // preferisci documenti piu' recenti (solo tie-break, non e' un requisito funzionale)
      const t = __fpTsMs(fp && (fp.updatedAt || fp.createdAt));
      if (t) score += 1;
      return score;
    }

    function __fpPickCanonical(list){
      const arr = Array.isArray(list) ? list.slice() : [];
      arr.sort((a,b)=>{
        const sa = __fpScoreDoc(a);
        const sb = __fpScoreDoc(b);
        if (sb !== sa) return sb - sa;
        const ua = __fpTsMs(a && (a.updatedAt || a.createdAt));
        const ub = __fpTsMs(b && (b.updatedAt || b.createdAt));
        if (ub !== ua) return ub - ua;
        return String(a && a.id || "").localeCompare(String(b && b.id || ""));
      });
      return arr[0] || null;
    }

    function __fpMergeComponents(docs){
      const map = new Map();

      const put = (c)=>{
        if (!c) return;
        const code = String(c.code || c.codice || "").trim();
        const low = __fpNormCode(code);
        if (!low) return;

        const name = String(c.name || c.articolo || c.item || "").trim() || code;
        const uom = String(c.uom || c.um || "").trim();
        const pid = String(c.productId || c.pid || "").trim();
        const qtyNum = (c.qty != null && Number.isFinite(Number(c.qty))) ? Number(c.qty) : null;
        const qtyRaw = String(c.qtyRaw || c.qtaRaw || "").trim();
        const note = String(c.note || "").trim();

        const cur = map.get(low);
        if (!cur){
          map.set(low, { productId: pid, code, name, qty: qtyNum, qtyRaw, uom, note });
          return;
        }

        // merge: preferisci dati piu' completi
        if (!cur.productId && pid) cur.productId = pid;
        if ((!cur.name || cur.name === cur.code) && name) cur.name = name;
        if (!cur.uom && uom) cur.uom = uom;
        if (cur.qty == null && qtyNum != null) cur.qty = qtyNum;
        if (!cur.qtyRaw && qtyRaw) cur.qtyRaw = qtyRaw;
        if (!cur.note && note) cur.note = note;
      };

      (Array.isArray(docs) ? docs : []).forEach(fp=>{
        const comps = __fpGetComponents(fp);
        (Array.isArray(comps) ? comps : []).forEach(put);
      });

      const out = Array.from(map.values());
      out.sort((a,b)=>String(a.code||"").localeCompare(String(b.code||""), "it", { sensitivity:"base" }));
      return out;
    }

    function __fpFindDuplicateGroups(list){
      const by = new Map();
      (Array.isArray(list) ? list : []).forEach(fp=>{
        const id = String(fp && fp.id || "").trim();
        const codeLower = __fpNormCode(fp && (fp.codeLower || fp.code) || "");
        if (!id || !codeLower) return;
        const arr = by.get(codeLower) || [];
        arr.push(fp);
        by.set(codeLower, arr);
      });
      const groups = [];
      for (const [codeLower, arr] of by.entries()){
        if ((arr || []).length > 1) groups.push({ codeLower, items: arr.slice() });
      }
      groups.sort((a,b)=>String(a.codeLower).localeCompare(String(b.codeLower)));
      return groups;
    }

    function __fpDedupSignature(groups){
      try{
        return (groups||[]).map(g=>{
          const ids = (g.items||[]).map(x=>String(x && x.id || "").trim()).filter(Boolean).sort().join(",");
          return String(g.codeLower||"") + ":" + ids;
        }).join("|");
      }catch(_){ return ""; }
    }

    async function __fpDedupFinishedProducts(reason){
      if (__fpDedupRunning) return;
      if (!(fb && fb.user && fb.db)) return;

      const groups = __fpFindDuplicateGroups(finishedProducts || []);
      if (!groups.length) { __fpDedupLastSig = ""; return; }

      const sig = __fpDedupSignature(groups);
      const now = Date.now();
      if (sig && sig === __fpDedupLastSig && (now - (__fpDedupLastAt || 0)) < 15000) return;

      __fpDedupLastSig = sig;
      __fpDedupLastAt = now;

      // run async (non blocca render)
      setTimeout(async ()=>{
        if (__fpDedupRunning) return;
        if (!(fb && fb.user && fb.db)) return;

        const groups2 = __fpFindDuplicateGroups(finishedProducts || []);
        if (!groups2.length) return;

        __fpDedupRunning = true;
        const actor = (fb.user && (fb.user.email || fb.user.uid)) || "";
        let removed = 0;
        let merged = 0;

        try{
          try{ showToast("Prodotti finiti: unifico codici duplicati…", "warn"); }catch(_){ }

          for (const g of groups2){
            const codeLower = String(g.codeLower || "").trim().toLowerCase();
            const docs = Array.isArray(g.items) ? g.items.slice() : [];
            if (!codeLower || docs.length < 2) continue;

            const keep = __fpPickCanonical(docs) || docs[0];
            const keepId = String(keep && keep.id || "").trim();
            if (!keepId) continue;

            const others = docs.filter(x => {
              const id = String(x && x.id || "").trim();
              return id && id !== keepId;
            });
            if (!others.length) continue;

            const nameBest = (()=>{
              const prefer = String(keep && (keep.name || keep.nome) || "").trim();
              if (prefer) return prefer;
              let best = "";
              for (const d of docs){
                const nm = String(d && (d.name || d.nome) || "").trim();
                if (nm && nm.length > best.length) best = nm;
              }
              return best || codeLower;
            })();

            const codeBest = (()=>{
              const c = String(keep && keep.code || "").trim();
              if (c) return c;
              for (const d of docs){
                const cc = String(d && d.code || "").trim();
                if (cc) return cc;
              }
              return String(codeLower || "");
            })();

            const uomBest = (()=>{
              const u = String(keep && (keep.uom || keep.um) || "").trim();
              if (u) return u;
              for (const d of docs){
                const uu = String(d && (d.uom || d.um) || "").trim();
                if (uu) return uu;
              }
              return "";
            })();

            const catBest = (()=>{
              const k = String(keep && (keep.categoryKey || keep.category || keep.catKey || keep.categoryId) || "").trim();
              if (k) return k;
              for (const d of docs){
                const kk = String(d && (d.categoryKey || d.category || d.catKey || d.categoryId) || "").trim();
                if (kk) return kk;
              }
              return "";
            })();

            const mergedComps = __fpMergeComponents(docs);

            const payload = {
              name: nameBest,
              nameLower: String(nameBest || "").toLowerCase(),
              code: codeBest,
              codeLower: String(codeLower || "").toLowerCase(),
              updatedAt: serverTimestamp(),
              updatedBy: actor
            };
            if (uomBest) payload.uom = uomBest;
            if (catBest){
              payload.categoryKey = catBest;
              payload.categoryKeyLower = String(catBest).toLowerCase();
            }
            if (mergedComps && mergedComps.length) payload.components = mergedComps;

            await runTransaction(fb.db, async (tx)=>{
              tx.set(doc(fb.db, "orgs", ORG_ID, "finishedProducts", keepId), payload, { merge: true });
              for (const o of others){
                const oid = String(o && o.id || "").trim();
                if (!oid) continue;
                tx.delete(doc(fb.db, "orgs", ORG_ID, "finishedProducts", oid));
              }
            });

            // trash: best-effort (fuori transazione)
            for (const o of others){
              const oid = String(o && o.id || "").trim();
              if (!oid) continue;
              const nm = String(o && (o.name || o.nome) || "").trim() || "Prodotto finito";
              const cd = String(o && o.code || "").trim();
              try{ await trashPut({ kind:"finishedProduct", label: `${cd ? cd + " — " : ""}${nm} (dup)`, target:{ col:"finishedProducts", id: oid, code: cd }, data: o ? {...o} : { name:nm, code:cd } }); }catch(_){ }
            }

            removed += others.length;
            merged += 1;
          }

          if (merged && removed){
            try{ showToast(`Prodotti finiti unificati: ${merged} codici • rimossi ${removed} duplicati`, "ok"); }catch(_){ }
          }
        }catch(e){
          console.warn("finishedProducts dedup failed", e);
          __fpDedupLastSig = ""; // allow retry
          try{ showToast("Errore unifica prodotti finiti", "err"); }catch(_){ }
        }finally{
          __fpDedupRunning = false;
          try{ renderAnag(); }catch(_){ }
        }
      }, 500);
    }

    let finishedProductCategories = []; // elenco categorie prodotti finiti (from Firestore)
    let finishedProductCategoriesMap = new Map(); // keyLower -> {key,name,...}

    // DaneaXML: DDT completati (usati per il ticker in Dashboard)
    let __daneaCompleted = [];
    let __daneaCompletedMap = new Map();

    function __rebuildDaneaCompletedMap(){
      try{
        const map = new Map();
        for (const d of (__daneaCompleted || [])) {
          if (!d) continue;
          let k = String(d.key || d._id || '').trim();
          if (!k) {
            try{ k = decodeURIComponent(String(d.id || d._id || '')); }catch(_){ k = String(d.id || d._id || ''); }
            k = String(k||'').trim();
          }
          if (!k) continue;
          map.set(k, d);
        }
        __daneaCompletedMap = map;
      }catch(_){ __daneaCompletedMap = new Map(); }
    }
    let activeAnagTab = "suppliers"; // suppliers|products|finished
    let activeProductsMacroGroup = ""; // materie_prime|imballaggi|"" (tutti)

    // Selezione multipla prodotti finiti (per associazione categoria)
    let __fpSelectedIds = new Set();

    function __fpSelPurgeAgainstList(){
      try{
        const valid = new Set((finishedProducts || []).map(x => String(x && x.id || "").trim()).filter(Boolean));
        const next = new Set();
        __fpSelectedIds.forEach(id => { if (valid.has(String(id))) next.add(String(id)); });
        __fpSelectedIds = next;
      }catch(_){ }
    }

    function __fpVisibleIds(){
      try{
        return Array.from(document.querySelectorAll('#anagTbody input.jsFpSel')).map(el => String(el.getAttribute('data-id') || '').trim()).filter(Boolean);
      }catch(_){ return []; }
    }

    function __fpSyncSelectAllState(){
      try{
        const all = document.getElementById('fpSelectAll');
        if (!all) return;
        const ids = __fpVisibleIds();
        if (!ids.length){ all.checked = false; all.indeterminate = false; return; }
        let sel = 0;
        for (const id of ids){ if (__fpSelectedIds.has(id)) sel++; }
        all.checked = (sel > 0 && sel === ids.length);
        all.indeterminate = (sel > 0 && sel < ids.length);
      }catch(_){ }
    }

    function __fpRenderAssignControls(){
      const wrap = document.getElementById('fpAssignWrap');
      const sel  = document.getElementById('fpAssignCat');
      const flt  = document.getElementById('fpFilterUnclassified');
      const btn  = document.getElementById('btnFpAssignCat');
      const pill = document.getElementById('fpSelectedPill');
      const btnClear = document.getElementById('btnFpClearSel');
      if (!wrap || !sel || !btn) return;

      const on = (activeAnagTab === 'finished');
      wrap.style.display = on ? 'flex' : 'none';
      if (!on) return;

      // bind once
      try{
        if (wrap.dataset.bound !== '1'){
          wrap.dataset.bound = '1';
          sel.addEventListener('change', () => {
            try{ __fpRenderAssignControls(); }catch(_){ }
          });
          flt && flt.addEventListener('change', () => {
            try{ renderAnag(); }catch(_){ }
            try{ __fpSyncSelectAllState(); }catch(_){ }
          });
          btn.addEventListener('click', async (e) => {
            try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
            try{ await __fpAssignSelectedToCategory(); }catch(_){ }
          });
          btnClear && btnClear.addEventListener('click', (e) => {
            try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
            __fpSelectedIds.clear();
            __fpRenderAssignControls();
            try{ renderAnag(); }catch(_){ }
          });
        }
      }catch(_){ }

      // options
      try{
        const prev = String(sel.value || '');
        const opts = [];
        opts.push('<option value="">Categoria prodotti finiti…</option>');
        opts.push('<option value="__none">Rimuovi categoria</option>');
        if (Array.isArray(finishedProductCategories) && finishedProductCategories.length){
          for (const c of finishedProductCategories){
            const k = String(c && c.key || '').trim();
            if (!k) continue;
            const nm = String(c && (c.name || c.label || c.key) || k).trim() || k;
            opts.push('<option value="' + escapeHtmlAttr(k) + '">' + escapeHtml(nm) + '</option>');
          }
        } else {
          opts.push('<option value="" disabled>— Nessuna categoria —</option>');
        }
        sel.innerHTML = opts.join('');
        if (prev && Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;
      }catch(_){ }

      // pills + enable
      try{
        const n = __fpSelectedIds.size;
        if (pill) pill.textContent = n ? ('Selezionati: ' + n.toLocaleString('it-IT')) : 'Seleziona';
        if (btnClear) btnClear.style.display = n ? 'inline-flex' : 'none';
        const key = String(sel.value || '').trim();
        btn.disabled = !(n && key);
      }catch(_){ }
    }

    async function __fpAssignSelectedToCategory(){
      if (!(fb && fb.user && fb.db)) { showToast('Accedi con Google', 'warn'); return; }
      const sel  = document.getElementById('fpAssignCat');
      const btn  = document.getElementById('btnFpAssignCat');
      if (!sel || !btn) return;
      const key = String(sel.value || '').trim();
      if (!key) { showToast('Seleziona una categoria', 'warn'); return; }
      if (!__fpSelectedIds.size) { showToast('Seleziona almeno un prodotto', 'warn'); return; }

      const ids = Array.from(__fpSelectedIds);
      const removing = (key === '__none');

      try{ btn.disabled = true; }catch(_){ }
      try{ showToast(removing ? 'Rimozione categoria…' : 'Associazione categoria…'); }catch(_){ }

      try{
        let clearedSingolo = 0;
        for (const id of ids){
          const fid = String(id || '').trim();
          if (!fid) continue;

          const fp = (Array.isArray(finishedProducts) ? finishedProducts : []).find(x => String(x && x.id || '') === fid) || null;
          const hadDirectBom = fp ? (__fpDirectComponents(fp).length > 0) : false;

          const payload = removing
            ? { categoryKey: deleteField(), categoryKeyLower: deleteField() }
            : {
                categoryKey: key,
                categoryKeyLower: String(key).toLowerCase(),
                // Se era "Singolo", quando lo assegno a una categoria deve ereditare la distinta base della categoria
                components: deleteField(),
                bom: deleteField(),
                distintaBase: deleteField()
              };

          if (!removing && hadDirectBom) clearedSingolo++;

          await setDoc(doc(fb.db, 'orgs', ORG_ID, 'finishedProducts', fid), payload, { merge: true });
        }
        __fpSelectedIds.clear();
        try{ sel.value = ''; }catch(_){ }
        if (!removing && clearedSingolo){
          showToast(`Categoria associata. ${clearedSingolo} prodotti ora ereditano la distinta della categoria.`);
        } else {
          showToast(removing ? 'Categoria rimossa' : 'Prodotti finiti associati');
        }
      }catch(e){
        console.warn('assign selected finished products failed', e);
        showToast('Errore associazione', 'err');
      } finally {
        try{ btn.disabled = false; }catch(_){ }
        __fpRenderAssignControls();
        try{ renderAnag(); }catch(_){ }
      }
    }


    function syncAnagHeaderTitle(){
      const el = document.getElementById("anagHeaderTitle");
      if (!el) return;

      if (activeAnagTab === "products") {
        const mg = String(activeProductsMacroGroup || "").trim();
        if (mg === "materie_prime") el.textContent = "Prodotti — Materie prime";
        else if (mg === "imballaggi") el.textContent = "Prodotti — Imballaggi";
        else el.textContent = "Prodotti";
        return;
      }

      if (activeAnagTab === "finished") {
        el.textContent = "Prodotti finiti";
        return;
      }

      el.textContent = "Fornitori";
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

        try{ syncHubBridge(); }catch(e){ console.warn("syncHubBridge call failed", e); }

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
          try{ syncHubBridge(); }catch(e){ console.warn("syncHubBridge auth refresh failed", e); }

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
      finishedProducts = [];
      finishedProductCategories = [];
      finishedProductCategoriesMap = new Map();
      __daneaCompleted = [];
      __daneaCompletedMap = new Map();
      try{ __fpSelectedIds.clear(); }catch(_){ }

      // Inventario prodotti finiti: nessun fallback locale
      try{ state.finishedMovements = []; }catch(_){ }
      try{ __currentFinishedWarehouse = WAREHOUSE_FINISHED; }catch(_){ }

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
      // Finished Products (Anagrafica prodotti finiti)
      fb.unsub.finishedProducts = onSnapshot(
        query(orgCol("finishedProducts"), orderBy("nameLower")),
        (snap) => {
          finishedProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          try{ __fpDedupFinishedProducts("realtime"); }catch(_){ }
          renderAnag();
        },
        (err) => {
          console.error("finishedProducts watch error", err);
        }
      );

      // Finished Product Categories (per assegnazione in tab "Prodotti finiti")
      fb.unsub.finishedProductCategories = onSnapshot(
        query(orgCol("finishedProductCategories"), orderBy("nameLower")),
        (snap) => {
          finishedProductCategories = snap.docs.map(d => {
            const data = d.data() || {};
            let key = String(data.key || "").trim();
            if (!key) {
              try{ key = decodeURIComponent(String(d.id||"")); }catch(_){ key = String(d.id||""); }
            }
            key = String(key || "").trim().toLowerCase();
            const name = String(data.name || data.label || key || "").trim() || key;
            return { key, name, ...data };
          }).filter(x => x && x.key);
          finishedProductCategoriesMap = new Map(finishedProductCategories.map(c => [String(c && c.key || "").trim().toLowerCase(), c]));
          renderAnag();
        },
        (err) => {
          console.error("finishedProductCategories watch error", err);
        }
      );

      // DaneaXML: DDT completati (serve per dashboard ticker)
      fb.unsub.daneaCompleted = onSnapshot(
        query(orgCol("daneaDdtCompleted"), orderBy("date", "desc")),
        (snap) => {
          try{
            const arr = [];
            snap.forEach(d => {
              const data = d.data() || {};
              let key = String(data.key || "").trim();
              if (!key){
                try{ key = decodeURIComponent(String(d.id||"")); }catch(_){ key = String(d.id||""); }
                key = String(key||"").trim();
              }
              arr.push({
                _id: d.id,
                key,
                number: String(data.number || "").trim(),
                date: String(data.date || "").trim(),
                customer: String(data.customer || "").trim(),
                rows: Array.isArray(data.rows) ? data.rows : [],
                allocations: Array.isArray(data.allocations) ? data.allocations : [],
                createdAt: tsToIso(data.createdAt) || ""
              });
            });
            __daneaCompleted = arr;
            __rebuildDaneaCompletedMap();
          }catch(_){ __daneaCompleted = []; __daneaCompletedMap = new Map(); }
          try{ renderAll(); }catch(_){ }
        },
        (err) => {
          console.error("daneaDdtCompleted watch error", err);
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
              // DaneaXML: chiave completa del DDT (numero__data). Serve per raggruppare
              // correttamente i movimenti e mostrare le righe DDT nel dettaglio.
              daneaDdtKey: String(data.daneaDdtKey || data.daneaDdtkey || "").trim(),
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

      // Finished inventory movements (Prodotti finiti)
      fb.unsub.finishedMovements = onSnapshot(
        query(orgCol("finishedInventoryMovements"), orderBy("createdAt")),
        (snap) => {
          state.finishedMovements = snap.docs.map(d => {
            const data = d.data() || {};
            return {
              id: d.id,
              type: data.type || "IN",
              code: data.code || "",
              item: data.item || "",
              uom: String(data.uom || "").trim(),
              qtyRaw: String(data.qtyRaw || "").trim(),
              qty: safeInt(data.qty),
              date: data.date || "",
              note: data.note || "",
              source: data.source || "Manual",
              warehouse: WAREHOUSE_FINISHED,
              createdAt: tsToIso(data.createdAt) || data.createdAtIso || ""
            };
          });
          renderAll();
        },
        (err) => {
          console.error("finishedMovements watch error", err);
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
    const WAREHOUSE_FINISHED = "prodotti_finiti";

    function normalizeWarehouse(v){
      const s = String(v || "").trim().toLowerCase();
      if (!s) return WAREHOUSE_CEREA;
      // Prodotti finiti (sede unica)
      if (s === WAREHOUSE_FINISHED || s === "pf" || s === "finiti" || s === "prodotti finiti" || s === "prodotti_finiti" || s.includes("finit")) return WAREHOUSE_FINISHED;
      if (s === "concamarise") return WAREHOUSE_CONCA;
      if (s === "cerea") return WAREHOUSE_CEREA;
      if (s.includes("conca")) return WAREHOUSE_CONCA;
      if (s.includes("cerea") || s.startsWith("cer")) return WAREHOUSE_CEREA;
      return WAREHOUSE_CEREA;
    }

    function warehouseLabel(v){
      const w = normalizeWarehouse(v);
      if (w === WAREHOUSE_FINISHED) return "Prodotti finiti";
      return (w === WAREHOUSE_CONCA) ? "Inventario Concamarise" : "Inventario Cerea";
    }

    function stockRowKey(customer, code, warehouse){
      return `${normalizeWarehouse(warehouse)}||${movementKey(customer, code)}`;
    }

    function fpStockRowKey(code, warehouse){
      const w = normalizeWarehouse(warehouse || WAREHOUSE_FINISHED);
      return `${w}||${String(code || "").trim().toLowerCase()}`;
    }

    // "" => nessun inventario selezionato (picker)
    let __currentWarehouse = "";
    // "" => nessuna sede selezionata (picker)
    let __currentFinishedWarehouse = WAREHOUSE_FINISHED;

    function downloadBlob(filename, content, mime="text/plain") {
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
    let __docSelectedIndex = -1;

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
    // Canoniche richieste: nr / pz / kg / ton (+ lt / g / ml)
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
      // litri
      if (k === "l" || k === "lt" || k === "ltri" || k === "litri" || k === "litro" || k === "litri." || k === "litro.") return "lt";
      // grammi
      if (k === "g" || k === "gr" || k === "grammi" || k === "grammo") return "g";
      // millilitri
      if (k === "ml" || k === "millilitri" || k === "millilitro") return "ml";
      // tonnellate
      if (k === "ton" || k === "tons" || k === "tonn" || k === "tonne" || k === "t" || k === "tonnellate" || k === "tonnellata") return "ton";

      return "";
    }

    // Estrae (qtyRaw, uom) da una stringa quantità, supportando:
    // - "1760 PZ", "1760pz", "NR 10", "10 nr", "48 kg", "12 lt", "250 ml", "1,2 t" …
    function __splitQtyUom(qtyPart){
      const s0 = String(qtyPart ?? "").trim();
      if (!s0) return { qtyRaw: "", uom: "" };

      let s = s0.replace(/\s+/g, " ").trim();
      let uom = "";
      let qtyRaw = s;

      // 1) uom in coda (anche attaccata al numero)
      const end = s.match(/(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|g(?:r|rammi|rammo)?\.?|ml\.?|l(?:t|itri|itro)?\.?|lt\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\s*$/i);
      if (end && end.index != null) {
        const cand = __normalizeUom(end[1]);
        if (cand) {
          uom = cand;
          qtyRaw = s.slice(0, end.index).trim();
        }
      }

      // 2) uom in testa (es: "NR 10")
      if (!uom) {
        const beg = s.match(/^\s*(nr\.?|n\.?|n°|pz\.?|p\.?z\.?|pcs?|kg(?:s)?\.?|g(?:r|rammi|rammo)?\.?|ml\.?|l(?:t|itri|itro)?\.?|lt\.?|ton(?:nellate|nellata|ne|n|s)?\.?|t)\b\s*/i);
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
        const qtyVal = (it.qty != null && it.qty !== "" && !Number.isNaN(Number(it.qty)))
          ? String(it.qty)
          : (it.qtyRaw ? String(it.qtyRaw).replace(/[^\d,\.]/g,"").trim() : "");

        return `<tr data-i="${i}" data-code="${escapeHtmlAttr(code)}" data-desc="${escapeHtmlAttr(desc)}" data-uom="${escapeHtmlAttr(uom)}" data-qty="${escapeHtmlAttr(qtyVal)}">
          <td data-label="Codice" class="code">
            <div class="codeCellWrap">
              <button type="button" class="rowMinus" aria-label="Elimina riga">–</button>
              <span class="codeTxt jsEditCode" title="Clicca per modificare">${escapeHtml(code || "-")}</span>
            </div>
          </td>
          <td data-label="Descrizione">
            <span class="descTxt jsEditDesc" title="Clicca per modificare">${escapeHtml(desc || "-")}</span>
          </td>
          <td data-label="U.M." class="num"><span class="uomTxt jsEditUom" title="Clicca per modificare">${escapeHtml(uom || "-")}</span></td>
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
          if (__isConaiItem(it)) return false;
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

      // Ripristina selezione riga (best-effort)
      try{
        const idx = Number(__docSelectedIndex);
        if (!Number.isNaN(idx) && idx >= 0){
          const sel = tbody.querySelector(`tr[data-i="${idx}"]`);
          if (sel) sel.classList.add("is-selected");
        }
      }catch(_){}

      __refreshConfirmMovementEnabled();
    }

    function __deleteDocItemByIndex(i){
      const items = __getDocItemsArr();
      if (!Array.isArray(items)) return;
      if (Number.isNaN(i) || i < 0 || i >= items.length) return;

      items.splice(i, 1);

      // Aggiorna selezione (best-effort)
      try{
        if (__docSelectedIndex === i){
          __docSelectedIndex = Math.min(i, items.length - 1);
          if (items.length <= 0) __docSelectedIndex = -1;
        } else if (__docSelectedIndex > i){
          __docSelectedIndex = __docSelectedIndex - 1;
        }
      }catch(_){}

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

    function __ensureOcrUomDatalist(){
      try{
        let dl = document.getElementById("ocrUomDatalist");
        if (dl) return dl;
        dl = document.createElement("datalist");
        dl.id = "ocrUomDatalist";
        ["pz","nr","kg","ton","lt","g","ml"].forEach((u) => {
          const opt = document.createElement("option");
          opt.value = u;
          dl.appendChild(opt);
        });
        document.body.appendChild(dl);
        return dl;
      }catch(_){ return null; }
    }

    function __beginInlineUomEdit(tr){
      if (!tr) return;
      const idx = Number(tr.dataset.i);
      if (Number.isNaN(idx)) return;

      const items = __getDocItemsArr();
      const it = items[idx];
      if (!it) return;

      const tdUom = tr.querySelector('td[data-label="U.M."]');
      if (!tdUom) return;

      if (tdUom.querySelector("input.uomInputInline")) return;

      const current = String(it.uom || "").trim();

      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.className = "txtInputInline uomInputInline";
      input.inputMode = "text";
      input.value = current;

      // suggerimenti (pz/nr/kg/ton/lt/g/ml)
      try{
        const dl = __ensureOcrUomDatalist();
        if (dl) input.setAttribute("list", dl.id);
      }catch(_){ }

      // keep row selected
      __docSelectedIndex = idx;

      tdUom.innerHTML = "";
      tdUom.appendChild(input);
      input.focus();
      try { input.select(); } catch(_e){}

      let cancelled = false;

      const commit = () => {
        if (cancelled) return;
        const raw = String(input.value || "").trim();
        const cleanRaw = (raw && raw !== "-") ? raw : "";
        const norm = __normalizeUom(cleanRaw);
        // se non è tra le canoniche, conserva comunque il valore inserito (lower)
        it.uom = norm || (cleanRaw ? cleanRaw.toLowerCase() : "");

        // aggiorna qtyRaw per riflettere la nuova U.M.
        try{
          const prev = String(it.qtyRaw || "").trim();
          const split = __splitQtyUom(prev);
          const qtyOnly = String(split.qtyRaw || prev || (it.qty != null ? it.qty : "")).trim();
          const uomNow = String(it.uom || "").trim();
          it.qtyRaw = (qtyOnly ? `${qtyOnly}${uomNow ? " " + uomNow : ""}`.trim() : "");
        }catch(_){ }

        __rerenderDocItemsTable();
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); input.blur(); }
        if (e.key === "Escape") { e.preventDefault(); cancelled = true; __rerenderDocItemsTable(); }
      });
      input.addEventListener("blur", commit);
    }


    function __beginInlineTextEdit(tr, field){
      if (!tr) return;
      const idx = Number(tr.dataset.i);
      if (Number.isNaN(idx)) return;

      const items = __getDocItemsArr();
      const it = items[idx];
      if (!it) return;

      const isCode = String(field || "") === "code";
      const td = tr.querySelector(isCode ? 'td[data-label="Codice"]' : 'td[data-label="Descrizione"]');
      if (!td) return;

      if (td.querySelector("input.txtInputInline")) return;

      const current = String(isCode ? (it.code || "") : (it.description || "")).trim();

      const input = document.createElement("input");
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
      input.className = "txtInputInline " + (isCode ? "codeInputInline" : "descInputInline");
      input.value = current;

      // keep row selected
      __docSelectedIndex = idx;

      if (isCode){
        const minus = td.querySelector("button.rowMinus");
        td.innerHTML = "";
        const wrap = document.createElement("div");
        wrap.className = "codeCellWrap";
        if (minus) wrap.appendChild(minus);
        else{
          const b = document.createElement("button");
          b.type = "button";
          b.className = "rowMinus";
          b.setAttribute("aria-label","Elimina riga");
          b.textContent = "–";
          wrap.appendChild(b);
        }
        wrap.appendChild(input);
        td.appendChild(wrap);
      } else {
        td.innerHTML = "";
        td.appendChild(input);
      }

      input.focus();
      try{ input.select(); }catch(_){}

      let cancelled = false;

      const commit = () => {
        if (cancelled) return;
        const v = String(input.value || "").trim();
        if (isCode) it.code = v;
        else it.description = v;
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
            const itemOk = String((it && (it.description || it.item)) || "").trim().length > 0;
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

    function computeFinishedStockByWarehouse() {
      const stock = new Map();
      const latestByKey = new Map();

      for (const mv of (state.finishedMovements || [])) {
        const warehouse = WAREHOUSE_FINISHED; // sede unica
        const code = (mv.code || "").trim();
        if (!code) continue;
        const low = code.toLowerCase();
        const item = (mv.item || "").trim();
        const k = low;

        const cur = stock.get(k) || {
          warehouse,
          code,
          item,
          uom: "",
          qty: 0,
          lastMoveAt: ""
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
  const mid = String(id || "").trim();
  if (!mid) return;

  // Se sei loggato, prova una cancellazione "strict" (se fallisce, alza errore)
  if (fb.user && fb.db) {
    try {
      await deleteDoc(doc(fb.db, "orgs", ORG_ID, "inventoryMovements", mid));
    } catch (e) {
      throw e;
    }
  }

  // Cleanup/UI (include docPages + tripletKey best-effort)
  await deleteMovementsBulk([mid]);
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


    /* =========================================================
       HOME — Cockpit Scarichi flussi DDT (DaneaXML)
       - Legge i movimenti OUT con source=DaneaXML e li raggruppa per DDT
       - UI: ticker testo grande su sfondo bianco (NO cards)
       ========================================================= */
    let __homeDaneaMarqueeBound = false;
    // Vertical ticker (step every few seconds)
    let __homeDaneaMarqueeRaf = 0;          // interval id
    let __homeDaneaMarqueeIdx = 0;          // current item index
    let __homeDaneaMarqueeItems = [];       // array of HTML strings (1 item per slide)
    let __homeDaneaMarqueeSig = "";         // signature to avoid restarting on every render
    let __homeDaneaMarqueePaused = false;   // pause on hover/focus
    let __homeDaneaMarqueeBusy = false;     // running transition
    let __homeDaneaMarqueeH = 0;            // cached slide height

    // Lock cockpit height to the "Categorie" tile (prevents layout stretching on refresh)
    let __homeDaneaLockedTileH = 0;
    function __homeDaneaLockCockpitHeight(){
      try{
        if (!homeDaneaCockpit) return (__homeDaneaLockedTileH || 0);
        const btn = document.getElementById("btnGoCategories");
        if (!btn) return (__homeDaneaLockedTileH || 0);

        const r = (btn.getBoundingClientRect ? btn.getBoundingClientRect() : null);
        const h = Math.round((r && r.height) || 0);
        if (h > 10){
          if (h !== __homeDaneaLockedTileH){
            __homeDaneaLockedTileH = h;
            // hard lock (same height as tile "Categorie")
            homeDaneaCockpit.style.height = h + "px";
            homeDaneaCockpit.style.minHeight = h + "px";
            homeDaneaCockpit.style.maxHeight = h + "px";
          }
          return h;
        }
      }catch(_){ }
      return (__homeDaneaLockedTileH || 0);
    }

    function __fmtDateShortIT(v){
      const s = String(v || "").trim();
      if (!s) return "—";
      // ISO o YYYY-MM-DD
      try{
        const iso = (/^\d{4}-\d{2}-\d{2}$/.test(s)) ? (s + "T00:00:00") : s;
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return s;
        return d.toLocaleDateString("it-IT");
      }catch(_){
        return s;
      }
    }

    function __daneaPickDone(key, docNum, date){
      try{
        const k = String(key || "").trim();
        const n = String(docNum || "").trim();
        const d = String(date || "").trim();

        const cand = [];
        if (k) cand.push(k);
        if (n && d) cand.push(n + "__" + d);
        if (n) cand.push(n);

        for (const x of cand){
          try{
            if (__daneaCompletedMap && typeof __daneaCompletedMap.get === "function"){
              if (__daneaCompletedMap.has(x)) return __daneaCompletedMap.get(x);
              const enc = encodeURIComponent(x);
              if (__daneaCompletedMap.has(enc)) return __daneaCompletedMap.get(enc);
              try{
                const dec = decodeURIComponent(x);
                if (__daneaCompletedMap.has(dec)) return __daneaCompletedMap.get(dec);
              }catch(_){ }
            }
          }catch(_){ }
        }

        // fallback scan (nel dubbio)
        const arr = Array.isArray(__daneaCompleted) ? __daneaCompleted : [];
        for (const d0 of arr){
          const dk = String(d0 && (d0.key || d0._id || "") || "").trim();
          if (!dk) continue;
          for (const x of cand){
            if (dk === x) return d0;
          }
        }
      }catch(_){ }
      return null;
    }

    function __daneaEllipsis(s, maxLen){
      const str = String(s || "").replace(/\s+/g, " ").trim();
      const max = Math.max(10, Number(maxLen) || 0);
      if (!str) return "";
      if (str.length <= max) return str;
      return str.slice(0, Math.max(0, max - 1)).trim() + "…";
    }

    function __daneaParseNum(v){
      if (v == null) return null;
      if (typeof v === "number" && Number.isFinite(v)) return v;
      const s0 = String(v || "").trim();
      if (!s0) return null;

      // frazione 1/20
      const m = s0.match(/^(-?\d+(?:[\.,]\d+)?)\s*\/\s*(\d+(?:[\.,]\d+)?)$/);
      if (m){
        const a = Number(String(m[1]).replace(",", "."));
        const b = Number(String(m[2]).replace(",", "."));
        if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
      }

      let s = s0.replace(/\s+/g, "");
      if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
      else if (s.includes(",")) s = s.replace(",", ".");

      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }

    function __daneaFmtNum(v){
      const n = Number(v);
      if (!Number.isFinite(n)) return "";
      const isInt = Math.abs(n - Math.round(n)) < 1e-9;
      return n.toLocaleString("it-IT", { maximumFractionDigits: isInt ? 0 : 2 });
    }

    function __daneaSummarizeFinished(rows, maxItems){
      const arr0 = Array.isArray(rows) ? rows : [];
      const max = Math.max(1, Number(maxItems) || 3);
      if (!arr0.length) return "";

      // unique by code (best) or by desc
      const seen = new Set();
      const uniq = [];
      for (const r of arr0){
        if (!r) continue;
        const code = String(r.code || "").trim();
        const desc = String(r.desc || r.item || r.name || "").trim();
        const k = String((code || desc) || "").trim().toLowerCase();
        if (!k || seen.has(k)) continue;
        seen.add(k);

        const name = __daneaEllipsis(desc || code, 28);
        const q0 = (r.qty != null) ? __daneaParseNum(r.qty) : null;
        const q1 = (q0 != null) ? q0 : __daneaParseNum(r.qtyRaw);
        const qtyTxt = (q1 != null) ? __daneaFmtNum(q1) : String(r.qtyRaw || "").trim();
        const uom = String(r.uom || "").trim();
        const qWith = qtyTxt ? (qtyTxt + (uom ? (" " + uom) : "")) : "";

        uniq.push(qWith ? (name + " × " + qWith) : name);
      }

      if (!uniq.length) return "";
      const show = uniq.slice(0, max);
      const more = Math.max(0, uniq.length - show.length);
      return show.join(", ") + (more ? (" +" + more) : "");
    }

    function __daneaSummarizeAllocations(allocations, maxItems){
      const arr0 = Array.isArray(allocations) ? allocations : [];
      const max = Math.max(1, Number(maxItems) || 4);
      if (!arr0.length) return "";

      const sorted = arr0.slice().sort((a,b) => (Number(b && b.qty || 0) - Number(a && a.qty || 0)));
      const show = sorted.slice(0, max);
      const out = [];
      for (const it of show){
        if (!it) continue;
        const name = __daneaEllipsis(String(it.name || it.item || it.code || "").trim() || String(it.code || "").trim(), 26);
        const qv = __daneaParseNum(it.qty);
        const qtyTxt = __daneaFmtNum((qv != null) ? qv : (Number(it.qty) || 0));
        const uom = String(it.uom || "").trim();
        const qWith = qtyTxt ? (qtyTxt + (uom ? (" " + uom) : "")) : "";
        if (!name) continue;
        out.push(qWith ? (name + " " + qWith) : name);
      }

      if (!out.length) return "";
      const more = Math.max(0, sorted.length - show.length);
      return out.join(", ") + (more ? (" +" + more) : "");
    }

    function __getHomeDaneaGroups(){
      const list = Array.isArray(state && state.movements) ? state.movements : [];
      const byKey = new Map();

      for (const mv of list){
        if (!mv) continue;
        if (String(mv.type || "").toUpperCase() !== "OUT") continue;
        const src = String(mv.source || "").trim().toLowerCase();
        if (src !== "daneaxml") continue;

        const docNum = String(mv.docNum || "").trim();
        const date = String(mv.date || "").trim();
        const key = String(mv.daneaDdtKey || "").trim() || ((docNum && date ? (docNum + "__" + date) : "")) || docNum;
        if (!key) continue;

        let g = byKey.get(key);
        if (!g){
          g = {
            key,
            docNum,
            date,
            createdAtMax: String(mv.createdAt || "").trim(),
            rows: 0,
            pieces: 0,
            codes: new Set(),
            wh: { cerea: 0, concamarise: 0 }
          };
          byKey.set(key, g);
        }

        const q = safeInt(mv.qty);
        g.rows += 1;
        g.pieces += q;

        const c = String(mv.code || "").trim();
        if (c) g.codes.add(c.toLowerCase());

        const w = normalizeWarehouse(mv.warehouse || "");
        if (w === WAREHOUSE_CONCA) g.wh.concamarise += q;
        else g.wh.cerea += q;

        const ca = String(mv.createdAt || "").trim();
        if (ca && (!g.createdAtMax || ca.localeCompare(g.createdAtMax) > 0)) g.createdAtMax = ca;
        if (!g.docNum && docNum) g.docNum = docNum;
        if (!g.date && date) g.date = date;
      }

      const arr = Array.from(byKey.values()).map(g => ({
        key: g.key,
        docNum: g.docNum || String(g.key || "").split("__")[0] || "",
        date: g.date || (String(g.key || "").includes("__") ? String(g.key).split("__")[1] : ""),
        createdAtMax: g.createdAtMax || "",
        rows: g.rows || 0,
        pieces: g.pieces || 0,
        codesCount: (g.codes && g.codes.size) ? g.codes.size : 0,
        whCerea: (g.wh && g.wh.cerea) ? g.wh.cerea : 0,
        whConca: (g.wh && g.wh.concamarise) ? g.wh.concamarise : 0
      }));

      arr.sort((a,b) => {
        const ka = String(a.createdAtMax || a.date || "");
        const kb = String(b.createdAtMax || b.date || "");
        return kb.localeCompare(ka);
      });

      return arr.slice(0, 24);
    }

    function __stopHomeDaneaMarquee(){
      // stop vertical ticker
      try{ if (__homeDaneaMarqueeRaf) clearInterval(__homeDaneaMarqueeRaf); }catch(_){ }
      __homeDaneaMarqueeRaf = 0;
      __homeDaneaMarqueeBusy = false;
      try{
        if (homeDaneaTickerTrack){
          homeDaneaTickerTrack.style.transition = "none";
          homeDaneaTickerTrack.style.transform = "translateY(0px)";
        }
      }catch(_){ }
    }

    function __homeDaneaMeasureH(){
      try{
        // keep cockpit height identical to the "Categorie" tile
        __homeDaneaLockCockpitHeight();
        const ref = homeDaneaCockpit || homeDaneaTicker;
        const r = ref ? ref.getBoundingClientRect() : null;
        const h = Math.round((r && r.height) || 0);
        if (h > 10) return h;
        // Se la Home non è visibile (display:none), getBoundingClientRect() torna 0.
        // In quel caso usa l'ultima altezza bloccata, così nel cockpit resta UNA riga.
        const fb = Math.round(Number(__homeDaneaLockedTileH || 0));
        return (fb > 10) ? fb : 0;
      }catch(_){ return 0; }
    }

    function __homeDaneaSyncHeights(){
      const h = __homeDaneaMeasureH();
      if (!h) return 0;
      __homeDaneaMarqueeH = h;
      try{
        if (homeDaneaTickerSeq) homeDaneaTickerSeq.style.height = h + "px";
        if (homeDaneaTickerSeqClone) homeDaneaTickerSeqClone.style.height = h + "px";
      }catch(_){ }
      return h;
    }

    function __homeDaneaSetSlides(idx){
      const items = Array.isArray(__homeDaneaMarqueeItems) ? __homeDaneaMarqueeItems : [];
      if (!items.length) return;
      const n = items.length;
      const i = ((Number(idx) || 0) % n + n) % n;
      const next = (i + 1) % n;
      try{ if (homeDaneaTickerSeq) homeDaneaTickerSeq.innerHTML = items[i] || ""; }catch(_){ }
      try{ if (homeDaneaTickerSeqClone) homeDaneaTickerSeqClone.innerHTML = items[next] || ""; }catch(_){ }
    }

    function __homeDaneaStep(){
      try{
        const items = Array.isArray(__homeDaneaMarqueeItems) ? __homeDaneaMarqueeItems : [];
        if (!items || items.length <= 1) return;
        if (!homeDaneaTickerTrack || !homeDaneaTickerSeq || !homeDaneaTickerSeqClone) return;
        if (__homeDaneaMarqueePaused || __homeDaneaMarqueeBusy) return;

        const h = __homeDaneaSyncHeights() || __homeDaneaMarqueeH;
        if (!h) return;

        // refresh "next" in clone (in case list changed)
        const nextIdx = (__homeDaneaMarqueeIdx + 1) % items.length;
        try{ homeDaneaTickerSeqClone.innerHTML = items[nextIdx] || ""; }catch(_){ }

        __homeDaneaMarqueeBusy = true;

        requestAnimationFrame(() => {
          try{
            if (!homeDaneaTickerTrack) return;
            homeDaneaTickerTrack.style.transition = "transform 520ms cubic-bezier(.22,.61,.36,1)";
            homeDaneaTickerTrack.style.transform = `translateY(${-h}px)`;
          }catch(_){ }
        });
      }catch(_){ }
    }

    function __startHomeDaneaMarquee(preserveIndex){
      try{
        if (!homeDaneaCockpit || !homeDaneaTickerTrack || !homeDaneaTickerSeq || !homeDaneaTickerSeqClone) return;

        const items = Array.isArray(__homeDaneaMarqueeItems) ? __homeDaneaMarqueeItems : [];
        __stopHomeDaneaMarquee();

        if (!items.length){
          try{ homeDaneaTickerSeq.innerHTML = '<span class="homeDaneaTickerItem is-muted">—</span>'; }catch(_){ }
          try{ homeDaneaTickerSeqClone.innerHTML = ''; }catch(_){ }
          return;
        }

        if (!preserveIndex) __homeDaneaMarqueeIdx = 0;
        if (!Number.isFinite(Number(__homeDaneaMarqueeIdx))) __homeDaneaMarqueeIdx = 0;
        if (__homeDaneaMarqueeIdx < 0) __homeDaneaMarqueeIdx = 0;
        if (__homeDaneaMarqueeIdx >= items.length) __homeDaneaMarqueeIdx = 0;

        __homeDaneaSyncHeights();
        __homeDaneaSetSlides(__homeDaneaMarqueeIdx);

        try{
          homeDaneaTickerTrack.style.transition = "none";
          homeDaneaTickerTrack.style.transform = "translateY(0px)";
        }catch(_){ }

        // Se 0/1 elementi, niente rotazione
        if (items.length <= 1) return;

        // Ogni tot secondi (gestionale / leggibile)
        const stepMs = 4200;
        __homeDaneaMarqueeRaf = setInterval(() => { try{ __homeDaneaStep(); }catch(_){ } }, stepMs);
      }catch(_){ }
    }

    function __bindHomeDaneaMarquee(){
      try{
        if (!homeDaneaCockpit || __homeDaneaMarqueeBound) return;
        __homeDaneaMarqueeBound = true;

        const pause = () => { __homeDaneaMarqueePaused = true; };
        const resume = () => { __homeDaneaMarqueePaused = false; };

        homeDaneaCockpit.addEventListener("pointerenter", pause);
        homeDaneaCockpit.addEventListener("pointerleave", resume);
        homeDaneaCockpit.addEventListener("focusin", pause);
        homeDaneaCockpit.addEventListener("focusout", resume);

        // Pulsante destro: ATTIVATO/DISATTIVATO (toggle auto mode)
        try{
          if (homeDaneaToggleBtn && !(homeDaneaToggleBtn.dataset && homeDaneaToggleBtn.dataset.bound === "1")){
            try{ if (homeDaneaToggleBtn.dataset) homeDaneaToggleBtn.dataset.bound = "1"; }catch(_){ }

            const readAuto = () => {
              try{
                const v = String(localStorage.getItem("hubinv_danea_auto_mode") || "").trim().toLowerCase();
                if (!v) return false;
                return (v === "1" || v === "true" || v === "on" || v === "yes");
              }catch(_){ return false; }
            };

            const writeAuto = (on) => {
              const next = !!on;
              // Preferisci la switch reale: aggiorna anche i timer interni del modulo Danea
              try{
                const sw = document.getElementById("daneaAutoSwitch");
                if (sw){
                  try{ sw.checked = next; }catch(_){ }
                  try{ sw.dispatchEvent(new Event("change", { bubbles: true })); }catch(_){ }
                  return true;
                }
              }catch(_){ }
              // fallback: solo localStorage
              try{ localStorage.setItem("hubinv_danea_auto_mode", next ? "1" : "0"); }catch(_){ }
              return false;
            };

            homeDaneaToggleBtn.addEventListener("click", (e) => {
              try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
              const cur = readAuto();
              const next = !cur;
              writeAuto(next);
              try{ renderHomeDaneaCockpit(); }catch(_){ }
              try{ showToast(next ? "Scarico automatico ATTIVATO" : "Scarico automatico DISATTIVATO", next ? "ok" : "warn"); }catch(_){ }
            });
          }
        }catch(_){ }

        // Vertical ticker: swap slides on transition end
        try{
          if (homeDaneaTickerTrack && !(homeDaneaTickerTrack.dataset && homeDaneaTickerTrack.dataset.vBound === "1")){
            try{ if (homeDaneaTickerTrack.dataset) homeDaneaTickerTrack.dataset.vBound = "1"; }catch(_){ }
            homeDaneaTickerTrack.addEventListener("transitionend", (ev) => {
              try{
                if (ev && ev.propertyName && ev.propertyName !== "transform") return;
                if (!__homeDaneaMarqueeBusy) return;

                const items = Array.isArray(__homeDaneaMarqueeItems) ? __homeDaneaMarqueeItems : [];
                if (!items.length){ __homeDaneaMarqueeBusy = false; return; }

                const nextIdx = (__homeDaneaMarqueeIdx + 1) % items.length;
                const upcoming = (nextIdx + 1) % items.length;

                // 1) mentre il clone e visibile, copia il clone nel primo slot
                try{ if (homeDaneaTickerSeq) homeDaneaTickerSeq.innerHTML = items[nextIdx] || ""; }catch(_){ }

                // 2) snap back (senza animazione)
                try{
                  homeDaneaTickerTrack.style.transition = "none";
                  homeDaneaTickerTrack.style.transform = "translateY(0px)";
                  // force reflow (stabilizza il prossimo step)
                  void homeDaneaTickerTrack.offsetHeight;
                }catch(_){ }

                // 3) prepara il prossimo "clone" (ora e sotto, non visibile)
                try{ if (homeDaneaTickerSeqClone) homeDaneaTickerSeqClone.innerHTML = items[upcoming] || ""; }catch(_){ }

                __homeDaneaMarqueeIdx = nextIdx;
              }catch(_){ }
              __homeDaneaMarqueeBusy = false;
            });
          }
        }catch(_){ }

        // Click su item => apre Movimenti filtrati
        homeDaneaCockpit.addEventListener("click", (e) => {
          const el = e && e.target && e.target.closest ? e.target.closest(".homeDaneaTickerItem[data-key]") : null;
          const key = el ? String(el.getAttribute("data-key") || "").trim() : "";
          const docNum = el ? String(el.getAttribute("data-docnum") || "").trim() : "";

          try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }

          try{
            setView("movements");
            const movSearch = document.getElementById("movSearch");
            const movTypeFilter = document.getElementById("movTypeFilter");
            if (movTypeFilter) movTypeFilter.value = "OUT";
            if (movSearch) movSearch.value = (docNum || key || "daneaxml");
            try{ window.HubMovements && window.HubMovements.refresh && window.HubMovements.refresh(); }catch(_){ }
          }catch(_){ }
        });

        window.addEventListener("resize", () => { try{ __startHomeDaneaMarquee(true); }catch(_){ } }, { passive: true });
      }catch(_){ }
    }

    function renderHomeDaneaCockpit(){
      try{
        if (!homeDaneaCockpit || !homeDaneaTickerSeq || !homeDaneaTickerSeqClone) return;

        // lock cockpit height before measuring/animating
        __homeDaneaLockCockpitHeight();

        // stato scarico automatico (dashboard)
        const autoOn = (() => {
          try{
            const v = String(localStorage.getItem("hubinv_danea_auto_mode") || "").trim().toLowerCase();
            if (!v) return false;
            return (v === "1" || v === "true" || v === "on" || v === "yes");
          }catch(_){ return false; }
        })();

        // stato UI (toggle) — no glow esterno
        try{
          if (homeDaneaCockpit){
            homeDaneaCockpit.classList.toggle("is-auto-on", !!autoOn);
            homeDaneaCockpit.classList.toggle("is-auto-off", !autoOn);
            const lbl = autoOn ? "ATTIVATO" : "DISATTIVATO";
            homeDaneaCockpit.setAttribute("title", "Scarico automatico: " + lbl);
          }
        }catch(_){ }

        // Bottone a destra: attivato/disattivato
        try{
          if (homeDaneaToggleBtn){
            homeDaneaToggleBtn.textContent = autoOn ? "ATTIVATO" : "DISATTIVATO";
            try{ homeDaneaToggleBtn.setAttribute("aria-pressed", autoOn ? "true" : "false"); }catch(_){ }
          }
        }catch(_){ }

        // DDT scaricati oggi (usa createdAt dei completati)
        const todayCount = (() => {
          try{
            const now = new Date();
            const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
            let c = 0;
            for (const it of (__daneaCompleted || [])){
              const iso = String(it && it.createdAt || "").trim();
              if (!iso) continue;
              const dt = new Date(iso);
              if (!dt || isNaN(dt.getTime())) continue;
              if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) c++;
            }
            return c;
          }catch(_){ return 0; }
        })();

        const piecesToday = (() => {
          try{
            const now = new Date();
            const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
            let sum = 0;
            for (const it of (__daneaCompleted || [])){
              const iso = String(it && it.createdAt || "").trim();
              if (!iso) continue;
              const dt = new Date(iso);
              if (!dt || isNaN(dt.getTime())) continue;
              if (dt.getFullYear() !== y || dt.getMonth() !== m || dt.getDate() !== d) continue;
              const allocs = Array.isArray(it.allocations) ? it.allocations : [];
              for (const a of allocs){
                sum += safeInt(a && a.qty);
              }
            }
            return sum;
          }catch(_){ return 0; }
        })();

        const fmt = (n) => (Number(n) || 0).toLocaleString("it-IT");
        const list = __getHomeDaneaGroups();

        const items = [];
        const autoLbl = autoOn ? "ATTIVATO" : "DISATTIVATO";
        items.push(`<span class="homeDaneaTickerItem is-meta">SCARICO AUTOMATICO ${autoLbl} - DDT SCARICATI OGGI ${fmt(todayCount)} - PEZZI SCARICATI OGGI ${fmt(piecesToday)}</span>`);

        if (!list.length){
          items.push(`<span class="homeDaneaTickerItem is-muted">NESSUN DDT DA XML</span>`);
        } else {
          items.push(
            ...list.slice(0, 18).map((g) => {
              const num = String(g.docNum || "").trim() || String(g.key || "").split("__")[0] || "";
              const done = __daneaPickDone(g.key, num, String(g.date || "").trim());
              const cust = String(done && done.customer || "").trim();
              const txt = `CLIENTE: ${cust || "—"} | DDT: ${num || "—"}`;
              return (
                `<button class="homeDaneaTickerItem" type="button" data-key="${escapeHtmlAttr(String(g.key || ""))}" data-docnum="${escapeHtmlAttr(String(num || ""))}">` +
                  `${escapeHtml(txt)}` +
                `</button>`
              );
            })
          );
        }

        // Signature: evita di riavviare il ticker ad ogni renderAll (sennò non scorre mai)
        const sig = items.join("§");
        const changed = (sig !== __homeDaneaMarqueeSig);

        __homeDaneaMarqueeItems = items;

        __bindHomeDaneaMarquee();

        // Start/refresh only when content changes (or first paint)
        try{
          const isEmpty = !String(homeDaneaTickerSeq && homeDaneaTickerSeq.innerHTML || "").trim();
          if (changed){
            __homeDaneaMarqueeSig = sig;
            if (!Number.isFinite(Number(__homeDaneaMarqueeIdx))) __homeDaneaMarqueeIdx = 0;
            if (__homeDaneaMarqueeIdx < 0) __homeDaneaMarqueeIdx = 0;
            if (__homeDaneaMarqueeIdx >= items.length) __homeDaneaMarqueeIdx = 0;
            __startHomeDaneaMarquee(true);
          } else if (isEmpty || (!__homeDaneaMarqueeRaf && items.length > 1)) {
            __startHomeDaneaMarquee(true);
          }
        }catch(_){
          try{ __startHomeDaneaMarquee(true); }catch(__){ }
        }
      }catch(_){ }
    }




    // Dashboard: cache righe sottoscorta (click -> dettaglio inventario)
    let __lowStockRowByKey = new Map();

    // Click su riga sottoscorta (Home) => apri dettaglio inventario
    (function __bindLowStockBoardClick(){
      try{
        if (!lowStockBoard) return;
        if (lowStockBoard.dataset && lowStockBoard.dataset.boundLowStockClick === "1") return;
        if (lowStockBoard.dataset) lowStockBoard.dataset.boundLowStockClick = "1";

        const openFromKey = (k) => {
          const key = String(k || "").trim();
          if (!key) return;
          const row = (__lowStockRowByKey && __lowStockRowByKey.get) ? (__lowStockRowByKey.get(key) || null) : null;
          if (!row) return;

          // Alias group => scegli codice (come in Inventario)
          if (row.__isAliasGroup && Array.isArray(row.__codes) && row.__codes.length > 1) {
            openUnifiedArticleModal(row);
            return;
          }
          openProductModal(String(row.code || ""), row);
        };

        lowStockBoard.addEventListener("click", (e) => {
          const rowEl = e && e.target && e.target.closest ? e.target.closest(".lowStockCockpitRow[data-k]") : null;
          if (!rowEl) return;
          const k = rowEl.getAttribute("data-k") || "";
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
          openFromKey(k);
        });

        // Accessibilità: Enter/Space sulle righe
        lowStockBoard.addEventListener("keydown", (e) => {
          if (!e) return;
          const key = e.key;
          if (key !== "Enter" && key !== " ") return;
          const rowEl = e.target && e.target.closest ? e.target.closest(".lowStockCockpitRow[data-k]") : null;
          if (!rowEl) return;
          const k = rowEl.getAttribute("data-k") || "";
          try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
          openFromKey(k);
        });
      }catch(_){ }
    })();


    function renderLowStockBoard(stockByWh) {
      try {
        if (!lowStockBoard || !lowStockListCerea || !lowStockListConca) return;

        // reset cache (usata dal click sulle righe)
        __lowStockRowByKey = new Map();

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

        // Dashboard: tabella compatta (niente righe “a riquadro”), con scroll SOLO dentro il riquadro
        // così la Home non diventa scrollabile su desktop.
        const MAX_ROWS = 200;

        const renderList = (list, el) => {
          if (!el) return;
          if (!Array.isArray(list) || list.length === 0) {
            el.innerHTML = '<div class="td-muted">Nessun articolo sotto scorta.</div>';
            return;
          }

          const show = list.slice(0, MAX_ROWS);
          const more = list.length - show.length;

          const rows = show.map(r => {
            const k = stockRowKey(String(r && r.customer || ""), String(r && r.code || ""), String(r && r.warehouse || ""));
            try { __lowStockRowByKey.set(k, r); } catch(_){ }
            const code = escapeHtml(r.__displayCode || r.code || "");
            const item = escapeHtml(r.item || "");
            const qty = fmt(safeInt(r.qty));

            const codeCell = code || "—";
            const itemCell = item || "—";

            return `
              <div class="lowStockCockpitRow" role="row" data-k="${escapeHtmlAttr(k)}" tabindex="0" title="Apri dettaglio">
                <div class="lowStockCockpitCell isCode colCode" role="cell">${codeCell}</div>
                <div class="lowStockCockpitCell colItem" role="cell">${itemCell}</div>
                <div class="lowStockCockpitCell isQty colQty" role="cell">${qty}</div>
              </div>
            `;
          }).join("");

          const moreRow = (more > 0)
            ? `<div class="lowStockCockpitMore">+${fmt(more)} altri…</div>`
            : ``;

          el.innerHTML = `
            <div class="lowStockCockpit" role="table" aria-label="Sottoscorta">
              <div class="lowStockCockpitHead" role="row">
                <div class="lowStockCockpitCell colCode" role="columnheader">Codice</div>
                <div class="lowStockCockpitCell colItem" role="columnheader">Articolo</div>
                <div class="lowStockCockpitCell colQty" role="columnheader" style="text-align:right;">Qtà</div>
              </div>
              <div class="lowStockCockpitBody" role="rowgroup" tabindex="0">
                ${rows}
                ${moreRow}
              </div>
            </div>
          `;
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
    function __hexToRgb(hex){
      const s = String(hex || "").trim().replace("#", "");
      if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s)) return null;
      const h = (s.length === 3) ? (s[0]+s[0]+s[1]+s[1]+s[2]+s[2]) : s;
      const n = parseInt(h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    function __rgbToHex(r,g,b){
      const to = (x) => Math.max(0, Math.min(255, Math.round(Number(x) || 0))).toString(16).padStart(2,"0");
      return "#" + to(r) + to(g) + to(b);
    }
    function __mixRgb(a,b,t){
      const tt = Math.max(0, Math.min(1, Number(t) || 0));
      return {
        r: Math.round(a.r + (b.r - a.r) * tt),
        g: Math.round(a.g + (b.g - a.g) * tt),
        b: Math.round(a.b + (b.b - a.b) * tt)
      };
    }
    function __mixHex(baseHex, targetHex, t){
      const a = __hexToRgb(baseHex);
      const b = __hexToRgb(targetHex);
      if (!a || !b) return baseHex;
      const m = __mixRgb(a,b,t);
      return __rgbToHex(m.r,m.g,m.b);
    }
    function __catIosFillVars(hex){
      const base = __isHexColor(hex) ? String(hex).trim() : "#0a84ff";
      const rgb = __hexToRgb(base) || { r:10, g:132, b:255 };

      // variazioni leggere per "profondità" (stile bottone iOS)
      const c1 = __mixHex(base, "#ffffff", 0.20); // highlight
      const c2 = __mixHex(base, "#000000", 0.18); // shadow

      const glow = `rgba(${rgb.r},${rgb.g},${rgb.b},0.20)`;

      return `--cat-bg1:${c1}; --cat-bg2:${c2}; --cat-glow:${glow};`;
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
          const fillStyle = __catIosFillVars(col);
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
    // dimensioni viewBox correnti (per conversioni px → svg e tooltip)
    let __invTrendSvgW = 480;
    let __invTrendSvgH = 180;
    let __invTrendResizeObs = null;

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
      __bindInvTrendResize();
    }

    function __setInvTrendActiveBtn(){
      if (!invTrendRanges) return;
      const btns = invTrendRanges.querySelectorAll("button[data-range]");
      btns.forEach(b => {
        const r = String(b.getAttribute("data-range") || "").trim();
        b.classList.toggle("is-active", r === __invTrendRange);
      });
    }

    function __buildInvTrendSeries(movements, range, currentTotal){
      const movs = Array.isArray(movements) ? movements : [];

      // delta per giorno (IN +, OUT -) — solo giorni validi
      const deltaByDay = new Map(); // day -> signed int
      let minDay = "";

      const endDay = __invTrendTodayISO(); // ancoriamo SEMPRE a "oggi" (valore reale)
      for (const mv of movs){
        const day = __invTrendGetMvDay(mv);
        if (!day) continue;
        // evita date future (sporchi doc date)
        if (endDay && day > endDay) continue;

        const q = safeInt(mv.qty);
        if (!q) continue;
        const sign = String(mv.type || "").toUpperCase() === "OUT" ? -1 : 1;
        const delta = sign * q;

        deltaByDay.set(day, (deltaByDay.get(day) || 0) + delta);

        if (!minDay || day < minDay) minDay = day;
      }

      // range: sempre finestra rispetto a endDay
      const r = String(range || "").trim();
      let startDay = endDay;

      if (r === "all"){
        startDay = (minDay && minDay <= endDay) ? minDay : endDay;
      } else {
        const n = Math.max(1, safeInt(r));
        const s = __invTrendAddDays(endDay, -(n - 1));
        startDay = (s && s <= endDay) ? s : endDay;
      }

      // Ancora al totale attuale (valore vero)
      const anchor = Math.max(0, Math.round(Number(currentTotal) || 0));

      // Serie: calcolo a ritroso dall'ancora (niente baseline inventate)
      const rev = [];
      let level = anchor;

      let guard = 0;
      for (let d = endDay; d >= startDay && guard < 6000; d = __invTrendAddDays(d, -1), guard++){
        rev.push({ day: d, value: level });
        level -= (deltaByDay.get(d) || 0);
      }

      const points = rev.reverse();
      if (!points.length){
        points.push({ day: endDay, value: anchor });
      }

      // downsample (all) per evitare troppo carico su SVG
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

        // tooltip position in px (usa viewBox reale, non valori fissi)
        const vw = Number(__invTrendSvgW) || 480;
        const vh = Number(__invTrendSvgH) || 180;
        const xPx = (p.x / vw) * rect.width;
        const yPx = (p.y / vh) * rect.height;

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

    // Ricalcola il viewBox quando il riquadro cambia dimensione (desktop grid stretch / resize)
    function __bindInvTrendResize(){
      if (__invTrendResizeObs || !invTrendChart) return;
      try{
        if (typeof ResizeObserver !== "undefined"){
          const ro = new ResizeObserver(() => {
            try{
              if (ro._raf) cancelAnimationFrame(ro._raf);
              ro._raf = requestAnimationFrame(() => {
                try{ renderInventoryTrend(); }catch(_){ }
              });
            }catch(_){ }
          });
          ro.observe(invTrendChart);
          __invTrendResizeObs = ro;
          return;
        }
      }catch(_){ }

      // Fallback (vecchi browser)
      try{
        const onR = () => { try{ renderInventoryTrend(); }catch(_){ } };
        window.addEventListener("resize", onR);
        __invTrendResizeObs = { _win: onR };
      }catch(_){ }
    }

    function __renderInvTrendSvg(points){
      if (!invTrendChart) return;

      const ptsIn = Array.isArray(points) ? points : [];
      const pts = ptsIn.length ? ptsIn.slice() : [{ day: __invTrendTodayISO(), value: 0 }];

      // Ensure at least 2 points for a line
      if (pts.length === 1){
        pts.push({ day: pts[0].day, value: pts[0].value });
      }

      // viewBox: si adatta al rapporto del riquadro (niente barre/letterbox),
      // senza deformare la curva (preserveAspectRatio resta "meet").
      // Manteniamo l'altezza "unit" stabile (tipografia/stroke coerenti) e
      // adattiamo la larghezza al rapporto reale del riquadro.
      let H = 180;
      let W = 480;
      try{
        const rect = invTrendChart.getBoundingClientRect();
        const wpx = (rect && rect.width) || 0;
        const hpx = (rect && rect.height) || 0;
        if (wpx > 20 && hpx > 20){
          const ratio = wpx / hpx;
          if (isFinite(ratio) && ratio > 0.15){
            W = Math.round(H * ratio);
            // safety (evita 0 / numeri troppo piccoli)
            if (W < 80) W = 80;
          }
        }
      }catch(_){ }

      __invTrendSvgW = W;
      __invTrendSvgH = H;
      try{
        invTrendChart.setAttribute("viewBox", `0 0 ${W} ${H}`);
        if (!invTrendChart.getAttribute("preserveAspectRatio")) {
          invTrendChart.setAttribute("preserveAspectRatio", "xMidYMid meet");
        }
      }catch(_){ }

      // padding (margini) proporzionali, così il grafico respira sempre uguale
      let padX = Math.max(18, Math.round(W * 0.045));
      let padTop = Math.max(12, Math.round(H * 0.07));
      let padBot = Math.max(16, Math.round(H * 0.10));
      // safety: evita che i padding mangino tutto lo spazio verticale
      try{
        const maxPadSum = Math.max(24, H - 34);
        const sum = padTop + padBot;
        if (sum > maxPadSum){
          const k = maxPadSum / Math.max(1, sum);
          padTop = Math.max(10, Math.round(padTop * k));
          padBot = Math.max(12, Math.round(padBot * k));
        }
        const maxPadX = Math.max(20, Math.floor((W - 24) / 2));
        if (padX > maxPadX) padX = maxPadX;
      }catch(_){ }

      // Helpers (labels)
      const __fmtQty = (n) => {
        const v = Number(n) || 0;
        const a = Math.abs(v);
        const trim = (s) => s.replace(/\.0+$/,"").replace(/(\.\d*[1-9])0+$/,"$1");
        if (a >= 1e9) return trim((v/1e9).toFixed(1)) + "B";
        if (a >= 1e6) return trim((v/1e6).toFixed(1)) + "M";
        if (a >= 1e3) return trim((v/1e3).toFixed(1)) + "K";
        return String(Math.round(v));
      };
      const __fmtDay = (iso) => {
        try{
          if (!iso) return "";
          const r = String(__invTrendRange || "").trim();
          const d = new Date(String(iso).slice(0,10) + "T00:00:00");
          if (!isFinite(d.getTime())) return String(iso).slice(5,10);

          // Etichette italiane, coerenti con la finestra
          if (r === "all" || r === "90"){
            return d.toLocaleDateString("it-IT", { month: "short", year: "2-digit" });
          }
          return d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
        }catch(_){ return String(iso||"").slice(5,10); }
      };
      const __niceStep = (x) => {
        const v = Math.max(1e-9, Number(x) || 0);
        const exp = Math.floor(Math.log10(v));
        const f = v / Math.pow(10, exp);
        let nf = 1;
        if (f <= 1) nf = 1;
        else if (f <= 2) nf = 2;
        else if (f <= 5) nf = 5;
        else nf = 10;
        return nf * Math.pow(10, exp);
      };

      const values = pts.map(p => Number(p.value) || 0);
      let vMinRaw = Math.min(...values);
      let vMaxRaw = Math.max(...values);
      if (vMinRaw === vMaxRaw){ vMinRaw -= 1; vMaxRaw += 1; }

      // Axes: "nice" ticks (keep 4 steps like the grid)
      const gCount = 4;
      const rawSpan = Math.max(1e-9, (vMaxRaw - vMinRaw));
      let step = __niceStep(rawSpan / gCount);
      if (!isFinite(step) || step <= 0) step = 1;

      let vMin = Math.floor(vMinRaw / step) * step;
      let vMax = vMin + step * gCount;
      if (vMax < vMaxRaw){
        vMax = Math.ceil(vMaxRaw / step) * step;
        vMin = vMax - step * gCount;
      }
      if (vMin === vMax){ vMin -= step; vMax += step; }

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

      // Smooth path (catmull-rom -> cubic)
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

      // Grid + Y ticks
      const gridLines = [];
      const yLabels = [];
      for (let i = 0; i <= gCount; i++){
        const vTick = vMax - step * i;
        const y = toY(vTick);
        gridLines.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${W}" y2="${y.toFixed(2)}"></line>`);
        yLabels.push(
          `<text x="2" y="${y.toFixed(2)}" text-anchor="start" dominant-baseline="middle" ` +
          `font-size="9" font-weight="700" fill="rgba(60,60,67,.58)">${__fmtQty(vTick)}</text>`
        );
      }

      // X labels (few, responsive)
      const xLabels = [];
      try{
        const n = __invTrendActivePoints.length;
        const picks = [0, Math.round((n-1)/3), Math.round((n-1)*2/3), n-1]
          .filter(i => i >= 0 && i < n);
        const uniq = [];
        for (const i of picks){ if (!uniq.includes(i)) uniq.push(i); }
        uniq.sort((a,b)=>a-b);

        const yText = H - 4; // keep inside viewBox
        for (const i of uniq){
          const p = __invTrendActivePoints[i];
          const label = __fmtDay(p.day);
          xLabels.push(
            `<text x="${p.x.toFixed(2)}" y="${yText}" text-anchor="middle" dominant-baseline="alphabetic" ` +
            `font-size="9" font-weight="700" fill="rgba(60,60,67,.58)">${label}</text>`
          );
        }
      }catch(_){}

      // Path + dots
      const d = buildSmoothPath(__invTrendActivePoints);
      const last = __invTrendActivePoints[__invTrendActivePoints.length - 1];

      invTrendChart.innerHTML = `
        <g class="trendGrid">${gridLines.join("")}</g>
        <g class="trendAxes" style="pointer-events:none">${yLabels.join("")}${xLabels.join("")}</g>
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

        const series = __buildInvTrendSeries(state && state.movements, __invTrendRange, total);
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

        
        // Alias grouping ONLY when the same alias is shared by >=2 different product codes.
        // This avoids accidental "double counts" when alias is used as a simple display name.
        const sharedAlias = new Set();
        try{
          const prodArr = Array.isArray(products) ? products : [];
          const tmp = new Map(); // aliasKey -> Set(codesLower)
          for (const p of prodArr){
            if (!p) continue;
            const c = String(p.code || (typeof safeDecodeUri==="function" ? safeDecodeUri(p.id || "") : (p.id || "")) || "").trim();
            if (!c) continue;
            const a = String((p.alias || p.aliasName) || "").trim();
            if (!a) continue;
            const ak = normTextKey(a);
            if (!ak) continue;
            const set = tmp.get(ak) || new Set();
            set.add(c.toLowerCase());
            tmp.set(ak, set);
          }
          for (const [ak, set] of tmp.entries()){
            if (set && set.size >= 2) sharedAlias.add(ak);
          }
        }catch(_){}
for (const r of arr) {
          if (!r) continue;
          const code = String(r.code || "").trim();
          const alias = getAliasForCode(code);
          const aliasKey0 = alias ? normTextKey(alias) : "";
          const aliasKey = (aliasKey0 && sharedAlias.has(aliasKey0)) ? aliasKey0 : "";
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


// ===== Inventario prodotti finiti (UI + righe) =====
let __fpStockRowByKey = new Map();

function __findFinishedProductByCode(code){
  const low = String(code || "").trim().toLowerCase();
  if (!low) return null;
  const list = Array.isArray(finishedProducts) ? finishedProducts : [];
  for (const fp of list){
    if (!fp) continue;
    const c = String(fp.code || fp.sku || safeDecodeUri(fp.id || "") || "").trim();
    const cl = String(fp.codeLower || "").trim();
    if (c && c.toLowerCase() === low) return fp;
    if (cl && cl.toLowerCase() === low) return fp;
  }
  return null;
}

function __fpDirectComponents(fp){
  try{
    const arr = fp && (fp.components || fp.bom || fp.distintaBase);
    return Array.isArray(arr) ? arr : [];
  }catch(_){ return []; }
}

function __fpCategoryBomForKey(catKey){
  const k = String(catKey || "").trim().toLowerCase();
  if (!k || k === "singolo") return [];
  try{
    const cat = (finishedProductCategoriesMap && typeof finishedProductCategoriesMap.get === "function")
      ? (finishedProductCategoriesMap.get(k) || null)
      : null;
    const bom = cat && (cat.bom || cat.components || cat.distintaBase);
    return Array.isArray(bom) ? bom : [];
  }catch(_){ return []; }
}

function __fpIsSingle(fp){
  try{
    const direct = __fpDirectComponents(fp);
    if (!(Array.isArray(direct) && direct.length)) return false;

    // Se appartiene a una categoria con distinta base => prevale la distinta della categoria
    const catKey = String(fp && (fp.categoryKeyLower || fp.categoryKey || fp.category || "") || "").trim().toLowerCase();
    if (catKey && catKey !== "singolo"){
      const catBom = __fpCategoryBomForKey(catKey);
      if (Array.isArray(catBom) && catBom.length) return false;
    }

    return true;
  }catch(_){ return false; }
}

function __fpCategoryNameFromKey(key){
  const k = String(key || "").trim().toLowerCase();
  if (!k) return "";
  if (k === "singolo") return "Singolo";
  try{
    const o = finishedProductCategoriesMap && finishedProductCategoriesMap.get ? finishedProductCategoriesMap.get(k) : null;
    const name = o && (o.name || o.label) ? String(o.name || o.label) : "";
    return String(name || k).trim();
  }catch(_){ return String(k).trim(); }
}

// ===== Produzione PF: distinta base (prodotto o categoria) =====
function __fpGetResolvedBomForCode(code){
  const fp = __findFinishedProductByCode(code);
  if (!fp) return [];

  const catKey = String(fp.categoryKeyLower || fp.categoryKey || fp.category || "").trim().toLowerCase();

  // 1) BOM da categoria (se presente e non vuota) — prevale sempre
  const catBom = __fpCategoryBomForKey(catKey);
  if (Array.isArray(catBom) && catBom.length) return catBom;

  // 2) BOM diretta sul prodotto
  const direct = __fpDirectComponents(fp);
  if (Array.isArray(direct) && direct.length) return direct;

  // 3) fallback categoria (anche vuota)
  return Array.isArray(catBom) ? catBom : [];
}


function __fpHasBomForCode(code){
  try{ return __fpGetResolvedBomForCode(code).length > 0; }catch(_){ return false; }
}

function __fpParseNumberOrFraction(v){
  const s = String(v ?? "").trim();
  if (!s) return null;
  // 1/2 (anche con virgola)
  const m = s.match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/);
  if (m){
    const a = Number(String(m[1]).replace(",","."));
    const b = Number(String(m[2]).replace(",","."));
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  // numero con virgola
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (Number.isFinite(n)) return n;
  return null;
}

function __fpCompQtyPerUnit(comp){
  const c = comp || {};
  if (c.qty != null && Number.isFinite(Number(c.qty))) return Number(c.qty);
  const raw = c.qtyRaw || c.qtaRaw || c.quantityRaw || c.qta || "";
  const p = __fpParseNumberOrFraction(raw);
  return (p != null && Number.isFinite(p)) ? p : null;
}

function __fpIsProductionMacroForCode(code){
  try{
    const mc = (typeof getMacroCategoryForCode === "function") ? String(getMacroCategoryForCode(code) || "").trim().toLowerCase() : "";
    // Se non conosco la macro (non categorizzato), lo tratto come OK.
    if (!mc) return true;
    return (mc === "materie_prime" || mc === "imballaggi");
  }catch(_){ return true; }
}

function __fpResolveComponentMeta(code, fallbackName, fallbackUom){
  const c = String(code || "").trim();
  const p = (typeof findProductByCode === "function") ? findProductByCode(c) : null;

  let customer = String((p && p.customer) || "").trim();
  if (!customer){
    try{
      const info = (typeof __getLastSupplierInfoForCode === "function") ? (__getLastSupplierInfoForCode(c) || null) : null;
      if (info && info.name) customer = String(info.name).trim();
    }catch(_){ }
  }

  const item = String((p && (p.name || p.nome || p.description)) || fallbackName || c).trim() || c;
  const uom = __normalizeUom((p && (p.uom || p.um || p.unit)) || fallbackUom || "") || getUomResolvedForCode(c) || "";

  return { customer, item, uom };
}

function buildFinishedInventoryRowsForWarehouse(wh, fpStockByWh){
  // Sede unica: niente split per magazzino
  const w = WAREHOUSE_FINISHED;
  let rows = (Array.isArray(fpStockByWh) ? fpStockByWh : []).map(r => Object.assign({}, r, { warehouse: w }));

  const existing = new Set(rows.map(r => String(r && r.code || "").trim().toLowerCase()).filter(Boolean));
  const fps = Array.isArray(finishedProducts) ? finishedProducts : [];

  // Placeholder per PF senza movimenti
  for (const fp of fps){
    if (!fp) continue;
    const code = String(fp.code || fp.sku || safeDecodeUri(fp.id || "") || "").trim();
    if (!code) continue;
    const low = code.toLowerCase();
    if (existing.has(low)) continue;
    existing.add(low);

    rows.push({
      warehouse: w,
      code,
      item: String(fp.name || fp.nome || fp.description || code),
      uom: __normalizeUom(fp.uom || "") || "pz",
      qty: 0,
      lastMoveAt: "",
      fpId: String(fp.id || "").trim(),
      categoryKey: (__fpIsSingle(fp) ? "singolo" : String(fp.categoryKeyLower || fp.categoryKey || "").trim().toLowerCase()),
      categoryName: (__fpIsSingle(fp) ? "Singolo" : __fpCategoryNameFromKey(fp.categoryKeyLower || fp.categoryKey || ""))
    });
  }

  // Enrich categoria + uom + nome
  rows = rows.map(r => {
    const code = String(r && r.code || "").trim();
    const fp = __findFinishedProductByCode(code);

    const isSingle = fp && __fpIsSingle(fp);
    const catKey = isSingle ? "singolo" : String((r && r.categoryKey) || (fp && (fp.categoryKeyLower || fp.categoryKey)) || "").trim().toLowerCase();
    const catName = String(((isSingle ? "" : (r && r.categoryName)) || __fpCategoryNameFromKey(catKey) || "")).trim();
    const uom = __normalizeUom((r && r.uom) || "") || __normalizeUom(fp && fp.uom) || "pz";

    const item = String((r && r.item) || (fp && (fp.name || fp.nome || fp.description)) || code).trim();
    const fpId = String((r && r.fpId) || (fp && fp.id) || "").trim();

    return Object.assign({}, r, {
      warehouse: w,
      code,
      item,
      uom,
      fpId,
      categoryKey: catKey,
      categoryName: catName
    });
  });

  rows.sort((a,b) => String(a.item || "").localeCompare(String(b.item || ""), "it", { sensitivity: "base" }));
  return rows;
}

function renderFpInventoryCategoryOptions(){
  if (!fpInvFilterCategory) return;
  const prev = String(fpInvFilterCategory.value || "");
  const opts = ['<option value="">Tutte</option>', '<option value="__none">Non assegnata</option>', '<option value="singolo">Singolo</option>'];
  const cats = Array.isArray(finishedProductCategories) ? finishedProductCategories.slice() : [];
  cats.sort((a,b) => String((a && a.name) || a.key || "").localeCompare(String((b && b.name) || b.key || ""), "it", { sensitivity: "base" }));
  for (const c of cats){
    if (!c) continue;
    const k = String(c.key || "").trim().toLowerCase();
    if (!k) continue;
    const name = String(c.name || c.label || k).trim();
    opts.push(`<option value="${escapeHtmlAttr(k)}">${escapeHtml(name)}</option>`);
  }
  fpInvFilterCategory.innerHTML = opts.join("");
  try{
    if (prev && Array.from(fpInvFilterCategory.options || []).some(o => String(o.value) === prev)) fpInvFilterCategory.value = prev;
  }catch(_){ }
}

function renderFinishedStockTable(fpRows){
  const qRaw = (fpInvSearch && fpInvSearch.value ? String(fpInvSearch.value) : "").trim();
  const q = normTextKey(qRaw);
  const catF = (fpInvFilterCategory && fpInvFilterCategory.value ? String(fpInvFilterCategory.value) : "").trim().toLowerCase();
  let rows = Array.isArray(fpRows) ? fpRows : [];

  if (q) rows = rows.filter(r => {
    const hay = [r.code || "", r.item || "", r.categoryName || ""].join(" ");
    return normTextKey(hay).includes(q);
  });

  if (catF) {
    if (catF === "__none") rows = rows.filter(r => !String(r.categoryKey || "").trim());
    else rows = rows.filter(r => String(r.categoryKey || "").trim().toLowerCase() === catF);
  }

  if (pillFpStock) pillFpStock.textContent = `${rows.length} righe`;
  if (!fpStockTbody) return;

  __fpStockRowByKey = new Map();


  if (rows.length === 0) {
    fpStockTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Nessun risultato.</td></tr>';
    return;
  }

  const max = 800;
  const show = rows.slice(0, max);

  __fpStockRowByKey = new Map(show.map(r => [fpStockRowKey(r.code, r.warehouse), r]));

  fpStockTbody.innerHTML = show.map(r => {
    const k = fpStockRowKey(r.code, r.warehouse);
    const qtyVal = safeInt(r.qty);
    const uom = __normalizeUom(r.uom || "") || "pz";

    const canProduce = __fpHasBomForCode(r.code);
    const prodBtn = canProduce
      ? `<button class="btn btn-secondary btn-xs jsFpProduce" type="button" title="Produci e scarica componenti (distinta base)">Produci</button>`
      : ``;

    const qtyCell = `
      <div class="qty-editor">
        <input class="qtyEditInput jsFpQtyEdit" type="number" inputmode="numeric" min="0" step="1"
          value="${qtyVal}" data-orig="${qtyVal}" />
        <span class="td-muted" style="font-size:12px; font-weight:900; min-width:34px; text-align:left;">${escapeHtml(uom)}</span>
        <button class="btn btn-primary btn-xs jsFpQtySave" type="button" disabled>Salva</button>
        ${prodBtn}
      </div>`;

    const catHtml = r.categoryName ? `<span class="pill catPill" style="padding:2px 8px;">${escapeHtml(r.categoryName)}</span>` : '<span class="td-muted">—</span>';
    const displayCode = escapeHtml(r.code || "");
    const displayName = escapeHtml(r.item || "");

    return `
      <tr data-k="${escapeHtmlAttr(k)}" title="Apri prodotto finito">
        <td data-label="Nome prodotto">${displayName}</td>
        <td data-label="Codice">${displayCode}</td>
        <td data-label="Categoria">${catHtml}</td>
        <td data-label="Q.tà" class="qty">${qtyCell}</td>
      </tr>`;
  }).join("");
}

async function adjustFinishedStockAbsoluteFromRow(row, newAbsQty) {
  const r = row || {};
  const oldQty = safeInt(r.qty);
  let newQty = safeInt(newAbsQty);
  if (!Number.isFinite(newQty) || newQty < 0) newQty = 0;
  const delta = newQty - oldQty;
  if (!delta) return;

  const __uom = __normalizeUom(r.uom || "") || "pz";

  if (!fb.user || !fb.db) {
    showToast("Accedi con Google per salvare l'inventario PF", "err");
    throw new Error("not-auth");
  }

  const mv = {
    type: delta > 0 ? "IN" : "OUT",
    code: String(r.code || "").trim(),
    item: String(r.item || "").trim(),
    qty: Math.abs(delta),
    date: todayYYYYMMDD(),
    note: `Rettifica inventario PF: da ${oldQty} ${__uom} a ${newQty} ${__uom}`,
    uom: __uom,
    qtyRaw: `${Math.abs(delta)} ${__uom}`.trim(),
    warehouse: WAREHOUSE_FINISHED,
    source: "Rettifica PF",
    createdAt: serverTimestamp(),
    createdBy: (fb.user.email || fb.user.uid || "")
  };

  await addDoc(orgCol("finishedInventoryMovements"), mv);
  showToast(`Quantità PF aggiornata (${oldQty}→${newQty}) ${__uom}`);
}


// ===== Produci (PF) + scarico componenti (materie prime / imballaggi) =====
let __fpProduceBusy = false;

function __fpProdMovKey(customer, code){
  const c = String(customer || "").trim().toLowerCase();
  const k = String(code || "").trim().toLowerCase();
  return `${c}||${k}`;
}

function __fpBuildAvailByWhCustomerCode(){
  const avail = { cerea: new Map(), concamarise: new Map() };
  const arr = (state && Array.isArray(state.movements)) ? state.movements : [];

  for (const mv of (arr || [])){
    try{
      const code = String(mv && mv.code || "").trim();
      if (!code) continue;
      const cust = String(mv && mv.customer || "").trim();
      const key = __fpProdMovKey(cust, code);
      const wh = normalizeWarehouse(mv.warehouse || mv.site || mv.magazzino || mv.location || "");
      const q = safeInt(mv.qty);
      if (!q) continue;
      const delta = (String(mv.type || "").toUpperCase() === "OUT") ? -q : q;
      const m = (wh === WAREHOUSE_CONCA) ? avail.concamarise : avail.cerea;
      m.set(key, (m.get(key) || 0) + delta);
    }catch(_){ }
  }
  return avail;
}

async function produceFinishedProductFromRow(row, qtyToProduce){
  if (__fpProduceBusy) return null;

  const r = row || {};
  const fpCode = String(r.code || "").trim();
  if (!fpCode) return null;

  let qty = safeInt(qtyToProduce);
  if (!Number.isFinite(qty) || qty <= 0) qty = 0;
  if (!qty){
    showToast("Quantità non valida", "warn");
    return null;
  }

  // Auth: stessa regola della rettifica PF
  if (!fb.user || !fb.db) {
    showToast("Accedi con Google per produrre", "err");
    throw new Error("not-auth");
  }

  const fp = __findFinishedProductByCode(fpCode);
  if (!fp){
    showToast("Prodotto finito non trovato in anagrafica", "warn");
    return null;
  }

  const fpName = String(r.item || fp.name || fp.nome || fp.description || fpCode).trim() || fpCode;
  const fpUom = __normalizeUom(r.uom || fp.uom || "") || "pz";

  // Distinta base (prodotto o categoria)
  const bom = __fpGetResolvedBomForCode(fpCode);
  if (!Array.isArray(bom) || !bom.length){
    showToast("Questo prodotto non ha distinta base (né categoria con distinta)", "warn");
    return null;
  }

  // Calcola fabbisogni componenti
  const req = new Map();
  const skippedNoQty = [];
  const skippedNotMacro = [];

  for (const c of bom){
    try{
      const cCode = String(c && c.code || "").trim();
      if (!cCode) continue;

      // Solo materie prime / imballaggi
      if (!__fpIsProductionMacroForCode(cCode)) {
        skippedNotMacro.push(cCode);
        continue;
      }

      const per = __fpCompQtyPerUnit(c);
      if (per == null || !Number.isFinite(per) || per <= 0){
        skippedNoQty.push(cCode);
        continue;
      }

      const add = per * qty;
      const low = cCode.toLowerCase();
      const meta = __fpResolveComponentMeta(cCode, c.name || c.item || c.articolo || cCode, c.uom);

      const cur = req.get(low) || {
        code: cCode,
        item: meta.item || cCode,
        uom: meta.uom || __normalizeUom(c.uom || "") || "",
        customer: meta.customer || "",
        qty: 0
      };
      cur.qty += add;
      if (!cur.item) cur.item = meta.item || cCode;
      if (!cur.uom) cur.uom = meta.uom || __normalizeUom(c.uom || "") || "";
      if (!cur.customer) cur.customer = meta.customer || "";
      req.set(low, cur);
    }catch(_){ }
  }

  const needList = Array.from(req.values()).map(it => {
    const qtyInt = Math.round(Number(it.qty) || 0);
    return Object.assign({}, it, { qtyInt });
  }).filter(it => it && it.qtyInt > 0);

  if (!needList.length){
    showToast("Distinta base non valida: nessun componente con quantità", "warn");
    return null;
  }

  // Disponibilità (best effort) per warning e per split sede
  const avail = __fpBuildAvailByWhCustomerCode();
  const shortages = [];
  for (const it of needList){
    const key = __fpProdMovKey(it.customer, it.code);
    const aC = Math.max(0, safeInt(avail.cerea.get(key)));
    const aK = Math.max(0, safeInt(avail.concamarise.get(key)));
    const tot = aC + aK;
    if (tot < it.qtyInt){
      shortages.push({
        code: it.code,
        item: it.item,
        uom: it.uom,
        need: it.qtyInt,
        have: tot,
        cerea: aC,
        concamarise: aK
      });
    }
  }

  // Preview (max 12 righe)
  const prev = needList.slice(0, 12).map(it => `• ${it.code} — ${Math.round(it.qtyInt)} ${String(it.uom||"").trim()}`);
  const more = (needList.length > 12) ? `\n… +${needList.length - 12} altri` : "";

  let msg = `Produrre ${qty} ${fpUom} di\n${fpCode} — ${fpName}?\n\n` +
    `Scarico componenti (${needList.length}):\n` +
    prev.join("\n") + more;

  if (skippedNoQty.length){
    msg += `\n\n⚠️ Componenti senza quantità: ${Array.from(new Set(skippedNoQty)).slice(0,6).join(", ")}${skippedNoQty.length>6?"…":""}`;
  }
  if (skippedNotMacro.length){
    msg += `\n\nℹ️ Componenti fuori macro (non scaricati): ${Array.from(new Set(skippedNotMacro)).slice(0,6).join(", ")}${skippedNotMacro.length>6?"…":""}`;
  }
  if (shortages.length){
    const sPrev = shortages.slice(0, 6).map(s => `• ${s.code}: richiesti ${s.need}, disponibili ${s.have} (Cerea ${s.cerea}, Conca ${s.concamarise})`).join("\n");
    msg += `\n\n⚠️ Scorte insufficienti (potresti andare in negativo):\n${sPrev}${shortages.length>6?"\n…":""}`;
  }

  msg += `\n\nConfermi?`;
  if (!confirm(msg)) return null;

  __fpProduceBusy = true;
  try{
    const actor = (fb.user && (fb.user.email || fb.user.uid)) || "";
    const date = todayYYYYMMDD();
    const batchId = `PROD-${date}-${String(Math.random()).slice(2,8)}`;

    // Costruisci movimenti componenti (split su sede con più disponibilità)
    const movs = [];

    for (const it of needList){
      const cust = String(it.customer || "").trim();
      const key = __fpProdMovKey(cust, it.code);

      let need = Math.max(0, safeInt(it.qtyInt));
      let aC = Math.max(0, safeInt(avail.cerea.get(key)));
      let aK = Math.max(0, safeInt(avail.concamarise.get(key)));

      const first = (aK > aC) ? WAREHOUSE_CONCA : WAREHOUSE_CEREA;
      const second = (first === WAREHOUSE_CEREA) ? WAREHOUSE_CONCA : WAREHOUSE_CEREA;

      const takeFrom = (wh) => {
        if (need <= 0) return 0;
        const cur = (wh === WAREHOUSE_CONCA) ? aK : aC;
        const take = Math.min(need, cur);
        if (take <= 0) return 0;
        need -= take;
        if (wh === WAREHOUSE_CONCA) aK -= take;
        else aC -= take;
        return take;
      };

      const t1 = takeFrom(first);
      const t2 = takeFrom(second);

      // Se rimane bisogno (stock insufficiente), scarico comunque sul primo magazzino (andando in negativo)
      let t3 = 0;
      if (need > 0){
        t3 = need;
        need = 0;
        if (first === WAREHOUSE_CONCA) aK -= t3;
        else aC -= t3;
      }

      // aggiorna disponibilità live
      avail.cerea.set(key, aC);
      avail.concamarise.set(key, aK);

      const note = `Produzione PF: ${fpCode} x ${qty} ${fpUom} (${batchId})`;
      const makePayload = (warehouse, qtyInt) => ({
        type: "OUT",
        customer: cust,
        code: it.code,
        item: it.item || it.code,
        uom: String(it.uom || "").trim(),
        qtyRaw: `${it.qty} ${String(it.uom||"").trim()}`.trim(),
        qty: qtyInt,
        date: date,
        note: note,
        source: "Produzione PF",
        rawText: "",
        warehouse: warehouse,
        docType: "PRODUZIONE",
        docNum: batchId,
        docDateRaw: date,
        createdAt: serverTimestamp(),
        createdBy: actor
      });

      if (t1 > 0) movs.push(makePayload(first, t1));
      if (t2 > 0) movs.push(makePayload(second, t2));
      if (t3 > 0) movs.push(makePayload(first, t3));
    }

    // Movimento carico PF
    const fpMv = {
      type: "IN",
      code: fpCode,
      item: fpName,
      uom: fpUom,
      qty: qty,
      qtyRaw: `${qty} ${fpUom}`.trim(),
      date: date,
      note: `Produzione PF: +${qty} ${fpUom} (${batchId})`,
      source: "Produzione PF",
      warehouse: WAREHOUSE_FINISHED,
      docType: "PRODUZIONE",
      docNum: batchId,
      docDateRaw: date,
      createdAt: serverTimestamp(),
      createdBy: actor
    };

    // Scrivi tutto in modo atomico (una transazione)
    await runTransaction(fb.db, async (tx) => {
      const fpRef = doc(orgCol("finishedInventoryMovements"));
      tx.set(fpRef, fpMv);

      for (const mv of (movs || [])){
        const ref = doc(orgCol("inventoryMovements"));
        tx.set(ref, mv);
      }
    });

    showToast(`Prodotto: +${qty} ${fpUom} • scarico componenti: ${movs.length} movimenti`, "ok");
    return { qty, batchId, movementsCount: movs.length };
  }catch(e){
    console.error("produceFinishedProductFromRow failed", e);
    showToast("Errore produzione", "err");
    throw e;
  }finally{
    __fpProduceBusy = false;
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
      try{
        const totalAll = Array.isArray(__docGroups) ? __docGroups.length : 0;

        // Pill count sempre (anche se vista non aperta)
        try{ if (pillFlowsCount) pillFlowsCount.textContent = String(totalAll); }catch(_){}

        // Se la vista non è aperta, evita lavoro pesante
        const isActive = !!(__views && __views.flows && __views.flows.classList && __views.flows.classList.contains("active"));
        const qRaw = String((flowsSearch && flowsSearch.value) || "").trim();
        const hasQuery = !!qRaw;

        if (!isActive && !hasQuery) {
          try{ if (flowsMeta) flowsMeta.textContent = "—"; }catch(_){}
          return;
        }

        if (!flowsTbody) return;

        const maxRecent = Math.max(10, Math.floor(Number(state && state.settings && state.settings.maxRecent) || 50));
        const showCap = 200;

        // Cache indices (invalidate when docGroups change)
        const ver = String(totalAll) + "|" + (totalAll ? String((__docGroups[0] && (__docGroups[0].createdAtMax || __docGroups[0].key)) || "") : "");
        if (renderFlowsTable._cacheVer !== ver) {
          renderFlowsTable._cacheVer = ver;
          renderFlowsTable._cache = new Map();
        }
        const cache = renderFlowsTable._cache;

        const strip = (s) => {
          try { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
          catch(_){ return String(s || ""); }
        };
        const norm = (s) => strip(String(s || "")).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

        const getIndex = (g) => {
          const k = String(g && g.key || "");
          try{ if (cache && cache.has(k)) return cache.get(k); }catch(_){}

          const label = (typeof formatDocLabel === "function") ? formatDocLabel(g || {}) : String((g && g.note) || "");
          const cust  = String((g && g.customer) || "");
          const vat   = String((g && g.supplierVat) || (g && g.vatNorm) || "");
          const note  = String((g && g.note) || "");
          const docNum = String((g && g.docNum) || (typeof extractDocNumber === "function" ? (extractDocNumber(note) || "") : ""));
          const date  = String((g && g.date) || "");
          const dateIt = (typeof formatDateOnlyIT === "function") ? (formatDateOnlyIT(date) || "") : "";

          // indicizza anche righe (codici/articoli) ma con un cap (UI)
          let codes = "", items = "";
          try{
            const mv = Array.isArray(g && g.movements) ? g.movements : [];
            const cap = 90;
            for (let i=0; i<mv.length && i<cap; i++){
              const r = mv[i] || {};
              const c = String(r.code || "").trim();
              const it = String(r.item || "").trim();
              if (c) codes += " " + c;
              if (it) items += " " + it;
            }
          }catch(_){}

          const blob = norm([label, cust, vat, docNum, note, date, dateIt, codes, items].join(" "));

          const idx = {
            blob,
            labelN: norm(label),
            custN: norm(cust),
            vatN: norm(vat),
            docNumN: norm(docNum),
            noteN: norm(note),
            dateN: norm(date + " " + dateIt),
            codesN: norm(codes),
            itemsN: norm(items)
          };

          try{ cache && cache.set(k, idx); }catch(_){}
          return idx;
        };

        const allDocs = Array.isArray(__docGroups) ? __docGroups : [];
        let docsToShow = [];
        let metaText = "";

        const qN = norm(qRaw);
        const tokens = qN ? qN.split(/\s+/).filter(Boolean) : [];

        if (!tokens.length){
          docsToShow = allDocs.slice(0, maxRecent);
          metaText = totalAll ? (`Ultimi ${docsToShow.length.toLocaleString("it-IT")} su ${totalAll.toLocaleString("it-IT")}`) : "—";
        } else {
          const matches = [];
          for (const g of allDocs){
            const idx = getIndex(g);
            if (!idx || !idx.blob) continue;

            // AND: ogni token deve comparire da qualche parte
            let ok = true;
            for (const t of tokens){
              if (idx.blob.indexOf(t) < 0) { ok = false; break; }
            }
            if (!ok) continue;

            // scoring (smart)
            let score = 0;
            for (const t of tokens){
              if (!t) continue;

              if (idx.docNumN === t) score += 140;
              else if (idx.docNumN && idx.docNumN.startsWith(t)) score += 110;
              else if (idx.docNumN && idx.docNumN.indexOf(t) >= 0) score += 80;

              if (idx.vatN && idx.vatN.startsWith(t)) score += 120;
              else if (idx.vatN && idx.vatN.indexOf(t) >= 0) score += 85;

              if (idx.codesN && idx.codesN.indexOf(t) >= 0) score += 95;
              if (idx.itemsN && idx.itemsN.indexOf(t) >= 0) score += 35;

              if (idx.custN && idx.custN.indexOf(t) >= 0) score += 60;
              if (idx.labelN && idx.labelN.indexOf(t) >= 0) score += 55;
              if (idx.noteN && idx.noteN.indexOf(t) >= 0) score += 28;
              if (idx.dateN && idx.dateN.indexOf(t) >= 0) score += 70;

              if (idx.custN && idx.custN.startsWith(t)) score += 8;
              if (idx.labelN && idx.labelN.startsWith(t)) score += 6;
            }

            matches.push({ g, score });
          }

          matches.sort((a,b) => {
            const s = (b.score||0) - (a.score||0);
            if (s !== 0) return s;

            const bc = String((b.g && (b.g.createdAtMax || "")) || "");
            const ac = String((a.g && (a.g.createdAtMax || "")) || "");
            if (bc && ac && bc !== ac) return bc.localeCompare(ac) * -1;

            return String((b.g && b.g.key) || "").localeCompare(String((a.g && a.g.key) || ""));
          });

          const capped = matches.length > showCap;
          docsToShow = matches.slice(0, showCap).map(x => x.g);

          metaText = `Risultati: ${matches.length.toLocaleString("it-IT")} su ${totalAll.toLocaleString("it-IT")}`;
          if (capped) metaText += ` (mostrati primi ${showCap.toLocaleString("it-IT")})`;
        }

        // expose for Enter-to-open
        try{ renderFlowsTable._lastFiltered = docsToShow.slice(); }catch(_){}

        try{ if (flowsMeta) flowsMeta.textContent = metaText || "—"; }catch(_){}

        if (!docsToShow.length){
          flowsTbody.innerHTML = tokens.length
            ? '<tr><td class="td-muted" colspan="4">Nessun risultato. Prova con fornitore, numero, data, codice o articolo.</td></tr>'
            : '<tr><td class="td-muted" colspan="4">Nessun flusso ancora.</td></tr>';
          return;
        }

        flowsTbody.innerHTML = docsToShow.map(g => {
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
      }catch(e){
        console.warn("renderFlowsTable failed", e);
        try{
          if (flowsTbody) flowsTbody.innerHTML = '<tr><td class="td-muted" colspan="4">Errore render flussi.</td></tr>';
        }catch(_){}
      }
    }


    /****************************************************************
     * Sposta Inventario (viewMoveInventory)
     ****************************************************************/
    const viewMoveInv = document.getElementById("viewMoveInventory");
    const moveInvHome = document.getElementById("moveInvHome");
    const moveInvList = document.getElementById("moveInvList");
    const btnMoveFromCerea = document.getElementById("btnMoveFromCerea");
    const btnMoveFromConca = document.getElementById("btnMoveFromConca");
    const btnMoveInvBack = document.getElementById("btnMoveInvBack");
    const moveInvListTitle = document.getElementById("moveInvListTitle");
    const moveInvListSub = document.getElementById("moveInvListSub");
    const moveInvSearch = document.getElementById("moveInvSearch");
    const moveInvMeta = document.getElementById("moveInvMeta");
    const moveInvTbody = document.getElementById("moveInvTbody");
    const pillMoveInvCount = document.getElementById("pillMoveInvCount");

    const modalMoveInvQty = document.getElementById("modalMoveInvQty");
    const moveInvQtyTitle = document.getElementById("moveInvQtyTitle");
    const moveInvQtySub = document.getElementById("moveInvQtySub");
    const moveInvQtyHint = document.getElementById("moveInvQtyHint");
    const moveInvQtyItem = document.getElementById("moveInvQtyItem");
    const moveInvQtyInput = document.getElementById("moveInvQtyInput");
    const btnCloseMoveInvQty = document.getElementById("btnCloseMoveInvQty");
    const btnMoveInvQtyCancel = document.getElementById("btnMoveInvQtyCancel");
    const btnMoveInvQtyOk = document.getElementById("btnMoveInvQtyOk");

    let __moveInvFromWh = "";
    let __moveInvToWh = "";
    let __moveInvRowMap = new Map();

    function resetMoveInvDirection(){
      __moveInvFromWh = "";
      __moveInvToWh = "";
      __moveInvRowMap = new Map();
      try{ if (moveInvHome) moveInvHome.style.display = ""; }catch(_){}
      try{ if (moveInvList) moveInvList.style.display = "none"; }catch(_){}
      try{ if (moveInvSearch) moveInvSearch.value = ""; }catch(_){}
      try{ if (moveInvMeta) moveInvMeta.textContent = "—"; }catch(_){}
      try{ if (pillMoveInvCount) pillMoveInvCount.textContent = "0"; }catch(_){}
      try{
        if (moveInvTbody) moveInvTbody.innerHTML = '<tr><td class="td-muted" colspan="3">Seleziona una direzione.</td></tr>';
      }catch(_){}
      try{
        if (modalMoveInvQty) modalMoveInvQty.classList.remove("open");
      }catch(_){}
      try{ __syncBodyLockFromModals && __syncBodyLockFromModals(); }catch(_){}
      try{ __syncDockedControlsVisibility && __syncDockedControlsVisibility(); }catch(_){}
    }

    function __setMoveInvDirection(fromWh, toWh){
      __moveInvFromWh = normalizeWarehouse(fromWh || "");
      __moveInvToWh = normalizeWarehouse(toWh || "");

      try{ if (moveInvHome) moveInvHome.style.display = "none"; }catch(_){}
      try{ if (moveInvList) moveInvList.style.display = ""; }catch(_){}
      try{
        if (moveInvListTitle) moveInvListTitle.textContent =
          `${warehouseLabel(__moveInvFromWh)} → ${warehouseLabel(__moveInvToWh)}`;
      }catch(_){}
      try{
        if (moveInvListSub) moveInvListSub.textContent = "Clicca una riga per inserire la quantità da spostare.";
      }catch(_){}
      try{ if (moveInvSearch) moveInvSearch.value = ""; }catch(_){}
      try{ renderMoveInv(); }catch(_){}
      try{ __syncDockedControlsVisibility && __syncDockedControlsVisibility(); }catch(_){}
    }

    function __moveInvNorm(s){
      try{
        return normTextKey(String(s || ""));
      }catch(_){
        return String(s || "").toLowerCase();
      }
    }

    function renderMoveInv(){
      try{
        if (!viewMoveInv) return;

        // aggiorna solo se la vista è aperta o se serve contatore
        const isActive = !!(viewMoveInv.classList && viewMoveInv.classList.contains("active"));

        if (!isActive){
          try{ if (pillMoveInvCount) pillMoveInvCount.textContent = String(pillMoveInvCount.textContent || "0"); }catch(_){}
          return;
        }

        // step home
        if (!__moveInvFromWh || !__moveInvToWh){
          try{ if (pillMoveInvCount) pillMoveInvCount.textContent = "0"; }catch(_){}
          return;
        }

        let stockByWh = [];
        try{ stockByWh = (typeof computeStockByWarehouse === "function") ? computeStockByWarehouse() : []; }catch(_){ stockByWh = []; }

        let rows = buildInventoryRowsForWarehouse(__moveInvFromWh, stockByWh || []);
        rows = groupStockRowsByAlias(rows);

        // solo disponibili (>0)
        rows = rows.filter(r => safeInt(r && r.qty) > 0);

        const q = __moveInvNorm((moveInvSearch && moveInvSearch.value) || "").trim();
        if (q){
          rows = rows.filter(r => {
            const hay = [
              r.customer || "",
              r.item || "",
              r.__alias || "",
              ...(Array.isArray(r.__codes) ? r.__codes : []),
              ...(Array.isArray(r.__customers) ? r.__customers : []),
              ...(Array.isArray(r.__members) ? r.__members.map(m => (m && m.item) || "") : []),
              ...(Array.isArray(r.__members) ? r.__members.map(m => (m && m.code) || "") : [])
            ].join(" ");
            return __moveInvNorm(hay).includes(q);
          });
        }

        // sort by item then code
        rows.sort((a,b) => {
          const ai = String(a && a.item || "").toLowerCase();
          const bi = String(b && b.item || "").toLowerCase();
          if (ai && bi && ai !== bi) return ai.localeCompare(bi, "it");
          const ac = String((a && (a.__displayCode || a.code)) || "");
          const bc = String((b && (b.__displayCode || b.code)) || "");
          return ac.localeCompare(bc, "it");
        });

        try{ if (pillMoveInvCount) pillMoveInvCount.textContent = String(rows.length); }catch(_){}
        try{ if (moveInvMeta) moveInvMeta.textContent = `Righe: ${rows.length.toLocaleString("it-IT")}`; }catch(_){}

        if (!moveInvTbody) return;

        if (!rows.length){
          moveInvTbody.innerHTML = '<tr><td class="td-muted" colspan="3">Nessun articolo disponibile.</td></tr>';
          __moveInvRowMap = new Map();
          return;
        }

        const max = 900;
        const show = rows.slice(0, max);

        __moveInvRowMap = new Map(show.map(r => {
          const gk = String(r && (r.__groupKey || r.__displayCode || r.code) || "").trim() || ("gk_" + Math.random().toString(16).slice(2));
          return [gk, r];
        }));

        const fmt = (n) => Number(safeInt(n)).toLocaleString("it-IT");
        const uomFor = (r) => {
          try{
            const u = __normalizeUom(r && r.uom || "") || getUomResolvedForCodes(r && r.__codes || []) || getUomResolvedForCode((r && r.code) || "") || "pz";
            return u || "pz";
          }catch(_){ return "pz"; }
        };

        moveInvTbody.innerHTML = show.map(r => {
          const gk = String(r && (r.__groupKey || r.__displayCode || r.code) || "").trim();
          const code = escapeHtml(String(r && (r.__displayCode || r.code) || "").trim());
          const item = escapeHtml(String(r && r.item || "").trim());
          const qty = fmt(r && r.qty);
          const uom = escapeHtml(uomFor(r));
          return `
            <tr class="moveInvRow" data-gk="${escapeHtmlAttr(gk)}" title="Sposta quantità">
              <td data-label="Codice"><span class="kbd">${code || "—"}</span></td>
              <td data-label="Articolo">${item || '<span class="td-muted">—</span>'}</td>
              <td data-label="Disponibile" class="qty" style="text-align:right;">${qty} <span class="td-muted" style="font-size:12px;">${uom}</span></td>
            </tr>
          `;
        }).join("") + (rows.length > show.length ? `<tr><td class="td-muted" colspan="3">+${rows.length - show.length} altri… (affina la ricerca)</td></tr>` : "");
      }catch(e){
        console.warn("renderMoveInv failed", e);
        try{ if (moveInvTbody) moveInvTbody.innerHTML = '<tr><td class="td-muted" colspan="3">Errore render.</td></tr>'; }catch(_){}
      }
    }

    function closeMoveInvQtyModal(){
      try{ if (modalMoveInvQty) modalMoveInvQty.classList.remove("open"); }catch(_){}
      try{ __syncBodyLockFromModals && __syncBodyLockFromModals(); }catch(_){}
    }

    function openMoveInvQtyModal(groupKey){
      try{
        const gk = String(groupKey || "").trim();
        const row = (__moveInvRowMap && __moveInvRowMap.get) ? __moveInvRowMap.get(gk) : null;
        if (!row) { showToast("Riga non trovata"); return; }

        const avail = safeInt(row && row.qty);
        if (avail <= 0) { showToast("Nessuna disponibilità"); return; }

        const uom = __normalizeUom(row && row.uom || "") || getUomResolvedForCodes(row && row.__codes || []) || getUomResolvedForCode((row && row.code) || "") || "pz";

        if (moveInvQtyTitle) moveInvQtyTitle.textContent = "Sposta inventario";
        if (moveInvQtySub) moveInvQtySub.textContent = `${warehouseLabel(__moveInvFromWh)} → ${warehouseLabel(__moveInvToWh)}`;
        if (moveInvQtyHint) moveInvQtyHint.textContent = `Disponibile: ${avail.toLocaleString("it-IT")} ${uom}`;
        if (moveInvQtyItem){
          const itemName = String(row && row.item || "").trim();
          moveInvQtyItem.textContent = itemName || "—";
        }

        if (moveInvQtyInput){
          moveInvQtyInput.value = "";
          moveInvQtyInput.setAttribute("max", String(avail));
          moveInvQtyInput.dataset.gk = gk;
        }

        if (modalMoveInvQty){
          modalMoveInvQty.classList.add("open");
          __syncBodyLockFromModals && __syncBodyLockFromModals();
        }

        if (!__isMobileDevice()){
          try{ moveInvQtyInput && moveInvQtyInput.focus(); }catch(_){}
        }
      }catch(e){
        console.warn("openMoveInvQtyModal failed", e);
      }
    }

    async function __doMoveInvTransferFromRow(row, qty){
      const g = row || {};
      const q = safeInt(qty);
      if (!Number.isFinite(q) || q <= 0){
        showToast("Inserisci una quantità valida", "warn");
        return;
      }

      const from = normalizeWarehouse(__moveInvFromWh || "");
      const to = normalizeWarehouse(__moveInvToWh || "");
      const avail = safeInt(g.qty);
      if (q > avail){
        showToast("Quantità superiore al disponibile", "err");
        return;
      }

      const uom = __normalizeUom(g.uom || "") || getUomResolvedForCodes(g.__codes || []) || getUomResolvedForCode(g.code || "") || "pz";
      const note = `Spostamento inventario: ${warehouseLabel(from)} → ${warehouseLabel(to)}`;

      // membri (per alias group) — se non presenti, fallback su riga singola
      const membersRaw = Array.isArray(g.__members) ? g.__members.slice() : [g];
      const members = membersRaw.map(m => ({
        customer: String(m && m.customer || "").trim(),
        code: String(m && m.code || "").trim(),
        item: String(m && m.item || "").trim(),
        qty: safeInt(m && m.qty),
        warehouse: normalizeWarehouse((m && m.warehouse) || from)
      })).filter(m => !!m.code && normalizeWarehouse(m.warehouse) === from);

      if (!members.length){
        showToast("Errore: nessun membro valido", "err");
        return;
      }

      const custFallback = Array.isArray(g.__customers)
        ? String(g.__customers.find(x => String(x || "").trim()) || "").trim()
        : "";

      let remaining = q;
      const mvs = [];
      const sorted = members.slice().sort((a,b) => safeInt(b.qty) - safeInt(a.qty));

      const available = sorted.reduce((sum, m) => sum + safeInt(m.qty), 0);
      if (available < remaining){
        showToast("Errore: stock non sufficiente", "err");
        return;
      }

      for (const m of sorted){
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
          note,
          uom,
          qtyRaw: `${take} ${uom}`.trim(),
          warehouse: from,
          source: "Spostamento",
          rawText: ""
        }));

        mvs.push(makeMovement({
          type: "IN",
          customer: cust,
          code,
          item,
          qty: take,
          date: todayYYYYMMDD(),
          note,
          uom,
          qtyRaw: `${take} ${uom}`.trim(),
          warehouse: to,
          source: "Spostamento",
          rawText: ""
        }));

        remaining -= take;
      }

      if (remaining > 0){
        showToast("Errore: quantità non allocata", "err");
        return;
      }

      try{
        if (btnMoveInvQtyOk) btnMoveInvQtyOk.disabled = true;
        await addMovementsBatch(mvs);
        showToast(`Spostato ${q} ${uom}`);
        closeMoveInvQtyModal();
        // refresh list
        try{ renderAll(); }catch(_){}
        try{ renderMoveInv(); }catch(_){}
      }catch(e){
        console.error(e);
        showToast("Errore spostamento", "err");
      }finally{
        try{ if (btnMoveInvQtyOk) btnMoveInvQtyOk.disabled = false; }catch(_){}
      }
    }

    // Bind events (once)
    (function __bindMoveInvEvents(){
      try{
        if (viewMoveInv && viewMoveInv.dataset && viewMoveInv.dataset.bound === "1") return;
        if (viewMoveInv && viewMoveInv.dataset) viewMoveInv.dataset.bound = "1";

        btnMoveFromCerea?.addEventListener("click", () => { __setMoveInvDirection(WAREHOUSE_CEREA, WAREHOUSE_CONCA); });
        btnMoveFromConca?.addEventListener("click", () => { __setMoveInvDirection(WAREHOUSE_CONCA, WAREHOUSE_CEREA); });
        btnMoveInvBack?.addEventListener("click", () => { resetMoveInvDirection(); });

        moveInvSearch?.addEventListener("input", () => { try{ renderMoveInv(); }catch(_){ } });

        // table row click
        moveInvTbody?.addEventListener("click", (e) => {
          const tr = e.target && e.target.closest ? e.target.closest("tr[data-gk]") : null;
          if (!tr) return;
          const gk = tr.getAttribute("data-gk") || "";
          if (!gk) return;
          openMoveInvQtyModal(gk);
        });

        // modal close/cancel
        btnCloseMoveInvQty?.addEventListener("click", closeMoveInvQtyModal);
        btnMoveInvQtyCancel?.addEventListener("click", closeMoveInvQtyModal);
        modalMoveInvQty?.addEventListener("click", (e) => { if (e.target === modalMoveInvQty) closeMoveInvQtyModal(); });

        // ok
        btnMoveInvQtyOk?.addEventListener("click", async () => {
          const gk = moveInvQtyInput ? String(moveInvQtyInput.dataset.gk || "") : "";
          const row = (__moveInvRowMap && __moveInvRowMap.get) ? __moveInvRowMap.get(gk) : null;
          if (!row) { showToast("Riga non trovata"); return; }
          const q = safeInt(moveInvQtyInput ? moveInvQtyInput.value : 0);
          await __doMoveInvTransferFromRow(row, q);
        });

        // Enter/Esc in input
        moveInvQtyInput?.addEventListener("keydown", (e) => {
          if (e.key === "Enter"){ e.preventDefault(); btnMoveInvQtyOk && btnMoveInvQtyOk.click(); }
          if (e.key === "Escape"){ e.preventDefault(); closeMoveInvQtyModal(); }
        });

      }catch(_){}
    })();


function renderAll() {
      const stockArr = computeStock();
      const stockByWh = computeStockByWarehouse();
      const fpStockByWh = computeFinishedStockByWarehouse();
      rebuildDocGroupsCache();

      // Home / KPI: totale (somma di tutti i magazzini)
      renderStats(stockArr);
      renderLowStockBoard(stockByWh);
      renderCategoryBoardCerea(stockByWh);
      renderInventoryTrend(stockArr);
      try{ renderHomeDaneaCockpit(); }catch(_){ }

      try{ renderMoveInv(); }catch(_){ }

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

      // Inventario prodotti finiti: sede unica
      try{ renderFpInventoryCategoryOptions(); }catch(_){ }
      try{ setFinishedInventoryWarehouse(); }catch(_){ }
      try{
        const fpRows = buildFinishedInventoryRowsForWarehouse(__currentFinishedWarehouse, fpStockByWh || []);
        renderFinishedStockTable(fpRows);
      }catch(_){
        try{ if (pillFpStock) pillFpStock.textContent = "—"; }catch(__){ }
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

      // CTA: nuovo articolo (solo Materie prime / Imballaggi)
      try{
        if (btnAnagAddProduct) {
          const mg = normalizeProductsMacroGroup(activeProductsMacroGroup) || "imballaggi";
          const show = (activeAnagTab === "products") && (mg === "materie_prime" || mg === "imballaggi");
          btnAnagAddProduct.style.display = show ? "" : "none";
        }
      }catch(_){ }

      // CTA: nuovo prodotto finito (solo in tab finished)
      try{ if (btnNewFinishedProduct) btnNewFinishedProduct.style.display = "none"; }catch(_){ }

      // UI: barra associazione categorie (nasconde/mostra in base al tab)
      try{ __fpRenderAssignControls(); }catch(_){ }


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

      // ===== Anagrafica: Prodotti finiti =====
      if (activeAnagTab === "finished") {
        try { if (anagTable) anagTable.classList.remove("anagTableProducts"); } catch(_){}
        try { if (searchAnag) searchAnag.placeholder = "Nome o codice prodotto finito…"; } catch(_){}

        // UI: selezione multipla + associazione categoria
        try{ __fpSelPurgeAgainstList(); }catch(_){}
        try{ __fpRenderAssignControls(); }catch(_){}

        try {
          anagTheadRow.innerHTML = `
            <th style="width:56px; text-align:center;">
              <input type="checkbox" id="fpSelectAll" aria-label="Seleziona tutti" />
            </th>
            <th style="width:180px">Codice</th>
            <th>Nome</th>
            <th style="width:260px">Categoria</th>
            <th style="width:140px; text-align:right;">Distinta</th>
          `;
        } catch(_){}

        // CTA: nuovo prodotto finito (solo se loggato)
        try{ if (btnNewFinishedProduct) btnNewFinishedProduct.style.display = fb.user ? "" : "none"; }catch(_){}

        if (!fb.user) {
          try { if (anagTbody) anagTbody.innerHTML = `<tr><td class="td-muted" colspan="5">Accedi con Google per sincronizzare i prodotti finiti.</td></tr>`; } catch(_){}
          return;
        }

        const list0 = Array.isArray(finishedProducts) ? finishedProducts.slice() : [];
        let filtered = list0.filter(fp => {
          const name = normTextKey(fp && (fp.name || fp.nome || ""));
          const code = normTextKey(fp && (fp.code || fp.sku || ""));
          const idk  = normTextKey(fp && (fp.id || ""));
          if (!q) return true;
          return (name && name.includes(q)) || (code && code.includes(q)) || (idk && idk.includes(q));
        });

        // filtro: prodotti non classificati
        try{
          const mode = String(document.getElementById("fpFilterUnclassified")?.value || "all").trim().toLowerCase();
          if (mode === "unclassified"){
            filtered = filtered.filter(fp => {
              const k = String(fp && (fp.categoryKeyLower || fp.categoryKey || "") || "").trim();
              const comps = Array.isArray(fp && (fp.components || fp.bom || fp.distintaBase)) ? (fp.components || fp.bom || fp.distintaBase) : [];
              // Se ha già una distinta base propria => è "Singolo" (non considerarlo "non classificato")
              return (!k) && !(comps && comps.length);
            });
          }
        }catch(_){ }


        filtered.sort((a,b) => String((a && (a.nameLower || a.name || "")) || "").localeCompare(String((b && (b.nameLower || b.name || "")) || ""), "it", { sensitivity:"base" }));

        if (!filtered.length) {
          const __mode = String(document.getElementById("fpFilterUnclassified")?.value || "all").trim().toLowerCase();
          const msg = (__mode === "unclassified")
            ? (q ? "Nessun prodotto finito non classificato trovato." : "Nessun prodotto finito non classificato.")
            : (q ? "Nessun prodotto finito trovato." : "Nessun prodotto finito.");
          try { if (anagTbody) anagTbody.innerHTML = `<tr><td class="td-muted" colspan="5">${escapeHtml(msg)}</td></tr>`; } catch(_){}
          try{ __fpRenderAssignControls(); }catch(_){}
          try{ __fpSyncSelectAllState(); }catch(_){}
          return;
        }

        // map categorie (per colonna "Categoria")
        try{
          finishedProductCategoriesMap = new Map();
          if (Array.isArray(finishedProductCategories)){
            for (const c of finishedProductCategories){
              const kk = String(c && c.key || "").trim().toLowerCase();
              if (kk) finishedProductCategoriesMap.set(kk, c);
            }
          }
        }catch(_){}

        try{
          anagTbody.innerHTML = filtered.map(fp => {
            const id = String(fp && fp.id || "").trim();
            const code = String(fp && (fp.code || "") || "").trim();
            const name = String(fp && (fp.name || fp.nome || "") || "").trim();

            const isSel = __fpSelectedIds.has(id) ? "checked" : "";

            const comps = Array.isArray(fp && (fp.components || fp.bom || fp.distintaBase)) ? (fp.components || fp.bom || fp.distintaBase) : [];
            const nDirect = comps.length;
            const isSingle = __fpIsSingle(fp);

            const catKey = isSingle ? "singolo" : String(fp && (fp.categoryKeyLower || fp.categoryKey || "") || "").trim().toLowerCase();
            const catObj = (!isSingle && catKey) ? (finishedProductCategoriesMap.get(catKey) || null) : null;
            const catName = isSingle ? "Singolo" : String((catObj && (catObj.name || catObj.label || catObj.key)) || (catKey || "")).trim();
            const catHtml = catName ? escapeHtml(catName) : '<span class="td-muted">—</span>';

            // label distinta: se in categoria, mostra conteggio BOM della categoria; se singolo, conteggio BOM proprio
            let bomCount = isSingle ? nDirect : 0;
            try{
              if (!isSingle && catObj){
                const catBom = Array.isArray(catObj && (catObj.bom || catObj.components)) ? (catObj.bom || catObj.components) : [];
                bomCount = catBom.length;
              }
            }catch(_){ bomCount = isSingle ? nDirect : 0; }

            const bomBtnLabel = bomCount ? ("Distinta (" + bomCount + ")") : "Distinta";

            return `
              <tr class="jsFpRow" data-fp-id="${escapeHtmlAttr(id)}">
                <td data-label="Sel" style="text-align:center;">
                  <input class="jsFpSel" type="checkbox" data-id="${escapeHtmlAttr(id)}" ${isSel} aria-label="Seleziona" />
                </td>
                <td data-label="Codice"><span class="kbd">${escapeHtml(code || "—")}</span></td>
                <td data-label="Nome">${escapeHtml(name || "—")}</td>
                <td data-label="Categoria">${catHtml}</td>
                <td data-label="Distinta" style="text-align:right;">
                  <button class="btn btn-ghost btn-xs" type="button" data-action="openFinishedProduct" data-id="${escapeHtmlAttr(id)}" title="Apri distinta base">${escapeHtml(bomBtnLabel)}</button>
                </td>
              </tr>
            `;
          }).join("");
        }catch(_){
          try { if (anagTbody) anagTbody.innerHTML = `<tr><td class="td-muted" colspan="5">Errore rendering.</td></tr>`; } catch(_){}
        }

        try{ __fpRenderAssignControls(); }catch(_){}
        try{ __fpSyncSelectAllState(); }catch(_){}
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


          const scopeCustomerKey = (!isAliasGroup && ctx && String(ctx.customer || "").trim())
            ? normSupplierKey(ctx.customer)
            : "";

          const sumWh = (w) => {
            const ww = normalizeWarehouse(w);
            let s = 0;
            for (const r of (stockByWh || [])) {
              if (!r) continue;
              if (normalizeWarehouse(r.warehouse || "") !== ww) continue;
              const rc = String(r.code || "").trim();
              if (!rc || !scopeCodes.includes(rc)) continue;
              if (scopeCustomerKey) {
                const ck = normSupplierKey(r.customer || "");
                if (ck !== scopeCustomerKey) continue;
              }
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
              if (scopeCustomerKey) {
                const ck = normSupplierKey(r.customer || "");
                if (ck !== scopeCustomerKey) continue;
              }
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
        const supplier = mem ? String(mem.customer || "").trim() : "";
        const label = supplier ? `${name || code} • ${supplier} • ${code}` : `${name || code} • ${code}`;
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
      try {
        const el = document.getElementById("sScanBridgeKey");
        if (el) el.value = state.settings.scanbridgeKey || "";
      } catch(_) {}
      sLowThreshold.value = String(Math.max(1000, Math.floor(Number(state.settings.lowThreshold) || 0)));
      sMaxRecent.value = String(Math.floor(Number(state.settings.maxRecent) || 30));
    }

    function saveSettingsFromUI() {
      state.settings.ocrUrl = (sOcrUrl.value || "").trim();
      state.settings.ocrKey = (sOcrKey.value || "").trim();
      try {
        const el = document.getElementById("sScanBridgeKey");
        state.settings.scanbridgeKey = (el && el.value ? String(el.value).trim() : "");
      } catch(_) {
        state.settings.scanbridgeKey = String(state.settings.scanbridgeKey || "");
      }
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

    // PDF backup (in realtà TXT): esporta lista articoli + quantità per inventario selezionato
    function exportInventoryBackupTxt() {
      const wh = String(__currentWarehouse || "").trim();
      if (!wh) { showToast("Seleziona inventario"); return; }

      let stockByWh = [];
      try { stockByWh = (typeof computeStockByWarehouse === "function") ? computeStockByWarehouse() : []; } catch(_) { stockByWh = []; }

      let rows = [];
      try { rows = buildInventoryRowsForWarehouse(wh, stockByWh || []); } catch(_) { rows = []; }

      try { rows = groupStockRowsByAlias(rows); } catch(_) {}

      const normUom = (r) => {
        try {
          const u = (typeof __normalizeUom === "function") ? __normalizeUom(r && r.uom) : String((r && r.uom) || "").trim();
          const u0 = String(u || "").trim();
          if (u0) return u0;
        } catch(_) {}
        try {
          const codes = (r && Array.isArray(r.__codes)) ? r.__codes : [];
          const u2 = (typeof getUomResolvedForCodes === "function") ? getUomResolvedForCodes(codes) : "";
          if (u2) return String(u2);
        } catch(_) {}
        try {
          const u3 = (typeof getUomResolvedForCode === "function") ? getUomResolvedForCode(r && r.code) : "";
          if (u3) return String(u3);
        } catch(_) {}
        return "pz";
      };

      const fmtQty = (n) => (Number(n) || 0).toLocaleString("it-IT");

      const list = (Array.isArray(rows) ? rows : []).map(r => ({
        name: String(r && r.item || "").trim() || "—",
        code: String(r && (r.__displayCode || r.code) || "").trim() || "—",
        qty: safeInt(r && r.qty),
        uom: normUom(r)
      }));

      list.sort((a,b) =>
        (a.name || "").localeCompare((b.name || ""), "it", { sensitivity: "base" }) ||
        (a.code || "").localeCompare((b.code || ""), "it", { sensitivity: "base" })
      );

      const title = (typeof warehouseLabel === "function") ? warehouseLabel(wh) : ("Inventario " + String(wh));
      const ts = new Date().toLocaleString("it-IT");

      const lines = [];
      lines.push(`${title} — BACKUP`);
      lines.push(`Generato: ${ts}`);
      lines.push(`Righe: ${list.length}`);
      lines.push("");
      list.forEach((it, idx) => {
        lines.push(`${String(idx+1).padStart(4," ")}. ${it.name} | ${it.code} | ${fmtQty(it.qty)} ${it.uom}`);
      });

      const filename = `backup_${normalizeWarehouse(wh)}_${todayYYYYMMDD()}.txt`;
      downloadBlob(filename, lines.join("\n"), "text/plain;charset=utf-8");
      showToast("Backup scaricato");
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
     * ScanBridge (scanner locale) -> OCR
     * - prova a fare scan via http://127.0.0.1:27899
     * - se non disponibile, fallback su file picker
     ****************************************************************/
    // Base URL ScanBridge (locale). Puoi fare override con:
    // - window.SCANBRIDGE_BASE / window.SCANBRIDGE_URL
    // - meta[name="scanbridge-base"]
    // - state.settings.scanbridgeBase (se lo aggiungi in futuro)
    // Fallback: 127.0.0.1 + localhost (+ https se la pagina e' https)
    const __SCANBRIDGE_BASE_DEFAULT = "http://127.0.0.1:27899";

    // Cache: ultima base funzionante (così il primo click è sempre immediato)
    let __scanbridgeGoodBase = "";

    // Warm-up (Chrome Local Network Access / wake-up): evita il caso "parte al secondo click"
    let __scanbridgeWarmInFlight = null;
    let __scanbridgeWarmLastAt = 0;

    function __scanbridgeNormalizeBase(u){
      u = String(u || "").trim();
      if (!u) return "";

      // Guard: evita che una API key venga interpretata come base URL.
      // Se non ho lo schema, una base deve SOMIGLIARE a un host ('.' o ':' o 'localhost').
      try{
        const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u);
        if (!hasScheme){
          const low = u.toLowerCase();
          const looksHost = low.includes("localhost") || u.includes(".") || u.includes(":") || u.startsWith("[") || low === "::1" || low.startsWith("127.");
          if (!looksHost) return "";

          // se manca lo schema e sembra un host, aggiungi http://
          if (/^[\w.-]+(?::\d+)?(\/.*)?$/.test(u) || u.startsWith("[")){
            u = "http://" + u;
          }
        }
      }catch(_){ }

      try{
        const url = new URL(u);
        url.pathname = "";
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/+$/g, "");
      }catch(_){
        return String(u || "").replace(/\/+$/g, "");
      }
    }

    // Determina il targetAddressSpace corretto per Chrome Local Network Access
    // - loopback: localhost / 127.0.0.0/8 / ::1
    // - local: rete privata (192.168.x.x / 10.x.x.x / 172.16-31.x.x / 169.254.x.x) / *.local
    function __scanbridgeIsPrivateIPv4(host){
      const h = String(host || '').trim();
      if (!h) return false;
      if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false;
      const p = h.split('.').map(x => Number(x));
      if (p.length !== 4 || p.some(n => !Number.isFinite(n) || n < 0 || n > 255)) return false;
      const a = p[0], b = p[1];
      if (a == 10) return true;
      if (a == 192 && b == 168) return true;
      if (a == 172 && b >= 16 && b <= 31) return true;
      if (a == 169 && b == 254) return true;
      return false;
    }

    function __scanbridgeTargetAddressSpaceForBase(base){
      const b = __scanbridgeNormalizeBase(base);
      if (!b) return null;
      try{
        const u = new URL(b);
        const host = String(u.hostname || '').trim().toLowerCase();
        if (!host) return null;

        // Loopback (macchina locale)
        if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.startsWith('127.')) return 'loopback';

        // Rete locale (LAN)
        if (host.endsWith('.local')) return 'local';
        if (__scanbridgeIsPrivateIPv4(host)) return 'local';

        return null;
      }catch(_){
        return null;
      }
    }


    function __scanbridgeGetBases(){
      const out = [];
      const seen = new Set();
      const push = (v) => {
        const b = __scanbridgeNormalizeBase(v);
        if (!b) return;
        const k = String(b).toLowerCase();
        if (seen.has(k)) return;
        seen.add(k);
        out.push(b);
      };

      // 0) cache in-memory (ultima base valida di questa sessione)
      try{
        const vMem = String(__scanbridgeGoodBase || "").trim();
        if (vMem) push(vMem);
      }catch(_){ }

      // 1) settings/localStorage (se presente)
      try{
        const v0 = String((state && state.settings && (state.settings.scanbridgeBase || state.settings.scanbridgeUrl || state.settings.scanbridgeURL)) || "").trim();
        if (v0) push(v0);
      }catch(_){ }
      try{
        const v1 = String(localStorage.getItem("hubinv_scanbridge_base") || localStorage.getItem("hubinv_scanbridge_url") || "").trim();
        if (v1) push(v1);
      }catch(_){ }

      // 2) global (HTML)
      try{
        const w = (typeof window !== "undefined") ? window : null;
        const v2 = String((w && (w.SCANBRIDGE_BASE || w.SCANBRIDGE_URL || w.__SCANBRIDGE_BASE)) || "").trim();
        if (v2) push(v2);
      }catch(_){ }

      // 3) meta tag (optional)
      try{
        const m = document.querySelector('meta[name="scanbridge-base"], meta[name="scanbridge-url"]');
        const v3 = m ? String(m.getAttribute("content") || "").trim() : "";
        if (v3) push(v3);
      }catch(_){ }

      // 4) defaults
      push(__SCANBRIDGE_BASE_DEFAULT);
      push("http://localhost:27899");

      // 5) https variants (solo se la pagina e' https)
      try{
        if (location && location.protocol === "https:"){
          push("https://127.0.0.1:27899");
          push("https://localhost:27899");
        }
      }catch(_){ }

      return out;
    }

    function __scanbridgeMakeErr(code, message, extra){
      const e = new Error(String(message || "ScanBridge error"));
      try{ e.code = code; }catch(_){ }
      if (extra && typeof extra === "object"){
        try{ Object.keys(extra).forEach(k => { try{ e[k] = extra[k]; }catch(_){ } }); }catch(_){ }
      }
      return e;
    }

    function __scanbridgeRememberGoodBase(base){
      const b = __scanbridgeNormalizeBase(base);
      if (!b) return;
      __scanbridgeGoodBase = b;
      try{ localStorage.setItem("hubinv_scanbridge_base", b); }catch(_){ }
    }

    async function __scanbridgeFetchWithTimeout(url, opts, timeoutMs){
      const ms = Number(timeoutMs);
      const t = (Number.isFinite(ms) && ms > 0) ? ms : 20000;
      if (typeof AbortController !== "function"){
        return fetch(url, opts);
      }
      const ac = new AbortController();
      const timer = setTimeout(() => { try{ ac.abort(); }catch(_){ } }, t);
      try{
        return await fetch(url, Object.assign({}, opts || {}, { signal: ac.signal }));
      } finally {
        clearTimeout(timer);
      }
    }

    // Warm-up: prova un ping veloce per far apparire eventuali permessi "rete locale"
    // e per memorizzare subito la base giusta. Non apre lo scanner.
    async function __scanbridgeWarmup(force){
      const now = Date.now();
      if (!force && __scanbridgeWarmInFlight) return __scanbridgeWarmInFlight;
      if (!force && now - (__scanbridgeWarmLastAt || 0) < 1500) return;
      __scanbridgeWarmLastAt = now;

      __scanbridgeWarmInFlight = (async () => {
        const bases = __scanbridgeGetBases();
        if (!Array.isArray(bases) || !bases.length) return;
        for (let i=0; i<bases.length; i++){
          const b0 = __scanbridgeNormalizeBase(bases[i]);
          if (!b0) continue;

          // Endpoint "safe": anche se 404, basta che risponda per dire che la base è raggiungibile.
          const url = b0 + "/health";
          const opts = { method: "GET", mode: "cors", credentials: "omit", cache: "no-store" };
          try{
            const tas = __scanbridgeTargetAddressSpaceForBase(b0);
            if (tas) opts.targetAddressSpace = tas;
          }catch(_){ }

          try{
            const res = await __scanbridgeFetchWithTimeout(url, opts, 1500);
            if (res){
              try{ __scanbridgeRememberGoodBase(b0); }catch(_){ }
              break;
            }
          }catch(_e){ }
        }
      })();

      try{ await __scanbridgeWarmInFlight; }catch(_){ }
      __scanbridgeWarmInFlight = null;
    }


    // ScanBridge key (hardcoded).
    // Se preferisci, puoi impostarla nell'HTML: window.SCANBRIDGE_KEY = "...";
    const __SCANBRIDGE_KEY_HARDCODED = "";


    function __scanbridgeIsMobile(){
      try{
        // euristica: touch + schermo piccolo
        if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 900px)").matches) return true;
      }catch(_){ }
      try{
        const ua = String(navigator.userAgent || "");
        if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
      }catch(_){ }
      return false;
    }
    function __scanbridgeKey(){
      // 1) hardcoded (JS)
      try{
        const k0 = String(__SCANBRIDGE_KEY_HARDCODED || "").trim();
        if (k0) return k0;
      }catch(_){ }

      // 2) global (HTML)
      try{
        const w = (typeof window !== "undefined") ? window : null;
        const k1 = String((w && (w.SCANBRIDGE_KEY || w.SCANBRIDGE_API_KEY || w.__SCANBRIDGE_KEY)) || "").trim();
        if (k1) return k1;
      }catch(_){ }

      // 3) meta tag (optional)
      try{
        const m = document.querySelector('meta[name="scanbridge-key"]');
        const k2 = m ? String(m.getAttribute('content') || "").trim() : "";
        if (k2) return k2;
      }catch(_){ }

      // 4) legacy (compatibilità): settings/localStorage
      try{
        const k3 = String((state && state.settings && state.settings.scanbridgeKey) || "").trim();
        if (k3) return k3;
      }catch(_){ }
      try{
        const k4 = String(localStorage.getItem('hubinv_scanbridge_key') || "").trim();
        if (k4) return k4;
      }catch(_){ }

      return "";
    }

    async function __scanbridgeFetchJpg(key){
      const k = String(key || "").trim();
      if (!k) throw new Error("ScanBridge key mancante");

      const bases = __scanbridgeGetBases();
      let lastErr = null;

      for (let i=0; i<bases.length; i++){
        const base = bases[i];
        try{
          const file = await __scanbridgeFetchJpgFromBase(base, k);
          if (file) return file;
        }catch(e){
          lastErr = e;
          try{ console.warn("[ScanBridge] base failed:", base, e); }catch(_){ }
        }
      }

      if (lastErr) throw lastErr;
      throw __scanbridgeMakeErr("SCANBRIDGE_UNREACHABLE", "ScanBridge non raggiungibile", { bases });
    }

    async function __scanbridgeFetchJpgFromBase(base, key){
      const k = String(key || "").trim();
      const b = __scanbridgeNormalizeBase(base);
      if (!b) throw __scanbridgeMakeErr("SCANBRIDGE_BAD_BASE", "ScanBridge base non valida");
      const urlBase = b + "/scan?format=jpg";
      const optsBase = {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        cache: "no-store"
      };

      // Chrome Local Network Access: per localhost/127.* serve 'loopback' (non 'local')
      try{
        const tas = __scanbridgeTargetAddressSpaceForBase(b);
        if (tas) optsBase.targetAddressSpace = tas;
      }catch(_){ }


      const timeoutMs = 25000;

      // Tentativo 1: key in query (di solito evita preflight)
      let res = null;
      let errNet = null;
      try{
        res = await __scanbridgeFetchWithTimeout(urlBase + "&key=" + encodeURIComponent(k), optsBase, timeoutMs);
      }catch(e){
        errNet = e;
        res = null;
      }

      // Se ho una risposta HTTP ma non ok: leggo body (best effort)
      let body1 = "";
      if (res && !res.ok){
        try{ body1 = await res.text(); }catch(_){ body1 = ""; }
      }

      // Tentativo 2: key in header (solo se ho ottenuto una risposta HTTP non-ok)
      // NB: aggiungere header spesso forza preflight CORS; lo facciamo solo quando serve.
      if (res && !res.ok){
        try{
          const res2 = await __scanbridgeFetchWithTimeout(
            urlBase,
            Object.assign({}, optsBase, { headers: { "X-API-Key": k } }),
            timeoutMs
          );
          if (res2 && res2.ok) res = res2;
          else if (res2 && !res2.ok){
            let body2 = "";
            try{ body2 = await res2.text(); }catch(_){ body2 = ""; }
            throw __scanbridgeMakeErr("SCANBRIDGE_HTTP", "ScanBridge HTTP " + res2.status, { status: res2.status, body: body2, base: b });
          }
        }catch(e){
          // se il tentativo 2 fallisce per rete/preflight, manteniamo l'errore 1 (piu' utile)
          if (e && e.code === "SCANBRIDGE_HTTP") throw e;
        }
      }

      // Network unreachable (nessuna risposta)
      if (!res){
        const hint = (location && location.protocol === "https:")
          ? "Avvia ScanBridge e abilita CORS/Private Network (Access-Control-Allow-Origin + Access-Control-Allow-Private-Network)."
          : "Avvia ScanBridge sul PC (porta 27899).";
        throw __scanbridgeMakeErr("SCANBRIDGE_UNREACHABLE", "ScanBridge non raggiungibile", { base: b, hint, cause: errNet });
      }

      if (!res.ok){
        const status = res.status || 0;
        const body = body1 || "";
        if (status === 401 || status === 403){
          throw __scanbridgeMakeErr("SCANBRIDGE_AUTH", "ScanBridge key non valida", { status, body, base: b });
        }
        throw __scanbridgeMakeErr("SCANBRIDGE_HTTP", "ScanBridge HTTP " + status, { status, body, base: b });
      }

      // Se arrivo qui, la base ha risposto correttamente: memorizzala.
      try{ __scanbridgeRememberGoodBase(b); }catch(_){ }

      const blob = await res.blob();
      const type = String(blob && blob.type || "").toLowerCase();
      if (!type.startsWith("image/")) throw __scanbridgeMakeErr("SCANBRIDGE_BAD_RESPONSE", "ScanBridge non ha restituito un'immagine", { base: b });

      const ext = (type === "image/png") ? "png" : "jpg";
      const name = "scan_" + todayYYYYMMDD() + "_" + Date.now() + "." + ext;
      return new File([blob], name, { type: blob.type || "image/jpeg" });
    }

    async function __scanbridgeScanAndImport(){
      const k = __scanbridgeKey();
      if (!k){
        throw new Error("ScanBridge key mancante");
      }

      // Warm-up: in alcuni casi il primo tentativo serve solo a far apparire il permesso
      // "rete locale" o a svegliare ScanBridge. Lo facciamo QUI (safe endpoint) così
      // il click successivo non è necessario.
      try{ await __scanbridgeWarmup(false); }catch(_){ }

      // Lock UI (evita doppi click mentre lo scanner lavora)
      const __btn = document.getElementById("btnOpenGallery");
      try{ if (__btn) __btn.disabled = true; }catch(_){ }

      try{
        try{
          if (progressSpinner) progressSpinner.style.display = "block";
        }catch(_){ }
        try{
          progressLabel.textContent = "Apro lo scanner…";
          progressFill.style.width = "5%";
        }catch(_){ }

        let file = null;
        try{
          file = await __scanbridgeFetchJpg(k);
        }catch(err1){
          // Retry UNA volta su errori transienti (tipico: primo click dopo avvio ScanBridge)
          const code = String(err1 && err1.code || "").toUpperCase();
          const status = (err1 && err1.status != null) ? Number(err1.status) : null;
          const msg = String(err1 && (err1.message || err1) || "").toLowerCase();
          const retryableStatus = (status === 408 || status === 409 || status === 423 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504);
          const retryable = (code === "SCANBRIDGE_UNREACHABLE" || (code === "SCANBRIDGE_HTTP" && retryableStatus) || msg.includes("abort") || msg.includes("timeout"));

          if (!retryable) throw err1;

          try{
            progressLabel.textContent = "Riprovo…";
            progressFill.style.width = "8%";
          }catch(_){ }
          await new Promise(r => setTimeout(r, 350));
          file = await __scanbridgeFetchJpg(k);
        }

        await handleFileSelection([file]);
      } finally {
        try{ if (__btn) __btn.disabled = false; }catch(_){ }
      }
    }

    /****************************************************************
     * Events
     ****************************************************************/
    const __btnOpenCamera = document.getElementById("btnOpenCamera");
    if (__btnOpenCamera) __btnOpenCamera.addEventListener("click", () => cameraInput.click());
    const __btnOpenGallery = document.getElementById("btnOpenGallery");
    if (__btnOpenGallery) __btnOpenGallery.addEventListener("click", async () => {
      // Su mobile: resta il picker classico (fotocamera/galleria)
      if (__scanbridgeIsMobile()) { try{ galleryInput.click(); }catch(_){ } return; }

      // Desktop: prova ScanBridge (scanner locale), fallback su picker
      try{
        await __scanbridgeScanAndImport();
      }catch(e){
        let msg = "";
        try{ msg = String(e && (e.message || e) || ""); }catch(_){ msg = ""; }

        const low = String(msg || "").toLowerCase();
        const code = String(e && e.code || "").toUpperCase();
        const status = (e && e.status != null) ? Number(e.status) : null;
        const base = String(e && e.base || "").trim();
        const hint = String(e && e.hint || "").trim();

        if (low.includes("key") && low.includes("manc")) {
          try{ showToast("ScanBridge key mancante: inseriscila in Impostazioni > ScanBridge Key (oppure window.SCANBRIDGE_KEY)", "warn"); }catch(_){ }

        } else if (code === "SCANBRIDGE_AUTH" || status === 401 || status === 403 || low.includes("non valida")) {
          try{ showToast("ScanBridge key non valida: controlla Impostazioni > ScanBridge Key", "warn"); }catch(_){ }

        } else if (code === "SCANBRIDGE_UNREACHABLE" || low.includes("failed to fetch") || low.includes("network")) {
          const where = base ? (" (" + base + ")") : "";
          const extra = hint ? (" " + hint) : "";
          try{ showToast("ScanBridge non raggiungibile" + where + "." + extra, "warn"); }catch(_){ }

        } else if (code === "SCANBRIDGE_HTTP" || (status && status >= 400)) {
          const where = base ? (" (" + base + ")") : "";
          try{ showToast("ScanBridge errore" + (status ? (" " + status) : "") + where + ": carica manualmente", "warn"); }catch(_){ }

        } else {
          try{ showToast("Scanner non disponibile: carica manualmente", "warn"); }catch(_){ }
        }

        try{ console.warn("[ScanBridge] scan failed", e); }catch(_){ }
        try{ galleryInput.click(); }catch(_){ }
      }
    });
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

    // Nuovo articolo (Materie prime / Imballaggi)
    function __openNewProductModal(){
      if (!modalNewProduct) return;
      if (!fb.user) { try{ showToast("Accedi con Google per creare un articolo", "warn"); }catch(_){ } return; }
      try{
        if (newProdCode) newProdCode.value = "";
        if (newProdName) newProdName.value = "";
      }catch(_){ }
      modalNewProduct.classList.add("open");
      __syncBodyLockFromModals();
      setTimeout(() => { try{ newProdCode && newProdCode.focus(); }catch(_){ } }, 50);
    }
    function __closeNewProductModal(){
      if (!modalNewProduct) return;
      modalNewProduct.classList.remove("open");
      __syncBodyLockFromModals();
      try{ if (newProdCode) newProdCode.value = ""; }catch(_){ }
      try{ if (newProdName) newProdName.value = ""; }catch(_){ }
    }

    if (btnAnagAddProduct) btnAnagAddProduct.addEventListener("click", (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
      __openNewProductModal();
    });
    if (newProdClose) newProdClose.addEventListener("click", __closeNewProductModal);
    if (newProdCancel) newProdCancel.addEventListener("click", __closeNewProductModal);
    if (modalNewProduct) modalNewProduct.addEventListener("click", (e) => { if (e.target === modalNewProduct) __closeNewProductModal(); });

    if (newProdCode) newProdCode.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); try{ newProdCreate && newProdCreate.click(); }catch(_){ } }
      if (e.key === "Escape") { e.preventDefault(); __closeNewProductModal(); }
    });
    if (newProdName) newProdName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); try{ newProdCreate && newProdCreate.click(); }catch(_){ } }
      if (e.key === "Escape") { e.preventDefault(); __closeNewProductModal(); }
    });

    if (newProdCreate) newProdCreate.addEventListener("click", async (e) => {
      try{ e.preventDefault(); e.stopPropagation(); }catch(_){ }
      if (!fb.user) { try{ showToast("Accedi con Google per creare un articolo", "warn"); }catch(_){ } return; }

      const code = String(newProdCode && newProdCode.value || "").trim();
      const nameIn = String(newProdName && newProdName.value || "").trim();
      if (!code) { try{ showToast("Inserisci un codice articolo", "warn"); }catch(_){ } try{ newProdCode && newProdCode.focus(); }catch(_){ } return; }

      const existing = findProductByCode(code);
      if (existing) {
        __closeNewProductModal();
        try{ openProductModal(code, { __mode: "master", code }); }catch(_){ }
        return;
      }

      const low = code.toLowerCase();
      const name = nameIn || code;

      // default categoria: se stai guardando una categoria specifica, usala.
      // In Materie prime, se non c’è filtro selezionato, assegna una categoria valida per farlo comparire in lista.
      const mg = normalizeProductsMacroGroup(activeProductsMacroGroup) || "imballaggi";
      let catDefault = "";
      try{
        const catSel = String(anagProdCategoryFilter && anagProdCategoryFilter.value || "").trim();
        if (catSel && catSel !== "__none" && categoryMacroGroup(catSel) === mg) catDefault = catSel;
      }catch(_){ }
      if (!catDefault && mg === "materie_prime") {
        try{
          const k0 = normalizeMacroCategory("materie_prime");
          if (k0) catDefault = k0;
        }catch(_){ }
        if (!catDefault) {
          try{
            const list = (Array.isArray(categories) ? categories : []).filter(c => c && categoryMacroGroup(c.key) === "materie_prime");
            if (list.length) catDefault = String(list[0].key || "").trim().toLowerCase();
          }catch(_){ }
        }
      }

      const catNorm = normalizeMacroCategory(catDefault);

      // UI lock
      const oldTxt = String(newProdCreate.textContent || "Crea");
      try{ newProdCreate.disabled = true; newProdCreate.textContent = "Creo…"; }catch(_){ }

      // Offline fallback + UI immediata: aggiorna mapping categorie
      try{
        state.productCategories = state.productCategories || {};
        if (catNorm) state.productCategories[low] = catNorm;
        else delete state.productCategories[low];
        saveLocalData();
      }catch(_){ }

      // Optimistic local product (se la lista è già in memoria)
      try{
        const p0 = findProductByCode(code);
        if (p0) {
          p0.name = name;
          p0.nameLower = name.toLowerCase();
          if (catNorm) p0.category = catNorm;
          p0.updatedAtIso = new Date().toISOString();
        }
      }catch(_){ }

      try {
        if (!fb.db) throw new Error("Firestore non inizializzato");

        const patch = {
          code: code,
          codeLower: low,
          name: name,
          nameLower: name.toLowerCase(),
          updatedAt: serverTimestamp(),
          updatedBy: (fb.user.email || fb.user.uid || "")
        };
        if (catNorm) patch.category = catNorm;

        await setDoc(doc(fb.db, "orgs", ORG_ID, "products", keyToDocId(low)), patch, { merge: true });

        try{ renderAll(); renderAnag(); }catch(_){ }
        try{ showToast("Articolo creato"); }catch(_){ }

        __closeNewProductModal();
        try{ openProductModal(code, { __mode: "master", code }); }catch(_){ }
        setTimeout(() => { try{ document.getElementById("prodNameEdit") && document.getElementById("prodNameEdit").focus(); }catch(_){ } }, 120);
      } catch (err) {
        console.error(err);
        try{ showToast("Errore creazione articolo", "err"); }catch(_){ }
      } finally {
        try{ newProdCreate.disabled = false; newProdCreate.textContent = oldTxt; }catch(_){ }
      }
    });

    // Nuovo prodotto finito
    if (btnNewFinishedProduct) btnNewFinishedProduct.addEventListener("click", (e) => { try{ e.preventDefault(); e.stopPropagation(); }catch(_){ } try{ openFinishedProductModal(null); }catch(_){ } });
// Supplier modal
    if (supClose) supClose.addEventListener("click", closeSupplierModal);
    if (btnSupDone) btnSupDone.addEventListener("click", closeSupplierModal);
    if (modalSupplier) modalSupplier.addEventListener("click", (e) => { if (e.target === modalSupplier) closeSupplierModal(); });
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
    function closeProductModal(){
      if (!modalProduct) return;
      modalProduct.classList.remove("open");
      __syncBodyLockFromModals();
    }
    function closeUnifiedModal(){
      if (!modalUnified) return;
      modalUnified.classList.remove("open");
      __syncBodyLockFromModals();
    }

    // ===== Prodotti finiti (distinta base / BOM) =====
    let __fpCurrentId = null;
    let __fpDraft = null;

    function __fpClone(obj){
      try{ return JSON.parse(JSON.stringify(obj || {})); }catch(_){ return Object.assign({}, obj || {}); }
    }

    function __fpParseQty(raw){
      const s0 = String(raw || "").trim();
      if (!s0) return { qty: null, qtyRaw: "" };
      const s = s0.replace(/\s+/g, "").replace(",", ".");
      if (s.includes("/")) {
        const parts = s.split("/");
        const a = Number(parts[0]);
        const b = Number(parts[1]);
        if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) {
          return { qty: a / b, qtyRaw: s0 };
        }
      }
      const n = Number(s);
      if (!Number.isFinite(n)) return { qty: null, qtyRaw: s0 };
      return { qty: n, qtyRaw: s0 };
    }

    function __fpFmtQty(comp){
      try{
        const raw = String((comp && comp.qtyRaw) || "").trim();
        if (raw) return raw;
        const n = Number(comp && comp.qty);
        if (!Number.isFinite(n)) return "";
        // format "it" ma senza zeri inutili
        const s = n.toLocaleString("it-IT", { maximumFractionDigits: 6 });
        return s;
      }catch(_){ return ""; }
    }

    function __fpBuildDatalist(catKey){
      try{
        if (!fpComponentList) return;

        const key = String(catKey || "").trim().toLowerCase();
        const list = __fpGetProductsFiltered(key);

        // datalist (per ricerca rapida)
        const cap = 2500;
        const out = [];
        for (let i=0; i<list.length && i<cap; i++){
          const p = list[i] || {};
          const code = String(p.code || "").trim();
          if (!code) continue;
          const name = String(p.name || "").trim();
          out.push(`<option value="${escapeHtmlAttr(code + (name ? " — " + name : ""))}"></option>`);
        }
        fpComponentList.innerHTML = out.join("");

        // elenco cliccabile (per vedere subito gli articoli della categoria)
        if (key) __fpRenderBrowse(list);
        else { try{ __fpRenderBrowse([]); }catch(_){ } }
      }catch(_){}
    }

    function __fpGetProductsFiltered(catKey){
      const key = String(catKey || "").trim().toLowerCase();
      const src = Array.isArray(products) ? products : [];
      const seen = new Set();
      const out = [];

      for (const pp of src){
        const p = pp || {};
        const code = String(p.code || (typeof safeDecodeUri==="function" ? safeDecodeUri(p.id || "") : (p.id||"")) || "").trim();
        if (!code) continue;

        const low = code.toLowerCase();
        if (seen.has(low)) continue;

        const cat = (typeof getMacroCategoryForCode === "function")
          ? (getMacroCategoryForCode(low) || "")
          : (String(p.category || "").trim().toLowerCase());

        if (key){
          if (key === "__none"){
            if (cat) continue;
          } else {
            if (cat !== key) continue;
          }
        }

        const name = String(p.name || "").trim() || code;
        const uom = __normalizeUom(p.uom || p.um || p.unit || "") || (typeof getUomResolvedForCode === "function" ? (getUomResolvedForCode(code) || "") : "");
        out.push({ code, name, uom, cat });
        seen.add(low);
      }

      out.sort((a,b) => String(a.name||a.code||"").localeCompare(String(b.name||b.code||""), "it", { sensitivity:"base" }));
      return out;
    }

    function __fpRenderCompCategoryOptions(){
      if (!fpCompCat) return;
      const cur = String(fpCompCat.value || "");

      const base = [
        '<option value="">Tutte</option>',
        '<option value="__none">Non assegnata</option>'
      ];

      const list = (Array.isArray(categories) ? categories : []).slice();

      const imballaggi = list
        .filter(c => c && c.key && categoryMacroGroup(c.key) === "imballaggi" && String(c.key).toLowerCase() !== "non_classificati")
        .sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), "it", { sensitivity:"base" }));

      const materie = list
        .filter(c => c && c.key && categoryMacroGroup(c.key) === "materie_prime")
        .sort((a,b) => String(a.name||"").localeCompare(String(b.name||""), "it", { sensitivity:"base" }));

      const groups = [];

      if (imballaggi.length){
        groups.push('<optgroup label="Imballaggi">');
        for (const c of imballaggi){
          groups.push(`<option value="${escapeHtmlAttr(String(c.key||"").toLowerCase())}">${escapeHtml(String(c.name||c.key||""))}</option>`);
        }
        groups.push('</optgroup>');
      }

      if (materie.length){
        groups.push('<optgroup label="Materie prime">');
        for (const c of materie){
          groups.push(`<option value="${escapeHtmlAttr(String(c.key||"").toLowerCase())}">${escapeHtml(String(c.name||c.key||""))}</option>`);
        }
        groups.push('</optgroup>');
      }

      fpCompCat.innerHTML = base.join("") + groups.join("");

      const allowed = new Set(["", "__none", ...imballaggi.map(x => String(x.key||"").toLowerCase()), ...materie.map(x => String(x.key||"").toLowerCase())]);
      fpCompCat.value = allowed.has(cur) ? cur : "";
    }

    
function __fpCatLabel(key){
  const k = String(key || "").trim().toLowerCase();
  if (!k) return "";
  const list = Array.isArray(categories) ? categories : [];
  for (const c of list){
    const ck = String(c && c.key || "").trim().toLowerCase();
    if (ck && ck === k) return String(c && (c.name || c.key) || key).trim();
  }
  return String(key || "").trim();
}

function __fpNormSearch(s){
  try{
    return String(s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g," ")
      .trim();
  }catch(_){
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  }
}

function __fpSmartFilter(list, queryRaw){
  const qN = __fpNormSearch(queryRaw);
  const tokens = qN ? qN.split(/\s+/).filter(Boolean) : [];
  if (!tokens.length) return [];

  const scored = [];
  const arr = Array.isArray(list) ? list : [];
  for (const p of arr){
    const code = String(p && p.code || "").trim();
    if (!code) continue;

    const codeN = __fpNormSearch(code);
    const nameN = __fpNormSearch(p.name || "");
    const catN  = __fpNormSearch(__fpCatLabel(p.cat) || "");
    const blob  = (codeN + " " + nameN + " " + catN).trim();

    let ok = true;
    for (const t of tokens){
      if (!t) continue;
      if (blob.indexOf(t) < 0) { ok = false; break; }
    }
    if (!ok) continue;

    let score = 0;
    for (const t of tokens){
      if (!t) continue;

      if (codeN === t) score += 500;
      else if (codeN.startsWith(t)) score += 320;
      else if (codeN.indexOf(t) >= 0) score += 180;

      if (nameN === t) score += 260;
      else if (nameN.startsWith(t)) score += 160;
      else if (nameN.indexOf(t) >= 0) score += 90;

      if (catN === t) score += 80;
      else if (catN.startsWith(t)) score += 55;
      else if (catN.indexOf(t) >= 0) score += 35;
    }

    scored.push(Object.assign({}, p, { __score: score }));
  }

  scored.sort((a,b) => (b.__score - a.__score) || String(a.name||a.code||"").localeCompare(String(b.name||b.code||""), "it", { sensitivity:"base" }));
  return scored;
}

function __fpRenderBrowse(list, opts){
  if (!fpCompBrowseWrap || !fpCompBrowse) return;
  const arr = Array.isArray(list) ? list : [];
  const o = (opts && typeof opts === "object") ? opts : {};
  const isSearch = !!o.isSearch;

  if (!arr.length){
    fpCompBrowseWrap.style.display = "none";
    fpCompBrowse.innerHTML = "";
    return;
  }

  const cap = isSearch ? 80 : 120;
  const sliced = arr.slice(0, cap);

  fpCompBrowseWrap.style.display = "";
  fpCompBrowse.innerHTML = sliced.map(p => {
    const code = String(p.code || "").trim();
    const name = String(p.name || "").trim();
    const uom = String(p.uom || "").trim();
    const catLbl = __fpCatLabel(p.cat || "");
    const label = code + (name ? (" — " + name) : "");

    const right = [
      uom ? `<span class="pill" style="height:auto; padding:2px 8px; border-radius:999px; border:0; background:rgba(0,0,0,.06); color:rgba(0,0,0,.86);">${escapeHtml(uom)}</span>` : "",
      catLbl ? `<span class="pill" style="height:auto; padding:2px 8px; border-radius:999px; border:0; background:rgba(10,132,255,.12); color:rgba(0,0,0,.86);">${escapeHtml(catLbl)}</span>` : ""
    ].filter(Boolean).join("");

    return `<button type="button" class="sideMenuLink jsFpBrowsePick" data-code="${escapeHtmlAttr(code)}" data-name="${escapeHtmlAttr(name)}" data-uom="${escapeHtmlAttr(uom)}" title="Seleziona">
      <span style="display:flex; justify-content:space-between; align-items:center; gap:12px; width:100%;">
        <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(label)}</span>
        <span style="flex:0 0 auto; display:flex; gap:6px; align-items:center;">${right}</span>
      </span>
    </button>`;
  }).join("") + (arr.length > cap ? `<div class="td-muted" style="padding:10px 12px;">Mostrati ${cap} risultati. Affina la ricerca.</div>` : "");
}

function __fpRenderSmartBrowse(){
  try{
    const catKey = String(fpCompCat && fpCompCat.value || "").trim();
    const qRaw = String(fpCompPick && fpCompPick.value || "").trim();
    const q = qRaw.includes("—") ? qRaw.split("—")[0].trim() : qRaw;

    const base = __fpGetProductsFiltered(catKey);
    const qN = __fpNormSearch(q);

    if (qN){
      const scored = __fpSmartFilter(base, q);
      __fpRenderBrowse(scored, { isSearch: true });
      return;
    }

    if (String(catKey || "").trim()){
      __fpRenderBrowse(base, { isSearch: false });
    } else {
      __fpRenderBrowse([], { isSearch: false });
    }
  }catch(_){}
}

    function __fpResolvePickedProduct(val){
      const s0 = String(val || "").trim();
      if (!s0) return null;

      let code = s0;
      if (s0.includes("—")) code = s0.split("—")[0].trim();
      if (!code) return null;

      // prova match per codice
      const p = (typeof findProductByCode === "function") ? findProductByCode(code) : null;
      if (p) {
        const c = String(p.code || (typeof safeDecodeUri==="function" ? safeDecodeUri(p.id || "") : (p.id||"")) || "").trim() || code;
        return {
          code: c,
          name: String(p.name || "").trim() || c,
          uom: __normalizeUom(p.uom || p.um || p.unit || "") || getUomResolvedForCode(c) || ""
        };
      }

      // fallback: match per nome (se univoco)
      try{
        const key = normTextKey(s0);
        if (key) {
          const matches = (Array.isArray(products) ? products : []).filter(pp => normTextKey(pp && (pp.name || "")) === key);
          if (matches.length === 1) {
            const pp = matches[0];
            const c = String(pp.code || (typeof safeDecodeUri==="function" ? safeDecodeUri(pp.id || "") : (pp.id||"")) || "").trim();
            return { code: c, name: String(pp.name || "").trim() || c, uom: __normalizeUom(pp.uom || "") || getUomResolvedForCode(c) || "" };
          }
        }
      }catch(_){}
      return null;
    }

    function __fpEnsureDraftBase(fp){
  const base = __fpClone(fp || {});
  base.components = Array.isArray(base.components) ? base.components : (Array.isArray(base.bom) ? base.bom : (Array.isArray(base.distintaBase) ? base.distintaBase : []));

  // normalizza array + impone U.M. dall'anagrafica prodotto (quando possibile)
  base.components = (base.components || []).map(c => {
    const code = String(c.code || c.codice || "").trim();
    const name = String(c.name || c.articolo || c.item || "").trim();

    let uom = String(c.uom || c.um || "").trim();
    if (!uom && code){
      try{
        const p = (typeof findProductByCode === "function") ? findProductByCode(code) : null;
        if (p) uom = __normalizeUom(p.uom || p.um || p.unit || "") || "";
      }catch(_){}
      if (!uom){
        try{
          if (typeof getUomResolvedForCode === "function") uom = __normalizeUom(getUomResolvedForCode(code) || "") || "";
        }catch(_){}
      }
    }

    return {
      productId: String(c.productId || c.pid || "").trim(),
      code,
      name,
      qty: (c.qty != null) ? Number(c.qty) : null,
      qtyRaw: String(c.qtyRaw || "").trim(),
      uom: String(uom || "").trim(),
      note: String(c.note || "").trim()
    };
  }).filter(x => x.code || x.name);

  return base;
}

    function __fpRenderComponents(){
      if (!fpCompTbody) return;
      const comps = (__fpDraft && Array.isArray(__fpDraft.components)) ? __fpDraft.components : [];
      if (fpCompMeta) fpCompMeta.textContent = String(comps.length || 0);

      if (!comps.length) {
        fpCompTbody.innerHTML = '<tr><td class="td-muted" colspan="5">Nessun componente.</td></tr>';
        return;
      }

      fpCompTbody.innerHTML = comps.map((c, i) => {
        const code = String(c.code || "").trim();
        const name = String(c.name || "").trim();
        const qty = __fpFmtQty(c);
        const uom = String(c.uom || "").trim();
        return `
          <tr data-i="${i}">
            <td data-label="Codice"><span class="kbd">${escapeHtml(code || "—")}</span></td>
            <td data-label="Articolo">${escapeHtml(name || "—")}</td>
            <td data-label="Q.tà" class="qty">
              <input class="qtyEditInput jsFpCompQty" data-i="${i}" value="${escapeHtmlAttr(qty)}" placeholder="es. 1/20" style="width: 100%; max-width: 150px;" />
            </td>
            <td data-label="U.M."><span class="kbd">${escapeHtml(uom || "—")}</span></td>
            <td style="text-align:right;">
              <button class="btn btn-ghost btn-xs jsFpCompDel" data-i="${i}" type="button">–</button>
            </td>
          </tr>
        `;
      }).join("");
    }

    function openFinishedProductModal(id){
      if (!modalFinishedProduct) {
        try{ showToast && showToast("Gestione componenti rimossa: usa ‘Categorie prodotti finiti’.", "warn"); }catch(_){ }
        try{ setView && setView("fpCategories"); }catch(_){ }
        try{ window.HubFPCategories && window.HubFPCategories.render && window.HubFPCategories.render(); }catch(_){ }
        return;
      }

      // U.M. componente: non modificabile (presa dall'anagrafica)
      try{ if (fpCompUom && fpCompUom.closest) { const f = fpCompUom.closest(".field"); if (f) f.style.display = "none"; } }catch(_){ }

      __fpRenderCompCategoryOptions();

      // restore ultima categoria usata per aggiungere componenti
      try{
        const savedCat = String(localStorage.getItem("hubinv_fp_comp_cat") || "");
        if (fpCompCat && savedCat) fpCompCat.value = savedCat;
      }catch(_){ }
      __fpBuildDatalist(fpCompCat ? fpCompCat.value : "");
      try{ __fpRenderSmartBrowse(); }catch(_){ }

      const fid = id ? String(id) : "";
      __fpCurrentId = fid || null;

      let fp = null;
      if (fid) {
        fp = (Array.isArray(finishedProducts) ? finishedProducts : []).find(x => String(x && x.id || "") === fid) || null;
      }
      __fpDraft = __fpEnsureDraftBase(fp || {});

      // Se il PF appartiene a una categoria con distinta base, la distinta del singolo viene ignorata.
      // (manteniamo il draft vuoto: la distinta si gestisce nelle "Categorie prodotti finiti")
      try{
        if (fp){
          const catKey = String(fp.categoryKeyLower || fp.categoryKey || fp.category || "").trim().toLowerCase();
          const catBom = __fpCategoryBomForKey(catKey);
          if (Array.isArray(catBom) && catBom.length){
            __fpDraft.components = [];
          }
        }
      }catch(_){ }

      if (fpTitle) fpTitle.textContent = fid ? "Prodotto finito" : "Nuovo prodotto finito";
      if (fpName) fpName.value = String(__fpDraft.name || __fpDraft.nome || "").trim();
      if (fpCode) fpCode.value = String(__fpDraft.code || "").trim();
      if (fpUom) fpUom.value = String(__fpDraft.uom || "").trim();
      if (btnFpDelete) btnFpDelete.style.display = fid ? "" : "none";

      __fpRenderComponents();

      modalFinishedProduct.classList.add("open");
      __syncBodyLockFromModals();
      try{ fpName && fpName.focus(); }catch(_){}
    }

    function closeFinishedProductModal(){
      if (!modalFinishedProduct) return;
      modalFinishedProduct.classList.remove("open");
      __syncBodyLockFromModals();
      __fpCurrentId = null;
      __fpDraft = null;
    }

    // expose globally (safety for listeners / inline handlers)
    try{ window.openFinishedProductModal = openFinishedProductModal; }catch(_){ }
    try{ window.closeFinishedProductModal = closeFinishedProductModal; }catch(_){ }

    async function saveFinishedProduct(){
      if (!(fb.user && fb.db)) { showToast("Accedi con Google per salvare", "warn"); return; }

      const name = String(fpName && fpName.value || "").trim();
      if (!name) { showToast("Inserisci un nome prodotto finito", "warn"); return; }

      const code = String(fpCode && fpCode.value || "").trim();
      const uom = String(fpUom && fpUom.value || "").trim();

      const comps = (__fpDraft && Array.isArray(__fpDraft.components)) ? __fpDraft.components : [];
      // sanitize comps
      const cleanComps = comps.map(c => {
        const qtyNum = (c.qty != null && Number.isFinite(Number(c.qty))) ? Number(c.qty) : null;
        const qtyRaw = String(c.qtyRaw || "").trim();
        const code0 = String(c.code || "").trim();
        const name0 = String(c.name || "").trim();
        const pid0 = String(c.productId || "").trim();
        const u0 = String(c.uom || "").trim();
        return {
          productId: pid0 || keyToDocId(code0.toLowerCase()),
          code: code0,
          name: name0,
          qty: qtyNum,
          qtyRaw: qtyRaw,
          uom: u0
        };
      }).filter(x => x.code || x.name);

      const payload = {
        name,
        nameLower: name.toLowerCase(),
        updatedAt: serverTimestamp(),
        updatedBy: (fb.user.email || fb.user.uid || "")
      };
      if (code) { payload.code = code; payload.codeLower = code.toLowerCase(); }
      else { payload.code = deleteField(); payload.codeLower = deleteField(); }
      if (uom) payload.uom = uom;
      else payload.uom = deleteField();

      payload.components = cleanComps;

      // Regola: se il prodotto ha una distinta base propria => categoria forzata a "singolo"
      try{
        if (Array.isArray(cleanComps) && cleanComps.length){
          payload.categoryKey = "singolo";
          payload.categoryKeyLower = "singolo";
        } else {
          const prevCat = String(__fpDraft && (__fpDraft.categoryKeyLower || __fpDraft.categoryKey || "") || "").trim().toLowerCase();
          if (prevCat === "singolo"){
            payload.categoryKey = deleteField();
            payload.categoryKeyLower = deleteField();
          }
        }
      }catch(_){ }


      // Anti-duplicati: se sto CREANDO e il codice esiste gia', aggiorno quello esistente (unifica).
      const __fpCodeLower = code ? String(code).toLowerCase() : "";
      let __fpCreateIntoExisting = null;
      if (!__fpCurrentId && __fpCodeLower){
        try{
          __fpCreateIntoExisting = (Array.isArray(finishedProducts) ? finishedProducts : []).find(x => {
            const cl = __fpNormCode(x && (x.codeLower || x.code) || "");
            return cl && cl === __fpCodeLower;
          }) || null;
        }catch(_){ __fpCreateIntoExisting = null; }
        if (__fpCreateIntoExisting && __fpCreateIntoExisting.id){
          // converto la creazione in update sul doc esistente
          __fpCurrentId = String(__fpCreateIntoExisting.id);
          // merge componenti: non sovrascrivere BOM esistente con vuoto
          try{ payload.components = __fpMergeComponents([__fpCreateIntoExisting, { components: cleanComps }]); }catch(_){ }
        }
      }

      try{
        if (__fpCurrentId) {
          await setDoc(doc(fb.db, "orgs", ORG_ID, "finishedProducts", __fpCurrentId), payload, { merge: true });
          try{ __fpDedupFinishedProducts("save"); }catch(_){ }
          showToast((__fpCreateIntoExisting && __fpCreateIntoExisting.id) ? "Prodotto finito unificato" : "Prodotto finito salvato");
          closeFinishedProductModal();
          return;
        }

        payload.createdAt = serverTimestamp();
        payload.createdBy = (fb.user.email || fb.user.uid || "");
        const ref = await addDoc(orgCol("finishedProducts"), payload);
        __fpCurrentId = ref && ref.id ? ref.id : null;
        try{ __fpDedupFinishedProducts("create"); }catch(_){ }
        showToast("Prodotto finito creato");
        closeFinishedProductModal();
      }catch(e){
        console.error("saveFinishedProduct failed", e);
        showToast("Errore salvataggio prodotto finito", "err");
      }
    }

    async function deleteFinishedProductById(id){
      const fid = String(id || "").trim();
      if (!fid) return;
      if (!(fb.user && fb.db)) { showToast("Accedi con Google", "warn"); return; }

      const fp = (Array.isArray(finishedProducts) ? finishedProducts : []).find(x => String(x && x.id || "") === fid) || null;
      const nm = String(fp && (fp.name || fp.nome || "") || "").trim() || "Prodotto finito";
      const cd = String(fp && (fp.code || "") || "").trim();

      const ok = confirm(`Eliminare il prodotto finito?

${cd ? ("Codice: " + cd + "\n") : ""}Nome: ${nm}

Nota: elimina SOLO l’anagrafica prodotti finiti e la sua distinta base.`);
      if (!ok) return;

      // optimistic local
      try{ finishedProducts = (finishedProducts || []).filter(x => String(x && x.id || "") !== fid); }catch(_){}
      try{ renderAnag(); }catch(_){}

      try{
        try{ await trashPut({ kind:"finishedProduct", label: `${cd ? cd + " — " : ""}${nm}`, target:{ col:"finishedProducts", id: fid, code: cd }, data: fp ? {...fp} : { name:nm, code:cd } }); }catch(_){ }
        await deleteDoc(doc(fb.db, "orgs", ORG_ID, "finishedProducts", fid));
        showToast("Prodotto finito eliminato");
        try{ renderAnag(); }catch(_){}
      }catch(e){
        console.error("deleteFinishedProductById failed", e);
        showToast("Errore eliminazione prodotto finito", "err");
      }
    }

    if (prodClose) prodClose.addEventListener("click", closeProductModal);
    if (btnProdDone) btnProdDone.addEventListener("click", closeProductModal);
    if (modalProduct) modalProduct.addEventListener("click", (e) => { if (e.target === modalProduct) closeProductModal(); });

    if (unifiedClose) unifiedClose.addEventListener("click", closeUnifiedModal);
    if (btnUnifiedDone) btnUnifiedDone.addEventListener("click", closeUnifiedModal);
    if (modalUnified) modalUnified.addEventListener("click", (e) => { if (e.target === modalUnified) closeUnifiedModal(); });

    // Finished product modal
    const __fpCloseSafe = () => { try{ window.closeFinishedProductModal && window.closeFinishedProductModal(); }catch(_){ } };
    if (fpClose) fpClose.addEventListener("click", __fpCloseSafe);
    if (btnFpDone) btnFpDone.addEventListener("click", __fpCloseSafe);
    if (btnFpCancel) btnFpCancel.addEventListener("click", __fpCloseSafe);
    if (modalFinishedProduct) modalFinishedProduct.addEventListener("click", (e) => { if (e.target === modalFinishedProduct) __fpCloseSafe(); });
    if (btnFpSave) btnFpSave.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); saveFinishedProduct(); });
    if (btnFpDelete) btnFpDelete.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (__fpCurrentId) deleteFinishedProductById(__fpCurrentId); });

    if (btnFpCompAdd) btnFpCompAdd.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (!__fpDraft) __fpDraft = __fpEnsureDraftBase({});
      const picked = __fpResolvePickedProduct(fpCompPick && fpCompPick.value);
      if (!picked) { showToast("Seleziona un componente valido", "warn"); return; }

      const qx = __fpParseQty(fpCompQty && fpCompQty.value);
      if (!(qx && (qx.qty != null) && Number.isFinite(Number(qx.qty)))) { showToast("Quantità non valida", "warn"); return; }

      const u = String((picked && picked.uom) || "").trim() || "pz";

      // evita duplicati: se già presente stesso codice, somma qty
      const comps = Array.isArray(__fpDraft.components) ? __fpDraft.components : [];
      const low = String(picked.code || "").trim().toLowerCase();
      const idx = comps.findIndex(c => String(c && c.code || "").trim().toLowerCase() === low);
      if (idx >= 0) {
        const cur = comps[idx] || {};
        const curQty = Number(cur.qty);
        const addQty = Number(qx.qty);
        const newQty = (Number.isFinite(curQty) ? curQty : 0) + (Number.isFinite(addQty) ? addQty : 0);
        cur.qty = newQty;
        cur.qtyRaw = ""; // una volta sommato, mostra numero
        cur.uom = u || cur.uom || "pz";
        comps[idx] = cur;
      } else {
        comps.push({
          productId: keyToDocId(String(picked.code||"").trim().toLowerCase()),
          code: String(picked.code || "").trim(),
          name: String(picked.name || "").trim(),
          qty: Number(qx.qty),
          qtyRaw: String(qx.qtyRaw || "").trim(),
          uom: u
        });
      }
      __fpDraft.components = comps;

      try{ if (fpCompPick) fpCompPick.value = ""; }catch(_){}
      try{ if (fpCompQty) fpCompQty.value = ""; }catch(_){}


      __fpRenderComponents();
    });

    // Categoria → filtra articoli e mostra elenco
    if (fpCompCat){
      fpCompCat.addEventListener("change", () => {
        try{ localStorage.setItem("hubinv_fp_comp_cat", String(fpCompCat.value || "")); }catch(_){}
        try{ if (fpCompPick) fpCompPick.value = ""; }catch(_){}
        __fpBuildDatalist(fpCompCat.value);
        try{ __fpRenderSmartBrowse(); }catch(_){ }
      });
    }

    
// Smart search componenti (ricerca live)
if (fpCompPick){
  fpCompPick.addEventListener("input", () => { try{ __fpRenderSmartBrowse(); }catch(_){ } });
  fpCompPick.addEventListener("focus", () => { try{ __fpRenderSmartBrowse(); }catch(_){ } });
}

// Click su elenco articoli della categoria (seleziona componente)
    if (fpCompBrowseWrap){
      fpCompBrowseWrap.addEventListener("click", (e) => {
        const btn = e && e.target && e.target.closest ? e.target.closest("button.jsFpBrowsePick") : null;
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();

        const code = String(btn.getAttribute("data-code") || "").trim();
        const name = String(btn.getAttribute("data-name") || "").trim();
        const uom = String(btn.getAttribute("data-uom") || "").trim();

        if (fpCompPick) fpCompPick.value = code + (name ? (" — " + name) : "");


        try{ fpCompQty && fpCompQty.focus(); }catch(_){}
      });
    }

    // Delegation: edit qty/uom + delete component
    if (modalFinishedProduct) {
      modalFinishedProduct.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest("button.jsFpCompDel") : null;
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        const i = Number(btn.getAttribute("data-i"));
        if (!__fpDraft || !Array.isArray(__fpDraft.components)) return;
        if (!Number.isFinite(i) || i < 0) return;
        __fpDraft.components.splice(i, 1);
        __fpRenderComponents();
      });

      modalFinishedProduct.addEventListener("input", (e) => {
        const t = e.target;
        if (!t || !__fpDraft || !Array.isArray(__fpDraft.components)) return;

        const i = Number(t.getAttribute("data-i"));
        if (!Number.isFinite(i) || i < 0 || i >= __fpDraft.components.length) return;

        if (t.classList && t.classList.contains("jsFpCompQty")) {
          const qx = __fpParseQty(t.value);
          __fpDraft.components[i].qty = (qx.qty != null && Number.isFinite(Number(qx.qty))) ? Number(qx.qty) : null;
          __fpDraft.components[i].qtyRaw = String(qx.qtyRaw || "").trim();
          if (fpCompMeta) fpCompMeta.textContent = String(__fpDraft.components.length || 0);
          return;
        }

      });
    }




    // Table actions (delegation)
    if (anagTbody) {
      anagTbody.addEventListener("click", (e) => {
        const targetEl = (e && e.target && e.target.nodeType === 3) ? e.target.parentElement : (e ? e.target : null);

        // Click riga (fornitori): apri dettaglio fornitore cliccando ovunque sulla riga
        // (escludi elementi interattivi come bottoni/link/input)
        if (activeAnagTab === "suppliers") {
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

        // Click riga (prodotti finiti): toggle selezione (niente modale componenti)
        if (activeAnagTab === "finished") {
          const isInteractive = !!(targetEl && targetEl.closest && targetEl.closest("button, a, input, select, textarea, label"));
          if (!isInteractive) {
            const trFp = targetEl && targetEl.closest ? targetEl.closest("tr[data-fp-id]") : null;
            const cb = trFp ? trFp.querySelector('input.jsFpSel') : null;
            if (cb) {
              try { cb.checked = !cb.checked; } catch(_) {}
              try { cb.dispatchEvent(new Event('change', { bubbles: true })); } catch(_) {}
            }
            return;
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

        if (action === "openFinishedProduct") {
          try{
            if (window.HubFPCategories && typeof window.HubFPCategories.openForFinishedProduct === "function"){
              window.HubFPCategories.openForFinishedProduct(id);
              return;
            }
          }catch(_){ }
          openFinishedProductModal(id);
          return;
        }
      });
    }

    // Prodotti finiti: selezione multipla (checkbox)
    if (anagTable) {
      try{
        if (!anagTable.dataset.fpSelBound){
          anagTable.dataset.fpSelBound = "1";
          anagTable.addEventListener("change", (e) => {
            try{
              if (activeAnagTab !== "finished") return;
              const t = e && e.target ? e.target : null;
              if (!t) return;

              // Select all
              if (t.id === "fpSelectAll") {
                const ids = __fpVisibleIds();
                const on = !!t.checked;
                for (const id of ids){
                  if (on) __fpSelectedIds.add(id); else __fpSelectedIds.delete(id);
                }
                // sync UI for visible rows
                try{
                  document.querySelectorAll('#anagTbody input.jsFpSel').forEach(cb => { cb.checked = on; });
                }catch(_){ }

                try{ __fpRenderAssignControls(); }catch(_){ }
                try{ __fpSyncSelectAllState(); }catch(_){ }
                return;
              }

              // Single row checkbox
              if (t.classList && t.classList.contains("jsFpSel")) {
                const id = String(t.getAttribute("data-id") || "").trim();
                if (!id) return;
                if (t.checked) __fpSelectedIds.add(id);
                else __fpSelectedIds.delete(id);
                try{ __fpRenderAssignControls(); }catch(_){ }
                try{ __fpSyncSelectAllState(); }catch(_){ }
              }
            }catch(_){ }
          });
        }
      }catch(_){ }
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
          const uomEdited = String(it.uom ?? "").trim();
          const uomEditedClean = (uomEdited && uomEdited !== "-") ? uomEdited : "";
          const uom = __normalizeUom(uomEditedClean) || (uomEditedClean ? uomEditedClean.toLowerCase() : "") || split.uom || "";
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

    if (fpInvSearch) fpInvSearch.addEventListener("input", () => renderAll());
    if (fpInvFilterCategory) fpInvFilterCategory.addEventListener("change", () => renderAll());

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

    // Inventario prodotti finiti: rettifica rapida
    if (fpStockTbody) {
      fpStockTbody.addEventListener("click", async (e) => {
        const btnProd = e.target.closest("button.jsFpProduce");
        if (btnProd) {
          e.preventDefault();
          e.stopPropagation();

          const tr = btnProd.closest("tr[data-k]");
          if (!tr) return;
          const k = tr.getAttribute("data-k") || "";
          const row = __fpStockRowByKey.get(k);
          if (!row) return;

          // sicurezza: solo se ha distinta base (prodotto o categoria)
          if (!__fpHasBomForCode(row.code)) {
            showToast("Prodotto non producibile: distinta base mancante", "warn");
            return;
          }

          const def = "1";
          const label = `${String(row.code||"").trim()} — ${String(row.item||"").trim()}`.trim();
          const raw = prompt(`Quantità da produrre\n\n${label}`, def);
          if (raw == null) return;
          let qty = safeInt(raw);
          if (!Number.isFinite(qty) || qty <= 0) {
            showToast("Quantità non valida", "warn");
            return;
          }

          const inp = tr.querySelector("input.jsFpQtyEdit");
          const btnSave = tr.querySelector("button.jsFpQtySave");
          const oldText = btnProd.textContent;
          btnProd.disabled = true;
          btnProd.textContent = "Produco…";
          try {
            const res = await produceFinishedProductFromRow(row, qty);
            if (res && res.qty) {
              // UI ottimistica: aggiorna quantità visualizzata
              try {
                const newQty = safeInt(row.qty) + safeInt(res.qty);
                row.qty = newQty;
                if (inp) {
                  inp.value = String(newQty);
                  inp.dataset.orig = String(newQty);
                }
                if (btnSave) btnSave.disabled = true;
              } catch(_){ }
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnProd.textContent = oldText || "Produci";
            btnProd.disabled = false;
          }
          return;
        }

        const btnSave = e.target.closest("button.jsFpQtySave");
        if (btnSave) {
          e.preventDefault();
          e.stopPropagation();

          const tr = btnSave.closest("tr[data-k]");
          if (!tr) return;
          const k = tr.getAttribute("data-k") || "";
          const row = __fpStockRowByKey.get(k);
          if (!row) return;

          const inp = tr.querySelector("input.jsFpQtyEdit");
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
            await adjustFinishedStockAbsoluteFromRow(row, newQty);
            row.qty = newQty;
            inp.dataset.orig = String(newQty);
            btnSave.textContent = "Salvato";
            setTimeout(() => { try { btnSave.textContent = "Salva"; } catch(_){} }, 600);
          } catch (err) {
            console.error(err);
            showToast("Errore salvataggio quantità PF", "err");
            btnSave.textContent = "Salva";
          } finally {
            inp.disabled = false;
          }
          return;
        }

        if (e.target.closest("input.jsFpQtyEdit")) return;

        const tr = e.target.closest("tr[data-k]");
        if (!tr) return;
        const k = tr.getAttribute("data-k") || "";
        const row = __fpStockRowByKey.get(k);
        if (!row) return;
        const fid = String(row.fpId || "").trim();
        if (fid) {
          try{ openFinishedProductModal(fid); }catch(_){ }
        } else {
          showToast("Prodotto finito non trovato in anagrafica", "warn");
        }
      });

      fpStockTbody.addEventListener("input", (e) => {
        const inp = e.target;
        if (!inp || !inp.matches || !inp.matches("input.jsFpQtyEdit")) return;
        const tr = inp.closest("tr[data-k]");
        if (!tr) return;
        const btn = tr.querySelector("button.jsFpQtySave");
        if (!btn) return;
        const k = tr.getAttribute("data-k") || "";
        const row = __fpStockRowByKey.get(k);
        const base = Number.isFinite(safeInt(inp.dataset.orig)) ? safeInt(inp.dataset.orig) : safeInt(row ? row.qty : 0);
        let val = safeInt(inp.value);
        if (!Number.isFinite(val) || val < 0) val = 0;
        btn.disabled = (val === base);
      });

      fpStockTbody.addEventListener("keydown", (e) => {
        const inp = e.target;
        if (!inp || !inp.matches || !inp.matches("input.jsFpQtyEdit")) return;

        if (e.key === "Enter") {
          e.preventDefault();
          const tr = inp.closest("tr[data-k]");
          const btn = tr ? tr.querySelector("button.jsFpQtySave") : null;
          if (btn && !btn.disabled) btn.click();
          else inp.blur();
        }

        if (e.key === "Escape") {
          e.preventDefault();
          const base = safeInt(inp.dataset.orig);
          inp.value = String(Number.isFinite(base) ? base : 0);
          const tr = inp.closest("tr[data-k]");
          const btn = tr ? tr.querySelector("button.jsFpQtySave") : null;
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

    const btnPdfBackup = document.getElementById("btnPdfBackup");
    if (btnPdfBackup) btnPdfBackup.addEventListener("click", exportInventoryBackupTxt);

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
        renderHomeDaneaCockpit,
        safeInt,
        formatDateIT,
        normalizeWarehouse,
        warehouseLabel,
        openModal,
        showToast,
        exportMovementsCSV,
        deleteMovement,
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


/* ============================================================
   UI FIX — Distinta base (Scarica flussi DDT)
   Normalizza la tabella/lista scelta componenti nel modale "Prodotto finito"
   (evita stile blu ereditato dai menu).
   ============================================================ */
(function(){
  try{
    const ID = "hubinv_fp_browse_style_fix_v1";
    if (document.getElementById(ID)) return;
    const css = `
/* Finished product (BOM) — component browse list: look like normal tables */
#modalFinishedProduct #fpCompBrowseWrap.tableWrap{
  background: #fff !important;
  border: 1px solid rgba(12,22,52,.08) !important;
}
#modalFinishedProduct #fpCompBrowse{
  display:block !important;
}
#modalFinishedProduct #fpCompBrowse .jsFpBrowsePick{
  display:block !important;
  width:100% !important;
  border: 0 !important;
  border-bottom: 1px solid rgba(12,22,52,.08) !important;
  border-radius: 0 !important;
  background: rgba(255,255,255,.96) !important;
  color: rgba(0,0,0,.86) !important;
  padding: 10px 10px !important;
  font-weight: 850 !important;
  font-size: 13px !important;
  line-height: 1.25 !important;
  text-align: left !important;
  box-shadow: none !important;
}
#modalFinishedProduct #fpCompBrowse .jsFpBrowsePick:hover{
  background: rgba(0,0,0,.03) !important;
}
#modalFinishedProduct #fpCompBrowse .jsFpBrowsePick:active{
  background: rgba(0,0,0,.06) !important;
}
#modalFinishedProduct #fpCompBrowse .jsFpBrowsePick:last-child{
  border-bottom: 0 !important;
}
/* Force neutral table backgrounds inside this modal */
#modalFinishedProduct .tableWrap{
  background: #fff !important;
}
    `.trim();
    const st = document.createElement("style");
    st.id = ID;
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }catch(_){}
})();



/* ============================================================
   UI TUNE — Tabelle: via di mezzo
   - + leggibilita': testi/bottoni/campi dentro le tabelle
   - Inventario: colonna "Nome articolo" piu' larga
   ============================================================ */
(function(){
  try{
    const ID = "gc_table_density_mid_v1";
    if (document.getElementById(ID)) return;
    const css = `
/* General table readability (mid size) */
.tableWrap thead th,
.doc-tableWrap thead th,
table.dataGrid thead th{
  font-size: 15px !important;
  padding: 8px 10px !important;
  line-height: 1.1 !important;
}
.tableWrap tbody td,
.doc-tableWrap tbody td,
table.dataGrid tbody td{
  font-size: 15px !important;
  padding: 8px 10px !important;
  line-height: 1.15 !important;
}
.tableWrap td input,
.tableWrap td select,
.tableWrap td textarea,
.doc-tableWrap td input,
.doc-tableWrap td select,
.doc-tableWrap td textarea{
  font-size: 15px !important;
  padding: 7px 10px !important;
  min-height: 34px !important;
  border-radius: 10px !important;
}
.tableWrap td button,
.tableWrap td .btn,
.doc-tableWrap td button,
.doc-tableWrap td .btn{
  font-size: 14px !important;
  padding: 7px 10px !important;
  min-height: 34px !important;
}
/* Mobile stacked labels */
.tableWrap td::before,
.doc-tableWrap td::before{
  font-size: 12px !important;
}

/* More compact on very small screens (still readable) */
@media (max-width: 720px){
  .tableWrap thead th, .doc-tableWrap thead th, table.dataGrid thead th{
    font-size: 13px !important;
    padding: 7px 8px !important;
  }
  .tableWrap tbody td, .doc-tableWrap tbody td, table.dataGrid tbody td{
    font-size: 14px !important;
    padding: 7px 8px !important;
  }
  .tableWrap td input, .tableWrap td select, .doc-tableWrap td input, .doc-tableWrap td select{
    font-size: 14px !important;
    min-height: 32px !important;
    padding: 6px 8px !important;
  }
}

/* Inventory only: widen first column (Nome articolo) */
#viewInventory .dataGrid{
  table-layout: fixed !important;
}
#viewInventory .dataGrid th:first-child,
#viewInventory .dataGrid td:first-child{
  width: 58% !important;
  min-width: 420px !important;
}
#viewInventory .dataGrid th:nth-child(2),
#viewInventory .dataGrid td:nth-child(2){
  width: 16% !important;
  min-width: 140px !important;
}
#viewInventory .dataGrid th:nth-child(3),
#viewInventory .dataGrid td:nth-child(3){
  width: 16% !important;
  min-width: 140px !important;
}
#viewInventory .dataGrid th:nth-child(4),
#viewInventory .dataGrid td:nth-child(4){
  width: 10% !important;
  min-width: 90px !important;
  white-space: nowrap !important;
}
    `.trim();
    const st = document.createElement("style");
    st.id = ID;
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }catch(_){ }
})();

/* =========================================================
   2026-01 Patch: Dashboard SVG icons
   - Size is handled in hub_inventario.html (all like "Categorie")
   - Here we apply a unified blue/violet gradient to all dashboard icons
   ========================================================= */
(function(){
  var SVG_NS = "http://www.w3.org/2000/svg";
  var SEL = "#viewHome svg.homeTileIcon";

  function ensureDefs(svg){
    try{
      var defs = svg.querySelector("defs");
      if (defs) return defs;
      defs = document.createElementNS(SVG_NS, "defs");
      svg.insertBefore(defs, svg.firstChild);
      return defs;
    }catch(_){ return null; }
  }

  function makeGradient(defs, id){
    try{
      var grad = document.createElementNS(SVG_NS, "linearGradient");
      grad.setAttribute("id", id);
      grad.setAttribute("x1", "0%");
      grad.setAttribute("y1", "0%");
      grad.setAttribute("x2", "100%");
      grad.setAttribute("y2", "100%");

      var stops = [
        { off: "0%",   col: "#0a84ff" },
        { off: "55%",  col: "#5e5ce6" },
        { off: "100%", col: "#af52de" }
      ];

      for (var i=0; i<stops.length; i++){
        var st = document.createElementNS(SVG_NS, "stop");
        st.setAttribute("offset", stops[i].off);
        st.setAttribute("stop-color", stops[i].col);
        grad.appendChild(st);
      }

      defs.appendChild(grad);
      return grad;
    }catch(_){ return null; }
  }

  function applyGradient(svg, gradId){
    // Patch 2026-01: icone dashboard devono seguire il colore (CSS) -> nero su tile bianchi
    // Usiamo currentColor invece del gradiente (evita inline fill colorati)
    var fill = "currentColor";
    try{
      var nodes = svg.querySelectorAll("path,circle,rect,polygon,ellipse");
      for (var i=0; i<nodes.length; i++){
        var el = nodes[i];
        try{ el.setAttribute("fill", fill); }catch(_){ }
        try{ if (el && el.style && el.style.setProperty) el.style.setProperty("fill", fill, "important"); }catch(_){ }
      }
    }catch(_){ }
  }

  function apply(){
    try{
      var root = document.querySelectorAll(SEL);
      if (!root || !root.length) return;

      var prefix = window.__gcDashIconGradPrefix;
      if (!prefix){
        prefix = "gcbv_" + Math.random().toString(36).slice(2, 8);
        window.__gcDashIconGradPrefix = prefix;
      }

      var seq = window.__gcDashIconGradSeq || 0;
      for (var i=0; i<root.length; i++){
        var svg = root[i];
        if (!svg) continue;
        try{
          if (svg.dataset && svg.dataset.gcIconGrad === "1") continue;
          if (svg.dataset) svg.dataset.gcIconGrad = "1";
        }catch(_){ }

        var defs = ensureDefs(svg);
        if (!defs) continue;

        var gradId = prefix + "_" + (seq++);
        makeGradient(defs, gradId);
        applyGradient(svg, gradId);
      }
      window.__gcDashIconGradSeq = seq;
    }catch(_){ }
  }

  function schedule(){
    try{ requestAnimationFrame(apply); }catch(_){ try{ setTimeout(apply, 0); }catch(__){} }
  }

  try{
    if (document.readyState === "loading"){
      document.addEventListener("DOMContentLoaded", schedule, { once: true });
    } else {
      schedule();
    }

    // Re-apply if something hot-injects/refreshes the Home UI
    window.addEventListener("HubInvReady", schedule);
  }catch(_){ }
})();
