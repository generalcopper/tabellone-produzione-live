import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
export const OPERATIONAL_BASELINE='30f219ecbbc8403762a784f5ed43e733735539c72f895a2abccc493bb6586a29';
export const operationalPatches=[
  [
    "Zs=(e,t)=>Lo(e.checkedAt,e.expiresAt,t)?e.state:`unknown`",
    "Zs=(e,t)=>__serviceDisplayState(e,Lo(e.checkedAt,e.expiresAt,t)?e.state:`unknown`,t)"
  ],
  [
    "Ys={ok:`Operativo`,warn:`Attenzione`,down:`Errore`,unknown:`Da verificare`}",
    "Ys={ok:`Operativo`,warn:`Attenzione`,down:`Errore`,unknown:`Da verificare`,paused:`Pausa weekend`}"
  ],
  [
    "m=f.reduce((e,t)=>e+t.checks.length,0),h=f.reduce((e,t)=>e+(Zs(t,n)===`unknown`?0:t.checks.filter(e=>e.state===`ok`).length),0)",
    "m=f.reduce((e,t)=>e+(Zs(t,n)===`paused`?0:t.checks.length),0),h=f.reduce((e,t)=>e+([`unknown`,`paused`].includes(Zs(t,n))?0:t.checks.filter(e=>e.state===`ok`).length),0)"
  ],
  [
    "g.fresh&&(g.excess??0)>0?x.push({tone:`down`,title:`Energia`,detail:`oltre il contratto di `+V(g.excess/1e3)+` kW`}):g.fresh&&g.band!==`normal`?x.push({tone:g.band===`critical`?`down`:`warn`,title:`Energia`,detail:(g.band===`critical`?`margine ridotto · `:`carico elevato · `)+V(Math.round(g.percent))+`% del contratto`}):e&&(r||i)&&!g.fresh&&x.push({tone:`unknown`,title:`Energia`,detail:`lettura non disponibile`})",
    "g.fresh&&(g.excess??0)>0&&x.push({tone:`down`,title:`Energia`,detail:`oltre la soglia di 15 kW · eccedenza `+V(g.excess/1e3)+` kW`})"
  ],
  [
    "l=Lo(o.checkedAt,o.expiresAt,n)?o.state:`unknown`,u=e.services.get(o.id)",
    "l=Zs(o,n),u=e.services.get(o.id)"
  ],
  [
    "tone:l===`ok`?`ok`:l===`down`?`down`:`warn`,tag:f,text:l===`ok`?o.name+` · tornato operativo`:o.name+` · `+Ys[u.state]+` → `+Ys[l]+(e&&l!==`unknown`?` · `+e.label+`: `+e.detail:``)",
    "tone:l===`paused`?`info`:l===`ok`?`ok`:l===`down`?`down`:`warn`,tag:f,text:l===`paused`?o.name+` · spento per il weekend`:l===`ok`?o.name+` · tornato operativo`:o.name+` · `+Ys[u.state]+` → `+Ys[l]+(e&&l!==`unknown`?` · `+e.label+`: `+e.detail:``)"
  ],
  [
    "tone:r===`normal`?`ok`:r===`high`||r===`unavailable`?`warn`:`down`,tag:`kW`",
    "tone:r===`over`?`down`:r===`normal`?`ok`:`info`,tag:`kW`"
  ],
  [
    "l=s.fresh?c||s.band===`critical`?`down`:s.band===`high`?`warn`:`ok`:`unknown`",
    "l=s.fresh?c?`down`:`ok`:`unknown`"
  ],
  [
    "s.fresh?c?`Oltre il contratto`:s.band===`critical`?`Margine ridotto`:s.band===`high`?`Carico elevato`:`Nella norma`",
    "s.fresh?c?`Oltre 15 kW`:`Entro 15 kW`"
  ],
  [
    "var bl={down:0,warn:1,unknown:2,ok:3};function xl",
    "var bl={down:0,warn:1,unknown:2,paused:3,ok:3};function xl"
  ],
  [
    "c=o.filter(e=>e.st===`ok`||e.st===`unknown`)",
    "c=o.filter(e=>e.st===`ok`||e.st===`unknown`||e.st===`paused`)"
  ],
  [
    "className:`service-tile tone-`+i,onClick:()=>n({title:e.name,value:e}),title:e.name+` · `+(i===`ok`?`Operativo`:`Lettura scaduta · `+z(e.checkedAt,{seconds:!0}))",
    "className:`service-tile tone-`+(i===`paused`?`unknown`:i),onClick:()=>n({title:e.name,value:e}),title:e.name+` · `+(i===`paused`?`Spento per il weekend · monitoraggio feriale automatico`:i===`ok`?`Operativo`:`Lettura scaduta · `+z(e.checkedAt,{seconds:!0}))"
  ],
  [
    "children:[i===`ok`?e.checks.filter(e=>e.state===`ok`).length:`—`,`/`,e.checks.length]",
    "children:i===`paused`?[`Pausa weekend`]:[i===`ok`?e.checks.filter(e=>e.state===`ok`).length:`—`,`/`,e.checks.length]"
  ]
];
export function restoreOperationalPolicy(bundle) {
  const head="import {serviceDisplayState as __serviceDisplayState} from \"./warehouse-operational-policy.js?v=e0f6d7157e274263e7b822b27ac653e6dee4c2946c51d6588663e713c9b44766\";\n";
  if(!bundle.startsWith(head)){assert.ok(!bundle.includes('__serviceDisplayState'),'Operational policy import missing or altered');return bundle;}
  assert.equal(sha(readFileSync(new URL('../public/minimal-originale/warehouse-assets/warehouse-operational-policy.js',import.meta.url))),'e0f6d7157e274263e7b822b27ac653e6dee4c2946c51d6588663e713c9b44766','Reviewed weekend policy changed');
  let result=bundle.slice(head.length);
  for(const [before,after]of operationalPatches){assert.equal(result.split(after).length,2,'Operational hook missing or duplicated');result=result.replace(after,before);}
  assert.equal(sha(result),OPERATIONAL_BASELINE,'Unrelated approved dashboard code changed');
  return result;
}
