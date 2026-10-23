/* Mechanical laboratory — SI units internally. Pure deterministic physics. */
(function (root) {
  "use strict";
  const P0 = 101325,
    L = 0.2,
    PI = Math.PI,
    clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const defaults = {
    gear: {
      rpm: 18,
      z1: 20,
      z2: 40,
      torque: 8,
      kind: "gear",
      direction: 1,
      input: 1,
      module: 2.5,
    },
    hyd: { flow: 3, pressure: 5, load: 1800, bore: 50 },
    air: { flow: 100, pressure: 0.6, load: 180, bore: 40 },
  };
  function transmission(p) {
    const input = p.input === 2 ? 2 : 1,
      ratio = input === 1 ? p.z2 / p.z1 : p.z1 / p.z2,
      sign = p.kind === "gear" ? -1 : 1,
      nin = p.direction * p.rpm,
      nout = (sign * nin) / ratio,
      n1 = input === 1 ? nin : nout,
      n2 = input === 1 ? nout : nin,
      eta = p.kind === "gear" ? 0.97 : p.kind === "belt" ? 0.95 : 0.98;
    return {
      input,
      output: 3 - input,
      ratio,
      nin,
      nout,
      n1,
      n2,
      eta,
      tout: p.torque * ratio * eta,
      pin: (p.torque * Math.abs(nin) * 2 * PI) / 60,
      pout: ((p.torque * Math.abs(nin) * 2 * PI) / 60) * eta,
      w1: (n1 * 2 * PI) / 60,
      w2: (n2 * 2 * PI) / 60,
    };
  }
  function gearContacts(theta, z1, z2, direction = 1, m = 0.085) {
    const alpha = PI / 9,
      r1 = (z1 * m) / 2,
      r2 = (z2 * m) / 2,
      b1 = r1 * Math.cos(alpha),
      b2 = r2 * Math.cos(alpha),
      bp = PI * m * Math.cos(alpha),
      start = r2 * Math.sin(alpha) - Math.sqrt((r2 + m) ** 2 - b2 * b2),
      end = Math.sqrt((r1 + m) ** 2 - b1 * b1) - r1 * Math.sin(alpha),
      phase = b1 * (direction * theta + PI / (2 * z1)),
      k = Math.ceil((start - phase) / bp),
      points = [];
    for (let i = k; i <= k + 2; i++) {
      const s = phase + i * bp;
      if (s <= end + 1e-9)
        points.push({
          x: r1 + s * Math.sin(alpha),
          y: direction * s * Math.cos(alpha),
        });
    }
    return points;
  }
  function areas(mode, p) {
    const D = p.bore / 1000,
      d = D * (mode === "hyd" ? 0.5 : 0.4);
    return { A: (PI * D * D) / 4, B: (PI * (D * D - d * d)) / 4, D, d };
  }
  function create(mode, p) {
    p = p || defaults[mode];
    const { A, B } = mode === "gear" ? { A: 0, B: 0 } : areas(mode, p);
    return {
      mode,
      t: 0,
      x: 0,
      v: 0,
      theta: 0,
      command: 1,
      auto: true,
      dwell: 0,
      cycles: 0,
      inlet: 0,
      outlet: 0,
      qin: 0,
      qout: 0,
      pA: 0,
      pB: 0,
      force: 0,
      status: "准备",
      wA: A * 0.005,
      wB: B * (L + 0.005),
      power: 0,
    };
  }
  function valveFlow(pu, pd, nominal) {
    if (pu <= pd || pu <= 0) return 0;
    const g = 1.4,
      r = clamp(pd / pu, 0, 1),
      rc = Math.pow(2 / (g + 1), g / (g - 1));
    const critical =
      Math.sqrt(g) * Math.pow(2 / (g + 1), (g + 1) / (2 * (g - 1)));
    const f =
      r <= rc
        ? 1
        : Math.sqrt(
            ((2 * g) / (g - 1)) *
              (Math.pow(r, 2 / g) - Math.pow(r, (g + 1) / g)),
          ) / critical;
    return (nominal / 60000) * (pu / 700000) * f; // m³/s at 101325 Pa, 20°C
  }
  function step(s, p, dt) {
    if (!(dt > 0)) return s;
    if (s.mode === "gear") {
      s.theta += transmission(p).w1 * dt;
      s.t += dt;
      s.status = "连续传动";
      return s;
    }
    const { A, B } = areas(s.mode, p),
      dir = s.command;
    const end = (dir > 0 && s.x >= L - 1e-9) || (dir < 0 && s.x <= 1e-9);
    if (s.auto && dir && end) {
      s.dwell += dt;
      if (s.dwell >= 0.35) {
        s.command = -dir;
        s.dwell = 0;
        if (dir < 0) s.cycles++;
      }
    } else s.dwell = 0;
    if (s.mode === "hyd") {
      const d = s.command,
        ai = d > 0 ? A : B,
        ao = d > 0 ? B : A,
        ret = 100000,
        friction = 100;
      const needed = (p.load + friction + ret * ao) / ai,
        limit = p.pressure * 1e6;
      const atEnd = (d > 0 && s.x >= L - 1e-10) || (d < 0 && s.x <= 1e-10);
      const moving = d !== 0 && !atEnd && needed <= limit;
      const velocity = moving ? (d * p.flow) / 60000 / ai : 0;
      const old = s.x;
      s.x = clamp(s.x + velocity * dt, 0, L);
      const travelled = Math.abs(s.x - old);
      s.inlet += travelled * ai * 1000;
      s.outlet += travelled * ao * 1000;
      const stopped = (d > 0 && s.x >= L - 1e-10) || (d < 0 && s.x <= 1e-10),
        nowMoving = moving && !stopped;
      s.v = nowMoving ? velocity : 0;
      const q = nowMoving ? p.flow / 60000 : 0,
        qo = (q * ao) / ai;
      s.qin = q * 60000;
      s.qout = qo * 60000;
      const active = nowMoving ? needed : limit;
      if (d > 0) {
        s.pA = active;
        s.pB = ret;
      } else if (d < 0) {
        s.pA = ret;
        s.pB = active;
      }
      s.force = s.pA * A - s.pB * B;
      s.power = d ? active * q : 0;
      s.status = !d
        ? "中位保压 · 泵经溢流阀回油"
        : stopped
          ? "行程终点 · 溢流卸荷"
          : !moving
            ? "负载超限 · 溢流卸荷"
            : d > 0
              ? "伸出 · P → A / B → T"
              : "缩回 · P → B / A → T";
    } else {
      // Isothermal, two well-mixed chambers; compressible orifice flows, finite mass.
      const n = Math.ceil(dt / 0.0004),
        h = dt / n,
        ps = P0 + p.pressure * 1e6;
      let qi = 0,
        qe = 0;
      for (let j = 0; j < n; j++) {
        const va = A * (s.x + 0.005),
          vb = B * (L - s.x + 0.005),
          pa = (P0 * s.wA) / va,
          pb = (P0 * s.wB) / vb,
          d = s.command;
        let a = 0,
          b = 0,
          ex = 0,
          im = 0;
        if (d > 0) {
          a = valveFlow(ps, pa, p.flow);
          b = -valveFlow(pb, P0, p.flow * 1.1);
          im = a;
          ex = -b;
        }
        if (d < 0) {
          b = valveFlow(ps, pb, p.flow);
          a = -valveFlow(pa, P0, p.flow * 1.1);
          im = b;
          ex = -a;
        }
        s.wA = Math.max(1e-10, s.wA + a * h);
        s.wB = Math.max(1e-10, s.wB + b * h);
        const f = (pa - P0) * A - (pb - P0) * B,
          fr = 25,
          staticF = p.load + fr;
        let acc = 0;
        if (Math.abs(s.v) < 1e-5 && Math.abs(f) <= staticF) {
          s.v = 0;
        } else {
          const sign = Math.abs(s.v) > 1e-5 ? Math.sign(s.v) : Math.sign(f);
          acc = (f - sign * staticF - 300 * s.v) / 12;
        }
        let nv = s.v + acc * h;
        if (nv * s.v < 0 && Math.abs(f) <= staticF) nv = 0;
        s.v = nv;
        s.x += s.v * h;
        if (s.x <= 0) {
          s.x = 0;
          if (s.v < 0) s.v = 0;
        }
        if (s.x >= L) {
          s.x = L;
          if (s.v > 0) s.v = 0;
        }
        s.inlet += im * h * 1000;
        s.outlet += ex * h * 1000;
        qi += im / n;
        qe += ex / n;
      }
      const va = A * (s.x + 0.005),
        vb = B * (L - s.x + 0.005);
      s.pA = (P0 * s.wA) / va - P0;
      s.pB = (P0 * s.wB) / vb - P0;
      s.qin = qi * 60000;
      s.qout = qe * 60000;
      s.force = s.pA * A - s.pB * B;
      s.power = Math.max(0, s.force * s.v);
      const e =
        (s.command > 0 && s.x >= L - 1e-8) || (s.command < 0 && s.x <= 1e-8);
      s.status = !s.command
        ? "中位封闭 · 两腔封存空气"
        : e
          ? "行程终点 · 继续建立静压"
          : Math.abs(s.v) < 0.001
            ? s.qin > 1
              ? "充气建压 · 活塞暂未运动"
              : "负载超限 · 气缸停滞"
            : s.v > 0
              ? "伸出 · P → A / B → 排气"
              : "缩回 · P → B / A → 排气";
    }
    s.t += dt;
    return s;
  }
  const api = {
    P0,
    L,
    defaults,
    areas,
    create,
    step,
    valveFlow,
    clamp,
    gearContacts,
    transmission,
  };
  root.MechModel = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
