const {test}=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../vendor/three-r160.min.js');
require('./machines.js');require('./machine-models.js');require('./six-axis.js');
test('six-axis arm moves articulated joints while its base stays fixed, and resets without drift',()=>{
 const m=CourseMachines.make('six-axis'),T=THREE;
 assert.equal(m.joints.length,6);
 const pose=()=>m.joints.map(j=>j.node.matrixWorld.toArray());
 m.pose(0);const start=pose(),base=m.root.matrixWorld.toArray();
 m.pose(1.7);const moved=pose();
 assert.deepEqual(m.root.matrixWorld.toArray(),base);
 assert(moved.every((matrix,i)=>matrix.some((n,j)=>Math.abs(n-start[i][j])>1e-4)));
 for(const t of [0,.5,2,6,20]){
  m.pose(t);const box=new T.Box3().setFromObject(m.root);
  assert(!box.isEmpty());assert([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
 }
 m.pose(0);assert.deepEqual(pose(),start);m.dispose();
});
