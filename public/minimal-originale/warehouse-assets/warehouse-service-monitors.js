// Presentation only: consume the existing authenticated service checks without extra reads.
const DEFINITIONS={
  picking:[
    {id:'whatsapp',name:'WhatsApp',short:'WA',labels:['NUC · WhatsApp Picking'],maxAge:420000},
    {id:'voice',name:'Voce NUC',short:'Voce',labels:['NUC · voce capannone'],maxAge:120000}
  ],
  bionee:[{id:'folia',name:'Folia locale',short:'Folia',labels:['Folia · generatore locale'],maxAge:300000}],
  lgtrading:[{id:'voip',name:'Centralino VoIP',short:'VoIP',labels:['Centralino · Asterisk','Centralino · linea','Centralino · telefoni'],maxAge:300000}]
};
export const stateLabel={ok:'Operativo',warn:'Attenzione',down:'Non disponibile',unknown:'Da verificare'};
const timestamp=v=>typeof v==='string'?Date.parse(v):NaN;
const observed=(at,now,maxAge)=>Number.isFinite(timestamp(at))&&timestamp(at)<=now+30000&&now-timestamp(at)<maxAge;
const priority={down:0,warn:1,unknown:2,ok:3};
export const hasServiceMonitors=service=>!!DEFINITIONS[service?.id];
export function serviceMonitors(service,now=Date.now()){
  const fresh=observed(service?.checkedAt,now,360000)&&timestamp(service?.expiresAt)>now;
  return (DEFINITIONS[service?.id]??[]).map(def=>{
    const rows=def.labels.map(label=>{
      const matches=(service.checks??[]).filter(c=>c.label===label),source=matches.length===1?matches[0]:null;
      const live=fresh&&source&&observed(source.checkedAt,now,def.maxAge)&&Object.hasOwn(stateLabel,source.state);
      return {label,state:live?source.state:'unknown',
        detail:!source?'Segnale non disponibile':!live?'Segnale scaduto o da aggiornare':typeof source.detail==='string'?source.detail:'Dettaglio non disponibile',
        checkedAt:source?.checkedAt??null,source};
    });
    const state=rows.map(r=>r.state).sort((a,b)=>priority[a]-priority[b])[0]??'unknown';
    return {id:def.id,name:def.name,short:def.short,state,rows};
  });
}
export function serviceMonitorTitle(service,now){
  return service?.name+' · '+serviceMonitors(service,now).map(g=>g.name+': '+stateLabel[g.state]).join(' · ')+' · Apri dettagli';
}
const displayTime=value=>{
  const at=timestamp(value);
  return Number.isFinite(at)?new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(at):'Non disponibile';
};
export function createServiceMonitorDetails(React){
  const h=React.createElement;
  function Name({service,now}){
    const groups=serviceMonitors(service,now);
    if(!groups.length)return service.name;
    return h('span',{className:'wsm-label'},h('span',{className:'wsm-name'},service.name),
      h('span',{className:'wsm-tags','aria-hidden':true},groups.map(g=>h('span',{key:g.id,className:'wsm-tag tone-'+g.state,title:g.name+' · '+stateLabel[g.state]},g.short))));
  }
  function Details({service,now,onClose,onProof}){
    const ref=React.useRef(null);
    React.useEffect(()=>{
      const active=document.activeElement,dialog=ref.current;dialog?.showModal();
      return ()=>{dialog?.close();active?.focus?.();};
    },[]);
    const groups=serviceMonitors(service,now),used=new Set(groups.flatMap(g=>g.rows.map(r=>r.label)));
    const other=(service?.checks??[]).filter(c=>!used.has(c.label));
    const row=r=>h('div',{className:'wsm-row tone-'+r.state,key:r.label},
      h('div',null,r.labelShown!==null&&h('strong',null,r.label==='Centralino · Asterisk'?'Motore telefonico':r.label.replace(/^Centralino · /,'')),h('p',null,r.detail),h('small',null,'Ultima lettura: '+displayTime(r.checkedAt))),
      h('span',{className:'wsm-state'},h('i',{className:'dot','aria-hidden':true}),stateLabel[r.state]));
    return h('dialog',{ref,className:'dialog wsm-dialog','aria-labelledby':'wsm-title',onCancel:e=>{e.preventDefault();onClose();},onClick:e=>{if(e.target===e.currentTarget)onClose();}},
      h('header',{className:'dialog-head'},h('div',null,h('span',{className:'dialog-kicker'},'Servizi'),h('h2',{id:'wsm-title'},service?.name??'Monitoraggi')),
        h('button',{type:'button',className:'dialog-close','aria-label':'Chiudi',onClick:onClose},'×')),
      h('div',{className:'dialog-body'},
        groups.length?h('div',{className:'wsm-groups'},groups.map(g=>h('section',{className:'wsm-group tone-'+g.state,key:g.id,'aria-label':g.name},
          h('h3',null,g.name),g.rows.map(r=>row({...r,labelShown:g.rows.length===1?null:r.label}))))):h('p',null,'Segnale del servizio non disponibile.'),
        other.length>0&&h('details',{className:'wsm-other',open:other.some(c=>c.state!=='ok')||timestamp(service?.expiresAt)<=now},h('summary',null,'Altri controlli ('+other.length+')'),
          other.map(c=>row({...c,state:observed(service?.checkedAt,now,360000)&&timestamp(service?.expiresAt)>now&&observed(c.checkedAt,now,360000)&&Object.hasOwn(stateLabel,c.state)?c.state:'unknown'}))),
        service&&h('footer',{className:'wsm-footer'},h('button',{type:'button',className:'link',onClick:()=>{onClose();onProof({title:service.name,value:service});}},'Riscontro tecnico'))));
  }
  Details.Name=Name;return Details;
}
