'use strict';

// Keep stock/lot normalization compatible with public/picking.html.
// tests/cerea-contract.test.cjs verifies the backend against the Picking reader.


function parseSignedQtyStrict(v){
  if(v === null || v === undefined) return null;
  const raw0 = String(v);
  const raw = raw0.trim();
  if(!raw) return null;

  // consenti spazi dopo il segno: "- 200" / "+ 200"
  const m = raw.match(/^([+-])?\s*(.*)$/);
  const sign = (m && m[1]) ? m[1] : "";
  let body = (m && m[2] != null) ? String(m[2]) : raw;

  // rimuovi spazi interni (es. "2 000")
  body = body.trim().replace(/\s+/g, "");
  if(!body) return null;

  // normalizza formati italiani (migliaia/decimali)
  // es: "2.000" -> "2000", "1.234,56" -> "1234.56"
  if(body.includes(",")){
    body = body.replace(/\./g, "");
    body = body.replace(",", ".");
  }else{
    if(/^\d{1,3}(?:\.\d{3})+$/.test(body)) body = body.replace(/\./g, "");
    body = body.replace(",", ".");
  }

  // valida formato numerico semplice
  if(!/^\d+(?:\.\d+)?$/.test(body)) return null;

  const n = parseFloat(sign + body);
  if(!Number.isFinite(n)) return null;

  if(!Number.isInteger(n)) return null;
  return n;
}

function buildRackLocationOptions(){
  const out = [];
  const addBay = (rack, bay, pallets, levels=3)=>{
    const b = String(bay).padStart(2, "0");
    for(let l=1; l<=levels; l++){
      for(let p=1; p<=pallets; p++){
        out.push(`${rack}${b}-L${l}-P${p}`);
      }
    }
  };
  // A: A04 da 2 pallet
  for(let bay=1; bay<=4; bay++) addBay("A", bay, bay===4 ? 2 : 3);
  // B: tutte da 3
  for(let bay=1; bay<=4; bay++) addBay("B", bay, 3);
  // C: nuova C00 da 3 pallet; C01 resta da 2 pallet
  addBay("C", 0, 3);
  for(let bay=1; bay<=4; bay++) addBay("C", bay, bay===1 ? 2 : 3);
  // D: nuova D05 da 3 pallet; D04 resta da 2 pallet
  for(let bay=1; bay<=5; bay++) addBay("D", bay, bay===4 ? 2 : 3);
  // E: E01/E02 da 3 pallet; nuova E03 da 2 pallet
  for(let bay=1; bay<=3; bay++) addBay("E", bay, bay===3 ? 2 : 3);
  // F: nuova F00 da 2 pallet; F01/F02 restano da 3 pallet
  addBay("F", 0, 2);
  for(let bay=1; bay<=2; bay++) addBay("F", bay, 3);
  // G: solo livello L1; G01/G02 da 3 pallet, G03 da 2 pallet
  for(let bay=1; bay<=3; bay++) addBay("G", bay, bay===3 ? 2 : 3, 1);
  return out;
}

function productionLotIdFromTs(ts){
  // Match the Italian warehouse day even though Cloud Functions runs in UTC.
  const n = Number(ts || Date.now());
  const date = Number.isFinite(n) ? new Date(n) : new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone:'Europe/Rome', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(date).map(part => [part.type, part.value]));
  return `LOTTO-${parts.year}${parts.month}${parts.day}`;
}

function normalizeLotId(v, fallbackTs=null){
  const raw = String(v || "").trim().toUpperCase().replace(/\s+/g, "");
  if(raw) return raw;
  if(fallbackTs !== null && fallbackTs !== undefined) return productionLotIdFromTs(fallbackTs);
  return "";
}

function rawStockLotsFromDoc(d){
  if(!d || typeof d !== "object") return [];
  if(Array.isArray(d.stockLots)) return d.stockLots;
  if(Array.isArray(d.lots)) return d.lots;
  if(Array.isArray(d.productionLots)) return d.productionLots;
  return [];
}

function readStockLotsFromDoc(d){
  const totalQty = stockQtyFromDoc(d || {});
  if(totalQty <= 0) return [];

  const map = new Map();
  const raw = rawStockLotsFromDoc(d || {});
  for(const x of raw){
    if(!x || typeof x !== "object") continue;
    const q0 = x.qty ?? x.quantity ?? x.pieces ?? x.qta ?? 0;
    const qty = Number.isFinite(Number(q0)) ? Math.round(Number(q0)) : parseSignedQtyStrict(q0);
    if(!Number.isFinite(qty) || qty <= 0) continue;
    const lot = normalizeLotId(x.lot || x.batch || x.batchId || x.lotto || x.id || "", x.createdAtClient || x.producedAtClient || x.dateClient || null) || LOT_LEGACY_ID;
    const prev = map.get(lot) || { lot, qty:0, createdAtClient:Number(x.createdAtClient || x.producedAtClient || 0) || 0, producedAtClient:Number(x.producedAtClient || x.createdAtClient || 0) || 0, source:String(x.source || "") };
    prev.qty += qty;
    if(!prev.createdAtClient && (x.createdAtClient || x.producedAtClient)) prev.createdAtClient = Number(x.createdAtClient || x.producedAtClient) || 0;
    if(!prev.producedAtClient && (x.producedAtClient || x.createdAtClient)) prev.producedAtClient = Number(x.producedAtClient || x.createdAtClient) || 0;
    if(!prev.source && x.source) prev.source = String(x.source || "");
    map.set(lot, prev);
  }

  let explicitTotal = Array.from(map.values()).reduce((a,x)=> a + (Number.isFinite(Number(x.qty)) ? Number(x.qty) : 0), 0);
  if(totalQty > explicitTotal){
    const legacyQty = totalQty - explicitTotal;
    const prev = map.get(LOT_LEGACY_ID) || { lot:LOT_LEGACY_ID, qty:0, createdAtClient:0, producedAtClient:0, source:"legacy" };
    prev.qty += legacyQty;
    map.set(LOT_LEGACY_ID, prev);
  }

  let lots = Array.from(map.values())
    .map(x=>({ lot: normalizeLotId(x.lot) || LOT_LEGACY_ID, qty: Math.max(0, Math.round(Number(x.qty)||0)), createdAtClient:Number(x.createdAtClient || x.producedAtClient || 0) || 0, producedAtClient:Number(x.producedAtClient || x.createdAtClient || 0) || 0, source:String(x.source || "") }))
    .filter(x=> x.qty > 0)
    .sort((a,b)=>{
      const ta = a.createdAtClient || 0;
      const tb = b.createdAtClient || 0;
      if(ta !== tb) return ta - tb;
      return String(a.lot).localeCompare(String(b.lot));
    });

  // Se i lotti storici/cloud superano la giacenza reale (scarichi non lottizzati),
  // taglio il totale senza creare dati locali: la quantità reale resta sempre quella del documento cloud.
  let running = 0;
  lots = lots.map(l=>{
    const allowed = Math.max(0, Math.min(l.qty, totalQty - running));
    running += allowed;
    return { ...l, qty: allowed };
  }).filter(l=> l.qty > 0);

  return lots;
}

function stockQtyFromDoc(d){
  try{
    const raw = d && Object.prototype.hasOwnProperty.call(d, "qty") ? d.qty : 0;
    const q = Number.isFinite(Number(raw)) ? Math.round(Number(raw)) : parseSignedQtyStrict(raw);
    return Number.isFinite(q) ? q : 0;
  }catch(_e){
    return 0;
  }
}

function normalizeRackLocation(v){
  return String(v || "").trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeRackLocationsList(value){
  const raw = Array.isArray(value) ? value : String(value || "").split(/[;,\n]+/g);
  const out = [];
  const seen = new Set();
  for(const x of raw){
    const code = normalizeRackLocation(x);
    if(!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

function normalizeRackAllocationsForWrite(value){
  const arr = Array.isArray(value) ? value : [];
  const map = new Map();
  for(const x of arr){
    const code = normalizeRackLocation((x && typeof x === "object") ? (x.code || x.location || x.rackLocation || x.ubicazione || "") : "");
    const q0 = (x && typeof x === "object") ? (x.qty ?? x.quantity ?? x.pieces ?? x.qta ?? 0) : 0;
    const qty = Number.isFinite(Number(q0)) ? Math.round(Number(q0)) : parseSignedQtyStrict(q0);
    const lot = normalizeLotId((x && typeof x === "object") ? (x.lot || x.batch || x.batchId || x.lotto || "") : "") || LOT_LEGACY_ID;
    if(!code || !RACK_LOCATION_SET.has(code) || !Number.isFinite(qty) || qty <= 0) continue;
    const key = `${code}::${lot}`;
    const prev = map.get(key) || { code, lot, qty:0 };
    prev.qty += qty;
    map.set(key, prev);
  }
  return Array.from(map.values()).map(x=>({ code:x.code, lot:x.lot, qty:Math.round(x.qty) }));
}


const RACK_LOCATION_SET = new Set(buildRackLocationOptions());
const LOT_LEGACY_ID = 'LOTTO-STORICO';

function isCereaProduction(doc) {
  const area = doc?.productionArea ?? doc?.areaProduzione ?? doc?.produzioneArea
    ?? doc?.productionLocation ?? doc?.productionSite ?? '';
  return String(area).trim().toLowerCase() === 'cerea';
}

function automaticCereaAllocations(doc) {
  if (!isCereaProduction(doc)) return null;
  const qty = stockQtyFromDoc(doc);
  if (qty <= 0) return [];
  const racks = normalizeRackAllocationsForWrite(doc.rackAllocations);
  const located = racks.reduce((sum, row) => sum + row.qty, 0);
  // Legacy rack codes without explicit quantities mean that all stock is located.
  const legacy = Object.hasOwn(doc, 'rackLocations') ? doc.rackLocations
    : (doc.rackLocation || doc.shelfLocation || doc.storageSlot || doc.warehouseSlot || doc.ubicazione || '');
  if (!located && normalizeRackLocationsList(legacy).length) return [];
  let remaining = Math.max(0, qty - located);
  const byLot = new Map();
  for (const row of racks) byLot.set(row.lot, (byLot.get(row.lot) || 0) + row.qty);
  const result = [];
  for (const lot of readStockLotsFromDoc(doc)) {
    const free = Math.min(remaining, Math.max(0, lot.qty - (byLot.get(lot.lot) || 0)));
    if (free > 0) result.push({code:'CEREA', lot:lot.lot, qty:free});
    remaining -= free;
  }
  return result.sort((a, b) => a.lot.localeCompare(b.lot));
}

function sameCereaAllocations(a, b) {
  const key = rows => JSON.stringify((Array.isArray(rows) ? rows : []).map(row => [
    normalizeLotId(row?.lot) || LOT_LEGACY_ID, Number(row?.qty)
  ]).sort((x, y) => String(x[0]).localeCompare(String(y[0])) || x[1] - y[1]));
  return key(a) === key(b);
}

module.exports = {isCereaProduction, automaticCereaAllocations, sameCereaAllocations};
