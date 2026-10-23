import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {browser} from '../../公共资源/机器人构型与运动/src/browser.mjs';
const read=p=>readFileSync(fileURLToPath(new URL(p,import.meta.url)),'utf8');
const out=mkdtempSync(join(tmpdir(),'uav-hero-scene-'));
const script=read('../../公共资源/vendor/three-r160.min.js')+'\n'+read('../src/scene.js');
const fixture=join(out,'scene.html');
writeFileSync(fixture,`<!doctype html><html><meta charset="utf-8"><style>html,body{margin:0;background:#f3f0e9}#scene{height:700px;width:1180px}</style><div id="scene"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script><script>window.hero=createInspectionScene(document.querySelector('#scene'),{onSelect:id=>window.picked=id});</script></html>`);
const b=await browser();
try {
  await b.size(1180,700);await b.navigate(fixture,'window.hero');
  const initial=await b.evaluate('hero.stats()');assert.equal(initial.renderer,'webgl');assert.ok(initial.parts>=100);assert.equal(initial.validation.ok,true);
  const states=[];
  for(const selected of ['A1','A2','A3','B1','B2','B3'])for(const distance of [3,6,12])for(const angle of [0,30,45]){
    const result=await b.evaluate(`hero.update(${JSON.stringify({selected,distance,angle})});hero.validate()`);assert.equal(result.ok,true);assert.ok(result.cameraOrigin[1]>0);states.push({selected,distance,angle,...result});
  }
  await b.evaluate("hero.update({selected:'A2',distance:6,angle:0});hero.setView('iso')");
  await b.until('!hero.stats().animating');await b.shot(join(out,'scene-light.png'));
  await b.evaluate("hero.setTheme('dark');document.body.style.background='#20292d';hero.setView('drone')");
  await b.until('!hero.stats().animating');await b.shot(join(out,'scene-detail-dark.png'));
  await b.call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await b.evaluate("hero.update({flying:true});hero.setView('front')");await b.until('!hero.stats().animating');
  await b.evaluate("hero.dispose();history.replaceState({},'',location.pathname+'?no-webgl=1');window.hero=createInspectionScene(document.querySelector('#scene'),{onSelect:id=>window.picked=id})");
  assert.equal((await b.evaluate('hero.stats()')).renderer,'svg');await b.evaluate("document.querySelector('[data-cell=\"B3\"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))");assert.equal(await b.evaluate('window.picked'),'B3');
  assert.equal(b.errors.length,0);
  const result={status:'passed',renderer:initial.renderer,parts:initial.parts,states:states.length,minimumRotorClearanceM:initial.validation.rotorClearanceM,checks:['finite geometry','finite world transforms','camera poses for all 54 parameter combinations','rotor swept-disc clearance','reduced motion stops frames','interactive SVG fallback'],screenshots:[join(out,'scene-light.png'),join(out,'scene-detail-dark.png')],limitations:'This is a mesh-renderer validation, not an Anatomy SVG recorder or turn audit.'};
  writeFileSync(join(out,'audit.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await b.close();}
