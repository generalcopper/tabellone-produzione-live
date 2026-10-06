'use strict';

const text = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
const html = value => text(value).replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(value);
const qty = row => (row.qty === null ? row.qtyText : number(row.qty)) + (row.unit ? ' ' + row.unit : '');

function renderWriteMessage({ details, sourceId, recipientName, generatedAt, url, timeZone }) {
  const subject = 'Produzione Write | Nuovo prodotto in coda';
  const date = new Intl.DateTimeFormat('it-IT', { timeZone, day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(generatedAt));
  const added = details.products.find(row => row.id === sourceId);
  const summary = details.rowCount + (details.rowCount === 1 ? ' prodotto da produrre' : ' prodotti da produrre');
  const totals = details.totals.map(row => number(row.qty) + ' ' + row.unit).join(' · ');
  const rows = details.products.map((row, index) => `<tr${row.id === sourceId ? ' bgcolor="#eef9f0"' : ''}>
<td valign="top" style="padding:13px 8px;border-bottom:1px solid #dce1eb;color:#647083;font-size:13px">${index + 1}</td>
<td valign="top" style="padding:13px 8px;border-bottom:1px solid #dce1eb;overflow-wrap:anywhere;word-break:break-word"><div style="font-size:15px;line-height:1.5;color:#0c101a">${html(row.title)}</div>${row.sku ? '<div style="margin-top:4px;font-size:13px;line-height:1.5;color:#647083">Codice / SKU: ' + html(row.sku) + '</div>' : ''}${row.orderNo ? '<div style="margin-top:3px;font-size:13px;color:#647083">Ordine ' + html(row.orderNo) + '</div>' : ''}${row.id === sourceId ? '<div style="margin-top:6px;font-size:12px;font-weight:700;color:#168637">APPENA AGGIUNTO</div>' : ''}</td>
<td valign="top" align="right" style="width:96px;padding:13px 8px;border-bottom:1px solid #dce1eb;color:#0c101a;font-size:15px;line-height:1.5;font-weight:700">${html(qty(row))}</td></tr>`).join('');
  const plain = ['AVVISO PRODUZIONE · WRITE', 'LG Trading SRL', 'Nuovo prodotto in coda',
    ...(recipientName ? ['Incaricato: ' + text(recipientName)] : []), date, '',
    ...(added ? ['Appena aggiunto: ' + text(added.title) + ' · ' + qty(added)] : []),
    'Procedere alla produzione seguendo l’ordine della coda Write.', summary,
    ...(totals ? ['Quantità in coda: ' + totals] : []), '', 'PRODOTTI DA PRODURRE',
    ...details.products.map((row, index) => (index + 1) + '. ' + text(row.title) +
      (row.sku ? ' | Codice / SKU: ' + text(row.sku) : '') + ' | ' + qty(row) +
      (row.orderNo ? ' | Ordine ' + text(row.orderNo) : '') + (row.id === sourceId ? ' | APPENA AGGIUNTO' : '')),
    '', 'Apri il tabellone Write: ' + url,
    'Elenco aggiornato al ' + date + '. Il tabellone mostra la situazione in tempo reale.'].join('\n');
  const body = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${html(subject)}</title><style>:root{color-scheme:light;supported-color-schemes:light}@media screen and (max-width:480px){.content{padding-left:16px!important;padding-right:16px!important}.message-title{font-size:22px!important}}</style></head>
<body style="margin:0;padding:0;background:#e9ecf3;color:#0c101a;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#e9ecf3"><tr><td align="center" style="padding:20px 0 28px">
<table role="presentation" width="640" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:100%;max-width:640px;background:#ffffff;border-top:4px solid #0a84ff">
<tr><td class="content" style="padding:18px 28px;border-bottom:1px solid #dce1eb"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td valign="top" style="color:#0a84ff;font-size:24px;font-weight:700">Produzione Write<div style="padding-top:5px;color:#647083;font-size:13px;font-weight:400">LG Trading SRL · Picking</div></td><td align="right" valign="top" style="padding-left:12px;color:#647083;font-size:12px;line-height:1.7">AVVISO PRODUZIONE<br>${html(date)}</td></tr></table></td></tr>
<tr><td class="content" style="padding:24px 28px 0"><h1 class="message-title" style="margin:0;font-size:24px;line-height:1.3;font-weight:400;color:#0c101a">Nuovo prodotto in coda</h1>
${recipientName ? '<p style="margin:16px 0 0;font-size:16px;line-height:1.5"><strong>Incaricato: ' + html(recipientName) + '</strong></p>' : ''}
<p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#0c101a">Procedere alla produzione seguendo l’ordine della coda Write.</p>
${added ? '<p style="margin:12px 0 0;padding:12px;background:#eef9f0;border-left:3px solid #25b94f;font-size:14px;line-height:1.6;overflow-wrap:anywhere;word-break:break-word"><strong>Appena aggiunto:</strong> ' + html(added.title) + ' · <strong>' + html(qty(added)) + '</strong></p>' : ''}
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:18px"><tr><td bgcolor="#0a84ff" style="background:#0a84ff;border-radius:5px;text-align:center"><a href="${html(url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none">Apri il tabellone Write</a></td></tr></table></td></tr>
<tr><td class="content" style="padding:24px 28px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f7f8fb"><tr><td style="padding:14px;color:#0c101a;font-size:16px;line-height:1.5"><strong>${html(summary)}</strong>${totals ? '<div style="padding-top:4px;color:#647083;font-size:14px">' + html(totals) + '</div>' : ''}</td></tr></table></td></tr>
<tr><td class="content" style="padding:26px 28px 0"><h2 style="margin:0;color:#0c101a;font-size:18px;line-height:1.4">Prodotti da produrre</h2><p style="margin:6px 0 12px;color:#647083;font-size:13px;line-height:1.5">Elenco nell’ordine della coda Write.</p><table aria-label="Prodotti da produrre in ordine di coda" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><thead><tr bgcolor="#f7f8fb"><th scope="col" align="left" style="padding:10px 8px;color:#647083;font-size:13px;font-weight:400">N.</th><th scope="col" align="left" style="padding:10px 8px;color:#647083;font-size:13px;font-weight:400">Prodotto / SKU</th><th scope="col" align="right" style="padding:10px 8px;color:#647083;font-size:13px;font-weight:400">Quantità</th></tr></thead><tbody>${rows}</tbody></table></td></tr>
<tr><td class="content" style="padding:20px 28px 28px;color:#647083;font-size:12px;line-height:1.6">Elenco aggiornato al ${html(date)}. Il tabellone mostra la situazione in tempo reale.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text: plain, html: body };
}

module.exports = { renderWriteMessage };
