/**
 * Browser-only, strict ASCII point import. No unit or coordinate-frame guesses.
 * PCD COUNT and packed RGB follow PCL's PCD / PointXYZRGB definitions:
 * https://pointclouds.org/documentation/tutorials/pcd_file_format.html
 * https://pointclouds.org/documentation/structpcl_1_1_point_x_y_z_r_g_b.html
 */
const MAX_POINTS = 200000;
const MAX_FIELDS = 512;
const FLOAT_TOKEN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const INT_TOKEN = /^[+-]?\d+$/;
const PLY_TYPES = {
  char: ['I',1], int8: ['I',1], uchar: ['U',1], uint8: ['U',1],
  short: ['I',2], int16: ['I',2], ushort: ['U',2], uint16: ['U',2],
  int: ['I',4], int32: ['I',4], uint: ['U',4], uint32: ['U',4],
  float: ['F',4], float32: ['F',4], double: ['F',8], float64: ['F',8],
};
const packedView = new DataView(new ArrayBuffer(4));
function plyType(name) { return Object.prototype.hasOwnProperty.call(PLY_TYPES,name) ? PLY_TYPES[name] : null; }
function fail(message) { throw new Error(message); }
function tokens(line) { return line.trim().split(/\s+/); }
function countToken(token, label, maximum = Number.MAX_SAFE_INTEGER) {
  if (!/^\d+$/.test(token ?? '')) fail(`${label}需要非负整数`);
  const count = Number(token);
  if (!Number.isSafeInteger(count) || count > maximum) fail(`${label}超出支持上限${maximum}`);
  return count;
}
function scalar(token, type, size, label) {
  if (typeof token !== 'string' || !FLOAT_TOKEN.test(token)) fail(`${label}不是有效有限数字（不接受空值、NaN或Infinity）`);
  const value = Number(token);
  if (!Number.isFinite(value)) fail(`${label}不是有限数字`);
  if (type !== 'F') {
    if (!INT_TOKEN.test(token) || !Number.isSafeInteger(value)) fail(`${label}需要整数`);
    const bits = size * 8;
    const min = type === 'U' ? 0 : -(2 ** (bits-1));
    const max = type === 'U' ? 2 ** bits - 1 : 2 ** (bits-1) - 1;
    if (value < min || value > max) fail(`${label}超出声明整数类型范围`);
  }
  return value;
}
function schemaColors(fields, format, warnings) {
  const map = new Map(fields.map(field => [field.name,field]));
  const long = ['red','green','blue'].map(name => map.get(name));
  const short = ['r','g','b'].map(name => map.get(name));
  const separate = long.every(Boolean) ? long : short.every(Boolean) ? short : null;
  if (separate) {
    if (separate.some(field => field.count !== 1)) fail('RGB颜色通道的COUNT必须为1');
    return { separate };
  }
  if ([...long,...short].some(Boolean)) warnings.push('颜色属性不完整，未生成RGB颜色。');
  const packed = map.get('rgb') ?? map.get('rgba');
  if (packed && format === 'pcd') {
    if (packed.count !== 1 || packed.size !== 4 || !['F','U','I'].includes(packed.type)) fail('PCD打包RGB仅支持COUNT=1、SIZE=4的F/U/I字段');
    return { packed };
  }
  if (packed) warnings.push('PLY打包RGB属性未解码；支持red/green/blue或r/g/b独立字节通道。');
  return null;
}
function pointFrom(values, fields, sourceIndex, colorSchema) {
  const byName = new Map(fields.map(field => [field.name,field]));
  const read = name => values[byName.get(name).offset];
  const point = { point: [read('x'),read('y'),read('z')],sourceIndex };
  const intensity = byName.get('intensity');
  if (intensity) point.intensity = values[intensity.offset];
  if (colorSchema?.separate) {
    const rgb = colorSchema.separate.map(field => values[field.offset]);
    if (!rgb.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) fail(`第${sourceIndex+1}点的RGB须为0至255整数，本页不猜测浮点颜色范围`);
    point.rgb = rgb;
  } else if (colorSchema?.packed) {
    const field = colorSchema.packed, value = values[field.offset];
    let packed;
    if (field.type === 'F') {
      packedView.setFloat32(0,value,false);
      if (!Number.isFinite(packedView.getFloat32(0,false))) fail(`第${sourceIndex+1}点的打包RGB超出Float32范围`);
      packed = packedView.getUint32(0,false);
    } else packed = value >>> 0;
    point.rgb = [(packed>>>16)&255,(packed>>>8)&255,packed&255];
  }
  return point;
}
function validatePointSchema(fields) {
  const map = new Map(fields.map(field => [field.name,field]));
  for (const name of ['x','y','z']) {
    if (!map.has(name)) fail(`缺少${name.toUpperCase()}坐标字段`);
    if (map.get(name).count !== 1) fail(`${name.toUpperCase()}坐标字段COUNT必须为1`);
  }
  if (map.has('intensity') && map.get('intensity').count !== 1) fail('intensity字段COUNT必须为1');
}
function result(points, format, warnings) {
  if (!points.length) fail('文件没有非空点云');
  return { points,count:points.length,hasRGB:points.every(point => Array.isArray(point.rgb)),format,coordinateUnit:'unspecified',warnings };
}
function nextBodyLine(lines, cursor, allowComment = false) {
  while (cursor.index < lines.length) {
    const line = lines[cursor.index++].trim();
    if (line && !(allowComment && line.startsWith('#'))) return line;
  }
  return null;
}

function parsePLY(lines) {
  const elements = [], warnings = [];
  const elementNames = new Set();
  let current = null, formatSeen = false, bodyStart = -1;
  for (let i=1;i<lines.length;i++) {
    if (i>10000) fail('PLY文件头过长');
    const line=lines[i].trim();
    if (!line) continue;
    const row=tokens(line), command=row[0].toLowerCase();
    if (command==='comment'||command==='obj_info') continue;
    if (command==='format') {
      if(formatSeen) fail('PLY重复声明format');
      if(row.length!==3||row[1]!=='ascii'||row[2]!=='1.0') fail('仅支持PLY format ascii 1.0；请先将binary文件转换为ASCII');
      formatSeen=true;
    } else if(command==='element') {
      if(!formatSeen) fail('PLY缺少ascii格式声明');
      if(row.length!==3) fail('PLY element声明格式错误');
      const name=row[1].toLowerCase();
      if(elementNames.has(name)) fail(`PLY重复元素${name}`);
      elementNames.add(name);
      const count=countToken(row[2],`PLY ${name}数量`,name==='vertex'?MAX_POINTS:Number.MAX_SAFE_INTEGER);
      current={name,count,fields:[],fieldNames:new Set()};elements.push(current);
    } else if(command==='property') {
      if(!current) fail('PLY property没有对应element');
      if(current.fields.length>=MAX_FIELDS) fail('PLY每个元素最多支持512个属性');
      let field;
      if(row[1]==='list') {
        if(row.length!==5||!plyType(row[2])||!plyType(row[3])) fail('PLY list属性类型或格式不支持');
        if(current.name==='vertex') fail('本页不支持vertex list属性，请转换为仅含标量属性的ASCII PLY');
        const [countType,countSize]=plyType(row[2]), [type,size]=plyType(row[3]);
        if(countType==='F') fail('PLY list长度必须使用整数类型');
        field={name:row[4].toLowerCase(),list:true,countType,countSize,type,size};
      } else {
        if(row.length!==3||!plyType(row[1])) fail('PLY标量属性类型或格式不支持');
        const [type,size]=plyType(row[1]);
        field={name:row[2].toLowerCase(),type,size,count:1,offset:current.fields.length};
      }
      if(current.fieldNames.has(field.name)) fail(`PLY重复属性${field.name}`);
      current.fieldNames.add(field.name);current.fields.push(field);
    } else if(command==='end_header') {
      if(row.length!==1) fail('PLY end_header格式错误');
      bodyStart=i+1;break;
    } else fail(`不支持的PLY文件头声明：${row[0]}`);
  }
  if(!formatSeen||bodyStart<0) fail('PLY文件头不完整，缺少format或end_header');
  const vertices=elements.find(element=>element.name==='vertex');
  if(!vertices||vertices.count===0) fail('PLY缺少非空vertex点云');
  validatePointSchema(vertices.fields);
  const colorSchema=schemaColors(vertices.fields,'ply',warnings), points=[],cursor={index:bodyStart};
  for(const element of elements) {
    if(!element.fields.length&&element.count>0) fail(`PLY ${element.name}没有属性定义`);
    for(let ordinal=0;ordinal<element.count;ordinal++) {
      const line=nextBodyLine(lines,cursor);
      if(line===null) fail(`PLY ${element.name}数据数量短缺：声明${element.count}，仅读到${ordinal}`);
      const row=tokens(line), values=[];
      let offset=0;
      for(const field of element.fields) {
        if(field.list) {
          const length=scalar(row[offset++],field.countType,field.countSize,`${element.name}列表长度`);
          if(length<0||length>row.length-offset) fail(`PLY ${element.name}列表长度与数据不符`);
          for(let j=0;j<length;j++) scalar(row[offset++],field.type,field.size,`${element.name}.${field.name}`);
        } else values.push(scalar(row[offset++],field.type,field.size,`${element.name}第${ordinal+1}行.${field.name}`));
      }
      if(offset!==row.length) fail(`PLY ${element.name}第${ordinal+1}行属性数量不符`);
      if(element.name==='vertex') points.push(pointFrom(values,element.fields,ordinal,colorSchema));
    }
  }
  if(nextBodyLine(lines,cursor)!==null) fail('PLY存在未在文件头声明的额外数据');
  if(elements.some(element=>element.name!=='vertex'&&element.count>0)) warnings.push('非vertex元素已按文件头读取并忽略，未作为点云或自动补面。');
  return result(points,'ply',warnings);
}

function parsePCD(lines) {
  const header=new Map(),warnings=[];
  const allowed=new Set(['VERSION','FIELDS','SIZE','TYPE','COUNT','WIDTH','HEIGHT','VIEWPOINT','POINTS','DATA']);
  let bodyStart=-1;
  for(let i=0;i<lines.length;i++) {
    if(i>10000) fail('PCD文件头过长');
    const line=lines[i].split('#')[0].trim();
    if(!line) continue;
    const row=tokens(line), key=row.shift().toUpperCase();
    if(!allowed.has(key)) fail(`不支持的PCD文件头声明：${key}`);
    if(header.has(key)) fail(`PCD重复声明${key}`);
    header.set(key,row);
    if(key==='DATA') {
      if(row.length!==1||row[0]!=='ascii') fail('仅支持PCD DATA ascii；不支持binary或binary_compressed，请先转换');
      bodyStart=i+1;break;
    }
  }
  if(bodyStart<0) fail('PCD缺少DATA ascii声明');
  for(const key of ['FIELDS','SIZE','TYPE']) if(!header.has(key)) fail(`PCD缺少${key}声明`);
  if(header.has('VERSION')&&!['.7','0.7'].includes(header.get('VERSION').join(' '))) fail('本页仅支持PCD 0.7');
  const names=header.get('FIELDS').map(name=>name.toLowerCase());
  if(!names.length||names.length>MAX_FIELDS) fail('PCD属性数量需要在1至512之间');
  if(new Set(names).size!==names.length) fail('PCD存在重复字段属性');
  const sizes=header.get('SIZE'),types=header.get('TYPE'),counts=header.get('COUNT')??names.map(()=> '1');
  if(sizes.length!==names.length||types.length!==names.length||counts.length!==names.length) fail('PCD FIELDS/SIZE/TYPE/COUNT数量不一致');
  const fields=[];let offset=0;
  for(let i=0;i<names.length;i++) {
    const size=countToken(sizes[i],'PCD SIZE',8),type=types[i],count=countToken(counts[i],'PCD COUNT',16384);
    if(!count||!['I','U','F'].includes(type)||(type==='F'?![4,8].includes(size):![1,2,4].includes(size))) fail('PCD属性类型不支持：F仅4/8字节，I/U仅1/2/4字节，COUNT需大于0');
    fields.push({name:names[i],size,type,count,offset});offset+=count;
  }
  if(offset>16384) fail('PCD每点的标量数量超过16384');
  const oneInteger=key=>{
    const row=header.get(key);
    if(!row||row.length!==1) fail(`PCD ${key}需要一个整数`);
    return countToken(row[0],`PCD ${key}`,MAX_POINTS);
  };
  let count=header.has('POINTS')?oneInteger('POINTS'):null;
  if(header.has('WIDTH')||header.has('HEIGHT')) {
    const width=oneInteger('WIDTH'),height=oneInteger('HEIGHT');
    const product=width*height;
    if(!Number.isSafeInteger(product)||product>MAX_POINTS) fail('PCD总点数超过200000');
    if(count!==null&&count!==product) fail('PCD POINTS与WIDTH×HEIGHT不一致');
    count=product;
  }
  if(count===null) fail('PCD需要POINTS或完整WIDTH/HEIGHT声明来核对点数');
  if(!count) fail('PCD没有非空点云');
  if(header.has('VIEWPOINT')) {
    const viewpoint=header.get('VIEWPOINT');
    if(viewpoint.length!==7) fail('PCD VIEWPOINT需要7个有限数值');
    const pose=viewpoint.map(value=>scalar(value,'F',8,'VIEWPOINT'));
    if(pose.some((value,i)=>value!==[0,0,0,1,0,0,0][i])) warnings.push('VIEWPOINT元数据未应用变换；XYZ保持文件原值。');
  }
  validatePointSchema(fields);
  const colorSchema=schemaColors(fields,'pcd',warnings),points=[],cursor={index:bodyStart};
  for(let ordinal=0;ordinal<count;ordinal++) {
    const line=nextBodyLine(lines,cursor,true);
    if(line===null) fail(`PCD点数短缺：声明${count}，仅读到${ordinal}`);
    const row=tokens(line);
    if(row.length!==offset) fail(`PCD第${ordinal+1}点字段数量不符：需要${offset}个标量`);
    const values=new Array(offset);
    for(const field of fields) for(let j=0;j<field.count;j++) values[field.offset+j]=scalar(row[field.offset+j],field.type,field.size,`第${ordinal+1}点.${field.name}`);
    points.push(pointFrom(values,fields,ordinal,colorSchema));
  }
  if(nextBodyLine(lines,cursor,true)!==null) fail('PCD存在超出声明点数的额外数据');
  return result(points,'pcd',warnings);
}

export function parsePointFile(text, filename='') {
  if(typeof text!=='string'||!text.trim()) fail('点云文件为空');
  if(text.includes('\0')) fail('检测到二进制内容；仅支持ASCII PLY/PCD');
  const lines=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trimStart().split('\n');
  if(lines[0].trim()==='ply') return parsePLY(lines);
  if(/\.ply$/i.test(filename)) fail('PLY文件缺少首行ply标识');
  if(/\.pcd$/i.test(filename)||lines.slice(0,100).some(line=>/^\s*FIELDS\s+/i.test(line))) return parsePCD(lines);
  fail('无法识别点云格式；请上传ASCII PLY或PCD');
}
