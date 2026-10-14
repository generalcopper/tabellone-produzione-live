const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const page=fs.readFileSync(path.join(__dirname,'../public/documenti-bionee.html'),'utf8');
const script=page.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
function setup(){
 const nodes=new Map(),urls=new Map();let serial=0,calls=0,loader=async()=>new Blob(['%PDF-X'],{type:'application/pdf'});
 function node(id){if(!nodes.has(id))nodes.set(id,{open:id==='preview',value:'0',attrs:{},handlers:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];if(k==='src'||k==='href'||k==='download')this[k]='';},hasAttribute(k){return !!this[k]||Object.hasOwn(this.attrs,k);},addEventListener(k,f){this.handlers[k]=f;},close(){this.open=false;this.handlers.close?.();}});return nodes.get(id);}
 const context=vm.createContext({document:{getElementById:node},Blob,URL:{createObjectURL(b){const u='blob:test/'+(++serial);urls.set(u,b);return u;},revokeObjectURL(u){urls.delete(u);}},setTimeout,clearTimeout});
 vm.runInContext(script.slice(0,script.indexOf('    const timeout='))+`\nglobalThis.api={select(s){selected=s;},showSource,clearDocument,setStorage(s){documentStorage={};storageAPI=s;}};`,context);
 context.api.setStorage({ref(_s,p){return p;},getBlob(p,max){calls++;return loader(p,max);}});
 return {api:context.api,node,urls,calls:()=>calls,load:f=>{loader=f;}};
}
function source(name,sha='a'.repeat(64)){return {name,fileName:name,type:'PDF',bytes:6,sha256:sha,storagePath:`bionee-documenti/pdf/${sha}.pdf`};}
function selection(s){return {state:'collegata',notes:[],sources:[s]};}
test('A slow previous document never replaces the selected PDF',async()=>{
 const h=setup();let resolveA;h.load(p=>p.includes('a'.repeat(64))?new Promise(r=>resolveA=r):Promise.resolve(new Blob(['%PDF-B'])));
 h.api.select(selection(source('A.pdf')));const a=h.api.showSource();
 h.api.select(selection(source('B.pdf','b'.repeat(64))));await h.api.showSource();const chosen=h.node('openSource').href;
 resolveA(new Blob(['%PDF-A']));await a;
 assert.equal(h.node('openSource').download,'B.pdf');assert.equal(h.node('openSource').href,chosen);assert.equal(h.urls.size,1);
});
test('Closing the document prevents a late result from reopening access',async()=>{
 const h=setup();let resolve;h.load(()=>new Promise(r=>resolve=r));h.api.select(selection(source('A.pdf')));const pending=h.api.showSource();
 h.node('preview').close();resolve(new Blob(['%PDF-A']));await pending;assert.equal(h.urls.size,0);assert.equal(h.node('openSource').href,'');
});
test('Only the expected SHA-256 document path can be requested',async()=>{
 const h=setup(),s=source('A.pdf');s.storagePath='payroll/private.pdf';h.api.select(selection(s));await h.api.showSource();assert.equal(h.calls(),0);assert.match(h.node('previewNote').textContent,/non valido/);
});
test('Incomplete or non-PDF downloads never become accessible',async()=>{
 for(const data of ['short','NOTPDF']){const h=setup();h.load(async()=>new Blob([data]));h.api.select(selection(source('A.pdf')));await h.api.showSource();assert.equal(h.urls.size,0);assert.equal(h.node('openSource').href,'');}
});
test('Switching documents removes a previously downloaded PDF on access failure',async()=>{
 const h=setup();h.api.select(selection(source('A.pdf')));await h.api.showSource();assert.equal(h.urls.size,1);
 h.load(async()=>{throw Object.assign(new Error('denied'),{code:'storage/unauthorized'});});h.api.select(selection(source('B.pdf','b'.repeat(64))));await h.api.showSource();assert.equal(h.urls.size,0);assert.equal(h.node('openSource').href,'');assert.match(h.node('previewNote').textContent,/Accesso al PDF non consentito/);
});
test('Published source references contain only archived PDFs',()=>{
 const data=JSON.parse(fs.readFileSync(path.join(__dirname,'../public/bionee-documenti/registro.json'),'utf8'));
 assert.equal(data.products.length,122);let count=0;
 for(const p of data.products)for(const key of ['label','sds'])for(const s of p[key].sources){count++;assert.equal(s.url,undefined);assert.equal(s.storagePath,`bionee-documenti/pdf/${s.sha256}.pdf`);assert.match(s.sha256,/^[a-f0-9]{64}$/);assert.ok(s.bytes>0);assert.match(s.fileName,/\.pdf$/i);}
 assert.ok(count>=239);assert.doesNotMatch(page,/drive\.google\.com/);
});
