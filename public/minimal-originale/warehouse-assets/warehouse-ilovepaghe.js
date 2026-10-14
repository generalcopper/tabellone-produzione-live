// Read-only cockpit mounted by the authenticated, approved warehouse application.
// React and the current Firebase user are passed by the existing app: no second login.
const API = 'https://crm-api-62sidjxd5a-ew.a.run.app/v1/control-center/ilovepaghe';
const REFRESH = 15 * 60_000;
// Same page rotation as the other monitor lists (queues, FBA stock).
const PAGE_MS = 12_000;
// Single-screen mode: must stay identical to the query used by the warehouse bundle.
const FIT = '(min-width: 1100px) and (min-height: 760px) and (min-aspect-ratio: 5/4)';
const number = n => Number.isInteger(n) && n >= 0 ? new Intl.NumberFormat('it-IT').format(n) : '—';
const day = now => new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const clock = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('it-IT', {timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '—';
const nameKey = name => String(name ?? '').trim().toLocaleLowerCase('it-IT');

// Ranked companies with today's successful sends next to each one.
// A send that matches no ranked company is kept as an unranked row, never dropped.
function rowsOf(data, today) {
  const sent = today ? data.todayCompanies : [];
  const byId = new Map(sent.map(c => [c.id, c])), byName = new Map(sent.map(c => [nameKey(c.name), c])), used = new Set();
  const rows = data.companies.map((c, i) => {
    const t = byId.get(c.id) ?? byName.get(nameKey(c.name)) ?? null;
    if (t) used.add(t);
    return {id: 'c:' + c.id, rank: String(i + 1).padStart(2, '0'), name: c.name, employees: c.employees, today: t};
  });
  for (const t of sent) if (!used.has(t)) rows.push({id: 't:' + t.id, rank: '—', name: t.name, employees: null, today: t});
  return rows;
}

export function createILPCockpit(React) {
  const h = React.createElement;
  const useFit = () => {
    const [fit, setFit] = React.useState(() => typeof window !== 'undefined' && window.matchMedia(FIT).matches);
    React.useEffect(() => {
      const m = window.matchMedia(FIT), sync = () => setFit(m.matches);
      sync(); m.addEventListener('change', sync);
      return () => m.removeEventListener('change', sync);
    }, []);
    return fit;
  };
  // Rows that fit in the list without clipping (the list takes the space left in the column).
  const useSlots = (ref, fit, count, level) => {
    const [slots, setSlots] = React.useState(Math.max(1, count));
    React.useLayoutEffect(() => {
      const el = ref.current;
      if (!el || !fit) { setSlots(Math.max(1, count)); return; }
      const measure = () => {
        const row = el.querySelector('[data-row]');
        if (!row || row.offsetHeight <= 0) return;
        const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
        setSlots(Math.max(1, Math.floor((el.clientHeight + gap + 1) / (row.offsetHeight + gap))));
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, [fit, count, level]);
    return slots;
  };

  // Full table on demand (same dialog style as the other cockpit details).
  function Details({data, rows, employees, today, onClose}) {
    const ref = React.useRef(null);
    React.useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); return () => d?.close(); }, []);
    return h('dialog', {ref, className: 'dialog dialog-wide ilp-dialog', onCancel: onClose, onClick: e => e.target === e.currentTarget && onClose()},
      h('header', {className: 'dialog-head'},
        h('div', null, h('span', {className: 'dialog-kicker'}, 'iLovePaghe · lettura ' + clock(data.generatedAt)), h('h2', null, 'Aziende e cedolini')),
        h('button', {type: 'button', className: 'dialog-close', onClick: onClose, 'aria-label': 'Chiudi'}, '×')),
      h('p', {className: 'dialog-note'}, number(data.activeCompanies) + ' aziende attive · ' + number(data.activeAccounts) + ' abbonamenti attivi · rubrica abilitata · ' + number(employees) + ' dipendenti delle aziende in classifica.'),
      h('div', {className: 'table-scroll'}, h('table', {className: 'data-table'},
        h('thead', null, h('tr', null, h('th', {scope: 'col'}, 'Azienda'), h('th', {scope: 'col'}, 'Dipendenti'), h('th', {scope: 'col'}, 'Cedolini oggi'), h('th', {scope: 'col'}, 'Destinatari oggi'))),
        h('tbody', null, rows.map(r => h('tr', {key: r.id},
          h('th', {scope: 'row'}, (r.rank === '—' ? '' : r.rank + ' · ') + r.name),
          h('td', null, number(r.employees)),
          h('td', null, r.today ? h('strong', null, number(r.today.sends)) : today ? '0' : '—'),
          h('td', null, r.today ? number(r.today.employees) : today ? '0' : '—')))))),
      h('p', {className: 'dialog-foot'}, [data.definitions?.employees, data.definitions?.sent].filter(Boolean).join(' · ') || 'Firebase · sola lettura · aggiornamento ogni 15 minuti.'));
  }

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
    const rows = data ? rowsOf(data, today) : [];
    const sentCompanies = today ? data.todayCompanies.length : 0;
    const top = Math.max(1, ...rows.map(r => r.employees ?? 0));
    const [details, setDetails] = React.useState(false);

    // Density: the card always keeps its place in the column. When security or services need more room
    // (open issues), the ranking steps aside first, then the footnotes; everything returns as soon as space frees up.
    const cardRef = React.useRef(null), listRef = React.useRef(null), fit = useFit();
    const [level, setLevel] = React.useState(0);
    React.useLayoutEffect(() => {
      const el = cardRef.current;
      if (!el || !fit) { setLevel(0); return; }
      let width = -1, height = -1;
      const observer = new ResizeObserver(([entry]) => {
        const {width: w, height: hh} = entry.contentRect;
        if (Math.abs(w - width) > .5 || Math.abs(hh - height) > .5) { width = w; height = hh; setLevel(0); }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }, [fit]);
    React.useLayoutEffect(() => { setLevel(0); }, [data?.generatedAt, today, stale]);
    React.useLayoutEffect(() => {
      const el = cardRef.current;
      if (!el || !fit || level >= 3) return;
      const list = listRef.current, row = list?.querySelector('[data-row]');
      // a one-row rotating list says little: below two rows the ranking steps aside (the full table stays one click away)
      const noRoomForRows = level === 0 && !!row && list.clientHeight + 1 < 2 * row.offsetHeight;
      if (noRoomForRows || el.scrollHeight > el.clientHeight + 1) setLevel(level + 1);
    });

    const slots = useSlots(listRef, fit, rows.length, level);
    const pages = fit ? Math.max(1, Math.ceil(rows.length / slots)) : 1;
    const [anchor, setAnchor] = React.useState(() => Date.now());
    React.useEffect(() => setAnchor(Date.now()), [data?.generatedAt, slots]);
    const page = pages > 1 ? Math.floor(Math.max(0, now - anchor) / PAGE_MS) % pages : 0;
    const shown = fit ? rows.slice(page * slots, page * slots + slots) : rows;

    const tone = !data ? (error ? 'warn' : 'unknown') : stale ? 'warn' : 'ok';
    const status = !data ? (error ? 'Da aggiornare' : 'Collegamento…') : stale ? 'Da aggiornare' : 'Sola lettura';
    const kpi = (value, label, sub, title, detailsLink = false) => h('div', {title}, h('span', null, detailsLink && data && level > 0 ? h('button', {type:'button',className:'link',onClick:()=>setDetails(true),'aria-label':'Tutte le aziende e gli invii di oggi'}, label + ' ↗') : label), h('strong', null, value), h('small', null, sub));
    const levels = level ? ' ' + Array.from({length: level}, (_, i) => 'ilp-l' + (i + 1)).join(' ') : '';

    return h('section',{className:'card ilp ilp-cockpit'+levels, ref:cardRef, 'aria-label':'Cockpit iLovePaghe'},
      h('header',{className:'card-head'},
        h('h3',null,'iLovePaghe'),
        h('div',{className:'card-meta'},h('span',{className:'state tone-'+tone},h('i',{'aria-hidden':'true'}),status))),
      h('div',{className:'ilp-kpis'},
        kpi(data?number(data.activeCompanies):'—','Aziende attive',data?number(data.activeAccounts)+' abbonamenti attivi':'Collegamento a Firebase…',data?number(data.activeAccounts)+' abbonamenti attivi · rubrica abilitata':undefined, true),
        kpi(data?number(employees):'—','Dipendenti','aziende in classifica',data?.definitions?.employees ?? 'Dipendenti delle aziende in classifica'),
        h('div',{className:'ilp-kpi-today'+(today&&data.sentToday>0?' is-sent':''),title:(data?.definitions?.sent?data.definitions.sent+' · ':'')+(today&&sentCompanies?'Invii riusciti · '+number(data.recipientsToday)+' destinatari':today?'Nessun invio riuscito registrato oggi.':'In attesa dei dati di oggi')},
          h('span',null,'Cedolini inviati oggi'),
          h('strong',null,today?number(data.sentToday):'—'),
          h('small',null,!data?'—':!today?'In attesa dei dati di oggi':sentCompanies?number(data.recipientsToday)+' destinatari · '+number(sentCompanies)+(sentCompanies===1?' azienda':' aziende'):'Nessun invio riuscito oggi'))),
      h('h4',{className:'subhead'},
        data ? h('button',{type:'button',className:'link',onClick:()=>setDetails(true),'aria-label':'Tutte le aziende e gli invii di oggi'},'Aziende per dipendenti ',h('span',{'aria-hidden':'true'},'↗')) : h('span',null,'Aziende per dipendenti'),
        h('span',null,data?number(data.companies.length)+(data.companies.length===1?' azienda':' aziende')+(pages>1?' · pagina '+(page+1)+' di '+pages:''):'')),
      h('ol',{className:'ilp-list'+(sentCompanies?' has-sent':''),ref:listRef,'aria-label':'Aziende ordinate per numero di dipendenti'},
        shown.map((r,i)=>h('li',{className:'ilp-row'+(r.today?' is-sent':''),key:r.id+':'+page,'data-row':true,style:{'--i':i},
            title:r.name+(r.employees===null?'':' · '+number(r.employees)+' dipendenti')+(r.today?' · oggi '+number(r.today.sends)+' cedolini a '+number(r.today.employees)+' dipendenti':'')},
          h('em',null,r.rank),
          h('b',null,r.name),
          h('i',{'aria-hidden':'true'},h('b',{style:{transform:'scaleX('+((r.employees??0)/top)+')'}})),
          h('strong',null,number(r.employees)),
          h('span',{className:'ilp-sent'},r.today?number(r.today.sends)+' oggi':''))),
        !rows.length&&h('li',{className:'empty'},data?'Nessuna azienda in classifica.':'In attesa dei dati iLovePaghe')),
      h('footer',{className:'card-foot'},
        h('span',stale?{className:'ilp-stale',role:'status'}:null,stale?'Ultimo aggiornamento non riuscito · dati dell’ultima lettura':'Firebase · sola lettura · ogni 15 min'),
        h('span',null,'Lettura '+clock(data?.generatedAt))),
      details&&data&&h(Details,{data,rows,employees,today,onClose:()=>setDetails(false)})
    );
  };
}
