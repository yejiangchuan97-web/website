/* Original teaching meshes. Dimensions and motions explain parts, not rated capacity. */
(function(global){
 'use strict';
 const T=global.THREE;
 const colors={yellow:0xe5ac36,blue:0x287eb9,navy:0x244864,white:0xe9f2f7,steel:0x8fa8b9,dark:0x344959,rubber:0x29333b,glass:0x72adc7,red:0xc65d50,green:0x2b9e8d,concrete:0xaebcc5,orange:0xd57f36};
 function material(name){return new T.MeshStandardMaterial({color:colors[name]||name,roughness:name==='steel'?.34:.64,metalness:name==='steel'?.55:.05,transparent:name==='glass',opacity:name==='glass'?.6:1});}
 function mesh(g,geometry,name,x=0,y=0,z=0){const o=new T.Mesh(geometry,material(name));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 const box=(g,w,h,d,m,x=0,y=0,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),m,x,y,z);
 const cyl=(g,r,h,m,x=0,y=0,z=0,r2=r)=>mesh(g,new T.CylinderGeometry(r2,r,h,24),m,x,y,z);
 const sphere=(g,r,m,x=0,y=0,z=0)=>mesh(g,new T.SphereGeometry(r,18,12),m,x,y,z);
 function beam(g,a,b,r,m='steel'){const A=new T.Vector3(...a),B=new T.Vector3(...b),o=cyl(g,r,A.distanceTo(B),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());return o;}
 function dynamicBeam(o,a,b){const A=new T.Vector3(...a),B=new T.Vector3(...b);o.position.copy(A).add(B).multiplyScalar(.5);o.scale.y=A.distanceTo(B);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),B.sub(A).normalize());}
 function torus(g,r,t,m,x=0,y=0,z=0){return mesh(g,new T.TorusGeometry(r,t,12,36),m,x,y,z);}
 function wheel(g,x,y,z,r=.36){const o=cyl(g,r,.22,'rubber',x,y,z);o.rotation.x=Math.PI/2;const hub=cyl(g,r*.54,.24,'steel',x,y,z);hub.rotation.x=Math.PI/2;for(let k=0;k<6;k++){const a=k*Math.PI/3;sphere(g,.035,'navy',x+r*.33*Math.cos(a),y+r*.33*Math.sin(a),z+(z>0?.13:-.13));}return o;}
 function pipe(g,points,r=.045,color='rubber'){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),36,r,8,false),color);}
 function make(id){
  const detailed=global.CourseMachineModels?.make(id);if(detailed)return detailed;
  const root=new T.Group(),parts=[],movers=[];root.name=id;
  const part=(id,label,node,description)=>{node.userData.partId=id;parts.push({id,label,node,description});return node;};
  const result={id,root,parts,metadata:{nature:'原创教学模型；运动为几何示意'},pose(t,context={}){movers.forEach(fn=>fn(t,context));root.updateMatrixWorld(true);},dispose(){const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
  if(id==='pump-section'){
   box(root,5,.25,2.5,'navy',0,.25);const hopper=cyl(root,.68,1.1,'yellow',-1.8,1.1,0,.95);const pistons=[];for(const z of [-.6,.6]){const barrel=cyl(root,.3,2.6,'steel',.1,.9,z);barrel.rotation.z=Math.PI/2;barrel.material.transparent=true;barrel.material.opacity=.3;const liquid=cyl(root,.21,1.1,'blue',.4,.9,z);liquid.rotation.z=Math.PI/2;const p=box(root,.13,.45,.45,'red',-.5,.9,z);beam(root,[-2,.9,z],[-.5,.9,z],.06);pistons.push({p,liquid});}const valve=new T.Group();valve.position.set(1.6,.9,0);root.add(valve);pipe(valve,[[0,0,-.6],[.25,0,-.4],[.35,0,.1],[.8,0,.1]],.16,'red');pipe(root,[[2.2,.9,.1],[2.7,.9,.1],[2.9,.5,.1]],.13,'dark');part('hopper','接料斗',hopper,'物料由料斗进入当前吸料缸。');part('cylinder-a','输送缸 A',pistons[0].p,'与另一缸交替吸料和推料，着色只表示输送方向。');part('cylinder-b','输送缸 B',pistons[1].p,'注意两缸相位相反。');part('valve','切换阀',valve,'切换阀把推料缸连接到输送管；阀型为教学简化。');movers.push(t=>{const u=Math.sin(t);pistons.forEach(({p,liquid},i)=>{const s=i===0?u:-u;p.position.x=.15+.95*s;liquid.scale.y=.8+.4*(1-s);liquid.material.color.setHex(s>0?0xe5ac36:0x287eb9);});valve.rotation.y=.5*u;});
  }else if(id==='sprayer'){
   box(root,1.5,.2,1.2,'navy',0,.25);for(const z of [-.55,.55])wheel(root,-.4,.25,z,.23);cyl(root,.46,.8,'white',0,.8);cyl(root,.49,.1,'blue',0,1.25);box(root,.5,.65,.6,'red',-.65,.95);pipe(root,[[-.65,.75,.3],[-1,.2,.9],[.3,.12,1.2],[1.2,.7,.7]],.055);const gun=new T.Group();gun.position.set(1.2,.7,.7);root.add(gun);box(gun,.5,.14,.14,'steel');box(gun,.1,.38,.12,'navy',-.1,-.15);cyl(gun,.1,.12,'red',.3,0).rotation.z=Math.PI/2;const filter=cyl(root,.12,.45,'steel',.7,.65);part('nozzle','喷嘴与护罩',gun,'清洁或拆卸前需按设备资料解除残余压力。');part('filter','过滤器',filter,'堵塞、损伤与清洗条件需要分别检查。');part('tank','涂料容器',root.children[3],'先核对材料和适用清洗条件，废液需受控收集。');movers.push((t,c)=>{gun.rotation.y=.1*Math.sin(t);filter.material.color.setHex(c.clean?0x8fa8b9:0xa07843);});
  }else if(id==='engine'){
   box(root,2.7,1.1,1.6,'blue',0,.85);box(root,2.5,.22,1.45,'steel',0,1.5);box(root,2.1,.3,1.2,'navy',0,.24);for(let i=0;i<4;i++){const x=-.9+i*.6;cyl(root,.2,.15,'dark',x,1.68);pipe(root,[[x,1.55,-.65],[x,1.8,-1],[x+.15,1.1,-1]],.05,'steel');}const oil=cyl(root,.13,.14,'yellow',.75,1.7,.35);const radiator=box(root,.18,1.45,1.75,'dark',1.65,1);for(let i=0;i<12;i++)box(root,.2,.035,1.6,'steel',1.65,.4+i*.1);const coolant=cyl(root,.13,.13,'red',1.65,1.8);const filter=cyl(root,.28,.65,'white',-.8,.85,.95);pipe(root,[[-.8,1.2,.95],[-1.25,1.5,.7],[-1.4,1.3,0]],.1);const belt=torus(root,.46,.055,'rubber',-1.5,.75);belt.rotation.y=Math.PI/2;part('oil','机油检查点',oil,'依据型号资料核对油液状态、泄漏和检查条件。');part('coolant','冷却系统',coolant,'温度与压力未满足检查条件时不进入开盖动作。');part('air-filter','空气滤清器',filter,'污染与损伤需结合案例资料判断，不按固定通用周期更换。');part('belt','传动与护罩',belt,'停用与隔离后才进入接近运动件的检查。');movers.push(t=>{belt.rotation.x=t;});
  }else if(id==='bearing'){
   const outer=torus(root,1.2,.17,'steel',0,1.4),inner=torus(root,.75,.14,'steel',0,1.4);const cage=new T.Group();cage.position.y=1.4;root.add(cage);for(let i=0;i<10;i++){const a=i*Math.PI/5;sphere(cage,.17,'steel',.98*Math.cos(a),.98*Math.sin(a));}const shaft=cyl(root,.52,2.6,'navy',0,1.4);shaft.rotation.x=Math.PI/2;const grease=sphere(root,.15,'green',.9,2.1,.15);part('outer','外圈与滚道',outer,'滚道和滚动体组成传力接触。');part('rolling','滚动体与保持架',cage,'润滑状态影响滚动接触；动画不计算寿命。');part('lubricant','润滑入口',grease,'按案例资料核对润滑品种和用量，不混用未知材料。');movers.push((t,c)=>{cage.rotation.z=t*.4;grease.material.color.setHex(c.lubricated?0x2b9e8d:0xc65d50);});
  }else throw new Error('Unknown machine '+id);
  result.pose(0);return result;
 }
 const api={make,box,cyl,sphere,beam,dynamicBeam,pipe,torus,wheel,material,colors};global.CourseMachines=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
