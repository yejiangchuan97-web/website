async page=>{
 const checks=[],ok=(v,n)=>{if(!v)throw Error(n);checks.push(n);};
 await page.route('**/*',r=>r.continue());await page.reload();await page.setViewportSize({width:1414,height:964});await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 await page.evaluate(()=>GalleryLab.select('dozer'));
 const dozer=await page.evaluate(async()=>{
  const T=THREE,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),bytes=Uint8Array.from(atob(DozerBuffers.cdz200l),c=>c.charCodeAt(0));
  const original=await new Promise((resolve,reject)=>new CourseGLTFLoader().parse(bytes.buffer,'',resolve,reject));original.scene.updateMatrixWorld(true);
  const center=name=>new T.Box3().setFromObject(original.scene.getObjectByName(name)).getCenter(V());
  const axle=center('CFramePin_L').add(center('CFramePin_R')).multiplyScalar(.5),pins=Object.fromEntries(['L','R'].map(side=>[side,{base:center('LiftCylinderTubePin_'+side),end:center('LiftCylinderRodPin_'+side)}]));
  const m=GalleryLab.model(),root=m.root,body=root.children[0],g=name=>root.getObjectByName(name),fixed=g('tracks').matrixWorld.clone(),rows=[];
  for(const angle of [0,4,8,12,16]){
   m.pose(0,{manual:{blade:angle}});
   const axleGap=g('frame').localToWorld(axle.clone()).distanceTo(body.localToWorld(axle.clone()));let pinGap=0;
   for(const [side,p]of Object.entries(pins)){
    pinGap=Math.max(pinGap,g('lift-'+side+'-barrel').getWorldPosition(V()).distanceTo(body.localToWorld(p.base.clone())),g('lift-'+side+'-rod').getWorldPosition(V()).distanceTo(g('frame').localToWorld(p.end.clone())));
   }
   rows.push({angle,axleGap,pinGap,tracksFixed:fixed.equals(g('tracks').matrixWorld),bladeBottom:new T.Box3().setFromObject(g('blade')).min.y});
  }
  Workshop.stage.render();return rows;
 });
 for(const r of dozer)ok(r.axleGap<1e-6&&r.pinGap<1e-6&&r.tracksFixed,'CDZ200L original pins stay connected at '+r.angle+' degrees');
 ok(dozer.every((r,i)=>i===0||r.bladeBottom>dozer[i-1].bladeBottom),'blade rises through full slider range');
 await page.screenshot({path:'artifacts/screenshots/open-model-dozer-raised.png'});
 const base=new URL('../../../../../',page.url());await page.goto(new URL('course/chapters/01/tasks/1-3/index.html',base).href);await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 const drone=await page.evaluate(()=>{
  const m=GalleryLab.model(),root=m.root,T=THREE,rotors=[];root.traverse(o=>{if(o.name.startsWith('Prop'))rotors.push(o);});
  const box=o=>new T.Box3().setFromObject(o),body=root.getObjectByName('Body_low').matrixWorld.clone(),initial=rotors.map(o=>({position:o.getWorldPosition(new T.Vector3()),height:box(o).getSize(new T.Vector3()).y})),rows=[];
  for(const angle of [0,45,90,180,270]){m.pose(0,{manual:{rotor:angle}});rows.push({angle,count:rotors.length,bodyFixed:body.equals(root.getObjectByName('Body_low').matrixWorld),maxHubMotion:Math.max(...rotors.map((o,i)=>o.getWorldPosition(new T.Vector3()).distanceTo(initial[i].position))),maxHeightChange:Math.max(...rotors.map((o,i)=>Math.abs(box(o).getSize(new T.Vector3()).y-initial[i].height)))});}
  m.pose(0);Workshop.stage.render();return rows;
 });
 for(const r of drone)ok(r.count===4&&r.bodyFixed&&r.maxHubMotion<1e-6&&r.maxHeightChange<1e-6,'four drone rotors stay centred on motor axes at '+r.angle+' degrees');
 return{passed:checks.length,checks,dozer,drone};
}
