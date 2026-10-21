import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {scene} from './geometry.mjs';
import * as M from './model.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),ROOT=join(HERE,'../..');
const read=n=>readFileSync(join(HERE,n),'utf8');
const sc=scene({audit:process.argv.includes('--audit')});
if(existsSync(join(HERE,'draw-order.json'))){const order=JSON.parse(read('draw-order.json'));sc.R.items.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));}
if(process.argv.includes('--poses'))for(const z of [49,85,205,281])scene({x:z<150?-150:150,z,distance:z<150?200:450,audit:true});
const kit=readFileSync(join(ROOT,'assets/anatomy/iso-kit.mjs'),'utf8').replace(/^export /gm,'');
const model='const M=(()=>{'+read('model.mjs').replace(/^export /gm,'')+';return {'+Object.keys(M).join(',')+'};})();';
const stat=sc.R.items.filter(it=>it.group==='static').map(it=>`<g data-name="${it.name}">${it.svg}</g>`).join('');
const robot=sc.R.items.filter(it=>it.group!=='static').map(it=>`<g data-name="${it.name}" data-group="${it.group}">${it.svg}</g>`).join('');
const values={CSS:readFileSync(join(ROOT,'assets/anatomy/iso.css'),'utf8')+read('style.css'),STATIC:stat,ROBOT:robot,JS:kit+'\n'+model+'\nconst PROJECTION='+JSON.stringify(sc.P)+';\n'+read('app.js')};
const html=read('page.html').replace(/\{\{(CSS|STATIC|ROBOT|JS)\}\}/g,(_,key)=>key==='JS'?values[key].replace(/<\/script/gi,'<\\/script'):values[key]);
writeFileSync(join(ROOT,'6-4.html'),html);writeFileSync(join(ROOT,'6-4-dark.html'),html.replace('data-theme="light"','data-theme="dark"'));
console.log('Built spray lab · '+sc.R.items.length+' physical parts · standalone light + dark');
