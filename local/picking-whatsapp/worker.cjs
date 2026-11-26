'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHmac } = require('node:crypto');
const { Journal } = require('./journal.cjs');
const { deliver } = require('./deliver.cjs');
const { reconcile } = require('./receipts.cjs');
const root = process.env.PICKING_WA_ROOT || __dirname;
const data = path.join(root, 'data');
fs.mkdirSync(data, { recursive: true });
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const key = fs.readFileSync(path.join(root, 'worker.key'), 'utf8').trim();
const endpoint = new URL(config.endpoint);
if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'europe-west1-tabellone-produzione-liv-e313e.cloudfunctions.net' ||
    endpoint.pathname !== '/pickingWhatsAppApi' || key.length < 40) throw Error('Invalid local configuration');
const journal = new Journal(path.join(data, 'outbox.sqlite'));
journal.recover();
let client = null, state = 'UNPAIRED', stopping = false, nextConnect = 0, failures = 0;
let lastSuccess = 0, lastMaintenance = 0, pairUntil = 0, initialized = false;
let lastReceiptCheck = 0;
const qrFile = path.join(data, 'pairing.png');
const statusFile = path.join(data, 'status.json');
const logFile = path.join(data, 'events.log');
const pairRequest = path.join(data, 'pair.request');
const paused = path.join(data, 'pause');
function removeQr() { try { fs.unlinkSync(qrFile); } catch (_) {} }
function log(event) {
  try {
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > 1024 * 1024) {
      fs.copyFileSync(logFile, logFile + '.previous'); fs.truncateSync(logFile, 0);
    }
    fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), event }) + '\n');
  } catch (_) {}
}
function status() {
  const value = { version: '1.0.0', state, pid: process.pid, updatedAt: new Date().toISOString(),
    bridgeLastSuccessAt: lastSuccess ? new Date(lastSuccess).toISOString() : null,
    freeMemoryMB: Math.round(os.freemem() / 1048576), memoryMB: Math.round(process.memoryUsage().rss / 1048576) };
  const temp = statusFile + '.tmp'; fs.writeFileSync(temp, JSON.stringify(value, null, 2)); fs.renameSync(temp, statusFile);
}
async function api(body) {
  const raw = JSON.stringify(body), stamp = String(Date.now());
  const sig = createHmac('sha256', key).update(stamp + '\n' + raw).digest('hex');
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json',
    'x-picking-worker': 'nuc-picking', 'x-picking-time': stamp, 'x-picking-signature': sig },
    body: raw, signal: AbortSignal.timeout(45000) });
  if (!response.ok) { const e = new Error('Bridge unavailable'); e.status = response.status; throw e; }
  const result = await response.json(); lastSuccess = Date.now(); return result;
}
async function disconnect(nextState) {
  const old = client; client = null; initialized = false; state = nextState; removeQr();
  if (old) { try { await old.destroy(); } catch (_) {} }
}
async function connect(explicitPairing) {
  if (client || Date.now() < nextConnect) return;
  state = 'PAIRING'; status();
  require('./browser.cjs');
  const { Client, LocalAuth } = require('whatsapp-web.js');
  const QR = require('qrcode');
  pairUntil = explicitPairing ? Date.now() + 5 * 60000 : 0;
  const current = new Client({
    authStrategy: new LocalAuth({ clientId: 'lg-picking', dataPath: path.join(data, 'session') }),
    takeoverOnConflict: false, qrMaxRetries: 5, authTimeoutMs: 120000,
    webVersionCache: { type: 'local', path: path.join(data, 'web-cache') },
    puppeteer: { headless: true, executablePath: config.chromePath, timeout: 90000,
      args: ['--disable-extensions', '--disable-background-networking', '--disable-component-update',
        '--disable-sync', '--no-first-run', '--js-flags=--max-old-space-size=192'] },
  });
  client = current;
  current.on('qr', async qr => {
    if (client !== current) return;
    if (Date.now() > pairUntil) { nextConnect = Number.MAX_SAFE_INTEGER; await disconnect('UNPAIRED'); status(); return; }
    try {
      await QR.toFile(qrFile, qr, { width: 420, margin: 3 });
      if (client !== current || Date.now() > pairUntil) removeQr();
    } catch (_) { log('qr_render_failed'); }
  });
  current.on('message_ack', (message, ack) => {
    if (client === current && message?.fromMe && message.id?._serialized) {
      journal.receipt(message.id._serialized, ack);
    }
  });
  current.on('ready', () => {
    if (client !== current) return;
    initialized = true; state = 'READY'; failures = 0; removeQr(); log('whatsapp_ready'); status();
  });
  current.on('auth_failure', () => {
    if (client !== current) return;
    nextConnect = Number.MAX_SAFE_INTEGER; log('pairing_required'); void disconnect('UNPAIRED');
  });
  current.on('disconnected', () => {
    if (client !== current) return;
    state = 'DISCONNECTED'; nextConnect = Date.now() + Math.min(900000, 60000 * 2 ** Math.min(++failures, 4));
    void disconnect('DISCONNECTED'); log('whatsapp_disconnected');
  });
  try { await current.initialize(); }
  catch (error) {
    if (client !== current) return;
    fs.writeFileSync(path.join(data, 'last-start-error.json'), JSON.stringify({
      at: new Date().toISOString(), name: error.name, code: error.code || '',
      message: String(error.message || '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 800),
      stack: String(error.stack || '').replace(/https?:\/\/\S+/g, '[url]').split('\n').slice(0, 8).join('\n'),
    }, null, 2));
    await disconnect('ERROR');
    nextConnect = Date.now() + Math.min(900000, 60000 * 2 ** Math.min(++failures, 4)); log('whatsapp_start_failed'); status();
  }
}
async function reports() {
  for (const row of journal.reports()) {
    try {
      await api({ action: 'complete', id: row.id, token: row.token, outcome: row.outcome, messageId: row.message_id || '', ...(row.outcome === 'SENT' ? { sentAt: row.updated } : {}) });
      journal.acknowledged(row.id);
    } catch (e) {
      // A lost lease or an already cancelled item cannot safely be retransmitted.
      if ([404, 409].includes(e.status)) journal.acknowledged(row.id);
      else throw e;
    }
  }
  for (const row of journal.receiptReports()) {
    try {
      await api({ action: 'receipt', id: row.id, token: row.token, messageId: row.message_id,
        ack: row.ack, deliveredAt: row.delivered_at, ...(row.read_at ? { readAt: row.read_at } : {}) });
      journal.receiptAcknowledged(row.message_id, row.ack);
    } catch (e) {
      if ([404, 409].includes(e.status)) journal.receiptAcknowledged(row.message_id, row.ack);
      else throw e;
    }
  }

}
async function tick() {
  const underPressure = os.freemem() < 2 * 1024 ** 3 || fs.existsSync(paused);
  if (underPressure) await disconnect('RESOURCE_PAUSED');
  else {
    if (fs.existsSync(pairRequest)) {
      fs.unlinkSync(pairRequest); nextConnect = 0;
      if (!client) void connect(true);
    } else if (!client && fs.existsSync(path.join(data, 'session/session-lg-picking/Default')) && Date.now() >= nextConnect) {
      void connect(false);
    } else if (state === 'RESOURCE_PAUSED') state = 'UNPAIRED';
    if (state === 'PAIRING' && pairUntil && Date.now() > pairUntil) {
      nextConnect = Number.MAX_SAFE_INTEGER; await disconnect('UNPAIRED');
    }
  }
  await reports();
  const result = await api({ action: 'poll', state });
  if (state === 'READY' && initialized && client && !underPressure) {
    for (const job of (result.jobs || []).slice(0, 1)) await deliver({ job, journal, provider: client, api,
      onTimeout: async () => { nextConnect = Date.now() + 120000; await disconnect('DISCONNECTED'); } });
    await reports();
    if (Date.now() - lastReceiptCheck > 60000 && state === 'READY' && client) {
      lastReceiptCheck = Date.now();
      const recovered = await reconcile({ journal, provider: client,
        onTimeout: async () => { nextConnect = Date.now() + 60000; await disconnect('DISCONNECTED'); } });
      if (recovered) log('read_receipt_recovered');
      await reports();
    }
  }
  if (Date.now() - lastMaintenance > 86400000) { journal.prune(); lastMaintenance = Date.now(); }
  status();
}
async function shutdown() {
  if (stopping) return; stopping = true; await disconnect('DISCONNECTED'); journal.close(); process.exit(0);
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
process.on('unhandledRejection', () => { log('unexpected_failure'); void shutdown(); });
(async () => {
  log('worker_started'); removeQr();
  while (!stopping) {
    try { await tick(); } catch (_) { log('bridge_retry_pending'); status(); }
    await new Promise(resolve => setTimeout(resolve, state === 'READY' ? 30000 : 60000));
  }
})();
