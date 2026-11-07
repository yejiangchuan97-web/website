import {G,clamp,sample} from './model.mjs';
// Teaching settings, not specifications or limits for any commercial robot.
export const ENCODER_COUNTS=360, WHEEL_DIAMETER=.16;
export const sensors={
 accel:{number:'01',name:'加速度计',question:'机身有没有倾斜或颠簸？',short:'倾斜 · 颠簸',part:'accel',location:'机身内部的 IMU 板',quantity:'三轴加速度相关示值 · m/s²',description:'固定在机身上的加速度计随机器人一起运动。本页采用比力示值约定，静止平放时z轴约为+9.81m/s²。静止时，三轴读数随安装朝向变化；颠簸时，读数随振动变化。',use:'用于估计静态倾角、观察底盘颠簸，给姿态控制和振动复核提供线索。',limit:'剧烈运动时不能只靠加速度计求倾角；一次尖峰也不能单独证明发生碰撞。',action:'倾斜机身',defaultExperiment:'gravity',modes:[['gravity','倾斜与保持'],['vibration','观察颠簸'],['position','位置会漂移吗？']]},
 gyro:{number:'02',name:'陀螺仪',question:'机身正在转得多快？',short:'转弯 · 转动快慢',part:'gyro',location:'与加速度计同属 IMU',quantity:'三轴角速度 · rad/s',description:'陀螺仪直接测转动快慢。这里让底盘绕竖直轴转过90°，观察本体 z 轴的角速度。',use:'为转向控制和姿态估计提供转速信息；结合初始方向和时间，才能推算转角。',limit:'停转后角速度回到零，不代表朝向回到起点。累计转角还会受到偏置影响。',action:'让底盘转过 90°',defaultExperiment:'rotation',modes:[]},
 encoder:{number:'03',name:'编码器',question:'轮轴已经转了多少？',short:'轴角 · 轮子转数',part:'encoder',location:'驱动轮的轮轴端',quantity:'相对脉冲计数 → 轴角',description:'码盘随轮轴转动，固定读头读取码道变化。教学设置为每转360计数，图中码道作了简化；本例把编码器直接装在轮轴上。',use:'由计数求轮轴角度和转数，再结合轮径估算里程。关节编码器也用类似思路反馈轴角。',limit:'里程还依赖轮径、传动关系和不打滑条件；增量式编码器需要建立零位。',action:'转动轮轴',defaultExperiment:'encoder',modes:[]},
 current:{number:'04',name:'电流检测',question:'驱动电机是否更吃力？',short:'负载变化 · 受阻线索',part:'current',location:'电机驱动板的采样电路',quantity:'电机电流 · A',description:'电流采样电路检测电机回路中的电流。给定相同转速指令，对照空载、阻力增加和受阻三种教学工况。',use:'帮助发现负载变化或运行异常，再结合转速、机构状态和动作记录继续排查。',limit:'电流还受摩擦、加减速和控制方式影响，不能直接换算重量，也不能凭单值确定故障。',action:'改变电机阻力',defaultExperiment:'current',modes:[]}
};
export function encoderAt(angle,zero=0,slip=false){
 const counts=Math.round((angle-zero)/360*ENCODER_COUNTS),relative=counts/ENCODER_COUNTS*360;
 return{counts,angle:relative,turns:relative/360,distance:relative/360*Math.PI*WHEEL_DIAMETER,groundDistance:slip?0:relative/360*Math.PI*WHEEL_DIAMETER};
}
export function currentAt(load=0,t=0){
 const condition=[{name:'空载',amps:.60,rpm:30},{name:'阻力增加',amps:1.20,rpm:30},{name:'受阻',amps:2.40,rpm:0}][clamp(Math.round(load),0,2)];
 return{...condition,angle:t*condition.rpm*6};
}
export function sensorSample(state,t=state.time){
 if(state.sensor==='encoder'){
  const e=encoderAt(state.wheelAngle,state.encoderZero,state.slip);
  return{time:t,tilt:0,yaw:0,omega:0,acc:[0,0,G],norm:G,phase:state.slip?'轮子空转 · 底盘未前进':'轮轴转动 · 纯滚动假设',...e,wheelAngle:state.wheelAngle,position:state.slip?0:state.wheelAngle/360*Math.PI*WHEEL_DIAMETER,velocity:0,vibration:0};
 }
 if(state.sensor==='current'){
  const c=currentAt(state.load,t);
  return{time:t,tilt:0,yaw:0,omega:0,acc:[0,0,G],norm:G,phase:c.name+' · 稳态教学示例',...c,wheelAngle:c.angle,position:0,velocity:c.rpm/60*Math.PI*WHEEL_DIAMETER,vibration:0};
 }
 return sample(state,t);
}
