(()=>{
 const svg=$('annotationSvg'),wrap=$('canvasWrap');
 const colors={0:'#267bdd',1:'#288f9b',review:'#b08c42'};
 const state={key:'clear',asset:LESSON_DATA.clear,boxes:[{id:1,cls:0,bbox:[160,80,320,240]}],selected:1,tool:'select',drawClass:0,zoom:1,reference:false,reviewed:false,nextId:2,history:[],checked:false};
 const drafts=new Map();let drag=null,imported=null,loadSequence=0;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const selected=()=>state.boxes.find(b=>b.id===state.selected);
 function snapshot(){return{boxes:clone(state.boxes),selected:state.selected,nextId:state.nextId}}
 function remember(s=snapshot()){state.history.push(s);if(state.history.length>60)state.history.shift()}
 function changed(){state.reviewed=false;state.checked=false;$('reviewed').checked=false;$('checkResult').textContent=state.asset.custom?'这是自带图片，没有参考真值。请逐目标人工检查，页面只检查格式和待复核状态。':'标注已变化，请重新检查目标、类别与边界。'}
 function fit(){const ratio=state.asset.width/state.asset.height;const base=Math.max(100,Math.min(wrap.clientWidth-40,(wrap.clientHeight-40)*ratio));svg.style.width=base*state.zoom+'px';svg.style.height=base*state.zoom/ratio+'px'}
 function renderSurface(){
  const a=state.asset;svg.setAttribute('viewBox',`0 0 ${a.width} ${a.height}`);svg.dataset.tool=state.tool;fit();const unit=a.width/(svg.getBoundingClientRect().width||a.width);
  const refs=state.reference?a.objects.map(o=>{const [x,y,x2,y2]=o.bbox,c=colors[o.cls];return`<g pointer-events="none"><rect x="${x}" y="${y}" width="${x2-x}" height="${y2-y}" fill="none" stroke="${c}" stroke-width="1.7" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/><text x="${x+2}" y="${Math.min(a.height-3,y2+12)}" fill="${c}" font-size="10">${esc(o.id)} 参考${o.cls==='review'?' · 待复核':''}</text></g>`}).join(''):'';
  const boxes=state.boxes.map(b=>{const[x,y,x2,y2]=b.bbox,c=colors[b.cls],on=b.id===state.selected,ly=Math.max(0,y-20),label=`${String(b.id).padStart(2,'0')} · ${CLASS_NAMES[b.cls]}`;const corners=on?[[x,y,'nw'],[x2,y,'ne'],[x2,y2,'se'],[x,y2,'sw']].map(([cx,cy,n])=>`<rect class="handle" data-id="${b.id}" data-corner="${n}" x="${cx-12*unit}" y="${cy-12*unit}" width="${24*unit}" height="${24*unit}" fill="transparent"/><rect pointer-events="none" x="${cx-3.5*unit}" y="${cy-3.5*unit}" width="${7*unit}" height="${7*unit}" fill="#fff" stroke="${c}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>`).join(''):'';return`<g><rect class="annotation-box" data-id="${b.id}" x="${x}" y="${y}" width="${Math.max(0,x2-x)}" height="${Math.max(0,y2-y)}" fill="${c}" fill-opacity="${on?'.06':'.015'}" stroke="${c}" stroke-width="${on?'2.2':'1.4'}" vector-effect="non-scaling-stroke"/><rect data-id="${b.id}" x="${Math.min(x,a.width-117)}" y="${ly}" width="117" height="19" rx="3" fill="${c}"/><text data-id="${b.id}" x="${Math.min(x,a.width-117)+6}" y="${ly+13}" font-size="10" fill="white">${esc(label)}</text>${corners}</g>`}).join('');
  svg.innerHTML=`<image href="${esc(a.uri||imageURI(a.svg))}" width="${a.width}" height="${a.height}" pointer-events="none"/>${refs}${boxes}`;
  fit();
 }
 function renderInspector(){
  const b=selected(),a=state.asset;$('selectionTag').textContent=b?'BOX '+String(b.id).padStart(2,'0'):'NEW BOX';$('drawClass').value=String(state.drawClass);
  $('classHeading').textContent=b?'选中框的类别':'新框使用的类别';
  document.querySelectorAll('[data-cls]').forEach(el=>{const on=String(b?b.cls:state.drawClass)===el.dataset.cls;el.classList.toggle('active',on);el.setAttribute('aria-pressed',on)});
  ['x1','y1','x2','y2'].forEach((id,i)=>{const el=$(id);el.disabled=!b;el.max=i%2?a.height:a.width;el.value=b?Number(b.bbox[i].toFixed(3)):''});
  $('boxSize').textContent=b?`${(b.bbox[2]-b.bbox[0]).toFixed(1)} × ${(b.bbox[3]-b.bbox[1]).toFixed(1)} px`:'选择一个框后可精调坐标';
  $('boxList').innerHTML=state.boxes.map(x=>`<button class="box-row ${x.id===state.selected?'active':''}" data-box="${x.id}"><b>${String(x.id).padStart(2,'0')}</b><span>${esc(CLASS_NAMES[x.cls])}</span><small>${x.bbox.map(v=>Math.round(v)).join(', ')}</small></button>`).join('')||'<p class="tiny muted">还没有框。选择类别，再按 R 开始画框。</p>';
  $('selectTool').classList.toggle('active',state.tool==='select');$('drawTool').classList.toggle('active',state.tool==='draw');$('selectTool').setAttribute('aria-pressed',state.tool==='select');$('drawTool').setAttribute('aria-pressed',state.tool==='draw');
  $('undoBtn').disabled=!state.history.length;$('deleteBtn').disabled=!b;$('referenceToggle').disabled=a.custom;$('referenceToggle').checked=state.reference;
  const known=a.objects.filter(o=>o.cls!=='review'),count=state.boxes.length;
  $('progressDots').innerHTML=(a.custom?[]:known).map((_,i)=>`<i class="${i<count?'done':''}"></i>`).join('');
  $('progressText').innerHTML=`已标注 <b>${count}</b> 个框${a.custom?' · 无参考真值，需人工自查':` · 图中有 ${known.length} 个可判断头部${a.objects.some(o=>o.cls==='review')?'及 1 个待复核头部':''}`}`;
  $('imageMeta').textContent=`${a.width} × ${a.height} px · ${a.custom?'导入图片，仅本页使用':'原创教学绘图，非现场照片'}`;
  $('gestureHint').textContent=state.tool==='draw'?'从左上拖到右下画框 · 触屏同样可拖动':'拖动框移动 · 拖动角点调整 · 方向键微调';
  let line=null;try{if(b)line=normalizeBox(b,a.width,a.height)}catch{}
  $('yoloLine').textContent=line||(b?.cls==='review'?'待复核 → 不生成训练标签':'选中有效的框，查看五列标签。');
  const values=line?.split(' ')||['—','—','—','—','—'];
  $('formulaGrid').innerHTML=['class','x_center','y_center','width','height'].map((name,i)=>`<div class="formula-cell"><small>${name}</small><b>${values[i]}</b><span>${['类别','中心 x','中心 y','框宽','框高'][i]}</span></div>`).join('');
  $('formulaExplanation').textContent=b?`当前原图 W = ${a.width}，H = ${a.height}。框左上角 (${b.bbox[0].toFixed(1)}, ${b.bbox[1].toFixed(1)})，右下角 (${b.bbox[2].toFixed(1)}, ${b.bbox[3].toFixed(1)})。`:'训练标签每个目标一行，坐标分母始终是原图宽高。';
  $('exportNote').textContent=a.custom&&count===0?'无框图片只有在确实没有目标时，才能作为负样本；导出前仍须完成逐图复核。':a.objects.some(o=>o.cls==='review')?'本图有遮挡不明目标，整张图只可保存复核草稿。':'训练样本包保留原图尺寸与同名五列 TXT；不含自动划分的数据集。';
 }
 function render(){renderSurface();renderInspector()}
 function point(e){const matrix=svg.getScreenCTM();if(!matrix)return null;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());return[Math.max(0,Math.min(state.asset.width,p.x)),Math.max(0,Math.min(state.asset.height,p.y))]}
 svg.addEventListener('pointerdown',e=>{
  if(e.button!==0||drag)return;const p=point(e);if(!p)return;
  const target=e.target.closest('[data-id]'),before=snapshot();let mode,corner;
  if(state.tool==='draw'){state.selected=state.nextId++;state.boxes.push({id:state.selected,cls:state.drawClass,bbox:[...p,...p]});mode='draw'}
  else if(target){state.selected=Number(target.dataset.id);mode=target.dataset.corner?'resize':'move';corner=target.dataset.corner}
  else{state.selected=null;render();svg.focus({preventScroll:true});return}
  drag={pointer:e.pointerId,start:p,original:clone(selected().bbox),mode,corner,before};svg.setPointerCapture(e.pointerId);if(e.pointerType==='mouse'){svg.focus({preventScroll:true});e.preventDefault()}render();
 });
 svg.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;const p=point(e),b=selected();if(!p||!b)return;const a=state.asset,[x,y,x2,y2]=drag.original;
  if(drag.mode==='draw')b.bbox=clampBox([...drag.start,...p],a.width,a.height);
  if(drag.mode==='move'){const dx=Math.max(-x,Math.min(a.width-x2,p[0]-drag.start[0])),dy=Math.max(-y,Math.min(a.height-y2,p[1]-drag.start[1]));b.bbox=[x+dx,y+dy,x2+dx,y2+dy]}
  if(drag.mode==='resize'){const arr=[x,y,x2,y2];if(drag.corner.includes('w'))arr[0]=Math.min(p[0],x2-2);if(drag.corner.includes('e'))arr[2]=Math.max(p[0],x+2);if(drag.corner.includes('n'))arr[1]=Math.min(p[1],y2-2);if(drag.corner.includes('s'))arr[3]=Math.max(p[1],y+2);b.bbox=clampBox(arr,a.width,a.height)}
  render();
 });
 function endDrag(e,cancel=false){if(!drag||e.pointerId!==drag.pointer)return;const d=drag,b=selected();drag=null;if(cancel||!b||b.bbox[2]-b.bbox[0]<2||b.bbox[3]-b.bbox[1]<2){Object.assign(state,d.before);if(!cancel)toast('框太小，请重新拖出有效范围。')}else if(JSON.stringify(d.before.boxes)!==JSON.stringify(state.boxes)){remember(d.before);changed()}if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);render()}
 svg.addEventListener('pointerup',e=>endDrag(e));svg.addEventListener('pointercancel',e=>endDrag(e,true));
 $('selectTool').onclick=()=>{state.tool='select';render()};$('drawTool').onclick=()=>{state.tool='draw';state.selected=null;render()};$('drawClass').onchange=()=>{state.drawClass=$('drawClass').value==='review'?'review':Number($('drawClass').value);state.tool='draw';state.selected=null;render()};
 document.querySelectorAll('[data-cls]').forEach(el=>el.onclick=()=>{const cls=el.dataset.cls==='review'?'review':Number(el.dataset.cls),b=selected();state.drawClass=cls;if(b&&b.cls!==cls){remember();b.cls=cls;changed()}render()});
 $('boxList').onclick=e=>{const b=e.target.closest('[data-box]');if(b){state.selected=Number(b.dataset.box);state.tool='select';render()}};
 function remove(){if(!selected())return;remember();state.boxes=state.boxes.filter(b=>b.id!==state.selected);state.selected=null;changed();render()}
 $('deleteBtn').onclick=remove;
 function undo(){if(!state.history.length)return;Object.assign(state,state.history.pop());changed();render();toast('已撤销上一步标注。')}
 $('undoBtn').onclick=undo;
 ['x1','y1','x2','y2'].forEach((id,i)=>$(id).onchange=()=>{const b=selected();if(!b)return;const el=$(id),value=Number(el.value);if(el.value.trim()===''||!Number.isFinite(value)){toast('坐标不能为空，请填写有效数值。');renderInspector();return}const arr=[...b.bbox];arr[i]=value;const a=state.asset;if(value<0||value>(i%2?a.height:a.width)||arr[2]-arr[0]<2||arr[3]-arr[1]<2){toast('请保持框在原图内，且右下角大于左上角。');renderInspector();return}remember();b.bbox=arr;changed();render()});
 document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.ctrlKey||e.metaKey){if(e.key.toLowerCase()==='z'){e.preventDefault();undo()}return}if(e.key.toLowerCase()==='r'){state.tool='draw';state.selected=null;render();e.preventDefault()}if(e.key.toLowerCase()==='v'){state.tool='select';render();e.preventDefault()}if((e.key==='Delete'||e.key==='Backspace')&&selected()){e.preventDefault();remove()}if(e.key==='Escape'){if(drag){const d=drag;drag=null;Object.assign(state,d.before)}state.tool='select';state.selected=null;render()}if(e.key.startsWith('Arrow')&&selected()){e.preventDefault();const b=selected(),a=state.asset,n=e.shiftKey?10:1,[x,y,x2,y2]=b.bbox;let dx=e.key==='ArrowLeft'?-n:e.key==='ArrowRight'?n:0,dy=e.key==='ArrowUp'?-n:e.key==='ArrowDown'?n:0;dx=Math.max(-x,Math.min(a.width-x2,dx));dy=Math.max(-y,Math.min(a.height-y2,dy));remember();b.bbox=[x+dx,y+dy,x2+dx,y2+dy];changed();render()}});
 $('zoom').onchange=()=>{state.zoom=Number($('zoom').value);fit()};$('referenceToggle').onchange=()=>{state.reference=$('referenceToggle').checked;renderSurface()};new ResizeObserver(fit).observe(wrap);
 function saveCurrent(){drafts.set(state.key,{...snapshot(),history:clone(state.history),reviewed:state.reviewed,checked:state.checked})}
 function load(key){saveCurrent();state.key=key;state.asset=key==='imported'?imported:LESSON_DATA[key];const draft=drafts.get(key);Object.assign(state,draft||{boxes:[{id:1,cls:0,bbox:[160,80,320,240]}],selected:1,nextId:2,history:[],reviewed:false,checked:false});state.reference=false;state.tool='select';state.zoom=1;$('zoom').value='1';$('reviewed').checked=state.reviewed;changed();render()}
 $('imageSelect').onchange=()=>{loadSequence++;load($('imageSelect').value)};
 $('imageFile').onchange=async()=>{
  const file=$('imageFile').files[0];$('imageFile').value='';if(!file)return;const sequence=++loadSequence;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>15*1024*1024){toast('请选择 15 MB 以内的 PNG、JPEG 或 WebP 图片。');return}
  try{const bytes=new Uint8Array(await file.arrayBuffer()),uri=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)}),image=new Image();image.src=uri;await image.decode();if(image.naturalWidth*image.naturalHeight>40000000)throw Error('图片过大，请使用 4000 万像素以内的图片。');if(sequence!==loadSequence)return;
   if(state.key==='imported'){saveCurrent();state.key='__old_import'}
   imported={custom:true,width:image.naturalWidth,height:image.naturalHeight,uri,bytes,fileName:file.name,extension:file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'png',objects:[]};drafts.delete('imported');load('imported');state.boxes=[];state.selected=null;state.nextId=1;state.history=[];let option=$('imageSelect').querySelector('[value="imported"]');if(!option){option=document.createElement('option');option.value='imported';$('imageSelect').appendChild(option)}option.textContent='自带图片 · '+file.name;$('imageSelect').value='imported';changed();render();toast('图片已载入。原始尺寸已读取，本页不会上传图片。');
  }catch(error){toast(error.message||'图片无法读取，请换一张有效图片。')}
 };
 function issues(){const a=state.asset;return annotationIssues(state.boxes,a.custom?null:a.objects)}
 function check(){const list=issues();state.checked=true;$('checkResult').innerHTML=list.length?`<strong>还有 ${list.length} 项需要处理</strong><ul>${list.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<strong style="color:#27897c">${state.asset.custom?'格式检查通过，仍需逐图人工复核。':'教学参考检查通过。'}</strong><p>请再核对每个头部、类别和贴合程度，然后勾选复核确认。</p>`;return list}
 $('checkBtn').onclick=check;$('reviewed').onchange=()=>{state.reviewed=$('reviewed').checked};
 function download(bytes,name,mime='application/zip'){const url=URL.createObjectURL(new Blob([bytes],{type:mime})),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),5000)}
 async function imageBytes(a){if(a.custom)return a.bytes;const img=new Image();img.src=imageURI(a.svg);await img.decode();const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;canvas.getContext('2d').drawImage(img,0,0);const blob=await new Promise((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(Error('图像转换失败')),'image/png'));return new Uint8Array(await blob.arrayBuffer())}
 function basename(a,key){return a.custom?a.fileName.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)||'image':'construction-'+key}
 async function exportPack(training){
  if(training){const problems=check();if(problems.length){toast('请先解决标注问题；当前可以保存复核草稿。');return}if(!state.reviewed){toast('请先逐目标检查，并勾选复核确认。');return}}
  const button=$(training?'exportTraining':'exportDraft');button.disabled=true;try{
   const a=state.asset,boxes=clone(state.boxes),reviewed=state.reviewed,name=basename(a,state.key),ext=a.extension||'png',bytes=await imageBytes(a);
   const manifest={schemaVersion:1,status:training?'reviewed-sample':'review-draft',image:name+'.'+ext,width:a.width,height:a.height,classes:{0:'hardhat',1:'no-hardhat'},source:a.custom?'user-import':'original-teaching-illustration',policy:'可见头部含所戴安全帽，不框躯干；待复核整图暂不进入训练。',boxes,studentReviewed:reviewed,issues:annotationIssues(boxes,a.custom?null:a.objects),referenceCheckAvailable:!a.custom};
   const files=training?[{name:`images/${name}.${ext}`,data:bytes},{name:`labels/${name}.txt`,data:boxes.map(b=>normalizeBox(b,a.width,a.height)).filter(Boolean).join('\n')+(boxes.length?'\n':'')},{name:'classes.txt',data:'hardhat\nno-hardhat\n'},{name:'review.json',data:JSON.stringify(manifest,null,2)},{name:'README.txt',data:'已复核的图像-标签样本，不是已划分的完整数据集。\n0=hardhat（头部含安全帽）；1=no-hardhat（未戴安全帽头部）。\n训练标签每行 class x_center y_center width height，后四项按原图宽高归一化，不含 confidence。\n内置图为原创教学绘制，标签检查只能反映本练习设定；实际项目需统一口径并独立人工复核。\n'}]:[{name:`image/${name}.${ext}`,data:bytes},{name:'review-draft.json',data:JSON.stringify(manifest,null,2)},{name:'README.txt',data:'复核草稿：不能直接作为YOLO训练样本。\n全部框、待复核状态与未完成事项见 review-draft.json。\n本包有意不生成训练用 labels TXT；含未解决目标时，整张图片暂不进入训练。\n'}];
   download(zipStore(files),name+(training?'-sample.zip':'-review-draft.zip'));toast(training?'已导出原图与同名 YOLO 标签。':'已保存图片和复核记录，草稿不含训练标签。');
  }catch(error){toast('导出失败：'+error.message)}finally{button.disabled=false}
 }
 $('exportTraining').onclick=()=>exportPack(true);$('exportDraft').onclick=()=>exportPack(false);
 document.querySelectorAll('[data-answer]').forEach(el=>el.onclick=()=>{$('quizFeedback').textContent=el.dataset.answer==='no'?'正确。只改变显示大小，原图像素坐标和归一化标签都不变。':'再看一下：200% 只是把画布放大显示，计算仍然使用原图 W 与 H。'});
 window.helmetAnnotationState=()=>({key:state.key,width:state.asset.width,height:state.asset.height,boxes:clone(state.boxes),selected:state.selected,tool:state.tool,zoom:state.zoom,reviewed:state.reviewed,issues:issues(),line:selected()?normalizeBox(selected(),state.asset.width,state.asset.height):null,historyLength:state.history.length});
 render();
})();
