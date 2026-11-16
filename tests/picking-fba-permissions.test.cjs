const { test, before } = require('node:test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw Error('A local FIRESTORE_EMULATOR_HOST is required.');
const project = 'demo-picking-permissions', base = 'http://' + host;
const documents = 'projects/' + project + '/databases/(default)/documents';
const source = fs.readFileSync(path.join(__dirname, '../public/picking.js'), 'utf8');
const rulesFile = process.env.PICKING_RULES_FILE || path.join(__dirname, '../security/firestore.rules');
const baseline = process.env.PICKING_EXPECT_LEGACY_DENIAL === '1', options = { skip: baseline };
function jwt(uid, email) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: uid, user_id: uid, aud: project, iss: 'https://securetoken.google.com/' + project,
    iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: 'password' },
    ...(email ? { email, email_verified: true } : {}) };
  return Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' +
    Buffer.from(JSON.stringify(payload)).toString('base64url') + '.';
}
const operator = jwt('operator', 'operator@example.test'), owner = 'owner';
function encode(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: fields(v) } };
}
function fields(v) { return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])); }
function decode(v) {
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
  if ('integerValue' in v || 'doubleValue' in v) return Number(v.integerValue ?? v.doubleValue);
  return Object.values(v)[0];
}
async function request(url, token, method = 'GET', body) {
  const r = await fetch(base + url, { method, signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = Error(data.error?.message || JSON.stringify(data)); e.status = r.status; throw e; }
  return data;
}
function fieldPath(parts) {
  const quote = String.fromCharCode(96);
  return parts.map(x => /^[A-Za-z_][A-Za-z_0-9]*$/.test(x) ? x :
    quote + x.replace(/\\/g, '\\\\').replaceAll(quote, '\\' + quote) + quote).join('.');
}
function write(p, data, merge = true) {
  const masks = [], transforms = [];
  function walk(v, parts) {
    if (v && v.__serverTimestamp) { transforms.push({ fieldPath: fieldPath(parts), setToServerValue: 'REQUEST_TIME' }); return undefined; }
    if (v && v.__arrayUnion) { transforms.push({ fieldPath: fieldPath(parts), appendMissingElements: { values: v.__arrayUnion.map(encode) } }); return undefined; }
    if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, [...parts, k])]).filter(([, x]) => x !== undefined));
    }
    masks.push(fieldPath(parts)); return v;
  }
  const clean = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, walk(v, [k])]).filter(([, v]) => v !== undefined));
  return { update: { name: documents + '/' + p, fields: fields(clean) },
    ...(merge ? { updateMask: { fieldPaths: masks } } : {}), ...(transforms.length ? { updateTransforms: transforms } : {}) };
}
const commit = (token, writes, transaction) => request('/v1/' + documents + ':commit', token, 'POST',
  { writes, ...(transaction ? { transaction } : {}) });
async function read(p, token = owner, transaction) {
  const response = transaction ? await request('/v1/' + documents + ':batchGet', token, 'POST', { documents: [documents + '/' + p], transaction }) : null;
  const data = response ? (Array.isArray(response) ? response[0] : response).found : await request('/v1/' + documents + '/' + p, token);
  return { id: p.split('/').pop(), exists: () => true, data: () => decode({ mapValue: { fields: data.fields } }) };
}
const loc = 'concamarise', flowPath = (id, warehouse = loc) => 'amzInventory/' + warehouse + '/logs/' + id;
const stockPath = (sku, warehouse = loc) => 'amzInventory/' + warehouse + '/items/' + sku;
function flow(id, count = 2) {
  return { kind: 'scarica', location: loc, status: 'RESERVED', fileName: 'Invia ad Amazon _ Amazon Seller Central.pdf', workflowId: id,
    lines: Array.from({ length: count }, (_, i) => ({ sku: 'SKU-' + i, qty: 5, title: 'Test product ' + i })),
    reservation: { active: true, status: 'in_attesa_picking', totalPieces: count * 5, reservedBy: 'admin@example.test' },
    picking: { status: 'da_prelevare', managedByPicking: true, pickedLines: {}, flowPicked: false } };
}
async function seed(id, patch = {}, count = 2, warehouse = loc) {
  const d = { ...flow(id, count), ...patch };
  await commit(owner, [write(flowPath(id, warehouse), d, false),
    ...d.lines.map(line => write(stockPath(line.sku, warehouse), { sku: line.sku, qty: 30, reservedQty: 5, pendingPickQty: 5,
      rackAllocations: [{ code: 'A01-L1-P1', qty: 30 }] }, false))]);
}
function context(token = operator, who = 'operator@example.test') {
  const api = { doc: (_, ...parts) => parts.join('/'), serverTimestamp: () => ({ __serverTimestamp: true }),
    arrayUnion: (...values) => ({ __arrayUnion: values }),
    runTransaction: async (_, fn) => {
      const { transaction } = await request('/v1/' + documents + ':beginTransaction', token, 'POST', { options: { readWrite: {} } });
      const writes = [];
      try {
        const result = await fn({ get: p => read(p, token, transaction), set: (p, d, opts) => writes.push(write(p, d, opts?.merge === true)) });
        await commit(token, writes, transaction); return result;
      } catch (e) {
        await request('/v1/' + documents + ':rollback', token, 'POST', { transaction }).catch(() => {}); throw e;
      }
    } };
  const ctx = { state: { firebase: { api, db: {} }, user: { uid: 'operator', email: who, isAdmin: false, isWhitelisted: true } },
    COL_ROOT: 'amzInventory', SUB_LOGS: 'logs', SUB_ITEMS: 'items',
    toSkuId: x => String(x || '').trim(), parseQty: Number, normalizeFlowLogDoc: snap => ({ id: snap.id, ...snap.data() }),
    isShopifyFbmFlow: f => f.source === 'shopify_fbm' || f.picking?.shopifyControlled === true,
    isPickingManagedFlow: f => f.picking?.managedByPicking === true || f.reservation?.active === true,
    pickingUniqueLines: f => f.lines, pickingLineMap: f => f.picking?.pickedLines || {},
    pickingSkuKey: x => x, getInvIndexForMatch: () => ({}), stockSkuForSkuAny: x => x,
    isPickingLinePicked: (f, sku) => f.picking?.pickedLines?.[sku]?.picked === true,
    pickingLineTitle: line => line.title, pickingPositionTextFromCloudItem: () => 'A01-L1-P1', flowDisplayName: f => f.workflowId,
    // Inventory arithmetic has its own regression tests. These representative writes
    // exercise the same protected paths in the actual application's transaction.
    addPickingStockTransactionWrite: (tx, sdk, db, warehouse, f, line, direction, opts) => {
      const beforeQty = opts.itemData.qty, afterQty = beforeQty - line.qty;
      tx.set(stockPath(line.sku, warehouse), { qty: afterQty, reservedQty: 0, pendingPickQty: 0,
        lastPickingFlowId: f.id, lastPickingBy: opts.who, updatedAt: sdk.serverTimestamp() }, { merge: true });
      tx.set('amzInventoryProducts/' + line.sku + '/movements/' + f.id, { type: 'prelievo_picking', qtySigned: -line.qty,
        flowId: f.id, createdBy: opts.who, createdAt: sdk.serverTimestamp() });
      return { sku: line.sku, requestedSku: line.sku, stockSku: line.sku, qty: line.qty, title: line.title,
        beforeQty, afterQty, afterReserved: 0, afterPending: 0, consumedAllocations: [{ code: 'A01-L1-P1', qty: line.qty }],
        nextAllocations: [{ code: 'A01-L1-P1', qty: afterQty }], cleanLocations: ['A01-L1-P1'] };
    } };
  vm.createContext(ctx);
  const start = source.indexOf('async function commitPickingCloudTransaction('), end = source.indexOf('function isForcePickingAvailableError(', start);
  assert.ok(start >= 0 && end > start); vm.runInContext(source.slice(start, end), ctx); return ctx;
}
function completion(who = 'operator@example.test') {
  return { status: 'PICKED', reservation: { active: false, status: 'prelevato', updatedBy: who },
    picking: { managedByPicking: true, status: 'prelevato', flowPicked: true, updatedBy: who, flowPickedBy: who } };
}
const denied = promise => assert.rejects(promise, e => e.status === 403);
before(async () => {
  await request('/emulator/v1/projects/' + project + '/databases/(default)/documents', owner, 'DELETE');
  await request('/emulator/v1/projects/' + project + ':securityRules', owner, 'PUT', {
    rules: { files: [{ name: 'firestore.rules', content: fs.readFileSync(rulesFile, 'utf8') }] } });
  await commit(owner, [
    write('powderUsers/operator', { enabled: true, isAdmin: false }, false),
    write('powderUsers/admin', { enabled: true, isAdmin: true }, false),
    write('powderUsers/disabled', { enabled: false, isAdmin: false }, false),
    write('powderUsers/email-member@example.test', { enabled: true, isAdmin: false }, false),
    write('amzInventoryDirectory/directory-uid', { enabled: true, isAdmin: false }, false),
    write('amzInventoryDirectory/directory@example.test', { enabled: true, isAdmin: false }, false) ]);
});
test('legacy rules reproduce the non-admin failure atomically', { skip: !baseline }, async () => {
  await seed('baseline'); await denied(context().commitPickingCloudTransaction(loc, 'baseline'));
  assert.equal((await read(flowPath('baseline'))).data().status, 'RESERVED');
  assert.equal((await read(stockPath('SKU-0'))).data().qty, 30);
});
test('non-admin completes 13 FBA lines, records the operator and commits stock/movements', options, async () => {
  await seed('full', {}, 13);
  const result = await context().commitPickingCloudTransaction(loc, 'full');
  assert.equal(result.skuCount, 13); assert.equal(result.pieces, 65); assert.equal(result.allPicked, true);
  const d = (await read(flowPath('full'))).data();
  assert.equal(d.status, 'PICKED'); assert.equal(d.reservation.active, false);
  assert.equal(d.picking.flowPickedBy, 'operator@example.test'); assert.equal(d.lines.length, 13);
  assert.equal(d.reservation.reservedBy, 'admin@example.test'); assert.equal(Object.keys(d.picking.pickedLines).length, 13);
  assert.equal((await read(stockPath('SKU-12'))).data().qty, 25);
  assert.equal((await read('amzInventoryProducts/SKU-12/movements/full')).data().qtySigned, -5);
});
test('partial picking and completion deduct every SKU once; retries are rejected', options, async () => {
  await seed('partial'); const ctx = context();
  assert.equal((await ctx.commitPickingCloudTransaction(loc, 'partial', { mode: 'sku', sku: 'SKU-0' })).allPicked, false);
  assert.equal((await read(flowPath('partial'))).data().status, 'PARTIAL_PICKED');
  await ctx.commitPickingCloudTransaction(loc, 'partial');
  assert.equal((await read(stockPath('SKU-0'))).data().qty, 25); assert.equal((await read(stockPath('SKU-1'))).data().qty, 25);
  await assert.rejects(ctx.commitPickingCloudTransaction(loc, 'partial'), /già prelevato/);
  assert.equal((await read(stockPath('SKU-0'))).data().qty, 25);
});
test('bulk metadata and Cerea completion work for an operator', options, async () => {
  await seed('bulk-a', {}, 2, 'cerea'); await seed('bulk-b', {}, 2, 'cerea');
  for (const id of ['bulk-a', 'bulk-b']) {
    await context().commitPickingCloudTransaction('cerea', id, { bulkId: 'test-bulk' });
    assert.equal((await read(flowPath(id, 'cerea'))).data().picking.bulkPickId, 'test-bulk');
  }
});
for (const [uid, email] of [['email-member-uid', 'email-member@example.test'], ['directory-uid', 'uid@example.test'],
  ['directory-email-uid', 'directory@example.test'], ['admin', 'admin@example.test'], ['operator', null]]) {
  test('existing membership can complete: ' + uid + '/' + (email || 'UID only'), options, async () => {
    const id = 'member-' + uid; await seed(id);
    await context(jwt(uid, email), email || uid).commitPickingCloudTransaction(loc, id);
    assert.equal((await read(flowPath(id))).data().status, 'PICKED');
  });
}
for (const [name, token] of [['anonymous', null], ['unknown account', jwt('unknown', 'unknown@example.test')],
  ['disabled operator', jwt('disabled', 'disabled@example.test')]]) {
  test(name + ' cannot complete or change stock atomically', options, async () => {
    const id = name.replaceAll(' ', '-'); await seed(id);
    await denied(commit(token, [write(stockPath('SKU-0'), { qty: 25 }), write(flowPath(id), completion())]));
    assert.equal((await read(flowPath(id))).data().status, 'RESERVED'); assert.equal((await read(stockPath('SKU-0'))).data().qty, 30);
  });
}
for (const [name, patch] of [['cancelled', { cancelled: true }], ['voided', { voided: true }],
  ['already completed', { status: 'PICKED' }], ['archived', { status: 'ARCHIVED' }], ['load order', { kind: 'carica' }],
  ['unmanaged legacy order', { status: 'APPLIED', reservation: {}, picking: {} }], ['Shopify order', { source: 'shopify_fbm' }],
  ['Shopify controlled order', { picking: { managedByPicking: true, shopifyControlled: true } }]]) {
  test('operator cannot complete ' + name, options, async () => {
    const id = name.replaceAll(' ', '-'); await seed(id, patch);
    await denied(commit(operator, [write(flowPath(id), completion())]));
  });
}
for (const [name, change] of [
  ['change order lines', p => { p.lines = [{ sku: 'OTHER', qty: 999 }]; }],
  ['change document identity', p => { p.fileName = 'replaced.pdf'; }],
  ['change workflow', p => { p.workflowId = 'OTHER'; }],
  ['cancel order', p => { p.voided = true; }],
  ['change reserved quantity', p => { p.reservation.totalPieces = 999; }],
  ['change picking control', p => { p.picking.shopifyControlled = true; }],
  ['impersonate admin', p => { p.picking.updatedBy = p.reservation.updatedBy = p.picking.flowPickedBy = 'admin@example.test'; }],
  ['inconsistent completion state', p => { p.picking.flowPicked = false; }],
  ['reopen reservation', p => { p.reservation.active = true; }],
  ['undo completion', p => { p.status = 'RESERVED'; p.picking.flowPicked = false; }],
]) {
  test('operator cannot ' + name, options, async () => {
    const id = name.replaceAll(' ', '-'); await seed(id); const p = completion(); change(p);
    await denied(commit(operator, [write(flowPath(id), p)]));
  });
}
test('deletion and edits to existing movements stay admin-only', options, async () => {
  await seed('protected'); await commit(owner, [write('amzInventoryProducts/SKU-0/movements/protected', { qtySigned: -5 }, false)]);
  await denied(commit(operator, [{ delete: documents + '/' + flowPath('protected') }]));
  await denied(commit(operator, [write('amzInventoryProducts/SKU-0/movements/protected', { qtySigned: -500 })]));
  const admin = jwt('admin', 'admin@example.test');
  await commit(admin, [write(flowPath('protected'), { fileName: 'admin-edit.pdf' })]);
  await commit(admin, [{ delete: documents + '/' + flowPath('protected') }]);
});
