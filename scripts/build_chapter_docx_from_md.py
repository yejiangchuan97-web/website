# -*- coding: utf-8 -*-
"""
High-fidelity Markdown to DOCX compiler for "Intelligent Construction Machinery and Robotics" textbook.
Adheres strictly to Chapter 3 YaHei styling specification.
Embedded real images for QR codes, platform screenshots, and figures.
"""

import re
import os
import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from pathlib import Path

# ---------- Font & Style Helpers ----------

def apply_font(run, size_pt=10.5, bold=False, color_rgb=None, italic=False):
    run.font.name = "Microsoft YaHei"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    run._element.rPr.rFonts.set(qn("w:ascii"), "Microsoft YaHei")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Microsoft YaHei")
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb

def set_cell_background(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="D1D5DB", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def set_alert_box_border(table, color="0284C7"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="6" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="{color}"/><w:left w:val="single" w:sz="24" w:space="0" w:color="{color}"/><w:right w:val="single" w:sz="6" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def add_alert_box(doc, tag, text, alert_type="knowledge"):
    palettes = {
        "safety": ("FDE8E8", "E02424"),
        "operation": ("FEF08A", "CA8A04"),
        "resource": ("E0F2FE", "0284C7"),
        "knowledge": ("DCFCE7", "16A34A"),
        "ideology": ("FEF2F2", "B91C1C"),
        "record": ("F3F4F6", "4B5563")
    }
    bg, border = palettes.get(alert_type, ("F3F4F6", "4B5563"))
    
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg)
    set_alert_box_border(tbl, border)
    set_cell_margins(cell, top=120, bottom=120, left=160, right=160)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.3
    
    if tag:
        r_tag = p.add_run(f"【{tag}】")
        apply_font(r_tag, size_pt=9.5, bold=True, color_rgb=RGBColor.from_string(border))
        if "\n" not in tag:
            r_sp = p.add_run(" ")
            apply_font(r_sp, size_pt=9.5)
            
    # Process text runs
    parse_inline_text(p, text, base_size=9.5, default_color=RGBColor(31, 41, 55))
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(4)
    p_after.paragraph_format.space_before = Pt(0)

def add_ideology_box(doc, title, text):
    """Special styling for 思政微视窗 callouts."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "FEF2F2")
    set_alert_box_border(tbl, "B91C1C")
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.35
    
    r_tag = p.add_run(f"【思政微视窗 · {title}】\n")
    apply_font(r_tag, size_pt=10, bold=True, color_rgb=RGBColor(185, 28, 28))
    
    parse_inline_text(p, text, base_size=9.5, default_color=RGBColor(55, 65, 81))
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)
    p_after.paragraph_format.space_before = Pt(0)

def add_embedded_image(doc, img_path, caption="", width_inch=5.2):
    p = Path(img_path)
    if not p.exists():
        # Try resolving relative to workspace root
        clean_path = str(img_path).replace("../", "").replace("./", "").replace("\\", "/")
        p2 = Path(clean_path)
        if p2.exists():
            p = p2
        else:
            # Check in artifacts/screenshots
            p3 = Path("artifacts/screenshots") / clean_path.split("/")[-1]
            if p3.exists():
                p = p3
    
    if p.exists() and p.is_file():
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(2)
        run = p_img.add_run()
        run.add_picture(str(p), width=Inches(width_inch))
    else:
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.columns[0].width = Inches(width_inch)
        c = tbl.cell(0, 0)
        set_cell_background(c, "F8FAFC")
        set_table_borders(tbl, "CBD5E1", "4", "dashed")
        p_box = c.paragraphs[0]
        p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p_box.add_run(f"[ 图片：{caption if caption else img_path} ]")
        apply_font(r, size_pt=9.5, color_rgb=RGBColor(100, 116, 139))
        
    if caption:
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(8)
        r_cap = p_cap.add_run(caption)
        apply_font(r_cap, size_pt=9, bold=True, color_rgb=RGBColor(71, 85, 105))

def format_grid_table(table, col_widths, headers, data_rows):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_table_borders(table, color="D1D5DB", sz="4", val="single")
    
    # Headers
    hdr_cells = table.rows[0].cells
    for i, h_text in enumerate(headers):
        hdr_cells[i].text = ""
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        r = p.add_run(h_text)
        apply_font(r, size_pt=9.5, bold=True, color_rgb=RGBColor(255, 255, 255))
        set_cell_background(hdr_cells[i], "1E40AF") # Deep Royal Blue
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        hdr_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
    # Data rows
    for r_idx, row_data in enumerate(data_rows):
        row_cells = table.rows[r_idx + 1].cells
        bg_col = "F8FAFC" if r_idx % 2 == 1 else "FFFFFF"
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = ""
            p = row_cells[c_idx].paragraphs[0]
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.2
            
            # Text alignment heuristic
            if c_idx == 0 or len(val) <= 10 or "□" in val or "✓" in val:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                
            lines = val.split("\n")
            for l_i, line in enumerate(lines):
                if l_i > 0:
                    p.add_run("\n")
                parse_inline_text(p, line, base_size=9.0)
                
            set_cell_background(row_cells[c_idx], bg_col)
            set_cell_margins(row_cells[c_idx], top=90, bottom=90, left=120, right=120)
            row_cells[c_idx].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
    # Apply widths
    for row in table.rows:
        for i, w in enumerate(col_widths):
            row.cells[i].width = w

def parse_inline_text(paragraph, text, base_size=10.0, default_color=RGBColor(30, 41, 59)):
    pattern = re.compile(r'(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)')
    tokens = pattern.split(text)
    for token in tokens:
        if not token:
            continue
        if token.startswith("**") and token.endswith("**"):
            r = paragraph.add_run(token[2:-2])
            apply_font(r, size_pt=base_size, bold=True, color_rgb=default_color)
        elif token.startswith("`") and token.endswith("`"):
            r = paragraph.add_run(token[1:-1])
            apply_font(r, size_pt=base_size * 0.95, bold=False, color_rgb=RGBColor(2, 132, 199))
        elif token.startswith("$") and token.endswith("$"):
            r = paragraph.add_run(token[1:-1])
            apply_font(r, size_pt=base_size, italic=True, color_rgb=RGBColor(15, 23, 42))
        else:
            r = paragraph.add_run(token)
            apply_font(r, size_pt=base_size, bold=False, color_rgb=default_color)

# ---------- Markdown Compiler Engine ----------

def build_docx_from_markdown(md_file_path, out_docx_path):
    doc = docx.Document()
    
    # Page Setup
    for s in doc.sections:
        s.top_margin = Cm(2.2)
        s.bottom_margin = Cm(2.2)
        s.left_margin = Cm(2.5)
        s.right_margin = Cm(2.5)
        s.page_width = Cm(21.0)
        s.page_height = Cm(29.7)
        
    with open(md_file_path, "r", encoding="utf-8") as f:
        md_text = f.read()
        
    lines = md_text.split("\n")
    
    in_table = False
    table_lines = []
    
    in_blockquote = False
    quote_lines = []
    
    in_code_block = False
    code_lines = []
    
    idx = 0
    total_lines = len(lines)
    
    while idx < total_lines:
        line = lines[idx]
        stripped = line.strip()
        
        # 1. Code blocks
        if stripped.startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lines = []
            else:
                in_code_block = False
                tbl = doc.add_table(rows=1, cols=1)
                tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                tbl.columns[0].width = Inches(6.5)
                c = tbl.cell(0, 0)
                set_cell_background(c, "F1F5F9")
                set_table_borders(tbl, "CBD5E1", "4", "single")
                set_cell_margins(c, top=100, bottom=100, left=150, right=150)
                p = c.paragraphs[0]
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(0)
                p.paragraph_format.line_spacing = 1.15
                r = p.add_run("\n".join(code_lines))
                r.font.name = "Consolas"
                r.font.size = Pt(8.5)
                r.font.color.rgb = RGBColor(30, 41, 59)
                
                p_af = doc.add_paragraph()
                p_af.paragraph_format.space_after = Pt(4)
                code_lines = []
            idx += 1
            continue
            
        if in_code_block:
            code_lines.append(line)
            idx += 1
            continue
            
        # 2. Tables
        if stripped.startswith("|") and stripped.endswith("|"):
            in_table = True
            table_lines.append(stripped)
            idx += 1
            continue
        elif in_table:
            in_table = False
            render_markdown_table(doc, table_lines)
            table_lines = []
            
        # 3. Blockquotes
        if stripped.startswith(">"):
            in_blockquote = True
            quote_lines.append(stripped[1:].strip())
            idx += 1
            continue
        elif in_blockquote:
            in_blockquote = False
            render_markdown_blockquote(doc, quote_lines)
            quote_lines = []
            
        # 4. Horizontal Dividers
        if stripped in ["---", "--- ---", "***"]:
            idx += 1
            continue
            
        # 5. Headings
        if stripped.startswith("# 《"):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(4)
            r = p.add_run(stripped.replace("# ", ""))
            apply_font(r, size_pt=14, bold=True, color_rgb=RGBColor(30, 58, 138))
            idx += 1
            continue
            
        if stripped.startswith("# 第") and "章" in stripped:
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(14)
            r = p.add_run(stripped.replace("# ", ""))
            apply_font(r, size_pt=18, bold=True, color_rgb=RGBColor(30, 58, 138))
            idx += 1
            continue
            
        if stripped.startswith("## 任务"):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(20)
            p.paragraph_format.space_after = Pt(8)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("## ", ""))
            apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(29, 78, 216))
            idx += 1
            continue
            
        if stripped.startswith("### 一、") or stripped.startswith("### 二、") or stripped.startswith("### 三、") or stripped.startswith("### 四、") or stripped.startswith("### 五、") or stripped.startswith("### 六、") or stripped.startswith("### 七、"):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("### ", ""))
            apply_font(r, size_pt=12.5, bold=True, color_rgb=RGBColor(29, 78, 216))
            idx += 1
            continue
            
        if stripped.startswith("### "):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("### ", ""))
            apply_font(r, size_pt=12, bold=True, color_rgb=RGBColor(30, 41, 59))
            idx += 1
            continue
            
        if stripped.startswith("#### 表"):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("#### ", ""))
            apply_font(r, size_pt=10, bold=True, color_rgb=RGBColor(30, 58, 138))
            idx += 1
            continue
            
        if stripped.startswith("#### 关卡") or stripped.startswith("#### "):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(10)
            p.paragraph_format.space_after = Pt(4)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("#### ", ""))
            apply_font(r, size_pt=11, bold=True, color_rgb=RGBColor(15, 23, 42))
            idx += 1
            continue
            
        if stripped.startswith("##### （"):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(8)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            r = p.add_run(stripped.replace("##### ", ""))
            apply_font(r, size_pt=10.5, bold=True, color_rgb=RGBColor(51, 65, 85))
            idx += 1
            continue
            
        # 6. Images in markdown
        m_img = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', stripped)
        if m_img:
            caption = m_img.group(1)
            img_path = m_img.group(2)
            width = 1.5 if "qr" in img_path.lower() else 5.2
            add_embedded_image(doc, img_path, caption, width_inch=width)
            idx += 1
            continue
            
        # 7. Lists
        if stripped.startswith("- ") or stripped.startswith("* "):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(18)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.3
            r_bullet = p.add_run("• ")
            apply_font(r_bullet, size_pt=10, bold=True, color_rgb=RGBColor(29, 78, 216))
            parse_inline_text(p, stripped[2:])
            idx += 1
            continue
            
        if re.match(r'^\d+\.\s+', stripped):
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Pt(18)
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.3
            parse_inline_text(p, stripped)
            idx += 1
            continue
            
        # 8. Regular Body Paragraph
        if stripped:
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(5)
            p.paragraph_format.line_spacing = 1.35
            
            if stripped.startswith("*图") and stripped.endswith("*"):
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                r_c = p.add_run(stripped[1:-1])
                apply_font(r_c, size_pt=9, bold=True, color_rgb=RGBColor(100, 116, 139))
            elif stripped.startswith("> **【工程"):
                p.paragraph_format.first_line_indent = Pt(0)
                parse_inline_text(p, stripped.replace("> ", ""))
            else:
                p.paragraph_format.first_line_indent = Pt(21)
                parse_inline_text(p, stripped)
                
        idx += 1
        
    if in_table and table_lines:
        render_markdown_table(doc, table_lines)
    if in_blockquote and quote_lines:
        render_markdown_blockquote(doc, quote_lines)
        
    out_p = Path(out_docx_path)
    out_p.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_p))
    print(f"Generated DOCX: {out_p}")

def render_markdown_table(doc, lines):
    if len(lines) < 2:
        return
        
    header_line = lines[0]
    headers = [c.strip() for c in header_line.split("|")[1:-1]]
    
    start_row = 2 if len(lines) > 1 and "---" in lines[1] else 1
    
    data_rows = []
    for line in lines[start_row:]:
        parts = [c.strip().replace("<br>", "\n") for c in line.split("|")[1:-1]]
        if len(parts) < len(headers):
            parts += [""] * (len(headers) - len(parts))
        data_rows.append(parts[:len(headers)])
        
    num_cols = len(headers)
    if num_cols == 0:
        return
        
    total_w = 6.5
    if num_cols == 2:
        col_widths = [Inches(2.0), Inches(4.5)]
    elif num_cols == 3:
        col_widths = [Inches(1.8), Inches(2.2), Inches(2.5)]
    elif num_cols == 4:
        col_widths = [Inches(1.5), Inches(1.8), Inches(1.7), Inches(1.5)]
    elif num_cols == 5:
        col_widths = [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)]
    elif num_cols == 6:
        col_widths = [Inches(1.0), Inches(1.3), Inches(1.3), Inches(1.4), Inches(0.8), Inches(0.7)]
    else:
        w_each = total_w / num_cols
        col_widths = [Inches(w_each)] * num_cols
        
    table = doc.add_table(rows=len(data_rows) + 1, cols=num_cols)
    format_grid_table(table, col_widths, headers, data_rows)
    
    p_af = doc.add_paragraph()
    p_af.paragraph_format.space_after = Pt(6)
    p_af.paragraph_format.space_before = Pt(0)

def render_markdown_blockquote(doc, lines):
    # Separate images from textual blockquote content
    text_lines = []
    extracted_images = []
    
    for l in lines:
        m_img = re.search(r'!\[([^\]]*)\]\(([^)]+)\)', l)
        if m_img:
            extracted_images.append((m_img.group(1), m_img.group(2)))
        elif l.strip().startswith("*图") and l.strip().endswith("*"):
            # Sub-caption
            if extracted_images:
                last_img = extracted_images[-1]
                extracted_images[-1] = (l.strip()[1:-1], last_img[1])
        else:
            text_lines.append(l)
            
    full_text = "\n".join(text_lines).strip()
    
    if full_text:
        # Check for 思政微视窗
        if "思政微视窗" in full_text:
            title_match = re.search(r'【思政微视窗\s*·\s*([^】]+)】', full_text)
            title = title_match.group(1) if title_match else "立德树人"
            clean_text = re.sub(r'\[!NOTE\]\s*', '', full_text)
            clean_text = re.sub(r'\*\*【思政微视窗[^】]+】\*\*\s*', '', clean_text)
            clean_text = clean_text.strip()
            add_ideology_box(doc, title, clean_text)
        else:
            alert_type = "knowledge"
            tag = "知识提示"
            
            if "[!WARNING]" in full_text or "[!CAUTION]" in full_text or "红线" in full_text or "安全" in full_text:
                alert_type = "safety"
                tag = "安全红线警示"
            elif "[!TIP]" in full_text or "插图" in full_text:
                alert_type = "operation"
                tag = "推荐插图素材构思"
            elif "教学导航" in full_text or "学习资源" in full_text:
                alert_type = "resource"
                tag = "数字化教学导航"
                
            tag_match = re.search(r'【([^】]+)】', full_text)
            if tag_match:
                tag = tag_match.group(1)
                
            clean_text = re.sub(r'\[!(NOTE|WARNING|CAUTION|TIP)\]\s*', '', full_text)
            clean_text = re.sub(r'\*\*【[^】]+】\*\*\s*', '', clean_text)
            clean_text = clean_text.strip()
            
            add_alert_box(doc, tag, clean_text, alert_type)
            
    # Now render any images that were inside the blockquote
    for caption, img_path in extracted_images:
        width = 1.5 if "qr" in img_path.lower() else 5.2
        add_embedded_image(doc, img_path, caption, width_inch=width)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2:
        build_docx_from_markdown(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python build_chapter_docx_from_md.py <input_md> <output_docx>")
