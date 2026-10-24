(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;
root.dataset.c4=lab;
const content=document.createElement('div');content.id='c4-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c4-nav';nav.setAttribute('aria-label','第四章实验导航');
const routes=[['state','4-1 自身状态','任务4-1_机器人自身状态感知/index.html'],['lidar','4-2 激光雷达','任务4-2_机器人激光雷达感知/index.html'],['annotation','4-3 标注','任务4-3_标注安全帽并应用YOLO模型/index.html#annotation'],['predict','预测','任务4-3_标注安全帽并应用YOLO模型/index.html#predict'],['evaluate','评估','任务4-3_标注安全帽并应用YOLO模型/index.html#evaluate']];
nav.innerHTML='<a class="c4-home" href="../第四章_感知与智能识别/index.html">← 第四章总览</a><div class="c4-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" href="../${url}">${name}</a>`).join('')+'</div><button id="c4-theme" type="button">切换浅色</button>';
document.body.prepend(nav);
let theme='dark';
function highlight(){const selected=lab==='vision'?(location.hash.slice(1).split('?')[0]||document.body.dataset.startView):lab;nav.querySelectorAll('[data-route]').forEach(a=>{a.toggleAttribute('aria-current',a.dataset.route===selected);if(lab==='vision'&&['annotation','predict','evaluate'].includes(a.dataset.route))a.href='#'+a.dataset.route;});}
function syncFrames(){document.querySelectorAll('.lesson-frame').forEach(f=>{if(f.contentDocument?.documentElement)f.contentDocument.documentElement.dataset.theme=theme;});}
function applyTheme(next){theme=next;root.dataset.c4Theme=theme;
 if(lab==='state'){if(root.dataset.theme!==theme)document.getElementById('themeButton')?.click();}
 else if(lab==='lidar'){document.getElementById(theme==='dark'?'darkTheme':'lightTheme')?.click();}
 else {root.dataset.theme=theme;syncFrames();}
 nav.querySelector('#c4-theme').textContent=theme==='dark'?'切换浅色':'切换深色';
}
nav.querySelector('#c4-theme').onclick=()=>applyTheme(root.dataset.theme==='dark'?'light':'dark');
document.querySelectorAll('.lesson-frame').forEach(f=>f.addEventListener('load',syncFrames));
addEventListener('hashchange',highlight);addEventListener('popstate',highlight);addEventListener('c4-route-change',highlight);
document.addEventListener('DOMContentLoaded',()=>{applyTheme('dark');highlight();new MutationObserver(()=>{root.dataset.c4Theme=root.dataset.theme;nav.querySelector('#c4-theme').textContent=root.dataset.theme==='dark'?'切换浅色':'切换深色';}).observe(root,{attributes:true,attributeFilter:['data-theme']});});
highlight();
})();
