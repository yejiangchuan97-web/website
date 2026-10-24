import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
export function integrateChapter5(html,lab){
  const js=read('./chapter-layout.js').replace('/*CONFIG*/',`const lab=${JSON.stringify(lab)};`);
  return html.replace('</head>',`<style>${read('./chapter-layout.css')}</style></head>`)
    .replace(/<script\b/,`<script>${js.replace(/<\/script/gi,'<\\/script')}</script><script`)
    .replace('content="light"','content="dark light"');
}
