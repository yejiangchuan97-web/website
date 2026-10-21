import { fixture } from '../src/geometry.mjs';
import * as A from '../assets/kit/audit.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const html=readFileSync(new URL('../4-1.html',import.meta.url),'utf8');
const order=[...html.matchAll(/class="machine-part" data-name="([^"]+)"/g)].map(m=>m[1]);
const reports=[];
for(const angle of [0,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90]){
 const scene=fixture(angle),R=A.recorder(scene.P);
 for(const p of scene.parts){
  const meta={name:p.name,owner:p.owner};
  const shape=p.type==='box'?A.slab(p.plan,p.z,p.h,meta,5):p.type==='cyl'?A.cylinder(p.x,p.y,p.r,p.z,p.h,meta):A.orientedBox(p.center,p.axes,p.size.map(v=>v/2),meta);
  R.put({name:p.name,key:order.indexOf(p.name),at:p.center,svg:scene.draw(p),shapes:[R.solid(shape)]});
 }
 const result=A.depthOrder(R.items,scene.P);
 reports.push({angle,missing:result.missing,problems:result.problems});
 console.log(angle+'° fixed DOM depth problems: '+result.problems.length);
}
writeFileSync(new URL('4-1-depth.json',import.meta.url),JSON.stringify(reports,null,2));
