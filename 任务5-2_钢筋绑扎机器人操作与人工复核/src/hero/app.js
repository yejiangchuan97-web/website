(()=>{
 'use strict';
 const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const app={mode:'game',game:HG.createGame(),paused:false,auto:false,cycle:0,inspection:0,
   study:{p:0,playing:false,fault:false,marked:false,isolated:false,inspected:false},camera:'overview',cutaway:false};
 const show=(id,on)=>{if($(id))$(id).hidden=!on},text=(id,value)=>{if($(id)&&$(id).textContent!==String(value))$(id).textContent=String(value)},disable=(id,on)=>{if($(id))$(id).disabled=on};
 let scene,ready=false,visible=true,previous=0,dirty=true,refresh=0,transferPending=false,autoDelay=0,helpPause=false,helpPlaying=false;
 const safeRun=fn=>()=>{fn();dirty=true;paint()};
 function feedback(value){app.game.message=value;dirty=true}
 function choosePoint(id){if(app.mode==='study')return;HG.selectPoint(app.game,id);dirty=true}
 function diag(){return scene?.getDiagnostics?.()||{settled:true,actualAim:app.game.aim,aimError:0}}
 try {
   scene=window.TyingHeroScene.create($('hero-scene'),{
     onAim:aim=>{if(app.mode==='game'){HG.moveAim(app.game,aim);app.auto=false;dirty=true}},
     onPoint:id=>{if(app.mode!=='study'){choosePoint(id);app.auto=false}},
     onReady:()=>{ready=true}
   });
   ready=scene?.available!==false;
 } catch(error){console.error('3D scene could not start:',error);ready=false}
 show('loading-scene',false);show('fallback',!ready);show('webgl-note',!ready);
 function camera(name){app.camera=name;scene?.setCamera?.(name);all('[data-camera]').forEach(b=>{b.classList.toggle('active',b.dataset.camera===name);b.setAttribute('aria-pressed',b.dataset.camera===name)});dirty=true}
 function cutaway(on){app.cutaway=on;scene?.setCutaway?.(on);$('cutaway')?.setAttribute('aria-pressed',on);$('cutaway')?.classList.toggle('active',on);if($('cutaway')?.querySelector('span'))$('cutaway').querySelector('span').textContent=on?'合上枪头外壳':'打开枪头外壳';dirty=true}
 function setMode(mode){
   if(app.game.busy){feedback('先完成或继续当前动作，再切换工位。');return}
   if(mode==='review'&&app.game.stage==='tying')return;
   app.study.playing=false;app.auto=false;app.paused=false;
   app.mode=mode==='game'&&app.game.stage!=='tying'?'review':mode;
   scene?.update?.(sceneState());
   if(app.mode==='study'){camera('tool');cutaway(true)}else{camera('overview');cutaway(false)}
   dirty=true;
 }
 function reset(){app.game=HG.createGame();app.mode='game';app.paused=false;app.auto=false;app.cycle=0;app.inspection=0;app.study={p:0,playing:false,fault:false,marked:false,isolated:false,inspected:false};transferPending=false;camera('overview');cutaway(false);dirty=true}
 function beginTie(){const d=diag();if(!ready)return;if(HG.startTie(app.game,d.actualAim||app.game.aim,d.settled!==false)){app.cycle=0;app.paused=false;transferPending=false}dirty=true}
 function beginRepair(){if(HG.startRepair(app.game)){app.cycle=0;app.paused=false;transferPending=true;camera('overview');cutaway(false)}dirty=true}
 function beginPull(){if(HG.startPull(app.game)){app.inspection=0;app.paused=false;camera('tool')}dirty=true}
 function studySeek(p){const s=app.study;s.p=HG.cycleAt(p,s.fault).p;s.playing=false;s.marked=false;s.isolated=false;s.inspected=false;text('fault-feedback',s.fault?(s.p>=.51?'绑丝在导向路径中停住，尚未成环。先保留异常，再模拟停机隔离。':'开始回放，观察绑丝在什么位置停住。'):'正常工况：观察送丝轮与绑丝同步前进。');dirty=true}
 function bind(id,fn,event='click'){$(id)?.addEventListener(event,safeRun(fn))}
 all('button[data-mode]').forEach(b=>b.addEventListener('click',safeRun(()=>setMode(b.dataset.mode))));
 all('[data-camera]').forEach(b=>b.addEventListener('click',safeRun(()=>camera(b.dataset.camera))));
 all('[data-point]').forEach(b=>b.addEventListener('click',safeRun(()=>{choosePoint(b.dataset.point);app.auto=false})));
 all('[data-review]').forEach(b=>b.addEventListener('click',safeRun(()=>choosePoint(b.dataset.review))));
 all('[data-jog]').forEach(b=>b.addEventListener('click',safeRun(()=>{const a={...app.game.aim};a[b.dataset.jog]+=Number(b.dataset.amount);HG.moveAim(app.game,a);app.auto=false})));
 all('[data-phase]').forEach(b=>b.addEventListener('click',safeRun(()=>studySeek([.1,.3,.5,.76,1][Number(b.dataset.phase)]))));
 bind('tie-trigger',beginTie);
 bind('tie-auto',()=>{app.auto=!app.auto;app.paused=false;autoDelay=0;if(app.auto){const next=app.game.points.find(p=>!p.tied);if(next)HG.moveAim(app.game,next)}});
 bind('pause-action',()=>{app.paused=!app.paused});
 bind('go-review',()=>{if(HG.startReview(app.game)){app.mode='review';app.auto=false;app.cycle=0;camera('overview');cutaway(false)}});
 bind('review-safe',()=>{if(diag().parkedSettled)HG.isolate(app.game);else feedback('机械臂仍在归位，停稳后再完成模拟隔离。')});
 bind('pull',beginPull);bind('mark-repair',()=>HG.markRepair(app.game));bind('repair',beginRepair);
 bind('review-closeup',()=>camera('tool'));
 bind('cutaway',()=>cutaway(!app.cutaway));
 bind('reset',reset);bind('complete-reset',reset);
 bind('complete-study',()=>setMode('study'));bind('study-back',()=>setMode(app.game.stage==='tying'?'game':'review'));
 bind('study-play',()=>{
   const s=app.study;app.paused=false;if(reduced.matches){studySeek(s.p>=1?0:Math.min(1,s.p+.2));return}
   if(s.playing){s.playing=false;return}
   if(s.p>=1||HG.cycleAt(s.p,s.fault).jammed){s.p=0;s.marked=false;s.isolated=false;s.inspected=false}
   s.playing=true;
 });
 bind('study-reset',()=>studySeek(0));
 bind('study-progress',()=>studySeek(Number($('study-progress').value)/1000),'input');
 bind('fault-toggle',()=>{app.study.fault=!app.study.fault;studySeek(0);text('fault-feedback',app.study.fault?'开始回放，观察绑丝在什么位置停住。':'正常工况：观察送丝轮与绑丝同步前进。')});
 bind('mark-fault',()=>{if(HG.cycleAt(app.study.p,app.study.fault).jammed){app.study.marked=true;text('fault-feedback','异常点已保留：送丝尚未成环，后续扭结停止。')}});
 bind('isolate-fault',()=>{if(app.study.marked){app.study.isolated=true;app.study.playing=false;text('fault-feedback','已模拟停机、锁止与断开能源。现在可以查看供丝路径。')}});
 bind('inspect-fault',()=>{if(app.study.isolated){app.study.inspected=true;cutaway(true);camera('tool');text('fault-feedback','沿卷盘 → 送丝轮 → 导向槽查看。轮子转动不代表绑丝已成环；实际清障按设备说明书执行。')}});
 bind('help',()=>{helpPause=app.paused;helpPlaying=app.study.playing;app.paused=true;app.study.playing=false;$('info').showModal()});
 bind('close-info',()=>$('info').close());
 $('info')?.addEventListener('close',()=>{app.paused=helpPause;app.study.playing=helpPlaying;dirty=true});
 $('info')?.addEventListener('click',e=>{if(e.target===$('info'))$('info').close()});
 bind('theme',()=>{document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';if($('fallback'))$('fallback').dataset.theme=document.body.dataset.theme;scene?.setTheme?.(document.body.dataset.theme==='dark')});
 bind('fullscreen',()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>feedback('当前浏览器不支持全屏，可以直接放大窗口。'))});
 bind('mission-toggle',()=>{$('mission-card')?.classList.toggle('is-collapsed');$('mission-toggle')?.setAttribute('aria-expanded',!$('mission-card')?.classList.contains('is-collapsed'))});
 if(matchMedia('(max-width:600px)').matches){$('mission-card')?.classList.add('is-collapsed');$('mission-toggle')?.setAttribute('aria-expanded','false')}
 document.addEventListener('keydown',e=>{
   if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||$('info')?.open||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||app.mode!=='game'||!ready)return;
   const jog={ArrowLeft:['x',-.05],ArrowRight:['x',.05],ArrowUp:['z',-.05],ArrowDown:['z',.05]};
   if(jog[e.key]){e.preventDefault();const [axis,d]=jog[e.key],a={...app.game.aim};a[axis]+=d;HG.moveAim(app.game,a);app.auto=false;dirty=true}
   if((e.code==='Space'||e.key==='Enter')&&!['BUTTON','A'].includes(e.target.tagName)){e.preventDefault();beginTie()}
 });
 let seen=new Map();
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>seen.set(e.target,e.isIntersecting));visible=[...seen.values()].some(Boolean)}, {threshold:0});
 [$('scene-shell'),$('control-panel')].filter(Boolean).forEach(el=>observer.observe(el));
 document.addEventListener('visibilitychange',()=>{previous=0});
 scene?.setTheme?.(document.body.dataset.theme==='dark');
 if($('fallback'))$('fallback').dataset.theme=document.body.dataset.theme;
 function observation(p){
   if(!app.game.isolated)return '工具归位并模拟停机隔离后，才能进行人工检查。';
   if(!p.tied)return '交点上没有形成完整绑扣。先标记，再补绑。';
   if(p.checked)return '绑丝包住两根钢筋，轻拉未见明显松动。已复核。';
   if(p.inspected&&p.quality==='loose')return '刚才轻拉时，绑丝出现明显位移。标记后重新绑扎。';
   return '观察绑丝是否包住两根钢筋；轻拉时，留意绑扣有没有明显移动。';
 }
 function paint(){
   const g=app.game,s=app.study,study=app.mode==='study',review=app.mode==='review',done=g.stage==='done',busy=!!g.busy,d=diag();
   document.body.dataset.mode=app.mode;document.body.dataset.stage=g.stage;
   show('tie-panel',!study&&!review);show('review-panel',review&&!done);show('study-panel',study);show('complete',review&&done);
   show('phase-strip',study);show('go-review',g.stage==='tying'&&HG.tiedCount(g)===4);
   disable('nav-review',g.stage==='tying');all('button[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===app.mode);b.setAttribute('aria-pressed',b.dataset.mode===app.mode);if(b.id!=='nav-review')b.disabled=busy});
   text('mission-step',study?'机构近看':review?'02 / 人工复核':'01 / 绑扎挑战');
   text('mission-title',study?'让绑丝绕过这个交点':review?(done?'这一格，交给你了':'找出需要补绑的交点'):'把这四个交点绑好');
   text('mission-text',study?'转动卷盘，送丝轮推动绑丝沿导向槽前进。看清成环，再看扭结。':review?'这是另一组预置样例。近看、轻拉、标记、补绑，最后重新复核。':'点选交点让机械臂就位，保持枪口稳定，完成四点绑扎。');
   text('panel-kicker',study?'TOOL LAB':review?'QUALITY CHECK':'YOUR WORKSTATION');
   text('panel-title',study?'一根绑丝，怎样成环？':review?(done?'复核完成':'这一扣，绑牢了吗？'):'先把枪口放对');
   text('panel-description',study?'只看绑扎头里的这一步。拖动进度，或切换供丝受阻观察差别。':review?'先隔离，再检查。补绑完成后仍需重新复核。':'点选交点，等枪口稳定；启动后保持就位，直到工具抬起退出。');
   text('feedback',study?'拖动进度或慢放观察。送丝轮推动绑丝，导向槽决定成环路径；枪口就位后要保持稳定。':g.message);text('aim-readout',d.settled===false?'机械臂正在就位…':HG.alignedPoint(g,d.actualAim||g.aim)?`已对准 ${HG.alignedPoint(g,d.actualAim||g.aim).id} 点`:'尚未对准交点');
   text('world-coordinate',study?'绑扎头 / 局部观察':review?'复核样区 / 4 个交点':g.selected?`当前目标 / ${g.selected} 点`:'选择一个交点开始');
   text('scene-status',!ready?'静态参考':busy?(app.paused?'动作已暂停':g.busy.kind==='pull'?'轻拉检查中':'机械臂作业中'):study?(s.playing?'观察中':'观察就绪'):review?(g.isolated?'工具已隔离':'工具待归位 / 隔离'):'等待操作');
   const point=HG.alignedPoint(g,d.actualAim||g.aim);
   disable('tie-trigger',!ready||busy||d.settled===false||!point||point.tied);
   disable('tie-auto',!ready||HG.tiedCount(g)===4);text('tie-auto',app.auto?'停止连续绑扎':'连续完成剩余点');
   all('[data-point],[data-jog]').forEach(b=>b.disabled=!ready||busy);
   all('[data-point]').forEach(b=>{const p=g.points.find(p=>p.id===b.dataset.point);b.classList.toggle('active',g.selected===p.id);b.classList.toggle('done',p.tied);b.setAttribute('aria-pressed',g.selected===p.id);b.title=p.tied?'已完成绑扎':'移动到交点 '+p.id;if(b.querySelector('small'))b.querySelector('small').textContent=p.tied?'已绑好':'待绑扎'});
   show('pause-action',busy||app.auto);text('pause-action',app.paused?'继续动作':'暂停动作');
   const p=HG.selectedPoint(g);
   disable('review-safe',!ready||busy||g.isolated||!d.parkedSettled);text('review-safe',g.isolated?'工具已归位并隔离':d.parkedSettled?'工具归位 · 模拟停机隔离':'等待工具归位停稳…');
   disable('pull',!ready||busy||!g.isolated);disable('mark-repair',!ready||busy||!g.isolated||p.checked||p.marked);
   show('repair',p.marked);disable('repair',!ready||busy);disable('review-closeup',!ready||busy);
   all('[data-review]').forEach(b=>{const p=g.points.find(p=>p.id===b.dataset.review);b.disabled=busy;b.classList.toggle('active',g.selected===p.id);b.classList.toggle('done',p.checked);b.classList.toggle('marked',p.marked);b.setAttribute('aria-pressed',g.selected===p.id);if(b.querySelector('small'))b.querySelector('small').textContent=p.checked?'已复核':p.marked?'需补绑':'待复核'});
   text('review-observation',observation(p));
   text('metric-tied',HG.tiedCount(g));text('metric-checked',HG.checkedCount(g));text('metric-pending',HG.pendingCount(g));
   const c=HG.cycleAt(study?s.p:app.cycle,study&&s.fault);
   text('cycle-label',study?(c.jammed?'送丝受阻，尚未成环':`${HG.PHASES[c.phase]} · ${Math.round(c.p*100)}%`):busy?(g.busy.kind==='pull'?'轻拉检查':`${HG.PHASES[c.phase]} · ${Math.round(c.p*100)}%`):review?'人工复核':HG.tiedCount(g)===4?'绑扎完成':'等待枪口就位');
   if($('cycle-progress'))$('cycle-progress').style.width=`${study?c.p*100:busy?((g.busy.kind==='pull'?app.inspection:app.cycle)*100):HG.tiedCount(g)/4*100}%`;
   text('study-phase',HG.PHASES[c.phase]);text('study-percent',`送丝 ${Math.round(c.feed*100)}%`);
   text('study-headline',c.jammed?'轮子在转，绑丝却没有绕全':c.phase===2?'送丝轮推动，导向槽带路':c.phase===3?'成环后收紧，再形成绑扣':'枪口就位，给绑丝留出完整路径');
   if($('study-progress')&&document.activeElement!==$('study-progress'))$('study-progress').value=Math.round(s.p*1000);
   text('study-play',reduced.matches?'向前一步':s.playing?'暂停观察':'播放慢动作');
   text('fault-toggle',s.fault?'工况：送丝受阻':'工况：正常送丝');$('fault-toggle')?.setAttribute('aria-pressed',s.fault);
   show('fault-actions',s.fault);disable('mark-fault',!c.jammed||s.marked);disable('isolate-fault',!s.marked||s.isolated);disable('inspect-fault',!s.isolated);
   all('[data-phase]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.phase)===c.phase);b.setAttribute('aria-pressed',Number(b.dataset.phase)===c.phase)});
   if(!ready)all('#tie-panel button,#review-panel button,#study-panel button,#study-panel input').forEach(b=>b.disabled=true);
   dirty=false;
 }
 function sceneState(){
   const g=app.game,s=app.study;
   if(app.mode==='study')return {stage:'study',aim:{x:-.5,z:-.5},points:HG.POINTS.map(p=>({...p,tied:false,quality:'missing'})),selected:'A',busy:{kind:'study',id:'A'},cycle:HG.cycleAt(s.p,s.fault).p,inspection:0,jammed:HG.cycleAt(s.p,s.fault).jammed,reduced:reduced.matches};
   return {...g,cycle:app.cycle,inspection:app.inspection,jammed:false,reduced:reduced.matches};
 }
 function tick(now){
   const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;
   if(ready&&!document.hidden&&visible){
     const g=app.game,s=app.study;
     if(!app.paused){
       if(app.mode==='study'&&s.playing){s.p=HG.cycleAt(s.p+dt/9,s.fault).p;if(s.p>=1||HG.cycleAt(s.p,s.fault).jammed)s.playing=false;dirty=true}
       else if(g.busy&&app.mode!=='study'){
         if(transferPending){const d=diag();if(d.settled!==false&&Math.hypot((d.actualAim?.x??9)-g.aim.x,(d.actualAim?.z??9)-g.aim.z)<.014)transferPending=false}
         else if(g.busy.kind==='pull'){app.inspection=reduced.matches?1:Math.min(1,app.inspection+dt/1.25);if(app.inspection>=1){HG.finishAction(g);app.inspection=0}dirty=true}
         else {app.cycle=reduced.matches?1:Math.min(1,app.cycle+dt/4.6);if(app.cycle>=1){HG.finishAction(g);autoDelay=.25}dirty=true}
       }else if(app.auto&&g.stage==='tying'){
         autoDelay-=dt;const next=g.points.find(p=>!p.tied);
         if(!next)app.auto=false;
         else if(autoDelay<=0){if(Math.hypot(g.aim.x-next.x,g.aim.z-next.z)>.001)HG.moveAim(g,next);else if(diag().settled!==false)beginTie()}
       }
     }
     scene.update(sceneState());scene.render(dt);refresh+=dt;
     if(dirty||refresh>.12){paint();refresh=0}
   } else if(dirty)paint();
   requestAnimationFrame(tick);
 }
 window.__TYING_HERO__={get state(){return JSON.parse(JSON.stringify(app))},model:HG,scene,getDiagnostics:diag,
   seek:p=>{studySeek(p);paint()},setMode:mode=>{setMode(mode);paint()}};
 paint();requestAnimationFrame(tick);
})();
