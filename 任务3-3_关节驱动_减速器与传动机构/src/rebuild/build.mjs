import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve,join} from 'node:path';
import {fallback} from './fallback.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),ROOT=resolve(HERE,'../..'),read=n=>readFileSync(join(HERE,n),'utf8');
const js=s=>s.replace(/<\/script/gi,'<\\/script');
const three=readFileSync(join(ROOT,'../公共资源/vendor/three-r160.min.js'),'utf8');
for(const [page,title,eyebrow]of[['reducers','把速度交给齿轮','REDUCTION LAB / 减速器实验室'],['conversion','把转动变成行动','MOTION LAB / 运动转换实验室']]){
 const out=join(ROOT,page+'.html'),previous=existsSync(out)?readFileSync(out,'utf8'):'',cached=previous.match(/<div class="fallback iso" id="fallback">([\s\S]*?)<p>三维显示不可用/);
 const f=cached&&!process.argv.includes('--audit')&&!process.argv.includes('--refresh-static')?{svg:cached[1],parts:'cached'}:fallback(page,process.argv.includes('--audit'));
 const vals={TITLE:title,EYEBROW:eyebrow,PAGE:page,FALLBACK:f.svg,CSS:read('style.css'),ISO_CSS:readFileSync(join(ROOT,'assets/anatomy/iso.css'),'utf8'),THREE:js(three),MODEL:js(read('model.mjs').replace(/^export /gm,'')),SCENE:js(read('scene.js')),APP:js(read('app.js'))};
 const html=read('page.html').replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>vals[key]);writeFileSync(join(ROOT,page+'.html'),html);console.log(`Built ${page}.html · fallback ${f.parts} parts · ${html.length} chars`);
}
