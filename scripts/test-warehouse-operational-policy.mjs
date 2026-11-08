import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {monitoredServices} from '../public/minimal-originale/warehouse-assets/warehouse-service-alerts.js';
import {serviceDisplayState} from '../public/minimal-originale/warehouse-assets/warehouse-operational-policy.js';
import {restoreOperationalPolicy,OPERATIONAL_BASELINE} from './warehouse-operational-compat.mjs';
import {createHash} from 'node:crypto';
const bundle=await readFile('public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js','utf8');
const restored=restoreOperationalPolicy(bundle);
assert.equal(createHash('sha256').update(restored).digest('hex'),OPERATIONAL_BASELINE);
assert.throws(()=>restoreOperationalPolicy(bundle.replace('Sicurezza aziendale','Altered')));
const times=[
 ['2026-11-06T22:59:59Z',false],['2026-11-06T23:00:00Z',true],
 ['2026-11-08T22:59:59Z',true],['2026-11-08T23:00:00Z',false],
 ['2026-07-03T21:59:59Z',false],['2026-07-03T22:00:00Z',true],
 ['2026-07-05T21:59:59Z',true],['2026-07-05T22:00:00Z',false],
 ['2026-10-25T00:30:00Z',true],['2026-10-25T01:30:00Z',true]
];
let cases=0;
for(const [time,paused]of times)for(const state of ['unknown','warn','down']){
 assert.equal(serviceDisplayState({id:'node-k7'},state,Date.parse(time)),paused?'paused':state);cases++;
}
for(const id of ['brt','node-m4','security','forex','picking'])for(const state of ['ok','warn','down','unknown']){
 assert.equal(serviceDisplayState({id},state,Date.parse('2026-11-08T12:00:00Z')),state);cases++;
}
assert.equal(serviceDisplayState({id:'node-k7'},'ok',Date.parse('2026-11-08T12:00:00Z')),'ok');
assert.equal(serviceDisplayState({id:'node-k7'},'down',NaN),'down');
const context={
 __serviceDisplayState:serviceDisplayState,__monitoredServices:monitoredServices,
 Io:Date.parse,Lo:(at,until,now)=>Number.isFinite(Date.parse(at))&&Date.parse(at)<=now+30000&&Date.parse(until)>now,
 Po:now=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome'}).format(now),Fo:()=> '2026-11',
 bs:[],ys:[],qs:(s,error)=>error?'unknown':s?.state??'ok',
 Fs:()=>({combined:null}),V:String,Os:()=> 'righe',gs:String
};
const prefix=bundle.indexOf('var Is=15e3'),end=bundle.indexOf('var tc=80',prefix);
assert.ok(prefix>=0&&end>prefix);
const actual=vm.runInNewContext(bundle.slice(prefix,end)+';({overview:ec,status:Zs,power:zs,labels:Ys})',context);
const weekend=Date.parse('2026-11-08T12:00:00Z'),monday=Date.parse('2026-11-09T08:00:00Z');
const makeService=(id,state,now)=>Object.freeze({id,name:id==='node-k7'?'Nodo K7':id==='brt'?'BRT':id,glyph:id,
 state,checkedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString(),
 checks:Object.freeze([Object.freeze({label:'Riscontro',state,detail:'Dato originale',checkedAt:new Date(now-1000).toISOString()})]),sha256:'a'.repeat(64)});
const makeInput=(now,watts=5000)=>({
 now,error:'',security:{state:'warn'},powerError:false,power:{state:'ok',contractWatts:15000,reading:{coverage:'site-total',observedAt:new Date(now).toISOString(),gridWatts:watts}},
 data:{generatedAt:new Date(now).toISOString(),services:Object.freeze([makeService('node-k7','down',now),makeService('brt','down',now),makeService('picking','ok',now)]),
 activity:{visits:[{state:'ok',date:context.Po(now),checkedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString(),value:2}]},
 inventory:{state:'ok',snapshot:{checkedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+60000).toISOString(),units:10}},sha256:'signed-source'},
 session:{flow:{write:{out:0},fbm:{out:0},fba:{out:0}}}
});
for(const watts of [-20000,0,11999,12000,14250,14999,15000,15001,20000]){
 const input=makeInput(weekend,watts),before=JSON.stringify(input),view=actual.overview(input);
 assert.equal(view.issues.some(i=>i.title==='Energia'),watts>15000);
 assert.equal(view.issues.some(i=>i.title==='Nodo K7'),false);
 assert.equal(view.issues.some(i=>i.title==='BRT'&&i.tone==='down'),true);
 assert.equal(view.issues.some(i=>i.title==='Sicurezza'&&i.tone==='warn'),true);
 assert.equal(view.totalChecks,2);assert.equal(view.passedChecks,1);assert.equal(view.goodServices,1);
 assert.equal(JSON.stringify(input),before);cases++;
}
for(const mode of ['absent','error','stale','invalid','future']){
 const input=makeInput(weekend,20000);
 if(mode==='absent')input.power=null;
 if(mode==='error')input.powerError=true;
 if(mode==='stale')input.power.reading.observedAt=new Date(weekend-30001).toISOString();
 if(mode==='invalid')input.power.reading.gridWatts=NaN;
 if(mode==='future')input.power.reading.observedAt=new Date(weekend+5001).toISOString();
 assert.equal(actual.overview(input).issues.some(i=>i.title==='Energia'),false);cases++;
}
const input=makeInput(monday);
assert.equal(actual.overview(input).issues.some(i=>i.title==='Nodo K7'&&i.tone==='down'),true);
assert.equal(actual.overview(input).totalChecks,3);
assert.equal(actual.status(makeService('node-k7','ok',weekend),weekend),'ok');
const stale=makeService('node-k7','ok',weekend-60001);
assert.equal(actual.status(stale,weekend),'paused');
assert.equal(actual.status(stale,monday),'unknown');
const element=(type,props)=>({type,props});
const renderContext={H:{jsx:element,jsxs:element},_c:'card',gc:'badge',yl:'glyph',hc:'changed',Zs:actual.status,Ys:actual.labels,z:String};
const start=bundle.indexOf('var bl={down:0,warn:1,unknown:2,paused:3');
const finish=bundle.indexOf('var AmazonFinanceDialog=',start);
const render=vm.runInNewContext(bundle.slice(start,finish)+';xl',renderContext);
const source=makeInput(weekend),clicks=[];
const card=render({services:source.data.services,now:weekend,onProof:x=>clicks.push(x),changed:{},good:1,checksLabel:'1/2 verifiche'});
const walk=node=>node&&typeof node==='object'?[node,...[node.props?.children].flat(Infinity).flatMap(walk)]:[];
const text=node=>node&&typeof node==='object'?[node.props?.children].flat(Infinity).map(text).join(''):String(node??'');
const tile=walk(card).find(n=>n.type==='button'&&n.props.title?.includes('Spento per il weekend'));
assert.ok(tile);assert.match(text(tile),/Pausa weekend/);assert.match(tile.props.className,/tone-unknown/);
tile.props.onClick();assert.equal(clicks[0].value,source.data.services[0]);assert.equal(clicks[0].value.state,'down');
assert.equal(walk(card).filter(n=>n.props?.className==='service-row tone-down').length,1);
const powerStart=bundle.indexOf('function zc({power:'),powerEnd=bundle.indexOf('function Bc(e,t)',powerStart);
const renderPower=vm.runInNewContext(bundle.slice(powerStart,powerEnd)+';zc',{
 ...renderContext,Hs:()=>15000,Vs:(p,error)=>!error&&p?.state==='ok'?p.reading:null,zs:actual.power,Ic:900000,
 Bs:()=>null,pc:'number',ps:String,Rc:'chart',mc:'proof'
});
for(const watts of [12000,14250,15000,15001]){
 const p=makeInput(weekend,watts);
 const card=renderPower({power:p.power,error:false,now:weekend,samples:[]});
 assert.equal(card.props.className,'energy energy-'+(watts>15000?'down':'ok'));cases++;
}
console.log(JSON.stringify({operationalPolicy:'passed',cases,weekendTimeZone:'Europe/Rome',
 weekdayFailures:'retained',energyThreshold:'strictly greater than 15000 W',missingReadings:'explicit but not open problems',
 securityAndBrt:'retained',sourceProofs:'same original objects',layout:'complete prior bundle restored exactly'}));

const sw=await readFile('public/minimal-originale/warehouse-sw.js','utf8');
const bundleHash=createHash('sha256').update(bundle).digest('hex');
assert.ok(sw.includes('lg-warehouse-static-'+bundleHash.slice(0,20)));
assert.ok(sw.includes('warehouse-DAXf6-td.js?v='+bundleHash));
assert.ok(sw.includes('warehouse-operational-policy.js?v='+createHash('sha256').update(await readFile('public/minimal-originale/warehouse-assets/warehouse-operational-policy.js')).digest('hex')));
