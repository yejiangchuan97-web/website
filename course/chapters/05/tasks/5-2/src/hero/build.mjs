import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as model from './model.mjs';
import {ISO_CSS} from '../../../../../../../shared/anatomy/iso-kit.mjs';
import {integrateChapter5} from '../../../../../../../shared/主体结构施工/chapter-layout.mjs';
import {labShell, hasStations} from '../../../../../../../shared/lab-shell/native-layout.mjs';
const path=p=>fileURLToPath(new URL(p,import.meta.url)),read=p=>readFileSync(path(p),'utf8');
const fallback=JSON.parse(read('../figure-cache.json')).svg;
const script=s=>s.replace(/<\/script/gi,'<\\/script');
const values={CSS:read('./style.css')+'\n'+ISO_CSS+'\n#fallback{position:absolute;inset:0;padding:80px 15px 60px;overflow:hidden}#fallback>svg{width:100%;height:100%}#fallback svg{max-height:100%}',
 THREE:script(read('../../../../../../../shared/vendor/three-r160.min.js')),
 MODEL:script('const HG=(()=>{\n'+read('./model.mjs').replace(/^export /gm,'')+'\nreturn {'+Object.keys(model).join(',')+'};})();'),
 SCENE:script(read('../../../../../../../shared/robot-arm/six-axis-arm.js')+'\n'+read('./scene.js')),APP:script(read('./app.js')),FALLBACK:fallback};
let html=read('./page.html').replace(/\{\{(CSS|THREE|MODEL|SCENE|APP|FALLBACK)\}\}/g,(_,key)=>values[key]);
html=html.replace('<html lang="zh-CN">','<!-- Anatomy MIT license:\n'+read('../../../../../../../shared/anatomy/LICENSE')+'\nThree.js license:\n'+read('../../../../../../../shared/vendor/THREE-LICENSE.txt')+'\n-->\n<html lang="zh-CN">');
// 有 src/stations.js 时使用全课程统一任务页外壳，不再套第五章原版式
html=hasStations('5-2')?labShell(html,'5-2'):integrateChapter5(html,'tying');
writeFileSync(path('../../index.html'),html);

console.log('Built Task 5-2 Hero · standalone true 3D · '+Math.round(Buffer.byteLength(html)/1024)+' KB');
if(process.argv.includes('--audit'))console.log('Hero uses Three.js: run qa/hero-model.test.mjs and qa/hero-verify.mjs. Native SVG audit applies only to the legacy static fallback.');
