export const SETTINGS={cups:4,diameter:.08,mass:12,gravity:9.81,acceleration:1,safety:2,targetHeight:14,tileThickness:10,initialGlue:6,stiffness:80,visionTolerance:.5};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export function suction(vacuum=60,mass=12,leak=false){
 const cups=leak?3:4,area=cups*Math.PI*(SETTINGS.diameter/2)**2;
 const holding=vacuum*1000*area,required=SETTINGS.safety*mass*(SETTINGS.gravity+SETTINGS.acceleration);
 return {cups,area,holding,required,ratio:holding/required,ready:holding>=required};
}
export function visionStep(ex,ey,enabled,visible,dt){const f=enabled&&visible?Math.exp(-1.3*dt):1;return {ex:ex*f,ey:ey*f}}
export function level(base=0,compression=2){const glue=SETTINGS.initialGlue-compression,force=SETTINGS.stiffness*compression,finish=base+glue+SETTINGS.tileThickness;return {base,glue,force,finish,error:finish-SETTINGS.targetHeight}}
export function cycle(t){
 t=clamp(t,0,5);let x=-90,top=16,tileTop=16,phase=Math.min(4,Math.floor(t));
 if(t<1)top=42-26*smooth(t);
 else if(t<2)top=16+34*smooth(t-1);
 else if(t<3){x=-90+115*smooth(t-2);top=50}
 else if(t<4){x=25;top=50-42*smooth(t-3)}
 else {x=25;top=8+34*smooth(t-4)}
 if(t>=1&&t<4)tileTop=top;else if(t>=4)tileTop=8;
 return {x,top,tileX:t<1?-90:t>=4?25:x,tileTop,phase,attached:t>=1&&t<4};
}

// All limits below belong to this classroom model, not an equipment specification.
export const GAME_SETTINGS = Object.freeze({
 forceMin:120, forceMax:200, forceTolerance:8, damageForce:280,
 maxCompression:4, heightTolerance:.5, angleTolerance:.25,
 staleAfter:.35, holdTime:1.2, targetHeight:14
});

export const GRIP_LAYOUTS = Object.freeze({
 single:{count:1,diameter:160,label:'单个大吸盘'},
 dual:{count:2,diameter:80*Math.sqrt(2),label:'两个小吸盘'},
 quad:{count:4,diameter:80,label:'四个小吸盘'}
});

/** Equal total nominal area isolates layout from suction capacity.
 * Positions and offsets are mm. A conservative support envelope is a teaching
 * surrogate for moment resistance, not a manufacturer's certified torque curve.
 */
export function gripModel(options={}) {
 const {layout='quad',surface='smooth',isolated=true}=options;
 const spec=GRIP_LAYOUTS[layout]||GRIP_LAYOUTS.quad;
 const vacuum=clamp(Number(options.vacuum??60),0,100);
 const mass=Math.max(.1,Number(options.mass??12));
 const acceleration=Math.max(0,Number(options.acceleration??1));
 const width=Math.max(1,Number(options.width??600));
 const height=Math.max(1,Number(options.height??600));
 const spread=clamp(Number(options.spread??.6),0,1);
 const offsetX=Number(options.offsetX??0),offsetY=Number(options.offsetY??0);
 const failed=Math.round(clamp(Number(options.failed??0),0,spec.count));
 const sx=width*spread/2,sy=height*spread/2;
 const xy=spec.count===1?[[0,0]]:spec.count===2?[[-sx,0],[sx,0]]:[[-sx,-sy],[sx,-sy],[-sx,sy],[sx,sy]];
 const positions=xy.map(([x,y],i)=>({x,y,radius:spec.diameter/2,active:i<spec.count-failed}));
 const sealFactor=({smooth:1,textured:.65,dusty:.22})[surface]??1;
 // An unisolated open cup leaks into the common manifold; the resulting pressure
 // depends on pump/flow in reality. 0.18 is explicitly a scenario assumption.
 const pressure=vacuum*sealFactor*(failed&&!isolated?.18:1);
 const area=spec.count*Math.PI*(spec.diameter/2000)**2;
 const activeArea=(spec.count-failed)*Math.PI*(spec.diameter/2000)**2;
 const holding=pressure*1000*activeArea;
 const required=SETTINGS.safety*mass*(SETTINGS.gravity+acceleration);
 const ratio=holding/required;
 const fit=positions.every(p=>Math.abs(p.x)+p.radius<=width/2&&Math.abs(p.y)+p.radius<=height/2);
 const active=positions.filter(p=>p.active);
 let supportMargin=-Infinity;
 if(active.length){
  supportMargin=Infinity;
  // Projection test of the convex contact envelope catches a missing corner,
  // unlike a bounding rectangle, which would overstate stability with 3 cups.
  for(let i=0;i<64;i++){
   const a=i*Math.PI/32,ux=Math.cos(a),uy=Math.sin(a);
   const reach=Math.max(...active.map(p=>p.x*ux+p.y*uy+p.radius*.5));
   supportMargin=Math.min(supportMargin,reach-offsetX*ux-offsetY*uy);
  }
 }
 const stable=supportMargin>=5;
 const sealReliable=surface!=='dusty';
 const capacityOK=ratio>=1;
 const ready=fit&&capacityOK&&stable&&sealReliable;
 let reason='吸力、布置与密封检查通过，可以低位试提。';
 if(!fit)reason='吸盘越出砖边，密封唇无法完整贴合。缩小间距或更换吸盘。';
 else if(!sealReliable)reason='表面灰尘造成持续漏气。先清洁砖面和密封唇，再重新试吸。';
 else if(!capacityOK)reason=failed&&!isolated?'一个吸盘漏气拖低了共用气路的压差。隔离故障并重新核验余量。':'有效吸力不足以覆盖含安全余量的搬运需求。';
 else if(!stable)reason='总吸力够，但重心偏离有效支承区，砖容易倾斜、翘边。调整布局或对准重心。';
 return {layout,count:spec.count,diameter:spec.diameter,area,activeArea,pressure,holding,required,ratio,
  positions,failed,fit,stable,sealReliable,capacityOK,ready,supportMargin,reason};
}

/** A camera reports an observation only while it has enough fresh features. */
export function visionModel(pose={}) {
 const visibility=pose.visibility??'clear';
 const features=clamp(pose.features??(visibility==='clear'?4:visibility==='partial'?2:0),0,4);
 const age=Math.max(0,pose.age??0);
 const valid=visibility!=='blocked'&&features>=3&&age<=GAME_SETTINGS.staleAfter;
 const ex=Number(pose.ex??0),ey=Number(pose.ey??0),angle=Number(pose.angle??0);
 const aligned=valid&&Math.abs(ex)<=SETTINGS.visionTolerance&&Math.abs(ey)<=SETTINGS.visionTolerance&&Math.abs(angle)<=GAME_SETTINGS.angleTolerance;
 const confidence=visibility==='blocked'?0:features/4*Math.exp(-age*2);
 let reason=aligned?'位置与转角均进入本关允许窗口。':'还需要修正位置或转角。';
 if(!valid)reason=age>GAME_SETTINGS.staleAfter?'上一帧已经过期，不能当作当前位置。重新识别后再纠偏。':visibility==='blocked'?'相机完全被遮挡，没有实时位置依据。保持位置，清除遮挡并重新识别。':'可见边角不足，位置或角度不可信。保持位置，恢复足够特征后再纠偏。';
 return {valid,aligned,confidence,features,age,ex:valid?ex:null,ey:valid?ey:null,angle:valid?angle:null,reason};
}

export function correctPose(pose,dt,visibility=pose.visibility??'clear') {
 const valid=visionModel({...pose,visibility}).valid;
 if(!valid)return {...pose};
 const f=Math.exp(-1.8*Math.max(0,dt));
 return {...pose,ex:(pose.ex??0)*f,ey:(pose.ey??0)*f,angle:(pose.angle??0)*f};
}

/** Linear spring substitute: no mortar rheology, adhesion or void prediction. */
export function pressModel(options={}) {
 const compression=clamp(Number(options.compression??0),0,GAME_SETTINGS.maxCompression);
 const stiffness=Math.max(1,Number(options.stiffness??80));
 const base=Number(options.base??0);
 const targetForce=Number(options.targetForce??160);
 const force=stiffness*compression;
 const glue=SETTINGS.initialGlue-compression;
 const finish=base+glue+SETTINGS.tileThickness;
 const error=finish-GAME_SETTINGS.targetHeight;
 const peakForce=Math.max(Number(options.peakForce??0),force);
 const damaged=Boolean(options.damaged)||peakForce>GAME_SETTINGS.damageForce;
 const forceOK=force>=GAME_SETTINGS.forceMin&&force<=GAME_SETTINGS.forceMax;
 const heightOK=Math.abs(error)<=GAME_SETTINGS.heightTolerance;
 const onTarget=Math.abs(force-targetForce)<=GAME_SETTINGS.forceTolerance;
 const settledTime=Math.max(0,Number(options.settledTime??0));
 const stable=settledTime>=GAME_SETTINGS.holdTime;
 const passed=forceOK&&heightOK&&stable&&!damaged;
 let reason='继续观察力与完成面标高。';
 if(damaged)reason='本次压实曾超过教学力上限，存在过压风险。退回并重新准备铺贴层后再试。';
 else if(force<GAME_SETTINGS.forceMin)reason='压实力偏小，未进入本关压实窗口。继续缓慢压入。';
 else if(force>GAME_SETTINGS.forceMax)reason='压实力偏大，停止继续下压并减小压入量。';
 else if(!heightOK)reason=error>0?'压力已经合适，但完成面仍偏高。检查基层和铺贴层，不能只盯住力。':'压力已经合适，但完成面偏低。检查铺贴层厚度与压入量。';
 else if(!stable)reason='力与标高已进入窗口，还需稳定保持。';
 else reason='力与标高均通过本关检查；粘结与空鼓仍需后续实体复核。';
 return {compression,stiffness,base,targetForce,force,glue,finish,error,peakForce,damaged,
  forceOK,heightOK,onTarget,settledTime,stable,passed,reason};
}

/** A rate-limited compliant Z controller: force error changes descent speed.
 * A fixed position is deliberately insensitive to stiffness. A force controller
 * changes its compression as stiffness changes, illustrating the feedback loop.
 */
export function pressStep(previous={},options={},dt=1/60) {
 const duration=clamp(Number(dt),0,5);
 const n=Math.max(1,Math.ceil(duration/.02)),h=duration/n;
 const stiffness=Math.max(1,Number(options.stiffness??previous.stiffness??80));
 const base=Number(options.base??previous.base??0);
 const targetForce=Number(options.targetForce??160);
 const targetCompression=clamp(Number(options.targetCompression??2),0,GAME_SETTINGS.maxCompression);
 const mode=options.mode??'force';
 let compression=Number(previous.compression??0),peakForce=Number(previous.peakForce??0);
 let settledTime=Number(previous.settledTime??0),damaged=Boolean(previous.damaged);
 for(let i=0;i<n;i++){
  const force=stiffness*compression;
  peakForce=Math.max(peakForce,force);
  damaged=damaged||peakForce>GAME_SETTINGS.damageForce;
  const velocity=mode==='position'?clamp((targetCompression-compression)*3,-1.5,1.5):clamp((targetForce-force)*.018,-1.5,1.5);
  compression=clamp(compression+velocity*h,0,GAME_SETTINGS.maxCompression);
  const p=pressModel({compression,stiffness,base,targetForce,peakForce,damaged});
  peakForce=p.peakForce;damaged=p.damaged;
  settledTime=p.forceOK&&p.heightOK&&Math.abs(velocity)<.08?settledTime+h:0;
 }
 return {...pressModel({compression,stiffness,base,targetForce,peakForce,damaged,settledTime}),
  mode,elapsed:(previous.elapsed??0)+duration};
}
