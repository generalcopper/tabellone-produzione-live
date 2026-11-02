import assert from 'node:assert/strict';
export function restoreUndergroundBundle(bundle){
 const head="import {createUndergroundMonitor as __createUndergroundMonitor} from \"./warehouse-underground.js?v=2cd57a00cf5b98c69d34b3b80d62b59c1ef14b053dcf46f4b1d5e680b26ea4b3\";\n";
 if(!bundle.startsWith(head)){assert.ok(!bundle.includes("__createUndergroundMonitor"));return bundle;}
 assert.ok(bundle.startsWith(head));
 let result=bundle.slice(head.length);
 for(const added of ["var UndergroundMonitor=__createUndergroundMonitor(l);", "(0,H.jsx)(vc,{id:`underground`,title:`Underground studio`,children:(0,H.jsx)(UndergroundMonitor,{user:ilpUser,now:e})}),"]){assert.equal(result.split(added).length,2);result=result.replace(added,'');}
 return result;
}
