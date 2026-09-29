export const PREFIX = 'lg-shortcut.v1.';
export const META = 'lg-shortcuts.meta.v1';
export const STORE = 'lg-shortcuts.sync-state.v1';
export const VIEW = 'lg-shortcuts.sync-view.v1';
export const SYNC_VERSION = 1;
export const recordKey = id => PREFIX + encodeURIComponent(id);

export function item(value) {
  if (!value || typeof value.id !== 'string' || !value.id || value.id.length > 200 ||
      typeof value.name !== 'string' || !value.name.trim() || value.name.length > 120 ||
      typeof value.url !== 'string' || value.url.length > 8192) throw new Error('Scorciatoia non valida');
  const url = new URL(value.url);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('URL non valido');
  return {id:value.id, name:value.name, url:url.href, icon:typeof value.icon === 'string' ? value.icon.slice(0,80) : ''};
}
export function items(values) {
  if (!Array.isArray(values)) throw new Error('Elenco non valido');
  const ids = new Set();
  return values.map(value => {
    const result = item(value);
    if (ids.has(result.id)) throw new Error('Scorciatoia duplicata');
    ids.add(result.id);
    return result;
  });
}
export function validRecord(key, r) {
  try {
    if (!r || r.v !== 1 || typeof r.id !== 'string' || key !== recordKey(r.id) ||
        !Number.isSafeInteger(r.t) || r.t < 0 || typeof r.c !== 'string' || r.c.length > 64) return false;
    if (r.deleted!==undefined && r.deleted!==true) return false;
    if (r.deleted === true) return r.id.length > 0 && r.id.length <= 200;
    return Number.isFinite(r.p) && r.p >= 0 && item(r.item).id === r.id;
  } catch { return false; }
}
function compare(a,b) {
  if (a.t !== b.t) return a.t - b.t;
  if (a.deleted !== b.deleted) return a.deleted ? 1 : -1;
  if (a.c !== b.c) return a.c < b.c ? -1 : 1;
  const av=JSON.stringify(a), bv=JSON.stringify(b);
  return av === bv ? 0 : av < bv ? -1 : 1;
}
export function merge(left,right) {
  const result={...left};
  for (const [key,r] of Object.entries(right)) {
    if (validRecord(key,r) && (!result[key] || compare(r,result[key]) > 0)) result[key]=r;
  }
  return result;
}
export function visible(records) {
  return Object.values(records).filter(r=>!r.deleted).sort((a,b)=>a.p-b.p || (a.id<b.id?-1:a.id>b.id?1:0)).map(r=>r.item);
}
export function seed(current,defaults) {
  const result={};const present=new Set(current.map(i=>i.id));
  for (const original of defaults) {
    if (!present.has(original.id)) result[recordKey(original.id)]={v:1,id:original.id,t:0,c:'seed',deleted:true};
  }
  items(current).forEach((value,p)=>{result[recordKey(value.id)]={v:1,id:value.id,t:0,c:'seed',p,item:value};});
  return result;
}
export function change(records,beforeValues,nextValues,client,clock) {
  const before=items(beforeValues),next=items(nextValues);
  const previous=new Map(before.map(value=>[value.id,value]));
  const following=new Map(next.map(value=>[value.id,value]));
  const common=before.filter(value=>following.has(value.id)).map(value=>value.id);
  const reorder=common.some((id,index)=>next[index]?.id!==id);
  const t=Math.max(Date.now(),clock+1,...Object.values(records).map(r=>r.t+1));
  const changed={};let end=Math.max(-1,...Object.values(records).filter(r=>!r.deleted).map(r=>r.p));
  for (const value of before) {
    if (!following.has(value.id)) changed[recordKey(value.id)]={v:1,id:value.id,t,c:client,deleted:true};
  }
  next.forEach((value,index)=>{
    const old=previous.get(value.id),existing=records[recordKey(value.id)];
    if (!old || JSON.stringify(old)!==JSON.stringify(value) || reorder) {
      const p=reorder ? index : existing && !existing.deleted ? existing.p : ++end;
      changed[recordKey(value.id)]={v:1,id:value.id,t,c:client,p,item:value};
    }
  });
  return {records:merge(records,changed),clock:t};
}
