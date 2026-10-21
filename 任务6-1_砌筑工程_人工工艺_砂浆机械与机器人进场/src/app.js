const $=id=>document.getElementById(id),all=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={tab:0,t:0,playing:!reduced.matches,speed:.75,offset:125,m:14,h:10,soft:true};
const lessons=[
 {title:'一块砖，怎样稳稳落下？',sub:'把一整次取放拆开，看夹具、砖和墙各自何时运动。',eye:'PICK / TRANSFER / PLACE',panel:'单砖取放实验',badge:'直角坐标教学机构 · 非特定机型',question:'砖刚碰到砂浆，就可以立即松夹吗？',answers:['可以，碰到了','还要确认支承'],explain:'先确认砖已稳定支承，再释放夹具；夹紧、定位和接触是不同条件。',points:[['先夹稳，再起升','砖离开供料台之前，夹具先完成夹持。'],['先越障，再下放','高位平移与垂直接近分开，避免扫过已砌墙。'],['支承后，才释放','放置与松夹分两步，退出时不拖动砖块。']]},
 {title:'砖缝错开，墙端也会改变。',sub:'移动上皮排布，看竖缝是否对齐，同时检查两端切砖。',eye:'BOND / OFFSET / CLOSURE',panel:'两皮试排实验',badge:'墙端固定 · 上皮偏移连续可调 · 斜纹为切砖',question:'只要竖缝错开，就能判定这面墙合格吗？',answers:['可以','仍需其他复核'],explain:'错缝只解释几何搭接。还需核对设计、灰缝、饱满度、垂直度与平整度。',points:[['先看模数','本例240 mm砖长加10 mm竖缝，形成250 mm周期。'],['竖缝不贯通','半模数偏移使上下皮竖缝间距为125 mm。'],['墙端要收口','保持墙端位置后，错缝排布会出现端部切砖。']]},
 {title:'让一点，接触力就会改变。',sub:'同样的落点，铺灰厚度不同，接触与最终灰缝也不同。',eye:'CONTACT / COMPLIANCE / GAP',panel:'落砖接触实验',badge:'局部剖面 · 竖向灰缝放大 · 线性等效教学模型',question:'开启柔顺，就能保证最终灰缝是10 mm吗？',answers:['能自动保证','不能，仍要测量'],explain:'柔顺降低接触力，却会改变末端位置；退让还受行程限制。灰缝应独立测量。',points:[['位置不是力','指令下得越深，等效压缩越大，接触力随之增加。'],['柔顺有代价','末端向上退让可以减力，但实际灰缝也随之增大。'],['到限位仍会增力','退让达到4 mm后，继续加厚铺灰会增加接触力。']]}
];
const phaseNotes=['夹爪位于砖块两侧，砖仍由供料台支承。','夹爪向内收拢；夹持完成前不抬升。','砖随夹具垂直上升，先获得越墙净空。','保持高位越过墙面；图中砖底始终高于墙顶。','在目标上方垂直下降，避免侧向推挤相邻砌体。','砖底已到预铺砂浆表面，夹爪才逐渐打开。','夹爪向上退出，砖块留在墙面。'];
$('phaseButtons').innerHTML=M.PHASES.map((p,i)=>`<button data-phase="${i}">${i+1} ${['接近','夹紧','抬升','平移','落砖','松夹','退出'][i]}</button>`).join('');
const movers=all('#machineScene [data-move]').filter(el=>el.dataset.move);
const partNodes=new Map(all('#machineScene [data-name]').map(el=>[el.dataset.name,el]));let previousOrder='';
function delta(g,s){if(!g)return [0,0,0];let v=[s.x+190,0,s.z-12];if(g==='carriage')v=[s.x+190,0,0];if(g==='brick')v=[s.brickX+190,0,s.brickZ-12];if(g==='jawL')v[0]-=s.open-5;if(g==='jawR')v[0]+=s.open-5;return v;}
function transform(el,v){el.setAttribute('transform',translateAlong(PROJECTION,v));}
function metric(a,b,c,labels,hints){['A','B','C'].forEach((v,i)=>{$('metric'+v).innerHTML=[a,b,c][i];$('metricLabel'+v).textContent=labels[i];$('metricHint'+v).textContent=hints[i];});}
function machine(){
 const s=M.cycle(state.t);for(const el of movers)transform(el,delta(el.dataset.move,s));
 const parts=PART_BOUNDS.map(p=>{const v=delta(p.group,s);return {...p,lo:p.lo.map((n,i)=>n+v[i]),hi:p.hi.map((n,i)=>n+v[i])};});
 const order=orderOf(parts,p=>iso(p,PROJECTION)),key=order.join('|');if(key!==previousOrder){const parent=partNodes.values().next().value.parentElement;for(const name of order)parent.appendChild(partNodes.get(name));previousOrder=key;}
 $('progress').value=state.t;$('progressValue').textContent=Math.round(state.t/6.999*100)+'%';$('play').textContent=state.playing?'Ⅱ 暂停':'▶ 播放';$('phaseNote').textContent=phaseNotes[s.i];all('[data-phase]').forEach(el=>el.setAttribute('aria-current',String(+el.dataset.phase===s.i)));
 metric(s.phase,(s.brickZ/.2).toFixed(0)+'<small> mm</small>',s.open<.05?'夹紧':s.open>4.95?'张开':'开合中',['当前工序','砖底高度','夹具状态'],['工序 '+(s.i+1)+' / 7','相对试验台面','先支承，后松夹']);$('readout').textContent=state.playing?'慢放中 · '+state.speed.toFixed(2)+'×':'已暂停 · 可逐步观察';
}
const rect=(x,y,w,h,c='block',r=1)=>`<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
const line=(x1,y1,x2,y2,c='softline')=>`<path class="${c}" d="M${x1} ${y1}L${x2} ${y2}"/>`;
const bolts=(x,y,w,h)=>[[x+7,y+7],[x+w-7,y+7],[x+7,y+h-7],[x+w-7,y+h-7]].map(([a,b])=>`<circle cx="${a}" cy="${b}" r="2" fill="none" stroke="var(--muted)"/>`).join('');
function bondDraw(){
 const b=M.bond(state.offset),scale=.6,start=128,bottom=355,bh=72,joint=12;let a='';
 a+=rect(90,422,25,35,'metal')+rect(883,422,25,35,'metal')+rect(74,398,852,24,'metal',4)+bolts(74,398,852,24);
 a+=rect(115,205,770,193,'frame',3)+rect(128,355,744,12,'mortar');
 for(let i=0;i<5;i++)a+=rect(start+i*150,bottom-bh,144,bh,'block',2);
 a+=rect(128,bottom-bh-joint,744,joint,'mortar');
 for(const brick of b.bricks){a+=rect(start+brick.x*scale,bottom-bh*2-joint,brick.w*scale,bh,'block',2);if(brick.cut)a+=rect(start+brick.x*scale,bottom-bh*2-joint,brick.w*scale,bh,'cut',2);}
 // Registration combs sit on the fixture, with ticks rooted at their edges.
 a+=rect(128,374,744,12,'metal');for(let i=0;i<=124;i++)a+=line(128+i*6,386,128+i*6,i%5===0?375:381);
 if($('seams').checked){for(let i=1;i<5;i++)a+=rect(128+(i*250-5)*scale,355,2,12,'joint');for(const brick of b.bricks.slice(1))a+=rect(128+(brick.x-5)*scale,205,2,14,'joint');}
 a+=`<text x="500" y="411" text-anchor="middle" class="engraved">BOND STUDY / 1240</text>`;
 $('bondArt').innerHTML=a;$('offsetValue').textContent=state.offset+' mm';
 $('bondNote').textContent=b.aligned?'上下皮竖缝正对，形成通缝。试着平移上皮，但留意两端的变化。':state.offset===125?'上下皮竖缝相距125 mm。两端采用切砖，墙体总长度保持不变。':'竖缝已错开'+b.overlap+' mm。几何错开量随偏移增加；是否满足设计须另核对。';
 metric(b.overlap+'<small> mm</small>',b.aligned?'通缝':'错缝',b.cuts+'<small> 块</small>',['竖缝间距','排布状态','上皮端部切砖'],['按相邻接缝中心计算','不等同于质量验收','墙端位置保持固定']);$('readout').textContent='砖长240 / 竖缝10 mm';
}
function contactDraw(){
 const c=M.contact(state.m,state.h,state.soft),bottom=380,sy=5,brickBottom=bottom-c.gap*sy,top=brickBottom-65;let a='';
 a+=rect(190,413,26,26,'metal')+rect(784,413,26,26,'metal')+rect(175,394,650,19,'metal',4)+bolts(175,394,650,19);
 a+=rect(230,380,540,14,'metal')+rect(260,380,480,5,'mortar');
 a+=rect(275,bottom-Math.min(c.gap,c.m)*sy,450,Math.min(c.gap,c.m)*sy,'mortar');
 a+=rect(275,top,450,65,'block',3)+rect(280,top+4,440,3,'metal');
 // Two gripper jaws and their replaceable pads remain in contact with the brick sides.
 a+=rect(260,top-30,480,16,'metal',3)+bolts(260,top-30,480,16);
 for(const x of [250,740]){a+=rect(x,top-30,10,79,'metal')+rect(x===250?260:725,top+8,15,34,'accent');}
 a+=rect(470,top-88,60,58,'metal')+rect(462,top-102,76,14,'metal')+bolts(462,top-102,76,14);
 a+=rect(480,72,40,top-174,'metal')+rect(450,56,100,16,'metal')+bolts(450,56,100,16);
 // An engraved mechanical travel window makes retreat visible without implying a measured sensor signal.
 a+=rect(486,79,28,33,'surface',2)+rect(492,101-c.retreat*5,16,3,'accent');
 a+=rect(781,221,31,159,'surface',3);for(let i=0;i<=20;i++)a+=line(781,380-i*5,781+(i%5===0?16:8),380-i*5);
 a+=`<path d="M778 ${brickBottom}l-8 -4v8z" fill="var(--ink)"/><text x="805" y="403" text-anchor="end" class="metertext">${c.gap.toFixed(1)} mm</text>`;
 a+=rect(184,237,42,143,'surface',3)+rect(194,370-c.force*.28,22,c.force*.28,'metal')+`<text x="205" y="403" text-anchor="middle" class="metertext">${c.force.toFixed(0)} N</text>`;
 a+=`<text x="500" y="407" text-anchor="middle" class="engraved">CONTACT STUDY</text>`;
 $('contactArt').innerHTML=a;$('mortarValue').textContent=state.m+' mm';$('heightValue').textContent=state.h+' mm';
 $('contactNote').textContent=c.air>0?'指令位置过高，砖底与砂浆之间仍有'+c.air.toFixed(1)+' mm空隙。没有接触力，也没有形成支承。':c.limited?'退让已到4 mm限位。继续加厚铺灰时，接触力继续上升；柔顺不能无限补偿。':state.soft?'末端退让'+c.retreat.toFixed(1)+' mm，接触力减小；实际灰缝变为'+c.gap.toFixed(1)+' mm。':'刚性定位不退让。铺灰被等效压缩'+c.interference.toFixed(1)+' mm，接触力为'+c.force.toFixed(0)+' N。';
 metric(c.force.toFixed(0)+'<small> N</small>',c.gap.toFixed(1)+'<small> mm</small>',c.retreat.toFixed(1)+'<small> mm</small>',['等效接触力','实际灰缝 / 间距','末端退让'],['线性模型，非实测值','有空隙时尚未成缝',c.limited?'已到行程限位':'上限4 mm']);$('readout').textContent=c.air>0?'未接触':c.limited?'退让到限位':state.soft?'柔顺接触':'刚性接触';
 all('[data-soft]').forEach(el=>el.setAttribute('aria-pressed',String(String(state.soft)===el.dataset.soft)));
}
function draw(){if(state.tab===0)machine();if(state.tab===1)bondDraw();if(state.tab===2)contactDraw();}
function tab(n){state.tab=n;state.playing=n===0&&!reduced.matches;const d=lessons[n];for(const key of ['title','subtitle','eyebrow','panelTitle','sceneBadge'])$(key).textContent=d[{title:'title',subtitle:'sub',eyebrow:'eye',panelTitle:'panel',sceneBadge:'badge'}[key]];
 ['machineScene','bondScene','contactScene'].forEach((id,i)=>$(id).hidden=i!==n);all('[data-panel]').forEach(el=>el.hidden=+el.dataset.panel!==n);all('[data-tab]').forEach(el=>el.setAttribute('aria-pressed',String(+el.dataset.tab===n)));
 $('figureNo').textContent='FIG 0'+(n+1);$('pageIndex').textContent='0'+(n+1)+' / 03';$('questionText').textContent=d.question;d.answers.forEach((v,i)=>$('answer'+i).textContent=v);$('answerFeedback').textContent='先观察，再做判断.';
 d.points.forEach(([h,p],i)=>{$('lesson'+'ABC'[i]).textContent=h;$('lesson'+'ABC'[i]+'Text').textContent=p;});$('caption').textContent=['拖动时间轴 / 单步观察 · 亮砖为本次作业对象','固定墙长1240 mm · 比较两皮砖的接缝位置','砂浆与灰缝竖向放大 · 左侧力条 / 右侧标尺'][n];draw();run();}
let raf=0,last=0,visible=true,hover=false;
function tick(now){raf=0;const dt=last?Math.min((now-last)/1000,.05):0;last=now;if(state.playing&&state.tab===0&&!hover&&!reduced.matches){state.t+=dt*state.speed*7/12;if(state.t>=6.999){state.t=6.999;state.playing=false;}machine();}if(visible&&!document.hidden&&state.playing&&state.tab===0&&!hover&&!reduced.matches)raf=requestAnimationFrame(tick);}
function run(){if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}}
function pause(){state.playing=false;}
all('[data-tab]').forEach(el=>el.onclick=()=>tab(+el.dataset.tab));$('next').onclick=()=>tab((state.tab+1)%3);
all('[data-phase]').forEach(el=>el.onclick=()=>{pause();state.t=+el.dataset.phase+.001;draw();});
$('progress').oninput=e=>{pause();state.t=+e.target.value;draw();};$('speed').oninput=e=>{state.speed=+e.target.value;$('speedValue').textContent=state.speed.toFixed(2)+'×';draw();};$('speedValue').textContent='.75×';
$('play').onclick=()=>{if(reduced.matches){state.t=(Math.floor(state.t)+1)%7;pause();}else{if(state.t>=6.999)state.t=0;state.playing=!state.playing;}draw();run();};$('step').onclick=()=>{pause();state.t=(Math.floor(state.t)+1)%7;draw();};
$('offset').oninput=e=>{state.offset=+e.target.value;draw();};function offset(v){state.offset=v;$('offset').value=v;draw();}$('aligned').onclick=()=>offset(0);$('half').onclick=()=>offset(125);$('seams').onchange=draw;
for(const [id,key]of [['mortar','m'],['height','h']])$(id).oninput=e=>{state[key]=+e.target.value;draw();};all('[data-soft]').forEach(el=>el.onclick=()=>{state.soft=el.dataset.soft==='true';draw();});$('overload').onclick=()=>{state.m=20;state.h=10;$('mortar').value=20;$('height').value=10;draw();};
$('reset').onclick=()=>{pause();if(state.tab===0){state.t=0;state.speed=.75;$('speed').value=.75;$('speedValue').textContent='.75×';}if(state.tab===1){state.offset=125;$('offset').value=125;$('seams').checked=true;}if(state.tab===2){state.m=14;state.h=10;state.soft=true;$('mortar').value=14;$('height').value=10;}$('answerFeedback').textContent='先观察，再做判断。';draw();};
all('[data-answer]').forEach(el=>el.onclick=()=>{$('answerFeedback').textContent=(el.dataset.answer==='1'?'判断正确。':'再想一步：')+lessons[state.tab].explain;});
$('theme').onclick=()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;document.body.dataset.theme=theme;$('theme').textContent=theme==='light'?'◐ 深色':'◑ 浅色';};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('readout').textContent='可使用浏览器F11全屏';}};
document.addEventListener('fullscreenchange',()=>$('fullscreen').textContent=document.fullscreenElement?'⛶ 退出全屏':'⛶ 全屏演示');
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('helpDialog').onclick=e=>{if(e.target===$('helpDialog'))$('helpDialog').close();};
$('mobileToggle').onclick=()=>{const v=document.querySelector('.app').classList.toggle('show-controls');$('mobileToggle').textContent=v?'返回画面 ◇':'调整参数 ☷';};
$('drawing').onpointerenter=()=>{hover=true;};$('drawing').onpointerleave=()=>{hover=false;run();};
document.addEventListener('keydown',e=>{if(e.target.matches('input,button,a')||$('helpDialog').open)return;if(e.code==='Space'&&state.tab===0){e.preventDefault();$('play').click();}if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();tab((state.tab+(e.key==='ArrowRight'?1:2))%3);}});
document.addEventListener('visibilitychange',run);new IntersectionObserver(e=>{visible=e.at(-1).isIntersecting;if(visible)run();}).observe($('drawing'));reduced.addEventListener('change',()=>{if(reduced.matches)pause();draw();run();});
window.brickLab={snapshot:()=>({...state,cycle:M.cycle(state.t),contact:M.contact(state.m,state.h,state.soft),bond:M.bond(state.offset)}),seek(t){state.t=t;pause();draw();},tab};tab(0);

