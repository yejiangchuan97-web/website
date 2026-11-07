/* Shared chapter-one exhibition: fitted layout and learning guide. (Stage fullscreen is provided by shared/lab-shell.) */
(() => {
 'use strict';
 const W=Workshop,$=W.$,frame=document.createElement('div');
 frame.id='gallery-frame';
 document.body.classList.add('gallery-page');document.body.prepend(frame);
 frame.append(document.querySelector('.course-nav'),document.querySelector('.workshop'));
 frame.style.setProperty('--exhibit-count',W.config.items.length);
 const panel=frame.querySelector('.viewport-panel');
 panel.id='exhibit-viewport';
 const status=document.createElement('span');
 status.className='sr-only';status.setAttribute('role','status');panel.append(status);

 function fit(){
  const compact=innerWidth<800;
  document.body.classList.toggle('compact-gallery',compact);
  frame.style.setProperty('--gallery-scale',compact?1:Math.min(innerWidth/1600,innerHeight/900));
  frame.style.width=compact?'100%':'1600px';frame.style.height=compact?'100dvh':'900px';
  W.stage.resize();
 }

 const guide=W.config.learningGuide;
 if(guide){
  const button=document.createElement('button');button.id='learning-guide';button.textContent='学习引导';
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','learning-guide-dialog');
  $('help').before(button);
  const dialog=document.createElement('dialog');dialog.id='learning-guide-dialog';dialog.className='learning-guide-dialog';
  dialog.setAttribute('aria-labelledby','learning-guide-title');
  const esc=W.esc;
  dialog.innerHTML=`<div class="guide-heading"><div><p class="guide-kicker">${esc(W.config.id)} · 学习引导</p><h2 id="learning-guide-title">${esc(guide.title)}</h2></div><button id="learning-guide-close" aria-label="关闭学习引导" autofocus>关闭</button></div><p class="guide-intro">${esc(guide.intro)}</p><section aria-labelledby="guide-goals-title"><h3 id="guide-goals-title">这一节学什么</h3><ul class="guide-goals">${guide.goals.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section aria-labelledby="guide-steps-title"><h3 id="guide-steps-title">在展厅里这样观察</h3><ol class="guide-steps">${guide.steps.map((x,i)=>`<li><span class="guide-number">0${i+1}</span><div><h4>${esc(x.title)}</h4><p>${esc(x.text)}</p></div></li>`).join('')}</ol></section><div class="guide-reflection"><h3>观察后，试着说清楚</h3><p>${esc(guide.reflection)}</p></div><div class="guide-footer"><span>${esc(guide.note)}</span><button id="learning-guide-start" class="primary">开始观察 ↗</button></div>`;
  document.body.append(dialog);
  let start=false;
  button.onclick=()=>{start=false;W.stage.running=false;W.stage.tour=false;W.stage.onPause?.();dialog.showModal();};
  $('learning-guide-close').onclick=()=>dialog.close();
  $('learning-guide-start').onclick=()=>{start=true;dialog.close();};
  dialog.addEventListener('close',()=>{(start?$('scene'):button).focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
 }
 addEventListener('resize',fit);fit();
})();
