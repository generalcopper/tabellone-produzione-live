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
  const subject = c.clean(mail.message?.subject, 160);
  const body = typeof mail.message?.text === 'string' ? mail.message.text.replace(/\r/g, '').trim() : '';
  if (!body) return '';
  const link = mail.picking?.channel === 'WRITE'
    ? 'https://' + c.PROJECT + '.firebaseapp.com/tabellone_write.html' : c.URL;
  const full = 'LG Trading · ' + subject + '\n\n' + body;
  return full.length <= 3900 ? full : full.slice(0, 3600).replace(/\n[^\n]*$/, '') +
    '\n\nElenco completo e aggiornato: ' + link;
}
function eligible(settings, emailSettings, user, directory, occurredAt, activatedAt) {
  return activatedAt > 0 && occurredAt >= activatedAt && c.selectedForWhatsApp({ ...settings,
    accountEmail: settings?.accountEmail || emailSettings?.accountEmail || emailSettings?.email,
  }, user, directory, occurredAt);
}

module.exports = { ...c, TTL, phone, signature, authorized, textFor, eligible };
