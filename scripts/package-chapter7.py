"""Package both Chapter 7 inspection labs and their summary entrance."""
from pathlib import Path
import argparse,shutil,zipfile
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter7-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
labs={
    '任务7-1_巡检机器人_轮式_四足与爬壁/index.html':'patrol.html',
    '任务7-2_无人机巡检_病害检测与数据复核/index.html':'uav.html',
}
def localize(text,entrance=False):
    for source,target in labs.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第七章_巡检与数据复核/index.html','index.html')
    text=text.replace('href="../index.html#chapter-7"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第六章_装饰装修施工/index.html"','href="index.html"')
    text=text.replace('上一章 · 装饰装修施工','返回本章总览')
    return text
(site/'index.html').write_text(localize((root/'第七章_巡检与数据复核/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in labs.items():(site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
shutil.copy2(root/'公共资源/vendor/THREE-LICENSE.txt',site/'THREE-LICENSE.txt')
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第七章 · 巡检与数据复核\n\n解压后双击 index.html 打开章节入口；部署时上传 site 内全部内容。\n保持 lessons 文件夹与 index.html 的相对位置。\n两个课堂：桥梁巡检机器人、无人机巡检与影像复核。\n每次打开默认深色，顶部可切换主题、课堂与返回总览。\n桥梁课堂支持轮式、四足与爬壁平台、部件展示、取证与复查。\n无人机课堂恢复当前浏览器已保存的任务进度，照片与候选为合成教学样例，未运行检测模型。\n脚本与素材内嵌；外部参考资料需联网。任务间不自动传递记录。\n本包仅含第七章，原仓库保留课程总览与第六章链接。\n',encoding='utf-8')
archive=dest/'第七章_巡检与数据复核_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
