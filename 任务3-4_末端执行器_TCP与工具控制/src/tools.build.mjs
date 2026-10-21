import {readFileSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const scripts=[
  '../../任务3-2_六轴机械臂本体_关节轴与低速点动/assets/vendor/three.min.js',
  '../../任务3-2_六轴机械臂本体_关节轴与低速点动/src/model.js',
  './tools.model.js', './workshop.model.js',
  '../../任务3-1_机器人构型与工作空间识读/src/render.js',
  './tools.view.js','./workshop.view.js','./workshop.app.js'
];
let html=read('./page.html').replace('/*STYLES*/',()=>read('./workshop.css'));
const helpers=`window.$=s=>document.querySelector(s);window.$$=s=>[...document.querySelectorAll(s)];window.ConfigModel=Object.assign({},RobotModel,{definitions:{articulated:{types:['R','R','R','R','R','R']}}});`;
html=html.replace('<!--SCRIPTS-->',()=>scripts.map((file,i)=>'<script>'+read(file).replace(/<\/script/gi,'<\\/script')+(i===3?helpers:'')+'</script>').join('\n'));
writeFileSync(new URL('../index.html',import.meta.url),html);
console.log('Built task 3-4 offline workshop:',html.length,'characters');
