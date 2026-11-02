// Compare the complete dashboard against the exact pre-Underground layout; all APIs are fixtures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {restoreUndergroundBundle} from './warehouse-underground-compat.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com',before='1f0b572';
const file='/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js';
const previous=execFileSync('git',['show',before+':public'+file],{encoding:'utf8'}),current=await readFile(root+file,'utf8');
assert.equal(restoreUndergroundBundle(current),previous,'All prior application code and grid structure must be restored byte for byte');
const priorHtml=execFileSync('git',['show',before+':public/minimal-originale/capannone_3d.html'],{encoding:'utf8'});
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';
const now=Date.now(),iso=new Date(now).toISOString(),expiry=new Date(now+900000).toISOString(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const payroll={version:1,state:'ok',date:day,generatedAt:iso,expiresAt:expiry,activeCompanies:20,activeAccounts:20,sentToday:0,recipientsToday:0,todayCompanies:[],companies:Array.from({length:20},(_,i)=>({id:'test-'+i,name:'Azienda collaudo '+(i+1),employees:100-i})),userPlatforms:{state:'ok',android:55,ios:28,web:86,unknown:97,total:266,excludedDemo:2}};
const check=(id,state='ok')=>({id,label:id,state,detail:'Parametro di collaudo'});
const data={version:1,generatedAt:iso,sha256:'f'.repeat(64),refreshSeconds:60,sections:[],services:['Amazon','Bionee','Cedoly','iLovePaghe','LG Trading','Picking','Commander','Shopify','Instagram'].map((name,i)=>({id:name.toLowerCase().replace(/ /g,''),glyph:name[0],name,state:'ok',checkedAt:iso,expiresAt:expiry,checks:[check('API'),check('connessione')]})),activity:{visits:[],volumes:[]},inventory:null};
const security={state:'ok',generatedAt:iso,expiresAt:expiry,coverage:'Controlli verificati',devices:['PC Windows','PC BRT','Mac mini','MacBook'].map((name,i)=>({id:'device-'+i,name,state:'ok',observedAt:iso,expiresAt:expiry,checks:['firewall','wazuh-agent','antivirus','backup','aggiornamenti','disco','accessi','rete'].map(id=>check(id))})),checks:[check('wazuh-server'),check('backup-server')],wazuh:{connected:4,total:4,expiresAt:expiry},notifications:{state:'ok',checkedAt:iso}};
const underground={version:1,project:'underground-studio-dev-2026',generatedAt:iso,expiresAt:expiry,requestedMonth:'2026-11',checks:[],metrics:[],activity:[],monthly:{metrics:[]},github:null};
const browser=await chromium.launch({headless:true,channel:'chrome'});let comparisons=0;
try{
 for(const [width,height] of [[390,844],[1440,900],[1920,1080],[3440,1440],[5120,1440]])for(const colorScheme of ['light','dark'])for(const state of ['normal','alerts']){
  const snapshot=structuredClone(data),sec=structuredClone(security);
  if(state==='alerts'){sec.state='down';for(const d of sec.devices){d.state='down';d.checks[0].state='down';d.checks[1].state='warn';}for(const s of snapshot.services.slice(0,4)){s.state='down';s.checks[0].state='down';}}
  const measured=[];
  for(const mode of ['before','after']){
   const page=await browser.newPage({viewport:{width,height},colorScheme,serviceWorkers:'block'}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(({snapshot,sec,now})=>{window.__layoutFixture={data:snapshot,security:sec,now};},{snapshot,sec,now});
   const source=(mode==='before'?previous:current).replace(mount,'var __fixtureUser={getIdToken:async()=>"fixture-token"};(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Sl,{...window.__layoutFixture,ilpUser:__fixtureUser,onRefresh:()=>{},onExit:()=>{}}));');
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/v1/control-center/ilovepaghe'||url.pathname==='/v1/control-center/underground')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*'},contentType:'application/json',body:JSON.stringify(url.pathname.endsWith('/underground')?underground:payroll)});
    if(url.origin!==origin)return route.fulfill({status:404,body:''});
    const path=resolve(root,'.'+url.pathname);assert.ok(path.startsWith(root+'/'));
    try{return route.fulfill({status:200,contentType:{'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png'}[extname(path)]||'application/octet-stream',body:url.pathname===file?source:mode==='before'&&url.pathname.endsWith('/capannone_3d.html')?priorHtml:await readFile(path)});}catch{return route.fulfill({status:404,body:''});}
   });
   await page.goto(origin+'/minimal-originale/capannone_3d.html');
   await page.addStyleTag({content:'*,*:before,*:after{animation:none!important;transition:none!important}'});
   await page.locator('.ilp-platform-kpis').waitFor({state:'attached'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   assert.deepEqual(errors,[]);
   const boxes=await page.evaluate(()=>[...document.querySelectorAll('.topbar,.hero,main.grid,.zone,.zone-label,.zone-body,.card,.card-head,.card-meta,.card-foot,.ilp-kpis,.ilp-list,.subhead,.service-grid,.service-issues,.footer')].map(el=>{const r=el.getBoundingClientRect();return {class:el.className,x:r.x,y:r.y,w:r.width,h:r.height};}));measured.push(boxes);
   assert.equal(await page.locator('main.grid > .zone').count(),5);
   assert.equal(await page.locator('.zone-underground').count(),0);
   if(mode==='after'){
    const button=page.getByRole('button',{name:'Monitoraggio Underground studio'});assert.equal(await page.locator('.zone-ilovepaghe .ug-launch').count(),1);
    const bounds=await button.boundingBox(),zone=await page.locator('.zone-ilovepaghe').boundingBox(),card=await page.locator('.ilp-cockpit').boundingBox();assert.ok(bounds&&zone&&card);assert.ok(bounds.x>=zone.x&&bounds.x+bounds.width<=zone.x+zone.width+1);assert.ok(bounds.y+bounds.height<=card.y+1,'Button must not cover the existing card');
    await button.click();await page.locator('.ug-dialog[open]').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('.ug-dialog[open]').count(),0);
   }
   await page.close();
  }
  assert.equal(measured[0].length,measured[1].length);
  measured[0].forEach((before,i)=>{const after=measured[1][i];assert.equal(before.class,after.class);for(const k of ['x','y','w','h'])assert.ok(Math.abs(before[k]-after[k])<.05,JSON.stringify({width,height,colorScheme,state,node:before.class,field:k,before:before[k],after:after[k]}));});comparisons++;
 }
}finally{await browser.close();}
console.log(JSON.stringify({passed:true,comparisons,originalZones:5,extraZones:0,priorElementGeometry:'identical',ultrawide:true,buttonInsideILovePaghe:true,liveCalls:0}));
