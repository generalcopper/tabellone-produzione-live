const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '../public', file), 'utf8');
const source = read('tabellone_write.html');
function block(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from);
  assert(from >= 0 && to > from, start);
  return text.slice(from, to);
}
const code = [
  block(source, 'function twIsCurrentUserAdmin(){', 'function twActivePageName('),
  block(source, 'function twParseQueueQuantity(', 'function twIsManagedOrderQueueRow('),
  block(source, 'function twQueueDocToItem(', 'async function twScanQueueItemsFromCloud('),
  block(source, 'function twRenderQueue(', 'function twRenderDone(')
].join('\n');
const queuePath = 'producedDays/linea_liquidi/queue/row';
const baseRow = { id: 'row', kind: 'orderLine', product: 'Flacone 1 lt',
  qty: '480', unit: 'pz', queueOrderKey: '0001', lineKey: 'line', orderNo: '42',
  orderKey: 'order', customer: 'Cliente', supplier: '', code: 'FLAC', status: 'DA PRODURRE' };
function fixture({ row = baseRow, admin = true, access = { enabled: true, isAdmin: true }, retry } = {}) {
  const store = new Map([[queuePath, row && structuredClone(row)], ['powderUsers/admin@test.it', access]]);
  const writes = [], alerts = [], toasts = [], dialogs = [], renders = [];
  const state = { user: { uid: 'admin', email: 'admin@test.it', isAdmin: admin }, firebase: { ok: true, db: {} } };
  const snapshot = ref => ({ exists: () => !!store.get(ref), data: () => structuredClone(store.get(ref)) });
  const api = {
    doc: (db, ...parts) => typeof db === 'string' ? [db, ...parts].join('/') : parts.join('/'),
    collection: (db, ...parts) => parts.join('/'), serverTimestamp: () => 'server-timestamp',
    runTransaction: async (db, fn) => {
      for (let attempt = 0; attempt < (retry ? 2 : 1); attempt++) {
        const pending = [];
        await fn({
          get: async ref => { assert.equal(pending.length, 0, 'reads precede writes'); return snapshot(ref); },
          update: (ref, data) => { assert(store.get(ref)); pending.push([ref, data]); },
          set: (ref, data) => pending.push([ref, data])
        });
        if (retry && !attempt) { retry(store); continue; }
        for (const [ref, data] of pending) { store.set(ref, { ...store.get(ref), ...data }); writes.push([ref, data]); }
      }
    },
    writeBatch: () => {
      const pending = [];
      return { set: (ref, data) => pending.push([ref, data]), delete: ref => pending.push([ref, null]),
        commit: async () => { for (const [ref, data] of pending) {
          data ? store.set(ref, { ...store.get(ref), ...data }) : store.delete(ref); writes.push([ref, data]);
        } }
      };
    }
  };
  state.firebase.api = api;
  const ctx = { state, console, Date, Set, Map, TW_LINE_BUCKET: 'linea_liquidi', USERS_COL: 'powderUsers',
    twIsManualAmazonSkuRow: job => job?.kind === 'amazonSku',
    twIsManualFinishedProductRow: job => job?.kind === 'finishedProduct',
    twDetectUnitToken: (_, unit) => unit === 'pz' ? 'pz' : unit,
    twQueueItemHasCompletedStatus: job => job?.status === 'COMPLETATO',
    twBatchTouchQueueLive: (tx, action, ids) => tx.set('meta/queueState', { action, ids }),
    twHideInUi: () => false, twSetCloud: () => {},
    showToast: (...args) => toasts.push(args), alert: text => alerts.push(text),
    prompt: (...args) => { dialogs.push(['prompt', ...args]); return '600'; },
    confirm: text => { dialogs.push(['confirm', text]); return true; },
    twNormalizeOrderKey: x => x, twListRenderSignature: () => 'changed',
    twCompactProductName: x => x, twFmtWhen: () => '', twBindQueueReorder: () => {},
    escapeHtml: x => String(x).replace(/</g, '&lt;').replace(/"/g, '&quot;')
  };
  const node = () => ({ children: [], dataset: {}, classList: { add() {} }, setAttribute() {},
    appendChild(child) { this.children.push(child); },
    replaceChildren(frag) { this.children = frag.children; renders.push(frag.children); } });
  const out = node();
  ctx.$ = () => out;
  ctx.document = { createDocumentFragment: node, createElement: node };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  return { ctx, store, writes, alerts, toasts, dialogs, out, get: () => store.get(queuePath) };
}

test('only admins receive clickable quantity cells for manual and order rows', () => {
  for (const admin of [false, true]) {
    const f = fixture({ admin });
    f.ctx.twRenderQueue([baseRow, { ...baseRow, id: 'manual', kind: '', orderNo: '', lineKey: '' }]);
    for (const row of f.out.children.slice(1)) {
      assert.equal(row.innerHTML.includes('data-tw-act="edit_qty"'), admin);
      assert.match(row.innerHTML, /480 pz/);
    }
  }
});

test('native popup sequence requires confirmation and only changes the queue quantity', async () => {
  const f = fixture();
  await f.ctx.twEditQueueQuantity({ ...baseRow });
  assert.deepEqual(f.dialogs.map(x => x[0]), ['prompt', 'confirm']);
  assert.match(f.dialogs[1][1], /Da 480 pz a 600 pz/);
  assert.equal(f.get().qty, '600'); assert.equal(f.get().qtyEditedByAdmin, true);
  assert.equal(f.get().qtyPrevious, '480'); assert.equal(f.get().qtyEditedByUid, 'admin');
  assert.equal(f.get().queueOrderKey, baseRow.queueOrderKey);
  assert.equal(f.get().status, 'DA PRODURRE');
  assert.deepEqual(f.writes.map(x => x[0]), [queuePath, 'meta/queueState']);
  const loaded = f.ctx.twQueueDocToItem({ id: 'row', data: () => f.get() });
  assert.equal(loaded.qty, '600'); assert.equal(loaded.qtyEditedByAdmin, true);
  assert(loaded.qtyEditedAtMs > 0); assert.equal(f.alerts.length, 0);
});

test('canceling either dialog, or leaving the quantity unchanged, writes nothing', async () => {
  for (const choice of ['prompt', 'confirm', 'unchanged']) {
    const f = fixture();
    if (choice === 'prompt') f.ctx.prompt = () => null;
    if (choice === 'confirm') f.ctx.confirm = () => false;
    if (choice === 'unchanged') f.ctx.prompt = () => '480';
    await f.ctx.twEditQueueQuantity({ ...baseRow });
    assert.equal(f.writes.length, 0); assert.equal(f.get().qty, '480');
  }
});

test('operators and revoked/disabled admins cannot use the save action', async () => {
  const f = fixture({ admin: false });
  await f.ctx.twEditQueueQuantity(baseRow);
  assert.equal(f.dialogs.length, 0);
  await assert.rejects(f.ctx.twSaveQueueQuantity(baseRow, '600'), /Solo gli amministratori/);
  for (const access of [null, { isAdmin: false }, { isAdmin: true, enabled: false }]) {
    const g = fixture({ access });
    await assert.rejects(g.ctx.twSaveQueueQuantity(baseRow, '600'), /Solo gli amministratori/);
    assert.equal(g.writes.length, 0);
  }
});

test('invalid quantities are rejected; kg/l accept decimals and pieces require integers', async () => {
  for (const value of ['', '0', '-2', 'text', '1e3', 'Infinity', '2,5', '1.000,5', '9007199254740992']) {
    const f = fixture();
    await assert.rejects(f.ctx.twSaveQueueQuantity(baseRow, value));
    assert.equal(f.writes.length, 0);
  }
  const row = { ...baseRow, unit: 'kg' }, f = fixture({ row });
  await f.ctx.twSaveQueueQuantity(row, '650,125');
  assert.equal(f.get().qty, '650.125');
});

test('stale, completed or removed rows are never overwritten or recreated', async () => {
  for (const row of [null, { ...baseRow, qty: '700' }, { ...baseRow, qtyEditedAtMs: 1 }, { ...baseRow, status: 'COMPLETATO' }]) {
    const f = fixture({ row });
    await assert.rejects(f.ctx.twSaveQueueQuantity(baseRow, '600'));
    assert.equal(f.writes.length, 0);
  }
  const f = fixture({ retry: store => store.delete(queuePath) });
  await assert.rejects(f.ctx.twSaveQueueQuantity(baseRow, '600'), /rimossa o completata/);
  assert.equal(f.writes.length, 0); assert.equal(f.get(), undefined);
});

for (const file of ['tabellone_write.html', 'hub_linea_liquidi.html', 'hub_ordini_agenti.html']) {
  test(`${file}: order synchronization preserves admin edits, including stale snapshots`, async () => {
    const text = read(file);
    for (const edited of [false, true]) {
      const live = { ...baseRow, qty: edited ? '650' : '480', qtyEditedByAdmin: edited };
      const f = fixture({ row: live });
      const tw = { queueItems: [{ ...baseRow }], doneItems: [], localDoneIds: new Set(), _doneReady: true };
      Object.assign(f.ctx, { ensureTabWriteState: () => tw,
        __ALLOW_LOADED__: true, __ALLOW_KEYS__: new Set(['order']),
        getOrderKey: () => 'order', twBuildConcludedLineKeySet: () => new Set(),
        twBuildProducedLineKeyQtyMap: () => new Map(), twOrderLineQueueId: () => 'row',
        twInferSupplier: () => '', twGetTailOrderBig: () => 1n,
        twReserveQueueOrderKeys: async () => [], nowIso: () => 'now'
      });
      f.ctx.state.powderOrders = [{ orderNo: '42', customer: 'Cliente', lines: [
        { lineKey: 'line', qty: 900, um: 'pz', desc: 'Flacone aggiornato', code: 'FLAC' }
      ] }];
      vm.runInContext(block(text, 'async function twSyncOrdersToWriteQueue(){', 'function twLegacyHistoryDocIdForDoneId('), f.ctx);
      await f.ctx.twSyncOrdersToWriteQueue();
      assert.equal(f.get().qty, edited ? '650' : '900');
      assert.equal(f.get().product, 'Flacone aggiornato');
      assert.equal(f.get().queueOrderKey, '0001');
      tw.queueItems = [{ ...f.get() }];
      f.writes.length = 0;
      await f.ctx.twSyncOrdersToWriteQueue();
      assert.equal(f.writes.length, 0, 'no repeated sync writes');
    }
  });
}
