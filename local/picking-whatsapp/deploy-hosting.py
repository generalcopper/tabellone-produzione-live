"""Patch only Picking notification files by cloning the current live version."""
import gzip
import hashlib
import importlib.util
import json
import re
import subprocess
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
spec = importlib.util.spec_from_file_location('gcp_api', HERE / 'gcp-api.py')
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
PROJECT = helper.PROJECT
BASE = 'https://firebasehosting.googleapis.com/v1beta1/'
TARGETS = ['picking-whatsapp.js', 'picking-notifications.js', 'picking-notifications.css', 'picking.js', 'picking.html']
digest = lambda data: hashlib.sha256(data).hexdigest()

def files(api, version):
    found, token = {}, ''
    while True:
        result = api.call('GET', BASE + version + '/files?pageSize=1000' + ('&pageToken=' + token if token else ''))
        for item in result.get('files', []):
            found[item['path']] = item['hash']
        token = result.get('nextPageToken')
        if not token:
            return found

def prepare():
    # Compare to the live bytes, not just a potentially stale Git checkout.
    for name in TARGETS[1:]:
        original = subprocess.run(['git', '-C', str(ROOT), 'show', 'HEAD:public/' + name], capture_output=True, check=True).stdout
        live = subprocess.run(['curl', '--fail', '--silent', '--show-error', 'https://' + PROJECT + '.firebaseapp.com/' + name], capture_output=True, check=True).stdout
        if original != live:
            raise RuntimeError('Live source differs from baseline: ' + name)
    public = ROOT / 'public'
    module = public / 'picking-notifications.js'
    picking = public / 'picking.js'
    text, count = re.subn(r'picking-notifications\.js\?v=[a-z0-9]+', 'picking-notifications.js?v=' + digest(module.read_bytes())[:12], picking.read_text())
    if count != 1: raise RuntimeError('Missing notifications import')
    picking.write_text(text)
    html = public / 'picking.html'
    text = html.read_text()
    for name in ['picking.js', 'picking-notifications.css']:
        text, count = re.subn(re.escape(name) + r'\?v=[a-z0-9]+', name + '?v=' + digest((public / name).read_bytes())[:12], text)
        if count != 1: raise RuntimeError('Missing asset ' + name)
    text = text.replace('>Notifiche email</span>', '>Notifiche</span>').replace('>Notifiche email</h2>', '>Notifiche</h2>')
    html.write_text(text)

def deploy():
    api = helper.API()
    live = api.call('GET', BASE + 'sites/' + PROJECT + '/releases?pageSize=1')['releases'][0]['version']['name']
    before = files(api, live)
    old_config = api.call('GET', BASE + live).get('config', {})
    op = api.call('POST', BASE + 'sites/' + PROJECT + '/versions:clone', {'sourceVersion': live, 'finalize': False})
    for _ in range(30):
        if op.get('done'): break
        time.sleep(1)
        op = api.call('GET', BASE + op['name'])
    if not op.get('done') or op.get('error'): raise RuntimeError('Clone failed: ' + str(op.get('error')))
    version = op['response']['name']
    if api.call('GET', BASE + version).get('config', {}) != old_config:
        raise RuntimeError('Hosting config was not preserved')
    compressed = {name: gzip.compress((ROOT / 'public' / name).read_bytes(), mtime=0) for name in TARGETS}
    hashes = {'/' + name: digest(content) for name, content in compressed.items()}
    result = api.call('POST', BASE + version + ':populateFiles', {'files': hashes})
    by_hash = {digest(data): data for data in compressed.values()}
    for value in result.get('uploadRequiredHashes', []):
        api.call('POST', result['uploadUrl'] + '/' + value, binary=by_hash[value])
    expected = {**before, **hashes}
    after = files(api, version)
    if after != expected: raise RuntimeError('Unexpected file changes; no release created')
    api.call('PATCH', BASE + version + '?updateMask=status', {'status': 'FINALIZED'})
    current = api.call('GET', BASE + 'sites/' + PROJECT + '/releases?pageSize=1')['releases'][0]['version']['name']
    if current != live: raise RuntimeError('Live version changed during preparation; retry from the new live version')
    release = api.call('POST', BASE + 'sites/' + PROJECT + '/releases?versionName=' + version, {'message': 'Picking: unified recipients, independent email/WhatsApp and delivery receipts'})
    report = {'previousVersion': live, 'version': version, 'changedFiles': TARGETS, 'preservedFileCount': len(before) - len(set(before) & set(hashes)), 'release': release}
    (HERE / 'reports').mkdir(exist_ok=True)
    (HERE / 'reports/hosting-release.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({k: report[k] for k in ['previousVersion', 'version', 'changedFiles', 'preservedFileCount']}))

if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['prepare']: prepare(); print('Picking assets prepared with content hashes')
    elif sys.argv[1:] == ['release']: deploy()
    else: raise SystemExit('Use prepare or release')
