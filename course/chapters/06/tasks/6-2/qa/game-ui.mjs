// Run: node qa/game-ui.mjs --space 6 --phase desktop|mobile|fallback|regression
// Reuses the goal's Ego task space; production state is only read, never patched.
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join, dirname} from 'node:path';
import assert from 'node:assert/strict';

const here=dirname(fileURLToPath(import.meta.url));
if(typeof taskSpace==='undefined'){
 const argv=process.argv.slice(2),option=(name,fallback)=>argv.includes(name)?argv[argv.indexOf(name)+1]:fallback;
 const phase=option('--phase','desktop'),space=option('--space','6');
 const entry=pathToFileURL(fileURLToPath(import.meta.url));entry.searchParams.set('phase',phase);entry.searchParams.set('space',space);
 const child=spawnSync('ego-browser',['nodejs','-e',`await import('${entry.href}')`],{stdio:'inherit',windowsHide:true});
 process.exit(child.status??1);
}else{
 const query=new URL(import.meta.url).searchParams,phase=query.get('phase')||'desktop';
 const task=await taskSpace(Number(query.get('space')||6));
 const page=await task.newPage();
 const out=join(here,'game-ui');mkdirSync(out,{recursive:true});
 const report={phase,page:page.label,checks:[],errors:[],screenshots:[]};
 const checkpoint=(name,details)=>{report.checks.push({name,details});console.log('PASS',name,details??'');};
 const read=()=>page.evaluate(()=>window.tilingLab.snapshot());
 const click=async id=>{
  report.lastAction=`click #${id}`;
  try{return await page.click(`#${id}`);}catch(error){
   if(!String(error).includes('intercepts pointer events'))throw error;
   const hit=await page.evaluate(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,visible:x>=0&&x<innerWidth&&y>=0&&y<innerHeight,clear:el.contains(document.elementFromPoint(x,y))};},id);
   if(!hit.visible||!hit.clear)throw error;
   // Ego can retain stale scroll coordinates after keyboard focus on mobile.
   // Verify the actual hit target, then send genuine pointer events at its center.
   report.nativeCoordinateRetries??=[];report.nativeCoordinateRetries.push({id,...hit});
   await page.cdp('Input.dispatchMouseEvent',{type:'mouseMoved',x:hit.x,y:hit.y});
   await page.cdp('Input.dispatchMouseEvent',{type:'mousePressed',x:hit.x,y:hit.y,button:'left',clickCount:1});
   await page.cdp('Input.dispatchMouseEvent',{type:'mouseReleased',x:hit.x,y:hit.y,button:'left',clickCount:1});
  }
 };
 const tab=name=>page.click(`[data-tab="${name}"]`);
 const reveal=async id=>{const panel=await page.evaluate(id=>{const el=document.getElementById(id),details=el?.closest('details');return details&&!details.open?el.closest('[data-panel]').dataset.panel:null;},id);if(panel)await page.click(`[data-panel="${panel}"] details summary`);};
 const select=async(id,value)=>{await reveal(id);await page.selectOption(`#${id}`,value);};
 const setValue=async(id,value)=>{await reveal(id);return page.evaluate(({id,value})=>{const el=document.getElementById(id);if(!el)throw new Error('Missing control '+id);el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},{id,value});};
 const setCheck=async(id,value)=>{await reveal(id);if(await page.evaluate(id=>document.getElementById(id).checked,id)!==value)await click(id);};
 const shot=async name=>{const path=join(out,`${phase}-${name}.png`);await page.screenshot({path});report.screenshots.push(path);};
 const until=condition=>page.waitForFunction(condition,undefined,{timeout:16000});
 const noOverflow=async()=>{const box=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(box.scrollWidth<=box.width+1,JSON.stringify(box));return box;};
 try{
  const windowInfo=await task.cdp('Browser.getWindowForTarget',{targetId:page.targetId});
  await task.cdp('Browser.setWindowBounds',{windowId:windowInfo.windowId,bounds:{windowState:'normal'}});
  await page.cdp('Emulation.setDeviceMetricsOverride',{width:phase==='mobile'?390:1440,height:phase==='mobile'?844:1000,deviceScaleFactor:1,mobile:phase==='mobile'});
  if(phase==='mobile')await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:`window.__qaErrors=[];addEventListener('error',e=>__qaErrors.push(e.message));addEventListener('unhandledrejection',e=>__qaErrors.push(String(e.reason)));${phase==='fallback'?"const originalGetContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return String(kind).includes('webgl')?null:originalGetContext.call(this,kind,...args)};":''}`});
  await page.goto(pathToFileURL(join(here,'../index.html')).href);
  await until(()=>window.tilingLab&&document.getElementById('missionCheck'));
  console.log({phase,page:page.label});
  if(phase==='regression'){
   await tab('vision');await click('correct');await until(()=>window.tilingLab.snapshot().correcting);
   await page.focus('#stage');await page.press('#stage','ArrowRight');assert.equal((await read()).correcting,false);
   checkpoint('Keyboard single-step cancels continuous visual correction');
   await tab('vacuum');await select('layout','quad');await click('lowLift');
   await until(()=>!!window.tilingLab.snapshot().trialSignature&&!window.tilingLab.snapshot().lifting);
   await reveal('cycleStep');await click('lowLift');let s=await read();assert.equal(s.trialSignature,'');assert.equal(s.lifting,true);
   await click('cyclePlay');await click('cycleStep');s=await read();assert.equal(s.playing,false);assert(s.t<=1.251);
   await until(()=>!!window.tilingLab.snapshot().trialSignature&&!window.tilingLab.snapshot().lifting);
   checkpoint('Repeated low lift clears old certification and blocks concurrent transport');
   await click('cyclePlay');await until(()=>window.tilingLab.snapshot().t>1.2);
   await setCheck('leak',true);s=await read();assert.equal(s.needsReturn,true);assert.equal(s.playing,false);assert.equal(s.trialSignature,'');
   assert((await page.evaluate(()=>document.getElementById('statusNote').textContent)).includes('故障快照'));
   await click('lowLift');assert.equal((await read()).lifting,false);await click('cyclePlay');assert.equal((await read()).playing,false);
   await shot('midair-fault');await click('cycleReset');s=await read();assert.equal(s.t,0);assert.equal(s.needsReturn,false);assert.equal(s.trialSignature,'');
   await setCheck('leak',false);await click('lowLift');await until(()=>!!window.tilingLab.snapshot().trialSignature&&!window.tilingLab.snapshot().lifting);
   checkpoint('Midair loss stays a labeled fault snapshot until return and a new verified trial');
   await click('cyclePlay');await until(()=>window.tilingLab.snapshot().t>1.2);
   await page.focus('#stage');await page.press('#stage','ArrowRight');s=await read();assert.equal(s.playing,false);assert.equal(s.t,2);
   await tab('height');await click('forcePlay');await until(()=>window.tilingLab.snapshot().press.compression>.1);
   await page.focus('#stage');await page.press('#stage','ArrowRight');assert.equal((await read()).pressing,false);
   checkpoint('Keyboard single-step cancels transport and force playback');
   await shot('keyboard-stop');checkpoint('Regression viewport has no horizontal overflow',await noOverflow());
  }else{
  await tab('vision');
  checkpoint('Initial page and controls load',await noOverflow());
  await shot('initial');
  await click('theme');assert.equal(await page.evaluate(()=>document.body.dataset.theme),'dark');await shot('dark');await click('theme');
  checkpoint('Theme control switches to dark and back');
  if(phase==='mobile'){
   const beforeKey=(await read()).ex;await page.focus('#errorX');await page.press('#errorX','ArrowLeft');assert((await read()).ex<beforeKey);
   const beforeStep=(await read()).ex;await page.focus('#stage');await page.press('#stage','ArrowRight');assert((await read()).ex<beforeStep);
   checkpoint('Keyboard range adjustment and stage single-step operate in reduced motion');
  }
  const initial=await read();
  await select('visibility','blocked');
  let s=await read();assert.equal(s.observation.valid,false);assert.equal(s.observation.ex,null);assert.equal(s.observation.ey,null);assert.equal(s.observation.angle,null);
  assert.deepEqual(await page.evaluate(()=>['m1','m2','m3'].map(id=>document.getElementById(id).textContent)),['—','—','—']);
  await click('correct');s=await read();assert.equal(s.correcting,false);assert.equal(s.ex,initial.ex);
  const beforeSlip=await read();await click('blindContinue');s=await read();assert.notEqual(s.ex,beforeSlip.ex);assert.deepEqual(s.cached,beforeSlip.cached);
  await shot('occluded');
  await select('visibility','clear');assert.equal((await read()).observation.valid,false);
  await click('correct');assert.equal((await read()).correcting,false);
  await click('reacquire');assert.equal((await read()).observation.valid,true);
  checkpoint('Occlusion hides all live pose readings, blocks correction, and requires explicit reacquisition');
  if(phase==='mobile'){
   await page.focus('#reacquire');
   await until(()=>{const b=document.getElementById('mobileToggle');return b.hidden||getComputedStyle(b).display==='none'||getComputedStyle(b).visibility==='hidden';});
   checkpoint('Mobile panel jump button does not cover controls after entering the panel');
  }
  if(phase==='mobile')for(let i=0;i<12;i++)await click('visionStep');
  else{await click('correct');await until(()=>window.tilingLab.snapshot().observation.aligned);}
  await click('missionCheck');assert.equal((await read()).completed.vision,true);
  checkpoint('Vision mission completes after an actual occlusion/recovery sequence');
  await click('nextMission');assert.equal((await read()).tab,'vacuum');
  const holding=[];
  for(const layout of ['single','dual','quad']){await select('layout',layout);s=await read();holding.push(s.grip.holding);if(layout!=='quad')assert.equal(s.grip.stable,false);else assert.equal(s.grip.ready,true);}
  assert(Math.max(...holding)-Math.min(...holding)<.001);
  await select('layout','single');await setValue('offsetY',0);assert.equal((await read()).grip.ready,true);
  await setValue('offsetY',110);assert.equal((await read()).grip.ready,false);
  await select('layout','quad');
  checkpoint('Equal-area 1/2/4 cup layouts preserve suction capacity and differ under offset load',holding);
  await setCheck('isolated',false);await setCheck('leak',true);const shared=await read();assert.equal(shared.grip.capacityOK,false);
  await setCheck('isolated',true);const isolated=await read();assert(isolated.grip.holding>shared.grip.holding);assert.equal(isolated.grip.capacityOK,true);assert.equal(isolated.grip.stable,false);
  await shot('leak-isolated');
  await setCheck('leak',false);await select('surface','dusty');assert.equal((await read()).grip.ready,false);await select('surface','smooth');
  checkpoint('Leak isolation restores pressure but does not automatically restore offset stability',{shared:shared.grip.holding,isolated:isolated.grip.holding});
  await click('lowLift');await until(()=>!!window.tilingLab.snapshot().trialSignature&&!window.tilingLab.snapshot().lifting);
  await setValue('vacuum',59);assert.equal((await read()).trialSignature,'');await click('missionCheck');assert.equal((await read()).completed.vacuum,false);
  await click('lowLift');await until(()=>!!window.tilingLab.snapshot().trialSignature&&!window.tilingLab.snapshot().lifting);
  await click('missionCheck');assert.equal((await read()).completed.vacuum,true);
  checkpoint('Low lift is required and configuration changes invalidate the previous trial');
  await click('nextMission');assert.equal((await read()).tab,'height');
  if(phase==='desktop'){
   await select('mode','position');await select('stiffness','160');await setValue('compression',3);await click('forcePlay');
   await until(()=>window.tilingLab.snapshot().press.damaged);const peak=(await read()).press.peakForce;
   await select('mode','force');await select('stiffness','80');await click('forceStep');s=await read();assert.equal(s.press.damaged,true);assert.equal(s.press.peakForce,peak);
   await click('missionCheck');assert.equal((await read()).completed.height,false);await shot('overpressure');
   await click('heightReset');assert.equal((await read()).press.damaged,false);
   checkpoint('Position control overpressure survives later force changes until a new preparation',{peak});
  }
  await select('mode','force');await select('stiffness','80');await setValue('targetForce',160);
  if(phase==='mobile')for(let i=0;i<20;i++)await click('forceStep');
  else{await click('forcePlay');await until(()=>window.tilingLab.snapshot().press.passed);}
  s=await read();assert(s.press.passed);assert(Math.abs(s.press.force-160)<8);assert(Math.abs(s.press.error)<=.5);
  if(phase==='desktop'){
   const force=s.press.force;await click('raised');s=await read();assert.equal(s.press.force,force);assert.equal(s.press.heightOK,false);await setValue('base',0);
   await setCheck('missing',true);await click('missionCheck');assert.equal((await read()).completed.height,false);await setCheck('missing',false);
   await click('forcePlay');await until(()=>window.tilingLab.snapshot().press.passed);
   checkpoint('Suitable force does not prove level or full mortar support');
  }
  await click('missionCheck');s=await read();assert.deepEqual(s.completed,{vision:true,vacuum:true,height:true});
  assert.equal(await page.evaluate(()=>document.getElementById('missionResult').dataset.success),'true');
  checkpoint('All three missions complete through visible controls',{force:s.press.force,height:s.press.finish,progress:await page.evaluate(()=>document.getElementById('missionProgress').textContent)});
  await shot('complete');
  await click('help');assert.equal(await page.evaluate(()=>document.getElementById('helpDialog').open),true);await page.click('#helpDialog [data-close]');
  await click('sources');assert.equal(await page.evaluate(()=>document.getElementById('sourcesDialog').open),true);await page.click('#sourcesDialog [data-close]');
  checkpoint('Help and sources dialogs open and close');
  checkpoint('Final viewport has no horizontal overflow',await noOverflow());
  if(phase==='mobile'){
   assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
   assert.equal((await read()).pressing,false);assert.equal((await read()).correcting,false);assert.equal((await read()).playing,false);
   checkpoint('390px reduced-motion mode remains manually operable without ongoing animation');
  }
  if(phase==='fallback'){
   assert.equal(await page.evaluate(()=>document.createElement('canvas').getContext('webgl')),null);
   assert(await page.evaluate(()=>document.querySelectorAll('#drawing svg path').length)>40);
   checkpoint('All missions function with WebGL contexts unavailable');
  }
  }
  report.errors=await page.evaluate(()=>window.__qaErrors);
  assert.deepEqual(report.errors,[]);
 }catch(error){report.failure=String(error.stack||error);try{report.failureState=await read();report.failureLayout=await page.evaluate(action=>{const id=action?.split('#')[1],el=document.getElementById(id),r=el?.getBoundingClientRect();return {scrollY,scroll: getComputedStyle(document.documentElement).scrollBehavior,target:id,rect:r?.toJSON(),cover:r?[...document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2)].map(e=>e.tagName+'#'+e.id).slice(0,8):[]};},report.lastAction);await shot('failure');}catch{}throw error;}
 finally{writeFileSync(join(out,`${phase}-report.json`),JSON.stringify(report,null,2));await page.close();}
 console.log(JSON.stringify(report,null,2));
}
