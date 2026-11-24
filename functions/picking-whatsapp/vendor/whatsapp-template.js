'use strict';

const MAX_LENGTH = 6000;
const plain = value => String(value ?? '').replace(/(?:https?:\/\/|www\.)\S+/gi, '')
  .replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
const title = value => { const s = plain(value).replace(/[*~`]/g, ''); return s.length > 150 ? s.slice(0, 149).trimEnd() + '…' : s; };
const number = value => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3, useGrouping: true }).format(value);
const count = (n, one, many) => number(n) + ' ' + (n === 1 ? one : many);
const quantity = row => (row.qty === null ? plain(row.qtyText) : number(row.qty)) + (row.unit ? ' ' + plain(row.unit) : '');
const stamp = value => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));

// Keep complete product blocks and truthful totals. Large lists share the space
// between channels; no product, quantity or reference is cut halfway through.
function pack(header, sections) {
  const used = sections.map(s => s.rows.length);
  function compose() {
    return [header, ...sections.map((s, i) => [s.heading, ...s.rows.slice(0, used[i]),
      ...(used[i] < s.rows.length ? [(s.rows.length - used[i] === 1 ? 'Altra ' : 'Altre ') + count(s.rows.length - used[i], 'riga', 'righe') + ' in attesa.'] : [])
    ].filter(Boolean).join('\n\n'))].filter(Boolean).join('\n\n');
  }
  let text = compose();
  if (text.length <= MAX_LENGTH) return text;
  used.fill(0);
  const stopped = new Set();
  for (;;) {
    let added = false;
    sections.forEach((s, i) => {
      if (stopped.has(i) || used[i] >= s.rows.length) return;
      used[i]++;
      if (compose().length > MAX_LENGTH) { used[i]--; stopped.add(i); }
      else added = true;
    });
    if (!added) return compose();
  }
}

function productBlock(row, channel) {
  const refs = (row.references || []).filter(r => plain(r.label) && r.label !== 'Preparazione FBA');
  return ['• *' + title(row.title || row.sku) + '* — *' + number(row.qty) + ' pz*',
    ...(row.sku ? ['  SKU: ' + plain(row.sku)] : []),
    ...refs.slice(0, 8).map(r => '  ' + (channel === 'FBA' ? 'Sped. ' : 'Ordine ') + plain(r.label) + ': ' + number(r.qty) + ' pz'),
    ...(refs.length > 8 ? ['  Altri ' + (refs.length - 8) + ' riferimenti.'] : []),
  ].join('\n');
}

function renderWhatsApp({ type = 'manual', label = '', channel, details, sourceId, changeKind = 'added', generatedAt = Date.now() }) {
  if (channel === 'WRITE' || type === 'write') {
    const rows = details.products, affected = rows.findIndex(r => r.id === sourceId);
    const changed = changeKind === 'quantity';
    const header = ['*LG Trading · Linea automatica liquidi*',
      '*' + (changed ? 'Quantità aggiornata' : 'Nuovo prodotto in coda') + '*', stamp(generatedAt)];
    if (affected >= 0) {
      const row = rows[affected];
      header.push('', '*' + title(row.title || row.sku) + '*',
        'Quantità da produrre: *' + quantity(row) + '*',
        ...(row.sku ? ['Codice: ' + plain(row.sku)] : []),
        'Posizione in coda: *' + (affected + 1) + '*');
    }
    const totals = (details.totals || []).map(r => quantity(r)).join(' · ');
    header.push('', '*Totale in coda:* ' + count(rows.length, 'riga', 'righe') + (totals ? ' · ' + totals : ''));
    return pack(header.join('\n'), [{ heading: '*Da produrre, in ordine di coda*', rows: rows.map((r, i) =>
      (i + 1) + '. *' + title(r.title || r.sku) + '* — *' + quantity(r) + '*' +
      (i === affected ? ' · ' + (changed ? 'QUANTITÀ AGGIORNATA' : 'NUOVO') : '') +
      (r.sku ? '\n   Codice: ' + plain(r.sku) : '')) }]);
  }
  const { fba, fbm } = details;
  const heading = type === 'fba' ? 'FBA · Nuova preparazione' : type === 'daily' ? 'Riepilogo delle 08:00' : 'Riepilogo lavori in attesa';
  const header = ['*LG Trading · Picking Concamarise*', '*' + heading + '*', stamp(generatedAt),
    ...(type === 'fba' && plain(label) && label !== 'Preparazione FBA' ? ['', 'Nuova spedizione: *' + title(label) + '*'] : []), '',
    '*FBA:* ' + count(fba.totalQty, 'pezzo', 'pezzi') + ' · ' + count(fba.skuCount, 'prodotto', 'prodotti'),
    '*FBM:* ' + count(fbm.orderCount, 'ordine', 'ordini') + ' · ' + count(fbm.totalQty, 'pezzo', 'pezzi') + ' · ' + count(fbm.skuCount, 'prodotto', 'prodotti'),
    ...(!fba.totalQty && !fbm.totalQty ? ['', 'Nessun lavoro in attesa.'] : [])];
  const sections = [];
  if (fba.products.length) {
    const products = [...fba.products];
    if (type === 'fba') products.sort((a, b) => Number(b.references?.some(r => r.label === label)) - Number(a.references?.some(r => r.label === label)));
    sections.push({ heading: '*FBA da preparare · PRIORITÀ*', rows: products.map(r => productBlock(r, 'FBA')) });
  }
  if (fbm.products.length) sections.push({ heading: '*FBM da preparare*', rows: fbm.products.map(r => productBlock(r, 'FBM')) });
  return pack(header.join('\n'), sections);
}

// Compatibility for a message queued by a previous email producer during rollout.
function legacyWhatsApp(message, channel) {
  const raw = typeof message?.text === 'string' ? message.text.replace(/\r/g, '') : '';
  if (!raw.trim()) return '';
  const start = channel === 'WRITE' ? raw.indexOf('Da produrre, in ordine di coda:') : raw.indexOf('PRODOTTI FBA DA PREPARARE');
  const lines = (start >= 0 ? raw.slice(start) : raw).split('\n').filter(line =>
    !/^\s*(?:Apri\b|PROCEDURA\b|\d+\. (?:Aprire|Prelevare|Raggruppare|Preparare|Registrare)\b)/i.test(line))
    .map(plain).filter(Boolean);
  const header = '*LG Trading · ' + (channel === 'WRITE' ? 'Linea automatica liquidi' : 'Picking Concamarise') + '*';
  return pack(header, [{ heading: '', rows: lines }]);
}

module.exports = { renderWhatsApp, legacyWhatsApp, MAX_LENGTH };
