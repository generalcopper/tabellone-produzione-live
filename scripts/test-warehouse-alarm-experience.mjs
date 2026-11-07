import assert from 'node:assert/strict';
import {alarmView,modeDescription,telephoneView,connectionMessage,prepareCommand,confirmationState,commandFeedback,mergeCommand,mergeReadSnapshot,requestAlarm,AlarmRequestError,createAlarmControl} from '../public/minimal-originale/warehouse-assets/warehouse-alarm.js';
const now=Date.now(),iso=t=>new Date(t).toISOString(),id='1b4bdcd7-19bc-4c2c-9b2a-90318f6cbb82';
const data={version:1,source:'local',enabled:true,fresh:true,controlsEnabled:true,observedAt:iso(now-1000),expiresAt:iso(now+44000),metrics:{connected:true,mode:'home',alarm:'normal',battery:100,charging:true,tamper:null,sim:'sim_card_no'},history:[],command:null};
const request=prepareCommand(data,'arm',now,id),command={id,target:'arm',expectedMode:'home',createdAt:iso(now),deadline:iso(now+45000),status:'pending',reason:null};
const snapshot=(overrides={})=>({...data,...overrides});
assert.match(alarmView(data,false,now).label,/Solo porte/);
assert.match(modeDescription(alarmView(data,false,now),data.metrics),/muoverti all’interno/);
assert.equal(alarmView(null,false,now).reason,'loading');
assert.equal(alarmView(data,'access',now).canControl,false);
assert.match(connectionMessage('access'),/sessione/);
for(const sim of ['sim_card_no','network_no','phone_no']){
 assert.equal(telephoneView(sim,true).label,'Non disponibile');
 assert.equal(telephoneView(sim,true).note,'Puoi gestire l’allarme da qui anche senza SIM.');
}
assert.equal(telephoneView('normal',false).label,'—');
assert.match(telephoneView('signal_level_4',true).detail,/4 su 5/);
assert.equal(confirmationState(data,request,false,now).valid,true);
assert.equal(confirmationState(snapshot({observedAt:iso(now+10000),expiresAt:iso(now+55000)}),request,false,now+10000).valid,true);
assert.equal(confirmationState(data,request,false,now+29000).valid,true);
assert.equal(confirmationState(data,request,false,now+29001).valid,false);
assert.equal(confirmationState(snapshot({metrics:{...data.metrics,mode:'disarmed'}}),request,false,now).valid,false);
assert.equal(confirmationState(data,request,true,now).valid,false);
assert.equal(confirmationState(snapshot({command}),request,false,now).valid,false);
assert.equal(commandFeedback(command,now).seconds,45);
assert.equal(commandFeedback(command,now+45000).status,'expired');
assert.equal(commandFeedback({...command,status:'claimed'},now+45000).status,'uncertain');
assert.equal(commandFeedback({...command,status:'confirmed'},now+50000).status,'confirmed');
assert.match(commandFeedback({...command,status:'confirmed'},now).text,/restituito la modalità/);
const confirmed={...command,status:'confirmed'};
assert.equal(mergeCommand(snapshot({command:confirmed}),command).command.status,'confirmed');
assert.equal(mergeCommand(snapshot({command:{...command,status:'claimed'}}),command).command.status,'claimed');
assert.equal(mergeCommand(data,command).command.id,id);
assert.equal(mergeReadSnapshot(data,data,{at:now+1,command},now).command.id,id);
assert.equal(mergeReadSnapshot(snapshot({command:confirmed}),data,{at:now+1,command},now).command.status,'confirmed');
assert.equal(mergeReadSnapshot(snapshot({command}),data,{at:now,command},now+1).command,null);
assert.equal(mergeReadSnapshot(data,snapshot({enabled:false}),{at:now+1,command},now).command,null);

const response=(value,status=200)=>({status,ok:status>=200&&status<300,json:async()=>value});
let calls=0,tokens=[];
const user={getIdToken:async force=>{tokens.push(force);return force?'renewed':'original';}};
let value=await requestAlarm(user,{fetchImpl:async(_url,options)=>{calls++;assert.equal(options.method,'GET');return calls===1?response({error:'expired'},401):response(data);}});
assert.equal(value,data);assert.equal(calls,2);assert.deepEqual(tokens,[false,true]);
calls=0;tokens=[];
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,fetchImpl:async()=>{calls++;return response({error:'expired'},401);}}),e=>e.status===401);
assert.equal(calls,1);assert.deepEqual(tokens,[false]);
calls=0;
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,fetchImpl:async()=>{calls++;throw new TypeError('connection lost');}}),/connection lost/);
assert.equal(calls,1);
calls=0;
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,fetchImpl:async()=>{calls++;return response({error:'unknown'},503);}}),e=>e.status===503);
assert.equal(calls,1);
calls=0;
await assert.rejects(()=>requestAlarm({getIdToken:()=>new Promise(()=>{})},{method:'POST',body:request,timeoutMs:25,fetchImpl:async()=>{calls++;return response(command);}}),e=>e.code==='timeout');
assert.equal(calls,0);
calls=0;let abortedSignal;
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,timeoutMs:25,fetchImpl:async(_url,options)=>{calls++;abortedSignal=options.signal;return {ok:true,status:202,json:()=>new Promise(()=>{})};}}),e=>e.code==='timeout');
assert.equal(calls,1);assert.equal(abortedSignal.aborted,true);
calls=0;
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,beforeSend:()=>{throw new AlarmRequestError('confirmation_changed');},fetchImpl:async()=>{calls++;return response(command);}}),e=>e.code==='confirmation_changed');
assert.equal(calls,0);
calls=0;
value=await requestAlarm(user,{method:'POST',body:request,fetchImpl:async(_url,options)=>{calls++;assert.deepEqual(JSON.parse(options.body),request);return response(command,202);}});
assert.equal(calls,1);assert.equal(value.id,id);
calls=0;
await assert.rejects(()=>requestAlarm(user,{method:'POST',body:request,fetchImpl:async()=>{calls++;return response({...command,id:'different'},202);}}),e=>e.code==='invalid_response');
assert.equal(calls,1);
const stop=new AbortController();stop.abort();calls=0;
await assert.rejects(()=>requestAlarm({getIdToken:async()=>{calls++;return 'token';}},{signal:stop.signal,fetchImpl:async()=>{calls++;return response(data);}}));
assert.equal(calls,0);

const h=(type,props,...children)=>({type,props:{...props,children}});
function render(seed){
 let index=0;
 const React={createElement:h,useState:initial=>[index<seed.length?seed[index++]:initial,()=>{}],useRef:initial=>({current:initial}),useEffect(){}};
 return createAlarmControl(React)({user,now});
}
function find(node,predicate){
 if(!node||typeof node!=='object')return null;
 if(predicate(node))return node;
 for(const child of [node.props?.children].flat(Infinity)){const result=find(child,predicate);if(result)return result;}
 return null;
}
const text=node=>node===null||node===undefined||typeof node==='boolean'?'':typeof node!=='object'?String(node):[node.props?.children].flat(Infinity).map(text).join(' ');
const active=render([data,false,true,null,false,null,false,now]);
const actions=find(active,n=>n.props?.className==='alarm-actions');
assert.equal(actions.props.children.length,3);
assert.equal(actions.props.children[1].props['aria-pressed'],true);
assert.equal(actions.props.children[1].props.disabled,true);
assert.equal(actions.props.children[0].props.disabled,false);
assert.equal(actions.props.children[2].props.disabled,false);
assert.match(text(active),/stato aperto\/chiuso delle singole porte non è disponibile/);
const done=render([snapshot({command:confirmed}),false,true,null,false,{id,tone:'warn',title:'Risposta non ricevuta'},false,now]);
assert.ok(!text(find(done,n=>n.props?.className?.startsWith('alarm-command'))).includes('Risposta non ricevuta'));
assert.match(text(done),/Stato confermato/);
const expired=render([snapshot({observedAt:iso(now+30000),expiresAt:iso(now+75000)}),false,true,request,false,null,false,now+31000]);
const panel=find(expired,n=>n.props?.className==='alarm-confirm');
assert.match(text(panel),/conferma è scaduta/);
assert.equal(find(panel,n=>n.type==='button'&&text(n)==='Conferma totale').props.disabled,true);
console.log(JSON.stringify({check:'warehouse_alarm_experience',status:'passed',coverage:'user-confirmed door mode; stable phone diagnostics; confirmation expiry; request deadlines; GET renewal only; single POST attempt; accepted-command race; authoritative feedback; preserved three controls'}));

const localWarning=render([data,false,true,null,false,{tone:'warn',title:'Stato da aggiornare',text:'Attendi.'},false,now]);
assert.match(text(find(localWarning,n=>n.props?.className?.startsWith('alarm-command'))),/Stato da aggiornare/);
