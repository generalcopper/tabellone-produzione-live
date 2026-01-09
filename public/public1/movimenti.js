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