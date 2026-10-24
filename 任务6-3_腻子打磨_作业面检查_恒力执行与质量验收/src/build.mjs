import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {integrateChapter6} from '../../公共资源/装饰装修施工/chapter-layout.mjs';
import * as Model from './model.mjs';
import * as GameModel from './game.model.mjs';

const file = path => fileURLToPath(new URL(path, import.meta.url));
const read = path => readFileSync(file(path), 'utf8');
const audit = process.argv.includes('--audit');
const three = read('../../公共资源/vendor/three-r160.min.js');
const inlineModel = (name, path, exports) => 'const ' + name + '=(()=>{\n'
  + read(path).replace(/^export /gm, '') + '\nreturn {' + Object.keys(exports).join(',') + '};})();';
const sources = [
  ['Mirka｜墙面处理与打磨', 'https://www.mirka.com/en/know-how/applications/wall-preparation/'],
  ['Mirka｜LEROS 打磨机与偏心运动', 'https://www.mirka.com/en/p/Mirka-LEROS-950CV-EU-225---5'],
  ['Mirka｜设备预防性维护', 'https://www.mirka.com/en/support/preventive-maintenance/'],
  ['Mirka｜Abranet Yellow 砂网资料（PDF）', 'https://cdn.brandfolder.io/3TVWCF1X/at/f96pc533jtsb3rx7r4v9xkm/Mirka_Abranet-Yellow_leaflet.pdf'],
  ['Festool｜PLANEX M 墙面打磨与集尘', 'https://www.festool.com/blog/news/planex-m'],
  ['Festool｜打磨知识与表面质量', 'https://www.festool.com/press/special-topics/sanding-knowhow']
];
const values = {
  CSS: read('../../公共资源/anatomy/iso.css') + '\n' + read('./style.css') + '\n' + read('./hero.css'),
  SCENE: '',
  SERVICE: '',
  SOURCES: '<ul>' + sources.map(([title, url]) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></li>`).join('') + '</ul>',
  JS: three + '\n' + inlineModel('M', './model.mjs', Model) + '\n'
    + inlineModel('Game', './game.model.mjs', GameModel)
    + '\n' + read('./robot3d.js') + '\n' + read('./scene3d.js') + '\n' + read('./app.js')
};
const html = read('./page.html').replace(/\{\{(CSS|SCENE|SERVICE|SOURCES|JS)\}\}/g,
  (_, key) => key === 'JS' ? values[key].replace(/<\/script/gi, '<\\/script') : values[key]);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('页面仍有未替换的构建占位符。');
// Change only the initial root/body theme attributes, never selectors in CSS.
const themePage = theme => html.replace(/(<(?:html|body)\b[^>]*\bdata-theme=")[^"]*(")/g, '$1' + theme + '$2');
writeFileSync(file('../index.html'), integrateChapter6(themePage('dark'),'sanding'));
writeFileSync(file('../dark.html'), integrateChapter6(themePage('dark'),'sanding'));
console.log('Built index.html + dark.html · Hero 3D workshop, local Three.js runtime');
if(audit) console.log('Three.js physical mesh scene: use node qa/hero-check.mjs for camera, pose, hose, game and layout checks. The legacy SVG audit does not certify this renderer.');
