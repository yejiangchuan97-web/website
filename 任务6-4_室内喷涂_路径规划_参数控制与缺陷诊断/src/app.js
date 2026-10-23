(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stages = ['plan', 'trial', 'spray', 'inspect', 'deliver'];
  const titles = ['规划一面墙的作业路线', '让第一道涂层告诉你结果', '把你的方案变成墙面', '走近墙面，处理留下的痕迹', '一面墙，一份完整作业记录'];
  const hints = [
    '调整喷距与道间距，沿着路线观察喷幅搭接；窗洞需要完整喷幅避让。',
    '先试喷左侧两道，观察漏带与起收段沉积，再调整道间距、速度和流量同步。',
    '机器人按已保存的参数执行。你可以暂停、切换视角，近看喷枪的启停。',
    '点选墙面或返修清单。漏喷区补涂，污染区清理，沉积偏差区处理后重涂。',
    '路线、实际涂覆、窗洞保护与返修操作已汇总，可导出本次作业记录。'
  ];
  const initial = {spacing:500, distance:300, speed:420, guard:'center', slow:true, compensate:false};
  let state, lastTime=0, lastUI=0, frame=0, visible=true, scene;
  const logs=[];
  const log = (action, detail='') => logs.push({time:new Date().toISOString(), action, detail});
  const fmt = n => Number.isFinite(n) ? n.toFixed(1) : '0.0';
  function focusScene() { if(innerWidth<=900)document.querySelector('.world').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }
  function setCamera(name) { scene?.setView(name);document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===name;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}); }
  function toast(message) { $('toast').textContent=message; $('toast').classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>$('toast').classList.remove('show'),4000); }
  function reset() {
    state={stage:'plan', reached:0, params:{...initial}, color:'#4ab4aa', run:null, trialRun:null, trialDone:false, active:null, running:false, selection:null, inspect:false, repair:null};
    logs.length=0; log('接收作业单','WALL A · 3600 × 2400 mm');
    ['spacing','distance','speed','guard'].forEach(k=>$(k).value=state.params[k]);
    ['slow','compensate'].forEach(k=>$(k).checked=state.params[k]);
    $('rate').value='8'; $('pathToggle').checked=true; $('inspectToggle').checked=false;
    document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('active',b.dataset.color===state.color));
    setCamera('orbit'); scene?.setPathVisible(true); refresh();document.querySelector('.panel-scroll').scrollTop=0;
  }
  function summary() { return state.run ? PM.summarizeRun(state.run) : null; }
  function activeRun() { return state.stage==='trial' ? state.trialRun : state.run; }
  function stageTo(stage) {
    if(state.active==='trial'&&stage!=='trial'){state.active=null;state.running=false;}
    state.stage=stage; state.reached=Math.max(state.reached,stages.indexOf(stage));
    state.inspect=stage==='inspect'; $('inspectToggle').checked=state.inspect;
    log('进入阶段',stage); refresh();document.querySelector('.panel-scroll').scrollTop=0;
  }
  function paramsChanged() {
    if(state.run || state.running) return;
    ['spacing','distance','speed'].forEach(k=>state.params[k]=Number($(k).value));
    state.params.guard=$('guard').value;
    ['slow','compensate'].forEach(k=>state.params[k]=$(k).checked);
    state.trialDone=false; state.trialRun=null; state.active=null; state.running=false;
    log('调整参数',JSON.stringify(state.params)); refresh();
  }
  function startTrial() {
    if(state.running || state.run) return;
    state.trialRun=PM.createRun(state.params); state.trialDone=false;
    state.active='trial'; state.running=true;
    if(state.stage!=='trial')stageTo('trial');
    log('开始两道试喷',JSON.stringify(state.params)); refresh();focusScene();
  }
  function startSpray() {
    if(!state.trialDone || state.running) return;
    state.run=PM.createRun(state.params); state.active='spray'; state.running=true;
    state.selection=null; log('开始正式喷涂',JSON.stringify(state.params)); stageTo('spray');focusScene();
  }
  function togglePlay() {
    if(!state.active) return;
    state.running=!state.running; log(state.running?'继续作业':'暂停作业'); refresh();
  }
  function beginRepair(all) {
    if(!state.run || state.run.progress<1 || state.running || (!all&&!state.selection))return;
    const s=summary(); if(s.ready) {toast('本次教学目标已达成，可以交付。');return;}
    state.repair={all, elapsed:0, lastPatch:0, duration:all?8:1.8, targets:all?s.issues.map(i=>({x:i.x,z:i.z})): [{x:state.selection.x,z:state.selection.z}]};
    if(!state.repair.targets.length)state.repair.targets=[{x:1800,z:1200}];
    state.active='repair'; state.running=true;
    log('执行返修工单',all?'采用校准后的精细作业，清理保护区、处理异常层并补涂':`局部 x=${state.selection.x}, z=${state.selection.z} mm；采用校准后的精细作业`);
    toast('返修使用校准后的精细作业：先清理污染或异常层，再完成局部补涂。');
    refresh();focusScene();
  }
  function selectPoint(point) {
    if(state.stage!=='inspect'||state.running||state.active==='repair')return;
    state.selection={x:point.x,z:point.z};
    const c=state.run.coat.cells.reduce((best,c)=>Math.hypot(c.x-point.x,c.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?c:best);
    state.selection={x:c.x,z:c.z};
    const note=c.hole ? (c.n?'窗面有涂料痕迹：先清理并恢复遮蔽。':'窗洞保护区，当前无污染。') : (!c.n?'这里还没有涂覆，需要精细补涂。':c.doseIssue?'相对沉积偏离教学目标：先处理，再按记录重涂。':'此处已达到本次教学目标。');
    toast(`定位 ${Math.round(c.x)} / ${Math.round(c.z)} mm · ${note}`);
    log('点选墙面检查',`${Math.round(c.x)},${Math.round(c.z)}`);refresh();
  }
  function refresh() {
    if(!state)return;
    const i=stages.indexOf(state.stage), s=summary(), r=activeRun();
    $('stageLabel').textContent=`0${i+1} / ${['规划路线','试喷调机','执行喷涂','巡检返修','项目交付'][i]}`;
    $('stageHint').textContent=['拖动旋转 · 滚轮缩放','先试喷，再调整','涂层随作业累积','点选墙面定位','作业记录已生成'][i];
    $('missionTitle').textContent=titles[i]; $('missionHint').textContent=hints[i];
    $('panelTitle').textContent=['编排你的方案','试喷与调机','作业进行中','巡检与返修','完成本次交付'][i];
    $('panelKicker').textContent=['PLAN','TRY & TUNE','SPRAY','INSPECT & REPAIR','DELIVER'][i];
    $('panelHint').textContent=hints[i];
    $('parameterPanel').hidden=i>2;
    $('trialPanel').hidden=i!==1;
    $('inspectionPanel').hidden=i!==3;
    $('deliveryPanel').hidden=i!==4;
    ['spacing','distance','speed'].forEach(k=>{$(k+'Out').textContent=state.params[k]+(k==='speed'?' mm/s':' mm');});
    document.querySelectorAll('#parameterPanel input,#parameterPanel select,#parameterPanel button').forEach(el=>el.disabled=!!state.run||state.running);
    document.querySelectorAll('[data-stage]').forEach(b=>{
      b.classList.toggle('active',b.dataset.stage===state.stage);
      b.classList.toggle('done',stages.indexOf(b.dataset.stage)<i);
      b.disabled=stages.indexOf(b.dataset.stage)>state.reached||state.running||!!state.run&&stages.indexOf(b.dataset.stage)<2;
      b.setAttribute('aria-current',b.dataset.stage===state.stage?'step':'false');
    });
    const ov=M.overlap(state.params), d0=M.depositionAt(0,state.params).dose, d1=M.depositionAt(.5,state.params).dose;
    $('planNote').innerHTML=`<b>喷幅 ${Math.round(ov.width)} mm</b><span>${ov.gap>0?`相邻道留有 ${Math.round(ov.gap)} mm 漏带`:`名义搭接 ${Math.round(ov.ratio*100)}%`} · ${M.passes(state.params.spacing).length} 道</span>`;
    $('trialResult').innerHTML=state.trialDone?`<strong>两道试喷已完成</strong><p>已涂区域 ${fmt(PM.summarizeRun(state.trialRun).coverage)}%。起收段相对沉积 ${fmt(d0)}×，中段 ${fmt(d1)}×。</p><p>${ov.gap>0?'可见间距漏带；减小道间距后再试。':'路线间无名义漏带。正式作业时继续观察窗边停喷。'}${d0>1.2||d1<.85?' 调整速度与流量同步，观察涂层变化。':''}</p>`:state.running?'<strong>正在试喷两道</strong><p>近看喷头与墙面，观察起收段和实际涂覆。</p>':'<strong>当前参数还未试喷</strong><p>每次调整参数后，重新试喷，再开始正式作业。</p>';
    $('retryTrial').disabled=state.running;
    if(state.stage==='inspect')renderIssues(s);
    $('repairSelected').disabled=state.running||!state.selection||!!s?.ready;
    $('repairAll').disabled=state.running||!!s?.ready;
    $('repairSelected').textContent=state.selection?`处理此处 · ${Math.round(state.selection.x)} / ${Math.round(state.selection.z)}`:'点选墙面后局部返修';
    if(state.stage==='deliver'){
      $('deliverySummary').innerHTML=`<div class="delivery-seal">✓</div><strong>WALL A · 项目已交付</strong><p>已喷覆盖 ${fmt(s.coverage)}%<br>窗面污染 ${fmt(s.pollution)}%<br>相对沉积达标 ${fmt(s.uniformity)}%</p><p>完成 ${state.run.repairs.length} 次区域处理，记录 ${logs.length} 项操作。</p><small>以上为本教学项目的网格模拟结果。</small>`;
    }
    const primary=$('actionPrimary');primary.disabled=state.running;
    if(state.stage==='plan'){primary.textContent='保存路线，开始试喷 →';$('actionHint').textContent='可以先保留当前参数，用试喷观察你的方案。';}
    if(state.stage==='trial'){primary.textContent=state.running?'试喷进行中…':state.trialDone?'按当前方案开始作业 →':'按新参数重新试喷 →';$('actionHint').textContent='试喷不会计入正式作业；正式喷涂会使用当前参数快照。';}
    if(state.stage==='spray'){primary.textContent=state.run?.progress>=1?'完成喷涂，开始巡检 →':'按已保存方案执行中';primary.disabled=state.run?.progress<1;$('actionHint').textContent='作业中锁定参数。发现异常可以暂停查看，完成后处理返修。';}
    if(state.stage==='inspect'){primary.textContent=s?.ready?'确认记录，交付项目 →':'先处理墙面，再交付';primary.disabled=!s?.ready||state.running;$('actionHint').textContent='本次目标：覆盖 ≥99.5%，窗面无污染，相对沉积在 0.85–1.20×。';}
    if(state.stage==='deliver'){primary.textContent='新开一面墙 ↗';$('actionHint').textContent='下载记录后，可用另一组参数开始新的项目。';}
    $('play').textContent=state.running?'Ⅱ 暂停':'▶ 继续';$('play').disabled=!state.active;
    $('sceneStatus').textContent=state.active==='repair'?(state.running?'返修工单执行中':'返修已暂停'):state.running?(state.active==='trial'?'两道试喷中':'正在喷涂'):r?.progress>=1?'本轮路径已完成':r?'作业已暂停':'等待你的操作';
    updateReadouts(); updateScene();
  }
  function renderIssues(s) {
    const list=$('issueList');list.replaceChildren();
    const intro=document.createElement('p');intro.className='issue-summary';
    intro.textContent=s.ready?'本次教学目标已达成。可以查看墙面后交付。':`待处理网格 ${s.issueCount} 个 · 漏喷 ${fmt(s.missArea)} m²。以下为代表位置，可直接点击墙面检查。`;
    list.append(intro);
    for(const issue of s.issues){const b=document.createElement('button');b.type='button';b.className='issue-item';b.innerHTML=`<span class="issue-dot"></span><span><b>${issue.label}</b><small>${issue.detail}</small></span><span>↗</span>`;
      b.addEventListener('click',()=>{setCamera('front');selectPoint(issue);});list.append(b);}
  }
  function updateReadouts() {
    const r=activeRun(), s=r?PM.summarizeRun(r):null, progress=r?.progress||0;
    $('coverageValue').textContent=fmt(s?.coverage||0)+'%';$('pollutionValue').textContent=fmt(s?.pollution||0)+'%';$('uniformityValue').textContent=s?fmt(s.uniformity)+'%':'—';
    $('progress').value=Math.round(progress*1000);$('progressText').textContent=state.active==='repair'?`返修 ${Math.round(state.repair.elapsed/state.repair.duration*100)}%`:`${Math.round(progress*100)}%`;
    const pose=currentPose();$('passLabel').textContent=`${state.stage==='trial'?'试喷 · ':''}第 ${pose.pass} / ${M.passes(state.params.spacing).length} 道`;
    $('tcp').textContent=`喷枪 X ${(pose.x/1000).toFixed(2)} m · 高 ${(pose.z/1000).toFixed(2)} m`;
    $('valveState').textContent=state.active==='repair'?'区域处理':state.running?(pose.on?'喷枪开启':'喷枪关闭'):'喷枪关闭';
    $('valveState').dataset.on=String(!!(state.running&&pose.on));
    $('liveSpeed').textContent=state.running?`${Math.round(pose.v)} mm/s`:'0 mm/s';
  }
  function currentPose() {
    const r=activeRun();let pose=M.poseAt(r?.progress||0,state.params);
    if(state.active==='repair'&&state.repair){const work=state.repair;const t=Math.min(.999,work.elapsed/work.duration)*work.targets.length;const a=work.targets[Math.floor(t)];pose={...pose,x:a.x,z:a.z,on:false,v:0};}
    return pose;
  }
  function updateScene() {
    if(!scene||!state)return;
    $('inspectionLegend').hidden=!state.inspect;
    const r=activeRun();
    scene.update({params:state.params,pose:currentPose(),progress:r?.progress||0,coat:r?.coat||null,viewMode:state.inspect?'inspect':r?'paint':'plan',color:state.color,running:state.running,trial:state.stage==='trial',selectedCell:state.selection});
  }
  function tick(now) {
    frame=0;if(!visible)return;
    const dt=Math.min(.08,(now-(lastTime||now))/1000);lastTime=now;
    if(state.running){
      if(state.active==='repair'){
        state.repair.elapsed+=dt;
        if(state.repair.all&&state.repair.elapsed-state.repair.lastPatch>.12){
          state.repair.lastPatch=state.repair.elapsed;
          const issue=PM.summarizeRun(state.run).issues[0];
          if(issue){state.repair.targets=[issue];PM.repairAt(state.run,issue.x,issue.z);}
        }
        if(state.repair.elapsed>=state.repair.duration){
          if(state.repair.all)PM.repairAll(state.run);else PM.repairAt(state.run,state.repair.targets[0].x,state.repair.targets[0].z);
          state.running=false;state.active=null;state.repair=null;state.selection=null;
          log('返修完成');toast(summary().ready?'墙面已达到本次教学目标，可以交付。':'此区域处理完成，继续检查其他位置。');refresh();
        }
      }else{
        const r=state.active==='trial'?state.trialRun:state.run,pose=M.poseAt(r.progress,r.params);
        const rate=state.active==='trial'?2.5:Number($('rate').value);
        const trialLimit=Math.min(1,(2320*2+state.params.spacing)/pose.total);
        const limit=state.active==='trial'?trialLimit:1;
        PM.advanceRun(r,Math.min(limit,r.progress+pose.v*dt*rate/pose.total));
        if(r.progress>=limit-1e-8){const trial=state.active==='trial';state.running=false;state.active=null;state.trialDone=trial||state.trialDone;log(trial?'两道试喷完成':'正式路径执行完成');toast(trial?'试喷结束。调整参数后可以再试，或按此方案开始作业。':'喷涂完成。进入巡检，查看墙面上的实际结果。');refresh();if(trial)document.querySelector('.panel-scroll').scrollTop=0;}
      }
      updateScene();
    }
    if(now-lastUI>180){lastUI=now;updateReadouts();}
    frame=requestAnimationFrame(tick);
  }
  function exportRecord() {
    if(state.stage!=='deliver')return;
    const s=summary();const rows=[['室内喷涂工坊 · 教学作业记录'],['墙面','WALL A 3600 × 2400 mm'],['完成时间',new Date().toLocaleString('zh-CN')],['道间距 mm',state.params.spacing],['喷距 mm',state.params.distance],['设定速度 mm/s',state.params.speed],['洞口保护',state.params.guard],['流量同步',state.params.compensate?'是':'否'],['已喷覆盖 %',fmt(s.coverage)],['窗面污染 %',fmt(s.pollution)],['相对沉积达标 %',fmt(s.uniformity)],['范围说明','教学几何与相对沉积模型，不代表实际膜厚与工程验收'],[],['时间','操作','详情'],...logs.map(l=>[l.time,l.action,l.detail])];
    rows.push([],['返修编号','X mm','高度 mm','处理内容','处理网格数'],...state.run.repairs.map(a=>[a.id,a.x,a.z,a.label,a.changed]));
    const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='WALL-A_喷涂项目作业记录.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('作业记录已导出。');
  }
  $('parameterPanel').before($('trialPanel'));
  scene=window.createSprayScene($('scene'),{onWallPick:selectPoint,onContextLost:()=>{if(state){state.running=false;refresh();toast('三维显示暂停，作业进度已停住。刷新页面可重新开工。');}}});
  scene.setTheme(document.body.dataset.theme);
  ['spacing','distance','speed','guard','slow','compensate'].forEach(k=>$(k).addEventListener('input',paramsChanged));
  $('actionPrimary').addEventListener('click',()=>{if(state.stage==='plan')startTrial();else if(state.stage==='trial')state.trialDone?startSpray():startTrial();else if(state.stage==='spray'&&state.run.progress>=1)stageTo('inspect');else if(state.stage==='inspect'&&summary().ready)stageTo('deliver');else if(state.stage==='deliver')reset();});
  $('retryTrial').addEventListener('click',startTrial);$('play').addEventListener('click',togglePlay);
  $('repairSelected').addEventListener('click',()=>beginRepair(false));$('repairAll').addEventListener('click',()=>beginRepair(true));
  $('export').addEventListener('click',exportRecord);$('reset').addEventListener('click',()=>{reset();toast('已新建作业，重新安排你的喷涂方案。');});
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setCamera(b.dataset.view)));
  document.querySelectorAll('[data-stage]').forEach(b=>b.addEventListener('click',()=>{if(!b.disabled)stageTo(b.dataset.stage);}));
  document.querySelectorAll('[data-color]').forEach(b=>b.addEventListener('click',()=>{if(state.run||state.running)return;state.color=b.dataset.color;document.querySelectorAll('[data-color]').forEach(v=>{v.classList.toggle('active',v===b);v.setAttribute('aria-pressed',String(v===b));});updateScene();}));
  $('pathToggle').addEventListener('change',()=>scene.setPathVisible($('pathToggle').checked));
  $('inspectToggle').addEventListener('change',()=>{state.inspect=$('inspectToggle').checked;updateScene();});
  $('theme').addEventListener('click',()=>{document.body.dataset.theme=document.body.dataset.theme==='dark'?'light':'dark';scene.setTheme(document.body.dataset.theme);});
  $('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口不支持全屏，可使用浏览器全屏功能。');}});
  $('help').addEventListener('click',()=>$('helpDialog').showModal());$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
  document.addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,button')||$('helpDialog').open)return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key.toLowerCase()==='f')$('fullscreen').click();});
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;lastTime=0;if(visible&&!frame)frame=requestAnimationFrame(tick);else if(!visible){cancelAnimationFrame(frame);frame=0;}});
  window.sprayLab={model:M,projectModel:PM,scene,snapshot:()=>({stage:state.stage,params:{...state.params},progress:activeRun()?.progress||0,playing:state.running,active:state.active,trialDone:state.trialDone,pose:currentPose(),summary:summary(),selection:state.selection,stats:scene.getStats(),logCount:logs.length})};
  reset();frame=requestAnimationFrame(tick);
})();
