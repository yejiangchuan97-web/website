(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
  {
    "id": "5-1",
    "name": "钢筋加工与作业面识读",
    "tag": "PREPARE & INSPECT",
    "note": "加工接力、楼面巡查、检查工具与作业分区。",
    "title": "先把材料与现场准备好。",
    "description": "从调直、定尺切断和弯曲订单开始，找到现场六处位置；检查局部样板，整理通道与洞口，留下作业分区交接记录。",
    "question": "材料和作业面准备好了什么？",
    "result": "区分三种加工的作用，识读现场边界、通路与检查点。",
    "operation": "加工接力 → 楼面巡查 → 检查与分区 → 保存交接记录。",
    "links": [
      [
        "进入开工挑战",
        "../任务5-1_钢筋加工机械与绑扎作业面识读/index.html"
      ]
    ]
  },
  {
    "id": "5-2",
    "name": "钢筋绑扎与人工复核",
    "tag": "TIE & REVIEW",
    "note": "对准并绑扎，近看送丝，再处理疑点与复核。",
    "title": "绑好这一扣，再核对结果。",
    "description": "移动工具对准交点，保持就位完成绑扎；近看送丝与扭结，观察卡丝情境，再在模拟停机隔离后检查与处理样例。",
    "question": "动作做完，结果怎样核对？",
    "result": "把工具就位、绑扎过程和人工复核联系起来，区分正常与异常供丝。",
    "operation": "上岗挑战、看懂这一扣、卡丝怎么办；检查、补绑与重新复核。",
    "links": [
      [
        "进入绑扎工坊",
        "../任务5-2_钢筋绑扎机器人操作与人工复核/index.html"
      ]
    ]
  },
  {
    "id": "5-3",
    "name": "混凝土施工工序导读",
    "tag": "PROCESS READING",
    "note": "阅读六道工序与标高反馈；交互演示尚未制作。",
    "title": "不同工序，接力解决不同问题。",
    "description": "沿泵送、布料、振捣、粗平、精平与抹光梳理分工；理解激光基准、接收偏差、控制调节与液压执行之间的关系。",
    "question": "这一环节解决什么，交给下一步什么？",
    "result": "区分输送、布料、密实与表面处理，核对平整与标高的不同。",
    "operation": "选择六道工序阅读分工，再对照标高反馈的四个环节。",
    "links": [
      [
        "阅读工序导读",
        "../任务5-3_混凝土泵送布料与整平抹光机器人/index.html"
      ]
    ]
  }
];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>学会判断</th><th>动手验证与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">5-1、5-2 为独立交互课堂，不自动传递记录；5-3 为工序导读，尚未提供混凝土交互仿真。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'三项任务 · 从准备到接续';$('story-title').textContent=t?.title||'每一步，都有交接的依据。';$('story-description').textContent=t?.description||'加工材料、识读现场，完成绑扎并人工复核，再理解混凝土施工各环节的分工与反馈。';
    const label=t?(t.id==='5-3'?'阅读工序导读':'进入课堂'):'从加工准备开始',url=(t||tasks[0]).links[0][1];
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
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(5);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
