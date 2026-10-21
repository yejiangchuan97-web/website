const task=await taskSpace(8),page=task.page('p1');
console.log(await page.info());
console.log(await page.snapshot());
const {writeFile}=await import('node:fs/promises');
const shot=await page.cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
await writeFile('C:/Users/Administrator/Documents/GitHub/website/任务4-1_机器人自身状态感知/qa/layout-16x9/reference.png',Buffer.from(shot.data,'base64'));
