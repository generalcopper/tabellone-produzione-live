const VIEW='lg-shortcuts.sync-view.v1';
const OUTBOX='lg-new-tab.pending-changes.v1';

export function undoShortcutChange(current,before,after) {
  const previous=new Map(before.map(i=>[i.id,i]));
  const following=new Map(after.map(i=>[i.id,i]));
  const result=current.filter(i=>previous.has(i.id)||!following.has(i.id));
  for (const [index,old] of before.entries()) {
    const value=following.get(old.id);
    if (!value) {
      if (!result.some(i=>i.id===old.id)) result.splice(Math.min(index,result.length),0,old);
    } else if (JSON.stringify(old)!==JSON.stringify(value)) {
      const currentIndex=result.findIndex(i=>i.id===old.id);
      if (currentIndex>=0 && JSON.stringify(result[currentIndex])===JSON.stringify(value)) result[currentIndex]=old;
    }
  }
  return result;
}
export function startShortcutSync({initial,onUpdate,onStatus}) {
  if (location.protocol!=='chrome-extension:' || !globalThis.chrome?.storage?.local) return null;
  function readPending() {
    try {const value=JSON.parse(localStorage.getItem(OUTBOX)||'[]');return Array.isArray(value)?value:[];} catch {return [];}
  }
  let pending=readPending();
  let busy=false,ready=false;
  function cachePending() {
    localStorage.setItem(OUTBOX,JSON.stringify(pending));
  }
  function apply(value) {
    if (!value || value.version!==1 || !Array.isArray(value.shortcuts)) return;
    onStatus(value.status||'saved');
    pending=readPending();
    if (!pending.length) onUpdate(value.shortcuts);
  }
  async function drain() {
    if (busy || !ready) return;
    busy=true;
    try {
      while((pending=readPending()).length) {
        const entry=pending[0];
        const response=await chrome.runtime.sendMessage({type:'lg-shortcuts-change',...entry});
        if (!response?.ok) throw new Error(response?.error||'Sincronizzazione non disponibile');
        pending=readPending().filter(value=>value.operationId!==entry.operationId);cachePending();apply(response);
      }
    } catch {onStatus('pending');}
    finally {busy=false;}
  }
  chrome.storage.onChanged.addListener((changes,area)=>{
    if (area==='local' && changes[VIEW]?.newValue) apply(changes[VIEW].newValue);
  });
  async function initialize() {
    try {
      onStatus('connecting');
      // Migrate the pre-existing state; pending edits remain separate operations.
      const base=pending.length?pending[0].before:initial;
      const response=await chrome.runtime.sendMessage({type:'lg-shortcuts-init',initial:base});
      if (!response?.ok) throw new Error(response?.error||'Sincronizzazione non disponibile');
      ready=true;apply(response);await drain();
    } catch {onStatus('pending');}
  }
  const refresh=()=>{
    if (!ready) {initialize();return;}
    drain();
    chrome.runtime.sendMessage({type:'lg-shortcuts-refresh'}).then(apply).catch(()=>onStatus('pending'));
  };
  window.addEventListener('online',refresh);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  initialize();
  return {
    save(before,next) {
      pending=readPending();
      pending.push({operationId:crypto.randomUUID(),before,next});
      try {cachePending();} catch {onStatus('pending');}
      onStatus('pending');drain();
    }
  };
}
