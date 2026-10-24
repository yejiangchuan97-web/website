(() => {
  'use strict';
  const script=document.currentScript,config=script.dataset;
  const root=config.root||'../',active=config.lab;
  const links=[['motor','2-1A','直流电机','任务2-1_动力装置的基本原理/index.html'],['diesel','2-1B','柴油机','任务2-1_动力装置的基本原理/diesel.html'],['transmission','2-2','动力传动','任务2-2_动力的传递与变换/index.html'],['mechanisms','2-3A','工作机构','任务2-3_工作机构与施工动作/index.html'],['fourbar','2-3B','四杆扩展','任务2-3_工作机构与施工动作/fourbar.html']];
  document.documentElement.dataset.c2=active;
  const nav=document.createElement('nav');nav.className='c2-nav';nav.setAttribute('aria-label','第二章实验导航');
  nav.innerHTML=`<a class="c2-home" href="${root}第二章_动力与工作机构/index.html"><b>⌘</b><span>动力与工作机构<small>第二章 · 返回章节总览</small></span></a><div class="c2-links">${links.map(([id,code,name,file])=>`<a href="${root+file}" ${id===active?'aria-current="page"':''}><small>${code}</small>${name}</a>`).join('')}</div><a class="c2-course" href="${root}index.html#chapter-2">课程总览 ↗</a>`;
  document.body.prepend(nav);
  // The source labs keep their own controls, model state, and rendering logic.
  // Every visit starts dark, even if the previous visit used a light theme.
  if(active==='diesel')document.getElementById('darkTheme')?.click();
  const theme=document.querySelector('meta[name="color-scheme"]');if(theme)theme.content='dark';
  if(active==='diesel'){
    const main=document.querySelector('body>main'),dashboard=document.getElementById('multiDashboard'),cycle=document.querySelector('.cycle-panel');
    const tabs=document.createElement('div');tabs.className='c2-activities';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','柴油机学习活动');
    const panels=[main,dashboard,cycle],names=['结构与运行','多缸协同','四冲程观察'];
    panels.forEach((panel,i)=>{panel.classList.add('c2-diesel-panel');panel.id||='c2-diesel-'+i;panel.setAttribute('role','tabpanel');const button=document.createElement('button');button.textContent=names[i];button.id='c2-diesel-tab-'+i;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',button.id);tabs.append(button);button.onclick=()=>select(i);});
    function select(index){panels.forEach((panel,i)=>{panel.classList.toggle('c2-panel-hidden',i!==index);tabs.children[i].setAttribute('aria-selected',String(i===index));tabs.children[i].tabIndex=i===index?0:-1;});dispatchEvent(new Event('resize'));}
    tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const current=[...tabs.children].indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?2:(current+(e.key==='ArrowRight'?1:2))%3;select(next);tabs.children[next].focus();};
    main.before(tabs);select(0);
  }
  if(active==='mechanisms'){
    const lessons=document.querySelector('.lessons');if(lessons){const details=document.createElement('details');details.className='c2-lesson-notes';const summary=document.createElement('summary');summary.textContent='本实验要点 · 传力、导程与偏心振动';lessons.before(details);details.append(summary,lessons);}
  }
})();
