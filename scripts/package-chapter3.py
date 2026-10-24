"""Package the approved Chapter 3 HTML files without rebuilding lesson content."""
from datetime import datetime
from hashlib import sha256
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CHAPTER = "第三章_机器人结构与运动"
LESSONS = {
    "任务3-1_机器人构型与工作空间识读/index.html": "lessons/3-1.html",
    "任务3-2_六轴机械臂本体_关节轴与低速点动/index.html": "lessons/3-2.html",
    "任务3-3_关节驱动_减速器与传动机构/reducers.html": "lessons/3-3-reducers.html",
    "任务3-3_关节驱动_减速器与传动机构/conversion.html": "lessons/3-3-conversion.html",
    "任务3-4_末端执行器_TCP与工具控制/index.html": "lessons/3-4.html",
    "任务3-5_移动底盘与行走机构/index.html": "lessons/3-5.html",
}
stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
delivery = ROOT / "dist" / f"chapter3-static-{stamp}"
site = delivery / "site"
site.mkdir(parents=True, exist_ok=False)
(site / "lessons").mkdir()
(site / "licenses").mkdir()


def package_html(source, target, cover=False):
    html = (ROOT / source).read_text(encoding="utf-8-sig")
    for original, packaged in LESSONS.items():
        html = html.replace(original, packaged)
    html = html.replace(f"../{CHAPTER}/index.html", "../index.html")
    html = html.replace("任务3-3_关节驱动_减速器与传动机构/index.html", "lessons/3-3-reducers.html")
    html = html.replace('href="reducers.html"', 'href="3-3-reducers.html"')
    html = html.replace('href="conversion.html"', 'href="3-3-conversion.html"')
    html = re.sub(r'href="(?:\.\./)*README\.md"', 'href="../README.txt"', html)
    if cover:
        html = html.replace("../lessons/", "lessons/")
    (site / target).write_text(html, encoding="utf-8")


package_html(f"{CHAPTER}/index.html", "index.html", cover=True)
for source, target in LESSONS.items():
    package_html(source, target)
shutil.copy2(ROOT / CHAPTER / "封面预览.png", site / "cover-preview.png")
shutil.copy2(ROOT / "公共资源/vendor/THREE-LICENSE.txt", site / "licenses/THREE-LICENSE.txt")
shutil.copy2(ROOT / "任务3-3_关节驱动_减速器与传动机构/assets/anatomy/LICENSE", site / "licenses/ANATOMY-LICENSE.txt")

(site / "README.txt").write_text("""智能建筑机械与机器人 · 第三章：机器人结构与运动
静态网站文件包

使用方法
1. 完整解压 ZIP，双击根目录的 index.html，进入第三章封面。
2. 点击展品或下方任务卡进入实验。各实验顶部可以切换案例、返回封面。
3. 上传静态网站时，上传本包内的全部文件；入口是根目录 index.html。
   ZIP 内直接包含 index.html，没有多余的外层文件夹。
4. 页面无需安装程序、构建环境或后端服务；模型、脚本和样式均已内嵌。
5. 所有教学页面使用 16:9 画面，窗口变化时等比例缩放，可使用右上角全屏。

内容
index.html                    第三章交互封面
lessons/3-1.html               机器人构型与工作空间
lessons/3-2.html               六轴机械臂与点动示教
lessons/3-3-reducers.html      关节传动：减速器
lessons/3-3-conversion.html    关节传动：运动转换
lessons/3-4.html               末端执行器与 TCP
lessons/3-5.html               移动底盘与行走机构
cover-preview.png             封面预览图
licenses/                     内嵌组件许可
manifest.json                 文件清单与校验值

说明
保持 lessons 文件夹与 index.html 的相对位置。
完整三维显示需要浏览器支持 WebGL；学习进度保存在当前设备的浏览器中。
教学页面可离线使用；说明中的外部参考资料链接需联网访问。
本包包含课堂仿真，不代表实际设备性能或工程验收精度。

页面引用的参考资料
RoboDK：https://robodk.com/doc/en/Collision-Avoidance.html
Universal Robots：https://www.universal-robots.com/manuals/EN/HTML/SW5_23/Content/prod-usr-man/complianceUR12e/SW_sections/first_program/move_tab.htm
Harmonic Drive：https://www.harmonicdrive.net/technology/harmonicdrive
THK：https://www.thk.com/jp/en/products/ball_screw/
""", encoding="utf-8-sig")


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and key in ("href", "src", "poster"):
                self.links.append((tag, key, value))


checked = 0
for page in site.rglob("*.html"):
    content = page.read_text(encoding="utf-8")
    parser = Assets()
    parser.feed(content)
    for tag, key, link in parser.links:
        if link.startswith(("data:", "#", "blob:")):
            continue
        parts = urlsplit(link)
        if parts.scheme or parts.netloc:
            assert tag == "a", f"External runtime dependency: {page.name}: {link}"
            continue
        target = (page.parent / unquote(parts.path)).resolve()
        assert target.is_relative_to(site.resolve()) and target.is_file(), (page.name, link)
        checked += 1
    assert not re.search(r"(?:任务3-[1-5]_|第三章_)[^\n\"']+\.html", content), page.name

files = [{"path": p.relative_to(site).as_posix(), "bytes": p.stat().st_size,
          "sha256": sha256(p.read_bytes()).hexdigest()}
         for p in sorted(site.rglob("*")) if p.is_file()]
(site / "manifest.json").write_text(json.dumps({
    "title": "智能建筑机械与机器人 · 第三章", "created": stamp,
    "entry": "index.html", "lesson_count": 6, "files": files,
}, ensure_ascii=False, indent=2), encoding="utf-8")
archive = delivery / "第三章_机器人结构与运动_静态文件包.zip"
with zipfile.ZipFile(archive, "x", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for p in sorted(site.rglob("*")):
        if p.is_file():
            z.write(p, p.relative_to(site).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert "index.html" in z.namelist()
    assert len([p for p in z.namelist() if p.endswith(".html")]) == 7
print(json.dumps({"archive": str(archive), "site": str(site),
                  "bytes": archive.stat().st_size, "static_links_checked": checked},
                 ensure_ascii=True, indent=2))
