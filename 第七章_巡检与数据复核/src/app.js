(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const tasks=[
  {
    "id": "7-1",
    "name": "桥梁巡检机器人",
    "tag": "REACH & CAPTURE",
    "note": "轮式、四足与爬壁：到位取证，同点复查与记录。",
    "title": "平台走到位，证据还要看得清。",
    "description": "在同一座桥上比较三种平台的到达条件；调整真实取景器，采集全景与细部，冻结原始照片并记录处置与复查结果。",
    "question": "怎样到达、取证，再安排后续？",
    "result": "把平台与地形、拍摄质量、观察现象和后续处理联系起来，保留原始照片与复查证据。",
    "operation": "看现场 → 走到位 → 看清楚 → 留记录。导出包含照片与待办的 HTML 记录。",
    "links": [
      [
        "进入桥梁巡检",
        "../任务7-1_巡检机器人_轮式_四足与爬壁/index.html"
      ]
    ]
  },
  {
    "id": "7-2",
    "name": "无人机巡检与影像复核",
    "tag": "IMAGE & REVIEW",
    "note": "规划六个点位，核对影像、误报漏报与照片版本。",
    "title": "一张新照片，需要一次新的复核。",
    "description": "比较距离、角度、速度与快门对成像的影响；对照原图和候选，主动查找漏检，补拍后重新提交意见并保留历史版本。",
    "question": "影像能否支持这次判断？",
    "result": "区分采集质量与病害判断，识别误报和漏报，让人工意见关联到具体照片版本。",
    "operation": "规划点位 → 采集影像 → 复核疑点 → 交付记录。可导出完整 JSON 与表格 CSV。",
    "links": [
      [
        "进入无人机实训",
        "../任务7-2_无人机巡检_病害检测与数据复核/index.html"
      ]
    ]
  }
];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const links=t=>t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('');
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select" aria-label="预览${t.name}">${t.name}</button><p>${t.note}</p><div class="task-links">${links(t)}</div></article>`).join('');
  $('summary-content').innerHTML=`<table class="summary-table"><thead><tr><th>学习任务</th><th>学会判断</th><th>动手验证与入口</th></tr></thead><tbody>${tasks.map(t=>`<tr><th scope="row"><small>${t.id}</small><b>${t.name}</b><p>${t.question}</p></th><td>${t.result}</td><td><p>${t.operation}</p><div class="summary-links">${links(t)}</div></td></tr>`).join('')}</tbody></table><p class="summary-note">两个课堂独立运行，不自动传递记录。无人机影像与候选均为合成教学样例，未运行病害检测模型；桥梁照片由课堂三维现场取景生成。</p>`;
  function select(id){
    const t=tasks.find(t=>t.id===id);selected=t?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===selected));window.CourseScene?.focus(selected);
    $('story-label').textContent=t?`任务 ${t.id} / ${t.tag}`:'两项任务 · 从现场到记录';$('story-title').textContent=t?.title||'把疑点，带回可核对的记录。';$('story-description').textContent=t?.description||'选择平台与点位，看清现场和影像；对照原图复核疑点，把照片、意见与后续安排关联起来。';
    const label=t?'进入课堂':'从桥梁巡检开始',url=(t||tasks[0]).links[0][1];
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
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});fit();window.CourseScene?.show(7);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
