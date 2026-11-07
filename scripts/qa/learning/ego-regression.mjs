const task=await taskSpace(3),page=task.page('p1');
const {runLearning}=await import('./run-learning.mjs');const fs=await import('node:fs/promises');
await fs.mkdir('C:/Users/Administrator/Documents/GitHub/website/artifacts/reports/chapter1-learning',{recursive:true});
for(const[name,base,full]of [['source','http://127.0.0.1:8873/',true],['package','http://127.0.0.1:8873/artifacts/site/',true],['file','file:///C:/Users/Administrator/Documents/GitHub/website/artifacts/site/',false]]){
 const r=await runLearning(page,base,{full});await fs.writeFile('C:/Users/Administrator/Documents/GitHub/website/artifacts/reports/chapter1-learning/browser-'+name+'.json',JSON.stringify(r,null,2));console.log(name,r.passed);
}
