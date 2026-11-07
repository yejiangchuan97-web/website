async page => {
  const base=new URL('../../../../../',page.url()).href;
  const checks=[],errors=[];const ok=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.continue());
  await page.setViewportSize({width:1600,height:900});
  const paths={motor:'2-1/index.html',diesel:'2-1/diesel.html',transmission:'2-2/index.html',mechanisms:'2-3/index.html',fourbar:'2-3/fourbar.html'};
  const state=()=>page.evaluate(()=>{
    switch(document.documentElement.dataset.c2){
      case 'motor':{const s=motorLab.getState();return {play:!s.paused,angle:s.angle};}
      case 'diesel':{const s=engineLab.getState();return {play:s.running,angle:s.angle};}
      case 'transmission':{const s=MechanicsLab.snapshot();return {play:s.playing,state:s.state};}
      case 'mechanisms':{const s=mechanismLab.snapshot();return {play:s.play,theta:s.theta,ns:s.ns,nn:s.nn};}
      case 'fourbar':{const s=fourbarLab.snapshot();return {play:s.play,theta:s.theta,revision:s.revision};}
    }
  });
  const go=async lab=>{await page.goto(base+'course/chapters/02/tasks/'+paths[lab]);await page.waitForTimeout(450);};
  for(const lab of Object.keys(paths)){
    await go(lab);
    await page.locator('#c2-guide').click();ok(!(await state()).play,lab+' guide pauses');
    await page.keyboard.press('Escape');const before=await state();await page.waitForTimeout(250);ok(JSON.stringify(before)===JSON.stringify(await state()),lab+' close does not resume');
    const full=page.locator('.c2-fullscreen:visible').first();await full.click();await full.click();ok(JSON.stringify(before)===JSON.stringify(await state()),lab+' fullscreen preserves experiment');
    await page.evaluate(()=>document.querySelector('.c2-view').requestFullscreen=()=>Promise.reject(new Error('QA denied')));
    await full.click();ok(await page.locator('.c2-fallback').count()===1,lab+' fallback expansion');
    await page.keyboard.press('Escape');ok(await page.locator('.c2-expanded').count()===0,lab+' Escape restores');
    ok(await full.evaluate(el=>el===document.activeElement),lab+' focus returns');
  }
  await go('motor');await page.locator('#c2-guide').click();await page.keyboard.press('Escape');
  await page.locator('.page-nav>button').nth(1).click();
  const motorBefore=await page.evaluate(()=>motorLab.getState());await page.locator('#stepBtn').click();ok((await page.evaluate(()=>motorLab.getState())).angle!==motorBefore.angle,'motor single step');
  await go('diesel');await page.locator('#c2-guide').click();await page.keyboard.press('Escape');
  const dieselBefore=(await state()).angle;await page.locator('.c2-view-motion button').nth(1).click();ok((await state()).angle!==dieselBefore,'diesel viewport step');
  await page.locator('[data-engine="6"]').click();ok(await page.evaluate(()=>engineLab.getState().mode===6),'diesel engine selection');
  await page.locator('.c2-activities button').nth(1).click();ok(await page.locator('#multiDashboard').isVisible(),'diesel multi-cylinder activity');
  await page.locator('.c2-activities button').nth(2).click();ok(await page.locator('.cycle-panel').isVisible(),'diesel four-stroke activity');
  await go('transmission');for(const mode of ['gear','hyd','air']){await page.locator('[data-mode="'+mode+'"]').click();ok(await page.evaluate(m=>MechanicsLab.snapshot().mode===m,mode),'transmission '+mode+' mode');}
  await go('mechanisms');const mechBefore=await page.evaluate(()=>mechanismLab.snapshot().theta);await page.locator('#boom-step').click();await page.waitForTimeout(700);ok(await page.evaluate(n=>mechanismLab.snapshot().theta!==n,mechBefore),'hydraulic step changes angle');
  await page.locator('.c2-experiments button').nth(1).click();ok(await page.locator('#screw-lab').isVisible()&&!await page.locator('#boom-lab').isVisible(),'screw individual view');
  const screwBefore=await page.evaluate(()=>mechanismLab.snapshot().ns);await page.locator('#screw-step').click();await page.waitForTimeout(1200);ok(await page.evaluate(n=>mechanismLab.snapshot().ns!==n,screwBefore),'screw step changes turns');
  await page.locator('.c2-experiments button').nth(2).click();ok(await page.locator('#screw-lab').isVisible()&&await page.locator('#boom-lab').isVisible(),'mechanism comparison view');
  await go('fourbar');await page.locator('#fb-plus').click();ok(await page.evaluate(()=>fourbarLab.snapshot().thetaDegrees>54),'fourbar step');
  const viewBefore=await page.evaluate(()=>{const v=fourbarLab.views.main;v.zoom=1.4;v.yaw=.3;return {zoom:v.zoom,yaw:v.yaw,span:v.span,target:v.target.toArray()};});
  await page.locator('.c2-fullscreen').first().click();await page.locator('.c2-fullscreen').first().click();
  ok(await page.evaluate(b=>{const v=fourbarLab.views.main;return JSON.stringify(b)===JSON.stringify({zoom:v.zoom,yaw:v.yaw,span:v.span,target:v.target.toArray()});},viewBefore),'fourbar view preserved after resize');
  for(const fallback of [false,true]){
    const context=await page.context().browser().newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
    if(fallback)await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
    const p=await context.newPage();p.on('pageerror',e=>errors.push((fallback?'noWebGL ':'reduced ')+e.message));
    await p.route('**/*',r=>r.continue());
    for(const [lab,path] of Object.entries(paths)){
      await p.goto(base+'course/chapters/02/tasks/'+path);await p.waitForTimeout(500);
      const initialized=await p.evaluate(()=>!!(window.motorLab||window.engineLab||window.MechanicsLab||window.mechanismLab||window.fourbarLab));ok(initialized,(fallback?'noWebGL ':'reduced ')+lab+' initialized');
      await p.locator('#c2-guide').click();await p.keyboard.press('Escape');
      if(fallback&&lab!=='motor')ok(await p.locator('.c2-render-fallback').count()>0,lab+' fallback is labeled');
      if(fallback){await p.screenshot({path:'artifacts/screenshots/chapter2-'+lab+'-fallback.png'});}
    }
    await context.close();
  }
  ok(errors.length===0,'no uncaught browser errors');return {base,checks,errors};
}
