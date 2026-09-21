"use strict";
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {automaticCereaAllocations:plan, isCereaProduction, sameCereaAllocations} = require('./cerea-stock');
const {createCereaService} = require('./cerea-service');
const lot = 'LOTTO-STORICO', rack = 'A01-L1-P1';
const doc = (extra={}) => ({sku:'SKU', productionArea:'cerea', qty:120, ...extra});
const mark = qty => [{code:'CEREA',lot,qty}];
const sum = rows => rows.reduce((n,row)=>n+row.qty,0);

test('all area field variants, casing and whitespace are recognized; explicit area wins',()=>{
  for(const field of ['productionArea','areaProduzione','produzioneArea','productionLocation','productionSite'])
    assert.ok(isCereaProduction({[field]:' Cerea '}));
  assert.equal(plan(doc({productionArea:'concamarise',areaProduzione:'cerea'})),null);
  assert.equal(plan({qty:120,location:'cerea'}),null);
});
test('new and repeated loads add the whole free balance without changing stock or reservations',()=>{
  const d=doc({reservedQty:30,cereaAllocations:mark(40)}), before=structuredClone(d);
  assert.deepEqual(plan(d),mark(120)); assert.deepEqual(d,before);
  assert.deepEqual(plan({...d,qty:170,cereaAllocations:plan(d)}),mark(170));
  assert.ok(sameCereaAllocations(plan(d),plan({...d,cereaAllocations:plan(d)})));
});
test('partial and completed rack placement consume temporary quantities',()=>{
  const d=doc({rackAllocations:[{code:rack,lot,qty:40}],rackLocations:[rack],cereaAllocations:mark(120)});
  assert.deepEqual(plan(d),mark(80));
  assert.deepEqual(plan({...d,rackAllocations:[{code:rack,lot,qty:120}]}),[]);
});
test('lots, untracked historical loads and global free stock stay bounded',()=>{
  const a='LOTTO-20260920', b='LOTTO-20260921';
  const d=doc({qty:200,stockLots:[{lot:a,qty:100},{lot:b,qty:50}],rackAllocations:[{code:rack,lot:a,qty:40}]});
  assert.deepEqual(plan(d),[{code:'CEREA',lot:a,qty:60},{code:'CEREA',lot:b,qty:50},...mark(50)]);
  const stale=doc({qty:50,stockLots:[{lot:a,qty:100}],rackAllocations:[{code:rack,lot:b,qty:30}]});
  assert.equal(sum(plan(stale)),20);
});
test('zero stock, overallocated racks and legacy fully located stock never gain temporary stock',()=>{
  for(const d of [doc({qty:0}),doc({qty:-10}),doc({rackLocation:rack}),doc({rackLocations:[rack]}),
    doc({rackAllocations:[{code:rack,lot,qty:300}]})]) assert.deepEqual(plan(d),[]);
});
test('non-Cerea production preserves manual Cerea and rack data',()=>{
  const d=doc({productionArea:'concamarise',cereaAllocations:mark(40)});
  assert.equal(plan(d),null); assert.deepEqual(d.cereaAllocations,mark(40));
});
function fixture(initial=doc(), product={}, retry) {
  const itemPath='amzInventory/concamarise/items/SKU', productPath='amzInventoryProducts/SKU';
  const store=new Map(); if(initial) store.set(itemPath,structuredClone(initial));
  if(product!==null) store.set(productPath,structuredClone(product));
  const writes=[];
  const db={doc:path=>({path}),runTransaction:async fn=>{
    for(let attempt=0;attempt<(retry?2:1);attempt++) {
      const pending=[];
      const result=await fn({get:async ref=>{
        assert.equal(pending.length,0,'all reads must precede writes');
        return {exists:store.has(ref.path),data:()=>structuredClone(store.get(ref.path))};
      },set:(ref,patch,options)=>{assert.deepEqual(options,{merge:true});pending.push([ref.path,patch]);}});
      if(retry && !attempt) {retry(store.get(itemPath));continue;}
      for(const [path,patch] of pending) {store.set(path,{...store.get(path),...structuredClone(patch)});writes.push([path,patch]);}
      return result;
    }
  }};
  return {store,writes,item:()=>store.get(itemPath),product:()=>store.get(productPath),
    service:createCereaService({db,timestamp:()=>123})};
}
test('transaction persists item and product markers only and duplicate events write nothing',async()=>{
  const initial=doc({reservedQty:25,updatedAtClient:555,sharedStockQtyUpdatedAtClient:444});
  const f=fixture(initial,{title:'Untouched'});
  const result=await f.service.reconcile('SKU'); assert.equal(result.pieces,120);
  assert.deepEqual(f.item().cereaAllocations,mark(120)); assert.deepEqual(f.product().cereaAllocations,mark(120));
  for(const [,patch] of f.writes) assert.deepEqual(Object.keys(patch).sort(),
    ['cereaAllocations','cereaAutoPlacementAt','cereaAutoPlacementSource','cereaAutoPlacementVersion']);
  for(const [key,value] of Object.entries(initial)) assert.deepEqual(f.item()[key],value);
  const count=f.writes.length; assert.equal((await f.service.reconcile('SKU')).changed,false);
  assert.equal(f.writes.length,count); assert.equal(f.product().title,'Untouched');
});
test('transaction retry uses concurrent rack placement and latest stock, not event quantities',async()=>{
  const f=fixture(doc(),{},d=>{d.qty=170;d.rackAllocations=[{code:rack,lot,qty:100}];});
  await f.service.onInventoryWritten({params:{sku:'SKU'},data:{after:{exists:true,data:()=>doc({qty:999})}}});
  assert.deepEqual(f.item().cereaAllocations,mark(70)); assert.equal(f.item().qty,170);
});
test('deletion, changed production area and missing product do not create phantom inventory',async()=>{
  for(const initial of [null,doc({productionArea:'concamarise'})]) {
    const f=fixture(initial);await f.service.reconcile('SKU');assert.equal(f.writes.length,0);
  }
  const f=fixture(doc(),null);await f.service.reconcile('SKU');assert.equal(f.writes.length,1);
  assert.equal(f.product(),undefined);
  const count=f.writes.length;await f.service.onInventoryWritten({data:{after:{exists:false}}});assert.equal(f.writes.length,count);
});
test('stock exhaustion persistently clears stale markers and later loads start from real stock',async()=>{
  const f=fixture(doc({qty:0,cereaAllocations:mark(120)}),{cereaAllocations:mark(120)});
  await f.service.reconcile('SKU');assert.deepEqual(f.item().cereaAllocations,[]);
  f.item().qty=25;await f.service.reconcile('SKU');assert.deepEqual(f.item().cereaAllocations,mark(25));
});


test('timestamp-only production lots use the Italian production day',()=>{
  const d=doc({stockLots:[{qty:120,createdAtClient:Date.parse('2026-09-20T23:30:00Z')}]});
  assert.deepEqual(plan(d),[{code:'CEREA',lot:'LOTTO-20260921',qty:120}]);
});
