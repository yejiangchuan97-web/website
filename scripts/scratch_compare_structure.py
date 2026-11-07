import docx, sys, os, re

sys.stdout.reconfigure(encoding='utf-8')
old_doc = docx.Document(r'docs\OldVision\智能建筑机械与机器人.docx')

# Let's map H1 sections in OldVision
h1_sections = {}
cur_h1 = None
cur_h2 = None

for p in old_doc.paragraphs:
    txt = p.text.strip()
    if p.style.name == 'Heading 1':
        cur_h1 = txt
        h1_sections[cur_h1] = {'h2s': {}, 'tables_count': 0, 'word_count': 0, 'images': []}
        cur_h2 = None
    elif p.style.name == 'Heading 2' and cur_h1:
        cur_h2 = txt
        h1_sections[cur_h1]['h2s'][cur_h2] = []
    elif cur_h1 and cur_h2 and txt:
        h1_sections[cur_h1]['h2s'][cur_h2].append(txt)
        h1_sections[cur_h1]['word_count'] += len(txt)

print("OldVision Structure Summary:")
for h1, data in h1_sections.items():
    print(f"\n[{h1}] ~ {data['word_count']} chars, {len(data['h2s'])} sections:")
    for h2, paras in data['h2s'].items():
        print(f"   - {h2} ({len(paras)} paragraphs)")
