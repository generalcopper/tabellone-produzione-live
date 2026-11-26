// Compare the complete dashboard against the exact pre-service-label layout; all APIs are fixtures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {restoreServiceMonitorBundle} from './warehouse-service-monitors-compat.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com',before='a3f31f425633836dff12cfec5a32c74c21339f37';
const file='/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js';
const previous=execFileSync('git',['show',before+':public'+file],{encoding:'utf8'}),current=await readFile(root+file,'utf8');
assert.equal(restoreServiceMonitorBundle(current),previous,'All prior application code and grid structure must be restored byte for byte');
const priorHtml=execFileSync('git',['show',before+':public/minimal-originale/capannone_3d.html'],{encoding:'utf8'});
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';
const now=Date.now(),iso=new Date(now).toISOString(),expiry=new Date(now+900000).toISOString(),day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const payroll={version:1,state:'ok',date:day,generatedAt:iso,expiresAt:expiry,activeCompanies:20,activeAccounts:20,sentToday:0,recipientsToday:0,todayCompanies:[],companies:Array.from({length:20},(_,i)=>({id:'test-'+i,name:'Azienda collaudo '+(i+1),employees:100-i})),userPlatforms:{state:'ok',android:55,ios:28,web:86,unknown:97,total:266,excludedDemo:2}};
const check=(id,state='ok')=>({id,label:id,state,checkedAt:iso,detail:'Parametro di collaudo'});
const data={version:1,generatedAt:iso,sha256:'f'.repeat(64),refreshSeconds:60,sections:[],services:['Amazon','Bionee','Cedoly','iLovePaghe','LG Trading','Picking','Commander','Shopify','Instagram'].map((name,i)=>({id:name.toLowerCase().replace(/ /g,''),glyph:name[0],name,state:'ok',checkedAt:iso,expiresAt:expiry,checks:[check('API'),check('connessione')]})),activity:{visits:[],volumes:[]},inventory:null};
for(const s of data.services){ const labels={picking:['NUC · WhatsApp Picking','NUC · voce capannone'],bionee:['Folia · generatore locale'],lgtrading:['Centralino · Asterisk','Centralino · linea','Centralino · telefoni']}[s.id]??[];s.checks.push(...labels.map(label=>check(label)));}
const security={state:'ok',generatedAt:iso,expiresAt:expiry,coverage:'Controlli verificati',devices:['PC Windows','PC BRT','Mac mini','MacBook'].map((name,i)=>({id:'device-'+i,name,state:'ok',observedAt:iso,expiresAt:expiry,checks:['firewall','wazuh-agent','antivirus','backup','aggiornamenti','disco','accessi','rete'].map(id=>check(id))})),checks:[check('wazuh-server'),check('backup-server')],wazuh:{connected:4,total:4,expiresAt:expiry},notifications:{state:'ok',checkedAt:iso}};
const underground={version:1,project:'underground-studio-dev-2026',generatedAt:iso,expiresAt:expiry,requestedMonth:'2026-11',checks:[],metrics:[],activity:[],monthly:{metrics:[]},github:null};
const browser=await chromium.launch({headless:true,channel:'chrome'});let comparisons=0;
try{
 for(const [width,height] of [[390,844],[1440,900],[1920,1080],[3440,1440],[5120,1440]])for(const colorScheme of ['light','dark'])for(const state of ['normal','alerts']){
  const snapshot=structuredClone(data),sec=structuredClone(security);
  if(state==='alerts'){sec.state='down';for(const d of sec.devices){d.state='down';d.checks[0].state='down';d.checks[1].state='warn';}for(const s of snapshot.services.filter(s=>['bionee','lgtrading','picking'].includes(s.id))){s.state='down';s.checks[0].state='down';s.checks.at(-1).state='warn';}}
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
   const boxes=await page.evaluate(()=>[...document.querySelectorAll('.topbar,.hero,main.grid,.zone,.zone-label,.zone-body,.card,.card-head,.card-meta,.card-foot,.ilp-kpis,.ilp-list,.subhead,.service-grid,.service-issues,.service-tile,.service-row,.footer')].map(el=>{const r=el.getBoundingClientRect();return {class:el.className,x:r.x,y:r.y,w:r.width,h:r.height};}));measured.push(boxes);
   assert.equal(await page.locator('main.grid > .zone').count(),5);
   assert.equal(await page.locator('.zone-underground').count(),0);
   if(mode==='after'){
    assert.equal(await page.locator('.wsm-tag').count(),4);
    assert.deepEqual(await page.locator('.wsm-tag').allTextContents(), ['Folia','VoIP','WA','Voce']);
    for(const [name,groups] of [['Picking',['WhatsApp','Voce NUC']],['Bionee',['Folia locale']],['LG Trading',['Centralino VoIP']]]){
     const button=page.locator('.service-tile,.service-row').filter({has:page.locator('.wsm-name',{hasText:name})});
     await button.focus();await page.keyboard.press('Enter');
     const dialog=page.locator('.wsm-dialog[open]');await dialog.waitFor();
     assert.equal(await dialog.locator('h2').innerText(),name);
     assert.deepEqual(await dialog.locator('.wsm-group h3').allTextContents(),groups);
     const states=await dialog.locator('.wsm-group .wsm-state').allTextContents();
     assert.ok(states.includes(state==='alerts'?'Attenzione':'Operativo'));
     assert.equal(await dialog.locator('.wsm-group small').count(),name==='LG Trading'?3:groups.length);
     assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Modal horizontal overflow');
     await page.keyboard.press('Escape');assert.equal(await page.locator('.wsm-dialog[open]').count(),0);
     assert.ok(await button.evaluate(el=>el===document.activeElement),'Keyboard focus must return to same service');
    }
    if(width===1920&&colorScheme==='dark'&&state==='normal')await page.screenshot({path:'/tmp/warehouse-service-monitors-ui.png',fullPage:true});
    assert.deepEqual(errors,[]);
   }
   await page.close();
  }
  assert.equal(measured[0].length,measured[1].length);
  measured[0].forEach((before,i)=>{const after=measured[1][i];assert.equal(before.class,after.class);for(const k of ['x','y','w','h'])assert.ok(Math.abs(before[k]-after[k])<.05,JSON.stringify({width,height,colorScheme,state,node:before.class,field:k,before:before[k],after:after[k]}));});comparisons++;
 }
}finally{await browser.close();}
console.log(JSON.stringify({passed:true,comparisons,originalZones:5,extraZones:0,priorElementGeometry:'identical',ultrawide:true,serviceTiles:'identical geometry',newMonitors:4,dialogs:'keyboard, freshness states, responsive, focus restore',liveCalls:0}));
