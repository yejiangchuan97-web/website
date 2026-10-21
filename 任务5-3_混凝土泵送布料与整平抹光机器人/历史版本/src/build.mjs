import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scene,bladeRing} from "./geometry.mjs";
import * as M from "./model.mjs";
const HERE=__taskFile("."),ROOT=__taskFile("../../../公共资源/主体结构施工");
const read=n=>readFileSync(join(HERE,n),'utf8');
const audit=process.argv.includes('--audit');
const level=scene('level',0,0,audit),trowel=scene('trowel',0,0,audit);
const kit='/* Anatomy toolkit\n'+readFileSync(__taskFile("../../../公共资源/主体结构施工/assets/anatomy/LICENSE"),'utf8')+'\n*/\n'+readFileSync(__taskFile("../../../公共资源/主体结构施工/assets/anatomy/iso-kit.mjs"),'utf8').replace(/^export /gm,'');
const model='const M=(()=>{'+read("./model.mjs").replace(/^export /gm,'')+';return {'+Object.keys(M).join(',')+'};})();';
const values={CSS:readFileSync(__taskFile("../../../公共资源/主体结构施工/assets/anatomy/iso.css"),'utf8')+'\n'+read("./style.css"),LEVEL:level.svg,TROWEL:trowel.svg,JS:kit+'\n'+model+'\nconst PROJECTION='+JSON.stringify(level.P)+';\n'+bladeRing.toString()+'\n'+read("./app.js")};
let html=read("./page.html").replace(/\{\{(CSS|LEVEL|TROWEL|JS)\}\}/g,(_,key)=>key==='JS'?values[key].replace(/<\/script/gi,'<\\/script'):values[key]);
writeFileSync(__taskFile("../index.html"),html);
console.log('Built 5-3.html · level '+level.R.items.length+' parts · trowel '+trowel.R.items.length+' parts');
if(process.argv.includes('--poses')){
  for(const head of [-10,-5,5,10])scene('level',head,0,true);
  for(const angle of [Math.PI/8,Math.PI/4,Math.PI*3/8])scene('trowel',0,angle,true);
}
