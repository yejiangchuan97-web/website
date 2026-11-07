async page => {
 await page.route('**/*',route=>route.continue());
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:8765/course/home/index.html');
 await page.screenshot({path:'artifacts/screenshots/hall-revision/mobile-home-review.png',fullPage:true});
 const boxes=await page.locator('#labels a').evaluateAll(nodes=>nodes.map(n=>({id:n.id,...n.getBoundingClientRect().toJSON()})));
 await page.goto('http://127.0.0.1:8765/course/chapters/01/overview/index.html');
 await page.screenshot({path:'artifacts/screenshots/hall-revision/mobile-chapter-review.png',fullPage:true});
 return boxes;
}
