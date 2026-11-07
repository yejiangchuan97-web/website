const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
global.THREE=require('../vendor/three-r160.min.js');global.window=global;
global.document={currentScript:{src:'file:///C:/course/shared/workshop/robots.js'}};
require('./robots.js');require('./robot-parts.js');
test('Sharpa source fingers move independently, reset, and keep hotspots on their assemblies',()=>{
 const m=CourseRobotParts.enhance(CourseRobots.parseGLB(fs.readFileSync(path.join(__dirname,'../models/robots/sharpa.glb')).toString('base64'),'sharpa'),'sharpa');
 const names=['index','middle','ring','pinky','thumb'];
 const tip=id=>m.nodes.find(n=>n.name==='right_'+id+'_DP').getWorldPosition(new THREE.Vector3());
 m.pose(0);const initial=names.map(tip);
 for(let i=0;i<names.length;i++){
  m.pose(0,{manual:Object.fromEntries(names.map(id=>[id,id===names[i]?100:0]))});
  names.forEach((id,j)=>assert(j===i?tip(id).distanceTo(initial[j])>.15:tip(id).distanceTo(initial[j])<1e-6,id+' independence'));
  m.root.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)));
  for(const p of m.parts)assert(p.node.getWorldPosition(new THREE.Vector3()).distanceTo(new THREE.Box3().setFromObject(p.body).getCenter(new THREE.Vector3()))<1e-6);
 }
 m.setExplode(1);m.pose(2);const apart=tip('index');for(let i=0;i<10;i++)m.pose(2);assert(tip('index').distanceTo(apart)<1e-6);
 m.setExplode(0);m.pose(0);names.forEach((id,i)=>assert(tip(id).distanceTo(initial[i])<1e-6));m.dispose();
});
