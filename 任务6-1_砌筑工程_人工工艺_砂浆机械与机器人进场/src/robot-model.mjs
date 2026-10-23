/** Pure illustrative kinematics. Millimetres, Z up; brick x/y are centre coordinates. */
export const PHASES = ['供料与接近', '夹紧确认', '垂直提升', '空中转向', '安全搬运', '缓慢落砖', '支承后松夹', '退出与复测'];
export const ROBOT_BRICK = Object.freeze({w:240,d:115,h:53});
export const ROBOT_SOURCE = Object.freeze({x:-430,y:-260,z:74,yaw:0});
export const ROBOT_TARGET = Object.freeze({x:302.5,y:110,z:136,yaw:Math.PI/2});
export const ROBOT_CLEARANCE = 370;
/** Actual displayed two-course wall. Fixed observation section x=-60..680, y=-10..230. */
export function robotWall() {
  const bricks=[];
  // Offset the header course by a quarter of the 250 mm stretcher modulus.
  // The next stretcher course and the new target header then both break joints.
  for(let i=-1;i<7;i++){
    const raw=2.5+i*125,x=Math.max(-60,raw),end=Math.min(680,raw+115);
    if(end>x)bricks.push({id:`wall-header-${i}`,x,y:-10,z:10,w:end-x,d:240,h:53,course:0,section:x!==raw||end!==raw+115});
  }
  for(const [row,y]of [[0,-10],[1,115]])for(let i=0;i<3;i++)bricks.push({id:`wall-stretcher-${row}-${i}`,x:-60+i*250,y,z:73,w:240,d:115,h:53,course:1});
  return {bricks,bottom:bricks.filter(b=>b.course===0),top:bricks.filter(b=>b.course===1),length:740,width:240};
}
const limit=(v,a,b)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const ease=v=>{v=limit(v,0,1);return v*v*(3-2*v);};
const mix=(a,b,t)=>a+(b-a)*t;

/** fault can be false/'none', true/'offset'/'datum', or 'mortar'. Correction is a replay with a corrected target. */
export function robotAt(t, {platform='fixed', fault=false, corrected=false}={}) {
  t=limit(t,0,8);
  const index=Math.min(7,Math.floor(t)),u=ease(t-index),hasFault=!!fault&&fault!=='none';
  const vertical=fault==='mortar',dx=hasFault&&!corrected&&!vertical?18:0,dz=hasFault&&!corrected&&vertical?8:0;
  const actual={...ROBOT_TARGET,x:ROBOT_TARGET.x+dx,z:ROBOT_TARGET.z+dz};
  let x=ROBOT_SOURCE.x,y=ROBOT_SOURCE.y,z=ROBOT_SOURCE.z,yaw=0,open=25,held=false,placed=false;
  // z denotes the bottom of the carried brick and the coincident tool reference.
  if(index===0)z=mix(ROBOT_SOURCE.z+90,ROBOT_SOURCE.z,u);
  if(index===1)open=mix(25,0,u);
  if(index>=2){open=0;held=true;z=ROBOT_CLEARANCE;}
  if(index===2)z=mix(ROBOT_SOURCE.z,ROBOT_CLEARANCE,u);
  if(index===3)yaw=mix(0,ROBOT_TARGET.yaw,u);
  if(index>=4)yaw=ROBOT_TARGET.yaw;
  if(index===4){x=mix(ROBOT_SOURCE.x,actual.x,u);y=mix(ROBOT_SOURCE.y,actual.y,u);}
  if(index>=5){x=actual.x;y=actual.y;}
  if(index===5)z=mix(ROBOT_CLEARANCE,actual.z,u);
  if(index===6){z=actual.z;open=mix(0,25,u);held=false;placed=true;}
  if(index===7){z=mix(actual.z,ROBOT_CLEARANCE,u);open=25;held=false;placed=true;}
  const brick=held?{x,y,z,yaw,held:true,placed:false}:placed?{...actual,held:false,placed:true}:{...ROBOT_SOURCE,held:false,placed:false};
  const measured=index===7;
  const error=Math.hypot(dx,dz);
  return {t,index,phase:PHASES[index],progress:t/8,platform:platform==='mobile'?'mobile':'fixed',fault:hasFault,corrected:!!corrected,
    tool:{x,y,z,yaw,open},brick,target:{...ROBOT_TARGET},actual,error,measured,
    datumRequired:platform==='mobile',safeHeight:ROBOT_CLEARANCE,
    status:measured?(error>0?'偏差待处理':'几何复测完成'):index===6?'已有支承，允许松夹':index===1?'夹紧确认后才能搬运':'按工序执行',
    mortarHeight:10+dz,
    note:measured?(error>0?'预设偏差仍存在：回到基准或铺灰环节处理，再重新取放。':'位置与姿态示例复测完成；灰缝饱满度、垂直度等仍需人工复核。'):
      index===3?'先在安全高度将砖平转90°，使长边沿墙厚方向。':
      index===6?'砖底已经接触灰床；夹爪张开，砖留在墙上。':
      index===4?'先提升到高于墙体的位置，再沿安全路径搬运。':'同一目标同时包含位置和姿态。'};
}
