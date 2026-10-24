(() => {
  'use strict';
  const $=id=>document.getElementById(id),data=window.COURSE;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const chapter=n=>data.chapters.find(c=>c.id===n),links=t=>t.entries||[];
  $('chapter-grid').innerHTML=data.chapters.map(c=>`<article class="chapter-card" id="chapter-${c.id}"><a class="chapter-entry-link" data-chapter="${c.id}" href="${esc(c.entry)}" aria-label="进入第${c.id}章 ${esc(c.title)}"><div class="chapter-top"><span>CHAPTER 0${c.id}</span><small>${esc(c.kind)}</small></div><h3>${esc(c.title)}</h3><p>${esc(c.description)}</p><div class="chapter-bottom"><span>${c.tasks.length} 项任务</span><b>进入章节 ↗</b></div></a><button class="task-shortcut" data-tasks="${c.id}" aria-label="查看第${c.id}章任务">任务目录</button></article>`).join('');
  $('start-course').href=chapter(1).entry;
  $('chapter-filter').insertAdjacentHTML('beforeend',data.chapters.map(c=>`<option value="${c.id}">第${c.id}章 · ${esc(c.title)}</option>`).join(''));
  const route=[
    ['从现场认识设备','用场景说明问题，认识机械、机器人与人的分工。',[1]],
    ['从动力走到运动','看动力如何产生与传递，再识读结构、关节和工具。',[2,3]],
    ['从观测走到识别','认识自身状态、环境扫描与图像中的目标和疑点。',[4]],
    ['进入具体施工作业','比较主体结构与装饰装修中的动作、反馈和质量复核。',[5,6]],
    ['把复核与维护接起来','巡检取证、数据复核，再识读安全操作与维护条件。',[7,8]]
  ];
  $('route-list').innerHTML=route.map(([title,text,ids])=>`<li><h3>${title}</h3><p>${text}</p><div>${ids.map(n=>`<a href="${esc(chapter(n).entry)}">0${n} ${esc(chapter(n).title)} ↗</a>`).join('')}</div></li>`).join('');
  $('route-open').onclick=()=>$('learning-route').showModal();$('route-close').onclick=()=>$('learning-route').close();
  function catalog(){
    const query=$('task-search').value.trim().toLowerCase(),filter=Number($('chapter-filter').value);
    let count=0,groups=0;
    $('catalog-content').innerHTML=data.chapters.map(c=>{
      if(filter&&c.id!==filter)return '';
      const tasks=c.tasks.filter(t=>(`${t.id} ${t.title} ${c.title} ${t.kind} 第${c.id}章`).toLowerCase().includes(query));
      if(!tasks.length)return '';count+=tasks.length;groups++;
      return `<section class="catalog-group" data-catalog-chapter="${c.id}"><h3><a href="${esc(c.entry)}">0${c.id} ${esc(c.title)} ↗</a><small>${tasks.length} 项任务</small></h3>${tasks.map(t=>`<article class="catalog-row" data-task="${t.id}"><span class="task-code">${t.id}</span><div class="task-info"><a class="task-title" href="${esc(links(t)[0].file)}">${esc(t.title)} ↗</a><small>${esc(t.kind)}</small>${links(t).length>1?`<div class="task-sub">${links(t).map(e=>`<a href="${esc(e.file)}">${esc(e.title)} ↗</a>`).join('')}</div>`:''}</div></article>`).join('')}</section>`;
    }).join('');
    $('catalog-count').textContent=`显示 ${count} 项任务 · ${groups} 个章节`;
    if(!count)$('catalog-content').innerHTML='<p class="empty-search">没有找到对应任务，请换一个关键词或章节。</p>';
  }
  function openCatalog(n=0){$('task-search').value='';$('chapter-filter').value=String(n);catalog();$('catalog').showModal();$('task-search').focus();}
  $('catalog-open').onclick=()=>openCatalog();$('catalog-close').onclick=()=>$('catalog').close();
  $('chapter-grid').addEventListener('click',e=>{const b=e.target.closest('[data-tasks]');if(b)openCatalog(Number(b.dataset.tasks));});
  $('task-search').oninput=catalog;$('chapter-filter').onchange=catalog;
  for(const dialog of [$('catalog'),$('learning-route')])dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  function markChapter(){const match=location.hash.match(/^#chapter-([1-8])$/);document.querySelectorAll('.chapter-card').forEach(c=>c.classList.toggle('returning',c.id===match?.[0].slice(1)));}
  addEventListener('hashchange',markChapter);markChapter();
  window.CourseUI={model(id){if(!id.includes('-')){const c=chapter(Number(id));if(c)location.href=c.entry;return;}const t=data.chapters.flatMap(c=>c.tasks).find(t=>t.id===id);if(t)location.href=links(t)[0].file;}};
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function motion(){const b=$('motion');b.setAttribute('aria-pressed',String(paused));b.setAttribute('aria-label',paused?'播放模型运动':'暂停模型运动');b.textContent=paused?'▷ 播放模型':'Ⅱ 暂停模型';window.CourseScene?.pause(paused);}
  $('motion').onclick=()=>{paused=!paused;motion();};window.CourseScene?.show(0);motion();
  window.CourseHome={state:()=>({chapters:data.chapters.length,tasks:data.chapters.reduce((sum,c)=>sum+c.tasks.length,0),paused,models:window.CourseScene?.getState?.()}),openCatalog};
})();
