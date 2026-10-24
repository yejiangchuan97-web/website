import {fileURLToPath as __taskFileURL} from 'node:url';
import {integrateChapter5} from '../../公共资源/主体结构施工/chapter-layout.mjs';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import{readFileSync,writeFileSync}from'node:fs';import{dirname,join}from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';import*as model from"./model.mjs";
const HERE=__taskFile("."),ROOT=__taskFile("../../公共资源/主体结构施工");
export function buildRebar(){const read=n=>readFileSync(join(HERE,n),'utf8');const values={CSS:read("./style.css"),THREE:'/*\n'+readFileSync(__taskFile("../../公共资源/vendor/THREE-LICENSE.txt"),'utf8')+'\n*/\n'+readFileSync(__taskFile("../../公共资源/vendor/three-r160.min.js"),'utf8'),MODEL:'const M=(()=>{\n'+read("./model.mjs").replace(/^export /gm,'')+'\nreturn {'+Object.keys(model).join(',')+'};})();',SCENE:read("./scene.js"),APP:read("./inspection.js")+'\n'+read("./app.js")};const html=read("./page.html").replace(/\{\{(CSS|THREE|MODEL|SCENE|APP)\}\}/g,(_,key)=>values[key].replace(/<\/script/gi,'<\\/script'));writeFileSync(__taskFile("../index.html"),integrateChapter5(html,'rebar'));console.log('built 5-1.html · '+html.length+' characters')}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){buildRebar();if(process.argv.includes('--audit'))await import("../qa/model-check.mjs")}
