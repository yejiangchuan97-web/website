"""Build the complete eight-chapter course entrance; optionally package the site."""
from pathlib import Path
import argparse,json,subprocess,sys

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--package',action='store_true',help='Package all eight chapters and current task pages')
parser.add_argument('--output',type=Path,default=root/'artifacts/site')
args=parser.parse_args()
spec=[
 ('course/chapters/01/overview','走进智能建造','浏览常见施工机械与机器人，查看结构、部件和动作。'),
 ('course/chapters/02/overview','动力与工作机构','看动力如何产生、传递，再变成施工需要的动作。'),
 ('course/chapters/03/overview','机器人结构与运动','认构型、动关节、看传动、换工具，再对照底盘与行走。'),
 ('course/chapters/04/overview','感知与智能识别','认识自身状态、环境扫描与图像识别，保留观测和复核依据。'),
 ('course/chapters/05/overview','主体结构施工','钢筋加工、绑扎与人工复核，再进入混凝土泵送、振捣和整平。'),
 ('course/chapters/06/overview','装饰装修施工','走进砌筑、铺贴、打磨与喷涂，对照工艺、反馈和质量。'),
 ('course/chapters/07/overview','巡检与数据复核','利用移动机器人与无人机取证，复核检测与影像线索。'),
 ('course/chapters/08/overview','安全操作与维护','在现场暂停推演中处理危险，在四个工位练习保养与排查。')
]
tasks=json.loads((root/'course/catalog.json').read_text(encoding='utf-8-sig'))['tasks']
notes=json.loads((root/'course/home/task-notes.json').read_text(encoding='utf-8'))
chapters=[]
for n,(folder,title,description) in enumerate(spec,1):
    # 章节封面已并入课程首页（#chapter-N）；旧封面地址保留为跳转页。
    entry=f'course/home/index.html#chapter-{n}'
    assert (root/folder/'index.html').is_file(),f'Missing chapter redirect: {folder}/index.html'
    rows=[]
    for t in tasks:
        if not t['id'].startswith(str(n)+'-'):continue
        entries=t.get('demos') or ([{'title':'进入学习','file':t['demo']}] if t.get('demo') else [])
        assert entries,f'Missing task entry: {t["id"]}'
        for e in entries:assert (root/e['file'].split('#',1)[0]).is_file(),f'Missing task page: {e["file"]}'
        kind=t.get('kind','交互课堂')
        assert t['id'] in notes,f'Missing note in course/home/task-notes.json: {t["id"]}'
        rows.append({'id':t['id'],'title':t['title'].replace('任务一　',''),'note':notes[t['id']],'demo':t['demo'],'entries':entries,'kind':kind})
    kinds={t['kind'] for t in rows}
    kind=next(iter(kinds)) if len(kinds)==1 else '互动课堂'
    chapters.append({'id':n,'title':title,'nav':title,'description':description,'entry':entry,'kind':kind,'tasks':rows})
data={'scope':'full','chapters':chapters}
html=(root/'course/home/index.template.html').read_text(encoding='utf-8').replace('{{TASK_COUNT}}',str(len(tasks))).replace('{{CHAPTER_COUNT}}',str(len(chapters)).zfill(2))
(root/'course/home/index.html').write_text(html,encoding='utf-8')
(root/'index.html').write_text((root/'course/home/index.redirect.html').read_text(encoding='utf-8'),encoding='utf-8')
(root/'course/home/data.js').write_text('window.COURSE = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print(f'Built course/home/index.html: {len(chapters)} chapters / {len(tasks)} tasks')
if args.package:subprocess.run([sys.executable,str(root/'scripts/package-course.py'),'--output',str(args.output)],check=True,cwd=root)
