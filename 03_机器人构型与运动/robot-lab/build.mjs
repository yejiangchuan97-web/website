import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
let html=read('page.html').replace('/*STYLES*/',()=>read('style.css')+'\n'+read('screen-layout.css'));
for(const [mark,file] of [['THREE','vendor/three.min.js'],['MODEL','model.js'],['APP','app.js']])html=html.replace(`/*${mark}*/`,()=>read(file).replace(/<\/script/gi,'<\\/script'));
html=html.replace('href="../../README.md"','href="../README.md"');
writeFileSync(new URL('../robot-arm.html',import.meta.url),html);
console.log('Built',fileURLToPath(new URL('../robot-arm.html',import.meta.url)),html.length,'characters');
