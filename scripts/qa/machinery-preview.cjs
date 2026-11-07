async page => {
 await page.route('**/*',r=>r.continue());await page.reload();
 await page.setViewportSize({width:1414,height:964});
 await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 const results=[];
 for(const id of ['excavator','dozer','loader','crane']){
  await page.evaluate(id=>GalleryLab.select(id),id);
  await page.waitForFunction(()=>!GalleryLab.state().loading);
  results.push(await page.evaluate(()=>({...GalleryLab.state(),meta:GalleryLab.model()?.metadata})));
  await page.screenshot({path:'artifacts/screenshots/imported-'+id+'.png'});
 }
 return results;
}
