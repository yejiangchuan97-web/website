import * as k from "../../公共资源/anatomy/iso-kit.mjs";
import * as G from "../../公共资源/anatomy/lathe.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";

export function buildGeometry(){
 const P=k.fitProjection([[-123,-86,-16],[123,90,0],[-85,-68,130],[85,-68,130]],820,590,{pad:42,azimuth:40,elevation:28});
 const R=A.recorder(P);let count=0;
 const at=p=>k.iso(p,P),L=(d,tone='lo')=>k.lineSvg(d,{tone});
 function put(name,paths,shape,centre,tone='mid',inner='',part='frame'){
  R.put({name,piece:'fixed',at:centre,svg:`<g data-component="${part}">${k.solidSvg(paths,{tone,inner})}</g>`,shapes:[R.solid(shape)]});count++;
 }
 function slab(name,x,y,w,d,z,h,tone='mid',part='frame',detail=true){
  const plan={x,y,w,d,r:Math.min(2,w/5,d/5)};
  let inner='';if(detail&&w>18&&d>12){inner+=L(k.planOutline(k.insetPlan(plan,3),z+h,P),'faint');inner+=k.dotsSvg(k.corners(plan,5).map(([a,b])=>at([a,b,z+h])),{size:.65});}
  put(name,k.slabOf(plan,z,h,P,5,.6),A.slab(plan,z,h,{name},5),[x+w/2,y+d/2,z+h/2],tone,inner,part);
 }
 function round(name,o,axis,s0,s1,r,tone='mid',part='frame',ribs=false){
  const F=G.frameAlong(o,axis);let inner='';
  if(ribs){const lines=G.ribsOf(F,s0,s1,r,part==='bars'?2:20,P,{seams:true});inner=typeof lines==='string'?L(lines,'lo'):'';if(part==='bars'){for(let s=s0+4;s<s1-2;s+=6)inner+=L(G.arcOf(F,s,r,P),'lo');}}
  put(name,G.disc(s0,s1,r,F,P),A.disc(F,s0,s1,r,{name}),G.add3(o,G.mul3(axis,(s0+s1)/2)),tone,inner,part);
 }
 for(const x of[-99,99])for(const y of[-64,68]){slab('stand.pad'+x+y,x-8,y-8,16,16,-16,4,'lo');slab('stand.foot'+x+y,x-6,y-6,12,12,-12,6,'lo');}
 slab('stand.plate',-120,-84,240,174,-6,6,'lo');
 slab('stand.label',55,65,42,13,0,.8,'lo');
 for(const x of[-83,73]){slab('frame.shoe'+x,x-6,-73,22,22,0,5);slab('frame.post'+x,x,-67,10,10,5,115);slab('frame.cap'+x,x-2,-69,14,14,128,3);}
 slab('frame.beam',-85,-69,172,14,120,8);
 slab('frame.hanger',-10,-62,20,17,107,13);
 slab('head.arm',-10,-55,20,29,99,8,'mid','head');
 slab('head.case',-27,-26,54,40,89,28,'hi','head');
 slab('head.cover',-28,-27,56,42,117,3,'hi','head');
 for(let i=0;i<6;i++)slab('head.vent'+i,-19+i*7,-18,3,20,120,.2,'lo','head',false);
 slab('head.lower',-20,-20,40,30,83,6,'mid','head');
 for(const x of[-16,16]){round('head.guide'+x,[x,0,0],[0,0,1],79,83,3,'mid','head');round('head.collar'+x,[x,0,0],[0,0,1],77,79,4,'mid','head');}
 slab('feed.base',-67,-38,33,36,90,5,'mid','feed');
 slab('feed.bracket',-67,-38,8,12,0,90,'mid','feed');
 for(const x of[-57,-42]){round('feed.roller'+x,[x,-20,0],[0,0,1],95,101,7,'hi','feed',true);round('feed.axle'+x,[x,-20,0],[0,0,1],101,103,2,'mid','feed');}
 slab('spool.stand',-105,-29,11,18,0,48,'mid','spool');
 round('spool.axle',[-99,-20,48],[0,0,1],0,5,6,'mid','spool');
 round('spool.bottom',[-99,-20,48],[0,0,1],5,8,19,'hi','spool');
 round('spool.core',[-99,-20,48],[0,0,1],8,24,15,'mid','spool',true);
 round('spool.top',[-99,-20,48],[0,0,1],24,27,19,'hi','spool');
 round('spool.cap',[-99,-20,48],[0,0,1],27,30,4,'mid','spool');
 for(const x of[-82,82])slab('bar.supportx'+x,x-5,-11,10,22,0,36,'lo','bars');
 for(const y of[-57,69])slab('bar.supporty'+y,-11,y-5,22,10,0,48,'lo','bars');
 round('bar.lower',[0,0,42],[1,0,0],-104,104,6,'hi','bars',true);
 round('bar.upper',[0,0,54],[0,1,0],-72,88,6,'hi','bars',true);
 // The C-shaped guide is a concave prism, with an actual open top and no hidden wireframe edges.
 const q=Math.SQRT1_2,F={o:[0,0,48],a:[q,q,0],u:[q,-q,0],v:[0,0,1]};
 // Split the wrapping guide into real angular pieces so both steel bars can occlude it correctly.
 for(let j=0;j<16;j++){
  const poly=[],a0=115+310*j/16,a1=115+310*(j+1)/16;
  for(let i=0;i<=8;i++){const a=(a0+(a1-a0)*i/8)*Math.PI/180;poly.push([35*Math.cos(a),35*Math.sin(a)]);}
  for(let i=8;i>=0;i--){const a=(a0+(a1-a0)*i/8)*Math.PI/180;poly.push([31*Math.cos(a),31*Math.sin(a)]);}
  const a=(a0+a1)/2*Math.PI/180,name='guide.arc'+j;
  put(name,G.prismOf(F,poly,-2.5,2.5,P),A.prism(F,poly,-2.5,2.5,{name}),[q*33*Math.cos(a),-q*33*Math.cos(a),48+33*Math.sin(a)],'hi','','guide');
 }
 slab('guide.foot',-4,-4,8,8,0,13,'mid','guide',false);
 // Two nozzle tips and cutting station are mounted on the underside of the head.
 slab('head.nozzleL',-12,-20,6,6,77,6,'hi','head',false);
 slab('head.nozzleR',6,-20,6,6,79,4,'hi','head',false);
 slab('head.cutter',-3,-19,6,6,78,5,'hi','head',false);
 slab('head.blade',-2,-19,4,2,75,3,'hi','head',false);
 // Four rail fastening plates and their face details.
 for(const x of[-83,73])for(const z of[15,103])slab('frame.fastener'+x+z,x,-68,10,1,z,9,'mid','frame',false);
 A.settle(R,P);R.items.sort((a,b)=>a.key-b.key);
 A.auditOrExit(R,P);
 const halo=`<path class="iso-halo" d="${k.haloOf({x:-120,y:-84,w:240,d:174,r:5},-16,8,P)}"/>`;
 return {svg:k.figureSvg({width:820,height:590,label:'绑扎头固定剖视教学台：供丝盘、送丝轮、驱动壳体、弧形导向槽与上下相切的交叉钢筋',body:halo+R.items.map(i=>i.svg).join('')}),parts:count,P};
}
