import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../../src/spray/model.mjs';
const HERE=dirname(fileURLToPath(import.meta.url));
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={model:[],layouts:[],checks:[],errors:[]};
const p={...M.DEFAULTS};
assert.equal(M.fanWidth(300),400);assert.equal(M.overlap(p).ratio,.5);assert.equal(M.overlap({...p,spacing:500}).gap,100);
const safe=M.coverage(p),center=M.coverage({...p,guard:'center'}),off=M.coverage({...p,guard:'off'}),gaps=M.coverage({...p,spacing:500});
assert.equal(safe.pollution,0);assert(center.pollution>0);assert(off.pollution>center.pollution);assert(gaps.percent<safe.percent);assert(M.depositionAt(0,p).dose===2);assert(M.depositionAt(.5,p).dose===1);assert(M.depositionAt(0,{...p,compensate:true}).dose===1);
for(let i=0;i<10000;i++){const s=M.poseAt(i/10000,p);if(s.on)assert(!M.intersectsHole(s.x,s.z,400));if(s.travel)assert(!s.on);}
report.model.push({safe:safe.percent,centerPollution:center.pollution,unprotected:off.pollution,gapCoverage:gaps.percent});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{
 for(const [w,h] of [[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL('../../6-4.html',import.meta.url).href);await page.waitForFunction(()=>window.sprayLab);
  for(const tab of ['coverage','opening','dose']){
   await page.locator(`[data-tab="${tab}"]`).click();
   if(w===390)await page.locator('#mobileToggle').click();
   await page.locator('[data-answer="1"]').click();
   const layout=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,overflow:document.querySelector('.controls').scrollHeight-document.querySelector('.controls').clientHeight,feedbackBottom:document.querySelector('#feedback').getBoundingClientRect().bottom,panelBottom:document.querySelector('.controls').getBoundingClientRect().bottom}));report.layouts.push({tab,...layout});
   assert(layout.scrollW<=w&&layout.scrollH<=h,JSON.stringify(layout));assert(layout.overflow<2&&layout.feedbackBottom<=layout.panelBottom,JSON.stringify(layout));
   if(w===390){if(tab==='coverage')await page.screenshot({path:join(HERE,'phone-controls.png')});await page.locator('#mobileToggle').click();}
   if(w===1440){await page.screenshot({path:join(HERE,tab+'-light.png')});await page.locator('#theme').click();await page.screenshot({path:join(HERE,tab+'-dark.png')});await page.locator('#theme').click();}
  }
  if(w===390){await page.locator('[data-tab="coverage"]').click();await page.screenshot({path:join(HERE,'phone.png')});}
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:810}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL('../../6-4.html',import.meta.url).href);await page.waitForFunction(()=>window.sprayLab);await page.waitForTimeout(800);assert((await page.evaluate(()=>sprayLab.snapshot())).progress>0);await page.locator('#play').click();const progress=(await page.evaluate(()=>sprayLab.snapshot())).progress;await page.waitForTimeout(250);assert.equal((await page.evaluate(()=>sprayLab.snapshot())).progress,progress);await page.locator('#step').click();assert((await page.evaluate(()=>sprayLab.snapshot())).progress>progress);await page.locator('#scene').focus();await page.keyboard.press('ArrowLeft');report.checks.push('animation, pause, step, keyboard');
 await page.locator('#progress').fill('380');await page.locator('#progress').dispatchEvent('input');assert(Math.abs((await page.evaluate(()=>sprayLab.snapshot())).progress-.38)<.0001);await page.locator('#zoom').click();assert.notEqual(await page.locator('#machine').getAttribute('viewBox'),'0 0 1050 620');await page.screenshot({path:join(HERE,'nozzle-closeup.png')});await page.locator('#zoom').click();report.checks.push('progress scrubbing and nozzle closeup');
 await page.locator('[data-preset="gap"]').click();assert.equal((await page.evaluate(()=>sprayLab.snapshot())).p.spacing,500);await page.screenshot({path:join(HERE,'gap-example.png')});
 await page.locator('[data-tab="opening"]').click();await page.locator('[data-guard="center"]').click();await page.locator('#inspectWindow').click();const atWindow=await page.evaluate(()=>sprayLab.snapshot());assert(atWindow.pose.on);await page.screenshot({path:join(HERE,'window-center.png')});await page.locator('[data-guard="footprint"]').click();assert(!(await page.evaluate(()=>sprayLab.snapshot())).pose.on);await page.screenshot({path:join(HERE,'window-protected.png')});report.checks.push('window-edge center vs footprint triggering');
 await page.locator('[data-tab="dose"]').click();assert(await page.locator('#dosePlot').isVisible());assert(!(await page.locator('#map').isVisible()));await page.locator('#rewind').click();assert.equal((await page.evaluate(()=>sprayLab.snapshot())).pose.dose,2);await page.locator('#compensate').check();assert.equal((await page.evaluate(()=>sprayLab.snapshot())).pose.dose,1);await page.screenshot({path:join(HERE,'dose-compensated.png')});
 await page.locator('#help').click();assert(await page.locator('#helpDialog').evaluate(el=>el.open));await page.keyboard.press('Escape');await page.locator('#fullscreen').click();assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('#fullscreen').click();report.checks.push('flow compensation, explanation dialog, fullscreen');
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 const close=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:4,reducedMotion:'reduce'});await close.goto(new URL('../../6-4.html',import.meta.url).href);await close.locator('#progress').fill('380');await close.locator('#progress').dispatchEvent('input');await close.locator('#scene').screenshot({path:join(HERE,'mechanism-4x-light.png')});await close.locator('#theme').click();await close.locator('#scene').screenshot({path:join(HERE,'mechanism-4x-dark.png')});await close.close();
}finally{await browser.close();writeFileSync(join(HERE,'results.json'),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
