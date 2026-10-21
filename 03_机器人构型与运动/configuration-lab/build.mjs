import{readFileSync,writeFileSync}from'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
let page=read('page.html').replace('/*STYLE*/',()=>read('style.css'));
for(const [key,file]of[['THREE','../robot-lab/vendor/three.min.js'],['SIX','../robot-lab/model.js'],['MODEL','model.js'],['RENDER','render.js'],['APP','app.js']])page=page.replace(`/*${key}*/`,()=>read(file).replace(/<\/script/gi,'<\\/script'));
writeFileSync(new URL('../robot-configurations.html',import.meta.url),page);console.log('Built robot-configurations.html',page.length,'characters');
