async page => {
  const base='http://127.0.0.1:8765/';
  const pages=[['motor','2-1/index.html'],['diesel','2-1/diesel.html'],['transmission','2-2/index.html'],['mechanisms','2-3/index.html'],['fourbar','2-3/fourbar.html']];
  const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.continue());
  for(const [lab,path] of pages){
    await page.setViewportSize({width:1600,height:900});
    await page.goto(base+'course/chapters/02/tasks/'+path);
    await page.waitForTimeout(900);
    const check={lab,errors:[]};
    await page.locator('#c2-guide').click();
    check.guide=await page.locator('#c2-learning-dialog').evaluate(el=>el.open&&el.querySelectorAll('.c2-steps li').length===3);
    await page.keyboard.press('Escape');
    check.focus=await page.locator('#c2-guide').evaluate(el=>el===document.activeElement);
    await page.locator('#c2-help').click();
    check.help=await page.locator('#c2-learning-dialog').evaluate(el=>el.open);
    await page.keyboard.press('Escape');
    const full=page.locator('.c2-fullscreen:visible').first();await full.click();
    await page.waitForTimeout(200);
    check.fullscreen=await page.evaluate(()=>!!document.fullscreenElement||!!document.querySelector('.c2-fallback'));
    check.restoreLabel=await full.textContent();await full.click();
    await page.waitForTimeout(200);
    check.restored=await page.evaluate(()=>!document.fullscreenElement&&!document.querySelector('.c2-expanded'));
    await page.screenshot({path:'artifacts/screenshots/chapter2-'+lab+'-light.png'});
    await page.locator('#course-theme-toggle').click();
    await page.waitForTimeout(300);
    await page.screenshot({path:'artifacts/screenshots/chapter2-'+lab+'-dark.png'});
    await page.locator('#course-theme-toggle').click();
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
    check.mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    await page.screenshot({path:'artifacts/screenshots/chapter2-'+lab+'-mobile.png',fullPage:true});
    results.push(check);
  }
  return {results,errors};
}
