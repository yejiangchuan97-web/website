export const TAU=Math.PI*2;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
export const SPECS={planet:{title:'行星减速器',tag:'PLANETARY / 01',hint:'太阳轮转得快，行星架为什么转得慢？',input:'太阳轮',fixed:'内齿圈',output:'行星架',teeth:[18,18,54],ratio:4,target:90},harmonic:{title:'谐波减速器',tag:'STRAIN WAVE / 02',hint:'变形在转，柔轮却只退后一点点。',input:'波发生器',fixed:'刚轮',output:'柔轮',teeth:[200,202],ratio:-100,target:-7.2},screw:{title:'丝杠与螺母',tag:'LEAD SCREW / 01',hint:'同样转一圈，滑台能走多远？',input:'丝杠',fixed:'导轨',output:'螺母滑台',target:32},rack:{title:'齿轮与齿条',tag:'RACK & PINION / 02',hint:'齿轮转过的弧长，变成滑台的路程。',input:'齿轮',fixed:'导轨',output:'齿条滑台',target:48},crank:{title:'曲柄与连杆',tag:'SLIDER CRANK / 03',hint:'一直向同一方向转，滑块却来回运动。',input:'曲柄',fixed:'导轨',output:'滑块',target:50}};
export function planetary(theta){const c=theta/4;return {input:theta,output:c,spin:-theta/2,orbits:[0,TAU/3,2*TAU/3].map(a=>a+c),ratio:4};}
export function harmonic(theta){return {input:theta,output:-theta/100,ratio:-100,flexTeeth:200,ringTeeth:202};}
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
