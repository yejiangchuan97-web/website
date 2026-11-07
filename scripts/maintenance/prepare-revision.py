"""Preserve the replaced lessons and extract the four selected licensed models."""
from pathlib import Path
from hashlib import sha256
import json, shutil, base64
ROOT=Path(__file__).resolve().parents[2]
archive=ROOT/'archive/revision-20261026'
assert not archive.exists(), 'Revision already prepared'
archive.mkdir(parents=True)
targets=['01/tasks/1-1','01/tasks/1-2','01/tasks/1-3','01/overview','05/tasks/5-3','08/overview']+[f'08/tasks/8-{n}' for n in range(1,5)]
for rel in targets:
    source=ROOT/'course/chapters'/rel
    target=archive/'lessons'/rel
    assert source.resolve().is_relative_to(ROOT/'course') and target.resolve().is_relative_to(archive)
    target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copytree(source,target)
    if rel.endswith(('1-1','8-3','8-4')):
        # Only the user-authorized retired task directories are removed here.
        shutil.rmtree(source)
    elif (source/'src').exists():
        shutil.rmtree(source/'src')
    source.mkdir(parents=True,exist_ok=True) if rel.endswith(('8-3','8-4')) else None
oldindex=ROOT/'course/chapters/05/tasks/5-3/index.html'
if oldindex.exists():oldindex.unlink()
manifest=[]
atlas=ROOT/'resources/robot-atlas'
data=json.loads((atlas/'web/models/manifest.json').read_text(encoding='utf-8'))
for ident in ('crazyflie','iiwa','g1','go2'):
    source=atlas/'web/models'/f'{ident}.glb'
    dest=ROOT/'shared/models/robots'/f'{ident}.glb'
    shutil.copy2(source,dest)
    license=ROOT/'shared/models/licenses'/f'{ident}.txt'
    shutil.copy2(atlas/'web/licenses'/f'{ident}.txt',license)
    entry=next(r for r in data if r['id']==ident)
    entry.update({'file':dest.relative_to(ROOT).as_posix(),'license':license.relative_to(ROOT).as_posix(),'sha256':sha256(dest.read_bytes()).hexdigest(),'runtime':f'shared/models/robots/{ident}.data.js','source':'https://github.com/google-deepmind/mujoco_menagerie','nature':'Licensed mesh; authored kinematic animation, not a validated controller'})
    manifest.append(entry)
(ROOT/'shared/models/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
target=archive/'robot-atlas'
assert atlas.resolve().is_relative_to(ROOT/'resources') and target.resolve().is_relative_to(archive)
atlas.rename(target)
(atlas/'web').mkdir(parents=True)
(atlas/'web/index.html').write_text('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=../../../course/chapters/01/tasks/1-3/index.html"><title>机器人展厅</title><a href="../../../course/chapters/01/tasks/1-3/index.html">打开课程机器人展厅</a></html>',encoding='utf-8')
print('Archived original lessons and robot atlas; extracted four licensed GLB models')
