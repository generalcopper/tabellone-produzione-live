// Bounded reads for long-running dashboards. Freshness/signature checks stay in the caller.
export function withSignal(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted','AbortError'));
  return new Promise((resolve,reject) => {
    const aborted=()=>reject(signal.reason ?? new DOMException('Aborted','AbortError'));
    signal.addEventListener('abort',aborted,{once:true});
    Promise.resolve(promise).then(resolve,reject).finally(()=>signal.removeEventListener('abort',aborted));
  });
}

export async function authenticatedRead(user,url,signal,fetcher=fetch) {
  const read=async force=>{
    const token=await withSignal(Promise.resolve().then(()=>user.getIdToken(force)),signal);
    signal.throwIfAborted();
    return withSignal(fetcher(url,{headers:{Authorization:'Bearer '+token},cache:'no-store',signal}),signal);
  };
  const response=await read(false);
  if (response.status!==401) return response;
  await response.body?.cancel().catch(()=>{});
  return read(true);
}

export function createPolling({task,intervalMs,timeoutMs,document:doc=document,window:win=window,timers=globalThis}) {
  let active=true,current=null;
  const run=async()=>{
    if (!active || current || doc.visibilityState==='hidden') return;
    const attempt={controller:new AbortController()}; current=attempt;
    const timeout=timers.setTimeout(()=>attempt.controller.abort(new DOMException('Read timed out','TimeoutError')),timeoutMs);
    try {
      await withSignal(Promise.resolve().then(()=>task({signal:attempt.controller.signal,alive:()=>active&&current===attempt})),attempt.controller.signal);
    } catch {
      // Individual feeds report errors; an interrupted read must not stop subsequent polling.
    } finally {
      timers.clearTimeout(timeout);
      if (current===attempt) current=null;
    }
  };
  const resume=()=>{if(doc.visibilityState!=='hidden')void run();};
  const interval=timers.setInterval(()=>void run(),intervalMs);
  doc.addEventListener('visibilitychange',resume);
  for(const event of ['online','pageshow','focus'])win.addEventListener(event,resume);
  void run();
  return {run,stop(){
    active=false;current?.controller.abort();current=null;
    timers.clearInterval(interval);
    doc.removeEventListener('visibilitychange',resume);
    for(const event of ['online','pageshow','focus'])win.removeEventListener(event,resume);
  }};
}
