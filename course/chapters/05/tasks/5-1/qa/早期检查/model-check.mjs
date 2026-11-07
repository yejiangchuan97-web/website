import assert from 'node:assert/strict';
import { REBAR_MODEL as M, makeGrid, classifyPoint, sceneCounts, processingState, errorGeometry, ISSUES, inspectIssue } from "../../src/model.mjs";

let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
const near = (a, b, eps = 1e-8) => check(Math.abs(a - b) < eps, `${a} != ${b}`);
const inRect = (p, r) => p.x >= r[0] && p.x <= r[2] && p.y >= r[1] && p.y <= r[3];
const lineLength = line => line.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0);

check(M.units.world === 'm' && M.units.input === 'mm' && M.units.up === 'Z', '坐标单位明确');
near(M.barDiameterMM / 1000, 0.016);
near(M.upperBarZ - M.lowerBarZ, M.barDiameterMM / 1000);
near(M.lowerBarZ - M.barDiameterMM / 2000 - M.formworkTop, M.coverMM / 1000);
check(M.platform[3] < M.slab.minY && M.route[1] > M.slab.maxY, '独立机位和人员通道不踏钢筋网');
const grid = makeGrid();
check(grid.length > 400 && grid.length < 528, '网格规模与洞口剔除正确');
check(new Set(grid.map(p => p.id)).size === grid.length, '交点编号唯一');
for (const p of grid) {
  check(!inRect(p, M.opening) && !inRect(p, M.column), '洞口与柱实体内没有绑扎交点');
  check(p.x >= M.slab.minX && p.x <= M.slab.maxX && p.y >= M.slab.minY && p.y <= M.slab.maxY, '交点在楼面上');
  near(p.z, M.upperBarZ + M.barDiameterMM / 2000);
}
const sameRow = grid.filter(p => p.row === 1);
for (let i = 1; i < sameRow.length; i++) near(sameRow[i].x - sameRow[i - 1].x, 0.4);
assert.throws(() => makeGrid(0), RangeError); assertions++;
assert.throws(() => makeGrid(NaN), RangeError); assertions++;
check(classifyPoint({ x: 6, y: 2 }).code === 'opening', '洞口禁止进入');
check(classifyPoint({ x: 4.6, y: 2 }).code === 'opening', '工具包络进入洞口隔离带也应禁止');
check(classifyPoint({ x: 7.2, y: -3 }).code === 'material', '堆料与工具包络相交');
check(classifyPoint({ x: 1.8, y: 1.8 }).code === 'column', '柱实体阻挡');
check(classifyPoint({ x: 1, y: 1 }).code === 'dense', '柱边密集节点需人工配合');
check(classifyPoint({ x: -1.75, y: 0 }).code === 'edge', 'TCP在楼面内不代表工具包络在内');
check(classifyPoint({ x: 1, y: -2 }, { base: [1, -3], reach: 2 }).status === 'auto', '普通交点在简化工作空间内');
check(classifyPoint({ x: 1, y: -2 }, { base: [1, -5.4], reach: 2 }).code === 'reach', '移动机位改变可达性');
check(classifyPoint({ x: NaN, y: 0 }).status === 'blocked', '非法坐标不能判可作业');
const counts = sceneCounts();
check(counts.total === counts.auto + counts.manual + counts.blocked, '区域计数守恒');
check(counts.auto > 0 && counts.manual > 0 && counts.blocked > 0, '三类区域均可观察');

for (const machine of ['straighten', 'cut', 'bend']) {
  for (const p of [-1, 0, .2, .35, .5, .64, .65, .8, 1, 2]) {
    const s = processingState(machine, p);
    check(s.progress >= 0 && s.progress <= 1, '进度归一化');
    check(s.feed >= 0 && s.feed <= 1 && s.blade >= 0 && s.blade <= 1, '机构参数范围');
    check(typeof s.phase === 'string' && s.phase.length > 0, '每个单步有对应工序');
  }
}
const cutBefore = processingState('cut', .64), cutAfter = processingState('cut', .65), cutEnd = processingState('cut', 1, { lengthMM: 2400, shortMM: 160 });
check(cutBefore.geometry.pieces.length === 1 && cutAfter.geometry.pieces.length === 2, '切断前后连通性变化');
check(cutAfter.geometry.pieces[0][1][0] < cutAfter.geometry.pieces[1][0][0], '切后两段不重叠');
near(lineLength(cutEnd.geometry.pieces[1]), 2.24);
near(cutEnd.blade, 0);
for (const angle of [0, 45, 90, 120]) {
  const state = processingState('bend', 1, { lengthMM: 2400, angleDeg: angle });
  near(state.bendAngleDeg, angle);
  near(lineLength(state.geometry.bar), 2.4, 0.0001);
  near(state.geometry.bendRadius - state.geometry.mandrelRadius, M.barDiameterMM / 2000);
  near(Math.hypot(...state.geometry.pinCenter) - state.geometry.pinRadius, state.geometry.bendRadius + M.barDiameterMM / 2000);
  for (const p of state.geometry.bar) check(Math.hypot(...p) >= state.geometry.mandrelRadius + .008 - 1e-8, '钢筋中心线与中心轴保持净距');
}
for (const lengthMM of [600, 1200, 2400, 5000]) for (const angleDeg of [0, 90, 150]) {
  const begin = processingState('bend', 0, { lengthMM, angleDeg });
  for (const p of [0, .3, .5, .7, 1]) {
    const s = processingState('bend', p, { lengthMM, angleDeg });
    near(s.geometry.fixedLength, begin.geometry.fixedLength);
    near(s.geometry.fixedLength + s.geometry.arcLength + s.geometry.freeLength, lengthMM / 1000);
    check(s.geometry.freeLength >= .019999, '短料也保持非负自由腿且预先定位，不在转弯中滑移');
  }
}
near(processingState('straighten', 1, { residualMM: 80 }).geometry.outputAmplitude, .08);
for (let frame = 0; frame <= 100; frame++) {
  const g = processingState('straighten', frame / 100, { residualMM: 80 }).geometry;
  for (let i = 1; i < g.bar.length; i++) for (const wheel of g.wheels) {
    const a = g.bar[i - 1], b = g.bar[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((wheel.x - a[0]) * dx + (wheel.y - a[1]) * dy) / (dx * dx + dy * dy)));
    check(Math.hypot(a[0] + t * dx - wheel.x, a[1] + t * dy - wheel.y) >= wheel.radius + M.barDiameterMM / 2000 - 1e-8, '调直钢筋的整段中心线不穿过实体滚轮');
  }
}
const short = errorGeometry('short'), zeroShort = errorGeometry('short', { shortMM: 0 });
near(short.design[1][0] - short.actual[1][0], .16);
near(zeroShort.deviationMM, 0);
const angleError = errorGeometry('angle'), zeroAngle = errorGeometry('angle', { angleErrorDeg: 0 });
check(angleError.deviationMM > 100, '角度误差改变末端位置');
near(zeroAngle.deviationMM, 0);
const curve = errorGeometry('residual');
near(Math.max(...curve.actual.map(p => p[1])), .08);
near(Math.min(...curve.actual.map(p => p[1])), -.08);
near(lineLength(curve.actual), 2.4);
near(curve.actualLengthMM, 2400);
check(curve.actualProjectionMM < 2400 && curve.endpointShiftMM > 0, '同一料长残弯使投影与末端缩短');
for (const lengthMM of [600, 1200, 2400, 5000]) for (const residualMM of [0, 10, 50, Math.floor(lengthMM / 8) - 10]) {
  const e = errorGeometry('residual', { lengthMM, residualMM });
  near(lineLength(e.actual), lengthMM / 1000);
  near(e.actualLengthMM, lengthMM, .00001);
  near(Math.max(...e.actual.map(p => p[1])) * 1000, residualMM);
  near(Math.min(...e.actual.map(p => p[1])) * -1000, residualMM);
  near(e.actual[0][0], 0);
  near(e.actual[e.actual.length - 1][1], 0);
  if (residualMM === 0) near(e.actualProjectionMM, lengthMM);
}
assert.throws(() => errorGeometry('residual', { lengthMM: 1200, residualMM: 400 }), RangeError); assertions++;
for (const issue of ISSUES) {
  check(inspectIssue(issue.id) === issue, '问题可定位');
  check(issue.options.some(o => o.id === issue.answer), '每题正确选项存在');
}
check(inspectIssue('unknown') === null, '未知问题不伪造结果');
console.log(JSON.stringify({ passed: true, assertions, grid: counts, checks: ['单位与网格', '洞口与柱剔除', 'TCP与工具包络', '机位与可达性', '加工分步', '切断连通性', '弯曲长度与中心轴净距', '上游误差形状', '复核方法题库'] }, null, 2));
