/* Real geometry and measured returns share one world. Display fitting never changes source coordinates. */
function createLidarScene(T,host,M,callbacks={}){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.05,150);camera.up.set(0,0,1);
  const mats={},parts=[],pickables=[],targetMeshes=[],root=new T.Group(),targets=new T.Group(),sensor=new T.Group(),cloudRoot=new T.Group(),explanation=new T.Group();
  scene.add(root,cloudRoot,explanation);root.add(targets,sensor);
  const material=(id,color,metalness=.1,roughness=.4)=>mats[id]=new T.MeshStandardMaterial({color,metalness,roughness,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
  material('white',0xeff4fb,.28,.31);material('edge',0xd4e0ee,.57,.3);material('blue',0x2479dc,.50,.27);
  material('navy',0x163b66,.47,.31);material('steel',0x9fb0c5,.87,.23);material('chrome',0xc5d4e1,1,.16);
  material('rubber',0x253244,.06,.78);material('wall',0xe5edf7,.18,.57);material('seam',0xa9bdd3,.48,.41);
  material('crate',0x91b1cb,.42,.37);material('glass',0x111e2b,.6,.15);material('lens',0x2365a2,.63,.14);
  material('floor',0xe9eff7,.16,.75);material('gold',0xc5af7b,.76,.3);
  const boxGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,64),qZ=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),Math.PI/2),rounded=new Map();
  function mesh(geometry,mat,parent=root,pos=[0,0,0],part){const o=new T.Mesh(geometry,typeof mat==='string'?mats[mat]:mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;parent.add(o);parts.push(o);if(part){o.userData.part=part;pickables.push(o);}return o;}
  function box(w,d,h,mat,parent,pos,part){
    if(w>.18&&d>.18&&h>.04){const key=[w,d,h].join('/');let g=rounded.get(key);if(!g){const b=Math.min(.015,h*.18),r=Math.min(.035,w*.08,d*.08),x=-w/2+b,y=-d/2+b,W=w-2*b,D=d-2*b,s=new T.Shape();s.moveTo(x+r,y);s.lineTo(x+W-r,y);s.quadraticCurveTo(x+W,y,x+W,y+r);s.lineTo(x+W,y+D-r);s.quadraticCurveTo(x+W,y+D,x+W-r,y+D);s.lineTo(x+r,y+D);s.quadraticCurveTo(x,y+D,x,y+D-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);g=new T.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelSize:b,bevelThickness:b,bevelSegments:2,curveSegments:4,steps:1});g.translate(0,0,-h/2+b);rounded.set(key,g);}return mesh(g,mat,parent,pos,part);}
    const o=mesh(boxGeo,mat,parent,pos,part);o.scale.set(w,d,h);return o;
  }
  function cyl(r,h,mat,parent,pos,axis='z',part){const o=mesh(cylGeo,mat,parent,pos,part);o.scale.set(r,h,r);if(axis==='z')o.quaternion.copy(qZ);else if(axis==='x')o.rotation.z=Math.PI/2;return o;}
  function ring(r,t,mat,parent,pos,axis='z',part){const o=mesh(new T.TorusGeometry(r,t,10,80),mat,parent,pos,part);if(axis==='x')o.rotation.y=Math.PI/2;if(axis==='y')o.rotation.x=Math.PI/2;return o;}
  function screw(parent,x,y,z,r=.026){cyl(r,.018,'chrome',parent,[x,y,z]);box(r*1.15,.006,.005,'navy',parent,[x,y,z+.011]);}
  function planeLabel(text,w,h,parent,pos,color='#36577a',bg=null){const c=document.createElement('canvas');c.width=768;c.height=Math.max(56,Math.round(768*h/w));const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);}ctx.fillStyle=color;ctx.font='600 50px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;return mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false}),parent,pos);}
  // A locally generated photographic studio environment keeps the page entirely offline.
  const studio=new T.Scene();studio.background=new T.Color(0xbdcddd);
  for(const [p,size,power]of[[[-3,-4,8],[7,5],3.4],[[5,-3,4],[4,6],2],[[-5,4,3],[3,5],1.4]]){const o=new T.Mesh(new T.PlaneGeometry(...size),new T.MeshBasicMaterial({color:new T.Color(power,power,power)}));o.position.set(...p);o.lookAt(0,0,.5);studio.add(o);}
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;pmrem.dispose();
  scene.add(new T.HemisphereLight(0xe4efff,0x8c9db5,2.2));
  const key=new T.DirectionalLight(0xffffff,3.0);key.position.set(-4,-6,10);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.3,far:25});key.shadow.normalBias=.018;key.shadow.bias=-.00012;key.shadow.radius=4;scene.add(key);
  const fill=new T.DirectionalLight(0x9cc6ff,1.1);fill.position.set(5,3,6);scene.add(fill);
  const studioFloor=mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xf4f8fe,roughness:.95}),scene,[0,0,-.52]);studioFloor.castShadow=false;
  const studioGrid=new T.GridHelper(40,80,0xd9e5f2,0xe7eff8);studioGrid.rotation.x=Math.PI/2;studioGrid.position.z=-.514;studioGrid.material.transparent=true;studioGrid.material.opacity=.22;scene.add(studioGrid);
  // Thick table, leveling feet, edge band and a meter ruler physically support the model.
  for(const x of[-3.03,3.03])for(const y of[-1.92,1.92]){cyl(.13,.10,'rubber',root,[x,y,-.462]);cyl(.072,.16,'chrome',root,[x,y,-.332]);cyl(.17,.045,'edge',root,[x,y,-.23]);}
  box(7.03,4.72,.20,'white',root,[0,0,-.15]);box(6.87,4.55,.064,'edge',root,[0,0,-.035]);
  box(6.90,.055,.085,'blue',root,[0,-2.372,-.15]);box(.055,4.58,.085,'blue',root,[-3.523,0,-.15]);
  for(const x of[-3.28,3.28])for(const y of[-2.13,2.13])screw(root,x,y,.014,.035);
  for(let i=0;i<=32;i++){const x=-3.2+i*.2;box(.009,i%5===0?.13:.06,.004,'navy',root,[x,-2.15,.012]);}
  planeLabel('LIDAR / POINT CLOUD LAB',2.45,.16,root,[-.03,-2.20,.018]);
  const stationRoot=new T.Group();root.add(stationRoot);
  for(const [id,xy]of Object.entries(M.POSITIONS||{A:[-2.3,-.6],B:[-.8,-1.4]})){const p=Array.isArray(xy)?xy:[xy.x,xy.y];ring(.32,.009,'blue',stationRoot,[p[0],p[1],.017]);for(const a of[0,Math.PI/2,Math.PI,Math.PI*1.5]){const mark=box(.08,.018,.006,'blue',stationRoot,[p[0]+.35*Math.cos(a),p[1]+.35*Math.sin(a),.018]);mark.rotation.z=a;}planeLabel(id,.17,.14,stationRoot,[p[0]-.42,p[1]-.12,.019]);}
  const environmentObjects=M.environment();
  for(const item of environmentObjects){
    if(item.type==='plane'||item.type==='floor'){const mn=item.min||[-3.4,-2.25,0],mx=item.max||[3.4,2.25,0];const o=mesh(new T.PlaneGeometry(mx[0]-mn[0],mx[1]-mn[1]),'floor',targets,[(mn[0]+mx[0])/2,(mn[1]+mx[1])/2,item.z||0],item.id);o.castShadow=false;targetMeshes.push(o);continue;}
    if(item.type==='cylinder'){const p=item.center||[item.cx,item.cy],r=item.radius??item.r,z0=item.zMin??item.z0,z1=item.zMax??item.z1;const o=cyl(r,z1-z0,'steel',targets,[p[0],p[1],(z0+z1)/2],'z',item.id);targetMeshes.push(o);cyl(r*2.8,.032,'edge',targets,[p[0],p[1],.018]);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;screw(targets,p[0]+r*1.9*Math.cos(a),p[1]+r*1.9*Math.sin(a),.04,.014);}ring(r*1.05,.009,'blue',targets,[p[0],p[1],z1-.10]);continue;}
    const mn=item.min,mx=item.max,w=mx[0]-mn[0],d=mx[1]-mn[1],h=mx[2]-mn[2],cx=(mn[0]+mx[0])/2,cy=(mn[1]+mx[1])/2,cz=(mn[2]+mx[2])/2;
    const mat=item.id==='crate'?'crate':item.id==='low-block'?'blue':item.id==='beam'?'steel':item.id.includes('post')?'steel':'wall';
    // Collision faces stay exact boxes; beveling is reserved for non-collision trim.
    const o=mesh(boxGeo,mat,targets,[cx,cy,cz],item.id);o.scale.set(w,d,h);targetMeshes.push(o);
    if(item.id==='back-wall'){
      box(w+.018,d+.025,.055,'edge',targets,[cx,cy,mx[2]+.028]);box(w+.025,d,.075,'seam',targets,[cx,cy,.038]);
      for(let y=mn[1]+.82;y<mx[1];y+=.82)box(.006,.012,h-.12,'seam',targets,[mn[0]-.004,y,h/2]);
      for(const y of[mn[1]+.18,mx[1]-.18]){box(.24,.26,.045,'steel',targets,[mn[0]-.07,y,.026]);screw(targets,mn[0]-.12,y,.06);}
    }else if(item.id==='side-wall'){
      box(w+.025,d+.018,.055,'edge',targets,[cx,cy,mx[2]+.028]);box(w,d+.025,.075,'seam',targets,[cx,cy,.038]);
      for(let x=mn[0]+.85;x<mx[0];x+=.85)box(.012,.006,h-.12,'seam',targets,[x,mn[1]-.004,h/2]);
      for(const x of[mn[0]+.18,mx[0]-.18]){box(.26,.24,.045,'steel',targets,[x,mn[1]-.07,.026]);screw(targets,x,mn[1]-.12,.06);}
    }else if(item.id==='crate'){
      box(w+.025,d+.025,.045,'edge',targets,[cx,cy,mx[2]+.023]);
      for(const x of[mn[0]+.028,mx[0]-.028])for(const y of[mn[1]-.008,mx[1]+.008]){box(.055,.025,h-.05,'steel',targets,[x,y,h/2]);for(const z of[.15,h-.15]){const b=cyl(.019,.011,'chrome',targets,[x,y-.018*Math.sign(cy-y),z],'y');}}
      for(const x of[cx-.27,cx+.27]){box(.16,.045,.09,'navy',targets,[x,mn[1]-.032,h*.64]);box(.095,.045,.035,'steel',targets,[x,mn[1]-.052,h*.64]);box(.12,.07,.035,'steel',targets,[x,mx[1]+.02,h-.015]);}
      const tag=planeLabel('OCCLUDER / 01',.59,.12,targets,[cx,mn[1]-.026,.43],'#48637d','#d2dfeb');tag.rotation.x=Math.PI/2;
    }else if(item.id==='low-block'){
      for(const x of[cx-.13,cx+.13])box(.05,d-.045,.006,'rubber',targets,[x,cy,mx[2]+.004]);
    }else if(item.id==='beam'){
      for(const y of[mn[1],mx[1]])box(w+.04,.035,h+.04,'blue',targets,[cx,y,cz]);
    }else if(item.id.includes('post')){
      box(w+.15,d+.15,.035,'edge',targets,[cx,cy,.018]);for(const x of[cx-w*.7,cx+w*.7])for(const y of[cy-d*.7,cy+d*.7])screw(targets,x,y,.047,.014);
    }
  }
  // The flange, telescoping mast, electrical box and rotating optical head form one instrument.
  const mast=new T.Group(),head=new T.Group(),turret=new T.Group();sensor.add(mast,head);head.add(turret);
  cyl(.25,.026,'edge',sensor,[0,0,.016],'z','lidar');ring(.22,.006,'blue',sensor,[0,0,.031]);
  // A bored mounting collar allows the telescoping stem to retract into the laboratory table.
  ring(.065,.013,'steel',sensor,[0,0,.033]);cyl(.05,.009,'rubber',sensor,[0,0,.032]);
  for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;screw(sensor,.18*Math.cos(a),.18*Math.sin(a),.037,.021);}
  const outerMast=cyl(.075,.22,'steel',sensor,[0,0,.18],'z','lidar'),mastCollar=cyl(.095,.032,'navy',sensor,[0,0,.285]);
  box(.18,.17,.075,'white',sensor,[-.27,.18,.048],'lidar');box(.19,.18,.012,'edge',sensor,[-.27,.18,.091]);
  for(const x of[-.34,-.20])for(const y of[.12,.24])screw(sensor,x,y,.103,.012);
  cyl(.027,.065,'steel',sensor,[-.385,.18,.048],'x');cyl(.03,.045,'rubber',sensor,[-.43,.18,.048],'x');
  const cableCurve=new T.CatmullRomCurve3([new T.Vector3(-.45,.18,.048),new T.Vector3(-.49,.09,.035),new T.Vector3(-.40,-.16,.024),new T.Vector3(-.23,-.24,.018)]);mesh(new T.TubeGeometry(cableCurve,24,.013,8,false),'navy',sensor);
  const innerMast=cyl(.051,1,'chrome',mast,[0,0,.5],'z','lidar');
  cyl(.091,.020,'steel',head,[0,0,-.090]);cyl(.16,.017,'edge',head,[0,0,-.077]);
  cyl(.20,.022,'navy',head,[0,0,-.074],'z','lidar');ring(.19,.008,'chrome',head,[0,0,-.084]);
  for(let i=0;i<40;i++){const a=i*Math.PI/20,b=box(.009,.025,.013,'steel',head,[.198*Math.cos(a),.198*Math.sin(a),-.074]);b.rotation.z=a;}
  cyl(.233,.041,'white',turret,[0,0,-.069],'z','lidar');cyl(.224,.124,'glass',turret,[0,0,.008],'z','lidar');
  ring(.227,.011,'chrome',turret,[0,0,-.047]);ring(.227,.011,'chrome',turret,[0,0,.07]);
  cyl(.245,.080,'blue',turret,[0,0,.116],'z','lidar');cyl(.20,.014,'white',turret,[0,0,.164],'z','lidar');
  for(let i=0;i<6;i++){const a=i*Math.PI/3;screw(turret,.173*Math.cos(a),.173*Math.sin(a),.177,.016);const slit=box(.08,.012,.005,'navy',turret,[.10*Math.cos(a+.25),.10*Math.sin(a+.25),.173]);slit.rotation.z=a+.25;}
  // Apertures face local +X. The ray origin is exactly the head's optical center.
  for(const y of[-.063,.063]){box(.028,.088,.094,'navy',turret,[.222,y,.008],'lidar');cyl(.031,.018,'lens',turret,[.242,y,.008],'x','lidar');ring(.033,.005,'chrome',turret,[.253,y,.008],'x');}
  const status=new T.Mesh(new T.SphereGeometry(.015,12,8),new T.MeshStandardMaterial({color:0x74d6e0,emissive:0x28bdd3,emissiveIntensity:.65}));status.position.set(-.1,-.12,.17);turret.add(status);
  const lock=cyl(.055,.06,'navy',sensor,[0,-.12,.28],'y','lidar'),lockShaft=cyl(.022,.12,'steel',sensor,[0,-.063,.28],'y');
  planeLabel('LIDAR',.23,.08,turret,[0,0,.174],'#326da2');
  const worldAxes=new T.Group();worldAxes.position.set(-3.05,-1.80,.035);root.add(worldAxes);
  const bodyAxes=new T.Group();sensor.add(bodyAxes);
  for(const [d,color]of[[[1,0,0],0x367ed5],[[0,1,0],0x35a8b7],[[0,0,1],0x8296cf]]){worldAxes.add(new T.ArrowHelper(new T.Vector3(...d),new T.Vector3(),.47,color,.08,.045));bodyAxes.add(new T.ArrowHelper(new T.Vector3(...d),new T.Vector3(),.33,color,.06,.033));}
  for(const [txt,pos,col]of[['X',[.56,0,.02],'#367ed5'],['Y',[0,.56,.02],'#35a8b7'],['Z',[0,0,.57],'#8296cf']]){const c=document.createElement('canvas');c.width=c.height=80;const cx=c.getContext('2d');cx.fillStyle=col;cx.font='bold 52px Arial';cx.textAlign='center';cx.fillText(txt,40,58);const tx=new T.CanvasTexture(c);const s=new T.Sprite(new T.SpriteMaterial({map:tx,depthTest:true}));s.position.set(...pos);s.scale.set(.14,.14,.14);worldAxes.add(s);}
  // The point renderer retains a source-index map even when a large file is decimated for display.
  const cloudGeometry=new T.BufferGeometry(),cloudMaterial=new T.PointsMaterial({size:2.2,sizeAttenuation:false,vertexColors:true,transparent:true,opacity:.96,depthWrite:false});
  const dotCanvas=document.createElement('canvas');dotCanvas.width=dotCanvas.height=32;const dotCtx=dotCanvas.getContext('2d');dotCtx.fillStyle='white';dotCtx.beginPath();dotCtx.arc(16,16,15,0,Math.PI*2);dotCtx.fill();cloudMaterial.map=new T.CanvasTexture(dotCanvas);cloudMaterial.alphaTest=.30;
  const cloud=new T.Points(cloudGeometry,cloudMaterial);cloud.renderOrder=3;cloudRoot.add(cloud);
  const selected=new T.Group();cloudRoot.add(selected);
  const selectionMaterial=new T.MeshBasicMaterial({color:0xf0a858,transparent:true,opacity:.94,depthTest:false});
  const rayMaterial=new T.LineBasicMaterial({color:0x287fed,transparent:true,opacity:.83,depthTest:true}),rayGeometry=new T.BufferGeometry();rayGeometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3));const beam=new T.Line(rayGeometry,rayMaterial);beam.renderOrder=5;explanation.add(beam);
  const pulseDot=mesh(new T.SphereGeometry(.034,16,12),new T.MeshBasicMaterial({color:0x4bd3ec}),explanation);pulseDot.castShadow=false;pulseDot.renderOrder=6;
  const hitDot=mesh(new T.SphereGeometry(.034,16,12),new T.MeshBasicMaterial({color:0x347eff}),explanation);hitDot.castShadow=false;hitDot.renderOrder=5;
  let sourcePoints=[],displayIndices=[],displayRanks=[],validCount=0,drawCount=0,geometryBuilds=0,cloudCache=null,lastSelectionKey=null,source='simulation',normalization={scale:1,offset:[0,0,0]},sourceBounds=null,colorMode='height',rayState=null,sensorState={},viewMode='hybrid',truthVisible=true,axesVisible=true,theme='light',pointSize=2.2;
  let desired={az:-2.16,el:.55,r:12.2,tx:0,ty:0,tz:.67},current={...desired},pointer=null,moved=false,pinch=null;
  const presets={iso:{az:-2.16,el:.55},front:{az:-Math.PI/2,el:.18},side:{az:Math.PI,el:.17},top:{az:-Math.PI/2,el:1.53}};
  const pointXYZ=p=>p?.point||p?.xyz||(Array.isArray(p)?p:[p?.x,p?.y,p?.z]);
  const sourceName=value=>typeof value==='string'?value:(value?.kind||value?.type||value?.id||'simulation');
  function applyPresentation(){const imported=!isTeachingSource(source);targets.visible=!imported&&truthVisible&&viewMode!=='cloud';sensor.visible=!imported&&viewMode!=='cloud';stationRoot.visible=!imported;cloud.visible=viewMode!=='solid';cloudMaterial.size=pointSize+(viewMode==='cloud'?.3:0);explanation.visible=!imported&&viewMode!=='cloud';worldAxes.visible=axesVisible;bodyAxes.visible=axesVisible;}
  function isTeachingSource(value){const s=sourceName(value).toLowerCase();return !/(import|sample|real|实测|导入|stanford|bunny)/.test(s);}
  function normalized(p){return normalization.base?p.map((v,i)=>(v/normalization.base-normalization.offset[i]/normalization.base)*normalization.factor):p.map((v,i)=>(v-normalization.offset[i])*normalization.scale);}
  function colorFor(p,i,lo,hi){const point=pointXYZ(p),c=new T.Color();if(colorMode==='rgb'&&p.rgb?.length>=3&&p.rgb.every(Number.isFinite)){const a=p.rgb;c.setRGB(a[0]/255,a[1]/255,a[2]/255,T.SRGBColorSpace);return c;}
    if(colorMode==='station'||colorMode==='source'){const id=p.station||p.position||p.source||p.settings?.position;if(id==='A'||id==='B'||id===0||id===1)return c.set(id==='B'||id===1?0x37b7c8:0x2b75df);}
    const hasRange=colorMode==='range'&&Number.isFinite(p.distance),val=hasRange?p.distance:point[2],u=Math.max(0,Math.min(1,(val-lo)/(hi-lo||1)));const a=new T.Color(hasRange?0x2456c6:0x2663ce),b=new T.Color(hasRange?0x64d3d7:0x5fcbd7);return a.lerp(b,u);
  }
  function setCloud(points=[],options={}){
    sourcePoints=points;source=options.source??source;colorMode=options.colorMode||colorMode;if(Number.isFinite(options.pointSize))pointSize=Math.max(1,Math.min(5,options.pointSize));
    const rebuild=!cloudCache||cloudCache.points!==points||cloudCache.source!==sourceName(source)||cloudCache.colorMode!==colorMode;
    if(rebuild){
    const valid=[];const mn=[Infinity,Infinity,Infinity],mx=[-Infinity,-Infinity,-Infinity];let metricMin=Infinity,metricMax=-Infinity;
    for(let i=0;i<points.length;i++){const p=pointXYZ(points[i]);if(!p||p.length<3||!p.every(Number.isFinite))continue;valid.push(i);for(let j=0;j<3;j++){mn[j]=Math.min(mn[j],p[j]);mx[j]=Math.max(mx[j],p[j]);}const v=colorMode==='range'&&Number.isFinite(points[i].distance)?points[i].distance:p[2];metricMin=Math.min(metricMin,v);metricMax=Math.max(metricMax,v);}
    sourceBounds=valid.length?{min:mn,max:mx}:null;
    normalization=isTeachingSource(source)?{scale:1,offset:[0,0,0]}:{scale:valid.length?Math.min(6.15/(mx[0]-mn[0]||1),4.05/(mx[1]-mn[1]||1),2.65/(mx[2]-mn[2]||1)):1,offset:valid.length?[mn[0]/2+mx[0]/2,mn[1]/2+mx[1]/2,mn[2]]:[0,0,0]};
    // Extreme but finite imported coordinates also get a finite display transform.
    if(valid.length&&!isTeachingSource(source)&&(!Number.isFinite(normalization.scale)||normalization.scale<=0)){const base=Math.max(...mn.map(Math.abs),...mx.map(Math.abs),1),ext=mx.map((v,i)=>v/base-mn[i]/base),factor=Math.min(6.15/(ext[0]||1),4.05/(ext[1]||1),2.65/(ext[2]||1));normalization={...normalization,scale:factor/base,base,factor};}
    validCount=valid.length;const displayed=Math.min(30000,validCount);
    displayIndices=[];displayRanks=[];for(let i=0;i<displayed;i++){const rank=displayed===1?0:Math.floor(i*(validCount-1)/(displayed-1));displayRanks.push(rank);displayIndices.push(valid[rank]);}
    const positions=new Float32Array(displayed*3),colors=new Float32Array(displayed*3);
    for(let i=0;i<displayed;i++){const p=points[displayIndices[i]],q=normalized(pointXYZ(p)),c=colorFor(p,displayIndices[i],metricMin,metricMax);positions.set(q,i*3);colors.set([c.r,c.g,c.b],i*3);}
    cloudGeometry.setAttribute('position',new T.BufferAttribute(positions,3));cloudGeometry.setAttribute('color',new T.BufferAttribute(colors,3));cloudGeometry.computeBoundingSphere();
    cloudCache={points,source:sourceName(source),colorMode};geometryBuilds++;lastSelectionKey=null;
    }
    const limit=Number.isFinite(options.visibleCount)?Math.max(0,Math.min(validCount,Math.floor(options.visibleCount))):validCount;
    let lo=0,hi=displayRanks.length;while(lo<hi){const mid=(lo+hi)>>>1;if(displayRanks[mid]<limit)lo=mid+1;else hi=mid;}drawCount=lo;cloudGeometry.setDrawRange(0,drawCount);
    const selectionKey=(options.selectedIndices||[]).join(',');if(selectionKey!==lastSelectionKey){for(const o of [...selected.children]){selected.remove(o);o.geometry.dispose();}
    for(const index of options.selectedIndices||[]){const p=points[index];if(!p)continue;const q=pointXYZ(p);if(!q?.every(Number.isFinite))continue;const mark=new T.Mesh(new T.SphereGeometry(.065,16,12),selectionMaterial);mark.position.set(...normalized(q));selected.add(mark);}lastSelectionKey=selectionKey;}
    applyPresentation();callbacks.wake?.();
  }
  function setSensor(value={}){sensorState={...sensorState,...value};const pos=value.position??sensorState.position??'A',origin=M.sensorOrigin?M.sensorOrigin({position:pos,height:sensorState.height??.7}):[...(M.POSITIONS?.[pos]||[-2.3,-.6]),sensorState.height??.7];sensor.position.set(origin[0],origin[1],0);head.position.z=origin[2];const bottom=.034,end=Math.max(bottom,origin[2]-.10),outerTop=Math.min(end,.28),outerHeight=Math.max(0,outerTop-bottom);outerMast.visible=mastCollar.visible=lock.visible=lockShaft.visible=outerHeight>.045;outerMast.scale.y=Math.max(.001,outerHeight);outerMast.position.z=(outerTop+bottom)/2;mastCollar.position.z=outerTop;lock.position.z=lockShaft.position.z=Math.max(.06,outerTop-.024);const start=Math.max(bottom,outerTop-.018);innerMast.visible=end>start;innerMast.scale.y=Math.max(.001,end-start);innerMast.position.z=(start+end)/2;turret.rotation.z=(sensorState.azimuth||0)*Math.PI/180;bodyAxes.position.z=origin[2];bodyAxes.rotation.z=turret.rotation.z;callbacks.wake?.();}
  function setRay(value,pulse=0){rayState=value;beam.visible=Boolean(value);pulseDot.visible=Boolean(value);hitDot.visible=Boolean(value?.hit&&value?.point);if(!value){callbacks.wake?.();return;}
    const origin=value.origin||[0,0,0],end=value.truthPoint||value.point||(value.direction||[1,0,0]).map((v,i)=>origin[i]+v*(value.maxRange||12)),a=rayGeometry.attributes.position.array;a.set(origin,0);a.set(end,3);rayGeometry.attributes.position.needsUpdate=true;rayGeometry.computeBoundingSphere();
    const progress=typeof pulse==='number'?pulse:(pulse?.progress??0),u=Math.max(0,Math.min(1,progress<=1?progress:2-progress));pulseDot.position.set(...origin.map((v,i)=>v+(end[i]-v)*u));pulseDot.material.color.set(progress>1?0x7ccadd:0x38b9f2);
    if(value.hit&&value.point)hitDot.position.set(...(value.truthPoint||value.point));rayMaterial.opacity=value.hit?.82:.38;callbacks.wake?.();
  }
  function setPresentation(options={}){viewMode=options.viewMode||viewMode;if('truthVisible'in options)truthVisible=options.truthVisible;if('axes'in options)axesVisible=options.axes;applyPresentation();callbacks.wake?.();}
  function setView(id='iso',immediate=false){Object.assign(desired,presets[id]||presets.iso,{r:12.2,tx:0,ty:0,tz:.67});if(immediate)current={...desired};callbacks.wake?.();}
  function setTheme(value){theme=value;const dark=value==='dark';scene.background=new T.Color(dark?0x0b1523:0xf5f8fd);scene.fog=new T.Fog(scene.background,24,75);studioFloor.material.color.set(dark?0x060d17:0xf5f8fd);studioGrid.material.opacity=dark?.06:.22;cloudMaterial.opacity=dark?1:.94;callbacks.wake?.();}
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();callbacks.wake?.();}
  const ro=new ResizeObserver(resize);ro.observe(host);
  const raycaster=new T.Raycaster(),mouse=new T.Vector2();
  function pickAt(clientX,clientY){const rect=host.getBoundingClientRect();mouse.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);raycaster.params.Points.threshold=Math.max(.045,current.r*Math.max(1,1.13/camera.aspect)*.631*(rect.width<600?8:5)/rect.height);
    if(cloud.visible){const hits=raycaster.intersectObject(cloud,false);if(hits.length){const solid=targets.visible?raycaster.intersectObjects(targetMeshes,false)[0]:null;if(!solid||hits[0].distance<=solid.distance+.06){const index=displayIndices[hits[0].index];callbacks.onPoint?.(index,sourcePoints[index]);return;}}}
    const visible=pickables.filter(o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;});const hit=raycaster.intersectObjects(visible,false)[0];if(hit)callbacks.onPart?.(hit.object.userData.part);
  }
  host.addEventListener('pointerdown',e=>{if(e.target!==renderer.domElement)return;host.focus?.({preventScroll:true});pointer={x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,id:e.pointerId};moved=false;host.setPointerCapture(e.pointerId);});
  host.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer.x=e.clientX;pointer.y=e.clientY;moved||=Math.hypot(e.clientX-pointer.sx,e.clientY-pointer.sy)>4;desired.az-=dx*.007;desired.el=Math.max(.07,Math.min(1.54,desired.el+dy*.005));callbacks.wake?.();});
  host.addEventListener('pointerup',e=>{if(!pointer)return;if(!moved)pickAt(e.clientX,e.clientY);pointer=null;});host.addEventListener('pointercancel',()=>pointer=null);
  host.addEventListener('wheel',e=>{e.preventDefault();desired.r=Math.max(5.5,Math.min(24,desired.r*Math.exp(e.deltaY*.0007)));callbacks.wake?.();},{passive:false});
  host.addEventListener('touchstart',e=>{if(e.touches.length===2){pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);pointer=null;}},{passive:true});
  host.addEventListener('touchmove',e=>{if(e.touches.length!==2||!pinch)return;e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);desired.r=Math.max(5.5,Math.min(24,desired.r*pinch/d));pinch=d;callbacks.wake?.();},{passive:false});host.addEventListener('touchend',()=>pinch=null);
  function render(dt=1/60,reduced=false){let moving=false;const ease=reduced?1:1-Math.exp(-Math.min(dt,.05)*12);for(const k of Object.keys(current)){const d=desired[k]-current[k];if(Math.abs(d)>.0001)moving=true;current[k]+=d*ease;}
    const r=current.r*Math.max(1,1.13/camera.aspect),target=new T.Vector3(current.tx,current.ty,current.tz);camera.position.set(target.x+r*Math.cos(current.el)*Math.cos(current.az),target.y+r*Math.cos(current.el)*Math.sin(current.az),target.z+r*Math.sin(current.el));camera.lookAt(target);renderer.render(scene,camera);return moving;
  }
  function stats(){scene.updateMatrixWorld(true);const projected={min:[Infinity,Infinity],max:[-Infinity,-Infinity]};for(const o of parts){let inRoot=false,visible=true;for(let p=o;p;p=p.parent){if(!p.visible)visible=false;if(p===root)inRoot=true;}if(!inRoot||!visible)continue;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const v=new T.Vector3(x,y,z).applyMatrix4(o.matrixWorld).project(camera);projected.min[0]=Math.min(projected.min[0],v.x);projected.min[1]=Math.min(projected.min[1],v.y);projected.max[0]=Math.max(projected.max[0],v.x);projected.max[1]=Math.max(projected.max[1],v.y);}}return{available:true,meshes:parts.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,points:sourcePoints.length,displayed:drawCount,allocatedPoints:displayIndices.length,geometryBuilds,pointSize:cloudMaterial.size,source:sourceName(source),normalization,sourceBounds,sensor:{...sensorState,opticalCenter:head.getWorldPosition(new T.Vector3()).toArray()},ray:rayState?{hit:rayState.hit,origin:rayState.origin,end:rayState.truthPoint||rayState.point}:null,viewMode,truthVisible,axes:axesVisible,theme,camera:camera.position.toArray(),projectedBounds:projected,environmentIds:environmentObjects.map(o=>o.id),displayIndices:displayIndices.slice(0,drawCount)};}
  resize();setSensor({position:'A',height:.7});setRay(null);setTheme('light');applyPresentation();
  return{setCloud,setRay,setSensor,setPresentation,setView,resetView:()=>setView('iso'),setTheme,render,resize,stats,dispose(){ro.disconnect();cloudGeometry.dispose();rayGeometry.dispose();renderer.dispose();environment.dispose();}};
}
