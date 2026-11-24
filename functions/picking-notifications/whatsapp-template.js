'use strict';

const MAX_LENGTH = 6000;
const plain = value => String(value ?? '').replace(/(?:https?:\/\/|www\.)\S+/gi, '')
  .replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
const title = value => { const s = plain(value).replace(/[*~`]/g, ''); return s.length > 150 ? s.slice(0, 149).trimEnd() + '…' : s; };
const number = value => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3, useGrouping: true }).format(value);
const quantity = row => (row.qty === null ? plain(row.qtyText) : number(row.qty)) + (row.unit ? ' ' + plain(row.unit) : '');

// Whole blocks only. The affected item must remain visible even in a long queue;
// its original number and the gaps preserve the actual production order.
function pack(header, rows, requiredIndex = -1) {
  const selected = new Set(requiredIndex >= 0 && requiredIndex < rows.length ? [requiredIndex] : []);
  function compose() {
    const blocks = [header]; let omitted = 0;
    for (let i = 0; i < rows.length; i++) {
      if (!selected.has(i)) { omitted++; continue; }
      if (omitted) { blocks.push('… ' + omitted + ' voci non riportate.'); omitted = 0; }
      blocks.push(rows[i]);
    }
    if (omitted) blocks.push('… ' + omitted + ' voci non riportate.');
    return blocks.filter(Boolean).join('\n\n');
  }
  for (let i = 0; i < rows.length; i++) {
    if (selected.has(i)) continue;
    selected.add(i);
    if (compose().length > MAX_LENGTH) { selected.delete(i); break; }
  }
  return compose();
}

function isNewReference(ref, sourceId, label) {
  return sourceId ? ref.key === 'FBA:' + sourceId : !!label && ref.label === label;
}
function fbaBlock(row, options) {
  const fresh = options.type === 'fba' && (row.references || []).some(r => isNewReference(r, options.sourceId, options.label));
  const refs = (row.references || []).filter(r => plain(r.label) && r.label !== 'Preparazione FBA');
  return ['• *' + title(row.title || row.sku) + '* — *' + number(row.qty) + ' pz*' + (fresh ? ' · *NUOVO*' : ''),
    ...(row.sku ? ['  SKU: ' + plain(row.sku)] : []),
    ...refs.slice(0, 8).map(r => '  ' + plain(r.label) + ': ' + number(r.qty) + ' pz' +
      (fresh && isNewReference(r, options.sourceId, options.label) ? ' · NUOVO' : '')),
    ...(refs.length > 8 ? ['  Altri ' + (refs.length - 8) + ' riferimenti.'] : []),
  ].join('\n');
}
function fbmBlocks(products) {
  const orders = new Map(), unassigned = [];
  for (const row of products) {
    const refs = (row.references || []).filter(r => plain(r.label));
    if (!refs.length) unassigned.push(row);
    for (const ref of refs) {
      const key = ref.key || ref.label;
      if (!orders.has(key)) orders.set(key, { label: plain(ref.label), rows: [] });
      orders.get(key).rows.push({ ...row, qty: ref.qty });
    }
  }
  const productLine = row => '• *' + title(row.title || row.sku) + '* — *' + number(row.qty) + ' pz*' +
    (row.sku ? '\n  SKU: ' + plain(row.sku) : '');
  return [...orders.values()].flatMap(order => {
    const heading = '*Ordine ' + order.label + '*', blocks = [];
    let block = heading;
    for (const row of order.rows) {
      const line = productLine(row);
      if (block.length + line.length > 4500) { blocks.push(block); block = heading; }
      block += '\n' + line;
    }
    blocks.push(block);
    return blocks;
  }).concat(unassigned.map(productLine));
}

function renderWhatsApp(options) {
  const { type, details, sourceId, changeKind = 'added' } = options;
  const channel = options.channel === 'RIEPILOGO' ? '' : options.channel || (type === 'write' ? 'WRITE' : type === 'fba' ? 'FBA' : '');
  if (channel === 'WRITE') {
    const rows = details.products, affected = rows.findIndex(r => r.id === sourceId);
    const marker = changeKind === 'quantity' ? 'QUANTITÀ AGGIORNATA' : 'NUOVO';
    return pack('*Linea liquidi · Da produrre*', rows.map((r, i) =>
      (i + 1) + '. *' + title(r.title || r.sku) + '* — *' + quantity(r) + '*' +
      (i === affected ? ' · *' + marker + '*' : '') +
      (r.sku ? '\n   Codice: ' + plain(r.sku) : '')), affected);
  }
  if (channel === 'FBA') {
    const rows = [...details.fba.products];
    if (type === 'fba') rows.sort((a, b) => Number(b.references?.some(r => isNewReference(r, sourceId, options.label))) -
      Number(a.references?.some(r => isNewReference(r, sourceId, options.label))));
    return pack('*FBA da preparare*', rows.map(row => fbaBlock(row, options)));
  }
  if (channel === 'FBM') return pack('*Ordini FBM da preparare*', fbmBlocks(details.fbm.products));
  throw new Error('Specificare un solo modello WhatsApp: FBA, FBM o WRITE.');
}

function renderWhatsAppNotices(options) {
  const channels = options.type === 'write' ? ['WRITE'] : options.type === 'fba' ? ['FBA'] :
    ['FBA', 'FBM'].filter(channel => options.details[channel.toLowerCase()].products.length);
  return channels.map(channel => ({ channel, text: renderWhatsApp({ ...options, channel }) }));
}

// Compatibility only for notices queued by the previous email producer.
function legacyWhatsApp(message, channel) {
  const raw = typeof message?.text === 'string' ? message.text.replace(/\r/g, '') : '';
  if (!raw.trim()) return '';
  const start = channel === 'WRITE' ? raw.indexOf('Da produrre, in ordine di coda:') : raw.indexOf('PRODOTTI FBA DA PREPARARE');
  const lines = (start >= 0 ? raw.slice(start) : raw).split('\n').filter(line =>
    !/^\s*(?:Apri\b|PROCEDURA\b|\d+\. (?:Aprire|Prelevare|Raggruppare|Preparare|Registrare)\b)/i.test(line))
    .map(plain).filter(Boolean);
  return pack(channel === 'WRITE' ? '*Linea liquidi · Da produrre*' : '*Da preparare*', lines);
}

module.exports = { renderWhatsApp, renderWhatsAppNotices, legacyWhatsApp, MAX_LENGTH };
