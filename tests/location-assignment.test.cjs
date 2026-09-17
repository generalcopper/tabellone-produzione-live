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
  block('    function productionLotIdFromTs(', '    function rackLocationDisplayPartsFromItem('),
  block('    async function saveLocationOnlyFromDetails(', '    function renderProductDetailsSheet(')
].join('\n');
const rack = 'A01-L1-P1', otherRack = 'B01-L1-P1', lot = 'LOTTO-20260917';
function item(qty, allocations = []) {
  return {sku:'SKU', title:'Prodotto', qty, reservedQty:12,
    stockLots:[{lot, qty}], rackAllocations:allocations,
    rackLocations:allocations.map(x=>x.code), rackLocation:allocations[0]?.code || ''};
}
function fixture({doc = item(120), cloud = doc, answers = [false, true], input = '40',
  liveSnapshot = false, retry, quick = false} = {}) {
  let runtime = structuredClone(doc);
  const itemPath = 'amzInventory/concamarise/items/SKU';
  const store = new Map([[itemPath, structuredClone(cloud)]]);
  const dialogs = [], writes = [], patches = [], toasts = [];
  let nextAnswer = 0, generated = 0;
  const ctx = {
    console:{error(){}}, Date, LOT_LEGACY_ID:'LOTTO-STORICO', RACK_PALLET_CAPACITY:480,
    RACK_LOCATION_SET:new Set([rack, otherRack]), INVENTORY_CANONICAL_LOC:'concamarise',
    COL_ROOT:'amzInventory', SUB_ITEMS:'items', COL_PRODUCTS:'amzInventoryProducts', SUB_MOVES:'movements',
    state:{route:{loc:'concamarise'}, user:{uid:'operator'},
      ui:{productDetailsSku:'SKU', productDetailsLot:lot}, firebase:{}},
    toSkuId:x=>String(x || '').toUpperCase(), getProductBySku:()=>runtime,
    canUsePickingActions:()=>true, isRackLocationUsableForItem:()=>true,
    readLocationOnlySelection:()=>[rack], setPdFieldError(){},
    squashWhitespace:x=>x, normalizeText:x=>x, prettyLoc:x=>x,
    renderProductDetailsSheet(){}, renderHomeDashboard(){}, removeMobileQuickRackSelector(){}, closeSheet(){},
    confirm:message=>{dialogs.push({type:'confirm', message}); return answers[nextAnswer++] ?? false;},
    prompt:(message, value)=>{dialogs.push({type:'prompt', message, value}); return input;},
    showToast:(...args)=>toasts.push(args),
    syncRackLocationGroupCloud:async()=>{},
    patchRuntimeInventoryItem:(_loc,_sku,patch)=>{patches.push(structuredClone(patch)); runtime={...runtime,...structuredClone(patch)};},
    addProductMovementToBatch:(tx,_api,_db,sku,data)=>tx.set(`amzInventoryProducts/${sku}/movements/${data.movementId}`, data)
  };
  const api = {
    collection:(_db,...parts)=>parts.join('/'),
    doc:(base,...parts)=>parts.length ? (typeof base === 'string' ? [base,...parts].join('/') : parts.join('/')) : {id:`assign-${++generated}`},
    serverTimestamp:()=>123,
    runTransaction:async(_db,fn)=>{
      for(let attempt=0; attempt<(retry ? 2 : 1); attempt++) {
        const pending = [];
        await fn({
          get:async ref=>{assert.equal(pending.length,0,'read before write'); const d=store.get(ref); return {exists:()=>!!d,data:()=>structuredClone(d)};},
          set:(ref,data)=>pending.push([ref,structuredClone(data)])
        });
        if(retry && !attempt) { retry(store.get(itemPath)); continue; }
        for(const [ref,data] of pending) {store.set(ref,{...store.get(ref),...data}); writes.push([ref,data]);}
      }
      if(liveSnapshot) runtime=structuredClone(store.get(itemPath));
    }
  };
  ctx.state.firebase={api,db:{}};
  vm.createContext(ctx);
  vm.runInContext(code,ctx);
  return {ctx,store,dialogs,writes,patches,toasts,
    run:()=>ctx.saveLocationOnlyFromDetails(quick ? {quick:true,rackLocation:rack} : {}),
    cloud:()=>store.get(itemPath), runtime:()=>runtime};
}

for(const qty of [1,120,480,481,1000]) {
  for(const quick of [false,true]) {
    test(`Annulla offers a partial quantity for ${qty} pieces (${quick ? 'QR' : 'details'})`,async()=>{
      const assigned=Math.min(qty,40), f=fixture({doc:item(qty),input:String(assigned),quick});
      await f.run();
      assert.deepEqual(f.dialogs.map(x=>x.type),['confirm','prompt','confirm']);
      assert.equal(f.dialogs[1].value,String(Math.min(480,qty)));
      assert.equal(f.cloud().rackAllocations[0].qty,assigned);
      assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.cloud()),qty-assigned);
      assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.runtime()),qty-assigned);
      assert.equal(f.cloud().qty,qty); assert.equal(f.cloud().reservedQty,12);
      assert.equal(f.writes.length,3);
      const movement=f.store.get('amzInventoryProducts/SKU/movements/assign-1');
      assert.equal(movement.assignedQty,assigned); assert.equal(movement.deltaSigned,0);
      assert.equal(movement.remainingQty,qty-assigned);
    });
  }
}
test('OK assigns all pieces without a quantity prompt',async()=>{
  for(const qty of [120,480,800]) {
    const f=fixture({doc:item(qty),answers:[true,true]}); await f.run();
    assert.deepEqual(f.dialogs.map(x=>x.type),['confirm','confirm']);
    assert.equal(f.cloud().rackAllocations[0].qty,qty);
  }
});
test('canceling the quantity prompt or final confirmation does not change inventory',async()=>{
  for(const options of [{input:null},{answers:[false,false]},{answers:[true,false]}]) {
    const f=fixture(options); await f.run();
    assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
  }
});
test('invalid and excessive quantities are rejected before any write',async()=>{
  for(const input of ['', '0', '-1', '1.5', 'abc', '121']) {
    const f=fixture({input}); await f.run();
    assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
    assert.match(f.toasts.at(-1)?.[0] || '',/Quantità (non valida|eccessiva)/);
  }
});
test('adding to an existing rack preserves other racks, total stock and remaining pieces',async()=>{
  const f=fixture({doc:item(200,[{code:rack,lot,qty:30},{code:otherRack,lot,qty:50}])});
  await f.run();
  assert.equal(f.cloud().rackAllocations.find(x=>x.code===rack).qty,70);
  assert.equal(f.cloud().rackAllocations.find(x=>x.code===otherRack).qty,50);
  assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.cloud()),80);
  assert.equal(f.cloud().qty,200);
});
test('an early realtime snapshot cannot apply the assigned quantity twice',async()=>{
  const f=fixture({doc:item(1000),input:'200',liveSnapshot:true}); await f.run();
  assert.equal(f.cloud().rackAllocations[0].qty,200);
  assert.equal(f.runtime().rackAllocations[0].qty,200);
  assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.runtime()),800);
});
test('a fully located lot after a concurrent assignment must not be relocated',async()=>{
  const f=fixture({doc:item(1000),cloud:item(1000,[{code:otherRack,lot,qty:1000}]),input:'200'});
  await f.run();
  assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
  assert.equal(f.cloud().rackAllocations[0].code,otherRack);
});
test('transaction retry validates the remaining stock and writes only one movement',async()=>{
  const f=fixture({doc:item(1000),input:'200',retry:doc=>{doc.qty=900;doc.stockLots[0].qty=900;}});
  await f.run();
  assert.equal(f.cloud().qty,900); assert.equal(f.cloud().rackAllocations[0].qty,200);
  assert.equal(f.writes.length,3);
  const exhausted=fixture({doc:item(1000),input:'200',retry:doc=>{doc.rackAllocations=[{code:otherRack,lot,qty:1000}];}});
  await exhausted.run(); assert.equal(exhausted.writes.length,0);
});
