import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {integrateChapter6} from '../../../../../../shared/装饰装修施工/chapter-layout.mjs';
import {labShell, hasStations} from '../../../../../../shared/lab-shell/native-layout.mjs';
import * as Manual from './manual-model.mjs';
import * as Robot from './robot-model.mjs';
import * as Issues from './issues-model.mjs';
import * as Mortar from './mortar-model.mjs';
const file=p=>fileURLToPath(new URL(p,import.meta.url));
const read=p=>readFileSync(file(p),'utf8');
const wrap=(name,path,exports)=>`const ${name}=(()=>{\n${read(path).replace(/^export\s+/gm,'')}\nreturn {${Object.keys(exports).join(',')}};})();`;
const kit=read('../../../../../../shared/anatomy/iso-kit.mjs').replace(/^export\s+/gm,'');
const values={CSS:read('../../../../../../shared/anatomy/iso.css')+'\n'+read('./style.css'),SOURCES:read('./sources.html'),JS:'/* Three.js r160, MIT; Anatomy toolkit, MIT. Licenses in 公共资源. */\n'+read('../../../../../../shared/vendor/three-r160.min.js')+'\n'+`const AnatomyKit=(()=>{${kit};return {extrude,fitProjection,boxCorners,slabOf,solidSvg,depthOf,figureSvg,iso,dotsSvg};})();\n`+wrap('ManualModel','./manual-model.mjs',Manual)+'\n'+wrap('RobotModel','./robot-model.mjs',Robot)+'\n'+wrap('IssuesModel','./issues-model.mjs',Issues)+'\n'+wrap('MortarModel','./mortar-model.mjs',Mortar)+'\n'+read('./fallback.js')+'\n'+read('../../../../../../shared/robot-arm/six-axis-arm.js')+'\n'+read('./scene3d.js')+'\n'+read('./arm-robot.js')+'\n'+read('./mortar-scene.js')+'\n'+read('./manual-game.js')+'\n'+read('./mortar-game.js')+'\n'+read('./app.js')};
let html=read('./page.html').replace(/\{\{(CSS|JS|SOURCES)\}\}/g,(_,key)=>key==='JS'?values[key].replace(/<\/script/gi,'<\\/script'):values[key]);
if(process.argv.includes('--dark'))html=html.replaceAll('data-theme="light"','data-theme="dark"');
// 有 stations.js 时用全课程统一的任务页外壳，不再套第六章原来的 1600×900 版式
writeFileSync(file('../index.html'),hasStations('6-1')?labShell(html,'6-1'):integrateChapter6(html,'masonry'));
console.log('Built 任务6-1: masonry game + rotatable 3D workstation + Anatomy SVG fallback');
