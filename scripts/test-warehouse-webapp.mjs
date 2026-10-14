// Real service-worker lifecycle on localhost; no credentials or external network.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createHash} from 'node:crypto';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'),prefix='/minimal-originale/',entry=prefix+'capannone_3d.html';
const sha=b=>createHash('sha256').update(b).digest('hex');
const runtime=prefix+'warehouse-assets/warehouse-webapp.js?v='+sha(await readFile(root+prefix+'warehouse-assets/warehouse-webapp.js'));
const style=prefix+'warehouse-assets/warehouse-webapp.css?v='+sha(await readFile(root+prefix+'warehouse-assets/warehouse-webapp.css'));
let revision=1,dropNavigation=false;const hits={api:0,auth:0};
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');
 if(path==='/harness.html'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Local test</title>');}
 if(path==='/test-other-sw.js'){res.setHeader('Content-Type','application/javascript');return res.end("self.addEventListener('install',e=>e.waitUntil(self.skipWaiting()));self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));");}
 if(path===entry&&dropNavigation){req.socket.destroy();return;}
 if(path===entry){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="${style}"><script type="module" src="${runtime}"></script><p id="root" data-revision="${revision}">Online revision ${revision}</p><p id="warehouse-connection" class="warehouse-connection" role="status" hidden>Connessione assente</p>`);}
 if(path==='/v1/control-center/ilovepaghe'){hits.api++;res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({fixtureOnly:true,request:hits.api}));}
 if(path==='/__/auth/iframe'){hits.auth++;res.setHeader('Content-Type','text/html');return res.end('auth fixture '+hits.auth);}
 const name=resolve(root,'.'+path);if(!name.startsWith(root+'/')){res.statusCode=403;return res.end();}
 try{const body=await readFile(name);res.setHeader('Content-Type',({'.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'})[extname(name)]||'application/octet-stream');res.end(body);}catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port,results=[];
try{
 for(const type of [webkit,chromium]){
  revision=1;dropNavigation=false;
  const browser=await(type===chromium?type.launch({headless:true,channel:'chrome'}):type.launch({headless:true}));
  try{
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   await page.goto(origin+'/harness.html');
   await page.evaluate(async()=>{
    await navigator.serviceWorker.register('/test-other-sw.js',{scope:'/'});await navigator.serviceWorker.ready;
    const cache=await caches.open('gc-hub-sentinel');await cache.put('/index.html',new Response('other app cache'));
   });
   await page.goto(origin+entry);
   await page.waitForFunction(()=>navigator.serviceWorker.controller?.scriptURL.endsWith('/minimal-originale/warehouse-sw.js'));
   const registrations=await page.evaluate(async()=>Promise.all((await navigator.serviceWorker.getRegistrations()).map(r=>({scope:r.scope,script:r.active?.scriptURL}))));
   assert.ok(registrations.some(r=>r.scope===origin+'/'));
   assert.ok(registrations.some(r=>r.scope===origin+prefix&&r.script===origin+prefix+'warehouse-sw.js'));
   assert.ok(await page.evaluate(()=>caches.has('gc-hub-sentinel')));
   const before={...hits};
   await page.evaluate(async style=>{
    await fetch(style);await fetch(style);
    for(let i=0;i<2;i++){
     await fetch('/v1/control-center/ilovepaghe',{headers:{Authorization:'Bearer fixture-only'}});
     await fetch('/__/auth/iframe');
    }
   },style);
   assert.equal(hits.api-before.api,2);assert.equal(hits.auth-before.auth,2);
   const cached=await page.evaluate(async()=>{
    const all=[];for(const name of await caches.keys())if(name.startsWith('lg-warehouse-static-'))for(const r of await(await caches.open(name)).keys())all.push(r.url);return all;
   });
   assert.ok(cached.some(u=>u.includes('warehouse-webapp.css')));
   assert.ok(cached.every(u=>u.includes('/warehouse-assets/')));
   revision=2;await page.reload();assert.equal(await page.locator('#root').getAttribute('data-revision'),'2');
   await context.setOffline(true);await page.locator('#warehouse-connection:visible').waitFor();
   // Playwright WebKit 2359 blocks SW navigation before dispatch when setOffline is true.
   // Test the actual network failure instead: https://github.com/microsoft/playwright/issues/42775
   if(type===webkit){await context.setOffline(false);dropNavigation=true;}
   const offline=await page.goto(origin+entry,{waitUntil:'domcontentloaded'});
   assert.equal(offline.status(),200);assert.equal(await page.locator('h1').textContent(),'Connessione assente');
   assert.equal(await page.locator('#root').count(),0);
   assert.equal(await page.locator('img[alt="LG Trading"]').evaluate(i=>i.complete&&i.naturalWidth===180),true);
   revision=3;dropNavigation=false;
   if(type===webkit)await page.getByRole('button',{name:'Riprova'}).click();
   else await context.setOffline(false);
   await page.waitForFunction(()=>document.querySelector('#root')?.dataset.revision==='3');
   assert.deepEqual(errors,[]);
   results.push({browser:type.name(),scope:prefix,otherAppPreserved:true,privateDataNotCached:true,offlineFallback:200,onlineRecovery:true,networkFailure:type===webkit?'origin connection closed':'browser offline'});
   await context.close();
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
console.log(JSON.stringify({result:'passed',liveApiCalls:0,serviceWorkers:results}));
