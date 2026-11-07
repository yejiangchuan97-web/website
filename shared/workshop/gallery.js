(() => {
 'use strict';const W=Workshop,C=W.config,$=W.$,stage=new CourseStage($('scene'));W.stage=stage;
 let selected=null,model=null,time=0,epoch=0,loading=false,visited=new Set(),selectedPart=null;
 const overview=C.mode==='overview';
 function controls(){
  const item=C.items.find(x=>x.id===selected);W.panel(item.title,item.description,overview?'章节入口':item.nature||'原创教学模型 · 几何动作示意');
  if(overview){const a=document.createElement('a');a.className='primary';a.style.cssText='padding:14px;display:block;border-radius:9px;text-align:center';a.href=courseHref(item.entry);a.textContent='进入 '+item.title+' ↗';$('controls').append(a);W.button('overview-play',stage.running?'暂停展品':'播放展品',()=>{stage.running=!stage.running;controls();});W.details('<div class="summary-box">'+C.summary+'</div>');}
  else{
   W.row([['play',stage.running?'Ⅱ 暂停动作':'▶ 播放动作',()=>{stage.running=!stage.running;$('play').textContent=stage.running?'Ⅱ 暂停动作':'▶ 播放动作';}],['step','单步观察',()=>{stage.running=false;time=Math.min(duration(),time+.25);pose();$('play').textContent='▶ 播放动作';}]]);
   W.range('timeline','动作进度（秒）',0,duration(),.05,time,v=>{stage.running=false;time=v;pose();$('play').textContent='▶ 播放动作';});
   if(model?.clips?.length>1)W.select('clip','预制动作',model.clips.map((n,i)=>[String(i),n]),'0',value=>{model.setClip(Number(value));time=0;pose();});
   W.button('reset-motion','复位动作与视角',()=>{time=0;stage.running=false;pose();stage.view('home');controls();W.feedback(item.description);});
   W.details('<div class="procedure"><h3>关键部件</h3><div class="part-list">'+(model?.parts||[]).map(p=>`<button data-focus="${p.id}">${W.esc(p.label)}</button>`).join('')+'</div><div class="summary-box">'+W.esc(item.application||item.description)+'</div>'+(item.license?`<p class="notes-link"><a href="${courseHref(item.license)}">模型许可 ↗</a></p>`:'')+'</div>');
   $('details').querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>{stage.selectPart(b.dataset.focus);stage.focus(b.dataset.focus);});
  }
  metrics();
 }
 function duration(){return model?.duration||Math.PI*2;}
 function metrics(){W.metrics([['已观察展品',`${visited.size} / ${C.items.length}`,overview?'可直接进入各任务':'各展品独立观察'],['动作状态',loading?'载入中':stage.running?'播放中':'已暂停','预制动作或几何示意'],['当前部件',selectedPart||'整机',overview?'点击展品进入课堂':'点击标记观察部件']]);}
 function pose(){model?.pose(time);stage.elapsed=time;stage.render();if($('timeline')){$('timeline').value=time;$('timeline-value').textContent=time.toFixed(2);}metrics();}
 async function select(id){
  if(loading&&id===selected)return;const item=C.items.find(x=>x.id===id);if(!item)return;selected=id;selectedPart=null;time=0;stage.running=false;const current=++epoch;loading=true;W.tabs(C.items.map(x=>({id:x.id,label:x.title})),id,select);W.panel(item.title,item.description,'正在准备模型');W.feedback('正在载入 '+item.title+'…');metrics();
  let next;
  try{next=item.robot?await CourseRobots.load(item.robot):CourseMachines.make(item.machine);}
  catch(error){if(current!==epoch)return;loading=false;W.feedback('模型加载失败：'+error.message+'。可选择其他展品或重新点击当前展品。',true);metrics();return;}
  if(current!==epoch){next.dispose();return;}
  model=next;stage.set(next);loading=false;visited.add(id);controls();pose();W.feedback(item.description);$('scene-label').textContent=item.title+' · '+(item.robot?'许可机型网格':'教学结构模型');
 }
 stage.onPart=p=>{selectedPart=p.label;W.feedback(p.description||'选择部件后，可近看结构并单步观察动作。');metrics();};stage.onTick=(dt)=>{time+=dt;if(time>duration())time=0;pose();};
 window.GalleryLab={select,step:()=>{time+=.25;pose();},state:()=>({selected,time,loading,playing:stage.running,visited:[...visited],part:selectedPart,webgl:!!stage.renderer,resources:{...stage.stats},parts:model?.parts.map(p=>p.id)||[]})};
 if(overview){window.ChapterEntry={select,state:()=>({selected,models:C.items.length})};window.CourseUI={model:select};}
 select(C.items[0].id);
})();
