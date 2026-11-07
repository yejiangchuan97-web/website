(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c5=lab;
const content=document.createElement('div');content.id='c5-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c5-nav';nav.setAttribute('aria-label','第五章学习导航');
const routes=[['rebar','5-1 加工与作业面','course/chapters/05/tasks/5-1/index.html'],['tying','5-2 绑扎与复核','course/chapters/05/tasks/5-2/index.html'],['concrete','5-3 混凝土工序','course/chapters/05/tasks/5-3/index.html']];
nav.innerHTML='<a class="c5-home" href="../../course/chapters/05/overview/index.html">← 第五章总览</a><div class="c5-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div>';
document.body.prepend(nav);
})();
