const {runRevision}=await import('../qa/revision-interactions.mjs');
const task=await taskSpace(2),page=task.page('p1');
console.log(await runRevision(page,'file:///C:/Users/Administrator/Documents/GitHub/website/',{screenshots:'C:/Users/Administrator/Documents/GitHub/website/artifacts/screenshots/revision',report:'C:/Users/Administrator/Documents/GitHub/website/artifacts/reports/revision-browser-source.json'}));
