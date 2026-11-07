async page => {
 const base=new URL('../../../../../',page.url()).href,kind=base.startsWith('file:')?'file':base.includes('/artifacts/site/')?'package':'source',checks=[],errors=[],guideTitles={};
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.continue());
 const ok=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
 const go=async id=>{await page.goto(new URL('course/chapters/01/tasks/'+id+'/index.html',base).href);await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);};
 const select=async id=>{await page.locator('[data-tab="'+id+'"]').click();await page.waitForFunction(id=>GalleryLab.state().selected===id&&!GalleryLab.state().loading,id);};
 const actionState=()=>page.evaluate(()=>{const s=GalleryLab.state();return JSON.stringify({selected:s.selected,time:s.time,playing:s.playing,manual:s.manual,part:s.part,clip:s.clip,explode:s.explode,view:s.view});});
 const cameraState=()=>page.evaluate(()=>{const s=Workshop.stage;return{az:s.az,el:s.el,zoom:s.zoom};});
 const sameCamera=(a,b)=>['az','el','zoom'].every(key=>Math.abs(a[key]-b[key])<1e-8);
 const nextFrames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
 const guide=async(task,label)=>{
  await page.locator('#learning-guide').click();
  ok(await page.locator('#learning-guide-dialog').evaluate(n=>n.open),label+' learning guide opens');
  const text=await page.locator('#learning-guide-dialog').innerText();
  ok((task==='1-2'?/机械|作业/:/机器人|机械手/).test(text)&&['这一节学什么','在展厅里这样观察','观察后，试着说清楚'].every(t=>text.includes(t)),label+' task learning content');
  ok(await page.locator('#learning-guide-dialog .guide-goals li').count()>=2&&await page.locator('#learning-guide-dialog .guide-steps li').count()>=2,label+' goals and observation steps');
  guideTitles[task]=await page.locator('#learning-guide-title').innerText();
  await page.locator('#learning-guide-close').click();
  await page.waitForFunction(()=>!document.querySelector('#learning-guide-dialog').open&&document.activeElement.id==='learning-guide');
  ok(true,label+' close returns focus to guide button');
  await page.locator('#learning-guide').click();await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#learning-guide-dialog').open&&document.activeElement.id==='learning-guide');
  ok(true,label+' Escape closes learning guide');
  await page.locator('#learning-guide').click();await page.locator('#learning-guide-start').click();
  await page.waitForFunction(()=>!document.querySelector('#learning-guide-dialog').open&&document.activeElement.id==='scene');
  ok(true,label+' start observation focuses scene');
 };
 const fullscreen=async(label,{escape=false,reject=false}={})=>{
  await page.locator('#step').click();
  await page.locator('#view-front').click();await page.locator('#scene').focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('+');
  const before=await actionState(),cameraBefore=await cameraState(),bounds=await page.locator('#exhibit-viewport').boundingBox();
  if(reject)await page.evaluate(()=>{const panel=document.querySelector('#exhibit-viewport');window.__galleryQaFullscreen=Object.getOwnPropertyDescriptor(panel,'requestFullscreen');Object.defineProperty(panel,'requestFullscreen',{configurable:true,value:()=>Promise.reject(new Error('QA: fullscreen denied'))});});
  try{
   await page.locator('#fullscreen').click();
   await page.waitForFunction(()=>document.body.classList.contains('viewport-expanded')&&document.querySelector('#fullscreen').getAttribute('aria-pressed')==='true');
   await page.waitForFunction(()=>{const r=document.querySelector('#exhibit-viewport').getBoundingClientRect();return Math.abs(r.x)<2&&Math.abs(r.y)<2&&Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2;});
   await nextFrames();
   ok(true,label+' expanded viewport fills window');
   ok(await page.locator('#fullscreen').innerText().then(t=>t.includes('恢复')),label+' restore label');
   ok(await actionState()===before,label+' expanding preserves action state');
   ok(sameCamera(await cameraState(),cameraBefore),label+' expanding preserves chosen angle and zoom');
   if(reject)ok(await page.evaluate(()=>document.body.classList.contains('viewport-fallback')&&!document.fullscreenElement),label+' rejected API uses in-page fullscreen');
   await page.locator('#scene').focus();await page.keyboard.press('ArrowRight');
   const cameraInside=await cameraState();
   ok(Math.abs(cameraInside.az-cameraBefore.az)>.05,label+' camera remains operable while expanded');
   if(escape){await page.locator('#scene').focus();await page.keyboard.press('Escape');}
   else await page.locator('#fullscreen').click();
   await page.waitForFunction(()=>!document.body.classList.contains('viewport-expanded')&&!document.fullscreenElement&&document.querySelector('#fullscreen').getAttribute('aria-pressed')==='false');
   await page.waitForFunction(b=>{const r=document.querySelector('#exhibit-viewport').getBoundingClientRect();return Math.abs(r.x-b.x)<3&&Math.abs(r.y-b.y)<3&&Math.abs(r.width-b.width)<3&&Math.abs(r.height-b.height)<3;},bounds);
   await nextFrames();
   ok(true,label+' restores original panel bounds');
   ok(await actionState()===before,label+(escape?' Escape exits without resetting action':' restoring preserves action state'));
   ok(sameCamera(await cameraState(),cameraInside),label+' restoring keeps angle selected while expanded');
   ok(await page.locator('#fullscreen').innerText().then(t=>t.includes('全屏'))&&!await page.evaluate(()=>document.body.classList.contains('viewport-fallback')),label+' restores button and layout state');
  }finally{
   if(reject)await page.evaluate(()=>{const panel=document.querySelector('#exhibit-viewport');if(window.__galleryQaFullscreen)Object.defineProperty(panel,'requestFullscreen',window.__galleryQaFullscreen);else delete panel.requestFullscreen;delete window.__galleryQaFullscreen;});
  }
 };
 for(const [task,count] of [['1-2',6],['1-3',5]]){
  await page.setViewportSize({width:1414,height:964});await go(task);
  ok(await page.locator('#tabs button').count()===count,task+' exhibit count');
  ok(await page.evaluate(()=>!window.LessonLab&&!document.querySelector('#open-records,#learning-cases,#record-dialog,[data-tab="feedback-rig"]')),task+' no lesson or record UI');
  ok(await page.evaluate(()=>!/(同题|观察记录|人机分工|形态迁移)/.test(document.body.innerText)),task+' no removed flow text');
  ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/learning(?:-model)?\.js|1-3\/src\/lesson-models/.test(r.name))),task+' no experiment or record runtime');
  ok(await page.evaluate(()=>document.querySelector('#learning-guide').nextElementSibling?.id==='help'),task+' guide precedes help');
  ok(await page.locator('#exhibit-viewport .scene-top #fullscreen').count()===1,task+' fullscreen in display toolbar');
  await guide(task,task+' desktop');
  await page.locator('#learning-guide').click();await page.screenshot({path:'artifacts/screenshots/simple-gallery-'+kind+'-'+task+'-guide.png'});await page.locator('#learning-guide-close').click();
  const ids=await page.locator('#tabs button').evaluateAll(ns=>ns.map(n=>n.dataset.tab));
  for(const id of ids){
   await select(id);ok(await page.evaluate(()=>GalleryLab.state().webgl&&GalleryLab.state().renderer.triangles>0),id+' real meshes');
   await page.locator('#step').click();ok(await page.evaluate(()=>GalleryLab.state().time>0),id+' step');
   await page.locator('#play').click();await page.waitForTimeout(120);await page.locator('#play').click();ok(await page.evaluate(()=>!GalleryLab.state().playing),id+' pause');
   await page.locator('#scene').focus();await page.keyboard.press('Escape');ok(await page.evaluate(()=>GalleryLab.state().time===0&&!GalleryLab.state().playing),id+' keyboard reset');
   if(id==='sharpa'){
    await page.locator('#joint-index').focus();await page.keyboard.press('End');
    await page.waitForFunction(()=>GalleryLab.state().readings.find(r=>r.id==='index')?.value>99.99);
    ok(await page.evaluate(()=>{const s=GalleryLab.state();return s.manual.index===100&&s.readings.filter(r=>r.id!=='index').every(r=>r.value<.01);}),id+' index slider bends only index finger');
    await page.locator('#joint-middle').focus();await page.keyboard.press('End');await page.locator('#joint-index').focus();await page.keyboard.press('Home');
    await page.waitForFunction(()=>{const r=Object.fromEntries(GalleryLab.state().readings.map(x=>[x.id,x.value]));return r.index<.01&&r.middle>99.99;});
    ok(await page.evaluate(()=>{const s=GalleryLab.state(),r=Object.fromEntries(s.readings.map(x=>[x.id,x.value]));return s.manual.index===0&&s.manual.middle===100&&r.ring<.01&&r.thumb<.01;}),id+' independent finger controls retain different positions');
    await page.locator('#reset-motion').click();
    ok(await page.evaluate(()=>GalleryLab.state().readings.every(r=>r.value<.01)&&Object.keys(GalleryLab.state().manual).length===0),id+' reset restores all fingers');
   }
  }
  await select(ids[0]);
  const part=await page.locator('[data-focus]').first().getAttribute('data-focus');await page.locator('[data-focus]').first().click();ok(await page.evaluate(p=>GalleryLab.state().part===p,part),task+' select part');
  await page.locator('[data-inspector="anatomy"]').click();await page.locator('#toggle-explode').click();await page.waitForTimeout(850);
  ok(await page.evaluate(()=>GalleryLab.state().displayExplode>.95),task+' explode structure');
  ok(await page.locator('#play').isDisabled(),task+' exploded playback interlock');
  await page.locator('#focus-selected').click();await page.locator('#reset-motion').click();
  ok(await page.evaluate(()=>GalleryLab.state().explode===0),task+' restore assembly');
  await page.locator('[data-inspector="motion"]').click();
  if(task==='1-2'){
   await page.locator('#joint-slew').focus();await page.keyboard.press('End');await page.waitForTimeout(300);
   ok(await page.evaluate(()=>GalleryLab.state().manual.slew===65),'excavator manual control');await page.locator('#reset-motion').click();
  }
  await fullscreen(task+' fullscreen button');
  await fullscreen(task+' fullscreen Escape',{escape:true});
  await fullscreen(task+' fullscreen unavailable',{reject:true});
  await fullscreen(task+' fullscreen unavailable Escape',{reject:true,escape:true});
  await page.locator('#side').evaluate(n=>n.scrollTop=0);
  for(const size of [{width:1600,height:900},{width:1414,height:964},{width:390,height:844}]){
   await page.setViewportSize(size);await page.waitForTimeout(200);
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),task+' no page scrolling '+size.width);
   if(size.width>=800)ok(await page.locator('#gallery-frame').evaluate(n=>Math.abs(n.getBoundingClientRect().width/n.getBoundingClientRect().height-16/9)<.01),task+' 16:9 '+size.width);
   else{
    ok(await page.locator('#fullscreen').isVisible()&&await page.locator('#learning-guide').isVisible(),task+' mobile guide and fullscreen remain visible');
    await fullscreen(task+' mobile fullscreen',{escape:true});
    await guide(task,task+' mobile');
   }
   await page.screenshot({path:'artifacts/screenshots/simple-gallery-'+kind+'-'+task+'-'+size.width+'.png'});
  }
  await page.setViewportSize({width:1414,height:964});await page.locator('#course-theme-toggle').click();await page.waitForTimeout(250);await page.screenshot({path:'artifacts/screenshots/simple-gallery-'+kind+'-'+task+'-dark.png'});await page.locator('#course-theme-toggle').click();
  await page.locator('#help').click();ok(await page.locator('#help-dialog').evaluate(n=>n.open),task+' help');await page.keyboard.press('Escape');
  ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),task+' offline dependencies only');
 }
 ok(guideTitles['1-2']!==guideTitles['1-3'],'tasks have different learning guides');
 // Rapid asynchronous model switches must keep only the last selection.
 await page.evaluate(()=>{GalleryLab.select('g1');GalleryLab.select('go2');GalleryLab.select('iiwa');GalleryLab.select('sharpa');});
 await page.waitForFunction(()=>!GalleryLab.state().loading&&GalleryLab.state().selected==='sharpa');
 ok(await page.evaluate(()=>GalleryLab.model().id==='sharpa'),'latest selection wins');
 await page.goto(new URL('course/chapters/01/overview/index.html',base).href);await page.waitForFunction(()=>window.ChapterEntry);
 ok(await page.locator('#task-cards article').count()===2,'chapter retains two task entries');
 ok(!/(同题|人机分工|反馈证据)/.test(await page.locator('body').innerText()),'chapter copy matches galleries');
 await page.emulateMedia({reducedMotion:'reduce'});await go('1-3');ok(await page.evaluate(()=>!GalleryLab.state().playing&&!GalleryLab.state().tour),'reduced motion starts paused');
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:get.call(this,t,...a);};});
 for(const task of ['1-2','1-3']){
  await go(task);if(task==='1-3')await select('sharpa');ok(await page.evaluate(()=>!GalleryLab.state().webgl),'fallback '+task);
  await page.locator('#step').click();ok(await page.evaluate(()=>GalleryLab.state().time>0),'fallback step '+task);
  await fullscreen(task+' no WebGL fullscreen',{escape:true});
  await fullscreen(task+' no WebGL or fullscreen API',{reject:true});
  await guide(task,task+' no WebGL');
 }
 ok(errors.length===0,'no JavaScript exceptions');return{base,passed:checks.length,checks,errors};
}
