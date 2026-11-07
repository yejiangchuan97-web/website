const task=await taskSpace(2),page=task.page('p1');
const targets=await task.cdp('Target.getTargets',{});
const url=await page.url();
console.log('targets',targets.targetInfos.filter(x=>x.url===url).map(x=>({id:x.targetId,type:x.type})));
const target=targets.targetInfos.find(x=>x.url===url&&x.type==='page');
if(target){const win=await task.cdp('Browser.getWindowForTarget',{targetId:target.targetId});console.log('bounds',win);await task.cdp('Browser.setWindowBounds',{windowId:win.windowId,bounds:{windowState:'normal'}});}
await page.click('#step');
console.log(await page.evaluate(()=>({state:GalleryLab.state(),errors:window.__errors})));
await page.screenshot({path:'C:/Users/Administrator/Documents/GitHub/website/artifacts/screenshots/revision/machinery.png'});
