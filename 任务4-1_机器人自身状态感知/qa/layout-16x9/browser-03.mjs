const task=await taskSpace(8),page=task.page('p1');
const win=await task.cdp('Browser.getWindowForTarget',{targetId:page.targetId});
await task.cdp('Browser.setWindowBounds',{windowId:win.windowId,bounds:{windowState:'normal'}});
console.log(await page.screenshot({path:'C:/Users/Administrator/Documents/GitHub/website/任务4-1_机器人自身状态感知/qa/layout-16x9/reference.png'}));
