const assert = require("assert/strict"),
  M = require("../src/model.js");
const close = (a, b, e = 1e-7) =>
  assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
let checks = 0;
function test(name, fn) {
  fn();
  console.log("PASS", name);
  checks++;
}
test("gear angle and reversed input", () => {
  const p = { ...M.defaults.gear },
    s = M.create("gear");
  M.step(s, p, 1);
  close(s.theta, (18 * Math.PI * 2) / 60);
  p.direction = -1;
  M.step(s, p, 1);
  close(s.theta, 0);
});
test("either physical shaft can be input with correct speed, torque and power", () => {
  for (const kind of ["gear", "belt", "chain"])
    for (const input of [1, 2])
      for (const direction of [-1, 1]) {
        const p = { ...M.defaults.gear, kind, input, direction },
          t = M.transmission(p),
          s = M.create("gear");
        close(input === 1 ? t.n1 : t.n2, direction * p.rpm);
        close(Math.abs(t.nout / t.nin), input === 1 ? 0.5 : 2);
        close((t.tout * Math.abs(t.nout) * Math.PI * 2) / 60, t.pout);
        assert.ok(t.pout < t.pin);
        M.step(s, p, 1);
        close(s.theta, t.w1);
      }
});
test("true involute contact points belong to both tooth flanks at all ratios and directions", () => {
  for (const z2 of [20, 30, 40, 60])
    for (const dir of [-1, 1])
      for (let i = 0; i < 100; i++) {
        const theta = i * 0.0347,
          pts = M.gearContacts(theta, 20, z2, dir),
          r1 = 0.85,
          r2 = (z2 * 0.085) / 2;
        assert.ok(pts.length >= 1 && pts.length <= 2);
        for (const p of pts)
          for (const [z, r, x, rot] of [
            [20, r1, p.x, theta],
            [z2, r2, p.x - r1 - r2, Math.PI - Math.PI / z2 - (theta * 20) / z2],
          ]) {
            const radius = Math.hypot(x, p.y),
              rb = r * Math.cos(Math.PI / 9),
              a = Math.acos(Math.min(1, rb / radius)),
              half =
                Math.PI / (2 * z) +
                Math.tan(Math.PI / 9) -
                Math.PI / 9 -
                (Math.tan(a) - a),
              period = (2 * Math.PI) / z,
              raw = Math.atan2(p.y, x) - rot,
              delta =
                ((((raw + period / 2) % period) + period) % period) -
                period / 2;
            close(delta, dir * half, 1e-7);
          }
      }
});
test("hydraulic velocity and exact inlet volume", () => {
  const p = { ...M.defaults.hyd },
    s = M.create("hyd");
  s.auto = false;
  M.step(s, p, 1);
  const { A } = M.areas("hyd", p);
  close(s.x, p.flow / 60000 / A);
  close(s.inlet, s.x * A * 1000);
  close(s.qin, p.flow);
});
test("annular retract is faster and return flow exceeds inlet", () => {
  const p = { ...M.defaults.hyd },
    s = M.create("hyd");
  s.auto = false;
  s.x = 0.15;
  s.command = -1;
  M.step(s, p, 1);
  const { A, B } = M.areas("hyd", p);
  close(-s.v, p.flow / 60000 / B);
  assert.ok(s.qout > s.qin);
  close(s.qout / s.qin, A / B);
});
test("hydraulic overload diverts full pump flow, cylinder stalls", () => {
  const p = { ...M.defaults.hyd, load: 20000, pressure: 1 },
    s = M.create("hyd");
  s.auto = false;
  M.step(s, p, 1);
  close(s.x, 0);
  close(s.qin, 0);
  close(s.pA, 1e6);
});
test("hydraulic end stop conserves flow, clamps travel, and immediately stops displayed velocity", () => {
  const p = { ...M.defaults.hyd },
    s = M.create("hyd");
  s.auto = false;
  M.step(s, p, 100);
  const { A } = M.areas("hyd", p);
  close(s.x, 0.2);
  close(s.inlet, A * 0.2 * 1000);
  close(s.qin, 0);
  close(s.v, 0);
  close(s.pA, p.pressure * 1e6);
  assert.ok(s.status.includes("行程终点"));
});
test("hydraulic closed center retains position", () => {
  const p = { ...M.defaults.hyd },
    s = M.create("hyd");
  s.auto = false;
  s.x = 0.08;
  s.command = 0;
  M.step(s, p, 3);
  close(s.x, 0.08);
  close(s.qin, 0);
});
test("pneumatic inlet initially compresses rather than instant full speed", () => {
  const p = { ...M.defaults.air },
    s = M.create("air");
  s.auto = false;
  M.step(s, p, 0.001);
  assert.ok(s.pA > 0);
  assert.ok(s.x < 1e-6);
  assert.ok(s.qin > 0);
});
test("pneumatic mass balance including actual chamber volumes", () => {
  const p = { ...M.defaults.air },
    s = M.create("air");
  s.auto = false;
  const initial = s.wA + s.wB;
  for (let i = 0; i < 400; i++) M.step(s, p, 0.01);
  close(s.wA + s.wB, initial + (s.inlet - s.outlet) / 1000, 1e-9);
  const { A } = M.areas("air", p);
  close((s.pA + M.P0) * A * (s.x + 0.005), M.P0 * s.wA, 1e-5);
  assert.ok(s.x > 0.1);
});
test("pneumatic overload builds supply pressure without moving", () => {
  const p = { ...M.defaults.air, load: 1500 },
    s = M.create("air");
  s.auto = false;
  for (let i = 0; i < 1000; i++) M.step(s, p, 0.01);
  close(s.x, 0);
  assert.ok(s.pA > 590000 && s.pA <= 601000);
});
test("pneumatic neutral closes both valves and conserves mass", () => {
  const p = { ...M.defaults.air },
    s = M.create("air");
  s.auto = false;
  M.step(s, p, 0.2);
  s.command = 0;
  const a = s.wA,
    b = s.wB;
  M.step(s, p, 0.5);
  close(a, s.wA);
  close(b, s.wB);
  close(s.qin, 0);
});
test("pneumatic automatic full cycles remain finite and conserve air", () => {
  const p = { ...M.defaults.air },
    s = M.create("air");
  const initial = s.wA + s.wB;
  for (let i = 0; i < 10000; i++) M.step(s, p, 0.01);
  assert.ok(s.cycles >= 2);
  for (const k of ["x", "v", "pA", "pB", "inlet"])
    assert.ok(Number.isFinite(s[k]));
  assert.ok(s.x >= 0 && s.x <= 0.2);
  close(s.wA + s.wB, initial + (s.inlet - s.outlet) / 1000, 1e-8);
});
test("pneumatic timestep convergence", () => {
  const p = { ...M.defaults.air },
    a = M.create("air"),
    b = M.create("air");
  a.auto = b.auto = false;
  for (let i = 0; i < 100; i++) M.step(a, p, 0.01);
  for (let i = 0; i < 1000; i++) M.step(b, p, 0.001);
  assert.ok(Math.abs(a.x - b.x) < 0.001);
});
console.log(`${checks} physics checks passed`);
