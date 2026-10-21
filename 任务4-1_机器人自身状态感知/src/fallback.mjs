import * as k from '../../公共资源/感知与识别/assets/kit/iso-kit.mjs';
import * as G from '../../公共资源/感知与识别/assets/kit/lathe.mjs';
import * as A from '../../公共资源/感知与识别/assets/kit/audit.mjs';
// Static, physically mounted anatomy illustration for browsers without WebGL.
export function robotFallback(){
 const P=k.fitProjection([...k.boxCorners({x:-80,y:-55,w:160,d:110,r:4},0,4),[-65,30,48],[65,30,48]],680,440,{pad:24,azimuth:-48,elevation:32});
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
  for(let i=0;i<6;i++){const a=i*Math.PI/3;disc('wheel-bolt-'+x+'-'+sign+'-'+i,[x+6*Math.cos(a),0,20+6*Math.sin(a)],axis,46,47,.8,'hi');}
 }
 slab('closed-body',-64,-28,25,128,56,20,'hi');
 slab('cover-seam',-60,-24,45,120,48,1,'lo');
 slab('closed-cover',-59,-23,46,118,46,1,'hi');
 for(const x of [-53,53])for(const y of [-18,18])disc('cover-screw-'+x+'-'+y,[x,y,0],[0,0,1],47,47.7,.8,'mid');
 slab('direction-stripe',-30,-2,47,60,4,.2,'lo');
 for(const x of [-67,64])slab('bumper-'+x,x,-24,19,3,48,6,'lo');
 for(let i=0;i<7;i++)slab('road-tick-'+i,-65+i*20,-53,3,1,5,.15,'hi');
 A.settle(R,P);A.auditOrExit(R,P);
 const body=R.items.slice().sort((a,b)=>a.key-b.key).map(p=>p.svg).join('');
 return k.figureSvg({width:680,height:440,label:'轮式机器人与道路的静态兼容示意，运动状态以同步读数和曲线为准。',body});
}
