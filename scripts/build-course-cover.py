"""Build the offline course entrance and a Chapter 3 preview ZIP."""
from pathlib import Path
import json, shutil, zipfile, argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--package',action='store_true');args=parser.parse_args()
spec=[
('走进智能建造','走进智能建造','从建造现场出发，认识施工机械与施工机器人的分工。'),
('动力与工作机构','动力与工作机构','看动力如何产生、传递，再变成施工所需要的动作。'),
('机器人结构与运动','机器人结构与运动','认构型、动关节、看传动、换工具、驱底盘。沿着五项任务，理解机器人的运动链。'),
('感知与智能识别','感知与智能识别','让机器人感知自身、扫描环境，并从图像中识别目标。'),
('主体结构施工','主体结构施工','从钢筋作业面识读，到绑扎、混凝土施工与人工复核。'),
('装饰装修作业','装饰装修作业','走进砌筑、铺贴、打磨与喷涂现场，理解工艺与机器人的配合。'),
('巡检与数据复核','巡检与数据复核','利用移动机器人与无人机采集现场信息，复核检测证据。'),
('安全操作与维护','安全操作与维护','识别风险、规范操作，完成保养、故障排查与清洗维护。')]
tasks=json.loads((root/'任务清单.json').read_text(encoding='utf-8-sig'))['tasks']
def data(scope):
    chapters=[]
    for n,(title,nav,desc) in enumerate(spec,1):
        rows=[]
        for t in tasks:
            if not t['id'].startswith(str(n)+'-'):continue
            entries=t.get('demos') or ([{'title':'进入学习','file':t['demo']}] if t.get('demo') else [])
            # Some tasks have several named entry pages; use the current root demo when present.
            if not entries and n==7 and (root/t['directory']/'index.html').exists():entries=[{'title':'进入学习','file':t['directory']+'/index.html'}]
            entries=[e for e in entries if (root/e['file']).is_file()]
            if scope=='chapter3' and n!=3:entries=[]
            rows.append({'id':t['id'],'title':t['title'].replace('任务一　',''),'entries':entries,'statusLabel':'后续接入' if scope=='chapter3' and n!=3 else '教学方案 · 待制作'})
        chapters.append({'id':n,'title':title,'nav':nav,'description':desc,'tasks':rows})
    return 'window.COURSE = '+json.dumps({'scope':scope,'chapters':chapters},ensure_ascii=False,indent=2)+';\n'
(root/'index.html').write_text((root/'course-cover/index.template.html').read_text(encoding='utf-8'),encoding='utf-8')
(root/'course-cover/data.js').write_text(data('full'),encoding='utf-8')
print('Built course entrance: index.html / 8 chapters / 27 tasks')
if args.package:
    dest=root/'.local/course-cover-chapter3/site';dest.mkdir(parents=True,exist_ok=True)
    shutil.copy2(root/'index.html',dest/'index.html')
    (dest/'course-cover').mkdir(exist_ok=True)
    for name in ['cover.css','scene.js','app.js']:shutil.copy2(root/'course-cover'/name,dest/'course-cover'/name)
    (dest/'course-cover/data.js').write_text(data('chapter3'),encoding='utf-8')
    (dest/'公共资源/vendor').mkdir(parents=True,exist_ok=True)
    for name in ['three-r160.min.js','THREE-LICENSE.txt']:shutil.copy2(root/'公共资源/vendor'/name,dest/'公共资源/vendor'/name)
    for folder in sorted(root.glob('任务3-*')):
        out=dest/folder.name;out.mkdir(exist_ok=True)
        for page in folder.glob('*.html'):
            s=page.read_text(encoding='utf-8-sig').replace('href="../README.md"','href="../index.html#chapter-3"')
            s=s.replace('href="README.md"','href="../index.html#chapter-3"')
            (out/page.name).write_text(s,encoding='utf-8')
    archive=dest.parent/'智能建筑机械与机器人_课程封面_第3章示例.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for f in dest.rglob('*'):
            if f.is_file():z.write(f,f.relative_to(dest).as_posix())
    print(archive)
