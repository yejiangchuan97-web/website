import test from 'node:test';import assert from 'node:assert/strict';
import {TAU,wrap,PLANETARY,HARMONIC_GEOMETRY,planetary,harmonic,flexPoint,sample,sliderCrank,limitAngle,dock,toothProfile} from '../../src/rebuild/model.mjs';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
test('planetary Willis relation and mesh velocities hold throughout forward and reverse rotation',()=>{for(let t=-10*TAU;t<10*TAU;t+=.043){let v=planetary(t);near(18*(t-v.output)+54*(0-v.output),0);near(18*(t-v.output)+18*(v.spin-v.output),0);for(let a of v.orbits)near(Math.hypot(36*Math.cos(a),36*Math.sin(a)),36)}});
test('three equally spaced planets satisfy tooth assembly condition',()=>{near((18+54)/3,24);for(const t of [0,.47,TAU,37]){let v=planetary(t);near(v.orbits[1]-v.orbits[0],TAU/3);near(v.orbits[2]-v.orbits[1],TAU/3)}});
test('harmonic output reverses exactly two flex teeth for each wave revolution',()=>{for(let n=-100;n<=100;n++){let v=harmonic(n*TAU);near(v.output/TAU*200,-2*n)}});
test('screw advance equals lead per complete revolution for all offered leads',()=>{for(let p of [4,8,16])for(let n=0;n<5;n++)near(sample('screw',n*TAU,p).output,n*p)});
test('rack travel is pitch-circle arc length, independent of replay speed',()=>{for(const t of [0,.1,Math.PI,TAU])near(sample('rack',t).output,12*t);near(sample('rack',TAU).output,75.39822368615503)});
test('connecting rod length remains 70 through a full cycle at every radius',()=>{for(const r of [15,25,35])for(let t=0;t<TAU;t+=.007){const v=sample('crank',t,r);near(Math.hypot(v.x-v.pinX,v.y),70,1e-8)}});
test('slider-crank end positions are precisely separated by twice the crank radius',()=>{for(const r of [15,25,35]){near(sliderCrank(0,r)-sliderCrank(Math.PI,r),2*r);near(sample('crank',0,r).output,2*r);near(sample('crank',Math.PI,r).output,0)}});
test('finite rail prevents either end from being exceeded and stops input consistently',()=>{for(let p of [4,8,16]){near(sample('screw',limitAngle('screw',1e6,p),p).output,80);near(limitAngle('screw',-2,p),0)}near(sample('rack',limitAngle('rack',1e6)).output,80);near(limitAngle('rack',-2),0)});
test('dock targets correspond to genuine driven output; outside tolerance fails',()=>{for(const [mode,t,p]of[['planet',TAU,8],['harmonic',2*TAU,8],['screw',4*TAU,8],['rack',4,8],['crank',TAU,25]])assert.equal(dock(mode,t,p).ok,true);for(const mode of ['planet','harmonic','screw','rack'])assert.equal(dock(mode,0,8).ok,false)});
test('external teeth are bounded by intended dedendum/addendum and have no NaN vertices',()=>{for(const[n,m]of[[18,2],[24,1]])for(const[x,y]of toothProfile(n,m)){assert.ok(Number.isFinite(x)&&Number.isFinite(y));assert.ok(Math.hypot(x,y)>=n*m/2-1.25*m-1e-8);assert.ok(Math.hypot(x,y)<=n*m/2+m+1e-8)}});

test('planetary dimensions and phases preserve both meshes in forward and reverse',()=>{
 const p=PLANETARY;
 near(p.ringPitchRadius,p.sunPitchRadius+2*p.planetPitchRadius);
 near(p.orbitRadius,p.sunPitchRadius+p.planetPitchRadius);
 assert.ok(2*p.orbitRadius*Math.sin(Math.PI/3)>2*(p.planetPitchRadius+p.module));
 for(let theta=-12*TAU;theta<=12*TAU;theta+=.097){
  const v=planetary(theta);near(v.ring,0);near(v.relativeSpin,v.spin-v.output);
  for(let j=0;j<p.planetCount;j++){
   const orbit=v.orbits[j],spin=v.planetAngles[j];
   near(wrap(p.sunTeeth*(orbit-v.input)+p.planetTeeth*(orbit+Math.PI-spin)-Math.PI),0,1e-10);
   near(wrap(p.ringTeeth*(orbit-v.ring)-p.planetTeeth*(orbit-spin)-Math.PI),0,1e-10);
  }
 }
});

test('flexible pitch rim remains an ellipse with the undeformed circumference',()=>{
 const g=HARMONIC_GEOMETRY;
 near(g.circularPitchRadius/g.flexPitchRadius,202/200);
 assert.ok(g.minor<g.flexPitchRadius&&g.major>g.flexPitchRadius);
 for(const theta of [-23.4,0,.72,18.9])for(let beta=0;beta<TAU;beta+=.137){
  const p=flexPoint(theta,beta),cw=Math.cos(theta),sw=Math.sin(theta),x=cw*p.x+sw*p.y,y=-sw*p.x+cw*p.y;
  near((x/g.major)**2+(y/g.minor)**2,1,1e-12);
  const nx=cw*p.nx+sw*p.ny,ny=-sw*p.nx+cw*p.ny;
  near(nx*y/g.minor**2-ny*x/g.major**2,0,1e-12);
  near(Math.hypot(p.nx,p.ny),1);
 }
 let length=0,previous=flexPoint(0,0);
 for(let i=1;i<=8192;i++){const current=flexPoint(0,i*TAU/8192);length+=Math.hypot(current.x-previous.x,current.y-previous.y);previous=current;}
 near(length,g.perimeter,1e-5);
});

test('flexible material has zero tangential slip at both fixed-ring engagement centers',()=>{
 const dt=2e-5;
 for(const theta of [-211.4,-TAU,-.2,0,.6,Math.PI,37.1,99*TAU])for(const opposite of [0,Math.PI]){
  const material=theta-harmonic(theta).output+opposite;
  const p=flexPoint(theta,material),before=flexPoint(theta-dt,material),after=flexPoint(theta+dt,material);
  near(p.radius,HARMONIC_GEOMETRY.major,1e-10);
  const vx=(after.x-before.x)/(2*dt),vy=(after.y-before.y)/(2*dt);
  near(-vx*p.ny+vy*p.nx,0,2e-6);
  // The flex and ring tooth phases also agree at both lobe centers.
  near(wrap(200*material-202*(theta+opposite)),0,2e-10);
 }
});

test('cup base follows the actual slow output and the wall interpolates attached material',()=>{
 for(const theta of [-73*TAU,-2,0,.41,TAU,100*TAU])for(const beta of [0,.31,Math.PI,TAU]){
  const base=flexPoint(theta,beta,0),rim=flexPoint(theta,beta,1),angle=beta+harmonic(theta).output;
  near(base.x,38*Math.cos(angle),1e-10);near(base.y,38*Math.sin(angle),1e-10);
  for(const t of [.1,.4,.85]){const p=flexPoint(theta,beta,t);near(p.x,base.x+(rim.x-base.x)*t);near(p.y,base.y+(rim.y-base.y)*t);near(Math.hypot(p.nx,p.ny),1);}
 }
});

test('harmonic material indexing advances two teeth per input revolution and repeats after 100',()=>{
 for(const theta of [-47.1,0,.7,123])for(const beta of [0,.13,2.8,TAU])for(const t of [0,.4,1]){
  const p=flexPoint(theta,beta,t),cycle=flexPoint(theta+100*TAU,beta,t);
  near(p.x,cycle.x,2e-10);near(p.y,cycle.y,2e-10);
  const next=flexPoint(theta+TAU,beta,t),twoTeeth=flexPoint(theta,beta-2*TAU/200,t);
  near(next.x,twoTeeth.x,2e-10);near(next.y,twoTeeth.y,2e-10);
 }
});

test('flexible cup stays finite at table seams, cycle boundaries and clamped heights',()=>{
 for(const theta of [-100*TAU-1e-10,-100*TAU,0,1e-10,100*TAU,100*TAU+1e-10])for(const beta of [-TAU,-1e-12,0,TAU,TAU+1e-12])for(const t of [-1,0,.5,1,2]){
  const p=flexPoint(theta,beta,t);for(const value of Object.values(p))assert.ok(Number.isFinite(value));
  assert.ok(p.radius>=38-1e-10&&p.radius<=50.5+1e-10);
 }
 for(const args of [[NaN,0],[0,Infinity],[0,0,NaN]])assert.throws(()=>flexPoint(...args),TypeError);
});
