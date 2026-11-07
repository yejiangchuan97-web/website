import sys, os, glob

sys.stdout.reconfigure(encoding='utf-8')

for i in range(1, 9):
    fn = f"docs/第{'一二三四五六七八'[i-1]}章教材正文与实训任务.md"
    if os.path.exists(fn):
        with open(fn, 'r', encoding='utf-8') as f:
            c = f.read()
        print(f"Chapter {i}: {fn}")
        print(f"  Length: {len(c)} chars, {len(c.splitlines())} lines")
        # count headings
        h1s = [l for l in c.splitlines() if l.startswith('# ')]
        h2s = [l for l in c.splitlines() if l.startswith('## ')]
        h3s = [l for l in c.splitlines() if l.startswith('### ')]
        print(f"  H1: {len(h1s)}, H2: {len(h2s)}, H3: {len(h3s)}")
        # count images
        imgs = [l for l in c.splitlines() if '![' in l]
        print(f"  Images: {len(imgs)}")
