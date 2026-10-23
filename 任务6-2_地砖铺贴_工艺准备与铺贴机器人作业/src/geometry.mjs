import * as k from "../../公共资源/anatomy/iso-kit.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
export function scene({x=25,y=30,top=40,tileX=x,tileY=y,tileTop=top,bed=4,layout='quad',audit=false}={}){
 layout=({1:'single',2:'dual',4:'quad',double:'dual',four:'quad'})[layout]||layout;
 if(!['single','dual','quad'].includes(layout))throw new Error('Unknown cup layout: '+layout);
 const floor={x:-166,y:-90,w:332,d:184,r:4};
 const P=k.fitProjection([...k.boxCorners(floor,-16,0),[-143,-62,134],[143,-62,134]],1000,580,{pad:38,azimuth:42,elevation:32});
 const R=A.recorder(P);let n=0;
 function put(name,paths,shape,at,tone,inner='',group='static'){
  R.put({name,at,svg:k.solidSvg(paths,{tone,lit:name==='tile.active',inner}),shapes:[R.solid(shape)],group});
 }
 function box(name,x,y,w,d,z,h,tone='mid',detail=false,group='static'){
  const p={x,y,w,d,r:Math.min(1,w/6,d/6)};let inner='';
  if(detail){inner=k.lineSvg(k.planOutline(k.insetPlan(p,2),z+h,P),{tone:'faint'});inner+=k.dotsSvg(k.corners(p,3).map(([a,b])=>k.iso([a,b,z+h],P)),{size:.55,tone:'hi'});}
  put(name,k.slabOf(p,z,h,P,4,Math.min(.55,h/3)),A.slab(p,z,h,{name,ground:name.startsWith('floor.')}),[x+w/2,y+d/2,z+h/2],tone,inner,group);
 }
 function cyl(name,x,y,r,z,h,tone='mid',group='head'){
  put(name,k.cylinder(x,y,r,z,h,P,48,.25),A.cylinder(x,y,r,z,h,{name}),[x,y,z+h/2],tone,k.lineSvg(k.ring(x,y,Math.max(.3,r-.8),z+h,P,48),{tone:'faint'}),group);
 }
 for(const a of [-145,145])for(const b of [-69,73])box('floor.foot'+n++,a-7,b-7,14,14,-16,5,'lo');
 box('floor.base',-166,-90,332,184,-11,9,'lo',true);
 box('floor.surface',-159,-83,318,170,-2,2,'lo');
 box('ruler',-150,78,300,6,0,1,'lo');
 const ticks=k.topTicks(-145,145,5,5,78,1,[2,4],P);R.items.at(-1).svg+=k.lineSvg(ticks.minor,{tone:'lo'})+k.lineSvg(ticks.major,{tone:'mid'});
 box('pallet',-129,-9,78,78,0,4,'mid',true);
 for(let i=0;i<2;i++)box('supply.tile'+i,-125,-5,70,70,4+i*4,4,'mid');
 box('neighbor.a',64,-5,70,70,0,8,'mid',true);
 box('neighbor.b',-10,-79,70,70,0,8,'mid',true);
 box('adhesive',-10,-5,70,70,0,bed,'lo');
 for(const a of [-143,143]){
  box('column.foot'+a,a-12,-74,24,24,0,6,'mid',true);
  box('column'+a,a-5,-67,10,10,6,110,'mid');
  box('column.cap'+a,a-9,-71,18,18,116,4,'hi',true);
 }
 box('beam',-152,-71,304,18,120,10,'mid',true);
 for(const b of [-68,-58])box('rail'+b,-141,b,282,3,130,3,'hi');
 for(const a of [-149,145])box('stop'+a,a,-71,4,18,130,8,'mid');
 box('motor',-136,-69,26,14,133,16,'mid',true);box('motor.cap',-136,-69,26,14,149,2,'hi',true);
 for(let i=0;i<6;i++)box('motor.slot'+i,-132+i*3.5,-66,1.4,8,151,.3,'lo');
 // Cart rides on the two exposed rails; its cantilever reaches the tile centre.
 for(const a of [-12,7])for(const b of [-68,-58])box('bearing'+a+b,x+a,b,5,3,133,3,'hi',false,'cart');
 box('carriage',x-17,-72,34,20,136,5,'hi',true,'cart');
 box('arm',x-8,-52,16,96,136,5,'mid',false,'cart');
 box('arm.cap',x-8,y-4,16,17,141,4,'hi',true,'yslide');
 box('z.housing',x-7,y-3,14,14,83,53,'mid',false,'yslide');
 box('z.cover',x-8,y-4,16,16,80,3,'hi',true,'yslide');
 box('z.rod',x-3,y,6,6,top+25,55-top,'hi',false,'rod');
 box('head.mount',x-9,y-6,18,18,top+21,4,'hi',true,'head');
 box('force.sensor',x-7,y-4,14,14,top+17,4,'lo',false,'head');
 box('manifold',x-12,y-8,24,22,top+13,4,'hi',true,'head');
 if(layout==='single'){
  // A centre stem seats directly against the manifold. Equal effective area:
  // radius ratios 2 : sqrt(2) : 1 for one, two and four cups respectively.
  cyl('cup.lip0',x,y,17,top,1.5,'lo');
  cyl('cup.neck0',x,y,12,top+1.5,3,'mid');
  cyl('cup.stem0',x,y,4,top+4.5,8.5,'hi');
 }else for(const a of [-20,20]){
  box('crossbar'+a,x+(a<0?-20:12),y-4,8,8,top+13,4,'mid',false,'head');
  box('cupbeam'+a,x+a-4,y-(layout==='quad'?25:4),8,layout==='quad'?50:8,top+9,4,'mid',false,'head');
  const radiusScale=layout==='dual'?Math.SQRT2:1;
  for(const b of layout==='quad'?[-21,21]:[0]){
   cyl('cup.lip'+a+b,x+a,y+b,8.5*radiusScale,top,1.5,'lo');
   cyl('cup.neck'+a+b,x+a,y+b,6*radiusScale,top+1.5,3,'mid');
   cyl('cup.stem'+a+b,x+a,y+b,2*radiusScale,top+4.5,4.5,'hi');
  }
 }
 box('camera.bracket',x+9,y-2,15,8,top+21,3,'mid',false,'head');
 box('camera',x+24,y-6,12,16,top+17,10,'hi',true,'head');
 box('lens.mount',x+26,y-4,8,12,top+14,3,'lo',false,'head');
 box('lens.glass',x+27,y-3,6,10,top+13.5,.5,'hi',false,'head');
 box('tile.active',tileX-35,tileY-35,70,70,tileTop-4,4,'hi',true,'tile');
 box('control',-150,29,18,40,0,28,'mid',true);
 box('control.lid',-150,29,18,40,28,2,'hi',true);
 box('control.screen',-147,34,12,16,30,.5,'lo');
 for(let i=0;i<2;i++)box('control.button'+i,-146+i*6,57,4,5,30,.7,'hi');
 A.settle(R,P);
 if(audit)A.auditOrExit(R,P,{argv:['--audit']});
 R.items.sort((a,b)=>a.key-b.key);
 const body=`<path class="iso-halo" d="${k.haloOf(floor,-16,14,P)}"/>`+R.items.map(it=>`<g data-part="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
 return {P,R,body,layout,svg:k.figureSvg({width:1000,height:580,label:`地砖铺贴教学台：双导轨滑台、升降执行器、力传感器、相机及${{single:'单',dual:'双',quad:'四'}[layout]}吸盘末端；平移与升降示意`,body})};
}
