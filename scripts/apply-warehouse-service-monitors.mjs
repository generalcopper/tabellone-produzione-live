import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {serviceMonitorHead,serviceMonitorPatches,SERVICE_MONITOR_BASELINE,SERVICE_MONITOR_MODULE,SERVICE_MONITOR_STYLE} from './warehouse-service-monitors-compat.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),dir='public/minimal-originale/';
const path=dir+'warehouse-assets/warehouse-DAXf6-td.js',baseline=await readFile(path,'utf8');
assert.equal(sha(baseline),SERVICE_MONITOR_BASELINE,'Apply only to the approved current presentation');
let bundle=baseline;
for(const [before,after,count] of serviceMonitorPatches){assert.equal(bundle.split(before).length,count+1);bundle=bundle.split(before).join(after);}
bundle=serviceMonitorHead+bundle;
await writeFile(path,bundle);
const bundleHash=sha(bundle);
let html=await readFile(dir+'capannone_3d.html','utf8');
html=html.replace('warehouse-DAXf6-td.js?v='+SERVICE_MONITOR_BASELINE,'warehouse-DAXf6-td.js?v='+bundleHash);
html=html.replace('</head>','    <link rel="stylesheet" href="./warehouse-assets/warehouse-service-monitors.css?v='+SERVICE_MONITOR_STYLE+'">\n</head>');
await writeFile(dir+'capannone_3d.html',html);
let sw=await readFile(dir+'warehouse-sw.js','utf8');
sw=sw.replace('lg-warehouse-static-'+SERVICE_MONITOR_BASELINE.slice(0,20),'lg-warehouse-static-'+bundleHash.slice(0,20));
sw=sw.replace('warehouse-DAXf6-td.js?v='+SERVICE_MONITOR_BASELINE,'warehouse-DAXf6-td.js?v='+bundleHash);
const match=sw.match(/const STATIC_URLS = new Set\((\[[^\n]+\])\);/);assert.ok(match);
const urls=JSON.parse(match[1]);
for(const [name,hash] of [['warehouse-service-monitors.js',SERVICE_MONITOR_MODULE],['warehouse-service-monitors.css',SERVICE_MONITOR_STYLE]]){
 urls.push('/minimal-originale/warehouse-assets/'+name,'/minimal-originale/warehouse-assets/'+name+'?v='+hash);
}
sw=sw.replace(match[0],'const STATIC_URLS = new Set('+JSON.stringify(urls)+');');
await writeFile(dir+'warehouse-sw.js',sw);
const manifest=JSON.parse(await readFile(dir+'warehouse-release.json','utf8'));
for(const name of ['capannone_3d.html','warehouse-assets/warehouse-DAXf6-td.js','warehouse-assets/warehouse-service-monitors.js','warehouse-assets/warehouse-service-monitors.css','warehouse-sw.js']){
 const bytes=await readFile(dir+name);manifest.files['/minimal-originale/'+name]={sha256:sha(bytes),size:bytes.length};
}
manifest.enhancements.iosWebApp.staticCache=bundleHash.slice(0,20);
manifest.enhancements.serviceMonitors={request:'26 November 2026: make the new monitors visible in Services, without changing card arrangement. WhatsApp and voice in Picking; Folia in Bionee; VoIP in LG Trading; Gymory excluded.',moduleSha256:SERVICE_MONITOR_MODULE,styleSha256:SERVICE_MONITOR_STYLE,baselineBundleSha256:SERVICE_MONITOR_BASELINE,source:'Existing authenticated service checks only; no extra polling, credentials, persistence or business actions',layout:'Same service tiles, order, dashboard zones and dimensions; compact inline state labels and accessible details dialog'};
await writeFile(dir+'warehouse-release.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({bundleHash,module:SERVICE_MONITOR_MODULE,style:SERVICE_MONITOR_STYLE}));
