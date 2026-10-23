import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=fileURLToPath(new URL('./hero-shots/',import.meta.url));mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={date:new Date().toISOString(),checks:[],layouts:[],diagnostics:[],errors:[],result:'running'};
const state=p=>p.evaluate(()=>__TYING_HERO__.state);
async function open(width=1440,height=900,options={}){
 const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',...options});p.setDefaultTimeout(15000);p.on('pageerror',e=>report.errors.push(e.message));
 await p.goto(new URL('../index.html',import.meta.url).href);await p.waitForFunction(()=>window.__TYING_HERO__?.getDiagnostics().available);await p.waitForTimeout(300);return p;
}
async function shot(p,name,options={}){await p.screenshot({path:join(out,name+'.png'),timeout:30000,...options});}
async function layout(p,label){const r=await p.evaluate(()=>({w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,canvas:document.querySelector('canvas')?.getBoundingClientRect().toJSON(),panel:document.querySelector('#control-panel').getBoundingClientRect().toJSON()}));assert(r.scrollW<=r.w+1,`${label} horizontal overflow`);if(r.w>900)assert(r.scrollH<=r.h+1,`${label} vertical overflow`);report.layouts.push({label,...r});}
async function aim(p,id){await p.locator(`[data-point="${id}"]`).click();await p.waitForFunction(()=>__TYING_HERO__.getDiagnostics().settled);}
async function tie(p,id){await aim(p,id);await p.locator('#tie-trigger').click();await p.waitForFunction(id=>__TYING_HERO__.state.game.points.find(p=>p.id===id).tied,id);}
async function pull(p){await p.locator('#pull').click();await p.waitForFunction(()=>!__TYING_HERO__.state.game.busy);}
async function repair(p){await p.locator('#mark-repair').click();await p.locator('#repair').click();await p.waitForFunction(()=>!__TYING_HERO__.state.game.busy);assert.equal((await state(p)).game.isolated,false);await p.locator('#review-safe').click();await pull(p);}
async function inspect(p,id){await p.locator(`[data-review="${id}"]`).click();await pull(p);}
try{
 const p=await open();await layout(p,'desktop');await shot(p,'desktop');report.diagnostics.push(await p.evaluate(()=>__TYING_HERO__.getDiagnostics()));
 if(process.argv.includes('--preview')){await p.locator('#nav-study').click();await p.evaluate(()=>__TYING_HERO__.seek(.51));await p.waitForTimeout(300);await shot(p,'study');await p.locator('#theme').click();await shot(p,'dark');await p.close();const m=await open(390,844);await layout(m,'mobile');await shot(m,'mobile',{fullPage:true});await m.close();report.result='preview';}
 else{
   // Real raycast click; projected world point is converted to viewport coordinates.
   const pt=await p.evaluate(()=>{const s=__TYING_HERO__.scene.projectPoint(-.5,.5),r=document.querySelector('#hero-scene').getBoundingClientRect();return{x:s.x+r.x,y:s.y+r.y}});
   await p.mouse.click(pt.x,pt.y);await p.waitForFunction(()=>__TYING_HERO__.state.game.selected==='C');await p.locator('#tie-trigger').click();await p.waitForFunction(()=>__TYING_HERO__.state.game.points[2].tied);
   for(const id of ['A','B','D'])await tie(p,id);assert.equal((await state(p)).game.points.filter(p=>p.tied).length,4);report.checks.push('raycast point selection, real-pose alignment and four tying cycles');
   await p.locator('#go-review').click();assert.equal((await state(p)).game.stage,'review');assert(await p.locator('#pull').isDisabled());await p.locator('#review-safe').click();
   await inspect(p,'A');await inspect(p,'B');await repair(p);await inspect(p,'C');await shot(p,'review-loose');await repair(p);await inspect(p,'D');assert.equal((await state(p)).game.stage,'done');assert(await p.locator('#complete').isVisible());report.checks.push('separate review sample, isolation, missing/loose, repair, re-isolation and recheck');await shot(p,'complete');
   await p.locator('#complete-study').click();await p.evaluate(()=>__TYING_HERO__.seek(.51));await p.waitForFunction(()=>__TYING_HERO__.scene.getState().camera.radius>1);await shot(p,'study');
   await p.locator('#fault-toggle').click();await p.evaluate(()=>__TYING_HERO__.seek(1));assert.equal((await state(p)).study.p,.51);assert(await p.locator('#isolate-fault').isDisabled());await p.locator('#mark-fault').click();await p.locator('#isolate-fault').click();await p.locator('#inspect-fault').click();assert((await state(p)).study.inspected);await shot(p,'fault');
   await p.evaluate(()=>__TYING_HERO__.seek(.3));assert.equal((await state(p)).study.isolated,false);assert(await p.locator('#inspect-fault').isDisabled());report.checks.push('study seeking, jam clamp, isolation sequence and rewind clears fault state');
   for(const name of ['front','top','overview','tool']){await p.locator(`[data-camera="${name}"]`).click();await p.waitForTimeout(80);assert.equal(await p.evaluate(()=>__TYING_HERO__.scene.getState().view),name)}
   await p.locator('#theme').click();assert.equal(await p.locator('body').getAttribute('data-theme'),'dark');await shot(p,'dark');await p.locator('#help').click();assert(await p.locator('#info').isVisible());await p.keyboard.press('Escape');assert(!await p.locator('#info').isVisible());report.checks.push('camera presets, dark theme, help dialog and Escape');await p.close();
   const compact=await open(1366,768);await layout(compact,'compact desktop');await shot(compact,'desktop-compact');await compact.close();
   const m=await open(390,844);await layout(m,'mobile');await shot(m,'mobile',{fullPage:true});await tie(m,'A');assert((await state(m)).game.points[0].tied);await m.locator('#nav-study').click();await m.locator('#study-play').click();assert((await state(m)).study.p>0);await shot(m,'mobile-study',{fullPage:true});await m.close();report.checks.push('390px phone, scrolling to controls, explicit reduced-motion step');
   assert.equal(report.errors.length,0);report.result='passed';
 }
}catch(error){report.result='failed';report.errors.push(error.stack);throw error}finally{writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2))}
