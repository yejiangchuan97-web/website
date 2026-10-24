"""Package the four Chapter 6 labs as a self-contained static site."""
from pathlib import Path
import argparse,shutil,zipfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter6-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
labs={
    '任务6-1_砌筑工程_人工工艺_砂浆机械与机器人进场/index.html':'masonry.html',
    '任务6-2_地砖铺贴_工艺准备与铺贴机器人作业/index.html':'tiling.html',
    '任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/index.html':'sanding.html',
    '任务6-4_室内喷涂_路径规划_参数控制与缺陷诊断/index.html':'spray.html',
}
def localize(text,entrance=False):
    for source,target in labs.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第六章_装饰装修施工/index.html','index.html')
    text=text.replace('href="../index.html#chapter-6"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第五章_主体结构施工/index.html"','href="index.html"')
    text=text.replace('上一章 · 主体结构施工协同','返回本章总览')
    return text
(site/'index.html').write_text(localize((root/'第六章_装饰装修施工/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in labs.items():(site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
for source,target in [('公共资源/vendor/THREE-LICENSE.txt','THREE-LICENSE.txt'),('公共资源/anatomy/LICENSE.txt','ANATOMY-LICENSE.txt')]:shutil.copy2(root/source,site/target)
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第六章 · 装饰装修施工\n\n解压后双击 index.html 打开章节总览；部署时上传 site 内全部内容。\n保持 lessons 文件夹与 index.html 的相对位置。\n四个交互课堂：砌筑、地砖铺贴、腻子打磨、室内喷涂。\n课堂每次打开默认深色，顶部可切换主题、任务并返回总览。\n各任务独立运行，记录不自动跨页传递。\nHTML 内含本地运行所需素材和脚本，无需安装依赖；外部参考资料需联网。\n本包仅包含第六章，原仓库保留课程总览与第五章链接。\n',encoding='utf-8')
archive=dest/'第六章_装饰装修施工_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
