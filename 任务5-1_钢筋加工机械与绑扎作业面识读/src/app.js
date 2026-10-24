(()=>{
'use strict';
const $=id=>document.getElementById(id), C=M.REBAR_MODEL, clone=x=>JSON.parse(JSON.stringify(x));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const machines=['straighten','cut','bend'], names={straighten:'调直机',cut:'切断机',bend:'弯曲机'};
const stocks=['待调直钢筋','已调直钢筋','定尺钢筋段','加工好的弯折钢筋'];
const places={
 slab:{title:'梁板边线',point:[-.8,-4.6,.7],detail:'先认清梁板范围和边缘。边线决定钢筋布置范围，也提醒我们不要把工具伸出作业面。'},
 column:{title:'柱边密集节点',point:[1.8,1.7,2.8],detail:'这里钢筋密集，工具进入空间小。即使看得见交点，也要留给人工配合处理。'},
 opening:{title:'洞口',point:[6,2.3,.75],detail:'这里是真实缺口。把隔离护栏放好，并在交接图中保留禁入区。'},
 joint:{title:'钢筋交点',point:[2.7,-2.1,.72],detail:'两向钢筋在交点处相交。打开检查台，找漏绑、量间距、看垫块，并标记需人工检查的松扣。'},
 material:{title:'材料堆放区',point:[7.8,-3.4,.9],detail:'这堆材料占了楼面作业空间。把它移到场外料架，腾出钢筋交点附近的位置。'},
 route:{title:'人员通道',point:[8,5.7,.85],detail:'人员通道必须保持连续。先搬走挡路的料箱；交接时仍要把人行路线与机器作业区分开。'}
};
const locationIds=Object.keys(places), zoneNames={auto:'机器人候选区',manual:'人工处理区',blocked:'禁止进入区'};
const regionNames={regular:'规则大面',column:'柱边节点',opening:'洞口周边'},expectedZones={regular:'auto',column:'manual',opening:'blocked'};
const initial=()=>({stage:0,stock:0,machine:'straighten',progress:0,lengthMM:1800,angleDeg:45,selected:'',tool:'',visited:[],inspected:[],game:{materialMoved:false,routeCleared:false,openingGuarded:false,zones:{}},finished:false});
let s=initial(),scene=null,inspection=null,playing=false,busy=false,raf=0,lastTime=0,dirtyUntil=0,visible=true,lastPaint=0,dragKind='',feedbackText='',feedbackTone='',hotspotKey='',inspectStart='missing';
let lastSceneState='';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageReady=()=>s.stock===3&&s.visited.length===6&&s.inspected.length===4;
const zoneCount=()=>Object.entries(expectedZones).filter(([k,v])=>s.game.zones[k]===v).length;
const unlocked=stage=>stage===0||(stage===1&&s.stock===3)||(stage===2&&stageReady());
function say(text,tone=''){feedbackText=text;feedbackTone=tone;$('feedback').textContent=text;$('feedback').className=tone;}
function wake(ms=1200){dirtyUntil=Math.max(dirtyUntil,performance.now()+ms);if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(frame);}
function sceneState(){return {mode:s.stage===0?'process':'overview',gameStage:s.stage,game:clone(s.game),machine:s.machine,progress:s.progress,lengthMM:s.lengthMM,angleDeg:s.angleDeg,cutaway:true,showLabels:false,showGrid:false,showReach:false,showRobot:false,showUpper:true,showLower:true,showDesign:false,base:[...C.base],spacingMM:400,selectedId:''};}
function syncScene(){const v=sceneState(),key=JSON.stringify(v);if(key!==lastSceneState){lastSceneState=key;scene?.setState(v);if(!scene)drawFallback();}wake();}
function materialIcon(kind){
 const base='<svg viewBox="0 0 100 64" fill="none" aria-hidden="true">';
 if(kind===0)return base+'<ellipse cx="40" cy="31" rx="24" ry="19" stroke="#2469ed" stroke-width="5"/><ellipse cx="47" cy="31" rx="24" ry="19" stroke="#2f81fa" stroke-width="5"/><path d="M70 31h21" stroke="#14385e" stroke-width="5" stroke-linecap="round"/></svg>';
 if(kind===1||kind===2)return base+'<path d="M10 36L'+(kind===1?'92':'76')+' 24" stroke="#244b76" stroke-width="8" stroke-linecap="round"/><path d="M12 33L'+(kind===1?'90':'74')+' 21" stroke="#66a4d9" stroke-width="2"/>'+Array.from({length:kind===1?10:7},(_,i)=>'<path d="M'+(17+i*7)+' '+(30-i)+'l2 9" stroke="#f2ad50" stroke-width="2"/>').join('')+'</svg>';
 if(kind===3)return base+'<path d="M15 42h44q12 0 12-12V10" stroke="#249f94" stroke-width="8" stroke-linecap="round"/><path d="M15 39h44q9 0 9-9V10" stroke="#81d9c5" stroke-width="2"/></svg>';
 if(kind==='guard')return base+'<path d="M17 54V12M82 54V12M17 20h65M17 42h65" stroke="#eea038" stroke-width="7"/><path d="M32 21l-8 20m24-20-8 20m24-20-8 20m23-20-8 20" stroke="#344f72" stroke-width="5"/></svg>';
 return base+'<rect x="22" y="8" width="56" height="48" rx="6" fill="#e5f0fe" stroke="#2469ed" stroke-width="2"/><path d="M33 24h34M33 34h24M33 44h30" stroke="#5384c0" stroke-width="3"/><path d="m61 13 4 4 9-9" stroke="#279d77" stroke-width="4"/></svg>';
}
function orderArt(){
 const a=s.machine==='bend'?s.angleDeg:90,rad=a*Math.PI/180,x=110+47*Math.cos(rad),y=74-47*Math.sin(rad);
 return '<svg viewBox="0 0 190 105"><defs><pattern id="orderGrid" width="15" height="15" patternUnits="userSpaceOnUse"><path d="M15 0H0V15" fill="none" stroke="#e1eaf7" stroke-width=".6"/></pattern></defs><rect width="190" height="105" rx="8" fill="#f4f8ff"/><rect width="190" height="105" fill="url(#orderGrid)"/><path d="M20 74h79q11 0 11-11V20" stroke="#8eabd2" stroke-width="6" fill="none" stroke-dasharray="4 5"/><path d="M20 74h90L'+x.toFixed(1)+' '+y.toFixed(1)+'" stroke="'+(a===90?'#2469ed':'#f39b36')+'" stroke-width="6" fill="none" stroke-linejoin="round"/><text x="134" y="53" font-size="17" fill="#2469ed" font-family="Microsoft YaHei">90°</text><text x="19" y="97" font-size="11" fill="#5f7b9d" font-family="Microsoft YaHei">目标轮廓 · 对照形状</text></svg>';
}
function render(){
 $('game').dataset.stage=s.stage;
 const headings=[['第一关 / 加工接力','让一根钢筋，准备好上工地。','接下这份加工订单，把手中的材料送进合适的机械。'],['第二关 / 楼面巡查','清通道，认清作业面。','找齐六处位置，移走障碍、放好护栏，再拿工具检查局部样板。'],['第三关 / 分区交接','这片楼面，谁来做？','拿起彩色区标，放到现场。把机器人、人工和禁入区域分清楚。']];
 const h=headings[s.stage];$('chapterLabel').textContent=h[0];$('missionTitle').textContent=h[1];$('missionSubtitle').textContent=h[2];
 const count=s.stage===0?s.stock:s.stage===1?s.visited.length+s.inspected.length:zoneCount(),total=s.stage===0?3:s.stage===1?10:3;
 $('progressLabel').textContent=['加工订单','巡查与检查','作业分区'][s.stage];$('progressCount').innerHTML=count+' <small>/ '+total+'</small>';$('progressFill').style.width=count/total*100+'%';
 document.querySelectorAll('[data-stage]').forEach(b=>{const n=Number(b.dataset.stage);b.setAttribute('aria-current',n===s.stage?'step':'false');b.setAttribute('aria-disabled',!unlocked(n));b.classList.toggle('complete',n===0?s.stock===3:n===1?stageReady():s.finished);});
 $('orderCard').hidden=s.stage!==0;$('siteNote').hidden=s.stage===0;$('orderDrawing').innerHTML=orderArt();
 const needSetting=s.stage===0&&s.stock>0&&s.stock<3&&s.machine===machines[s.stock];
 $('machineSetting').hidden=!needSetting||busy;
 if(needSetting){const cut=s.stock===1,range=$('settingRange');range.min=cut?1600:30;range.max=cut?2800:135;range.step=cut?100:5;range.value=cut?s.lengthMM:s.angleDeg;$('settingLabel').textContent=cut?'移动定尺挡块':'调整弯曲转角';$('settingValue').textContent=range.value+(cut?' mm':'°');$('settingHint').textContent=cut?'对照订单，把挡块移到 2400 mm。':'转到 90°，让钢筋与订单轮廓贴合。';}
 $('inspectionCount').textContent='四项检查 · '+s.inspected.length+' / 4';$('inspectBtn').textContent=s.inspected.length===4?'再看检查样板 ↗':'拿起检查工具 ↗';
 if(s.stage===0){$('carryIcon').innerHTML=materialIcon(s.stock);$('carryLabel').textContent='你手中的材料';$('carryName').textContent=stocks[s.stock];$('carryHint').textContent=s.stock===3?'订单完成，可以送往楼面':'拖到机械上，或点击机械上料';
 $('taskTools').innerHTML=machines.map((id,i)=>'<button data-machine="'+id+'" '+(busy?'disabled ':'')+'class="task-chip '+(s.stock>i?'done':s.stock===i?'active':'')+'"><b>'+(s.stock>i?'✓':'0'+(i+1))+'</b>'+names[id].replace('机','')+'</button>').join('');
 $('actionBtn').textContent=busy?(playing?'加工中…':'继续加工'):s.stock===3?'查看加工成品':s.stock===0?'送入调直机 →':s.stock===1?'启动切断机 →':'启动弯曲机 →';$('actionBtn').disabled=busy&&playing;$('nextBtn').hidden=s.stock!==3;$('nextBtn').textContent='送往楼面 →';
 $('sceneLegend').innerHTML='<span><i class="blue"></i>调直：改变平直度</span><span><i class="orange"></i>切断：改变长度</span><span><i class="teal"></i>弯曲：改变形状</span>';
 }else if(s.stage===1){$('carryIcon').innerHTML=materialIcon('guard');$('carryLabel').textContent='现场工具';$('carryName').textContent=s.tool==='guard'?'隔离护栏已拿起':'隔离护栏';$('carryHint').textContent='拖到洞口，或点击洞口后放置';
 $('taskTools').innerHTML=locationIds.map((id,i)=>'<button data-place="'+id+'" class="task-chip '+(s.visited.includes(id)?'done':'')+'"><b>'+(s.visited.includes(id)?'✓':i+1)+'</b>'+({slab:'边线',column:'柱边',opening:'洞口',joint:'交点',material:'堆料',route:'通道'}[id])+'</button>').join('')+'<button class="task-chip '+(s.inspected.length===4?'done':'')+'" data-inspect="missing"><b>⌕</b>检查台 '+s.inspected.length+'/4</button>';
 const labels={material:s.game.materialMoved?'堆料已移到料架':'把堆料移到料架 →',opening:s.game.openingGuarded?'洞口已设置护栏':'放置洞口护栏 →',route:s.game.routeCleared?'人员通道已疏通':'搬走挡路料箱 →',joint:'打开交点检查台 →',column:'柱边已记录 · 继续巡查',slab:'边线已记录 · 继续巡查'};
 $('actionBtn').textContent=labels[s.selected]||'开始巡查 →';$('actionBtn').disabled=false;$('nextBtn').hidden=!stageReady();$('nextBtn').textContent='开始分区交接 →';
 $('sceneLegend').innerHTML='<span><i class="blue"></i>找六处现场位置</span><span><i class="orange"></i>搬料、清路、设护栏</span><span><i class="teal"></i>用工具检查样板</span>';
 }else{$('carryIcon').innerHTML=materialIcon('record');$('carryLabel').textContent='你手中的区标';$('carryName').textContent=zoneNames[s.tool]||'先拿起一枚区标';$('carryHint').textContent='拖放区标，或选颜色后点击区域';
 $('taskTools').innerHTML=Object.entries(zoneNames).map(([id,title])=>'<button draggable="true" data-zone="'+id+'" aria-pressed="'+(s.tool===id)+'" class="task-chip zone-'+id+'"><b>●</b>'+title+'</button>').join('');
 $('actionBtn').textContent=zoneCount()===3?'提交交接图 ✓':'提交前检查分区';$('actionBtn').disabled=false;$('nextBtn').hidden=true;
 $('sceneLegend').innerHTML='<span><i class="green"></i>规则大面：候选</span><span><i class="orange"></i>密集节点：人工</span><span><i class="red"></i>洞口：禁入</span>';
 }
 $('carryCard').setAttribute('aria-pressed',!!s.tool);$('carryCard').draggable=!busy;$('processOverlay').hidden=!busy;$('pauseBtn').textContent=playing?'暂停':'继续';$('pauseBtn').setAttribute('aria-label',playing?'暂停加工':'继续加工');
 $('footerTip').textContent=s.stage===0?'本例加工路线：调直 → 切断 → 弯曲':s.stage===1?'先看清位置，再用现场操作整理作业条件。':'交接的是作业区域与依据；机器人操作在下一任务中学习。';
 renderHotspots();syncScene();say(feedbackText,feedbackTone);
}
function mark(id){if(!s.visited.includes(id))s.visited.push(id);}
function focus(id){scene?.focus(id);wake(1800);}
function feed(id){
 if(s.stage!==0||busy)return;
 if(s.stock===3){focus(id);say('加工订单已完成：从弯曲材料到定尺弯折件。可以送往楼面。','success');return;}
 const expected=machines[s.stock];s.machine=id;
 if(id!==expected){const purpose={straighten:'调直机改变平直度。',cut:'切断机改变长度。',bend:'弯曲机改变形状。'},next=['先用调直机把弯曲钢筋变直。','当前钢筋已经调直，请用切断机定尺下料。','当前钢筋已经定尺切断，接下来用弯曲机成形。'];say(purpose[id]+next[s.stock],'notice');focus(id);render();return;}
 if(id==='cut'&&s.lengthMM!==2400){say('挡块现在是 '+s.lengthMM+' mm。移动挡块，对准订单中的 2400 mm，再启动切断。','notice');focus(id);render();return;}
 if(id==='bend'&&s.angleDeg!==90){say('现在设为 '+s.angleDeg+'°，还没有贴合订单的直角轮廓。把转角调整到 90°。','notice');focus(id);render();return;}
 s.progress=0;playing=true;busy=true;s.tool='';focus(id);say('观察'+names[id]+'：'+({straighten:'交错调直轮让钢筋反复反向弯曲。',cut:'先定尺夹持，再由刀片切断。',bend:'推动销绕中心芯轴转动，带动钢筋弯曲。'}[id]));render();
 if(reduced.matches){s.progress=1;completeProcess();}else wake(6000);
}
function completeProcess(){
 playing=false;busy=false;s.progress=1;const id=s.machine;s.stock=Math.max(s.stock,machines.indexOf(id)+1);
 const text={straighten:'调直完成！钢筋变直了。下一棒：移动切断机挡块，定好下料长度。',cut:'切断完成！得到 2400 mm 钢筋段。下一棒：把弯曲转角调到 90°。',bend:'订单完成！这就是加工好的钢筋，接下来到楼面看它要在哪里作业。'};
 say(text[id],'success');render();
}
function select(id){
 if(machines.includes(id)){feed(id);return;}
 if(s.stage===0)return;
 if(id==='routeObstacle')id='route';
 if(/^R\d+-C\d+$/.test(id)||id==='spacer')id='joint';
 if(s.stage===2){if(id==='slab'||id==='joint')id='regular';if(expectedZones[id]){paint(id);return;}say('把区标放到规则大面、柱边节点或洞口周边。');return;}
 if(id==='storage'){const carried=s.tool==='material'?'material':s.tool==='route'?'route':null;if(carried)performSite(carried);else say('场外料架已准备好。先拿起楼面堆料或通道料箱。');return;}
 if(!places[id])return;
 s.selected=id;$('objectTitle').textContent=places[id].title;$('objectDescription').textContent=places[id].detail;
 if(['slab','column','joint'].includes(id))mark(id);
 if(id==='opening'&&s.tool==='guard'){performSite(id);return;}
 say(places[id].detail);
 if(id==='material')s.tool='material';else if(id==='route')s.tool='route';
 render();
}
function performSite(id){
 if(s.stage!==1)return;
 s.selected=id;
 if(id==='material'){s.game.materialMoved=true;mark(id);say('堆料已移到场外料架，楼面上的交点重新露出来了。','success');}
 else if(id==='opening'){s.game.openingGuarded=true;mark(id);say('洞口护栏已放好。护栏只是隔离边界，洞口仍然禁止进入。','success');}
 else if(id==='route'){s.game.routeCleared=true;mark(id);say('挡路料箱已移走，人员通道恢复连续；仍要与机器作业区分开。','success');}
 else if(id==='joint'){openInspection();return;}
 else {const todo=locationIds.find(k=>!s.visited.includes(k));if(todo){select(todo);return;}openInspection();return;}
 s.tool='';render();if(stageReady())say('现场整理和四项样板检查均已完成。可以拿起区标，准备交接。','success');
}
function paint(region){
 s.selected=region;$('objectTitle').textContent=regionNames[region];$('objectDescription').textContent=region==='regular'?'钢筋排列规则、交点连续清楚，是本例中的机器人候选区。':region==='column'?'密集钢筋限制工具进入，需要人工配合。': '洞口是缺口，护栏内侧及隔离边界保持禁入。';
 if(!zoneNames[s.tool]){say('先从下方拿起一枚彩色区标，再放到'+regionNames[region]+'。');return;}
 s.game.zones[region]=s.tool;
 const ok=s.tool===expectedZones[region];
 const reasons={regular:'这里交点规则、空间开阔，可标为机器人候选区。',column:'这里钢筋密集，工具进入空间不足，应交给人工配合。',opening:'这里有真实缺口，设置护栏后仍应保留禁止进入区。'};
 say((ok?'区标已放好。':'这个区标还需要调整。')+reasons[region],ok?'success':'notice');render();
}
function changeStage(n){
 if(!unlocked(n)){say(n===1?'先完成三台机械的加工接力。':'先完成六处巡查和四项样板检查，再交接现场。','notice');return;}
 if(busy){say('先完成或继续当前加工，再切换环节。');return;}
 s.stage=n;s.selected='';s.tool='';if(n===0&&s.stock===3){s.machine='bend';s.progress=1;}hotspotKey='';
 $('objectTitle').textContent=n===2?'先拿区标，再放到现场。':'先找一找，哪里需要整理？';
 $('objectDescription').textContent=n===2?'规则大面、柱边密集节点与洞口，需要不同的作业安排。':'点击现场位置标记，观察构件、障碍与人员通路。';
 say(n===0?'回看三台机械：调直改变平直度，切断改变长度，弯曲改变形状。':n===1?'点击现场位置开始巡查。橙色料箱挡住了人员通道，楼面堆料也需要搬走。':'拿起绿色、橙色或红色区标，直接放到现场。');
 render();scene?.setView(n===0?'processing':'floor');wake(2000);
}
function hotList(){
 if(s.stage===0)return machines.map((id,i)=>({id,title:names[id],n:s.stock>i?'✓':i+1,point:[-6.3,[3,0,-3][i],2.1],color:['#2469ed','#e89b34','#22a99c'][i],done:s.stock>i,active:s.stock===i}));
 if(s.stage===1)return locationIds.map((id,i)=>({id,title:places[id].title,n:s.visited.includes(id)?'✓':i+1,point:places[id].point,done:s.visited.includes(id),active:s.selected===id})).concat([{id:'storage',title:'场外料架',n:'↓',point:[7.8,-5.5,.55],color:'#23a79c'}]);
 return Object.keys(regionNames).map((id,i)=>({id,title:regionNames[id],n:s.game.zones[id]===expectedZones[id]?'✓':i+1,point:id==='regular'?[4,-1.6,.8]:id==='column'?[1.8,1.7,2.8]:[6,2.3,.8],color:({auto:'#279d77',manual:'#df9029',blocked:'#d94a56'})[s.game.zones[id]],done:s.game.zones[id]===expectedZones[id],active:s.selected===id}));
}
function renderHotspots(){
 const list=hotList(),key=JSON.stringify(list);
 if(key!==hotspotKey){hotspotKey=key;$('hotspots').innerHTML=list.map(h=>'<button class="hotspot '+(h.done?'done ':'')+(h.active?'active':'')+'" data-object="'+h.id+'" '+((s.stage===1&&['material','route'].includes(h.id))?'draggable="true"':'')+' style="--spot-color:'+(h.color||'#2469ed')+'" aria-label="'+h.title+'"><span class="pin">'+h.n+'</span>'+h.title+'</button>').join('');}
 layoutHotspots();
}
function layoutHotspots(){
 const host=$('field'),w=host.clientWidth,h=host.clientHeight,list=hotList(),used=[];
 list.forEach((item,i)=>{
  const el=$('hotspots').querySelector('[data-object="'+item.id+'"]');if(!el)return;
  let p=scene?.projectPoint(item.point);
  if(!p){const pts=s.stage===0?[[380,145],[620,145],[860,145]]:s.stage===1?[[260,455],[497,220],[768,230],[565,400],[850,420],[890,75],[970,545]]:[[640,370],[497,220],[768,230]];const k=Math.min(w/1100,h/600);p={x:(w-1100*k)/2+pts[i][0]*k,y:(h-600*k)/2+pts[i][1]*k,visible:true};}
  const ew=el.offsetWidth||110,eh=el.offsetHeight||35;
  let x=Math.max(ew/2+8,Math.min(w-ew/2-8,p.x)),y=Math.max(eh+10,Math.min(h-44,p.y-10));
  const fb=host.getBoundingClientRect(),blocks=[s.stage===0?$('orderCard'):$('siteNote'),document.querySelector('.view-tools'),!$('machineSetting').hidden?$('machineSetting'):null].filter(Boolean).map(e=>{const b=e.getBoundingClientRect();return {left:b.left-fb.left-5,right:b.right-fb.left+5,top:b.top-fb.top-5,bottom:b.bottom-fb.top+5};});
  const collides=(cx,cy)=>{const box={left:cx-ew/2-4,right:cx+ew/2+4,top:cy-eh-5,bottom:cy+10};return [...blocks,...used].some(r=>box.left<r.right&&box.right>r.left&&box.top<r.bottom&&box.bottom>r.top);};
  if(collides(x,y)){let best=null;for(let cy=eh+8;cy<=h-44;cy+=12)for(let cx=ew/2+8;cx<=w-ew/2-8;cx+=12){const d=(cx-x)*(cx-x)+(cy-y)*(cy-y);if((!best||d<best.d)&&!collides(cx,cy))best={x:cx,y:cy,d};}if(best){x=best.x;y=best.y;}}
  used.push({left:x-ew/2-4,right:x+ew/2+4,top:y-eh-5,bottom:y+10});el.style.left=x+'px';el.style.top=y+'px';
  el.style.visibility=busy?'hidden':'visible';
 });
}
function openInspection(id){
 if(!inspection&&window.createRebarInspection){inspection=window.createRebarInspection($('inspectionHost'),{onComplete:key=>{if(!s.inspected.includes(key))s.inspected.push(key);render();if(stageReady())say('四项检查已留下依据，现场巡查也完成了。开始分区交接吧。','success');}});}
 if(!inspection){say('检查工具正在准备，请稍后再试。');return;}
 inspectStart=id||['missing','spacing','cover','loose'].find(x=>!s.inspected.includes(x))||'missing';inspection.open(inspectStart);$('inspectionDialog').showModal();
}
function handoff(){
 if(zoneCount()!==3){const region=Object.keys(expectedZones).find(id=>s.game.zones[id]!==expectedZones[id]);say('再看一下'+regionNames[region]+'：'+({regular:'规则大面可以列为机器人候选区域。',column:'钢筋密集处需要人工配合。',opening:'洞口与隔离范围应标为禁止进入。'})[region],'notice');return;}
 s.finished=true;render();
 $('handoffSummary').innerHTML='<div class="summary-row"><span>加工订单</span><b>调直 · 2400 mm · 90°</b></div><div class="summary-row"><span>六处现场位置</span><b>已识读并整理</b></div><div class="summary-row"><span>四项样板检查</span><b>已观察 / 已标记</b></div>'+Object.entries(expectedZones).map(([id,z])=>'<div class="summary-row"><span>'+regionNames[id]+'</span><b>'+zoneNames[z]+'</b></div>').join('');
 $('finishDialog').showModal();
}
function reset(){
 for(const d of document.querySelectorAll('dialog[open]'))d.close();
 playing=false;busy=false;s=initial();lastSceneState='';hotspotKey='';inspection?.destroy?.();inspection=null;$('inspectionHost').replaceChildren();
 say('先让弯曲的钢筋变直。找到调直机，开始第一棒。');render();scene?.setView('processing',true);wake(1600);
}
function drawFallback(){
 const svg=$('fallbackPlan'),rect=(x,y,w,h,fill,rx=5)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+rx+'" fill="'+fill+'"/>';
 let art=rect(10,10,1080,580,'#edf5ff',20);
 if(s.stage===0){
  const a=M.processingState(s.machine,s.progress,{lengthMM:s.lengthMM,angleDeg:s.angleDeg}),g=a.geometry,poly=ps=>ps.map(p=>(570+p[0]*115)+','+(300-p[1]*115)).join(' ');
  art+=rect(300,180,660,220,'#d8e7f6',16)+rect(325,200,610,165,'#ffffff',10);
  for(const x of[345,885])art+=rect(x,400,26,95,'#4379b1',5)+rect(x-10,490,46,12,'#234664',3);
  if(s.machine==='straighten')art+=g.wheels.map(w=>'<circle cx="'+(570+w.x*115)+'" cy="'+(300-w.y*115)+'" r="'+w.radius*115+'" fill="#80b4e1" stroke="#34689c" stroke-width="3"/>').join('')+'<polyline points="'+poly(g.bar)+'" stroke="#244b76" stroke-width="6" fill="none"/>';
  if(s.machine==='cut')art+=g.pieces.map(ps=>'<polyline points="'+poly(ps)+'" stroke="#244b76" stroke-width="7" fill="none"/>').join('')+rect(567,220+a.blade*65,12,35,'#ef9d39')+rect(520,315,100,25,'#759fca');
  if(s.machine==='bend')art+='<circle cx="570" cy="300" r="'+g.mandrelRadius*115+'" fill="#7bb5cf"/><polyline points="'+poly(g.bar)+'" stroke="#1d9b8b" stroke-width="6" fill="none"/><circle cx="'+(570+g.pinCenter[0]*115)+'" cy="'+(300-g.pinCenter[1]*115)+'" r="7" fill="#f2a43b"/>';
 }else{
 art+=rect(240,110,740,390,'#e7cba5',5);
 for(let x=265;x<960;x+=25)art+='<path d="M'+x+' 130v350" stroke="#526e8d" stroke-width="3"/>';
 for(let y=135;y<490;y+=25)art+='<path d="M260 '+y+'h700" stroke="#6b8299" stroke-width="3"/>';
 art+=rect(465,200,65,70,'#5d87b4',3)+rect(700,190,135,110,'#edf5ff',0);
 if(s.game.openingGuarded)art+='<rect x="690" y="180" width="155" height="130" fill="none" stroke="#e99b38" stroke-width="10"/>';
 art+=rect(240,55,740,34,'#d0eee6',3);
 art+=rect(s.game.materialMoved?925:800,s.game.materialMoved?525:410,100,32,'#df9636');
 art+=rect(s.game.routeCleared?820:870,s.game.routeCleared?530:57,50,30,'#e58f32');
 const rs={regular:[580,350,120,100],column:[455,190,90,90],opening:[690,180,155,130]};
 for(const [id,z]of Object.entries(s.game.zones)){const r=rs[id];art+='<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'" fill="none" stroke="'+({auto:'#279d77',manual:'#df9029',blocked:'#d94a56'})[z]+'" stroke-width="10"/>';}
 }
 svg.innerHTML=art;
}
function frame(now){
 raf=0;if(!visible||document.hidden){lastTime=0;return;}
 const dt=lastTime?Math.min(.08,(now-lastTime)/1000):1/60;lastTime=now;
 if(playing){s.progress=Math.min(1,s.progress+dt/4.4);syncScene();const p=M.processingState(s.machine,s.progress,{lengthMM:s.lengthMM,angleDeg:s.angleDeg});$('processPhase').textContent=p.phase.replace('输出复核','调直钢筋输出').replace('半成品离开','钢筋段离开').replace('角度与形状复核','弯折钢筋成形');$('processFill').style.width=s.progress*100+'%';if(s.progress>=1)completeProcess();}
 const moving=scene?.render(dt,reduced.matches)||false;
 if(now-lastPaint>30){layoutHotspots();lastPaint=now;}
 if(playing||moving||now<dirtyUntil){if(!raf)raf=requestAnimationFrame(frame);}else lastTime=0;
}
$('hotspots').onclick=e=>{const b=e.target.closest('[data-object]');if(b)select(b.dataset.object);};
$('taskTools').onclick=e=>{const b=e.target.closest('button');if(!b||busy)return;if(b.dataset.machine){s.machine=b.dataset.machine;focus(s.machine);render();if(s.stock<3&&s.machine===machines[s.stock])say(s.stock===0?'把材料送入调直机，观察交错调直轮。':s.stock===1?'移动挡块，使下料长度与订单一致。':'调整转角，使钢筋贴合订单轮廓。');}
 if(b.dataset.place)select(b.dataset.place);if(b.dataset.inspect)openInspection();if(b.dataset.zone){s.tool=b.dataset.zone;render();say('已拿起“'+zoneNames[s.tool]+'”区标。点击现场区域放置。');}};
document.querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>changeStage(Number(b.dataset.stage)));
$('settingRange').oninput=e=>{if(busy)return;if(s.stock===1)s.lengthMM=Number(e.target.value);else if(s.stock===2)s.angleDeg=Number(e.target.value);s.progress=0;render();};
$('carryCard').onclick=()=>{if(s.stage===0){s.tool=s.tool?'':'material';say('材料已拿起。点击'+names[machines[Math.min(s.stock,2)]]+'上料。');}else if(s.stage===1){s.tool=s.tool==='guard'?'':'guard';say('已拿起隔离护栏。点击洞口放置。');}else say('从旁边拿起绿色、橙色或红色区标，再点击现场。');render();};
$('actionBtn').onclick=()=>{if(s.stage===0){if(busy){playing=true;render();wake(6000);}else feed(s.stock<3?machines[s.stock]:'bend');}else if(s.stage===1)performSite(s.selected);else handoff();};
$('nextBtn').onclick=()=>changeStage(s.stage+1);
$('pauseBtn').onclick=()=>{playing=!playing;render();wake(6000);};
$('inspectBtn').onclick=()=>openInspection();
$('homeView').onclick=()=>{scene?.setView(s.stage===0?'processing':'floor');wake(1800);};
$('topView').onclick=()=>{scene?.setView('top');wake(1800);};
$('focusView').onclick=()=>focus(s.stage===0?s.machine:(s.selected==='regular'?'joint':s.selected||'slab'));
$('helpBtn').onclick=()=>$('helpDialog').showModal();
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{requestAnimationFrame(()=>{const r=$('field').getBoundingClientRect();visible=r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;lastTime=0;wake(1600);});}));
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game').requestFullscreen();}catch{say('当前窗口不支持全屏；页面仍按屏幕大小完整显示。');}};
$('restartBtn').onclick=()=>$('restartDialog').showModal();$('replayBtn').onclick=()=>$('restartDialog').showModal();$('confirmRestart').onclick=reset;
$('downloadBtn').onclick=()=>{const lines=['任务5-1 钢筋加工与绑扎作业面识读 · 交接记录','','加工订单：调直 → 定尺切断 2400 mm → 弯曲 90°。','现场位置：梁板边线、柱边、洞口、钢筋交点、堆料和人员通道。','整理动作：楼面堆料移至场外料架；通道料箱移走；洞口设置隔离护栏。','检查样板：漏绑已标记；间距已量测；垫块与外缘净距已观察；疑似松扣已标记请人工检查。','','作业分区：',...Object.entries(expectedZones).map(([id,z])=>regionNames[id]+'：'+zoneNames[z]),'','以上为本页教学情境记录，不是现场施工验收或设备放行记录。'];const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='任务5-1_作业分区交接记录.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);};
$('game').addEventListener('dragstart',e=>{const b=e.target.closest('[data-zone],[data-object],#carryCard');if(!b||busy){e.preventDefault();return;}dragKind=b.dataset.zone||(b.dataset.object==='material'?'material':b.dataset.object==='route'?'route':s.stage===1?'guard':s.stage===2?s.tool:'stock');e.dataTransfer.setData('text/plain',dragKind);e.dataTransfer.effectAllowed='move';});
$('hotspots').addEventListener('dragover',e=>{const b=e.target.closest('[data-object]');if(b){e.preventDefault();b.classList.add('drop-over');}});
$('hotspots').addEventListener('dragleave',e=>e.target.closest('[data-object]')?.classList.remove('drop-over'));
$('hotspots').addEventListener('drop',e=>{const b=e.target.closest('[data-object]');if(!b)return;e.preventDefault();b.classList.remove('drop-over');const kind=e.dataTransfer.getData('text/plain')||dragKind,id=b.dataset.object;
 if(s.stage===0&&kind==='stock')feed(id);else if(s.stage===1){if(kind==='guard'&&id==='opening')performSite('opening');else if(['material','route'].includes(kind)&&id==='storage')performSite(kind);else say('把护栏放到洞口，把材料搬到场外料架。');}else if(s.stage===2&&zoneNames[kind]){s.tool=kind;paint(id);}});
$('game').addEventListener('dragend',()=>{dragKind='';document.querySelectorAll('.drop-over').forEach(b=>b.classList.remove('drop-over'));});
$('viewport').onkeydown=e=>{if(e.code==='Space'&&s.stage===0){e.preventDefault();$('actionBtn').click();}if(e.key==='Home'){e.preventDefault();$('homeView').click();}};
new ResizeObserver(()=>{scene?.resize();wake(1200);}).observe($('field'));
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(!visible){lastTime=0;if(raf)cancelAnimationFrame(raf);raf=0;}else wake(1600);}).observe($('field'));
document.addEventListener('visibilitychange',()=>{lastTime=0;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else wake(1600);});
reduced.addEventListener('change',()=>{if(reduced.matches&&busy){s.progress=1;completeProcess();}wake();});
try{scene=createRebarScene(THREE,$('viewport'),M,{onSelect:select,wake:()=>wake(),onChange:()=>wake()});scene.setView('processing',true);$('loading').hidden=true;}catch(error){$('loading').hidden=true;$('fallback').hidden=false;$('game').classList.add('using-plan');console.info('启用俯视模式：'+error.message);}
window.__REBAR_GAME__={setTheme(dark){scene?.setTheme(dark);wake();},snapshot:()=>({state:clone(s),playing,busy,visible,hidden:document.hidden,animationScheduled:!!raf,reducedMotion:reduced.matches,scene:scene?.snapshot()||{available:false},inspection:inspection?.snapshot()||null,zoneCount:zoneCount(),stageReady:stageReady()}),projectPoint:p=>scene?.projectPoint(p)||null};
say('先让弯曲的钢筋变直。找到调直机，开始第一棒。');render();wake(1800);
})();
