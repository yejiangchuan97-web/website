/* A physical teaching rig. All moving parts consume the same sample as the instruments. */
function createSenseScene(T, host, callbacks={}) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
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
  // Four isolated feet contact the floor; the bearing towers share one real X axis.
  for(const x of [-3.15,3.15])for(const y of [-1.75,1.75]){
    cylinder(.23,.17,'rubber',root,[x,y,.10]);cylinder(.14,.24,'steel',root,[x,y,.305]);cylinder(.28,.07,'edge',root,[x,y,.43]);
  }
  box(7.3,4.35,.29,'white',root,[0,0,.6]);box(7.04,4.12,.07,'edge',root,[0,0,.78]);
  box(6.9,.055,.12,'blue',root,[0,-2.19,.59]);
  for(const x of [-3.33,3.33])for(const y of [-1.85,1.85])screw(root,x,y,.83,.065);
  label('SENSE / INERTIAL LAB',2.65,.20,root,[0,-1.88,.824]);
  const pivot=2.55;
  for(const x of [-3.17,3.17]){
    box(.66,1.52,.16,'edge',root,[x,0,.9]);box(.31,.76,1.42,'white',root,[x,0,1.65]);
    box(.37,.11,1.24,'blue',root,[x,-.39,1.7]);
    // Bearing housing with a bored opening instead of a solid decorative disc.
    const sh=new T.Shape();sh.absarc(0,0,.47,0,Math.PI*2);const hole=new T.Path();hole.absarc(0,0,.20,0,Math.PI*2,true);sh.holes.push(hole);
    const bearing=mesh(new T.ExtrudeGeometry(sh,{depth:.29,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:40}),'steel',root,[x-.145,0,pivot]);bearing.rotation.y=Math.PI/2;
    ring(.255,.045,'chrome',root,[x+(x>0?.175:-.175),0,pivot],'x');
    ring(.170,.035,'steel',root,[x+(x>0?.175:-.175),0,pivot],'x');
    for(const y of [-.52,.52])screw(root,x,y,1.00,.06);
  }
  cylinder(.135,7.1,'chrome',root,[.15,0,pivot],'x');
  // Right handwheel and angular bezel sit coaxially on the trunnion shaft.
  ring(.51,.055,'navy',root,[3.65,0,pivot],'x');cylinder(.15,.22,'blue',root,[3.65,0,pivot],'x');
  for(let a=0;a<3;a++){const spoke=box(.07,.06,.91,'steel',root,[3.65,0,pivot]);spoke.rotation.x=a*Math.PI/3;}
  cylinder(.075,.26,'rubber',root,[3.8,.37,pivot+.25],'x');
  const tiltRig=new T.Group();tiltRig.position.z=pivot;root.add(tiltRig);
  box(5.72,3.5,.20,'white',tiltRig,[0,0,0]);box(5.52,3.28,.055,'edge',tiltRig,[0,0,.126]);
  for(const y of [-1.68,1.68]){box(5.7,.10,.24,'blue',tiltRig,[0,y,.11]);for(const x of [-2.55,0,2.55])screw(tiltRig,x,y,.25,.045);}
  for(const x of [-2.79,2.79]){box(.12,3.28,.23,'navy',tiltRig,[x,0,.10]);}
  // Two linear guides support the shuttle, with visible bearings and a travel ruler.
  for(const y of [-1.22,1.22]){box(5.1,.20,.07,'steel',tiltRig,[0,y,.19]);cylinder(.052,5.0,'chrome',tiltRig,[0,y,.27],'x');}
  for(let i=0;i<=20;i++){const x=-2.5+i*.25;box(.014,i%5===0?.19:.09,.008,'navy',tiltRig,[x,-1.46,.17]);}
  label('A',.27,.23,tiltRig,[-1,-1.45,.18]);label('B  /  0.50 m',.86,.21,tiltRig,[1,-1.45,.18]);
  const carriage=new T.Group();tiltRig.add(carriage);
  for(const x of [-.78,.78])for(const y of [-1.22,1.22])box(.42,.31,.14,'blue',carriage,[x,y,.30]);
  box(2.42,2.68,.12,'white',carriage,[0,0,.42]);
  cylinder(.88,.11,'steel',carriage,[0,0,.53],'z','turntable');
  ring(.81,.037,'chrome',carriage,[0,0,.61],'z','turntable');
  const turnGroup=new T.Group();carriage.add(turnGroup);
  cylinder(1.36,.12,'white',turnGroup,[0,0,.64],'z','turntable');ring(1.31,.025,'blue',turnGroup,[0,0,.705],'z','turntable');
  for(let i=0;i<36;i++){const a=i*Math.PI/18,o=box(.018,i%3===0?.12:.06,.009,'navy',turnGroup,[1.24*Math.sin(a),1.24*Math.cos(a),.711]);o.rotation.z=-a;}
  const body=new T.Group();body.userData.part='chassis';turnGroup.add(body);
  // Machined chassis, raised side walls, four actual wheels and suspension links.
  box(2.1,1.32,.12,'navy',body,[0,0,1.01],'chassis');
  box(2.08,1.30,.06,'steel',body,[0,0,1.10],'chassis');
  for(const y of [-.63,.63]){box(2.15,.09,.26,'white',body,[0,y,1.23],'chassis');box(1.6,.015,.045,'blue',body,[0,y+(y>0?.052:-.052),1.27]);}
  for(const x of [-1.02,1.02]){box(.10,1.2,.24,'white',body,[x,0,1.23],'chassis');for(const y of [-.43,.43])screw(body,x,y,1.37);}
  const wheels=[];
  for(const x of [-.77,.77])for(const y of [-.82,.82]){
    cylinder(.055,.51,'steel',body,[x,y*.72,1.055],'y');
    const wheel=new T.Group();wheel.position.set(x,y,1.055);body.add(wheel);wheels.push(wheel);
    cylinder(.345,.25,'rubber',wheel,[0,0,0],'y','chassis');
    cylinder(.235,.27,'edge',wheel,[0,0,0],'y','chassis');cylinder(.12,.29,'blue',wheel,[0,0,0],'y');
    for(let i=0;i<24;i++){const a=i*Math.PI/12;const tread=box(.095,.26,.035,'tread',wheel,[.345*Math.sin(a),0,.345*Math.cos(a)]);tread.rotation.y=a;}
    for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(.022,.30,'chrome',wheel,[.17*Math.sin(a),0,.17*Math.cos(a)],'y');}
  }
  // IMU package, gold pads and discrete components are mounted on four standoffs.
  const imu=new T.Group();imu.userData.part='imu';imu.position.set(0,-.31,1.23);body.add(imu);
  for(const x of [-.40,.40])for(const y of [-.21,.21]){cylinder(.035,.18,'gold',imu,[x,y,-.01]);screw(imu,x,y,.105,.034);}
  box(.93,.54,.045,'pcb',imu,[0,0,.09],'imu');box(.24,.24,.075,'chip',imu,[0,0,.15],'imu');
  for(let i=0;i<6;i++)for(const sign of [-1,1])box(.032,.065,.017,'gold',imu,[-.09+i*.036,sign*.158,.135]);
  for(const x of [-.30,.29])for(const y of [-.12,.09]){box(.085,.04,.035,'edge',imu,[x,y,.145]);box(.018,.045,.04,'gold',imu,[x+.045,y,.145]);}
  for(let i=0;i<5;i++){cylinder(.018,.10,'gold',imu,[-.34+i*.065,.23,.17]);}
  label('IMU',.19,.1,imu,[0,0,.192],'#a8d6f0');
  // Sensor lid lifts only on request; the phone remains a separate mounted instrument.
  const lid=new T.Group();body.add(lid);box(1.08,.65,.07,'white',lid,[0,-.31,1.49],'chassis');label('INERTIAL / 6 AXIS',.84,.12,lid,[0,-.31,1.531]);
  for(const x of [-.68,.68]){cylinder(.045,.50,'steel',body,[x,.31,1.38]);box(.22,.28,.06,'navy',body,[x,.31,1.62]);}
  const phone=new T.Group();phone.userData.part='phone';phone.position.set(0,.31,1.67);body.add(phone);
  box(1.74,.84,.10,'white',phone,[0,0,0],'phone');box(1.61,.72,.018,'glass',phone,[0,0,.058],'phone');
  const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=336;const screenCtx=screenCanvas.getContext('2d');
  const screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.colorSpace=T.SRGBColorSpace;
  mesh(new T.PlaneGeometry(1.51,.65),new T.MeshBasicMaterial({map:screenTexture}),phone,[.025,0,.070],'phone');
  cylinder(.025,.009,'chip',phone,[-.81,0,.059]);box(.12,.017,.017,'chip',phone,[.18,-.426,.001]);
  for(const x of [-.86,.86])for(const y of [-.32,.32]){box(.095,.13,.16,'navy',phone,[x,y,.025]);box(.055,.10,.025,'rubber',phone,[x-.015*Math.sign(x),y,.11]);}
  // Thin inspection antenna and tether: curved cables are physical geometry.
  const cablePoints=[new T.Vector3(.69,.53,1.65),new T.Vector3(1.09,.48,1.38),new T.Vector3(.86,-.13,1.16),new T.Vector3(.39,-.08,1.35)];
  mesh(new T.TubeGeometry(new T.CatmullRomCurve3(cablePoints),36,.022,8,false),'navy',body,[0,0,0]);
  const axes=new T.Group();axes.position.set(-.85,-.88,1.48);body.add(axes);
  function arrow(p,dir,len,color){const a=new T.ArrowHelper(new T.Vector3(...dir),new T.Vector3(),len,color,.11,.065);p.add(a);return a;}
  arrow(axes,[1,0,0],.52,0x327dd0);arrow(axes,[0,1,0],.52,0x39a7b4);arrow(axes,[0,0,1],.52,0x8e9bd3);
  for(const [s,pos,color] of [['x',[.61,0,0],'#327dd0'],['y',[0,.61,0],'#39a7b4'],['z',[0,0,.62],'#8e9bd3']]){
    const c=document.createElement('canvas');c.width=c.height=80;const cx=c.getContext('2d');cx.font='bold 54px Arial';cx.textAlign='center';cx.fillStyle=color;cx.fillText(s,40,58);const tx=new T.CanvasTexture(c);const sp=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:true}));sp.scale.set(.18,.18,.18);sp.position.set(...pos);axes.add(sp);
  }
  const gravity=new T.Group();gravity.position.set(2.28,-.94,3.65);root.add(gravity);arrow(gravity,[0,0,-1],1.18,0x6f95c3);
  const pulse=new T.Mesh(new T.SphereGeometry(.055,16,12),new T.MeshStandardMaterial({color:0x54cbe0,emissive:0x16a8c2,emissiveIntensity:.7}));pulse.position.set(.91,-.64,1.27);body.add(pulse);
  let lastScreen='',mode='observe',selected=null,theme='light',pointer=null,moved=false;
  let desired={az:-.93,el:.52,r:13.0,tx:0,ty:0,tz:1.60},current={...desired},lastPose={};
  const presets={iso:{az:-.93,el:.52},front:{az:-Math.PI/2,el:.29},side:{az:.02,el:.25},top:{az:-Math.PI/2,el:1.52}};
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();callbacks.wake?.();}
  const ro=new ResizeObserver(resize);ro.observe(host);
  function setView(id='iso',immediate=false){Object.assign(desired,presets[id]||presets.iso,{r:13.0,tx:0,ty:0,tz:1.60});if(immediate)current={...desired};callbacks.wake?.();}
  function selectPart(id){for(const [o,original]of highlighted){o.material.dispose();o.material=original;}highlighted.length=0;selected=id;for(const o of picks)if(o.userData.part===id&&o.material.emissive){const original=o.material,mat=original.clone();o.material=mat;highlighted.push([o,original]);mat.emissive.set(0x125aad);mat.emissiveIntensity=.24;}callbacks.part?.(id);callbacks.wake?.();}
  const ray=new T.Raycaster(),v=new T.Vector2();
  host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;host.focus({preventScroll:true});pointer={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY};moved=false;host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!pointer)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;moved||=Math.hypot(e.clientX-pointer.sx,e.clientY-pointer.sy)>4;
    if(mode==='operate')callbacks.manipulate?.(dx,dy);else{desired.az-=dx*.008;desired.el=Math.min(1.54,Math.max(.08,desired.el+dy*.006));}callbacks.wake?.();});
  function endPointer(e){if(!pointer)return;if(!moved){const b=host.getBoundingClientRect();v.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(v,camera);const visible=allParts.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});const hit=ray.intersectObjects(visible,false)[0];if(hit){let part=hit.object;while(part&&!part.userData.part)part=part.parent;if(part)selectPart(part.userData.part);}}pointer=null;}
  host.addEventListener('pointerup',endPointer);host.addEventListener('pointercancel',()=>pointer=null);
  host.addEventListener('wheel',e=>{e.preventDefault();desired.r=Math.min(19,Math.max(8.3,desired.r*(1+e.deltaY*.0007)));callbacks.wake?.();},{passive:false});
  function setState(s,options={}){
    lastPose=s;tiltRig.rotation.x=s.tilt*Math.PI/180;turnGroup.rotation.z=s.yaw*Math.PI/180;
    carriage.position.x=options.experiment==='position'?(s.position-.25)*4:0;
    body.position.z=options.experiment==='vibration'?s.vibration*38:0;
    for(const w of wheels)w.rotation.y=options.experiment==='position'?-s.position*4/.345:0;
    lid.visible=!options.inspect;axes.visible=gravity.visible=options.axes!==false;
    const values=s.acc.map(x=>x.toFixed(2)),key=values.join('|');
    if(key!==lastScreen){lastScreen=key;const c=screenCtx;c.fillStyle='#142942';c.fillRect(0,0,768,336);c.fillStyle='#87b7e2';c.font='500 26px Arial';c.fillText('SENSE / BODY AXES',34,47);c.fillStyle='#4fd1dc';c.fillRect(691,29,33,14);c.fillStyle='#abc9e6';c.font='22px Arial';c.fillText('m/s²    •    TEACHING MODEL',34,304);for(let i=0;i<3;i++){c.fillStyle=['#6caef5','#6bd2d8','#acb7f4'][i];c.font='600 26px Arial';c.fillText(['X','Y','Z'][i],40+i*244,111);c.fillStyle='#f1f7ff';c.font='600 60px Arial';c.fillText(values[i],34+i*244,201);}screenTexture.needsUpdate=true;}
    scene.updateMatrixWorld(true);
  }
  function setTheme(value){theme=value;const dark=value==='dark';scene.background=new T.Color(dark?0x0c131f:0xf5f8fd);scene.fog=new T.Fog(scene.background,21,60);floor.material.color.set(dark?0x020408:0xf5f8fd);grid.material.opacity=dark?.08:.28;callbacks.wake?.();}
  function render(dt=1/60,reduced=false){let moving=false;const ease=reduced?1:1-Math.exp(-Math.min(dt,.05)*13);for(const k of Object.keys(current)){const d=desired[k]-current[k];if(Math.abs(d)>.0001)moving=true;current[k]+=d*ease;}
    const aspect=camera.aspect,r=current.r*Math.max(1,1.30/aspect),target=new T.Vector3(current.tx,current.ty,current.tz);
    camera.position.set(target.x+r*Math.cos(current.el)*Math.cos(current.az),target.y+r*Math.cos(current.el)*Math.sin(current.az),target.z+r*Math.sin(current.el));camera.lookAt(target);renderer.render(scene,camera);return moving;
  }
  function stats(){scene.updateMatrixWorld(true);const q=body.getWorldQuaternion(new T.Quaternion());const xyz={};for(const [name,axis]of [['x',[1,0,0]],['y',[0,1,0]],['z',[0,0,1]]])xyz[name]=new T.Vector3(...axis).applyQuaternion(q).toArray();return{available:true,meshes:allParts.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,robotWorldAxes:xyz,worldGravity:[0,0,-1],bodyPosition:body.getWorldPosition(new T.Vector3()).toArray(),tilt:lastPose.tilt,yaw:lastPose.yaw,camera:camera.position.toArray(),selected,theme,mode};}
  resize();setTheme('light');
  return{setState,setTheme,setView,resetView:()=>setView('iso'),setMode:value=>{mode=value;},selectPart,render,resize,stats,dispose(){ro.disconnect();renderer.dispose();environment.dispose();}};
}
