import {scene} from '../../src/tiling/geometry.mjs';
import * as A from '../../assets/tiling-anatomy/audit.mjs';
import {readFileSync} from 'node:fs';
const keys=JSON.parse(readFileSync(new URL('motion-order.json',import.meta.url),'utf8'));
for(const top of [7.4,12.8]){const s=scene({top,bed:top-4});for(const it of s.R.items)it.key=keys[it.name];console.log('HEIGHT EXTREME '+top);A.auditOrExit(s.R,s.P,{argv:['--audit']});}
