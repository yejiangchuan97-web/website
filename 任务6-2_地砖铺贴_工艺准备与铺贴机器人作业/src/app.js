(()=>{
'use strict';
const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
const fmt=(v,n=1)=>Number(v).toFixed(n),sign=(v,n=1)=>(v>=0?'+':'−')+Math.abs(v).toFixed(n);
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),tabs=['vision','vacuum','height'];
const state={tab:'vision',ex:8,ey:-5,angle:3,visibility:'clear',needsReacquire:false,feedback:true,correcting:false,
 layout:'single',vacuum:60,mass:12,spread:.6,offsetY:110,surface:'smooth',isolated:false,leak:false,
 t:0,playing:false,lifting:false,liftClock:0,trialSignature:'',needsReturn:false,
 mode:'force',targetForce:160,targetCompression:2,stiffness:80,base:0,press:{},pressing:false,missing:false,
 completed:{vision:false,vacuum:false,height:false},sawBlocked:false,reacquired:false,sawLeak:false,
 touched:false,visible:true};
let cached={ex:8,ey:-5,angle:3},frame=0,last=0,idleTime=0,tour=false,lastGrip='',lastNote='',historyClock=0,forceHistory=[];
const titles={vision:['先看清，才能对齐。','找准基准，再修正横移、纵移和转角；视野恢复后重新识别。','01 · 对齐与遮挡'],vacuum:['吸力够，还要吸得稳。','比较相同总有效面积的 1、2、4 个吸盘，完成偏载砖的低位试提。','02 · 吸盘选型'],height:['让压头学会“轻一点”。','传感器测力，控制器比较，升降轴调整；压力和标高要一起检查。','03 · 力反馈压实']};
const missions={vision:['救回一次失明的对位','制造遮挡 → 恢复视野并重新识别 → 将 X、Y 调到 ±0.5 mm 内、转角调到 ±0.25° 内。'],vacuum:['稳稳提起偏载砖','保持重心偏移至少 110 mm，体验一次漏气，恢复合适布局与密封，再完成低位试提。'],height:['把砖压到合适的位置','让力保持在 120–200 N，标高误差不超过 ±0.5 mm，并稳定 1.2 秒；本次不得发生过压。']};
const questions={vision:['相机被挡住，关节编码器还能报告运动，能证明砖没有滑动吗？','能，编码器仍在工作','不能，还需恢复视觉','编码器测的是机构状态；砖块滑移和基准变化需要重新观测。'],vacuum:['总有效面积和压差相同，四盘一定比单盘吸力大吗？','一定，数量更多','不一定，布点也重要','理想总吸力相同；布点、偏载、密封和气路决定能否稳妥搬运。'],height:['力控稳定、表面也齐平，就能证明砖下没有空鼓吗？','可以直接证明','仍需检查贴合质量','力与标高是过程信号，不能代替对粘结和空鼓的实体复核。']};
function text(id,value){if($(id))$(id).textContent=value}
function note(message,warning=false){if(message!==lastNote){text('statusNote',message);lastNote=message}$('statusNote').classList.toggle('warning',warning)}
function metrics(labels,values,notes){for(let i=1;i<=3;i++){text('m'+i+'label',labels[i-1]);$('m'+i).innerHTML=values[i-1];text('m'+i+'note',notes[i-1])}}
function observation(){return M.visionModel({...state,age:state.needsReacquire&&state.visibility==='clear'?1:0})}
function grip(){return M.gripModel({...state,failed:state.leak?1:0})}
function pressOptions(){return {mode:state.mode,targetForce:state.targetForce,targetCompression:state.targetCompression,stiffness:state.stiffness,base:state.base}}
function pressure(){return M.pressModel({...state.press,...pressOptions()})}
function signature(){return JSON.stringify([state.layout,state.vacuum,state.mass,state.spread,state.offsetY,state.surface,state.isolated,state.leak])}
function stopTour(){if(tour){state.correcting=false;tour=false}state.touched=true}
function message(value,good=false){text('missionResult',value);$('missionResult').dataset.success=String(good)}
function syncInputs(){
 for(const [id,value]of Object.entries({errorX:state.ex,errorY:state.ey,errorAngle:state.angle,visibility:state.visibility,layout:state.layout,vacuum:state.vacuum,mass:state.mass,spread:state.spread,offsetY:state.offsetY,surface:state.surface,stiffness:state.stiffness,mode:state.mode,targetForce:state.targetForce,compression:state.targetCompression,base:state.base}))if($(id))$(id).value=value;
 for(const id of ['feedback','isolated','leak','missing'])if($(id))$(id).checked=state[id];updateOutputs();
}
function updateOutputs(){
 text('errorXOut',sign(state.ex)+' mm');text('errorYOut',sign(state.ey)+' mm');text('errorAngleOut',sign(state.angle)+'°');text('vacuumOut',state.vacuum+' kPa');text('massOut',state.mass+' kg');text('spreadOut',Math.round(state.spread*600)+' mm');text('offsetYOut',sign(state.offsetY,0)+' mm');text('targetForceOut',state.targetForce+' N');text('compressionOut',fmt(state.targetCompression)+' mm');text('baseOut',fmt(state.base)+' mm');
}
function renderVision(){
 const v=observation();if(v.valid)cached={ex:state.ex,ey:state.ey,angle:state.angle};
 if(v.valid){for(const [id,key,unit]of [['errorX','ex','mm'],['errorY','ey','mm'],['errorAngle','angle','°']]){$(id).value=state[key];text(id+'Out',sign(state[key])+unit)}}
 const status=!v.valid?'观测无效':!state.feedback?'反馈关闭':v.aligned?'位置与转角到位':state.correcting?'正在纠偏':'等待纠偏';
 $('cameraTile').setAttribute('transform',`translate(${cached.ex*1.28} ${cached.ey*1.28}) rotate(${cached.angle} 150 70)`);$('cameraTile').setAttribute('opacity',v.valid?'1':'.25');
 $('occlusion').toggleAttribute('hidden',state.visibility==='clear');$('occlusionText').toggleAttribute('hidden',v.valid);
 text('occlusionText',state.visibility==='partial'?'只剩两个边角 · 观测不足':state.visibility==='blocked'?'镜头遮挡 · 实时位置未知':'视野已恢复 · 请重新识别');$('occlusion').setAttribute('width',state.visibility==='partial'?'150':'300');
 text('cameraNote',v.valid?'实线：当前观测　虚线：目标砖边':'淡色轮廓为上次观测，不是实时位置');
 text('cachedObservation',v.valid?'定位依据：砖边与基准线；同时比较 X、Y 和转角。':`上次观测：X ${sign(cached.ex)} mm / Y ${sign(cached.ey)} mm / ${sign(cached.angle)}°（已失效）`);
 text('angleReadout',v.valid?sign(v.angle,2)+'°':'— 无有效角度');
 metrics(['X 方向误差','Y 方向误差','转角误差'],[v.valid?sign(v.ex,2)+'<em>mm</em>':'—',v.valid?sign(v.ey,2)+'<em>mm</em>':'—',v.valid?sign(v.angle,2)+'<em>°</em>':'—'],[v.valid?'教学窗口 ±0.5 mm':'没有实时位置依据',v.valid?'教学窗口 ±0.5 mm':'没有实时位置依据',v.valid?'教学窗口 ±0.25°':'重新识别后再显示']);
 text('sceneState',status);text('correct',state.correcting?'暂停纠偏':reduced.matches?'推进纠偏':'开始纠偏');text('sceneHint','主台观察平移 · 转角看相机俯视窗');
 note(!v.valid?v.reason:!state.feedback?'反馈关闭：机构保持位置，偏差不会自动消失。':v.aligned?'砖边和转角已对齐。还需检查砖缝、标高与贴合。':state.correcting?'根据有效图像比较基准与砖边，持续修正 X、Y 和转角。':'先遮住相机，观察读数消失；恢复视野并重新识别，再完成纠偏。',!v.valid||!state.feedback);
 window.setRigPose({x:25+state.ex*.6,y:30+state.ey*.6,top:40,layout:state.layout});
}
function renderGripMap(q){
 const key=signature();if(key===lastGrip)return;lastGrip=key;const ns='http://www.w3.org/2000/svg';$('gripCups').replaceChildren();
 for(const p of q.positions){const g=document.createElementNS(ns,'g'),c=document.createElementNS(ns,'circle');c.setAttribute('cx',150+p.x*.18);c.setAttribute('cy',75+p.y*.18);c.setAttribute('r',p.radius*.18);c.setAttribute('class',p.active?'cup-active':'cup-failed');g.append(c);const hub=document.createElementNS(ns,'circle');hub.setAttribute('cx',150+p.x*.18);hub.setAttribute('cy',75+p.y*.18);hub.setAttribute('r','2');hub.setAttribute('class','cup-hub');g.append(hub);$('gripCups').append(g)}
 if($('gripEnvelope')){
  // Convex contact envelope visualises the model's conservative moment surrogate.
  const points=q.positions.filter(p=>p.active).flatMap(p=>Array.from({length:32},(_,i)=>[p.x+Math.cos(i*Math.PI/16)*p.radius*.5,p.y+Math.sin(i*Math.PI/16)*p.radius*.5])).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lower=[],upper=[];for(const p of points){while(lower.length>=2&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p)}for(const p of [...points].reverse()){while(upper.length>=2&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p)}
  const hull=lower.slice(0,-1).concat(upper.slice(0,-1));$('gripEnvelope').setAttribute('points',hull.map(p=>`${150+p[0]*.18},${75+p[1]*.18}`).join(' '));
  $('gripEnvelope').setAttribute('aria-label','教学支承区：仅用于比较布点，不是厂家额定力矩边界');
 }
 $('gripCenter').setAttribute('transform',`translate(150 ${75+state.offsetY*.18})`);$('gripMap').dataset.ready=String(q.ready);text('layoutInfo',`${q.count} 个 · 单盘有效直径约 ${fmt(q.diameter,1)} mm · 三种方案总有效面积相同`);
}
function renderVacuum(){
 const q=grip(),c=M.cycle(state.t);renderGripMap(q);
 metrics(['可用理论吸力','含安全余量的需求','布点与密封'],[fmt(q.holding,0)+'<em>N</em>',fmt(q.required,0)+'<em>N</em>',q.ready?'可低位试提':'暂不可起吊'],[`实际演示压差 ${fmt(q.pressure)} kPa`,`${fmt(q.ratio,2)} 倍需求 · 安全系数 2`,!q.fit?'吸盘越出砖边':!q.stable?'重心超出教学支承区':!q.sealReliable?'砖面需要清洁':'吸力 + 布点 + 密封共同放行']);
 text('holdNumber',fmt(q.holding,0)+' N');text('needNumber',fmt(q.required,0)+' N');$('holdBar').style.width=Math.min(100,q.holding/1700*100)+'%';$('needBar').style.width=Math.min(100,q.required/1700*100)+'%';
 const certified=state.trialSignature===signature();text('sceneState',state.needsReturn?'搬运故障快照 · 待放回':state.lifting?'低位试提 · 观察稳定性':!q.ready?'起吊条件不足':certified?'试提完成 · 可以搬运':'等待低位试提');text('sceneHint',`${M.GRIP_LAYOUTS[state.layout].label} · 布点间距与重心见俯视窗`);
 text('lowLift',state.lifting?'正在低位试提…':certified?'重新低位试提':'低位试提');text('cyclePlay',state.playing?'暂停搬运':state.t>=5?'重播搬运':'播放搬运');
 note(state.needsReturn?'这是暂停的故障快照，不表示失压后砖仍能悬空。实际存在掉砖风险，应按设备流程安全处置；本活动请先“放回重试”。':!q.ready?q.reason:state.leak?'故障支路已隔离。仍须复核剩余吸力和支承布点，不能仅凭还有负压就继续。':certified?'本次配置低位试提通过；改动参数后须重新试提。可提交本关，或播放完整搬运过程。':q.reason,state.needsReturn||!q.ready);
 all('[data-phase]').forEach(el=>el.classList.toggle('active',+el.dataset.phase===c.phase));window.setRigPose({...c,y:30,tileY:30,layout:state.layout,leak:state.leak});
}
function renderHeight(){
 const p=pressure(),by=103-p.base*4,gy=by-p.glue*4,ty=gy-40;
 for(const [id,y,h]of [['baseSection',by,128-by],['glueSection',gy,by-gy],['tileSection',ty,40],['glueGap',gy,by-gy]]){$(id).setAttribute('y',y);$(id).setAttribute('height',h)}
 $('tileText').setAttribute('y',ty+24);$('glueText').setAttribute('y',gy+Math.min(12,p.glue*4-2));$('baseText').setAttribute('y',by+16);text('glueText','铺贴层 '+fmt(p.glue));text('baseText','基层 '+sign(p.base));$('glueGap').toggleAttribute('hidden',!state.missing);
 metrics(['传感器测得的压实力','完成面标高','相对设计面'],[fmt(p.force,0)+'<em>N</em>',sign(p.finish)+'<em>mm</em>',sign(p.error)+'<em>mm</em>'],['教学合适窗口 120–200 N','设计面 +14.0 mm',p.damaged?'本次出现过压 · 必须重试':'教学窗口 ±0.5 mm']);
 const error=state.targetForce-p.force;text('measuredForce',fmt(p.force,0)+' N');text('forceError',sign(error,0)+' N');text('controlAction',!state.pressing?'保持 / 等待操作':state.mode==='position'?'按设定压入量运动':Math.abs(error)<8?'接近目标 · 微调':error>0?'力偏小 → 缓慢下压':'力偏大 → 回退减压');
 if($('forceNeedle'))$('forceNeedle').style.width=Math.min(100,p.force/360*100)+'%';text('stabilityTime',`${fmt(Math.min(p.settledTime,1.2))} / 1.2 s`);text('forcePlay',state.pressing?'暂停压实':reduced.matches?'推进压实 0.5 秒':'开始压实');
 text('sceneState',p.damaged?'过压记录保留 · 重新准备':p.passed?'力与标高已稳定':state.pressing?'压实力反馈中':'等待压实');text('sceneHint','压头下移 / 铺贴层压缩 · 详见右侧放大剖面');
 if($('forceHistory'))$('forceHistory').setAttribute('points',forceHistory.map((v,i)=>`${10+i*280/Math.max(1,forceHistory.length-1)},${72-Math.min(v,360)/360*60}`).join(' '));
 note(state.missing?'剖开后可见局部缺料；即使力和标高合格，也不能证明满浆、粘结或无空鼓。':p.reason,state.missing||p.damaged||!p.forceOK||!p.heightOK);
 const top=8+(p.finish-14)*.6;window.setRigPose({x:25,y:30,top,bed:top-4,layout:state.layout});
}
function render(){
 if(state.tab==='vision')renderVision();else if(state.tab==='vacuum')renderVacuum();else renderHeight();$('m3').classList.toggle('word',state.tab==='vacuum');text('missionProgress',`${Object.values(state.completed).filter(Boolean).length} / 3`);
 all('[data-tab]').forEach(b=>{b.dataset.complete=String(state.completed[b.dataset.tab]);b.setAttribute('aria-pressed',String(b.dataset.tab===state.tab))});$('nextMission').hidden=!state.completed[state.tab]||state.tab==='height';
}
function selectTab(tab){
 state.tab=tab;state.correcting=false;state.playing=false;state.lifting=false;state.pressing=false;tour=false;
 all('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));all('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==tab);
 for(const [id,v]of [['title',titles[tab][0]],['subtitle',titles[tab][1]],['panelTitle',titles[tab][2]],['missionTitle',missions[tab][0]],['missionGoal',missions[tab][1]]])text(id,v);
 text('questionText',questions[tab][0]);all('[data-answer]').forEach((b,i)=>{b.textContent=questions[tab][i+1];b.classList.remove('chosen')});text('answerFeedback','');message(state.completed[tab]?'这一关已完成，可以继续实验或进入下一关。':'操作后点击“提交本关”，检查是否满足目标。',state.completed[tab]);all('[data-phase]').forEach(b=>b.classList.remove('active'));render();run();
}
function stepVision(dt=.25){if(state.feedback){const p=M.correctPose({...state,age:state.needsReacquire?1:0},dt);state.ex=p.ex;state.ey=p.ey;state.angle=p.angle}if(observation().aligned||!observation().valid)state.correcting=false;render()}
function stepPress(dt=.5){state.press=M.pressStep(state.press,pressOptions(),dt);historyClock+=dt;if(historyClock>=.1){forceHistory.push(state.press.force);forceHistory=forceHistory.slice(-100);historyClock=0}if(state.press.passed||state.press.damaged)state.pressing=false;render()}
function advanceCycle(next){if(state.lifting||state.needsReturn){state.playing=false;message(state.needsReturn?'先放回重试，再重新验证吸附。':'低位试提进行中，请等试提结束。');return}const q=grip();if(next>state.t&&next>1&&state.t<4&&(!q.ready||state.trialSignature!==signature())){state.playing=false;message('先通过当前配置的低位试提，再开始搬运。');return}state.t=M.clamp(next,0,5);render()}
function lowLift(){
 stopTour();const q=grip();state.playing=false;if(state.needsReturn||state.t>1.001&&state.t<4&&!state.lifting){message('砖尚未放回。请先点击“放回重试”，再做低位试提。');return}state.trialSignature='';if(!q.ready){message('试提未放行：'+q.reason);render();return}
 if(reduced.matches){state.trialSignature=signature();state.t=1;message('低位试提通过，已放回：已检查本次配置的吸力、布置与密封。',true)}else{state.lifting=true;state.liftClock=0;state.t=1;message('低速抬高、短暂停留、落回；本活动按模型检查稳定条件。')}render();run();
}
function play(){
 stopTour();if(state.tab==='vision'){if(!observation().valid){message('视野恢复后，先点击“重新识别”。');return}if(reduced.matches)stepVision(.5);else state.correcting=!state.correcting}
 else if(state.tab==='height'){if(reduced.matches)stepPress(.5);else state.pressing=!state.pressing}
 else{if(state.lifting||state.needsReturn||state.trialSignature!==signature()){message(state.needsReturn?'先放回重试，再重新验证吸附。':'先完成当前配置的低位试提。');return}if(reduced.matches)advanceCycle(state.t>=5?1:Math.floor(state.t)+1);else{if(state.t>=5)state.t=1;state.playing=!state.playing}}render();run();
}
function checkMission(){
 stopTour();let pass=false,why='';
 if(state.tab==='vision'){const v=observation();pass=state.sawBlocked&&state.reacquired&&v.aligned;why=!state.sawBlocked?'还没有体验遮挡。先遮住相机，观察测量失效。':!state.reacquired?'请恢复视野并点击“重新识别”。':!v.valid?v.reason:'X、Y 或转角尚未进入窗口，继续纠偏。'}
 else if(state.tab==='vacuum'){const q=grip();pass=state.sawLeak&&Math.abs(state.offsetY)>=110&&q.ready&&state.trialSignature===signature();why=!state.sawLeak?'先模拟一只吸盘漏气，观察共用气路和隔离后的差别。':Math.abs(state.offsetY)<110?'本关要求至少 110 mm 的重心偏移；居中砖可在自由实验中比较。':!q.ready?q.reason:'请完成当前配置的低位试提。'}
 else{const p=pressure();pass=p.passed&&!state.missing;why=state.missing?'已经发现局部缺料，先恢复铺贴层，再重新压实。':p.reason}
 if(pass){state.completed[state.tab]=true;message(Object.values(state.completed).every(Boolean)?'三关完成！你已验证：有效观测才能对齐，合理吸附才能搬运，力与标高共同控制落砖。':'本关通过！可以进入下一关，也可以继续改变条件做对比。',true)}else message('暂未通过：'+why);render();
}
function resetMission(){
 stopTour();state.completed[state.tab]=false;state.correcting=false;state.playing=false;state.lifting=false;state.pressing=false;
 if(state.tab==='vision')Object.assign(state,{ex:8,ey:-5,angle:3,visibility:'clear',needsReacquire:false,feedback:true,sawBlocked:false,reacquired:false});
 if(state.tab==='vacuum')Object.assign(state,{layout:'single',vacuum:60,mass:12,spread:.6,offsetY:110,surface:'smooth',isolated:false,leak:false,t:0,trialSignature:'',needsReturn:false,sawLeak:false});
 if(state.tab==='height'){Object.assign(state,{press:{},base:0,stiffness:80,mode:'force',targetForce:160,targetCompression:2,missing:false});forceHistory=[]}syncInputs();message('本关已重新开始，按目标完成操作后提交。');render();
}
function tick(now){
 frame=0;const dt=last?Math.min((now-last)/1000,1/30):0;last=now;
 if(!document.hidden&&state.visible&&!reduced.matches){
  if(!state.touched){idleTime+=dt;if(idleTime>1.4&&!tour){tour=true;state.correcting=true}if(idleTime>5.5){state.correcting=false;const ease=1-Math.exp(-dt*2);state.ex+=(8-state.ex)*ease;state.ey+=(-5-state.ey)*ease;state.angle+=(3-state.angle)*ease}if(idleTime>9){state.correcting=true;idleTime=1.5}}
  if(state.correcting&&state.tab==='vision')stepVision(dt);
  if(state.lifting){state.liftClock+=dt;const f=state.liftClock;state.t=f<1?1+.25*M.smooth(f):f<1.8?1.25:1+.25*(1-M.smooth((f-1.8)/.7));if(f>=2.5){state.lifting=false;state.t=1;state.trialSignature=signature();message('低位试提通过，配置变更后须重新试提。',true)}}
  if(state.playing){advanceCycle(state.t+dt*.45);if(state.t>=5)state.playing=false}if(state.pressing&&state.tab==='height')stepPress(dt);render();
 }if(state.visible&&!document.hidden&&!reduced.matches&&(state.correcting||state.playing||state.lifting||state.pressing||!state.touched))frame=requestAnimationFrame(tick);
}
function run(){if(!frame&&!document.hidden&&state.visible){last=0;frame=requestAnimationFrame(tick)}}
all('[data-tab]').forEach(b=>b.onclick=()=>{stopTour();selectTab(b.dataset.tab)});
for(const [id,key]of [['errorX','ex'],['errorY','ey'],['errorAngle','angle']])$(id).oninput=()=>{stopTour();state.correcting=false;state[key]=+$(id).value;updateOutputs();render()};
$('feedback').onchange=()=>{stopTour();state.feedback=$('feedback').checked;state.correcting=false;render()};
$('visibility').onchange=()=>{stopTour();state.visibility=$('visibility').value;state.correcting=false;state.needsReacquire=true;if(state.visibility!=='clear'){state.sawBlocked=true;state.reacquired=false}render()};
$('reacquire').onclick=()=>{stopTour();if(state.visibility!=='clear'){message('先移开遮挡，让相机重新看到足够的砖边。');return}state.needsReacquire=false;if(state.sawBlocked)state.reacquired=true;message('已重新获取当前砖边和转角，可以恢复纠偏。',true);render()};
$('correct').onclick=play;$('visionStep').onclick=()=>{stopTour();state.correcting=false;stepVision()};
$('disturb').onclick=()=>{stopTour();state.correcting=false;state.ex=8;state.ey=-5;state.angle=3;syncInputs();render()};
if($('blindContinue'))$('blindContinue').onclick=()=>{stopTour();if(observation().valid){message('先遮挡相机，再注入一次砖块滑移，比较真实砖位与旧观测。');return}state.ex=M.clamp(state.ex+3,-10,10);state.angle=M.clamp(state.angle+1,-6,6);message('已另行注入砖块滑移：主图砖位变化，失效的旧观测没有更新。遮挡本身不会使砖必然滑动。');render()};
for(const id of ['layout','vacuum','mass','spread','offsetY','surface','isolated','leak']){
 const el=$(id),change=()=>{stopTour();const structural=['layout','spread','mass','offsetY','surface'].includes(id);if(structural&&(state.needsReturn||state.t>1.001&&state.t<4)){el.value=state[id];message('砖尚未放回，不能更换吸盘或工件条件。先点击“放回重试”。');return}state[id]=el.type==='checkbox'?el.checked:['vacuum','mass','spread','offsetY'].includes(id)?+el.value:el.value;state.trialSignature='';state.lifting=false;state.playing=false;if(state.t>1.001&&state.t<4)state.needsReturn=true;if(id==='leak'&&state.leak)state.sawLeak=true;if(structural){state.t=0;state.needsReturn=false}updateOutputs();render()};if(el.type==='range')el.oninput=change;else el.onchange=change;
}
$('lowLift').onclick=lowLift;$('cyclePlay').onclick=play;$('cycleStep').onclick=()=>{stopTour();state.playing=false;advanceCycle(Math.floor(state.t+.0001)+1)};$('cycleReset').onclick=()=>{stopTour();state.playing=false;state.lifting=false;state.t=0;state.needsReturn=false;state.trialSignature='';render()};
for(const [id,key]of [['mode','mode'],['stiffness','stiffness'],['targetForce','targetForce'],['compression','targetCompression'],['base','base']]){
 const el=$(id),change=()=>{stopTour();state[key]=key==='mode'?el.value:+el.value;state.press=M.pressModel({...state.press,...pressOptions(),settledTime:0});updateOutputs();render();run()};if(el.type==='range')el.oninput=change;else el.onchange=change;
}
$('forcePlay').onclick=play;$('forceStep').onclick=()=>{stopTour();state.pressing=false;stepPress(.5)};
$('heightReset').onclick=()=>{stopTour();state.press={};state.pressing=false;state.missing=false;$('missing').checked=false;forceHistory=[];message('已重新准备铺贴层，本次过压记录已清除。当前目标和材料设置保留。');render()};
$('raised').onclick=()=>{stopTour();state.base=2;state.press=M.pressModel({...state.press,...pressOptions(),settledTime:0});syncInputs();render()};
$('missing').onchange=()=>{stopTour();state.missing=$('missing').checked;state.press.settledTime=0;render()};
$('missionCheck').onclick=checkMission;$('missionReset').onclick=resetMission;$('nextMission').onclick=()=>{stopTour();selectTab(tabs[Math.min(2,tabs.indexOf(state.tab)+1)])};
all('[data-phase]').forEach(b=>b.onclick=()=>{stopTour();selectTab('vacuum');advanceCycle(+b.dataset.phase)});
all('[data-answer]').forEach(b=>b.onclick=()=>{stopTour();all('[data-answer]').forEach(e=>e.classList.toggle('chosen',e===b));text('answerFeedback',(b.dataset.answer==='1'?'判断正确。':'再观察一次。')+questions[state.tab][3])});
$('theme').onclick=()=>{stopTour();document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light'};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{text('fullscreen','请使用浏览器全屏')}}$('fullscreen').onclick=fullscreen;
for(const [button,id]of [['help','helpDialog'],['sources','sourcesDialog']])$(button).onclick=()=>{stopTour();state.correcting=false;state.playing=false;state.pressing=false;state.lifting=false;render();$(id).showModal()};all('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$('mobileToggle').onclick=()=>document.querySelector('.controls').scrollIntoView({behavior:reduced.matches?'instant':'smooth',block:'start'});
new IntersectionObserver(entries=>{$('mobileToggle').hidden=entries.at(-1).isIntersecting}).observe($('controlPanel'));
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','BUTTON','TEXTAREA'].includes(e.target.tagName))return;if([' ','ArrowRight','1','2','3','f','F'].includes(e.key)){e.preventDefault();stopTour()}if(e.key===' ')play();if(['1','2','3'].includes(e.key))selectTab(tabs[+e.key-1]);if(['f','F'].includes(e.key))fullscreen();if(e.key==='ArrowRight'){state.correcting=false;state.pressing=false;state.playing=false;if(state.tab==='vision')stepVision();else if(state.tab==='height')stepPress(.5);else advanceCycle(Math.floor(state.t)+1)}});
document.addEventListener('pointerdown',stopTour,{capture:true});document.addEventListener('focusin',stopTour);$('stage').addEventListener('pointerenter',()=>{stopTour();render()});
document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)run()});new IntersectionObserver(entries=>{state.visible=entries.at(-1).isIntersecting;if(state.visible)run()},{rootMargin:'120px'}).observe($('app'));
reduced.addEventListener('change',()=>{state.correcting=false;state.playing=false;state.pressing=false;state.lifting=false;stopTour();render()});
window.tilingLab={snapshot:()=>({...state,observation:observation(),grip:grip(),press:pressure(),cached:{...cached},cycle:M.cycle(state.t)}),selectTab};
syncInputs();selectTab('vision');run();
})();
