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
