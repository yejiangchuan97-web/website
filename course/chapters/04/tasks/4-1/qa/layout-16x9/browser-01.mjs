const task = await taskSpace('task-4-1-layout-20261021');
const page = task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/course/chapters/02/tasks/2-1/index.html');
console.log({spaceId:task.spaceId});
console.log(await page.screenshot({path:'C:/Users/Administrator/Documents/GitHub/website/course/chapters/04/tasks/4-1/qa/layout-16x9/reference.png'}));
