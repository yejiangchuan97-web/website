import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
const qa=dirname(fileURLToPath(import.meta.url)),out=join(qa,'rebuild-artifacts');mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url),{chromium}=require(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const executablePath=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser=await chromium.launch({executablePath,headless:true,args:['--edge-skip-compat-layer-relaunch','--do-not-de-elevate','--allow-file-access-from-files','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],report={date:new Date().toISOString(),checks:[],errors};
try {
 for(const reducedMotion of ['reduce','no-preference']){
  const p=await browser.newPage({viewport:{width:1600,height:900},reducedMotion});p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(join(dirname(qa),'index.html')).href);await p.waitForFunction(()=>!!window.inspectionLab);
  await p.click('[data-mission="stairs"]');await p.click('[data-stage="travel"]');await p.click('#autoDrive');await p.waitForFunction(()=>inspectionLab.state.entries.stairs.progress>.3,null,{timeout:30000});await p.click('#explodeButton');
  assert.equal(await p.evaluate(()=>inspectionLab.state.entries.stairs.moving),false);
  await p.click('#autoDrive');assert.equal(await p.evaluate(()=>inspectionLab.state.entries.stairs.moving),false);assert.match(await p.locator('#feedback').innerText(),/合拢/);
  await p.waitForFunction(()=>!inspectionLab.scene.inspect().fleet.dog.needsSettle(),null,{timeout:10000});
  report.checks.push({name:'pause-on-explode-and-stop-settle',reducedMotion});
  await p.click('#explodeButton');await p.locator('#driveHold').focus();await p.keyboard.down('Space');await p.waitForTimeout(220);assert.equal(await p.evaluate(()=>inspectionLab.state.entries.stairs.moving),true);await p.keyboard.press('Tab');await p.keyboard.up('Space');assert.equal(await p.evaluate(()=>inspectionLab.state.entries.stairs.moving),false);report.checks.push({name:'keyboard-release-after-focus-change',reducedMotion});
  await p.evaluate(()=>{const l=inspectionLab,e=l.state.entries.stairs;e.progress=1;e.arrived=true;l.render();});await p.click('[data-stage="capture"]');await p.click('#explodeButton');const photos=await p.evaluate(()=>inspectionLab.state.entries.stairs.photos.length);await p.click('#shutterButton');assert.equal(await p.evaluate(()=>inspectionLab.state.entries.stairs.photos.length),photos);assert.match(await p.locator('#feedback').innerText(),/合拢/);report.checks.push({name:'expanded-body-capture-blocked',reducedMotion});
  await p.close();
 }
 assert.deepEqual(errors,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;throw e;}finally{writeFileSync(join(out,'settle-report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));}
