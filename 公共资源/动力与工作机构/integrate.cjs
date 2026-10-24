const fs=require('node:fs'),path=require('node:path');
const css=()=>fs.readFileSync(path.join(__dirname,'chapter-layout.css'),'utf8');
const js=()=>fs.readFileSync(path.join(__dirname,'chapter-nav.js'),'utf8').replace(/<\/script/gi,'<\\/script');
module.exports=function integrate(html,lab,root='../'){
  html=html.replace(/\r\n?/g,'\n');
  if(html.includes('data-chapter2-layout'))return html;
  return html.replace('</head>',`<style data-chapter2-layout>${css()}</style></head>`)
    .replace('</body>',`<script data-root="${root}" data-lab="${lab}">${js()}</script></body>`);
};
