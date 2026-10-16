import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const proof=JSON.parse(await readFile(new URL('./warehouse-polling-baseline.json',import.meta.url),'utf8'));
export async function restoreBaselinePolling(bundle){
 const bytes=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-connection.js',import.meta.url));
 const hash=createHash('sha256').update(bytes).digest('hex');
 const head='import {createPolling as __createPolling, authenticatedRead as __authenticatedRead} from "./warehouse-connection.js?v='+hash+'";\n';
 assert.ok(bundle.startsWith(head),'Recovery module must match its content hash');
 const plain=bundle.slice(head.length);
 assert.equal(plain.split(proof.adapter).length,2,'Only the polling and authenticated-read adapter may change');
 return plain.replace(proof.adapter,proof.baseline);
}
