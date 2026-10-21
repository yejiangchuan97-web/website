import * as k from '../../assets/anatomy/iso-kit.mjs';
import * as A from '../../assets/anatomy/audit.mjs';
import * as G from '../../assets/anatomy/lathe.mjs';
import {toothProfile,TAU} from './model.mjs';
export function fallback(page,audit=false){
 const P=k.fitProjection([[-105,-72,-12],[105,72,58]],700,440,{pad:32,azimuth:45,elevation:38}),R=A.recorder(P);
 const put=(name,svg,shape,at)=>R.put({name,svg,at,shapes:[R.solid({...shape,name})]});
 const slab=(name,plan,z,h,tone='mid',ground=false)=>put(name,k.solidSvg(k.slabOf(plan,z,h,P,4,.5),{tone}),A.slab(plan,z,h,{ground}),[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2]);
 const cyl=(name,x,y,r,z,h,tone='mid',ground=false)=>put(name,k.solidSvg(k.cylinder(x,y,r,z,h,P,48),{tone}),A.cylinder(x,y,r,z,h,{ground}),[x,y,z+h/2]);
 for(const x of[-85,85])for(const y of[-55,55])cyl('foot.'+x+'.'+y,x,y,6,-12,5,'lo',true);
 slab('bed',{x:-100,y:-70,w:200,d:140,r:5},-7,7,'lo');
 for(const x of[-92,92])for(const y of[-60,0,60])cyl('screw.'+x+'.'+y,x,y,1.6,0,2,'hi');
 slab('ruler',{x:-80,y:-69,w:160,d:3,r:.4},0,.5,'mid');for(let i=0;i<33;i++)slab('tick.'+i,{x:-78+i*4.8,y:-69,w:.25,d:i%4?1.6:2.8,r:0},.5,.1,'hi');
 if(page==='reducers'){
  for(const [name,x,y,angle]of[['sun',0,0,0],...Array.from({length:3},(_,i)=>['planet'+i,44*Math.cos(i*TAU/3),44*Math.sin(i*TAU/3),i*TAU/3+Math.PI/18])]){
   cyl(name+'.mount',x,y,6,0,13,'mid');const points=toothProfile(18,2).map(([a,b])=>[x+a*Math.cos(angle)-b*Math.sin(angle),y+a*Math.sin(angle)+b*Math.cos(angle)]);
   // Split the actual toothed solid into radial sectors, so intermeshing teeth can be depth-sorted independently.
   for(let tooth=0;tooth<18;tooth++)for(let half=0;half<2;half++){const p=points.slice(tooth*18,(tooth+1)*18),tip=[(p[8][0]+p[9][0])/2,(p[8][1]+p[9][1])/2],sector=half?[[x,y],tip,...p.slice(9)]:[[x,y],...p.slice(0,9),tip];put(name+'.sector'+tooth+'.'+half,k.solidSvg(k.extrude(sector,13,8,P,{convex:false}),{tone:name==='sun'?'hi':'mid'}),A.extruded(sector,13,8),[x,y,17]);}
   cyl(name+'.hub',x,y,3,21,3,'hi');
  }
  // Segmented retaining cage: deliberately open to leave the working gear faces visible.
  for(let i=0;i<8;i++){const a=(i+.5)*TAU/8;cyl('cage.post'+i,68*Math.cos(a),68*Math.sin(a),2,0,24,'lo');cyl('cage.cap'+i,68*Math.cos(a),68*Math.sin(a),3.2,24,2,'hi')}
 }else{
  for(const y of[-22,22]){for(const x of[-80,80])slab('support.'+x+'.'+y,{x:x-5,y:y-6,w:10,d:12,r:1},0,18,'mid');const F=G.frameAlong([-80,y,19.5],[1,0,0]);put('rail.'+y,k.solidSvg(G.disc(0,160,1.5,F,P),{tone:'hi'}),A.disc(F,0,160,1.5),[0,y,19.5]);}
  slab('carriage',{x:-18,y:-29,w:36,d:58,r:2},21,6,'hi');slab('workpiece',{x:-12,y:-10,w:24,d:20,r:1},27,8,'mid');for(const x of[-12,12])for(const y of[-22,22])cyl('cap.'+x+'.'+y,x,y,2,27,2,'hi');
  for(const x of[-80,80])slab('drive.support'+x,{x:x-6,y:-6,w:12,d:12,r:1},0,36,'mid');const F=G.frameAlong([-80,0,38],[1,0,0]);put('drive.shaft',k.solidSvg(G.disc(0,160,2,F,P),{tone:'hi'}),A.disc(F,0,160,2),[0,0,38]);
 }
 A.settle(R,P);if(audit)A.auditOrExit(R,P,{argv:['--audit']});const svg=k.figureSvg({width:700,height:440,label:page==='reducers'?'Anatomy静态齿轮分解参考，不表示啮合状态':'Anatomy静态导轨试验台参考',body:R.items.slice().sort((a,b)=>a.key-b.key).map(x=>x.svg).join('')});return{svg,parts:R.items.length};
}
