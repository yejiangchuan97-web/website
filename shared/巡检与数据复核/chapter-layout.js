(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c7=lab;
const content=document.createElement('div');content.id='c7-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c7-nav';nav.setAttribute('aria-label','第七章学习导航');
const routes=[['patrol','7-1 桥梁巡检机器人','course/chapters/07/tasks/7-1/index.html'],['uav','7-2 无人机巡检与复核','course/chapters/07/tasks/7-2/index.html']];
nav.innerHTML='<a class="c7-home" href="../../course/chapters/07/overview/index.html">← 第七章总览</a><div class="c7-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div>';
document.body.prepend(nav);
})();
