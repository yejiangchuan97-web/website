(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
  {
    "id": "6-1",
    "name": "砌筑工艺与机器人",
    "tag": "MASONRY",
    "note": "转砖、组砌与错缝，再看定位、取放和基准。",
    "title": "先砌一砌，再看机器人怎样做。",
    "description": "亲手试排墙厚与上下皮接缝，比较灰缝和基准问题；进入同一三维工作站，慢放定位、转向、夹持与反馈。",
    "question": "砖怎样摆，基准怎样核对？",
    "result": "区分砖的朝向、墙厚与组砌关系，观察定位误差和重新测量的作用。",
    "operation": "人工砌筑挑战 → 难点实验 → 机器人八阶段取放与基准实验。",
    "links": [
      [
        "进入砌筑课堂",
        "../任务6-1_砌筑工程_人工工艺_砂浆机械与机器人进场/index.html"
      ]
    ]
  },
  {
    "id": "6-2",
    "name": "地砖铺贴实训",
    "tag": "TILING",
    "note": "低位试提、视觉纠偏、压实与高差复核。",
    "title": "吸得住、对得准，还要压得稳。",
    "description": "比较吸盘布局并试提同一块砖；区分真实砖位与最后有效观测，纠偏后压实，再用靠尺核对砖面并卸载吸盘。",
    "question": "吸取、对位和压实，各看什么？",
    "result": "区分吸附稳定、视觉观测、接触力与完成面高度，理解它们不能互相替代。",
    "operation": "吸牢再提起 → 看清再对缝 → 压稳再复核。",
    "links": [
      [
        "进入铺贴实训",
        "../任务6-2_地砖铺贴_工艺准备与铺贴机器人作业/index.html"
      ]
    ]
  },
  {
    "id": "6-3",
    "name": "腻子打磨实训",
    "tag": "SANDING",
    "note": "接触力、磨料与表面、集尘及收工养护。",
    "title": "磨平表面，也要避免过磨。",
    "description": "让墙面凸起，比较固定位置与反馈退让；试磨不同表面，处理集尘异常，再结合侧光、靠尺与养护步骤完成交接。",
    "question": "接触力与表面效果怎样对照？",
    "result": "理解退让与力反馈，区分磨料、压力及驻留的作用，保留表面复核和设备养护。",
    "operation": "稳住接触力 → 磨出好表面 → 收住粉尘 → 验收与养护。",
    "links": [
      [
        "进入打磨工坊",
        "../任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/index.html"
      ]
    ]
  },
  {
    "id": "6-4",
    "name": "室内喷涂工坊",
    "tag": "SPRAYING",
    "note": "规划、试喷、执行，再巡检返修与交付。",
    "title": "路径走过，喷幅覆盖了吗？",
    "description": "对照喷距、道间距与窗洞保护，试喷后执行正式喷涂；查看累计覆盖与局部问题，返修后导出作业记录。",
    "question": "路径、启停和覆盖怎样核对？",
    "result": "区分路径与喷幅，观察窗洞保护、实际累计涂覆和局部返修。",
    "operation": "规划路线 → 两道试喷 → 正式喷涂 → 巡检返修 → 项目交付。",
    "links": [
      [
        "进入喷涂工坊",
        "../任务6-4_室内喷涂_路径规划_参数控制与缺陷诊断/index.html"
      ]
    ]
  }
];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>学会判断</th><th>动手验证与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">四个课堂独立运行，记录不自动跨页传递；参数与质量判断按各工艺分别核对，页面数值为教学设定。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'四项任务 · 四种工艺';$('story-title').textContent=t?.title||'做完动作，还要核对结果。';$('story-description').textContent=t?.description||'先体验工艺，再观察机器人怎样定位、取放、接触和覆盖；用实际操作留下可复核的证据。';
    const label=t?'进入课堂':'从砌筑工艺开始',url=(t||tasks[0]).links[0][1];
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
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(6);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
