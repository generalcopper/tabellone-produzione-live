const API='https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/ledwall';
const count=value=>Number.isSafeInteger(value)&&value>=0?new Intl.NumberFormat('it-IT').format(value):'—';
const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?value.split('-').reverse().join('/'):'—';
const time=value=>Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(value)):'—';
const kindName={campaign:'In campagna',outside:'Fuori periodo',test:'Prova tecnica'};

export function createLedwallMonitor(React){
 const h=React.createElement;
 return function LedwallMonitor({user,onClose}){
  const ref=React.useRef(null),request=React.useRef(null),more=React.useRef(false);
  const [data,setData]=React.useState(null),[error,setError]=React.useState(false),[busy,setBusy]=React.useState(false);
  const [wall,setWall]=React.useState(''),[kind,setKind]=React.useState('all'),[history,setHistory]=React.useState([]),[cursor,setCursor]=React.useState(null);
  React.useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  React.useEffect(()=>{
   let active=true,pending=false,controller;
   const load=async(next='')=>{
    if(!active||pending||!user||document.visibilityState==='hidden')return;
    pending=true;setBusy(true);controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try{
     const token=await user.getIdToken();if(!active)return;
     const r=await fetch(API+(next?'?cursor='+encodeURIComponent(next):''),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
     if(!r.ok)throw Error('source');const value=await r.json();
     if(value.version!==1||value.state!=='ok'||!Array.isArray(value.walls)||value.walls.length!==6||!Array.isArray(value.events)||!Array.isArray(value.daily)||!value.totals||!Number.isFinite(Date.parse(value.generatedAt)))throw Error('snapshot');
     if(active){setData(value);setError(false);setHistory(old=>[...new Map([...old,...value.events].map(e=>[e.id,e])).values()].sort((a,b)=>b.id.localeCompare(a.id)));
      if(next||!more.current)setCursor(value.nextCursor||null);if(next)more.current=true;}
    }catch{if(active)setError(true);}finally{clearTimeout(timeout);pending=false;if(active)setBusy(false);}
   };
   request.current=load;void load();const timer=setInterval(()=>void load(),15000);
   const visible=()=>{if(document.visibilityState==='visible')void load();};document.addEventListener('visibilitychange',visible);
   return()=>{active=false;request.current=null;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[user]);
  const walls=data?.walls||[],shown=walls.filter(w=>!wall||w.id===wall),labels=new Map(walls.map(w=>[w.id,w.location]));
  const events=history.filter(e=>(!wall||e.wallId===wall)&&(kind==='all'||kind===e.kind));
  const daily=new Map();for(const row of data?.daily||[])if(row.kind==='campaign'&&(!wall||row.wallId===wall))daily.set(row.day,(daily.get(row.day)||0)+row.count);
  const days=[...daily].sort(([a],[b])=>b.localeCompare(a)).slice(0,14);
  const hash=(value,valid=true)=>h('code',{className:valid?'ledwall-hash':'ledwall-hash is-invalid',title:value||'Hash non disponibile'},value?value.slice(0,12)+(valid?' ✓':' · da verificare'):'—');
  const table=(heads,rows)=>h('div',{className:'table-scroll'},h('table',{className:'data-table'},h('thead',null,h('tr',null,...heads.map(x=>h('th',{key:x,scope:'col'},x)))),h('tbody',null,...rows)));
  return h('dialog',{ref,className:'dialog dialog-wide ilp-ledwall-dialog','aria-labelledby':'ledwall-title',onCancel:onClose,onClick:e=>e.target===e.currentTarget&&onClose()},
   h('header',{className:'dialog-head'},h('div',null,h('span',{className:'dialog-kicker'},'iLovePaghe · Dolci · 6 impianti'),h('h2',{id:'ledwall-title'},'Monitoraggio LED wall')),h('button',{type:'button',className:'dialog-close',onClick:onClose,'aria-label':'Chiudi monitoraggio LED wall'},'×')),
   h('p',{className:'dialog-note'},'Aperture dei link QR. La sola inquadratura non è rilevabile. Orari italiani.'),
   error&&h('p',{className:'ledwall-warning',role:'status'},data?'Aggiornamento non riuscito: sono mostrati gli ultimi dati disponibili.':'Monitoraggio momentaneamente non disponibile.'),
   !data&&!error&&h('p',{role:'status'},'Caricamento del monitoraggio…'),
   data&&h(React.Fragment,null,
    h('div',{className:'ledwall-kpis'},...[[data.totals.aperture,'Aperture in campagna'],[data.totals.today,'Oggi in campagna'],[data.totals.outside,'Fuori periodo'],[data.totals.tests,'Prove tecniche']].map(([n,label])=>h('div',{key:label},h('span',null,label),h('strong',null,count(n))))),
    h('div',{className:'ledwall-controls'},h('label',null,'Impianto',h('select',{value:wall,onChange:e=>setWall(e.target.value)},h('option',{value:''},'Tutti gli impianti'),...walls.map(w=>h('option',{key:w.id,value:w.id},w.id+' · '+w.location)))),h('label',null,'Storico',h('select',{value:kind,onChange:e=>setKind(e.target.value)},h('option',{value:'all'},'Tutte le aperture'),...Object.entries(kindName).map(([k,label])=>h('option',{key:k,value:k},label)))),h('span',{className:'ledwall-updated'},'Lettura '+time(data.generatedAt))),
    table(['Impianto','Grafica e periodo','Aperture','Oggi','Ultima in campagna'],shown.map(w=>h('tr',{key:w.id},h('th',{scope:'row'},w.id,h('small',null,w.location)),h('td',null,w.creative==='BustePaga'?'Buste paga':'Timbra',h('small',null,date(w.start)+' – '+date(w.end)),h('small',null,w.status)),h('td',null,count(w.aperture)),h('td',null,count(w.today)),h('td',null,time(w.lastAt))))),
    h('details',{className:'ledwall-proof'},h('summary',null,'QR e file consegnati'),...shown.map(w=>h('div',{key:w.id},h('strong',null,w.id+' · QR '+w.qrId),h('p',null,w.filename),h('p',null,'SHA-256 QR: ',h('code',null,w.qrHash)),h('p',null,'SHA-256 JPEG: ',h('code',null,w.assetSha256))))),
    h('h3',{className:'ledwall-section-title'},'Ultime aperture'),
    table(['Data e ora','Impianto / QR','Tipo','Dispositivo','Hash evento'],events.length?events.map(e=>h('tr',{key:e.id},h('td',null,time(e.at)),h('td',{title:labels.get(e.wallId)},e.wallId,h('small',null,e.qrId)),h('td',null,kindName[e.kind]||'—'),h('td',null,e.device||'—'),h('td',null,hash(e.hash,e.verified)))):[h('tr',{key:'empty'},h('td',{colSpan:5},'Nessuna apertura per il filtro selezionato.'))]),
    cursor&&h('button',{type:'button',className:'ledwall-more',disabled:busy,onClick:()=>request.current?.(cursor)},busy?'Caricamento…':'Carica aperture precedenti'),
    days.length>0&&h('details',{className:'ledwall-proof'},h('summary',null,'Andamento giornaliero · ultimi 14 giorni con aperture'),table(['Giorno','Aperture in campagna'],days.map(([d,n])=>h('tr',{key:d},h('td',null,date(d)),h('td',null,count(n)))))),
    data.dailyTruncated&&h('p',{className:'dialog-note'},'Il dettaglio giornaliero mostra le 750 righe più recenti; i totali includono tutto lo storico.'),
    h('p',{className:'dialog-foot'},data.definition+' Aggiornamento ogni 15 secondi mentre questa finestra è aperta.')));
 };
}
