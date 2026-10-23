const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let progress=.4,target=.4,playing=false,speed=.5,mode='game',fault='normal',frame=0,last=0,visible=true,view='action';
let faultMarked=false,isolated=false;
const descriptions=['枪口对准交点','保持工具就位','绑丝绕住两根筋','收紧并扭合丝端','工具退出，准备复核'];
$('phase-buttons').innerHTML=M.PHASES.map((p,i)=>`<button class="phase-btn" data-phase="${i}" aria-label="第${i+1}步 ${p.name}"><span class="num">0${i+1}</span><strong>${p.name}</strong><span class="desc">${descriptions[i]}</span><span class="track"><i></i></span></button>`).join('');
const phaseNodes=all('[data-phase]');
const partNotes={spool:'供丝盘：存放绑丝。停机隔离后，按机型要求检查丝盘安装与放丝路径。',feed:'送丝轮：把绑丝向前推。轮子转动不等于绑丝已经绕到位。',head:'工具头：在交点完成成环与扭结；工具口需要包住交叉的两根筋。',guide:'导向槽：引导绑丝绕过交点。停机后检查是否有异物，不在运行中伸手清理。',bars:'两根钢筋：绑丝必须同时绕住上下两根筋，不能只绕住一根。'};
function setActive(selector,value,key){all(selector).forEach(b=>{const on=b.dataset[key]===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function stop(){playing=false;$('play').textContent=reduced.matches?'下一小步 →':'▶ 播放动作';$('play').setAttribute('aria-label',reduced.matches?'下一小步':'播放动作');}
function seek(v){if(fault==='jam'&&(faultMarked||isolated)&&v<.51)resetFaultRecord();stop();target=M.stateAt(v,fault).p;if(reduced.matches){progress=target;draw();}else run();}
function setMode(next){
 if(!['game','cycle','fault'].includes(next))return;
 stop();mode=next;view='action';fault=next==='fault'?'jam':'normal';faultMarked=isolated=false;target=progress=next==='cycle'?.4:0;
 document.body.dataset.mode=next;setActive('button[data-mode]',next,'mode');
 $('game-view').hidden=next!=='game';$('game-controls').hidden=next!=='game';$('study-controls').hidden=next==='game';
 $('cycle-content').hidden=next!=='cycle';$('fault-content').hidden=next!=='fault';
 document.querySelector('.timeline').hidden=next==='game';$('game-route').hidden=next!=='game';document.querySelector('.scene-tabs').hidden=next==='game';
 $('headline').textContent={game:'先绑四个点，再把质量查清。',cycle:'这一扣，先要绕住两根钢筋。',fault:'丝没送到位，先把异常留住。'}[next];
 $('subhead').textContent={game:'移动枪口、对准交点、扣动扳机。完成后，接着做一次人工复核。',cycle:'只看一个小细节：送丝轮向前推，导向槽引导成环。',fault:'先看绑丝停在哪里，再练习保留异常点、停机隔离和检查路径。'}[next];
 $('eyebrow').textContent={game:'动手操作 · 完成任务',cycle:'小知识 · 送丝到位',fault:'异常处置 · 卡丝情境'}[next];
 $('stage-hint').textContent=next==='game'?'拖动或点按移动枪口 · 方向键微调 · 空格扣动扳机':'拖动进度条慢看 · 空格播放 / 暂停 · ← → 微调';
 $('panel-label').textContent=next==='fault'?'先停下，再检查':'只看一个关键点';
 $('fault-feedback').textContent='先播放卡丝情境，观察送丝停住的位置。';
 setActive('[data-fault]',fault,'fault');setView('action');game?.activate(next==='game');draw();
}
function setView(next){view=next;setActive('[data-view]',next,'view');$('action-view').hidden=mode==='game'||next!=='action';$('structure-view').hidden=mode==='game'||next!=='structure';if(next==='structure'){target=progress;stop();}draw();}
function wirePath(s){const rx=78-39*s.tight,ry=74-20*s.tight,points=[],n=Math.max(1,Math.ceil(s.feed*100));for(let i=0;i<=n;i++){const a=-Math.PI/2-Math.PI*2*s.feed*i/n;points.push([425+rx*Math.cos(a),324+ry*Math.sin(a)]);}return{d:points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' '),tip:points.at(-1),top:324-ry};}
function draw(){
 const s=M.stateAt(progress,fault),phase=M.PHASES[s.phase],wire=wirePath(s);progress=s.p;
 $('tool').setAttribute('transform',`translate(0 ${-s.lift})`);
 $('jaw-left').setAttribute('transform',`translate(${-13*(1-s.grip)} 0)`);$('jaw-right').setAttribute('transform',`translate(${13*(1-s.grip)} 0)`);
 $('tie-loop').setAttribute('d',wire.d);$('tie-loop').style.opacity=s.wireVisible?1:0;
 $('wire-tip').setAttribute('cx',wire.tip[0]);$('wire-tip').setAttribute('cy',wire.tip[1]);$('wire-tip').style.opacity=s.wireVisible&&s.feed<1?1:0;
 const knotLength=26*s.twist,top=wire.top;let a='',b='';for(let i=0;i<=36;i++){const u=i/36,dy=knotLength*u,spread=4.5*Math.sin(u*s.twist*4*Math.PI);a+=(i?'L':'M')+(425+spread).toFixed(2)+' '+(top-dy).toFixed(2)+' ';b+=(i?'L':'M')+(425-spread).toFixed(2)+' '+(top-dy).toFixed(2)+' ';}
 $('knot-a').setAttribute('d',a);$('knot-b').setAttribute('d',b);$('knot').style.opacity=s.twist>0?1:0;
 $('wheel-mark').setAttribute('transform',`rotate(${s.feed*1080} 343 188)`);$('cutter').setAttribute('transform',`translate(${Math.sin(s.cut*Math.PI)*10} 0)`);$('supply-wire').style.opacity=s.cut>=1?.25:1;
 $('twister').setAttribute('transform',`translate(425 0) scale(${1-.25*Math.sin(s.twist*Math.PI*12)} 1) translate(-425 0)`);
 $('phase-number').textContent=`0${s.phase+1} / 05 · ${phase.name}`;$('phase-title').textContent=phase.title;$('phase-text').textContent=phase.text;$('phase-watch').textContent=phase.watch;
 $('drawing-readout').textContent=s.jammed?'送丝受阻 · 尚未成环':`${phase.name} / 0${s.phase+1}`;
 $('progress').value=Math.round(s.p*1000);$('progress-read').textContent=Math.round(s.p*100)+'%';
 $('target-read').innerHTML=Math.round(s.feedTarget*100)+'<small>%</small>';$('feed-read').innerHTML=Math.round(s.feed*100)+'<small>%</small>';
 $('detail-caption').textContent=s.jammed?'绑丝停在中途，尚未绕全。此时不能继续扭结。':['先对准交点，绑丝尚未送出。','工具口就位，包住交叉的两根筋。','看橙色丝端：它沿导向通道绕过两根钢筋。','丝环收紧，丝端扭合；是否牢固仍要检查。','工具退出，绑丝留下，接下来才是复核。'][s.phase];
 $('status-read').textContent=s.jammed?(faultMarked?'异常已记录':'待记录异常'):s.complete?'待复核':'未完成';
 $('mode-status').textContent=reduced.matches?'减少动态效果 · 逐步观察':'进度为教学设定，不是设备实测';
 $('fault-message').classList.toggle('warning',s.jammed);
 $('fault-message').innerHTML=s.jammed?'<span>绑丝没有绕全</span><p>本例停在送丝进度 55%；后续扭结已锁定，本点不能计为完成。</p>':fault==='jam'?'<span>准备观察</span><p>按播放，看橙色丝端在送丝中途停住。</p>':'<span>正常对照</span><p>绑丝绕全后，再观察收紧与扭结。</p>';
 $('mark-fault').disabled=!s.jammed||faultMarked;$('isolate-fault').disabled=!faultMarked||isolated;$('inspect-fault').disabled=!isolated;
 phaseNodes.forEach((b,i)=>{b.classList.toggle('active',s.phase===i);b.setAttribute('aria-pressed',String(s.phase===i));b.querySelector('i').style.width=M.clamp(s.p*5-i)*100+'%';b.disabled=fault==='jam'&&i>2;});
 $('progress').setAttribute('aria-valuetext',`${phase.name}，教学进度${Math.round(s.p*100)}%`);
 if(s.jammed&&playing){target=s.p;stop();}
 if(window.__TYING__)window.__TYING__.state={...s,mode,fault,playing,view,faultMarked,isolated};
}
function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,.04):0;last=now;if(playing&&!reduced.matches){target+=dt*speed/8;if(target>=1){target=1;stop();}}const bounded=M.stateAt(target,fault).p;progress=reduced.matches?bounded:progress+(bounded-progress)*(1-Math.exp(-dt/.09));if(Math.abs(progress-bounded)<.0001)progress=bounded;draw();if(visible&&!document.hidden&&mode!=='game'&&(playing||Math.abs(progress-bounded)>.0001))frame=requestAnimationFrame(tick);}
function run(){if(!frame&&visible&&!document.hidden&&mode!=='game'){last=0;frame=requestAnimationFrame(tick);}}
function togglePlay(){if(mode==='game')return;if(view==='structure')setView('action');if(reduced.matches){seek(progress>=.999?0:Math.min(1,progress+.1));return;}if(playing){target=progress;stop();draw();return;}if(fault==='jam'&&progress>=.509){$('fault-feedback').textContent='后续动作已锁定。请保留异常点，或回到开始回放。';return;}if(progress>=.999)progress=target=0;playing=true;$('play').textContent='Ⅱ 暂停动作';$('play').setAttribute('aria-label','暂停动作');run();}
all('button[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));all('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
phaseNodes.forEach(b=>b.onclick=()=>{setView('action');seek([.1,.3,.5,.76,1][Number(b.dataset.phase)]);});
all('[data-part]').forEach(b=>b.onclick=()=>{const selected=$('iso-model').dataset.selected===b.dataset.part?null:b.dataset.part;if(selected)$('iso-model').dataset.selected=selected;else $('iso-model').removeAttribute('data-selected');setActive('[data-part]',selected,'part');$('component-note').textContent=selected?partNotes[selected]:'点击部件，看它怎样帮助绑丝绕过交点。';});
function resetFaultRecord(){faultMarked=isolated=false;$('fault-feedback').textContent='先播放卡丝情境，观察送丝停住的位置。';}
all('[data-fault]').forEach(b=>b.onclick=()=>{stop();fault=b.dataset.fault;target=progress=.4;resetFaultRecord();setActive('[data-fault]',fault,'fault');setView('action');draw();});
$('mark-fault').onclick=()=>{if(!M.stateAt(progress,fault).jammed)return;faultMarked=true;$('fault-feedback').textContent='P01 已保留为异常点，等待处理。接下来模拟停机隔离。';draw();};
$('isolate-fault').onclick=()=>{if(!faultMarked)return;isolated=true;$('fault-feedback').textContent='教学情境：设备已停机、锁止并隔离。实际操作须按本机规程确认不可运动。';draw();};
$('inspect-fault').onclick=()=>{if(!isolated)return;setView('structure');$('component-note').textContent='按供丝盘 → 送丝轮 → 导向槽查看。实际清障由授权人员在停机隔离后处理。';};
$('progress').addEventListener('input',e=>seek(Number(e.target.value)/1000));$('play').onclick=togglePlay;$('reset').onclick=()=>{resetFaultRecord();seek(0);};$('speed').onclick=()=>{speed=speed===.5?1:speed===1?.25:.5;$('speed').textContent=speed+'×';};
$('theme').onclick=()=>{document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light';};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('mode-status').textContent='可使用浏览器全屏快捷键';}}
$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 退出':'⛶ 全屏';});
for(const id of['help','sources'])$(id).onclick=()=>{target=progress;stop();game?.activate(false);$('info').showModal();};$('close-info').onclick=()=>$('info').close();$('info').addEventListener('close',()=>game?.activate(mode==='game'));
$('info').onclick=e=>{if(e.target===$('info')){const r=$('info').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info').close();}};
document.addEventListener('keydown',e=>{if($('info').open||e.target.matches('input,button,a'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();return;}if(mode==='game')return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key==='ArrowRight'){e.preventDefault();seek(progress+.02);}if(e.key==='ArrowLeft'){e.preventDefault();seek(progress-.02);}if(e.key==='Home'){e.preventDefault();seek(0);}if(e.key==='End'){e.preventDefault();seek(1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;last=0;}}).observe(document.querySelector('main'));
reduced.addEventListener('change',()=>{stop();progress=target;draw();});
window.__TYING__={state:{},seek,setMode,model:M};
const game=window.TyingGame.mount({view:$('game-view'),controls:$('game-controls'),onStudy:()=>setMode('cycle')});
setMode('game');
