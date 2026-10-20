import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha = value => createHash('sha256').update(value).digest('hex');
export const serviceAlertPatches = [
  ['f=e?.services??[],p=f.filter', 'f=__monitoredServices(e?.services),p=f.filter'],
  ['for(let o of t.services){let t=sc(o)', 'for(let o of __monitoredServices(t.services)){let t=sc(o)'],
  ['services:t?.services??[],now:e,onProof:h', 'services:__monitoredServices(t?.services),now:e,onProof:h']
];
export async function restoreServiceAlerts(bundle) {
  const module = await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-service-alerts.js', import.meta.url));
  assert.equal(sha(module), '5256163147a83ca20e8b41b34b6509f880c301bf9d1fedd084aac5059978dfb8', 'Reviewed Instagram-only display policy changed');
  const head = 'import {monitoredServices as __monitoredServices} from "./warehouse-service-alerts.js?v=' + sha(module) + '";\n';
  assert.ok(bundle.startsWith(head), 'Reviewed service display policy import missing');
  let original = bundle.slice(head.length);
  for (const [baseline, addition] of serviceAlertPatches) {
    assert.equal(original.split(addition).length, 2, 'Service display hook missing or duplicated');
    original = original.replace(addition, baseline);
  }
  assert.equal(sha(original), 'fd9898f071c01947e765ab67582b2bfed7fc54b0b78e2549294dedff5ab02083',
    'Dashboard changed beyond the three reviewed service display hooks');
  return original;
}
