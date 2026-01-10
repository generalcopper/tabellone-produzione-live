/* dash_inventario.js
   Dashboard (Home) estratta da hub_inventario.html per alleggerire l'HTML.
   - Inserisce il markup dentro #viewHome
   - Non dipende da moduli / Firebase
*/

(function(){
  try{
    var root = document.getElementById("viewHome");
    if (!root) return;

    // evita doppia iniezione
    if (document.getElementById("statsCard")) return;

    root.innerHTML = `
<article class="card" id="statsCard">
            <div class="bd">
              <div class="stat-grid" aria-live="polite">
                <div class="stat-tile">
                  <div class="label">Articoli (distinti)</div>
                  <div class="value" id="statTotalItems">—</div>
                  <div class="meta">Fornitore + codice articolo</div>
                </div>
                <div class="stat-tile">
                  <div class="label">Pezzi totali</div>
                  <div class="value" id="statTotalPieces">—</div>
                  <div class="meta">Somma stock attuale</div>
                </div>
                <div class="stat-tile">
                  <div class="label">DDT Caricati</div>
                  <div class="value" id="statTotalFlows">—</div>
                  <div class="meta">Carichi + scarichi</div>
                </div>

                <div class="stat-tile">
                  <div class="label">Scorta bassa</div>
                  <div class="value" id="statLowStock">—</div>
                  <div class="meta">Sotto soglia</div>
                </div>
                <div class="stat-tile">
                  <div class="label">Ultimo aggiornamento</div>
                  <div class="value" id="statLastUpdate">—</div>
                  <div class="meta">Movimento più recente</div>
                </div>
              </div>

              <div class="hero-sub">Dashboard</div>
              <div class="homeActions" role="navigation" aria-label="Azioni principali">
                

<button class="btn btn-primary homeTile" id="btnGoOcr" type="button" aria-label="Carica OCR">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7a3 3 0 0 1 3-3h2l1-1h4l1 1h2a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7zm8 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/>
    </svg>
    <span class="homeTileBadge">OCR</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">Carica OCR</div>
    <div class="homeTileSub">Scatta o carica un documento</div>
  </div>
</button>

<button class="btn btn-primary homeTile" id="btnGoAnag" type="button" aria-label="Fornitori">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 5h6a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2zm0 4h6a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2zm0 4h4a1 1 0 0 0 0-2H9a1 1 0 0 0 0 2z"/>
    </svg>
    <span class="homeTileBadge">DB</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">Fornitori</div>
    <div class="homeTileSub">Anagrafica fornitori</div>
  </div>
</button>

<button class="btn btn-primary homeTile" id="btnGoProdAnag" type="button" aria-label="Prodotti">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v4H4V4zm0 6h16v10H4V10zm2 2v6h12v-6H6z"/>
    </svg>
    <span class="homeTileBadge">SKU</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">Prodotti</div>
    <div class="homeTileSub">Alias e dettagli</div>
  </div>
</button>

<button class="btn btn-primary homeTile" id="btnGoInvCerea" type="button" aria-label="Inventario Cerea">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v6H4V4zm0 8h16v8H4v-8zm2 2v4h12v-4H6z"/>
    </svg>
    <span class="homeTileBadge">MAG</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">Inventario Cerea</div>
    <div class="homeTileSub">Magazzino Cerea</div>
  </div>
</button>

<button class="btn btn-primary homeTile" id="btnGoInvConcamarise" type="button" aria-label="Inventario Concamarise">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v6H4V4zm0 8h16v8H4v-8zm2 2v4h12v-4H6z"/>
    </svg>
    <span class="homeTileBadge">MAG</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">Inventario Concamarise</div>
    <div class="homeTileSub">Magazzino Concamarise</div>
  </div>
</button>

<button class="btn btn-primary homeTile" id="btnGoFlows" type="button" aria-label="DDT Caricati">
  <div class="homeTileTop">
    <svg class="homeTileIcon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l4 4h-3v6h-2V7H8l4-4zm0 18l-4-4h3v-6h2v6h3l-4 4z"/>
    </svg>
    <span class="homeTileBadge">LOG</span>
  </div>
  <div class="homeTileText">
    <div class="homeTileTitle">DDT Caricati</div>
    <div class="homeTileSub">Documenti caricati</div>
  </div>
</button>

</div>

              <!-- Sotto-scorta (solo visual) -->
              <div class="lowStockBoard" id="lowStockBoard" aria-label="Articoli sotto scorta">
                <div class="lowStockCol">
                  <div class="lowStockColHd">
                    <div class="hero-sub">Sezione Cerea</div>
                    <span class="pill" id="lowStockCountCerea">0</span>
                  </div>
                  <div class="lowStockList" id="lowStockListCerea">
                    <div class="td-muted">—</div>
                  </div>
                </div>
                <div class="lowStockCol">
                  <div class="lowStockColHd">
                    <div class="hero-sub">Sezione Concamarise</div>
                    <span class="pill" id="lowStockCountConca">0</span>
                  </div>
                  <div class="lowStockList" id="lowStockListConca">
                    <div class="td-muted">—</div>
                  </div>
                </div>
              </div>
              </div>
          </article>
          `;
  }catch(e){
    try{ console.warn("[dash_inventario] inject failed", e); }catch(_){}
  }
})(); 
