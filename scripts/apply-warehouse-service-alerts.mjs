// Apply only the three reviewed display projections to the deployed approved bundle.
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {serviceAlertPatches} from './warehouse-service-alerts-compat.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const prefix = 'public/minimal-originale/', assets = prefix + 'warehouse-assets/';
const path = assets + 'warehouse-DAXf6-td.js';
const baseline = await readFile(path, 'utf8');
assert.equal(sha(baseline),'fd9898f071c01947e765ab67582b2bfed7fc54b0b78e2549294dedff5ab02083');
const moduleSha = sha(await readFile(assets+'warehouse-service-alerts.js'));
let bundle = baseline;
for(const [before,after] of serviceAlertPatches) {
  assert.equal(bundle.split(before).length,2);
  bundle=bundle.replace(before,after);
}
bundle='import {monitoredServices as __monitoredServices} from "./warehouse-service-alerts.js?v='+moduleSha+'";\n'+bundle;
await writeFile(path,bundle);
let html=await readFile(prefix+'capannone_3d.html','utf8');
assert.equal(html.split('?v='+sha(baseline)).length,2);
html=html.replace('?v='+sha(baseline),'?v='+sha(bundle));
await writeFile(prefix+'capannone_3d.html',html);
let sw=await readFile(prefix+'warehouse-sw.js','utf8');
sw=sw.replace('lg-warehouse-static-'+sha(baseline).slice(0,20),'lg-warehouse-static-'+sha(bundle).slice(0,20));
sw=sw.replace('?v='+sha(baseline),'?v='+sha(bundle));
const start=sw.indexOf('const STATIC_URLS = new Set(')+'const STATIC_URLS = new Set('.length;
const end=sw.indexOf(');',start);
const urls=JSON.parse(sw.slice(start,end));
urls.push('/minimal-originale/warehouse-assets/warehouse-service-alerts.js',
  '/minimal-originale/warehouse-assets/warehouse-service-alerts.js?v='+moduleSha);
sw=sw.slice(0,start)+JSON.stringify(urls)+sw.slice(end);
await writeFile(prefix+'warehouse-sw.js',sw);
const manifest=JSON.parse(await readFile(prefix+'warehouse-release.json','utf8'));
for(const name of ['capannone_3d.html','warehouse-assets/warehouse-DAXf6-td.js','warehouse-assets/warehouse-service-alerts.js','warehouse-sw.js']) {
  const bytes=await readFile(prefix+name);
  manifest.files['/minimal-originale/'+name]={sha256:sha(bytes),size:bytes.length};
}
manifest.enhancements.iosWebApp.staticCache=sha(bundle).slice(0,20);
manifest.enhancements.serviceAlerts={
  request:'20 October 2026: “io ho problemi ricorrrenti qui disattiva anche motore ig come segnalazione problema”',
  excludedServiceIds:['instagram'],
  scope:'Display only: open problems, monitored service cards/counters and session journal. Original authenticated source and SHA-256 proofs retained; Instagram engine and backend checks remain active.',
  moduleSha256:moduleSha,baselineBundleSha256:sha(baseline)
};
await writeFile(prefix+'warehouse-release.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({serviceAlerts:'applied',hooks:serviceAlertPatches.length,bundleSha256:sha(bundle),moduleSha256:moduleSha}));
