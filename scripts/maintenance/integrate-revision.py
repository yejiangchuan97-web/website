from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'course/catalog.json';data=json.loads(p.read_text(encoding='utf-8'));data['tasks']=[t for t in data['tasks'] if t['id'] not in ('1-1','8-3','8-4')]
updates={'1-2':('工程机械三维展厅','三维展厅'),'1-3':('机器人三维展厅','三维展厅'),'5-3':('混凝土泵送、振捣与整平','交互实训'),'8-1':('安全操作','互动推演'),'8-2':('保养排查','互动工坊')}
for t in data['tasks']:
    if t['id'] in updates:
        t['title'],t['kind']=updates[t['id']];t['status']='已实现'+t['kind'];t['demo']=t['directory']+'/index.html';t['demos']=[{'title':'进入'+t['kind'],'file':t['demo']}]
    else:t['kind']='交互课堂'
data['revision']='2026-10-26: two galleries, concrete workstation, safety and maintenance';p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
p=ROOT/'scripts/build.mjs';s=p.read_text(encoding='utf-8');s='\n'.join(line for line in s.split('\n') if not any('"'+i+'":' in line for i in ('1-1','8-3','8-4')));p.write_text(s,encoding='utf-8')
p=ROOT/'shared/主体结构施工/chapter-layout.js';s=p.read_text(encoding='utf-8').replace('5-3 混凝土工序导读','5-3 混凝土工序');p.write_text(s,encoding='utf-8')
for n,target in [(3,1),(4,2)]:
    p=ROOT/f'course/chapters/08/tasks/8-{n}/index.html';p.parent.mkdir(parents=True,exist_ok=True);p.write_text(f'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../8-{target}/index.html"><title>任务已合并</title><p>此任务已并入第八章新工位。</p><a href="../8-{target}/index.html">进入任务 8-{target}</a></html>',encoding='utf-8')
p=ROOT/'course/chapters/05/overview/src/app.js';s=p.read_text(encoding='utf-8').replace('工序导读','混凝土工序').replace('泵送、布料、振捣、粗平、精平与抹光','泵送、振捣与整平').replace('阅读工序导读','进入混凝土实训');p.write_text(s,encoding='utf-8')
p=ROOT/'course/home/index.template.html';s=p.read_text(encoding='utf-8').replace('<strong>27<','<strong>{{TASK_COUNT}}<').replace('27项任务','{{TASK_COUNT}}项任务').replace('交互课堂与任务导读','三维展厅与互动课堂').replace('第一章、第八章与任务5-3提供阅读导读，其余任务提供交互课堂；各任务的学习记录分别保存。','第一章提供两座三维展厅，第五章包含混凝土互动，第八章提供安全操作与保养排查；各任务可独立学习。');p.write_text(s,encoding='utf-8')
p=ROOT/'package.json';d=json.loads(p.read_text(encoding='utf-8'));d['description']='Offline construction robotics course, eight chapters; active tasks from course/catalog.json';d['scripts'].pop('package:models',None);d['scripts']['build:models']='python scripts/build-workshops.py 1-3';p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Integrated 24 active tasks and compatibility redirects')
