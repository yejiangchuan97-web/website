// Teaching geometry only. World coordinates are metres and Z is up.
// Millimetre inputs are converted here so scene and readouts share one model.
export const REBAR_MODEL = {
  units: { world: 'm', input: 'mm', up: 'Z', mmToM: 0.001 },
  site: [-10, -6.5, 10, 6.5],
  processing: [-9, -4.8, -2.7, 4.8],
  machineCenters: { straighten: [-6.3, 3], cut: [-6.3, 0], bend: [-6.3, -3] },
  slab: { minX: -1.8, maxX: 9.2, minY: -4.8, maxY: 4.8, top: 0.6, meaning: '底模样板顶面，非已浇筑混凝土顶面' },
  formworkTop: 0.6,
  opening: [5, 1.2, 7, 3.4],
  column: [1.3, 1.2, 2.3, 2.2],
  material: [6.8, -4.1, 8.8, -2.7],
  route: [-10, 5.2, 10, 6.2],
  platform: [0, -6, 4, -5],
  base: [1.8, -5.4],
  reach: 6,
  toolRadius: 0.12,
  openingBuffer: 0.35,
  denseBuffer: 0.65,
  barDiameterMM: 16,
  spacingMM: 400,
  coverMM: 42,
  lowerBarZ: 0.65,
  upperBarZ: 0.666,
  targetZ: 0.674,
  grid: { minX: -0.9, maxX: 8.5, minY: -4.1, maxY: 4.3 },
  limitations: '区域、半径与净距均为教学设定。简化几何不验证真实设备承载、稳定性、连续路径或施工安全，不能作为施工验收依据。',
  focus: {
    overview: { target: [0, 0, 0.4], position: [17, -22, 20] },
    processing: { target: [-6.3, 0, 0.9], position: [1, -10, 8] },
    floor: { target: [3.7, 0, 0.7], position: [15, -15, 15] },
    top: { target: [3.7, 0, 0.6], position: [3.7, -0.01, 21] },
    section: { target: [3.6, -1.4, 0.63], position: [11, -10, 3.8] }
  }
};

export const ISSUES = [
  { id: 'missing', title: '交点漏绑', point: [0.7, -2.1, 0.7], question: '这个交点没有看到绑丝，优先用什么方式检查？', answer: 'visual', options: [{ id: 'visual', label: '逐交点目视核对' }, { id: 'ruler', label: '用量具测间距' }, { id: 'touch', label: '只凭外观看牢固度' }], explanation: '先按交点逐个核对完整性。示意中缺少绑丝可以目视发现；是否牢固仍需合适的人工复核。' },
  { id: 'spacing', title: '局部间距变化', point: [3.5, -1.3, 0.7], question: '两根相邻钢筋看起来不等距，应怎样核实？', answer: 'ruler', options: [{ id: 'visual', label: '凭透视图估计' }, { id: 'ruler', label: '用量具测量并对照设计' }, { id: 'touch', label: '用手摇动绑丝' }], explanation: '透视会改变视觉距离，应在相同量测口径下测量相邻钢筋间距，再对照项目设计；本页不提供通用合格阈值。', measurement: { designMM: 400, actualMM: 480, kind: '相邻钢筋中心线间距' } },
  { id: 'cover', title: '垫块与保护层', point: [7.5, -1.3, 0.62], question: '检查保护层时，哪个依据最有用？', answer: 'spacer', options: [{ id: 'colour', label: '钢筋是否显示绿色' }, { id: 'spacer', label: '核对垫块、钢筋外缘与模板面的净距' }, { id: 'touch', label: '只检查绑丝是否拧紧' }], explanation: '保护层应按设计和现场规定的方法核查，量测口径是钢筋外缘至混凝土表面的最短距离。底模样板与垫块只用于说明层次，42 mm 是本页设定，不是通用规范值。', measurement: { designMM: 42, kind: '示意保护层净距' } },
  { id: 'loose', title: '疑似松扣', point: [4.3, -2.9, 0.7], question: '屏幕上看见绑丝，能否直接认定绑扎牢固？', answer: 'touch', options: [{ id: 'visual', label: '能，有绑丝就合格' }, { id: 'colour', label: '能，颜色正常就合格' }, { id: 'touch', label: '不能，应按要求人工接触检查' }], explanation: '外观不能证明受力后的牢固度。需在安全条件下按现场要求进行人工接触检查，并对发现的问题复核处理。' }
];

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(Number(v)) ? Number(v) : a));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { const v = clamp(t); return v * v * (3 - 2 * v); };
const mm = value => Number(value) / 1000;
const inside = (x, y, r, margin = 0) => x >= r[0] - margin && x <= r[2] + margin && y >= r[1] - margin && y <= r[3] + margin;
const finiteOr = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;

export function makeGrid(spacingMM = REBAR_MODEL.spacingMM) {
  const spacing = mm(spacingMM);
  if (!Number.isFinite(spacing) || spacing < 0.05 || spacing > 5) throw new RangeError('教学网格间距应为 50–5000 mm');
  const g = REBAR_MODEL.grid, points = [];
  const cols = Math.floor((g.maxX - g.minX + 1e-9) / spacing) + 1;
  const rows = Math.floor((g.maxY - g.minY + 1e-9) / spacing) + 1;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = +(g.minX + col * spacing).toFixed(9), y = +(g.minY + row * spacing).toFixed(9);
    if (inside(x, y, REBAR_MODEL.opening) || inside(x, y, REBAR_MODEL.column)) continue;
    points.push({ id: `R${String(row + 1).padStart(2, '0')}-C${String(col + 1).padStart(2, '0')}`, x, y, z: REBAR_MODEL.targetZ, row: row + 1, col: col + 1 });
  }
  return points;
}

export function classifyPoint(p, { base = REBAR_MODEL.base, reach = REBAR_MODEL.reach, toolRadius = REBAR_MODEL.toolRadius } = {}) {
  const x = Number(p?.x ?? p?.[0]), y = Number(p?.y ?? p?.[1]);
  const bx = Number(base?.x ?? base?.[0]), by = Number(base?.y ?? base?.[1]);
  const distance = Math.hypot(x - bx, y - by);
  const radius = Math.max(0, finiteOr(toolRadius, REBAR_MODEL.toolRadius));
  const result = (status, code, reason) => ({ status, code, reason, distance, toolRadius: radius });
  if (![x, y, bx, by, reach].every(Number.isFinite) || reach <= 0) return result('blocked', 'invalid', '坐标或工作半径无效');
  const s = REBAR_MODEL.slab;
  if (x - radius < s.minX || x + radius > s.maxX || y - radius < s.minY || y + radius > s.maxY) return result('blocked', 'edge', '工具包络越过楼面边缘，需隔离并重新核实作业条件');
  if (inside(x, y, REBAR_MODEL.opening, REBAR_MODEL.openingBuffer + radius)) return result('blocked', 'opening', '洞口及示意隔离带：工具包络不能进入');
  if (inside(x, y, REBAR_MODEL.material, radius)) return result('blocked', 'material', '堆料与工具包络相交，先清理并复核');
  if (inside(x, y, REBAR_MODEL.column, radius)) return result('blocked', 'column', '柱实体与工具包络相交');
  if (inside(x, y, REBAR_MODEL.column, REBAR_MODEL.denseBuffer + radius)) return result('manual', 'dense', '柱边密集节点：需要人工配合及进入空间复核');
  if (distance + radius > reach + 1e-9) return result('manual', 'reach', '超出示意工作包络，需调整机位或人工配合');
  return result('auto', 'clear', '简化几何满足示意条件；真实作业仍需现场复核');
}

export function sceneCounts(options = {}) {
  const points = makeGrid(options.spacingMM ?? REBAR_MODEL.spacingMM);
  const counts = { total: points.length, auto: 0, manual: 0, blocked: 0 };
  for (const p of points) counts[classifyPoint(p, options).status]++;
  return counts;
}

// The bend centreline is tangent to both straight legs and stays outside the mandrel.
// Arc length is taken from the free leg, keeping total stock length constant.
function bentBar(lengthM, angleDeg, radius = 0.16, fixedLengthM = lengthM * 0.52) {
  const a = clamp(angleDeg, 0, 160) * Math.PI / 180;
  const first = fixedLengthM;
  const free = Math.max(0, lengthM - first - radius * a);
  const count = Math.max(1, Math.ceil(a / (Math.PI / 72)));
  const points = [[-first, radius], [0, radius]];
  if (a > 1e-10) for (let i = 1; i <= count; i++) { const t = a * i / count; points.push([radius * Math.sin(t), radius * Math.cos(t)]); }
  const end = points[points.length - 1];
  points.push([end[0] + free * Math.cos(a), end[1] - free * Math.sin(a)]);
  return { bar: points, bendRadius: radius, mandrelRadius: radius - 0.008, pinRadius: 0.037, center: [0, 0], arc: { center: [0, 0], radius, angleRad: a, startAngle: Math.PI / 2, endAngle: Math.PI / 2 - a, clockwise: true, start: [0, radius], end: [radius * Math.sin(a), radius * Math.cos(a)] }, arcLength: radius * a, freeLength: free, fixedLength: first, pinCenter: [(radius + 0.045) * Math.sin(a), (radius + 0.045) * Math.cos(a)], totalLength: lengthM };
}

export function processingState(machine, progress, { lengthMM = 2400, angleDeg = 90, residualMM = 0, shortMM = 0, angleErrorDeg = 0 } = {}) {
  const p = clamp(progress), length = clamp(finiteOr(lengthMM, 2400), 600, 5000);
  const residual = Math.max(0, finiteOr(residualMM, 0));
  const common = { machine, progress: p, feed: 0, blade: 0, bendAngleDeg: 0, outputLengthMM: length, residualMM: residual };
  if (machine === 'straighten') {
    const feed = smooth(p), ampIn = 0.17, ampOut = mm(residual);
    const contact = 0.16 - 0.13 - mm(REBAR_MODEL.barDiameterMM) / 2;
    const guides = [[-1, -0.06], [-0.65, contact], [-0.33, -contact], [0, contact], [0.33, -contact], [0.65, contact], [1, 0]];
    const samples = [...new Set([...Array.from({ length: 101 }, (_, i) => lerp(-1.65, 1.65, i / 100)), ...guides.map(g => g[0])])].sort((a, b) => a - b);
    const bar = samples.map(x => {
      if (x <= -1) return [x, -0.06 + ampIn * smooth((-1 - x) / 0.4) * Math.sin((x - feed * 2) * Math.PI * 2.2)];
      if (x >= 1) return [x, ampOut * smooth((x - 1) / 0.3) * Math.sin((x - 1) * Math.PI * 2.2)];
      const next = guides.findIndex(g => g[0] >= x);
      const a = guides[next - 1], b = guides[next];
      return [x, lerp(a[1], b[1], smooth((x - a[0]) / (b[0] - a[0])))];
    });
    return { ...common, phase: p < 0.15 ? '送入' : p < 0.85 ? '交错轮反复弯曲' : '输出复核', feed, geometry: { bar, guideX: [-0.65, -0.33, 0, 0.33, 0.65], wheels: [-0.65, -0.33, 0, 0.33, 0.65].map((x, i) => ({ x, y: i % 2 ? -0.16 : 0.16, radius: 0.13, angle: feed * 8 * (i % 2 ? -1 : 1) })), inputAmplitude: ampIn, outputAmplitude: ampOut } };
  }
  if (machine === 'cut') {
    const feed = smooth(p / 0.35), isCut = p >= 0.65;
    const blade = p < 0.5 ? 0 : p <= 0.65 ? smooth((p - 0.5) / 0.15) : 1 - smooth((p - 0.65) / 0.15);
    const actualLength = Math.max(200, length - Math.max(0, finiteOr(shortMM, 0)));
    const gap = isCut ? 0.012 + 0.09 * smooth((p - 0.65) / 0.35) : 0;
    const pieces = isCut ? [[[-1.4, 0], [-0.006, 0]], [[gap, 0], [mm(actualLength) + gap, 0]]] : [[[-1.4, 0], [mm(actualLength) * feed, 0]]];
    return { ...common, phase: p < 0.35 ? '定尺送料' : p < 0.5 ? '夹持定位' : p < 0.65 ? '刀片切入' : p < 0.8 ? '切断回程' : '半成品离开', feed, blade, isCut, outputLengthMM: actualLength, geometry: { pieces, cutX: 0, separation: gap, targetLengthM: mm(length), actualLengthM: mm(actualLength), clampClosed: p >= 0.35 && p < 0.82 } };
  }
  if (machine === 'bend') {
    const target = clamp(finiteOr(angleDeg, 90) + finiteOr(angleErrorDeg, 0), 0, 150);
    const angle = target * smooth((p - 0.2) / 0.6);
    // Select the fixed leg before the cycle. It must not slide while the pin turns.
    const fixedLeg = Math.min(mm(length) * 0.52, mm(length) - 0.16 * target * Math.PI / 180 - 0.02);
    return { ...common, phase: p < 0.2 ? '定位夹持' : p < 0.8 ? '弯曲轴绕中心轴转动' : '角度与形状复核', feed: smooth(p / 0.2), bendAngleDeg: angle, geometry: bentBar(mm(length), angle, 0.16, fixedLeg) };
  }
  throw new RangeError('未知加工机械：' + machine);
}

export function errorGeometry(kind, { lengthMM = 2400, shortMM = 160, angleErrorDeg = 15, residualMM = 80 } = {}) {
  const length = mm(clamp(finiteOr(lengthMM, 2400), 600, 5000));
  if (kind === 'short' || kind === 'length') {
    const shortage = clamp(finiteOr(shortMM, 160), 0, length * 1000 - 100);
    return { kind: 'short', design: [[0, 0], [length, 0]], actual: [[0, 0], [length - mm(shortage), 0]], deviationMM: shortage, caption: `半成品偏短 ${shortage} mm：端点与计划交点错开。该数值为教学设定，不是允许偏差。` };
  }
  if (kind === 'angle' || kind === 'bend') {
    const error = clamp(finiteOr(angleErrorDeg, 15), -60, 60);
    const fixedLeg = Math.min(length * 0.52, length - 0.16 * Math.max(90, 90 + error) * Math.PI / 180 - 0.02);
    const design = bentBar(length, 90, 0.16, fixedLeg).bar, actual = bentBar(length, 90 + error, 0.16, fixedLeg).bar;
    const a = design[design.length - 1], b = actual[actual.length - 1];
    return { kind: 'angle', design, actual, angleErrorDeg: error, deviationMM: Math.hypot(a[0] - b[0], a[1] - b[1]) * 1000, caption: `弯角设定偏差 ${error}°：末端位置随弯角改变，需重新核对定位。` };
  }
  if (kind === 'residual' || kind === 'curve') {
    const amplitude = Math.max(0, finiteOr(residualMM, 80));
    const ys = Array.from({ length: 81 }, (_, i) => mm(amplitude) * Math.sin(i / 80 * Math.PI * 4));
    const arcLength = projection => ys.slice(1).reduce((sum, y, i) => sum + Math.hypot(projection / 80, y - ys[i]), 0);
    if (arcLength(0) >= length && amplitude > 0) throw new RangeError('当前料长不能容纳设定的双周期残弯幅值，请减小幅值或增加料长');
    let low = 0, high = length;
    if (amplitude > 0) for (let i = 0; i < 70; i++) {
      const mid = (low + high) / 2;
      if (arcLength(mid) > length) high = mid; else low = mid;
    }
    const projection = amplitude > 0 ? (low + high) / 2 : length;
    const actual = ys.map((y, i) => [projection * i / 80, y]);
    return { kind: 'residual', design: [[0, 0], [length, 0]], actual, deviationMM: amplitude, actualProjectionMM: projection * 1000, actualLengthMM: arcLength(projection) * 1000, endpointShiftMM: (length - projection) * 1000, caption: amplitude > 0 ? `残余弯曲峰值设为 ${amplitude} mm：同一根 ${length * 1000} mm 料保持料长，实际投影缩短为 ${(projection * 1000).toFixed(1)} mm，端点与交点位置随之改变。` : '残弯峰值为 0 mm：相同料长的设计轮廓与实际轮廓重合。' };
  }
  if (kind === 'none' || kind === 'design') return { kind: 'none', design: [[0, 0], [length, 0]], actual: [[0, 0], [length, 0]], deviationMM: 0, caption: '设计位置与示意半成品重合，仍需按项目要求检查加工质量。' };
  throw new RangeError('未知误差类型：' + kind);
}

export function inspectIssue(id) { return ISSUES.find(issue => issue.id === id) ?? null; }
