import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {createRequire} from 'node:module';import {homedir} from 'node:os';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';import {writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import * as M from "../src/model.mjs";
const HERE=__taskFile(".");const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={layouts:[],errors:[],checks:[]};
assert.equal(M.bond(0).aligned,true);assert.equal(M.bond(125).overlap,125);assert.equal(M.bond(125).cuts,2);
assert.equal(M.contact(14,10,false).force,80);assert(M.contact(14,10,true).force<80);assert(M.contact(14,10,true).gap>10);assert.equal(M.contact(20,10,true).retreat,4);assert.equal(M.contact(8,15,true).force,0);
for(let t=0;t<=6.999;t+=.01){const s=M.cycle(t);if(s.i===3)assert(s.brickZ>=95);if(s.placed)assert.equal(s.brickZ,32);}
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
try{
 for(const [w,h] of [[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForFunction(()=>window.brickLab);
  for(let tab=0;tab<3;tab++){
   await page.locator(`[data-tab="${tab}"]`).click();if(w===390)await page.locator('#mobileToggle').click();await page.locator('[data-answer="1"]').click();
   const sizes=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,overflow:document.querySelector('.controls').scrollHeight-document.querySelector('.controls').clientHeight,answerBottom:document.querySelector('#answerFeedback').getBoundingClientRect().bottom,panelBottom:document.querySelector('.controls').getBoundingClientRect().bottom}));
   report.layouts.push({tab,...sizes});assert(sizes.sw<=w+1&&sizes.sh<=h+1,JSON.stringify(sizes));assert(sizes.overflow<=1&&sizes.answerBottom<=sizes.panelBottom,JSON.stringify(sizes));
   if(w===390)await page.locator('#mobileToggle').click();
   if(w===1440){await page.screenshot({path:__taskFile("./tab0-light.png")});await page.locator('#theme').click();await page.screenshot({path:__taskFile("./tab0-dark.png")});await page.locator('#theme').click();}
  }
  if(w===390){await page.locator('[data-tab="0"]').click();await page.screenshot({path:__taskFile("./phone.png")});}
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:810}});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL("../index.html",import.meta.url).href);await page.waitForTimeout(1100);assert((await page.evaluate(()=>window.brickLab.snapshot())).t>0);
 await page.locator('#progress').fill('3.5');assert.equal((await page.evaluate(()=>window.brickLab.snapshot())).playing,false);await page.locator('#step').click();assert.equal((await page.evaluate(()=>window.brickLab.snapshot())).cycle.i,4);
 await page.locator('[data-tab="1"]').click();await page.locator('#aligned').click();assert((await page.locator('#metricB').textContent()).includes('通缝'));await page.locator('#half').click();assert((await page.locator('#metricA').textContent()).includes('125'));
 await page.locator('[data-tab="2"]').click();await page.locator('[data-soft="false"]').click();assert((await page.locator('#metricA').textContent()).includes('80'));await page.locator('[data-soft="true"]').click();await page.locator('#overload').click();assert((await page.locator('#contactNote').textContent()).includes('限位'));await page.locator('#height').fill('20');await page.locator('#mortar').fill('8');assert((await page.locator('#contactNote').textContent()).includes('空隙'));
 await page.locator('#help').click();assert(await page.locator('#helpDialog').evaluate(el=>el.open));await page.locator('#closeHelp').click();await page.locator('#fullscreen').click();assert(await page.evaluate(()=>!!document.fullscreenElement));await page.locator('#fullscreen').click();
 await page.locator('#drawing').focus();await page.keyboard.press('ArrowLeft');assert.equal((await page.evaluate(()=>window.brickLab.snapshot())).tab,1);
 assert.equal(report.errors.length,0,report.errors.join('\n'));report.checks.push('model invariants, 15 viewport/tab layouts, quiz feedback, animation, seek, step, bond presets, rigid/compliant contact, travel limit, no-contact state, help, fullscreen, keyboard');
}finally{await browser.close();writeFileSync(__taskFile("./results.json"),JSON.stringify(report,null,2));}console.log(JSON.stringify(report,null,2));
