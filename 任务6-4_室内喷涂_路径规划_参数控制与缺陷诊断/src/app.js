const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let tab='coverage',p={...M.DEFAULTS,slow:false},progress=0,playing=!reduced.matches,rate=4,raf=0,last=0,visible=true,stats,pose,zoom=false;
const head=$$('[data-group="head"]'),robot=$$('[data-group="robot"]');
const lessons={
 coverage:{title:'路径走遍 ≠ 喷幅覆盖',subtitle:'改变道间距，观察漏带如何出现；再用喷距改变喷幅。',question:'喷幅400 mm，道间距500 mm，会留下多宽的漏带？',answers:['没有漏带','100 mm','500 mm'],correct:1,feedback:'中间漏带为 s − W = 100 mm。端道调整不改变中间道的结论。'},
 opening:{title:'中心没进窗，喷幅可能已经进了',subtitle:'路径保持不变，只切换喷枪触发逻辑，比较窗洞污染与窗边漏区。',question:'关喷判断应该看喷嘴中心，还是整个喷幅？',answers:['只看中心','看整个喷幅'],correct:1,feedback:'喷幅有宽度。先按完整喷幅保护洞口，再复核窗边尚未覆盖的区域。'},
 dose:{title:'减速时，流量也要一起思考',subtitle:'跟随升降滑台观察起收段；同一条路径，停留时间改变局部沉积。',question:'速度降到一半、流量保持不变，相对沉积如何变化？',answers:['减半','不变','约为2倍'],correct:2,feedback:'在本页固定传递效率的假设下，流量÷速度变成2倍；这不是实际流挂判据。'}
};
function planeMatrix(){const a=iso([-180,-69.95,285],PROJECTION),b=iso([-179.9,-69.95,285],PROJECTION),c=iso([-180,-69.95,284.9],PROJECTION);return `matrix(${b[0]-a[0]} ${b[1]-a[1]} ${c[0]-a[0]} ${c[1]-a[1]} ${a[0]} ${a[1]})`;}
$('#wallOverlay').setAttribute('transform',planeMatrix());
function coatMarkup(){const ds=['','','',''];for(const c of stats.cells){if(!c.n)continue;const i=c.hole?3:Math.min(c.n,3)-1;ds[i]+=`M${c.x-10} ${2400-c.z-10}h20v20h-20Z`;}
 return ds.map((d,i)=>`<path class="coverage-${['one','two','three','polluted'][i]}" d="${d}"/>`).join('');}
function routeMarkup(){let on='',off='';for(const seg of M.pathSegments(p)){if(seg.travel){off+=`M${seg.x0} ${2400-seg.z0}L${seg.x1} ${2400-seg.z1}`;continue;}const step=20*Math.sign(seg.z1-seg.z0);for(let z=seg.z0;step>0?z<seg.z1:z>seg.z1;z+=step){const z1=z+step,d=`M${seg.x0} ${2400-z}L${seg.x0} ${2400-z1}`;if(M.sprayAllowed(seg.x0,(z+z1)/2,p))on+=d;else off+=d;}}
 return `<path class="route-off" d="${off}"/><path class="route-on" d="${on}"/>`;}
function setMetric(i,label,value,unit,note){$('#metric'+i+'Label').textContent=label;$('#metric'+i).innerHTML=value+' <small>'+unit+'</small>';$('#metric'+i+'Note').textContent=note;}
function updatePlan(){
 stats=M.coverage(p);const coat=coatMarkup(),route=routeMarkup();$('#coat').innerHTML=coat;$('#mapCoat').innerHTML=coat;$('#wallRoute').innerHTML=route;$('#mapRoute').innerHTML=route;
 for(const id of ['spacing','distance','speed']){$('#'+id).value=p[id];$('#'+id+'Out').textContent=p[id]+(id==='speed'?' mm/s':' mm');}
 $('#slow').checked=p.slow;$('#compensate').checked=p.compensate;$$('[data-guard]').forEach(b=>{b.classList.toggle('active',b.dataset.guard===p.guard);b.setAttribute('aria-pressed',b.dataset.guard===p.guard);});
 const o=M.overlap(p);
 if(tab==='coverage'){
  setMetric(1,'教学喷幅',Math.round(o.width),'mm','固定扇角 · W ∝ D');setMetric(2,o.gap?'中间道漏带':'相邻道重叠',o.gap?Math.round(o.gap):Math.round(o.ratio*100),o.gap?'mm':'%','名义值，不含末道调整');setMetric(3,'计划几何覆盖',stats.percent.toFixed(1),'%','扣除洞口 · 20 mm网格');
  $('#takeaway').textContent=o.gap?`道间距大于喷幅，中间留下 ${Math.round(o.gap)} mm 漏带；“中心线走遍”不能保证覆盖。`:`相邻道搭接 ${Math.round(o.ratio*100)}%；窗边仍有 ${stats.area.toFixed(2)} m² 计划未覆盖区，需要精细补作业。`;
 }else if(tab==='opening'){
  setMetric(1,'洞口受喷面积',stats.pollution.toFixed(1),'%','完整计划 · 窗洞内估计');setMetric(2,'墙面未覆盖',stats.area.toFixed(2),'m²','不含洞口 · 需要复核');setMetric(3,'开关判断',p.guard==='footprint'?'喷幅':p.guard==='center'?'中心':'无保护','','路径与触发逻辑分开');
  $('#takeaway').textContent=p.guard==='footprint'?'洞口污染降为零；窗边留下的空白不能靠取消保护解决，应单独规划精细补作业。':p.guard==='center'?'中心尚未进入洞口，喷幅边缘已经越界。只判断中心，会漏掉窗侧与启停边缘。':'中心线经过窗洞时仍在喷涂。运动路径正确，不代表开关时序也正确。';
 }else{
  drawPlot();$('#takeaway').textContent=p.compensate?'速度降低，流量同比降低：模型中的相对沉积保持一致。实际设备还需要考虑阀与供料响应。':p.slow?'起收段减速到50%，定流量下局部相对沉积增至匀速段的2倍；曲线展示完整单道。':'匀速、定流量时，模型中的相对沉积沿单道保持一致。';
 }
 draw();
}
function drawPlot(){let d='';for(let i=0;i<=100;i++){const v=M.depositionAt(i/100,p),y=128-v.dose*50;d+=(i?'L':'M')+(36+i*3.3)+' '+y;}
 $('#doseCurve').setAttribute('d',d);$('#doseArea').setAttribute('d',d+'L366 128H36Z');
 // Plot vertical scale follows the largest modeled dose, so slow experiments never clip.
 const max=Math.max(2,600/p.speed),scale=100/max;let curve='';for(let i=0;i<=100;i++)curve+=(i?'L':'M')+(36+i*3.3)+' '+(128-M.depositionAt(i/100,p).dose*scale);
 $('#doseCurve').setAttribute('d',curve);$('#doseArea').setAttribute('d',curve+'L366 128H36Z');$('#dosePlot').dataset.scale=scale;
 const text=$$('#dosePlot text');text[0].textContent=max.toFixed(1)+'×';text[1].textContent=(max/2).toFixed(1)+'×';
}
function shift(el,delta){el.setAttribute('transform',translateAlong(PROJECTION,delta));}
function draw(){
 pose=M.poseAt(progress,p);const x=pose.x/10-183,z=M.WALL.base+pose.z/10,dy=(p.distance-300)/10;
 robot.forEach(el=>shift(el,[x,dy,0]));head.forEach(el=>shift(el,[x,dy,z-150]));
 const w=M.fanWidth(p.distance),r=`M${pose.x-w/2} ${2400-pose.z-40}h${w}v80h-${w}Z`;
 $('#wallFootprint').setAttribute('d',r);$('#mapFootprint').setAttribute('x',pose.x-w/2);$('#mapFootprint').setAttribute('y',2400-pose.z-40);$('#mapFootprint').setAttribute('width',w);$('#mapFootprint').setAttribute('height',80);
 for(const id of ['wallDot','mapDot']){$('#'+id).setAttribute('cx',pose.x);$('#'+id).setAttribute('cy',2400-pose.z);}
 const nx=pose.x/10-180,ny=-40+dy;
 const aim=iso([nx,ny,z],PROJECTION);$('#machine').setAttribute('viewBox',zoom?`${aim[0]-190} ${aim[1]-145} 470 300`:'0 0 1050 620');
 const fan=[iso([nx,ny,z],PROJECTION),iso([nx-w/20,-69.9,z-4],PROJECTION),iso([nx+w/20,-69.9,z-4],PROJECTION),iso([nx+w/20,-69.9,z+4],PROJECTION),iso([nx-w/20,-69.9,z+4],PROJECTION)];
 $('#sprayFan').setAttribute('d',pathOf(fan,true));$('#sprayFan').style.opacity=pose.on?'1':'0';$('#wallFootprint').style.opacity=pose.on?'1':'.25';$('#mapFootprint').style.opacity=pose.on?'1':'.25';
 $('#valveState').textContent=pose.on?'喷枪开启':pose.travel?'换道 · 停喷':'洞口保护 · 停喷';$('#valveLed').style.opacity=pose.on?'1':'.25';$('#phase').textContent=pose.travel?'换道 · 喷枪关闭':pose.on?'竖向作业 · 喷枪开启':'通过保护区 · 喷枪关闭';
 $('#liveSpeed').textContent=Math.round(pose.v)+' mm/s';$('#tcp').textContent=`TCP · X ${(pose.x/1000).toFixed(2)} m / Z ${(pose.z/1000).toFixed(2)} m`;
 $('#progress').value=Math.round(progress*1000);$('#progressLabel').textContent=Math.round(progress*100)+'%';$('#passLabel').textContent=`第 ${pose.pass} / ${M.passes(p.spacing).length} 道`;$('#play').textContent=reduced.matches?'单步预览':playing?'Ⅱ 暂停':'▶ 播放';
 if(tab==='dose'){
  setMetric(1,'当前TCP速度',Math.round(pose.v),'mm/s',pose.travel?'换道期间关闭喷枪':'起收段可减速到50%');setMetric(2,'当前相对流量',pose.on?(pose.flow*100).toFixed(0):'0','%','相对于本课基准流量');setMetric(3,'局部相对沉积',pose.on?pose.dose.toFixed(2):'0','×',pose.on?'300 mm/s 匀速段 = 1×':'停喷时不产生沉积');
  $('#doseDot').setAttribute('cx',36+(pose.z-40)/2320*330);$('#doseDot').setAttribute('cy',128-pose.dose*Number($('#dosePlot').dataset.scale||50));$('#doseDot').style.opacity=pose.on?'1':'.3';
 }
}
function renderLesson(reset=true){
 if(reset){p={...M.DEFAULTS,slow:tab==='dose'};progress=0;}
 const l=lessons[tab];$('#title').textContent=l.title;$('#subtitle').textContent=l.subtitle;$('#question').textContent=l.question;$('#feedback').textContent='先预测，再拖动参数验证。';
 $('#answers').innerHTML=l.answers.map((a,i)=>`<button data-answer="${i}">${a}</button>`).join('');
 $$('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-pressed',b.dataset.tab===tab);});$$('[data-panel]').forEach(el=>el.hidden=el.dataset.panel!==tab);
 $('#map').toggleAttribute('hidden',tab==='dose');$('#dosePlot').toggleAttribute('hidden',tab!=='dose');$('#miniTitle').textContent=tab==='dose'?'单道相对沉积':'墙面展开';$('#miniNote').textContent=tab==='dose'?'完整单道 · 相对量':'完整计划预览';
 $('#planStatus').textContent=tab==='dose'?'相对沉积 ≠ 真实膜厚':'计划预览 ≠ 已完成施工';updatePlan();
}
function pause(){playing=false;draw();}
function tick(now){raf=0;if(!visible||document.hidden){last=0;return;}const dt=last?Math.min((now-last)/1000,1/30):0;last=now;if(playing&&!reduced.matches){const s=M.poseAt(progress,p);progress+=s.v/s.total*dt*rate;if(progress>=1)progress=0;draw();}if(playing&&!reduced.matches)raf=requestAnimationFrame(tick);}
function run(){if(!raf&&playing&&!reduced.matches&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}}
function togglePlay(){if(reduced.matches){progress=Math.min(.9999,progress+.02);playing=false;draw();return;}playing=!playing;draw();run();}
function step(delta=.007){pause();progress=Math.max(0,Math.min(.9999,progress+delta));draw();}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;renderLesson();run();}));
for(const id of ['spacing','distance','speed'])$('#'+id).addEventListener('input',e=>{pause();p[id]=Number(e.target.value);updatePlan();});
$$('[data-preset]').forEach(b=>b.addEventListener('click',()=>{pause();p.distance=300;p.spacing=b.dataset.preset==='gap'?500:200;progress=0;updatePlan();}));
$$('[data-guard]').forEach(b=>b.addEventListener('click',()=>{pause();p.guard=b.dataset.guard;updatePlan();}));
for(const id of ['slow','compensate'])$('#'+id).addEventListener('change',e=>{p[id]=e.target.checked;updatePlan();});
$('#inspectWindow').addEventListener('click',()=>{pause();const segs=M.pathSegments(p),i=segs.findIndex(s=>!s.travel&&s.x0>=M.WALL.hole.x-M.fanWidth(p.distance)/2&&s.x0<M.WALL.hole.x);const idx=Math.max(0,i);let d=segs.slice(0,idx).reduce((s,a)=>s+a.length,0);d+=Math.abs(1200-segs[idx].z0);progress=d/segs.reduce((s,a)=>s+a.length,0);draw();});
$('#play').addEventListener('click',togglePlay);$('#step').addEventListener('click',()=>step());$('#rewind').addEventListener('click',()=>{pause();progress=0;draw();});$('#rate').addEventListener('change',e=>rate=Number(e.target.value));$('#progress').addEventListener('input',e=>{const value=Number(e.target.value);pause();progress=Math.min(.999999,value/1000);draw();});$('#reset').addEventListener('click',()=>{pause();renderLesson();});
$('#answers').addEventListener('click',e=>{const b=e.target.closest('[data-answer]');if(!b)return;$$('[data-answer]').forEach(x=>x.classList.toggle('chosen',x===b));const ok=Number(b.dataset.answer)===lessons[tab].correct;$('#feedback').textContent=(ok?'判断正确。':'再想一想。')+lessons[tab].feedback;});
$('#theme').addEventListener('click',()=>{document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light';});
$('#zoom').addEventListener('click',()=>{zoom=!zoom;$('#zoom').textContent=zoom?'返回全景':'喷头近看';$('#zoom').setAttribute('aria-pressed',zoom);draw();});
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('#hint').textContent='当前环境未允许全屏，可使用浏览器的 F11。';}}
$('#fullscreen').addEventListener('click',full);document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'全屏演示'));
$('#help').addEventListener('click',()=>{pause();$('#helpDialog').showModal();});$('#closeHelp').addEventListener('click',()=>$('#helpDialog').close());
$('#mobileToggle').addEventListener('click',()=>{const on=$('.app').classList.toggle('mobile-controls');$('#mobileToggle').textContent=on?'查看模型 ⇄':'调节参数 ⇄';});
document.addEventListener('keydown',e=>{if($('#helpDialog').open||e.target.matches('input,select'))return;if(e.code==='Space'){if(e.target.matches('button'))return;e.preventDefault();togglePlay();}if(e.code==='ArrowRight'){e.preventDefault();step();}if(e.code==='ArrowLeft'){e.preventDefault();step(-.007);}if(e.key.toLowerCase()==='f')full();if(['1','2','3'].includes(e.key)){tab=['coverage','opening','dose'][Number(e.key)-1];renderLesson();}});
new IntersectionObserver(entries=>{visible=entries.at(-1).isIntersecting;if(visible)run();}).observe($('#scene'));
document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden)run();});reduced.addEventListener('change',()=>{if(reduced.matches)pause();else run();});
renderLesson();run();
window.sprayLab={snapshot:()=>({tab,p:{...p},progress,playing,pose:{...pose},coverage:{percent:stats.percent,area:stats.area,pollution:stats.pollution}}),model:M};

