(()=>{
'use strict';
const $=id=>document.getElementById(id),$$=s=>[...document.querySelectorAll(s)],fmt=(v,n=2)=>Number(v).toFixed(n),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initial={sensor:'accel',experiment:'gravity',tilt:0,yaw:0,time:0,duration:4,frequency:4,intensity:1,loose:false,trial:0,events:[],bias:.01,includeGravity:true,axis:2,playing:false,inspect:true,axes:false,theme:'light',wheelAngle:0,encoderZero:0,slip:false,load:0};
let state={...initial,events:[]},scene=null,records=[],imported=null,pendingCSV=null,raf=0,lastFrame=0,dirty=true,chartDirty=true,inView=true,toastTimer,compare=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const end=()=>state.experiment==='rotation'?6:10;
function toast(s){$('toast').textContent=s;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3000);}
function wake(){dirty=true;if(!raf&&inView&&!document.hidden)raf=requestAnimationFrame(frame);}
function changed(){labels(sensorSample(state));chartDirty=true;wake();if($('signalDetails').open)redrawChart();}
try{
 scene=createSenseScene(THREE,$('viewport'),{wake,part:id=>{if(sensors[id])selectSensor(id,false);}});
 $('loading').hidden=true;
}catch(e){
 $('loading').hidden=true;$('fallback').hidden=false;
 $('viewport').querySelector('canvas')?.remove();
 $('fallback').insertAdjacentHTML('beforeend','<p class="fallback-note">三维加速不可用 · 当前为静态本体示意<br>可继续使用右侧动作、读数与记录。</p>');
 $('focusSensor').disabled=$('locateButton').disabled=true;
 $$('[data-view]').forEach(b=>b.disabled=true);$('inspectToggle').disabled=$('axesToggle').disabled=true;
 document.querySelector('.figure-bottom>span').textContent='静态示意 · 通过传感器按钮切换高亮';
}
function syncControls(){
 for(const [id,key]of [['tiltRange','tilt'],['frequencyRange','frequency'],['biasRange','bias'],['wheelRange','wheelAngle'],['timeRange','time']])$(id).value=state[key];
 $('tiltValue').textContent=fmt(state.tilt,0)+'°';$('frequencyValue').textContent=state.frequency+' Hz';$('biasValue').textContent=fmt(state.bias,3)+' m/s²';$('wheelValue').textContent=fmt(state.wheelAngle,0)+'°';
 for(const [id,key]of [['gravityToggle','includeGravity'],['looseToggle','loose'],['inspectToggle','inspect'],['axesToggle','axes'],['slipToggle','slip']])$(id).checked=state[key];
 $$('[data-duration]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.duration===state.duration)));
 $$('[data-load]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.load===state.load)));
 $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.experiment)));
 $('timeRange').max=end();
}
function selectSensor(id,resetCamera=true){
 if(!sensors[id])return;
 const old=state,info=sensors[id];
 state={...initial,sensor:id,experiment:info.defaultExperiment,theme:old.theme,inspect:true,axes:old.axes,events:[]};
 $$('.sensor-tab').forEach(b=>{const active=b.dataset.sensor===id;b.setAttribute('aria-pressed',String(active));b.classList.toggle('active',active);});
 $$('#fallback [data-sensor]').forEach(el=>el.classList.toggle('fallback-active',el.dataset.sensor===id||(id==='encoder'&&el.dataset.sensor==='encoder-disc')));
 $('sensorNumber').textContent=info.number+' / '+{accel:'ACCELEROMETER',gyro:'GYROSCOPE',encoder:'ENCODER',current:'CURRENT SENSING'}[id];
 for(const [el,key]of [['sensorTitle','name'],['sensorQuestion','question'],['sensorLocation','location'],['sensorQuantity','quantity'],['sensorUse','use'],['sensorDescription','description'],['sensorLimit','limit']])$(el).textContent=info[key];
 $('modeButtons').innerHTML=info.modes.map(([mode,label])=>'<button data-mode="'+mode+'" aria-pressed="'+(mode===state.experiment)+'">'+label+'</button>').join('');
 $('partCaption').textContent=info.name+' · '+info.location;
 $('partSubcaption').textContent={accel:'蓝色高亮是加速度计，旁边的芯片是陀螺仪。',gyro:'与加速度计装在同一块板上，测量的是转动快慢。',encoder:'轮轴带动码盘转动，固定读头读取码道变化。',current:'蓝色高亮是采样元件，位于电机驱动板上。'}[id];
 scene?.selectPart(id,false);if(resetCamera)scene?.resetView();
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view==='iso')));
 $('focusSensor').setAttribute('aria-pressed','false');
 setExperiment(info.defaultExperiment);
}
function setExperiment(id){
 state.experiment=id;state.time=0;state.playing=false;state.events=[];state.includeGravity=id==='gravity'||id==='rotation';
 for(const k of ['gravity','rotation','vibration','position','encoder','current'])$(k+'Controls').hidden=k!==id;
 $('playback').hidden=id==='gravity'||id==='encoder';
 const copy={
 gravity:['倾斜时，改变的是三个方向的分量。','机身倾斜 → 加速度计三轴分量改变 → 静止或缓慢运动时，可估计相对于水平的倾斜。'],
 vibration:['先观察波动，再核对发生了什么。','机身颠簸 → 加速度计读数随时间波动 → 结合地面、车速和固定方式判断原因。'],
 position:['加速度为零，不能说明位置没有改变。','A、B处都可静止 → 瞬时加速度不能区分位置 → 位移推算需要起始状态，并受到偏置累积影响。'],
 rotation:['转得多快，与转到了哪里，是两件事。','机身转弯 → 陀螺仪输出角速度 → 转向控制利用转速；累计转角还需要初始方向与时间。'],
 encoder:['先有转数，才能进一步估算里程。','轮轴转动 → 编码器累计计数 → 结合每转计数和轮径，得到轴角与纯滚动条件下的里程估计。'],
 current:['电流变大，是继续检查的一条线索。','机械阻力变化 → 驱动电流随工况变化 → 结合转速和机构状态排查，不能把电流直接当成重量。']
 }[id];
 $('takeawayTitle').textContent=copy[0];$('takeaway').textContent=copy[1];
 const chartCopy={
 gravity:['三轴示值 · 当前姿态保持10秒','m/s²','x / y / z 三轴','当前倾角的静态示意，横线表示保持该姿态。'],
 rotation:['陀螺仪 · 回转角速度','rad/s','本体 z 轴角速度','模型参照转角为90°，不是把某个角速度峰值当成角度。'],
 vibration:['加速度计 · 颠簸与固定条件','m/s²','x / y / z 三轴；阴影为2–8秒','振动采样采用理想去重力；对照时保持同轴、同单位、同窗口。'],
 position:['位移 · 设定真值与积分估计','m','实线：设定真值；虚线：积分估计','这两条是位移，不是加速度计的直接输出。误差会随时间积累。'],
 encoder:['轮轴转动 · 相对计数与角度','count','编码器计数','以当前零位为参照，横轴为轮轴转角（°）；不是时间曲线。'],
 current:['电流 · 当前工况的稳态示例','A','电机电流','教学设定的稳态电流；未模拟起动、电气暂态和温升。']
 }[id];
 $('signalTitle').textContent=chartCopy[0];$('signalUnit').textContent=chartCopy[1];$('signalLegend').textContent=chartCopy[2];$('signalHint').textContent=chartCopy[3];
 syncControls();changed();
}
function reading(label,value,unit){return '<div class="reading"><span class="reading-label">'+label+'</span><strong>'+value+'</strong><small>'+unit+'</small></div>';}
let lastReadings='',lastObservation='';
function labels(s){
 const id=state.experiment;let rows,observation;
 if(id==='gravity'){
  rows=s.acc.map((v,i)=>['本体 a'+['ₓ','ᵧ','ᶻ'][i],fmt(v),'m/s²']);
  observation=state.includeGravity?'机身静止在 '+fmt(s.tilt,0)+'°；合量仍为 '+fmt(s.norm)+' m/s²。改变的是重力相关示值在三轴上的分配。':'理想去重力后三轴均为0。这里的“去重力”是计算处理，并非另一只传感器。';
 }else if(id==='rotation'){
  rows=[['直接读数 ωz',fmt(s.omega),'rad/s'],['累计转角',fmt(s.yaw,1),'° · 模型参照'],['动作时间',fmt(state.time,1),'s']];
  observation=s.omega===0?(s.yaw>0?'已经转过 '+fmt(s.yaw,0)+'°，停止后角速度回到0；朝向并没有回到起点。':'先播放一次慢转，再改为快转；两次都到90°。'):'正在转动。当前角速度为 '+fmt(s.omega)+' rad/s；快转峰值更高，但终点转角相同。';
 }else if(id==='vibration'){
  rows=s.acc.map((v,i)=>['本体 a'+['ₓ','ᵧ','ᶻ'][i],fmt(v),'m/s²']);
  observation=(state.loose?'固定件松动也可能产生尖峰。':'目前固定牢固。')+'观察一段曲线，再结合动作记录复核；位移为便于观察已放大。';
 }else if(id==='position'){
  rows=[['设定真值',fmt(s.position),'m'],['积分估计',fmt(s.estimate),'m'],['加速度 aₓ',fmt(s.acc[0],3),'m/s²']];
  observation=state.time>=3?'已到B点并停下，但偏置仍使估计位置漂移。设定真值保持0.50 m。':'设定从A移动至0.50 m外的B点。加速度需要结合起点和完整过程，才能用于位移推算。';
 }else if(id==='encoder'){
  rows=[['相对计数',s.counts,'count'],['相对轴角',fmt(s.angle,0),'°'],['里程估计',fmt(s.distance,3),'m · 纯滚动假设']];
  observation=state.slip?'轮子空转时，计数仍可增加；即使估算出 '+fmt(s.distance,3)+' m，底盘也可能一步未走。':'相对零位转了 '+fmt(s.turns,2)+' 圈，累计 '+s.counts+' 计数。模型在支座上演示轮轴转动，里程是纯滚动条件下的估计。';
 }else{
  rows=[['直接读数',fmt(s.amps),'A'],['电机转速',s.rpm,'r/min'],['转速指令','30','r/min']];
  observation=s.name==='受阻'?'在这个受阻示例中，电机停转，电流升至2.40 A。应结合转速和机械状态判断原因。':s.name==='阻力增加'?'阻力增加后，示例电流由0.60 A升至1.20 A，控制器仍维持30 r/min。':'空载示例电流为0.60 A；切换工况，观察驱动读数如何变化。';
 }
 const markup=rows.map(r=>reading(...r)).join('');
 if(markup!==lastReadings){$('readings').innerHTML=markup;lastReadings=markup;}
 if(observation!==lastObservation){$('observation').textContent=observation;lastObservation=observation;}
 $('timeValue').textContent=fmt(state.time,1)+' / '+fmt(end(),1)+' s';$('timeRange').value=state.time;$('playButton').textContent=state.playing?'Ⅱ 暂停':'▶ 播放动作';
}
function makeTrace(config=state){
 if(config.sensor==='encoder')return Array.from({length:181},(_,i)=>({t:i*4,counts:encoderAt(i*4,config.encoderZero,config.slip).counts}));
 const rows=[],finish=config.experiment==='rotation'?6:10,step=config.experiment==='vibration'?.005:.025;
 for(let t=0;t<=finish+1e-7;t+=step)rows.push({t,...sensorSample(config,t)});return rows;
}
function redrawChart(){
 if(!$('signalDetails').open)return;const colors=['#2779cc','#369a9b','#8a82b2'],rows=makeTrace(),id=state.experiment;let series=[];
 const value=id==='rotation'?r=>r.omega:id==='position'?r=>r.estimate:id==='encoder'?r=>r.counts:id==='current'?r=>r.amps:r=>r.acc[2];
 if(compare)for(const r of records.filter(r=>r.experiment===id&&r.source==='simulation').slice(-3))series.push({rows:r.rows,value,color:'#97a5b5',dash:true});
 if(id==='rotation'||id==='encoder'||id==='current')series.push({rows,value,color:colors[0]});
 else if(id==='position')series.push({rows,value:r=>r.position,color:colors[0]},{rows,value:r=>r.estimate,color:colors[1],dash:true});
 else [0,1,2].forEach(i=>series.push({rows,value:r=>r.acc[i],color:colors[i]}));
 graph($('signal'),series,{xmax:id==='encoder'?720:end(),height:170,window:id==='vibration'?[2,8]:null});
 chartDirty=false;
}
function frame(now){
 raf=0;if(document.hidden||!inView){lastFrame=0;return;}
 const dt=lastFrame?Math.min(.05,(now-lastFrame)/1000):1/60;lastFrame=now;
 if(state.playing&&!reduced.matches){state.time=Math.min(end(),state.time+dt);if(state.time>=end())state.playing=false;dirty=true;}
 if(dirty){const s=sensorSample(state);scene?.setState(s,state);labels(s);if(chartDirty)redrawChart();const svg=$('signal'),cursor=svg.querySelector('.trace-cursor');if(cursor&&state.experiment!=='encoder'){const x=44+Number(svg.dataset.plotWidth)*state.time/end();cursor.setAttribute('d','M'+x+' 7V'+(Number(svg.dataset.plotHeight)-23));}dirty=false;}
 const moving=scene?.render(dt,reduced.matches);if(state.playing||moving)raf=requestAnimationFrame(frame);else lastFrame=0;
}
function run(){
 if(reduced.matches){state.playing=false;state.time=Math.min(end(),state.time+.5);changed();toast('减少动态已启用：单步前进0.5秒。');return;}
 if(state.time>=end())state.time=0;state.playing=!state.playing;wake();
}
function capture(){
 const s=sensorSample(state),info=sensors[state.sensor];
 records.push({id:Date.now()+'-'+records.length,source:'simulation',sensor:state.sensor,experiment:state.experiment,label:info.name+' · '+{gravity:'倾斜与保持',rotation:'慢转与快转',vibration:'振动对照',position:'位置与漂移',encoder:'轮轴计数',current:'驱动工况'}[state.experiment],summary:$('observation').textContent,detail:state.sensor==='encoder'?'360计数/转；轮径0.16m；增量式教学模型':state.sensor==='current'?'电流与转速均为稳态教学设定':(state.includeGravity?'含重力':'理想去重力')+'；偏置'+state.bias+'m/s²',createdAt:new Date().toISOString(),state:{...state,events:[...state.events],playing:false},sample:s,rows:makeTrace(),units:{time:'s',acceleration:'m/s²',angularVelocity:'rad/s',angle:'deg',current:'A',distance:'m',counts:'count'}});
 if(records.length>50)records.shift();updateRecords();chartDirty=true;wake();toast('已记录当前读数和动作条件，可在“观察记录”中导出。');
}
function updateRecords(){
 $('recordCount').textContent=records.length;
 $('notebook').innerHTML=records.length?records.map(r=>'<article class="notebook-entry"><div><span class="eyebrow">'+(r.source==='simulation'?'教学模拟':'用户导入')+'</span><h3>'+esc(r.label)+'</h3><p>'+esc(r.summary)+'</p><small>'+esc(r.detail||'')+'</small></div><button data-delete="'+r.id+'" aria-label="删除这条记录">×</button></article>').join(''):'<p class="notebook-empty">操作模型后，点击“记录这次观察”。关闭页面前可导出保存。</p>';
}
function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);}
function exportRecords(){download('机器人自身状态感知-观察记录.json',JSON.stringify({student:$('studentName').value,createdAt:new Date().toISOString(),records},null,2),'application/json');}
const csvCell=s=>'"'+String(s??'').replace(/"/g,'""')+'"';
function exportCSV(){
 const rows=[['record','source','sensor','experiment','t_s','wheel_angle_axis_deg','ax_m_s2','ay_m_s2','az_m_s2','omega_rad_s','relative_counts','current_A','conditions']];
 for(const r of records)for(const p of r.rows||[])rows.push([r.label,r.source,r.sensor,r.experiment,r.experiment==='encoder'?'':p.t,r.experiment==='encoder'?p.t:'',...(p.acc||['','','']),p.omega??'',p.counts??'',p.amps??'',r.detail]);
 download('机器人自身状态感知-采样记录.csv','\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
}
// Shared parser and plot helpers are retained from the preceding version.
function pathFor(rows,value,xmin,xmax,ymin,ymax,W=900,H=146){const l=44,r=W-12,t=9,b=H-24,x=v=>l+(v-xmin)/(xmax-xmin||1)*(r-l),y=v=>b-(v-ymin)/(ymax-ymin||1)*(b-t);let d='',started=false;for(const row of rows){const v=value(row);if(!Number.isFinite(v)){started=false;continue;}d+=(started?'L':'M')+x(row.t).toFixed(2)+','+y(v).toFixed(2);started=true;}return d;}
function graph(svg,series,{xmin=0,xmax=10,window=null,height=146,unit=''}={}){
  const W=Math.max(300,svg.getBoundingClientRect().width||900);svg.setAttribute('viewBox',`0 0 ${W} ${height}`);svg.dataset.plotWidth=W-56;svg.dataset.plotHeight=height;
  let min=Infinity,max=-Infinity;for(const s of series)for(const r of s.rows){const v=s.value(r);if(Number.isFinite(v)){min=Math.min(min,v);max=Math.max(max,v);}}
  if(!Number.isFinite(min)){min=-1;max=1;}if(Math.abs(max-min)<.01){min-=1;max+=1;}const pad=(max-min)*.13;min-=pad;max+=pad;if(min>0&&min<2)min=0;
  let html='';for(let i=0;i<4;i++){const y=9+(height-33)*i/3,v=max-(max-min)*i/3;html+=`<path class="trace-grid" d="M44 ${y}H${W-12}"/><text class="trace-label" x="36" y="${y+3}" text-anchor="end">${Math.abs(v)>100?fmt(v,0):fmt(v,1)}</text>`;}
  for(let i=0;i<6;i++){const x=44+(W-56)*i/5;html+=`<text class="trace-label" x="${x}" y="${height-5}" text-anchor="middle">${fmt(xmin+(xmax-xmin)*i/5,1)}</text>`;}
  if(window){const a=44+(W-56)*(window[0]-xmin)/(xmax-xmin),b=44+(W-56)*(window[1]-xmin)/(xmax-xmin);html+=`<rect class="range-window" x="${a}" y="7" width="${Math.max(0,b-a)}" height="${height-29}"/>`;}
  for(const s of series)html+=`<path class="trace-path" stroke="${s.color}" opacity="${s.opacity||1}" ${s.dash?'stroke-dasharray="4 4"':''} d="${pathFor(s.rows,s.value,xmin,xmax,min,max,W,height)}"/>`;
  svg.innerHTML=html+'<path class="trace-cursor" d="M44 7V'+(height-23)+'"/>';svg.dataset.min=xmin;svg.dataset.max=xmax;
}

function parseCSV(text){const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0],delim=['\t',';',','].sort((a,b)=>first.split(b).length-first.split(a).length)[0],rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delim&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}if(quoted)throw Error('引号未闭合，请检查原文件。');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;}
async function chooseCSV(file){if(!file)return;if(file.size>15*1024*1024){$('csvStatus').textContent='文件超过15MB，请先截取需要的采样段。';return;}try{const all=parseCSV(await file.text());if(all.length<3||all.length>100002)throw Error('需要表头和至少2行数据，最多100000行。');pendingCSV={name:file.name,headers:all[0],rows:all.slice(1)};
  for(const id of ['csvTime','csvX','csvY','csvZ'])$(id).innerHTML=(id==='csvTime'?'':'<option value="-1">缺失 / 不导入</option>')+all[0].map((s,i)=>`<option value="${i}">${esc(s||'第'+(i+1)+'列')}</option>`).join('');
  $('csvTime').value=Math.max(0,all[0].findIndex(x=>/time|timestamp|时间|^t$/i.test(x)));for(const [id,axis]of [['csvX','x'],['csvY','y'],['csvZ','z']]){const i=all[0].findIndex(x=>new RegExp('(^|[^a-z])a?'+axis+'([^a-z]|$)','i').test(x));$(id).value=i<0?-1:i;}
  $('csvMapping').hidden=false;$('csvStatus').textContent=`已读取 ${file.name}。核对列与单位后应用映射；现有导入图不会提前改变。`;
}catch(e){pendingCSV=null;$('csvMapping').hidden=true;$('csvStatus').textContent=e.message;}}
function applyCSV(){if(!pendingCSV)return;try{const ti=Number($('csvTime').value),axes=['csvX','csvY','csvZ'].map(id=>Number($(id).value)),ts=Number($('csvTimeUnit').value),as=Number($('csvAccelUnit').value);if(axes.every(i=>i<0))throw Error('至少选择一个加速度轴。');const selected=[ti,...axes.filter(i=>i>=0)];if(new Set(selected).size!==selected.length)throw Error('时间列和各轴必须使用不同列。');let prev=-Infinity;const rows=pendingCSV.rows.map((row,index)=>{const numeric=i=>{if(!row[i]?.trim()||!Number.isFinite(Number(row[i])))throw Error(`第${index+2}行缺少有效数字，未用0替代。`);return Number(row[i]);};const t=numeric(ti)*ts;if(t<=prev)throw Error(`第${index+2}行时间没有严格递增。`);prev=t;return{t,acc:axes.map(i=>i<0?null:numeric(i)*as)};});
 imported={name:pendingCSV.name,source:'user-imported',rows,axes,timeScale:ts,accelerationScale:as};$('importedChart').hidden=false;$('importedName').textContent=imported.name+' · 用户导入原始数据';$('csvStatus').textContent=`已应用${rows.length}行；缺失轴保持缺失。三维姿态仍来自教学模拟。`;$('csvFrom').value=rows[0].t;$('csvTo').value=rows.at(-1).t;drawImported();
}catch(e){$('csvStatus').textContent=e.message;}}
function compactRows(rows,max=2400){if(rows.length<=max)return rows;const out=[],n=Math.ceil(rows.length/(max/6));for(let i=0;i<rows.length;i+=n){const chunk=rows.slice(i,i+n),pick=new Set([0,chunk.length-1]);for(let a=0;a<3;a++){let lo=0,hi=0;for(let j=1;j<chunk.length;j++){if(Number.isFinite(chunk[j].acc[a])&&chunk[j].acc[a]<chunk[lo].acc[a])lo=j;if(Number.isFinite(chunk[j].acc[a])&&chunk[j].acc[a]>chunk[hi].acc[a])hi=j;}pick.add(lo);pick.add(hi);}for(const j of [...pick].sort((a,b)=>a-b))out.push(chunk[j]);}return out;}
function drawImported(){if(!imported)return;graph($('csvSignal'),[0,1,2].filter(i=>imported.axes[i]>=0).map(i=>({rows:compactRows(imported.rows),value:r=>r.acc[i],color:['#327dd0','#39a7b4','#8b99d2'][i]})),{xmin:imported.rows[0].t,xmax:imported.rows.at(-1).t,height:180});}
function saveImported(){if(!imported)return;const from=Number($('csvFrom').value),to=Number($('csvTo').value),axis=Number($('csvAxis').value);if(!Number.isFinite(from)||!Number.isFinite(to)||from>to){$('csvStatus').textContent='窗口起止无效。';return;}if(imported.axes[axis]<0){$('csvStatus').textContent='这个轴在导入文件中缺失，不能记录为0。';return;}const rows=imported.rows.filter(r=>r.t>=from&&r.t<=to);if(!rows.length){$('csvStatus').textContent='这个窗口没有样本，未保存记录。';return;}let peak=0;for(const r of rows)peak=Math.max(peak,Math.abs(r.acc[axis]));records.push({id:Date.now()+'-csv',source:'user-imported',experiment:'imported',label:imported.name,summary:`${'xyz'[axis]}轴 · ${fmt(from)}–${fmt(to)}s · |a|峰值${fmt(peak)}m/s²`,detail:'来自用户文件；仅展示原始数据，不据此推断姿态、碰撞或位置。',createdAt:new Date().toISOString(),window:[from,to],axis,rows,units:{time:'s',acceleration:'m/s²'},originalUnits:{timeScale:imported.timeScale,accelerationScale:imported.accelerationScale}});updateRecords();$('csvStatus').textContent='已保存导入窗口，来源保持为用户导入。';}

$$('.sensor-tab').forEach(b=>b.onclick=()=>selectSensor(b.dataset.sensor));
$('modeButtons').onclick=e=>{const b=e.target.closest('[data-mode]');if(b)setExperiment(b.dataset.mode);};
for(const [id,key]of [['tiltRange','tilt'],['frequencyRange','frequency'],['biasRange','bias'],['wheelRange','wheelAngle'],['timeRange','time']])$(id).oninput=()=>{state[key]=Number($(id).value);state.playing=false;if(key==='frequency'||key==='bias')state.time=0;syncControls();changed();};
for(const [id,key]of [['gravityToggle','includeGravity'],['looseToggle','loose'],['slipToggle','slip'],['axesToggle','axes'],['inspectToggle','inspect']])$(id).onchange=()=>{state[key]=$(id).checked;changed();};
$$('[data-tilt]').forEach(b=>b.onclick=()=>{state.tilt=+b.dataset.tilt;syncControls();changed();});
$$('[data-duration]').forEach(b=>b.onclick=()=>{state.duration=+b.dataset.duration;state.time=0;state.playing=false;syncControls();changed();});
$$('[data-wheel]').forEach(b=>b.onclick=()=>{state.wheelAngle=+b.dataset.wheel;syncControls();changed();});
$('encoderZero').onclick=()=>{state.encoderZero=state.wheelAngle;changed();toast('当前轮轴位置已设为相对零位。');};
$$('[data-load]').forEach(b=>b.onclick=()=>{state.load=+b.dataset.load;state.time=0;state.playing=false;syncControls();changed();});
$('resetExperiment').onclick=()=>{const sensor=state.sensor,exp=state.experiment;selectSensor(sensor);setExperiment(exp);};
$('playButton').onclick=run;$('stepButton').onclick=()=>{state.playing=false;state.time=Math.min(end(),state.time+.1);changed();};
$('tapButton').onclick=()=>{if(state.time>=9.7){state.time=0;state.events=[];}state.events.push(state.time+.15);if(reduced.matches)state.time+=.15;else state.playing=true;changed();};
$('captureButton').onclick=capture;
$('compareToggle').onchange=()=>{compare=$('compareToggle').checked;redrawChart();};
$('signalDetails').ontoggle=()=>{if($('signalDetails').open)redrawChart();};
$('focusSensor').onclick=$('locateButton').onclick=()=>{state.inspect=true;$('inspectToggle').checked=true;scene?.focusPart(state.sensor);$$('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));$('focusSensor').setAttribute('aria-pressed','true');changed();};
$$('[data-view]').forEach(b=>b.onclick=()=>{scene?.setView(b.dataset.view);$$('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('focusSensor').setAttribute('aria-pressed','false');});
$('viewport').onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key)){e.preventDefault();scene?.setView(e.key==='ArrowUp'?'top':e.key==='ArrowLeft'?'side':e.key==='ArrowRight'?'front':'iso');} };
$('themeButton').onclick=()=>{state.theme=state.theme==='light'?'dark':'light';document.documentElement.dataset.theme=state.theme;$$('.iso').forEach(el=>el.dataset.theme=state.theme);scene?.setTheme(state.theme);$('themeButton').innerHTML='◐ <span>'+(state.theme==='light'?'深色':'浅色')+'</span>';$('themeButton').setAttribute('aria-label','切换'+(state.theme==='light'?'深色':'浅色')+'主题');wake();};
$('recordBtn').onclick=()=>{updateRecords();$('recordsDialog').showModal();};
$('csvOpen').onclick=()=>$('csvDialog').showModal();
$$('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('exportRecords').onclick=exportRecords;$('exportCSV').onclick=exportCSV;
$('clearRecords').onclick=()=>{records=[];updateRecords();chartDirty=true;wake();};
$('notebook').onclick=e=>{const b=e.target.closest('[data-delete]');if(b){records=records.filter(r=>r.id!==b.dataset.delete);updateRecords();chartDirty=true;wake();}};
$('csvFile').onchange=()=>chooseCSV($('csvFile').files[0]);$('applyCSV').onclick=applyCSV;$('saveCSV').onclick=saveImported;
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}else wake();});
const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)wake();else{state.playing=false;labels(sensorSample(state));if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}},{threshold:.01});observer.observe(document.querySelector('.main-grid'));
reduced.addEventListener('change',()=>{state.playing=false;wake();});
new ResizeObserver(()=>{chartDirty=true;if($('signalDetails').open)redrawChart();}).observe($('signal'));
window.__SENSE__={snapshot:()=>({state:{...state,events:[...state.events]},sample:sensorSample(state),scene:scene?.stats()||{available:false},records:records.map(r=>({...r,rows:undefined})),imported:imported?{name:imported.name,rows:imported.rows,axes:imported.axes}:null,reduced:reduced.matches}),setState(patch){if(patch.sensor&&patch.sensor!==state.sensor)selectSensor(patch.sensor);if(patch.experiment&&patch.experiment!==state.experiment)setExperiment(patch.experiment);Object.assign(state,patch);syncControls();changed();},selectSensor,capture,sceneStats:()=>scene?.stats()||{available:false},get records(){return records;}};
selectSensor('accel');updateRecords();wake();
})();
