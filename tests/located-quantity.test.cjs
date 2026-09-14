const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/picking.html'), 'utf8');
function block(start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert(from >= 0 && to > from, start);
  return source.slice(from, to);
}
const code = [
  block('    function parseSignedQtyStrict(', '    // --- title/meta helpers'),
  block('    function productionLotIdFromTs(', '    function normalizeRackLocation('),
  block('    function normalizeRackLocation(', '    function rackLocationDisplayPartsFromItem('),
  block('    function rackAllocationRowsForDetails(', '    function rackAllocationsEditorHtml('),
  block('    function buildStockLotsForUnallocatedQty(', '    async function editHomeNoLocationQtyPrompt('),
  block('    function locatedQtySnapshotKey(', '    function renderHomeNoLocationBox('),
  block('    function getItemsWithRackLocations(', '    // --- Picking visual:')
].join('\n');
const a = {code:'A01-L1-P1', lot:'LOTTO-20260901', qty:480};
const b = {code:'B01-L1-P1', lot:'LOTTO-20260902', qty:300};
const legacy = 'LOTTO-STORICO';
function item(overrides = {}) {
  return {sku:'OWNER', title:'Prodotto', qty:1000, rackAllocations:[{...a}],
    stockLots:[{lot:a.lot, qty:1000, createdAtClient:1}], reservedQty:25, ...overrides};
}
function context(items = [item()]) {
  const ctx = {console:{error(){}}, Date, LOT_LEGACY_ID:legacy,
    RACK_LOCATION_SET:new Set([a.code, b.code]), INVENTORY_CANONICAL_LOC:'concamarise',
    COL_ROOT:'amzInventory', SUB_ITEMS:'items', COL_PRODUCTS:'amzInventoryProducts', SUB_MOVES:'movements',
    state:{route:{loc:'concamarise'}, user:{uid:'operator', email:'operator@test'}, ui:{}, firebase:{}},
    toSkuId:x=>String(x || '').toUpperCase(), stockSkuForSkuAny:()=> 'OWNER',
    getProductBySku:(_loc,sku)=>items.find(x=>x.sku === sku), stockRepresentativeItemsForLoc:()=>items,
    canUsePickingActions:()=>true, squashWhitespace:x=>x, normalizeText:x=>x,
    prettyLoc:x=>x, renderHomeDashboard(){}, renderProductDetailsSheet(){},
    escapeHtml:x=>String(x).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))};
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}
function fixture({runtime = item(), cloud = runtime, requested = [{...a, qty:460}], retry} = {}) {
  const ctx = context([structuredClone(runtime)]);
  const itemPath = 'amzInventory/concamarise/items/OWNER';
  const store = new Map([[itemPath, structuredClone(cloud)]]);
  const toasts = [], patches = [], writes = [];
  let generated = 0;
  const api = {
    collection:(_db,...parts)=>parts.join('/'),
    doc:(base,...parts)=>parts.length ? (typeof base === 'string' ? [base,...parts].join('/') : parts.join('/')) : {id:`edit-${++generated}`},
    serverTimestamp:()=>123,
    runTransaction:async(_db,fn)=>{
      for(let attempt=0; attempt<(retry ? 2 : 1); attempt++) {
        const pending = [];
        const tx = {
          get:async ref=>{assert.equal(pending.length,0,'read before write'); const d=store.get(ref); return {exists:()=>!!d,data:()=>structuredClone(d)};},
          set:(ref,data)=>pending.push([ref,structuredClone(data)])
        };
        await fn(tx);
        if(retry && !attempt) { retry(store.get(itemPath)); continue; }
        for(const [ref,data] of pending) {store.set(ref,{...store.get(ref),...data}); writes.push([ref,data]);}
      }
    }
  };
  Object.assign(ctx,{requestLocatedQtyEdit:async()=>requested,
    showToast:(...args)=>toasts.push(args), patchRuntimeInventoryItem:(...args)=>patches.push(args),
    addProductMovementToBatch:(tx,_api,_db,sku,data)=>tx.set(`amzInventoryProducts/${sku}/movements/${data.movementId}`,data)});
  ctx.state.firebase = {api,db:{}};
  return {ctx,store,toasts,patches,writes,run:()=>ctx.editHomeLocatedQtyPrompt('CHILD','concamarise'),get:()=>store.get(itemPath)};
}

test('located quantity matches the list, and correcting it preserves unallocated stock',()=>{
  const ctx=context(), listed=ctx.getItemsWithRackLocations()[0];
  assert.equal(listed.allocatedQty,480); assert.equal(listed.totalQty,1000);
  const edit=ctx.buildLocatedQtyEdit(item(),[{...a,qty:460}]);
  assert.equal(edit.beforeAllocated,listed.allocatedQty);
  assert.equal(edit.afterAllocated,460); assert.equal(edit.unallocated,520);
  assert.equal(edit.afterTotal,980); assert.equal(edit.stockLots[0].qty,980);
});
test('multiple racks and lots change only by their explicitly edited quantities',()=>{
  const doc=item({qty:1200,rackAllocations:[{...a,qty:200},b],stockLots:[{lot:a.lot,qty:700},{lot:b.lot,qty:500}]});
  const edit=context().buildLocatedQtyEdit(doc,[{...a,qty:180},{...b,qty:320}]);
  assert.equal(edit.afterTotal,1200); assert.equal(edit.afterAllocated,500);
  assert.equal(edit.stockLots.find(x=>x.lot===a.lot).qty,680);
  assert.equal(edit.stockLots.find(x=>x.lot===b.lot).qty,520);
  assert.equal(edit.unallocated,700); assert.equal(edit.changes.length,2);
});
test('increasing a rack changes its lot and total without consuming unallocated pieces',()=>{
  const edit=context().buildLocatedQtyEdit(item(),[{...a,qty:600}]);
  assert.equal(edit.afterTotal,1120); assert.equal(edit.unallocated,520);
  assert.equal(edit.stockLots[0].qty,1120);
});
test('zero removes the allocation while preserving stock still to be located',()=>{
  const edit=context().buildLocatedQtyEdit(item(),[{...a,qty:0}]);
  assert.equal(edit.allocations.length,0); assert.equal(edit.afterTotal,520);
  assert.equal(edit.stockLots[0].qty,520);
});
test('legacy positions and racks reduced by previous cloud withdrawals use the displayed quantity',()=>{
  const ctx=context();
  const legacyItem=item({qty:80,rackAllocations:[],stockLots:[],rackLocation:a.code});
  const edit=ctx.buildLocatedQtyEdit(legacyItem,[{code:a.code,lot:legacy,qty:70}]);
  assert.equal(edit.beforeAllocated,80); assert.equal(edit.afterTotal,70);
  assert.equal(edit.stockLots[0].lot,legacy);
  const stale=item({qty:100,rackAllocations:[{...a,qty:100},{...b,qty:80}],stockLots:[]});
  const rows=ctx.rackAllocationRowsForDetails(stale);
  assert.equal(rows.reduce((sum,x)=>sum+x.qty,0),100);
  rows[0].qty+=20;
  const corrected=ctx.buildLocatedQtyEdit(stale,rows);
  assert.equal(corrected.afterTotal,120);
  assert.equal(corrected.stockLots.reduce((sum,x)=>sum+x.qty,0),120);
});
test('invalid, partial, duplicated and foreign rack edits are rejected',()=>{
  const ctx=context();
  for(const qty of [-1,1.5,null,NaN,Infinity,Number.MAX_SAFE_INTEGER])
    assert.throws(()=>ctx.buildLocatedQtyEdit(item(),[{...a,qty}]));
  for(const rows of [[],[a,a],[b]]) assert.throws(()=>ctx.buildLocatedQtyEdit(item(),rows));
});
test('transaction saves owner stock, product racks and audit movement together, preserving reservations',async()=>{
  const f=fixture(); await f.run();
  assert.equal(f.get().qty,980); assert.equal(f.get().reservedQty,25);
  assert.equal(f.get().rackAllocations[0].qty,460);
  assert.equal(f.get().sharedStockSourceSku,'OWNER');
  const product=f.store.get('amzInventoryProducts/OWNER');
  assert.equal(product.rackAllocations[0].qty,460);
  const move=f.store.get('amzInventoryProducts/OWNER/movements/edit-1');
  assert.equal(move.beforeAllocatedQty,480); assert.equal(move.afterAllocatedQty,460);
  assert.equal(move.beforeQty,1000); assert.equal(move.afterQty,980);
  assert.equal(move.beforeUnallocatedQty,520); assert.equal(move.afterUnallocatedQty,520);
  assert.equal(move.deltaSigned,-20); assert.equal(move.allocationChanges[0].code,a.code);
  assert.equal(f.patches[0][2].qty,980); assert.equal(f.writes.length,3);
});
test('zeroing all stock retains the inventory document and clears rack and lot fields',async()=>{
  const f=fixture({runtime:item({qty:480,stockLots:[{lot:a.lot,qty:480}]}),requested:[{...a,qty:0}]});
  await f.run();
  assert.equal(f.get().qty,0); assert.equal(f.get().zeroStock,true);
  assert.equal(f.get().rackLocation,''); assert.equal(f.get().rackAllocations.length,0);
  assert.equal(f.get().stockLots.length,0); assert.equal(f.get().reservedQty,25);
});
test('cancel and unchanged quantities perform no writes or local inventory rewrites',async()=>{
  for(const requested of [null,[a]]) {
    const f=fixture({requested}); await f.run();
    assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
  }
});
test('a concurrent withdrawal, lot change, rack move or stock owner change blocks a stale edit',async()=>{
  for(const cloud of [item({qty:990}),item({rackAllocations:[{...b,qty:480}]}),
    item({sharedStockSourceSku:'NEW-OWNER'}),
    item({stockLots:[{lot:a.lot,qty:900},{lot:b.lot,qty:100}]})]) {
    const f=fixture({cloud}); await f.run();
    assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
    assert.match(f.toasts.at(-1)[1],/aggiornati durante la modifica/);
  }
});
test('transaction retries do not restore a concurrent withdrawal or duplicate a movement',async()=>{
  const changed=fixture({retry:doc=>{doc.qty-=10;}}); await changed.run();
  assert.equal(changed.get().qty,990); assert.equal(changed.writes.length,0);
  const unchanged=fixture({retry:()=>{}}); await unchanged.run();
  assert.equal(unchanged.get().qty,980); assert.equal(unchanged.writes.length,3);
  assert.equal([...unchanged.store.keys()].filter(x=>x.includes('/movements/')).length,1);
});
