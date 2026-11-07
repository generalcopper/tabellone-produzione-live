const API='https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/alarm';
export const MODE_LABELS={arm:'Inserito totale',home:'Inserito parziale',disarmed:'Disinserito',sos:'Emergenza'};
const SHORT={arm:'Totale',home:'Parziale',disarmed:'Disinserito',sos:'Emergenza'};
const ACTIONS={arm:'Inserisci totale',home:'Inserisci parziale',disarmed:'Disinserisci'};
const RESULTS={pending:'Comando in attesa della centralina',claimed:'Comando in esecuzione · verifica dello stato',confirmed:'Stato confermato dalla centralina',uncertain:'Esito non confermato · controlla lo stato attuale',rejected:'Comando non eseguito · aggiorna lo stato',expired:'Comando scaduto · non eseguito'};
const at=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
export function alarmView(data,error,now=Date.now()){
 const m=data?.metrics,stamp=Date.parse(data?.observedAt),expiry=Date.parse(data?.expiresAt);
 const fresh=!error&&data?.version===1&&data.source==='local'&&data.enabled===true&&data.fresh===true&&Number.isFinite(stamp)&&stamp<=now+5000&&now-stamp<45000&&Number.isFinite(expiry)&&expiry>now&&m?.connected===true;
 const active=fresh&&(m.alarm==='alarm'||m.mode==='sos'||m.tamper===true);
 const mode=fresh&&Object.hasOwn(MODE_LABELS,m.mode)?m.mode:null;
 const pending=['pending','claimed'].includes(data?.command?.status)&&Date.parse(data.command.deadline)>now;
 return {fresh,mode,active,pending,tone:!fresh?'unknown':active?'down':mode==='arm'||mode==='home'?'ok':'warn',
  label:!fresh?'Da verificare':active?'ALLARME IN CORSO':MODE_LABELS[mode]??'Stato non disponibile',
  short:!fresh?'Da verificare':active?'IN CORSO':SHORT[mode]??'Stato incerto',
  canControl:fresh&&!!mode&&['normal','alarm'].includes(m.alarm)&&data.controlsEnabled===true&&!pending};
}
export function prepareCommand(data,target,now=Date.now(),id=crypto.randomUUID()){
 const view=alarmView(data,false,now);
 if(!view.canControl||!Object.hasOwn(ACTIONS,target)||target===view.mode)throw Error('alarm_unavailable');
 return {id,target,expectedMode:view.mode,observedAt:data.observedAt,confirmed:true};
}
export function createAlarmControl(React){
 const h=React.createElement;
 return function AlarmControl({user,now=Date.now()}){
  const [data,setData]=React.useState(null),[error,setError]=React.useState(false),[open,setOpen]=React.useState(false),[choice,setChoice]=React.useState(null),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState('');
  const dialog=React.useRef(null),loadRef=React.useRef(()=>{}),alive=React.useRef(false),sending=React.useRef(false),fast=React.useRef(false);
  const view=alarmView(data,error,now);fast.current=open||view.pending;
  React.useEffect(()=>{
   let active=true,pending=false,last=0;alive.current=true;setData(null);setChoice(null);setNotice('');
   async function load(force=false){
    if(!user||!active||pending||document.visibilityState==='hidden'||!force&&Date.now()-last<(fast.current?2000:15000))return;
    pending=true;last=Date.now();
    try{const token=await user.getIdToken();if(!active)return;
     const r=await fetch(API,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)});
     if(!r.ok)throw Error();const value=await r.json();
     if(value.version!==1||value.source!=='local'||!Array.isArray(value.history))throw Error();
     if(active){setData(value);setError(false);}
    }catch{if(active)setError(true);}finally{pending=false;}
   }
   loadRef.current=load;void load(true);const timer=setInterval(()=>void load(),2000);
   const visible=()=>{if(document.visibilityState==='visible')void load(true);};document.addEventListener('visibilitychange',visible);
   return()=>{active=false;alive.current=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);loadRef.current=()=>{};};
  },[user]);
  React.useEffect(()=>{if(open){dialog.current?.showModal();void loadRef.current(true);}else{dialog.current?.close();setChoice(null);}},[open]);
  function choose(target){try{setChoice(prepareCommand(data,target));setNotice('');}catch{setNotice('Aggiorna lo stato prima di inviare un comando.');void loadRef.current(true);}}
  async function submit(){
   if(!choice||sending.current||!user)return;
   sending.current=true;setBusy(true);const request=choice;setChoice(null);
   try{
    const token=await user.getIdToken();if(!alive.current)return;
    const r=await fetch(API,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(request),cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!alive.current)return;
    if(!r.ok){const result=await r.json().catch(()=>({}));
     setNotice(r.status===401||r.status===403?'Accesso da verificare.':result.error==='alarm_state_changed'?'Lo stato è cambiato. Controlla la nuova lettura e conferma nuovamente.':'Comando non accettato. Aggiorna lo stato prima di riprovare.');
    }else setNotice('Richiesta registrata. Attendo la conferma della centralina.');
   }catch{if(alive.current)setNotice('Esito non confermato. Controllo lo stato; il comando non viene ripetuto.');}
   finally{sending.current=false;if(alive.current){setBusy(false);void loadRef.current(true);}}
  }
  const m=data?.metrics,cmd=data?.command;
  return h('span',{className:'alarm-control'},
   h('button',{type:'button',className:'link alarm-launch tone-'+view.tone,onClick:()=>setOpen(true),'aria-haspopup':'dialog','aria-expanded':open,'aria-label':'Gestisci allarme capannone',title:'Allarme capannone · '+view.label},h('i',{'aria-hidden':true}),'Allarme · '+view.short),
   h('dialog',{ref:dialog,className:'alarm-dialog',onCancel:e=>{if(busy)e.preventDefault();else setOpen(false);},'aria-labelledby':'alarm-title'},
    h('header',null,h('div',null,h('h2',{id:'alarm-title'},'Allarme capannone'),h('p',null,'Italian Alarm · Micro Touch')),h('button',{type:'button',onClick:()=>setOpen(false),disabled:busy,'aria-label':'Chiudi allarme'},'×')),
    h('div',{className:'alarm-status tone-'+view.tone,'aria-live':'polite'},h('i',{'aria-hidden':true}),h('strong',null,view.label)),
    h('p',{className:'alarm-reading'},'Ultima lettura: '+at(data?.observedAt)),
    !view.fresh&&h('p',{role:'alert'},'Collegamento da verificare. I comandi sono sospesi finché torna una lettura aggiornata.'),
    h('dl',{className:'alarm-facts'},
     h('div',null,h('dt',null,'Centralina'),h('dd',null,view.fresh?'Collegata':'Da verificare')),
     h('div',null,h('dt',null,'Batteria'),h('dd',null,view.fresh&&typeof m?.battery==='number'?m.battery+'%':'—')),
     h('div',null,h('dt',null,'Carica'),h('dd',null,!view.fresh||typeof m?.charging!=='boolean'?'—':m.charging?'In carica':'Non in carica')),
     h('div',null,h('dt',null,'Rete telefonica'),h('dd',null,!view.fresh?'—':m?.sim==='sim_card_no'?'SIM assente':m?.sim==='normal'||m?.sim?.startsWith('signal_level_')?'Collegata':m?.sim?'Da verificare':'Non disponibile'))),
    view.fresh&&m?.sim==='sim_card_no'&&h('p',{className:'alarm-note'},'La centralina segnala SIM assente: chiamate e SMS non sono disponibili.'),
    h('div',{className:'alarm-actions'},...Object.entries(ACTIONS).map(([target,label])=>h('button',{key:target,type:'button',className:target==='disarmed'?'alarm-disarm':'',disabled:busy||!view.canControl||view.mode===target,onClick:()=>choose(target)},label))),
    choice&&h('section',{className:'alarm-confirm','aria-label':'Conferma comando'},
     h('h3',null,ACTIONS[choice.target]+'?'),
     h('p',null,choice.target==='disarmed'?'Confermi il disinserimento dell’allarme del capannone?':choice.target==='home'?'Verrà attivata la modalità parziale configurata nella centralina.':'Verrà attivata la modalità totale. Verifica che il capannone sia pronto.'),
     h('div',null,h('button',{type:'button',onClick:()=>setChoice(null),disabled:busy},'Annulla'),h('button',{type:'button',onClick:()=>void submit(),disabled:busy||!view.canControl},'Conferma '+ACTIONS[choice.target].toLowerCase()))),
    notice&&h('p',{className:'alarm-note',role:'status'},notice),
    cmd&&h('p',{className:'alarm-command',role:'status'},RESULTS[cmd.status]??'Stato comando da verificare'),
    h('section',null,h('h3',null,'Attività recente'),h('p',{className:'alarm-note'},'Eventi rilevati dal collegamento locale; lo storico parte dalla sua attivazione.'),
     h('ol',{className:'alarm-history'},...(data?.history??[]).slice(0,12).map((entry,index)=>h('li',{key:entry.at+'-'+index},h('time',null,at(entry.at)),h('span',null,entry.kind==='command'?(ACTIONS[entry.mode]??'Comando')+' · '+(RESULTS[entry.status]??'Da verificare'):entry.connected===false?'Centralina non raggiungibile':(MODE_LABELS[entry.mode]??'Stato non disponibile')+(entry.alarm==='alarm'?' · ALLARME IN CORSO':''))))),
     !(data?.history?.length)&&h('p',null,'Nessun evento acquisito.')),
    h('footer',null,h('span',null,'Collegamento locale tramite Mac mini'),h('button',{type:'button',onClick:()=>void loadRef.current(true),disabled:busy},'Aggiorna'))
   ));
 };
}
