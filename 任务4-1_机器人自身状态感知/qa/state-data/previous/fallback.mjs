import * as k from '../../公共资源/感知与识别/assets/kit/iso-kit.mjs';
import * as G from '../../公共资源/感知与识别/assets/kit/lathe.mjs';
import * as A from '../../公共资源/感知与识别/assets/kit/audit.mjs';
// Static, physically mounted anatomy illustration for browsers without WebGL.
export function robotFallback(){
 const P=k.fitProjection([...k.boxCorners({x:-80,y:-55,w:160,d:110,r:4},0,4),[-65,30,96],[65,30,96]],680,440,{pad:24,azimuth:-48,elevation:40});
 const R=A.recorder(P,{ground:s=>s.name==='base'});
 function slab(name,x,y,z,w,d,h,tone='mid',inner=''){
  const plan={x,y,w,d,r:Math.min(1.3,w/4,d/4)};
  R.put({name,at:[x+w/2,y+d/2,z+h/2],svg:'<g data-sensor="'+name+'">'+k.solidSvg(k.slabOf(plan,z,h,P,6,Math.min(.4,h/4)),{tone,inner})+'</g>',shapes:[R.solid(A.slab(plan,z,h,{name},6))]});
 }
 function disc(name,at,axis,from,to,r,tone='mid',inner=''){
  const F=G.frameAlong(at,axis);R.put({name,at:G.add3(at,G.mul3(axis,(from+to)/2)),svg:'<g data-sensor="'+name+'">'+k.solidSvg(G.disc(from,to,r,F,P),{tone,inner})+'</g>',shapes:[R.solid(A.disc(F,from,to,r,{name}))]});
 }
 slab('base',-80,-55,0,160,110,3,'lo');
 slab('chassis',-64,-28,15,128,56,10,'mid');
 for(const x of [-45,45])for(const sign of [-1,1]){
  const at=[x,0,20],axis=[0,sign,0];
  disc('axle-'+x+'-'+sign,at,axis,28,30,4);
  disc('tyre-'+x+'-'+sign,at,axis,30,45,17,'lo');
  disc('hub-'+x+'-'+sign,at,axis,45,46,10,'hi');
  disc('hubcap-'+x+'-'+sign,at,axis,46,47,3);
 }
 for(const y of [-28,26])slab('side-'+y,-64,y,25,128,2,13);
 for(const x of [-64,62])slab('end-'+x,x,-26,25,2,52,13);
 slab('open-cover',-60,26,38,120,2,54,'lo');
 for(const x of [-53,53])disc('screw-'+x,[x,-27,0],[0,0,1],38,38.7,.8,'hi');
 for(const x of [-43,-3])for(const y of [-15,15])disc('imu-standoff-'+x+'-'+y,[x,y,0],[0,0,1],25,31,1.4);
 slab('imu-board',-48,-20,31,50,40,2,'hi');
 slab('accel',-39,-12,33,11,11,4,'hi');
 slab('gyro',-17,3,33,11,11,4,'hi');
 for(const [x,y]of [[-39,-12],[-17,3]])for(let i=0;i<4;i++){
  slab('pad-'+x+'-'+i+'a',x+i*3,y-2,33,1.5,2,.6,'mid');
  slab('pad-'+x+'-'+i+'b',x+i*3,y+11,33,1.5,2,.6,'mid');
 }
 for(const x of [18,50])for(const y of [-15,15])disc('driver-standoff-'+x+'-'+y,[x,y,0],[0,0,1],25,31,1.4);
 slab('driver-board',14,-20,31,40,40,2,'hi');
 slab('current',25,-13,33,16,6,3,'hi');
 slab('driver-chip',25,0,33,15,13,4,'mid');
 slab('driver-terminal',20,-20,33,26,4,4,'mid');
 disc('encoder-case',[-45,0,20],[0,-1,0],47,48,9,'hi');
 disc('encoder-disc',[-45,0,20],[0,-1,0],48,49,7,'hi');
 slab('encoder-head',-47,-49,29,4,2,3,'hi');
 A.settle(R,P);A.auditOrExit(R,P);
 const body=R.items.slice().sort((a,b)=>a.key-b.key).map(p=>p.svg).join('');
 return k.figureSvg({width:680,height:440,label:'轮式机器人静态剖视示意：机身内有惯性传感器和驱动板，轮轴端有编码器。',body});
}
