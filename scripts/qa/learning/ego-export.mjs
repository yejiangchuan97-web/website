const task=await taskSpace(3),page=task.page('p1');
await page.evaluate(()=>document.getElementById('lesson-export').scrollIntoView({block:'center'}));
const pending=page.waitForEvent('download',{timeout:10000});await page.click('#lesson-export');const file=await pending;
await file.saveAs('C:/Users/Administrator/Documents/GitHub/website/artifacts/reports/chapter1-learning/student-record-sample.json');
console.log('saved',file.suggestedFilename());
