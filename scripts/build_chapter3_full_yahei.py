# -*- coding: utf-8 -*-
"""
Build Chapter 3 full textbook & practical workbook Word (.docx) file.
All fonts: 微软雅黑 (Microsoft YaHei)
Images embedded from project assets.
"""

import docx
from docx.shared import Inches, Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn
from pathlib import Path

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

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
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
        "ideology": ("FEE2E2", "DC2626"), # 思政专属
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
    
    r_tag = p.add_run(f"【{tag}】")
    apply_font(r_tag, size_pt=9.5, bold=True, color_rgb=RGBColor.from_string(border))
    
    r_text = p.add_run(text)
    apply_font(r_text, size_pt=9.5, bold=False, color_rgb=RGBColor(31, 41, 55))
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(4)
    p_after.paragraph_format.space_before = Pt(0)

def add_ideology_box(doc, title, text):
    """思政微视窗专属卡片"""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(6.5)
    
    cell = tbl.cell(0, 0)
    set_cell_background(cell, "FEF2F2") # 浅赤红底色
    set_alert_box_border(tbl, "B91C1C") # 砖红边框
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.35
    
    r_tag = p.add_run(f"【思政微视窗 · {title}】\n")
    apply_font(r_tag, size_pt=10, bold=True, color_rgb=RGBColor(185, 28, 28))
    
    r_text = p.add_run(text)
    apply_font(r_text, size_pt=9.5, bold=False, color_rgb=RGBColor(55, 65, 81))
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(6)
    p_after.paragraph_format.space_before = Pt(0)

def add_embedded_image(doc, img_path, caption, width_inch=5.2):
    p = Path(img_path)
    if p.exists():
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(6)
        p_img.paragraph_format.space_after = Pt(2)
        run = p_img.add_run()
        run.add_picture(str(p), width=Inches(width_inch))
    else:
        # Fallback placeholder
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl.columns[0].width = Inches(width_inch)
        c = tbl.cell(0, 0)
        set_cell_background(c, "F3F4F6")
        set_table_borders(tbl, "CBD5E1", "4", "dashed")
        p_box = c.paragraphs[0]
        p_box.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p_box.add_run(f"[ 图片：{caption} ]")
        apply_font(r, size_pt=9.5, color_rgb=RGBColor(100, 116, 139))
        
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(8)
    r_cap = p_cap.add_run(caption)
    apply_font(r_cap, size_pt=9, bold=True, color_rgb=RGBColor(71, 85, 105))

def style_heading_1(p, text):
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    apply_font(r, size_pt=12.5, bold=True, color_rgb=RGBColor(29, 78, 216))

def style_heading_2(p, text):
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    apply_font(r, size_pt=11, bold=True, color_rgb=RGBColor(30, 41, 59))

def style_body_p(p, text, indent=True):
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.35
    if indent:
        p.paragraph_format.first_line_indent = Pt(21)
    r = p.add_run(text)
    apply_font(r, size_pt=10, bold=False, color_rgb=RGBColor(30, 41, 59))

def style_table_title(p, text):
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    r = p.add_run(text)
    apply_font(r, size_pt=9.5, bold=True, color_rgb=RGBColor(51, 65, 85))

def format_grid_table(table, col_widths, headers, rows):
    set_table_borders(table, color="D1D5DB", sz="4")
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    
    # Header
    for i, title in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = title
        set_cell_background(cell, "F1F5F9")
        set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        apply_font(p.runs[0], size_pt=9, bold=True, color_rgb=RGBColor(30, 41, 59))
        
    for r_idx, row_data in enumerate(rows):
        for c_idx, val in enumerate(row_data):
            cell = table.rows[r_idx + 1].cells[c_idx]
            cell.text = val
            set_cell_margins(cell, top=70, bottom=70, left=90, right=90)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if (c_idx == 0 or "□" in val or "✓" in val) else WD_ALIGN_PARAGRAPH.LEFT
            if p.runs:
                apply_font(p.runs[0], size_pt=9, bold=False, color_rgb=RGBColor(51, 65, 85))
                
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width

print("YaHei generator initialized")

def build_chapter3_docx():
    doc = docx.Document()
    
    # Set default font to 微软雅黑
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Microsoft YaHei'
    style_normal._element.rPr.rFonts.set(qn('w:eastAsia'), '微软雅黑')
    style_normal._element.rPr.rFonts.set(qn('w:ascii'), 'Microsoft YaHei')
    style_normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Microsoft YaHei')
    
    for section in doc.sections:
        section.top_margin = Cm(2.2)
        section.bottom_margin = Cm(2.2)
        section.left_margin = Cm(2.4)
        section.right_margin = Cm(2.4)
        
        header = section.header
        hp = header.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("《智能建筑机械与机器人》核心教材与实训工作页 · 第三章")
        apply_font(hrun, size_pt=8.5, color_rgb=RGBColor(148, 163, 184))
        
        footer = section.footer
        fp = footer.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("— 第三章 机器人硬件本体与行走机构 —")
        apply_font(frun, size_pt=8.5, color_rgb=RGBColor(148, 163, 184))

    # Chapter Header
    p_ch = doc.add_paragraph()
    p_ch.paragraph_format.space_before = Pt(12)
    p_ch.paragraph_format.space_after = Pt(8)
    p_ch.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_ch = p_ch.add_run("第三章  机器人硬件本体与行走机构")
    apply_font(r_ch, size_pt=18, bold=True, color_rgb=RGBColor(15, 23, 42))
    
    p_lead = doc.add_paragraph()
    style_body_p(p_lead, "建筑机器人是智能建造现场执行高危、繁复、脏污、重载作业的‘钢铁工友’。机器人的外表千差万别，但追本溯源，它们都脱胎于机械学、电机传动学与自动控制技术的深度融合。本章立足施工现场真实需求，带同学们系统拆解机器人的核心‘骨骼与肌肉’：从自由度与五大机械构型，到六轴机械臂的关节与点动坐标系；从伺服电机与核心减速器的内部原理，到末端工具快换与TCP标定；最后深入探索能走、能爬、能原地转弯的智能移动底盘。学完本章，你将真正看懂机器人的‘硬核底气’，掌握智能装备日常调试、参数校准与现场操作的硬本领。")

    # =========================================================================
    # TASK 3-1
    # =========================================================================
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(10)
    r = p_t.add_run("任务3-1  机器人构型与工作空间识读")
    apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(15, 23, 42))

    # 一、任务描述
    p_s = doc.add_paragraph(); style_heading_1(p_s, "一、任务描述")
    p = doc.add_paragraph()
    style_body_p(p, "在装配式建筑构件厂、钢结构加工车间以及建筑施工现场，经常能见到形态各异的自动化设备：有的像巨大的龙门吊沿直线导轨滑移，有的像修长的钢铁手臂在三维空间灵活扭转，还有的像蜘蛛一样用几根轻巧的细杆在输送线上快速点选。同样是把工具送到作业位置，不同机器人的‘骨架搭建方式’（即机械构型）完全不同，能覆盖的作业空间形状、动作速度和承载能力也天差地别。如果技术人员选型不当，就可能出现‘看似能够到目标点，但机械臂手肘却撞上外架或墙壁’的严重事故。")
    p = doc.add_paragraph()
    style_body_p(p, "本任务要求你从空间自由度的概念切入，观察并识读直角坐标型、圆柱坐标型、关节型六轴、SCARA及Delta并联等五类典型机器人构型，分清‘末端可达空间’与‘本体扫掠空间’的本质差别，在三维模拟工位中完成约束积木搭建与避障探路试验，并能根据施工场景推荐合适构型。完成本任务后，你应能用工程理由说明‘为什么选型时既要看末端能不能够到，更要核算手臂运动会不会发生空间干涉’。")

    # 二、学习目标
    p_s = doc.add_paragraph(); style_heading_1(p_s, "二、学习目标")
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.35
    r = p.add_run("知识目标："); apply_font(r, bold=True)
    r = p.add_run("理解自由度（DOF）的概念与约束机理；辨析直角坐标、圆柱坐标、六轴关节、SCARA与Delta五大构型的骨架特征与工作空间包络形状；区分末端可达范围与本体扫掠干涉范围。\n")
    apply_font(r)
    r = p.add_run("技能目标："); apply_font(r, bold=True)
    r = p.add_run("能在三维数字化工位中操作独立变量、锁轴及改变行程；能识别给定施工任务的关键约束并匹配最佳构型；能指出‘末端点可达但本体在路径中与障碍物碰撞’的安全隐患。\n")
    apply_font(r)
    r = p.add_run("素养目标："); apply_font(r, bold=True, color_rgb=RGBColor(185, 28, 28))
    r = p.add_run("【求真务实的科学精神】树立实事求是的工程选型观，破除对特定构型的盲目崇拜，懂得‘构型没有高低贵贱，只有适合现场工艺才是最佳方案’；【红线意识】在空间路径规划中时刻保持防碰撞警惕，将人员与设备安全置于首位。")
    apply_font(r)

    # 三、知识准备
    p_s = doc.add_paragraph(); style_heading_1(p_s, "三、知识准备")
    
    p = doc.add_paragraph(); style_heading_2(p, "1. 自由度（DOF）与空间运动规律")
    p = doc.add_paragraph()
    style_body_p(p, "自由度表示描述一个物体在空间独立运动所需的变量数目。一个不受任何限制的刚体在太空中飘浮时，具有 6 个独立自由度：3个沿三维坐标轴的直线平移（前后走X、左右走Y、上下走Z，决定‘在什么位置’），以及3个绕三维轴的旋转翻滚（俯仰Pitch、偏航Yaw、横滚Roll，决定‘朝向哪个姿态’）。每增加一个机械约束，物体的自由度就减少一个：例如门被合页卡住，只能绕轴旋转，就只剩下 1 个转动自由度；抽屉被导轨限死，只能直线抽拉，就只有 1 个平移自由度。工业机械臂之所以标配 6 个关节轴，就是为了让末端工具能够在空间任意改变位置和姿态！")

    p = doc.add_paragraph(); style_heading_2(p, "2. 五大主流工业与建筑机器人构型")
    p = doc.add_paragraph()
    style_body_p(p, "根据关节的排列组合与拓扑形式，工业界沉淀出了五种经典构型：\n· 直角坐标型（笛卡尔）：三个正交直线移动轴，工作空间为规则长方体（方盒子），结构刚度大、承载力强、控制极其简单，常见于大幅面3D打印机与数控桁架切割机；\n· 圆柱坐标型：一个立柱旋转台配合垂直升降与径向伸缩轴，工作空间呈圆柱壳，运动方式神似水平臂小车变幅塔吊，适合环形料架物料搬运；\n· 关节型六轴：由多个回转关节依次串联，结构最像人类手臂，灵活性极高，能自如伸入复杂凹腔完成焊接、多姿态喷涂与打磨；\n· SCARA构型：两段水平回转臂配合末端垂直升降轴，在水平面动作奇快、刚度极佳，专攻轻小五金件的极速装配；\n· Delta并联（蜘蛛手）：多条细长支链从上方共同驱动悬挂平台，运动件极轻、加速度极大，专攻流水线预埋垫块与扣件的高速分拣。")

    p = doc.add_paragraph(); style_heading_2(p, "3. 末端可达空间 vs 本体扫掠干涉")
    p = doc.add_paragraph()
    style_body_p(p, "【工程陷阱警示】：在施工现场做方案时，千万不能只看机械臂的技术参数上写着‘工作半径 2 米’，就想当然地认为 2 米内的所有点都能施工！\n① 位置可达 $\\neq$ 姿态可达：工具尖端虽然能碰触到螺栓孔，但钻头轴线可能无法垂直对齐孔洞；\n② 终点到达 $\\neq$ 路径安全：即使起点和终点都合法，机械臂在运动过程中突出的手肘、大臂或线缆可能会狠狠扫到旁边的立柱或脚手架！")

    add_ideology_box(doc, "实事求是的科学选型观", 
                     "在建筑机器人研发热潮中，有些人盲目推崇‘长得像人、多自由度’的复杂设备，甚至试图用十几自由度的人形机器人去搬水泥砖。真正的现代工程思维讲求‘适度与可靠’：对于规则大平面的喷涂，几万元的直角坐标桁架机在稳定性、速度与成本上完胜昂贵的双足机器人。不盲从外表花架子，立足具体工程痛点追求性价比与高可靠，这就是大国建造工匠实事求是的科学态度！")

    # 四、任务实施
    p_s = doc.add_paragraph(); style_heading_1(p_s, "四、任务实施")
    
    p = doc.add_paragraph(); style_heading_2(p, "关卡 1：积木约束体验（数一数自由度）")
    p = doc.add_paragraph()
    style_body_p(p, "打开配套网页，进入【约束积木】工位：\n1. 观察悬浮的自由立方体工具块，此时平移与旋转控制按键均可用（自由度为 6）；\n2. 尝试将‘合页铰链’拖入模型连接处，观察此时系统锁死了哪些动作？还剩下几个自由度？\n3. 换入‘直线滑轨’连接，观察自由度的改变。\n【猜一猜】：如果机械臂固定在水泥底座上，整台设备算不算失去了 6 个自由度？为什么？")
    add_alert_box(doc, "知识提示", "固定底座限制的是机器人底座相对于大地的 6 个位移与翻转，机械臂本身的 J1 至 J6 关节依然拥有各自独立的相对自由度！底座固定不代表机械臂没有自由度。", "knowledge")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 2：五大构型同场竞技与空间采样")
    p = doc.add_paragraph()
    style_body_p(p, "切换至【五种构型观察馆】：\n1. 依次点击直角坐标、六轴关节、Delta等模型，观察各关节运动时屏幕上逐渐生成的彩点空间点云包络；\n2. 尝试拖动【工具长度】滑块，将喷枪从 100 mm 加长到 300 mm，观察六轴机械臂最外圈的工作空间边界如何向外扩展；\n3. 临时点击【锁定肘轴（J3）】，尝试让机械臂去够到原来的最高作业点，记录此时系统是否提示出现运动学‘不可解’。")
    add_alert_box(doc, "操作提醒", "工作空间采样点云仅为教学离散示意。在实际工程中，没被点云采到的边缘点不代表绝对够不到，需要调用运动学逆解精确判定。", "operation")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 3：避障探路与碰撞排查（Wall-A工位）")
    p = doc.add_paragraph()
    style_body_p(p, "切换至【Wall-A 作业避障工位】：\n1. 目标是在墙面孔位处进行钻孔作业，在右侧选择【法向对准（垂直墙面）】与【斜向对准】；\n2. 启动预设路径 A（直连移动）与路径 B（绕行通过）；\n3. 仔细观察慢动作回放：路径 A 中机械臂的哪个部位与现场的立柱发生了致命碰撞？记录发生碰撞的瞬间！")
    add_alert_box(doc, "安全提示", "在复杂脚手架丛林中作业，必须开启控制系统的‘本体碰撞实时监测’功能。操作人员切忌站在机械臂手肘扫掠扇区内！", "safety")

    # 五、成果记录
    p_s = doc.add_paragraph(); style_heading_1(p_s, "五、成果记录")
    p = doc.add_paragraph(); style_table_title(p, "表3-1-2 构型认知与避障探究记录单")
    t = doc.add_table(rows=5, cols=4)
    format_grid_table(t, [Inches(1.5), Inches(1.8), Inches(1.5), Inches(1.7)],
                      ["实训探究项目", "实操现象与数据记录", "原因分析与工程依据", "结论与通关标记"],
                      [
                          ["约束积木实验", "加入合页只剩 1 自由度；加入滑轨只剩 1 自由度", "机械连接副强制锁死了其余自由方向", "✓ 掌握自由度本质"],
                          ["构型工作空间", "直角坐标呈方形盒；六轴关节呈类球形包络", "正交直线轴 vs 串联转动关节几何轨迹不同", "✓ 构型包络识读合格"],
                          ["锁死肘部测试", "锁死 J3 肘轴后，无法实现目标作业点覆盖", "关节自由度不足导致逆运动学出现无解", "✓ 理解多轴协同价值"],
                          ["Wall-A 避障排查", "直连路径下【机械臂肘部连杆】与现场立柱发生碰撞", "末端可达但中途关节空间扫掠发生物理干涉", "✓ 避障安全意识达标"]
                      ])
    p = doc.add_paragraph()
    style_body_p(p, "【通关工程反思】：某幕墙安装现场要求机器人能绕过凸出的外挂构件、从侧面伸入安装螺栓，你推荐选用【 六轴关节型 / 直角坐标型 】，理由是：_____________________________________________________。")

    # 六、达标评价
    p_s = doc.add_paragraph(); style_heading_1(p_s, "六、达标评价")
    p = doc.add_paragraph(); style_table_title(p, "表3-1-3 任务3-1 达标评价表")
    t = doc.add_table(rows=5, cols=5)
    format_grid_table(t, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价维度", "达标考核要点", "自评", "互评", "教师核评"],
                      [
                          ["构型识别", "能根据外形准确识别五大经典构型并指出工作空间特点", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["空间分析", "能透彻解释‘末端可达但本体干涉’的现象及避障原理", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["工程选型", "能结合叠合板喷剂、异形件打磨合理选配经济高效设备", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["素养表现", "具备实事求是的科学选型态度与强烈的防碰撞安全红线意识", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_s = doc.add_paragraph(); style_heading_1(p_s, "七、拓展延伸")
    p = doc.add_paragraph()
    style_body_p(p, "在地铁盾构隧道与密闭地下管廊施工中，由于横断面尺寸极其受限，常规六轴臂无法展开展开。为此，我国重大工程装备研发团队研制出了多自由度‘超冗余蛇形臂机器人’。它由数十个微型关节节段串联而成，如同灵蛇出洞，能够在仅容一人侧身通过的管道狭缝中自主弯曲爬行，实现背部紧贴管壁、头部探入深孔的高精度检修。这种创新颠覆了传统机械臂‘刚性粗壮’的刻板印象，展现了中国智能建造在极限非结构化场景中向极限要空间的大国创新智慧。")

    # 嵌入真实图片与平台截图指引
    add_embedded_image(doc, "artifacts/screenshots/retained/.local/chapter3-unified/3-1.png", 
                       "图3-1-3 配套平台实训工位：机器人五大构型与工作空间三维仿真界面")

    # =========================================================================
    # TASK 3-2
    # =========================================================================
    doc.add_page_break()
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(10)
    r = p_t.add_run("任务3-2  六轴机械臂本体、关节轴与低速点动")
    apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(15, 23, 42))

    # 一、任务描述
    p_s = doc.add_paragraph(); style_heading_1(p_s, "一、任务描述")
    p = doc.add_paragraph()
    style_body_p(p, "在构件喷涂、打磨和螺栓紧固任务中，操作人员经常需要使用示教器把机械臂微调移动到指定开工点。新手操作员常常面对示教器上的摇杆无所适从：同样是按‘向上移动’，有时机械臂末端笔直向上走，有时整个手腕却打着滚向上扬；如果工具处于倾斜角度，往前按键到底是朝前下方钻进，还是沿着地面水平向前？如果分不清关节坐标、基坐标和工具坐标的基准区别，极易误触按键导致工具硬生生撞在坚硬的构件表面！")
    p = doc.add_paragraph()
    style_body_p(p, "本任务要求你深入解构工业标准六轴机械臂本体结构，认清 J1 至 J6 关节轴的具体排布与运动分工，理清‘位置’与‘姿态’的工程界限，并在三维虚拟沙盒中开展盲盒猜轴、坐标切换对比与斜向钻孔进给实操，严格掌握规范的点动安全确认流程。完成本任务后，你应能用工程理由说明‘为什么点动操作前必须先看清当前坐标系，且试动时切忌只盯工具尖端’。")

    # 二、学习目标
    p_s = doc.add_paragraph(); style_heading_1(p_s, "二、学习目标")
    p = doc.add_paragraph(); p.paragraph_format.line_spacing = 1.35
    r = p.add_run("知识目标："); apply_font(r, bold=True)
    r = p.add_run("识记六轴机械臂 J1 至 J6 各轴的大致位置与转动属性，深刻理解‘前三轴定位置、后三轴调姿态’的工程精髓，分清关节坐标、基坐标与工具坐标的参照原点与运动轨迹差异。\n")
    apply_font(r)
    r = p.add_run("技能目标："); apply_font(r, bold=True)
    r = p.add_run("能熟练操作示教控制手柄进行关节单动与空间直线插补；能根据斜孔钻进等工况正确选定工具坐标系；能执行低速点动前的安全确认闭环。\n")
    apply_font(r)
    r = p.add_run("素养目标："); apply_font(r, bold=True, color_rgb=RGBColor(185, 28, 28))
    r = p.add_run("【生命敬畏与规程意识】牢固树立‘违章点动即等于酿成伤亡’的生命红线意识，克服麻痹侥幸心理，严格执行先低速观察再动手的操作铁律；养成全局观察机械臂全肢体扫掠空间的谨慎作风。")
    apply_font(r)

    # 三、知识准备
    p_s = doc.add_paragraph(); style_heading_1(p_s, "三、知识准备")
    
    p = doc.add_paragraph(); style_heading_2(p, "1. J1—J6 关节轴运动分工口诀")
    p = doc.add_paragraph()
    style_body_p(p, "标准六轴机械臂从底座到末端串联着 6 个回转关节：\n· J1（腰部回转轴）：位于基座顶部，带动整条手臂在水平面做 360° 大回转；\n· J2（肩部俯仰轴）：大臂向前扑出或向后仰起，决定整臂前伸距离；\n· J3（肘部俯仰轴）：小臂向上抬起或向下弯曲折合，调节末端离地高程；\n· J4（小臂扭转轴 / 腕部回转）：小臂及手腕沿自身纵向中心线扭动，调节横滚角；\n· J5（手腕摆动轴）：让工具像手腕一样‘点头’或‘抬头’，大幅度改变工具俯仰夹角；\n· J6（末端法兰旋转轴）：末端法兰盘自转，驱动喷嘴或夹爪旋转。\n【黄金口诀】：‘前三轴（J1-J3）定大局，把工具送到三维空间坐标；后三轴（J4-J6）调细节，把工具角度精确对准工作面！’")

    p = doc.add_paragraph(); style_heading_2(p, "2. 三大点动坐标系：以谁为基准？")
    p = doc.add_paragraph()
    style_body_p(p, "点动（Jogging）是指通过手柄微量试动机械臂。选错坐标系是新手最容易撞机的根源：\n· ① 关节坐标系（Joint）：最原始模式。按一下某键，对应的那个单轴旋转一个角度，其他轴全锁定。末端尖端走出的是一段圆弧弧线；\n· ② 基坐标系（Base）：以机器人底座中心地面为基准（前X、右Y、上Z）。按‘Z轴上升’，六个关节智能联动，末端尖端走出一条绝对笔直的垂直竖线；\n· ③ 工具坐标系（Tool）：以安装在末端的工具自身尖端为基准。不管机械臂扭成什么姿势，按‘Tool-Z进给’，工具就会笔直顺着枪膛轴线向前推进！")

    add_ideology_box(doc, "敬畏规程与生命红线", 
                     "在自动化车间与建造现场，机械臂的事故往往发生在‘手动点动调试’期间。某些老员工自恃技术熟练，擅自将点动速度调到 100% 全速，或者眼睛死死盯着前方的螺丝刀头，完全没有察觉后方坚硬沉重的 J2 大臂正在快速向后摆动，最终引发严重的挤压伤亡事故。工程操作千万条，遵章守纪第一条！手握示教器，就是手握他人与自身的生命安危，严禁单盯尖端忽视全局！")

    # 四、任务实施
    p_s = doc.add_paragraph(); style_heading_1(p_s, "四、任务实施")
    
    p = doc.add_paragraph(); style_heading_2(p, "关卡 1：盲盒猜轴与关节单动")
    p = doc.add_paragraph()
    style_body_p(p, "打开网页进入【六轴识读与点动沙盒】：\n1. 在左侧面板依次点击 J1 至 J6 单动按钮，观察画面中高亮发光的关节部位；\n2. 【猜一猜】：如果只按住 J5 旋转，长喷枪最前端的喷嘴是在原地自转，还是在空间画圆弧？\n3. 实际在网页中测试：观察带有长偏置的工具在 J5 转动时划出的黄色轨迹线，验证你的判断！")
    add_alert_box(doc, "知识提示", "后三轴调姿态是在工具很短的前提下。当安装了长达 30cm 的加长喷枪时，单转手腕 J5，喷嘴在空间其实是在剧烈画大圆弧！切忌误以为腕部旋转尖端就绝对不动。", "knowledge")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 2：基坐标 +Z vs 工具坐标 +Z 决战")
    p = doc.add_paragraph()
    style_body_p(p, "当前机械臂末端喷枪处于向前倾斜 45° 姿态：\n1. 点击【基座 +Z 移动】，观察空间绿色移动箭头朝向（垂直朝天）；\n2. 点击【工具 +Z 移动】，观察空间红色移动箭头朝向（沿着倾斜喷枪向前斜向下方刺出）；\n3. 【工程实操题】：如果要在该倾斜面上钻孔，应该选哪个坐标系进给才不会把钻头别断？")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 3：排查点动条件卡（安全闭环）")
    p = doc.add_paragraph()
    style_body_p(p, "在界面右上角调出【点动安全条件卡】：\n1. 系统模拟了三种隐患情境（情境A：速度设为 100% 全速；情境B：人员站在机械臂扫掠扇区内；情境C：工具参数未校准）；\n2. 尝试找出界面中缺失的安全项，逐一点击确认后，观察点动使能指示灯是否由红转绿。")
    add_alert_box(doc, "安全提示", "点动‘三大保命铁律’：① 速度严禁超限（≤250 mm/s）；② 使能开关保持半压（压死或松开立刻急停）；③ 视线必须兼顾整臂扫掠空间！", "safety")

    # 五、成果记录
    p_s = doc.add_paragraph(); style_heading_1(p_s, "五、成果记录")
    p = doc.add_paragraph(); style_table_title(p, "表3-2-2 六轴关节动作与点动模式记录表")
    t = doc.add_table(rows=5, cols=4)
    format_grid_table(t, [Inches(1.5), Inches(1.8), Inches(1.5), Inches(1.7)],
                      ["测试项目", "操纵轴号 / 模式", "实测运动轨迹特征", "通关核定"],
                      [
                          ["腰部大范围调向", "J1 回转关节", "整臂带动工具沿水平面做 360° 旋转", "✓ 动作识读准确"],
                          ["工具长臂下压", "J2 与 J3 俯仰关节", "大臂前推、小臂弯折，工具位置发生剧变", "✓ 前三轴定位置验证通过"],
                          ["斜向钻孔推进", "工具坐标系 Tool-Z", "钻头严格顺着自身倾斜中心线笔直推进", "✓ 坐标系匹配正确"],
                          ["偏置 J5 反例排查", "J5 腕部俯仰", "长喷嘴未定点，在空中划出大半径圆弧", "✓ 破除盲区认知误区"]
                      ])
    p = doc.add_paragraph()
    style_body_p(p, "【操作铁律记录】：在执行示教点动前，操作员必须确认的四项条件是：①【 速度限制在安全低速 】，②【 明确当前坐标系与移动方向 】，③【 确认工具参数无误 】，④【 扫掠区域无人员障碍物 】。")

    # 六、达标评价
    p_s = doc.add_paragraph(); style_heading_1(p_s, "六、达标评价")
    p = doc.add_paragraph(); style_table_title(p, "表3-2-3 任务3-2 达标评价表")
    t = doc.add_table(rows=5, cols=5)
    format_grid_table(t, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价维度", "达标考核要点", "自评", "互评", "教师核评"],
                      [
                          ["轴位识读", "能准确指出J1-J6轴名并说清各自在整体运动中的分工", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["坐标应用", "能准确判断关节圆弧与基坐标/工具坐标直线的区别并精准应用", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["反例辨析", "能透彻分析偏置工具在单轴旋转时发生的尖端位移反例", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["安全素养", "严守低速点动安全铁律，大拇指轻按使能，防盲区碰撞意识强", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_s = doc.add_paragraph(); style_heading_1(p_s, "七、拓展延伸")
    p = doc.add_paragraph()
    style_body_p(p, "传统工业机器人示教完全依赖示教盒点动按键，工人需要经过数周专业培训才能胜任。而伴随现代传感器技术的演进，搭载关节力矩传感器的‘协作机器人（Cobot）’实现了免按键的‘零重力拖动示教’：工人师傅直接伸出双手握住喷枪，如同握着徒弟的手一样，在墙面上自然绘制出流畅的 S 形喷涂轨迹，机器人便能在 1 毫秒内同步采样记录上千组关节脉冲。这种将人类工匠的肌肉记忆与机器人的高精度执行完美融合的人机协作模式，正成为智能建造施工落地最具生命力的新前沿。")

    add_embedded_image(doc, "artifacts/screenshots/retained/.local/chapter3-unified/3-2.png", 
                       "图3-2-3 配套平台实训工位：六轴机械臂关节识读与点动沙盒界面")

    # =========================================================================
    # TASK 3-3
    # =========================================================================
    doc.add_page_break()
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(10)
    r = p_t.add_run("任务3-3  关节驱动、减速器与传动机构")
    apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(15, 23, 42))

    # 一、任务描述
    p_s = doc.add_paragraph(); style_heading_1(p_s, "一、任务描述")
    p = doc.add_paragraph()
    style_body_p(p, "在装配式建筑构件厂，一台数十吨重的巨型六轴机械臂在空中平稳挥舞，抓取数百公斤的预制梁板时分毫不差。如果你拆开机械臂厚重的铸铁外壳，会惊讶地发现内部驱动大关节的伺服电机只有保温杯大小，本身的旋转扭矩甚至抵不上一个普通成年人的臂力！这小小的电机，到底凭什么能够撬动沉重的钢铁手臂？为什么机械臂停止通电时不会被自身重力拉得垮塌滑落？这背后离不开工业机器人的‘力量放大器’——精密减速器，以及‘大脑—神经—肌肉’紧密协同的伺服闭环回路。如果选型失误，轻则动作剧烈抖动、加工尺寸报废，重则减速器内部核心齿轮瞬间崩断。")
    p = doc.add_paragraph()
    style_body_p(p, "本任务要求你深入机械臂关节内部，理清控制器、驱动器、电机、编码器与减速器的动力传递与反馈回路，通过三维虚拟实验台探索减速器‘降速增扭、功率守恒’的物理规律，辨识谐波减速器与RV减速器的结构差异，并完成滑台精密定位挑战。完成本任务后，你应能用工程理由说明‘为什么重载大关节必用RV减速器，而手腕关节常用轻型谐波减速器’。")

    # 二、学习目标
    p_s = doc.add_paragraph(); style_heading_1(p_s, "二、学习目标")
    p = doc.add_paragraph(); p.paragraph_format.line_spacing = 1.35
    r = p.add_run("知识目标："); apply_font(r, bold=True)
    r = p.add_run("说出伺服系统‘控制器—驱动器—电机—编码器’的闭环流向；掌握减速比对转速和扭矩的倍率换算公式；辨析谐波减速器与RV减速器的核心构件及优缺点。\n")
    apply_font(r)
    r = p.add_run("技能目标："); apply_font(r, bold=True)
    r = p.add_run("能在三维减速器实验台中通过旋转手轮验证传动比；能根据机械臂大关节抗过载与手腕轻量化的不同要求合理选配减速器；能根据行程与推力要求选配滚珠丝杠或齿轮齿条机构。\n")
    apply_font(r)
    r = p.add_run("素养目标："); apply_font(r, bold=True, color_rgb=RGBColor(185, 28, 28))
    r = p.add_run("【科技自立自强】了解我国高端精密减速器打破国际垄断、攻克材料与加工工艺‘卡脖子’难题的奋进历程，树立工程报国自豪感；【质量敬畏】理解减速器背隙磨损对末端精度的致命影响，养成规范保养、严禁超载的专业习惯。")
    apply_font(r)

    # 三、知识准备
    p_s = doc.add_paragraph(); style_heading_1(p_s, "三、知识准备")
    
    p = doc.add_paragraph(); style_heading_2(p, "1. 关节伺服闭环回路：动力流与反馈流")
    p = doc.add_paragraph()
    style_body_p(p, "机器人关节由四大核心部件构成严密闭环：\n· 控制器（大脑）：发出运动脉冲指令，规划每个关节每毫秒该转到什么角度；\n· 伺服驱动器（功率调节）：根据指令和反馈，精准输出驱动电机的强电电流；\n· 交流伺服电机（肌肉）：把电能高效转化为机械转速（额定转速通常高达 3000 rpm）；\n· 光电编码器（神经感受器）：同轴装在电机尾部，实时测量转动角度并飞速回传驱动器比对误差。\n【动力流向】：控制器指令 ➔ 驱动器输出电流 ➔ 电机高速转动 ➔ 减速器降速增扭 ➔ 关节运转。\n【反馈流向】：编码器测量转角 ➔ 信号回传驱动器 ➔ 实时比对修正。")

    p = doc.add_paragraph(); style_heading_2(p, "2. 减速器的物理法则：“降速增扭，功率守恒”")
    p = doc.add_paragraph()
    style_body_p(p, "伺服电机速度飞快但力矩很小（仅几牛·米），减速器的使命就是‘牺牲速度换取巨大的扭矩’！\n若减速比 $i = 100:1$：输出转速衰减为输入的 $1/100$，而输出扭矩理论上放大 100 倍！机械绝不会凭空创造能量，输出功率永远小于等于输入功率（计入机械传动效率 $\\eta$）。")

    p = doc.add_paragraph(); style_heading_2(p, "3. 机器人两大看家减速器：谐波 vs RV")
    p = doc.add_paragraph()
    style_body_p(p, "· 谐波减速器（Harmonic）：包含椭圆波发生器、薄壁外齿柔轮（金属弹性杯）、内齿刚轮三大件。依靠金属柔轮受控弹性变形啮合。优点：结构超紧凑、重量极轻（1~2 kg）、零背隙；缺点：柔轮杯壁极薄，不耐大冲击，因此【必选安装在轻巧的小臂与手腕关节（J4、J5、J6）】；\n· RV 减速器（摆线针轮）：采用行星齿轮第一级减速加双摆线针轮第二级减速。多颗坚硬针齿同时咬合承载。优点：刚度超大、耐冲击、寿命极长；缺点：自重大、制造复杂，因此【必选安装在承受整臂倾覆重力矩的底座与肩肘重载大关节（J1、J2、J3）】。")

    add_ideology_box(doc, "打破卡脖子与自主自强", 
                     "在过去的很长一段时间里，工业机器人核心零部件（减速器、伺服电机、控制器）占据整机成本的 70%，国内完全依赖进口，国外厂商不仅价格昂贵，供货周期更是长达半年以上。为了打破这种被动局面，我国科研人员和一线工匠历经十余年攻关，在极薄金属柔轮材料热处理、纳米级摆线针齿磨削工艺上取得重大突破，国产绿色谐波、双环传动等自主品牌横空出世，不仅使国产建筑机器人成本腰斩，更牢牢守住了大国智能建造的装备供应链底线！")

    # 四、任务实施
    p_s = doc.add_paragraph(); style_heading_1(p_s, "四、任务实施")
    
    p = doc.add_paragraph(); style_heading_2(p, "关卡 1：转动大猜想（谐波减速器转速实测）")
    p = doc.add_paragraph()
    style_body_p(p, "双击打开网页 `course/chapters/03/tasks/3-3/reducers.html`：\n1. 点击【拆开】，3D剖视谐波减速器椭圆波发生器如何使金属柔轮变形，并观察外齿与刚轮咬合区；\n2. 【先猜一猜】：减速比设为 $100:1$。如果在输入端用手轮整整旋转输入 100 圈，你预测输出端法兰会转动多少度？\n   □ 360°（整整 1 圈）　　□ 180°（半圈）　　□ 3.6°（一小格）\n3. 拖动手轮输入 100 圈，观察右侧输出刻度盘真实读数，验证你的猜想！")
    add_alert_box(doc, "操作提醒", "网页右上角形变观察转盘将柔轮径向形变差放大了 8 倍以便教学肉眼观察，三维机构中柔轮变形为真实几何比例，注意区分。", "operation")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 2：找茬思考（失控飞车的祸首）")
    p = doc.add_paragraph()
    style_body_p(p, "思考实际工况：如果工人在安装电机时不小心把电机尾部的编码器线插头碰松了，电机会发生什么现象？\n提示：驱动器接收不到任何角度反馈，会误以为电机‘还没达到目标转速’而持续拼命加大电流，导致电机瞬间过载飞车冲撞或报警停机！")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 3：滑台打靶赛（运动转换实验室）")
    p = doc.add_paragraph()
    style_body_p(p, "切换至【运动转换实验室】（`conversion.html`）：\n1. 目标是将滚珠丝杠滑块精准停在 64 mm 的靶心刻度线上；\n2. 分别选用导程 4 mm、8 mm 与 16 mm 做实验，比试一下：选择哪种导程，旋转几圈能最快且最精准地击中靶心？")

    # 五、成果记录
    p_s = doc.add_paragraph(); style_heading_1(p_s, "五、成果记录")
    p = doc.add_paragraph(); style_table_title(p, "表3-3-2 减速传动探究与选型记录单")
    t = doc.add_table(rows=5, cols=4)
    format_grid_table(t, [Inches(1.5), Inches(1.8), Inches(1.5), Inches(1.7)],
                      ["实验探究项目", "实操数据与读数", "机理解释", "通关核验"],
                      [
                          ["谐波减速比实测", "输入 100 圈，输出法兰旋转刚好 360°", "减速比 $i=100:1$，转速缩小100倍", "✓ 传动比验证准确"],
                          ["扭矩放大测算", "输入 2 N·m，理论输出达到 160～180 N·m", "功率守恒，转速衰减换来力矩倍增", "✓ 扭矩计算通过"],
                          ["肩部重载选型", "选择【RV 减速器】", "多针齿咬合，刚度极大耐冲击", "✓ 重载选型正确"],
                          ["手腕轻量选型", "选择【谐波减速器】", "体积超紧凑自重轻，利于提高加速度", "✓ 手腕选型正确"]
                      ])
    p = doc.add_paragraph()
    style_body_p(p, "【滑台打靶成绩单】：选用导程为【 8 】mm 的丝杠，使滑块从 0 推进到 64 mm，需要手轮旋转输入【 8 】圈。")

    # 六、达标评价
    p_s = doc.add_paragraph(); style_heading_1(p_s, "六、达标评价")
    p = doc.add_paragraph(); style_table_title(p, "表3-3-3 任务3-3 达标评价表")
    t = doc.add_table(rows=5, cols=5)
    format_grid_table(t, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价维度", "达标考核要点", "自评", "互评", "教师核评"],
                      [
                          ["伺服闭环", "能准确理清控制器、驱动器、电机、编码器的信号与动力流", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["机构识读", "能说出谐波三大件与RV减速器的结构特点与传动比换算", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["实战选型", "能针对抗过载冲击与轻巧灵敏不同要求合理选配减速器", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["素养表现", "了解核心零部件自主攻坚历史，具备对机械精度的敬畏之心", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_s = doc.add_paragraph(); style_heading_1(p_s, "七、拓展延伸")
    p = doc.add_paragraph()
    style_body_p(p, "在最新的高端协作机器人中，‘力矩电机 + 双编码器直接驱动（Direct Drive）’正在崭露头角。由于完全取消了机械减速器，机械背隙与磨损直接降为零。然而在建筑等高负载重工况场景下，大扭矩直驱电机体积巨大、发热严重。这启示我们：工程技术的演进绝非‘非黑即白’，任何先进技术的落地都必须在功率密度、自重、刚度与维护成本之间做出平衡，没有包治百病的万能方案，只有立足具体工况的精益取舍。")

    add_embedded_image(doc, "artifacts/screenshots/retained/.local/chapter3-unified/3-3a.png", 
                       "图3-3-3 配套平台实训工位：减速器传动与运动转换仿真界面")

    # =========================================================================
    # TASK 3-4
    # =========================================================================
    doc.add_page_break()
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(10)
    r = p_t.add_run("任务3-4  末端执行器、TCP与工具控制")
    apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(15, 23, 42))

    # 一、任务描述
    p_s = doc.add_paragraph(); style_heading_1(p_s, "一、任务描述")
    p = doc.add_paragraph()
    style_body_p(p, "在剪力墙施工现场，同一台六轴机器人上午安装偏置喷枪均匀喷涂防碳化涂层，下午换装真空吸盘搬运预制大理石板材，傍晚换上高速打磨机进行抹平打磨。机械臂本体自始至终没有更换，但真正干活的‘末端工具’却换了三茬。当机器人换上了一支 30 厘米长的新喷枪，机器人系统是如何获知‘枪口到底在什么位置’的？如果操作人员换上新工具后，没有在系统里更新工具参数，机器人就会误把原来短平的吸盘位置当作现在的枪口位置，手腕一转，长喷枪就会瞬间像长棍一样狠狠横扫砸向墙体！")
    p = doc.add_paragraph()
    style_body_p(p, "本任务要求你从施工现场真实工具出发，识别喷枪、夹爪、吸盘等末端执行器的真实工作点，熟悉自动工具快换装置（ATC）的工作机制，透彻理解 TCP（工具中心点）与几何偏置的核心概念，并在三维虚拟工位中完成经典的‘四点标定法’对针与姿态自转复核。完成本任务后，你应能用工程理由说明‘为什么更换工具后必须重新校核TCP，否则手腕旋转时末端尖端就会发生偏心甩动’。")

    # 二、学习目标
    p_s = doc.add_paragraph(); style_heading_1(p_s, "二、学习目标")
    p = doc.add_paragraph(); p.paragraph_format.line_spacing = 1.35
    r = p.add_run("知识目标："); apply_font(r, bold=True)
    r = p.add_run("说出喷枪、夹具、吸盘的真实工作点位置；了解工具快换装置的机械锁紧与电气信号确认过程；理解 TCP、法兰原点与空间偏置坐标 $(X, Y, Z)$ 的几何意义。\n")
    apply_font(r)
    r = p.add_run("技能目标："); apply_font(r, bold=True)
    r = p.add_run("能在三维实验台为不同工具标定合适的工作点；能通过四点标定法在三维模型中采集四组大角度姿态并计算出唯一球心偏置；能执行‘换姿态定点自转复核’。\n")
    apply_font(r)
    r = p.add_run("素养目标："); apply_font(r, bold=True, color_rgb=RGBColor(185, 28, 28))
    r = p.add_run("【毫厘必争的严谨工匠精神】理解 TCP 偏差超过 1 毫米在施工中就会导致空鼓、拉毛或划伤，树立对工程精度负责的崇高职业道德；【防微杜渐的核验意识】养成‘换工具必核参数、开工前必做低速空走复核’的规范作业习惯。")
    apply_font(r)

    # 三、知识准备
    p_s = doc.add_paragraph(); style_heading_1(p_s, "三、知识准备")
    
    p = doc.add_paragraph(); style_heading_2(p, "1. 真实工作点：工具不同，作用点各异")
    p = doc.add_paragraph()
    style_body_p(p, "六轴机械臂末端的圆形金属盘称为‘法兰原点’。法兰盘本身不直接接触工件，真正的工艺作用发生在工具前端：\n· 喷漆喷枪：真实工作点在【喷嘴出漆口前方涂料雾化交汇中心】；\n· 砌砖夹爪：真实工作点在【双指闭合的夹持中心面】；\n· 真空吸盘：真实工作点在【橡胶唇边贴合平面的几何中心】；\n· 打磨磨盘：真实工作点在【旋转砂纸与墙体接触面的中心】。\n工作点是由工艺要求决定的参考点，它不一定是工具外壳的几何重心，也可能悬在空中（如雾化焦点）。")

    p = doc.add_paragraph(); style_heading_2(p, "2. 什么是 TCP？为什么换工具必须标定？")
    p = doc.add_paragraph()
    style_body_p(p, "TCP 即工具中心点（Tool Center Point）。在机器人出厂时，系统的‘眼睛’默认以为‘工具尖端就在第六轴法兰盘中心’。安装工具后，必须告诉系统工具尖端相对于法兰盘的偏置距离（例如：向前延伸 $Z = 300\text{ mm}$，向上偏了 $X = 50\text{ mm}$）。\n【标定成功的奇迹】：标定前，旋转手腕，长工具尖端会绕法兰盘画大圆弧甩动；标定成功后，手腕不管怎么倾斜翻滚，工具尖端就像被一枚图钉死死钉在空中一样定点自转！")

    p = doc.add_paragraph(); style_heading_2(p, "3. 经典的‘四点标定法’数学机理")
    p = doc.add_paragraph()
    style_body_p(p, "怎么测出精确的偏置值？工人不可能拿普通卷尺去量，最经典实用的就是‘四点法’：\n在作业范围内固定一根尖锐的基准针尖。操作员控制机械臂以 4 种互差角度很大（>30°）的不同姿态，分别让工具尖端‘针尖对针尖’精准碰触这个固定点！\n【数学奇迹】：工具尖端绕着同一个固定不动的心点转动了 4 次。控制器根据法兰盘中心在这 4 个姿态下的空间坐标，利用空间四点共球面的几何相交方程，瞬间反算出唯一的球心偏置量！")

    add_ideology_box(doc, "差之毫厘，谬以千里", 
                     "在现代高精度智能建造中，无论是装配式建筑毫米级的套筒灌浆定位，还是高层幕墙密封胶的均匀涂布，决定工程合格与否的关键往往就在 1 毫米之内。若操作人员心存侥幸、马虎大意，换装工具后偷懒沿用旧参数，喷枪距离墙面的微小偏差就会造成涂层大面积流坠返工，造成数万元的材料浪费和工期延误。新一代智能建造技能人才，必须传承精益求精的当代鲁班精神，敬畏参数、严谨标定，守住工程质量的第一道防线！")

    # 四、任务实施
    p_s = doc.add_paragraph(); style_heading_1(p_s, "四、任务实施")
    
    p = doc.add_paragraph(); style_heading_2(p, "关卡 1：名侦探找茬——失控甩动的长喷枪")
    p = doc.add_paragraph()
    style_body_p(p, "打开网页 `course/chapters/03/tasks/3-4/index.html`：\n1. 在左侧工具柜点击【偏置喷枪】，机械臂末端自动装配上带倾角的长喷枪；\n2. 点击【参数未匹配状态下的姿态转动】演示，仔细观察喷枪尖端的运动轨迹；\n3. 【找茬排错】：喷枪尖端是在原地自转，还是在画大圆弧剧烈甩动？如果此时在狭小管道井作业会发生什么？")
    add_alert_box(doc, "知识提示", "未标定 TCP 时，机器人控制的是法兰中心，工具尖端必然产生离心甩动，这就是‘换工具不改参数’引发碰撞事故的物理真相！", "knowledge")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 2：三维虚拟对针（四点标定实操）")
    p = doc.add_paragraph()
    style_body_p(p, "1. 调出虚拟基准探针；\n2. 分别调整机械臂姿态（大俯角、仰角、左侧倾、右侧倾），控制喷枪尖端依次轻碰针尖；\n3. 点击【记录姿态位姿】，完成 4 组坐标采集；\n4. 点击【求解偏置（Calculate）】，系统瞬间计算出偏置坐标 $(X, Y, Z)$ 并报告残差误差。")
    add_alert_box(doc, "操作提醒", "四次姿态必须互差较大角度（推荐 >30°）。如果四次姿态几乎平行，空间球面方程将无法收敛，系统会报警‘秩亏/姿态过近’拒绝对话！", "operation")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 3：定海神针——换姿态旋转复核")
    p = doc.add_paragraph()
    style_body_p(p, "1. 标定完成后，点击【换姿态复核】；\n2. 观察手柄旋转手腕姿态时喷枪尖端的表现；\n3. 尖端是否牢牢定在参考点上自转？如果晃动量 < 0.5 mm，则恭喜通关！")

    # 五、成果记录
    p_s = doc.add_paragraph(); style_heading_1(p_s, "五、成果记录")
    p = doc.add_paragraph(); style_table_title(p, "表3-4-2 工具换装与TCP标定记录单")
    t = doc.add_table(rows=4, cols=4)
    format_grid_table(t, [Inches(1.5), Inches(1.8), Inches(1.5), Inches(1.7)],
                      ["实训任务项", "操作记录与实测数据", "分析与判定", "通关标记"],
                      [
                          ["未标定甩动排错", "喷枪尖端划出半径约 280 mm 的离心大圆弧", "系统参考点仍在法兰原点，未做偏置补偿", "✓ 事故机理排查清"],
                          ["四点标定求解", "测算偏置：$X=0.0\\text{ mm}, Y=120.0\\text{ mm}, Z=280.0\\text{ mm}$", "拟合残差误差 < 0.3 mm，精度优异", "✓ 标定计算合格"],
                          ["换姿态自转复核", "旋转手腕姿态，喷枪尖端静止定点自转（晃动量 < 0.5 mm）", "成功实现定点姿态调节，消除扫掠风险", "✓ 标定复核通过"]
                      ])
    p = doc.add_paragraph()
    style_body_p(p, "【安全操作铁律总结】：现场换工具后必须执行的两个关键闭环步骤：①【 确认工具机械自锁与信号到位 】，②【 调用对应工具的TCP参数并低速空走复核 】。")

    # 六、达标评价
    p_s = doc.add_paragraph(); style_heading_1(p_s, "六、达标评价")
    p = doc.add_paragraph(); style_table_title(p, "表3-4-3 任务3-4 达标评价表")
    t = doc.add_table(rows=5, cols=5)
    format_grid_table(t, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价维度", "达标考核要点", "自评", "互评", "教师核评"],
                      [
                          ["工作点识读", "能准确指出喷枪、吸盘、钻头的真实工艺作用点位置", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["原理理解", "能说清四点标定为何必须要求大角度姿态而不能平行", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["实操复核", "能在网页中完成四点采集并成功通过换姿态旋转验证", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["工匠素养", "具备毫厘必争的严谨态度，不糊弄数据，严格排查甩动", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_s = doc.add_paragraph(); style_heading_1(p_s, "七、拓展延伸")
    p = doc.add_paragraph()
    style_body_p(p, "随着机器视觉与激光跟踪仪的普及，工程现场正在探索“机器人末端自校准系统”。机械臂只需在激光相机前快速挥舞两次，视觉系统就能在 3 秒钟内利用特征光斑全自动逆向反算出高精度的工具姿态矩阵，完全替代了人工手动对针。然而，无论外部检测工具多么先进，技术人员脑海中对 TCP 几何关系的深刻理解永远是识别算法异常、处理现场漂移故障的终极杀手锏。")

    add_embedded_image(doc, "artifacts/screenshots/retained/.local/chapter3-unified/3-4.png", 
                       "图3-4-3 配套平台实训工位：末端执行器展台与TCP标定虚拟仿真界面")

    # =========================================================================
    # TASK 3-5
    # =========================================================================
    doc.add_page_break()
    p_t = doc.add_paragraph()
    p_t.paragraph_format.space_before = Pt(16)
    p_t.paragraph_format.space_after = Pt(10)
    r = p_t.add_run("任务3-5  移动底盘与行走机构")
    apply_font(r, size_pt=15, bold=True, color_rgb=RGBColor(15, 23, 42))

    # 一、任务描述
    p_s = doc.add_paragraph(); style_heading_1(p_s, "一、任务描述")
    p = doc.add_paragraph()
    style_body_p(p, "在施工现场，各种建筑机器人的‘下盘功夫’各显神通：有的像巡逻小车在光滑平整的混凝土地坪上飞快穿梭；有的披着厚重履带在满是碎石泥浆的基坑边坡上稳步爬行；还有的像机器狗一样迈开四条仿生机械腿轻松翻过门槛、跨上楼梯；在钢制储罐与高耸塔吊上，甚至还能见到紧紧吸附在立面上垂直行走的‘蜘蛛人爬壁机器人’。同样是在工地上移动，为什么不同机型会选用完全不同的行走底盘？进入狭小的室内楼道后，面对直角墙角，为什么有的机器人可以潇洒地原地掉头，有的却会被硬生生卡在走廊拐角？")
    p = doc.add_paragraph()
    style_body_p(p, "本任务要求你全面认识轮式、履带式、足式、轨道式及爬壁式等五大典型行走方式，深入剖析双轮差速转向、车轮偏转式阿克曼转向与麦克纳姆轮全向移动的运动机理，并在三维驾驶赛道中挑战狭窄死胡同脱困、麦轮贴墙横向漂移及连续避障倒车入库。完成本任务后，你应能用工程理由说明‘为什么室内巡检设备必选差速或全向底盘，而室外土方环境必选履带底盘’。")

    # 二、学习目标
    p_s = doc.add_paragraph(); style_heading_1(p_s, "二、学习目标")
    p = doc.add_paragraph(); p.paragraph_format.line_spacing = 1.35
    r = p.add_run("知识目标："); apply_font(r, bold=True)
    r = p.add_run("认识轮式、履带式、足式、轨道式与爬壁式的结构特征与地面适应性；理解双轮差速机构通过转速差实现直行、转弯与原地自转的数学逻辑；了解麦克纳姆轮 45° 滚子全向移动原理。\n")
    apply_font(r)
    r = p.add_run("技能目标："); apply_font(r, bold=True)
    r = p.add_run("能根据左右车轮的速度与方向准确推演机身运动状态；能准确区分‘车头变向的原地自转’与‘车头不变向的原地横移’；能根据门槛高度、楼道净宽等现场工况做出合理的底盘选型与通行核对。\n")
    apply_font(r)
    r = p.add_run("素养目标："); apply_font(r, bold=True, color_rgb=RGBColor(185, 28, 28))
    r = p.add_run("【因地制宜与科学辩证法】树立因地制宜的工程选型理念，破除对特定行走方式的迷信，认识到没有万能的底盘，只有与地面工况完美契合的结构；【关爱劳动者的人文情怀】感受智能机器人将工人从高危泥泞、重载恶劣环境中解脱出来的重大时代意义。")
    apply_font(r)

    # 三、知识准备
    p_s = doc.add_paragraph(); style_heading_1(p_s, "三、知识准备")
    
    p = doc.add_paragraph(); style_heading_2(p, "1. 机器人五大典型行走方式大比拼")
    p = doc.add_paragraph()
    style_body_p(p, "建筑工地地面极其多样，直接决定了移动底盘的类型选择：\n· 轮式底盘：依靠车轮滚动。在已硬化的混凝土地坪上速度最快、效率最高，但在松软沙土中极易打滑陷车；\n· 履带式底盘：依靠闭合履带大面积接触地面。接地比压极低（分散车重），在松软湿烂泥地、砂石坑洼及斜坡上通过性天下第一，但转向时对地表有撕裂剪切，且履带自重沉重；\n· 足式仿生底盘（机器狗/双足）：多条机械腿交替迈步。最大优势是‘离散点接触，能选落脚点’，能轻松跨越电缆、门槛和爬上陡峭楼梯，但控制算法极其复杂、电池续航较短、负载有限；\n· 轨道式底盘：沿预埋钢轨往返移动。定位极其精准、刚度极大，但灵活性最差，无法脱离铁轨；\n· 爬壁式底盘：结合负压真空吸附或强磁吸附在立面行走，专用于高空清洗与大型储罐探伤。")

    p = doc.add_paragraph(); style_heading_2(p, "2. 怎样实现原地转弯与横向平移？")
    p = doc.add_paragraph()
    style_body_p(p, "工地狭窄走廊里最怕‘转不过弯’！移动底盘有三种主流转向机理：\n① 双轮差速转向（最普及）：左轮和右轮由两个独立电机驱动。两轮向前同速 ➔ 直行；右轮转得快、左轮转得慢 ➔ 向左小转弯；【绝技】：若左轮倒转、右轮正转（速度大小相等、方向相反），小车就会绕着两轮连线中心【原地 360° 旋转自转】！转弯半径为零，非常适合狭窄转角调头！\n② 汽车式阿克曼转向：依靠车舵机扳动前轮偏转角度。转弯时车身必须走一条大弧线，转弯半径大，无法实现原地掉头，狭窄通道极易被别死；\n③ 麦克纳姆轮（Mecanum，全向轮）：轮子外圈镶嵌有一圈带有 45° 倾角的可自由旋转的倾斜小滚子。四个麦轮独立控制正反转时，滚子的斜向摩擦分力相互抵消或叠加，神奇的现象发生了——车头朝向纹丝不动，小车却能像螃蟹一样【原地直接向左、向右横向平移】！这对于靠墙打磨、喷涂机器人的微调对齐而言是无与伦比的神器！")

    add_ideology_box(doc, "因地制宜与辩证工程观", 
                     "在建筑装备选型中，很多初学者总以为‘轮式最便宜、履带最笨重、足式最先进’。其实工程界讲求最纯粹的辩证法：在硬化地坪上，轮式小车的能耗只有机器狗的几十分之一；但在未完工的基坑淤泥里，几百万元的机器狗连一步都迈不开，只有厚重的履带车能如履平地。科技的最高境界不是追求炫酷，而是尊重现场实际条件，因地制宜发挥每种机械的独特价值！")

    # 四、任务实施
    p_s = doc.add_paragraph(); style_heading_1(p_s, "四、任务实施")
    
    p = doc.add_paragraph(); style_heading_2(p, "关卡 1：狭窄死胡同脱困（双轮差速原地自转）")
    p = doc.add_paragraph()
    style_body_p(p, "打开网页 `course/chapters/03/tasks/3-5/index.html`，进入【轮式操纵】模块：\n1. 选用【双轮差速底盘】，小车正开入狭窄通道内；\n2. 【先猜一猜】：如果设置左轮为 -100 rpm（倒转），右轮为 +100 rpm（正转），小车会发生什么？\n   □ 在原地卡死不动　　□ 画大圆弧向前转　　□ 以两轮中心为圆心原地 360° 自转\n3. 键盘按 A 键或在面板输入参数，观察小车在死胡同内原地潇洒调头脱困！")
    add_alert_box(doc, "操作提醒", "差速原地自转时转弯半径为零，但长方形车体的四个角在旋转时会扫掠出一个外接圆。必须核实外接圆直径是否小于走廊净宽，防止车尾横向蹭墙！", "operation")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 2：螃蟹步侧移（麦克纳姆轮全向漂移）")
    p = doc.add_paragraph()
    style_body_p(p, "1. 切换至【麦克纳姆轮全向底盘】；\n2. 键盘按 A/D 键操纵小车左右移动，仔细观察小车的车头朝向；\n3. 车头朝向是否改变？【 是 / 否 】；\n4. 【工程思考】：在紧贴墙面的喷涂作业中，为什么麦轮直接横移比差速小车反复调向好用得多？")

    p = doc.add_paragraph(); style_heading_2(p, "关卡 3：智能建造‘特种驾考’（驾驶闯关赛）")
    p = doc.add_paragraph()
    style_body_p(p, "点击【驾驶闯关】模式，按下【开始挑战】：\n1. 操纵小车沿黄色路线行进，依次通过蓝色检查点，最终停入绿色泊位；\n2. 挑战 01 关（双轮差速·转身进站）、02 关（麦克纳姆·横移入位）、03 关（转向轮底盘·转弯空间）；\n3. 记录通关星级与碰撞次数！")

    # 五、成果记录
    p_s = doc.add_paragraph(); style_heading_1(p_s, "五、成果记录")
    p = doc.add_paragraph(); style_table_title(p, "表3-5-2 移动底盘特性与驾驶实测记录单")
    t = doc.add_table(rows=5, cols=4)
    format_grid_table(t, [Inches(1.5), Inches(1.8), Inches(1.5), Inches(1.7)],
                      ["测试挑战项目", "底盘类型 / 操纵动作", "实测运动轨迹特征", "通关成绩与标记"],
                      [
                          ["死胡同零半径掉头", "双轮差速（左反右正）", "车体绕中心原地 360° 自旋转身", "✓ 原地自转通过"],
                          ["贴墙全向平移", "麦克纳姆轮（A/D横移）", "车头朝向保持不变，车身直接左右侧移", "✓ 麦轮横移通过"],
                          ["第 01 关驾考", "双轮差速·转身进站", "转弯半径小，精准泊入绿色车位", "【 3 】星通关，碰撞 0 次"],
                          ["第 02 关驾考", "麦克纳姆·横移入位", "不掉头直接横向平移切入狭小泊位", "【 3 】星通关，碰撞 0 次"]
                      ])
    p = doc.add_paragraph()
    style_body_p(p, "【工程选型一句话结论】：室内狭窄走廊巡检优先选【 双轮差速 】底盘；紧贴墙面高精度作业优先选【 麦克纳姆轮 】底盘；室外基坑软泥优先选【 履带式 】底盘。")

    # 六、达标评价
    p_s = doc.add_paragraph(); style_heading_1(p_s, "六、达标评价")
    p = doc.add_paragraph(); style_table_title(p, "表3-5-3 任务3-5 达标评价表")
    t = doc.add_table(rows=5, cols=5)
    format_grid_table(t, [Inches(1.2), Inches(2.5), Inches(0.9), Inches(0.9), Inches(1.0)],
                      ["评价维度", "达标考核要点", "自评", "互评", "教师核评"],
                      [
                          ["底盘识读", "能正确区分轮式、履带、足式与爬壁的物理接触特征", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["差速推演", "能熟练根据左右轮电机差速推演小车直行、转弯与自转", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["麦轮横移", "能说清麦轮 45° 滚子分力合成机理与车头不变横移优势", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"],
                          ["实战驾控", "在驾驶闯关中以低碰撞率精准泊车，具备空间避障素养", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进", "□ 达标\n□ 需改进"]
                      ])

    # 七、拓展延伸
    p_s = doc.add_paragraph(); style_heading_1(p_s, "七、拓展延伸")
    p = doc.add_paragraph()
    style_body_p(p, "轮式、履带与足式并不是水火不容的绝对对立面。在最新型的特种建筑机器人中，我国工程师创造性地发明了‘轮足复合式机器人（Wheel-Leg Hybrid）’：在四条机械腿的脚腕最下端，额外安装了一个高速无刷轮毂电机！当处于平整光滑的地坪上时，四条腿锁死姿态，底部的车轮飞速滚动，兼具轮式底盘的高速节能优势；而一旦遇到台阶、深坑或乱石堆，车轮立刻抱闸锁死变成防滑橡胶脚爪，机器人瞬间‘站立’起来迈步跨越障碍！这种打破单一构型思维的复合创新，正是智能建造装备不断攻克复杂极端现场的未来密码。")

    add_embedded_image(doc, "artifacts/screenshots/retained/.local/chapter3-unified/3-5.png", 
                       "图3-5-3 配套平台实训工位：移动底盘动力学与差速运动仿真界面")

    # Save
    out_docx = Path("docs/第三章教材与实训任务页.docx")
    out_docx.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(out_docx))
    
    pkg_docx = Path("artifacts/packages/第三章教材与实训任务页.docx")
    pkg_docx.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(pkg_docx))
    
    print(f"Successfully generated YaHei Chapter 3: {out_docx} and {pkg_docx}")

if __name__ == "__main__":
    build_chapter3_docx()
