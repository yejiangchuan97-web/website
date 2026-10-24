import {readFileSync,writeFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildGuide(base){
  const data=JSON.parse(readFileSync(new URL('./guide.json',base),'utf8'));
  const values={TITLE:escape(data.title),CSS:read('./guide.css'),DATA:JSON.stringify(data).replace(/</g,'\\u003c'),APP:read('./guide.js').replace(/<\/script/gi,'<\\/script')};
  const html=read('./guide.html').replace(/\{\{(TITLE|CSS|DATA|APP)\}\}/g,(_,key)=>values[key]);
  writeFileSync(new URL('../index.html',base),html);
  console.log(`Built task ${data.id} · reading guide · ${data.topics.length} topics`);
}
