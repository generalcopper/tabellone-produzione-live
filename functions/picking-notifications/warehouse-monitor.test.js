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
  assert.equal(section.rows[0].level,'info');assert.equal(section.rows[1].level,'info');
  const {sha256,...unsigned}=section.rows[0];assert.equal(m.hash(unsigned),sha256);
  const wrong=m.alertSection({...payload,waste:{...payload.waste,dateKey:'2026-10-09'}},now);assert.equal(wrong.rows.length,1);
});
test('an unavailable source is never a verified empty queue',()=>{
  const s=m.section('write',[],null,now,'unavailable','Read failed');assert.equal(s.totals,null);assert.equal(s.state,'unavailable');
});

function pickingFixture(rows,{aggregateError=false,invalidCount=false}={}) {
  const docs=rows.map((data,i)=>({id:String(i),ref:{path:'logs/'+i},data:()=>data})),calls=[];
  const field=(data,path)=>path.split('.').reduce((value,key)=>value?.[key],data);
  function query(filters=[],aggregate=false) {
    return {filters,aggregate,where:(path,op,value)=>query([...filters,{path,op,value}]),
      select:()=>query(filters),count:()=>query(filters,true)};
  }
  const found=new Map(docs.filter(doc=>['RESERVED','PARTIAL_PICKED','PRENOTATO','IN_ATTESA_PICKING'].includes(doc.data().status)
    || doc.data().reservation?.active===true).map(doc=>[doc.id,doc]));
  const tx={get:async q=>{
    if(q.aggregate && aggregateError)throw Error('aggregate_unavailable');
    const selected=docs.filter(doc=>q.filters.every(f=>field(doc.data(),f.path)===f.value));
    calls.push({aggregate:q.aggregate,documents:q.aggregate?0:selected.length});
    return q.aggregate?{data:()=>({count:invalidCount?NaN:selected.length})}:{docs:selected};
  }};
  const remaining=source=>source.filter(doc=>{
    const d=doc.data(),status=String(d.status||d.picking?.status||'').toUpperCase();
    return !found.has(doc.id) && String(d.kind||'').toLowerCase()==='scarica' && !d.voided && !d.cancelled && !d.canceled
      && d.picking?.flowPicked!==true && !['PICKED','COMPLETED','CANCELLED','CANCELED','VOIDED'].includes(status);
  }).map(doc=>doc.id).sort();
  return {tx,logs:query(),found,calls,remaining,
    original:remaining(docs.filter(doc=>doc.data().picking?.managedByPicking===true))};
}

test('FBA skips completed history and retains old active rows without changing visible work',async()=>{
  const rows=Array.from({length:1500},()=>({kind:'scarica',status:'PICKED',picking:{managedByPicking:true,flowPicked:true}}));
  rows.push({kind:'scarica',status:'RESERVED',picking:{managedByPicking:true}},
    {kind:'scarica',status:'IN_PROGRESS',picking:{managedByPicking:true,flowPicked:false}},
    {kind:'scarica',status:'CANCELLED',picking:{managedByPicking:true,flowPicked:false}});
  const f=pickingFixture(rows),result=await m.readLegacyPicking(f.tx,f.logs,f.found);
  assert.equal(result.mode,'filtered');assert.deepEqual(f.remaining(result.docs),f.original);
  assert.equal(f.calls.reduce((n,c)=>n+c.documents,0),2);
  assert.equal(f.calls.filter(c=>c.aggregate).length,2);
});

test('already read active work plus completed history requires no historical documents',async()=>{
  const f=pickingFixture([{kind:'scarica',status:'RESERVED',picking:{managedByPicking:true}},
    {kind:'scarica',status:'PICKED',picking:{managedByPicking:true,flowPicked:true}}]);
  const result=await m.readLegacyPicking(f.tx,f.logs,f.found);
  assert.equal(result.mode,'covered');assert.deepEqual(result.docs,[]);assert.deepEqual(f.original,[]);
  assert.equal(f.calls.reduce((n,c)=>n+c.documents,0),0);
});

test('uncovered legacy fields always fall back to the original complete query',async()=>{
  for(const value of [undefined,null,0,'false']) {
    const picking={managedByPicking:true};if(value!==undefined)picking.flowPicked=value;
    const f=pickingFixture([{kind:'scarica',status:'IN_PROGRESS',picking},
      {kind:'scarica',status:'PICKED',picking:{managedByPicking:true,flowPicked:true}}]);
    const result=await m.readLegacyPicking(f.tx,f.logs,f.found);
    assert.equal(result.mode,'full');assert.deepEqual(f.remaining(result.docs),['0']);
  }
});

test('aggregate failures and invalid counts preserve the full source and its errors',async()=>{
  for(const options of [{aggregateError:true},{invalidCount:true}]) {
    const f=pickingFixture([{kind:'scarica',picking:{managedByPicking:true}}],options);
    const result=await m.readLegacyPicking(f.tx,f.logs,f.found);
    assert.equal(result.mode,'full');assert.deepEqual(f.remaining(result.docs),f.original);
  }
  const f=pickingFixture([]);f.tx.get=async()=>{throw Error('source_unavailable');};
  await assert.rejects(m.readLegacyPicking(f.tx,f.logs,f.found),/source_unavailable/);
});

test('optimized FBA source matches full history for every legacy field and workflow state',async()=>{
  for(const flowPicked of [undefined,null,false,true,0,'false']) {
    for(const status of [undefined,'','RESERVED','PARTIAL_PICKED','IN_PROGRESS','PICKED','picked','CANCELLED']) {
      const rows=[{kind:'scarica',status,picking:{managedByPicking:true,flowPicked}},
        {kind:'scarica',status,reservation:{active:true},picking:{managedByPicking:true,flowPicked}},
        {kind:'scarica',status,picking:{managedByPicking:false,flowPicked}},
        {kind:'scarica',status,cancelled:true,picking:{managedByPicking:true,flowPicked}},
        {kind:'carica',status,picking:{managedByPicking:true,flowPicked}}];
      const f=pickingFixture(rows),result=await m.readLegacyPicking(f.tx,f.logs,f.found);
      assert.deepEqual(f.remaining(result.docs),f.original,JSON.stringify({status,flowPicked}));
    }
  }
});

test('a reopened flow is included by the next transaction without a history cache',async()=>{
  const row={kind:'scarica',status:'PICKED',picking:{managedByPicking:true,flowPicked:true}};
  let f=pickingFixture([row]),result=await m.readLegacyPicking(f.tx,f.logs,f.found);
  assert.equal(result.mode,'covered');assert.deepEqual(f.remaining(result.docs),[]);
  row.status='IN_PROGRESS';row.picking.flowPicked=false;
  f=pickingFixture([row]);result=await m.readLegacyPicking(f.tx,f.logs,f.found);
  assert.equal(result.mode,'filtered');assert.deepEqual(f.remaining(result.docs),['0']);
});
