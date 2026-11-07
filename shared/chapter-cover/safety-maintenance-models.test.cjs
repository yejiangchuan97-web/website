const {test}=require('node:test'),assert=require('node:assert/strict');
global.THREE=require('../vendor/three-r160.min.js');
require('../workshop/machines.js');require('../workshop/machine-models.js');require('./safety-maintenance-models.js');

test('safety exhibit has separate visible safety objects and finite, static geometry',()=>{
 const model=CourseMachines.make('safety-exhibit'),T=THREE;
 assert.deepEqual(model.parts.map(p=>p.id),['helmet','barrier','warning','stop']);
 let meshCount=0;
 model.root.traverse(node=>{if(node.isMesh){meshCount++;assert(node.geometry.attributes.position.count>0);}});
 assert(meshCount>25);
 model.pose(0);
 const original=model.parts.map(p=>p.node.matrixWorld.toArray());
 for(const time of [0,1,10,60]){
  model.pose(time);
  const box=new T.Box3().setFromObject(model.root);
  assert(!box.isEmpty());assert([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
  assert.deepEqual(model.parts.map(p=>p.node.matrixWorld.toArray()),original);
 }
 const materials=new Set(),geometries=new Set();model.root.traverse(n=>{if(n.material)materials.add(n.material);if(n.geometry)geometries.add(n.geometry);});
 let disposedMaterials=0,disposedGeometries=0;
 materials.forEach(m=>m.addEventListener('dispose',()=>disposedMaterials++));geometries.forEach(g=>g.addEventListener('dispose',()=>disposedGeometries++));
 model.dispose();assert.equal(disposedMaterials,materials.size);assert.equal(disposedGeometries,geometries.size);
});
