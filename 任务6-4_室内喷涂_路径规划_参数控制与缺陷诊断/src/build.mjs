import {readFileSync, writeFileSync} from 'node:fs';
import {integrateChapter6} from '../../公共资源/装饰装修施工/chapter-layout.mjs';
import * as M from './model.mjs';
import * as PM from './project-model.mjs';

const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const moduleBody = name => read(name).replace(/^import[^\n]+\n/gm, '').replace(/^export /gm, '');
const model = `const M = (() => {${moduleBody('./model.mjs')}\nreturn {${Object.keys(M).join(',')}};})(); window.M=M;`;
const project = `const PM = (() => {${moduleBody('./project-model.mjs')}\nreturn {${Object.keys(PM).join(',')}};})();`;
const js = [read('../../公共资源/vendor/three-r160.min.js'), model, project, read('./scene3d.js'), read('./app.js')].join('\n;\n');
const html = read('./page.html').replace('{{CSS}}', () => read('./style.css')).replace('{{JS}}', () => js.replace(/<\/script/gi, '<\\/script'));
writeFileSync(new URL('../index.html',import.meta.url),integrateChapter6(html,'spray'));
writeFileSync(new URL('../dark.html',import.meta.url),integrateChapter6(html,'spray'));
console.log('Built immersive spray project: real WebGL 3D, cumulative coating, offline light + dark.');
if(process.argv.includes('--audit')) console.log('This renderer uses Three.js meshes. Run qa/project-model.test.mjs and the browser checks; SVG anatomy audits do not apply.');
