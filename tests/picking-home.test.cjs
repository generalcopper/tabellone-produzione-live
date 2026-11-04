const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../public/picking.html'), 'utf8');
const moduleSource = fs.readFileSync(path.join(__dirname, '../public/picking-home.js'), 'utf8');
const home = import('data:text/javascript;base64,' + Buffer.from(moduleSource).toString('base64'));
const from = html.indexOf('    function buildRackLocationOptions(');
const end = html.indexOf('    const LOT_LEGACY_ID', from);
const ctx = vm.createContext({});
vm.runInContext(html.slice(from, end) + '\nglobalThis.codes=RACK_LOCATION_OPTIONS;', ctx);
const codes = Array.from(ctx.codes);

test('Home reconciles partial allocations, lots and temporary Cerea without double counting stock', async()=>{
  const {buildHomeModel} = await home;
  const model = buildHomeModel([
    {sku:'OWNER',displaySku:'SKU',total:100,allocated:60,cerea:25,allocations:[
      {code:'C00-L1-P1',lot:'LOT-A',qty:20}, {code:'C00-L1-P1',lot:'LOT-B',qty:10}, {code:'C00-L3-P3',lot:'LOT-A',qty:30}]},
    {sku:'OTHER',total:50,allocated:0,cerea:50},
    {sku:'EMPTY',total:0,allocated:40,allocations:[{code:'A01-L1-P1',qty:40}]}
  ], codes);
  assert.equal(model.stats.total,150);
  assert.equal(model.stats.allocated,60);
  assert.equal(model.stats.unallocated,90);
  assert.equal(model.stats.cerea,75);
  assert.equal(model.stats.products,2);
  assert.equal(model.stats.occupied,2,'two lots in one slot occupy a single position');
  assert.equal(model.positions.get('C00-L1-P1').length,2);
  assert.equal(model.positions.get('C00-L1-P1')[0].sku,'OWNER','editing retains the authoritative stock owner');
  assert.equal(model.stats.total,model.stats.allocated + model.stats.unallocated);
});

test('a cloud move/removal updates occupancy while preserving stock and returning released pieces to Da ubicare', async()=>{
  const {buildHomeModel} = await home;
  const item = {sku:'SKU',total:80,allocated:80,allocations:[{code:'A04-L2-P2',qty:80}]};
  const before = buildHomeModel([item],codes);
  const moved = buildHomeModel([{...item,allocations:[{code:'G03-L1-P2',qty:80}]}],codes);
  const removed = buildHomeModel([{...item,allocated:0,allocations:[]}],codes);
  assert.equal(before.positions.get('A04-L2-P2')[0].qty,80);
  assert.equal(moved.positions.get('A04-L2-P2').length,0);
  assert.equal(moved.positions.get('G03-L1-P2')[0].qty,80);
  assert.equal(removed.stats.occupied,0);
  assert.equal(removed.stats.unallocated,80);
  assert.equal(removed.stats.total,80);
});

test('legacy locations stay visible without inventing precise quantities for each slot', async()=>{
  const {buildHomeModel} = await home;
  const model = buildHomeModel([{sku:'LEGACY',total:100,allocated:100,allocations:[
    {code:'A01-L1-P1',qty:100,legacy:true}, {code:'A01-L1-P2',qty:0,legacy:true}
  ]}],codes);
  assert.equal(model.stats.occupied,2);
  assert.equal(model.positions.get('A01-L1-P1')[0].qty,null);
  assert.equal(model.positions.get('A01-L1-P2')[0].unknown,true);
  assert.equal(model.stats.allocated,100);
});

test('search locates aliases, accents, lots and exact positions and reports unallocated matches', async()=>{
  const {buildHomeModel} = await home;
  const items = [{sku:'OWNER',displaySku:'DISPLAY',aliases:['ALIAS'],title:'Caffè biologico',total:50,allocated:30,
    allocations:[{code:'F00-L3-P2',lot:'LOT-20261104',qty:30}]}];
  for (const query of ['alias','caffe','F00-L3-P2','20261104','biologico F00']) {
    const model=buildHomeModel(items,codes,query);
    assert.equal(model.bays.get('F00').matched,true,query);
    assert.equal(model.bays.get('A01').matched,false,query);
  }
  assert.equal(buildHomeModel(items,codes,'caffe').unlocatedMatches,1);
  assert.equal([...buildHomeModel(items,codes,'missing').bays.values()].filter(x=>x.matched).length,0);
});

test('the interactive plan covers every real location, including short bays and ground-only G', async()=>{
  const {buildHomeModel} = await home;
  const begin = html.indexOf('    (function setupTrovaMapPlan(){');
  const finish = html.indexOf('\n    })();',begin) + '\n    })();'.length;
  let adapters;
  const context = vm.createContext({
    pickingHomeDashboard:null, $:()=>({}), RACK_LOCATION_OPTIONS:codes,
    createPickingHomeDashboard:options=>{adapters=options; return {};},
    setPickingHomeView(){}, normalizeRackLocation:value=>String(value || '').toUpperCase()
  });
  vm.runInContext(html.slice(begin,finish).replace('      pickingHomeDashboard = createPickingHomeDashboard({',
    '      globalThis.originalPlan = buildPlanSVG;\n      pickingHomeDashboard = createPickingHomeDashboard({'),context);
  const model=buildHomeModel([],codes);
  const plan=adapters.renderPlan({bays:model.bays,selectedBay:'G03',searching:false,ready:true});
  const rendered=[...plan.matchAll(/data-home-bay="([A-G]\d{2})"/g)].map(x=>x[1]);
  assert.deepEqual(rendered.sort(),[...model.bays.keys()].sort());
  assert.equal(model.bays.get('G03').positions.length,2);
  assert.equal(model.bays.get('C00').positions.length,9);
  assert.equal(model.bays.get('A04').positions.length,6);
  assert.equal(model.bays.get('F00').positions.length,6);
  assert.equal(rendered.length,27);
  assert.ok(!plan.includes('NaN'));
  assert.ok(plan.includes('role="group"'));
  assert.ok(plan.includes('aria-pressed="true"'));
  const original=context.originalPlan({code:'C00-L2-P3',rack:'C',bay:0,level:2,pallet:3,bayCode:'C00'});
  assert.ok(original.includes('Pianta capannone, posizione C00-L2-P3'));
  assert.ok(original.includes('class="tm-pin"'));
  assert.ok(!original.includes('data-home-bay'),'Trova keeps its existing pin interface');
});
