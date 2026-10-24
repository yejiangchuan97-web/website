"""Package the full course, keeping current lesson HTML and relative paths intact."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
from hashlib import sha256
import argparse,json,re,shutil,zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/course-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
site.mkdir(parents=True,exist_ok=True)
data=json.loads((root/'course-cover/data.js').read_text(encoding='utf-8').split('=',1)[1].strip().removesuffix(';'))
assert len(data['chapters'])==8 and all(c.get('entry') for c in data['chapters'])

class Links(HTMLParser):
    def __init__(self):super().__init__();self.refs=[]
    def handle_starttag(self,tag,attrs):
        values=dict(attrs)
        for key,value in attrs:
            if value and key in ('href','src','poster'):self.refs.append((tag,key,value))
        if tag=='meta' and values.get('http-equiv','').lower()=='refresh':
            m=re.search(r'url\s*=\s*(.+)',values.get('content',''),re.I)
            if m:self.refs.append(('a','href',m.group(1).strip().strip('\"\'')))

seeds=['index.html','公共资源/vendor/THREE-LICENSE.txt']
lessons=set()
for c in data['chapters']:
    seeds.append(c['entry'])
    for t in c['tasks']:
        for e in t['entries']:lessons.add(e['file'].split('#',1)[0])
        # Native chapter navigation may use the task's redirect index.
        task_dir=Path(t['entries'][0]['file'].split('#',1)[0]).parent
        if (root/task_dir/'index.html').is_file():seeds.append((task_dir/'index.html').as_posix())
seeds.extend(sorted(lessons))
for license in ['任务3-3_关节驱动_减速器与传动机构/assets/anatomy/LICENSE','公共资源/anatomy/LICENSE']:
    if (root/license).is_file():seeds.append(license)
pending=[root/p for p in seeds]
copied={}
references=0
def enqueue(source,link,external_ok=True):
    global references
    parts=urlsplit(link)
    if parts.scheme or parts.netloc:
        assert external_ok or parts.scheme in ('data','blob'),f'External runtime asset: {source}: {link}'
        return
    if not parts.path:return
    target=(source.parent/unquote(parts.path)).resolve()
    assert target.is_relative_to(root) and target.is_file(),f'Missing dependency: {source.relative_to(root)}: {link}'
    references+=1
    if target not in copied:pending.append(target)
while pending:
    source=pending.pop().resolve()
    if source in copied:continue
    assert source.is_relative_to(root) and source.is_file(),source
    relative=source.relative_to(root)
    target=site/relative
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copy2(source,target)
    copied[source]=relative.as_posix()
    if source.suffix.lower() not in ('.html','.css','.md','.js'):continue
    text=source.read_text(encoding='utf-8-sig')
    if source.suffix.lower()=='.html':
        p=Links();p.feed(text)
        for tag,key,link in p.refs:enqueue(source,link,tag=='a')
    elif source.suffix.lower()=='.css':
        for link in re.findall(r'url\([\"\x27]?([^\)\"\x27]+)',text):enqueue(source,link,False)

# All entry and lesson files keep their original bytes. No chapter-local paths are flattened.
for name in lessons:assert (site/name).read_bytes()==(root/name).read_bytes(),name
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('智能建筑机械与机器人 · 第一章至第八章课程整合版\n\n解压 ZIP 后，双击根目录 index.html 打开课程总入口。\n点击八张章节卡片或三维展品标签，可直接进入对应章节。\n顶部提供学习路线和27项任务搜索，也可以按章节筛选任务。\n\n第一章、第八章和任务5-3为阅读导读；其余任务为已有交互课堂。\n各章节入口、任务页面和原有学习功能保留。\n学习记录由各页面与当前浏览器分别保存，不自动跨任务合并。\n页面可离线打开，外部参考资料链接需要联网。\n部分“教学方案”链接为随包保留的 Markdown 文本，其开发源码与历史检查资料仍保留在完整仓库。\n\n请保持所有文件夹的相对位置。上传静态网站时上传 site 内全部内容，入口为根目录 index.html。\n无需另行解压八个章节包。本包已包含八章入口、当前任务页及运行所需资源。\n',encoding='utf-8')
manifest={'title':'智能建筑机械与机器人 · 课程总入口','entry':'index.html','chapters':len(data['chapters']),'tasks':sum(len(c['tasks']) for c in data['chapters']),'lesson_pages':len(lessons),'source_lesson_bytes_preserved':True,'files':[{'path':p.relative_to(site).as_posix(),'bytes':p.stat().st_size,'sha256':sha256(p.read_bytes()).hexdigest()} for p in sorted(site.rglob('*')) if p.is_file() and p.name!='manifest.json']}
(site/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
archive=dest/'智能建筑机械与机器人_第一至八章_课程整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in sorted(site.rglob('*')):
        if p.is_file():z.write(p,p.relative_to(site).as_posix())
with zipfile.ZipFile(archive) as z:assert z.testzip() is None and 'index.html' in z.namelist()
print(json.dumps({'archive':str(archive),'chapter_count':8,'task_count':27,'lesson_pages':len(lessons),'files':len(manifest['files'])+1,'references_checked':references,'zip_bytes':archive.stat().st_size},ensure_ascii=True,indent=2))
