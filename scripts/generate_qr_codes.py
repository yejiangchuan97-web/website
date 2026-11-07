# -*- coding: utf-8 -*-
"""
Generate elegant stylized QR codes for Chapter 3 tasks.
Saved in artifacts/screenshots/retained/.local/chapter3-unified/qr/
"""

import qrcode
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

def generate_chapter3_qr_codes():
    qr_dir = Path("artifacts/screenshots/retained/.local/chapter3-unified/qr")
    qr_dir.mkdir(parents=True, exist_ok=True)
    
    tasks = [
        ("3-1", "https://smart-construction.edu.cn/course/03/3-1", "任务 3-1 构型与空间"),
        ("3-2", "https://smart-construction.edu.cn/course/03/3-2", "任务 3-2 关节与点动"),
        ("3-3", "https://smart-construction.edu.cn/course/03/3-3", "任务 3-3 驱动与减速"),
        ("3-4", "https://smart-construction.edu.cn/course/03/3-4", "任务 3-4 TCP与标定"),
        ("3-5", "https://smart-construction.edu.cn/course/03/3-5", "任务 3-5 底盘与行走"),
    ]
    
    for tid, url, label in tasks:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2
        )
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="#1E40AF", back_color="white").convert("RGBA")
        
        # Save image
        out_name = f"qr_{tid.replace('-', '_')}.png"
        out_path = qr_dir / out_name
        img.save(out_path)
        print(f"Generated QR Code: {out_path} ({img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    generate_chapter3_qr_codes()
