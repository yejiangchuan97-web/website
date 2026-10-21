/* Pure six-axis teaching model. Length: mm. Angles at the API: degrees.
   Right-handed base, Z up; J1 Z, J2/J3 Y, J4 X, J5 Y, J6 X.
   This is an educational geometry, not a manufacturer's controller model. */
(function(root) {
  'use strict';
  const D=Math.PI/180, I=[1,0,0,0,1,0,0,0,1];
  const add=(a,b)=>a.map((x,i)=>x+b[i]), sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const mul=(a,s)=>a.map(x=>x*s), dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const norm=a=>Math.hypot(...a), cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const mv=(a,v)=>[dot(a.slice(0,3),v),dot(a.slice(3,6),v),dot(a.slice(6,9),v)];
  const tr=a=>[a[0],a[3],a[6],a[1],a[4],a[7],a[2],a[5],a[8]];
  const mm=(a,b)=>{const t=tr(b);return a.flatMap((_,i)=>i%3?[]:t.reduce((s,__,j)=>j%3?s:s.concat(dot(a.slice(i,i+3),t.slice(j,j+3))),[]));};
  function rot(axis,r){const [x,y,z]=axis,c=Math.cos(r),s=Math.sin(r),v=1-c;return [x*x*v+c,x*y*v-z*s,x*z*v+y*s,y*x*v+z*s,y*y*v+c,y*z*v-x*s,z*x*v-y*s,z*y*v+x*s,z*z*v+c];}
  const axes=[[0,0,1],[0,1,0],[0,1,0],[1,0,0],[0,1,0],[1,0,0]];
  const offsets=[[0,0,100],[0,0,110],[0,0,360],[310,0,0],[65,0,0],[75,0,0]];
  const limits=[[-170,170],[-65,110],[-125,120],[-180,180],[-120,120],[-180,180]];
  const home=[-25,32,-55,20,55,0];
  const tools={gripper:{name:'平行夹爪',offset:[0,0,125]},probe:{name:'偏置喷嘴',offset:[45,0,170]}};
  function fk(q,tool='gripper'){
    let p=[0,0,0],R=I.slice();const joints=[];
    for(let i=0;i<6;i++){p=add(p,mv(R,offsets[i]));const axis=mv(R,axes[i]);R=mm(R,rot(axes[i],q[i]*D));joints.push({p:p.slice(),R:R.slice(),axis});}
    const toolR=mm(R,rot([0,1,0],Math.PI/2)), tcp=add(p,mv(toolR,tools[tool].offset));
    return {p:tcp,R:toolR,joints,flange:p.slice(),flangeR:R};
  }
  function rotationError(target,current){
    const r=mm(target,tr(current)),v=[r[7]-r[5],r[2]-r[6],r[3]-r[1]];
    const angle=Math.acos(Math.max(-1,Math.min(1,(r[0]+r[4]+r[8]-1)/2)));
    if(angle<1e-7)return mul(v,.5);
    if(Math.PI-angle<1e-4){const diag=[r[0],r[4],r[8]],k=diag.indexOf(Math.max(...diag)),axis=[0,0,0];axis[k]=Math.sqrt(Math.max(0,(diag[k]+1)/2));for(let j=0;j<3;j++)if(j!==k)axis[j]=(r[k*3+j]+r[j*3+k])/(4*axis[k]);return mul(axis,angle/norm(axis));}
    return mul(v,angle/(2*Math.sin(angle)));
  }
  function linearSolve(A,b){
    const a=A.map((r,i)=>r.concat(b[i])),n=b.length;
    for(let i=0;i<n;i++){let k=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[k],a[i]]=[a[i],a[k]];if(Math.abs(a[i][i])<1e-12)return null;const c=a[i][i];for(let l=i;l<=n;l++)a[i][l]/=c;for(let j=0;j<n;j++)if(j!==i){const m=a[j][i];for(let l=i;l<=n;l++)a[j][l]-=m*a[i][l];}}
    return a.map(r=>r[n]);
  }
  function ik(p,R,seed,tool='gripper',maxIterations=90){
    let q=seed.slice(),last=Infinity;
    for(let n=0;n<maxIterations;n++){
      const f=fk(q,tool),ep=sub(p,f.p),er=rotationError(R,f.R);
      if(norm(ep)<.08&&norm(er)<.0008)return {ok:true,q,positionError:norm(ep),angleError:norm(er)};
      const error=ep.concat(mul(er,130));
      const cols=f.joints.map(j=>cross(j.axis,sub(f.p,j.p)).concat(mul(j.axis,130)));
      const J=Array.from({length:6},(_,i)=>cols.map(c=>c[i]));
      const lambda=n>30?2.8:1.5;
      const a=J.map((row,i)=>J.map((other,j)=>dot(row,other)+(i===j?lambda*lambda:0)));
      const sol=linearSolve(a,error);if(!sol)break;
      const dq=cols.map(c=>dot(c,sol)),scale=Math.min(1,.13/Math.max(...dq.map(Math.abs),.00001));
      q=q.map((v,i)=>Math.max(limits[i][0],Math.min(limits[i][1],v+dq[i]*scale/D)));
      const err=norm(error);if(n>12&&Math.abs(last-err)<1e-8)break;last=err;
    }
    const f=fk(q,tool);return {ok:false,q,positionError:norm(sub(p,f.p)),angleError:norm(rotationError(R,f.R))};
  }
  function jog(q,frame,axis,amount,tool){
    if(frame==='joint'){const next=q.slice();next[axis]+=amount;if(next[axis]<limits[axis][0]||next[axis]>limits[axis][1])return {ok:false,reason:'已到关节软限位'};return {ok:true,q:next};}
    const f=fk(q,tool),a=[0,0,0];a[axis%3]=1;const dir=frame==='tool'?mv(f.R,a):a;
    const p=axis<3?add(f.p,mul(dir,amount)):f.p;
    const R=axis>=3?mm(rot(dir,amount*D),f.R):f.R;
    const result=ik(p,R,q,tool);if(!result.ok)result.reason='此方向接近限位或奇异位形，请换方向或调整关节';return result;
  }
  function segmentDistance(p1,q1,p2,q2){
    const d1=sub(q1,p1),d2=sub(q2,p2),r=sub(p1,p2),a=dot(d1,d1),e=dot(d2,d2),b=dot(d1,d2),c=dot(d1,r),f=dot(d2,r),den=a*e-b*b;
    let s=den>1e-8?Math.max(0,Math.min(1,(b*f-c*e)/den)):0,t=(b*s+f)/e;
    if(t<0){t=0;s=Math.max(0,Math.min(1,-c/a));}else if(t>1){t=1;s=Math.max(0,Math.min(1,(b-c)/a));}
    return norm(sub(add(p1,mul(d1,s)),add(p2,mul(d2,t))));
  }
  function guard(q,tool){
    if(q.some((v,i)=>!Number.isFinite(v)||v<limits[i][0]-.001||v>limits[i][1]+.001))return '关节超出教学软限位';
    const f=fk(q,tool),pts=[f.joints[1].p,f.joints[2].p,f.joints[3].p,f.joints[4].p,f.joints[5].p,f.p],radii=[50,40,33,26,14];
    for(let i=0;i<5;i++)if(Math.min(pts[i][2],pts[i+1][2])-radii[i]<12)return '连杆或工具接近地面，请向上或反向移动';
    for(const [i,j] of [[0,3],[0,4],[1,4]])if(segmentDistance(pts[i],pts[i+1],pts[j],pts[j+1])<radii[i]+radii[j])return '连杆接近自身，请反向调整';
    return null;
  }
  const euler=R=>{const pitch=Math.asin(Math.max(-1,Math.min(1,-R[6]))),c=Math.cos(pitch);return Math.abs(c)>.00001?[Math.atan2(R[7],R[8])/D,pitch/D,Math.atan2(R[3],R[0])/D]:[0,pitch/D,Math.atan2(-R[1],R[4])/D];};
  root.RobotModel={D,I,add,sub,mul,dot,norm,cross,mv,tr,mm,rot,axes,offsets,limits,home,tools,fk,ik,jog,guard,euler,rotationError,segmentDistance};
  if(typeof module!=='undefined')module.exports=root.RobotModel;
})(typeof window==='undefined'?globalThis:window);
