// Headless layout test: every request is intercepted; no signed-in browser or live API.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=JSON.parse(await readFile(process.env.ILP_FIXTURE,'utf8')).result;
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
let bundle=await readFile(root+'/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';
assert.equal(bundle.split(mount).length,2);
bundle=bundle.replace(mount,'(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Sl,{now:Date.now(),ilpUser:{getIdToken:async()=>"fixture-token"},onRefresh:()=>{},onExit:()=>{}}));');
const browser=await chromium.launch({headless:true,channel:'chrome'});
const results=[];
try {
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[390,844]]) {
  const page=await browser.newPage({viewport:{width,height}});let requests=0;const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/v1/control-center/ilovepaghe'){
    assert.equal(route.request().method(),'GET');requests++;
    return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(fixture)});
   }
   if(url.origin!==origin)return route.fulfill({status:404,body:''});
   const name=resolve(root,'.'+url.pathname);assert.ok(name.startsWith(root+'/'));
   try {
    const body=name.endsWith('warehouse-DAXf6-td.js')?bundle:await readFile(name);
    const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'}[extname(name)]||'application/octet-stream';
    await route.fulfill({status:200,contentType:type,body});
   }catch{await route.fulfill({status:404,body:''});}
  });
  await page.goto(origin+'/minimal-originale/capannone_3d.html');
  await page.locator('.ilp-cockpit tbody tr').first().waitFor();
  assert.equal(await page.locator('.ilp-cockpit tbody tr').count(),fixture.companies.length);
  assert.equal(await page.locator('.ilp-kpis strong').nth(1).textContent(),String(fixture.totalEmployees));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  const layout=await page.evaluate(()=>{
   const c=document.querySelector('.ilp-cockpit').getBoundingClientRect(),f=document.querySelector('.ilp-footer').getBoundingClientRect();
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cardHeight:c.height,footerInside:f.bottom<=c.bottom+1,columns:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns};
  });
  assert.ok(layout.scrollWidth<=width+1,JSON.stringify(layout));assert.ok(layout.footerInside,JSON.stringify(layout));assert.equal(requests,1);assert.deepEqual(errors,[]);
  results.push({width,height,...layout,requests});await page.close();
 }
}finally{await browser.close();}
console.log(JSON.stringify({result:'passed',headless:true,liveApiCalls:0,viewports:results}));
