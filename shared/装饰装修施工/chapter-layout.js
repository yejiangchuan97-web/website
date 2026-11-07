(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c6=lab;
const content=document.createElement('div');content.id='c6-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c6-nav';nav.setAttribute('aria-label','第六章学习导航');
const routes=[['masonry','6-1 砌筑','course/chapters/06/tasks/6-1/index.html'],['tiling','6-2 地砖铺贴','course/chapters/06/tasks/6-2/index.html'],['sanding','6-3 腻子打磨','course/chapters/06/tasks/6-3/index.html'],['spray','6-4 室内喷涂','course/chapters/06/tasks/6-4/index.html']];
nav.innerHTML='<a class="c6-home" href="../../course/chapters/06/overview/index.html">← 第六章总览</a><div class="c6-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div>';
document.body.prepend(nav);
})();
