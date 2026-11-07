async page => {
 await page.setViewportSize({width:1414,height:964});
 await page.route('**/*',route=>route.continue());
 await page.reload();await page.waitForFunction(()=>window.LessonLab&&!GalleryLab.state().loading);
 await page.screenshot({path:'artifacts/screenshots/lesson-workstation-12.png'});
 const layout=await page.evaluate(()=>({body:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],frame:document.querySelector('#lesson-frame').getBoundingClientRect().toJSON(),scene:document.querySelector('#scene').getBoundingClientRect().toJSON(),state:GalleryLab.state()}));
 await page.goto('http://127.0.0.1:8765/course/chapters/01/tasks/1-3/index.html');
 await page.waitForFunction(()=>window.LessonLab&&!GalleryLab.state().loading);
 await page.locator('[data-tab="inspection-rover"]').click();
 await page.waitForFunction(()=>!GalleryLab.state().loading&&GalleryLab.state().selected==='inspection-rover');
 await page.screenshot({path:'artifacts/screenshots/lesson-workstation-rover.png'});
 return layout;
}
