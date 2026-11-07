async page => {
 const checks=[];await page.setViewportSize({width:1414,height:964});await page.route('**/*',r=>r.continue());
 for(const task of ['1-2','1-3']){
  await page.goto('http://127.0.0.1:8765/course/chapters/01/tasks/'+task+'/index.html');await page.waitForFunction(()=>window.LessonLab&&!GalleryLab.state().loading);
  const ids=await page.locator('#tabs button').evaluateAll(ns=>ns.map(n=>n.dataset.tab));
  for(const id of ids){
   await page.locator('[data-tab="'+id+'"]').click();await page.waitForFunction(id=>!GalleryLab.state().loading&&GalleryLab.state().selected===id,id);
   const frame=await page.evaluate(()=>{const T=THREE,m=GalleryLab.model(),c=Workshop.stage.camera;let x=0,y=0;m.root.updateMatrixWorld(true);c.updateMatrixWorld(true);m.root.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const xx of [b.min.x,b.max.x])for(const yy of [b.min.y,b.max.y])for(const zz of [b.min.z,b.max.z]){const p=new T.Vector3(xx,yy,zz).applyMatrix4(o.matrixWorld).project(c);x=Math.max(x,Math.abs(p.x));y=Math.max(y,Math.abs(p.y));}});return{x,y};});
   if(frame.x>.98||frame.y>.98)throw Error(id+' clipped '+JSON.stringify(frame));checks.push({id,...frame});
   if(['excavator','inspection-rover'].includes(id)){await page.waitForTimeout(300);await page.screenshot({path:'artifacts/screenshots/workstation-final-'+id+'.png'});}
  }
 }
 await page.locator('#open-records').click();await page.screenshot({path:'artifacts/screenshots/workstation-final-records.png'});await page.keyboard.press('Escape');
 return{passed:checks.length,checks};
}
