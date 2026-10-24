(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
    {id:'4-1',name:'机器人自身状态感知',tag:'STATE & MOTION',note:'把坡度、起停、颠簸和转向，与读数和曲线对照。',title:'机器人动了，数据怎样变？',description:'四种施工状态共用一条时间轴。改变条件，慢放或单步观察，再叠加基准曲线核对差异。',question:'自身处于什么状态？',result:'区分倾角、加速度与角速度，对照动作解释读数变化。',operation:'切换四种状态，回放、定位时间并保存观察记录。',links:[['状态与数据实验','../任务4-1_机器人自身状态感知/index.html']]},
    {id:'4-2',name:'激光雷达与点云',tag:'RANGE & POINT CLOUD',note:'从一束光到一个坐标，再看遮挡、补扫与截面。',title:'一束回波，留下一个坐标。',description:'对照距离与方向，查看 XYZ 和点云；改变扫描高度、采样间隔或观测位置，核对看见与没看见的区域。',question:'周围有哪些有效观测？',result:'解释距离到坐标的关系，识别遮挡与单一截面的限制。',operation:'逐束扫描、换位补扫，查看真实点云、取点与截面。',links:[['扫描与点云实验','../任务4-2_机器人激光雷达感知/index.html']]},
    {id:'4-3',name:'安全帽与 YOLO 识别',tag:'VISION & REVIEW',note:'亲手标注，比较预测阈值，再逐个核验误检与漏检。',title:'先定义目标，再核对判断。',description:'按统一口径框出头部、指定类别并查看标签；在同一工作台比较预测筛选与评估结果，操作可连续保留。',question:'图像中的目标判断可信吗？',result:'理解标注、预测、评估的区别，用真值核验精确率与召回率。',operation:'画框与导出标签 → 改阈值 → 核对正确、误检和漏检。',links:[['标注实验','../任务4-3_标注安全帽并应用YOLO模型/index.html#annotation'],['预测实验','../任务4-3_标注安全帽并应用YOLO模型/index.html#predict'],['评估实验','../任务4-3_标注安全帽并应用YOLO模型/index.html#evaluate']]}
  ];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>学会判断</th><th>动手验证与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">4-3 的预测与评估使用固定教学候选和真值，页面不运行真实 YOLO 推理；标注支持实际画框与标签导出。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'三项任务 · 三种观察证据';$('story-title').textContent=t?.title||'让数据，说明看到了什么。';$('story-description').textContent=t?.description||'对照动作与曲线，沿着回波找到坐标，再用图像标注与结果复核，理解机器人怎样感知现场。';
    const label=t?(t.id==='4-3'?'进入视觉工作台':'进入实验'):'从自身状态开始',url=(t||tasks[0]).links[0][1];
    $('story-actions').innerHTML=`<a class="entry-primary" href="${url}">${label} <span>↗</span></a><button id="overview" class="entry-secondary">全部展品</button>`;
    $('overview').onclick=()=>{stopTour();select(null);window.CourseScene?.resetView();};
  }
  function stopTour(){if(timer)clearInterval(timer);timer=null;$('tour').setAttribute('aria-pressed','false');$('tour').textContent='▷ 逐站巡展';}
  window.CourseUI={model(id){stopTour();select(id);},preview(id){if(!timer)select(id);}};
  document.querySelectorAll('.task-select').forEach(b=>b.onclick=()=>{stopTour();select(b.closest('[data-task]').dataset.task);});
  $('tour').onclick=()=>{if(timer){stopTour();return;}let i=Math.max(0,tasks.findIndex(t=>t.id===selected));select(tasks[i].id);$('tour').setAttribute('aria-pressed','true');$('tour').textContent='■ 停止巡展';timer=setInterval(()=>{i=(i+1)%tasks.length;select(tasks[i].id);},4500);};
  $('reset-view').onclick=()=>window.CourseScene?.resetView();function motion(){window.CourseScene?.pause(paused);$('motion').setAttribute('aria-pressed',String(paused));$('motion').textContent=paused?'▷ 播放模型':'Ⅱ 暂停模型';}$('motion').onclick=()=>{paused=!paused;motion();};
  $('show-guide').onclick=()=>$('entry-guide').showModal();$('close-guide').onclick=()=>$('entry-guide').close();
  const summary=()=>{stopTour();$('chapter-summary').showModal();};$('show-summary').onclick=summary;$('footer-summary').onclick=summary;$('close-summary').onclick=()=>$('chapter-summary').close();
  $('entry-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
  function fit(){$('entry-screen').style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1600,innerHeight/900)})`;}
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(4);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
