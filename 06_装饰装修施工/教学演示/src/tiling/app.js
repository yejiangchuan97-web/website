const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)],fmt=(v,n=1)=>Math.abs(v)<.00001?(0).toFixed(n):v.toFixed(n),sign=(v,n=1)=>(v>=0?'+':'−')+Math.abs(v).toFixed(n);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={tab:'vision',ex:8,ey:-5,correcting:false,vacuum:60,mass:12,leak:false,t:0,playing:false,base:0,compression:2,missing:false,speed:1,touched:false,visible:true};
const svg=$('drawing').querySelector('svg'),parts=all('[data-part]'),rod=parts.find(n=>n.dataset.group==='rod'),bedPart=parts.find(n=>n.dataset.part==='adhesive');
const captions={vision:['把一块砖，铺到正确的位置。','相机观测偏差，控制器修正位置；看不清时，停止盲目纠偏。','视觉伺服实验'],vacuum:['吸得住，才允许把砖提起来。','负压、有效面积与载荷共同决定搬运余量；起吊后仍需持续监测。','吸附与搬运实验'],height:['压力相同，完成面未必相同。','把基层、胶层和砖厚分开看；用标高反馈补上力控看不到的信息。','压实与标高实验']};
const questions={vision:['相机被遮挡后，能用上一帧继续纠偏吗？','可以继续','应暂停修正','观测无效时应保持位置，恢复观测后再纠偏。'],vacuum:['检测到负压，就能直接允许起吊吗？','有负压即可','还要比较载荷','还需比较有效吸力与含安全系数的搬运需求。'],height:['砖缝和完成面都正常，能证明没有空鼓吗？','可以证明','仍需实体复核','几何与过程参数不等于内部粘结证据，仍需实体复核。']};
let frame=0,last=0,lastPose='',lastNote='',idleTime=0,idleTour=false;
function metrics(labels,values,notes){for(let i=1;i<=3;i++){$('m'+i+'label').textContent=labels[i-1];$('m'+i).innerHTML=values[i-1];$('m'+i+'note').textContent=notes[i-1]}}
function note(text,warning=false){if(lastNote!==text){$('statusNote').textContent=text;lastNote=text}$('statusNote').classList.toggle('warning',warning)}
function pose(p){
 const key=[p.x,p.y,p.top,p.tileX,p.tileY,p.tileTop,p.bed||4].map(v=>v.toFixed(3)).join(',');if(key===lastPose)return;lastPose=key;
 for(const part of parts){const g=part.dataset.group;let d=null;if(g==='cart')d=[p.x-25,0,0];if(g==='yslide')d=[p.x-25,p.y-30,0];if(g==='head')d=[p.x-25,p.y-30,p.top-40];if(g==='tile')d=[p.tileX-25,p.tileY-30,p.tileTop-40];if(d)part.setAttribute('transform',translateAlong(PROJECTION,d))}
 const r={x:p.x-3,y:p.y,w:6,d:6,r:1};rod.innerHTML=solidSvg(slabOf(r,p.top+25,55-p.top,PROJECTION,4,.55),{tone:'hi'});
 bedPart.innerHTML=solidSvg(slabOf({x:-10,y:-5,w:70,d:70,r:1},0,p.bed||4,PROJECTION,4,.55),{tone:'lo'});
}
function render(){
 const tab=state.tab;let p={x:25,y:30,top:40,tileX:25,tileY:30,tileTop:40};
 if(tab==='vision'){
  const valid=!$('blocked').checked,enabled=$('feedback').checked,done=Math.max(Math.abs(state.ex),Math.abs(state.ey))<=SETTINGS.visionTolerance;
  p.x=p.tileX=25+state.ex*.6;p.y=p.tileY=30+state.ey*.6;
  $('cameraTile').setAttribute('transform',`translate(${state.ex*1.28} ${state.ey*1.28})`);
  $('cameraTile').setAttribute('opacity',valid?'1':'.15');$('occlusion').toggleAttribute('hidden',valid);$('occlusionText').toggleAttribute('hidden',valid);
  const status=!valid?'观测失效':!enabled?'反馈关闭':idleTour&&idleTime>=6.5?'回放初始偏差':done?'对位到窗':state.correcting?'正在纠偏':'等待纠偏';
  metrics(['X 方向误差','Y 方向误差','控制状态'],[sign(state.ex,2)+'<em>mm</em>',sign(state.ey,2)+'<em>mm</em>',status],[valid?'实测位置 − 目标位置':'保留上次有效观测',valid?'两个方向同时收敛':'保留上次有效观测','教学窗口：每轴 ±0.5 mm']);
  $('sceneState').textContent=status;$('correct').textContent=state.correcting?'暂停纠偏':'开始纠偏';
  note(!valid?'相机观测失效：保持当前末端位置，等待视野恢复。':!enabled?'反馈关闭：保留当前偏差，不再依据误差修正位置。':done?'已进入教学对位窗口。对齐只回答“放在哪里”，还需检查吸附、标高与贴合。':state.correcting?'控制器用当前误差逐步修正，误差越小，每次调整越小。':'先制造偏差，再开启反馈，看误差如何逐渐收敛。',!valid||!enabled);
 }else if(tab==='vacuum'){
  const q=suction(state.vacuum,state.mass,state.leak),c=cycle(state.t);p={...c,y:30,tileY:30};
  const inContact=state.t>=1&&state.t<4,interlocked=!q.ready&&inContact;
  metrics(['可用理论吸力','搬运需求','能力 / 需求'],[fmt(q.holding,0)+'<em>N</em>',fmt(q.required,0)+'<em>N</em>',fmt(q.ratio,2)+' ×'],[q.cups+' 个有效吸盘 · 压差 '+state.vacuum+' kPa','安全系数 2 · 含竖向加速度',q.ready?'教学联锁：允许搬运':'教学联锁：禁止继续起吊']);
  $('holdNumber').textContent=fmt(q.holding,0)+' N';$('needNumber').textContent=fmt(q.required,0)+' N';$('holdBar').style.width=Math.min(q.holding/1700*100,100)+'%';$('needBar').style.width=Math.min(q.required/1700*100,100)+'%';
  $('sceneState').textContent=interlocked?'吸附不足 · 动作联锁':['接近砖面','接触 / 建立吸附','抬起 / 横移','下降 / 接触','释放 / 回升'][c.phase];
  $('cyclePlay').textContent=state.playing?'暂停搬运':state.t>=5?'重新演示':'播放搬运';
  note(interlocked?'吸力不足：演示冻结在当前姿态。提高真空度、减小载荷或恢复吸盘后，再继续。':!q.ready?'当前吸力低于需求；末端可接近砖面，但接触后不能起吊。':state.t>=5?'砖已落位，末端释放并回升。下一步仍需进行砖缝、标高与贴合复核。':`吸力为需求的 ${fmt(q.ratio,2)} 倍。${state.leak?'一只吸盘已隔离失效，其余三只继续提供吸力。':'四只吸盘有效，满足本例搬运条件。'}`,!q.ready);
  all('[data-phase]').forEach(el=>el.classList.toggle('active',+el.dataset.phase===c.phase));
 }else{
  const h=level(state.base,state.compression);p.top=p.tileTop=8+(h.finish-14)*.6;p.bed=p.tileTop-4;
  metrics(['附加压实力（模型）','完成面标高','相对设计面'],[fmt(h.force,0)+'<em>N</em>',sign(h.finish,1)+'<em>mm</em>',sign(h.error,1)+' mm'],['去皮后 F = 80 × 压入量 δ','基层 + 胶层 + 砖厚','设计完成面 +14.0 mm']);
  const by=103-h.base*4,gy=by-h.glue*4,ty=gy-40;
  for(const [id,y,h]of [['baseSection',by,128-by],['glueSection',gy,by-gy],['tileSection',ty,40],['glueGap',gy,by-gy]]){$(id).setAttribute('y',y);$(id).setAttribute('height',h)}
  $('tileText').setAttribute('y',ty+24);$('glueText').setAttribute('y',gy+Math.min(12,h.glue*4-2));$('baseText').setAttribute('y',by+16);$('glueText').textContent='胶层 '+fmt(h.glue);$('baseText').textContent='基层 '+sign(h.base);$('glueGap').toggleAttribute('hidden',!state.missing);
  $('sceneState').textContent=state.missing?'缺胶案例 · 表面数据相同':Math.abs(h.error)>.05?(h.error>0?'完成面偏高':'完成面偏低'):'完成面到位';
  note(state.missing?'这是预设缺胶剖面：表面位置和力读数保持相同。内部缺陷不能由这些读数排除。':Math.abs(h.error)>.05?`完成面${h.error>0?'高出':'低于'}设计 ${fmt(Math.abs(h.error))} mm。${state.base>0?'先复核基层，不能仅靠继续下压弥补基层问题。':'继续观察压入量对胶层和完成面的影响。'}`:'本例基层 0 + 胶层 4 + 砖厚 10 = 完成面 14 mm。保持压入量，试着抬高基层。',state.missing||Math.abs(h.error)>.05);
 }
 pose(p);
}
function stopTour(){state.touched=true;idleTour=false}
function selectTab(tab){state.tab=tab;state.correcting=false;state.playing=false;idleTour=false;all('[data-tab]').forEach(el=>{const a=el.dataset.tab===tab;el.classList.toggle('active',a);el.setAttribute('aria-pressed',a)});all('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==tab);[$('title').textContent,$('subtitle').textContent,$('panelTitle').textContent]=captions[tab];const q=questions[tab];$('questionText').textContent=q[0];all('[data-answer]').forEach((el,i)=>{el.textContent=q[i+1];el.classList.remove('chosen')});$('answerFeedback').textContent='';all('[data-phase]').forEach(el=>el.classList.remove('active'));render();run()}
function advanceCycle(next){const q=suction(state.vacuum,state.mass,state.leak);if(!q.ready&&next>state.t&&next>1&&state.t<4){state.t=Math.max(state.t,Math.min(next,1));state.playing=false}else state.t=clamp(next,0,5);render()}
function stepVision(){const p=visionStep(state.ex,state.ey,$('feedback').checked,!$('blocked').checked,.25);Object.assign(state,p);render()}
function togglePlay(){stopTour();if(state.tab==='vision'){state.correcting=!state.correcting;if(reduced.matches){stepVision();state.correcting=false}}else if(state.tab==='vacuum'){if(reduced.matches)advanceCycle(state.t>=5?0:Math.floor(state.t)+1);else{if(state.t>=5)state.t=0;state.playing=!state.playing}}render();run()}
function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,1/30):0;last=now;if(!document.hidden&&state.visible){
 if(!state.touched&&!reduced.matches){idleTime+=dt;if(idleTime>1.4&&!idleTour){idleTour=true;state.correcting=true}if(idleTime>=6.5){state.correcting=false;const ease=1-Math.exp(-dt*1.5);state.ex+=(8-state.ex)*ease;state.ey+=(-5-state.ey)*ease}if(idleTime>11){state.correcting=true;idleTime=1.5}}
 if(state.tab==='vision'&&state.correcting&&!reduced.matches){Object.assign(state,visionStep(state.ex,state.ey,$('feedback').checked,!$('blocked').checked,dt));if(Math.max(Math.abs(state.ex),Math.abs(state.ey))<=SETTINGS.visionTolerance)state.correcting=false}
 if(state.tab==='vacuum'&&state.playing&&!reduced.matches){advanceCycle(state.t+dt*.36*state.speed);if(state.t>=5)state.playing=false}
 render();
 }if(state.visible&&!document.hidden&&(state.correcting||state.playing||(!state.touched&&!reduced.matches)))frame=requestAnimationFrame(tick)}
function run(){if(!frame&&state.visible&&!document.hidden){last=0;frame=requestAnimationFrame(tick)}}
all('[data-tab]').forEach(el=>el.onclick=()=>{stopTour();selectTab(el.dataset.tab)});
for(const id of ['errorX','errorY'])$(id).oninput=()=>{stopTour();state.correcting=false;state[id==='errorX'?'ex':'ey']=+$(id).value;$(id+'Out').textContent=sign(+$(id).value,0)+' mm';render()};
for(const id of ['feedback','blocked'])$(id).onchange=()=>{stopTour();render();run()};
$('correct').onclick=togglePlay;$('visionStep').onclick=()=>{stopTour();state.correcting=false;stepVision()};$('disturb').onclick=()=>{stopTour();state.ex=8;state.ey=-5;state.correcting=false;$('errorX').value=8;$('errorY').value=-5;$('errorXOut').textContent='+8 mm';$('errorYOut').textContent='−5 mm';render()};
for(const [id,unit]of [['vacuum','kPa'],['mass','kg'],['base','mm'],['compression','mm']])$(id).oninput=()=>{stopTour();state[id]=+$(id).value;$(id+'Out').textContent=fmt(state[id],id==='compression'||id==='base'?1:0)+' '+unit;render();run()};
$('leak').onchange=()=>{stopTour();state.leak=$('leak').checked;render();run()};$('missing').onchange=()=>{stopTour();state.missing=$('missing').checked;render()};
$('cyclePlay').onclick=togglePlay;$('cycleStep').onclick=()=>{stopTour();state.playing=false;advanceCycle(Math.floor(state.t+.0001)+1)};$('cycleReset').onclick=()=>{stopTour();state.playing=false;state.t=0;render()};$('speed').onchange=()=>{stopTour();state.speed=+$('speed').value};
all('[data-phase]').forEach(el=>el.onclick=()=>{stopTour();selectTab('vacuum');advanceCycle(+el.dataset.phase)});
$('raised').onclick=()=>{stopTour();state.base=4;$('base').value=4;$('baseOut').textContent='4 mm';render()};$('heightReset').onclick=()=>{stopTour();Object.assign(state,{base:0,compression:2,missing:false});$('base').value=0;$('baseOut').textContent='0 mm';$('compression').value=2;$('compressionOut').textContent='2.0 mm';$('missing').checked=false;render()};
all('[data-answer]').forEach(el=>el.onclick=()=>{stopTour();all('[data-answer]').forEach(b=>b.classList.toggle('chosen',b===el));$('answerFeedback').textContent=(el.dataset.answer==='1'?'判断正确。':'再想一想。')+questions[state.tab][3]});
$('theme').onclick=()=>{stopTour();document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light'};
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{$('fullscreen').textContent='请使用浏览器 F11'}}$('fullscreen').onclick=fullscreen;document.addEventListener('fullscreenchange',()=>{$('fullscreen').innerHTML=document.fullscreenElement?'⛶ <span>退出全屏</span>':'⛶ <span>全屏演示</span>'});
for(const [button,id]of [['help','helpDialog'],['sources','sourcesDialog']])$(button).onclick=()=>{stopTour();state.correcting=false;state.playing=false;render();$(id).showModal()};all('[data-close]').forEach(el=>el.onclick=()=>el.closest('dialog').close());
$('mobileToggle').onclick=()=>{stopTour();const yes=$('app').classList.toggle('mobile-controls');$('mobileToggle').textContent=yes?'切换到机器人模型':'切换到实验面板'};
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;if([' ','ArrowLeft','ArrowRight','1','2','3','f','F'].includes(e.key)){e.preventDefault();stopTour()}if(e.key===' ')togglePlay();if(e.key==='f'||e.key==='F')fullscreen();if(['1','2','3'].includes(e.key))selectTab(['vision','vacuum','height'][+e.key-1]);if(e.key==='ArrowRight'){if(state.tab==='vision')stepVision();else if(state.tab==='vacuum'){state.playing=false;advanceCycle(Math.floor(state.t)+1)}}if(e.key==='ArrowLeft'&&state.tab==='vacuum'){state.playing=false;advanceCycle(Math.max(0,Math.ceil(state.t)-1))}});
document.addEventListener('pointerdown',()=>{if(idleTour)state.correcting=false;stopTour()},{capture:true});document.addEventListener('focusin',()=>{if(idleTour)state.correcting=false;stopTour()});document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)run()});
$('stage').addEventListener('pointerenter',()=>{if(idleTour){state.correcting=false;stopTour();render()}});
new IntersectionObserver(entries=>{state.visible=entries.at(-1).isIntersecting;if(state.visible)run()}).observe($('app'));
reduced.addEventListener('change',()=>{state.playing=false;state.correcting=false;render()});
window.tilingLab={snapshot:()=>({...state,suction:suction(state.vacuum,state.mass,state.leak),level:level(state.base,state.compression),cycle:cycle(state.t)}),selectTab};
selectTab('vision');run();
