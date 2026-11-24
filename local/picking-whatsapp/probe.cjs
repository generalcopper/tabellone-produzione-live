'use strict';
const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');
const puppeteer = require('./browser.cjs');
const root = __dirname, profile = path.join(root, 'data/probe-profile');
(async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true, userDataDir: profile, timeout: 90000, args: ['--no-first-run', '--disable-background-networking', '--disable-extensions'] });
    const page = await browser.newPage();
    await page.goto('data:text/html,<title>Picking isolated probe</title>');
    const result = { ok: await page.title() === 'Picking isolated probe' && browser.isConnected(), browser: await browser.version(),
      identity: execFileSync('C:\\Windows\\System32\\whoami.exe', [], { encoding: 'utf8' }).trim(),
      node: process.version, nodeMemoryMB: Math.round(process.memoryUsage().rss / 1048576), checkedAt: new Date().toISOString(),
      sandboxDisabled: false };
    fs.writeFileSync(path.join(root, 'data/probe-result.json'), JSON.stringify(result, null, 2));
  } catch (e) {
    fs.writeFileSync(path.join(root, 'data/probe-result.json'), JSON.stringify({ ok: false, error: e.message })); process.exitCode = 1;
  } finally { if (browser) await browser.close(); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); }
})();
