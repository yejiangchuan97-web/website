const fs=require('node:fs'),path=require('node:path');
const css=()=>fs.readFileSync(path.join(__dirname,'chapter-layout.css'),'utf8');
const js=()=>fs.readFileSync(path.join(__dirname,'chapter-nav.js'),'utf8').replace(/<\/script/gi,'<\\/script');
module.exports=function integrate(html,lab,root='../'){
  html=html.replace(/\r\n?/g,'\n');
  if(html.includes('data-chapter2-layout'))return html;
  const task={motor:'2-1',diesel:'2-1',transmission:'2-2',mechanisms:'2-3',fourbar:'2-3'}[lab];
  const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../../course/catalog.json'),'utf8'));
  const links=catalog.tasks.filter(row=>row.scene===2).map(({id,title,demo})=>({id,title,demo}));
  const guide=fs.readFileSync(path.join(__dirname,'../../course/chapters/02/tasks',task,'learning-guides.js'),'utf8');
  const workstation=fs.readFileSync(path.join(__dirname,'workstation.js'),'utf8');
  const renderer=fs.readFileSync(path.join(__dirname,'renderer.js'),'utf8');
  // 三维区统一底色（嵌入时外壳把自己的取值传进来，见 embed-bridge.js）
  const tone=fs.readFileSync(path.join(__dirname,'../lab-shell/stage-tone.js'),'utf8').replace(/<\/script/gi,'<\\/script');
  const bridge=fs.readFileSync(path.join(__dirname,'embed-bridge.js'),'utf8').replace(/<\/script/gi,'<\\/script');
  return html.replace('</head>',`<style data-chapter2-layout>${css()}</style><script>${tone}\n${renderer}</script></head>`)
    .replace('</body>',`<script data-root="${root}" data-lab="${lab}">${js().replace('/*__CHAPTER_TASKS__*/',JSON.stringify(links))}</script><script>${guide}\n${workstation}</script><script>${bridge}</script></body>`);
};
