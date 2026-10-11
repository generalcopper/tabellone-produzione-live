const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.resolve(__dirname,'../public/index.html'),'utf8');
const code=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replaceAll('import(','loadSdk(');
const swCode=fs.readFileSync(path.resolve(__dirname,'../public/sw.js'),'utf8');
const user={uid:'member-a',email:'member@example.test',displayName:'Member'};
const profile={emailLower:user.email,enabled:true,isAdmin:false,orgId:'default'};
const pending=()=>new Promise(()=>{});
const flush=async()=>{for(let i=0;i<70;i++)await Promise.resolve();};

function clock(){
  let now=0,next=0;const timers=new Map();
  return {
    setTimeout(fn,ms){const id=++next;timers.set(id,{fn,at:now+ms});return id;},
    clearTimeout(id){timers.delete(id);},
    async advance(ms){
      const end=now+ms;
      while(true){
        const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!due)break;
        now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();
      }
      now=end;await flush();
    }
  };
}

function element(){
  const classes=new Set();
  return {style:{},hidden:false,textContent:'',disabled:false,attrs:{'aria-hidden':'true'},listeners:{},
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x,on){if(on)classes.add(x);else classes.delete(x);}},
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
    addEventListener(k,fn){this.listeners[k]=fn;}
  };
}

function harness(options={}){
  const time=clock(),elements=new Map(),events={};
  const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  const body=element();body.classList.add('authPending');
  const adminTile=element(),memberTile=element();
  const auth={currentUser:options.user??null};
  const counts={reads:[],writes:[],popup:0,redirect:0,reloads:0,observers:0};
  let observer;
  const authMod={
    getAuth:()=>auth,
    initializeAuth:(_app,options)=>{counts.persistence=options.persistence;return auth;},
    indexedDBLocalPersistence:'indexedDB',browserLocalPersistence:'local',browserSessionPersistence:'session',
    setPersistence:pending,
    GoogleAuthProvider:class{setCustomParameters(){}},
    onAuthStateChanged(_auth,fn){observer=fn;counts.observers++;if(!options.authHang)queueMicrotask(()=>fn(auth.currentUser));return ()=>{};},
    getRedirectResult:()=>options.redirectHang?pending():Promise.resolve(null),
    signInWithPopup:()=>{counts.popup++;return Promise.reject({code:'auth/popup-closed-by-user'});},
    signInWithRedirect:()=>{counts.redirect++;return Promise.resolve();},
    signOut:async()=>{auth.currentUser=null;observer(null);}
  };
  const fsMod={
    getFirestore:()=>({}),doc:(_db,...parts)=>parts.join('/'),serverTimestamp:()=>({server:true}),
    getDocFromServer(ref){
      counts.reads.push(ref);
      const data=options.read?options.read(ref):Promise.resolve(profile);
      return Promise.resolve(data).then(value=>({exists:()=>value!==null,data:()=>value}));
    },
    setDoc(ref,data){counts.writes.push({ref,data});return options.write?options.write(ref,data):Promise.resolve();}
  };
  const context=vm.createContext({
    document:{body,readyState:'complete',getElementById:$,querySelectorAll:s=>s==='[data-admin-only]'?[adminTile]:s==='[data-member-visible]'?[memberTile]:[]},
    window:{addEventListener:(name,fn)=>events[name]=fn,
      localStorage:{getItem(){if(options.storageError)throw new Error('Storage blocked');return null;}},
      sessionStorage:{getItem(){if(options.storageError)throw new Error('Storage blocked');return null;}}},navigator:{onLine:true},
    localStorage:{getItem(){throw new Error('Storage blocked');},setItem(){throw new Error('Storage blocked');}},
    location:{reload:()=>counts.reloads++},console:{warn(){},error(){}},
    setTimeout:time.setTimeout,clearTimeout:time.clearTimeout,
    loadSdk:url=>options.sdkError?Promise.reject(new Error('SDK unavailable')):options.sdkHang?pending():Promise.resolve(url.includes('firebase-app')?{initializeApp:()=>({})}:url.includes('firebase-auth')?authMod:fsMod)
  });
  vm.runInContext(code+'\nglobalThis.readState=()=>({phase:__startupPhase,isAdmin:__isAdmin});',context);
  return {context,auth,counts,body,$,events,adminTile,advance:time.advance,
    state:()=>context.readState(),boot:flush,
    async emit(next){auth.currentUser=next;observer(next);await flush();}
  };
}

test('storage unavailable and an unfinished redirect still lead to a usable login',async()=>{
  const h=harness({redirectHang:true,storageError:true});await h.boot();
  assert.deepEqual(Array.from(h.counts.persistence),['indexedDB']);
  assert.equal(h.state().phase,'login');
  assert.equal(h.body.classList.contains('authPending'),false);
  assert.equal(h.$('authOverlay').hidden,false);
  assert.equal(h.$('btnGoogle').style.display,'');
  const click=h.$('btnGoogle').listeners.click();
  assert.equal(h.counts.popup,1,'popup must open in the original click without awaiting persistence');
  await click;assert.equal(h.counts.redirect,0);
});

test('SDK failure shows a working retry action, even before Firebase initializes',async()=>{
  const h=harness({sdkError:true});await h.boot();
  assert.equal(h.state().phase,'error');
  assert.equal(h.$('authOverlay').hidden,false);
  assert.equal(h.$('btnReload').style.display,'');
  h.$('btnReload').listeners.click();assert.equal(h.counts.reloads,1);
});

test('SDK and auth restoration waits have finite recovery paths',async()=>{
  const h=harness({sdkHang:true});await h.boot();await h.advance(10000);
  assert.equal(h.state().phase,'error');assert.equal(h.body.classList.contains('authPending'),false);
  const h2=harness({authHang:true});await h2.boot();await h2.advance(12000);
  assert.equal(h2.state().phase,'error');await h2.emit(user);
  assert.equal(h2.state().phase,'ready');
});

test('matching profiles use two parallel reads and perform no startup writes',async()=>{
  const h=harness({user,redirectHang:true});await h.boot();
  assert.equal(h.counts.reads.length,2);assert.equal(h.counts.writes.length,0);
  assert.equal(h.state().phase,'ready');assert.equal(h.body.classList.contains('locked'),false);
  await h.emit(user);assert.equal(h.counts.reads.length,2);
});

test('a slow profile write does not hide or block an already authorized home',async()=>{
  const h=harness({user,read:ref=>ref.endsWith('/'+user.uid)?null:profile,write:pending});await h.boot();
  assert.equal(h.counts.writes.length,1);assert.equal(h.state().phase,'ready');
  assert.equal(h.body.classList.contains('locked'),false);
  await h.advance(8000);assert.equal(h.state().phase,'ready');
});

test('role timeouts keep feedback visible and recovery remains bounded',async()=>{
  const h=harness({user,read:pending});await h.boot();await h.advance(300);
  assert.equal(h.body.classList.contains('showSpinner'),true);
  await h.advance(6700);assert.equal(h.state().phase,'error');
  assert.equal(h.$('authOverlay').hidden,false);assert.equal(h.body.classList.contains('locked'),true);
  await h.advance(33000);assert.equal(h.counts.reads.length,6);
  assert.equal(h.counts.reloads,0);
});

test('recovery after connectivity returns preserves the current user',async()=>{
  let recovered=false;
  const h=harness({user,read:()=>recovered?profile:pending()});h.context.navigator.onLine=false;
  await h.boot();await h.advance(7000);assert.equal(h.state().phase,'error');
  recovered=true;h.context.navigator.onLine=true;h.events.online();await flush();
  assert.equal(h.state().phase,'ready');assert.equal(h.counts.reloads,0);
});

test('disabled, missing and uncertain UID permissions cannot unlock the home',async()=>{
  for(const read of [()=>null,ref=>ref.endsWith('/'+user.uid)?{enabled:false}:profile]){
    const h=harness({user,read});await h.boot();assert.equal(h.state().phase,'noaccess');
    assert.equal(h.body.classList.contains('locked'),true);assert.equal(h.counts.writes.length,0);
  }
  const h=harness({user,read:ref=>ref.endsWith('/'+user.uid)?pending():profile});
  await h.boot();await h.advance(7000);assert.equal(h.state().phase,'error');
  assert.equal(h.counts.writes.length,0);
});

test('late access checks cannot reopen the home after logout',async()=>{
  const deferred=[];
  const h=harness({user,read:()=>new Promise(resolve=>deferred.push(resolve))});await h.boot();
  await h.emit(null);for(const resolve of deferred)resolve(profile);await flush();
  assert.equal(h.state().phase,'login');assert.equal(h.body.classList.contains('locked'),true);
  assert.equal(h.counts.writes.length,0);
});

test('a confirmed profile update changes the role only for the same session',async()=>{
  let finish;
  const h=harness({user,read:ref=>ref.endsWith('/'+user.uid)?profile:{...profile,isAdmin:true},write:()=>new Promise(resolve=>finish=resolve)});
  await h.boot();assert.equal(h.state().isAdmin,false);
  await h.emit(null);finish();await flush();assert.equal(h.state().isAdmin,false);assert.equal(h.state().phase,'login');
});

function workerHarness(options={}){
  const time=clock(),events={},buckets=new Map(),deleted=[];let skipped=0,claimed=0;
  const origin='https://hub.example.test';
  const key=r=>new URL(typeof r==='string'?r:r.url,origin).href;
  const caches={
    async open(name){
      if(!buckets.has(name))buckets.set(name,new Map());const bucket=buckets.get(name);
      return {put:async(r,response)=>bucket.set(key(r),response.clone()),match:async r=>bucket.get(key(r))?.clone()};
    },keys:async()=>[...buckets.keys()],delete:async name=>{deleted.push(name);return buckets.delete(name);}
  };
  const context=vm.createContext({URL,Response,AbortController,caches,setTimeout:time.setTimeout,clearTimeout:time.clearTimeout,
    fetch:(req,init)=>options.fetch?options.fetch(req,init):Promise.resolve(new Response('home')),
    self:{location:{origin},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++}}
  });
  vm.runInContext(swCode,context);
  return {buckets,deleted,caches,time,skipped:()=>skipped,claimed:()=>claimed,
    async lifecycle(name){let promise;events[name]({waitUntil:p=>promise=p});await promise;},
    request(pathname){let response;const waits=[];
      events.fetch({request:{url:origin+pathname,method:'GET',mode:'navigate',destination:'document'},respondWith:p=>response=p,waitUntil:p=>waits.push(p)});
      return {response,waits};
    }
  };
}

test('PWA installs even when optional assets are missing and preserves other caches',async()=>{
  const h=workerHarness({fetch:req=>Promise.resolve(new Response(req==='/index.html'?'current home':'missing',{status:req==='/index.html'?200:404}))});
  h.buckets.set('gc-hub-v20260118',new Map());h.buckets.set('other-app-cache',new Map());
  await h.lifecycle('install');assert.equal(h.skipped(),1);
  await h.lifecycle('activate');assert.deepEqual(h.deleted,['gc-hub-v20260118']);assert.equal(h.claimed(),1);
});

test('PWA does not replace a working worker when the required home is unavailable',async()=>{
  const h=workerHarness({fetch:()=>Promise.resolve(new Response('server error',{status:503}))});
  await assert.rejects(h.lifecycle('install'),/Hub index unavailable/);assert.equal(h.skipped(),0);
});

test('stalled navigation falls back within eight seconds and auth helpers bypass caching',async()=>{
  const h=workerHarness({fetch:(_req,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('timeout'))))});
  const cache=await h.caches.open('gc-hub-v20261011-startup');await cache.put('/index.html',new Response('cached home'));
  const request=h.request('/?pwa=1');await h.time.advance(8000);
  assert.equal(await (await request.response).text(),'cached home');
  assert.equal(h.request('/__/auth/iframe').response,undefined);
});

test('server failures cannot replace the PWA home with an error page',async()=>{
  const h=workerHarness({fetch:()=>Promise.resolve(new Response('error',{status:503}))});
  const cache=await h.caches.open('gc-hub-v20261011-startup');await cache.put('/index.html',new Response('cached home'));
  const request=h.request('/index.html');assert.equal(await (await request.response).text(),'cached home');
  assert.equal(await (await cache.match('/index.html')).text(),'cached home');
});
