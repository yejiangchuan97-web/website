// Axis-aligned convex solids: a separating world plane proves their visible depth.
export function hullOf(points){const ps=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);const half=arr=>{let out=[];for(const p of arr){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};return [...half(ps).slice(0,-1),...half([...ps].reverse()).slice(0,-1)];}
export function overlaps(a,b){for(const poly of [a,b])for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],axis=[p[1]-q[1],q[0]-p[0]],dot=v=>v[0]*axis[0]+v[1]*axis[1],aa=a.map(dot),bb=b.map(dot);if(Math.max(...aa)<=Math.min(...bb)+.001||Math.max(...bb)<=Math.min(...aa)+.001)return false;}return true;}
export function orderOf(parts,project){
 const items=parts.map(p=>({...p,hull:hullOf([0,1].flatMap(x=>[0,1].flatMap(y=>[0,1].map(z=>project([x?p.hi[0]:p.lo[0],y?p.hi[1]:p.lo[1],z?p.hi[2]:p.lo[2]])))))}));
 const edges=items.map(()=>[]),counts=items.map(()=>0);
 for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
  const a=items[i],b=items[j];let before=false,after=false;for(let d=0;d<3;d++){if(a.hi[d]<=b.lo[d]+1e-6)before=true;if(b.hi[d]<=a.lo[d]+1e-6)after=true;}
  if(before===after||!overlaps(a.hull,b.hull))continue;
  const from=before?i:j,to=before?j:i;edges[from].push(to);counts[to]++;
 }
 const queue=items.map((_,i)=>i).filter(i=>counts[i]===0),out=[];
 while(queue.length){const i=queue.shift();out.push(items[i].name);for(const j of edges[i])if(--counts[j]===0)queue.push(j);}
 if(out.length!==items.length)throw Error('Depth order cycle');return out;
}
