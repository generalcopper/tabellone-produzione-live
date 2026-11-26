'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderWhatsApp, renderWhatsAppNotices, legacyWhatsApp, MAX_LENGTH } = require('./whatsapp-template');
const empty = { products: [], totalQty: 0, skuCount: 0, orderCount: 0 };
const product = { title: 'Caolino 25 kg', sku: 'CAO_25', qty: 30, references: [
  { key: 'FBA:first', label: 'FBA123', qty: 20 }, { key: 'FBA:second', label: 'FBA456', qty: 10 }] };
const fba = { products: [product], totalQty: 30, skuCount: 1, orderCount: 2 };
const fbm = { products: [{ title: 'Sapone', sku: 'SAP', qty: 2, references: [{ key: 'FBM:150', label: '#150', qty: 2 }] },
  { title: 'Neem', sku: 'NEEM', qty: 3, references: [{ key: 'FBM:150', label: '#150', qty: 3 }] }], totalQty: 5, skuCount: 2, orderCount: 1 };
const noFiller = text => assert.doesNotMatch(text, /LG Trading|Picking Concamarise|Posizione in coda|Quantità da produrre|Riepilogo delle|https?:|www\.|Apri\b|PROCEDURA/i);

test('FBA has only FBA products and exact shipment allocation, with NUOVO next to the affected product', () => {
  const text = renderWhatsApp({ type: 'fba', sourceId: 'first', label: 'FBA123', details: { fba, fbm } });
  assert.ok(text.startsWith('*FBA da preparare*'));
  assert.ok(text.startsWith('*FBA da preparare*\nTotale: *2 preparazioni · 1 prodotto · 30 pz*\n\n'));
  for (const value of ['*Caolino 25 kg* — *30 pz* · *NUOVO*', 'SKU: CAO_25', 'FBA123: 20 pz · NUOVO', 'FBA456: 10 pz']) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /FBM|Sapone|Neem|#150/); noFiller(text);
});
test('FBM groups products under their own order and never includes FBA products', () => {
  const text = renderWhatsApp({ type: 'daily', channel: 'FBM', details: { fba, fbm } });
  assert.ok(text.startsWith('*Ordini FBM da preparare*'));
  assert.ok(text.startsWith('*Ordini FBM da preparare*\nTotale: *1 ordine · 2 prodotti · 5 pz*\n\n'));
  assert.equal(text.split('*Ordine #150*').length, 2);
  for (const value of ['*Sapone* — *2 pz*', '*Neem* — *3 pz*', 'SKU: SAP', 'SKU: NEEM']) assert.ok(text.includes(value));
  assert.doesNotMatch(text, /FBA|Caolino|NUOVO/); noFiller(text);
});
test('daily/manual summaries become distinct messages for nonempty channels; empty channels stay silent', () => {
  for (const type of ['daily', 'manual']) {
    const notices = renderWhatsAppNotices({ type, details: { fba, fbm } });
    assert.deepEqual(notices.map(n => n.channel), ['FBA', 'FBM']);
    assert.doesNotMatch(notices[0].text, /FBM|Sapone/); assert.doesNotMatch(notices[1].text, /FBA|Caolino/);
    assert.deepEqual(renderWhatsAppNotices({ type, details: { fba: empty, fbm } }).map(n => n.channel), ['FBM']);
    assert.deepEqual(renderWhatsAppNotices({ type, details: { fba: empty, fbm: empty } }), []);
  }
  assert.throws(() => renderWhatsApp({ type: 'manual', details: { fba, fbm } }), /solo modello/);
});
test('Write keeps only ordered production rows, exact decimal quantities and one change marker', () => {
  const rows = [{ id: 'first', title: 'Sapone', sku: 'SAP', qty: 20, unit: 'pz' }, { id: 'changed', title: 'Olio di neem', sku: 'NEEM', qty: 12.5, unit: 'kg' }];
  const text = renderWhatsApp({ type: 'write', sourceId: 'changed', changeKind: 'quantity', details: { products: rows } });
  assert.ok(text.startsWith('*Linea liquidi · Da produrre*'));
  assert.ok(text.startsWith('*Linea liquidi · Da produrre*\nTotale: *2 prodotti · 20 pz · 12,5 kg*\n\n'));
  assert.match(text, /1\. \*Sapone\* — \*20 pz\*/);
  assert.match(text, /2\. \*Olio di neem\* — \*12,5 kg\* · \*QUANTITÀ AGGIORNATA\*/);
  assert.equal(text.split('Olio di neem').length, 2);
  assert.doesNotMatch(text, /32,5|\+12,5|FBA|FBM/); noFiller(text);
});
test('long Write queue retains the affected last row and its true number without repeating it', () => {
  const rows = Array.from({ length: 100 }, (_, i) => ({ id: String(i), title: 'Prodotto molto lungo '.repeat(8), sku: 'SKU_' + i, qty: i + 1, unit: 'kg' }));
  const text = renderWhatsApp({ type: 'write', sourceId: '99', details: { products: rows } });
  assert.ok(text.length <= MAX_LENGTH); assert.match(text, /100\. .*\*100 kg\* · \*NUOVO\*/);
  assert.match(text, /Totale: \*100 prodotti · 5\.050 kg\*/);
  assert.equal(text.split('Codice: SKU_99').length, 2); assert.match(text, /… \d+ voci non riportate/); noFiller(text);
});
test('legacy fallback removes links and navigation instructions but retains production rows', () => {
  const text = legacyWhatsApp({ text: 'LINEA AUTOMATICA LIQUIDI\nDa produrre, in ordine di coda:\n1. Neem — 12,5 kg\nApri la coda di produzione: https://example.test\nhttps://example.test\n2. Caolino — 20 kg' }, 'WRITE');
  assert.match(text, /12,5 kg/); assert.match(text, /20 kg/); assert.doesNotMatch(text, /https?:|example\.test|Apri\b/i);
});
test('commercial prose is shortened after the pack size without losing decimal sizes, SKU or quantities', () => {
  const products = [
    { id: 'a', title: 'Combi Spray 1 lt | Con Olio di Neem e Sapone Molle | Naturale', sku: 'COMBI', qty: 1000, unit: 'pz' },
    { id: 'b', title: 'Concime 2,5 kg, Naturale per piante', sku: 'CONCIME', qty: 12.5, unit: 'kg' },
    { id: 'c', title: 'Rame Zolfo Spray 750 ml – Pronto all’uso', sku: 'RAME', qty: 480, unit: 'pz' },
    { id: 'd', title: 'CUPROZOLFO FLOW -FLACONE 1 KG(Contiene 16% Cu)', sku: 'CUPRO', qty: 700, unit: 'kg' },
  ];
  const text = renderWhatsApp({ type: 'write', sourceId: 'a', details: { products } });
  for (const name of ['*Combi Spray 1 lt*', '*Concime 2,5 kg*', '*Rame Zolfo Spray 750 ml*', '*CUPROZOLFO FLOW -FLACONE 1 KG*']) assert.ok(text.includes(name));
  assert.match(text, /\*1\.000 pz\* · \*NUOVO\*/); assert.match(text, /\*12,5 kg\*/);
  for (const row of products) assert.ok(text.includes('Codice: ' + row.sku));
  assert.doesNotMatch(text, /Con Olio|Naturale|Pronto|Contiene/);
});
test('Write overview deduplicates products and orders, combines equivalent units and keeps unknown quantities explicit', () => {
  const products = [
    { id: 'a', title: 'Spray', sku: 'SPRAY', orderNo: '100', qty: 400, unit: 'nr' },
    { id: 'b', title: 'Spray', sku: 'spray', orderNo: '101', qty: 600, unit: 'PZ.' },
    { id: 'c', title: 'Neem', sku: 'NEEM', orderNo: '100', qty: 12.5, unit: 'kg' },
    { id: 'd', title: 'Sapone', sku: 'SAP', orderNo: '', qty: null, qtyText: 'Da definire', unit: 'kg' },
  ];
  const text = renderWhatsApp({ type: 'write', sourceId: 'b', details: { products } });
  assert.ok(text.startsWith('*Linea liquidi · Da produrre*\nTotale: *2 ordini · 3 prodotti · 1.000 pz · 12,5 kg · 1 quantità da definire*\n\n'));
  assert.match(text, /1\. \*Spray\* — \*400 nr\*/);
  assert.match(text, /2\. \*Spray\* — \*600 PZ\.\* · \*NUOVO\*/);
  assert.doesNotMatch(text, /1\.012,5/);
});
