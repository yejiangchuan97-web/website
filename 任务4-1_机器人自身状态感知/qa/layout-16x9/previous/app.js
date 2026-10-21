(()=>{
'use strict';
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)],fmt=(n,d=2)=>(Math.abs(n)<.5*10**(-d)?0:n).toFixed(d),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#2677ce','#268f88','#8b68bb'],reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state={...DEFAULT},scene=null,records=[],imported=null,pendingCSV=null,charts=[],raf=0,lastFrame=0,visible=true,restart=true,toastTimer;
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function wake(){if(!raf&&!document.hidden&&visible)raf=requestAnimationFrame(frame);}
try{scene=createStateScene(THREE,$('viewport'),wake);$('loading').hidden=true;}catch(e){$('loading').hidden=true;$('fallback').hidden=false;$('viewport').querySelector('canvas')?.remove();$$('[data-view]').forEach(b=>b.disabled=true);$('axesToggle').disabled=true;}
function reading(label,value,unit,reference=false){return'<div class="reading'+(reference?' reference':'')+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+unit+'</small></div>';}
function labels(s){
 let markup='',explanation='',measure='',context='';
 if(state.case==='slope'){
  markup=reading('静态估计倾角',fmt(s.tilt,1),'°')+reading('姿态角变化率 · 参照',fmt(s.angular,1),'°/s',true);measure=(state.tiltAxis==='roll'?'左右':'前后')+'倾角 '+fmt(s.tilt,1)+'°';
  explanation=state.gravity?(Math.abs(s.tilt)<.05?'平放时，x、y接近0，z约9.81 m/s²。':'机身倾斜，重力相关示值分配到不同轴；合量仍约9.81 m/s²。'):'理想去重力后，静止时三轴接近0。上方倾角仍由含重力数据估计。';
  context='观察坡道停靠或平台调平时，先看倾角是否稳定；保持倾斜与持续转动对应不同的数据。';
 }else if(state.case==='drive'){
  markup=reading('前向线加速度',fmt(s.ax),'m/s²')+reading('速度 · 模型参照',fmt(s.speed),'m/s',true);measure='前进 '+fmt(s.pos)+' m';
  explanation=s.phase==='匀速前进'?'还在前进，但速度不再变化，所以前向加速度为0。':s.phase==='起步加速'?'向前为正。速度正在增加，前向加速度为正值。':s.phase==='减速制动'?'仍在向前行走，速度逐渐下降；前向加速度为负值。':s.pos>0?'已停稳，加速度和速度都归零；到达的位置没有回到起点。':'起点静止：速度和线加速度均为0。';
  context='沿施工通道行走时，把起步、匀速和制动分开观察；单个加速度为0的读数不能判断是否停车。';
 }else if(state.case==='bump'){
  markup=reading(state.gravity?'垂向加速度 · 含重力':'垂向线加速度',fmt(s.acc[2]),'m/s²')+reading('垂向位移 · 参照',fmt(s.z*1000,1),'mm',true);measure=state.roughness===0?'平整路面':state.roughness===1?'轻微起伏 · 0.40 m/s':'明显起伏 · 0.40 m/s';
  explanation=(state.roughness===0?'平整路面没有垂向波动。':s.t<2||s.t>6?'当前已在平整段，回看2–6秒可见颠簸波形。':'颠簸时，垂向加速度出现正负波动；波形峰谷不等同于路面的最高、最低点。')+(state.gravity?'含重力曲线围绕9.81 m/s²变化。':'去重力曲线围绕0变化。');
  context='在相同车速、采样方向和固定条件下比较路面影响。一次尖峰需要结合现场动作核对，不能单凭它判定碰撞。';
 }else{
  markup=reading('转向角速度',fmt(s.omega,1),'°/s')+reading('累计转角 · 参照',fmt(s.yaw,1),'°',true);measure='已转过 '+fmt(s.yaw,1)+'°';
  explanation=s.omega>0?'正在转向：角速度表示此刻转得多快；累计转角表示已经转过多少。':s.yaw>0?'已经转过90°并停住。角速度回到0，朝向保持在转向后的方向。':'尚未转向。切换快转、慢转，对比曲线的高低与持续时间。';
  context='调整作业朝向时，转过多少与转得多快要分别看。快慢转都能到90°，快转的角速度峰值更高、持续更短。';
 }
 if($('readings').innerHTML!==markup)$('readings').innerHTML=markup;
 const axisMarkup=s.acc.map((a,i)=>{const w=Math.min(48,Math.abs(a)/15*48);return'<div class="axis-row"><span>'+['x 向前','y 向左','z 向上'][i]+'</span><div class="axis-bar" style="--axis-color:'+colors[i]+'"><i style="left:'+(a<0?50-w:50)+'%;width:'+w+'%"></i></div><output>'+fmt(a)+'</output></div>';}).join('');
 $('axisReadings').innerHTML=axisMarkup;$('axisReadings').setAttribute('aria-label',(state.gravity?'含重力':'理想去重力')+'三轴加速度，单位米每二次方秒');
 $('liveExplanation').textContent=explanation;$('stateMeaning').textContent=s.phase+(state.case==='slope'?' · '+fmt(s.tilt,1)+'°':'');$('dataMeaning').textContent=explanation;$('engineeringMeaning').textContent=context;
 $('sceneMeasure').textContent=measure;$('phaseBadge').textContent=s.phase;$('dataTime').textContent='t = '+fmt(s.t)+' s';$('timeValue').textContent=fmt(s.t)+' s';$('timeRange').value=s.t;
 $('playButton').textContent=state.playing?'Ⅱ 暂停':restart?'▶ 从头播放':'▶ 继续播放';
 $$('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(Number(b.dataset.time)-s.t)<.06)));
 for(const c of charts){const x=40+s.t/8*(c.w-53);c.svg.querySelector('.chart-cursor').setAttribute('d','M'+x+' 8V128');const vals=c.spec.axes?s.acc:[c.spec.value(s)];c.svg.querySelectorAll('.chart-dot').forEach((dot,i)=>{dot.setAttribute('cx',x);dot.setAttribute('cy',c.y(vals[i]));});}
}
function sync(){
 $('tiltRange').value=state.tilt;$('tiltValue').textContent=state.tilt+'°';$('speedRange').value=state.speed;$('speedValue').textContent=fmt(state.speed)+' m/s';$('axesToggle').checked=state.axes;$('gravityToggle').checked=state.gravity;$('compareToggle').checked=state.compare;$('playRate').value=state.rate;
 $('gravityHint').textContent=state.gravity?'本体三轴示值 · m/s²；包含重力影响':'本体三轴示值 · m/s²；理想去除重力';
 for(const [attribute,key]of [['tilt-axis','tiltAxis'],['roughness','roughness'],['duration','turnDuration']])$$('[data-'+attribute+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-'+attribute)===String(state[key]))));
}
function changed(rebuild=false){sync();if(rebuild)drawCharts();const s=stateAt(state);scene?.setState(s,state);labels(s);wake();}
function chooseCase(id){
 const previous=state;state={...DEFAULT,case:id,time:CASES[id].initial,gravity:id!=='drive'&&id!=='bump',theme:previous.theme,axes:previous.axes,rate:previous.rate};restart=true;
 $$('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===id)));for(const k of Object.keys(CASES))$(k+'Controls').hidden=k!==id;
 const info=CASES[id];$('caseNumber').textContent='SCENE '+info.number+' / '+info.name;$('caseTitle').textContent=info.title;$('sceneLocation').textContent=info.context;$('baselineName').textContent=info.baselineName;$('modelNote').textContent=info.note;$('gravityControl').hidden=id==='drive';
 $('sceneScale').textContent=id==='bump'?'垂向位移放大8倍 · 数据未放大':'本体 x 向前 · y 向左 · z 向上';
 $('phaseButtons').innerHTML=info.phases.map(([name,t])=>'<button data-time="'+t+'" aria-pressed="false">'+name+'</button>').join('');
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='iso')));scene?.setView('iso');changed(true);
}
function drawCharts(){
 const specs=dataSpecs(state),rows=stateTrace(state),base=state.compare?stateTrace(baselineFor(state)):null;
 $('charts').innerHTML=specs.map((s,i)=>'<article class="chart-card"><div class="chart-title"><h3>'+s.label+'</h3><span>'+s.unit+'</span></div><svg id="chart'+i+'" tabindex="0" role="slider" aria-label="'+s.label+'时间定位，左右键调整0.1秒" aria-valuemin="0" aria-valuemax="8" aria-valuenow="'+state.time+'"></svg><div class="chart-legend">'+(s.axes?['x 向前','y 向左','z 向上'].map((a,j)=>'<span><i style="background:'+colors[j]+'"></i>'+a+'</span>').join(''):'<span>横轴：时间 / s</span>')+'</div></article>').join('');charts=[];
 specs.forEach((spec,index)=>{const svg=$('chart'+index),w=Math.max(250,svg.getBoundingClientRect().width),H=156,x=t=>40+t/8*(w-53),y=v=>128-(v-spec.domain[0])/(spec.domain[1]-spec.domain[0])*116;svg.setAttribute('viewBox','0 0 '+w+' '+H);
  let html='';for(let j=0;j<=4;j++){const v=spec.domain[0]+(spec.domain[1]-spec.domain[0])*j/4;html+='<path class="chart-grid-line" d="M40 '+y(v)+'H'+(w-13)+'"/><text x="34" y="'+(y(v)+3)+'" text-anchor="end">'+fmt(v,Math.max(...spec.domain.map(Math.abs))<=1?2:1)+'</text>';}
  for(let t=0;t<=8;t+=2)html+='<text x="'+x(t)+'" y="149" text-anchor="middle">'+t+'</text>';
  if(spec.domain[0]<0&&spec.domain[1]>0)html+='<path class="chart-zero" d="M40 '+y(0)+'H'+(w-13)+'"/>';
  const curves=spec.axes?[0,1,2].map(i=>({get:r=>r.acc[i],color:colors[i]})):[{get:spec.value,color:spec.color}];
  for(const source of [base,rows])if(source)for(const c of curves){const d=source.map((r,i)=>(i?'L':'M')+x(r.t).toFixed(2)+','+y(c.get(r)).toFixed(2)).join('');html+='<path class="chart-line'+(source===base?' chart-baseline':'')+'" stroke="'+c.color+'" d="'+d+'"/>';}
  html+='<path class="chart-cursor" d="M40 8V128"/>';for(const c of curves)html+='<circle class="chart-dot" r="4" cx="40" cy="0" fill="'+c.color+'"/>';svg.innerHTML=html;
  charts.push({svg,w,y,spec});let dragging=false;const seek=e=>{const b=svg.getBoundingClientRect();setTime(bounded(((e.clientX-b.left)*w/b.width-40)/(w-53)*8,0,8));svg.setAttribute('aria-valuenow',fmt(state.time));};svg.onpointerdown=e=>{dragging=true;svg.setPointerCapture(e.pointerId);seek(e);};svg.onpointermove=e=>{if(dragging)seek(e);};svg.onpointerup=svg.onpointercancel=()=>dragging=false;
  svg.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setTime(e.key==='Home'?0:e.key==='End'?8:state.time+(e.key==='ArrowRight'?.1:-.1));svg.setAttribute('aria-valuenow',fmt(state.time));};
 });
}
function setTime(t){state.time=bounded(t,0,8);state.playing=false;restart=false;changed();}
function run(){if(reduced.matches){setTime(state.time>=8?0:state.time+.1);toast('减少动态已启用：按0.1秒单步观察。');return;}if(state.playing)state.playing=false;else{if(restart||state.time>=8)state.time=0;state.playing=true;restart=false;}changed();}
function frame(now){raf=0;if(document.hidden||!visible){lastFrame=0;return;}const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):.016;lastFrame=now;if(state.playing){state.time=Math.min(8,state.time+dt*state.rate);if(state.time===8){state.playing=false;restart=true;}const s=stateAt(state);scene?.setState(s,state);labels(s);}const moving=scene?.render(dt,reduced.matches);if(state.playing||moving)raf=requestAnimationFrame(frame);else lastFrame=0;}
function capture(){const info=CASES[state.case],s=stateAt(state);records.push({id:Date.now()+'-'+records.length,source:'simulation',experiment:state.case,label:info.name,summary:'t = '+fmt(state.time)+' s · '+$('dataMeaning').textContent,detail:info.note,createdAt:new Date().toISOString(),state:{...state,playing:false},sample:s,rows:stateTrace(state),units:{time:'s',acceleration:'m/s²',angularVelocity:'deg/s',angle:'deg',distance:'m',velocity:'m/s'}});if(records.length>50)records.shift();updateRecords();toast('已记录当前条件、时刻与全程曲线，可导出保存。');}
function updateRecords(){$('recordCount').textContent=records.length;$('notebook').innerHTML=records.length?records.map(r=>'<article class="notebook-entry"><div><span class="eyebrow">'+(r.source==='simulation'?'教学模拟':'用户导入')+'</span><h3>'+esc(r.label)+'</h3><p>'+esc(r.summary)+'</p><small>'+esc(r.detail||'')+'</small></div><button data-delete="'+r.id+'" aria-label="删除这条记录">×</button></article>').join(''):'<p class="notebook-empty">选择状态、定位时刻，再点击“记录这次观察”。关闭网页前可导出保存。</p>';}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function exportRecords(){download('机器人状态与数据-观察记录.json',JSON.stringify({student:$('studentName').value,records},null,2),'application/json');}
function exportCSV(){const out=[['record','source','scenario','time_s','ax_m_s2','ay_m_s2','az_m_s2','pitch_deg','roll_deg','yaw_deg','angular_velocity_deg_s','speed_ref_m_s','position_ref_m','vertical_position_ref_m','acceleration_convention','conditions']];for(const r of records)for(const p of r.rows||[])out.push([r.label,r.source,r.experiment,p.t,...(p.acc||['','','']),p.pitch??'',p.roll??'',p.yaw??'',p.omega??'',p.speed??'',p.pos??'',p.z??'',r.source==='simulation'?(r.state.gravity?'gravity-included':'gravity-removed'):'user-file-unknown',r.detail]);download('机器人状态与数据-采样记录.csv','\ufeff'+out.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n'),'text/csv;charset=utf-8');}
{{CSV_TOOLS}}
$$('[data-case]').forEach(b=>b.onclick=()=>chooseCase(b.dataset.case));$('resetCase').onclick=()=>chooseCase(state.case);
for(const [id,key]of [['tiltRange','tilt'],['speedRange','speed']])$(id).oninput=()=>{state[key]=+$(id).value;state.playing=false;if(key==='tilt')state.time=5;changed(true);};
$$('[data-tilt]').forEach(b=>b.onclick=()=>{state.tilt=+b.dataset.tilt;state.time=5;state.playing=false;changed(true);});
$$('[data-tilt-axis]').forEach(b=>b.onclick=()=>{state.tiltAxis=b.dataset.tiltAxis;state.playing=false;changed(true);});
$$('[data-roughness]').forEach(b=>b.onclick=()=>{state.roughness=+b.dataset.roughness;state.playing=false;changed(true);});
$$('[data-duration]').forEach(b=>b.onclick=()=>{state.turnDuration=+b.dataset.duration;state.time=1+state.turnDuration/2;state.playing=false;restart=true;$('phaseButtons').querySelectorAll('[data-time]')[1].dataset.time=state.time;changed(true);});
$('gravityToggle').onchange=()=>{state.gravity=$('gravityToggle').checked;changed(true);};$('axesToggle').onchange=()=>{state.axes=$('axesToggle').checked;changed();};$('compareToggle').onchange=()=>{state.compare=$('compareToggle').checked;changed(true);};
$('playButton').onclick=run;$('stepButton').onclick=()=>setTime(state.time>=8?0:state.time+.1);$('timeRange').oninput=()=>setTime(+$('timeRange').value);$('playRate').onchange=()=>state.rate=+$('playRate').value;
$('phaseButtons').onclick=e=>{const b=e.target.closest('[data-time]');if(b)setTime(+b.dataset.time);};
$$('[data-view]').forEach(b=>b.onclick=()=>{scene?.setView(b.dataset.view);$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
$('themeButton').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';document.documentElement.dataset.theme=state.theme;$('fallback').querySelector('.iso')?.setAttribute('data-theme',state.theme);$('themeButton').textContent=state.theme==='light'?'◐ 深色':'◑ 浅色';$('themeButton').setAttribute('aria-label',state.theme==='light'?'切换深色主题':'切换浅色主题');scene?.setTheme(state.theme);wake();};
$('captureButton').onclick=capture;$('recordBtn').onclick=()=>{$('recordsDialog').showModal();};$('csvOpen').onclick=()=>{state.playing=false;changed();$('csvDialog').showModal();drawImported();};$$('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());$('exportRecords').onclick=exportRecords;$('exportCSV').onclick=exportCSV;$('clearRecords').onclick=()=>{records=[];updateRecords();};$('notebook').onclick=e=>{const b=e.target.closest('[data-delete]');if(b){records=records.filter(r=>r.id!==b.dataset.delete);updateRecords();}};
$('csvFile').onchange=()=>chooseCSV($('csvFile').files[0]);$('applyCSV').onclick=applyCSV;$('saveCSV').onclick=saveImported;
const viewStates=new Map();const obs=new IntersectionObserver(entries=>{for(const e of entries)viewStates.set(e.target,e.isIntersecting);visible=[...viewStates.values()].some(Boolean);if(visible)wake();else{state.playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;labels(stateAt(state));}},{rootMargin:'80px'});obs.observe(document.querySelector('.experiment'));obs.observe(document.querySelector('.wave-section'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}else changed();});reduced.addEventListener('change',()=>{state.playing=false;changed();});
let chartWidth=0;new ResizeObserver(()=>{const w=$('charts').clientWidth;if(w&&Math.abs(w-chartWidth)>.5){chartWidth=w;drawCharts();labels(stateAt(state));}}).observe($('charts'));
window.__STATE_LAB__={snapshot:()=>({state:{...state},sample:stateAt(state),scene:scene?.stats()||{available:false},records:records.map(r=>({...r,rows:r.rows?.length})),imported:imported?{name:imported.name,rows:imported.rows,axes:imported.axes}:null,reduced:reduced.matches}),chooseCase,setTime,setState(p){if(p.case&&p.case!==state.case)chooseCase(p.case);Object.assign(state,p);changed(true);}};
chooseCase('slope');updateRecords();wake();
})();
