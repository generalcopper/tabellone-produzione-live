import {restoreCostsCopy} from './costs-api-copy.mjs';
import {restoreBaselinePolling} from './warehouse-poll-compat.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const dir='public/minimal-originale/',origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
const sha=x=>createHash('sha256').update(x).digest('hex');
const manifest=JSON.parse(await readFile(dir+'manifest.webmanifest','utf8'));
const html=await readFile(dir+'capannone_3d.html','utf8');
assert.equal(manifest.id,'/minimal-originale/capannone_3d.html');
assert.equal(manifest.start_url,manifest.id);
assert.equal(manifest.scope,'/minimal-originale/');
assert.equal(manifest.display,'standalone');
assert.equal(manifest.orientation,'any');
assert.equal(manifest.short_name,'LG Trading');
assert.match(html,/viewport-fit=cover/);
assert.doesNotMatch(html,/user-scalable=no|maximum-scale=1/);
assert.match(html,/name="apple-mobile-web-app-capable" content="yes"/);
assert.match(html,/rel="manifest" href="\/minimal-originale\/manifest.webmanifest"/);
const apple=html.match(/rel="apple-touch-icon"[^>]+href="([^"]+)"/)[1];
for(const icon of [...manifest.icons,{src:apple,sizes:'180x180'}]){
 const url=new URL(icon.src,origin);assert.equal(url.origin,origin);
 const bytes=await readFile('public'+url.pathname),size=Number(icon.sizes.split('x')[0]);
 assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);
 assert.equal(url.searchParams.get('v'),sha(bytes));
}
// The PWA wrapper must not change authentication, APIs, expiry, calculations, or desktop rendering.
assert.equal(sha(restoreCostsCopy(await restoreBaselinePolling(await readFile(dir+'warehouse-assets/warehouse-DAXf6-td.js','utf8')))),'4722381e72aa280b9454e1a8cd17517c563576d5aec304ab0420af7324cac588');
const config=JSON.parse(await readFile('firebase.json','utf8'));
for(const name of ['manifest.webmanifest','warehouse-sw.js']){
 const headers=config.hosting.headers.find(h=>h.source==='/minimal-originale/'+name)?.headers;
 assert.match(headers?.find(h=>h.key==='Cache-Control')?.value||'',/no-cache/);
}

// Exercise the actual worker without network access. Private data, auth and other apps must pass through.
const listeners={},deleted=[],stored=[],cacheRows=new Map();let offline=false,networkCalls=0;
const cache={match:async r=>cacheRows.get(r.url),put:async(r,response)=>{stored.push(r.url);cacheRows.set(r.url,response);}};
const context=vm.createContext({URL,Headers,Response,AbortController,setTimeout,clearTimeout,
 self:{location:{origin},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}},
 caches:{keys:async()=>['gc-hub-sentinel','another-app','lg-warehouse-static-old'],delete:async name=>deleted.push(name),open:async()=>cache},
 fetch:async()=>{networkCalls++;if(offline)throw Error('offline');return new Response('fresh network content',{status:200});}
});
vm.runInContext(await readFile(dir+'warehouse-sw.js','utf8'),context);
let activate;listeners.activate({waitUntil:p=>activate=p});await activate;
assert.deepEqual(deleted,['lg-warehouse-static-old']);
function dispatch(path,options={}){
 let response;const pending=[];
 const request={url:new URL(path,origin).href,method:'GET',mode:'cors',headers:new Headers(),...options};
 listeners.fetch({request,respondWith:p=>response=p,waitUntil:p=>pending.push(p)});
 return {response,pending};
}
for(const [path,options] of [
 ['/index.html',{mode:'navigate'}],['/__/auth/handler',{mode:'navigate'}],['/__/auth/iframe',{}],
 ['/minimal-originale/warehouse-release.json',{}],
 ['https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/ilovepaghe',{}],
 ['https://securetoken.googleapis.com/v1/token',{method:'POST'}]
])assert.equal(dispatch(path,options).response,undefined,path);
const staticPath=manifest.icons[0].src;
assert.equal(dispatch(staticPath,{method:'POST'}).response,undefined);
assert.equal(dispatch(staticPath,{headers:new Headers({Authorization:'Bearer test-only'})}).response,undefined);
let event=dispatch(staticPath);assert.equal(await(await event.response).text(),'fresh network content');await Promise.all(event.pending);
const count=networkCalls;event=dispatch(staticPath);await event.response;assert.equal(networkCalls,count);
for(let i=0;i<2;i++){event=dispatch(manifest.start_url,{mode:'navigate'});assert.equal(await(await event.response).text(),'fresh network content');}
assert.equal(stored.length,1);assert.ok(!stored.some(x=>x.endsWith('.html')));
offline=true;event=dispatch(manifest.start_url,{mode:'navigate'});const response=await event.response;
assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
const body=await response.text();assert.match(body,/Connessione assente/);assert.match(body,/alt="LG Trading"/);assert.doesNotMatch(body,/class="shell"|warehouse-DAXf6-td|Bearer/);
console.log(JSON.stringify({webapp:'passed',icons:3,scope:manifest.scope,authenticatedDataCache:false,appBundle:'presentation and security unchanged; bounded read recovery verified'}));
