/* Innerscene CC0 and VMC Motion Apache-2.0 meshes; see models/machinery/LICENSE.html.
 * Modified: source-node pivot binding, dozer rear attachments, CET200 track assembly
 * and display materials. Original GLB files remain unmodified.
 * Rigid geometry is batched by material and assembly, never regenerated.
 * All pivot coordinates below are in the original GLB's metre coordinate system. */
(() => {
 'use strict';
 const T=THREE,rootURL=new URL('../../',document.currentScript.src),pending=new Map();
 const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),rad=T.MathUtils.degToRad;
 function data(id){
  if(pending.has(id))return pending.get(id);
  const promise=new Promise((resolve,reject)=>{
   if(window.MachineryBuffers?.[id])return resolve(window.MachineryBuffers[id]);
   const script=document.createElement('script');script.src=new URL('shared/models/machinery/'+id+'.data.js',rootURL).href;
   script.onload=()=>{script.remove();window.MachineryBuffers?.[id]?resolve(window.MachineryBuffers[id]):reject(Error('模型数据未注册'));};
   script.onerror=()=>{script.remove();reject(Error('模型文件缺失：'+id));};document.head.append(script);
  }).catch(error=>{pending.delete(id);throw error;});pending.set(id,promise);return promise;
 }
 async function load(id){
  const bytes=Uint8Array.from(atob(await data(id)),c=>c.charCodeAt(0));
  const gltf=await new Promise((resolve,reject)=>new CourseGLTFLoader().parse(bytes.buffer,'',resolve,reject));
  if(id==='excavator'){
   const raw=Uint8Array.from(atob(await data('excavator-tracks')),c=>c.charCodeAt(0));
   const track=await new Promise((resolve,reject)=>new CourseGLTFLoader().parse(raw.buffer,'',resolve,reject));
   gltf.scene.updateMatrixWorld(true);
   // The author's standalone belt has its origin at the forward idler axle.
   for(const side of ['L','R']){
    const belt=track.scene.clone(true);belt.name='CrawlerBelt_'+side;
    belt.position.copy(gltf.scene.getObjectByName('Idler_'+side).getWorldPosition(V()));
    belt.traverse(o=>{o.userData.assemblyOverride='tracks';o.userData.sourceName=o.name;});gltf.scene.add(belt);
   }
  }
  return assemble(gltf,id);
 }
 function assemble(gltf,id){
  const source=gltf.scene,root=new T.Group(),body=new T.Group();root.add(body);source.updateMatrixWorld(true);
  const sourceMeshes=[],sourceGeometries=new Set(),materials=new Set(),textures=new Set();
  source.traverse(o=>{if(!o.isMesh)return;let hidden=false;const path=[];for(let n=o;n;n=n.parent){if(/^Hidden/.test(n.name))hidden=true;path.push(n.name);}if(hidden)return;
   const index=gltf.parser.associations.get(o)?.nodes;
   o.userData.sourceName=o.userData.sourceName||(index===undefined?o.name:gltf.parser.json.nodes[index].name);
   o.userData.sourcePath=path.join('/');
   sourceMeshes.push(o);sourceGeometries.add(o.geometry);
   for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}
  });
  const groups=new Map(),buckets=new Map(),parts=[],rig=[],controls=[],state={};let spread=0;
  const namedBounds=name=>{const mesh=sourceMeshes.find(o=>o.userData.sourceName===name);if(!mesh)throw Error('缺少原模型定位部件：'+name);return new T.Box3().setFromObject(mesh);};
  const namedCenter=name=>namedBounds(name).getCenter(V());
  function group(key){if(!groups.has(key)){const node=new T.Group();node.name=key;body.add(node);groups.set(key,node);}return groups.get(key);}
  function classify(n,path,override){
   if(id==='excavator'){
    if(override)return override;
    if(/TrackFrame|Wheels_[LR]/.test(path))return 'tracks';
    if(/Cab(?:\/|Frame|Interior)/.test(path))return 'cab';
    // Hydraulic cylinders and the bucket linkage move on their own pins.
    const seg=name=>new RegExp('(^|/)'+name+'(/|$)').test(path);
    if(seg('BoomCylinderTube'))return 'boomCylBarrel';if(seg('BoomPistonRod'))return 'boomCylRod';
    if(seg('ArmCylinderTube'))return 'armCylBarrel';if(seg('ArmPistionRod'))return 'armCylRod';
    if(seg('BucketCylinderTube'))return 'bucketCylBarrel';if(seg('BucketPistonRod'))return 'bucketCylRod';
    if(seg('ILink'))return 'iLink';if(seg('HLink'))return 'hLink';
    if(/^BucketCylinderTubePin\//.test(path))return 'stick';
    if(/Bucket|HLink|ILink/.test(path))return 'bucket';
    if(/Arm(?:\/|Foot|PistonRodPin)/.test(path))return 'stick';
    if(/Boom|ArmCylinder|ArmPistion/.test(path)&&!/UpperStructure/.test(path))return 'boom';return 'upper';
   }
   if(id==='dozer'){
    const ram=n.match(/blade lift ram (-?1) (.*)/i);
    if(ram){if(/base retained/.test(ram[2]))return 'body';if(/rod retained/.test(ram[2]))return 'bladeMounts';return 'ram'+ram[1]+(/piston/.test(ram[2])?'Rod':'Barrel');}
    if(/blade lift base|push trunnion/i.test(n))return 'body';
    if(/blade push arm/.test(n))return 'pushArms';
    if(/blade rear welded|blade lift upper/.test(n))return 'bladeMounts';
    if(/finite dished blade|lower cutting edge/i.test(n))return 'blade';
    if(/shoe|roller|idler|drive|track|sprocket/i.test(n))return 'tracks';
    if(/cab|ROPS|seat|steering|overhead protection/i.test(n))return 'cab';return 'body';
   }
   if(id==='loader'){
    const ram=n.match(/Loader lift hydraulic cylinder (-?1) (.*)/);
    if(ram){if(/base cross/.test(ram[2]))return 'body';if(/rod cross/.test(ram[2]))return 'arms';return 'ram'+ram[1]+(/piston/.test(ram[2])?'Rod':'Barrel');}
    if(/Central bucket tilt cylinder/.test(n))return 'tilt'+(/piston|rod cross/.test(n)?'Rod':'Barrel');
    if(/Front loader bucket|Bucket rear attachment lug|Central bucket tilt lug/.test(n))return 'bucket';
    if(/swept lift arm|arm transverse|bucket hinge/.test(n))return 'arms';
    if(/cab|driver|dashboard|steering (?:column|hub|rim)|roof/i.test(n))return 'cab';
    if(/axle .*wheel|rounded tyre|seated through axle/.test(n))return 'wheels';return 'body';
   }
   if(id==='crane'){
    if(/^Mast|continuous mast|angled base|base cross|base side|concrete base/i.test(n))return 'mast';
    if(/hook|hoist fall|travelling trolley|Trolley retained/.test(n))return 'hook';
    if(/Counterjib|counterweight/.test(n))return 'counter';
    if(/operator cabin/.test(n))return 'cab';return 'jib';
   }
   throw Error('未知外部模型：'+id);
  }
  // Bake every original node transform before batching. Keep material and UV data.
  for(const mesh of sourceMeshes){
   const part=classify(mesh.userData.sourceName,mesh.userData.sourcePath,mesh.userData.assemblyOverride),key=part+'|'+mesh.material.uuid;
   const target=group(part);(target.userData.sourceNames??=[]).push(mesh.userData.sourceName);
   if(!buckets.has(key))buckets.set(key,{part,material:mesh.material,geometries:[]});
   const geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
   if(id==='dozer'){
    const n=mesh.userData.sourceName;
    // The source welded ribs and upper clevises penetrate the blade's working face.
    // Move their original meshes behind the curved mouldboard, and shorten the
    // push beams about the fixed rear trunnion to meet those rear attachments.
    if(/blade rear welded rib|blade lift upper clevis|ram .* rod retained/.test(n))geo.translate(-.13,0,0);
    if(/blade push arm/.test(n)){
     const a=geo.attributes.position;for(let i=0;i<a.count;i++)a.setX(i,-1.4055+(a.getX(i)+1.4055)*(3.67/3.8));a.needsUpdate=true;geo.computeVertexNormals();
    }
    const ram=n.match(/blade lift ram (-?1) (closed cylinder|polished piston rod)/);
    if(ram){
     const side=Number(ram[1]),a=V(.2945,1.8547232,-side*.78),b=V(2.3145,1.1447232,-side*1.27),end=b.clone().add(V(-.13,0,0));
     const q=new T.Quaternion().setFromUnitVectors(b.clone().sub(a).normalize(),end.clone().sub(a).normalize()),isRod=ram[2].startsWith('polished'),from=isRod?b:a,to=isRod?end:a;
     geo.translate(-from.x,-from.y,-from.z).applyQuaternion(q).translate(to.x,to.y,to.z);
    }
   }
   buckets.get(key).geometries.push(geo);
  }
  const geometries=[];
  for(const b of buckets.values()){
   const geo=CourseGeometryUtils.mergeGeometries(b.geometries,false);
   if(!geo)throw Error('模型网格合并失败：'+id+'/'+b.part);
   b.geometries.forEach(g=>g.dispose());geometries.push(geo);
   const mesh=new T.Mesh(geo,b.material);mesh.castShadow=true;mesh.receiveShadow=true;group(b.part).add(mesh);
  }
  sourceGeometries.forEach(g=>g.dispose());
  if(id==='excavator'){
   // Display palette only; geometry comes from the author's CAD-derived model.
   for(const [key,g]of groups)g.traverse(o=>{if(!o.isMesh)return;const m=o.material;
    if(key==='tracks'){m.color.setHex(0x394650);m.metalness=.55;m.roughness=.52;}
    else if(m.name==='Material_3'){m.color.setHex(0xd7a32b);m.metalness=.15;m.roughness=.42;}
    else if(m.name==='Material_5'){m.color.setHex(0x486775);m.opacity=.36;m.depthWrite=false;m.roughness=.14;}
    else if(m.name==='Material_0'){m.color.setHex(0x303c46);m.roughness=.55;}
   });
  }
  function pivot(parent,position,keys){
   const node=new T.Group();node.name='pivot:'+keys.join(',');node.position.copy(position);parent.add(node);parent.updateMatrixWorld(true);
   for(const key of keys){const g=group(key);node.attach(g);}return node;
  }
  function part(key,label,keys=[key],anchorKeys=keys){
   const members=keys.map(group),bounds=new T.Box3();anchorKeys.map(group).forEach(g=>bounds.union(new T.Box3().setFromObject(g)));
   const anchor=new T.Object3D(),host=members[0];body.updateMatrixWorld(true);anchor.position.copy(host.worldToLocal(bounds.getCenter(V())));host.add(anchor);
   members.forEach(g=>g.userData.partId=key);parts.push({id:key,label,node:anchor,members,description:label+'：原始模型总成，可旋转、近看或展开观察。'});
  }
  function control(key,label,min,max){controls.push({id:key,label,min,max,step:1,default:0});state[key]=0;}
  // A cylinder keeps its original barrel/rod lengths: only angle and insertion change.
  // Both ends are explicit pins, so the actuator stays connected throughout the motion.
  // parent/origin: the cylinder may ride on a moving member; points are then given in that
  // member's rest frame and origin is the member's pivot (its local origin).
  function cylinder(prefix,a,b,endpoint,basepoint=()=>a.clone(),parent=body,origin=V()){
   const barrel=pivot(parent,a.clone().sub(origin),[prefix+'Barrel']),rod=pivot(parent,b.clone().sub(origin),[prefix+'Rod']),original=b.clone().sub(a).normalize();
   rig.push(()=>{const start=basepoint(),end=endpoint(),q=new T.Quaternion().setFromUnitVectors(original,end.clone().sub(start).normalize());barrel.position.copy(start).sub(origin);rod.position.copy(end).sub(origin);barrel.quaternion.copy(q);rod.quaternion.copy(q);});
  }
  function transformed(point,hinge){body.updateMatrixWorld(true);return body.worldToLocal(hinge.localToWorld(point.clone().sub(hinge.userData.pivot)));}
  function markPivot(node,p){node.userData.pivot=p.clone();return node;}
  let animate;
  if(id==='excavator'){
   const p=source.getObjectByName('UpperStructure').getWorldPosition(V()),yaw=markPivot(pivot(body,p,['upper','cab']),p);
   // Work equipment pins, read from the author's pin meshes (rest pose, source frame).
   const pin=name=>namedCenter(name),node=name=>{const o=source.getObjectByName(name);if(!o)throw Error('缺少原模型定位部件：'+name);return new T.Box3().setFromObject(o).getCenter(V());},mid=(a,b)=>a.clone().add(b).multiplyScalar(.5);
   const boomFoot=pin('BoomFootPin'),boomCylBase=mid(pin('BoomCylinderTubePin_L'),pin('BoomCylinderTubePin_R')),boomCylEnd=node('BoomPistonRodPin');
   const armFoot=pin('ArmFootPin'),armCylBase=pin('ArmCylinderTubePin'),armCylEnd=pin('ArmPistonRodPin');
   const bucketFoot=pin('BucketFootPin'),bucketCylBase=pin('BucketCylinderTubePin'),hPin=pin('BucketHLinkPin'),iPin=node('ILinkPin'),joint=node('ILinkPin001');
   const boomP=markPivot(pivot(body,boomFoot,['boom']),boomFoot),stickP=markPivot(pivot(body,armFoot,['stick']),armFoot),bucketP=markPivot(pivot(body,bucketFoot,['bucket']),bucketFoot);
   const iLink=pivot(body,iPin,['iLink']),hLink=pivot(body,joint,['hLink']);
   yaw.attach(boomP);boomP.attach(stickP);stickP.attach(bucketP);stickP.attach(iLink);stickP.attach(hLink);
   // Points are kept in each member's rest frame; turn(v,c,deg) rotates about the lateral pin axis.
   const turn=(v,c,deg)=>v.clone().sub(c).applyAxisAngle(V(0,0,1),rad(deg)).add(c);
   const flat=v=>new T.Vector2(v.x,v.y),rIJ=flat(joint).distanceTo(flat(iPin)),rHJ=flat(joint).distanceTo(flat(hPin));
   let linkage={j:joint.clone(),i:0,h:0};
   // Bucket four-bar: the joint lies on the I-link circle and the H-link circle around the moved bucket pin.
   const solveLinkage=()=>{
    const h=turn(hPin,bucketFoot,state.bucket),a=flat(iPin),b=flat(h),d=a.distanceTo(b);
    if(d>rIJ+rHJ||d<Math.abs(rIJ-rHJ))return linkage;
    const x=(rIJ*rIJ-rHJ*rHJ+d*d)/(2*d),y=Math.sqrt(Math.max(0,rIJ*rIJ-x*x)),u=b.clone().sub(a).normalize(),n=new T.Vector2(-u.y,u.x);
    const options=[1,-1].map(s=>a.clone().add(u.clone().multiplyScalar(x)).add(n.clone().multiplyScalar(s*y)));
    const prev=flat(linkage.j),best=options.sort((p,q)=>p.distanceTo(prev)-q.distanceTo(prev))[0],j=V(best.x,best.y,joint.z);
    const ang=(v,c)=>Math.atan2(v.y-c.y,v.x-c.x);
    return linkage={j,i:ang(j,iPin)-ang(joint,iPin),h:ang(h,j)-ang(hPin,joint)};
   };
   cylinder('boomCyl',boomCylBase,boomCylEnd,()=>turn(boomCylEnd,boomFoot,state.boom),()=>boomCylBase.clone(),yaw,p);
   cylinder('armCyl',armCylBase,armCylEnd,()=>turn(armCylEnd,armFoot,state.stick),()=>armCylBase.clone(),boomP,boomFoot);
   cylinder('bucketCyl',bucketCylBase,joint,()=>linkage.j.clone(),()=>bucketCylBase.clone(),stickP,armFoot);
   control('slew','回转平台',-65,65);control('boom','动臂升降',-10,22);control('stick','斗杆收放',-25,28);control('bucket','铲斗翻转',-40,55);
   animate=()=>{yaw.rotation.y=rad(state.slew);boomP.rotation.z=rad(state.boom);stickP.rotation.z=rad(state.stick);bucketP.rotation.z=rad(state.bucket);
    const l=solveLinkage();iLink.rotation.z=l.i;hLink.position.copy(l.j).sub(armFoot);hLink.rotation.z=l.h;};
   part('tracks','履带底盘');part('upper','回转平台与配重');part('cab','驾驶室与操纵台');part('boom','动臂与油缸',['boom','boomCylBarrel','boomCylRod'],['boom']);part('stick','斗杆与油缸',['stick','armCylBarrel','armCylRod'],['stick']);part('bucket','铲斗与连杆',['bucket','iLink','hLink','bucketCylBarrel','bucketCylRod'],['bucket']);
  }else if(id==='dozer'){
   const p=V(-1.4055,.7647232,0),blade=markPivot(pivot(body,p,['blade','pushArms','bladeMounts']),p);
   for(const side of [1,-1]){const a=V(.2945,1.8547232,-side*.78),b=V(2.1845,1.1447232,-side*1.27);cylinder('ram'+side,a,b,()=>transformed(b,blade));}
   control('blade','铲刀抬升',0,12);animate=()=>{blade.rotation.z=rad(state.blade);};
   part('tracks','履带与行走架');part('body','动力车体');part('cab','驾驶室与防护架');part('blade','铲刀与外侧推臂',['blade','pushArms','bladeMounts']);part('hydraulics','提升液压缸',['ram1Barrel','ram1Rod','ram-1Barrel','ram-1Rod']);
  }else if(id==='loader'){
   const p=V(-.1045,2.2,0),arms=markPivot(pivot(body,p,['arms','bucket']),p),bp=V(2.6955,.85,0);
   const bucket=markPivot(pivot(body,bp,['bucket']),bp);arms.attach(bucket);
   // Keep bucket endpoint conversion in the source coordinate system, before arm motion.
   const liftPoint=v=>v.clone().sub(p).applyAxisAngle(V(0,0,1),rad(state.lift)).add(p);
   const bucketPoint=v=>liftPoint(v.clone().sub(bp).applyAxisAngle(V(0,0,1),rad(state.bucket)).add(bp));
   for(const side of [1,-1]){const a=V(.0455,1.08,-side*.78),b=V(1.1255,2.16,-side*.95);cylinder('ram'+side,a,b,()=>liftPoint(b));}
   cylinder('tilt',V(1.3455,2.2,0),V(2.7055,1.24,0),()=>bucketPoint(V(2.7055,1.24,0)),()=>liftPoint(V(1.3455,2.2,0)));
   control('lift','工作臂举升',0,24);control('bucket','铲斗收拢',0,24);animate=()=>{arms.rotation.z=rad(state.lift);bucket.rotation.z=rad(state.bucket);};
   part('wheels','轮胎与轮毂');part('body','铰接车架与动力舱');part('cab','驾驶室');part('arms','举升臂');part('bucket','铲斗与斗齿');part('hydraulics','工作液压缸',['ram1Barrel','ram1Rod','ram-1Barrel','ram-1Rod','tiltBarrel','tiltRod']);
  }else{
   const yaw=pivot(body,namedCenter('Tower slew bearing housing'),['jib','counter','cab','hook']);control('slew','起重臂回转',-55,55);animate=()=>{yaw.rotation.y=rad(state.slew);};
   part('mast','底座与标准节塔身');part('jib','起重臂与回转平台');part('counter','平衡臂与配重');part('cab','操作室');part('hook','小车、钢丝绳与吊钩');
  }
  body.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(body),size=bounds.getSize(V()),scale=5/Math.max(size.x,size.y,size.z),mid=bounds.getCenter(V());
  root.scale.setScalar(scale);root.position.set(-mid.x*scale,-bounds.min.y*scale,-mid.z*scale);
  // Exploded view offsets are local and reversible, independent of the motion rig.
  const originals=new Map([...groups].map(([key,g])=>[key,g.position.clone()]));
  const offsets=new Map();for(const [key,g]of groups){const c=new T.Box3().setFromObject(g).getCenter(V()).sub(mid);if(c.length()<.1)c.set(0,1,0);c.normalize().multiplyScalar(.55/scale);offsets.set(key,c);}
  let disposed=false;
  const model={id,root,parts,controls,duration:8,metadata:{nature:id==='excavator'?'VMC Motion CET200 · Apache-2.0 · 课堂机构绑定':'Innerscene CC0 网格 · 课堂机构绑定',sourceMeshes:sourceMeshes.length},
   setExplode(value){spread=value;},
   pose(time,{manual}={}){
    for(const [key,g]of groups)g.position.copy(originals.get(key));
    for(const c of controls)state[c.id]=manual?.[c.id]??(c.min<0?Math.sin(time*Math.PI/4)*c.max*.65:(1-Math.cos(time*Math.PI/4))*.5*c.max*.8);
    animate();rig.forEach(update=>update());
    if(spread)for(const [key,g]of groups)g.position.addScaledVector(offsets.get(key),spread);
    root.updateMatrixWorld(true);
   },
   readings:()=>controls.map(c=>({id:c.id,value:state[c.id],unit:'°'})),
   dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});}
  };
  model.pose(0);return model;
 }
 window.CourseImportedMachinery={load};
})();
