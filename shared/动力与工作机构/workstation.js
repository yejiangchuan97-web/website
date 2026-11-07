/* Chapter-wide presentation controls; experiments retain ownership of their state. */
(() => {
  'use strict';
  const lab=document.documentElement.dataset.c2, lesson=window.Chapter2Guides?.[lab];
  if(!lesson)return;
  const $=selector=>document.querySelector(selector);
  const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls||'';if(text)el.textContent=text;return el;};
  const button=(text,fn,cls='')=>{const el=make('button','c2-button '+cls,text);el.type='button';el.addEventListener('click',fn);return el;};
  const pause=()=>document.dispatchEvent(new Event('course:pause'));
  const header={motor:'.top-actions',diesel:'.header-actions',transmission:'.top-actions',mechanisms:'.mast .toolbar',fourbar:'.fb-header nav'}[lab];
  const actions=make('div','c2-learning-actions');
  const helpOriginal=$('#helpBtn');
  if(helpOriginal){helpOriginal.textContent='原理与实验说明';helpOriginal.classList.add('c2-original-help');}
  const guide=button('学习引导',()=>openDialog('guide'),'c2-guide-button');guide.id='c2-guide';
  const help=button('操作说明',()=>openDialog('help'));help.id='c2-help';
  actions.append(guide,help);$(header)?.append(actions);
  const dialog=make('dialog','c2-dialog');dialog.id='c2-learning-dialog';dialog.setAttribute('aria-labelledby','c2-dialog-title');
  const dialogHead=make('div','c2-dialog-head'),title=make('h2');title.id='c2-dialog-title';
  dialogHead.append(title,button('关闭',()=>dialog.close()));
  const body=make('div','c2-dialog-body'),foot=make('div','c2-dialog-foot');
  foot.append(button('开始观察',()=>dialog.close(),'c2-primary'));dialog.append(dialogHead,body,foot);document.body.append(dialog);
  let opener;
  function openDialog(kind){
    pause();opener=kind==='guide'?guide:help;body.replaceChildren();
    title.textContent=kind==='guide'?lesson.title:'操作说明';
    function section(name,content){const h=make('h3','',name);body.append(h,content);}
    if(kind==='guide'){
      const goals=make('ul');lesson.goals.forEach(t=>goals.append(make('li','',t)));section('本节学什么',goals);
      const steps=make('ol','c2-steps');lesson.steps.forEach(([name,text])=>{const item=make('li');item.append(make('strong','',name),make('p','',text));steps.append(item);});section('按这三步观察',steps);
      section('观察后，试着说明',make('p','c2-reflection',lesson.reflection));body.append(make('p','c2-boundary',lesson.boundary));
    }else{
      const list=make('ol');lesson.help.forEach(t=>list.append(make('li','',t)));body.append(list);
      if(helpOriginal&&lab!=='diesel')body.append(button('原理与实验说明 ↗',()=>{dialog.close();helpOriginal.click();}));
    }
    dialog.showModal();
  }
  dialog.addEventListener('close',()=>opener?.focus());
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
  // Keep legacy document shortcuts out of both guide and help dialogs.
  document.addEventListener('keydown',e=>{if(dialog.open&&e.key!=='Escape')e.stopImmediatePropagation();},true);

  // Keep each mechanism in a single observation workstation.
  if(lab==='mechanisms'){
    const labs=$('.labs'),panels=[...labs.children].filter(e=>e.classList.contains('lab'));
    const tabs=make('div','c2-experiments');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','工作机构展示方式');
    panels.forEach(panel=>{
      const model=make('section','c2-model-column'),control=make('aside','c2-control-column');
      [...panel.children].forEach(el=>(el.matches('.stats,.controls,.lab-foot')?control:model).append(el));panel.append(model,control);
    });
    const transport=make('div','c2-mechanism-transport');
    for(const element of [$('#play'),$('#reverse'),$('#reset'),$('#speed').closest('label')])transport.append(element);
    const prompts=[
      ['看液压缸怎样带动动臂','单步伸出液压缸，沿销轴观察 A、B、C 三根杆怎样联动。杆长滑块用于重新设置尺寸，播放时各杆的长度固定。'],
      ['看转动怎样变成升降','先用“丝杠转 1 圈”比较位移，再改变导程重复观察。切换同步同转，比较丝杠与螺母的相对运动。'],
    ];
    panels.forEach((panel,i)=>{
      const control=panel.querySelector('.c2-control-column');
      const guide=make('section','mechanism-observation');
      guide.append(make('h3','',prompts[i][0]),make('p','',prompts[i][1]));
      control.prepend(panel.querySelector('.lab-head'),guide);
    });
    ['液压连杆','丝杠升降'].forEach((name,i)=>tabs.append(button(name,()=>select(i))));
    function select(i){
      panels[i].querySelector('.c2-model-column').append(transport);
      document.dispatchEvent(new CustomEvent('mechanism:select',{detail:i===0?'boom':'screw'}));
      labs.dataset.presentation='single';
      panels.forEach((panel,n)=>{panel.hidden=n!==i;});
      [...tabs.children].forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));
      dispatchEvent(new Event('resize'));
    }
    labs.before(tabs);select(0);
  }

  let expanded=null,inerted=[],returnFocus=null,oldOverflow='';
  const viewButtons=new Map();
  function release(){
    if(!expanded)return;
    expanded.classList.remove('c2-expanded','c2-fallback');
    inerted.forEach(([el,value])=>el.inert=value);inerted=[];
    document.body.style.overflow=oldOverflow;document.body.classList.remove('c2-has-expanded');
    expanded=null;sync();returnFocus?.focus();dispatchEvent(new Event('resize'));
  }
  function sync(){viewButtons.forEach((b,target)=>{const on=expanded===target;b.textContent=on?'⤢ 恢复':'⛶ 全屏';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'恢复页面布局':'全屏观察'+target.dataset.c2Title);});}
  async function toggle(target,b){
    if(expanded){if(document.fullscreenElement)await document.exitFullscreen();else release();return;}
    expanded=target;returnFocus=b;oldOverflow=document.body.style.overflow;target.classList.add('c2-expanded');document.body.classList.add('c2-has-expanded');
    document.body.style.overflow='hidden';
    try{if(!target.requestFullscreen)throw new Error('Fullscreen unsupported');await target.requestFullscreen();}
    catch{target.classList.add('c2-fallback');}
    if(expanded!==target)return;
    for(let node=target;node&&node!==document.body;node=node.parentElement){for(const sibling of node.parentElement.children){if(sibling!==node&&!sibling.matches('script,style,link')){inerted.push([sibling,sibling.inert]);sibling.inert=true;}}}
    sync();b.focus();dispatchEvent(new Event('resize'));
  }
  document.addEventListener('fullscreenchange',()=>{if(expanded&&!document.fullscreenElement&&!expanded.classList.contains('c2-fallback'))release();});
  document.addEventListener('keydown',e=>{if(expanded?.classList.contains('c2-fallback')&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();release();}},true);

  function view(target,name,tools,play,step){
    if(!target)return;
    target.classList.add('c2-view');target.dataset.c2Title=name;
    const bar=make('div','c2-viewbar'),label=make('span','c2-view-label',name),controls=make('div','c2-view-actions');
    if(tools)controls.append(tools);
    const motion=make('div','c2-view-motion');
    if(play){const source=$(play);if(source){const proxy=button('',()=>source.click());const update=()=>{proxy.textContent=source.getAttribute('aria-label')||source.textContent.trim();proxy.disabled=source.disabled;};update();new MutationObserver(update).observe(source,{attributes:true,childList:true,subtree:true,characterData:true});motion.append(proxy);}}
    if(step){const source=$(step);if(source){const proxy=button(source.textContent.trim(),()=>source.click());const update=()=>proxy.disabled=source.disabled;update();new MutationObserver(update).observe(source,{attributes:true});motion.append(proxy);}}
    controls.append(motion);
    const full=button('⛶ 全屏',()=>toggle(target,full),'c2-fullscreen');viewButtons.set(target,full);controls.append(full);bar.append(label,controls);target.prepend(bar);
  }
  if(lab==='motor')view($('#motorPanel'),'电机结构观察',$('#motorPanel .pills'));
  if(lab==='diesel')view($('.workspace'),'柴油机结构观察',$('.view-tools'));
  if(lab==='transmission')view($('.viewport'),'动力传动 · 结构观察',$('.scene-tools'),'#playBtn','#stepBtn');
  if(lab==='mechanisms'){
    view($('#boom-lab .c2-model-column'),'液压连杆 · 结构观察',$('#boom-lab .view-buttons'),'#play','#boom-step');
    view($('#screw-lab .c2-model-column'),'丝杠升降 · 结构观察',$('#screw-lab .view-buttons'),'#play','#screw-step');
  }
  if(lab==='fourbar'){
    view($('.fb-main'),'四杆机构 · 闭合与传力',null,'#fb-play','#fb-plus');
    view($('.fb-gripper'),'夹爪 · 联动观察',null,'#fb-play','#fb-plus');
    $('#fb-fit').textContent='全景';
  }
  // Older whole-page fullscreen remains in the source for compatibility only.
  ['#fullscreenBtn','#fullBtn','#fullscreen','[data-enlarge]'].forEach(selector=>document.querySelectorAll(selector).forEach(el=>el.hidden=true));
  sync();
})();
