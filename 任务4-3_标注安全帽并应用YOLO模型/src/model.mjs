// Shared, dependency-free lesson model. This module is also embedded in each HTML page.
export const CLASS_NAMES = Object.freeze({ 0: '戴安全帽', 1: '未戴安全帽', review: '待复核' });

function dimensions(width, height) {
  if (typeof width !== 'number' || typeof height !== 'number' || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new TypeError('原图宽高必须是大于零的有限数字。');
}
function rectangle(bbox, allowDegenerate = false) {
  if (!Array.isArray(bbox) || bbox.length !== 4 || bbox.some(value => typeof value !== 'number' || !Number.isFinite(value))) throw new TypeError('框坐标必须包含四个有效数字，空值不可代替坐标。');
  if (!allowDegenerate && (bbox[2] <= bbox[0] || bbox[3] <= bbox[1])) throw new RangeError('框的右下角必须在左上角的右下方，宽高必须大于零。');
  return bbox;
}
function knownClass(cls) { return cls === 0 || cls === 1; }
function pendingClass(cls) { return cls === 'review' || cls === null; }

export function clampBox(bbox, width, height) {
  dimensions(width, height);
  rectangle(bbox, true);
  const [ax, ay, bx, by] = bbox;
  return [Math.max(0, Math.min(width, Math.min(ax, bx))), Math.max(0, Math.min(height, Math.min(ay, by))), Math.max(0, Math.min(width, Math.max(ax, bx))), Math.max(0, Math.min(height, Math.max(ay, by)))];
}

export function iou(a, b) {
  // A collapsed drag has no area. Invalid arrays still fail loudly.
  rectangle(a, true); rectangle(b, true);
  const areaA = Math.max(0, a[2] - a[0]) * Math.max(0, a[3] - a[1]);
  const areaB = Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
  const intersection = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const union = areaA + areaB - intersection;
  return union > 0 ? intersection / union : 0;
}

export function normalizeBox(box, width, height) {
  dimensions(width, height);
  if (!box || typeof box !== 'object') throw new TypeError('缺少标注框。');
  rectangle(box.bbox);
  if (box.bbox[0] < 0 || box.bbox[1] < 0 || box.bbox[2] > width || box.bbox[3] > height) throw new RangeError('框坐标超出了原图边界。');
  if (pendingClass(box.cls)) return null;
  if (!knownClass(box.cls)) throw new TypeError('训练类别只能为 0（戴安全帽）或 1（未戴安全帽）。');
  const [x1, y1, x2, y2] = box.bbox;
  const values = [(x1 + x2) / (2 * width), (y1 + y2) / (2 * height), (x2 - x1) / width, (y2 - y1) / height];
  return `${box.cls} ${values.map(value => value.toFixed(6)).join(' ')}`;
}

export function makePredictions(truths) {
  if (!Array.isArray(truths)) throw new TypeError('真值必须是数组。');
  const usable = truths.filter(truth => knownClass(truth.cls));
  const scores = [.91, .42, .83, .35, .61];
  const predictions = usable.slice(0, 5).map((truth, index) => {
    rectangle(truth.bbox);
    const bbox = truth.bbox.map((value, axis) => value + (index === 1 ? axis % 2 ? 4 : 5 : 0));
    return { id: `P${String(index + 1).padStart(2, '0')}`, cls: index === 3 ? 1 - truth.cls : truth.cls, bbox, score: scores[index] };
  });
  predictions.push({ id: 'P06', cls: 0, bbox: [470, 505, 530, 565], score: .28 });
  if (usable.length) {
    const first = usable[0];
    predictions.push({ id: 'P07', cls: first.cls, bbox: [first.bbox[0] + 5, first.bbox[1] + 5, first.bbox[2], first.bbox[3]], score: .31 });
  }
  return predictions;
}

export function matchPredictions(truths, predictions, threshold = .25, iouThreshold = .5) {
  if (!Array.isArray(truths) || !Array.isArray(predictions)) throw new TypeError('真值和预测必须是数组。');
  if (typeof threshold !== 'number' || !Number.isFinite(threshold) || threshold < 0 || threshold > 1 || typeof iouThreshold !== 'number' || !Number.isFinite(iouThreshold) || iouThreshold <= 0 || iouThreshold > 1) throw new RangeError('置信度阈值应在 0–1，IoU 阈值应大于 0 且不超过 1。');
  const eligible = truths.filter(truth => !pendingClass(truth.cls));
  eligible.forEach(truth => { if (!knownClass(truth.cls)) throw new TypeError('真值类别不受支持。'); rectangle(truth.bbox); });
  const sorted = predictions.map((prediction, order) => {
    if (!knownClass(prediction.cls)) throw new TypeError('预测类别不受支持。');
    rectangle(prediction.bbox);
    const score = prediction.score === undefined ? 1 : prediction.score;
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 1) throw new RangeError('置信度必须是 0–1 的数字。');
    return { ...prediction, bbox: [...prediction.bbox], score, _order: order };
  }).filter(prediction => prediction.score >= threshold).sort((a, b) => b.score - a.score || a._order - b._order);
  const used = new Set();
  const results = sorted.map(prediction => {
    const overlaps = eligible.map((truth, index) => ({ truth, index, overlap: iou(truth.bbox, prediction.bbox) })).sort((a, b) => b.overlap - a.overlap || a.index - b.index);
    const matching = overlaps.find(entry => entry.truth.cls === prediction.cls && entry.overlap >= iouThreshold && !used.has(entry.index));
    const { _order, ...clean } = prediction;
    const bestIoU = overlaps[0]?.overlap ?? 0;
    if (matching) {
      used.add(matching.index);
      return { ...clean, status: 'tp', matchedId: matching.truth.id, bestIoU, matchedIoU: matching.overlap, reason: '正确匹配' };
    }
    const repeated = overlaps.some(entry => entry.truth.cls === prediction.cls && entry.overlap >= iouThreshold && used.has(entry.index));
    const wrongClass = overlaps.some(entry => entry.truth.cls !== prediction.cls && entry.overlap >= iouThreshold);
    return { ...clean, status: 'fp', matchedId: null, bestIoU, matchedIoU: null, reason: repeated ? '重复检测' : wrongClass ? '类别错误' : bestIoU > 0 ? '定位偏差' : '背景误检' };
  });
  const missed = eligible.filter((_, index) => !used.has(index)).map(truth => ({ ...truth, bbox: [...truth.bbox] }));
  const tp = used.size, fp = results.length - tp, fn = missed.length;
  return { predictions: results, missed, tp, fp, fn, precision: results.length ? tp / results.length : null, recall: eligible.length ? tp / eligible.length : null };
}

export function annotationIssues(boxes, truths = null) {
  if (!Array.isArray(boxes)) return ['标注数据格式不正确。'];
  if (truths !== null && !Array.isArray(truths)) return ['参考真值格式不正确。'];
  const issues = [], valid = [];
  boxes.forEach((box, index) => {
    const name = box?.id ?? index + 1;
    try {
      rectangle(box?.bbox);
      if (box.bbox[0] < 0 || box.bbox[1] < 0) throw new RangeError('坐标不能小于零。');
      if (pendingClass(box.cls)) issues.push(`框 ${name} 待复核：整张图尚不能作为训练就绪样本。`);
      else if (!knownClass(box.cls)) issues.push(`框 ${name} 的类别无效。`);
      else valid.push(box);
    } catch (error) { issues.push(`框 ${name} 无效：${error.message}`); }
  });
  const duplicates = new Set();
  valid.forEach((box, index) => valid.slice(index + 1).forEach(other => {
    if (iou(box.bbox, other.bbox) >= .85) {
      const key = `${box.id}/${other.id}`;
      if (!duplicates.has(key)) { duplicates.add(key); issues.push(`框 ${box.id} 与 ${other.id} 高度重叠，请检查是否重复标注同一人头。`); }
    }
  }));
  if (truths === null) return issues;
  if (truths.some(truth => pendingClass(truth.cls))) issues.push('原图含无法确认类别的目标：整图待复核；仅删除待复核标签，不能使该图成为训练就绪样本。');
  const known = truths.filter(truth => knownClass(truth.cls));
  const matched = matchPredictions(known, valid, 0, .5);
  matched.predictions.filter(prediction => prediction.status === 'fp').forEach(prediction => issues.push(`框 ${prediction.id}：${prediction.reason}，请按可见头部与安全帽的范围复查。`));
  matched.missed.forEach(truth => issues.push(`参考目标 ${truth.id} 未被正确标注，请检查漏标、类别与框的位置。`));
  return issues;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let remainder = i;
    for (let bit = 0; bit < 8; bit++) remainder = (remainder & 1) ? (0xedb88320 ^ (remainder >>> 1)) : (remainder >>> 1);
    table[i] = remainder >>> 0;
  }
  return table;
})();
function crc32(bytes) {
  let value = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) value = CRC_TABLE[(value ^ bytes[i]) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function zipStore(files) {
  if (!Array.isArray(files) || files.length > 65535) throw new RangeError('ZIP 文件数无效或超过基础 ZIP 格式限制。');
  const encoder = new TextEncoder(), names = new Set();
  let localLength = 0, centralLength = 0;
  const entries = files.map(file => {
    if (typeof file?.name !== 'string' || !file.name || file.name.includes('\0') || file.name.startsWith('/') || file.name.startsWith('\\') || /^[A-Za-z]:/.test(file.name) || file.name.split(/[\\/]/).includes('..') || names.has(file.name)) throw new TypeError('ZIP 文件名必须是唯一且安全的相对路径。');
    names.add(file.name);
    const name = encoder.encode(file.name);
    if (name.length > 65535) throw new RangeError('ZIP 文件名过长。');
    const data = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    if (!(data instanceof Uint8Array)) throw new TypeError('ZIP 内容必须是字符串或 Uint8Array。');
    const entry = { name, data, crc: crc32(data), offset: localLength };
    localLength += 30 + name.length + data.length;
    centralLength += 46 + name.length;
    if (localLength > 0xffffffff || centralLength > 0xffffffff) throw new RangeError('内容超过基础 ZIP 格式限制。');
    return entry;
  });
  const total = localLength + centralLength + 22;
  if (total > 0xffffffff) throw new RangeError('内容超过基础 ZIP 格式限制。');
  const bytes = new Uint8Array(total), view = new DataView(bytes.buffer);
  let offset = 0;
  const u16 = (value) => { view.setUint16(offset, value, true); offset += 2; };
  const u32 = (value) => { view.setUint32(offset, value, true); offset += 4; };
  const put = data => { bytes.set(data, offset); offset += data.length; };
  entries.forEach(entry => {
    u32(0x04034b50); u16(20); u16(0x800); u16(0); u16(0); u16(33);
    u32(entry.crc); u32(entry.data.length); u32(entry.data.length); u16(entry.name.length); u16(0);
    put(entry.name); put(entry.data);
  });
  entries.forEach(entry => {
    u32(0x02014b50); u16(20); u16(20); u16(0x800); u16(0); u16(0); u16(33);
    u32(entry.crc); u32(entry.data.length); u32(entry.data.length); u16(entry.name.length); u16(0); u16(0); u16(0); u16(0); u32(0); u32(entry.offset);
    put(entry.name);
  });
  u32(0x06054b50); u16(0); u16(0); u16(entries.length); u16(entries.length); u32(centralLength); u32(localLength); u16(0);
  return bytes;
}
