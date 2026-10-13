// Reproduce the approved ordered build without rebuilding the older CRM layout.
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base = '0c6bb5631baf191d0735b41c6fc5e5bac2798c34';
const prefix = '/minimal-originale/';
const entry = 'public' + prefix + 'capannone_3d.html';
const bundle = 'warehouse-assets/warehouse-DAXf6-td.js';
const moduleName = 'warehouse-assets/warehouse-wazuh-security.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const original = path => execFileSync('git', ['show', base + ':public' + prefix + path]);
const code = original(bundle).toString('utf8');
if (sha(code) !== 'a2ff9b5df43efd9006e8cbaa08feea877395fdd969e294a06380d1cff0bbc3b5') throw Error('Approved ordered bundle changed');
const start = code.indexOf('function qs(e,t,n){return t||!e||Io(e.expiresAt)');
const end = code.indexOf('var Ys={ok:', start);
if (start < 0 || end < start || sha(code.slice(start,end)) !== '94dfb403dfa36430a53d948031f28513926696e4de56282dc4786641fcb7c87c') throw Error('Security adapter boundary changed');
const moduleBytes = await readFile('public' + prefix + moduleName);
const moduleHash = sha(moduleBytes);
const adapted = 'import {securityViewState as qs, securityDetails as Js} from "./warehouse-wazuh-security.js?v=' + moduleHash + '";\n'
  + code.slice(0,start) + code.slice(end);
await writeFile('public' + prefix + bundle, adapted);
const html = original('capannone_3d.html').toString('utf8').replace(prefix + bundle, prefix + bundle + '?v=' + sha(adapted));
await writeFile(entry, html);
const manifest = JSON.parse(original('warehouse-release.json'));
manifest.layout = {id:'riordinato-2026-10-12', sourceCommit:base, sourceBundleSha256:sha(code),
  sourceStylesheetSha256:'1f253798bf187cbff1612929ba1a7f92ab510003f23a362f45e38a2533cc3f05'};
manifest.enhancements = {wazuhSecurity:true, moduleSha256:moduleHash, unchangedPresentationSha256:'e15bb66569b38fd18e612e21f2cb8a35be73bc04b20b75327bfaa63d764392e7'};
manifest.files[prefix + moduleName] = {sha256:moduleHash,size:moduleBytes.length};
for (const path of Object.keys(manifest.files)) {
  const bytes = await readFile('public' + path);
  manifest.files[path] = {sha256:sha(bytes),size:bytes.length};
}
await writeFile('public' + prefix + 'warehouse-release.json', JSON.stringify(manifest,null,2) + '\n');
console.log(JSON.stringify({layout:manifest.layout.id, files:Object.keys(manifest.files).length, bundleSha256:sha(adapted)}));
