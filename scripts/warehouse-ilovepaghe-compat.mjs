import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Authorized 24 October 2026: three platform counters in the existing iLovePaghe footer.
// Normalize only the verified module cache key before checking every earlier bundle invariant.
export const ILP_BASELINE_HASH='793cf2cadd0cf9130a4225c5cbecaba55cc4458e9418afbdfd02e83bfcce9302';
export function restoreILPCockpitImport(bundle){
 const hash=createHash('sha256').update(readFileSync(new URL('../public/minimal-originale/warehouse-assets/warehouse-ilovepaghe.js',import.meta.url))).digest('hex');
 const current='./warehouse-ilovepaghe.js?v='+hash;
 assert.equal(bundle.split(current).length,2,'iLovePaghe import must match its content exactly once');
 return bundle.replace(current,'./warehouse-ilovepaghe.js?v='+ILP_BASELINE_HASH);
}
