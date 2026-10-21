import {fileURLToPath as __taskFileURL} from 'node:url';
const __taskFile=p=>__taskFileURL(new URL(p,import.meta.url));
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const root=__taskFile("../../公共资源/感知与识别");
const asset=__taskFile("../assets/lidar");
const source=__taskFile("./source");
const commit='084fa0e260580cc765ded83de4ec3f495f1d6f1e';
const sourceURL=`https://raw.githubusercontent.com/PointCloudLibrary/data/${commit}/tutorials/table_scene_lms400.pcd`;
const licenseURL='https://raw.githubusercontent.com/PointCloudLibrary/data/master/LICENSE';
const tutorialURL='https://pointclouds.org/documentation/tutorials/statistical_outlier.html';
await mkdir(asset,{recursive:true});
await mkdir(source,{recursive:true});

async function obtain(url,path){
  try {return await readFile(path);} catch(e) {if(e.code!=='ENOENT')throw e;}
  const res=await fetch(url);
  if(!res.ok)throw Error(`Download failed: ${res.status} ${url}`);
  const bytes=Buffer.from(await res.arrayBuffer());
  await writeFile(path,bytes);
  return bytes;
}

export function decodeLZF(input,outputLength){
  const output=new Uint8Array(outputLength);
  let ip=0,op=0;
  while(ip<input.length){
    const ctrl=input[ip++];
    if(ctrl<32){
      const len=ctrl+1;
      if(ip+len>input.length||op+len>output.length)throw Error('Invalid LZF literal bounds');
      output.set(input.subarray(ip,ip+len),op);ip+=len;op+=len;
    }else{
      let len=ctrl>>5;
      let ref=op-((ctrl&31)<<8)-1;
      if(len===7){if(ip>=input.length)throw Error('Truncated LZF length');len+=input[ip++];}
      if(ip>=input.length)throw Error('Truncated LZF reference');
      ref-=input[ip++];len+=2;
      if(ref<0||op+len>output.length)throw Error('Invalid LZF back-reference');
      for(let k=0;k<len;k++)output[op++]=output[ref++];
    }
  }
  if(op!==outputLength)throw Error(`LZF length ${op} differs from expected ${outputLength}`);
  return output;
}

const original=await obtain(sourceURL,__taskFile("./source/table_scene_lms400.pcd"));
const license=await obtain(licenseURL,__taskFile("../assets/lidar/PCL-DATA-LICENSE.txt"));
const sha256=createHash('sha256').update(original).digest('hex');
const blob=createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
if(blob!=='5631e4b0d659bfea286819b97fdec93f6de88600')throw Error('Original PCL file Git blob does not match independently checked version');
const marker=Buffer.from('DATA binary_compressed\n');
const markerIndex=original.indexOf(marker);
if(markerIndex<0)throw Error('Expected PCD binary_compressed header');
const start=markerIndex+marker.length;
const header=original.subarray(0,start).toString('utf8');
const fieldMatch=header.match(/^FIELDS (.+)$/m);
const fields=fieldMatch[1].trim().split(/\s+/);
const originalCount=Number(header.match(/^POINTS (\d+)/m)[1]);
const sizes=header.match(/^SIZE (.+)$/m)[1].trim().split(/\s+/).map(Number);
const types=header.match(/^TYPE (.+)$/m)[1].trim().split(/\s+/);
const counts=header.match(/^COUNT (.+)$/m)[1].trim().split(/\s+/).map(Number);
if(fields.join(' ')!=='x y z intensity distance sid'||sizes.some(v=>v!==4)||types.some(v=>v!=='F')||counts.some(v=>v!==1))throw Error('Unexpected PCD field layout');
const compressedSize=original.readUInt32LE(start);
const uncompressedSize=original.readUInt32LE(start+4);
const payloadEnd=start+8+compressedSize;
if(payloadEnd>original.length)throw Error('Truncated compressed data');
const trailingPadding=original.subarray(payloadEnd);
if(trailingPadding.some(v=>v!==0))throw Error('Unexpected nonzero trailing data');
if(uncompressedSize!==originalCount*fields.length*4)throw Error('Unexpected decompressed PCD size');
const uncompressed=decodeLZF(original.subarray(start+8,payloadEnd),uncompressedSize);
const raw=new DataView(uncompressed.buffer,uncompressed.byteOffset,uncompressed.byteLength);
const at=(index,field)=>raw.getFloat32((fields.indexOf(field)*originalCount+index)*4,true);
const bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};
let validCount=0;
for(let i=0;i<originalCount;i++){
  const p=[at(i,'x'),at(i,'y'),at(i,'z')];
  if(!p.every(Number.isFinite))continue;
  validCount++;
  p.forEach((v,k)=>{bounds.min[k]=Math.min(bounds.min[k],v);bounds.max[k]=Math.max(bounds.max[k],v);});
}
const stride=Math.max(1,Math.round(validCount/12000));
const points=[];
let validOrdinal=0;
for(let i=0;i<originalCount;i++){
  const p=[at(i,'x'),at(i,'y'),at(i,'z')];
  if(!p.every(Number.isFinite))continue;
  if(validOrdinal++%stride!==0)continue;
  const intensity=at(i,'intensity');
  points.push({point:p,sourceIndex:i,...(Number.isFinite(intensity)?{intensity}:{})});
}
const sample={
  title:'PCL 公开点云示例 · table_scene_lms400',
  sourceURL,licenseURL,tutorialURL,sha256,
  originalFile:'table_scene_lms400.pcd',originalBytes:original.length,
  sourceGitBlob:blob,sourceCommit:commit,
  originalCount,originalFiniteCount:validCount,retainedCount:points.length,
  selectionMethod:`原始索引顺序逐行检查有限 XYZ，保留第 0、${stride}、${2*stride}… 个有效点；固定步长 ${stride}；sourceIndex 为原文件零基索引；不补点、不平滑、不重建。`,
  coordinateUnit:'unspecified',hasRGB:false,
  sourceFields:fields,retainedFields:['x','y','z','intensity','sourceIndex'],
  omittedFields:['distance','sid'],
  coordinateTransform:'无；point 保存原始 float32 坐标值转换为可精确表示的 JavaScript Number。显示居中/缩放应由渲染器独立应用，不覆盖本文件。',
  captureMetadata:'官方教程/文件头未提供完整采集履历、坐标单位、姿态标定；不据文件名推定全部采集信息。',
  colorMeaning:'文件无 RGB；intensity 为原文件附加字段，未提供可跨设备比较的标定含义。高度或来源色属于后续显示映射。',
  bounds,
  points
};
await writeFile(__taskFile("../assets/lidar/sample.json"),JSON.stringify(sample));
await writeFile(__taskFile("./source/metadata.json"),JSON.stringify({...sample,points:undefined,
  originalHeader:header,compressedSize,uncompressedSize,trailingZeroPaddingBytes:trailingPadding.length,
  licenseSha256:createHash('sha256').update(license).digest('hex'),retrievedOn:'2026-10-16'
},null,2));
await writeFile(__taskFile("./source/README.md"),`# PCL 公开点云示例溯源\n\n- 原文件：[固定版本](${sourceURL})\n- 官方教程：[StatisticalOutlierRemoval](${tutorialURL})\n- 数据仓库许可证：[BSD-3-Clause](${licenseURL})；完整文本随 assets/lidar/PCL-DATA-LICENSE.txt 分发。\n- SHA256：\`${sha256}\`\n- 原文件 Git blob：\`${blob}\`\n- 原文件 ${original.length} bytes、${originalCount} 点；有限 XYZ ${validCount} 点；保留 ${points.length} 点。\n- ${sample.selectionMethod}\n- 单位未在源文件声明；未确认单位前只作形状识读，不提供米制净宽结论。\n- 未改变原始 XYZ，未补点。二进制压缩数据的 LZF 解压脚本保存在 qa/lidar/prepare-pcl-sample.mjs，可重复生成静态资产。\n`);
console.log(JSON.stringify({originalBytes:original.length,originalCount,validCount,stride,retainedCount:points.length,sha256,bounds,samplePath:__taskFile("../assets/lidar/sample.json")},null,2));
