'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const p = require('./policy');
test('telephone normalization rejects malformed and ambiguous international numbers', () => {
  assert.equal(p.phone('333 1234567'), '+393331234567');
  assert.equal(p.phone('0039 333 1234567'), '+393331234567');
  for (const x of ['123', '1234567890', '+39bad12345678', {}, '+0123456789']) assert.equal(p.phone(x), '');
});
test('HMAC binds the exact body and rejects stale, modified and untrusted calls', () => {
  const key = 'a'.repeat(64), stamp = String(Date.now()), raw = '{"action":"poll"}';
  const signature = p.signature(key, stamp, raw);
  assert.equal(p.authorized(key, stamp, signature, raw), true);
  assert.equal(p.authorized(key, stamp, signature, raw + ' '), false);
  assert.equal(p.authorized('b'.repeat(64), stamp, signature, raw), false);
  assert.equal(p.authorized(key, stamp, signature, raw, Number(stamp) + 61000), false);
  assert.equal(p.authorized(key, stamp, 'x', raw), false);
});
test('ordinary role/admin aliases cannot escalate privileges; disabled UID overrides invitation', () => {
  const user = { uid: 'u', email: 'worker@example.com', emailVerified: true };
  assert.equal(p.accessFor(user, [{ id: 'u', data: { role: 'admin', admin: true } }]).admin, false);
  assert.equal(p.accessFor(user, [{ id: 'u', data: { disabled: true } }, { id: user.email, data: { enabled: true, isAdmin: true } }]).member, false);
});
test('legacy messages remain bounded without links or generic app instructions', () => {
  const text = p.textFor({ message: { subject: 'Test', text: 'Test\n'.repeat(2000) }, picking: { channel: 'WRITE' } });
  assert.ok(text.length <= 6000); assert.doesNotMatch(text, /https?:|www\.|Apri\b/i);
});
