import {scene} from "../src/geometry.mjs";
import * as A from "../../../公共资源/anatomy/audit.mjs";
// Reuse the actual initial DOM order, rather than quietly re-sorting the audit pose.
for(const kind of ['level','trowel']){
 const base=scene(kind), keys=new Map(base.R.items.map(it=>[it.name,it.key]));
 const poses=kind==='level'?[[-10,0,-8],[-5,0,0],[0,0,8],[5,0,5],[10,0,-8]]:[0,1,2,3,4,6,8,10,12,14].map(n=>[0,n*Math.PI/8,0]);
 for(const [h,a,ref] of poses){
  const s=scene(kind,h,a,false,ref);for(const it of s.R.items)it.key=keys.get(it.name);
  console.log('POSE '+kind+' head='+h+' angle='+a.toFixed(3)+' reference='+ref);
  // Reuse this pose's measured overlap surfaces. depthOrder reads the reassigned
  // item keys directly, so it checks the unchanged order of the live document.
  A.auditOrExit(s.R,s.P,{argv:['--audit']});
 }
}
