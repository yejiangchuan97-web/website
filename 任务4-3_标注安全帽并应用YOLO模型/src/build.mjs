import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const HERE=__taskFile("."),ROOT=__taskFile("../../公共资源/感知与识别");
export function refreshHelmetIndex(svg){
 const path=__taskFile("../../公共资源/感知与识别/index.html");if(!existsSync(path))return;
 if(!svg)svg=readFileSync(__taskFile("../assets/construction-640.svg"),'utf8').replace(/<g id="worker-H06"[^>]*>[\s\S]*?<\/g>/,'').replace(/六名工人，其中三名可明确判断戴安全帽、两名未戴安全帽，一名头部被结构遮挡而待复核/,'五名工人，其中三名戴安全帽、两名未戴安全帽');
 const preview=svg.replace(/<svg[^>]*>/,'<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg" viewBox="0 0 640 640" style="width:100%;height:250px" role="img" aria-label="二维安全帽标注教学图">');
 const card=`<a class="home-card" href="index.html"><div class="home-art" style="background:#f2f8ff">${preview}</div><div class="home-copy"><div class="eyebrow">EXPERIMENT 03 / 任务 4-3</div><h2>安全帽与 YOLO 教学实验</h2><p>三个独立的二维页面：亲手标注头部，观察预测筛选，再逐框核验误检与漏检。</p><div class="row between"><span>标注 → 预测 → 评估</span><span>进入实验 ↗</span></div></div></a>`;
 const previous=readFileSync(path,'utf8'),next=previous.replace(/<a class="home-card" href="4-3\.html">[\s\S]*?<\/a>/,card).replace('三座可亲手操作的小型实验台，分别观察自身状态、环境距离与图像目标。','三组可亲手操作的教学实验，分别观察自身状态、环境距离与图像目标。');
 if(next!==previous)writeFileSync(path,next);
}
export function buildHelmet(){
 const read=n=>readFileSync(join(HERE,n),'utf8');
 const metadata=JSON.parse(readFileSync(__taskFile("../assets/asset-heads.json"),'utf8'));
 const asset=(width,clear)=>{const a=metadata.images.find(x=>x.width===width);let svg=readFileSync(join(HERE,'../assets',a.file),'utf8');if(clear)svg=svg.replace(/<g id="worker-H06"[^>]*>[\s\S]*?<\/g>/,'').replace(/六名工人，其中三名可明确判断戴安全帽、两名未戴安全帽，一名头部被结构遮挡而待复核/,'五名工人，其中三名戴安全帽、两名未戴安全帽');return{width:a.width,height:a.height,svg,objects:a.objects.filter(o=>!clear||o.classId!==null).map(o=>({id:o.id,cls:o.classId===null?'review':o.classId,bbox:o.bbox,reviewReason:o.reviewReason}))}};
 const data={clear:asset(640,true),wide:asset(960,true),occluded:asset(640,false)};
 const pages=[['4-3','annotation','标注','亲手画框，让图像成为数据。','在原图上框出头部，给出类别，再读懂一行 YOLO 标签。'],['4-3-predict','predict','预测','模型看到了什么？','用同一组教学预测，观察置信度门槛怎样改变保留结果。'],['4-3-evaluate','evaluate','评估','一次判断，要经得起核对。','逐框对照人工真值，分清检对、误检和漏检。']];
 const css=read("./style.css")+'\n'+read("./page-extra.css");
 const common=`const LESSON_DATA=${JSON.stringify(data)};\nconst $=id=>document.getElementById(id);const esc=s=>String(s).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));const imageURI=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);let toastTimer;function toast(s){$('toast').textContent=s;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4200);}\n`+read("./model.mjs").replace(/^export /gm,'');
 for(const [id,key,title,headline,description] of pages){
  const body=`<a href="#workbench" class="skip">跳到实验台</a><header class="topbar"><a class="brand" href="../公共资源/感知与识别/index.html"><span class="brand-mark">⌘</span><span>感知与识别<small>INTERACTIVE LEARNING LAB</small></span></a><a class="course-link" href="README.md">任务 4-3 · 安全帽与 YOLO</a><span class="offline"><i></i>离线教学演示</span></header><main><nav class="steps" aria-label="安全帽教学步骤">${pages.map(([p,k,t],i)=>`<a href="${({"4-3":"index.html","4-3-predict":"predict.html","4-3-evaluate":"evaluate.html"})[p]}"${id===p?' aria-current="page"':''}><span class="step-number">0${i+1}</span><span><b>${t}</b><small>${['人工定义目标','筛选模型输出','对照真值核验'][i]}</small></span><span class="step-arrow">↗</span></a>`).join('')}</nav><div class="hero"><div><div class="eyebrow">VISION LAB / 0${pages.findIndex(p=>p[0]===id)+1} · ${['ANNOTATION','PREDICTION','EVALUATION'][pages.findIndex(p=>p[0]===id)]}</div><h1>${headline}</h1><p>${description}</p></div><div class="hero-side"><span>安全帽识别</span><b>${title}实验</b><small>BLUE / WHITE SERIES</small></div></div><div id="workbench">${read(key+'.body.html')}</div><footer><span>原创教学矢量图 · 类别与预测均为教学设定</span><a href="../公共资源/感知与识别/使用说明.md">使用说明 ↗</a><span>04 / 感知与识别</span></footer></main><div id="toast" role="status" aria-live="polite"></div>`;
  const script=(common+'\n'+read(key+'.js')).replace(/<\/script/gi,'<\\/script');
  const html=`<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="theme-color" content="#f5f9ff"><title>安全帽 · ${title}实验 | 感知与识别</title><style>${css}</style></head><body data-lesson="${key}">${body}<script>${script}</script></body></html>`;
  writeFileSync(join(HERE,'..',({"4-3":"index.html","4-3-predict":"predict.html","4-3-evaluate":"evaluate.html"})[id]),html);console.log('built '+id+'.html · '+html.length+' characters');
 }
 // Shared overview is maintained in the repository navigation.

}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildHelmet();
