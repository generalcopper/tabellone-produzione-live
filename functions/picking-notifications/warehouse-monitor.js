'use strict';

// Read-only projection for the personnel monitor. Reuses the same queue rules
// as production notifications; customer, payroll and commercial fields never leave it.
const { createHash } = require('node:crypto');
const c = require('./core');
const w = require('./write-queue');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const seal = value => ({ ...value, sha256: hash(value) });
const dateKey = now => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date(now));
const isClosed = data => /^(completed|complete|arrived|closed|cancelled|canceled|done|received|scaricato|scaricata|consegnato|consegnata|annullato|annullata|chiuso|chiusa|completato|completata)$/i.test(String(data?.status || data?.state || data?.phase || data?.result || ''));
function section(id, rows, totals, now, state = 'ok', issue = '') {
  return seal({ id, state, source: 'tabellone-produzione-liv-e313e', checkedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + 90_000).toISOString(), rows, totals, issue });
}
function writeSection(details, now) {
  return section('write', details.products.map(p => seal({ id: p.id, title: p.title, sku: p.sku,
    qty: p.qty, qtyText: p.qtyText, unit: p.unit, reference: p.orderNo,
    sourcePath: w.QUEUE + '/' + p.id, locations: [] })),
  { rows: details.rowCount, quantities: details.totals }, now);
}
function productCatalog(docs, now = Date.now()) {
  const aliases = new Map(), products = new Map(), racks = [];
  for (const doc of docs) {
    const d = doc.data(), sku = c.skuKey(d.sku || doc.id);
    if (!Array.isArray(d.rackAllocations) || !d.rackAllocations.length) continue;
    const keys = [sku, d.canonicalSku, d.skuGroupCanonical, d.masterSku, d.parentSku, d.aliasOfSku,
      ...['skuAliases','aliasSkus','linkedSkus','unifiedSkus','fbaFbmSkus'].flatMap(k => Array.isArray(d[k]) ? d[k] : [])];
    for (const key of keys) if (c.skuKey(key)) {
      const alias = c.skuKey(key), previous = aliases.get(alias);
      // Ambiguous aliases must not direct staff to a guessed rack.
      aliases.set(alias, aliases.has(alias) && previous !== sku ? null : sku);
    }
    products.set(sku, { title: c.productTitle(d.title || d.name), locations: [...new Set(d.rackAllocations
      .filter(a => c.number(a.qty ?? a.quantity) > 0).map(a => c.clean(a.code || a.location, 30)).filter(Boolean))].sort() });
    for(const a of d.rackAllocations) {
      const code=c.clean(a.code || a.location,30).toUpperCase(), qty=Number(a.qty ?? a.quantity);
      if(code && Number.isFinite(qty) && qty>0) racks.push(seal({code,sku,title:c.productTitle(d.title || d.name || sku),qty:Math.round(qty)}));
    }
  }
  return { aliases, products, checkedAt:new Date(now).toISOString(), racks:racks.sort((a,b)=>a.code.localeCompare(b.code)||a.sku.localeCompare(b.sku)) };
}
function pickingSection(id, docs, catalog, now) {
  const summarize = id === 'fba' ? c.summarizeFba : c.summarizeFbm;
  const orders = new Map(), products = new Map();
  for (const doc of docs) {
    const work = summarize(doc.data, doc.id);
    if (!work) continue;
    const prior = orders.get(work.key);
    if (!prior || work.updatedAt > prior.work.updatedAt) orders.set(work.key, { work, path: doc.path });
  }
  for (const { work, path } of orders.values()) for (const line of work.lines) {
    const sku = catalog.aliases.get(line.sku) || line.sku;
    const p = products.get(sku) || { id: sku, sku, title: catalog.products.get(sku)?.title || line.title || sku,
      qty: 0, unit: 'pz', references: new Set(), sourcePaths: new Set(), orderKeys: new Set(),
      locations: catalog.products.get(sku)?.locations || [] };
    p.qty += line.qty; p.references.add(work.label); p.sourcePaths.add(path); p.orderKeys.add(work.key);
    products.set(sku, p);
  }
  const rows = [...products.values()].sort((a,b) => b.qty - a.qty || a.sku.localeCompare(b.sku)).map(p => seal({
    id: p.id, sku: p.sku, title: p.title, qty: p.qty, unit: p.unit, orderCount: p.orderKeys.size,
    references: [...p.references].sort(), sourcePaths: [...p.sourcePaths].sort(), locations: p.locations, locationsCheckedAt:catalog.checkedAt || null,
  }));
  return section(id, rows, { rows: rows.length, orders: orders.size, units: rows.reduce((sum,p) => sum + p.qty, 0) }, now);
}
function alertSection(documents, now) {
  const rows = [], add = value => rows.push(seal(value));
  const incoming = documents.incoming || {};
  const created = c.millis(incoming.createdAtMs || incoming.createdAtClient || incoming.createdAt || incoming.generatedAtMs || incoming.generatedAt);
  const incomingExpiry = Math.min(created + 86400000, c.millis(incoming.expiresAtMs || incoming.expiresAtClient || incoming.expiresAt) || Infinity);
  if (incoming.active === true && !isClosed(incoming) && created > 0 && created <= now + 30000 && incomingExpiry > now) {
    const details = [incoming.ddtNumber && 'Bolla ' + c.clean(incoming.ddtNumber),
      c.number(incoming.articleCount) && c.number(incoming.articleCount) + ' articoli',
      c.number(incoming.palletCount) && c.number(incoming.palletCount) + ' bancali'].filter(Boolean).join(' · ');
    add({ id: 'incoming', title: 'Carico da Cerea in arrivo', detail: details,
      action: 'Preparare ricezione e spazio di scarico', level: 'warn', expiresAt: new Date(incomingExpiry).toISOString(),
      sourcePath: 'amzInventory/concamarise/kioskAlerts/incomingFromCerea' });
  }
  const ready = documents.ready || {}, readyCreated = c.millis(ready.createdAtMs);
  const readyExpiry = c.millis(ready.expiresAtMs) || (readyCreated ? readyCreated + 1800000 : 0);
  if (ready.active !== false && !isClosed(ready) && readyExpiry > now) add({
    id: 'ready', title: c.clean(ready.sku) + ' pronto a Cerea',
    detail: [c.productTitle(ready.title || ready.name), ready.batchId && 'Lotto ' + c.clean(ready.batchId)].filter(Boolean).join(' · '),
    action: 'Ritirare e trasferire in spedizione', level: 'warn', expiresAt: new Date(readyExpiry).toISOString(),
    sourcePath: 'amzInventory/cerea/kioskAlerts/skuReady' });
  const manual = documents.manual || {};
  if (manual.active === true && c.clean(manual.text)) add({ id: 'manual', title: 'Avviso al personale',
    detail: c.clean(manual.text, 1200), action: '', level: 'warn', expiresAt: null,
    sourcePath: 'amzInventory/concamarise/kioskAlerts/manualAnnouncement' });
  const tomorrow = dateKey(Date.parse(dateKey(now) + 'T12:00:00Z') + 86400000), waste = documents.waste || {};
  if (waste.active !== false && waste.enabled !== false && (waste.dateKey || waste.date) === tomorrow && Array.isArray(waste.types) && waste.types.length) {
    const labels = { 'PLA - LAT': 'plastica e lattine', 'PLA-LAT': 'plastica e lattine', UMIDO: 'umido', CARTA: 'carta e cartone', VETRO: 'vetro', VERDE: 'verde', SECCO: 'secco', PAP: 'PAP' };
    const types = waste.types.map(v => labels[String(v).toUpperCase()] || c.clean(v)).join(' + ');
    add({ id: 'waste', title: 'Raccolta rifiuti · domani', detail: types,
      action: 'Esporre questa sera' + (waste.exposureWindow ? ' · ' + c.clean(waste.exposureWindow) : ''),
      level: 'warn', expiresAt: null, sourcePath: 'amzInventoryProducts/wasteCalendar_concamarise_' + tomorrow });
  }
  return section('alerts', rows, { rows: rows.length }, now);
}

function createWarehouseMonitor({ db, service, clock = Date.now, logger = console }) {
  let cached = null, pending = null, loggedContent = null;
  let catalogCache = null;
  async function catalog() {
    if (catalogCache && clock() - catalogCache.at < 300000) return catalogCache.value;
    const snap = await db.collection('amzInventoryProducts').select('sku','title','name','rackAllocations',
      'canonicalSku','skuGroupCanonical','masterSku','parentSku','aliasOfSku','skuAliases','aliasSkus','linkedSkus','unifiedSkus','fbaFbmSkus').get();
    const value = productCatalog(snap.docs,clock()); catalogCache = { at: clock(), value }; return value;
  }
  async function readPicking(tx, id) {
    if (id === 'fbm') {
      const snap = await tx.get(db.collection('shopifyFbmOrders').where('active', '==', true)
        .select('active','cancelled','canceled','cancelledAt','canceledAt','voided','fulfillmentStatus','fulfillment_status',
          'linesByLineId','orderDetails.lineItems','orderId','orderName','shopifyUpdatedAtClient','updatedAtClient','updatedAt',
          'shopifyCreatedAtClient','createdAtClient','createdAt'));
      return snap.docs.map(doc => ({ id: doc.id, path: doc.ref.path, data: doc.data() }));
    }
    const result = [];
    for (const loc of ['concamarise', 'cerea']) {
      const logs = db.collection('amzInventory/' + loc + '/logs');
      const queries = [logs.where('status','in',['RESERVED','PARTIAL_PICKED','PRENOTATO','IN_ATTESA_PICKING']),
        logs.where('reservation.active','==',true),
        logs.where('picking.managedByPicking','==',true).select('kind','status','voided','cancelled','canceled','picking.flowPicked','picking.status')];
      const snapshots = [];
      for(const query of queries) snapshots.push(await tx.get(query));
      const found = new Map();
      for (const snap of snapshots.slice(0,2)) for (const doc of snap.docs) found.set(doc.id,doc);
      const legacy = snapshots[2].docs.filter(doc => {
        const d = doc.data(), status = String(d.status || d.picking?.status || '').toUpperCase();
        return !found.has(doc.id) && String(d.kind || '').toLowerCase() === 'scarica' && !d.voided && !d.cancelled && !d.canceled &&
          d.picking?.flowPicked !== true && !['PICKED','COMPLETED','CANCELLED','CANCELED','VOIDED'].includes(status);
      });
      for (let i=0; i<legacy.length; i+=100) for (const doc of await tx.getAll(...legacy.slice(i,i+100).map(d=>d.ref))) if(doc.exists) found.set(doc.id,doc);
      for (const doc of found.values()) result.push({ id: loc + ':' + doc.id, path: doc.ref.path, data: doc.data() });
    }
    return result;
  }
  async function guarded(id, fn) {
    try { return await fn(); } catch (error) {
      logger.error('warehouse_source_failed', { source: id, code: String(error.code || 'read_failed') });
      return section(id, [], null, clock(), 'unavailable', 'Lettura della fonte non riuscita');
    }
  }
  async function collect() {
    const tomorrow = dateKey(Date.parse(dateKey(clock())+'T12:00:00Z') + 86400000);
    const paths = { incoming:'amzInventory/concamarise/kioskAlerts/incomingFromCerea', ready:'amzInventory/cerea/kioskAlerts/skuReady',
      manual:'amzInventory/concamarise/kioskAlerts/manualAnnouncement', waste:'amzInventoryProducts/wasteCalendar_concamarise_'+tomorrow };
    const inventory = catalog();
    // Attach a rejection handler immediately; each dependent section reports its own failure.
    void inventory.catch(()=>{});
    const sections = await Promise.all([
      guarded('write', async () => writeSection(await db.runTransaction(async tx => { await tx.get(db.doc(w.ALLOWLIST)); return service.readWriteSummary(tx); }, { readOnly:true }), clock())),
      ...['fbm','fba'].map(id => guarded(id, async () => pickingSection(id,
        await db.runTransaction(tx => readPicking(tx,id), { readOnly:true }), await inventory, clock()))),
      guarded('alerts', async () => {
        const snaps = await db.getAll(...Object.values(paths).map(path => db.doc(path)));
        return alertSection(Object.fromEntries(Object.keys(paths).map((key,i)=>[key,snaps[i].data() || null])),clock());
      }),
    ]);
    let map;
    try {
      const value=await inventory;
      map=seal({state:'ok',source:'amzInventoryProducts/rackAllocations',checkedAt:value.checkedAt,
        expiresAt:new Date(Date.parse(value.checkedAt)+330000).toISOString(),racks:value.racks});
    } catch {
      map=seal({state:'unavailable',source:'amzInventoryProducts/rackAllocations',checkedAt:new Date(clock()).toISOString(),
        expiresAt:new Date(clock()).toISOString(),racks:[]});
    }
    const result=seal({ version:1, generatedAt:new Date(clock()).toISOString(), sections, map });
    const contentHash=hash({sections:sections.map(s=>({id:s.id,state:s.state,rows:s.rows})),map:map.racks});
    if(contentHash!==loggedContent){
      logger.info('warehouse_snapshot', {contentSha256:contentHash, receiptSha256:result.sha256,
        sources:sections.map(s=>({id:s.id,state:s.state,rows:s.rows.length,sha256:s.sha256})),mapState:map.state,racks:map.racks.length});
      loggedContent=contentHash;
    }
    return result;
  }
  return { snapshot:async () => {
    if (cached && clock() - Date.parse(cached.generatedAt) < 20000) return cached;
    if (!pending) pending = collect().then(value => cached=value).finally(()=>{pending=null;});
    return pending;
  } };
}
module.exports = { canonical, hash, seal, section, writeSection, pickingSection, productCatalog, alertSection, createWarehouseMonitor };
