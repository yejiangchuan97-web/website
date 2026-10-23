/* Hero: one physical sanding robot in a perspective workshop. No network assets. */
(()=>{
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  window.createSandingScene=function(host,callbacks={}){
    const T=window.THREE, media=matchMedia('(prefers-reduced-motion: reduce)');
    let data={},view='overview',demo=true,exploded=false,visible=true,destroyed=false,raf=0,lastTime=0,frameCount=0,dirty=true,elapsed=0,spin=0,particleLevel=0,textureKey='',theme='light';
    let renderer;
    try{if(!T||/[?&]no-?webgl(?:=1)?/i.test(location.search))throw Error('fallback');renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch{return fallback(host,callbacks);}
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','三维打磨工坊：拖动旋转，滚轮缩放，方向键调整镜头，Home恢复全景');host.appendChild(canvas);
    const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.035,40);
    const mats={},mat=(name,color,metalness=0,roughness=.65,extra={})=>mats[name]=new T.MeshStandardMaterial({color,metalness,roughness,...extra});
    mat('blue',0x1768bc,.35,.3);mat('lightBlue',0x6bb4ed,.25,.35);mat('white',0xf2f5f4,.16,.38);mat('silver',0xc8d5dd,.76,.27);mat('steel',0x758c9d,.67,.35);mat('rubber',0x263644,.02,.86);mat('navy',0x183c60,.28,.48);mat('orange',0xf5a34b,.12,.4);mat('green',0x44bba5,.3,.35);mat('red',0xd94b48,.1,.4);mat('brass',0xc8a76b,.6,.4);mat('cloth',0xc6b392,0,.95);mat('glass',0xb9d9e4,.12,.28,{transparent:true,opacity:.44});
    const wallMat=mat('wall',0xf6f2e9,0,.95),floorMat=mat('floor',0xe2e6e4,.05,.87),frameMat=mat('frame',0xd4dcd9,.2,.6);
    const hemi=new T.HemisphereLight(0xe8f5ff,0xb8ae99,2.15);scene.add(hemi);
    const sun=new T.DirectionalLight(0xfff3df,3.0);sun.position.set(-3.4,7.5,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:18});sun.shadow.bias=-.0003;sun.shadow.normalBias=.018;sun.shadow.radius=3;scene.add(sun);
    const fill=new T.DirectionalLight(0xc6e7ff,1.4);fill.position.set(5,4,1);scene.add(fill);
    const rim=new T.DirectionalLight(0xffffff,.6);rim.position.set(0,2,-3);scene.add(rim);
    const environment=[];
    function mesh(name,geometry,material,position,parent=scene){const m=new T.Mesh(geometry,material);m.name=name;m.castShadow=m.receiveShadow=true;if(position)m.position.set(...position);parent.add(m);environment.push(m);return m;}
    function box(name,w,h,d,x,y,z,material,parent){return mesh(name,new T.BoxGeometry(w,h,d),material,[x,y,z],parent);}
    // Thickness, skirting and window reveals make the room read as a workshop slice.
    box('floor-plinth',4.8,.15,2.85,0,-.075,1.22,floorMat);
    box('plaster-wall',4.8,2.85,.15,0,1.425,-.075,wallMat);
    box('skirting',4.8,.12,.035,0,.06,.003,frameMat);
    const side=new T.Group();scene.add(side);
    box('left-reveal-low',.15,.82,1.4,-2.39,.41,.57,wallMat,side);
    box('left-reveal-top',.15,.34,1.4,-2.39,2.68,.57,wallMat,side);
    box('left-reveal-front',.15,1.69,.15,-2.39,1.665,1.2,wallMat,side);
    box('left-reveal-back',.15,1.69,.17,-2.39,1.665,-.06,wallMat,side);
    box('window-glass',.025,1.58,1.05,-2.375,1.65,.57,mats.glass,side);
    box('window-mullion',.08,1.62,.045,-2.32,1.65,.57,mats.white,side);
    box('window-sill',.24,.05,1.23,-2.29,.83,.57,mats.white,side);
    for(let i=0;i<5;i++)box('floor-joint-'+i,.006,.002,2.74,-1.9+i*.95,.002,1.22,frameMat);
    for(let i=0;i<3;i++)box('floor-cross-joint-'+i,4.7,.002,.005,0,.002,.3+i*.95,frameMat);
    const tapeMat=mat('tape',0xe5bb55,0,.9);box('working-zone-tape',3.85,.003,.035,0,.004,2.47,tapeMat);
    // Actual raking lamp and straightedge, shown when the inspection tools are used.
    const lamp=new T.Group();scene.add(lamp);
    box('lamp-foot',.28,.035,.22,-1.82,.022,.72,mats.navy,lamp);box('lamp-stem',.025,1.55,.025,-1.82,.81,.72,mats.silver,lamp);
    box('lamp-body',.075,.85,.08,-1.82,1.51,.59,mats.orange,lamp);const lampFace=box('lamp-diffuser',.04,.78,.07,-1.79,1.51,.55,mats.white,lamp);
    const raking=new T.SpotLight(0xfff4ce,0,6,Math.PI/3,.65,1.0);raking.position.set(-1.76,1.65,.45);raking.target.position.set(.8,1.45,0);scene.add(raking,raking.target);
    const ruler=new T.Group();scene.add(ruler);box('straightedge-body',1.8,.055,.04,0,1.1,.09,mats.silver,ruler);box('straightedge-recess',1.65,.012,.004,0,1.1,.113,mats.navy,ruler);
    for(let i=0;i<31;i++)box('straightedge-tick-'+i,.003,i%5===0?.016:.009,.002,-.75+i*.05,1.125,.114,mats.steel,ruler);
    ruler.position.y=.45;ruler.visible=false;
    // Six independently persistent finish samples, projected onto the real wall.
    const wallCanvas=document.createElement('canvas');wallCanvas.width=1200;wallCanvas.height=720;const ctx=wallCanvas.getContext('2d');
    const wallTexture=new T.CanvasTexture(wallCanvas);wallTexture.colorSpace=T.SRGBColorSpace;wallTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const finishMat=new T.MeshStandardMaterial({map:wallTexture,roughness:.93,transparent:true,depthWrite:false});
    const wallPlane=mesh('finish-samples',new T.PlaneGeometry(3.2,1.66),finishMat,[0,1.59,.003]);wallPlane.receiveShadow=true;
    const sampleCenters=Array.from({length:6},(_,i)=>({x:(i%3-1)*.96,y:i<3?1.98:1.21}));
    const bumpGroup=new T.Group();scene.add(bumpGroup);const bumpBlock=box('force-test-coupon',.9,.8,.045,0,0,-.025,wallMat,bumpGroup);bumpGroup.position.set(0,1.72,.008);
    const bumpTrim=box('coupon-bottom-seat',.94,.02,.07,0,-.41,-.016,mats.steel,bumpGroup);
    const contour=new T.Mesh(new T.RingGeometry(.165,.17,64),new T.MeshBasicMaterial({color:0xe8ad58,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));scene.add(contour);
    let robot=window.createSandingRobot(T,mats);scene.add(robot.group);
    const physicalCount=()=>robot.getStats().meshes+environment.length;
    const dustG=new T.BufferGeometry(),particleCount=90,dustPositions=new Float32Array(particleCount*3);dustG.setAttribute('position',new T.BufferAttribute(dustPositions,3));
    const dotCanvas=document.createElement('canvas');dotCanvas.width=dotCanvas.height=32;const dctx=dotCanvas.getContext('2d'),gradient=dctx.createRadialGradient(16,16,0,16,16,16);gradient.addColorStop(0,'rgba(255,255,255,.9)');gradient.addColorStop(.25,'rgba(255,255,255,.5)');gradient.addColorStop(1,'rgba(255,255,255,0)');dctx.fillStyle=gradient;dctx.fillRect(0,0,32,32);const dotTexture=new T.CanvasTexture(dotCanvas);
    const dustMat=new T.PointsMaterial({color:0xc7ad89,size:.025,map:dotTexture,transparent:true,opacity:0,depthWrite:false});const dust=new T.Points(dustG,dustMat);dust.frustumCulled=false;scene.add(dust);
    const flowPositions=new Float32Array(60*3),flowG=new T.BufferGeometry();flowG.setAttribute('position',new T.BufferAttribute(flowPositions,3));
    const flowMat=new T.PointsMaterial({color:0x36c4b2,size:.024,map:dotTexture,transparent:true,opacity:0,depthWrite:false}),flow=new T.Points(flowG,flowMat);flow.frustumCulled=false;scene.add(flow);let flowLevel=0,flowActive=false;
    let orbit={az:-.50,el:.23,radius:5.45,tx:0,ty:1.40,tz:.52},goal={...orbit};
    let pose={x:0,y:1.72,z:.012,service:0,cutaway:0},lastPose={...pose},running=false;
    function setView(name){view=name;
      if(name==='front')goal={az:0,el:.12,radius:5.3,tx:0,ty:1.35,tz:.45};
      else if(name==='side')goal={az:1.12,el:.19,radius:4.55,tx:0,ty:1.28,tz:.58};
      else if(name==='head')goal={az:-1.22,el:.56,radius:1.4,tx:pose.x,ty:pose.y,tz:pose.z+.25};
      else if(name==='surface'){const c=data.tab==='care'?{x:0,y:1.59}:sampleCenters[data.selected||0];goal={az:-.18,el:.08,radius:data.tab==='care'?3.8:2.05,tx:c.x,ty:c.y,tz:.08};}
      else if(name==='dust')goal={az:.65,el:.38,radius:2.35,tx:.36,ty:.6,tz:1.08};
      else goal={az:-.50,el:.23,radius:data.tab==='care'?4.25:5.45,tx:0,ty:data.tab==='care'?1.35:1.40,tz:.52};
      if(media.matches)orbit={...goal};callbacks.onViewChange?.(name);request();
    }
    function paintWall(){
      const isSurface=data.tab==='surface',isCare=data.tab==='care',lit=isCare?data.raking:data.light;
      const key=JSON.stringify([data.tab,data.patches,data.selected,lit,data.sanding?Math.floor(data.sanding.elapsed*8):null]);if(key===textureKey)return;textureKey=key;
      ctx.clearRect(0,0,1200,720);
      if(isSurface||isCare){
        const ps=isCare?[{rough:.04,scratch:.05,damage:0},{rough:.1,scratch:.86,damage:0},{rough:.35,scratch:.1,damage:0}]:data.patches||[];
        ps.forEach((input,i)=>{let p=input;
          if(isSurface&&data.sanding?.index===i&&typeof Game!=='undefined'){const t=clamp(data.sanding.elapsed/2.8,0,1),after=Game.abrade(input,data.sanding);p={...input,rough:input.rough+(after.rough-input.rough)*t,scratch:input.scratch+(after.scratch-input.scratch)*t,damage:input.damage+(after.damage-input.damage)*t};}const cx=240+(i%3)*360,cy=isCare?360:i<3?190:525,w=318,h=255;
          ctx.fillStyle='#f2eee4';ctx.fillRect(cx-w/2,cy-h/2,w,h);ctx.strokeStyle=isSurface&&i===data.selected?'#5688ad':'#d1d0c8';ctx.lineWidth=isSurface&&i===data.selected?5:2;ctx.strokeRect(cx-w/2,cy-h/2,w,h);
          ctx.save();ctx.beginPath();ctx.rect(cx-w/2+3,cy-h/2+3,w-6,h-6);ctx.clip();
          for(let j=0;j<34;j++){const x=cx-w/2+10+(j*67+i*19)%295,y=cy-h/2+10+(j*43)%231;ctx.strokeStyle=`rgba(113,112,102,${p.rough*(lit?.44:.22)})`;ctx.lineWidth=2+j%3;ctx.beginPath();ctx.moveTo(x-12,y);ctx.bezierCurveTo(x,y-7,x+15,y+9,x+29,y-1);ctx.stroke();}
          for(let j=0;j<12;j++){const x=cx-97+(j*47)%185,y=cy-65+(j*29)%132;ctx.strokeStyle=`rgba(100,104,101,${p.scratch*(lit?.88:.5)})`;ctx.lineWidth=1.5;for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(x,y,31+k*3,27+k*3,j*.3,.2,4.1);ctx.stroke();}}
          if(p.damage>.2){const g=ctx.createRadialGradient(cx,cy,18,cx,cy,75);g.addColorStop(0,'#ac9980');g.addColorStop(.7,'#c7b69d');g.addColorStop(1,'#ded2bc00');ctx.fillStyle=g;ctx.fillRect(cx-80,cy-80,160,160);}
          if(isCare&&i===2){ctx.fillStyle='#b9b5a8';ctx.fillRect(cx-w/2,cy-h/2,28,h);}
          ctx.restore();ctx.font='500 19px sans-serif';ctx.fillStyle='#6b7e87';ctx.fillText(String.fromCharCode(65+i),cx-w/2+9,cy-h/2+27);
        });
      }
      wallTexture.needsUpdate=true;
    }
    function desiredPose(){
      const tab=data.tab||'force';let p={x:0,y:1.72,z:.012,service:exploded?1:0,cutaway:tab==='dust'?1:0};
      if(tab==='force'){
        // Contact point moves with the wall; normal actuator extension is passed separately.
        p.z=.08+(data.bump||0)*.008;const gap=typeof M!=='undefined'?M.contact(data.bump||0,data.retreat||0,data.target||20).gap:0;p.z+=gap*.008;
        if(demo&&!data.locked&&!exploded){p.x=Math.sin(elapsed*.65)*.25;p.y+=Math.cos(elapsed*.65)*.16;}
      }else if(tab==='surface'){
        const c=sampleCenters[data.sanding?.index??data.selected??0];p.x=c.x;p.y=c.y;
        if(data.light&&!data.sanding){p.x+=.35;p.y-=.27;p.z=.48;}
        if(data.sanding){const t=clamp(data.sanding.elapsed/2.8,0,1);p.x+=data.sanding.dwell?0:-.28+.56*t;p.y+=data.sanding.dwell?0:Math.sin(t*Math.PI*2)*.10;}
      }else if(tab==='dust'){
        p.x=-.25;p.y=1.7;if(data.dustRunning){p.x+=Math.sin(elapsed*.65)*.3;p.y+=Math.cos(elapsed*.65)*.1;}if(data.isolated){p.z=.36;p.y=1.46;}
      }else{
        p.x=.2;p.y=1.68;
        if(data.care?.isolated){p.x=0;p.y=1.15;p.z=.48;p.service=exploded?1:0;p.cutaway=data.careLog?.includes('checkFilter')?1:0;}
        else if(data.care?.running&&demo){p.x+=Math.sin(elapsed*.65)*.2;p.y+=Math.cos(elapsed*.65)*.08;}
      }
      if(exploded){p.z=Math.max(.48,p.z);p.y=Math.max(1.45,p.y);}
      return p;
    }
    function updateObjects(dt){
      const tab=data.tab||'force',target=desiredPose(),k=media.matches?1:1-Math.exp(-dt*9);let moving=false;
      for(const n of Object.keys(pose)){const delta=target[n]-pose[n];if(Math.abs(delta)>.00005)moving=true;pose[n]+=delta*k;}
      if(tab==='force'&&!exploded)pose.z=target.z;
      const operating=!exploded&&(tab==='surface'?!!data.sanding:tab==='force'?demo&&!data.locked:tab==='dust'?(!!data.dustRunning||demo&&!data.isolated&&!data.trial&&!!data.dust?.power):demo&&!!data.care?.running);
      running=operating&&!media.matches;
      if(running)spin+=dt*10;
      const force=tab==='force'&&typeof M!=='undefined'?M.contact(data.bump||0,data.retreat||0,data.target||20).force:20;
      const dustState=tab==='dust'?data.dust:{connected:true,filterClean:true,bagReady:true,seal:true,power:tab==='care'?!data.care?.isolated:true};
      lastPose={...pose,spin,force,retreat:tab==='force'?data.retreat||0:0,bump:tab==='force'?data.bump||0:0,gap:tab==='force'&&typeof M!=='undefined'?M.contact(data.bump||0,data.retreat||0,data.target||20).gap:0,dust:dustState,isolated:tab==='care'?data.care?.isolated:data.isolated};
      robot.setPose(lastPose);
      bumpGroup.visible=tab==='force';bumpGroup.position.z=(data.bump||0)*.008+.0825;
      wallPlane.visible=tab==='surface'||tab==='care';
      contour.visible=(tab==='force'||!!data.sanding)&&!exploded;contour.position.set(pose.x,pose.y,pose.z+.001);contour.material.color.setHex(force>28?0xe5a14b:0x51a59b);
      ruler.visible=tab==='care'&&!!data.ruler;
      const isLit=(tab==='surface'&&data.light)||(tab==='care'&&data.raking);raking.intensity=isLit?18:0;lampFace.material=isLit?mats.orange:mats.white;
      if(view==='surface'&&tab==='surface'){const c=sampleCenters[data.selected||0];goal.tx=c.x;goal.ty=c.y;}
      if(view==='head'){goal.tx=pose.x;goal.ty=pose.y;goal.tz=pose.z+.25;goal.radius=exploded?1.7:1.4;}
      const fault=tab==='dust'&&(!data.dust?.connected||!data.dust?.filterClean||!data.dust?.bagReady||!data.dust?.seal);
      // A fault view shows a small residual cloud at the tool, with no restart implied.
      const source=running||demo&&tab==='dust'&&!data.isolated&&!data.trial;
      const dustTarget=source&&!exploded?1:0;particleLevel+=(dustTarget-particleLevel)*(media.matches?1:1-Math.exp(-dt*5));
      dust.visible=particleLevel>.002;dustMat.opacity=particleLevel*(fault?.62:.34);dustMat.color.setHex(fault?0xbca17c:0x9fcfc7);
      if(dust.visible){for(let i=0;i<particleCount;i++){const t=(i*.618033+elapsed*.36)%1,a=i*2.4;
        const radius=fault?.11+t*.29:.14*(1-t);dustPositions[i*3]=pose.x+Math.cos(a)*radius;dustPositions[i*3+1]=pose.y+Math.sin(a)*radius-(fault?t*.11:0);dustPositions[i*3+2]=pose.z+.02+(fault?t*.25:t*.1);
      }dustG.attributes.position.needsUpdate=true;}
      const flowTarget=tab==='dust'&&!data.isolated&&data.dust?.power&&data.dust?.connected&&data.dust?.bagReady&&(demo||data.trial||data.dustRunning)?(fault?.22:1):0;
      flowLevel+=(flowTarget-flowLevel)*(media.matches?1:1-Math.exp(-dt*5));flowMat.opacity=flowLevel*.85;flow.visible=flowLevel>.002;flowActive=flow.visible;
      if(flow.visible){const route=robot.getHoseCurve();for(let i=0;i<60;i++){const t=(i/60+elapsed*(fault?.10:.23))%1,p=route.getPointAt(t);flowPositions[i*3]=p.x;flowPositions[i*3+1]=p.y;flowPositions[i*3+2]=p.z;}flowG.attributes.position.needsUpdate=true;}
      return moving||Math.abs(dustTarget-particleLevel)>.002||Math.abs(flowTarget-flowLevel)>.002;
    }
    function applyCamera(){camera.position.set(orbit.tx+Math.sin(orbit.az)*Math.cos(orbit.el)*orbit.radius,orbit.ty+Math.sin(orbit.el)*orbit.radius,orbit.tz+Math.cos(orbit.az)*Math.cos(orbit.el)*orbit.radius);camera.lookAt(orbit.tx,orbit.ty,orbit.tz);}
    function frame(now){raf=0;if(destroyed||!visible||document.hidden)return;const dt=Math.min(.05,lastTime?(now-lastTime)/1000:.016);lastTime=now;
      if(!media.matches)elapsed+=dt;let easing=false;
      for(const key of Object.keys(orbit)){const diff=goal[key]-orbit[key];if(Math.abs(diff)>.0001){orbit[key]+=diff*(media.matches?1:1-Math.exp(-dt*9));easing=true;}else orbit[key]=goal[key];}
      const moving=updateObjects(dt);paintWall();applyCamera();renderer.render(scene,camera);frameCount++;dirty=false;
      if(!media.matches&&(running||easing||moving||flowActive))request();
    }
    function request(){dirty=true;if(!raf&&!destroyed&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
    let activeTab='';
    function update(next){data=next;if(activeTab!==data.tab){activeTab=data.tab;exploded=false;setView(data.tab==='dust'?'dust':'overview');}request();}
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(36*Math.PI/360)*Math.max(1,1.7/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();request();}
    function setTheme(value){theme=value;const dark=value==='dark';hemi.intensity=dark?1.2:2.15;sun.intensity=dark?1.7:3;fill.intensity=dark?.9:1.4;renderer.toneMappingExposure=dark?.95:1.15;request();}
    const raycaster=new T.Raycaster();
    function pick(e){if(data.tab!=='surface')return;const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObject(wallPlane)[0];if(!hit)return;const q=sampleCenters.map((c,i)=>({i,d:Math.hypot(c.x-hit.point.x,c.y-hit.point.y)})).sort((a,b)=>a.d-b.d)[0];if(q.d<.5)callbacks.onSamplePick?.(q.i);}
    const pointers=new Map();let start=null,pinch=0;
    const down=e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start={x:e.clientX,y:e.clientY,moved:false};};
    const move=e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(start&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>4)start.moved=true;
      if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinch)goal.radius=clamp(goal.radius*pinch/d,.8,9);pinch=d;}else{goal.az=clamp(goal.az-(e.clientX-prev.x)*.006,-1.36,1.36);goal.el=clamp(goal.el+(e.clientY-prev.y)*.004,.02,1.2);}view='free';request();};
    const up=e=>{if(pointers.size===1&&start&&!start.moved)pick(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);pinch=0;if(!pointers.size)start=null;};
    const wheel=e=>{e.preventDefault();goal.radius=clamp(goal.radius*Math.exp(e.deltaY*.0008),.8,9);request();};
    const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')goal.az=clamp(goal.az-.12,-1.36,1.36);if(e.key==='ArrowRight')goal.az=clamp(goal.az+.12,-1.36,1.36);if(e.key==='ArrowUp')goal.el=clamp(goal.el+.08,.02,1.2);if(e.key==='ArrowDown')goal.el=clamp(goal.el-.08,.02,1.2);if(e.key==='+'||e.key==='=')goal.radius=clamp(goal.radius*.9,.8,9);if(e.key==='-')goal.radius=clamp(goal.radius/.9,.8,9);if(e.key==='Home')setView('overview');else view='free';request();};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
    const lose=e=>{e.preventDefault();destroyed=true;cancelAnimationFrame(raf);const n=document.createElement('p');n.className='scene-notice';n.textContent='三维显示已暂停，刷新后可恢复。操作与实训记录仍保留。';host.appendChild(n);callbacks.onContextLost?.();};canvas.addEventListener('webglcontextlost',lose);
    const ro=new ResizeObserver(resize);ro.observe(host);const io=new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;lastTime=0;if(visible)request();else{cancelAnimationFrame(raf);raf=0;}},{threshold:.01});io.observe(host);
    const visibility=()=>{lastTime=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else request();};document.addEventListener('visibilitychange',visibility);const reduce=()=>{lastTime=0;request();};media.addEventListener('change',reduce);
    resize();setTheme(document.body.dataset.theme||'light');request();
    return {update,setView,setTheme,resize,setCamera(values){goal={...goal,...values};view='free';request();},setDemo(v){demo=!!v;request();},setExploded(v){exploded=!!v;if(exploded)setView('head');request();},getStats(){const robotStats=robot.getStats();return{webgl:true,frameCount,meshCount:physicalCount(),camera:{...orbit,position:camera.position.toArray()},view,toolPosition:[pose.x,pose.y,pose.z],lastPose:{...lastPose},running,reduced:media.matches,visible,demo,exploded,robot:robotStats,hose:robotStats.hose,renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,canvas:{width:canvas.width,height:canvas.height}};},destroy(){destroyed=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',reduce);robot.dispose();const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());wallTexture.dispose();dotTexture.dispose();renderer.dispose();canvas.remove();}};
  };
  function fallback(host,callbacks){
    let data={},view='overview',demo=false,exploded=false;host.classList.add('fallback-mode');
    host.innerHTML='<div class="fallback-sheet"><span>二维备用视图 · 三维暂不可用</span><svg viewBox="0 0 800 430" role="img" aria-label="打磨机构备用示意"><rect x="80" y="30" width="620" height="355" rx="5" fill="#eeeae0" stroke="#c2cacc"/><path d="M50 385H750" stroke="#b7c7cd" stroke-width="7"/><g id="fallbackArm"><rect x="340" y="319" width="160" height="55" rx="18" fill="#2672b9"/><circle cx="370" cy="375" r="17" fill="#293c4a"/><circle cx="465" cy="375" r="17" fill="#293c4a"/><path id="fallbackLink" d="M410 318L465 205L350 143" fill="none" stroke="#2672b9" stroke-width="32" stroke-linecap="round"/><circle cx="465" cy="205" r="20" fill="#c2d3da"/><g id="fallbackHead"><circle r="38" fill="#d6dde0" stroke="#efac5b" stroke-width="7"/><circle r="26" fill="#839ca9"/><circle r="7" fill="#e2e7e6"/></g></g></svg><p>可继续完成四项操作；试片与读数仍由同一教学模型驱动。</p></div>';
    function draw(){const h=host.querySelector('#fallbackHead'),c=data.tab==='surface'?{x:220+(data.selected%3)*170,y:110+Math.floor(data.selected/3)*105}:{x:350,y:143};h.setAttribute('transform',`translate(${c.x} ${c.y})`);host.querySelector('#fallbackLink').setAttribute('d',`M410 318L465 205L${c.x} ${c.y}`);}
    return {update(next){data=next;draw();},setView(v){view=v;},setTheme(){},resize(){},setDemo(v){demo=v;},setExploded(v){exploded=v;},getStats(){return{webgl:false,frameCount:0,meshCount:0,view,demo,exploded,running:false,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,visible:true};},destroy(){host.innerHTML='';}};
  }
})();
