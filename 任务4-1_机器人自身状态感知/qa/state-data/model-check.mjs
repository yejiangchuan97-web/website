import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {DEFAULT,stateAt,stateTrace,roadAt,dataSpecs} from '../../src/state-model.mjs';
const tests=[];const close=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
for(const axis of ['pitch','roll'])for(const a of [-20,-12,0,12,20]){const s=stateAt({...DEFAULT,tilt:a,tiltAxis:axis},5);close(Math.hypot(...s.raw),9.81);close(s.tilt,a);close(s.angular,0);}
tests.push('静态三轴合量、正负倾角与保持阶段变化率');
for(const speed of [.2,.4,.8]){const c={...DEFAULT,case:'drive',speed,gravity:false};close(stateAt(c,4).ax,0);close(stateAt(c,4).speed,speed);assert.ok(stateAt(c,6).ax<0);close(stateAt(c,8).pos,4*speed);close(stateAt(c,8).speed,0);for(const t of [1.5,2,3.5,4,5.5,6]){const h=.0001,p=stateAt(c,t),l=stateAt(c,t-h),r=stateAt(c,t+h);close((r.pos-l.pos)/(2*h),p.speed);close((r.speed-l.speed)/(2*h),p.ax);}}
tests.push('起步、匀速、制动和停车；速度位移解析导数一致');
for(const D of [1,4]){const c={...DEFAULT,case:'turn',turnDuration:D};const rows=stateTrace(c);let area=0;for(let i=1;i<rows.length;i++)area+=(rows[i].omega+rows[i-1].omega)*.005;close(area,90,.01);close(stateAt(c,8).yaw,90);close(stateAt(c,8).omega,0);}
tests.push('快慢转角速度积分均为90度，停止后方向不归零');
let peak=0;for(const x of [-.9,-.75,-.4,-.1,.2,.6,.79,.9]){const h=.00001,p=roadAt(x,2),l=roadAt(x-h,2),r=roadAt(x+h,2);close((r.height-l.height)/(2*h),p.first,1e-5);close((r.height-2*p.height+l.height)/h**2,p.second,1e-4);}
for(const s of stateTrace({...DEFAULT,case:'bump',roughness:2,gravity:false})){peak=Math.max(peak,Math.abs(s.az));close(stateAt({...DEFAULT,case:'bump',roughness:1,gravity:false},s.t).az*2,s.az);close(stateAt({...DEFAULT,case:'bump',roughness:0},s.t).az,0);}
tests.push('路面位移二阶导数与加速度一致，起伏对照幅值一致');
for(const id of ['slope','drive','bump','turn'])for(const gravity of [true,false]){const c={...DEFAULT,case:id,gravity,roughness:2,tilt:20,speed:.8,turnDuration:1};for(const spec of dataSpecs(c))for(const s of stateTrace(c)){for(const v of spec.axes?s.acc:[spec.value(s)])assert.ok(v>=spec.domain[0]-1e-6&&v<=spec.domain[1]+1e-6,`${id} ${spec.key}: ${v}`);}}
tests.push('固定曲线范围覆盖全部可调条件');
writeFileSync(new URL('model-check.json',import.meta.url),JSON.stringify({passed:tests.length,tests,bumpPeak:peak},null,2));console.log({passed:tests.length,tests,bumpPeak:peak});
