import zipfile, re, sys
from PIL import Image
import io

sys.stdout.reconfigure(encoding='utf-8')
z = zipfile.ZipFile(r'docs\OldVision\智能建筑机械与机器人.docx')
for name in ['word/media/image1.png', 'word/media/image2.png', 'word/media/image24.png', 'word/media/image25.png']:
    data = z.read(name)
    im = Image.open(io.BytesIO(data))
    print(name, im.size, im.format)

doc_xml = z.read('word/document.xml').decode('utf-8')
rels_xml = z.read('word/_rels/document.xml.rels').decode('utf-8')
for name in ['image1.png', 'image2.png', 'image24.png', 'image25.png']:
    m = re.search(r'Id="([^"]+)"[^>]+Target="[^"]*' + name + '"', rels_xml)
    if m:
        rId = m.group(1)
        print(f"\n{name} -> {rId}")
        found = False
        for occur in re.finditer(re.escape(rId), doc_xml):
            found = True
            snippet = doc_xml[max(0, occur.start()-200):min(len(doc_xml), occur.end()+200)]
            print('Context:', re.sub(r'<[^>]+>', ' ', snippet)[:150])
        if not found:
            print("Not referenced in document.xml directly!")
