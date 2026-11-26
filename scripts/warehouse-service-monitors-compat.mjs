import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const SERVICE_MONITOR_BASELINE='68d66d1382318419a98416fa8e8e474afc144ded752358768fee3779b9b3a310';
export const SERVICE_MONITOR_MODULE='3930431ad6f1d499f8db6e05c446e2b5d142cafbe2852e812212c1049e40bd89';
export const SERVICE_MONITOR_STYLE='42e8972d300c622bc054b60cc908257e8a5488960258ab5df127329e60c00074';
export const serviceMonitorHead='import {createServiceMonitorDetails as __createServiceMonitorDetails, hasServiceMonitors as __hasServiceMonitors, serviceMonitorTitle as __serviceMonitorTitle} from "./warehouse-service-monitors.js?v='+SERVICE_MONITOR_MODULE+'";\n';
export const serviceMonitorPatches=[
 ['var bl={down:0,warn:1,unknown:2,paused:3,ok:3};function xl({services:e,now:t,onProof:n,changed:r,good:i,checksLabel:a}){let o=',
  'var ServiceMonitorDetails=__createServiceMonitorDetails(l);var bl={down:0,warn:1,unknown:2,paused:3,ok:3};function xl({services:e,now:t,onProof:n,changed:r,good:i,checksLabel:a}){let[__serviceDetail,__setServiceDetail]=(0,l.useState)(null);let o=',1],
 ['onClick:()=>n({title:e.name,value:e}),title:`Apri il riscontro SHA-256`,children:[(0,H.jsx)(yl',
  'onClick:()=>__hasServiceMonitors(e)?__setServiceDetail(e.id):n({title:e.name,value:e}),title:__hasServiceMonitors(e)?__serviceMonitorTitle(e,t):`Apri il riscontro SHA-256`,children:[(0,H.jsx)(yl',1],
 ['onClick:()=>n({title:e.name,value:e}),title:e.name+` · `+(i===`paused`?',
  'onClick:()=>__hasServiceMonitors(e)?__setServiceDetail(e.id):n({title:e.name,value:e}),title:__hasServiceMonitors(e)?__serviceMonitorTitle(e,t):e.name+` · `+(i===`paused`?',1],
 ['children:[e.name,(0,H.jsx)(hc,{at:r[`service-`+e.id],now:t})]',
  'children:[(0,H.jsx)(ServiceMonitorDetails.Name,{service:e,now:t}),(0,H.jsx)(hc,{at:r[`service-`+e.id],now:t})]',2],
 ['className:`services`,title:`Servizi`,meta:e.length?i+` di `+e.length+` operativi · `+a:`In attesa della fonte`,children:[s.length>0',
  'className:`services`,title:`Servizi`,meta:e.length?i+` di `+e.length+` operativi · `+a:`In attesa della fonte`,children:[__serviceDetail&&(0,H.jsx)(ServiceMonitorDetails,{service:e.find(s=>s.id===__serviceDetail),now:t,onClose:()=>__setServiceDetail(null),onProof:n}),s.length>0',1]
];
export function restoreServiceMonitorBundle(bundle){
 if(!bundle.startsWith(serviceMonitorHead)){assert.ok(!bundle.includes('__createServiceMonitorDetails'),'Service monitor import altered');return bundle;}
 assert.equal(sha(readFileSync(new URL('../public/minimal-originale/warehouse-assets/warehouse-service-monitors.js',import.meta.url))),SERVICE_MONITOR_MODULE);
 assert.equal(sha(readFileSync(new URL('../public/minimal-originale/warehouse-assets/warehouse-service-monitors.css',import.meta.url))),SERVICE_MONITOR_STYLE);
 let original=bundle.slice(serviceMonitorHead.length);
 for(const [before,after,count] of [...serviceMonitorPatches].reverse()){
  assert.equal(original.split(after).length,count+1,'Service monitor hook missing or duplicated');
  original=original.split(after).join(before);
 }
 assert.equal(sha(original),SERVICE_MONITOR_BASELINE,'Unrelated dashboard code changed');
 return original;
}
