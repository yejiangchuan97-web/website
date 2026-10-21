/* 5-1: all geometry is in metres, XY is the floor, Z is up. No network assets. */
function createRebarScene(T,host,M,callbacks={}){
  const renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');renderer.domElement.style.touchAction='none';host.prepend(renderer.domElement);
  const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.05,160);camera.up.set(0,0,1);scene.background=new T.Color(0xf4f8ff);scene.fog=new T.Fog(0xf4f8ff,65,135);
  const world=new T.Group();scene.add(world);
  const material=(color,metalness=.1,roughness=.5)=>new T.MeshStandardMaterial({color,metalness,roughness});
  const mats={white:material(0xf1f6fd,.26,.32),edge:material(0xd3e2f0,.5,.32),blue:material(0x277cd9,.4,.31),navy:material(0x244c72,.52,.31),steel:material(0x6e8ca7,.77,.28),chrome:material(0xc7d9e9,.91,.22),rubber:material(0x273c50,.05,.82),floor:material(0xe4edf6,.05,.88),form:material(0xd3dfe9,.04,.83),timber:material(0xa9bccc,.03,.8),amber:material(0xdca047,.24,.48),red:material(0xcc6370,.19,.44),cyan:material(0x61b9d1,.3,.38)};
  const boxG=new T.BoxGeometry(1,1,1),cylG=new T.CylinderGeometry(1,1,1,24),sphereG=new T.SphereGeometry(1,10,8),tieG=new T.TorusGeometry(.016,.0023,5,14),unitY=new T.Vector3(0,1,0),tmpM=new T.Matrix4();
  const meshes=[],pickables=[],buckets=new Map(),partCounts={},labels=new T.Group(),covers=new T.Group(),upper=new T.Group(),lower=new T.Group(),ties=new T.Group(),spacers=new T.Group(),junctions=new T.Group(),reachRoot=new T.Group(),errorRoot=new T.Group();
  world.add(labels,covers,upper,lower,ties,spacers,junctions,reachRoot,errorRoot);
  function group(parent=world,pos=[0,0,0]){const g=new T.Group();g.position.set(...pos);parent.add(g);return g;}
  function addInstance(geo,mat,parent,pos,scale,q,id){const key=parent.uuid+'|'+mat+'|'+geo.uuid;let b=buckets.get(key);if(!b){b={geo,mat,parent,items:[]};buckets.set(key,b);}b.items.push({pos,scale,q:q?.clone()||new T.Quaternion(),id});if(id){const name=/^R\d+-C\d+$/.test(id)?'grid-marker':id;partCounts[name]=(partCounts[name]||0)+1;}return b;}
  function box(w,d,h,mat,parent=world,pos=[0,0,0],id,q){return addInstance(boxG,mat,parent,pos,[w,d,h],q,id);}
  function cyl(r,h,mat,parent=world,pos=[0,0,0],axis='z',id){const q=new T.Quaternion().setFromUnitVectors(unitY,new T.Vector3(...(axis==='x'?[1,0,0]:axis==='y'?[0,1,0]:[0,0,1])));return addInstance(cylG,mat,parent,pos,[r,h,r],q,id);}
  function rod(a,b,r=.008,mat='steel',parent=world,id){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),len=v.length();if(len<.000001)return;const q=new T.Quaternion().setFromUnitVectors(unitY,v.normalize());return addInstance(cylG,mat,parent,av.add(bv).multiplyScalar(.5).toArray(),[r,len,r],q,id);}
  function sphere(r,mat,parent,pos,id){return addInstance(sphereG,mat,parent,pos,[r,r,r],null,id);}
  function flush(){for(const b of buckets.values()){const o=new T.InstancedMesh(b.geo,mats[b.mat],b.items.length);o.castShadow=true;o.receiveShadow=true;o.userData.ids=b.items.map(x=>x.id);for(let i=0;i<b.items.length;i++){const x=b.items[i];tmpM.compose(new T.Vector3(...x.pos),x.q,new T.Vector3(...x.scale));o.setMatrixAt(i,tmpM);}o.computeBoundingSphere();b.parent.add(o);meshes.push(o);if(b.items.some(x=>x.id))pickables.push(o);}buckets.clear();}
  function single(geo,mat,parent,pos=[0,0,0],id){const o=new T.Mesh(geo,typeof mat==='string'?mats[mat]:mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;if(id){o.userData.id=id;pickables.push(o);partCounts[id]=(partCounts[id]||0)+1;}parent.add(o);meshes.push(o);return o;}
  function bolt(g,x,y,z,id,r=.023){cyl(r,.018,'chrome',g,[x,y,z],'z',id);box(r*1.2,.005,.004,'navy',g,[x,y,z+.011],id);}
  function ring(r,t,mat,parent,pos,id){return single(new T.TorusGeometry(r,t,8,60),mat,parent,pos,id);}
  function pipe(points,r,mat,parent,id){if(points.length<2)return null;const c=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));return single(new T.TubeGeometry(c,Math.max(16,points.length*6),r,8,false),mat,parent,[0,0,0],id);}
  const textures=[];
  function label(text,w,h,parent,pos,style={}){const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);if(style.bg){x.fillStyle=style.bg;x.fillRect(0,0,c.width,c.height);}x.fillStyle=style.color||'#456e95';x.font=`600 ${Math.round(c.height*.63)}px "Microsoft YaHei",Arial`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,c.width/2,c.height*.54,c.width*.94);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;textures.push(tex);const o=single(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),parent,pos);o.castShadow=false;return o;}
  // Broad studio lights provide four useful material tones without external environments.
  scene.add(new T.HemisphereLight(0xeaf4ff,0x8a9eb1,2.6));
  const key=new T.DirectionalLight(0xffffff,3.1);key.position.set(-12,-15,24);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-16,right:16,top:13,bottom:-13,near:1,far:70});key.shadow.normalBias=.025;key.shadow.bias=-.00013;scene.add(key);
  const fill=new T.DirectionalLight(0xa8d2ff,1.2);fill.position.set(12,10,12);scene.add(fill);
  const ground=single(new T.PlaneGeometry(300,300),material(0xf4f8ff,0,.94),scene,[0,0,-.48]);ground.castShadow=false;
  // Heavy portable teaching diorama, feet and a slim blue reveal around the edge.
  box(20.7,13.6,.34,'white',world,[0,0,-.26]);box(20.3,13.2,.1,'edge',world,[0,0,-.04]);box(20,13,.045,'floor',world,[0,0,.0325]);
  for(const x of[-9.7,9.7])for(const y of[-6.1,6.1]){cyl(.23,.11,'rubber',world,[x,y,-.43]);cyl(.12,.12,'steel',world,[x,y,-.32]);}
  box(20.4,.055,.095,'blue',world,[0,-6.66,-.18]);box(.055,13.3,.095,'blue',world,[-10.32,0,-.18]);
  for(let x=-9;x<10;x+=2)box(.012,12.7,.003,'edge',world,[x,0,.057]);
  for(const y of[-4.7,4.7])box(19.6,.014,.003,'edge',world,[0,y,.057]);
  // The pedestrian route is outside the work and stock areas, not across the grid.
  box(19.8,1,.012,'white',world,[0,5.7,.065],'route');
  for(const y of[5.18,6.22])box(19.8,.034,.014,'blue',world,[0,y,.07],'route');
  for(let x=-9.5;x<10;x+=1.2){const arrow=group(world,[x,5.68,.079]);const q1=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),.65),q2=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-.65);box(.22,.035,.005,'edge',arrow,[0,.055,0],'route',q1);box(.22,.035,.005,'edge',arrow,[0,-.055,0],'route',q2);}
  label('人 员 通 道',2.0,.24,labels,[-.2,5.72,.081]);
  // Split machine zones and a dedicated transfer aisle.
  for(const y of[3,0,-3]){box(6.8,2.64,.012,'white',world,[-6.2,y,.066]);for(const yy of[y-1.32,y+1.32])box(6.8,.026,.006,'edge',world,[-6.2,yy,.074]);}
  box(.6,9.5,.008,'edge',world,[-2.4,0,.063]);
  // Low protective rails end in bolted feet; the open aisle remains passable.
  for(const y of[-4.65,4.65]){const end=y<0?-6.4:-3.2;for(const x of[-9.6,-8,-6.4,-4.8,-3.2].filter(x=>x<=end)){box(.22,.22,.025,'edge',world,[x,y,.08]);cyl(.025,.66,'navy',world,[x,y,.41]);for(const dx of[-.07,.07])bolt(world,x+dx,y,.10,null,.013);}rod([-9.6,y,.65],[end,y,.65],.022,'blue');rod([-9.6,y,.35],[end,y,.35],.018,'edge');}
  const machineGroups={},machineCovers={},moving={},dynamicGeometries=[];
  function bench(id,y){const g=group(world,[-6.3,y,0]);machineGroups[id]=g;const cover=group(covers,[-6.3,y,0]);machineCovers[id]=cover;
    box(2.05,1.12,.12,'blue',g,[0,0,.17],id);box(1.94,1.04,.075,'edge',g,[0,0,.27],id);
    for(const x of[-.8,.8])for(const yy of[-.42,.42]){box(.18,.16,.12,'rubber',g,[x,yy,.11],id);box(.105,.105,.76,'white',g,[x,yy,.57],id);box(.20,.19,.03,'edge',g,[x,yy,.97],id);bolt(g,x,yy,.999,id);}
    for(const yy of[-.43,.43]){box(1.83,.08,.11,'edge',g,[0,yy,.49],id);box(2.22,.10,.11,'white',g,[0,yy,1.03],id);}
    for(const x of[-.87,.87])box(.10,.90,.09,'edge',g,[x,0,.49],id);
    box(2.25,1.23,.12,'white',g,[0,0,1.10],id);box(2.28,.05,.035,'blue',g,[0,-.62,1.10],id);
    for(const x of[-.99,.99])for(const yy of[-.5,.5])bolt(g,x,yy,1.17,id);
    // Motor bolted to the bottom frame, coaxial shaft and bounded cooling fins.
    cyl(.21,.53,'blue',g,[.15,.18,.50],'x',id);cyl(.19,.045,'edge',g,[-.137,.18,.50],'x',id);cyl(.17,.055,'navy',g,[.442,.18,.50],'x',id);cyl(.053,.15,'chrome',g,[-.225,.18,.50],'x',id);
    for(let x=-.08;x<.42;x+=.062)cyl(.222,.015,'edge',g,[x,.18,.50],'x',id);
    box(.40,.42,.055,'steel',g,[.16,.18,.29],id);for(const x of[0,.31])bolt(g,x,.35,.33,id,.018);
    box(.34,.33,.54,'white',g,[-.55,-.06,.55],id);box(.28,.018,.43,'edge',g,[-.55,-.235,.55],id);box(.026,.025,.12,'navy',g,[-.45,-.256,.56],id);for(const z of[.42,.69])box(.04,.035,.07,'steel',g,[-.68,-.25,z],id);
    cyl(.045,.022,'red',g,[-.61,-.275,.70],'y',id);cyl(.025,.025,'cyan',g,[-.5,-.278,.70],'y',id);
    pipe([[-.58,-.1,.28],[-.7,-.22,.20],[-.3,-.30,.20],[.22,-.26,.27]],.015,'rubber',g,id);
    const plate=label(id==='straighten'?'01  调直':id==='cut'?'02  切断':'03  弯曲',1.52,.21,g,[0,-.626,.80],{bg:'#edf5ff',color:'#2d6dab'});plate.rotation.x=Math.PI/2;
    // Actual roller stands: a horizontal roller is supported by two bearing blocks.
    const barZ=id==='straighten'?1.225:id==='cut'?1.245:1.32,rollerZ=barZ-.008-.065,crossZ=rollerZ-.10,legTop=crossZ-.0375,legBottom=.1025;
    for(const side of[-1,1]){for(const x of[side*1.65,side*2.35]){for(const yy of[-.34,.34]){box(.065,.065,legTop-legBottom,'edge',g,[x,yy,(legTop+legBottom)/2],id);box(.20,.16,.025,'navy',g,[x,yy,.09],id);}box(.08,.84,.075,'white',g,[x,0,crossZ],id);for(const yy of[-.30,.30]){box(.12,.11,.08,'blue',g,[x,yy,rollerZ-.0225],id);cyl(.027,.11,'chrome',g,[x,yy,rollerZ],'y',id);}cyl(.065,.53,'chrome',g,[x,0,rollerZ],'y',id);}for(const yy of[-.34,.34])rod([side*1.4,yy,crossZ],[side*2.5,yy,crossZ],.03,'edge',g,id);}
    box(2.18,.10,.32,'blue',cover,[0,.55,1.31],id);box(.10,1.1,.32,'white',cover,[-1.05,0,1.31],id);
    for(let x=-.85;x<=.85;x+=.17)box(.065,.007,.16,'navy',cover,[x,.495,1.32],id);
    return g;
  }
  const straight=bench('straighten',3),cut=bench('cut',0),bend=bench('bend',-3);
  // Passive reel on a spindle; a strand terminates in the inlet guide.
  for(const yy of[-.38,.38]){rod([-2.38,yy,.10],[-2.38,yy,.71],.045,'white',straight,'straighten');box(.55,.13,.05,'navy',straight,[-2.38,yy,.10],'straighten');}
  cyl(.07,1.0,'chrome',straight,[-2.38,0,.79],'y','straighten');
  for(const yy of[-.33,.33]){const rim=ring(.52,.024,'steel',straight,[-2.38,yy,.79],'straighten');rim.rotation.x=Math.PI/2;for(let i=0;i<6;i++){const a=i*Math.PI/3;rod([-2.38,yy,.79],[-2.38+.5*Math.cos(a),yy,.79+.5*Math.sin(a)],.016,'edge',straight,'straighten');}}
  for(let j=0;j<10;j++){const coil=ring(.36+j*.012,.008,'steel',straight,[-2.38,-.23+j*.05,.79],'straighten');coil.rotation.x=Math.PI/2;}
  pipe([[-2.09,-.25,1.10],[-1.8,-.18,1.225],[-1.65,-.1,1.225],[-1.0,-.06,1.225]],.008,'steel',straight,'straighten');
  for(const [x,y]of[[-1,-.06],[1,0]]){const s=new T.Shape();s.absarc(0,0,.062,0,Math.PI*2,false);const h=new T.Path();h.absarc(0,0,.022,0,Math.PI*2,true);s.holes.push(h);const geo=new T.ExtrudeGeometry(s,{depth:.12,bevelEnabled:false,curveSegments:24});geo.translate(0,0,-.06);geo.rotateY(Math.PI/2);single(geo,'chrome',straight,[x,y,1.225],'straighten');}
  const wheels=M.processingState('straighten',0).geometry.wheels,wheelMarks=[];
  for(const {x,y,radius}of wheels){box(.16,.16,.045,'edge',straight,[x,y,1.165],'straighten');cyl(radius,.10,'chrome',straight,[x,y,1.225],'z','straighten');cyl(.042,.047,'navy',straight,[x,y,1.30],'z','straighten');bolt(straight,x,y,1.33,'straighten',.023);box(.085,.085,.045,'blue',straight,[x,y+Math.sign(y)*.16,1.20],'straighten');rod([x,y,1.20],[x,y+Math.sign(y)*.25,1.20],.015,'chrome',straight,'straighten');const mark=group(straight,[x,y,1.278]);box(.06,.012,.004,'blue',mark,[.077,0,0],'straighten');wheelMarks.push(mark);}
  // Guillotine: fixed guide rails, lower blade and a true vertical carriage.
  for(const yy of[-.32,.32]){box(.12,.15,.78,'navy',cut,[.15,yy,1.52],'cut');box(.035,.06,.63,'chrome',cut,[.077,yy,1.53],'cut');}
  box(.28,.83,.11,'blue',cut,[.15,0,1.95],'cut');box(.20,.55,.042,'steel',cut,[-.10,0,1.181],'cut');box(.030,.52,.035,'chrome',cut,[-.016,0,1.2195],'cut');
  const blade=group(cut,[0,0,0]);box(.012,.51,.20,'chrome',blade,[.006,0,1.55],'cut');box(.18,.61,.13,'blue',blade,[.10,0,1.72],'cut');cyl(.045,.23,'chrome',blade,[.12,0,1.88],'z','cut');cyl(.084,.33,'white',cut,[.12,0,2.0],'z','cut');
  const clamp=group(cut);box(.21,.44,.075,'navy',clamp,[-.28,0,1.30],'cut');for(const yy of[-.16,.16])cyl(.022,.19,'chrome',cut,[-.28,yy,1.43],'z','cut');
  box(3.2,.11,.03,'edge',cut,[1.7,.37,1.22],'cut');for(let i=0;i<30;i++)box(.01,i%5===0?.09:.045,.006,'navy',cut,[.32+i*.095,.37,1.24],'cut');const stop=group(cut);box(.065,.49,.19,'blue',stop,[.0325,0,1.30],'cut');bolt(stop,.0325,.18,1.40,'cut');
  moving.cut={blade,clamp,stop};
  // Rotary bending table: stationary mandrel and a moving pin tangent to the bar.
  cyl(.53,.085,'edge',bend,[0,0,1.205],'z','bend');cyl(.49,.024,'blue',bend,[0,0,1.26],'z','bend');cyl(.152,.19,'chrome',bend,[0,0,1.355],'z','bend');cyl(.045,.026,'navy',bend,[0,0,1.464],'z','bend');
  for(let i=0;i<12;i++){const a=i*Math.PI/6;bolt(bend,.43*Math.cos(a),.43*Math.sin(a),1.285,'bend',.018);cyl(.022,.013,'navy',bend,[.32*Math.cos(a),.32*Math.sin(a),1.282],'z','bend');}
  const pin=group(bend);cyl(.037,.19,'chrome',pin,[0,0,1.355],'z','bend');cyl(.045,.026,'navy',pin,[0,0,1.275],'z','bend');
  for(const x of[-.65,-1.0]){cyl(.065,.18,'chrome',bend,[x,.25,1.36],'z','bend');box(.11,.18,.035,'navy',bend,[x,.25,1.26],'bend');}
  box(1.0,.065,.07,'blue',bend,[-.65,.36,1.25],'bend');for(let i=0;i<12;i++)box(.008,.03,.006,'white',bend,[-1.05+i*.07,.36,1.29],'bend');
  const arcPts=[];for(let i=0;i<=40;i++){const a=-i*Math.PI/80;arcPts.push([.67*Math.cos(a),.67*Math.sin(a),1.17]);}pipe(arcPts,.004,'navy',bend,'bend');
  moving.bend={pin};
  for(const [id,g]of Object.entries(machineGroups)){const bars=group(g);moving[id]={...moving[id],bars};}
  // A solid formwork board with a real rectangular hole (no painted rectangle).
  const config=M.REBAR_MODEL||M,slab=config.slab||{minX:-1.8,maxX:9.2,minY:-4.8,maxY:4.8,top:.6},opening=config.opening||[5,1.2,7,3.4],column=config.column||[1.3,1.2,2.3,2.2];
  const shape=new T.Shape();shape.moveTo(slab.minX,slab.minY);shape.lineTo(slab.maxX,slab.minY);shape.lineTo(slab.maxX,slab.maxY);shape.lineTo(slab.minX,slab.maxY);shape.closePath();const hole=new T.Path();hole.moveTo(opening[0],opening[1]);hole.lineTo(opening[0],opening[3]);hole.lineTo(opening[2],opening[3]);hole.lineTo(opening[2],opening[1]);hole.closePath();shape.holes.push(hole);
  const floorGeometry=new T.ExtrudeGeometry(shape,{depth:.22,bevelEnabled:false,steps:1});single(floorGeometry,'form',world,[0,0,.38],'slab');
  const floorTopTriangles=[],fp=floorGeometry.attributes.position,fi=floorGeometry.index;for(let i=0;i<(fi?fi.count:fp.count);i+=3){const ids=[0,1,2].map(k=>fi?fi.getX(i+k):i+k);if(ids.every(j=>Math.abs(fp.getZ(j)-.22)<1e-5))floorTopTriangles.push(ids.map(j=>[fp.getX(j),fp.getY(j)]));}
  // Edge beams and underside bearers support the formwork rather than float below it.
  for(const y of[slab.minY+.14,slab.maxY-.14])box(10.8,.28,.27,'edge',world,[3.7,y,.285],'slab');
  for(const x of[slab.minX+.14,slab.maxX-.14])box(.28,9.1,.27,'edge',world,[x,0,.285],'slab');
  for(let x=-1.2;x<=8.8;x+=1.2){if(x+.065>opening[0]&&x-.065<opening[2]){for(const [a,b]of[[-4.5,opening[1]],[opening[3],4.5]])box(.13,b-a,.13,'timber',world,[x,(a+b)/2,.335],'slab');}else box(.13,9.0,.13,'timber',world,[x,0,.335],'slab');for(const y of[-4,4]){box(.18,.18,.23,'white',world,[x,y,.16],'slab');box(.32,.32,.035,'navy',world,[x,y,.068],'slab');}}
  // The extruded board supplies real opening walls, with no coplanar overlay or bridge below.
  // A small boundary curb makes the void discernible in every camera view.
  for(const x of[opening[0]-.07,opening[2]+.07])box(.045,opening[3]-opening[1]+.17,.025,'amber',world,[x,(opening[1]+opening[3])/2,.615],'opening');
  for(const y of[opening[1]-.07,opening[3]+.07])box(opening[2]-opening[0]+.18,.045,.025,'amber',world,[(opening[0]+opening[2])/2,y,.615],'opening');
  label('洞 口',.92,.25,labels,[(opening[0]+opening[2])/2,(opening[1]+opening[3])/2,.10],{color:'#6c89a5'});
  // Column cage: eight longitudinal bars, closed ties and a concrete/column footprint.
  const cc=[(column[0]+column[2])/2,(column[1]+column[3])/2];box(1.0,1.0,.12,'edge',world,[...cc,.66],'column');
  const colBars=[];for(const x of[column[0]+.10,cc[0],column[2]-.10])for(const y of[column[1]+.10,column[3]-.10])colBars.push([x,y]);for(const y of[cc[1]])for(const x of[column[0]+.10,column[2]-.10])colBars.push([x,y]);
  for(const [x,y]of colBars)rod([x,y,.61],[x,y,3.06],.012,'steel',world,'column');
  for(let z=.83;z<=2.97;z+=.18){const x0=column[0]+.065,x1=column[2]-.065,y0=column[1]+.065,y1=column[3]-.065;for(const [a,b]of[[[x0,y0,z],[x1,y0,z]],[[x1,y0,z],[x1,y1,z]],[[x1,y1,z],[x0,y1,z]],[[x0,y1,z],[x0,y0,z]]])rod(a,b,.006,'navy',world,'column');rod([x0,y0,z],[x0+.09,y0+.12,z],.006,'navy',world,'column');rod([x0+.014,y0,z],[x0+.13,y0+.085,z],.006,'navy',world,'column');}
  // Segment clipping is geometric. Rods stop at the real hole and column footprint.
  function cutSegments(a,b,rects){let spans=[[0,1]];for(const r of rects){const axis=Math.abs(b[0]-a[0])>.0001?0:1,other=1-axis;if(a[other]<r[other]-.008||a[other]>r[other+2]+.008)continue;let lo=(r[axis]-.016-a[axis])/(b[axis]-a[axis]),hi=(r[axis+2]+.016-a[axis])/(b[axis]-a[axis]);if(lo>hi)[lo,hi]=[hi,lo];const next=[];for(const [s,e]of spans){if(hi<=s||lo>=e)next.push([s,e]);else{if(lo>s)next.push([s,Math.min(e,lo)]);if(hi<e)next.push([Math.max(s,hi),e]);}}spans=next;}return spans.filter(([s,e])=>e-s>.0001).map(([s,e])=>[a.map((v,i)=>v+(b[i]-v)*s),a.map((v,i)=>v+(b[i]-v)*e)]);}
  let barSegments=[],gridObjects=[],spacerPositions=[];
  function buildBars(spacingMM=400){for(const g of[upper,lower,ties,junctions,spacers])for(const ch of[...g.children])g.remove(ch);barSegments=[];spacerPositions=[];gridObjects=M.makeGrid?M.makeGrid(spacingMM):[];const step=spacingMM/1000,rects=[opening,column],inset=.08;
    const grid=config.grid||{minX:-.9,maxX:8.5,minY:-4.1,maxY:4.3};
    for(let y=grid.minY;y<=grid.maxY+.00001;y+=step){const a=[slab.minX+inset,y,.65],b=[slab.maxX-inset,y,.65];for(const [aa,bb]of cutSegments(a,b,rects)){rod(aa,bb,.008,'steel',lower,'slab');barSegments.push({a:aa,b:bb,layer:'lower'});}}
    for(let x=grid.minX;x<=grid.maxX+.00001;x+=step){const a=[x,slab.minY+inset,.666],b=[x,slab.maxY-inset,.666];for(const [aa,bb]of cutSegments(a,b,rects)){rod(aa,bb,.008,'navy',upper,'slab');barSegments.push({a:aa,b:bb,layer:'upper'});}}
    // Sparse actual wire wraps touch both bars; dots are a separate optional teaching layer.
    for(let i=0;i<gridObjects.length;i++){const p=gridObjects[i],isLoose=Math.abs(p.x-4.3)<1e-6&&Math.abs(p.y+2.9)<1e-6,isMissing=Math.abs(p.x-.7)<1e-6&&Math.abs(p.y+2.1)<1e-6;if((i%9===0||isLoose)&&!isMissing){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,1,0).normalize(),Math.PI/2);addInstance(tieG,'steel',ties,[p.x,p.y,.658],[1,1,1],q,'joint');rod([p.x+.011,p.y+.009,.674],[p.x+.028,p.y+.025,.688],.0023,'steel',ties,'joint');}sphere(.040,'white',junctions,[p.x,p.y,.702],p.id);if((p.row-1)%5===0&&(p.col-1)%5===0){box(.11,.11,.042,'white',spacers,[p.x,p.y,.621],'spacer');spacerPositions.push([p.x,p.y,.621]);}}
    flush();
  }
  buildBars(400);
  // 42 mm spacers are rebuilt at actual grid coordinates whenever spacing changes.
  // Material rack rests on bearers clear of the pedestrian route.
  const materialGroup=group(world);for(const x of[7.1,8.3])box(.15,1.35,.12,'timber',materialGroup,[x,-3.4,.734],'material');
  for(let j=0;j<4;j++)for(let k=0;k<5;k++){const y=-3.78+j*.19,z=.802+k*.016;rod([6.87,y,z],[8.72,y,z],.008,'steel',materialGroup,'material');}
  for(let j=0;j<5;j++){const z=.882+j*.016,x=7.95,y=-3.4;for(const [a,b]of[[[x,y,z],[x+.52,y,z]],[[x+.52,y,z],[x+.52,y+.46,z]],[[x+.52,y+.46,z],[x,y+.46,z]],[[x,y+.46,z],[x,y,z]]])rod(a,b,.008,'navy',materialGroup,'material');}
  label('半成品暂存',1.7,.20,labels,[7.8,-4.18,.612]);
  // Robot sits outside all reinforcement, on an independent hard platform.
  const robot=group(world),robotArm=group(robot),basePlatform=group(world,[2,-5.5,0]);box(4.0,1.0,.19,'edge',basePlatform,[0,0,.15]);box(3.96,.96,.025,'white',basePlatform,[0,0,.2575]);
  box(.88,.60,.20,'white',robot,[0,0,.39],'robot');box(.90,.61,.055,'blue',robot,[0,0,.52],'robot');for(const x of[-.31,.31])for(const y of[-.35,.35])cyl(.16,.095,'rubber',robot,[x,y,.31],'y','robot');
  cyl(.23,.12,'navy',robot,[0,0,.605],'z','robot');cyl(.18,.17,'white',robot,[0,0,.74],'z','robot');
  rod([0,0,.82],[.2,.36,1.52],.11,'white',robotArm,'robot');cyl(.15,.30,'blue',robotArm,[.20,.36,1.52],'x','robot');rod([.20,.36,1.52],[.35,1.02,1.72],.085,'white',robotArm,'robot');cyl(.11,.24,'navy',robotArm,[.35,1.02,1.72],'x','robot');rod([.35,1.02,1.72],[.35,1.32,1.34],.065,'blue',robotArm,'robot');box(.18,.22,.18,'white',robotArm,[.35,1.32,1.25],'robot');
  for(const x of[-.3,.3])for(const y of[-.25,.25])bolt(robot,x,y,.56,'robot');
  // Reach ring is a geometric planar footprint; class dots come from M, never the camera.
  let reachCircle=null;function buildReach(base){for(const o of[...reachRoot.children]){reachRoot.remove(o);if(o.geometry&&!o.isInstancedMesh)o.geometry.dispose();}const pts=[];for(let i=0;i<=160;i++){const a=i*Math.PI/80;pts.push(new T.Vector3(base[0]+6*Math.cos(a),base[1]+6*Math.sin(a),.705));}reachCircle=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineDashedMaterial({color:0x4a91da,dashSize:.15,gapSize:.12,transparent:true,opacity:.80}));reachCircle.computeLineDistances();reachRoot.add(reachCircle);}
  // Compact inspection jig beside the machines; design and measured bars are separate objects.
  const inspect=group(errorRoot,[-3.9,-5.3,0]);for(const x of[-1.65,1.65])for(const y of[-.78,.78]){box(.12,.12,.74,'edge',inspect,[x,y,.45]);box(.25,.25,.06,'navy',inspect,[x,y,.10]);}box(3.8,2.0,.10,'white',inspect,[0,0,.86]);box(.04,1.8,.06,'blue',inspect,[-1.78,0,.94]);
  label('半成品复核',1.65,.22,inspect,[0,-1.01,.79],{bg:'#edf5ff'}).rotation.x=Math.PI/2;
  const designBar=group(inspect),measuredBar=group(inspect);moving.errors={designBar,measuredBar};
  const selectedMarker=group(world);const selectedRing=ring(.098,.010,'amber',selectedMarker,[0,0,0]);selectedRing.material=new T.MeshBasicMaterial({color:0xe4a24b,depthTest:false,transparent:true,opacity:.96});selectedRing.renderOrder=9;selectedMarker.visible=false;
  flush();
  let state={mode:'overview',machine:'straighten',progress:0,cutaway:true,showLabels:true,showGrid:false,showReach:false,showUpper:true,showLower:true,showDesign:true,base:[1.8,-5.4],selectedId:'',errorKind:'short',errorAmount:100,spacingMM:400};
  let desired={az:-1.98,el:.76,r:33,tx:0,ty:0,tz:.3},current={...desired},lastProgressKey='',spacing=400,lastBase='';
  const centers={straighten:[-6.3,3,1.2],cut:[-6.3,0,1.25],bend:[-6.3,-3,1.25],slab:[3.6,-.3,.67],column:[1.8,1.7,1.5],opening:[6,2.3,.6],material:[7.8,-3.4,.8],route:[0,5.7,.1],spacer:[1.1,-2.1,.66],joint:[2,-2,.8],errors:[-3.9,-5.3,.94]};
  function clearDynamic(g){for(const o of[...g.children]){g.remove(o);if(o.geometry)o.geometry.dispose();}}
  function dynamicPolyline(points,z,mat,parent,r=.008){if(!points||points.length<2)return;const vs=points.map(p=>new T.Vector3(p[0],p[1],p[2]??z)),curve=new T.CurvePath();for(let i=1;i<vs.length;i++)if(vs[i].distanceTo(vs[i-1])>.000001)curve.add(new T.LineCurve3(vs[i-1],vs[i]));if(!curve.curves.length)return;const geom=new T.TubeGeometry(curve,Math.max(20,points.length*3),r,8,false);const o=new T.Mesh(geom,mats[mat]);parent.add(o);o.castShadow=true;return o;}
  function dynamicBend(a,z,parent){const g=a.geometry,R=g.bendRadius,A=a.bendAngleDeg*Math.PI/180,F=g.fixedLength,L=g.freeLength,total=F+R*A+L;class BendCurve extends T.Curve{getPoint(t,target=new T.Vector3()){const d=t*total;if(d<F)return target.set(-F+d,R,z);if(d<F+R*A){const th=(d-F)/R;return target.set(R*Math.sin(th),R*Math.cos(th),z);}const s=d-F-R*A;return target.set(R*Math.sin(A)+s*Math.cos(A),R*Math.cos(A)-s*Math.sin(A),z);}}const o=new T.Mesh(new T.TubeGeometry(new BendCurve(),220,.008,12,false),mats.navy);parent.add(o);o.castShadow=true;return o;}
  function updateMechanism(){const key=[state.machine,state.progress,state.lengthMM,state.angleDeg].join('|');if(key===lastProgressKey)return;lastProgressKey=key;
    for(const id of['straighten','cut','bend']){const p=id===state.machine?state.progress:0,partKey=[p,state.lengthMM,state.angleDeg].join('|');if(moving[id].key===partKey)continue;moving[id].key=partKey;const a=M.processingState?M.processingState(id,p,{lengthMM:state.lengthMM??2400,angleDeg:state.angleDeg??90}):null,g=moving[id].bars;clearDynamic(g);
      if(id==='straighten'){const ps=a?.geometry?.bar||[[-2.4,0],[-.9,.015],[-.3,-.015],[.3,.008],[2.3,0]];dynamicPolyline(ps,1.225,'navy',g,.008);for(let i=0;i<wheelMarks.length;i++)wheelMarks[i].rotation.z=a.geometry.wheels[i].angle;}
      if(id==='cut'){const pieces=a?.geometry?.pieces||[[[-2.4,0],[2.4,0]]];for(const ps of pieces)dynamicPolyline(ps,1.245,'navy',g,.008);moving.cut.blade.position.z=-(a?.blade||0)*.265;moving.cut.clamp.position.z=a?.geometry?.clampClosed?-.0095:0;moving.cut.stop.position.x=a.geometry.actualLengthM+a.geometry.separation;}
      if(id==='bend'){dynamicBend(a,1.32,g);const pinC=a?.geometry?.pinCenter||[.2,.23];moving.bend.pin.position.set(pinC[0],pinC[1],0);}
    }
  }
  let errorGeometryState=null;
  function updateErrors(){const {designBar,measuredBar}=moving.errors;clearDynamic(designBar);clearDynamic(measuredBar);const amount=Number(state.errorAmount)||0,kind=state.errorKind;
    const g=M.errorGeometry(kind,{lengthMM:state.lengthMM??2400,shortMM:amount,angleErrorDeg:amount,residualMM:amount}),all=[...g.design,...g.actual],min=[Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1]))],max=[Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))],offset=[-(min[0]+max[0])/2,-(min[1]+max[1])/2];
    const transform=ps=>ps.map(p=>[p[0]+offset[0],p[1]+offset[1]]);dynamicPolyline(transform(g.design),.94,'cyan',designBar,.008);dynamicPolyline(transform(g.actual),.943,'amber',measuredBar,.008);designBar.visible=state.showDesign!==false;errorGeometryState={...g,offset,tableOrigin:[-3.9,-5.3],designZ:.94,actualZ:.943};
  }
  function colorJunctions(){for(const o of junctions.children){if(!o.isInstancedMesh)continue;for(let i=0;i<gridObjects.length&&i<o.count;i++){const q=M.classifyPoint?.(gridObjects[i],{base:state.base,reach:6})||{status:'auto'};o.setColorAt(i,new T.Color(q.status==='auto'?0x3a8ce0:q.status==='manual'?0xdca047:0xd16573));}if(o.instanceColor)o.instanceColor.needsUpdate=true;}}
  function wake(){callbacks.wake?.();callbacks.onChange?.();}
  function setState(value={}){const prev=state;state={...state,...value};state.base=Array.isArray(state.base)?state.base:[1.8,-5.4];if(state.spacingMM!==spacing){spacing=state.spacingMM;buildBars(spacing);}labels.visible=state.showLabels!==false;upper.visible=state.showUpper!==false;lower.visible=state.showLower!==false;ties.visible=upper.visible&&lower.visible;spacers.visible=true;junctions.visible=Boolean(state.showGrid||state.showReach);reachRoot.visible=Boolean(state.showReach);errorRoot.visible=state.mode==='errors';for(const [id,g]of Object.entries(machineCovers))g.visible=!state.cutaway;
    const bk=state.base.join(',');if(bk!==lastBase){lastBase=bk;robot.position.set(state.base[0],state.base[1],.12);buildReach(state.base);colorJunctions();}if(prev.showReach!==state.showReach||prev.showGrid!==state.showGrid||prev.spacingMM!==state.spacingMM)colorJunctions();const selectedPoint=gridObjects.find(p=>p.id===state.selectedId);selectedMarker.visible=Boolean(selectedPoint);if(selectedPoint)selectedMarker.position.set(selectedPoint.x,selectedPoint.y,.717);updateMechanism();if(state.mode==='errors')updateErrors();wake();}
  function setView(name='iso',immediate=false){const presets={iso:{az:-1.98,el:.76,r:33,tx:0,ty:0,tz:.3},top:{az:-Math.PI/2,el:1.55,r:33,tx:0,ty:0,tz:0},front:{az:-Math.PI/2,el:.28,r:33,tx:0,ty:0,tz:.9},detail:{az:-1.87,el:.68,r:8,tx:3.4,ty:0,tz:.68},section:{az:-1.80,el:.16,r:3.1,tx:1.1,ty:-2.1,tz:.64}};Object.assign(desired,presets[name]||presets.iso);if(name==='detail'&&state.mode==='process')focus(state.machine);if(immediate||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)current={...desired};wake();}
  function focus(id){const point=gridObjects.find(p=>p.id===id),p=point?[point.x,point.y,point.z]:id==='robot'?[state.base[0],state.base[1],1]:centers[id]||centers.slab;Object.assign(desired,{az:id==='column'?-1.9:-1.78,el:id==='spacer'?.30:id==='opening'?1.08:.70,r:point?3:['straighten','cut','bend'].includes(id)?6.9:id==='column'?5.8:id==='spacer'?2.4:id==='robot'?4:id==='errors'?5.6:id==='route'?21:id==='slab'?18:7.5,tx:p[0],ty:p[1],tz:p[2]});if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)current={...desired};wake();}
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();wake();}
  const ro=new ResizeObserver(resize);ro.observe(host);
  const raycaster=new T.Raycaster(),mouse=new T.Vector2(),pointers=new Map();let gesture=null,moved=false;
  function pick(x,y){const b=renderer.domElement.getBoundingClientRect();mouse.set((x-b.left)/b.width*2-1,-(y-b.top)/b.height*2+1);raycaster.setFromCamera(mouse,camera);const visible=pickables.filter(o=>{let attached=false;for(let p=o;p;p=p.parent){if(!p.visible)return false;if(p===world)attached=true;}return attached;});const hits=raycaster.intersectObjects(visible,false);for(const hit of hits){const id=hit.object.isInstancedMesh?hit.object.userData.ids[hit.instanceId]:hit.object.userData.id;if(id){callbacks.onSelect?.(id);return;}}}
  function pointDown(e){if(e.target!==renderer.domElement)return;host.focus?.({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY});renderer.domElement.setPointerCapture(e.pointerId);moved=false;if(pointers.size===2){const a=[...pointers.values()];gesture={distance:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx:(a[0].x+a[1].x)/2,cy:(a[0].y+a[1].y)/2};}}
  function pan(dx,dy){const scale=current.r*.00135;desired.tx+=(-Math.sin(current.az)*dx-Math.cos(current.az)*dy)*scale;desired.ty+=(Math.cos(current.az)*dx-Math.sin(current.az)*dy)*scale;}
  function pointMove(e){const p=pointers.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;moved||=Math.hypot(p.x-p.sx,p.y-p.sy)>4;if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),cx=(a[0].x+a[1].x)/2,cy=(a[0].y+a[1].y)/2;if(gesture){desired.r=Math.max(1.8,Math.min(48,desired.r*gesture.distance/Math.max(1,d)));pan(cx-gesture.cx,cy-gesture.cy);}gesture={distance:d,cx,cy};moved=true;}else if(e.shiftKey||e.buttons===2)pan(dx,dy);else{desired.az-=dx*.006;desired.el=Math.max(.08,Math.min(1.55,desired.el+dy*.005));}wake();}
  function pointUp(e){if(pointers.has(e.pointerId)&&!moved&&pointers.size===1)pick(e.clientX,e.clientY);pointers.delete(e.pointerId);gesture=null;}
  const wheel=e=>{e.preventDefault();desired.r=Math.max(1.8,Math.min(48,desired.r*Math.exp(e.deltaY*.00075)));wake();},context=e=>e.preventDefault();
  renderer.domElement.addEventListener('pointerdown',pointDown);renderer.domElement.addEventListener('pointermove',pointMove);renderer.domElement.addEventListener('pointerup',pointUp);renderer.domElement.addEventListener('pointercancel',pointUp);renderer.domElement.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('contextmenu',context);
  function render(dt=1/60,reduced=false){const ease=reduced?1:1-Math.exp(-Math.min(Math.max(0,dt),.1)*11);let movingCamera=false;for(const k of Object.keys(current)){const d=desired[k]-current[k];if(Math.abs(d)>.00005)movingCamera=true;current[k]+=d*ease;}const r=current.r*Math.max(1,1.12/camera.aspect),target=new T.Vector3(current.tx,current.ty,current.tz);camera.position.set(target.x+r*Math.cos(current.el)*Math.cos(current.az),target.y+r*Math.cos(current.el)*Math.sin(current.az),target.z+r*Math.sin(current.el));camera.lookAt(target);renderer.render(scene,camera);return movingCamera;}
  function projectPoint(p){const a=(Array.isArray(p)?new T.Vector3(...p):new T.Vector3(p.x,p.y,p.z??.7)).project(camera);return{x:(a.x+1)*host.clientWidth/2,y:(1-a.y)*host.clientHeight/2,visible:a.z>=-1&&a.z<=1};}
  function snapshot(){const counts={};for(const p of gridObjects){const k=M.classifyPoint?.(p,{base:state.base,reach:6})?.status||'auto';counts[k]=(counts[k]||0)+1;}return{available:true,world:'metres, XY floor, Z up',partCounts,totalParts:Object.values(partCounts).reduce((a,b)=>a+b,0),meshObjects:meshes.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,barSegments:barSegments.map(s=>({a:s.a.slice(),b:s.b.slice(),layer:s.layer})),barDiameter:.016,lowerCentreZ:.65,upperCentreZ:.666,spacerHeight:.042,spacerPositions:spacerPositions.map(p=>p.slice()),floorTopTriangles,floorTriangles:floorTopTriangles,geometryAudit:{formworkTop:.6,hole:opening.slice(),topTriangleCount:floorTopTriangles.length,lowerBarZ:.65,upperBarZ:.666,barRadius:.008,barContactGap:0,robotWheelBottom:.27,robotPlatformTop:.27,robotPlatform:config.platform||[0,-6,4,-5]},gridPoints:gridObjects.length,junctionCounts:counts,opening:opening.slice(),column:column.slice(),slab:{...slab},base:state.base.slice(),reach:6,view:{...current},desiredView:{...desired},camera:camera.position.toArray(),state:{...state},selectedPoint:gridObjects.find(p=>p.id===state.selectedId)||null,errorGeometry:errorGeometryState,process:M.processingState?.(state.machine,state.progress,{lengthMM:state.lengthMM??2400,angleDeg:state.angleDeg??90})};}
  setState(state);resize();render(1,true);
  return{setState,setView,focus,resize,render,tick:render,snapshot,projectPoint,dispose(){ro.disconnect();for(const [n,f]of[['pointerdown',pointDown],['pointermove',pointMove],['pointerup',pointUp],['pointercancel',pointUp],['wheel',wheel],['contextmenu',context]])renderer.domElement.removeEventListener(n,f);const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of textures)t.dispose();renderer.dispose();renderer.domElement.remove();}};
}
