import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
const html=await readFile('public/capannone_3d.html','utf8');
const entryUrl=new URL(html.match(/src="([^"]+entry-[^"]+)"/)[1],origin);
const entry=await readFile('public'+entryUrl.pathname,'utf8');
assert.equal(entryUrl.searchParams.get('v'),sha(entry),'HTML must invalidate the entry cache');
const mainUrl=new URL(entry.match(/await import\("([^"]+)"\)/)[1],entryUrl);
const main=await readFile('public'+mainUrl.pathname,'utf8');
const relayUrl=new URL(main.match(/import\(`([^`]+warehouse-ai-relay[^`]+)`\)/)[1],mainUrl);
const relay=await readFile('public'+relayUrl.pathname,'utf8');
const relayMainUrl=new URL(relay.match(/from"([^\"]+warehouse-CDxmWwuL[^\"]+)"/)[1],relayUrl);
assert.equal(relayMainUrl.href,mainUrl.href,'Voice relay must reuse the already mounted app, not import and mount a second cached copy');
assert.ok(mainUrl.searchParams.get('v'),'The changed app must bypass existing immutable caches');
assert.equal(relayUrl.searchParams.get('v'),mainUrl.searchParams.get('v'),'The voice relay and app must share their release revision');
assert.match(main,/var jo=15e3;function Mo\(/);
for(const path of ['public/warehouse-release.json','public/minimal/warehouse-release.json']){
 const manifest=JSON.parse(await readFile(path,'utf8'));
 for(const url of [entryUrl,mainUrl,relayUrl,new URL('/capannone_3d.html',origin)]){
  const bytes=await readFile('public'+url.pathname);
  assert.equal(manifest.files[url.pathname].sha256,sha(bytes));
  assert.equal(manifest.files[url.pathname].size,bytes.length);
 }
}
console.log(JSON.stringify({kioskPower:'passed',contractWatts:15000,voiceModuleIdentity:'same app instance',cachedOldAppImport:false,manifestHashes:'verified'}));
