// Headless checks: every request is intercepted; no live API or signed-in browser.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const original=JSON.parse(await readFile(process.env.ILP_FIXTURE,'utf8')).result;
const root=resolve('public'),origin='https://tabellone-produzione-liv-e313e.firebaseapp.com';
const now=Date.now(),iso=d=>new Date(now+d).toISOString();
const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const fixture={...original,date:day,generatedAt:iso(-1000),expiresAt:iso(900000)};
const employeeCount=fixture.companies.reduce((n,c)=>n+c.employees,0);
const check=(id,state='ok')=>({id,label:id,state,detail:'Verifica del parametro completata'});
const security={state:'ok',generatedAt:iso(-1000),expiresAt:iso(900000),coverage:'Controlli verificati',
  devices:['PC Windows','PC BRT','Mac mini','MacBook'].map((name,i)=>({id:'device-'+i,name,state:'ok',observedAt:iso(-1000),expiresAt:iso(900000),checks:['firewall','wazuh-agent','antivirus','backup','aggiornamenti','disco','accessi','rete'].map(id=>check(id))})),
  checks:[check('wazuh-server'),check('backup-server')],wazuh:{connected:4,total:4,expiresAt:iso(900000)},
  notifications:{state:'ok',recipient:'info@lgtrading.it',checkedAt:iso(-1000)}};
const data={generatedAt:iso(-1000),sha256:'f'.repeat(64),refreshSeconds:60,sections:[],
  services:['Amazon','Bionee','Cedoly','iLovePaghe','LG Trading','Picking','Commander','Shopify','Instagram'].map((name,i)=>({id:name.toLowerCase().replace(/ /g,''),glyph:name[0],name,state:'ok',checkedAt:iso(-1000),expiresAt:iso(900000),checks:[check('API'),check('connessione')]})),
  activity:{visits:[],volumes:[{id:'amazon',label:'Articoli Amazon',unit:'pz',value:185,state:'ok',date:day,checkedAt:iso(-1000),expiresAt:iso(900000)},{id:'bionee',label:'Ordini Bionee',unit:'ordini',value:34,state:'ok',date:day,checkedAt:iso(-1000),expiresAt:iso(900000)}]},inventory:null};
let bundle=await readFile(root+'/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
const mount='(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(Tl,{}));';
assert.equal(bundle.split(mount).length,2);
bundle=bundle.replace(mount,'var __fixtureUser={getIdToken:async()=>"fixture-token"};function __Fixture(){const[n,s]=l.useState('+now+');window.__testTime=s;return(0,H.jsx)(Sl,{...window.__fixture,now:n,ilpUser:__fixtureUser,onRefresh:()=>{},onExit:()=>{}})};(0,u.createRoot)(document.getElementById(`root`)).render((0,H.jsx)(__Fixture,{}));');
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try {
 for(const scenario of ['normal','alerts','stale','error']) {
  const sec=structuredClone(security),snapshot=structuredClone(data);
  if(scenario==='alerts'){
   sec.state='down';
   for(const d of sec.devices){d.state='down';d.checks[0].state='down';d.checks[1].state='warn';}
   for(const s of snapshot.services.slice(0,4)){s.state='down';s.checks[0].state='down';}
  }
  if(scenario==='stale'){
   sec.expiresAt=iso(-1);sec.wazuh.expiresAt=iso(-1);
   for(const d of sec.devices)d.expiresAt=iso(-1);
   for(const s of snapshot.services)s.expiresAt=iso(-1);
  }
  const viewports=scenario==='normal'?[[1100,760],[1440,900],[1920,1080],[3840,2160],[1024,1366],[390,844]]:[[1100,760],[1440,900],[1920,1080]];
  for(const [width,height] of viewports){
   const page=await browser.newPage({viewport:{width,height}});let requests=0;const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(props=>{window.__fixture=props;},{data:snapshot,security:scenario==='error'?null:sec,securityError:scenario==='error'});
   await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/v1/control-center/ilovepaghe'){
     assert.equal(route.request().method(),'GET');
     assert.equal(route.request().headers().authorization,'Bearer fixture-token');requests++;
     return route.fulfill({status:scenario==='error'?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({...fixture,...scenario==='stale'?{expiresAt:iso(-1)}:{}})});
    }
    if(url.origin!==origin)return route.fulfill({status:404,body:''});
    const name=resolve(root,'.'+url.pathname);assert.ok(name.startsWith(root+'/'));
    try {
     const body=name.endsWith('warehouse-DAXf6-td.js')?bundle:await readFile(name);
     const type={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.ico':'image/x-icon'}[extname(name)]||'application/octet-stream';
     await route.fulfill({status:200,contentType:type,body});
    }catch{await route.fulfill({status:404,body:''});}
   });
   await page.goto(origin+'/minimal-originale/capannone_3d.html');
   await page.waitForFunction(()=>{const t=document.querySelector('.ilp-cockpit .state')?.textContent;return t&&t!=='Collegamento…';});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(()=>document.querySelector('.shell'));
   if(scenario!=='error')assert.equal(await page.locator('.ilp-kpis strong').nth(1).textContent(),String(employeeCount));
   else assert.equal(await page.locator('.ilp-kpis strong').nth(1).textContent(),'—');
   assert.equal(await page.getByText(/dipendenti con azienda da associare/).count(),0);
   assert.equal(await page.locator('.zone-business .volumes').count(),1);
   assert.equal(await page.locator('.zone-activity .volumes').count(),0);
   if(scenario==='stale'){
    assert.equal(await page.locator('.service-tile.tone-unknown').count(),snapshot.services.length);
    assert.equal(await page.locator('.service-tile.tone-ok').count(),0);
    assert.match(await page.locator('.ilp-cockpit .state').textContent(),/Da aggiornare/);
   }
   if(scenario==='alerts')assert.equal(await page.locator('.sec-issue.tone-down').count(),4);
   for(const theme of ['light','dark']){
    await page.evaluate(t=>{document.documentElement.dataset.theme=t},theme);
    const layout=await page.evaluate(()=>{
     const card=document.querySelector('.ilp-cockpit'),c=card.getBoundingClientRect();
     const fit=matchMedia('(min-width:1100px) and (min-height:760px) and (min-aspect-ratio:5/4)').matches;
     const out=[...document.querySelectorAll('.card')].filter(e=>e.getBoundingClientRect().bottom>innerHeight+1).map(e=>e.className);
     const kpis=[...card.querySelectorAll('.ilp-kpis strong')].map(e=>e.getBoundingClientRect());
     const button=card.querySelector('button[aria-label="Tutte le aziende e gli invii di oggi"]');
     return {fit,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,cardHeight:c.height,cardClass:card.className,out,kpisInside:kpis.every(r=>r.top>=c.top&&r.bottom<=c.bottom+1),detailsVisible:!!button&&button.getBoundingClientRect().height>0,columns:getComputedStyle(document.querySelector('.grid')).gridTemplateColumns};
    });
    assert.ok(layout.scrollWidth<=width+1,JSON.stringify({scenario,width,height,...layout}));
    if(layout.fit){assert.ok(layout.scrollHeight<=height+1,JSON.stringify({scenario,width,height,...layout}));assert.deepEqual(layout.out,[]);assert.ok(layout.kpisInside,JSON.stringify({scenario,width,height,...layout}));}
    results.push({scenario,theme,width,height,...layout});
   }
   const details=page.getByRole('button',{name:'Tutte le aziende e gli invii di oggi'});
   if(scenario!=='error')assert.ok(await details.isVisible(),'Full company table must remain accessible');
   if(scenario!=='error'&&await details.isVisible()){
    await details.click();await page.locator('.ilp-dialog[open]').waitFor();
    assert.ok(await page.locator('.ilp-dialog tbody tr').count()>=fixture.companies.length);
    assert.match(await page.locator('.ilp-dialog').textContent(),/Cedolini oggi.*Destinatari oggi/s);
    const first=page.locator('.ilp-dialog tbody tr').first();assert.match(await first.textContent(),new RegExp(fixture.companies[0].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    await page.getByRole('button',{name:'Chiudi',exact:true}).click();
   }
   // Rotating the display and tab visibility must not make another Firebase request.
   await page.evaluate(t=>{window.__testTime(t+13000);document.dispatchEvent(new Event('visibilitychange'));},now);
   assert.equal(requests,1);assert.deepEqual(errors,[]);
   if(scenario==='normal'&&width===1920){
    await page.evaluate(t=>window.__testTime(t+86400000),now);
    await page.waitForFunction(()=>document.querySelector('.ilp-kpi-today strong')?.textContent==='—');
    assert.equal(await page.locator('.ilp-row.is-sent').count(),0);
    assert.equal(requests,1);
   }
   await page.close();
  }
 }
}finally{await browser.close();}
console.log(JSON.stringify({result:'passed',headless:true,liveApiCalls:0,employeeCount,viewports:results}));
