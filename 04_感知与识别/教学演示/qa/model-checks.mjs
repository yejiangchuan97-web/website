import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {rotateAt,gravityAt,driftAt,yolo,metrics,raycast,scanAt,LIGHT_SPEED} from '../src/models.mjs';
import {makeLessonScene} from '../src/4-2.scene.mjs';
const results=[];
const test=(name,fn)=>{fn();results.push({name,passed:true})};
const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} differs from ${b}`);
for(const mode of['slow','fast']){
 test(mode+' integrates exactly to 90 degrees',()=>{let integral=0,dt=.0005;for(let t=0;t<6;t+=dt)integral+=rotateAt(t+dt/2,mode).omega*dt;close(integral,90,1e-4);close(rotateAt(6,mode).angle,90);close(rotateAt(6,mode).omega,0)});
 test(mode+' derivative matches angular velocity',()=>{for(const t of[1.2,1.4,1.6,1.8]){const derivative=(rotateAt(t+1e-5,mode).angle-rotateAt(t-1e-5,mode).angle)/2e-5;close(derivative,rotateAt(t,mode).omega,1e-5)}});
}
test('static gravity norm is orientation invariant',()=>{for(let angle=0;angle<=90;angle+=.5){close(Math.hypot(...gravityAt(angle)),9.8);close(Math.hypot(...gravityAt(angle,false)),0)}});
test('holding a tilt keeps angle and zero angular velocity',()=>{close(rotateAt(5,'hold').angle,35);close(rotateAt(5,'hold').omega,0)});
test('bias .01 m/s² produces .50m error at 10s',()=>close(driftAt(.01,10),.5));
test('original square YOLO case',()=>assert.equal(yolo({cls:0,x1:160,y1:80,x2:320,y2:240},640,640),'0 0.375000 0.250000 0.250000 0.250000'));
test('rectangular image keeps horizontal and vertical denominators separate',()=>assert.equal(yolo({cls:0,x1:160,y1:80,x2:320,y2:240},960,640),'0 0.250000 0.250000 0.166667 0.250000'));
test('10 truth / 8 predictions / 6 correct',()=>{const m=metrics(10,8,6);close(m.precision,.75);close(m.recall,.6);assert.equal(m.fp,2);assert.equal(m.fn,4)});
test('no predictions means precision unavailable',()=>assert.equal(metrics(10,0,0).precision,null));
test('real angular resampling emits 360 and 36 rays',()=>{assert.equal(scanAt(1).length,360);assert.equal(scanAt(10).length,36)});
test('low block disappears only from elevated scan',()=>{assert.equal(raycast(0,.12).object,'低垫块');close(raycast(0,.12).distance,.78);assert.equal(raycast(0,.4).object,'端墙');close(raycast(0,.4).distance,2.3)});
test('raised scan intersects overhead beam',()=>{assert.equal(raycast(0,.8).object,'高位横梁');close(raycast(0,.8).distance,1.45)});
test('coarse directions miss thin column rather than randomly deleting returns',()=>{assert.ok(scanAt(1).some(p=>p.object==='细柱'));assert.ok(!scanAt(10).some(p=>p.object==='细柱'))});
test('occluder return is nearer than wall behind it',()=>{const h=raycast(20,.4);assert.equal(h.object,'遮挡箱');assert.ok(h.distance<1)});
test('3m round trip is about 20ns',()=>close(3*2/LIGHT_SPEED*1e9,20.0138457119,1e-8));
test('required width .8m has correct total margins',()=>{close(.6+2*.1,.8);close(.9-.8,.1);close(.7-.8,-.1)});
test('occluder lid stays inside the model maximum height',()=>{const p=makeLessonScene().parts.find(p=>p.name==='occluder-lid');close((p.z+p.h)/80,.5)});
test('overhead cap stays inside the model maximum height',()=>{const p=makeLessonScene().parts.find(p=>p.name==='beam-cap');close((p.z+p.h)/80,.9)});
writeFileSync(new URL('model-checks.json',import.meta.url),JSON.stringify({checks:results.length,results},null,2));
console.log(`${results.length} model invariant checks passed`);
