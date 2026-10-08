'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const w = require('./write-queue');
const { renderWriteMessage } = require('./write-mail-template');

test('Write follows cloud order, preserves decimal quantities and keeps units separate', () => {
  const result = w.details([
    { id: 'last', data: { kind: 'finishedProduct', product: 'Liquido', qty: '1.200,5', unit: 'lt', queueOrderKey: 'C' } },
    { id: 'first', data: { kind: 'finishedProduct', product: 'Polvere', qty: '25,5', unit: 'kg', queueOrderKey: 'A' } },
    { id: 'middle', data: { kind: 'finishedProduct', product: 'Confezioni', qty: '30', unit: 'pz', queueOrderKey: 'B' } },
  ]);
  assert.deepEqual(result.products.map(row => row.id), ['first', 'middle', 'last']);
  assert.deepEqual(result.totals, [{ unit: 'kg', qty: 25.5 }, { unit: 'pz', qty: 30 }, { unit: 'lt', qty: 1200.5 }]);
  assert.equal(w.quantity('1.000'), 1000);
  assert.equal(w.quantity('25.5'), 25.5);
});

test('Write skips blank, zero, completed and concluded rows, retaining small manual finished-product quantities', () => {
  const docs = [
    { id: 'blank', data: { queueOrderKey: 'A' } },
    { id: 'zero', data: { product: 'Zero', qty: 0 } },
    { id: 'status', data: { product: 'Done', status: 'COMPLETATO' } },
    { id: 'cancelled', data: { product: 'Cancelled', cancelled: true } },
    { id: 'done', data: { product: 'Already done', qty: 100 } },
    { id: 'concluded', data: { product: 'Concluded', lineKey: 'line-1', qty: 500 } },
    { id: 'manual', data: { kind: 'finishedProduct', code: 'ABC', product: 'Prodotto', qty: 5 } },
  ];
  assert.deepEqual(w.details(docs, new Set(['done']), new Set(['line-1'])).products.map(row => row.id), ['manual']);
});

test('Legacy rows use original creation time and deterministic order/line ties', () => {
  const result = w.details([
    { id: 'b', data: { product: 'B', createdAtOrigMs: 10, createdAtMs: 90, orderNo: '2', orderKey: 'allowed' } },
    { id: 'a', data: { product: 'A', createdAtOrigMs: 10, createdAtMs: 100, orderNo: '1', orderKey: 'allowed' } },
    { id: 'c', data: { product: 'C', createdAtMs: 20 } },
  ], new Set(), new Set(), new Set(['allowed']));
  assert.deepEqual(result.products.map(row => row.id), ['a', 'b', 'c']);
});

test('Write email includes every row in order, flags the addition, escapes input and uses Write colors/link', () => {
  const details = w.details(Array.from({ length: 45 }, (_, index) => ({ id: 'r' + index, data: {
    product: index === 2 ? '<img src=x onerror=alert(1)>' : 'Prodotto ' + index,
    kind: 'finishedProduct', code: 'SKU-' + index, qty: index + 1, unit: 'pz', queueOrderKey: (index + 1).toString(36),
  } })));
  const mail = renderWriteMessage({ details, sourceId: 'r2', recipientName: 'A & B', generatedAt: Date.now(),
    url: w.URL, timeZone: 'Europe/Rome' });
  assert.ok(mail.subject.length <= 100);
  assert.ok(mail.html.includes('#0a84ff') && mail.html.includes('#e9ecf3'));
  assert.ok(mail.html.includes('href="' + w.URL + '"'));
  assert.equal(mail.subject, 'Nuovi prodotti in coda · Linea automatica liquidi');
  assert.ok(mail.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!mail.html.includes('<img'));
  assert.ok(mail.text.includes('45. Prodotto 44'));
  assert.ok(mail.text.indexOf('1. Prodotto 0') < mail.text.indexOf('45. Prodotto 44'));
  assert.ok(mail.text.includes(' | Nuovo'));
  const update = renderWriteMessage({ details, sourceId: 'r2', changeKind: 'quantity', generatedAt: Date.now(), url: w.URL, timeZone: 'Europe/Rome' });
  assert.equal(update.subject, 'Nuovi prodotti in coda · Linea automatica liquidi');
  assert.ok(update.text.includes('Quantità da produrre:'));
  assert.ok(!update.text.includes('Nuovo'));
  assert.ok(!mail.text.includes('evasione FBA'));
});
