import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serviceMonitors,hasServiceMonitors,serviceMonitorTitle,createServiceMonitorDetails} from '../public/minimal-originale/warehouse-assets/warehouse-service-monitors.js';
import {restoreServiceMonitorBundle,SERVICE_MONITOR_BASELINE,SERVICE_MONITOR_MODULE,SERVICE_MONITOR_STYLE} from './warehouse-service-monitors-compat.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),now=Date.parse('2026-11-26T10:00:00Z'),iso=t=>new Date(t).toISOString();
const labels={picking:['NUC · WhatsApp Picking','NUC · voce capannone'],bionee:['Folia · generatore locale'],lgtrading:['Centralino · Asterisk','Centralino · linea','Centralino · telefoni']};
const make=(id,state='ok')=>({id,name:id,state,checkedAt:iso(now-1000),expiresAt:iso(now+60000),checks:labels[id].map(label=>({label,state,detail:'Riscontro della fonte',checkedAt:iso(now-1000),sha256:'a'.repeat(64)})),sha256:'b'.repeat(64)});
let cases=0;
for(const id of Object.keys(labels)){
 const s=make(id),before=JSON.stringify(s);
 const groups=serviceMonitors(s,now);assert.ok(groups.every(g=>g.state==='ok'));assert.equal(hasServiceMonitors(s),true);
 assert.equal(JSON.stringify(s),before);assert.ok(groups.every(g=>g.rows.every(r=>s.checks.includes(r.source))));cases++;
 for(const state of ['warn','down','unknown']){assert.ok(serviceMonitors(make(id,state),now).every(g=>g.state===state));cases++;}
 for(const edit of [v=>v.expiresAt=iso(now),v=>v.checkedAt=iso(now-360000),v=>v.checkedAt=iso(now+30001),v=>v.checks=[]]){
  const v=make(id);edit(v);assert.ok(serviceMonitors(v,now).every(g=>g.state==='unknown'));cases++;
 }
}
for(const id of ['amazon','shopify','node-k7','gymory']){assert.equal(hasServiceMonitors({id}),false);assert.deepEqual(serviceMonitors({id},now),[]);cases++;}
const picking=make('picking');picking.checks[0].state='warn';
assert.deepEqual(serviceMonitors(picking,now).map(g=>g.state),['warn','ok']);
assert.match(serviceMonitorTitle(picking,now),/WhatsApp: Attenzione.*Voce NUC: Operativo/);
picking.checks[1].checkedAt=iso(now-120000);assert.equal(serviceMonitors(picking,now)[1].state,'unknown');
const duplicate=make('bionee');duplicate.checks.push({...duplicate.checks[0]});assert.equal(serviceMonitors(duplicate,now)[0].state,'unknown');
const invalid=make('bionee');invalid.checks[0].state='invented';assert.equal(serviceMonitors(invalid,now)[0].state,'unknown');
const centralino=make('lgtrading');centralino.checks[1].state='down';assert.equal(serviceMonitors(centralino,now)[0].state,'down');
const h=(type,props,...children)=>({type,props:{...props,children}});
const React={createElement:h,useRef:()=>({current:null}),useEffect(){}};
const Details=createServiceMonitorDetails(React),proofs=[],source=make('picking');let closed=0;
const rendered=Details({service:source,now,onClose:()=>closed++,onProof:p=>proofs.push(p)});
const walk=v=>v&&typeof v==='object'?[v,...[v.props?.children].flat(Infinity).flatMap(walk)]:[];
const text=v=>v&&typeof v==='object'?[v.props?.children].flat(Infinity).map(text).join(''):String(v??'');
assert.match(text(rendered),/WhatsApp/);assert.match(text(rendered),/Voce NUC/);
const proof=walk(rendered).find(v=>v.type==='button'&&text(v)==='Riscontro tecnico');proof.props.onClick();
assert.equal(closed,1);assert.equal(proofs[0].value,source);
const bundle=await readFile('public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
assert.equal(sha(restoreServiceMonitorBundle(bundle)),SERVICE_MONITOR_BASELINE);
assert.throws(()=>restoreServiceMonitorBundle(bundle.replace('Sicurezza aziendale','Changed')));
const html=await readFile('public/minimal-originale/capannone_3d.html','utf8'),sw=await readFile('public/minimal-originale/warehouse-sw.js','utf8');
assert.ok(html.includes('warehouse-service-monitors.css?v='+SERVICE_MONITOR_STYLE));
assert.ok(sw.includes('warehouse-service-monitors.js?v='+SERVICE_MONITOR_MODULE));assert.ok(sw.includes('warehouse-service-monitors.css?v='+SERVICE_MONITOR_STYLE));
const module=await readFile('public/minimal-originale/warehouse-assets/warehouse-service-monitors.js','utf8');
assert.doesNotMatch(module,/\bfetch\s*\(|localStorage|sessionStorage|setInterval|innerHTML/);
console.log(JSON.stringify({serviceMonitors:'passed',cases:cases+8,sourceProofs:'original references retained',additionalReads:0,unrelatedBundle:'byte-identical',gymory:'excluded'}));
