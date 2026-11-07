import {chapterLayout} from '../../../../../../shared/机器人构型与运动/src/chapter-layout.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const scripts=[
  '../../../../../../shared/vendor/three-r160.min.js',
  '../../3-2/src/model.js',
  '../../../../../../shared/robot-arm/six-axis-arm.js',
  './tools.model.js', './workshop.model.js',
  '../../3-1/src/render.js',
  './tools.view.js','./workshop.view.js','./workshop.app.js'
];
let html=read('./page.html').replace('/*STYLES*/',()=>read('./workshop.css'));
const helpers=`window.$=s=>document.querySelector(s);window.$$=s=>[...document.querySelectorAll(s)];window.ConfigModel=Object.assign({},RobotModel,{definitions:{articulated:{types:['R','R','R','R','R','R']}}});`;
html=html.replace('<!--SCRIPTS-->',()=>scripts.map((file,i)=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+(i===4?helpers:'')+'</script>').join('\n'));
writeFileSync(new URL('../index.html',import.meta.url),chapterLayout(html,'3-4'));
console.log('Built task 3-4 offline workshop:',html.length,'characters');
