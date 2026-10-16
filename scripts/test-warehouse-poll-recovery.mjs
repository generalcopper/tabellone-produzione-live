import assert from 'node:assert/strict';
import {createPolling,authenticatedRead,withSignal} from '../public/minimal-originale/warehouse-assets/warehouse-connection.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const timeoutController=new AbortController();
const tokenWait=authenticatedRead({getIdToken:()=>new Promise(()=>{})},'/read',timeoutController.signal,()=>{throw Error('Must not fetch without a token');});
timeoutController.abort();await assert.rejects(tokenWait,{name:'AbortError'});
let forced=[],fetches=0;
const user={getIdToken:async force=>{forced.push(force);return force?'fresh':'old';}};
const controller=new AbortController();
const response=await authenticatedRead(user,'/read',controller.signal,async(_url,options)=>{
 fetches++;assert.equal(options.cache,'no-store');assert.equal(options.signal,controller.signal);
 assert.equal(options.headers.Authorization,fetches===1?'Bearer old':'Bearer fresh');return new Response('{}',{status:fetches===1?401:200});
});
assert.equal(response.status,200);assert.deepEqual(forced,[false,true]);
forced=[];await authenticatedRead(user,'/read',controller.signal,async()=>new Response('{}',{status:403}));assert.deepEqual(forced,[false]);
forced=[];const denied=await authenticatedRead(user,'/read',controller.signal,async()=>new Response('{}',{status:401}));assert.equal(denied.status,401);assert.deepEqual(forced,[false,true]);
const doc=new EventTarget();doc.visibilityState='visible';const win=new EventTarget();
let sequence=0;const timeouts=new Map(),intervals=new Map();
const timers={setTimeout(fn){const id=++sequence;timeouts.set(id,fn);return id;},clearTimeout(id){timeouts.delete(id);},setInterval(fn){const id=++sequence;intervals.set(id,fn);return id;},clearInterval(id){intervals.delete(id);}};
let calls=0,firstAlive,lateResolve;
const polling=createPolling({intervalMs:20000,timeoutMs:30000,document:doc,window:win,timers,task:async({alive})=>{
 calls++;if(calls===1){firstAlive=alive;await new Promise(resolve=>lateResolve=resolve);}
}});
await flush();assert.equal(calls,1);await polling.run();assert.equal(calls,1,'No overlapping request');
[...timeouts.values()][0]();await flush();assert.equal(firstAlive(),false,'Timed-out request cannot overwrite a later snapshot');
win.dispatchEvent(new Event('online'));await flush();assert.equal(calls,2,'Reconnect starts a new read after a hung request');
lateResolve();await flush();assert.equal(firstAlive(),false);
doc.visibilityState='hidden';win.dispatchEvent(new Event('focus'));await flush();assert.equal(calls,2);
doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(calls,3);
win.dispatchEvent(new Event('pageshow'));await flush();assert.equal(calls,4);
polling.stop();win.dispatchEvent(new Event('online'));await flush();assert.equal(calls,4);assert.equal(intervals.size,0);assert.equal(timeouts.size,0);
const expired=new AbortController();expired.abort();await assert.rejects(withSignal(Promise.resolve(1),expired.signal),{name:'AbortError'});
console.log(JSON.stringify({pollRecovery:'passed',hungToken:'bounded',lateResponse:'discarded',reconnect:'automatic',unauthorizedRetry:'once',accessChecks:'preserved'}));
