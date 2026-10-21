(function(){
 'use strict';
 const $=id=>document.getElementById(id), $$=s=>Array.from(document.querySelectorAll(s)), M=RobotModel;
 const names=['底座回转','肩部摆动','肘部摆动','腕部回转','腕部摆动','法兰自转'];
 const shortNames=['底座','肩部','肘部','腕转','腕摆','法兰'];
 const descriptions=['带动其后整条机械臂与工具。','大臂及其后的连杆、工具一起摆动。','小臂、腕部与工具绕肘部摆动。','让后续腕部与工具绕前臂轴回转。','改变法兰与工具方向，也可能移动 TCP。','法兰与所安装的工具一起绕出轴方向转动。'];
 const state={q:M.home.slice(),frame:'joint',axis:0,jogMode:'hold',speed:.25,tool:'gripper',closed:false,grip:0,activity:'axes',axes:true,trail:true,labels:true,theme:'light',points:[],holding:false};
 const challenge={active:false,phase:0,score:0};
 let renderer,scene,camera,arm,joints=[],toolRoot,tcpObject,gripper,probe,jaws=[],selectedMaterials=[],axisGizmos=[],jointRing,workCell,cube,pickPos,placePos;
 let running=null,held=null,slideMotion=null,last=0,visible=true,drag=null,needsRender=true,lastUI=0,lastInput=performance.now(),intro=true;
 let view={az:-52,el:27,zoom:1},viewGoal={...view},cameraTarget=new THREE.Vector3(235,0,295),overlayNodes=[],trailPoints=[],trailLine,trailGeometry,trailPositions=new Float32Array(1500*3);
 let toastTimer=0,drop=null,compareOrigin=null,raf=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function notice(text,warning=false){$('notice').textContent=text;$('notice').classList.toggle('warning',warning);}
 function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2700);}
 function requestPaint(){needsRender=true;}
 function stop(message,quiet=false){held=null;running=null;slideMotion=null;intro=false;$$('.jog-button.pressed').forEach(b=>b.classList.remove('pressed'));$('tour').textContent='▷ 六轴巡回演示';$('play').textContent='▷ 回放';if(message)notice(message);if(!quiet&&message)toast(message);requestPaint();}
 function touch(){lastInput=performance.now();if(intro){intro=false;running=null;}requestPaint();}
 function current(){return M.fk(state.q,state.tool);}
 function applyQ(q,reason){const issue=M.guard(q,state.tool);if(issue){notice(issue,true);return false;}state.q=q.slice();if(reason)notice(reason);requestPaint();return true;}
 function setSelected(axis){state.axis=axis;const joint=state.frame==='joint',axisName=['X','Y','Z','Rx','Ry','Rz'][axis];$('jointBadge').textContent=joint?'J'+(axis+1):state.frame==='base'?'B':'T';$('jointName').textContent=joint?names[axis]:`${state.frame==='base'?'基坐标':'工具坐标'} · ${axisName}${axis<3?' 平移':' 转动'}`;$('jointDesc').textContent=joint?descriptions[axis]:axis<3?'多轴配合，保持工具朝向。':'多轴配合，保持 TCP 位置。';$('demoJoint').setAttribute('aria-label',joint?'演示当前关节':'演示当前参照方向');$$('.axis-card').forEach((b,i)=>b.classList.toggle('active',joint&&i===axis));$$('.jog-row').forEach((r,i)=>r.classList.toggle('selected',i===axis));selectedMaterials.forEach((m,i)=>m.color.setHex(joint&&i===axis?0x347cf2:0x66809e));requestPaint();}
 function switchFrame(frame){touch();stop(null,true);state.frame=frame;$$('[data-frame]').forEach(b=>{const selected=b.dataset.frame===frame;b.classList.toggle('active',selected);b.setAttribute('aria-selected',selected);});const texts={joint:['J','独立控制一个关节','只改变选定轴的角度，其后连杆随动。'],base:['B','以固定底座为参照','沿固定 XYZ 平移，或绕其轴转动 TCP。'],tool:['T','以当前工具为参照','工具轴随姿态变化，+Z 沿工具出轴方向。']};[$('frameSymbol').textContent,$('frameName').textContent,$('frameDesc').textContent]=texts[frame];buildRows();setSelected(state.axis);notice(frame==='joint'?'单轴点动一般产生曲线轨迹。':'XYZ 保持工具朝向；Rx / Ry / Rz 保持 TCP 位置。');requestPaint();}
 function buildRows(){
   const joint=state.frame==='joint',labels=joint?['J1','J2','J3','J4','J5','J6']:['X','Y','Z','Rx','Ry','Rz'];
   $('jogRows').innerHTML=labels.map((name,i)=>`<div class="jog-row ${i===state.axis?'selected':''}"><button class="jog-label" data-select="${i}" aria-label="选择${name}">${name}${joint?`<span>${shortNames[i]}</span>`:''}</button><div class="jog-value"><output id="jogValue${i}">—</output>${joint?`<input aria-label="${name}关节角" data-slider="${i}" type="range" min="${M.limits[i][0]}" max="${M.limits[i][1]}" step="0.2">`:''}</div><button class="jog-button" data-axis="${i}" data-dir="-1" aria-label="${name}负向点动">−</button><button class="jog-button" data-axis="${i}" data-dir="1" aria-label="${name}正向点动">+</button></div>`).join('');
   $$('[data-select]').forEach(b=>b.addEventListener('click',()=>{touch();setSelected(+b.dataset.select);}));
   $$('.jog-button').forEach(b=>{b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();touch();stop(null,true);setSelected(+b.dataset.axis);if(b.setPointerCapture)b.setPointerCapture(e.pointerId);if(state.jogMode==='step'){doJog(+b.dataset.axis,+b.dataset.dir*(state.frame==='joint'||+b.dataset.axis>=3?2:5));}else{held={axis:+b.dataset.axis,dir:+b.dataset.dir};b.classList.add('pressed');doJog(held.axis,held.dir*.12);} });for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{held=null;b.classList.remove('pressed');});b.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();touch();stop(null,true);setSelected(+b.dataset.axis);doJog(+b.dataset.axis,+b.dataset.dir*(state.frame==='joint'||+b.dataset.axis>=3?2:5));}});});
   $$('[data-slider]').forEach(s=>{s.addEventListener('pointerdown',()=>{touch();stop(null,true);setSelected(+s.dataset.slider);});s.addEventListener('input',()=>{touch();running=null;held=null;const axis=+s.dataset.slider,q=state.q.slice();q[axis]=+s.value;const from=state.q.slice();if(M.guard(q,state.tool)){notice('此姿态接近软限位、地面或自身，已停止滑条移动。',true);s.value=state.q[axis];return;}slideMotion={from,to:q,t:0};setSelected(axis);});});
   if(!renderer)$$('.jog-button,[data-slider]').forEach(b=>b.disabled=true);
   $('stepLabel').textContent=state.jogMode==='hold'?'松开即停':state.frame==='joint'?'每次 2°':'每次 5 mm / 2°';updateUI();
 }
 function doJog(axis,amount){
   const r=M.jog(state.q,state.frame,axis,amount,state.tool);
   if(!r.ok){held=null;notice(r.reason,true);return false;}
   if(!applyQ(r.q)){held=null;return false;}notice(state.frame==='joint'?`J${axis+1} 独立运动 · 其余关节角保持不变`:`${state.frame==='base'?'基坐标':'工具坐标'} ${['X','Y','Z','Rx','Ry','Rz'][axis]} 点动 · 多轴协同`);return true;
 }
 function prepareMotion(to,{name='姿态移动',duration,after}={}){
   const issue=M.guard(to,state.tool);if(issue){notice(issue,true);return false;}
   const from=state.q.slice();for(let k=1;k<=50;k++){const q=from.map((v,i)=>v+(to[i]-v)*k/50);if(M.guard(q,state.tool)){notice('这段关节路径接近地面或自身，请先抬升或调整姿态。',true);return false;}}
   stop(null,true);running={kind:'ptp',from,to:to.slice(),time:0,duration:duration||Math.max(1.2,Math.max(...to.map((v,i)=>Math.abs(v-from[i])))/(35*state.speed)),name,after};notice(name);return true;
 }
 function cartesianAnimation(frame,axis,total,label){
   stop(null,true);running={kind:'cart',frame,axis,total,moved:0,name:label};notice(label);requestPaint();
 }
 function startJointDemo(axis,tour=false){touch();stop(null,true);state.frame==='joint'||switchFrame('joint');setSelected(axis);running={kind:'axis',axis,from:state.q.slice(),time:0,tour,name:`J${axis+1} · ${names[axis]}`};notice('观察选定关节及后续连杆；其余关节角保持不变。');$('tour').textContent=tour?'■ 停止巡回演示':'▷ 六轴巡回演示';}
 function setActivity(name){touch();stop(null,true);state.activity=name;$$('[data-activity]').forEach(b=>{const yes=b.dataset.activity===name;b.classList.toggle('active',yes);b.setAttribute('aria-selected',yes);});for(const n of ['axes','frames','teach','challenge'])$('activity'+n[0].toUpperCase()+n.slice(1)).hidden=n!==name;
   if(name==='frames'&&renderer){compareOrigin={q:M.home.slice(),tool:state.tool};prepareMotion(M.home,{name:'回到坐标对照起点',duration:1.8});}
   if(workCell)workCell.visible=challenge.active||name==='challenge';requestPaint();
 }
 function updatePoints(){
   const root=$('pointList');root.innerHTML=state.points.length?state.points.map((p,i)=>`<div class="point"><button data-point="${i}" aria-label="移动到示教点P${i+1}">P${i+1} <small>${M.tools[p.tool].name} · ${p.closed?'闭':'开'}</small></button><button class="point-remove" data-remove="${i}" aria-label="删除示教点P${i+1}">×</button></div>`).join(''):'<span class="empty">还没有示教点。先记录 P1，再移动机械臂。</span>';
   $$('[data-point]').forEach(b=>b.onclick=()=>{touch();stop(null,true);visitPoint(+b.dataset.point);});
   $$('[data-remove]').forEach(b=>b.onclick=()=>{touch();stop(null,true);state.points.splice(+b.dataset.remove,1);updatePoints();savePoints();});
   $('play').disabled=state.points.length<2;requestPaint();
 }
 function savePoints(){try{localStorage.setItem('edu6r-points-v1',JSON.stringify(state.points));}catch{}}
 function visitPoint(i,after){const p=state.points[i];if(!p)return false;if(challenge.active){toast('先结束搬运挑战，再移动到示教点。');return false;}if(!setTool(p.tool,false))return false;const ok=prepareMotion(p.q,{name:`PTP → P${i+1}`,after:()=>{setGripper(p.closed);if(after)after();}});return ok;}
 function playback(i=0){if(i>=state.points.length){stop('示教回放完成');return;}if(visitPoint(i,()=>playback(i+1))){$('play').textContent='■ 停止';}}
 function setTool(name,announce=true){stop(null,true);if(state.holding){toast('请先放下工件，再切换工具。');$('tool').value=state.tool;return false;}if(!M.tools[name])return false;state.tool=name;$('tool').value=name;if(gripper){gripper.visible=name==='gripper';probe.visible=name==='probe';tcpObject.position.set(...M.tools[name].offset);}clearTrail();$('grip').disabled=name!=='gripper';if(announce)notice(name==='probe'?'已换偏置喷嘴：转动 J6 时，偏置 TCP 也会移动。':'已换平行夹爪：开合是工具动作，不属于六个关节轴。');requestPaint();return true;}
 function clearTrail(){trailPoints=[];if(trailGeometry){trailGeometry.setDrawRange(0,0);trailGeometry.attributes.position.needsUpdate=true;}requestPaint();}
 function setGripper(closed){
   if(state.tool!=='gripper')return;
   state.closed=closed;$('grip').textContent=closed?'张开夹爪':'闭合夹爪';
   if(challenge.active&&cube){
     scene.updateMatrixWorld(true);const p=new THREE.Vector3();cube.getWorldPosition(p);const distance=M.norm(M.sub(current().p,p.toArray()));
     if(closed&&!state.holding){if(distance<=18&&!drop){toolRoot.attach(cube);state.holding=true;challenge.phase=2;notice('抓取成功。先抬升，再移向落料区。');toast('抓住了！抬升后再搬运。');}else notice(`还差 ${Math.max(0,distance-18).toFixed(0)} mm 进入抓取范围，继续点动靠近工件。`,true);}
     else if(!closed&&state.holding){scene.attach(cube);state.holding=false;const here=cube.position;const dx=Math.hypot(here.x-placePos[0],here.y-placePos[1]),dz=Math.abs(here.z-placePos[2]);const won=dx<30&&dz<45;drop={v:0,won,atDestination:dx<65};if(won){challenge.score++;challenge.phase=3;toast('搬运完成！再来一次，试试只用点动。');notice('放置成功：TCP 与落料点对齐，工件已释放。');}else{challenge.phase=1;notice('工件已释放。请在低位落料区内张开夹爪。',true);}}
   }
   requestPaint();
 }
 function resetCube(){if(!cube)return;state.holding=false;drop=null;scene.attach(cube);cube.position.set(...pickPos);cube.rotation.set(0,0,pickupQ[0]*M.D);state.closed=false;$('grip').textContent='闭合夹爪';challenge.phase=1;updateChallengeUI();requestPaint();}
 const pickupQ=[-25,20,15,0,55,0],placeQ=[30,20,15,0,55,0];
 function assist(which){
   if(!challenge.active){toast('先开始挑战，再使用辅助移动。');return;}if(state.tool!=='gripper')setTool('gripper');
   const target=which==='pick'?pickupQ:placeQ,f=M.fk(target,'gripper'),p=M.add(f.p,[0,0,75]),r=M.ik(p,f.R,target,'gripper');
   if(!r.ok){notice('辅助目标不可达',true);return;}
   // Lift to a common transit configuration before swinging the shoulder.
   const transit=[state.q[0],5,-25,0,110,0],transit2=[target[0],5,-25,0,110,0];
   const sequence=[transit,transit2,r.q];let index=0;
   const next=()=>{if(index>=sequence.length){switchFrame('base');setSelected(2);notice(`${which==='pick'?'取料':'落料'}上方已到达。按基坐标 Z− 下降约 75 mm，或用工具 Z+ 向下接近。`);return;}const q=sequence[index++];if(!prepareMotion(q,{name:which==='pick'?'辅助移动至取料上方':'辅助移动至落料上方',after:next}))notice('辅助路径受阻，请先手动抬升。',true);};next();
 }
 function updateChallengeUI(){
   const names=['准备好了吗？','靠近工件并闭合夹爪','抬升工件，送往落料区','放置完成，挑战成功！'];$('challengeStatus').textContent=names[challenge.phase];$('score').textContent=`完成 ${challenge.score} 次`;
   ['taskApproach','taskGrip','taskPlace'].forEach((id,i)=>{$(id).classList.toggle('done',challenge.phase>i+1);$(id).classList.toggle('active',challenge.phase===i+1);});
   if(challenge.active&&cube){let p=new THREE.Vector3();cube.getWorldPosition(p);const d=M.norm(M.sub(current().p,state.holding?placePos:p.toArray()));$('challengeHint').textContent=challenge.phase===3?'放置成功。重置工件可继续练习；可试着记录示教点来复现这次搬运。':state.holding?`工件已夹持 · 距落料中心 ${d.toFixed(0)} mm · 先抬升，再水平搬运。`:`距工件 ${d.toFixed(0)} mm · 18 mm 内可抓取，若夹爪已闭合需先张开。`;}
 }

 // Volumetric model. Each joint is an actual nested rigid transform.
 function buildScene(){
   const viewport=$('viewport');
   try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});}catch(e){renderer=null;notice('三维加速不可用；已显示静态模型，可阅读轴号与使用说明。',true);}
   if(renderer){renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;renderer.domElement.setAttribute('aria-hidden','true');viewport.prepend(renderer.domElement);}
   scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-600,600,500,-500,1,10000);camera.up.set(0,0,1);
   scene.add(new THREE.HemisphereLight(0xe6f0ff,0x536276,2.25));const key=new THREE.DirectionalLight(0xffffff,3.6);key.position.set(-450,-700,1400);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-1000,right:1000,top:1000,bottom:-1000,near:10,far:3000});key.shadow.bias=-.0005;key.shadow.normalBias=1.8;key.target.position.set(200,0,200);scene.add(key,key.target);const fill=new THREE.DirectionalLight(0x8fb9ff,1.3);fill.position.set(650,500,800);scene.add(fill);
   const mat=(color,metalness=.25,roughness=.42)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
   const white=mat(0xcbd6e3,.45,.31),shell=mat(0xdde5ee,.3,.4),dark=mat(0x273c55,.55,.37),steel=mat(0x9fb1c5,.75,.27),rubber=mat(0x26323d,.08,.88),pale=mat(0x768ca6,.45,.5),blue=mat(0x387be7,.35,.32),black=mat(0x192b41,.5,.4);
   const geometries=new Map();let meshCount=0;
   function add(parent,geo,material,p=[0,0,0]){const mesh=new THREE.Mesh(geo,material);mesh.position.set(...p);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);meshCount++;return mesh;}
   function roundedGeometry(w,d,h,r=3){const key=[w,d,h,r].join(',');if(geometries.has(key))return geometries.get(key);r=Math.min(r,w/3,d/3,h/3);const x=-w/2+r,y=-d/2+r,W=w-2*r,H=d-2*r,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+W-r,y);s.quadraticCurveTo(x+W,y,x+W,y+r);s.lineTo(x+W,y+H-r);s.quadraticCurveTo(x+W,y+H,x+W-r,y+H);s.lineTo(x+r,y+H);s.quadraticCurveTo(x,y+H,x,y+H-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);const geo=new THREE.ExtrudeGeometry(s,{depth:h-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,curveSegments:5});geo.translate(0,0,-h/2+r);geometries.set(key,geo);return geo;}
   const box=(parent,w,d,h,p,material=shell,r=3)=>add(parent,roundedGeometry(w,d,h,r),material,p);
   function cylinder(parent,r,length,p,material=steel,axis='z',r2=r,n=40){const key=['c',r,length,r2,n].join(',');let geo=geometries.get(key);if(!geo){geo=new THREE.CylinderGeometry(r2,r,length,n);geometries.set(key,geo);}const mesh=add(parent,geo,material,p);if(axis==='z')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.z=-Math.PI/2;return mesh;}
   function torus(parent,r,t,p,material=dark,axis='z'){const mesh=add(parent,new THREE.TorusGeometry(r,t,7,56),material,p);if(axis==='y')mesh.rotation.x=Math.PI/2;if(axis==='x')mesh.rotation.y=Math.PI/2;return mesh;}
   function bolt(parent,p,axis='z',size=4){cylinder(parent,size*1.5,1.8,p,steel,axis,size*1.5,16);const off=axis==='z'?[0,0,2]:axis==='y'?[0,-2,0]:[2,0,0];cylinder(parent,size,3.1,M.add(p,off),dark,axis,size,6);}
   function ringBolts(parent,center,axis,r,count=8,size=3){for(let i=0;i<count;i++){const a=i*Math.PI*2/count,offset=axis==='z'?[Math.cos(a)*r,Math.sin(a)*r,0]:axis==='y'?[Math.cos(a)*r,0,Math.sin(a)*r]:[0,Math.cos(a)*r,Math.sin(a)*r];bolt(parent,M.add(center,offset),axis,size);}}
   function plaque(parent,text,w,h,p,axis='y'){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#22364e';ctx.fillRect(0,0,512,128);ctx.fillStyle='#dae8fa';ctx.font='500 44px monospace';ctx.fillText(text,28,82);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=add(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}),p);if(axis==='y')m.rotation.x=Math.PI/2;return m;}
   const ground=add(scene,new THREE.PlaneGeometry(12000,12000),new THREE.ShadowMaterial({opacity:.12}),[200,0,0]);ground.castShadow=false;
   // A machined plinth, on four isolator feet, with inset measuring strips.
   const base=new THREE.Group();scene.add(base);
   for(const x of [-125,725])for(const y of [-400,400]){cylinder(base,24,12,[x,y,6],rubber);cylinder(base,25,5,[x,y,14],steel);}
   box(base,960,910,22,[300,0,28],pale,6);box(base,949,899,4,[300,0,41],shell,1);
   for(const x of [-145,745])for(const y of [-420,420])bolt(base,[x,y,43]);
   for(const y of [-415,415]){box(base,850,12,1,[300,y,44],pale,.3);for(let i=0;i<=42;i++){box(base,1,i%5===0?10:5,.5,[-110+i*20,y+(i%5===0?0:2.5),44.7],steel,.15);}}
   plaque(base,'EDU 6R  /  ROBOTICS LAB',190,17,[170,-456,31]);
   cylinder(base,103,12,[0,0,51],dark);cylinder(base,91,33,[0,0,72],white);cylinder(base,106,8,[0,0,91],steel);ringBolts(base,[0,0,96],'z',92,8,4);cylinder(base,72,11,[0,0,99],rubber);
   arm=new THREE.Group();scene.add(arm);let parent=arm;
   for(let i=0;i<6;i++){const group=new THREE.Group();group.position.set(...M.offsets[i]);group.userData.joint=i;parent.add(group);joints.push(group);parent=group;const m=blue.clone();m.color.setHex(i===0?0x347cf2:0x66809e);selectedMaterials.push(m);}
   const [j1,j2,j3,j4,j5,j6]=joints;
   cylinder(j1,69,30,[0,0,12],white);torus(j1,69,1.5,[0,0,24],dark);cylinder(j1,65,10,[0,0,31],selectedMaterials[0]);
   for(const y of [-53,53])box(j1,93,23,93,[0,y,75],white,7);
   box(j1,80,84,15,[0,0,41],white,5);for(const y of [-66,66]){cylinder(j1,45,10,[0,y,110],dark,'y');torus(j1,38,2,[0,y-6,110],steel,'y');}
   // Shoulder covers, output bearings and a tapered upper-arm housing.
   cylinder(j2,47,102,[0,0,0],steel,'y');cylinder(j2,53,22,[0,-69,0],white,'y');cylinder(j2,39,5,[0,-82,0],selectedMaterials[1],'y');ringBolts(j2,[0,-86,0],'y',44,8,3);cylinder(j2,34,7,[0,61,0],dark,'y');
   box(j2,89,77,281,[0,0,178],white,13);box(j2,60,4,233,[0,-40,177],shell,1);box(j2,48,4,194,[0,40,177],shell,1);box(j2,33,5,137,[0,-44,179],selectedMaterials[1],1.5);box(j2,68,69,25,[0,0,33],steel,5);box(j2,66,69,25,[0,0,326],steel,5);for(const z of [69,286])for(const x of [-24,24])bolt(j2,[x,-44,z],'y',2.6);
   cylinder(j3,44,98,[0,0,0],steel,'y');cylinder(j3,49,18,[0,-59,0],white,'y');cylinder(j3,35,4,[0,-70,0],selectedMaterials[2],'y');ringBolts(j3,[0,-74,0],'y',41,8,2.8);cylinder(j3,36,7,[0,53,0],dark,'y');
   box(j3,253,67,70,[155,0,0],white,11);box(j3,207,4,43,[158,-35,0],shell,1);box(j3,170,4,35,[160,35,0],shell,1);box(j3,160,5,18,[160,-39,0],selectedMaterials[2],1);box(j3,210,22,6,[161,0,37],pale,1);for(const x of [65,247])for(const z of [-20,20])bolt(j3,[x,-38,z],'y',2.4);cylinder(j3,34,17,[294,0,0],steel,'x');
   // Coaxial wrist J4, a perpendicular J5 and the rotating output flange J6.
   cylinder(j4,34,47,[23.5,0,0],white,'x');cylinder(j4,35,6,[3,0,0],dark,'x');cylinder(j4,33,5,[46,0,0],selectedMaterials[3],'x');ringBolts(j4,[3,0,0],'x',27,6,2.3);torus(j4,34,1,[36,0,0],steel,'x');
   for(const y of [-29,29])box(j4,30,12,55,[54,y,0],white,4);
   cylinder(j5,28,66,[0,0,0],steel,'y');cylinder(j5,31,7,[0,-36,0],white,'y');cylinder(j5,22,4,[0,-42,0],selectedMaterials[4],'y');ringBolts(j5,[0,-45,0],'y',25,6,2);cylinder(j5,26,8,[0,37,0],dark,'y');cylinder(j5,25,49,[37,0,0],white,'x');cylinder(j5,26,6,[63,0,0],steel,'x');
   cylinder(j6,28,10,[-5,0,0],selectedMaterials[5],'x');cylinder(j6,31,5,[2,0,0],steel,'x');ringBolts(j6,[5,0,0],'x',24,6,2);cylinder(j6,22,6,[7,0,0],dark,'x');
   toolRoot=new THREE.Group();toolRoot.rotation.y=Math.PI/2;j6.add(toolRoot);
   gripper=new THREE.Group();toolRoot.add(gripper);cylinder(gripper,23,9,[0,0,16],steel);cylinder(gripper,26,5,[0,0,23],dark);box(gripper,72,49,35,[0,0,43],dark,5);box(gripper,61,4,24,[0,-26,42],blue,1);for(const x of [-24,24])bolt(gripper,[x,-29,42],'y',2.1);for(const y of [-13,13])box(gripper,68,5,6,[0,y,66],steel,1);
   for(const s of [-1,1]){const finger=new THREE.Group();gripper.add(finger);jaws.push(finger);box(finger,17,39,14,[0,0,70],steel,2);box(finger,14,22,57,[0,0,106],dark,2.5);box(finger,6,22,24,[-s*8,0,123],rubber,1);bolt(finger,[0,-13,91],'y',2);}
   probe=new THREE.Group();toolRoot.add(probe);probe.visible=false;cylinder(probe,24,18,[0,0,18],steel);box(probe,72,33,29,[20,0,41],dark,4);box(probe,17,23,55,[45,0,71],white,3);cylinder(probe,13,47,[45,0,120],steel);cylinder(probe,16,6,[45,0,146],selectedMaterials[5]);cylinder(probe,9,21,[45,0,159.5],dark);cylinder(probe,6,2,[45,0,170],steel);ringBolts(probe,[0,0,28],'z',18,4,2);
   tcpObject=new THREE.Group();tcpObject.position.set(...M.tools.gripper.offset);toolRoot.add(tcpObject);const tcpSphere=add(tcpObject,new THREE.SphereGeometry(4,12,8),new THREE.MeshBasicMaterial({color:0x5bc8ce}));tcpSphere.castShadow=false;
   // The RGB vectors are explanatory physical directions, from exactly the FK frames.
   function makeAxes(length,r){const g=new THREE.Group();const arrows=[];for(let i=0;i<3;i++){const dir=new THREE.Vector3(...[i===0?1:0,i===1?1:0,i===2?1:0]);const a=new THREE.ArrowHelper(dir,new THREE.Vector3(),length,[0xe76878,0x36b391,0x4b8cf6][i],10,6);a.line.material.depthTest=false;a.cone.material.depthTest=false;a.line.material.transparent=true;a.line.material.opacity=.85;a.line.renderOrder=20;a.cone.renderOrder=20;g.add(a);arrows.push(a);}g.userData={length,arrows};scene.add(g);return g;}
   axisGizmos=[makeAxes(118),makeAxes(107)];axisGizmos[0].position.set(0,0,0);
   jointRing=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(59,1.5,8,88),new THREE.MeshBasicMaterial({color:0x4f99ff,transparent:true,opacity:.4,depthTest:false}));ring.renderOrder=19;jointRing.add(ring);const jointArrow=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-38),125,0x4f99ff,10,5);jointArrow.line.material.depthTest=false;jointArrow.cone.material.depthTest=false;jointArrow.line.renderOrder=20;jointArrow.cone.renderOrder=20;jointRing.add(jointArrow);scene.add(jointRing);
   trailGeometry=new THREE.BufferGeometry();trailGeometry.setAttribute('position',new THREE.BufferAttribute(trailPositions,3).setUsage(THREE.DynamicDrawUsage));trailGeometry.setDrawRange(0,0);trailLine=new THREE.Line(trailGeometry,new THREE.LineBasicMaterial({color:0x3c9aa7,transparent:true,opacity:.75,depthTest:true}));trailLine.frustumCulled=false;scene.add(trailLine);
   // Two compact locating jigs: the challenge uses reachable FK-derived centres.
   workCell=new THREE.Group();workCell.visible=false;scene.add(workCell);pickPos=M.fk(pickupQ).p;placePos=M.fk(placeQ).p;
   const station=(pos,color,yaw)=>{const m=mat(color,.2,.6),R=M.rot([0,0,1],yaw*M.D);box(workCell,155,144,10,[pos[0],pos[1],49],dark,4);for(const dx of [-57,57])for(const dy of [-52,52])cylinder(workCell,6,52,[pos[0]+dx,pos[1]+dy,80],steel);box(workCell,144,135,8,[pos[0],pos[1],107],white,4);const pad=box(workCell,88,88,1,[pos[0],pos[1],111.5],m,1);pad.rotation.z=yaw*M.D;for(const dx of [-29,29])for(const dy of [-29,29]){const v=M.mv(R,[dx,dy,0]),corner=box(workCell,9,9,8,[pos[0]+v[0],pos[1]+v[1],116],steel,1);corner.rotation.z=yaw*M.D;}};station(pickPos,0x7ea8d9,pickupQ[0]);station(placePos,0x6bbda9,placeQ[0]);
   cube=box(scene,42,42,42,pickPos,mat(0xe3a54e,.35,.38),3);cube.rotation.z=pickupQ[0]*M.D;cube.visible=false;box(cube,24,24,.7,[0,0,21.3],mat(0xf1c679,.25,.5),.2);
   // DOM SVG annotations keep labels crisp at any zoom.
   $('overlay').innerHTML=Array.from({length:6},(_,i)=>`<g class="joint-tag" data-joint-tag="${i}"><rect x="-16" y="-10" width="32" height="20" rx="5"/><text text-anchor="middle" dy="3.5">J${i+1}</text></g>`).join('')+['base','tool'].map(name=>`<g id="label-${name}"><text class="frame-label" id="${name}-caption">${name==='base'?'BASE / 基座':'TOOL / TCP'}</text>${['X','Y','Z'].map((a,i)=>`<text class="axis-label" id="${name}-${a}" fill="${['#df6474','#28a985','#4c8ef6'][i]}">${a}</text>`).join('')}</g>`).join('');
   overlayNodes=$$('[data-joint-tag]');overlayNodes.forEach(g=>g.addEventListener('click',()=>{touch();stop(null,true);setSelected(+g.dataset.jointTag);}));
   if(renderer){new ResizeObserver(resize).observe(viewport);resize();renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();stop(null,true);buildStaticFallback();notice('三维上下文中断，已保留静态模型，请刷新页面。',true);});}
   else{updateCamera();updateGeometry(.04);buildStaticFallback();}
   state.meshCount=meshCount;return !!renderer;
 }
 // A depth-sorted SVG still of the actual posed mesh geometry, for devices without WebGL.
 function buildStaticFallback(){
   scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const faces=[],w=$('viewport').clientWidth,h=$('viewport').clientHeight;
   const light=new THREE.Vector3(-.3,-.45,1).normalize();scene.traverse(mesh=>{
     if(!mesh.isMesh||!mesh.geometry.attributes.position||mesh.material.isShadowMaterial||mesh.material.transparent)return;
     for(let p=mesh;p;p=p.parent)if(!p.visible)return;
     const pos=mesh.geometry.attributes.position,index=mesh.geometry.index,count=index?index.count:pos.count;
     for(let i=0;i<count;i+=3){const points=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld)),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize(),centre=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3);
       if(normal.dot(camera.position.clone().sub(centre))<=0)continue;const projected=points.map(p=>p.clone().project(camera));if(projected.some(p=>p.z< -1||p.z>1))continue;
       const color=(mesh.material.color||new THREE.Color(0xaabbd0)).clone().multiplyScalar(.5+.5*Math.max(0,normal.dot(light))).convertLinearToSRGB();
       faces.push({z:centre.applyMatrix4(camera.matrixWorldInverse).z,svg:`<path fill="#${color.getHexString()}" d="M${projected.map(p=>`${((p.x+1)*w/2).toFixed(1)},${((1-p.y)*h/2).toFixed(1)}`).join('L')}Z"/>`});
     }
   });faces.sort((a,b)=>a.z-b.z);const f=current(),labels=f.joints.map((j,i)=>{const p=project(j.p);return `<g transform="translate(${p[0]+15},${p[1]-10})"><rect x="-12" y="-10" width="27" height="18" rx="4" fill="#edf3fc" stroke="#aabdd5"/><text fill="#24538b" font-size="10" text-anchor="middle" dy="3">J${i+1}</text></g>`;}).join('');
   $('fallback').innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="六轴机械臂静态模型，J1底座、J2肩、J3肘、J4腕转、J5腕摆、J6法兰">${faces.map(f=>f.svg).join('')}${labels}</svg><div><strong>三维加速不可用 · 已显示静态模型</strong><p>使用 Chrome 或 Edge 开启硬件加速后，可操作点动与搬运。轴号说明和使用指南仍可阅读。</p></div>`;$('fallback').hidden=false;
 }
 function resize(){if(!renderer)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;renderer.setSize(w,h);$('overlay').setAttribute('viewBox',`0 0 ${w} ${h}`);updateCamera();requestPaint();}
 function updateCamera(){if(!camera)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;const az=view.az*M.D,el=view.el*M.D;camera.position.set(cameraTarget.x+2200*Math.cos(el)*Math.cos(az),cameraTarget.y+2200*Math.cos(el)*Math.sin(az),cameraTarget.z+2200*Math.sin(el));camera.lookAt(cameraTarget);const fit=matchMedia('(min-width:1000px) and (min-height:650px)').matches;const size=Math.max(w<500?1300:1150,fit?650*w/Math.max(h,1):0)/view.zoom;camera.left=-size/2;camera.right=size/2;camera.top=size*h/w/2;camera.bottom=-size*h/w/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
 function updateGeometry(dt){
   for(let i=0;i<6;i++){joints[i].quaternion.setFromAxisAngle(new THREE.Vector3(...M.axes[i]),state.q[i]*M.D);}
   state.grip+=(Number(state.closed)-state.grip)*(reduced?1:1-Math.exp(-14*dt));const gap=state.holding?32:state.closed?14:43;for(let i=0;i<2;i++){const target=(i===0?-1:1)*gap;jaws[i].position.x+=(target-jaws[i].position.x)*(reduced?1:1-Math.exp(-14*dt));}
   arm.updateMatrixWorld(true);const f=current();axisGizmos[0].visible=state.axes;axisGizmos[1].visible=state.axes;axisGizmos[1].position.set(...f.p);axisGizmos[1].quaternion.copy(toolRoot.getWorldQuaternion(new THREE.Quaternion()));
   const j=f.joints[state.axis],normal=new THREE.Vector3(...j.axis);jointRing.visible=state.frame==='joint';jointRing.position.set(...j.p);jointRing.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);const scales=[1.5,1.03,.95,.72,.65,.62];jointRing.scale.setScalar(scales[state.axis]);
   const tip=f.p;if(state.trail&&(!trailPoints.length||M.norm(M.sub(tip,trailPoints[trailPoints.length-1]))>1.3)){trailPoints.push(tip.slice());if(trailPoints.length>1500)trailPoints.shift();for(let i=0;i<trailPoints.length;i++)trailPositions.set(trailPoints[i],i*3);trailGeometry.attributes.position.needsUpdate=true;trailGeometry.setDrawRange(0,trailPoints.length);}trailLine.visible=state.trail;
   cube.visible=challenge.active||state.activity==='challenge';workCell.visible=cube.visible;
   if(drop){drop.v-=650*dt;cube.position.z+=drop.v*dt;let floor=64;if(Math.hypot(cube.position.x-pickPos[0],cube.position.y-pickPos[1])<60||Math.hypot(cube.position.x-placePos[0],cube.position.y-placePos[1])<60)floor=133;if(cube.position.z<=floor){cube.position.z=floor;drop=null;requestPaint();}}
 }
 function project(pos){const v=new THREE.Vector3(...pos).project(camera);return [(v.x+1)*$('viewport').clientWidth/2,(1-v.y)*$('viewport').clientHeight/2,v.z];}
 function updateOverlay(){
   const f=current(),dark=state.theme==='dark',desk=matchMedia('(min-width:1000px) and (min-height:650px)').matches;for(let i=0;i<6;i++){const p=project(f.joints[i].p),g=overlayNodes[i],selected=state.frame==='joint'&&i===state.axis;g.style.display=state.labels?'':'none';g.setAttribute('transform',`translate(${p[0]+(desk&&i===2?-23:i===4?-31:i===5?28:24)} ${p[1]+(i===3?-27:i===5?21:-17)})`);g.querySelector('rect').setAttribute('fill',selected?'#286bee':dark?'#162237ee':'#ffffffee');g.querySelector('rect').setAttribute('stroke',selected?'#286bee':dark?'#3a506d':'#cddcf0');g.querySelector('text').setAttribute('fill',selected?'white':dark?'#b1c8e6':'#4a6585');}
   const frames=[{key:'base',p:[0,0,0],R:M.I,length:118},{key:'tool',p:f.p,R:f.R,length:107}];
   for(const frame of frames){$('label-'+frame.key).style.display=state.axes?'':'none';for(let i=0;i<3;i++){const vec=[0,0,0];vec[i]=frame.length+13;const p=project(M.add(frame.p,M.mv(frame.R,vec)));const t=$(frame.key+'-'+['X','Y','Z'][i]);t.setAttribute('x',p[0]-3);t.setAttribute('y',p[1]+4);}const p=project(frame.p);const caption=$(frame.key+'-caption');caption.setAttribute('x',p[0]+10);caption.setAttribute('y',p[1]+21);}
 }
 function updateUI(){
   const f=current();['tcpX','tcpY','tcpZ'].forEach((id,i)=>$(id).textContent=(Math.abs(f.p[i])<.05?0:f.p[i]).toFixed(1));const e=M.euler(f.R);$('tcpRPY').textContent=e.map(v=>v.toFixed(1)).join(' / ');
   const vals=state.frame==='joint'?state.q:f.p.concat(e);for(let i=0;i<6;i++){const out=$('jogValue'+i);if(out)out.textContent=state.frame==='joint'?state.q[i].toFixed(1)+'°':i<3?f.p[i].toFixed(1)+' mm':state.frame==='tool'?'绕工具'+['X','Y','Z'][i-3]:'绕基座'+['X','Y','Z'][i-3];const slider=document.querySelector(`[data-slider="${i}"]`);if(slider&&!(slideMotion&&state.axis===i))slider.value=state.q[i];}
   $('motionState').textContent=running?running.name:held?'点动中 · 松开即停':`就绪 · ${state.frame==='joint'?'关节':state.frame==='base'?'基坐标':'工具坐标'}点动`;
   if(state.activity==='challenge')updateChallengeUI();
 }
 function tick(now){
   raf=requestAnimationFrame(tick);const dt=Math.min(.035,(now-(last||now))/1000);last=now;if(document.hidden||!visible)return;
   let moving=false;
   if(held){moving=true;const rate=(state.frame==='joint'||held.axis>=3?32:100)*state.speed;doJog(held.axis,held.dir*rate*dt);}
   if(slideMotion){const s=slideMotion;s.t=Math.min(1,s.t+dt/.22);const t=s.t*s.t*(3-2*s.t);const q=s.from.map((v,i)=>v+(s.to[i]-v)*t);if(!applyQ(q))slideMotion=null;if(s.t>=1)slideMotion=null;moving=true;}
   if(running){moving=true;const r=running;
     if(r.kind==='ptp'){r.time+=dt;const t=Math.min(1,r.time/r.duration),s=t*t*(3-2*t);const q=r.from.map((v,i)=>v+(r.to[i]-v)*s);if(!applyQ(q))stop(null,true);else if(t>=1){running=null;if(r.after)r.after();else notice(r.name+' · 已到达');}}
     else if(r.kind==='axis'){r.time+=dt*state.speed/.25;const duration=reduced?1.6:4.5,t=Math.min(1,r.time/duration),q=r.from.slice();q[r.axis]+=Math.sin(t*2*Math.PI)*14;const issue=M.guard(q,state.tool);if(!issue)applyQ(q);if(t>=1){state.q=r.from.slice();if(r.tour){const next=(r.axis+1)%6;setSelected(next);running={...r,axis:next,time:0,from:state.q.slice(),name:`J${next+1} · ${names[next]}`};}else{running=null;notice('单轴演示完成，已回到演示起点。');}}}
     else if(r.kind==='cart'){const delta=Math.sign(r.total)*Math.min(Math.abs(r.total-r.moved),(r.axis<3?55:18)*state.speed*dt);const oldFrame=state.frame;state.frame=r.frame;const ok=doJog(r.axis,delta);state.frame=oldFrame;if(!ok)stop(null,true);else{r.moved+=delta;if(Math.abs(r.total-r.moved)<.001){running=null;notice(r.name+' · 已完成');}}}
   }
   // Small introductory movement yields on the first interaction; reduced motion stays still.
   if(intro&&!reduced&&performance.now()-lastInput>1800&&performance.now()-lastInput<15000){state.q[0]=M.home[0]+Math.sin((performance.now()-lastInput-1800)/2200)*4;moving=true;}
   if(intro&&performance.now()-lastInput>=15000){intro=false;}
   let cameraMoving=false;for(const k of ['az','el','zoom']){if(Math.abs(viewGoal[k]-view[k])>.001){view[k]+=(viewGoal[k]-view[k])*(reduced?1:1-Math.exp(-10*dt));cameraMoving=true;}}
   const gripping=state.tool==='gripper'&&jaws.some((j,i)=>Math.abs(j.position.x-(i===0?-1:1)*(state.holding?32:state.closed?14:43))>.05);
   if(renderer&&(needsRender||moving||cameraMoving||gripping||drop)){updateGeometry(dt);if(cameraMoving)updateCamera();scene.updateMatrixWorld(true);renderer.render(scene,camera);updateOverlay();needsRender=false;}
   if(needsRender||moving||now-lastUI>150){updateUI();lastUI=now;}
 }
 function setView(name){const views={iso:{az:-52,el:27,zoom:1},front:{az:-90,el:6,zoom:.93},top:{az:-90,el:89,zoom:1},side:{az:0,el:9,zoom:.94}};Object.assign(viewGoal,views[name]);$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));requestPaint();}
 function setTheme(theme){state.theme=theme;document.documentElement.dataset.theme=theme;$$('.theme-picker button').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));if(scene){scene.traverse(o=>{if(o.isHemisphereLight){o.intensity=theme==='dark'?1.9:2.25;o.groundColor.setHex(theme==='dark'?0x27394c:0x536276);}if(o.material&&o.material.isShadowMaterial)o.material.opacity=theme==='dark'?.24:.12;});}try{localStorage.setItem('edu6r-theme',theme);}catch{}requestPaint();}
 function setupEvents(){
   $$('[data-theme]').filter(b=>b.tagName==='BUTTON').forEach(b=>b.onclick=()=>{touch();setTheme(b.dataset.theme);});
   $$('[data-frame]').forEach(b=>b.onclick=()=>switchFrame(b.dataset.frame));
   $$('[data-jog]').forEach(b=>b.onclick=()=>{touch();stop(null,true);state.jogMode=b.dataset.jog;$$('[data-jog]').forEach(x=>x.classList.toggle('active',x===b));$('stepLabel').textContent=state.jogMode==='hold'?'松开即停':state.frame==='joint'?'每次 2°':'每次 5 mm / 2°';});
   $$('[data-activity]').forEach(b=>b.onclick=()=>setActivity(b.dataset.activity));
   $$('[data-view]').forEach(b=>b.onclick=()=>{touch();setView(b.dataset.view);});
   $('speed').oninput=()=>{touch();state.speed=+$('speed').value/100;$('speedReadout').textContent=$('speed').value+'%';};
   $('stop').onclick=()=>{touch();stop('运动已停止，可继续点动。');};
   $('home').onclick=()=>{touch();stop(null,true);if(state.holding){toast('请先放下工件，再复位。');return;}const ok=prepareMotion(M.home,{name:'回到初始姿态',duration:2.2,after:()=>clearTrail()});if(ok)setSelected(0);};
   $('demoJoint').onclick=()=>{if(running){stop('演示已停止');return;}if(state.frame==='joint')startJointDemo(state.axis);else{touch();cartesianAnimation(state.frame,state.axis,state.axis<3?20:8,`${state.frame==='base'?'基坐标':'工具坐标'} ${['X','Y','Z','Rx','Ry','Rz'][state.axis]} 方向演示`);}};
   $('tour').onclick=()=>{if(running&&running.kind==='axis'&&running.tour)stop('巡回演示已停止');else startJointDemo(0,true);};
   for(const [id,key] of [['showAxes','axes'],['showTrail','trail'],['showLabels','labels']])$(id).onclick=()=>{touch();state[key]=!state[key];$(id).classList.toggle('active',state[key]);$(id).setAttribute('aria-pressed',state[key]);requestPaint();};
   $('clearTrail').onclick=()=>{touch();clearTrail();toast('TCP 轨迹已清除');};
   $('tool').onchange=()=>{touch();setTool($('tool').value);};$('grip').onclick=()=>{touch();stop(null,true);setGripper(!state.closed);};
   $('record').onclick=()=>{touch();stop(null,true);if(state.points.length>=16){toast('最多记录 16 个示教点。');return;}state.points.push({q:state.q.slice(),tool:state.tool,closed:state.closed});updatePoints();savePoints();toast('已记录 P'+state.points.length);};
   $('play').onclick=()=>{touch();if(running){stop('回放已停止');return;}if(challenge.active){toast('先结束搬运挑战，再回放示教点。');return;}playback();};
   $('clearPoints').onclick=()=>{touch();stop(null,true);state.points=[];updatePoints();savePoints();};
   for(const [id,frame] of [['compareBase','base'],['compareTool','tool']])$(id).onclick=()=>{touch();if(!compareOrigin||compareOrigin.tool!==state.tool)compareOrigin={q:M.home.slice(),tool:state.tool};switchFrame(frame);setSelected(2);prepareMotion(compareOrigin.q,{name:'回到同一对照起点',duration:1.3,after:()=>{clearTrail();cartesianAnimation(frame,2,40,`${frame==='base'?'基座':'工具'} +Z / 40 mm`);$('compareNote').textContent=frame==='base'?'基座 +Z：向固定底座的正上方移动，保持工具倾斜朝向。':'工具 +Z：沿倾斜工具的出轴方向移动，保持工具倾斜朝向。';}});};
   $('compareReset').onclick=()=>{touch();compareOrigin={q:M.home.slice(),tool:state.tool};prepareMotion(M.home,{name:'重置对照起点',duration:1.5,after:clearTrail});};
   $('rotateTCP').onclick=()=>{touch();switchFrame('tool');setSelected(4);cartesianAnimation('tool',4,12,'保持 TCP 位置 · 绕工具 Y 转 12°');};
   $('challengeStart').onclick=()=>{touch();stop(null,true);if(challenge.active){challenge.active=false;state.holding=false;resetCube();challenge.phase=0;$('challengeStart').textContent='开始挑战';notice('挑战已结束。');}else{setTool('gripper');challenge.active=true;resetCube();$('challengeStart').textContent='结束挑战';assist('pick');}requestPaint();};
   $('approach').onclick=()=>{touch();assist('pick');};$('destination').onclick=()=>{touch();assist('place');};
   $('challengeReset').onclick=()=>{touch();stop(null,true);if(!challenge.active){toast('先开始挑战。');return;}resetCube();notice('工件已回到取料台，夹爪已张开。');};
   for(const id of ['help','about'])$(id).onclick=()=>{touch();stop(null,true);$('helpDialog').showModal();};
   document.querySelector('.dialog-close').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
   const vp=$('viewport');vp.addEventListener('pointerdown',e=>{if(e.target.closest('.joint-tag'))return;touch();held=null;vp.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY,az:viewGoal.az,el:viewGoal.el};vp.setPointerCapture(e.pointerId);});vp.addEventListener('pointermove',e=>{if(!drag)return;viewGoal.az=drag.az-(e.clientX-drag.x)*.35;viewGoal.el=Math.max(5,Math.min(89,drag.el+(e.clientY-drag.y)*.24));$$('[data-view]').forEach(b=>b.classList.remove('active'));requestPaint();});for(const type of ['pointerup','pointercancel','lostpointercapture'])vp.addEventListener(type,()=>drag=null);vp.addEventListener('wheel',e=>{e.preventDefault();touch();viewGoal.zoom=Math.max(.7,Math.min(2.2,viewGoal.zoom*Math.exp(-e.deltaY*.001)));},{passive:false});vp.addEventListener('dblclick',()=>{touch();setView('iso');});
   document.addEventListener('keydown',e=>{if(e.ctrlKey||e.altKey||e.metaKey||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||$('helpDialog').open)return;if(e.code==='Space'){e.preventDefault();touch();stop('运动已停止，可继续点动。');}else if(/^[1-6]$/.test(e.key)){touch();setSelected(+e.key-1);}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();if(e.repeat)return;touch();stop(null,true);const dir=e.key==='ArrowRight'?1:-1;if(state.jogMode==='step')doJog(state.axis,dir*(state.frame==='joint'||state.axis>=3?2:5));else held={axis:state.axis,dir};}});
   document.addEventListener('keyup',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight')held=null;});
   window.addEventListener('blur',()=>{stop(null,true);drag=null;});document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)stop(null,true);else requestPaint();});new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop(null,true);else requestPaint();}).observe($('viewport'));
 }
 $('axisCards').innerHTML=names.map((n,i)=>`<button class="axis-card ${i===0?'active':''}" data-axis-card="${i}"><span>J${i+1}</span><i>${['↻','↷','↷','⟳','↷','⟳'][i]}</i><strong>${n}</strong><p>${['整臂回转','大臂与后续随动','小臂与后续随动','腕部及工具回转','改变工具朝向','带动所装工具'][i]}</p></button>`).join('');
 $$('[data-axis-card]').forEach(b=>b.onclick=()=>{touch();stop(null,true);setSelected(+b.dataset.axisCard);if(state.frame!=='joint')switchFrame('joint');});
 const webgl=buildScene();buildRows();setupEvents();updatePoints();
 try{const theme=localStorage.getItem('edu6r-theme');if(theme==='dark')setTheme('dark');const saved=JSON.parse(localStorage.getItem('edu6r-points-v1')||'[]');if(Array.isArray(saved))state.points=saved.slice(0,16).filter(p=>p&&M.tools[p.tool]&&typeof p.closed==='boolean'&&Array.isArray(p.q)&&p.q.length===6&&!M.guard(p.q,p.tool));updatePoints();}catch{}
 if(!webgl){$$('.jog-button, [data-slider], [data-view], [data-point], #home, #tour, #demoJoint, #grip, #play, #record, #compareBase, #compareTool, #compareReset, #rotateTCP, #challengeStart, #approach, #destination, #challengeReset, #tool, #speed, #showAxes, #showTrail, #showLabels, #clearTrail').forEach(b=>b.disabled=true);intro=false;}
 if(webgl){setSelected(0);updateGeometry(.04);renderer.render(scene,camera);updateOverlay();raf=requestAnimationFrame(tick);}
 window.robotLab={getState:()=>({q:state.q.slice(),frame:state.frame,axis:state.axis,tool:state.tool,closed:state.closed,holding:state.holding,moving:!!(running||held||slideMotion),tcp:current().p,R:current().R,points:state.points.map(p=>({...p,q:p.q.slice()})),challenge:{...challenge},trailCount:trailPoints.length}),diagnostics:()=>({webgl,meshCount:state.meshCount,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,viewport:[$('viewport').clientWidth,$('viewport').clientHeight],canvas:renderer?[renderer.domElement.width,renderer.domElement.height]:null,limits:M.limits}),setJoints:q=>{touch();stop(null,true);const ok=applyQ(q);if(ok)clearTrail();return ok;},jog:(frame,axis,amount)=>{touch();stop(null,true);if(!['joint','base','tool'].includes(frame)||axis<0||axis>5)return false;switchFrame(frame);setSelected(axis);return doJog(axis,amount);},stop:()=>stop(null,true),model:M};
})();
