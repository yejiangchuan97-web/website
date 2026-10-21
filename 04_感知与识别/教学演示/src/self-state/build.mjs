import{readFileSync,writeFileSync}from'node:fs';
import{dirname,join}from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
import{fixture}from'../geometry.mjs';
const HERE=dirname(fileURLToPath(import.meta.url)),ROOT=join(HERE,'../..');
export function buildSelfState(){
 const read=n=>readFileSync(join(HERE,n),'utf8');
 const values={CSS:'/*\n'+readFileSync(join(ROOT,'assets/kit/LICENSE.txt'),'utf8')+'\n*/\n'+readFileSync(join(ROOT,'assets/kit/iso.css'),'utf8')+'\n'+read('style.css'),FALLBACK:'<div class="iso" data-theme="light">'+fixture(25).svg()+'</div>',THREE:'/*\n'+readFileSync(join(ROOT,'assets/vendor/THREE-LICENSE.txt'),'utf8')+'\n*/\n'+readFileSync(join(ROOT,'assets/vendor/three-r160.min.js'),'utf8'),MODEL:read('model.mjs').replace(/^export /gm,''),SCENE:read('scene.js'),APP:read('app.js')};
 const out=read('page.html').replace(/\{\{(CSS|FALLBACK|THREE|MODEL|SCENE|APP)\}\}/g,(_,key)=>values[key].replace(/<\/script/gi,'<\\/script'));
 writeFileSync(join(ROOT,'4-1.html'),out);console.log('built 4-1.html · Self-State 3D Lab · '+out.length+' characters');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)buildSelfState();
