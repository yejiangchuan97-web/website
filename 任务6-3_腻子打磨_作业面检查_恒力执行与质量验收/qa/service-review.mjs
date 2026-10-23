import {readFileSync,writeFileSync} from 'node:fs';
import {serviceScene} from '../src/service-geometry.mjs';
const s=serviceScene(process.argv.includes('--audit'));
const css=readFileSync(new URL('../../公共资源/anatomy/iso.css',import.meta.url),'utf8');
const html=`<!doctype html><html><meta charset="utf-8"><style>${css}\nbody{margin:0;background:#fff}.iso-plate{width:1000px;height:580px;margin:0 auto}.iso-plate svg{width:100%;height:100%}body[data-theme=dark]{background:#192a39}</style><body class="iso" data-theme="light"><div class="iso-plate">${s.svg}</div><script>document.addEventListener('keydown',e=>{if(e.key==='t')document.body.dataset.theme=document.body.dataset.theme==='light'?'dark':'light'})</script></body></html>`;
writeFileSync(new URL('service-review.html',import.meta.url),html);
console.log('service-review.html written');
