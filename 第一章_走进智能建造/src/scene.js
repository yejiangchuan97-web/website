/* First chapter entrance: interactive exhibit models with picking, orbit and focus. */
(()=>{'use strict';
const host=document.getElementById('stage'),labels=document.getElementById('labels');
let paused=matchMedia('(prefers-reduced-motion: reduce)').matches,active=0,items=[],movers=[],group,renderer,camera,scene,frame=0;
const fallback=()=>{document.getElementById('fallback').hidden=false;labels.replaceChildren();};
const fallbackScene={show(){},pause(){},focus(){},resetView(){},getState(){return {chapter:1,models:0,paused:true,webgl:false};}};
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




// Entrance concept exhibits; task pages provide reading guides.
function building(g){
 for(let i=0;i<3;i++){
  const y=.18+i*.9;box(g,2.6,.13,1.85,'white',0,y);
  for(const x of[-1.12,0,1.12])for(const z of[-.75,.75])box(g,.12,.86,.12,'metal',x,y+.49,z);
  box(g,2.45,.6,.07,'pale',0,y+.46,-.81);
  for(const x of[-.78,-.26,.26,.78])box(g,.37,.38,.016,'blue',x,y+.5,-.765);
 }
 box(g,2.7,.13,1.95,'blue',0,2.88);box(g,.7,.12,.62,'pale',.55,2.99,-.3);
 for(let i=0;i<5;i++)box(g,.55,.025,.05,'amber',-.5,.27,-.55+i*.22);
 box(g,.65,.03,.75,'blue',.5,1.17,0);
 for(const x of[-.85,-.45]){bar(g,[x,1.21,.25],[x,1.65,.25],.045,'navy');ball(g,.075,'amber',x,1.73,.25);}
 const dot=ball(g,.065,'blue');movers.push(t=>dot.position.set(-.9+1.8*(.5+.5*Math.sin(t*.35)),.32,.45));
}
function excavator(g){
 box(g,1.9,.28,1.2,'navy',-.2,.4);
 for(const z of[-.65,.65]){
  box(g,2.6,.4,.36,'rubber',-.2,.24,z);
  for(let i=0;i<7;i++){const wheel=cyl(g,.14,.38,'metal',-1.25+i*.35,.24,z);wheel.rotation.x=Math.PI/2;}
  for(let i=0;i<12;i++)box(g,.11,.025,.4,'navy',-1.4+i*.22,.45,z);
 }
 cyl(g,.5,.16,'metal',-.2,.62);
 const top=new T.Group();top.position.set(-.2,.7,0);g.add(top);
 box(top,1.45,.36,.95,'amber',-.25,.2);box(top,.6,.72,.65,'white',-.5,.7,-.1);box(top,.43,.4,.025,'blue',-.5,.78,.24);box(top,.025,.4,.4,'blue',-.19,.78,-.1);
 bar(top,[.28,.35,0],[.87,1.67,0],.16,'amber');bar(top,[.87,1.67,0],[1.53,.68,0],.12,'amber');
 bar(top,[.35,.46,.16],[.8,1.45,.16],.045,'metal');bar(top,[.88,1.5,.13],[1.4,.8,.13],.035,'metal');
 for(const p of[[.28,.35,0],[.87,1.67,0],[1.53,.68,0]]){const joint=cyl(top,.15,.35,'navy',...p);joint.rotation.x=Math.PI/2;}
 box(top,.52,.22,.65,'navy',1.56,.48);box(top,.1,.38,.65,'navy',1.8,.58);for(const z of[-.22,0,.22])box(top,.24,.06,.09,'metal',1.5,.32,z);
 movers.push(t=>top.rotation.y=Math.sin(t*.3)*.08);
}
function robot(g){
 box(g,1.15,.3,1.2,'white',-.35,.3,.4);
 for(const x of[-.93,.23])for(const z of[0,.85]){const w=cyl(g,.18,.12,'rubber',x,.24,z);w.rotation.z=Math.PI/2;}
 box(g,.2,2.3,.2,'white',-.35,1.56,.35);box(g,.4,.12,.4,'blue',-.35,2.76,.35);cyl(g,.14,.16,'navy',-.35,2.89,.35);
 box(g,2.45,2.55,.1,'pale',0,1.43,-.86);for(let i=0;i<5;i++)box(g,.025,1.9,.018,'white',-.8+i*.4,1.4,-.8);
 const head=new T.Group();head.position.set(-.35,1.7,.35);g.add(head);box(head,.42,.33,.38,'blue');bar(head,[0,0,-.15],[.75,0,-.95],.05,'metal');ball(head,.1,'amber',.75,0,-.95);
 box(g,.6,.1,.34,'navy',.55,.22,.65);box(g,.43,.2,.04,'blue',.55,.38,.6);
 movers.push(t=>head.position.y=1.65+.28*Math.sin(t*.4));
}
const ground=mesh(scene,new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.13}),0,-.35);ground.rotation.x=-Math.PI/2;
const grid=new T.GridHelper(34,34,0xd2e1ed,0xdce8f1);grid.position.y=-.32;grid.material.transparent=true;grid.material.opacity=.22;scene.add(grid);
function disposeGroup(){if(!group)return;group.traverse(o=>{if(o.geometry)o.geometry.dispose();});scene.remove(group);}
function station(x,z,build,label,id,scale=1){const p=new T.Group();p.position.set(x,0,z);group.add(p);const platform=box(p,3.7,.2,3.05,'white',0,-.12);platform.material=M.white.clone();p.userData={id,platform};box(p,3.55,.05,2.9,'pale',0,-.235);box(p,.8,.035,.08,'blue',-.95,.005,1.4);const model=new T.Group();model.scale.setScalar(scale);p.add(model);build(model);const btn=document.createElement('button');btn.className='model-label';btn.innerHTML=`<b>${id}</b>${label}`;btn.setAttribute('aria-label',`${id} ${label}`);btn.addEventListener('click',()=>window.CourseUI?.model(id));btn.addEventListener('mouseenter',()=>window.CourseUI?.preview(id));labels.append(btn);items.push({node:btn,position:new T.Vector3(x,.02,z+1.65),model:p,id});}
function show(){active=1;disposeGroup();group=new T.Group();scene.add(group);movers=[];items=[];labels.replaceChildren();station(-3.5,-1.7,building,'从施工到智能建造','1-1',1);station(3.1,-1.6,excavator,'认识施工机械','1-2',1);station(0,3,robot,'认识施工机器人','1-3',1);movers.forEach(fn=>fn(0));resize();render();}
function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);const aspect=w/h;const span=active===0?19:active===1?15:11;const height=Math.max(active===0?14:active===1?9.1:10,span/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.position.set(active===0?5:5,18,25);camera.lookAt(0,active===0?.4:.8,active===0?.3:0);camera.updateProjectionMatrix();render();}
function render(){renderer.render(scene,camera);for(const i of items){const p=i.position.clone().project(camera);i.node.style.left=`${(p.x+1)*50}%`;i.node.style.top=`${(-p.y+1)*50}%`;}}
let time=0,last=0;function animate(now){frame=requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.05);last=now;if(paused||document.hidden)return;time+=dt;movers.forEach(fn=>fn(time));items.forEach(i=>{const target=i.id === focused ? 0.18 : 0;i.model.position.y+=(target-i.model.position.y)*.1;});render();}requestAnimationFrame(animate);new ResizeObserver(resize).observe(host);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
let focused=null,az=.2,el=.62,drag=null;
const ray=new T.Raycaster(),pointer=new T.Vector2();
function orbit(){camera.position.set(Math.sin(az)*29*Math.cos(el),29*Math.sin(el),Math.cos(az)*29*Math.cos(el));camera.lookAt(0,.8,0);render();}
renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const scale=host.getBoundingClientRect().width/host.clientWidth;const dx=(e.clientX-drag.px)/scale,dy=(e.clientY-drag.py)/scale;if(Math.abs(e.clientX-drag.x)+Math.abs(e.clientY-drag.y)>6)drag.moved=true;az-=dx*.004;el=Math.max(.35,Math.min(1.12,el+dy*.003));drag.px=e.clientX;drag.py=e.clientY;orbit();});
renderer.domElement.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;if(moved)return;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(group.children,true)[0];if(hit){let o=hit.object;while(o&&!o.userData.id)o=o.parent;if(o)window.CourseUI?.model(o.userData.id);}});
renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('dblclick',()=>window.CourseScene.resetView());
window.CourseScene={show,pause(v){paused=v;},resetView(){az=.2;el=.62;orbit();},focus(id){focused=id;items.forEach(i=>{i.node.classList.toggle('is-focused',i.id===id);i.model.userData.platform.material.color.setHex(i.id===id?0xd4e8ff:0xf5f8fa);if(paused)i.model.position.y=i.id === id ? 0.18 : 0;});render();},getState(){return {chapter:active,models:items.length,paused,webgl:!document.getElementById('fallback').hidden?false:true};}};
})();
