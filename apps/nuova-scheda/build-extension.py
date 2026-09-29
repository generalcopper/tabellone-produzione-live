"""Rebuild the local new-tab extension from the shared static website."""
from pathlib import Path
import json
import shutil
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
site = root / 'public'
extension = root / 'extension'
html = (site / 'index.html').read_text()
html = html.replace('href="style.css"', 'href="newtab.css"')
html = html.replace('src="app.js"', 'src="newtab.js"')
(extension / 'newtab.html').write_text(html)
for source, target in [('style.css', 'newtab.css'), ('app.js', 'newtab.js'), ('shortcuts.js', 'shortcuts.js'), ('favicons.js', 'favicons.js')]:
    shutil.copy2(site / source, extension / target)
shutil.copytree(site / 'assets', extension / 'assets', dirs_exist_ok=True)
shutil.copy2(site / 'assets/lg.png', extension / 'icon.png')
files = [p for p in extension.rglob('*') if p.is_file()]
print(json.dumps({'files': len(files), 'bytes': sum(p.stat().st_size for p in files)}))

# Publish the same installable folder with the website.
with ZipFile(site / 'LGNuovaScheda.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted(files):
        archive.write(file, Path('LGNuovaScheda') / file.relative_to(extension))
