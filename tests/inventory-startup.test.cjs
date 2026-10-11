const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.resolve(__dirname, '../public/hub_inventario_amazon.html'), 'utf8');
const overlayCode = html.slice(html.indexOf('    // auth overlay'), html.indexOf('    function setView('));
const startupCode = html.slice(html.indexOf('    // --- Avvio:'), html.indexOf('    // --- realtime inventory watchers ---'))
  .replaceAll('import(', 'loadSdk('); // Substitute only the network boundary.
const user = {uid:'operator-a', email:'operator@example.test', displayName:'Operatore'};
const flush = async()=>{ for(let i=0; i<30; i++) await Promise.resolve(); };
const pending = ()=>new Promise(()=>{});
const snap = data=>({exists:()=>data !== null, data:()=>data});

function harness(options={}){
  let now=0, nextId=0;
  const timers = new Map();
  const elements = new Map();
  const counters = {starts:0, stops:0, observers:0, persistence:0, reloads:0, redirects:0, reads:[]};
  const element = id=>{
    if(!elements.has(id)) elements.set(id, {
      style:{}, attrs:{}, textContent:'', listeners:{},
      setAttribute(key,value){this.attrs[key]=value;},
      addEventListener(type,fn){this.listeners[type]=fn;}
    });
    return elements.get(id);
  };
  const auth = {currentUser:options.user ?? null};
  let observer;
  const authMod = {
    getAuth:()=>auth,
    setPersistence:()=>{counters.persistence++; return pending();},
    GoogleAuthProvider:class {setCustomParameters(){}},
    onAuthStateChanged:(_auth,fn)=>{
      counters.observers++; observer=fn;
      if(!options.authHang) queueMicrotask(()=>fn(auth.currentUser));
      return ()=>{};
    },
    getRedirectResult:()=>options.redirectHang ? pending() : Promise.resolve(null),
    signInWithPopup:()=>Promise.reject(Object.assign(new Error('closed'),{code:'auth/popup-closed-by-user'})),
    signInWithRedirect:()=>{counters.redirects++; return Promise.resolve();}
  };
  const fsMod = {
    getFirestore:()=>({}),
    doc:(_db,...parts)=>parts.join('/'),
    getDocFromServer:ref=>{
      counters.reads.push(ref);
      return options.read ? options.read(ref) : Promise.resolve(snap(ref.startsWith('amzInventoryDirectory/') ? {enabled:true} : null));
    }
  };
  const state = {user:null,authGateState:'unknown',authGateMessage:'',firebase:{ok:false}};
  const context = vm.createContext({
    state, firebaseConfig:{}, ADMIN_EMAILS:['admin@example.test'], $:element,
    navigator:{onLine:true,userAgent:'test',platform:'Linux',maxTouchPoints:0},
    window:{matchMedia:()=>({matches:false})},
    location:{reload:()=>counters.reloads++},
    console:{warn(){},error(){}},
    setTimeout:(fn,ms)=>{const id=++nextId;timers.set(id,{at:now+ms,fn});return id;},
    clearTimeout:id=>timers.delete(id),
    syncHeaderSub(){}, setView(){}, showToast(){},
    startAllRealtime:()=>counters.starts++, stopAllRealtime:()=>counters.stops++,
    loadSdk:url=>{
      if(options.sdkHang) return pending();
      if(options.sdkError) return Promise.reject(new Error('network failure'));
      return Promise.resolve(url.includes('firebase-app') ? {initializeApp:()=>({})} : url.includes('firebase-auth') ? authMod : fsMod);
    }
  });
  vm.runInContext(overlayCode + startupCode,context);
  return {
    state,context,counters,element,auth,
    async boot(){await context.initFirebase();await flush();},
    async emit(next){auth.currentUser=next;observer(next);await flush();},
    async advance(ms){
      const end=now+ms;
      while(true){
        const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!due) break;
        now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();
      }
      now=end;await flush();
    }
  };
}

test('a pending redirect/storage operation does not block an authenticated session',async()=>{
  const h=harness({user,redirectHang:true});
  await h.boot();
  assert.equal(h.state.authGateState,'signed_in');
  assert.equal(h.counters.persistence,0);
  assert.equal(h.counters.observers,1);
  assert.equal(h.counters.starts,1);
  assert.equal(h.element('authOverlay').attrs['aria-hidden'],'true');
  await h.emit(user);
  assert.equal(h.counters.starts,1,'duplicate auth events must not start duplicate data listeners');
});

test('normal signed-out startup offers Google login immediately',async()=>{
  const h=harness();await h.boot();
  assert.equal(h.state.authGateState,'signed_out');
  assert.equal(h.element('authOverlaySpinner').style.display,'none');
  assert.equal(h.element('btnGoogleLoginOverlay').style.display,'inline-flex');
  assert.equal(h.counters.starts,0);
});

test('a rejected SDK import offers recovery instead of an endless spinner',async()=>{
  const h=harness({sdkError:true});await h.boot();
  assert.equal(h.state.authGateState,'error');
  assert.equal(h.element('authOverlaySpinner').style.display,'none');
  assert.equal(h.element('btnAuthRetry').style.display,'inline-flex');
  h.context.retryAuthStartup();
  assert.equal(h.counters.reloads,1);
});

test('a stalled SDK import and a silent auth observer both have finite waits',async()=>{
  const h=harness({sdkHang:true});
  const boot=h.context.initFirebase();
  await h.advance(12000);await boot;
  assert.equal(h.state.authGateState,'error');
  assert.equal(h.element('btnAuthRetry').style.display,'inline-flex');
  const h2=harness({authHang:true});await h2.boot();await h2.advance(12000);
  assert.equal(h2.state.authGateState,'error');
  assert.equal(h2.element('authOverlaySpinner').style.display,'none');
  await h2.emit(user);
  assert.equal(h2.state.authGateState,'signed_in','late session restoration still recovers');
});

test('role reads are parallel, time out, and never grant access on network failure',async()=>{
  let recover=false;
  const h=harness({user,read:ref=>recover ? Promise.resolve(snap(ref.startsWith('amzInventoryDirectory/') ? {enabled:true} : null)) : pending()});
  await h.boot();
  assert.equal(h.counters.reads.length,4,'all directory and role reads start together');
  await h.advance(7000);
  assert.equal(h.state.authGateState,'error');
  assert.equal(h.state.user.isWhitelisted,false);
  assert.equal(h.counters.starts,0);
  recover=true;await h.advance(3000);
  assert.equal(h.state.authGateState,'signed_in');
  assert.equal(h.counters.starts,1);
});

test('automatic recovery is bounded and does not reload the page',async()=>{
  const h=harness({user,read:pending});await h.boot();await h.advance(40000);
  assert.equal(h.state.authGateState,'error');
  assert.equal(h.counters.reads.length,12,'initial attempt plus two bounded retries');
  assert.equal(h.counters.reloads,0);
  assert.equal(h.counters.starts,0);
});

test('absent/disabled roles stay blocked, while the existing fallback/admin policies still work',async()=>{
  for(const read of [()=>Promise.resolve(snap(null)),()=>Promise.resolve(snap({enabled:false})),()=>Promise.reject({code:'permission-denied'})]){
    const h=harness({user,read});await h.boot();
    assert.equal(h.state.authGateState,'blocked');
    assert.equal(h.counters.starts,0);
    assert.equal(h.element('authOverlay').attrs['aria-hidden'],'false');
  }
  for(const policy of ['payrollDirectory/','powderUsers/operator-a']){
    const h=harness({user,read:ref=>Promise.resolve(snap(ref.startsWith(policy) ? {enabled:true,role:'admin'} : null))});
    await h.boot();assert.equal(h.state.authGateState,'signed_in');
  }
  const admin=harness({user:{uid:'admin',email:'admin@example.test'},read:()=>Promise.resolve(snap(null))});
  await admin.boot();assert.equal(admin.state.user.isAdmin,true);
});

test('a delayed permission response cannot resurrect a signed-out or replaced account',async()=>{
  const resolvers=[];
  const h=harness({user,read:()=>new Promise(resolve=>resolvers.push(resolve))});
  await h.boot();await h.emit(null);
  for(const resolve of resolvers) resolve(snap({enabled:true,role:'admin'}));
  await flush();
  assert.equal(h.state.user,null);
  assert.equal(h.state.authGateState,'signed_out');
  assert.equal(h.counters.starts,0);
});

test('cancelling the Google popup does not force an unsolicited redirect',async()=>{
  const h=harness();await h.boot();
  await h.element('btnGoogleLoginOverlay').listeners.click();await flush();
  assert.equal(h.counters.redirects,0);
  assert.equal(h.state.authGateState,'signed_out');
  assert.equal(h.element('authOverlaySpinner').style.display,'none');
});

test('PDF dependencies are lazy modules with matching worker versions',()=>{
  assert.doesNotMatch(html,/<script[^>]+src=["'][^"']*pdf[^"']*["']/i);
  assert.match(html,/import\("https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/4\.9\.155\/pdf\.min\.mjs"\)/);
  assert.match(html,/pdf\.js\/4\.9\.155\/pdf\.worker\.min\.mjs/);
});
