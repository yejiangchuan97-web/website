async page => {
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const base of ['http://127.0.0.1:8765/artifacts/site/','file:///C:/Users/Administrator/Documents/GitHub/website/artifacts/site/']){
  await page.goto(base+'course/chapters/01/tasks/1-3/index.html');
  await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
  await page.locator('[data-tab="sharpa"]').click();await page.waitForFunction(()=>GalleryLab.state().selected==='sharpa'&&!GalleryLab.state().loading);
  if(!await page.evaluate(()=>GalleryLab.state().webgl&&GalleryLab.state().parts.length===6&&GalleryLab.state().renderer.triangles>100000))throw Error('hand mesh missing');
  await page.locator('#joint-pinky').focus();await page.keyboard.press('End');await page.waitForFunction(()=>GalleryLab.state().readings.find(x=>x.id==='pinky').value>99);
  await page.locator('#reset-motion').click();await page.locator('#fullscreen').click();await page.waitForFunction(()=>document.body.classList.contains('viewport-expanded'));await page.locator('#fullscreen').click();
  await page.locator('[data-focus="thumb"]').click();await page.locator('[data-inspector="anatomy"]').click();await page.locator('#toggle-explode').click();await page.waitForFunction(()=>GalleryLab.state().displayExplode>.99);await page.locator('#reset-motion').click();
  await page.locator('.source-note summary').click();await page.locator('.source-note a').click();await page.waitForURL('**/sharpa-LICENSE.html');if(!(await page.title()).includes('Sharpa'))throw Error('license missing');
  checks.push(base+' mesh, independent pinky, reset, fullscreen, assembly and license passed');
 }
 if(errors.length)throw Error(errors.join(';'));return {checks,errors};
}
