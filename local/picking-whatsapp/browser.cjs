'use strict';
// whatsapp-web.js 1.34.8 calls the pre-v25 Browser.isConnected() in cleanup.
// Puppeteer 25 retains the equivalent connected getter. Keep this compatibility
// alias in our process so we can use the patched browser dependency tree.
const puppeteer = require('puppeteer');
if (typeof puppeteer.Browser.prototype.isConnected !== 'function') {
  Object.defineProperty(puppeteer.Browser.prototype, 'isConnected', {
    value() { return this.connected; }, configurable: true,
  });
}
module.exports = puppeteer;
