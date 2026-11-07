const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
global.THREE=require('../vendor/three-r160.min.js');
global.window=global;
global.document={currentScript:{src:'file:///C:/course/shared/workshop/robots.js'}};
require('./robots.js');
require('./robot-parts.js');
const T=THREE;
const source=fs.readFileSync(path.join(__dirname,'../models/robots/allegro.glb')).toString('base64');
const make=()=>CourseRobotParts.enhance(CourseRobots.parseGLB(source,'allegro'),'allegro');
const location=(m,name)=>m.nodes.find(n=>n.name===name).getWorldPosition(new T.Vector3());

test('licensed hand has articulated mesh fingers, independent controls, and repeatable reset',()=>{
 const m=make(),root=m.root.matrixWorld.toArray();
 const start=location(m,'ff_tip'),other=location(m,'mf_tip');
 m.pose(0,{manual:{index:100,middle:0,ring:0,thumb:0}});
 assert(location(m,'ff_tip').distanceTo(start)>.4,'index joints visibly bend the fingertip');
 assert(location(m,'mf_tip').distanceTo(other)<1e-7,'independent index control preserves middle finger');
 assert.deepEqual(m.root.matrixWorld.toArray(),root,'action is not a whole-model shake');
 assert.equal(m.readings().find(r=>r.id==='index').value,100);
 m.pose(0);assert(location(m,'ff_tip').distanceTo(start)<1e-7);
 m.setClip(1);m.pose(3);
 assert.equal(m.readings().find(r=>r.id==='index').value,0);
 assert.equal(m.readings().find(r=>r.id==='middle').value,100);
 m.setClip(0);m.pose(0);assert(location(m,'ff_tip').distanceTo(start)<1e-7);
 let meshCount=0;m.root.traverse(n=>{if(n.isMesh){meshCount++;assert(n.geometry.getAttribute('position').count>100);}});
 assert(meshCount>=20,'original palm, fingers and tips have real triangulated meshes');m.dispose();
});

test('hand poses, moving hotspots and repeated exploded views remain finite without drift',()=>{
 const m=make();
 for(const t of [0,.2,2,4,8]){
  m.pose(t);m.root.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)));
  for(const p of m.parts){
   const center=new T.Box3().setFromObject(p.body).getCenter(new T.Vector3());
   assert(p.node.getWorldPosition(new T.Vector3()).distanceTo(center)<1e-7,'hotspot follows its current assembly');
  }
 }
 const manual={index:100,middle:100,ring:100,thumb:100};
 m.pose(0,{manual});const together=location(m,'ff_tip');
 m.setExplode(1);m.pose(0,{manual});const separated=location(m,'ff_tip');
 assert(together.distanceTo(separated)>.1);
 for(let i=0;i<20;i++)m.pose(0,{manual});
 assert(location(m,'ff_tip').distanceTo(separated)<1e-7,'explosion must not accumulate');
 m.setExplode(0);m.pose(0,{manual});assert(location(m,'ff_tip').distanceTo(together)<1e-7);
 m.pose(0,{manual:{index:Infinity,middle:-20,ring:200,thumb:NaN}});
 assert.deepEqual(m.readings().map(r=>r.value),[0,0,100,0]);m.dispose();
});

test('hand resource release disposes every geometry and retained source license is present',()=>{
 const m=make(),geometries=new Set(),materials=new Set();let geometriesReleased=0,materialsReleased=0;
 m.root.traverse(n=>{if(n.isMesh){geometries.add(n.geometry);materials.add(n.material);}});
 geometries.forEach(g=>g.addEventListener('dispose',()=>geometriesReleased++));
 materials.forEach(g=>g.addEventListener('dispose',()=>materialsReleased++));
 m.dispose();assert.equal(geometriesReleased,geometries.size);assert.equal(materialsReleased,materials.size);
 const license=fs.readFileSync(path.join(__dirname,'../models/licenses/allegro.txt'),'utf8');
 assert(license.includes('Copyright (c) 2016, SimLab'));
 assert(license.includes('Redistribution and use in source and binary forms'));
});
