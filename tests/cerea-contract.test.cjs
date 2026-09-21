const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {automaticCereaAllocations:plan}=require('../functions/picking-notifications/cerea-stock');
const source=fs.readFileSync(path.join(__dirname,'../public/picking.html'),'utf8');
const block=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ctx={Date};vm.createContext(ctx);
vm.runInContext(block('    function parseSignedQtyStrict(', '    // --- title/meta helpers')+
  block('    function buildRackLocationOptions(', '    function rackLocationDisplayPartsFromItem('),ctx);
test('backend markers match the existing Picking reader and remain fully Da ubicare',()=>{
  const rack='A01-L1-P1',lot='LOTTO-STORICO';
  for(const qty of [0,1,40,120,480,1000]) for(const located of [0,1,40,120,480]) {
    const d={productionArea:'cerea',qty,stockLots:[{lot,qty}],rackAllocations:located?[{code:rack,lot,qty:located}]:[]};
    d.cereaAllocations=plan(d);
    assert.equal(ctx.cereaQtyFromDoc(d),Math.max(0,qty-located));
    assert.equal(ctx.rackUnallocatedQtyFromDoc(d),Math.max(0,qty-located));
    assert.equal(ctx.stockQtyFromDoc(d),qty);
  }
});
