async page => {
 const base=new URL('../../../../../',page.url()).href,kind=base.startsWith('file:')?'file':'source',checks=[],errors=[];
 const ok=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.continue());
 const go=async(task,id)=>{await page.goto(new URL('course/chapters/01/tasks/'+task+'/index.html',base).href);await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);await page.locator('[data-tab="'+id+'"]').click();await page.waitForFunction(id=>!GalleryLab.state().loading&&GalleryLab.state().selected===id,id);ok(await page.evaluate(()=>!GalleryLab.state().error),id+' loaded');};
 const snapshot=()=>page.evaluate(()=>{const root=GalleryLab.model().root;root.updateMatrixWorld(true);const values=[];root.traverse(o=>{if(o.isMesh)values.push(...o.matrixWorld.elements);});return values;});
 for(const [task,id] of [['1-2','dozer'],['1-3','crazyflie']]){
  await page.setViewportSize({width:1414,height:964});await go(task,id);
  ok(await page.evaluate(()=>GalleryLab.state().webgl&&GalleryLab.state().renderer.triangles>5000),id+' detailed manipulable meshes');
  ok(await page.locator('.joint-control input').count()>0,id+' mechanisms exposed');
  ok(await page.locator('.source-note a').getAttribute('href')!==null,id+' local source and license');
  const rest=await snapshot();
  for(const slider of await page.locator('.joint-control input').all()){await slider.evaluate(n=>{n.value=String(Number(n.min)+(Number(n.max)-Number(n.min))*.618);n.dispatchEvent(new Event('input',{bubbles:true}));});}
  await page.waitForTimeout(650);const moved=await snapshot();
  ok(moved.every(Number.isFinite)&&moved.some((v,i)=>Math.abs(v-rest[i])>1e-4),id+' manual controls move mesh transforms');
  await page.locator('#reset-motion').click();ok((await snapshot()).every((v,i)=>Math.abs(v-rest[i])<1e-7),id+' exact reset after manual control');
  await page.locator('#timeline').evaluate(n=>{n.value='1.37';n.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(100);
  ok((await snapshot()).some((v,i)=>Math.abs(v-rest[i])>1e-4),id+' timeline changes actual part pose');
  await page.locator('#scene').focus();await page.keyboard.press('Escape');ok((await snapshot()).every((v,i)=>Math.abs(v-rest[i])<1e-7),id+' keyboard reset');
  await page.locator('[data-inspector="anatomy"]').click();await page.locator('[data-focus]').first().click();await page.locator('#isolate-view').click();
  ok(await page.evaluate(()=>GalleryLab.state().part&&GalleryLab.state().view==='isolate'),id+' part selection and isolation');
  await page.locator('#toggle-explode').click();await page.waitForTimeout(950);ok(await page.locator('#play').isDisabled(),id+' exploded view pauses playback');
  await page.locator('#reset-motion').click();ok((await snapshot()).every((v,i)=>Math.abs(v-rest[i])<1e-7),id+' restores assembly after explosion');
  await page.locator('[data-inspector="motion"]').click();await page.locator('#side').evaluate(n=>n.scrollTop=0);
  await page.screenshot({path:'artifacts/screenshots/open-models-'+kind+'-'+id+'.png'});
  await page.locator('#theme').click();await page.screenshot({path:'artifacts/screenshots/open-models-'+kind+'-'+id+'-dark.png'});await page.locator('#theme').click();
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),id+' mobile no document overflow');
  await page.screenshot({path:'artifacts/screenshots/open-models-'+kind+'-'+id+'-mobile.png'});
  ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),id+' offline resources only');
 }
 await page.emulateMedia({reducedMotion:'reduce'});await go('1-3','crazyflie');ok(await page.evaluate(()=>!GalleryLab.state().playing&&!GalleryLab.state().tour),'reduced motion starts paused');
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:get.call(this,t,...a);};});
 for(const [task,id] of [['1-2','dozer'],['1-3','crazyflie']]){await go(task,id);await page.locator('#step').click();ok(await page.evaluate(()=>!GalleryLab.state().webgl&&GalleryLab.state().time>0&&!GalleryLab.state().error),id+' no WebGL fallback retains action');}
 ok(errors.length===0,'no JavaScript exceptions');return{base,kind,passed:checks.length,checks,errors};
}
