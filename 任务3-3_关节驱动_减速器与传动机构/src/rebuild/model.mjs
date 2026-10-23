export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const SPECS={planet:{title:'行星减速器',tag:'PLANETARY / 01',hint:'太阳轮转得快，行星架为什么转得慢？',input:'太阳轮',fixed:'内齿圈',output:'行星架',teeth:[18,18,54],ratio:4,target:90},harmonic:{title:'谐波减速器',tag:'STRAIN WAVE / 02',hint:'变形在转，柔轮却只退后一点点。',input:'波发生器',fixed:'刚轮',output:'柔轮',teeth:[200,202],ratio:-100,target:-7.2},screw:{title:'丝杠与螺母',tag:'LEAD SCREW / 01',hint:'同样转一圈，滑台能走多远？',input:'丝杠',fixed:'导轨',output:'螺母滑台',target:32},rack:{title:'齿轮与齿条',tag:'RACK & PINION / 02',hint:'齿轮转过的弧长，变成滑台的路程。',input:'齿轮',fixed:'导轨',output:'齿条滑台',target:48},crank:{title:'曲柄与连杆',tag:'SLIDER CRANK / 03',hint:'一直向同一方向转，滑块却来回运动。',input:'曲柄',fixed:'导轨',output:'滑块',target:50}};
// Unshifted, common-module teeth; three equally spaced planets satisfy
// Zr=Zs+2Zp and (Zs+Zr)/3=24. Phases assume a tooth tip at local angle zero.
export const PLANETARY=Object.freeze({sunTeeth:18,planetTeeth:18,ringTeeth:54,planetCount:3,module:2,sunPitchRadius:18,planetPitchRadius:18,ringPitchRadius:54,orbitRadius:36,ratio:4,sunPhase:0,ringPhase:0,planetPhase:Math.PI/18,planetPhases:Object.freeze([Math.PI/18,Math.PI/18,Math.PI/18]),initialOrbits:Object.freeze([0,TAU/3,2*TAU/3])});
export function planetary(theta){
 const c=theta/PLANETARY.ratio,spin=c-PLANETARY.sunTeeth/PLANETARY.planetTeeth*(theta-c);
 return {input:theta,output:c,carrier:c,ring:0,spin,relativeSpin:spin-c,orbits:PLANETARY.initialOrbits.map(a=>a+c),planetAngles:PLANETARY.planetPhases.map(a=>a+spin),ratio:PLANETARY.ratio};
}
export function harmonic(theta){return {input:theta,output:-theta/100,ring:0,ratio:-100,flexTeeth:200,ringTeeth:202};}

// Educational, inextensible pitch-line model of the flexspline. It preserves
// material spacing and gear phase; it does not model stress or tooth compliance.
// The ellipse major pitch radius equals the fixed ring's pitch radius. Its
// perimeter equals the undeformed flexible pitch circumference. An arc-length
// coordinate moves through that rotating ellipse independently of its shape.
const FLEX_RADIUS=50,CIRCULAR_RADIUS=50.5,BASE_RADIUS=38,FLEX_PERIMETER=TAU*FLEX_RADIUS;
function ellipsePerimeter(a,b){
 const n=1024,h=(Math.PI/2)/n;
 let sum=a+b;
 for(let i=1;i<n;i++){const q=i*h;sum+=(i%2?4:2)*Math.hypot(a*Math.sin(q),b*Math.cos(q));}
 return 4*h*sum/3;
}
let minorLo=0,minorHi=FLEX_RADIUS;
for(let i=0;i<60;i++){const b=(minorLo+minorHi)/2;if(ellipsePerimeter(CIRCULAR_RADIUS,b)>FLEX_PERIMETER)minorHi=b;else minorLo=b;}
const FLEX_MINOR=(minorLo+minorHi)/2;
export const HARMONIC_GEOMETRY=Object.freeze({module:.5,flexTeeth:200,circularTeeth:202,flexPitchRadius:FLEX_RADIUS,circularPitchRadius:CIRCULAR_RADIUS,major:CIRCULAR_RADIUS,minor:FLEX_MINOR,baseRadius:BASE_RADIUS,perimeter:FLEX_PERIMETER,toothPitch:FLEX_PERIMETER/200});
const ARC_STEPS=8192,ARC_STEP=TAU/ARC_STEPS,ARC_LENGTH=new Float64Array(ARC_STEPS+1),ARC_INVERSE_SPEED=new Float64Array(ARC_STEPS+1);
const ellipseSpeed=q=>Math.hypot(CIRCULAR_RADIUS*Math.sin(q),FLEX_MINOR*Math.cos(q));
ARC_INVERSE_SPEED[0]=1/FLEX_MINOR;
for(let i=1;i<=ARC_STEPS;i++){
 const q=i*ARC_STEP,previous=(i-1)*ARC_STEP;
 ARC_LENGTH[i]=ARC_LENGTH[i-1]+ARC_STEP/6*(ellipseSpeed(previous)+4*ellipseSpeed((q+previous)/2)+ellipseSpeed(q));
 ARC_INVERSE_SPEED[i]=1/ellipseSpeed(q);
}
const ARC_TOTAL=ARC_LENGTH[ARC_STEPS];
function ellipseParameter(arc){
 const s=((arc%ARC_TOTAL)+ARC_TOTAL)%ARC_TOTAL;
 let low=0,high=ARC_STEPS;
 while(high-low>1){const mid=(low+high)>>1;if(ARC_LENGTH[mid]<=s)low=mid;else high=mid;}
 const length=ARC_LENGTH[high]-ARC_LENGTH[low],u=(s-ARC_LENGTH[low])/length,u2=u*u,u3=u2*u;
 // Cubic inverse interpolation keeps velocity smooth across table boundaries.
 return (2*u3-3*u2+1)*low*ARC_STEP+(u3-2*u2+u)*length*ARC_INVERSE_SPEED[low]+(-2*u3+3*u2)*high*ARC_STEP+(u3-u2)*length*ARC_INVERSE_SPEED[high];
}
export function flexPoint(theta,materialAngle,t=1){
 if(!Number.isFinite(theta)||!Number.isFinite(materialAngle)||!Number.isFinite(t))throw new TypeError('flexPoint requires finite angles and height');
 t=clamp(t,0,1);
 // A complete geometry cycle is 100 wave turns / one reverse output turn.
 const wave=theta%(100*TAU),output=-wave/100,baseAngle=materialAngle+output;
 const q=ellipseParameter(FLEX_RADIUS*(baseAngle-wave)),cq=Math.cos(q),sq=Math.sin(q),cw=Math.cos(wave),sw=Math.sin(wave);
 const rx=CIRCULAR_RADIUS*cq,ry=FLEX_MINOR*sq;
 const rimX=cw*rx-sw*ry,rimY=sw*rx+cw*ry;
 const cb=Math.cos(baseAngle),sb=Math.sin(baseAngle),baseX=BASE_RADIUS*cb,baseY=BASE_RADIUS*sb;
 const x=baseX+(rimX-baseX)*t,y=baseY+(rimY-baseY)*t;
 const dq=FLEX_RADIUS/ellipseSpeed(q),dx=-CIRCULAR_RADIUS*sq*dq,dy=FLEX_MINOR*cq*dq;
 const tx=-BASE_RADIUS*sb*(1-t)+(cw*dx-sw*dy)*t,ty=BASE_RADIUS*cb*(1-t)+(sw*dx+cw*dy)*t,length=Math.hypot(tx,ty);
 return {x,y,nx:ty/length,ny:-tx/length,angle:Math.atan2(y,x),radius:Math.hypot(x,y)};
}
export function sliderCrank(theta,r=25,L=70){return r*Math.cos(theta)+Math.sqrt(L*L-r*r*Math.sin(theta)**2);}
export function sample(mode,theta,setting=8){
 if(mode==='planet'||mode==='harmonic')return mode==='planet'?planetary(theta):harmonic(theta);
 if(mode==='screw')return{input:theta,output:theta/TAU*setting,x:-40+theta/TAU*setting,travel:80,unit:'mm'};
 if(mode==='rack')return{input:theta,output:theta*12,x:-40+theta*12,travel:80,unit:'mm'};
 const r=setting,L=70,p=sliderCrank(theta,r,L);return{input:theta,output:p-(L-r),x:-55+p,y:r*Math.sin(theta),pinX:-55+r*Math.cos(theta),stroke:2*r,travel:2*r,unit:'mm'};
}
export function limitAngle(mode,theta,setting){if(mode==='screw')return clamp(theta,0,80/setting*TAU);if(mode==='rack')return clamp(theta,0,80/12);return theta;}
export function dock(mode,theta,setting){const v=sample(mode,theta,setting),target=mode==='crank'?setting*2:SPECS[mode].target;const actual=['planet','harmonic'].includes(mode)?v.output*180/Math.PI:v.output;const tolerance=mode==='harmonic'?.22:mode==='planet'?2:1;return{actual,target,tolerance,error:actual-target,ok:Math.abs(actual-target)<=tolerance};}
export function toothProfile(n,m=2){
 const rp=n*m/2,rb=rp*Math.cos(20*Math.PI/180),rr=rp-1.25*m,ra=rp+m,inv=r=>{const a=Math.acos(Math.min(1,rb/r));return Math.tan(a)-a;},invp=inv(rp),half=Math.PI/(2*n),points=[];
 for(let j=0;j<n;j++){
  const c=j*TAU/n;points.push([rr*Math.cos(c-Math.PI/n),rr*Math.sin(c-Math.PI/n)]);
  for(let i=0;i<=7;i++){let r=Math.max(rr,rb)+(ra-Math.max(rr,rb))*i/7,a=c-half-invp+inv(r);points.push([r*Math.cos(a),r*Math.sin(a)]);}
  for(let i=7;i>=0;i--){let r=Math.max(rr,rb)+(ra-Math.max(rr,rb))*i/7,a=c+half+invp-inv(r);points.push([r*Math.cos(a),r*Math.sin(a)]);}
  points.push([rr*Math.cos(c+Math.PI/n),rr*Math.sin(c+Math.PI/n)]);
 }return points;
}
