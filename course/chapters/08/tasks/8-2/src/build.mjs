// 任务 8-2 保养排查（四个工位）：生成独立页面 index.html，再由 labShell 套上统一任务页外壳。
// 机型复用第二章 2-1：从 2-1/diesel-source/src/engine-lab.js 截取 createMultiEngine（四缸柴油机）与 createExcavator（挖掘机）的源码内联，
// 只在挖掘机代码里加两处钩子（姿态由本页控制、把动臂/斗杆/铲斗交给本页），不修改 2-1 的文件。
import {readFileSync, writeFileSync} from 'node:fs';
import {labShell} from '../../../../../../shared/lab-shell/native-layout.mjs';

const here = p => new URL(p, import.meta.url);
const read = p => readFileSync(here(p), 'utf8');
const safe = code => code.replace(/<\/script/gi, '<\\/script');
const replaceOnce = (src, from, to) => {
  const i = src.indexOf(from);
  if (i < 0 || src.indexOf(from, i + from.length) >= 0) throw new Error('2-1 engine-lab.js 结构已变化，找不到唯一的：' + from.slice(0, 60));
  return src.slice(0, i) + to + src.slice(i + from.length);
};

let lib = read('../../../../02/tasks/2-1/diesel-source/src/engine-lab.js');
lib = lib.slice(0, lib.indexOf('// Local Web Audio synthesis.'));
lib = lib.slice(lib.indexOf('function createMultiEngine'));
lib = replaceOnce(lib,
  'const t=workTime;boom.rotation.z=.84+.12*Math.sin(t*.58);stick.rotation.z=-1.9+.18*Math.sin(t*.58+.75);',
  'const t=workTime,P=root.userData.pose;boom.rotation.z=P?P.boom:.84+.12*Math.sin(t*.58);stick.rotation.z=P?P.stick:-1.9+.18*Math.sin(t*.58+.75);');
lib = replaceOnce(lib, 'const psi=1.02+.33*Math.sin(t*.58+1.65)', 'const psi=P?P.psi:1.02+.33*Math.sin(t*.58+1.65)');
lib = replaceOnce(lib, 'let lastXray=null;', 'globalThis.__excavatorRig={root,boom,stick,bucket,cylinders,BL,SL,pivot};let lastXray=null;');

// 喷涂机器人复用第六章 6-4：从 6-4/src/scene3d.js 截取材质与造型函数、机器人本体（底盘、升降架、喷枪、随车涂料桶、泵与压力表、软管）三段源码，
// 包成 createSprayRobot(T)，只返回模型对象，不带 6-4 的墙面、灯光与渲染循环；不修改 6-4 的文件。
const spraySrc = read('../../../../06/tasks/6-4/src/scene3d.js');
const between = (from, to) => {
  const i = spraySrc.indexOf(from), j = spraySrc.indexOf(to, i + 1);
  if (i < 0 || j < 0 || spraySrc.indexOf(from, i + 1) >= 0) throw new Error('6-4 scene3d.js 结构已变化，找不到：' + from.slice(0, 40));
  return spraySrc.slice(i, j);
};
const sprayLib = `function createSprayRobot(T){const scene=new T.Group();
${between('const materials = {}', 'const hemi =')}
${between('function put(', 'const room = new T.Group()')}
${between("const robot = new T.Group(); robot.name = 'spray-robot'", 'const paintCanvas =')}
return {root:scene,robot,carriage,gun,supply,needle,updateHose,getHose:()=>hose,materials,arm};}
`;

// createMultiEngine 原本给 2-1 的仪表区写字；这些元素在本页不显示，放一份空的接住
const stubIds = ['angleReadout', 'cylinderCards', 'detachPart', 'firingOrder', 'fxBadge', 'fxDetail', 'fxState', 'isolatePart', 'labels', 'multiExplanation',
  'multiSelected', 'partDesc', 'partName', 'partsCount', 'partsList', 'powerCount', 'powerCylinders', 'powerDescription', 'selectionCard', 'timingRows'];
const stubs = `<div id="m82Stubs" hidden aria-hidden="true">${stubIds.map(id => `<div id="${id}"></div>`).join('')}<input id="cycleRange" type="range"><input id="partSearch"><select id="systemFilter"><option value="all">all</option></select></div>`;

const S = '../../../../../shared/';
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark">
<title>8-2 保养排查｜智能建筑机械与机器人</title>
<script data-course-navigation src="${S}navigation.js"></script><link data-course-theme rel="stylesheet" href="${S}styles/theme.css"><script data-course-theme src="${S}theme.js"></script>
</head><body><noscript>此页面需要 JavaScript。请在浏览器中启用脚本后打开。</noscript>
<div class="m82-stage" id="m82Stage" tabindex="0" aria-label="三维场景：拖动旋转，滚轮缩放，点编号检查"></div>
${stubs}
<script src="${S}vendor/three-r160.min.js"></script>
<script src="${S}动力与工作机构/renderer.js"></script>
<script>${safe(lib)}</script>
<script>${safe(sprayLib)}</script>
<script src="src/maint.model.js"></script>
<script src="src/scene-spray.js"></script>
<script src="src/scene-mortar.js"></script>
<script src="src/scene.js"></script>
<script src="src/app.js"></script>
</body></html>
`;
writeFileSync(here('../index.html'), labShell(html, '8-2'));
console.log('Built task 8-2 index.html');
