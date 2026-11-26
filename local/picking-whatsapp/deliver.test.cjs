'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Journal } = require('./journal.cjs');
const { deliver } = require('./deliver.cjs');
const job = { id: 'example', token: 'token', phone: '+393331234567' };
function fixture() {
  const journal = new Journal(':memory:'); let calls = 0;
  const provider = { async getNumberId() { return { _serialized: 'test@c.us' }; },
    async sendMessage() { calls++; return { id: { _serialized: 'provider-id' } }; } };
  const api = async () => ({ phone: job.phone, text: 'Test only' });
  return { journal, provider, api, count: () => calls };
}
test('same job and concurrent calls transmit at most once', async () => {
  const x = fixture(); await Promise.all([deliver({ job, ...x }), deliver({ job, ...x })]);
  assert.equal(x.count(), 1); assert.equal(x.journal.reports()[0].outcome, 'SENT'); x.journal.close();
});
test('provider failure after acceptance is UNKNOWN and never automatically retried', async () => {
  const x = fixture(); let accepted = 0;
  x.provider.sendMessage = async () => { accepted++; throw Error('Lost reply'); };
  await deliver({ job, ...x }); await deliver({ job, ...x });
  assert.equal(accepted, 1); assert.equal(x.journal.reports()[0].outcome, 'UNKNOWN'); x.journal.close();
});
test('server cancellation and changed phone prevent delivery', async () => {
  for (const result of [{ cancelled: true }, { phone: '+393331111111', text: 'Test' }]) {
    const x = fixture(); x.api = async () => result; await deliver({ job, ...x }); assert.equal(x.count(), 0); x.journal.close();
  }
});
test('unregistered number is rejected before begin', async () => {
  const x = fixture(); x.provider.getNumberId = async () => null; x.api = async () => { throw Error('must not begin'); };
  await deliver({ job, ...x }); assert.equal(x.count(), 0); assert.equal(x.journal.reports()[0].outcome, 'REJECTED'); x.journal.close();
});
test('process restart preserves deduplication and ambiguous dispatch state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'picking-wa-test-')), file = path.join(dir, 'journal.sqlite');
  let j = new Journal(file); j.reserve(job.id, job.token); j.sending(job.id); j.close();
  j = new Journal(file); j.recover(); assert.equal(j.reports()[0].outcome, 'UNKNOWN'); assert.equal(j.reserve(job.id, 'new-token'), false);
  j.close(); fs.rmSync(dir, { recursive: true });
});

test('receipts ignore unrelated chats and persist across restart without losing a newer read event', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'picking-receipt-')), file = path.join(dir, 'journal.sqlite');
  let j = new Journal(file); assert.equal(j.receipt('unrelated', 3), false);
  j.reserve('known', 'token'); j.outcome('known', 'SENT', 'msg'); j.acknowledged('known');
  j.receipt('msg', 2, 1000); j.receipt('msg', 3, 1100); j.receiptAcknowledged('msg', 2); j.close();
  j = new Journal(file); const r = j.receiptReports()[0];
  assert.equal(r.ack, 3); assert.equal(r.delivered_at, 1000); assert.equal(r.read_at, 1100);
  j.receipt('msg', 2, 1200); assert.equal(j.receiptReports()[0].read_at, 1100);
  j.receiptAcknowledged('msg', 3); assert.equal(j.receiptReports().length, 0);
  j.close(); fs.rmSync(dir, { recursive: true });
});
