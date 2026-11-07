"""Normalize generated page paths and load common libraries from shared/."""
from pathlib import Path
from urllib.parse import urlsplit
import os
import re
import hashlib

ROOT = Path(__file__).resolve().parents[1]

def main():
    pages = list(ROOT.glob('course/chapters/*/overview/*.html'))
    pages += list(ROOT.glob('course/chapters/*/tasks/*/*.html'))
    pages += [ROOT / 'course/home/index.html']
    pages += list(ROOT.glob('artifacts/builds/**/*.html'))
    libraries = [(p, p.read_text(encoding='utf-8-sig').strip()) for p in (ROOT / 'shared/vendor').glob('*.js')]
    for page in pages:
        if not page.exists():
            continue
        text = page.read_text(encoding='utf-8-sig')
        def relative(target):
            path = os.path.relpath(ROOT / target, page.parent).replace('\\', '/')
            return path if path.startswith('.') else './' + path
        def attribute(m):
            key, quote, value = m.group(1, 2, 3)
            if re.match(r'^(?:[\w+.-]+:|//|#)', value) or '${' in value:
                return m.group(0)
            match = re.search(r'(?:^|/)((?:course|shared|resources|artifacts|docs)/.*)', value)
            if match:
                value = relative(match[1])
            elif '总入口.html' in value:
                value = relative('course/home/index.html') + ('#' + value.split('#',1)[1] if '#' in value else '')
            elif re.match(r'^(?:\.\.?/)*index\.html#chapter-', value):
                value = relative('course/home/index.html') + value[value.index('#'):]
            elif re.search(r'(?:^|/)(0[1-8]/overview/.*)', value):
                value = relative('course/chapters/' + re.search(r'(?:^|/)(0[1-8]/overview/.*)', value)[1])
            else:
                target = page.parent / urlsplit(value).path
                if not target.exists() and value.endswith('README.md'):
                    value = relative('README.md')
                elif not target.exists() and re.search(r'(?:^|/)(\d+-\d+/[^/]+\.html)$', value):
                    tail = re.search(r'(?:^|/)(\d+-\d+/[^/]+\.html)$', value)[1]
                    number = tail.split('-',1)[0]
                    value = relative(f'course/chapters/{int(number):02d}/tasks/' + tail)
                elif not target.exists() and value.endswith('overview/index.html'):
                    chapter = page.relative_to(ROOT).parts[2]
                    value = relative(f'course/chapters/{chapter}/overview/index.html')
                elif not target.exists() and value == '../index.html':
                    value = relative('course/home/index.html')
            return key + '=' + quote + value + quote
        text = re.sub(r'(href|src|poster)\s*=\s*([\x22\x27])([^\x22\x27]*?)\2', attribute, text)
        # Inline concatenated libraries are build intermediates. The maintained
        # website loads one shared copy, preserving the rest of each script.
        for lib, code in libraries:
            for variant in (code, code.replace('</script', '<\\/script')):
                if variant in text:
                    text = text.replace(variant, '</script><script src="' + relative(lib.relative_to(ROOT)) + '"></script><script>')
        text = re.sub(r'<script data-course-navigation[^>]*></script>\s*', '', text)
        script = '<script data-course-navigation src="' + relative('shared/navigation.js') + '"></script>'
        text = re.sub(r'<(?:script|link) data-course-theme[^>]*>(?:</script>)?\s*', '', text)
        theme = '<link data-course-theme rel="stylesheet" href="' + relative('shared/styles/theme.css') + '"><script data-course-theme src="' + relative('shared/theme.js') + '"></script>'
        text = text.replace('</head>', script + theme + '</head>', 1)
        # Revised covers, and pages that load the shared lab shell at run time, load matching assets even when an older preview was cached.
        if page.relative_to(ROOT).as_posix() in ('course/home/index.html','course/chapters/01/overview/index.html','course/chapters/08/overview/index.html','course/chapters/01/tasks/1-2/index.html','course/chapters/01/tasks/1-3/index.html') or 'data-lab-shell src=' in text:
            def version_asset(match):
                attr,quote,url=match.group(1,2,3)
                parts=urlsplit(url)
                if parts.scheme or not parts.path.endswith(('.js','.css')):return match.group(0)
                asset=page.parent/parts.path
                if not asset.is_file():return match.group(0)
                digest=hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
                return attr+'='+quote+parts.path+'?v='+digest+quote
            text=re.sub(r'(href|src)\s*=\s*([\x22\x27])([^\x22\x27]*?)\2',version_asset,text)
        page.write_text(text, encoding='utf-8')
    print(f'Finalized {len(pages)} course pages; shared navigation and vendor libraries')

if __name__ == '__main__':
    main()
