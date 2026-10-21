const task=await taskSpace(8),page=task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/任务4-1_机器人自身状态感知/index.html');
console.log(await page.snapshot());
