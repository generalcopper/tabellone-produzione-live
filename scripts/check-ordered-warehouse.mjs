import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {securityViewState, securityDetails} from '../public/minimal-originale/warehouse-assets/warehouse-wazuh-security.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const prefix = '/minimal-originale/';
const manifest = JSON.parse(await readFile('public' + prefix + 'warehouse-release.json','utf8'));
assert.equal(manifest.layout?.id,'riordinato-2026-10-12','Export rejected: the approved ordered layout must be preserved');
const html = await readFile('public' + prefix + 'capannone_3d.html','utf8');
const bundle = await readFile('public' + prefix + 'warehouse-assets/warehouse-DAXf6-td.js','utf8');
const module = await readFile('public' + prefix + 'warehouse-assets/warehouse-wazuh-security.js');
const head = 'import {securityViewState as qs, securityDetails as Js} from "./warehouse-wazuh-security.js?v=' + sha(module) + '";\n';
const ilpModule = await readFile('public' + prefix + 'warehouse-assets/warehouse-ilovepaghe.js');
const ilpHead = 'import {createILPCockpit as __createILPCockpit} from "./warehouse-ilovepaghe.js?v=' + sha(ilpModule) + '";\n';
assert.ok(bundle.startsWith(ilpHead + head));
// Remove only the three audited additive hooks; all pre-existing functions remain byte-identical.
let original = bundle.slice(ilpHead.length);
for (const [addition, baseline] of [
 ['var ILPCockpit=__createILPCockpit(l);function Sl({ilpUser:ilpUser=null,now:e,','function Sl({now:e,'],
 ['return(0,H.jsx)(Sl,{ilpUser:e,now:n,','return(0,H.jsx)(Sl,{now:n,'],
 ['(0,H.jsx)(vc,{id:`ilovepaghe`,title:`iLovePaghe`,children:(0,H.jsx)(ILPCockpit,{user:ilpUser,now:e})}),(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:','(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:']
]) { assert.equal(original.split(addition).length,2); original=original.replace(addition,baseline); }
assert.equal(sha(original.slice(head.length)),'e15bb66569b38fd18e612e21f2cb8a35be73bc04b20b75327bfaa63d764392e7','Ordered layout/presentation differs from approved ZIP');
assert.ok(html.includes('warehouse-DAXf6-td.js?v=' + sha(bundle)));
assert.ok(html.includes('warehouse-B89y70LQ.css'));
assert.equal(sha(await readFile('public' + prefix + 'warehouse-assets/warehouse-B89y70LQ.css')),'1f253798bf187cbff1612929ba1a7f92ab510003f23a362f45e38a2533cc3f05');
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
console.log(JSON.stringify({layout:manifest.layout.id,verifiedFiles:Object.keys(manifest.files).length,presentation:'existing functions byte-identical, with isolated iLovePaghe cockpit',securityCases:8,result:'passed'}));
