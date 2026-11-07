# -*- coding: utf-8 -*-
"""Generate Word (.docx) task pages adhering strictly to '第二章任务页_任务一风格规范参考稿'."""

import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from pathlib import Path

def set_cell_background(cell, color_hex):
    """Set background color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    """Set inner padding for a table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
    """Set light subtle borders for the entire table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/><w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def set_alert_box_border(table, color="D9534F"):
    """Set border for single-cell alert block."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="8" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="8" w:space="0" w:color="{color}"/><w:left w:val="single" w:sz="24" w:space="0" w:color="{color}"/><w:right w:val="single" w:sz="8" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def add_alert_box(doc, tag, text, alert_type="knowledge"):
    """
    Types:
    safety: light red (#FDE8E8, border #E53E3E)
    operation: light yellow (#FFFBEA, border #D69E2E)
    resource: light blue (#EBF8FF, border #3182CE)
    knowledge: light green (#F0FFF4, border #38A169)
    record: light gray (#F7FAFC, border #718096)
    """
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

def add_image_placeholder(doc, caption):
    """Add standard textbook image placeholder."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "F8F9FA")
    set_table_borders(tbl, color="CBD5E0", sz="4", val="dashed")
    set_cell_margins(cell, top=300, bottom=300, left=200, right=200)
    
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(f"[ 图片位置：{caption} 现场配图 / 网页截图 ]")
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

def style_heading_1(p, text):
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    r.bold = True
    r.font.name = "黑体"
    r.font.size = Pt(13)
    r.font.color.rgb = RGBColor(30, 64, 175) # Navy blue

def style_body_p(p, text, indent=True):
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(6)
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
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(30, 41, 59)

def format_grid_table(table, col_widths, headers, rows):
    set_table_borders(table, color="CBD5E0", sz="4")
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Headers
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "EDF2F7")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=140, right=140)
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
            set_cell_margins(row_cells[c_idx], top=80, bottom=80, left=120, right=120)
            p = row_cells[c_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if c_idx == 0 or "□" in val else WD_ALIGN_PARAGRAPH.LEFT
            if p.runs:
                p.runs[0].font.name = "宋体"
                p.runs[0].font.size = Pt(9.5)
                p.runs[0].font.color.rgb = RGBColor(51, 65, 85)
                
    # set widths
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

def build_document():
    doc = docx.Document()
    
    # Page setup
    sections = doc.sections
    for section in sections:
        section.top_margin = Cm(2.2)
        section.bottom_margin = Cm(2.2)
        section.left_margin = Cm(2.4)
        section.right_margin = Cm(2.4)
        section.different_first_page_header_footer = False
        
        # Header / Footer
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("《智能建筑机械与机器人》学生实训任务页")
        hrun.font.name = "宋体"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(148, 163, 184)
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("— 任务实训页 —")
        frun.font.name = "宋体"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(148, 163, 184)

    # -------------------------------------------------------------
    # TASK 1-2
    # -------------------------------------------------------------
    p_task_title = doc.add_paragraph()
    p_task_title.paragraph_format.space_before = Pt(6)
    p_task_title.paragraph_format.space_after = Pt(12)
    r_task_title = p_task_title.add_run("任务1-2  施工机械工作装置识读与施工风险判断")
    r_task_title.bold = True
    r_task_title.font.name = "黑体"
    r_task_title.font.size = Pt(16)
    r_task_title.font.color.rgb = RGBColor(15, 23, 42)

    # 一、任务描述
    p_sec1 = doc.add_paragraph()
    style_heading_1(p_sec1, "一、任务描述")
    
    p_d1 = doc.add_paragraph()
    style_body_p(p_d1, "在建筑工程施工任务中，现场常会遇到垂直吊运、人员送达、钢筋加工和土料转运等多种作业需求。不同施工机械的工作装置差异很大，有的采用吊钩和钢丝绳实现空中吊运，有的采用附墙导轨和封闭吊笼实现安全载人；在钢筋加工区，切断机依靠上下相对刀片咬合剪断长料，而弯曲机则依靠转盘销轴把钢筋折成弯钩；在土方作业中，装载机依靠大铲斗举升倾倒，而推土机只能贴地推移。如果技术人员仅凭设备大小或有无履带盲目选机，甚至混淆载物与载人设备，就会带来严重的工程质量缺陷和人身安全事故隐患。")
    
    p_d2 = doc.add_paragraph()
    style_body_p(p_d2, "本任务要求你围绕施工机械的作业对象和核心动作进行观察和识读，找出直接接触材料并出力的关键工作装置，分析典型误操作带来的安全与质量风险，并完成常见施工场景与机械的合理匹配。完成本任务后，你应能用工程理由说明“为什么施工机械选型必须以工作装置和作业边界为依据，而不能单看设备外形”。")

    # 二、学习目标
    p_sec2 = doc.add_paragraph()
    style_heading_1(p_sec2, "二、学习目标")
    
    p_obj = doc.add_paragraph()
    p_obj.paragraph_format.space_before = Pt(0)
    p_obj.paragraph_format.space_after = Pt(6)
    p_obj.paragraph_format.line_spacing = 1.3
    r_k = p_obj.add_run("知识目标：")
    r_k.bold = True
    r_k.font.name = "黑体"
    r_k.font.size = Pt(10.5)
    r_kt = p_obj.add_run("认识起重运输、钢筋加工及土方施工机械的典型构型，理解作业对象、核心动作与关键工作装置之间的映射关系。\n")
    r_kt.font.name = "宋体"
    r_kt.font.size = Pt(10.5)
    
    r_s = p_obj.add_run("技能目标：")
    r_s.bold = True
    r_s.font.name = "黑体"
    r_s.font.size = Pt(10.5)
    r_st = p_obj.add_run("能根据现场材料吊装、人员输送、钢筋截断弯曲和土方装车等作业要求，识别关键工作装置，判断误用风险，并说明选型理由。")
    r_st.font.name = "宋体"
    r_st.font.size = Pt(10.5)

    # 三、任务安排
    p_sec3 = doc.add_paragraph()
    style_heading_1(p_sec3, "三、任务安排")
    
    p_t1 = doc.add_paragraph()
    style_table_title(p_t1, "表1-2-1 小组任务安排表")
    
    t_arr = doc.add_table(rows=6, cols=3)
    set_table_borders(t_arr, color="CBD5E0", sz="4")
    t_arr.alignment = WD_TABLE_ALIGNMENT.CENTER
    # header row 0
    t_arr.rows[0].cells[0].text = "小组名"
    t_arr.rows[0].cells[1].text = "第 _____ 组"
    t_arr.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr.rows[0].cells[2], "EDF2F7")
    
    # header row 1
    t_arr.rows[1].cells[0].text = "姓名"
    t_arr.rows[1].cells[1].text = "分工任务"
    t_arr.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs:
            p.runs[0].font.name = "黑体"
            p.runs[0].font.size = Pt(9.5)
            p.runs[0].bold = True
            
    tasks_1_2 = [
        ("实体分析", "观察三维机械模型的整体构型与工作装置连接关系"),
        ("识读判断", "判断不同机械属于哪类家族，辨识直接出力的核心零件"),
        ("风险分析", "思考起重机违规载人、切断与弯曲混淆、铲斗盲区的现场风险"),
        ("场景匹配", "把5项具体施工任务与合适机械及关键装置准确对应")
    ]
    for idx, (role, desc) in enumerate(tasks_1_2):
        row = t_arr.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"
        row.cells[1].text = f"{role}：{desc}"
        row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2)
        row.cells[1].width = Inches(4.3)
        row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs:
                p.runs[0].font.name = "宋体"
                p.runs[0].font.size = Pt(9.5)

    # 四、任务实施
    p_sec4 = doc.add_paragraph()
    style_heading_1(p_sec4, "四、任务实施")
    
    # Question 1
    p_q1 = doc.add_paragraph()
    style_body_p(p_q1, "引导问题 1：工程现场加工钢筋常用的机械有钢筋切断机与钢筋弯曲机。它们都在钢筋加工区作业，但处理材料的方式截然不同。请观察两台机械的工作区域，思考它们在改变材料性态方面有哪些区别。将结果记录在 表1-2-2 中。", indent=False)
    p_q1.runs[0].bold = True
    
    add_image_placeholder(doc, "图1-2-1 钢筋切断机与钢筋弯曲机加工区域对比图")
    add_alert_box(doc, "知识提示", "切断机通过活动刀片与固定刀片的相对闭合咬合，把一根连续钢筋截成两段，改变的是材料的连续性；弯曲机通过转盘带动成形销轴受迫硬掰，改变的是钢筋的几何形状，并不切断材料。", "knowledge")
    
    # Question 2
    p_q2 = doc.add_paragraph()
    style_body_p(p_q2, "引导问题 2：请观察下图中的塔式起重机和施工升降机，找出它们承接作业对象的核心部件，并判断它们分别适合吊运物料还是运送施工人员。将结果记录在 表1-2-3 中。", indent=False)
    p_q2.runs[0].bold = True
    
    add_image_placeholder(doc, "图1-2-2 塔式起重机吊钩与施工升降机吊笼结构对比图")
    add_alert_box(doc, "安全提示", "塔吊吊钩属于悬空吊索装置，无导轨约束且无防坠自锁刹车，严禁挂装吊篮运送工人上楼；运送人员必须使用配备防坠安全器、封闭吊笼和门机电联锁保护的人货两用施工升降机。", "safety")
    add_alert_box(doc, "学习资源", "打开配套数字化教学平台“任务1-2 认识施工机械”模块：在三维工位中旋转放大观察吊钩与吊笼，拖动起升手柄观察两者在升降运动和安全防护上的本质差别。", "resource")

    # Question 3
    p_q3 = doc.add_paragraph()
    style_body_p(p_q3, "引导问题 3：在土方施工作业中，地面堆有大批松散土料需要装入自卸汽车运走。装载机、推土机和挖掘机都可以处理土方，请分析哪种设备装车效率最高？如果现场误用推土机进行装车，会出现什么问题？", indent=False)
    p_q3.runs[0].bold = True
    
    add_image_placeholder(doc, "图1-2-3 轮式装载机装车动作与推土机作业对比图")
    add_alert_box(doc, "操作提醒", "装载机依靠动臂举升连杆和大铲斗完成“插入铲取—举升大臂—向前翻斗倾倒”复合动作；推土机前方为平直推土板，只能贴地推移土方，无法将土料举高越过卡车车厢帮高。", "operation")

    p_conc1 = doc.add_paragraph()
    style_body_p(p_conc1, "小组结论：为施工任务选用机械时，既要看 ______________，也要看 ______________，还要考虑 ______________ 和 ______________。")

    # Question 4
    p_q4 = doc.add_paragraph()
    style_body_p(p_q4, "引导问题 4：如果现场把只允许运载材料的简易井字架提升机违规用于载人，可能造成哪些严重后果？进场前应重点核查设备的哪些安全装置？将结论记录在 表1-2-4 中。", indent=False)
    p_q4.runs[0].bold = True
    
    add_alert_box(doc, "记录要求", "将匹配结果填入表1-2-4中，并针对每一项工况至少写出一条实机进场必须复核的安全检测或合规资质条件。", "record")

    # 五、成果记录
    p_sec5 = doc.add_paragraph()
    style_heading_1(p_sec5, "五、成果记录")
    
    p_t2 = doc.add_paragraph()
    style_table_title(p_t2, "表1-2-2 常见钢筋加工机械对比表")
    t_comp = doc.add_table(rows=6, cols=3)
    format_grid_table(t_comp, [Inches(1.5), Inches(2.5), Inches(2.5)], 
                      ["对比项目", "钢筋切断机", "钢筋弯曲机"],
                      [
                          ["结构特点", "相对刀片、传动连杆、机体刀座", "回转工作盘、弯曲中心轴、成型销轴、挡铁"],
                          ["运动方式", "活动刀片垂直或水平往复咬合剪切", "工作盘带动销轴旋转，钢筋受迫绕轴弯折"],
                          ["加工结果", "改变钢筋的连续性（一根截成两段）", "改变钢筋的几何形状（形成弯钩或折角）"],
                          ["主要优势", "刃口刚性好，切口平整，效率高", "角度可调，多规格弯心，成型标准"],
                          ["典型任务", "原材定尺下料截断", "箍筋、弯起钢筋、端头锚固弯钩成型"]
                      ])
    
    p_t3 = doc.add_paragraph()
    style_table_title(p_t3, "表1-2-3 常见工程机械识别记录表")
    t_rec = doc.add_table(rows=6, cols=5)
    format_grid_table(t_rec, [Inches(1.2), Inches(1.3), Inches(1.4), Inches(1.3), Inches(1.3)],
                      ["类型 / 对象", "外形特征", "主要运动方式 / 工作过程", "关键工作装置", "适合施工任务"],
                      [
                          ["塔式起重机", "高大塔身、起重臂架、平衡臂配重", "卷扬垂直起升、小车水平变幅、回转", "滑轮组与吊钩", "成捆钢筋、预制构件空中吊运"],
                          ["施工升降机", "外墙竖直导轨架、附墙架、封闭吊笼", "齿轮齿条啮合驱动，沿导轨平稳升降", "封闭吊笼与防坠器", "施工人员及随行工具运至楼层"],
                          ["钢筋切断机", "箱型坚固机体、外露上下相对刀口", "活动刀片往复推挤合拢", "活动刀片与固定刃口", "加工棚内直条长钢筋定尺截断"],
                          ["钢筋弯曲机", "水平工作圆盘、插孔销轴与定位挡铁", "中心盘受控旋转驱动成型销轴", "工作盘与弯曲销轴", "剪短后的直钢筋弯曲角度成型"],
                          ["轮式装载机", "铰接式车架、橡胶大轮胎、前置举升臂", "底盘行驶推进、动臂举升、铲斗前倾", "前部装载大铲斗", "大堆松散土方、砂石铲装上车"]
                      ])
    
    p_t4 = doc.add_paragraph()
    style_table_title(p_t4, "表1-2-4 建筑施工场景设备选型与安全核查表")
    t_scene = doc.add_table(rows=6, cols=4)
    format_grid_table(t_scene, [Inches(1.3), Inches(1.8), Inches(1.4), Inches(2.0)],
                      ["施工场景", "作业对象与核心动作特点", "推荐设备与关键装置", "现场必须核对的安全条件"],
                      [
                          ["工况 1：钢筋吊运", "成捆重物，需要越过障碍垂直提升到作业面", "塔式起重机（滑轮吊钩）", "核查起重量限制器、力矩限制器及吊钩防脱舌片"],
                          ["工况 2：人员上楼", "运送施工人员，安全冗余高，要求平稳导向", "施工升降机（封闭吊笼）", "核查防坠安全器检验标定牌、层门联锁、司机持证"],
                          ["工况 3：定尺剪切", "批量长钢筋下料，需要利落截断，不能有毛刺", "钢筋切断机（相对刀口）", "核查刀片螺栓紧固、刀口间隙、皮带防护罩齐全"],
                          ["工况 4：成形弯曲", "已截断的钢筋，需要绕轴弯出 $90^\\circ$ 或 $135^\\circ$ 弯钩", "钢筋弯曲机（转盘销轴）", "核查弯曲心轴直径是否符合规范弧度、挡铁牢固"],
                          ["工况 5：散土装车", "地面堆积的大量松散土方，需要装入自卸汽车", "轮式装载机（装载铲斗）", "核查铲斗倾卸高差是否满足车帮要求、倒车警报器"]
                      ])
    
    p_conc2 = doc.add_paragraph()
    style_body_p(p_conc2, "小组结论：当面对具体施工任务选机时，既要看 ______________，也要看 ______________，还要重点核查 ______________。")

    # 六、达标评价
    p_sec6 = doc.add_paragraph()
    style_heading_1(p_sec6, "六、达标评价")
    
    p_t5 = doc.add_paragraph()
    style_table_title(p_t5, "表1-2-5 达标评价表")
    t_eval = doc.add_table(rows=5, cols=5)
    format_grid_table(t_eval, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能正确区分切断与弯曲、吊物与载人机械的工作装置差异", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能准确描述关键工作装置的运动方式与动作前后变化", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能将 5 项典型施工任务与设备合理匹配并列出安全核对点", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "小组任务分工明确，实训数据表填写完整，逻辑严谨", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec7 = doc.add_paragraph()
    style_heading_1(p_sec7, "七、拓展延伸")
    p_ext = doc.add_paragraph()
    style_body_p(p_ext, "传统施工现场塔吊司机必须攀爬几十米高的垂直扶梯，不仅劳动强度大、视野存在死角，遇到突发大风或大雾时极易产生安全事故。目前国家重大工程广泛探索“5G地面集中智控舱”技术：塔机安装全景球机、毫米波雷达与吊钩防摇系统，司机在地面空调驾驶舱内看着拼接大屏、操作力反馈手柄，如同打电竞一样操控塔吊作业。然而，远程操纵虽然改善了工作环境，但更依赖现场司索工与智能系统的防撞算法。技术在改善人工作环境的同时，也对机械管理人员提出了更严苛的数字运维与安全底线要求。")

    # -------------------------------------------------------------
    # TASK 1-3
    # -------------------------------------------------------------
    doc.add_page_break()
    
    p_task_title2 = doc.add_paragraph()
    p_task_title2.paragraph_format.space_before = Pt(6)
    p_task_title2.paragraph_format.space_after = Pt(12)
    r_task_title2 = p_task_title2.add_run("任务1-3  施工机器人控制反馈识读与人机分工判断")
    r_task_title2.bold = True
    r_task_title2.font.name = "黑体"
    r_task_title2.font.size = Pt(16)
    r_task_title2.font.color.rgb = RGBColor(15, 23, 42)

    # 一、任务描述
    p_sec1_2 = doc.add_paragraph()
    style_heading_1(p_sec1_2, "一、任务描述")
    
    p_d1_2 = doc.add_paragraph()
    style_body_p(p_d1_2, "在建筑装饰喷涂、地坪打磨和高空巡检等施工任务中，现场作业环境复杂多变，常会遇到墙面不平整、遇到障碍物或工况突发异常等问题。不同自动化设备在应对意外变化时表现差异极大：有的设备只是普通人工遥控，完全靠人眼盯防；有的设备虽然写好了固定程序，但遇到突发变化仍会盲目继续运行；而具备反馈能力的施工机器人则能通过传感器自主识别异常并及时刹车停机。如果在现场混淆了“盲目执行的死程序”与“具备反馈闭环的机器人”，就可能因设备无法自主应对突发障碍而导致撞墙、损件甚至危及人身安全。")
    
    p_d2_2 = doc.add_paragraph()
    style_body_p(p_d2_2, "本任务要求你围绕墙面作业受控试验进行观察、识读和记录，辨别人工控制、预设程序与反馈控制三种方式在遇到相同扰动时的动作差异，演练异常停机后的安全排查链，并客观看待典型机器人的现场能力边界。完成本任务后，你应能用工程理由说明“为什么有屏幕显示不等于闭环反馈，自动停机不能替代人工安全确认”。")

    # 二、学习目标
    p_sec2_2 = doc.add_paragraph()
    style_heading_1(p_sec2_2, "二、学习目标")
    
    p_obj2 = doc.add_paragraph()
    p_obj2.paragraph_format.space_before = Pt(0)
    p_obj2.paragraph_format.space_after = Pt(6)
    p_obj2.paragraph_format.line_spacing = 1.3
    r_k2 = p_obj2.add_run("知识目标：")
    r_k2.bold = True
    r_k2.font.name = "黑体"
    r_k2.font.size = Pt(10.5)
    r_kt2 = p_obj2.add_run("认识施工机器人的感知、控制与执行三大系统，理解“传感器测量—控制器比对—执行机构调节”的反馈闭环机理。\n")
    r_kt2.font.name = "宋体"
    r_kt2.font.size = Pt(10.5)
    
    r_s2 = p_obj2.add_run("技能目标：")
    r_s2.bold = True
    r_s2.font.name = "黑体"
    r_s2.font.size = Pt(10.5)
    r_st2 = p_obj2.add_run("能识读不同控制模式在遭遇突变时的停机证据，能规范执行故障后的“排除故障—人工复核—单独重启”安全规程，并能指出现有人形/四足机器人在复杂工地中的能力短板。")
    r_st2.font.name = "宋体"
    r_st2.font.size = Pt(10.5)

    # 三、任务安排
    p_sec3_2 = doc.add_paragraph()
    style_heading_1(p_sec3_2, "三、任务安排")
    
    p_t1_2 = doc.add_paragraph()
    style_table_title(p_t1_2, "表1-3-1 小组任务安排表")
    
    t_arr2 = doc.add_table(rows=6, cols=3)
    set_table_borders(t_arr2, color="CBD5E0", sz="4")
    t_arr2.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_arr2.rows[0].cells[0].text = "小组名"
    t_arr2.rows[0].cells[1].text = "第 _____ 组"
    t_arr2.rows[0].cells[2].text = "实训日期：2026年___月___日"
    set_cell_background(t_arr2.rows[0].cells[0], "EDF2F7")
    set_cell_background(t_arr2.rows[0].cells[2], "EDF2F7")
    
    t_arr2.rows[1].cells[0].text = "姓名"
    t_arr2.rows[1].cells[1].text = "分工任务"
    t_arr2.rows[1].cells[2].text = "完成勾选（✓）"
    for c in t_arr2.rows[1].cells:
        set_cell_background(c, "EDF2F7")
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if p.runs:
            p.runs[0].font.name = "黑体"
            p.runs[0].font.size = Pt(9.5)
            p.runs[0].bold = True
            
    tasks_1_3 = [
        ("实体分析", "观察喷涂试验台车体与雷达传感器布局，理清感知-控制-执行链"),
        ("识读判断", "对比人工操纵、预设死程序与感应反馈三种模式的行为表现"),
        ("风险分析", "分析固定程序盲跑冲撞风险，以及故障未排除私自开机的人身风险"),
        ("场景匹配", "将墙面作业、巡检任务与合理的人机分工与安全接管模式对应")
    ]
    for idx, (role, desc) in enumerate(tasks_1_3):
        row = t_arr2.rows[idx + 2]
        row.cells[0].text = f"组员{idx+1}"
        row.cells[1].text = f"{role}：{desc}"
        row.cells[2].text = "□"
        row.cells[0].width = Inches(1.2)
        row.cells[1].width = Inches(4.3)
        row.cells[2].width = Inches(1.0)
        row.cells[0].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        row.cells[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        for cell in row.cells:
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            if p.runs:
                p.runs[0].font.name = "宋体"
                p.runs[0].font.size = Pt(9.5)

    # 四、任务实施
    p_sec4_2 = doc.add_paragraph()
    style_heading_1(p_sec4_2, "四、任务实施")
    
    # Question 1
    p_q1_2 = doc.add_paragraph()
    style_body_p(p_q1_2, "引导问题 1：在墙面喷涂施工中，设备与墙面需保持稳定设计间距。如果在前行作业时前方墙面突然变远或出现凹坑，采用人工控制、预设程序和距离反馈控制三种方式，设备分别会怎么反应？请观察模拟实验，记录动作现象并填入 表1-3-2 中。", indent=False)
    p_q1_2.runs[0].bold = True
    
    add_image_placeholder(doc, "图1-3-1 三种控制方式在遭遇墙面扰动时的响应对比图")
    add_alert_box(doc, "知识提示", "反馈闭环必须包含“感知收集状态 ➔ 控制器比对阈值 ➔ 执行机构改变动作”完整回路。预设程序虽然能在屏幕上打出报警数字，但只要数据没有直接接入动作控制切断电机，就依然是开环盲跑！", "knowledge")
    
    # Question 2
    p_q2_2 = doc.add_paragraph()
    style_body_p(p_q2_2, "引导问题 2：当装有雷达测距的喷涂小车因距离超标自主触发紧急刹车停机后，如果现场工人直接把墙面推回正常位置，机器应不应该立刻自动重新开跑？为什么？", indent=False)
    p_q2_2.runs[0].bold = True
    
    add_alert_box(doc, "安全提示", "严禁设备在故障消除后自动重新启动！自动暂停说明工况出现意外，现场可能存在人员被夹、电缆缠绕或零件变形隐患。必须严格执行“排除物理故障 ➔ 专人现场确认 ➔ 手动单独重新启动”三步规程。", "safety")
    add_alert_box(doc, "操作提醒", "在模拟平台上演练复位流程时，严格按照先后顺序：先恢复墙面位置，再点击人工确认，最后点击重新启动，观察三个动作各自解除了系统什么安全锁定状态。", "operation")

    # Question 3
    p_q3_2 = doc.add_paragraph()
    style_body_p(p_q3_2, "引导问题 3：在春晚和短视频中，人形机器人能打武术、四足机器狗能翻跟头，动作非常炫酷。如果直接将它们拉到真实的建筑工地上承担搬砖、砌墙或巡检任务，它们身上有哪些部位具有几何结构优势？面对真实的泥水粉尘工况，它们目前还存在哪些致命短板？将结果填入 表1-3-3 中。", indent=False)
    p_q3_2.runs[0].bold = True
    
    add_image_placeholder(doc, "图1-3-2 人形机器人关节机构与四足机器狗足端结构图")
    add_alert_box(doc, "学习资源", "打开配套数字化教学平台“机器人形态工坊”模块：旋转观察机械臂、机器狗和人形机器人的关节自由度与末端工具配置，对比平地表演与工地非结构化恶劣环境的巨大落差。", "resource")

    p_conc1_2 = doc.add_paragraph()
    style_body_p(p_conc1_2, "小组结论：判断一台施工设备是否真正适合工地作业，既要看 ______________，也要看 ______________，还要考虑 ______________ 和 ______________。")

    # Question 4
    p_q4_2 = doc.add_paragraph()
    style_body_p(p_q4_2, "引导问题 4：在智能建造工地上，引入智能喷涂机器人后，现场施工人员的职责发生了什么改变？人与机器应如何进行科学合理的分工？将你的思考填入 表1-3-4 中。", indent=False)
    p_q4_2.runs[0].bold = True
    
    add_alert_box(doc, "记录要求", "将人机职责对比填入表1-3-4中，重点写清楚机器能替人做什么，但在哪些关键安全与决策环节人绝对不可替代。", "record")

    # 五、成果记录
    p_sec5_2 = doc.add_paragraph()
    style_heading_1(p_sec5_2, "五、成果记录")
    
    p_t2_2 = doc.add_paragraph()
    style_table_title(p_t2_2, "表1-3-2 三种控制方式抗扰表现对比表")
    t_comp2 = doc.add_table(rows=4, cols=5)
    format_grid_table(t_comp2, [Inches(1.2), Inches(1.3), Inches(1.3), Inches(1.3), Inches(1.4)], 
                      ["控制方式", "突发扰动（墙面变远）", "设备的动作反应", "停机决策主体", "综合判定结论"],
                      [
                          ["人工持续控制", "间距突变至 1.35", "小车不会自行停下，盲目前进", "由人工观察后手动按下停止键", "无自主感知判断能力，完全依赖人"],
                          ["按预设死程序", "间距突变至 1.35", "屏幕显示警报，小车继续前冲", "由程序跑完或人工紧急拍停", "开环执行，状态信息未参与动作控制"],
                          ["依据反馈控制", "间距突变至 1.35", "秒级自主急刹制动，锁定位置", "控制器自动比对偏差超限停机", "形成感知-比较-执行闭环，具备保护能力"]
                      ])
    
    p_t3_2 = doc.add_paragraph()
    style_table_title(p_t3_2, "表1-3-3 典型机器人形态结构适配与现场短板识别表")
    t_rec2 = doc.add_table(rows=4, cols=5)
    format_grid_table(t_rec2, [Inches(1.2), Inches(1.3), Inches(1.4), Inches(1.3), Inches(1.3)],
                      ["机器人形态", "外形与机构特点", "潜在适合的施工场景", "结构适配依据", "当前工地面临的致命短板"],
                      [
                          ["人形机器人", "双足直立行走、双机械臂、仿人多自由度", "狭小通道室内质检、楼梯巡查、手持小工具作业", "能适应按人体尺度设计的建筑空间和楼梯", "双足重心高易倾倒，电池续航短，负重与抗冲击差"],
                          ["四足机器狗", "四足并联关节、低矮重心、仿生步态行走", "粗糙地面自主巡检、隐患排查、激光雷达测绘扫描", "越障能力强，能走坑洼地面、碎石路与斜坡", "无法承担几十公斤重物搬运，深泥浆路面打滑陷足"],
                          ["六轴工业机械臂", "固定底座或滑台、6个转动关节、高重复精度", "构件焊接、钢筋绑扎、墙面恒力打磨、精准喷涂", "刚性好，轨迹精度极高，末端工具更换灵活", "工作范围受臂展限制，自重大，不能脱离基座移动"]
                      ])
    
    p_t4_2 = doc.add_paragraph()
    style_table_title(p_t4_2, "表1-3-4 智能建造现场人机职责分工表")
    t_scene2 = doc.add_table(rows=5, cols=4)
    format_grid_table(t_scene2, [Inches(1.4), Inches(2.0), Inches(1.5), Inches(1.6)],
                      ["工作环节", "施工机器人负责完成的动作", "现场人员负责承担的职责", "人机协同关键点"],
                      [
                          ["任务准备与开工", "设备自检、传感器初始化零位校准", "现场作业面勘察、BIM路径导入、安全围挡", "人下达作业指令，确认无碰撞干涉"],
                          ["常态施工作业", "按设定参数自动喷涂、打磨，恒定速度与间距", "巡回监视、材料供给（加料）、环境通风监测", "机器替代“繁与脏”，人负责质量监护"],
                          ["突发异常停机", "传感器检测超差，触发安全互锁与急刹停机", "现场勘验原因、排除卡阻、消除隐患、确认安全", "绝对禁止机器擅自重启，人把关安全"],
                          ["收工与维护保养", "复位回起始待机工位，上传作业质量日志", "清洁喷头、刀具磨损检查、电池充电、润滑保养", "人做预防性维护，延长设备使用寿命"]
                      ])
    
    p_conc2_2 = doc.add_paragraph()
    style_body_p(p_conc2_2, "小组结论：在智能建造作业中，机器人主要替代人类完成 ______________ 的繁重危险动作，而人类核心负责 ______________、______________ 和 ______________。")

    # 六、达标评价
    p_sec6_2 = doc.add_paragraph()
    style_heading_1(p_sec6_2, "六、达标评价")
    
    p_t5_2 = doc.add_paragraph()
    style_table_title(p_t5_2, "表1-3-5 达标评价表")
    t_eval2 = doc.add_table(rows=5, cols=5)
    format_grid_table(t_eval2, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价项", "达标要求", "自评", "互评", "教师评价"],
                      [
                          ["识读判断", "能分清人工控制、预设死程序与反馈控制三种模式的区别", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间/流程判断", "能准确说出反馈自动停机后的“排除故障-确认-重启”规程", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["场景匹配", "能理性分析典型机器人的现场能力短板与人机合理分工", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["协作记录", "小组分工清晰，对比表格填写完整，工程理由充分", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_sec7_2 = doc.add_paragraph()
    style_heading_1(p_sec7_2, "七、拓展延伸")
    p_ext2 = doc.add_paragraph()
    style_body_p(p_ext2, "建筑业向智能建造转型，并不是要彻底消灭人工，而是对传统施工人员提出了技能重塑的要求。未来的施工现场正在诞生一批令人瞩目的新工种：手持平板指挥喷涂与抹灰机器人协同作业的“建筑机器人领航员”、专门排查传感器温湿度漂移与关节磨损的“智能装备机电运维师”、提取现场激光点云比对BIM模型质量的“数字化质检员”。与其焦虑未来是否会被机器人替代，不如从现在开始打好机械结构与控制原理的基础，成长为懂工艺、懂设备、懂数字化的“新时代智能建造工程师”。")

    # Save
    out_path = Path("docs/第一章实训任务页.docx")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_path))
    
    # Also save to artifacts/packages
    pkg_path = Path("artifacts/packages/第一章实训任务页.docx")
    pkg_path.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(pkg_path))
    
    print(f"Successfully generated: {out_path} and {pkg_path}")

if __name__ == "__main__":
    build_document()
