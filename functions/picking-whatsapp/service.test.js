'use strict';
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore, Timestamp: T, FieldValue: F } = require('firebase-admin/firestore');
const { createService, CONFIG, RECIPIENTS, DELIVERIES } = require('./service');
const p = require('./policy');
if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8794') throw Error('Integration tests require isolated local emulator 127.0.0.1:8794');
const projectId = 'demo-picking-whatsapp-tests';
const app = initializeApp({ projectId }, 'whatsapp-tests'), db = getFirestore(app);
const base = 'http://127.0.0.1:8794/emulator/v1/projects/' + projectId + '/databases/(default)/documents';
let offset = 0;
const users = new Map();
const auth = {
  async getUser(uid) { if (!users.has(uid)) throw Object.assign(Error('Missing'), { code: 'auth/user-not-found' }); return users.get(uid); },
  async verifyIdToken(token) {
    if (!['admin-token', 'worker-token'].includes(token)) throw Error('Invalid');
    return { uid: token.split('-')[0], email_verified: true };
  },
};
const service = createService({ db, auth, clock: () => Date.now() + offset });
const admin = body => service.admin('Bearer admin-token', body);
const poll = () => service.worker({ action: 'poll', state: 'READY' });
before(async () => { await fetch(base, { method: 'DELETE' }); });
beforeEach(async () => {
  await fetch(base, { method: 'DELETE' }); users.clear(); offset = 0;
  for (const uid of ['admin', 'worker', 'other']) {
    users.set(uid, { uid, email: uid + '@example.com', emailVerified: true, metadata: { lastSignInTime: new Date().toISOString() } });
    await db.doc('powderUsers/' + uid).set({ enabled: true, isAdmin: uid === 'admin' });
    await db.doc('pickingEmailRecipients/' + uid).set({ enabled: true, email: uid + '@example.com', enabledAt: T.fromMillis(Date.now() - 60000) });
  }
  await db.doc(CONFIG).set({ enabled: true, activatedAt: T.fromMillis(Date.now() - 30000), state: 'READY', heartbeatAt: T.now() });
  await db.doc(RECIPIENTS + '/worker').set({ enabled: true, phone: '+393331234567', revision: 1, enabledAt: T.fromMillis(Date.now() - 60000) });
  await db.doc('pickingWhatsAppPhones/' + p.hash('+393331234567')).set({ uid: 'worker' });
});
after(async () => { await db.terminate(); await deleteApp(app); });
async function notice(id = 'fixture', patch = {}) {
  const mailId = p.PREFIX + id;
  const mail = { to: 'worker@example.com', from: p.MAIL_FROM, replyTo: 'info@generalcoppersrl.com',
    kind: p.KIND, message: { subject: 'Test summary', text: 'Only test data' },
    picking: { uid: 'worker', channel: 'RIEPILOGO', eventId: id, noticeType: 'manual' } };
  await db.doc('email/' + mailId).set(mail);
  await db.doc('pickingEmailDeliveries/' + mailId).set({ uid: 'worker', noticeType: 'manual', channel: 'RIEPILOGO',
    occurredAt: T.now(), createdAt: F.serverTimestamp(), envelopeHash: p.envelopeHash(mail), lastStatus: 'SUCCESS', ...patch });
  return mailId;
}
test('API denies unauthenticated callers and non-admin role aliases', async () => {
  await assert.rejects(service.admin('', { action: 'status' }), e => e.status === 401);
  await db.doc('powderUsers/worker').update({ admin: true, role: 'admin' });
  await assert.rejects(service.admin('Bearer worker-token', { action: 'status' }), e => e.status === 403);
});
test('recipient saves use optimistic revisions and prevent duplicate numbers', async () => {
  await assert.rejects(admin({ action: 'setRecipient', uid: 'worker', phone: '+393331234567', enabled: true, revision: 0 }), e => e.status === 409);
  await assert.rejects(admin({ action: 'setRecipient', uid: 'other', phone: '+393331234567', enabled: true, revision: 0 }), e => e.status === 409);
  await admin({ action: 'setRecipient', uid: 'worker', phone: '+393331234567', enabled: false, revision: 1 });
  await admin({ action: 'setRecipient', uid: 'other', phone: '+393331234567', enabled: true, revision: 0 });
  assert.equal((await db.doc(RECIPIENTS + '/other').get()).data().enabled, true);
});
test('concurrent polling and begin create a single dispatch; completion is idempotent', async () => {
  const id = await notice();
  const results = await Promise.all([poll(), poll()]);
  const jobs = results.flatMap(r => r.jobs); assert.equal(jobs.length, 1);
  const job = jobs[0];
  const started = await Promise.allSettled([service.worker({ action: 'begin', ...job }), service.worker({ action: 'begin', ...job })]);
  assert.equal(started.filter(r => r.status === 'fulfilled').length, 1);
  const done = { action: 'complete', ...job, outcome: 'SENT', messageId: 'test-provider-id' };
  await service.worker(done); await service.worker(done);
  assert.equal((await db.doc(DELIVERIES + '/' + id).get()).data().status, 'SENT');
  assert.equal((await poll()).jobs.length, 0);
  assert.equal((await db.doc('email/' + id).get()).data().message.text, 'Only test data');
});
test('disabling email, employee or changing phone after claim cancels dispatch', async () => {
  for (const change of ['email', 'employee', 'phone']) {
    await db.doc('pickingEmailRecipients/worker').update({ enabled: true });
    await db.doc('powderUsers/worker').update({ enabled: true });
    await db.doc(RECIPIENTS + '/worker').update({ revision: 1 });
    await notice(change); const job = (await poll()).jobs[0]; assert.ok(job);
    if (change === 'email') await db.doc('pickingEmailRecipients/worker').update({ enabled: false });
    if (change === 'employee') await db.doc('powderUsers/worker').update({ enabled: false });
    if (change === 'phone') await db.doc(RECIPIENTS + '/worker').update({ revision: 2 });
    assert.equal((await service.worker({ action: 'begin', ...job })).cancelled, true);
  }
});
test('activation cutoff and expiry exclude old mail even if the source ledger is inserted later', async () => {
  await notice('old', { occurredAt: T.fromMillis(Date.now() - 60000) });
  await notice('expired', { occurredAt: T.fromMillis(Date.now() - p.TTL - 1000) });
  assert.equal((await poll()).jobs.length, 0);
  assert.equal((await db.collection(DELIVERIES).get()).size, 0);
});
test('a SENDING lease that expires becomes UNKNOWN and is not sent again', async () => {
  const id = await notice(); const job = (await poll()).jobs[0];
  await service.worker({ action: 'begin', ...job }); offset = 121000;
  assert.equal((await poll()).jobs.length, 0);
  assert.equal((await db.doc(DELIVERIES + '/' + id).get()).data().status, 'UNKNOWN');
  await service.worker({ action: 'complete', ...job, outcome: 'SENT', messageId: 'delayed-receipt' });
  assert.equal((await db.doc(DELIVERIES + '/' + id).get()).data().status, 'SENT');
});
test('global pause blocks operational sends; explicit test is deduplicated and unlocks activation', async () => {
  await admin({ action: 'setEnabled', enabled: false });
  await assert.rejects(admin({ action: 'setEnabled', enabled: true }), e => e.status === 409);
  await notice('paused'); assert.equal((await poll()).jobs.length, 0);
  const request = { action: 'sendTest', uid: 'worker', requestId: '12345678-1234-1234-1234-123456789012' };
  await admin(request); await admin(request);
  const job = (await poll()).jobs[0]; assert.ok(job.id.startsWith('test_'));
  await service.worker({ action: 'begin', ...job });
  await service.worker({ action: 'complete', ...job, outcome: 'SENT', messageId: 'test-receipt' });
  await admin({ action: 'setEnabled', enabled: true });
  assert.equal((await poll()).jobs.length, 0);
  assert.equal((await db.doc(CONFIG).get()).data().enabled, true);
});
test('tampered mail envelope and pre-selection mail cannot be sent', async () => {
  const id = await notice('tampered'); await db.doc('email/' + id).update({ 'message.text': 'Changed' });
  await notice('before-selection', { occurredAt: T.fromMillis(Date.now() - 20000) });
  await db.doc(RECIPIENTS + '/worker').update({ enabledAt: T.now() });
  assert.equal((await poll()).jobs.length, 0);
});
test('cancelling operational FBA work between claim and begin prevents dispatch', async () => {
  const sourcePath = 'amzInventory/concamarise/logs/fba-test';
  await db.doc(sourcePath).set({ kind: 'scarica', status: 'CANCELLED', fileName: 'FBA123456', lines: [{ sku: 'SKU', qty: 4 }] });
  await notice('fba', { sourcePath, noticeType: 'fba' });
  const job = (await poll()).jobs[0]; assert.ok(job);
  assert.equal((await service.worker({ action: 'begin', ...job })).cancelled, true);
});
