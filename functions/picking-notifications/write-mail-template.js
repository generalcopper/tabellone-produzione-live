'use strict';

const text = value => String(value ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
const html = value => text(value).replace(/[&<>"']/g,
  char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 3 }).format(value);
const qty = row => (row.qty === null ? row.qtyText : number(row.qty)) + (row.unit ? ' ' + row.unit : '');

function renderWriteMessage({ details, sourceId, changeKind = 'added', generatedAt, url, timeZone }) {
  const updated = changeKind === 'quantity';
  const subject = 'Nuovi prodotti in coda · Linea automatica liquidi';
  const date = new Intl.DateTimeFormat('it-IT', { timeZone, day: '2-digit', month: '2-digit',
    year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(generatedAt));
  const label = updated ? '' : 'Nuovo';
  const rows = details.products.map((row, index) => `<tr>
<td valign="top" style="padding:14px 8px;border-bottom:1px solid #e5e7eb;color:#647083;font-size:14px">${index + 1}</td>
<td valign="top" style="padding:14px 8px;border-bottom:1px solid #e5e7eb;font-size:15px;line-height:1.5;overflow-wrap:anywhere">${html(row.title)}${row.sku ? '<div style="font-size:12px;color:#647083">Codice: ' + html(row.sku) + '</div>' : ''}${row.id === sourceId && label ? '<div style="font-size:12px;color:#0875df">' + label + '</div>' : ''}</td>
<td valign="top" align="right" style="padding:14px 8px;border-bottom:1px solid #e5e7eb;font-size:16px;font-weight:700;white-space:nowrap">${html(qty(row))}</td></tr>`).join('');
  const plain = ['LINEA AUTOMATICA LIQUIDI', '', 'Da produrre, in ordine di coda:', '',
    ...details.products.map((row, index) => (index + 1) + '. ' + text(row.title) + ' — Quantità da produrre: ' + qty(row) +
      (row.sku ? ' | Codice: ' + text(row.sku) : '') + (row.id === sourceId && label ? ' | ' + label : '')),
    '', 'Apri la coda di produzione: ' + url, '', 'Coda aggiornata al ' + date + '.'].join('\n');
  const body = `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${html(subject)}</title></head>
<body style="margin:0;padding:20px 12px;background:#e9ecf3;color:#0c101a;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" align="center" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#fff;border-top:4px solid #0a84ff"><tr><td style="padding:24px 20px">
<div style="font-size:13px;color:#647083">LG Trading SRL</div>
<h1 style="margin:8px 0 20px;font-size:24px;line-height:1.3">Linea automatica liquidi</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5">Da produrre, in ordine di coda:</p>
<table aria-label="Prodotti da produrre" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><thead><tr><th scope="col" align="left" style="padding:8px;color:#647083;font-size:12px">N.</th><th scope="col" align="left" style="padding:8px;color:#647083;font-size:12px">Prodotto</th><th scope="col" align="right" style="padding:8px;color:#647083;font-size:12px">Quantità da produrre</th></tr></thead><tbody>${rows}</tbody></table>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr><td bgcolor="#0a84ff" style="border-radius:6px"><a href="${html(url)}" style="display:inline-block;padding:13px 18px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">Apri la coda di produzione</a></td></tr></table>
<p style="margin:20px 0 0;font-size:12px;color:#647083;line-height:1.5">Coda aggiornata al ${html(date)}.</p>
</td></tr></table></body></html>`;
  return { subject, text: plain, html: body };
}

module.exports = { renderWriteMessage };
