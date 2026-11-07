from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[2]
tasks=json.loads((ROOT/'course/catalog.json').read_text(encoding='utf-8'))['tasks']
descriptions={'1-2':'六类代表工程机械，可旋转、缩放、部件热点、播放、单步与复位。模型是原创教学结构网格。','1-3':'四款保留许可与动作的机型网格：Crazyflie、iiwa、G1、Go2；另有原创护理辅助概念模型。支持按需离线加载与部件观察。','5-3':'在同一楼面推进泵送、振捣与整平。支持双缸剖面、分区布料、振捣插入与换点、基准偏移和反馈开关。正式入口为index.html，使用全站统一主题。','8-1':'在三维工地暂停、发现、处置并复查临时用电、回转碰撞、夹挤、吊物、洞口与残余压力；复位不自动启动。','8-2':'喷涂、泵车、发动机与轴承四个维护工位。包含正常、堵塞、泄漏、温热、润滑不适用与资料不足等案例；移交记录保留并可导出。'}
for t in tasks:
    if t['id'] not in descriptions:continue
    home=ROOT/t['directory'];entry=Path(t['demo']).name
    text=f"# 任务{t['id']} · {t['title']}\n\n[打开当前课堂]({entry}) · [本章入口](../../overview/index.html) · [项目说明](../../../../../README.md)\n\n{descriptions[t['id']]}\n\n## 维护\n\n- 当前配置：src/config.json；交互源码：任务 src/ 和 shared/workshop/。\n- 统一构建：`node scripts/build.mjs {t['id']}`；完整验证：`npm run verify`。\n- 截图放 artifacts/screenshots/，报告放 artifacts/reports/，ZIP 放 artifacts/packages/。\n- 原导读及旧方案保存在 archive/revision-20261026/lessons/，不作为当前功能说明。\n\n## 模型与资料\n\n[内容来源与模型说明](../../../../../docs/内容来源与模型说明.md)。三维动作与状态属于课堂模拟，不生成真实设备许可或工程验收结论。支持 HTTP、file://、键盘、小屏和无 WebGL 备用操作。\n"
    (home/'README.md').write_text(text,encoding='utf-8')
for chapter in (1,8):
    home=ROOT/f'course/chapters/{chapter:02d}/overview'
    rows=[f'# 第{chapter}章 · 互动入口','','[打开本章](index.html) · [课程总览](../../../home/index.html)', '','本章仅展示下列两项活动，保留原编号：','']
    rows += [f"- [{t['id']} {t['title']}](../tasks/{t['id']}/index.html)" for t in tasks if t['id'].startswith(str(chapter)+'-')]
    rows+=['','构建：`node scripts/build.mjs '+str(chapter)+'`。章节复用共用工位界面和三维结构模型；旧阅读导读已归档。']
    (home/'README.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
for p in ROOT.glob('course/**/README.md'):
    text=p.read_text(encoding='utf-8').replace('/8-4/README.md','/8-2/README.md').replace('/8-3/README.md','/8-1/README.md')
    p.write_text(text,encoding='utf-8')
p=ROOT/'README.md';s=p.read_text(encoding='utf-8').replace('27 项任务','24 项活动任务').replace('27 项任务的编号','24 项任务的编号').replace('│     │     ├─ 1-1/        页面、教学说明、源码、专用素材、测试\n','').replace('│     │     ├─ 1-2/','│     │     ├─ 1-2/        工程机械三维展厅').replace('│     │     └─ 1-3/','│     │     └─ 1-3/        机器人三维展厅').replace('│  └─ robot-atlas/         机器人图鉴、原始模型、转换工具及许可','│  └─ robot-atlas/         原网址兼容跳转；完整图鉴已归档').replace('npm run package:models              # 重新生成机器人图鉴模型 ZIP','npm run build:models                # 更新四款共享机器人离线资源')
s+='\n本轮改版：第一章仅保留两座展厅；5-3 为混凝土互动，入口名为 `index.html`；第八章合并为安全操作与保养排查。AI 修改前须阅读 [AGENTS.md](AGENTS.md) 和 [详细操作协议](docs/AI操作协议.md)。\n'
p.write_text(s,encoding='utf-8')
rows=['# 项目目录与活动任务','','八章、24 项活动任务。入口与展示类型以 [任务清单](../course/catalog.json) 为准。','','| 章 | 任务入口 |','| --- | --- |']
for n in range(1,9):
    links='、'.join(f"[{t['id']} {t['title']}](../{t['demo']})" for t in tasks if t['id'].startswith(str(n)+'-'))
    rows.append(f'| {n:02d} | {links} |')
rows+=['','公共 UI、三维工位、工程机械和模型读取器位于 shared/workshop/；四款机器人模型、离线载入脚本和许可位于 shared/models/。截图、报告、ZIP 和部署版在 artifacts/ 对应目录。','','第一章和第八章入口各两项；8-3、8-4 只留旧地址兼容跳转，不计入活动任务。1-1 已移除。5-3 只使用index.html；旧导读和 Robot Atlas 保存在 archive/revision-20261026/。','','AI 规范见 [操作协议](AI操作协议.md)，来源及边界见 [内容来源与模型说明](内容来源与模型说明.md)。']
(ROOT/'docs/项目目录.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
# Outdated browser checks assumed 27 tasks and four reading guides. Keep the
# evidence as history; the revised browser suite lives under scripts/qa/.
for name in ('check-chapter1.cjs','check-chapter8.cjs','check-course.cjs'):
    p=ROOT/'scripts'/name
    if p.exists():
        dest=ROOT/'archive/revision-20261026/old-checks'/name;dest.parent.mkdir(parents=True,exist_ok=True);p.rename(dest)
print('Updated current lesson documentation and archived superseded browser checks')
