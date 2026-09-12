const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const hub=fs.readFileSync(path.join(__dirname,'../public/hub_inventario_amazon.html'),'utf8');
const picking=fs.readFileSync(path.join(__dirname,'../public/picking.html'),'utf8');
function block(source,start,end){return source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));}
function context(items){
 const ctx={state:{inventory:{concamarise:{items}},cache:{}},Date,
 toSkuId:x=>String(x||'').trim().toUpperCase(),normalizeAsin:x=>String(x||'').toUpperCase(),
 inventoryLocs:()=>['concamarise'],readAsinFromDoc:x=>x.asin||'',inventoryRuntimeCacheKey:()=>1};
 vm.createContext(ctx);
 vm.runInContext(block(picking,'    function normalizeSkuAliases(','    function readSkuAliasesFromDoc(')+
 block(picking,'    function readSkuAliasCanonicalFromDoc(','    function inventoryRuntimeCacheKey(')+
 block(picking,'    function pickingCloudRawDoc(','    function buildPickingCloudInventoryItem(')+
 block(picking,'    function buildSkuAliasIndex(){','    function resolveSkuAlias(')+
 block(hub,'    function sharedStockMutationFields(','    function sharedStockSnapshotFromDoc('),ctx);
 return ctx;
}
test('Picking follows the same ASIN and owner as Hub, ignoring stale aliases from a different product',()=>{
 const items=[
  {sku:'OWNER',asin:'B0DJ68X3BG',canonicalSku:'CHILD',sharedStockSourceSku:'CHILD',sharedStockRevisionAtClient:1,skuAliases:['FOREIGN']},
  {sku:'CHILD',asin:'B0DJ68X3BG',canonicalSku:'CHILD',sharedStockSourceSku:'OWNER',sharedStockRevisionAtClient:2},
  {sku:'FOREIGN',asin:'B012345678',canonicalSku:'CHILD',skuAliases:['OWNER']}];
 const ctx=context(items),idx=ctx.buildSkuAliasIndex();
 assert.equal(idx.resolve('CHILD'),'OWNER');
 assert.equal(idx.resolve('FOREIGN'),'FOREIGN');
 assert.deepEqual([...idx.members('OWNER')],['OWNER','CHILD']);
});
test('loading or editing the physical owner cannot flip a cyclic legacy group to its stale alias',()=>{
 const items=[
  {sku:'OWNER',asin:'B0DJ68X3BG',sharedStockSourceSku:'CHILD',sharedStockRevisionAtClient:1,qty:45},
  {sku:'CHILD',asin:'B0DJ68X3BG',sharedStockSourceSku:'OWNER',sharedStockRevisionAtClient:2,qty:6}];
 const ctx=context(items);
 assert.equal(ctx.pickingCloudDeclaredStockOwnerSku(items,'CHILD'),'OWNER');
 Object.assign(items[0],ctx.sharedStockMutationFields(3,'operator','product_manual_load','OWNER'),{qty:84});
 assert.equal(ctx.pickingCloudDeclaredStockOwnerSku(items,'CHILD'),'OWNER');
 assert.equal(items[0].qty,84);
 assert.equal(items[1].qty,6);
});
