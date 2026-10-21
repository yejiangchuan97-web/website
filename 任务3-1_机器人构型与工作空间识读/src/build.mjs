import{readFileSync,writeFileSync}from'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
let page=read("./page.html").replace('/*STYLE*/',()=>read("./style.css"));
for(const [key,file]of[['THREE',"../../公共资源/vendor/three-r160.min.js"],['SIX',"../../任务3-2_六轴机械臂本体_关节轴与低速点动/src/model.js"],['MODEL','model.js'],['RENDER','render.js'],['APP','app.js']])page=page.replace(`/*${key}*/`,()=>read(file).replace(/<\/script/gi,'<\\/script'));
writeFileSync(new URL("../index.html",import.meta.url),page);console.log('Built robot-configurations.html',page.length,'characters');
