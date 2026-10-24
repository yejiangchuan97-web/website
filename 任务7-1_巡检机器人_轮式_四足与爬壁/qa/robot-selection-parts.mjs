import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';

const task=dirname(dirname(fileURLToPath(import.meta.url)));
const out=process.env.INSPECTION_QA_OUT||join(task,'qa/rebuild-artifacts/selection');
mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--edge-skip-compat-layer-relaunch','--do-not-de-elevate','--allow-file-access-from-files','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={checks:[],errors:[]};
const check=name=>{report.checks.push(name);console.log(name);};
try{
 for(const reducedMotion of ['reduce','no-preference']){
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(pathToFileURL(join(task,'index.html')).href);
  await page.waitForFunction(()=>window.inspectionLab?.scene.stats().webgl);
  await page.click('[data-stage="travel"]');
  for(const mission of ['road','stairs','wall']){
   await page.click(`[data-mission="${mission}"]`);
   await page.click('[data-stage="travel"]');
   for(const kind of ['wheel','dog','crawler','wheel','dog']){
    await page.click(`[data-robot="${kind}"]`);
    assert.deepEqual(await page.evaluate(()=>Object.entries(inspectionLab.scene.inspect().fleet).filter(([,r])=>r.group.visible).map(([k])=>k)),[kind]);
    await page.click('#partsButton');
    assert.equal(await page.locator('#partsPanel').isVisible(),true);
    const expected={wheel:'轮式',dog:'四足',crawler:'爬壁'}[kind];
    assert.match(await page.locator('#partsTitle').innerText(),new RegExp(expected));
    for(let part=0;part<5;part++){
     await page.click(`[data-part="${part}"]`);
     assert(await page.evaluate(()=>{let n=0;inspectionLab.scene.inspect().fleet[inspectionLab.state.robot].group.traverse(o=>{if(o.isMesh&&o.material.emissiveIntensity===.75)n++;});return n;}),'Each part must highlight real meshes');
    }
    await page.click('#closePartsButton');
    assert.equal(await page.locator('#partsPanel').isVisible(),false);
    assert.equal(await page.locator('#partsButton').evaluate(el=>el===document.activeElement),true);
    await page.click('#explodeButton');
   }
  }
  check(reducedMotion+': repeated switches across all sites show exactly one robot; every part maps to real geometry');
  await page.click('[data-robot="crawler"]');
  await page.check('#tetherCheck');
  await page.check('#magnetCheck');
  assert.equal(await page.evaluate(()=>inspectionLab.scene.inspect().scene.children.filter(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===.014&&o.visible).length),16);
  await page.click('#partsButton');await page.click('[data-part="4"]');
  await page.click('[data-robot="dog"]');
  assert.match(await page.locator('#partsTitle').innerText(),/四足/);
  assert.equal(await page.locator('#explodeButton').getAttribute('aria-pressed'),'false');
  assert.equal(await page.evaluate(()=>inspectionLab.scene.inspect().fleet.dog.stats().pose.exploded),0);
  assert.equal(await page.evaluate(()=>inspectionLab.scene.inspect().scene.children.filter(o=>o.geometry?.type==='CylinderGeometry'&&o.geometry.parameters.radiusTop===.014&&o.visible).length),0);
  await page.click('#closePartsButton');
  await page.click('[data-mission="road"]');await page.click('[data-stage="travel"]');
  await page.click('[data-robot="wheel"]');await page.click('#autoDrive');
  await page.waitForFunction(()=>inspectionLab.state.entries.road.progress>.03);
  await page.click('[data-robot="dog"]');
  assert.equal(await page.evaluate(()=>inspectionLab.state.entries.road.moving),false);
  assert.equal(await page.evaluate(()=>inspectionLab.state.entries.road.progress),0);
  assert.deepEqual(await page.evaluate(()=>Object.entries(inspectionLab.scene.inspect().fleet).filter(([,r])=>r.group.visible).map(([k])=>k)),['dog']);
  await page.click('#partsButton');
  await page.waitForTimeout(650);
  await page.screenshot({path:join(out,reducedMotion+'-parts.png')});
  await page.click('#resetButton');
  assert.equal(await page.locator('#partsPanel').isVisible(),false);
  assert.equal(await page.locator('#partsButton').getAttribute('aria-expanded'),'false');
  assert.deepEqual(await page.evaluate(()=>Object.entries(inspectionLab.scene.inspect().fleet).filter(([,r])=>r.group.visible).map(([k])=>k)),['wheel']);
  check(reducedMotion+': changing an exploded or moving robot clears old pose and tether; reset restores UI');
  await page.close();
 }
 for(const [name,width,height] of [['dark.html',1600,900],['index.html',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(pathToFileURL(join(task,name)).href);
  await page.waitForFunction(()=>window.inspectionLab);
  await page.click('#partsButton');await page.click('[data-part="1"]');
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  for(const selector of ['#partsButton','#partsPanel']){
   const rect=await page.locator(selector).boundingBox();
   assert(rect.x>=0&&rect.x+rect.width<=width+1);
  }
  await page.locator('#partsList button').last().scrollIntoViewIfNeeded();
  await page.locator('#partsList button').last().click();
  await page.screenshot({path:join(out,width<760?'mobile-parts.png':'dark-parts.png')});
  await page.click('[data-stage="capture"]');
  assert.equal(await page.locator('#partsPanel').isVisible(),false);
  check(name+' '+width+': parts stay accessible and capture hides the panel');
  await page.close();
 }
 const fallback=await browser.newPage();
 fallback.on('pageerror',e=>report.errors.push(e.message));
 await fallback.goto(pathToFileURL(join(task,'index.html')).href+'?no-webgl=1');
 assert.equal(await fallback.locator('#partsButton').isDisabled(),true);
 await fallback.click('[data-stage="travel"]');await fallback.click('[data-robot="dog"]');
 check('WebGL fallback disables parts gracefully');
 assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.failure=e.stack;throw e;}finally{
 writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));
 await browser.close();
}
