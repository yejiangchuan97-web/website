async page => {
  const checks=[],errors=[],requests=[];
  const ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8765/'))requests.push(r.url());});
  await page.route('**/*',r=>r.continue());await page.setViewportSize({width:1600,height:900});
  const paths={motor:'2-1/index.html',diesel:'2-1/diesel.html',transmission:'2-2/index.html',mechanisms:'2-3/index.html',fourbar:'2-3/fourbar.html'};
  for(const base of ['http://127.0.0.1:8765/artifacts/site/','file:///C:/Users/Administrator/Documents/GitHub/website/artifacts/site/']){
    for(const [lab,path] of Object.entries(paths)){
      await page.goto(base+'course/chapters/02/tasks/'+path);await page.waitForTimeout(300);
      await page.locator('#c2-guide').click();ok(await page.locator('.c2-steps li').count()===3,base+lab+' guide');await page.keyboard.press('Escape');
      const full=page.locator('.c2-fullscreen:visible').first();await full.click();ok(await page.locator('.c2-expanded').count()===1,lab+' packaged expansion');await full.click();
      await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('.c2-expanded'));
      ok(await page.locator('.c2-expanded').count()===0,lab+' packaged restore');
      ok(await page.locator('.c2-nav [aria-current]').count()===1,lab+' packaged current navigation');
      if(lab==='transmission')ok(await full.evaluate(el=>el.getBoundingClientRect().top<document.querySelector('#sceneTitle').getBoundingClientRect().top),'transmission tools above title');
      if(lab==='fourbar'){
        const grip=page.locator('.fb-gripper .c2-fullscreen');await grip.click();ok(await page.locator('.fb-gripper.c2-expanded').count()===1,'gripper expands');await grip.click();await page.waitForFunction(()=>!document.querySelector('.c2-expanded'));
      }
    }
  }
  const context=await page.context().browser().newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
  const fallback=await context.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.route('**/*',r=>r.continue());
  for(const [lab,path] of Object.entries(paths)){
    await fallback.goto('http://127.0.0.1:8765/artifacts/site/course/chapters/02/tasks/'+path);await fallback.waitForTimeout(400);
    ok(await fallback.evaluate(()=>{
      if(window.motorLab)return motorLab.getState().paused;
      if(window.engineLab)return !engineLab.getState().running;
      if(window.MechanicsLab)return !MechanicsLab.snapshot().playing;
      if(window.mechanismLab)return !mechanismLab.snapshot().play;
      return !fourbarLab.snapshot().play;
    }),lab+' reduced-motion starts paused in fallback');
    if(lab==='motor'){
      await fallback.locator('.page-nav>button').nth(1).click();const angle=await fallback.evaluate(()=>motorLab.getState().angle);await fallback.locator('#stepBtn').click();ok(await fallback.evaluate(a=>motorLab.getState().angle!==a,angle),'motor fallback single step');
    }else if(lab==='diesel'){
      const angle=await fallback.evaluate(()=>engineLab.getState().angle);await fallback.locator('.c2-view-motion button').nth(1).click();ok(await fallback.evaluate(a=>engineLab.getState().angle!==a,angle),'diesel fallback single step');
    }else if(lab==='transmission'){
      await fallback.locator('[data-mode="hyd"]').click();ok(await fallback.evaluate(()=>MechanicsLab.snapshot().mode==='hyd'),'transmission fallback switching');
    }else if(lab==='mechanisms'){
      const angle=await fallback.evaluate(()=>mechanismLab.snapshot().theta);await fallback.locator('#boom-step').click();ok(await fallback.evaluate(a=>mechanismLab.snapshot().theta!==a,angle),'mechanisms fallback single step');
    }else{
      await fallback.locator('#fb-plus').click();ok(await fallback.evaluate(()=>fourbarLab.snapshot().thetaDegrees>54),'fourbar fallback single step');
    }
  }
  await context.close();ok(errors.length===0,'no uncaught errors');ok(requests.length===0,'no external runtime requests');
  return {checks,errors,requests};
}
