export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const K=5,BASE_COMPRESSION=4,TRAVEL=4,FORCE_LIMIT=45;
export function contact(bump,retreat,target=20){
 const compression=BASE_COMPRESSION+bump-retreat,force=Math.max(0,compression*K);
 return {compression,force,error:force-target,gap:Math.max(0,-compression),limit:Math.abs(retreat)>=TRAVEL-.001,overload:force>FORCE_LIMIT};
}
export function forceStep(retreat,bump,target,enabled,dt){
 if(!enabled)return retreat;const r=contact(bump,retreat,target);if(r.overload)return retreat;
 const delta=(r.force-target)/K*(1-Math.exp(-dt/.55));
 return clamp(retreat+clamp(delta,-4*dt,4*dt),-TRAVEL,TRAVEL);
}
export const conditions={normal:{name:'连续匀速',action:'看大面接触，再核对实际表面。',explain:'接触力稳定、运动连续，是过程条件；仍需靠尺、侧光观察和局部复核。'},dwell:{name:'局部驻留',action:'检查停止进给处，不能只看力读数。',explain:'即使接触力不变，停在同一点仍会累积作用时间，形成过磨风险。'},worn:{name:'磨料磨损',action:'检查砂纸状态，再判断是否需要更换。',explain:'同样接触力和运动时间，不代表相同加工效果；磨料状态会改变作用。'},dust:{name:'吸尘异常',action:'停止作业，检查吸尘管路和滤芯。',explain:'轨迹仍可完成，但粉尘可能遮蔽表面和感知；动画不估算实际粉尘浓度。'}};
export function dwellState(p,condition){
 const t=clamp(p,0,1)*12;
 const x=condition==='dwell'?(t<4?t/8:t<8?.5:(t-4)/8):t/12;
 const dwell=condition==='dwell'?clamp(t-4,0,4):0;
 return {t,x,dwell,holding:condition==='dwell'&&t>=4&&t<8,force:20};
}
export const WALL={w:3.6,h:2.4},OPENING={x:1.4,z:.8,w:.8,h:.9},R=.15,MARGIN=.08;
export function inOpening(x,z,pad=0){return x>OPENING.x-pad&&x<OPENING.x+OPENING.w+pad&&z>OPENING.z-pad&&z<OPENING.z+OPENING.h+pad;}
export function openingDistance(x,z){return Math.hypot(Math.max(OPENING.x-x,0,x-OPENING.x-OPENING.w),Math.max(OPENING.z-z,0,z-OPENING.z-OPENING.h));}
export function validCenter(x,z,pad=R+MARGIN){return x>=pad&&x<=WALL.w-pad&&z>=pad&&z<=WALL.h-pad&&openingDistance(x,z)>=pad;}
export function makeRoute(spacing=.24,offset=0){
 const pad=R+MARGIN,x0=pad,x1=WALL.w-pad,z0=pad,z1=WALL.h-pad;
 const rows=[z0];while(rows.at(-1)+spacing<z1-.01)rows.push(rows.at(-1)+spacing);if(z1-rows.at(-1)>.01)rows.push(z1);
 const segments=[];let total=0;
 rows.forEach((z,i)=>{
  let intervals=z>OPENING.z-pad&&z<OPENING.z+OPENING.h+pad?[[x0,OPENING.x-pad],[OPENING.x+OPENING.w+pad,x1]]:[[x0,x1]];
  if(i%2)intervals=intervals.reverse().map(([a,b])=>[b,a]);
  for(const [a,b]of intervals){const from=[a+offset,z],to=[b+offset,z],len=Math.abs(b-a);segments.push({a:from,b:to,length:len,start:total});total+=len;}
 });
 const joined=[];total=0;
 for(const s of segments){if(joined.length){const a=joined.at(-1).b,b=s.a,length=Math.hypot(b[0]-a[0],b[1]-a[1]);joined.push({a,b,length,start:total,contact:false});total+=length;}joined.push({...s,start:total,contact:true});total+=s.length;}
 return {segments:joined,total,spacing,offset};
}
export function dryCheck(route){let unsafe=0,first=null,nearOpening=null,nearest=R+MARGIN-1e-6;for(const s of route.segments){if(!s.contact)continue;for(let i=0;i<=100;i++){const x=s.a[0]+(s.b[0]-s.a[0])*i/100,z=s.a[1];if(!validCenter(x,z,R+MARGIN-1e-6)){unsafe++;first??={x,z,contact:false};const distance=openingDistance(x,z);if(distance<nearest){nearest=distance;nearOpening={x,z,contact:false};}}}}return {valid:unsafe===0,unsafe,hazard:nearOpening||first};}
export function routePosition(route,fraction){const distance=clamp(fraction,0,1)*route.total;const s=route.segments.find(s=>s.start+s.length>=distance)||route.segments.at(-1);const t=clamp((distance-s.start)/s.length,0,1);return {x:s.a[0]+(s.b[0]-s.a[0])*t,z:s.a[1]+(s.b[1]-s.a[1])*t,contact:s.contact,segment:route.segments.indexOf(s)};}
export function pointSegment(p,a,b){const d=b[0]-a[0],t=d?clamp((p[0]-a[0])/d,0,1):0;return Math.hypot(p[0]-a[0]-d*t,p[1]-a[1]);}
export function coverage(route,progress,cols=90,rows=60){
 const dist=clamp(progress,0,1)*route.total,active=route.segments.filter(s=>s.contact&&s.start<dist).map(s=>({a:s.a,b:[s.a[0]+(s.b[0]-s.a[0])*clamp((dist-s.start)/s.length,0,1),s.a[1]]}));
 const cells=[];let count=0,total=0;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=(i+.5)*WALL.w/cols,z=(j+.5)*WALL.h/rows,opening=inOpening(x,z);let hit=false;if(!opening){total++;hit=active.some(s=>pointSegment([x,z],s.a,s.b)<=R);if(hit)count++;}cells.push({i,j,hit,opening});}
 return {cells,cols,rows,count,total,percent:100*count/total,area:WALL.w*WALL.h-OPENING.w*OPENING.h};
}
