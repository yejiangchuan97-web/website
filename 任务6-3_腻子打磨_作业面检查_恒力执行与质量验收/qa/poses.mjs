import {scene} from "../src/geometry.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
const base=scene(),keys=new Map(base.R.items.map(it=>[it.name,it.key]));
for(const [b,q]of [[-6,-4],[-6,4],[6,-4],[6,4],[2,0],[2,2],[0,0]]){const s=scene(b,q);for(const it of s.R.items)it.key=keys.get(it.name);console.log('POSE bump='+b+' retreat='+q);A.auditOrExit(s.R,s.P,{argv:['--audit']});}
