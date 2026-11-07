# -*- coding: utf-8 -*-
"""
Master builder: Compiles all 8 chapters of "Intelligent Construction Machinery and Robotics"
into professional Word (.docx) textbooks and workbooks in docs/ and artifacts/packages/,
plus a unified master full-volume document.
"""

import sys
import shutil
from pathlib import Path
from build_chapter_docx_from_md import build_docx_from_markdown

CHAPTERS = [
    ("01", "第一章", "第一章教材正文与实训任务.md", "第一章教材与实训任务页.docx"),
    ("02", "第二章", "第二章教材正文与实训任务.md", "第二章教材与实训任务页.docx"),
    ("03", "第三章", "第三章教材正文与实训任务.md", "第三章教材与实训任务页.docx"),
    ("04", "第四章", "第四章教材正文与实训任务.md", "第四章教材与实训任务页.docx"),
    ("05", "第五章", "第五章教材正文与实训任务.md", "第五章教材与实训任务页.docx"),
    ("06", "第六章", "第六章教材正文与实训任务.md", "第六章教材与实训任务页.docx"),
    ("07", "第七章", "第七章教材正文与实训任务.md", "第七章教材与实训任务页.docx"),
    ("08", "第八章", "第八章教材正文与实训任务.md", "第八章教材与实训任务页.docx"),
]

def build_all():
    docs_dir = Path("docs")
    pkg_dir = Path("artifacts/packages")
    pkg_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Compile individual chapters
    for code, name, md_name, docx_name in CHAPTERS:
        md_path = docs_dir / md_name
        docx_path = docs_dir / docx_name
        pkg_docx_path = pkg_dir / docx_name
        
        print(f"\n==========================================")
        print(f"Compiling {name} ({md_path}) -> {docx_path}")
        print(f"==========================================")
        
        if not md_path.exists():
            print(f"Warning: {md_path} does not exist, skipping.")
            continue
            
        build_docx_from_markdown(str(md_path), str(docx_path))
        
        # Copy to packages
        shutil.copy2(str(docx_path), str(pkg_docx_path))
        print(f"Synced to package: {pkg_docx_path}")
        
    # 2. Compile full combined textbook
    print(f"\n==========================================")
    print("Compiling Master Full Volume (All 8 Chapters)...")
    print(f"==========================================")
    
    full_md_path = docs_dir / "智能建筑机械与机器人_全书教材与实训工作页.md"
    full_docx_path = docs_dir / "智能建筑机械与机器人_全书教材与实训工作页.docx"
    full_pkg_docx_path = pkg_dir / "智能建筑机械与机器人_全书教材与实训工作页.docx"
    
    combined_md_content = ["# 《智能建筑机械与机器人》核心教材与实训工作页（全一册合订本）\n"]
    combined_md_content.append("## 课程编写组 · 2026年最新数字化理实一体化新形态教材\n")
    combined_md_content.append("> **【全书总览】** 本书涵盖 8 个核心教学项目、24 项理实一体化活动任务。以三维虚拟建造仿真工位为依托，打通施工机械认识、硬件基础、机器人本体、环境感知、主体结构协同、精装施工、监测管养及安全维保全技术链路，融工匠精神、安全红线与前沿科技于一体。\n\n---\n")
    
    for code, name, md_name, docx_name in CHAPTERS:
        md_path = docs_dir / md_name
        if md_path.exists():
            with open(md_path, "r", encoding="utf-8") as f:
                content = f.read()
            # Strip top book header if redundant
            lines = content.split("\n")
            cleaned_lines = []
            for l in lines:
                if l.startswith("# 《智能建筑机械与机器人》"):
                    continue
                cleaned_lines.append(l)
            combined_md_content.append("\n\n---\n\n" + "\n".join(cleaned_lines))
            
    with open(full_md_path, "w", encoding="utf-8") as f:
        f.write("\n".join(combined_md_content))
    print(f"Generated Combined Markdown: {full_md_path} ({len(combined_md_content)} sections)")
    
    build_docx_from_markdown(str(full_md_path), str(full_docx_path))
    shutil.copy2(str(full_docx_path), str(full_pkg_docx_path))
    print(f"Generated Master Full Volume DOCX: {full_docx_path} and {full_pkg_docx_path}")

if __name__ == "__main__":
    build_all()
