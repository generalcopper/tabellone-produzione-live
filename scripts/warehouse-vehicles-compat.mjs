import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const reviewedHooks=[["var VehicleCard=__createVehicleCard(l);var ILPCockpit=__createILPCockpit(l);", "var ILPCockpit=__createILPCockpit(l);"], ["(0,H.jsx)(ol,{inventory:t?.inventory,now:e,onProof:h,changed:b.changed[`fba-inventory`]}),(0,H.jsx)(VehicleCard,{user:ilpUser,now:e})]}),(0,H.jsxs)(vc,{id:`systems`", "(0,H.jsx)(ol,{inventory:t?.inventory,now:e,onProof:h,changed:b.changed[`fba-inventory`]})]}),(0,H.jsxs)(vc,{id:`systems`"]];
export async function restoreVehiclesBundle(bundle) {
 const module=await readFile('public/minimal-originale/warehouse-assets/warehouse-vehicles.js');
 const style=await readFile('public/minimal-originale/warehouse-assets/warehouse-vehicles.css');
 assert.equal(sha(module),'c8a859bf7c572871692d2e7712224f246f193591f439b10c995182f9af5ed951','Reviewed vehicle monitor changed');
 assert.equal(sha(style),'67321a21bb91b5acc5cc5864dbf0bcc6c1f728e2bb7992e8b98df4e8fcdd573a','Reviewed vehicle card styles changed');
 const head='import {createVehicleCard as __createVehicleCard} from "./warehouse-vehicles.js?v='+sha(module)+'";\n';
 assert.ok(bundle.startsWith(head),'Vehicle monitor import missing');
 let original=bundle.slice(head.length);
 for(const [addition,baseline] of reviewedHooks){assert.equal(original.split(addition).length,2,'Vehicle hook missing or duplicated');original=original.replace(addition,baseline);}
 assert.equal(sha(original),'06b78242b13381c94bf5c7ca0341365fb5240e8cd7cbf0a8cae275650e474e64','Existing dashboard behavior or presentation changed beyond the reviewed vehicle hooks');
 return original;
}
