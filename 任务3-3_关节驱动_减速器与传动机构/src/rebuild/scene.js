/* Anatomy-style physical bench; genuine depth-buffered 3D, Z is up. */
class BenchScene{
 constructor(host,onPick){
  this.host=host;this.onPick=onPick;this.objects=[];this.groups={};this.mode='planet';this.cut=true;this.apart=0;this.partCount=0;this.theta=0;this.setting=8;this.yaw=-Math.PI/3;this.pitch=.94;this.zoom=1;this.target=new THREE.Vector3(0,0,25);this.witnesses=[];this.showMarkers=true;
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.add(new THREE.HemisphereLight(0xffffff,0x687b98,2.0));
  const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(-100,-140,260);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:700});key.shadow.bias=-.0005;key.shadow.normalBias=.15;this.scene.add(key);const fill=new THREE.DirectionalLight(0xdceaff,.9);fill.position.set(160,100,120);this.scene.add(fill);
  this.camera=new THREE.OrthographicCamera(-150,150,100,-100,1,1200);this.camera.up.set(0,0,1);this.mat={};for(const name of ['base','lo','mid','hi','lit','rubber','ink','target','input','output','white','steel'])this.mat[name]=new THREE.MeshStandardMaterial({roughness:name==='rubber'?.95:name==='output'?.38:.48,metalness:name==='rubber'?0:name==='steel'?.6:.22});this.highlightMat={};
  this.edgeMat=new THREE.LineBasicMaterial({color:0x303a3e,transparent:true,opacity:.17});this.floor=new THREE.Mesh(new THREE.PlaneGeometry(1200,1200),new THREE.ShadowMaterial({opacity:.12}));this.floor.position.z=-12;this.floor.receiveShadow=true;this.scene.add(this.floor);
  this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.bind();new ResizeObserver(()=>this.resize()).observe(host);this.theme(false);
 }
 theme(dark){this.dark=dark;const c=dark?{base:0x25364d,lo:0x405876,mid:0x849bb8,hi:0xcbd8eb,lit:0x95bcff,rubber:0x111a29,ink:0x14253b,target:0xa8caff,input:0x74a7ff,output:0x69cdb2,white:0xf3f7ff,steel:0x8ca5c8}:{base:0xcbd6e3,lo:0x768ca6,mid:0x9fb1c5,hi:0xdde5ee,lit:0x387be7,rubber:0x273c55,ink:0x273c55,target:0x2469ed,input:0x387be7,output:0x36a88c,white:0xf7fbff,steel:0x9fb1c5};for(const k in c){this.mat[k].color.setHex(c[k]);if(this.highlightMat[k]){this.highlightMat[k].color.setHex(c[k]);this.highlightMat[k].emissive.setHex(dark?0x183d75:0x123264)}}this.floor.material.opacity=dark?.28:.12;this.draw();}
 bind(){let dragging=false,lastX=0,lastY=0,dist=0,driving=false;
  this.host.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;dist=0;lastX=e.clientX;lastY=e.clientY;driving=this.roleAt(e)==='input';this.host.setPointerCapture(e.pointerId)});
  this.host.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;dist+=Math.abs(dx)+Math.abs(dy);if(driving&&this.onTurn)this.onTurn(dx*.04);else{this.yaw-=dx*.007;this.pitch=clamp(this.pitch+dy*.006,.15,1.55)}lastX=e.clientX;lastY=e.clientY;this.draw()});
  this.host.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;if(dist<5)this.pick(e);if(this.host.hasPointerCapture(e.pointerId))this.host.releasePointerCapture(e.pointerId)});this.host.addEventListener('pointercancel',()=>dragging=false);
  this.host.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom*Math.exp(-e.deltaY*.001),.65,4.5);this.draw()},{passive:false});
 }
 resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);const a=r.width/r.height,h=Math.max(PAGE==='reducers'?280:205,(PAGE==='reducers'?320:285)/a);this.camera.left=-h*a/2;this.camera.right=h*a/2;this.camera.top=h/2;this.camera.bottom=-h/2;this.camera.updateProjectionMatrix();this.draw();}
 cameraHome(){this.yaw=-Math.PI/3;this.pitch=this.mode==='planet'?1.02:this.mode==='harmonic'?.94:.73;this.zoom=1;this.draw()}
 draw(){if(!this.camera)return;const d=400;this.target.z=(PAGE==='reducers'?25:25)+(PAGE==='reducers'?this.apart*22:0);this.camera.position.set(this.target.x+d*Math.cos(this.yaw)*Math.cos(this.pitch),this.target.y+d*Math.sin(this.yaw)*Math.cos(this.pitch),this.target.z+d*Math.sin(this.pitch));this.camera.lookAt(this.target);this.camera.zoom=this.zoom/(1+(PAGE==='reducers'?.16*this.apart:0));this.camera.updateProjectionMatrix();this.renderer.render(this.scene,this.camera)}
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
 gear(n,m,h,mat,parent,role){const pts=toothProfile(n,m),s=new THREE.Shape();pts.forEach((p,i)=>(i?s.lineTo:s.moveTo).call(s,...p));s.closePath();const hole=new THREE.Path();hole.absarc(0,0,3,0,TAU,true);s.holes.push(hole);const q=this.mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:20}),mat,parent,role);q.userData.teeth=n;q.userData.pitchRadius=n*m/2;return q}
 internalGear(n,r,h,parent,role){const ro=r+7,m=2*r/n,tip=r-m,root=r+1.25*m,rb=r*Math.cos(Math.PI/9),inv=v=>{let a=Math.acos(rb/v);return Math.tan(a)-a},half=v=>Math.PI/(2*n)-inv(r)+inv(v),pts=[];const s=new THREE.Shape();s.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();for(let i=0;i<n;i++){const c=i*TAU/n;pts.push([root*Math.cos(c-Math.PI/n),root*Math.sin(c-Math.PI/n)]);for(let j=0;j<=6;j++){const rr=root+(tip-root)*j/6,a=c-half(rr);pts.push([rr*Math.cos(a),rr*Math.sin(a)])}for(let j=0;j<=6;j++){const rr=tip+(root-tip)*j/6,a=c+half(rr);pts.push([rr*Math.cos(a),rr*Math.sin(a)])}pts.push([root*Math.cos(c+Math.PI/n),root*Math.sin(c+Math.PI/n)])}pts.reverse().forEach((p,i)=>(i?hole.lineTo:hole.moveTo).call(hole,...p));hole.closePath();s.holes.push(hole);const q=this.mesh(new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:128}), 'white',parent,role);q.userData.teeth=n;q.userData.pitchRadius=r;return q}
 witness(q){q.visible=this.showMarkers;this.witnesses.push(q);return q}
 markers(show=true){this.showMarkers=!!show;for(const q of this.witnesses)q.visible=this.showMarkers;this.draw()}
 radialMark(from,to,width,z,mat,parent,role=''){return this.witness(this.box(to-from,width,.16,(from+to)/2,0,z,mat,parent,role,0))}
 pointerInlay(radius,z,parent,mat='white',width=3){const s=new THREE.Shape();s.moveTo(radius,0);s.lineTo(radius-4,-width);s.lineTo(radius-4,width);s.closePath();const q=this.mesh(new THREE.ExtrudeGeometry(s,{depth:.18,bevelEnabled:false}),mat,parent);q.position.z=z;return this.witness(q)}
 bezel(ticks=72){
  this.annulus(77.1,82,6.9,0,0,.8,'base',this.root,'fixed');
  this.annulus(77.1,82,1.3,0,0,7.7,'hi',this.root,'fixed');
  for(let i=0;i<ticks;i++){const a=i*TAU/ticks,length=i%(ticks===100?5:6)===0?4.6:2.3;const q=this.box(length,.32,.12,(82-length/2)*Math.cos(a),(82-length/2)*Math.sin(a),9,'ink',this.root,'fixed',0);q.rotation.z=a}
  const zero=this.group(this.root,'fixed');this.radialMark(77.2,82,1.1,9.13,'input',zero,'fixed');
  this.targetMarker=this.group(this.root);this.box(4,2.2,.14,79.6,0,9.13,'target',this.targetMarker,'',0);
 }
 outputFlange(parent,z=5){
  this.annulus(3.6,76,4,0,0,z,'hi',parent,'output');this.annulus(65,76,.55,0,0,z+4,'output',parent,'output');
  for(let i=0;i<12;i++){const a=i*TAU/12;this.bolt(69.5*Math.cos(a),69.5*Math.sin(a),z+4.55,parent,.75)}
  this.outputMark=this.group(parent,'output');this.radialMark(65.5,73,2.4,z+4.57,'white',this.outputMark,'output');this.pointerInlay(75.5,z+4.57,this.outputMark,'white',2.2);
 }
 ringMounts(ring,z,outer=65){
  for(let i=0;i<3;i++){const a=(i+.5)*TAU/3,x=86*Math.cos(a),y=86*Math.sin(a);this.cyl(3.7,z-1,x,y,1,'steel',this.root,'fixed');this.cyl(3.8,1.1,x,y,.8,'hi',this.root,'fixed');const arm=this.box(90-outer,7,3,(90+outer)/2*Math.cos(a),(90+outer)/2*Math.sin(a),z,'white',ring,'fixed');arm.rotation.z=a;this.bolt(x,y,z+3,ring,1.3);this.bolt((outer+3)*Math.cos(a),(outer+3)*Math.sin(a),z+3,ring,1.1)}
 }
 base(w=198,d=166){
  for(const x of[-w/2+18,w/2-18])for(const y of[-d/2+18,d/2-18]){this.cyl(7,4,x,y,-12,'rubber');this.cyl(5,2,x,y,-8,'lo')}
  this.box(w,d,6,0,0,-6,'base');this.box(w-5,d-5,.8,0,0,0,'hi');for(const x of[-w/2+9,w/2-9])for(const y of[-d/2+9,0,d/2-9])this.bolt(x,y,.8);
  for(const y of[-d/2+5,d/2-5])this.box(w-25,.5,.15,0,y,.9,'ink',this.root,'',0);
  const ry=-d/2+(PAGE==='reducers'?7:17);this.box(w-32,6,.5,0,ry,1,'hi');for(let i=0;i<=40;i++){const major=i%5===0;this.box(.35,major?4.8:2.6,.12,-(w-40)/2+i*(w-40)/40,ry-(major?.6:1.7),1.5,'ink',this.root,'',0)}
  const py=d/2-(PAGE==='reducers'?4.5:18),ph=PAGE==='reducers'?6:11;this.box(34,ph,.6,0,py,1,'mid');for(const x of[-14,14])this.bolt(x,py,1.6,this.root,.65);for(let i=0;i<3;i++)this.box(16-i*3,.35,.1,-2,py-1.8+i*1.5,1.6,'lo',this.root,'',0);
 }
 wheel(parent,x,y,z,axis='z',r=15){const g=this.group(parent);g.position.set(x,y,z);if(axis==='x')g.rotation.y=Math.PI/2;if(axis==='y')g.rotation.x=-Math.PI/2;this.annulus(r-2,r,3,0,0,0,'lo',g);this.cyl(4,4,0,0,-.5,'hi',g);for(let i=0;i<3;i++){const b=this.box(r-4,2,2,(r/2)*Math.cos(i*TAU/3),(r/2)*Math.sin(i*TAU/3),.5,'mid',g);b.rotation.z=i*TAU/3}this.cyl(1.5,8,r-1,0,3,'hi',g);this.cyl(2.5,5,r-1,0,6,'rubber',g);return g}
 load(mode,setting=8){if(this.root){this.scene.remove(this.root);this.root.traverse(o=>{if(o.geometry)o.geometry.dispose()})}this.objects=[];this.partCount=0;this.witnesses=[];this.groups={};this.root=new THREE.Group();this.scene.add(this.root);this.mode=mode;this.setting=setting;this.apart=0;this.cut=true;this.selected='';this.base(PAGE==='reducers'?208:238,PAGE==='reducers'?184:130);this.cover=this.group();this.outputMark=null;this.targetMarker=null;
  if(mode==='planet')this.planet();else if(mode==='harmonic')this.harmonic();else this.conversion(mode,setting);this.cameraHome();this.update(0,0);this.resize();
 }
 planet(){
  const g=this.groups;this.annulus(3.5,13,4,0,0,1,'steel',this.root,'fixed');
  g.output=this.group(this.root,'output');this.outputFlange(g.output);this.annulus(3.5,10,18,0,0,9,'output',g.output,'output');
  g.ring=this.group(this.root,'fixed');g.ringGear=this.internalGear(54,54,8,g.ring,'fixed');g.ringGear.position.z=29;
  this.annulus(61,65,4,0,0,27,'hi',g.ring,'fixed');this.ringMounts(g.ring,27);for(let i=0;i<12;i++){const a=i*TAU/12;this.bolt(63*Math.cos(a),63*Math.sin(a),31,g.ring,1)}
  g.carrier=this.group(this.root,'output');this.annulus(4,9,4,0,0,42,'output',g.carrier,'output');g.planets=[];
  for(let i=0;i<3;i++){
   const a=i*TAU/3,c=36*Math.cos(a),d=36*Math.sin(a);
   for(const [z,parent,width]of[[23,g.output,7],[42,g.carrier,5]]){const arm=this.box(29,width,4,22*Math.cos(a),22*Math.sin(a),z,'output',parent,'output');arm.rotation.z=a;this.cyl(width/2,4,c,d,z,'output',parent,'output')}
   this.cyl(2.5,19,c,d,23,'steel',g.carrier,'output');this.bolt(c,d,46,g.carrier,1.7);
   const p=this.group(this.root,'planet');p.position.set(c,d,29);this.gear(18,2,8,'steel',p,'planet');this.annulus(3,5,1,0,0,8,'hi',p,'planet');this.radialMark(5.2,15.5,1.6,8.02,'input',p,'planet');this.witness(this.cyl(1.25,.16,14,0,8.18,'white',p,'planet','z',24));g.planets.push(p)
  }
  g.input=this.group(this.root,'input');g.sunGear=this.gear(18,2,8,'input',g.input,'input');g.sunGear.position.z=29;this.cyl(3,45,0,0,4,'steel',g.input,'input');this.radialMark(6,16,1.8,37.02,'white',g.input,'input');
  g.handle=this.group(this.root,'input');this.cyl(6,2,0,0,49,'steel',g.handle,'input');this.cyl(9,3,0,0,51,'input',g.handle,'input');for(let i=0;i<24;i++){const a=i*TAU/24;this.cyl(.6,2.8,8.6*Math.cos(a),8.6*Math.sin(a),51.1,'input',g.handle,'input','z',12)}this.radialMark(1,8.5,1.3,54.02,'white',g.handle,'input');this.cyl(1.6,5,6,0,54,'white',g.handle,'input');
  this.annulus(10,65,2.5,0,0,49,'hi',this.cover,'fixed');this.annulus(61.3,65,18,0,0,31,'hi',this.cover,'fixed');for(let i=0;i<6;i++){const a=i*TAU/6;this.bolt(62.5*Math.cos(a),62.5*Math.sin(a),51.5,this.cover,1)}
  this.bezel(72);this.targetMarker.rotation.z=Math.PI/2;this.cover.visible=false;
 }
 harmonic(){
  const g=this.groups;this.annulus(3.5,13,4,0,0,1,'steel',this.root,'fixed');
  g.output=this.group(this.root,'output');this.outputFlange(g.output);this.annulus(8,13,6,0,0,9,'output',g.output,'output');this.annulus(8,38,3,0,0,15,'output',g.output,'output');for(let i=0;i<10;i++){const a=i*TAU/10;this.bolt(31*Math.cos(a),31*Math.sin(a),18,g.output,1)}
  g.ring=this.group(this.root,'fixed');g.ringGear=this.internalGear(202,HARMONIC_GEOMETRY.circularPitchRadius,5,g.ring,'fixed');g.ringGear.position.z=43;this.annulus(57.5,65,4,0,0,39,'hi',g.ring,'fixed');this.ringMounts(g.ring,39);for(let i=0;i<12;i++){const a=i*TAU/12;this.bolt(61*Math.cos(a),61*Math.sin(a),43,g.ring,1)}
  // Material coordinates are conserved around an inextensible elliptical rim.
  // The final three millimetres are a cylindrical tooth band on that rim.
  const N=160,H=14,positions=new Float32Array(2*(H+1)*(N+1)*3),indices=[],stride=(H+1)*(N+1);
  for(let side=0;side<2;side++)for(let j=0;j<H;j++)for(let i=0;i<N;i++){const a=side*stride+j*(N+1)+i,b=a+N+1;indices.push(...(side?[a,b,b+1,a,b+1,a+1]:[a,b+1,b,a,a+1,b+1]))}for(const j of[0,H])for(let i=0;i<N;i++){const a=j*(N+1)+i,b=a+stride;indices.push(...(j===H?[a,a+1,b,b,a+1,b+1]:[a,b,a+1,b,b+1,a+1]))}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setIndex(indices);g.cup=this.mesh(geo,'steel',this.root,'output');g.cup.userData.N=N;g.cup.userData.H=H;g.cup.frustumCulled=false;
  const tooth=new THREE.Shape();tooth.moveTo(-.625,-.54);tooth.lineTo(.5,-.29);tooth.lineTo(.5,.29);tooth.lineTo(-.625,.54);tooth.closePath();const teethGeo=new THREE.ExtrudeGeometry(tooth,{depth:3,bevelEnabled:false});g.teeth=new THREE.InstancedMesh(teethGeo,this.mat.hi,200);g.teeth.castShadow=true;g.teeth.receiveShadow=true;g.teeth.userData={role:'output',original:'hi',teeth:200,pitchRadius:50};g.teeth.frustumCulled=false;this.root.add(g.teeth);this.objects.push(g.teeth);this.partCount+=200;
  const stripeGeometry=new THREE.BufferGeometry();stripeGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array((H+1)*2*3),3));const stripeIndex=[];for(let j=0;j<H;j++){const a=j*2;stripeIndex.push(a,a+1,a+2,a+1,a+3,a+2)}stripeGeometry.setIndex(stripeIndex);g.stripe=this.witness(this.mesh(stripeGeometry,'output',this.root,'output'));g.stripe.frustumCulled=false;this.radialMark(13,38,2,18.02,'white',g.output,'output');
  g.wave=this.group(this.root,'input');const ax=(HARMONIC_GEOMETRY.major-1.35)/48.15,ay=(HARMONIC_GEOMETRY.minor-1.35)/48.15;
  const cam=this.annulus(42,44.6,3,0,0,43,'input',g.wave,'input');cam.scale.set(ax,ay,1);const inner=this.annulus(44.6,45.1,3,0,0,43,'steel',g.wave,'input');inner.scale.set(ax,ay,1);const outer=this.annulus(47.5,48.15,3,0,0,43,'steel',g.wave,'input');outer.scale.set(ax,ay,1);
  for(let i=0;i<44;i++){const a=i*TAU/44;this.cyl(1.15,2.6,46.3*ax*Math.cos(a),46.3*ay*Math.sin(a),43.2,'white',g.wave,'input','z',16)}
  this.box(86,5,3,0,0,43,'input',g.wave,'input');this.box(5,84.5,3,0,0,43,'input',g.wave,'input');this.cyl(5,9,0,0,46,'steel',g.wave,'input');this.radialMark(7,43,1.6,46.02,'white',g.wave,'input');const backAxis=this.radialMark(-43,-7,1.6,46.02,'white',g.wave,'input');backAxis.userData.longAxis=true;this.cyl(9,3,0,0,55,'input',g.wave,'input');this.radialMark(1,8,1.5,58.02,'white',g.wave,'input');this.cyl(1.4,5,6,0,58,'white',g.wave,'input');
  this.annulus(10,65,2.5,0,0,51,'hi',this.cover,'fixed');this.annulus(58,65,8,0,0,43,'hi',this.cover,'fixed');for(let i=0;i<6;i++){const a=i*TAU/6;this.bolt(62*Math.cos(a),62*Math.sin(a),53.5,this.cover,1)}
  this.bezel(100);this.targetMarker.rotation.z=-7.2*Math.PI/180;this.cover.visible=false;this.scratch=new THREE.Object3D();
 }
 updateHarmonic(theta,ex){const g=this.groups,v=harmonic(theta);g.output.rotation.z=v.output;g.wave.rotation.z=theta;g.wave.position.z=ex*48;g.ring.position.z=ex*19;const attr=g.cup.geometry.attributes.position,N=g.cup.userData.N,H=g.cup.userData.H;let k=0;
  for(let side=0;side<2;side++)for(let j=0;j<=H;j++){const z=18+28*j/H,t=Math.min(1,(z-18)/25);for(let i=0;i<=N;i++){const p=flexPoint(theta,i/N*TAU,t),offset=.55*t+side*.8;attr.setXYZ(k++,p.x-offset*p.nx,p.y-offset*p.ny,z)}}attr.needsUpdate=true;g.cup.geometry.computeVertexNormals();
  for(let i=0;i<200;i++){const p=flexPoint(theta,i/200*TAU+Math.PI/200),d=this.scratch;d.position.set(p.x,p.y,43);d.rotation.set(0,0,Math.atan2(p.ny,p.nx));d.updateMatrix();g.teeth.setMatrixAt(i,d.matrix)}g.teeth.instanceMatrix.needsUpdate=true;
  const stripe=g.stripe.geometry.attributes.position;for(let j=0;j<=H;j++){const z=18+28*j/H,t=Math.min(1,(z-18)/25);for(let side=0;side<2;side++){const p=flexPoint(theta,(side-.5)*.045,t),off=.55*t-.025;stripe.setXYZ(j*2+side,p.x-off*p.nx,p.y-off*p.ny,z+.01)}}stripe.needsUpdate=true;g.stripe.geometry.computeVertexNormals();
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
 highlight(role){this.selected=role;for(const o of this.objects){let p=o;while(p&&!p.userData.role)p=p.parent;const own=p?.userData.role,key=o.userData.original||'mid';if(own===role){if(!this.highlightMat[key]){this.highlightMat[key]=this.mat[key].clone();this.highlightMat[key].emissive.setHex(this.dark?0x183d75:0x123264);this.highlightMat[key].emissiveIntensity=.28}o.material=this.highlightMat[key]}else o.material=this.mat[key]}this.draw()}
 inspect(){const g=this.groups,v=sample(this.mode,this.theta,this.setting),angle=o=>o?.rotation.z??0;return{mode:this.mode,input:angle(g.input||g.wave),output:angle(g.output||g.carriage),carrier:angle(g.carrier),fixed:angle(g.ring),ratio:v.ratio,parts:this.partCount,markers:this.showMarkers,coverVisible:this.cover.visible,apart:this.apart,teeth:{sun:g.sunGear?.userData.teeth,planet:g.planets?.map(p=>p.children.find(x=>x.userData.teeth)?.userData.teeth),ring:g.ringGear?.userData.teeth,flex:g.teeth?.count},planets:g.planets?.map((p,i)=>({x:p.position.x,y:p.position.y,orbit:Math.atan2(p.position.y,p.position.x),spin:p.rotation.z,materialAngle:p.rotation.z,expectedSpin:v.planetAngles?.[i]})),flexMarker:this.mode==='harmonic'?{base:Math.atan2(flexPoint(this.theta,0,0).y,flexPoint(this.theta,0,0).x),rim:Math.atan2(flexPoint(this.theta,0,1).y,flexPoint(this.theta,0,1).x)}:null}}
 update(theta,ex=0){this.theta=theta;this.apart=ex;const g=this.groups,mode=this.mode,v=sample(mode,theta,this.setting);this.cover.visible=!this.cut;
  if(mode==='planet'){const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)},gearLift=12*smooth((ex-.68)/.32);g.input.rotation.z=theta;g.input.position.z=gearLift;g.handle.rotation.z=theta;g.handle.position.z=75*smooth(ex/.3);g.output.rotation.z=v.output;g.carrier.rotation.z=v.output;g.carrier.position.z=45*smooth((ex-.2)/.45);g.ring.position.z=0;g.planets.forEach((p,i)=>{const a=v.orbits[i];p.position.set(36*Math.cos(a),36*Math.sin(a),29+gearLift);p.rotation.z=v.planetAngles?.[i]??(v.spin+Math.PI/18)});this.cover.position.z=92*smooth(ex/.3)}
  else if(mode==='harmonic'){this.updateHarmonic(theta,ex);this.cover.position.z=ex*65}
  else{g.carriage.position.x=v.x;g.carriage.position.z=ex*17;if(mode==='screw'){g.input.rotation.x=theta;this.cover.position.x=v.x;this.cover.position.z=ex*32}else if(mode==='rack'){g.input.rotation.set(Math.PI/2,0,theta);g.input.position.z=57+ex*27;this.cover.position.z=ex*45}else{g.input.rotation.z=theta;g.link.position.set(v.pinX,v.y,40+ex*20);g.link.rotation.z=Math.atan2(-v.y,v.x-v.pinX);this.cover.position.z=ex*45}}
  this.draw();
 }
}
