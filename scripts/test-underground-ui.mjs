import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {reportCSV} from '../public/minimal-originale/warehouse-assets/warehouse-underground.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
const now=Date.now(),at=new Date(now).toISOString();
const sample={version:1,project:'underground-studio-dev-2026',generatedAt:at,expiresAt:new Date(now+900000).toISOString(),requestedMonth:'2026-11',checks:[{label:'API',state:'ok',detail:'Servizio disponibile'}],metrics:[{id:'storage',value:1048576}],cloudCost:{amount:null,currency:'EUR',status:'pending',updatedAt:null},github:{repositoryKiB:30,artifactBytes:0,cacheBytes:1024,billing:{state:'permission_required',net:null}},monthly:{metrics:[{id:'storage',label:'Spazio cloud',value:1048576,unit:'byte',type:'storage',observedAt:at}]},sharedCosts:{postmark:{detail:'Condiviso',amount:null}},activity:[{id:'a',at,action:'admin_access',actor:'operatore@example.invalid',status:200}]};
const csv=reportCSV(sample);assert.ok(csv.includes('permission_required'));assert.ok(csv.includes('EUR'));assert.ok(csv.includes('USD'));assert.ok(!csv.includes('NaN'));
let bundle=await readFile(root+'/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';assert.equal(bundle.split(mount).length,2);
bundle=bundle.replace(mount,'const Test=__createUndergroundMonitor(l);(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Test,{user:{getIdToken:async()=>"fixture-token"},now:Date.now()}));');
const browser=await chromium.launch({headless:true,channel:'chrome'});let reads=0;
try{
 for(const width of [390,1440,1920])for(const colorScheme of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},colorScheme,serviceWorkers:'block'}),errors=[];let fail=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/v1/control-center/underground'){
    assert.equal(route.request().headers().authorization,'Bearer fixture-token');reads++;
    return route.fulfill({status:fail?503:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({...sample,requestedMonth:url.searchParams.get('month')||'2026-11'})});
   }
   if(url.origin!==origin)return route.fulfill({status:404,body:''});
   const path=resolve(root,'.'+url.pathname);assert.ok(path.startsWith(root+'/'));
   try{return route.fulfill({status:200,contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'}[extname(path)]||'application/octet-stream',body:path.endsWith('warehouse-DAXf6-td.js')?bundle:await readFile(path)});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto(origin+'/minimal-originale/capannone_3d.html');await page.locator('.ug-launch[title="Underground studio · Servizi operativi"]').waitFor();
  await page.locator('.ug-launch').click();await page.locator('dialog[open]').waitFor();
  assert.ok((await page.locator('.ug-dialog').innerText()).includes('Fatturazione da autorizzare'));
  assert.ok((await page.locator('.ug-dialog').innerText()).includes('Accesso amministratore'));
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Scarica riepilogo CSV'}).click();assert.equal((await download).suggestedFilename(),'UndergroundStudio-consumi.csv');
  await Promise.all([page.waitForResponse(r=>r.url().includes('month=2026-10')),page.locator('input[type=month]').fill('2026-10')]);
  fail=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('alert').waitFor();
  assert.ok((await page.getByRole('alert').innerText()).includes('scaduta'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('button',{name:'Chiudi',exact:true}).click();assert.equal(await page.locator('dialog[open]').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify({passed:true,viewports:3,themes:2,authenticatedReads:reads,liveCalls:0,csvCurrenciesSeparated:true,staleRetained:true}));
