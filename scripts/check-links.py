from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
import json,re,sys
root=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if v and k in ('href','src','poster'):self.links.append(v)
  values=dict(attrs)
  if tag=='meta' and values.get('http-equiv','').lower()=='refresh':
   match=re.search(r'url\s*=\s*(.+)',values.get('content',''),re.I)
   if match:self.links.append(match.group(1).strip().strip("\"'"))
pages=[root/'README.md',root/'项目目录.md']+list(root.glob('任务*/README.md'))+list(root.glob('任务*/*.html'))
issues=[];count=0
for p in pages:
 text=p.read_text(encoding='utf-8-sig')
 if p.suffix=='.html':
  parser=Links();parser.feed(text);links=parser.links
 else:links=re.findall(r'\]\(((?:[^()\n]|\([^()\n]*\))*)\)',text)
 for link in links:
  if re.match(r'^(?:[\w+.-]+:|//|#)',link):continue
  target=unquote(urlsplit(link).path)
  if not target:continue
  count+=1
  if not (p.parent/target).exists():issues.append({'file':str(p.relative_to(root)),'link':link})
print(json.dumps({'pages':len(pages),'links':count,'missing':issues},ensure_ascii=False,indent=2))
sys.exit(bool(issues))
