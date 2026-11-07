import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as M from "../src/model.mjs";

const outcomes = [];
let assertions = 0;
function check(name, callback) {
  const before = assertions;
  callback();
  outcomes.push({ name, assertions: assertions - before, status: 'passed' });
}
function ok(condition, message) { assertions++; assert.ok(condition, message); }
function near(a, b, epsilon = 1e-9, message = `${a} ≈ ${b}`) { ok(Math.abs(a - b) <= epsilon, message); }
function same(a, b, message) { assertions++; assert.deepEqual(a, b, message); }
const vsub = (a, b) => a.map((v, i) => v - b[i]);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

check('有限目标、最近回波和开放方向', () => {
  const ray = M.rayFor({ position: 'A', height: 0.7, channels: 1, angle: 0 });
  same(ray.objectId, 'crate');
  near(ray.distance, 1.8);
  same(ray.point, [-0.5, -0.6, 0.7]);
  const wall = M.castRay({ origin: [2.5, 0, 0.7], direction: [2, 0, 0] });
  same(wall.objectId, 'back-wall'); near(wall.distance, 0.65);
  const side = M.rayFor({ position: 'A', height: 0.7, channels: 1, angle: 90 });
  same(side.objectId, 'side-wall'); near(side.distance, 2.65);
  const floor = M.castRay({ origin: [0, -1.9, 0.7], direction: [0, 0, -7] });
  same(floor.objectId, 'floor'); near(floor.distance, 0.7);
  for (const ray of [
    M.rayFor({ position: 'A', height: 0.7, channels: 1, angle: 180 }),
    M.castRay({ origin: [5, 0, 0.7], direction: [0, 0, -1] }),
    M.castRay({ origin: [0, -3, 3], direction: [1, 0, 0] }),
    M.castRay({ origin: [-2.3, -0.6, 0.7], direction: [1, 0, 0], maxRange: 1 }),
  ]) {
    same(ray.hit, false);
    for (const key of ['distance', 'truthDistance', 'point', 'truthPoint', 'local', 'timeNs', 'objectId']) same(ray[key], null, `miss:${key}`);
  }
});

check('有限圆柱侧面、顶盖、起点在内部和相切', () => {
  const objects = [{ id: 'c', type: 'cylinder', center: [0, 0], radius: 1, zMin: 0, zMax: 2 }];
  const examples = [
    { origin: [-3, 0, 1], direction: [1, 0, 0], distance: 2 },
    { origin: [0, 0, 3], direction: [0, 0, -1], distance: 1 },
    { origin: [0, 0, 1], direction: [1, 0, 0], distance: 1 },
    { origin: [-3, 1, 1], direction: [1, 0, 0], distance: 3 },
  ];
  for (const example of examples) {
    const ray = M.castRay({ ...example, objects });
    ok(ray.hit); near(ray.distance, example.distance);
  }
  ok(!M.castRay({ origin: [-3, 0, 2.1], direction: [1, 0, 0], objects }).hit);
  const box = [{ id: 'b', type: 'box', min: [-1, -1, 0], max: [1, 1, 2] }];
  near(M.castRay({ origin: [0, 0, 1], direction: [0, 1, 0], objects: box }).distance, 1);
  ok(!M.castRay({ origin: [-2, 1.1, 1], direction: [1, 0, 0], objects: box }).hit);
});

// Independent reference: triangles and Möller–Trumbore, not the model's slab /
// analytic-cylinder implementation. Cylinders are inscribed 256-sided meshes.
function referenceMesh(objects) {
  const triangles = [];
  const tri = (id, a, b, c) => triangles.push({ id, a, b, c });
  const quad = (id, a, b, c, d) => { tri(id, a, b, c); tri(id, a, c, d); };
  for (const object of objects) {
    const id = object.id;
    if (object.type === 'box') {
      const [x, y, z] = object.min, [X, Y, Z] = object.max;
      const p = [[x,y,z],[X,y,z],[X,Y,z],[x,Y,z],[x,y,Z],[X,y,Z],[X,Y,Z],[x,Y,Z]];
      for (const face of [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]) quad(id, ...face.map(i => p[i]));
    } else if (object.type === 'plane') {
      const [x,y] = object.min, [X,Y] = object.max, z = object.z;
      quad(id, [x,y,z], [X,y,z], [X,Y,z], [x,Y,z]);
    } else if (object.type === 'cylinder') {
      const [cx,cy] = object.center, n = 256;
      for (let i = 0; i < n; i++) {
        const a = i * Math.PI * 2 / n, b = (i+1) * Math.PI * 2 / n;
        const p = [cx+object.radius*Math.cos(a),cy+object.radius*Math.sin(a),object.zMin];
        const q = [cx+object.radius*Math.cos(b),cy+object.radius*Math.sin(b),object.zMin];
        const P = [p[0],p[1],object.zMax], Q = [q[0],q[1],object.zMax];
        quad(id,p,q,Q,P);
        tri(id,[cx,cy,object.zMin],q,p); tri(id,[cx,cy,object.zMax],P,Q);
      }
    }
  }
  return triangles;
}
function referenceCast(origin, direction, triangles, maxRange) {
  let distance = Infinity, id = null;
  for (const t of triangles) {
    const edge1 = vsub(t.b,t.a), edge2 = vsub(t.c,t.a), h = cross(direction,edge2), det = dot(edge1,h);
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1/det, s = vsub(origin,t.a), u = dot(s,h)*inv;
    if (u < -1e-10 || u > 1+1e-10) continue;
    const q = cross(s,edge1), v = dot(direction,q)*inv;
    if (v < -1e-10 || u+v > 1+1e-10) continue;
    const r = dot(edge2,q)*inv;
    if (r > 1e-8 && r < distance && r <= maxRange) { distance=r;id=t.id; }
  }
  return { hit: Number.isFinite(distance), distance, id };
}
check('600条方向用独立三角网格核验最近命中', () => {
  const triangles = referenceMesh(M.environment());
  let seed = 71517;
  const random = () => { seed = (Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296; };
  for (let i=0;i<600;i++) {
    const state = { position:i%2?'A':'B',height:0.2+random()*1.5,azimuth:random()*360,elevation:-35+random()*70,maxRange:12 };
    const actual = M.castRay(state);
    const reference = referenceCast(actual.origin,actual.direction,triangles,12);
    same(actual.hit,reference.hit,`reference hit ${i}`);
    if (actual.hit) {
      same(actual.objectId,reference.id,`reference object ${i}`);
      near(actual.truthDistance,reference.distance,0.0005,`reference range ${i}`);
    }
  }
});

check('角间距重扫、方位非重复、单层与多层高度覆盖', () => {
  for (const step of [1,2,10]) for (const channels of [1,16]) {
    const result = M.scan({ position:'A',height:0.7,step,channels });
    same(result.emitted,360/step*channels);
    same(result.returned+result.missed,result.emitted);
    same(result.points,result.rays.filter(r=>r.hit));
    ok(result.points.every(point=>result.rays[point.index]===point),'points 保留同一 ray 对象');
    ok(result.rays.every(r=>r.azimuth>=0&&r.azimuth<360));
    ok(new Set(result.rays.map(r=>`${r.azimuth}:${r.elevation}`)).size===result.emitted);
    if(channels===1) ok(result.points.every(p=>Math.abs(p.point[2]-.7)<1e-10));
  }
  const fine=M.scan({position:'A',height:.7,step:1,channels:1});
  const coarse=M.scan({position:'A',height:.7,step:10,channels:1});
  same(fine.points.filter(p=>p.objectId==='thin-pole').map(p=>p.azimuth),[346]);
  same(coarse.points.filter(p=>p.objectId==='thin-pole').length,0);
  const multi=M.scan({position:'A',height:.7,step:2,channels:16});
  ok(multi.points.some(p=>p.objectId==='low-block'));
  ok(!fine.points.some(p=>p.objectId==='low-block'));
  ok(Math.max(...multi.points.map(p=>p.point[2]))>2);
  same(M.elevations(1),[0]); near(M.elevations(16)[0],-20); near(M.elevations(16)[15],20);
});

check('每束XYZ、局部/世界坐标、距离与往返ToF一致',()=>{
  const state={position:'B',height:.9,step:2,channels:16,yaw:23,sigma:.015,seed:7};
  const result=M.scan(state);
  for(const p of result.points){
    const alpha=p.azimuth*Math.PI/180,beta=p.elevation*Math.PI/180,r=p.distance;
    const expected=[r*Math.cos(beta)*Math.cos(alpha),r*Math.cos(beta)*Math.sin(alpha),r*Math.sin(beta)];
    p.local.forEach((v,i)=>near(v,expected[i],1e-10));
    M.transformPoint(p.local,state).forEach((v,i)=>near(v,p.point[i],1e-10));
    near(M.pointDistance(p.point,p.origin),r,1e-10);
    near(p.timeNs*1e-9*M.LIGHT_SPEED/2,r,1e-10);
  }
  const candidate=result.rays[88*16+8];
  const single=M.rayFor({...state,angle:176,channel:8});
  same(single.point,candidate.point); same(single.timeNs,candidate.timeNs);
  const pose={origin:[2,-3,1],yaw:90};
  M.transformPoint([1,2,3],pose).forEach((v,i)=>near(v,[0,-2,4][i]));
  M.worldToLocal(M.transformPoint([1,2,3],pose),pose).forEach((v,i)=>near(v,[1,2,3][i]));
});

check('径向噪声可复现、与间距独立、不删除回波',()=>{
  const base={position:'A',height:.7,step:2,channels:16,seed:13};
  const ideal=M.scan(base), noisy=M.scan({...base,sigma:.03}), again=M.scan({...base,sigma:.03});
  same(noisy,again); same(noisy.returned,ideal.returned);
  ok(noisy.points.some((p,i)=>Math.abs(p.distance-ideal.points[i].distance)>.01));
  const errors=noisy.points.map((point,i)=>point.distance-ideal.points[i].distance);
  const mean=errors.reduce((sum,value)=>sum+value,0)/errors.length;
  const deviation=Math.sqrt(errors.reduce((sum,value)=>sum+(value-mean)**2,0)/errors.length);
  near(mean,0,.005,'径向噪声均值应接近0');
  near(deviation,.03,.005,'σ表示标准差，不表示删点比例或最大误差');
  for(let i=0;i<ideal.rays.length;i++){
    const a=ideal.rays[i],b=noisy.rays[i];
    same(a.hit,b.hit);same(a.objectId,b.objectId);same(a.truthPoint,b.truthPoint);
    if(a.hit){
      const displacement=vsub(b.point,b.origin);
      near(Math.hypot(...cross(displacement,b.direction)),0,1e-10);
    }else same(b.point,null);
  }
  const fine=M.scan({...base,step:1,sigma:.03});
  for(const ray of noisy.rays) same(ray.point,fine.rays[ray.azimuth*16+Math.round((ray.elevation+20)/40*15)].point);
});

check('补扫改变采集位置和可见证据，相机参数不改变采样',()=>{
  const base={height:.7,step:2,channels:16};
  const a=M.scan({...base,position:'A'}),b=M.scan({...base,position:'B'});
  same(M.sensorOrigin({...base,position:'A'}),[-2.3,-.6,.7]);
  same(M.sensorOrigin({...base,position:'B'}),[-.8,-1.4,.7]);
  ok(!a.points.some(p=>p.objectId==='beam'));
  ok(b.points.some(p=>p.objectId==='beam'));
  same(a,M.scan({...base,position:'A',view:'top',cameraAzimuth:250,cameraElevation:75}));
  const p=b.points.find(p=>p.objectId==='beam');
  M.transformPoint(p.local,{...base,position:'B'}).forEach((v,i)=>near(v,p.point[i],1e-10));
  ok(M.pointDistance(M.transformPoint(p.local,{...base,position:'A'}),p.point)>1.6);
});

check('定义隔离、正向量/数值边界',()=>{
  const a=M.environment();a[0].min[0]=-99;a.pop();
  near(M.environment()[0].min[0],3.15);same(M.environment().length,9);
  assertions++;assert.throws(()=>M.castRay({direction:[0,0,0]}),RangeError);
  assertions++;assert.throws(()=>M.scan({step:0}),RangeError);
  assertions++;assert.throws(()=>M.elevations(0),RangeError);
  assertions++;assert.throws(()=>M.pointDistance([NaN,0,0],[0,0,0]),TypeError);
});

const result={status:'passed',generatedAt:new Date().toISOString(),assertions,checks:outcomes};
await writeFile(__taskFile("./model-check-results.json"),JSON.stringify(result,null,2)+'\n','utf8');
console.log(`LiDAR model checks passed: ${outcomes.length} groups, ${assertions} assertions.`);
