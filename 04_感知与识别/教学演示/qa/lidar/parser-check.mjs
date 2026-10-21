import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parsePointFile } from '../../src/lidar/parser.mjs';

const checks=[];let assertions=0;
const equal=(a,b,message)=>{assertions++;assert.deepEqual(a,b,message);};
const ok=(value,message)=>{assertions++;assert.ok(value,message);};
const rejects=(text,pattern=/./,filename='')=>{assertions++;assert.throws(()=>parsePointFile(text,filename),pattern);};
function check(name,run){const before=assertions;run();checks.push({name,status:'passed',assertions:assertions-before});}
const ply=(properties,rows,{count=rows.length,before='',after='',format='ascii 1.0'}={})=>[
  'ply',`format ${format}`,'comment coordinate unit mm is only a comment',before,`element vertex ${count}`,
  ...properties.map(value=>`property ${value}`),after,'end_header',...rows,
].filter(value=>value!=='').join('\n');
const pcd=(fields,rows,{count=rows.length,sizes=fields.map(()=>8),types=fields.map(()=> 'F'),counts=null,extra='',width=count,height=1,data='ascii'}={})=>[
  '# .PCD v0.7','VERSION .7',`FIELDS ${fields.join(' ')}`,`SIZE ${sizes.join(' ')}`,`TYPE ${types.join(' ')}`,
  ...(counts?[`COUNT ${counts.join(' ')}`]:[]),`WIDTH ${width}`,`HEIGHT ${height}`,...(extra?[extra]:[]),`POINTS ${count}`,`DATA ${data}`,...rows,
].join('\n');

check('PLY属性乱序、双精度大坐标、毫米原值和原点号',()=>{
  const text=ply(['double z','uchar blue','double x','uchar red','double y','uchar green','float intensity'],[
    '-4.25 128 1000000000000.125 255 -1000 0 0.375',
    '2 64 1000000000001.125 0 -2000 255 -3.5',
  ]);
  const parsed=parsePointFile('\uFEFF'+text.replace(/\n/g,'\r\n'),'millimetres.ply');
  equal(parsed.format,'ply');equal(parsed.coordinateUnit,'unspecified');equal(parsed.count,2);ok(parsed.hasRGB);
  equal(parsed.points[0],{point:[1000000000000.125,-1000,-4.25],sourceIndex:0,rgb:[255,0,128],intensity:.375});
  equal(parsed.points[1],{point:[1000000000001.125,-2000,2],sourceIndex:1,rgb:[0,255,64],intensity:-3.5});
  equal(parsed.points[1].point[0]-parsed.points[0].point[0],1);
  ok(parsed.points[0].point[0]!==Math.fround(parsed.points[0].point[0]),'不得将原数存入Float32后量测');
});

check('PLY顶点后face和顶点前元素按声明跳过，不会成为云点',()=>{
  const after=ply(['float x','float y','float z'],['-1 2 3','4 5 6','3 0 1 0'],{count:2,after:'element face 1\nproperty list uchar int vertex_indices'});
  const cloud=parsePointFile(after);
  equal(cloud.points.map(p=>p.point),[[-1,2,3],[4,5,6]]);equal(cloud.points.map(p=>p.sourceIndex),[0,1]);equal(cloud.count,2);ok(cloud.warnings.some(w=>w.includes('非vertex')));
  const before=[
    'ply','format ascii 1.0','element face 1','property list uchar int vertex_indices',
    'element vertex 1','property double z','property double x','property double y','end_header','3 0 1 2','30 10 20',
  ].join('\n');
  equal(parsePointFile(before).points[0].point,[10,20,30]);
});

check('PCD COUNT附加向量偏移、字段顺序和双精度原值',()=>{
  const text=pcd(['descriptor','z','x','normal','intensity','y'],[
    '11 12 13 -3 1000000000000.125 .1 .2 7 -2000',
    '21 22 23 -4 1000000000001.125 .3 .4 -9 -3000',
  ],{counts:[3,1,1,2,1,1]});
  const cloud=parsePointFile(text,'cloud.pcd');
  equal(cloud.format,'pcd');equal(cloud.coordinateUnit,'unspecified');equal(cloud.count,2);equal(cloud.hasRGB,false);
  equal(cloud.points[0],{point:[1000000000000.125,-2000,-3],sourceIndex:0,intensity:7});
  equal(cloud.points[1],{point:[1000000000001.125,-3000,-4],sourceIndex:1,intensity:-9});
  const widthOnly=text.replace(/POINTS 2\n/,'');equal(parsePointFile(widthOnly).count,2);
  const pointsOnly=text.replace(/WIDTH 2\nHEIGHT 1\n/,'');equal(parsePointFile(pointsOnly).count,2);
});

check('独立RGB字节及PCD整数/Float32位打包颜色',()=>{
  const separate=pcd(['b','x','g','y','r','z'],['64 1 128 2 255 3'],{sizes:[1,8,1,8,1,8],types:['U','F','U','F','U','F']});
  equal(parsePointFile(separate).points[0].rgb,[255,128,64]);
  const bits=(42<<16)|(123<<8)|231;
  const unsigned=pcd(['x','rgb','y','z'],[`1 ${bits} 2 3`],{sizes:[8,4,8,8],types:['F','U','F','F']});
  equal(parsePointFile(unsigned).points[0].rgb,[42,123,231]);
  // Independent bit reinterpretation via typed arrays (parser uses DataView).
  const floatValue=new Float32Array(new Uint32Array([bits]).buffer)[0];
  const float=pcd(['z','rgb','x','y'],[`3 ${floatValue.toPrecision(9)} 1 2`],{sizes:[8,4,8,8],types:['F','F','F','F']});
  equal(parsePointFile(float).points[0].rgb,[42,123,231]);
  const rgba=(0xff000000|bits)|0;
  const signed=pcd(['x','y','z','rgba'],[`1 2 3 ${rgba}`],{sizes:[8,8,8,4],types:['F','F','F','I']});
  equal(parsePointFile(signed).points[0].rgb,[42,123,231]);
  const incomplete=ply(['float x','float y','float z','uchar red'],['1 2 3 255']);
  const partial=parsePointFile(incomplete);equal(partial.hasRGB,false);equal(partial.points[0].rgb,undefined);ok(partial.warnings.some(w=>w.includes('不完整')));
});

check('VIEWPOINT不默默变换XYZ，注释和扩展名不决定单位',()=>{
  const text=pcd(['x','y','z'],['1000 -2000 3000'],{extra:'VIEWPOINT 10 20 30 0.70710678 0 0 0.70710678'});
  const parsed=parsePointFile(text,'measurement_mm.pcd');
  equal(parsed.points[0].point,[1000,-2000,3000]);equal(parsed.coordinateUnit,'unspecified');
  ok(parsed.warnings.some(w=>w.includes('VIEWPOINT')));
  const before=JSON.stringify(parsed.points);parsed.points[0].point[0]-=1000;
  equal(JSON.stringify(parsePointFile(text).points),before,'一次调用的显示修改不影响再次解析的原数');
});

check('空、二进制、缺XYZ、重复属性、非法数字和空坐标拒绝',()=>{
  const xyz=['float x','float y','float z'];
  for(const value of ['', ' \n\t',null,undefined]) rejects(value,/空/);
  rejects('abc',/格式/);
  rejects(ply(xyz,['1 2 3'],{format:'binary_little_endian 1.0'}),/ASCII|ascii/);
  rejects(pcd(['x','y','z'],['1 2 3'],{data:'binary'}),/ASCII|ascii/);
  rejects(pcd(['x','y','z'],['1 2 3'],{data:'binary_compressed'}),/ASCII|ascii/);
  rejects('ply\n\0binary',/二进制/);
  rejects(ply(['float x','float y'],['1 2']),/Z/);
  rejects(pcd(['x','y'],['1 2']),/Z/);
  rejects(ply(['float x','float y','float z','double X'],['1 2 3 4']),/重复/);
  rejects(pcd(['x','y','z','X'],['1 2 3 4']),/重复/);
  rejects(pcd(['x','y','z'],['1 2 3']).replace('WIDTH 1','WIDTH 1\nWIDTH 1'),/重复/);
  for(const token of ['NaN','nan','Infinity','-inf','1e999','0x10','1,2','undefined']) {
    rejects(ply(xyz,[`${token} 2 3`]),/数字/);
    rejects(pcd(['x','y','z'],[`1 ${token} 3`]),/数字/);
  }
  rejects(ply(xyz,['1   3']),/数字/);
  rejects(pcd(['x','y','z'],['1   3']),/数量/);
  rejects(ply(['float x','float y','float z','float intensity'],['1 2 3 NaN']),/数字/);
  rejects(pcd(['x','y','z','unused'],['1 2 3 NaN']),/数字/);
});

check('声明数量、列表、字段类型和颜色边界严格核对',()=>{
  const xyz=['float x','float y','float z'];
  rejects(ply(xyz,[],{count:0}),/非空/);
  rejects(pcd(['x','y','z'],[],{count:0}),/非空/);
  rejects(ply(xyz,['1 2 3'],{count:2}),/短缺/);
  rejects(pcd(['x','y','z'],['1 2 3'],{count:2}),/短缺/);
  rejects(ply(xyz,['1 2 3','4 5 6'],{count:1}),/额外/);
  rejects(pcd(['x','y','z'],['1 2 3','4 5 6'],{count:1}),/额外/);
  rejects(ply(xyz,[],{count:200001}),/上限/);
  rejects(pcd(['x','y','z'],[],{count:200001}),/上限/);
  rejects(pcd(['x','y','z'],['1 2 3'],{count:1,width:2}),/不一致/);
  rejects(ply([...xyz,'list uchar int neighbors'],['1 2 3 0']),/vertex list/);
  rejects(ply(xyz,['1 2 3'],{after:'element face 1\nproperty list uchar int vertex_indices'}),/短缺/);
  rejects(ply(xyz,['1 2 3','3 0 1'],{count:1,after:'element face 1\nproperty list uchar int vertex_indices'}),/列表长度/);
  rejects(pcd(['x','y','z'],['1 2 3 4'],{counts:[2,1,1]}),/COUNT/);
  rejects(pcd(['x','y','z'],['1 2 3'],{counts:[0,1,1]}),/COUNT/);
  rejects(pcd(['x','y','z'],['1 2 3'],{sizes:[4,4]}),/不一致/);
  rejects(pcd(['x','y','z'],['1 2 3'],{sizes:[3,4,4]}),/类型/);
  rejects(pcd(['x','y','z'],['1 2 3'],{types:['X','F','F']}),/类型/);
  rejects(ply(['__proto__ x','float y','float z'],['1 2 3']),/类型/);
  rejects(ply([...xyz,'uchar red','uchar green','uchar blue'],['1 2 3 256 0 0']),/范围/);
  rejects(ply([...xyz,'float red','float green','float blue'],['1 2 3 .5 0 0']),/颜色范围/);
  rejects(pcd(['x','y','z','rgb'],['1 2 3 1'],{sizes:[8,8,8,8]}),/打包RGB/);
});

check('200000点恰好可读，200001点在分配前拒绝',()=>{
  const rows=Array(200000).fill('1000 -2000 3000');
  const parsed=parsePointFile(ply(['double x','double y','double z'],rows));
  equal(parsed.count,200000);equal(parsed.points[199999].sourceIndex,199999);equal(parsed.points[199999].point,[1000,-2000,3000]);
  const pcdParsed=parsePointFile(pcd(['x','y','z'],rows));equal(pcdParsed.count,200000);equal(pcdParsed.points[199999].point,[1000,-2000,3000]);
  rejects(ply(['double x','double y','double z'],[],{count:200001}),/上限/);
});

const report={status:'passed',generatedAt:new Date().toISOString(),assertions,checks};
await writeFile(fileURLToPath(new URL('./parser-check-results.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
console.log(`LiDAR parser checks passed: ${checks.length} groups, ${assertions} assertions.`);
