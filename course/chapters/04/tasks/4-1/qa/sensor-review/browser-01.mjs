const task = await taskSpace('task-4-1-sensors-20261021');
const page = task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/course/chapters/04/tasks/4-1/index.html');
console.log({spaceId:task.spaceId});
console.log(await page.snapshot());
console.log(await page.screenshot({path:'C:/Users/Administrator/Documents/GitHub/website/course/chapters/04/tasks/4-1/qa/sensor-review/before.png'}));
