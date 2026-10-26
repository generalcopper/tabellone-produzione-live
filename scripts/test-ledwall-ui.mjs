import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
const registry=JSON.parse(await readFile(process.env.LEDWALL_REGISTRY,'utf8'));
const now=Date.now(),iso=new Date(now).toISOString();
const walls=registry.walls.map(w=>({...w,aperture:2,today:0,outside:1,tests:1,lastAt:null,status:'Programmata'}));
const event=(i,w=walls[0])=>({id:String(now-i).padStart(13,'0')+'_'+'a'.repeat(31)+(i%10),at:iso,wallId:w.id,qrId:w.qrId,kind:i===0?'test':'outside',device:'iOS',hash:'c'.repeat(64),verified:true});
const snapshot={version:1,state:'ok',generatedAt:iso,walls,totals:{aperture:12,today:0,outside:6,tests:6},events:[event(0),event(1,walls[1])],nextCursor:event(1,walls[1]).id,daily:[],definition:'Aperture dei collegamenti QR, non persone uniche.'};
let bundle=await readFile(root+'/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';assert.equal(bundle.split(mount).length,2);
bundle=bundle.replace(mount,'const Test=__createILPCockpit(l);(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Test,{user:{getIdToken:async()=>"fixture-token"},now:Date.now()}));');
const browser=await chromium.launch({headless:true,channel:'chrome'});const results=[];
try{
 for(const width of [390,1440,1920]){for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:900},serviceWorkers:'block'});const errors=[];let ledReads=0,payrollReads=0,fail=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/v1/control-center/ledwall'){
    assert.equal(route.request().headers().authorization,'Bearer fixture-token');ledReads++;
    return route.fulfill({status:fail?503:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(url.searchParams.has('cursor')?{...snapshot,events:[event(2)],nextCursor:null}:snapshot)});
   }
   if(url.pathname==='/v1/control-center/ilovepaghe'){
    payrollReads++;return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify({version:1,state:'ok',generatedAt:iso,expiresAt:new Date(now+900000).toISOString(),date:iso.slice(0,10),activeCompanies:1,activeAccounts:1,companies:[{id:'a',name:'Azienda test',employees:4}],todayCompanies:[],sentToday:0,recipientsToday:0,userPlatforms:{state:'ok',android:1,ios:2,web:1}})});
   }
   if(url.origin!==origin)return route.fulfill({status:404,body:''});
   const path=resolve(root,'.'+url.pathname);assert.ok(path.startsWith(root+'/'));
   try{return route.fulfill({status:200,contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'}[extname(path)]||'application/octet-stream',body:path.endsWith('warehouse-DAXf6-td.js')?bundle:await readFile(path)});}catch{return route.fulfill({status:404,body:''});}
  });
  await page.goto(origin+'/minimal-originale/capannone_3d.html');await page.getByRole('button',{name:'Monitoraggio LED wall',exact:true}).waitFor();
  assert.equal(ledReads,0,'QR data must not be polled before opening');
  const before=await page.locator('.ilp-cockpit').boundingBox();
  await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);await page.getByRole('button',{name:'Monitoraggio LED wall',exact:true}).click();await page.locator('.ilp-ledwall-dialog .ledwall-kpis').waitFor();
  assert.equal(ledReads,1);assert.equal(payrollReads,1);assert.deepEqual(await page.locator('.ledwall-kpis strong').allTextContents(),['12','0','6','6']);
  assert.equal(await page.locator('.ilp-ledwall-dialog>.table-scroll').first().locator('tbody tr').count(),6);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.locator('.ledwall-controls select').first().selectOption(walls[0].id);
  assert.equal(await page.locator('.ilp-ledwall-dialog>.table-scroll').first().locator('tbody tr').count(),1);
  await page.getByRole('button',{name:'Carica aperture precedenti'}).click();await page.waitForFunction(()=>!document.querySelector('.ledwall-more'));
  assert.equal(ledReads,2);assert.equal(await page.locator('.ilp-ledwall-dialog>.table-scroll').nth(1).locator('tbody tr').count(),2);
  await page.locator('.ledwall-proof summary').first().click();assert.ok((await page.locator('.ledwall-proof').first().textContent()).includes(walls[0].assetSha256));
  await page.screenshot({path:'/tmp/ledwall-monitor-'+width+'-'+theme+'.png'});
  fail=true;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.locator('.ledwall-warning').waitFor();
  assert.deepEqual(await page.locator('.ledwall-kpis strong').allTextContents(),['12','0','6','6']);
  await page.getByRole('button',{name:'Chiudi monitoraggio LED wall'}).click();assert.equal(await page.locator('dialog[open]').count(),0);
  const after=await page.locator('.ilp-cockpit').boundingBox();assert.ok(Math.abs(after.width-before.width)<.5&&Math.abs(after.height-before.height)<.5,'Card dimensions must remain unchanged');
  const stopped=ledReads;await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));assert.equal(ledReads,stopped);assert.equal(payrollReads,1);assert.deepEqual(errors,[]);
  results.push({width,theme,ledReads,payrollReads,cardUnchanged:true});await page.close();
 }}
}finally{await browser.close();}
console.log(JSON.stringify({passed:true,liveCalls:0,results}));
