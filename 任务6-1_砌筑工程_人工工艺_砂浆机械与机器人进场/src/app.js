(() => {
 'use strict';
 const $=id=>document.getElementById(id),text=(id,value)=>{$(id).textContent=value;};
 const state={tab:'manual',issue:'joints',issueAmount:0,t:0,playing:false,platform:'fixed',fault:false,corrected:false,dark:document.documentElement.dataset.theme==='dark',speed:.8,visible:true};
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let manual,scene,last=0,frame=0;
 const PHASE_NOTES=[
  '供料台支承砖，夹具从上方接近。砖尺寸、姿态和取料点先确认。',
  '两侧夹爪闭合，先夹紧再起吊。夹具与砖型、质量必须适配。',
  '沿竖向提升，离开供料托盘。高度足够之后才能跨越墙体。',
  '夹具绕竖轴转90°，把顺砖朝向变成丁砖朝向。位置正确还不够，姿态也要正确。',
  '在墙顶上方搬运。X、Y共同决定平面位置，不能抄近路穿过已砌墙体。',
  '接近目标后缓慢下降到预铺灰床。灰缝几何、材料状态与接触都影响结果。',
  '砖已经由墙和灰床支承，夹爪才张开。砖留在原位，工具准备退出。',
  '工具上退后复测位置。发现偏差要回到基准或工艺环节处理；几何通过还需要人工质量复核。'
 ];
 const CONTENT={manual:{title:'砖怎样摆，才是一面墙？',subtitle:'转一转砖，拼一皮墙，再让上下皮接缝错开。',eye:'MASONRY / LEARN BY BUILDING',panel:'人工砌筑挑战',tag:'人工砌筑试排台',takeaway:'先看方向，再看联系。',a:['顺丁是朝向','砖长边顺着墙长是顺砖，垂直墙长是丁砖。'],b:['平侧是放置面','平砌与侧砌改变砖的底面，不能把丁砖理解为立起来的砖。'],c:['组砌要有联系','既看上下皮错缝，也看墙厚方向拉结。先试排，再铺灰。']},
 issues:{title:'人工砌筑，难在哪里？',subtitle:'移动一个参数，看小偏差如何变成一面墙的问题。',eye:'CRAFT / FIND THE DIFFICULTY',panel:'把问题放大看',tag:'直墙中部观察窗口',takeaway:'重复动作，也要持续判断。',a:['体力与节拍','搬砖、铺灰、放砖反复进行。搅拌与运输机械先减轻备料负担。'],b:['基准与材料','砖型、皮数、灰缝和控制线共同约束位置。只看坐标不够。'],c:['节点与复核','洞口、转角和收口更复杂，需要工艺安排与现场判断。']},
 robot:{title:'外形不同，砌砖的核心相同。',subtitle:'观察同一块砖的位移、转向与释放，再用偏差实验理解反馈。',eye:'ROBOTICS / POSITION · ORIENTATION · FEEDBACK',panel:'机器人共性原理',tag:'XYZ + 旋转夹具 · 教学机构',takeaway:'目标、动作、反馈要连起来。',a:['位置 + 姿态','目标不只是落点。顺丁朝向、放置高度和工具接近方向都要确定。'],b:['材料 + 执行','供砖、结合材料与取放相互配合。力控、视觉等是不同设备的实现选择。'],c:['测量 + 人工','移动后重新定位；落砖后复测。材料、节点和成墙质量仍需人工检查。']}};
 try{if(new URLSearchParams(location.search).has('fallback'))throw new Error('requested fallback');scene=new MasonryScene($('stage'),{onPick:id=>manual?.selectSlot(id)});}catch(error){$('stage').replaceChildren();scene=new AnatomyFallback($('stage'),{onPick:id=>manual?.selectSlot(id)});$('fallbackNotice').hidden=false;state.fallback=true;}
 function metrics(labels,values){labels.forEach((s,i)=>text('metricLabel'+i,s));values.forEach((s,i)=>text('metric'+i,s));}
 function renderManual(s){if(state.tab!=='manual')return;scene.setManual(s);text('title',s.title||CONTENT.manual.title);text('subtitle',s.caption||CONTENT.manual.subtitle);text('sceneTag',s.lesson===0?'砖样与墙长基准':'人工砌筑试排台 · '+(s.width===365?'一砖半墙':'24墙'));
  if(s.lesson===0){const b=s.bricks[0];metrics(['当前摆放','砖高','学习进度'],[ManualModel.ORIENTATIONS[s.orientation].name,b.h+' mm',`${s.progress} / 3 关完成`]);text('liveReadout',`沿墙长 ${b.w} · 沿墙厚 ${b.d} · 高 ${b.h} mm`);}
  else if(s.lesson===1){metrics(['目标墙厚','已放砖块','学习进度'],[s.width+' mm',s.placedCount+' / '+s.check.total,`${s.progress} / 3 关完成`]);text('liveReadout',s.width===365?'240 + 10 + 115 = 365 mm':'一砖长 = 240 mm');}
  else{metrics(['墙厚','上皮偏移','学习进度'],[s.width+' mm',s.offset+' mm',`${s.progress} / 3 关完成`]);text('liveReadout',`灰缝示例 ${s.mortar} mm · ${s.inspection.throughCount?'仍有通缝':'接缝已错开'}`);}
 }
 manual=new ManualGame($('manualControls'),{onChange:renderManual});
 function renderIssue(){const info=IssuesModel.ISSUES[state.issue],data=IssuesModel.issueScene(state.issue,state.issueAmount);scene.setManual(data);text('issueSliderLabel',info.slider);Object.assign($('issueAmount'),{min:info.min,max:info.max,step:info.step,value:state.issueAmount});text('issueAmountValue',state.issueAmount+' mm');text('issueHint',info.hint);text('issueTitle',info.title);text('issueText',info.text);text('robotHelpTitle',info.robot);text('robotHelpText',info.help);text('humanStill',info.human);document.querySelectorAll('[data-issue]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.issue===state.issue));
  const good=state.issue==='joints'?state.issueAmount>=10:state.issueAmount===0;
  metrics([state.issue==='mortar'?'顶部累计差':'当前示例值','观察结果','机器人切入点'],[data.metric+' mm',good?(state.issue==='joints'&&state.issueAmount!==62.5?'通缝消除，搭接待复核':'已修正几何关系'):state.issue==='joints'?'竖缝贯通':'存在偏差',state.issue==='joints'?'排砖规划':state.issue==='mortar'?'材料与标高':'共同基准']);text('liveReadout',state.issue==='mortar'?`三道灰缝 × ${state.issueAmount} = ${data.metric} mm`:`${info.slider} ${state.issueAmount} mm`);
 }
 function robotState(){return RobotModel.robotAt(state.t,{platform:state.platform,fault:state.fault?'offset':false,corrected:state.corrected});}
 function renderRobot(){const r=robotState();scene.updateRobot(r);$('timeline').value=state.t;text('timeValue',Math.round(state.t/8*100)+'%');text('phaseTitle',`${r.index+1}. ${r.phase}`);text('phaseText',PHASE_NOTES[r.index]);document.querySelectorAll('[data-phase]').forEach(b=>b.setAttribute('aria-pressed',+b.dataset.phase===r.index));
  metrics(['当前工序','砖底高度','夹持 / 反馈'],[r.phase,Math.round(r.brick.z)+' mm',r.measured?(r.error?'偏差 '+r.error+' mm':'几何复测完成'):r.brick.held?'随夹具运动':r.brick.placed?'已支承并松夹':'由托盘支承']);
  text('liveReadout',`转向 ${Math.round(r.brick.yaw*180/Math.PI)}° · ${r.measured?'位置偏差 '+r.error+' mm':'位置与姿态同步'}`);
  text('play',state.playing?'Ⅱ 暂停':'▶ '+(state.t>=8?'重新演示':'开始演示'));
  const msg=state.corrected?'已重新测量基准，下一次取放使用修正目标。'+(r.measured?'本次示例偏差为0 mm，继续人工质量复核。':'重新观察整段动作。'):state.fault?(r.measured?'复测发现18 mm示例偏差。动作重复不代表放置正确；重新测量基准后再取放。':'已设置18 mm站位偏差。完整播放到复测阶段，观察计划位置与实际结果。'):'先建立共同基准，才知道砖该落在哪里。'+(r.measured?'本次几何示例复测完成。':'');
  if($('robotFeedback').textContent!==msg)text('robotFeedback',msg);
 }
 function pause(){state.playing=false;cancelAnimationFrame(frame);frame=0;last=0;if(state.tab==='robot')text('play','▶ '+(state.t>=8?'重新演示':'开始演示'));}
 function tick(now){frame=0;if(!state.playing||!state.visible||document.hidden||state.tab!=='robot')return;const dt=last?Math.min(.08,(now-last)/1000):0;last=now;state.t=Math.min(8,state.t+dt*state.speed);renderRobot();if(state.t>=8){pause();return;}frame=requestAnimationFrame(tick);}
 function play(){if(motion.matches){pause();state.t=state.t>=8?0:Math.min(8,Math.floor(state.t)+1);renderRobot();return;}if(state.playing){pause();return;}if(state.t>=8)state.t=0;state.playing=true;last=0;renderRobot();frame=requestAnimationFrame(tick);}
 function setTab(tab){pause();state.tab=tab;const c=CONTENT[tab];document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));document.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab);for(const [id,v] of [['title',c.title],['subtitle',c.subtitle],['eyebrow',c.eye],['panelTitle',c.panel],['sceneTag',c.tag],['takeawayTitle',c.takeaway]])text(id,v);['A','B','C'].forEach((v,i)=>{const pair=c[['a','b','c'][i]];text('takeaway'+v,pair[0]);text('takeaway'+v+'Text',pair[1]);});text('figureNumber','FIG. 0'+(['manual','issues','robot'].indexOf(tab)+1));text('nextSection',tab==='manual'?'发现人工难点 →':tab==='issues'?'进入机器人工作站 →':'回到人工砌筑 →');scene.setMode(tab);scene.setExplode(0);$('explode').value=0;text('explodeValue','0%');document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view==='iso'));
  if(tab==='manual')renderManual(manual.getState());else if(tab==='issues')renderIssue();else renderRobot();scene.resize();document.querySelector('.control-panel')?.scrollTo(0,0);
 }
 // Keep DOM actions explicit so every step is reachable with mouse, touch or keyboard.
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{scene.setView(b.dataset.view);document.querySelectorAll('[data-view]').forEach(q=>q.setAttribute('aria-pressed',q===b));}));
 $('zoomIn').onclick=()=>scene.zoomBy(1.15);$('zoomOut').onclick=()=>scene.zoomBy(1/1.15);$('home').onclick=()=>scene.resetView();
 $('phaseList').innerHTML=RobotModel.PHASES.map((p,i)=>`<button data-phase="${i}" aria-pressed="${i===0}">${i+1} ${['接近','夹紧','提升','转向','搬运','落砖','松夹','复测'][i]}</button>`).join('');
 document.querySelectorAll('[data-phase]').forEach(b=>b.onclick=()=>{pause();state.t=+b.dataset.phase+.5;renderRobot();});
 $('play').onclick=play;$('step').onclick=()=>{pause();state.t=Math.min(8,Math.floor(state.t)+1);renderRobot();};$('timeline').oninput=e=>{pause();state.t=+e.target.value;renderRobot();};$('speed').onchange=e=>state.speed=+e.target.value;
 document.querySelectorAll('[data-platform]').forEach(b=>b.onclick=()=>{pause();state.platform=b.dataset.platform;state.corrected=false;state.t=0;scene.setPlatform(state.platform);text('platformNote',state.platform==='mobile'?'移动到新工位后，先稳定支承，再重新测量设备与墙体的相对位置。换站定位不等于自动省略。':'固定架先安装找正，取料点与墙体目标都在同一基准中表达。');document.querySelectorAll('[data-platform]').forEach(q=>q.setAttribute('aria-pressed',q===b));renderRobot();});
 $('datumFault').onchange=e=>{pause();state.fault=e.target.checked;state.corrected=false;state.t=0;renderRobot();};$('calibrate').onclick=()=>{pause();state.corrected=true;state.t=0;renderRobot();};
 $('explode').oninput=e=>{pause();scene.setExplode(+e.target.value);text('explodeValue',Math.round(+e.target.value*100)+'%');};
 document.querySelectorAll('[data-issue]').forEach(b=>b.onclick=()=>{state.issue=b.dataset.issue;state.issueAmount=IssuesModel.ISSUES[state.issue].start;renderIssue();});$('issueAmount').oninput=e=>{state.issueAmount=+e.target.value;renderIssue();};$('fixIssue').onclick=()=>{state.issueAmount=IssuesModel.ISSUES[state.issue].fix;renderIssue();};
 $('issuesToRobot').onclick=()=>setTab('robot');$('nextSection').onclick=()=>setTab(state.tab==='manual'?'issues':state.tab==='issues'?'robot':'manual');
 $('reset').onclick=()=>{pause();scene.resetView();if(state.tab==='manual')manual.reset();else if(state.tab==='issues'){state.issueAmount=IssuesModel.ISSUES[state.issue].start;renderIssue();}else{state.t=0;state.fault=false;state.corrected=false;$('datumFault').checked=false;scene.setExplode(0);$('explode').value=0;text('explodeValue','0%');renderRobot();}};
 function setTheme(dark){state.dark=dark;document.documentElement.dataset.theme=dark?'dark':'light';document.body.dataset.theme=dark?'dark':'light';text('theme',dark?'◑ 浅色':'◐ 深色');scene.setTheme(dark);}
 $('theme').onclick=()=>setTheme(!state.dark);$('help').onclick=()=>{$('helpDialog').showModal();pause();};$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();scene.resize();}catch{ text('fullscreen','当前窗口不支持全屏');}};
 $('stage').addEventListener('keydown',e=>{if(e.code==='Space'&&state.tab==='robot'){e.preventDefault();play();}});
 new IntersectionObserver(entries=>{state.visible=entries.at(-1).isIntersecting;if(!state.visible){cancelAnimationFrame(frame);frame=0;last=0;}else if(state.playing&&!frame)frame=requestAnimationFrame(tick);}).observe($('stage'));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else if(state.playing&&state.visible&&!frame)frame=requestAnimationFrame(tick);});motion.addEventListener('change',()=>{if(motion.matches)pause();});
 window.masonryLab={snapshot:()=>({...state,manual:manual.getState(),robot:robotState(),scene:scene.snapshot()}),setTab,scene,game:manual,seek(t){pause();state.t=Math.max(0,Math.min(8,t));if(state.tab!=='robot')setTab('robot');renderRobot();},pause};
 setTheme(state.dark);setTab('manual');if(state.fallback)text('gestureHint','点视角切换投影 · 使用右侧按钮与时间轴操作');document.body.dataset.ready='true';
})();
