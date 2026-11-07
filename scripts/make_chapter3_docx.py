# -*- coding: utf-8 -*-
"""Generate Chapter 3 Word (.docx) textbook and task pages adhering to the style specification."""

import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from pathlib import Path

def set_cell_background(cell, color_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def set_alert_box_border(table, color="D9534F"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="8" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="{color}"/><w:left w:val="single" w:sz="24" w:space="0" w:color="{color}"/><w:right w:val="single" w:sz="8" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def add_alert_box(doc, tag, text, alert_type="knowledge"):
    palettes = {
        "safety": ("FDE8E8", "E53E3E"),
        "operation": ("FFFBEA", "D69E2E"),
        "resource": ("EBF8FF", "3182CE"),
        "knowledge": ("F0FFF4", "38A169"),
        "record": ("F7FAFC", "718096")
    }
    bg, border = palettes.get(alert_type, ("F7FAFC", "718096"))
    
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, bg)
    set_alert_box_border(tbl, border)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.25
    
    r_tag = p.add_run(f"【{tag}】")
    r_tag.bold = True
    r_tag.font.name = "黑体"
    r_tag.font.size = Pt(10)
    r_tag.font.color.rgb = RGBColor.from_string(border)
    
    r_text = p.add_run(text)
    r_text.font.name = "楷体"
    r_text.font.size = Pt(10)
    r_text.font.color.rgb = RGBColor(45, 55, 72)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)
    p_after.paragraph_format.space_before = Pt(0)

def add_image_placeholder(doc, caption, desc="现场实物 / 原理示意图"):
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8F9FA")
    set_table_borders(tbl, color="CBD5E0", sz="4", val="dashed")
    set_cell_margins(cell, top=260, bottom=260, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"[ 图片占位：{caption}（{desc}） ]")
    r.font.name = "仿宋"
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(113, 128, 150)
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(4)
    p_cap.paragraph_format.space_after = Pt(8)
    r_cap = p_cap.add_run(caption)
    r_cap.bold = True
    r_cap.font.name = "黑体"
    r_cap.font.size = Pt(9.5)
    r_cap.font.color.rgb = RGBColor(45, 55, 72)

def add_platform_screenshot_box(doc, caption, task_url, observation_points):
    """Add dedicated platform screenshot box at the end of each task."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F0F9FF") # very light sky blue
    set_alert_box_border(tbl, "0284C7")
    set_cell_margins(cell, top=200, bottom=200, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.3
    
    r_tag = p.add_run("【配套数字化平台互动工位指引与界面截图】\n")
    r_tag.bold = True
    r_tag.font.name = "黑体"
    r_tag.font.size = Pt(10.5)
    r_tag.font.color.rgb = RGBColor(2, 132, 199)
    
    r_url = p.add_run(f"网页模块入口：{task_url}\n")
    r_url.bold = True
    r_url.font.name = "黑体"
    r_url.font.size = Pt(9.5)
    r_url.font.color.rgb = RGBColor(30, 41, 59)
    
    r_body = p.add_run(f"[ 此处接入平台实操高清截图 ]\n三维交互观察要点：\n{observation_points}")
    r_body.font.name = "楷体"
    r_body.font.size = Pt(9.5)
    r_body.font.color.rgb = RGBColor(51, 65, 85)
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(4)
    p_cap.paragraph_format.space_after = Pt(12)
    r_cap = p_cap.add_run(caption)
    r_cap.bold = True
    r_cap.font.name = "黑体"
    r_cap.font.size = Pt(9.5)
    r_cap.font.color.rgb = RGBColor(2, 132, 199)

def style_chapter_title(p, text):
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(18)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(18)
    r.font.color.rgb = RGBColor(15, 23, 42)

def style_task_title(p, text):
    p.paragraph_format.space_before = Pt(16)
    p.paragraph_format.space_after = Pt(10)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(15)
    r.font.color.rgb = RGBColor(15, 23, 42)

def style_heading_1(p, text):
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(30, 64, 175)

def style_heading_2(p, text):
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(11)
    r.font.color.rgb = RGBColor(51, 65, 85)

def style_body_p(p, text, indent=True):
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.3
    if indent:
        p.paragraph_format.first_line_indent = Pt(21)
    r = p.add_run(text)
    r.font.name = "宋体"
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(30, 41, 59)

def style_table_title(p, text):
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(9.5)
    r.font.color.rgb = RGBColor(30, 41, 59)

def format_grid_table(table, col_widths, headers, rows):
    set_table_borders(table, color="CBD5E0", sz="4")
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Headers
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "EDF2F7")
        set_cell_margins(hdr_cells[i], top=90, bottom=90, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.runs[0].font.name = "黑体"
        p.runs[0].font.size = Pt(9.5)
        p.runs[0].bold = True
        p.runs[0].font.color.rgb = RGBColor(30, 41, 59)
        
    for r_idx, row_data in enumerate(rows):
        row_cells = table.rows[r_idx + 1].cells
        for c_idx, val in enumerate(row_data):
            row_cells[c_idx].text = val
            set_cell_margins(row_cells[c_idx], top=70, bottom=70, left=100, right=100)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (c_idx == 0 or "□" in val or "✓" in val) else WD_ALIGN_PARAGRAPH.LEFT
            if p.runs:
                p.runs[0].font.name = "宋体"
                p.runs[0].font.size = Pt(9)
                p.runs[0].font.color.rgb = RGBColor(51, 65, 85)
                
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

print("helper setup done")

def build_chapter_3():
    doc = docx.Document()
    
    # Page setup
    for section in doc.sections:
        section.top_margin = Cm(2.2)
        section.bottom_margin = Cm(2.2)
        section.left_margin = Cm(2.4)
        section.right_margin = Cm(2.4)
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("《智能建筑机械与机器人》核心教材与实训工作页 · 第三章")
        hrun.font.name = "宋体"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("— 第三章 机器人硬件本体与行走机构 —")
        frun.font.name = "宋体"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # Chapter Title
    p_ch = doc.add_paragraph()
    style_chapter_title(p_ch, "第三章  机器人硬件本体与行走机构")
    
    p_ch_intro = doc.add_paragraph()
    style_body_p(p_ch_intro, "建筑机器人是智能建造现场执行高危、繁复、脏污、重载作业的‘钢铁工友’。机器人的外表千差万别，但追本溯源，它们都脱胎于机械学、电机传动学与自动控制技术的深度融合。本章立足施工现场真实需求，带同学们系统拆解机器人的核心‘骨骼与肌肉’：从自由度与五大机械构型，到六轴机械臂的关节与点动坐标系；从伺服电机与核心减速器的内部原理，到末端工具快换与TCP标定；最后深入探索能走、能爬、能原地转弯的智能移动底盘。学完本章，你将真正看懂机器人的‘硬核底气’，掌握智能装备日常调试、参数校准与现场操作的硬本领。")

    # =========================================================================
    # TASK 3-1
    # =========================================================================
    p_t31 = doc.add_paragraph()
    style_task_title(p_t31, "任务3-1  机器人构型与工作空间识读")

    # 一、任务描述
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "一、任务描述")
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在装配式建筑构件厂、钢结构加工车间以及建筑施工现场，经常能见到形态各异的自动化设备：有的像巨大的龙门吊沿直线导轨滑移，有的像修长的钢铁手臂在三维空间灵活扭转，还有的像蜘蛛一样用几根轻巧的细杆在输送线上快速点选。同样是把工具送到作业位置，不同机器人的‘骨架搭建方式’（即机械构型）完全不同，能覆盖的作业空间形状、动作速度和承载能力也天差地别。如果技术人员选型不当，就可能出现‘看似能能够到目标点，但机械臂手肘却撞上外架或墙壁’的严重事故。")
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你从空间自由度的概念切入，观察并识读直角坐标型、圆柱坐标型、关节型六轴、SCARA及Delta并联等五类典型机器人构型，分清‘末端可达空间’与‘本体扫掠空间’的本质差别，并能根据施工场景的实际范围与姿态要求推荐合适构型。完成本任务后，你应能用工程理由说明‘为什么选型时既要看末端能不能够到，更要核算手臂运动会不会发生空间干涉’。")

    # 二、学习目标
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "二、学习目标")
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.3
    r = p_obj.add_run("知识目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("理解自由度（DOF）的概念，认识五种典型机器人构型的结构特征，区分末端可达范围与本体扫掠干涉范围。\n")
    r.font.name = "宋体"
    r = p_obj.add_run("技能目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("能根据外形与运动线索快速识别构型类型；能为平面扫描、曲面打磨和轻小件分拣等施工场景推荐合适构型；能指出‘末端位置可达但路径发生碰撞干涉’的施工风险。")
    r.font.name = "宋体"

    # 三、任务安排
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "三、任务安排")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-1-1 小组任务安排表")
    t_arr = doc.add_table(rows=6, cols=3)
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs: p.runs[0].font.name = "黑体"; p.runs[0].bold = True
    tasks_31 = [
        ("实体分析", "观察五类构型模型，数清每个构型的运动关节与直线/旋转轴分布"),
        ("识读判断", "根据导轨、连杆与转动轴特征，快速判断构型名称及工作空间外形"),
        ("风险分析", "分析机械臂大臂、肘部在狭小作业面可能发生的本体扫掠干涉风险"),
        ("场景匹配", "为平整墙面扫描、复杂楼梯构件打磨及小型配件分拣匹配最佳设备")
    ]
    for idx, (role, desc) in enumerate(tasks_31):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"
        row.cells[1].text = f"{role}：{desc}"
        row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(4.3); row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs: p.runs[0].font.name = "宋体"; p.runs[0].font.size = Pt(9)

    # 四、任务实施
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "四、任务实施")
    
    p_k1 = doc.add_paragraph()
    style_heading_2(p_k1, "【知识精讲 1】什么是自由度（DOF）？")
    p_t1 = doc.add_paragraph()
    style_body_p(p_t1, "自由度表示描述一个物体在空间独立运动所需的变量数目。一个不受任何限制的刚体在太空中飘浮时，具有 6 个独立自由度：3个沿三维坐标轴的直线平移（前后走X、左右走Y、上下走Z，决定‘在什么位置’），以及3个绕三维轴的旋转翻滚（俯仰Pitch、偏航Yaw、横滚Roll，决定‘朝向哪个姿态’）。每增加一个机械约束，物体的自由度就减少一个：例如门被合页卡住，只能绕轴旋转，就只剩下 1 个转动自由度；抽屉被导轨限死，只能直线抽拉，就只有 1 个平移自由度。工业机械臂之所以标配 6 个关节轴，就是为了让末端工具能够在空间任意改变位置和姿态！")

    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：请观察生活与工程中的运动物体（如教室门、抽屉、龙门吊小车、空间气球），数一数它们分别具备几个自由度？如果想要机械臂的末端工具能够以任意角度拧入一颗倾斜的螺丝，机械臂理论上最少需要几个关节？将分析记录在 表3-1-2 中。", indent=False)
    p_q1.runs[0].bold = True
    add_image_placeholder(doc, "图3-1-1 空间六自由度与人体手臂关节类比示意图", "平移自由度与转动自由度")
    add_alert_box(doc, "知识提示", "六轴是串联机械臂实现空间全向作业的一般方案。如果作业只需要保持垂直向下（如地砖铺贴），4个自由度可能就够用；但若作业要求在复杂障碍物丛中绕过立柱，甚至需要7轴‘冗余机械臂’来避障。", "knowledge")

    p_k2 = doc.add_paragraph()
    style_heading_2(p_k2, "【知识精讲 2】五大经典机器人构型各显神通")
    p_t2 = doc.add_paragraph()
    style_body_p(p_t2, "根据关节的串并联形式与布置，机器人形成了五种经典构型：① 直角坐标型（由相互垂直的直线轴组成，工作空间像方盒子，刚性好、负载大、控制极其简单）；② 圆柱坐标型（一个回转轴配合垂直升降与水平伸缩，工作空间呈圆柱体，运动形式类似平臂塔吊）；③ 关节型六轴（多个转动关节串联相接，最像人类手臂，灵巧度极高，能深入各种凹槽角落）；④ SCARA（两段水平转动臂配合垂直末端，水平方向刚性强、动作敏捷，专攻平面的极速插件与取放）；⑤ Delta并联（三条或多条轻质细杆支链从上方汇聚驱动一个小平台，自重极轻、加速度极大，如同灵巧的蜘蛛手高速分拣轻小物件）。")

    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：请观察图3-1-2中的五种机械构型外形图，分析它们的关节组合方式与工作空间包络形状，找出它们的辨识特征词并填入 表3-1-3 中。", indent=False)
    p_q2.runs[0].bold = True
    add_image_placeholder(doc, "图3-1-2 五种典型工业与建筑机器人机械构型外形图", "直角坐标/关节型/SCARA/Delta等")
    add_alert_box(doc, "操作提醒", "观察构型时切忌只看底座大小，要重点观察运动是由‘滑块在直线上滑动’还是‘轴承绕销轴回转’产生的，并观察各个转动轴是垂直还是水平布置。", "operation")

    p_q3 = doc.add_paragraph()
    style_body_p(p_q3, "引导问题 3：在装配式建筑产业园中，有三个具体工序：工序A是在3米×6米的平整叠合板表面精准喷涂养护剂；工序B是对异形楼梯踏步的立面、踏面与转折角进行精细打磨；工序C是在高速流水线上把重量仅20克的塑料垫块分拣装盒。请为它们分别匹配最佳构型并说明理由。填入 表3-1-4 中。", indent=False)
    p_q3.runs[0].bold = True
    add_alert_box(doc, "安全提示", "在异形构件打磨等复杂工况中，必须牢记‘末端到达不等于路径安全’！即使钻头尖端能够碰到目标作业点，如果程序规划不合理，机械臂凸出的肘关节或大臂极有可能在旋转中撞击脚手架立杆，造成严重设备损坏！", "safety")

    p_conc = doc.add_paragraph()
    style_body_p(p_conc, "小组结论：评估机器人构型是否适用于具体施工时，既要看 ______________，也要看 ______________，还要重点核对 ______________。")

    # 五、成果记录
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "五、成果记录")
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-1-2 物体与机械自由度判定记录表")
    t_f = doc.add_table(rows=6, cols=4)
    format_grid_table(t_f, [Inches(1.5), Inches(1.2), Inches(1.8), Inches(2.0)],
                      ["观察对象", "自由度数目", "运动性质说明", "现场约束分析"],
                      [
                          ["① 房间木门绕合页转动", "1 个", "绕竖直轴单一旋转", "门框合页限制了5个方向的移动与翻转"],
                          ["② 办公桌抽屉沿导轨抽拉", "1 个", "沿水平导轨单一平移", "两侧滑轨限制了上下、左右及旋转"],
                          ["③ 施工现场双梁龙门吊小车", "1 个", "沿横梁轨道做水平直线移动", "轨道夹紧装置限制了横向与垂直脱轨"],
                          ["④ 悬浮在空中的气球", "6 个", "3个平移（X/Y/Z）+ 3个转动", "处于完全无约束的空间自由状态"],
                          ["⑤ 六轴工业机器人整机", "6 个", "末端可达任意空间位置与姿态", "由J1至J6共6个受控转动关节独立驱动"]
                      ])
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-1-3 常见机器人机械构型识别对比表")
    t_c = doc.add_table(rows=6, cols=5)
    format_grid_table(t_c, [Inches(1.2), Inches(1.3), Inches(1.3), Inches(1.3), Inches(1.4)],
                      ["构型名称", "关键骨架特征", "运动副形式", "工作空间形状", "施工现场典型应用"],
                      [
                          ["直角坐标型", "相互垂直的三根直线导轨", "全为移动副（PPP）", "规则长方体（盒子状）", "大板面喷墨划线、大幅面3D打印机"],
                          ["圆柱坐标型", "立柱旋转台 + 垂直与径向导轨", "一转两动（RPP）", "圆柱体或圆柱壳环状", "环形生产线物料上下料、类塔吊转运"],
                          ["关节型六轴", "多个串联摆动的回转机械臂节", "全为转动副（RRRRRR）", "类球形或复杂组合凹凸面", "钢结构焊接、曲面喷涂、外立面打磨"],
                          ["SCARA构型", "两节水平回转臂 + 垂直伸缩轴", "水平转动 + 竖直平移", "水平扇形环状 + 垂直高度", "小型五金插件装配、平整预制件组装"],
                          ["Delta并联", "三组细长轻质并联支链悬挂", "并联闭环运动支链", "圆顶钟罩形空间", "输送带轻小塑料件、预埋件极速分拣"]
                      ])

    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-1-4 施工场景构型选型与工程理由表")
    t_s = doc.add_table(rows=4, cols=4)
    format_grid_table(t_s, [Inches(1.4), Inches(1.8), Inches(1.4), Inches(1.9)],
                      ["施工任务场景", "作业面几何与动作特点", "推荐选用构型", "工程推荐依据与选型理由"],
                      [
                          ["工况A：大幅面叠合板喷剂", "3m×6m规则大平面，工具姿态始终垂直向下", "直角坐标桁架式", "刚度大、跨度容易做大，无须复杂姿态算法，成本最低"],
                          ["工况B：异形楼梯多面打磨", "涉及踏步立面、转折角，需要从不同倾角切入", "关节型六轴机械臂", "灵活性最高，手腕能变换姿态紧贴复杂构件轮廓"],
                          ["工况C：流水线垫块高速装盒", "轻巧小件（<100g），要求每分钟抓取超过60次", "Delta并联机械手", "驱动电机均固定在上方架子上，运动臂极轻，速度最快"]
                      ])

    # 六、达标评价
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "六、达标评价")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-1-5 达标评价表")
    t_ev = doc.add_table(rows=5, cols=5)
    format_grid_table(t_ev, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能准确计算自由度并识别五种典型构型骨架特征", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能分清末端可达空间与本体扫掠干涉空间的本质差别", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能为大幅面、多姿态打磨与轻小分拣精准匹配设备", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "小组分工落实到位，记录表结论严谨，无逻辑漏洞", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "在真实复杂施工现场（例如钢筋密集的地下室梁柱节点或狭窄管道井），普通的六轴机械臂有时仍会‘卡壳’：虽然工具够得着节点，但机械臂的手肘由于受到周围钢筋笼的阻碍而无法施展。为了攻克这一难题，工程机械领域正在引入‘七轴冗余机械臂’甚至‘蛇形仿生柔性机器人’。多出来的这一个转动轴并不改变末端工具的位置和姿态，却能让机械臂像真正的人臂一样，在手握工具不动的同时，灵活抬起或下沉手肘，巧妙避开密密麻麻的钢筋障碍。这充分说明：工程构型没有绝对的优劣，只有针对具体工序痛点的不断迭代与优化。")

    # 平台截图
    add_platform_screenshot_box(doc, "图3-1-3 配套平台实训工位：机器人构型与工作空间三维展厅", 
                                "course/chapters/03/tasks/3-1/index.html", 
                                "1. 3D展厅中包含五类经典机器人构型交互网格，支持鼠标 360° 旋转、无级缩放与部位聚焦；\n2. 点击左侧构型切换卡，观察直角坐标盒状空间与六轴机械臂类球状包络线的几何差异；\n3. 拖动关节运动滑块，观察大臂、肘部在空间扫掠经过的浅绿色干涉区域。")

    # =========================================================================
    # TASK 3-2
    # =========================================================================
    doc.add_page_break()
    p_t32 = doc.add_paragraph()
    style_task_title(p_t32, "任务3-2  六轴机械臂本体、关节轴与低速点动")

    # 一、任务描述
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "一、任务描述")
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在构件喷涂、打磨和螺栓紧固任务中，操作人员经常需要使用示教器把机械臂移动到指定开工点。新手操作员常常面对示教器上的摇杆无所适从：同样是按‘向上移动’，有时机械臂末端笔直向上走，有时整个手腕却打着滚向上扬；如果工具处于倾斜角度，往前按键到底是朝前下方钻进，还是沿着地面水平向前？如果分不清关节坐标、基坐标和工具坐标的基准区别，极易误触按键导致工具硬生生撞在坚硬的构件表面！")
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你深入解构工业标准六轴机械臂本体结构，认清 J1 至 J6 关节轴的具体排布与运动分工，理清‘位置’与‘姿态’的工程界限，并能在关节坐标系、基坐标系与工具坐标系之间进行准确辨析，掌握规范的点动安全确认流程。完成本任务后，你应能用工程理由说明‘为什么点动操作前必须先看清当前坐标系，且试动时切忌只盯工具尖端’。")

    # 二、学习目标
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "二、学习目标")
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.3
    r = p_obj.add_run("知识目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("识记六轴机械臂 J1 至 J6 各轴的大致位置与运动属性，理解‘前三轴定位置、后三轴调姿态’的工程口诀，分清关节坐标、基坐标与工具坐标的参照基准。\n")
    r.font.name = "宋体"
    r = p_obj.add_run("技能目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("能根据动作现象准确反查对应的关节轴号；能根据钻孔进给、垂直提升等工况精准选定点动坐标系；能执行低速点动前的安全核对检查链。")
    r.font.name = "宋体"

    # 三、任务安排
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "三、任务安排")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-2-1 小组任务安排表")
    t_arr = doc.add_table(rows=6, cols=3)
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs: p.runs[0].font.name = "黑体"; p.runs[0].bold = True
    tasks_32 = [
        ("实体分析", "观察六轴机械臂3D模型，逐轴点动J1至J6并记录旋转中心线"),
        ("识读判断", "根据进给轨迹（单轴圆弧还是空间直线），判断当前所处坐标系"),
        ("风险分析", "排查点动时只看末端尖端、忽视肘部大臂扫掠周围的撞击盲区风险"),
        ("场景匹配", "为斜孔钻进、竖向起吊与各关节原点校准选配最佳点动参照系")
    ]
    for idx, (role, desc) in enumerate(tasks_32):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"; row.cells[1].text = f"{role}：{desc}"; row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(4.3); row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs: p.runs[0].font.name = "宋体"; p.runs[0].font.size = Pt(9)

    # 四、任务实施
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "四、任务实施")
    
    p_k1 = doc.add_paragraph()
    style_heading_2(p_k1, "【知识精讲 1】六个关节轴各司其职（J1—J6）")
    p_t1 = doc.add_paragraph()
    style_body_p(p_t1, "六轴机械臂从底座到末端依次串联着 6 个旋转关节（J1到J6）：\n· J1（腰部回转轴）：位于最底座，带动整条手臂做 360° 水平旋转；\n· J2（肩部俯仰轴）：控制粗壮的大臂向前扑出或向后仰起；\n· J3（肘部俯仰轴）：控制小臂向上扬起或向下折合；\n· J4（小臂扭转轴 / 腕部回转）：让手腕连同小臂沿自身纵向轴线扭转；\n· J5（手腕摆动轴）：让工具像人类手腕一样‘点头’或‘抬头’，大幅度改变工具的俯仰夹角；\n· J6（末端法兰旋转轴）：末端圆法兰盘自转，驱动喷枪、夹爪自身旋转。\n行业里通常总结为：‘前三轴（J1-J3）负责把工具送到指定的空间坐标位置，后三轴（J4-J6）负责调整工具朝向对准作业面！’")

    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：请观察图3-2-1中典型六轴机械臂的结构分解图。分析：如果只想让末端法兰盘自转拧紧螺丝，应该动哪个轴？如果底座不动、整个大臂向前下压，又是哪个轴在转动？将结果填入 表3-2-2 中。", indent=False)
    p_q1.runs[0].bold = True
    add_image_placeholder(doc, "图3-2-1 六轴机械臂J1-J6关节分布与运动方向分解图", "各关节轴线与旋转方向")
    add_alert_box(doc, "知识提示", "‘前三轴定位置、后三轴定姿态’是便于入门的口诀，但不是绝对割裂的。当前面的J2、J3大臂动作时，整个手腕连同工具的姿态其实也会跟着发生改变；腕部旋转时，如果工具很长，工具尖端在空间其实也在画大圆弧！", "knowledge")

    p_k2 = doc.add_paragraph()
    style_heading_2(p_k2, "【知识精讲 2】三大点动坐标系：以谁为基准？")
    p_t2 = doc.add_paragraph()
    style_body_p(p_t2, "点动（Jogging）是指按下示教器按键让机械臂微小移动，用于人工对准开工点或录入轨迹。点动有三种核心坐标系可选：\n① 关节坐标系（Joint）：最基础模式。按一下某键，对应的那个关节单独旋转一个角度，其他5个轴全锁死不动。末端工具走出的轨迹必然是一段弧线。\n② 基坐标系（Base）：以机器人底座固定中心为基准（前X、右Y、上Z）。当你在示教器按‘沿Z轴上升’时，六个关节会智能联动，末端工具像乘坐升降机一样走出一根绝对笔直的竖直线！\n③ 工具坐标系（Tool）：以安装在末端的工具（如喷枪、钻头）尖端为基准。不管机械臂扭成什么怪异姿势，只要按‘Tool-Z进给’，钻头就会顺着自身枪膛的轴线直挺挺地向前钻出！")

    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：现场工人师傅要在倾斜 45 度的预制墙面上钻一个垂直于墙面的斜孔。如果要控制钻头慢慢向前推进试打孔，应该选择哪种坐标系进行点动？如果误选了基坐标系的Z轴向下，会发生什么严重后果？", indent=False)
    p_q2.runs[0].bold = True
    add_image_placeholder(doc, "图3-2-2 关节坐标、基坐标与工具坐标运动轨迹差异对比图", "单轴弧线 vs 基座直线 vs 工具轴进给")
    add_alert_box(doc, "安全提示", "【点动操作铁律】：① 严禁在高速或全速模式下手动点动，必须切换到安全低速模式（通常限制在 250 mm/s 以下甚至更低）；② 点动前眼睛必须先扫视机械臂全部关节与周边障碍物；③ 大拇指必须轻按示教器后部的三位使能开关（压紧或全松均会自动紧急刹车！）。", "safety")

    p_conc = doc.add_paragraph()
    style_body_p(p_conc, "小组结论：在手动低速点动示教时，既要确认 ______________，也要观察 ______________，还要时刻准备 ______________。")

    # 五、成果记录
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "五、成果记录")
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-2-2 六轴机械臂关节轴动作对应表")
    t_j = doc.add_table(rows=7, cols=4)
    format_grid_table(t_j, [Inches(1.2), Inches(1.5), Inches(1.8), Inches(2.0)],
                      ["轴号代码", "解剖学类比", "典型运动形式", "带动后方部件范围"],
                      [
                          ["J1 关节", "人体腰部", "整机水平左右 360° 大回转", "带动大臂、小臂、腕部及工具全套结构随动"],
                          ["J2 关节", "人体肩关节", "大臂整体前后俯仰摆动", "带动大臂上方所有连杆与末端在纵深方向大范围摆动"],
                          ["J3 关节", "人体肘关节", "小臂向上抬起或向下弯曲折合", "带动小臂、手腕及工具进行高低俯仰调整"],
                          ["J4 关节", "小臂前臂", "小臂连同手腕沿纵向中心线扭动", "改变后方腕部关节在横滚方向的角度"],
                          ["J5 关节", "人体手腕", "末端工具做大幅度俯仰（点头/仰头）", "大幅改变工具与安装平面的夹角姿态"],
                          ["J6 关节", "末端手指转动", "末端圆形法兰盘自转回转", "仅带动安装在法兰上的夹爪或喷嘴做自转动作"]
                      ])

    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-2-3 三种点动坐标系辨析与作业匹配表")
    t_co = doc.add_table(rows=4, cols=5)
    format_grid_table(t_co, [Inches(1.2), Inches(1.2), Inches(1.4), Inches(1.3), Inches(1.4)],
                      ["坐标系名称", "参照基准原点", "末端运动轨迹特点", "控制关节数量", "最佳工程应用场景"],
                      [
                          ["关节坐标系", "各自关节旋转中心", "每个关节走独立圆弧，整机不是直线", "每次只动 1 个选定轴", "机械臂打包入箱折叠、单轴机械回原点校零"],
                          ["基坐标系", "机械臂固定底座中心", "末端走纯粹空间直线（水平/竖直）", "多轴联动协同插补", "整机大范围水平平移、高空构件垂直下落吊装"],
                          ["工具坐标系", "末端执行器尖端（TCP）", "严格沿当前工具自身的枪管/钻轴直线进退", "多轴复杂联动插补", "倾斜墙面钻孔进给、沿斜向坡口均匀涂胶走线"]
                      ])

    # 六、达标评价
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "六、达标评价")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-2-4 达标评价表")
    t_ev = doc.add_table(rows=5, cols=5)
    format_grid_table(t_ev, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能正确指出J1-J6轴位名称并说明各自在运动中的分工", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能分清关节弧线运动与基坐标/工具坐标直线的区别", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能针对倾斜钻孔等实操场景选定正确的工具坐标系", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "点动安全检查规程完整，排查盲区意识强，操作规范", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "在早期工业机器人的示教操作中，操作员必须手捧笨重的示教盒，一下一下按键点动，录入几百个作业点极其枯燥低效。如今新一代协作机器人正在全面普及‘拖动示教（Direct Teaching）’技术：工人师傅甚至不需要按任何坐标系按键，直接用双手握住机械臂的末端，就像握着徒弟的手一样，在空中自然流畅地演示一遍喷涂或打磨的弧线动作，机械臂内部的高精度力矩传感器就能在毫秒内同步记录下每一个关节的角度变化！这种‘人机共融’的全新交互，极大降低了工人的编程门槛，也让建筑机器人现场换活调试变得像使用普通电动工具一样便捷。")

    # 平台截图
    add_platform_screenshot_box(doc, "图3-2-3 配套平台实训工位：六轴机械臂关节轴解剖与低速点动模拟工坊", 
                                "course/chapters/03/tasks/3-2/index.html", 
                                "1. 三维视图中完整展现工业级六轴机械臂真实运动学网格，支持查看各轴内部旋转线；\n2. 右侧操作面板提供 J1 至 J6 单独关节控制滑块，拖动可观察各段连杆的联动姿态；\n3. 顶部支持一键切换【关节坐标模式】与【工具坐标模式】，直观观察末端运动轨迹指示线。")

    # =========================================================================
    # TASK 3-3
    # =========================================================================
    doc.add_page_break()
    p_t33 = doc.add_paragraph()
    style_task_title(p_t33, "任务3-3  关节驱动、减速器与传动机构")

    # 一、任务描述
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "一、任务描述")
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在施工现场，一根重达上百公斤的厚重机械臂在空中平稳挥舞，末端抓取构件时稳如泰山、停准分毫不差。如果你拆开机械臂的外壳，会惊讶地发现驱动每一个大关节的伺服电机其实只有保温杯那么大，本身的扭矩甚至连一个成年人的胳膊力气都比不上！这小小的电机，到底凭什么能够撬动数百公斤的沉重钢铁手臂？答案就藏在精密而精妙的机械传动核心——‘减速器’与‘伺服闭环回路’之中。")
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你深入机械臂关节内部，理清控制器、伺服驱动器、电机、编码器与减速器的动力与信号流向，理解减速器‘降速增扭、功率守恒’的物理定律，辨识机器人两大看家法宝‘谐波减速器’与‘RV减速器’的结构差异，并掌握滚珠丝杠、齿轮齿条等直线转换机构的选型逻辑。完成本任务后，你应能用工程理由说明‘为什么机械臂大关节必用RV减速器，而手腕关节常用谐波减速器’。")

    # 二、学习目标
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "二、学习目标")
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.3
    r = p_obj.add_run("知识目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("说清伺服闭环系统中‘控制器-驱动器-电机-编码器’的作用；掌握减速比对转速和扭矩的变换公式；识记谐波减速器三大件与RV减速器的结构优缺点。\n")
    r.font.name = "宋体"
    r = p_obj.add_run("技能目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("能绘制关节驱动伺服系统的动力流与反馈流；能根据输入转速与减速比计算输出端转速与理论扭矩；能根据重载抗冲击与轻量灵活性要求为关节合理选配减速器。")
    r.font.name = "宋体"

    # 三、任务安排
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "三、任务安排")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-3-1 小组任务安排表")
    t_arr = doc.add_table(rows=6, cols=3)
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs: p.runs[0].font.name = "黑体"; p.runs[0].bold = True
    tasks_33 = [
        ("实体分析", "观察减速器3D剖视图，找到谐波的波发生器/柔轮/刚轮及RV的摆线轮"),
        ("识读判断", "根据传动原理计算输出轴减速比，分辨力矩倍增与速度衰减关系"),
        ("风险分析", "分析谐波减速器柔轮金属疲劳断裂，以及重载关节选错轻量减速器的风险"),
        ("场景匹配", "为重载腰肩关节、末端小手腕及升降地轨匹配最佳传动部件")
    ]
    for idx, (role, desc) in enumerate(tasks_33):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"; row.cells[1].text = f"{role}：{desc}"; row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(4.3); row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs: p.runs[0].font.name = "宋体"; p.runs[0].font.size = Pt(9)

    # 四、任务实施
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "四、任务实施")
    
    p_k1 = doc.add_paragraph()
    style_heading_2(p_k1, "【知识精讲 1】关节伺服闭环回路：动力与反馈")
    p_t1 = doc.add_paragraph()
    style_body_p(p_t1, "机器人关节绝对不是一个孤零零的普通马达，而是一个高度精密的伺服闭环系统。它包含四大核心部件：\n· ① 运动控制器：相当于指挥部，计算每个轴应该转到多少度，向驱动器下达运动脉冲；\n· ② 伺服驱动器：相当于功率调节放大器，根据指令和实际反馈，精确控制通向电机的电流和电压；\n· ③ 交流伺服电机：能量转换者，把电能变成高转速旋转机械能；\n· ④ 高精度光电/磁编码器：相当于神经感受器，装在电机尾部，实时测量电机轴每转一小圈的角度，并将信号飞速送回驱动器比对偏差。\n【动力流向】：控制器指令 ➔ 驱动器功率输出 ➔ 电机高速转动 ➔ 减速器降速增扭 ➔ 关节运转。\n【反馈流向】：编码器测量转角 ➔ 信号回传驱动器/控制器 ➔ 实时比对修正。")

    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：请对照图3-3-1的闭环系统示意图，回答：如果工人在安装电机时把尾部的编码器线插头碰松了，电机会发生什么现象？为什么？将结论填入 表3-3-2 中。", indent=False)
    p_q1.runs[0].bold = True
    add_image_placeholder(doc, "图3-3-1 机器人伺服关节动力传递流与编码器反馈闭环图", "动力链 vs 反馈链")
    add_alert_box(doc, "知识提示", "编码器如果丢失反馈信号，驱动器无法知道电机到底转了没有，就会误以为‘转速不够’而拼命加大输出电流，导致电机瞬间发生‘飞车冲撞’或立刻报‘反馈丢失过流故障’停机保护！", "knowledge")

    p_k2 = doc.add_paragraph()
    style_heading_2(p_k2, "【知识精讲 2】两大工业机器人核心减速器：谐波 vs RV")
    p_t2 = doc.add_paragraph()
    style_body_p(p_t2, "伺服电机转速极高（通常为 3000 rpm），但输出力矩很小（只有几牛·米），根本直接拉不动重型机械臂。减速器的任务就是‘牺牲速度换取巨大的扭矩’！\n公式规律：若减速比为 $i = 100:1$，输出转速就衰减为输入的 $1/100$，而输出扭矩理论上就会放大近 100 倍！\n工业机械臂有两大看家减速器：\n· 谐波减速器（Harmonic）：核心有三件套——椭圆形的‘波发生器’、薄壁带外齿的‘柔轮’（金属弹性杯）、内齿圆环‘刚轮’。它的巧妙之处在于利用金属柔轮的受控弹性变形产生几条齿轮啮合，体积小、重量轻、回程间隙极小，但柔轮较薄不耐强冲击，最适合装在轻巧的机械臂手腕关节（J4、J5、J6）；\n· RV 减速器（Rotate Vector）：结合了渐开线行星齿轮和摆线针轮两级传动。内部采用坚硬的摆线轮多齿同时咬合，刚性超强、耐冲击、寿命极长，但自重大、体积稍大，广泛装在承受整臂重力矩的底座腰部和肩肘重载大关节（J1、J2、J3）。")

    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：某喷涂机器人的 J1 底座回转关节承受高达 1200 N·m 的大冲击力矩，而 J6 末端法兰旋转关节只需要带动轻型喷枪（力矩仅 15 N·m）。请问 J1 和 J6 应该分别选用哪种减速器？理由是什么？记录在 表3-3-3 中。", indent=False)
    p_q2.runs[0].bold = True
    add_image_placeholder(doc, "图3-3-2 谐波减速器（柔轮变形）与RV减速器（摆线针轮）内部结构剖视图", "波发生器/柔轮/刚轮 vs 行星齿轮/摆线轮")
    add_alert_box(doc, "操作提醒", "计算输出转速时：$n_{out} = n_{in} / i$；计算输出力矩时：$T_{out} = T_{in} \\times i \\times \\eta$（$\\eta$ 为机械传动效率，通常在 70%—85% 之间）。减速器绝不会凭空增加输出功率！", "operation")

    p_conc = doc.add_paragraph()
    style_body_p(p_conc, "小组结论：为机械臂关节选配减速器时，既要看 ______________，也要看 ______________，还要兼顾 ______________。")

    # 五、成果记录
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "五、成果记录")
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-3-2 伺服驱动系统关键部件职能表")
    t_s = doc.add_table(rows=5, cols=4)
    format_grid_table(t_s, [Inches(1.3), Inches(1.8), Inches(1.6), Inches(1.8)],
                      ["部件名称", "在动力链中的角色", "在控制回路中的角色", "常见异常及后果"],
                      [
                          ["主控制器", "系统指挥中枢，生成空间轨迹路径", "发出位置指令脉冲", "程序死机导致整个机械臂急停自锁"],
                          ["伺服驱动器", "功率放大驱动，调制输出强电电流", "接收编码器反馈比对误差调节输出", "参数整定不良导致机械臂剧烈抖动震颤"],
                          ["伺服电机", "将电能高速转化为机械旋转力矩", "执行被控动作，输出动力源", "线圈过载过热烧毁，轴承磨损异响"],
                          ["光电编码器", "不直接输出动力，同轴安装在电机后部", "实时测量电机转角转速送回驱动器", "码盘被灰尘油污污染导致反馈丢失飞车报警"]
                      ])

    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-3-3 谐波减速器与RV减速器全方位对比表")
    t_rv = doc.add_table(rows=7, cols=3)
    format_grid_table(t_rv, [Inches(1.5), Inches(2.5), Inches(2.5)],
                      ["对比特性", "谐波减速器（Harmonic）", "RV减速器（摆线针轮）"],
                      [
                          ["核心传动构件", "波发生器（椭圆）、柔轮（弹性外齿杯）、刚轮", "渐开线行星齿轮第一级 + 摆线针轮第二级"],
                          ["传动工作原理", "依靠金属柔轮在椭圆轴承迫使下的弹性受控变形啮合", "依靠双摆线轮转动时针齿啮合实现多齿差减速"],
                          ["体积与自身重量", "结构紧凑，超轻量化，单件常不足 1～3 kg", "体积较大，刚性金属铸铁外壳，自重较重"],
                          ["抗冲击与承载能力", "柔轮杯壁极薄，过载冲击易崩齿或疲劳断裂", "多齿同时咬合分担载荷，抗过载冲击能力极强"],
                          ["回程传动精度", "背隙极小，重复定位精度极高", "刚度极大，在大负载重压下弹性形变极小"],
                          ["机械臂上推荐安装部位", "常安装在小臂前端及手腕部关节（J4、J5、J6）", "必选安装在底座回转台与肩肘重载大关节（J1、J2、J3）"]
                      ])

    # 六、达标评价
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "六、达标评价")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-3-4 达标评价表")
    t_ev = doc.add_table(rows=5, cols=5)
    format_grid_table(t_ev, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能清晰绘制伺服回路闭环流向并说出编码器作用", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能准确计算减速比下的输出速度并理解扭矩放大机理", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能针对大冲击与轻量化要求合理选配RV与谐波减速器", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "公式计算准确无误，对比表格填写整洁，讨论积极", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "高精度减速器曾被誉为工业机器人皇冠上的明珠，长期依赖国外进口，单台减速器成本曾占据机器人整机造价的 30% 以上。近年来，我国在纳米级数控磨齿机、特殊超韧合金材料以及摆线齿形热处理工艺上实现了系统性突破，国产绿色谐波、双环传动等本土品牌在机器人产业链中实现大规模替代。这不仅让国产建筑机器人的制造成本大幅下探，更保障了我国智能建造核心底层工业装备的供应链自主可控！掌握机械传动精度的底层原理，正是我们高职学生走向大国工匠的必经之路。")

    # 平台截图
    add_platform_screenshot_box(doc, "图3-3-3 配套平台实训工位：减速器传动实验室与运动转换工坊", 
                                "course/chapters/03/tasks/3-3/index.html (含 reducers.html 与 conversion.html)", 
                                "1. 打开【减速器实验室】：3D剖视谐波减速器椭圆波发生器如何迫使柔轮变形，并观察RV摆线齿针咬合过程；\n2. 打开【运动转换实验室】：调节旋转驱动转速，观察滚珠丝杠与曲柄滑块机构如何精准转换出往复直线位移；\n3. 界面动态实时显示电机输入转速（rpm）与减速器输出扭矩（N·m）的比对读数。")

    # =========================================================================
    # TASK 3-4
    # =========================================================================
    doc.add_page_break()
    p_t34 = doc.add_paragraph()
    style_task_title(p_t34, "任务3-4  末端执行器、TCP与工具控制")

    # 一、任务描述
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "一、任务描述")
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在施工现场，同一台六轴机器人上午安装吸盘搬运预制瓷砖，下午换上喷枪喷涂外墙涂料，傍晚还要换装高转速砂轮进行墙面打磨。机械臂本体并没有更换，但真正干活的‘手掌与手指’（末端执行器）却一直在变。机器人控制器是怎么知道‘现在新工具装上了没有’？又是怎么知道‘新工具最前面的工作点到底在哪里’？如果技术人员换上长喷枪后，没有在系统里更新工具参数，机器人就会把原来短吸盘的位置当做喷枪尖端，一转弯喷枪就可能狠狠撞碎在墙体上！")
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你从真实施工工具出发，辨识喷枪、夹爪、吸盘等末端执行器的真实工作点，熟悉自动工具快换装置（ATC）的工作逻辑，透彻理解 TCP（工具中心点）与位置偏置的核心概念，并掌握经典的‘四点标定法’测量原理。完成本任务后，你应能用工程理由说明‘为什么更换工具后必须严格重新确认TCP，否则机器人在旋转姿态时就会发生偏心甩动’。")

    # 二、学习目标
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "二、学习目标")
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.3
    r = p_obj.add_run("知识目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("说出喷枪、夹砖器、吸盘与打磨盘的真实工作点位置；了解工具快换装置的机械自锁与电气确认过程；理解 TCP、法兰原点与空间偏置坐标的关系。\n")
    r.font.name = "宋体"
    r = p_obj.add_run("技能目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("能为不同作业工具标定合适的工作点；能说明四点标定法‘不同姿态对准同一参考尖端’的求解机理；能在三维模拟工位中采集标定数据并完成换姿态复核。")
    r.font.name = "宋体"

    # 三、任务安排
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "三、任务安排")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-4-1 小组任务安排表")
    t_arr = doc.add_table(rows=6, cols=3)
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs: p.runs[0].font.name = "黑体"; p.runs[0].bold = True
    tasks_34 = [
        ("实体分析", "观察喷枪、真空吸盘、夹砖爪及打磨盘，找出真正发挥作业作用的物理接触点"),
        ("识读判断", "比对法兰中心原点与工具TCP的几何相对偏移（X、Y、Z偏置值）"),
        ("风险分析", "分析沿用旧工具TCP参数导致手腕旋转时末端圆弧甩动碰撞的严重风险"),
        ("场景匹配", "运用四点标定法在三维模拟工位中完成虚拟探针接触与姿态复核")
    ]
    for idx, (role, desc) in enumerate(tasks_34):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"; row.cells[1].text = f"{role}：{desc}"; row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(4.3); row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs: p.runs[0].font.name = "宋体"; p.runs[0].font.size = Pt(9)

    # 四、任务实施
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "四、任务实施")
    
    p_k1 = doc.add_paragraph()
    style_heading_2(p_k1, "【知识精讲 1】末端执行器的真实工作点")
    p_t1 = doc.add_paragraph()
    style_body_p(p_t1, "六轴机械臂的第六轴末端是一个光滑平整的圆形金属盘，称为‘末端法兰’。法兰盘本身无法直接干活，必须通过螺栓或快换装置装上专用工具（末端执行器）。不同施工工具的真实工作点位置截然不同：\n· 喷漆喷枪：真实工作点在【喷嘴出漆口前方中心】（涂料雾化焦点）；\n· 砌砖夹具：真实工作点在【双指闭合的夹持中心平面】；\n· 真空吸盘：真实工作点在【橡胶吸盘组与瓷砖贴合的底表面中心】；\n· 钢筋绑扎机：真实工作点在【扎丝旋转拧绞的导丝槽出口】；\n· 墙面打磨机：真实工作点在【旋转砂纸与墙面摩擦接触面的几何中心】。\n关键结论：真实工作点是根据施工工艺需求人为定义的，它不一定是工具外壳的几何中心，甚至可能是悬在空中的某个虚拟点！")

    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：请观察图3-4-1中展示的四类建筑施工末端执行器。如果我们将机械臂末端的喷枪换成了一个长达 30 厘米的加长型钻头，机器人系统里的参考点还停留在原来的法兰盘中心，当机器人旋转手腕试图微调钻孔角度时，钻头尖端会发生什么运动？填入 表3-4-2 中。", indent=False)
    p_q1.runs[0].bold = True
    add_image_placeholder(doc, "图3-4-1 典型建筑机器人末端执行器及其真实工作点位置标注图", "喷嘴中心/夹持中心/吸附平面")
    add_alert_box(doc, "知识提示", "【什么是TCP？】：TCP即工具中心点（Tool Center Point）。在机器人的数学大脑中，系统默认以为‘工具尖端就在第六轴法兰盘中心’。标定TCP的目的，就是告诉机器人：‘工具尖端沿着法兰坐标系向前延伸了多少毫米（Z偏置）、向左向右偏了多少毫米（X、Y偏置）’！", "knowledge")

    p_k2 = doc.add_paragraph()
    style_heading_2(p_k2, "【知识精讲 2】神奇的‘四点标定法’原理")
    p_t2 = doc.add_paragraph()
    style_body_p(p_t2, "工具做好了，怎么测出精确的偏置值？工人不可能拿一把普通卷尺去爬在机械臂上量，最经典实用的就是‘四点法’：\n在桌面上固定一根带有尖锐针尖的固定基准点。操作员通过手动点动，控制机械臂变换 4 种截然不同的大角度姿态（比如一次直立朝下，一次大幅度前倾，一次向左倾斜，一次向右倾斜），每一次都极其精准地让新工具的尖端‘针尖对针尖’紧密触碰这个固定点！\n【数学奇迹】：在空间中，工具尖端绕着同一个固定不动的心点转动了 4 次。控制器根据法兰盘中心在这 4 个姿态下的空间坐标，利用空间四点共球面的几何相交方程，瞬间反算出唯一的球心偏置量——这就是极其精准的 TCP 坐标！标定成功后，哪怕机械臂手腕怎么翻滚跳舞，工具尖端都会像钉死在空中一样定点转动！")

    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：为什么四点标定法严格要求机械臂必须采用‘大幅度不同的姿态’来触碰针尖？如果操作人员偷懒，4 次都用几乎平行的姿态去对准针尖，算出的 TCP 会产生什么问题？将分析记录在 表3-4-3 中。", indent=False)
    p_q2.runs[0].bold = True
    add_image_placeholder(doc, "图3-4-2 四点标定法不同姿态触碰固定基准尖端示意图", "4个大姿态求解唯一球心")
    add_alert_box(doc, "操作提醒", "完成四点标定后必须进行‘换姿态复核’：让工具尖端对准参考点，切换为【工具坐标系】旋转手腕各轴，肉眼仔细观察尖端是否发生偏移晃动。若尖端发生肉眼可见的画圈晃荡（漂移误差超标），必须废除结果重新标定！", "operation")

    p_conc = doc.add_paragraph()
    style_body_p(p_conc, "小组结论：在为末端工具完成快换与标定后，既要核实 ______________，也要校对 ______________，还要进行 ______________。")

    # 五、成果记录
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "五、成果记录")
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-4-2 常见末端执行器真实工作点与工艺动作表")
    t_tcp = doc.add_table(rows=6, cols=4)
    format_grid_table(t_tcp, [Inches(1.3), Inches(1.8), Inches(1.6), Inches(1.8)],
                      ["末端执行器", "具体施工任务", "真实工作点定义位置", "沿用错误TCP带来的施工事故"],
                      [
                          ["墙面喷涂喷枪", "乳胶漆/真石漆均匀喷涂", "喷嘴喷孔前方雾化交汇中心", "喷距计算失真，出现涂层严重流坠或喷枪刮碰墙面"],
                          ["砌块夹砖器", "轻质砌块夹取与砂浆摆砖", "双夹板内侧夹持中心平面", "夹持偏移导致重心失稳脱落，或放砖时偏心卡死"],
                          ["真空吸盘组", "大理石薄板/玻璃幕墙搬运", "吸盘橡胶唇边贴合平面的几何中心", "吸附受力不均导致板材边缘局部应力集中碎裂"],
                          ["打磨砂轮机", "混凝土剪力墙面瑕疵打磨", "高速旋转砂纸磨盘接触面圆心", "下压法向接触力失控，墙面被打出深凹坑或磨盘崩碎"],
                          ["自动绑扎机", "楼板钢筋交叉节点扎丝绑扎", "导丝钩导槽出口与旋转扭扎轴心", "扎丝无法精准套中钢筋交叉点，造成频繁卡丝停机"]
                      ])

    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-4-3 四点标定法操作规程与质量自检记录表")
    t_cal = doc.add_table(rows=5, cols=4)
    format_grid_table(t_cal, [Inches(1.4), Inches(2.0), Inches(1.4), Inches(1.7)],
                      ["标定步骤", "标准操作规程要点", "自检通过标准", "常见失误与规避措施"],
                      [
                          ["步骤1：基准尖端架设", "在机械臂可达范围内牢固固定尖锐探针", "探针基座无晃动松动", "切忌用软铁丝，探针碰弯会导致全盘皆错"],
                          ["步骤2：四姿态精准触碰", "分别从俯角、大仰角、左侧倾、右侧倾四种互差>30°的姿态使工具尖对准针尖", "每次均在低速微动下轻碰尖端，误差<0.5mm", "严禁四次姿态过于接近，否则球面相交方程求解发散"],
                          ["步骤3：系统求解偏置", "示教器点击Calculate计算偏置XYZ", "系统报告误差残差在容差范围内", "若残差超限，系统会弹窗报警拒绝对话"],
                          ["步骤4：工具自转复核", "以新工具TCP为中心，在示教器上旋转姿态", "工具尖端在原地不动，旋转晃动量<1.0mm", "若尖端画大圆弧甩动，必须清空数据彻底重做"]
                      ])

    # 六、达标评价
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "六、达标评价")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-4-4 达标评价表")
    t_ev = doc.add_table(rows=5, cols=5)
    format_grid_table(t_ev, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能准确找出各类末端执行器的真实工作点并阐明理由", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能透彻说明四点标定原理与姿态发散对精度的影响", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能正确演练换工具后调用参数及换姿态复核全流程", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "标定记录表填写规范，安全规程严密，分析逻辑自洽", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "在未来的多工种复合型施工机器人中，末端执行器正在经历从‘专用工具’向‘多能灵巧手’的革命性飞跃。传统工具更换必须依赖工具快换架，换一次工具至少耗费两三分钟；而结合了高频微振动力控传感器与自适应仿生柔性指爪的新型末端执行器，既能轻柔地捧起一块易碎的薄瓷砖，又能瞬间加大握力紧紧夹起数十公斤重的混凝土预制构件，甚至还能无缝握持普通工人的电钻进行施工。‘一爪多能、柔性感知’正在成为末端工具研发的最前沿方向，这极大地拓展了建筑机器人在非结构化复杂现场的通用生存能力。")

    # 平台截图
    add_platform_screenshot_box(doc, "图3-4-3 配套平台实训工位：末端执行器展台与TCP四点标定虚拟仿真", 
                                "course/chapters/03/tasks/3-4/index.html", 
                                "1. 三维展台支持快速装配并切换【高压喷枪】、【真空吸盘】与【夹砖机械爪】；\n2. 虚拟四点标定工作台提供空间基准探针，学生可通过手柄调整机械臂姿态实现虚拟对针；\n3. 系统提供【换姿态旋转复核】动画演示，直观对比标定前（甩动）与标定后（定点自转）的惊人差别。")

    # =========================================================================
    # TASK 3-5
    # =========================================================================
    doc.add_page_break()
    p_t35 = doc.add_paragraph()
    style_task_title(p_t35, "任务3-5  移动底盘与行走机构")

    # 一、任务描述
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "一、任务描述")
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在施工现场，各种建筑机器人的‘下盘功夫’各显神通：有的像巡逻小车在光滑平整的混凝土地坪上飞快穿梭；有的披着厚重履带在满是碎石泥浆的基坑边坡上稳步爬行；还有的像机器狗一样迈开四条仿生机械腿轻松翻过门槛、跨上楼梯；在钢制储罐与高耸塔吊上，甚至还能见到紧紧吸附在立面上垂直行走的‘蜘蛛人爬壁机器人’。同样是在工地上移动，为什么不同机型会选用完全不同的行走底盘？进入狭小的室内楼道后，面对直角墙角，为什么有的机器人可以潇洒地原地掉头，有的却会被硬生生卡在走廊拐角？")
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你全面认识轮式、履带式、足式、轨道式及爬壁式等五大典型行走方式，深入剖析双轮差速转向、车轮偏转式阿克曼转向与麦克纳姆轮全向移动的运动机理，并能针对建筑施工现场的门洞宽度、地面粗糙度及障碍通过性等实际约束进行科学选型。完成本任务后，你应能用工程理由说明‘为什么室内巡检设备必选差速或全向底盘，而室外土方环境必选履带底盘’。")

    # 二、学习目标
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "二、学习目标")
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.line_spacing = 1.3
    r = p_obj.add_run("知识目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("认识轮式、履带式、足式、轨道式与爬壁式的结构特征与地面适应性；理解双轮差速机构通过转速差实现直行、转弯与原地自转的数学逻辑；了解麦克纳姆轮 45° 滚子全向移动原理。\n")
    r.font.name = "宋体"
    r = p_obj.add_run("技能目标：")
    r.bold = True
    r.font.name = "黑体"
    r = p_obj.add_run("能根据左右车轮的速度与方向准确推演机身运动状态；能准确区分‘车头变向的原地自转’与‘车头不变向的原地横移’；能根据门槛高度、楼道净宽等现场工况做出合理的底盘选型与通行核对。")
    r.font.name = "宋体"

    # 三、任务安排
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "三、任务安排")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-5-1 小组任务安排表")
    t_arr = doc.add_table(rows=6, cols=3)
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs: p.runs[0].font.name = "黑体"; p.runs[0].bold = True
    tasks_35 = [
        ("实体分析", "观察轮式、履带与足式底盘模型，对比地面接触形式与越障能力"),
        ("识读判断", "根据左右轮电机的正转/反转/差速组合，推演机器人运动轨迹"),
        ("风险分析", "分析普通汽车转向在狭小楼道转角转不过弯被卡死的通行空间风险"),
        ("场景匹配", "为室内光滑地坪巡检、复杂楼梯巡检与基坑软泥作业匹配合适底盘")
    ]
    for idx, (role, desc) in enumerate(tasks_35):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"; row.cells[1].text = f"{role}：{desc}"; row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2); row.cells[1].width = Inches(4.3); row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=70, bottom=70, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs: p.runs[0].font.name = "宋体"; p.runs[0].font.size = Pt(9)

    # 四、任务实施
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "四、任务实施")
    
    p_k1 = doc.add_paragraph()
    style_heading_2(p_k1, "【知识精讲 1】机器人五大典型行走方式大擂台")
    p_t1 = doc.add_paragraph()
    style_body_p(p_t1, "建筑工地地面极其多样，直接决定了移动底盘的类型选择：\n· 轮式行走：依靠车轮连续滚动。在已浇筑硬化的混凝土地坪上速度最快、结构最轻、效率最高，但在松软沙土中极易打滑陷车；\n· 履带式行走：依靠闭合履带与地面大面积接触。接地比压极低（分散车重），在松软湿烂泥地、砂石坑洼及斜坡上通过性天下第一，但转向时对地表有撕裂剪切，且履带自重沉重；\n· 足式行走（机器狗/双足）：通过多条机械腿交替迈步。最大优势是‘点接触，能选落脚点’，能轻松跨越电缆、门槛和爬上陡峭楼梯，但控制算法极其复杂、电池续航较短、负载有限；\n· 轨道式行走：沿着地面预埋钢轨做直线往返移动。定位极其精准、承载刚度极大，但灵活性最差，无法脱离铁轨；\n· 爬壁行走：结合负压吸附（抽真空）或强磁吸附（针对钢板），配合微型轮履机构在立面行走，专用于外立面高空清洗与大型储罐探伤。")

    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：请观察图3-5-1中的常见底盘结构图。如果要在某未竣工楼栋进行夜间安全巡检，沿途需要跨过两道 15 厘米高的室内门槛并爬上三层楼梯，应该选用轮式小车还是四足机器狗？为什么？记录在 表3-5-2 中。", indent=False)
    p_q1.runs[0].bold = True
    add_image_placeholder(doc, "图3-5-1 轮式、履带式、四足仿生与导轨行走机构对比图", "地面接触方式与通过性示意")
    add_alert_box(doc, "知识提示", "不要神化足式机器人的能力！虽然宣传视频里机器狗能爬楼梯，但在真实工地上，如果台阶表面散落着大量滚动的钢筋头或湿滑机油，机器狗脚底传感器极易发生误判打滑摔倒。选型必须查看现场实际路况！", "knowledge")

    p_k2 = doc.add_paragraph()
    style_heading_2(p_k2, "【知识精讲 2】怎样实现原地转弯与横向平移？")
    p_t2 = doc.add_paragraph()
    style_body_p(p_t2, "工地狭窄走廊里最怕‘转不过弯’！移动机器人有三种主流转向机理：\n① 双轮差速转向（最普及）：左轮和右轮由两个独立电机驱动。两轮向前同速 $\\rightarrow$ 直行；右轮转得快、左轮转得慢 $\\rightarrow$ 向左小转弯；【绝技】：若左轮倒转、右轮正转（速度大小相等、方向相反），小车就会绕着两轮连线中心【原地 360° 旋转自转】！转弯半径为零，非常适合狭窄转角调头！\n② 汽车式阿克曼转向：依靠车舵机扳动前轮偏转角度。转弯时车身必须走一条大弧线，转弯半径大，无法实现原地掉头，狭窄通道极易被别死；\n③ 麦克纳姆轮（Mecanum，全向轮）：轮子外圈镶嵌有一圈带有 45° 倾角的可自由旋转的倾斜小滚子。四个麦轮独立控制正反转时，滚子的斜向摩擦分力相互抵消或叠加，神奇的现象发生了——车头朝向纹丝不动，小车却能像螃蟹一样【原地直接向左、向右横向平移】！这对于靠墙打磨、喷涂机器人的微调对齐而言是无与伦比的神器！")

    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：请根据 表3-5-3 中的左右轮运动组合，分析一台典型的差速底盘小车在各工况下的真实运动轨迹。并思考：‘原地自转’与‘原地横移’在本质上有何区别？", indent=False)
    p_q2.runs[0].bold = True
    add_image_placeholder(doc, "图3-5-2 双轮差速原地自转与麦克纳姆轮全向横移运动矢量分解图", "速度矢量抵消与全向移动")
    add_alert_box(doc, "操作提醒", "差速原地自转虽然转弯半径为零，但车体本身是个长方形，旋转时四角会画出一个外接圆！在狭窄通道中调头前，必须确认外接圆扫掠范围内没有任何管道立柱，否则车尾会发生横向剐蹭！", "operation")

    p_conc = doc.add_paragraph()
    style_body_p(p_conc, "小组结论：为室内建筑机器人选配移动底盘时，既要看 ______________，也要看 ______________，还要核算 ______________。")

    # 五、成果记录
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "五、成果记录")
    
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-5-2 机器人常见行走方式特性综合比对表")
    t_w = doc.add_table(rows=6, cols=5)
    format_grid_table(t_w, [Inches(1.2), Inches(1.3), Inches(1.3), Inches(1.3), Inches(1.4)],
                      ["行走方式", "地面接触形式", "对地面平整度要求", "转弯与灵活性", "典型施工适用工况"],
                      [
                          ["轮式底盘", "橡胶/聚氨酯轮滚动接触", "要求较高，适合坚实平整地坪", "双轮差速可零半径原地自转", "地坪激光整平机、室内巡检测绘小车"],
                          ["履带式底盘", "闭合履带大面积板带接触", "适应极高，坑洼软泥通吃", "两侧履带差速自转，但剪切地表", "土方挖掘打桩机、深基坑作业机器人"],
                          ["四足仿生底盘", "四点离散点状触地", "能适应起伏路面与碎石堆", "步态转向灵活，可上下台阶", "未安装电梯的多层楼栋巡检、狭小管廊"],
                          ["轨道导轨式", "刚性轮与预埋钢轨卡合", "完全依赖轨道铺设平直度", "沿刚性轨道做固定往复直线行走", "墙面成套移动喷涂桁架、预制构件流水线"],
                          ["爬壁吸附式", "负压真空吸盘或强磁吸附", "要求表面平整密闭或导磁", "微型轮履附着转向，带防坠索", "钢结构立柱除锈探伤、玻璃幕墙清洗机器人"]
                      ])

    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-5-3 双轮差速行走机构运动推演矩阵表")
    t_diff = doc.add_table(rows=6, cols=4)
    format_grid_table(t_diff, [Inches(1.5), Inches(1.5), Inches(1.7), Inches(1.8)],
                      ["左驱动轮运动状态", "右驱动轮运动状态", "机器人车体推演运动行为", "工程现场典型动作意义"],
                      [
                          ["向前，100 rpm", "向前，100 rpm", "保持航向，笔直向前匀速直线行驶", "走廊通道内常规直行巡航作业"],
                          ["向前，60 rpm", "向前，120 rpm", "车头平滑向左侧偏转划弧前进", "跟随走廊弯曲弧度平缓修正航向"],
                          ["向前，120 rpm", "向前，60 rpm", "车头平滑向右侧偏转划弧前进", "向右偏航微调对准作业墙面"],
                          ["向后倒转，100 rpm", "向前正转，100 rpm", "以两轮轴线中点为圆心，向左原地自转", "直角墙角狭窄空间零半径极速掉头调向"],
                          ["向前正转，100 rpm", "向后倒转，100 rpm", "以两轮轴线中点为圆心，向右原地自转", "反向极速原地自转对位"]
                      ])

    # 六、达标评价
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "六、达标评价")
    p_t = doc.add_paragraph()
    style_table_title(p_t, "表3-5-4 达标评价表")
    t_ev = doc.add_table(rows=5, cols=5)
    format_grid_table(t_ev, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能正确区分轮式、履带、足式与爬壁的物理接触特征", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能熟练根据左右轮差速推演小车直行、转弯与自转轨迹", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能针对室内狭小门洞与室外泥泞环境匹配正确底盘", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "全向移动原理理解透彻，矩阵推演正确，核对项齐全", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec = doc.add_paragraph()
    style_heading_1(p_sec, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "轮式、履带与足式并不是水火不容的绝立对立面。在最新型的特种建筑机器人中，工程师们创造性地发明了‘轮足复合式机器人（Wheel-Leg Hybrid）’：在四条机械腿的脚腕最下端，额外安装了一个高速无刷轮毂电机！当处于平整光滑的地坪上时，四条腿锁死姿态，底部的车轮飞速滚动，兼具轮式底盘的高速节能优势；而一旦遇到台阶、深坑或乱石堆，车轮立刻抱闸锁死变成防滑橡胶脚爪，机器人瞬间‘站立’起来迈步跨越障碍！这种打破单一构型思维的复合创新，正是智能建造装备不断攻克复杂极端现场的未来密码。")

    # 平台截图
    add_platform_screenshot_box(doc, "图3-5-3 配套平台实训工位：移动底盘动力学与差速运动仿真展台", 
                                "course/chapters/03/tasks/3-5/index.html", 
                                "1. 三维展台完整展示双轮差速底盘、履带总成与麦克纳姆轮机构的微观网格；\n2. 差速试验台提供【左右轮独立转速滑杆】，调节可实时生成小车在虚拟地坪上的运动轨迹线；\n3. 麦克纳姆轮工位支持一键体验【纯横向侧移】与【原地打转】，直观展示轮缘45°小滚子的受力分解。")

    # Save
    out_docx = Path("docs/第三章教材与实训任务页.docx")
    out_docx.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_docx))
    
    pkg_docx = Path("artifacts/packages/第三章教材与实训任务页.docx")
    pkg_docx.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(pkg_docx))
    
    print(f"Generated Chapter 3: {out_docx} and {pkg_docx}")

if __name__ == "__main__":
    build_chapter_3()
