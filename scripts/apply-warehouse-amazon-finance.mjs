// One-time reviewed integration into the user-approved static presentation.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const sha=b=>createHash('sha256').update(b).digest('hex'),prefix='public/minimal-originale/',assets=prefix+'warehouse-assets/';
const path=assets+'warehouse-DAXf6-td.js',baseline=await readFile(path,'utf8');
assert.equal(sha(baseline),'0388a13f165a3a603b28d87f4bf2c79921fd59fdc4ee21250b4c581324cc6d10');
const moduleSha256=sha(await readFile(assets+'warehouse-amazon-finance.js')),styleSha256=sha(await readFile(assets+'warehouse-amazon-finance.css'));
const head='import {createAmazonFinance as __createAmazonFinance} from "./warehouse-amazon-finance.js?v='+moduleSha256+'";\n';
const patches=[
 ['var VehicleCard=__createVehicleCard(l);','var AmazonFinanceDialog=__createAmazonFinance(l),AmazonFinanceSummary=AmazonFinanceDialog.Summary;var VehicleCard=__createVehicleCard(l);'],
 ['function $c({data:e,now:t,error:n=``,loading:r=!1})','function $c({data:e,now:t,error:n=``,loading:r=!1,onAmazonFinance:__openAmazonFinance=()=>{}})'],
 ['(0,H.jsxs)(`span`,{children:[(0,H.jsx)(`i`,{className:`key amazon`}),c]})','(0,H.jsx)(`span`,{children:(0,H.jsxs)(`button`,{type:`button`,className:`af-open`,style:{gap:`inherit`},onClick:__openAmazonFinance,title:`Apri costi, commissioni e rimanenze Amazon`,"aria-haspopup":`dialog`,children:[(0,H.jsx)(`i`,{className:`key amazon`}),c]})})'],
 ['function ol({inventory:e,now:t,onProof:n,changed:r})','function ol({inventory:e,now:t,onProof:n,changed:r,onAmazonFinance:__openAmazonFinance=()=>{},finance:__amazonFinance})'],
 ['children:[`Logistica Amazon FBA`,(0,H.jsx)(hc,{at:r,now:t})]','children:[(0,H.jsx)(`button`,{type:`button`,className:`af-open`,onClick:__openAmazonFinance,title:`Apri costi, commissioni e rimanenze Amazon`,"aria-haspopup":`dialog`,children:`Logistica Amazon FBA`}),(0,H.jsx)(hc,{at:r,now:t})]'],
 ['onRefresh:f,onExit:p}){let[m,h]=(0,l.useState)(null)','onRefresh:f,onExit:p}){let[__financeOpen,__setFinanceOpen]=(0,l.useState)(!1);let[m,h]=(0,l.useState)(null)'],
 ['(0,H.jsx)($c,{data:o,now:e,error:s,loading:c})','(0,H.jsx)($c,{data:o,now:e,error:s,loading:c,onAmazonFinance:()=>__setFinanceOpen(!0)})'],
 ['(0,H.jsx)(ol,{inventory:t?.inventory,now:e,onProof:h,changed:b.changed[`fba-inventory`]})','(0,H.jsx)(ol,{inventory:t?.inventory,now:e,onProof:h,changed:b.changed[`fba-inventory`],onAmazonFinance:()=>__setFinanceOpen(!0),finance:o?.services?.find(__s=>__s.id===`amazon`)?.sales?.finance})'],
 ['m&&(0,H.jsx)(Oc,{proof:m,onClose:()=>h(null)})','__financeOpen&&(0,H.jsx)(AmazonFinanceDialog,{data:o?.services?.find(__s=>__s.id===`amazon`)?.sales?.finance,now:e,close:()=>__setFinanceOpen(!1)}),m&&(0,H.jsx)(Oc,{proof:m,onClose:()=>h(null)})']
,["(0,H.jsxs)(`div`,{className:`sales-block sales-trend`","(0,H.jsx)(AmazonFinanceSummary,{data:e?.services?.find(__s=>__s.id===`amazon`)?.sales?.finance,now:t,kind:`sales`,onOpen:__openAmazonFinance}),(0,H.jsxs)(`div`,{className:`sales-block sales-trend`"]
,["(0,H.jsxs)(`h4`,{className:`subhead`,children:[(0,H.jsx)(`span`,{children:`Scorte FBA più basse`})","(0,H.jsx)(AmazonFinanceSummary,{data:__amazonFinance,now:t,kind:`fba`,onOpen:__openAmazonFinance}),(0,H.jsxs)(`h4`,{className:`subhead`,children:[(0,H.jsx)(`span`,{children:`Scorte FBA più basse`})"]
].map(([baseline,addition])=>({baseline,addition}));
let bundle=baseline;for(const p of patches){assert.equal(bundle.split(p.baseline).length,2,'Ambiguous finance hook: '+p.baseline);bundle=bundle.replace(p.baseline,p.addition)}bundle=head+bundle;
await writeFile(path,bundle);
const proof={baselineSha256:sha(baseline),moduleSha256,styleSha256,head,patches};
await writeFile('scripts/warehouse-amazon-finance-baseline.json',JSON.stringify(proof,null,2)+'\n');
let html=await readFile(prefix+'capannone_3d.html','utf8');html=html.replace('?v='+sha(baseline),'?v='+sha(bundle)).replace('  </head>','  <link rel="stylesheet" href="/minimal-originale/warehouse-assets/warehouse-amazon-finance.css?v='+styleSha256+'">\n  </head>');await writeFile(prefix+'capannone_3d.html',html);
const manifest=JSON.parse(await readFile(prefix+'warehouse-release.json','utf8'));
for(const p of ['capannone_3d.html','warehouse-assets/warehouse-DAXf6-td.js','warehouse-assets/warehouse-amazon-finance.js','warehouse-assets/warehouse-amazon-finance.css']){const b=await readFile(prefix+p);manifest.files['/minimal-originale/'+p]={sha256:sha(b),size:b.length}}
manifest.enhancements.amazonFinance={request:'17 October 2026: correct total revenue, verify B2B inclusion, add cross-report reconciliation and dashboard summary cards; match the existing theme and preserve hero',moduleSha256,styleSha256,baselineBundleSha256:sha(baseline),data:'Signed, aggregated Seller Central browser reports through the existing authenticated CRM response; no new browser fetch or storage',account:'Bionee LG Italia',coverage:'Calendar sales with B2B subset, fiscal revenue by marketplace/currency, posted costs and cross-report differences; dashboard theme and compact summaries; no invented profit or VAT payable'};
await writeFile(prefix+'warehouse-release.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({hooks:patches.length,moduleSha256,styleSha256,bundle:sha(bundle)}));
