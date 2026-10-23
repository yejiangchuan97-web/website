import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const out=fileURLToPath(new URL('.',import.meta.url));mkdirSync(out,{recursive:true});
const url=new URL('../../index.html',import.meta.url).href;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const report={checks:[],errors:[],viewports:[],snapshots:[]};
const add=x=>report.checks.push(x);
const state=p=>p.evaluate(()=>window.masonryLab.snapshot());
const action=(p,k,v)=>p.locator(`[data-game-action="${k}"]${v!==undefined?`[data-value="${v}"]`:''}`);
const range=async(p,id,value)=>{await p.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));};
const watch=p=>p.on('pageerror',e=>report.errors.push(e.message));
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}});watch(p);await p.goto(url);await p.waitForSelector('[data-ready="true"]');assert.equal((await state(p)).scene.renderer,'three-solid-3d');
 await action(p,'orientation-check').click();assert.equal((await state(p)).manual.progress,0);
 await action(p,'rotate').click();await action(p,'orientation-check').click();await action(p,'rotate').click();await action(p,'orientation-check').click();await action(p,'flip').click();await action(p,'orientation-check').click();assert.equal((await state(p)).manual.completed[0],true);add('orientation: wrong attempt + rotate/flip + all three states');
 await action(p,'lesson',1).click();await action(p,'width',365).click();await action(p,'place').click();assert.equal((await state(p)).manual.placedCount,0);
 await action(p,'rotate').click();await action(p,'place').click();await action(p,'place').click();await action(p,'rotate').click();await action(p,'place').click();await action(p,'thickness-check').click();assert.equal((await state(p)).manual.completed[1],true);
 await action(p,'undo').click();assert.equal((await state(p)).manual.completed[1],false);await action(p,'place').click();await action(p,'thickness-check').click();add('365mm wall: orientation rejection, 3 placements, undo invalidates pass, recheck');
 await action(p,'width',240).click();await action(p,'rotate').click();await action(p,'place').click();await action(p,'place').click();await action(p,'thickness-check').click();assert.equal((await state(p)).manual.completed[1],true);add('240mm wall playable with geometric validation');
 await action(p,'lesson',2).click();await action(p,'bond-check').click();assert.equal((await state(p)).manual.completed[2],false);await range(p,'#gameOffset',62.5);await range(p,'#gameMortar',10);await action(p,'bond-check').click();assert.equal((await state(p)).manual.completed[2],true);
 await range(p,'#gameOffset',0);assert.equal((await state(p)).manual.completed[2],false);await range(p,'#gameOffset',62.5);await action(p,'bond','same').click();await action(p,'bond-check').click();assert.equal((await state(p)).manual.completed[2],false);await action(p,'bond','swap').click();await action(p,'bond-check').click();assert.equal((await state(p)).manual.progress,3);add('bond: real through-joint rejection, depth bond, 10mm teaching target, pass invalidation');
 await action(p,'width',365).click();await action(p,'bond-check').click();assert.equal((await state(p)).manual.inspection.throughCount,0);assert.equal((await state(p)).manual.completed[2],true);add('365mm alternating bond eliminates real joint overlap');
 await p.locator('[data-tab="issues"]').click();for(const issue of ['joints','mortar','datum']){await p.locator(`[data-issue="${issue}"]`).click();await p.locator('#fixIssue').click();assert.match(await p.locator('#metric1').innerText(),/已修正/);}add('all three human-work disturbances and fixes');
 await p.locator('[data-tab="robot"]').click();await p.locator('#play').click();await p.waitForFunction(()=>window.masonryLab.snapshot().t>.15);await p.locator('#play').click();const paused=(await state(p)).t;await p.waitForTimeout(120);assert.equal((await state(p)).t,paused);add('actual animation advances and pauses');
 await range(p,'#timeline',3.5);assert.equal((await state(p)).robot.brick.yaw,Math.PI/4);assert.equal((await state(p)).playing,false);await p.locator('#step').click();assert.equal((await state(p)).t,4);add('scrub and phase step share the kinematic model');
 await p.locator('#datumFault').check();await range(p,'#timeline',8);assert.equal((await state(p)).robot.error,18);assert.match(await p.locator('#robotFeedback').innerText(),/18 mm/);await p.locator('#calibrate').click();await range(p,'#timeline',8);assert.equal((await state(p)).robot.error,0);add('18mm datum fault measured, correction changes next target');
 await p.locator('[data-platform="mobile"]').click();assert.equal((await state(p)).robot.platform,'mobile');assert.equal((await state(p)).corrected,false);await p.locator('[data-view="top"]').click();assert.equal((await state(p)).scene.view,'top');await p.locator('[data-view="iso"]').click();
 const canvas=p.locator('#stage');const bounds=await canvas.boundingBox();const yaw=(await state(p)).scene.yaw;await p.mouse.move(bounds.x+bounds.width*.45,bounds.y+bounds.height*.5);await p.mouse.down();await p.mouse.move(bounds.x+bounds.width*.58,bounds.y+bounds.height*.55,{steps:8});await p.mouse.up();assert.notEqual((await state(p)).scene.yaw,yaw);await canvas.focus();await p.keyboard.press('Home');await p.keyboard.press('ArrowRight');assert.notEqual((await state(p)).scene.yaw,-1.08);add('mobile supports, real drag orbit, keyboard rotation, view presets');
 await p.locator('.mechanism-details summary').click();await range(p,'#explode',1);assert.equal((await state(p)).scene.explode,1);await range(p,'#explode',0);await p.locator('#theme').click();assert.equal((await state(p)).dark,true);await p.locator('#help').click();assert.equal(await p.locator('#helpDialog').evaluate(el=>el.open),true);await p.locator('.dialog-close').click();add('exploded covers, dark theme, help dialog');
 await p.close();
 for(const [w,h] of [[1440,900],[1024,768],[768,1024],[390,844]]){
  const q=await browser.newPage({viewport:{width:w,height:h}});watch(q);await q.goto(url);await q.waitForSelector('[data-ready="true"]');
  for(const tab of ['manual','issues','robot']){await q.locator(`[data-tab="${tab}"]`).click();const sizes=await q.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,stage:document.getElementById('stage').getBoundingClientRect().toJSON(),controls:document.querySelector('.control-panel').getBoundingClientRect().toJSON()}));assert(sizes.scroll<=w+1);assert(sizes.stage.width>250&&sizes.stage.height>=300);report.viewports.push({w,h,tab,overflow:false});}
  if(w===390){await q.locator('[data-tab="manual"]').click();await action(q,'lesson',1).click();await action(q,'width',365).click();await action(q,'place').click();assert.equal((await state(q)).manual.placedCount,1);add('390px touch-sized controls reachable and usable');}
  await q.close();
 }
 const reduced=await browser.newPage({viewport:{width:1200,height:900},reducedMotion:'reduce'});watch(reduced);await reduced.goto(url);await reduced.locator('[data-tab="robot"]').click();await reduced.locator('#play').click();assert.equal((await state(reduced)).playing,false);assert.equal((await state(reduced)).t,1);await range(reduced,'#timeline',8);await reduced.locator('#play').click();assert.equal((await state(reduced)).t,0);add('reduced motion: discrete pose steps, replay reset, no automatic playback');await reduced.close();
 const fallback=await browser.newPage({viewport:{width:1440,height:1000}});watch(fallback);await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});await fallback.goto(url);await fallback.waitForSelector('[data-ready="true"]');assert.equal((await state(fallback)).scene.renderer,'anatomy-svg-fallback');await action(fallback,'rotate').click();await action(fallback,'orientation-check').click();assert.equal((await state(fallback)).manual.orientationStep,1);await fallback.locator('[data-tab="robot"]').click();await range(fallback,'#timeline',3.5);assert(await fallback.locator('#stage svg').count());assert((await state(fallback)).scene.parts>70);add('WebGL-unavailable Anatomy projection fallback retains game and timeline');await fallback.close();
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 console.log(JSON.stringify(report,null,2));
}finally{writeFileSync(join(out,'browser-results.json'),JSON.stringify(report,null,2));await browser.close();}
