import {readFileSync,writeFileSync} from 'node:fs';
import {integrateChapter5} from '../../公共资源/主体结构施工/chapter-layout.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
let html=read('./page.html').replace('/*STYLE*/',()=>read('./style.css')).replace('/*APP*/',()=>read('./app.js'));
writeFileSync(new URL('../index.html',import.meta.url),integrateChapter5(html,'concrete'));
console.log('Built task 5-3 · concrete process reading guide (no simulation)');
