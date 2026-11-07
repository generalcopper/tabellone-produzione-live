const API='https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/alarm';
export const MODE_LABELS={arm:'Inserito · Totale',home:'Inserito · Solo porte',disarmed:'Disinserito',sos:'Emergenza SOS'};
const SHORT={arm:'Totale',home:'Solo porte',disarmed:'Disinserito',sos:'Emergenza'};
const ACTIONS={arm:'Attiva totale',home:'Attiva Solo porte',disarmed:'Disinserisci'};
const TARGET_NAMES={arm:'Totale',home:'Solo porte',disarmed:'Disinserimento'};
const RESULTS={pending:'In attesa della centralina',claimed:'Verifica della modalità',confirmed:'Stato confermato dalla centralina',uncertain:'Esito da verificare',rejected:'Richiesta non eseguita',expired:'Richiesta scaduta'};
const TERMINAL=new Set(['confirmed','uncertain','rejected','expired']);
const at=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
export function alarmView(data,error,now=Date.now()){
 const m=data?.metrics,stamp=Date.parse(data?.observedAt),expiry=Date.parse(data?.expiresAt);
 const fresh=!error&&data?.version===1&&data.source==='local'&&data.enabled===true&&data.fresh===true&&Number.isFinite(stamp)&&stamp<=now+5000&&now-stamp<45000&&Number.isFinite(expiry)&&expiry>now&&m?.connected===true;
 const active=fresh&&(m.alarm==='alarm'||m.mode==='sos'||m.tamper===true);
 const mode=fresh&&Object.hasOwn(MODE_LABELS,m.mode)?m.mode:null;
 const pending=['pending','claimed'].includes(data?.command?.status)&&Date.parse(data.command.deadline)>now;
 const complete=!!mode&&['normal','alarm'].includes(m?.alarm);
 const reason=!data?(error?'read_error':'loading'):error==='access'?'access':error?'read_error':data.enabled!==true?'not_linked':m?.connected!==true?'device_offline':!fresh?'stale':!complete?'state_unknown':data.controlsEnabled!==true?'control_disabled':pending?'pending':null;
 return {fresh,mode,active,pending,reason,tone:!fresh||!complete?'unknown':active?'down':mode==='arm'||mode==='home'?'ok':'warn',
  label:!fresh?(reason==='loading'?'Collegamento in corso…':'Stato da verificare'):active?'ALLARME IN CORSO':MODE_LABELS[mode]??'Modalità da verificare',
  short:!fresh?(reason==='loading'?'Connessione…':'Da verificare'):active?'IN CORSO':SHORT[mode]??'Stato incerto',
  canControl:fresh&&complete&&data.controlsEnabled===true&&!pending};
}
export function modeDescription(view,metrics){
 if(!view.fresh)return 'Attendo una lettura aggiornata della centralina.';
 if(metrics?.tamper===true)return 'La centralina segnala una manomissione.';
 if(view.active)return 'Segnalazione attiva dalla centralina · modalità '+(SHORT[view.mode]??'da verificare')+'.';
 if(view.mode==='home')return 'Protegge le porte. Puoi muoverti all’interno.';
 if(view.mode==='arm')return 'Protezione di porte e ambienti interni.';
 if(view.mode==='disarmed')return 'La protezione antintrusione non è inserita.';
 return 'La centralina non ha ancora confermato una modalità.';
}
export function connectionMessage(reason){
 return ({loading:'',read_error:'Non riesco ad aggiornare lo stato. Riprovo automaticamente; i comandi sono temporaneamente sospesi.',access:'Accesso da verificare. Aggiorna la pagina per ripristinare la sessione.',not_linked:'Il collegamento con l’allarme non è attivo.',device_offline:'Centralina non raggiungibile. Verifica che il Mac mini e l’allarme siano accesi e connessi alla rete.',stale:'L’ultima lettura non è più recente. I comandi tornano disponibili appena arriva un aggiornamento.',state_unknown:'Attendo che la centralina confermi una modalità completa.',control_disabled:'Il monitoraggio è attivo; i comandi non sono disponibili al momento.',pending:'Attendo l’esito della richiesta prima di accettarne un’altra.'})[reason]??'';
}
export function telephoneView(value,fresh){
 if(!fresh)return {label:'—',detail:'Stato della telefonia da aggiornare.',note:'Le letture si aggiornano automaticamente.'};
 const details={sim_card_no:'La centralina segnala SIM assente.',network_no:'La centralina segnala rete telefonica assente.',phone_no:'La centralina segnala che la telefonia non è pronta.',network_search:'Ricerca della rete telefonica.'};
 if(['sim_card_no','network_no','phone_no'].includes(value))return {label:'Non disponibile',detail:details[value],note:'Puoi gestire l’allarme da qui anche senza SIM.'};
 if(value==='network_search')return {label:'Ricerca rete',detail:details[value],note:'Puoi gestire l’allarme da qui anche senza SIM.'};
 if(value==='normal'||/^signal_level_[1-5]$/.test(value??''))return {label:'Collegata',detail:value==='normal'?'Rete telefonica collegata.':'Segnale '+value.slice(-1)+' su 5.',note:'Le letture si aggiornano automaticamente.'};
 return {label:'Da verificare',detail:'Nessuna lettura della telefonia disponibile.',note:'Le letture si aggiornano automaticamente.'};
}
export function historyLabel(entry){
 if(entry.kind==='command')return (TARGET_NAMES[entry.mode]??'Comando')+' · '+(RESULTS[entry.status]??'Da verificare');
 if(entry.connected===false)return 'Collegamento con la centralina perso';
 return (MODE_LABELS[entry.mode]??'Modalità da verificare')+(entry.alarm==='alarm'?' · ALLARME IN CORSO':'')+(entry.tamper===true?' · MANOMISSIONE':'');
}
export function prepareCommand(data,target,now=Date.now(),id=crypto.randomUUID()){
 const view=alarmView(data,false,now);
 if(!view.canControl||!Object.hasOwn(ACTIONS,target)||target===view.mode)throw Error('alarm_unavailable');
 return {id,target,expectedMode:view.mode,observedAt:data.observedAt,confirmed:true};
}
export function confirmationState(data,choice,error,now=Date.now()){
 if(!choice)return {valid:false,text:''};
 const view=alarmView(data,error,now);
 if(!view.canControl)return {valid:false,text:connectionMessage(view.reason)||'Aggiorna lo stato prima di confermare.'};
 if(view.mode===choice.target)return {valid:false,text:'La modalità scelta è già attiva.'};
 if(view.mode!==choice.expectedMode)return {valid:false,text:'La modalità è cambiata. Seleziona nuovamente cosa vuoi attivare.'};
 const observed=Date.parse(choice.observedAt);
 if(!Number.isFinite(observed)||observed>now+5000||now-observed>30000)return {valid:false,text:'Questa conferma è scaduta. Seleziona nuovamente la modalità per usare la lettura più recente.'};
 return {valid:true,text:''};
}
export function commandFeedback(command,now=Date.now()){
 if(!command)return null;
 let status=command.status;
 const remaining=Math.ceil((Date.parse(command.deadline)-now)/1000);
 if(!TERMINAL.has(status)&&Number.isFinite(remaining)&&remaining<=0)status=status==='claimed'?'uncertain':'expired';
 const target=TARGET_NAMES[command.target]??'Comando';
 const reason=command.reason;
 const detail={pending:'La richiesta è registrata. Attendo la risposta della centralina.',claimed:'La richiesta è stata presa in carico. Attendo lo stato effettivo.',confirmed:'La centralina ha restituito la modalità richiesta.',uncertain:'Non c’è una conferma definitiva. Controlla lo stato attuale prima di inviare un altro comando.',expired:'La richiesta non è stata inviata alla centralina. Aggiorna lo stato prima di riprovare.',rejected:reason==='state_changed'?'La modalità è cambiata nel frattempo. Controlla lo stato e scegli nuovamente.':reason==='offline'?'La centralina non era raggiungibile. Attendi il ripristino del collegamento.':reason==='disabled'?'I comandi non erano abilitati. Nessuna modifica inviata.':'La richiesta non è stata eseguita. Controlla lo stato prima di riprovare.'}[status]??'Aggiorna lo stato per verificare questa richiesta.';
 return {status,title:target+' · '+(RESULTS[status]??'Da verificare'),text:detail,tone:status==='confirmed'?'ok':['pending','claimed'].includes(status)?'pending':'warn',seconds:['pending','claimed'].includes(status)&&remaining>0?remaining:null,createdAt:command.createdAt};
}
export function mergeCommand(data,command){
 if(!data)return data;
 const current=data.command;
 if(current?.id===command.id&&(TERMINAL.has(current.status)||current.status==='claimed'&&command.status==='pending'))return data;
 if(current?.id!==command.id&&Date.parse(current?.createdAt)>Date.parse(command.createdAt))return data;
 return {...data,command};
}
export function mergeReadSnapshot(current,incoming,ack,startedAt){
 if(incoming?.enabled===true&&ack&&ack.at>=startedAt){
  const next=mergeCommand(incoming,ack.command);
  return current?.command?.id===ack.command.id?mergeCommand(next,current.command):next;
 }
 return incoming;
}
export class AlarmRequestError extends Error{
 constructor(code,status=0,detail=''){super(code);this.code=code;this.status=status;this.detail=detail;}
}
function bounded(promise,signal){
 if(signal.aborted)return Promise.reject(signal.reason);
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(promise).then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}
// Reads can renew an expired token once. A mode request always has exactly one HTTP attempt.
export async function requestAlarm(user,{method='GET',body,signal,fetchImpl=globalThis.fetch,timeoutMs=12000,beforeSend}={}){
 if(!['GET','POST'].includes(method))throw new AlarmRequestError('invalid_method');
 const controller=new AbortController();
 const abort=()=>controller.abort(signal?.reason??new AlarmRequestError('cancelled'));
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new AlarmRequestError('timeout')),timeoutMs);
 const live=controller.signal;
 try{
  for(let attempt=0;attempt<(method==='GET'?2:1);attempt++){
   live.throwIfAborted();
   const token=await bounded(Promise.resolve().then(()=>user.getIdToken(attempt===1)),live);
   live.throwIfAborted();beforeSend?.();live.throwIfAborted();
   const response=await bounded(fetchImpl(API,{method,headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:live}),live);
   if(method==='GET'&&response.status===401&&attempt===0)continue;
   let value;
   try{value=await bounded(response.json(),live);}catch(error){if(live.aborted)throw live.reason;if(response.ok)throw new AlarmRequestError('invalid_response');}
   if(!response.ok)throw new AlarmRequestError('http',response.status,value?.error??'');
   if(method==='GET'&&(value?.version!==1||value.source!=='local'||!Array.isArray(value.history)))throw new AlarmRequestError('invalid_response');
   if(method==='POST'&&(value?.id!==body?.id||value.target!==body.target||!['pending','claimed',...TERMINAL].includes(value.status)||!Number.isFinite(Date.parse(value.deadline))))throw new AlarmRequestError('invalid_response');
   return value;
  }
  throw new AlarmRequestError('access');
 }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function requestNotice(error,id){
 if(error.code==='confirmation_changed')return {id,tone:'warn',title:'Conferma da aggiornare',text:error.detail||'Lo stato è cambiato. Seleziona nuovamente la modalità.'};
 if(error.status===401||error.status===403)return {id,tone:'warn',title:'Accesso da verificare',text:'Aggiorna la pagina prima di inviare una nuova richiesta.'};
 if(error.status>=400&&error.status<500)return {id,tone:'warn',title:error.detail==='alarm_command_pending'?'Richiesta già in corso':'Richiesta non eseguita',text:error.detail==='alarm_state_changed'?'Lo stato è cambiato. Controlla la nuova lettura e scegli nuovamente.':error.detail==='alarm_command_pending'?'Attendo il risultato della richiesta già registrata.':'Aggiorna lo stato e seleziona nuovamente la modalità.'};
 return {id,tone:'warn',title:'Risposta non ricevuta',text:'Controllo lo stato della centralina. Il comando non viene ripetuto automaticamente.'};
}
export function createAlarmControl(React){
 const h=React.createElement;
 return function AlarmControl({user,now=Date.now()}){
  const [data,setData]=React.useState(null),[error,setError]=React.useState(false),[open,setOpen]=React.useState(false),[choice,setChoice]=React.useState(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState(null),[refreshing,setRefreshing]=React.useState(false),[clock,setClock]=React.useState(Date.now());
  const dialog=React.useRef(null),launcher=React.useRef(null),heading=React.useRef(null),confirmPanel=React.useRef(null),cancelButton=React.useRef(null),originButton=React.useRef(null);
  const loadRef=React.useRef(async()=>{}),sessionRef=React.useRef(null),sending=React.useRef(null),fast=React.useRef(false),latest=React.useRef(null);
  const currentTime=open?clock:now,view=alarmView(data,error,currentTime);
  fast.current=open||view.pending;latest.current={data,error};
  React.useEffect(()=>{
   const session={user,controller:new AbortController(),active:true};sessionRef.current=session;sending.current=null;
   let pending=null,last=0;
   setData(null);setError(false);setChoice(null);setNotice(null);setBusy(false);setRefreshing(false);
   async function load(force=false){
    if(!user||!session.active||document.visibilityState==='hidden'||!force&&Date.now()-last<(fast.current?2000:15000))return;
    if(pending)return pending;
    last=Date.now();const startedAt=last;
    pending=(async()=>{
     try{const value=await requestAlarm(user,{signal:session.controller.signal});if(session.active){setData(current=>mergeReadSnapshot(current,value,session.commandAck,startedAt));setError(false);}}
     catch(failure){if(session.active)setError(failure.status===401||failure.status===403?'access':true);}
    })().finally(()=>{pending=null;});
    return pending;
   }
   loadRef.current=load;void load(true);
   const timer=setInterval(()=>void load(),2000);
   const resume=()=>{if(document.visibilityState==='visible')void load(true);};
   document.addEventListener('visibilitychange',resume);window.addEventListener('online',resume);window.addEventListener('focus',resume);
   return()=>{session.active=false;session.controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',resume);window.removeEventListener('online',resume);window.removeEventListener('focus',resume);if(sessionRef.current===session)loadRef.current=async()=>{};};
  },[user]);
  React.useEffect(()=>{
   if(open){
    setClock(Date.now());if(!dialog.current?.open)dialog.current?.showModal();
    heading.current?.focus({preventScroll:true});void loadRef.current(true);
    const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);
   }
   const wasOpen=dialog.current?.open;dialog.current?.close();setChoice(null);if(wasOpen)launcher.current?.focus({preventScroll:true});
  },[open]);
  React.useEffect(()=>{
   if(choice){confirmPanel.current?.scrollIntoView({block:'nearest',behavior:'instant'});cancelButton.current?.focus({preventScroll:true});}
  },[choice?.id]);
  function cancelChoice(){setChoice(null);(originButton.current?.disabled?heading.current:originButton.current)?.focus({preventScroll:true});}
  function close(){if(busy)return;setOpen(false);setChoice(null);launcher.current?.focus({preventScroll:true});}
  function choose(target,event){
   if(busy||sending.current)return;
   try{
    const current=latest.current;
    if(!alarmView(current.data,current.error,Date.now()).canControl)throw Error();
    originButton.current=event?.currentTarget;
    setChoice(prepareCommand(current.data,target));setNotice(null);
   }catch{setNotice({tone:'warn',title:'Stato da aggiornare',text:'Attendi una lettura recente prima di scegliere la modalità.'});void loadRef.current(true);}
  }
  async function refresh(){
   const session=sessionRef.current;setRefreshing(true);
   try{await loadRef.current(true);}finally{if(session?.active&&sessionRef.current===session)setRefreshing(false);}
  }
  async function submit(){
   const session=sessionRef.current,request=choice;
   if(!request||sending.current||!user||!session?.active||session.user!==user)return;
   const validate=()=>{
    const current=latest.current;
    const check=confirmationState(current.data,request,current.error,Date.now());
    if(!session.active||!check.valid)throw new AlarmRequestError('confirmation_changed',0,check.text);
   };
   try{validate();}catch(failure){setNotice(requestNotice(failure,request.id));setChoice(null);return;}
   sending.current=request.id;setBusy(true);setNotice(null);
   try{
    const command=await requestAlarm(user,{method:'POST',body:request,signal:session.controller.signal,beforeSend:validate});
    if(session.active&&sessionRef.current===session){session.commandAck={command,at:Date.now()};setData(current=>mergeCommand(current,command));setNotice(null);setChoice(null);}
   }catch(failure){if(session.active&&sessionRef.current===session){setNotice(requestNotice(failure,request.id));setChoice(null);}}
   finally{
    if(sending.current===request.id)sending.current=null;
    if(session.active&&sessionRef.current===session){setBusy(false);void loadRef.current(true);}
   }
  }
  const m=data?.metrics,cmd=data?.command,tel=telephoneView(m?.sim,view.fresh),confirmation=confirmationState(data,choice,error,currentTime);
  const feedback=busy?{tone:'pending',title:'Invio della richiesta…',text:'Attendo la registrazione della richiesta.'}:notice&&(!notice.id||notice.id!==cmd?.id)?notice:commandFeedback(cmd,currentTime);
  const age=Number.isFinite(Date.parse(data?.observedAt))?Math.max(0,Math.floor((currentTime-Date.parse(data.observedAt))/1000)):null;
  const lastMode=data?.metrics?.mode&&MODE_LABELS[data.metrics.mode];
  const confirmCopy=choice?.target==='home'?{title:'Attivare Solo porte?',text:'Protegge le porte e lascia esclusi i sensori di movimento interni. Controlla che le porte siano chiuse.',action:'Conferma Solo porte'}:choice?.target==='arm'?{title:'Attivare la protezione totale?',text:'Protegge porte e ambienti interni. Verifica che il capannone sia libero e le porte siano chiuse.',action:'Conferma totale'}:{title:'Disinserire l’allarme?',text:'Disinserisce la protezione antintrusione del capannone.',action:'Conferma disinserimento'};
  return h('span',{className:'alarm-control'},
   h('button',{ref:launcher,type:'button',className:'link alarm-launch tone-'+view.tone,onClick:()=>{setClock(Date.now());setOpen(true);},'aria-haspopup':'dialog','aria-expanded':open,'aria-label':'Gestisci allarme capannone',title:'Allarme capannone · '+view.label},h('i',{className:busy||view.pending?'alarm-pulse':'','aria-hidden':true}),'Allarme · '+(busy?'Invio…':view.pending&&view.fresh?'Verifica…':view.short)),
   h('dialog',{ref:dialog,className:'alarm-dialog',onCancel:e=>{e.preventDefault();if(!busy){if(choice)cancelChoice();else close();}},onClose:()=>setOpen(false),'aria-labelledby':'alarm-title'},
    h('header',null,h('div',null,h('h2',{ref:heading,tabIndex:-1,id:'alarm-title'},'Allarme capannone'),h('p',null,'Italian Alarm · Micro Touch')),h('button',{type:'button',onClick:close,disabled:busy,'aria-label':'Chiudi allarme'},'×')),
    h('div',{className:'alarm-status tone-'+view.tone,'aria-live':'polite'},h('i',{'aria-hidden':true}),h('strong',null,view.label)),
    h('p',{className:'alarm-mode-description'},modeDescription(view,m)),
    h('p',{className:'alarm-reading'},view.fresh?'Aggiornato '+(age===0?'ora':age+' s fa')+' · '+at(data.observedAt):'Ultima lettura: '+at(data?.observedAt)),
    view.reason&&!['loading','pending'].includes(view.reason)&&h('p',{className:'alarm-connection',role:'status'},connectionMessage(view.reason),!view.fresh&&lastMode&&h('span',null,' Ultimo stato verificato: '+lastMode+'.')),
    h('dl',{className:'alarm-facts'},
     h('div',null,h('dt',null,'Centralina'),h('dd',null,view.fresh?'Collegata':'Da verificare')),
     h('div',null,h('dt',null,'Batteria'),h('dd',null,view.fresh&&typeof m?.battery==='number'?m.battery+'%':'—')),
     h('div',null,h('dt',null,'Carica'),h('dd',null,!view.fresh||typeof m?.charging!=='boolean'?'—':m.charging?'In carica':'Non in carica')),
     h('div',null,h('dt',null,'Rete telefonica'),h('dd',{title:tel.detail},tel.label))),
    h('p',{className:'alarm-note alarm-connect-note'},tel.note),
    h('div',{className:'alarm-actions','aria-label':'Modalità dell’allarme'},...Object.entries(ACTIONS).map(([target,label])=>h('button',{key:target,type:'button',className:target==='disarmed'?'alarm-disarm':'',disabled:busy||!view.canControl||view.mode===target,'aria-pressed':view.fresh&&view.mode===target,title:view.mode===target?'Modalità già attiva':label,onClick:event=>choose(target,event)},label,view.fresh&&view.mode===target&&h('small',null,'Modalità attiva')))),
    choice&&h('section',{ref:confirmPanel,className:'alarm-confirm','aria-label':'Conferma comando'},
     h('h3',null,confirmCopy.title),h('p',null,confirmCopy.text),
     !confirmation.valid&&!busy&&h('p',{className:'alarm-confirm-invalid',role:'status'},confirmation.text),
     h('div',null,h('button',{ref:cancelButton,type:'button',onClick:cancelChoice,disabled:busy},'Annulla'),h('button',{type:'button',onClick:()=>void submit(),disabled:busy||!confirmation.valid},busy?'Invio…':confirmCopy.action))),
    feedback&&!choice&&h('section',{className:'alarm-command tone-'+feedback.tone},
     h('div',{role:'status'},h('strong',null,feedback.title),h('p',null,feedback.text)),
     feedback.seconds!==null&&feedback.seconds!==undefined&&h('small',{'aria-live':'off'},'Tempo massimo di attesa: '+feedback.seconds+' s'),
     feedback.createdAt&&h('small',null,'Richiesta del '+at(feedback.createdAt))),
    h('details',{className:'alarm-help'},h('summary',null,'Modalità e stato delle porte'),
     h('dl',null,
      h('div',null,h('dt',null,'Totale'),h('dd',null,'Protegge le porte e gli ambienti interni.')),
      h('div',null,h('dt',null,'Solo porte'),h('dd',null,'Protegge le porte; i sensori di movimento interni sono esclusi.')),
      h('div',null,h('dt',null,'Disinserito'),h('dd',null,'Protezione antintrusione disinserita.'))),
     h('p',null,'Questa schermata conferma la modalità attiva. Lo stato aperto/chiuso delle singole porte non è disponibile.')),
    h('section',null,h('h3',null,'Attività recente'),h('p',{className:'alarm-note'},'Cambi di stato e risultati dei comandi rilevati dal collegamento.'),
     h('ol',{className:'alarm-history'},...(data?.history??[]).slice(0,12).map((entry,index)=>h('li',{key:entry.at+'-'+index},h('time',null,at(entry.at)),h('span',null,historyLabel(entry))))),
     !(data?.history?.length)&&h('p',null,'Nessun evento acquisito.')),
    h('footer',null,h('span',null,'Collegamento locale tramite Mac mini'),h('button',{className:'alarm-refresh',type:'button',onClick:()=>void refresh(),disabled:busy||refreshing,'aria-busy':refreshing},refreshing?'Aggiornamento…':'Aggiorna'))
   ));
 };
}
