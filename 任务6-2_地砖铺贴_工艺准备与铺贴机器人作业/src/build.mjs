import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scene} from "./geometry.mjs";
import * as M from "./model.mjs";
import * as A from "../../公共资源/anatomy/audit.mjs";
import * as k from "../../公共资源/anatomy/iso-kit.mjs";
const HERE=__taskFile("."),ROOT=__taskFile("../../公共资源/装饰装修施工"),read=n=>readFileSync(join(HERE,n),'utf8');
const cache=__taskFile("./scene-cache.json");
const s=process.argv.includes('--ui')&&existsSync(cache)?JSON.parse(readFileSync(cache,'utf8')):scene({audit:process.argv.includes('--audit')});
const orderFile=__taskFile("../qa/motion-order.json");
if(!process.argv.includes('--ui')&&existsSync(orderFile)){
 const keys=JSON.parse(readFileSync(orderFile,'utf8'));
 if(s.R.items.every(it=>Number.isFinite(keys[it.name]))){
  for(const it of s.R.items)it.key=keys[it.name];s.R.items.sort((a,b)=>a.key-b.key);
  const body=s.body.slice(0,s.body.indexOf('<g data-part'))+s.R.items.map(it=>`<g data-part="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
  s.svg=k.figureSvg({width:1000,height:580,label:'地砖铺贴教学台：相机、四吸盘末端、力传感器与升降执行器',body});
 }
}
if(!process.argv.includes('--ui'))writeFileSync(cache,JSON.stringify({P:s.P,svg:s.svg,count:s.R.items.length}));
const kit='/* Anatomy toolkit · MIT\n'+readFileSync(__taskFile("../../公共资源/anatomy/LICENSE"),'utf8')+'\n*/\n'+readFileSync(__taskFile("../../公共资源/anatomy/iso-kit.mjs"),'utf8').replace(/^export /gm,'');
const model='const M=(()=>{'+read("./model.mjs").replace(/^export /gm,'')+';return {'+Object.keys(M).join(',')+'};})();\nconst {'+Object.keys(M).join(',')+'}=M;';
const values={CSS:readFileSync(__taskFile("../../公共资源/anatomy/iso.css"),'utf8')+'\n'+read("./style.css"),SCENE:s.svg,JS:kit+'\n'+model+'\nconst PROJECTION='+JSON.stringify(s.P)+';\n'+read("./app.js")};
let html=read("./page.html").replace(/\{\{(CSS|SCENE|JS)\}\}/g,(_,key)=>key==='JS'?values[key].replace(/<\/script/gi,'<\\/script'):values[key]);
writeFileSync(__taskFile("../index.html"),html);writeFileSync(__taskFile("../dark.html"),html.replace('data-theme="light"','data-theme="dark"'));
console.log('Built 6-2.html · '+(s.count||s.R.items.length)+' shapes · offline standalone');
if(process.argv.includes('--poses')){
 for(const t of [0,1,1.5,2,2.5,3,3.5,4,5]){const p=M.cycle(t);console.log('POSE '+t);scene({...p,audit:true})}
 for(const [x,y,top]of [[19,24,40],[31,36,40],[25,30,8],[25,30,12.8]])scene({x,y,top,audit:true});
}
