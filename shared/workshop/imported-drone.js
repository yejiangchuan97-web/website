/* Cesium Drone: Copyright 2017, 2018 Analytical Graphics, Inc.
 * Original mesh and textures by Ed Mackey, CC BY 4.0. See models/drone/LICENSE.html.
 * The GLB is unchanged. Runtime adds part anchors, reversible assembly separation,
 * and slow rotations around the original propeller axes for classroom observation. */
(() => {
 'use strict';
 const T=THREE,rootURL=new URL('../../',document.currentScript.src),pending=new Map();
 const vector=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 function data(id){
  if(pending.has(id))return pending.get(id);
  const promise=new Promise((resolve,reject)=>{
   if(window.DroneBuffers?.[id])return resolve(window.DroneBuffers[id]);
   const script=document.createElement('script');script.src=new URL('shared/models/drone/'+id+'.data.js',rootURL).href;
   script.onload=()=>{script.remove();window.DroneBuffers?.[id]?resolve(window.DroneBuffers[id]):reject(Error('无人机模型数据未注册'));};
   script.onerror=()=>{script.remove();reject(Error('无人机模型文件缺失：'+id));};document.head.append(script);
  }).catch(error=>{pending.delete(id);throw error;});pending.set(id,promise);return promise;
 }
 async function load(id){
  if(id!=='cesium')throw Error('未知无人机模型：'+id);
  const bytes=Uint8Array.from(atob(await data(id)),c=>c.charCodeAt(0));
  const gltf=await new Promise((resolve,reject)=>new CourseGLTFLoader().parse(bytes.buffer,'',resolve,reject));
  const root=new T.Group(),body=new T.Group();root.add(body);
  const geometries=new Set(),materials=new Set(),textures=new Set(),groups=new Map(),parts=[],rotors=[];
  const definitions=[
   ['body','整流机壳',['Body_low'],vector(0,.7,0)],
   ['frame','机架与四臂',['Base_low'],vector(0,-.15,0)],
   ['camera','前置镜头',['Lens_low'],vector(0,0,.65)],
   ['motors','四个电机',['MotorFrontLeft_low','MotorFrontRight_low','MotorBackLeft_low','MotorBackRight_low'],vector(0,.25,0)],
   ['propellers','四片螺旋桨',['PropClockwiseFront_low','PropCounterClockwiseFront_low','PropClockwiseBack_low','PropCounterClockwiseBack_low'],vector(0,.8,0)],
   ['antenna','天线',['Antenna_low'],vector(0,1.15,0)]
  ];
  gltf.scene.updateMatrixWorld(true);
  for(const [key,label,names,offset]of definitions){
   const group=new T.Group();group.name='assembly:'+key;group.userData.partId=key;body.add(group);
   const nodes=names.map(name=>{
    const node=gltf.scene.getObjectByName(name);if(!node)throw Error('缺少原无人机部件：'+name);
    group.attach(node);node.userData.partId=key;
    if(name.startsWith('Prop'))rotors.push({node,initial:node.quaternion.clone(),direction:name.startsWith('PropCounter')?1:-1});
    node.traverse(mesh=>{if(!mesh.isMesh)return;mesh.castShadow=true;mesh.receiveShadow=true;geometries.add(mesh.geometry);
     for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){materials.add(material);for(const value of Object.values(material))if(value?.isTexture)textures.add(value);}
    });return node;
   });
   body.updateMatrixWorld(true);
   // Observe the nearest motor / rotor instead of putting every label on the body.
   const bounds=new T.Box3().setFromObject(nodes.length>1?nodes[0]:group),anchor=new T.Object3D();
   anchor.position.copy(group.worldToLocal(bounds.getCenter(vector())));group.add(anchor);
   groups.set(key,{node:group,offset});
   parts.push({id:key,label,node:anchor,members:[group],description:key==='propellers'?'原模型的四片独立螺旋桨，绕各自电机轴缓慢旋转。演示速度便于观察，不对应实际转速。':label+'：保留 Cesium 原始网格和贴图，可近看或展开观察。'});
  }
  body.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(body),size=bounds.getSize(vector()),center=bounds.getCenter(vector()),scale=5/Math.max(size.x,size.y,size.z);
  root.scale.setScalar(scale);root.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  let spread=0,phase=0,disposed=false;
  const model={id:'crazyflie',root,parts,controls:[{id:'rotor',label:'螺旋桨转角',min:0,max:360,step:1,default:0}],duration:8,
   metadata:{nature:'Cesium Drone · CC BY 4.0 · 旋翼结构演示',sourceMeshes:12},
   setExplode(value){spread=value;},
   pose(time,{manual}={}){
    // glTF Y is the original motor axis; original yaw and source-node position remain intact.
    phase=manual?.rotor??((time*90)%360);
    for(const rotor of rotors)rotor.node.quaternion.copy(rotor.initial).multiply(new T.Quaternion().setFromAxisAngle(vector(0,1,0),T.MathUtils.degToRad(phase)*rotor.direction));
    for(const {node,offset}of groups.values())node.position.copy(offset).multiplyScalar(spread);
    root.updateMatrixWorld(true);
   },
   readings:()=>[{id:'rotor',value:phase,unit:'°'}],
   dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.source?.data?.close?.();t.dispose();});}
  };
  model.pose(0);return model;
 }
 window.CourseImportedDrone={load};
})();
