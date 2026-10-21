/* Teaching geometries, millimetres and degrees, right-handed Z-up.
   Pure kinematics, closed-chain Delta closure, finite joint limits and capsule/AABB checks. */
(function(root){
 'use strict';
 const V=root.RobotModel,D=V.D,{add,sub,mul,dot,norm,cross,mv,mm,rot,I}=V;
 const definitions={
  cartesian:{name:'直角坐标型',en:'CARTESIAN',chain:'PPP',home:[-150,-120,300],limits:[[-220,220],[-200,200],[150,400]],names:['X 向导轨','Y 向滑台','Z 向滑枕'],types:['P','P','P'],position:3,orientation:0,shape:'正交直线轴 · 盒状位置空间',note:'三个直线副分别允许一个平移变量；工具朝向保持固定。',clue:'直线副相互正交',space:'行程边界 / 三轴正交；锁一轴后退化为一个截面'},
  cylindrical:{name:'圆柱坐标型',en:'CYLINDRICAL',chain:'RPP',home:[-60,260,300],limits:[[-150,150],[90,350],[170,450]],names:['底座回转','径向伸缩','立柱升降'],types:['R','P','P'],position:3,orientation:0,shape:'回转 + 径向 + 竖向 · 扇形柱壳',note:'转台改变方位，径向轴改变半径，升降轴改变高度；工具俯仰受约束。',clue:'一转动、两移动',space:'扇形柱壳 / 存在内半径与回转限位'},
  articulated:{name:'关节型六轴',en:'ARTICULATED',chain:'RRRRRR',home:[-40,30,-40,0,45,0],limits:V.limits,names:['底座回转','肩部摆动','肘部摆动','腕部回转','腕部摆动','法兰自转'],types:['R','R','R','R','R','R'],position:3,orientation:3,shape:'六个转动关节依次串联',note:'六个独立关节提供位置和朝向的运动选择；限位与奇异位形仍会限制可用运动。',clue:'转轴串联、末端腕部',space:'离散位姿采样 / 未采到的区域不等于不可达'},
  scara:{name:'SCARA',en:'SCARA',chain:'RRPR',home:[-55,70,280,0],limits:[[-150,150],[-145,145],[110,380],[-180,180]],names:['水平肩轴','水平肘轴','竖向滑轴','工具回转'],types:['R','R','P','R'],position:3,orientation:1,shape:'两段水平转臂 + 升降 + 工具回转',note:'本例为四轴 SCARA：位置三方向、工具绕竖直方向回转；不能任意改变工具俯仰。',clue:'平面双臂、竖直滑轴',space:'受关节限位截切的环形位置区域 + 竖向行程'},
  delta:{name:'Delta 并联',en:'DELTA / PARALLEL',chain:'3×R 并联',home:[38,28,32],limits:[[-15,65],[-15,65],[-15,65]],names:['支链 A 驱动','支链 B 驱动','支链 C 驱动'],types:['R','R','R'],position:3,orientation:0,shape:'三条并联支链 · 平台保持平行',note:'本例为三平移 Delta，不附加工具回转轴。三条支链共同约束平台，多个被动铰点不另计独立自由度。',clue:'多支链共连同一平台',space:'闭链几何合法位姿采样 / 平台方向由平行四边形约束'}
 };
 const delta={R:240,r:65,upper:140,lower:320,height:590,az:[90,210,330].map(x=>x*D)};
 function sphereIntersection(c1,c2,c3,r){
  const ab=sub(c2,c1),d=norm(ab);if(d<1e-8)return null;const ex=mul(ab,1/d),ac=sub(c3,c1),i=dot(ex,ac),ey0=sub(ac,mul(ex,i)),j=norm(ey0);if(j<1e-8)return null;const ey=mul(ey0,1/j),ez=cross(ex,ey),x=d/2,y=(dot(ac,ac)-2*i*x)/(2*j),z2=r*r-x*x-y*y;
  if(z2< -1e-6)return null;const centre=add(c1,add(mul(ex,x),mul(ey,y))),s=Math.sqrt(Math.max(0,z2)),a=add(centre,mul(ez,s)),b=sub(centre,mul(ez,s));return a[2]<b[2]?a:b;
 }
 function deltaFK(q,length){
  const shoulders=delta.az.map(a=>[delta.R*Math.cos(a),delta.R*Math.sin(a),delta.height]);
  const elbows=shoulders.map((p,i)=>add(p,[-delta.upper*Math.cos(q[i]*D)*Math.cos(delta.az[i]),-delta.upper*Math.cos(q[i]*D)*Math.sin(delta.az[i]),-delta.upper*Math.sin(q[i]*D)]));
  const centres=elbows.map((p,i)=>sub(p,[delta.r*Math.cos(delta.az[i]),delta.r*Math.sin(delta.az[i]),0]));
  const platform=sphereIntersection(...centres,delta.lower);if(!platform||platform[2]>Math.min(...elbows.map(p=>p[2]))||platform[2]<60)return null;
  const anchors=delta.az.map(a=>add(platform,[delta.r*Math.cos(a),delta.r*Math.sin(a),0])),p=add(platform,[0,0,-length]);
  const segments=[];for(let i=0;i<3;i++){segments.push({a:shoulders[i],b:elbows[i],r:18,id:'upper'+i,name:'支链 '+String.fromCharCode(65+i)+' 上臂'});const tangent=[-Math.sin(delta.az[i])*18,Math.cos(delta.az[i])*18,0];for(const side of [-1,1])segments.push({a:add(elbows[i],mul(tangent,side)),b:add(anchors[i],mul(tangent,side)),r:5,id:'lower'+i,name:'支链 '+String.fromCharCode(65+i)+' 平行杆'});}
  segments.push({a:platform,b:p,r:13,id:'tool',name:'工具'});return {p,R:rot([1,0,0],Math.PI),flange:platform,shoulders,elbows,anchors,platform,segments};
 }
 const segment=(a,b,r,id,name)=>({a,b,r,id,name});
 function fk(id,q,length=80){
  if(id==='delta')return deltaFK(q,length);
  let p,R=rot([1,0,0],Math.PI),flange,segments=[];
  if(id==='cartesian'){
   flange=[q[0],q[1],q[2]];p=add(flange,[0,0,-length]);segments=[segment([q[0],-240,50],[q[0],-240,520],23,'bridge','移动门架'),segment([q[0],240,50],[q[0],240,520],23,'bridge','移动门架'),segment([q[0],-250,520],[q[0],250,520],26,'bridge','横梁'),segment(flange,add(flange,[0,0,340]),12,'spindle','Z 滑枕'),segment(flange,p,14,'tool','工具')];
  }else if(id==='cylindrical'){
   const a=q[0]*D,pt=x=>[x*Math.cos(a),x*Math.sin(a),q[2]];flange=pt(q[1]);p=add(flange,[0,0,-length]);R=mm(rot([0,0,1],a),R);segments=[segment([-70*Math.sin(a),70*Math.cos(a),112],[-70*Math.sin(a),70*Math.cos(a),497],45,'column','回转立柱'),segment(pt(q[1]-370),flange,24,'radial','径向滑臂'),segment(flange,p,15,'tool','工具')];
  }else if(id==='scara'){
   const a=q[0]*D,b=(q[0]+q[1])*D,elbow=[230*Math.cos(a),230*Math.sin(a),430],wrist=[elbow[0]+190*Math.cos(b),elbow[1]+190*Math.sin(b),410];flange=[wrist[0],wrist[1],q[2]];p=add(flange,[0,0,-length]);R=mm(rot([0,0,1],(q[0]+q[1]+q[3])*D),R);segments=[segment([0,0,430],elbow,25,'upper','水平大臂'),segment([elbow[0],elbow[1],410],wrist,23,'forearm','水平小臂'),segment(flange,add(flange,[0,0,340]),12,'spindle','竖直滑轴'),segment(flange,p,15,'tool','工具')];return {p,R,flange,elbow,wrist,segments};
  }else if(id==='articulated'){
   const f=V.fk(q,'gripper');flange=f.flange;R=f.R;p=add(flange,mv(R,[0,0,length]));const pts=[f.joints[1].p,f.joints[2].p,f.joints[3].p,f.joints[4].p,f.joints[5].p,p],r=[48,38,34,27,16],ids=['upper','forearm','wrist','wrist','tool'];segments=pts.slice(0,-1).map((a,i)=>segment(a,pts[i+1],r[i],ids[i],['大臂','小臂','腕部','腕部','工具'][i]));return {...f,p,R,flange,segments};
  }
  return {p,R,flange,segments};
 }
 function bounds(id,scale=1){const d=definitions[id];return d.limits.map(([lo,hi],i)=>[d.home[i]+(lo-d.home[i])*scale,d.home[i]+(hi-d.home[i])*scale]);}
 function valid(id,q,limits=bounds(id),locks=[],locked=q,length=80){
  if(!Array.isArray(q)||q.length!==definitions[id].types.length||q.some((x,i)=>!Number.isFinite(x)||x<limits[i][0]-1e-5||x>limits[i][1]+1e-5||(locks[i]&&Math.abs(x-locked[i])>1e-4)))return false;
  const f=fk(id,q,length);if(!f||f.p[2]<22)return false;
  if(id==='articulated'){for(const s of f.segments)if(Math.min(s.a[2],s.b[2])-s.r<12)return false;for(const [a,b] of [[0,3],[0,4],[1,4]])if(V.segmentDistance(f.segments[a].a,f.segments[a].b,f.segments[b].a,f.segments[b].b)<f.segments[a].r+f.segments[b].r)return false;}
  return true;
 }
 const wrap=a=>{while(a>180)a-=360;while(a< -180)a+=360;return a;};
 function choose(candidates,id,seed,limits,locks,length,target){return candidates.filter(q=>valid(id,q,limits,locks,seed,length)&&norm(sub(fk(id,q,length).p,target))<.1).sort((a,b)=>a.reduce((s,v,i)=>s+((v-seed[i])/(definitions[id].types[i]==='P'?5:2))**2,0)-b.reduce((s,v,i)=>s+((v-seed[i])/(definitions[id].types[i]==='P'?5:2))**2,0))[0]||null;}
 function solve3(A,b){const a=A.map((row,i)=>row.concat(b[i]));for(let i=0;i<3;i++){let best=i;for(let j=i+1;j<3;j++)if(Math.abs(a[j][i])>Math.abs(a[best][i]))best=j;[a[best],a[i]]=[a[i],a[best]];if(Math.abs(a[i][i])<1e-12)return null;let c=a[i][i];for(let k=i;k<4;k++)a[i][k]/=c;for(let j=0;j<3;j++)if(j!==i){c=a[j][i];for(let k=i;k<4;k++)a[j][k]-=c*a[i][k];}}return a.map(row=>row[3]);}
 function sixIK(p,seed,limits,locks,length){
  const seeds=[seed,definitions.articulated.home,[0,25,-65,0,60,0],[70,15,30,0,45,0],[-70,15,30,0,45,0]];
  for(const start of seeds){let q=start.map((v,i)=>locks[i]?seed[i]:Math.max(limits[i][0],Math.min(limits[i][1],v)));
   for(let n=0;n<120;n++){const f=fk('articulated',q,length),err=sub(p,f.p);if(norm(err)<.1&&valid('articulated',q,limits,locks,seed,length))return q;
    const cols=f.joints.map((j,i)=>locks[i]?[0,0,0]:cross(j.axis,sub(f.p,j.p))),J=Array.from({length:3},(_,i)=>cols.map(c=>c[i])),A=J.map((row,i)=>J.map((other,j)=>dot(row,other)+(i===j?9:0))),s=solve3(A,err);if(!s)break;const dq=cols.map(c=>dot(c,s)),factor=Math.min(1,.12/Math.max(.00001,...dq.map(Math.abs)));q=q.map((v,i)=>locks[i]?seed[i]:Math.max(limits[i][0],Math.min(limits[i][1],v+dq[i]*factor/D)));
   }
  }return null;
 }
 function ik(id,p,seed,scale=1,locks=[],length=80){
  if(p.some(x=>!Number.isFinite(x))||p[2]<22)return null;const limits=bounds(id,scale),flangeZ=p[2]+length;
  if(id==='cartesian')return choose([[p[0],p[1],flangeZ]],id,seed,limits,locks,length,p);
  if(id==='cylindrical')return choose([[Math.atan2(p[1],p[0])/D,Math.hypot(p[0],p[1]),flangeZ]],id,seed,limits,locks,length,p);
  if(id==='scara'){
   const c=(p[0]*p[0]+p[1]*p[1]-230**2-190**2)/(2*230*190);if(Math.abs(c)>1+1e-8)return null;
   const candidates=[1,-1].map(sign=>{const b=sign*Math.acos(Math.max(-1,Math.min(1,c))),a=Math.atan2(p[1],p[0])-Math.atan2(190*Math.sin(b),230+190*Math.cos(b));return [wrap(a/D),b/D,flangeZ,seed[3]];});return choose(candidates,id,seed,limits,locks,length,p);
  }
  if(id==='delta'){
   const platform=add(p,[0,0,length]),q=[];
   for(let i=0;i<3;i++){const a=delta.az[i],u=[Math.cos(a),Math.sin(a),0],B=[u[0]*delta.R,u[1]*delta.R,delta.height],d=sub(add(platform,mul(u,delta.r)),B),A=dot(d,u),Bz=d[2],C=(delta.lower**2-dot(d,d)-delta.upper**2)/(2*delta.upper),r=Math.hypot(A,Bz);if(r<1e-8||Math.abs(C)>r+1e-8)return null;
    const phi=Math.atan2(Bz,A),v=Math.acos(Math.max(-1,Math.min(1,C/r))),options=[phi+v,phi-v].flatMap(t=>[t/D,t/D+360,t/D-360]).filter(t=>t>=limits[i][0]-1e-6&&t<=limits[i][1]+1e-6&&(!locks[i]||Math.abs(t-seed[i])<1e-4));if(!options.length)return null;options.sort((a,b)=>Math.abs(a-seed[i])-Math.abs(b-seed[i]));q.push(options[0]);
   }return choose([q],id,seed,limits,locks,length,p);
  }
  return sixIK(p,seed,limits,locks,length);
 }
 // Exact minimum Euclidean distance from a segment to an axis-aligned box.
 function segmentBoxDistance(a,b,box){
  const d=sub(b,a),lo=box.c.map((x,i)=>x-box.size[i]/2),hi=box.c.map((x,i)=>x+box.size[i]/2),ts=[0,1];
  for(let k=0;k<3;k++)if(Math.abs(d[k])>1e-12)for(const edge of [lo[k],hi[k]]){const t=(edge-a[k])/d[k];if(t>0&&t<1)ts.push(t);}ts.sort((a,b)=>a-b);
  const distance=t=>{let s=0;for(let k=0;k<3;k++){const x=a[k]+d[k]*t;s+=Math.max(lo[k]-x,0,x-hi[k])**2;}return s;};let best=Infinity;
  for(let j=0;j<ts.length-1;j++){const left=ts[j],right=ts[j+1],mid=(left+right)/2;let A=0,B=0;for(let k=0;k<3;k++){const x=a[k]+d[k]*mid,edge=x<lo[k]?lo[k]:x>hi[k]?hi[k]:null;if(edge!==null){A+=d[k]*d[k];B+=d[k]*(a[k]-edge);}}const t=A?Math.max(left,Math.min(right,-B/A)):mid;best=Math.min(best,distance(left),distance(right),distance(t));}return Math.sqrt(best);
 }
 function collision(f,obstacles){if(!f)return [];const hits=[];for(const s of f.segments)for(const b of obstacles)if(b.enabled&&segmentBoxDistance(s.a,s.b,b)<s.r-1e-6)hits.push({part:s.id,name:s.name,obstacle:b.id,obstacleName:b.name});return hits;}
 function halton(n,base){let v=0,f=1/base;while(n>0){v+=f*(n%base);n=Math.floor(n/base);f/=base;}return v;}
 function sample(id,scale,locks,q,length,count=2200){const bases=[2,3,5,7,11,13],limits=bounds(id,scale),points=[],configs=[];for(let i=1;i<=count;i++){const v=limits.map(([lo,hi],j)=>locks[j]?q[j]:lo+(hi-lo)*halton(i,bases[j]));if(valid(id,v,limits,locks,q,length)){points.push(fk(id,v,length).p);configs.push(v);}}return {points,configs,attempts:count};}
 function defaults(id,length=80){
  let start,end,via,post;
  if(id==='cartesian'){start=[-160,-120,280];end=[160,120,280];via=[[-160,180,280],[160,180,280]];post={c:[0,0,200],size:[66,66,310]};}
  if(id==='cylindrical'){start=[-60,260,300];end=[60,260,300];via=[[-60,90,300],[60,90,300]];post={c:[230,0,225],size:[62,70,360]};}
  if(id==='scara'){start=[-55,70,280,0];end=[55,70,280,0];via=[[-55,145,280,0],[55,145,280,0]];post={c:[285,115,245],size:[54,54,400]};}
  if(id==='articulated'){start=[-40,30,-40,0,45,0];end=[40,30,-40,0,45,0];via=[[-40,-30,60,0,45,0],[40,-30,60,0,45,0]];post={c:[390,0,345],size:[64,70,600]};}
  if(id==='delta'){const A=[-80,-50,150],B=[80,50,150],home=definitions.delta.home;start=ik(id,A,home,1,[],length);end=ik(id,B,home,1,[],length);via=[ik(id,[-80,-50,225],home,1,[],length),ik(id,[80,50,225],home,1,[],length)];post={c:[0,0,120],size:[54,54,150]};}
  return {start,end,via,obstacles:[{id:'post',name:'立柱',enabled:true,...post},{id:'crate',name:'材料箱',enabled:false,c:[-240,170,105],size:[110,125,120]}]};
 }
 function pathSamples(waypoints,id,length,obstacles,scale=1,locks=[],locked=waypoints[0]){let firstHit=null,invalid=false;const poses=[];if(waypoints.some(q=>!q))return {poses,invalid:true,firstHit:null};for(let s=0;s<waypoints.length-1;s++){const a=waypoints[s],b=waypoints[s+1],steps=Math.max(16,...a.map((v,i)=>Math.ceil(Math.abs(b[i]-v)/(definitions[id].types[i]==='P'?4:2))));for(let k=s?1:0;k<=steps;k++){const q=a.map((v,i)=>v+(b[i]-v)*k/steps);if(!valid(id,q,bounds(id,scale),locks,locked,length))invalid=true;const f=fk(id,q,length),hits=collision(f,obstacles);if(hits.length&&firstHit===null)firstHit={index:poses.length,...hits[0]};poses.push({q,p:f?.p,hits});}}return {poses,invalid,firstHit};}
 root.ConfigModel={definitions,delta,fk,ik,bounds,valid,collision,segmentBoxDistance,sample,defaults,pathSamples,sphereIntersection,...{D,add,sub,mul,dot,norm,cross,mv,mm,rot,I}};
 if(typeof module!=='undefined')module.exports=root.ConfigModel;
})(typeof window==='undefined'?globalThis:window);
