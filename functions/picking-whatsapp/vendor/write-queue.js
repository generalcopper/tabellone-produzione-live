'use strict';

const c = require('./core');
const QUEUE = 'producedDays/linea_liquidi/queue';
const DONE = 'producedDays/linea_liquidi/items';
const ALLOWLIST = 'hub_config/hub_linea_liquidi_mobile_allowlist';
const URL = 'https://' + c.PROJECT + '.firebaseapp.com/tabellone_write.html';
const MAIL_FROM = 'LG Trading SRL - Linea automatica liquidi <info@generalcoppersrl.com>';
const norm = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const orderKey = value => {
  const key = String(value || '').trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  return key ? key.slice(-16).padStart(16, '0') : '';
};
const incarnation = timestamp => timestamp && Number.isInteger(timestamp.seconds)
  ? timestamp.seconds + ':' + timestamp.nanoseconds : String(c.millis(timestamp));

function quantity(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let raw = String(value ?? '').trim().replace(/\s/g, '');
  if (!raw) return null;
  if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(raw)) raw = raw.replace(/\./g, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function isFinishedProduct(data) {
  return norm(data.source) === 'manual_finished_product' || norm(data.kind) === 'finishedproduct' ||
    norm(data.inventoryTarget) === 'finished_product' || !!(data.finishedProductId || data.finishedProductCode);
}

// Mirror twHideInUi, including its existing Italian-number threshold semantics.
// The collection also holds rows for other production queues: it is NOT the UI queue.
function hiddenInUi(data) {
  if (!data) return true;
  if (isFinishedProduct(data)) return false;
  const desc = data.product || data.label || data.rawLine || '';
  const um = data.um || data.unit || '';
  const description = norm(desc + ' ' + (data.code || '') + ' ' + um);
  if (!description || /\b(tanica|taniche)\b/.test(description) ||
      /\b(?:5|10)(?:[\.,]0)?\s*(kg|kilo|kilogrammi)\b/.test(description) ||
      /\b(?:5|10)(?:[\.,]0)?\s*(l|lt|litri?)\b/.test(description)) return true;
  const raw = String(data.qty ?? '').trim();
  if (!/[0-9]/.test(raw)) return false;
  const parsed = Number(raw.replace(/\./g, '').replace(',', '.').replace(/\s+/g, ''));
  let comparable = Number.isFinite(parsed) ? parsed : 0;
  const unit = norm(raw + ' ' + (data.unit || '') + ' ' + um);
  if (/\b(pz|pezzi|pcs?|piece|pieces)\b/.test(unit) || /\b(kg|kilo|kilogrammi)\b/.test(unit)) {
    // Pieces and kilograms have no scale conversion.
  } else if (/\b(g|gr|grammi)\b/.test(unit)) comparable /= 1000;
  else if (/\b(lt|l|litri?)\b/.test(unit)) { /* litres */ }
  else if (/\b(ml|cc)\b/.test(unit)) comparable /= 1000;
  else if (/\bcl\b/.test(unit)) comparable /= 100;
  return !(comparable > 400);
}

function isAllowed(data, allowedKeys = new Set()) {
  const isOrder = String(data.kind || '').trim() === 'orderLine' ||
    String(data.source || '').trim() === 'vai_in_produzione' || !!(data.orderNo || data.lineKey);
  // Managed order rows always persist orderKey. Missing keys fail closed.
  return !isOrder || allowedKeys.has(String(data.orderKey || '').trim());
}

function summarize(data, id) {
  if (!data || hiddenInUi(data) || data.cancelled || data.canceled || data.voided || data.deleted || data.active === false) return null;
  if (/\b(completato|completata|completed|done|concluso|conclusa|chiuso|chiusa|cancelled|canceled|annullato|annullata)\b/i
    .test(String(data.status || '') + ' ' + String(data.queueLiveAction || ''))) return null;
  const title = c.productTitle(data.product || data.finishedProductName || data.amazonInventoryTitle || data.label || data.rawLine);
  const sku = c.clean(data.code || data.finishedProductCode || data.amazonInventorySku);
  if (!title && !sku) return null;
  const qty = quantity(data.qty);
  if (qty !== null && qty <= 0) return null;
  return { id, title: title || sku, sku, qty,
    qtyText: c.clean(data.qty, 80) || 'Da definire',
    unit: c.clean(data.unit || data.finishedProductUom || data.amazonInventoryUom || data.um, 30),
    orderNo: c.clean(data.orderNo), lineKey: c.clean(data.lineKey, 1500),
    queueOrderKey: orderKey(data.queueOrderKey),
    createdAtMs: c.millis(data.createdAt) || c.millis(data.createdAtMs),
    createdAtOrigMs: c.millis(data.createdAtOrig) || c.millis(data.createdAtOrigMs) || c.millis(data.createdAt) || c.millis(data.createdAtMs) };
}

function quantitySignature(data) {
  if (!data) return '';
  const qty = quantity(data.qty);
  return JSON.stringify([qty === null ? c.clean(data.qty, 80) : qty,
    norm(data.unit || data.finishedProductUom || data.amazonInventoryUom || data.um)]);
}

// Same stable order as twCompareQueueItemsStable in tabellone_write.html.
function compare(a, b) {
  const ak = orderKey(a.queueOrderKey), bk = orderKey(b.queueOrderKey);
  if (ak && bk && ak !== bk) return ak < bk ? -1 : 1;
  const time = (a.createdAtOrigMs || a.createdAtMs || 0) - (b.createdAtOrigMs || b.createdAtMs || 0);
  return time || a.orderNo.localeCompare(b.orderNo, 'it') ||
    (a.lineKey || a.id).localeCompare(b.lineKey || b.id, 'it');
}

function details(docs, doneIds = new Set(), concludedKeys = new Set(), allowedKeys = new Set()) {
  const products = docs.filter(doc => isAllowed(doc.data || {}, allowedKeys))
    .map(doc => summarize(doc.data, doc.id)).filter(row => row &&
    !doneIds.has(row.id) && (!row.lineKey || !concludedKeys.has(row.lineKey))).sort(compare);
  const totals = new Map();
  for (const row of products) if (row.qty !== null) {
    const unit = row.unit || 'unità';
    totals.set(unit, (totals.get(unit) || 0) + row.qty);
  }
  return { products, rowCount: products.length,
    totals: [...totals].map(([unit, qty]) => ({ unit, qty })) };
}

module.exports = { QUEUE, DONE, ALLOWLIST, URL, MAIL_FROM, incarnation, quantity, hiddenInUi,
  isAllowed, summarize, quantitySignature, compare, details };
