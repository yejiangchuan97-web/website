/* Anatomy-informed solid teaching apparatus. Genuine depth-buffered 3D, millimetres, Z up.
 * The SVG fallback is supplied by the page. This renderer does not claim kit turn-audit coverage. */
class MasonryScene {
  constructor(host,{onPick}={}) {
    this.host=host;this.onPick=onPick;this.mode='manual';this.platform='fixed';this.dark=false;this.explode=0;
    this.yaw=-1.08;this.pitch=.7;this.zoom=1;this.view='iso';this.pickables=[];this.geometries=new Map();this.partCount=0;
    this.target=new THREE.Vector3(0,0,100);this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-800,800,600,-600,1,10000);this.camera.up.set(0,0,1);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor(0,0);
    this.renderer.domElement.setAttribute('aria-label','可旋转的砌筑三维教学台');this.renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none;';host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x6c7c94,2.0));
    const light=new THREE.DirectionalLight(0xffffff,2.6);light.position.set(-900,-1100,1800);light.castShadow=true;
    Object.assign(light.shadow.camera,{left:-1500,right:1500,top:1500,bottom:-1500,near:10,far:5000});light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=1.7;light.shadow.bias=-.00012;this.scene.add(light);
    const fill=new THREE.DirectionalLight(0xdce8fa,.8);fill.position.set(1000,800,700);this.scene.add(fill);
    this.mat={};for(const k of ['base','lo','mid','hi','steel','ink','rubber','brick','lit','mortar','glass'])this.mat[k]=new THREE.MeshStandardMaterial({roughness:k==='rubber'?.98:k==='brick'?.87:.49,metalness:k==='steel'?.57:k==='brick'||k==='mortar'?0:.13});
    this.mat.ghost=new THREE.MeshStandardMaterial({color:0x7395bf,transparent:true,opacity:.20,depthWrite:false,roughness:.9});
    this.mat.slot=new THREE.MeshStandardMaterial({color:0xadc4df,transparent:true,opacity:.65,roughness:.9});
    this.edgeMat=new THREE.LineBasicMaterial({color:0x3b536e,transparent:true,opacity:.25});
    this.floor=new THREE.Mesh(new THREE.PlaneGeometry(7000,7000),new THREE.ShadowMaterial({opacity:.12}));this.floor.position.z=-133;this.floor.receiveShadow=true;this.scene.add(this.floor);
    this.manualRoot=this.group(this.scene);this.robotRoot=this.group(this.scene);this.makeRobot();this.robotRoot.visible=false;
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.bind();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.setTheme(false);this.resize();
  }
  clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  group(parent,name=''){const g=new THREE.Group();g.name=name;parent.add(g);return g;}
  geo(key,make){if(!this.geometries.has(key))this.geometries.set(key,make());return this.geometries.get(key);}
  box(w,d,h,x,y,z,mat='mid',parent=this.manualRoot,name='',bevel=1.2){
    w=Math.max(.2,w);d=Math.max(.2,d);h=Math.max(.15,h);
    const b=Math.min(bevel,w/8,d/8,h/4),key=`b:${w}:${d}:${h}:${b}`;
    const geo=this.geo(key,()=>{if(b<=0)return new THREE.BoxGeometry(w,d,h).translate(0,0,h/2);
      const s=new THREE.Shape(),a=w/2-b,c=d/2-b;s.moveTo(-a,-d/2);s.lineTo(a,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-c);s.lineTo(w/2,c);s.quadraticCurveTo(w/2,d/2,a,d/2);s.lineTo(-a,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,c);s.lineTo(-w/2,-c);s.quadraticCurveTo(-w/2,-d/2,-a,-d/2);
      return new THREE.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:0,bevelSegments:2,curveSegments:3,steps:1}).translate(0,0,b);});
    const q=new THREE.Mesh(geo,this.mat[mat]||this.mat.mid);q.position.set(x,y,z);q.castShadow=mat!=='ghost'&&mat!=='slot';q.receiveShadow=true;q.name=name;q.userData.material=mat;parent.add(q);this.partCount++;return q;
  }
  cyl(r,h,x,y,z,mat='mid',parent=this.manualRoot,name='',axis='z',n=32){
    const geo=this.geo(`c:${r}:${h}:${n}`,()=>new THREE.CylinderGeometry(r,r,h,n).rotateX(Math.PI/2).translate(0,0,h/2));
    const q=new THREE.Mesh(geo,this.mat[mat]);q.position.set(x,y,z);q.castShadow=true;q.receiveShadow=true;q.name=name;q.userData.material=mat;if(axis==='y')q.rotation.x=-Math.PI/2;if(axis==='x')q.rotation.y=Math.PI/2;parent.add(q);this.partCount++;return q;
  }
  bolt(x,y,z,parent,r=5){this.cyl(r*1.4,1.6,x,y,z,'lo',parent,'washer', 'z',16);this.cyl(r,4.5,x,y,z+1.6,'steel',parent,'bolt','z',6);}
  meshCount(g){let n=0;g.traverse(o=>{if(o.isMesh)n++;});return n;}
  clear(g){while(g.children.length)g.remove(g.children[0]);}
  setTheme(dark){this.dark=!!dark;
    const colors=dark?{base:0x29394c,lo:0x5e728b,mid:0x8d9fb2,hi:0xd6e0ea,steel:0xa6b9c9,ink:0x132238,rubber:0x121b2a,brick:0xa6aeb8,lit:0x84b5ff,mortar:0x536477,glass:0x233a57}:{base:0xc4ced8,lo:0x788b9e,mid:0xa2b2c2,hi:0xe2e7ed,steel:0xb9c8d4,ink:0x30475e,rubber:0x263647,brick:0xd2d0ca,lit:0x4b82c9,mortar:0xa5adb3,glass:0x5a7898};
    for(const key of Object.keys(colors))this.mat[key].color.setHex(colors[key]);this.mat.ghost.color.setHex(dark?0xa0c5fa:0x4c7db7);this.mat.slot.color.setHex(dark?0x6685ac:0xadc4df);this.edgeMat.color.setHex(dark?0xc0d0e0:0x3b536e);this.floor.material.opacity=dark?.23:.12;this.draw();
  }
  bind(){let dragging=false,lastX=0,lastY=0,distance=0;
    this.host.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;distance=0;lastX=e.clientX;lastY=e.clientY;this.host.setPointerCapture(e.pointerId);});
    this.host.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;distance+=Math.abs(dx)+Math.abs(dy);this.yaw-=dx*.006;this.pitch=this.clamp(this.pitch+dy*.005,.12,Math.PI/2-.001);this.view='orbit';lastX=e.clientX;lastY=e.clientY;this.draw();});
    this.host.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;if(distance<6)this.pick(e);if(this.host.hasPointerCapture(e.pointerId))this.host.releasePointerCapture(e.pointerId);});
    this.host.addEventListener('pointercancel',()=>{dragging=false;});
    this.host.addEventListener('wheel',e=>{e.preventDefault();this.zoomBy(Math.exp(-e.deltaY*.001));},{passive:false});
    this.host.addEventListener('keydown',e=>{if(e.target!==this.host)return;let used=true;if(e.key==='ArrowLeft')this.yaw-=.12;else if(e.key==='ArrowRight')this.yaw+=.12;else if(e.key==='ArrowUp')this.pitch=this.clamp(this.pitch+.1,.12,1.57);else if(e.key==='ArrowDown')this.pitch=this.clamp(this.pitch-.1,.12,1.57);else if(e.key==='Home')this.resetView();else if(e.key==='+'||e.key==='=')this.zoomBy(1.1);else if(e.key==='-')this.zoomBy(.9);else used=false;if(used){e.preventDefault();e.stopPropagation();this.draw();}});
  }
  pick(e){const r=this.host.getBoundingClientRect();this.pointer.set(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.pickables,false);for(const hit of hits){let p=hit.object,visible=true;while(p){visible=visible&&p.visible;p=p.parent;}if(visible){if(this.onPick)this.onPick(hit.object.userData.pickId);return;}}}
  resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.draw();}
  setMode(mode){if(!['manual','issues','robot'].includes(mode))mode='manual';const changed=this.mode!==mode;this.mode=mode;this.manualRoot.visible=mode!=='robot';this.robotRoot.visible=mode==='robot';this.floor.position.z=mode==='robot'?-133:-74;if(changed)this.resetView();else this.draw();}
  setView(view){this.view=view;this.zoom=1;this.yaw=-1.08;this.pitch=this.mode==='robot'?.55:.7;if(view==='top'){this.yaw=-Math.PI/2;this.pitch=Math.PI/2-.001;}else if(view==='front'){this.yaw=-Math.PI/2;this.pitch=.12;}else if(view==='detail'){this.yaw=-1.15;this.pitch=.53;}this.draw();}
  resetView(){this.setView('iso');}
  zoomBy(f){this.zoom=this.clamp(this.zoom*f,.65,3.6);this.draw();}
  setExplode(value){this.explode=this.clamp(Number(value)||0,0,1);if(this.lastManual)this.applyManualExplode();for(const g of this.jawCovers||[])g.position.x=g.userData.side*this.explode*40;this.draw();}
  applyManualExplode(){for(const g of this.manualCourses||[])g.position.z=g.userData.course*this.explode*90;this.manualBounds=this.boundsOf(this.manualRoot);this.manualFramePoints=this.pointsOf(this.manualRoot);}
  boundsOf(root){root.updateMatrixWorld(true);const box=new THREE.Box3();root.traverse(o=>{if(!o.isMesh)return;let p=o;while(p&&p!==root){if(!p.visible)return;p=p.parent;}if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));});return box;}
  pointsOf(root,includeHidden=false){root.updateMatrixWorld(true);const points=[];root.traverse(o=>{if(!o.isMesh)return;if(!includeHidden){let p=o;while(p&&p!==root){if(!p.visible)return;p=p.parent;}}if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).applyMatrix4(o.matrixWorld);points.push([p.x,p.y,p.z]);}});return points;}
  setPlatform(platform){this.platform=platform==='mobile'?'mobile':'fixed';this.mobileParts.visible=this.platform==='mobile';this.fixedParts.visible=this.platform!=='mobile';this.draw();}
  setManual(data={}){
    this.lastManual=data;this.clear(this.manualRoot);this.pickables=[];this.manualCourses=[];
    const bricks=data.bricks||[],width=data.width||240,length=data.length||Math.max(740,...bricks.map(b=>b.x+b.w)),w=length+170,d=Math.max(width+180,480),mortar=Number.isFinite(+data.mortar)?+data.mortar:10;
    this.manualDimensions={length,width,w,d,height:Math.max(140,...bricks.map(b=>b.z+b.h))};
    const root=this.manualRoot;
    for(const x of[-w/2+65,w/2-65])for(const y of[-d/2+55,d/2-55]){this.cyl(24,14,x,y,-72,'rubber',root);this.cyl(17,23,x,y,-58,'lo',root);}
    this.box(w,d,32,0,0,-35,'base',root,'base',7);this.box(w-6,d-6,3,0,0,-3,'hi',root,'working-surface',2);
    for(const x of[-w/2+20,w/2-20])for(const y of[-d/2+20,d/2-20])this.bolt(x,y,0,root,4);
    const ry=-d/2+21;this.box(length+50,18,2,0,ry,0,'lo',root,'ruler-strip',1);
    for(let i=0;i<=24;i++){const major=i%4===0,len=major?14:8;this.box(1.5,len,.5,-length/2+i*length/24,ry-9+len/2,2,'hi',root,'ruler-tick',0);}
    this.box(164,26,1.5,0,ry+32,0,'hi',root,'wall-direction-plate',1);
    if(!this.directionMaterial){const c=document.createElement('canvas');c.width=640;c.height=104;const ctx=c.getContext('2d');ctx.fillStyle='#e2e7ed';ctx.fillRect(0,0,640,104);ctx.fillStyle='#30475e';ctx.font='600 51px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('墙长方向  →',320,52);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;this.directionMaterial=new THREE.MeshBasicMaterial({map:tex,polygonOffset:true,polygonOffsetFactor:-1});}
    const directionFace=new THREE.Mesh(this.geo('wall-direction-face',()=>new THREE.PlaneGeometry(160,26)),this.directionMaterial);directionFace.position.set(0,ry+32,1.6);root.add(directionFace);
    for(const x of[-length/2-12,length/2+12])this.box(12,30,10,x,width/2+28,0,'mid',root,'end-guide',1);
    this.box(length+3,2,0.4,0,-width/2-7,0,'lo',root,'wall-front-datum',0);
    for(const x of[-length/2,length/2])this.box(2,width+30,.4,x,0,0,'lo',root,'wall-end-datum',0);
    const content=this.group(root,'wall-content');content.position.set(-length/2,-width/2,0);
    const courseGroups=new Map();
    for(const b of bricks){const course=b.course??Math.max(0,Math.round((b.z||0)/(53+mortar)));if(!courseGroups.has(course)){const g=this.group(content,`course-${course}`);g.userData.course=course;courseGroups.set(course,g);this.manualCourses.push(g);}const group=courseGroups.get(course);
      const m=b.selected?'lit':b.kind==='cut'?'mid':'brick';const q=this.box(b.w,b.d,b.h,b.x+b.w/2,b.y+b.d/2,b.z,m,group,b.id||'brick',1.1);q.userData.pickId=b.id;this.pickables.push(q);
      const bed=Number.isFinite(+b.mortar)?+b.mortar:mortar;
      if(b.z>0)this.box(b.w,b.d,Math.min(bed,b.z),b.x+b.w/2,b.y+b.d/2,b.z-Math.min(bed,b.z),'mortar',group,'bed-joint',0);
    }
    const occupied=new Set(bricks.flatMap(b=>[b.id,b.slot]));
    for(const slot of data.slots||[]){if(occupied.has(slot.id)||slot.filled)continue;const q=this.box(slot.w,slot.d,1.8,slot.x+slot.w/2,slot.y+slot.d/2,slot.z+.3,'slot',content,slot.id,1);q.userData.pickId=slot.id;this.pickables.push(q);}
    if(data.ghost){const b=data.ghost;const q=this.box(b.w,b.d,b.h,b.x+b.w/2,b.y+b.d/2,b.z,'ghost',content,b.id||'ghost',1.1);q.userData.pickId=b.id||'ghost';this.pickables.push(q);}
    for(const seam of data.seams||[]){
      // A narrow solid insert occupies only the actual open joint interval.
      this.box(Math.min(3,seam.w),seam.d,Math.max(1,seam.h),seam.x,seam.y+seam.d/2,seam.z,'lit',content,'aligned-joint',0);
    }
    // A real square and level resting beside the trial wall, rather than floating dimensions.
    this.box(145,10,11,w/2-110,d/2-30,0,'lo',root,'square-long');this.box(10,80,11,w/2-177,d/2-65,0,'lo',root,'square-short');
    this.box(85,19,12,-w/2+75,d/2-30,0,'mid',root,'spirit-level');this.box(27,10,1,-w/2+75,d/2-30,12,'glass',root,'level-window',1);
    this.applyManualExplode();this.draw();
  }
  makeRobot(){
    const r=this.robotRoot;
    this.box(1770,1060,32,0,-20,-35,'base',r,'chassis-plate',8);this.box(1758,1048,3,0,-20,-3,'hi',r,'chassis-top',.7);
    for(const x of[-810,810])for(const y of[-480,440])this.bolt(x,y,0,r,6);
    this.fixedParts=this.group(r,'fixed-anchors');this.mobileParts=this.group(r,'mobile-chassis');
    for(const x of[-770,770])for(const y of[-430,390]){
      this.cyl(45,16,x,y,-86,'rubber',this.fixedParts);this.cyl(25,35,x,y,-70,'steel',this.fixedParts);
      this.cyl(65,42,x,y-21,-65,'rubber',this.mobileParts,'wheel','y',40);this.cyl(30,44,x,y-22,-65,'mid',this.mobileParts,'hub','y');
      this.box(16,75,45,x,y,-43,'lo',this.mobileParts,'wheel-yoke');
      const fx=x>0?x+70:x-70;this.cyl(32,10,fx,y,-130,'rubber',this.mobileParts);this.cyl(11,87,fx,y,-120,'steel',this.mobileParts);this.box(78,24,16,(fx+x)/2,y,-35,'lo',this.mobileParts,'stabilizer');
    }
    this.mobileParts.visible=false;
    for(const x of[-735,735]){
      this.box(130,145,23,x,320,0,'lo',r,'post-foot',3);
      this.box(72,80,765,x,320,23,'mid',r,'column',4);
      this.box(60,68,5,x,320,788,'hi',r,'column-cap');
      for(const dx of[-46,46])this.bolt(x+dx,282,23,r,6);
      for(const side of[-1,1]){const brace=this.box(22,28,120,x+side*44,320,26,'lo',r,'gusset');brace.rotation.y=-side*.32;}
    }
    this.box(1582,100,82,0,320,793,'mid',r,'x-beam',5);
    for(const z of[804,852])this.box(1530,8,13,0,265,z,'steel',r,'x-rail',1);
    for(const x of[-775,775])this.box(15,112,96,x,320,787,'lo',r,'beam-end',2);
    this.xCarriage=this.group(r,'x-carriage');
    this.box(135,48,115,0,250,782,'hi',this.xCarriage,'x-saddle',3);
    for(const x of[-43,43])for(const z of[805,850])this.box(32,17,23,x,275,z,'lo',this.xCarriage,'x-bearing',2);
    for(const x of[-45,45])this.bolt(x,246,897,this.xCarriage,5);
    this.box(87,900,60,0,-75,897,'mid',this.xCarriage,'y-beam',3);
    for(const x of[-31,31])this.box(8,860,9,x,-75,957,'steel',this.xCarriage,'y-rail',1);
    for(const y of[-525,375])this.box(100,16,73,0,y,892,'lo',this.xCarriage,'y-end',2);
    this.yCarriage=this.group(this.xCarriage,'y-carriage');
    this.box(125,120,17,0,165,966,'hi',this.yCarriage,'y-saddle',2);
    for(const x of[-32,32])this.box(22,90,9,x,165,957,'lo',this.yCarriage,'y-bearing');
    this.box(76,38,821,0,165,145,'mid',this.yCarriage,'z-guide',3);
    for(const x of[-24,24])this.box(9,9,781,x,141,165,'steel',this.yCarriage,'z-rail',.8);
    for(const z of[145,950])this.box(88,48,16,0,165,z,'lo',this.yCarriage,'z-limit',2);
    this.zCarriage=this.group(this.yCarriage,'z-carriage');
    this.box(110,28,96,0,127,70,'hi',this.zCarriage,'z-saddle',2);
    this.box(88,150,20,0,65,87,'mid',this.zCarriage,'tool-arm',2);
    this.cyl(34,31,0,0,107,'steel',this.zCarriage,'rotation-motor');this.cyl(42,8,0,0,79,'lo',this.zCarriage,'bearing-flange');
    this.wrist=this.group(this.zCarriage,'rotating-gripper');
    this.box(139,112,16,0,0,63,'hi',this.wrist,'gripper-body',2);
    this.jawCovers=[];for(const side of[-1,1]){const cover=this.group(this.wrist,`jaw-cover-${side}`);cover.userData.side=side;this.box(7,156,23,side*76.5,0,63,'mid',cover,'cover-side',1);this.box(33,156,7,side*59.5,0,79,'hi',cover,'cover-top',1);for(const y of[-53,53])this.bolt(side*57,y,86,cover,3.6);this.jawCovers.push(cover);}
    for(const x of[-56,56])this.box(24,16,8,x,0,79,'lo',this.wrist,'jaw-guide-saddle');
    for(const x of[-56,56])this.cyl(4,168,x,-84,72,'steel',this.wrist,'jaw-guide','y',16);
    this.jaws=[];for(const side of[-1,1]){const jaw=this.group(this.wrist,side<0?'jaw-left':'jaw-right');jaw.userData.side=side;this.box(99,16,49,0,0,17,'mid',jaw,'jaw-finger',2);this.box(90,4,31,0,-side*10,21,'rubber',jaw,'jaw-pad',.7);this.jaws.push(jaw);}
    // Sensor sits on the moving carrier and observes the placed brick after retreat.
    this.box(38,35,20,63,0,87,'lo',this.zCarriage,'sensor-mount');this.box(36,39,31,83,0,107,'mid',this.zCarriage,'sensor-case',2);this.box(25,23,1,83,0,106,'glass',this.zCarriage,'sensor-window',.3);
    this.carriedBrick=this.box(240,115,53,0,0,0,'lit',r,'active-brick',1.2);
    // Separate support platform: the brick is supported until the gripper closes.
    for(const x of[-575,-285])for(const y of[-350,-170])this.box(24,24,47,x,y,0,'lo',r,'feed-leg',2);
    this.box(350,240,16,-430,-260,47,'mid',r,'feed-table',3);
    for(const y of[-342,-260,-178])this.box(330,49,11,-430,y,63,'hi',r,'pallet-board',1.2);
    for(const x of[-577,-283])this.box(14,220,24,x,-260,74,'lo',r,'feed-guide',1);
    this.box(240,115,53,-430,28,0,'brick',r,'spare-brick-1');this.box(240,115,53,-430,28,53,'brick',r,'spare-brick-2');
    // Two complete courses provide support for the target header. No neighbour blocks the jaws.
    for(const z of[0,63])this.box(740,240,10,310,110,z,'mortar',r,`bed-${z}`,0);
    for(const b of RobotModel.robotWall().bricks)this.box(b.w,b.d,b.h,b.x+b.w/2,b.y+b.d/2,b.z,'brick',r,b.id);
    this.targetBed=this.box(115,240,10,302.5,110,126,'mortar',r,'target-bed',0);
    // A flush target inset makes the planned position inspectable without floating guides.
    this.targetMarkers=this.group(r,'target-witness');for(const x of[245,360])for(const y of[-10,230])this.cyl(3,1,x,y,137,'lit',this.targetMarkers,'target-corner','z',16);
    const sx=-570,sy=230;this.box(240,160,6,sx,sy,0,'lo',r,'mortar-tray');for(const y of[sy-77,sy+77])this.box(240,6,27,sx,y,6,'mid',r);for(const x of[sx-117,sx+117])this.box(6,148,27,x,sy,6,'mid',r);this.box(224,144,10,sx,sy,6,'mortar',r);this.box(95,55,3,sx+20,sy,16,'steel',r,'trowel');this.box(13,55,17,sx+20,sy,19,'lo',r,'trowel-handle',3);
    this.box(420,18,2,400,-480,0,'lo',r,'base-ruler');for(let i=0;i<=20;i++){const h=i%5===0?14:8;this.box(1.3,h,.5,190+i*21,-489+h/2,2,'hi',r,'base-tick',0);}
    this.robotParts=this.meshCount(r);this.robotBounds=this.boundsOf(r);this.cacheRobotFraming();
  }
  cacheRobotFraming(){
    // Real part corners across reachable poses, cached once: animation never changes framing.
    const saved=this.robotState||RobotModel.robotAt(0),unique=new Map();
    for(const t of[0,1,2,3,3.5,4,5,6,7,8]){
      this.applyRobotPose(RobotModel.robotAt(t,{platform:'mobile',fault:'offset'}));
      for(const p of this.pointsOf(this.robotRoot,true)){const key=p.map(v=>Math.round(v*1000)).join(',');if(!unique.has(key))unique.set(key,p);}
    }
    this.robotFramePoints=[...unique.values()];this.applyRobotPose(saved);
  }
  applyRobotPose(state){if(!state)return;this.robotState=state;this.setPlatformQuiet(state.platform||this.platform);
    const p=state.tool;this.xCarriage.position.x=p.x;this.yCarriage.position.y=p.y;this.zCarriage.position.z=p.z;this.wrist.rotation.z=p.yaw;
    for(const jaw of this.jaws)jaw.position.y=jaw.userData.side*(69.5+p.open);
    const b=state.brick;this.carriedBrick.position.set(b.x,b.y,b.z);this.carriedBrick.rotation.z=b.yaw;
    const height=state.mortarHeight||10;this.targetBed.scale.z=height/10;this.targetMarkers.visible=!state.brick.placed;
  }
  updateRobot(state){this.applyRobotPose(state);this.draw();}
  setPlatformQuiet(p){this.platform=p==='mobile'?'mobile':'fixed';this.mobileParts.visible=this.platform==='mobile';this.fixedParts.visible=this.platform==='fixed';}
  draw(){if(!this.renderer||!this.camera)return;const rect=this.host.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const aspect=rect.width/rect.height,robot=this.mode==='robot';this.floor.position.z=robot?(this.platform==='mobile'?-130:-86):-72;
    let box=(robot?this.robotBounds:this.manualBounds)?.clone(),points=robot?this.robotFramePoints:this.manualFramePoints;
    if(!box||box.isEmpty())box=new THREE.Box3(new THREE.Vector3(-500,-300,-72),new THREE.Vector3(500,300,150));
    if(robot)box.min.z=this.platform==='mobile'?-130:-86;
    if(this.view==='detail'){
      if(robot){const p=this.robotState?.tool||{x:302.5,y:110,z:136};box=new THREE.Box3(new THREE.Vector3(p.x-225,p.y-200,Math.min(p.z,this.robotState?.brick?.z??p.z)-35),new THREE.Vector3(p.x+225,p.y+210,p.z+210));points=null;}
      else{const content=this.manualRoot.getObjectByName('wall-content');if(content){box=this.boundsOf(content);points=this.pointsOf(content);}}
    }
    const center=box.getCenter(new THREE.Vector3()),right=new THREE.Vector3(-Math.sin(this.yaw),Math.cos(this.yaw),0),up=new THREE.Vector3(-Math.cos(this.yaw)*Math.sin(this.pitch),-Math.sin(this.yaw)*Math.sin(this.pitch),Math.cos(this.pitch));
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    if(!points?.length){points=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])points.push([x,y,z]);}
    for(const p of points){const dx=p[0]-center.x,dy=p[1]-center.y,dz=p[2]-center.z,sx=dx*right.x+dy*right.y+dz*right.z,sy=dx*up.x+dy*up.y+dz*up.z;minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);}
    const padX=rect.width<500?18:30,padTop=28,padBottom=58,availableW=Math.max(80,rect.width-2*padX),availableH=Math.max(90,rect.height-padTop-padBottom),scale=Math.max((maxX-minX)/availableW,(maxY-minY)/availableH)*1.015,height=scale*rect.height;
    this.frameFit={points:points.length,widthPx:(maxX-minX)/scale,heightPx:(maxY-minY)/scale,hostWidth:rect.width,hostHeight:rect.height};
    this.target.copy(center).addScaledVector(right,(minX+maxX)/2).addScaledVector(up,(minY+maxY)/2+(padTop-padBottom)*scale/2);
    this.camera.left=-height*aspect/2;this.camera.right=height*aspect/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.zoom=this.zoom;
    const distance=4000;this.camera.position.set(this.target.x+distance*Math.cos(this.yaw)*Math.cos(this.pitch),this.target.y+distance*Math.sin(this.yaw)*Math.cos(this.pitch),this.target.z+distance*Math.sin(this.pitch));this.camera.lookAt(this.target);this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera);
  }
  snapshot(){return {mode:this.mode,platform:this.platform,view:this.view,yaw:this.yaw,pitch:this.pitch,zoom:this.zoom,explode:this.explode,parts:this.meshCount(this.mode==='robot'?this.robotRoot:this.manualRoot),robotParts:this.robotParts,bricks:this.lastManual?.bricks?.length||0,pickables:this.pickables.length,renderer:'three-solid-3d',units:'mm',fit:this.frameFit,drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
  dispose(){this.observer.disconnect();this.renderer.dispose();for(const geo of this.geometries.values())geo.dispose();for(const mat of Object.values(this.mat))mat.dispose();if(this.directionMaterial){this.directionMaterial.map.dispose();this.directionMaterial.dispose();}this.edgeMat.dispose();this.renderer.domElement.remove();}
}
window.MasonryScene=MasonryScene;
