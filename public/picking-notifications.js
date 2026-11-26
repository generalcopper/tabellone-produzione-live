export function createPickingNotifications({ root, getUser, isActive }) {
  const endpoint = 'https://europe-west1-tabellone-produzione-liv-e313e.cloudfunctions.net/pickingEmailApi';
  const list = root.querySelector('[data-mail-list]');
  const status = root.querySelector('[data-mail-status]');
  const refresh = root.querySelector('[data-mail-refresh]');
  const send = root.querySelector('[data-mail-send]');
  const rows = new Map();
  let owner = '', session = 0, epoch = 0, timer = null, loading = false, sending = false, requestId = '', editing = null, waSystem = {};
  const node = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const time = value => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  const emptyWa = () => ({ enabled: false, phone: '', revision: 0 });
  const health = node('p', 'pickingChannelHealth'); health.setAttribute('data-wa-status', '');
  const head = root.querySelector('.pickingMailHead');
  (head || list).before(health);
  head?.replaceChildren(node('span', '', 'Dipendente'), node('span', '', 'Email'), node('span', '', 'WhatsApp'));
  const dialog = node('dialog', 'pickingContactDialog');
  const form = node('form', 'pickingContactForm');
  const title = node('h3', '', 'Contatti del dipendente'); title.id = 'pickingContactTitle';
  dialog.setAttribute('aria-labelledby', title.id);
  const person = node('p', 'pickingContactPerson');
  const hint = node('p', 'pickingContactHint', 'Contatti per gli avvisi di Picking.');
  const emailLabel = node('label', '', 'Email');
  const email = node('input'); email.type = 'email'; email.autocomplete = 'email'; email.maxLength = 254; email.name = 'notificationEmail';
  emailLabel.append(email);
  const phoneLabel = node('label', '', 'Numero WhatsApp');
  const phone = node('input'); phone.type = 'tel'; phone.inputMode = 'tel'; phone.autocomplete = 'tel'; phone.maxLength = 40; phone.placeholder = '+39 …'; phone.name = 'notificationPhone';
  phoneLabel.append(phone);
  const error = node('p', 'pickingContactError'); error.setAttribute('role', 'alert');
  const actions = node('div', 'pickingContactActions');
  const cancel = node('button', '', 'Annulla'); cancel.type = 'button';
  const save = node('button', 'pickingContactSave', 'Salva'); save.type = 'submit';
  actions.append(cancel, save); form.append(title, person, hint, emailLabel, phoneLabel, error, actions); dialog.append(form); root.append(dialog);
  function feedback(text, bad = false) { status.textContent = text; status.classList.toggle('pickingMailError', bad); }
  function busy() { return loading || sending || [...rows.values()].some(r => r.saving); }
  function controls() {
    const blocked = busy(); refresh.disabled = blocked || !!editing;
    if (send) { send.disabled = blocked || !!editing || ![...rows.values()].some(r => r.data.available && (r.data.enabled || (r.data.whatsapp.enabled && waSystem.enabled))); send.textContent = sending ? 'Invio…' : 'Invia riepilogo'; }
    for (const r of rows.values()) {
      r.mail.disabled = blocked || (!r.data.available && !r.data.enabled);
      r.wa.disabled = blocked || (!r.data.available && !r.data.whatsapp.enabled);
    }
    save.disabled = blocked; cancel.disabled = blocked;
    save.textContent = editing?.row.saving ? 'Salvataggio…' : 'Salva';
  }
  async function request(body) {
    const user = getUser(), expected = session;
    if (!user || user.uid !== owner) throw Error('Accedi di nuovo a Picking.');
    const token = await user.getIdToken();
    if (expected !== session || getUser()?.uid !== owner) throw Error('La sessione è cambiata.');
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(30000) });
    const result = await response.json();
    if (expected !== session || getUser()?.uid !== owner) throw Error('La sessione è cambiata.');
    if (!response.ok) throw Object.assign(Error(result.error || 'Operazione non riuscita.'), { status: response.status });
    return result;
  }
  function paint(row, data = {}) {
    row.data = { ...row.data, ...data, whatsapp: { ...(row.data.whatsapp || emptyWa()), ...(data.whatsapp || {}) } };
    const u = row.data, w = u.whatsapp;
    row.name.textContent = u.name;
    row.contact.textContent = [u.email, w.phone].filter(Boolean).join(' · ');
    row.mail.checked = !!u.enabled; row.wa.checked = !!w.enabled;
    row.emailLog.textContent = 'Email · ' + (u.lastSentAt ? 'Ultimo invio ' + time(u.lastSentAt) : 'Nessun invio');
    row.waLog.textContent = 'WhatsApp · ' + (w.lastSentAt ? 'Ultimo invio ' + time(w.lastSentAt) : 'Nessun invio') +
      (w.lastSentAt ? (w.lastReadAt ? ' · Letto ' + time(w.lastReadAt) : w.lastDeliveredAt ? ' · Consegnato · Lettura non confermata' : ' · Lettura non confermata') : '');
    row.waLog.title = w.lastReadAt ? 'Conferma di lettura comunicata da WhatsApp.' : '';
    const labels = { PENDING: 'Invio in attesa', PROCESSING: 'Invio in corso', RETRY: 'Invio in attesa', ERROR: 'Invio non riuscito', UNKNOWN: 'Esito da verificare', REJECTED: 'Numero non disponibile su WhatsApp' };
    row.detail.textContent = row.saving ? 'Salvataggio…' : u.reason || labels[w.lastStatus] || labels[u.lastStatus] || '';
    row.detail.classList.toggle('pickingMailError', !u.reason && ['ERROR', 'UNKNOWN', 'REJECTED'].some(s => [u.lastStatus, w.lastStatus].includes(s)));
  }
  function apply(result, full = false) {
    if (result.whatsapp) {
      const w = result.whatsapp; waSystem = w;
      health.textContent = !w.online ? 'WhatsApp non raggiungibile' : w.state === 'READY' ? (w.enabled ? 'WhatsApp collegato' : 'WhatsApp collegato · avvisi in pausa') :
        w.state === 'RESOURCE_PAUSED' ? 'WhatsApp temporaneamente in pausa' : 'WhatsApp da collegare';
    }
    if (full) {
      for (const [uid, row] of rows) if (!(result.users || []).some(u => u.uid === uid)) { row.item.remove(); rows.delete(uid); }
      list.querySelector('.pickingMailEmpty')?.remove();
    }
    for (const u of result.users || []) {
      let row = rows.get(u.uid);
      if (!row && !full) continue;
      if (!row) {
        const item = node('div', 'pickingMailRow'); item.dataset.recipientUid = u.uid;
        const identity = node('div', 'pickingMailIdentity');
        const name = node('button', 'pickingMailName'); name.type = 'button';
        const contact = node('span', 'pickingMailAddress');
        const emailLog = node('span', 'pickingMailDetail'), waLog = node('span', 'pickingMailDetail'), detail = node('span', 'pickingMailDetail pickingMailState');
        identity.append(name, contact, emailLog, waLog, detail);
        const flag = channel => { const label = node('label', 'pickingChannelFlag'); const checkbox = node('input', 'pickingMailCheckbox'); checkbox.type = 'checkbox';
          checkbox.setAttribute('aria-label', channel + ' per ' + u.name); label.append(checkbox, node('span', '', channel)); return { label, checkbox }; };
        const mail = flag('Email'), wa = flag('WhatsApp'); item.append(identity, mail.label, wa.label); list.append(item);
        row = { item, name, contact, emailLog, waLog, detail, mail: mail.checkbox, wa: wa.checkbox, saving: false, data: { whatsapp: emptyWa() } };
        rows.set(u.uid, row);
        name.addEventListener('click', () => openContact(row));
        item.addEventListener('click', e => { if (!e.target.closest('button,input,label')) openContact(row); });
        mail.checkbox.addEventListener('change', () => toggle(row, 'enabled', mail.checkbox.checked));
        wa.checkbox.addEventListener('change', () => toggle(row, 'whatsappEnabled', wa.checkbox.checked));
      }
      if (!row.saving) paint(row, u);
    }
    if (full && !rows.size) list.append(node('div', 'pickingMailEmpty', 'Nessun dipendente disponibile.'));
    controls();
  }
  function payload(row, changes = {}) {
    return { action: 'saveRecipient', uid: row.data.uid, email: row.data.email || '', phone: row.data.whatsapp.phone || '',
      enabled: !!row.data.enabled, whatsappEnabled: !!row.data.whatsapp.enabled,
      revision: row.data.revision || 0, whatsappRevision: row.data.whatsapp.revision || 0, ...changes };
  }
  function openContact(row, changes = {}) {
    if (busy() || editing) return;
    editing = { row, base: payload(row, changes) }; person.textContent = row.data.name;
    email.value = row.data.email || ''; phone.value = row.data.whatsapp.phone || '';
    email.required = editing.base.enabled; phone.required = editing.base.whatsappEnabled;
    error.textContent = ''; phone.setCustomValidity(''); email.setCustomValidity('');
    hint.textContent = changes.whatsappEnabled && !phone.value ? 'Inserisci il numero per attivare WhatsApp.' : 'Contatti per gli avvisi di Picking. L’accesso del dipendente non cambia.';
    dialog.showModal(); controls(); (changes.whatsappEnabled && !phone.value ? phone : email).focus();
  }
  function closeContact() { if (editing?.row.saving) return; const row = editing?.row; editing = null; dialog.close(); email.value = ''; phone.value = ''; error.textContent = ''; if (row) paint(row); controls(); row?.name.focus(); }
  cancel.addEventListener('click', closeContact);
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeContact(); });
  dialog.addEventListener('click', e => { if (e.target === dialog) { const b = dialog.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closeContact(); } });
  phone.addEventListener('input', () => phone.setCustomValidity(''));
  async function persist(row, body, fromDialog = false) {
    const expected = session; epoch++; row.saving = true; paint(row); controls();
    if (fromDialog) error.textContent = ''; else feedback('Salvataggio…');
    try {
      const result = await request(body); if (expected !== session) return;
      row.saving = false; apply(result, true);
      if (fromDialog) closeContact();
      feedback('Salvato.');
    } catch (e) {
      if (expected !== session) return;
      row.saving = false; paint(row);
      const message = e.status === 409 ? 'Dati modificati nel frattempo. Chiudi e premi Aggiorna prima di riprovare.' : e.status ? e.message : 'Salvataggio da verificare. Premi Aggiorna prima di riprovare.';
      if (fromDialog) error.textContent = message; else feedback(message, true);
    } finally { if (expected === session) controls(); }
  }
  function toggle(row, channel, enabled) {
    if (enabled && ((channel === 'enabled' && !row.data.email) || (channel === 'whatsappEnabled' && !row.data.whatsapp.phone))) {
      paint(row); openContact(row, { [channel]: true }); return;
    }
    void persist(row, payload(row, { [channel]: enabled }));
  }
  form.addEventListener('submit', e => {
    e.preventDefault(); if (!editing || busy()) return;
    const phoneValue = phone.value.trim(), compact = phoneValue.replace(/[ ().-]/g, '').replace(/^00/, '+');
    if (phoneValue && !/^(?:\+[1-9]\d{7,14}|3\d{8,9})$/.test(compact)) { phone.setCustomValidity('Inserisci un numero valido, ad esempio +39 348 1234567.'); phone.reportValidity(); return; }
    if (!form.reportValidity()) return;
    void persist(editing.row, { ...editing.base, email: email.value.trim(), phone: phoneValue }, true);
  });
  async function load() {
    if (busy() || editing) return;
    const expected = session, generation = ++epoch; loading = true; controls(); feedback('Caricamento…');
    try { const result = await request({ action: 'list' }); if (expected !== session || generation !== epoch) return; apply(result, true); feedback('Scegli i canali. Tocca un dipendente per modificare i contatti.'); }
    catch (e) { if (expected === session) feedback(e.message, true); }
    finally { if (expected === session) { loading = false; controls(); } }
  }
  async function updateStatus() {
    if (!isActive() || document.hidden || busy()) return;
    const expected = session, generation = epoch;
    try { const result = await request({ action: 'status' }); if (expected === session && generation === epoch) apply(result); } catch (_) {}
  }
  refresh.addEventListener('click', load);
  send?.addEventListener('click', async () => {
    if (send.disabled) return;
    const expected = session; epoch++; sending = true; if (!requestId) requestId = crypto.randomUUID(); controls(); feedback('Preparazione del riepilogo…');
    try {
      const result = await request({ action: 'sendSummary', requestId }); if (expected !== session) return;
      requestId = ''; apply(result); feedback(result.alreadyQueued ? 'Riepilogo già richiesto.' : 'Riepilogo in invio a ' + result.queuedCount + (result.queuedCount === 1 ? ' destinatario.' : ' destinatari.'));
    } catch (e) { if (expected === session) { if (e.status && e.status < 500) requestId = ''; feedback(e.status ? e.message : 'Conferma non ricevuta. Premi di nuovo Invia riepilogo.', true); } }
    finally { if (expected === session) { sending = false; controls(); } }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && isActive()) void updateStatus(); });
  return {
    open() { const uid = getUser()?.uid || ''; if (owner !== uid) this.reset(); owner = uid; void load(); if (!timer) timer = setInterval(updateStatus, 30000); },
    close() { if (timer) clearInterval(timer); timer = null; if (editing && !editing.row.saving) closeContact(); },
    reset() { session++; epoch++; if (timer) clearInterval(timer); timer = null; owner = ''; loading = false; sending = false; requestId = ''; editing = null; waSystem = {};
      if (dialog.open) dialog.close(); email.value = ''; phone.value = ''; person.textContent = ''; error.textContent = ''; rows.clear(); list.replaceChildren(); health.textContent = ''; feedback(''); controls(); },
  };
}
