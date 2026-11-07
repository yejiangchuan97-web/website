// Open chapter 8's overview URL, then run with playwright-cli run-code --filename.
async page => {
 await page.route('**/*',route=>route.continue());
 const root=new URL('../../../../',page.url()).href;
 const variant=root.startsWith('file:')?'file':'source';
 const shots=`artifacts/screenshots/cover-polish/${variant}`;
 const overview=new URL('course/chapters/08/overview/index.html',root).href;
 const home=new URL('course/home/index.html',root).href;
 const previous=new URL('course/chapters/07/overview/index.html',root).href;
 const taskUrl=id=>new URL(`course/chapters/08/tasks/${id}/index.html`,root).href;
 const checks=[],errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 const ok=(value,name)=>{if(!value)throw new Error(name);checks.push(name);};
 const ready=()=>page.waitForFunction(()=>!!window.ChapterEntry);
 const state=async()=>{await ready();return page.evaluate(()=>ChapterEntry.state());};
 const go=async()=>{await page.goto(overview);await ready();};
 const href=async selector=>decodeURIComponent(await page.locator(selector).getAttribute('href'));
 const selected=async(id,label)=>{
  const s=await state();
  ok(s.selected===id&&s.visible.every(Boolean),`${label}: selected task keeps both exhibits visible`);
  ok(await page.locator('#story-title').innerText()===(id==='8-1'?'安全操作':'保养排查'),`${label}: preview title follows task`);
  ok((await href('#story-actions a')).endsWith(`/tasks/${id}/index.html`),`${label}: primary entry follows task`);
 };
 const enter=async(id,selector)=>{
  await page.locator(selector).click();
  await page.waitForURL(taskUrl(id));
  await page.waitForFunction(name=>!!window[name],id==='8-1'?'SafetyLab':'MaintenanceLab');
  ok(decodeURIComponent(page.url())===decodeURIComponent(taskUrl(id)),`${id}: task navigation opens its actual classroom`);
 };
 await page.setViewportSize({width:1600,height:900});
 await page.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'});
 await go();
 let s=await state();
 ok(s.models===2&&s.machines.join(',')==='safety-exhibit,engine'&&s.visible.every(Boolean),'desktop displays separate safety and maintenance exhibits');
 ok(s.paused&&s.time===0,'static chapter exhibits do not run maintenance actions');
 ok(!await page.locator('#motion').isVisible(),'static chapter has no animation button');
 ok(await page.locator('.chapter-index').innerText()==='08','cover displays chapter 08');
 ok(await page.locator('.task-card').count()===2,'only 8-1 and 8-2 task cards remain');
 await page.screenshot({path:`${shots}/chapter8-desktop.png`});
 for(const id of ['8-2','8-1']){
  await page.locator(`[data-part="${id}"]`).click();
  await selected(id,`${id} exhibit label`);
 }
 for(const id of ['8-2','8-1']){
  await page.locator(`[data-task="${id}"] .task-select`).click();
  await selected(id,`${id} task card`);
 }
 await enter('8-1','#story-actions a');
 await go();await page.locator('[data-task="8-2"] .task-select').click();
 await enter('8-2','[data-task="8-2"] .task-links a');
 await go();await page.locator('.course-home').click();await page.waitForURL(home);
 ok(page.url()===home,'top navigation returns to the beginning of course home');
 await go();await page.locator('.entry-brand').click();await page.waitForURL(home);
 ok(page.url()===home,'brand returns to course home');
 await go();await page.locator('.entry-footer a').click();await page.waitForURL(previous);
 ok(page.url()===previous,'footer opens chapter 7 rather than a nonexistent chapter 9');
 await go();await page.locator('#show-guide').click();
 ok(await page.locator('#entry-guide').isVisible(),'learning guide opens');
 const guide=await page.locator('#guide-content').innerText();
 ok(guide.includes('8-1')&&guide.includes('8-2')&&guide.includes('不构成真实设备放行'),'guide retains both tasks and their teaching boundary');
 await page.keyboard.press('Escape');
 ok(!await page.locator('#entry-guide').isVisible(),'Escape closes the learning guide');
 ok(await page.locator('#show-guide').evaluate(el=>el===document.activeElement),'guide closure restores keyboard focus');
 await page.locator('#theme').click();
 ok(await page.locator('html').getAttribute('data-theme')==='dark','dark theme works');
 await page.screenshot({path:`${shots}/chapter8-dark.png`});
 await page.locator('#theme').click();
 await page.locator('#stage').focus();const initial=await state();
 await page.keyboard.press('ArrowRight');
 ok((await state()).az!==initial.az,'direction key rotates the exhibit camera');
 await page.keyboard.press('+');
 const closeZoom=(await state()).zoom;
 ok(closeZoom<initial.zoom,'plus key zooms in');
 await page.keyboard.press('-');
 ok((await state()).zoom>closeZoom,'minus key zooms back out');
 await page.keyboard.press('Home');
 s=await state();ok(Math.abs(s.az-initial.az)<1e-8&&s.zoom===1,'Home restores camera framing');
 await page.keyboard.press('ArrowLeft');await page.locator('#reset-view').click();
 ok(Math.abs((await state()).az-initial.az)<1e-8,'reset-view button restores camera direction');
 await page.locator('#reset-model').click();s=await state();
 ok(s.paused&&s.time===0&&s.visible.every(Boolean),'reset leaves both static exhibits visible and paused');
 await page.setViewportSize({width:390,height:844});
 await page.emulateMedia({reducedMotion:'reduce'});await go();
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile cover has no horizontal overflow');
 ok((await state()).visible.every(Boolean),'mobile cover keeps both exhibits');
 await page.locator('[data-task="8-2"] .task-select').click();await selected('8-2','mobile task card');
 ok((await state()).paused&&!await page.locator('#motion').isVisible(),'reduced-motion view retains static behavior');
 await page.screenshot({path:`${shots}/chapter8-mobile.png`,fullPage:true});
 await enter('8-2','[data-task="8-2"] .task-links a');
 await page.addInitScript(()=>{
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};
 });
 await page.setViewportSize({width:1600,height:900});await go();
 ok((await state()).fallback,'no WebGL activates the fallback');
 ok(await page.locator('.hotspot:visible').count()===2,'fallback keeps both exhibit choices');
 for(const id of ['8-2','8-1']){
  await page.locator(`[data-part="${id}"]`).click();await selected(id,`${id} fallback exhibit`);
 }
 ok(!await page.locator('#motion').isVisible(),'fallback has no misleading animation control');
 await page.screenshot({path:`${shots}/chapter8-fallback.png`});
 await enter('8-1','#story-actions a');await go();
 await page.locator('[data-task="8-2"] .task-select').click();await enter('8-2','#story-actions a');await go();
 ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),'cover has no external runtime requests');
 ok(errors.length===0,'no uncaught browser errors');
 return {root,variant,passed:checks.length,checks,errors};
}
