import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {monitoredServices} from '../public/minimal-originale/warehouse-assets/warehouse-service-alerts.js';
import {restoreServiceAlerts} from './warehouse-service-alerts-compat.mjs';
const bundle=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js',import.meta.url),'utf8');
await restoreServiceAlerts(bundle);
const now=Date.parse('2026-10-20T13:20:00Z');
const service=(id,state)=>Object.freeze({id,name:id,state,checks:Object.freeze([
  Object.freeze({label:'Controllo',state,detail:'Riscontro reale'})
]),sha256:id+'-original-proof'});
const raw=Object.freeze([service('picking','ok'),service('instagram','warn'),service('forex','unknown'),service('shopify','warn')]);
const snapshot=Object.freeze({services:raw,sha256:'original-signed-snapshot'});
const monitored=monitoredServices(snapshot.services);
assert.deepEqual(monitored.map(s=>s.id),['picking','forex','shopify']);
assert.equal(monitored[0],raw[0]);
assert.equal(snapshot.services.length,4);
assert.equal(snapshot.services[1].state,'warn');
assert.equal(snapshot.sha256,'original-signed-snapshot');
assert.deepEqual(monitoredServices(),[]);
for(const state of ['ok','warn','down','unknown'])
  assert.equal(monitoredServices([service('instagram',state),service('forex',state)])[0].id,'forex');
// Execute the actual shipped overview: IG must not enter open problems or counters;
// unrelated stale, warning and unavailable readings must remain visible.
const start=bundle.indexOf('function ec({data:'),end=bundle.indexOf('var tc=80',start);
assert.ok(start>=0&&end>start);
const overview=vm.runInNewContext(bundle.slice(start,end)+';ec',{
  __monitoredServices:monitoredServices,Io:Date.parse,
  Zs:s=>s.state,Vs:()=>null,Hs:()=>null,zs:()=>({fresh:false}),bs:[],ys:[],
  qs:()=> 'ok',Fs:()=>({combined:null}),Qs:()=>true,$s:()=>false,
  Xs:{down:0,warn:1,unknown:2,ok:3},V:String,Os:()=> 'righe',
  Ys:{ok:'Regolare',warn:'Problema',down:'Guasto',unknown:'Da verificare'}
});
const input={data:{...snapshot,generatedAt:new Date(now).toISOString(),activity:{visits:[{value:2}]}},
  now,session:{flow:{write:{out:0},fbm:{out:0},fba:{out:0}}}};
const view=overview(input);
assert.equal(view.issues.some(i=>i.title==='instagram'),false);
assert.equal(view.issues.some(i=>i.title==='shopify'&&i.tone==='warn'),true);
assert.equal(view.issues.some(i=>i.title==='forex'&&i.tone==='unknown'),true);
assert.equal(view.issues.some(i=>i.title==='Inventario FBA'&&i.tone==='unknown'),true);
assert.equal(view.totalChecks,3);
assert.equal(view.goodServices,1);
assert.equal(view.passedChecks,1);
assert.match(view.lede,/1 servizi su 3 attivi/);
assert.equal(overview({...input,data:null}).tone,'unknown');
console.log(JSON.stringify({serviceAlerts:'passed',excluded:['instagram'],sourceProofs:'unchanged',
  otherFaults:'retained',overview:'production function verified',layout:'baseline hash verified'}));
