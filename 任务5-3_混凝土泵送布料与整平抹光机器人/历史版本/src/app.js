const $=id=>document.getElementById(id), $$=s=>[...document.querySelectorAll(s)];
const NS='http://www.w3.org/2000/svg', P=PROJECTION;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={tab:'level',head:0,reference:0,feedback:true,levelRun:!reduced.matches,timingRun:false,timing:0,material:'ready',coverageRun:false,coverage:0,spacing:.72,angle:0,idle:true,clock:0};
let route=M.routeOf(state.spacing), frame=0,last=0,visible=true,coverageDirty=true,timingDirty=true;
const signs=n=>(Math.abs(n)<.05?'0.0':(n>0?'+':'')+n.toFixed(1));
const levelSVG=$('levelScene').querySelector('svg'),trowelSVG=$('trowelScene').querySelector('svg');
levelSVG.setAttribute('viewBox','70 25 860 520');
trowelSVG.setAttribute('viewBox','225 175 550 375');
function newG(id,parent){const g=document.createElementNS(NS,'g');g.id=id;parent.append(g);return g;}
const laser=newG('laserReference',levelSVG),datum=newG('designReference',levelSVG);
const trace=newG('surfaceTrace',trowelSVG);
trowelSVG.querySelector('[data-name="stand.coupon"]').after(trace);
const levelParts=$$('#levelScene [data-head]'),rods=$$('#levelScene [data-rod]');
const trowelParts=$$('#trowelScene [data-name]').filter(el=>!el.dataset.name.startsWith('stand.')&&el.dataset.name!=='ruler');
const blades=$$('#trowelScene [data-blade]');
const paragraphs={
  level:{eyebrow:'LASER / ELEVATION CONTROL',title:'平，并不等于标高正确。',subtitle:'让刮板跟随激光，再用独立的设计标高检查它。',panel:'标高控制实验',badge:'整平头局部教学台 · 位移放大',caption:'激光是参照；接收器随刮板升降。示意台省略底盘与供油回路。',labels:['接收器相对激光','刮板相对设计标高','执行机构'],hints:['e = 刮板 − 激光设定','独立核验，不随激光移动','接收 → 比较 → 调整'],question:'接收偏差为 0，能确认设计标高正确吗？',answers:['能','还不能'],correct:1,explain:'还要核对激光与设计标高。相对偏差归零，只说明刮板跟上了激光。',guide:'先改变基准，再做判断。',lessons:[['接收器测相对偏差','测到的是与激光基准的关系，并非直接读取设计图。'],['油缸修正刮板高度','刮板偏高则下降，偏低则上升，逐渐接近设定。'],['基准仍须独立复核','基准设错时，闭环也可以稳定地做出错误标高。']]},
  timing:{eyebrow:'TROWEL / MATERIAL WINDOW',title:'动作相同，结果未必相同。',subtitle:'双转子做同样一遍动作，改变的只有材料状态。',panel:'抹光时机实验',badge:'双转子机构 · 慢速教学回放',caption:'抹痕仅表达情境差别，不模拟密实度、强度或表面合格率。',labels:['材料情境','回放进度','观察结果'],hints:['不是浇筑后的固定分钟数','同一动作，用于比较','现场仍须核实材料状态'],question:'看起来表面变亮了，就适宜继续抹光吗？',answers:['可以继续','还需核实'],correct:1,explain:'表面光亮不足以判断时机；仍需核实泌水与材料承载状态。',guide:'先选择“过早”，观察同样动作。',lessons:[['先判断材料状态','表面结皮或光泽，并不意味着内部已停止泌水。'],['再看刀片如何接触','电机带动输出轴与刀片，双转子在材料表面工作。'],['均匀不能代替复核','大面重复作业之后，仍要处理边角并按要求养护。']]},
  coverage:{eyebrow:'COVERAGE / EDGE CONDITIONS',title:'走完路线，不等于抹遍地面。',subtitle:'放大行间距，查看漏带；再看护圈到不了的边角。',panel:'路径覆盖实验',badge:'俯视样板 · 工具扫掠面积',caption:'覆盖 = 双圆工具扫掠面积的网格估算；不表示材料或表面质量合格。',labels:['样板几何覆盖率','样板未覆盖面积','路径状态'],hints:['以整块 15.36 m² 为分母','包含边界预留与行间遗漏','边角仍需人工或专用工具'],question:'路径已走完、覆盖率较高，能直接判为合格吗？',answers:['可以验收','仍须复核'],correct:1,explain:'路径完成只代表计划运动结束；还要复核遗漏、材料状态和表面质量。',guide:'把行距调到 1.20 m，再查看走完。',lessons:[['行间距影响搭接','行间距超过单盘直径时，中间可能出现连续漏带。'],['护圈大于工作刀片','机器边界和实际作业边界不同，角落还会有残留。'],['把遗漏交给下一步','记录未覆盖区域，再安排人工或专用设备补作业。']]}
};
function setText(id,t){if($(id).textContent!==t)$(id).textContent=t;}
function metric(id,value,unit=''){const html=value+(unit?'<small> '+unit+'</small>':'');if($(id).innerHTML!==html)$(id).innerHTML=html;}
function markButtons(){
  $('levelPlay').textContent=state.levelRun?'Ⅱ 暂停':'▶ 继续调平';
  $('timingPlay').textContent=state.timingRun?'Ⅱ 暂停回放':state.timing>=1?'↺ 再回放一遍':'▶ 回放一遍';
  $('coveragePlay').textContent=state.coverageRun?'Ⅱ 暂停行走':state.coverage>=1?'↺ 重新行走':'▶ 开始行走';
}
function stopIdle(){state.idle=false;}
$('drawing').addEventListener('pointerenter',stopIdle);
$('drawing').addEventListener('focusin',stopIdle);
function tabTo(tab){
  state.tab=tab;const i=['level','timing','coverage'].indexOf(tab),c=paragraphs[tab];
  $$('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===tab));
  $$('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab);
  $('levelScene').hidden=tab!=='level';$('trowelScene').hidden=tab!=='timing';$('coverageScene').hidden=tab!=='coverage';
  for(const [id,key]of [['eyebrow','eyebrow'],['title','title'],['subtitle','subtitle'],['panelTitle','panel'],['sceneBadge','badge'],['caption','caption'],['questionText','question'],['answerFeedback','guide']])setText(id,c[key]);
  ['A','B','C'].forEach((s,n)=>{setText('metricLabel'+s,c.labels[n]);setText('metricHint'+s,c.hints[n]);setText('lesson'+s,c.lessons[n][0]);setText('lesson'+s+'Text',c.lessons[n][1]);});
  $('metricA').classList.toggle('word',tab==='timing');$('metricB').classList.remove('word');
  $('answers').innerHTML=c.answers.map((a,i)=>'<button data-answer="'+i+'">'+a+'</button>').join('');
  setText('figureNo','FIG 0'+(i+1));setText('pageIndex','0'+(i+1)+' / 03');
  setText('lessonHeading',tab==='level'?'看见动作，也要读懂依据。':tab==='timing'?'先看状态，再做同样动作。':'看路线，也看它留下什么。');
  setText('lessonSub',tab==='level'?'从参照、反馈到独立复核':tab==='timing'?'从材料、机构到表面表现':'从轨迹、扫掠到遗漏检查');
  setText('next',i===2?'回到实验 01 ↺':'下一实验 →');coverageDirty=true;timingDirty=true;draw();run();
}
function setSolid(el,paths){
  const solid=el.querySelector('.iso-solid');if(!solid)return;
  const pairs=[['.iso-fill',paths.fill],['.iso-top',paths.top],['.iso-edge',paths.outline],['.iso-crease',paths.crease],['.iso-bevel',paths.bevel]];
  for(const [sel,d] of pairs){const node=solid.querySelector(sel);if(node)node.setAttribute('d',d||'');}
  solid.querySelectorAll('.iso-shade').forEach(n=>n.setAttribute('d',paths.shades[Number(n.dataset.shade)]||''));
}
function drawLevel(){
  const h=state.head*1.6,ref=state.reference*1.6;
  levelParts.forEach(el=>el.setAttribute('transform',translateAlong(P,[0,0,h])));
  $$('#levelScene [data-laser]').forEach(el=>el.setAttribute('transform',translateAlong(P,[0,0,ref])));
  setSolid(levelSVG.querySelector('[data-name="laser.post"]'),slabOf({x:-150,y:68,w:6,d:6,r:1.2},5,112+ref,P,5,.5));
  rods.forEach(el=>setSolid(el,cylinder(Number(el.dataset.rod),-42,2.6,51+h,22-h,P,48,.35)));
  const plane=[[-147,71],[-147,-33],[115,-33],[115,71]];
  laser.innerHTML='<path class="laser-plane" d="'+onTop(plane,126+ref,P,true)+'"/>';
  datum.innerHTML='<path class="datum-line" d="'+segment([-135,27,23],[135,27,23],P)+'"/>';
  const r=M.levelReadout(state.head,state.reference);
  metric('metricA',signs(r.receiver),'mm');metric('metricB',signs(r.design),'mm');setText('metricC',!state.feedback?'锁定':!state.levelRun&&Math.abs(r.receiver)>.15?'已暂停':r.action);
  setText('readout',state.feedback?'闭环开启':'反馈关闭');
  let note=!state.feedback?'反馈已关闭：刮板保持当前高度，即使接收器仍有偏差。':Math.abs(r.receiver)>.15?'接收器'+(r.receiver>0?'高于':'低于')+'激光基准，控制器要求刮板'+r.action+'。':Math.abs(r.design)>.2?'接收偏差已经接近 0，但相对设计仍偏'+(r.design>0?'高 ':'低 ')+Math.abs(r.design).toFixed(1)+' mm。闭环跟随了错误的基准。':'相对激光与相对设计均接近 0。本例基准设定正确。';
  setText('levelNote',note);
}
function drawTiming(){
  const x=(state.timing-.5)*65;
  for(const el of trowelParts)el.setAttribute('transform',translateAlong(P,[x,0,0]));
  for(const el of blades){const [cx,n]=el.dataset.blade.split(',').map(Number);setSolid(el,extrude(bladeRing(cx,state.angle*(cx<0?1:-1)+n*Math.PI/2),0,1.2,P,{convex:false}));}
  if(timingDirty){
    let traces='';const count=Math.floor(state.timing*27);
    for(let i=0;i<count;i++)for(const cx of [-46,46]){
      const tx=cx+(i/27-.5)*65;
      if(state.material==='ready'){traces+='<path class="trace" d="'+ring(tx,0,30,.05,P,54)+'"/>';}
      if(state.material==='early'){traces+='<path class="trace early" d="'+ring(tx,0,31+(i%3),.05,P,54)+'"/>';}
      if(state.material==='late'&&i%3===0){traces+='<path class="trace late" d="'+onTop([[tx-16,-22],[tx+19,-17],[tx+16,22],[tx-14,18]],.05,P,true)+'"/>';}
    }
    trace.innerHTML=traces;timingDirty=false;
  }
  const m=M.materials[state.material];
  metric('metricA',m.name.split(' · ')[0]);metric('metricB',Math.round(state.timing*100),'%');setText('metricC',state.timing===0?'等待回放':state.material==='early'?'推浆 / 压痕':state.material==='ready'?'纹理趋匀':'纹理残留');
  setText('materialNote',m.result+'。'+m.detail);setText('materialAction',m.action+'。');setText('readout',state.timingRun?'动作慢放中':state.timing>=1?'本遍回放结束':'等待观察');
  $('timingProgress').value=state.timing;setText('timingValue',Math.round(state.timing*100)+'%');
}
function mapPoint(p){return [128+p[0]*155,40+p[1]*155];}
function drawCoverage(){
  if(!coverageDirty)return;coverageDirty=false;
  const result=M.coverageAt(route,state.coverage);
  let d='';for(const c of result.cells)if(c.hit){const x=128+c.i*744/result.cols,y=40+c.j*496/result.rows;d+=`M${x.toFixed(2)} ${y.toFixed(2)}h${(744/result.cols+.08).toFixed(2)}v${(496/result.rows+.08).toFixed(2)}h-${(744/result.cols+.08).toFixed(2)}Z`;}
  $('mapInside').innerHTML='<path class="covered-cell" d="'+d+'"/>';
  $('mapRoute').setAttribute('d',pathOf(route.points.map(mapPoint)));
  const [x,y]=mapPoint(M.positionAt(route,state.coverage));
  let robot='';for(const offset of [-M.HALF_CENTERS,M.HALF_CENTERS]){
    const cx=offset*155;robot+=`<circle class="guard" cx="${cx}" cy="0" r="${M.GUARD_R*155}"/>`;
    for(let i=0;i<4;i++)robot+=`<path class="blade" d="M${cx+8} -6 L${cx+60} -12 L${cx+63} 7 L${cx+8} 6Z" transform="rotate(${i*90+state.coverage*720} ${cx} 0)"/>`;
    robot+=`<circle class="deck" cx="${cx}" cy="0" r="17"/>`;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;robot+=`<circle cx="${cx+M.GUARD_R*155*Math.cos(a)}" cy="${M.GUARD_R*155*Math.sin(a)}" r="1.5" fill="var(--ink)"/>`;}
  }
  robot+='<rect class="deck" x="-42" y="-20" width="84" height="40" rx="5"/><rect class="deck" x="-28" y="-14" width="56" height="28" rx="3"/><circle class="deck" cx="0" cy="0" r="9"/>';
  $('mapMachine').innerHTML=robot;$('mapMachine').setAttribute('transform',`translate(${x} ${y})`);
  metric('metricA',result.percent.toFixed(1),'%');metric('metricB',((1-result.covered/result.total)*M.W*M.H).toFixed(2),'m²');setText('metricC',state.coverage>=1?'路线完成':state.coverageRun?'行走中':'待行走');
  $('coverageProgress').value=state.coverage;setText('coverageValue',Math.round(state.coverage*100)+'%');setText('readout','行距 '+state.spacing.toFixed(2)+' m');
  setText('coverageNote',state.coverage>=1?(state.spacing>M.TOOL_R*2?'行距大于单盘直径，行间留下漏带。':'行间有搭接，但护圈限制了刀片靠边。')+'整块样板仍有 '+((1-result.covered/result.total)*100).toFixed(1)+'% 未覆盖，需逐区复核。':'虚线是机体中心路线，色带是刀片实际扫过的区域。两者不是同一个范围。');
}
function draw(){if(state.tab==='level')drawLevel();else if(state.tab==='timing')drawTiming();else drawCoverage();markButtons();}
function tick(now){frame=0;const dt=last?Math.min((now-last)/1000,.05):0;last=now;
  if(state.tab==='level'&&state.levelRun){
    if(state.idle){state.clock+=dt;if(state.clock>2&&state.clock-dt<=2)state.head=6;if(state.clock>10){state.clock=0;state.head=-6;}}
    state.head=M.levelStep(state.head,state.reference,state.feedback,dt);
  }
  if(state.tab==='timing'&&state.timingRun){state.timing=M.clamp(state.timing+dt/10,0,1);state.angle+=dt*1.5;timingDirty=true;if(state.timing>=1)state.timingRun=false;}
  if(state.tab==='coverage'&&state.coverageRun){state.coverage=M.clamp(state.coverage+dt/18,0,1);coverageDirty=true;if(state.coverage>=1)state.coverageRun=false;}
  draw();
  const moving=(state.tab==='level'&&state.levelRun&&(state.idle||(state.feedback&&Math.abs(state.head-state.reference)>.0001)))||(state.tab==='timing'&&state.timingRun)||(state.tab==='coverage'&&state.coverageRun);
  if(visible&&!document.hidden&&moving&&!reduced.matches)frame=requestAnimationFrame(tick);
}
function run(){if(!frame&&visible&&!document.hidden&&!reduced.matches){last=0;frame=requestAnimationFrame(tick);}}
function change(){stopIdle();draw();run();}
function reset(){stopIdle();if(state.tab==='level'){state.head=0;state.reference=0;state.feedback=true;state.levelRun=!reduced.matches;$('reference').value=0;$('feedback').checked=true;setText('referenceValue','+0 mm');}else if(state.tab==='timing'){state.timing=0;state.angle=0;state.timingRun=false;timingDirty=true;setMaterial('ready');$('cutaway').checked=false;cutaway();}else{state.spacing=.72;$('spacing').value=.72;setText('spacingValue','0.72 m');route=M.routeOf(.72);state.coverage=0;state.coverageRun=false;coverageDirty=true;}setText('answerFeedback',paragraphs[state.tab].guide);$$('[data-answer]').forEach(b=>b.removeAttribute('aria-pressed'));change();}
function setMaterial(name){state.material=name;state.timing=0;state.angle=0;state.timingRun=false;timingDirty=true;$$('[data-material]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.material===name));change();}
function cutaway(){const cut=$('cutaway').checked;for(const el of trowelParts){const name=el.dataset.name;if(/^(battery|chassis|control|screen|sensor|motor\.cap)/.test(name))el.style.display=cut?'none':'';}setText('sceneBadge',cut?'机罩剖开观察 · 双电机与双转子':'双转子机构 · 慢速教学回放');}
$$('[data-tab]').forEach(b=>b.onclick=()=>{stopIdle();tabTo(b.dataset.tab);});
$$('[data-disturb]').forEach(b=>b.onclick=()=>{state.head=M.clamp(state.head+Number(b.dataset.disturb),-10,10);change();});
$('reference').oninput=e=>{state.reference=Number(e.target.value);setText('referenceValue',(state.reference>=0?'+':'')+state.reference+' mm');change();};
$('feedback').onchange=e=>{state.feedback=e.target.checked;change();};
$('wrongDatum').onclick=()=>{state.reference=5;state.head=0;state.feedback=true;state.levelRun=!reduced.matches;$('feedback').checked=true;$('reference').value=5;setText('referenceValue','+5 mm');change();};
$('levelPlay').onclick=()=>{state.levelRun=!state.levelRun;if(reduced.matches){state.head=M.levelStep(state.head,state.reference,state.feedback,.2);state.levelRun=false;}change();};
$('levelStep').onclick=()=>{state.levelRun=false;state.head=M.levelStep(state.head,state.reference,state.feedback,.2);change();};
$$('[data-material]').forEach(b=>b.onclick=()=>setMaterial(b.dataset.material));
$('timingProgress').oninput=e=>{state.timing=Number(e.target.value);state.angle=state.timing*15;state.timingRun=false;timingDirty=true;change();};
$('timingPlay').onclick=()=>{if(state.timing>=1){state.timing=0;state.angle=0;timingDirty=true;}if(reduced.matches){state.timing=M.clamp(state.timing+.1,0,1);state.angle=state.timing*15;timingDirty=true;}else state.timingRun=!state.timingRun;change();};
$('timingStep').onclick=()=>{state.timing=M.clamp(state.timing+.1,0,1);state.angle=state.timing*15;state.timingRun=false;timingDirty=true;change();};
$('cutaway').onchange=cutaway;
$('spacing').oninput=e=>{state.spacing=Number(e.target.value);route=M.routeOf(state.spacing);state.coverage=0;state.coverageRun=false;coverageDirty=true;setText('spacingValue',state.spacing.toFixed(2)+' m');change();};
$('coverageProgress').oninput=e=>{state.coverage=Number(e.target.value);state.coverageRun=false;coverageDirty=true;change();};
$('coveragePlay').onclick=()=>{if(state.coverage>=1)state.coverage=0;if(reduced.matches)state.coverage=M.clamp(state.coverage+.1,0,1);else state.coverageRun=!state.coverageRun;coverageDirty=true;change();};
$('coverageEnd').onclick=()=>{state.coverage=1;state.coverageRun=false;coverageDirty=true;change();};
$('answers').onclick=e=>{const b=e.target.closest('[data-answer]');if(!b)return;stopIdle();$$('[data-answer]').forEach(x=>x.setAttribute('aria-pressed',x===b));const c=paragraphs[state.tab];setText('answerFeedback',(Number(b.dataset.answer)===c.correct?'判断正确。':'再想一想。')+c.explain);};
$('reset').onclick=reset;$('next').onclick=()=>{stopIdle();tabTo(['level','timing','coverage'][(['level','timing','coverage'].indexOf(state.tab)+1)%3]);};
$('theme').onclick=()=>{const theme=document.body.dataset.theme==='light'?'dark':'light';document.body.dataset.theme=theme;document.documentElement.dataset.theme=theme;$('theme').querySelector('span').textContent=theme==='light'?'深色':'浅色';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{setText('readout','可使用浏览器 F11 全屏');}};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').querySelector('span').textContent=document.fullscreenElement?'退出全屏':'全屏演示';});
$('help').onclick=()=>{$('helpDialog').showModal();stopIdle();};$('closeHelp').onclick=()=>$('helpDialog').close();
$('helpDialog').onclick=e=>{if(e.target===$('helpDialog')){const r=$('helpDialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('helpDialog').close();}};
$('mobileToggle').onclick=()=>{const on=document.querySelector('.app').classList.toggle('mobile-controls');$('mobileToggle').textContent=on?'返回画面 ◫':'调整参数 ☷';};
document.addEventListener('keydown',e=>{if($('helpDialog').open||e.target.matches('input,button,a'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();stopIdle();const i=['level','timing','coverage'].indexOf(state.tab);tabTo(['level','timing','coverage'][(i+(e.key==='ArrowRight'?1:2))%3]);}if(e.code==='Space'){e.preventDefault();$(state.tab==='level'?'levelPlay':state.tab==='timing'?'timingPlay':'coveragePlay').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else run();});
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();else{if(frame)cancelAnimationFrame(frame);frame=0;}}).observe($('drawing'));
reduced.addEventListener('change',()=>{state.levelRun=false;state.timingRun=false;state.coverageRun=false;stopIdle();draw();});
// Read-only snapshots support meaningful browser checks without a second simulation.
window.finishingLab={snapshot:()=>({...state,level:M.levelReadout(state.head,state.reference),coverageResult:M.coverageAt(route,state.coverage)})};
tabTo('level');
