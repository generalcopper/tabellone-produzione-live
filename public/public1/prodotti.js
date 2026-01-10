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
