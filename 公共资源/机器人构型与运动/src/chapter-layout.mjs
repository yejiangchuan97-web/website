import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
export function chapterLayout(html,task,page=''){
 const css=read('./chapter-layout.css'),js=read('./chapter-layout.js').replace(/<\/script/gi,'<\\/script');
 html=html.replace('</head>',`<style data-chapter-layout>${css}</style></head>`);
 // Run after the markup, before the lessons bind controls or create their renderer.
 html=html.replace(/<script\b/,`<script>window.CHAPTER_LAYOUT={task:${JSON.stringify(task)},page:${JSON.stringify(page)}};${js}</script><script`);
 return html;
}
