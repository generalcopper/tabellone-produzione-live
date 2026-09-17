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
  block('    async function saveRackAllocationFromDetails(', '    function rackAllocationCloudNormalizePlan('),
  block('    function buildStockLotsForUnallocatedQty(', '    function getItemsWithoutRackLocations('),
  block('    function getItemsWithoutRackLocations(', '    function getHomeSmartSearchValue('),
  block('    function getItemsAtCerea(', '    // --- Picking visual:'),
  block('    async function saveLocationOnlyFromDetails(', '    function renderProductDetailsSheet(')
].join('\n');
const rack = 'A01-L1-P1', otherRack = 'B01-L1-P1', lot = 'LOTTO-20260917';
function item(qty, allocations = []) {
  return {sku:'SKU', title:'Prodotto', qty, reservedQty:12,
    stockLots:[{lot, qty}], rackAllocations:allocations,
    rackLocations:allocations.map(x=>x.code), rackLocation:allocations[0]?.code || ''};
}
function fixture({doc = item(120), cloud = doc, answers = [false, true], input = '40',
  liveSnapshot = false, retry, quick = false, selectedCode = rack} = {}) {
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
    stockRepresentativeItemsForLoc:()=>[runtime],
    stockSkuForSkuAny:x=>x,
    escapeHtml:x=>String(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    canUsePickingActions:()=>true, isRackLocationUsableForItem:()=>true,
    readLocationOnlySelection:()=>[selectedCode], setPdFieldError(){},
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
    run:()=>ctx.saveLocationOnlyFromDetails(quick ? {quick:true,rackLocation:selectedCode} : {}),
    edit:(data,opts={})=>{ctx.readRackAllocationEditor=()=>({lot,...data}); return ctx.saveRackAllocationFromDetails({},opts);},
    editUnallocated:()=>ctx.editHomeNoLocationQtyPrompt('SKU','concamarise'),
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

for(const quick of [false,true]) {
  test(`Cerea is saved as temporary stock and remains in Da ubicare (${quick ? 'QR' : 'details'})`,async()=>{
    const f=fixture({selectedCode:'CEREA',quick}); await f.run();
    assert.equal(f.cloud().qty,120); assert.equal(f.cloud().reservedQty,12);
    assert.equal(f.cloud().rackAllocations.length,0);
    assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),40);
    assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.cloud()),120);
    assert.equal(f.ctx.getItemsWithoutRackLocations()[0].cereaQty,40);
    assert.equal(f.ctx.getItemsAtCerea()[0].sku,'SKU');
    assert.equal(f.ctx.getItemsWithRackLocations().length,0);
    assert.equal(f.store.get('amzInventoryProducts/SKU').cereaAllocations[0].qty,40);
    assert.equal(f.store.get('amzInventoryProducts/SKU/movements/assign-1').deltaSigned,0);
    assert.match(f.ctx.cereaBadgeHtml(40),/>Cerea</);
  });
}
test('Cerea is persistent after reloading the cloud document',async()=>{
  const f=fixture({selectedCode:'CEREA',answers:[true,true]}); await f.run();
  const reloaded=fixture({doc:structuredClone(f.cloud())});
  assert.equal(reloaded.ctx.getItemsAtCerea()[0].cereaQty,120);
  assert.equal(reloaded.ctx.getItemsWithoutRackLocations()[0].remainingQty,120);
});
test('assigning Cerea again adds only unmarked stock and never counts the same pieces twice',async()=>{
  const doc={...item(120),cereaAllocations:[{lot,qty:80}]};
  const f=fixture({doc,selectedCode:'CEREA',answers:[true,true]}); await f.run();
  assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),120);
  const again=fixture({doc:f.cloud(),selectedCode:'CEREA',answers:[true,true]}); await again.run();
  assert.equal(again.writes.length,0); assert.equal(again.ctx.cereaQtyFromDoc(again.cloud()),120);
});
test('assigning a rack consumes Cerea first and keeps the remaining temporary pieces visible',async()=>{
  const doc={...item(200),cereaAllocations:[{lot,qty:120}]};
  const f=fixture({doc,input:'40',liveSnapshot:true}); await f.run();
  assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),80);
  assert.equal(f.ctx.cereaQtyFromDoc(f.runtime()),80);
  assert.equal(f.ctx.getItemsAtCerea()[0].cereaQty,80);
  assert.equal(f.ctx.getItemsWithoutRackLocations()[0].remainingQty,160);
  assert.equal(f.ctx.getItemsWithRackLocations()[0].allocatedQty,40);
});
test('completing rack assignment clears Cerea and the Da ubicare row',async()=>{
  const f=fixture({doc:{...item(120),cereaAllocations:[{lot,qty:120}]},answers:[true,true]}); await f.run();
  assert.equal(f.cloud().cereaAllocations.length,0);
  assert.equal(f.ctx.getItemsAtCerea().length,0);
  assert.equal(f.ctx.getItemsWithoutRackLocations().length,0);
  assert.equal(f.ctx.getItemsWithRackLocations()[0].allocatedQty,120);
  assert.equal(f.ctx.cereaBadgeHtml(0),'');
});
test('Cerea quantities follow each lot and never exceed currently unallocated stock',()=>{
  const f=fixture(), otherLot='LOTTO-20260918';
  const doc={...item(200,[{code:rack,lot,qty:30}]),stockLots:[{lot,qty:100},{lot:otherLot,qty:100}],
    cereaAllocations:[{lot,qty:90},{lot:otherLot,qty:40}]};
  assert.equal(f.ctx.cereaQtyFromDoc(doc,lot),70);
  assert.equal(f.ctx.cereaQtyFromDoc(doc,otherLot),40);
  const remaining=f.ctx.consumeCereaAllocations(doc,lot,20);
  assert.equal(remaining.find(x=>x.lot===lot).qty,50);
  assert.equal(remaining.find(x=>x.lot===otherLot).qty,40);
  assert.equal(f.ctx.cereaQtyFromDoc({...doc,qty:0}),0);
});
test('concurrent Cerea assignments cannot exceed the unallocated stock',async()=>{
  const f=fixture({doc:item(120),selectedCode:'CEREA',input:'80',retry:doc=>{doc.cereaAllocations=[{lot,qty:100}];}});
  await f.run();
  assert.equal(f.writes.length,0); assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),100);
});
test('Cerea cancellation, invalid quantities and denied permissions do not write',async()=>{
  for(const options of [{input:null},{input:'121'},{input:'-1'},{answers:[false,false]},{denied:true}]){
    const f=fixture({selectedCode:'CEREA',...options});
    if(options.denied) f.ctx.canUsePickingActions=()=>false;
    await f.run(); assert.equal(f.writes.length,0); assert.equal(f.patches.length,0);
  }
});
test('existing rack allocations can move to Cerea and back without changing stock',async()=>{
  const f=fixture({doc:item(120,[{code:rack,lot,qty:120}]),answers:[true]});
  await f.edit({oldCode:rack,newCode:'CEREA',newQty:120});
  assert.equal(f.cloud().qty,120); assert.equal(f.cloud().reservedQty,12);
  assert.equal(f.ctx.rackAllocatedQtyFromDoc(f.cloud()),0);
  assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),120);
  const back=fixture({doc:f.cloud(),answers:[true]});
  await back.edit({oldCode:'CEREA',newCode:rack,newQty:120});
  assert.equal(back.ctx.cereaQtyFromDoc(back.cloud()),0);
  assert.equal(back.ctx.rackAllocatedQtyFromDoc(back.cloud()),120);
  assert.equal(back.cloud().qty,120);
});
test('removing Cerea leaves its stock available and clearing the input does not erase it',async()=>{
  const doc={...item(120),cereaAllocations:[{lot,qty:80}]};
  const f=fixture({doc,answers:[true]});
  await f.edit({oldCode:'CEREA',newCode:'CEREA',newQty:80},{remove:true});
  assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),0);
  assert.equal(f.ctx.rackUnallocatedQtyFromDoc(f.cloud()),120);
  const invalid=fixture({doc,answers:[true]});
  await invalid.edit({oldCode:'CEREA',newCode:'CEREA',newQty:null});
  assert.equal(invalid.writes.length,0);
});
test('partial transfers in the allocation editor preserve the pieces left at the source',async()=>{
  const f=fixture({doc:{...item(120),cereaAllocations:[{lot,qty:120}]},answers:[true]});
  await f.edit({oldCode:'CEREA',newCode:rack,newQty:40});
  assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),80);
  assert.equal(f.ctx.rackAllocatedQtyFromDoc(f.cloud()),40);
  const back=fixture({doc:f.cloud(),answers:[true]});
  await back.edit({oldCode:rack,newCode:'CEREA',newQty:10});
  assert.equal(back.ctx.cereaQtyFromDoc(back.cloud()),90);
  assert.equal(back.ctx.rackAllocatedQtyFromDoc(back.cloud()),30);
  assert.equal(back.cloud().qty,120);
});
test('Cerea remains selectable after all racks for multiple different SKUs',()=>{
  const f=fixture();
  Object.assign(f.ctx,{inventoryRuntimeCacheKey:x=>x,RACK_LOCATION_OPTIONS:[rack,otherRack],rackLocationUseInfo:()=>({occupiedBy:{sku:'OTHER'}})});
  vm.runInContext(block('    function isRackLocationAvailableForItem(', 'function readRackPickerSelection('),f.ctx);
  for(const sku of ['SKU','OTHER']) {
    assert.equal(f.ctx.isRackLocationUsableForItem('CEREA',sku,'concamarise'),true);
    assert.equal(f.ctx.isRackLocationUsableForItem(rack,sku,'concamarise'),false);
    const options=f.ctx.rackLocationSelectOptions(rack,sku,'concamarise',{hideEmpty:true});
    assert(options.indexOf('value="CEREA"')>options.indexOf(`value="${rack}"`));
    assert.equal((options.match(/value="CEREA"/g)||[]).length,1);
  }
});
test('stock corrections clamp Cerea persistently so later stock additions cannot restore old markers',async()=>{
  for(const qty of [0,20]) {
    const f=fixture({doc:{...item(120),cereaAllocations:[{lot,qty:120}]},input:String(qty)});
    await f.editUnallocated();
    assert.equal(f.cloud().qty,qty);
    assert.equal(f.ctx.cereaQtyFromDoc(f.cloud()),qty);
    const replenished=fixture({doc:f.cloud(),input:'120'});
    await replenished.editUnallocated();
    assert.equal(replenished.cloud().qty,120);
    assert.equal(replenished.ctx.cereaQtyFromDoc(replenished.cloud()),qty);
  }
});
test('Cerea navigation, quantities, badge and search agree with Da ubicare',()=>{
  const f=fixture({doc:{...item(120),cereaAllocations:[{lot,qty:80}]}}), nodes=new Map();
  const node=id=>{
    if(!nodes.has(id)) {
      const classes=new Set();
      nodes.set(id,{innerHTML:'',textContent:'',value:'',attrs:{},
        setAttribute(k,v){this.attrs[k]=v;},
        classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),
          toggle:(x,on)=>on ? classes.add(x) : classes.delete(x)}});
    }
    return nodes.get(id);
  };
  f.ctx.state.user.isWhitelisted=true;
  Object.assign(f.ctx,{$:node,window:{matchMedia:()=>({matches:false})},document:{body:node('body')},
    _bioneeShopUi:null,_pickingMailUi:null,parseTitleMeta:x=>({main:x}),normalizeSkuAliases:x=>x.filter(Boolean),
    normalizeText:x=>String(x).toLowerCase(),rackLocationDisplayFromItem:()=>'',rackLocationStackHtml:()=>'',fmtDate:()=>''});
  vm.runInContext([
    block('    function getHomeSmartSearchValue(', '    let _bioneeShopUi'),
    block('    function pickingHomeView(', '    const DRONE_NATIVE_COL'),
    block('    function setPickingNavCount(', '    function locatedQtySnapshotKey('),
    block('    function renderHomeNoLocationBox(', '    function getItemsAtCerea(')
  ].join('\n'),f.ctx);
  f.ctx.setPickingHomeView('cerea');
  assert.equal(f.ctx.pickingHomeView(),'cerea');
  assert.equal(node('btnPickingCerea').attrs['aria-pressed'],'true');
  assert.equal(node('homeCereaBox').attrs['aria-hidden'],'false');
  assert.equal(node('homeNoLocationBox').attrs['aria-hidden'],'true');
  f.ctx.renderHomeCereaBox(); f.ctx.renderHomeNoLocationBox();
  assert.match(node('homeCereaList').innerHTML,/data-sku="SKU"/);
  assert.match(node('homeNoLocationList').innerHTML,/class="cereaBadge"[^>]*>Cerea</);
  assert.match(node('homeNoLocationList').innerHTML,/data-current="120"/);
  assert.equal(node('pickingCereaNavCount').textContent,'1');
  node('homeCereaSearch').value='missing'; f.ctx.renderHomeCereaBox();
  assert.match(node('homeCereaList').innerHTML,/Nessun prodotto trovato/);
  node('homeCereaSearch').value='SKU'; f.ctx.renderHomeCereaBox();
  assert.match(node('homeCereaList').innerHTML,/data-sku="SKU"/);
  f.ctx.setPickingHomeView('noLocation');
  assert.equal(node('homeCereaBox').attrs['aria-hidden'],'true');
  assert.equal(node('homeNoLocationBox').attrs['aria-hidden'],'false');
});
