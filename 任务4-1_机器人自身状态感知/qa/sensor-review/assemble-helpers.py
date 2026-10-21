from pathlib import Path
root=Path(__file__).resolve().parents[2]
old=(Path(__file__).parent/'baseline/app.js').read_text(encoding='utf-8')
app=(root/'src/app.js').read_text(encoding='utf-8')
graph=old[old.index('function pathFor('):old.index('let currentTrace=')]
graph=graph.replace("if(svg.id==='signal')height=117;",'')
csv=old[old.index('function parseCSV('):old.index('function openNotes(')]
app=app.replace('{{HELPERS}}',graph+'\n'+csv)
(root/'src/app.js').write_text(app,encoding='utf-8')
p=root/'src/build.mjs'
s=p.read_text(encoding='utf-8')
s=s.replace('SCENE:read("./scene.js")', '''SENSORS:read("./sensors.mjs").replace(/^import .*;\\r?\\n/gm,'').replace(/^export /gm,''),SCENE:read("./scene.js")''')
s=s.replace('FALLBACK|THREE|MODEL|SCENE|APP','FALLBACK|THREE|MODEL|SENSORS|SCENE|APP')
p.write_text(s,encoding='utf-8')
