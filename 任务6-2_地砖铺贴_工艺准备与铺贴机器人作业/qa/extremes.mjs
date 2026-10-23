import {scene} from "../src/geometry.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
import {readFileSync} from 'node:fs';
const keys=JSON.parse(readFileSync(new URL("./motion-order.json",import.meta.url),'utf8'));
const requested=process.argv.find(arg=>arg.startsWith('--layout='))?.split('=')[1];
for(const layout of requested?[requested]:['single','dual','quad']){
 for(const top of [6,12.8]){
  const s=scene({layout,top,bed:top-4});
  for(const it of s.R.items){it.key=keys[layout]?.[it.name]??keys[it.name];if(!Number.isFinite(it.key))throw Error('Missing settled key '+layout+' '+it.name)}
  console.log('HEIGHT EXTREME '+layout+' '+top);A.auditOrExit(s.R,s.P,{argv:['--audit']});
 }
}
