const task=await taskSpace(7),page=task.page('p1');
console.log(await page.evaluate(()=>({state:window.__STATE_LAB__.snapshot().state,scrollY,innerHeight,active:document.activeElement?.outerHTML.slice(0,400),gravity:document.querySelector('.gravity-control label').getBoundingClientRect().toJSON()})));
console.log(await page.snapshot());
