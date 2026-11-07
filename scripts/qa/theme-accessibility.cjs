/* Run with playwright-cli run-code --filename=scripts/qa/theme-accessibility.cjs. */
async (page) => {
  const origin='http://127.0.0.1:8765/', checks=[], errors=[];
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const mobile=await context.newPage();
  mobile.on('pageerror',e=>errors.push({url:mobile.url(),error:String(e)}));
  const paths=['course/home/index.html','course/chapters/02/overview/index.html',
    ...['1-2','2-1','3-2','4-2','5-2','5-3','6-2','7-1','8-1'].map(id=>`course/chapters/${id[0].padStart(2,'0')}/tasks/${id}/index.html`)];
  for(const path of paths){
    await mobile.goto(origin+path);
    const button=mobile.locator('#course-theme-toggle');await button.waitFor();
    const rect=await button.boundingBox();
    if(!rect||rect.width<90||rect.height<35||rect.x<0||rect.x+rect.width>391||rect.y<0||rect.y+rect.height>844)throw Error('Mobile button unreachable: '+path+JSON.stringify(rect));
    const before=await button.getAttribute('aria-pressed');await button.focus();await mobile.keyboard.press('Enter');
    if(await button.getAttribute('aria-pressed')===before)throw Error('Keyboard toggle failed: '+path);
    checks.push({path,mobile:true,keyboard:true,rect});
  }
  await mobile.goto(origin+'course/chapters/05/tasks/5-2/index.html');
  await mobile.screenshot({animations:'disabled',path:'artifacts/screenshots/theme/tying-mobile.png',fullPage:true});
  await context.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};
  });
  for(const path of paths.filter(p=>!p.includes('/2-1/')&&!p.includes('/3-2/'))){
    await mobile.goto(origin+path);
    const button=mobile.locator('#course-theme-toggle');await button.waitFor();
    const before=await button.getAttribute('aria-pressed');await button.click();
    if(await button.getAttribute('aria-pressed')===before)throw Error('Fallback toggle failed: '+path);
    checks.push({path,noWebGL:true});
  }
  await mobile.goto(origin+'course/chapters/05/tasks/5-3/index.html');
  await mobile.locator('#pump-step').click();
  if(await mobile.evaluate(()=>ConcreteLab.state().pumped[0])<=0)throw Error('Concrete fallback action failed');
  await mobile.screenshot({animations:'disabled',path:'artifacts/screenshots/theme/concrete-fallback-mobile.png',fullPage:true});
  const offline=await context.newPage();
  for(const prefix of ['', 'artifacts/site/']){
    await offline.goto('file:///C:/Users/Administrator/Documents/GitHub/website/'+prefix+'course/chapters/05/tasks/5-3/index.html');
    await offline.locator('#course-theme-toggle').click();await offline.locator('#pump-step').click();
    const result=await offline.evaluate(()=>({theme:CourseTheme.get(),amount:ConcreteLab.state().pumped[0]}));
    if(result.amount<=0)throw Error('Offline concrete action failed');
    checks.push({file:prefix||'source',...result});
  }
  await context.close();
  await page.setViewportSize({width:1600,height:900});
  for(const [path,name] of [['course/chapters/05/tasks/5-2/index.html','tying'],['course/chapters/02/overview/index.html','chapter2'],['course/chapters/02/tasks/2-1/index.html','motor']]){
    await page.goto(origin+path);
    const toggle=page.locator('#course-theme-toggle');await toggle.waitFor();
    if(await toggle.getAttribute('aria-pressed')==='true')await toggle.click();
    await page.screenshot({animations:'disabled',path:`artifacts/screenshots/theme/${name}-light.png`});
    await toggle.click();await page.screenshot({animations:'disabled',path:`artifacts/screenshots/theme/${name}-dark.png`});
  }
  if(errors.length)throw Error(JSON.stringify(errors));
  return {checks,errors};
}
