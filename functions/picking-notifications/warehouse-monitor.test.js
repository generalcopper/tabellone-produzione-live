'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('./warehouse-monitor');
const c = require('./core');
const w = require('./write-queue');
const now=Date.parse('2026-10-09T12:00:00Z');
test('Write matches source visibility, completed IDs, line history and permissions',()=>{
  const docs=[
    {id:'a',data:{kind:'finishedProduct',product:'Prodotto A',qty:20,unit:'pz'}},
    {id:'b',data:{kind:'finishedProduct',product:'Concluso',qty:30,unit:'pz'}},
    {id:'c',data:{kind:'finishedProduct',product:'Storico',qty:40,unit:'pz',lineKey:'closed'}},
    {id:'d',data:{product:'Tanica 5 L',qty:800,unit:'lt'}},
    {id:'e',data:{kind:'orderLine',product:'Non autorizzato',qty:800,unit:'lt',orderKey:'not-allowed'}},
  ];
  const section=m.writeSection(w.details(docs,new Set(['b']),new Set(['closed'])),now);
  assert.deepEqual(section.rows.map(x=>x.id),['a']);assert.equal(section.totals.rows,1);
});
test('FBM never revives fully shipped stored rows using detail fallback',()=>{
  const data={active:true,orderId:'1',linesByLineId:{a:{sku:'A',reservedQty:2,shippedQty:2}},orderDetails:{lineItems:[{sku:'A',quantity:2}]}};
  assert.equal(c.summarizeFbm(data,'1'),null);
});
test('FBM cancels, residual quantities, aliases and hashes remain exact',()=>{
  const catalog=m.productCatalog([{id:'STOCK',data:()=>({sku:'STOCK',title:'Prodotto',skuAliases:['ALIAS'],rackAllocations:[{code:'A01',qty:4}]})}]);
  const make=(id,data)=>({id,path:'shopifyFbmOrders/'+id,data});
  const section=m.pickingSection('fbm',[
    make('1',{active:true,orderName:'#10',orderId:'1',linesByLineId:{a:{sku:'ALIAS',reservedQty:5,shippedQty:2}}}),
    make('2',{active:true,cancelledAt:'2026-10-09',linesByLineId:{a:{sku:'ALIAS',reservedQty:10}}}),
  ],catalog,now);
  assert.equal(section.totals.orders,1);assert.equal(section.totals.units,3);
  assert.equal(section.rows[0].sku,'STOCK');assert.deepEqual(section.rows[0].locations,['A01']);
  const {sha256,...unsigned}=section.rows[0];assert.equal(m.hash(unsigned),sha256);
  assert.notEqual(m.hash({...unsigned,qty:4}),sha256);
});
test('FBA excludes Shopify mirrors, fully picked flows and picked product lines',()=>{
  const catalog={aliases:new Map(),products:new Map()};
  const base={kind:'scarica',status:'PARTIAL_PICKED',picking:{managedByPicking:true,pickedLines:{A:{picked:true}}},lines:[{sku:'A',qty:10},{sku:'B',qty:15}]};
  const docs=[{id:'x',path:'logs/x',data:base},{id:'y',path:'logs/y',data:{...base,picking:{flowPicked:true}}},
    {id:'z',path:'logs/z',data:{...base,source:'shopify_fbm'}}];
  const section=m.pickingSection('fba',docs,catalog,now);
  assert.equal(section.totals.orders,1);assert.equal(section.totals.units,15);assert.equal(section.rows[0].sku,'B');
});
test('Cerea alerts expire, canceled loads do not appear, Rome date drives waste calendar',()=>{
  const payload={incoming:{active:true,createdAtMs:now-1000,status:'received'},ready:{active:true,createdAtMs:now-1800001},
    manual:{active:true,text:'Avviso reale'},waste:{active:true,dateKey:'2026-10-10',types:['CARTA'],exposureWindow:'21:00-24:00'}};
  const section=m.alertSection(payload,now);assert.deepEqual(section.rows.map(x=>x.id),['manual','waste']);
  const wrong=m.alertSection({...payload,waste:{...payload.waste,dateKey:'2026-10-09'}},now);assert.equal(wrong.rows.length,1);
});
test('an unavailable source is never a verified empty queue',()=>{
  const s=m.section('write',[],null,now,'unavailable','Read failed');assert.equal(s.totals,null);assert.equal(s.state,'unavailable');
});
