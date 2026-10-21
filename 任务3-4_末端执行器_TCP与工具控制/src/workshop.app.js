(function(){
  'use strict';
  const M=RobotModel,TM=ToolModel,W=WorkshopModel,ids=Object.keys(TM.tools),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const S={tool:'nozzle',tab:'tools',parameterTool:'nozzle',parameter:TM.flangeOffset('nozzle'),q:M.home.slice(),active:false,contact:false,confirmed:true,time:0,reduced:reduced.matches,swapLift:0,pivot:'tcp',angle:0,angleTarget:0,playing:false,pose:0,adjust:[0,0,0],samples:[],result:null,validation:null,assists:0,challenge:'idle',answer:null,done:[],explored:['nozzle'],pivotSeen:[]};
  let cal=TM.calibrationPoses(S.tool);S.pin=cal.pin;
  const view=new WorkshopView($('#viewport'));
  let frameId=0,last=0,visible=true,dirty=true,tween=null,playTime=0,swapTime=1,challengeFinish=false,paintCount=0;
  const text=(id,v)=>{const el=$('#'+id);if(el.textContent!==String(v))el.textContent=v;};
  function notice(message,warn=false){text('notice',message);$('#notice').style.color=warn?'var(--orange)':'var(--muted)';}
  function run(){dirty=true;if(!frameId&&visible&&!document.hidden)frameId=requestAnimationFrame(frame);}
  view.onChange=run;view.onInput=()=>{S.playing=false;text('playPivot','▷ 播放姿态对照');run();};
  function mark(id){if(!S.done.includes(id))S.done.push(id);updateProgress();}
  function updateProgress(){text('progressText',`探索进度 ${S.done.length} / 4`);$$('[data-tab]').forEach(b=>b.querySelector('.step-check').textContent=S.done.includes(b.dataset.tab)?'✓':'');}
  function parameterOK(){return M.norm(M.sub(S.parameter,TM.flangeOffset(S.tool)))<.5;}
  $('#toolPicker').innerHTML=ids.map((id,i)=>{const t=TM.tools[id];return `<button class="tool-card" data-tool="${id}" aria-label="换装${t.label}" aria-pressed="false"><img alt="${t.label}立体模型"><span class="tool-copy"><b>${t.label}</b><span class="tool-use">${t.task}</span><small>0${i+1} / ${t.en}</small></span><span class="equipped-indicator">✓</span></button>`;}).join('');
  $('#parameterTool').innerHTML=ids.map(id=>`<option value="${id}">${TM.tools[id].label} TCP</option>`).join('')+'<option value="calibrated" disabled>本次标定位置</option>';
  $('#poseButtons').innerHTML=Array.from({length:4},(_,i)=>`<button data-pose="${i}" aria-label="采集姿态 ${i+1}" aria-pressed="false">P${i+1}</button>`).join('');
  $('#calAdjust').innerHTML=['X','Y','Z'].map((a,i)=>`<div><label for="adjust${i}">${a}</label><input id="adjust${i}" data-adjust="${i}" aria-label="沿基坐标 ${a} 方向微调" type="range" min="-3" max="3" step="0.1" value="0"><output id="adjustValue${i}">0.0 mm</output></div>`).join('');
  function ui(){
    const t=TM.tools[S.tool],ok=parameterOK();
    $$('[data-tool]').forEach(b=>{const yes=b.dataset.tool===S.tool;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',yes);});
    text('toolName',t.label);text('toolTask',t.task);text('toolPoint',t.point);text('toolDescription',t.hint);text('toolNumber',String(ids.indexOf(S.tool)+1).padStart(2,'0'));
    TM.flangeOffset(S.tool).forEach((v,i)=>text('off'+['X','Y','Z'][i],Math.round(v)||0));
    text('paramState',ok?'✓ 工具参数一致':'! 参数尚未同步');$('#paramState').classList.toggle('warn',!ok);$('#applyTool').hidden=ok;
    $('#parameterTool').value=S.parameterTool;$('#wrongLegend').hidden=ok;
    text('actuate',(S.active?'■ ':'▷ ')+(S.active?t.off:t.action));$('#actuate').setAttribute('aria-pressed',S.active);
    $('#contact').hidden=!['gripper','vacuum','tie'].includes(S.tool);text('contact',S.contact?'移走练习材料':'放入练习材料');$('#contact').setAttribute('aria-pressed',S.contact);
    text('toolActionNote',!S.active?'工具动作由末端装置完成，机械臂负责改变位置和姿态。':S.tool==='vacuum'?(S.contact?'已贴合板材，真空开启；本教学状态显示吸附成立。':'真空已开启，但没有贴合板材。发出命令不等于已经吸牢。'):S.tool==='gripper'?(S.contact?'夹爪闭合，材料到位；显示夹持状态。':'夹爪正在闭合，当前没有夹住材料。'):'工具正在执行前端动作；机械臂六个关节仍停在原位。');
    text('stageState',t.label+(S.swapLift>1?' · 对接中':ok?' · 参数匹配':' · 请核对 TCP 参数'));
    $$('[data-pivot]').forEach(b=>{const yes=b.dataset.pivot===S.pivot;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',yes);});
    text('pivotExplanation',!ok?'所选参数与当前工具不一致。机器人保持的是橙色参数点，实际绿色工作点会发生偏离。':S.pivot==='tcp'?'绕 TCP 改变方向时，多个关节联动补偿，法兰会移动，但工作点保持在同一位置。':'绕法兰改变方向时，连接处保持不动，前端工作点会画出一段圆弧。');
    $('#pivotExplanation').classList.toggle('warn',!ok);text('playPivot',S.playing?'Ⅱ 暂停姿态演示':'▷ 播放姿态对照');
    $$('[data-pose]').forEach(b=>{const i=+b.dataset.pose;b.classList.toggle('active',i===S.pose);b.classList.toggle('recorded',!!S.samples[i]);b.setAttribute('aria-pressed',i===S.pose);});
    text('capture',S.pose===4?'复核姿态 · 不采集':S.samples[S.pose]?`● 重录姿态 ${S.pose+1}`:`● 记录姿态 ${S.pose+1}`);
    $('#align').disabled=S.pose===4;$$('[data-adjust]').forEach(el=>el.disabled=S.pose===4);
    $('#solve').disabled=S.samples.filter(Boolean).length<4;$('#validate').disabled=!S.result||S.result.maxResidual>.5;$('#export').disabled=!S.validation?.passed;
    $('#samples').innerHTML=Array.from({length:4},(_,i)=>`<tr><td>P${i+1} ${S.samples[i]?'●':'○'}</td><td>${S.samples[i]?S.samples[i].t.map(n=>n.toFixed(1)).join(' / '):'等待采集'}</td></tr>`).join('');
    text('renderMode',view.renderer?'三维教学模型':'静态投影 · 三维加速不可用');
    updateProgress();run();
  }
  function stop(say=false){S.playing=false;S.active=false;S.angleTarget=S.angle;tween=null;challengeFinish=false;if(S.challenge==='checking')resetChallenge();text('playPivot','▷ 播放姿态对照');if(say)notice('动作已停止。可以继续操作当前工具。');ui();}
  function clearCalibration(){S.samples=[];S.result=null;S.validation=null;S.assists=0;text('calResult','先对准，再记录。四个记录对应同一个空间参考点。');$('#calResult').classList.remove('warn');$('#validationResult').hidden=true;}
  function resetChallenge(){S.challenge='idle';S.answer=null;$('#challengeTask').hidden=true;$('#challengeSuccess').hidden=true;$('#startChallenge').hidden=false;$('#quizFeedback').hidden=true;$('#repairChallenge').disabled=true;$$('[data-answer]').forEach(b=>b.classList.remove('correct','wrong'));}
  function setTool(id,internal=false){
    if(!TM.tools[id])return false;stop();S.tool=id;S.q=M.home.slice();S.active=S.contact=false;S.angle=S.angleTarget=0;S.adjust=[0,0,0];S.pose=0;swapTime=0;S.swapLift=S.reduced?0:65;
    cal=TM.calibrationPoses(id);S.pin=cal.pin;clearCalibration();view.clearTraces();
    if(!S.explored.includes(id))S.explored.push(id);if(S.explored.length>=3)mark('tools');
    if(!internal&&S.tab==='challenge'){resetChallenge();switchTab('tools');}
    if(S.tab==='calibrate')movePose(0);
    if(S.tab==='pivot')setPivotAngle(0,true);
    ui();notice(`已换装${TM.tools[id].label}。${parameterOK()?'工具参数一致。':'机械连接已锁紧，请独立核对 TCP 参数。'}`);
    return true;
  }
  function applyParameter(id){
    if(id==='calibrated'){if(!S.result)return false;S.parameter=S.result.p.slice();}else{if(!TM.tools[id])return false;S.parameter=TM.flangeOffset(id);}
    S.parameterTool=id;view.clearTraces();if(S.tab==='pivot')setPivotAngle(S.angleTarget,true);ui();return true;
  }
  const tabText={tools:['01 / EQUIP & EXPLORE','认识你的工具','六轴机械臂 · 工具工作点','MEET THE WORKING POINT','TCP，是工具真正工作的那个点。','喷枪看喷嘴，夹爪看夹持中心。TCP 由作业任务定义，不一定是工具外形的中心。'],pivot:['02 / THE PIVOT EXPERIMENT','同样转动，结果不同','姿态实验 · 法兰与 TCP','SAME ANGLE, DIFFERENT PIVOT','法兰可以移动，TCP 可以不动。','绿色轨迹是实际 TCP，灰色轨迹是法兰。对比两种转动方式，理解机器人在控制哪个点。'],calibrate:['03 / FIND YOUR TCP','四个姿态，同一个点','四点标定 · 固定参考针','FOUR POSES, ONE POINT','记录的是四组位姿，不是四个空间点。','从不同方向对准同一固定点，求出 TCP 相对法兰的位置；再用未参与计算的新姿态复核。'],challenge:['04 / TROUBLESHOOTING','换装排错挑战','任务现场 · 旧参数的偏差','EQUIPPED ≠ CONFIGURED','装上了工具，还要选对参数。','识别实际工具，检查所选 TCP，再通过新姿态复核。每一步都有不同的作用。']};
  function switchTab(tab){
    if(!tabText[tab])return;stop();S.tab=tab;
    $$('[data-tab]').forEach(b=>{const yes=b.dataset.tab===tab;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',yes);});
    for(const n of Object.keys(tabText))$('#'+n+'Panel').hidden=n!==tab;
    ['panelEyebrow','panelTitle','figureName','insightEyebrow','insightTitle','insightText'].forEach((id,i)=>text(id,tabText[tab][i]));
    $('#nextLesson').innerHTML={tools:'试试绕 TCP 转动',pivot:'去做四点标定',calibrate:'进入排错挑战',challenge:'返回工具柜'}[tab]+' <span>↗</span>';
    if(tab==='pivot'){S.q=M.home.slice();S.angle=S.angleTarget=0;view.clearTraces();setPivotAngle(0,true);}
    if(tab==='calibrate'){S.contact=false;cal=TM.calibrationPoses(S.tool);S.pin=cal.pin;movePose(Math.min(S.pose,3));}
    if(tab==='tools'){S.q=M.home.slice();view.clearTraces();}
    $('.control-panel').scrollTop=0;ui();
  }
  function setPivotMode(mode){stop();S.pivot=mode;S.q=M.home.slice();S.angle=0;view.clearTraces();setPivotAngle(0,true);ui();notice(mode==='tcp'?'改变角度，观察工具尖端是否仍留在同一点。':'改变角度，观察工具尖端扫过的圆弧。');}
  function setPivotAngle(angle,immediate=false){
    S.angleTarget=Math.max(-22,Math.min(22,angle));
    if(immediate||S.reduced){const r=W.pivot(S.tool,S.angleTarget,S.pivot,S.parameter,S.q);if(!r.ok){notice(r.reason,true);S.angleTarget=S.angle;return false;}S.q=r.q;S.angle=S.angleTarget;}
    $('#pivotAngle').value=S.angleTarget;run();return true;
  }
  function poseTo(q){
    const issue=M.guard(q,S.tool);if(issue){notice(issue,true);return false;}
    if(S.reduced||!view.renderer){S.q=q.slice();tween=null;}else tween={from:S.q.slice(),to:q.slice(),age:0,duration:.7};run();return true;
  }
  function movePose(i,adjust=[1.2,-1,1]){
    if(i<0||i>3)return false;
    const q=cal.poses[i],f=M.fk(q,S.tool),r=M.ik(M.add(S.pin,adjust),f.R,q,S.tool,180);
    if(!r.ok||M.guard(r.q,S.tool)){notice('当前微调无法到达。',true);return false;}
    S.pose=i;S.adjust=adjust.slice();poseTo(r.q);
    S.adjust.forEach((v,j)=>{$('#adjust'+j).value=v;text('adjustValue'+j,v.toFixed(1)+' mm');});
    ui();return true;
  }
  function align(){S.assists++;movePose(S.pose,[0,0,0]);notice('辅助对准同一针尖；姿态稳定后，点击记录。');}
  function capture(){
    if(S.pose===4){notice('第 5 姿态专用于独立复核，不加入四点采集。',true);return false;}
    if(tween){notice('机械臂正在移动，请等姿态稳定后记录。',true);return false;}
    const f=M.fk(S.q,S.tool),error=M.norm(M.sub(f.p,S.pin));
    if(error>.5){notice(`距参考点 ${error.toFixed(2)} mm，请先微调或辅助对准。`,true);return false;}
    S.samples[S.pose]={...TM.measured(S.q,S.tool),error,reference:S.pin.slice(),pose:S.pose};S.result=S.validation=null;$('#validationResult').hidden=true;
    text('calResult',`已记录 ${S.samples.filter(Boolean).length} / 4 个姿态。采集的是法兰的位置和方向。`);
    const next=[0,1,2,3].find(i=>!S.samples[i]);if(next!==undefined)movePose(next);ui();notice(next===undefined?'四点已采齐，可以计算 TCP。':'已记录当前姿态，请让下一个姿态再次对准同一针尖。');return true;
  }
  function solve(){
    S.validation=null;$('#validationResult').hidden=true;
    try{S.result=TM.solve(S.samples.filter(Boolean));const r=S.result;
      $('#calResult').innerHTML=`法兰系偏置 / mm<br><b>X ${r.p[0].toFixed(2)}　Y ${r.p[1].toFixed(2)}　Z ${r.p[2].toFixed(2)}</b><br>拟合 RMS ${r.rms.toFixed(3)} mm · 最大残差 ${r.maxResidual.toFixed(3)} mm`;
      $('#calResult').classList.toggle('warn',r.maxResidual>.5);notice(r.maxResidual<=.5?'位置偏置已求出，下一步用第 5 姿态复核。':'残差过大，检查是否对准了不同的参考点。',r.maxResidual>.5);
    }catch(e){S.result=null;text('calResult',e.message);$('#calResult').classList.add('warn');notice('无法求得可靠的 TCP，请重新采集四种不同姿态。',true);}
    ui();return S.result;
  }
  function validate(){
    if(!S.result||S.result.maxResidual>.5){notice('请先完成有效的四点位置计算。',true);return null;}
    const f=M.fk(cal.poses[4],S.tool),delta=M.sub(S.result.p,TM.flangeOffset(S.tool)),target=M.sub(S.pin,M.mv(f.flangeR,delta)),r=M.ik(target,f.R,cal.poses[4],S.tool,180);
    if(!r.ok||M.guard(r.q,S.tool)){notice('复核姿态无法到达。',true);return null;}
    S.parameter=S.result.p.slice();S.parameterTool='calibrated';S.pose=4;poseTo(r.q);
    const actual=M.fk(r.q,S.tool).p,error=M.norm(M.sub(actual,S.pin));S.validation={q:r.q.slice(),actual,reference:S.pin.slice(),error,passed:error<=.5,heldOut:true};
    $('#validationResult').hidden=false;$('#validationResult').innerHTML=`${error<=.5?'✓':'!'} 第 5 姿态偏差 <b>${error.toFixed(3)} mm</b><br>该姿态未参与四点计算。${error<=.5?'位置复核通过。':'位置复核未通过。'}工具轴方向仍需另外确定。`;
    if(error<=.5)mark('calibrate');ui();notice('正在查看未参与拟合的第五姿态。');return S.validation;
  }
  function startChallenge(){
    resetChallenge();setTool('gripper',true);S.tab='challenge';applyParameter('nozzle');S.challenge='fault';S.answer=null;S.swapLift=0;
    $('#startChallenge').hidden=true;$('#challengeTask').hidden=false;$('#challengeSuccess').hidden=true;notice('夹爪已经装牢，但橙色所选 TCP 仍来自旧喷枪。先判断，再修复。');ui();
  }
  function answer(value){
    if(S.challenge!=='fault')return;S.answer=value;$('#quizFeedback').hidden=false;
    $$('[data-answer]').forEach(b=>{b.classList.toggle('correct',b.dataset.answer===value&&value==='tcp');b.classList.toggle('wrong',b.dataset.answer===value&&value!=='tcp');});
    const ok=value==='tcp';text('quizFeedback',ok?'判断正确。现在同步夹爪参数，再换一个姿态检验实际工作点。':value==='lock'?'装牢只说明机械连接完成，控制器还在使用旧喷枪的工作点。':'低速可以减慢动作，但不会消除几何偏差。请重新选择。');$('#quizFeedback').classList.toggle('warn',!ok);$('#repairChallenge').disabled=!ok;ui();
  }
  function repairChallenge(){
    if(S.challenge!=='fault'||S.answer!=='tcp')return false;
    applyParameter('gripper');S.pivot='tcp';const r=W.pivot('gripper',20,'tcp',S.parameter,M.home);
    if(!r.ok){notice('复核失败，请重新开始挑战。',true);return false;}
    S.challenge='checking';poseTo(r.q);challengeFinish=true;$('#repairChallenge').disabled=true;notice('参数已修复，正在用新姿态复核工作点。');run();return true;
  }
  function finishChallenge(){
    const f=M.fk(S.q,S.tool),err=M.norm(M.sub(f.p,M.fk(M.home,S.tool).p));challengeFinish=false;
    if(err>.1||!parameterOK()){S.challenge='fault';notice('复核尚未通过，请检查参数。',true);ui();return;}
    S.challenge='passed';$('#challengeTask').hidden=true;$('#challengeSuccess').hidden=false;mark('challenge');notice(`排错成功，新姿态工作点偏差 ${err.toFixed(3)} mm。`);ui();
  }
  function readouts(){
    const m=W.stateMetrics(S);m.f.p.forEach((n,i)=>text('pos'+['X','Y','Z'][i],n.toFixed(1)));
    const isCal=S.tab==='calibrate',isPivot=S.tab==='pivot';text('metricLabel',isCal?'距参考针 / mm':isPivot?'TCP 位移 / mm':'参数偏差 / mm');text('metricValue',(isCal?m.pinError:isPivot?m.tipTravel:m.parameterError).toFixed(2));
    text('tipTravel',m.tipTravel.toFixed(2));text('flangeTravel',m.flangeTravel.toFixed(2));text('pinError',m.pinError.toFixed(2));text('challengeError',m.parameterError.toFixed(2));text('angleValue',(S.angle>0?'+':'')+S.angle.toFixed(1)+'°');
    $('#capture').disabled=S.pose===4||!!tween||m.pinError>.5;$('#metricValue').style.color=(isPivot?S.pivot==='flange'||m.tipTravel<.1:isCal?m.pinError<.5:m.parameterError<.5)?'var(--accent)':'var(--orange)';
    if(isPivot&&Math.abs(S.angle)>15&&parameterOK()){if(!S.pivotSeen.includes(S.pivot))S.pivotSeen.push(S.pivot);if(S.pivotSeen.length===2)mark('pivot');}
    return m;
  }
  function frame(now){
    frameId=0;if(!visible||document.hidden)return;
    const dt=Math.min(.04,last?(now-last)/1000:.016);last=now;S.time+=dt;paintCount++;
    if(S.playing){playTime+=dt;S.angleTarget=20*Math.sin(playTime*.8);$('#pivotAngle').value=S.angleTarget;}
    if(S.tab==='pivot'&&Math.abs(S.angleTarget-S.angle)>.008){
      const next=S.reduced?S.angleTarget:S.angle+(S.angleTarget-S.angle)*(1-Math.exp(-9*dt));
      const r=W.pivot(S.tool,next,S.pivot,S.parameter,S.q);
      if(r.ok){S.q=r.q;S.angle=next;}else{S.playing=false;S.angleTarget=S.angle;notice(r.reason||'此方向无法到达，请减小角度。',true);}
    }
    if(tween){tween.age+=dt;const t=Math.min(1,tween.age/tween.duration),k=t*t*(3-2*t);const q=tween.from.map((v,i)=>v+(tween.to[i]-v)*k);if(M.guard(q,S.tool)){S.q=tween.to.slice();tween=null;}else{S.q=q;if(t>=1)tween=null;}}
    if(S.swapLift>0){swapTime+=dt;S.swapLift=65*Math.pow(Math.max(0,1-swapTime/.55),3);if(S.swapLift<.05){S.swapLift=0;ui();}}
    view.updateLab(S,dt);readouts();if(challengeFinish&&!tween)finishChallenge();
    const focus=view.closeup?M.mul(M.add(M.fk(S.q,S.tool).flange,M.fk(S.q,S.tool).p),.5):[285,-30,350];
    const moving=S.playing||tween||S.swapLift>0||Math.abs(S.angleTarget-S.angle)>.008&&S.tab==='pivot'||(!S.reduced&&S.active)||Math.abs(view.actionAmount-Number(S.active))>.002||!view.settled()||view.centre.distanceTo(new THREE.Vector3(...focus))>.03;
    dirty=false;if(moving)frameId=requestAnimationFrame(frame);else last=0;
  }
  $$('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$$('[data-tab]').forEach(b=>b.onclick=()=>switchTab(b.dataset.tab));$$('[data-pivot]').forEach(b=>b.onclick=()=>setPivotMode(b.dataset.pivot));
  $('#pivotAngle').oninput=e=>{S.playing=false;text('playPivot','▷ 播放姿态对照');setPivotAngle(+e.target.value);};
  $('#playPivot').onclick=()=>{if(S.reduced){setPivotAngle(S.angle>0?-20:20,true);notice('已启用减少动态效果：用静态姿态对照观察。');return;}S.playing=!S.playing;playTime=0;ui();};
  $('#applyTool').onclick=$('#correctParam').onclick=()=>{applyParameter(S.tool);notice('已同步当前工具的 TCP 位置参数。');};$('#parameterTool').onchange=e=>applyParameter(e.target.value);
  $('#actuate').onclick=()=>{S.active=!S.active;if(S.active)mark('tools');ui();};$('#contact').onclick=()=>{S.contact=!S.contact;ui();};
  $('#enterPivot').onclick=()=>switchTab('pivot');$('#nextLesson').onclick=()=>switchTab({tools:'pivot',pivot:'calibrate',calibrate:'challenge',challenge:'tools'}[S.tab]);
  $$('[data-pose]').forEach(b=>b.onclick=()=>movePose(+b.dataset.pose));
  $$('[data-adjust]').forEach(el=>el.oninput=()=>{const next=S.adjust.slice();next[+el.dataset.adjust]=+el.value;const f=M.fk(cal.poses[S.pose],S.tool),r=M.ik(M.add(S.pin,next),f.R,S.q,S.tool,160);if(r.ok&&!M.guard(r.q,S.tool)){tween=null;S.q=r.q;S.adjust=next;text('adjustValue'+el.dataset.adjust,(+el.value).toFixed(1)+' mm');run();}else{el.value=S.adjust[+el.dataset.adjust];notice('该方向不可到达，请减小微调。',true);}});
  $('#align').onclick=align;$('#capture').onclick=capture;$('#solve').onclick=solve;$('#validate').onclick=validate;$('#clearSamples').onclick=()=>{clearCalibration();movePose(0);ui();};
  $('#badRepeat').onclick=()=>{stop();const q=cal.poses[0];S.samples=Array.from({length:4},(_,i)=>({...TM.measured(q,S.tool),error:0,pose:i,reference:S.pin.slice()}));solve();};
  $('#badPoint').onclick=()=>{stop();S.samples=cal.poses.slice(0,4).map((q,i)=>{const f=M.fk(q,S.tool),r=i===3?M.ik(M.add(S.pin,[6,-4,3]),f.R,q,S.tool,180):{q};return {...TM.measured(r.q,S.tool),error:i===3?Math.sqrt(61):0,pose:i,reference:i===3?M.add(S.pin,[6,-4,3]):S.pin.slice()};});solve();};
  $('#export').onclick=()=>{if(!S.validation?.passed)return;const payload={version:2,tool:S.tool,toolName:TM.tools[S.tool].label,units:'mm / degrees',records:S.samples,result:S.result,heldOutValidation:S.validation,assistCount:S.assists,positionOnly:true,exerciseValid:S.result.maxResidual<=.5&&S.validation.passed,note:'四点法求 TCP 位置，不确定工具坐标轴方向；0.5 mm 仅为本教学模型提示阈值。'};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='任务3-4_TCP采集与复核.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);notice('采集与复核记录已下载到本机。');};
  $('#startChallenge').onclick=$('#retryChallenge').onclick=startChallenge;$$('[data-answer]').forEach(b=>b.onclick=()=>answer(b.dataset.answer));$('#repairChallenge').onclick=repairChallenge;
  function closeup(force){view.closeup=force??!view.closeup;$('#toolCloseup').setAttribute('aria-pressed',view.closeup);run();}
  $('#toolCloseup').onclick=()=>closeup();$('#findTCP').onclick=()=>closeup(true);$('#showAxes').onclick=()=>{view.showAxes=!view.showAxes;$('#showAxes').setAttribute('aria-pressed',view.showAxes);run();};
  $$('[data-view]').forEach(b=>b.onclick=()=>{view.setView(b.dataset.view);$$('[data-view]').forEach(c=>c.classList.toggle('active',c===b));run();});
  $('#home').onclick=()=>{stop();view.setView('iso');closeup(false);S.q=M.home.slice();S.angle=S.angleTarget=0;view.clearTraces();if(S.tab==='calibrate')movePose(S.pose);if(S.tab==='pivot')setPivotAngle(0,true);ui();notice('已复位机械臂与视角。');};
  $('#stop').onclick=()=>stop(true);
  function theme(){const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('#theme').setAttribute('aria-label',dark?'切换浅色主题':'切换深色主题');text('theme',dark?'☀':'☾');view.setTheme(dark?'dark':'light');run();}
  $('#theme').onclick=theme;$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{notice('当前浏览器不支持全屏，可使用浏览器的全屏功能。');}};
  $('#help').onclick=$('#about').onclick=()=>{stop();$('#helpDialog').showModal();};$('#closeHelp').onclick=()=>$('#helpDialog').close();
  window.addEventListener('keydown',e=>{const typing=/INPUT|SELECT|TEXTAREA/.test(e.target.tagName);if(e.code==='Space'&&!typing&&!$('#helpDialog').open){e.preventDefault();stop(true);}if(!typing&&!e.ctrlKey&&!e.altKey&&!e.metaKey&&!$('#helpDialog').open&&/^[1-6]$/.test(e.key)){e.preventDefault();setTool(ids[+e.key-1]);}if(e.key==='Escape')stop();});
  new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();else if(frameId){cancelAnimationFrame(frameId);frameId=0;last=0;}},{rootMargin:'100px'}).observe($('#viewport'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frameId)cancelAnimationFrame(frameId);frameId=0;last=0;}else run();});
  reduced.addEventListener('change',()=>{S.reduced=reduced.matches;S.playing=false;if(S.reduced&&tween){S.q=tween.to;tween=null;}S.swapLift=0;setPivotAngle(S.angleTarget,true);ui();});
  const thumbs=view.makeThumbnails();ids.forEach(id=>$(`[data-tool="${id}"] img`).src=thumbs[id]);
  // Keep the exact same canvas visible above the controls on narrow screens.
  // The placeholder preserves the layout, so docking never scrolls the page.
  const stage=$('.stage'),centre=$('.lab-centre'),placeholder=document.createElement('div');
  placeholder.hidden=true;placeholder.className='stage-placeholder';stage.before(placeholder);
  let docked=false,dockScheduled=false,normalStageHeight=stage.offsetHeight;
  function dock(){
    dockScheduled=false;
    const narrow=innerWidth<=1000,top=centre.getBoundingClientRect().top+scrollY;
    if(!docked)normalStageHeight=stage.offsetHeight;
    const next=narrow&&scrollY>top+normalStageHeight-220;
    if(next===docked)return;
    if(next){placeholder.style.height=normalStageHeight+'px';placeholder.hidden=false;}else placeholder.hidden=true;
    docked=next;stage.classList.toggle('mobile-pinned',next);view.resize();run();
  }
  window.addEventListener('scroll',()=>{if(!dockScheduled){dockScheduled=true;requestAnimationFrame(dock);}},{passive:true});
  window.addEventListener('resize',()=>{if(docked&&innerWidth>1000){docked=false;placeholder.hidden=true;stage.classList.remove('mobile-pinned');}dock();});
  window.toolLab={getState:()=>({...structuredClone(S),moving:!!tween,paintCount}),setTool,switchTab,setPivotMode,setPivotAngle,applyParameter,movePose,align,capture,solve,validate,startChallenge,answer,repairChallenge,stop,closeup,view,diagnostics:()=>({...view.diagnostics(),metrics:W.stateMetrics(S)})};
  ui();view.updateLab(S,1);readouts();run();
})();
