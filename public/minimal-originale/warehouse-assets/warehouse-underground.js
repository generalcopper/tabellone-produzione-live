const API='https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/underground';
const money=(n,c)=>n===null||n===undefined?'Da collegare':new Intl.NumberFormat('it-IT',{style:'currency',currency:c}).format(n);
const number=n=>n===null||n===undefined?'—':new Intl.NumberFormat('it-IT',{maximumFractionDigits:2}).format(n);
const time=s=>s?new Date(s).toLocaleString('it-IT',{timeZone:'Europe/Rome'}):'—';
const names={app_submission_sent:'Consegna inviata',app_recording_created:'Registrazione creata',evaluation_saved:'Valutazione salvata',content_published:'Contenuto pubblicato',admin_access:'Accesso amministratore',access_denied:'Accesso negato',service_error:'Errore servizio',rate_limited:'Limite richieste',auth_request_accepted:'Richiesta accesso accettata',auth_request_failed:'Accesso fallito',upload_worker_completed:'Elaborazione caricamento',upload_worker_failed:'Errore elaborazione caricamento'};
function action(s){return names[s]??s.replace(/^admin_/,'Admin · ').replace(/^app_/,'App · ').replace(/material/,'materiale').replace(/assignment/,'compito').replace(/member/,'utente').replace(/calendar/,'calendario').replace(/created/,'creazione').replace(/updated/,'modifica').replace(/deleted/,'eliminazione').replace(/failed/,'errore').replaceAll('_',' ');}
export function csvRows(data){
  const month=data.requestedMonth,rows=[['Mese','Voce','Quantità','Unità','Importo','Valuta','Stato','Fonte','Aggiornato al']];
  rows.push([month,'Google Cloud · progetto Underground','','',data.cloudCost?.amount??'',data.cloudCost?.currency??'EUR',data.cloudCost?.status??'pending','Cloud Billing budget',data.cloudCost?.updatedAt??'']);
  const git=data.github;
  if(git?.billing?.state==='available')for(const r of git.billing.items)rows.push([month,r.product+' · '+r.sku,r.quantity,r.unit,r.net,'USD','provvisorio','GitHub Billing API',git.observedAt]);
  else rows.push([month,'GitHub','','','','USD',git?.billing?.state??'unavailable','GitHub Billing API',git?.observedAt??'']);
  for(const [key,label,unit] of [['repositoryKiB','GitHub repository','KiB'],['artifactBytes','GitHub artifact','byte'],['artifactCount','GitHub artifact','elementi'],['cacheBytes','GitHub cache','byte'],['cacheCount','GitHub cache','elementi']])rows.push([month,label,git?.[key]??'',unit,'','',git?.[key]==null?'non disponibile':'misura istantanea','GitHub API',git?.observedAt??'']);
  for(const r of data.monthly?.metrics??[])rows.push([month,r.label,r.value??'',r.unit,'','','consumo tecnico',r.type,r.observedAt??'']);
  for(const [key,item] of Object.entries(data.sharedCosts??{}))rows.push([month,key,'','','','','non attribuito',item.detail,'']);
  return rows;
}
export function reportCSV(data){return '\ufeff'+csvRows(data).map(row=>row.map(x=>'"'+(typeof x==='number'?String(x).replace('.',','):String(x).replace(/^[=+@-]/,"'$&")).replaceAll('"','""')+'"').join(';')).join('\r\n');}
export function createUndergroundMonitor(React){
  const h=React.createElement;
  return function UndergroundMonitor({user,now=Date.now()}){
    const [data,setData]=React.useState(null),[error,setError]=React.useState(false),[open,setOpen]=React.useState(false),[month,setMonth]=React.useState('');
    const dialog=React.useRef(null);
    React.useEffect(()=>{let active=true,pending=false;setData(null);
      async function load(){if(!user||pending||document.visibilityState==='hidden')return;pending=true;
        try{const r=await fetch(API+(month?'?month='+month:''),{headers:{Authorization:'Bearer '+await user.getIdToken()},cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();const value=await r.json();if(value.version!==1||value.project!=='underground-studio-dev-2026')throw Error();if(active){setData(value);setError(false);}}catch{if(active)setError(true);}finally{pending=false;}}
      void load();const timer=setInterval(load,60000),visible=()=>{if(document.visibilityState==='visible')void load();};document.addEventListener('visibilitychange',visible);
      return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
    },[user,month]);
    React.useEffect(()=>{if(open)dialog.current?.showModal();else dialog.current?.close();},[open]);
    const stale=error||!data||Date.parse(data.expiresAt)<=now;
    const issues=(data?.checks??[]).filter(c=>c.state!=='ok');
    const state=stale?'Da verificare':issues.length?issues.length+' avvisi':'Servizi operativi';
    function exportReport(){if(!data)return;const url=URL.createObjectURL(new Blob([reportCSV(data)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='UndergroundStudio-consumi.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return h('div',{className:'ug-monitor'},
      h('button',{type:'button',className:'ug-launch',onClick:()=>setOpen(true),disabled:!user,title:'Underground studio · '+state,'aria-label':'Monitoraggio Underground studio','aria-haspopup':'dialog','aria-expanded':open},'UG'),
      h('dialog',{ref:dialog,className:'ug-dialog',onCancel:()=>setOpen(false)},
        h('header',null,h('div',null,h('h2',null,'Underground studio'),h('p',null,'Controllo '+time(data?.generatedAt))),h('button',{onClick:()=>setOpen(false),'aria-label':'Chiudi'},'×')),
        stale&&h('p',{role:'alert',className:'ug-attention'},'Rilevazione assente o scaduta. I dati conservano il loro ultimo orario.'),
        h('section',null,h('h3',null,'Salute app e dashboard'),...(data?.checks??[]).map(c=>h('p',{key:c.label,className:'ug-check'},h('b',null,c.label),h('span',{className:c.state==='ok'?'':'ug-attention'},c.detail))),h('p',{className:'ug-note'},'Controlli dei servizi, delle code e delle risposte API. Crash nativi iPhone: raccolta non ancora configurata.')),
        h('section',null,h('h3',null,'Consumi mensili'),h('label',null,'Mese ',h('input',{type:'month',value:month||data?.requestedMonth||'',onChange:e=>setMonth(e.target.value)})),h('button',{onClick:exportReport,disabled:!data},'Scarica riepilogo CSV'),
          h('p',null,'Google Cloud: ',h('b',null,money(data?.cloudCost?.amount,'EUR')),' · aggiornato ',time(data?.cloudCost?.updatedAt)),
          h('p',null,'GitHub: ',h('b',null,data?.github?.billing?.state==='available'?money(data.github.billing.net,'USD'):'Fatturazione da autorizzare')),
          h('p',{className:'ug-note'},'Importi provvisori del fornitore. EUR e USD separati. Postmark e account Apple condivisi: quote non attribuite. Verificare il documento del fornitore prima di fatturare.'),
          h('table',null,h('thead',null,h('tr',null,...['Consumo','Quantità','Unità','Rilevazione'].map(x=>h('th',{key:x},x)))),h('tbody',null,...(data?.monthly?.metrics??[]).map(r=>h('tr',{key:r.id},h('td',null,r.label),h('td',null,number(r.value)),h('td',null,r.unit),h('td',null,time(r.observedAt)))))),
          h('p',null,'GitHub repository: ',number(data?.github?.repositoryKiB),' KiB · artifact: ',number(data?.github?.artifactBytes),' byte · cache: ',number(data?.github?.cacheBytes),' byte'),
          h('p',{className:'ug-note'},'I consumi tecnici sono misure del servizio; non sono sommati agli importi. I dati mancanti restano indisponibili. Le metriche mensili seguono il periodo UTC del fornitore.')),
        h('section',null,h('h3',null,'Attività recente'),h('p',{className:'ug-note'},'Accessi verificati per sessione, modifiche e operazioni server. Ultimi 100 eventi; registro conservato 90 giorni.'),h('ol',null,...(data?.activity??[]).map(e=>h('li',{key:e.id},h('time',null,time(e.at)),' · ',action(e.action),' · ',e.actor,e.status>=400?' · HTTP '+e.status:''))),!(data?.activity?.length)&&h('p',null,'Nessun evento acquisito al momento.'))
      ));
  };
}
