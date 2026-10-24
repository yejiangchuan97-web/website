"""Package the Chapter 1 entrance and three reading guides as an offline site."""
from pathlib import Path
import argparse, shutil, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter1-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
guides={
    '任务1-1_从建造施工到智能建造/index.html': 'construction.html',
    '任务1-2_认识施工机械/index.html': 'machines.html',
    '任务1-3_认识施工机器人/index.html': 'robots.html',
}

def localize(text,entrance=False):
    for source,target in guides.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第一章_走进智能建造/index.html','index.html')
    text=text.replace('href="../index.html#chapter-1"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第二章_动力与工作机构/index.html"','href="index.html"')
    text=text.replace('接着学习 · 第二章动力与工作机构 →','返回本章总览')
    return text

(site/'index.html').write_text(localize((root/'第一章_走进智能建造/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in guides.items():
    (site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
shutil.copy2(root/'公共资源/vendor/THREE-LICENSE.txt',site/'THREE-LICENSE.txt')
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第一章 · 走进智能建造\n\n解压后双击 index.html 打开统一入口；部署时上传 site 内全部内容。\n保持 lessons 文件夹与 index.html 的相对位置。\n\n本章原来只有教学方案，本包提供三份阅读导读：\n1-1 从建造施工到智能建造；1-2 认识施工机械；1-3 认识施工机器人。\n每份包含四个阅读主题、要点比较和可展开的思考提示。\n每次打开任务页均默认深色，顶部可切换浅色、其他导读或返回总览。\n入口延续蓝白风格，三个概念展品支持环绕、选择、巡展与暂停，附学习导览和章节总结。\n\n原方案中的设备与场景交互尚未制作，原教学方案继续保留在仓库各任务 README。\n本包不含这些设备交互，也不使用未随项目提供的外部视频。\n所有脚本、样式和三维依赖内嵌，可离线使用。\n本包仅含第一章，完整仓库保留课程总览与第二章链接。\n',encoding='utf-8')
archive=dest/'第一章_走进智能建造_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
