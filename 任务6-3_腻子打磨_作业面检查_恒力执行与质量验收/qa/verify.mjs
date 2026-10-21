import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as M from "../src/model.mjs";
const HERE=__taskFile(".");
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={model:[],layouts:[],checks:[],errors:[]};
let q=0;for(let i=0;i<1200;i++)q=M.forceStep(q,2,20,true,1/120);assert(Math.abs(q-2)<.001);assert.equal(M.contact(2,0).force,30);assert.equal(M.contact(-6,0).force,0);assert(M.contact(6,0).overload);assert.equal(M.forceStep(0,6,20,true,1),0);
const route=M.makeRoute(),narrow=M.coverage(route,1),wide=M.coverage(M.makeRoute(.45),1);assert(narrow.percent>wide.percent);assert(narrow.percent<100);assert(narrow.cells.every(c=>!c.opening||!c.hit));assert(M.dryCheck(route).valid);assert(!M.dryCheck(M.makeRoute(.24,.1)).valid);assert.equal(M.coverage(route,0).count,0);
const transfer=route.segments.find(s=>!s.contact);assert.equal(M.coverage(route,(transfer.start+.2*transfer.length)/route.total).count,M.coverage(route,(transfer.start+.8*transfer.length)/route.total).count);assert.equal(M.dwellState(.5,'dwell').dwell,2);assert.equal(M.dwellState(.5,'normal').dwell,0);report.model.push({closedLoopRetreat:q,narrowCoverage:narrow.percent,wideCoverage:wide.percent});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{
for(const [w,h]of [[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
 const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForFunction(()=>window.sandingLab);
 for(const tab of ['force','dwell','coverage']){
  await page.locator(`[data-tab="${tab}"]`).click();if(w===390)await page.locator('.app').evaluate(el=>el.classList.add('mobile-controls'));
  await page.locator('[data-answer="1"]').click();const layout=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,overflow:document.querySelector('.controls').scrollHeight-document.querySelector('.controls').clientHeight,qbottom:document.querySelector('.question').getBoundingClientRect().bottom,cbottom:document.querySelector('.controls').getBoundingClientRect().bottom}));report.layouts.push({tab,...layout});assert(layout.sw<=w+1&&layout.sh<=h+1,JSON.stringify(layout));assert(layout.overflow<2&&layout.qbottom<=layout.cbottom,tab+JSON.stringify(layout));
  if(w===1440){if(tab==='force')await page.locator('#bumpPreset').click();if(tab==='dwell'){await page.locator('[data-condition="dwell"]').click();await page.locator('#dwellProgress').fill('0.5');}if(tab==='coverage'){await page.locator('#dryRun').click();await page.locator('#coverageEnd').click();await page.locator('#contactRun').click();await page.locator('#coverageEnd').click();}await page.screenshot({path:join(HERE,tab+'-light.png')});await page.locator('#theme').click();await page.screenshot({path:join(HERE,tab+'-dark.png')});await page.locator('#theme').click();}
 }
 if(w===390){await page.locator('[data-tab="force"]').click();await page.screenshot({path:__taskFile("./phone-controls.png")});await page.locator('#mobileToggle').click();await page.screenshot({path:__taskFile("./phone-figure.png")});}await page.close();
}
const page=await browser.newPage({viewport:{width:1440,height:810}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.locator('#bumpPreset').click();await page.waitForTimeout(4200);assert(Math.abs((await page.evaluate(()=>sandingLab.state.retreat))-2)<.02);await page.locator('#fixedPreset').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>sandingLab.state.retreat),0);await page.locator('#bump').fill('6');assert(await page.evaluate(()=>sandingLab.state.locked));await page.locator('#bump').fill('0');assert(await page.evaluate(()=>sandingLab.state.locked));await page.locator('#reset').click();assert(!await page.evaluate(()=>sandingLab.state.locked));
await page.locator('[data-tab="coverage"]').click();assert(await page.locator('#contactRun').isDisabled());await page.locator('#offset').fill('0.1');await page.locator('#dryRun').click();await page.locator('#coverageEnd').click();assert(await page.locator('#contactRun').isDisabled());await page.screenshot({path:__taskFile("./wrong-map.png")});await page.locator('#offset').fill('0');await page.locator('#dryRun').click();await page.locator('#coverageEnd').click();assert(!await page.locator('#contactRun').isDisabled());assert.equal(await page.locator('#mapCells rect').count(),0);await page.locator('#contactRun').click();await page.locator('#coverageEnd').click();assert(await page.locator('#mapCells rect').count()>0);await page.locator('#spacing').fill('0.45');assert(await page.locator('#contactRun').isDisabled());assert.equal(await page.locator('#mapCells rect').count(),0);
await page.locator('#help').click();assert(await page.locator('#helpDialog').evaluate(e=>e.open));await page.locator('#closeHelp').click();await page.locator('#fullscreen').click();assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('#fullscreen').click();
report.checks.push('force feedback, fixed position, latched overload, reset, dry-run prerequisite, failed offset, coverage exclusion, invalidation, help and fullscreen');assert.equal(report.errors.length,0,report.errors.join('\n'));await page.close();
}finally{await browser.close();writeFileSync(__taskFile("./results.json"),JSON.stringify(report,null,2));}console.log(JSON.stringify(report,null,2));
