import {restoreUpsBundle} from './warehouse-ups-compat.mjs';
import assert from 'node:assert/strict';
export function restoreUndergroundBundle(bundle){
 bundle=restoreUpsBundle(bundle);
 const head="import {createUndergroundMonitor as __createUndergroundMonitor} from \"./warehouse-underground.js?v=246b49628013e009246c87373dd85fa08e70a67dc77d9f7228a161d03d202168\";\n";
 if(!bundle.startsWith(head)){assert.ok(!bundle.includes("__createUndergroundMonitor"));return bundle;}
 assert.ok(bundle.startsWith(head));
 let result=bundle.slice(head.length);
 for(const added of ["var UndergroundMonitor=__createUndergroundMonitor(l);"]){assert.equal(result.split(added).length,2);result=result.replace(added,'');}
 const embedded="(0,H.jsxs)(vc,{id:`ilovepaghe`,title:`iLovePaghe`,children:[(0,H.jsx)(ILPCockpit,{user:ilpUser,now:e}),(0,H.jsx)(UndergroundMonitor,{user:ilpUser,now:e})]})";
 assert.equal(result.split(embedded).length,2,'Underground must stay inside the existing iLovePaghe zone');
 result=result.replace(embedded,"(0,H.jsx)(vc,{id:`ilovepaghe`,title:`iLovePaghe`,children:(0,H.jsx)(ILPCockpit,{user:ilpUser,now:e})})");
 assert.ok(!result.includes('id:`underground`'),'No additional grid zone');
 return result;
}
