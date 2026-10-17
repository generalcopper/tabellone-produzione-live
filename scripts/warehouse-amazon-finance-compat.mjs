import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=b=>createHash('sha256').update(b).digest('hex');
const proof=JSON.parse(await readFile(new URL('./warehouse-amazon-finance-baseline.json',import.meta.url),'utf8'));
export async function restoreFinanceBundle(bundle){
 const module=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-amazon-finance.js',import.meta.url));
 const style=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-amazon-finance.css',import.meta.url));
 assert.equal(sha(module),proof.moduleSha256,'Reviewed financial presentation changed');assert.equal(sha(style),proof.styleSha256,'Reviewed finance styles changed');
 assert.ok(bundle.startsWith(proof.head)&&proof.head.includes('?v='+sha(module)),'Finance module import mismatch');
 let original=bundle.slice(proof.head.length);
 for(const {baseline,addition} of proof.patches){assert.equal(original.split(addition).length,2,'Finance hook missing or duplicated');original=original.replace(addition,baseline)}
 assert.equal(sha(original),'0388a13f165a3a603b28d87f4bf2c79921fd59fdc4ee21250b4c581324cc6d10','Existing dashboard changed beyond the reviewed finance entry points');
 assert.equal(sha(original),proof.baselineSha256);
 return original;
}
