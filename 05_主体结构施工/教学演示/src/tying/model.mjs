export const PHASES = [
  {name:'定位',title:'先找交点，再让工具靠近',text:'工具口对准两根钢筋的交叉处，同时留出进入和退出空间。目标坐标正确，还要核对实际钢筋的位置。',watch:'观察工具口与交点的相对位置。',signal:'对点中'},
  {name:'夹持',title:'先稳定相对位置，才允许送丝',text:'工具口包住交点并保持就位。这里的“夹持”表示就位约束；不同设备的导向臂、夹持与检测结构可能不同。',watch:'观察工具口包络是否覆盖上下两根钢筋。',signal:'工具就位'},
  {name:'送丝',title:'钢丝要绕过两根钢筋',text:'送丝轮推动钢丝沿导向通道绕过交点。丝端必须回到工具工作区，后续切断、收紧和扭结才有对象。',watch:'对照目标送丝进度与实际进度。',signal:'送丝中'},
  {name:'扭结',title:'切断、收紧，再把丝端扭合',text:'本演示先切断，再示意收紧与扭结。实际机型可能包含回抽、双丝和折弯动作，顺序与参数应以设备资料为准。',watch:'看丝环缩小、两个丝端形成扭结。',signal:'扭结中'},
  {name:'离开',title:'工具离开，绑丝留在交点',text:'扭结后工具退出，再转移到下一交点。动画完成只说明本次动作走完，绑扎牢固度仍需人工复核。',watch:'观察工具退出与绑丝保留。',signal:'动作完成 · 待复核'}
];
export const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
export const ease=n=>{n=clamp(n);return n*n*(3-2*n)};
export function stateAt(progress, fault='normal', sample='normal'){
  const requested=clamp(Number(progress)||0),p=fault==='jam'?Math.min(requested,.51):requested;
  const phase=Math.min(4,Math.floor(p*5)),local=clamp(p*5-phase);
  const feed=clamp((p-.4)/.2),cut=clamp((p-.6)/.035),tight=ease((p-.635)/.07),twist=ease((p-.705)/.095);
  const approach=ease(p/.2),leave=ease((p-.8)/.2);
  return {p,phase,local,feed,cut,tight,twist,approach,leave,jammed:fault==='jam'&&requested>=.51,
    lift:96*(1-approach)+130*leave,grip:ease((p-.2)/.2)*(1-leave),
    complete:p>=.999,review:sample,wireVisible:sample!=='missing'&&feed>0,
    loose:sample==='loose',feedTarget:phase>=2?1:0};
}
