import{createRequire}from'node:module';import{homedir}from'node:os';import{join,dirname}from'node:path';import{fileURLToPath}from'node:url';import{mkdirSync,writeFileSync}from'node:fs';import assert from'node:assert/strict';
import * as M from '../../src/tying/model.mjs';
const here=dirname(fileURLToPath(import.meta.url)),out=join(here,'shots');mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
for(let i=0;i<=1000;i++){const n=M.stateAt(i/1000),j=M.stateAt(i/1000,'jam');assert(n.feed>=0&&n.feed<=1);assert(j.p<=.51);assert(j.twist===0);assert(j.complete===false);if(n.phase<2)assert.equal(n.feed,0);}
assert.equal(M.stateAt(1).complete,true);assert.equal(M.stateAt(1,'jam').jammed,true);assert.equal(M.stateAt(1,'normal','missing').wireVisible,false);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});const report={model:'1001 normal and jam states checked',layouts:[],errors:[],checks:[]};
try{
 for(const [w,h]of[[1440,810],[1920,1080],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));await page.goto(new URL('../../5-2.html',import.meta.url).href);await page.waitForFunction(()=>window.__TYING__);
  for(const mode of['cycle','fault','review']){
   await page.locator(`button[data-mode="${mode}"]`).click();
   if(mode==='cycle')await page.locator('[data-phase="2"]').click();
   if(mode==='fault'){await page.locator('[data-fault="jam"]').click();await page.locator('#progress').evaluate(el=>{el.value=1000;el.dispatchEvent(new Event('input',{bubbles:true}));});}
   if(mode==='review'){await page.locator('[data-sample="loose"]').click();await page.locator('[data-answer="touch"]').click();}
   const layout=await page.evaluate(()=>{const selectors=['header','main','aside','.timeline','footer','#play-controls','#metrics','#answer-feedback','.panel-bottom'];return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,boxes:Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return[s,{x:r.x,y:r.y,w:r.width,h:r.height,visible:!!e.getClientRects().length}]})),state:__TYING__.state};});
   assert.equal(layout.scrollWidth,w);assert.equal(layout.scrollHeight,h);for(const [sel,r]of Object.entries(layout.boxes))if(r.visible){assert(r.y+r.h<=h+1,sel+' out of viewport '+w);}
   for(const selector of ['#play-controls','#metrics','.panel-bottom']){const r=layout.boxes[selector],main=layout.boxes.main;if(r.visible)assert(r.y+r.h<=main.y+main.h+1,selector+' overlaps timeline '+w+' '+mode);} report.layouts.push({w,h,mode,...layout});if((w===1440)||(w===390&&mode==='cycle'))await page.screenshot({path:join(out,`${w}-${mode}.png`)});
  }
  if(w===1440){
   await page.locator('button[data-mode="cycle"]').click();await page.locator('[data-view="structure"]').click();await page.screenshot({path:join(out,'structure-light.png')});
   await page.locator('#theme').click();await page.screenshot({path:join(out,'structure-dark.png')});
   await page.locator('[data-part="guide"]').click();assert.equal(await page.locator('#iso-model').getAttribute('data-selected'),'guide');report.checks.push('part selection');
   await page.locator('[data-view="action"]').click();await page.locator('[data-phase="3"]').click();await page.screenshot({path:join(out,'twist-dark.png')});
   await page.locator('#theme').click();await page.locator('#help').click();assert(await page.locator('#info').evaluate(e=>e.open));await page.keyboard.press('Escape');assert(!(await page.locator('#info').evaluate(e=>e.open)));report.checks.push('help and Escape');
   await page.locator('button[data-mode="fault"]').click();await page.locator('[data-fault="jam"]').click();await page.locator('#progress').evaluate(el=>{el.value=1000;el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await page.evaluate(()=>__TYING__.state)).p,.51);assert(await page.locator('[data-phase="3"]').isDisabled());report.checks.push('fault cannot skip to twisting');
   await page.locator('button[data-mode="review"]').click();for(const [sample,answer]of[['normal','touch'],['missing','visual'],['loose','touch']]){await page.locator(`[data-sample="${sample}"]`).click();await page.locator(`[data-answer="${answer}"]`).click();assert(await page.locator('#answer-feedback').evaluate(e=>e.classList.contains('correct')));}await page.locator('[data-answer="pass"]').click();assert(await page.locator('#answer-feedback').evaluate(e=>e.classList.contains('incorrect')));report.checks.push('three sample checks; direct acceptance rejected');
   await page.locator('button[data-mode="cycle"]').click();await page.locator('#fullscreen').click();assert(await page.evaluate(()=>!!document.fullscreenElement));await page.evaluate(()=>document.exitFullscreen());report.checks.push('fullscreen enter and exit');
  }
  await page.close();
 }
 const live=await browser.newPage({viewport:{width:1440,height:810}});live.on('pageerror',e=>report.errors.push(e.message));await live.goto(new URL('../../5-2.html',import.meta.url).href);await live.locator('button[data-mode="cycle"]').click();await live.locator('#play').click();await live.waitForTimeout(450);assert((await live.evaluate(()=>__TYING__.state.p))>0);await live.locator('#play').click();const p=await live.evaluate(()=>__TYING__.state.p);await live.waitForTimeout(300);assert(Math.abs((await live.evaluate(()=>__TYING__.state.p))-p)<.005);report.checks.push('play advances, pause holds');await live.close();
 assert.equal(report.errors.length,0);writeFileSync(join(here,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({model:report.model,layouts:report.layouts.length,checks:report.checks,errors:report.errors},null,2));
}finally{await browser.close();}
