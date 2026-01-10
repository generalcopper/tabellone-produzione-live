// /public1/dash_inventario.js
// Dashboard charts + widgets (home view)
// - Grafico categorie (conteggio / quantità) con tooltip
// - Tabella movimenti recenti
// - Re-render su resize + su renderAll (evento HubDashData)

let __api = null;
let __els = {};
let __last = { stockArr: [], stockByWh: [], movements: [], categories: [], suppliers: [], products: [] };
let __dirtyRaf = 0;

function $(id){ return document.getElementById(id); }
function safeStr(v){ return (v == null) ? "" : String(v); }
function norm(v){ return safeStr(v).trim().toLowerCase(); }
function fmtInt(n){ return (Number(n) || 0).toLocaleString("it-IT"); }

function tsToMillis(ts){
  try{
    if (!ts) return 0;
    if (typeof ts === "number") return ts;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    const s = safeStr(ts);
    const t = Date.parse(s);
    if (!Number.isNaN(t)) return t;
    return 0;
  }catch(_){ return 0; }
}

function cacheEls(){
  __els.viewHome = $("viewHome");
  __els.selWh = $("dashWarehouse");
  __els.selMetric = $("dashCatsMetric");
  __els.title = $("dashCatsTitle");
  __els.meta = $("dashCatsMeta");
  __els.canvas = $("dashCatsCanvas");
  __els.legend = $("dashCatsLegend");
  __els.tip = $("dashCatsTooltip");
  __els.recentTbody = $("dashRecentTbody");
  __els.recentMeta = $("dashRecentMeta");
  __els.btnOpenMov = $("btnDashOpenMovements");
  __els.btnOpenFlows = $("btnDashOpenFlows");
}

function ensureBindings(){
  if (__els._bound) return;
  cacheEls();

  // Nav shortcuts
  __els.btnOpenMov?.addEventListener("click", () => {
    try{ __api?.setView && __api.setView("movements"); }catch(_){}
  });
  __els.btnOpenFlows?.addEventListener("click", () => {
    try{ __api?.setView && __api.setView("flows"); }catch(_){}
  });

  // Controls
  __els.selWh?.addEventListener("change", scheduleRender);
  __els.selMetric?.addEventListener("change", scheduleRender);

  // Tooltip events
  if (__els.canvas){
    __els.canvas.addEventListener("pointermove", onCanvasMove);
    __els.canvas.addEventListener("pointerleave", hideTooltip);
  }

  // Resize
  window.addEventListener("resize", scheduleRender, { passive: true });

  __els._bound = true;
}

function scheduleRender(){
  if (__dirtyRaf) return;
  __dirtyRaf = requestAnimationFrame(() => {
    __dirtyRaf = 0;
    render();
  });
}

function buildLookups(){
  const products = (__api && typeof __api.getProducts === "function") ? (__api.getProducts() || []) : [];
  const suppliers = (__api && typeof __api.getSuppliers === "function") ? (__api.getSuppliers() || []) : [];
  __last.products = products;
  __last.suppliers = suppliers;

  const byCode = new Map();
  for (const p of products){
    const c = norm(p && (p.code || p.id));
    if (!c) continue;
    if (!byCode.has(c)) byCode.set(c, p);
  }
  __last._prodByCode = byCode;
}

function categoryForCode(code){
  const low = norm(code);
  if (!low) return "";
  const p = __last._prodByCode ? __last._prodByCode.get(low) : null;
  const c1 = safeStr(p && p.category).trim();
  if (c1) return c1;

  // fallback locale
  const c2 = safeStr(__api && __api.state && __api.state.productCategories && __api.state.productCategories[low]).trim();
  if (c2) return c2;

  return "";
}

function pickStockRows(){
  const wh = safeStr(__els.selWh && __els.selWh.value).trim().toLowerCase() || "all";
  const rows = Array.isArray(__last.stockByWh) ? __last.stockByWh : [];
  const arr = Array.isArray(__last.stockArr) ? __last.stockArr : [];
  if (wh === "cerea" || wh === "concamarise"){
    return rows.filter(r => norm(r && r.warehouse) === wh);
  }
  return arr;
}

function computeCatStats(rows){
  const out = new Map(); // cat -> {name, count, qty}
  for (const r of (rows || [])){
    if (!r) continue;
    const code = safeStr(r.code).trim();
    const qty = Number(r.qty) || 0;
    const cat = (categoryForCode(code) || "").trim() || "Senza categoria";

    const cur = out.get(cat) || { name: cat, count: 0, qty: 0 };
    cur.count += 1;
    cur.qty += qty;
    out.set(cat, cur);
  }
  const list = Array.from(out.values());
  return list;
}

function toTopN(list, metric, n){
  const m = (metric === "qty") ? "qty" : "count";
  const sorted = list.slice().sort((a,b) => (Number(b[m])||0) - (Number(a[m])||0));
  const top = sorted.slice(0, n);
  const rest = sorted.slice(n);
  if (rest.length){
    const agg = rest.reduce((acc, x) => {
      acc.count += Number(x.count)||0;
      acc.qty += Number(x.qty)||0;
      return acc;
    }, { name: "Altro", count: 0, qty: 0 });
    if ((Number(agg[m])||0) > 0) top.push(agg);
  }
  return { top, totalCats: sorted.length };
}

function palette(i, n){
  // palette coerente (freddo → caldo)
  const hue = (210 + (i * 360 / Math.max(1,n))) % 360;
  return `hsl(${hue} 78% 52%)`;
}

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function drawBars(canvas, labels, values, colors){
  if (!canvas) return { bars: [] };

  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const cssW = canvas.clientWidth || 600;
  const cssH = canvas.clientHeight || 260;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssW, cssH);

  // layout
  const pad = { l: 10, r: 10, t: 8, b: 18 };
  const w = cssW - pad.l - pad.r;
  const h = cssH - pad.t - pad.b;

  const maxV = Math.max(1, ...values.map(v => Number(v)||0));
  const bars = [];
  const gap = Math.max(8, Math.min(14, w / Math.max(1, values.length) / 4));
  const bw = (w - gap * (values.length - 1)) / Math.max(1, values.length);
  const baseY = pad.t + h;

  // grid
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  const gridN = 4;
  for (let i=1;i<=gridN;i++){
    const y = pad.t + (h * i / (gridN+1));
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + w, y);
    ctx.stroke();
  }
  ctx.restore();

  // bars
  for (let i=0;i<values.length;i++){
    const v = Number(values[i]) || 0;
    const bh = Math.max(2, Math.round((v / maxV) * h));
    const x = pad.l + i * (bw + gap);
    const y = baseY - bh;

    const color = colors[i] || "rgba(10,132,255,.9)";

    // shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 10;

    ctx.fillStyle = color;
    roundRect(ctx, x, y, bw, bh, 12);
    ctx.fill();
    ctx.restore();

    bars.push({ x, y, w: bw, h: bh, label: labels[i], value: v, color });
  }

  // x labels (minimal: 1st, mid, last)
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "900 11px ui-sans-serif, -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial";
  ctx.textBaseline = "top";
  const pick = new Set([0, Math.floor((labels.length-1)/2), labels.length-1].filter(i => i>=0 && i<labels.length));
  for (const i of pick){
    const l = safeStr(labels[i]);
    const x = pad.l + i * (bw + gap) + bw/2;
    const txt = l.length > 12 ? (l.slice(0,12) + "…") : l;
    const tw = ctx.measureText(txt).width;
    ctx.fillText(txt, x - tw/2, baseY + 6);
  }
  ctx.restore();

  canvas.__dashBars = bars;
  return { bars };
}

function onCanvasMove(ev){
  if (!__els.canvas || !__els.tip) return;
  const bars = __els.canvas.__dashBars || [];
  if (!bars.length) return;

  const rect = __els.canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;

  let hit = null;
  for (const b of bars){
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h){
      hit = b; break;
    }
  }
  if (!hit){ hideTooltip(); return; }

  const metric = safeStr(__els.selMetric && __els.selMetric.value) === "qty" ? "qty" : "count";
  const unit = (metric === "qty") ? "" : "";
  const label = safeStr(hit.label);
  const value = fmtInt(hit.value);

  __els.tip.innerHTML = `<div style="font-weight:950; margin-bottom:2px;">${escapeHtml(label)}</div><div>${value}${unit}</div>`;

  const tipPad = 10;
  const tipW = __els.tip.offsetWidth || 180;
  const tipH = __els.tip.offsetHeight || 44;

  let tx = x + 14;
  let ty = y - tipH - 12;
  if (tx + tipW + tipPad > rect.width) tx = x - tipW - 14;
  if (ty < 0) ty = y + 14;

  __els.tip.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
  __els.tip.classList.add("show");
  __els.tip.setAttribute("aria-hidden", "false");
}

function hideTooltip(){
  if (!__els.tip) return;
  __els.tip.classList.remove("show");
  __els.tip.style.transform = "translate(-9999px, -9999px)";
  __els.tip.setAttribute("aria-hidden", "true");
}

function escapeHtml(s){
  return safeStr(s).replace(/[&<>"']/g, (ch) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[ch] || ch));
}

function renderLegend(items, metric){
  if (!__els.legend) return;
  if (!items.length){
    __els.legend.innerHTML = "";
    return;
  }
  const m = (metric === "qty") ? "qty" : "count";
  __els.legend.innerHTML = items.map((it, i) => {
    const col = palette(i, items.length);
    const name = escapeHtml(it.name);
    const val = fmtInt(it[m]);
    return `
      <div class="dashLegendItem">
        <div class="dashLegendLeft">
          <span class="dashLegendDot" style="background:${col}"></span>
          <span class="dashLegendName" title="${name}">${name}</span>
        </div>
        <div class="dashLegendVal">${val}</div>
      </div>
    `;
  }).join("");
}

function renderRecent(){
  if (!__els.recentTbody) return;

  const all = Array.isArray(__last.movements) ? __last.movements.slice() : [];
  all.sort((a,b) => tsToMillis(b && b.createdAt) - tsToMillis(a && a.createdAt));

  const take = all.slice(0, 8);

  if (__els.recentMeta){
    __els.recentMeta.textContent = take.length ? ("Ultimi " + take.length + " movimenti") : "—";
  }

  if (!take.length){
    __els.recentTbody.innerHTML = '<tr><td class="td-muted" colspan="5">Nessun movimento.</td></tr>';
    return;
  }

  const fmtDate = (mv) => {
    const d = (mv && (mv.date || mv.docDate || "")) ? safeStr(mv.date || mv.docDate) : "";
    if (d && d.length >= 10) return d.slice(0,10);
    const t = tsToMillis(mv && mv.createdAt);
    if (!t) return "—";
    try{ return new Date(t).toLocaleDateString("it-IT"); }catch(_){ return "—"; }
  };

  const badge = (t) => {
    const up = safeStr(t).toUpperCase() === "OUT" ? "OUT" : "IN";
    const cls = up === "OUT" ? "dashBadge out" : "dashBadge in";
    return `<span class="${cls}">${up}</span>`;
  };

  __els.recentTbody.innerHTML = take.map(mv => {
    const dt = escapeHtml(fmtDate(mv));
    const typ = badge(mv && mv.type);
    const cust = escapeHtml(safeStr(mv && mv.customer) || "—");
    const code = escapeHtml(safeStr(mv && mv.code) || "—");
    const q = Number(mv && mv.qty) || 0;
    const uom = escapeHtml(safeStr(mv && mv.uom).trim());
    const qTxt = fmtInt(q) + (uom ? (" " + uom) : "");
    return `
      <tr>
        <td>${dt}</td>
        <td>${typ}</td>
        <td style="white-space:normal;">${cust}</td>
        <td><span class="kbd">${code}</span></td>
        <td class="qty">${escapeHtml(qTxt)}</td>
      </tr>
    `;
  }).join("");
}

function render(){
  cacheEls();
  if (!__els.viewHome) return;

  // Build lookups (products/suppliers)
  buildLookups();

  // Compute + render chart
  const rows = pickStockRows();
  const metric = safeStr(__els.selMetric && __els.selMetric.value) === "qty" ? "qty" : "count";

  const list = computeCatStats(rows);
  const top = toTopN(list, metric, 8);

  if (__els.title){
    __els.title.textContent = (metric === "qty") ? "Quantità per categoria" : "Articoli per categoria";
  }
  if (__els.meta){
    const wh = safeStr(__els.selWh && __els.selWh.value) || "all";
    const scope = (wh === "cerea") ? "Cerea" : (wh === "concamarise" ? "Concamarise" : "Totale");
    __els.meta.textContent = `${scope} • ${top.totalCats} categorie • top ${Math.min(8, top.totalCats)} + Altro`;
  }

  const labels = top.top.map(x => x.name);
  const vals = top.top.map(x => Number(x[metric]) || 0);
  const cols = labels.map((_,i) => palette(i, labels.length));

  drawBars(__els.canvas, labels, vals, cols);
  renderLegend(top.top, metric);

  // Recent
  renderRecent();
}

function setDataFromDetail(detail){
  __last.stockArr = Array.isArray(detail && detail.stockArr) ? detail.stockArr : [];
  __last.stockByWh = Array.isArray(detail && detail.stockByWh) ? detail.stockByWh : [];
  __last.movements = Array.isArray(detail && detail.movements) ? detail.movements : (__api && __api.state && Array.isArray(__api.state.movements) ? __api.state.movements : []);
  __last.categories = Array.isArray(detail && detail.categories) ? detail.categories : [];
}

function init(api){
  __api = api || window.HubInv || null;
  if (!__api) return;

  cacheEls();
  ensureBindings();

  // First render with current state
  try{
    __last.movements = (__api.state && Array.isArray(__api.state.movements)) ? __api.state.movements : [];
  }catch(_){}

  scheduleRender();
}

window.addEventListener("HubInvReady", (ev) => {
  try{ init(ev && ev.detail); }catch(_){}
});

// Update hook from core renderAll()
window.addEventListener("HubDashData", (ev) => {
  try{
    setDataFromDetail(ev && ev.detail || {});
    // avoid render storm if not on home: we still update, but cheap
    scheduleRender();
  }catch(_){}
});

// Hot reload fallback
if (window.HubInv){
  try{ init(window.HubInv); }catch(_){}
}
