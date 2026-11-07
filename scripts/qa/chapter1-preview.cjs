// Capture the first-chapter pilot using playwright-cli run-code --filename.
async page => {
 const root='http://127.0.0.1:8765/';
 await page.setViewportSize({width:1328,height:964});
 const load=async id=>{await page.goto(root+'course/chapters/01/tasks/'+id+'/index.html');await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading&&!GalleryLab.state().error);};
 await load('1-2');
 await page.screenshot({path:'artifacts/screenshots/chapter1-pilot-machinery.png'});
 await page.locator('#learning-guide').click();
 await page.screenshot({path:'artifacts/screenshots/chapter1-pilot-guide.png'});
 await page.locator('#learning-guide-start').click();
 await page.locator('#step').click();
 await page.locator('#fullscreen').click();
 await page.waitForFunction(()=>document.querySelector('#fullscreen').getAttribute('aria-pressed')==='true');
 await page.screenshot({path:'artifacts/screenshots/chapter1-pilot-fullscreen.png'});
 await page.locator('#fullscreen').click();
 await page.waitForFunction(()=>!document.body.classList.contains('viewport-expanded'));
 await load('1-3');
 await page.locator('[data-tab="sharpa"]').click();
 await page.waitForFunction(()=>GalleryLab.state().selected==='sharpa'&&!GalleryLab.state().loading&&!GalleryLab.state().error);
 await page.screenshot({path:'artifacts/screenshots/chapter1-pilot-hand.png'});
 await page.locator('#step').click();
 await page.locator('#fullscreen').click();
 await page.screenshot({path:'artifacts/screenshots/chapter1-pilot-hand-fullscreen.png'});
 await page.locator('#fullscreen').click();
 return {hand:await page.evaluate(()=>GalleryLab.state()),screenshots:5};
}
