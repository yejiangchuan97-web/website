const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('./model.js');
const near=(v,w,t=.1)=>assert.ok(M.norm(M.sub(v,w))<t,`${v} differs from ${w}`);
test('rotation matrices stay right-handed and orthonormal through the six-joint chain',()=>{
 for(const q of [M.home,[30,20,15,0,55,0],[-80,-30,75,-40,35,110]])for(const tool of Object.keys(M.tools)){
  const {R}=M.fk(q,tool);near(M.mm(R,M.tr(R)),M.I,1e-10);near(M.cross(M.mv(R,[1,0,0]),M.mv(R,[0,1,0])),M.mv(R,[0,0,1]),1e-10);
 }
});
test('joint jog changes exactly one angle, respects soft limits, and keeps rigid lengths',()=>{
 for(let a=0;a<6;a++){const r=M.jog(M.home,'joint',a,2,'gripper');assert.ok(r.ok);r.q.forEach((v,i)=>assert.equal(v,M.home[i]+(i===a?2:0)));const f=M.fk(r.q);for(let i=1;i<6;i++)assert.ok(Math.abs(M.norm(M.sub(f.joints[i].p,f.joints[i-1].p))-M.norm(M.offsets[i]))<1e-8);}
 assert.equal(M.jog([170,...M.home.slice(1)],'joint',0,1,'gripper').ok,false);
});
test('base and tool XYZ jog follow their actual axes while preserving orientation',()=>{
 for(const seed of [M.home,[-25,20,15,0,55,0],[60,35,-40,25,55,-30]])for(const tool of Object.keys(M.tools))for(const frame of ['base','tool'])for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
  const before=M.fk(seed,tool),basis=[0,0,0];basis[axis]=sign*5;
  const expected=M.add(before.p,frame==='tool'?M.mv(before.R,basis):basis),r=M.jog(seed,frame,axis,sign*5,tool);assert.ok(r.ok,`${frame} ${axis} failed for ${seed}`);const after=M.fk(r.q,tool);near(after.p,expected,.081);assert.ok(M.norm(M.rotationError(before.R,after.R))<.00081);
 }
});
test('base and tool rotational jog hold TCP fixed and rotate around the requested reference axis',()=>{
 for(const tool of Object.keys(M.tools))for(const frame of ['base','tool'])for(let axis=0;axis<3;axis++){
  const before=M.fk(M.home,tool),basis=[0,0,0];basis[axis]=1;const direction=frame==='tool'?M.mv(before.R,basis):basis;
  const expected=M.mm(M.rot(direction,3*M.D),before.R),r=M.jog(M.home,frame,axis+3,3,tool);assert.ok(r.ok);const after=M.fk(r.q,tool);near(before.p,after.p,.081);assert.ok(M.norm(M.rotationError(expected,after.R))<.00081);
 }
});
test('a centred gripper and an offset probe have different TCP behaviour under J6',()=>{
 const q=M.home.slice();q[5]+=30;
 near(M.fk(q,'gripper').p,M.fk(M.home,'gripper').p,1e-8);
 assert.ok(M.norm(M.sub(M.fk(q,'probe').p,M.fk(M.home,'probe').p))>20);
});
test('unreachable targets fail instead of reporting a fabricated TCP',()=>{
 const r=M.ik([3000,3000,3000],M.I,M.home);assert.equal(r.ok,false);assert.ok(r.positionError>1000);assert.ok(M.guard([Infinity,0,0,0,0,0]));
});
test('repeated small Cartesian steps preserve the straight line and attitude',()=>{
 for(const frame of ['base','tool']){let q=M.home.slice();const start=M.fk(q),dir=frame==='base'?[0,0,1]:M.mv(start.R,[0,0,1]);
 for(let n=1;n<=100;n++){const r=M.jog(q,frame,2,.4,'gripper');assert.ok(r.ok);q=r.q;const f=M.fk(q);near(f.p,M.add(start.p,M.mul(dir,.4*n)),.2);assert.ok(M.norm(M.rotationError(f.R,start.R))<.002);}
 }
});
test('challenge pick, transit, and place paths clear the model floor and self guard',()=>{
 const pick=[-25,20,15,0,55,0],place=[30,20,15,0,55,0],transit=[-25,5,-25,0,110,0],other=[30,5,-25,0,110,0];
 let from=M.home;for(const to of [transit,pick,transit,other,place]){for(let i=0;i<=200;i++)assert.equal(M.guard(from.map((v,j)=>v+(to[j]-v)*i/200),'gripper'),null);from=to;}
});
