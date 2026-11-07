const task=await taskSpace('chapter1-learning-20261027');console.log('SPACE',task.spaceId);
const page=task.page('p1');
await page.cdp('Network.enable');await page.cdp('Network.setCacheDisabled',{cacheDisabled:true});
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:'window.__learningErrors=[];addEventListener("error",e=>__learningErrors.push(e.message));addEventListener("unhandledrejection",e=>__learningErrors.push(String(e.reason)));'});
await page.goto('http://127.0.0.1:8873/course/chapters/01/tasks/1-2/index.html');
console.log(await page.evaluate(()=>({ready:!!window.LessonLab,state:window.LessonLab?.state(),errors:window.__learningErrors})));
console.log(await page.snapshot());
