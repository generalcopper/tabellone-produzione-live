import {authenticatedRead,createPolling} from './warehouse-connection.js?v=52cc0d44df64fb67bdd08881c76356423a558a1f3f2bd86409d71ea5df98e387';

const API='https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/vehicles';
const REFRESH=5*60_000;
const insuranceLabels={documented:'Copertura documentata',suspended:'Polizza sospesa',confirmation:'Riattivazione da confermare',expired:'Copertura da rinnovare',unknown:'Copertura da verificare'};
const inspectionLabels={valid:'Revisione valida',due:'Revisione in scadenza',expired:'Revisione scaduta',unknown:'Revisione da verificare',failed:'Revisione da risolvere'};
const money=n=>n===null||n===undefined?'Da completare':new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n/100);
const date=s=>s?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(s+'T12:00Z')):'Da verificare';
const stamp=s=>s?new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Rome'}).format(new Date(s)):'In attesa';
const today=n=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Europe/Rome'}).format(n);
const canonical=x=>Array.isArray(x)?'['+x.map(canonical).join(',')+']':x!==null&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}':JSON.stringify(x);
export function vehicleAnnualPremium(policy) {
  if(policy.annualPremiumCents!==null&&policy.annualPremiumCents!==undefined)return {amountCents:policy.annualPremiumCents,label:'Contratto '+policy.startDate.slice(0,4)+'–'+policy.contractEnd.slice(0,4),detail:'Premio annuo indicato nel contratto.'};
  const ref=policy.annualPremiumReference;
  if(ref)return {amountCents:ref.amountCents,label:ref.kind==='historical'?'Contratto precedente '+ref.from.slice(0,4)+'–'+ref.until.slice(0,4):'Stima da rata · da confermare',detail:ref.detail};
  return {amountCents:null,label:'Da documentare',detail:'Manca un importo annuo verificabile.'};
}
export function vehicleSnapshotCurrent(data,now=Date.now()) {
  return !!data&&data.version===1&&data.calendarDate===today(now)&&Number.isFinite(Date.parse(data.generatedAt))&&now-Date.parse(data.generatedAt)>=-30_000&&now<Date.parse(data.expiresAt);
}
export async function verifyVehicleSnapshot(data,now=Date.now()) {
  if(!vehicleSnapshotCurrent(data,now)||!Array.isArray(data.vehicles)||data.vehicles.length>50||!Array.isArray(data.documents)||!/^[a-f0-9]{64}$/.test(data.sha256??''))return false;
  const {sha256,...payload}=data;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(payload)));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')===sha256;
}
export function createVehicleCard(React) {
  const h=React.createElement;
  const pill=(text,tone='unknown')=>h('span',{className:'veh-pill veh-'+tone},text);
  const field=(label,value)=>h('div',{className:'veh-field',key:label},h('dt',null,label),h('dd',null,value??'Da completare'));
  const annualValue=p=>{const a=vehicleAnnualPremium(p);return h('span',null,money(a.amountCents),h('small',{style:{display:'block'}},a.label));};
  const section=(title,children)=>h('section',{className:'veh-section'},h('h3',null,title),children);
  const link=(url,label)=>h('a',{href:url,target:'_blank',rel:'noopener noreferrer'},label);
  function VehicleDetails({v,data}) {
    const p=v.policy,a=v.agency,docs=data.documents.filter(d=>v.documentIds.includes(d.id));
    return h('div',{className:'veh-detail','data-vehicle-id':v.id},
      h('div',{className:'veh-detail-top'},h('div',null,h('span',{className:'veh-eyebrow'},v.kind==='motorcycle'?'Motociclo':'Autovettura'),h('h3',null,v.name),h('span',{className:'veh-plate'},v.plate)),h('div',{className:'veh-badges'},pill(insuranceLabels[v.insuranceState],v.insuranceState==='documented'?'ok':v.insuranceState==='suspended'?'info':'warn'),pill(inspectionLabels[v.inspectionState],v.inspectionState==='valid'?'ok':'warn'))),
      v.notices.length>0&&h('ul',{className:'veh-notices'},v.notices.map(n=>h('li',{key:n.id,className:'veh-'+n.tone},h('b',null,n.title+(n.date?' · '+date(n.date):'')),h('span',null,n.detail)))),
      section('Veicolo',h('dl',{className:'veh-fields'},field('Intestatario / contraente',v.holder),field('Prima immatricolazione',date(v.firstRegistration)),field('Alimentazione',v.fuel),field('Cilindrata / potenza',v.displacementCc!==null?v.displacementCc+' cm³':v.powerKw!==null?v.powerKw+' kW':'Da completare'))),
      section('Assicurazione',h(React.Fragment,null,h('dl',{className:'veh-fields'},field('Compagnia',p.insurer),field('Polizza',p.number),field('Prodotto',p.product),field('Decorrenza',date(p.startDate)+' · ore '+p.startTime),field('Copertura certificata fino al',p.coverageUntil?date(p.coverageUntil)+' · ore 24:00':'Certificato aggiornato da acquisire'),field('Termine contratto riportato',date(p.contractEnd)+' · ore 24:00'),field('Scadenza rata riportata',date(p.installmentDue)+' · ore 24:00'),field('Frazionamento',p.periodMonths===6?'Semestrale':'Ogni '+p.periodMonths+' mesi'),field('Tipo di guida',p.driving),field('Classe di merito',p.meritClass)),p.suspension&&h('div',{className:'veh-suspension'},h('b',null,'Sospensione: '+date(p.suspension.from)+' → '+date(p.suspension.until)),h('p',null,'Dalle ore 24:00 alle ore 24:00 delle date indicate. Copertura sospesa; dopo il termine occorre confermare la riattivazione e acquisire le nuove date. Le scadenze contrattuali sopra sono quelle del documento.')),p.notes.map((n,i)=>h('p',{className:'veh-note',key:i},n)))),
      section('Costi assicurativi',h('dl',{className:'veh-fields'},field('Premio annuo di riferimento',annualValue(p)),field('Rata netta documentata',money(p.installmentNetCents)),field('Rata lorda',money(p.installmentGrossCents)),field('Rettifica / contributo',money(p.adjustmentCents)),field('Contributo SSN incluso',money(p.ssnCents)),field('Valore assicurato del veicolo',money(p.insuredValueCents)),field('Base del premio annuo',vehicleAnnualPremium(p).detail))),
      section('Garanzie e condizioni',p.coverages.length?h('div',{className:'veh-table-scroll',tabIndex:0,'aria-label':'Garanzie di '+v.name},h('table',null,h('thead',null,h('tr',null,['Garanzia','Massimale','Premio rata + imposta','Condizioni'].map(x=>h('th',{key:x,scope:'col'},x)))),h('tbody',null,p.coverages.map((c,i)=>h('tr',{key:i},h('th',{scope:'row'},c.name),h('td',null,c.limitCents===null?'Vedi condizioni':money(c.limitCents)),h('td',null,c.premiumCents===null?'Da completare':money(c.premiumCents)+' + '+money(c.taxCents)),h('td',null,c.detail)))))):h('p',{className:'veh-note'},'Il documento di sospensione non elenca garanzie, massimali e franchigie. Serve il contratto completo.')),
      section('Revisione',h(React.Fragment,null,h('dl',{className:'veh-fields'},field('Ultima revisione',date(v.inspection.lastDate)),field('Esito',v.inspection.result===null?'Da verificare':{passed:'Regolare',repeat:'Da ripetere',suspended:'Sospesa'}[v.inspection.result]),field('Prossima scadenza',date(v.inspectionDue)),field('Chilometri rilevati',v.inspection.odometerKm===null?'Da completare':new Intl.NumberFormat('it-IT').format(v.inspection.odometerKm)+' km'),field('Costo documentato',money(v.inspection.costCents))),h('p',{className:'veh-note'},'Per questi veicoli a uso privato: prima revisione dopo quattro anni, poi ogni due anni entro il mese dell’ultima revisione regolare. Senza l’ultimo esito, una vecchia immatricolazione non determina la scadenza attuale.'),link('https://www.ilportaledellautomobilista.it/interrogazionistoricorevisioni/spa/','Verifica revisioni sul Portale dell’Automobilista'))),
      section('Pagamenti documentati',v.payments.length?h('div',{className:'veh-table-scroll'},h('table',null,h('thead',null,h('tr',null,['Data','Voce','Importo'].map(x=>h('th',{scope:'col',key:x},x)))),h('tbody',null,v.payments.map(x=>h('tr',{key:x.id},h('td',null,date(x.date)),h('td',null,x.detail),h('td',null,money(x.amountCents))))))):h('p',{className:'veh-note'},'Nessuna quietanza di pagamento disponibile. Il costo mancante non è considerato zero.')),
      section('Agenzia e assistenza',h('dl',{className:'veh-fields'},field('Agenzia',a.name),field('Referente',a.contact),field('Telefono',h('a',{href:'tel:'+a.phone.replace(/[^+\d]/g,'')},a.phone)),field('Email',h('a',{href:'mailto:'+a.email},a.email)),field('Sede',a.address),field('Orari',a.hours),field('Assistenza Italia',a.assistanceItaly?h('a',{href:'tel:'+a.assistanceItaly.replace(/[^+\d]/g,'')},a.assistanceItaly):'Non riportata'),field('Assistenza estero',a.assistanceAbroad?h('a',{href:'tel:'+a.assistanceAbroad.replace(/[^+\d]/g,'')},a.assistanceAbroad):'Non riportata'))),
      section('Documenti di riferimento',h(React.Fragment,null,h('ul',{className:'veh-documents'},docs.map(d=>h('li',{key:d.id},h('b',null,d.name),h('span',null,date(d.date)+' · '+d.pages+(d.pages===1?' pagina':' pagine')),h('details',null,h('summary',null,'Riscontro documento'),h('code',null,d.sha256))))),h('p',{className:'veh-note'},'Dati ricavati dai documenti caricati. Per aggiornare premi, sospensioni o revisione serve il relativo documento; nessun rinnovo o pagamento viene eseguito dal monitor.')))
    );
  }
  function VehicleDialog({data,current,onClose,initial}) {
    const [selected,setSelected]=React.useState(initial),ref=React.useRef(null);
    React.useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
    const v=data.vehicles.find(x=>x.id===selected);
    return h('dialog',{ref,className:'dialog dialog-wide veh-dialog','aria-labelledby':'veh-dialog-title',onCancel:e=>{e.preventDefault();onClose();},onClick:e=>{if(e.target===e.currentTarget)onClose();}},
      h('header',{className:'dialog-head'},h('div',null,h('span',{className:'dialog-kicker'},'Assicurazioni e revisioni'),h('h2',{id:'veh-dialog-title'},'I tuoi veicoli')),h('button',{type:'button',className:'dialog-close',onClick:onClose,'aria-label':'Chiudi dettagli veicoli'},'×')),
      h('div',{className:'dialog-body veh-body'},!current&&h('p',{className:'veh-notices',role:'status'},'Lettura da aggiornare: i dati sotto sono l’ultima copia disponibile, non una conferma attuale.'),
        h('nav',{className:'veh-tabs','aria-label':'Dettagli per veicolo'},h('button',{type:'button',className:!selected?'is-active':'','aria-pressed':!selected,onClick:()=>setSelected(null)},'Riepilogo e costi'),data.vehicles.map(x=>h('button',{key:x.id,type:'button',className:selected===x.id?'is-active':'','aria-pressed':selected===x.id,onClick:()=>setSelected(x.id)},x.name.split(' ').slice(0,3).join(' '),h('small',null,x.plate)))),
        v?h(VehicleDetails,{v,data}):h(React.Fragment,null,
          h('div',{className:'veh-totals'},h('div',null,h('small',null,'Riferimento annuo'),h('b',null,money(data.summary.annualReferenceCents??data.summary.annualKnownCents)),h('span',null,data.summary.annualReferenceCount!==undefined?data.summary.annualKnownCount+' attuali · '+data.summary.annualHistoricalCount+' precedenti · '+data.summary.annualEstimatedCount+' stimati':data.summary.annualKnownCount+'/'+data.summary.vehicles+' veicoli · totale parziale')),h('div',null,h('small',null,'Pagamenti documentati · '+data.calendarDate.slice(0,4)),h('b',null,data.summary.paymentCount?money(data.summary.paidThisYearCents):'Da completare'),h('span',null,data.summary.paymentCount+' quietanze · non sommare al premio annuo'))),
          h('div',{className:'veh-table-scroll',tabIndex:0,'aria-label':'Tabella costi e scadenze veicoli'},h('table',null,h('thead',null,h('tr',null,['Veicolo','Assicurazione','Revisione','Premio annuo','Rata netta','Pagato nell’anno','Revisione: costo','Dettagli'].map(x=>h('th',{scope:'col',key:x},x)))),h('tbody',null,data.vehicles.map(x=>h('tr',{key:x.id},h('th',{scope:'row'},x.name,h('small',null,x.plate)),h('td',null,insuranceLabels[x.insuranceState],h('small',null,x.policy.suspension?'Fine sospensione '+date(x.policy.suspension.until):x.policy.coverageUntil?'Copertura fino al '+date(x.policy.coverageUntil):'Certificato da acquisire')),h('td',null,x.inspectionDue?date(x.inspectionDue):inspectionLabels[x.inspectionState]),h('td',null,annualValue(x.policy)),h('td',null,money(x.policy.installmentNetCents)),h('td',null,x.payments.some(p=>p.date.slice(0,4)===data.calendarDate.slice(0,4)&&p.date<=data.calendarDate)?money(x.paidThisYearCents):'Da completare'),h('td',null,money(x.inspection.costCents)),h('td',null,h('button',{type:'button',className:'veh-action',onClick:()=>setSelected(x.id),'aria-label':'Dettagli '+x.name},'Apri →'))))))),
          h('p',{className:'veh-note'},'Il riferimento annuo include gli importi dei contratti precedenti e le rate annualizzate, indicati in tabella. Le stime suppongono una tariffa invariata e richiedono conferma; sospensioni e rinnovi possono cambiare la spesa effettiva. I pagamenti sono conteggiati separatamente.'),
          section('Prossime scadenze nei documenti',h('ul',{className:'veh-deadlines'},data.vehicles.flatMap(x=>x.deadlines.map(n=>({...n,vehicle:x}))).sort((a,b)=>a.date.localeCompare(b.date)).map(n=>h('li',{key:n.id},h('span',null,date(n.date)),h('div',null,h('b',null,n.vehicle.name+' · '+n.title),h('small',null,n.days<0?'Superata: conferma necessaria':n.days===0?'Oggi':n.days+' giorni')),h('button',{type:'button',className:'veh-action',onClick:()=>setSelected(n.vehicle.id)},'Dettagli'))))),
          section('Monitor',h(React.Fragment,null,h('p',null,'Ultimo controllo automatico: '+stamp(data.monitor.checkedAt)+(data.monitor.state==='ok'?'':' · da verificare')),h('p',{className:'veh-note'},'Controllo server ogni minuto, aggiornamento della card ogni 5 minuti e al ritorno alla pagina. Avvisi in dashboard a 60, 30, 15, 7, 1 e 0 giorni e dopo la scadenza. '+data.detail),h('p',{className:'veh-note'},'Registro aggiornato il '+stamp(data.registryUpdatedAt))))
        )));
  }
  return function VehicleCard({user,now=Date.now()}) {
    const [data,setData]=React.useState(null),[error,setError]=React.useState(false),[open,setOpen]=React.useState(false),[selected,setSelected]=React.useState(null);
    React.useEffect(()=>{
      setData(null);setError(false);setOpen(false);if(!user)return;
      const poll=createPolling({intervalMs:REFRESH,timeoutMs:20_000,task:async({signal,alive})=>{
        try {
          const response=await authenticatedRead(user,API,signal);
          if(!response.ok)throw Error('read_failed');
          const next=await response.json();if(!await verifyVehicleSnapshot(next))throw Error('invalid_snapshot');
          if(alive()){setData(next);setError(false);}
        }catch{if(alive())setError(true);}
      }});
      return()=>poll.stop();
    },[user]);
    const current=!error&&vehicleSnapshotCurrent(data,now),summary=data?.summary;
    const monitorCurrent=current&&data.monitor.state==='ok'&&now-Date.parse(data.monitor.checkedAt)<10*60_000;
    const openVehicle=id=>{setSelected(id);setOpen(true);};
    return h(React.Fragment,null,h('section',{className:'card veh-card','aria-label':'Monitor veicoli e motocicli','data-monitor-state':!current?'unknown':monitorCurrent?'ok':'warn'},
      h('header',{className:'card-head'},h('h3',null,'Veicoli'),h('span',{className:'veh-monitor '+(monitorCurrent?'veh-ok':'veh-warn'),title:'Ultimo controllo: '+stamp(data?.monitor?.checkedAt)},h('i',null),monitorCurrent?'Monitor attivo':data?'Monitor da verificare':'Collegamento…')),
      h('div',{className:'veh-card-summary'},h('b',null,summary?summary.vehicles+' mezzi':'—'),h('span',null,current?summary.overdue?summary.overdue+' scadenze da verificare':summary.dueSoon?summary.dueSoon+' scadenze entro 60 giorni':summary.suspended+' polizze sospese':'Dati da aggiornare')),
      data&&h('div',{className:'veh-quick'},data.vehicles.map(v=>h('button',{type:'button',key:v.id,onClick:()=>openVehicle(v.id),'aria-label':'Dettagli '+v.name},h('span',null,v.name.split(' ').slice(0,3).join(' ')),h('small',null,current?(v.insuranceState==='suspended'?'Sospesa':v.insuranceState==='documented'?'Copertura documentata':'Da verificare'):'Da aggiornare')))),
      h('footer',{className:'veh-card-foot'},h('span',null,current&&summary.missingInspections?summary.missingInspections+' revisioni da verificare':error?'Lettura non riuscita':'Assicurazioni e revisioni'),h('button',{type:'button',className:'veh-action',disabled:!data,onClick:()=>openVehicle(null)},'Costi e dettagli →'))),open&&data&&h(VehicleDialog,{data,current,onClose:()=>setOpen(false),initial:selected}));
  };
}
