// Read-only cockpit mounted by the authenticated, approved warehouse application.
// React and the current Firebase user are passed by the existing app: no second login.
const API = 'https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/ilovepaghe';
const REFRESH = 15 * 60_000;
const number = n => Number.isInteger(n) && n >= 0 ? new Intl.NumberFormat('it-IT').format(n) : '—';
const day = now => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const clock = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '—';
export function createILPCockpit(React) {
  const h = React.createElement;
  return function ILPCockpit({user,now=Date.now()}) {
    const [data,setData] = React.useState(null), [error,setError] = React.useState(false);
    React.useEffect(() => {
      let active = true, pending = false, lastAttempt = 0, controller;
      setData(null); setError(false);
      if (!user) return;
      const poll = async () => {
        if (!active || pending || document.visibilityState === 'hidden' || Date.now()-lastAttempt < REFRESH) return;
        pending = true; lastAttempt = Date.now(); controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(),30000);
        try {
          const token = await user.getIdToken();
          if (!active) return;
          const r = await fetch(API, {headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
          if (!r.ok) throw Error('source');
          const next = await r.json();
          if (next.version !== 1 || !Array.isArray(next.companies) || !Array.isArray(next.todayCompanies) || !Number.isFinite(Date.parse(next.generatedAt))) throw Error('snapshot');
          if (active) {setData(next);setError(next.state !== 'ok');}
        } catch {if(active)setError(true);}
        finally {clearTimeout(timeout);pending=false;}
      };
      void poll(); const timer=setInterval(poll,REFRESH);
      const visible=()=>{if(document.visibilityState==='visible')void poll();};
      document.addEventListener('visibilitychange',visible);
      return ()=>{active=false;controller?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
    },[user]);
    const stale=error||!!data&&Date.parse(data.expiresAt)<now, today=!!data&&data.date===day(now);
    const employees=data?.companies.reduce((total,company)=>total+company.employees,0);
    return h('section',{className:'ilp-cockpit card', 'aria-label':'Cockpit iLovePaghe'},
      h('div',{className:'ilp-title'},h('div',null,h('h2',null,'iLovePaghe'),h('span',null,'Aziende e cedolini')),h('span',{className:'ilp-badge'+(stale?' ilp-stale':'')},stale?'Da aggiornare':'Sola lettura')),
      h('div',{className:'ilp-kpis'},h('div',null,h('strong',null,data?number(data.activeCompanies):'—'),h('span',null,'Aziende attive')),h('div',{title:'Dipendenti delle aziende in classifica'},h('strong',null,data?number(employees):'—'),h('span',null,'Dipendenti'))),
      h('div',{className:'ilp-source-note',title:data?.definitions?.employees},data?number(data.activeAccounts)+' abbonamenti attivi · rubrica abilitata':'Collegamento a Firebase…'),
      h('div',{className:'ilp-table-wrap',tabIndex:0,'aria-label':'Aziende ordinate per numero di dipendenti'},h('table',null,h('thead',null,h('tr',null,h('th',{scope:'col'},'Azienda'),h('th',{scope:'col'},'Dipendenti'))),h('tbody',null,data?.companies.map((c,i)=>h('tr',{key:c.id},h('td',{title:c.name},h('span',{className:'ilp-rank'},i+1),c.name),h('td',null,number(c.employees))))))),
      h('div',{className:'ilp-today-heading'},h('h3',null,'Inviate oggi'),h('strong',null,today?number(data.sentToday):'—')),
      h('p',{className:'ilp-source-note',title:data?.definitions?.sent},today?'Invii riusciti · '+number(data.recipientsToday)+' destinatari':'In attesa dei dati di oggi'),
      h('div',{className:'ilp-today-list',tabIndex:0,'aria-label':'Invii per azienda di oggi'},today&&data.todayCompanies.length?data.todayCompanies.map(c=>h('div',{className:'ilp-send-row',key:c.id},h('b',null,c.name),h('span',null,'Oggi ',h('strong',null,number(c.sends)),' cedolini a ',h('strong',null,number(c.employees)),' dipendenti'))):h('p',{className:'ilp-source-note'},today?'Nessun invio riuscito registrato oggi.':'—')),
      h('footer',{className:'ilp-footer'},h('span',null,'Firebase · ogni 15 min'),h('span',null,'Lettura '+clock(data?.generatedAt))),
      stale&&h('p',{className:'ilp-association',role:'status'},'Ultimo aggiornamento non riuscito. I dati riportano l’orario dell’ultima lettura.')
    );
  };
}
