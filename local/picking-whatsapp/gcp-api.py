"""Scoped deploy helper. OAuth tokens stay in memory and never enter argv/logs."""
import json
import subprocess
import tempfile
from pathlib import Path

PROJECT = 'tabellone-produzione-liv-e313e'

class API:
    def __init__(self):
        result = subprocess.run(['gcloud', 'auth', 'print-access-token', '--account=ludovicogiarola@gmail.com'],
                                capture_output=True, text=True, check=True)
        self.token = result.stdout.strip()

    def call(self, method, url, data=None, binary=None):
        from urllib.parse import urlparse
        allowed = {'firebasehosting.googleapis.com', 'upload-firebasehosting.googleapis.com', 'firebaserules.googleapis.com'}
        if urlparse(url).scheme != 'https' or urlparse(url).hostname not in allowed:
            raise ValueError('Unexpected API host')
        with tempfile.TemporaryDirectory(prefix='picking-api-') as folder:
            args = ['curl', '--silent', '--show-error', '--max-time', '90', '--config', '-', '--request', method,
                    '--write-out', '\n%{http_code}', '--header', 'x-goog-user-project: ' + PROJECT, url]
            if data is not None or binary is not None:
                body = Path(folder) / 'body'
                body.write_bytes(binary if binary is not None else json.dumps(data).encode())
                args += ['--header', 'Content-Type: application/octet-stream' if binary is not None else 'Content-Type: application/json',
                         '--data-binary', '@' + str(body)]
            result = subprocess.run(args, input='header = "Authorization: Bearer ' + self.token + '"\n',
                                    capture_output=True, text=True, check=True)
            body, code = result.stdout.rsplit('\n', 1)
            if not 200 <= int(code) < 300:
                raise RuntimeError('API HTTP ' + code + ': ' + body[:1500])
            return json.loads(body) if body.strip() else {}

if __name__ == '__main__':
    api = API()
    release = api.call('GET', 'https://firebaserules.googleapis.com/v1/projects/' + PROJECT + '/releases/cloud.firestore')
    rules = api.call('GET', 'https://firebaserules.googleapis.com/v1/' + release['rulesetName'])
    root = Path(__file__).resolve().parents[2]
    folder = root / 'local/picking-whatsapp/reports'
    folder.mkdir(exist_ok=True)
    (folder / 'firestore-rules-before.json').write_text(json.dumps(rules, indent=2))
    files = rules.get('source', {}).get('files', [])
    for f in files:
        text = f.get('content', '')
        print('RULE FILE', f.get('name'), 'lines', len(text.splitlines()))
        for line in text.splitlines():
            if 'picking' in line.lower() or 'document=**' in line or 'allow read, write:' in line:
                print(line)
    live = api.call('GET', 'https://firebasehosting.googleapis.com/v1beta1/sites/' + PROJECT + '/releases?pageSize=1')
    (folder / 'hosting-before.json').write_text(json.dumps(live, indent=2))
    print('HOSTING', live['releases'][0]['version']['name'])
