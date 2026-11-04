// Mappa del capannone di Concamarise.
// Geometria in metri replicata dal modello Capannone 3D (stesse campate, posti pallet, livelli e
// colori dei cartelli di fila). Il modulo non legge né scrive Firestore: riceve i dati già
// calcolati da picking.js e restituisce solo interfaccia.

const LX = 28.4;
const LZ = 21.45;
const CARTON_W = 6.9;
const CUT_Z = -LZ / 2 + CARTON_W;
const GAP = 1.76;
const CUT_X_PERIM = 18 + GAP - LX / 2;
const SOP = { x0: -(LX / 2), x1: -(LX / 2 - 18), z0: -LZ / 2, z1: -LZ / 2 + 6 };
const ROOM = (() => {
  const th = 0.1;
  const W = 11.5;
  const D = 6.04;
  const sourceSopX0 = LX / 2 - 18;
  const sourceX0 = sourceSopX0 + 4.2;
  const sourceIx0 = sourceX0 + th;
  const sourceIx1 = sourceIx0 + W;
  const iz0 = -LZ / 2 + 0.02;
  const iz1 = iz0 + D;
  return {
    x0: -(sourceIx1 + th),
    x1: -sourceX0,
    ix0: -sourceIx1,
    ix1: -sourceIx0,
    z0: -LZ / 2,
    z1: iz1 + th,
    iz0,
    iz1,
    dx0: -(sourceIx0 + 1.3),
    dx1: -sourceIx0,
  };
})();
const LIQ = { x0: -LX / 2, x1: -LX / 2 + 15, z0: LZ / 2 - 3.75, z1: LZ / 2 };

// Colori dei cartelli di fila del modello 3D. "side" indica il lato corridoio su cui
// scrivere i nomi delle campate (lato libero, non addossato a muri o altre file).
export const ROWS = {
  A: { color: "#FFD300", ink: "#1A1A1A", levels: 3, side: "w" },
  B: { color: "#00C853", ink: "#0A2E14", levels: 3, side: "s" },
  C: { color: "#FF6D00", ink: "#2B1400", levels: 3, side: "n" },
  D: { color: "#FF2D87", ink: "#2E0014", levels: 3, side: "s" },
  E: { color: "#00B0FF", ink: "#002233", levels: 3, side: "w" },
  F: { color: "#B388FF", ink: "#1A0033", levels: 3, side: "e" },
  G: { color: "#C6FF00", ink: "#1E2600", levels: 1, side: "n" },
};
export const ROW_IDS = Object.keys(ROWS);

// Quote reali dei piani di appoggio (metri) dal modello 3D.
const LEVEL_HEIGHT = { 1: 0, 2: 2.0, 3: 4.0 };

export const BAYS = [
  { row: "A", code: "A01", bay: 1, cx: 13.45, cz: -2.15, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "A", code: "A02", bay: 2, cx: 13.45, cz: 0.55, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "A", code: "A03", bay: 3, cx: 13.45, cz: 3.25, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "A", code: "A04", bay: 4, cx: 13.45, cz: 5.5, wx: 1.1, wz: 1.8, pal: 2 },
  { row: "B", code: "B01", bay: 1, cx: -11.445, cz: -3.975, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "B", code: "B02", bay: 2, cx: -8.745, cz: -3.975, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "B", code: "B03", bay: 3, cx: -6.045, cz: -3.975, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "B", code: "B04", bay: 4, cx: -3.345, cz: -3.975, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "G", code: "G01", bay: 1, cx: -3.45, cz: -5.395, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "G", code: "G02", bay: 2, cx: -6.15, cz: -5.395, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "G", code: "G03", bay: 3, cx: -8.4, cz: -5.395, wx: 1.8, wz: 1.1, pal: 2 },
  { row: "C", code: "C04", bay: 4, cx: -11.445, cz: 1.125, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "C", code: "C03", bay: 3, cx: -8.745, cz: 1.125, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "C", code: "C02", bay: 2, cx: -6.045, cz: 1.125, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "C", code: "C01", bay: 1, cx: -3.795, cz: 1.125, wx: 1.8, wz: 1.1, pal: 2 },
  { row: "C", code: "C00", bay: 0, cx: -1.545, cz: 1.125, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "D", code: "D01", bay: 1, cx: -11.445, cz: 2.425, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "D", code: "D02", bay: 2, cx: -8.745, cz: 2.425, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "D", code: "D03", bay: 3, cx: -6.045, cz: 2.425, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "D", code: "D04", bay: 4, cx: -3.795, cz: 2.425, wx: 1.8, wz: 1.1, pal: 2 },
  { row: "D", code: "D05", bay: 5, cx: -1.545, cz: 2.425, wx: 2.7, wz: 1.1, pal: 3 },
  { row: "F", code: "F00", bay: 0, cx: 8.15, cz: 2.725, wx: 1.1, wz: 1.8, pal: 2 },
  { row: "F", code: "F01", bay: 1, cx: 8.15, cz: 0.475, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "F", code: "F02", bay: 2, cx: 8.15, cz: -2.225, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "E", code: "E01", bay: 1, cx: 6.85, cz: -2.225, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "E", code: "E02", bay: 2, cx: 6.85, cz: 0.475, wx: 1.1, wz: 2.7, pal: 3 },
  { row: "E", code: "E03", bay: 3, cx: 6.85, cz: 2.725, wx: 1.1, wz: 1.8, pal: 2 },
];
const BAY_BY_CODE = new Map(BAYS.map((b) => [b.code, b]));
const PAD = 0.5;
export const PLAN_BOUNDS = { x: -LX / 2 - PAD, y: -LZ / 2 - PAD, w: LX + 2 * PAD, h: LZ + 2 * PAD };

const html = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
const normalized = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
const quantity = (value) =>
  Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
const fmt = (value) => new Intl.NumberFormat("it-IT").format(value);
const f = (n) => Math.round(n * 1000) / 1000;
const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (_e) {
    return false;
  }
};

export function parseLocationCode(code) {
  const c = String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const m = c.match(/^([A-G])(\d{2})-L(\d)-P(\d+)$/);
  if (!m) return null;
  const bayCode = m[1] + m[2];
  const bay = BAY_BY_CODE.get(bayCode);
  if (!bay) return null;
  const level = Number(m[3]);
  const pallet = Number(m[4]);
  if (level < 1 || level > ROWS[m[1]].levels || pallet < 1 || pallet > bay.pal) return null;
  return { code: c, row: m[1], rack: m[1], bayCode, bay: bay.bay, level, pallet };
}

export function levelHeightLabel(row, level) {
  if (level === 1) return "a terra";
  const h = LEVEL_HEIGHT[level];
  return Number.isFinite(h) ? h.toLocaleString("it-IT", { minimumFractionDigits: 1 }) + " m" : "";
}

// Etichetta di posizione: replica la logica delle etichette di trave (fila colorata + campata,
// livello, posto). Il testo resta il codice completo per lettori di schermo e ricerca.
export function locationLabelHTML(code, opts = {}) {
  const size = opts.size || "md";
  const raw = String(code || "")
    .trim()
    .toUpperCase();
  if (raw === "CEREA")
    return `<span class="loc loc--${size} loc--cerea" role="img" aria-label="Cerea, posizione temporanea"><span class="loc-part">Cerea</span></span>`;
  const p = parseLocationCode(raw);
  if (!p)
    return `<span class="loc loc--${size} loc--plain" role="img" aria-label="Posizione ${html(raw || "non indicata")}"><span class="loc-part">${html(raw || "—")}</span></span>`;
  const row = ROWS[p.row];
  return `<span class="loc loc--${size}" role="img" aria-label="Posizione ${html(p.code)}" style="--row:${row.color};--row-ink:${row.ink}"><span class="loc-row">${p.row}</span><span class="loc-part loc-bay">${html(p.bayCode.slice(1))}</span><span class="loc-part">L${p.level}</span><span class="loc-part">P${p.pallet}</span></span>`;
}

export function rowSignHTML(row, size = "md") {
  const r = ROWS[row];
  if (!r) return "";
  return `<span class="row-sign row-sign--${size}" style="--row:${r.color};--row-ink:${r.ink}" aria-hidden="true">${row}</span>`;
}

// Modello del magazzino a partire dagli articoli con disponibilità. Le quantità restano quelle
// del cloud: nessuna posizione riceve una quantità che il documento non dichiara.
export function buildWarehouseModel(items, locationCodes, query = "") {
  const positions = new Map(locationCodes.map((code) => [code, []]));
  const bays = new Map();
  const rows = new Map();
  for (const code of locationCodes) {
    const bayCode = code.split("-")[0];
    const rowId = bayCode[0];
    if (!bays.has(bayCode))
      bays.set(bayCode, {
        code: bayCode,
        row: rowId,
        positions: [],
        occupied: 0,
        qty: 0,
        unknown: false,
        matched: false,
      });
    bays.get(bayCode).positions.push(code);
    if (!rows.has(rowId))
      rows.set(rowId, { id: rowId, bays: [], capacity: 0, occupied: 0, qty: 0, matched: false });
    const row = rows.get(rowId);
    row.capacity++;
    if (!row.bays.includes(bayCode)) row.bays.push(bayCode);
  }
  for (const row of rows.values())
    row.bays.sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  const terms = normalized(query).trim().split(/\s+/).filter(Boolean);
  const matches = (value) => terms.every((term) => normalized(value).includes(term));
  const stats = {
    products: 0,
    total: 0,
    allocated: 0,
    unallocated: 0,
    locatedProducts: 0,
    unlocatedProducts: 0,
    cerea: 0,
    cereaProducts: 0,
    occupied: 0,
    capacity: locationCodes.length,
  };
  const matchedCodes = new Set();
  const matchedProducts = [];
  let unlocatedMatches = 0;
  for (const item of items) {
    const total = quantity(item.total);
    if (!total) continue;
    const allocated = Math.min(total, quantity(item.allocated));
    const remaining = total - allocated;
    stats.products++;
    stats.total += total;
    stats.allocated += allocated;
    stats.unallocated += remaining;
    if (allocated) stats.locatedProducts++;
    if (remaining) stats.unlocatedProducts++;
    const cerea = Math.min(remaining, quantity(item.cerea));
    stats.cerea += cerea;
    if (cerea) stats.cereaProducts++;
    const searchable = [item.sku, item.displaySku, item.title, ...(item.aliases || [])].join(" ");
    const productMatch = terms.length && matches(searchable);
    if (terms.length && remaining && productMatch) unlocatedMatches++;
    const productCodes = [];
    for (const allocation of item.allocations || []) {
      const entries = positions.get(allocation.code);
      const unknown = allocation.legacy === true;
      const qty = unknown ? null : quantity(allocation.qty);
      if (!entries || (!unknown && !qty)) continue;
      entries.push({
        ...allocation,
        qty,
        sku: item.sku,
        displaySku: item.displaySku || item.sku,
        title: item.title,
        unknown,
      });
      const bay = bays.get(allocation.code.split("-")[0]);
      bay.qty += qty || 0;
      bay.unknown ||= unknown;
      rows.get(bay.row).qty += qty || 0;
      if (
        terms.length &&
        matches([searchable, allocation.code, allocation.lot, allocation.lotLabel].join(" "))
      ) {
        bay.matched = true;
        matchedCodes.add(allocation.code);
        productCodes.push(allocation.code);
      }
    }
    if (terms.length && (productCodes.length || (productMatch && remaining)))
      matchedProducts.push({
        sku: item.sku,
        displaySku: item.displaySku || item.sku,
        title: item.title,
        codes: [...new Set(productCodes)].sort(),
        remaining,
      });
  }
  for (const [code, entries] of positions) {
    if (!entries.length) continue;
    stats.occupied++;
    const bay = bays.get(code.split("-")[0]);
    bay.occupied++;
    rows.get(bay.row).occupied++;
  }
  for (const bay of bays.values()) {
    if (terms.length && matches([bay.code, ...bay.positions].join(" "))) {
      bay.matched = true;
      for (const code of bay.positions) if (matches(code)) matchedCodes.add(code);
    }
    if (bay.matched) rows.get(bay.row).matched = true;
  }
  return {
    stats,
    positions,
    bays,
    rows,
    matchedCodes,
    matchedProducts,
    unlocatedMatches,
    searching: terms.length > 0,
  };
}

// Sulle file C e F l'ordine dei posti in pianta è specchiato rispetto al numero salvato, per
// seguire il verso reale della fila visto dal fronte operatore (stessa regola della pianta Trova).
function planPalletIndex(row, pallet, pal) {
  const p = Number(pallet) || 1;
  if (row === "C" || row === "F") return Math.max(1, Math.min(pal, pal - p + 1));
  return Math.max(1, Math.min(pal, p));
}

function slotRect(bay, pallet) {
  const vertical = bay.wz > bay.wx;
  const slot = (vertical ? bay.wz : bay.wx) / bay.pal;
  const i = planPalletIndex(bay.row, pallet, bay.pal) - 1;
  const bx = bay.cx - bay.wx / 2;
  const bz = bay.cz - bay.wz / 2;
  return vertical
    ? { x: bx, y: bz + slot * i, w: bay.wx, h: slot }
    : { x: bx + slot * i, y: bz, w: slot, h: bay.wz };
}

function codeCenter(code) {
  const p = parseLocationCode(code);
  if (!p) return null;
  const bay = BAY_BY_CODE.get(p.bayCode);
  const r = slotRect(bay, p.pallet);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

function bayLabelPosition(bay) {
  const side = ROWS[bay.row].side;
  const off = 0.62;
  if (side === "n") return { x: bay.cx, y: bay.cz - bay.wz / 2 - off, anchor: "middle" };
  if (side === "s") return { x: bay.cx, y: bay.cz + bay.wz / 2 + off, anchor: "middle" };
  if (side === "w") return { x: bay.cx - bay.wx / 2 - 0.5, y: bay.cz, anchor: "end" };
  return { x: bay.cx + bay.wx / 2 + 0.5, y: bay.cz, anchor: "start" };
}

// Numero del posto (P1, P2…) sul lato corridoio, visibile solo con zoom ravvicinato.
function palletLabelPosition(bay, pallet) {
  const r = slotRect(bay, pallet);
  const side = ROWS[bay.row].side;
  if (side === "n") return { x: r.x + r.w / 2, y: r.y - 0.2, anchor: "middle" };
  if (side === "s") return { x: r.x + r.w / 2, y: r.y + r.h + 0.2, anchor: "middle" };
  if (side === "w") return { x: r.x - 0.12, y: r.y + r.h / 2, anchor: "end" };
  return { x: r.x + r.w + 0.12, y: r.y + r.h / 2, anchor: "start" };
}

function rowBounds(rowId) {
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  for (const b of BAYS) {
    if (b.row !== rowId) continue;
    x0 = Math.min(x0, b.cx - b.wx / 2);
    x1 = Math.max(x1, b.cx + b.wx / 2);
    y0 = Math.min(y0, b.cz - b.wz / 2);
    y1 = Math.max(y1, b.cz + b.wz / 2);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function bayBounds(code) {
  const b = BAY_BY_CODE.get(code);
  if (!b) return null;
  return { x: b.cx - b.wx / 2, y: b.cz - b.wz / 2, w: b.wx, h: b.wz };
}

function unionBounds(list) {
  const valid = list.filter(Boolean);
  if (!valid.length) return null;
  const x0 = Math.min(...valid.map((r) => r.x));
  const y0 = Math.min(...valid.map((r) => r.y));
  const x1 = Math.max(...valid.map((r) => r.x + r.w));
  const y1 = Math.max(...valid.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Stato visivo di ogni posto (codice completo) per la pianta.
function slotState(code, ctx) {
  const { model, mode } = ctx;
  if (mode === "pick") {
    const a = ctx.availability ? ctx.availability(code) : null;
    if (!a) return "free";
    return a.state === "same" ? "same" : a.state === "busy" ? "busy" : "free";
  }
  const entries = model?.positions.get(code) || [];
  if (mode === "focus") {
    if (ctx.targets?.has(code)) return code === ctx.primary ? "target-primary" : "target";
    return entries.length ? "dim" : "free";
  }
  if (!entries.length) return "free";
  if (model.searching) return model.matchedCodes.has(code) ? "match" : "dim";
  return entries.some((e) => e.unknown) ? "unknown" : "occ";
}

export function buildPlanSVG(ctx) {
  const { model, mode = "browse", selectedBay = "", ready = true, interactive = true } = ctx;
  let s = "";
  const x0 = -LX / 2,
    x1 = LX / 2,
    z0 = -LZ / 2,
    z1 = LZ / 2;
  const perim = [
    [x0, z0],
    [CUT_X_PERIM, z0],
    [CUT_X_PERIM, CUT_Z],
    [x1, CUT_Z],
    [x1, z1],
    [x0, z1],
  ]
    .map((p) => `${f(p[0])},${f(p[1])}`)
    .join(" ");
  s += `<polygon class="pm-floor" points="${perim}"/>`;
  s += `<rect class="pm-zone pm-zone--mezz" x="${f(SOP.x0)}" y="${f(SOP.z0)}" width="${f(SOP.x1 - SOP.x0)}" height="${f(SOP.z1 - SOP.z0)}"/>`;
  s += `<rect class="pm-room" x="${f(ROOM.x0)}" y="${f(ROOM.z0)}" width="${f(ROOM.x1 - ROOM.x0)}" height="${f(ROOM.z1 - ROOM.z0)}"/>`;
  s += `<rect class="pm-room-in" x="${f(ROOM.ix0)}" y="${f(ROOM.iz0)}" width="${f(ROOM.ix1 - ROOM.ix0)}" height="${f(ROOM.iz1 - ROOM.iz0)}"/>`;
  s += `<rect class="pm-door" x="${f(ROOM.dx0)}" y="${f(ROOM.iz1 - 0.03)}" width="${f(ROOM.dx1 - ROOM.dx0)}" height="${f(ROOM.z1 - ROOM.iz1 + 0.06)}"/>`;
  s += `<rect class="pm-zone pm-zone--liq" x="${f(LIQ.x0)}" y="${f(LIQ.z0)}" width="${f(LIQ.x1 - LIQ.x0)}" height="${f(LIQ.z1 - LIQ.z0)}"/>`;
  s += `<text class="pm-area" x="${f((ROOM.x1 + SOP.x1) / 2)}" y="${f((SOP.z0 + SOP.z1) / 2)}">Soppalco</text>`;
  s += `<text class="pm-area" x="${f((ROOM.ix0 + ROOM.ix1) / 2)}" y="${f((ROOM.iz0 + ROOM.iz1) / 2 - 0.6)}">Stanza sotto soppalco</text>`;
  s += `<text class="pm-area pm-area--sm" x="${f((ROOM.dx0 + ROOM.dx1) / 2)}" y="${f(ROOM.z1 + 0.42)}">Porta</text>`;
  s += `<text class="pm-area" x="${f((LIQ.x0 + LIQ.x1) / 2)}" y="${f((LIQ.z0 + LIQ.z1) / 2)}">Linea liquidi</text>`;

  for (const bay of BAYS) {
    const info = model?.bays.get(bay.code);
    const levels = ROWS[bay.row].levels;
    const dim =
      (mode === "browse" && model?.searching && !info?.matched) ||
      (mode === "focus" && ctx.targetBays && !ctx.targetBays.has(bay.code));
    const selected = bay.code === selectedBay;
    const label = !ready
      ? `Campata ${bay.code}, dati in caricamento`
      : mode === "pick"
        ? `Campata ${bay.code}: scegli il posto`
        : `Campata ${bay.code}, ${info?.occupied || 0} di ${info?.positions.length || 0} posti occupati`;
    const bx = bay.cx - bay.wx / 2,
      bz = bay.cz - bay.wz / 2;
    s += `<g class="pm-bay${selected ? " is-selected" : ""}${dim ? " is-dim" : ""}" data-bay="${bay.code}"${interactive ? ` role="button" tabindex="0" aria-pressed="${selected}"` : ""} aria-label="${html(label)}">`;
    s += `<title>${html(label)}</title>`;
    s += `<rect class="pm-bay-frame" x="${f(bx)}" y="${f(bz)}" width="${f(bay.wx)}" height="${f(bay.wz)}" rx="0.06"/>`;
    for (let p = 1; p <= bay.pal; p++) {
      const r = slotRect(bay, p);
      const inset = 0.08;
      const gap = 0.05;
      const ih = r.h - inset * 2;
      const sh = (ih - gap * (levels - 1)) / levels;
      for (let l = 1; l <= levels; l++) {
        const code = `${bay.code}-L${l}-P${p}`;
        if (model && !model.positions.has(code)) continue;
        const st = ready ? slotState(code, { ...ctx, mode }) : "free";
        const y = r.y + inset + (levels - l) * (sh + gap);
        s += `<rect class="pm-slot s-${st}" data-code="${code}" x="${f(r.x + inset)}" y="${f(y)}" width="${f(r.w - inset * 2)}" height="${f(sh)}" rx="0.03"/>`;
      }
    }
    if (selected)
      s += `<rect class="pm-bay-ring" x="${f(bx - 0.14)}" y="${f(bz - 0.14)}" width="${f(bay.wx + 0.28)}" height="${f(bay.wz + 0.28)}" rx="0.16"/>`;
    s += "</g>";
    for (let p = 1; p <= bay.pal; p++) {
      const pp = palletLabelPosition(bay, p);
      s += `<text class="pm-pal-label" x="${f(pp.x)}" y="${f(pp.y)}" text-anchor="${pp.anchor}">P${p}</text>`;
    }
    const lp = bayLabelPosition(bay);
    s += `<text class="pm-bay-label${selected ? " is-selected" : ""}${dim ? " is-dim" : ""}" x="${f(lp.x)}" y="${f(lp.y)}" text-anchor="${lp.anchor}">${bay.code}</text>`;
  }

  for (const rowId of ROW_IDS) {
    const b = rowBounds(rowId);
    const row = ROWS[rowId];
    const vertical = b.h > b.w;
    const cx = vertical ? b.x + b.w / 2 : b.x - 0.85;
    const cy = vertical ? b.y - 0.85 : b.y + b.h / 2;
    s += `<g class="pm-sign" data-row="${rowId}"><rect x="${f(cx - 0.55)}" y="${f(cy - 0.55)}" width="1.1" height="1.1" rx="0.2" fill="${row.color}"/><text x="${f(cx)}" y="${f(cy)}" fill="${row.ink}">${rowId}</text></g>`;
  }

  const pins = ctx.pins || [];
  for (const pin of [...pins].sort((a, b) => Number(!!a.primary) - Number(!!b.primary))) {
    const c = codeCenter(pin.code);
    if (!c) continue;
    const r = pin.primary ? 0.62 : 0.44;
    s += `<g class="pm-pin${pin.primary ? " is-primary" : ""}"><path d="M ${f(c.x)} ${f(c.y)} L ${f(c.x - r * 0.72)} ${f(c.y - r * 1.45)} A ${f(r)} ${f(r)} 0 1 1 ${f(c.x + r * 0.72)} ${f(c.y - r * 1.45)} Z"/><circle cx="${f(c.x)}" cy="${f(c.y - r * 1.62)}" r="${f(r * 0.4)}"/></g>`;
  }

  s += `<g class="pm-scale"><line x1="${f(x0 + 0.6)}" y1="${f(z1 - 0.55)}" x2="${f(x0 + 5.6)}" y2="${f(z1 - 0.55)}"/><line x1="${f(x0 + 0.6)}" y1="${f(z1 - 0.75)}" x2="${f(x0 + 0.6)}" y2="${f(z1 - 0.35)}"/><line x1="${f(x0 + 5.6)}" y1="${f(z1 - 0.75)}" x2="${f(x0 + 5.6)}" y2="${f(z1 - 0.35)}"/><text x="${f(x0 + 3.1)}" y="${f(z1 - 0.9)}">5 m</text></g>`;

  const vb = ctx.viewBox || PLAN_BOUNDS;
  const aria =
    mode === "focus"
      ? "Pianta del capannone con le posizioni del prodotto"
      : mode === "pick"
        ? "Pianta del capannone: scegli la campata"
        : "Pianta del capannone di Concamarise";
  return `<svg class="pm-svg pm-svg--${mode}" viewBox="${f(vb.x)} ${f(vb.y)} ${f(vb.w)} ${f(vb.h)}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="${aria}">${s}</svg>`;
}

// Prospetto frontale di una campata: livelli dall'alto (L3) al basso (L1), posti P1..Pn come
// li vede l'operatore davanti alla scaffalatura.
export function buildBayElevationHTML(bayCode, ctx) {
  const bay = BAY_BY_CODE.get(bayCode);
  if (!bay) return "";
  const { model, mode = "browse" } = ctx;
  const levels = ROWS[bay.row].levels;
  let out = `<div class="wm-elev" style="--cols:${bay.pal}" role="grid" aria-label="Prospetto campata ${bay.code}">`;
  out += `<div class="wm-elev-corner" aria-hidden="true"></div>`;
  for (let p = 1; p <= bay.pal; p++)
    out += `<div class="wm-elev-col" role="columnheader">P${p}</div>`;
  for (let l = levels; l >= 1; l--) {
    out += `<div class="wm-elev-lv" role="rowheader"><b>L${l}</b><small>${levelHeightLabel(bay.row, l)}</small></div>`;
    for (let p = 1; p <= bay.pal; p++) {
      const code = `${bay.code}-L${l}-P${p}`;
      if (model && !model.positions.has(code)) {
        out += `<div class="wm-cell is-none" aria-hidden="true"></div>`;
        continue;
      }
      out += cellHTML(code, ctx);
    }
  }
  out += "</div>";
  return out;
}

function cellHTML(code, ctx) {
  const { model, mode } = ctx;
  const entries = model?.positions.get(code) || [];
  const flags = [];
  if (ctx.targets?.has(code))
    flags.push(code === ctx.primary ? "is-target is-primary" : "is-target");
  if (ctx.marked === code) flags.push("is-marked");
  if (mode === "browse" && model?.searching && model.matchedCodes.has(code)) flags.push("is-match");
  const short = code.split("-").slice(1).join(" ");
  if (mode === "pick") {
    const a = ctx.availability ? ctx.availability(code) : { state: "free" };
    if (a.state === "busy")
      return `<div class="wm-cell is-busy ${flags.join(" ")}" role="gridcell" aria-label="${code} occupata${a.occupant ? " da " + html(a.occupant) : ""}"><span class="wm-cell-code">${short}</span><span class="wm-cell-note">Occupata</span>${a.occupant ? `<span class="wm-cell-sku">${html(a.occupant)}</span>` : ""}</div>`;
    const same = a.state === "same";
    return `<button type="button" class="wm-cell is-pick${same ? " is-same" : ""} ${flags.join(" ")}" data-wm-pick="${code}" role="gridcell" aria-label="Scegli ${code}${same ? ", già usata da questo prodotto: i pezzi si sommano" : ", libera"}"><span class="wm-cell-code">${short}</span><span class="wm-cell-note">${same ? "Stesso prodotto" : "Libera"}</span>${same && a.qty ? `<span class="wm-cell-qty">${fmt(a.qty)} pz</span>` : ""}</button>`;
  }
  if (!entries.length)
    return `<div class="wm-cell is-free ${flags.join(" ")}" role="gridcell" aria-label="${code} libera"><span class="wm-cell-code">${short}</span><span class="wm-cell-note">Libera</span></div>`;
  const items = entries
    .map(
      (e) =>
        `<button type="button" class="wm-entry" data-wm-product="${html(e.sku)}" data-wm-lot="${html(e.lot || "")}" data-wm-code="${code}"><span class="wm-entry-title">${html(e.title || e.displaySku)}</span><span class="wm-entry-sku">${html(e.displaySku)}</span><span class="wm-entry-meta"><b>${e.unknown ? "Quantità da verificare" : fmt(e.qty) + " pz"}</b>${e.lotLabel ? `<span>${html(e.lotLabel)}</span>` : ""}</span></button>`,
    )
    .join("");
  return `<div class="wm-cell is-occ ${flags.join(" ")}" role="gridcell" data-cell="${code}"><span class="wm-cell-code">${short}</span>${items}</div>`;
}

// ---------------------------------------------------------------------------------------------
// Controller interattivo: pianta con trascinamento e zoom (dita, rotella, pulsanti), pannello
// della campata. Modalità: browse (sezione Mappa), focus (Trova), pick (scelta posto in Ubica).
// ---------------------------------------------------------------------------------------------
export function createWarehouseMap(opts) {
  const {
    root,
    mode = "browse",
    locationCodes,
    getSnapshot,
    onOpenProduct = () => {},
    onPick = () => {},
    availability = null,
    search = mode === "browse",
    emptyHint = "",
  } = opts;
  const st = {
    query: "",
    selectedBay: "",
    marked: "",
    targets: new Set(),
    primary: "",
    product: null,
    panelOpen: false,
    vb: { ...PLAN_BOUNDS },
    model: buildWarehouseModel([], locationCodes),
    ready: false,
    userId: null,
    fitted: false,
  };
  const legend = {
    browse: `<span><i class="lg s-occ"></i>Occupato</span><span><i class="lg s-free"></i>Libero</span><span class="lg-note">Ogni posto: livelli L1–L${3} dal basso</span>`,
    focus: `<span><i class="lg s-target"></i>Prodotto cercato</span><span><i class="lg s-dim"></i>Altri prodotti</span><span><i class="lg s-free"></i>Libero</span>`,
    pick: `<span><i class="lg s-free"></i>Libero</span><span><i class="lg s-same"></i>Stesso prodotto</span><span><i class="lg s-busy"></i>Occupato</span>`,
  }[mode];
  root.innerHTML = `
    <div class="wm wm--${mode}" data-panel="${mode === "browse" ? "peek" : "open"}">
      ${
        search
          ? `<div class="wm-toolbar">
        <label class="search wm-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><span class="sr-only">Cerca sulla mappa</span><input type="search" data-wm-q placeholder="Cerca SKU, prodotto, lotto o posizione" autocomplete="off" spellcheck="false" enterkeyhint="search"><button type="button" class="search-clear" data-wm-clear aria-label="Cancella ricerca" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></label>
        <div class="wm-rows" role="group" aria-label="Vai alla fila">${ROW_IDS.map((id) => `<button type="button" class="wm-rowchip" data-wm-row="${id}">${rowSignHTML(id, "sm")}<span class="sr-only">Fila ${id}</span></button>`).join("")}</div>
      </div>`
          : ""
      }
      <div class="wm-body">
        <div class="wm-stage">
          <div class="wm-canvas" data-wm-canvas tabindex="-1"></div>
          <div class="wm-zoom" role="group" aria-label="Zoom pianta">
            <button type="button" data-wm-zoom="in" aria-label="Ingrandisci"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg></button>
            <button type="button" data-wm-zoom="out" aria-label="Riduci"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button>
            <button type="button" data-wm-zoom="fit" aria-label="Mostra tutto il capannone"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
          </div>
          <div class="wm-legend" aria-label="Legenda">${legend}</div>
        </div>
        <section class="wm-panel" data-wm-panel aria-live="polite">
          <button type="button" class="wm-handle" data-wm-handle aria-label="Espandi o riduci il pannello"><span></span></button>
          <div class="wm-panel-body" data-wm-panel-body></div>
        </section>
      </div>
    </div>`;
  const shell = root.querySelector(".wm");
  // Devono coincidere con max-height del pannello in picking-app.css.
  const PANEL_OPEN_RATIO = 0.56;
  const PANEL_PEEK_PX = 128;
  const canvas = root.querySelector("[data-wm-canvas]");
  const panelBody = root.querySelector("[data-wm-panel-body]");
  const input = root.querySelector("[data-wm-q]");
  const clearBtn = root.querySelector("[data-wm-clear]");
  let frame = null;
  let anim = null;

  const setPanel = (state) => {
    shell.dataset.panel = state;
  };

  // --- viewBox / geometria schermo ---
  function metrics(vb = st.vb) {
    const rect = canvas.getBoundingClientRect();
    const s = Math.min(rect.width / vb.w, rect.height / vb.h) || 1;
    return {
      rect,
      s,
      ox: (rect.width - vb.w * s) / 2,
      oy: (rect.height - vb.h * s) / 2,
    };
  }
  function clampVb(vb) {
    const maxW = PLAN_BOUNDS.w;
    const minW = 3.2;
    const aspect = vb.h / vb.w;
    let w = Math.max(minW, Math.min(maxW, vb.w));
    let h = w * aspect;
    if (h > PLAN_BOUNDS.h && w >= maxW) {
      h = PLAN_BOUNDS.h;
    }
    const cx = Math.max(PLAN_BOUNDS.x, Math.min(PLAN_BOUNDS.x + PLAN_BOUNDS.w, vb.x + vb.w / 2));
    const cy = Math.max(PLAN_BOUNDS.y, Math.min(PLAN_BOUNDS.y + PLAN_BOUNDS.h, vb.y + vb.h / 2));
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }
  // Il viewBox mantiene il rapporto del contenitore: niente bande vuote quando si ingrandisce.
  function vbForBounds(b, padding = 1.2) {
    const rect = canvas.getBoundingClientRect();
    const aspect =
      rect.width > 0 && rect.height > 0 ? rect.height / rect.width : PLAN_BOUNDS.h / PLAN_BOUNDS.w;
    let w = b.w + padding * 2;
    let h = b.h + padding * 2;
    if (h / w > aspect) w = h / aspect;
    else h = w * aspect;
    return clampVb({ x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h });
  }
  function fitVb() {
    return vbForBounds(PLAN_BOUNDS, 0);
  }
  function applyVb() {
    const svg = canvas.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", `${f(st.vb.x)} ${f(st.vb.y)} ${f(st.vb.w)} ${f(st.vb.h)}`);
    const { s } = metrics();
    svg.dataset.detail = s >= 42 ? "max" : s >= 19 ? "high" : "low";
    // Spilli a dimensione costante sullo schermo (circa 12 px di raggio) a ogni zoom.
    svg.style.setProperty("--pm-k", String(Math.max(0.35, Math.min(2.2, 12 / (0.62 * s)))));
    const fitW = fitVb().w;
    shell.dataset.zoomed = st.vb.w < fitW * 0.98 ? "true" : "false";
  }
  function animateTo(target, duration = 280) {
    if (anim) cancelAnimationFrame(anim);
    const from = { ...st.vb };
    const to = clampVb(target);
    if (reducedMotion() || duration <= 0) {
      st.vb = to;
      applyVb();
      return;
    }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const e = 1 - Math.pow(1 - t, 3);
      st.vb = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      };
      applyVb();
      anim = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim = requestAnimationFrame(step);
  }
  function zoomBy(factor, clientX, clientY) {
    const m = metrics();
    const px = clientX ?? m.rect.left + m.rect.width / 2;
    const py = clientY ?? m.rect.top + m.rect.height / 2;
    const sx = st.vb.x + (px - m.rect.left - m.ox) / m.s;
    const sy = st.vb.y + (py - m.rect.top - m.oy) / m.s;
    const w = Math.max(3.2, Math.min(fitVb().w, st.vb.w / factor));
    const h = st.vb.h * (w / st.vb.w);
    return { x: sx - (sx - st.vb.x) * (w / st.vb.w), y: sy - (sy - st.vb.y) * (h / st.vb.h), w, h };
  }
  // Viewport della pianta che inquadra b nella parte non coperta dal pannello (mobile).
  function focusBounds(b, pad = 1.3) {
    const panel = root.querySelector("[data-wm-panel]");
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return vbForBounds(b, pad);
    const overlayPanel = panel && getComputedStyle(panel).position === "absolute";
    const o = overlayPanel
      ? shell.dataset.panel === "open"
        ? PANEL_OPEN_RATIO
        : Math.min(0.4, PANEL_PEEK_PX / rect.height)
      : 0;
    const visH = rect.height * (1 - o);
    const aspectVis = visH / rect.width;
    let w = b.w + pad * 2;
    const h = b.h + pad * 2;
    if (h / w > aspectVis) w = h / aspectVis;
    const fullH = (w * rect.height) / rect.width;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return clampVb({ x: cx - w / 2, y: cy - ((1 - o) * fullH) / 2, w, h: fullH });
  }

  // --- gesti ---
  const pointers = new Map();
  let gesture = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (anim) cancelAnimationFrame(anim);
    const m = metrics();
    if (pointers.size === 1) {
      gesture = {
        type: "pan",
        start: { x: e.clientX, y: e.clientY },
        vb: { ...st.vb },
        s: m.s,
        moved: false,
        target: e.target,
        t: performance.now(),
      };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture = {
        type: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid,
        vb: { ...st.vb },
        m,
        moved: true,
      };
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gesture.type === "pan" && pointers.size === 1) {
      const dx = e.clientX - gesture.start.x;
      const dy = e.clientY - gesture.start.y;
      if (!gesture.moved && dx * dx + dy * dy < 36) return;
      gesture.moved = true;
      st.vb = clampVb({
        x: gesture.vb.x - dx / gesture.s,
        y: gesture.vb.y - dy / gesture.s,
        w: gesture.vb.w,
        h: gesture.vb.h,
      });
      applyVb();
    } else if (gesture.type === "pinch" && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const { m, vb } = gesture;
      const w = Math.max(3.2, Math.min(fitVb().w, (vb.w * gesture.dist) / dist));
      const h = vb.h * (w / vb.w);
      const s1 = m.s * (vb.w / w);
      const sx = vb.x + (gesture.mid.x - m.rect.left - m.ox) / m.s;
      const sy = vb.y + (gesture.mid.y - m.rect.top - m.oy) / m.s;
      st.vb = clampVb({
        x: sx - (mid.x - m.rect.left - m.ox) / s1,
        y: sy - (mid.y - m.rect.top - m.oy) / s1,
        w,
        h,
      });
      applyVb();
    }
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (gesture?.type === "pan" && !gesture.moved && e.type === "pointerup") {
      const bayEl = gesture.target?.closest?.("[data-bay]");
      if (bayEl) select(bayEl.dataset.bay, { zoom: true, open: true });
      const sign = gesture.target?.closest?.("[data-row]");
      if (!bayEl && sign) goToRow(sign.dataset.row);
    }
    if (pointers.size === 1 && gesture?.type === "pinch") {
      const [p] = [...pointers.values()];
      gesture = { type: "pan", start: p, vb: { ...st.vb }, s: metrics().s, moved: true };
    } else if (!pointers.size) gesture = null;
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022));
      st.vb = clampVb(zoomBy(factor, e.clientX, e.clientY));
      applyVb();
    },
    { passive: false },
  );
  canvas.addEventListener("dblclick", (e) => {
    e.preventDefault();
    animateTo(zoomBy(2, e.clientX, e.clientY), 220);
  });
  canvas.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest?.("[data-bay]")) {
      e.preventDefault();
      select(e.target.closest("[data-bay]").dataset.bay, { zoom: true, open: true });
    } else if (e.key === "+" || e.key === "=") animateTo(zoomBy(1.5), 200);
    else if (e.key === "-") animateTo(zoomBy(1 / 1.5), 200);
  });

  // --- pannello ---
  function bayHeaderHTML(bayCode) {
    const info = st.model.bays.get(bayCode);
    const rowBays = st.model.rows.get(bayCode[0])?.bays || [];
    const i = rowBays.indexOf(bayCode);
    const summary =
      mode === "pick"
        ? "Tocca un posto libero o già usato da questo prodotto."
        : info
          ? `${fmt(info.occupied)} di ${fmt(info.positions.length)} posti occupati${info.qty ? `, ${fmt(info.qty)} pz` : ""}${info.unknown ? ", alcune quantità da verificare" : ""}`
          : "";
    return `<header class="wm-bay-head">${rowSignHTML(bayCode[0], "lg")}<div class="wm-bay-title"><h3>Campata ${bayCode}</h3><p>${summary}</p></div><div class="wm-bay-nav"><button type="button" data-wm-step="-1" aria-label="Campata precedente" ${i <= 0 ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6"/></svg></button><button type="button" data-wm-step="1" aria-label="Campata successiva" ${i < 0 || i >= rowBays.length - 1 ? "disabled" : ""}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6"/></svg></button></div></header>`;
  }
  function rowsOverviewHTML() {
    const list = ROW_IDS.map((id) => {
      const row = st.model.rows.get(id);
      if (!row) return "";
      const bays = row.bays
        .map((code) => {
          const b = st.model.bays.get(code);
          const ratio = b.positions.length ? b.occupied / b.positions.length : 0;
          return `<span class="wm-rowbar-bay" style="--fill:${f(ratio)}" title="${code}: ${b.occupied}/${b.positions.length}"></span>`;
        })
        .join("");
      return `<button type="button" class="wm-rowline" data-wm-row="${id}">${rowSignHTML(id, "md")}<span class="wm-rowline-main"><b>Fila ${id}</b><small>${fmt(row.occupied)} di ${fmt(row.capacity)} posti occupati</small></span><span class="wm-rowbar" aria-hidden="true">${bays}</span></button>`;
    }).join("");
    return `<div class="wm-intro"><h3>Esplora il capannone</h3><p>Tocca una campata sulla pianta o scegli una fila. In pianta ogni casella è un posto pallet; le sue righe sono i livelli, L1 in basso.</p></div><div class="wm-rowlist">${list}</div>`;
  }
  function resultsHTML() {
    const codes = [...st.model.matchedCodes].sort((a, b) =>
      a.localeCompare(b, "it", { numeric: true }),
    );
    const cards = codes
      .map((code) => {
        const entries = st.model.positions.get(code) || [];
        if (!entries.length)
          return `<button type="button" class="wm-result" data-wm-result="${code}">${locationLabelHTML(code)}<span class="wm-result-main"><b>Posto libero</b></span></button>`;
        return entries
          .map(
            (e) =>
              `<button type="button" class="wm-result" data-wm-result="${code}">${locationLabelHTML(code)}<span class="wm-result-main"><b>${html(e.title || e.displaySku)}</b><small>${html(e.displaySku)}${e.lotLabel ? `, ${html(e.lotLabel)}` : ""}</small></span><span class="wm-result-qty">${e.unknown ? "—" : fmt(e.qty) + " pz"}</span></button>`,
          )
          .join("");
      })
      .join("");
    const unloc = st.model.matchedProducts.filter((p) => p.remaining > 0);
    const unlocHTML = unloc.length
      ? `<div class="wm-note"><b>${unloc.length === 1 ? "1 prodotto ha" : fmt(unloc.length) + " prodotti hanno"} pezzi ancora da ubicare</b>${unloc
          .slice(0, 4)
          .map(
            (p) =>
              `<button type="button" class="wm-note-item" data-wm-product="${html(p.sku)}">${html(p.title || p.displaySku)} <span>${fmt(p.remaining)} pz</span></button>`,
          )
          .join("")}</div>`
      : "";
    if (!codes.length)
      return `<div class="wm-intro"><h3>Nessuna posizione trovata</h3><p>Controlla lo SKU o prova con una parte del nome.</p></div>${unlocHTML}`;
    return `<div class="wm-intro"><h3>${codes.length === 1 ? "1 posizione" : fmt(codes.length) + " posizioni"}</h3><p>Tocca un risultato per vederlo nella campata.</p></div><div class="wm-results">${cards}</div>${unlocHTML}`;
  }
  function focusChipsHTML() {
    const codes = [...st.targets];
    if (codes.length <= 1) return "";
    return `<div class="wm-chips" role="group" aria-label="Posizioni del prodotto">${codes
      .map(
        (code) =>
          `<button type="button" class="wm-chip${code === st.primary ? " is-active" : ""}" data-wm-focus="${code}" aria-pressed="${code === st.primary}">${locationLabelHTML(code, { size: "sm" })}</button>`,
      )
      .join("")}</div>`;
  }
  function renderPanel() {
    const ctx = {
      model: st.model,
      mode,
      targets: st.targets,
      primary: st.primary,
      marked: st.marked,
      availability,
    };
    let body = "";
    if (!st.ready) {
      body = `<div class="wm-intro"><h3>In attesa dei dati</h3><p>Le posizioni compaiono appena l’inventario è disponibile.</p></div>`;
    } else if (mode === "focus") {
      body = focusChipsHTML();
      if (st.selectedBay)
        body += bayHeaderHTML(st.selectedBay) + buildBayElevationHTML(st.selectedBay, ctx);
    } else if (mode === "pick") {
      body = st.selectedBay
        ? bayHeaderHTML(st.selectedBay) + buildBayElevationHTML(st.selectedBay, ctx)
        : `<div class="wm-intro"><h3>Scegli la campata</h3><p>${html(emptyHint || "Tocca una campata sulla pianta per vedere i posti disponibili.")}</p></div>`;
    } else if (st.selectedBay) {
      body = bayHeaderHTML(st.selectedBay) + buildBayElevationHTML(st.selectedBay, ctx);
      if (st.model.searching)
        body =
          `<button type="button" class="wm-back" data-wm-back>Torna ai risultati</button>` + body;
      else
        body = `<button type="button" class="wm-back" data-wm-back>Tutte le file</button>` + body;
    } else if (st.model.searching) {
      body = resultsHTML();
    } else {
      body = rowsOverviewHTML();
    }
    if (panelBody._html !== body) {
      panelBody.innerHTML = body;
      panelBody._html = body;
    }
  }
  function renderPlan() {
    const pins =
      mode === "focus"
        ? [...st.targets].map((code) => ({ code, primary: code === st.primary }))
        : st.marked
          ? [{ code: st.marked, primary: true }]
          : [];
    const svg = buildPlanSVG({
      model: st.model,
      mode,
      selectedBay: st.selectedBay,
      ready: st.ready,
      targets: st.targets,
      targetBays: mode === "focus" ? new Set([...st.targets].map((c) => c.split("-")[0])) : null,
      primary: st.primary,
      availability,
      pins,
      viewBox: st.vb,
    });
    if (canvas._html !== svg) {
      canvas.innerHTML = svg;
      canvas._html = svg;
    }
    applyVb();
  }
  function render() {
    const snap = getSnapshot();
    if (st.userId !== snap.userId) {
      st.userId = snap.userId;
      st.selectedBay = "";
      st.marked = "";
      st.query = "";
      if (input) input.value = "";
    }
    st.ready = !!snap.ready;
    st.model = buildWarehouseModel(st.ready ? snap.items : [], locationCodes, st.query);
    if (clearBtn) clearBtn.hidden = !st.query;
    renderPlan();
    renderPanel();
    if (!st.fitted && canvas.getBoundingClientRect().width > 0) {
      st.fitted = true;
      st.vb = fitVb();
      applyVb();
    }
  }
  function schedule() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      render();
    });
  }
  function select(bayCode, o = {}) {
    if (!BAY_BY_CODE.has(bayCode)) return;
    st.selectedBay = bayCode;
    if (o.mark !== undefined) st.marked = o.mark;
    else if (!st.marked || st.marked.split("-")[0] !== bayCode) st.marked = "";
    if (o.open !== false) setPanel("open");
    render();
    if (o.zoom) animateTo(focusBounds(rowBounds(bayCode[0])));
    const cell =
      st.marked &&
      panelBody.querySelector(`[data-cell="${st.marked}"], [data-wm-pick="${st.marked}"]`);
    cell?.scrollIntoView?.({ block: "nearest" });
  }
  function goToRow(rowId) {
    const row = st.model.rows.get(rowId);
    if (!row) return;
    st.selectedBay = row.bays[0] || "";
    st.marked = "";
    setPanel("open");
    render();
    animateTo(focusBounds(rowBounds(rowId)));
  }
  function step(dir) {
    if (!st.selectedBay) return;
    const bays = st.model.rows.get(st.selectedBay[0])?.bays || [];
    const next = bays[bays.indexOf(st.selectedBay) + dir];
    if (next) select(next, { zoom: true });
  }

  root.addEventListener("click", (e) => {
    const t = e.target.closest(
      "[data-wm-zoom],[data-wm-row],[data-wm-step],[data-wm-product],[data-wm-pick],[data-wm-result],[data-wm-focus],[data-wm-back],[data-wm-handle],[data-wm-clear]",
    );
    if (!t && shell.dataset.panel === "peek" && e.target.closest?.("[data-wm-panel]")) {
      setPanel("open");
      return;
    }
    if (!t || !root.contains(t) || canvas.contains(t)) return;
    if (t.dataset.wmZoom) {
      if (t.dataset.wmZoom === "fit") animateTo(fitVb());
      else animateTo(zoomBy(t.dataset.wmZoom === "in" ? 1.6 : 1 / 1.6), 200);
    } else if (t.dataset.wmRow) goToRow(t.dataset.wmRow);
    else if (t.dataset.wmStep) step(Number(t.dataset.wmStep));
    else if (t.dataset.wmPick) onPick(t.dataset.wmPick);
    else if (t.dataset.wmProduct)
      onOpenProduct({
        sku: t.dataset.wmProduct,
        lot: t.dataset.wmLot || "",
        code: t.dataset.wmCode || "",
      });
    else if (t.dataset.wmResult)
      select(t.dataset.wmResult.split("-")[0], { zoom: true, mark: t.dataset.wmResult });
    else if (t.dataset.wmFocus) {
      st.primary = t.dataset.wmFocus;
      select(st.primary.split("-")[0], { zoom: true, mark: st.primary });
    } else if (t.hasAttribute("data-wm-back")) {
      st.selectedBay = "";
      st.marked = "";
      render();
    } else if (t.hasAttribute("data-wm-handle"))
      setPanel(shell.dataset.panel === "open" ? "peek" : "open");
    else if (t.hasAttribute("data-wm-clear")) setQuery("", true);
  });
  function setQuery(q, focusInput = false) {
    st.query = String(q || "");
    if (input && input.value !== st.query) input.value = st.query;
    st.selectedBay = "";
    st.marked = "";
    render();
    if (st.query) setPanel("open");
    if (st.model.searching && st.model.matchedCodes.size) {
      const rows = new Set([...st.model.matchedCodes].map((c) => c[0]));
      const b = unionBounds([...rows].map((r) => rowBounds(r)));
      if (b) animateTo(focusBounds(b, 1.8));
    } else if (!st.query) animateTo(fitVb());
    if (focusInput) input?.focus();
  }
  let qTimer = null;
  input?.addEventListener("input", () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => setQuery(input.value), 140);
  });
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && input.value) {
      e.stopPropagation();
      setQuery("");
    }
  });

  const ro =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          if (!st.fitted) {
            st.fitted = true;
            st.vb = fitVb();
          } else {
            // Conserva il centro e la scala orizzontale adattando l'altezza al nuovo contenitore.
            const aspect = rect.height / rect.width;
            const cy = st.vb.y + st.vb.h / 2;
            st.vb = clampVb({
              x: st.vb.x,
              y: cy - (st.vb.w * aspect) / 2,
              w: st.vb.w,
              h: st.vb.w * aspect,
            });
          }
          applyVb();
        })
      : null;
  ro?.observe(canvas);

  render();
  return {
    render: schedule,
    renderNow: render,
    select,
    setQuery,
    goToRow,
    fit() {
      st.vb = fitVb();
      applyVb();
    },
    // Trova: evidenzia tutte le posizioni del prodotto; la prima è quella principale.
    focus({ codes = [], primary = "" } = {}) {
      const valid = codes.map((c) => parseLocationCode(c)?.code).filter(Boolean);
      st.targets = new Set(valid);
      st.primary = parseLocationCode(primary)?.code || valid[0] || "";
      st.selectedBay = st.primary ? st.primary.split("-")[0] : "";
      st.marked = st.primary;
      setPanel("open");
      st.fitted = true;
      render();
      const rows = new Set(valid.map((c) => c[0]));
      const b = unionBounds([...rows].map((r) => rowBounds(r)));
      const go = () => {
        if (b) {
          st.vb = focusBounds(b, 2);
          applyVb();
        }
      };
      go();
      requestAnimationFrame(go);
    },
    reset() {
      st.selectedBay = "";
      st.marked = "";
      st.targets = new Set();
      st.primary = "";
      st.query = "";
      if (input) input.value = "";
      st.vb = fitVb();
      render();
    },
    get selectedBay() {
      return st.selectedBay;
    },
    destroy() {
      ro?.disconnect();
      if (anim) cancelAnimationFrame(anim);
      root.innerHTML = "";
    },
  };
}
