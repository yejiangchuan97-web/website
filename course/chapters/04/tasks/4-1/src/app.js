(()=>{
'use strict';
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)],fmt=(n,d=2)=>(Math.abs(n)<.5*10**(-d)?0:n).toFixed(d),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const colors=['#2677ce','#268f88','#8b68bb'],reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state={...DEFAULT},scene=null,charts=[],raf=0,lastFrame=0,visible=true,restart=true,toastTimer;
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function wake(){if(!raf&&!document.hidden&&visible)raf=requestAnimationFrame(frame);}
try{scene=createStateScene(THREE,$('viewport'),wake);$('loading').hidden=true;}catch(e){$('loading').hidden=true;$('fallback').hidden=false;$('viewport').querySelector('canvas')?.remove();$$('[data-view]').forEach(b=>b.disabled=true);$('axesToggle').disabled=true;}
function reading(label,value,unit,reference=false){return'<div class="reading'+(reference?' reference':'')+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+unit+'</small></div>';}
function labels(s){
 let markup='',explanation='',measure='',context='';
 if(state.case==='slope'){
  markup=reading('车身斜了多少',fmt(s.tilt,1),'°')+reading('倾斜变化快不快',fmt(s.angular,1),'°/s',true);measure=(state.tiltAxis==='roll'?'左右':'前后')+'倾角 '+fmt(s.tilt,1)+'°';
  explanation=state.gravity?(Math.abs(s.tilt)<.05?'平放时，x、y接近0，z约9.81 m/s²。':'车身斜了，重力分到了不同的轴上；三根轴合起来仍约9.81 m/s²。'):'去掉重力的影响后，停着不动时三轴都接近0；车身斜了多少，要看含重力的读数。';
  context='观察坡道停靠或平台调平时，先看倾角是否稳定；保持倾斜与持续转动对应不同的数据。';
 }else if(state.case==='drive'){
  markup=reading('向前的加速度',fmt(s.ax),'m/s²')+reading('行走速度',fmt(s.speed),'m/s',true);measure='前进 '+fmt(s.pos)+' m';
  explanation=s.phase==='匀速前进'?'还在前进，但速度不再变化，所以向前的加速度为0。':s.phase==='起步加速'?'向前为正。速度正在增加，向前的加速度为正值。':s.phase==='减速制动'?'仍在向前行走，速度逐渐下降；向前的加速度为负值。':s.pos>0?'已停稳，加速度和速度都归零；到达的位置没有回到起点。':'还没起步：速度和加速度都是0。';
  context='沿施工通道行走时，把起步、匀速和制动分开观察；单个加速度为0的读数不能判断是否停车。';
 }else if(state.case==='bump'){
  markup=reading(state.gravity?'上下方向加速度 · 含重力':'上下方向加速度 · 去掉重力',fmt(s.acc[2]),'m/s²')+reading('车身上下起伏',fmt(s.z*1000,1),'mm',true);measure=state.roughness===0?'平整路面':state.roughness===1?'轻微起伏 · 0.40 m/s':'明显起伏 · 0.40 m/s';
  explanation=(state.roughness===0?'平整路面，上下方向没有波动。':s.t<2||s.t>6?'当前已在平整段，回看2–6秒可见颠簸波形。':'颠簸时，上下方向的加速度忽正忽负；波形的最高、最低点，并不是路面的最高、最低点。')+(state.gravity?'含重力曲线围绕9.81 m/s²变化。':'去掉重力后，曲线围绕0上下变化。');
  context='在相同车速、相同条件下比较路面的影响。一次尖峰需要结合现场动作核对，不能单凭它判定碰撞。';
 }else{
  markup=reading('转得多快 · 角速度',fmt(s.omega,1),'°/s')+reading('一共转了多少',fmt(s.yaw,1),'°',true);measure='已转过 '+fmt(s.yaw,1)+'°';
  explanation=s.omega>0?'正在转向：角速度表示此刻转得多快；“一共转了多少”表示已经转过的角度。':s.yaw>0?'已经转过90°并停住。角速度回到0，朝向保持在转向后的方向。':'尚未转向。切换快转、慢转，对比曲线的高低与持续时间。';
  context='调整作业朝向时，转过多少与转得多快要分别看。快慢转都能到90°，快转的角速度峰值更高、持续更短。';
 }
 if($('readings').innerHTML!==markup)$('readings').innerHTML=markup;
 const axisMarkup=s.acc.map((a,i)=>{const w=Math.min(48,Math.abs(a)/15*48);return'<div class="axis-row"><span>'+['x 向前','y 向左','z 向上'][i]+'</span><div class="axis-bar" style="--axis-color:'+colors[i]+'"><i style="left:'+(a<0?50-w:50)+'%;width:'+w+'%"></i></div><output>'+fmt(a)+'</output></div>';}).join('');
 $('axisReadings').innerHTML=axisMarkup;$('axisReadings').setAttribute('aria-label',(state.gravity?'含重力':'去掉重力')+'三轴加速度，单位米每二次方秒');
 $('liveExplanation').textContent=explanation;$('stateMeaning').textContent=s.phase+(state.case==='slope'?' · '+fmt(s.tilt,1)+'°':'');$('dataMeaning').textContent=explanation;$('engineeringMeaning').textContent=context;
 $('sceneMeasure').textContent=measure;$('phaseBadge').textContent=s.phase;$('dataTime').textContent='t = '+fmt(s.t)+' s';$('timeValue').textContent=fmt(s.t)+' s';$('timeRange').value=s.t;
 $('playButton').textContent=state.playing?'Ⅱ 暂停':restart?'▶ 从头播放':'▶ 继续播放';
 $$('[data-time]').forEach(b=>b.setAttribute('aria-pressed',String(Math.abs(Number(b.dataset.time)-s.t)<.06)));
 for(const c of charts){const x=40+s.t/8*(c.w-53);c.svg.querySelector('.chart-cursor').setAttribute('d','M'+x+' 8V'+c.bottom);const vals=c.spec.axes?s.acc:[c.spec.value(s)];c.svg.querySelectorAll('.chart-dot').forEach((dot,i)=>{dot.setAttribute('cx',x);dot.setAttribute('cy',c.y(vals[i]));});}
}
function sync(){
 $('tiltRange').value=state.tilt;$('tiltValue').textContent=state.tilt+'°';$('speedRange').value=state.speed;$('speedValue').textContent=fmt(state.speed)+' m/s';$('axesToggle').checked=state.axes;$('gravityToggle').checked=state.gravity;$('compareToggle').checked=state.compare;$('playRate').value=state.rate;
 $('gravityHint').textContent=state.gravity?'三轴读数 · m/s²，包含重力的影响':'三轴读数 · m/s²，已去掉重力的影响';
 for(const [attribute,key]of [['tilt-axis','tiltAxis'],['roughness','roughness'],['duration','turnDuration']])$$('[data-'+attribute+']').forEach(b=>b.setAttribute('aria-pressed',String(b.getAttribute('data-'+attribute)===String(state[key]))));
}
function changed(rebuild=false){sync();if(rebuild)drawCharts();const s=stateAt(state);scene?.setState(s,state);labels(s);wake();}
function chooseCase(id){
 const previous=state;state={...DEFAULT,case:id,time:CASES[id].initial,gravity:id!=='drive'&&id!=='bump',theme:previous.theme,axes:previous.axes,rate:previous.rate};restart=true;
 $$('[data-case]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.case===id)));for(const k of Object.keys(CASES))$(k+'Controls').hidden=k!==id;
 const info=CASES[id];$('caseNumber').textContent='SCENE '+info.number+' / '+info.name;$('caseTitle').textContent=info.title;$('sceneLocation').textContent=info.context;$('baselineName').textContent=info.baselineName;$('modelNote').textContent=info.note;$('gravityControl').hidden=id==='drive';
 $('sceneScale').textContent=id==='bump'?'上下起伏放大8倍显示 · 读数未放大':'车身 x 向前 · y 向左 · z 向上';
 $('phaseButtons').innerHTML=info.phases.map(([name,t])=>'<button data-time="'+t+'" aria-pressed="false">'+name+'</button>').join('');
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='iso')));scene?.setView('iso');changed(true);
}
function drawCharts(){
 const specs=dataSpecs(state),rows=stateTrace(state),base=state.compare?stateTrace(baselineFor(state)):null;
 $('charts').innerHTML=specs.map((s,i)=>'<article class="chart-card"><div class="chart-title"><h3>'+s.label+'</h3><span>'+s.unit+'</span></div><svg id="chart'+i+'" tabindex="0" role="slider" aria-label="'+s.label+'时间定位，左右键调整0.1秒" aria-valuemin="0" aria-valuemax="8" aria-valuenow="'+state.time+'"></svg><div class="chart-legend">'+(s.axes?['x 向前','y 向左','z 向上'].map((a,j)=>'<span><i style="background:'+colors[j]+'"></i>'+a+'</span>').join(''):'<span>横轴：时间 / s</span>')+'</div></article>').join('');charts=[];
 specs.forEach((spec,index)=>{const svg=$('chart'+index),w=Math.max(250,svg.getBoundingClientRect().width),H=Math.max(96,svg.getBoundingClientRect().height),bottom=H-24,x=t=>40+t/8*(w-53),y=v=>bottom-(v-spec.domain[0])/(spec.domain[1]-spec.domain[0])*(bottom-12);svg.setAttribute('viewBox','0 0 '+w+' '+H);
  let html='';for(let j=0;j<=4;j++){const v=spec.domain[0]+(spec.domain[1]-spec.domain[0])*j/4;html+='<path class="chart-grid-line" d="M40 '+y(v)+'H'+(w-13)+'"/><text x="34" y="'+(y(v)+3)+'" text-anchor="end">'+fmt(v,Math.max(...spec.domain.map(Math.abs))<=1?2:1)+'</text>';}
  for(let t=0;t<=8;t+=2)html+='<text x="'+x(t)+'" y="'+(bottom+21)+'" text-anchor="middle">'+t+'</text>';
  if(spec.domain[0]<0&&spec.domain[1]>0)html+='<path class="chart-zero" d="M40 '+y(0)+'H'+(w-13)+'"/>';
  const curves=spec.axes?[0,1,2].map(i=>({get:r=>r.acc[i],color:colors[i]})):[{get:spec.value,color:spec.color}];
  for(const source of [base,rows])if(source)for(const c of curves){const d=source.map((r,i)=>(i?'L':'M')+x(r.t).toFixed(2)+','+y(c.get(r)).toFixed(2)).join('');html+='<path class="chart-line'+(source===base?' chart-baseline':'')+'" stroke="'+c.color+'" d="'+d+'"/>';}
  html+='<path class="chart-cursor" d="M40 8V'+bottom+'"/>';for(const c of curves)html+='<circle class="chart-dot" r="4" cx="40" cy="0" fill="'+c.color+'"/>';svg.innerHTML=html;
  charts.push({svg,w,y,spec,bottom});let dragging=false;const seek=e=>{const b=svg.getBoundingClientRect();setTime(bounded(((e.clientX-b.left)*w/b.width-40)/(w-53)*8,0,8));svg.setAttribute('aria-valuenow',fmt(state.time));};svg.onpointerdown=e=>{dragging=true;svg.setPointerCapture(e.pointerId);seek(e);};svg.onpointermove=e=>{if(dragging)seek(e);};svg.onpointerup=svg.onpointercancel=()=>dragging=false;
  svg.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setTime(e.key==='Home'?0:e.key==='End'?8:state.time+(e.key==='ArrowRight'?.1:-.1));svg.setAttribute('aria-valuenow',fmt(state.time));};
 });
}
function setTime(t){state.time=bounded(t,0,8);state.playing=false;restart=false;changed();}
function run(){if(reduced.matches){setTime(state.time>=8?0:state.time+.1);toast('减少动态已启用：按0.1秒单步观察。');return;}if(state.playing)state.playing=false;else{if(restart||state.time>=8)state.time=0;state.playing=true;restart=false;}changed();}
function frame(now){raf=0;if(document.hidden||!visible){lastFrame=0;return;}const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):.016;lastFrame=now;if(state.playing){state.time=Math.min(8,state.time+dt*state.rate);if(state.time===8){state.playing=false;restart=true;}const s=stateAt(state);scene?.setState(s,state);labels(s);}const moving=scene?.render(dt,reduced.matches);if(state.playing||moving)raf=requestAnimationFrame(frame);else lastFrame=0;}
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
CourseTheme.register(theme => { state.theme=theme; scene?.setTheme(theme); wake(); });
$('helpButton').onclick=()=>{state.playing=false;changed();$('helpDialog').showModal();};
$$('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
const viewStates=new Map();const obs=new IntersectionObserver(entries=>{for(const e of entries)viewStates.set(e.target,e.isIntersecting);visible=[...viewStates.values()].some(Boolean);if(visible)wake();else{state.playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;labels(stateAt(state));}},{rootMargin:'80px'});obs.observe(document.querySelector('.experiment'));obs.observe(document.querySelector('.wave-section'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}else changed();});reduced.addEventListener('change',()=>{state.playing=false;changed();});
let chartWidth=0;new ResizeObserver(()=>{const w=$('charts').clientWidth;if(w&&Math.abs(w-chartWidth)>.5){chartWidth=w;drawCharts();labels(stateAt(state));}}).observe($('charts'));
window.__STATE_LAB__={snapshot:()=>({state:{...state},sample:stateAt(state),scene:scene?.stats()||{available:false},reduced:reduced.matches}),chooseCase,setTime,setState(p){if(p.case&&p.case!==state.case)chooseCase(p.case);Object.assign(state,p);changed(true);}};
chooseCase('slope');wake();
})();
