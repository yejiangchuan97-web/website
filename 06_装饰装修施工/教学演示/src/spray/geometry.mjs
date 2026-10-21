import * as k from '../../assets/anatomy/iso-kit.mjs';
import * as G from '../../assets/anatomy/lathe.mjs';
import * as A from '../../assets/anatomy/audit.mjs';

export function scene({x=0,z=150,distance=300,audit=false}={}){
 const floor={x:-245,y:-103,w:490,d:208,r:5};
 const P=k.fitProjection([...k.boxCorners(floor,-12,0),[-190,-82,316],[190,-82,316]],1050,620,{pad:25,azimuth:64,elevation:20});
 const R=A.recorder(P);let group='static';
 function put(name,paths,shape,at,tone,inner=''){
  R.put({name,at,svg:k.solidSvg(paths,{tone,lit:name==='nozzle',inner}),group,shapes:[R.solid(shape)]});
 }
 function slab(name,a,b,w,d,c,h,tone='mid',detail=false){
  const dx=group==='static'?0:x,dz=group==='head'?z-150:0,dy=group==='static'?0:(distance-300)/10;
  a+=dx;b+=dy;c+=dz;
  const plan={x:a,y:b,w,d,r:Math.min(.8,w/6,d/6)};let inner='';
  if(detail&&w>12&&d>8)inner=k.lineSvg(k.planOutline(k.insetPlan(plan,2),c+h,P),{tone:'faint'})+k.dotsSvg(k.corners(plan,3).map(([u,v])=>k.iso([u,v,c+h],P)),{size:.5});
  put(name,k.slabOf(plan,c,h,P,4,.3),A.slab(plan,c,h,{name,ground:name.startsWith('foot')}),[a+w/2,b+d/2,c+h/2],tone,inner);
 }
 function round(name,at,axis,r,len,tone='mid',detail=true){
  at=[at[0]+(group==='static'?0:x),at[1]+(group==='static'?0:(distance-300)/10),at[2]+(group==='head'?z-150:0)];
  const F=G.frameAlong(at,axis),inner=detail?k.lineSvg(G.circleOf(F,len,r*.64,P,32),{tone:'lo'}):'';
  put(name,G.disc(0,len,r,F,P,{bevel:.2}),A.disc(F,0,len,r,{name}),G.add3(at,G.mul3(axis,len/2)),tone,inner);
 }
 for(const a of [-220,220])for(const b of [-81,81])slab('foot.'+a+'.'+b,a-7,b-7,14,14,-16,4,'lo');
 slab('bench',-245,-103,490,208,-12,12,'lo',true);
 slab('plinth',-183,-86,366,20,0,45,'lo',true);
 slab('wall.left',-180,-82,155,12,45,240,'mid');
 slab('wall.right',55,-82,125,12,45,240,'mid');
 slab('wall.bottom',-25,-82,80,12,45,80,'mid');
 slab('wall.top',-25,-82,80,12,205,80,'mid');
 slab('frame.left',-28,-70,3,2,122,86,'hi');
 slab('frame.right',55,-70,3,2,122,86,'hi');
 slab('frame.bottom',-25,-70,80,2,122,3,'hi');
 slab('frame.top',-25,-70,80,2,205,3,'hi');
 slab('sill',-28,-68,86,6,122,2,'hi');
 slab('ruler',-225,91,450,6,0,.6,'lo');
 const ticks=k.topTicks(-220,220,5,5,91,.6,[2,4],P);R.items.at(-1).svg+=k.lineSvg(ticks.minor,{tone:'lo'})+k.lineSvg(ticks.major,{tone:'mid'});
 group='robot';
 for(const a of [-39,13])for(const b of [-14,43]){
  round('tire.'+a+'.'+b,[a,b,11],[0,1,0],11,7,'lo');
  round('hub.'+a+'.'+b,[a,b+7,11],[0,1,0],6,1,'hi');
  slab('axle.'+a+'.'+b,a-3,b+(b<0?8:-4),6,b<0?3:4,9,6,'mid');
 }
 for(const a of [-39,13])slab('wheel.bridge.'+a,a-4,-3,8,42,12,5,'mid');
 slab('chassis',-48,-3,70,46,17,8,'mid',true);
 slab('shell',-46,-1,66,42,25,15,'hi',true);
 slab('front.bumper',-48,41,70,3,25,6,'lo');
 slab('rear.bumper',-48,-6,70,3,21,6,'lo');
 slab('hatch',-42,31,45,7,40,1,'hi');
 slab('mast.shoe',-29,4,30,17,40,5,'hi',true);
 slab('mast.left',-25,9,6,12,45,260,'mid');
 slab('mast.right',-11,9,6,12,45,260,'mid');
 slab('mast.top',-27,7,24,16,305,4,'hi',true);
 slab('rail.left',-25,21,6,2,49,250,'hi');
 slab('rail.right',-11,21,6,2,49,250,'hi');
 slab('limit.lower',-29,9,4,12,45,4,'lo');
 slab('stop.upper',-25,21,20,4,299,4,'lo');
 slab('controller',-43,0,13,22,40,19,'mid');
 slab('control.face',-43,22,13,1,42,15,'hi');
 slab('screen',-41,23,9,.4,49,6,'lo');
 for(let i=0;i<5;i++)slab('vent.'+i,-42,2+i*3,11,1,59,.3,'lo');
 round('stop.base',[-36,18,59],[0,0,1],2.5,1,'lo');
 round('stop.button',[-36,18,60],[0,0,1],2,2,'hi');
 slab('lidar.platform',4,27,16,14,40,1,'hi');
 round('lidar.mount',[14,34,41],[0,0,1],6,2);
 round('lidar.body',[14,34,43],[0,0,1],6,5,'hi');
 round('lidar.window',[14,34,48],[0,0,1],6,2,'lo');
 round('lidar.cap',[14,34,50],[0,0,1],6,1,'hi');
 group='head';
 for(const a of [-25,-11])for(const c of [141,155])slab('slider.'+a+'.'+c,a,23,6,3,c,5,'hi');
 slab('carriage',-27,26,24,4,141,21,'hi',true);
 slab('tool.bracket',-3,13,9,17,146,8,'mid');
 slab('tool.arm',0,-30,6,43,147,6,'hi');
 slab('valve',-3,-36,12,6,145,10,'hi');
 slab('range.body',6,-30,5,9,149,6,'hi');
 slab('range.window',6,-30.5,5,.5,150,4,'lo');
 round('nozzle.coupler',[3,-36,150],[0,-1,0],3.2,2,'mid');
 round('nozzle',[3,-38,150],[0,-1,0],1.8,2,'hi');
 for(const a of [-2,6])slab('tip.guard.'+a,a,-41,2,5,148,4,'hi');
 A.settle(R,P);
 if(audit)A.auditOrExit(R,P,{argv:['--audit']});
 R.items.sort((a,b)=>a.key-b.key);
 const body=R.items.map(it=>`<g data-name="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
 return {P,R,body};
}
