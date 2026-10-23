import {buildUnifiedHelmet} from './unified-build.mjs';
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
export function buildHelmet(){return buildUnifiedHelmet();}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildHelmet();
