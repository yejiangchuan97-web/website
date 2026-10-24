(()=>{'use strict';
const config=window.CHAPTER_LAYOUT,task=config.task,$=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],home='../第三章_机器人结构与运动/index.html';
const links=[['3-1','构型与空间','任务3-1_机器人构型与工作空间识读/index.html'],['3-2','六轴点动','任务3-2_六轴机械臂本体_关节轴与低速点动/index.html'],['3-3a','减速器','任务3-3_关节驱动_减速器与传动机构/reducers.html'],['3-3b','运动转换','任务3-3_关节驱动_减速器与传动机构/conversion.html'],['3-4','末端与 TCP','任务3-4_末端执行器_TCP与工具控制/index.html'],['3-5','移动底盘','任务3-5_移动底盘与行走机构/index.html']];
const titles={'3-1':['机器人构型与工作空间','看连接、数运动，理解能到哪里、能否通过。'],'3-2':['六轴机械臂与点动示教','选择参照系，控制位置与姿态，让每一步移动都有依据。'],'3-3':['关节传动 · '+(config.page==='conversion'?'运动转换':'减速器'),'找到输入、固定件与输出，用运动验证传动关系。'],'3-4':['末端执行器与 TCP','换装工具，理解工作点，完成标定与参数复核。'],'3-5':['移动底盘与行走机构','观察轮组与接地方式，把运动规律用在驾驶任务中。']};
function el(tag,cls,html=''){const e=document.createElement(tag);e.className=cls;if(html)e.innerHTML=html;return e;}
const legacy=el('div','c-legacy');legacy.hidden=true;
const original=[...document.body.children].filter(e=>!['SCRIPT','DIALOG','STYLE'].includes(e.tagName)&&e.id!=='toast');
original.forEach(e=>legacy.append(e));document.body.append(legacy);
const shell=el('div','chapter-shell');shell.id='chapter-shell';shell.dataset.task=task;shell.dataset.page=config.page;document.body.prepend(shell);
const active=task==='3-3'?(config.page==='conversion'?'3-3b':'3-3a'):task;
const head=el('header','c-header',`<a class="c-home" href="${home}" aria-label="返回第三章总入口"><span class="c-logo">⌘</span><span>机器人结构与运动<small>智能建筑机械与机器人 · 第三章</small></span></a><nav class="c-chapters" aria-label="第三章案例导航">${links.map(([id,name,url])=>`<a href="../${url}" ${id===active?'aria-current="page"':''}><small>${id.replace('a','A').replace('b','B')}</small>${name}</a>`).join('')}</nav><div class="c-tools"><button id="c-help" aria-label="操作说明">?</button><button id="c-theme" aria-label="切换明暗主题">◐</button><button id="c-full" aria-label="全屏展示">⛶</button></div>`);
const title=el('section','c-title',`<div class="c-title-number">${task}</div><div><div class="c-eyebrow">CHAPTER 03 / INTERACTIVE ROBOTICS LAB</div><h1>${titles[task][0]}</h1><p>${titles[task][1]}</p></div><div class="c-title-actions"></div>`);
const tabs=el('nav','c-activities');tabs.setAttribute('aria-label','学习活动');
const workspace=el('div','c-workspace'),left=el('div','c-left'),right=el('aside','c-right');right.setAttribute('aria-label','操作与任务引导');workspace.append(left,right);
const foot=el('footer','c-footer',`<span><i></i> 观察结构 <b>→</b> 动手操作 <b>→</b> 验证结果</span><span id="c-footnote">教学仿真 · 三维交互 · 离线可用</span><a href="${home}">返回第三章总览 ↗</a>`);shell.append(head,title,tabs,workspace,foot);
function move(node,to){if(typeof node==='string')node=$(node);if(node)to.append(node);return node;}
function deck(host,definitions,cls=''){const box=el('div','c-deck '+cls),nav=el('div','c-deck-tabs');nav.setAttribute('role','tablist');const panes=[];box.append(nav);definitions.forEach(([name,nodes],i)=>{const b=el('button','',name);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===0));nav.append(b);const pane=el('div','c-deck-pane');pane.dataset.inactive=String(i!==0);nodes.filter(Boolean).forEach(n=>move(n,pane));box.append(pane);panes.push(pane);b.onclick=()=>select(i);});function select(i){panes.forEach((p,j)=>{p.dataset.inactive=String(j!==i);nav.children[j].setAttribute('aria-selected',String(j===i));});window.dispatchEvent(new Event('resize'));}host.append(box);return {box,panes,select};}
let activityGuide;
if(task==='3-1'){
 move('.learning-tabs',tabs);move('#typePicker',left).classList.add('c-model-picker');move('.stage',left);
 const control=$('.pendant'),guide=$('.learning');
 const range=all('.pendant .range-control'),target=$('.target-panel'),rows=$('#jointRows'),jointTop=$('.joint-top');
 const insert=$('.pendant .panel-title');const inner=deck(control,[['关节点动',[jointTop,rows]],['行程与工具',range],['空间目标',[target]]],'c-control-deck');insert.after(inner.box);
 activityGuide=deck(right,[['操作控制',[control]],['学习任务',[guide]]]);
 move('.heading-actions #reset',$('.c-title-actions'));const text=$('#conceptText');if(text)move($('.concept'),foot);
}else if(task==='3-2'){
 move('.learning-nav',tabs);move('.stage-card',left);
 const control=$('.control-panel'),guide=$('.learning-section');
 const settings=el('div','c-settings');move('.speed-control',settings);move('.tool-control',settings);
 activityGuide=deck(right,[['点动控制',[control]],['学习任务',[guide]],['速度与工具',[settings]]]);
 move('.heading-actions #home',$('.c-title-actions'));move($('.concept-note'),foot);
}else if(task==='3-3'){
 move('#modules',tabs);move('.workspace > .main',left);
 const observation=$('.observation'),experiment=$('.experiment'),legend=$('.legend'),challenge=$('#challengeDetails');challenge.open=true;
 const guide=deck(right,[['运动观察',[observation]],['实验与零件',[experiment,legend]],['动手挑战',[challenge]]]);
 const observer=new MutationObserver(()=>{if(challenge.open===false)challenge.open=true;});observer.observe(challenge,{attributes:true,attributeFilter:['open']});
 move($('.topnav'),$('.c-title-actions'));
}else if(task==='3-4'){
 move('.mission-tabs',tabs);const area=el('div','c-tool-workspace');left.append(area);move('.tool-cabinet',area);move('.lab-centre',area);move('.control-panel',right);
 move($('.progress-badge'),$('.c-title-actions'));
 const pivot=$('#pivotPanel');
 deck(pivot,[['姿态对照',[$('#pivotPanel .intro'),$('.pivot-switch'),$('.angle-control'),$('#playPivot'),$('.motion-metrics')]],['工具参数',[$('#pivotExplanation'),$('#pivotPanel .divider-label'),$('#pivotPanel .field-label'),$('#parameterTool'),$('#correctParam'),$('#pivotPanel .microcopy')]]]);
 const cal=$('#calibratePanel');
 const captureButtons=$('#capture').closest('.button-pair'),validationButtons=$('#validate').closest('.button-pair');
 const calibration=deck(cal,[['采集四个姿态',[$('#calibratePanel .intro'),$('#poseButtons'),$('.cal-distance'),$('#calAdjust'),captureButtons]],['计算与复核',[$('#solve'),$('#calResult'),validationButtons,$('#validationResult'),$('.cal-details'),$('#calibratePanel .microcopy')]]]);
 cal.addEventListener('click',e=>{if(e.target.closest('#capture')&&window.toolLab?.getState().samples?.filter(Boolean).length===4)calibration.select(1);});
}else if(task==='3-5'){
 move('nav.tabs',tabs);move('.workspace > .stage',left);const panel=$('.workspace > .panel');move(panel,right);
 const drive=$('#drivePanel'),terrain=$('#terrainPanel'),game=$('#gamePanel');
 const drivePicker=$('#drivePanel .platform-picker'),terrainPicker=$('#terrainPanel .platform-picker');
 const selectors=el('div','c-mobile-selectors');left.prepend(selectors);move(drivePicker,selectors);move(terrainPicker,selectors);
 const d=deck(drive,[['运动操纵',[$('#drivePanel .learning-intro'),$('#drivePanel .control-card')]],['预测验证',[$('#drivePanel .prediction-card')]],['自由驾驶',[$('#drivePanel .manual-controls'),$('#enterGame')]]]);
 const manual=$('.manual-controls');manual.open=true;
 deck(terrain,[['动作分解',[$('#terrainPanel .learning-intro'),$('#terrainPanel .timeline-card')]],['接地观察',[$('#terrainPanel .evidence-card'),$('#terrainPanel .learning-note'),$('#backToWheels')]]]);
 const gameSetup=[$('.campaign-summary'),$('.chapter-picker'),$('.level-picker'),$('#gamePanel .mission'),$('.game-actions')];
 const gameDrive=[$('.mission-checks'),$('.control-label'),$('.game-pad'),$('#gameSteering'),$('#gameFeedback'),$('.docking-monitor')];
 const gameInfo=[$('.route-details'),$('.game-record')];$('.route-details').open=true;
 const gameDeck=deck(game,[['选择关卡',gameSetup],['驾驶控制',gameDrive],['路线与记录',gameInfo]]);$('#startGame').addEventListener('click',()=>gameDeck.select(1));$('#retryGame').addEventListener('click',()=>gameDeck.select(1));
 function sync(){const mode=document.body.dataset.activity||'drive';selectors.hidden=mode==='game';drivePicker.hidden=mode!=='drive';terrainPicker.hidden=mode!=='terrain';}
 new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-activity']});sync();
}
if(activityGuide){tabs.addEventListener('click',e=>{if(e.target.closest('[data-activity]'))activityGuide.select(1);});}
// Native dialogs keep supplementary explanations out of the working screen.
all('#chapter-shell .cal-details').forEach(details=>{const launch=el('button','c-detail-button','对点记录与错误示例 ↗'),dialog=el('dialog','c-detail-dialog'),close=el('button','c-detail-close','返回操作台 ×');details.before(launch);dialog.append(close,details);details.open=true;document.body.append(dialog);launch.onclick=()=>dialog.showModal();close.onclick=()=>dialog.close();});
const concept=foot.querySelector('.concept,.concept-note');
if(concept){const launch=el('button','c-observation','观察提示 ↗'),dialog=el('dialog','c-observation-dialog'),close=el('button','c-detail-close','返回操作台 ×'),heading=el('h2','','观察提示');foot.insertBefore(launch,$('#c-footnote'));dialog.append(close,heading,concept);document.body.append(dialog);launch.onclick=()=>dialog.showModal();close.onclick=()=>dialog.close();}
all('.c-deck-tabs').forEach((nav,n)=>{const buttons=[...nav.children],panes=[...nav.parentElement.children].filter(e=>e.classList.contains('c-deck-pane'));buttons.forEach((b,i)=>{b.id=`c-tab-${n}-${i}`;panes[i].id=`c-pane-${n}-${i}`;b.setAttribute('aria-controls',panes[i].id);panes[i].setAttribute('role','tabpanel');panes[i].setAttribute('aria-labelledby',b.id);});const sync=()=>buttons.forEach(b=>b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1);sync();nav.addEventListener('click',sync);new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-selected']});nav.addEventListener('keydown',e=>{const i=buttons.indexOf(document.activeElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const j=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[j].click();buttons[j].focus();});});
$('#c-help').onclick=()=>$('#help')?.click();$('#c-theme').onclick=()=>{const dark=document.documentElement.dataset.theme==='dark'||document.body.dataset.theme==='dark';const original=$(`.c-legacy button[data-theme="${dark?'light':'dark'}"]`)||$(`.c-legacy button[data-theme-button="${dark?'light':'dark'}"]`)||$('.c-legacy #theme');original?.click();};
$('#c-full').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>{});};
function fit(){const s=Math.min(innerWidth/1600,innerHeight/900);shell.style.transform=`translate(-50%,-50%) scale(${s})`;document.documentElement.style.setProperty('--chapter-scale',s);}
addEventListener('resize',fit);fit();
// Start every visit in dark mode through the native handler; keep theme switching available.
addEventListener('DOMContentLoaded',()=>{const preferred='dark';const isDark=()=>document.documentElement.dataset.theme==='dark'||document.body.dataset.theme==='dark';if(isDark()!==(preferred==='dark'))$('#c-theme').click();const sync=()=>{shell.dataset.theme=isDark()?'dark':'light';try{localStorage.setItem('chapter3-theme',shell.dataset.theme);}catch{}};sync();new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-theme']});});
window.ChapterShell={task,fit,guide:activityGuide,diagnostics:()=>({task,logical:[shell.offsetWidth,shell.offsetHeight],screen:[shell.getBoundingClientRect().width,shell.getBoundingClientRect().height],document:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],viewport:[innerWidth,innerHeight]})};
})();
