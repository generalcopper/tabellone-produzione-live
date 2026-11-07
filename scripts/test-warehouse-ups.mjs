import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {securityDetails,securityViewState} from '../public/minimal-originale/warehouse-assets/warehouse-wazuh-security.js';
import {restoreUpsBundle} from './warehouse-ups-compat.mjs';
const now=Date.now(),at=n=>new Date(now+n).toISOString();
const ups={id:'ups-power',label:'Alimentazione NUC · UPS',state:'ok',detail:'Corrente presente · batteria 100% · autonomia stimata 60 min',checkedAt:at(-1000),expiresAt:at(59000)};
const data={state:'ok',generatedAt:at(-1000),expiresAt:at(180000),devices:[],checks:[ups],notifications:{state:'ok'}};
let v=securityDetails(data,false,now);
assert.equal(v.upsCount,'Rete presente');assert.equal(v.upsLive,true);assert.equal(v.total,1);assert.equal(v.verified,1);assert.equal(v.general.length,0);
for(const [detail,count]of [['Corrente assente · NUC su batteria','Su batteria'],['UPS non rilevato via USB','USB assente']]){
 const d={...data,state:'down',checks:[{...ups,state:'down',detail}]};v=securityDetails(d,false,now);assert.equal(v.upsCount,count);assert.equal(v.ups.state,'down');assert.equal(v.verified,0);
}
for(const [d,error,t]of [[data,false,now+60001],[data,true,now],[{...data,checks:[{...ups,expiresAt:null}]},false,now]]){
 v=securityDetails(d,error,t);assert.equal(v.upsLive,false);assert.equal(v.ups.state,'unknown');assert.equal(v.verified,0);assert.equal(v.upsCount,'Da verificare');assert.equal(securityViewState(d,error,t),'unknown');
}
const bundle=await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js',import.meta.url),'utf8');
restoreUpsBundle(bundle);
assert.ok(bundle.includes('security:15e3},co='));
assert.ok(bundle.includes('power:5e3,business:3e4,security:15e3'));
const start=bundle.indexOf('function ll({data:'),end=bundle.indexOf('function ul(',start);
const render=vm.runInNewContext(bundle.slice(start,end)+';ll',{Js:securityDetails,H:{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},_c:'card',gc:'badge',Us:{ok:'Tutto OK'},__SR:'row',__SW:()=> 'ok',z:x=>x,xc:{arrow:'>'},mc:'proof',sl:''});
const card=render({data,error:false,now}),list=card.props.children[0];
assert.equal(list.props.children[0].props.name,'UPS · NUC Forex');
assert.equal(list.props.children[0].props.count,'Rete presente');
assert.equal(list.props.children[0].props.info,ups.detail);
assert.equal(card.props.className,'security');
console.log(JSON.stringify({check:'ups_power_security_card',status:'passed',pollSeconds:15,staleSeconds:60}));
