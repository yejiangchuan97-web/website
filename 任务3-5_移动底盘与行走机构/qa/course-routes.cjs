/* Reference driving commands for reachability tests; never exposed as a game control. */
const M=require('../src/mobile.model.js'),G=require('../src/mobile.game.js');
function route(index){
 const l=G.levels[index],segments=[];let p={...l.start};
 const add=(command,seconds)=>{const t=l.type==='diff'?M.differential(command.left||0,command.right||0):l.type==='mecanum'?M.mecanum(command.vx||0,command.vy||0,command.w||0):M.ackermann(command.carSpeed||0,(command.steering||0)*Math.PI/180);segments.push({command,seconds,t});p=M.integrate(p,t,seconds);};
 const stop=()=>add({},.75);
 const rotate=yaw=>{const d=Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw));if(Math.abs(d)<1e-8)return;const sign=Math.sign(d);add(l.type==='diff'?{left:-.24*sign,right:.24*sign}:{w:sign},Math.abs(d));};
 const go=(x,y,yaw)=>{const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(l.type==='diff'){rotate(Math.atan2(dy,dx));add({left:.4,right:.4},d/.4);}else if(d>1e-8){add({vx:(dx*Math.cos(p.yaw)+dy*Math.sin(p.yaw))/d*.4,vy:(-dx*Math.sin(p.yaw)+dy*Math.cos(p.yaw))/d*.4},d/.4);}if(yaw!==undefined)rotate(yaw);};
 const car=(metres,steering=0)=>add({carSpeed:Math.sign(metres)*.4,steering},Math.abs(metres)/.4);
 const arc=(angle,steering,reverse=false)=>{const t=M.ackermann(reverse?-.4:.4,steering*Math.PI/180);add({carSpeed:reverse?-.4:.4,steering},Math.abs(angle/t.w));};
 const P=Math.PI,R=.8/Math.tan(35*P/180),cx=2.25+2*R;
 if(index===0){go(3.9,1.3);rotate(P/2);go(3.9,3.6);}
 if(index===1)go(2,3.75);
 if(index===2){car(3.9);arc(P,35);}
 if(index===3){go(1.2,3.65);go(3.65,3.65,-P/2);stop();go(3.65,1.25);go(6.55,1.25,0);}
 if(index===4){go(1.2,3.75);go(3.55,3.75);go(3.55,1.05);go(6.65,1.05);go(6.65,3.85);}
 if(index===5){car(4);arc(P,35);car(2.5);stop();car(-2.5);}
 if(index===6){go(3.2,1);go(3.2,3.8);go(5.7,3.8,-P/2);stop();go(5.7,1.1);go(6.8,1.1,0);}
 if(index===7){go(3.5,1);go(3.5,2.5);go(1.3,2.5);go(1.3,4);go(6.4,4);stop();go(6.4,2.5);}
 if(index===8){car(1.05);arc(P/2,35);arc(P/2,-35);car(6.6-cx);}
 if(index===9){go(1.1,3.75);go(3.45,3.75,-P/2);stop();go(3.45,1.1);go(5.7,1.1);go(5.7,3.75,P);stop();add({left:-.4,right:-.4},1.2/.4);}
 if(index===10){go(3.5,1);go(3.5,3.7,P/2);stop();go(5.5,3.7);go(5.5,1.3);go(6.9,1.3);go(6.9,3.8);}
 if(index===11){car(1);arc(P/2,35);arc(P/2,-35);car(6.65-cx);stop();car(-(6.65-cx));arc(P/2,-35,true);arc(P/2,35,true);stop();car(-1);}
 add({},1.15);return segments;
}
module.exports={route};
