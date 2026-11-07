import zipfile, os, sys, shutil
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

# Read inventory we generated earlier
with open('docs/OldVision_images_inventory.txt', 'r', encoding='utf-8') as f:
    text = f.read()

entries = text.split("------------------------------------------------------------\n")
parsed_images = []

for entry in entries:
    entry = entry.strip()
    if not entry:
        continue
    lines = entry.splitlines()
    header = lines[0] # e.g. #1 [para 32] 走进智能建造现场 | 重新认识智能建造 | 知识准备 | 知识准备 1：建筑业"危繁脏重"四大痛点
    part = ""
    next_txt = ""
    for l in lines[1:]:
        if l.strip().startswith("Part:"):
            part = l.split("Part:")[1].strip()
        elif l.strip().startswith("Next:"):
            next_txt = l.split("Next:")[1].strip()
    
    parsed_images.append({
        'header': header,
        'part': part,
        'caption': next_txt
    })

print(f"Parsed {len(parsed_images)} image entries from inventory.")

# Extract images from docx zip
docx_path = r'docs\OldVision\智能建筑机械与机器人.docx'
out_base = Path('docs/image/oldvision')
out_base.mkdir(parents=True, exist_ok=True)

with zipfile.ZipFile(docx_path, 'r') as z:
    for idx, item in enumerate(parsed_images):
        part_name = item['part'].lstrip('/')
        if not part_name or part_name not in z.namelist():
            print(f"Skipping {part_name} - not in zip namelist")
            continue
            
        ext = os.path.splitext(part_name)[1]
        caption = item['caption']
        # clean caption for filename
        clean_cap = "".join([c if c.isalnum() or c in '._-' else '_' for c in caption]).strip('_')
        if not clean_cap:
            clean_cap = f"image_{idx+1}"
            
        target_name = f"{idx+1:02d}_{clean_cap}{ext}"
        target_path = out_base / target_name
        
        with z.open(part_name) as src, open(target_path, 'wb') as dst:
            shutil.copyfileobj(src, dst)
            
        item['saved_path'] = str(target_path).replace("\\", "/")
        print(f"Saved: {target_name} ({os.path.getsize(target_path)//1024} KB) -> caption: {caption}")

# Save manifest
import json
with open('docs/image/oldvision_manifest.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_images, f, ensure_ascii=False, indent=2)

print("\nAll images extracted successfully!")
