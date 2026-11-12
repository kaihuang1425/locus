"""Build a minimal, reproducible Chrome Web Store ZIP. Standard library only."""
from pathlib import Path
from html.parser import HTMLParser
import argparse
import hashlib
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = (
    'manifest.json', 'newtab.html', 'newtab.js', 'newtab.css', 'themes.css',
    'prepaint.js', 'import-utils.js', 'plan-contract.js', 'planner.js', 'plan.js',
    'popup.html', 'popup.js', 'popup.css', 'background.js', 'suspended.html',
    'suspended.js', 'emoji-data.js', 'favicon.ico', 'LICENSE',
)

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'img', 'source') and attrs.get('src'):
            self.refs.append(attrs['src'])
        if tag == 'link' and attrs.get('href'):
            self.refs.append(attrs['href'])

def build(destination):
    manifest = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8-sig'))
    assert manifest['manifest_version'] == 3
    assert 1 <= len(manifest['description']) <= 132
    assert not manifest.get('host_permissions')
    assert not manifest.get('content_scripts')
    assert "connect-src 'none'" in manifest['content_security_policy']['extension_pages']
    assert manifest.get('optional_permissions') == ['nativeMessaging']
    files = set(RUNTIME)
    files.update(f'icons/icon{size}.png' for size in (16,32,48,128))
    files.update(path.relative_to(ROOT).as_posix() for path in (ROOT / 'media/fonts').iterdir()
                 if path.suffix.lower() in ('.css', '.woff', '.woff2', '.txt'))
    for name in list(files):
        path = ROOT / name
        assert path.is_file(), f'Missing runtime file: {name}'
        if path.suffix == '.html':
            page = Assets(); page.feed(path.read_text(encoding='utf-8-sig'))
            refs = page.refs
        elif path.suffix == '.css':
            refs = re.findall(r'url\([\s\"\']*([^\)\"\']+)', path.read_text(encoding='utf-8-sig'))
        else:
            continue
        for ref in refs:
            if ref.startswith(('#','data:','blob:')): continue
            assert not re.match(r'^https?://', ref), f'Remote runtime asset: {name}: {ref}'
            resolved = (path.parent / ref.split('?')[0].split('#')[0]).resolve().relative_to(ROOT).as_posix()
            assert resolved in files, f'Unpackaged asset: {name} -> {resolved}'
    destination = destination.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    unpacked = destination / f'locus-{manifest["version"]}-unpacked'
    unpacked.mkdir(exist_ok=True)
    # Do not merge stale release files into a new package silently.
    unexpected = [p.relative_to(unpacked).as_posix() for p in unpacked.rglob('*')
                  if p.is_file() and p.relative_to(unpacked).as_posix() not in files]
    assert not unexpected, f'Unexpected existing files in release folder: {unexpected}'
    zip_path = destination / f'locus-{manifest["version"]}-chrome-web-store.zip'
    hashes = {}
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in sorted(files):
            data = (ROOT / name).read_bytes()
            target = unpacked / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            entry = zipfile.ZipInfo(name, (2026,1,1,0,0,0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, data)
            hashes[name] = hashlib.sha256(data).hexdigest()
    with zipfile.ZipFile(zip_path) as archive:
        assert archive.testzip() is None
        assert 'manifest.json' in archive.namelist()
        assert all(not name.startswith(('.','docs/','design/','marketing/','companion/','scripts/')) for name in archive.namelist())
    report = {'version':manifest['version'], 'zip':zip_path.name, 'files':len(files),
              'description_characters':len(manifest['description']), 'bytes':zip_path.stat().st_size,
              'sha256':hashlib.sha256(zip_path.read_bytes()).hexdigest(), 'runtime_hashes':hashes}
    (destination / 'package-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({key:value for key,value in report.items() if key != 'runtime_hashes'}, indent=2))
    return zip_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    build(parser.parse_args().output)
