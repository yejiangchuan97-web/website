import * as k from '../../assets/anatomy/iso-kit.mjs';
import * as A from '../../assets/anatomy/audit.mjs';

export function bladeRing(cx, angle) {
  return [[5,-3],[31,-6],[34,3],[5,3]].map(([x,y])=>[cx+x*Math.cos(angle)-y*Math.sin(angle),x*Math.sin(angle)+y*Math.cos(angle)]);
}
export function scene(kind='level', head=0, angle=0, audit=false, reference=0) {
  const floor={x:-170,y:-100,w:340,d:220,r:5};
  const P=k.fitProjection([...k.boxCorners(floor,-12,0),[-125,-50,170],[120,50,170]],1000,580,{pad:42,azimuth:48,elevation:32});
  const R=A.recorder(P);
  let serial=0;
  function add(name,paths,shape,at,tone='mid',inner='',attrs=''){
    const svg=k.solidSvg(paths,{tone,lit:name==='blade',inner});
    R.put({name,at,svg,attrs,shapes:[R.solid(shape)]});
  }
  function slab(name,x,y,w,d,z,h,tone='mid',detail=false,attrs=''){
    const plan={x,y,w,d,r:Math.min(1.5,w/5,d/5)};
    let inner='';
    if(detail){
      inner+=k.lineSvg(k.planOutline(k.insetPlan(plan,2.5),z+h,P),{tone:'faint'});
      inner+=k.dotsSvg(k.corners(plan,4).map(([x,y])=>k.iso([x,y,z+h],P)),{size:.65,tone:'mid'});
    }
    add(name,k.slabOf(plan,z,h,P,5,.5),A.slab(plan,z,h,{name,ground:name.startsWith('stand.')}),[x+w/2,y+d/2,z+h/2],tone,inner,attrs);
  }
  function cyl(name,x,y,r,z,h,tone='mid',detail=false,attrs=''){
    const inner=detail?k.lineSvg(k.ring(x,y,r-1.3,z+h,P,40),{tone:'faint'})+k.dotsSvg(Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;return k.iso([x+(r-2.8)*Math.cos(a),y+(r-2.8)*Math.sin(a),z+h],P);}),{size:.6}):'';
    add(name,k.cylinder(x,y,r,z,h,P,48,.35),A.cylinder(x,y,r,z,h,{name}),[x,y,z+h/2],tone,inner,attrs);
  }
  function prism(name,ring,z,h,tone='mid',attrs=''){
    add(name,k.extrude(ring,z,h,P,{convex:false}),A.extruded(ring,z,h,{name}),[ring.reduce((s,p)=>s+p[0],0)/ring.length,ring.reduce((s,p)=>s+p[1],0)/ring.length,z+h/2],tone,'',attrs);
  }
  for(const x of [-145,145])for(const y of [-77,97]){
    slab('stand.foot'+serial++,x-7,y-7,14,14,-17,5,'lo');
  }
  slab('stand.tray',-170,-100,340,220,-12,10,'lo',true);
  slab('stand.coupon',-155,-85,310,190,-2,2,'lo');
  slab('ruler',-150,107,300,7,-2,1,'lo');
  const ruler=R.items.at(-1);
  const ticks=k.topTicks(-145,145,5,5,107,-1,[2,4],P);
  ruler.svg+=k.lineSvg(ticks.minor,{tone:'lo'})+k.lineSvg(ticks.major,{tone:'mid'});
  if(kind==='level'){
    const h=1.6*head;
    for(const x of [-119,119]){
      slab('column.shoe'+x,x-12,-55,24,25,0,6,'mid',true);
      slab('column'+x,x-5,-49,10,13,6,119,'mid');
      slab('column.cap'+x,x-8,-51,16,17,125,5,'hi',true);
    }
    slab('crossbeam',-127,-51,254,17,130,12,'mid',true);
    slab('control.box',-25,-58,50,31,142,15,'mid',true);
    slab('control.lid',-25,-58,50,31,157,2,'hi',true);
    for(let i=0;i<6;i++)slab('vent'+i,-18+i*6,-48,3,14,159,.35,'lo');
    for(const x of [-75,75]){
      slab('actuator.mount'+x,x-11,-48,22,11,118,12,'mid',true);
      cyl('actuator.body'+x,x,-42,7,77,41,'mid',true);
      cyl('actuator.gland'+x,x,-42,8,73,4,'hi',true);
      // The single visible rod ends flush at the gland, and meets the head at its lower face.
      cyl('actuator.rod'+x,x,-42,2.6,51+h,22-h,'hi',false,'data-rod="'+x+'"');
      slab('rod.pad'+x,x-7,-49,14,14,47+h,4,'hi',true,'data-head');
    }
    slab('head.backbone',-105,-50,210,16,38+h,9,'hi',true,'data-head');
    for(const x of [-88,88])slab('head.bracket'+x,x-5,-34,10,48,38+h,6,'mid',true,'data-head');
    slab('blade',-109,14,218,6,23+h,21,'hi',false,'data-head');
    slab('wear.strip',-109,20,218,1.5,23+h,4,'hi',false,'data-head');
    for(let i=0;i<8;i++)slab('blade.fastener'+i,-98+i*28,20,2,1.2,39+h,2,'mid',false,'data-head');
    for(const x of [-88,88]){
      slab('mast.foot'+x,x-6,-25,12,12,44+h,4,'mid',true,'data-head');
      slab('mast'+x,x-2.4,-21.4,4.8,4.8,48+h,65,'hi',false,'data-head');
      slab('receiver'+x,x-7,-26,14,14,113+h,26,'hi',true,'data-head');
      slab('receiver.window'+x,x-5,-12,10,1,117+h,18,'lo',false,'data-head');
      for(let i=0;i<3;i++)slab('receiver.segment'+x+'-'+i,x-3,-11,6,.4,120+i*5+h,2,'hi',false,'data-head');
    }
    slab('laser.foot',-159,59,24,24,0,5,'mid',true);
    slab('laser.post',-150,68,6,6,5,112+reference*1.6,'mid');
    slab('laser.body',-158,60,22,22,117+reference*1.6,8,'hi',true,'data-laser');
    slab('laser.window',-158,60,22,22,125+reference*1.6,3,'lo',false,'data-laser');
    slab('laser.cap',-158,60,22,22,128+reference*1.6,3,'mid',true,'data-laser');
  }else{
    for(const cx of [-46,46]){
      for(let n=0;n<4;n++)prism('rotor.blade'+cx+'-'+n,bladeRing(cx,angle*(cx<0?1:-1)+n*Math.PI/2),0,1.2,'hi','data-blade="'+cx+','+n+'"');
      cyl('spider'+cx,cx,0,9,1.2,3.8,'hi',true);
      cyl('shaft'+cx,cx,0,4.5,5,8,'hi');
      cyl('gearbox'+cx,cx,0,13,13,17,'mid',true);
      cyl('motor'+cx,cx,0,11,30,21,'mid');
      cyl('motor.cap'+cx,cx,0,12,51,3,'hi',true);
      // The safety ring is split into sectors so its near and far halves can enclose the rotor.
      for(let n=0;n<12;n++){
        const a=n*Math.PI/6,b=(n+1)*Math.PI/6;
        const ring=[];for(let j=0;j<=6;j++){const t=a+(b-a)*j/6;ring.push([cx+42*Math.cos(t),42*Math.sin(t)]);}
        for(let j=6;j>=0;j--){const t=a+(b-a)*j/6;ring.push([cx+40*Math.cos(t),40*Math.sin(t)]);}
        prism('guard.sector'+cx+'-'+n,ring,7,3,'mid');
      }
      for(const y of [-40,37])slab('guard.strut'+cx+'-'+y,cx-1.5,y,3,3,10,20,'mid');
      for(const x of [cx-40,cx+37])slab('guard.strut'+x,x,-1.5,3,3,10,20,'mid');
      slab('guard.braceY.back'+cx,cx-2,-40,4,29,30,3,'mid');
      slab('guard.braceY.front'+cx,cx-2,11,4,29,30,3,'mid');
      // Two halves meet the gearbox, avoiding a cross through its volume.
      slab('guard.braceX.left'+cx,cx-40,-2,29,4,30,3,'mid');
      slab('guard.braceX.right'+cx,cx+11,-2,29,4,30,3,'mid');
    }
    // Central chassis joins both gearbox shoulders, staying between the motor bodies.
    slab('chassis',-34,-17,68,34,33,5,'mid',true);
    slab('battery',-26,-14,52,28,38,22,'mid',true);
    slab('battery.lid',-26,-14,52,28,60,2,'hi',true);
    for(let i=0;i<6;i++)slab('battery.vent'+i,-19+i*7,-9,3,18,62,.3,'lo');
    slab('control',-16,14,32,9,42,14,'hi',true);
    slab('screen',-12,23,24,.5,46,6,'lo');
    slab('sensor.mast',-3,-4,6,8,62,25,'mid');
    cyl('sensor.body',0,0,9,87,7,'hi',true);
    cyl('sensor.window',0,0,9,94,3,'lo');
    cyl('sensor.cap',0,0,9,97,2,'mid',true);
  }
  A.settle(R,P);
  if(audit)A.auditOrExit(R,P,{argv:['--audit']});
  R.items.sort((a,b)=>a.key-b.key);
  const body=R.items.map((it,i)=>`<g id="${kind}-part-${i}" data-name="${it.name}" ${it.attrs||''}>${it.svg}</g>`).join('');
  return {P,R,body,svg:k.figureSvg({width:1000,height:580,label:kind==='level'?'激光接收器、升降杆、双执行缸与刮板组成的整平头教学台':'双转子抹光机器人，含刀片、齿轮箱、电机、护圈与传感器',body})};
}
