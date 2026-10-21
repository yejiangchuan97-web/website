const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let progress=0,target=0,playing=false,speed=.5,mode='cycle',fault='normal',sample='normal',frame=0,last=0,visible=true,touched=false,touring=false;
const descriptions=['对准交叉点','保持工具就位','钢丝绕过交点','切断 · 收紧 · 扭合','退出并保留绑丝'];
$('phase-buttons').innerHTML=M.PHASES.map((p,i)=>`<button class="phase-btn" data-phase="${i}" aria-label="第${i+1}步 ${p.name}"><span class="num">0${i+1}<span>${['ALIGN','HOLD','FEED','TWIST','RETRACT'][i]}</span></span><strong>${p.name}</strong><span class="desc">${descriptions[i]}</span><span class="track"><i></i></span></button>`).join('');
const partNotes={spool:'供丝盘储存绑扎丝；供丝不畅时，要保留异常并在停机隔离后检查。',feed:'送丝轮负责推动钢丝；轮转动不等于钢丝已到位，需结合实际供丝反馈。',head:'工具头完成就位、切断与扭结。外壳被简化，便于观察下端工作区。',guide:'弧形通道约束钢丝绕过交点。教学台固定展示，实际导向结构因机型而异。',bars:'上下两根钢筋在交点接触。绑丝必须绕过两根钢筋，不能只绕住一根。'};
const phaseNodes=all('[data-phase]');
function setActive(selector,value,key){all(selector).forEach(b=>{const on=b.dataset[key]===value;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function interaction(){touched=true;touring=false;}
function stop(){playing=false;touring=false;$('play').textContent=reduced.matches?'下一小步 →':'▶ 播放动作';$('play').setAttribute('aria-label',reduced.matches?'下一小步':'播放动作');}
function seek(v){interaction();stop();target=M.stateAt(v,fault,sample).p;if(reduced.matches){progress=target;draw();}else run();}
function setMode(next){interaction();stop();mode=next;fault='normal';sample='normal';target=progress=next==='review'?1:0;document.body.dataset.mode=next;setActive('button[data-mode]',next,'mode');for(const m of['cycle','fault','review'])$(m+'-content').hidden=m!==next;$('play-controls').hidden=next==='review';$('panel-label').textContent={cycle:'动作观察',fault:'异常回放',review:'结果复核'}[next];$('headline').textContent={cycle:'一根绑丝，怎样锁住交点？',fault:'卡在送丝，后面就不能继续',review:'动作结束，复核才刚开始'}[next];$('subhead').textContent={cycle:'把短暂的一次绑扎，拆成五个可观察的动作。',fault:'用同一交点对比：指令发出了，钢丝到位了吗？',review:'外观、完整性与牢固度，需要不同的证据。'}[next];setActive('[data-fault]','normal','fault');setActive('[data-sample]','normal','sample');$('answer-feedback').textContent='先观察，再选择检查方法。';$('answer-feedback').className='';all('[data-answer]').forEach(b=>b.classList.remove('active'));setView('action');phaseNodes.forEach(b=>b.disabled=next==='review');draw();}
function setView(view){setActive('[data-view]',view,'view');$('action-view').hidden=view!=='action';$('structure-view').hidden=view!=='structure';if(view==='structure'){stop();$('iso-model').removeAttribute('data-selected');all('[data-part]').forEach(b=>b.classList.remove('active'));}draw();}
function wirePath(s){
 const tight=s.loose?s.tight*.28:s.tight,rx=78-39*tight,ry=74-20*tight,points=[];
 const n=Math.max(1,Math.ceil(s.feed*100));
 for(let i=0;i<=n;i++){const a=-Math.PI/2-Math.PI*2*s.feed*i/n;points.push([425+rx*Math.cos(a),324+ry*Math.sin(a)]);}
 return {d:points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' '),tip:points.at(-1),top:324-ry};
}
function draw(){
 const s=M.stateAt(progress,fault,sample),phase=M.PHASES[s.phase],wire=wirePath(s);progress=s.p;
 $('tool').setAttribute('transform',`translate(0 ${-s.lift})`);
 // The jaw slides indicate tool positioning, not a claimed universal jaw linkage.
 $('jaw-left').setAttribute('transform',`translate(${-13*(1-s.grip)} 0)`);$('jaw-right').setAttribute('transform',`translate(${13*(1-s.grip)} 0)`);
 $('tie-loop').setAttribute('d',wire.d);$('tie-loop').style.opacity=s.wireVisible?1:0;
 $('wire-tip').setAttribute('cx',wire.tip[0]);$('wire-tip').setAttribute('cy',wire.tip[1]);$('wire-tip').style.opacity=s.wireVisible&&s.feed<1?1:0;
 const knotLength=26*s.twist,top=wire.top;let a='',b='';
 for(let i=0;i<=36;i++){const u=i/36,dy=knotLength*u,spread=4.5*Math.sin(u*s.twist*4*Math.PI);a+=(i?'L':'M')+(425+spread).toFixed(2)+' '+(top-dy).toFixed(2)+' ';b+=(i?'L':'M')+(425-spread).toFixed(2)+' '+(top-dy).toFixed(2)+' ';}
 $('knot-a').setAttribute('d',a);$('knot-b').setAttribute('d',b);$('knot').style.opacity=s.wireVisible&&s.twist>0?1:0;
 $('wheel-mark').setAttribute('transform',`rotate(${s.feed*1080} 343 188)`);
 $('cutter').setAttribute('transform',`translate(${Math.sin(s.cut*Math.PI)*10} 0)`);
 $('supply-wire').style.opacity=s.cut>=1?.25:1;
 $('twister').setAttribute('transform',`translate(425 0) scale(${1-.25*Math.sin(s.twist*Math.PI*12)} 1) translate(-425 0)`);
 $('phase-number').textContent=`0${s.phase+1} / 05`;$('phase-title').textContent=phase.title;$('phase-text').textContent=phase.text;$('phase-watch').textContent=phase.watch;
 $('drawing-readout').textContent=mode==='review'?{normal:'A / 动作完成，质量待复核',missing:'B / 漏绑样例',loose:'C / 疑似松扣'}[sample]:s.jammed?'送丝受阻 / 已停止':`${phase.name} / 0${s.phase+1}`;
 $('progress').value=Math.round(s.p*1000);$('progress-read').textContent=Math.round(s.p*100)+'%';
 $('target-read').innerHTML=Math.round(s.feedTarget*100)+'<small>%</small>';$('feed-read').innerHTML=Math.round(s.feed*100)+'<small>%</small>';
 $('target-label').textContent=mode==='review'?'动作记录':'目标送丝';$('feed-label').textContent=mode==='review'?'外观':'实际送丝';
 $('target-read').classList.toggle('text-metric',mode==='review');$('feed-read').classList.toggle('text-metric',mode==='review');
 if(mode==='review'){$('target-read').textContent=sample==='missing'?'未执行':'已完成';$('feed-read').textContent=sample==='missing'?'无绑丝':'有绑丝';}
 $('detail-caption').textContent=mode==='review'?{normal:'外观完整，还需人工检查牢固度。',missing:'交点没有绑丝，应记录并安排补绑。',loose:'丝环松弛是线索，牢固度需要实查。'}[sample]:s.jammed?'钢丝只走到一半，尚未形成完整丝环。':['先对准交点，绑丝尚未送出。','保持就位，准备沿导向通道送丝。','丝端逐渐绕过两根钢筋，回到工具工作区。','切断与收紧后，两个丝端形成扭结。','工具退出；丝环和扭结留在交点。'][s.phase];
 $('status-read').textContent=mode==='review'?{normal:'待复核',missing:'需补绑',loose:'待检查'}[sample]:s.jammed?'异常保留':s.complete?'待复核':'未完成';
 $('mode-status').textContent=mode==='review'?'判断仅用于本页教学练习':s.jammed?'已停在送丝阶段 · 本点不计为完成':reduced.matches?'减少动态效果已启用 · 按按钮逐步观察':'可随时暂停、拖动与回放';
 $('fault-message').classList.toggle('warning',s.jammed);
 $('fault-message').innerHTML=s.jammed?'<span>送丝不足，停止后续动作</span><p>目标 100%，实际 55%。保留此异常点；实际清障须先按规程停机、隔离并确认不可运动。</p>':fault==='jam'?'<span>教学故障已置入</span><p>播放到送丝中途，观察实际送丝停止与后续动作锁定。</p>':'<span>正常对照</span><p>送丝完成后，才进入切断与扭结。</p>';
 phaseNodes.forEach((b,i)=>{b.classList.toggle('active',s.phase===i);b.setAttribute('aria-pressed',String(s.phase===i));b.querySelector('i').style.width=M.clamp(s.p*5-i)*100+'%';b.disabled=mode==='review'||(fault==='jam'&&i>2);});
 $('progress').setAttribute('aria-valuetext',`${phase.name}，教学进度${Math.round(s.p*100)}%`);
 if(s.jammed&&playing)stop();
 window.__TYING__.state={...s,mode,fault,sample,playing};
}
function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,.04):0;last=now;
 if(playing&&!reduced.matches){target+=dt*speed/8;if(target>=1){if(touring){target=0;progress=0;}else{target=1;stop();}}}
 const bounded=M.stateAt(target,fault,sample).p;progress=reduced.matches?bounded:progress+(bounded-progress)*(1-Math.exp(-dt/.09));if(Math.abs(progress-bounded)<.0001)progress=bounded;
 draw();if(visible&&!document.hidden&&(playing||Math.abs(progress-bounded)>.0001))frame=requestAnimationFrame(tick);
}
function run(){if(!frame&&visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
function togglePlay(){interaction();if(mode==='review')return;if(reduced.matches){seek(progress>=.999?0:Math.min(1,progress+.1));return;}if(playing){target=progress;stop();draw();return;}if(fault==='jam'&&progress>=.509){$('mode-status').textContent='请回到开始回放，或切换正常供丝进行对照';return;}if(progress>=.999)progress=target=0;playing=true;$('play').textContent='Ⅱ 暂停动作';$('play').setAttribute('aria-label','暂停动作');run();}
all('button[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));all('[data-view]').forEach(b=>b.onclick=()=>{interaction();setView(b.dataset.view);});
phaseNodes.forEach(b=>b.onclick=()=>seek([.1,.3,.5,.76,1][Number(b.dataset.phase)]));
all('[data-part]').forEach(b=>b.onclick=()=>{interaction();const selected=$('iso-model').dataset.selected===b.dataset.part?null:b.dataset.part;if(selected)$('iso-model').dataset.selected=selected;else $('iso-model').removeAttribute('data-selected');setActive('[data-part]',selected,'part');$('component-note').textContent=selected?partNotes[selected]:'选择一个部件，观察它在一次绑扎中承担的工作。';});
all('[data-fault]').forEach(b=>b.onclick=()=>{interaction();stop();fault=b.dataset.fault;target=progress=.4;setActive('[data-fault]',fault,'fault');draw();});
all('[data-sample]').forEach(b=>b.onclick=()=>{sample=b.dataset.sample;setActive('[data-sample]',sample,'sample');$('answer-feedback').textContent='先观察，再选择检查方法。';$('answer-feedback').className='';all('[data-answer]').forEach(x=>x.classList.remove('active'));draw();});
all('[data-answer]').forEach(b=>b.onclick=()=>{const ans=b.dataset.answer,correct=sample==='missing'?ans==='visual':ans==='touch';all('[data-answer]').forEach(x=>x.classList.toggle('active',x===b));$('answer-feedback').className=correct?'correct':'incorrect';$('answer-feedback').textContent=correct?(sample==='missing'?'正确。目视可发现本点没有绑丝，应记录并安排补绑，补绑后仍需复核。':sample==='loose'?'正确。外观只提示疑似松扣，应在安全条件下人工检查牢固度，确认后处理。':'正确。丝环外观完整也不能证明牢固，应按现场要求完成人工抽查。'):(ans==='pass'?'不能直接放行。动作完成与质量合格是两个独立状态。':sample==='missing'?'先做完整性检查：这个交点没有绑丝，目视即可发现漏绑。':'目视可看有无绑丝，但不能单独证明牢固度；还需人工检查。');});
$( 'progress').addEventListener('input',e=>seek(Number(e.target.value)/1000));$('play').onclick=togglePlay;$('reset').onclick=()=>seek(0);$('speed').onclick=()=>{interaction();speed=speed===.5?1:speed===1?.25:.5;$('speed').textContent=speed+'×';};
$('theme').onclick=()=>{interaction();document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light';};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('mode-status').textContent='浏览器未允许全屏，可使用浏览器全屏快捷键';}}
$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'⛶ 退出':'⛶ 全屏';});
for(const id of['help','sources'])$(id).onclick=()=>{interaction();target=progress;stop();$('info').showModal();};$('close-info').onclick=()=>$('info').close();$('info').onclick=e=>{if(e.target===$('info')){const r=$('info').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('info').close();}};
document.addEventListener('keydown',e=>{if($('info').open||e.target.matches('input,button,a'))return;if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();return;}if(mode==='review')return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key==='ArrowRight'){e.preventDefault();seek(progress+.02);}if(e.key==='ArrowLeft'){e.preventDefault();seek(progress-.02);}if(e.key==='Home'){e.preventDefault();seek(0);}if(e.key==='End'){e.preventDefault();seek(1);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();else{cancelAnimationFrame(frame);frame=0;last=0;}}).observe(document.querySelector('.stage'));
reduced.addEventListener('change',()=>{stop();progress=target;draw();});
window.__TYING__={state:{},seek:v=>{seek(v);},setMode,model:M};
document.body.dataset.mode='cycle';draw();
if(reduced.matches)stop();
setTimeout(()=>{if(!touched&&!reduced.matches&&!document.hidden){touring=playing=true;$('play').textContent='Ⅱ 暂停动作';run();}},1800);
document.querySelector('.stage').addEventListener('pointerenter',()=>{if(touring){target=progress;stop();draw();}});
let idleTimer=0;document.querySelector('.stage').addEventListener('pointerleave',()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>{if(!touched&&!reduced.matches&&!document.hidden&&mode==='cycle'){touring=playing=true;$('play').textContent='Ⅱ 暂停动作';run();}},3600);});
document.addEventListener('focusin',()=>{if(touring){target=progress;stop();draw();}});
