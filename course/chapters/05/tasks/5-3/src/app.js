(() => {
 'use strict';const W=Workshop,$=W.$,M=ConcreteModel,B=CourseMachines,T=THREE,stage=new CourseStage($('scene'));W.stage=stage;let state=M.initial(),sceneModel,cutaway=false,continuous=false,tick=0,anim=0,cells=[],vibrator,head,beamMarker,truck,burst=0,burstTotal=1,burstType='',bubbles=[],flow=[];
 function animateAction(type,seconds){burstType=type;burstTotal=seconds;burst=W.reduced?0:seconds;stage.running=continuous||burst>0;}
 const stations=[{id:'pump',label:'泵送与布料'},{id:'vibrate',label:'振捣与覆盖'},{id:'level',label:'整平与标高'}];
 function makeFloor(){const root=new T.Group(),parts=[],children=[];cells=[];B.box(root,9.8,.4,7.8,'navy',1,-.3);for(const z of [-3.8,3.8])B.box(root,9.8,.5,.12,'yellow',1,.1,z);for(const x of [-3.8,5.8])B.box(root,.12,.5,7.8,'yellow',x,.1);
  for(let x=-3.4;x<=5.5;x+=.45)B.beam(root,[x,.05,-3.5],[x,.05,3.5],.018,'steel');for(let z=-3.4;z<=3.4;z+=.45)B.beam(root,[-3.5,.05,z],[5.5,.05,z],.018,'steel');
  for(let i=0;i<9;i++){const row=Math.floor(i/3),col=i%3,x=-2.1+col*3.1,z=-2.4+row*2.4;const cell=B.box(root,2.92,.2,2.22,'concrete',x,.1,z);cell.userData.partId='cell-'+i;cells.push(cell);parts.push({id:'cell-'+i,label:M.label(i)+' 分区',node:cell});}
  truck=B.make('pump');truck.root.scale.setScalar(.62);truck.root.position.set(-6.2,0,-.4);root.add(truck.root);children.push(truck);parts.push({id:'pump-machine',label:'近看双缸泵送',node:truck.parts.find(p=>p.id==='hopper').node});
  vibrator=new T.Group();root.add(vibrator);B.cyl(vibrator,.06,1.1,'steel',0,.3);B.cyl(vibrator,.12,.17,'red',0,.95);B.pipe(vibrator,[[0,1,0],[.3,1.5,.2],[1,1.3,.5]],.045);for(let i=0;i<3;i++){const ring=B.torus(vibrator,.25+i*.18,.018,'green',0,-.17);ring.rotation.x=Math.PI/2;}
  bubbles=[];for(let i=0;i<12;i++){const a=i*2.4;const bubble=B.sphere(vibrator,.035+(i%3)*.012,'white',Math.cos(a)*.4,0,Math.sin(a)*.4);bubbles.push(bubble);}
  flow=[];for(let i=0;i<9;i++)flow.push(B.sphere(root,.07,'blue',0,0,0));
  head=new T.Group();root.add(head);B.box(head,2.8,.16,.25,'blue',0,.1);B.box(head,.28,.55,.28,'white',-1,.44);B.cyl(head,.04,.7,'steel',-1,.9);B.box(head,.18,.17,.08,'red',-1,1.27);for(const x of [-.9,.9])B.cyl(head,.055,.4,'steel',x,.3);B.beam(head,[0,.3,0],[.5,1,-.8],.06,'steel');
  const laser=new T.Group();laser.position.set(5.1,.2,3.3);root.add(laser);for(const z of [-.3,.3])B.beam(laser,[0,1.4,0],[.4,0,z],.03);B.box(laser,.4,.2,.3,'red',0,1.4);beamMarker=B.box(root,9,.015,.035,'red',1,1.6,0);beamMarker.material.transparent=true;beamMarker.material.opacity=.35;
  const model={id:'concrete-floor',root,parts,pose(t){truck.pose(t);},dispose(){children.forEach(m=>m.dispose());const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};return model;
 }
 function build(){continuous=false;burst=0;stage.running=false;if(cutaway){sceneModel=B.make('pump-section');stage.set(sceneModel);}else{sceneModel=makeFloor();stage.set(sceneModel);}updateScene();}
 function updateScene(){const s=state;if(cutaway){sceneModel.pose(anim);stage.render();return;}cells.forEach((cell,i)=>{const fill=s.pumped[i];cell.visible=fill>0;cell.scale.y=.3+fill*.9;const error=s.level[i]??s.surface[i];cell.position.y=.15+(s.level[i]===null?0:error*.004);const color=s.level[i]!==null?(s.level[i]===0?0x76b5a9:0xd6a266):s.vibration[i]>=2?0x9fb6bc:fill>.999?0xb8c3c8:0x8aacc3;cell.material.color.setHex(color);});const cell=cells[s.cell];vibrator.position.set(cell.position.x,s.inserted?.28:1.3,cell.position.z);vibrator.visible=s.station==='vibrate';vibrator.rotation.z=s.inserted?Math.sin(anim*24)*.02:0;
  bubbles.forEach((b,i)=>{b.visible=s.station==='vibrate'&&s.inserted&&burst>0;b.position.y=((anim*1.2+i*.13)%1)*.65-.05;b.scale.setScalar(Math.max(.2,1-s.vibration[s.cell]*.15));});
  flow.forEach((p,i)=>{const u=((anim*.8+i/9)%1);p.visible=s.station==='pump'&&(continuous||burst>0);p.position.set(-4.6+(cell.position.x+4.6)*u,1.5*(1-u)+.25+Math.sin(u*Math.PI)*.3,.4+(cell.position.z-.4)*u);});
  head.visible=s.station==='level';head.position.set(cell.position.x,.4+(s.datum*.004),cell.position.z+(burstType==='level'&&burst>0?(1-burst/burstTotal)*2.1-1.05:0));beamMarker.visible=s.station==='level';beamMarker.position.y=1.6+s.datum*.004;truck.pose(anim);stage.hotspots.forEach(p=>{if(p.id.startsWith('cell-')){const i=Number(p.id.slice(5));p.button.setAttribute('aria-pressed',String(i===s.cell));p.button.textContent=M.label(i)+(s.level[i]!==null?' · 已整平':s.vibration[i]>=2?' · 已振捣':s.pumped[i]>=.999?' · 已布料':' · 待布料');}});stage.render();}
 function dispatch(event){state=M.reduce(state,event);render();updateScene();}
 function render(){const s=state,summary=M.summary(s);W.tabs(stations,s.station,id=>{state=M.reduce(state,{type:'station',value:id});cutaway=false;build();render();});
  const info={pump:['把物料送到指定分区','观察双缸交替和布料覆盖。单步或连续泵送会改变楼面分区状态。'],vibrate:['在布料后逐点观察振捣','先选分区、插入振捣棒、短步观察，再提棒换点。影响范围与气泡是教学示意。'],level:['基准正确，反馈才有意义','改变激光基准，开关反馈，再让刮板经过分区。起伏视觉放大，数据单位为 mm。']}[s.station];W.panel(info[0],info[1],s.scenario);
  if(s.station==='pump'){
   W.row([['pump-step','泵送一个行程',()=>{anim+=.8;dispatch({type:'pump'});animateAction('pump',.9);}],['pump-run',continuous?'暂停连续泵送':'连续泵送',()=>{continuous=!continuous;stage.running=continuous;$('pump-run').textContent=continuous?'暂停连续泵送':'连续泵送';}]]);
   W.button('cutaway',cutaway?'返回楼面全景':'剖开看双缸与切换阀',()=>{cutaway=!cutaway;build();render();});
  }else if(s.station==='vibrate'){
   W.button('insert','放入振捣棒',()=>dispatch({type:'insert'}),{primary:true});W.button('vibrate','短步观察振捣',()=>{anim+=.6;dispatch({type:'vibrate'});if(!state.error)animateAction('vibrate',1.4);});W.button('withdraw','提棒并准备换点',()=>dispatch({type:'withdraw'}));
  }else{
   W.range('datum','案例基准偏移（mm）',-30,30,5,s.datum,value=>{state=M.reduce(state,{type:'datum',value});W.feedback(state.message);updateScene();});
   W.button('feedback-toggle',s.feedback?'标高反馈：已开启':'标高反馈：已关闭',()=>dispatch({type:'feedback',value:!s.feedback}));
   W.button('level','刮板经过当前分区',()=>{anim+=1.2;dispatch({type:'level'});if(!state.error)animateAction('level',1.8);},{primary:true});
  }
  W.select('cell','当前楼面分区',Array.from({length:9},(_,i)=>[String(i),M.label(i)]),String(s.cell),value=>dispatch({type:'cell',value:Number(value)}));
  if(s.station!=='pump')W.button('example','载入当前工位观察示例',()=>dispatch({type:'example'}));
  W.button('reset-work','重新开始三道工序',()=>{state=M.initial();cutaway=false;anim=0;build();render();});
  W.metrics([['设定布料',summary.pumped+' / 9','按分区显示输送结果'],['振捣观察',summary.vibrated+' / 9','不等于实际密实度'],['整平与基准',summary.leveled+' / 9','正确案例基准 '+summary.correct+' 区']]);W.feedback(s.message,s.error);
  W.details(`<div class="summary-box"><b>${M.label(s.cell)} 当前状态</b><br>设定布料 ${Math.round(s.pumped[s.cell]*100)}%<br>振捣观察 ${s.vibration[s.cell]} 步${s.vibration[s.cell]>2?'（重复位置）':''}<br>设计标高 +3.000 m<br>整平后偏差 ${s.level[s.cell]===null?'未整平':s.level[s.cell]+' mm'}<br>基准偏移 ${s.datum} mm</div><div class="legend">蓝：布料　灰：待振捣　绿：案例基准　橙：偏差</div>`);
  $('scene-label').textContent=cutaway?'双缸与切换阀 · 剖面教学模型':'同一楼面 · '+stations.find(x=>x.id===s.station).label;
 }
 stage.onPart=p=>{if(p.id.startsWith('cell-'))dispatch({type:'cell',value:Number(p.id.slice(5))});else if(p.id==='pump-machine'){state.station='pump';cutaway=true;build();render();}else{W.feedback(p.description);stage.focus(p.id);}};
 stage.onTick=(dt)=>{anim+=dt;if(burst>0){burst=Math.max(0,burst-dt);if(burst===0&&!continuous)stage.running=false;}if(continuous){tick+=dt;if(tick>.45){tick=0;state=M.reduce(state,{type:'pump'});if(state.pumped[state.cell]>=.999){const next=state.pumped.findIndex(x=>x<.999);if(next<0){continuous=false;stage.running=false;}else state.cell=next;}render();}}updateScene();};
 window.ConcreteLab={dispatch,state:()=>JSON.parse(JSON.stringify(state)),summary:()=>M.summary(state),stage:()=>({webgl:!!stage.renderer,...stage.stats})};build();render();
})();
