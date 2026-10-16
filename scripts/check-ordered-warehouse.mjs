import {restoreBaselinePolling} from './warehouse-poll-compat.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {securityViewState, securityDetails} from '../public/minimal-originale/warehouse-assets/warehouse-wazuh-security.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const prefix = '/minimal-originale/';
const manifest = JSON.parse(await readFile('public' + prefix + 'warehouse-release.json','utf8'));
assert.equal(manifest.layout?.id,'schermo-unico-2026-10-14','Export rejected: the user-approved single-screen layout must be preserved');
const html = await readFile('public' + prefix + 'capannone_3d.html','utf8');
const bundle = await readFile('public' + prefix + 'warehouse-assets/warehouse-DAXf6-td.js','utf8');
const module = await readFile('public' + prefix + 'warehouse-assets/warehouse-wazuh-security.js');
assert.equal(sha(module),'1e25f2e73be8f421a19c939750086cfd3459aae537e512996a4d207375e2f29e','Verified Wazuh security logic must remain unchanged');
const head = 'import {securityViewState as qs, securityDetails as Js} from "./warehouse-wazuh-security.js?v=' + sha(module) + '";\n';
const ilpModule = await readFile('public' + prefix + 'warehouse-assets/warehouse-ilovepaghe.js');
const ilpHead = 'import {createILPCockpit as __createILPCockpit} from "./warehouse-ilovepaghe.js?v=' + sha(ilpModule) + '";\n';
const presentationBundle=await restoreBaselinePolling(bundle);
assert.ok(presentationBundle.startsWith(ilpHead + head));
// Remove only the three audited iLovePaghe hooks, then pin the newly approved presentation.
// The Oct 14 ZIP changes only presentation; authentication, fetches and expiry logic were compared byte-for-byte.
let original = presentationBundle.slice(ilpHead.length);
for (const [addition, baseline] of [
 ['var ILPCockpit=__createILPCockpit(l);function Sl({ilpUser:ilpUser=null,now:e,','function Sl({now:e,'],
 ['return(0,H.jsx)(Sl,{ilpUser:e,now:n,','return(0,H.jsx)(Sl,{now:n,'],
 ['(0,H.jsx)(vc,{id:`ilovepaghe`,title:`iLovePaghe`,children:(0,H.jsx)(ILPCockpit,{user:ilpUser,now:e})}),(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:','(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:']
]) { assert.equal(original.split(addition).length,2); original=original.replace(addition,baseline); }
assert.equal(sha(original.slice(head.length)),'e10e0ebb8978149e3a21d12b8d3b6b4c60717fd49d35e0f78d76adf47c888cec','Single-screen presentation differs from approved ZIP');
assert.ok(html.includes('warehouse-DAXf6-td.js?v=' + sha(bundle)));
assert.ok(html.includes('warehouse-B89y70LQ.css?v=' + sha(await readFile('public' + prefix + 'warehouse-assets/warehouse-B89y70LQ.css'))));
assert.ok(html.includes('warehouse-ilovepaghe.css?v=' + sha(await readFile('public' + prefix + 'warehouse-assets/warehouse-ilovepaghe.css'))));
const ilpText = ilpModule.toString();
const pollingStart = ilpText.indexOf('    React.useEffect(() => {\n      let active');
const pollingEnd = ilpText.indexOf('    },[user]);') + '    },[user]);'.length;
assert.ok(pollingStart >= 0 && pollingEnd > pollingStart);
assert.equal(sha(ilpText.slice(pollingStart,pollingEnd)),'8b91420a53b083251db40db800293e64fe5366ecb4b38b83cadb85726c634ebb','Firebase polling/authentication must remain byte-identical');
assert.ok(ilpText.includes('const REFRESH = 15 * 60_000;'));
assert.ok(ilpText.includes('const PAGE_MS = 12_000;'));
assert.equal(sha(await readFile('public' + prefix + 'warehouse-assets/warehouse-B89y70LQ.css')),'180c132eeef2512d7053b3541bd196cd2f4245d9a610bb13a6fadbf79707194e');
for (const [path,proof] of Object.entries(manifest.files)) {
  const bytes = await readFile('public' + path);
  assert.equal(bytes.length,proof.size,path + ' size'); assert.equal(sha(bytes),proof.sha256,path + ' hash');
}
const now = Date.parse('2026-10-13T16:00:00Z');
const iso = delta => new Date(now + delta).toISOString();
const check = (id,state='ok') => ({id,label:id,state,detail:'Verificato'});
const data = {state:'ok',generatedAt:iso(-1000),expiresAt:iso(60000),coverage:'Monitoraggio verificato.',
  devices:['pc-windows','pc-brt','mac-mini','macbook'].map(id=>({id,name:id,state:'ok',observedAt:iso(-1000),expiresAt:iso(60000),checks:[check('firewall'),check('wazuh-agent')]})),
  checks:[check('wazuh-server')],wazuh:{connected:4,total:4,expiresAt:iso(60000)},
  notifications:{state:'ok',recipient:'info@lgtrading.it',checkedAt:iso(-1000)}};
assert.equal(securityDetails(data,false,now).verified,9);
assert.match(securityDetails(data,false,now).coverage,/4\/4 dispositivi/);
const partial = structuredClone(data); partial.state='warn';partial.wazuh.connected=3;partial.devices[3].state='warn';partial.devices[3].checks[1].state='warn';
assert.equal(securityViewState(partial,false,now),'warn');
assert.equal(securityDetails(partial,false,now).verified,8);
assert.match(securityDetails(partial,false,now).coverage,/3\/4 dispositivi/);
const stale = structuredClone(data);stale.wazuh.expiresAt=iso(-1);
const staleView=securityDetails(stale,false,now);
assert.equal(staleView.state,'unknown');assert.equal(staleView.verified,4);
assert.ok(staleView.devices.every(device=>device.state==='unknown'&&device.checks[1].shownDetail==='Dato da aggiornare'));
assert.equal(staleView.general[0].state,'unknown');
const down=structuredClone(stale);down.state='down';down.devices[0].state='down';
assert.equal(securityDetails(down,false,now).state,'down');
assert.equal(securityDetails(down,false,now).devices[0].state,'down');
const missing=structuredClone(data);delete missing.wazuh;
assert.equal(securityDetails(missing,false,now).verified,4);
assert.equal(securityDetails(missing,false,now).state,'unknown');
assert.equal(securityDetails(data,true,now).verified,0);
assert.equal(securityDetails(data,false,now+60001).verified,0);
const legacy=structuredClone(data);delete legacy.wazuh;legacy.checks=[];for(const device of legacy.devices)device.checks=[check('firewall')];
assert.equal(securityDetails(legacy,false,now).state,'ok');
console.log(JSON.stringify({layout:manifest.layout.id,verifiedFiles:Object.keys(manifest.files).length,presentation:'user-approved single-screen ZIP; authentication, polling and security preserved',securityCases:8,result:'passed'}));

await import('./check-warehouse-webapp.mjs');

await import('./test-warehouse-poll-recovery.mjs');
