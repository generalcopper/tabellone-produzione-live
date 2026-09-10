const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/picking.html'),'utf8');
const start=source.indexOf('    function addPickingStockTransactionWrite('),end=source.indexOf('    function isForcePickingAvailableError(',start);
assert(start>0&&end>start);
function fixture(lines, inventory){
 const store=new Map(Object.entries(inventory).map(([sku,d])=>['amzInventory/concamarise/items/'+sku,{sku,...d}]));
 const flowPath='amzInventory/concamarise/logs/flow';store.set(flowPath,{kind:'scarica',lines,reservation:{active:true},picking:{pickedLines:{}}});
 const qty=x=>Number(x?.qty||0), reserved=x=>Number(x?.reservedQty??x?.pendingPickQty??0);
 let writes=false;const pending=[];
 const tx={get:async ref=>{assert.equal(writes,false,'all reads precede writes');const d=store.get(ref);return{id:ref.split('/').pop(),exists:()=>!!d,data:()=>structuredClone(d)}},set:(ref,data)=>{writes=true;pending.push([ref,data])}};
 const api={doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=>123,arrayUnion:x=>[x],runTransaction:async(_db,fn)=>{writes=false;pending.length=0;const r=await fn(tx);for(const [ref,d]of pending)store.set(ref,{...store.get(ref),...d});return r}};
 const ctx={console,state:{firebase:{api,db:{}},user:{email:'test'}},COL_ROOT:'amzInventory',SUB_ITEMS:'items',SUB_LOGS:'logs',
 toSkuId:x=>String(x||'').toUpperCase(),stockSkuForSkuAny:sku=>sku==='SINGLE'?'SINGLE':'OWNER',parseQty:Number,
 pickingLineTitle:x=>x.sku,savedTitleForExistingInventorySku:()=>'',readAsinFromDoc:()=>'',readAsinFromLine:()=>'',asinCloudFields:()=>({}),
 stockQtyFromDoc:qty,reservedQtyFromItem:reserved,pendingPickQtyFromItem:reserved,normalizeText:x=>x,
 consumeRackAllocationsForPicking:(_item,n)=>({consumedAllocations:[{qty:n}],missingQty:0,nextAllocations:[],cleanLocations:[]}),
 pickingItemPatchFromAllocations:x=>x,addProductMovementToBatch:()=>{},flowDisplayName:()=>'',pickingPositionTextFromCloudItem:()=>'',
 normalizeFlowLogDoc:snap=>({id:snap.id,...snap.data()}),isShopifyFbmFlow:()=>false,isPickingManagedFlow:()=>true,
 pickingUniqueLines:f=>f.lines,isPickingLinePicked:(f,sku)=>!!f.picking?.pickedLines?.[sku]?.picked,
 getInvIndexForMatch:()=>({}),pickingLineMap:f=>f.picking?.pickedLines||{},pickingSkuKey:x=>x,
 makeForcePickAvailableError:msg=>new Error(msg)};
 vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
 return{run:()=>ctx.commitPickingCloudTransaction('concamarise','flow'),store,get:sku=>store.get('amzInventory/concamarise/items/'+sku)};
}
test('alias picking releases the ordered child and preserves unrelated owner reservations',async()=>{
 const f=fixture([{sku:'CHILD',qty:480}],{OWNER:{qty:1348,reservedQty:30},CHILD:{qty:248,reservedQty:480}});await f.run();
 assert.equal(f.get('OWNER').qty,868);assert.equal(f.get('OWNER').reservedQty,30);
 assert.equal(f.get('CHILD').qty,248);assert.equal(f.get('CHILD').reservedQty,0);assert.equal(f.get('CHILD').pendingPickQty,0);
 await assert.rejects(f.run(),/già prelevato/);
});
test('two aliases in a flow consume shared stock cumulatively and release both reservations',async()=>{
 const f=fixture([{sku:'CHILD',qty:480},{sku:'OTHER',qty:120}],{OWNER:{qty:1348,reservedQty:0},CHILD:{qty:248,reservedQty:480},OTHER:{qty:500,reservedQty:120}});await f.run();
 assert.equal(f.get('OWNER').qty,748);assert.equal(f.get('CHILD').reservedQty,0);assert.equal(f.get('OTHER').reservedQty,0);
});
test('unified flow cannot oversell the owner across multiple child rows',async()=>{
 const f=fixture([{sku:'CHILD',qty:480},{sku:'OTHER',qty:120}],{OWNER:{qty:550,reservedQty:0},CHILD:{qty:248,reservedQty:480},OTHER:{qty:500,reservedQty:120}});
 await assert.rejects(f.run(),/stock cloud insufficiente/);assert.equal(f.get('OWNER').qty,550);
});
test('a non-unified SKU retains the existing single-document behavior',async()=>{
 const f=fixture([{sku:'SINGLE',qty:5}],{SINGLE:{qty:20,reservedQty:8}});await f.run();assert.equal(f.get('SINGLE').qty,15);assert.equal(f.get('SINGLE').reservedQty,3);
});
