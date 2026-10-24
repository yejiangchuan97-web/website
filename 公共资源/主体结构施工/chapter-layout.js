(()=>{'use strict';
/*CONFIG*/
const root=document.documentElement;root.dataset.c5=lab;root.dataset.theme='dark';
const content=document.createElement('div');content.id='c5-content';
for(const node of [...document.body.children])if(!['SCRIPT','STYLE','DIALOG'].includes(node.tagName))content.append(node);
document.body.prepend(content);
const nav=document.createElement('nav');nav.className='c5-nav';nav.setAttribute('aria-label','第五章学习导航');
const routes=[['rebar','5-1 加工与作业面','任务5-1_钢筋加工机械与绑扎作业面识读/index.html'],['tying','5-2 绑扎与复核','任务5-2_钢筋绑扎机器人操作与人工复核/index.html'],['concrete','5-3 混凝土工序导读','任务5-3_混凝土泵送布料与整平抹光机器人/index.html']];
nav.innerHTML='<a class="c5-home" href="../第五章_主体结构施工/index.html">← 第五章总览</a><div class="c5-links">'+routes.map(([id,name,url])=>`<a data-route="${id}" ${id===lab?'aria-current="page"':''} href="../${url}">${name}</a>`).join('')+'</div><button id="c5-theme" type="button">切换浅色</button>';
document.body.prepend(nav);
function sync(){root.dataset.theme=lab==='tying'?document.body.dataset.theme:root.dataset.theme;nav.querySelector('#c5-theme').textContent=root.dataset.theme==='dark'?'切换浅色':'切换深色';}
function apply(next){if(lab==='tying'){if(document.body.dataset.theme!==next)document.getElementById('theme')?.click();}else {root.dataset.theme=next;window.__REBAR_GAME__?.setTheme(next==='dark');}sync();}
nav.querySelector('#c5-theme').onclick=()=>apply(root.dataset.theme==='dark'?'light':'dark');
document.addEventListener('DOMContentLoaded',()=>{apply('dark');new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-theme']});});
})();
