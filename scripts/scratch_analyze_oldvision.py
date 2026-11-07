import docx, sys, os
from docx.oxml import parse_xml

sys.stdout.reconfigure(encoding='utf-8')
doc_path = r'docs\OldVision\智能建筑机械与机器人.docx'
doc = docx.Document(doc_path)

current_h1 = ''
current_h2 = ''
current_h3 = ''
current_h4 = ''

results = []

for i, p in enumerate(doc.paragraphs):
    txt = p.text.strip()
    if p.style.name == 'Heading 1':
        current_h1 = txt
        current_h2 = ''
        current_h3 = ''
        current_h4 = ''
    elif p.style.name == 'Heading 2':
        current_h2 = txt
        current_h3 = ''
        current_h4 = ''
    elif p.style.name == 'Heading 3':
        current_h3 = txt
        current_h4 = ''
    elif p.style.name == 'Heading 4':
        current_h4 = txt
    
    # Check if this paragraph or neighboring paragraphs have text / captions
    for r in p.runs:
        drawings = r._element.xpath('.//a:blip')
        if drawings:
            # find surrounding text (prev paragraph, curr paragraph, next paragraph)
            prev_txt = doc.paragraphs[i-1].text.strip() if i > 0 else ''
            next_txt = doc.paragraphs[i+1].text.strip() if i+1 < len(doc.paragraphs) else ''
            for d in drawings:
                rId = d.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                img_part = doc.part.related_parts.get(rId)
                part_name = img_part.partname if img_part else 'unknown'
                results.append({
                    'index': i,
                    'h1': current_h1,
                    'h2': current_h2,
                    'h3': current_h3,
                    'h4': current_h4,
                    'text': txt,
                    'prev': prev_txt,
                    'next': next_txt,
                    'part': str(part_name)
                })

print(f"Total blips found: {len(results)}")
with open('docs/OldVision_images_inventory.txt', 'w', encoding='utf-8') as out:
    for idx, r in enumerate(results):
        line = f"#{idx+1} [para {r['index']}] {r['h1']} | {r['h2']} | {r['h3']} | {r['h4']}\n"
        line += f"   Part: {r['part']}\n"
        if r['text']:
            line += f"   Text: {r['text']}\n"
        if r['prev']:
            line += f"   Prev: {r['prev']}\n"
        if r['next']:
            line += f"   Next: {r['next']}\n"
        line += "-"*60 + "\n"
        out.write(line)
        if idx < 25:
            print(f"#{idx+1} {r['h1']} / {r['h2']} -> {r['part']} (next: {r['next'][:40]} | text: {r['text'][:40]})")

print("Saved inventory to docs/OldVision_images_inventory.txt")
