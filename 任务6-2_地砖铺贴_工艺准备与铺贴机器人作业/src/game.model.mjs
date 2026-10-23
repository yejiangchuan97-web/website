import * as M from './model.mjs';

// Classroom scenarios. No numeric limit below is a construction specification.
export const SOURCE = Object.freeze({x:-.50,z:-.65,y:.10,yaw:0,tilt:0});
export const TARGET = Object.freeze({x:.60,z:.35,y:.14,yaw:0,tilt:0});
export const STAGES = ['grip','align','press'];
const copy = s => structuredClone(s);
const pose = (x=24,y=-18,angle=6) => ({ex:x,ey:y,angle});
const msg = (s,text,kind='info') => {s.message=text;s.kind=kind;return s;};
export function createState(){
 return {stage:'grip',done:{grip:false,align:false,press:false},
  grip:{layout:'single',spread:.6,offsetX:0,offsetY:110,vacuum:60,mass:12,surface:'smooth',isolated:false,failed:0,trial:false,observedFailure:false},
  align:{...pose(),visibility:'clear',needsRecognition:true,running:false,blockedSeen:false,reacquired:false,last:null},
  press:{compression:0,stiffness:80,base:0,targetForce:160,targetCompression:.8,mode:'position',running:false,peakForce:0,damaged:false,settledTime:0,elapsed:0,checked:false,showRuler:false,forceCompared:false},
  tile:{...SOURCE},attached:true,motion:null,time:0,practice:false,
  message:'吸盘偏在砖的一侧。先低位试提，看看砖会怎样。',kind:'info'};
}
export function readings(s){
 const g=M.gripModel({...s.grip,offsetX:-s.grip.offsetX,offsetY:-s.grip.offsetY});
 // Actual frame translation moves the seal lips too, not only the load centroid.
 const fits=p=>Math.abs(p.x+s.grip.offsetX)+p.radius<=300&&Math.abs(p.y+s.grip.offsetY)+p.radius<=300;
 g.fit=g.positions.every(fits);
 if(!g.fit){
  const active=g.positions.filter(p=>p.active&&fits(p));g.positions=g.positions.map(p=>({...p,active:p.active&&fits(p)}));
  g.activeArea=active.length*Math.PI*(g.diameter/2000)**2;
  g.pressure=active.length?(s.grip.isolated?g.pressure:g.pressure*.18):0;g.holding=g.pressure*1000*g.activeArea;g.ratio=g.holding/g.required;g.capacityOK=g.ratio>=1;
 }
 g.ready=g.fit&&g.capacityOK&&g.stable&&g.sealReliable;
 if(!g.fit)g.reason='吸盘越出砖边，密封唇不能完整贴合。把吸盘架移回砖面内，重新试吸。';
 const v=M.visionModel({...s.align,age:s.align.needsRecognition?1:0});
 const p=M.pressModel(s.press);
 const release=s.motion?.kind==='release'?1-M.smooth(s.motion.elapsed/s.motion.duration):0;
 return {grip:g,vision:v,press:p,sensorForce:['rebed','land'].includes(s.motion?.kind)?0:s.attached?p.force:p.force*release};
}
function tileAligned(s){s.tile={x:TARGET.x+s.align.ex/1000,z:TARGET.z+s.align.ey/1000,y:TARGET.y,yaw:s.align.angle,tilt:0};}
function invalidateGrip(s){s.grip.trial=false;s.done.grip=false;}
function invalidateAlignment(s){s.done.align=false;s.align.running=false;}
function preparePress(s){s.press={...s.press,compression:0,running:false,peakForce:0,damaged:false,settledTime:0,elapsed:0,checked:false,showRuler:false};s.done.press=false;s.attached=true;s.tile={...TARGET,y:.016+s.press.base/1000};}
export function act(state,type,value){
 const s=copy(state),r=readings(s);
 if(type==='reset')return createState();
 const stageActions={grip:['gripConfig','center','trial','transfer'],align:['visibility','recognize','slip','nudge','alignRun','alignStep','acceptAlign','toPress'],press:['pressConfig','pressRun','pressStep','rebed','ruler','finish']};
 for(const [stage,actions]of Object.entries(stageActions))if(actions.includes(type)&&s.stage!==stage)return s;
 if(type==='stage'){
  if(!STAGES.includes(value)||s.motion)return s;
  s.align.running=false;s.press.running=false;s.stage=value;s.attached=true;
  if(value==='grip'){s.tile={...SOURCE};s.grip.trial=false;return msg(s,'砖已回到料架。重新试提，检查当前吸盘和气路。');}
  if(value==='align'){s.practice=!s.done.grip;tileAligned(s);s.align.needsRecognition=true;return msg(s,s.practice?'对缝分项练习：已预设一块可靠吸持的砖。先识别砖边。':'砖已移到空位上方。先识别砖边，再对齐砖缝。');}
  s.practice=!s.done.align;s.attached=!s.done.press;s.tile={...TARGET,y:(16+s.press.base-s.press.compression)/1000};return msg(s,s.press.damaged?'本次过压记录仍保留。先揭砖整备，再重新压实。':s.practice?'压实分项练习：预设砖已对正。比较固定压入与力反馈。':'砖已对正。缓慢压入，留意力与完成面高度。');
 }
 if(s.motion)return msg(s,'当前动作正在进行，结束后再调整。');
 if(type==='gripConfig'){
  if(s.stage!=='grip')return s;
  Object.assign(s.grip,value);invalidateGrip(s);s.tile={...SOURCE};
  return msg(s,readings(s).grip.reason);
 }
 if(type==='center'){s.grip.offsetX=0;s.grip.offsetY=0;invalidateGrip(s);return msg(s,'吸盘架已对准砖的中心。还要重新低位试提。');}
 if(type==='trial'){
  if(s.stage!=='grip')return s;
  invalidateGrip(s);s.attached=true;
  s.motion={kind:'trial',elapsed:0,duration:2.6,success:r.grip.ready,unstable:!r.grip.stable,reason:r.grip.reason};
  return msg(s,r.grip.ready?'先离开支承少许，保持并观察吸附。':'低位试提中：观察砖边和真空读数。',r.grip.ready?'info':'warn');
 }
 if(type==='transfer'){
  if(!s.grip.trial||!r.grip.ready)return msg(s,'先完成当前配置的低位试提。','warn');
  s.motion={kind:'transfer',elapsed:0,duration:3.4,from:{...SOURCE},to:{...TARGET,x:TARGET.x+s.align.ex/1000,z:TARGET.z+s.align.ey/1000,yaw:s.align.angle}};
  return msg(s,'保持吸附，抬高并移到铺贴空位上方。');
 }
 if(type==='visibility'){
  if(s.stage!=='align')return s;
  s.align.visibility=value;invalidateAlignment(s);s.align.needsRecognition=true;
  if(value!=='clear'){s.align.blockedSeen=true;return msg(s,'镜头被遮挡，自动纠偏已停止。保留的是旧观测，不是当前砖位。','warn');}
  return msg(s,'视野恢复，但旧结果已失效。点击“重新识别”后再纠偏。');
 }
 if(type==='recognize'){
  if(s.stage!=='align')return s;
  if(s.align.visibility!=='clear')return msg(s,'可见边角不足，不能重新定位。先移开遮挡。','warn');
  s.align.needsRecognition=false;s.align.last=pose(s.align.ex,s.align.ey,s.align.angle);
  if(s.align.blockedSeen)s.align.reacquired=true;
  return msg(s,'已重新识别砖边，位置和转角读数恢复。');
 }
 if(type==='slip'){
  if(s.stage!=='align'||s.align.visibility==='clear')return msg(s,'先遮挡镜头，再施加独立的滑移扰动。');
  s.align.ex+=12;s.align.ey-=7;s.align.angle+=2;invalidateAlignment(s);tileAligned(s);
  return msg(s,'外加扰动使砖滑移了；相机没有看到，旧观测保持不变。','warn');
 }
 if(type==='nudge'){
  if(s.stage!=='align')return s;
  invalidateAlignment(s);s.align.ex=M.clamp(s.align.ex+(value.x||0),-60,60);s.align.ey=M.clamp(s.align.ey+(value.y||0),-60,60);s.align.angle=M.clamp(s.align.angle+(value.angle||0),-15,15);
  if(!s.align.needsRecognition&&s.align.visibility==='clear')s.align.last=pose(s.align.ex,s.align.ey,s.align.angle);
  tileAligned(s);return msg(s,'已点动砖的位置。继续比较两条砖缝和转角。');
 }
 if(type==='alignRun'){
  if(!r.vision.valid)return msg(s,'没有有效实时观测，无法自动纠偏。清除遮挡并重新识别。','warn');
  s.align.running=!s.align.running;return msg(s,s.align.running?'视觉反馈根据实时砖边误差，小步修正 X、Y 和转角。':'已暂停纠偏。');
 }
 if(type==='alignStep'){
  if(!r.vision.valid)return msg(s,'先恢复视野并重新识别。','warn');
  s.align.running=false;const p=M.correctPose(s.align,.45,'clear');Object.assign(s.align,{ex:p.ex,ey:p.ey,angle:p.angle});s.align.last=pose(p.ex,p.ey,p.angle);tileAligned(s);return msg(s,'完成一次视觉纠偏。');
 }
 if(type==='acceptAlign'){
  if(!r.vision.aligned)return msg(s,r.vision.reason,'warn');
  if(!s.align.blockedSeen||!s.align.reacquired)return msg(s,'先体验一次镜头遮挡，再恢复视野、重新识别。','warn');
  s.done.align=true;s.align.running=false;return msg(s,'两条砖缝和转角通过教学窗口，可以进入压实。','success');
 }
 if(type==='toPress'){
  if(!s.done.align)return msg(s,'先完成对缝检查。','warn');
  s.stage='press';s.motion={kind:'land',elapsed:0,duration:1.3,from:{...s.tile},top:(16+s.press.base-s.press.compression)/1000};return msg(s,'保持对缝姿态，缓慢落到铺贴层表面。');
 }
 if(type==='pressConfig'){
  if(!s.attached)return msg(s,'吸盘已卸载。先揭砖整备，再开始新的压实练习。');
  if(s.stage!=='press')return s;
  Object.assign(s.press,value);s.press.checked=false;s.press.showRuler=false;s.press.settledTime=0;s.done.press=false;
  const p=M.pressModel(s.press);s.press.damaged=p.damaged;s.press.peakForce=p.peakForce;
  if(value.mode==='force')s.press.forceCompared=true;
  s.tile.y=(16+s.press.base-s.press.compression)/1000;
  return msg(s,p.damaged?p.reason:'参数已改变。重新观察接触力，再检查砖面高度。',p.damaged?'warn':'info');
 }
 if(type==='pressRun'){
  if(!s.attached)return msg(s,'吸盘已卸载。先揭砖整备，再开始新的压实练习。');
  if(s.stage!=='press')return s;
  if(s.press.damaged)return msg(s,'本次已发生过压，先揭砖整备，不能直接提交。','warn');
  s.press.running=!s.press.running;s.press.checked=false;s.done.press=false;
  return msg(s,s.press.running?(s.press.mode==='force'?'力传感器测量 → 与目标比较 → 调整法向压入速度。':'按设定压入量前进；材料变硬时，力也会变大。'):'已保持当前压入位置。');
 }
 if(type==='pressStep'){
  if(!s.attached)return msg(s,'吸盘已卸载。先揭砖整备，再开始新的压实练习。');
  if(s.stage!=='press')return s;
  s.press.running=false;
  if(s.press.damaged)return msg(s,'先揭砖整备，再重新压实。','warn');
  Object.assign(s.press,M.pressStep(s.press,s.press,.5));s.tile.y=(16+s.press.base-s.press.compression)/1000;s.press.checked=false;s.done.press=false;
  return msg(s,M.pressModel(s.press).reason,s.press.damaged?'warn':'info');
 }
 if(type==='rebed'){
  if(s.stage!=='press')return s;
  s.press.running=false;s.press.checked=false;s.press.showRuler=false;s.done.press=false;s.motion={kind:'rebed',elapsed:0,duration:2.5,from:{...s.tile},fromDetached:!s.attached};s.attached=true;return msg(s,'揭起地砖，重新整备铺贴层，清除本次过压记录。');
 }
 if(type==='ruler'){
  if(s.stage!=='press')return s;
  s.press.running=false;s.press.showRuler=true;s.press.checked=true;
  return msg(s,r.press.heightOK?'靠尺检查：与邻砖的高差在本关窗口内。':'靠尺检查：有高低差。压力合适也不能代替标高检查。',r.press.heightOK?'success':'warn');
 }
 if(type==='finish'){
  if(s.done.press||!s.attached)return msg(s,'这块砖已完成卸载。要重做，请先揭砖整备。');
  if(!r.press.passed)return msg(s,r.press.reason,'warn');
  if(!s.press.checked)return msg(s,'还没有放靠尺检查完成面。','warn');
  s.press.running=false;s.attached=false;s.done.press=true;s.motion={kind:'release',elapsed:0,duration:1.2};
  return msg(s,'砖面与砖缝检查通过，吸盘卸载。粘结与空鼓仍须按工序实体复核。','success');
 }
 return s;
}
export function step(state,dt){
 const s=copy(state);dt=M.clamp(dt,0,.1);s.time+=dt;
 if(s.motion){
  const a=s.motion;a.elapsed+=dt;const t=M.clamp(a.elapsed/a.duration,0,1),u=M.smooth(t);
  if(a.kind==='trial'){
   const lift=t<.25?M.smooth(t/.25):t>.75?M.smooth((1-t)/.25):1;
   const peel=Math.sin(Math.PI*M.clamp((t-.25)/.5,0,1));
   s.tile={...SOURCE,y:SOURCE.y+lift*(a.success?.055:.08),tilt:a.success?0:(a.unstable?4:1)*peel};
   if(t===1){s.grip.trial=a.success;s.done.grip=a.success;s.grip.observedFailure ||= !a.success;s.tile={...SOURCE};s.motion=null;msg(s,a.success?'试提通过：保持吸附稳定，可以移到铺贴位。':a.reason+' 已放回托架，请调整后重试。',a.success?'success':'warn');}
  }else if(a.kind==='transfer'){
   const travel=M.smooth(M.clamp((t-.22)/.56,0,1));s.tile={x:a.from.x+(a.to.x-a.from.x)*travel,z:a.from.z+(a.to.z-a.from.z)*travel,y:t<.25?a.from.y+(.43-a.from.y)*M.smooth(t/.25):t>.78?.43+(.14-.43)*M.smooth((t-.78)/.22):.43,yaw:a.to.yaw*travel,tilt:0};
   if(t===1){s.motion=null;s.stage='align';s.practice=false;s.align.needsRecognition=true;tileAligned(s);msg(s,'已经移到空位上方。先识别砖边，观察位置和转角。');}
  }else if(a.kind==='land'){
   s.tile={...a.from,y:a.from.y+(a.top-a.from.y)*u};
   if(t===1){s.motion=null;msg(s,'已接触铺贴层。缓慢压入，观察接触力和砖面高度。');}
  }else if(a.kind==='release'){
   if(t===1){s.motion=null;msg(s,'吸盘已卸载，砖留在完成面。记录检查结果。','success');}
  }else if(a.kind==='rebed'){
   const liftT=a.fromDetached?M.clamp((t-.2)/.8,0,1):t;s.tile.y=a.from.y+Math.sin(Math.PI*liftT)*.13;
   if(t===1){s.motion=null;s.press.base=0;s.press.stiffness=80;preparePress(s);msg(s,'已整备为标准练习层。选择合适的控制方式，再压实。');}
  }
 }
 if(s.stage==='align'&&s.align.running){
  const v=readings(s).vision;
  if(!v.valid)s.align.running=false;
  else{const p=M.correctPose(s.align,dt);Object.assign(s.align,{ex:p.ex,ey:p.ey,angle:p.angle});s.align.last=pose(p.ex,p.ey,p.angle);tileAligned(s);if(readings(s).vision.aligned){s.align.running=false;msg(s,'砖边已经对齐。接下来完成遮挡实验或提交对缝检查。','success');}}
 }
 if(s.stage==='press'&&s.press.running&&!s.motion){
  Object.assign(s.press,M.pressStep(s.press,s.press,dt));s.tile.y=(16+s.press.base-s.press.compression)/1000;
  const p=readings(s).press;if(p.damaged){s.press.running=false;msg(s,p.reason,'warn');}else if(p.passed){msg(s,'力与标高已稳定。放上靠尺，独立复核砖面高差。','success');}
 }
 return s;
}
export function sceneData(s){const r=readings(s),a=s.motion;let toolLift=s.attached?0:.18;if(a?.kind==='release')toolLift=.18*M.smooth(a.elapsed/a.duration);if(a?.kind==='rebed'&&a.fromDetached)toolLift=.18*(1-M.smooth(a.elapsed/a.duration/.2));return {stage:s.stage,...s.grip,tile:s.tile,peel:a?.kind==='trial'&&!a.success,toolTilt:0,toolLift,attached:s.attached,pressure:r.grip.pressure,gripReady:r.grip.ready,visibility:s.stage==='align'?s.align.visibility:'clear',visionValid:r.vision.valid,force:r.sensorForce,compression:s.press.compression,base:s.press.base,damaged:s.press.damaged,completed:s.done.press,showRuler:s.press.showRuler};}
