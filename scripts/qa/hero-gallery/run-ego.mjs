const task=await taskSpace('hero-gallery-20261027'),page=task.page('p1');
await page.cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await page.cdp('Network.enable');await page.cdp('Network.setCacheDisabled',{cacheDisabled:true});
await page.cdp('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
await page.cdp('Page.addScriptToEvaluateOnNewDocument',{source:'window.__heroErrors=[];addEventListener("error",e=>__heroErrors.push(e.message));addEventListener("unhandledrejection",e=>__heroErrors.push(String(e.reason)));'});
const {runHeroGallery}=await import('../hero-gallery.mjs');
const fs=await import('node:fs/promises');
for(const [name,base,full] of [['source','http://127.0.0.1:8873/',true],['package','http://127.0.0.1:8873/artifacts/site/',true],['file','file:///C:/Users/Administrator/Documents/GitHub/website/artifacts/site/',false]]){
const result=await runHeroGallery(page,base,{full});await fs.writeFile('C:/Users/Administrator/Documents/GitHub/website/artifacts/reports/hero-gallery/browser-'+name+'.json',JSON.stringify(result,null,2));console.log(name,result.passed);
}
console.log(await page.snapshot());
