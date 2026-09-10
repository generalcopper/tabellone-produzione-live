export function createBioneeShopMonitor({root, getFirebase, getUser, isActive}) {
  let unsubscribe = null, timer = null, session = 0, data = null, cached = false, owner = '';
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const formatTime = value => value ? new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome', dateStyle:'short', timeStyle:'medium'}).format(new Date(value)) : 'Non ancora disponibile';
  const reasons = {
    INVENTORY_SCOPE_REQUIRED: 'Shopify non ha ancora autorizzato l’accesso all’inventario. La sincronizzazione è bloccata.',
    ORDER_RECONCILIATION_INCOMPLETE: 'Riconciliazione ordini da completare. Il controllo verrà ripetuto automaticamente.',
    PICKING_CHANGED_DURING_SYNC: 'L’inventario è cambiato durante il controllo. Verifica al prossimo ciclo.',
    DESTINATION_CHANGED_DURING_SYNC: 'Quantità Shopify cambiate durante il controllo. Verifica al prossimo ciclo.',
    SYNC_DISABLED: 'Sincronizzazione disattivata.'
  };
  function render() {
    if (!isActive()) return;
    root.replaceChildren();
    const top = el('div', undefined, 'miniTop'); top.append(el('div', 'Bionee shop', 'miniTitle')); root.append(top);
    const status = el('p', undefined, 'bioneeSyncStatus'); status.setAttribute('role','status'); root.append(status);
    if (!data) { status.textContent = cached ? 'Connessione assente. Nessun controllo disponibile.' : 'Lettura della sincronizzazione…'; return; }
    const stale = !data.checkedAtClient || Date.now() - data.checkedAtClient > 12 * 60 * 1000;
    const verified = !cached && !stale && data.status === 'synchronized' && data.verified === true && !!data.expectedHash && data.expectedHash === data.shopifyHash;
    status.dataset.state = verified ? 'ok' : 'pending';
    status.textContent = cached ? 'Connessione assente · dati memorizzati sul dispositivo' : stale ? 'Controllo non aggiornato' : verified ? 'Sincronizzazione verificata' : data.status === 'blocked' ? 'Sincronizzazione bloccata' : 'Sincronizzazione da verificare';
    const reason = reasons[data.reason] || (data.reason ? 'Controllo non completato: ' + data.reason : '');
    if (reason) root.append(el('p', reason, 'bioneeSyncNote'));
    const grid = el('dl', undefined, 'bioneeSyncGrid');
    for (const [label,value] of [
      ['Ultimo controllo',formatTime(data.checkedAtClient)], ['Ultimo sync verificato',formatTime(data.lastSuccessfulAtClient)],
      ['SKU del sito',data.catalogCount ?? '—'], ['Gruppi di SKU unificati',data.unifiedGroups ?? '—'],
      ['SKU senza inventario',Array.isArray(data.missingPicking) ? data.missingPicking.length : '—'],
      ['Differenze Shopify',data.mismatchCount ?? 'Non verificato']
    ]) { const cell=el('div'); cell.append(el('dt',label),el('dd',String(value)));grid.append(cell); }
    root.append(grid);
    const hashes = el('dl', undefined, 'bioneeSyncHashes');
    for (const [label,value] of [['Hash ultimo sync verificato',data.lastSyncHash],['Hash inventario letto',data.sourceHash],['Hash quantità attese',data.expectedHash],['Hash quantità Shopify',data.shopifyHash]]) {
      const row=el('div');row.append(el('dt',label),el('dd',value || 'Non ancora verificato'));hashes.append(row);
    }
    root.append(hashes,el('p','Aggiornamento automatico ogni 5 minuti · SHA-256 · inventario di Concamarise', 'bioneeSyncNote'));
    const rows=Array.isArray(data.rows)?data.rows:[];
    if (!rows.length) return;
    const wrap=el('div',undefined,'bioneeSyncTableWrap'), table=el('table',undefined,'bioneeSyncTable');
    table.append(el('caption','Disponibilità al momento dell’ultimo controllo'));
    const head=el('thead'), hr=el('tr');
    for (const label of ['SKU sito','Stock di riferimento','Disponibili Picking','Disponibili Shopify','Esito']) { const th=el('th',label);th.scope='col';hr.append(th); }
    head.append(hr);table.append(head);const body=el('tbody');
    for(const row of [...rows].sort((a,b)=>a.sku.localeCompare(b.sku))) {
      const tr=el('tr');tr.append(el('td',row.sku));const source=el('td',row.sourceSku || 'Assente');
      if(row.members?.length>1) source.append(el('small',row.members.length+' SKU · '+row.asin));tr.append(source);
      const actual = Number.isSafeInteger(row.shopifyQuantity) ? String(row.shopifyQuantity) : 'Non verificato';
      const state = row.excluded ? 'Duplicato escluso' : row.missing ? 'Inventario assente' : row.matches === true ? 'Allineato' : row.matches === false ? 'Da allineare' : 'Non verificato';
      tr.append(el('td',String(row.quantity)),el('td',actual),el('td',state));body.append(tr);
    }
    table.append(body);wrap.append(table);root.append(wrap);
  }
  function close() { session++; unsubscribe?.();unsubscribe=null;clearInterval(timer);timer=null; }
  function reset() { close();data=null;cached=false;owner='';root.replaceChildren(); }
  function open() {
    close();const user=getUser(), firebase=getFirebase();if(!user||!firebase?.api||!isActive())return;
    if(owner!==user.uid){data=null;owner=user.uid;}render();const current=session;
    unsubscribe=firebase.api.onSnapshot(firebase.api.doc(firebase.db,'amzInventoryMeta','shopifyFbmSync'),{includeMetadataChanges:true},snap=>{
      if(current!==session||getUser()?.uid!==owner||!isActive())return;
      data=snap.exists()?(snap.data().bioneeInventory||null):null;cached=snap.metadata.fromCache;
      render();if(!data&&!cached) root.querySelector('[role="status"]').textContent='Nessuna sincronizzazione registrata.';
    },()=>{
      if(current!==session)return;clearInterval(timer);timer=null;data=null;root.replaceChildren(el('div','Bionee shop','miniTitle'),el('p','Impossibile leggere il monitor. Verifica connessione e accesso a Picking.','bioneeSyncNote'));
    });
    timer=setInterval(render,30000);
  }
  return {open,close,reset};
}
