import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8'),safe=s=>s.replace(/<\/script/gi,'<\\/script');
let html=read('./page.html');
for(const [key,value]of[['STYLE',read('../../第三章_机器人结构与运动/src/style.css')+'\n'+read('./style.css')],['THREE',safe(read('../../公共资源/vendor/three-r160.min.js'))],['SCENE',safe(read('./scene.js'))],['APP',safe(read('./app.js'))]])html=html.replace(`/*${key}*/`,()=>value);
writeFileSync(new URL('../index.html',import.meta.url),html);console.log('Built chapter 8: 4 reading guides / chapter summary');
