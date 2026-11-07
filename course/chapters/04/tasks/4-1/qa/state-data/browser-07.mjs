const task=await taskSpace(7),page=task.page('p1');
console.log(await page.info());
console.log(await page.evaluate(()=>({state:window.__STATE_LAB__?.snapshot().state,records:window.__STATE_LAB__?.snapshot().records,dialog:[...document.querySelectorAll('dialog[open]')].map(x=>x.id)})));
