(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c6=lab;
const content=document.createElement('div');content.id='c6-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c6-nav';nav.setAttribute('aria-label','第六章学习导航');
const routes=[['masonry','6-1 砌筑','任务6-1_砌筑工程_人工工艺_砂浆机械与机器人进场/index.html'],['tiling','6-2 地砖铺贴','任务6-2_地砖铺贴_工艺准备与铺贴机器人作业/index.html'],['sanding','6-3 腻子打磨','任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/index.html'],['spray','6-4 室内喷涂','任务6-4_室内喷涂_路径规划_参数控制与缺陷诊断/index.html']];
nav.innerHTML='<a class="c6-home" href="../第六章_装饰装修施工/index.html">← 第六章总览</a><div class="c6-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div><button id="c6-theme" type="button">切换浅色</button>';
document.body.prepend(nav);
function sync(){if(lab==='spray'&&root.dataset.theme!==document.body.dataset.theme)root.dataset.theme=document.body.dataset.theme;nav.querySelector('#c6-theme').textContent=root.dataset.theme==='dark'?'切换浅色':'切换深色';}
nav.querySelector('#c6-theme').onclick=()=>{document.getElementById('theme')?.click();sync();};
document.addEventListener('DOMContentLoaded',()=>{sync();new MutationObserver(sync).observe(lab==='spray'?document.body:root,{attributes:true,attributeFilter:['data-theme']});});
})();
