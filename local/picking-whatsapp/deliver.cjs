'use strict';
async function bounded(promise, ms) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('Provider timeout'), { providerTimeout: true })), ms);
  })]); } finally { clearTimeout(timer); }
}
async function deliver({ job, journal, provider, api, onTimeout = async () => {} }) {
  if (!journal.reserve(job.id, job.token)) return;
  try {
    const number = await bounded(provider.getNumberId(job.phone.replace(/^\+/, '')), 30000);
    if (!number) { journal.outcome(job.id, 'REJECTED'); return; }
    const payload = await api({ action: 'begin', id: job.id, token: job.token });
    if (payload.cancelled) { journal.acknowledged(job.id); return; }
    if (payload.phone !== job.phone || typeof payload.text !== 'string' || !payload.text) {
      journal.outcome(job.id, 'UNKNOWN'); return;
    }
    journal.sending(job.id);
    // No retry around sendMessage: a rejected promise can still mean WhatsApp accepted it.
    const sent = await bounded(provider.sendMessage(number._serialized, payload.text, { sendSeen: false, linkPreview: false }), 60000);
    if (sent?.id?._serialized) journal.outcome(job.id, 'SENT', sent.id._serialized);
    else journal.outcome(job.id, 'UNKNOWN');
  } catch (error) { journal.outcome(job.id, 'UNKNOWN'); if (error.providerTimeout) await onTimeout(); }
}
module.exports = { deliver };
