(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c7=lab;
const content=document.createElement('div');content.id='c7-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c7-nav';nav.setAttribute('aria-label','第七章学习导航');
const routes=[['patrol','7-1 桥梁巡检机器人','任务7-1_巡检机器人_轮式_四足与爬壁/index.html'],['uav','7-2 无人机巡检与复核','任务7-2_无人机巡检_病害检测与数据复核/index.html']];
nav.innerHTML='<a class="c7-home" href="../第七章_巡检与数据复核/index.html">← 第七章总览</a><div class="c7-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div><button id="c7-theme" type="button">切换浅色</button>';
document.body.prepend(nav);
function sync(){nav.querySelector('#c7-theme').textContent=root.dataset.theme==='dark'?'切换浅色':'切换深色';}
nav.querySelector('#c7-theme').onclick=()=>{document.getElementById(lab==='patrol'?'themeButton':'theme')?.click();sync();};
document.addEventListener('DOMContentLoaded',()=>{sync();new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['data-theme']});});
})();
