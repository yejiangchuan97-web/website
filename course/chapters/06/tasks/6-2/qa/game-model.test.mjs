import test from 'node:test';
import assert from 'node:assert/strict';
import {gripModel,visionModel,correctPose,pressModel,pressStep,suction,level,cycle} from '../src/model.mjs';

test('equal area layouts have equal ideal suction, not equal attitude stability',()=>{
 const grips=['single','dual','quad'].map(layout=>gripModel({layout,offsetY:70}));
 for(const grip of grips)assert(Math.abs(grip.holding-grips[0].holding)<1e-8);
 assert(grips.every(g=>g.capacityOK));
 assert.equal(grips[0].stable,false);assert.equal(grips[1].stable,false);assert.equal(grips[2].ready,true);
});
test('one large cup can lift a clean centered small tile; more cups are not intrinsically better',()=>{
 assert(gripModel({layout:'single',width:250,height:250,mass:3}).ready);
 assert(!gripModel({layout:'single',width:120,height:120,mass:1}).fit);
 assert(!gripModel({layout:'quad',spread:.95}).fit);
});
test('leaking shared circuit reduces every remaining cup pressure; isolation only preserves remaining capacity',()=>{
 const isolated=gripModel({failed:1,isolated:true});
 const shared=gripModel({failed:1,isolated:false});
 assert.equal(isolated.pressure,60);assert(shared.pressure<isolated.pressure);
 assert(isolated.capacityOK);assert(!shared.capacityOK);
 assert(!gripModel({failed:1,isolated:true,offsetX:150,offsetY:150}).stable);
});
test('surface, vacuum, mass, acceleration and edge clearance influence release',()=>{
 assert(!gripModel({vacuum:8}).ready);
 assert(!gripModel({vacuum:15,mass:25}).ready);
 assert(gripModel({surface:'textured'}).holding<gripModel().holding);
 assert(!gripModel({surface:'dusty',mass:1}).ready);
 assert(gripModel({acceleration:4}).required>gripModel({acceleration:1}).required);
});
test('vision needs fresh sufficient features, and checks rotation as well as translation',()=>{
 assert(!visionModel({ex:0,ey:0,angle:1}).aligned);
 assert(visionModel({ex:.2,ey:.2,angle:.1}).aligned);
 for(const visibility of ['partial','blocked']){
  const observation=visionModel({ex:3,ey:2,angle:1,visibility});
  assert(!observation.valid);assert.equal(observation.ex,null);assert.equal(observation.angle,null);
 }
 assert(!visionModel({age:1}).valid);
 assert(visionModel({visibility:'partial',features:3}).valid);
});
test('occlusion prevents automatic correction, while reacquisition restores convergence',()=>{
 const p={ex:8,ey:-5,angle:3};
 assert.deepEqual(correctPose(p,1,'blocked'),p);
 let next=p;for(let i=0;i<300;i++)next=correctPose(next,1/60,'clear');
 assert(visionModel(next).aligned);
});
test('same compression produces different force on different mortar surrogate stiffnesses',()=>{
 assert.equal(pressModel({compression:2,stiffness:80}).force,160);
 assert.equal(pressModel({compression:2,stiffness:160}).force,320);
});
test('force feedback settles, but force alone does not prove level',()=>{
 const run=options=>{let p={};for(let i=0;i<600;i++)p=pressStep(p,options,1/60);return p};
 const normal=run({stiffness:80,targetForce:160});
 const raised=run({stiffness:80,targetForce:160,base:2});
 const hard=run({stiffness:160,targetForce:160});
 assert(normal.passed);assert(Math.abs(normal.force-160)<.1);
 assert(raised.forceOK&&!raised.heightOK&&!raised.passed);
 assert(hard.forceOK&&!hard.heightOK&&!hard.passed);
 assert(hard.compression<normal.compression);
});
test('overpressure persists after backing off; a genuinely new attempt clears the history',()=>{
 let p={};for(let i=0;i<180;i++)p=pressStep(p,{mode:'position',targetCompression:3,stiffness:160},1/60);
 assert(p.damaged);const peak=p.peakForce;
 for(let i=0;i<600;i++)p=pressStep(p,{mode:'force',targetForce:160,stiffness:80},1/60);
 assert(p.damaged&&!p.passed);assert.equal(p.peakForce,peak);
 let retry={};for(let i=0;i<600;i++)retry=pressStep(retry,{targetForce:160,stiffness:80},1/60);
 assert(retry.passed);
});
test('time integration behaves consistently at slow and fast frame rates',()=>{
 const run=dt=>{let p={};for(let i=0;i<5/dt;i++)p=pressStep(p,{targetForce:160},dt);return p};
 const a=run(1/30),b=run(1/120);
 assert(Math.abs(a.force-b.force)<.2);assert.equal(a.passed,b.passed);
});
test('legacy demonstrations keep their public contract',()=>{
 assert(suction(60,12).ready);assert(!suction(10,12).ready);
 assert.equal(level(4,2).error,4);
 assert.equal(cycle(4).tileTop,8);
});
