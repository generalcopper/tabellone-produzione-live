// Home reads the same authoritative stock representatives and allocation helpers as Picking.
// Navigation and product editing are delegated to the existing application.
const number = value => new Intl.NumberFormat('it-IT').format(value);
const products = value => number(value) + (value === 1 ? ' prodotto' : ' prodotti');
const text = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const normalized = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const quantity = value => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;

export function buildHomeModel(items, locationCodes, query = '') {
  const positions = new Map(locationCodes.map(code => [code, []]));
  const bays = new Map();
  for (const code of locationCodes) {
    const bay = code.split('-')[0];
    if (!bays.has(bay)) bays.set(bay, {code:bay, positions:[], occupied:0, qty:0, unknown:false, matched:false});
    bays.get(bay).positions.push(code);
  }
  const terms = normalized(query).trim().split(/\s+/).filter(Boolean);
  const matches = value => terms.every(term => normalized(value).includes(term));
  const stats = {products:0, total:0, allocated:0, unallocated:0, locatedProducts:0, unlocatedProducts:0, cerea:0, cereaProducts:0, occupied:0, capacity:locationCodes.length};
  let unlocatedMatches = 0;
  for (const item of items) {
    const total = quantity(item.total);
    if (!total) continue;
    const allocated = Math.min(total, quantity(item.allocated));
    const remaining = total - allocated;
    stats.products++; stats.total += total; stats.allocated += allocated; stats.unallocated += remaining;
    if (allocated) stats.locatedProducts++;
    if (remaining) stats.unlocatedProducts++;
    const cerea = Math.min(remaining, quantity(item.cerea));
    stats.cerea += cerea;
    if (cerea) stats.cereaProducts++;
    const searchable = [item.sku, item.displaySku, item.title, ...(item.aliases || [])].join(' ');
    if (terms.length && remaining && matches(searchable)) unlocatedMatches++;
    for (const allocation of item.allocations || []) {
      const entries = positions.get(allocation.code);
      const unknown = allocation.legacy === true;
      const qty = unknown ? null : quantity(allocation.qty);
      if (!entries || (!unknown && !qty)) continue;
      entries.push({...allocation, qty, sku:item.sku, displaySku:item.displaySku || item.sku, title:item.title, unknown});
      const bay = bays.get(allocation.code.split('-')[0]);
      bay.qty += qty || 0;
      bay.unknown ||= unknown;
      if (matches([searchable, allocation.code, allocation.lot, allocation.lotLabel].join(' '))) bay.matched = true;
    }
  }
  for (const [code, entries] of positions) {
    if (!entries.length) continue;
    stats.occupied++;
    bays.get(code.split('-')[0]).occupied++;
  }
  for (const bay of bays.values()) {
    if (matches([bay.code, ...bay.positions].join(' '))) bay.matched = true;
  }
  return {stats, positions, bays, unlocatedMatches, searching:terms.length > 0};
}

export function createPickingHomeDashboard({root, readSnapshot, locationCodes, renderPlan, openProduct, navigate, refreshPreview}) {
  let selectedBay = '', level = 'all', query = '', zoom = 1, frame = null;
  let model = buildHomeModel([], locationCodes);
  let previousUser = null;
  const byId = id => root.querySelector('#' + id);
  const metric = (id, label, view) => `<button class="ph-metric" type="button" data-ph-view="${view}"><span class="ph-label">${label}<span aria-hidden="true">↗</span></span><strong id="${id}">—</strong><span class="ph-muted" id="${id}Detail">In caricamento</span></button>`;
  root.innerHTML = `
    <header class="ph-header"><div><div class="ph-eyebrow">PANORAMICA OPERATIVA</div><h1 id="homeOverviewTitle">Home</h1><p>Prodotti, prelievi e postazioni del magazzino.</p></div><span class="ph-status" id="phStatus" role="status">Caricamento dati…</span></header>
    <div class="ph-metrics">
      <div class="ph-metric"><span class="ph-label">Disponibilità totale</span><strong id="phTotal">—</strong><span class="ph-muted" id="phTotalDetail">In caricamento</span></div>
      ${metric('phLocated', 'Ubicati', 'located')}
      ${metric('phUnlocated', 'Da ubicare', 'noLocation')}
      <div class="ph-metric ph-occupancy"><span class="ph-label">Postazioni occupate</span><strong id="phOccupancy">—</strong><span class="ph-muted" id="phOccupancyDetail">In caricamento</span><div class="ph-progress" aria-hidden="true"><span id="phOccupancyBar"></span></div></div>
    </div>
    <div class="ph-operations" aria-label="Riepilogo attività">
      <button type="button" data-ph-view="pickingFbm"><span class="ph-operation-icon">FBM</span><span><b>Picking FBM</b><small id="phFbmDetail">Caricamento…</small></span><strong id="phFbm">—</strong><span aria-hidden="true">›</span></button>
      <button type="button" data-ph-view="pickingFba"><span class="ph-operation-icon">FBA</span><span><b>Picking FBA</b><small id="phFbaDetail">Caricamento…</small></span><strong id="phFba">—</strong><span aria-hidden="true">›</span></button>
      <button type="button" data-ph-view="cerea"><span class="ph-operation-icon">C</span><span><b>Cerea</b><small id="phCereaDetail">Posizione temporanea</small></span><strong id="phCerea">—</strong><span aria-hidden="true">›</span></button>
      <button type="button" data-ph-view="pickingHistory"><span class="ph-operation-icon" aria-hidden="true">↶</span><span><b>Storico prelievi</b><small>Consulta i prelievi effettuati</small></span><span aria-hidden="true">›</span></button>
    </div>
    <section class="ph-map-card" aria-labelledby="phMapTitle">
      <div class="ph-map-header"><div><h2 id="phMapTitle">Mappa del capannone</h2><p>Concamarise · seleziona una campata per vedere cosa contiene.</p></div><div class="ph-legend"><span><i class="ph-dot occupied"></i>Occupata</span><span><i class="ph-dot"></i>Libera</span><span><i class="ph-dot selected"></i>Selezionata</span></div></div>
      <div class="ph-toolbar"><label class="ph-search"><span class="ph-sr-only">Cerca prodotto o ubicazione nella mappa</span><input id="phSearch" type="search" placeholder="Cerca SKU, prodotto, lotto o ubicazione…" autocomplete="off"></label><label class="ph-bay-select"><span class="ph-sr-only">Seleziona campata</span><select id="phBaySelect"><option value="">Vai alla campata…</option>${[...model.bays.keys()].map(code=>`<option value="${code}">${code}</option>`).join('')}</select></label><div class="ph-zoom"><button type="button" data-ph-zoom="out" aria-label="Riduci mappa">−</button><button type="button" data-ph-zoom="reset" aria-label="Ripristina zoom mappa" id="phZoomValue">100%</button><button type="button" data-ph-zoom="in" aria-label="Ingrandisci mappa">+</button></div></div>
      <div id="phSearchFeedback" class="ph-search-feedback" role="status"></div>
      <div class="ph-map-layout"><div class="ph-map-viewport" id="phMapViewport" tabindex="0" aria-label="Planimetria: scorri per esplorare la mappa ingrandita"><div id="phMap" class="ph-map"></div></div><aside class="ph-detail" aria-label="Contenuto della campata"><div id="phBayDetail"></div></aside></div>
      <footer class="ph-map-footer"><span id="phMapSummary">Caricamento ubicazioni…</span><span>Apri un prodotto per gestire le sue ubicazioni.</span></footer>
    </section>
    <div class="ph-bottom"><span>Cerea è compresa nelle quantità da ubicare.</span><button type="button" class="btn" data-ph-view="bioneeShop">Apri Bionee shop <span aria-hidden="true">↗</span></button></div>`;

  function setText(id, value) { const el = byId(id); if (el && el.textContent !== value) el.textContent = value; }
  function setMarkup(id, html) {
    const el = byId(id);
    if (el._html === html) return;
    const focused = el.contains(document.activeElement) ? document.activeElement : null;
    const focusKey = focused?.getAttribute('data-home-bay') || focused?.getAttribute('data-ph-level');
    el.innerHTML = html; el._html = html;
    if (focusKey) {
      for (const button of el.querySelectorAll('[data-home-bay], [data-ph-level]')) {
        if ((button.dataset.homeBay || button.dataset.phLevel) === focusKey) button.focus({preventScroll:true});
      }
    }
  }
  function renderDetail(ready) {
    const bay = model.bays.get(selectedBay);
    if (!ready || !bay) {
      setMarkup('phBayDetail', `<div class="ph-empty"><span class="ph-empty-icon" aria-hidden="true">⌖</span><h3>${ready ? 'Esplora le postazioni' : 'In attesa dei dati'}</h3><p>${ready ? 'Seleziona una campata nella pianta o nell’elenco. Qui troverai prodotti, quantità e lotti per ogni livello e posto.' : 'Le ubicazioni appariranno appena l’inventario sarà disponibile.'}</p></div>`);
      return;
    }
    const levels = [...new Set(bay.positions.map(code=>code.split('-')[1]))];
    if (level !== 'all' && !levels.includes(level)) level = 'all';
    let html = `<div class="ph-detail-heading"><span class="ph-eyebrow">CAMPATA</span><h3>${text(bay.code)}</h3><p>${number(bay.occupied)} di ${bay.positions.length} postazioni occupate · ${bay.unknown ? 'quantità da verificare' : number(bay.qty) + ' pz'}</p></div>`;
    html += `<div class="ph-levels" role="group" aria-label="Filtra livello">${['all', ...levels].map(key=>`<button type="button" data-ph-level="${key}" aria-pressed="${key === level}">${key === 'all' ? 'Tutti' : key}</button>`).join('')}</div>`;
    for (const current of levels.filter(key=>level === 'all' || key === level)) {
      html += `<section class="ph-level"><h4>${text(current)} <span>${current === 'L1' ? 'Piano terra' : current === 'L2' ? 'Secondo livello' : 'Terzo livello'}</span></h4>`;
      for (const code of bay.positions.filter(value=>value.split('-')[1] === current)) {
        const entries = model.positions.get(code);
        html += `<div class="ph-slot${entries.length ? ' is-occupied' : ''}"><div class="ph-slot-heading"><b>${text(code)}</b><span>${entries.length ? 'Occupata' : 'Libera'}</span></div>`;
        for (const entry of entries) {
          html += `<button type="button" class="ph-product" data-ph-product="${text(entry.sku)}" data-ph-lot="${text(entry.lot)}" data-ph-code="${text(code)}"><span class="ph-product-title">${text(entry.title || entry.displaySku)}</span><span class="ph-product-meta">${text(entry.displaySku)} · ${text(entry.lotLabel || entry.lot || 'Lotto non indicato')}</span><span class="ph-product-bottom"><strong>${entry.unknown ? 'Quantità da verificare' : number(entry.qty) + ' pz'}</strong><span>Gestisci ubicazione ↗</span></span></button>`;
        }
        html += '</div>';
      }
      html += '</section>';
    }
    setMarkup('phBayDetail', html);
  }
  function render() {
    const snapshot = readSnapshot();
    if (previousUser !== snapshot.userId) {
      previousUser = snapshot.userId; selectedBay = ''; level = 'all'; query = '';
      byId('phSearch').value = '';
    }
    const ready = snapshot.allowed && snapshot.loaded;
    model = buildHomeModel(ready ? snapshot.items : [], locationCodes, query);
    const {stats} = model;
    if (model.searching && !model.bays.get(selectedBay)?.matched) selectedBay = [...model.bays.values()].find(bay=>bay.matched)?.code || '';
    byId('phBaySelect').value = selectedBay;
    const stale = !snapshot.online || snapshot.fromCache || snapshot.error;
    setText('phStatus', !snapshot.allowed ? 'Accedi per vedere il magazzino' : snapshot.error ? 'Aggiornamento non disponibile' : !ready ? 'Caricamento dati…' : stale ? 'Ultimi dati disponibili' : 'Inventario aggiornato');
    byId('phStatus').classList.toggle('is-live', !!ready && !stale);
    setText('phTotal', ready ? number(stats.total) + ' pz' : '—');
    setText('phTotalDetail', ready ? products(stats.products) + ' con disponibilità' : 'In attesa dei dati');
    setText('phLocated', ready ? number(stats.allocated) + ' pz' : '—');
    setText('phLocatedDetail', ready ? products(stats.locatedProducts) + ' sulle scaffalature' : 'In attesa dei dati');
    setText('phUnlocated', ready ? number(stats.unallocated) + ' pz' : '—');
    setText('phUnlocatedDetail', ready ? products(stats.unlocatedProducts) + ' da sistemare' : 'In attesa dei dati');
    setText('phOccupancy', ready ? number(stats.occupied) + ' / ' + stats.capacity : '—');
    setText('phOccupancyDetail', ready ? number(stats.capacity - stats.occupied) + (stats.capacity - stats.occupied === 1 ? ' postazione libera' : ' postazioni libere') : 'In attesa dei dati');
    byId('phOccupancyBar').style.width = (ready && stats.capacity ? stats.occupied / stats.capacity * 100 : 0) + '%';
    for (const [key, label, noun] of [['fbm','Fbm','SKU da prelevare'], ['fba','Fba','flussi da prelevare']]) {
      const preview = snapshot.preview?.[key];
      setText('ph' + label, ready && preview?.loaded ? number(preview.count) : '—');
      setText('ph' + label + 'Detail', ready && preview?.loaded ? noun : preview?.loading ? 'Caricamento…' : 'Apri per aggiornare');
    }
    setText('phCerea', ready ? number(stats.cerea) + ' pz' : '—');
    setText('phCereaDetail', ready ? products(stats.cereaProducts) + ' · posizione temporanea' : 'Posizione temporanea');
    setText('phMapSummary', ready ? `${number(stats.occupied)} ${stats.occupied === 1 ? "postazione occupata" : "postazioni occupate"} · ${number(stats.capacity - stats.occupied)} libere · ${model.bays.size} campate` : 'In attesa delle ubicazioni');
    const matches = [...model.bays.values()].filter(bay=>bay.matched).length;
    setText('phSearchFeedback', model.searching && ready ? `${matches ? number(matches) + (matches === 1 ? ' campata trovata' : ' campate trovate') : 'Nessuna campata trovata'}${model.unlocatedMatches ? ' · ' + products(model.unlocatedMatches) + (model.unlocatedMatches === 1 ? ' ha' : ' hanno') + ' quantità ancora da ubicare' : ''}` : '');
    setMarkup('phMap', renderPlan({bays:model.bays, selectedBay, searching:model.searching, ready}));
    byId('phMap').style.width = (zoom * 100) + '%';
    setText('phZoomValue', Math.round(zoom * 100) + '%');
    renderDetail(ready);
  }
  function scheduleRender() {
    if (frame !== null) return;
    frame = requestAnimationFrame(()=>{frame = null; render();});
  }
  function selectBay(code) {
    if (!model.bays.has(code)) return;
    selectedBay = code; level = 'all';
    render();
    // The contents remain inline, also on narrow screens.
    if (window.matchMedia('(max-width: 1000px)').matches) byId('phBayDetail').scrollIntoView({block:'nearest'});
  }
  root.addEventListener('click', event=>{
    const target = event.target.closest('[data-ph-view], [data-home-bay], [data-ph-product], [data-ph-level], [data-ph-zoom]');
    if (!target || !root.contains(target)) return;
    if (target.dataset.phView) navigate(target.dataset.phView);
    else if (target.dataset.homeBay) selectBay(target.dataset.homeBay);
    else if (target.dataset.phProduct) {
      const snapshot = readSnapshot();
      if (snapshot.allowed && snapshot.loaded) openProduct({sku:target.dataset.phProduct, lot:target.dataset.phLot, code:target.dataset.phCode});
    } else if (target.dataset.phLevel) { level = target.dataset.phLevel; renderDetail(true); }
    else if (target.dataset.phZoom) {
      zoom = target.dataset.phZoom === 'reset' ? 1 : Math.max(1, Math.min(2.5, zoom + (target.dataset.phZoom === 'in' ? 0.25 : -0.25)));
      render();
    }
  });
  root.addEventListener('keydown', event=>{
    if (!['Enter', ' '].includes(event.key)) return;
    const bay = event.target.closest('[data-home-bay]');
    if (bay) { event.preventDefault(); selectBay(bay.dataset.homeBay); }
  });
  byId('phSearch').addEventListener('input', event=>{ query = event.target.value; scheduleRender(); });
  byId('phBaySelect').addEventListener('change', event=>selectBay(event.target.value));
  window.addEventListener('online', scheduleRender);
  window.addEventListener('offline', scheduleRender);
  render();
  return {scheduleRender, activate() { scheduleRender(); refreshPreview(); }};
}
