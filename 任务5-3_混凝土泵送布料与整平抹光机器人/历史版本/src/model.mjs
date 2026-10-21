// All values below are teaching-case inputs, not device specifications.
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function levelStep(head, reference, enabled, dt) {
  if (!enabled) return head;
  const movement = (reference - head) * (1 - Math.exp(-dt / 0.8));
  return head + clamp(movement, -8 * dt, 8 * dt);
}
export function levelReadout(head, reference) {
  return { receiver: head - reference, design: head, target: reference,
    action: Math.abs(head-reference)<0.15?'保持':head>reference?'下降':'上升' };
}
export const materials = {
  early:{name:'过早 · 仍在泌水', result:'表面封闭，内部仍可能泌水', detail:'表面出现光泽并不能证明适宜抹光。过早封闭表面可能把水和空气困在下层。', action:'先核实泌水与承载状态', trace:'推浆 / 压痕示意'},
  ready:{name:'适宜 · 状态已核实', result:'刀片连续接触，抹痕逐渐均匀', detail:'本情境预设泌水结束且承载条件适宜；重复作业有助于一致性，仍需检查表面与边角。', action:'按工艺控制遍数并复核', trace:'均匀抹痕示意'},
  late:{name:'偏晚 · 表层已硬化', result:'走过同样路线，局部纹理仍保留', detail:'表层变硬后，同样的刀片运动不再产生同样的表面效果。不能靠无限加遍数补救。', action:'重新评估工艺与处理方式', trace:'残留抹痕示意'}
};
export const W = 4.8, H = 3.2, TOOL_R = .42, GUARD_R = .50, HALF_CENTERS = .55, INSET = .20;
export function routeOf(spacing=.72) {
  const xmin=INSET+GUARD_R+HALF_CENTERS, xmax=W-xmin;
  const ymin=INSET+GUARD_R, ymax=H-ymin;
  const ys=[ymin];
  while(ys.at(-1)+spacing<ymax-.01)ys.push(ys.at(-1)+spacing);
  if(ymax-ys.at(-1)>.01)ys.push(ymax);
  const points=[];
  ys.forEach((y,i)=>{points.push([i%2?xmax:xmin,y],[i%2?xmin:xmax,y]);});
  let total=0; const segments=[];
  for(let i=1;i<points.length;i++) {const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);segments.push({a,b,length,start:total});total+=length;}
  return {points,segments,total,spacing,ys};
}
export function positionAt(route, fraction) {
  const dist=clamp(fraction,0,1)*route.total;
  const s=route.segments.find(s=>s.start+s.length>=dist)||route.segments.at(-1);
  const t=clamp((dist-s.start)/s.length,0,1);
  return [s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t];
}
export function distanceSegment(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1], d=dx*dx+dy*dy;
  const t=d?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/d,0,1):0;
  return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);
}
export function coverageAt(route, fraction, cols=80, rows=54) {
  const traveled=clamp(fraction,0,1)*route.total, cells=[];
  let covered=0, manual=0, uncoveredInterior=0;
  const segments=route.segments.filter(s=>s.start<traveled).map(s=>{
    const t=clamp((traveled-s.start)/s.length,0,1);
    return {a:s.a,b:[s.a[0]+(s.b[0]-s.a[0])*t,s.a[1]+(s.b[1]-s.a[1])*t]};
  });
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const p=[(i+.5)*W/cols,(j+.5)*H/rows];
    const edge=p[0]<INSET||p[0]>W-INSET||p[1]<INSET||p[1]>H-INSET;
    const hit=segments.some(s=>[-HALF_CENTERS,HALF_CENTERS].some(offset=>distanceSegment(p,[s.a[0]+offset,s.a[1]],[s.b[0]+offset,s.b[1]])<=TOOL_R));
    if(hit)covered++; if(edge)manual++; if(!edge&&!hit)uncoveredInterior++;
    cells.push({i,j,hit,edge});
  }
  return {cells,cols,rows,covered,manual,uncoveredInterior,total:cols*rows,percent:100*covered/(cols*rows)};
}
