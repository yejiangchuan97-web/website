const task=await taskSpace(3),page=task.page('p1');
console.log(await page.evaluate(()=>({url:location.href,lesson:LessonLab.state(),selected:GalleryLab.state().selected,active:document.activeElement?.id,scroll:[scrollX,scrollY],viewport:[innerWidth,innerHeight],elements:['lesson-reset','lesson-save','joint-hoist','machine-reason','trial-start'].map(id=>{const e=document.getElementById(id),r=e?.getBoundingClientRect();return{id,box:r&&{x:r.x,y:r.y,w:r.width,h:r.height},hidden:e?.hidden};})})));
console.log(await page.snapshot());
