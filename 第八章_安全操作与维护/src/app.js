(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
  {
    "id": "8-1",
    "name": "安全操作规程",
    "tag": "SAFETY · 导读",
    "note": "运动范围、停止与恢复、残余能量。",
    "title": "停止了，还要核对哪些状态？",
    "description": "从本体、工具和载荷的完整运动范围出发，区分程序停止、保护停止与急停；继续比较复位、再启动及维修能量条件。",
    "question": "运动停止与维护条件怎样区分？",
    "result": "辨认完整运动范围，区分停止功能、复位与再启动；认识静止后仍可能存在的残余能量。",
    "operation": "读运动范围 → 比较停止状态 → 思考恢复与维护条件。",
    "links": [
      [
        "阅读任务导读",
        "../任务8-1_机械与机器人的安全操作规程/index.html"
      ]
    ]
  },
  {
    "id": "8-2",
    "name": "保养与故障排查",
    "tag": "MAINTENANCE · 导读",
    "note": "现象、证据、待查原因与维护记录。",
    "title": "同样是偏差，原因可能不同。",
    "description": "比较回程间隙、零位偏移与奇异位形的表现，把运行条件、观测与复查结果放在一起，留下可追溯的维护记录。",
    "question": "这条线索能支持什么判断？",
    "result": "比较三类运动问题，用多项证据缩小待查范围；区分观察、推测、处理与复查。",
    "operation": "读维护对象 → 比较运动问题 → 整理证据与待查项。",
    "links": [
      [
        "阅读任务导读",
        "../任务8-2_设备保养_故障排查与维护记录/index.html"
      ]
    ]
  },
  {
    "id": "8-3",
    "name": "爬壁作业检查",
    "tag": "CLIMBING · 导读",
    "note": "壁面与吸附、供电路径、独立防坠。",
    "title": "吸附、供电和防坠，分别看。",
    "description": "对照磁吸与负压吸附的不同条件，分开识读供电、控制与独立防坠；按上墙前、上墙中、作业中和收尾阶段保留检查重点。",
    "question": "当前判断依赖哪些独立条件？",
    "result": "理解壁面条件的差异，分别识读吸附、供电和防坠路径；记录异常情境与待确认条件。",
    "operation": "读壁面条件 → 分开核对路径 → 对照阶段与异常情境。",
    "links": [
      [
        "阅读任务导读",
        "../任务8-3_爬壁与特种作业机器人安全检查/index.html"
      ]
    ]
  },
  {
    "id": "8-4",
    "name": "健康与清洗维护",
    "tag": "HEALTH · 导读",
    "note": "污染路径、控制层次、清洗与交接。",
    "title": "收尾，也要看清压力与污染。",
    "description": "区分打磨粉尘、喷涂漆雾与蒸气，对照源头、环境和个人防护；比较正常收尾、堵塞、泄漏及条件不明的清洗情境。",
    "question": "工序结束后，哪些问题仍待查？",
    "result": "识读污染路径与互补控制措施，区分清洗情境、维护后复查和作业质量检查。",
    "operation": "读污染路径 → 比较控制措施 → 保留清洗与交接条件。",
    "links": [
      [
        "阅读任务导读",
        "../任务8-4_装修机器人职业健康与清洗维护/index.html"
      ]
    ]
  }
];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>阅读要点</th><th>对照与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">当前提供四份任务导读；原教学方案保留，设备交互仿真尚未制作。导读用于理解概念与证据关系。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'四份任务导读 · 一条复核线索';$('story-title').textContent=t?.title||'看清状态，再核对条件。';$('story-description').textContent=t?.description||'围绕安全操作、设备保养、爬壁检查与职业健康，阅读要点、比较情境，并保留尚未确认的问题。';
    const label=t?'阅读任务导读':'从安全操作开始',url=(t||tasks[0]).links[0][1];
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
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(8);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
