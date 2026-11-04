// Home: coda di lavoro, ricerca "dove si trova" e stato del magazzino.
// Legge gli stessi articoli autoritativi del resto dell'app; le azioni sono delegate a picking.js.
import {
  ROW_IDS,
  buildPlanSVG,
  buildWarehouseModel,
  locationLabelHTML,
  rowSignHTML,
} from "./picking-map.js?v=45be2460360e";

export { buildWarehouseModel as buildHomeModel };

const number = (value) => new Intl.NumberFormat("it-IT").format(value);
const text = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
const plural = (n, one, many) => `${number(n)} ${n === 1 ? one : many}`;
const chevron = `<svg class="ico chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg>`;

export function createPickingHomeDashboard({
  root,
  readSnapshot,
  locationCodes,
  navigate,
  openProduct,
  openMap,
  refreshPreview,
}) {
  let query = "";
  let frame = null;
  let previousUser = null;
  root.innerHTML = `
    <div class="home">
      <section class="home-block" aria-labelledby="phTodoTitle">
        <h2 class="block-title" id="phTodoTitle">Da fare</h2>
        <div class="todo" id="phTodo">
          <button type="button" class="todo-row" data-ph-view="noLocation">
            <span class="todo-icon todo-icon--put" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M4 17.5h16v3H4z"/></svg></span>
            <span class="todo-main"><b>Da ubicare</b><small id="phUnlocatedDetail">In caricamento</small></span>
            <strong class="todo-value" id="phUnlocated">—</strong>${chevron}
          </button>
          <button type="button" class="todo-row" data-ph-view="pickingFbm">
            <span class="todo-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.5H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg></span>
            <span class="todo-main"><b>Picking FBM</b><small id="phFbmDetail">In caricamento</small></span>
            <strong class="todo-value" id="phFbm">—</strong>${chevron}
          </button>
          <button type="button" class="todo-row" data-ph-view="pickingFba">
            <span class="todo-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/></svg></span>
            <span class="todo-main"><b>Picking FBA</b><small id="phFbaDetail">In caricamento</small></span>
            <strong class="todo-value" id="phFba">—</strong>${chevron}
          </button>
          <button type="button" class="todo-row" data-ph-view="cerea">
            <span class="todo-icon todo-icon--temp" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2" stroke-dasharray="3 2.4"/><path d="M8.5 12h7"/></svg></span>
            <span class="todo-main"><b>Cerea</b><small id="phCereaDetail">Posizione temporanea</small></span>
            <strong class="todo-value" id="phCerea">—</strong>${chevron}
          </button>
        </div>
      </section>

      <section class="home-block" aria-labelledby="phFindTitle">
        <h2 class="block-title" id="phFindTitle">Dove si trova</h2>
        <label class="search search--lg">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <span class="sr-only">Cerca un prodotto o una posizione</span>
          <input id="phSearch" type="search" placeholder="SKU, nome prodotto, lotto o posizione" autocomplete="off" spellcheck="false" enterkeyhint="search">
          <button type="button" class="search-clear" id="phSearchClear" aria-label="Cancella ricerca" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>
        </label>
        <div id="phSearchFeedback" class="find-results" role="status"></div>
      </section>

      <section class="home-block home-block--stock" aria-labelledby="phStockTitle">
        <div class="block-head">
          <h2 class="block-title" id="phStockTitle">Giacenza</h2>
          <span class="block-meta" id="phTotalDetail">In caricamento</span>
        </div>
        <div class="stock">
          <div class="stock-total"><strong id="phTotal">—</strong><span>pezzi disponibili</span></div>
          <div class="stock-bar" aria-hidden="true"><span class="sb-loc" id="phBarLoc"></span><span class="sb-cerea" id="phBarCerea"></span><span class="sb-unloc" id="phBarUnloc"></span></div>
          <dl class="stock-legend">
            <div><dt><i class="sw sw-loc"></i>Ubicati</dt><dd id="phLocated">—</dd><dd class="muted" id="phLocatedDetail"></dd></div>
            <div><dt><i class="sw sw-unloc"></i>Da ubicare</dt><dd id="phUnlocatedPcs">—</dd><dd class="muted" id="phUnlocatedProducts"></dd></div>
            <div><dt><i class="sw sw-cerea"></i>Di cui a Cerea</dt><dd id="phCereaPcs">—</dd><dd class="muted" id="phCereaProducts"></dd></div>
          </dl>
        </div>
      </section>

      <section class="home-block home-block--map" aria-labelledby="phMapTitle">
        <div class="block-head">
          <h2 class="block-title" id="phMapTitle">Capannone</h2>
          <button type="button" class="link-btn" data-ph-view="map">Apri mappa${chevron}</button>
        </div>
        <div class="home-map">
          <div class="home-plan" id="phMap" role="group" aria-label="Pianta del capannone: tocca una campata per aprirla sulla mappa"></div>
          <div class="home-rows">
            <div class="occupancy"><span>Posti occupati</span><strong id="phOccupancy">—</strong><div class="ph-progress" aria-hidden="true"><span id="phOccupancyBar"></span></div><small id="phOccupancyDetail">In caricamento</small></div>
            <div class="rowtable" id="phRows"></div>
          </div>
        </div>
      </section>

      <div class="home-foot"><span id="phStatus" class="sr-only" role="status">Caricamento dati…</span><button type="button" class="link-btn" data-ph-view="bioneeShop">Controllo Bionee shop${chevron}</button></div>
    </div>`;
  const byId = (id) => root.querySelector("#" + id);
  const input = byId("phSearch");
  function setText(id, value) {
    const el = byId(id);
    if (el && el.textContent !== value) el.textContent = value;
  }
  function setMarkup(id, markup) {
    const el = byId(id);
    if (!el || el._html === markup) return;
    el.innerHTML = markup;
    el._html = markup;
  }
  function searchResults(model, ready) {
    if (!model.searching || !ready) return "";
    const list = model.matchedProducts.slice(0, 8);
    if (!list.length)
      return `<p class="find-empty">Nessun prodotto trovato. Controlla lo SKU o prova con una parte del nome.</p>`;
    const rows = list
      .map((p) => {
        const where = p.codes.length
          ? `<span class="find-locs">${p.codes
              .slice(0, 4)
              .map((c) => locationLabelHTML(c, { size: "sm" }))
              .join(
                "",
              )}${p.codes.length > 4 ? `<span class="more">+${p.codes.length - 4}</span>` : ""}</span>`
          : "";
        const pending = p.remaining
          ? `<span class="tag tag--warn">${number(p.remaining)} pz da ubicare</span>`
          : "";
        return `<button type="button" class="find-row" data-ph-product="${text(p.sku)}"><span class="find-main"><b>${text(p.title || p.displaySku)}</b><small>${text(p.displaySku)}</small></span><span class="find-where">${where}${pending}</span></button>`;
      })
      .join("");
    const more =
      model.matchedProducts.length > list.length
        ? `<p class="find-more">Altri ${number(model.matchedProducts.length - list.length)} risultati.</p>`
        : "";
    return `<div class="find-list">${rows}</div>${more}<button type="button" class="btn btn--ghost btn--block" data-ph-mapquery>Mostra sulla mappa</button>`;
  }
  function rowsTable(model, ready) {
    return ROW_IDS.map((id) => {
      const row = model.rows.get(id);
      if (!row) return "";
      const ratio = ready && row.capacity ? row.occupied / row.capacity : 0;
      return `<button type="button" class="rowtable-row" data-ph-row="${id}">${rowSignHTML(id, "sm")}<span class="rowtable-bar" aria-hidden="true"><span style="width:${(ratio * 100).toFixed(1)}%"></span></span><span class="rowtable-val">${ready ? `${number(row.occupied)}/${number(row.capacity)}` : "—"}</span><span class="sr-only">Fila ${id}</span></button>`;
    }).join("");
  }
  function render() {
    const snapshot = readSnapshot();
    if (previousUser !== snapshot.userId) {
      previousUser = snapshot.userId;
      query = "";
      input.value = "";
    }
    const ready = snapshot.allowed && snapshot.loaded;
    const model = buildWarehouseModel(ready ? snapshot.items : [], locationCodes, query);
    const { stats } = model;
    const stale = !snapshot.online || snapshot.fromCache || snapshot.error;
    setText(
      "phStatus",
      !snapshot.allowed
        ? "Accedi per vedere il magazzino"
        : snapshot.error
          ? "Aggiornamento non disponibile"
          : !ready
            ? "Caricamento dati…"
            : stale
              ? "Ultimi dati disponibili"
              : "Inventario aggiornato",
    );
    setText("phTotal", ready ? number(stats.total) : "—");
    setText(
      "phTotalDetail",
      ready ? plural(stats.products, "prodotto", "prodotti") : "In attesa dei dati",
    );
    setText("phLocated", ready ? number(stats.allocated) + " pz" : "—");
    setText("phLocatedDetail", ready ? plural(stats.locatedProducts, "prodotto", "prodotti") : "");
    setText("phUnlocatedPcs", ready ? number(stats.unallocated) + " pz" : "—");
    setText(
      "phUnlocatedProducts",
      ready ? plural(stats.unlocatedProducts, "prodotto", "prodotti") : "",
    );
    setText("phCereaPcs", ready ? number(stats.cerea) + " pz" : "—");
    setText("phCereaProducts", ready ? plural(stats.cereaProducts, "prodotto", "prodotti") : "");
    const pct = (v) => (ready && stats.total ? (v / stats.total) * 100 : 0).toFixed(2) + "%";
    byId("phBarLoc").style.width = pct(stats.allocated);
    byId("phBarCerea").style.width = pct(stats.cerea);
    byId("phBarUnloc").style.width = pct(Math.max(0, stats.unallocated - stats.cerea));

    setText("phUnlocated", ready ? number(stats.unallocated) + " pz" : "—");
    setText(
      "phUnlocatedDetail",
      ready
        ? stats.unlocatedProducts
          ? plural(stats.unlocatedProducts, "prodotto senza posizione", "prodotti senza posizione")
          : "Tutto ubicato"
        : "In attesa dei dati",
    );
    byId("phTodo")
      .querySelector('[data-ph-view="noLocation"]')
      .classList.toggle("is-due", ready && stats.unallocated > 0);
    for (const [key, id, noun] of [
      ["fbm", "Fbm", ["SKU da preparare", "SKU da preparare"]],
      ["fba", "Fba", ["flusso da prelevare", "flussi da prelevare"]],
    ]) {
      const preview = snapshot.preview?.[key];
      const loaded = ready && preview?.loaded;
      setText("ph" + id, loaded ? number(preview.count) : "—");
      setText(
        "ph" + id + "Detail",
        loaded
          ? preview.count === 1
            ? noun[0]
            : noun[1]
          : preview?.loading
            ? "Caricamento…"
            : "Apri per aggiornare",
      );
      byId("phTodo")
        .querySelector(`[data-ph-view="picking${id}"]`)
        .classList.toggle("is-due", !!loaded && preview.count > 0);
    }
    setText("phCerea", ready ? number(stats.cerea) + " pz" : "—");
    setText(
      "phCereaDetail",
      ready
        ? stats.cereaProducts
          ? plural(
              stats.cereaProducts,
              "prodotto in posizione temporanea",
              "prodotti in posizione temporanea",
            )
          : "Nessun prodotto"
        : "Posizione temporanea",
    );
    setText("phOccupancy", ready ? `${number(stats.occupied)} di ${number(stats.capacity)}` : "—");
    setText(
      "phOccupancyDetail",
      ready
        ? plural(stats.capacity - stats.occupied, "posto libero", "posti liberi")
        : "In attesa dei dati",
    );
    byId("phOccupancyBar").style.width =
      (ready && stats.capacity ? (stats.occupied / stats.capacity) * 100 : 0) + "%";
    setMarkup("phRows", rowsTable(model, ready));
    const planModel = buildWarehouseModel(ready ? snapshot.items : [], locationCodes, "");
    setMarkup(
      "phMap",
      buildPlanSVG({ model: planModel, mode: "browse", ready, interactive: true }),
    );
    byId("phSearchClear").hidden = !query;
    setMarkup("phSearchFeedback", searchResults(model, ready));
  }
  function scheduleRender() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      render();
    });
  }
  root.addEventListener("click", (event) => {
    const target = event.target.closest(
      "[data-ph-view],[data-bay],[data-ph-product],[data-ph-row],[data-ph-mapquery],#phSearchClear",
    );
    if (!target || !root.contains(target)) return;
    const snapshot = readSnapshot();
    if (target.dataset.phView) navigate(target.dataset.phView);
    else if (target.dataset.bay) openMap({ bay: target.dataset.bay });
    else if (target.dataset.phRow) openMap({ row: target.dataset.phRow });
    else if (target.hasAttribute("data-ph-mapquery")) openMap({ query });
    else if (target.id === "phSearchClear") {
      query = "";
      input.value = "";
      render();
      input.focus();
    } else if (target.dataset.phProduct && snapshot.allowed && snapshot.loaded)
      openProduct({ sku: target.dataset.phProduct });
  });
  root.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    const bay = event.target.closest("[data-bay]");
    if (bay) {
      event.preventDefault();
      openMap({ bay: bay.dataset.bay });
    }
  });
  let t = null;
  input.addEventListener("input", () => {
    clearTimeout(t);
    t = setTimeout(() => {
      query = input.value;
      render();
    }, 120);
  });
  window.addEventListener("online", scheduleRender);
  window.addEventListener("offline", scheduleRender);
  render();
  return {
    scheduleRender,
    activate() {
      scheduleRender();
      refreshPreview();
    },
  };
}
