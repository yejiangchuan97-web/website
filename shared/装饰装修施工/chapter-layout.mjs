import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
export function integrateChapter6(html,lab){
  const js=read('./chapter-layout.js').replace('/*CONFIG*/',`const lab=${JSON.stringify(lab)};`);
  return html.replace(/(<(?:html|body)\b[^>]*\bdata-theme=")[^"]*(")/g,'$1light$2')
    .replace('</head>',`<style>${read('./chapter-layout.css')}</style></head>`)
    .replace(/<script\b/,`<script>${js.replace(/<\/script/gi,'<\\/script')}</script><script`)
    .replace('href="../README.md"','href="../../course/chapters/06/overview/index.html"');
}
