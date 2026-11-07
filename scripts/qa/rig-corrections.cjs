async page=>{
 const kind=page.url().startsWith('file:')?'file':'source',checks=[],errors=[];
 const ok=(v,n)=>{if(!v)throw Error(n);checks.push(n);};page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.continue());await page.reload();await page.setViewportSize({width:1414,height:964});
 await page.waitForFunction(()=>window.GalleryLab&&!GalleryLab.state().loading);
 await page.evaluate(()=>GalleryLab.select('crane'));
 const crane=await page.evaluate(()=>{
  const raw=Uint8Array.from(atob(MachineryBuffers.crane),c=>c.charCodeAt(0)),n=new DataView(raw.buffer).getUint32(12,true),j=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+n)));
  const node=j.nodes.find(n=>n.name==='Tower slew bearing housing'),a=j.accessors[j.meshes[node.mesh].primitives[0].attributes.POSITION];
  if(node.translation||node.rotation||node.matrix)throw Error('Reference source transform changed');
  // Reference is measured from the original asset, not the runtime pivot constant.
  const center=new THREE.Vector3(...a.min).add(new THREE.Vector3(...a.max)).multiplyScalar(.5),m=GalleryLab.model(),body=m.root.children[0],jib=m.root.getObjectByName('jib'),mast=m.root.getObjectByName('mast');
  const still=mast.matrixWorld.clone(),rows=[];
  for(const slew of [-55,-36,-20,0,20,36,55]){m.pose(0,{manual:{slew}});rows.push({slew,gap:body.localToWorld(center.clone()).distanceTo(jib.localToWorld(center.clone())),mastFixed:still.equals(mast.matrixWorld)});}
  m.pose(0,{manual:{slew:-36}});Workshop.stage.render();return{center:center.toArray(),rows};
 });
 for(const row of crane.rows)ok(row.gap<1e-6&&row.mastFixed,'crane bearing stays on mast at '+row.slew+' degrees');
 await page.screenshot({path:'artifacts/screenshots/rig-'+kind+'-crane-minus36.png'});
 await page.evaluate(()=>GalleryLab.select('dozer'));
 const dozer=await page.evaluate(()=>{
  const m=GalleryLab.model(),T=THREE,root=m.root,body=root.children[0],blade=root.getObjectByName('blade'),mounts=root.getObjectByName('bladeMounts'),arms=root.getObjectByName('pushArms');
  if(m.id==='cdz200l'){const rows=[];for(const angle of [0,4,8,12,16]){m.pose(0,{manual:{blade:angle}});const p=new T.Vector3(...m.metadata.pivot),frame=root.getObjectByName('frame');rows.push({angle,maxGap:frame.localToWorld(p.clone()).distanceTo(body.localToWorld(p.clone()))});}Workshop.stage.render();return{source:'cdz200l',rows};}
  m.pose(0);const rays=new T.Raycaster(),direction=new T.Vector3(-1,0,0).transformDirection(body.matrixWorld);let samples=0,protrusions=0,maxProtrusion=0;
  for(const g of [mounts,arms])g.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i+=Math.max(1,Math.floor(a.count/140))){
   const p=body.worldToLocal(new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));if(Math.abs(p.z)>1.68||p.y<.24||p.y>1.46||p.x<1.8)continue;
   rays.set(body.localToWorld(new T.Vector3(10,p.y,p.z)),direction);const hit=rays.intersectObject(blade,true)[0];if(!hit)continue;const front=body.worldToLocal(hit.point.clone()).x;samples++;maxProtrusion=Math.max(maxProtrusion,p.x-front);if(p.x>front+.002)protrusions++;
  }});
  const raw=Uint8Array.from(atob(MachineryBuffers.dozer),c=>c.charCodeAt(0)),n=new DataView(raw.buffer).getUint32(12,true),j=JSON.parse(new TextDecoder().decode(raw.subarray(20,20+n))),rows=[];
  for(const angle of [0,3,6,9,12]){
   m.pose(0,{manual:{blade:angle}});let maxGap=0;
   for(const side of [1,-1]){
    const node=j.nodes.find(n=>n.name==='Dozer blade push trunnion '+side),a=j.accessors[j.meshes[node.mesh].primitives[0].attributes.POSITION],p=new T.Vector3((a.min[0]+a.max[0])/2,(a.min[1]+a.max[1])/2,-side*1.7);
    maxGap=Math.max(maxGap,arms.localToWorld(p.clone()).distanceTo(body.localToWorld(p.clone())));
   }
   rows.push({angle,maxGap});
  }
  Workshop.stage.render();return{samples,protrusions,maxProtrusion,rows};
 });
 if(dozer.source!=='cdz200l')ok(dozer.samples>20&&dozer.protrusions===0,'dozer push arms and brackets stay behind blade working face');
 for(const row of dozer.rows)ok(row.maxGap<1e-6,'dozer rear push-arm axle stays connected at '+row.angle+' degrees');
 await page.screenshot({path:'artifacts/screenshots/rig-'+kind+'-dozer-raised.png'});
 await page.evaluate(()=>{GalleryLab.model().pose(0);Workshop.stage.az=1.55;Workshop.stage.el=.18;Workshop.stage.orbit();});
 await page.screenshot({path:'artifacts/screenshots/rig-'+kind+'-dozer-front.png'});
 await page.evaluate(()=>GalleryLab.select('excavator'));
 ok(await page.evaluate(()=>GalleryLab.model().metadata.nature.includes('CET200')),'excavator replaced with CET200');
 ok(await page.evaluate(()=>{const n=GalleryLab.model().root.getObjectByName('tracks').userData.sourceNames;return n.some(x=>x.startsWith('Shoe'))&&n.length>200;}),'excavator includes author track-belt meshes');
 await page.screenshot({path:'artifacts/screenshots/rig-'+kind+'-excavator.png'});
 await page.evaluate(()=>{Workshop.stage.az=-.75;Workshop.stage.el=.35;Workshop.stage.orbit();});
 await page.screenshot({path:'artifacts/screenshots/rig-'+kind+'-excavator-reverse.png'});
 ok(errors.length===0,'no runtime exceptions');return{kind,passed:checks.length,checks,crane,dozer,errors};
}
