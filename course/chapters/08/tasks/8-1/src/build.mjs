// 任务 8-1 安全操作：独立三维页面。page.html + model/scene/app 内联生成 index.html，再套统一任务页外壳（stations.js）。
// 挖掘机复用第二章 2-1：从 2-1/diesel-source/src/engine-lab.js 截取 createExhaustSmoke 与 createExcavator 的源码内联（与 8-2 同一机型），
// 构建时加三处钩子：回转平台以上的零件归入 upper 组以便回转、对外交出 {root, upper}、去掉车身上的型号字样。不修改 2-1 的文件。
import {readFileSync, writeFileSync} from 'node:fs';
import {labShell} from '../../../../../../shared/lab-shell/native-layout.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const safe = s => s.replace(/<\/script/gi, '<\\/script');
const replaceOnce = (src, from, to) => {
  const i = src.indexOf(from);
  if (i < 0 || src.indexOf(from, i + from.length) >= 0) throw new Error('2-1 engine-lab.js 结构已变化，找不到唯一的：' + from.slice(0, 60));
  return src.slice(0, i) + to + src.slice(i + from.length);
};

let lib = read('../../../../02/tasks/2-1/diesel-source/src/engine-lab.js');
lib = lib.slice(lib.indexOf('function createExhaustSmoke'), lib.indexOf('// Local Web Audio synthesis.'));
lib = replaceOnce(lib, 'const root=new THREE.Group();scene.add(root);root.visible=false;', 'const root=new THREE.Group();scene.add(root);root.visible=false;let upper=null;');
// 液压缸端点换算到回转平台坐标系（未拆分前 upper 为空，仍用 root）
lib = replaceOnce(lib, 'function locate(node,x,y,z){return root.worldToLocal(', 'function locate(node,x,y,z){return (upper||root).worldToLocal(');
// 合并网格之前：回转支承以上的零件归入 upper 组，回转中心就是原点
lib = replaceOnce(lib, ' // Merge fixed meshes by material;',
  ' upper=new THREE.Group();upper.name="upper";root.add(upper);root.updateMatrixWorld(true);' +
  // 批量实例（螺栓等）可能上下车都有：按每个实例的高度拆成两份
  'const M4=new THREE.Matrix4(),P3=new THREE.Vector3(),cut=-.1;' +
  'for(const o of [...root.children]){if(o===upper)continue;' +
  'if(o.isInstancedMesh){const hi=[],lo=[];for(let i=0;i<o.count;i++){o.getMatrixAt(i,M4);P3.setFromMatrixPosition(M4).applyMatrix4(o.matrix);(P3.y>cut?hi:lo).push(i);}' +
  'if(!lo.length){upper.add(o);continue;}if(!hi.length)continue;' +
  'const up=new THREE.InstancedMesh(o.geometry,o.material,hi.length);up.position.copy(o.position);up.quaternion.copy(o.quaternion);up.scale.copy(o.scale);up.castShadow=o.castShadow;up.receiveShadow=o.receiveShadow;' +
  'const C=new THREE.Color();hi.forEach((j,k)=>{o.getMatrixAt(j,M4);up.setMatrixAt(k,M4);if(o.instanceColor){o.getColorAt(j,C);up.setColorAt(k,C);}});' +
  'lo.forEach((j,k)=>{o.getMatrixAt(j,M4);o.setMatrixAt(k,M4);if(o.instanceColor){o.getColorAt(j,C);o.setColorAt(k,C);}});o.count=lo.length;o.instanceMatrix.needsUpdate=true;if(o.instanceColor)o.instanceColor.needsUpdate=true;o.computeBoundingSphere?.();upper.add(up);continue;}' +
  'const bb=new THREE.Box3().setFromObject(o);if(!bb.isEmpty()&&(bb.min.y+bb.max.y)/2>cut)upper.add(o);}\n // Merge fixed meshes by material;');
lib = replaceOnce(lib, 'let lastXray=null;', 'globalThis.__excavatorRig={root,upper};let lastXray=null;');
// 页面上不出现型号字样
for (const name of ['DIESEL LAB', 'DX 35']) lib = lib.replace(new RegExp(`decal\\(root,'${name}'[^;]*;`, 'g'), '');
if (/DX 35|DIESEL LAB/.test(lib)) throw new Error('挖掘机源码里仍有型号字样');

const values = {CSS: read('./style.css'), EXCAVATOR: safe(lib), MODEL: safe(read('./model.js')), SCENE: safe(read('./scene.js')), APP: safe(read('./app.js'))};
let html = read('./page.html').replace(/\{\{(CSS|EXCAVATOR|MODEL|SCENE|APP)\}\}/g, (_, k) => values[k]);
html = labShell(html, '8-1');
writeFileSync(new URL('../index.html', import.meta.url), html);
console.log('Built task 8-1 index.html', Math.round(Buffer.byteLength(html) / 1024) + ' KB');
