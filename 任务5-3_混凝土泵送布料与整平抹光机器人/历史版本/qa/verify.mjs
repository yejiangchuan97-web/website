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
let head=0;for(let i=0;i<1200;i++)head=M.levelStep(head,5,true,1/120);
assert(Math.abs(head-5)<.001);assert(Math.abs(M.levelReadout(head,5).receiver)<.001);assert(head>4.99);
assert.equal(M.levelStep(6,0,false,1),6);
assert(Math.abs(M.levelStep(0,8,true,.01))<=.08);
const narrow=M.coverageAt(M.routeOf(.72),1),wide=M.coverageAt(M.routeOf(1.2),1);
assert(narrow.covered>wide.covered);assert(narrow.percent<100);assert(narrow.manual>0);
report.model.push({closedLoopError:head-5,narrowCoverage:narrow.percent,wideCoverage:wide.percent});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{
 for(const [w,h] of [[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(new URL("../../历史入口.html",import.meta.url).href);await page.waitForFunction(()=>window.finishingLab);
  for(const tab of ['level','timing','coverage']){
   await page.locator(`[data-tab="${tab}"]`).click();
   const layouts=await page.evaluate(()=>{
    const r=document.querySelector('.controls').getBoundingClientRect();
    return {scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,w:innerWidth,h:innerHeight,controlOverflow:document.querySelector('.controls').scrollHeight-document.querySelector('.controls').clientHeight,questionBottom:document.querySelector('.question').getBoundingClientRect().bottom,controlBottom:r.bottom};
   });
   if(w===1440&&tab==='level')await page.screenshot({path:__taskFile("./desktop.png")});
   assert(layouts.scrollW<=w+1&&layouts.scrollH<=h+1,JSON.stringify(layouts));
   if(w>760)assert(layouts.controlOverflow<2&&layouts.questionBottom<=layouts.controlBottom,tab+' '+JSON.stringify(layouts));
   if(w>760){await page.locator('[data-answer="1"]').click();const overflow=await page.locator('.controls').evaluate(el=>el.scrollHeight-el.clientHeight);assert(overflow<2,tab+' answered panel clipped '+overflow);}
   report.layouts.push({w,h,tab,...layouts});
   if(w===1440){
    if(tab==='level')await page.locator('[data-disturb="6"]').click();
    if(tab==='timing'){await page.locator('#timingProgress').fill('0.65');await page.locator('#timingProgress').dispatchEvent('input');}
    if(tab==='coverage')await page.locator('#coverageEnd').click();
    await page.screenshot({path:join(HERE,tab+'-light.png')});
    await page.locator('#theme').click();await page.screenshot({path:join(HERE,tab+'-dark.png')});await page.locator('#theme').click();
   }
  }
  if(w===390){await page.locator('[data-tab="level"]').click();await page.screenshot({path:__taskFile("./phone-figure.png")});await page.locator('#mobileToggle').click();const n=await page.locator('.controls').evaluate(el=>el.scrollHeight-el.clientHeight);assert(n<2,'mobile control clipped '+n);await page.screenshot({path:__taskFile("./phone-controls.png")});}
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:810}});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(new URL("../../历史入口.html",import.meta.url).href);await page.locator('#wrongDatum').click();await page.waitForTimeout(5200);
 let s=await page.evaluate(()=>window.finishingLab.snapshot());assert(Math.abs(s.level.receiver)<.03);assert(s.level.design>4.97);report.checks.push('wrong datum converges to +5 mm while receiver approaches zero');
 await page.locator('#feedback').uncheck();await page.locator('[data-disturb="-6"]').click();s=await page.evaluate(()=>window.finishingLab.snapshot());await page.waitForTimeout(500);assert.equal((await page.evaluate(()=>window.finishingLab.snapshot())).head,s.head);report.checks.push('feedback disabled holds head');
 await page.locator('[data-tab="timing"]').click();await page.locator('[data-material="early"]').click();await page.locator('#timingPlay').click();await page.waitForTimeout(1000);assert((await page.evaluate(()=>window.finishingLab.snapshot())).timing>.06);await page.locator('#timingPlay').click();await page.locator('#cutaway').check();await page.screenshot({path:__taskFile("./timing-cutaway.png")});
 await page.locator('[data-tab="coverage"]').click();await page.locator('#spacing').fill('1.2');await page.locator('#spacing').dispatchEvent('input');await page.locator('#coverageEnd').click();await page.screenshot({path:__taskFile("./coverage-wide.png")});
 await page.locator('[data-answer="1"]').click();assert((await page.locator('#answerFeedback').textContent()).includes('判断正确'));
 await page.locator('#help').click();assert(await page.locator('#helpDialog').evaluate(el=>el.open));await page.locator('#closeHelp').click();
 await page.locator('#fullscreen').click();await page.waitForTimeout(200);assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('#fullscreen').click();report.checks.push('playback, cutaway, coverage, quiz, help, fullscreen');
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 await page.close();
} finally {await browser.close();writeFileSync(__taskFile("./results.json"),JSON.stringify(report,null,2));}
console.log(JSON.stringify(report,null,2));
