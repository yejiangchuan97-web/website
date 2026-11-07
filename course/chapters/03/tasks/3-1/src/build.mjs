import {chapterLayout} from '../../../../../../shared/机器人构型与运动/src/chapter-layout.mjs';
import{readFileSync,writeFileSync}from'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
let page=read("./page.html").replace('/*STYLE*/',()=>read("./style.css"));
for(const [key,file]of[['THREE',"../../../../../../shared/vendor/three-r160.min.js"],['SIX',"../../3-2/src/model.js"],['ARM',"../../../../../../shared/robot-arm/six-axis-arm.js"],['MODEL','model.js'],['RENDER','render.js'],['APP','app.js']])page=page.replace(`/*${key}*/`,()=>read(file).replace(/<\/script/gi,'<\\/script'));
writeFileSync(new URL("../index.html",import.meta.url),chapterLayout(page,"3-1"));console.log('Built robot-configurations.html',page.length,'characters');
