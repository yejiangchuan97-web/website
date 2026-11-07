/* Inspection Hero: a physical training facade, Z up, metres. Local Three.js r160. */
(function () {
  'use strict';
  const CELLS = [
    {id:'A1',x:3.4,z:6.4},{id:'A2',x:0,z:6.4},{id:'A3',x:-3.4,z:6.4},
    {id:'B1',x:3.4,z:3.1},{id:'B2',x:0,z:3.1},{id:'B3',x:-3.4,z:3.1}
  ];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=(x,fallback)=>Number.isFinite(+x)?+x:fallback;
  const defaults={selected:'A1',distance:6,angle:0,speed:1,shutter:500,captured:[],reviewed:[],flying:false};
  const includes=(list,id)=>Array.isArray(list)?list.some(x=>(typeof x==='string'?x:x?.id||x?.cellId)===id):!!list?.[id];
  window.createInspectionScene=function(host,options={}) {
    if(!host)throw new Error('Inspection scene needs a host element.');
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');
    let state={...defaults},theme='light',disposed=false,visible=true;
    host.style.position='relative';host.style.overflow='hidden';
    if(!host.style.minHeight)host.style.minHeight='360px';
    let renderer;
    try {
      if(new URLSearchParams(location.search).get('no-webgl')==='1'||!window.THREE)throw new Error('SVG mode');
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    } catch(e) { return makeFallback(); }
    const T=THREE,V=a=>new T.Vector3(...a),UP=V([0,0,1]);
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
    const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label','三维无人机巡检场景。拖动旋转，滚轮缩放，方向键调整视角，Home 恢复。检查区块也可通过下方按钮选择。');
    canvas.style.cssText='display:block;width:100%;height:100%;outline-offset:-4px;touch-action:pan-y;cursor:grab';host.append(canvas);
    const scene=new T.Scene(),world=new T.Group();scene.add(world);
    const camera=new T.PerspectiveCamera(35,1,.1,120);camera.up.copy(UP);
    const geometries=new Map(),materials=[],physical=[];
    const material=(color,roughness=.7,metalness=.04)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m;};
    const mat={
      base:material('#ddd9d1'),top:material('#eeebe5'),wall:material('#d7d5cf'),panel:material('#e5e2dc'),
      trim:material('#8c9799',.44,.42),steel:material('#b5bec0',.4,.55),dark:material('#29373b',.53,.2),
      glass:material('#586f73',.3,.26),shell:material('#faf9f5',.42,.14),rubber:material('#3e4647',.92,0),
      accent:material('#e57540',.42,.15),ground:material('#f0ede7',.96,0),seam:material('#a6a9a5',.8,.02)
    };
    const ambient=new T.HemisphereLight(0xfffbef,0x818b91,2.3);ambient.position.set(0,0,20);scene.add(ambient);
    const key=new T.DirectionalLight(0xfff7e9,3.4);key.position.set(-7,12,18);key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-15,right:15,top:17,bottom:-14,near:.5,far:55});
    key.shadow.mapSize.set(1536,1536);key.shadow.bias=-.00025;key.shadow.normalBias=.035;scene.add(key);
    const fill=new T.DirectionalLight(0xe7efff,.9);fill.position.set(9,-6,10);scene.add(fill);
    const group=(parent,pos=[0,0,0],name='')=>{const g=new T.Group();g.name=name;g.position.copy(V(pos));parent.add(g);return g;};
    const cached=(key,create)=>{if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);};
    const add=(parent,geometry,m,p=[0,0,0],name='part',count=true)=>{
      const mesh=new T.Mesh(geometry,m);mesh.position.copy(V(p));mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
      if(count)physical.push(mesh);return mesh;
    };
    function box(parent,w,d,h,p,m=mat.panel,r=.025,name='panel') {
      r=Math.min(r,w/5,d/5,h/5);
      const geo=cached(`b/${w}/${d}/${h}/${r}`,()=>{
        if(r<.003)return new T.BoxGeometry(w,d,h);
        const s=new T.Shape(),l=-w/2+r,b=-d/2+r,W=w-2*r,D=d-2*r,q=Math.min(r,W/3,D/3);
        s.moveTo(l+q,b);s.lineTo(l+W-q,b);s.quadraticCurveTo(l+W,b,l+W,b+q);s.lineTo(l+W,b+D-q);
        s.quadraticCurveTo(l+W,b+D,l+W-q,b+D);s.lineTo(l+q,b+D);s.quadraticCurveTo(l,b+D,l,b+D-q);
        s.lineTo(l,b+q);s.quadraticCurveTo(l,b,l+q,b);
        const g=new T.ExtrudeGeometry(s,{depth:h-2*r,steps:1,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,curveSegments:4});g.translate(0,0,-h/2+r);return g;
      });return add(parent,geo,m,p,name);
    }
    function cyl(parent,r,h,p,m=mat.steel,axis='z',name='fastener',segments=24) {
      const mesh=add(parent,cached(`c/${r}/${h}/${segments}`,()=>new T.CylinderGeometry(r,r,h,segments)),m,p,name);
      if(axis==='z')mesh.rotation.x=Math.PI/2;else if(axis==='x')mesh.rotation.z=Math.PI/2;return mesh;
    }
    function rod(parent,a,b,r,m=mat.steel,name='support') {
      const d=V(b).sub(V(a)),mesh=add(parent,cached('rod/'+r,()=>new T.CylinderGeometry(r,r,1,16)),m,V(a).add(V(b)).multiplyScalar(.5).toArray(),name);
      mesh.quaternion.setFromUnitVectors(V([0,1,0]),d.clone().normalize());mesh.scale.y=d.length();return mesh;
    }
    function ring(parent,r,t,p,m=mat.steel,axis='z',name='ring') {
      const mesh=add(parent,cached(`r/${r}/${t}`,()=>new T.TorusGeometry(r,t,8,40)),m,p,name);
      if(axis==='y')mesh.rotation.x=Math.PI/2;else if(axis==='x')mesh.rotation.y=Math.PI/2;return mesh;
    }
    function line(parent,points,color=0x8f999a,opacity=.7,closed=false) {
      const geometry=new T.BufferGeometry().setFromPoints(points.map(V)),m=new T.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false});
      materials.push(m);const o=closed?new T.LineLoop(geometry,m):new T.Line(geometry,m);parent.add(o);return o;
    }
    function faceRect(parent,x,z,w,h,y,color,opacity=.75) {
      return line(parent,[[x-w/2,y,z-h/2],[x+w/2,y,z-h/2],[x+w/2,y,z+h/2],[x-w/2,y,z+h/2]],color,opacity,true);
    }
    // A substantial footing supports the facade, while the flight area remains open.
    box(world,16,14.4,.40,[0,4.8,-.23],mat.base,.12,'training.base');
    box(world,15.8,14.2,.045,[0,4.8,-.007],mat.top,.016,'training.top');
    for(const x of [-4,0,4])line(world,[[x,-2.25,.018],[x,11.85,.018]],0xaeb4af,.25);
    for(const y of [1.25,4.8,8.35])line(world,[[-7.85,y,.018],[7.85,y,.018]],0xaeb4af,.25);
    for(const x of [-7.2,7.2])for(const y of [-1.6,11.2]){
      cyl(world,.28,.20,[x,y,-.52],mat.rubber,'z','training.foot');cyl(world,.085,.028,[x,y,.031],mat.steel,'z','training.corner-bolt',6);
    }
    box(world,11.6,2.0,.30,[0,-.57,.16],mat.wall,.045,'foundation');
    box(world,11.15,.55,.42,[0,-.26,.5],mat.seam,.015,'plinth');
    box(world,11.15,.22,7.85,[0,-.62,4.54],mat.wall,.02,'facade.backing');
    for(const x of [-5.48,5.48])box(world,.23,.85,7.92,[x,-.30,4.53],mat.panel,.02,'side.column');
    for(const z of [.75,4.47,7.82])box(world,11.15,1.14,.19,[0,-.27,z],mat.wall,.02,'slab.edge');
    box(world,11.45,1.55,.20,[0,-.32,8.45],mat.panel,.05,'roof.coping');
    box(world,11.1,.55,.49,[0,-.20,8.12],mat.wall,.018,'parapet');
    const hits=[],cellObjects={};
    for(const cell of CELLS){
      const x=cell.x,z=cell.z,g=group(world,[x,0,z],cell.id),ww=1.78,wh=1.40,wx=.35,wz=.45;
      // Window openings are constructed from surrounding solids, with glass behind the front plane.
      box(g,3.32,.43,1.13,[0,-.215,-.895],mat.panel,.015,cell.id+'.spandrel');
      box(g,3.32,.43,.24,[0,-.215,1.35],mat.panel,.015,cell.id+'.lintel');
      box(g,1.04,.43,1.56,[-1.14,-.215,.45],mat.panel,.012,cell.id+'.left-pier');
      box(g,.34,.43,1.56,[1.49,-.215,.45],mat.panel,.012,cell.id+'.right-pier');
      box(g,ww+.16,.09,wh+.16,[wx,-.25,wz],mat.dark,.012,cell.id+'.reveal');
      const glass=box(g,ww-.10,.025,wh-.10,[wx,-.186,wz],mat.glass,.008,cell.id+'.glass');
      // Four frame edges and a mullion have an actual thickness and terminate at their frame.
      for(const side of [-1,1]){
        box(g,.075,.115,wh+.14,[wx+side*(ww/2+.015),-.115,wz],mat.trim,.008,cell.id+'.frame-post');
        box(g,ww+.11,.115,.075,[wx,-.115,wz+side*(wh/2+.015)],mat.trim,.008,cell.id+'.frame-rail');
      }
      box(g,.045,.07,wh,[wx,-.07,wz],mat.steel,.005,cell.id+'.mullion');
      box(g,ww+.28,.58,.095,[wx,-.03,wz-wh/2-.075],mat.panel,.015,cell.id+'.sill');
      for(const sx of [-1,1])for(const sz of [-1,1])cyl(g,.018,.013,[wx+sx*(ww/2+.015),-.052,wz+sz*(wh/2-.04)],mat.steel,'y',cell.id+'.frame-bolt',8);
      const outline=faceRect(world,x,z,3.25,3.04,.035,0xe57540,.95);outline.visible=false;
      const badge=cyl(g,.095,.018,[-1.37,.018,-1.21],mat.seam,'y',cell.id+'.inspection-disc');
      const activeMat=new T.MeshBasicMaterial({color:0xe57540,transparent:true,opacity:.09,depthWrite:false,side:T.DoubleSide});materials.push(activeMat);
      const hit=add(g,new T.PlaneGeometry(3.29,3.08),activeMat,[0,.045,0],cell.id+'.hit',false);hit.rotation.x=Math.PI/2;hit.userData.cell=cell.id;hit.castShadow=hit.receiveShadow=false;hits.push(hit);
      cellObjects[cell.id]={outline,badge,hit,glass};
      // Fine actual joints span to panel edges, so they remain legible at 4x.
      faceRect(g,0,-.895,3.22,1.03,.008,0xc7c9c4,.5);
    }
    function surfaceMark(cellId,points,color,opacity=1){
      const cell=CELLS.find(c=>c.id===cellId),shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();
      const m=new T.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:T.DoubleSide,depthWrite:false});materials.push(m);
      const mesh=add(world,new T.ShapeGeometry(shape),m,[cell.x,.021,cell.z],cellId+'.surface-evidence');mesh.rotation.x=Math.PI/2;mesh.castShadow=mesh.receiveShadow=false;return mesh;
    }
    // Authored surface features match the six teaching photo cases; they are not inference output.
    surfaceMark('A1',[[-.70,-.34],[-.58,-.60],[-.64,-.79],[-.49,-.96],[-.53,-1.20],[-.43,-1.42],[-.45,-1.18],[-.44,-.95],[-.60,-.77],[-.55,-.60],[-.68,-.34]],0x5b605b,.84);
    surfaceMark('A2',[[-.10,-.34],[.65,-.34],[.59,-.56],[.71,-.69],[.50,-.99],[.20,-1.14],[.09,-.91],[-.08,-.75]],0x6c7970,.28);
    surfaceMark('A3',[[-.89,-.34],[-.87,-.34],[-.87,-1.46],[-.89,-1.46]],0x737a73,.85);
    surfaceMark('B1',[[-.66,-.35],[1.34,-.35],[1.12,-.57],[-.89,-.57]],0x485753,.19);
    surfaceMark('B2',[[-.38,-.55],[-.06,-.43],[.20,-.59],[.28,-.85],[.06,-1.12],[-.26,-1.02],[-.49,-.79]],0x88908a,.84);
    surfaceMark('B2',[[-.31,-.59],[-.05,-.51],[.15,-.65],[.18,-.84],[.01,-1.01],[-.22,-.91],[-.37,-.77]],0xafb3a9,.95);
    surfaceMark('B3',[[-1.05,-.56],[-.97,-.70],[-1.04,-.91],[-.94,-1.08],[-.98,-1.35],[-.92,-1.08],[-1.01,-.91],[-.94,-.70],[-1.03,-.56]],0x636d64,.65);
    // The downpipe sits beside the end panel; collars have a real radial gap around it.
    cyl(world,.075,7.12,[5.68,.15,4.25],mat.trim,'z','drain.vertical');
    cyl(world,.11,.23,[5.68,.15,7.87],mat.trim,'z','drain.hopper');
    const curve=new T.QuadraticBezierCurve3(V([5.68,.15,.69]),V([5.68,.15,.39]),V([5.68,.47,.39]));
    add(world,new T.TubeGeometry(curve,12,.075,12,false),mat.trim,[0,0,0],'drain.elbow');
    for(const z of [1.8,6.7]){ring(world,.09,.023,[5.68,.15,z],mat.dark,'z','drain.collar');box(world,.16,.30,.045,[5.68,-.02,z],mat.trim,.006,'drain.bracket');}
    // A raised landing mat and a hard case make the figure read as a working site.
    cyl(world,1.08,.027,[-4.9,8.6,.036],mat.seam,'z','landing.pad',64);
    ring(world,.86,.015,[-4.9,8.6,.055],mat.top,'z','landing.ring');
    for(const x of [-5.2,-4.6])box(world,.07,.70,.009,[x,8.6,.058],mat.top,.003,'landing.mark');
    box(world,.60,.07,.009,[-4.9,8.6,.058],mat.top,.003,'landing.crossbar');
    const kit=group(world,[4.9,8.8,.36],'equipment');kit.rotation.z=-.12;
    box(kit,1.48,.88,.58,[0,0,0],mat.dark,.08,'case.body');box(kit,1.49,.89,.13,[0,0,.35],mat.trim,.04,'case.lid');
    for(const x of [-.49,.49])box(kit,.10,.08,.18,[x,.47,.22],mat.steel,.012,'case.latch');
    for(const x of [-.68,.68])for(const y of [-.37,.37])box(kit,.15,.16,.38,[x,y,-.08],mat.rubber,.035,'case.corner');
    rod(kit,[-.25,.49,.02],[-.25,.59,.02],.036,mat.steel,'case.handle-foot');rod(kit,[.25,.49,.02],[.25,.59,.02],.036,mat.steel,'case.handle-foot');
    rod(kit,[-.25,.59,.02],[.25,.59,.02],.044,mat.dark,'case.handle');
    box(kit,1.15,.07,.07,[0,-.45,.26],mat.steel,.012,'case.hinge');
    // Drone origin is the centre of the lens front, so the numeric camera pose is exact.
    const drone=group(world,[0,6,6.4],'uav'),body=group(drone,[0,.28,.54],'airframe'),propellers=[];
    box(body,.62,.91,.20,[0,0,0],mat.dark,.06,'uav.lower-shell');
    box(body,.66,.88,.16,[0,0,.14],mat.shell,.07,'uav.upper-shell');
    box(body,.42,.53,.10,[0,.10,.25],mat.seam,.035,'uav.battery');
    for(const x of [-.26,.26])box(body,.075,.17,.04,[x,.12,.22],mat.dark,.012,'uav.battery-latch');
    for(let i=0;i<5;i++)box(body,.038,.18,.012,[-.12+i*.06,-.20,.228],mat.trim,.004,'uav.vent');
    for(const x of [-.23,.23])for(const y of [-.32,.32])cyl(body,.025,.016,[x,y,.224],mat.trim,'z','uav.shell-fastener',6);
    const rotorCenters=[];
    for(const sx of [-1,1])for(const sy of [-1,1]){
      const end=[sx*.86,sy*.72,.095],start=[sx*.27,sy*.26,.04];
      const arm=rod(body,start,end,.085,mat.trim,'uav.arm');
      cyl(body,.12,.14,start,mat.dark,'z','uav.arm-mount');
      cyl(body,.13,.22,end,mat.dark,'z','uav.motor');
      cyl(body,.133,.035,[end[0],end[1],end[2]+.125],mat.steel,'z','uav.motor-cap');
      const spin=group(body,[end[0],end[1],end[2]+.175],'uav.rotor');spin.rotation.z=sx*sy*.45;
      cyl(spin,.075,.055,[0,0,0],mat.trim,'z','uav.hub');
      const bladeShape=new T.Shape();bladeShape.moveTo(-.54,-.035);bladeShape.quadraticCurveTo(-.34,-.11,-.09,-.05);bladeShape.lineTo(.13,-.027);bladeShape.quadraticCurveTo(.42,-.03,.54,.035);bladeShape.quadraticCurveTo(.30,.12,.08,.046);bladeShape.lineTo(-.13,.029);bladeShape.quadraticCurveTo(-.41,.032,-.54,-.035);
      const bladeGeo=cached('propeller',()=>new T.ExtrudeGeometry(bladeShape,{depth:.018,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:1,curveSegments:12}));
      add(spin,bladeGeo,mat.dark,[0,0,.01],'uav.propeller');cyl(spin,.036,.028,[0,0,.054],mat.steel,'z','uav.rotor-nut',6);
      propellers.push({g:spin,direction:sx*sy});rotorCenters.push(end);
    }
    // Landing legs and skids sit below the body, avoiding the camera's field of view.
    for(const x of [-.39,.39]){
      rod(body,[x*.70,-.21,-.06],[x,-.29,-.48],.028,mat.steel,'uav.landing-leg');
      rod(body,[x*.70,.29,-.06],[x,.36,-.48],.028,mat.steel,'uav.landing-leg');
      rod(body,[x,-.48,-.48],[x,.53,-.48],.032,mat.dark,'uav.skid');
    }
    box(drone,.29,.30,.065,[0,.19,.38],mat.dark,.018,'gimbal.damper-plate');
    for(const x of [-.10,.10])cyl(drone,.037,.075,[x,.19,.44],mat.rubber,'z','gimbal.damper');
    cyl(drone,.073,.12,[0,.17,.29],mat.steel,'z','gimbal.yaw');
    for(const x of [-.16,.16])box(drone,.045,.15,.22,[x,.12,.15],mat.trim,.013,'gimbal.fork');
    cyl(drone,.05,.38,[0,.12,.12],mat.dark,'x','gimbal.pitch');
    box(drone,.27,.23,.22,[0,.10,.04],mat.dark,.04,'camera.body');
    cyl(drone,.105,.13,[0,-.055,.04],mat.trim,'y','camera.barrel');
    ring(drone,.095,.013,[0,-.126,.04],mat.accent,'y','camera.rim');
    cyl(drone,.079,.009,[0,-.131,.04],mat.glass,'y','camera.lens');
    // Shift the assembly so the optical centre is exactly at the state-defined origin.
    body.position.y+=.131;body.position.z-=.04;
    for(const child of drone.children){if(child!==body){child.position.y+=.131;child.position.z-=.04;}}
    const shadowPlane=add(scene,new T.PlaneGeometry(100,100),new T.ShadowMaterial({opacity:.12}),[0,0,-.635],'ground-shadow',false);shadowPlane.receiveShadow=true;shadowPlane.castShadow=false;materials.push(shadowPlane.material);
    const footprintMat=new T.MeshBasicMaterial({color:0xe57540,transparent:true,opacity:.10,side:T.DoubleSide,depthWrite:false});materials.push(footprintMat);
    const footprint=add(world,new T.BufferGeometry(),footprintMat,[0,0,0],'camera.footprint',false);footprint.castShadow=footprint.receiveShadow=false;footprint.frustumCulled=false;
    const cone=line(world,[],0xe57540,.25),footEdge=line(world,[],0xe57540,.55,true);cone.frustumCulled=footEdge.frustumCulled=false;
    const targetDot=cyl(world,.07,.015,[0,.06,6.4],mat.accent,'y','target.reticle');targetDot.castShadow=false;
    const droneGoal=drone.position.clone();let droneYawGoal=0,inTransit=false;
    let pose={azimuth:1.02,elevation:.49,radius:39,target:[0,3.0,1.8]},goal={...pose,target:[...pose.target]},view='iso';
    let animation=0,last=0,moving=false,needsRender=true,activePointer=null;
    const raycaster=new T.Raycaster(),pointer=new T.Vector2();
    function cameraPose(){
      const c=Math.cos(pose.elevation);camera.position.set(pose.target[0]+Math.cos(pose.azimuth)*c*pose.radius,pose.target[1]+Math.sin(pose.azimuth)*c*pose.radius,pose.target[2]+Math.sin(pose.elevation)*pose.radius);
      camera.lookAt(...pose.target);
    }
    function pick(event){const r=canvas.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(hits,false)[0];if(hit)options.onSelect?.(hit.object.userData.cell);}
    function onDown(e){if(e.button!==0)return;activePointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,drag:false};canvas.setPointerCapture?.(e.pointerId);}
    function onMove(e){if(!activePointer||activePointer.id!==e.pointerId)return;const dx=e.clientX-activePointer.x,dy=e.clientY-activePointer.y;
      if(Math.hypot(e.clientX-activePointer.startX,e.clientY-activePointer.startY)>5)activePointer.drag=true;
      if(activePointer.drag){view='orbit';goal.azimuth-=dx*.006;goal.elevation=clamp(goal.elevation+dy*.005,.12,1.15);requestRender();}
      activePointer.x=e.clientX;activePointer.y=e.clientY;
    }
    function onUp(e){if(activePointer?.id!==e.pointerId)return;if(!activePointer.drag)pick(e);activePointer=null;}
    function onWheel(e){e.preventDefault();goal.radius=clamp(goal.radius*Math.exp(e.deltaY*.001),2.5,45);view='orbit';requestRender();}
    function onKey(e){if(e.key==='Home'){e.preventDefault();setView('iso');return;}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();
      if(e.key==='ArrowLeft')goal.azimuth+=.12;if(e.key==='ArrowRight')goal.azimuth-=.12;if(e.key==='ArrowUp')goal.elevation=clamp(goal.elevation+.09,.12,1.15);if(e.key==='ArrowDown')goal.elevation=clamp(goal.elevation-.09,.12,1.15);if(e.key==='+')goal.radius=clamp(goal.radius-1,2.5,45);if(e.key==='-')goal.radius=clamp(goal.radius+1,2.5,45);view='orbit';requestRender();
    }
    canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',()=>{activePointer=null;});canvas.addEventListener('wheel',onWheel,{passive:false});host.addEventListener('keydown',onKey);
    function requestRender(){needsRender=true;if(!animation&&visible&&!document.hidden&&!disposed)animation=requestAnimationFrame(frame);}
    function frame(now){animation=0;if(disposed||!visible||document.hidden)return;const dt=Math.min(.05,(now-last)/1000||.016);last=now;const f=reduce.matches?1:1-Math.exp(-dt*9);let gap=0;
      for(const key of ['azimuth','elevation','radius']){pose[key]+=(goal[key]-pose[key])*f;gap+=Math.abs(goal[key]-pose[key]);}
      for(let i=0;i<3;i++){pose.target[i]+=(goal.target[i]-pose.target[i])*f;gap+=Math.abs(goal.target[i]-pose.target[i]);}
      const travelFollow=reduce.matches?1:1-Math.exp(-dt*5);drone.position.lerp(droneGoal,travelFollow);drone.rotation.z+=(droneYawGoal-drone.rotation.z)*travelFollow;
      inTransit=drone.position.distanceTo(droneGoal)>.025;cone.visible=view!=='drone'&&!inTransit;footprint.visible=footEdge.visible=!inTransit;
      cameraPose();moving=gap>.001;
      const rotate=!!state.flying&&!reduce.matches;
      if(rotate)for(const rotor of propellers)rotor.g.rotation.z+=dt*8*rotor.direction;
      if(needsRender||moving||rotate||inTransit){renderer.render(scene,camera);needsRender=false;}
      if(moving||rotate||inTransit)animation=requestAnimationFrame(frame);
    }
    // Clip the true pinhole camera footprint to the physical facade boundary.
    function clip(poly,axis,bound,greater){const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],ina=greater?a[axis]>=bound:a[axis]<=bound,inb=greater?b[axis]>=bound:b[axis]<=bound;if(ina)out.push(a);if(ina!==inb){const t=(bound-a[axis])/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}return out;}
    function update(next={}){
      state={...state,...next};if(!CELLS.some(c=>c.id===state.selected))state.selected='A1';
      state.distance=clamp(finite(state.distance,6),2,18);state.angle=clamp(finite(state.angle,0),-55,55);
      const cell=CELLS.find(c=>c.id===state.selected),a=state.angle*Math.PI/180,D=state.distance;
      const origin=[cell.x+D*Math.sin(a),D*Math.cos(a),cell.z];droneGoal.copy(V(origin));droneYawGoal=-a;
      if(!state.flying||reduce.matches){drone.position.copy(droneGoal);drone.rotation.z=droneYawGoal;}
      targetDot.position.set(cell.x,.061,cell.z);
      for(const c of CELLS){const o=cellObjects[c.id],selected=c.id===state.selected;o.outline.visible=selected;o.hit.material.opacity=selected?.055:0;o.badge.material=selected?mat.accent:includes(state.reviewed,c.id)?mat.dark:includes(state.captured,c.id)?mat.trim:mat.seam;}
      let poly=[];
      for(const [u,v] of [[-1,-1],[1,-1],[1,1],[-1,1]]){
        const dir=[-Math.sin(a)+u*.75*Math.cos(a),-Math.cos(a)-u*.75*Math.sin(a),v*.5];const t=-origin[1]/dir[1];poly.push([origin[0]+dir[0]*t,origin[2]+dir[2]*t]);
      }
      for(const [axis,bound,greater] of [[0,-5.5,true],[0,5.5,false],[1,.72,true],[1,8.42,false]])poly=clip(poly,axis,bound,greater);
      const facePoints=poly.map(p=>[p[0],.052,p[1]]),verts=[];
      for(let i=1;i<facePoints.length-1;i++)verts.push(...facePoints[0],...facePoints[i],...facePoints[i+1]);
      footprint.geometry.dispose();footprint.geometry=new T.BufferGeometry();footprint.geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));
      footEdge.geometry.dispose();footEdge.geometry=new T.BufferGeometry().setFromPoints(facePoints.map(V));
      const rays=[];for(const p of facePoints)rays.push(origin,p,origin);
      cone.geometry.dispose();cone.geometry=new T.BufferGeometry().setFromPoints(rays.map(V));
      if(view==='drone')setView('drone');requestRender();
    }
    function setView(name){view=name;const aspect=host.clientWidth/Math.max(host.clientHeight,1),extra=aspect<1.15?1.20:1;drone.visible=true;cone.visible=name!=='drone';camera.fov=35;camera.updateProjectionMatrix();
      if(name==='front')goal={azimuth:Math.PI/2,elevation:.12,radius:24*extra,target:[0,3.2,4.3]};
      else if(name==='drone'){const a=state.angle*Math.PI/180;goal={azimuth:-1.05-a,elevation:.40,radius:4.7*extra,target:[drone.position.x,drone.position.y+.2,drone.position.z+.35]};}
      else goal={azimuth:1.02,elevation:.49,radius:aspect<1.15?43:39,target:[0,3.0,1.8]};requestRender();
    }
    function resize(){if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(view==='iso')setView('iso');else requestRender();}
    function setTheme(next){theme=next==='dark'?'dark':'light';const dark=theme==='dark';
      const colors=dark?{base:'#30383a',top:'#485051',wall:'#88918f',panel:'#a7ada7',trim:'#67777c',steel:'#a8b5b7',dark:'#192328',glass:'#304c54',shell:'#e2e5df',rubber:'#20282a',ground:'#222b2d',seam:'#677472'}:{base:'#ddd9d1',top:'#eeebe5',wall:'#d7d5cf',panel:'#e5e2dc',trim:'#8c9799',steel:'#b5bec0',dark:'#29373b',glass:'#586f73',shell:'#faf9f5',rubber:'#3e4647',ground:'#f0ede7',seam:'#a6a9a5'};
      for(const [key,color] of Object.entries(colors))mat[key].color.set(color);ambient.intensity=dark?1.8:2.3;key.intensity=dark?3.0:3.4;shadowPlane.material.opacity=dark?.26:.12;requestRender();
    }
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestRender();else if(animation){cancelAnimationFrame(animation);animation=0;}},{threshold:0});observer.observe(host);
    const onVisible=()=>{if(!document.hidden)requestRender();else if(animation){cancelAnimationFrame(animation);animation=0;}};document.addEventListener('visibilitychange',onVisible);reduce.addEventListener?.('change',requestRender);
    function validate(){const errors=[];world.updateMatrixWorld(true);for(const o of physical){const p=o.geometry.attributes.position;if(!p||p.count<3)errors.push(o.name+': missing geometry');else for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i])){errors.push(o.name+': nonfinite vertex');break;}if(!o.matrixWorld.elements.every(Number.isFinite))errors.push(o.name+': nonfinite transform');}
      const clearance=Math.min(...rotorCenters.flatMap((a,i)=>rotorCenters.slice(i+1).map(b=>Math.hypot(a[0]-b[0],a[1]-b[1])-1.09)));
      if(clearance<0)errors.push('rotor swept discs overlap');return {ok:!errors.length,errors,physicalParts:physical.length,rotorClearanceM:+clearance.toFixed(3),cameraOrigin:drone.position.toArray(),worldUp:'Z'};
    }
    function stats(){return {renderer:'webgl',parts:physical.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,theme,selected:state.selected,view,visible,inTransit,animating:!!animation,validation:validate()};}
    function dispose(){disposed=true;cancelAnimationFrame(animation);resizeObserver.disconnect();observer.disconnect();document.removeEventListener('visibilitychange',onVisible);host.removeEventListener('keydown',onKey);reduce.removeEventListener?.('change',requestRender);scene.traverse(o=>{o.geometry?.dispose();});for(const m of materials)m.dispose();renderer.dispose();canvas.remove();}
    resize();update(state);setView('iso');return {update,setView,setTheme,resize,dispose,stats,validate};

    function makeFallback(){
      const wrapper=document.createElement('div');wrapper.style.cssText='width:100%;height:100%;min-height:360px;display:grid;place-items:center';host.append(wrapper);
      const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const P=([x,y,z])=>[380-x*28-y*12,390+x*5+y*8-z*29];
      const pts=points=>points.map(p=>P(p).map(v=>v.toFixed(2)).join(',')).join(' ');
      function draw(){
        const dark=theme==='dark',paper=dark?'#293337':'#eeeae3',panel=dark?'#9ba7a5':'#dddcd5',side=dark?'#626f72':'#b8c0bc',ink=dark?'#34464d':'#526a70',accent='#e57540';
        let s=`<svg viewBox="0 0 760 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="无人机巡检立体示意。可点击六个立面区块，采集与复核功能继续可用。" style="width:100%;height:100%;max-height:640px"><ellipse cx="360" cy="434" rx="288" ry="66" fill="${dark?'#10191c':'#c3c4bf'}" opacity=".22"/><polygon points="${pts([[-7,-2,0],[7,-2,0],[7,12,0],[-7,12,0]])}" fill="${paper}" stroke="${side}"/><polygon points="${pts([[-5.55,-.6,.5],[5.55,-.6,.5],[5.55,-.6,8.5],[-5.55,-.6,8.5]])}" fill="${side}"/>`;
        for(const cell of CELLS){const x=cell.x,z=cell.z,selected=cell.id===state.selected;
          s+=`<g tabindex="0" role="button" data-cell="${cell.id}" aria-label="选择 ${cell.id} 检查区块"><polygon points="${pts([[x-1.65,0,z-1.5],[x+1.65,0,z-1.5],[x+1.65,0,z+1.5],[x-1.65,0,z+1.5]])}" fill="${panel}" stroke="${selected?accent:side}" stroke-width="${selected?2.5:1}"/><polygon points="${pts([[x-.56,.02,z-.28],[x+1.26,.02,z-.28],[x+1.26,.02,z+1.18],[x-.56,.02,z+1.18]])}" fill="${ink}" stroke="${side}" stroke-width="4"/><path d="M ${P([x+.35,.025,z-.28]).join(' ')} L ${P([x+.35,.025,z+1.18]).join(' ')}" stroke="${side}" stroke-width="2"/><polygon points="${pts([[x-.66,.18,z-.34],[x+1.36,.18,z-.34],[x+1.36,-.07,z-.34],[x-.66,-.07,z-.34]])}" fill="${paper}"/>`;
          const p=P([x-1.3,.06,z-1.22]);s+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${selected?accent:includes(state.captured,cell.id)?ink:side}"/></g>`;
        }
        s+=`<polygon points="${pts([[-5.7,-.9,8.5],[5.7,-.9,8.5],[5.7,.4,8.5],[-5.7,.4,8.5]])}" fill="${paper}" stroke="${side}"/>`;
        const c=CELLS.find(c=>c.id===state.selected)||CELLS[0],a=finite(state.angle,0)*Math.PI/180,D=finite(state.distance,6),pos=[c.x+D*Math.sin(a),D*Math.cos(a),c.z],dp=P(pos),tp=P([c.x,.1,c.z]);
        s+=`<path d="M ${dp.join(' ')} L ${tp[0]-29} ${tp[1]-22} L ${tp[0]+29} ${tp[1]+22} Z" fill="${accent}" opacity=".10"/><path d="M ${dp.join(' ')} L ${tp.join(' ')}" stroke="${accent}" stroke-width="1" opacity=".7"/>`;
        s+=`<g transform="translate(${dp[0]},${dp[1]-13})"><ellipse cy="21" rx="38" ry="7" fill="${ink}" opacity=".08"/>`;
        for(const x of [-24,24])for(const y of [-10,10])s+=`<path d="M 0 0 L ${x} ${y}" stroke="${side}" stroke-width="5"/><ellipse cx="${x}" cy="${y-4}" rx="18" ry="4" fill="${ink}"/><ellipse cx="${x}" cy="${y-2}" rx="4" ry="5" fill="${side}"/>`;
        s+=`<rect x="-11" y="-9" width="22" height="18" rx="5" fill="${paper}" stroke="${side}"/><rect x="-6" y="-10" width="12" height="10" rx="2" fill="${side}"/><path d="M -8 8 L -13 20 M 8 8 L 13 20 M -19 20 L -7 20 M 7 20 L 19 20" stroke="${ink}" stroke-width="2"/><rect x="-5" y="10" width="10" height="8" rx="3" fill="${ink}"/><circle cx="0" cy="15" r="3" fill="${accent}"/></g></svg>`;
        wrapper.innerHTML=s;wrapper.querySelectorAll('[data-cell]').forEach(el=>{el.style.cursor='pointer';el.addEventListener('click',()=>options.onSelect?.(el.dataset.cell));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();options.onSelect?.(el.dataset.cell);}});});
      }
      draw();return {update(next){state={...state,...next};draw();},setView(){},setTheme(next){theme=next==='dark'?'dark':'light';draw();},resize(){},dispose(){disposed=true;wrapper.remove();},stats(){return {renderer:'svg',parts:0,selected:state.selected,theme};},validate(){return {ok:true,errors:[],renderer:'svg'};}};
    }
  };
})();
