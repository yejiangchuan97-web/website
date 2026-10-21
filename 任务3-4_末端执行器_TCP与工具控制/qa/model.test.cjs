const assert=require('node:assert/strict');
const M=require('../../任务3-2_六轴机械臂本体_关节轴与低速点动/src/model.js');
const TM=require('../src/tools.model.js');const W=require('../src/workshop.model.js');
let count=0,maxTip=0,maxFlange=0,maxCal=0;const results=[];
for(const tool of Object.keys(TM.tools)){
 const base=M.fk(M.home,tool),offset=TM.flangeOffset(tool);
 assert(M.norm(M.sub(M.add(base.flange,M.mv(base.flangeR,offset)),base.p))<1e-8);
 for(const mode of ['tcp','flange']){
  let seed=M.home.slice(),max=0;
  for(const angle of Array.from({length:89},(_,i)=>-22+i*.5)){
   const r=W.pivot(tool,angle,mode,offset,seed);assert(r.ok,`${tool} ${mode} ${angle}: ${r.reason}`);seed=r.q;
   const f=M.fk(r.q,tool),error=M.norm(M.sub(mode==='tcp'?f.p:f.flange,mode==='tcp'?base.p:base.flange));max=Math.max(max,error);assert(error<.1,`${tool}: ${error}`);count++;
  }
  if(mode==='tcp')maxTip=Math.max(maxTip,max);else maxFlange=Math.max(maxFlange,max);
  results.push({tool,mode,maxFixedPointError:max});
 }
 const cal=TM.calibrationPoses(tool),samples=cal.poses.slice(0,4).map(q=>TM.measured(q,tool)),solved=TM.solve(samples);
 const err=M.norm(M.sub(solved.p,offset));maxCal=Math.max(maxCal,err);assert(err<.5,`${tool} calibration ${err}`);
 const repeat=Array.from({length:4},()=>samples[0]);assert.throws(()=>TM.solve(repeat),/姿态/);
 const f=M.fk(cal.poses[4],tool),wanted=M.sub(cal.pin,M.mv(f.flangeR,M.sub(solved.p,offset))),r=M.ik(wanted,f.R,cal.poses[4],tool,180);assert(r.ok);assert(M.norm(M.sub(M.fk(r.q,tool).p,cal.pin))<.5);
}
const bad=W.pivot('gripper',20,'tcp',TM.flangeOffset('nozzle'));assert(bad.ok);const err=M.norm(M.sub(M.fk(bad.q,'gripper').p,M.fk(M.home,'gripper').p));assert(Math.abs(err-90*Math.sin(10*M.D))<.1);
const good=W.pivot('gripper',20,'tcp',TM.flangeOffset('gripper'));assert(good.ok);assert(M.norm(M.sub(M.fk(good.q,'gripper').p,M.fk(M.home,'gripper').p))<.1);
console.log(JSON.stringify({passed:true,poses:count,maxTip,maxFlange,maxCalibrationOffsetError:maxCal,wrongParameterError:err,results},null,2));
