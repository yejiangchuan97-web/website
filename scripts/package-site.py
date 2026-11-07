"""Build a deployable site and put the ZIP in artifacts/packages/."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
from hashlib import sha256
import argparse
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=ROOT/'artifacts/site', help='Website directory inside artifacts/')
args = parser.parse_args()
site = args.output.resolve()
assert site.is_relative_to(ROOT/'artifacts') and site != ROOT/'artifacts', 'Output must be a directory inside artifacts/'
site.mkdir(parents=True, exist_ok=True)

class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for key, value in attrs:
            if value and key in ('href', 'src', 'poster'):
                self.refs.append(value)
        if tag == 'meta' and values.get('http-equiv','').lower() == 'refresh':
            match = re.search(r'url\s*=\s*(.+)', values.get('content',''), re.I)
            if match:
                self.refs.append(match[1].strip().strip('\"\''))

pending = [ROOT/'index.html', ROOT/'course/home/index.html', ROOT/'course/home/data.js']
catalog=json.loads((ROOT/'course/catalog.json').read_text(encoding='utf-8'))['tasks']
models=json.loads((ROOT/'shared/models/manifest.json').read_text(encoding='utf-8'))
pending.extend(ROOT/row[key] for row in models for key in ('runtime','license','provenance') if row.get(key))
machinery=json.loads((ROOT/'shared/models/machinery/manifest.json').read_text(encoding='utf-8'))
pending.extend(ROOT/row[key] for row in machinery for key in ('runtime','license','provenance'))
pending.append(ROOT/'shared/models/machinery/manifest.json')
for family in ('dozer','drone'):
    model_manifest=ROOT/f'shared/models/{family}/manifest.json'
    pending.append(model_manifest)
    pending.extend(ROOT/row[key] for row in json.loads(model_manifest.read_text(encoding='utf-8')) for key in ('runtime','license','provenance'))
pending.append(ROOT/'shared/models/manifest.json')  # 教材文档在仓库外，不随网站发布
pending.append(ROOT/'resources/media/promo-720p.mp4')  # 宣传片，README 封面链接到线上这份
for pattern in ('course/chapters/*/overview/*.html', 'course/chapters/*/tasks/*/*.html',
                'course/chapters/*/tasks/*/assets/**/*', 'shared/vendor/**/*', 'shared/anatomy/LICENSE*'):
    pending.extend(p for p in ROOT.glob(pattern) if p.is_file())
copied = set()
def enqueue(source, value):
    parts = urlsplit(value)
    if parts.scheme or parts.netloc or not parts.path or '${' in value:
        return
    target = (source.parent/unquote(parts.path)).resolve()
    assert target.is_relative_to(ROOT), f'Outside repository: {source}: {value}'
    assert target.is_file(), f'Missing runtime dependency: {source.relative_to(ROOT)}: {value}'
    if target not in copied:
        pending.append(target)

while pending:
    source = pending.pop().resolve()
    if source in copied:
        continue
    assert source.is_relative_to(ROOT) and source.is_file(), source
    copied.add(source)
    target = site/source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    if source.suffix.lower() not in ('.html','.css','.js','.mjs'):
        continue
    text = source.read_text(encoding='utf-8-sig')
    if source.suffix.lower() == '.html':
        parsed = Links()
        parsed.feed(text)
        for value in parsed.refs:
            enqueue(source, value)
    elif source.suffix.lower() == '.css':
        for value in re.findall(r'url\([\"\x27]?([^\)\"\x27]+)', text):
            enqueue(source, value)
    else:
        for value in re.findall(r'(?:^|\n)\s*(?:import|export)[^\n]*?[\"\x27](\.[^\"\x27]+)[\"\x27]', text):
            enqueue(source, value)
manifest = [{'path':p.relative_to(ROOT).as_posix(), 'bytes':p.stat().st_size, 'sha256':sha256(p.read_bytes()).hexdigest()} for p in sorted(copied)]
# Remove stale generated files only inside the verified output directory.
expected = {row['path'] for row in manifest} | {'manifest.json','.nojekyll','使用说明.txt'}
for path in site.rglob('*'):
    if path.is_file() and path.relative_to(site).as_posix() not in expected:
        assert path.resolve().is_relative_to(site) and site.is_relative_to(ROOT/'artifacts')
        path.unlink()
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('双击 index.html 打开课程。上传网站时上传本目录全部内容，并保持相对位置。\n课程公共资源位于 shared/，无须上传开发源码、历史副本和检查截图。\n', encoding='utf-8')
(site/'manifest.json').write_text(json.dumps({'chapters':len({t['id'].split('-')[0] for t in catalog}),'tasks':len(catalog),'files':manifest},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
archive = ROOT/'artifacts/packages/course.zip'
archive.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for row in manifest:
        z.write(site/row['path'],row['path'])
    for name in ('manifest.json','.nojekyll','使用说明.txt'):
        z.write(site/name,name)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None and 'index.html' in z.namelist()
result={'site':str(site.relative_to(ROOT)),'archive':str(archive.relative_to(ROOT)), 'files':len(manifest)+3, 'zip_MiB':round(archive.stat().st_size/1048576,2)}
(ROOT/'artifacts/reports').mkdir(parents=True,exist_ok=True)
(ROOT/'artifacts/reports/package.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=True,indent=2))
