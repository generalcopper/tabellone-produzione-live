import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
// The user requested inclusion of Mac mini LG. Restore only its reviewed
// inventory validator when comparing the otherwise byte-identical dashboard.
const baseline = "async function I(e){return e?.version===1&&Array.isArray(e.devices)&&e.devices.length===4&&Array.isArray(e.checks)&&F(e.expiresAt)&&await Wo(e)}";
const reviewed = "async function I(e){return e?.version===1&&Array.isArray(e.devices)&&e.devices.length===5&&new Set(e.devices.map(e=>e?.id)).size===5&&[\"mac-mini\",\"pc-brt\",\"macbook\",\"pc-windows\",\"mac-mini-lg\"].every(t=>e.devices.some(e=>e?.id===t))&&Array.isArray(e.checks)&&F(e.expiresAt)&&await Wo(e)}";
export function restoreSecurityInventory(bundle) {
  assert.equal(bundle.split(reviewed).length, 2, 'Security inventory validator missing or duplicated');
  assert.ok(!bundle.includes(baseline), 'Obsolete four-device validator remains');
  const original = bundle.replace(reviewed, baseline);
  assert.equal(createHash('sha256').update(original).digest('hex'),
    '9561b617d3ee3aa0dfa8e72d8a7c6685f9867ca5de4fcb0777067c43ef82d29f',
    'Dashboard changed beyond the reviewed five-device security validation');
  return original;
}
