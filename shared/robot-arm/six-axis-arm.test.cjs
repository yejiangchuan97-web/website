const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
globalThis.window = globalThis;
require(path.join(__dirname, '../../course/chapters/03/tasks/3-2/src/model.js'));
const Arm = require('./six-axis-arm.js');
const M = globalThis.RobotModel;

test('统一六轴臂与第三章 RobotModel 关节偏置一致', () => {
  assert.deepStrictEqual(Arm.offsetsFor(), M.offsets);
  assert.deepStrictEqual(Arm.AXES, M.axes);
});

test('末端求解与 3-2 正运动学首尾闭合', () => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 200; n++) {
    const q = [(rnd() - .5) * 300, rnd() * 120 - 50, -5 - rnd() * 110, (rnd() - .5) * 300, rnd() * 200 - 100, 0];
    const f = M.fk(q), R = f.flangeR, d = [R[0], R[3], R[6]];
    const p = f.flange.map((v, i) => v + d[i] * Arm.FACE);
    const s = Arm.solve(Arm.offsetsFor(), p, d);
    assert.ok(s.reachable);
    const g = M.fk(s.q), R2 = g.flangeR, d2 = [R2[0], R2[3], R2[6]];
    assert.ok(Math.hypot(...g.flange.map((v, i) => v + d2[i] * Arm.FACE - p[i])) < 1e-6);
    assert.ok(Math.hypot(...d2.map((v, i) => v - d[i])) < 1e-9);
  }
});

test('伸缩臂长同样闭合，超出臂展时报告不可达', () => {
  const off = Arm.offsetsFor(900, 760);
  const s = Arm.solve(off, [900, 200, 300], [0, 0, -1]);
  assert.ok(s.reachable && s.error < 1e-9);
  const far = Arm.solve(off, [5000, 0, 0], [1, 0, 0]);
  assert.strictEqual(far.reachable, false);
});
