/* Anatomy-style physical bench; genuine depth-buffered 3D, Z is up. */
class BenchScene{
 constructor(host,onPick){
  this.host=host;this.onPick=onPick;this.objects=[];this.groups={};this.mode='planet';this.cut=true;this.apart=0;this.partCount=0;this.theta=0;this.setting=8;this.yaw=-Math.PI/3;this.pitch=.88;this.zoom=1;this.target=new THREE.Vector3(0,0,25);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x50585c,2.25));
  const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(-100,-140,260);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:700});key.shadow.bias=-.0005;key.shadow.normalBias=.15;this.scene.add(key);const fill=new THREE.DirectionalLight(0xcfd8de,1.2);fill.position.set(160,100,120);this.scene.add(fill);
  this.camera=new THREE.OrthographicCamera(-150,150,100,-100,1,1200);this.camera.up.set(0,0,1);this.mat={};for(const name of ['base','lo','mid','hi','lit','rubber','ink','target'])this.mat[name]=new THREE.MeshStandardMaterial({roughness:name==='rubber'?.95:.4,metalness:name==='rubber'?0:.35});
  this.edgeMat=new THREE.LineBasicMaterial({color:0x303a3e,transparent:true,opacity:.17});this.floor=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.ShadowMaterial({opacity:.12}));this.floor.position.z=-12;this.floor.receiveShadow=true;this.scene.add(this.floor);
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.bind();new ResizeObserver(()=>this.resize()).observe(host);this.theme(false);
 }
 theme(dark){const c=dark?{base:0x303a41,lo:0x526169,mid:0x8e9a9e,hi:0xc2ccc9,lit:0xf5f5e8,rubber:0x171c20,ink:0x172127,target:0xe8eddf}:{base:0x566269,lo:0x727f85,mid:0xa8b1b1,hi:0xdce0d9,lit:0x303c41,rubber:0x293238,ink:0x2e383d,target:0x444f52};for(const k in c)this.mat[k].color.setHex(c[k]);this.floor.material.opacity=dark?.28:.13;this.draw();}
 bind(){let dragging=false,lastX=0,lastY=0,dist=0,driving=false;
  this.host.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;dist=0;lastX=e.clientX;lastY=e.clientY;driving=this.roleAt(e)==='input';this.host.setPointerCapture(e.pointerId)});
  this.host.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;dist+=Math.abs(dx)+Math.abs(dy);if(driving&&this.onTurn)this.onTurn(dx*.04);else{this.yaw-=dx*.007;this.pitch=clamp(this.pitch+dy*.006,.15,1.55)}lastX=e.clientX;lastY=e.clientY;this.draw()});
  this.host.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;if(dist<5)this.pick(e);if(this.host.hasPointerCapture(e.pointerId))this.host.releasePointerCapture(e.pointerId)});this.host.addEventListener('pointercancel',()=>dragging=false);
  this.host.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.65,4.5);this.draw()},{passive:false});
 }
 resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);const a=r.width/r.height,h=Math.max(PAGE==='reducers'?270:205,(PAGE==='reducers'?245:285)/a);this.camera.left=-h*a/2;this.camera.right=h*a/2;this.camera.top=h/2;this.camera.bottom=-h/2;this.camera.updateProjectionMatrix();this.draw();}
 cameraHome(){this.yaw=-Math.PI/3;this.pitch=this.mode==='planet'||this.mode==='harmonic'?1.03:.73;this.zoom=1;this.draw()}
 draw(){if(!this.camera)return;const d=400;this.camera.position.set(this.target.x+d*Math.cos(this.yaw)*Math.cos(this.pitch),this.target.y+d*Math.sin(this.yaw)*Math.cos(this.pitch),this.target.z+d*Math.sin(this.pitch));this.camera.lookAt(this.target);this.camera.zoom=this.zoom;this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera)}
 roleAt(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const h=this.ray.intersectObjects(this.objects,false).find(h=>h.object.visible&&this.visible(h.object));if(h){let p=h.object;while(p&&!p.userData.role)p=p.parent;return p?.userData.role}return null}
 pick(e){const role=this.roleAt(e);if(role){this.highlight(role);this.onPick(role)}}
 visible(p){while(p){if(!p.visible)return false;p=p.parent}return true}
 group(parent=this.root,role=''){const g=new THREE.Group();parent.add(g);if(role)g.userData.role=role;return g}
 mesh(geo,mat,parent=this.root,name='',edges=false){const q=new THREE.Mesh(geo,this.mat[mat]||this.mat.mid);q.castShadow=true;q.receiveShadow=true;q.userData.original=mat;if(name)q.userData.role=name;parent.add(q);this.objects.push(q);this.partCount++;if(edges){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo,35),this.edgeMat);q.add(edge)}return q}
 box(w,d,h,x,y,z,mat='mid',parent=this.root,role='',bevel=.7){
  let geo;if(bevel>0){const b=Math.min(bevel,w/6,d/6,h/4),s=new THREE.Shape();s.moveTo(-w/2+b,-d/2);s.lineTo(w/2-b,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+b);s.lineTo(w/2,d/2-b);s.quadraticCurveTo(w/2,d/2,w/2-b,d/2);s.lineTo(-w/2+b,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-b);s.lineTo(-w/2,-d/2+b);s.quadraticCurveTo(-w/2,-d/2,-w/2+b,-d/2);geo=new THREE.ExtrudeGeometry(s,{depth:h-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b/2,bevelSegments:2,steps:1,curveSegments:4});geo.translate(0,0,b)}else geo=new THREE.BoxGeometry(w,d,h).translate(0,0,h/2);
  const q=this.mesh(geo,mat,parent,role);q.position.set(x,y,z);return q;
 }
 cyl(r,h,x,y,z,mat='mid',parent=this.root,role='',axis='z',segments=64){const geo=new THREE.CylinderGeometry(r,r,h,segments);geo.rotateX(Math.PI/2);geo.translate(0,0,h/2);const q=this.mesh(geo,mat,parent,role);q.position.set(x,y,z);if(axis==='x')q.rotation.y=Math.PI/2;if(axis==='y')q.rotation.x=-Math.PI/2;return q}
 annulus(ri,ro,h,x,y,z,mat='mid',parent=this.root,role='',axis='z',start=0,end=TAU){const s=new THREE.Shape();if(end-start>=TAU-.001){s.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();hole.absarc(0,0,ri,0,TAU,true);s.holes.push(hole)}else{const n=80;for(let i=0;i<=n;i++){const a=start+(end-start)*i/n;(i?s.lineTo:s.moveTo).call(s,ro*Math.cos(a),ro*Math.sin(a))}for(let i=n;i>=0;i--){const a=start+(end-start)*i/n;s.lineTo(ri*Math.cos(a),ri*Math.sin(a))}s.closePath()}
  const q=this.mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:96}),mat,parent,role);q.position.set(x,y,z);if(axis==='x')q.rotation.y=Math.PI/2;if(axis==='y')q.rotation.x=-Math.PI/2;return q;
 }
 bolt(x,y,z,parent=this.root,r=1.3){this.cyl(r*1.35,.5,x,y,z,'lo',parent,'','z',16);const q=this.cyl(r,1.6,x,y,z+.5,'hi',parent,'','z',6);this.box(r*.9,.32,.12,x,y,z+2.1,'ink',parent,'',0);return q}
 rod(a,b,r,mat,parent=this.root,role=''){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const q=this.mesh(new THREE.CylinderGeometry(r,r,d.length(),32),mat,parent,role);q.position.copy(new THREE.Vector3(...a).addScaledVector(d,.5));q.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return q}
 gear(n,m,h,mat,parent,role){const pts=toothProfile(n,m),s=new THREE.Shape();pts.forEach((p,i)=>(i?s.lineTo:s.moveTo).call(s,...p));s.closePath();const hole=new THREE.Path();hole.absarc(0,0,3,0,TAU,true);s.holes.push(hole);return this.mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:20}),mat,parent,role)}
 internalGear(n,r,h,parent,role){const ro=r+7,m=2*r/n,tip=r-m,root=r+1.25*m,rb=r*Math.cos(Math.PI/9),inv=v=>{let a=Math.acos(rb/v);return Math.tan(a)-a},half=v=>Math.PI/(2*n)-inv(r)+inv(v),pts=[];const s=new THREE.Shape();s.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();for(let i=0;i<n;i++){const c=i*TAU/n;pts.push([root*Math.cos(c-Math.PI/n),root*Math.sin(c-Math.PI/n)]);for(let j=0;j<=6;j++){const rr=root+(tip-root)*j/6,a=c-half(rr);pts.push([rr*Math.cos(a),rr*Math.sin(a)])}for(let j=0;j<=6;j++){const rr=tip+(root-tip)*j/6,a=c+half(rr);pts.push([rr*Math.cos(a),rr*Math.sin(a)])}pts.push([root*Math.cos(c+Math.PI/n),root*Math.sin(c+Math.PI/n)])}pts.reverse().forEach((p,i)=>(i?hole.lineTo:hole.moveTo).call(hole,...p));hole.closePath();s.holes.push(hole);return this.mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:128}), 'mid',parent,role)}
 base(w=198,d=166){
  for(const x of[-w/2+18,w/2-18])for(const y of[-d/2+18,d/2-18]){this.cyl(7,4,x,y,-12,'rubber');this.cyl(5,2,x,y,-8,'lo')}
  this.box(w,d,6,0,0,-6,'base');this.box(w-5,d-5,.8,0,0,0,'lo');for(const x of[-w/2+9,w/2-9])for(const y of[-d/2+9,0,d/2-9])this.bolt(x,y,.8);
  for(const y of[-d/2+5,d/2-5])this.box(w-25,.5,.15,0,y,.9,'ink',this.root,'',0);
  this.box(w-32,6,.5,0,-d/2+17,1,'hi');for(let i=0;i<=40;i++)this.box(.35,i%5===0?4.8:2.6,.12,-(w-40)/2+i*(w-40)/40,-d/2+15.8,1.5,'ink',this.root,'',0);
  this.box(34,11,.6,0,d/2-18,1,'mid');for(const x of[-14,14])this.bolt(x,d/2-18,1.6,this.root,.65);for(let i=0;i<3;i++)this.box(16-i*3,.35,.1,-2,d/2-21+i*2.2,1.6,'lo',this.root,'',0);
 }
 wheel(parent,x,y,z,axis='z',r=15){const g=this.group(parent);g.position.set(x,y,z);if(axis==='x')g.rotation.y=Math.PI/2;if(axis==='y')g.rotation.x=-Math.PI/2;this.annulus(r-2,r,3,0,0,0,'lo',g);this.cyl(4,4,0,0,-.5,'hi',g);for(let i=0;i<3;i++){const b=this.box(r-4,2,2,(r/2)*Math.cos(i*TAU/3),(r/2)*Math.sin(i*TAU/3),.5,'mid',g);b.rotation.z=i*TAU/3}this.cyl(1.5,8,r-1,0,3,'hi',g);this.cyl(2.5,5,r-1,0,6,'rubber',g);return g}
 load(mode,setting=8){if(this.root){this.scene.remove(this.root);this.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}this.objects=[];this.partCount=0;this.groups={};this.root=new THREE.Group();this.scene.add(this.root);this.mode=mode;this.setting=setting;this.apart=0;this.cut=true;this.selected='';this.base(PAGE==='reducers'?196:238,PAGE==='reducers'?166:130);this.cover=this.group();this.outputMark=null;this.targetMarker=null;
  if(mode==='planet')this.planet();else if(mode==='harmonic')this.harmonic();else this.conversion(mode,setting);this.cameraHome();this.update(0,0);this.resize();
 }
 planet(){
  const g=this.groups;this.annulus(12,62,5,0,0,4,'lo');this.annulus(56.6,64,14,0,0,9,'lo');this.cyl(8,22,0,0,4,'mid');g.ring=this.group(this.root,'fixed');const ring=this.internalGear(54,54,8,g.ring,'fixed');ring.position.z=29;
  this.annulus(61,66,4,0,0,26,'hi',g.ring);for(let i=0;i<12;i++){let a=i*TAU/12;this.bolt(63*Math.cos(a),63*Math.sin(a),30,g.ring)}
  g.carrier=this.group(this.root,'output');this.cyl(10,4,0,0,23,'hi',g.carrier);g.planets=[];
  for(let i=0;i<3;i++){const a=i*TAU/3,c=36*Math.cos(a),d=36*Math.sin(a);const arm=this.box(34,7,4,18*Math.cos(a),18*Math.sin(a),23,'hi',g.carrier,'output');arm.rotation.z=a;this.cyl(3,19,c,d,23,'lo',g.carrier,'output');const p=this.group(this.root,'planet');p.position.set(c,d,29);this.gear(18,2,8,'hi',p,'planet');this.annulus(3,5,1.5,0,0,8,'lo',p);this.bolt(c,d,42,g.carrier,1.7);g.planets.push(p)}
  g.input=this.group(this.root,'input');this.gear(18,2,8,'lit',g.input,'input').position.z=29;this.cyl(3,14,0,0,29,'hi',g.input);this.box(11,1.2,.4,7,0,37.3,'hi',g.input,'',0);this.wheel(g.input,0,0,46,'z',12);
  this.annulus(9,57,2,0,0,45,'lo',this.cover);for(let i=0;i<3;i++){const a=i*TAU/3;this.bolt(36*Math.cos(a),36*Math.sin(a),47,this.cover)}
  this.annulus(67,73,.8,0,0,2,'hi');for(let i=0;i<72;i++){let a=i*TAU/72;const q=this.box(i%6===0?4.5:2,.35,.12,70*Math.cos(a),70*Math.sin(a),2.8,'ink',this.root,'',0);q.rotation.z=a}
  this.outputMark=this.group(g.carrier,'output');this.box(16,3,.6,62,0,4,'lit',this.outputMark,'output',.2);this.targetMarker=this.group();this.box(7,6,.4,70,0,3,'target',this.targetMarker,'',.4);this.targetMarker.rotation.z=Math.PI/2;
  this.box(8,18,13,70,0,1,'mid',g.ring,'fixed');this.bolt(70,0,14,g.ring,1.8);this.cover.visible=false;
 }
 harmonic(){
  const g=this.groups;this.annulus(12,60,6,0,0,4,'lo');this.cyl(8,7,0,0,10,'hi');this.annulus(56,64,22,0,0,11,'lo');
  g.ring=this.group(this.root,'fixed');const ring=this.internalGear(202,51.2,5,g.ring,'fixed');ring.position.z=43;this.annulus(57,64,4,0,0,39,'hi',g.ring);for(let i=0;i<12;i++){const a=i*TAU/12;this.bolt(60*Math.cos(a),60*Math.sin(a),43,g.ring,1)}
  g.output=this.group(this.root,'output');this.annulus(8,39,3,0,0,15,'hi',g.output,'output');for(let i=0;i<10;i++){const a=i*TAU/10;this.bolt(31*Math.cos(a),31*Math.sin(a),18,g.output,1)}
  // Thin shell with a circular base and an elliptically deforming open rim.
  const N=160,H=12,positions=[],indices=[];for(let side=0;side<2;side++)for(let j=0;j<=H;j++)for(let i=0;i<=N;i++)positions.push(0,0,0);
  const stride=(H+1)*(N+1);for(let side=0;side<2;side++)for(let j=0;j<H;j++)for(let i=0;i<N;i++){let a=side*stride+j*(N+1)+i,b=a+N+1;indices.push(...(side?[a,b+1,b,a,a+1,b+1]:[a,b,b+1,a,b+1,a+1]))}for(const j of[0,H])for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+stride;indices.push(a,a+1,b,b,a+1,b+1)}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);g.cup=this.mesh(geo,'hi',this.root,'output');g.cup.userData.N=N;g.cup.userData.H=H;
  const teethGeo=new THREE.BoxGeometry(.67,.63,3);g.teeth=new THREE.InstancedMesh(teethGeo,this.mat.hi,200);g.teeth.castShadow=true;g.teeth.receiveShadow=true;g.teeth.userData.role='output';this.root.add(g.teeth);this.objects.push(g.teeth);this.partCount+=200;
  g.wave=this.group(this.root,'input');const wg=this.annulus(42,47.9,3,0,0,39,'lit',g.wave,'input');wg.scale.set(1.012,.970,1);for(let i=0;i<4;i++){const a=i*TAU/4,spoke=this.box(39,5,3,23*Math.cos(a),23*Math.sin(a),39,'lit',g.wave,'input');spoke.rotation.z=a}const bearing=this.annulus(47.9,48.8,3,0,0,39,'mid',g.wave,'input');bearing.scale.set(1.012,.970,1);for(let i=0;i<44;i++){let a=i*TAU/44;this.cyl(.65,2.5,48.2*1.012*Math.cos(a),48.2*.970*Math.sin(a),39.3,'hi',g.wave,'input','z',12)}this.cyl(5,12,0,0,39,'mid',g.wave);this.wheel(g.wave,0,0,53,'z',11);
  this.annulus(7,57,2,0,0,49,'lo',this.cover);this.cover.visible=false;
  this.annulus(66,73,.8,0,0,2,'hi');for(let i=0;i<100;i++){let a=i*TAU/100,q=this.box(i%5===0?5:2,.28,.1,70*Math.cos(a),70*Math.sin(a),2.8,'ink',this.root,'',0);q.rotation.z=a}
  this.outputMark=this.group(g.output,'output');this.box(32,2.5,.5,55,0,2.8,'lit',this.outputMark,'output');this.targetMarker=this.group();this.box(8,4,.4,70,0,3,'target',this.targetMarker);this.targetMarker.rotation.z=-7.2*Math.PI/180;
  this.box(8,14,25,68,0,1,'mid',g.ring,'fixed');this.bolt(68,0,26,g.ring,1.5);this.scratch=new THREE.Object3D();
 }
 updateHarmonic(theta,ex){const g=this.groups,v=harmonic(theta);g.output.rotation.z=v.output;g.wave.rotation.z=theta;g.wave.position.z=ex*40;g.ring.position.z=ex*15;const attr=g.cup.geometry.attributes.position,N=g.cup.userData.N,H=g.cup.userData.H;let k=0;
  for(let side=0;side<2;side++)for(let j=0;j<=H;j++){const t=j/H;for(let i=0;i<=N;i++){const a=i/N*TAU+v.output,rr=38+11.5*t+.9*t*t*Math.cos(2*(a-theta))-side*.8;attr.setXYZ(k++,rr*Math.cos(a),rr*Math.sin(a),18+25*t)}}attr.needsUpdate=true;g.cup.geometry.computeVertexNormals();
  for(let i=0;i<200;i++){const a=i/200*TAU+v.output+Math.PI/200,rr=49.65+.9*Math.cos(2*(a-theta)),d=this.scratch;d.position.set(rr*Math.cos(a),rr*Math.sin(a),44.5);d.rotation.set(0,0,a);d.updateMatrix();g.teeth.setMatrixAt(i,d.matrix)}g.teeth.instanceMatrix.needsUpdate=true;
 }
 conversion(mode,setting){
  const g=this.groups;for(const y of[-23,23]){this.rod([-85,y,17],[85,y,17],3,'hi',this.root,'fixed');for(const x of[-89,89]){this.box(9,13,17,x,y,1,'mid',this.root,'fixed');this.bolt(x,y,18,this.root,1.5)}}
  g.carriage=this.group(this.root,'output');for(const y of[-23,23]){this.annulus(3.1,6,17,-8.5,y,17,'lo',g.carriage,'output','x');this.box(18,12,3,0,y,22,'hi',g.carriage,'output')}
  this.box(30,58,5,0,0,25,'hi',g.carriage,'output');for(const x of[-10,10])for(const y of[-23,23])this.bolt(x,y,30,g.carriage);this.box(mode==='crank'?10:18,10,7,mode==='crank'?8:0,-15,30,'mid',g.carriage,'output');this.box(mode==='crank'?8:14,8,1,mode==='crank'?8:0,-15,37,'lit',g.carriage,'output');
  this.targetMarker=this.group();this.box(24,8,1,0,-38,1.7,'target',this.targetMarker);for(const y of[-34,34])this.box(4,10,7,-51,y,1,'rubber');for(const y of[-34,34])this.box(4,10,7,51,y,1,'rubber');
  g.input=this.group(this.root,'input');
  if(mode==='screw'){
   g.input.position.z=40;this.cyl(3.9,164,-82,0,0,'mid',g.input,'input','x');const curve=new THREE.Curve();curve.getPoint=t=>new THREE.Vector3(-76+152*t,4.55*Math.cos(t*152/setting*TAU),4.55*Math.sin(t*152/setting*TAU));const thread=this.mesh(new THREE.TubeGeometry(curve,Math.ceil(152/setting*40),.65,7,false),'hi',g.input,'input');
   for(const x of[-87,87]){this.box(9,20,39,x,0,1,'lo');this.annulus(4,8,10,x-5,0,40,'hi',this.root,'','x')}
   this.wheel(g.input,-99,0,0,'x',12);this.annulus(5.3,9,14,-7,0,40,'lit',g.carriage,'output','x',-Math.PI/2,Math.PI/2);this.annulus(5.3,12,2,-9,0,40,'mid',g.carriage,'output','x',-Math.PI/2,Math.PI/2);this.box(14,5,8,0,10,30,'mid',g.carriage,'output');this.box(14,5,8,0,-10,30,'mid',g.carriage,'output');
   this.annulus(5.3,9,14,-7,0,40,'lit',this.cover,'output','x',Math.PI/2,Math.PI*1.5);this.annulus(5.3,12,2,-9,0,40,'mid',this.cover,'output','x',Math.PI/2,Math.PI*1.5);this.cover.userData.moves=true;
  }else if(mode==='rack'){
   this.box(126,9,5,0,0,39,'lo',g.carriage,'output');for(let i=0;i<40;i++)this.box(1.48,9,2,-61.26+i*Math.PI,0,44,'hi',g.carriage,'output',.1);
   g.input.position.set(0,0,57);g.input.rotation.x=Math.PI/2;const pinion=this.gear(24,1,9,'lit',g.input,'input');pinion.position.z=-4.5;
   this.cyl(3,100,0,0,-50,'hi',g.input,'input');this.wheel(g.input,0,0,54,'z',11);for(const y of[-44,44]){this.box(12,8,55,0,y,1,'lo');this.annulus(3,6,8,0,y-4,57,'mid',this.root,'','y')}
   this.box(32,96,2,0,0,73,'lo',this.cover);this.box(2,96,27,-16,0,46,'lo',this.cover);this.box(2,96,27,16,0,46,'lo',this.cover);this.targetMarker.children[0].position.y=-55;
  }else{
   const r=setting;g.input.position.set(-55,0,34);this.cyl(12,31,-55,0,1,'lo');this.cyl(5,5,0,0,-3,'hi',g.input,'input');this.cyl(r+5,3,0,0,0,'mid',g.input,'input');this.annulus(r+3,r+5,1,0,0,3,'hi',g.input,'input');this.box(r,5,2,r/2,0,3,'lit',g.input,'input');this.cyl(3,6,r,0,3,'hi',g.input,'input');this.bolt(r,0,9,g.input,1.5);this.wheel(g.input,0,0,12,'z',9);
   g.link=this.group(this.root,'rod');this.box(70,6,3,35,0,0,'hi',g.link,'rod');this.annulus(3,5.5,3,0,0,0,'mid',g.link,'rod');this.annulus(3,5.5,3,70,0,0,'mid',g.link,'rod');this.cyl(3,9,0,0,36,'hi',g.carriage,'output');this.bolt(0,0,45,g.carriage,1.5);this.box(85,71,2,-38,0,54,'lo',this.cover);
  }
  this.cover.visible=false;this.targetMarker.position.x=mode==='crank'?-55+70+setting:-40+SPECS[mode].target;
 }
 highlight(role){this.selected=role;for(const o of this.objects){if(o.isInstancedMesh)continue;let p=o;while(p&&!p.userData.role)p=p.parent;const own=p?.userData.role;o.material=own===role?this.mat.lit:this.mat[o.userData.original]||this.mat.mid}this.draw()}
 update(theta,ex=0){this.theta=theta;this.apart=ex;const g=this.groups,mode=this.mode,v=sample(mode,theta,this.setting);this.cover.visible=!this.cut;
  if(mode==='planet'){g.input.rotation.z=theta;g.input.position.z=ex*35;g.carrier.rotation.z=v.output;g.carrier.position.z=-ex*3;g.ring.position.z=ex*18;g.planets.forEach((p,i)=>{const a=v.orbits[i];p.position.set(36*Math.cos(a),36*Math.sin(a),29+ex*12);p.rotation.z=v.spin+i*TAU/3+Math.PI/18});this.cover.position.z=ex*60}
  else if(mode==='harmonic'){this.updateHarmonic(theta,ex);this.cover.position.z=ex*65}
  else{g.carriage.position.x=v.x;g.carriage.position.z=ex*17;if(mode==='screw'){g.input.rotation.x=theta;this.cover.position.x=v.x;this.cover.position.z=ex*32}else if(mode==='rack'){g.input.rotation.set(Math.PI/2,0,theta);g.input.position.z=57+ex*27;this.cover.position.z=ex*45}else{g.input.rotation.z=theta;g.link.position.set(v.pinX,v.y,40+ex*20);g.link.rotation.z=Math.atan2(-v.y,v.x-v.pinX);this.cover.position.z=ex*45}}
  this.draw();
 }
}
