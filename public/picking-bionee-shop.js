export function createBioneeShopMonitor({root, getFirebase, getUser, isActive}) {
  let unsubscribe = null, timer = null, session = 0, data = null, cached = false, owner = '';
  const el = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
  const formatTime = value => value ? new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome', dateStyle:'short', timeStyle:'medium'}).format(new Date(value)) : 'Non ancora disponibile';
  const reasons = {
    SHOPIFY_INVENTORY_IDENTITY_OR_POLICY_MISMATCH: 'Uno o più prodotti Shopify hanno dati o regole di disponibilità diversi da quelli previsti. Di seguito gli articoli da correggere.',
    INACTIVE_OR_INVALID_INVENTORY_LEVEL: 'La disponibilità nella sede Shopify non è attiva o non è valida.',
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
    const fields = {inventoryPolicy: 'Vendita oltre disponibilità', tracked: 'Tracciamento inventario',
      sku: 'SKU', productId: 'Prodotto', variantId: 'Variante', inventoryItemId: 'Articolo inventario'};
    const valueLabel = value => value === 'DENY' ? 'disabilitata' : value === 'CONTINUE' ? 'abilitata' :
      value === true || value === 'true' ? 'attivo' : value === false || value === 'false' ? 'disattivo' : String(value ?? 'assente');
    for (const issue of Array.isArray(data.details?.issues) ? data.details.issues : []) {
      root.append(el('p', issue.sku + ' · ' + (fields[issue.field] || issue.field) + ': ' + valueLabel(issue.actual) +
        ' (previsto: ' + valueLabel(issue.expected) + ').', 'bioneeSyncNote'));
    }
    if (data.status === 'blocked' && ['queued', 'already_notified'].includes(data.alert?.status)) {
      root.append(el('p', 'Avviso predisposto per info@lgtrading.it.', 'bioneeSyncNote'));
    } else if (data.status === 'blocked' && data.alert?.status === 'error') {
      root.append(el('p', 'Invio dell’avviso non riuscito. Il sistema riproverà al prossimo controllo.', 'bioneeSyncNote'));
    }
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
