async page => {
 await page.route('**/*',route=>route.continue());
 await page.setViewportSize({width:1414,height:964});
 await page.goto('http://127.0.0.1:8765/course/home/index.html');
 await page.screenshot({path:'artifacts/screenshots/cover-polish/home-desktop.png'});
 const labels=await page.locator('#labels a').evaluateAll(nodes=>nodes.map(n=>({id:n.id,...n.getBoundingClientRect().toJSON()})));
 await page.goto('http://127.0.0.1:8765/course/chapters/08/overview/index.html');
 await page.screenshot({path:'artifacts/screenshots/cover-polish/chapter8-desktop.png'});
 return {labels,chapter:await page.evaluate(()=>ChapterEntry.state())};
}
