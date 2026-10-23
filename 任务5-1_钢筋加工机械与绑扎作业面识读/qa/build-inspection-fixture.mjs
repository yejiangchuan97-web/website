// Rebuild the embedded fixture only; the interactive runtime remains in inspection.js.
// Requires the locally installed Anatomy skill. Optional ANATOMY_SKILL_DIR overrides its location.
import {homedir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const kitRoot=join(process.env.ANATOMY_SKILL_DIR||join(homedir(),'.codex','skills','anatomy'),'kit');
const k=await import(pathToFileURL(join(kitRoot,'iso-kit.mjs')));
const G=await import(pathToFileURL(join(kitRoot,'lathe.mjs')));
const A=await import(pathToFileURL(join(kitRoot,'audit.mjs')));
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const OUT=fileURLToPath(new URL('../src/inspection.js',import.meta.url));
const plan={x:-160,y:-160,w:320,d:320,r:5};
const P=k.fitProjection(k.boxCorners(plan,-20,28),760,430,{pad:42,azimuth:38,elevation:35});
const R=A.recorder(P); let n=0;
function slab(plan,z,h,mat,name){const shape=R.solid(A.slab(plan,z,h,{name}));R.put({name,piece:'fixture',at:[plan.x+plan.w/2,plan.y+plan.d/2,z+h/2],svg:`<g class="ri-${mat}">${k.solidSvg(k.slabOf(plan,z,h,P,5,.5),{tone:'mid'})}</g>`,shapes:[shape]});n++;}
function cyl(x,y,r,z,h,mat,name){const shape=R.solid(A.cylinder(x,y,r,z,h,{name}));R.put({name,piece:'fixture',at:[x,y,z+h/2],svg:`<g class="ri-${mat}">${k.solidSvg(k.cylinder(x,y,r,z,h,P,24,.2),{tone:'mid'})}</g>`,shapes:[shape]});n++;}
function rod(a,axis,len,r,mat,name){const F=G.frameAlong(a,axis),profile=[[0,r],[len,r]],shape=R.solid(A.solid(F,profile,{name}));R.put({name,piece:'fixture',at:a.map((v,i)=>v+axis[i]*len/2),svg:`<g class="ri-${mat}">${k.solidSvg(G.solidOf(profile,F,P,{steps:24}),{tone:'hi'})}</g>`,shapes:[shape]});n++;}
for(const x of[-145,145])for(const y of[-140,140]){cyl(x,y,8,-20,5,'rubber',`stand.foot.${x}.${y}`);cyl(x,y,6,-15,3,'steel',`foot.collar.${x}.${y}`)}
for(const y of[-140,140])slab({x:-154,y:y-8,w:308,d:16,r:2},-12,4,'blue',`runner.${y}`);
slab(plan,-8,8,'wood','board');
for(const x of[-160,154])slab({x,y:-160,w:6,d:320,r:1},0,2,'blue',`side.${x}`);
for(const y of[-160,154])slab({x:-154,y,w:308,d:6,r:1},0,2,'blue',`end.${y}`);
for(const x of[-157,157])for(const y of[-152,-50,50,152]){cyl(x,y,2,2,.7,'steel',`washer.${x}.${y}`);cyl(x,y,1.2,2.7,.6,'blue',`screw.${x}.${y}`)}
for(const x of[-90,90])for(const y of[-110,10,110])slab({x:x-7,y:y-7,w:14,d:14,r:2},0,10.5,'white',`spacer.${x}.${y}`);
for(const y of[-110,10,110])rod([-145,y,12.5],[1,0,0],290,2,'steel',`lower.${y}`);
for(const x of[-110,0,110])rod([x,-145,16.5],[0,1,0],290,2,'steel',`upper.${x}`);
A.settle(R,P);
R.items.sort((a,b)=>a.key-b.key);
const at=p=>k.iso(p,P);
let body=`<path class="ri-shadow" d="${k.haloOf(plan,-20,12,P)}"/>`+R.items.map(x=>x.svg).join('');
const joints=[];
for(const x of[-110,0,110])for(const y of[-110,10,110]){const p=at([x,y,19]);joints.push({x,y,p,missing:x===0&&y===10,loose:x===110&&y===-110});if(x===0&&y===10)continue;const pts=[[x-3,y-4,17],[x-4,y+3,17],[x+3,y+4,19],[x+4,y-3,19]].map(at);body+=`<path class="ri-wire" d="M${pts.map(v=>v.join(',')).join('L')}Z"/><circle cx="${p[0]}" cy="${p[1]}" r="1.3" fill="#a56824"/>`;}
const data={base:body,P,joints,parts:n,units:{worldToMM:4,diameter:16,cover:42,designSpacing:400,measuredSpacing:480},spacingStart:at([47,-110,15]),spacingEnd:at([47,10,15])};
const previous=readFileSync(OUT,'utf8');
if(!/^const FIGURE=.*;$/m.test(previous))throw new Error('Generated FIGURE marker missing');
writeFileSync(OUT,previous.replace(/^const FIGURE=.*;$/m,()=> 'const FIGURE='+JSON.stringify(data)+';'));
const result=A.audit(R,P);console.log(A.report(result));console.log('parts',n,'output',OUT);
writeFileSync(new URL('./inspection-geometry-audit.json',import.meta.url),JSON.stringify(result,null,2));
A.auditOrExit(R,P,{argv:['--audit']});
