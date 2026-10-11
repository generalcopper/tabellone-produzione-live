const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.resolve(__dirname, '../public/hub_app.js'), 'utf8');
const html = fs.readFileSync(path.resolve(__dirname, '../public/hub_inventario.html'), 'utf8');
const helpers = source.split('/* START inventory startup helpers */')[1].split('/* END inventory startup helpers */')[0];
const authCode = source.slice(source.indexOf('    // Startup and synchronization are separate:'), source.indexOf('    function stopRealtime() {'));
const user = { uid: 'test-member', email: 'member@example.test', displayName: 'Test member' };
const pending = () => new Promise(() => {});
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
function clock() {
  let now = 0, next = 0; const timers = new Map();
  return {
    setTimeout(fn, ms) { const id = ++next; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimeout(id) { timers.delete(id); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        now = due[1].at; timers.delete(due[0]); due[1].fn(); await flush();
      }
      now = end; await flush();
    }
  };
}
function environment(extra = {}) {
  const time = clock(), listeners = {}, events = [];
  const window = {
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    dispatchEvent(event) { events.push(event); for (const fn of listeners[event.type] || []) fn(event); }
  };
  const context = vm.createContext({ window, console: { warn() {}, error() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    Event: class { constructor(type) { this.type = type; } },
    setTimeout: time.setTimeout, clearTimeout: time.clearTimeout, ...extra });
  vm.runInContext(helpers, context);
  return { context, time, window, events };
}

test('subscriptions wait for login even beyond the old 20-second bootstrap window', async () => {
  const e = environment(), calls = [], values = [];
  const streams = e.context.createInventoryStreams((ref, opts, next, error) => { calls.push({ ref, next, error }); return () => {}; });
  const remove = streams.subscribe('movements', value => values.push(value));
  await e.time.advance(30000); assert.equal(calls.length, 0);
  streams.setSession('a'); streams.setSession('a'); assert.equal(calls.length, 1);
  calls[0].next('first'); assert.deepEqual(values, ['first']);
  remove(); streams.setSession('b'); assert.equal(calls.length, 1);
});

test('logout and account changes invalidate queued callbacks from old listeners', () => {
  const e = environment(), calls = [], values = []; let stopped = 0;
  const streams = e.context.createInventoryStreams((ref, opts, next, error) => { calls.push({ next, error }); return () => stopped++; });
  streams.subscribe('stock', value => values.push(value)); streams.setSession('a');
  streams.setSession(''); calls[0].next('stale'); assert.deepEqual(values, []);
  streams.setSession('b'); calls[0].next('old account'); calls[1].next('new account');
  assert.deepEqual(values, ['new account']); assert.equal(stopped, 1);
});

test('terminal listeners get bounded retries and explicit retry can recover without duplicates', async () => {
  const e = environment(), calls = []; let stopped = 0;
  const streams = e.context.createInventoryStreams((ref, opts, next, error) => { calls.push({ next, error }); return () => stopped++; });
  streams.subscribe('stock', () => {}); streams.setSession('a');
  calls[0].error({ code: 'unavailable' }); await e.time.advance(1500);
  calls[1].error({ code: 'unavailable' }); await e.time.advance(4000);
  calls[2].error({ code: 'unavailable' }); await e.time.advance(60000);
  assert.equal(calls.length, 3); assert.equal(streams.hasErrors(), true);
  streams.retry(); assert.equal(calls.length, 4); calls[3].next({});
  streams.retry(); assert.equal(calls.length, 4); assert.equal(streams.hasErrors(), false);
  assert.equal(stopped, 3);
});

test('logout cancels scheduled listener recovery', async () => {
  const e = environment(), calls = [];
  const streams = e.context.createInventoryStreams((ref, opts, next, error) => { calls.push({ next, error }); return () => {}; });
  streams.subscribe('stock', () => {}); streams.setSession('a'); calls[0].error({});
  streams.setSession(''); await e.time.advance(60000); assert.equal(calls.length, 1);
});

test('bursts redraw stock and registry once using the latest data', async () => {
  const e = environment(); let value = 0, all = [], registry = [];
  const queue = e.context.createInventoryRenderQueue(() => all.push(value), () => registry.push(value));
  for (let i = 1; i <= 9; i++) { value = i; queue({ all: true, anag: i % 2 === 0 }); }
  assert.equal(all.length, 0); await e.time.advance(40);
  assert.deepEqual(all, [9]); assert.deepEqual(registry, [9]);
});

function authHarness(options = {}) {
  const calls = { popup: 0, redirect: 0, reload: 0, observers: 0, native: [], drawn: 0 };
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { style: {}, listeners: {}, disabled: false,
      addEventListener(name, fn) { this.listeners[name] = fn; } });
    return elements.get(id);
  };
  let observe;
  const auth = { currentUser: options.user || null }, fb = { user: null, ready: false };
  const e = environment({
    document: { getElementById: $ }, navigator: { onLine: true }, location: { reload: () => calls.reload++ },
    fb, FIREBASE_CONFIG: {}, initializeApp: () => ({}), initializeFirestore: () => ({}), getStorage: () => ({}),
    initializeAuth: (app, deps) => { calls.persistence = deps.persistence; return auth; },
    indexedDBLocalPersistence: 'indexedDB', browserLocalPersistence: 'local', browserSessionPersistence: 'session', browserPopupRedirectResolver: 'resolver',
    GoogleAuthProvider: class { setCustomParameters() {} },
    onAuthStateChanged: (auth, callback) => { calls.observers++; observe = callback; if (!options.authHang) queueMicrotask(() => callback(auth.currentUser)); },
    getRedirectResult: pending,
    signInWithPopup: () => { calls.popup++; return Promise.reject({ code: options.popupError || 'auth/popup-closed-by-user' }); },
    signInWithRedirect: () => { calls.redirect++; return Promise.resolve(); },
    signOut: async () => { auth.currentUser = null; await observe(null); },
    isFirebaseConfigured: () => true, syncHubBridge() {}, setSyncPill() {}, openModal() {}, loadLocalData() {},
    __hubinvHideGate() {}, __hubinvShowGate() {}, __hubinvIsAdminRequired: () => !!options.adminRequired,
    __hubinvResolveIsAdmin: options.admin || (() => Promise.resolve(true)),
    renderAll: () => calls.drawn++, renderAnag() {},
    onSnapshot: (ref, opts, next, error) => { const r = { ref, opts, next, error, stopped: false }; calls.native.push(r); return () => r.stopped = true; }
  });
  e.window.localStorage = e.window.sessionStorage = { getItem() { if (options.storageBlocked) throw new Error('Blocked'); return null; } };
  const status = {};
  e.window.HubInventoryStartup = { set(phase, message) { Object.assign(status, { phase, message }); }, onRetry(fn) { status.retry = fn; } };
  vm.runInContext(`const inventoryStreams = createInventoryStreams(onSnapshot, () => window.dispatchEvent(new Event('HubInventorySync')));
    ${authCode}
    let testSubs=[];
    function stopRealtime(){ testSubs.forEach(fn=>fn()); testSubs=[]; clearTimeout(inventoryDataTimer); inventoryDataState.clear(); inventoryDataStarted=false; }
    function startRealtime(){ stopRealtime(); armInventoryDataTimeout();
      for(const key of ['products','movements']) testSubs.push(watchInventoryCollection(key,key,()=>scheduleInventoryRender({all:true}),()=>{}));
      inventoryDataStarted=true;
    }
    initFirebase();`, e.context);
  return { ...e, $, auth, fb, calls, status, emit: async value => { auth.currentUser = value; await observe(value); await flush(); } };
}
function snapshot(fromCache = false, changes = [1]) {
  return { metadata: { fromCache }, docChanges: () => changes, docs: [] };
}

test('redirect completion cannot hide login; popup starts immediately without persistence migration', async () => {
  const h = authHarness(); await flush();
  assert.equal(h.status.phase, 'signed_out'); assert.equal(h.calls.observers, 1);
  const login = h.$('btnLoginGoogle').listeners.click(); assert.equal(h.calls.popup, 1); await login;
  assert.equal(h.calls.redirect, 0); assert.equal(h.$('btnLoginGoogle').disabled, false);
});

test('blocked browser storage retains IndexedDB fallback and popup-blocked does not attempt unusable redirect', async () => {
  const h = authHarness({ storageBlocked: true, popupError: 'auth/popup-blocked' }); await flush();
  assert.deepEqual([...h.calls.persistence], ['indexedDB']); assert.equal(h.status.phase, 'signed_out');
  await h.$('btnLoginGoogle').listeners.click(); assert.equal(h.calls.redirect, 0);
});

test('auth timeout exposes recovery; a late restored session can still recover', async () => {
  const h = authHarness({ authHang: true }); await h.time.advance(12000);
  assert.equal(h.status.phase, 'error'); h.status.retry(); assert.equal(h.calls.reload, 1);
  await h.emit(user); assert.equal(h.fb.sessionPhase, 'signed_in'); assert.equal(h.calls.native.length, 2);
  await h.emit(user); assert.equal(h.calls.native.length, 2);
});

test('slow permissions expire without granting access, and stale success after logout is ignored', async () => {
  let resolve;
  const h = authHarness({ user, adminRequired: true, admin: () => new Promise(r => resolve = r) }); await flush();
  await h.time.advance(7000); assert.equal(h.status.phase, 'error'); assert.equal(h.calls.native.length, 0);
  await h.emit(null); resolve(true); await flush();
  assert.equal(h.status.phase, 'signed_out'); assert.equal(h.calls.native.length, 0);
});

test('server data, cached data and failed streams produce distinct visible sync states', async () => {
  const h = authHarness({ user }); await flush(); assert.equal(h.status.phase, 'loading');
  h.calls.native.forEach(r => r.next(snapshot(true))); assert.equal(h.status.phase, 'loading');
  await h.time.advance(12000); assert.equal(h.status.phase, 'error');
  const prior = h.calls.drawn;
  h.calls.native.forEach(r => r.next(snapshot(false, []))); assert.equal(h.status.phase, 'ready');
  await h.time.advance(50); assert.equal(h.calls.drawn, prior);
  h.context.navigator.onLine = false; h.window.dispatchEvent({ type: 'offline' }); assert.equal(h.status.phase, 'offline');
  h.context.navigator.onLine = true; h.window.dispatchEvent({ type: 'online' }); assert.equal(h.status.phase, 'ready');
  h.calls.native[0].error({ code: 'permission-denied' }); assert.equal(h.status.phase, 'denied');
  assert.match(h.status.message, /Articoli/);
});

test('explicit refresh reconnects streams without duplicating active listeners or losing auth', async () => {
  const h = authHarness({ user }); await flush(); const before = h.calls.native.slice();
  h.status.retry(); assert(before.every(r => r.stopped)); assert.equal(h.calls.native.length, 4);
  assert.equal(h.calls.native.filter(r => !r.stopped).length, 2); assert.equal(h.fb.user.uid, user.uid);
});

test('HTML bootstrap exposes Retry when the module never loads', async () => {
  const elements = new Map(['inventoryStartupStatus','inventoryStartupText','btnLoginGoogle','btnInventoryRetry'].map(id => [id, { dataset: {}, hidden: false, addEventListener(name, fn) { this[name] = fn; } }]));
  let reloads = 0;
  const e = environment({ document: { getElementById: id => elements.get(id) }, location: { reload: () => reloads++ } });
  const controller = html.slice(html.indexOf('var panel = document.getElementById(\'inventoryStartupStatus\')'), html.indexOf('    <main class="layout">'));
  vm.runInContext('(function(){' + controller.split('})();')[0] + '})();', e.context);
  await e.time.advance(12000);
  assert.equal(elements.get('inventoryStartupStatus').dataset.phase, 'error');
  assert.equal(elements.get('btnInventoryRetry').hidden, false);
  elements.get('btnInventoryRetry').click(); assert.equal(reloads, 1);
});

test('Danea fetches are single-flight, bounded and discarded after a session change', async () => {
  let calls = [], ingested = [], resolve;
  const S = { xmlUrl: 'https://example.test/ddt', completedMap: new Map(), cacheMap: new Map(), fpByCode: new Map(), fpCatByKey: new Map(), resyncQueue: new Map() };
  const hub = { fb: { sessionPhase: 'signed_in' } };
  const e = environment({ S, AbortController, getHub: () => hub, ingestXml: body => ingested.push(body), render() {},
    fetch: (url, options) => new Promise((r, reject) => { resolve = r; calls.push(options); options.signal.addEventListener('abort', () => reject(new Error('Aborted'))); }) });
  const code = source.slice(source.indexOf('  let xmlRequest = null;'), source.indexOf('  function startPolling(){'));
  vm.runInContext(code, e.context);
  const first = e.context.fetchNow(false), second = e.context.fetchNow(false); assert.equal(calls.length, 1);
  await e.time.advance(12000); await Promise.all([first, second]); assert.equal(calls[0].signal.aborted, true);
  const third = e.context.fetchNow(false); assert.equal(calls.length, 2);
  hub.fb.sessionPhase = 'signed_out'; e.window.dispatchEvent({ type: 'HubInventorySession', detail: { uid: '' } });
  resolve({ ok: true, text: async () => 'stale XML' }); await third;
  assert.deepEqual(ingested, []); await e.context.fetchNow(false); assert.equal(calls.length, 2);
});

test('Danea retains its default endpoint when browser preferences are unavailable', () => {
  const start = source.indexOf('    // Storage may be denied while the session survives in IndexedDB.');
  const code = source.slice(start, source.indexOf('    // restore toggle', start));
  const S = {};
  const context = vm.createContext({ S, LS_URL: 'test.preference', DEFAULT_XML_URL_BASE: 'https://example.test/default',
    normalizeDaneaXmlUrl: value => value,
    localStorage: { getItem() { throw new Error('Blocked'); }, setItem() { throw new Error('Blocked'); } } });
  vm.runInContext(code, context);
  assert.equal(S.xmlUrl, 'https://example.test/default');
});

test('permission errors name the affected section and do not retry unchanged authorization', async () => {
  const h = authHarness({ user }); await flush();
  h.calls.native.forEach(r => r.next(snapshot()));
  const count = h.calls.native.length;
  h.calls.native[1].error({ code: 'permission-denied' });
  assert.equal(h.status.phase, 'denied');
  assert.match(h.status.message, /Movimenti inventario/);
  await h.time.advance(20000); assert.equal(h.calls.native.length, count);
});

test('an unavailable optional invoice registry does not turn a healthy inventory into a sync error', async () => {
  const h = authHarness({ user }); await flush();
  h.calls.native.forEach(r => r.next(snapshot()));
  assert.equal(h.status.phase, 'ready');
  vm.runInContext(`inventoryStreams.subscribe('invoices',()=>{},()=>{},{},{label:'Fatture fornitori',scope:'section'});`, h.context);
  h.calls.native.at(-1).error({ code: 'permission-denied' });
  assert.equal(h.status.phase, 'ready');
  const errors = vm.runInContext('inventoryStreams.errors()', h.context);
  assert.equal(errors[0].label, 'Fatture fornitori');
  assert.equal(errors[0].code, 'permission-denied');
});
