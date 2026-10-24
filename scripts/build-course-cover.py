"""Build the complete eight-chapter course entrance; optionally package the site."""
from pathlib import Path
import argparse,json,subprocess,sys

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--package',action='store_true',help='Package all eight chapters and current task pages')
parser.add_argument('--output',type=Path,default=root/'dist/course-static')
args=parser.parse_args()
spec=[
 ('第一章_走进智能建造','走进智能建造','从建造现场出发，认识施工机械、机器人与人的分工。'),
 ('第二章_动力与工作机构','动力与工作机构','看动力如何产生、传递，再变成施工需要的动作。'),
 ('第三章_机器人结构与运动','机器人结构与运动','认构型、动关节、看传动、换工具，再对照底盘与行走。'),
 ('第四章_感知与智能识别','感知与智能识别','认识自身状态、环境扫描与图像识别，保留观测和复核依据。'),
 ('第五章_主体结构施工','主体结构施工','钢筋加工、绑扎与人工复核，再阅读混凝土施工工序。'),
 ('第六章_装饰装修施工','装饰装修施工','走进砌筑、铺贴、打磨与喷涂，对照工艺、反馈和质量。'),
 ('第七章_巡检与数据复核','巡检与数据复核','利用移动机器人与无人机取证，复核检测与影像线索。'),
 ('第八章_安全操作与维护','安全操作与维护','阅读安全操作、设备保养、爬壁检查与职业健康维护。')
]
tasks=json.loads((root/'任务清单.json').read_text(encoding='utf-8-sig'))['tasks']
chapters=[]
for n,(folder,title,description) in enumerate(spec,1):
    entry=folder+'/index.html'
    assert (root/entry).is_file(),f'Missing chapter entrance: {entry}'
    rows=[]
    for t in tasks:
        if not t['id'].startswith(str(n)+'-'):continue
        entries=t.get('demos') or ([{'title':'进入学习','file':t['demo']}] if t.get('demo') else [])
        assert entries,f'Missing task entry: {t["id"]}'
        for e in entries:assert (root/e['file'].split('#',1)[0]).is_file(),f'Missing task page: {e["file"]}'
        kind='任务导读' if '导读' in t.get('status','') or t['id']=='5-3' else '交互课堂'
        rows.append({'id':t['id'],'title':t['title'].replace('任务一　',''),'entries':entries,'kind':kind})
    guides=sum(t['kind']=='任务导读' for t in rows)
    kind='任务导读' if guides==len(rows) else '课堂与导读' if guides else '交互课堂'
    chapters.append({'id':n,'title':title,'nav':title,'description':description,'entry':entry,'kind':kind,'tasks':rows})
data={'scope':'full','chapters':chapters}
(root/'index.html').write_text((root/'course-cover/index.template.html').read_text(encoding='utf-8'),encoding='utf-8')
(root/'course-cover/data.js').write_text('window.COURSE = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
print('Built full course entrance: 8 chapter entrances / 27 tasks')
if args.package:subprocess.run([sys.executable,str(root/'scripts/package-course.py'),'--output',str(args.output)],check=True,cwd=root)
