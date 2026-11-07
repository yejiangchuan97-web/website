async page => {
 await page.route('**/*',route=>route.continue());
 await page.setViewportSize({width:1414,height:964});
 await page.goto('http://127.0.0.1:8765/course/home/index.html');
 await page.screenshot({path:'artifacts/screenshots/hall-revision/home-desktop.png'});
 const home=await page.evaluate(()=>CourseHome.state());
 await page.goto('http://127.0.0.1:8765/course/chapters/01/overview/index.html');
 await page.screenshot({path:'artifacts/screenshots/hall-revision/chapter-desktop.png'});
 const chapter=await page.evaluate(()=>ChapterEntry.state());
 return {home,chapter};
}
