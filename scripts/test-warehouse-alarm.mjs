import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {alarmView,prepareCommand,createAlarmControl,historyLabel} from '../public/minimal-originale/warehouse-assets/warehouse-alarm.js';
import {restoreAlarmBundle,ALARM_BASELINE} from './warehouse-alarm-compat.mjs';
import {securityDetails} from '../public/minimal-originale/warehouse-assets/warehouse-wazuh-security.js';
const now=Date.now(),at=n=>new Date(now+n).toISOString(),id='f49cc7ca-3d57-4c61-8647-927a9b362534';
const data={version:1,source:'local',enabled:true,fresh:true,controlsEnabled:true,observedAt:at(-1000),expiresAt:at(44000),metrics:{connected:true,mode:'home',alarm:'normal',battery:100,charging:true,sim:'sim_card_no',tamper:null},history:[]};
assert.equal(alarmView(data,false,now).label,'Inserito parziale');
assert.equal(alarmView(data,false,now).canControl,true);
assert.equal(alarmView({...data,metrics:{...data.metrics,alarm:'alarm'}},false,now).label,'ALLARME IN CORSO');
assert.equal(alarmView({...data,metrics:{...data.metrics,tamper:true}},false,now).active,true);
assert.equal(alarmView({...data,metrics:{...data.metrics,mode:'disarmed'}},false,now).tone,'warn');
for(const d of [{...data,fresh:false},{...data,enabled:false},{...data,source:'cloud'},{...data,version:2},{...data,expiresAt:at(-1)},{...data,observedAt:at(6000)},{...data,observedAt:at(-46000)},{...data,metrics:{connected:false}}]){
 assert.equal(alarmView(d,false,now).fresh,false);assert.equal(alarmView(d,false,now).canControl,false);assert.throws(()=>prepareCommand(d,'arm',now,id));
}
assert.equal(alarmView(data,true,now).canControl,false);
for(const mode of [null,'unknown'])assert.equal(alarmView({...data,metrics:{...data.metrics,mode}},false,now).canControl,false);
assert.equal(alarmView({...data,metrics:{...data.metrics,alarm:null}},false,now).canControl,false);
for(const status of ['pending','claimed']){
 const d={...data,command:{status,deadline:at(10000)}};assert.equal(alarmView(d,false,now).canControl,false);assert.throws(()=>prepareCommand(d,'arm',now,id));
}
assert.deepEqual(prepareCommand(data,'arm',now,id),{id,target:'arm',expectedMode:'home',observedAt:data.observedAt,confirmed:true});
for(const target of ['home','sos','tamper','__proto__'])assert.throws(()=>prepareCommand(data,target,now,id));
assert.throws(()=>prepareCommand({...data,controlsEnabled:false},'disarmed',now,id));
const bundle=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js',import.meta.url),'utf8');
assert.equal(createHash('sha256').update(restoreAlarmBundle(bundle)).digest('hex'),ALARM_BASELINE);
assert.throws(()=>restoreAlarmBundle(bundle.replace('Sicurezza aziendale','Broken')));
const start=bundle.indexOf('function ll({data:'),end=bundle.indexOf('function ul(',start);
const jsx=(type,props)=>({type,props}),user={getIdToken(){}};
const render=vm.runInNewContext(bundle.slice(start,end)+';ll',{AlarmControl:'alarm',Js:securityDetails,H:{jsx,jsxs:jsx},_c:'card',gc:'badge',Us:{ok:'Tutto OK'},__SR:'row',__SW:()=> 'ok',z:x=>x,xc:{arrow:'>'},mc:'proof',sl:''});
const card=render({data:{state:'ok',generatedAt:at(-1000),expiresAt:at(50000),devices:[],checks:[]},error:false,now,user});
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found;}return null;}
const hook=find(card,n=>n.type==='alarm');assert.ok(hook);assert.equal(hook.props.user,user);assert.equal(hook.props.now,now);assert.equal(card.props.className,'security');
const h=(type,props,...children)=>({type,props:{...props,children}});
const React={createElement:h,useState:initial=>[initial,()=>{}],useRef:initial=>({current:initial}),useEffect(){}};
const initial=createAlarmControl(React)({user,now});
assert.ok(find(initial,n=>n.type==='dialog'));
assert.ok(find(initial,n=>n.type==='button'&&n.props['aria-label']==='Gestisci allarme capannone'));
for(const button of find(initial,n=>n.props?.className==='alarm-actions').props.children)assert.equal(button.props.disabled,true);
const source=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-alarm.js',import.meta.url),'utf8');
assert.ok(!/localKey|clientSecret|dangerouslySetInnerHTML|localStorage/.test(source));
console.log(JSON.stringify({check:'warehouse_alarm',status:'passed',cases:'freshness, active alarm, guarded commands, unavailable data, identity handoff, disabled initial controls, exact approved-layout restoration'}));

assert.match(historyLabel({kind:'state',connected:true,mode:'home',alarm:'normal',tamper:true}),/MANOMISSIONE/);
assert.equal(historyLabel({kind:'state',connected:false,mode:null}),'Centralina non raggiungibile');
assert.match(historyLabel({kind:'command',mode:'arm',status:'confirmed'}),/Stato confermato/);
