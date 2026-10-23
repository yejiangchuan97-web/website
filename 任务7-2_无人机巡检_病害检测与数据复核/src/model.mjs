/**
 * Task 7-2 classroom model. All cases and detector outputs are authored examples.
 * This model describes image evidence, never structural condition or flight clearance.
 * World units: metres; X across facade, Y outward, Z up.
 */
export const CAMERA = Object.freeze({
  sensorWidth: 13.2,
  focal: 8.8,
  imageWidth: 5472,
  imageHeight: 3648,
  description: '教学假设相机：13.2 mm 感光面宽、8.8 mm 焦距、5472 × 3648 像素',
});

export const CLASSROOM_LIMITS = Object.freeze({
  maxGsd: 2.5,
  maxBlurPx: 1.5,
  maxAngle: 25,
  minReasonLength: 6,
  minWidthPx: 3,
  description: '本课图像质检练习阈值，不是工程验收标准或飞行安全距离。',
});

export const CELLS = Object.freeze([
  {id:'A1',x:3.4,z:6.4,label:'上层左区',kind:'crack',aiLabel:'疑似裂缝',aiScore:0.88,truth:'crack',correctDecision:'retain',reason:'表面存在不规则连续细线，保留为疑似裂缝；航拍不能据此确认深度或结构等级。'},
  {id:'A2',x:0,z:6.4,label:'上层中区',kind:'damp',aiLabel:'疑似渗水',aiScore:0.81,truth:'damp',correctDecision:'retain',reason:'窗下存在向下扩展的色斑，保留为疑似水迹；仍需近距观察和相关记录确认成因。'},
  {id:'A3',x:-3.4,z:6.4,label:'上层右区',kind:'joint',aiLabel:'疑似裂缝',aiScore:0.94,truth:'joint',correctDecision:'exclude',reason:'线条笔直、宽度较均匀，并与分格构造对应；本例对照记录确认它是施工分缝。'},
  {id:'B1',x:3.4,z:3.1,label:'下层左区',kind:'shadow',aiLabel:'疑似裂缝',aiScore:0.76,truth:'shadow',correctDecision:'exclude',reason:'暗线与突出构件的投影对应，补拍对照中随照明改变；本例是阴影，不是实体裂缝。'},
  {id:'B2',x:0,z:3.1,label:'下层中区',kind:'spall',aiLabel:'疑似剥落',aiScore:0.91,truth:'spall',correctDecision:'retain',reason:'表面局部缺损且边缘不规则，保留为疑似剥落；尺寸、深度和处置意见须另行复核。'},
  {id:'B3',x:-3.4,z:3.1,label:'下层右区',kind:'missed',aiLabel:null,aiScore:null,truth:'crack',correctDecision:'retain',reason:'原图中仍可见不规则细线，但预设候选未给出提示；人工补记疑点并安排近距复核。'},
].map(cell => Object.freeze({...cell,y:0})));

const cellById = id => CELLS.find(cell => cell.id === id);
const finite = (value, name) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new RangeError(`${name} 必须为有限数值`);
  return n;
};
const normalizedParams = (params = {}) => {
  const result = {
    distance: finite(params.distance ?? 6, '拍摄距离'),
    angle: finite(params.angle ?? 0, '偏拍角度'),
    speed: finite(params.speed ?? 1, '移动速度'),
    shutter: finite(params.shutter ?? 500, '快门分母'),
  };
  if (result.distance <= 0 || result.speed < 0 || result.shutter <= 0 || result.angle < 0 || result.angle >= 80) {
    throw new RangeError('距离和快门分母须为正数，速度非负，偏拍角度须在 0° 至 80° 以内');
  }
  return result;
};

/**
 * Local tangent-plane pinhole approximation at the selected patch centre.
 * distance is optical/slant distance to that centre, not normal wall clearance.
 * Worst-axis sampling is baseGsd / cos(angle). Full-image footprint is an
 * approximation, not a surveyed coverage polygon or a photogrammetric guarantee.
 * Blur uses the finer axis to avoid understating image motion at oblique views.
 */
export function computeCapture(params = {}) {
  const p = normalizedParams(params);
  const obliquity = Math.cos(p.angle * Math.PI / 180);
  const baseGsd = p.distance * 1000 * CAMERA.sensorWidth / (CAMERA.focal * CAMERA.imageWidth);
  const gsd = baseGsd / obliquity;
  const blurPx = p.speed * 1000 / p.shutter / baseGsd;
  const issues = [];
  const issueCodes = [];
  if (gsd > CLASSROOM_LIMITS.maxGsd + 1e-10) {
    issueCodes.push('detail');
    issues.push('细节采样偏粗：减小拍摄距离后重新比较；现场距离仍须服从实际作业条件。');
  }
  if (blurPx > CLASSROOM_LIMITS.maxBlurPx + 1e-10) {
    issueCodes.push('motion');
    issues.push('移动拖影偏大：降低移动速度或使用更快快门；靠近后也要同步检查拖影。');
  }
  if (p.angle > CLASSROOM_LIMITS.maxAngle + 1e-10) {
    issueCodes.push('angle');
    issues.push('偏拍过大：形变和遮挡风险增加，调整到接近正视后补拍。');
  }
  return {
    gsd, baseGsd, blurPx, obliquity,
    normalDistance: p.distance * obliquity,
    footprintW: gsd * CAMERA.imageWidth / 1000,
    footprintH: baseGsd * CAMERA.imageHeight / 1000,
    quality: issues.length ? 'poor' : 'good',
    issues, issueCodes,
    summary: issues.length ? '证据不足，建议调整后补拍' : '达到本课外观筛查条件',
    scope: '中心附近的简化成像估计；未模拟曝光、对焦、风扰、镜头畸变和真实遮挡。',
  };
}

export function makeCapture(cellId, params = {}, sequence = 1) {
  if (!cellById(cellId)) throw new RangeError(`未知巡检分区：${cellId}`);
  if (!Number.isInteger(sequence) || sequence < 1) throw new RangeError('照片序号须为正整数');
  const normalized = normalizedParams(params);
  return {
    id: `IMG-${String(sequence).padStart(3,'0')}`,
    cellId, sequence,
    params: normalized,
    metrics: computeCapture(normalized),
    source: 'synthetic-classroom',
  };
}

/** Append without changing previous records. Caller may pass a timestamp explicitly. */
export function captureCell(previousRecords = [], cellId, params = {}, options = {}) {
  const sequence = options.sequence ?? previousRecords.reduce((max, photo) => Math.max(max, Number(photo.sequence) || 0), 0) + 1;
  const photo = makeCapture(cellId, params, sequence);
  if (previousRecords.some(previous => previous.id === photo.id)) throw new RangeError('照片编号不能重复');
  if (options.now !== undefined) photo.capturedAt = new Date(options.now).toISOString();
  return [...previousRecords, photo];
}

/** Reason validity and photo/version linkage are checked by evaluateMission. */
export function assessDecision(cellId, decision, photoQuality, manualMarked = false) {
  const cell = cellById(cellId);
  if (!cell) return {correct:false,feedback:'请选择有效巡检分区。',needsRecapture:false};
  const quality = typeof photoQuality === 'object' ? photoQuality?.quality : photoQuality;
  if (!quality) return {correct:false,feedback:'先采集原图，再提交复核判断。',needsRecapture:false};
  if (!['retain','exclude','recapture'].includes(decision)) return {correct:false,feedback:'请选择保留、排除或补拍。',needsRecapture:false};
  if (quality !== 'good') {
    return {
      correct: decision === 'recapture',
      feedback: decision === 'recapture' ? '补拍判断合理。调整成像条件并取得合格新图后，再完成分类复核。' : '当前图像未通过本课质检，应先补拍；模糊或粗糙图像不能支撑排除。',
      needsRecapture: true,
    };
  }
  if (decision === 'recapture') return {correct:false,feedback:'本例已具备外观筛查证据；请结合原图和对照记录形成分类判断。实际作业仍可补充拍摄。',needsRecapture:true};
  if (cell.id === 'B3' && !manualMarked) return {correct:false,feedback:'本区没有预设候选框。请先在原图中补记疑点，避免只检查系统给出的候选。',needsRecapture:false};
  const correct = decision === cell.correctDecision;
  return {correct,feedback:correct ? cell.reason : `请再对照原图与构造记录。${cell.reason}`,needsRecapture:false};
}

/**
 * Checks an annotation against the deliberately authored B3 illustration only.
 * Coordinates are pixels in the synthetic 600 x 360 review image. This is not
 * image recognition, segmentation, or a validation rule for real photographs.
 */
export function assessManualAnnotation(cellId, params, point) {
  if (!cellById(cellId)) return {valid:false,feedback:'请选择有效巡检分区。',distancePx:null};
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 600 || point.y < 0 || point.y > 360) {
    return {valid:false,feedback:'请在原图范围内点选疑点位置。',distancePx:null};
  }
  if (cellId !== 'B3') return {valid:true,feedback:'已记录图中位置，请在复核依据中说明所见线索。',distancePx:null};
  let p;
  try { p = normalizedParams(params); }
  catch { return {valid:false,feedback:'照片参数无效，请重新采集后标记。',distancePx:null}; }
  const factor = Math.min(1.75, 6 / p.distance);
  const cosine = Math.cos(p.angle * Math.PI / 180);
  const line = [[268,77],[280,107],[272,135],[296,162],[290,186],[312,210],[307,237],[325,275],[319,308]].map(([x,y]) => [300 + (x-300)*factor*cosine, 180 + (y-180)*factor + (x-300)*p.angle/600]);
  let distancePx = Infinity;
  for (let i=1; i<line.length; i++) {
    const [ax,ay] = line[i-1], [bx,by] = line[i];
    const dx = bx-ax, dy = by-ay;
    const t = Math.max(0, Math.min(1, ((point.x-ax)*dx+(point.y-ay)*dy)/(dx*dx+dy*dy)));
    distancePx = Math.min(distancePx, Math.hypot(point.x-ax-t*dx, point.y-ay-t*dy));
  }
  const valid = distancePx <= 18;
  return {
    valid, distancePx,
    feedback: valid ? '已在本例未标出的不规则细线附近补记疑点。' : '标记偏离本例的疑似裂缝，请查看墙面的不规则细线并重新落点。',
  };
}

export function evaluateMission({captures = [], reviews = {}, manualMarks = []} = {}) {
  const marked = id => Array.isArray(manualMarks) ? manualMarks.includes(id) : Boolean(manualMarks?.[id]);
  const results = CELLS.map(cell => {
    const photos = captures.filter(photo => photo.cellId === cell.id);
    const latest = photos.at(-1);
    const review = reviews[cell.id];
    const reasonValid = typeof review?.reason === 'string' && review.reason.trim().length >= CLASSROOM_LIMITS.minReasonLength;
    const photoLinked = Boolean(latest && review?.photoId === latest.id);
    const decision = assessDecision(cell.id, review?.decision, latest?.metrics?.quality, marked(cell.id));
    const annotation = cell.id === 'B3' ? assessManualAnnotation(cell.id, latest?.params, review?.manualAnnotation) : {valid:true,distancePx:null};
    const quality = latest?.metrics?.quality === 'good';
    const reviewed = Boolean(review && photoLinked && reasonValid);
    const correct = reviewed && quality && decision.correct && !decision.needsRecapture && annotation.valid;
    return {cellId:cell.id,latestPhotoId:latest?.id ?? null,captured:Boolean(latest),quality,reviewed,correct,photoLinked,reasonValid,annotationValid:annotation.valid,annotationDistancePx:annotation.distancePx,feedback:!latest ? '尚未采集' : review && !photoLinked ? '新照片尚未复核，请重新提交判断' : review && !reasonValid ? '请写出至少 6 个字的观察依据' : cell.id === 'B3' && marked(cell.id) && quality && !annotation.valid ? annotation.feedback : decision.feedback};
  });
  const capturedCount = results.filter(r => r.captured).length;
  const qualityCount = results.filter(r => r.quality).length;
  const reviewedCount = results.filter(r => r.reviewed).length;
  const correctCount = results.filter(r => r.correct).length;
  const missedFound = Boolean(marked('B3') && results.find(r => r.cellId === 'B3').correct);
  const complete = correctCount === CELLS.length && missedFound;
  const score = Math.round(capturedCount / 6 * 20 + qualityCount / 6 * 25 + correctCount / 6 * 45 + (missedFound ? 10 : 0));
  const remaining = results.filter(r => !r.correct).map(r => r.cellId);
  let nextAction;
  if (capturedCount < 6) nextAction = `先补齐 ${6-capturedCount} 个未采集分区，检查完整立面。`;
  else if (qualityCount < 6) nextAction = `有 ${6-qualityCount} 个分区的最新照片未通过本课质检，调整参数并补拍。`;
  else if (!marked('B3')) nextAction = '逐区查看没有候选框的原图，补记被漏掉的疑点。';
  else if (correctCount < 6) nextAction = `复核 ${remaining.join('、')}，把依据关联到最新照片。`;
  else nextAction = '本轮复核完成，可以导出含原始参数、照片版本和复核依据的记录。';
  return {capturedCount,qualityCount,reviewedCount,correctCount,missedFound,complete,score,nextAction,remaining,results};
}

/** Only a sharp, coplanar reference image supports this classroom pixel exercise. */
export function assessMeasurement({referenceMm,referencePx,widthPx,samePlane = false,sharp = false} = {}) {
  const mm = Number(referenceMm), ref = Number(referencePx), width = Number(widthPx);
  const invalid = !Number.isFinite(mm) || !Number.isFinite(ref) || !Number.isFinite(width) || mm <= 0 || ref <= 0 || width <= 0;
  if (invalid) return {valid:false,value:null,unit:'mm',feedback:'标定长度、标定像素和断面像素必须为有效正数。'};
  if (!samePlane) return {valid:false,value:null,unit:'mm',feedback:'标尺和目标不共面，不能直接用该比例换算。'};
  if (!sharp) return {valid:false,value:null,unit:'mm',feedback:'边界不清晰，先获得清晰的近距图像。'};
  if (width < CLASSROOM_LIMITS.minWidthPx) return {valid:false,value:null,unit:'mm',feedback:'目标不足 3 像素，本课不输出宽度读数；放大显示不会增加原始细节。'};
  return {valid:true,value:mm/ref*width,unit:'mm',feedback:'这是同平面、清晰图像的比例换算练习值，仍受标定和选点误差影响。',mmPerPixel:mm/ref};
}
