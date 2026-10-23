import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as M from '../src/model.mjs';

const local=p=>fileURLToPath(new URL(p,import.meta.url));
const out=local('./shots');mkdirSync(out,{recursive:true});
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const report={date:new Date().toISOString(),model:'1001 normal and jam states checked',layouts:[],checks:[],errors:[],screenshots:[],result:'running'};
for(let i=0;i<=1000;i++){
 const normal=M.stateAt(i/1000),jam=M.stateAt(i/1000,'jam');
 assert(normal.feed>=0&&normal.feed<=1);assert(jam.p<=.51);assert.equal(jam.twist,0);assert.equal(jam.complete,false);
 if(normal.phase<2)assert.equal(normal.feed,0);
}
assert.equal(M.stateAt(1).complete,true);assert.equal(M.stateAt(1,'jam').jammed,true);
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--do-not-de-elevate','--allow-file-access-from-files']});
const gameState=page=>page.evaluate(()=>window.__TYING_GAME__.state);
const appState=page=>page.evaluate(()=>window.__TYING__.state);
async function opened(width,height,{reducedMotion='reduce',deviceScaleFactor=1}={}){
 const page=await browser.newPage({viewport:{width,height},reducedMotion,deviceScaleFactor});
 page.setDefaultTimeout(10000);page.on('pageerror',e=>report.errors.push({width,height,message:e.message}));
 await page.goto(new URL('../index.html',import.meta.url).href);await page.waitForFunction(()=>window.__TYING_GAME__&&window.__TYING__);
 return page;
}
async function shot(page,name,options={}){const path=join(out,name);await page.screenshot({path,timeout:30000,...options});report.screenshots.push(path);}
async function aim(page,idOrPoint){
 await page.locator('#game-board').scrollIntoViewIfNeeded();
 const screen=await page.evaluate(value=>{const svg=document.querySelector('#game-board'),p=typeof value==='string'?__TYING_GAME__.model.POINTS.find(p=>p.id===value):value,point=svg.createSVGPoint();point.x=p.x;point.y=p.y;const screen=point.matrixTransform(svg.getScreenCTM());return {x:screen.x,y:screen.y,aimX:p.x,aimY:p.y};},idOrPoint);
 await page.mouse.click(screen.x,screen.y);
 await page.waitForFunction(({aimX,aimY})=>Math.hypot(__TYING_GAME__.state.aim.x-aimX,__TYING_GAME__.state.aim.y-aimY)<.25,screen);
}
async function bind(page,id){await aim(page,id);await page.locator('#game-trigger').click();await page.waitForFunction(id=>!__TYING_GAME__.state.busy&&__TYING_GAME__.state.points.find(p=>p.id===id).tied,id);}
async function select(page,id){await page.locator(`[data-game-select="${id}"]`).click();assert.equal((await gameState(page)).selected,id);}
async function pull(page){await page.locator('#game-pull').click();await page.waitForFunction(()=>!__TYING_GAME__.state.busy);}
async function markAndRepair(page,id){
 await page.locator('#game-mark').click();assert((await gameState(page)).points.find(p=>p.id===id).marked);
 await page.locator('#game-repair').click();await page.waitForFunction(()=>!__TYING_GAME__.state.busy);
 const s=await gameState(page),p=s.points.find(p=>p.id===id);assert.equal(s.isolated,true);assert.equal(p.repaired,true);assert.equal(p.checked,false,'repair alone must not pass review');
 await pull(page);assert((await gameState(page)).points.find(p=>p.id===id).checked);
}
async function seek(page,value){await page.locator('#progress').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function layout(page,label){
 const result=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,mode:document.body.dataset.mode,aside:{client:document.querySelector('aside').clientHeight,scroll:document.querySelector('aside').scrollHeight},main:document.querySelector('main').getBoundingClientRect().toJSON()}));
 assert(result.scrollWidth<=result.width+1,`${label}: horizontal overflow ${result.scrollWidth}/${result.width}`);
 if(result.width>=1000)assert(result.scrollHeight<=result.height+1,`${label}: desktop document overflows; panel may scroll internally`);
 report.layouts.push({label,...result});
}
async function reviewWorkflow(page,{capture=false}={}){
 await page.locator('#game-next').click();assert.equal((await gameState(page)).stage,'review');assert.equal((await gameState(page)).isolated,true);
 await select(page,'A');await pull(page);assert((await gameState(page)).points[0].checked);
 await select(page,'B');assert.equal((await gameState(page)).points[1].quality,'missing');await markAndRepair(page,'B');
 await select(page,'C');await pull(page);assert.equal((await gameState(page)).points[2].checked,false);assert((await gameState(page)).points[2].observed);
 if(capture)await shot(page,'new-review-desktop.png');
 await markAndRepair(page,'C');await select(page,'D');await pull(page);
 const s=await gameState(page);assert.equal(s.stage,'done');assert.equal(s.points.filter(p=>p.checked).length,4);assert(await page.locator('#game-complete').isVisible());
 await page.locator('#game-study').click();assert.equal((await appState(page)).mode,'cycle');
}
async function studyWorkflow(page,{capture=false}={}){
 for(const [i,value] of [[0,.1],[1,.3],[2,.5],[3,.76],[4,1]]){await page.locator(`[data-phase="${i}"]`).click();const s=await appState(page);assert(Math.abs(s.p-value)<.001);assert.equal(s.phase,i);}
 assert((await appState(page)).complete);
 await page.locator('[data-phase="2"]').click();assert(Math.abs((await appState(page)).feed-.5)<.001);
 if(capture)await shot(page,'new-cycle-desktop.png');
 await page.locator('button[data-mode="fault"]').click();await seek(page,1000);
 let s=await appState(page);assert.equal(s.p,.51);assert.equal(s.twist,0);assert.equal(s.complete,false);assert(await page.locator('[data-phase="3"]').isDisabled());assert(await page.locator('#isolate-fault').isDisabled());assert(await page.locator('#inspect-fault').isDisabled());
 await page.locator('#mark-fault').click();assert.equal((await appState(page)).faultMarked,true);await page.locator('#isolate-fault').click();assert.equal((await appState(page)).isolated,true);
 if(capture)await shot(page,'new-fault-desktop.png');
 await page.locator('#inspect-fault').click();assert.equal((await appState(page)).view,'structure');await page.locator('[data-part="guide"]').click();assert.equal(await page.locator('#iso-model').getAttribute('data-selected'),'guide');
 await page.locator('#reset').click();s=await appState(page);assert.equal(s.isolated,false);assert.equal(s.faultMarked,false);assert(await page.locator('#inspect-fault').isDisabled());
 await page.locator('[data-view="action"]').click();await seek(page,1000);await page.locator('#mark-fault').click();await page.locator('#isolate-fault').click();await seek(page,300);assert.equal((await appState(page)).isolated,false);
 await page.locator('[data-fault="normal"]').click();await seek(page,1000);assert.equal((await appState(page)).complete,true);assert.equal((await appState(page)).faultMarked,false);
 await page.locator('#help').click();assert(await page.locator('#info').evaluate(e=>e.open));await page.keyboard.press('Escape');assert(!(await page.locator('#info').evaluate(e=>e.open)));
 await page.locator('#theme').click();assert.equal(await page.locator('body').getAttribute('data-theme'),'dark');
 if(capture){await page.locator('button[data-mode="game"]').click();await page.locator('#game-restart').click();await shot(page,'new-dark.png');}
 await page.locator('#theme').click();
}
try{
 for(const [width,height] of [[1440,900],[1366,768],[390,844]]){
  console.log(`Checking ${width}x${height}`);
  const page=await opened(width,height);assert.equal((await appState(page)).mode,'game');assert.equal(await page.locator('[data-answer],.answers,[data-sample]').count(),0,'quiz controls must be absent');
  await layout(page,'default game');
  if(width===1440)await shot(page,'new-game-desktop.png');
  if(width===390)await shot(page,'new-mobile.png',{fullPage:true});
  await aim(page,{x:420,y:209});await page.locator('#game-trigger').click();assert.equal((await gameState(page)).points.filter(p=>p.tied).length,0);assert.equal((await gameState(page)).busy,null);
  await page.locator('#game-board').focus();const old=(await gameState(page)).aim.x;await page.keyboard.press('ArrowRight');assert.equal((await gameState(page)).aim.x,old+8);await page.keyboard.press('ArrowLeft');
  for(const id of ['A','B','C','D'])await bind(page,id);
  assert.equal((await gameState(page)).points.filter(p=>p.tied).length,4);
  await reviewWorkflow(page,{capture:width===1440});await studyWorkflow(page,{capture:width===1440});
  for(const mode of ['game','cycle','fault']){await page.locator(`button[data-mode="${mode}"]`).click();await layout(page,mode);}
  if(width===1440){await page.locator('#fullscreen').click();const enabled=await page.evaluate(()=>!!document.fullscreenElement);if(enabled)await page.evaluate(()=>document.exitFullscreen());report.checks.push({name:'fullscreen',enabled});}
  report.checks.push({name:'complete pointer game, two defect repairs, reinspection, cycle and fault gates',width,height});await page.close();
 }
 console.log('Checking animated phone and off-tab resume');
 const live=await opened(390,844,{reducedMotion:'no-preference'});
 await aim(live,'A');await live.locator('#game-trigger').click();assert((await gameState(live)).busy);
 await live.locator('button[data-mode="cycle"]').click();const paused=await live.locator('#game-gun').getAttribute('transform');await live.waitForTimeout(450);assert((await gameState(live)).busy);assert.equal(await live.locator('#game-gun').getAttribute('transform'),paused,'off-tab game must stay still');
 await live.locator('button[data-mode="game"]').click();await live.waitForFunction(()=>!__TYING_GAME__.state.busy);assert((await gameState(live)).points[0].tied);
 await live.emulateMedia({reducedMotion:'reduce'});for(const id of ['B','C','D'])await bind(live,id);await live.locator('#game-next').click();await select(live,'A');await live.emulateMedia({reducedMotion:'no-preference'});
 await live.locator('#game-pull').scrollIntoViewIfNeeded();await live.evaluate(()=>document.querySelector('#game-inspect').scrollIntoView({block:'start'}));
 const boardBounds=await live.locator('#game-view').boundingBox();assert(boardBounds.y+boardBounds.height<=1,'phone board must be offscreen for this regression');
 await live.locator('#game-pull').click();assert((await gameState(live)).busy);await live.waitForFunction(()=>!__TYING_GAME__.state.busy);assert((await gameState(live)).points[0].checked);
 await select(live,'B');await live.locator('#game-mark').click();await live.locator('#game-repair').click();assert.equal((await gameState(live)).isolated,false);assert(await live.locator('#game-pull').isDisabled());await live.waitForFunction(()=>!__TYING_GAME__.state.busy);assert.equal((await gameState(live)).points[1].checked,false);await pull(live);assert((await gameState(live)).points[1].checked);
 report.checks.push({name:'animated mobile bind, tab pause/resume, offscreen-board pull and repair, inspection interlock'});await live.close();
 console.log('Capturing retained structure at 4x');
 const detail=await opened(1440,900,{deviceScaleFactor:4});await detail.locator('button[data-mode="cycle"]').click();await detail.locator('[data-view="structure"]').click();
 for(const theme of ['light','dark']){if(theme==='dark')await detail.locator('#theme').click();const path=join(out,`new-structure-${theme}-4x.png`);await detail.locator('#iso-model').screenshot({path,timeout:30000});report.screenshots.push(path);}await detail.close();
 assert.equal(report.errors.length,0);report.result='passed';
 console.log(JSON.stringify({result:report.result,layouts:report.layouts.length,checks:report.checks,errors:report.errors,screenshots:report.screenshots.length},null,2));
}catch(error){report.result='failed';report.failure={message:error.message,stack:error.stack};throw error;}
finally{writeFileSync(local('./report.json'),JSON.stringify(report,null,2));await browser.close();}
