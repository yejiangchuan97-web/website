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
assert(M.suction(60,12).ready);assert(!M.suction(10,12).ready);assert(M.suction(15,12).ready);assert(!M.suction(15,12,true).ready);assert.equal(M.level(0,2).force,M.level(4,2).force);assert.equal(M.level(4,2).error,4);
let v={ex:8,ey:-5};for(let i=0;i<600;i++)v=M.visionStep(v.ex,v.ey,true,true,1/120);assert(Math.abs(v.ex)<.05);assert.deepEqual(M.visionStep(8,-5,true,false,1),{ex:8,ey:-5});
for(const t of [1,2,3,4]){const a=M.cycle(t-1e-6),b=M.cycle(t+1e-6);assert(Math.abs(a.x-b.x)<.001);assert(Math.abs(a.top-b.top)<.001);assert(Math.abs(a.tileTop-b.tileTop)<.001)}
report.model.push('suction thresholds, isolated cup loss, vision convergence/occlusion, independent force/height, continuous cycle poses');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{
 for(const [w,h]of [[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
 const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForFunction(()=>window.tilingLab,{timeout:10000});
 for(const tab of ['vision','vacuum','height']){await page.locator(`[data-tab="${tab}"]`).click();if(w===390&&!await page.locator('#app').evaluate(e=>e.classList.contains('mobile-controls')))await page.locator('#mobileToggle').click();await page.locator('[data-answer="1"]').click();
 const layout=await page.evaluate(()=>{const el=document.querySelector('.controls'),q=document.querySelector('#answerFeedback').getBoundingClientRect();return {w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,overflow:el.scrollHeight-el.clientHeight,qBottom:q.bottom,panelBottom:el.getBoundingClientRect().bottom}});report.layouts.push({tab,...layout});assert(layout.scrollW<=w+1&&layout.scrollH<=h+1,'page scroll '+JSON.stringify(layout));assert(layout.overflow<=1&&layout.qBottom<=layout.panelBottom,'panel overflow '+JSON.stringify(layout));
 if(w===1440){await page.screenshot({path:join(HERE,tab+'-light.png')});await page.locator('#theme').click();await page.screenshot({path:join(HERE,tab+'-dark.png')});await page.locator('#theme').click()}
 }
 if(w===390){await page.screenshot({path:__taskFile("./phone-controls.png")});await page.locator('#mobileToggle').click();await page.screenshot({path:__taskFile("./phone-model.png")})}await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:810}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.locator('#disturb').click();await page.locator('#correct').click();await page.waitForTimeout(500);await page.locator('#blocked').check();const before=await page.evaluate(()=>tilingLab.snapshot().ex);await page.waitForTimeout(500);assert.equal((await page.evaluate(()=>tilingLab.snapshot())).ex,before);await page.locator('#blocked').uncheck();await page.waitForTimeout(2500);assert((await page.evaluate(()=>tilingLab.snapshot())).ex<=.5);report.checks.push('occlusion freezes feedback; recovery converges');
 await page.locator('[data-tab="vacuum"]').click();await page.locator('#vacuum').fill('10');await page.locator('#cycleStep').click();await page.locator('#cycleStep').click();assert.equal((await page.evaluate(()=>tilingLab.snapshot())).t,1);await page.locator('#vacuum').fill('60');await page.locator('#cycleStep').click();assert.equal((await page.evaluate(()=>tilingLab.snapshot())).t,2);await page.screenshot({path:__taskFile("./vacuum-lift.png")});await page.locator('#cyclePlay').click();await page.waitForTimeout(700);const mid=await page.evaluate(()=>tilingLab.snapshot().t);assert(mid>2);await page.locator('#vacuum').fill('5');await page.waitForTimeout(200);assert(!(await page.evaluate(()=>tilingLab.snapshot())).playing);assert((await page.evaluate(()=>tilingLab.snapshot())).t<3);report.checks.push('insufficient suction prevents lifting; mid-transfer loss stops playback');
 await page.locator('[data-tab="height"]').click();await page.locator('#raised').click();let h=await page.evaluate(()=>tilingLab.snapshot().level);assert.equal(h.force,160);assert.equal(h.error,4);await page.locator('#missing').check();await page.screenshot({path:__taskFile("./height-missing.png")});assert.deepEqual(await page.evaluate(()=>tilingLab.snapshot().level),h);report.checks.push('raised base preserves force and increases finish height; hidden defect does not falsify surface readings');
 await page.locator('#heightReset').click();await page.locator('#base').fill('0.5');assert((await page.locator('#baseOut').textContent()).includes('0.5'));await page.locator('#base').fill('0');await page.locator('#compression').fill('3');assert.equal((await page.evaluate(()=>tilingLab.snapshot().level)).error,-1);report.checks.push('fractional base readout and full compression range');
 await page.locator('#fullscreen').click();await page.waitForTimeout(200);assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('#fullscreen').click();await page.locator('#help').click();assert(await page.locator('#helpDialog').evaluate(el=>el.open));await page.locator('#helpDialog [data-close]').click();await page.locator('#sources').click();assert(await page.locator('#sourcesDialog').evaluate(el=>el.open));report.checks.push('fullscreen, help, sources');assert.equal(report.errors.length,0);await page.close();
}finally{await browser.close();writeFileSync(__taskFile("./results.json"),JSON.stringify(report,null,2))}
console.log(JSON.stringify(report,null,2));
