(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
  {
    "id": "1-1",
    "name": "从施工到智能建造",
    "tag": "CONSTRUCTION · 导读",
    "note": "施工场景、现场痛点、技术用途与人机分工。",
    "title": "先看现场问题，再谈技术选择。",
    "description": "从教学楼的不同作业对象出发，用具体动作说明危、繁、脏、重；比较技术承担的用途，以及设备与人员分别负责的事项。",
    "question": "现场问题是什么，方案依赖什么条件？",
    "result": "把痛点与具体动作对应，说明技术用途，保留准备、异常处理和质量复核中的人员职责。",
    "operation": "施工阶段 → 痛点证据 → 技术用途 → 分工与条件。",
    "links": [
      [
        "阅读任务导读",
        "../任务1-1_从建造施工到智能建造/index.html"
      ]
    ]
  },
  {
    "id": "1-2",
    "name": "认识施工机械",
    "tag": "MACHINERY · 导读",
    "note": "作用对象、工作装置、施工动作与用途条件。",
    "title": "沿着工作装置，读懂施工动作。",
    "description": "观察铲斗、管口、刀口和销轴与材料的关系，区分行走与主要任务，比较调直、切断、弯曲及吊物、载人的不同要求。",
    "question": "哪个装置，对什么材料，做什么动作？",
    "result": "从材料变化识读工作装置，区分主要任务、辅助移动与用途条件，并关注完整运动范围。",
    "operation": "对象与装置 → 钢筋加工对照 → 主要任务 → 运动与用途。",
    "links": [
      [
        "阅读任务导读",
        "../任务1-2_认识施工机械/index.html"
      ]
    ]
  },
  {
    "id": "1-3",
    "name": "认识施工机器人",
    "tag": "ROBOTICS · 导读",
    "note": "任务与部件、状态反馈、控制方式与人的职责。",
    "title": "有状态信息，还要看怎样参与控制。",
    "description": "用同一墙面喷涂情境对照人工、持续遥控与设定程序；跟踪指令、状态与动作之间的关系，明确变化与异常由谁处理。",
    "question": "谁组织动作，信息送到哪里，异常由谁处理？",
    "result": "说明部件与任务的关系，区分显示与控制反馈，理解预设动作、异常确认及人员职责。",
    "operation": "任务与部件 → 三种分工 → 状态与反馈 → 变化与处理。",
    "links": [
      [
        "阅读任务导读",
        "../任务1-3_认识施工机器人/index.html"
      ]
    ]
  }
];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>阅读要点</th><th>对照与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">当前提供三份任务导读；原教学方案保留，设备与场景交互尚未制作。三份导读独立阅读，不传递任务记录。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'三份任务导读 · 从场景到控制';$('story-title').textContent=t?.title||'先问做什么，再看怎样做。';$('story-description').textContent=t?.description||'理解现场痛点，沿着工作装置认识施工机械，再把感知、控制、执行与人的职责联系起来。';
    const label=t?'阅读任务导读':'从建造场景开始',url=(t||tasks[0]).links[0][1];
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
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(1);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
