import assert from 'node:assert/strict';
export function restoreUndergroundBundle(bundle){
 const head="import {createUndergroundMonitor as __createUndergroundMonitor} from \"./warehouse-underground.js?v=e70f498505c304c00c7d48f35fa7644da235548bccb0e28342fba6240c51ffc4\";\n";
 if(!bundle.startsWith(head)){assert.ok(!bundle.includes("__createUndergroundMonitor"));return bundle;}
 assert.ok(bundle.startsWith(head));
 let result=bundle.slice(head.length);
 for(const added of ["var UndergroundMonitor=__createUndergroundMonitor(l);", "(0,H.jsx)(vc,{id:`underground`,title:`Underground studio`,children:(0,H.jsx)(UndergroundMonitor,{user:ilpUser,now:e})}),"]){assert.equal(result.split(added).length,2);result=result.replace(added,'');}
 return result;
}
