import {restoreFinanceBundle} from './warehouse-amazon-finance-compat.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const proof=JSON.parse(await readFile(new URL('./warehouse-amazon-baseline.json',import.meta.url),'utf8'));
export async function restoreAmazonBundle(bundle){
 bundle=await restoreFinanceBundle(bundle);
 const module=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-amazon.js',import.meta.url));
 assert.equal(sha(module),proof.moduleSha256,'Reviewed Amazon continuity module changed');
 assert.ok(proof.head.includes('?v='+sha(module))&&bundle.startsWith(proof.head),'Amazon receipt module must match its content hash');
 let original=bundle.slice(proof.head.length);
 for(const {baseline,addition} of proof.patches){assert.equal(original.split(addition).length,2,'Amazon hook missing or duplicated');original=original.replace(addition,baseline);}
 assert.equal(sha(original),'b94bcf3dc28f6d244aadc5fe6f70ddc616b0628f5d8b319594e04bb5bd653e8d','Dashboard changed beyond reviewed Amazon calculations and receipt labels');
 return original;
}
