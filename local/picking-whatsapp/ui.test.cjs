'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const publicRoot = path.resolve(__dirname, '../../public');
const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/picking-notifications.css"><style>:root{--paper:#fff;--ink:#182124;--ink-2:#52616b;--ink-3:#687a85;--brand:#187653;--line:#dbe3e9}body{font-family:Arial;margin:12px}</style><div id="root"><button data-mail-refresh>Aggiorna</button><button data-mail-send>Invia riepilogo</button><div class="pickingMailHead"></div><div class="pickingMailList" data-mail-list></div><p data-mail-status></p></div>';
(async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/') { res.setHeader('content-type', 'text/html'); return res.end(fixture); }
    if (!['/picking-notifications.js', '/picking-notifications.css'].includes(name)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', name.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(fs.readFileSync(path.join(publicRoot, name.slice(1))));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TEST_CHROME || '/usr/bin/chromium' });
  try {
    let conflict = false, sends = 0;
    let person = { uid: 'worker', name: 'Dipendente prova', email: 'worker@example.invalid', loginEmail: 'worker@example.invalid', available: true, enabled: true, revision: 1, whatsapp: { phone: '', enabled: false, revision: 0 } };
    const system = { online: true, state: 'READY', enabled: true };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', async route => {
      const url = route.request().url(); if (url.startsWith(base)) return route.continue();
      assert.ok(url.endsWith('/pickingEmailApi'));
      const b = route.request().postDataJSON();
      if (b.action === 'saveRecipient') {
        if (conflict || b.revision !== person.revision || b.whatsappRevision !== person.whatsapp.revision) return route.fulfill({ status: 409, json: { error: 'Dati cambiati.' } });
        person = { ...person, email: b.email, enabled: b.enabled, revision: person.revision + 1,
          whatsapp: { ...person.whatsapp, enabled: b.whatsappEnabled, phone: b.phone.startsWith('+') ? b.phone : '+39' + b.phone, revision: person.whatsapp.revision + 1 } };
      }
      if (b.action === 'sendSummary') sends++;
      return route.fulfill({ json: { users: [person], ready: true, whatsapp: system, queuedCount: 1 } });
    });
    const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(async () => {
      const { createPickingNotifications } = await import('/picking-notifications.js');
      window.user = { uid: 'admin', getIdToken: async () => 'fixture-token' };
      window.panel = createPickingNotifications({ root: document.querySelector('#root'), getUser: () => window.user, isActive: () => true }); window.panel.open();
    });
    await page.locator('.pickingMailRow').waitFor();
    assert.equal(await page.locator('.pickingMailRow').count(), 1);
    assert.equal(await page.getByRole('button', { name: /Invia prova/i }).count(), 0);
    await page.getByRole('checkbox', { name: 'WhatsApp per Dipendente prova' }).click();
    await page.getByRole('dialog').waitFor();
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('alerts@example.invalid');
    await page.getByRole('textbox', { name: 'Numero WhatsApp' }).fill('3331234567');
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await page.getByText('Salvato.', { exact: true }).waitFor();
    assert.equal(person.email, 'alerts@example.invalid'); assert.equal(person.loginEmail, 'worker@example.invalid');
    assert.equal(person.whatsapp.phone, '+393331234567'); assert.equal(person.whatsapp.enabled, true);
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('checkbox', { name: 'Email per Dipendente prova', exact: true }).click();
    await page.getByText('Salvato.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Aggiorna', exact: true }).click();
    await page.getByText('Scegli i canali. Tocca un dipendente per modificare i contatti.').waitFor();
    assert.equal(person.enabled, false); assert.equal(person.whatsapp.enabled, true);
    await page.locator('.pickingMailRow').click({ position: { x: 15, y: 90 } });
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Numero WhatsApp' }).inputValue(), '+393331234567');
    await page.getByRole('textbox', { name: 'Numero WhatsApp' }).fill('+393339999999');
    conflict = true; await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: /Dati modificati/ }).waitFor();
    assert.equal(await page.getByRole('textbox', { name: 'Numero WhatsApp' }).inputValue(), '+393339999999');
    await page.getByRole('button', { name: 'Annulla', exact: true }).click(); conflict = false;
    assert.equal(person.whatsapp.phone, '+393331234567');
    await page.getByRole('button', { name: 'Invia riepilogo', exact: true }).click();
    await page.getByText('Riepilogo in invio a 1 destinatario.').waitFor(); assert.equal(sends, 1);
    person.whatsapp.lastSentAt = Date.now(); person.whatsapp.lastReadAt = 0;
    await page.getByRole('button', { name: 'Aggiorna', exact: true }).click(); await page.getByText(/Lettura non confermata/).waitFor();
    assert.equal(await page.getByText(/ · Letto /).count(), 0);
    person.whatsapp.lastReadAt = Date.now(); await page.getByRole('button', { name: 'Aggiorna', exact: true }).click(); await page.getByText(/ · Letto /).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.setViewportSize({ width: 1180, height: 900 });
    assert.equal(await page.locator('.pickingMailRow').count(), 1);
    await page.getByRole('button', { name: 'Dipendente prova', exact: true }).click();
    await page.evaluate(() => { window.user = null; window.panel.reset(); });
    assert.equal(await page.locator('.pickingMailRow').count(), 0); assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.locator('input[name=notificationPhone]').inputValue(), ''); assert.deepEqual(errors, []);
    console.log('PASS: single list, independent flags, contact modal, atomic save/reload, stale edit protection, real receipt labels, mobile layout, logout cleanup');
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exit(1); });
