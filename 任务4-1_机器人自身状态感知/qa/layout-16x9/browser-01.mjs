const task = await taskSpace('task-4-1-layout-20261021');
const page = task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/任务2-1_动力装置的基本原理/index.html');
console.log({spaceId:task.spaceId});
console.log(await page.screenshot({path:'C:/Users/Administrator/Documents/GitHub/website/任务4-1_机器人自身状态感知/qa/layout-16x9/reference.png'}));
