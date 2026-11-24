'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderWhatsApp, legacyWhatsApp, MAX_LENGTH } = require('./whatsapp-template');
const empty = { products: [], totalQty: 0, skuCount: 0, orderCount: 0 };
const at = Date.parse('2026-11-24T19:00:00Z');
const product = { title: 'Caolino 25 kg', sku: 'CAO_25', qty: 30, references: [{ label: 'FBA123', qty: 20 }, { label: 'FBA456', qty: 10 }] };
const fba = { products: [product], totalQty: 30, skuCount: 1, orderCount: 2 };
test('FBA includes the trigger, exact product/SKU/quantity and per-shipment allocation without unsupported pickup claims', () => {
  const text = renderWhatsApp({ type: 'fba', label: 'FBA123', details: { fba, fbm: empty }, generatedAt: at });
  for (const value of ['Nuova spedizione: *FBA123*', '*30 pz*', 'SKU: CAO_25', 'Sped. FBA123: 20 pz', 'Sped. FBA456: 10 pz', 'PRIORITÀ', '20:00']) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /https?:|www\.|Apri\b|PROCEDURA|in arrivo|Registrare/i);
});
test('daily recap keeps FBA and FBM totals distinct and includes order references', () => {
  const fbm = { products: [{ title: 'Sapone', sku: 'SAP', qty: 2, references: [{ label: '#150', qty: 2 }] }], totalQty: 2, skuCount: 1, orderCount: 1 };
  const text = renderWhatsApp({ type: 'daily', details: { fba, fbm }, generatedAt: at });
  assert.match(text, /Riepilogo delle 08:00/); assert.match(text, /\*FBA:\* 30 pezzi/); assert.match(text, /\*FBM:\* 1 ordine · 2 pezzi/); assert.match(text, /Ordine #150: 2 pz/);
});
test('Write preserves decimal units and queue order, and identifies the changed quantity as the current amount', () => {
  const rows = [{ id: 'first', title: 'Sapone', sku: 'SAP', qty: 20, unit: 'pz' }, { id: 'changed', title: 'Olio di neem', sku: 'NEEM', qty: 12.5, unit: 'kg' }];
  const text = renderWhatsApp({ type: 'write', channel: 'WRITE', sourceId: 'changed', changeKind: 'quantity', generatedAt: at,
    details: { products: rows, totals: [{ qty: 20, unit: 'pz' }, { qty: 12.5, unit: 'kg' }] } });
  for (const value of ['Quantità aggiornata', 'Quantità da produrre: *12,5 kg*', 'Posizione in coda: *2*', '1. *Sapone*', '2. *Olio di neem*', '20 pz · 12,5 kg']) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /32,5|\+12,5|https?:|Apri\b/i);
});
test('long Write queue remains bounded and preserves the changed last row, position and truthful omitted count', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: 'Prodotto molto lungo '.repeat(8), sku: 'SKU_' + i, qty: i + 1, unit: 'kg' }));
  const text = renderWhatsApp({ type: 'write', sourceId: '99', changeKind: 'quantity', generatedAt: at, details: { products: rows, totals: [{ qty: 5050, unit: 'kg' }] } });
  assert.ok(text.length <= MAX_LENGTH); assert.match(text, /Codice: SKU_99/); assert.match(text, /Posizione in coda: \*100\*/); assert.match(text, /Altre \d+ righe in attesa/); assert.match(text, /5\.050 kg/);
});
test('legacy fallback removes links and navigation instructions but retains production rows', () => {
  const text = legacyWhatsApp({ text: 'LINEA AUTOMATICA LIQUIDI\nDa produrre, in ordine di coda:\n1. Neem — 12,5 kg\nApri la coda di produzione: https://example.test\nhttps://example.test\n2. Caolino — 20 kg' }, 'WRITE');
  assert.match(text, /12,5 kg/); assert.match(text, /20 kg/); assert.doesNotMatch(text, /https?:|example\.test|Apri\b/i);
});
test('empty recap does not invent products, urgency or instructions', () => {
  const text = renderWhatsApp({ type: 'manual', details: { fba: empty, fbm: empty }, generatedAt: at });
  assert.match(text, /Nessun lavoro in attesa/); assert.doesNotMatch(text, /PRIORITÀ|Apri\b|https?:/i);
});
