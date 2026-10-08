'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const w = require('../functions/picking-notifications/write-queue');
const source = fs.readFileSync(path.join(__dirname, '../public/tabellone_write.html'), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, start);
  return source.slice(from, to);
}
const ctx = vm.createContext({ Set, state: {}, __ALLOW_LOADED__: true,
  __ALLOW_KEYS__: new Set(['allowed']), twOrderKeyByOrderNo: () => '' });
vm.runInContext([
  block('function norm(s){', 'function safeText('),
  block('function parseItNumber(raw){', 'function formatKg('),
  block('function twIsManualFinishedProductRow(', 'function twPfMovementDocId('),
  block('const TW_MIN_QTY_VISIBLE =', 'async function twSyncOrdersToWriteQueue('),
].join('\n'), ctx);

test('Email visibility follows the actual deployed Write UI filters, including packaging, thresholds and manual PF', () => {
  for (const product of ['Liquido 1 lt', 'Prodotto 5 L', 'Prodotto 10 kg', 'Tanica', 'Flacone 250 ml'])
    for (const qty of ['30', '400', '401', '400000', '401000', '1.000', '400,5', '400.5', 'Da definire'])
      for (const unit of ['pz', 'kg', 'lt', 'g', 'ml', 'cl'])
        for (const kind of ['amazonSku', 'finishedProduct', 'orderLine', '']) {
          const data = { product, qty, unit, kind, orderKey: 'allowed' };
          assert.equal(w.hiddenInUi(data), ctx.twHideInUi(data), JSON.stringify(data));
          assert.equal(w.isAllowed(data, new Set(['allowed'])), ctx.twAllowInTabWrite(data), JSON.stringify(data));
        }
  assert.equal(w.isAllowed({ kind: 'orderLine', orderKey: 'unassigned' }, new Set(['allowed'])), false);
  assert.equal(w.isAllowed({ kind: 'orderLine' }, new Set(['allowed'])), false);
});

test('Only the three visible production rows enter the message; old stock reorders and unassigned orders stay out', () => {
  const docs = [
    { id: 'combi', data: { product: 'COMBI PRO AF 250 ml', qty: 1000, unit: 'pz' } },
    { id: 'nano', data: { product: 'NANO SPEED COL PLUS 1 lt', kind: 'finishedProduct', qty: 700, unit: 'lt' } },
    { id: 'calmag', data: { product: 'CALCIO E MAGNESIO 250 ml', kind: 'finishedProduct', qty: 1000, unit: 'pz' } },
    { id: 'legacy-small', data: { product: 'Spray 750 ml', kind: 'amazonSku', qty: 120, unit: 'pz' } },
    { id: 'legacy-tank', data: { product: 'Caolino 5 L', kind: 'amazonSku', qty: 480, unit: 'pz' } },
    { id: 'unassigned', data: { product: 'Flacone 1 lt', kind: 'orderLine', orderKey: 'hidden', qty: 1000 } },
    { id: 'completed', data: { product: 'Flacone 1 lt', qty: 1000 } },
  ];
  const result = w.details(docs, new Set(['completed']));
  assert.deepEqual(new Set(result.products.map(row => row.id)), new Set(['combi', 'nano', 'calmag']));
  assert.equal(result.rowCount, 3);
});
