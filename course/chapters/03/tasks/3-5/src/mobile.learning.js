/* Learning experiments share the displayed mechanism's kinematics. */
(function(root){'use strict';const M=root.MobileModel||require('./mobile.model.js');
const experiments={
 diff:[
  {title:'右轮更快，车头转向哪边？',input:'左轮 +0.12，右轮 +0.36 m/s',command:{left:.12,right:.36},seconds:2.4,options:[['left','向左转'],['forward','直行'],['right','向右转']],explain:'右轮走得更远，车身向较慢的左侧转弯。'},
  {title:'两轮等速反转，车身怎样动？',input:'左轮 −0.20，右轮 +0.20 m/s',command:{left:-.2,right:.2},seconds:2,options:[['side','横向移动'],['spin','原地转身'],['forward','直线前进']],explain:'两轮速度相反，车身中心基本不移动，朝向持续改变。'},
  {title:'两轮一起反转，会发生什么？',input:'左轮 −0.25，右轮 −0.25 m/s',command:{left:-.25,right:-.25},seconds:2,options:[['spin','原地转身'],['forward','前进'],['back','后退']],explain:'同向同速仍保持直线，负轮速使车辆后退。'}
 ],
 car:[
  {title:'停车向左打轮，车身会转吗？',input:'行驶速度 0，前轮左偏 30°',command:{carSpeed:0,steering:30},seconds:1.5,options:[['left','向左转'],['still','车身静止'],['spin','原地自转']],explain:'打轮只改变前轮朝向，必须行驶才能改变车身朝向。'},
  {title:'左打轮后前进，车头怎样偏？',input:'前进 0.30 m/s，前轮左偏 30°',command:{carSpeed:.3,steering:30},seconds:2.4,options:[['left','向左偏转'],['forward','保持朝向'],['right','向右偏转']],explain:'前进时车身沿左弧线移动，内外前轮采用不同转角。'},
  {title:'保持左打轮倒车，车头怎样偏？',input:'后退 0.30 m/s，前轮仍左偏 30°',command:{carSpeed:-.3,steering:30},seconds:2.4,options:[['left','向左偏转'],['right','向右偏转'],['back','朝向不变']],explain:'转角不变而行驶方向反转，车头偏转方向也随之反转。'}
 ],
 mecanum:[
  {title:'只给侧向速度，车头会改变吗？',input:'前向 0，左向 +0.30 m/s，自转 0',command:{vy:.3},seconds:2.4,options:[['left','边走边转'],['side','横移不转头'],['still','保持静止']],explain:'四轮与斜滚子共同实现侧向移动，车头保持不变。'},
  {title:'只给自转速度，会横移吗？',input:'前向和侧向均为 0，自转 +0.45 rad/s',command:{w:.45},seconds:2,options:[['side','横向移动'],['forward','直线前进'],['spin','原地自转']],explain:'四轮组合产生旋转，车身中心基本不移动。'},
  {title:'前向与侧向一起给，走哪条路？',input:'前向 +0.25，左向 +0.25 m/s，自转 0',command:{vx:.25,vy:.25},seconds:2.4,options:[['diagonal','斜向平移'],['left','沿弧线转弯'],['spin','原地自转']],explain:'前向与侧向速度叠加成斜向直线，朝向仍保持不变。'}
 ]};
function classify(start,end){const dx=end.x-start.x,dy=end.y-start.y,x=dx*Math.cos(start.yaw)+dy*Math.sin(start.yaw),y=-dx*Math.sin(start.yaw)+dy*Math.cos(start.yaw),yaw=Math.atan2(Math.sin(end.yaw-start.yaw),Math.cos(end.yaw-start.yaw)),distance=Math.hypot(dx,dy);if(distance<.02)return Math.abs(yaw)<.035?'still':'spin';if(Math.abs(yaw)>.035)return yaw>0?'left':'right';if(Math.abs(x)<.02)return 'side';if(Math.abs(y)> .02)return 'diagonal';return x>0?'forward':'back';}
const terrain={
 track:{title:'追踪一块链板',question:'同一块链板，怎样从上方回到地面？',note:'金色为被追踪链板，青色为接地段。拖动时间轴观察它绕过前后端轮。',timeline:'链板循环',speed:.24,distance:M.trackPoint(0).length,phases:[['上方回程',.18],['前端绕行',.42],['地面接触',.68],['后端绕行',.94]],inspect:'侧看履带',probe:'标记链板',key:'循环接地'},
 legs:{title:'拆看一步的过程',question:'抬起一只脚时，另外几只脚在做什么？',note:'金色足为摆动足，青色足为接地支撑足；地面连线显示当前支撑范围。',timeline:'步态周期',speed:.13,distance:1/1.8,phases:[['右后抬脚',.125],['左后抬脚',.375],['右前抬脚',.625],['左前抬脚',.875]],inspect:'俯看落脚',probe:'支撑范围',key:'交替支撑'},
 rail:{title:'试一试线路约束',question:'同一台车，为什么能前后走却不能横移？',note:'拖动时间轴沿轨道往返；再尝试侧移，比较输入方向与实际位移。',timeline:'线路位置',speed:.35,distance:3.4,phases:[['起点',0],['前行 1 m',1/3.4],['前行 2 m',2/3.4],['终点',1]],inspect:'看轮缘',probe:'尝试侧移',key:'线路导向'}
};
function terrainFrame(type,progress){const c=terrain[type],q=Math.max(0,Math.min(1,progress)),distance=c.distance*q,p={x:2+distance,y:type==='rail'?1:2.5,yaw:0},travel=distance,wheelPhases=Array(4).fill(distance/(type==='rail'?.1:.135)),gait=type==='legs'?(q===1?0:q):0,legTwist={vx:.13,vy:0,w:0},feet=type==='legs'?Array.from({length:4},(_,i)=>M.legPose(i,gait,1,legTwist)):[],marker=M.trackPoint(distance),part=marker.contact?'地面接触段':marker.p[2]>.239?'上方回程段':marker.p[0]>0?'前端绕行段':'后端绕行段';return {progress:q,p,travel,wheelPhases,gait,legTwist,feet,marker,part};}
root.MobileLearning={experiments,terrain,terrainFrame,classify};if(typeof module!=='undefined')module.exports=root.MobileLearning;
})(typeof window==='undefined'?globalThis:window);
