import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { G, DEG, specificForce, turnAt, moveAt, vibrationAt, sample, trace, peakWindow } from '../../src/self-state/model.mjs';

// Independent numerical checks of the physical relationships students compare.
const results=[];
function near(actual,expected,tolerance=1e-8,message=''){
  assert.ok(Number.isFinite(actual),`${message}: non-finite result`);
  assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} != ${expected} (tolerance ${tolerance})`);
}
function check(name,run){run();results.push({name,status:'passed'});}
function simpson(f,a,b,n=4000){const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);return s*h/3;}
const base={experiment:'gravity',time:0,tilt:0,yaw:0,includeGravity:false,duration:4,frequency:4,intensity:1,loose:false,trial:0,events:[],bias:0};

check('gravity: norm, axis signs, and body/world frame agreement',()=>{
  for(const tilt of [-90,-50,-30,-1,0,1,18,30,50,90])for(const yaw of [-180,-90,-35,0,35,90,180]){
    const f=specificForce(tilt,yaw,true),a=tilt*DEG,p=yaw*DEG;
    near(Math.hypot(...f),G,2e-12,'stationary norm');
    // Columns of Rx(tilt) * Rz(yaw), independently expressed in world space.
    const bodyAxes=[
      [Math.cos(p),Math.cos(a)*Math.sin(p),Math.sin(a)*Math.sin(p)],
      [-Math.sin(p),Math.cos(a)*Math.cos(p),Math.sin(a)*Math.cos(p)],
      [0,-Math.sin(a),Math.cos(a)]
    ];
    for(let i=0;i<3;i++)near(f[i],G*bodyAxes[i][2],2e-12,'world +Z projected onto body axis');
    assert.deepEqual(specificForce(tilt,yaw,false),[0,0,0]);
  }
  const f=specificForce(30,0);near(f[0],0);near(f[1],4.905);near(f[2],8.495709211125344);
});

check('rotation: angle derivative, equal integral, and slow/fast peak ratio',()=>{
  for(const duration of [1,2,2.7,4]){
    for(const t of [-1,0,.5]){near(turnAt(t,duration).yaw,0);near(turnAt(t,duration).omega,0);}
    for(const t of [duration+.5,duration+1,10]){near(turnAt(t,duration).yaw,90);near(turnAt(t,duration).omega,0);assert.equal(turnAt(t,duration).done,true);}
    for(const u of [.02,.1,.3,.5,.8,.98]){
      const t=.5+duration*u,h=1e-5;
      const derivative=(turnAt(t+h,duration).yaw-turnAt(t-h,duration).yaw)*DEG/(2*h);
      near(turnAt(t,duration).omega,derivative,3e-9,'angular speed equals angle derivative');
    }
    near(simpson(t=>turnAt(t,duration).omega,.5,duration+.5),Math.PI/2,2e-12,'omega integral');
  }
  near(turnAt(1,1).omega/turnAt(2.5,4).omega,4,1e-12,'fast/slow peak ratio');
  near(turnAt(1.5,1).yaw,turnAt(4.5,4).yaw,1e-12,'equal final angles');
});

check('vibration: acceleration is second derivative of displacement',()=>{
  const cases=[
    {frequency:2,intensity:0,trial:0,loose:false,events:[]},
    {frequency:4,intensity:1,trial:0,loose:false,events:[]},
    {frequency:8,intensity:1.2,trial:2,loose:false,events:[]},
    {frequency:4,intensity:1,trial:1,loose:true,events:[]},
    {frequency:4,intensity:1,trial:2,loose:true,events:[2.2,5.7,7.4]}
  ];
  for(const options of cases){
    const times=[.05,.3,1.7,2.2,3.36,4.31,5.7,6.13,7.4,9.5,9.95];
    for(const t of times){const h=1e-5;
      const d2=(vibrationAt(t+h,options).displacement-2*vibrationAt(t,options).displacement+vibrationAt(t-h,options).displacement)/(h*h);
      const a=vibrationAt(t,options).acceleration;
      near(a,d2,Math.max(3e-6,Math.abs(a)*5e-6),'vibration second derivative');
    }
    near(vibrationAt(0,options).displacement,0,1e-12);near(vibrationAt(10,options).displacement,0,1e-12);
    assert.deepEqual(vibrationAt(-1,options),{displacement:0,acceleration:0});
    assert.deepEqual(vibrationAt(11,options),{displacement:0,acceleration:0});
  }
});

check('position: A/B are both at rest, derivatives and travel agree',()=>{
  for(const t of [-1,0,.7,1]){const m=moveAt(t);near(m.position,0);near(m.velocity,0);near(m.acceleration,0);}
  for(const t of [3,3.1,7,10]){const m=moveAt(t);near(m.position,.5);near(m.velocity,0);near(m.acceleration,0);}
  for(const t of [1.01,1.25,1.7,2,2.4,2.9,2.99]){
    const h=1e-5,m=moveAt(t);
    near((moveAt(t+h).position-moveAt(t-h).position)/(2*h),m.velocity,1e-8,'velocity derivative');
    near((moveAt(t+h).velocity-moveAt(t-h).velocity)/(2*h),m.acceleration,1e-8,'acceleration derivative');
  }
  near(simpson(t=>moveAt(t).velocity,1,3),.5,1e-12,'integrated displacement');
  near(simpson(t=>moveAt(t).acceleration,1,3),0,1e-12,'final velocity after acceleration integral');
  assert.ok(moveAt(1.5).acceleration>0);assert.ok(moveAt(2.5).acceleration<0);
});

check('constant bias: numerical double integration and half-b-t-squared drift',()=>{
  for(const bias of [0,.001,.01,.02]){
    const state={...base,experiment:'position',bias};
    const dt=.0005;let velocity=0,position=0,lastAcceleration=sample(state,0).acc[0];
    for(let i=1;i<=20000;i++){
      const t=i*dt,s=sample(state,t),a=s.acc[0],nextVelocity=velocity+(lastAcceleration+a)*dt/2;
      position+=(velocity+nextVelocity)*dt/2;velocity=nextVelocity;lastAcceleration=a;
      if(i%2000===0){near(position,s.estimate,2e-7,'independent double integration');near(s.error,.5*bias*t*t,1e-12);near(s.estimate-s.position,s.error,1e-12);}
    }
    near(sample(state,10).error,50*bias,1e-12);
    near(sample(state,.5).acc[0],sample(state,5).acc[0],1e-12,'equal stationary accelerometer readings at different positions');
    assert.notEqual(sample(state,.5).position,sample(state,5).position);
  }
});

check('trace and peak window: fixed window, same axis, no missing-as-zero',()=>{
  const state={...base,experiment:'vibration',frequency:4,intensity:1};
  const rows=trace(state,.01),selected=rows.filter(r=>r.t>=2&&r.t<=8);
  near(peakWindow(rows,2),Math.max(...selected.map(r=>Math.abs(r.acc[2]))),1e-12);
  near(peakWindow(rows,0),0,1e-12);
  assert.equal(peakWindow([],2),null);
  assert.equal(peakWindow([{t:3,acc:[null,null,NaN]}],2),null);
  assert.equal(peakWindow([{t:1,acc:[0,0,100]}],2),null);
});

const report={passed:results.length,failed:0,checks:results};
writeFileSync(fileURLToPath(new URL('./model-check.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
