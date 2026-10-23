/* Real Three.js matrices and actual robot geometry, without a fake geometry model.
 * This proves endpoint/plane invariants, not screenshot quality or collision-free
 * pipe routing. Run from any cwd: node qa/hero-geometry-check.mjs. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const qa=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(qa),require=createRequire(import.meta.url);
const T=require(path.resolve(root,'../公共资源/vendor/three-r160.min.js'));
const document={createElement(){return {width:0,height:0,getContext(){return {fillStyle:'',font:'',fillRect(){},fillText(){}};}};}};
const context={window:{},document,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'src/robot3d.js'),'utf8'),context);
const robot=context.window.createTilingRobot(T),report={generated:new Date().toISOString(),renderer:'Three.js r160',cases:0,maxJointError:0,maxCupPlaneError:0,maxHoseEndpointError:0,maxReach:0,counts:{},checks:[],limitations:['Does not prove collision clearance along flexible hoses.','Does not replace desktop/mobile/4x visual inspection.','Does not claim the SVG Anatomy audit was run for Three.js.']};
for(const layout of ['single','dual','quad'])for(const [x,z] of [[-.5,-.65],[.6,.35],[.62,.33]])for(const y of [.1,.3,.014])for(const yaw of [0,4,-4])for(const tilt of [0,9])for(const offsetY of [0,110]){
  const tile={x,z,y,yaw,tilt};robot.update({tile,layout,spread:.6,offsetY,visibility:'clear',force:160});const stats=robot.getStats();
  report.maxJointError=Math.max(report.maxJointError,stats.jointErrors.upper,stats.jointErrors.lower);report.maxReach=Math.max(report.maxReach,stats.pose.reach);
  const normal=new T.Vector3(0,1,0).applyEuler(new T.Euler(0,yaw*Math.PI/180,tilt*Math.PI/180,'YXZ'));
  for(const p of stats.pose.cupContacts){const d=new T.Vector3(...p).sub(new T.Vector3(x,y,z));report.maxCupPlaneError=Math.max(report.maxCupPlaneError,Math.abs(normal.dot(d)));}
  report.maxHoseEndpointError=Math.max(report.maxHoseEndpointError,new T.Vector3(...stats.hose.end).distanceTo(new T.Vector3(...stats.hose.portEnd)));
  assert.equal(stats.pose.cupContacts.length,{single:1,dual:2,quad:4}[layout]);assert.ok(stats.pose.reach<stats.pose.reachLimit);report.cases++;
}
assert.ok(report.maxJointError<1e-10);assert.ok(report.maxCupPlaneError<1e-10);assert.ok(report.maxHoseEndpointError<1e-10);
report.checks.push('324 normal poses: link lengths fixed, wrist reachable, suction lips coplanar with tile, hose ends on ports.');
for(const layout of ['single','dual','quad'])for(const spread of [.15,.6,.9]){robot.update({tile:{x:.6,z:.35,y:.014,yaw:3,tilt:0},layout,spread,offsetY:0,visibility:'blocked',force:280,exploded:true});const s=robot.getStats();assert.ok(s.jointErrors.upper<1e-10&&s.jointErrors.lower<1e-10);assert.ok(new T.Vector3(...s.hose.end).distanceTo(new T.Vector3(...s.hose.portEnd))<1e-10);report.cases++;}
report.checks.push('9 service poses: layout/spread/extreme force/explode keep IK and supply-port attachment.');
robot.update({tile:{x:-.5,z:-.65,y:.15,yaw:0,tilt:9},toolTilt:0,layout:'quad',spread:.6,visibility:'clear'});
const fail=robot.getStats();assert.ok(fail.pose.cupContacts.every(p=>Math.abs(p[1]-.15)<1e-10));report.checks.push('Failed low lift can keep tool level while tile tilts independently.');report.cases++;
for(const toolLift of [0,.045,.09,.135,.18]){robot.update({tile:{x:.6,z:.35,y:.014,yaw:0,tilt:0},layout:'quad',spread:.6,visibility:'clear',attached:false,toolLift});const s=robot.getStats();assert.ok(Math.abs(s.pose.head[1]-(.014+toolLift))<1e-12);assert.ok(s.jointErrors.upper<1e-10&&s.jointErrors.lower<1e-10);report.cases++;}report.checks.push('Five release poses: tool withdrawal is continuous and tile reference height stays fixed.');
for(const toolLift of [.18,.09,0]){robot.update({tile:{x:.6,z:.35,y:.014,yaw:0,tilt:0},layout:'quad',spread:.6,visibility:'clear',attached:true,toolLift});assert.ok(Math.abs(robot.getStats().pose.head[1]-(.014+toolLift))<1e-12);report.cases++;}report.checks.push('Three re-contact poses: an explicit toolLift overrides the attachment flag.');
report.counts={robotMeshes:robot.getStats().meshes,assemblies:robot.getStats().assemblies};robot.destroy();
// Render transport is stubbed here; matrices, meshes, pose code and material
// layers remain the actual scene. This adds contact tests, not a WebGL claim.
const canvas={style:{},setAttribute(){},addEventListener(){},remove(){}};
class Renderer {constructor(){this.domElement=canvas;this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};this.info={render:{calls:0,triangles:0},memory:{geometries:0}};}setPixelRatio(){}setSize(){}render(){}dispose(){}}
const context2={window:{THREE:{...T,WebGLRenderer:Renderer}},document:{hidden:false,body:{dataset:{theme:'light'}},addEventListener(){},removeEventListener(){},createElement(){return {width:0,height:0,getContext(){return {fillStyle:'',font:'',fillRect(){},fillText(){},beginPath(){},moveTo(){},bezierCurveTo(){},stroke(){}};}};}},console,matchMedia:()=>({matches:false,addEventListener(){},removeEventListener(){}}),location:{search:''},devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}},IntersectionObserver:class{observe(){}disconnect(){}}};
vm.createContext(context2);for(const f of ['robot3d.js','scene3d.js'])vm.runInContext(fs.readFileSync(path.join(root,'src',f),'utf8'),context2);
const scene=context2.window.createTilingScene({clientWidth:1000,clientHeight:550,appendChild(){}});let minimumCorner=Infinity,minimumCupClearance=Infinity;
for(const layout of ['single','dual','quad'])for(const offsetY of [-220,0,220])for(const spread of [.15,.6,.9]){
  scene.update({stage:'grip',layout,offsetY,offsetX:0,spread,failed:1,peel:true,toolTilt:0,tile:{x:-.5,z:-.65,y:.18,yaw:3,tilt:4},visibility:'clear'});const stats=scene.stats(),pose=stats.renderedTile,position=new T.Vector3(...pose.position),q=new T.Quaternion(...pose.quaternion),inv=q.clone().invert();
  for(const x of [-.3,.3])for(const z of [-.3,.3]){const p=new T.Vector3(x,-.01,z).applyQuaternion(q).add(position);minimumCorner=Math.min(minimumCorner,p.y);assert.ok(p.y>.09,'peeling tile clears the stack pad');}
  const radius=layout==='single'?.08:layout==='dual'?.08/Math.sqrt(2):.04;
  for(const [index,c] of stats.robot.pose.cupContacts.entries()){if(index===stats.robot.pose.cupContacts.length-1&&layout!=='single')continue;for(let i=0;i<12;i++){const a=i*Math.PI/6,offset=new T.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius).applyAxisAngle(new T.Vector3(0,1,0),3*Math.PI/180),local=new T.Vector3(...c).add(offset).sub(position).applyQuaternion(inv);minimumCupClearance=Math.min(minimumCupClearance,local.y);assert.ok(local.y>-1e-10,'tile peels below the active sealing lips');}}
  report.cases++;
}
scene.update({peel:false,showRuler:true,base:1,compression:2,tile:{x:.6,z:.35,y:.015,yaw:0,tilt:0},stage:'press'});scene.setView('section');const section=scene.stats().section;assert.ok(Math.abs(section.top-.12)<1e-12);assert.ok(Math.abs(section.gap-.008)<1e-12);assert.equal(section.straightedge,true);
for(const clearance of [.08,.03,0]){scene.update({stage:'press',base:1,compression:0,showRuler:false,attached:true,toolLift:0,tile:{x:.6,z:.35,y:.017+clearance,yaw:0,tilt:0}});const s=scene.stats().section;assert.ok(Math.abs(s.freeGap-clearance)<1e-12,'free travel stays at actual scale');assert.ok(Math.abs(s.top-(.017*8+clearance))<1e-12,'re-preparation and landing move the section brick');assert.ok(Math.abs(s.loadContactHeight-s.top)<1e-12,'attached pressure foot stays on the moving brick');report.cases++;}
scene.update({stage:'press',base:0,compression:2,attached:false,toolLift:.18,tile:{x:.6,z:.35,y:.014,yaw:0,tilt:0}});const releasedSection=scene.stats().section;assert.ok(Math.abs(releasedSection.top-.112)<1e-12);assert.ok(Math.abs(releasedSection.loadContactHeight-releasedSection.top-.18)<1e-12,'tool withdrawal adds its own clearance without lifting the brick');report.cases++;
scene.update({stage:'grip',base:0,compression:0,attached:true,toolLift:0,tile:{x:-.5,z:-.65,y:.10,yaw:0,tilt:0}});const sourceSection=scene.stats().section;assert.equal(sourceSection.freeGap,0);assert.ok(Math.abs(sourceSection.top-.128)<1e-12,'the source stack height is not imported into the laying section');report.cases++;
for(const base of [1,2,3]){scene.update({stage:'press',base,compression:2,attached:true,toolLift:0,tile:{x:.6,z:.35,y:.014+base/1000,yaw:0,tilt:0}});const s=scene.stats(),support=s.substrate;assert.equal(support.raised,true);assert.ok(Math.abs(support.mainBottom)<1e-12&&Math.abs(support.sectionBottom)<1e-12,'local substrate joins the original floor without a void');assert.ok(Math.abs(support.mainTop-support.mainMortarBottom)<1e-12,'real-scale substrate top touches mortar bottom');assert.ok(Math.abs(support.sectionTop-support.sectionMortarBottom)<1e-12,'enlarged substrate top touches section mortar bottom');assert.ok(Math.abs(s.section.top-(.014+base/1000)*8)<1e-12,'filling the substrate leaves the tile top unchanged');report.cases++;}
scene.update({base:0,tile:{y:.014}});assert.equal(scene.stats().substrate.raised,false);report.cases++;report.checks.push('Four local-substrate cases: positive rises join floor and mortar flush in both views; zero rise is hidden and tile elevations are unchanged.');
report.checks.push('27 peel poses: all bottom corners clear the supply stack; remaining cup lips stay above the peeling tile.');report.checks.push('Raised base: section top 15 mm, reference 14 mm, actual ruler gap equals 1 mm ×8.');report.checks.push('Five section-motion cases: re-preparation and landing preserve real free travel, withdrawal lifts only the tool, grip stage excludes stack height.');report.peel={minimumCorner,minimumCupClearance};report.cases++;report.counts.sceneMeshes=scene.stats().meshCount;scene.destroy();
fs.writeFileSync(path.join(qa,'hero-geometry.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.cases,maxJointError:report.maxJointError,maxCupPlaneError:report.maxCupPlaneError,maxHoseEndpointError:report.maxHoseEndpointError,maxReach:report.maxReach,robotMeshes:report.counts.robotMeshes,peel:report.peel}));
