import {scene} from '../../src/spray/geometry.mjs';
import {writeFileSync} from 'node:fs';
const rest=scene(),names=rest.R.items.map(i=>i.name),edges=new Map(names.map(n=>[n,new Set()])),report=[];
for(const z of [49,52,55,59,64,70,85,150,205,281]){
 const s=scene({z,audit:true}),{items,overlaps}=s.R.settled;let rules=0;
 for(const pair of overlaps.pairs){const a=pair.front[0].area>=overlaps.least;const front=items[a?pair.a:pair.b].name,back=items[a?pair.b:pair.a].name;edges.get(back).add(front);rules++;}
 report.push({z,rules});console.log(JSON.stringify(report.at(-1)));
}
const indegree=new Map(names.map(n=>[n,0]));for(const targets of edges.values())for(const n of targets)indegree.set(n,indegree.get(n)+1);
const sorted=[],queue=names.filter(n=>!indegree.get(n));while(queue.length){const n=queue.shift();sorted.push(n);for(const t of edges.get(n)){indegree.set(t,indegree.get(t)-1);if(!indegree.get(t))queue.push(t);}}
if(sorted.length!==names.length)throw Error('Motion requires changing depth order: '+names.filter(n=>!sorted.includes(n)));
for(const [a,targets] of edges)for(const b of targets)if(sorted.indexOf(a)>sorted.indexOf(b))throw Error('Invalid order');
writeFileSync(new URL('../../src/spray/draw-order.json',import.meta.url),JSON.stringify(sorted,null,2));
writeFileSync(new URL('./order-results.json',import.meta.url),JSON.stringify({poses:report,order:sorted,errors:0},null,2));console.log('Common painter order passed across all poses');
