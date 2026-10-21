import * as k from '../../../../05_主体结构施工/教学演示/assets/anatomy/iso-kit.mjs';
import * as A from '../../../../05_主体结构施工/教学演示/assets/anatomy/audit.mjs';
import {cycle} from './model.mjs';
export function scene(t=0,audit=false){
 const s=cycle(t),floor={x:-275,y:-83,w:550,d:150,r:3};
 const P=k.fitProjection([...k.boxCorners(floor,-17,0),[-240,-45,245],[240,-45,245]],1000,500,{pad:14,azimuth:65,elevation:22});
 const R=A.recorder(P);let n=0;const bounds=[];
 function slab(name,x,y,w,d,z,h,tone='mid',group='',detail=false){
  const plan={x,y,w,d,r:0};let inner='';
  if(detail){inner=k.lineSvg(k.planOutline(k.insetPlan(plan,2),z+h,P),{tone:'faint'})+k.dotsSvg(k.corners(plan,3).map(([a,b])=>k.iso([a,b,z+h],P)),{size:.6,tone:'mid'});}
  R.put({name,at:[x+w/2,y+d/2,z+h/2],attrs:`data-move="${group}"`,svg:k.solidSvg(k.slabOf(plan,z,h,P,1,0),{tone,lit:name==='active.brick',inner}),shapes:[R.solid(A.slab(plan,z,h,{name,ground:name.startsWith('ground')}))]});bounds.push({name,group,lo:[x,y,z],hi:[x+w,y+d,z+h]});n++;
 }
 for(const x of [-253,253])for(const y of [-64,48]){slab('ground.pad'+x+y,x-7,y-7,14,14,-17,2,'lo');slab('foot'+x+y,x-5,y-5,10,10,-15,5,'lo');}
 slab('base',-275,-83,550,150,-10,10,'lo','',true);
 for(const x of [-251,251]){slab('shoe'+x,x-12,-70,24,28,0,6,'mid','',true);slab('column'+x,x-5,-62,10,14,6,136);slab('cap'+x,x-10,-66,20,22,142,6,'mid','',true);}
 slab('bridge',-261,-64,522,18,148,14,'mid','',true);
 for(const z of [149,159])slab('rail'+z,-239,-46,478,3,z,2,'hi');
 for(const x of [-245,239])slab('stop'+x,x,-46,6,7,148,14,'hi','',true);
 slab('motor.mount',-159,-62,25,14,162,3,'mid','',true);
 slab('motor',-157,-60,21,10,165,18);
 slab('motor.cover',-158,-61,23,12,183,2,'hi','',true);
 for(let i=0;i<5;i++)slab('vent'+i,-155+i*4,-59,2,8,185,.3,'lo');
 slab('cabinet',197,-14,34,28,0,40,'mid','',true);slab('cabinet.lid',197,-14,34,28,40,2,'mid','',true);
 for(let i=0;i<3;i++)slab('button'+i,203+i*8,-8,4,5,42,.8,'hi');
 const x=s.x,z=s.z;
 for(const zz of [149,159])slab('bearing'+zz,x-14,-43,28,4,zz,2,'hi','carriage',true);
 slab('carriage',x-16,-39,32,8,146,18,'mid','carriage',true);
 // A flat slide runs along the front surface of its carriage, with no hidden rod copies.
 slab('slide',x-7,-31,14,5,z+28,122,'hi','tool',true);
 for(const xx of [-6,4])slab('rib'+xx,x+xx,-26,2,2,z+28,112,'mid','tool');
 slab('reach',x-7,-26,14,12,z+20,8,'mid','tool',true);
 slab('clamp',x-35,-14,70,28,z+20,4,'hi','tool',true);
 slab('cover',x-18,-10,36,20,z+24,3,'mid','tool',true);
 for(const side of [-1,1]){
  const j=side<0?x-29-s.open:x+26+s.open;
  slab('jaw'+side,j,-10,3,20,z+3,17,'hi',side<0?'jawL':'jawR');
  slab('pad'+side,side<0?j+3:j-2,-10,2,20,z+3,10,'lo',side<0?'jawL':'jawR');
 }
 slab('ruler',-260,51,517,7,0,.5,'lo');
 const ticks=k.topTicks(-255,250,5,5,51,.5,[2,4],P);R.items.at(-1).svg+=k.lineSvg(ticks.minor,{tone:'lo'})+k.lineSvg(ticks.major,{tone:'mid'});
 slab('supply.tray',-221,-17,62,34,0,4,'mid','',true);
 for(const xx of [-222,-160])slab('locator'+xx,xx,-16,1,32,4,9,'hi');
 slab('supply.block',-214,-12,48,24,4,8,'hi');
 slab('wall.tray',50,-17,124,34,0,4,'lo','',true);
 for(let row=0;row<2;row++){
  for(let i=0;i<2;i++)slab('wall.brick'+row+i,75+i*50,-12,48,24,4+row*14,12,'mid');
  slab('mortar'+row,75,-12,98,24,16+row*14,2,'lo');
  slab('head.joint'+row,123,-12,2,24,4+row*14,12,'lo');
 }
 slab('active.brick',s.brickX-24,-12,48,24,s.brickZ,12,'hi','brick');
 A.settle(R,P);if(audit)A.auditOrExit(R,P,{argv:['--audit']});
 R.items.sort((a,b)=>a.key-b.key);
 return {P,n,bounds,R,order:R.items.map(it=>it.name),svg:k.figureSvg({width:1000,height:500,label:'直角坐标砌砖教学台：导轨、升降滑板、夹爪、供砖台与两皮砌体',body:`<path class="iso-halo" d="${k.haloOf(floor,-17,12,P)}"/>`+R.items.map(it=>`<g data-name="${it.name}" ${it.attrs}>${it.svg}</g>`).join('')})};
}
