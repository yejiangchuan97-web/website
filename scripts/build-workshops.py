"""Shared offline shell builder for the five revised teaching workstations."""
from pathlib import Path
from html import escape
import base64,json,os,sys,subprocess
ROOT=Path(__file__).resolve().parents[1]
ident=sys.argv[1]
if ident.startswith('overview-'):
    chapter=int(ident.split('-')[1]);home=ROOT/f'course/chapters/{chapter:02d}/overview';entry='index.html'
else:
    chapter=int(ident.split('-')[0]);home=ROOT/f'course/chapters/{chapter:02d}/tasks/{ident}';entry='index.html'
config=json.loads((home/'src/config.json').read_text(encoding='utf-8'))
guide=home/'src/guide.json'
if guide.exists():config['learningGuide']=json.loads(guide.read_text(encoding='utf-8'))
catalog=json.loads((ROOT/'course/catalog.json').read_text(encoding='utf-8'))['tasks']
config.update({'id':ident,'chapter':chapter,'chapterEntry':f'course/chapters/{chapter:02d}/overview/index.html','nav':[{'id':t['id'],'label':t['id']+' '+t['title'],'file':t['demo']} for t in catalog if t['id'].startswith(str(chapter)+'-')]})
def relative(path):
    result=os.path.relpath(ROOT/path,home).replace('\\','/')
    return result if result.startswith('.') else './'+result
def script(path):return '<script src="'+relative(path)+'"></script>'
scripts=['shared/vendor/three-r160.min.js','shared/navigation.js','shared/workshop/shell.js','shared/workshop/machines.js','shared/workshop/machine-models.js','shared/workshop/stage.js']
# 任务页：三维区统一底色取值器（shared/lab-shell/stage-tone.js）要在建场景之前载入
if not ident.startswith('overview-'):scripts.insert(2,'shared/lab-shell/stage-tone.js')
if config['mode']=='gallery':
    scripts+=['shared/workshop/robots.js','shared/workshop/robot-parts.js','shared/workshop/hero-model.js','shared/workshop/hero-stage.js']
    if ident=='1-2':
        scripts+=['shared/vendor/gltf-r160/BufferGeometryUtils.js','shared/vendor/gltf-r160/GLTFLoader.js','shared/workshop/imported-machinery.js','shared/workshop/imported-dozer.js']
        for row in json.loads((ROOT/'shared/models/machinery/manifest.json').read_text(encoding='utf-8')):
            source=ROOT/row['file'];target=ROOT/row['runtime']
            content='/* '+row['author']+'; '+row['licenseId']+'. Generated offline wrapper; original GLB bytes unchanged. See LICENSE.html and source.json. */\nwindow.MachineryBuffers=window.MachineryBuffers||{};window.MachineryBuffers['+json.dumps(row['id'])+']='+json.dumps(base64.b64encode(source.read_bytes()).decode())+';\n'
            if not target.exists() or target.read_text(encoding='utf-8')!=content:target.write_text(content,encoding='utf-8')
    if ident=='1-3':
        subprocess.run([sys.executable,str(ROOT/'scripts/build-allegro-hand.py'),'sharpa'],check=True)
        scripts+=['shared/vendor/gltf-r160/BufferGeometryUtils.js','shared/vendor/gltf-r160/GLTFLoader.js','shared/workshop/imported-drone.js']
    for family,namespace in ([('dozer','DozerBuffers')] if ident=='1-2' else [('drone','DroneBuffers')] if ident=='1-3' else []):
        for row in json.loads((ROOT/f'shared/models/{family}/manifest.json').read_text(encoding='utf-8')):
            source=ROOT/row['file'];target=ROOT/row['runtime']
            content='/* '+row['author']+'; '+row['licenseId']+'. Original GLB bytes unchanged; see LICENSE.html. */\nwindow.'+namespace+'=window.'+namespace+'||{};window.'+namespace+'['+json.dumps(row['id'])+']='+json.dumps(base64.b64encode(source.read_bytes()).decode())+';\n'
            if not target.exists() or target.read_text(encoding='utf-8')!=content:target.write_text(content,encoding='utf-8')
    scripts+=['shared/workshop/hero-gallery.js']
    if config.get('layout')=='gallery-workstation':scripts+=['shared/workshop/gallery-workstation.js']
elif config['mode']=='overview':scripts+=['shared/workshop/gallery.js']
else:scripts+=[(home/'src/model.js').relative_to(ROOT).as_posix(),(home/'src/app.js').relative_to(ROOT).as_posix()]
if ident=='1-3':
    for row in json.loads((ROOT/'shared/models/manifest.json').read_text(encoding='utf-8')):
        source=ROOT/row['file'];target=ROOT/row['runtime']
        content='window.RobotBuffers=window.RobotBuffers||{};window.RobotBuffers['+json.dumps(row['id'])+']='+json.dumps(base64.b64encode(source.read_bytes()).decode())+';\n'
        if not target.exists() or target.read_text(encoding='utf-8')!=content:target.write_text(content,encoding='utf-8')
data=json.dumps(config,ensure_ascii=False).replace('<','\\u003c')
if config.get('layout')=='chapter-cover':
    # The catalog owns active task titles and destinations, including offline paths.
    active=[t for t in catalog if t['scene']==chapter]
    details={item['id']:item for item in config['items']}
    config['items']=[{**details[t['id']], 'title':t['title'], 'entry':t['demo']} for t in active]
    data=json.dumps(config,ensure_ascii=False).replace('<','\\u003c')
    template=(ROOT/'shared/chapter-cover/page.html').read_text(encoding='utf-8')
    replacements={'TITLE':escape(config['chapterTitle']), 'DATA':data,
                  'HEADING':escape(config['heading'][0])+'<br><span>'+escape(config['heading'][1])+'</span>',
                  'KICKER':escape(config['kicker']), 'LEAD':escape(config['lead']),
                  'COUNT':str(len(active)), 'HOME':relative('course/home/index.html'),
                  'NEXT':relative(config.get('footerLink',config.get('nextChapter','course/home/index.html'))),
                  'NUMBER':escape(config.get('chapterNumber',f'{chapter:02d}')),
                  'STEPS':' <i>／</i> '.join(escape(s) for s in config.get('headerSteps',['认用途','看反馈','明分工'])),
                  'NOTE':' <span>·</span> '.join(escape(s) for s in config.get('coverNote',['用途认知','反馈与人机分工'])),
                  'EXHIBIT':escape(config.get('exhibitTitle','本章 · 机械与机器人展台')),
                  'FLOW':escape(config.get('footerFlow','观察装置 → 试验动作 → 比较反馈 → 明确职责')),
                  'FOOTER_LABEL':escape(config.get('footerLinkLabel','下一章 · 动力与工作机构 ↗')),
                  'GUIDE_TITLE':escape(config.get('guideTitle','从作业用途，到反馈与人机分工。'))}
    replacements['BOUNDARY']=escape(config.get('boundary','原创教学概念模型 · 动作仅作几何示意'))
    for key,value in replacements.items():template=template.replace('{{'+key+'}}',value)
    template=template.replace('{{SHARED}}',relative('shared'))
    (home/entry).write_text(template,encoding='utf-8')
    print('Built chapter cover '+ident)
    sys.exit(0)
extra='<link rel="stylesheet" href="'+relative('shared/workshop/hero-gallery.css')+'">' if config['mode']=='gallery' else ''
if config.get('layout')=='gallery-workstation':extra+='<link rel="stylesheet" href="'+relative('shared/workshop/gallery-workstation.css')+'">'
html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>'+escape(config['title'])+'｜智能建筑机械与机器人</title><link rel="stylesheet" href="'+relative('shared/workshop/ui.css')+'">'+extra+'</head><body><noscript>此课堂需要 JavaScript。请在浏览器中启用脚本后打开。</noscript><script>window.WorkshopPage='+data+';</script>'+''.join(script(s) for s in scripts)+'</body></html>\n'
# 统一任务页外壳：任务目录里有 src/stations.js 时，在页面末尾加载 shared/lab-shell（见 shared/lab-shell/native-layout.mjs）
if (home/'src/stations.js').exists():
    layout=(ROOT/'shared/lab-shell/native-layout.mjs').as_uri()
    tags=subprocess.run(['node','--input-type=module','-e',f"import {{labShellTags}} from {json.dumps(layout)};process.stdout.write(labShellTags({json.dumps(ident)},'',{json.dumps(str(home))}))"],capture_output=True,text=True,check=True).stdout
    html=html.replace('</body>',tags+'</body>')
(home/entry).write_text(html,encoding='utf-8')
print('Built '+ident+' -> '+str((home/entry).relative_to(ROOT)))
