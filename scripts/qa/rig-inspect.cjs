async page=>{
 await page.setViewportSize({width:1414,height:964});await page.evaluate(()=>GalleryLab.select('dozer'));
 const state=await page.evaluate(()=>{const m=GalleryLab.model();Workshop.stage.az=1.55;Workshop.stage.el=.18;Workshop.stage.orbit();return m.root.getObjectByName('blade').userData.sourceNames;});
 await page.screenshot({path:'artifacts/screenshots/dozer-before-side.png'});
 await page.evaluate(()=>{Workshop.stage.az=-.8;Workshop.stage.el=.48;Workshop.stage.orbit();});
 await page.screenshot({path:'artifacts/screenshots/dozer-before-rear.png'});return state;
}
