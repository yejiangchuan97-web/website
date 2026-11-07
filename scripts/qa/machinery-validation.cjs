async page => {
 const base=new URL('../../../../../',page.url()).href,kind=base.startsWith('file:')?'file':'source',checks=[],errors=[];
 const ok=(value,name)=>{if(!value)throw Error(name);checks.push(name);};
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.continue());await page.reload();
 await page.setViewportSize({width:1414,height:964});await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 const select=async id=>{await page.locator('[data-tab="'+id+'"]').click();await page.waitForFunction(id=>!GalleryLab.state().loading&&GalleryLab.state().selected===id,id);};
 for(const id of ['excavator','dozer','loader','crane']){
  await select(id);ok(await page.evaluate(()=>!GalleryLab.state().error),id+' loaded');
  ok(await page.evaluate(id=>{let textures=0;GalleryLab.model().root.traverse(o=>{if(o.isMesh&&o.material.map)textures++;});return ((id==='excavator'||id==='dozer')?GalleryLab.model().metadata.nature.includes('Apache-2.0'):textures>0)&&GalleryLab.model().metadata.sourceMeshes>250&&GalleryLab.state().renderer.calls<90;},id),id+' licensed source meshes, batched draws');
  const before=await page.evaluate(()=>{const r=GalleryLab.model().root;r.updateMatrixWorld(true);const a=[];r.traverse(o=>{if(o.isMesh)a.push(...o.matrixWorld.elements);});return a;});
  for(const slider of await page.locator('.joint-control input').all()){await slider.focus();await page.keyboard.press('End');}
  await page.waitForTimeout(600);
  ok(await page.evaluate(before=>{const r=GalleryLab.model().root;r.updateMatrixWorld(true);const a=[];r.traverse(o=>{if(o.isMesh)a.push(...o.matrixWorld.elements);});return a.every(Number.isFinite)&&a.some((v,i)=>Math.abs(v-before[i])>1e-3);},before),id+' controls move actual meshes');
  if(id==='dozer'||id==='loader'){
   if(id==='loader')ok(await page.evaluate(()=>GalleryLab.model().root.getObjectByName('bucket').userData.sourceNames.filter(n=>/^Bucket rear attachment lug/.test(n)).length===2),'loader bucket mounting lugs follow bucket');
   ok(await page.evaluate(id=>{
    const T=THREE,m=GalleryLab.model(),r=m.root,g=n=>r.getObjectByName(n),v=(x,y,z)=>new T.Vector3(x,y,z);
    if(id==='dozer'&&m.id==='cdz200l'){for(const [side,p]of Object.entries(m.metadata.pins)){if(g('frame').localToWorld(v(...p.end)).distanceTo(g('lift-'+side+'-rod').getWorldPosition(v()))>1e-5)return false;}return true;}
    const p=id==='dozer'?v(-1.4055,.7647232,0):v(-.1045,2.2,0),hinge=g(id==='dozer'?'pivot:blade,pushArms,bladeMounts':'pivot:arms,bucket');
    for(const side of [1,-1]){
     const b=id==='dozer'?v(2.1845,1.1447232,-side*1.27):v(1.1255,2.16,-side*.95);
     const expected=hinge.localToWorld(b.sub(p)),actual=g('pivot:ram'+side+'Rod').getWorldPosition(v());
     if(expected.distanceTo(actual)>1e-5)return false;
    }
    return true;
   },id),id+' hydraulic rod ends stay on moving pins');
  }
  await page.screenshot({path:'artifacts/screenshots/machinery-'+kind+'-'+id+'-motion.png'});
  await page.locator('#reset-motion').click();
  ok(await page.evaluate(before=>{const a=[];GalleryLab.model().root.traverse(o=>{if(o.isMesh)a.push(...o.matrixWorld.elements);});return a.every((v,i)=>Math.abs(v-before[i])<1e-8);},before),id+' exact assembled reset');
  await page.locator('[data-focus]').last().click();await page.locator('#isolate-view').click();
  ok(await page.evaluate(()=>GalleryLab.state().part&&GalleryLab.state().view==='isolate'),id+' assembly highlight');
  await page.locator('[data-inspector="anatomy"]').click();await page.locator('#toggle-explode').click();await page.waitForTimeout(900);
  ok(await page.locator('#play').isDisabled(),id+' explode pauses playback');
  await page.locator('#reset-motion').click();
  ok(await page.evaluate(before=>{const a=[];GalleryLab.model().root.traverse(o=>{if(o.isMesh)a.push(...o.matrixWorld.elements);});return a.every((v,i)=>Math.abs(v-before[i])<1e-8);},before),id+' explode restores original assembly');
  await page.locator('[data-inspector="motion"]').click();
  await page.locator('.source-note summary').click();ok(await page.locator('.source-note a').getAttribute('href')!==null,id+' local license available');
 }
 // Async race and disposal: the latest selection must win while old GLBs decode.
 await page.evaluate(()=>{GalleryLab.select('dozer');GalleryLab.select('loader');GalleryLab.select('excavator');});
 await page.waitForFunction(()=>!GalleryLab.state().loading&&GalleryLab.model()?.id==='excavator');
 await page.waitForTimeout(500);ok(await page.evaluate(()=>GalleryLab.model().id==='excavator'),'async latest selection wins');
 await page.locator('#theme').click();await page.screenshot({path:'artifacts/screenshots/machinery-'+kind+'-dark.png'});await page.locator('#theme').click();
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight),'no mobile page overflow');
 await page.screenshot({path:'artifacts/screenshots/machinery-'+kind+'-mobile.png'});
 await page.setViewportSize({width:1414,height:964});await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 ok(await page.evaluate(()=>!GalleryLab.state().playing&&!GalleryLab.state().tour),'reduced motion starts paused');
 await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/i.test(t)?null:get.call(this,t,...a);};});
 await page.reload();await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 for(const id of ['excavator','dozer','loader','crane']){
  await select(id);await page.locator('#step').click();ok(await page.evaluate(()=>!GalleryLab.state().webgl&&GalleryLab.state().time>0&&!GalleryLab.state().error),'fallback retains controls '+id);
 }
 ok(await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>/^https?:/.test(r.name)&&new URL(r.name).origin!==location.origin)),'no external runtime requests');
 ok(errors.length===0,'no JavaScript errors');
 return {base,kind,passed:checks.length,checks,errors};
}
