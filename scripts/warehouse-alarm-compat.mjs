import {restoreOperationalPolicy} from './warehouse-operational-compat.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// Authorized 7 November alarm integration: remove only the three audited hooks.
// The complete prior approved dashboard must then be byte-identical.
export const ALARM_BASELINE='13c4e88a921312f87189204596aa778eca7ed90af1f309794c0e9e0bfe492306';
export const alarmPatches=[
  [
    "function ll({data:e,error:t,now:n,onOpen:r,onProof:i}){",
    "var AlarmControl=__createAlarmControl(l);function ll({data:e,error:t,now:n,onOpen:r,onProof:i,user:__alarmUser=null}){"
  ],
  [
    "(0,H.jsx)(ll,{data:u,error:d,now:e,onOpen:()=>y(!0),onProof:h})",
    "(0,H.jsx)(ll,{user:ilpUser,data:u,error:d,now:e,onOpen:()=>y(!0),onProof:h})"
  ],
  [
    "(0,H.jsxs)(`span`,{className:`foot-actions`,children:[e&&(0,H.jsxs)(`button`,{type:`button`,className:`link`,onClick:r,children:[`Dettagli `,xc.arrow]}),(0,H.jsx)(mc,{value:e,title:`Sicurezza aziendale`,onProof:i})]})",
    "(0,H.jsxs)(`span`,{className:`foot-actions`,children:[(0,H.jsx)(AlarmControl,{user:__alarmUser,now:n}),e&&(0,H.jsxs)(`button`,{type:`button`,className:`link`,onClick:r,children:[`Dettagli `,xc.arrow]}),(0,H.jsx)(mc,{value:e,title:`Sicurezza aziendale`,onProof:i})]})"
  ]
];
export function restoreAlarmBundle(bundle){
 bundle=restoreOperationalPolicy(bundle);
 const match=bundle.match(/^import \{createAlarmControl as __createAlarmControl\} from "\.\/warehouse-alarm\.js\?v=[a-f0-9]{64}";\n/);
 if(!match)return bundle;
 let result=bundle.slice(match[0].length);
 for(const [before,after] of alarmPatches){assert.equal(result.split(after).length,2,'Alarm hook missing or duplicated');result=result.replace(after,before);}
 assert.equal(createHash('sha256').update(result).digest('hex'),ALARM_BASELINE,'Unrelated approved dashboard code changed');
 return result;
}
