// Screen-space tolerances and durations belong only to this teaching game.
// They are not machine positioning tolerances, inspection loads or cycle times.
export const POINTS = [
  {id:'A',x:525,y:155},{id:'B',x:315,y:155},
  {id:'C',x:525,y:263},{id:'D',x:315,y:263}
];
export const AIM_RADIUS = 18;
export const clampGame = (n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
export function createGame(){return {stage:'tying',aim:{x:420,y:209},selected:null,busy:null,isolated:false,attempts:0,points:POINTS.map(p=>({...p,tied:false,quality:'unknown',observed:false,checked:false,marked:false,repaired:false})),feedback:'把蓝色枪口移到橙色目标圈内，再按下扳机。'};}
export const tiedCount = s=>s.points.filter(p=>p.tied).length;
export const checkedCount = s=>s.points.filter(p=>p.checked).length;
export const alignedPoint = s=>s.points.find(p=>Math.hypot(p.x-s.aim.x,p.y-s.aim.y)<=AIM_RADIUS)||null;
export const selectedPoint = s=>s.points.find(p=>p.id===s.selected)||null;
export function moveAim(s,x,y){if(s.stage!=='tying'||s.busy)return s;return {...s,aim:{x:clampGame(x,180,660),y:clampGame(y,135,355)}};}
export function moveBy(s,x,y){return moveAim(s,s.aim.x+x,s.aim.y+y);}
export function startTie(s){
 if(s.stage!=='tying'||s.busy)return s;
 const p=alignedPoint(s),next={...s,attempts:s.attempts+1};
 if(!p)return {...next,feedback:'枪口还没有对准交点。移动到目标圈内，再试一次。'};
 if(p.tied)return {...next,feedback:p.id+' 点已经绑过了，换一个橙色目标。'};
 return {...next,selected:p.id,busy:{kind:'tie',id:p.id},feedback:p.id+' 点已对准，保持就位，观察绑丝绕过两根钢筋。'};
}
export function startReview(s){
 if(s.stage!=='tying'||s.busy||tiedCount(s)!==4)return s;
 const quality={A:'normal',B:'missing',C:'loose',D:'normal'};
 return {...s,stage:'review',isolated:true,selected:null,points:s.points.map(p=>({...p,tied:quality[p.id]!=='missing',quality:quality[p.id],observed:false,checked:false,marked:false,repaired:false})),feedback:'工具已归位，模拟停机隔离完成。现在复核另一组交点：点选一个交点，近看并轻拉检查。'};
}
export function selectPoint(s,id){
 if(s.stage!=='review'||s.busy||!s.points.some(p=>p.id===id))return s;
 const p=s.points.find(p=>p.id===id);
 return {...s,selected:id,feedback:p.checked?id+' 点已完成本次教学复核。':p.marked?id+' 点已标记，退出人工检查后执行补绑。':p.quality==='missing'?id+' 点没有绑丝。记录这个漏绑点，再安排补绑。':id+' 点有绑丝。轻拉查看丝扣是否明显松动。'};
}
export function inspectPoint(s){
 const p=selectedPoint(s);if(s.stage!=='review'||s.busy||!s.isolated||!p||p.checked)return s;
 if(p.quality==='missing')return {...s,points:s.points.map(q=>q.id===p.id?{...q,observed:true}:q),feedback:p.id+' 点目视发现漏绑，没有丝扣可拉。请标记补绑。'};
 return {...s,busy:{kind:'pull',id:p.id},feedback:'正在轻拉 '+p.id+' 点：观察丝圈与钢筋的相对变化。'};
}
export function markRepair(s){
 const p=selectedPoint(s);if(s.stage!=='review'||s.busy||!s.isolated||!p||p.checked)return s;
 if(p.quality==='normal')return {...s,feedback:'这个交点尚未发现漏绑或松动。先完成轻拉复核。'};
 if(p.quality==='loose'&&!p.observed)return {...s,feedback:'先轻拉观察是否松动，再留下补绑标记。'};
 return {...s,points:s.points.map(q=>q.id===p.id?{...q,observed:true,marked:true}:q),feedback:p.id+' 点已留下补绑标记；先退出人工检查，再让工具执行补绑。'};
}
export function repairPoint(s){
 const p=selectedPoint(s);if(s.stage!=='review'||s.busy||!s.isolated||!p?.marked)return s;
 return {...s,isolated:false,busy:{kind:'repair',id:p.id},feedback:'人工检查已退出，工具补绑 '+p.id+' 点。作业时不能轻拉复核。'};
}
export function finishAction(s){
 if(!s.busy)return s;const {kind,id}=s.busy;
 let points=s.points.map(p=>{
  if(p.id!==id)return p;
  if(kind==='tie')return {...p,tied:true};
  if(kind==='repair')return {...p,tied:true,quality:'normal',repaired:true,marked:false,checked:false,observed:false};
  return {...p,observed:true,checked:p.quality==='normal'};
 });
 let next={...s,points,busy:null,isolated:kind==='repair'?true:s.isolated};
 if(kind==='tie')next.feedback=tiedCount(next)===4?'四个目标已绑完。动作完成后，下一步是人工复核。':id+' 点绑扎完成。继续对准下一个橙色目标。';
 if(kind==='repair')next.feedback=id+' 点已补绑；工具再次归位并模拟隔离。请重新轻拉复核，不能直接记为完成。';
 if(kind==='pull')next.feedback=selectedPoint(next).quality==='loose'?id+' 点丝圈明显松动。留下补绑标记，处理后再复核。':id+' 点本次教学复核完成。继续检查其他交点。';
 if(next.stage==='review'&&checkedCount(next)===4)next={...next,stage:'done',feedback:'全部四点已完成复核，漏绑与松扣均经过补绑、再次复核。'};
 return next;
}
