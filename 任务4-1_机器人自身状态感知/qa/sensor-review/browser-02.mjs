const task=await taskSpace(4),page=task.page('p1');
await page.goto('file:///C:/Users/Administrator/Documents/GitHub/website/任务4-1_机器人自身状态感知/index.html');
console.log(await page.evaluate(()=>({title:document.title,loaded:!!window.__SENSE__,state:window.__SENSE__?.snapshot(),overflow:document.documentElement.scrollWidth>innerWidth})));
await page.click('#focusSensor');
console.log(await page.snapshot());
