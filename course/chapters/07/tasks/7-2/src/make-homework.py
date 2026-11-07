"""生成任务 7-2 期末作业的 Excel 模板：../立面巡检记录表模板.xlsx
在本任务目录执行：python src/make-homework.py （需要 openpyxl）
模板里只有表头、一行示例和六个点位的空行；示例用虚构点位，不给出 A1～B3 的答案。
"""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import CellIsRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

OUT = Path(__file__).resolve().parent.parent / '立面巡检记录表模板.xlsx'
BLUE, SOFT, GREY = '2467C9', 'E6F0FF', 'F2F4F7'
thin = Side(style='thin', color='C9D6E6')
box = Border(left=thin, right=thin, top=thin, bottom=thin)
head_font = Font(bold=True, color='FFFFFF')
head_fill = PatternFill('solid', fgColor=BLUE)
example_font = Font(italic=True, color='7A8899')
example_fill = PatternFill('solid', fgColor=GREY)
wrap = Alignment(wrap_text=True, vertical='top')
center = Alignment(horizontal='center', vertical='center', wrap_text=True)


def title(ws, text, span):
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=span)
    c = ws.cell(1, 1, text)
    c.font = Font(bold=True, size=14, color=BLUE)
    ws.row_dimensions[1].height = 26


def header(ws, row, names, widths):
    for i, (name, width) in enumerate(zip(names, widths), 1):
        c = ws.cell(row, i, name)
        c.font, c.fill, c.alignment, c.border = head_font, head_fill, center, box
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[row].height = 34


def body_row(ws, row, values, example=False):
    for i, v in enumerate(values, 1):
        c = ws.cell(row, i, v)
        c.border, c.alignment = box, wrap
        if example:
            c.font, c.fill = example_font, example_fill


wb = Workbook()

# —— 作业说明 ——
ws = wb.active
ws.title = '作业说明'
title(ws, '期末作业：教学楼东立面无人机巡检记录表', 2)
ws.column_dimensions['A'].width = 16
ws.column_dimensions['B'].width = 96
rows = [
    ('作业内容', '在网页“无人机立面巡检”里完成六个点位（A1～B3）的采集与复核后，用本模板整理一份可以交给别人核对的巡检记录表。'),
    ('提交文件', '文件名：班级_姓名_立面巡检记录.xlsx；保留本模板的四张工作表，不要改表头。'),
    ('巡检记录', '每个点位一行，共 6 行。照片编号、拍摄参数、“照片一格代表多少毫米”和“拖影几格”照抄网页上该点位最新照片的读数。'),
    ('合格判断', '本课条件：照片一格代表不超过 2.5 毫米、拖影不超过 1.5 格、偏离正对不超过 25°。三条都满足填“合格”，否则填“不合格”并写明哪一条不满足。'),
    ('我的判断', '三选一：保留疑似病害 / 排除误报 / 证据不足，补拍。预设检测分数高不等于病害成立；没有检测框的照片也要自己检查。'),
    ('判断理由', '不少于 15 个字，写你在照片上看到的形态（直线还是弯曲、有无分叉、边缘是否规则）、位置（窗角、窗下、分格处）和用到的对照资料。不能只写“有裂缝”。'),
    ('补拍与历史', '凡是补拍过的点位，在“补拍与复核历史”里每次补拍记一行：旧照片编号、新照片编号、改了哪个拍摄条件、补拍前后的判断。旧照片不删除。'),
    ('人工补记漏检', '预设检测漏掉的疑点，写清在照片上的位置（如“窗右下方竖向细线”），并在“处理建议”里写下一步怎么复查。'),
    ('汇总与结论', '在“汇总与结论”里用公式统计（已给出示例公式，可以改进），再写一段 100～200 字结论：哪些点位需要近距复查、哪些是误报及原因、下次航拍要注意什么。结尾注明：本记录为外观初筛，不判定结构安全。'),
    ('表格规范', '表头冻结、列宽合适能看全文字；“照片是否合格”用颜色区分（模板已设好条件格式）；日期时间格式统一。'),
    ('评分（100 分）', '数据完整准确 30：六个点位齐全，参数和读数与网页一致\n判断正确 25：误报已排除、漏检已补记、证据不足的点位已补拍\n理由充分 20：每条理由写出形态、位置和依据\n补拍可追溯 10：新旧照片编号和改动的条件对得上\n汇总与结论 10：公式正确，结论具体、不夸大\n表格规范 5：命名、格式、条件格式符合要求'),
]
for r, (k, v) in enumerate(rows, 3):
    a, b = ws.cell(r, 1, k), ws.cell(r, 2, v)
    a.font, a.fill, a.alignment, a.border = Font(bold=True, color=BLUE), PatternFill('solid', fgColor=SOFT), wrap, box
    b.alignment, b.border = wrap, box
    ws.row_dimensions[r].height = 15 * (v.count('\n') + 1 + len(v) // 60) + 8

# —— 巡检记录 ——
ws = wb.create_sheet('巡检记录')
cols = [
    ('序号', 6), ('点位', 7), ('位置描述', 12), ('照片编号', 11), ('拍摄时间', 17), ('拍摄距离（米）', 9),
    ('偏离正对角度（°）', 9), ('移动速度（米/秒）', 9), ('快门（1/秒）', 9), ('照片一格代表（毫米）', 10),
    ('拖影（格）', 8), ('照片是否合格', 9), ('预设检测结果', 12), ('预设分数（%）', 8), ('我的判断', 14),
    ('判断理由（不少于15字）', 34), ('是否补拍过', 8), ('人工补记漏检', 18), ('处理建议', 22), ('记录人', 9), ('复核人', 9),
]
title(ws, '教学楼东立面（Facade-A）巡检记录　　记录人：________　复核人：________　日期：________', len(cols))
header(ws, 2, [c[0] for c in cols], [c[1] for c in cols])
body_row(ws, 3, ['示例', 'C9', '女儿墙下', 'IMG-000', '2026-06-01 09:30', 6, 0, 1, 500, 1.64, 1.22, '合格', '疑似裂缝', 80,
                 '保留疑似病害', '示例：墙面中部一条弯曲细线，中间有分叉，不在分格缝位置，保留并安排近距复查。', '否', '无',
                 '近距拍摄后由教师复核', '张三', '李四'], example=True)
cells = [('A1', '上层左区'), ('A2', '上层中区'), ('A3', '上层右区'), ('B1', '下层左区'), ('B2', '下层中区'), ('B3', '下层右区')]
for i, (cid, label) in enumerate(cells, 1):
    body_row(ws, 3 + i, [i, cid, label] + [None] * (len(cols) - 3))
    ws.row_dimensions[3 + i].height = 48
ws.row_dimensions[3].height = 48
ws.freeze_panes = 'C3'
judge = DataValidation(type='list', formula1='"保留疑似病害,排除误报,证据不足，补拍"', allow_blank=True)
okv = DataValidation(type='list', formula1='"合格,不合格"', allow_blank=True)
yn = DataValidation(type='list', formula1='"是,否"', allow_blank=True)
for dv, col in ((judge, 'O'), (okv, 'L'), (yn, 'Q')):
    ws.add_data_validation(dv)
    dv.add(f'{col}4:{col}9')
ws.conditional_formatting.add('L4:L9', CellIsRule(operator='equal', formula=['"合格"'], fill=PatternFill('solid', fgColor='E5F6EE'), font=Font(color='1F8A5B', bold=True)))
ws.conditional_formatting.add('L4:L9', CellIsRule(operator='equal', formula=['"不合格"'], fill=PatternFill('solid', fgColor='FDF2E1'), font=Font(color='C77A12', bold=True)))

# —— 补拍与复核历史 ——
ws = wb.create_sheet('补拍与复核历史')
hcols = [('点位', 7), ('旧照片编号', 11), ('新照片编号', 11), ('改了哪个拍摄条件', 26), ('补拍前的判断', 14), ('补拍后的判断', 14), ('补拍后看到的变化', 36), ('记录人', 9)]
title(ws, '补拍与复核历史（每补拍一次记一行，旧照片不删除）', len(hcols))
header(ws, 2, [c[0] for c in hcols], [c[1] for c in hcols])
body_row(ws, 3, ['C9', 'IMG-000', 'IMG-007', '距离 12 米 → 6 米', '证据不足，补拍', '保留疑似病害', '示例：靠近后细线边缘清楚，能看到分叉。', '张三'], example=True)
for r in range(4, 12):
    body_row(ws, r, [None] * len(hcols))
ws.freeze_panes = 'A3'

# —— 汇总与结论 ——
ws = wb.create_sheet('汇总与结论')
title(ws, '汇总与结论', 3)
ws.column_dimensions['A'].width = 26
ws.column_dimensions['B'].width = 14
ws.column_dimensions['C'].width = 60
header(ws, 2, ['统计项', '数量', '说明'], [26, 14, 60])
stats = [
    ('已记录点位', '=COUNTA(巡检记录!D4:D9)', '填了照片编号的点位数，应为 6'),
    ('照片合格的点位', '=COUNTIF(巡检记录!L4:L9,"合格")', '最新照片满足本课三条条件'),
    ('保留疑似病害', '=COUNTIF(巡检记录!O4:O9,"保留疑似病害")', ''),
    ('排除误报', '=COUNTIF(巡检记录!O4:O9,"排除误报")', '写清误报的原因（如分格缝、阴影）'),
    ('证据不足，待补拍', '=COUNTIF(巡检记录!O4:O9,"证据不足，补拍")', '交作业前应为 0'),
    ('补拍次数', '=COUNTA(补拍与复核历史!A4:A11)', ''),
]
for r, row in enumerate(stats, 3):
    body_row(ws, r, list(row))
    ws.cell(r, 2).alignment = center
r = 3 + len(stats) + 1
ws.cell(r, 1, '巡检结论（100～200 字）').font = Font(bold=True, color=BLUE)
ws.merge_cells(start_row=r + 1, start_column=1, end_row=r + 6, end_column=3)
c = ws.cell(r + 1, 1, '写：哪些点位需要近距复查；哪些是误报、为什么；下次航拍要注意什么。\n结尾注明：本记录为外观初筛，不判定结构安全。')
c.alignment, c.font = wrap, Font(color='7A8899')
for rr in range(r + 1, r + 7):
    for cc in range(1, 4):
        ws.cell(rr, cc).border = box

wb.active = 1
wb.save(OUT)
print('Wrote', OUT.name)
