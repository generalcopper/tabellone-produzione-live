'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const publicRoot = path.resolve(__dirname, '../../public');
const fixture = '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/picking-notifications.css"><div id="root"><button data-mail-refresh>Aggiorna</button><button data-mail-send>Invia riepilogo</button><div data-mail-list></div><p data-mail-status></p></div>';
(async () => {
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://localhost').pathname;
    if (name === '/') { res.setHeader('content-type', 'text/html'); return res.end(fixture); }
    if (!['/picking-notifications.js', '/picking-whatsapp.js', '/picking-notifications.css'].includes(name)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', name.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(fs.readFileSync(path.join(publicRoot, name.slice(1))));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.TEST_CHROME || '/usr/bin/chromium' });
  try {
    let optionalFailure = false, waSettings = [], system = { online: true, state: 'UNPAIRED', enabled: false }, sends = 0, waTests = 0;
    const person = { uid: 'worker', name: 'Dipendente prova', email: 'worker@example.invalid', available: true, enabled: true, revision: 1 };
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith(base)) {
        if (optionalFailure && url.includes('picking-whatsapp.js')) return route.abort();
        return route.continue();
      }
      const body = route.request().postDataJSON();
      if (url.endsWith('/pickingEmailApi')) {
        if (body.action === 'sendSummary') sends++;
        return route.fulfill({ json: { users: [person], ready: true, queuedCount: 1 } });
      }
      if (url.endsWith('/pickingWhatsAppApi')) {
        if (body.action === 'setRecipient') waSettings = [{ uid: person.uid, phone: body.phone, enabled: body.enabled, revision: 1 }];
        if (body.action === 'sendTest') waTests++;
        return route.fulfill({ json: { users: waSettings, system } });
      }
      return route.abort();
    });
    async function open() {
      const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(base);
      await page.evaluate(async () => {
        const { createPickingNotifications } = await import('/picking-notifications.js');
        window.user = { uid: 'admin', getIdToken: async () => 'fixture-token' };
        window.panel = createPickingNotifications({ root: document.querySelector('#root'), getUser: () => window.user, isActive: () => true });
        window.panel.open();
      });
      return { page, errors };
    }
    let { page, errors } = await open();
    await page.locator('.pickingWaRow').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Invia prova' }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: 'Attiva avvisi WhatsApp' }).isDisabled(), true);
    await page.getByRole('textbox', { name: 'Numero WhatsApp di Dipendente prova' }).fill('+393331234567');
    await page.locator('.pickingWaEnabled input').check();
    await page.getByRole('button', { name: 'Salva', exact: true }).click();
    await page.getByText('Impostazioni WhatsApp salvate.').waitFor();
    assert.equal(waSettings[0].phone, '+393331234567'); assert.equal(waTests, 0);
    await page.getByRole('button', { name: 'Invia riepilogo', exact: true }).click();
    await page.getByText('Riepilogo in invio a 1 utente.').waitFor();
    assert.equal(sends, 1); assert.equal(waTests, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await page.evaluate(() => { window.user = null; window.panel.reset(); });
    assert.equal(await page.locator('.pickingWaRow').count(), 0);
    assert.deepEqual(errors, []); await page.close();
    optionalFailure = true;
    ({ page, errors } = await open());
    await page.getByText('Dipendente prova', { exact: true }).waitFor();
    assert.equal(await page.getByRole('checkbox', { name: 'Notifiche email per Dipendente prova' }).isChecked(), true);
    assert.equal(await page.getByRole('button', { name: 'Invia riepilogo', exact: true }).isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: mobile settings, explicit save, pairing gates, email send isolation, logout cleanup, optional-module failure');
    await context.close();
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exit(1); });
