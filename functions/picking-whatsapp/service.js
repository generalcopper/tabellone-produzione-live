'use strict';
const { randomUUID } = require('node:crypto');
const { FieldValue: F, FieldPath, Timestamp: T } = require('firebase-admin/firestore');
const p = require('./policy');
const w = require('./vendor/write-queue');
const CONFIG = 'pickingWhatsAppConfig/system';
const RECIPIENTS = 'pickingWhatsAppRecipients';
const DELIVERIES = 'pickingWhatsAppDeliveries';
const EMAIL_RECIPIENTS = 'pickingEmailRecipients';
const DIRECTORY = ['powderUsers', 'amzInventoryDirectory', 'payrollDirectory'];
const problem = (status, message) => Object.assign(new Error(message), { status });
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(id);
const cursorKey = d => JSON.stringify(d.cursor || null);

function createService({ db, auth, clock = Date.now }) {
  async function account(uid) {
    let user;
    try { user = await auth.getUser(uid); }
    catch (e) { if (e.code === 'auth/user-not-found') return { user: null, directory: [] }; throw e; }
    const refs = DIRECTORY.flatMap(name => [db.doc(name + '/' + uid),
      ...(p.validEmail(user.email) ? [db.doc(name + '/' + p.email(user.email))] : [])]);
    const docs = await db.getAll(...refs);
    return { user, directory: docs.filter(d => d.exists).map(d => ({ id: d.id, data: d.data() })) };
  }
  async function administrator(bearer) {
    if (!/^Bearer [A-Za-z0-9_.-]+$/.test(bearer || '')) throw problem(401, 'Accedi a Picking.');
    let token;
    try { token = await auth.verifyIdToken(bearer.slice(7), true); }
    catch (_) { throw problem(401, 'Accedi di nuovo a Picking.'); }
    if (!token.uid || token.email_verified !== true) throw problem(403, 'Operazione riservata agli amministratori.');
    const a = await account(token.uid);
    if (!p.accessFor(a.user, a.directory).admin) throw problem(403, 'Operazione riservata agli amministratori.');
    return token;
  }
  async function status() {
    const [config, recipients] = await Promise.all([db.doc(CONFIG).get(), db.collection(RECIPIENTS).get()]);
    const c = config.data() || {};
    return { system: { enabled: c.enabled === true, state: c.state || 'UNPAIRED',
      online: clock() - p.millis(c.heartbeatAt) < 420000, heartbeatAt: p.millis(c.heartbeatAt),
      lastTestSentAt: p.millis(c.lastTestSentAt), activatedAt: p.millis(c.activatedAt) },
    users: recipients.docs.map(doc => { const d = doc.data(); return {
      uid: doc.id, phone: d.phone || '', enabled: d.enabled === true, revision: d.revision || 0,
      lastStatus: d.lastStatus || '', lastSentAt: p.millis(d.lastSentAt), lastChannel: d.lastChannel || '',
      lastDeliveredAt: p.millis(d.lastDeliveredAt), lastReadAt: p.millis(d.lastReadAt),
    }; }) };
  }
  async function setRecipient(actor, input) {
    const { uid, enabled, revision } = input;
    const phone = input.phone === '' ? '' : p.phone(input.phone);
    if (!validId(uid) || typeof enabled !== 'boolean' || !Number.isInteger(revision) || revision < 0 ||
        (input.phone !== '' && !phone) || (enabled && !phone)) throw problem(400, 'Inserisci un numero valido con prefisso internazionale.');
    const a = enabled ? await account(uid) : null;
    if (enabled && (!p.accessFor(a.user, a.directory).member || !a.user?.emailVerified ||
        !a.user?.metadata?.lastSignInTime)) throw problem(400, 'Utente non abilitato.');
    const ref = db.doc(RECIPIENTS + '/' + uid);
    await db.runTransaction(async tx => {
      const [snap, email] = await tx.getAll(ref, db.doc(EMAIL_RECIPIENTS + '/' + uid));
      const previous = snap.data() || {};
      if ((previous.revision || 0) !== revision) throw problem(409, 'Dati cambiati. Premi Aggiorna.');
      const newIndex = phone ? db.doc('pickingWhatsAppPhones/' + p.hash(phone)) : null;
      const oldIndex = previous.phone ? db.doc('pickingWhatsAppPhones/' + p.hash(previous.phone)) : null;
      const indexes = await Promise.all([newIndex ? tx.get(newIndex) : null, oldIndex ? tx.get(oldIndex) : null]);
      if (enabled && indexes[0]?.exists && indexes[0].data().uid !== uid) {
        throw problem(409, 'Numero già associato a un altro dipendente.');
      }
      if (oldIndex && indexes[1]?.data()?.uid === uid && (!enabled || previous.phone !== phone)) tx.delete(oldIndex);
      if (enabled) tx.set(newIndex, { uid });
      tx.set(ref, { phone, enabled, ...(enabled ? { accountEmail: p.email(a.user.email) } : {}), revision: revision + 1, updatedAt: F.serverTimestamp(), updatedByUid: actor.uid,
        ...(enabled && (!previous.enabled || previous.phone !== phone) ? { enabledAt: F.serverTimestamp() } : {}) }, { merge: true });
    });
    return status();
  }
  async function admin(bearer, body) {
    const actor = await administrator(bearer);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem(400, 'Richiesta non valida.');
    if (['list', 'status'].includes(body.action)) return status();
    if (body.action === 'setRecipient') return setRecipient(actor, body);
    if (body.action === 'setEnabled') {
      if (typeof body.enabled !== 'boolean') throw problem(400, 'Impostazione non valida.');
      await db.runTransaction(async tx => {
        const ref = db.doc(CONFIG), snap = await tx.get(ref), c = snap.data() || {};
        if (body.enabled && (c.state !== 'READY' || clock() - p.millis(c.heartbeatAt) > 420000 || !c.lastTestSentAt)) {
          throw problem(409, 'Collega WhatsApp ed esegui prima una prova di invio.');
        }
        if (c.enabled === body.enabled) return;
        tx.set(ref, { enabled: body.enabled, updatedByUid: actor.uid, updatedAt: F.serverTimestamp(),
          ...(body.enabled ? { activatedAt: T.fromMillis(clock()), cursor: null } : {}) }, { merge: true });
      });
      return status();
    }
    if (body.action === 'sendTest') {
      if (!validId(body.uid) || !/^[A-Za-z0-9_-]{16,100}$/.test(body.requestId || '')) throw problem(400, 'Prova non valida.');
      const a = await account(body.uid), now = clock();
      await db.runTransaction(async tx => {
        const ref = db.doc(DELIVERIES + '/test_' + p.hash(actor.uid + ':' + body.requestId));
        const [config, recipient, email, existing] = await tx.getAll(db.doc(CONFIG), db.doc(RECIPIENTS + '/' + body.uid),
          db.doc(EMAIL_RECIPIENTS + '/' + body.uid), ref);
        if (existing.exists) return;
        const c = config.data() || {}, r = recipient.data();
        if (c.state !== 'READY' || now - p.millis(c.heartbeatAt) > 420000) throw problem(409, 'WhatsApp non collegato.');
        if (!p.eligible(r, email.data(), a.user, a.directory, now, 1)) throw problem(400, 'Destinatario non abilitato.');
        if (now - p.millis(c.lastTestQueuedAt) < 60000) throw problem(429, 'Attendi un minuto prima di un’altra prova.');
        tx.create(ref, { kind: 'test', status: 'PENDING', uid: body.uid, phone: r.phone, revision: r.revision,
          text: 'LG Trading · Prova notifiche Picking\n\nIl collegamento WhatsApp funziona. Gli avvisi operativi verranno inviati a questo numero dopo l’attivazione.\n' + p.URL,
          channel: 'PROVA', occurredAt: T.fromMillis(now), expiresAt: T.fromMillis(now + p.TTL), createdAt: F.serverTimestamp() });
        tx.set(db.doc(CONFIG), { lastTestQueuedAt: F.serverTimestamp() }, { merge: true });
      });
      return { ...(await status()), queued: true };
    }
    throw problem(400, 'Richiesta non valida.');
  }
  async function importNew(config) {
    const activatedAt = p.millis(config.activatedAt);
    if (!config.enabled || !activatedAt) return;
    let query = db.collection('pickingEmailDeliveries').orderBy('createdAt').orderBy(FieldPath.documentId());
    if (config.cursor) query = query.startAfter(new T(config.cursor.seconds, config.cursor.nanoseconds), config.cursor.id);
    else query = query.startAt(T.fromMillis(activatedAt));
    const docs = (await query.limit(30).get()).docs;
    if (!docs.length) return;
    const prepared = [];
    for (const doc of docs) {
      const d = doc.data(), occurredAt = p.millis(d.occurredAt);
      if (!validId(d.uid) || clock() - occurredAt > p.TTL || occurredAt < activatedAt ||
          !['fba', 'write', 'manual', 'daily'].includes(d.noticeType) || !doc.id.startsWith(p.PREFIX)) continue;
      const [a, r, e, mail] = await Promise.all([account(d.uid), db.doc(RECIPIENTS + '/' + d.uid).get(),
        db.doc(EMAIL_RECIPIENTS + '/' + d.uid).get(), db.doc('email/' + doc.id).get()]);
      const m = mail.data();
      if (!p.eligible(r.data(), e.data(), a.user, a.directory, occurredAt, activatedAt) ||
          !m || m.kind !== p.KIND || m.picking?.uid !== d.uid || p.envelopeHash(m) !== d.envelopeHash || !p.textFor(m)) continue;
      prepared.push({ id: doc.id, uid: d.uid, phone: r.data().phone, revision: r.data().revision,
        kind: 'notice', status: 'PENDING', text: p.textFor(m), channel: d.channel,
        occurredAt: d.occurredAt, expiresAt: T.fromMillis(occurredAt + p.TTL), createdAt: F.serverTimestamp() });
    }
    await db.runTransaction(async tx => {
      const current = await tx.get(db.doc(CONFIG));
      if (!current.data()?.enabled || cursorKey(current.data()) !== cursorKey(config) ||
          p.millis(current.data().activatedAt) !== activatedAt) return;
      const refs = prepared.map(d => db.doc(DELIVERIES + '/' + d.id));
      const existing = refs.length ? await tx.getAll(...refs) : [];
      prepared.forEach((d, i) => { if (!existing[i].exists) { const { id, ...data } = d; tx.create(refs[i], data); } });
      const last = docs.at(-1), time = last.data().createdAt;
      tx.set(db.doc(CONFIG), { cursor: { id: last.id, seconds: time.seconds, nanoseconds: time.nanoseconds } }, { merge: true });
    });
  }
  async function sourceValid(id, delivery) {
    if (delivery.kind === 'test') return true;
    const ledger = delivery.producer === 2 ? null : await db.doc('pickingEmailDeliveries/' + id).get();
    if (ledger && (!ledger.exists || ledger.data().uid !== delivery.uid)) return false;
    const d = delivery.producer === 2 ? delivery : ledger.data();
    if (['CANCELLED', 'UNKNOWN'].includes(d.lastStatus)) return false;
    if (!d.sourcePath) return ['manual', 'daily'].includes(d.noticeType);
    if (!(d.sourcePath.startsWith('amzInventory/concamarise/logs/') || d.sourcePath.startsWith(w.QUEUE + '/'))) return false;
    const source = await db.doc(d.sourcePath).get();
    if (!source.exists) return false;
    if (d.noticeType === 'fba') return !!p.summarizeFba(source.data(), source.id);
    if (d.noticeType !== 'write' || !w.summarize(source.data(), source.id) ||
        w.incarnation(source.createTime) !== d.sourceIncarnation || w.quantitySignature(source.data()) !== d.sourceQuantity) return false;
    const [done, allowlist] = await db.getAll(db.doc(w.DONE + '/' + source.id), db.doc(w.ALLOWLIST));
    if (done.exists || !w.isAllowed(source.data(), new Set(allowlist.data()?.keys || []))) return false;
    if (source.data().lineKey) {
      const finished = await db.collection('liquidProdHistory').where('concludedLineKeys', 'array-contains', source.data().lineKey).limit(1).get();
      if (!finished.empty) return false;
    }
    return true;
  }
  async function poll(body) {
    const allowedStates = ['UNPAIRED', 'PAIRING', 'READY', 'DISCONNECTED', 'RESOURCE_PAUSED', 'ERROR'];
    const state = allowedStates.includes(body.state) ? body.state : 'ERROR';
    const configRef = db.doc(CONFIG);
    await db.runTransaction(async tx => {
      const snap = await tx.get(configRef), c = snap.data() || {};
      if (c.state !== state || clock() - p.millis(c.heartbeatAt) > 240000) tx.set(configRef, {
        state, heartbeatAt: F.serverTimestamp(), version: '1.0.0', ...(!snap.exists ? { enabled: false } : {}),
      }, { merge: true });
    });
    const config = (await configRef.get()).data() || {};
    if (state !== 'READY') return { jobs: [], enabled: config.enabled === true };
    await importNew(config);
    // Expired leases may be retried only before begin. SENDING is never sent twice.
    const inflight = await db.collection(DELIVERIES).where('status', 'in', ['LEASED', 'SENDING']).limit(50).get();
    for (const d of inflight.docs) if (p.millis(d.data().leaseUntil) < clock()) {
      await db.runTransaction(async tx => {
        const latest = await tx.get(d.ref), x = latest.data();
        if (!x || p.millis(x.leaseUntil) >= clock() || !['LEASED', 'SENDING'].includes(x.status)) return;
        tx.update(d.ref, { status: x.status === 'SENDING' ? 'UNKNOWN' : 'PENDING', updatedAt: F.serverTimestamp() });
      });
    }
    const candidates = await db.collection(DELIVERIES).where('status', '==', 'PENDING').limit(50).get();
    for (const candidate of candidates.docs) {
      const job = await db.runTransaction(async tx => {
        const [snap, cfg] = await tx.getAll(candidate.ref, configRef), d = snap.data(), current = cfg.data() || {};
        if (!d || d.status !== 'PENDING') return null;
        if (p.millis(d.expiresAt) <= clock() || (d.kind !== 'test' && p.millis(d.occurredAt) < p.millis(current.activatedAt))) {
          tx.update(candidate.ref, { status: 'EXPIRED', updatedAt: F.serverTimestamp() }); return null;
        }
        if (d.kind !== 'test' && !current.enabled) return null;
        const token = randomUUID();
        tx.update(candidate.ref, { status: 'LEASED', token, leaseUntil: T.fromMillis(clock() + 120000) });
        return { id: candidate.id, token, phone: d.phone };
      });
      if (job) return { jobs: [job], enabled: config.enabled === true };
    }
    return { jobs: [], enabled: config.enabled === true };
  }
  async function begin(body) {
    const ref = db.doc(DELIVERIES + '/' + body.id), first = await ref.get();
    if (!first.exists) throw problem(404, 'Invio non trovato.');
    const a = await account(first.data().uid);
    const validSource = await sourceValid(body.id, first.data());
    return db.runTransaction(async tx => {
      const [snap, config, recipient, email] = await tx.getAll(ref, db.doc(CONFIG),
        db.doc(RECIPIENTS + '/' + first.data().uid), db.doc(EMAIL_RECIPIENTS + '/' + first.data().uid));
      const d = snap.data(), cfg = config.data() || {}, r = recipient.data();
      if (d.status !== 'LEASED' || d.token !== body.token || p.millis(d.leaseUntil) <= clock()) {
        throw problem(409, 'Invio non disponibile.');
      }
      const allowed = (d.kind === 'test' || cfg.enabled) && validSource && p.millis(d.expiresAt) > clock() &&
        r?.revision === d.revision && r?.phone === d.phone &&
        p.eligible(r, email.data(), a.user, a.directory, p.millis(d.occurredAt), d.kind === 'test' ? 1 : p.millis(cfg.activatedAt));
      if (!allowed) { tx.update(ref, { status: 'CANCELLED', updatedAt: F.serverTimestamp() }); return { cancelled: true }; }
      tx.update(ref, { status: 'SENDING', startedAt: F.serverTimestamp(), leaseUntil: T.fromMillis(clock() + 120000) });
      return { id: body.id, phone: d.phone, text: d.text };
    });
  }
  async function complete(body) {
    if (!['SENT', 'UNKNOWN', 'REJECTED'].includes(body.outcome) ||
        (body.outcome === 'SENT' && (typeof body.messageId !== 'string' || body.messageId.length > 180 || !body.messageId))) {
      throw problem(400, 'Esito non valido.');
    }
    const ref = db.doc(DELIVERIES + '/' + body.id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref), d = snap.data();
      if (!d || d.token !== body.token) throw problem(409, 'Invio non disponibile.');
      if (d.status === body.outcome) return;
      if (!['SENDING', 'UNKNOWN'].includes(d.status) && !(d.status === 'LEASED' && ['REJECTED', 'UNKNOWN'].includes(body.outcome))) {
        throw problem(409, 'Esito non applicabile.');
      }
      const recipientRef = db.doc(RECIPIENTS + '/' + d.uid), recipient = await tx.get(recipientRef);
      const sentAt = body.sentAt && Number.isFinite(body.sentAt) && body.sentAt >= p.millis(d.startedAt) - 60000 && body.sentAt <= clock() + 60000 ? T.fromMillis(body.sentAt) : F.serverTimestamp();
      tx.update(ref, { status: body.outcome, updatedAt: F.serverTimestamp(), text: F.delete(),
        ...(body.outcome === 'SENT' ? { messageId: body.messageId, sentAt } : {}) });
      if (recipient.exists && recipient.data().revision === d.revision && recipient.data().phone === d.phone && p.millis(recipient.data().lastOccurredAt) <= p.millis(d.occurredAt)) tx.set(recipientRef, {
        lastStatus: body.outcome, lastOccurredAt: d.occurredAt, lastChannel: d.channel,
        ...(body.outcome === 'SENT' ? { lastSentAt: sentAt, lastMessageId: body.messageId, lastDeliveredAt: F.delete(), lastReadAt: F.delete() } : {}),
      }, { merge: true });
      if (body.outcome === 'SENT' && d.kind === 'test') tx.set(db.doc(CONFIG), { lastTestSentAt: F.serverTimestamp() }, { merge: true });
    });
    return { ok: true };
  }
  async function receipt(body) {
    if (![2, 3].includes(body.ack) || typeof body.messageId !== 'string' || body.messageId.length > 180 ||
        !Number.isFinite(body.deliveredAt) || body.deliveredAt <= 0 || body.deliveredAt > clock() + 60000 ||
        (body.ack === 3 && (!Number.isFinite(body.readAt) || body.readAt < body.deliveredAt || body.readAt > clock() + 60000))) {
      throw problem(400, 'Conferma non valida.');
    }
    const ref = db.doc(DELIVERIES + '/' + body.id);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref), d = snap.data();
      if (!d || d.token !== body.token || d.status !== 'SENT' || d.messageId !== body.messageId ||
          body.deliveredAt < p.millis(d.startedAt) - 60000) throw problem(409, 'Conferma non applicabile.');
      const recipientRef = db.doc(RECIPIENTS + '/' + d.uid), recipient = await tx.get(recipientRef), r = recipient.data();
      const deliveredAt = d.deliveredAt || T.fromMillis(body.deliveredAt);
      const readAt = d.readAt || (body.ack === 3 ? T.fromMillis(body.readAt) : null);
      tx.update(ref, { deliveredAt, ...(readAt ? { readAt } : {}), receiptReportedAt: F.serverTimestamp() });
      if (r?.lastMessageId === body.messageId && r?.phone === d.phone && r?.revision === d.revision) {
        tx.set(recipientRef, { lastDeliveredAt: deliveredAt, ...(readAt ? { lastReadAt: readAt } : {}) }, { merge: true });
      }
    });
    return { ok: true };
  }
  async function worker(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem(400, 'Richiesta non valida.');
    if (body.action === 'poll') return poll(body);
    if (!validId(body.id) || !/^[a-f0-9-]{36}$/.test(body.token || '')) throw problem(400, 'Invio non valido.');
    if (body.action === 'begin') return begin(body);
    if (body.action === 'complete') return complete(body);
    if (body.action === 'receipt') return receipt(body);
    throw problem(400, 'Richiesta non valida.');
  }
  return { admin, worker, status };
}
module.exports = { createService, CONFIG, RECIPIENTS, DELIVERIES };
