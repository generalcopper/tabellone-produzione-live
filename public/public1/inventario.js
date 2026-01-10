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
