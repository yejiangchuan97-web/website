'use strict';
// Pure position analysis. Units: mm and radians. No rendering or per-link easing.
globalThis.FourbarKinematics=(()=>{
 const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=x=>((x%TAU)+TAU)%TAU;
 const guards={height:.75,centers:1};
 function solve(m,theta,branch=1,point={along:.55,offset:24}){
  const u={x:m.a*Math.cos(theta),y:m.a*Math.sin(theta)},dx=m.d-u.x,dy=-u.y,r=Math.hypot(dx,dy);
  if(r<1e-9||r>m.b+m.c+1e-8||r<Math.abs(m.b-m.c)-1e-8)return null;
  const t=(m.b*m.b-m.c*m.c+r*r)/(2*r),h2=m.b*m.b-t*t;if(h2< -1e-7)return null;
  const h=Math.sqrt(Math.max(0,h2)),ex=dx/r,ey=dy/r,v={x:u.x+t*ex-branch*h*ey,y:u.y+t*ey+branch*h*ex},bx=(v.x-u.x)/m.b,by=(v.y-u.y)/m.b;
  const p={x:u.x+point.along*(v.x-u.x)-point.offset*by,y:u.y+point.along*(v.y-u.y)+point.offset*bx},gamma=Math.atan2(v.y,v.x-m.d),beta=Math.atan2(by,bx);
  const lengths=[Math.hypot(u.x,u.y),Math.hypot(v.x-u.x,v.y-u.y),Math.hypot(v.x-m.d,v.y)],error=Math.max(...lengths.map((x,i)=>Math.abs(x-[m.a,m.b,m.c][i]))),cross=dx*(v.y-u.y)-dy*(v.x-u.x);
  return {u,v,p,h,r,gamma,beta,lengths,error,cross,branch};
 }
 function intervals(m,g=guards){
  if(!['a','b','c','d'].every(k=>Number.isFinite(m[k])&&m[k]>0)||Math.min(m.b,m.c)<=g.height)return [];
  const rb=Math.sqrt(m.b*m.b-g.height*g.height),rc=Math.sqrt(m.c*m.c-g.height*g.height),low=Math.max(g.centers,Math.abs(rb-rc)),high=rb+rc,base=m.d*m.d+m.a*m.a,two=2*m.d*m.a,cosLo=(base-high*high)/two,cosHi=(base-low*low)/two;
  if(cosLo>1||cosHi< -1||cosLo>cosHi)return [];
  const a=Math.acos(clamp(cosHi,-1,1)),b=Math.acos(clamp(cosLo,-1,1));
  if(b-a<1e-8)return [];if(a<1e-10&&Math.PI-b<1e-10)return [{lo:0,hi:TAU,cyclic:true}];
  if(Math.PI-b<1e-10)return [{lo:a,hi:TAU-a,cyclic:false}];
  return [{lo:a,hi:b,cyclic:false},{lo:TAU-b,hi:TAU-a,cyclic:false}];
 }
 function cell(m,theta){
  const rows=intervals(m);if(rows[0]?.cyclic)return {lo:-Infinity,hi:Infinity,cyclic:true};
  const k=Math.floor(theta/TAU),expanded=[];for(let j=k-2;j<=k+2;j++)for(const row of rows)expanded.push({lo:row.lo+j*TAU,hi:row.hi+j*TAU});expanded.sort((a,b)=>a.lo-b.lo);
  const merged=[];for(const row of expanded){const last=merged.at(-1);if(last&&row.lo<=last.hi+1e-9)last.hi=Math.max(last.hi,row.hi);else merged.push({...row,cyclic:false})}
  return merged.find(row=>theta>=row.lo-1e-8&&theta<=row.hi+1e-8)||null;
 }
 function nearest(m,theta){const rows=intervals(m);if(!rows.length)return null;if(rows[0].cyclic)return {theta,cell:cell(m,theta)};let best=null;for(let j=Math.floor(theta/TAU)-1;j<=Math.floor(theta/TAU)+1;j++)for(const row of rows){const t=clamp(theta,row.lo+j*TAU,row.hi+j*TAU);if(best===null||Math.abs(t-theta)<Math.abs(best-theta))best=t}return {theta:best,cell:cell(m,best)}}
 function move(m,from,to,branch,point){const c=cell(m,from);if(!c)return null;const theta=clamp(to,c.lo,c.hi),pose=solve(m,theta,branch,point);if(!pose)return null;return {theta,pose,cell:c,limited:Math.abs(theta-to)>1e-9}}
 function unwrap(angle,near){return near+Math.atan2(Math.sin(angle-near),Math.cos(angle-near))}
 function gripper(m,pose){const length=.7*m.c+20,pivot=length+8,tip={x:-pivot+length*Math.sin(pose.gamma),y:-length*Math.cos(pose.gamma)},cs=Math.cos(pose.gamma),sn=Math.sin(pose.gamma),vertices=[];
  for(const x of [-5,5])for(const y of [-length,0])vertices.push({x,y});for(const x of [-1.5,13.5])for(const y of [-length-4.5,-length+4.5])vertices.push({x,y});for(let n=-2;n<=2;n++)for(const x of [13.1,14.1])for(const y of [-length+n*1.5-.5,-length+n*1.5+.5])vertices.push({x,y});
  const leftInner=vertices.map(p=>({x:-pivot+p.x*cs-p.y*sn,y:p.x*sn+p.y*cs})).reduce((a,b)=>a.x>b.x?a:b);return {length,pivot,leftTip:tip,rightTip:{x:-tip.x,y:tip.y},leftInner,rightInner:{x:-leftInner.x,y:leftInner.y},gap:-2*leftInner.x}}
 function mechanics(m,p,theta,force=100){
  const b={x:(p.v.x-p.u.x)/m.b,y:(p.v.y-p.u.y)/m.b},c={x:(p.v.x-m.d)/m.c,y:p.v.y/m.c},a={x:p.u.x/m.a,y:p.u.y/m.a},t={x:-c.y,y:c.x};
  const sOut=c.x*b.y-c.y*b.x,sIn=a.x*b.y-a.y*b.x,mu=Math.asin(clamp(Math.abs(sOut),0,1)),nu=Math.asin(clamp(Math.abs(sIn),0,1)),ft=force*sOut,fr=force*(b.x*c.x+b.y*c.y),rOut=m.c*sOut,rIn=m.a*sIn;
  const footC={x:p.u.x+b.x*((m.d-p.u.x)*b.x-p.u.y*b.y),y:p.u.y+b.y*((m.d-p.u.x)*b.x-p.u.y*b.y)},footA={x:p.u.x-b.x*(p.u.x*b.x+p.u.y*b.y),y:p.u.y-b.y*(p.u.x*b.x+p.u.y*b.y)};
  return {mu,nu,sinMu:Math.abs(sOut),sinNu:Math.abs(sIn),force,unitB:b,unitC:c,tangent:t,onC:{x:force*b.x,y:force*b.y},onA:{x:-force*b.x,y:-force*b.y},tangential:{x:ft*t.x,y:ft*t.y},radial:{x:fr*c.x,y:fr*c.y},ft,fr,rOut,rIn,footC,footA,torqueC:force*rOut/1000,driveTorqueA:force*rIn/1000,speedRatio:Math.abs(rOut)>1e-10?rIn/rOut:null,forceFor1Nm:Math.abs(rOut)>1e-10?1000/Math.abs(rOut):null,outputNear:mu<15*Math.PI/180,outputCaution:mu<40*Math.PI/180,inputNear:nu<5*Math.PI/180};
 }
 function inputDeadCenters(m,branch=1){
  const results=[];for(const sign of [1,-1]){const radius=m.a+sign*m.b;if(Math.abs(radius)<1e-9)continue;const cs=(radius*radius+m.d*m.d-m.c*m.c)/(2*m.d*radius);if(Math.abs(cs)>1+1e-10)continue;for(const theta of [Math.acos(clamp(cs,-1,1)),mod(-Math.acos(clamp(cs,-1,1)))]){const p=solve(m,theta,branch);if(p&&cell(m,theta)&&mechanics(m,p,theta).sinNu<1e-7&&!results.some(t=>Math.abs(t-theta)<1e-7))results.push(theta)}}return results.sort((a,b)=>a-b);
 }
 return {TAU,guards,mod,solve,intervals,cell,nearest,move,unwrap,gripper,mechanics,inputDeadCenters};
})();
