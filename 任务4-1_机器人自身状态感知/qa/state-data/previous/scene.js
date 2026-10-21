/* A physical teaching rig. All moving parts consume the same sample as the instruments. */
function createSenseScene(T, host, callbacks={}) {
  // Keep the last frame when the on-demand render loop sleeps, including page captures.
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.outputColorSpace=T.SRGBColorSpace;host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new T.Scene(), camera=new T.PerspectiveCamera(35,1,.1,100);
  camera.up.set(0,0,1);
  const mats={}, picks=[], allParts=[], highlighted=[];
  const material=(name,color,metalness=.1,roughness=.35)=>mats[name]=new T.MeshStandardMaterial({color,metalness,roughness});
  material('white',0xedf2fa,.35,.27);material('edge',0xd8e3f2,.65,.29);
  material('blue',0x2479d5,.52,.25);material('navy',0x173d6a,.5,.3);
  material('steel',0x96a9be,.88,.23);material('chrome',0xc7d5e2,1,.17);
  material('rubber',0x202a35,.05,.82);material('tread',0x303c4b,.08,.72);
  material('pcb',0x207899,.35,.45);material('chip',0x1c2e42,.3,.33);
  material('gold',0xc7ac68,.8,.25);material('glass',0x101e31,.4,.16);
  material('x',0x327dd0,.3,.32);material('y',0x39a7b4,.3,.32);material('z',0x8e9bd3,.3,.32);
  const root=new T.Group();scene.add(root);
  const geoBox=new T.BoxGeometry(1,1,1),geoCyl=new T.CylinderGeometry(1,1,1,96),qZ=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2);
  function mesh(g,m,parent=root,pos=[0,0,0],name=''){
    const o=new T.Mesh(g,typeof m==='string'?mats[m]:m);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);allParts.push(o);if(name){o.userData.part=name;picks.push(o);}return o;
  }
  const roundedCache=new Map();
  function box(w,d,h,m,p,pos,name){
    if(w>.3&&d>.3&&h>.045){
      const key=[w,d,h].join('/');let geo=roundedCache.get(key);
      if(!geo){const b=Math.min(.035,h*.22),r=Math.min(.065,w*.08,d*.08),x=-w/2+b,y=-d/2+b,W=w-2*b,D=d-2*b,s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+W-r,y);s.quadraticCurveTo(x+W,y,x+W,y+r);s.lineTo(x+W,y+D-r);s.quadraticCurveTo(x+W,y+D,x+W-r,y+D);s.lineTo(x+r,y+D);s.quadraticCurveTo(x,y+D,x,y+D-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);geo=new T.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:3,curveSegments:4,steps:1});geo.translate(0,0,-h/2+b);roundedCache.set(key,geo);}
      return mesh(geo,m,p,pos,name);
    }
    const o=mesh(geoBox,m,p,pos,name);o.scale.set(w,d,h);return o;
  }
  function cylinder(r,h,m,p,pos,axis='z',name){const o=mesh(geoCyl,m,p,pos,name);o.scale.set(r,h,r);if(axis==='z')o.quaternion.copy(qZ);if(axis==='x')o.rotation.z=Math.PI/2;return o;}
  function ring(r,t,m,p,pos,axis='z',name){const o=mesh(new T.TorusGeometry(r,t,14,96),m,p,pos,name);if(axis==='x')o.rotation.y=Math.PI/2;if(axis==='y')o.rotation.x=Math.PI/2;return o;}
  function screw(p,x,y,z,r=.045){cylinder(r,.027,'chrome',p,[x,y,z]);box(r*1.1,.012,.007,'chip',p,[x,y,z+.017]);}
  function label(text,w,h,p,pos,color='#315476',background=null){
    const c=document.createElement('canvas');c.width=512;c.height=Math.round(512*h/w);const ctx=c.getContext('2d');
    if(background){ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);}ctx.fillStyle=color;ctx.font='600 42px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);
    const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;
    const o=mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}),p,pos);return o;
  }
  // Locally generated studio environment: no external images or network dependency.
  const studio=new T.Scene();studio.background=new T.Color(0xbac9de);
  for(const [pos,size,power] of [[[0,0,7],[8,6],4],[[5,-4,4],[4,6],2.4],[[-5,2,3],[3,5],1.5]]){
    const panel=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({color:new T.Color(power,power,power)}));panel.position.set(...pos);panel.lookAt(0,0,1);studio.add(panel);
  }
  const pmrem=new T.PMREMGenerator(renderer);const environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight(0xddeaff,0x8293ad,2.1));
  const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-3,-5,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});key.shadow.normalBias=.035;key.shadow.bias=-.0002;key.shadow.radius=4;scene.add(key);
  const fill=new T.DirectionalLight(0x96bfff,1.5);fill.position.set(5,3,6);scene.add(fill);
  const floor=mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xf5f8fd,roughness:.94,metalness:0}),scene,[0,0,.015]);floor.castShadow=false;
  const grid=new T.GridHelper(35,70,0xd8e3f1,0xe8eff7);grid.rotation.x=Math.PI/2;grid.position.z=.023;grid.material.transparent=true;grid.material.opacity=.28;scene.add(grid);

  // A small cradle supports the robot; sensors, rather than the stand, are the subject.
  for(const x of [-1.62,1.62])for(const y of [-.86,.86]){
    cylinder(.14,.12,'rubber',root,[x,y,.08]);cylinder(.10,.12,'steel',root,[x,y,.20]);
  }
  box(3.76,2.16,.13,'edge',root,[0,0,.325]);
  for(const x of [-1.72,1.72]){
    box(.23,.48,.55,'white',root,[x,0,.665]);
    cylinder(.15,.24,'steel',root,[x,0,1],'x');
    for(const y of [-.15,.15])screw(root,x,y,.40);
  }
  const tiltRig=new T.Group();tiltRig.position.z=1;root.add(tiltRig);
  box(3.68,2.36,.14,'white',tiltRig,[0,0,-.07]);
  for(const y of [-1.14,1.14])box(3.5,.035,.022,'steel',tiltRig,[0,y,.011]);
  const carriage=new T.Group();tiltRig.add(carriage);
  const turnGroup=new T.Group();carriage.add(turnGroup);
  const body=new T.Group();body.scale.setScalar(1.3);body.position.z=-.71*1.3;turnGroup.add(body);
  // Chassis, edges, seams and a hinged cover have real mounting surfaces.
  box(2.12,1.34,.12,'navy',body,[0,0,1.01],'chassis');
  box(2.08,1.30,.06,'steel',body,[0,0,1.10],'chassis');
  for(const y of [-.63,.63]){box(2.15,.09,.26,'white',body,[0,y,1.23],'chassis');box(1.6,.015,.035,'edge',body,[0,y+Math.sign(y)*.052,1.27]);}
  for(let i=0;i<7;i++)box(.07,.008,.025,'navy',body,[-.30+i*.10,-.680,1.19]);
  for(const x of [-1.02,1.02]){box(.10,1.2,.24,'white',body,[x,0,1.23],'chassis');for(const y of [-.43,.43])screw(body,x,y,1.37);}
  // End bumper and inset warning-free nameplate.
  box(.08,1.12,.13,'rubber',body,[1.10,0,1.12]);
  box(.14,.53,.035,'steel',body,[.91,0,1.37]);
  const wheels=[];
  for(const x of [-.77,.77])for(const y of [-.82,.82]){
    cylinder(.055,.46,'steel',body,[x,y*.75,1.055],'y');
    box(.22,.18,.18,'edge',body,[x,Math.sign(y)*.54,1.055]);
    const wheel=new T.Group();wheel.position.set(x,y,1.055);body.add(wheel);wheels.push(wheel);
    cylinder(.345,.25,'rubber',wheel,[0,0,0],'y','wheel');
    cylinder(.235,.27,'edge',wheel,[0,0,0],'y','wheel');cylinder(.12,.29,'steel',wheel,[0,0,0],'y');
    for(let i=0;i<24;i++){const a=i*Math.PI/12;const o=box(.095,.26,.035,'tread',wheel,[.345*Math.sin(a),0,.345*Math.cos(a)]);o.rotation.y=a;}
    for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(.022,.30,'chrome',wheel,[.17*Math.sin(a),0,.17*Math.cos(a)],'y');}
  }
  // IMU: two separately identifiable sensing packages on one mounted board.
  const imu=new T.Group();imu.position.set(-.25,-.05,1.23);body.add(imu);
  for(const x of [-.39,.39])for(const y of [-.30,.30])cylinder(.036,.13,'gold',imu,[x,y,-.035]);
  box(.90,.70,.045,'pcb',imu,[0,0,.055]);
  const accel=box(.25,.25,.075,'chip',imu,[-.19,-.05,.115],'accel');
  const gyro=box(.25,.25,.075,'chip',imu,[.19,.10,.115],'gyro');
  for(const [cx,cy] of [[-.19,-.05],[.19,.10]])for(let i=0;i<5;i++)for(const sign of [-1,1])box(.028,.055,.018,'gold',imu,[cx-.084+i*.042,cy+sign*.15,.087]);
  for(const x of [-.39,.39])for(const y of [-.30,.30])screw(imu,x,y,.085,.026);
  for(const x of [-.29,0,.29])box(.08,.035,.035,'edge',imu,[x,.25,.095]);
  box(.22,.065,.08,'navy',imu,[.12,-.30,.11]);
  // Motor driver: current sampling shunt is in the drive circuit, not a body sensor.
  const driver=new T.Group();driver.position.set(.52,.08,1.23);body.add(driver);
  for(const x of [-.20,.20])for(const y of [-.27,.27])cylinder(.03,.13,'steel',driver,[x,y,-.035]);
  box(.50,.64,.045,'pcb',driver,[0,0,.055]);
  box(.19,.20,.08,'chip',driver,[0,.10,.117]);
  const shunt=box(.23,.12,.065,'steel',driver,[0,-.15,.110],'current');
  for(const x of [-.13,.13])box(.032,.13,.02,'gold',driver,[x,-.15,.085],'current');
  box(.32,.08,.11,'navy',driver,[0,.28,.133]);
  for(const x of [-.1,0,.1])cylinder(.018,.009,'chrome',driver,[x,.28,.193]);
  for(let i=0;i<4;i++)box(.025,.19,.075,'steel',driver,[-.1+i*.065,.10,.195]);
  // Outboard wheel encoder is shown with its protective cover open for teaching.
  const encoder=new T.Group();encoder.position.set(-.77,-.995,1.055);body.add(encoder);
  cylinder(.205,.055,'navy',encoder,[0,0,0],'y','encoder');
  const codeDisc=new T.Group();encoder.add(codeDisc);
  cylinder(.173,.014,'gold',codeDisc,[0,-.036,0],'y','encoder');
  cylinder(.049,.025,'chrome',codeDisc,[0,-.048,0],'y','encoder');
  for(let i=0;i<24;i++){
    const a=i*Math.PI/12,o=box(.018,.004,.045,'chip',codeDisc,[.133*Math.sin(a),-.045,.133*Math.cos(a)],'encoder');o.rotation.y=a;
  }
  box(.09,.10,.085,'chip',encoder,[0,-.042,.197],'encoder');
  box(.09,.055,.24,'steel',body,[-.77,-1.005,1.39]);
  box(.09,.39,.055,'steel',body,[-.77,-.82,1.49]);
  const encoderCover=cylinder(.217,.035,'white',encoder,[0,-.085,0],'y','encoder');
  // Cover pivots about its rear edge rather than floating away from the machine.
  const lid=new T.Group();lid.position.set(0,.64,1.38);body.add(lid);
  box(1.83,1.22,.045,'white',lid,[0,-.60,0]);
  for(const x of [-.60,.60])box(.035,.89,.025,'edge',lid,[x,-.60,-.035]);
  for(const y of [-.17,-1.03])box(1.20,.035,.025,'edge',lid,[0,y,-.035]);
  for(const x of [-.63,.63]){cylinder(.045,.23,'steel',body,[x,.64,1.38],'x');screw(lid,x,-1.1,.033,.033);}
  label('SELF / 04',.7,.14,lid,[0,-.60,.025]);
  const axes=new T.Group();axes.position.set(-.45,-.12,1.56);body.add(axes);
  function arrow(p,dir,len,color){const a=new T.ArrowHelper(new T.Vector3(...dir),new T.Vector3(),len,color,.08,.045);p.add(a);return a;}
  arrow(axes,[1,0,0],.37,0x327dd0);arrow(axes,[0,1,0],.37,0x39a7b4);arrow(axes,[0,0,1],.37,0x8e9bd3);
  for(const [s,pos,color] of [['x',[.45,0,0],'#327dd0'],['y',[0,.45,0],'#39a7b4'],['z',[0,0,.45],'#8e9bd3']]){
    const c=document.createElement('canvas');c.width=c.height=80;const cx=c.getContext('2d');cx.font='bold 54px Arial';cx.textAlign='center';cx.fillStyle=color;cx.fillText(s,40,58);const tx=new T.CanvasTexture(c);const sp=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:true}));sp.scale.set(.14,.14,.14);sp.position.set(...pos);axes.add(sp);
  }
  const gravity=new T.Group();gravity.position.set(1.48,-.91,2.25);root.add(gravity);arrow(gravity,[0,0,-1],.75,0x8c9ba9);
  let mode='observe',selected=null,theme='light',pointer=null,moved=false,lastPose={};
  let desired={az:-1.13,el:.65,r:7.8,tx:0,ty:0,tz:1.28},current={...desired};
  const presets={iso:{az:-1.13,el:.65},front:{az:-Math.PI/2,el:.36},side:{az:.02,el:.32},top:{az:-Math.PI/2,el:1.50}};
  const anchors={accel,gyro,encoder:shunt,current:shunt};anchors.encoder=encoder;
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render(0);callbacks.wake?.();}
  const ro=new ResizeObserver(resize);ro.observe(host);
  function setView(id='iso',immediate=false){Object.assign(desired,presets[id]||presets.iso,{r:7.8,tx:0,ty:0,tz:1.28});if(immediate)current={...desired};callbacks.wake?.();}
  function selectPart(id,notify=true){
    for(const [o,original]of highlighted){o.material.dispose();o.material=original;}highlighted.length=0;selected=id;
    for(const o of picks)if(o.userData.part===id&&o.material.emissive){const original=o.material,mat=original.clone();o.material=mat;highlighted.push([o,original]);mat.color.set(0x2779db);mat.emissive.set(0x125aad);mat.emissiveIntensity=.27;}
    if(notify)callbacks.part?.(id);callbacks.wake?.();
  }
  function focusPart(id){
    scene.updateMatrixWorld(true);const p=(anchors[id]||accel).getWorldPosition(new T.Vector3());
    Object.assign(desired,{tx:p.x,ty:p.y,tz:p.z,r:3.8,az:id==='encoder'?-1.88:-1.15,el:id==='encoder'?.27:1.04});callbacks.wake?.();
  }
  const ray=new T.Raycaster(),v=new T.Vector2();
  host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;host.focus({preventScroll:true});pointer={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY};moved=false;host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;moved||=Math.hypot(e.clientX-pointer.sx,e.clientY-pointer.sy)>4;desired.az-=dx*.008;desired.el=Math.min(1.54,Math.max(.10,desired.el+dy*.006));callbacks.wake?.();});
  function endPointer(e){if(!pointer)return;if(!moved){const b=host.getBoundingClientRect();v.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(v,camera);const visible=allParts.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});const hit=ray.intersectObjects(visible,false)[0];if(hit){let part=hit.object;while(part&&!part.userData.part)part=part.parent;if(part&&['accel','gyro','encoder','current'].includes(part.userData.part))selectPart(part.userData.part);}}pointer=null;}
  host.addEventListener('pointerup',endPointer);host.addEventListener('pointercancel',()=>pointer=null);
  host.addEventListener('wheel',e=>{e.preventDefault();desired.r=Math.min(13,Math.max(2.8,desired.r*(1+e.deltaY*.0007)));callbacks.wake?.();},{passive:false});
  function setState(s,options={}){
    lastPose=s;tiltRig.rotation.x=s.tilt*Math.PI/180;turnGroup.rotation.z=s.yaw*Math.PI/180;
    carriage.position.x=options.experiment==='position'?(s.position-.25)*1.6:0;
    body.position.z=-.71*1.3+(options.experiment==='vibration'?s.vibration*12:0);
    const angle=options.sensor==='encoder'||options.sensor==='current'?s.wheelAngle*Math.PI/180:options.experiment==='position'?s.position/(.16/2):0;
    for(const w of wheels)w.rotation.y=options.sensor==='gyro'?-s.yaw*Math.PI/180*Math.sign(w.position.y)*1.1:-angle;
    codeDisc.rotation.y=-angle;lid.rotation.x=options.inspect?-1.92:0;encoderCover.visible=!options.inspect;
    axes.visible=options.axes&&['accel','gyro'].includes(options.sensor);gravity.visible=options.axes&&options.experiment==='gravity';
    scene.updateMatrixWorld(true);
  }
  function setTheme(value){theme=value;const dark=value==='dark';scene.background=new T.Color(dark?0x101b28:0xf3f6f8);scene.fog=new T.Fog(scene.background,17,55);floor.material.color.set(dark?0x101b28:0xf3f6f8);grid.material.opacity=dark?.10:.20;callbacks.wake?.();}
  function render(dt=1/60,reduced=false){let moving=false;const ease=reduced?1:1-Math.exp(-Math.min(dt,.05)*13);for(const k of Object.keys(current)){const d=desired[k]-current[k];if(Math.abs(d)>.0001)moving=true;current[k]+=d*ease;}
    const aspect=camera.aspect,r=current.r*Math.max(1,1.15/aspect),target=new T.Vector3(current.tx,current.ty,current.tz);
    camera.position.set(target.x+r*Math.cos(current.el)*Math.cos(current.az),target.y+r*Math.cos(current.el)*Math.sin(current.az),target.z+r*Math.sin(current.el));camera.lookAt(target);renderer.render(scene,camera);return moving;
  }
  function stats(){scene.updateMatrixWorld(true);const q=body.getWorldQuaternion(new T.Quaternion()),xyz={};for(const [name,axis]of [['x',[1,0,0]],['y',[0,1,0]],['z',[0,0,1]]])xyz[name]=new T.Vector3(...axis).applyQuaternion(q).toArray();return{available:true,meshes:allParts.length,drawCalls:renderer.info.render.calls,robotWorldAxes:xyz,worldGravity:[0,0,-1],tilt:lastPose.tilt,yaw:lastPose.yaw,wheelAngle:lastPose.wheelAngle,selected,theme,camera:camera.position.toArray()};}
  resize();setTheme('light');
  return{setState,setTheme,setView,resetView:()=>setView('iso'),focusPart,selectPart,render,resize,stats,dispose(){ro.disconnect();renderer.dispose();environment.dispose();}};
}
