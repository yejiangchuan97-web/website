import * as k from '../../公共资源/anatomy/iso-kit.mjs';
import * as G from '../../公共资源/anatomy/lathe.mjs';
import * as A from '../../公共资源/anatomy/audit.mjs';

/** A sectioned teaching extractor. The front wall is omitted to show bag/filter. */
export function serviceScene(audit=false){
  const P=k.fitProjection([[-80,-55,0],[92,55,0],[-80,-55,192],[92,55,192]],1000,580,{pad:35,azimuth:38,elevation:26});
  const R=A.recorder(P);
  const put=(name,paths,shape,at,component,inner='',tone='mid')=>R.put({name,at,component,svg:k.solidSvg(paths,{tone,inner,lit:component==='filter'}),shapes:[R.solid(shape)]});
  function slab(name,x,y,w,d,z,h,component='',detail=false,tone='mid'){
    const plan={x,y,w,d,r:Math.min(1,w/5,d/5)};
    const inner=detail?k.lineSvg(k.planOutline(k.insetPlan(plan,Math.min(2,w/4,d/4)),z+h,P),{tone:'faint'})+k.dotsSvg(k.corners(plan,Math.min(3,w/3,d/3)).map(([a,b])=>k.iso([a,b,z+h],P)),{size:.55}):'';
    put(name,k.slabOf(plan,z,h,P,5,.4),A.slab(plan,z,h,{name,ground:name.startsWith('stand.')}),[x+w/2,y+d/2,z+h/2],component,inner,tone);
  }
  function round(name,x,y,z,r,length,axis,component='',tone='mid'){
    const F=G.frameAlong([x,y,z],axis),profile=[[0,r],[length,r]],mid=[x+axis[0]*length/2,y+axis[1]*length/2,z+axis[2]*length/2];
    const inner=k.dotsSvg(Array.from({length:8},(_,i)=>k.iso(G.pointOf(F,length,r-2,i*Math.PI/4),P)),{size:.55});
    put(name,G.solidOf(profile,F,P),A.solid(F,profile,{name,ground:name.startsWith('stand.')}),mid,component,inner,tone);
  }
  // Four grounded castors; all vessel walls and internals land on the base.
  for(const x of [-52,52])for(const y of [-32,32])round(`stand.wheel.${x}.${y}`,x,y-5,8,8,10,[0,1,0],'wheels','lo');
  slab('chassis',-70,-46,140,92,16,6,'body',true,'lo');
  slab('tank.floor',-64,-40,128,80,22,4,'body',true);
  slab('tank.left',-64,-40,4,80,26,86,'body');
  slab('tank.right',60,-40,4,80,26,86,'body');
  slab('tank.back',-60,-40,120,4,26,86,'body');
  slab('bag.tray',-54,-30,108,60,26,4,'bag',true,'lo');
  slab('bag.body',-45,-24,90,48,30,42,'bag',true);
  slab('bag.neck.plate',-22,-15,44,30,72,3,'bag',true);
  slab('bag.neck',-13,-10,26,20,75,7,'bag',true);
  // Service coupling on the right wall. Full hose routing is deliberately omitted.
  round('inlet.mount',64,12,56,13,4,[1,0,0],'hose');
  round('inlet.lock',68,12,56,11,7,[1,0,0],'hose');
  round('inlet.coupling',75,12,56,8,13,[1,0,0],'hose','lo');
  // Filter carried by side brackets; pleats end at the two compression rails.
  slab('filter.left.support',-60,-30,6,60,78,8,'filter');
  slab('filter.right.support',54,-30,6,60,78,8,'filter');
  slab('filter.frame.bottom',-60,-30,120,60,86,3,'filter',true);
  for(let i=0;i<12;i++)slab(`filter.pleat.${i}`,-51+i*8,-26,4,52,89,15,'filter');
  // The sectioned front rail is low enough to reveal the pleated medium.
  slab('filter.front.rail',-56,26,112,4,89,3,'filter');
  slab('filter.back.rail',-56,-30,112,4,89,15,'filter');
  slab('filter.left.rail',-60,-30,4,60,89,15,'filter');
  slab('filter.right.rail',56,-30,4,60,89,15,'filter');
  // A filter has an open frame, not a solid lid hiding its filter medium.
  slab('filter.top.left',-60,-30,4,60,104,3,'filter',true);
  slab('filter.top.right',56,-30,4,60,104,3,'filter',true);
  slab('filter.top.back',-56,-30,112,4,104,3,'filter',true);
  slab('filter.top.front',-56,26,112,4,104,3,'filter',true);
  // Raised motor hood sits on the vessel rim, with a discrete switch and vents.
  slab('hood.floor',-64,-40,128,80,112,4,'motor',true);
  slab('hood.left',-64,-40,4,80,116,32,'motor');
  slab('hood.right',60,-40,4,80,116,32,'motor');
  slab('hood.back',-60,-40,120,4,116,32,'motor');
  slab('hood.front',-60,36,120,4,116,32,'motor');
  slab('motor.block',-37,-23,74,46,116,28,'motor',true);
  slab('motor.cap',-39,-25,78,50,144,4,'motor',true);
  slab('hood.lid',-66,-42,132,84,148,5,'motor',true);
  for(let i=0;i<6;i++)slab(`hood.vent.${i}`,-25+i*9,-10,4,20,153,.6,'motor',false,'lo');
  slab('handle.left',-47,-5,6,10,153,22,'handle');
  slab('handle.right',41,-5,6,10,153,22,'handle');
  slab('handle.bar',-47,-5,94,10,175,6,'handle',true,'lo');
  for(const x of [-64,60])for(const z of [72,114])slab(`latch.${x}.${z}`,x,40,4,3,z,15,'latch',true);
  slab('switch.mount',22,40,28,4,124,15,'switch',true);
  slab('switch.button',29,44,14,2,128,7,'switch',false,'lo');
  slab('nameplate',-48,40,35,.6,126,13,'body');
  A.settle(R,P);
  if(audit)A.auditOrExit(R,P,{argv:['--audit']});
  R.items.sort((a,b)=>a.key-b.key);
  const body=R.items.map((it,i)=>`<g id="service-part-${i}" data-name="${it.name}" data-component="${it.component}">${it.svg}</g>`).join('');
  return {P,R,svg:k.figureSvg({width:1000,height:580,label:'工业集尘器教学剖面：前侧观察面打开，显示集尘袋、折叠滤芯、吸尘接口及电机箱；实际作业必须合盖',body})};
}
