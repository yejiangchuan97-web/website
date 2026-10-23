/* One connected bridge, three physical vehicles, two cameras in the same world. */
(()=>{
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
window.createPatrolScene=function(host,callbacks={}){
 const T=window.THREE,reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let renderer;
 try{if(!T||/no-?webgl/.test(location.search))throw Error('WebGL unavailable');renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});}catch(e){host.innerHTML='<div class="fallback"><b>三维现场暂时无法开启</b><p>当前浏览器没有提供 WebGL。请使用支持硬件加速的浏览器重新打开本地页面。</p><p>仍可查看任务与已有记录；本轮不会生成模拟的三维采集证据。</p></div>';return{update(){},setView(){},setTheme(){},explode(){},capture(){return null},metrics(){return null},stats(){return{webgl:false}},dispose(){}};}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','桥梁巡检三维现场：拖动旋转、滚轮缩放，方向键旋转，Home恢复全桥');host.appendChild(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(38,1,.05,180),inspectionCamera=new T.PerspectiveCamera(58,1.6,.015,90);
 scene.fog=new T.Fog(0xeaf0f3,65,120);
 const hemi=new T.HemisphereLight(0xe4f3ff,0xb1a891,2.0);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffefd8,3.05);sun.position.set(-12,25,17);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:20,bottom:-20,near:.5,far:75});sun.shadow.bias=-.00015;sun.shadow.normalBias=.035;sun.shadow.radius=3;scene.add(sun);
 const fill=new T.DirectionalLight(0xc9e4ff,1.25);fill.position.set(16,12,-8);scene.add(fill);
 const world=window.createBridgeWorld(T);scene.add(world.group);
 const fleet={};for(const kind of ['wheel','dog','crawler']){fleet[kind]=window.createInspectionRobot(T,kind);scene.add(fleet[kind].group);}
 const lamp=new T.SpotLight(0xfff5de,0,7,Math.PI/4,.6,1);scene.add(lamp,lamp.target);
 const ropeMat=new T.MeshStandardMaterial({color:0xe9b253,roughness:.85}),ropeGeo=new T.CylinderGeometry(.014,.014,1,8);
 const ropeParts=Array.from({length:16},()=>{const m=new T.Mesh(ropeGeo,ropeMat);m.castShadow=true;scene.add(m);return m});
 const anchorMat=new T.MeshStandardMaterial({color:0xb5c5ca,metalness:.7,roughness:.28});
 const anchorPlate=new T.Mesh(new T.BoxGeometry(.22,.03,.16),anchorMat);anchorPlate.position.set(3.7,4.85,3.3);anchorPlate.name='independent-tether-anchor-base';anchorPlate.castShadow=true;scene.add(anchorPlate);
 const anchorEye=new T.Mesh(new T.TorusGeometry(.055,.012,8,20),anchorMat);anchorEye.position.set(3.7,4.912,3.3);anchorEye.name='independent-tether-anchor-eye';anchorEye.castShadow=true;scene.add(anchorEye);
 for(const x of [-.08,.08])for(const z of [-.05,.05]){const bolt=new T.Mesh(new T.CylinderGeometry(.012,.012,.018,6),anchorMat);bolt.position.set(3.7+x,4.874,3.3+z);bolt.name='tether-base-fixing';scene.add(bolt);}
 const routeMat=new T.MeshBasicMaterial({color:0x2679bf,transparent:true,opacity:.36,depthWrite:false});const route=new T.Group();scene.add(route);
 const ringMat=new T.MeshBasicMaterial({color:0x2194cc,transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false});
 const targetRing=new T.Mesh(new T.RingGeometry(.35,.38,64),ringMat);scene.add(targetRing);
 const pinNodes={};for(const id of ['road','stairs','wall']){const b=document.createElement('button');b.className='world-pin';b.dataset.point=id;b.title='选择'+({road:'桥面排水口',stairs:'桥台侧面',wall:'钢梁检查面'}[id]);b.innerHTML='<span>'+({road:'A',stairs:'B',wall:'C'}[id])+'</span>';b.onclick=()=>callbacks.onPick?.(id);host.appendChild(b);pinNodes[id]=b;}
 const targetData={road:{point:[-2,4.80,2.65],normal:[0,1,0],size:.85},stairs:{point:[-8.3,3.85,3.52],normal:[0,0,1],size:.75},wall:{point:[3,3.9,3.21],normal:[0,0,1],size:.48}};
 let state=null,lastMission=null,view='overview',exploded=false,explosion=0,visible=true,destroyed=false,raf=0,last=0,elapsed=0,dirty=true,lastPreview=0,cameraMetrics=null,theme='light';
 let orbit={az:.57,el:.48,r:34,tx:-.3,ty:2.2,tz:1.8},goal={...orbit};
 const preview=document.createElement('canvas');preview.width=640;preview.height=400;const pctx=preview.getContext('2d',{willReadFrequently:true});
 const renderTarget=new T.WebGLRenderTarget(640,400),pixels=new Uint8Array(640*400*4),imageData=pctx.createImageData(640,400);renderTarget.texture.colorSpace=T.SRGBColorSpace;
 const ray=new T.Raycaster(),v=new T.Vector3(),camPosition=new T.Vector3(),targetPosition=new T.Vector3(),up=new T.Vector3(0,1,0);
 function groundAt(x){return x<-15?.15:x>=-9?3.39:.15+(Math.floor((x+15)/.5)+1)*.27;}
 function poseAt(id,p,kind){
  if(id==='stairs'&&kind&&kind!=='dog')return{x:lerp(-16.8,-15.7,Math.min(1,p/.15)),y:.15,z:5.5,yaw:0};
  if(id==='wall'&&kind&&kind!=='crawler')return{x:3,y:.15,z:lerp(6.3,4.4,Math.min(1,p/.15)),yaw:Math.PI/2};
  if(id==='road')return{x:lerp(-11,-3.45,p),y:4.71,z:lerp(2.35,2.55,p),yaw:0};
  if(id==='stairs'){
   if(p<.82){const x=lerp(-15.65,-8.45,p/.82);return{x,y:.15+clamp((x+15+.25)/6,0,1)*3.24,z:5.5,yaw:0};}
   return{x:-8.45,y:3.39,z:lerp(5.5,5.05,(p-.82)/.18),yaw:Math.PI/2};
  }
  return{x:3,y:lerp(2.52,3.28,p),z:3.18,yaw:0};
 }
 function setRobot(kind,id,p,moving,dt){
  const rig=fleet[kind],o=poseAt(id,p,kind);rig.group.position.set(o.x,o.y,o.z);rig.group.rotation.set(0,o.yaw,0);
  if(id==='wall'&&kind==='crawler')rig.group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0)));
  const ground=id==='stairs'&&kind==='dog'&&o.yaw===0?(x,z)=>groundAt(o.x+x)-o.y:undefined;
  rig.setPose({travel:id==='stairs'?(p<.82?p/.82*7.2:7.2+(p-.82)/.18*.45):p*(id==='road'?Math.hypot(7.55,.2):.76),time:elapsed,moving,reducedMotion:reduce.matches,adhesion:state?.entries.wall.magnet,exploded:state?.robot===kind?explosion:0,groundAt:ground??null});
  return o;
 }
 function buildRoute(){while(route.children.length)route.remove(route.children[0]);if(!state)return;for(let i=0;i<27;i++){const p=poseAt(state.mission,i/26),m=new T.Mesh(new T.SphereGeometry(.035,6,4),routeMat);m.position.set(p.x,p.y+.045,p.z);if(state.mission==='wall')m.position.z+=.02;route.add(m);}}
 function updateRope(){const e=state.entries.wall,show=e.tether;for(const m of ropeParts)m.visible=show;if(!show)return;const end=fleet.crawler.tetherMount.getWorldPosition(new T.Vector3()),start=new T.Vector3(3.7,4.965,3.3);const points=[start,new T.Vector3(3.7,4.94,3.6),new T.Vector3(3.65,4.35,3.73),new T.Vector3(3.56,end.y+.12,3.8),end];const curve=new T.CatmullRomCurve3(points);for(let i=0;i<16;i++){const a=curve.getPoint(i/16),b=curve.getPoint((i+1)/16),m=ropeParts[i],delta=b.clone().sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(1,delta.length(),1);m.quaternion.setFromUnitVectors(up,delta.normalize());}}
 function cameraTarget(){if(!state)return;const td=targetData[state.mission],rig=fleet[state.robot];rig.group.updateMatrixWorld(true);rig.cameraMount.getWorldPosition(camPosition);targetPosition.fromArray(td.point);
  const direction=targetPosition.clone().sub(camPosition).normalize(),right=new T.Vector3().crossVectors(direction,up).normalize(),camUp=new T.Vector3().crossVectors(right,direction).normalize();
  const yaw=(state.camera.yaw||0)*Math.PI/180,pitch=(state.camera.pitch||0)*Math.PI/180;
  direction.applyAxisAngle(up,yaw).applyAxisAngle(right,pitch);const look=camPosition.clone().addScaledVector(direction,2);
  rig.aimAt?.(look);rig.group.updateMatrixWorld(true);rig.cameraMount.getWorldPosition(camPosition);
  const optical=new T.Vector3(1,0,0).applyQuaternion(rig.cameraMount.getWorldQuaternion(new T.Quaternion())).normalize(),opticalTarget=camPosition.clone().add(optical);
  inspectionCamera.position.copy(camPosition);inspectionCamera.up.copy(up);inspectionCamera.lookAt(opticalTarget);inspectionCamera.fov=(state.camera.mode==='detail'?(state.mission==='wall'?55:state.mission==='stairs'?45:42):(state.mission==='wall'?88:72))/(state.camera.zoom||1);inspectionCamera.updateProjectionMatrix();inspectionCamera.updateMatrixWorld(true);
  lamp.position.copy(camPosition);lamp.target.position.copy(opticalTarget);lamp.intensity=state.camera.lamp?1.2:0;
  const projected=targetPosition.clone().project(inspectionCamera),distance=camPosition.distanceTo(targetPosition),normal=new T.Vector3(...td.normal),towards=camPosition.clone().sub(targetPosition).normalize(),incidence=Math.acos(clamp(normal.dot(towards),-1,1))*180/Math.PI;
  ray.set(camPosition,targetPosition.clone().sub(camPosition).normalize());ray.far=Math.max(0,distance-.08);const hit=ray.intersectObject(world.group,true).filter(h=>{let visible=h.object.visible;for(let p=h.object.parent;p;p=p.parent)visible=visible&&p.visible;return visible&&h.object.material?.visible!==false&&h.object.material?.opacity!==0&&!h.object.userData.ignoreCameraOcclusion&&!h.object.userData.inspectionTarget;});
  const visibleTarget=hit.length===0;
  const exposure=state.mission==='road'?.9:state.camera.lamp?.86:.34;
  cameraMetrics={centered:Math.abs(projected.x)<.62&&Math.abs(projected.y)<.62&&projected.z<1,visible:visibleTarget,exposure,incidence,distance,coverage:td.size/(2*distance*Math.tan(inspectionCamera.fov*Math.PI/360)),position:camPosition.toArray().map(n=>+n.toFixed(4)),target:td.point,view:state.camera.mode,yaw:state.camera.yaw,pitch:state.camera.pitch,zoom:state.camera.zoom,lamp:state.camera.lamp,occluder:hit[0]?.object.name||null};
  return cameraMetrics;
 }
 function captureExposure(){return state.mission==='road'?1.05:state.camera.lamp?1.1:.37;}
 function renderPreview(){if(!state||!cameraMetrics)return;
  const oldExposure=renderer.toneMappingExposure;renderer.toneMappingExposure=captureExposure();
  const oldRing=targetRing.visible,oldRoute=route.visible;targetRing.visible=false;route.visible=false;
  renderer.setRenderTarget(renderTarget);renderer.render(scene,inspectionCamera);renderer.readRenderTargetPixels(renderTarget,0,0,640,400,pixels);renderer.setRenderTarget(null);renderer.toneMappingExposure=oldExposure;targetRing.visible=oldRing;route.visible=oldRoute;
  for(let y=0;y<400;y++)imageData.data.set(pixels.subarray((399-y)*640*4,(400-y)*640*4),y*640*4);pctx.putImageData(imageData,0,0);
  if(state.entries[state.mission].moving){const temp=document.createElement('canvas');temp.width=640;temp.height=400;temp.getContext('2d').drawImage(preview,0,0);pctx.globalAlpha=.25;for(let i=1;i<=4;i++)pctx.drawImage(temp,i*4,0);pctx.globalAlpha=1;}
  callbacks.onPreview?.(preview,cameraMetrics);
 }
 function settling(){return Object.values(fleet).some(r=>r.needsSettle?.());}
 function updateWorld(dt){if(!state)return;elapsed+=dt;const targetExplosion=exploded?1:0;explosion+=(targetExplosion-explosion)*(reduce.matches?1:1-Math.exp(-dt*7));if(Math.abs(explosion-targetExplosion)<.001)explosion=targetExplosion;if(dirty||state.entries[state.mission].moving||settling()||explosion!==targetExplosion)renderer.shadowMap.needsUpdate=true;
  for(const kind of Object.keys(fleet)){const id=kind==='wheel'?'road':kind==='dog'?'stairs':'wall',e=state.entries[id];if(kind===state.robot)setRobot(kind,state.mission,state.entries[state.mission].progress,state.entries[state.mission].moving,dt);else setRobot(kind,id,e.robot===kind?e.progress:0,false,dt);}
  scene.updateMatrixWorld(true);updateRope();cameraTarget();
  world.setState?.({roadCleared:!!state.entries.road.follow||!!state.entries.road.serviceDone,wallMaterial:'steel',wet:true});
  const td=targetData[state.mission];targetRing.position.set(...td.point);targetRing.position.addScaledVector(new T.Vector3(...td.normal),.018);targetRing.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),new T.Vector3(...td.normal));targetRing.visible=view!=='robot'&&state.stage!=='capture';route.visible=state.stage==='survey'||state.stage==='travel';
  if(view==='follow'||view==='robot'){const p=fleet[state.robot].group.position;goal.tx=p.x;goal.ty=p.y+(state.robot==='crawler'?.15:state.robot==='dog'?.4:.65);goal.tz=p.z;}
 }
 function setView(name){view=name;if(!state)return;const id=state.mission,p=poseAt(id,state.entries[id].progress,state.robot),td=targetData[id];
  if(name==='overview')goal={az:.57,el:.48,r:34,tx:-.3,ty:2.2,tz:1.8};
  else if(name==='follow')goal={az:id==='wall'?.25:id==='road'?-2.0:-1.25,el:id==='wall'?.15:id==='road'?.45:.55,r:state.robot==='crawler'?3.1:state.robot==='dog'?4.3:4.4,tx:p.x,ty:p.y+.6,tz:p.z};
  else if(name==='robot')goal={az:state.robot==='crawler'?(exploded?.95:.2):state.robot==='dog'?-1.4:-2,el:state.robot==='dog'?.48:exploded?.42:.28,r:state.robot==='wheel'?2.6:state.robot==='dog'?2.9:exploded?2.65:2.15,tx:p.x,ty:p.y+(state.robot==='crawler'?.1:.48),tz:p.z};
  else if(name==='target')goal={az:id==='road'?-.45:.05,el:id==='road'?1.05:.12,r:id==='road'?3.35:2.6,tx:td.point[0],ty:td.point[1],tz:td.point[2]};
  else if(name==='camera')goal={...orbit};
  if(reduce.matches)orbit={...goal};callbacks.onView?.(name);request();
 }
 function placeCamera(dt){const ease=reduce.matches?1:1-Math.exp(-dt*8);let moving=false;for(const k of Object.keys(goal)){if(Math.abs(goal[k]-orbit[k])>.0001)moving=true;orbit[k]+= (goal[k]-orbit[k])*ease;}
  camera.position.set(orbit.tx+Math.sin(orbit.az)*Math.cos(orbit.el)*orbit.r,orbit.ty+Math.sin(orbit.el)*orbit.r,orbit.tz+Math.cos(orbit.az)*Math.cos(orbit.el)*orbit.r);camera.lookAt(orbit.tx,orbit.ty,orbit.tz);camera.updateMatrixWorld();return moving;
 }
 function pins(){for(const[id,b]of Object.entries(pinNodes)){v.fromArray(targetData[id].point);v.y+=.5;v.project(camera);b.hidden=view!=='overview'||Math.abs(v.x)>1||Math.abs(v.y)>1||v.z>1;b.style.left=(v.x*.5+.5)*host.clientWidth+'px';b.style.top=(-v.y*.5+.5)*host.clientHeight+'px';b.classList.toggle('selected',state?.mission===id);}}
 function drawMain(){const size=renderer.getSize(new T.Vector2());renderer.setRenderTarget(null);renderer.setViewport(0,0,size.x,size.y);if(view==='camera'){renderer.clear();const h=Math.min(size.y,size.x/1.6),w=h*1.6;renderer.setViewport((size.x-w)/2,(size.y-h)/2,w,h);renderer.autoClear=false;const exposure=renderer.toneMappingExposure;renderer.toneMappingExposure=captureExposure();renderer.render(scene,inspectionCamera);renderer.toneMappingExposure=exposure;renderer.autoClear=true;}else renderer.render(scene,camera);}
 function frame(now){raf=0;if(destroyed||!active()||document.hidden)return;const dt=Math.min(.08,last?(now-last)/1000:.016);last=now;const moving=state?.entries[state.mission].moving;
  if(moving)callbacks.onTick?.(dt);updateWorld(dt);const easing=placeCamera(dt);
  if(state?.stage==='capture'&&(now-lastPreview>160||dirty)){renderPreview();lastPreview=now;}
  if(visible){drawMain();pins();}dirty=false;
  if(moving||settling()||(easing||Math.abs(explosion-(exploded?1:0))>.001)&&visible)raf=requestAnimationFrame(frame);
 }
 function active(){return visible||state?.entries[state.mission].moving||settling()||state?.stage==='capture';}
 function request(){dirty=true;if(!raf&&active()&&!document.hidden&&!destroyed)raf=requestAnimationFrame(frame);}
 function resize(){const r=host.getBoundingClientRect();if(r.width<2||r.height<2)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();request();}
 const ro=new ResizeObserver(resize);ro.observe(host);const io=new IntersectionObserver(es=>{visible=es[0]?.isIntersecting;last=0;if(active())request();else if(raf){cancelAnimationFrame(raf);raf=0;}});io.observe(host);
 const onVisibility=()=>{last=0;if(!document.hidden)request();};document.addEventListener('visibilitychange',onVisibility);
 let drag=null;canvas.addEventListener('pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0};canvas.setPointerCapture(e.pointerId);canvas.focus();});
 canvas.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);goal.az-=dx*.006;goal.el=clamp(goal.el+dy*.004,-.12,1.35);drag.x=e.clientX;drag.y=e.clientY;view='free';callbacks.onView?.(view);request();});
 canvas.addEventListener('pointerup',e=>{if(drag?.moved<5){const r=canvas.getBoundingClientRect();ray.setFromCamera({x:(e.clientX-r.left)/r.width*2-1,y:1-(e.clientY-r.top)/r.height*2},camera);ray.far=100;const hits=ray.intersectObjects(world.pickables||[],true);if(hits[0])callbacks.onPick?.(hits[0].object.userData.mission||hits[0].object.userData.station||hits[0].object.userData.id);}drag=null;});canvas.addEventListener('pointercancel',()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();goal.r=clamp(goal.r*Math.exp(e.deltaY*.001),.7,55);request();},{passive:false});
 canvas.addEventListener('keydown',e=>{if(e.key==='Home'){setView('overview');e.preventDefault();return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')goal.az-=.12;if(e.key==='ArrowRight')goal.az+=.12;if(e.key==='ArrowUp')goal.el=clamp(goal.el+.08,-.12,1.35);if(e.key==='ArrowDown')goal.el=clamp(goal.el-.08,-.12,1.35);if(e.key==='+'||e.key==='=')goal.r*=.9;if(e.key==='-')goal.r*=1.1;request();}});
 return{
  update(s){const changed=lastMission!==s.mission;state=s;if(changed){lastMission=s.mission;buildRoute();}updateWorld(0);request();},
  setView,setTheme(t){theme=t;scene.fog.color.setHex(t==='dark'?0x1d3040:0xeaf0f3);renderer.toneMappingExposure=t==='dark'?.88:1.12;request();},
  explode(value){exploded=value;setView('robot');request();},
  capture(){if(!state)return null;updateWorld(0);renderPreview();if(visible)drawMain();return{image:preview.toDataURL('image/jpeg',.88),metrics:JSON.parse(JSON.stringify(cameraMetrics)),mode:state.camera.mode,mission:state.mission,condition:state.mission==='road'&&(state.entries.road.serviceDone||state.entries.road.follow)?'after-maintenance':'initial',capturedAt:new Date().toISOString()};},
  metrics(){return cameraMetrics},preview,resize,
  stats(){let meshes=0,triangles=0;scene.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return{webgl:true,meshes,triangles,world:world.stats?.(),robots:Object.fromEntries(Object.entries(fleet).map(([k,r])=>[k,r.stats()])),view,orbit:{...orbit},metrics:cameraMetrics};},
  inspect(){return{scene,camera,inspectionCamera,fleet,world,poseAt,groundAt}},
  dispose(){destroyed=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',onVisibility);renderer.dispose();renderTarget.dispose();}
 };
};
})();
