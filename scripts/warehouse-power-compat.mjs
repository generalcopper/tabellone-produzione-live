import {restoreILPCockpitImport} from './warehouse-ilovepaghe-compat.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// 22 October 2026: the user set the displayed site contract and all gauges to 15 kW.
// Signed telemetry, freshness checks, chart layout and unrelated code stay byte-identical.
export const POWER_LIMIT_PATCHES = [
  [
    "var Is=1e4,Ls=3e4",
    "var Is=15e3,Ls=3e4"
  ],
  [
    "Hs=e=>Number.isFinite(e?.contractWatts)&&e.contractWatts>0?e.contractWatts:Is",
    "Hs=()=>Is"
  ]
];
export function restorePowerLimit(bundle) {
  let original = restoreILPCockpitImport(bundle);
  for (const [baseline, updated] of POWER_LIMIT_PATCHES) {
    assert.equal(original.split(updated).length, 2, 'Approved 15 kW configuration missing or duplicated');
    original = original.replace(updated, baseline);
  }
  assert.equal(createHash('sha256').update(original).digest('hex'), '79ea56b25e204ad1ef1bfc3f3677e97426321ef45bbd1d0fd004b20d56b7187b',
    'Dashboard changed beyond the two approved power-limit settings');
  return original;
}
