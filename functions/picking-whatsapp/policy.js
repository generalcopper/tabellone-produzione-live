'use strict';
const { createHmac, timingSafeEqual } = require('node:crypto');
const c = require('./vendor/core');
const TTL = 15 * 60 * 1000;
function phone(value) {
  if (typeof value !== 'string' || value.length > 40) return '';
  let p = value.trim().replace(/[ ().-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (/^3\d{8,9}$/.test(p)) p = '+39' + p;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : '';
}
function signature(key, timestamp, raw) {
  return createHmac('sha256', key).update(timestamp + '\n').update(raw).digest('hex');
}
function authorized(key, timestamp, supplied, raw, now = Date.now()) {
  if (!key || !/^\d{13}$/.test(timestamp || '') || Math.abs(now - Number(timestamp)) > 60000 ||
      !/^[a-f0-9]{64}$/.test(supplied || '')) return false;
  return timingSafeEqual(Buffer.from(signature(key, timestamp, raw), 'hex'), Buffer.from(supplied, 'hex'));
}
function textFor(mail) {
  return c.whatsAppText(mail.message, mail.picking?.channel);
}
function eligible(settings, emailSettings, user, directory, occurredAt, activatedAt) {
  return activatedAt > 0 && occurredAt >= activatedAt && c.selectedForWhatsApp({ ...settings,
    accountEmail: settings?.accountEmail || emailSettings?.accountEmail || emailSettings?.email,
  }, user, directory, occurredAt);
}

module.exports = { ...c, TTL, phone, signature, authorized, textFor, eligible };
