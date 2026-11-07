/* Task-led learning around the shared mesh observation tools. */
(() => {
 'use strict';
 const W=Workshop,C=W.config,L=C.lesson;if(!L)return;
 const $=W.$,esc=W.esc,Models=ChapterLearning,stage=W.stage,isMachine=L.kind==='machinery';
 const key='chapter-learning-v1-'+C.id;
 let stored={};try{stored=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
 let ms=Models.machine.initial(L.cases?.[0]?.id),es=Models.experiment.initial(),drafts=stored.drafts||{},forms=stored.forms||{},savedComparison=stored.comparison||null,lastPaint=0,machineGuideKey='',caseNavKey='',experimentGuideKey='';
 if(isMachine)ms.records=stored.records||{};else es.records=stored.records||{};
 const plan=document.createElement('div');plan.className='lesson-toolbar';
 plan.innerHTML='<nav id="learning-cases" aria-label="作业任务"></nav><button id="open-records">观察记录 ↗</button>';
 document.querySelector('.heading').after(plan);
 const guide=document.createElement('section');guide.id='learning-guidance';guide.className='learning-guidance';$('side').prepend(guide);
 const recordDialog=document.createElement('dialog');recordDialog.id='record-dialog';recordDialog.setAttribute('aria-label','课堂观察记录');recordDialog.innerHTML='<button id="close-records" class="close">返回工位 ×</button>';document.body.append(recordDialog);
 const output=document.createElement('section');output.id='learning-output';output.className='learning-output';recordDialog.append(output);
 document.body.classList.add('learning-page',isMachine?'learning-machinery':'learning-feedback');
 const status=document.createElement('div');status.id='learning-status';status.className='learning-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');document.querySelector('.work-footer').prepend(status);
 const recordStatus=document.createElement('div');recordStatus.setAttribute('role','status');recordStatus.className='learning-status';output.after(recordStatus);
 const openRecords=()=>{recordDialog.showModal();};
 $('open-records').onclick=openRecords;$('close-records').onclick=()=>recordDialog.close();
 document.addEventListener('click',e=>{if(e.target.closest('a[href="#learning-output"]')){e.preventDefault();openRecords();}});
 // One fitted 1600 × 900 classroom, with records in a native accessible dialog.
 const frame=document.createElement('div');frame.id='lesson-frame';document.body.prepend(frame);frame.append(document.querySelector('.course-nav'),document.querySelector('.workshop'));
 function fitFrame(){const compact=innerWidth<800;document.body.classList.toggle('compact-lesson',compact);const scale=compact?1:Math.min(innerWidth/1600,innerHeight/900);frame.style.setProperty('--lesson-scale',scale);frame.style.width=compact?'100%':'1600px';frame.style.height=compact?'100dvh':'900px';stage.resize();}
 addEventListener('resize',fitFrame);fitFrame();
 function say(text,error=false){status.textContent=text;status.classList.toggle('error',error);recordStatus.textContent=text;recordStatus.classList.toggle('error',error);}
 function persist(){try{localStorage.setItem(key,JSON.stringify({drafts,forms,records:isMachine?ms.records:es.records,comparison:savedComparison}));}catch{}}
 function row(){return C.items.find(x=>x.id===GalleryLab.state().selected);}
 function task(){return L.cases.find(x=>x.id===ms.caseId);}
 function currentObservation(acted=false){const s=GalleryLab.state();return{part:s.part,readings:s.readings,acted};}
 function bindInput(id,get,set){const el=$(id);el.value=get()||'';el.oninput=()=>{set(el.value);persist();};}
 function machineChain(){const t=task(),r=row();return`${t.object} → ${r?.title||'待选设备'} → ${ms.part===t.part?t.partLabel:'待定位工作装置'} → ${ms.motion?ms.motion.label+'发生变化':'待观察动作'} → ${t.action}`;}
 function chooseCase(id){if(!L.cases.some(x=>x.id===id))return;ms=Models.machine.changeCase(ms,id);const s=GalleryLab.state();ms=Models.machine.select(ms,s.selected,s.readings);renderMachine(true);say('已切换作业。先按用途选择设备，原有记录仍可在“观察记录”中复查。');}
 function renderMachine(full=false){
  const t=task(),s=GalleryLab.state(),matched=s.selected===t.device,part=matched&&ms.part===t.part,moved=matched&&!!ms.motion;
  const navKey=ms.caseId+'|'+Object.keys(ms.records).join(',');if(full||navKey!==caseNavKey){caseNavKey=navKey;
  $('learning-cases').innerHTML=L.cases.map((c,i)=>`<button data-case="${c.id}" aria-pressed="${c.id===ms.caseId}"><small>${i===4?'迁移':String(i+1).padStart(2,'0')}</small>${esc(c.title)}${ms.records[c.id]?'<span aria-label="已留存观察记录">· 已记录</span>':''}</button>`).join('');
  $('learning-cases').querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>chooseCase(b.dataset.case));}
  const guideKey=[ms.caseId,s.selected,part,moved].join('|');if(full||guideKey!==machineGuideKey){machineGuideKey=guideKey;guide.innerHTML=`<span class="learning-kicker">当前作业 · ${esc(t.title)}</span><h3>${esc(t.action)}</h3><p>${esc(t.brief)}</p><div class="learning-evidence"><span class="${part?'observed':''}">${part?'✓':'○'} 定位工作装置</span><span class="${moved?'observed':''}">${moved?'✓':'○'} 动作变化证据</span></div><p class="learning-coach">${esc(matched?t.hint:t.contrast)}</p><a href="#learning-output">填写用途说明 ↗</a>`;}
  if(full){
   const d=drafts[ms.caseId]||(drafts[ms.caseId]={reason:'',limit:''});
   output.innerHTML='<div class="output-title"><div><span class="learning-kicker">课堂成果 · 机械用途记录</span><h2>把选择依据讲清楚</h2></div><div class="output-actions"><button id="lesson-export">导出观察记录</button><button id="lesson-reset">重做本课</button></div></div><p id="machine-chain" class="observed-chain"></p><p id="machine-motion" class="motion-evidence"></p><div class="learning-writing"><label>装置怎样完成这项作业？<textarea id="machine-reason" rows="3" placeholder="结合刚才定位的工作装置和动作，说明为什么主要用途相符。"></textarea></label><label>投入实机使用前，还要核对什么？<textarea id="machine-limit" rows="3" placeholder="用途相符仍不等于具体设备可用。写出本场景需要核对的型号、条件或资格。"></textarea></label></div><div class="save-row"><button id="lesson-save" class="primary">保存本项用途说明</button><span id="machine-readiness"></span></div><div id="machine-records"></div>';
   bindInput('machine-reason',()=>d.reason,v=>d.reason=v);bindInput('machine-limit',()=>d.limit,v=>d.limit=v);
   $('lesson-save').onclick=()=>{const result=Models.machine.save(ms,t,d);if(result.error){say(result.error,true);return;}ms=result.state;persist();renderMachine();say('已保存装置与动作证据。你的用途依据和使用条件说明，留待师生复核。');};
   $('lesson-export').onclick=exportRecords;$('lesson-reset').onclick=resetLesson;
  }
  if($('machine-chain'))$('machine-chain').textContent=machineChain();
  if($('machine-motion'))$('machine-motion').textContent=ms.motion?`${ms.motion.label}：${ms.motion.before.toFixed(2)} → ${ms.motion.after.toFixed(2)} ${ms.motion.unit}。这是当前模型中的动作观察，不是实机范围。`:'当前尚无与本项作业对应的动作变化证据。';
  if($('machine-readiness'))$('machine-readiness').textContent=Models.machine.ready(ms,t)?'观察证据已齐，可以补充自己的说明。':'先完成装置定位与一次相关动作变化。';
  if($('machine-records'))$('machine-records').innerHTML=`<h3>已留存 ${Object.keys(ms.records).length} 份用途记录</h3><div class="record-grid">${Object.values(ms.records).map(r=>`<article><h4>${esc(r.task)}</h4><p>${esc(C.items.find(x=>x.id===r.device)?.title||r.device)} · ${esc(r.family)}</p><p>${esc(r.reason)}</p><p class="record-limit">仍需核对：${esc(r.limit)}</p><small>${esc(r.review)}</small></article>`).join('')||'<p class="empty-record">记录会保留具体装置、动作前后值和你的解释；切换设备或只播放模型不会直接生成记录。</p>'}</div>`;
  // Focus the operation without removing the complete observation tools.
  document.querySelectorAll('.joint-control').forEach(label=>{const input=label.querySelector('input');label.hidden=matched&&input.id!=='joint-'+t.control;});
 }
 const modeNames={manual:'人持续控制',program:'按预设程序',feedback:'依据距离反馈'};
 const statusNames={ready:'等待任务指令','manual-control':'等待人逐步控制',running:'执行预设路径','uncompared-input':'距离变化，程序仍在执行','human-observes':'距离变化，等待人判断','human-paused':'由人下达暂停','feedback-paused':'反馈触发装置暂停','disturbance-before-start':'先开始作业，再做扰动对照','waiting-human-confirmation':'条件已恢复，等待人工确认','ready-to-restart':'已确认，等待单独启动','needs-recovery':'请先恢复条件并人工确认','path-ended':'本段路径结束'};
 const experimentReadout=document.createElement('div');experimentReadout.id='experiment-readout';experimentReadout.className='experiment-readout';experimentReadout.innerHTML='<div><small>感知输入 · 模型距离</small><strong id="exp-distance"></strong></div><div><small>与目标 1.00 比较</small><strong id="exp-error"></strong></div><div><small>执行状态</small><strong id="exp-state"></strong></div>';
 if(!isMachine)document.querySelector('.hero-playback').before(experimentReadout);
 function isExperiment(){return!isMachine&&GalleryLab.state().selected==='feedback-rig';}
 function action(a){
  if(!isExperiment())return;
  es=Models.experiment.reduce(es,a);stage.running=false;GalleryLab.refresh({experiment:es});persist();renderExperiment();
  if(a.type!=='advance')say(statusNames[es.status]||'状态已更新',es.status==='needs-recovery'||es.status==='disturbance-before-start');
 }
 function experimentCoach(){
  if(es.mode==='manual')return'先开始，用“向前一步”移动喷头，再让墙面移远；观察距离提示，由你决定何时停止。距离信息供人判断。';
  if(es.mode==='program')return'先启动路径，再注入与前一次相同的墙面变化；若未自动改变动作，用“推进一拍”留下继续运动的证据。';
  return'启动后注入相同变化，观察程序是否自行暂停。随后恢复墙面、人工确认，再单独启动；核对三个动作的作用。';
 }
 function renderExperiment(){
  document.body.classList.toggle('is-experiment',isExperiment());$('timeline-value').toggleAttribute('data-readout',!isExperiment());$('exp-state').toggleAttribute('data-readout',isExperiment());
  if(!isExperiment()){renderFormGuide();renderComparison();return;}
  $('scene-label').textContent='同题控制试验 · '+modeNames[es.mode];$('scene-caption').textContent='选择编号，观察感知、控制和执行部件';
  $('learning-cases').innerHTML='<span class="lesson-route">① 同题试验 → ② 留下对照证据 → ③ 形态迁移与人机分工</span>';
  if(experimentGuideKey!==es.mode){experimentGuideKey=es.mode;guide.innerHTML=`<span class="learning-kicker">同一任务 · 同一墙面变化</span><h3>追踪距离信息怎样改变动作</h3><div class="control-mode">${Object.entries(modeNames).map(([id,label])=>`<button data-control-mode="${id}" aria-pressed="${id===es.mode}">${label}</button>`).join('')}</div><p class="learning-coach">${experimentCoach()}</p><div class="trial-buttons"><button id="trial-start" class="primary">开始 / 重新启动</button><button id="trial-stop">由人停止</button><button id="trial-jog" ${es.mode!=='manual'?'hidden':''}>向前一步</button><button id="trial-step" ${es.mode==='manual'?'hidden':''}>推进一拍（0.5 s）</button><button id="trial-disturb">墙面移远：距离变为 1.35</button><button id="trial-restore">恢复墙面到 1.00</button><button id="trial-ack">人工确认恢复条件</button><button id="trial-reset">重放当前对照</button></div><p class="trial-position">当前轨迹位置 <b id="exp-position">${es.position.toFixed(2)}</b> / 1.00</p><p class="model-caption">1.00 ± 0.10 是本试验的模型设置，不是现场喷涂距离或安全阈值。色块仅显示路径走过的位置，不表示涂层质量。</p>`;
  guide.querySelectorAll('[data-control-mode]').forEach(b=>b.onclick=()=>action({type:'mode',mode:b.dataset.controlMode}));
  const actions={'trial-start':'start','trial-stop':'stop','trial-jog':'jog','trial-step':'advance','trial-disturb':'disturb','trial-restore':'restore','trial-ack':'acknowledge','trial-reset':'reset-trial'};
  for(const[id,type]of Object.entries(actions))$(id).onclick=()=>action({type,dt:.5});}
  $('exp-position').textContent=es.position.toFixed(2);
  $('exp-distance').textContent=es.distance.toFixed(2);$('exp-error').textContent=(es.distance-1>=0?'+':'')+(es.distance-1).toFixed(2);$('exp-state').textContent=statusNames[es.status]||es.status;
  renderComparison();
 }
 function makeFeedbackOutput(){
  const d=drafts.comparison||(drafts.comparison={reason:'',human:''});
  output.innerHTML='<div class="output-title"><div><span class="learning-kicker">课堂成果 · 控制方式对照</span><h2>依据变化判断反馈，而不是依据外形</h2></div><div class="output-actions"><button id="lesson-export">导出观察记录</button><button id="lesson-reset">重做本课</button></div></div><div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>控制方式</th><th>相同的距离变化</th><th>动作发生了什么</th><th>判断与处理在谁</th></tr></thead><tbody id="comparison-rows"></tbody></table></div><p id="recovery-evidence"></p><div class="learning-writing"><label>哪一条证据说明信息进入了动作判断？<textarea id="comparison-reason" rows="3" placeholder="写出状态从哪里取得、送给谁、与什么要求比较，以及怎样改变动作。人根据画面调节，也可以形成包含人的反馈。"></textarea></label><label>设备暂停后，人还要负责什么？<textarea id="comparison-human" rows="3" placeholder="结合恢复墙面、人工确认、单独启动三个动作，说明自动暂停的边界。"></textarea></label></div><div class="save-row"><button id="comparison-save" class="primary">保存对照与分工说明</button><span id="comparison-readiness"></span></div><p id="comparison-saved"></p><section class="form-output"><h3>迁移：结构适配，不等于自主能力</h3><p>返回工位选择一种机器人形态，定位一个部件，用具体作业说明它可能解决什么，以及还缺什么证据。</p><div class="learning-writing"><label>具体作业与结构依据<textarea id="form-reason" rows="3" placeholder="例如在一个具体场景中，需要哪种移动或工具到达能力；你刚才观察到的哪个部件支持这一点？"></textarea></label><label>仍需核对的能力与条件<textarea id="form-limit" rows="3" placeholder="说明还需要哪些工具、感知、控制、工艺或实机资料。当前外形与预制动作证明不了什么？"></textarea></label></div><button id="form-save">保存当前形态观察</button><div id="form-records"></div></section>';
  bindInput('comparison-reason',()=>d.reason,v=>d.reason=v);bindInput('comparison-human',()=>d.human,v=>d.human=v);
  $('comparison-save').onclick=()=>{const result=Models.experiment.save(es,d);if(result.error){say(result.error,true);return;}savedComparison=result.record;persist();renderComparison();say('已保存同一扰动下的控制证据。闭环解释与人的职责说明留待师生复核。');};
  $('form-save').onclick=saveForm;$('lesson-export').onclick=exportRecords;$('lesson-reset').onclick=resetLesson;
  bindFormDraft();
 }
 function renderComparison(){
  if(!$('comparison-rows'))return;
  const r=es.records;
  $('comparison-rows').innerHTML=Object.entries(modeNames).map(([id,label])=>{const x=r[id];return`<tr><th>${label}</th><td>${x?'1.00 → '+x.disturbance.toFixed(2):'尚无同题扰动记录'}</td><td>${x?`${esc(x.response)}<small>轨迹 ${x.before.toFixed(2)} → ${x.after.toFixed(2)}</small>`:'在试验台实际执行并注入变化'}</td><td>${id==='manual'?'人观察并持续控制；装置未自行判断':id==='program'?'只执行路径；距离未进入动作判断':'控制器按模型要求比较并暂停；人处理原因'}</td></tr>`;}).join('');
  const f=r.feedback;$('recovery-evidence').textContent=`反馈暂停后的操作证据：${f?.restored?'✓':'○'} 条件恢复　${f?.acknowledged?'✓':'○'} 人工确认　${f?.restarted?'✓':'○'} 单独启动。确认本身不会重新启动。`;
  $('comparison-readiness').textContent=Models.experiment.complete(es)?'三种对照与恢复证据已齐，可写出自己的解释。':'继续完成三种对照及反馈暂停后的恢复。';
  $('comparison-saved').textContent=savedComparison?'已留存一份对照说明；解释待师生复核。':'';
  $('form-records').innerHTML=Object.entries(forms).map(([id,r])=>`<article><h4>${esc(C.items.find(x=>x.id===id)?.title||id)}</h4><p>${esc(r.reason)}</p><p>还需核对：${esc(r.limit)}</p><small>观察部件：${esc(r.part)} · 适配判断待师生复核</small></article>`).join('');
 }
 function bindFormDraft(){if(!$('form-reason'))return;const id=GalleryLab.state().selected,d=drafts[id]||(drafts[id]={reason:'',limit:''});bindInput('form-reason',()=>d.reason,v=>d.reason=v);bindInput('form-limit',()=>d.limit,v=>d.limit=v);}
 function renderFormGuide(){experimentGuideKey='';$('scene-caption').textContent='拖动旋转 · 选择部件 · 用结构证据说明作业适配';const r=row();guide.innerHTML=`<span class="learning-kicker">形态迁移 · ${esc(r?.title||'')}</span><h3>先提作业要求，再看结构</h3><p>${esc(L.formPrompt)}</p><a href="#learning-output">记录结构依据和能力缺口 ↗</a><button id="back-to-experiment">回到同题反馈试验</button><p class="model-caption">模型动作属于预制演示；试验台的反馈逻辑不代表该设备的真实控制器。</p>`;$('back-to-experiment').onclick=()=>GalleryLab.select('feedback-rig');bindFormDraft();}
 function saveForm(){const s=GalleryLab.state(),d=drafts[s.selected]||{};if(isExperiment()){say('先选一种机器人形态并定位部件，再形成结构适配说明。',true);return;}if(!s.part){say('先在模型或部件索引中指出一个部件，用它支持你的结构依据。',true);return;}if(String(d.reason||'').trim().length<18||String(d.limit||'').trim().length<8){say('请把具体作业、结构依据和能力证据缺口写完整。',true);return;}forms[s.selected]={reason:d.reason.trim(),limit:d.limit.trim(),part:GalleryLab.model().parts.find(p=>p.id===s.part)?.label||s.part};persist();renderComparison();say('已保存形态观察。结构适配意见和能力边界待师生复核。');}
 function resetLesson(){if(isMachine){ms=Models.machine.initial(L.cases[0].id);drafts={};ms=Models.machine.select(ms,GalleryLab.state().selected,GalleryLab.state().readings);renderMachine(true);}else{es=Models.experiment.initial();forms={};drafts={};savedComparison=null;makeFeedbackOutput();if(isExperiment()){GalleryLab.refresh({experiment:es});renderExperiment();}else GalleryLab.select('feedback-rig');}persist();say('已清空本课观察记录，可以重新开展操作与比较。');}
 function exportRecords(){const payload=isMachine?{task:C.title,records:ms.records}:{task:C.title,comparison:savedComparison,experiment:es.records,formObservations:forms};const text=JSON.stringify(payload,null,2),url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=C.id+'-课堂观察记录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('已导出本机观察记录，保留模型证据与待复核的文字说明。');}
 document.addEventListener('gallery:select',e=>{if(isMachine){ms=Models.machine.select(ms,e.detail.selected,e.detail.readings);renderMachine();}else{if(isExperiment()){stage.running=false;GalleryLab.refresh({experiment:es});}else if(es.running){es={...es,running:false,status:es.latched?'feedback-paused':'human-paused'};persist();}renderExperiment();}});
 document.addEventListener('gallery:action',e=>{if(isMachine&&['play','time','step','manual','part'].includes(e.detail.type)){ms=Models.machine.observe(ms,task(),currentObservation(e.detail.type!=='part'));renderMachine();}});
 document.addEventListener('gallery:pose',e=>{if(!isMachine)return;ms=Models.machine.observe(ms,task(),{...e.detail,acted:false});if(performance.now()-lastPaint>140){renderMachine();lastPaint=performance.now();}});
 if(!isMachine){const original=stage.onFrame;stage.onFrame=dt=>{original?.(dt);if(!isExperiment()||!es.running||es.mode==='manual')return;es=Models.experiment.reduce(es,{type:'advance',dt});GalleryLab.refresh({experiment:es});if(performance.now()-lastPaint>140||!es.running){renderExperiment();persist();lastPaint=performance.now();}};}
 window.LessonLab={isExperiment,action,chooseCase,reset:resetLesson,state:()=>isMachine?{kind:L.kind,...ms,ready:Models.machine.ready(ms,task())}:{kind:L.kind,...es,complete:Models.experiment.complete(es),savedComparison,forms},export:exportRecords};
 if(isMachine){$('scene-caption').textContent='定位工作装置 → 观察动作 → 记录用途依据';ms=Models.machine.select(ms,GalleryLab.state().selected,GalleryLab.state().readings);renderMachine(true);}else{makeFeedbackOutput();GalleryLab.refresh({experiment:es});renderExperiment();}
})();
