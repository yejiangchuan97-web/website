"""Build, test, check links and package; keep every report under artifacts/."""
from pathlib import Path
import json
import os
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
reports = ROOT/'artifacts/reports'
reports.mkdir(parents=True,exist_ok=True)
commands = [
    ('build',['node','scripts/build.mjs','all']),
    ('tests',['node','scripts/test.mjs']),
    ('links',[sys.executable,'scripts/check-links.py']),
    ('package',[sys.executable,'scripts/package-site.py'])
]
results = {}
env = dict(os.environ,PYTHONUTF8='1')
for name, command in commands:
    result = subprocess.run(command,cwd=ROOT,capture_output=True,text=True,encoding='utf-8',errors='replace',env=env)
    (reports/(name+'.log')).write_text(result.stdout+result.stderr,encoding='utf-8')
    results[name] = {'passed':result.returncode==0}
    if name == 'tests':
        match = re.search(r'^# pass (\d+)$',result.stdout,re.M)
        if match:results[name]['passed_tests']=int(match[1])
    if name == 'links' and result.returncode == 0:
        data = json.loads(result.stdout)
        results[name].update(data)
        (reports/'links.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(name + ': ' + ('passed' if result.returncode==0 else 'FAILED'))
    if result.returncode:
        print(result.stdout[-3000:] + result.stderr[-3000:])
        break
(reports/'verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
sys.exit(0 if len(results)==len(commands) and all(row['passed'] for row in results.values()) else 1)
