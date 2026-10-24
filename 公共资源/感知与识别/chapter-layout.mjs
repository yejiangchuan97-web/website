import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');

// Embedded by each standalone lesson so file:// and hosted pages work alike.
export function integrateChapter4(html,lab){
  const css=read('./chapter-layout.css');
  const js=read('./chapter-layout.js').replace('/*CONFIG*/',`const lab=${JSON.stringify(lab)};`);
  return html.replace('</head>',`<style>${css}</style></head>`)
    .replace(/<script\b/,`<script>${js.replace(/<\/script/gi,'<\\/script')}</script><script`)
    .replaceAll('../公共资源/感知与识别/index.html','../第四章_感知与智能识别/index.html');
}
