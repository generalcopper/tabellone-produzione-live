import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash, webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {securityDetails} from '../public/minimal-originale/warehouse-assets/warehouse-wazuh-security.js';

const bundle = await readFile(new URL('../public/minimal-originale/warehouse-assets/warehouse-DAXf6-td.js', import.meta.url), 'utf8');
// Execute the production ingestion validator with its actual date and digest helpers.
// Testing the card's projection alone would miss a rejected HTTP response.
export function validatorFromBundle(source) {
  const dateStart = source.indexOf('Io=e=>Date.parse(e??');
  const dateEnd = source.indexOf(';', dateStart);
  const hashStart = source.indexOf('function Vo(e){return Array.isArray(e)');
  const hashEnd = source.indexOf('async function Go(e)', hashStart);
  const validatorStart = source.indexOf('async function I(e)');
  const validatorEnd = source.indexOf('function L(e)', validatorStart);
  assert.ok(dateStart >= 0 && dateEnd > dateStart && hashStart >= 0 &&
    hashEnd > hashStart && validatorStart >= 0 && validatorEnd > validatorStart);
  return vm.runInNewContext(
    'const ' + source.slice(dateStart, dateEnd + 1) +
    source.slice(hashStart, hashEnd) +
    source.slice(validatorStart, validatorEnd) + ';I',
    {crypto: webcrypto, TextEncoder}
  );
}
const validate = validatorFromBundle(bundle);
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(
    Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sign = value => {
  const {sha256, ...body} = value;
  return {...body, sha256: createHash('sha256').update(JSON.stringify(canonical(body))).digest('hex')};
};
const now = Date.parse('2026-10-19T10:35:00Z');
const generatedAt = new Date(now - 1000).toISOString();
const expiresAt = new Date(now + 60000).toISOString();
const ids = ['mac-mini', 'pc-brt', 'macbook', 'pc-windows', 'mac-mini-lg'];
const check = (id, state = 'ok') => ({id, label: id, state, detail: 'Verificato'});
const snapshot = sign({
  version: 1, state: 'down', generatedAt, expiresAt,
  devices: ids.map(id => ({
    id, name: id === 'mac-mini-lg' ? 'Mac mini LG' : id,
    state: id === 'mac-mini-lg' ? 'down' : 'ok',
    observedAt: generatedAt, expiresAt,
    checks: id === 'mac-mini-lg' ?
      ['firewall', 'gatekeeper', 'sip', 'filevault', 'xprotect', 'wazuh-agent', 'wazuh-threats', 'wazuh-integrity']
        .map(name => check(name, name === 'filevault' ? 'down' : 'ok')) :
      [check('firewall'), check('wazuh-agent')]
  })),
  checks: [check('wazuh-server')],
  wazuh: {connected: 5, total: 5, expiresAt},
  notifications: {state: 'ok', checkedAt: generatedAt}
});
assert.equal(await validate(snapshot), true);
assert.equal(await validate(sign({...snapshot, devices: [...snapshot.devices].reverse()})), true);
assert.equal(await validate({...snapshot, state: 'ok'}), false, 'Altered response must fail SHA-256');
assert.equal(await validate(sign({...snapshot, devices: snapshot.devices.slice(0, 4)})), false);
const duplicate = structuredClone(snapshot); duplicate.devices[4] = structuredClone(duplicate.devices[0]);
assert.equal(await validate(sign(duplicate)), false, 'Duplicate identities must not replace Mac mini LG');
const unknown = structuredClone(snapshot); unknown.devices[4].id = 'unregistered-mac';
assert.equal(await validate(sign(unknown)), false);
assert.equal(await validate(sign({...snapshot, devices: [...snapshot.devices, snapshot.devices[0]]})), false);
assert.equal(await validate(sign({...snapshot, checks: null})), false);
assert.equal(await validate(sign({...snapshot, version: 2})), false);
assert.equal(await validate(sign({...snapshot, expiresAt: 'not-a-date'})), false);
assert.equal(await validate(null), false);
assert.equal(await validate(sign({...snapshot, devices: [null, ...snapshot.devices.slice(1)]})), false);
const view = securityDetails(snapshot, false, now);
assert.equal(view.devices.length, 5);
assert.match(view.coverage, /5\/5 dispositivi/);
const mac = view.devices.find(device => device.id === 'mac-mini-lg');
assert.equal(mac.checks.length, 8);
assert.equal(mac.checks.filter(item => item.state === 'ok').length, 7);
assert.equal(mac.checks.find(item => item.id === 'filevault').state, 'down');
assert.equal(securityDetails(snapshot, false, now + 60001).verified, 0);
assert.equal(securityDetails(snapshot, true, now).verified, 0);
console.log(JSON.stringify({securityInventory: 'passed', ingestionCases: 12, devices: 5,
  macMiniLg: '7/8; FileVault warning retained', tamperedHashRejected: true, expiryPreserved: true}));

const snapshotOption = process.argv.indexOf('--snapshot');
if (snapshotOption >= 0) {
  const live = JSON.parse(await readFile(process.argv[snapshotOption + 1], 'utf8'));
  assert.equal(await validate(live), true, 'Actual backend response must pass the shipped validator');
  const liveView = securityDetails(live, false, Date.now());
  const liveMac = liveView.devices.find(device => device.id === 'mac-mini-lg');
  assert.ok(liveView.verified > 0 && liveMac?.checks.length === 8);
  assert.equal(liveMac.checks.filter(item => item.state === 'ok').length, 7);
  assert.equal(liveMac.checks.find(item => item.id === 'filevault').state, 'down');
  assert.match(liveView.coverage, /5\/5 dispositivi/);
  console.log(JSON.stringify({liveSecurity: 'passed', devices: liveView.devices.length,
    macMiniLgChecks: 8, macMiniLgOk: 7, generatedAt: live.generatedAt}));
}
