"""Package the five Chapter 2 labs as a self-contained, offline static site."""
from pathlib import Path
import argparse, re, shutil, zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output', type=Path, default=root/'dist/chapter2-static')
args = parser.parse_args()
dest = args.output.resolve()
site = dest/'site'
site.mkdir(parents=True, exist_ok=True)
labs = {
    '任务2-1_动力装置的基本原理/index.html': 'motor.html',
    '任务2-1_动力装置的基本原理/diesel.html': 'diesel.html',
    '任务2-2_动力的传递与变换/index.html': 'transmission.html',
    '任务2-3_工作机构与施工动作/index.html': 'mechanisms.html',
    '任务2-3_工作机构与施工动作/fourbar.html': 'fourbar.html',
}

def inline_assets(html, source):
    def style(m):
        file = source.parent/m.group(1)
        return '<style>'+file.read_text(encoding='utf-8-sig')+'</style>'
    def script(m):
        file = source.parent/m.group(2)
        code = file.read_text(encoding='utf-8-sig').replace('</script', '<\\/script')
        return '<script'+m.group(1)+m.group(3)+'>'+code+'</script>'
    html = re.sub(r'<link\s+rel="stylesheet"\s+href="([^"]+)"\s*/?>', style, html)
    return re.sub(r'<script([^>]*?)\s+src="([^"]+)"([^>]*)>\s*</script>', script, html)

def localize(html, entrance=False):
    for source, target in labs.items():
        if entrance:
            html = html.replace('../'+source, 'lessons/'+target)
        html = html.replace(source, 'lessons/'+target)
    html = html.replace('第二章_动力与工作机构/index.html', 'index.html')
    html = html.replace('href="../index.html#chapter-2"', 'href="index.html"' if entrance else 'href="../index.html"')
    html = html.replace('index.html#chapter-2', 'index.html')
    html = html.replace('课程总览', '章节总览')
    html = html.replace('href="../第三章_机器人结构与运动/index.html"', 'href="index.html"')
    html = html.replace('下一章 · 机器人结构与运动', '返回本章总览')
    # Original 2-3 controls link to the other lab within the lesson directory.
    if not entrance and 'data-lab="fourbar"' in html:
        html = html.replace('href="index.html"', 'href="mechanisms.html"')
    return html

entrance = root/'第二章_动力与工作机构/index.html'
(site/'index.html').write_text(localize(entrance.read_text(encoding='utf-8-sig'), True), encoding='utf-8')
(site/'lessons').mkdir(exist_ok=True)
for source, target in labs.items():
    file = root/source
    html = inline_assets(file.read_text(encoding='utf-8-sig'), file)
    (site/'lessons'/target).write_text(localize(html), encoding='utf-8')
(site/'.nojekyll').touch()
shutil.copy2(root/'公共资源/vendor/THREE-LICENSE.txt', site/'THREE-LICENSE.txt')
(site/'使用说明.txt').write_text('第二章 · 动力与工作机构\n\n双击 index.html，或把 site 文件夹内的全部内容上传到静态网站。\n五个实验均为离线 HTML；保持 lessons 目录与 index.html 的相对位置。\n入口采用与第三章一致的蓝白三维展台，支持拖动、选择、巡展、暂停和全屏。\n全部实验每次进入均默认深色；入口和实验字号均已放大。\n电机页以观察、原理、应用三个页面为主，进阶练习与详细设置可展开。\n实验顶部可切换五个案例或返回章节总览。柴油机按结构、多缸协同、四冲程分页。\n本包仅包含第二章，课程总目录与第三章链接在原仓库版本中保留。\n', encoding='utf-8')
archive = dest/'第二章_动力与工作机构_整合版.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for file in sorted(site.rglob('*')):
        if file.is_file(): z.write(file, file.relative_to(site).as_posix())
print(archive)
