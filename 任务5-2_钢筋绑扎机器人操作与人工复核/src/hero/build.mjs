import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as model from './model.mjs';
import {ISO_CSS} from '../../../公共资源/anatomy/iso-kit.mjs';
const path=p=>fileURLToPath(new URL(p,import.meta.url)),read=p=>readFileSync(path(p),'utf8');
const fallback=JSON.parse(read('../figure-cache.json')).svg;
const script=s=>s.replace(/<\/script/gi,'<\\/script');
const values={CSS:read('./style.css')+'\n'+ISO_CSS+'\n#fallback{position:absolute;inset:0;padding:80px 15px 60px;overflow:hidden}#fallback>svg{width:100%;height:100%}#fallback svg{max-height:100%}',
 THREE:script(read('../../../公共资源/vendor/three-r160.min.js')),
 MODEL:script('const HG=(()=>{\n'+read('./model.mjs').replace(/^export /gm,'')+'\nreturn {'+Object.keys(model).join(',')+'};})();'),
 SCENE:script(read('./scene.js')),APP:script(read('./app.js')),FALLBACK:fallback};
let html=read('./page.html').replace(/\{\{(CSS|THREE|MODEL|SCENE|APP|FALLBACK)\}\}/g,(_,key)=>values[key]);
html=html.replace('<html lang="zh-CN">','<!-- Anatomy MIT license:\n'+read('../../../公共资源/anatomy/LICENSE')+'\nThree.js license:\n'+read('../../../公共资源/vendor/THREE-LICENSE.txt')+'\n-->\n<html lang="zh-CN">');
writeFileSync(path('../../index.html'),html);
writeFileSync(path('../../dark.html'),html.replace('data-theme="light"','data-theme="dark"'));
console.log('Built Task 5-2 Hero · standalone true 3D · '+Math.round(Buffer.byteLength(html)/1024)+' KB');
if(process.argv.includes('--audit'))console.log('Hero uses Three.js: run qa/hero-model.test.mjs and qa/hero-verify.mjs. Native SVG audit applies only to the legacy static fallback.');
