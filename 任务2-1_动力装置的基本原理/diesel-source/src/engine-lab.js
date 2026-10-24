// Phase-locked illustrative flow, atomization and compression ignition.
// All animation is derived from crank angle so pause, stepping and seeking agree.
// Shared-shaft inline diesel teaching model. No remote assets or dependencies.
function createMultiEngine(THREE, scene, clip) {
 const root=new THREE.Group(); scene.add(root); root.visible=false;
 const $=id=>document.getElementById(id), TAU=Math.PI*2, mod=(x,n=720)=>(x%n+n)%n;
 const phaseNames=['进气','压缩','做功','排气'],phaseColors=['#3b9dff','#d6b451','#f3933e','#92a6c4'];
 const systems={structure:'机体与密封',motion:'曲柄连杆',valvetrain:'配气与正时',fuel:'燃油供给',air:'进排气与增压',cooling:'冷却循环',oil:'润滑循环',electric:'启动与电气'};
 const catalog=[
 ['block','整体气缸体','structure','共用整体式气缸体，带独立缸孔、冷却水套、主轴承座和侧壁加强筋。所有气缸共同驱动同一根曲轴。',[0,.5,-3.2]],
 ['liners','湿式缸套','structure','每缸独立的中空缸套，引导活塞并向水套传热。下端密封圈隔离冷却液与机油。',[0,2.2,-1.4]],
 ['gasket','缸垫与火圈','structure','位于气缸体与缸盖之间，围绕各缸孔密封燃气，并分隔冷却液与润滑油通道。',[0,3.2,0]],
 ['head','整体缸盖','structure','带各缸燃烧室、气门导管与喷油器孔的共用缸盖。剖切仅作用于机体壳件，保留运动部件。',[0,4.3,0]],
 ['cover','气门室盖','structure','覆盖凸轮与摇臂机构，防止机油飞溅和异物进入；拆下后可查看完整配气机构。',[0,6.8,0]],
 ['sump','油底壳','oil','底部储存机油，具有放油螺塞和螺栓法兰。吸油集滤器从油底壳抽取机油。',[0,-2.0,0]],
 ['pistons','活塞与燃烧碗','motion','各缸活塞采用曲柄连杆几何约束运动，顶部凹碗示意直喷柴油机燃烧室。可按缸号观察不同相位。',[0,2.8,2.3]],
 ['rings','活塞环组','motion','每缸两道气环和一道油环，用于密封燃气、传热及刮除多余机油；拆解时与活塞分开展示。',[0,3.7,3.2]],
 ['pins','活塞销','motion','贯穿活塞销座并连接连杆小头，允许连杆随曲轴转动而摆动。',[0,1.8,4.4]],
 ['rods','连杆与轴瓦','motion','每缸连杆连接活塞销与曲柄销。大头轴瓦包围曲柄销；运动时两端销轴始终满足固定杆长。',[0,.5,3.2]],
 ['crank','共用多拐曲轴','motion','一根贯穿整机的曲轴，由主轴颈、各缸偏置曲柄销、曲柄臂及平衡块组成。相位由所选做功顺序确定。',[0,-.4,4.9]],
 ['bearings','主轴瓦与轴承盖','motion','在相邻曲柄之间支承共用曲轴。轴承盖与上下轴瓦可独立拆出。',[0,-1.5,2.4]],
 ['flywheel','飞轮与齿圈','motion','与共用曲轴同步转动；惯性储能平抑转速波动，外齿圈用于启动机啮合。',[3.7,0,0]],
 ['valves','进排气门与弹簧','valvetrain','每缸一对气门：蓝色进气、铜色排气。开启量与该缸的720°工作循环同步，采用理想化正时。',[0,5.1,1.5]],
 ['rockers','摇臂与滚轮','valvetrain','位于气门与凸轮之间，把凸轮升程传给气门；随对应气门的开启而摆动。',[0,5.8,-1.7]],
 ['cam','凸轮轴','valvetrain','共用顶置凸轮轴带每缸进排气凸轮，以曲轴一半的转速旋转；曲轴转720°时凸轮轴转360°。',[0,6.0,-3.1]],
 ['timing','2∶1 正时齿轮','valvetrain','曲轴小齿轮经惰轮驱动大齿轮和凸轮轴；大小齿轮直径比2∶1，保持四冲程配气关系。',[-3.4,1.7,-2.0]],
 ['injectors','各缸喷油器','fuel','每缸独立喷油器，压缩末期至做功初期显示喷雾。燃烧由压缩热引发，模型不使用火花塞。',[0,5.1,3.1]],
 ['rail','共轨与高压油管','fuel','共轨向各缸喷油器分配高压燃油。金色高压支管通向每个喷油器，蓝色气路与之区分。',[0,3.0,4.4]],
 ['fuelpump','高压油泵','fuel','把过滤后的柴油升压送往共轨；外部接头和回油管用于展示供油连接。',[-2.6,.4,3.3]],
 ['fuelfilter','燃油滤清器','fuel','供油前端的过滤与油水分离组件，连接低压进油、出油及底部排水口。',[-3.4,1.8,3.6]],
 ['intake','进气歧管','air','蓝色总管将增压冷却后的新鲜空气分配到每个气缸的进气门口。',[0,1.1,4.5]],
 ['exhaust','排气歧管','air','铜色支管汇集各缸废气，接入涡轮端；废气随后经排气出口排出。',[0,1.1,-4.6]],
 ['turbo','涡轮增压器','air','同轴的排气涡轮与进气压气机：废气驱动涡轮，压气机向中冷器送气。双蜗壳和连接轴分区展示。',[2.8,1.8,-3.6]],
 ['airfilter','空气滤清器','air','滤筒内设折叠滤芯，进气经滤清器后流向压气机。',[-2.1,2.7,4.2]],
 ['intercooler','中冷器与增压管','air','增压后的热空气经前置中冷器降温，再进入蓝色进气歧管；管路与散热器分开展示。',[-5.1,.7,0]],
 ['radiator','散热器与水管','cooling','散热器芯、上下水室及软管构成外部冷却回路。青色水路连接节温器、水泵及气缸体水套。',[-4.0,.4,0]],
 ['waterpump','水泵与节温器','cooling','水泵推动冷却液循环，缸盖出水端经节温器和上水管通往散热器。',[-2.6,1.2,-1.6]],
 ['fan','冷却风扇','cooling','安装在散热器后方，以叶片转动示意强制通风散热。随共用曲轴运行和暂停。',[-3.0,.3,1.7]],
 ['oilpump','机油泵与集滤器','oil','吸油管末端集滤器位于油底壳中；机油泵把润滑油送入滤清器和主油道。',[-1.7,-1.4,-2.8]],
 ['oilfilter','机油滤清器与油冷器','oil','机油过滤后沿金黄色主油道通向主轴承和各润滑点；板式油冷器示意油液换热。',[1.8,-.4,3.6]],
 ['starter','启动机','electric','启动电机与电磁开关位于飞轮齿圈旁；仅示意启动机构，运行时不持续啮合。',[3.8,-.6,2.3]],
 ['alternator','发电机与附件皮带','electric','皮带连接曲轴、水泵和发电机带轮。发电机壳体带通风槽，随曲轴联动示意。',[-3.5,0,-3.6]],
 ['mounts','悬置与紧固件','structure','四角减振悬置、机体连接螺栓和缸盖螺栓。拆解为教学分组，实际装配应遵守厂家工艺。',[0,-1.5,-4.2]]
 ];
 let count=0, order=[], groups={}, nodes=[], meshes=[], markers=[], cylinders=[], rotating=[], system='all', selected=null, isolated=false, context=null;
 const palette={shell:0x43668e,steel:0xb9cddd,bright:0xe3efff,dark:0x283e57,black:0x111c2c,gold:0xd8b468,blue:0x268ad0,copper:0xa87955,teal:0x35aeac,rubber:0x202632};
 const baseMats={};for(const [key,color]of Object.entries(palette))baseMats[key]=new THREE.MeshStandardMaterial({color,metalness:key==='rubber'?.05:.55,roughness:key==='rubber'?.8:.34,side:THREE.DoubleSide});
 const dotGeo=new THREE.SphereGeometry(.027,6,4), yAxis=new THREE.Vector3(0,1,0), temp=new THREE.Vector3();
 function add(parent,geo,mat='steel',p=[0,0,0],r=[0,0,0],shell=false){const m=new THREE.Mesh(geo,(typeof mat==='string'?baseMats[mat]:mat).clone());m.position.set(...p);m.rotation.set(...r);let g=parent;while(g&&!g.userData.part)g=g.parent;m.userData.part=g?.userData.part;m.userData.shell=shell;m.userData.originalColor=m.material.color?.clone();m.castShadow=false;m.receiveShadow=true;parent.add(m);meshes.push(m);return m;}
 const box=(g,w,h,d,p,mat='shell',shell=false)=>add(g,new THREE.BoxGeometry(w,h,d),mat,p,[0,0,0],shell);
 function cyl(g,r,h,p,mat='steel',axis='y',shell=false,n=24){return add(g,new THREE.CylinderGeometry(r,r,h,n),mat,p,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0],shell);}
 function torus(g,ro,th,p,mat='steel',axis='y'){return add(g,new THREE.TorusGeometry(ro,th,6,32),mat,p,axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0]);}
 function tube(g,pts,r,mat='steel'){return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),Math.max(12,pts.length*6),r,8,false),mat);}
 function beam(g,a,b,r,mat='steel'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va);const m=cyl(g,r,d.length(),va.add(vb).multiplyScalar(.5).toArray(),mat);m.quaternion.setFromUnitVectors(yAxis,d.normalize());return m;}
 function annulus(g,ro,ri,h,p,mat='steel',axis='y',shell=false){const s=new THREE.Shape();s.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();hole.absarc(0,0,ri,0,TAU,true);s.holes.push(hole);return add(g,new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:24}),mat,axis==='y'?[p[0],p[1]+h/2,p[2]]:axis==='x'?[p[0]-h/2,p[1],p[2]]:[p[0],p[1],p[2]-h/2],axis==='y'?[Math.PI/2,0,0]:axis==='x'?[0,Math.PI/2,0]:[0,0,0],shell);}
 function bolt(g,p,axis='y'){return cyl(g,.052,.06,p,'bright',axis,false,6);}
 function plateWithBores(g,w,d,h,y,xs,r,mat,shell=true){const s=new THREE.Shape();s.moveTo(-w/2,-d/2);s.lineTo(w/2,-d/2);s.lineTo(w/2,d/2);s.lineTo(-w/2,d/2);s.closePath();for(const x of xs){const hole=new THREE.Path();hole.absarc(x,0,r,0,TAU,true);s.holes.push(hole);}return add(g,new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:24}),mat,[0,y+h/2,0],[Math.PI/2,0,0],shell);}
 function child(parent,p=[0,0,0]){const g=new THREE.Group();g.position.set(...p);parent.add(g);return g;}
 function pathFX(parent,pts,color,n=16){const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));const g=new THREE.Group();parent.add(g);const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false});const dots=[];for(let i=0;i<n;i++){const m=new THREE.Mesh(dotGeo,mat);g.add(m);dots.push(m);}return{g,update(angle,visible){g.visible=visible;if(visible)for(let i=0;i<n;i++){path.getPoint(mod(angle/95+i/n,1),temp);dots[i].position.copy(temp);}}};}
 function resetModel(){const geometries=new Set(),mats=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)mats.add(o.material);});for(const g of geometries)if(g!==dotGeo)g.dispose();for(const m of mats){if(m.map)m.map.dispose();m.dispose();}root.clear();for(const m of markers)m.el.remove();groups={};nodes=[];meshes=[];markers=[];cylinders=[];rotating=[];selected=null;isolated=false;system='all';}
 function build(n){
  resetModel();count=n;order=n===4?[1,3,4,2]:[1,5,3,6,2,4];const pitch=1.28,xs=Array.from({length:n},(_,i)=>(i-(n-1)/2)*pitch),span=n*pitch,front=-span/2-.12,rear=span/2+.16;
  for(const [id,name,sys,desc,offset]of catalog){const g=new THREE.Group();g.userData={part:'m_'+id,name,sys,desc,offset:new THREE.Vector3(...offset),detached:0,amount:0};groups[id]=g;root.add(g);nodes.push(g);}
  const G=groups;
  // A shared, hollow block with actual bore openings and a separate crankcase.
  plateWithBores(G.block,span,1.55,.2,2.47,xs,.51,'shell');plateWithBores(G.block,span,1.55,.16,.7,xs,.51,'shell');
  for(const z of [-.76,.76]){box(G.block,span,1.7,.15,[0,1.6,z],'shell',true);for(let i=0;i<=n;i++){box(G.block,.09,1.68,.17,[-span/2+i*pitch,1.56,z*1.11],'dark',true);bolt(G.block,[-span/2+i*pitch,2.3,z*1.13],'z');}box(G.block,span,1.0,.15,[0,.1,z],'shell',true);}
  for(const x of [-span/2,span/2]){box(G.block,.15,2.15,1.53,[x,1.49,0],'shell',true);annulus(G.block,.66,.2,.15,[x,0,0],'shell','x',true);}
  plateWithBores(G.head,span+.06,1.6,.39,2.83,xs,.21,'shell');plateWithBores(G.gasket,span+.04,1.56,.045,2.6,xs,.46,'black',false);
  for(const x of xs){annulus(G.gasket,.49,.455,.047,[x,2.6,0],'gold');annulus(G.liners,.505,.465,1.92,[x,1.62,0],'steel','y',true);for(const y of [.78,.85])torus(G.liners,.51,.017,[x,y,0],'rubber');for(const z of [-.62,.62])bolt(G.mounts,[x,3.055,z]);}
  box(G.cover,span+.09,.16,1.56,[0,3.79,0],'shell',true);for(const z of [-.74,.74])box(G.cover,span+.09,.33,.07,[0,3.58,z],'shell',true);for(const x of [-span/2,span/2])box(G.cover,.07,.33,1.54,[x,3.58,0],'shell',true);cyl(G.cover,.15,.07,[xs[0],3.91,.35],'black');
  // Hollow pan (bottom + side walls), flange, drain plug and mounting feet.
  box(G.sump,span,.1,1.48,[0,-1.05,0],'dark',true);for(const z of [-.7,.7])box(G.sump,span,.44,.1,[0,-.83,z],'shell',true);for(const x of [-span/2+.04,span/2-.04])box(G.sump,.1,.44,1.46,[x,-.83,0],'shell',true);box(G.sump,span+.12,.08,1.65,[0,-.58,0],'steel',true);bolt(G.sump,[0,-1.13,.25]);
  for(const x of [-span*.35,span*.35])for(const z of [-1.0,1.0]){box(G.mounts,.62,.13,.5,[x,-.49,z],'dark');cyl(G.mounts,.16,.23,[x,-.67,z],'rubber');box(G.mounts,.61,.09,.5,[x,-.83,z],'steel');bolt(G.mounts,[x,-.36,z]);}
  const shaft=child(G.crank);cyl(shaft,.13,span+.72,[0,0,0],'bright','x');rotating.push({g:shaft,factor:1});
  // One flywheel and one common shaft; throws are fixed at cylinder phase offsets.
  const fly=child(G.flywheel,[rear+.32,0,0]);annulus(fly,.85,.6,.22,[0,0,0],'dark','x');cyl(fly,.24,.3,[0,0,0],'steel','x');for(let k=0;k<8;k++){const a=k*TAU/8;beam(fly,[0,.2*Math.cos(a),.2*Math.sin(a)],[0,.73*Math.cos(a),.73*Math.sin(a)],.055,'steel');bolt(fly,[.18,.18*Math.cos(a),.18*Math.sin(a)],'x');}for(let k=0;k<64;k++){const a=k*TAU/64,m=box(fly,.2,.045,.075,[0,.875*Math.cos(a),.875*Math.sin(a)],'bright');m.rotation.x=a; }rotating.push({g:fly,factor:1});
  for(let k=0;k<=n;k++){const x=-span/2+k*pitch;cyl(G.bearings,.235,.15,[x,0,0],'gold','x');const cap=box(G.bearings,.22,.12,.8,[x,-.25,0],'dark');for(const z of [-.32,.32])bolt(G.bearings,[x,-.33,z]);}
  const cam=child(G.cam,[0,3.43,-.08]);cyl(cam,.077,span+.35,[0,0,0],'steel','x');rotating.push({g:cam,factor:.5});
  // Three meshed idlers span the distance to the overhead cam. Four mesh
  // contacts retain direction; 18/36 teeth give the required half-speed cam.
  const gearX=front-.25, idlerR=(3.43-.27-.54)/6;
  const gearTrain=[[0,0,.27,18,1],[.27+idlerR,0,idlerR,29,-.27/idlerR],[.27+3*idlerR,0,idlerR,29,.27/idlerR],[.27+5*idlerR,0,idlerR,29,-.27/idlerR],[3.43,-.08,.54,36,.5]];
  for(const [y,z,r,teeth,factor]of gearTrain){const gear=child(G.timing,[gearX,y,z]);annulus(gear,r-.018,.08,.11,[0,0,0],'steel','x');cyl(gear,.095,.16,[0,0,0],'gold','x');for(let k=0;k<teeth;k++){const a=k*TAU/teeth,m=box(gear,.12,.055,.058,[0,r*Math.cos(a),r*Math.sin(a)],'bright');m.rotation.x=a;}rotating.push({g:gear,factor});}
  cyl(G.timing,.09,.48,[front-.07,0,0],'steel','x');cyl(G.timing,.075,.48,[front-.07,3.43,-.08],'steel','x');
  const fxs=[];
  xs.forEach((x,i)=>{
   const fire=order.indexOf(i+1)*720/n,initial=(360-fire)*Math.PI/180;
   const throwGroup=child(shaft,[x,0,0]);throwGroup.rotation.x=initial;
   cyl(throwGroup,.12,.47,[0,.48,0],'gold','x');for(const dx of [-.3,.3]){const arm=box(throwGroup,.16,.8,.27,[dx,.12,0],'steel');cyl(throwGroup,.29,.18,[dx,-.14,0],'dark','x');cyl(throwGroup,.2,.18,[dx,.48,0],'steel','x');}
   const p=child(G.pistons,[x,0,0]);annulus(p,.456,.33,.43,[0,.035,0],'steel');annulus(p,.456,.18,.085,[0,.29,0],'bright');cyl(p,.175,.035,[0,.235,0],'dark');for(const sg of [-1,1])cyl(p,.085,.08,[sg*.3,-.03,0],'steel','x');
   const rings=child(G.rings,[x,0,0]);for(const y of [.16,.22,.03])torus(rings,.459,.012,[0,y,0],y===.03?'gold':'black');
   const pin=child(G.pins,[x,0,0]);annulus(pin,.084,.045,.77,[0,-.03,0],'bright','x');
   const rod=child(G.rods,[x,0,0]);annulus(rod,.175,.12,.15,[0,0,0],'steel','x');annulus(rod,.13,.084,.13,[0,1.72,0],'steel','x');box(rod,.13,1.43,.12,[0,.86,0],'steel');box(rod,.16,1.33,.04,[0,.86,.08],'bright');box(rod,.2,.11,.4,[0,-.12,0],'dark');for(const z of [-.16,.16])bolt(rod,[0,-.2,z]);
   const v=[],rock=[];for(let j=0;j<2;j++){const z=j===0?.33:-.33,vg=child(G.valves,[x,0,z]);cyl(vg,.175,.045,[0,2.61,0],j?'copper':'blue');cyl(vg,.027,.79,[0,3.0,0],'bright');cyl(vg,.11,.04,[0,3.4,0],'steel');const points=[];for(let k=0;k<=64;k++){const a=k/64*TAU*5;points.push(new THREE.Vector3(.085*Math.cos(a),3.03+k/64*.29,.085*Math.sin(a)));}add(vg,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.012,5,false),'steel');v.push(vg);const rg=child(G.rockers,[x,3.43,z*.2]);box(rg,.12,.07,.62,[0,0,z*.3],'steel');cyl(rg,.055,.13,[0,0,-z*.15],'gold','x');rock.push(rg);
    const localMid=j===0?90:630,offset=mod(360-fire-localMid,720)*Math.PI/360, lobe=child(cam,[x+(j?-.16:.16),0,0]);lobe.rotation.x=offset;const lobeShape=new THREE.Shape();for(let k=0;k<=48;k++){const a=k*TAU/48,rr=.1+.075*Math.pow(Math.max(0,Math.cos(a)),3);const pt=[Math.sin(a)*rr,Math.cos(a)*rr];k?lobeShape.lineTo(...pt):lobeShape.moveTo(...pt);}add(lobe,new THREE.ExtrudeGeometry(lobeShape,{depth:.09,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:1}), 'bright',[-.045,0,0],[0,Math.PI/2,0]);
   }
   const nozzle=child(G.injectors,[x,0,0]);cyl(nozzle,.065,.78,[0,3.02,0],'dark');cyl(nozzle,.12,.25,[0,3.48,0],'gold');cyl(nozzle,.085,.14,[0,3.67,0],'black');cyl(nozzle,.025,.13,[0,2.59,0],'bright');
   tube(G.rail,[[x,3.53,0],[x+.22,3.68,.15],[x+.28,3.61,.73],[x+.1,3.33,.98]],.026,'gold');
   for(const [z,key,mat]of [[1.13,'intake','blue'],[-1.13,'exhaust','copper']]){tube(G[key],[[x,2.8,z*.46],[x,2.81,z*.72],[x,2.69,z]],.12,mat);box(G[key],.39,.32,.07,[x,2.8,z*.66],'steel');}
   const fx=child(root,[x,0,0]);const gas=new THREE.Mesh(new THREE.CylinderGeometry(.447,.447,1,24),new THREE.MeshBasicMaterial({color:phaseColors[0],transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide}));fx.add(gas);
   const spray=new THREE.Group();fx.add(spray);for(let k=0;k<6;k++){const a=k*TAU/6;const path=pathFX(spray,[[0,2.57,0],[Math.cos(a)*.17,2.49,Math.sin(a)*.17],[Math.cos(a)*.36,2.36,Math.sin(a)*.36]],0xc6efff,6);fxs.push(path);}
   const glow=new THREE.Mesh(new THREE.SphereGeometry(.36,16,10),new THREE.MeshBasicMaterial({color:0xffa747,transparent:true,opacity:.6,depthWrite:false}));fx.add(glow);
   const intakeFX=pathFX(fx,[[0,2.69,1.15],[0,2.8,.73],[0,2.6,.33],[0,2.2,.15]],0x6ccaff,18),exhaustFX=pathFX(fx,[[0,2.3,-.1],[0,2.6,-.33],[0,2.81,-.73],[0,2.69,-1.15]],0xaec5dc,18);
   const textureCanvas=document.createElement('canvas');textureCanvas.width=128;textureCanvas.height=96;const ctx=textureCanvas.getContext('2d');ctx.fillStyle='#111f32';ctx.fillRect(0,0,128,96);ctx.strokeStyle='#54759c';ctx.strokeRect(2,2,124,92);ctx.fillStyle='#dfecff';ctx.font='600 52px Segoe UI';ctx.textAlign='center';ctx.fillText(String(i+1),64,68);const tex=new THREE.CanvasTexture(textureCanvas);tex.colorSpace=THREE.SRGBColorSpace;const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));tag.scale.set(.42,.31,1);tag.position.set(x,4.08,.2);root.add(tag);
   cylinders.push({number:i+1,x,fire,p,rings,pin,rod,v,rock,fx,gas,spray,glow,intakeFX,exhaustFX,tag,local:0,pinY:0});
  });
  // Fuel rail, pump, fuel filter, and supply/return plumbing.
  cyl(G.rail,.09,span-.2,[0,3.33,.98],'gold','x');for(const x of [-span*.35,span*.35])box(G.rail,.13,.2,.22,[x,3.21,.93],'dark');
  box(G.fuelpump,.5,.51,.43,[front+.15,1.14,1.04],'dark');for(let k=0;k<3;k++)cyl(G.fuelpump,.08,.2,[front+.03+k*.13,1.48,1.05],'gold');tube(G.fuelpump,[[front+.2,1.45,1.03],[front+.07,2.0,1.2],[front+.1,3.18,1.19],[xs[0],3.33,.98]],.027,'gold');
  cyl(G.fuelfilter,.2,.7,[front-.13,2.13,1.12],'steel');cyl(G.fuelfilter,.23,.12,[front-.13,2.5,1.12],'dark');cyl(G.fuelfilter,.14,.15,[front-.13,1.72,1.12],'teal');tube(G.fuelfilter,[[front-.13,2.5,1.12],[front-.4,2.62,1.38],[front+.18,1.45,1.27]],.035,'rubber');
  cyl(G.intake,.18,span-.25,[0,2.69,1.13],'blue','x');cyl(G.exhaust,.155,span-.25,[0,2.69,-1.13],'copper','x');
  // Twin volutes and common turbo shaft.
  const tx=rear-.8;for(const [x,mat]of [[tx-.25,'blue'],[tx+.25,'copper']]){torus(G.turbo,.29,.135,[x,2.78,-1.49],mat,'x');cyl(G.turbo,.16,.23,[x,2.78,-1.49],'steel','x');}cyl(G.turbo,.058,.86,[tx,2.78,-1.49],'bright','x');tube(G.turbo,[[xs[n-1],2.69,-1.13],[tx+.35,2.6,-1.18],[tx+.25,2.78,-1.49]],.13,'copper');tube(G.turbo,[[tx+.25,2.78,-1.6],[tx+.4,3.14,-1.8],[tx+.45,3.54,-1.85]],.12,'copper');
  cyl(G.airfilter,.31,.7,[front+.63,2.76,1.68],'black','x');for(let k=0;k<9;k++)annulus(G.airfilter,.313,.28,.018,[front+.34+k*.07,2.76,1.68],'steel','x');tube(G.airfilter,[[front+.95,2.76,1.68],[.1,3.14,1.8],[tx-.54,3.15,-1.49],[tx-.25,2.78,-1.49]],.13,'rubber');
  // Radiator and intercooler are distinct, framed finned cores at the engine front.
  const radX=front-1.0;for(const [key,x,width,h,z]of [['radiator',radX,1.66,2.08,0],['intercooler',radX-.38,1.72,1.07,0]]){box(G[key],.14,h,width,[x,1.43,z],'black');for(let k=0;k<22;k++)box(G[key],.18,h-.2,.022,[x,1.43,-width/2+.08+k*(width-.16)/21],'steel');for(const y of [1.43-h/2,1.43+h/2])box(G[key],.26,.16,width+.14,[x,y,z],key==='radiator'?'dark':'blue');for(const zs of [-width/2,width/2])box(G[key],.23,h,.09,[x,1.43,zs],'dark');}
  tube(G.intercooler,[[tx-.25,2.95,-1.49],[tx-.58,3.24,-1.8],[front-.45,3.24,-1.8],[radX-.38,1.9,-.82]],.11,'blue');tube(G.intercooler,[[radX-.38,.98,.82],[front-.4,1.0,1.65],[front+.1,2.69,1.35],[xs[0],2.69,1.13]],.12,'blue');
  cyl(G.radiator,.09,.08,[radX,2.61,.3],'gold');tube(G.radiator,[[radX,2.47,.6],[front-.1,2.7,.68],[front+.1,2.9,.46]],.085,'teal');tube(G.radiator,[[radX,.4,-.65],[front-.5,.34,-.85],[front-.12,.94,-.48]],.085,'teal');
  cyl(G.waterpump,.23,.3,[front-.13,.97,-.48],'steel','x');cyl(G.waterpump,.16,.16,[front-.13,2.88,.42],'steel');tube(G.waterpump,[[front-.13,.97,-.48],[front+.25,1.18,-.55],[front+.42,1.4,-.7]],.085,'teal');
  const fan=child(G.fan,[front-.58,1.43,0]);cyl(fan,.12,.2,[0,0,0],'dark','x');for(let k=0;k<7;k++){const a=k*TAU/7,blade=box(fan,.035,.6,.16,[0,.33*Math.cos(a),.33*Math.sin(a)],'black');blade.rotation.x=a;blade.rotation.y=.2;}rotating.push({g:fan,factor:1.2});
  // Oil circuit, mesh pickup, replaceable filter, cooler and a visible main gallery.
  box(G.oilpump,.38,.27,.35,[front+.4,-.3,-.4],'dark');tube(G.oilpump,[[front+.4,-.3,-.4],[front+.4,-.73,-.4],[front+.72,-.85,0]],.05,'gold');cyl(G.oilpump,.19,.065,[front+.72,-.86,0],'dark');for(let k=0;k<5;k++)box(G.oilpump,.3,.013,.016,[front+.72,-.82,-.1+k*.05],'steel');
  cyl(G.oilfilter,.22,.61,[rear-.25,.71,1.03],'blue');cyl(G.oilfilter,.23,.07,[rear-.25,1.045,1.03],'dark');for(let k=0;k<7;k++)box(G.oilfilter,.47,.025,.42,[rear-.69,.58+k*.049,1.07],'steel');tube(G.oilfilter,[[front+.4,-.3,-.4],[front+.4,.45,.89],[rear-.25,.45,.89],[rear-.25,1.03,1.03]],.04,'gold');tube(G.oilfilter,[[rear-.25,1.03,1.03],[rear-.15,.42,1.0],[xs[0],.42,1.0]],.033,'gold');for(const x of xs)tube(G.oilfilter,[[x,.42,1.0],[x,.4,.6],[x,0,.19]],.024,'gold');
  cyl(G.starter,.21,.62,[rear-.22,-.2,.92],'dark','x');cyl(G.starter,.105,.4,[rear-.22,.05,.92],'steel','x');cyl(G.starter,.08,.23,[rear+.18,-.2,.72],'gold','x');
  const alt=child(G.alternator,[front-.12,.8,-1.17]);cyl(alt,.25,.42,[0,0,0],'steel','x');for(let k=0;k<10;k++){const a=k*TAU/10;box(alt,.24,.06,.05,[0,.25*Math.cos(a),.25*Math.sin(a)],'dark');}
  for(const [y,z,r]of [[0,0,.24],[.97,-.48,.19],[.8,-1.17,.16]]){const pulley=child(G.alternator,[front-.45,y,z]);annulus(pulley,r,.075,.09,[0,0,0],'dark','x');rotating.push({g:pulley,factor:1});}
  tube(G.alternator,[[front-.49,.23,.05],[front-.49,1.11,-.32],[front-.49,.98,-1.14],[front-.49,.64,-1.27],[front-.49,-.22,-.12],[front-.49,.23,.05]],.023,'rubber');
  // Bounds and sparse screen labels; all catalogue groups contain actual geometry.
  root.updateMatrixWorld(true);for(const [id,g]of Object.entries(G)){const bounds=new THREE.Box3().setFromObject(g);g.userData.anchor=bounds.getCenter(new THREE.Vector3());const el=document.createElement('button');el.className='part-label multi-label';el.dataset.multiPart='m_'+id;el.textContent=g.userData.name;el.hidden=true;el.onclick=()=>context?.select('m_'+id,true);$('labels').append(el);markers.push({id,el,g});}
  root.userData.fxs=fxs;rebuildDashboard();return {width:span+3.7,height:5.1};
 }
 function rebuildDashboard(){
  $('firingOrder').innerHTML='<span>做功顺序</span>'+order.map(i=>`<button data-fire="${i}" aria-label="定位到第${i}缸压燃">${i}</button>`).join('');
  $('cylinderCards').innerHTML=cylinders.map(c=>`<button class="cylinder-card" data-cylinder="${c.number}" aria-label="选择第${c.number}缸观察"><span class="cyl-top"><span>CYL ${String(c.number).padStart(2,'0')}</span><span class="cyl-watch"></span></span><strong>做功</strong><span class="cyl-angle">0°</span><div class="cyl-progress"><i></i></div></button>`).join('');
  $('cylinderCards').style.setProperty('--cylinder-count',count);
  $('timingRows').innerHTML=cylinders.map(c=>{let bars='';for(let p=0;p<4;p++){const start=mod(c.fire-360+p*180);const end=start+180;if(end<=720)bars+=`<b style="left:${start/7.2}%;width:25%;background:${phaseColors[p]}"></b>`;else bars+=`<b style="left:${start/7.2}%;width:${(720-start)/7.2}%;background:${phaseColors[p]}"></b><b style="left:0;width:${(end-720)/7.2}%;background:${phaseColors[p]}"></b>`;}return `<div class="timing-row"><span>${c.number} 缸</span><div class="timing-track">${bars}<i></i></div></div>`;}).join('');
  $('multiExplanation').textContent=`${count} 个气缸共用一根曲轴，每隔 ${720/count}° 开始一次做功；${count===6?'做功冲程彼此重叠。':'做功冲程依次接续。'}`;
  $('powerDescription').textContent=count===6?'理想化正时下，180° 做功持续角大于 120° 发火间隔，出现双缸做功重叠。':'理想化正时下，180° 做功持续角与 180° 发火间隔相等，四缸依次接续。';
  document.querySelectorAll('[data-cylinder]').forEach(b=>b.onclick=()=>context?.observe(+b.dataset.cylinder));document.querySelectorAll('[data-fire]').forEach(b=>b.onclick=()=>context?.fire(+b.dataset.fire));
 }
 function renderIndex(){const query=$('partSearch').value.trim().toLowerCase();const list=$('partsList');list.replaceChildren();let shown=0;for(const [idx,g]of nodes.entries()){if((system!=='all'&&g.userData.sys!==system)||(query&&!`${g.userData.name} ${g.userData.desc} ${systems[g.userData.sys]}`.toLowerCase().includes(query)))continue;shown++;const b=document.createElement('button');b.className='part-btn';b.dataset.part=g.userData.part;b.classList.toggle('selected',selected===g.userData.part);b.classList.toggle('detached',!!g.userData.detached);b.setAttribute('aria-pressed',String(selected===g.userData.part));b.innerHTML=`<span>${String(idx+1).padStart(2,'0')}</span>${g.userData.name}`;b.onclick=()=>context?.select(g.userData.part,true);list.append(b);}if(!shown){const p=document.createElement('div');p.className='multi-empty';p.textContent='没有匹配的部件，试试其他关键词。';list.append(p);}$('partsCount').textContent=`${shown} / ${nodes.length} 组部件 · ${count} 缸配置`;}
 function visibility(){for(const g of nodes)g.visible=(system==='all'||g.userData.sys===system)&&(!isolated||g.userData.part===selected);}
 function setSelected(id){selected=id;isolated=false;visibility();const g=nodes.find(g=>g.userData.part===id);$('selectionCard').hidden=!g;if(g){$('partName').textContent=g.userData.name;$('partDesc').textContent=g.userData.desc;$('multiSelected').innerHTML=`<strong>${g.userData.name}</strong>${systems[g.userData.sys]} · ${g.userData.detached?'已单独拆下':'点击下方按钮可拆下或独立观察'}`;}else $('multiSelected').textContent='先从模型或零件索引选择部件';$('detachPart').disabled=$('isolatePart').disabled=!g;$('detachPart').textContent=g?.userData.detached?'装回所选部件':'拆下所选部件';$('isolatePart').textContent='独立观察';renderIndex();}
 function phaseOf(number,angle){const c=cylinders[number-1];const local=mod(angle-c.fire+360);return {local,phase:Math.floor(local/180),progress:(local%180)/180,fire:c.fire};}
 function update(st,camera,size,dt){
  if(!root.visible)return;const theta=st.angle*Math.PI/180;for(const r of rotating)r.g.rotation.x=theta*r.factor;
  for(const g of nodes){const target=Math.max(st.explode,g.userData.detached);g.userData.amount+=(target-g.userData.amount)*(1-Math.exp(-Math.min(dt,.1)*8));if(Math.abs(target-g.userData.amount)<.001)g.userData.amount=target;g.position.copy(g.userData.offset).multiplyScalar(g.userData.amount);}
  const anyApart=nodes.some(g=>g.userData.detached||g.userData.amount>.025)||st.explode>.025;
  for(const c of cylinders){const {local,phase,progress}=phaseOf(c.number,st.angle),t=local*Math.PI/180,z=.48*Math.sin(t),y=.48*Math.cos(t),pinY=y+Math.sqrt(1.72**2-z*z);c.local=local;c.pinY=pinY;c.p.position.y=c.rings.position.y=c.pin.position.y=pinY+.03;c.rod.position.set(c.x,y,z);c.rod.quaternion.setFromUnitVectors(yAxis,temp.set(0,pinY-y,-z).normalize());
   for(let j=0;j<2;j++){const lift=phase===(j===0?0:3)?.13*Math.sin(progress*Math.PI):0;c.v[j].position.y=-lift;c.rock[j].rotation.x=(j===0?1:-1)*lift*1.8;}
   const height=Math.max(.03,2.59-pinY-.36);c.fx.visible=st.effects&&!anyApart&&system==='all'&&!isolated;c.gas.visible=st.cut;c.gas.position.set(0,pinY+.36+height/2,0);c.gas.scale.y=height;c.gas.material.color.set(phaseColors[phase]);c.gas.material.opacity=phase===2?.28:.12;c.glow.visible=st.cut&&local>=360&&local<445;const burn=Math.max(0,Math.sin((local-360)/85*Math.PI));c.glow.position.set(0,pinY+.36+height*.55,0);c.glow.scale.set(1,Math.max(.08,height*1.5),1);c.glow.material.opacity=.72*burn;
   c.spray.visible=st.cut&&local>=347&&local<397;c.intakeFX.update(local,phase===0);c.exhaustFX.update(local,phase===3);c.tag.visible=st.labels&&system==='all'&&!isolated&&!anyApart;c.tag.material.color.set(c.number===st.observed?'#8bbaff':'#ffffff');
  }
  for(const fx of root.userData.fxs)fx.update(st.angle,true);
  const observer=phaseOf(st.observed,st.angle),phase=observer.phase,local=observer.local,progress=observer.progress;
  const power=[];for(const c of cylinders){const p=Math.floor(c.local/180),card=$('cylinderCards').children[c.number-1];card.style.setProperty('--phase',phaseColors[p]);card.classList.toggle('active',c.number===st.observed);card.classList.toggle('power',p===2);card.setAttribute('aria-pressed',String(c.number===st.observed));card.querySelector('strong').textContent=phaseNames[p];card.querySelector('.cyl-angle').textContent=`本缸 ${Math.floor(c.local)}° / 720°`;card.querySelector('.cyl-watch').textContent=c.number===st.observed?'观察中':'';card.querySelector('i').style.width=(c.local%180)/1.8+'%';document.querySelector(`[data-fire="${c.number}"]`).classList.toggle('firing',p===2);if(p===2)power.push(c.number);}
  $('powerCount').textContent=`${power.length} 缸${st.running&&!anyApart?'正在':'处于'}做功`;$('powerCylinders').textContent=`第 ${power.join('、')} 缸 · 观察第 ${st.observed} 缸`;document.querySelectorAll('.timing-track i').forEach(el=>el.style.left=st.angle/7.2+'%');
  document.querySelectorAll('[data-stroke]').forEach(b=>{const active=+b.dataset.stroke===phase;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});document.querySelectorAll('.stroke-line i').forEach((el,i)=>el.style.width=(i<phase?100:i===phase?progress*100:0)+'%');
  $('angleReadout').value=Math.floor(st.angle)+'°';$('cycleRange').value=st.angle;$('cycleRange').style.setProperty('--fill',st.angle/7.2+'%');
  const effect=!st.effects||anyApart?'idle':local>=347&&local<360?'spray':['intake','compression','ignition','exhaust'][phase],captions={intake:'新鲜空气进入',compression:'空气压缩升温',spray:'高压柴油雾化',ignition:'压燃 · 膨胀做功',exhaust:'废气排出',idle:anyApart?'拆解观察 · 已暂停':'气流与燃烧特效已关闭'};
  $('fxBadge').dataset.effect=effect;$('fxState').textContent=`第 ${st.observed} 缸 · ${captions[effect]}`;$('fxDetail').textContent=`共用曲轴 ${Math.floor(st.angle)}° · 本缸 ${Math.floor(local)}° · ${720/count}° 做功间隔`;
  document.querySelectorAll('[data-fx-angle]').forEach(b=>{const active=effect===({90:'intake',356:'spray',382:'ignition'}[b.dataset.fxAngle]);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const boxes=[];for(const marker of markers){const g=marker.g;const show=st.labels&&g.visible&&(selected===g.userData.part||(!selected&&['block','crank','injectors','radiator','turbo'].includes(marker.id)));marker.el.hidden=!show;if(!show)continue;temp.copy(g.userData.anchor).add(g.position);root.localToWorld(temp);temp.project(camera);let sx=(temp.x*.5+.5)*size.w,sy=(-temp.y*.5+.5)*size.h;sx=Math.max(64,Math.min(size.w-64,sx));sy=Math.max(28,Math.min(size.h-28,sy));for(const b of boxes)if(Math.abs(b.x-sx)<110&&Math.abs(b.y-sy)<28)sy=b.y+29;boxes.push({x:sx,y:sy});marker.el.style.left=sx+'px';marker.el.style.top=sy+'px';marker.el.style.opacity=temp.z>1?'0':'1';}
 }
 return {
  root, get count(){return count;},get order(){return [...order];},get selected(){return selected;}, get catalog(){return catalog;},get meshes(){return meshes;},
  connect(c){context=c;},build,update,renderIndex,setSelected,phaseOf,
  setSystem(value){system=value;isolated=false;visibility();setSelected(null);},
  detach(){const g=nodes.find(g=>g.userData.part===selected);if(!g)return false;g.userData.detached=g.userData.detached?0:1;setSelected(selected);return !!g.userData.detached;},
  isolate(){if(!selected)return;isolated=!isolated;visibility();$('isolatePart').textContent=isolated?'显示同系统部件':'独立观察';},
  restore(){system='all';for(const g of nodes)g.userData.detached=0;isolated=false;visibility();setSelected(null);$('systemFilter').value='all';},
  apart(){return nodes.some(g=>g.userData.detached||g.userData.amount>.025);},
  bounds(id){const g=nodes.find(g=>g.userData.part===id);return g?new THREE.Box3().setFromObject(g):new THREE.Box3().setFromObject(root);},
  clip(enabled){for(const m of meshes)if(m.userData.shell){m.material.clippingPlanes=enabled?[clip]:[];m.material.clipShadows=true;m.material.needsUpdate=true;}},
  theme(dark){baseMats.shell.color.setHex(dark?0x43668e:0x7194ba);for(const m of meshes)if(m.userData.originalColor?.getHex()===0x43668e||m.userData.originalColor?.getHex()===0x7194ba)m.material.color.copy(baseMats.shell.color);},
  diagnostics(angle){return {cylinders:count,order:[...order],firingInterval:720/count,assemblies:nodes.length,emptyAssemblies:nodes.filter(g=>!g.children.length).map(g=>g.userData.part),meshes:meshes.length,detached:nodes.filter(g=>g.userData.detached).map(g=>g.userData.part),system,isolated,camshaftAngle:angle/2,camshaftActual:camAngle(),phases:cylinders.map(c=>{const endpoint=new THREE.Vector3(0,1.72,0).applyQuaternion(c.rod.quaternion).add(c.rod.position);return {cylinder:c.number,...this.phaseOf(c.number,angle),pinY:c.pinY,rodLength:1.72,pinError:endpoint.distanceTo(new THREE.Vector3(c.x,c.pinY,0))};})};}
 };
 function camAngle(){return rotating.find(r=>r.factor===.5)?.g.rotation.x*180/Math.PI;}
}

function createEngineEffects(THREE,engine){
 const TAU=Math.PI*2,fract=x=>x-Math.floor(x),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const fxRoot=new THREE.Group();engine.add(fxRoot);const fxObjects=[];let fxScale=1000;
 function cloud(n,blending=THREE.NormalBlending){
  const pos=new Float32Array(n*3),col=new Float32Array(n*3),alpha=new Float32Array(n),size=new Float32Array(n);
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(col,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('aSize',new THREE.BufferAttribute(size,1).setUsage(THREE.DynamicDrawUsage));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending,uniforms:{uScale:{value:fxScale}},vertexShader:`attribute float aAlpha;attribute float aSize;varying vec3 vColor;varying float vAlpha;uniform float uScale;void main(){vColor=color;vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*length(modelMatrix[0].xyz)*uScale/max(0.1,-mv.z),1.0,42.0);}`,fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float r=length(gl_PointCoord-vec2(0.5))*2.0;if(r>1.0)discard;float halo=exp(-r*r*3.2)*(1.0-smoothstep(0.6,1.0,r));gl_FragColor=vec4(vColor,vAlpha*halo);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,vertexColors:true});
  // Shader chunks are preprocessor directives and must begin on their own line.
  mat.fragmentShader=mat.fragmentShader.replace(';#include',';\n#include');
  const points=new THREE.Points(geo,mat);points.frustumCulled=false;points.renderOrder=4;fxRoot.add(points);fxObjects.push(points);
  return {n,pos,col,alpha,size,geo,mat,points,write(i,x,y,z,r,g,b,a,s){const k=i*3;pos[k]=x;pos[k+1]=y;pos[k+2]=z;col[k]=r;col[k+1]=g;col[k+2]=b;alpha[i]=a;size[i]=s;},upload(){for(const a of Object.values(geo.attributes))a.needsUpdate=true;}};
 }
 const intake=cloud(340),charge=cloud(190),fuel=cloud(660),fire=cloud(530),exhaust=cloud(220);
 const gasMat=new THREE.MeshBasicMaterial({color:0x2c95f8,transparent:true,opacity:.1,depthWrite:false,side:THREE.DoubleSide});const gas=new THREE.Mesh(new THREE.CylinderGeometry(.707,.707,1,48),gasMat);fxRoot.add(gas);gas.renderOrder=1;
 // Fine streaks make the nozzle's six spray directions visible even while paused.
 const streakPos=new Float32Array(96*6),streakGeo=new THREE.BufferGeometry();streakGeo.setAttribute('position',new THREE.BufferAttribute(streakPos,3).setUsage(THREE.DynamicDrawUsage));const streaks=new THREE.LineSegments(streakGeo,new THREE.LineBasicMaterial({color:0x91dfff,transparent:true,opacity:.62,depthWrite:false}));streaks.frustumCulled=false;fxRoot.add(streaks);streaks.renderOrder=3;
 function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,248,204,1)');g.addColorStop(.24,'rgba(255,196,63,.85)');g.addColorStop(.53,'rgba(255,96,14,.4)');g.addColorStop(1,'rgba(255,65,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
 const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:radialTexture(),transparent:true,depthWrite:false,opacity:.8}));fxRoot.add(glow);glow.renderOrder=3;
 const combustionLight=new THREE.PointLight(0xff9d32,0,2.8,1.8);fxRoot.add(combustionLight);
 const waves=[];for(let i=0;i<3;i++){const w=new THREE.Mesh(new THREE.TorusGeometry(1,.016,6,64),new THREE.MeshBasicMaterial({color:0xffac37,transparent:true,opacity:.5,depthWrite:false}));w.rotation.x=Math.PI/2;fxRoot.add(w);waves.push(w);}
 const inletPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.95,3.47,-.12),new THREE.Vector3(-2.03,3.51,-.1),new THREE.Vector3(-1.55,3.85,.04),new THREE.Vector3(-.43,3.88,.07),new THREE.Vector3(-.42,3.48,.12),new THREE.Vector3(-.05,3.2,.17)]);
 const outletPath=new THREE.CatmullRomCurve3([new THREE.Vector3(.3,3.32,.12),new THREE.Vector3(.43,3.6,.1),new THREE.Vector3(.6,3.86,.07),new THREE.Vector3(1.5,3.88,.02),new THREE.Vector3(2.03,3.52,-.08),new THREE.Vector3(2.8,3.65,-.08)]);
 const point=new THREE.Vector3();let dark=false;
 function jetAt(seed,jet,phase,gh){const t=fract(seed+phase*2.2),a=jet*TAU/6+.12,spread=.035*t*Math.sin(seed*197),rad=.035+Math.pow(t,.82)*.59;return [Math.cos(a)*rad+spread,3.558-t*Math.max(.035,Math.min(gh-.025,.72)),.1+Math.sin(a)*rad+Math.cos(seed*163)*.025*t,t];}
 function update({angle,phase,progress,crown,height,cut,explode,enabled}){
  fxRoot.visible=enabled&&explode<.025;combustionLight.intensity=0;if(!fxRoot.visible)return;
  const internal=cut;gas.visible=internal;gas.position.set(0,crown+height/2,0);gas.scale.y=height;
  gasMat.color.setHex([0x288ff5,0xf1b74b,0xff872d,0x788ba5][phase]);gasMat.opacity=phase===1?.08+progress*.12:phase===2?.12*(1-progress):.055;
  intake.points.visible=phase===0;charge.points.visible=internal&&(phase===0||phase===1);fuel.points.visible=internal&&angle>=347&&angle<408;fire.points.visible=internal&&angle>=360&&angle<465;exhaust.points.visible=phase===3;streaks.visible=fuel.points.visible;glow.visible=fire.points.visible;
  inletPath.points[5].y=crown+height*.38;outletPath.points[0].y=crown+height*.65;
  if(intake.points.visible){const envelope=Math.pow(Math.sin(progress*Math.PI),.4);for(let i=0;i<intake.n;i++){const seed=fract(i*.6180339),t=fract(seed+angle/75),a=i*2.399+angle*.04;inletPath.getPoint(t,point);const spread=t<.22?.11+(1-t/.22)*.12:.06;const inside=t>.73;if(inside&&!internal){intake.alpha[i]=0;continue;}intake.write(i,point.x+Math.sin(a)*spread*.3,point.y+Math.cos(a)*spread,point.z+Math.sin(a)*spread,.03,.35,.95,(.48+.3*Math.sin(t*Math.PI))*envelope*(dark?1:.9),.028+.032*seed);}intake.upload();}
  if(charge.points.visible){for(let i=0;i<charge.n;i++){const seed=fract(i*.754877),a=i*2.399+angle*.035,rad=.63*Math.sqrt(fract(i*.56984)),t=fract(i*.381966+angle/690);charge.write(i,Math.cos(a)*rad,crown+.025+t*Math.max(.02,height-.05),Math.sin(a)*rad,.025,.39,.98,phase===0?.25:.26+progress*.17,.027+.025*seed);}charge.upload();}
  if(fuel.points.visible){const sprayPhase=(angle-347)/61;for(let i=0;i<fuel.n;i++){const seed=fract(i*.618034),jet=i%6,[x,y,z,t]=jetAt(seed,jet,sprayPhase,height),breakup=Math.max(0,(t-.55)/.45);fuel.write(i,x+Math.sin(i*83)*.04*breakup,y+Math.cos(i*71)*.025*breakup,z,.16+.6*(1-t),.65+.3*(1-t),1,(.75-.25*t)*Math.min(1,sprayPhase*10),.017+.047*t+seed*.01);}fuel.upload();for(let i=0;i<96;i++){const seed=fract(i*.75488),a=jetAt(seed,i%6,sprayPhase,height),b=jetAt(seed-.035,i%6,sprayPhase,height);const k=i*6;if(Math.abs(a[3]-b[3])>.2){b[0]=a[0];b[1]=a[1];b[2]=a[2];}streakPos.set(a.slice(0,3),k);streakPos.set(b.slice(0,3),k+3);}streakGeo.attributes.position.needsUpdate=true;streaks.material.opacity=.45*Math.min(1,sprayPhase*8);}
  if(fire.points.visible){const burn=(angle-360)/105,attack=clamp((angle-360)/9),envelope=attack*Math.pow(1-burn,.65),front=Math.min(.68,.12+Math.sqrt(burn)*.9);for(let i=0;i<fire.n;i++){const seed=fract(i*.618034),a=i*2.399+angle*.024,rad=front*Math.sqrt(fract(i*.754877)),t=fract(i*.381966+angle/110),swirl=.025*Math.sin(i*19+angle*.15),bright=fract(i*.413);const yy=crown+.02+t*Math.max(.015,height-.045);fire.write(i,Math.cos(a)*rad+swirl,yy,Math.sin(a)*rad,.98,bright>.65?.8:.22+.36*bright,bright>.83?.36:.015,.9*envelope*(.6+.4*Math.sin(t*Math.PI)),.07+.085*seed);}fire.upload();glow.position.set(0,crown+height*.55,.13);glow.scale.set(1.35,Math.max(.16,height*.95),1);glow.material.opacity=.57*envelope;combustionLight.position.set(0,crown+height*.75,.28);combustionLight.intensity=6*envelope;
   for(let i=0;i<waves.length;i++){const w=waves[i],t=fract(burn*2.6+i/3),radius=.06+t*.6;w.visible=burn<.7;w.scale.set(radius,radius,1);w.position.set(0,crown+height*(.45+i*.13),0);w.material.opacity=.45*(1-t)*envelope;}
  }else for(const w of waves)w.visible=false;
  if(exhaust.points.visible){const envelope=Math.pow(Math.sin(progress*Math.PI),.45);for(let i=0;i<exhaust.n;i++){const seed=fract(i*.618034),t=fract(seed+angle/85),inside=t<.25;if(inside&&!internal){exhaust.alpha[i]=0;continue;}outletPath.getPoint(t,point);const spread=.035+Math.max(0,t-.65)*.55,a=i*2.399+angle*.04;exhaust.write(i,point.x,point.y+Math.sin(a)*spread,point.z+Math.cos(a)*spread,dark?.5:.21,dark?.59:.29,dark?.73:.4,.46*envelope*(1-t*.45),.04+.08*t);}exhaust.upload();}
 }
 return {update,resize(height,pixelRatio){fxScale=height*pixelRatio/(2*Math.tan(36*Math.PI/360));for(const obj of fxObjects)obj.material.uniforms.uScale.value=fxScale;},setTheme(theme){dark=theme==='dark';streaks.material.color.setHex(dark?0xb9efff:0x48b5e9);},getVisible(){return {enabled:fxRoot.visible,intake:fxRoot.visible&&intake.points.visible,spray:fxRoot.visible&&fuel.points.visible,ignition:fxRoot.visible&&fire.points.visible,exhaust:fxRoot.visible&&exhaust.points.visible};}};
}

function createExhaustSmoke(THREE,parent,renderer,outlet){
 const count=110,positions=new Float32Array(count*3),alpha=new Float32Array(count),sizes=new Float32Array(count),ages=new Float32Array(count).fill(99),life=new Float32Array(count),seeds=new Float32Array(count);let index=0,carry=0;
 for(let i=0;i<count;i++){seeds[i]=(i*.6180339887)%1;life[i]=2.6+seeds[i]*1.1;}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('aAlpha',new THREE.BufferAttribute(alpha,1).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1).setUsage(THREE.DynamicDrawUsage));
 const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1100}},vertexShader:'attribute float aAlpha;attribute float aSize;varying float vAlpha;uniform float uScale;void main(){vAlpha=aAlpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*length(modelMatrix[0].xyz)*uScale/max(.1,-mv.z),1.,120.);}',fragmentShader:'varying float vAlpha;void main(){float r=length(gl_PointCoord-vec2(.5))*2.;if(r>1.)discard;float a=exp(-r*r*3.4)*(1.-smoothstep(.6,1.,r));gl_FragColor=vec4(.62,.66,.7,vAlpha*a);\n#include <colorspace_fragment>\n}'});
 const cloud=new THREE.Points(geo,mat);cloud.frustumCulled=false;cloud.renderOrder=6;parent.add(cloud);
 return {update(dt,phase,enabled){cloud.visible=enabled;carry+=enabled&&phase===3?dt*46:0;while(carry>=1){ages[index]=0;index=(index+1)%count;carry-=1;}
  for(let i=0;i<count;i++){ages[i]+=dt;const a=ages[i],k=i*3;if(a>life[i]){alpha[i]=0;continue;}const s=seeds[i],spread=.02+a*.085;positions[k]=outlet[0]-.18*a+Math.sin(i*2.4+a*1.7)*spread;positions[k+1]=outlet[1]+a*.64+a*a*.07;positions[k+2]=outlet[2]+a*.07+Math.cos(i*3.7+a)*spread;alpha[i]=.34*Math.pow(1-a/life[i],1.3);sizes[i]=.11+a*.3+s*.05;}
  mat.uniforms.uScale.value=(renderer?.domElement.height||700)/(2*Math.tan(Math.PI/10));for(const attribute of Object.values(geo.attributes))attribute.needsUpdate=true;
 }};
}

// Detailed compact excavator. All geometry and textures are generated locally.
function createExcavator(THREE,scene,renderer){
 const root=new THREE.Group();scene.add(root);root.visible=false;let workTime=0,trackTravel=0;const spinningWheels=[];
 const PI=Math.PI,TAU=PI*2,up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();let seed=941;
 const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 function grain(kind){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),im=x.createImageData(256,256);for(let i=0;i<256*256;i++){const v=kind==='rubber'?70+rand()*45:170+rand()*60;im.data[i*4]=im.data[i*4+1]=im.data[i*4+2]=v;im.data[i*4+3]=255;}x.putImageData(im,0,0);if(kind==='steel'){x.strokeStyle='#fff3';x.lineWidth=.4;for(let i=0;i<140;i++){const y=rand()*256;x.beginPath();x.moveTo(0,y);x.lineTo(256,y+.5);x.stroke();}}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;}
 const fine=grain('paint'),rubberGrain=grain('rubber'),brushed=grain('steel');let env=null;
 if(renderer){const studio=new THREE.Scene();studio.background=new THREE.Color(0x627080);for(const [p,s,c] of [[[0,7,0],[11,.1,7],0xffffff],[[5,3,2],[.1,6,4],0xd9eaff],[[-5,2,-2],[.1,4,7],0xffe4bb],[[0,2,-7],[8,3,.1],0xc7d8ed]]){const m=new THREE.Mesh(new THREE.BoxGeometry(...s),new THREE.MeshBasicMaterial({color:c}));m.position.set(...p);studio.add(m);}const pmrem=new THREE.PMREMGenerator(renderer);env=pmrem.fromScene(studio,.06,.1,50).texture;pmrem.dispose();studio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}
 const paint=new THREE.MeshPhysicalMaterial({color:0xe5ad27,metalness:.27,roughness:.43,clearcoat:.35,clearcoatRoughness:.32,bumpMap:fine,bumpScale:.007,envMap:env,envMapIntensity:.65});
 const darkPaint=paint.clone();darkPaint.color.setHex(0xb9821d);
 const black=new THREE.MeshStandardMaterial({color:0x252b33,metalness:.48,roughness:.43,envMap:env,envMapIntensity:.5}),steel=new THREE.MeshStandardMaterial({color:0xaab4c0,metalness:.83,roughness:.25,roughnessMap:brushed,envMap:env,envMapIntensity:.95}),chrome=new THREE.MeshStandardMaterial({color:0xdde5ec,metalness:.97,roughness:.13,envMap:env,envMapIntensity:1.2});
 const rubber=new THREE.MeshStandardMaterial({color:0x202122,roughness:.94,bumpMap:rubberGrain,bumpScale:.023}),tire=new THREE.MeshStandardMaterial({color:0x313335,roughness:.84,bumpMap:rubberGrain,bumpScale:.009}),interior=new THREE.MeshStandardMaterial({color:0x42484b,roughness:.9,bumpMap:fine,bumpScale:.012}),seal=new THREE.MeshStandardMaterial({color:0x10181d,roughness:.9});
 const glass=new THREE.MeshPhysicalMaterial({color:0x8facbd,metalness:.12,roughness:.09,transparent:true,opacity:.28,clearcoat:1,clearcoatRoughness:.08,envMap:env,envMapIntensity:.8,depthWrite:false,side:THREE.DoubleSide});
 const coverMat=paint.clone();coverMat.transparent=true;const covers=[],outlines=[],doorDetails=[];
 function add(g,geo,mat,p=[0,0,0],r=[0,0,0]){const m=new THREE.Mesh(geo,mat);m.position.set(...p);m.rotation.set(...r);m.castShadow=!mat.transparent;m.receiveShadow=true;g.add(m);return m;}
 const box=(g,w,h,d,p,mat=paint)=>add(g,new THREE.BoxGeometry(w,h,d),mat,p);
 const cyl=(g,r,h,p,mat=steel,axis='y',rt=r,n=32)=>add(g,new THREE.CylinderGeometry(rt,r,h,n),mat,p,axis==='z'?[PI/2,0,0]:axis==='x'?[0,0,PI/2]:[0,0,0]);
 function roundShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
 function rounded(g,w,h,d,r,p,mat=paint){r=Math.max(.001,Math.min(r,w*.28,h*.28,d*.28));return add(g,new THREE.ExtrudeGeometry(roundShape(w-2*r,h-2*r,r),{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:3,curveSegments:8}),mat,[p[0],p[1],p[2]-d/2+r]);}
 function path(pts){const s=new THREE.Shape();s.moveTo(...pts[0]);for(const p of pts.slice(1))s.lineTo(...p);s.closePath();return s;}
 function plate(g,pts,d,z,mat,holes=[],b=.012){const s=path(pts);for(const h of holes){const p=new THREE.Path();p.moveTo(...h[0]);for(const v of h.slice(1))p.lineTo(...v);p.closePath();s.holes.push(p);}return add(g,new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:2,curveSegments:12}),mat,[0,0,z-d/2]);}
 function tube(g,pts,r,mat=black){return add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),Math.max(16,pts.length*8),r,8,false),mat);}
 function beam(g,a,b,r,mat=black){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),d=vb.clone().sub(va),m=cyl(g,r,d.length(),va.add(vb).multiplyScalar(.5).toArray(),mat);m.quaternion.setFromUnitVectors(up,d.normalize());return m;}
 // Repeated fasteners and track pads are instanced to keep the browser responsive.
 const boltGeo=new THREE.CylinderGeometry(.034,.034,.025,6),washerGeo=new THREE.CylinderGeometry(.054,.054,.014,20),batches=new Map();
 function inst(g,geo,mat,p,r=[0,0,0],color=null){let entries=batches.get(g);if(!entries){entries=[];batches.set(g,entries);}let e=entries.find(e=>e.geo===geo&&e.mat===mat);if(!e){e={geo,mat,items:[]};entries.push(e);}dummy.position.set(...p);dummy.rotation.set(...r);dummy.scale.set(1,1,1);dummy.updateMatrix();e.items.push({matrix:dummy.matrix.clone(),color});}
 function bolt(g,p,axis='z',dark=false){const r=axis==='z'?[PI/2,0,0]:axis==='x'?[0,0,PI/2]:[0,0,0];inst(g,washerGeo,dark?black:steel,p,r);inst(g,boltGeo,dark?black:steel,p,r);}
 function decal(g,text,w,h,p,r=[0,0,0],bg='#20272c',fg='#eee9d8',sub=''){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,1024,256);x.fillStyle=fg;x.font=`700 ${sub?100:140}px Arial`;x.fillText(text,45,sub?130:174);if(sub){x.font='38px Arial';x.fillText(sub,48,206);}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return add(g,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,polygonOffset:true,polygonOffsetFactor:-1}),p,r);}
 function warning(g,p,r=[0,0,0],w=.18){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#eec445';x.fillRect(0,0,128,128);x.fillStyle='#15191a';x.beginPath();x.moveTo(64,15);x.lineTo(113,109);x.lineTo(15,109);x.closePath();x.fill();x.fillStyle='#eec445';x.font='bold 64px sans-serif';x.fillText('!',54,96);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;add(g,new THREE.PlaneGeometry(w,w),new THREE.MeshBasicMaterial({map:t,polygonOffset:true,polygonOffsetFactor:-2}),p,r);}
 const A=1.63,TR=.59,CY=-1,perim=4*A+TAU*TR;
 function stadium(r){const s=new THREE.Shape();s.moveTo(-A,CY+r);s.lineTo(A,CY+r);s.absarc(A,CY,r,PI/2,-PI/2,true);s.lineTo(-A,CY-r);s.absarc(-A,CY,r,-PI/2,-3*PI/2,true);s.closePath();return s;}
 const belt=stadium(.59);belt.holes.push(new THREE.Path(stadium(.443).getPoints(64).reverse()));const beltGeo=new THREE.ExtrudeGeometry(belt,{depth:.7,bevelEnabled:false,curveSegments:32});
 function trackPoint(t){let s=t*perim;if(s<2*A)return [-A+s,CY+TR,0];s-=2*A;if(s<PI*TR){const a=s/TR;return [A+TR*Math.sin(a),CY+TR*Math.cos(a),-a];}s-=PI*TR;if(s<2*A)return [A-s,CY-TR,PI];s-=2*A;const a=s/TR;return [-A-TR*Math.sin(a),CY-TR*Math.cos(a),PI-a];}
 const shoeGeo=new THREE.BoxGeometry(.17,.075,.79),lugGeo=new THREE.BoxGeometry(.064,.047,.35),guideGeo=new THREE.BoxGeometry(.1,.105,.055),toothGeo=new THREE.BoxGeometry(.10,.095,.37);
 for(const z of [-1.32,1.32]){
  add(root,beltGeo,rubber,[0,0,z-.35]);rounded(root,3.32,.35,.52,.08,[0,-.88,z],black);
  for(let i=0;i<56;i++){const [x,y,a]=trackPoint(i/56),m=new THREE.Matrix4().makeRotationZ(a);m.setPosition(x,y,z);inst(root,shoeGeo,rubber,[x,y,z],[0,0,a],new THREE.Color().setRGB(.66+rand()*.12,.65+rand()*.12,.62+rand()*.12));for(const sg of [-1,1]){const p=new THREE.Vector3(.025,.057,sg*.19).applyMatrix4(m),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),a).multiply(new THREE.Quaternion().setFromAxisAngle(up,sg*.38)),e=new THREE.Euler().setFromQuaternion(q);inst(root,lugGeo,tire,p.toArray(),[e.x,e.y,e.z]);p.set(0,-.07,sg*.24).applyMatrix4(m);inst(root,guideGeo,black,p.toArray(),[0,0,a]);}}
  for(const x of [-1.04,-.52,0,.52,1.04]){const wheel=new THREE.Group();wheel.position.set(x,-1.17,z);root.add(wheel);spinningWheels.push({node:wheel,radius:.257});cyl(wheel,.257,.54,[0,0,0],tire,'z');cyl(wheel,.178,.57,[0,0,0],black,'z');for(const sg of [-1,1]){cyl(wheel,.09,.022,[0,0,sg*.3],steel,'z');for(let i=0;i<6;i++)bolt(wheel,[Math.cos(i*TAU/6)*.124,Math.sin(i*TAU/6)*.124,sg*.3],'z',true);}}
  for(const x of [-.8,.8]){const wheel=new THREE.Group();wheel.position.set(x,-.70,z);root.add(wheel);spinningWheels.push({node:wheel,radius:.14});cyl(wheel,.14,.46,[0,0,0],tire,'z');cyl(wheel,.06,.49,[0,0,0],steel,'z');}
  for(const [x,drive] of [[-A,true],[A,false]]){const wheel=new THREE.Group();wheel.position.set(x,CY,z);root.add(wheel);spinningWheels.push({node:wheel,radius:TR});cyl(wheel,.43,.51,[0,0,0],drive?black:tire,'z');cyl(wheel,.31,.55,[0,0,0],drive?darkPaint:black,'z');cyl(wheel,.145,.61,[0,0,0],steel,'z');for(const sg of [-1,1]){for(let i=0;i<10;i++){const a=i*TAU/10;bolt(wheel,[Math.cos(a)*.225,Math.sin(a)*.225,sg*.29],'z',true);}cyl(wheel,.105,.025,[0,0,sg*.325],black,'z');rounded(wheel,.036,.17,.012,.003,[0,.08,sg*.344],paint);}if(drive)for(let i=0;i<18;i++){const a=i*TAU/18;inst(wheel,toothGeo,steel,[Math.sin(a)*.439,Math.cos(a)*.439,0],[0,0,-a]);}else for(let i=0;i<7;i++){const a=i*TAU/7,m=box(wheel,.063,.23,.57,[Math.sin(a)*.22,Math.cos(a)*.22,0],black);m.rotation.z=-a;}}

  beam(root,[.5,-.82,z],[1.52,-.93,z],.105,steel);cyl(root,.12,.3,[1.2,-.9,z],black,'x');
 }
 // X-frame, bolted slew bearing and rounded upper deck.
 for(const z of [-1,1]){rounded(root,3.4,.27,.6,.09,[0,-.58,z],black);beam(root,[-.8,-.43,0],[-1.18,-.6,z],.17);beam(root,[.8,-.43,0],[1.18,-.6,z],.17);}
 rounded(root,2.3,.33,2.15,.12,[0,-.38,0],black);cyl(root,1.05,.21,[0,-.16,0],black);cyl(root,1.075,.055,[0,-.045,0],steel);cyl(root,.98,.095,[0,.025,0],black);for(let i=0;i<28;i++){const a=i*TAU/28;bolt(root,[Math.cos(a)*.99,-.005,Math.sin(a)*.99],'y',true);}
 rounded(root,4.65,.27,3.16,.11,[-.16,.19,0],darkPaint);rounded(root,4.45,.12,3.06,.05,[-.16,.37,0]);
 // Curved dozer blade and replaceable cutting edge.
 plate(root,[[2.08,-.7],[2.2,-.65],[2.27,-.85],[2.37,-1.18],[2.62,-1.48],[2.57,-1.57],[2.42,-1.49],[2.19,-1.17],[2.11,-.88]],3.18,0,darkPaint,[],.025);box(root,.19,.11,3.27,[2.56,-1.5,0],steel);for(const z of [-1.35,-.9,-.45,0,.45,.9,1.35])bolt(root,[2.64,-1.49,z],'x',true);
 for(const z of [-.92,.92]){beam(root,[.72,-.57,z],[2.21,-1.06,z],.12);cyl(root,.12,.28,[.72,-.57,z],paint,'z');cyl(root,.11,.3,[2.2,-1.06,z],steel,'z');}beam(root,[.9,-.52,0],[1.62,-.83,0],.095,paint);beam(root,[1.62,-.83,0],[2.22,-1.04,0],.047,chrome);
 // Existing engine and pump retain their physical coupling center.
 for(const x of [-1.87,-1.13])for(const z of [-.18,.18]){rounded(root,.22,.11,.20,.025,[x,.54,z],rubber);bolt(root,[x,.61,z],'y');}
 cyl(root,.075,.30,[-1.5,.95,.57],chrome,'z');cyl(root,.205,.43,[-1.5,.95,.91],black,'z');cyl(root,.173,.055,[-1.5,.95,1.155],steel,'z');cyl(root,.105,.04,[-1.5,.95,1.205],black,'z');rounded(root,.33,.19,.33,.035,[-1.5,1.19,.9],steel);for(let i=0;i<6;i++){const a=i*TAU/6;bolt(root,[-1.5+Math.cos(a)*.155,.95+Math.sin(a)*.155,1.19]);}
 cyl(root,.11,.35,[-1.94,.95,.9],new THREE.MeshStandardMaterial({color:0xc9d7e3,metalness:.3,roughness:.43}));cyl(root,.13,.055,[-1.94,1.15,.9],black);decal(root,'OIL',.15,.05,[-1.94,.97,1.015]);rounded(root,.55,.22,.48,.035,[.23,.54,-.79],black);for(let i=0;i<5;i++)cyl(root,.045,.08,[.04+i*.095,.69,-.79],steel);
 tube(root,[[-1.5,1.27,.86],[-1.13,1.30,.99],[-.8,1.0,1],[-.46,.54,.2],[.2,.65,-.7]],.042);tube(root,[[-1.6,1.2,1.03],[-1.84,.98,1.04],[-1.57,.76,.96],[-.5,.46,-.6],[.3,.59,-.94]],.035);
 // Service components remain visible when the inspection doors become transparent.
 rounded(root,.2,1.02,1.42,.04,[-2.15,1.13,-.13],black);for(let i=0;i<18;i++)box(root,.012,.86,.031,[-2.025,1.13,-.77+i*.075],steel);rounded(root,.53,.34,.43,.04,[-.67,.71,-.58],seal);cyl(root,.025,.05,[-.81,.91,-.48],paint);tube(root,[[-.82,.94,-.49],[-.91,1.04,-.5],[-1.22,.65,-.6]],.017,rubber);
 rounded(root,.6,.61,.6,.055,[.18,.78,-1.02]);cyl(root,.095,.065,[.18,1.12,-1.02],black);cyl(root,.045,.07,[.18,1.17,-1.02],steel);
 // Sculpted counterweight and hollow bonnet, with separate framed service openings.
 rounded(root,.46,.66,2.98,.12,[-2.48,.76,0],darkPaint);rounded(root,2.30,.14,2.85,.04,[-1.43,.47,0],darkPaint);for(const z of [-1.42,1.42])rounded(root,1.82,.27,.20,.04,[-1.43,.59,z],darkPaint);rounded(root,.17,.17,2.45,.04,[-2.65,.64,0],rubber);
 const sideOuter=[[-2.55,.60],[-2.5,1.77],[-2.34,2.12],[-.57,2.12],[-.4,1.94],[-.4,.60]],sideHole=[[-2.30,.68],[-.62,.68],[-.62,1.94],[-2.26,1.94]];
 for(const sg of [-1,1]){plate(root,sideOuter,.075,sg*1.32,paint,[sideHole]);const door=rounded(root,1.71,1.25,.045,.025,[-1.46,1.33,sg*1.355],coverMat);covers.push(door);const outline=new THREE.LineSegments(new THREE.EdgesGeometry(door.geometry,30),new THREE.LineBasicMaterial({color:0x7eafdb,transparent:true,opacity:.3}));outline.position.copy(door.position);root.add(outline);outlines.push(outline);
  for(const x of [-2.22,-.69])for(const y of [1.1,1.67]){const h=rounded(root,.11,.16,.045,.013,[x,y,sg*1.398],black);doorDetails.push(h);bolt(root,[x,y,sg*1.43],'z',true);}doorDetails.push(rounded(root,.18,.045,.055,.01,[-.83,1.46,sg*1.415],black));for(let i=0;i<10;i++)doorDetails.push(rounded(root,.62,.034,.018,.008,[-1.69,1.15+i*.058,sg*1.397],black));warning(root,[-.7,1.86,sg*1.408],sg<0?[0,PI,0]:[0,0,0],.15);
 }
 covers.push(rounded(root,2.1,.16,2.58,.055,[-1.46,2.105,0],coverMat));rounded(root,.17,1.1,2.42,.045,[-2.52,1.4,0],darkPaint);rounded(root,.025,.63,1.66,.006,[-2.615,1.49,0],black);for(let i=0;i<12;i++)box(root,.035,.025,1.56,[-2.635,1.2+i*.05,0],darkPaint);
 for(const sg of [-1,1]){rounded(root,.04,.14,.25,.012,[-2.67,.98,sg*1.02],new THREE.MeshStandardMaterial({color:0x8e1720,emissive:0x550409,emissiveIntensity:.5,roughness:.2}));rounded(root,.028,.065,.24,.008,[-2.68,.81,sg*1.02],new THREE.MeshStandardMaterial({color:0xe79829,emissive:0x341600,roughness:.25}));}
 decal(root,'DX 35',1.12,.28,[-2.645,1.08,0],[0,-PI/2,0],'#292b2b','#eee7d1','COMPACT HYDRAULIC');
 rounded(root,1.37,.91,1.2,.12,[.41,.91,-.87]);rounded(root,.9,.6,.026,.006,[.48,.96,-1.483],black);for(let i=0;i<9;i++)box(root,.81,.028,.03,[.48,.73+i*.056,-1.51],darkPaint);warning(root,[.98,1.25,-1.512],[0,PI,0],.15);cyl(root,.15,.045,[.5,1.39,-.83],black);for(let i=0;i<6;i++){const a=i*TAU/6;bolt(root,[.5+Math.sin(a)*.105,1.419,-.83+Math.cos(a)*.105],'y',true);}
 // Shaped ROPS cabin: leaning windshield, rubber seals, hinged split glazing.
 const cabZ=.78,cabHalf=.67;rounded(root,1.62,.26,1.5,.09,[.34,.53,cabZ],black);rounded(root,1.68,.16,1.53,.06,[.32,3.2,cabZ],black);
 const cabOuter=[[-.54,.62],[1.16,.62],[1.22,1.15],[1.08,2.72],[.88,3.13],[-.35,3.13],[-.55,2.92]],window=[[-.37,1.17],[1.055,1.17],[.95,2.69],[.76,2.96],[-.35,2.96]],lowerWin=[[.68,.75],[1.01,.75],[1.06,1.08],[.68,1.08]];
 for(const sg of [-1,1]){const z=cabZ+sg*cabHalf;plate(root,cabOuter,.065,z,black,[window,lowerWin],.022);plate(root,window,.008,z+sg*.012,glass,[],0);plate(root,lowerWin,.008,z+sg*.012,glass,[],0);const border=window.map(p=>[p[0],p[1],z+sg*.028]);border.push(border[0]);tube(root,border,.018,seal);beam(root,[.55,1.17,z],[.55,2.99,z],.028);rounded(root,.18,.05,.06,.011,[.75,1.32,z+sg*.06],black);for(const y of [1.12,2.47]){rounded(root,.065,.17,.06,.014,[-.48,y,z+sg*.02],steel);bolt(root,[-.48,y,z+sg*.06]);}}
 function quad(g,p,mat){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([...p[0],...p[1],...p[2],...p[0],...p[2],...p[3]],3));geo.computeVertexNormals();return add(g,geo,mat);}
 const front=[[1.18,.75,.13],[1.18,.75,1.43],[.94,3.04,1.43],[.94,3.04,.13]];quad(root,front,glass);for(let i=0;i<4;i++)beam(root,front[i],front[(i+1)%4],.043);beam(root,[1.15,1.14,.13],[1.15,1.14,1.43],.036);
 cyl(root,.05,.05,[1.205,1.22,.78],black,'x');beam(root,[1.22,1.25,.78],[1.11,2.05,.96],.013,seal);beam(root,[1.11,2.05,.96],[1.04,2.6,.89],.017,seal);
 // Rear frame surrounds a real opening instead of hiding the rear glazing.
 for(const z of [.10,1.45])beam(root,[-.57,1.0,z],[-.57,3.08,z],.05);beam(root,[-.57,3.08,.10],[-.57,3.08,1.45],.05);rounded(root,.075,.58,1.37,.018,[-.55,1.12,.78],black);
 quad(root,[[-.578,1.55,.22],[-.578,1.55,1.34],[-.578,2.91,1.34],[-.578,2.91,.22]],glass);
 rounded(root,1.64,.085,1.53,.025,[.30,3.31,cabZ]);for(const z of [.03,1.53])beam(root,[-.47,3.28,z],[1.03,3.28,z],.018);
 const lamp=new THREE.MeshPhysicalMaterial({color:0xe9f0ec,emissive:0x8c9e9e,emissiveIntensity:.35,roughness:.12,clearcoat:1});for(const z of [.25,1.26]){rounded(root,.20,.14,.21,.025,[1.02,3.18,z],black);rounded(root,.015,.09,.15,.003,[1.13,3.18,z],lamp);}
 cyl(root,.105,.035,[-.28,3.39,.42],black);cyl(root,.08,.12,[-.28,3.47,.42],new THREE.MeshPhysicalMaterial({color:0xf6a21c,emissive:0xbd5d08,emissiveIntensity:.45,roughness:.2,clearcoat:1}));cyl(root,.081,.025,[-.28,3.54,.42],darkPaint);
 for(const sg of [-1,1]){const z=cabZ+sg*.83;tube(root,[[.81,2.75,cabZ+sg*.68],[1.03,2.65,z],[1.12,2.47,z+sg*.1]],.021);rounded(root,.11,.27,.15,.025,[1.15,2.43,z+sg*.1],black);rounded(root,.014,.21,.115,.006,[1.211,2.43,z+sg*.1],steel);}
 tube(root,[[-.40,.75,1.53],[-.40,1.28,1.62],[-.3,1.54,1.62]],.028);for(const y of [.26,-.12]){rounded(root,.77,.065,.39,.018,[.12,y,1.72],black);for(let i=0;i<9;i++)box(root,.025,.012,.32,[-.18+i*.075,y+.037,1.72],steel);}
 // Suspension seat, head restraint, belt, joysticks, pedals and an instrument screen.
 rounded(root,.48,.25,.48,.04,[.1,.89,cabZ],black);for(let i=0;i<4;i++)rounded(root,.51,.028,.5,.007,[.1,.82+i*.055,cabZ],rubber);rounded(root,.61,.17,.61,.065,[.14,1.1,cabZ],interior);const back=rounded(root,.16,.88,.62,.055,[-.12,1.58,cabZ],interior);back.rotation.z=-.12;rounded(root,.17,.24,.43,.05,[-.18,2.1,cabZ],interior);box(root,.025,.043,.63,[.25,1.21,cabZ],black);
 for(const z of [cabZ-.38,cabZ+.38]){rounded(root,.42,.1,.14,.03,[.13,1.48,z],black);beam(root,[.33,1.3,z],[.42,1.61,z],.022,steel);const joy=cyl(root,.041,.15,[.43,1.66,z],rubber);joy.rotation.z=-.14;cyl(root,.013,.008,[.43,1.74,z],new THREE.MeshBasicMaterial({color:0xbf302a}));}
 rounded(root,.32,.72,.4,.055,[.78,1.03,.39],black);decal(root,'HYDRAULIC',.24,.11,[.73,1.45,.60],[0,0,0],'#102732','#71c5da','SYSTEM / 720');for(const z of [.56,.89]){const p=box(root,.21,.035,.16,[.73,.76,z],rubber);p.rotation.z=-.22;}for(const x of [.5,.72])beam(root,[x,.77,.35],[x-.04,1.09,.35],.015,steel);
 // Exhaust pipe follows the cylinder-head outlet into the muffler and tall stack.
 tube(root,[[-1.01,1.79,-.08],[-1.08,1.78,-.35],[-1.68,1.65,-.70],[-2.05,1.72,-.89]],.049,black);
 cyl(root,.14,.51,[-2.05,1.82,-.89],black);cyl(root,.16,.045,[-2.05,1.55,-.89],steel);cyl(root,.155,.045,[-2.05,2.09,-.89],steel);
 tube(root,[[-2.05,2.08,-.89],[-2.05,2.56,-.89],[-2.05,3.33,-.89],[-2.10,3.46,-.89],[-2.28,3.50,-.89]],.068,black);
 for(const y of [2.18,2.68]){cyl(root,.09,.045,[-2.05,y,-.89],steel);beam(root,[-2.05,y,-.89],[-2.38,2.08,-.89],.018,black);}
 const shieldCanvas=document.createElement('canvas');shieldCanvas.width=128;shieldCanvas.height=256;const shieldCtx=shieldCanvas.getContext('2d');shieldCtx.fillStyle='#fff';shieldCtx.fillRect(0,0,128,256);shieldCtx.fillStyle='#000';for(let j=0;j<12;j++)for(let i=0;i<6;i++){shieldCtx.beginPath();shieldCtx.arc(12+i*21+(j%2)*7,10+j*21,4.3,0,TAU);shieldCtx.fill();}const shieldMap=new THREE.CanvasTexture(shieldCanvas);const shieldMat=steel.clone();shieldMat.alphaMap=shieldMap;shieldMat.alphaTest=.5;shieldMat.side=THREE.DoubleSide;add(root,new THREE.CylinderGeometry(.116,.116,.47,36,1,true),shieldMat,[-2.05,2.43,-.89]);
 const rim=add(root,new THREE.TorusGeometry(.068,.008,8,32),steel,[-2.28,3.50,-.89]);rim.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(-1,.2,0).normalize());
 const chimneySmoke=createExhaustSmoke(THREE,root,renderer,[-2.30,3.51,-.89]);
 decal(root,'DIESEL LAB',.79,.14,[-1.47,.70,1.517],[0,0,0],'#343a39','#ece4cd');decal(root,'DX 35',.57,.15,[.39,.75,1.478],[0,0,0],'#22272c','#e8c25e');
 // Welded banana boom and tapered stick, with reinforced cheek plates and grease caps.
 const boom=new THREE.Group();boom.position.set(1.12,.79,-.51);root.add(boom);const BL=3.4,SL=2.56;
 const boomProfile=[[-.18,-.16],[.68,-.27],[1.65,-.18],[3.35,-.15],[3.55,-.01],[3.39,.19],[2.15,.55],[1.17,.69],[.12,.28],[-.18,.17]];
 plate(boom,boomProfile,.48,0,paint,[],.035);for(const sg of [-1,1]){plate(boom,[[-.1,-.14],[.62,-.2],[1.59,-.13],[3.36,-.10],[3.45,.01],[3.32,.11],[2.08,.44],[1.16,.56],[.12,.21]],.025,sg*.264,darkPaint,[],.008);tube(boom,[[.15,.26,sg*.25],[1.16,.66,sg*.25],[2.15,.52,sg*.25],[3.33,.18,sg*.25]],.009,steel);}
 const stick=new THREE.Group();stick.position.x=BL;boom.add(stick);plate(stick,[[-.2,-.19],[.9,-.23],[2.46,-.15],[2.68,-.03],[2.56,.18],[1.25,.34],[.02,.22]],.39,0,paint,[],.028);for(const sg of [-1,1])plate(stick,[[.03,-.12],[.94,-.17],[2.44,-.11],[2.56,-.02],[2.45,.1],[1.28,.25],[.05,.16]],.022,sg*.216,darkPaint,[],.006);
 function pin(g,x,y,r=.14,w=.68){cyl(g,r,w,[x,y,0],black,'z');for(const sg of [-1,1]){cyl(g,r*.73,.045,[x,y,sg*(w/2+.025)],steel,'z');cyl(g,r*.3,.05,[x,y,sg*(w/2+.055)],darkPaint,'z');bolt(g,[x,y,sg*(w/2+.083)]);}}
 pin(boom,0,0,.19,.82);pin(boom,BL,0,.17,.74);pin(stick,SL,0,.14,.73);for(const z of [-.23,.23])rounded(root,.62,.28,.18,.055,[1.13,.67,-.51+z],darkPaint);
 decal(boom,'HYDRAULIC',1.12,.15,[1.25,.12,.298]);warning(boom,[2.52,.15,.297]);warning(stick,[1.1,.02,.25]);
 for(const sg of [-1,1]){const z=sg*.14;tube(boom,[[.13,.41,z],[.8,.75,z],[1.4,.77,z],[2.3,.55,z],[3.24,.31,z]],.024,steel);for(const x of [.85,1.55,2.3]){const y=x<1.5?.76:.77-(x-1.5)*.3;box(boom,.09,.065,.43,[x,y,0],black);bolt(boom,[x,y+.045,z],'y');}tube(stick,[[.15,.35,z],[.65,.4,z],[1.4,.37,z],[2.07,.28,z]],.022,steel);}
 // A dynamically flexing hose at the elbow follows the stick angle.
 const hoseGeo=new THREE.BufferGeometry(),rings=24,sides=7,hosePos=new Float32Array((rings+1)*(sides+1)*3),indices=[];for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1);}hoseGeo.setAttribute('position',new THREE.BufferAttribute(hosePos,3).setUsage(THREE.DynamicDrawUsage));hoseGeo.setIndex(indices);const hose=add(boom,hoseGeo,rubber);hose.frustumCulled=false;
 function flexHose(angle){const end=new THREE.Vector3(.3*Math.cos(angle)-.33*Math.sin(angle)+BL,.3*Math.sin(angle)+.33*Math.cos(angle),.12),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(3.02,.35,.13),new THREE.Vector3(3.35,.65,.13),new THREE.Vector3(3.7,.66,.13),end]);for(let i=0;i<=rings;i++){const t=i/rings,p=curve.getPoint(t),v=curve.getTangent(t),n=new THREE.Vector3(-v.y,v.x,0).normalize();for(let j=0;j<=sides;j++){const a=j/sides*TAU,k=(i*(sides+1)+j)*3;hosePos[k]=p.x+n.x*Math.cos(a)*.035;hosePos[k+1]=p.y+n.y*Math.cos(a)*.035;hosePos[k+2]=p.z+Math.sin(a)*.035;}}hoseGeo.attributes.position.needsUpdate=true;hoseGeo.computeVertexNormals();}
 // Open scoop, curved inner shell, side wear plates, cutting lip and five replaceable teeth.
 const bucket=new THREE.Group();bucket.position.x=SL;stick.add(bucket);const scoop=new THREE.Group();scoop.scale.x=-1;bucket.add(scoop);
 const outer=[[-.22,.02],[-.44,-.16],[-.51,-.50],[-.42,-.82],[-.20,-1.02],[.15,-1.13],[.62,-1.03],[.93,-.78]],inner=[[.85,-.72],[.57,-.94],[.14,-1.03],[-.15,-.92],[-.32,-.74],[-.4,-.5],[-.34,-.2],[-.17,-.08]];
 plate(scoop,[...outer,...inner],.98,0,black,[],.012);const cheek=[[-.24,.02],[.24,-.10],[.95,-.77],[.63,-1.04],[.14,-1.14],[-.22,-1.04],[-.45,-.84],[-.53,-.51],[-.45,-.16]];
 for(const sg of [-1,1]){plate(scoop,cheek,.06,sg*.52,black,[],.018);plate(scoop,[[-.36,-.44],[-.26,-.81],[-.06,-.96],[.51,-.92],[.78,-.76],[.3,-.86],[-.12,-.78]],.016,sg*.56,steel,[],.003);beam(scoop,[-.29,-.25,sg*.56],[.31,-.92,sg*.56],.024,steel);}
 for(const z of [-.43,-.215,0,.215,.43]){const tg=new THREE.Group();tg.position.set(.82,-.78,z);tg.rotation.z=-.28;scoop.add(tg);plate(tg,[[-.12,.03],[.10,.02],[.3,-.1],[.28,-.15],[-.1,-.1]],.135,0,steel,[],.009);bolt(tg,[0,-.02,.075]);}
 beam(scoop,[.72,-.82,-.57],[.72,-.82,.57],.07,steel);for(const z of [-.28,0,.28])tube(scoop,[[-.3,-.15,z],[-.47,-.52,z],[-.18,-.99,z]],.028,black);
 // Solved four-bar linkage maintains constant-length bucket connecting rods.
 for(const z of [-.21,.21])plate(bucket,[[-.2,-.12],[-.15,.16],[.1,.43],[.27,.35],[.27,.1],[.13,-.12]],.09,z,darkPaint,[],.014);pin(bucket,.1,.34,.11,.67);
 const pivot=new THREE.Vector2(SL-.42,.28),rockerLength=.44,linkLength=.68,lugRadius=Math.hypot(.1,.34),lugAngle=Math.atan2(.34,.1);pin(stick,pivot.x,pivot.y,.10,.71);
 const rockers=[],ties=[];for(const sg of [-1,1]){rockers.push(rounded(stick,1,.11,.075,.025,[0,0,sg*.34],darkPaint));ties.push(rounded(stick,1,.085,.07,.02,[0,0,sg*.37],steel));}const rockPin=cyl(stick,.10,.84,[0,0,0],black,'z');
 function fitBar(m,a,b){m.position.x=(a.x+b.x)/2;m.position.y=(a.y+b.y)/2;m.rotation.z=Math.atan2(b.y-a.y,b.x-a.x);m.scale.x=a.distanceTo(b);}
 function hydraulic(r){const g=new THREE.Group();root.add(g);return {body:cyl(g,r,1,[0,0,0],paint),rod:cyl(g,r*.48,1,[0,0,0],chrome),cap:cyl(g,r*1.12,.07,[0,0,0],black),base:cyl(g,r*1.05,.065,[0,0,0],darkPaint),ends:[cyl(g,r*.92,.27,[0,0,0],black,'z'),cyl(g,r*.82,.25,[0,0,0],black,'z')],ports:[cyl(g,.043,.07,[0,0,0],steel),cyl(g,.043,.07,[0,0,0],steel)],radius:r};}
 const cylinders=[hydraulic(.128),hydraulic(.116),hydraulic(.092)];
 function locate(node,x,y,z){return root.worldToLocal(node.localToWorld(new THREE.Vector3(x,y,z)));}
 function fitCylinder(c,a,b){const v=b.clone().sub(a),length=v.length(),u=v.clone().normalize(),q=new THREE.Quaternion().setFromUnitVectors(up,u);if(c.barrelLength===undefined)c.barrelLength=length*.55;const barrel=c.barrelLength;for(const m of [c.body,c.rod,c.cap,c.base])m.quaternion.copy(q);c.body.position.copy(a).addScaledVector(u,barrel*.5);c.body.scale.y=barrel;c.base.position.copy(a).addScaledVector(u,.07);c.cap.position.copy(a).addScaledVector(u,barrel);c.rod.position.copy(a).addScaledVector(u,barrel+(length-barrel)*.5);c.rod.scale.y=Math.max(.01,length-barrel);c.ends[0].position.copy(a);c.ends[1].position.copy(b);for(let i=0;i<2;i++){c.ports[i].position.copy(a).addScaledVector(u,barrel*(i?.88:.15));c.ports[i].position.z+=c.radius;c.ports[i].rotation.x=PI/2;}}
 for(const z of [-.12,.12])tube(root,[[.22,.72,-.8],[.55,.74,-.74],[.83,.9,-.6],[1.04,1.17,-.42+z]],.035,rubber);
 decal(root,'POWER UNIT',.67,.15,[-1.46,.69,1.515],[0,0,0],'#313638','#c5d8de');for(const x of [-2.28,-.57])for(const z of [-1.2,1.2])bolt(root,[x,2.20,z],'y',true);
 for(const [parent,entries] of batches)for(const e of entries){const im=new THREE.InstancedMesh(e.geo,e.mat,e.items.length);e.mesh=im;for(let i=0;i<e.items.length;i++){im.setMatrixAt(i,e.items[i].matrix);if(e.items[i].color)im.setColorAt(i,e.items[i].color);}im.instanceMatrix.needsUpdate=true;im.castShadow=im.receiveShadow=true;parent.add(im);}
 const trackBatch={};for(const e of batches.get(root)){if(e.geo===shoeGeo)trackBatch.shoe=e.mesh;if(e.geo===lugGeo)trackBatch.lug=e.mesh;if(e.geo===guideGeo)trackBatch.guide=e.mesh;}
 for(const m of Object.values(trackBatch)){m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.frustumCulled=false;}
 const zAxis=new THREE.Vector3(0,0,1),lugRotations=[new THREE.Quaternion().setFromAxisAngle(up,-.38),new THREE.Quaternion().setFromAxisAngle(up,.38)];
 function updateTracks(distance){let base=0;for(const z of [-1.32,1.32]){for(let i=0;i<56;i++){const t=((i/56+distance/perim)%1+1)%1,[x,y,a]=trackPoint(t),co=Math.cos(a),si=Math.sin(a);dummy.position.set(x,y,z);dummy.quaternion.setFromAxisAngle(zAxis,a);dummy.scale.set(1,1,1);dummy.updateMatrix();trackBatch.shoe.setMatrixAt(base+i,dummy.matrix);for(let j=0;j<2;j++){const sg=j===0?-1:1,k=(base+i)*2+j;dummy.position.set(x+co*.025-si*.057,y+si*.025+co*.057,z+sg*.19);dummy.quaternion.setFromAxisAngle(zAxis,a).multiply(lugRotations[j]);dummy.updateMatrix();trackBatch.lug.setMatrixAt(k,dummy.matrix);dummy.position.set(x+si*.07,y-co*.07,z+sg*.24);dummy.quaternion.setFromAxisAngle(zAxis,a);dummy.updateMatrix();trackBatch.guide.setMatrixAt(k,dummy.matrix);}}base+=56;}
  for(const m of Object.values(trackBatch))m.instanceMatrix.needsUpdate=true;for(const w of spinningWheels)w.node.rotation.z=-distance/w.radius;
 }
 // Merge fixed meshes by material; retain separate articulated and transparent objects.
 const dynamicMeshes=new Set([...covers,...doorDetails,...rockers,...ties,rockPin,hose]);for(const c of cylinders)for(const v of Object.values(c)){if(v?.isMesh)dynamicMeshes.add(v);else if(Array.isArray(v))for(const m of v)if(m?.isMesh)dynamicMeshes.add(m);}
 const groups=[];root.traverse(o=>{if(o.isGroup)groups.push(o);});
 for(const group of groups.reverse()){
  const bins=new Map();for(const m of group.children){if(!m.isMesh||m.isInstancedMesh||dynamicMeshes.has(m)||Array.isArray(m.material)||m.material.transparent)continue;const names=Object.keys(m.geometry.attributes).sort();if(!names.includes('position')||!names.includes('normal'))continue;const key=m.material.uuid+'|'+names.join(',')+'|'+m.castShadow+'|'+m.receiveShadow;let bin=bins.get(key);if(!bin){bin=[];bins.set(key,bin);}bin.push(m);}
  for(const meshes of bins.values()){if(meshes.length<2)continue;const names=Object.keys(meshes[0].geometry.attributes),geometries=meshes.map(m=>{m.updateMatrix();return m.geometry.clone().applyMatrix4(m.matrix);}),joined=new THREE.BufferGeometry();let vertices=0;for(const g of geometries)vertices+=g.attributes.position.count;
   for(const name of names){const size=geometries[0].attributes[name].itemSize,values=new Float32Array(vertices*size);let offset=0;for(const g of geometries){values.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}joined.setAttribute(name,new THREE.BufferAttribute(values,size));}
   const indices=[];let base=0;for(const g of geometries){if(g.index)for(const v of g.index.array)indices.push(v+base);else for(let i=0;i<g.attributes.position.count;i++)indices.push(base+i);base+=g.attributes.position.count;g.dispose();}joined.setIndex(indices);joined.computeBoundingSphere();const merged=new THREE.Mesh(joined,meshes[0].material);merged.castShadow=meshes[0].castShadow;merged.receiveShadow=meshes[0].receiveShadow;for(const m of meshes)group.remove(m);group.add(merged);
  }
 }
 let lastXray=null;
 return {update(dt,{amount,running,speed,xray,tracks=true,direction=1,engineAngle=0,smoke=true}){root.visible=amount>.005;if(!root.visible)return;root.scale.setScalar(Math.max(.001,amount));const simdt=running&&amount>.9?dt*speed:0;workTime+=simdt;if(tracks&&simdt>0){trackTravel+=simdt*1.1*direction;updateTracks(trackTravel);}chimneySmoke.update(simdt,Math.floor(engineAngle/180),smoke&&amount>.9);const t=workTime;boom.rotation.z=.84+.12*Math.sin(t*.58);stick.rotation.z=-1.9+.18*Math.sin(t*.58+.75);
  const psi=1.02+.33*Math.sin(t*.58+1.65),B=new THREE.Vector2(pivot.x+rockerLength*Math.cos(psi),pivot.y+rockerLength*Math.sin(psi)),C=new THREE.Vector2(SL,0),v=B.clone().sub(C),d=v.length(),a=(lugRadius*lugRadius-linkLength*linkLength+d*d)/(2*d),h=Math.sqrt(Math.max(0,lugRadius*lugRadius-a*a)),u=v.multiplyScalar(1/d),D=C.clone().addScaledVector(u,a).add(new THREE.Vector2(-u.y,u.x).multiplyScalar(h));
  let bucketLugAngle=Math.atan2(D.y,D.x-SL);if(bucketLugAngle<0)bucketLugAngle+=TAU;bucket.rotation.z=bucketLugAngle-lugAngle;for(const r of rockers)fitBar(r,pivot,B);for(const l of ties)fitBar(l,B,D);rockPin.position.set(B.x,B.y,0);flexHose(stick.rotation.z);root.updateMatrixWorld(true);
  fitCylinder(cylinders[0],new THREE.Vector3(1.22,.56,-.15),locate(boom,1.62,-.14,.37));fitCylinder(cylinders[1],locate(boom,1.79,.53,.35),locate(stick,.68,.26,.35));fitCylinder(cylinders[2],locate(stick,.72,.33,.36),locate(stick,B.x,B.y,.36));
  if(lastXray!==xray){lastXray=xray;coverMat.opacity=xray?.11:1;coverMat.depthWrite=!xray;for(const c of covers)c.castShadow=!xray;for(const e of outlines)e.visible=xray;for(const m of doorDetails)m.visible=!xray;}
 },getState(){return {visible:root.visible,workTime,trackTravel};}};
}

// Local Web Audio synthesis. No media files, network requests or autoplay bypass.
function createEngineAudio(){
 let ctx=null,enabled=false,master,analyser,noiseBuffer,noiseSource,hum,humGain,intakeGain,exhaustGain,exhaustToneGain,rattleGain,lastPhase=-1,lastAngle=null,lastInjector=-1;
 const data=new Uint8Array(256),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 function ensure(){if(ctx)return;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('Web Audio unavailable');ctx=new Audio();master=ctx.createGain();master.gain.value=0;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-17;limiter.knee.value=16;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.14;analyser=ctx.createAnalyser();analyser.fftSize=256;master.connect(limiter);limiter.connect(analyser);analyser.connect(ctx.destination);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const channel=noiseBuffer.getChannelData(0);let seed=5191;for(let i=0;i<channel.length;i++){seed=(seed*1664525+1013904223)>>>0;channel[i]=(seed/4294967296)*2-1;}noiseSource=ctx.createBufferSource();noiseSource.buffer=noiseBuffer;noiseSource.loop=true;
  function noiseVoice(type,hz,q){const filter=ctx.createBiquadFilter();filter.type=type;filter.frequency.value=hz;filter.Q.value=q;const gain=ctx.createGain();gain.gain.value=0;noiseSource.connect(filter);filter.connect(gain);gain.connect(master);return gain;}
  intakeGain=noiseVoice('bandpass',1850,.75);exhaustGain=noiseVoice('lowpass',720,.7);
  function oscillator(type,hz){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=hz;g.gain.value=0;o.connect(g);g.connect(master);o.start();return [o,g];}
  [hum,humGain]=oscillator('triangle',45);const [exhaustTone,g]=oscillator('sine',67);exhaustToneGain=g;const [rattle,rg]=oscillator('triangle',117);rattleGain=rg;noiseSource.start();
 }
 function envelope(param,value,time,constant=.035){param.setTargetAtTime(value,time,constant);}
 function burst(hz,amplitude,duration,type='lowpass'){const t=ctx.currentTime,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=noiseBuffer;filter.type=type;filter.frequency.value=hz;filter.Q.value=.75;g.gain.setValueAtTime(amplitude,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);src.connect(filter);filter.connect(g);g.connect(master);src.start(t,(t*.37)%1);src.stop(t+duration+.015);src.onended=()=>{src.disconnect();filter.disconnect();g.disconnect();};}
 function ignition(){const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(151,t);o.frequency.exponentialRampToValueAtTime(43,t+.19);g.gain.setValueAtTime(.93,t);g.gain.exponentialRampToValueAtTime(.0001,t+.29);o.connect(g);g.connect(master);o.start(t);o.stop(t+.31);o.onended=()=>{o.disconnect();g.disconnect();};burst(1700,.6,.14);}
 function crossed(previous,current,threshold){if(previous===null)return false;return current>=previous?previous<threshold&&current>=threshold:previous<threshold||current>=threshold;}
 return {
  async setEnabled(value){enabled=value;if(!value){if(ctx)envelope(master.gain,0,ctx.currentTime,.02);return true;}try{ensure();await ctx.resume();lastPhase=-1;lastAngle=null;return ctx.state==='running';}catch{enabled=false;return false;}},
  update({angle,running,speed,volume,proximity=1}){if(!ctx)return;const t=ctx.currentTime,phase=Math.floor(angle/180),p=(angle%180)/180,audible=enabled&&running&&!document.hidden&&ctx.state==='running';envelope(master.gain,audible?clamp(volume)*.22*clamp(proximity,.12,1):0,t,.045);
   if(!audible){lastAngle=angle;lastPhase=-1;lastInjector=-1;return;}
   const stroke=Math.max(0,Math.sin(p*Math.PI));envelope(intakeGain.gain,phase===0?.44*Math.pow(stroke,.6):0,t,.025);envelope(exhaustGain.gain,phase===3?.57*Math.pow(stroke,.5):0,t,.035);envelope(exhaustToneGain.gain,phase===3?.21*stroke:0,t,.03);envelope(humGain.gain,.065+(phase===1?.07*p:.02),t);envelope(rattleGain.gain,phase===1?.07*stroke:.018,t);envelope(hum.frequency,34+speed*23+(phase===1?21*p:0),t,.07);
   if((crossed(lastAngle,angle,360)||(lastPhase!==2&&phase===2&&angle<425))&&phase===2)ignition();
   if(crossed(lastAngle,angle,540)&&phase===3)burst(560,.62,.22);
   if(angle>=347&&angle<397){const injection=Math.floor((angle-347)/6);if(injection!==lastInjector){burst(4350,.16,.022,'bandpass');lastInjector=injection;}}else lastInjector=-1;
   lastAngle=angle;lastPhase=phase;
  },
  silence(){if(ctx)envelope(master.gain,0,ctx.currentTime,.015);},
  meter(){if(!ctx||!enabled||ctx.state!=='running')return {state:ctx?.state||'off',level:0};analyser.getByteTimeDomainData(data);let sum=0;for(const v of data)sum+=((v-128)/128)**2;return {state:ctx.state,level:clamp(Math.sqrt(sum/data.length)*32)};}
 };
}

(()=>{
'use strict';
const $=id=>document.getElementById(id), TAU=Math.PI*2;
const state={mode:1,observed:1,angle:25,running:!matchMedia('(prefers-reduced-motion: reduce)').matches,speed:.5,explode:0,targetExplode:0,resumeAfterExplode:false,cut:true,cutPos:0,cutAngle:0,labels:true,effects:true,theme:"dark",selected:null,vehicle:false,installation:0,targetInstallation:0,tracks:true,driveDir:1,audioEnabled:false,audioVolume:.3,audioUserMuted:false};
const engineSound=createEngineAudio();
const icons={play:'<span class="button-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13L19 12z"/></svg></span>',pause:'<span class="button-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg></span>',expand:'<span class="button-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/></svg></span>',reset:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/></svg>'};
$('explodeBtn').querySelector('.explode-icon').innerHTML=icons.expand;$('resetView').innerHTML=icons.reset;
const partInfo=[
 ['head','缸盖总成','封闭气缸顶部，容纳进排气道、气门与喷油器。',[0,2.25,0],[-.9,4.05,0]],
 ['cylinder','气缸体','引导活塞往复运动。外侧散热片为教学化外观，剖切可观察缸孔。',[-2.5,.3,0],[-.9,2.8,0]],
 ['piston','活塞组件','承受燃气压力，经活塞销把力传递给连杆。环槽处为活塞环。',[1.9,1.55,0],[.7,2.8,0]],
 ['rod','连杆','连接活塞销与曲柄销，把活塞往复运动转换为曲轴转动。',[2.4,-.1,.3],[.3,1.3,.15]],
 ['crank','曲轴','曲柄销与主轴颈偏心布置，与连杆组成曲柄连杆机构。',[0,-.35,2.3],[.6,.1,.6]],
 ['flywheel','飞轮','储存并释放转动能量，帮助发动机跨越非做功冲程。',[0,0,3.4],[1.05,.3,1.5]],
 ['case','曲轴箱','支承曲轴，包容曲柄连杆机构。底部油底壳用于储存润滑油。',[-2.6,-.8,-.3],[-1.2,-.2,0]],
 ['valves','气门组件','进气门在进气冲程开启，排气门在排气冲程开启。采用理想化正时。',[0,3.75,.25],[.5,4.55,0]],
 ['injector','喷油器','在压缩末期将柴油雾化喷入高温空气中，利用压缩热自燃。',[0,4.65,0],[.1,4.5,.15]],
 ['manifolds','进排气管','左侧蓝色管路为进气，右侧铜色管路为排气。',[0,1.15,-2.1],[-1.75,3.8,0]]
];
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){$('loading').className='error';$('loading').textContent='三维视图暂不可用。请在启用硬件加速的 Chrome 或 Edge 中打开此 HTML。';document.querySelectorAll('.controls button,.controls input').forEach(x=>x.disabled=true);return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xf5f8fd,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.localClippingEnabled=true;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('viewport').prepend(renderer.domElement);$('loading').remove();
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xf5f8fd,22,50);
const camera=new THREE.PerspectiveCamera(36,1,.1,100);const engine=new THREE.Group();scene.add(engine);
const hemi=new THREE.HemisphereLight(0xedf5ff,0x60718a,2.4);scene.add(hemi);
const key=new THREE.DirectionalLight(0xfff6df,4.4);key.position.set(-5,10,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-8;key.shadow.camera.right=8;key.shadow.camera.top=10;key.shadow.camera.bottom=-7;key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);
const fill=new THREE.DirectionalLight(0xd6e8ff,2.7);fill.position.set(5,5,-4);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,2.8);rim.position.set(-3,2,-5);scene.add(rim);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({color:0x536e91,opacity:.16}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.63;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(20,40,0xb9cee8,0xdbe6f5);grid.position.y=-1.625;grid.material.transparent=true;grid.material.opacity=.33;scene.add(grid);
const baseRing=new THREE.Mesh(new THREE.RingGeometry(3.1,3.115,100),new THREE.MeshBasicMaterial({color:0xb5c9e4,transparent:true,opacity:.6,side:THREE.DoubleSide}));baseRing.rotation.x=-Math.PI/2;baseRing.position.y=-1.62;scene.add(baseRing);
const clip=new THREE.Plane(new THREE.Vector3(0,0,-1),0);
const materials={
 shell:new THREE.MeshStandardMaterial({color:0x7194ba,metalness:.48,roughness:.46,side:THREE.DoubleSide}),
 dark:new THREE.MeshStandardMaterial({color:0x2e4665,metalness:.55,roughness:.35}),
 silver:new THREE.MeshStandardMaterial({color:0xc3d1e1,metalness:.65,roughness:.3}),
 bright:new THREE.MeshStandardMaterial({color:0xe2eaf5,metalness:.65,roughness:.24}),
 black:new THREE.MeshStandardMaterial({color:0x223247,metalness:.45,roughness:.38}),
 brass:new THREE.MeshStandardMaterial({color:0xbe9960,metalness:.56,roughness:.32}),
 intake:new THREE.MeshStandardMaterial({color:0x388bd8,metalness:.32,roughness:.4}),
 exhaust:new THREE.MeshStandardMaterial({color:0x95765d,metalness:.52,roughness:.4}),
 gasket:new THREE.MeshStandardMaterial({color:0x354255,metalness:.1,roughness:.7})
};
const parts={},selectables=[],labels=[];
for(const [id,name,desc,offset,anchor] of partInfo){const g=new THREE.Group();g.userData={part:id,offset:new THREE.Vector3(...offset),anchor:new THREE.Vector3(...anchor)};parts[id]=g;engine.add(g);
const b=document.createElement('button');b.className='part-btn';b.dataset.part=id;b.innerHTML=`<span>${String(partInfo.findIndex(p=>p[0]===id)+1).padStart(2,'0')}</span>${name}`;b.onclick=()=>selectPart(id,true);$('partsList').append(b);
const lab=document.createElement('button');lab.className='part-label';lab.textContent=name;lab.onclick=()=>selectPart(id,true);$('labels').append(lab);labels.push({id,el:lab,anchor:g.userData.anchor});}
function mesh(g,geo,mat,pos=[0,0,0],rot=[0,0,0],shell=false){const m=new THREE.Mesh(geo,(typeof mat==='string'?materials[mat]:mat).clone());m.position.set(...pos);m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;m.userData.part=g.userData.part;m.userData.shell=shell;m.userData.materialKey=typeof mat==='string'?mat:null;m.userData.baseEmissive=m.material.emissive?.clone();if(shell){m.material.clippingPlanes=state.cut?[clip]:[];m.material.clipShadows=true;}g.add(m);selectables.push(m);return m;}
const cyl=(g,r,h,pos,mat='silver',rot=[0,0,0],shell=false,r2=r)=>mesh(g,new THREE.CylinderGeometry(r2,r,h,48),mat,pos,rot,shell);
const box=(g,w,h,d,pos,mat='shell',shell=false)=>mesh(g,new THREE.BoxGeometry(w,h,d),mat,pos,[0,0,0],shell);
function ring(g,ro,ri,h,y,mat='shell',shell=true){const s=new THREE.Shape();s.absarc(0,0,ro,0,TAU,false);const hole=new THREE.Path();hole.absarc(0,0,ri,0,TAU,true);s.holes.push(hole);const geo=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:56});return mesh(g,geo,mat,[0,y+h/2,0],[Math.PI/2,0,0],shell);}
function tube(g,points,r,mat,shell=false){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(path,32,r,16,false),mat,[0,0,0],[0,0,0],shell);}
function bolt(g,x,y,z,axis='y',shell=false){const rot=axis==='z'?[Math.PI/2,0,0]:[0,0,0];mesh(g,new THREE.CylinderGeometry(.085,.085,.065,6),'bright',[x,y,z],rot,shell);}
function rodBetween(g,a,b,r,mat='silver'){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);const m=cyl(g,r,delta.length(),va.clone().add(vb).multiplyScalar(.5).toArray(),mat);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
// Hollow crankcase and detachable oil pan. The front half is removed by the section plane.
const cs=new THREE.Shape();cs.moveTo(-1.25,-1.1);cs.lineTo(1.25,-1.1);cs.lineTo(1.25,.85);cs.quadraticCurveTo(1.25,1.15,.95,1.15);cs.lineTo(-.95,1.15);cs.quadraticCurveTo(-1.25,1.15,-1.25,.85);cs.closePath();const ch=new THREE.Path();ch.absarc(0,0,1.025,0,TAU,true);cs.holes.push(ch);
mesh(parts.case,new THREE.ExtrudeGeometry(cs,{depth:1.65,bevelEnabled:true,bevelSize:.045,bevelThickness:.04,bevelSegments:2,curveSegments:48}),'shell',[0,0,-.825],[0,0,0],true);
box(parts.case,2.65,.18,1.85,[0,-1.13,0],'dark',true);box(parts.case,2.1,.29,1.45,[0,-1.34,0],'shell',true);
for(const x of [-1,1])for(const z of [-.7,.7])bolt(parts.case,x,-1.01,z,'y',true);
for(const x of [-1.55,1.55]){box(parts.case,.65,.19,2.12,[x,-1.49,0],'dark');for(const z of [-.75,.75])bolt(parts.case,x,-1.37,z);}
ring(parts.cylinder,1.05,.755,.18,1.32);ring(parts.cylinder,.95,.755,2.13,2.42,'silver');
for(let i=0;i<11;i++)ring(parts.cylinder,1.07,.76,.064,1.52+i*.174,'shell');
ring(parts.cylinder,1.12,.755,.16,3.49);ring(parts.cylinder,1.1,.755,.055,3.595,'gasket');
for(const x of [-.81,.81])for(const z of [-.65,.65]){cyl(parts.cylinder,.035,2.05,[x,2.46,z],'dark',[0,0,0],true);bolt(parts.cylinder,x,3.64,z,'y',true);}
// Head carries stylized port and valve seats. Dark ring marks the combustion boundary.
box(parts.head,2.13,.53,1.8,[0,3.92,0],'shell',true);box(parts.head,2.24,.085,1.89,[0,3.625,0],'bright',true);
for(let i=0;i<4;i++)box(parts.head,2.25,.045,1.94,[0,3.76+i*.11,0],'shell',true);
for(const x of [-.85,.85])for(const z of [-.65,.65])bolt(parts.head,x,4.225,z,'y',true);
// Piston, crown bowl, three compression/oil control rings and wrist pin.
const piston=parts.piston;cyl(piston,.731,.65,[0,0,0],'silver');
const bowlShape=new THREE.Shape();bowlShape.absarc(0,0,.725,0,TAU,false);const bowlHole=new THREE.Path();bowlHole.absarc(0,0,.29,0,TAU,true);bowlShape.holes.push(bowlHole);mesh(piston,new THREE.ExtrudeGeometry(bowlShape,{depth:.08,bevelEnabled:false,curveSegments:48}),'bright',[0,.405,0],[Math.PI/2,0,0]);cyl(piston,.288,.04,[0,.326,0],'dark');
for(const y of [.2,.11,.015]){const t=mesh(piston,new THREE.TorusGeometry(.733,.017,8,64),'black',[0,y,0],[Math.PI/2,0,0]);t.receiveShadow=false;}
cyl(piston,.115,1.52,[0,-.095,0],'brass',[Math.PI/2,0,0]);
// Rod's local y axis joins crankpin (0) to wristpin (L).
const L=2.25,R=.64;
const rod=parts.rod;const rodMotion=new THREE.Group();rod.add(rodMotion);rodMotion.userData.part='rod';
function eye(g,y,outer,inner,depth){const s=new THREE.Shape();s.absarc(0,0,outer,0,TAU,false);const h=new THREE.Path();h.absarc(0,0,inner,0,TAU,true);s.holes.push(h);mesh(g,new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:1,curveSegments:32}),'silver',[0,y,-depth/2]);}
eye(rodMotion,0,.27,.135,.23);eye(rodMotion,L,.19,.11,.19);box(rodMotion,.17,L-.32,.15,[0,L/2,0],'silver');box(rodMotion,.27,L-.48,.055,[0,L/2,.105],'bright');for(const x of [-.22,.22])bolt(rodMotion,x,-.08,.15,'z');
const crank=parts.crank,crankMotion=new THREE.Group();crankMotion.userData.part='crank';crank.add(crankMotion);
cyl(crankMotion,.145,3.12,[0,0,0],'bright',[Math.PI/2,0,0]);cyl(crankMotion,.155,.7,[0,R,0],'brass',[Math.PI/2,0,0]);
for(const z of [-.43,.43]){cyl(crankMotion,.49,.19,[0,-.17,z],'dark',[Math.PI/2,0,0]);box(crankMotion,.38,.82,.22,[0,.25,z],'silver');cyl(crankMotion,.26,.24,[0,R,z],'silver',[Math.PI/2,0,0]);cyl(crankMotion,.26,.28,[0,0,z*1.55],'brass',[Math.PI/2,0,0]);}
const fly=parts.flywheel,flyMotion=new THREE.Group();flyMotion.userData.part='flywheel';fly.add(flyMotion);
const flyGeo=new THREE.Shape();flyGeo.absarc(0,0,1.14,0,TAU,false);const flyHole=new THREE.Path();flyHole.absarc(0,0,.86,0,TAU,true);flyGeo.holes.push(flyHole);mesh(flyMotion,new THREE.ExtrudeGeometry(flyGeo,{depth:.25,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,curveSegments:64}),'dark',[0,0,1.38]);
cyl(flyMotion,.3,.34,[0,0,1.51],'silver',[Math.PI/2,0,0]);
for(let i=0;i<6;i++){const a=i*TAU/6,x=Math.sin(a)*.57,y=Math.cos(a)*.57;const spoke=box(flyMotion,.13,.75,.15,[x,y,1.51],'shell');spoke.rotation.z=-a;bolt(flyMotion,Math.sin(a)*.2,Math.cos(a)*.2,1.7,'z');}
for(let i=0;i<64;i++){const a=i*TAU/64;const tooth=box(flyMotion,.065,.09,.18,[Math.sin(a)*1.167,Math.cos(a)*1.167,1.5],'silver');tooth.rotation.z=-a;}
// Two overhead valves with springs; opening displacement synchronized to 720-degree cycle.
const valveMotions=[];for(const [j,x] of [-.43,.43].entries()){const vg=new THREE.Group();vg.userData.part='valves';parts.valves.add(vg);vg.position.x=x;
cyl(vg,.265,.055,[0,3.56,0],j?'exhaust':'intake');cyl(vg,.047,.95,[0,4.02,0],'bright');cyl(vg,.17,.07,[0,4.48,0],'dark');
const pts=[];for(let k=0;k<=160;k++){const a=k/160*TAU*7;pts.push(new THREE.Vector3(.12*Math.cos(a),4.04+k/160*.38,.12*Math.sin(a)));}mesh(vg,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),160,.018,6,false),'bright');valveMotions.push(vg);}
box(parts.valves,1.45,.13,.16,[0,4.68,-.24],'dark');for(const x of [-.43,.43]){const rocker=box(parts.valves,.44,.085,.18,[x,4.65,-.04],'silver');rocker.rotation.z=x<0?-.14:.14;}
// Center-mounted injector and fuel line.
cyl(parts.injector,.105,.95,[0,4.2,.12],'dark');cyl(parts.injector,.19,.33,[0,4.57,.12],'brass');cyl(parts.injector,.16,.18,[0,4.81,.12],'black');cyl(parts.injector,.043,.16,[0,3.655,.12],'bright',[0,0,0],false,.019);
tube(parts.injector,[[0,4.68,.12],[.16,4.82,.1],[.8,4.86,-.14],[1.18,4.48,-.24]],.033,'brass');
for(const [sgn,mat] of [[-1,'intake'],[1,'exhaust']]){tube(parts.manifolds,[[sgn*.55,3.86,-.17],[sgn*1.08,3.86,-.17],[sgn*1.55,3.83,-.23],[sgn*1.88,3.55,-.3],[sgn*2.03,3.5,-.33]],.16,mat);
const fl=cyl(parts.manifolds,.265,.09,[sgn*1.13,3.86,-.17],'dark',[0,0,Math.PI/2]);for(const z of [-.35,.01])bolt(parts.manifolds,sgn*1.19,3.98,z);}
const effects=createEngineEffects(THREE,engine);
const excavator=createExcavator(THREE,scene,renderer);
const multi=createMultiEngine(THREE,scene,clip);
const singlePartButtons=[...$('partsList').children];
let frameDelta=.016;
// Orbit camera with mouse, pointer gestures and pinch zoom; no network or auxiliary files required.
const orbit={yaw:.62,pitch:.19,distance:13.9,target:new THREE.Vector3(0,1.53,0),pan:new THREE.Vector3(),preset:null};let viewTarget=null,focusGoal=null,focusActive=false;let lastSize={w:0,h:0};
function setView(v){const views={iso:[.62,.19],front:[0,0],side:[Math.PI/2,.03],top:[0,1.48]};const [yaw,pitch]=views[v];viewTarget={yaw,pitch};orbit.preset=v;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
function updateCamera(dt){if(focusGoal){const ease=1-Math.exp(-dt*3.7);orbit.target.lerp(focusGoal.target,ease);orbit.distance+=(focusGoal.distance-orbit.distance)*ease;if(orbit.target.distanceTo(focusGoal.target)<.002&&Math.abs(orbit.distance-focusGoal.distance)<.002)focusGoal=null;}if(viewTarget){let diff=(viewTarget.yaw-orbit.yaw+Math.PI*3)%TAU-Math.PI;orbit.yaw+=diff*Math.min(dt*8,1);orbit.pitch+=(viewTarget.pitch-orbit.pitch)*Math.min(dt*8,1);if(Math.abs(diff)+Math.abs(viewTarget.pitch-orbit.pitch)<.001)viewTarget=null;}
const e=focusActive?0:state.explode;const dist=orbit.distance*(1+e*.75)*(lastSize.w<500?1.11:1),target=orbit.target.clone().add(orbit.pan);target.y+=e*2.2;
camera.position.set(target.x+dist*Math.sin(orbit.yaw)*Math.cos(orbit.pitch),target.y+dist*Math.sin(orbit.pitch),target.z+dist*Math.cos(orbit.yaw)*Math.cos(orbit.pitch));camera.lookAt(target);}
const pointers=new Map();let pointerStart=null,dragged=false;
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());renderer.domElement.addEventListener('pointerdown',e=>{focusGoal=null;if(focusActive){focusActive=false;selectPart(state.selected);}renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pointerStart={x:e.clientX,y:e.clientY};dragged=false;});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>4)dragged=true;
if(pointers.size===2){const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)[1];const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>0&&after>0)orbit.distance=THREE.MathUtils.clamp(orbit.distance*before/after,6,25);}else if(e.shiftKey||e.buttons===2){const right=new THREE.Vector3().setFromMatrixColumn(camera.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrix,1);orbit.pan.addScaledVector(right,-dx*.007).addScaledVector(up,dy*.007);}else{orbit.yaw-=dx*.006;orbit.pitch=THREE.MathUtils.clamp(orbit.pitch+dy*.006,-1.25,1.52);viewTarget=null;document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
function releasePointer(e){const wasSingle=pointers.size===1;pointers.delete(e.pointerId);if(e.type==='pointerup'&&wasSingle&&!dragged)pickPart(e);pointerStart=null;}
renderer.domElement.addEventListener('pointerup',releasePointer);renderer.domElement.addEventListener('pointercancel',releasePointer);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();focusGoal=null;if(focusActive){focusActive=false;selectPart(state.selected);}orbit.distance=THREE.MathUtils.clamp(orbit.distance*Math.exp(e.deltaY*.001),state.vehicle?1.2:3,25);},{passive:false});
const raycaster=new THREE.Raycaster();function pickPart(e){const rect=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);const candidates=state.mode>1?multi.meshes.filter(m=>{let o=m;while(o){if(!o.visible)return false;o=o.parent;}return true;}):selectables;const hits=raycaster.intersectObjects(candidates,false).filter(h=>!h.object.userData.shell||!state.cut||clip.distanceToPoint(h.point)>=0);if(hits.length)selectPart(hits[0].object.userData.part);else selectPart(null);}
function partCameraGoal(id){if(state.mode>1){multi.root.updateMatrixWorld(true);const sphere=multi.bounds(id).getBoundingSphere(new THREE.Sphere());return {target:sphere.center,distance:THREE.MathUtils.clamp(sphere.radius*3.8/Math.min(1,camera.aspect),3,24)};}engine.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(parts[id]),sphere=bounds.getBoundingSphere(new THREE.Sphere());return {target:sphere.center,distance:THREE.MathUtils.clamp(sphere.radius*4.1/Math.min(1,camera.aspect),3-state.installation*1.8,12)};}
function focusPart(id){if(state.mode>1){focusActive=true;orbit.pan.set(0,0,0);focusGoal=partCameraGoal(id);return;}focusActive=true;orbit.pan.set(0,0,0);focusGoal=partCameraGoal(id);if(state.vehicle)viewTarget={yaw:-.3,pitch:.18};setTheme('dark');if(['head','cylinder','piston','valves','injector'].includes(id)&&state.explode<.025&&state.targetExplode===0)beginEngineInspection();}
function homeCamera(){if(state.mode>1){focusActive=false;state.selected=null;multi.setSelected(null);orbit.pan.set(0,0,0);focusGoal={target:new THREE.Vector3(-.4,1.35,0),distance:multiDistance()};viewTarget={yaw:.55,pitch:.32};document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='iso'));return;}focusActive=false;if(state.selected)selectPart(null);orbit.pan.set(0,0,0);focusGoal={target:new THREE.Vector3(state.vehicle?1:0,state.vehicle?1.25:1.53,0),distance:state.vehicle?15.8:13.9};setView('iso');}
function selectPart(id,focus=false){if(state.mode>1){if(id&&!id.startsWith('m_'))return;state.selected=id;multi.setSelected(id);if(focus&&id)focusPart(id);else if(!id&&focusActive)homeCamera();return;}state.selected=id;if(focus&&id)focusPart(id);else if(!id&&focusActive)homeCamera();document.querySelectorAll('.part-btn,.part-label').forEach(b=>{const key=b.dataset.part||labels.find(l=>l.el===b)?.id;b.classList.toggle('selected',key===id);b.setAttribute('aria-pressed',String(key===id));});$('selectionCard').hidden=!id;if(id){const p=partInfo.find(p=>p[0]===id);$('partName').textContent=p[1];$('partDesc').textContent=p[2];}
for(const m of selectables){const ghost=focusActive&&id&&m.userData.part!==id;m.material.transparent=!!ghost;m.material.opacity=ghost?.13:1;m.material.depthWrite=!ghost;m.castShadow=!ghost;if(m.material.emissive){m.material.emissive.copy(m.userData.baseEmissive);if(id&&m.userData.part===id){m.material.emissive.setHex(0x1c4b9c);m.material.emissiveIntensity=.25;}else m.material.emissiveIntensity=1;}}}
function updateClip(){multi.clip(state.cut);const a=state.cutAngle*Math.PI/180;clip.normal.set(Math.sin(a),0,-Math.cos(a));clip.constant=state.cutPos*(state.mode>1?1.8:1.25);for(const m of selectables)if(m.userData.shell){m.material.clippingPlanes=state.cut?[clip]:[];m.material.needsUpdate=true;}$('cutControls').classList.toggle('disabled',!state.cut);$('cutRange').disabled=$('cutAngle').disabled=!state.cut;$('modeText').textContent=state.cut?'机体剖切':'完整外观';}
function setExplosion(v){if(state.mode>1&&v===0&&multi.apart()){multi.restore();state.selected=null;}if(state.mode>1&&v>0){focusActive=false;state.selected=null;multi.setSelected(null);homeCamera();}const was=state.targetExplode>0||state.explode>.002;if(v>0&&!was){state.resumeAfterExplode=state.running;state.running=false;}state.targetExplode=v;$('explodeRange').value=Math.round(v*100);$('explodeValue').value=Math.round(v*100)+'%';$('explodeText').textContent=v>0?'一键合成':'一键拆解';$('explodeBtn').classList.toggle('assembling',v>0);$('explodeBtn').setAttribute('aria-expanded',String(v>0));$('assemblyState').textContent=v>0?'拆解视图':'已装配';updatePlayUI();updateRanges();}
function updatePlayUI(){const exploded=state.targetExplode>0||state.explode>.002||(state.mode>1&&multi.apart());$('playBtn').disabled=exploded;$('stepBtn').disabled=exploded;$('playBtn').innerHTML=state.running?icons.pause:icons.play;$('playBtn').setAttribute('aria-label',state.running?'暂停运行':'开始运行');$('statusText').textContent=exploded?'拆解观察':state.running?'正在运行':'已暂停';$('statusDot').style.background=state.running?'#3b82f6':'#cc9c55';$('runHint').textContent=exploded?'合成复原后可继续运行':'拖动转角可暂停并观察任意时刻';}
function togglePlay(){if(state.targetExplode>0||state.explode>.002||(state.mode>1&&multi.apart()))return;state.running=!state.running;updatePlayUI();}
$('explodeBtn').onclick=()=>setExplosion(state.targetExplode>0?0:1);$('explodeRange').oninput=e=>setExplosion(+e.target.value/100);
$('cutToggle').onchange=e=>{state.cut=e.target.checked;updateClip();};$('cutRange').oninput=e=>{state.cutPos=+e.target.value/100;$('cutValue').value=Math.round((state.cutPos+1)*50)+'%';updateClip();};$('cutAngle').oninput=e=>{state.cutAngle=+e.target.value;$('cutAngleValue').value=state.cutAngle+'°';updateClip();};$('effectsToggle').onchange=e=>{state.effects=e.target.checked;};$('labelToggle').onchange=e=>{state.labels=e.target.checked;$('labels').hidden=!state.labels;};
$('playBtn').onclick=togglePlay;$('speedRange').oninput=e=>{state.speed=+e.target.value;$('speedReadout').innerHTML=state.speed.toFixed(2)+'<span>×</span>';$('rpmReadout').textContent=Math.round(state.speed*30)+' rpm';};
function seek(angle){state.angle=angle;state.running=false;state.resumeAfterExplode=false;updatePlayUI();updateMechanism(0);}
$('cycleRange').oninput=e=>seek(+e.target.value);$('stepBtn').onclick=()=>seek((state.angle+15)%720);document.querySelectorAll('[data-stroke]').forEach(b=>b.onclick=()=>seekLocal(+b.dataset.stroke*180+90));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('resetView').onclick=homeCamera;$('clearSelection').onclick=()=>selectPart(null);
$('resetAll').onclick=()=>{if(state.mode>1){resetMulti();return;}setExplosion(0);state.vehicle=false;state.targetInstallation=0;$('vehicleText').textContent='装入运行中的挖掘机';$('vehicleBtn').classList.remove('active');$('vehicleBtn').setAttribute('aria-pressed','false');$('xrayToggle').disabled=true;$('tracksToggle').disabled=true;document.querySelectorAll('[data-drive]').forEach(b=>b.disabled=true);$('engineBayBtn').hidden=true;setSoundEnabled(false);state.audioUserMuted=false;$('vehicleHint').textContent='反铲挖掘机 / 向机身内收挖掘';state.resumeAfterExplode=false;state.running=false;state.angle=25;state.speed=.5;state.cut=true;state.effects=true;$('effectsToggle').checked=true;state.cutPos=0;state.cutAngle=0;state.labels=true;$('speedRange').value=.5;$('speedRange').oninput({target:$('speedRange')});$('cutToggle').checked=true;$('cutRange').value=0;$('cutAngle').value=0;$('cutValue').value='50%';$('cutAngleValue').value='0°';$('labelToggle').checked=true;$('labels').hidden=false;selectPart(null);updateClip();$('resetView').click();updatePlayUI();updateRanges();};
const dialog=$('helpDialog');$('helpBtn').onclick=$('infoBtn').onclick=()=>dialog.showModal();$('closeHelp').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});document.addEventListener('keydown',e=>{if(!dialog.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&(e.code==='Digit1'||e.code==='Digit2')){e.preventDefault();seekLocal(e.code==='Digit1'?90:450);return;}if(e.code==='Space'&&!dialog.open&&!['INPUT','BUTTON','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();togglePlay();}});
function updateRanges(){document.querySelectorAll('input[type=range]').forEach(el=>el.style.setProperty('--fill',100*(el.value-el.min)/(el.max-el.min)+'%'));}document.querySelectorAll('input[type=range]').forEach(el=>el.addEventListener('input',updateRanges));updateRanges();
const scratch=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);let previousPhase=-1;
function updateMechanism(time){if(state.mode>1){multi.update(state,camera,lastSize,frameDelta);return;}const theta=state.angle*Math.PI/180,x=R*Math.sin(theta),y=R*Math.cos(theta),pinY=y+Math.sqrt(L*L-x*x),phase=Math.min(3,Math.floor(state.angle/180)),progress=(state.angle%180)/180;
piston.position.y=pinY+.095;rodMotion.position.set(x,y,0);rodMotion.quaternion.setFromUnitVectors(up,scratch.set(-x,pinY-y,0).normalize());crankMotion.rotation.z=flyMotion.rotation.z=-theta;
for(const [i,v] of valveMotions.entries()){const open=phase===(i===0?0:3)?Math.sin(progress*Math.PI):0;v.position.y=-.17*Math.pow(Math.max(0,open),.7);}
for(const [id,g] of Object.entries(parts)){g.position.copy(g.userData.offset).multiplyScalar(state.explode);if(id==='piston')g.position.y+=pinY+.095;}
const crown=pinY+.5,gh=Math.max(.035,3.59-crown);effects.update({angle:state.angle,phase,progress,crown,height:gh,cut:state.cut,explode:state.explode,enabled:state.effects});
let effect=phase===0?'intake':phase===1?'compression':phase===2?'ignition':'exhaust';if(state.angle>=347&&state.angle<360)effect='spray';
const captions={intake:['空气吸入','蓝色流线经进气门进入气缸'],compression:['空气压缩','活塞上行，缸内空气受压升温'],spray:['柴油雾化','喷油器六束喷流形成细密油雾'],ignition:['压燃做功','柴油自燃，燃气膨胀推动活塞'],exhaust:['废气排出','废气经排气门与排气管排出'],idle:['特效已关闭','打开气流与燃烧特效可继续观察']};
if(!state.effects)effect='idle';let caption=captions[effect];if(state.explode>.025){effect='idle';caption=['拆解观察','合成复原后显示气流与燃烧'];}else if(!state.cut&&state.effects&&phase!==0&&phase!==3){caption=['内部机构遮挡','打开机体剖切可观察缸内特效'];}
$('fxBadge').dataset.effect=effect;$('fxState').textContent=caption[0];$('fxDetail').textContent=caption[1];
document.querySelectorAll('[data-fx-angle]').forEach(b=>{const active=effect===({90:'intake',356:'spray',382:'ignition'}[b.dataset.fxAngle]);b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
if(previousPhase!==phase){document.querySelectorAll('[data-stroke]').forEach(b=>(b.classList.toggle('active',+b.dataset.stroke===phase),b.setAttribute('aria-pressed',String(+b.dataset.stroke===phase))));previousPhase=phase;}
document.querySelectorAll('.stroke-line i').forEach((line,i)=>line.style.width=(i<phase?100:i===phase?progress*100:0)+'%');$('angleReadout').value=Math.floor(state.angle)+'°';$('cycleRange').value=state.angle;$('cycleRange').style.setProperty('--fill',state.angle/720*100+'%');
// Labels follow the moving groups and avoid close neighbors in screen space.
if(state.labels){const boxes=[];for(const l of labels){let show=state.explode>.1||['cylinder','piston','crank','flywheel','injector','manifolds'].includes(l.id);if(focusActive&&state.selected)show=l.id===state.selected;else if(state.vehicle)show=l.id==='injector';l.el.textContent=state.vehicle&&!focusActive&&l.id==='injector'?'动力舱 · 柴油机':partInfo.find(p=>p[0]===l.id)[1];l.el.hidden=!show;if(!show)continue;const g=parts[l.id];scratch.copy(l.anchor).add(g.position);if(l.id==='piston')scratch.y=pinY+.2+g.userData.offset.y*state.explode;engine.localToWorld(scratch);scratch.project(camera);let sx=(scratch.x*.5+.5)*lastSize.w,sy=(-scratch.y*.5+.5)*lastSize.h;const side=sx>lastSize.w*.52?1:-1;sx+=side*(state.explode>.1?35:58);sx=THREE.MathUtils.clamp(sx,55,lastSize.w-55);sy=THREE.MathUtils.clamp(sy,30,lastSize.h-85);for(const b of boxes)if(Math.abs(b.x-sx)<95&&Math.abs(b.y-sy)<27)sy=b.y+28;boxes.push({x:sx,y:sy});l.el.style.left=sx+'px';l.el.style.top=sy+'px';l.el.style.opacity=scratch.z>1?0:1;}}
}
function resize(){const r=$('viewport').getBoundingClientRect();lastSize={w:r.width,h:r.height};renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();effects.resize(r.height,renderer.getPixelRatio());if(state.mode>1&&!focusActive){focusGoal={target:new THREE.Vector3(-.4,1.35,0),distance:multiDistance()};}}new ResizeObserver(resize).observe($('viewport'));resize();
let last=performance.now(),elapsed=0;function frame(now){requestAnimationFrame(frame);const visualDt=Math.min((now-last)/1000,.25),dt=Math.min(visualDt,.1);last=now;if(document.hidden)return;frameDelta=dt;elapsed+=dt;const diff=state.targetExplode-state.explode;if(Math.abs(diff)>.0003){state.explode+=diff*(1-Math.exp(-visualDt*5));if(Math.abs(state.targetExplode-state.explode)<.001){state.explode=state.targetExplode;if(state.explode===0){state.running=state.resumeAfterExplode&&!(state.mode>1&&multi.apart());state.resumeAfterExplode=false;}updatePlayUI();}}
if(state.running&&state.explode<.002&&state.targetExplode===0&&!(state.mode>1&&multi.apart()))state.angle=(state.angle+dt*180*state.speed)%720;const installDiff=state.targetInstallation-state.installation;state.installation+=installDiff*(1-Math.exp(-visualDt*2.7));if(Math.abs(installDiff)<.001)state.installation=state.targetInstallation;
const ins=state.installation;engine.scale.setScalar(1-ins*.76);engine.position.set(-1.5*ins,.95*ins,0);clip.constant=state.mode>1?state.cutPos*1.8:state.cutPos*1.25*(1-ins*.76)-clip.normal.dot(engine.position);excavator.update(dt,{amount:ins,running:state.running,speed:state.speed,xray:$('xrayToggle').checked,tracks:state.tracks,direction:state.driveDir,engineAngle:state.angle,smoke:state.effects});updateMechanism(elapsed);if(focusActive&&state.selected)focusGoal=partCameraGoal(state.selected);updateCamera(visualDt);updateSoundAndMotion();renderer.render(scene,camera);if(!frame.lastDiagnostic||now-frame.lastDiagnostic>500){frame.lastDiagnostic=now;let diagnostic=$('modelDiagnostics');if(!diagnostic){diagnostic=document.createElement('output');diagnostic.id='modelDiagnostics';diagnostic.hidden=true;document.body.append(diagnostic);}diagnostic.textContent=JSON.stringify({state:{mode:state.mode,angle:state.angle,running:state.running,explode:state.explode,cut:state.cut,selected:state.selected,observed:state.observed},multi:state.mode>1?multi.diagnostics(state.angle):null,render:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameMs:Math.round(visualDt*1000)}});}}
function setTheme(theme){state.theme=theme;document.documentElement.dataset.theme=theme;const dark=theme==='dark';document.querySelector('meta[name="theme-color"]').content=dark?'#0b101a':'#f5f8fd';$('lightTheme').classList.toggle('active',!dark);$('darkTheme').classList.toggle('active',dark);$('lightTheme').setAttribute('aria-pressed',String(!dark));$('darkTheme').setAttribute('aria-pressed',String(dark));scene.fog.color.setHex(dark?0x0b101a:0xf5f8fd);hemi.intensity=dark?1.75:2.4;key.intensity=dark?3.4:4.4;grid.material.color.setHex(dark?0x3c526d:0xffffff);grid.material.opacity=dark?.27:.33;baseRing.material.color.setHex(dark?0x304565:0xb5c9e4);ground.material.opacity=dark?.28:.12;ground.material.color.setHex(dark?0x000000:0x536e91);for(const m of selectables){if(m.userData.materialKey==='shell')m.material.color.setHex(dark?0x43668e:0x7194ba);}effects.setTheme(theme);multi.theme(dark);}
$('lightTheme').onclick=()=>setTheme('light');$('darkTheme').onclick=()=>setTheme('dark');
document.querySelectorAll('[data-fx-angle]').forEach(b=>b.onclick=()=>{setExplosion(0);state.cut=true;state.effects=true;$('cutToggle').checked=$('effectsToggle').checked=true;updateClip();seekLocal(+b.dataset.fxAngle);});
document.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>seekLocal(+b.dataset.angle));
$('vehicleBtn').onclick=()=>{if(state.mode>1){chooseEngine(1);}state.vehicle=!state.vehicle;state.targetInstallation=state.vehicle?1:0;setExplosion(0);selectPart(null);state.resumeAfterExplode=state.explode>.002;state.running=true;if(state.vehicle){state.cut=true;$('cutToggle').checked=true;updateClip();}homeCamera();$('vehicleText').textContent=state.vehicle?'返回发动机视图':'装入运行中的挖掘机';$('vehicleBtn').classList.toggle('active',state.vehicle);$('vehicleBtn').setAttribute('aria-pressed',String(state.vehicle));$('xrayToggle').disabled=!state.vehicle;$('tracksToggle').disabled=!state.vehicle;document.querySelectorAll('[data-drive]').forEach(b=>b.disabled=!state.vehicle);$('engineBayBtn').hidden=!state.vehicle;$('vehicleHint').textContent=state.vehicle?'反铲内收 · 履带轮组同步 · 烟囱排气':'反铲挖掘机 / 向机身内收挖掘';updatePlayUI();};
$('engineBayBtn').onclick=()=>{selectPart(null);beginEngineInspection();focusActive=true;focusGoal={target:new THREE.Vector3(-1.5,1.30,0),distance:3.25/Math.min(1,camera.aspect)};orbit.pan.set(0,0,0);viewTarget={yaw:-.3,pitch:.15};setTheme('dark');};

async function setSoundEnabled(enabled,byUser=false){if(byUser)state.audioUserMuted=!enabled;state.audioEnabled=enabled;$('audioToggle').checked=enabled;const ok=await engineSound.setEnabled(enabled);if(state.audioEnabled!==enabled)return;if(enabled&&!ok){state.audioEnabled=false;$('audioToggle').checked=false;$('audioStatus').textContent='请点击音效开关启动声音';}}
function beginEngineInspection(){if(state.mode>1){multi.restore();$('partSearch').value='';multi.renderIndex();}if(state.targetExplode>0||state.explode>.025){setExplosion(0);state.resumeAfterExplode=true;}else state.running=true;state.cut=true;state.effects=true;$('cutToggle').checked=$('effectsToggle').checked=true;if(state.vehicle)$('xrayToggle').checked=true;updateClip();updatePlayUI();if(!state.audioUserMuted)setSoundEnabled(true);}
$('inspectEngineBtn').onclick=()=>{if(state.mode>1){selectPart(null);beginEngineInspection();homeCamera();return;}if(state.vehicle){$('engineBayBtn').onclick();return;}selectPart(null);beginEngineInspection();focusActive=true;orbit.pan.set(0,0,0);focusGoal={target:new THREE.Vector3(0,2.6,0),distance:7.4/Math.min(1,camera.aspect)};viewTarget={yaw:.28,pitch:.12};setTheme('dark');};
$('audioToggle').onchange=e=>setSoundEnabled(e.target.checked,true);$('audioVolume').oninput=e=>{state.audioVolume=+e.target.value/100;$('volumeValue').value=e.target.value+'%';};
$('tracksToggle').onchange=e=>{state.tracks=e.target.checked;};document.querySelectorAll('[data-drive]').forEach(b=>b.onclick=()=>{state.driveDir=+b.dataset.drive;document.querySelectorAll('[data-drive]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});});
document.addEventListener('visibilitychange',()=>{if(document.hidden)engineSound.silence();});
function updateSoundAndMotion(){const running=state.running&&state.explode<.025&&state.targetExplode===0&&!(state.mode>1&&multi.apart()),proximity=Math.max(.12,Math.min(1,(16-orbit.distance)/9));engineSound.update({angle:state.mode>1?multi.phaseOf(state.observed,state.angle).local:state.angle,running,speed:state.speed,volume:state.audioVolume,proximity});const meter=engineSound.meter(),phase=state.mode>1?multi.phaseOf(state.observed,state.angle).phase:Math.min(3,Math.floor(state.angle/180));$('audioStatus').textContent=!state.audioEnabled?'音效已关闭':!running?'已暂停 · 音效待命':meter.state!=='running'?'点击音效开关激活声音':['进气 · 气流嘶声','压缩 · 机械低鸣','做功 · 压燃敲击','排气 · 排气脉冲'][phase];$('audioStatus').dataset.context=meter.state;$('audioMeter').dataset.level=meter.level.toFixed(4);$('audioMeter').querySelectorAll('i').forEach((bar,i)=>bar.style.transform='scaleY('+Math.max(.1,meter.level*[.55,.83,1,.76,.43][i])+')');const movement=excavator.getState();$('trackFlow').style.transform='rotate('+(movement.trackTravel||0)*360/10.2+'deg)';$('trackMotion').dataset.distance=(movement.trackTravel||0).toFixed(4);$('trackState').textContent=!state.vehicle?'装机后可运行':!running?'履带已暂停':!state.tracks?'履带已停转':state.driveDir===1?'履带前进循环':'履带后退循环';}
// Connect the multi-cylinder model to the existing lab controls.
let multiWasApart=false, resumeAfterParts=false;
function multiDistance(){const span=state.mode*1.28+4.1,aspect=Math.max(.35,camera.aspect);return Math.max(13.8,Math.min(25,span/(2*Math.tan(18*Math.PI/180)*aspect)*1.12));}
function seekLocal(local){if(state.mode===1){seek(local);return;}const c=multi.phaseOf(state.observed,state.angle);seek(((local+c.fire-360)%720+720)%720);}
function observeCylinder(number){if(state.mode===1)return;state.observed=Math.max(1,Math.min(state.mode,number));$('cycleTitle').textContent=`第 ${state.observed} 缸 · 四个冲程。`;$('cycleDescription').innerHTML='点击冲程，定位观察缸 <span>↗</span>';$('cycleDescription').title='冲程角度为当前观察缸的局部转角';updateMechanism(0);}
function chooseEngine(number){
 number=Number(number);if(![1,4,6].includes(number))return;
 focusActive=false;focusGoal=null;state.selected=null;state.vehicle=false;state.installation=state.targetInstallation=0;state.explode=state.targetExplode=0;state.resumeAfterExplode=false;resumeAfterParts=false;multiWasApart=false;state.observed=1;
 $('vehicleText').textContent='装入运行中的挖掘机';$('vehicleBtn').classList.remove('active');$('vehicleBtn').setAttribute('aria-pressed','false');$('xrayToggle').disabled=$('tracksToggle').disabled=true;document.querySelectorAll('[data-drive]').forEach(b=>b.disabled=true);$('engineBayBtn').hidden=true;
 document.querySelectorAll('.multi-label').forEach(l=>l.hidden=true);for(const l of labels)l.el.hidden=true;
 state.mode=number;engine.visible=number===1;multi.root.visible=number>1;document.body.classList.toggle('multi-mode',number>1);
 $('multiDashboard').hidden=$('multiTools').hidden=$('partsCount').hidden=number===1;$('selectionCard').hidden=true;$('partSearch').value='';$('systemFilter').value='all';
 if(number>1){multi.build(number);multi.root.visible=true;multi.clip(state.cut);multi.theme(state.theme==='dark');multi.setSelected(null);}
 else{$('partsList').replaceChildren(...singlePartButtons);selectPart(null);singlePartButtons.forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});}
 document.querySelectorAll('[data-engine]').forEach(b=>{b.classList.toggle('active',+b.dataset.engine===number);b.setAttribute('aria-pressed',String(+b.dataset.engine===number));});
 const name=number===1?'单缸':number===4?'直列四缸':'直列六缸';$('engineTitle').textContent=name+'柴油机';$('heroTitle').textContent=number===1?'看见动力的发生。':'看见动力的接续。';$('heroSubtitle').textContent=number===1?'从一次压燃，到每一圈转动。':`${number===4?'四':'六'}缸错峰做功，共用一根曲轴。`;
 $('modelTag').textContent=number===1?'SINGLE · 720° 一个循环':`INLINE ${number} · ${720/number}° 做功间隔`;$('modelSummary').textContent=number===1?'单缸 · 直喷 · 压燃':`${number===4?'四':'六'}缸 · 共轨直喷 · 涡轮增压`;
 $('modeDescription').textContent=number===1?'原有单缸模型，保留发动机与挖掘机联动演示。':`${multi.order.join(' → ')} 错峰做功，点击气缸卡片切换观察缸。`;
 $('audioToggle').previousElementSibling.innerHTML=(number===1?'发动机同步音效':'观察缸同步音效');
 $('cycleTitle').textContent=number===1?'一个循环，四个冲程。':'第 1 缸 · 四个冲程。';$('cycleDescription').innerHTML=number===1?'点击冲程，定位观察 <span>↗</span>':'点击冲程，定位观察缸 <span>↗</span>';
 document.querySelectorAll('.vehicle-section .section-title .tiny').forEach(el=>el.textContent=number===1?'BACKHOE':'单缸装机演示');
 $('vehicleHint').textContent=number===1?'反铲挖掘机 / 向机身内收挖掘':'点击将切换至原有单缸动力舱演示';
 $('explodeRange').value='0';$('explodeValue').value='0%';$('explodeText').textContent='一键拆解';$('explodeBtn').classList.remove('assembling');$('explodeBtn').setAttribute('aria-expanded','false');$('assemblyState').textContent='已装配';
 updateClip();updatePlayUI();updateRanges();homeCamera();if(number===1)previousPhase=-1;
}
function resetMulti(){
 const mode=state.mode;chooseEngine(mode);state.angle=25;state.running=!matchMedia('(prefers-reduced-motion: reduce)').matches;state.speed=.5;state.cut=state.effects=state.labels=true;state.cutPos=state.cutAngle=0;state.audioEnabled=false;state.audioUserMuted=false;setSoundEnabled(false);state.audioVolume=.3;
 $('audioVolume').value=30;$('volumeValue').value='30%';$('speedRange').value=.5;$('speedReadout').innerHTML='0.50<span>×</span>';$('rpmReadout').textContent='15 rpm';$('cutToggle').checked=$('effectsToggle').checked=$('labelToggle').checked=true;$('cutRange').value=$('cutAngle').value=0;$('cutValue').value='50%';$('cutAngleValue').value='0°';$('labels').hidden=false;updateClip();updatePlayUI();updateRanges();homeCamera();updateMechanism(0);
}
multi.connect({select:selectPart,observe:observeCylinder,fire(number){observeCylinder(number);seekLocal(366);}});
document.querySelectorAll('[data-engine]').forEach(b=>b.onclick=()=>chooseEngine(+b.dataset.engine));
$('partSearch').oninput=()=>multi.renderIndex();
$('systemFilter').onchange=e=>{focusActive=false;state.selected=null;multi.setSystem(e.target.value);homeCamera();};
$('detachPart').onclick=()=>{if(state.running)resumeAfterParts=true;const detached=multi.detach();if(detached){state.running=false;state.resumeAfterExplode=false;}if(!multi.apart()&&!detached){state.running=resumeAfterParts;resumeAfterParts=false;}updatePlayUI();};
$('isolatePart').onclick=()=>multi.isolate();
$('restoreParts').onclick=()=>{const shouldRun=state.running||resumeAfterParts||state.resumeAfterExplode;multi.restore();$('partSearch').value='';multi.renderIndex();setExplosion(0);state.running=shouldRun;resumeAfterParts=false;homeCamera();updatePlayUI();};
const originalUpdateMulti=multi.update.bind(multi);multi.update=(...args)=>{originalUpdateMulti(...args);const apart=multi.apart();if(apart!==multiWasApart){multiWasApart=apart;if(!apart&&resumeAfterParts){state.running=true;resumeAfterParts=false;}updatePlayUI();}};

chooseEngine(4);setTheme('dark');updateClip();updatePlayUI();updateCamera(1);updateMechanism(0);requestAnimationFrame(frame);
window.engineLab={getState:()=>({...state}),setAngle:seek,setEngine:chooseEngine,observeCylinder:observeCylinder,getDiagnostics:()=>({mode:state.mode,multi:state.mode>1?multi.diagnostics(state.angle):null,parts:Object.keys(parts).length,meshes:selectables.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,effects:effects.getVisible(),vehicle:state.vehicle,installation:state.installation,webgl:true})};
})();

