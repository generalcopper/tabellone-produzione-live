export function createPickingWhatsApp({ root, getUser, isActive }) {
  const endpoint = 'https://europe-west1-tabellone-produzione-liv-e313e.cloudfunctions.net/pickingWhatsAppApi';
  const node = (tag, text, cls) => { const n = document.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
  const box = node('section', '', 'pickingWaBox');
  const heading = node('h3', 'WhatsApp');
  const intro = node('p', 'Aggiungi WhatsApp agli avvisi email dei dipendenti selezionati. Inserisci il numero, salva e invia una prova dopo il collegamento del telefono.');
  const health = node('p', 'Verifica del collegamento…', 'pickingWaHealth');
  const toggle = node('button', 'Attiva avvisi WhatsApp'); toggle.type = 'button'; toggle.disabled = true;
  const list = node('div', '', 'pickingWaList');
  const feedback = node('p', '', 'pickingMailFeedback'); feedback.setAttribute('role', 'status');
  box.append(heading, intro, health, toggle, list, feedback); root.append(box);
  let generation = 0, owner = '', roster = [], rows = new Map(), busy = false, system = {}, active = false;
  const time = value => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }).format(value);
  const labels = { SENT: 'Inviato a WhatsApp', UNKNOWN: 'Esito da verificare: nessun reinvio automatico',
    REJECTED: 'Numero non disponibile su WhatsApp', CANCELLED: 'Invio annullato', EXPIRED: 'Avviso scaduto' };
  async function request(body) {
    const user = getUser(), expected = generation;
    if (!user || user.uid !== owner) throw Error('Accedi di nuovo a Picking.');
    const token = await user.getIdToken();
    if (expected !== generation || getUser()?.uid !== owner) throw Error('Sessione cambiata.');
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(45000) });
    const result = await response.json();
    if (expected !== generation || getUser()?.uid !== owner) throw Error('Sessione cambiata.');
    if (!response.ok) throw Error(result.error || 'Servizio WhatsApp non disponibile.');
    return result;
  }
  function controls() {
    const connected = system.online && system.state === 'READY';
    toggle.textContent = system.enabled ? 'Metti in pausa WhatsApp' : 'Attiva avvisi WhatsApp';
    toggle.disabled = busy || (!system.enabled && (!connected || !system.lastTestSentAt));
    health.textContent = !system.online ? 'Servizio NUC non raggiungibile. Le email restano attive.' :
      system.state === 'RESOURCE_PAUSED' ? 'WhatsApp in pausa per preservare le risorse del NUC. Le email restano attive.' :
      !connected ? 'In attesa del collegamento con WhatsApp Business sul telefono. Le email restano attive.' :
      system.enabled ? 'WhatsApp collegato · avvisi attivi per i dipendenti abilitati.' :
      system.lastTestSentAt ? 'WhatsApp collegato · prova inviata. Puoi attivare gli avvisi.' : 'WhatsApp collegato · invia una prova prima di attivare gli avvisi.';
    for (const row of rows.values()) {
      const eligible = row.person.available && row.person.enabled;
      row.phone.disabled = busy || (!eligible && !row.data.enabled);
      row.enabled.disabled = busy || (!eligible && !row.data.enabled);
      row.save.disabled = busy || !row.dirty;
      row.test.disabled = busy || !connected || !eligible || !row.data.enabled || row.dirty;
    }
  }
  function apply(result) {
    system = result.system || {};
    const map = new Map((result.users || []).map(x => [x.uid, x]));
    for (const row of rows.values()) {
      const data = map.get(row.person.uid) || { phone: '', enabled: false, revision: 0 };
      if (!row.dirty) { row.data = data; row.phone.value = data.phone; row.enabled.checked = data.enabled; }
      row.detail.textContent = (labels[data.lastStatus] || '') + (data.lastSentAt ? ' · ' + time(data.lastSentAt) : '');
    }
    controls();
  }
  async function action(body, success, row) {
    generation++; // Discard any status response that predates this explicit action.
    const expected = generation; busy = true; feedback.textContent = 'Operazione in corso…'; controls();
    try {
      const result = await request(body);
      if (expected !== generation) return;
      if (row && body.action === 'setRecipient') row.dirty = false;
      if (row && body.action === 'sendTest') row.testRequestId = '';
      apply(result); feedback.textContent = success;
    } catch (e) { if (expected === generation) feedback.textContent = e.message; }
    finally { if (expected === generation) { busy = false; controls(); } }
  }
  toggle.addEventListener('click', () => {
    if (!toggle.disabled) void action({ action: 'setEnabled', enabled: !system.enabled }, system.enabled ? 'Avvisi WhatsApp in pausa.' : 'Avvisi WhatsApp attivati. Nessun invio degli arretrati.');
  });
  return {
    setUsers(users) {
      roster = users; active = true;
      const uid = getUser()?.uid || '';
      if (uid !== owner) { generation++; owner = uid; rows.clear(); }
      list.replaceChildren();
      const previous = rows; rows = new Map();
      for (const person of roster) {
        const item = node('div', '', 'pickingWaRow');
        const identity = node('div', person.name, 'pickingMailName');
        const phone = node('input'); phone.type = 'tel'; phone.inputMode = 'tel'; phone.placeholder = '+39 …'; phone.maxLength = 40;
        phone.autocomplete = 'off'; phone.setAttribute('aria-label', 'Numero WhatsApp di ' + person.name);
        const label = node('label', '', 'pickingWaEnabled');
        const enabled = node('input'); enabled.type = 'checkbox'; label.append(enabled, document.createTextNode('WhatsApp attivo'));
        const save = node('button', 'Salva'); save.type = 'button';
        const test = node('button', 'Invia prova'); test.type = 'button';
        const detail = node('span', '', 'pickingMailDetail');
        item.append(identity, phone, label, save, test, detail); list.append(item);
        const row = { person, phone, enabled, save, test, detail, dirty: false,
          data: previous.get(person.uid)?.data || { revision: 0, phone: '', enabled: false }, testRequestId: '' };
        rows.set(person.uid, row);
        phone.value = row.data.phone; enabled.checked = row.data.enabled;
        const changed = () => { row.dirty = true; controls(); };
        phone.addEventListener('input', changed); enabled.addEventListener('change', changed);
        save.addEventListener('click', () => {
          if (!save.disabled) void action({ action: 'setRecipient', uid: person.uid, phone: phone.value.trim(), enabled: enabled.checked,
            revision: row.data.revision }, 'Impostazioni WhatsApp salvate.', row);
        });
        test.addEventListener('click', () => {
          if (test.disabled) return;
          if (!row.testRequestId) row.testRequestId = crypto.randomUUID();
          void action({ action: 'sendTest', uid: person.uid, requestId: row.testRequestId }, 'Prova in coda. L’esito comparirà dopo l’invio.', row);
        });
      }
      controls();
    },
    async refresh(quiet = false) {
      if (!active || !isActive() || busy || !owner) return;
      const expected = generation;
      try { const result = await request({ action: 'status' }); if (expected === generation) apply(result); }
      catch (e) { if (!quiet && expected === generation) feedback.textContent = e.message; }
    },
    reset() { generation++; owner = ''; active = false; busy = false; system = {}; rows.clear(); list.replaceChildren(); feedback.textContent = ''; controls(); },
  };
}
