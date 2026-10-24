/* Eighth chapter entrance: interactive exhibit models with picking, orbit and focus. */
(()=>{'use strict';
const host=document.getElementById('stage'),labels=document.getElementById('labels');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,active=0,items=[],movers=[],group,renderer,camera,scene,frame=0;
const fallback=()=>{document.getElementById('fallback').hidden=false;labels.replaceChildren();};
const fallbackScene={show(){},pause(){},focus(){},resetView(){},getState(){return {chapter:8,models:0,paused:true,webgl:false};}};
if(!window.THREE){fallback();window.CourseScene=fallbackScene;return;}
const T=THREE;
try{renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}catch(e){fallback();window.CourseScene=fallbackScene;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;host.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-hidden','true');
scene=new T.Scene();camera=new T.OrthographicCamera(-10,10,9,-9,.1,150);camera.position.set(8,17,24);camera.lookAt(0,0,0);
scene.add(new T.HemisphereLight(0xffffff,0x6f8da5,2.4));const sun=new T.DirectionalLight(0xfffbf3,3.2);sun.position.set(-9,20,12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.normalBias=.045;sun.shadow.bias=-.0002;sun.shadow.radius=3;scene.add(sun);const fill=new T.DirectionalLight(0x9bc9ff,1.2);fill.position.set(10,8,-10);scene.add(fill);
const M={};for(const [key,color] of Object.entries({blue:0x327fc0,navy:0x204363,pale:0xc4dced,white:0xf5f8fa,metal:0x9cb4c5,dark:0x294658,rubber:0x1d2f3d,amber:0xe8aa55,green:0x5ca5a6,ground:0xe8f1f8}))M[key]=new T.MeshStandardMaterial({color,roughness:key==='metal'?.3:.52,metalness:key==='metal'?.65:.16});
function mesh(g,geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,M[mat]||mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function box(g,w,h,d,mat,x=0,y=0,z=0){return mesh(g,new T.BoxGeometry(w,h,d),mat,x,y,z);}
function cyl(g,r,h,mat,x=0,y=0,z=0){return mesh(g,new T.CylinderGeometry(r,r,h,32),mat,x,y,z);}
function ball(g,r,mat,x=0,y=0,z=0){return mesh(g,new T.SphereGeometry(r,24,16),mat,x,y,z);}
function bar(g,a,b,r,mat){const aa=new T.Vector3(...a),bb=new T.Vector3(...b),o=cyl(g,r,aa.distanceTo(bb),mat);o.position.copy(aa).add(bb).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bb.sub(aa).normalize());return o;}
function ring(g,r,t,mat,x=0,y=0,z=0){return mesh(g,new T.TorusGeometry(r,t,12,48),mat,x,y,z);}
function bolts(g,r,y,n=6){for(let i=0;i<n;i++)cyl(g,.055,.045,'metal',Math.cos(i*2*Math.PI/n)*r,y,Math.sin(i*2*Math.PI/n)*r);}




// Concept exhibits, separate from the reading guides and future device simulations.
M.red=new T.MeshStandardMaterial({color:0xd16a57,roughness:.5});
function hose(g,points,mat='rubber',r=.045){return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),36,r,8,false),mat);}
function safety(g){
  cyl(g,.68,.18,'navy',-.35,.17);bolts(g,.5,.28);cyl(g,.38,.45,'white',-.35,.5);
  const arm=new T.Group();arm.position.set(-.35,.73,0);g.add(arm);
  bar(arm,[0,0,0],[-.4,1.08,0],.2,'white');bar(arm,[-.4,1.08,0],[.95,1.6,0],.16,'blue');bar(arm,[.95,1.6,0],[1.25,.95,0],.11,'white');
  for(const p of[[0,0,0],[-.4,1.08,0],[.95,1.6,0]]){const j=cyl(arm,.23,.3,'blue',...p);j.rotation.x=Math.PI/2;}
  box(arm,.33,.16,.3,'navy',1.25,.86);for(const x of[1.1,1.4])box(arm,.065,.28,.2,'metal',x,.69);
  const envelope=ring(g,1.45,.025,'blue',-.2,.08);envelope.rotation.x=-Math.PI/2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,.16,.025,.12,'amber',Math.cos(a)*1.45-.2,.1,Math.sin(a)*1.45);}
  box(g,.45,.8,.45,'pale',1.15,.5,1.02);cyl(g,.2,.09,'amber',1.15,.96,1.02);cyl(g,.13,.14,'red',1.15,1.06,1.02);
  const marker=ball(g,.07,'blue');movers.push(t=>marker.position.set(-.2+1.45*Math.cos(t*.35),.12,1.45*Math.sin(t*.35)));
}
function maintenance(g){
  box(g,2.65,.15,1.7,'navy',0,.3);for(const x of[-1.05,1.05])for(const z of[-.55,.55])box(g,.12,.28,.12,'metal',x,.15,z);
  const gear=new T.Group();gear.position.set(-.5,1.05,0);gear.rotation.x=Math.PI/2;g.add(gear);
  cyl(gear,.65,.26,'blue');cyl(gear,.28,.32,'pale');cyl(gear,.13,.5,'metal');
  for(let i=0;i<14;i++){const a=i*Math.PI*2/14,o=box(gear,.18,.25,.22,'blue',.66*Math.cos(a),0,.66*Math.sin(a));o.rotation.y=-a;}
  for(const x of[-.5,.5])box(g,.15,.52,.5,'white',x,.63,.1);
  box(g,.8,.1,1.1,'white',.75,.44,.12);box(g,.4,.04,.12,'metal',.75,.52,-.31);
  for(let i=0;i<4;i++)box(g,.5,.025,.025,'blue',.75,.51,-.14+i*.18);
  box(g,.35,.55,.3,'white',-.95,.66,-.56);box(g,.26,.25,.025,'pale',-.95,.8,-.395);
  movers.push(t=>gear.rotation.y=t*.18);
}
function climbing(g){
  box(g,2.5,2.7,.13,'pale',-.1,1.45,-.7);for(let i=0;i<4;i++)box(g,2.45,.025,.015,'metal',-.1,.42+i*.6,-.62);
  box(g,1.2,.7,.27,'blue',-.15,1.35,-.4);box(g,.62,.44,.06,'white',-.15,1.35,-.23);
  for(const x of[-.62,.32])for(const y of[1.06,1.65]){const w=cyl(g,.18,.14,'rubber',x,y,-.47);w.rotation.x=Math.PI/2;}
  cyl(g,.13,.09,'amber',-.15,1.35,-.15).rotation.x=Math.PI/2;
  box(g,.32,.15,.32,'navy',.65,2.87,-.7);ring(g,.1,.04,'metal',.65,2.99,-.6);
  hose(g,[[.65,2.98,-.55],[.5,2.35,-.18],[.14,1.74,-.16]],'amber',.035);
  hose(g,[[-.53,1.02,-.16],[-.91,.65,0],[-.95,.21,.6],[.2,.14,.83]],'rubber',.035);
  box(g,.65,.32,.55,'white',.57,.28,.8);box(g,.3,.08,.25,'blue',.57,.48,.8);
}
function health(g){
  cyl(g,.44,.95,'navy',-.7,.67,.2);cyl(g,.46,.1,'blue',-.7,1.2,.2);cyl(g,.32,.14,'white',-.7,1.32,.2);
  for(let i=0;i<7;i++)box(g,.32,.035,.018,'pale',-.7,.4+i*.1,.649);
  for(const x of[-1.02,-.38]){const w=cyl(g,.13,.1,'rubber',x,.2,.42);w.rotation.z=Math.PI/2;}
  hose(g,[[-.7,1.43,.2],[-.15,1.65,.1],[.65,1.4,-.05],[.8,1.72,-.5]]);
  bar(g,[.82,.45,.3],[.8,1.78,-.5],.07,'metal');const head=cyl(g,.3,.13,'blue',.8,1.86,-.57);head.rotation.x=Math.PI/2;
  const disc=cyl(g,.27,.03,'amber',.8,1.86,-.65);disc.rotation.x=Math.PI/2;
  box(g,.8,.09,.75,'white',.65,.1,.78);cyl(g,.25,.53,'pale',.6,.43,.8);cyl(g,.28,.06,'navy',.6,.74,.8);bar(g,[.6,.76,.8],[.6,1.01,.8],.05,'metal');bar(g,[.45,1.01,.8],[.77,1.01,.8],.045,'blue');
  movers.push(t=>disc.rotation.y=t*.25);
}
const ground=mesh(scene,new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.13}),0,-.35);ground.rotation.x=-Math.PI/2;
const grid=new T.GridHelper(34,34,0xd2e1ed,0xdce8f1);grid.position.y=-.32;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
function disposeGroup(){if(!group)return;group.traverse(o=>{if(o.geometry)o.geometry.dispose();});scene.remove(group);}
function station(x,z,build,label,id,scale=1){const p=new T.Group();p.position.set(x,0,z);group.add(p);const platform=box(p,3.7,.2,3.05,'white',0,-.12);platform.material=M.white.clone();p.userData={id,platform};box(p,3.55,.05,2.9,'pale',0,-.235);box(p,.8,.035,.08,'blue',-.95,.005,1.4);const model=new T.Group();model.scale.setScalar(scale);p.add(model);build(model);const btn=document.createElement('button');btn.className='model-label';btn.innerHTML=`<b>${id}</b>${label}`;btn.setAttribute('aria-label',`${id} ${label}`);btn.addEventListener('click',()=>window.CourseUI?.model(id));btn.addEventListener('mouseenter',()=>window.CourseUI?.preview(id));labels.append(btn);items.push({node:btn,position:new T.Vector3(x,.02,z+1.65),model:p,id});}
function show(){active=8;disposeGroup();group=new T.Group();scene.add(group);movers=[];items=[];labels.replaceChildren();station(-3.2,-3.1,safety,'安全操作','8-1',.98);station(3.2,-3.1,climbing,'爬壁作业检查','8-3',.98);station(-3.2,3.3,maintenance,'保养与排查','8-2',1);station(3.2,3.3,health,'健康与维护','8-4',1);movers.forEach(fn=>fn(0));resize();render();}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const span=active===0?19:active===8?15:11;const height=Math.max(active===0?14:active===8?10.8:10,span/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.position.set(5,24,25);camera.lookAt(0,active===0?.4:.8,active===0?.3:0);camera.updateProjectionMatrix();render();}
function render(){renderer.render(scene,camera);for(const i of items){const p=i.position.clone().project(camera);i.node.style.left=`${(p.x+1)*50}%`;i.node.style.top=`${(-p.y+1)*50}%`;}}
let time=0,last=0;function animate(now){frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(paused||document.hidden)return;time+=dt;movers.forEach(fn=>fn(time));items.forEach(i=>{const target=i.id === focused ? 0.18 : 0;i.model.position.y+=(target-i.model.position.y)*.1;});render();}requestAnimationFrame(animate);new ResizeObserver(resize).observe(host);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
let focused=null,az=.2,el=.76,drag=null;
const ray=new T.Raycaster(),pointer=new T.Vector2();
function orbit(){camera.position.set(Math.sin(az)*29*Math.cos(el),29*Math.sin(el),Math.cos(az)*29*Math.cos(el));camera.lookAt(0,.8,0);render();}
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const scale=host.getBoundingClientRect().width/host.clientWidth;const dx=(e.clientX-drag.px)/scale,dy=(e.clientY-drag.py)/scale;if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>6)drag.moved=true;az-=dx*.004;el=Math.max(.35,Math.min(1.12,el+dy*.003));drag.px=e.clientX;drag.py=e.clientY;orbit();});
renderer.domElement.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(group.children,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.id)o=o.parent;if(o)window.CourseUI?.model(o.userData.id);}});
renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('dblclick',()=>window.CourseScene.resetView());
window.CourseScene={show,pause(v){paused=v;},resetView(){az=.2;el=.76;orbit();},focus(id){focused=id;items.forEach(i=>{i.node.classList.toggle('is-focused',i.id===id);i.model.userData.platform.material.color.setHex(i.id===id?0xd4e8ff:0xf5f8fa);if(paused)i.model.position.y=i.id === id ? 0.18 : 0;});render();},getState(){return {chapter:active,models:items.length,paused,webgl:!document.getElementById('fallback').hidden?false:true};}};
})();
