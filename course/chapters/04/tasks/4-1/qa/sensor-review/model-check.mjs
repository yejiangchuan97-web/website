import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {specificForce,turnAt,moveAt} from '../../src/model.mjs';
import {encoderAt,currentAt,sensorSample} from '../../src/sensors.mjs';
const checks=[];
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
for(const angle of [-30,0,30]){const g=specificForce(angle,0,true);near(Math.hypot(...g),9.81);near(g[1],9.81*Math.sin(angle*Math.PI/180));}
checks.push('静态三轴合量与倾角分量');
for(const duration of [1,4]){let integral=0;for(let t=0;t<6;t+=.001)integral+=turnAt(t+.0005,duration).omega*.001;near(integral,Math.PI/2,2e-6);near(turnAt(6,duration).yaw,90);near(turnAt(6,duration).omega,0);}
checks.push('慢转和快转的积分均为90度，停止后角速度归零');
near(encoderAt(360).distance,Math.PI*.16);assert.equal(encoderAt(360).counts,360);assert.equal(encoderAt(90,90).counts,0);assert.equal(encoderAt(0,90).counts,-90);near(encoderAt(360,0,true).groundDistance,0);
checks.push('编码器分辨率、相对零位、空转与里程估计');
assert.equal(currentAt(0).amps,.6);assert.equal(currentAt(1).rpm,30);assert.equal(currentAt(2).rpm,0);assert.equal(currentAt(2).amps,2.4);near(currentAt(1,2).angle,360);
checks.push('驱动工况、电流与轮轴转动共用模型');
near(moveAt(10).position,.5);near(moveAt(10).acceleration,0);
const drift=sensorSample({sensor:'accel',experiment:'position',time:10,tilt:0,yaw:0,bias:.01,includeGravity:false});near(drift.estimate,1);near(drift.acc[0],.01);
checks.push('停在B点后真实位置保持，偏置继续影响积分');
writeFileSync(new URL('model-check.json',import.meta.url),JSON.stringify({passed:checks.length,checks},null,2));console.log('model checks passed: '+checks.length);
