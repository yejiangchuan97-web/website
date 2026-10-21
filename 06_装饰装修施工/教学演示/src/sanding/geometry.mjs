import * as k from '../../assets/anatomy/iso-kit.mjs';
import * as G from '../../assets/anatomy/lathe.mjs';
import * as A from '../../assets/anatomy/audit.mjs';
export function scene(bump=0,retreat=0,audit=false){
 const floor={x:-150,y:-80,w:300,d:210,r:4};
 const P=k.fitProjection([...k.boxCorners(floor,-12,0),[-128,-45,185],[128,-45,185]],1000,580,{pad:32,azimuth:52,elevation:27});
 const R=A.recorder(P),B=bump*1.5,Q=retreat*1.5,T=Math.max(B,Q-6);let n=0;
 const put=(name,paths,shape,at,attrs='',inner='',lit=false)=>R.put({name,at,attrs,svg:k.solidSvg(paths,{tone:name.startsWith('stand.')?'lo':'mid',lit,inner}),shapes:[R.solid(shape)]});
 function slab(name,x,y,w,d,z,h,details=false,attrs=''){
  const p={x,y,w,d,r:Math.min(1.3,w/5,d/5)};
  const inner=details?k.lineSvg(k.planOutline(k.insetPlan(p,2),z+h,P),{tone:'faint'})+k.dotsSvg(k.corners(p,3).map(([a,b])=>k.iso([a,b,z+h],P)),{size:.6}):'';
  put(name,k.slabOf(p,z,h,P,5,.5),A.slab(p,z,h,{name,ground:name.startsWith('stand.')}),[x+w/2,y+d/2,z+h/2],attrs,inner);
 }
 function round(name,x,y,z,r,length,attrs='',detail=false){
  const F=G.frameAlong([x,y,z],[0,1,0]),profile=[[0,r],[length,r]];
  let inner='';if(detail){const pts=Array.from({length:8},(_,i)=>G.pointOf(F,length,r-2.5,i*Math.PI/4));inner=k.dotsSvg(pts.map(p=>k.iso(p,P)),{size:.65});}
  put(name,G.solidOf(profile,F,P),A.solid(F,profile,{name}),[x,y+length/2,z],attrs,inner,name==='abrasive');
 }
 for(const x of [-129,129])for(const y of [-61,111])slab('stand.foot'+n++,x-7,y-7,14,14,-17,5);
 slab('stand.bench',-150,-80,300,210,-12,12,true);
 for(const x of [-108,108])slab('wall.foot'+x,x-16,-60,32,29,0,6,true);
 slab('wall.panel',-130,-55,260,10,6,179);
 // A local coupon exposes the normal displacement, without pretending to deform the whole wall.
 slab('wall.coupon',-42,-45,84,20+B,67,76,false,'data-coupon');
 for(const x of [-36,34])for(const z of [72,136])slab('wall.clip'+n++,x,-25+B,2,1.5,z,2,false,'data-wall');
 slab('column.foot',-25,83,50,37,0,7,true);
 slab('column',-13,92,26,20,7,139,true);
 slab('column.cap',-16,89,32,26,146,4,true);
 for(const x of [-9,6]){
  slab('height.rail'+x,x,87,3,5,23,112);
  for(const z of [19,135])slab('height.stop'+n++,x-2,85,7,7,z,4);
 }
 slab('height.carriage',-20,77,40,10,80,44,true);
 slab('arm',-17,31,34,46,80,10,true);
 slab('arm.cover',-17,31,34,46,90,2,true);
 for(const x of [-13,10])slab('normal.rail'+x,x,27,3,50,92,3);
 // Side drive block sits clear of the tool's central force-sensing axis.
 for(const x of [-13,10])slab('drive.foot'+x,x,66,3,11,95,23);
 slab('drive.body',-13,66,26,11,118,16,true);
 slab('drive.gland',-8,63,16,3,119,9);
 slab('drive.rod',-2,49+Q,4,14-Q,122,3,false,'data-drive-rod');
 slab('normal.carriage',-17,42+Q,34,7,115,19,true,'data-carriage');
 for(const x of [-17,10])slab('carriage.leg'+x,x,42+Q,7,7,95,20,false,'data-carriage');
 round('sensor',0,35+Q,105,9,7,'data-carriage',true);
 round('sensor.rear',0,42+Q,105,10,2,'data-carriage');
 // One continuous telescoping member; its exposed length follows the measured displacement.
 slab('normal.rod',-2,16+T,4,19+Q-T,103,4,false,'data-normal-rod');
 const y=-25+T;
 round('abrasive',0,y,105,28,1,'data-tool');
 round('backing',0,y+1,105,28,3,'data-tool',true);
 // Full rear shroud contacts the backing disc and motor; a cutaway is an observation aid only.
 round('dust.shroud',0,y+4,105,30,6,'data-tool data-shroud',true);
 round('motor',0,y+10,105,12,20,'data-tool');
 round('motor.cap',0,y+30,105,13,4,'data-tool',true);
 round('tool.collar',0,y+34,105,8,3,'data-tool');
 round('tool.adapter',0,y+37,105,6,4,'data-tool',true);
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;round('dust.port'+i,22*Math.cos(a),y+10,105+22*Math.sin(a),2.2,.7,'data-tool');
 }
 // Service electronics are deliberately on the carriage column, away from the contact patch.
 slab('controller.bracket',13,96,3,10,60,20);
 slab('controller',16,92,29,20,54,37,true);
 slab('controller.lid',16,92,29,20,91,2,true);
 slab('controller.screen',20,112,21,.7,69,15);
 for(let i=0;i<6;i++)slab('vent'+i,20+i*3.7,97,1.8,10,93,.3);
 slab('ruler',-135,115,100,7,0,.8);
 const ticks=k.topTicks(-132,-38,4,5,115,.8,[2,4],P);
 R.items.at(-1).svg+=k.lineSvg(ticks.minor,{tone:'lo'})+k.lineSvg(ticks.major,{tone:'mid'});
 A.settle(R,P);if(audit)A.auditOrExit(R,P,{argv:['--audit']});R.items.sort((a,b)=>a.key-b.key);
 const body=R.items.map((it,i)=>`<g id="part-${i}" data-name="${it.name}" ${it.attrs}>${it.svg}</g>`).join('');
 return {P,R,svg:k.figureSvg({width:1000,height:580,label:'墙面腻子打磨头验证台，单磨盘沿墙法向退让，包含立柱、双导轨、力传感器和集尘护罩',body})};
}
