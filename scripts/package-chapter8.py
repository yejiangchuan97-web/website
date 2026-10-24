"""Package the Chapter 8 entrance and four reading guides as an offline site."""
from pathlib import Path
import argparse, shutil, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter8-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
guides={
    '任务8-1_机械与机器人的安全操作规程/index.html':'safety.html',
    '任务8-2_设备保养_故障排查与维护记录/index.html':'maintenance.html',
    '任务8-3_爬壁与特种作业机器人安全检查/index.html':'climbing.html',
    '任务8-4_装修机器人职业健康与清洗维护/index.html':'health.html',
}

def localize(text,entrance=False):
    for source,target in guides.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第八章_安全操作与维护/index.html','index.html')
    text=text.replace('href="../index.html#chapter-8"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第七章_巡检与数据复核/index.html"','href="index.html"')
    text=text.replace('上一章 · 巡检与数据复核','返回本章总览')
    return text

(site/'index.html').write_text(localize((root/'第八章_安全操作与维护/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in guides.items():
    (site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
shutil.copy2(root/'公共资源/vendor/THREE-LICENSE.txt',site/'THREE-LICENSE.txt')
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第八章 · 安全操作与维护\n\n解压后双击 index.html 打开统一入口；部署时上传 site 内全部内容。\n保持 lessons 文件夹与 index.html 的相对位置。\n\n本章原来仅有教学方案，本包提供四份阅读导读：\n8-1 安全操作；8-2 保养与故障排查；8-3 爬壁作业检查；8-4 职业健康与清洗维护。\n每份导读包含四个阅读主题、要点比较和可展开的思考提示。\n每次打开任务页均默认深色，可切换浅色、其他导读或返回总览。\n入口延续蓝白风格，概念展品支持环绕、选择、巡展与暂停，并附学习导览和章节总结。\n\n设备交互仿真尚未制作，原教学方案仍保留在仓库各任务 README。\n本包不执行设备模拟，也不产生检查合格、作业放行或维修许可记录。\n脚本、样式和三维资源全部内嵌，可离线阅读。\n本包仅含第八章，完整仓库保留课程总览与第七章入口。\n',encoding='utf-8')
archive=dest/'第八章_安全操作与维护_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
