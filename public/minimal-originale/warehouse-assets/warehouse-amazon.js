// Verified daily receipts; no network requests, storage or layout changes.
function italyDate(now=new Date()){return new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Rome"}).format(now)}



export function salesSeries(today       , history                              , days                  , current                                   )              {
  const noon=Date.parse(today+'T12:00:00Z'), amazon=new Map((history?.days??[]).map(d=>[d.date,d])), shopify=new Map(days.map(d=>[d.date,d.totalSales]));
  return Array.from({length:30},(_,i)=>{
    const date=new Date(noon+(i-29)*86400000).toISOString().slice(0,10),row=amazon.get(date);
    const a=date===today?current?.amazon??null:row?.orderedProductSales??null,b=date===today?current?.bionee??null:shopify.get(date)??null;
    return {date,amazon:a,bionee:b,value:a===null||b===null?null:(Math.round(a*100)+Math.round(b*100))/100,
      ...(row?.provisional?{amazonProvisional:true}:{}),...(row?.observedAt?{amazonObservedAt:row.observedAt}:{}),...(row?.sha256?{amazonReceiptSha256:row.sha256}:{}),
      ...(date!==today&&a===null&&history?.missingDates?.includes(date)?{amazonPending:true}:{})};
  });
}

// Receipt integrity is checked by the authenticated API before exposing this view.
// Never use another account/scope, future day or an invalid archive to fill a gap.
export function scopedAmazonHistory(history                                  ,scope                 ="italy",continuity                  )                     {
  const source=history&&(history.scope==='global')===(scope==='global')?history:null;
  if(scope!=='global'||!continuity||!['ok','pending'].includes(continuity.state))return source;
  const days=new Map                   ((source?.days??[]).map(d=>[d.date,d]));
  for(const row of continuity.days){
    if(row.date>=continuity.date)continue;
    const official=days.get(row.date);
    if(official){
      if(row.kind==='consolidated'&&row.orderedProductSales===official.orderedProductSales)days.set(row.date,{...official,observedAt:row.observedAt,sha256:row.sha256});
    }else days.set(row.date,{date:row.date,orderedProductSales:row.orderedProductSales,provisional:row.kind==='intraday',observedAt:row.observedAt,sha256:row.sha256});
  }
  return {...(source??{scope:'global'         ,observedAt:continuity.days.map(d=>d.observedAt).sort().at(-1)??''}),days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),missingDates:continuity.missingDates};
}
export function amazonDayLabel(p           ,today       ){
  return p.date===today?'Oggi · parziale':p.amazonProvisional?'Amazon provvisorio':p.amazonPending?'Amazon in consolidamento':p.amazon===null?'Amazon in attesa':p.bionee===null?'Bionee in attesa':'Disponibile';
}
export function amazonDayProof(p           ){
  return p.amazonReceiptSha256?(p.amazonProvisional?'Ultima lettura parziale: ':'Lettura consolidata: ')+(p.amazonObservedAt??'')+' · SHA-256 '+p.amazonReceiptSha256:'';
}


const recent = (at                           , limit        , now        ) => {
  const age = now - Date.parse(at ?? '');
  return Number.isFinite(age) && age >= -30_000 && age <= limit;
};
const amount = (n                           )              => typeof n === 'number' && Number.isFinite(n);
const sum = (values          ) => values.reduce((n, v) => n + Math.round(v * 100), 0) / 100;

// Same scope, cents, channel exclusions and source validity as the Control Center.
// Missing inputs stay missing; historical data remains readable with its source age.
export function warehouseBusiness(data                        , now = Date.now()) {
  const today = italyDate(new Date(now));
  const stale = !recent(data?.generatedAt, 180_000, now);
  const amazon = data?.services.find(s => s.id === 'amazon')?.sales;
  const shopify = data?.shopify;
  const amazonFresh = !stale && amazon?.state === 'ok' && amazon.snapshot?.date === today
    && recent(amazon.snapshot.observedAt, 360_000, now) && amount(amazon.snapshot.orderedProductSales);
  const shopifyFresh = !stale && shopify?.state === 'ok' && shopify.date === today && shopify.today?.date === today
    && recent(shopify.updatedAt, 1_200_000, now) && amount(shopify.today?.totalSales);
  const sale = amazonFresh ? amazon .snapshot  : null;
  const shopSale = shopifyFresh ? shopify .today  : null;
  const combined = sale && shopSale ? sum([sale.orderedProductSales, shopSale.totalSales]) : null;
  const history = scopedAmazonHistory(amazon?.dailyHistory, amazon?.scope ?? 'italy', amazon?.continuity);
  const points = salesSeries(today, history, shopify?.days ?? [], sale && shopSale ? {amazon: sale.orderedProductSales, bionee: shopSale.totalSales} : null);
  const completeDays = points.filter(p => p.value !== null).length;
  const provisionalDays = points.filter(p => p.amazonProvisional).length;
  const closed = points.slice(0, -1), values = closed.flatMap(p => p.value === null || p.amazonProvisional ? [] : [p.value]);
  const period = completeDays === 30 && provisionalDays === 0 ? sum(points.map(p => p.value )) : null;
  const average = values.length ? sum(values) / values.length : null;
  const best = closed.reduce                   ((best, p) => p.value !== null && !p.amazonProvisional && (!best || p.value > best.value ) ? p : best, null);
  const yesterday = points.at(-2), week = points.slice(-9, -2);
  const weekAverage = week.length === 7 && week.every(p => p.value !== null && !p.amazonProvisional) ? sum(week.map(p => p.value )) / 7 : null;
  const rawDelta = yesterday?.value != null && !yesterday.amazonProvisional && weekAverage ? (yesterday.value - weekAverage) / weekAverage * 100 : null;
  const delta = rawDelta !== null && Math.abs(rawDelta) < 1e-9 ? 0 : rawDelta;
  const movingAverage = points.map((_, i) => {
    if (i < 6 || i === points.length - 1) return null;
    const w = points.slice(i - 6, i + 1);
    return w.every(p => p.value !== null && !p.amazonProvisional) ? sum(w.map(p => p.value )) / 7 : null;
  });
  const historyFresh = recent(history?.observedAt, 7_200_000, now);
  const billing = data?.billing, billingCurrent = billing?.month === today.slice(0, 7);
  const costTotal = billingCurrent && billing?.complete && amount(billing.total) ? billing.total : null;
  return {today, stale, amazon, shopify, sale, shopSale, combined, points, completeDays, provisionalDays, closedDays: values.length,
    period, average, best, delta, movingAverage, historyFresh, amazonFresh, shopifyFresh,
    sourcesFresh: amazonFresh && shopifyFresh && historyFresh && completeDays === 30 && provisionalDays === 0,
    billing, billingCurrent, costTotal};
}
