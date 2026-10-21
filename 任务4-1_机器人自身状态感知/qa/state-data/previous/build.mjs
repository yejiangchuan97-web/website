import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import{readFileSync,writeFileSync,existsSync}from'node:fs';
import{dirname,join}from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
import{robotFallback}from"./fallback.mjs";
const HERE=__taskFile("."),ROOT=__taskFile("../../公共资源/感知与识别");
export function buildSelfState(){
 const read=n=>readFileSync(join(HERE,n),'utf8');
 const values={CSS:'/*\n'+readFileSync(__taskFile("../../公共资源/感知与识别/assets/kit/LICENSE.txt"),'utf8')+'\n*/\n'+readFileSync(__taskFile("../../公共资源/感知与识别/assets/kit/iso.css"),'utf8')+'\n'+read("./style.css"),FALLBACK:'<div class="iso" data-theme="light">'+robotFallback()+'</div>',THREE:'/*\n'+readFileSync(__taskFile("../../公共资源/感知与识别/assets/vendor/THREE-LICENSE.txt"),'utf8')+'\n*/\n'+readFileSync(__taskFile("../../公共资源/感知与识别/assets/vendor/three-r160.min.js"),'utf8'),MODEL:read("./model.mjs").replace(/^export /gm,''),SENSORS:read("./sensors.mjs").replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,''),SCENE:read("./scene.js"),APP:read("./app.js")};
 const out=read("./page.html").replace(/\{\{(CSS|FALLBACK|THREE|MODEL|SENSORS|SCENE|APP)\}\}/g,(_,key)=>values[key].replace(/<\/script/gi,'<\\/script'));
 writeFileSync(__taskFile("../index.html"),out);
 // Refresh only this task's existing chapter card, preserving all other cards.
 const chapter=join(ROOT,'index.html');
 if(existsSync(chapter)){
  const home=readFileSync(chapter,'utf8');
  const card=`<a class="home-card" href="../../任务4-1_机器人自身状态感知/index.html"><div class="home-art">${values.FALLBACK}</div><div class="home-copy"><div class="eyebrow">EXPERIMENT 01 / 任务 4-1</div><h2>机器人自身的传感器</h2><p>在机身上找到传感器，做一个动作，理解读数与机器人状态的联系。</p><div class="row between"><span>加速度计 · 陀螺仪 · 编码器 · 电流</span><span>进入实验 ↗</span></div></div></a>`;
  const updated=home.replace(/<a class="home-card" href="[^"]*任务4-1[^"]*">[\s\S]*?<\/a>/,()=>card);
  if(updated!==home)writeFileSync(chapter,updated);
 }
 console.log('built 任务4-1/index.html · 机器人自身传感器 · '+out.length+' characters');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildSelfState();
