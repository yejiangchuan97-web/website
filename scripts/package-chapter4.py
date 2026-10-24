"""Package the three Chapter 4 workbenches, including all five entry routes."""
from pathlib import Path
import argparse, shutil, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root/'dist/chapter4-static')
args=parser.parse_args()
dest=args.output.resolve()
site=dest/'site'
(site/'lessons').mkdir(parents=True,exist_ok=True)
labs={
    '任务4-1_机器人自身状态感知/index.html':'state.html',
    '任务4-2_机器人激光雷达感知/index.html':'lidar.html',
    '任务4-3_标注安全帽并应用YOLO模型/index.html':'vision.html',
}
def localize(text,entrance=False):
    for source,target in labs.items():
        if entrance:text=text.replace('../'+source,'lessons/'+target)
        text=text.replace(source,'lessons/'+target)
    text=text.replace('第四章_感知与智能识别/index.html','index.html')
    text=text.replace('href="../index.html#chapter-4"','href="index.html"' if entrance else 'href="../index.html"')
    text=text.replace('课程总览','章节总览')
    text=text.replace('href="../第三章_机器人结构与运动/index.html"','href="index.html"')
    text=text.replace('上一章 · 机器人结构与运动','返回本章总览')
    return text

(site/'index.html').write_text(localize((root/'第四章_感知与智能识别/index.html').read_text(encoding='utf-8-sig'),True),encoding='utf-8')
for source,target in labs.items():
    (site/'lessons'/target).write_text(localize((root/source).read_text(encoding='utf-8-sig')),encoding='utf-8')
for source,target in [
    ('公共资源/vendor/THREE-LICENSE.txt','THREE-LICENSE.txt'),
    ('公共资源/anatomy/LICENSE.txt','ANATOMY-LICENSE.txt'),
    ('任务4-2_机器人激光雷达感知/assets/lidar/PCL-DATA-LICENSE.txt','PCL-DATA-LICENSE.txt'),
]:shutil.copy2(root/source,site/target)
(site/'.nojekyll').touch()
(site/'使用说明.txt').write_text('第四章 · 感知与智能识别\n\n双击 index.html 打开章节入口；部署时上传 site 内全部内容。\n三项任务、五个入口：自身状态，雷达点云，安全帽标注／预测／评估。\n每个实验每次打开默认深色；顶部可切换主题、实验或返回总览。\n视觉实验在同一文件内切换并保留当前操作，预测与评估为内置教学结果。\n全部 HTML 含本地运行所需代码与素材，无需安装依赖。\n保持 lessons 文件夹与 index.html 的相对位置，解压后再打开。\n本包仅含第四章。课程总览与上一章链接保留在原仓库。\n',encoding='utf-8')
archive=dest/'第四章_感知与智能识别_整合版.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(site).as_posix())
print(archive)
