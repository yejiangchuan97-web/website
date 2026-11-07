/* Concept: a small steel-mesh bench that you operate, then inspect by hand.
 * Parts: table top + 2 side faces, 4 feet + 4 shoes, 4 corner screws,
 * 12 rod saddles, 6 ribbed rods + 6 end caps, 4 tie loops + 4 knots,
 * gun case/cover/neck/nozzle/2 jaws/2 screws/4 vents/reel/axle/feed collar.
 * The projection is intentionally a classroom schematic, not a product drawing.
 */
(()=>{
const NS='http://www.w3.org/2000/svg';
const project=(x,y,z=0)=>[420+(x-y)*105,220+(x+y)*54-z];
const pair=p=>p.map(n=>n.toFixed(1)).join(',');
const polygon=pts=>pts.map(pair).join(' ');
const box=(x,y,w,d,z,h,cls='')=>{
 const a=project(x,y,z+h),b=project(x+w,y,z+h),c=project(x+w,y+d,z+h),e=project(x,y+d,z+h),f=project(x+w,y,z),g=project(x+w,y+d,z),j=project(x,y+d,z);
 return `<g class="${cls}" stroke="var(--edge,#40648d)" stroke-width=".8"><path d="M${pair(e)}L${pair(c)}L${pair(g)}L${pair(j)}Z" fill="var(--metal1,#a6c6e5)"/><path d="M${pair(b)}L${pair(c)}L${pair(g)}L${pair(f)}Z" fill="var(--metal3,#7ea7cd)"/><polygon points="${polygon([a,b,c,e])}" fill="var(--metal2,#dfedfb)"/></g>`;
};
function bench(){
 const out=[`<defs><linearGradient id="game-steel" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dbe8f4"/><stop offset=".3" stop-color="#93b1ce"/><stop offset=".7" stop-color="#486e95"/><stop offset="1" stop-color="#b2c8df"/></linearGradient><linearGradient id="game-blue" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#43a8ff"/><stop offset=".55" stop-color="#2475dc"/><stop offset="1" stop-color="#154a9f"/></linearGradient><filter id="game-shadow"><feGaussianBlur stdDeviation="10"/></filter></defs><ellipse cx="420" cy="397" rx="280" ry="31" fill="var(--accent)" opacity=".09" filter="url(#game-shadow)"/>`];
 for(const x of[-1.34,1.23])for(const y of[-1.34,1.23]){out.push(box(x-.04,y-.04,.19,.19,-58,5),box(x,y,.11,.11,-53,24));}
 out.push(box(-1.6,-1.6,3.2,3.2,-29,12));
 for(const x of[-1.4,1.4])for(const y of[-1.4,1.4]){const p=project(x,y,-16);out.push(`<circle cx="${p[0]}" cy="${p[1]}" r="3.3" fill="var(--card)" stroke="var(--edge,#40648d)"/><circle cx="${p[0]}" cy="${p[1]}" r="1.2" fill="var(--edge,#40648d)"/>`);}
 for(const axis of['x','y'])for(const t of[-1,0,1]){
  const z=axis==='x'?0:11;
  for(const end of[-1.3,1.2])out.push(axis==='x'?box(end-.07,t-.1,.14,.2,-17,z+8):box(t-.1,end-.07,.2,.14,-17,z+8));
 }
 for(const axis of['x','y'])for(const t of[-1,0,1]){
  const z=axis==='x'?0:11,a=axis==='x'?project(-1.44,t,z):project(t,-1.44,z),b=axis==='x'?project(1.44,t,z):project(t,1.44,z),id=`game-rod-${axis}${t+1}`,len=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/len*9,ny=(b[0]-a[0])/len*9;
  const clip=polygon([[a[0]+nx,a[1]+ny],[b[0]+nx,b[1]+ny],[b[0]-nx,b[1]-ny],[a[0]-nx,a[1]-ny]]);
  out.push(`<defs><clipPath id="${id}"><polygon points="${clip}"/></clipPath></defs><path d="M${pair(a)}L${pair(b)}" stroke="var(--edge,#40648d)" stroke-width="20" stroke-linecap="round"/><path d="M${pair(a)}L${pair(b)}" stroke="url(#game-steel)" stroke-width="18" stroke-linecap="round"/><g clip-path="url(#${id})" stroke="#42678a" stroke-width="2" opacity=".75">`);
  for(let u=.02;u<1;u+=.055){const x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;out.push(`<path d="M${x-6} ${y-12}L${x+6} ${y+12}"/>`);}
  out.push(`</g><ellipse cx="${b[0]}" cy="${b[1]}" rx="6" ry="8" fill="#6e91b1" stroke="#42678a"/>`);
 }
 return out.join('');
}
const gun=`<g id="game-gun-shadow"><ellipse cy="2" rx="36" ry="16" fill="#1d4778" opacity=".1"/></g><g id="game-gun-body" stroke="#174b88" stroke-width="1.4"><path d="M-28-109L18-121L39-103L-9-91Z" fill="#7cc5ff"/><path d="M18-121L39-103V-49L18-62Z" fill="#1556ae"/><path d="M-28-109L18-121V-62L-28-50Z" fill="url(#game-blue)"/><path d="M-20-101L10-109M-20-93L10-101M-20-85L10-93M-20-77L10-85" stroke="#90d1ff" stroke-width="3"/><circle cx="-23" cy="-104" r="2" fill="#fff"/><circle cx="12" cy="-69" r="2" fill="#fff"/><path d="M-21-51L16-61L29-48L-8-38Z" fill="#d6e7f7"/><path d="M-8-38L29-48V-32L-8-22Z" fill="#7c9fbd"/><path d="M-21-51L-8-38V-22L-21-35Z" fill="#b7d1e8"/><path d="M-13-30C-35-26-39-8-23 5L-17-4C-25-13-23-18-9-20Z" fill="#edf4fa"/><path d="M14-35C37-31 40-13 24-2L17-10C26-19 24-24 10-25Z" fill="#c5dbea"/><path d="M-4-23L5-26L6-9L-3-6Z" fill="#345d82"/><circle cx="-47" cy="-85" r="23" fill="#d8e8f5"/><circle cx="-47" cy="-85" r="17" fill="none" stroke="var(--wire)" stroke-width="7"/><circle cx="-47" cy="-85" r="4" fill="#4b7091"/><path d="M-35-67L-16-48" stroke="var(--wire)" stroke-width="2.5"/><path d="M-28-87L-20-91V-80L-28-76Z" fill="#c4d9ec"/></g><g id="game-crosshair" fill="none" stroke="var(--accent)" stroke-width="2"><ellipse rx="22" ry="13"/><path d="M-30 0H-17M17 0H30M0-20V-8M0 8V20"/></g>`;
function mount({view,controls,onStudy=()=>{}}){
 let state=GM.createGame(),active=true,raf=0,last=0,elapsed=0,dragging=false,pointerId=null;
 let aimTarget={...state.aim};
 const visibility={view:true,controls:true};
 const inView=()=>visibility.view||visibility.controls;
 const aiming=()=>state.stage==='tying'&&!state.busy&&Math.hypot(aimTarget.x-state.aim.x,aimTarget.y-state.aim.y)>.2;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const $=id=>view.querySelector('#'+id)||controls.querySelector('#'+id);
 view.innerHTML=`<div class="game-topline"><span>FIG 5.2 / 钢筋作业台</span><span id="game-board-state">蓝色枪口 · 橙色目标</span></div><svg class="game-board" id="game-board" viewBox="0 0 840 455" tabindex="0" role="group" aria-label="绑扎操作台。点击或拖动移动枪口，方向键微调，空格绑扎。">${bench()}<g id="game-targets">${GM.POINTS.map(p=>`<g id="game-point-${p.id}" data-game-point="${p.id}" role="button" tabindex="-1" aria-label="${p.id} 点"><ellipse class="game-target-ring" cx="${p.x}" cy="${p.y}" rx="31" ry="20" fill="var(--wire)" fill-opacity=".07" stroke="var(--wire)" stroke-width="2" stroke-dasharray="5 4"/><g class="game-tie" transform="translate(${p.x} ${p.y})" fill="none" stroke="var(--wire)" stroke-linecap="round"><ellipse rx="23" ry="13" transform="rotate(-27)" stroke-width="3.7"/><path d="M-7-12q5-10 8-1q-5-2-2-10" stroke-width="2.8"/></g><circle class="game-point-badge" cx="${p.x+34}" cy="${p.y-25}" r="12" fill="var(--card)" stroke="var(--border)"/><text x="${p.x+34}" y="${p.y-21}" text-anchor="middle" fill="var(--ink)" font-size="11" font-weight="700">${p.id}</text><circle class="game-checked" cx="${p.x+34}" cy="${p.y-25}" r="12" fill="var(--success,#13836b)"/><path class="game-checked" d="M${p.x+29} ${p.y-25}l4 4 7-8" fill="none" stroke="white" stroke-width="2"/></g>`).join('')}</g><g id="game-moving-wire" fill="none" stroke="var(--wire)" stroke-width="4" stroke-linecap="round"/><g id="game-gun">${gun}</g></svg><div class="game-bottomline"><span id="game-board-hint">点击或拖动枪口 · 方向键微调 · 空格扣扳机</span><strong id="game-aim-state">移向橙色交点</strong></div>`;
 controls.innerHTML=`<div class="game-step"><span id="game-step-label">上岗挑战 01 / 02</span><button id="game-restart" aria-label="重新开始挑战">↺ 重来</button></div><h2 class="game-goal" id="game-goal">把这四个点绑起来</h2><p class="game-intro" id="game-intro">自己移动枪口，对准交点，再扣扳机。先做稳，不抢时间。</p><div class="game-progress"><span id="game-count-label">已完成绑扎</span><strong id="game-count">0 <small>/ 4</small></strong><div class="game-progress-track"><i id="game-progress-fill"></i></div></div><div id="game-aim-controls"><div class="game-dpad" aria-label="微调枪口位置"><button data-game-move="0,-8" aria-label="枪口向上">↑</button><button data-game-move="-8,0" aria-label="枪口向左">←</button><span>微调</span><button data-game-move="8,0" aria-label="枪口向右">→</button><button data-game-move="0,8" aria-label="枪口向下">↓</button></div><button id="game-trigger" class="primary game-main-action">扣下扳机 <span>Space</span></button><button id="game-next" class="primary game-main-action" hidden>工具归位，进入复核 →</button></div><div class="game-inspect" id="game-inspect" hidden><div id="game-safe" class="game-safe">● 工具归位 · 模拟隔离完成</div><div class="game-point-tabs" aria-label="选择复核交点">${GM.POINTS.map(p=>`<button data-game-select="${p.id}" aria-label="复核 ${p.id} 点">${p.id}</button>`).join('')}</div><div class="game-closeup"><span id="game-closeup-title">点选一个交点近看</span><svg id="game-closeup-svg" viewBox="0 0 280 140" role="img" aria-label="丝扣近看与轻拉检查反馈"><defs><pattern id="game-detail-ribs" width="16" height="35" patternUnits="userSpaceOnUse"><path d="M3 0L12 35" stroke="#47698b" stroke-width="2"/></pattern></defs><rect x="38" y="75" width="204" height="27" rx="8" fill="url(#game-steel)"/><rect x="38" y="75" width="204" height="27" rx="8" fill="url(#game-detail-ribs)"/><circle cx="140" cy="58" r="18" fill="url(#game-steel)" stroke="#547b9f" stroke-width="2"/><g id="game-detail-tie" fill="none" stroke="var(--wire)" stroke-width="3.5"><ellipse id="game-detail-loop" cx="140" cy="77" rx="28" ry="32"/><path id="game-detail-knot" d="M137 45q9-9 2-13q-7 4 5 13"/></g><g id="game-pull-hand" fill="var(--card)" stroke="var(--accent)" stroke-width="2"><path d="M145 7v14l-5 11h-10l-8-7-5 3-3-5 8-8 6 4V7l5-3 4 3 4-3Z"/><path d="M130 7v12M137 7v12"/></g></svg><p id="game-closeup-note">先观察有无绑丝，再检查牢固度。</p></div><div class="game-actions"><button id="game-pull" class="primary">轻拉复核</button><button id="game-mark">标记补绑</button><button id="game-repair" class="primary" hidden>退出检查，执行补绑</button></div></div><p id="game-feedback" class="game-feedback" role="status" aria-live="polite"></p><div id="game-complete" class="game-complete" hidden><span>✓ 上岗挑战完成</span><h3>绑完一扣，还要查这一扣。</h3><p>漏绑要补，松扣要处理；补绑后再次复核。</p><button id="game-study" class="primary">看懂这一扣 →</button></div>`;
 function setText(id,t){if($(id).textContent!==t)$(id).textContent=t;}
 function aimReadout(){
  if(state.stage!=='tying')return;
  const aligned=GM.alignedPoint(state),moving=aiming();
  $('game-trigger').disabled=!!state.busy||moving;
  setText('game-aim-state',state.busy?'保持就位…':moving?'枪口移动中…':aligned?(aligned.tied?aligned.id+' 点已绑扎':'已对准 '+aligned.id+' 点'):'移向橙色交点');
 }
 function render(){
  const tying=state.stage==='tying',done=state.stage==='done',p=GM.selectedPoint(state),aligned=GM.alignedPoint(state),count=tying?GM.tiedCount(state):GM.checkedCount(state);
  view.dataset.gameStage=state.stage;controls.dataset.gameStage=state.stage;
  setText('game-step-label',tying?'上岗挑战 01 / 02':'上岗挑战 02 / 02');setText('game-goal',tying?'把这四个点绑起来':'把每个交点检查清楚');setText('game-intro',tying?'自己移动枪口，对准交点，再扣扳机。先做稳，不抢时间。':'这是另一组交点。近看、轻拉，留下问题标记；补绑后记得再次复核。');
  setText('game-count-label',tying?'已完成绑扎':'已完成复核');$('game-count').innerHTML=count+' <small>/ 4</small>';$('game-progress-fill').style.width=count*25+'%';
  $('game-aim-controls').hidden=!tying;$('game-inspect').hidden=tying||done;$('game-complete').hidden=!done;$('game-next').hidden=!tying||count!==4;$('game-trigger').hidden=tying&&count===4;
  $('game-trigger').disabled=!!state.busy;controls.querySelectorAll('[data-game-move]').forEach(b=>b.disabled=!!state.busy||count===4);
  setText('game-feedback',state.feedback);setText('game-board-state',tying?'蓝色枪口 · 橙色目标':done?'四点复核完成':'工具归位后，逐点复核');
  setText('game-board-hint',tying?'点击或拖动枪口 · 方向键微调 · 空格扣扳机':'点选交点近看 · 发现问题后补绑并再次复核');
  setText('game-aim-state',tying?(state.busy?'保持就位…':aligned?(aligned.tied?aligned.id+' 点已绑扎':'已对准 '+aligned.id+' 点'):'移向橙色交点'):done?'复核完成':p?p.id+' 点 / '+(p.checked?'已复核':p.marked?'待补绑':'待复核'):'选择一个交点');
  for(const point of state.points){
   const el=$('game-point-'+point.id);el.querySelector('.game-tie').style.opacity=point.tied?'1':'0';
   el.querySelector('.game-tie').setAttribute('transform',`translate(${point.x} ${point.y}) scale(${!tying&&point.quality==='loose'?1.18:1})`);
   el.querySelector('.game-target-ring').style.opacity=tying?(point.tied?'.2':'1'):(point.checked?'0':point.id===state.selected?'1':'.35');
   el.querySelector('.game-target-ring').style.stroke=point.marked?'var(--warning,#c76c19)':'var(--wire)';el.querySelectorAll('.game-checked').forEach(n=>n.style.opacity=point.checked?'1':'0');
   el.setAttribute('tabindex',!tying&&!done?'0':'-1');el.setAttribute('aria-label',point.id+' 点，'+(tying?(point.tied?'已绑扎':'待绑扎'):point.checked?'已复核':point.marked?'待补绑':'待复核'));
  }
  controls.querySelectorAll('[data-game-select]').forEach(b=>{const point=state.points.find(p=>p.id===b.dataset.gameSelect);b.classList.toggle('active',b.dataset.gameSelect===state.selected);b.classList.toggle('checked',point.checked);b.setAttribute('aria-pressed',String(b.dataset.gameSelect===state.selected));b.disabled=!!state.busy;});
  setText('game-safe',state.isolated?'● 工具归位 · 模拟隔离完成':'● 人工检查已退出 · 工具补绑中');
  $('game-pull').disabled=!p||p.checked||!!state.busy||!state.isolated;$('game-mark').disabled=!p||p.checked||!!state.busy||!state.isolated||p.marked;$('game-repair').hidden=!p?.marked;$('game-repair').disabled=!!state.busy;
  setText('game-closeup-title',p?p.id+' 点 · '+(p.repaired?'补绑后再次复核':'交点近看'):'点选一个交点近看');
  $('game-detail-tie').style.opacity=p&&p.quality!=='missing'?'1':'0';$('game-closeup-svg').style.opacity=p?'1':'.35';
  setText('game-closeup-note',!p?'先观察有无绑丝，再检查牢固度。':p.checked?'本次教学复核完成。':p.quality==='missing'?'没有绑丝：目视即可发现漏绑。':p.observed&&p.quality==='loose'?'轻拉后丝圈明显松动，需要处理。':p.repaired?'已经补绑，还需要重新轻拉复核。':'有绑丝，还需要检查牢固度。');
  aimReadout();motion(state.busy?Math.min(1,elapsed/(state.busy.kind==='pull'?1050:1500)):0);window.__TYING_GAME__.state=state;
 }
 function motion(u){
  const b=state.busy,p=b?state.points.find(p=>p.id===b.id):GM.selectedPoint(state),moving=b&&(b.kind==='tie'||b.kind==='repair');
  let x=state.aim.x,y=state.aim.y,lift=0;
  if(state.stage!=='tying'){x=690;y=130;}
  if(moving){x=p.x;y=p.y;lift=u<.2?-30*(1-u/.2):u>.85?-45*(u-.85)/.15:0;}
  $('game-gun').setAttribute('transform',`translate(${x} ${y+lift})`);$('game-gun').style.opacity=state.stage==='tying'||moving?'1':'.38';$('game-crosshair').style.opacity=state.stage==='tying'&&!b?'1':'0';
  const wire=$('game-moving-wire');
  if(moving&&u>.28){const f=Math.min(1,(u-.28)/.38),points=[];for(let i=0;i<=Math.ceil(f*50);i++){const t=-Math.PI/2+Math.PI*2*f*i/Math.ceil(f*50);points.push([p.x+23*Math.cos(t),p.y+13*Math.sin(t)]);}wire.innerHTML=`<path d="${points.map((a,i)=>(i?'L':'M')+a.map(n=>n.toFixed(2)).join(' ')).join(' ')}"/>`;}else wire.innerHTML='';
  const pull=b?.kind==='pull',amount=p?.quality==='loose'?Math.sin(u*Math.PI)*21:Math.sin(u*Math.PI)*3;
  $('game-detail-loop').setAttribute('ry',p?.quality==='loose'?38+amount:32+amount);$('game-detail-loop').setAttribute('cy',77-amount/2);$('game-detail-knot').setAttribute('transform',`translate(0 ${p?.quality==='loose'?-6-amount:-amount})`);
  $('game-pull-hand').style.opacity=p&&state.isolated?'1':'0';$('game-pull-hand').setAttribute('transform',`translate(0 ${pull?-amount:0})`);
 }
 function frame(now){
  raf=0;if(!active||!inView()||document.hidden||(!state.busy&&!aiming())){last=0;return;}
  const dt=last?Math.min(now-last,80):0;last=now;
  if(state.busy){
   elapsed+=dt;const u=Math.min(1,elapsed/(state.busy.kind==='pull'?1050:1500));motion(u);
   if(u>=1){state=GM.finishAction(state);elapsed=last=0;render();}
  }else{
   // state.aim is the displayed gun position. Hit testing never uses the target.
   const follow=1-Math.exp(-dt/65);
   state=GM.moveAim(state,state.aim.x+(aimTarget.x-state.aim.x)*follow,state.aim.y+(aimTarget.y-state.aim.y)*follow);
   if(!aiming())state=GM.moveAim(state,aimTarget.x,aimTarget.y);
   motion(0);aimReadout();window.__TYING_GAME__.state=state;
  }
  if(state.busy||aiming())raf=requestAnimationFrame(frame);else last=0;
 }
 function run(){if((state.busy||aiming())&&active&&inView()&&!document.hidden&&!raf){last=0;raf=requestAnimationFrame(frame);}}
 function apply(fn,...args){
  if(!active||state.busy)return;
  if(fn===GM.moveAim||fn===GM.moveBy){
   const requested=fn({...state,aim:aimTarget},...args);aimTarget={...requested.aim};
   if(reduced.matches)state=GM.moveAim(state,aimTarget.x,aimTarget.y);
  }else{
   // A trigger cannot act on a point before the visible gun has reached it.
   if(fn===GM.startTie&&aiming())return;
   const next=fn(state,...args);if(next===state)return;state=next;
   if(state.busy){elapsed=last=0;if(reduced.matches)state=GM.finishAction(state);}
  }
  render();run();
 }
 function aimAt(e){const svg=$('game-board'),pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const m=svg.getScreenCTM();if(!m)return;const p=pt.matrixTransform(m.inverse());apply(GM.moveAim,p.x,p.y);}
 const board=$('game-board');
 board.addEventListener('pointerdown',e=>{if(!active||state.busy||state.stage!=='tying')return;dragging=true;pointerId=e.pointerId;board.setPointerCapture(e.pointerId);aimAt(e);e.preventDefault();board.focus({preventScroll:true});});
 board.addEventListener('pointermove',e=>{if(dragging&&e.pointerId===pointerId)aimAt(e);});
 const release=e=>{if(e.pointerId===pointerId){dragging=false;pointerId=null;if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);}};
 board.addEventListener('pointerup',release);board.addEventListener('pointercancel',release);board.addEventListener('lostpointercapture',()=>{dragging=false;pointerId=null;});
 view.querySelectorAll('[data-game-point]').forEach(el=>{el.addEventListener('click',()=>apply(GM.selectPoint,el.dataset.gamePoint));el.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&state.stage==='review'){e.preventDefault();e.stopPropagation();apply(GM.selectPoint,el.dataset.gamePoint);}});});
 controls.querySelectorAll('[data-game-move]').forEach(b=>b.onclick=()=>apply(GM.moveBy,...b.dataset.gameMove.split(',').map(Number)));
 controls.querySelectorAll('[data-game-select]').forEach(b=>b.onclick=()=>apply(GM.selectPoint,b.dataset.gameSelect));
 $('game-trigger').onclick=()=>apply(GM.startTie);$('game-next').onclick=()=>apply(GM.startReview);$('game-pull').onclick=()=>apply(GM.inspectPoint);$('game-mark').onclick=()=>apply(GM.markRepair);$('game-repair').onclick=()=>apply(GM.repairPoint);$('game-study').onclick=onStudy;
 function reset(){cancelAnimationFrame(raf);raf=0;elapsed=last=0;dragging=false;state=GM.createGame();aimTarget={...state.aim};render();}
 $('game-restart').onclick=reset;
 function key(e){if(!active||document.querySelector('dialog[open]')||state.stage!=='tying'||e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;const d={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[e.key];if(d){e.preventDefault();apply(GM.moveBy,...d);}else if(e.code==='Space'&&!e.target.matches('button,a')){e.preventDefault();apply(GM.startTie);}}
 document.addEventListener('keydown',key);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else run();});
 // On phones the inspection controls and close-up can be visible below the board.
 // Work stays live whenever either half is visible, and pauses only when both leave.
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)visibility[entry.target===view?'view':'controls']=entry.isIntersecting;
  if(!inView()){cancelAnimationFrame(raf);raf=0;last=0;}else run();
 });
 observer.observe(view);observer.observe(controls);
 reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(raf);raf=0;if(state.busy)state=GM.finishAction(state);state=GM.moveAim(state,aimTarget.x,aimTarget.y);elapsed=last=0;render();}else run();});
 const api={activate(value){active=value;dragging=false;if(!active){cancelAnimationFrame(raf);raf=0;last=0;}else{render();run();}},reset,get state(){return state;}};
 window.__TYING_GAME__={state,model:GM};render();return api;
}
window.TyingGame={mount};
})();
