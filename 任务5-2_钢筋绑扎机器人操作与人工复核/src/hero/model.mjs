export const POINTS = Object.freeze([
  {id:'A',x:-.5,z:-.5}, {id:'B',x:.5,z:-.5},
  {id:'C',x:-.5,z:.5}, {id:'D',x:.5,z:.5}
]);
export const PHASES = ['定位','就位','送丝','扭结','离开'];
export const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const smooth = n=>{n=clamp(n);return n*n*(3-2*n)};
export function cycleAt(value,fault=false) {
  const requested=clamp(Number(value)||0),p=fault?Math.min(requested,.51):requested;
  return {p,phase:Math.min(4,Math.floor(p*5)),feed:clamp((p-.4)/.2),
    approach:smooth(p/.2),grip:smooth((p-.2)/.2)*(1-smooth((p-.8)/.2)),
    cut:smooth((p-.6)/.035),tight:smooth((p-.635)/.07),twist:smooth((p-.705)/.095),
    leave:smooth((p-.8)/.2),jammed:fault&&requested>=.51};
}
export function createGame() {
  return {stage:'tying',aim:{x:0,z:0},selected:null,isolated:false,busy:null,
    points:POINTS.map(p=>({...p,tied:false,quality:'missing',checked:false,marked:false,inspected:false})),
    message:'点选钢筋交点，让枪口就位。也可点按钢筋区域移动、用方向键微调。'};
}
export const tiedCount = g=>g.points.filter(p=>p.tied).length;
export const checkedCount = g=>g.points.filter(p=>p.checked).length;
export const pendingCount = g=>g.points.filter(p=>p.marked&&!p.checked).length;
export const selectedPoint = g=>g.points.find(p=>p.id===g.selected)||g.points[0];
export function alignedPoint(g,aim=g.aim) {
  return g.points.find(p=>Math.hypot(p.x-aim.x,p.z-aim.z)<=.085)||null;
}
export function moveAim(g,aim) {
  if(g.busy||g.stage!=='tying')return false;
  g.aim={x:clamp(aim.x,-.78,.78),z:clamp(aim.z,-.78,.78)};
  const p=alignedPoint(g); if(p)g.selected=p.id;
  g.message=p?(p.tied?`${p.id} 点已经绑好，换一个交点。`:`${p.id} 点已选中，等待机械臂就位后开始绑扎。`):'枪口还没有对准交点。点选目标，或用方向键微调。';
  return true;
}
export function startTie(g,actualAim=g.aim,settled=true) {
  if(g.busy||g.stage!=='tying')return false;
  if(!settled||Math.hypot(actualAim.x-g.aim.x,actualAim.z-g.aim.z)>.014){g.message='机械臂还在转移，等枪口稳定后再开始。';return false}
  const p=alignedPoint(g,actualAim);
  if(!p){g.message='枪口偏离交点，先调整位置。';return false}
  if(p.tied){g.message=`${p.id} 点已完成，无需重复绑扎。`;return false}
  g.selected=p.id; g.aim={x:p.x,z:p.z};g.busy={kind:'tie',id:p.id};
  g.message=`${p.id} 点绑扎中：保持枪口就位，观察绑丝成环。`;return true;
}
export function startReview(g) {
  if(g.busy||g.stage!=='tying'||tiedCount(g)!==4)return false;
  g.stage='review';g.isolated=false;g.selected='A';g.aim={x:0,z:0};
  g.points=POINTS.map((p,i)=>({...p,tied:i!==1,quality:i===1?'missing':i===2?'loose':'normal',checked:false,marked:false,inspected:false}));
  g.message='进入另一组预置复核样区。先将工具归位并模拟停机隔离，再检查四个交点。';return true;
}
export function isolate(g) {
  if(g.stage!=='review'||g.busy)return false;
  g.isolated=true;g.message='工具已归位，模拟停机隔离完成。点选一个交点，近看并轻拉检查。';return true;
}
export function selectPoint(g,id) {
  const p=g.points.find(p=>p.id===id); if(!p||g.busy)return false;
  g.selected=id;
  if(g.stage==='tying')return moveAim(g,p);
  g.message=g.isolated?`${id} 点：先观察是否包住两根钢筋，再轻拉检查是否松动。`:'先完成工具归位与模拟停机隔离。';return true;
}
export function startPull(g) {
  if(g.busy||g.stage!=='review'||!g.isolated)return false;
  const p=selectedPoint(g);g.busy={kind:'pull',id:p.id};g.message=`正在轻拉 ${p.id} 点，观察绑丝是否明显移动。`;return true;
}
export function markRepair(g) {
  const p=selectedPoint(g);
  if(g.busy||g.stage!=='review'||!g.isolated||p.checked)return false;
  if(p.quality==='normal'){g.message='这个交点没有观察到漏绑或明显松动，先完成轻拉复核。';return false}
  if(p.quality==='loose'&&!p.inspected){g.message='先轻拉这个绑扣，观察结果后再标记。';return false}
  p.marked=true;g.message=`${p.id} 点已标记。退出检查，执行补绑，再重新复核。`;return true;
}
export function startRepair(g) {
  const p=selectedPoint(g);if(g.busy||g.stage!=='review'||!p.marked)return false;
  g.isolated=false;g.aim={x:p.x,z:p.z};g.busy={kind:'repair',id:p.id};
  g.message=`已退出人工检查，正在补绑 ${p.id} 点。`;return true;
}
export function finishAction(g) {
  if(!g.busy)return false;
  const {kind,id}=g.busy,p=g.points.find(p=>p.id===id);g.busy=null;
  if(kind==='tie'||kind==='repair'){
    p.tied=true;p.quality='normal';p.checked=false;p.marked=false;p.inspected=false;
    g.message=kind==='tie'?(tiedCount(g)===4?'四点绑扎完成！进入复核样区，检查那些看起来已经绑好的交点。':`${id} 点完成。继续移动到下一个交点。`):`${id} 点补绑完成。重新归位并模拟停机隔离，再轻拉复核。`;
  } else if(kind==='pull') {
    p.inspected=true;
    if(p.quality==='normal'){p.checked=true;g.message=`${id} 点包住两根钢筋，轻拉未见明显松动，复核通过。`}
    else g.message=p.quality==='missing'?`${id} 点没有绑丝包住交点，需要标记补绑。`:`${id} 点绑丝出现明显位移，需要标记补绑。`;
    if(checkedCount(g)===4){g.stage='done';g.message='四个交点均已复核：有漏绑就补绑，有松结就处理，处理后再复核。'}
  }
  return true;
}
