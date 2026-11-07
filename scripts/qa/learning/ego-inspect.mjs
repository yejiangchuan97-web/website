const task=await taskSpace(3),page=task.page('p1');
console.log(await page.evaluate(()=>({state:LessonLab.state(),reduced:Workshop.reduced,pref:matchMedia('(prefers-reduced-motion: reduce)').matches,errors:window.__learningErrors||[]})));
await page.goto('http://127.0.0.1:8873/course/chapters/01/tasks/1-2/index.html');
await page.click('[data-tab="crane"]');await page.click('[data-focus="hook"]');await page.focus('#joint-hoist');await page.press('#joint-hoist','End');
console.log(await page.evaluate(()=>({lesson:LessonLab.state(),model:GalleryLab.state(),reduced:Workshop.reduced,visible:Workshop.stage.visible})));
await page.waitForFunction(()=>LessonLab.state().ready,undefined,{timeout:15000});
console.log('READY',await page.evaluate(()=>LessonLab.state()));
