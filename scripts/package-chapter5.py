"""Package two Chapter 5 interactive labs and the concrete process reading guide."""
from pathlib import Path
import argparse,shutil,zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter5-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
labs={
    '任务5-1_钢筋加工机械与绑扎作业面识读/index.html':'rebar.html',
    '任务5-2_钢筋绑扎机器人操作与人工复核/index.html':'tying.html',
    '任务5-3_混凝土泵送布料与整平抹光机器人/index.html':'concrete.html',
}
def localize(text,entrance=False):
    for source,target in labs.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第五章_主体结构施工/index.html','index.html')
    text=text.replace('href="../index.html#chapter-5"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第四章_感知与智能识别/index.html"','href="index.html"')
    text=text.replace('上一章 · 感知与智能识别','返回本章总览')
    return text
(site/'index.html').write_text(localize((root/'第五章_主体结构施工/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in labs.items():
    (site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
for source,target in [('公共资源/vendor/THREE-LICENSE.txt','THREE-LICENSE.txt'),('公共资源/anatomy/LICENSE.txt','ANATOMY-LICENSE.txt')]:shutil.copy2(root/source,site/target)
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第五章 · 主体结构施工协同\n\n解压后双击 index.html 打开章节总览；部署时上传 site 内全部内容。\n保持 lessons 与 index.html 的相对位置。\n5-1：钢筋加工与作业面识读，交互课堂。\n5-2：钢筋绑扎与人工复核，交互课堂。\n5-3：混凝土施工工序导读，尚无混凝土交互仿真。\n三个页面每次打开默认深色，可在顶部切换主题、任务和返回总览。\nHTML 内含本地运行所需素材和脚本，无需安装依赖。\n本包仅含第五章，原仓库保留课程总览与第四章链接。\n',encoding='utf-8')
archive=dest/'第五章_主体结构施工_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
