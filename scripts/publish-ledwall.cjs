'use strict';
// Scoped Firebase Hosting release: clone the live version, preserve all unrelated
// files/configuration, and refuse release if another deployment intervened.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{gzipSync}=require('node:zlib'),{createHash}=require('node:crypto');
const firebase=process.env.FIREBASE_TOOLS_LIB||'/opt/homebrew/lib/node_modules/firebase-tools/lib/';
const {selectAccount,setActiveAccount}=require(firebase+'auth');
const {requireAuth}=require(firebase+'requireAuth');
const {Client}=require(firebase+'apiv2');
const {hostingApiOrigin}=require(firebase+'api');
const {cloneVersion,createRelease}=require(firebase+'hosting/api');
const api=new Client({urlPrefix:hostingApiOrigin(),apiVersion:'v1beta1'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const [mode,kind,root,registryPath]=process.argv.slice(2);
assert.ok(['prepare','release'].includes(mode));assert.ok(['qr','ui'].includes(kind));
const site=kind==='qr'?'ilovepaghe-ludo-2026':'tabellone-produzione-liv-e313e';
const statePath=path.join(root,'ledwall-release-'+kind+'.json');
const latest=async()=>(await api.get('/sites/'+site+'/releases',{queryParams:{pageSize:1}})).body.releases[0];
async function files(version){let result={},pageToken='';do{const b=(await api.get('/'+version+'/files',{queryParams:{pageSize:1000,...pageToken?{pageToken}:{}}})).body;for(const f of b.files||[])result[f.path]=f.hash;pageToken=b.nextPageToken||'';}while(pageToken);return result;}
async function main(){
 const options={nonInteractive:true};setActiveAccount(options,selectAccount(undefined,process.cwd()));await requireAuth(options);
 if(mode==='release'){
  const state=JSON.parse(fs.readFileSync(statePath));assert.equal(state.site,site);assert.equal((await latest()).name,state.previousRelease,'A different release intervened; prepare again');
  const currentFiles=await files(state.version);assert.deepEqual(currentFiles,state.expectedFiles);
  const release=await createRelease(site,'live',state.version,{message:'Dolci LED wall: '+(kind==='qr'?'six unique QR redirects':'private monitoring in existing iLovePaghe card')});
  assert.equal((await latest()).version.name,state.version);state.release=release;state.releasedAt=new Date().toISOString();fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
  console.log(JSON.stringify({released:true,site,version:state.version,release:release.name,files:Object.keys(currentFiles).length}));return;
 }
 const previous=await latest(),source=(await api.get('/'+previous.version.name)).body,originalFiles=await files(source.name);
 const config=structuredClone(source.config),uploads={},expectedFiles={...originalFiles},changed=[];
 const prior=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):null;
 if(kind==='qr'){
  const registry=JSON.parse(fs.readFileSync(registryPath));assert.equal(registry.walls.length,6);
  const redirects=registry.walls.map(w=>({glob:'/Q/'+w.qrId,statusCode:302,location:'https://crm-api-62sidjxd5a-ew.a.run.app/q/'+w.qrId}));
  const reserved=new Set(redirects.map(r=>r.glob));assert.ok(!(config.redirects||[]).some(r=>reserved.has(r.glob)),'QR redirects already exist; inspect rather than overwrite');
  config.redirects=[...redirects,...config.redirects||[]];config.headers=[...config.headers||[],{glob:'/Q/**',headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'}}];
  assert.deepEqual(config.rewrites,source.config.rewrites);
 }else{
  const paths=['capannone_3d.html','warehouse-assets/warehouse-DAXf6-td.js','warehouse-assets/warehouse-ilovepaghe.js','warehouse-assets/warehouse-ilovepaghe.css','warehouse-assets/warehouse-ledwall.js','warehouse-release.json','warehouse-sw.js'].map(p=>'/minimal-originale/'+p);
  for(const p of paths){
   const local=fs.readFileSync(path.join(root,'public',p));
   if(originalFiles[p]){
    const priorFile=prior?.version===source.name?prior.changed.find(f=>f.path===p):null;
    const baselineHash=priorFile?.sha256||sha(execFileSync('git',['show','origin/main:public'+p],{cwd:root}));
    const response=await fetch('https://'+site+'.firebaseapp.com'+p+'?ledwall_before='+Date.now());assert.equal(response.status,200);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())),baselineHash,'Live file differs from reviewed baseline: '+p);
   }
   const zipped=gzipSync(local,{level:9}),hash=sha(zipped);uploads[hash]=zipped;expectedFiles[p]=hash;changed.push({path:p,sha256:sha(local),gzipSha256:hash,size:local.length});
  }
 }
 assert.equal((await latest()).name,previous.name,'Source release changed while preparing');
 const cloned=await cloneVersion(site,source.name,false);const version=cloned.response?.name||cloned.name;assert.match(version,/\/versions\//);
 if(kind==='qr')await api.patch('/'+version,{config},{queryParams:{updateMask:'config'}});
 else{
  const result=(await api.post('/'+version+':populateFiles',{files:Object.fromEntries(changed.map(f=>[f.path,f.gzipSha256]))})).body;
  const upload=new Client({urlPrefix:result.uploadUrl,auth:true});
  for(const hash of result.uploadRequiredHashes||[]){assert.ok(uploads[hash]);const r=await upload.request({method:'POST',path:'/'+hash,body:uploads[hash],responseType:'xml',headers:{'Content-Type':'application/octet-stream'}});assert.equal(r.status,200);}
 }
 assert.deepEqual(await files(version),expectedFiles,'Unrelated file set changed');
 await api.patch('/'+version,{status:'FINALIZED'},{queryParams:{updateMask:'status'}});
 const finalized=(await api.get('/'+version)).body;assert.equal(finalized.status,'FINALIZED');assert.deepEqual(finalized.config,config);
 const state={site,previousRelease:previous.name,previousVersion:source.name,version,preparedAt:new Date().toISOString(),changed,expectedFiles,config};fs.writeFileSync(statePath,JSON.stringify(state,null,2)+'\n');
 console.log(JSON.stringify({prepared:true,site,previousVersion:source.name,version,files:Object.keys(expectedFiles).length,changed:changed.map(f=>f.path),redirectsAdded:kind==='qr'?6:0}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
