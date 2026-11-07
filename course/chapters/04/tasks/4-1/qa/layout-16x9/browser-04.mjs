const task=await taskSpace(8),page=task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/course/chapters/04/tasks/4-1/index.html');
console.log(await page.snapshot());
