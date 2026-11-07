# -*- coding: utf-8 -*-
"""Generate elegant QR codes for all 24 tasks across 8 chapters."""

import qrcode
from pathlib import Path
import json

def generate_all_qrs():
    out_dir = Path("artifacts/screenshots/qr")
    out_dir.mkdir(parents=True, exist_ok=True)
    
    with open("course/catalog.json", "r", encoding="utf-8") as f:
        catalog = json.load(f)
        
    for task in catalog.get("tasks", []):
        tid = task["id"]
        title = task["title"]
        url = f"https://smart-construction.edu.cn/course/{task['directory']}"
        
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1E40AF", back_color="white").convert("RGBA")
        
        safe_name = f"qr_{tid.replace('-', '_')}.png"
        out_path = out_dir / safe_name
        img.save(out_path)
        print(f"Generated QR: {out_path} for {tid} {title}")

if __name__ == "__main__":
    generate_all_qrs()
