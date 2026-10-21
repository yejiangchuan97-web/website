// SI units; angles in degrees in the teaching UI. All data are illustrative.
export const SG=9.81, RAD=Math.PI/180, LENGTH=8;
export const bounded=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CASES={
 slope:{number:'01',name:'坡面停驻',hint:'倾斜了，数据怎样变？',title:'停在斜面上，为什么还有加速度读数？',lead:'调节坡角，观察倾角与三轴读数。',initial:5,baseline:{tilt:0},baselineName:'平地 0°',phases:[['平地静止',.5],['缓慢倾斜',2],['坡面保持',5]],context:'坡道停靠、作业平台调平',note:'缓慢调坡的准静态示例；忽略调坡过程中的运动加速度。倾角根据含重力三轴示值估计。'},
 drive:{number:'02',name:'起步与制动',hint:'正在前进，加速度一定大吗？',title:'同样在前进，起步、匀速和制动的数据不同。',lead:'从起步看到停车，区分速度和加速度。',initial:2,baseline:{speed:.4},baselineName:'最高速度 0.40 m/s',phases:[['起步',2],['匀速',4],['制动',6],['停稳',7.5]],context:'施工通道行走、靠近作业点停车',note:'匀加速—匀速—匀减速的简化教学过程。速度与位移为模型参照；线加速度表示已去除重力的理想结果。'},
 bump:{number:'03',name:'路面颠簸',hint:'路面起伏，曲线怎样波动？',title:'把路面起伏和加速度波形对上。',lead:'保持同一车速，只改变路面起伏程度。',initial:3.35,baseline:{roughness:1},baselineName:'轻微起伏',phases:[['进入前',1],['进入起伏',2.5],['颠簸中',3.35],['离开后',6.5]],context:'楼板通道、路面接缝附近的行走观察',note:'车速固定0.40 m/s，2–6秒经过起伏段。简化为车体中心随路面垂向运动，未模拟悬架及逐轮受力；垂向位移放大8倍显示，数据不放大。'},
 turn:{number:'04',name:'原地转向',hint:'转得快，转过的角度就大吗？',title:'都转90°，快转和慢转会留下不同曲线。',lead:'对照转动快慢，留意停转后的方向。',initial:2.5,baseline:{turnDuration:4},baselineName:'慢转 4秒',phases:[['转向前',.5],['转向中',2.5],['停转后',6]],context:'施工通道转向、调整作业朝向',note:'角速度用°/s表示转动快慢；转角是从起始方向累计的模型参照。为突出转向关系，忽略偏置和振动。'}
};
export const DEFAULT={case:'slope',time:5,tilt:12,tiltAxis:'pitch',speed:.4,roughness:1,turnDuration:4,gravity:true,compare:false,theme:'light',playing:false,axes:true,rate:1};
export function roadAt(x,roughness=1){
 // C2-continuous envelope over x=-.8..+.8 m. One source for road mesh and motion.
 const u=(x+.8)/1.6;if(u<=0||u>=1||roughness===0)return{height:0,first:0,second:0};
 const a=Math.PI,w=8*Math.PI,s=Math.sin(a*u),c=Math.cos(a*u),E=s**4,Ep=4*a*s**3*c,Epp=4*a*a*(3*s*s*c*c-s**4),A=.004*roughness;
 return{height:A*E*Math.sin(w*u),first:A*(Ep*Math.sin(w*u)+E*w*Math.cos(w*u))/1.6,second:A*((Epp-E*w*w)*Math.sin(w*u)+2*Ep*w*Math.cos(w*u))/1.6**2};
}
export function stateAt(config,t=config.time){
 t=bounded(t,0,LENGTH);let pitch=0,roll=0,yaw=0,omega=0,pos=0,speed=0,ax=0,az=0,z=0,phase='静止',angular=0;
 if(config.case==='slope'){
  const u=bounded((t-1)/2,0,1),angle=config.tilt*u*u*(3-2*u);if(config.tiltAxis==='roll')roll=angle;else pitch=angle;
  angular=(u<=0||u>=1)?0:config.tilt*3*u*(1-u);phase=t<=1?'平地静止':t<3?'缓慢倾斜':'坡面保持';
 }else if(config.case==='drive'){
  const v=config.speed,a=v/2;if(t<1){phase='起步前';}else if(t<3){const q=t-1;ax=a;speed=a*q;pos=.5*a*q*q;phase='起步加速';}else if(t<5){speed=v;pos=v+v*(t-3);phase='匀速前进';}else if(t<7){const q=t-5;ax=-a;speed=v-a*q;pos=3*v+v*q-.5*a*q*q;phase='减速制动';}else{pos=4*v;phase='已停稳';}
 }else if(config.case==='bump'){
  speed=.4;pos=speed*t;const r=roadAt(pos-1.6,config.roughness);z=r.height;az=r.second*speed**2;phase=config.roughness===0?'平整路面':t<2?'进入起伏段前':t>6?'离开起伏段':'通过起伏段';
 }else if(config.case==='turn'){
  const u=bounded((t-1)/config.turnDuration,0,1);yaw=90*u*u*(3-2*u);omega=(u<=0||u>=1)?0:90/config.turnDuration*6*u*(1-u);phase=t<=1?'转向前':u<1?'正在转向':'停转并保持';
 }
 const raw=[ax+SG*Math.sin(pitch*RAD),SG*Math.sin(roll*RAD),az+SG*Math.cos(pitch*RAD)*Math.cos(roll*RAD)];
 const linear=[ax,0,az],acc=config.gravity?raw:linear;
 return{t,pitch,roll,yaw,omega,angular,pos,speed,ax,az,z,raw,linear,acc,tilt:Math.atan2(config.tiltAxis==='roll'?raw[1]:raw[0],raw[2])/RAD,phase};
}
export function stateTrace(config){return Array.from({length:801},(_,i)=>stateAt(config,i/100));}
export function baselineFor(config){return{...config,...CASES[config.case].baseline};}
export function dataSpecs(config){
 if(config.case==='slope')return[{key:'tilt',label:'静态估计倾角',unit:'°',color:'#d18a24',domain:[-22,22],value:s=>s.tilt},{key:'acc',label:config.gravity?'三轴加速度 · 含重力':'三轴线加速度 · 理想去重力',unit:'m/s²',domain:[-11,11],axes:true},{key:'angular',label:'姿态角变化率 · 模型参照',unit:'°/s',color:'#268f88',domain:[-18,18],value:s=>s.angular}];
 if(config.case==='drive')return[{key:'ax',label:'前向线加速度',unit:'m/s²',color:'#2677ce',domain:[-.5,.5],value:s=>s.ax},{key:'speed',label:'行走速度 · 模型参照',unit:'m/s',color:'#268f88',domain:[0,.9],value:s=>s.speed},{key:'pos',label:'沿路线位移 · 模型参照',unit:'m',color:'#d18a24',domain:[0,3.5],value:s=>s.pos}];
 if(config.case==='bump')return[{key:'accz',label:config.gravity?'垂向加速度 · 含重力':'垂向线加速度 · 理想去重力',unit:'m/s²',color:'#8b68bb',domain:config.gravity?[9.3,10.3]:[-.5,.5],value:s=>s.acc[2]},{key:'z',label:'垂向位移 · 模型参照',unit:'mm',color:'#d18a24',domain:[-9,9],value:s=>s.z*1000},{key:'acc',label:'三轴加速度对照',unit:'m/s²',axes:true,domain:config.gravity?[-.5,10.5]:[-.5,.5]}];
 return[{key:'omega',label:'转向角速度',unit:'°/s',color:'#268f88',domain:[0,150],value:s=>s.omega},{key:'yaw',label:'累计转角 · 模型参照',unit:'°',color:'#d18a24',domain:[0,100],value:s=>s.yaw},{key:'acc',label:config.gravity?'三轴加速度 · 含重力':'三轴线加速度 · 理想去重力',unit:'m/s²',domain:[-1,11],axes:true}];
}
