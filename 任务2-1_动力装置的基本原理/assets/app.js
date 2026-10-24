/*
 * 有刷直流电机互动教学实验室
 * 原生 JavaScript，无构建步骤或运行时第三方依赖。
 * 状态与 solve() 统一驱动读数、动画和教学挑战。
 * window.motorLab 提供只读诊断快照及 solve()，便于课堂核对。
 */

(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    TAU = 2 * Math.PI,
    clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const C = { R: 1.2, Kt: 0.06, Ke: 0.06, b: 0.00012 };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = {
    voltage: 24,
    load: 0.42,
    dir: 1,
    cut: 65,
    hidden: false,
    paused: reduced,
    angle: Math.PI / 6,
    slow: 133,
    gear: 80,
    eta: 0.85,
    armR: 0.3,
    app: "arm",
    part: "all",
    showEM: true,
    annotationsHidden: false,
    sound: false,
    volume: 0.12,
  };
  const fault = {
    active: false,
    powered: false,
    kind: null,
    contactR: 0,
    wireOpen: false,
    step: "inspect",
    index: 0,
    order: [],
    history: [],
    observed: [],
    metered: [],
    saved: null,
    hasSession: false,
    runState: null,
  };
  const student = {
    active: false,
    installed: 0,
    selected: null,
    positive: "",
    negative: "",
    prediction: null,
    energized: false,
    results: [],
    saved: null,
    message: "",
    kind: "info",
    flashGroup: 0,
    flashAt: 0,
  };
  function solve(U, L, options = {}) {
    const Rc = Math.max(0, options.contactR || 0),
      Rtotal = C.R + Rc,
      terminalU = options.open ? 0 : U;
    const stall = (C.Kt * terminalU) / Rtotal,
      w = Math.max(0, (stall - L) / ((C.Kt * C.Ke) / Rtotal + C.b)),
      I = terminalU ? Math.max(0, (terminalU - C.Ke * w) / Rtotal) : 0,
      Te = C.Kt * I,
      T = w > 1e-8 ? L : Math.min(L, stall),
      P = T * w,
      Pin = U * I;
    return {
      w,
      n: (w * 60) / TAU,
      I,
      E: C.Ke * w,
      Te,
      T,
      P,
      Pin,
      Cu: I * I * C.R,
      fr: C.b * w * w,
      contactLoss: I * I * Rc,
      brushDrop: I * Rc,
      contactR: Rc,
      terminalU,
      sourceU: U,
      eff: Pin ? P / Pin : 0,
      stall,
      stalled: terminalU > 0 && L >= stall - 1e-9,
    };
  }
  let robotScene = null;
  let model = solve(state.voltage, state.load),
    plotGeometry = null,
    plotWidth = 0,
    appPhase = 0;
  const fixed = (v, n = 1) => (Math.abs(v) < Math.pow(10, -n) / 2 ? (0).toFixed(n) : v.toFixed(n));
  const set = (id, v) => {
      $(id).textContent = v;
    },
    pressed = (id, b) => $(id).setAttribute("aria-pressed", String(b));
  let toastTimer;
  function toast(t) {
    set("toast", t);
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
  }
  function displayRPM() {
    return model.n ? model.n / state.slow : 0;
  }
  function render() {
    set(
      "circuitRead",
      state.voltage === 0
        ? "未通电 · 电流为零"
        : state.dir > 0
          ? "A＋ → 电刷 → 换向器 → 线圈 → 电刷 → B−"
          : "B＋ → 电刷 → 换向器 → 线圈 → 电刷 → A−",
    );
    model = operatingModel();
    set("rpmValue", Math.round(model.n).toLocaleString("en-US"));
    set("torqueValue", fixed(model.T, 3));
    set("powerValue", fixed(model.P));
    set("emTorque", fixed(model.Te, 3));
    set("liveCurrentValue", fixed(model.I, 2));
    set(
      "liveCurrentDetail",
      "平均电枢电流 " +
        fixed(model.I, 2) +
        " A · " +
        (model.I ? "传统电流粒子 · 非电子轨迹" : "无电流"),
    );
    set("voltageRead", fixed(state.voltage) + " V");
    set("loadRead", fixed(state.load, 3) + " N·m");
    set("currentRead", fixed(model.I, 2) + " A");
    set("emfRead", fixed(model.E, 2) + " V");
    set("inputRead", fixed(model.Pin) + " W");
    set("effRead", fixed(100 * model.eff) + "%");
    set("cutRead", state.cut + "%");
    set("curveVoltage", "U = " + fixed(state.voltage) + " V");
    set(
      "directionText",
      model.n
        ? state.dir > 0
          ? "从输出轴端看：逆时针 ↺"
          : "从输出轴端看：顺时针 ↻"
        : "转子静止 · " + (model.stalled ? "堵转" : "未通电"),
    );
    set("mainTermA", state.dir > 0 ? "A ＋" : "A −");
    set("mainTermB", state.dir > 0 ? "B −" : "B ＋");
    $("mainTermA").style.color = state.dir > 0 ? "var(--red)" : "var(--blue)";
    $("mainTermB").style.color = state.dir > 0 ? "var(--blue)" : "var(--red)";
    pressed("forwardBtn", state.dir > 0);
    pressed("reverseBtn", state.dir < 0);
    pressed("cutMode", state.cut > 0 && !state.hidden);
    pressed("wholeMode", !state.cut && !state.hidden);
    pressed("wireMode", state.hidden);
    pressed("pauseBtn", state.paused);
    set("pauseBtn", state.paused ? "▶ 继续动画" : "Ⅱ 暂停动画");
    if (!student.active)
      document.querySelector(".view-hint").textContent = "点击部件名放大 · 拖动旋转 · 滚轮缩放";
    set(
      "renderBadge",
      renderer?.isolatedPart
        ? "FOCUS · 磁体独立观察"
        : !renderer
          ? "二维结构备用视图"
          : state.hidden
            ? "INTERNAL · 壳体隐藏"
            : state.cut
              ? "CUTAWAY · " + state.cut + "%"
              : "ASSEMBLED · 完整外壳",
    );
    const d = displayRPM();
    set(
      "motionBadge",
      !renderer
        ? "结构图静止 · 换向见下方"
        : state.paused
          ? "观察已暂停"
          : d
            ? "慢放 " + fixed(d) + " rpm"
            : "静止",
    );
    set(
      "timescaleRead",
      d
        ? "当前显示约为实际转速的 1 / " + Math.round(model.n / d)
        : "静止：电流与受力仍按当前通电状态显示",
    );
    let status =
      state.voltage === 0
        ? "○ 未通电 · 无电磁驱动"
        : model.stalled
          ? "● 堵转 · 轴功率为零，输入转为电阻损耗"
          : model.I > 12
            ? "● 大电流教学区 · 未建模温升"
            : "● 运行中 · 稳态工作点";
    set("condition", status);
    $("condition").classList.toggle("warn", model.stalled || model.I > 12);
    set(
      "balanceText",
      fixed(model.Pin) +
        " W = " +
        fixed(model.P) +
        " W + " +
        fixed(model.Cu) +
        " W + " +
        fixed(model.fr) +
        " W" +
        (model.contactLoss ? " + " + fixed(model.contactLoss) + " W（接触损耗）" : ""),
    );
    for (const [id, p] of [
      ["energyMech", model.P],
      ["energyCopper", model.Cu],
      ["energyFriction", model.fr],
      ["energyContact", model.contactLoss],
    ])
      $(id).style.width = (model.Pin ? (100 * p) / model.Pin : 0) + "%";
    set("mechEnergy", fixed(model.P) + " W");
    set("copperEnergy", fixed(model.Cu) + " W");
    set("frictionEnergy", fixed(model.fr) + " W");
    set("contactEnergy", fixed(model.contactLoss) + " W");
    $("contactEnergyKey").classList.toggle("hidden", model.contactLoss < 1e-9);
    renderApp();
    drawCurve();
    updatePrinciple();
    updateSound();
    if (student.active) {
      updateStudent();
      updateStudentPaging();
    }
    if (fault.active) updateFault();
    if (!renderer && !student.active)
      document.querySelector(".view-hint").textContent = "二维备用视图 · 换向见电磁原理页";
    updatePageControls();
    updateSupplyPolarity();
  }
  function updateSupplyPolarity() {
    const live = model.terminalU > 0,
      a = state.dir > 0 ? "＋" : "−",
      b = state.dir > 0 ? "−" : "＋";
    for (const [id, name, sign] of [
      ["supplyA", "A", a],
      ["supplyB", "B", b],
      ["robotTermA", "A", a],
      ["robotTermB", "B", b],
    ]) {
      const el = $(id);
      el.textContent = name + " " + (live ? sign : "—");
      el.dataset.pole = live ? (sign === "＋" ? "positive" : "negative") : "off";
    }
    set(
      "supplyVoltage",
      "UAB = " + (live && state.dir > 0 ? "+" : "") + fixed(state.dir * model.terminalU) + " V",
    );
    set("supplyCurrent", "I = " + fixed(model.I, 2) + " A");
    const flow =
      model.I > 0
        ? state.dir > 0
          ? "＋ → A电刷 → 电枢 → B电刷 → −"
          : "＋ → B电刷 → 电枢 → A电刷 → −"
        : "未形成电流 · 接线设定 A" + a + " / B" + b;
    set("supplyFlow", student.active && !model.I ? "电源断开 · 接线以组装面板为准" : flow);
    set("robotCurrentFlow", flow);
    $("supplyFlow").classList.toggle("has-current", model.I > 0);
  }
  function renderApp() {
    const n = model.n / state.gear,
      T = model.T * state.gear * state.eta,
      P = model.P * state.eta;
    set("gearRead", state.gear + " : 1");
    set("outRpm", fixed(n));
    set("outTorque", fixed(T, 2));
    set("outPower", fixed(P));
    $("armSvg").classList.remove("hidden");
    $("armField").classList.remove("hidden");
    set(
      "appCaption",
      "肩关节角速度幅值 " +
        fixed(n * 6) +
        " °/s；等效力臂 " +
        fixed(state.armR, 2) +
        " m 处切向力 " +
        fixed(T / state.armR) +
        " N。",
    );
    set(
      "appScope",
      "仅驱动肩关节，肘腕相对角固定。20°–105° 软限位会切断电压；不计算重力补偿、惯量与反接瞬态。暂停冻结演示时间，稳态读数保留。",
    );
    if (robotScene) robotScene.refresh();
  }
  function arc(cx, cy, r, a, b) {
    const p = (t) => [cx + r * Math.cos(t), cy - r * Math.sin(t)];
    const s = p(a),
      e = p(b);
    return (
      "M" +
      s[0] +
      "," +
      s[1] +
      " A" +
      r +
      "," +
      r +
      " 0 " +
      (Math.abs(b - a) > Math.PI ? 1 : 0) +
      " " +
      (b > a ? 0 : 1) +
      " " +
      e[0] +
      "," +
      e[1]
    );
  }
  function updatePrinciple() {
    const a = state.angle,
      c = Math.cos(a),
      s = Math.sin(a),
      x = 200 + 70 * c,
      y = 145 - 70 * s,
      xb = 400 - x,
      yb = 290 - y;
    const active = model.I > 1e-6,
      atDead = Math.abs(c) < 1e-6,
      sign = state.dir * (c >= 0 ? 1 : -1),
      torque = active ? Math.abs(c) : 0;
    $("currentArrows").style.opacity = active ? 1 : 0;
    $("currentILabel").style.opacity = active ? 1 : 0;
    $("currentLeadA").setAttribute("d", state.dir > 0 ? "M248 239V219" : "M248 219V239");
    $("currentLeadB").setAttribute("d", state.dir > 0 ? "M152 219V239" : "M152 239V219");
    $("coilLink").setAttribute("d", `M${x} ${y}L${xb} ${yb}`);
    $("coilLinkThin").setAttribute("d", `M${x} ${y}L${xb} ${yb}`);
    $("coilEndA").setAttribute("transform", `translate(${x} ${y})`);
    $("coilEndB").setAttribute("transform", `translate(${xb} ${yb})`);
    for (const [id, out] of [
      ["coilEndA", sign > 0],
      ["coilEndB", sign < 0],
    ]) {
      const g = $(id);
      g.querySelector(".out-dot").style.display = active && out && !atDead ? "" : "none";
      g.querySelector(".in-cross").style.display = active && !out && !atDead ? "" : "none";
      g.style.opacity = active ? "1" : ".4";
    }
    const forceLen = active && !atDead ? 21 + Math.min(model.I, 20) * 1.1 : 0;
    const ya = y - sign * (13 + forceLen),
      ybend = yb + sign * (13 + forceLen);
    $("forceA").setAttribute("d", `M${x} ${y - sign * 14}L${x} ${ya}`);
    $("forceB").setAttribute("d", `M${xb} ${yb + sign * 14}L${xb} ${ybend}`);
    $("forceGroup").style.opacity = forceLen ? 1 : 0;
    for (const [id, xx, yy] of [
      ["forceLabelA", x + 12, ya],
      ["forceLabelB", xb + 12, ybend],
    ]) {
      $(id).setAttribute("x", xx);
      $(id).setAttribute("y", yy + 4);
      $(id).style.opacity = forceLen ? 1 : 0;
    }
    $("segmentA").setAttribute(
      "d",
      arc(200, 145, 29, a - Math.PI / 2 + 0.065, a + Math.PI / 2 - 0.065),
    );
    $("segmentB").setAttribute(
      "d",
      arc(200, 145, 29, a + Math.PI / 2 + 0.065, a + (3 * Math.PI) / 2 - 0.065),
    );
    $("torqueArc").setAttribute(
      "d",
      state.dir > 0 ? arc(200, 145, 103, -0.72, 0.25) : arc(200, 145, 103, 0.25, -0.72),
    );
    $("torqueArc").style.opacity = torque > 0.001 ? 1 : 0;
    set("torqueLabel", active ? (state.dir > 0 ? "τ ↺" : "τ ↻") : "τ = 0");
    set("batterySignLeft", state.dir > 0 ? "−" : "+");
    set("batterySignRight", state.dir > 0 ? "+" : "−");
    $("batterySignLeft").setAttribute("fill", state.dir > 0 ? "#7faafa" : "#ef8092");
    $("batterySignRight").setAttribute("fill", state.dir > 0 ? "#ef8092" : "#7faafa");
    $("leadA").setAttribute("stroke", state.dir > 0 ? "#ef8092" : "#7faafa");
    $("leadB").setAttribute("stroke", state.dir > 0 ? "#7faafa" : "#ef8092");
    const deg = ((((a * 180) / Math.PI) % 360) + 360) % 360;
    set("angleValue", Math.round(deg) + "°");
    $("rotorAngle").value = deg;
    $("momentBar").style.width = 100 * torque + "%";
    set("momentLabel", "单线圈相对转矩 " + Math.round(100 * torque) + "%");
    set(
      "commText",
      !active
        ? "未通电：没有电流与电磁力。永磁定子的磁场仍然存在。"
        : atDead
          ? "死点：两侧力对转轴的力臂为零。理想换向正在交换接线。"
          : "每过半周，换向器交换线圈接线，让转矩保持" +
            (state.dir > 0 ? "逆时针" : "顺时针") +
            "。",
    );
  }
  const svgEl = (n, a = {}) => {
    const e = document.createElementNS("http://www.w3.org/2000/svg", n);
    for (const k in a) e.setAttribute(k, a[k]);
    return e;
  };
  function drawCurve() {
    const svg = $("curve"),
      W = svg.clientWidth;
    if (!W) return;
    const H = 245,
      L = 46,
      R = 48,
      T = 28,
      B = 40,
      w = W - L - R,
      h = H - T - B;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const maxT = Math.max(model.stall, 0.1),
      n0 = solve(state.voltage, 0).n,
      maxN = Math.max(1000, Math.ceil(n0 / 1000) * 1000),
      pmax = solve(state.voltage, model.stall / 2).P,
      maxP = Math.max(25, Math.ceil(pmax / 25) * 25),
      px = (v) => L + (w * v) / maxT,
      py = (v) => T + h - (h * v) / maxN,
      pp = (v) => T + h - (h * v) / maxP;
    const add = (n, a, t) => {
      const e = svgEl(n, a);
      if (t !== undefined) e.textContent = t;
      svg.appendChild(e);
      return e;
    };
    for (let j = 0; j <= 4; j++) {
      const y = T + (h * j) / 4;
      add("path", { d: `M${L} ${y}H${W - R}`, stroke: "#263747", "stroke-width": 0.8 });
      add(
        "text",
        { x: L - 8, y: y + 4, fill: "#8fa5b7", "font-size": 10, "text-anchor": "end" },
        Math.round(maxN * (1 - j / 4)),
      );
      add(
        "text",
        { x: W - R + 8, y: y + 4, fill: "#8fa5b7", "font-size": 10 },
        fixed(maxP * (1 - j / 4), maxP < 100 ? 1 : 0),
      );
    }
    for (let i = 0; i <= 4; i++) {
      const t = (i * maxT) / 4;
      add(
        "text",
        { x: px(t), y: H - B + 19, fill: "#8fa5b7", "font-size": 10, "text-anchor": "middle" },
        fixed(t, 2),
      );
    }
    add("text", { x: L, y: 13, fill: "#58dfed", "font-size": 10 }, "n / rpm");
    add(
      "text",
      { x: W - R, y: 13, fill: "#bcf386", "font-size": 10, "text-anchor": "end" },
      "P轴 / W",
    );
    add(
      "text",
      { x: W / 2, y: H - 3, fill: "#a8bac8", "font-size": 11, "text-anchor": "middle" },
      "轴端输出转矩 T轴 / N·m",
    );
    let dn = "",
      dp = "";
    for (let i = 0; i <= 80; i++) {
      const t = (model.stall * i) / 80,
        m = solve(state.voltage, t);
      dn += (i ? "L" : "M") + px(t) + "," + py(m.n);
      dp += (i ? "L" : "M") + px(t) + "," + pp(m.P);
    }
    add("path", { d: dn, fill: "none", stroke: "#58dfed", "stroke-width": 2 });
    add("path", { d: dp, fill: "none", stroke: "#bcf386", "stroke-width": 2 });
    add("path", {
      d: `M${px(model.T)} ${T}V${H - B}`,
      stroke: "#6a8599",
      "stroke-width": 1,
      "stroke-dasharray": "3 5",
    });
    add("circle", {
      cx: px(model.T),
      cy: py(model.n),
      r: 4,
      fill: "#58dfed",
      stroke: "#10202c",
      "stroke-width": 2,
    });
    add("circle", {
      cx: px(model.T),
      cy: pp(model.P),
      r: 4,
      fill: "#bcf386",
      stroke: "#10202c",
      "stroke-width": 2,
    });
    const hit = add("rect", {
      x: L,
      y: T,
      width: w,
      height: h,
      fill: "transparent",
      "data-chart-hit": "true",
    });
    plotGeometry = { W, H, L, R, T, B, w, h, maxT, maxN, maxP };
    hit.addEventListener("pointermove", plotHover);
    hit.addEventListener("pointerleave", () => {
      $("plotTooltip").style.display = "none";
    });
    hit.addEventListener("pointerdown", plotHover);
  }
  function plotHover(e) {
    const g = plotGeometry,
      r = $("curve").getBoundingClientRect(),
      t = clamp((e.clientX - r.left - g.L) / g.w, 0, 1) * g.maxT,
      m = solve(state.voltage, Math.min(t, model.stall)),
      tip = $("plotTooltip");
    tip.innerHTML =
      "T轴 <b>" +
      fixed(Math.min(t, model.stall), 3) +
      " N·m</b><br>转速 " +
      fixed(m.n, 0) +
      " rpm　功率 " +
      fixed(m.P) +
      " W";
    tip.style.display = "block";
    tip.style.top = "35px";
    tip.style.left =
      clamp(e.clientX - $("curve").parentElement.getBoundingClientRect().left - 30, 10, g.W - 190) +
      "px";
  }
  new ResizeObserver(() => drawCurve()).observe($("curve"));
  // Procedural motor geometry. All components are closed solids; depth is resolved by WebGL.
  const canvas = $("motorCanvas");
  let gl = null,
    renderer = null;
  const col = {
    steel: [0.29, 0.38, 0.46],
    shaft: [0.63, 0.73, 0.8],
    iron: [0.25, 0.31, 0.36],
    copper: [0.8, 0.41, 0.16],
    copperHi: [0.98, 0.63, 0.3],
    north: [0.65, 0.27, 0.36],
    south: [0.28, 0.44, 0.72],
    brush: [0.28, 0.35, 0.39],
    black: [0.055, 0.085, 0.11],
    cyan: [0.21, 0.7, 0.77],
    base: [0.12, 0.2, 0.27],
    gold: [0.71, 0.57, 0.32],
  };
  const V = {
    add: (a, b) => a.map((x, i) => x + b[i]),
    sub: (a, b) => a.map((x, i) => x - b[i]),
    scale: (a, n) => a.map((x) => x * n),
    dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
    cross: (a, b) => [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ],
    norm: (a) => {
      const n = Math.hypot(...a);
      return a.map((x) => x / (n || 1));
    },
  };
  function initRenderer() {
    try {
      gl = canvas.getContext("webgl", {
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      if (!gl) throw Error("WebGL unavailable");
      const vs = `attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aRot;attribute float aPart;attribute float aBuild;uniform float uBuild;uniform float uNewGroup;uniform float uFlash;uniform mat4 uVP;uniform float uAngle;uniform float uFocus;uniform float uIsolate;varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 p=aP,n=aN;if(aRot>.5){float c=cos(uAngle),s=sin(uAngle);p.yz=mat2(c,s,-s,c)*p.yz;n.yz=mat2(c,s,-s,c)*n.yz;}float dim=(uFocus>.5&&abs(aPart-uFocus)>.1)?.34:1.;vColor=aC*dim;if(abs(aBuild-uNewGroup)<.1)vColor=mix(vColor,vec3(.35,.85,.88),uFlash*.35);vNormal=n;vWorld=p;gl_Position=uVP*vec4(p,1.);if(uBuild>=0.&&aBuild>uBuild+.1)gl_Position=vec4(2.,2.,2.,1.);if(uIsolate>.5&&abs(aPart-uIsolate)>.1)gl_Position=vec4(2.,2.,2.,1.);}`;
      const fs = `precision mediump float;varying vec3 vColor;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 N=normalize(vNormal);vec3 L=normalize(vec3(.25,.35,1.));float d=max(0.,dot(N,L));float e=max(0.,dot(N,normalize(vec3(-.6,.7,.3))));vec3 color=vColor*(.38+.66*d+.12*e);float fog=clamp(length(vWorld)/1000.,0.,.15);gl_FragColor=vec4(mix(color,vec3(.055,.09,.12),fog),1.);}`;
      function sh(t, s) {
        const a = gl.createShader(t);
        gl.shaderSource(a, s);
        gl.compileShader(a);
        if (!gl.getShaderParameter(a, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(a));
        return a;
      }
      const program = gl.createProgram();
      gl.attachShader(program, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(program, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const stride = 12 * 4;
      let offset = 0;
      for (const [name, num] of [
        ["aP", 3],
        ["aN", 3],
        ["aC", 3],
        ["aRot", 1],
        ["aPart", 1],
        ["aBuild", 1],
      ]) {
        const a = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(a);
        gl.vertexAttribPointer(a, num, gl.FLOAT, false, stride, offset * 4);
        offset += num;
      }
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      renderer = {
        program,
        buffer,
        vp: gl.getUniformLocation(program, "uVP"),
        angle: gl.getUniformLocation(program, "uAngle"),
        focus: gl.getUniformLocation(program, "uFocus"),
        isolate: gl.getUniformLocation(program, "uIsolate"),
        isolatedPart: 0,
        build: gl.getUniformLocation(program, "uBuild"),
        newGroup: gl.getUniformLocation(program, "uNewGroup"),
        flash: gl.getUniformLocation(program, "uFlash"),
        count: 0,
        yaw: 1.05,
        elev: 0.5,
        zoom: 1.35,
        zoomGoal: 1.35,
        target: [-2, 0, -13],
        targetGoal: [-2, 0, -13],
        selectedComponent: "all",
        cameraAt: 0,
      };
      rebuildMotor();
    } catch (err) {
      $("fallback").style.display = "block";
      canvas.style.visibility = "hidden";
      set("renderBadge", "二维结构备用视图");
      set(
        "partText",
        "当前浏览器未启用三维渲染，已使用二维结构图；可切换到电磁原理页查看受力与换向，数据计算仍可使用。",
      );
      console.info("Motor fallback:", err.message);
    }
  }
  function rebuildMotor() {
    if (!renderer) return;
    const verts = [];
    let buildGroup = 0;
    function tri(a, b, c, color, rot = 0, part = 0) {
      const n = V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
      for (const p of [a, b, c]) verts.push(...p, ...n, ...color, rot, part, buildGroup);
    }
    function quad(a, b, c, d, color, rot = 0, part = 0) {
      tri(a, b, c, color, rot, part);
      tri(a, c, d, color, rot, part);
    }
    function box(x, y, z, dx, dy, dz, color, rot = 0, part = 0) {
      const p = [];
      for (const xx of [x - dx / 2, x + dx / 2])
        for (const yy of [y - dy / 2, y + dy / 2])
          for (const zz of [z - dz / 2, z + dz / 2]) p.push([xx, yy, zz]);
      for (const q of [
        [0, 1, 3, 2],
        [4, 6, 7, 5],
        [0, 4, 5, 1],
        [2, 3, 7, 6],
        [0, 2, 6, 4],
        [1, 5, 7, 3],
      ])
        quad(...q.map((i) => p[i]), color, rot, part);
    }
    function tube(x1, x2, r, ri, color, rot = 0, part = 0, a0 = 0, a1 = TAU, segs = 48) {
      const p = (x, rr, a) => [x, rr * Math.cos(a), rr * Math.sin(a)];
      for (let i = 0; i < segs; i++) {
        const a = a0 + ((a1 - a0) * i) / segs,
          b = a0 + ((a1 - a0) * (i + 1)) / segs;
        quad(p(x1, r, b), p(x2, r, b), p(x2, r, a), p(x1, r, a), color, rot, part);
        if (ri > 0) quad(p(x1, ri, a), p(x2, ri, a), p(x2, ri, b), p(x1, ri, b), color, rot, part);
        quad(p(x1, ri, b), p(x1, r, b), p(x1, r, a), p(x1, ri, a), color, rot, part);
        quad(p(x2, ri, a), p(x2, r, a), p(x2, r, b), p(x2, ri, b), color, rot, part);
      }
      if (a1 - a0 < TAU - 0.001)
        for (const a of [a0, a1])
          quad(
            p(x1, ri, a),
            p(x2, ri, a),
            p(x2, r, a),
            p(x1, r, a),
            part === 1 ? color : col.gold,
            rot,
            part,
          );
    }
    function rod(a, b, r, color, rot = 0, part = 0) {
      const d = V.sub(b, a),
        u = V.norm(
          V.cross(V.norm(d), Math.abs(d[2] / Math.hypot(...d)) > 0.9 ? [0, 1, 0] : [0, 0, 1]),
        ),
        v = V.cross(V.norm(d), u);
      const p = (o, t) => V.add(o, V.add(V.scale(u, r * Math.cos(t)), V.scale(v, r * Math.sin(t))));
      for (let i = 0; i < 10; i++) {
        const t = (i * TAU) / 10,
          tt = ((i + 1) * TAU) / 10;
        quad(p(a, tt), p(b, tt), p(b, t), p(a, t), color, rot, part);
        tri(a, p(a, tt), p(a, t), color, rot, part);
        tri(b, p(b, t), p(b, tt), color, rot, part);
      }
    }
    // Plinth, collars, feet, saddles and fasteners.
    box(-2, 0, -78, 292, 147, 11, col.base);
    box(-2, 0, -84, 281, 136, 3, col.black);
    for (const x of [-123, 123])
      for (const y of [-56, 56]) {
        rod([x, y, -91], [x, y, -84], 7, col.black);
        rod([x, y, -84], [x, y, -80], 8, col.steel);
        rod([x, y, -78], [x, y, -71], 3, col.shaft);
      }
    for (const x of [-87, 84]) {
      box(x, 0, -59, 21, 102, 27, col.steel);
      for (const y of [-49, 49]) {
        rod([x, y, -70], [x, y, -59], 3.7, col.shaft);
        box(x, y, -58, 6, 1, 1, col.black);
      }
    }
    // Radial section only changes the visible shell and caps, never the physical model.
    const opening = (state.cut / 100) * 4.4,
      center = 0.6,
      start = center + opening / 2,
      end = center + TAU - opening / 2;
    if (!state.hidden) {
      tube(
        -117,
        108,
        62,
        57,
        col.steel,
        0,
        0,
        start,
        end,
        Math.max(24, Math.round((end - start) * 15)),
      );
      buildGroup = 3;
      tube(-126, -116, 62, 10, col.steel, 0, 0, start, end, 48);
      tube(108, 119, 62, 10, col.steel, 0, 0, start, end, 48);
      for (const x of [-110, 102]) tube(x, x + 3, 63, 62, col.shaft, 0, 0, start, end, 48);
      for (const a of [0.8, 2.35, 3.9, 5.5]) {
        const diff = Math.atan2(Math.sin(a - center), Math.cos(a - center));
        if (Math.abs(diff) < opening / 2) continue;
        const y = 53 * Math.cos(a),
          z = 53 * Math.sin(a);
        rod([-129, y, z], [123, y, z], 2.3, col.shaft);
        rod([120, y, z], [125, y, z], 4.3, col.shaft);
      }
    }
    buildGroup = 1;
    // Two opposed field magnets with mounting seats and a real radial air gap.
    for (const [a, c] of [
      [Math.PI, col.north],
      [0, col.south],
    ]) {
      const trim =
        a === 0 && !state.hidden ? (state.cut / 100) * 1.05 : state.hidden && a === 0 ? 0.9 : 0;
      tube(-64, 76, 57, 49, c, 0, 1, a - 0.64, a + 0.64 - trim, 22);
      tube(-68, 80, 58, 57, col.black, 0, 0, a - 0.7, a + 0.7 - trim, 22);
    }
    buildGroup = 2;
    // Steel shaft, armature stack, two slots and a single equivalent copper winding.
    tube(-139, 176, 8, 0, col.shaft, 1, 2, 0, TAU, 32);
    box(150, 8, 0, 28, 4, 4, col.steel, 1, 2);
    tube(-73, 75, 35, 8, col.iron, 1, 2, 0, TAU, 56);
    for (let x = -70; x <= 72; x += 6) tube(x, x + 0.7, 35.35, 34.7, col.steel, 1, 2, 0, TAU, 40);
    for (const y of [-36, 36]) box(1, y, 0, 150, 2, 17, col.black, 1, 2);
    for (let k = 0; k < 8; k++) {
      const phase = (k - 3.5) * 0.038,
        r = 41,
        xa = -75 - k * 1.1,
        xb = 77 + k * 1.1,
        wireColor = k % 2 ? col.copper : col.copperHi;
      const yy = r * Math.cos(phase),
        zz = r * Math.sin(phase);
      rod([xa, yy, zz], [xb, yy, zz], 0.43, wireColor, 1, 2);
      rod([xa, -yy, -zz], [xb, -yy, -zz], 0.43, wireColor, 1, 2);
      for (let j = 0; j < 22; j++) {
        const a = phase + (j * Math.PI) / 22,
          b = phase + ((j + 1) * Math.PI) / 22;
        rod(
          [xb, r * Math.cos(a), r * Math.sin(a)],
          [xb, r * Math.cos(b), r * Math.sin(b)],
          0.43,
          wireColor,
          1,
          2,
        );
        if (k < 7) {
          const aa = phase + Math.PI + (j * (Math.PI + 0.038)) / 22,
            bb = phase + Math.PI + ((j + 1) * (Math.PI + 0.038)) / 22;
          rod(
            [xa - (1.1 * j) / 22, r * Math.cos(aa), r * Math.sin(aa)],
            [xa - (1.1 * (j + 1)) / 22, r * Math.cos(bb), r * Math.sin(bb)],
            0.43,
            wireColor,
            1,
            2,
          );
        }
      }
    }
    // A two-segment split-ring commutator on its insulating hub.
    tube(-107, -83, 21, 8, col.black, 1, 3, 0, TAU, 32);
    for (const a of [0, Math.PI])
      tube(
        -108,
        -83,
        25,
        20,
        col.copperHi,
        1,
        3,
        a - Math.PI / 2 + 0.045,
        a + Math.PI / 2 - 0.045,
        32,
      );
    rod(
      [-83, 24, 0],
      [-75, 41 * Math.cos(-3.5 * 0.038), 41 * Math.sin(-3.5 * 0.038)],
      0.43,
      col.copper,
      1,
      3,
    );
    rod(
      [-83, -24, 0],
      [-82.7, -41 * Math.cos(3.5 * 0.038), -41 * Math.sin(3.5 * 0.038)],
      0.43,
      col.copper,
      1,
      3,
    );
    buildGroup = 4;
    // Stationary brush pairs touching the ring, holders, compression springs and terminals.
    for (const s of [-1, 1]) {
      box(-96, s * 29, 0, 15, 8, 12, col.brush, 0, 4);
      box(-96, s * 38, 0, 20, 12, 18, col.gold, 0, 4);
      box(-96, s * 39, 0, 16, 15, 14, col.black, 0, 4);
      for (let j = 0; j < 8; j++)
        rod(
          [-96, s * (44 + j * 0.8), -3],
          [-96, s * (44 + (j + 0.5) * 0.8), 3],
          0.7,
          col.shaft,
          0,
          4,
        );
      box(-96, s * 53, 0, 19, 6, 17, col.steel, 0, 4);
      rod([-96, s * 54, 0], [-96, s * 68, 0], 3, col.copper, 0, 4);
      box(-96, s * 68, 0, 17, 7, 14, s > 0 ? col.north : col.south, 0, 4);
      rod([-105, s * 68, 0], [-87, s * 68, 0], 2, col.shaft, 0, 4);
      const color = s === state.dir ? col.north : col.south;
      rod([-96, s * 70, 0], [-151, s * 80, -25], 1.9, color, 0, 4);
      rod([-151, s * 80, -25], [-163, s * 64, -65], 1.9, color, 0, 4);
    }
    buildGroup = 3;
    // Two assembled ball bearings; races, individual balls and retainers share an axis.
    for (const x of [-121, 113]) {
      tube(x - 4, x + 4, 18, 14, col.steel, 0, 0, 0, TAU, 36);
      tube(x - 4, x + 4, 10.5, 8.2, col.shaft, 0, 0, 0, TAU, 32);
      for (let j = 0; j < 6; j++) {
        const a = (j * TAU) / 6;
        rod(
          [x - 2.2, 12.25 * Math.cos(a), 12.25 * Math.sin(a)],
          [x + 2.2, 12.25 * Math.cos(a), 12.25 * Math.sin(a)],
          2.3,
          col.shaft,
        );
      }
      tube(x + 4, x + 5.2, 16, 10.5, col.gold, 0, 0, 0, TAU, 32);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    renderer.count = verts.length / 12;
  }
  function perspective(f, aspect, n, fa) {
    const q = 1 / Math.tan(f / 2);
    return [
      q / aspect,
      0,
      0,
      0,
      0,
      q,
      0,
      0,
      0,
      0,
      (fa + n) / (n - fa),
      -1,
      0,
      0,
      (2 * fa * n) / (n - fa),
      0,
    ];
  }
  function lookAt(eye, target) {
    const z = V.norm(V.sub(eye, target)),
      x = V.norm(V.cross([0, 0, 1], z)),
      y = V.cross(z, x);
    return [
      x[0],
      y[0],
      z[0],
      0,
      x[1],
      y[1],
      z[1],
      0,
      x[2],
      y[2],
      z[2],
      0,
      -V.dot(x, eye),
      -V.dot(y, eye),
      -V.dot(z, eye),
      1,
    ];
  }
  function matmul(a, b) {
    const c = new Float32Array(16);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        for (let k = 0; k < 4; k++) c[i * 4 + j] += a[k * 4 + j] * b[i * 4 + k];
    return c;
  }
  function drawMotor() {
    if (!renderer || document.hidden) return;
    const dpr = Math.min(devicePixelRatio || 1, 1.7),
      W = Math.round(canvas.clientWidth * dpr),
      H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const r = renderer,
      now = performance.now(),
      dt = Math.min(0.05, (now - (r.cameraAt || now - 16)) / 1000);
    r.cameraAt = now;
    const follow = reduced ? 1 : 1 - Math.exp(-dt / 0.12);
    r.zoom += (r.zoomGoal - r.zoom) * follow;
    r.target = r.target.map((v, i) => v + (r.targetGoal[i] - v) * follow);
    const dist = (520 / r.zoom) * Math.max(1, 1.7 / (W / H)),
      target = r.target,
      eye = [
        target[0] + dist * Math.cos(r.elev) * Math.cos(r.yaw),
        target[1] + dist * Math.cos(r.elev) * Math.sin(r.yaw),
        target[2] + dist * Math.sin(r.elev),
      ];
    const vp = matmul(perspective(0.66, W / H, 1, 2000), lookAt(eye, target));
    gl.uniformMatrix4fv(r.vp, false, vp);
    gl.uniform1f(r.angle, state.angle);
    gl.uniform1f(r.build, student.active ? student.installed : -1);
    gl.uniform1f(r.newGroup, student.active ? student.flashGroup : -9);
    gl.uniform1f(
      r.flash,
      reduced ? 0 : Math.max(0, 1 - (performance.now() - student.flashAt) / 650),
    );
    const ids = { all: 0, magnet: 1, rotor: 2, comm: 3, brush: 4 };
    gl.uniform1f(r.focus, ids[state.part]);
    gl.uniform1f(r.isolate, r.isolatedPart || 0);
    gl.drawArrays(gl.TRIANGLES, 0, r.count);
    updateSceneLabels(vp, canvas.clientWidth, canvas.clientHeight);
  }
  let dragging = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!renderer) return;
    dragging = { x: e.clientX, y: e.clientY, yaw: renderer.yaw, elev: renderer.elev };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || !renderer) return;
    renderer.yaw = dragging.yaw - (e.clientX - dragging.x) * 0.006;
    renderer.elev = clamp(dragging.elev + (e.clientY - dragging.y) * 0.005, -0.12, 1.2);
    drawMotor();
  });
  const release = () => (dragging = null);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (!renderer) return;
      e.preventDefault();
      renderer.zoomGoal = clamp(renderer.zoomGoal * Math.exp(-e.deltaY * 0.001), 0.65, 3.6);
      drawMotor();
    },
    { passive: false },
  );
  canvas.addEventListener("keydown", (e) => {
    if (!renderer) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      renderer.yaw += e.key === "ArrowLeft" ? 0.08 : e.key === "ArrowRight" ? -0.08 : 0;
      renderer.elev = clamp(
        renderer.elev + (e.key === "ArrowUp" ? 0.05 : e.key === "ArrowDown" ? -0.05 : 0),
        -0.12,
        1.2,
      );
      drawMotor();
    }
  });
  new ResizeObserver(drawMotor).observe(canvas);
  $("viewReset").textContent = "↺ 返回整机";
  $("viewReset").onclick = () => {
    if (renderer) {
      renderer.yaw = 1.05;
      renderer.elev = 0.5;
      renderer.isolatedPart = 0;
    }
    focusMainPart("all");
  };
  // Sound is generated locally and only starts following an explicit user gesture.
  let audio = null;
  async function toggleSound() {
    if (state.sound) {
      state.sound = false;
      if (audio) {
        audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
        await audio.ctx.suspend();
      }
    } else {
      try {
        if (!audio) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) throw Error("AudioContext unavailable");
          const ctx = new AC(),
            master = ctx.createGain();
          master.gain.value = 0;
          master.connect(ctx.destination);
          const osc = ctx.createOscillator(),
            gain = ctx.createGain();
          osc.type = "sawtooth";
          gain.gain.value = 0.22;
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = 1200;
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(master);
          const hum = ctx.createOscillator(),
            hg = ctx.createGain();
          hum.type = "sine";
          hg.gain.value = 0.35;
          hum.connect(hg);
          hg.connect(master);
          const count = ctx.sampleRate * 2,
            buffer = ctx.createBuffer(1, count, ctx.sampleRate),
            d = buffer.getChannelData(0);
          for (let i = 0; i < count; i++) d[i] = (Math.random() * 2 - 1) * 0.1;
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          const nf = ctx.createBiquadFilter();
          nf.type = "bandpass";
          nf.frequency.value = 2400;
          const ng = ctx.createGain();
          ng.gain.value = 0.12;
          noise.connect(nf);
          nf.connect(ng);
          ng.connect(master);
          osc.start();
          hum.start();
          noise.start();
          audio = { ctx, master, osc, hum, filter, ng };
        }
        await audio.ctx.resume();
        state.sound = true;
        toast("音效已开启 · 合成示意，音高随真实转速变化");
      } catch (e) {
        toast("浏览器未能启用音频；请检查音频权限");
        state.sound = false;
      }
    }
    pressed("soundBtn", state.sound);
    set("soundBtn", state.sound ? "♫ 音效开启" : "♫ 音效关闭");
    $("soundPop").style.display = state.sound ? "flex" : "none";
    updateSound();
  }
  function updateSound() {
    if (!audio) return;
    const t = audio.ctx.currentTime,
      r = model.n / 60;
    audio.master.gain.setTargetAtTime(
      state.sound && !state.paused && model.n > 0.1 ? state.volume * 0.22 : 0,
      t,
      0.07,
    );
    audio.osc.frequency.setTargetAtTime(Math.max(25, r * 4), t, 0.07);
    audio.hum.frequency.setTargetAtTime(Math.max(15, r), t, 0.07);
    audio.filter.frequency.setTargetAtTime(500 + r * 12, t, 0.1);
    audio.ng.gain.setTargetAtTime(0.06 + Math.min(model.I, 20) * 0.005, t, 0.1);
  }
  $("playback").onchange = (e) => {
    state.slow = +e.target.value;
    render();
  };
  $("soundBtn").onclick = toggleSound;
  const annotationInputs = [...document.querySelectorAll("[data-annotation]")];
  let savedAnnotations = null;
  function updateAnnotations() {
    state.annotationsHidden = annotationInputs.every((input) => !input.checked);
    document.body.classList.toggle("annotations-hidden", state.annotationsHidden);
    for (const input of annotationInputs)
      document.body.classList.toggle("hide-annotation-" + input.dataset.annotation, !input.checked);
    pressed("annotationsBtn", state.annotationsHidden);
    set("annotationsBtn", state.annotationsHidden ? "显示标注" : "隐藏标注");
  }
  $("annotationsBtn").onclick = () => {
    if (!state.annotationsHidden) {
      savedAnnotations = annotationInputs.map((input) => input.checked);
      annotationInputs.forEach((input) => (input.checked = false));
    } else {
      annotationInputs.forEach((input, i) => (input.checked = savedAnnotations?.[i] ?? true));
    }
    updateAnnotations();
  };
  annotationInputs.forEach((input) => input.addEventListener("change", updateAnnotations));
  $("annotationsShowAll").onclick = () => {
    annotationInputs.forEach((input) => (input.checked = true));
    updateAnnotations();
  };
  function closeAnnotationSettings() {
    $("annotationSettings").hidden = true;
    $("annotationSettingsBtn").setAttribute("aria-expanded", "false");
  }
  $("annotationSettingsBtn").onclick = () => {
    const show = $("annotationSettings").hidden;
    $("annotationSettings").hidden = !show;
    $("annotationSettingsBtn").setAttribute("aria-expanded", String(show));
  };
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".annotation-controls")) closeAnnotationSettings();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("annotationSettings").hidden) {
      closeAnnotationSettings();
      $("annotationSettingsBtn").focus();
    }
  });
  $("volume").oninput = (e) => {
    state.volume = +e.target.value / 100;
    updateSound();
  };
  function setPause(p) {
    state.paused = p;
    render();
    drawMotor();
  }
  $("emToggle").onclick = () => {
    state.showEM = !state.showEM;
    pressed("emToggle", state.showEM);
    drawMotor();
    if (robotScene) robotScene.draw();
  };
  $("emAngle").onchange = (e) => {
    if (e.target.value === "run") {
      state.paused = false;
    } else {
      state.angle = (+e.target.value * Math.PI) / 180;
      state.paused = true;
    }
    render();
    drawMotor();
  };
  $("pauseBtn").onclick = () => setPause(!state.paused);
  $("stepBtn").onclick = () => {
    state.paused = true;
    state.angle = (state.angle + (state.dir * Math.PI) / 12 + TAU) % TAU;
    render();
    drawMotor();
  };
  $("rotorAngle").oninput = (e) => {
    state.paused = true;
    state.angle = (+e.target.value * Math.PI) / 180;
    render();
    drawMotor();
  };
  $("voltage").oninput = (e) => {
    state.voltage = +e.target.value;
    render();
  };
  $("load").oninput = (e) => {
    state.load = +e.target.value;
    render();
  };
  function direction(d) {
    state.dir = d;
    rebuildMotor();
    render();
    drawMotor();
  }
  $("forwardBtn").onclick = () => direction(1);
  $("reverseBtn").onclick = () => direction(-1);
  function section(v, hidden = false) {
    state.cut = v;
    state.hidden = hidden;
    $("cutaway").value = v;
    rebuildMotor();
    render();
    drawMotor();
  }
  $("cutaway").oninput = (e) => section(+e.target.value);
  $("cutMode").onclick = () => section(65);
  $("wholeMode").onclick = () => section(0);
  $("wireMode").onclick = () => section(state.cut, !state.hidden);
  const parts = {
    all: ["观察电机内部", "定子固定，电枢、线圈与换向器同轴旋转；碳刷保持静止并接触换向器。"],
    magnet: [
      "永磁定子",
      "红色磁体为 N 极，蓝色磁体为 S 极；气隙中磁场从 N 指向 S。改变电源极性不会交换永磁磁极。",
    ],
    rotor: [
      "电枢与铜线圈",
      "铜绕组通电后在气隙磁场中受力，铁芯为磁通提供通路；转轴把电磁转矩传给负载。",
    ],
    comm: [
      "机械换向器",
      "两片铜分裂环随线圈转动，绝缘间隙分开两片。固定电刷使线圈每转半周交换一次电流方向。",
    ],
    brush: [
      "碳刷与接线端",
      "固定碳刷压在旋转换向器上，把电流引入电枢；弹簧保持接触压力。A、B 是电源端子，与 N、S 磁极不同。",
    ],
  };
  document
    .querySelectorAll("[data-part]")
    .forEach((b) => (b.onclick = () => focusMainPart(b.dataset.part)));
  function syncInputs() {
    for (const [id, key] of [
      ["voltage", "voltage"],
      ["load", "load"],
      ["cutaway", "cut"],
      ["gearRatio", "gear"],
    ])
      $(id).value = state[key];
    $("playback").value = state.slow;
    $("gearEff").value = Math.round(state.eta * 100);
    $("armRadius").value = state.armR;
  }
  document.querySelectorAll("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        const key = b.dataset.preset;
        state.voltage = 24;
        state.paused = false;
        if (key === "noLoad") {
          state.load = 0;
          set(
            "lessonText",
            "空载：轴输出转矩和轴机械功率都为零，但仍有小电流，用来克服模型中的粘性摩擦。",
          );
        } else if (key === "loaded") {
          state.load = 0.75;
          set(
            "lessonText",
            "加大负载：与初始 0.42 N·m 相比，电流增加、转速降低；越过功率峰值后继续加负载，轴功率会下降。",
          );
        } else if (key === "stall") {
          state.load = 1.2;
          set(
            "lessonText",
            "堵转：24 V 下电流为 20 A，电磁转矩为 1.20 N·m；转速和轴功率为零，480 W 电输入全部变为铜耗。",
          );
        } else {
          state.load = 0.42;
          state.dir = -state.dir;
          set(
            "lessonText",
            "反接电源：A / B 极性互换，N / S 保持不变。电流与电磁力反向，所以电机转向反转；这里比较两个稳态。",
          );
        }
        syncInputs();
        rebuildMotor();
        render();
        drawMotor();
      }),
  );
  $("resetBtn").onclick = () => {
    Object.assign(state, {
      voltage: 24,
      load: 0.42,
      dir: 1,
      cut: 65,
      hidden: false,
      paused: reduced,
      angle: Math.PI / 6,
      slow: 133,
      gear: 80,
      eta: 0.85,
      armR: 0.3,
      app: "arm",
      part: "all",
    });
    syncInputs();
    document
      .querySelectorAll("[data-part]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.part === "all")));
    set("partName", parts.all[0]);
    set("partText", parts.all[1]);
    set("lessonText", "先拖动电机查看内部，再调高负载：观察电流上升、转速下降，轴功率如何变化。");
    $("viewReset").click();
    rebuildMotor();
    render();
  };
  $("gearRatio").oninput = (e) => {
    state.gear = +e.target.value;
    renderApp();
  };
  for (const [id, key, min, max, mul] of [
    ["gearEff", "eta", 50, 100, 0.01],
    ["armRadius", "armR", 0.05, 1, 1],
  ]) {
    $(id).oninput = (e) => {
      const v = +e.target.value;
      if (e.target.value === "" || !Number.isFinite(v)) return;
      state[key] = clamp(v, min, max) * mul;
      renderApp();
    };
    $(id).onchange = (e) => {
      e.target.value = state[key] / mul;
    };
  }
  $("fullscreenBtn").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (e) {
      toast("当前环境未开放全屏，可用浏览器 F11 演示");
    }
  };
  document.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      ["INPUT", "BUTTON", "SELECT", "TEXTAREA", "SUMMARY", "A"].includes(
        document.activeElement.tagName,
      )
    )
      return;
    if (currentScreen === "robot") {
      if (e.code === "Space") {
        e.preventDefault();
        $("robotPlay").click();
        return;
      }
      if (e.key.toLowerCase() === "r") {
        $("robotReverse").click();
        return;
      }
      if (e.key.toLowerCase() === "c") {
        $("robotCut").click();
        return;
      }
    }
    if (e.code === "Space") {
      e.preventDefault();
      setPause(!state.paused);
    } else if (e.key.toLowerCase() === "r" && !student.active && !fault.active)
      direction(-state.dir);
    else if (e.key.toLowerCase() === "c") section(state.cut ? 0 : 65);
    else if (e.key.toLowerCase() === "s") toggleSound();
  });
  let inView = true;
  new IntersectionObserver(
    (es) => {
      inView = es[es.length - 1].isIntersecting;
    },
    { rootMargin: "100px" },
  ).observe($("stage"));
  let prev = 0,
    uiClock = 0;
  function tick(now) {
    const dt = Math.min((now - (prev || now)) / 1000, 0.05);
    prev = now;
    if (!document.hidden) {
      if (!state.paused && !reduced && model.I > 1e-6)
        chargeTime += dt * (0.6 + Math.min(1.5, Math.sqrt(model.I) * 0.18));
      if (currentScreen === "principle") updatePrincipleParticles();
      if (!state.paused && model.n > 0) {
        const delta = ((state.dir * displayRPM() * TAU) / 60) * dt;
        state.angle = (state.angle + delta + TAU) % TAU;
        appPhase += delta / state.gear;
        uiClock += dt;
        if (uiClock > 0.035) {
          updatePrinciple();
          uiClock = 0;
        }
      }
      if (inView) drawMotor();
      if (robotScene) robotScene.advance(dt);
    }
    requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => {
    prev = 0;
    if (audio) {
      if (document.hidden) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.04);
      else updateSound();
    }
  });
  // Classroom task: assemble a de-energized teaching motor, wire it, then predict and verify.
  const KIT = [
    {
      id: "stator",
      name: "永磁定子",
      short: "定子",
      detail: "N / S 磁体固定在磁轭内，为转子气隙提供磁场。电源反接不会改变永磁体的磁极。",
    },
    {
      id: "armature",
      name: "电枢总成",
      short: "电枢",
      detail: "转轴、铜绕组和分裂环换向器已经构成同一总成；换向器须与线圈连接并一起转动。",
    },
    {
      id: "support",
      name: "轴承与端盖",
      short: "支承",
      detail: "两端轴承支承转轴，端盖保持同轴定位；转轴仍可转动，端盖和轴承外圈固定。",
    },
    {
      id: "brush",
      name: "固定电刷组件",
      short: "电刷",
      detail: "碳刷由静止刷架和弹簧压在换向器上，接通电源与旋转绕组。电刷不能随转子一起转动。",
    },
  ];
  const fallbackBuildMap = [
    ['rect[x="215"],g[stroke="#e5a15c"],rect[x="105"],rect[x="155"]', 2],
    ['rect[x="162"]', 4],
    ['rect[x="270"]', 1],
  ];
  for (const [selector, n] of fallbackBuildMap)
    $("fallback")
      .querySelectorAll(selector)
      .forEach((el) => (el.dataset.studentBuild = n));
  function studentMessage(text, kind = "info") {
    student.message = text;
    student.kind = kind;
    set("studentFeedback", text);
    $("studentFeedback").dataset.kind = kind;
  }
  function studentTone(ok) {
    if (!audio || !state.sound || audio.ctx.state !== "running") return;
    const t = audio.ctx.currentTime,
      o = audio.ctx.createOscillator(),
      g = audio.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(ok ? 660 : 240, t);
    o.frequency.exponentialRampToValueAtTime(ok ? 880 : 180, t + 0.12);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(state.volume * 0.17, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g);
    g.connect(audio.ctx.destination);
    o.start(t);
    o.stop(t + 0.19);
  }
  function studentDirection() {
    if (!student.positive || !student.negative || student.positive === student.negative) return 0;
    return student.positive === "A" ? 1 : -1;
  }
  function studentLockControls(lock) {
    for (const id of [
      "voltage",
      "load",
      "forwardBtn",
      "reverseBtn",
      "pauseBtn",
      "resetBtn",
      "rotorAngle",
      "stepBtn",
    ])
      $(id).disabled = lock;
    document.querySelectorAll("[data-preset]").forEach((b) => (b.disabled = lock));
  }
  function beginStudent() {
    if (renderer) {
      renderer.zoomGoal = 1.35;
      renderer.targetGoal = [-2, 0, -13];
      renderer.selectedComponent = "all";
      renderer.isolatedPart = 0;
    }
    if (student.active) return;
    student.saved = {
      voltage: state.voltage,
      load: state.load,
      dir: state.dir,
      paused: state.paused,
      angle: state.angle,
      part: state.part,
      cut: state.cut,
      hidden: state.hidden,
    };
    student.active = true;
    document.body.classList.add("student-mode");
    $("studentConsole").classList.remove("hidden");
    $("assemblyTray").classList.remove("hidden");
    $("assemblyZones").classList.remove("hidden");
    pressed("studentModeBtn", true);
    pressed("exploreModeBtn", false);
    set("controlHeading", "学生任务台");
    studentLockControls(true);
    if (student.hasSession && student.runState) {
      Object.assign(state, student.runState);
      syncInputs();
      rebuildMotor();
      render();
      drawMotor();
    } else {
      resetStudent();
      student.hasSession = true;
    }
  }
  function resetStudent() {
    student.uiStep = "assembly";
    student.installed = 0;
    student.selected = null;
    student.positive = "";
    student.negative = "";
    student.prediction = null;
    student.energized = false;
    student.results = [];
    student.flashGroup = 0;
    student.flashAt = 0;
    Object.assign(state, {
      voltage: 0,
      load: 0,
      dir: 1,
      paused: true,
      angle: Math.PI / 6,
      part: "all",
      cut: 65,
      hidden: false,
    });
    $("wirePositive").value = "";
    $("wireNegative").value = "";
    syncInputs();
    rebuildMotor();
    studentMessage(
      "先选择“永磁定子”，再点工作台的 01 插槽；也可把零件拖到该插槽。所有部件装好前，电源保持断开。",
    );
    render();
    drawMotor();
    setMobilePane("model");
    set(
      "lessonText",
      "学生任务：安装四个模块 → 接好正负极 → 预测转向 → 通电验证。工作台上的部件会随安装逐步出现。",
    );
  }
  function exitStudent() {
    if (!student.active) return;
    student.runState = {
      voltage: 0,
      load: state.load,
      dir: state.dir,
      paused: true,
      angle: state.angle,
      part: "all",
      cut: state.cut,
      hidden: state.hidden,
    };
    student.energized = false;
    student.active = false;
    $("fallback")
      .querySelectorAll("[data-student-build]")
      .forEach((el) => (el.style.visibility = ""));
    document.body.classList.remove("student-mode");
    for (const id of ["studentConsole", "assemblyTray", "assemblyZones"])
      $(id).classList.add("hidden");
    studentLockControls(false);
    if (!renderer) {
      for (const id of ["viewReset", "cutMode", "wholeMode", "wireMode", "cutaway"])
        $(id).disabled = true;
    }
    pressed("studentModeBtn", false);
    pressed("exploreModeBtn", true);
    set("controlHeading", "实验控制台");
    if (student.saved) Object.assign(state, student.saved);
    syncInputs();
    rebuildMotor();
    render();
    document
      .querySelectorAll("[data-part]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.part === state.part)));
    set("partName", parts[state.part][0]);
    set("partText", parts[state.part][1]);
    set("lessonText", "已返回自由探索。可继续调节电压、负载和减速比；再次进入学生任务可重新装配。");
    drawMotor();
  }
  function selectKit(id) {
    if (!student.active) return;
    const i = KIT.findIndex((k) => k.id === id);
    if (i < 0 || i < student.installed) return;
    student.selected = id;
    studentMessage("已选“" + KIT[i].name + "”。把它拖到或点选对应插槽，判断这个部件应放在哪里。");
    updateStudent();
  }
  function installKit(id, slot) {
    if (!student.active || student.energized) return;
    const i = KIT.findIndex((k) => k.id === id);
    if (i < 0) {
      studentMessage("先从下方托盘选择一个零件，再点它应安装的插槽。");
      return;
    }
    if (i < student.installed) {
      studentMessage("这个模块已经装好。请继续处理下一件零件。");
      return;
    }
    if (id !== slot) {
      studentMessage(
        "位置不匹配：“" +
          KIT[i].name +
          "”应放入“" +
          KIT[i].short +
          "”插槽。先根据部件作用找到正确位置。",
        "error",
      );
      studentTone(false);
      return;
    }
    if (i !== student.installed) {
      const next = KIT[student.installed];
      studentMessage(
        "本示教工作台当前先装“" +
          next.name +
          "”。" +
          (id === "brush"
            ? "先定位电枢和支承，才能让固定电刷对准换向器。"
            : "请按编号理解各模块的结构依赖。"),
        "error",
      );
      studentTone(false);
      return;
    }
    student.installed++;
    student.selected = null;
    student.flashGroup = student.installed;
    student.flashAt = performance.now();
    studentTone(true);
    if (student.installed === 4) {
      studentMessage(
        "四个模块已装好。接下来把电源 ＋ 和 − 分别接到不同端子，再预测从输出轴端看到的转向。",
        "success",
      );
    } else {
      studentMessage(
        "✓ " +
          KIT[i].name +
          "已安装。" +
          KIT[i].detail +
          " 下一步：" +
          KIT[student.installed].name +
          "。",
        "success",
      );
    }
    render();
    drawMotor();
  }
  function updateStudent() {
    if (!student.active) return;
    $("fallback")
      .querySelectorAll("[data-student-build]")
      .forEach(
        (el) =>
          (el.style.visibility = +el.dataset.studentBuild <= student.installed ? "" : "hidden"),
      );
    const n = student.installed,
      dir = studentDirection(),
      ready = n === 4,
      valid = ready && dir !== 0;
    for (let i = 0; i < 4; i++) {
      const k = KIT[i],
        card = $("kit-" + k.id),
        zone = $("slot-" + k.id),
        done = i < n;
      card.disabled = done;
      card.draggable = !done;
      card.classList.toggle("installed", done);
      card.setAttribute("aria-pressed", String(student.selected === k.id));
      card.querySelector("strong").textContent = done ? "✓ " + k.name : k.name;
      zone.disabled = done;
      zone.classList.toggle("occupied", done);
      zone.classList.toggle("awaiting", !done && student.selected === k.id);
      zone.setAttribute(
        "aria-label",
        done ? k.name + "已安装" : "将" + k.name + "安装到" + (i + 1) + "号插槽",
      );
      zone.querySelector(".zone-state").textContent = done ? "已安装" : k.short;
      $("studentConsole")
        .querySelectorAll(".assembly-progress i")
        [i].classList.toggle("complete", done);
    }
    set(
      "studentCompletion",
      "装配进度 " + n + " / 4 · " + (student.energized ? "12 V 试运行" : "当前电源断开"),
    );
    set(
      "studentInstruction",
      n < 4
        ? "第 " + (n + 1) + " 步：安装" + KIT[n].name
        : !valid
          ? "第 5 步：接好正负极"
          : student.prediction === null
            ? "第 6 步：预测当前接线的转向"
            : student.energized
              ? "试运行：观察电流与转向"
              : "检查预测，通电验证",
    );
    set(
      "trayHelp",
      n < 4
        ? "接下来：" + KIT[n].name + "。" + KIT[n].detail
        : "机械装配完成。电刷固定不转，电枢与换向器一起转动；请在任务台完成接线。",
    );
    $("wiringFieldset").disabled = !ready || student.energized;
    document.querySelectorAll("[data-predict]").forEach((b) => {
      b.disabled = !valid || student.energized;
      b.setAttribute("aria-pressed", String(student.prediction === +b.dataset.predict));
    });
    $("studentPower").disabled = !ready;
    set("studentPower", student.energized ? "■ 断电停止" : "检查并通电");
    $("phaseAssembly").className = n < 4 ? "is-current" : "is-done";
    $("phaseWire").className = n < 4 ? "" : valid ? "is-done" : "is-current";
    $("phasePredict").className = valid ? (student.energized ? "is-done" : "is-current") : "";
    let circuit = !ready
      ? "装好四个模块后开放接线。"
      : !student.positive || !student.negative
        ? "电路开路：正负极都需接线。"
        : !dir
          ? "正负极接到了同一端子，会短接电源；请改接。"
          : "电源 ＋ → " + student.positive + " → 电刷 / 绕组 → " + student.negative + " → 电源 −";
    set("studentCircuitState", circuit);
    $("studentWireSvg").setAttribute("aria-label", circuit);
    for (const [id, under, x, terminal] of [
      ["studentPositivePath", null, 60, student.positive],
      ["studentNegativePath", "studentNegativeUnder", 220, student.negative],
    ]) {
      const tx = terminal === "A" ? 95 : 185,
        d = "M" + x + " 25C" + x + " 44 " + tx + " 41 " + tx + " 60";
      $(id).setAttribute("d", d);
      $(id).style.visibility = terminal ? "" : "hidden";
      if (under) {
        $(under).setAttribute("d", d);
        $(under).style.visibility = terminal ? "" : "hidden";
      }
    }
    for (const [id, t] of [
      ["mainTermA", "A"],
      ["mainTermB", "B"],
    ]) {
      let mark =
        student.positive === t && student.negative === t
          ? "＋/− 短接"
          : student.positive === t
            ? "＋"
            : student.negative === t
              ? "−"
              : "未接";
      set(id, t + " " + mark);
      $(id).style.color =
        mark === "＋" ? "var(--red)" : mark === "−" ? "var(--blue)" : "var(--muted)";
    }
    set(
      "circuitRead",
      student.energized
        ? "＋ → " + student.positive + " → 电刷 → 绕组 → " + student.negative + " → −"
        : "电源断开 · " + (dir ? "已接线，等待验证" : "电路尚未就绪"),
    );
    set("renderBadge", (renderer ? "STUDENT BUILD · " : "二维组装 · ") + n + " / 4");
    set(
      "motionBadge",
      student.energized
        ? state.paused
          ? "通电 · 动画暂停"
          : "试运行 · 慢放 " + fixed(displayRPM()) + " rpm"
        : "断电组装 · 转子静止",
    );
    document.querySelector(".view-hint").textContent = "选零件 → 点对应插槽 · 仍可拖动查看结构";
    $("studentRunReadout").classList.toggle("hidden", !student.energized);
    if (student.energized)
      set(
        "studentRunReadout",
        "12.0 V · " + fixed(model.n, 0) + " rpm · " + fixed(model.I, 2) + " A",
      );
    $("studentRecap").classList.toggle("hidden", !student.results.length);
    if (student.results.length)
      set(
        "studentRecapText",
        student.results.length === 2
          ? "两种接线均已验证：A＋/B− 逆时针，A−/B＋ 顺时针。磁场不变时，反接电源使电流、受力与转矩反向。"
          : "已验证一种接线。断电后交换 ＋/−，重新预测并验证另一种转向。",
      );
  }
  function rewireStudent() {
    if (student.energized) return;
    student.positive = $("wirePositive").value;
    student.negative = $("wireNegative").value;
    student.prediction = null;
    const d = studentDirection();
    if (student.positive && student.negative && !d)
      studentMessage(
        "正负极接在同一端子会形成电源短路。请把两根线分接 A、B；工作台不会给这种接法通电。",
        "error",
      );
    else if (d)
      studentMessage(
        "接线完成。不要急着通电：先用固定磁场 N → S 和电流方向，预测从输出轴端看到的转向。",
      );
    else studentMessage("还缺一根电源线，电路尚未闭合。请分别接好正极和负极。");
    render();
  }
  function powerStudent() {
    if (student.energized) {
      student.energized = false;
      state.voltage = 0;
      state.paused = true;
      studentMessage("已断电停止。现在可以交换正负极，比较反接前后的电流与转向。", "success");
      syncInputs();
      render();
      drawMotor();
      return;
    }
    if (student.installed < 4) {
      studentMessage("请先完成四个机械模块的装配。", "error");
      return;
    }
    if (!student.positive || !student.negative) {
      studentMessage(
        "电路未闭合：请把电源正极和负极都接到电机端子。开路时没有持续电枢电流。",
        "error",
      );
      studentTone(false);
      return;
    }
    const d = studentDirection();
    if (!d) {
      studentMessage(
        "检测到正负极接在同一端子，不能通电。这会短接电源，而不是把电流送过电机绕组。请改接。",
        "error",
      );
      studentTone(false);
      return;
    }
    if (student.prediction === null) {
      studentMessage("请先选择一个转向预测，再用通电试验验证。");
      return;
    }
    if (student.prediction !== d) {
      studentMessage(
        student.prediction === 0
          ? "当前四个模块齐全，电源也跨接 A、B，电路具备驱动条件。请依据电流与磁场重新判断转向。"
          : "当前 " +
              (d > 0 ? "A＋ / B−" : "A− / B＋") +
              " 接法的电流方向会产生" +
              (d > 0 ? "逆时针" : "顺时针") +
              "转矩。可切换到电磁原理页对照受力图，修改预测后再验证。",
        "error",
      );
      studentTone(false);
      return;
    }
    student.energized = true;
    if (!student.results.includes(d)) student.results.push(d);
    Object.assign(state, { voltage: 12, load: 0.12, dir: d, paused: reduced, angle: Math.PI / 6 });
    syncInputs();
    rebuildMotor();
    render();
    drawMotor();
    studentTone(true);
    studentMessage(
      "✓ 预测正确，12 V 试运行已接通。观察" +
        (d > 0 ? "逆时针" : "顺时针") +
        "旋转：电枢与换向器转动，定子、端盖和电刷保持静止。先断电，再尝试反接。",
      "success",
    );
  }
  $("studentModeBtn").onclick = beginStudent;
  $("exploreModeBtn").onclick = exitStudent;
  $("studentExit").onclick = exitStudent;
  $("studentRestart").onclick = resetStudent;
  $("studentPower").onclick = powerStudent;
  $("wirePositive").onchange = rewireStudent;
  $("wireNegative").onchange = rewireStudent;
  document.querySelectorAll("[data-predict]").forEach(
    (b) =>
      (b.onclick = () => {
        student.prediction = +b.dataset.predict;
        studentMessage(
          "已记录预测：" +
            (student.prediction > 0 ? "逆时针" : student.prediction < 0 ? "顺时针" : "不会转") +
            "。点击“检查并通电”，验证接线与判断。",
        );
        updateStudent();
      }),
  );
  document.querySelectorAll("[data-kit]").forEach((card) => {
    card.onclick = () => selectKit(card.dataset.kit);
    card.addEventListener("dragstart", (e) => {
      selectKit(card.dataset.kit);
      e.dataTransfer.setData("text/plain", card.dataset.kit);
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () =>
      document.querySelectorAll("[data-slot]").forEach((z) => z.classList.remove("drop-over")),
    );
  });
  document.querySelectorAll("[data-slot]").forEach((zone) => {
    zone.onclick = () => installKit(student.selected, zone.dataset.slot);
    zone.addEventListener("dragover", (e) => {
      if (zone.disabled) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      zone.classList.add("drop-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drop-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drop-over");
      installKit(e.dataTransfer.getData("text/plain"), zone.dataset.slot);
    });
  });
  $("studentHint").onclick = () => {
    if (student.installed < 4)
      studentMessage(
        "当前先装“" +
          KIT[student.installed].name +
          "”：" +
          KIT[student.installed].detail +
          " 点选托盘里的这件零件，再点同名插槽。",
      );
    else if (!studentDirection())
      studentMessage(
        "把电源两极分别接到 A 和 B，才能让电流经过电机。两线同接一个端子会短接电源，漏接一线则开路。",
      );
    else
      studentMessage(
        "从轴端看，N 在左、S 在右。A＋/B− 对应右侧导线电流出屏、受力向上，形成逆时针转矩；交换接线则顺时针。",
      );
  };

  let currentScreen = "explore",
    mobilePane = "model";
  const pageNodes = {};
  function setMobilePane(p) {
    mobilePane = p;
    document.body.dataset.mobilePane = p;
    pressed("mobileModelBtn", p === "model");
    pressed("mobileControlsBtn", p === "controls");
    requestAnimationFrame(() => {
      drawMotor();
    });
  }
  function setupPages() {
    const host = document.querySelector("main.wrap"),
      nav = document.createElement("nav");
    nav.className = "page-nav";
    nav.setAttribute("aria-label", "教学页面");
    nav.setAttribute("role", "tablist");
    const oldNav = document.querySelector(".learning-nav"),
      explore = $("exploreModeBtn"),
      assembly = $("studentModeBtn");
    explore.textContent = "01 构造探索";
    assembly.textContent = "04 组装接线";
    const labels = {
      principle: "02 电磁原理",
      robot: "03 机器人应用",
      fault: "05 故障排查",
      reference: "06 模型说明",
    };
    const nodes = { explore, assembly };
    for (const id in labels) {
      const b = document.createElement("button");
      b.id = "page-" + id;
      b.textContent = labels[id];
      nodes[id] = b;
    }
    for (const id of ["explore", "principle", "robot", "assembly", "fault", "reference"]) {
      const b = nodes[id];
      b.dataset.screen = id;
      b.setAttribute("role", "tab");
      b.setAttribute(
        "aria-controls",
        ["explore", "assembly", "fault"].includes(id) ? "screen-workspace" : "screen-" + id,
      );
      b.setAttribute("aria-selected", String(id === "explore"));
      b.onclick = () => switchScreen(id);
      nav.appendChild(b);
    }
    nav.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const bs = [...nav.querySelectorAll("[role=tab]")].filter(b => b.getClientRects().length),
        i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? bs.length - 1
            : (i + (e.key === "ArrowRight" ? 1 : -1) + bs.length) % bs.length;
      bs[next].focus();
      bs[next].click();
    });
    document.querySelector(".intro").after(nav);
    oldNav.remove();
    const screens = document.createElement("div");
    screens.className = "screens";
    screens.id = "screens";
    const rows = [...document.querySelectorAll("main>.section-row")],
      grid = document.querySelector(".main-grid"),
      explain = document.querySelector(".explain-grid"),
      app = document.querySelector(".application"),
      energy = document.querySelector(".energy"),
      details = document.querySelector(".details");
    function page(id) {
      const e = document.createElement("section");
      e.id = "screen-" + id;
      e.className = "screen screen-" + id + (id === "workspace" ? "" : " hidden");
      e.setAttribute("role", "tabpanel");
      screens.appendChild(e);
      pageNodes[id] = e;
      return e;
    }
    const work = page("workspace");
    work.classList.add("screen-workspace");
    const mobile = document.createElement("div");
    mobile.className = "mobile-workspace-switch";
    mobile.innerHTML =
      '<button id="mobileModelBtn" aria-pressed="true">电机模型 / 部件</button><button id="mobileControlsBtn" aria-pressed="false">操作与任务面板</button>';
    work.append(mobile, grid);
    const principle = page("principle");
    principle.append(rows[0]);
    const proxy = document.createElement("div");
    proxy.className = "principle-controls";
    proxy.innerHTML =
      '<label for="proxyVoltage">U<input id="proxyVoltage" type="range" min="0" max="24" step=".5" value="24"><output id="proxyVoltageRead">24.0 V</output></label><label for="proxyLoad">负载<input id="proxyLoad" type="range" min="0" max="1.4" step=".01" value=".42"><output id="proxyLoadRead">0.42 N·m</output></label><button id="proxyReverse">反接</button><button id="proxyPause">暂停 / 继续</button>';
    principle.append(proxy, explain, energy);
    page("robot").append(rows[1], app);
    details.open = true;
    page("reference").append(details);
    document.querySelector(".lesson").after(screens);
    $("mobileModelBtn").onclick = () => setMobilePane("model");
    $("mobileControlsBtn").onclick = () => setMobilePane("controls");
    $("proxyVoltage").oninput = (e) => {
      state.voltage = +e.target.value;
      $("voltage").value = state.voltage;
      render();
    };
    $("proxyLoad").oninput = (e) => {
      state.load = +e.target.value;
      $("load").value = state.load;
      render();
    };
    $("proxyReverse").onclick = () => direction(-state.dir);
    $("proxyPause").onclick = () => setPause(!state.paused);
    $("studentExit").onclick = () => switchScreen("explore");
    setMobilePane("model");
  }
  function switchScreen(name) {
    if (!["explore", "principle", "robot", "assembly", "fault", "reference"].includes(name)) return;
    if (name === currentScreen) return;
    if (student.active && name !== "assembly") exitStudent();
    if (fault.active && name !== "fault") exitFault();
    currentScreen = name;
    for (const id in pageNodes)
      pageNodes[id].classList.toggle(
        "hidden",
        id === "workspace" ? !["explore", "assembly", "fault"].includes(name) : id !== name,
      );
    if (name === "assembly" && !student.active) {
      beginStudent();
      student.uiStep = student.installed < 4 ? "assembly" : "wire";
    }
    if (name === "fault" && !fault.active) beginFault();
    for (const b of document.querySelectorAll("[data-screen]")) {
      const yes = b.dataset.screen === name;
      b.setAttribute("aria-selected", String(yes));
      b.setAttribute("aria-pressed", String(yes));
    }
    setMobilePane("model");
    const info = {
      explore: "青色粒子沿电流方向流动，橙色箭头与光点表示受力；反接电源，对照方向变化。",
      principle: "电磁原理：改变电压和负载，观察受力、机械换向及转速 / 转矩 / 功率。",
      robot: "机械臂应用：电机已装入肩关节；追踪电刷、电枢、两级齿轮与输出法兰。",
      reference: "模型说明：这里列出教学假设、坐标约定、稳态方程与原理核对来源。",
    };
    if (info[name]) set("lessonText", info[name]);
    render();
    requestAnimationFrame(() => {
      drawCurve();
      drawMotor();
    });
  }
  function updatePageControls() {
    if (!$("proxyVoltage")) return;
    $("proxyVoltage").value = state.voltage;
    $("proxyLoad").value = state.load;
    set("proxyVoltageRead", fixed(state.voltage) + " V");
    set("proxyLoadRead", fixed(state.load, 2) + " N·m");
  }
  function updateStudentPaging() {
    if (!student.active) return;
    if (student.installed < 4) student.uiStep = "assembly";
    else if (!student.uiStep || student.uiStep === "assembly") {
      student.uiStep = "wire";
      if (innerWidth <= 820) setMobilePane("controls");
    }
    $("studentConsole").dataset.uiStep = student.uiStep;
    $("studentConsole").dataset.running = String(student.energized);
    $("studentWireBack").disabled = student.energized;
    set(
      "studentWireSummary",
      studentDirection()
        ? "当前接线：＋ → " + student.positive + "，− → " + student.negative
        : "接线尚未就绪",
    );
    set(
      "lessonText",
      student.installed < 4
        ? "学生装配 " +
            student.installed +
            "/4：先选“" +
            KIT[student.installed].name +
            "”，再点模型上的同名插槽。"
        : "机械装配完成：在操作面板接线，预测转向，再通电验证。",
    );
  }
  function setupStudentPaging() {
    const sections = $("studentConsole").querySelectorAll(".student-wiring");
    sections[0].classList.add("student-wirecontrols");
    sections[1].classList.add("student-prediction");
    const sum = document.createElement("div");
    sum.className = "student-hint-line";
    sum.id = "studentWireSummary";
    sections[1].prepend(sum);
    const div = document.createElement("div");
    div.className = "student-step-buttons";
    div.innerHTML =
      '<button id="studentWireNext" class="primary">接线完成 → 预测转向</button><button id="studentWireBack">← 修改接线</button>';
    $("studentConsole").querySelector(".student-bottom").prepend(div);
    $("studentWireNext").onclick = () => {
      if (!studentDirection()) {
        studentMessage("请先让正负极分别连接 A、B 两个端子。", "error");
        return;
      }
      student.uiStep = "verify";
      updateStudentPaging();
    };
    $("studentWireBack").onclick = () => {
      if (student.energized) {
        studentMessage("先断电停止，再修改接线。");
        return;
      }
      student.uiStep = "wire";
      updateStudentPaging();
    };
  }

  // Unit-vector model for a single equivalent coil. These vectors are directions, not calibrated force magnitudes.
  function electromagneticFrame(axis, angle, direction, powered) {
    const alongY = axis === "y",
      c = Math.cos(angle),
      s = Math.sin(angle),
      dir = direction < 0 ? -1 : 1;
    const commutating = Math.abs(c) < 1e-4;
    const polarity = dir * (c >= 0 ? 1 : -1),
      conducting = Boolean(powered) && !commutating;
    const B = alongY ? [-1, 0, 0] : [0, 1, 0],
      radialA = alongY ? [c, 0, -s] : [0, c, s],
      radialB = V.scale(radialA, -1);
    const IA = conducting ? (alongY ? [0, -polarity, 0] : [polarity, 0, 0]) : [0, 0, 0],
      IB = V.scale(IA, -1);
    const FA = V.cross(IA, B),
      FB = V.cross(IB, B),
      tau = V.add(V.cross(radialA, FA), V.cross(radialB, FB));
    return {
      axis: alongY ? "y" : "x",
      angle,
      dir,
      field: B,
      radialA,
      radialB,
      currentA: IA,
      currentB: IB,
      forceA: FA,
      forceB: FB,
      torque: tau,
      torqueFactor: tau[alongY ? 1 : 0] / 2,
      powered: Boolean(powered),
      commutating,
    };
  }
  function drawElectromagneticVectors(
    layer,
    project,
    {
      axis = "x",
      angle = 0,
      dir = 1,
      powered = false,
      origin = [0, 0, 0],
      radius = 41,
      fieldHalf = 49,
      enabled = true,
      conductors = true,
      prefix = "motor",
      phase = chargeTime,
    },
  ) {
    layer.replaceChildren();
    layer.style.display = enabled ? "" : "none";
    if (!enabled) return;
    const frame = electromagneticFrame(axis, angle, dir, powered),
      alongY = axis === "y";
    layer.dataset.axis = axis;
    layer.dataset.direction = String(frame.dir);
    layer.dataset.torqueFactor = fixed(frame.torqueFactor, 4);
    const world = (p) => V.add(origin, p),
      rotorPoint = (phi, r = radius) =>
        alongY
          ? [r * Math.cos(phi), 0, -r * Math.sin(phi)]
          : [0, r * Math.cos(phi), r * Math.sin(phi)];
    const colors = { field: "#c3a1ff", current: "#6ff4ed", force: "#ffc36b", torque: "#b9ed89" },
      defs = svgEl("defs");
    for (const [kind, color] of Object.entries(colors)) {
      const marker = svgEl("marker", {
        id: prefix + "-" + kind + "-tip",
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto",
      });
      marker.append(svgEl("path", { d: "M0 0L10 5L0 10Z", fill: color }));
      defs.append(marker);
    }
    layer.append(defs);
    const label = (g, text, p, color) => {
      const t = svgEl("text", {
        x: p[0] + 6,
        y: p[1] - 5,
        class: "em-vector-text",
        fill: color,
        style: `fill:${color}`,
      });
      t.textContent = text;
      g.append(t);
    };
    const arrow = (kind, key, start, end, vector, text) => {
      const a = project(start),
        b = project(end),
        g = svgEl("g", {
          "data-em-kind": kind,
          "data-em-key": key,
          "data-world-start": JSON.stringify(start),
          "data-world-end": JSON.stringify(end),
          "data-world-vector": JSON.stringify(vector),
        });
      const path = svgEl("path", {
        d: `M${a[0]} ${a[1]}L${b[0]} ${b[1]}`,
        stroke: colors[kind],
        "stroke-width": kind === "force" ? 3.1 : kind === "field" ? 1.8 : 2.2,
        fill: "none",
        "stroke-linecap": "round",
        "marker-end": `url(#${prefix}-${kind}-tip)`,
      });
      g.append(path);
      if (kind === "force") {
        // These light pulses emphasize force direction; their speed is illustrative.
        for (let i = 0; i < 3; i++) {
          const progress = ((phase * 0.8 + i / 3) % 1 + 1) % 1;
          const dot = svgEl("g", {
            "data-force-particle": key + "-" + i,
            "data-force-phase": fixed(phase, 4),
            "aria-hidden": "true",
            transform: `translate(${a[0] + (b[0] - a[0]) * progress} ${a[1] + (b[1] - a[1]) * progress})`,
          });
          dot.append(
            svgEl("circle", { r: 5, fill: colors.force, opacity: 0.16 }),
            svgEl("circle", { r: 2.4, fill: "#fff1d4" }),
          );
          g.append(dot);
        }
      }
      if (text) label(g, text, b, colors[kind]);
      layer.append(g);
    };
    // Field starts at the fixed north side and ends at the fixed south side.
    for (const offset of [-0.68, 0.68]) {
      const axial = alongY ? [0, offset * radius, 0] : [offset * radius, 0, 0];
      const start = world(V.add(axial, V.scale(frame.field, -fieldHalf))),
        end = world(V.add(axial, V.scale(frame.field, fieldHalf)));
      arrow(
        "field",
        "B" + (offset < 0 ? "1" : "2"),
        start,
        end,
        frame.field,
        offset < 0 ? "B" : "",
      );
    }
    if (conductors && frame.powered && !frame.commutating) {
      for (const [index, radial, I, F] of [
        [1, frame.radialA, frame.currentA, frame.forceA],
        [2, frame.radialB, frame.currentB, frame.forceB],
      ]) {
        const p = world(V.scale(radial, radius));
        arrow("current", "I" + index, p, V.add(p, V.scale(I, radius * 0.65)), I, "I" + index);
        arrow("force", "F" + index, p, V.add(p, V.scale(F, radius * 0.82)), F, "F" + index);
      }
      if (Math.abs(frame.torqueFactor) > 1e-4) {
        const points = Array.from({ length: 25 }, (_, i) => {
            const phi = (frame.dir > 0 ? -0.9 : 1) - (i * (frame.dir > 0 ? -1 : 1) * 1.9) / 24,
              radial = rotorPoint(phi, radius * 1.65);
            return world(V.add(radial, alongY ? [0, radius * 2.2, 0] : [radius * 2.2, 0, 0]));
          }),
          xy = points.map(project),
          g = svgEl("g", {
            "data-em-kind": "torque",
            "data-em-key": "tau",
            "data-world-vector": JSON.stringify(frame.torque),
          });
        g.append(
          svgEl("path", {
            d: xy.map((v, i) => (i ? "L" : "M") + v[0] + " " + v[1]).join(""),
            stroke: colors.torque,
            "stroke-width": 2.6,
            opacity: 0.45 + 0.55 * Math.abs(frame.torqueFactor),
            fill: "none",
            "marker-end": `url(#${prefix}-torque-tip)`,
          }),
        );
        label(g, "τ", xy[xy.length - 1], colors.torque);
        layer.append(g);
      }
    }
    return frame;
  }

  // Particles indicate conventional current, not individual electrons or a measured drift velocity.
  let chargeTime = 0;
  const particlePools = new WeakMap();
  function paintCurrentParticles(layer, routes, phase, active) {
    layer.style.display = active ? "" : "none";
    layer.dataset.phase = fixed(phase, 4);
    if (!active) return;
    let pool = particlePools.get(layer);
    if (!pool) {
      pool = [];
      particlePools.set(layer, pool);
    }
    let used = 0;
    for (const route of routes) {
      const points = route.points,
        lengths = [],
        color = route.color || "#6ee9ef";
      let total = 0;
      for (let i = 1; i < points.length; i++) {
        const length = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        lengths.push(length);
        total += length;
      }
      if (total < 1) continue;
      const count = clamp(Math.ceil(total / 30), 3, 18);
      for (let n = 0; n < count; n++) {
        let item = pool[used];
        if (!item) {
          const g = svgEl("g", { "data-current-particle": used, "aria-hidden": "true" }),
            halo = svgEl("circle", { r: 4, opacity: 0.18 }),
            core = svgEl("circle", { r: 1.8 });
          g.append(halo, core);
          layer.append(g);
          item = { g, halo, core };
          pool.push(item);
        }
        let distance = ((((n / count + (phase * 55) / total) % 1) + 1) % 1) * total,
          index = 0;
        while (index < lengths.length - 1 && distance > lengths[index]) {
          distance -= lengths[index];
          index++;
        }
        const f = lengths[index] ? distance / lengths[index] : 0,
          a = points[index],
          b = points[index + 1];
        item.g.setAttribute(
          "transform",
          `translate(${a[0] + (b[0] - a[0]) * f} ${a[1] + (b[1] - a[1]) * f})`,
        );
        item.g.dataset.currentRoute = route.key || "current";
        item.g.style.display = "";
        item.halo.setAttribute("fill", color);
        item.core.setAttribute("fill", color);
        used++;
      }
    }
    for (let i = used; i < pool.length; i++) pool[i].g.style.display = "none";
  }
  function magneticBadge(parent, x, y, pole, id) {
    const g = svgEl("g", {
      "data-magnetic-pole": pole,
      "data-pole-location": id,
      "aria-label": `固定${pole === "N" ? "北" : "南"}磁极 ${pole}`,
    });
    g.append(
      svgEl("rect", {
        x: x - 12,
        y: y - 11,
        width: 24,
        height: 22,
        rx: 5,
        fill: pole === "N" ? "#5c2738" : "#183b61",
        stroke: pole === "N" ? "#ff9eaa" : "#8acbff",
        "stroke-width": 1.2,
      }),
    );
    const t = svgEl("text", { x, y: y + 5, "text-anchor": "middle", class: "magnetic-letter" });
    t.textContent = pole;
    g.append(t);
    parent.append(g);
    return g;
  }
  function updatePrincipleParticles() {
    const svg = $("currentLeadA").ownerSVGElement;
    let layer = $("principleParticleLayer");
    if (!layer) {
      layer = svgEl("g", { id: "principleParticleLayer", class: "current-particle-layer" });
      svg.append(layer);
    }
    let a = [
        [236, 263],
        [240, 263],
        [240, 153],
      ],
      b = [
        [160, 153],
        [160, 263],
        [164, 263],
      ];
    if (state.dir < 0) {
      a.reverse();
      b.reverse();
    }
    paintCurrentParticles(
      layer,
      [
        { key: "lead-A", points: a, color: state.dir > 0 ? "#ff9caa" : "#8dd8ff" },
        { key: "lead-B", points: b, color: state.dir > 0 ? "#8dd8ff" : "#ff9caa" },
      ],
      chargeTime,
      model.I > 1e-6,
    );
  }
  function focusMainPart(key) {
    const views = {
      all: { part: "all", p: [-2, 0, -13], zoom: 1.35, name: parts.all[0] },
      north: { part: "magnet", p: [0, -52, 0], zoom: 2.35, name: "永磁定子 N" },
      south: { part: "magnet", p: [0, 52, 0], zoom: 2.35, name: "永磁定子 S" },
      magnet: { part: "magnet", p: [0, 0, 0], zoom: 2.0, name: parts.magnet[0] },
      iron: { part: "rotor", p: [0, 0, 0], zoom: 2.6, name: "电枢铁芯" },
      rotor: { part: "rotor", p: [0, 0, 0], zoom: 2.3, name: parts.rotor[0] },
      shaft: { part: "rotor", p: [145, 0, 0], zoom: 3.0, name: "输出转轴" },
      bearings: { part: "all", p: [112, 0, 0], zoom: 3.0, name: "两端轴承 / 端盖" },
      base: { part: "all", p: [-50, 0, -76], zoom: 2.2, name: "固定底座 / 支架" },
      winding: { part: "rotor", p: [0, 0, 0], zoom: 2.6, name: "铜线圈" },
      commutator: { part: "comm", p: [-96, 0, 0], zoom: 3.3, name: parts.comm[0] },
      comm: { part: "comm", p: [-96, 0, 0], zoom: 3.3, name: parts.comm[0] },
      brushes: { part: "brush", p: [-96, 0, 0], zoom: 3.0, name: parts.brush[0] },
      brush: { part: "brush", p: [-96, 0, 0], zoom: 3.0, name: parts.brush[0] },
      housing: { part: "all", p: [0, 0, -8], zoom: 1.85, name: "壳体 / 磁轭" },
    };
    const view = views[key] || views.all;
    const isolate = ["north", "south", "magnet"].includes(key);
    if (renderer) renderer.isolatedPart = isolate ? 1 : 0;
    state.part = view.part;
    if (
      [
        "north",
        "south",
        "magnet",
        "iron",
        "rotor",
        "winding",
        "commutator",
        "comm",
        "brushes",
        "brush",
      ].includes(key)
    )
      state.hidden = true;
    if (key === "all") {
      state.hidden = false;
      state.cut = 65;
    }

    if (key === "housing") {
      state.hidden = false;
      state.cut = 0;
    } else if (key !== "all" && state.cut === 0 && !state.hidden) state.cut = 65;
    $("cutaway").value = state.cut;
    rebuildMotor();
    if (renderer) {
      renderer.targetGoal = [...view.p];
      renderer.zoomGoal = view.zoom;
      renderer.selectedComponent = key;
      if (["commutator", "comm", "brushes", "brush"].includes(key)) renderer.yaw = 2.05;
      if (key === "magnet") {
        renderer.yaw = 0.08;
        renderer.elev = 0.22;
      }
      if (key === "north") renderer.yaw = -1.15;
      else if (key === "south") renderer.yaw = 1.15;
    } else {
      const svg = $("fallback").querySelector("svg");
      if (svg)
        svg.setAttribute(
          "viewBox",
          key === "all"
            ? "0 0 720 340"
            : view.part === "comm" || view.part === "brush"
              ? "20 95 260 230"
              : view.part === "magnet"
                ? "165 20 380 290"
                : "185 60 400 250",
        );
    }
    document
      .querySelectorAll("[data-part]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.part === state.part)));
    set("partName", view.name);
    set(
      "partText",
      parts[view.part][1] + (isolate ? " 观察时暂隐其他组件，磁路计算保持不变。" : ""),
    );
    document
      .querySelectorAll("[data-label-name]")
      .forEach((g) => g.setAttribute("aria-pressed", String(g.dataset.componentKey === key)));
    render();
    drawMotor();
  }

  const SCENE_PARTS = [
    { name: "永磁定子 N", p: () => [-6, -54, 4], side: 0, row: 0, group: 1 },
    { name: "电枢铁芯", p: () => [16, -2, 35], side: 0, row: 1, group: 2 },
    { name: "输出转轴", p: () => [160, 0, 0], side: 0, row: 2, group: 2 },
    { name: "两端轴承 / 端盖", p: () => [114, 17, 0], side: 0, row: 3, group: 3 },
    { name: "固定底座 / 支架", p: () => [-85, -47, -76], side: 0, row: 4, group: 0 },
    { name: "永磁定子 S", p: () => [25, 53, -13], side: 1, row: 0, group: 1 },
    {
      name: "铜线圈",
      p: () => [8, 41 * Math.cos(state.angle), 41 * Math.sin(state.angle)],
      side: 1,
      row: 1,
      group: 2,
    },
    {
      name: "分裂环换向器",
      p: () => [-96, 25 * Math.cos(state.angle), 25 * Math.sin(state.angle)],
      side: 1,
      row: 2,
      group: 2,
    },
    { name: "固定碳刷 / 刷架", p: () => [-96, 32, 3], side: 1, row: 3, group: 4 },
    { name: "壳体 / 磁轭", p: () => [15, -59, 21], side: 1, row: 4, group: 0 },
  ];
  let sceneCache = null;
  function setupSceneLabels() {
    const svg = $("structureOverlay");
    const NS = "http://www.w3.org/2000/svg";
    const make = (n, a = {}) => {
      const e = document.createElementNS(NS, n);
      for (const k in a) e.setAttribute(k, a[k]);
      return e;
    };
    const defs = make("defs"),
      marker = make("marker", {
        id: "sceneCurrentArrow",
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 4,
        markerHeight: 4,
        orient: "auto",
      });
    marker.append(make("path", { d: "M0 0L10 5L0 10Z", fill: "#58dfed" }));
    defs.append(marker);
    const fieldMarker = make("marker", {
      id: "sceneFieldArrow",
      viewBox: "0 0 10 10",
      refX: 8,
      refY: 5,
      markerWidth: 5,
      markerHeight: 5,
      orient: "auto",
    });
    fieldMarker.append(make("path", { d: "M0 0L10 5L0 10Z", fill: "#c3a1ff" }));
    defs.append(fieldMarker);
    svg.append(defs);
    const currents = [];
    for (let i = 0; i < 5; i++) {
      const path = make("path", { class: "current-vector", "data-current-path": i });
      svg.append(path);
      currents.push(path);
    }
    const particleLayer = make("g", { id: "motorParticleLayer", class: "current-particle-layer" });
    svg.append(particleLayer);
    const poles = make("g", { id: "motorMagneticPoles" });
    svg.append(poles);
    const emLayer = make("g", {
      id: "motorEMLayer",
      class: "em-vector-layer",
      "aria-label": "三维磁场、电流、导线受力与转矩",
    });
    svg.append(emLayer);
    const labels = SCENE_PARTS.map((part, index) => {
      const g = make("g", { class: "part-label", "data-label-name": part.name }),
        line = make("path", { class: "label-leader" }),
        dot = make("circle", { class: "label-dot", r: 2.2 }),
        rect = make("rect", { class: "label-box", rx: 4 }),
        text = make("text");
      text.textContent = part.name;
      const key = [
        "north",
        "iron",
        "shaft",
        "bearings",
        "base",
        "south",
        "winding",
        "commutator",
        "brushes",
        "housing",
      ][index];
      g.dataset.componentKey = key;
      g.setAttribute("role", "button");
      g.setAttribute("tabindex", "0");
      g.setAttribute("aria-label", part.name + "，点击聚焦放大");
      g.setAttribute("aria-pressed", "false");
      const activate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        focusMainPart(key);
      };
      g.addEventListener("click", activate);
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") activate(e);
      });
      g.append(rect, text);
      svg.append(line, dot, g);
      return { ...part, g, line, dot, rect, text };
    });
    const marks = make("g", { "aria-hidden": "true" });
    marks.style.display = "none";
    svg.append(marks);
    sceneCache = { labels, currents, marks, particleLayer, poles, emLayer };
  }
  function updateSceneLabels(vp, W, H) {
    if (!sceneCache || !W || !H) return;
    const svg = $("structureOverlay");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    function project(p) {
      const v = [...p, 1],
        q = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) q[i] += vp[j * 4 + i] * v[j];
      return [
        clamp(((q[0] / q[3] + 1) * W) / 2, 4, W - 4),
        clamp(((1 - q[1] / q[3]) * H) / 2, 4, H - 4),
      ];
    }
    const narrow = W < 560,
      labelW = narrow ? 104 : 146,
      font = narrow ? 11.3 : 13.5,
      top = narrow ? 71 : 65,
      bottom = student.active ? H - 104 : fault.active ? H - 116 : H - 45,
      step = Math.max(21, (bottom - top) / 4);
    for (const l of sceneCache.labels) {
      const visible = !student.active || l.group <= student.installed;
      l.g.style.display = visible ? "" : "none";
      l.line.style.display = l.dot.style.display = visible ? "" : "none";
      if (!visible) continue;
      const [ax, ay] = project(l.p()),
        x = l.side ? W - labelW - 10 : 10,
        y = top + l.row * step,
        ex = l.side ? x : x + labelW,
        ey = y + 11;
      const join = l.side ? x - 8 : x + labelW + 8;
      l.line.setAttribute("d", `M${ax} ${ay}L${join} ${ey}H${ex}`);
      l.dot.setAttribute("cx", ax);
      l.dot.setAttribute("cy", ay);
      for (const [k, v] of Object.entries({ x, y, width: labelW, height: 23 }))
        l.rect.setAttribute(k, v);
      l.text.setAttribute("x", x + 6);
      l.text.setAttribute("y", y + 16);
      l.text.style.fontSize = font + "px";
    }
    const active = model.I > 1e-6,
      flowSign = state.dir * (Math.cos(state.angle) >= 0 ? 1 : -1),
      r = 41;
    const lead = (s) => [
        [-163, s * 64, -65],
        [-151, s * 80, -25],
        [-96, s * 70, 0],
        [-96, s * 29, 0],
      ],
      aLead = lead(state.dir),
      bLead = lead(-state.dir).reverse();
    let a = [
        [-75, r * Math.cos(state.angle), r * Math.sin(state.angle)],
        [77, r * Math.cos(state.angle), r * Math.sin(state.angle)],
      ],
      b = [
        [-75, -r * Math.cos(state.angle), -r * Math.sin(state.angle)],
        [77, -r * Math.cos(state.angle), -r * Math.sin(state.angle)],
      ];
    if (flowSign < 0) a.reverse();
    else b.reverse();
    const endTurn = Array.from({ length: 21 }, (_, k) => {
      const angle = state.angle + (flowSign < 0 ? Math.PI : 0) + (k * Math.PI) / 20;
      return [77, r * Math.cos(angle), r * Math.sin(angle)];
    });
    const routes = [aLead, bLead, a, b, endTurn],
      particleRoutes = [];
    routes.forEach((points, i) => {
      const path = sceneCache.currents[i];
      path.setAttribute(
        "d",
        points.map((p, j) => (j ? "L" : "M") + project(p).join(" ")).join(" "),
      );
      path.classList.toggle("off", !active);
      if (
        !(
          i > 1 &&
          (Math.abs(Math.cos(state.angle)) < 1e-4 || (student.active && student.installed < 2))
        )
      )
        particleRoutes.push({
          key: i === 0 ? "supply" : i === 1 ? "return" : "winding-" + i,
          points: points.map(project),
          color: "#79f4ef",
        });
      const hideCoil =
        i > 1 &&
        (Math.abs(Math.cos(state.angle)) < 1e-4 || (student.active && student.installed < 2));
      path.style.opacity = renderer?.isolatedPart ? 0 : hideCoil ? 0 : active ? 0.95 : 0.28;
      if (active) path.setAttribute("marker-end", "url(#sceneCurrentArrow)");
      else path.removeAttribute("marker-end");
      path.style.strokeDashoffset =
        active && !state.paused && !reduced ? -(performance.now() / 65) % 30 : 0;
    });
    if (student.active && student.installed < 4)
      for (const p of sceneCache.currents) p.style.opacity = 0;
    paintCurrentParticles(
      sceneCache.particleLayer,
      particleRoutes,
      chargeTime,
      active && (!student.active || student.installed === 4) && !renderer?.isolatedPart,
    );
    sceneCache.poles.replaceChildren();
    const context = renderer?.selectedComponent || "all";
    const showPhysics =
      state.showEM &&
      (!student.active || student.installed >= 1) &&
      ["all", "north", "south", "magnet", "iron", "rotor", "winding"].includes(context);
    const frame = drawElectromagneticVectors(sceneCache.emLayer, project, {
      axis: "x",
      angle: state.angle,
      dir: state.dir,
      powered: model.I > 1e-6,
      radius: 41,
      fieldHalf: 49,
      enabled: showPhysics,
      conductors: !renderer?.isolatedPart && (!student.active || student.installed >= 2),
      prefix: "motor-em",
    });
    const deg = ((((state.angle * 180) / Math.PI) % 360) + 360) % 360;
    if ($("motorEMRead"))
      set(
        "motorEMRead",
        "θ " +
          fixed(deg, 0) +
          "° · " +
          (!model.I
            ? "无电流 / 无电磁转矩"
            : Math.abs(Math.cos(state.angle)) < 1e-4
              ? "换向位置 / 单线圈零转矩"
              : "单线圈转矩" + (state.dir > 0 ? "正向" : "反向")),
      );

    if (
      (!student.active || student.installed >= 1) &&
      (!renderer || ["all", "north", "south", "magnet"].includes(renderer.selectedComponent))
    )
      for (const [pole, p] of [
        ["N", [-6, -54, 4]],
        ["S", [25, 53, -13]],
      ]) {
        if (
          (renderer?.selectedComponent === "north" && pole !== "N") ||
          (renderer?.selectedComponent === "south" && pole !== "S")
        )
          continue;
        const [x, y] = project(p);
        magneticBadge(sceneCache.poles, x, y, pole, "motor");
      }
    const mark = sceneCache.marks;
    mark.replaceChildren();
    mark.style.display = "none";
    if (
      fault.active &&
      ((fault.wireChecked && fault.wireOpen) || (fault.brushChecked && fault.contactR > 0))
    ) {
      mark.style.display = "";
      const wire = fault.wireChecked && fault.wireOpen,
        [mx, my] = project(wire ? [-123.5, 75, -12.5] : [-96, 28, 0]);
      const circle = svgEl("circle", {
        cx: mx,
        cy: my,
        r: wire ? 6 : 9,
        fill: "#0b131c",
        stroke: wire ? "#ef8092" : "#f4ba6c",
        "stroke-width": 1.5,
      });
      const cross = svgEl("path", {
        d: `M${mx - 4} ${my - 4}L${mx + 4} ${my + 4}M${mx - 4} ${my + 4}L${mx + 4} ${my - 4}`,
        stroke: wire ? "#ef8092" : "#f4ba6c",
        "stroke-width": 1.7,
      });
      mark.append(circle, cross);
    }
  }

  // Each case is a different electrical/mechanical boundary condition, not a changed caption.
  function operatingModel() {
    return solve(
      state.voltage,
      state.load,
      fault.active ? { contactR: fault.contactR, open: fault.wireOpen } : {},
    );
  }
  const FAULTS = {
    brush: {
      name: "电刷接触不良",
      reason:
        "额外接触电阻产生压降，降低同一电源下的电枢电流与可用转矩。本题用 6 Ω 串联电阻示教，不模拟实际电刷的非线性接触。",
    },
    open: {
      name: "接线开路",
      reason: "A 端正线断开，回路不闭合，没有持续电枢电流，也就没有电磁驱动转矩。",
    },
    overload: {
      name: "负载过大",
      reason:
        "原负载 0.75 N·m 超过 12 V 下 0.60 N·m 的理论堵转能力。降低阻性负载后，电机可在新的稳态转动。",
    },
  };
  function faultMessage(t, kind = "info") {
    fault.message = t;
    set("faultFeedback", t);
    $("faultFeedback").dataset.kind = kind;
  }
  function beginFault() {
    if (fault.active) return;
    fault.saved = {
      voltage: state.voltage,
      load: state.load,
      dir: state.dir,
      paused: state.paused,
      angle: state.angle,
      part: state.part,
      cut: state.cut,
      hidden: state.hidden,
    };
    if (fault.hasSession && fault.runState) {
      fault.active = true;
      fault.powered = fault.resumePowered;
      Object.assign(state, fault.runState);
      document.body.classList.add("fault-mode");
      $("faultConsole").classList.remove("hidden");
      $("faultMeters").classList.remove("hidden");
      studentLockControls(true);
      set("controlHeading", "故障排查台");
      syncInputs();
      rebuildMotor();
      render();
      drawMotor();
      return;
    }
    fault.active = true;
    fault.hasSession = true;
    fault.order = ["brush", "open", "overload"];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fault.order[i], fault.order[j]] = [fault.order[j], fault.order[i]];
    }
    fault.index = 0;
    fault.history = [];
    document.body.classList.add("fault-mode");
    $("faultConsole").classList.remove("hidden");
    $("faultMeters").classList.remove("hidden");
    studentLockControls(true);
    set("controlHeading", "故障排查台");
    startFaultCase();
  }
  function startFaultCase() {
    if (renderer) {
      renderer.zoomGoal = 1.35;
      renderer.targetGoal = [-2, 0, -13];
      renderer.selectedComponent = "all";
      renderer.isolatedPart = 0;
    }
    fault.kind = fault.order[fault.index];
    fault.contactR = fault.kind === "brush" ? 6 : 0;
    fault.wireOpen = fault.kind === "open";
    fault.powered = true;
    fault.step = "inspect";
    fault.solved = false;
    fault.observed = [];
    fault.metered = [];
    fault.selected = "";
    fault.brushChecked = false;
    fault.wireChecked = false;
    fault.repairs = [];
    Object.assign(state, {
      voltage: 12,
      load: fault.kind === "overload" ? 0.75 : 0.18,
      dir: 1,
      paused: reduced,
      angle: Math.PI / 6,
      part: "all",
      cut: 65,
      hidden: false,
    });
    fault.before = solve(12, state.load, { contactR: fault.contactR, open: fault.wireOpen });
    $("faultDiagnosis").value = "";
    $("repairLoad").value = state.load;
    set("faultLog", "仪表待测量。至少检查两项独立证据，再判断根因。");
    set("faultRepairLog", "操作记录：尚未修复。");
    faultMessage(
      "电源已经接通，但电机没有正常转动。用电压、电流和部件检查寻找证据，暂不显示故障名称。",
    );
    syncInputs();
    rebuildMotor();
    render();
    drawMotor();
    setMobilePane("model");
  }
  function exitFault() {
    if (!fault.active) return;
    fault.runState = {
      voltage: state.voltage,
      load: state.load,
      dir: state.dir,
      paused: state.paused,
      angle: state.angle,
      part: state.part,
      cut: state.cut,
      hidden: state.hidden,
    };
    fault.resumePowered = fault.powered;
    fault.active = false;
    fault.powered = false;
    document.body.classList.remove("fault-mode");
    $("faultConsole").classList.add("hidden");
    $("faultMeters").classList.add("hidden");
    studentLockControls(false);
    if (fault.saved) Object.assign(state, fault.saved);
    syncInputs();
    rebuildMotor();
    render();
    drawMotor();
    set("controlHeading", "实验控制台");
  }
  function faultObserve(key) {
    if (!fault.active) return;
    const m = model,
      U = state.voltage;
    let t = "";
    if (key === "reference") {
      const healthy = solve(12, 0.18);
      t =
        "正常参考：12 V、0.18 N·m 时，n ≈ " +
        fixed(healthy.n, 0) +
        " rpm，I ≈ " +
        fixed(healthy.I, 2) +
        " A；正常接触额外压降取 0 V。参考资料本身不算检查证据。";
    } else if ((key === "voltage" || key === "current") && !fault.powered) {
      t = "电源已断开，当前电压和电流均为零。请接通电源后测量运行状态，避免把主动断电误判成故障。";
    } else {
      if (!fault.observed.includes(key)) fault.observed.push(key);
      if (!fault.metered.includes(key)) fault.metered.push(key);
      if (key === "voltage")
        t =
          "电源输出 " +
          fixed(U, 2) +
          " V；电机 A/B 端电压差 " +
          fixed(m.terminalU, 2) +
          " V；反电动势 " +
          fixed(m.E, 2) +
          " V。";
      if (key === "current")
        t =
          "电枢电流 " +
          fixed(m.I, 2) +
          " A，当前转速 " +
          fixed(m.n, 0) +
          " rpm。正常同一电压、0.18 N·m 下参考电流约 3.27 A。";
      if (key === "wire") {
        fault.wireChecked = true;
        t = fault.wireOpen
          ? "A 端正线连接点断开；B 端连接正常，回路不能闭合。"
          : "A、B 两根外部导线都连接完好，没有发现开路或正负极同接。";
      }
      if (key === "brush") {
        fault.brushChecked = true;
        t = fault.contactR
          ? "电刷存在较大接触压降：" +
            fixed(m.brushDrop, 2) +
            " V；等效额外接触电阻 " +
            fixed(fault.contactR, 2) +
            " Ω。固定刷架与旋转环之间的接触需要处理。"
          : "碳刷压紧与接触状态正常，模型中的额外接触电阻为 0 Ω。";
      }
      if (key === "load")
        t =
          "轴端阻性负载 " +
          fixed(state.load, 2) +
          " N·m。12 V、正常接触时的理论堵转转矩为 0.60 N·m，" +
          (state.load >= 0.6 ? "该负载已超过启动能力。" : "该负载低于正常电机的启动能力。");
    }
    set("faultLog", t);
    updateFault();
    drawMotor();
  }
  function submitFault() {
    if (fault.observed.length < 2) {
      faultMessage(
        "还缺独立证据：至少检查两项，例如电压与电流，或接线与电刷，再提交判断。",
        "error",
      );
      return;
    }
    const answer = $("faultDiagnosis").value;
    if (!answer) {
      faultMessage("请先选择你认为的主要故障。", "error");
      return;
    }
    if (answer !== fault.kind) {
      let hint =
        answer === "open" && model.I > 0
          ? "已测得非零电流，这不能用完全开路来解释。"
          : answer === "overload" && state.load < 0.6
            ? "外部负载并没有超过正常接触时的 12 V 堵转能力，还需检查其他压降或断点。"
            : "这个判断还不能解释全部现象。请结合接线、接触压降与电流读数再判断。";
      faultMessage(hint, "error");
      studentTone(false);
      return;
    }
    fault.step = "repair";
    faultMessage(
      "判断正确：" + FAULTS[fault.kind].name + "。下一步先断开电源，再针对根因操作修复。",
      "success",
    );
    studentTone(true);
    updateFault();
  }
  function faultRootResolved() {
    return fault.kind === "brush"
      ? fault.contactR === 0
      : fault.kind === "open"
        ? !fault.wireOpen
        : state.load < 0.6 - 1e-8;
  }
  function repairFault(which) {
    if (!fault.active || fault.step !== "repair") return;
    if (fault.powered) {
      faultMessage("请先点“断开电源”，再修改接触、导线或负载。", "error");
      return;
    }
    let msg = "";
    if (which === "brush") {
      const existed = fault.contactR > 0;
      fault.contactR = 0;
      msg = existed
        ? "已恢复电刷接触，额外接触电阻降到 0 Ω。"
        : "电刷原本接触正常；这项操作没有排除当前根因。";
    }
    if (which === "wire") {
      const existed = fault.wireOpen;
      fault.wireOpen = false;
      msg = existed
        ? "已重新接好 A 端导线，外部回路闭合。"
        : "导线原本连接完好；重新插接没有改变当前根因。";
    }
    fault.repairs.push(which);
    set("faultRepairLog", "操作记录：" + msg);
    faultMessage(
      faultRootResolved()
        ? "操作已完成。接通电源验证，比较修复前后的电流与转速。"
        : "这项操作完成，但根因还未排除。请继续针对诊断结果修复。",
    );
    render();
    drawMotor();
  }
  function adjustFaultLoad() {
    if (!fault.active || fault.powered || fault.step !== "repair") return;
    state.load = +$("repairLoad").value;
    syncInputs();
    set("faultRepairLog", "操作记录：负载已调为 " + fixed(state.load, 2) + " N·m；请通电验证。");
    faultMessage("负载调整完成。请检查它与当前电压下启动能力的关系，再通电验证。");
    render();
  }
  function toggleFaultPower() {
    if (!fault.active) return;
    if (fault.powered) {
      fault.powered = false;
      state.voltage = 0;
      state.paused = true;
      faultMessage(
        fault.step === "repair"
          ? "电源已断开，可以操作接触组件、导线或负载。"
          : "电源已断开，可做静态检查；测电压和电流前请重新接通。",
      );
    } else {
      fault.powered = true;
      state.voltage = 12;
      state.paused = reduced;
      if (fault.step === "repair") {
        const after = solve(12, state.load, { contactR: fault.contactR, open: fault.wireOpen });
        if (faultRootResolved() && after.n > 1) {
          fault.step = "verify";
          fault.solved = true;
          if (!fault.history.some((v) => v.index === fault.index))
            fault.history.push({
              index: fault.index,
              kind: fault.kind,
              before: { ...fault.before },
              after: { ...after },
            });
          faultMessage(
            "验证通过：根因已排除，电机恢复旋转。观察转速、电流以及图中的电流箭头。",
            "success",
          );
          studentTone(true);
        } else
          faultMessage(
            "验证尚未通过：" +
              (after.n > 0 ? "虽然出现转动，但诊断出的根因仍存在。" : "电机仍未正常转动。") +
              "请再次断电，继续针对根因修复。",
            "error",
          );
      } else
        faultMessage(
          fault.step === "verify"
            ? "再次接通电源，已修复的电机恢复运行。"
            : "电源已接通。继续测量并收集判断所需的证据。",
        );
    }
    syncInputs();
    render();
    drawMotor();
  }
  function updateFault() {
    if (!fault.active) return;
    const repair = fault.step === "repair",
      verified = fault.step === "verify";
    $("faultInspectPane").classList.toggle("hidden", fault.step !== "inspect");
    $("faultRepairPane").classList.toggle("hidden", !repair);
    $("faultRecap").classList.toggle("hidden", !verified);
    set("faultCaseTitle", "故障挑战 " + (fault.index + 1) + " / 3");
    set("faultPowerState", fault.powered ? "● 电源接通 · 12 V" : "○ 已断电");
    set("faultPower", fault.powered ? "■ 断开电源" : repair ? "接通电源验证" : "接通电源");
    $("faultNext").disabled = !verified;
    set("faultNext", fault.index === 2 ? "重新挑战 ↻" : "下一故障 →");
    for (const id of ["repairBrush", "repairWire", "repairLoad"])
      $(id).disabled = !repair || fault.powered;
    set("repairLoadRead", fixed(state.load, 2) + " N·m");
    $("repairLoad").value = state.load;
    set("faultHistory", "已完成 " + fault.history.length + " / 3 个故障。");
    $("faultPhaseInspect").className = fault.step === "inspect" ? "active" : "";
    $("faultPhaseRepair").className = repair ? "active" : "";
    $("faultPhaseVerify").className = verified ? "active" : "";
    set(
      "faultMeterV",
      fault.metered.includes("voltage") || verified ? fixed(model.terminalU, 1) : "—",
    );
    set("faultMeterI", fault.metered.includes("current") || verified ? fixed(model.I, 2) : "—");
    set("faultMeterLoad", fault.metered.includes("load") || verified ? fixed(state.load, 2) : "—");
    set(
      "liveCurrentDetail",
      !fault.powered
        ? "电源已断开 · I = 0 A"
        : fault.wireOpen
          ? fault.wireChecked
            ? "已发现断口 · I = 0 A"
            : "I = 0 A · 电流未能建立"
          : "平均电枢电流 " + fixed(model.I, 2) + " A · " + (model.I ? "约定正电流方向" : "无电流"),
    );
    if (fault.wireOpen) {
      set("mainTermA", fault.wireChecked ? "A 断口" : "A 端");
      set("mainTermB", "B −");
      set(
        "circuitRead",
        !fault.powered
          ? "电源已主动断开 · 无电流"
          : fault.wireChecked
            ? "电源 ＋ → × A 端断口　 I = 0 A"
            : "供电已接通，但电枢电流为 0 · 原因待查",
      );
    } else
      set(
        "circuitRead",
        fault.powered
          ? "A＋ → 电刷 → 绕组 → B− · " + fixed(model.I, 2) + " A"
          : "电源断开 · 无电流",
      );
    set(
      "renderBadge",
      verified ? "FAULT CLEARED · 恢复运行" : "DIAGNOSIS · 挑战 " + (fault.index + 1),
    );
    set(
      "motionBadge",
      verified
        ? "已恢复 · 慢放 " + fixed(displayRPM()) + " rpm"
        : model.n
          ? "转动中 · 根因待验证"
          : fault.powered
            ? "异常停转 · 待诊断"
            : "断电维修",
    );
    if (!fault.powered) set("directionText", "转子静止 · 已主动断电");
    else if (fault.wireOpen)
      set("directionText", fault.wireChecked ? "转子静止 · 已查出断口" : "转子静止 · 原因待查");
    else if (model.stalled) set("directionText", "转子静止 · 驱动转矩不足");
    if (verified && !fault.powered) {
      set("motionBadge", "修复完成 · 现已主动断电");
    }
    if (verified) {
      const recorded = fault.history.find((x) => x.index === fault.index);
      const after = recorded ? recorded.after : model;
      set(
        "faultBeforeAfter",
        "修复前：" +
          fixed(fault.before.n, 0) +
          " rpm / " +
          fixed(fault.before.I, 2) +
          " A → 验证时：" +
          fixed(after.n, 0) +
          " rpm / " +
          fixed(after.I, 2) +
          " A。" +
          (!fault.powered ? "当前已主动断电。" : ""),
      );
      set("faultExplanation", FAULTS[fault.kind].reason);
    }
    set(
      "lessonText",
      verified
        ? fault.powered
          ? "验证完成：" + FAULTS[fault.kind].name + "已排除，电机在当前电压与负载下恢复运行。"
          : "根因已排除，本次通电验证已通过；当前为主动断电状态。"
        : "故障挑战：观察异常 → 使用仪表查证 → 判断根因 → 断电修复 → 重新通电验证。",
    );
  }
  document
    .querySelectorAll("[data-check]")
    .forEach((b) => (b.onclick = () => faultObserve(b.dataset.check)));
  $("faultSubmit").onclick = submitFault;
  $("repairBrush").onclick = () => repairFault("brush");
  $("repairWire").onclick = () => repairFault("wire");
  $("repairLoad").oninput = adjustFaultLoad;
  $("faultPower").onclick = toggleFaultPower;
  $("faultExit").onclick = () => switchScreen("explore");
  $("faultNext").onclick = () => {
    if (!fault.solved) return;
    if (fault.index < 2) {
      fault.index++;
      startFaultCase();
    } else {
      fault.order.reverse();
      fault.index = 0;
      fault.history = [];
      startFaultCase();
    }
  };
  $("faultHint").onclick = () => {
    faultMessage(
      fault.step === "inspect"
        ? "先区分是否有电流：无电流可检查开路；大电流停转可检查过载；电刷处异常压降可提示接触问题。至少结合两项证据。"
        : fault.step === "repair"
          ? "修复应针对根因：接触异常就处理电刷，断线就重接导线，负载过大就降低负载。修改前先断电。"
          : "根因已排除，可以进入下一故障。",
    );
  };

  // Robot application: exact shaft/gear/output kinematics with procedural 3D equipment.
  function setupRobotMobile() {
    const nav = document.createElement("div");
    nav.className = "robot-mobile-switch";
    nav.innerHTML =
      '<button id="robotScenePaneBtn" aria-pressed="true">机器人与传动</button><button id="robotControlsPaneBtn" aria-pressed="false">参数与控制</button>';
    document.querySelector("#screen-robot .application").before(nav);
    document.body.dataset.robotPane = "scene";
    $("robotScenePaneBtn").onclick = () => {
      document.body.dataset.robotPane = "scene";
      pressed("robotScenePaneBtn", true);
      pressed("robotControlsPaneBtn", false);
      if (robotScene) requestAnimationFrame(() => robotScene.draw());
    };
    $("robotControlsPaneBtn").onclick = () => {
      document.body.dataset.robotPane = "controls";
      pressed("robotScenePaneBtn", false);
      pressed("robotControlsPaneBtn", true);
    };
  }
  function createRobotScene() {
    const cv = $("robotCanvas"),
      overlay = $("robotOverlay"),
      holder = cv.parentElement;
    const sim = {
      playing: !reduced,
      slow: 20,
      cycle: false,
      dwell: 0,
      cycles: 0,
      focus: "arm",
      componentFocus: null,
      cameraCenter: null,
      cameraDistance: 2,
      chargeTime: 0,
      idlers: 0,
      cut: true,
      detail: false,
      yaw: -0.98,
      elev: 0.48,
      zoom: 1,
      follow: 0,
      lastU: state.voltage || 24,
      lastApp: state.app,
      dirty: true,
      config: "",
      arm: { input: 0, middle: 0, output: 0, q: (55 * Math.PI) / 180, t: 0, limit: false },
      message: "",
      cameraSnap: true,
    };
    let rg = null,
      program = null,
      buf = null,
      dynamicBuf = null,
      count = 0,
      geo = null,
      locations = {},
      lastDraw = 0;
    const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      tr = (x = 0, y = 0, z = 0) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1],
      ry = (a) => {
        const c = Math.cos(a),
          s = Math.sin(a);
        return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
      },
      pose = (p, a = 0) => matmul(tr(...p), ry(a));
    const materials = {
      steel: [0.46, 0.54, 0.6],
      bright: [0.7, 0.77, 0.81],
      dark: [0.12, 0.17, 0.2],
      rubber: [0.055, 0.065, 0.071],
      rubberHi: [0.095, 0.11, 0.12],
      yellow: [0.77, 0.51, 0.12],
      yellowHi: [0.95, 0.7, 0.24],
      copper: [0.76, 0.42, 0.2],
      black: [0.025, 0.04, 0.052],
      cyan: [0.19, 0.66, 0.72],
      red: [0.72, 0.12, 0.16],
      floor: [0.17, 0.2, 0.22],
      grid: [0.23, 0.27, 0.29],
      white: [0.7, 0.75, 0.75],
    };
    function stages(g) {
      let a = Math.floor(Math.sqrt(g));
      while (g % a) a--;
      return [a, g / a];
    }
    function makeBuilder() {
      const vertices = [];
      let bone = 1,
        tag = 0,
        gloss = 0.25;
      function tri(a, b, c, color, normals) {
        const n = V.norm(V.cross(V.sub(b, a), V.sub(c, a)));
        for (let i = 0; i < 3; i++)
          vertices.push(...[a, b, c][i], ...(normals ? normals[i] : n), ...color, bone, tag, gloss);
      }
      function quad(a, b, c, d, color, normals) {
        tri(a, b, c, color, normals ? [normals[0], normals[1], normals[2]] : null);
        tri(a, c, d, color, normals ? [normals[0], normals[2], normals[3]] : null);
      }
      function mode(b, t = 0, g = 0.25) {
        bone = b;
        tag = t;
        gloss = g;
      }
      function box(c, size, color) {
        const p = [];
        for (const x of [-1, 1])
          for (const y of [-1, 1])
            for (const z of [-1, 1])
              p.push([
                c[0] + (x * size[0]) / 2,
                c[1] + (y * size[1]) / 2,
                c[2] + (z * size[2]) / 2,
              ]);
        for (const q of [
          [0, 1, 3, 2],
          [4, 6, 7, 5],
          [0, 4, 5, 1],
          [2, 3, 7, 6],
          [0, 2, 6, 4],
          [1, 5, 7, 3],
        ])
          quad(...q.map((i) => p[i]), color);
      }
      function cylinder(c, r, length, color, axis = "y", n = 36, inner = 0) {
        const pt = (a, rr, k) =>
          axis === "y"
            ? [c[0] + rr * Math.cos(a), c[1] + k, c[2] + rr * Math.sin(a)]
            : axis === "z"
              ? [c[0] + rr * Math.cos(a), c[1] + rr * Math.sin(a), c[2] + k]
              : [c[0] + k, c[1] + rr * Math.cos(a), c[2] + rr * Math.sin(a)];
        const normal = (a) =>
          axis === "y"
            ? [Math.cos(a), 0, Math.sin(a)]
            : axis === "z"
              ? [Math.cos(a), Math.sin(a), 0]
              : [0, Math.cos(a), Math.sin(a)];
        for (let i = 0; i < n; i++) {
          const a = (i * TAU) / n,
            b = ((i + 1) * TAU) / n;
          quad(
            pt(a, r, -length / 2),
            pt(b, r, -length / 2),
            pt(b, r, length / 2),
            pt(a, r, length / 2),
            color,
            [normal(a), normal(b), normal(b), normal(a)],
          );
          quad(
            pt(a, r, -length / 2),
            pt(b, r, -length / 2),
            pt(b, inner, -length / 2),
            pt(a, inner, -length / 2),
            color,
          );
          quad(
            pt(a, inner, length / 2),
            pt(b, inner, length / 2),
            pt(b, r, length / 2),
            pt(a, r, length / 2),
            color,
          );
          if (inner) {
            const na = normal(a).map((v) => -v),
              nb = normal(b).map((v) => -v);
            quad(
              pt(a, inner, -length / 2),
              pt(a, inner, length / 2),
              pt(b, inner, length / 2),
              pt(b, inner, -length / 2),
              color,
              [na, na, nb, nb],
            );
          }
        }
      }
      function tube(points, r, color, n = 8) {
        for (let k = 0; k < points.length - 1; k++) {
          const a = points[k],
            b = points[k + 1],
            dir = V.norm(V.sub(b, a)),
            u = V.norm(V.cross(dir, Math.abs(dir[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1])),
            v = V.cross(dir, u);
          const p = (o, t) =>
            V.add(o, V.add(V.scale(u, r * Math.cos(t)), V.scale(v, r * Math.sin(t))));
          for (let j = 0; j < n; j++) {
            const t = (j * TAU) / n,
              tt = ((j + 1) * TAU) / n;
            quad(p(a, t), p(a, tt), p(b, tt), p(b, t), color);
          }
        }
      }
      function prismXZ(poly, y, depth, color) {
        const points = poly.map(([x, z]) => [x, y - depth / 2, z]),
          front = poly.map(([x, z]) => [x, y + depth / 2, z]);
        for (let i = 1; i < poly.length - 1; i++) {
          tri(points[0], points[i + 1], points[i], color);
          tri(front[0], front[i], front[i + 1], color);
        }
        for (let i = 0; i < poly.length; i++) {
          const j = (i + 1) % poly.length;
          quad(points[i], points[j], front[j], front[i], color);
        }
      }
      function gear(c, r, teeth, color, phase = 0) {
        const depth = 0.01,
          module = (2 * r) / teeth,
          root = Math.max(r * 0.65, r - 1.25 * module),
          tip = r + module,
          poly = [];
        for (let i = 0; i < teeth; i++) {
          const a = (i * TAU) / teeth + phase;
          for (const [k, rr] of [
            [0, root],
            [0.19, root],
            [0.26, tip],
            [0.62, tip],
            [0.69, root],
            [1, root],
          ])
            poly.push([
              c[0] + rr * Math.cos(a + (k * TAU) / teeth),
              c[2] + rr * Math.sin(a + (k * TAU) / teeth),
            ]);
        }
        for (let i = 0; i < poly.length; i++) {
          const j = (i + 1) % poly.length,
            p = poly[i],
            q = poly[j];
          tri(
            [c[0], c[1] - depth / 2, c[2]],
            [q[0], c[1] - depth / 2, q[1]],
            [p[0], c[1] - depth / 2, p[1]],
            color,
          );
          tri(
            [c[0], c[1] + depth / 2, c[2]],
            [p[0], c[1] + depth / 2, p[1]],
            [q[0], c[1] + depth / 2, q[1]],
            color,
          );
          quad(
            [p[0], c[1] - depth / 2, p[1]],
            [q[0], c[1] - depth / 2, q[1]],
            [q[0], c[1] + depth / 2, q[1]],
            [p[0], c[1] + depth / 2, p[1]],
            color,
          );
        }
        cylinder(c, r * 0.36, depth + 0.006, materials.steel, "y", 20, 0.0035);
        for (let i = 0; i < 4; i++) {
          const a = (i * TAU) / 4;
          cylinder(
            [c[0] + r * 0.63 * Math.cos(a), c[1] + 0.0055, c[2] + r * 0.63 * Math.sin(a)],
            Math.max(0.001, r * 0.1),
            0.0015,
            materials.dark,
            "y",
            10,
          );
        }
      }
      function radialBolt(c, r, n = 6, axis = "y", size = 0.004) {
        for (let j = 0; j < n; j++) {
          const a = (j * TAU) / n;
          const p =
            axis === "y"
              ? [c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)]
              : [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]];
          cylinder(p, size, 0.006, materials.bright, axis, 6);
        }
      }
      return { vertices, mode, box, cylinder, tube, gear, prismXZ, radialBolt };
    }
    function build() {
      if (!rg) return;
      const B = makeBuilder(),
        M = materials;
      const gearR = 0.055,
        [a, b] = stages(state.gear),
        rs1 = gearR / a,
        rs2 = gearR / b,
        d1 = gearR + rs1,
        d2 = gearR + rs2 + 2 * rs2 * sim.idlers;
      geo = { a, b, gearR, rs1, rs2, d1, d2, moduleOrigin: [-d2, 0, 0.32], motorCenter: null };
      // Fixed floor and joint pedestal: the application contains only the articulated arm.
      B.mode(0, 9, 0.02);
      B.box([0, 0, -0.025], [24, 8, 0.05], M.floor);
      for (let x = -12; x <= 12; x += 0.5) B.box([x, 0, 0.0005], [0.002, 7.9, 0.001], M.grid);
      for (let y = -4; y <= 4; y += 0.5) B.box([0, y, 0.0006], [23.9, 0.002, 0.001], M.grid);
      {
        // Arm fixed base and mounting flange.
        B.mode(1, 0, 0.35);
        B.cylinder([0, 0, 0.025], 0.16, 0.05, M.dark, "z", 48);
        B.cylinder([0, 0, 0.059], 0.135, 0.024, M.steel, "z", 40);
        B.radialBolt([0, 0, 0.075], 0.113, 8, "z", 0.007);
        B.cylinder([0, 0, 0.17], 0.095, 0.2, M.dark, "z", 40);
        B.cylinder([0, 0, 0.266], 0.105, 0.025, M.yellow, "z", 40);
        B.box([0, 0, 0.29], [0.17, 0.18, 0.07], M.steel);
        for (const y of [-0.066, 0.066]) B.box([0, y, 0.32], [0.18, 0.034, 0.11], M.dark);
        B.cylinder([0, -0.09, 0.32], 0.075, 0.024, M.steel, "y", 36);
        B.radialBolt([0, -0.106, 0.32], 0.058, 8, "y", 0.004);
        function armLink(bone, length, width) {
          B.mode(bone, 0, 0.38);
          const poly = [
            [0.006, -width * 0.55],
            [length - 0.035, -width * 0.36],
            [length + 0.008, -width * 0.2],
            [length + 0.008, width * 0.2],
            [length - 0.035, width * 0.36],
            [0.006, width * 0.55],
            [-0.016, width * 0.32],
            [-0.016, -width * 0.32],
          ];
          B.prismXZ(poly, 0, 0.09, M.steel);
          for (const y of [-0.05, 0.05])
            B.prismXZ(
              [
                [0.035, -width * 0.41],
                [length - 0.045, -width * 0.26],
                [length - 0.045, width * 0.26],
                [0.035, width * 0.41],
              ],
              y,
              0.012,
              M.dark,
            );
          B.box([length * 0.49, 0, width * 0.48], [length * 0.68, 0.03, 0.013], M.yellow);
          B.cylinder([0, 0, 0], width * 0.75, 0.12, M.dark, "y", 36);
          B.cylinder([length, 0, 0], width * 0.58, 0.105, M.steel, "y", 32);
          B.radialBolt([0, 0.064, 0], width * 0.55, 6, "y", 0.004);
          for (const x of [0.07, length - 0.07])
            B.box([x, 0.077, width * 0.42], [0.025, 0.03, 0.02], M.dark);
        }
        armLink(2, 0.43, 0.1);
        armLink(3, 0.37, 0.083);
        B.mode(3, 0, 0.35);
        B.cylinder([0, 0.063, 0], 0.052, 0.025, M.dark, "y", 36);
        B.cylinder([0, 0.08, 0], 0.038, 0.01, M.yellow, "y", 28);
        B.radialBolt([0, 0.087, 0], 0.03, 6, "y", 0.0035);
        // Wrist and parallel gripper are rigidly carried by the forearm.
        B.mode(4, 0, 0.4);
        B.cylinder([0.023, 0, 0], 0.04, 0.066, M.steel, "x", 32);
        B.cylinder([0.059, 0, 0], 0.035, 0.011, M.dark, "x", 32);
        B.box([0.096, 0, 0], [0.064, 0.105, 0.052], M.dark);
        B.box([0.126, 0, 0], [0.016, 0.117, 0.025], M.steel);
        for (const s of [-1, 1]) {
          B.box([0.155, s * 0.043, 0], [0.069, 0.018, 0.023], M.steel);
          B.box([0.185, s * 0.034, -0.006], [0.014, 0.034, 0.034], M.dark);
          B.box([0.184, s * 0.021, -0.006], [0.013, 0.007, 0.029], M.rubber);
          B.cylinder([0.143, s * 0.045, 0.015], 0.003, 0.005, M.bright, "z", 6);
        }
      }
      // The selected drive has a motor, two external meshes and a continuous output shaft.
      const o = geo.moduleOrigin,
        at = (x, y, z) => [o[0] + x, o[1] + y, o[2] + z],
        motorX = -d1,
        shaftOutputX = d2,
        motorR = gearR * 0.65,
        motorLen = 0.15;
      geo.motorCenter = at(motorX, -motorLen / 2 - 0.033, 0);
      geo.inputCenter = at(-d1, 0, 0);
      geo.middleCenter = at(0, 0, 0);
      geo.outputCenter = at(d2, 0, 0);
      B.mode(1, 5, 0.4);
      B.box(
        at((d2 - d1) / 2, -0.027, 0),
        [d1 + d2 + 2 * gearR + 0.012, 0.013, gearR * 2 + 0.035],
        M.dark,
      );
      B.mode(1, 1, 0.4);
      for (const x of [-d1, d2]) {
        B.cylinder(at(x, -0.014, 0), Math.max(0.008, gearR * 0.26), 0.012, M.steel, "y", 24, 0.004);
        B.box(at(x, -0.035, -gearR - 0.019), [gearR * 0.75, 0.065, 0.015], M.steel);
        B.cylinder(at(x, -0.038, -gearR - 0.009), 0.004, 0.012, M.bright, "z", 6);
      }
      B.mode(1, 5, 0.3);
      B.box(
        at((d2 - d1) / 2, 0.018, 0),
        [d1 + d2 + 2 * gearR + 0.02, 0.074, gearR * 2 + 0.04],
        M.dark,
      );
      B.mode(1, 1, 0.45);
      B.mode(1, 5, 0.45);
      B.cylinder(geo.motorCenter, motorR, motorLen, M.steel, "y", 40, motorR * 0.86);
      B.mode(1, 1, 0.45);
      B.cylinder(
        at(motorX, -motorLen - 0.035, 0),
        motorR * 0.95,
        0.016,
        M.dark,
        "y",
        30,
        motorR * 0.68,
      );
      for (let j = 0; j < 8; j++) {
        const a = (j * TAU) / 8;
        B.tube(
          [
            at(motorX + motorR * Math.cos(a), -0.045, motorR * Math.sin(a)),
            at(motorX + motorR * Math.cos(a), -motorLen - 0.02, motorR * Math.sin(a)),
          ],
          0.0018,
          M.dark,
          6,
        );
      }
      B.box(at(motorX, -motorLen - 0.048, motorR * 0.65), [motorR, 0.014, 0.014], M.black);
      {
        B.mode(1, 1, 0.35);
        B.cylinder(
          at(motorX, -motorLen - 0.047, 0),
          motorR * 1.08,
          0.022,
          M.dark,
          "y",
          32,
          motorR * 0.75,
        );
      }
      // Internal brushed motor mounted on the shoulder gearbox input shaft.
      B.mode(1, 1, 0.4);
      for (const side of [-1, 1]) {
        B.box(
          at(motorX + side * motorR * 0.8, -0.105, 0),
          [motorR * 0.3, 0.095, motorR * 1.08],
          side > 0 ? M.red : M.cyan,
        );
        B.box(
          at(motorX + side * motorR * 0.49, -0.164, 0),
          [motorR * 0.48, 0.016, motorR * 0.32],
          M.black,
        );
      }
      geo.terminalA = at(motorX + motorR * 0.9, -motorLen - 0.049, motorR * 0.55);
      geo.terminalB = at(motorX - motorR * 0.9, -motorLen - 0.049, motorR * 0.55);
      geo.controller = [-0.23, -0.12, 0.11];
      B.box([-0.17, -0.1, 0.027], [0.25, 0.14, 0.018], M.steel);
      B.box(geo.controller, [0.12, 0.11, 0.12], M.dark);
      B.box([-0.23, -0.178, 0.125], [0.082, 0.007, 0.036], M.cyan);
      for (const [terminal, side] of [
        [geo.terminalA, 1],
        [geo.terminalB, -1],
      ]) {
        B.cylinder(terminal, 0.004, 0.013, M.copper, "z", 16);
        const color = side * state.dir > 0 ? M.red : M.cyan;
        const start = [-0.23 + side * 0.025, -0.12, 0.17];
        B.tube(
          [
            start,
            [start[0], -0.2, 0.19],
            [terminal[0], -0.235, 0.24],
            [terminal[0], terminal[1], terminal[2] + 0.007],
          ],
          0.003,
          color,
          8,
        );
      }
      B.mode(6, 2, 0.55);
      B.cylinder([0, -0.105, 0], motorR * 0.52, 0.092, M.steel, "y", 28);
      for (let k = 0; k < 6; k++) {
        const angle = (k * TAU) / 6,
          x = Math.cos(angle) * motorR * 0.53,
          z = Math.sin(angle) * motorR * 0.53;
        B.tube(
          [
            [x, -0.149, z],
            [x, -0.061, z],
          ],
          motorR * 0.1,
          M.copper,
          8,
        );
      }
      B.cylinder([0, -0.164, 0], motorR * 0.25, 0.016, M.copper, "y", 24);
      B.box([0, -0.173, 0], [0.0015, 0.0018, motorR * 0.51], M.black);
      B.cylinder([0, -0.112, 0], 0.0038, 0.19, M.bright, "y", 20);
      B.mode(6, 2, 0.65);
      B.cylinder([0, -0.035, 0], Math.max(0.003, gearR * 0.09), 0.09, M.bright, "y", 24);
      B.cylinder([0, -0.032, 0], motorR * 0.83, 0.012, M.copper, "y", 24);
      B.gear([0, -0.008, 0], rs1, 18, M.copper);
      B.box([motorR * 0.45, -0.04, 0], [motorR * 0.65, 0.006, 0.004], M.cyan);
      B.mode(7, 3, 0.65);
      B.cylinder([0, 0.013, 0], Math.max(0.003, gearR * 0.1), 0.075, M.bright, "y", 24);
      B.gear([0, -0.008, 0], gearR, 18 * a, M.steel, Math.PI / (18 * a));
      B.gear([0, 0.027, 0], rs2, 18, M.copper);
      for (let j = 0; j < sim.idlers; j++) {
        B.mode(9 + j, 3, 0.65);
        B.cylinder([0, 0.02, 0], Math.max(0.002, rs2 * 0.22), 0.035, M.bright, "y", 20);
        B.gear([0, 0.027, 0], rs2, 18, M.copper, Math.PI / 18);
      }
      B.mode(8, 4, 0.65);
      B.cylinder([0, 0.015, 0], Math.max(0.004, gearR * 0.13), 0.17, M.bright, "y", 24);
      B.gear([0, 0.027, 0], gearR, 18 * b, M.steel, Math.PI / (18 * b));
      B.cylinder([0, 0.073, 0], gearR * 0.35, 0.016, M.dark, "y", 28);
      B.radialBolt([0, 0.084, 0], gearR * 0.25, 6, "y", 0.0025);
      rg.bindBuffer(rg.ARRAY_BUFFER, buf);
      rg.bufferData(rg.ARRAY_BUFFER, new Float32Array(B.vertices), rg.STATIC_DRAW);
      count = B.vertices.length / 12;
      sim.config = [state.gear, sim.idlers, state.dir].join(":");
      sim.dirty = false;
    }
    function init() {
      try {
        rg = cv.getContext("webgl", { antialias: true, alpha: true, preserveDrawingBuffer: true });
        if (!rg) throw Error("WebGL not available");
        const vs = `attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;attribute float aBone;attribute float aTag;attribute float aGloss;uniform mat4 uVP;uniform mat4 uBones[11];uniform float uCut;uniform float uDetail;varying vec3 vC;varying vec3 vN;varying vec3 vW;varying float vGloss;void main(){mat4 M=uBones[0];if(aBone>.5)M=uBones[1];if(aBone>1.5)M=uBones[2];if(aBone>2.5)M=uBones[3];if(aBone>3.5)M=uBones[4];if(aBone>4.5)M=uBones[5];if(aBone>5.5)M=uBones[6];if(aBone>6.5)M=uBones[7];if(aBone>7.5)M=uBones[8];if(aBone>8.5)M=uBones[9];if(aBone>9.5)M=uBones[10];vec4 p=M*vec4(aP,1.);vN=mat3(M)*aN;vC=aC;vW=p.xyz;vGloss=aGloss;gl_Position=uVP*p;if((uCut>.5&&abs(aTag-5.)<.1)||(uDetail>.5&&(aTag<.5||aTag>5.5)))gl_Position=vec4(2.,2.,2.,1.);}`;
        const fs = `precision mediump float;varying vec3 vC;varying vec3 vN;varying vec3 vW;varying float vGloss;uniform vec3 uEye;uniform vec3 uShadow;void main(){vec3 N=normalize(vN),L=normalize(vec3(-.35,.55,1.));vec3 V=normalize(uEye-vW);float d=max(dot(N,L),0.);float fill=max(dot(N,normalize(vec3(.8,-.5,.5))),0.);float spec=pow(max(dot(N,normalize(L+V)),0.),12.+vGloss*50.)*(.05+vGloss*.38);vec3 C=vC*(.36+.64*d+.20*fill)+spec*vec3(.86,.92,1.);if(vW.z<.002){vec2 q=(vW.xy-uShadow.xy)/vec2(uShadow.z,.48);float sh=exp(-2.5*dot(q,q));C*=1.-.43*sh;float grain=fract(sin(dot(floor(vW.xy*280.),vec2(12.9898,78.233)))*43758.54);C*=.97+.045*grain;}C+=pow(1.-max(dot(N,V),0.),3.)*.02;gl_FragColor=vec4(C,1.);}`;
        function compile(type, src) {
          const s = rg.createShader(type);
          rg.shaderSource(s, src);
          rg.compileShader(s);
          if (!rg.getShaderParameter(s, rg.COMPILE_STATUS)) throw Error(rg.getShaderInfoLog(s));
          return s;
        }
        program = rg.createProgram();
        rg.attachShader(program, compile(rg.VERTEX_SHADER, vs));
        rg.attachShader(program, compile(rg.FRAGMENT_SHADER, fs));
        rg.linkProgram(program);
        if (!rg.getProgramParameter(program, rg.LINK_STATUS))
          throw Error(rg.getProgramInfoLog(program));
        rg.useProgram(program);
        buf = rg.createBuffer();
        dynamicBuf = rg.createBuffer();
        locations = {
          vp: rg.getUniformLocation(program, "uVP"),
          bones: rg.getUniformLocation(program, "uBones[0]"),
          cut: rg.getUniformLocation(program, "uCut"),
          detail: rg.getUniformLocation(program, "uDetail"),
          eye: rg.getUniformLocation(program, "uEye"),
          shadow: rg.getUniformLocation(program, "uShadow"),
        };
        rg.enable(rg.DEPTH_TEST);
        rg.disable(rg.CULL_FACE);
        holder.classList.add("webgl-ready");
        build();
      } catch (e) {
        rg = null;
        cv.classList.add("hidden");
        overlay.classList.add("hidden");
        set("robotSceneBadge", "二维备用示意");
        console.info("Robot scene fallback:", e.message);
      }
    }
    function bind(buffer) {
      rg.bindBuffer(rg.ARRAY_BUFFER, buffer);
      let offset = 0;
      for (const [n, size] of [
        ["aP", 3],
        ["aN", 3],
        ["aC", 3],
        ["aBone", 1],
        ["aTag", 1],
        ["aGloss", 1],
      ]) {
        const loc = rg.getAttribLocation(program, n);
        rg.enableVertexAttribArray(loc);
        rg.vertexAttribPointer(loc, size, rg.FLOAT, false, 48, offset * 4);
        offset += size;
      }
    }
    function active() {
      return sim.arm;
    }
    function armPoints(q) {
      const root = [0, 0, 0.32],
        a = q,
        b = q - (65 * Math.PI) / 180,
        c = b - (25 * Math.PI) / 180,
        elbow = [0.43 * Math.cos(a), 0, 0.32 + 0.43 * Math.sin(a)],
        wrist = [elbow[0] + 0.37 * Math.cos(b), 0, elbow[2] + 0.37 * Math.sin(b)],
        tool = [wrist[0] + 0.185 * Math.cos(c), 0, wrist[2] + 0.185 * Math.sin(c)];
      return { root, elbow, wrist, tool, a, b, c };
    }
    function point(M, p) {
      return [
        M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
        M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
        M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
      ];
    }
    function draw(dt = 0) {
      if (!rg || currentScreen !== "robot" || document.hidden) return;
      const W = cv.clientWidth,
        H = cv.clientHeight;
      if (!W || !H) return;
      if (sim.dirty || sim.config !== [state.gear, sim.idlers, state.dir].join(":")) build();
      const s = sim.arm,
        bones = Array.from({ length: 11 }, I),
        base = 0,
        p = armPoints(s.q);
      bones[2] = pose(p.root, -p.a);
      bones[3] = pose(p.elbow, -p.b);
      bones[4] = pose(p.wrist, -p.c);
      for (let j = 0; j < sim.idlers; j++) {
        const o = geo.moduleOrigin;
        bones[9 + j] = pose(
          [o[0] + base + 2 * geo.rs2 * (j + 1), o[1], o[2]],
          j % 2 ? s.middle : -s.middle,
        );
      }
      for (const [bone, origin, angle] of [
        [6, geo.inputCenter, s.input],
        [7, geo.middleCenter, s.middle],
        [8, geo.outputCenter, s.output],
      ])
        bones[bone] = pose([origin[0] + base, origin[1], origin[2]], angle);
      sim.cameraSnap = false;
      const desiredCenter = componentCenter(),
        desiredDistance =
          sim.componentFocus?.dist || (sim.focus === "motor" ? 0.34 : sim.detail ? 0.49 : 2);
      const ease = reduced ? 1 : 1 - Math.exp(-Math.max(dt, 0.016) / 0.13);
      if (!sim.cameraCenter) sim.cameraCenter = [...desiredCenter];
      sim.cameraCenter = sim.cameraCenter.map((v, i) => v + (desiredCenter[i] - v) * ease);
      sim.cameraDistance += (desiredDistance - sim.cameraDistance) * ease;
      const center = sim.cameraCenter,
        dist = (sim.cameraDistance * Math.max(1, 1.25 / (W / H))) / sim.zoom,
        eye = [
          center[0] + dist * Math.cos(sim.elev) * Math.cos(sim.yaw),
          center[1] + dist * Math.cos(sim.elev) * Math.sin(sim.yaw),
          center[2] + dist * Math.sin(sim.elev),
        ];
      const vp = matmul(perspective(0.66, W / H, 0.012, 60), lookAt(eye, center));
      const ratio = Math.min(devicePixelRatio || 1, 1.6);
      if (cv.width !== Math.round(W * ratio) || cv.height !== Math.round(H * ratio)) {
        cv.width = Math.round(W * ratio);
        cv.height = Math.round(H * ratio);
      }
      rg.viewport(0, 0, cv.width, cv.height);
      rg.clearColor(0.042, 0.069, 0.093, 1);
      rg.clear(rg.COLOR_BUFFER_BIT | rg.DEPTH_BUFFER_BIT);
      rg.useProgram(program);
      rg.uniformMatrix4fv(locations.vp, false, vp);
      rg.uniformMatrix4fv(
        locations.bones,
        false,
        new Float32Array(bones.flatMap((m) => Array.from(m))),
      );
      rg.uniform1f(locations.cut, sim.cut || sim.detail ? 1 : 0);
      rg.uniform1f(locations.detail, sim.detail ? 1 : 0);
      rg.uniform3fv(locations.eye, new Float32Array(eye));
      rg.uniform3fv(locations.shadow, new Float32Array([0, 0, 0.2]));
      bind(buf);
      rg.drawArrays(rg.TRIANGLES, 0, count);
      if (!sim.detail) {
        const B = makeBuilder();
        B.mode(0, 0, 0.1);
        const p = armPoints(s.q),
          p0 = [-0.1, 0.112, 0.16],
          p1 = [-0.08, 0.112, 0.32],
          p2 = point(bones[2], [0.09, 0.112, 0.055]),
          p3 = point(bones[2], [0.36, 0.112, 0.05]),
          p4 = point(bones[3], [0.08, 0.108, 0.045]),
          p5 = point(bones[3], [0.3, 0.105, 0.04]),
          p6 = point(bones[4], [0.04, 0.1, 0.018]);
        const controls = [p0, p1, p2, p3, p4, p5, p6],
          pts = [];
        for (let i = 0; i < controls.length - 1; i++) {
          const a = controls[Math.max(0, i - 1)],
            b = controls[i],
            c = controls[i + 1],
            e = controls[Math.min(controls.length - 1, i + 2)];
          for (let j = 0; j < 6; j++) {
            const t = j / 6,
              t2 = t * t,
              t3 = t2 * t;
            pts.push(
              b.map(
                (v, k) =>
                  0.5 *
                  (2 * v +
                    (-a[k] + c[k]) * t +
                    (2 * a[k] - 5 * v + 4 * c[k] - e[k]) * t2 +
                    (-a[k] + 3 * v - 3 * c[k] + e[k]) * t3),
              ),
            );
          }
        }
        pts.push(p6);
        B.tube(pts, 0.007, materials.black, 8);
        rg.bindBuffer(rg.ARRAY_BUFFER, dynamicBuf);
        rg.bufferData(rg.ARRAY_BUFFER, new Float32Array(B.vertices), rg.DYNAMIC_DRAW);
        bind(dynamicBuf);
        rg.drawArrays(rg.TRIANGLES, 0, B.vertices.length / 12);
      }
      annotate(vp, W, H, base, bones);
      lastDraw = performance.now();
    }
    const overlayGraphics = svgEl("g", { "aria-hidden": "true" }),
      overlayParticles = svgEl("g", { id: "robotParticleLayer", class: "current-particle-layer" }),
      overlayLabels = svgEl("g"),
      overlayLeaders = svgEl("g");
    overlay.replaceChildren();
    const defs = svgEl("defs");
    for (const [id, color] of [
      ["currentIn", "#f47979"],
      ["currentOut", "#66c7ff"],
      ["driveArrow", "#e9b971"],
    ]) {
      const marker = svgEl("marker", {
        id,
        viewBox: "0 0 10 10",
        refX: 8,
        refY: 5,
        markerWidth: 5,
        markerHeight: 5,
        orient: "auto",
      });
      marker.append(svgEl("path", { d: "M0 0L10 5L0 10Z", fill: color }));
      defs.append(marker);
    }
    overlay.append(defs, overlayGraphics, overlayParticles, overlayLeaders, overlayLabels);
    const robotLabelNodes = new Map();
    function focusRobotPart(key) {
      const presets = {
        motor: { mode: "motor", dist: 0.26, name: "肩关节内置电机" },
        north: { mode: "motor", dist: 0.23, name: "固定磁极 N" },
        south: { mode: "motor", dist: 0.23, name: "固定磁极 S" },
        brushes: { mode: "motor", dist: 0.19, name: "电刷与换向器" },
        winding: { mode: "motor", dist: 0.23, name: "铜绕组与电枢" },
        shaft: { mode: "drive", dist: 0.26, name: "电机输入轴" },
        geartrain: { mode: "drive", dist: 0.4, name: "两级减速器" },
        gear1: { mode: "drive", dist: 0.28, name: "一级大齿轮" },
        compound: { mode: "drive", dist: 0.25, name: "中间复合轴" },
        output: { mode: "drive", dist: 0.3, name: "输出齿轮与关节法兰" },
        idlers: { mode: "drive", dist: 0.26, name: "惰轮" },
        elbow: { mode: "arm", dist: 0.65, name: "肘关节" },
        tool: { mode: "arm", dist: 0.43, name: "末端夹爪" },
      };
      const preset = presets[key] || presets.motor;
      sim.componentFocus = { key, ...preset };
      sim.focus = preset.mode;
      sim.detail = preset.mode !== "arm";
      sim.cut = true;
      sim.zoom = 1;
      sim.yaw = preset.mode === "drive" ? 0.98 : key === "south" ? -2.1 : -1.15;
      sim.elev = 0.45;
      sim.message = "观察放大：" + preset.name + "。点击其他部件名切换，或点“返回整臂”。";
      draw();
      updateUI();
    }
    function componentCenter() {
      const key = sim.componentFocus?.key,
        r = geo.gearR * 0.65;
      if (key === "north" || key === "south")
        return [
          geo.motorCenter[0] + (key === "north" ? 1 : -1) * r * 0.8,
          geo.motorCenter[1],
          geo.motorCenter[2],
        ];
      if (key === "brushes") return [geo.inputCenter[0], -0.164, 0.32];
      if (key === "winding" || key === "motor") return geo.motorCenter;
      if (key === "shaft") return geo.inputCenter;
      if (key === "gear1" || key === "compound") return [geo.middleCenter[0], 0.01, 0.32];
      if (key === "output") return geo.outputCenter;
      if (key === "idlers") return [geo.moduleOrigin[0] + geo.rs2 * (sim.idlers + 1), 0.027, 0.32];
      if (key === "elbow") return armPoints(sim.arm.q).elbow;
      if (key === "tool") return armPoints(sim.arm.q).tool;
      return sim.focus === "motor"
        ? geo.motorCenter
        : sim.detail
          ? [(geo.inputCenter[0] + geo.outputCenter[0]) / 2, -0.045, 0.32]
          : [0.23, -0.015, 0.48];
    }
    function annotate(vp, W, H, base, bones) {
      $("robotEMLegend").hidden = !(state.showEM && sim.focus === "motor");
      const project = (p) => {
        const v = [...p, 1],
          o = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) o[i] += vp[j * 4 + i] * v[j];
        return [((o[0] / o[3] + 1) * W) / 2, ((1 - o[1] / o[3]) * H) / 2];
      };
      overlay.setAttribute("viewBox", `0 0 ${W} ${H}`);
      overlayGraphics.replaceChildren();
      const s = sim.arm,
        r = geo.gearR * 0.65,
        bodyPoles = svgEl("g");
      overlayGraphics.append(bodyPoles);
      const calls =
        sim.focus === "motor"
          ? [
              [
                "north",
                "固定磁体 N",
                [geo.motorCenter[0] + r * 0.8, geo.motorCenter[1], 0.32],
                0.04,
                0.32,
              ],
              [
                "south",
                "固定磁体 S",
                [geo.motorCenter[0] - r * 0.8, geo.motorCenter[1], 0.32],
                0.62,
                0.32,
              ],
              ["brushes", "电刷 / 旋转换向器", [geo.inputCenter[0], -0.164, 0.32], 0.04, 0.55],
              ["winding", "铜绕组＋电枢铁芯", geo.motorCenter, 0.62, 0.55],
              ["shaft", "输入轴 → 一级小齿轮", [geo.inputCenter[0], -0.016, 0.32], 0.04, 0.73],
            ]
          : sim.detail
            ? [
                ["shaft", "① 电机轴 / Z₁=18", geo.inputCenter, 0.06, 0.32],
                [
                  "gear1",
                  "② 一级大齿轮 Z₂=" + 18 * geo.a,
                  [geo.middleCenter[0], -0.008, 0.32 + geo.gearR * 0.7],
                  0.62,
                  0.31,
                ],
                ["compound", "③ 同轴小齿轮 Z₃=18", [geo.middleCenter[0], 0.027, 0.32], 0.06, 0.64],
                [
                  "output",
                  "④ 输出 Z₄=" + 18 * geo.b + " → 法兰",
                  [geo.outputCenter[0], 0.03, 0.32],
                  0.61,
                  0.65,
                ],
              ]
            : [
                ["motor", "肩内电机 / 电刷端子", geo.motorCenter, 0.04, 0.33],
                ["geartrain", "两级减速 → 关节法兰", geo.outputCenter, 0.64, 0.35],
                ["elbow", "肘腕沿关节链运动", armPoints(s.q).elbow, 0.64, 0.55],
                ["tool", "夹爪末端 / 巡检定位", armPoints(s.q).tool, 0.65, 0.72],
              ];
      if (sim.focus === "motor")
        for (const [pole, side] of [
          ["N", 1],
          ["S", -1],
        ]) {
          const [x, y] = project([geo.motorCenter[0] + side * r * 0.8, geo.motorCenter[1], 0.32]);
          if (x > 12 && x < W - 12 && y > 12 && y < H - 12)
            magneticBadge(bodyPoles, x, y, pole, "arm-motor");
        }
      if (sim.detail && sim.focus !== "motor") {
        const pts = [geo.inputCenter, geo.middleCenter];
        for (let k = 0; k < sim.idlers; k++)
          pts.push([geo.moduleOrigin[0] + 2 * geo.rs2 * (k + 1), 0.027, 0.32]);
        pts.push(geo.outputCenter);
        const xy = pts.map(project);
        overlayGraphics.append(
          svgEl("path", {
            d: xy.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(""),
            class: "transmission-vector",
            stroke: "#e9b971",
            "stroke-width": 2,
            "stroke-dasharray": "5 5",
            "stroke-dashoffset": -s.output * 30,
            opacity: 0.75,
            fill: "none",
            "marker-end": "url(#driveArrow)",
          }),
        );
        if (sim.idlers)
          calls.push([
            "idlers",
            "惰轮 × " + sim.idlers + " / 只改转向",
            [geo.moduleOrigin[0] + geo.rs2 * (sim.idlers + 1), 0.027, 0.32],
            0.36,
            0.48,
          ]);
      }
      const routes = [];
      const showElectrical = !sim.componentFocus || sim.componentFocus.mode !== "arm";
      if (showElectrical)
        for (const [name, p, plus] of [
          ["A", geo.terminalA, state.dir > 0],
          ["B", geo.terminalB, state.dir < 0],
        ]) {
          const [x, y] = project(p),
            color = model.terminalU ? (plus ? "#f47979" : "#66c7ff") : "#93a6b2";
          const g = svgEl("g", { "data-arm-terminal": name });
          g.append(
            svgEl("circle", {
              cx: x,
              cy: y,
              r: 4,
              fill: color,
              stroke: "#061019",
              "stroke-width": 1,
            }),
          );
          const text = svgEl("text", {
            x: clamp(x + 7, 5, W - 38),
            y: clamp(y - 7, 128, H - 100),
            fill: color,
            class: "arm-pole-label",
          });
          text.textContent = name + (model.terminalU ? (plus ? "＋" : "−") : "—");
          g.append(text);
          overlayGraphics.append(g);
          const side = name === "A" ? 1 : -1,
            start = [-0.23 + side * 0.025, -0.12, 0.17];
          const points = [
            start,
            [start[0], -0.2, 0.19],
            [p[0], -0.235, 0.24],
            [p[0], p[1], p[2] + 0.007],
          ];
          if (!plus) points.reverse();
          const projected = points.map(project);
          overlayGraphics.append(
            svgEl("path", {
              d: projected.map((v, i) => (i ? "L" : "M") + v[0] + " " + v[1]).join(""),
              class: "current-vector",
              stroke: color,
              "stroke-width": 1,
              fill: "none",
              opacity: 0.32,
              "marker-end": model.I > 0 ? `url(#${plus ? "currentIn" : "currentOut"})` : "",
            }),
          );
          routes.push({
            key: "terminal-" + name,
            points: projected,
            color: plus ? "#ff9eaa" : "#8dd8ff",
          });
        }
      if (sim.focus === "motor" && Math.abs(Math.cos(s.input)) > 1e-4) {
        const sign = state.dir * (Math.cos(s.input) >= 0 ? 1 : -1);
        for (const side of [-1, 1]) {
          const points = [
            [side * r * 0.53, -0.149, 0],
            [side * r * 0.53, -0.061, 0],
          ];
          if (side * sign > 0) points.reverse();
          routes.push({
            key: "arm-winding-" + side,
            points: points.map((p) => project(point(bones[6], p))),
            color: "#79f4ef",
          });
        }
      }
      const emGroup = svgEl("g", { id: "robotEMLayer", class: "em-vector-layer" });
      overlayGraphics.append(emGroup);
      drawElectromagneticVectors(emGroup, project, {
        axis: "y",
        angle: s.input,
        dir: state.dir,
        powered: model.I > 1e-6,
        origin: geo.motorCenter,
        radius: r * 0.53,
        fieldHalf: r * 0.63,
        enabled: state.showEM && sim.focus === "motor",
        conductors: true,
        prefix: "robot-em",
        phase: sim.chargeTime,
      });
      paintCurrentParticles(
        overlayParticles,
        routes,
        sim.chargeTime,
        model.I > 1e-6 && showElectrical,
      );
      for (const node of robotLabelNodes.values()) {
        node.g.style.display = "none";
        node.line.style.display = "none";
        node.dot.style.display = "none";
      }
      for (const [key, name, p, fx, fy] of calls) {
        let node = robotLabelNodes.get(key);
        if (!node) {
          const g = svgEl("g", {
              class: "component-label",
              role: "button",
              tabindex: 0,
              "data-robot-component": key,
            }),
            line = svgEl("path", {
              class: "component-leader",
              stroke: "#749bae",
              "stroke-width": 0.8,
              fill: "none",
              opacity: 0.8,
            }),
            dot = svgEl("circle", { class: "component-anchor", r: 2.4, fill: "#58dfed" }),
            rect = svgEl("rect", {
              height: 22,
              rx: 4,
              fill: "#0c202ce8",
              stroke: "#3c667c",
              "stroke-width": 0.7,
            }),
            text = svgEl("text");
          g.append(rect, text);
          overlayLeaders.append(line, dot);
          overlayLabels.append(g);
          const activate = (e) => {
            e.preventDefault();
            e.stopPropagation();
            focusRobotPart(key);
          };
          g.addEventListener("click", activate);
          g.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") activate(e);
          });
          node = { g, line, dot, rect, text };
          robotLabelNodes.set(key, node);
        }
        node.g.style.display = "";
        node.line.style.display = "";
        node.dot.style.display = "";
        node.g.setAttribute("aria-label", name + "，点击聚焦放大");
        node.g.setAttribute("aria-pressed", String(sim.componentFocus?.key === key));
        const [x, y] = project(p),
          width = W < 450 ? 132 : 164,
          tx = clamp(W * fx, 7, W - width - 7),
          ty = clamp(H * fy, 125, H - 151);
        node.line.setAttribute("d", `M${x} ${y}L${tx + 8} ${ty + 10}`);
        node.dot.setAttribute("cx", x);
        node.dot.setAttribute("cy", y);
        for (const [k, v] of Object.entries({ x: tx, y: ty, width })) node.rect.setAttribute(k, v);
        node.text.setAttribute("x", tx + 7);
        node.text.setAttribute("y", ty + 15);
        node.text.textContent = name;
      }
    }

    function limitStop() {
      sim.lastU = state.voltage || sim.lastU;
      state.voltage = 0;
      state.paused = true;
      sim.playing = false;
      sim.arm.limit = true;
      sim.message = "肩关节到达软限位，控制器已切断驱动电压。点击“反向驱动”可返回。";
      $("voltage").value = 0;
      render();
    }
    function advance(dt) {
      if (currentScreen !== "robot") return;
      if (sim.playing && !state.paused && !reduced && model.I > 1e-6)
        sim.chargeTime += dt * (0.6 + Math.min(1.5, Math.sqrt(model.I) * 0.18));
      if (sim.cycle && sim.playing && !state.paused && sim.dwell > 0) {
        sim.dwell = Math.max(0, sim.dwell - dt);
        if (!sim.dwell) {
          state.dir = -state.dir;
          state.voltage = sim.lastU || 24;
          syncInputs();
          rebuildMotor();
          render();
        }
      } else if (sim.playing && !state.paused && model.w > 0) {
        const s = sim.arm,
          [a] = stages(state.gear),
          parity = sim.idlers % 2 ? -1 : 1;
        let dm = (state.dir * model.w * dt) / sim.slow;
        const target = s.q - (parity * dm) / state.gear;
        const lower = ((sim.cycle ? 30 : 20) * Math.PI) / 180,
          upper = ((sim.cycle ? 85 : 105) * Math.PI) / 180;
        const next = sim.cycle
            ? target > s.q
              ? Math.min(target, upper)
              : Math.max(target, lower)
            : clamp(target, lower, upper),
          allowed = s.q - next;
        dm = (allowed * state.gear) / parity;
        s.q = next;
        s.input += dm;
        s.middle -= dm / a;
        s.output += allowed;
        s.t += dt / sim.slow;
        if (Math.abs(target - next) > 1e-9) {
          if (sim.cycle) {
            sim.lastU = state.voltage || sim.lastU;
            state.voltage = 0;
            sim.dwell = 0.7;
            sim.cycles++;
            syncInputs();
            render();
          } else limitStop();
        }
      }
      if (!rg)
        $("armMoving").setAttribute(
          "transform",
          `rotate(${55 - (sim.arm.q * 180) / Math.PI} 245 170)`,
        );
      draw(dt);
      updateUI();
    }
    let teachingKey = "";
    function updateArmTeaching() {
      const [a, b] = stages(state.gear),
        e = Math.sqrt(state.eta),
        sign = state.dir * (sim.idlers % 2 ? -1 : 1);
      const key = [
        state.dir,
        state.gear,
        state.eta,
        sim.idlers,
        state.load,
        model.n,
        model.I,
        model.Pin,
      ].join(":");
      if (key !== teachingKey) {
        teachingKey = key;
        set("driveSupply", fixed(state.voltage) + " V / " + fixed(model.Pin) + " W");
        set(
          "driveTerminals",
          model.terminalU ? (state.dir > 0 ? "A ＋ / B −" : "A − / B ＋") : "A — / B —",
        );
        set("driveCurrent", "I = " + fixed(model.I, 2) + " A");
        set(
          "driveCircuitFlow",
          model.I
            ? state.dir > 0
              ? "＋ → A电刷 → 换向器 → 电枢绕组 → B电刷 → −"
              : "＋ → B电刷 → 换向器 → 电枢绕组 → A电刷 → −"
            : "驱动电压为零，电流回路没有电流；电机和全部传动轴停止。",
        );
        $("driveStageRead").innerHTML =
          `<div><b>② 两级齿轮传递转矩</b><span>输入小齿轮 Z₁ = 18 → 一级大齿轮 Z₂ = ${18 * a}，减速 ${a}:1</span><span>一级大齿轮与二级小齿轮 Z₃ = 18 同轴固定，角速度相同</span><span>${sim.idlers ? sim.idlers + " 个 Z = 18 惰轮 → " : ""}输出大齿轮 Z₄ = ${18 * b}，二级减速 ${b}:1</span><strong>总减速 ${a} × ${b} = ${state.gear}:1 · ${2 + sim.idlers} 次外啮合 · 输出与输入${sim.idlers % 2 ? "反向" : "同向"}</strong></div><div><b>③ 法兰驱动肩关节</b><span>输出轴 ⇄ 同轴关节法兰 ⇄ 上臂；无额外传动比</span><span>ω肩 = −6 n输出（°/s），负号来自本页关节角坐标约定</span></div>`;
        const rows = [
          ["电机 / Z₁", state.dir * model.n, model.T, model.P],
          ["复合轴 Z₂/Z₃", (-state.dir * model.n) / a, model.T * a * e, model.P * e],
          [
            "Z₄ / 关节法兰",
            (sign * model.n) / state.gear,
            model.T * state.gear * state.eta,
            model.P * state.eta,
          ],
        ];
        $("driveStageTable").innerHTML = rows
          .map(
            ([name, n, T, P]) =>
              `<tr><th>${name}</th><td>${n > 0 ? "+" : ""}${fixed(n, 1)}</td><td>${fixed(T, 3)}</td><td>${fixed(P, 1)}</td></tr>`,
          )
          .join("");
        set(
          "driveLossRead",
          "电源 " +
            fixed(model.Pin, 2) +
            " W = 电机损耗 " +
            fixed(model.Pin - model.P, 2) +
            " W + 减速器损耗 " +
            fixed(model.P * (1 - state.eta), 2) +
            " W + 关节输出 " +
            fixed(model.P * state.eta, 2) +
            " W",
        );
        set("robotLoadRead", fixed(state.load, 3) + " N·m");
        $("robotLoad").value = state.load;
      }
      pressed("armCycle", sim.cycle);
      set("armCycle", sim.cycle ? "■ 结束巡检" : "↔ 往返巡检");
      set(
        "armTaskStatus",
        model.stalled
          ? "负载过大，电机堵转 · 请减小负载"
          : sim.cycle
            ? sim.dwell > 0
              ? "端点断电停留 · 随后交换正负极返回"
              : "30° ↔ 85° 巡检定位 · 已到达端点 " + sim.cycles + " 次"
            : "单次手动驱动 · 20°–105° 软限位",
      );
    }
    document.querySelector(".robot-drive-buttons").append($("robotResetPose"));
    $("robotResetPose").textContent = "↺ 重置姿态";
    const gearPane = document.createElement("div");
    gearPane.id = "armGearPane";
    gearPane.className = "hidden";
    gearPane.setAttribute("role", "tabpanel");
    document.querySelector(".app-controls").append(gearPane);
    for (const node of [
      ...document.querySelectorAll(
        "#armDrivePane>.robot-pose, #armDrivePane>.field, #armDrivePane>.app-detail",
      ),
      document.querySelector(".arm-load"),
    ])
      gearPane.append(node);
    const gearTab = document.createElement("button");
    gearTab.id = "armGearTab";
    gearTab.setAttribute("role", "tab");
    gearTab.setAttribute("aria-selected", "false");
    gearTab.textContent = "传动配置";
    document.querySelector(".robot-teaching-tabs").append(gearTab);
    const powerPane = document.createElement("div");
    powerPane.id = "armPowerPane";
    powerPane.className = "hidden";
    powerPane.setAttribute("role", "tabpanel");
    powerPane.innerHTML =
      '<h3 class="arm-power-title">沿传动链核对轴速、转矩与功率</h3><div id="driveLossRead" class="drive-power-balance"></div>';
    document.querySelector(".app-controls").append(powerPane);
    powerPane.insertBefore(document.querySelector(".drive-table-wrap"), $("driveLossRead"));
    const powerTab = document.createElement("button");
    powerTab.id = "armPowerTab";
    powerTab.setAttribute("role", "tab");
    powerTab.setAttribute("aria-selected", "false");
    powerTab.textContent = "轴速功率";
    document.querySelector(".robot-teaching-tabs").insertBefore(powerTab, gearTab);
    document.querySelector(".app-controls").dataset.armTab = "motion";
    const assumptions = document.createElement("details");
    assumptions.className = "arm-assumptions";
    const summary = document.createElement("summary");
    summary.textContent = "计算假设与使用说明";
    assumptions.append(summary, $("appCaption").nextElementSibling, $("appScope"));
    $("appCaption").after(assumptions);
    function choosePanel(name) {
      for (const [key, pane, tab] of [
        ["motion", "armMotionPane", "armMotionTab"],
        ["drive", "armDrivePane", "armDriveTab"],
        ["gear", "armGearPane", "armGearTab"],
        ["power", "armPowerPane", "armPowerTab"],
      ]) {
        $(pane).classList.toggle("hidden", key !== name);
        $(tab).setAttribute("aria-selected", String(key === name));
      }
      document.querySelector(".app-controls").dataset.armTab = name;
      document.querySelector(".app-controls").scrollTop = 0;
    }
    $("armMotionTab").onclick = () => choosePanel("motion");
    $("armDriveTab").onclick = () => choosePanel("drive");
    gearTab.onclick = () => choosePanel("gear");
    powerTab.onclick = () => choosePanel("power");
    $("robotLoad").oninput = (e) => {
      state.load = +e.target.value;
      syncInputs();
      render();
    };
    $("robotMotorDetail").onclick = () => {
      sim.componentFocus = null;
      sim.focus = sim.focus === "motor" ? "arm" : "motor";
      sim.detail = sim.focus === "motor";
      sim.cut = true;
      sim.zoom = 1;
      sim.yaw = -1.15;
      sim.elev = 0.4;
      sim.cameraSnap = true;
      draw();
      updateUI();
    };
    $("armCycle").onclick = () => {
      if (sim.cycle) {
        off();
        return;
      }
      sim.cycle = true;
      const parity = sim.idlers % 2 ? -1 : 1;
      if (sim.arm.q < (30 * Math.PI) / 180) state.dir = -parity;
      else if (sim.arm.q > (85 * Math.PI) / 180) state.dir = parity;
      sim.cycles = 0;
      sim.dwell = 0;
      sim.arm.limit = false;
      sim.playing = true;
      state.paused = false;
      if (!state.voltage) state.voltage = sim.lastU || 24;
      sim.message =
        "巡检定位：肩关节驱动整条关节链，在 30° 与 85° 之间往返。端点先断电停留，再反接返回。";
      syncInputs();
      render();
    };

    function updateUI() {
      if (!$("robotPlay")) return;
      const s = sim.arm,
        paused = !sim.playing || state.paused,
        [a, b] = stages(state.gear),
        sign = state.dir * (sim.idlers % 2 ? -1 : 1);
      set("robotPlay", paused ? "▶ 开始运动" : "Ⅱ 暂停演示");
      set("robotPlayMini", paused ? "▶ 运行" : "Ⅱ 暂停");
      set("robotVoltageRead", fixed(state.voltage) + " V");
      $("robotVoltage").value = state.voltage;
      $("robotSlow").value = sim.slow;
      $("gearRatio").disabled = currentScreen === "robot" && !paused;
      $("armRadius").disabled = false;
      pressed("robotCut", sim.cut);
      pressed("robotDetail", sim.detail && sim.focus === "drive");
      pressed("robotMotorDetail", sim.focus === "motor");
      set(
        "robotSceneBadge",
        (rg ? "ARTICULATED ARM · " : "二维备用示意 · ") +
          (sim.focus === "motor"
            ? "内置电机特写"
            : sim.detail
              ? "肩关节齿轮传动"
              : sim.cut
                ? "肩关节剖切"
                : "整臂外观"),
      );
      set("robotGearCountRead", 4 + sim.idlers + " 个齿轮 / " + (2 + sim.idlers) + " 次外啮合");
      $("robotAddGear").disabled = $("robotAddGearMini").disabled = sim.idlers >= 2;
      $("robotRemoveGear").disabled = $("robotRemoveGearMini").disabled = sim.idlers === 0;
      set("robotViewClock", "慢放 1 / " + sim.slow + " · 演示时间 " + fixed(s.t, 1) + " s");
      set("robotSceneSpeed", fixed(((-sign * model.n) / state.gear) * 6, 1) + " °/s");
      set("robotScenePosition", "肩关节 θ = " + fixed((s.q * 180) / Math.PI, 1) + "°");
      const p = armPoints(s.q);
      set(
        "robotPoseRead",
        "肩关节 " +
          fixed((s.q * 180) / Math.PI, 1) +
          "° · 末端 X " +
          fixed(p.tool[0], 3) +
          " m / Z " +
          fixed(p.tool[2], 3) +
          " m",
      );
      set(
        "robotMotionState",
        sim.message || "电机 → 一级齿轮 → 复合轴 → 二级齿轮 → 关节法兰 → 上臂 → 末端。",
      );
      $("robotMotionState").classList.toggle("robot-limit", s.limit);
      set(
        "robotMotionHint",
        paused
          ? "演示暂停 · 可改变减速比后再运行"
          : sim.dwell > 0
            ? "端点断电停留 · 随后反接"
            : model.n
              ? "同一时钟驱动电枢、齿轮、法兰与上臂"
              : "轴速为零 · 所有传动部件静止",
      );
      updateArmTeaching();
    }
    function refresh() {
      const key = [state.gear, sim.idlers, state.dir].join(":");
      if (sim.config !== key) sim.dirty = true;
      updateUI();
      draw();
    }
    function play() {
      if (sim.playing && !state.paused) {
        sim.playing = false;
        sim.message = "演示时间已暂停；上方数值保留当前稳态工作点。";
      } else {
        if (
          state.app === "arm" &&
          sim.arm.limit &&
          ((sim.arm.q <= (20 * Math.PI) / 180 + 1e-8 &&
            state.dir * (sim.idlers % 2 ? -1 : 1) > 0) ||
            (sim.arm.q >= (105 * Math.PI) / 180 - 1e-8 &&
              state.dir * (sim.idlers % 2 ? -1 : 1) < 0))
        ) {
          sim.message = "已到达该方向的软限位，请使用“反向驱动”返回。";
          updateUI();
          return;
        }
        if (!state.voltage) {
          state.voltage = sim.lastU || 24;
          syncInputs();
        }
        sim.playing = true;
        sim.arm.limit = false;
        state.paused = false;
        sim.message = "";
        render();
      }
      updateUI();
    }
    function reverse() {
      sim.cycle = false;
      sim.dwell = 0;
      sim.lastU = state.voltage || sim.lastU;
      state.dir = -state.dir;
      if (!state.voltage) state.voltage = sim.lastU || 24;
      sim.arm.limit = false;
      sim.playing = true;
      state.paused = false;
      sim.message = "已切换到相反驱动方向；此处比较稳态，不模拟反接电流瞬态。";
      syncInputs();
      rebuildMotor();
      render();
      updateUI();
    }
    function off() {
      sim.cycle = false;
      sim.dwell = 0;
      sim.lastU = state.voltage || sim.lastU;
      state.voltage = 0;
      state.paused = true;
      sim.playing = false;
      sim.message = "电源已断开，所有轴和机构停止。此稳态演示不计算惯性滑行。";
      syncInputs();
      render();
      updateUI();
    }
    function reset() {
      sim.cycle = false;
      sim.dwell = 0;
      const s = active();
      s.input = s.middle = s.output = s.t = 0;
      s.q = (55 * Math.PI) / 180;
      s.limit = false;
      sim.playing = false;
      sim.cameraSnap = true;
      sim.message = "位置已重置，演示暂停。点击“开始运动”继续。";
      draw();
      updateUI();
    }
    let drag = null;
    cv.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: sim.yaw, elev: sim.elev };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      sim.yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
      sim.elev = clamp(drag.elev + (e.clientY - drag.y) * 0.005, 0.08, 1.25);
      draw();
    });
    cv.addEventListener("pointerup", () => (drag = null));
    cv.addEventListener("pointercancel", () => (drag = null));
    cv.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        sim.zoom = clamp(sim.zoom * Math.exp(-e.deltaY * 0.001), 0.65, 1.8);
        draw();
      },
      { passive: false },
    );
    cv.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
      e.preventDefault();
      sim.yaw += e.key === "ArrowLeft" ? 0.08 : e.key === "ArrowRight" ? -0.08 : 0;
      sim.elev = clamp(
        sim.elev + (e.key === "ArrowUp" ? 0.06 : e.key === "ArrowDown" ? -0.06 : 0),
        0.08,
        1.25,
      );
      draw();
    });
    new ResizeObserver(() => draw()).observe(cv);
    $("robotPlay").onclick = play;
    $("robotPlayMini").onclick = play;
    $("robotReverse").onclick = reverse;
    $("robotReverseMini").onclick = reverse;
    $("robotPowerOff").onclick = off;
    $("robotResetPose").onclick = reset;
    $("robotSlow").onchange = (e) => {
      sim.slow = +e.target.value;
      updateUI();
    };
    $("robotVoltage").oninput = (e) => {
      state.voltage = +e.target.value;
      if (state.voltage) sim.lastU = state.voltage;
      syncInputs();
      render();
    };
    $("robotCut").onclick = () => {
      sim.cut = !sim.cut;
      draw();
      updateUI();
    };
    $("robotDetail").onclick = () => {
      sim.componentFocus = null;
      sim.detail = !(sim.detail && sim.focus === "drive");
      sim.focus = sim.detail ? "drive" : "arm";
      sim.yaw = sim.detail ? 0.98 : -0.98;
      sim.elev = 0.48;
      sim.zoom = 1;
      sim.cameraSnap = true;
      draw();
      updateUI();
    };
    $("robotCameraReset").textContent = "返回整臂";
    $("robotCameraReset").onclick = () => {
      sim.componentFocus = null;
      sim.focus = "arm";
      sim.detail = false;
      sim.yaw = -0.98;
      sim.elev = 0.48;
      sim.zoom = 1;
      sim.cameraSnap = true;
      draw();
    };
    function changeGear(delta) {
      const next = clamp(sim.idlers + delta, 0, 2);
      if (next === sim.idlers) return;
      off();
      sim.idlers = next;
      sim.dirty = true;
      sim.componentFocus = null;
      sim.detail = true;
      sim.focus = "drive";
      sim.cut = true;
      sim.zoom = 1;
      sim.cameraSnap = true;
      sim.message =
        "已断电配置：" +
        (delta > 0 ? "增加" : "减少") +
        "一个惰轮。现在共 " +
        (4 + next) +
        " 个齿轮，输出与输入" +
        (next % 2 ? "反向" : "同向") +
        "，总减速比仍为 " +
        state.gear +
        " : 1。点击开始运动观察。";
      render();
      draw();
      updateUI();
    }
    $("robotAddGear").onclick = $("robotAddGearMini").onclick = () => changeGear(1);
    $("robotRemoveGear").onclick = $("robotRemoveGearMini").onclick = () => changeGear(-1);
    init();
    updateUI();
    return {
      advance,
      refresh,
      draw,
      getState: () => ({
        webgl: !!rg,
        idlers: sim.idlers,
        gearCount: 4 + sim.idlers,
        outputSign: state.dir * (sim.idlers % 2 ? -1 : 1),
        playing: sim.playing,
        slow: sim.slow,
        cut: sim.cut,
        detail: sim.detail,
        focus: sim.focus,
        selectedComponent: sim.componentFocus?.key || null,
        cameraTarget: sim.cameraCenter ? [...sim.cameraCenter] : null,
        cameraDistance: sim.cameraDistance,
        chargePhase: sim.chargeTime,
        electromagnetism: electromagneticFrame("y", sim.arm.input, state.dir, model.I > 1e-6),
        cycle: sim.cycle,
        dwell: sim.dwell,
        cycles: sim.cycles,
        vertices: count,
        arm: { ...sim.arm },
        ratios: stages(state.gear),
        pose: armPoints(sim.arm.q),
      }),
      pause: () => {
        sim.playing = false;
        updateUI();
      },
    };
  }

  // A small read-only diagnostic interface makes the teaching model independently verifiable.
  window.motorLab = {
    solve: (U, L, options) => solve(U, L, options),
    sampleElectromagneticVectors: (axis, angle, dir, powered = true) =>
      electromagneticFrame(axis, angle, dir, powered),
    getElectromagneticVectors: () =>
      electromagneticFrame("x", state.angle, state.dir, model.I > 1e-6),
    getState: () => ({ ...state }),
    getModel: () => ({ ...model }),
    constants: { ...C },
    getStudent: () => ({
      active: student.active,
      installed: student.installed,
      selected: student.selected,
      positive: student.positive,
      negative: student.negative,
      prediction: student.prediction,
      energized: student.energized,
      results: [...student.results],
    }),
    getPage: () => currentScreen,
    getFault: () => ({
      active: fault.active,
      kind: fault.kind,
      index: fault.index,
      step: fault.step,
      powered: fault.powered,
      contactR: fault.contactR,
      wireOpen: fault.wireOpen,
      observed: [...fault.observed],
      solved: fault.solved,
      history: fault.history.map((x) => ({ ...x })),
    }),
    getRobot: () => (robotScene ? robotScene.getState() : null),
    getRenderInfo: () => ({
      webgl: !!renderer,
      vertices: renderer ? renderer.count : 0,
      zoom: renderer ? renderer.zoom : 0,
      target: renderer ? [...renderer.target] : null,
      component: renderer ? renderer.selectedComponent : null,
    }),
  };
  setupPages();
  setupStudentPaging();
  setupSceneLabels();
  setupRobotMobile();
  robotScene = createRobotScene();
  initRenderer();
  render();
  if (!renderer) {
    $("structureOverlay").classList.add("hidden");
    set("renderBadge", "二维结构备用视图");
    set("motionBadge", "结构图静止 · 换向见下方");
    document.querySelector(".view-hint").textContent = "此浏览器使用二维结构视图";
    for (const id of ["viewReset", "cutMode", "wholeMode", "wireMode", "cutaway"])
      $(id).disabled = true;
  }
  drawMotor();
  requestAnimationFrame(tick);
})();
