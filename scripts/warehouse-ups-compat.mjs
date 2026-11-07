import {restoreAlarmBundle} from './warehouse-alarm-compat.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Explicit 7 November request: add fast UPS power monitoring inside Security.
// Reversing these exact changes must recover the entire prior application.
export const upsPatches = [
  [
    "security:6e4},co=",
    "security:15e3},co="
  ],
  [
    "nuovo tentativo ogni minuto.",
    "nuovo tentativo ogni 15 secondi."
  ],
  [
    "children:[a.devices.map(e=>(0,H.jsx)(__SR,",
    "children:[a.ups&&(0,H.jsx)(__SR,{tone:a.ups.state,name:`UPS · NUC Forex`,checks:[a.ups],live:a.upsLive,observedAt:a.ups.checkedAt,count:a.upsCount,info:a.ups.shownDetail},`ups-power`),a.devices.map(e=>(0,H.jsx)(__SR,"
  ],
  [
    "./warehouse-wazuh-security.js?v=1e25f2e73be8f421a19c939750086cfd3459aae537e512996a4d207375e2f29e",
    "./warehouse-wazuh-security.js?v=26f5f10677b3addf6aacc7d3deeb5eb7038492c4363f6acad5c1f89f0cfafa2d"
  ]
];
export function restoreUpsBundle(bundle){
 bundle=restoreAlarmBundle(bundle);
 if(!bundle.includes('name:`UPS · NUC Forex`'))return bundle;
 let restored=bundle;
 for(const [before,after] of upsPatches){assert.equal(restored.split(after).length,2,'UPS hook missing or duplicated');restored=restored.replace(after,before);}
 assert.equal(createHash('sha256').update(restored).digest('hex'),'457d93e0abafc84c3e19b529951fd884a2624dc4935592464428d675ebd4ebbf','Unrelated approved dashboard code changed');
 return restored;
}
