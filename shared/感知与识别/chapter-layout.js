(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;
root.dataset.c4=lab;
const content=document.createElement('div');content.id='c4-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c4-nav';nav.setAttribute('aria-label','第四章实验导航');
const routes=[['state','4-1 自身状态','course/chapters/04/tasks/4-1/index.html'],['lidar','4-2 激光雷达','course/chapters/04/tasks/4-2/index.html'],['annotation','4-3 标注','course/chapters/04/tasks/4-3/index.html#annotation'],['predict','预测','course/chapters/04/tasks/4-3/index.html#predict'],['evaluate','评估','course/chapters/04/tasks/4-3/index.html#evaluate']];
nav.innerHTML='<a class="c4-home" href="../../course/chapters/04/overview/index.html">← 第四章总览</a><div class="c4-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" href="../${url}">${name}</a>`).join('')+'</div>';
document.body.prepend(nav);

function highlight(){const selected=lab==='vision'?(location.hash.slice(1).split('?')[0]||document.body.dataset.startView):lab;nav.querySelectorAll('[data-route]').forEach(a=>{a.toggleAttribute('aria-current',a.dataset.route===selected);if(lab==='vision'&&['annotation','predict','evaluate'].includes(a.dataset.route))a.href='#'+a.dataset.route;});}
addEventListener('hashchange',highlight);addEventListener('popstate',highlight);addEventListener('c4-route-change',highlight);
highlight();
})();
