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
