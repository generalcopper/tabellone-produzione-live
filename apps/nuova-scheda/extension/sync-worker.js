import {defaults} from './shortcuts.js';
import {PREFIX,META,STORE,VIEW,merge,visible,seed,change,items,validRecord} from './sync-engine.js';

const RETRY='lg-shortcuts.sync-retry';
let queue=Promise.resolve();
let state;
let loaded=false;
function serial(task) {
  const result=queue.then(task);
  queue=result.catch(()=>{});
  return result;
}
async function persist(status='saved') {
  state.status=status;
  await chrome.storage.local.set({
    [STORE]:state,
    [VIEW]:{version:1,shortcuts:visible(state.records),status}
  });
}
function filterRecords(values) {
  return Object.fromEntries(Object.entries(values).filter(([key,value])=>key.startsWith(PREFIX)&&validRecord(key,value)));
}
async function initialize(initial) {
  if (loaded && (state.initialized || !initial)) return;
  const saved=loaded ? state : (await chrome.storage.local.get(STORE))[STORE];
  if (saved?.v===1) state=saved;
  else state={v:1,client:crypto.randomUUID(),clock:0,records:{},pending:{},initialized:false};
  if (initial && !state.initialized) {
    state.records=seed(items(initial),defaults);
    state.initialized=true;
  }
  const remote=await chrome.storage.sync.get(null);
  const records=filterRecords(remote);
  // Remote state is authoritative for a new installation. A blank account
  // starts from the existing local list, never from deleted factory defaults.
  if (!saved && remote[META]?.v===1) {
    state.records=records;
    state.initialized=true;
  } else {
    state.records=merge(state.records,records);
    if (remote[META]?.v===1) state.initialized=true;
  }
  for (const [key,value] of Object.entries(state.records)) {
    if (JSON.stringify(value)!==JSON.stringify(remote[key])) state.pending[key]=value;
    else delete state.pending[key];
  }
  if (state.initialized && !remote[META]) state.pending[META]={v:1};
  if (state.initialized) await persist(Object.keys(state.pending).length?'pending':'saved');
  loaded=true;
}
async function flush() {
  if (!state?.initialized) return;
  const pending={...state.pending};
  if (!Object.keys(pending).length) return persist('saved');
  try {
    for (const [key,value] of Object.entries(pending)) {
      if (new TextEncoder().encode(key+JSON.stringify(value)).length>chrome.storage.sync.QUOTA_BYTES_PER_ITEM) {
        throw new Error('Una scorciatoia supera lo spazio disponibile per la sincronizzazione Chrome.');
      }
    }
    await chrome.storage.sync.set(pending);
    for (const [key,value] of Object.entries(pending)) {
      if (JSON.stringify(state.pending[key])===JSON.stringify(value)) delete state.pending[key];
    }
    await persist(Object.keys(state.pending).length?'pending':'saved');
    await chrome.alarms.clear(RETRY);
  } catch (error) {
    await persist('pending');
    await chrome.alarms.create(RETRY,{delayInMinutes:1});
    console.warn('Sincronizzazione scorciatoie in attesa:',error.message);
  }
}
async function handle(message) {
  await initialize(message.initial);
  if (message.type==='lg-shortcuts-change' && !state.applied?.[message.operationId]) {
    if (typeof message.operationId!=='string' || !/^[a-f0-9-]{36}$/.test(message.operationId)) throw new Error('Operazione non valida.');
    if (!state.initialized) throw new Error('Sincronizzazione non inizializzata.');
    const previous=state.records;
    const result=change(previous,message.before,message.next,state.client,state.clock);
    state.records=result.records;state.clock=result.clock;
    state.applied ||= {};state.applied[message.operationId]=result.clock;
    for (const [key,value] of Object.entries(state.records)) {
      if (JSON.stringify(value)!==JSON.stringify(previous[key])) state.pending[key]=value;
    }
    // Persist before starting the sync write, so closing a tab or going offline
    // cannot discard a user change.
    await persist('pending');
  }
  await flush();
  return {ok:true,version:1,shortcuts:visible(state.records),status:state.status};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (sender.id!==chrome.runtime.id || !['lg-shortcuts-init','lg-shortcuts-change','lg-shortcuts-refresh'].includes(message?.type)) return;
  serial(()=>handle(message)).then(respond,error=>respond({ok:false,error:error.message}));
  return true;
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if (area!=='sync') return;
  serial(async()=>{
    await initialize();
    const incoming={};
    for (const [key,{newValue}] of Object.entries(changes)) {
      if (key.startsWith(PREFIX)&&validRecord(key,newValue)) incoming[key]=newValue;
    }
    state.records=merge(state.records,incoming);
    if (changes[META]?.newValue?.v===1) state.initialized=true;
    for (const key of Object.keys(incoming)) {
      const retained=state.records[key];
      if (JSON.stringify(retained)!==JSON.stringify(incoming[key])) state.pending[key]=retained;
      else delete state.pending[key];
    }
    if (state.initialized) {
      await persist(Object.keys(state.pending).length?'pending':'saved');
      await flush();
    }
  }).catch(()=>{});
});
chrome.alarms.onAlarm.addListener(alarm=>{
  if (alarm.name===RETRY) serial(async()=>{await initialize();await flush();}).catch(()=>{});
});
chrome.runtime.onStartup.addListener(()=>{
  serial(async()=>{await initialize();await flush();}).catch(()=>{});
});
