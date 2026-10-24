(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tasks = [
    {id:'2-1',name:'动力装置的基本原理',tag:'POWER SOURCE',note:'从电磁转矩到燃烧做功，认识两种动力来源。',links:[['直流电机','../任务2-1_动力装置的基本原理/index.html'],['柴油机','../任务2-1_动力装置的基本原理/diesel.html']]},
    {id:'2-2',name:'动力的传递与变换',tag:'TRANSMISSION',note:'比较机械、液压与气压传动，追踪输入和输出。',links:[['动力传动实验室','../任务2-2_动力的传递与变换/index.html']]},
    {id:'2-3',name:'工作机构与施工动作',tag:'MECHANISM & ACTION',note:'让动力变成动臂、升降、振动与夹持动作。',links:[['工作机构','../任务2-3_工作机构与施工动作/index.html'],['四杆扩展','../任务2-3_工作机构与施工动作/fourbar.html']]}
  ];
  const exhibits = [
    {id:'motor',task:'2-1',title:'电流与磁场，让转子动起来。',description:'剖切电机，反接电源，对照电流、磁场和转矩；再观察内置电机如何带动机器人关节。',link:tasks[0].links[0]},
    {id:'diesel',task:'2-1',title:'四个冲程，接续输出动力。',description:'拆解柴油机，切换单缸、四缸与六缸，沿着进气、压缩、做功、排气观察活塞与曲轴。',link:tasks[0].links[1]},
    {id:'transmission',task:'2-2',title:'输入改变，输出怎样响应？',description:'切换齿轮、带与链传动，交换输入轴；再比较液压与气压推动，验证速度、力与运动方向。',link:tasks[1].links[0]},
    {id:'mechanisms',task:'2-3',title:'把动力，变成施工需要的动作。',description:'操纵液压缸与动臂，改变丝杠导程、相对转速与偏心条件，观察轨迹、升降和振动。',link:tasks[2].links[0]},
    {id:'fourbar',task:'2-3',title:'四根杆件，约束出一条轨迹。',description:'拖动曲柄，调整杆长与装配分支，追踪连杆点的轨迹，对照传动角、受力和夹爪动作。',link:tasks[2].links[1]}
  ];
  let selected=null,timer=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('task-cards').innerHTML=tasks.map(t=>`<article class="task-card" data-task="${t.id}"><div class="task-top"><span>任务 ${t.id}</span><small>${t.tag}</small></div><button class="task-select">${t.name}</button><p>${t.note}</p><div class="task-links">${t.links.map(([name,url])=>`<a href="${url}">${name} <span>↗</span></a>`).join('')}</div></article>`).join('');
  function select(id){
    const e=exhibits.find(e=>e.id===id);selected=e?.id||null;
    document.querySelectorAll('.task-card').forEach(c=>c.classList.toggle('selected',c.dataset.task===e?.task));
    window.CourseScene?.focus(selected);
    $('story-label').textContent=e?`任务 ${e.task} / ${tasks.find(t=>t.id===e.task).tag}`:'三项任务 · 一条动力链';
    $('story-title').textContent=e?.title||'看见动力，理解动作。';
    $('story-description').textContent=e?.description||'观察电机、柴油机与传动机构，亲手改变条件，追踪动力如何变成转动、升降与夹持。';
    const [label,url]=e?.link||['从动力源开始探索',tasks[0].links[0][1]];
    $('story-actions').innerHTML=`<a class="entry-primary" href="${url}">${e?'进入'+label:label} <span>↗</span></a><button id="overview" class="entry-secondary">全部展品</button>`;
    $('overview').onclick=()=>{stopTour();select(null);window.CourseScene?.resetView();};
  }
  function stopTour(){if(timer)clearInterval(timer);timer=null;$('tour').setAttribute('aria-pressed','false');$('tour').textContent='▷ 逐站巡展';}
  window.CourseUI={model(id){stopTour();select(id);},preview(id){if(!timer)select(id);}};
  document.querySelectorAll('.task-select').forEach(b=>b.onclick=()=>{stopTour();select(exhibits.find(e=>e.task===b.closest('[data-task]').dataset.task).id);});
  $('tour').onclick=()=>{if(timer){stopTour();return;}let i=Math.max(0,exhibits.findIndex(e=>e.id===selected));select(exhibits[i].id);$('tour').setAttribute('aria-pressed','true');$('tour').textContent='■ 停止巡展';timer=setInterval(()=>{i=(i+1)%exhibits.length;select(exhibits[i].id);},4500);};
  $('reset-view').onclick=()=>window.CourseScene?.resetView();
  function motion(){window.CourseScene?.pause(paused);$('motion').setAttribute('aria-pressed',String(paused));$('motion').textContent=paused?'▷ 播放模型':'Ⅱ 暂停模型';}
  $('motion').onclick=()=>{paused=!paused;motion();};
  $('show-guide').onclick=()=>$('entry-guide').showModal();$('close-guide').onclick=()=>$('entry-guide').close();
  $('entry-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
  function fit(){$('entry-screen').style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1600,innerHeight/900)})`;}
  addEventListener('resize',fit);addEventListener('pagehide',stopTour);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});
  fit();window.CourseScene?.show(2);motion();select(null);
  window.ChapterEntry={select,stopTour,state:()=>({selected,touring:!!timer,paused,models:window.CourseScene?.getState()})};
})();
