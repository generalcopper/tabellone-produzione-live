'use strict';
async function bounded(promise, timeoutMs) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(Error('Receipt timeout'), { receiptTimeout: true })), timeoutMs);
  })]); } finally { clearTimeout(timer); }
}
async function reconcile({ journal, provider, now = Date.now, timeoutMs = 5000, onTimeout = async () => {} }) {
  let recovered = 0;
  const started = now();
  for (const row of journal.receiptCandidates(started)) {
    if (now() - started > 12000) break;
    try {
      const message = await bounded(provider.getMessageById(row.message_id), timeoutMs);
      if (!message?.fromMe || message.id?._serialized !== row.message_id) continue;
      if (message.ack >= 3) { journal.receipt(row.message_id, 3, now()); recovered++; continue; }
      if (message.ack === 2) journal.receipt(row.message_id, 2, now());
      const info = await bounded(message.getInfo(), timeoutMs);
      const times = entries => (Array.isArray(entries) ? entries : []).map(e => Number(e.t) * 1000)
        .filter(t => Number.isFinite(t) && t > 0 && t >= message.timestamp * 1000 - 60000 && t <= now() + 60000);
      const read = times(info?.read), delivered = times(info?.delivery);
      if (read.length) {
        const readAt = Math.min(...read), deliveredAt = Math.min(readAt, ...delivered);
        journal.receipt(row.message_id, 3, readAt, deliveredAt); recovered++;
      } else if (delivered.length) journal.receipt(row.message_id, 2, Math.min(...delivered));
    } catch (error) {
      if (error.receiptTimeout) { await onTimeout(); break; }
    } finally { journal.receiptChecked(row.message_id, now()); }
  }
  return recovered;
}
module.exports = { reconcile };
