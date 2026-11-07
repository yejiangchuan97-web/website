(() => {
  'use strict';
  const script=document.currentScript,config=script.dataset;
  const root=config.root||'../',active=config.lab;
  const links=/*__CHAPTER_TASKS__*/;
  const task={motor:'2-1',diesel:'2-1',transmission:'2-2',mechanisms:'2-3',fourbar:'2-3'}[active];
  document.documentElement.dataset.c2=active;
  const nav=document.createElement('nav');
  nav.className='c2-nav';
  nav.setAttribute('aria-label','本章导航');
  nav.innerHTML=`<a class="c2-home" href="${root}course/chapters/02/overview/index.html">← 第二章 · 动力与工作机构</a><div class="c2-links">${links.map(({id,title,demo})=>`<a href="${root+demo}" ${id===task?'aria-current="page"':''}>${id} ${title}</a>`).join('')}</div>`;
  document.body.prepend(nav);
  if(active==='mechanisms'){
    const lessons=document.querySelector('.lessons');if(lessons){const details=document.createElement('details');details.className='c2-lesson-notes';const summary=document.createElement('summary');summary.textContent='本实验要点 · 传力、导程与偏心振动';lessons.before(details);details.append(summary,lessons);}
  }
})();
