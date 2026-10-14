"""Add a separately maintained cockpit to the exact approved live warehouse bundle.
The supplied ordered dashboard has no matching buildable source in the CRM repo.
Keep existing file names and all original UI/authentication/operational functions.
"""
from pathlib import Path
import hashlib, json, re

root = Path(__file__).resolve().parents[1]
public = root / 'public/minimal-originale'
bundle = public / 'warehouse-assets/warehouse-DAXf6-td.js'
sha = lambda b: hashlib.sha256(b).hexdigest()
source = bundle.read_text()
if '__createILPCockpit' in source:
    raise SystemExit('Cockpit already integrated; edit the independent module.')
assert sha(bundle.read_bytes()) == '92719281b74dbf5c0a09630d58e0afb45b54e98171de555e24f34c0ad359e82f', 'Live baseline differs; inspect before adapting'
changes = [
 ('function Sl({now:e,', 'var ILPCockpit=__createILPCockpit(l);function Sl({ilpUser:ilpUser=null,now:e,'),
 ('return(0,H.jsx)(Sl,{now:n,', 'return(0,H.jsx)(Sl,{ilpUser:e,now:n,'),
 ('(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:', '(0,H.jsx)(vc,{id:`ilovepaghe`,title:`iLovePaghe`,children:(0,H.jsx)(ILPCockpit,{user:ilpUser,now:e})}),(0,H.jsxs)(vc,{id:`activity`,title:`Attività`,children:')
]
for old, new in changes:
    assert source.count(old) == 1, old
    source = source.replace(old, new)
module_hash = sha((public/'warehouse-assets/warehouse-ilovepaghe.js').read_bytes())
source = 'import {createILPCockpit as __createILPCockpit} from "./warehouse-ilovepaghe.js?v='+module_hash+'";\n' + source
bundle.write_text(source)
html = public/'capannone_3d.html'
s = re.sub(r'(warehouse-DAXf6-td\.js)\?v=[a-f0-9]+', r'\1?v='+sha(bundle.read_bytes()), html.read_text())
style_hash = sha((public/'warehouse-assets/warehouse-ilovepaghe.css').read_bytes())
s = s.replace('</head>', '<link rel="stylesheet" href="/minimal-originale/warehouse-assets/warehouse-ilovepaghe.css?v='+style_hash+'">\n  </head>')
html.write_text(s)
manifest_path = public/'warehouse-release.json'
manifest = json.loads(manifest_path.read_text())
for p in [bundle, html, public/'warehouse-assets/warehouse-ilovepaghe.js', public/'warehouse-assets/warehouse-ilovepaghe.css']:
    manifest['files']['/minimal-originale/'+p.relative_to(public).as_posix()] = {'sha256':sha(p.read_bytes()), 'size':p.stat().st_size}
manifest.setdefault('enhancements', {})['ilovepagheCockpit'] = {'source':'Firebase read-only', 'refreshSeconds':900, 'moduleSha256':module_hash, 'styleSha256':style_hash, 'baselineBundleSha256':'92719281b74dbf5c0a09630d58e0afb45b54e98171de555e24f34c0ad359e82f'}
manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'bundleSha256':sha(bundle.read_bytes()), 'moduleSha256':module_hash, 'styleSha256':style_hash, 'unchangedExistingFunctions':True}))
