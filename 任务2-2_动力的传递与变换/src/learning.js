window.LabLearning = class LabLearning {
  constructor(api) {
    this.api = api;
    this.active = null;
    this.records = {};
    this.panel = "params";
    try {
      this.records = JSON.parse(
        localStorage.getItem("mechanics-learning-v1") || "{}",
      );
    } catch (e) {}
    const scroll = document.querySelector(".panel-scroll"),
      pane = document.createElement("div");
    pane.id = "parameterPane";
    while (scroll.firstChild) pane.append(scroll.firstChild);
    scroll.append(pane);
    this.tabs = document.createElement("div");
    this.tabs.className = "panel-tabs";
    this.tabs.setAttribute("role", "tablist");
    this.tabs.innerHTML =
      '<button data-panel="params" role="tab">实验控制</button><button data-panel="tasks" role="tab">学习任务</button><button data-panel="details" role="tab">零件说明</button>';
    scroll.prepend(this.tabs);
    this.tasks = document.createElement("div");
    this.tasks.id = "taskPane";
    this.details = document.createElement("div");
    this.details.id = "detailPane";
    scroll.append(this.tasks, this.details);
    this.tabs.onclick = (e) => {
      const b = e.target.closest("[data-panel]");
      if (b) this.showPanel(b.dataset.panel);
    };
    this.tasks.addEventListener("click", (e) => {
      const b = e.target.closest("[data-action]");
      if (b) this.action(b.dataset.action, b.dataset.id);
    });
    this.tasks.addEventListener("input", (e) => {
      if (e.target.dataset.answer && this.active)
        this.active.answers[e.target.dataset.answer] = e.target.value;
    });
    this.tasks.addEventListener("change", (e) => {
      if (e.target.dataset.answer && this.active)
        this.active.answers[e.target.dataset.answer] = e.target.value;
    });
    this.tasks.addEventListener("dragstart", (e) => {
      const b = e.target.closest("[data-assemble]");
      if (b) {
        e.dataTransfer.setData("text/plain", "assemble:" + b.dataset.assemble);
        e.dataTransfer.effectAllowed = "move";
        document.querySelector("#canvasWrap").classList.add("assembly-drop");
      }
    });
    this.tasks.addEventListener("dragend", () =>
      document.querySelector("#canvasWrap").classList.remove("assembly-drop"),
    );
    const wrap = document.querySelector("#canvasWrap");
    wrap.addEventListener("dragover", (e) => {
      if (this.active?.kind === "assembly") {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }
    });
    wrap.addEventListener("drop", (e) => {
      e.preventDefault();
      wrap.classList.remove("assembly-drop");
      const text = e.dataTransfer.getData("text/plain");
      if (text.startsWith("assemble:")) this.assemble(text.slice(9));
    });
    this.details.innerHTML =
      '<div class="lesson-empty">点击图中的组件名称，独立观察零件并了解它的作用与工作原理。</div>';
    this.render();
    this.showPanel("params");
  }
  esc(s) {
    return String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  }
  showPanel(key) {
    this.panel = key;
    for (const p of ["params", "tasks", "details"])
      document.querySelector(
        "#" +
          { params: "parameterPane", tasks: "taskPane", details: "detailPane" }[
            p
          ],
      ).hidden = p !== key;
    for (const b of this.tabs.children) {
      b.classList.toggle("selected", b.dataset.panel === key);
      b.setAttribute("aria-selected", String(b.dataset.panel === key));
    }
    if (key === "tasks") this.render();
  }
  renderDetails(item, info, names, select, rotate) {
    const E = (s) => this.esc(s);
    this.details.innerHTML = `<div class="detail-badge">独立零件观察</div><h2>${E(item.name)}</h2><p class="detail-spec">${E(info.spec)}</p><div class="detail-block"><h3>作用</h3><p>${E(info.action)}</p></div><div class="detail-block"><h3>工作原理</h3><p>${E(info.principle)}</p></div><div class="inspect-actions"><button id="inspectRotate">开启自动旋转</button><button id="inspectReset">复位视角</button></div><label class="inspect-switch">查看其他组件<select id="inspectSelect">${names.map((n) => `<option value="${E(n.key)}" ${n.key === item.key ? "selected" : ""}>${E(n.name)}</option>`).join("")}</select></label><p class="lesson-footnote">拖动旋转，滚轮缩放。整机仿真在独立观察时暂停；返回整体后恢复。</p>`;
    this.details.querySelector("#inspectSelect").onchange = (e) =>
      select(e.target.value);
    this.details.querySelector("#inspectRotate").onclick = rotate;
    this.details.querySelector("#inspectReset").onclick = () => this.api.home();
    this.showPanel("details");
  }
  setRotate(value) {
    const b = this.details.querySelector("#inspectRotate");
    if (b) {
      b.textContent = value ? "停止自动旋转" : "开启自动旋转";
      b.setAttribute("aria-pressed", String(value));
    }
  }
  feedback(text, good = false) {
    if (this.active) {
      this.active.feedback = text;
      this.active.good = good;
    }
    this.render();
  }
  start(id) {
    this.stop(false);
    const map = {
        assembly: ["gear", "齿轮轴系装配与检验"],
        axes: ["gear", "输入轴对换实验"],
        hydraulic: ["hyd", "液压接管与速度检验"],
        airload: ["air", "气缸加载与停滞观察"],
      },
      [mode, title] = map[id];
    this.api.prepare(mode, id);
    this.active = {
      kind: id,
      mode,
      title,
      answers: {
        module: "2.5",
        angle: "20",
        direction: "",
        extend: "",
        retract: "",
        airlock: "",
      },
      installed: [],
      moves: 0,
      trial: 0,
      evidence: {},
      samples: {},
      feedback: "按步骤完成操作，再提交检验。",
      good: false,
      started: Date.now(),
      records: [],
      connected: false,
    };
    if (id === "assembly") this.attachAssembly();
    this.api.sync();
    this.render();
    this.showPanel("tasks");
  }
  stop(render = true) {
    if (this.active?.kind === "hydraulic") {
      for (const key of ["line-a", "line-b"])
        for (const o of this.api.get().registry[key] || [])
          if (!o.userData.flowMarker) o.visible = true;
    }
    if (this.active?.records)
      for (const r of this.active.records) r.object.position.copy(r.home);
    this.active = null;
    this.api?.sync?.();
    if (render) this.render();
  }
  onMode(next) {
    if (this.active && next !== this.active.mode) this.stop();
  }
  afterBuild() {
    if (this.active?.kind === "assembly") this.attachAssembly();
    this.lock();
  }
  lock() {
    const a = this.active;
    for (const id of ["ratio", "bore"]) {
      const el = document.querySelector("#" + id);
      if (el) el.disabled = !!a;
    }
    for (const b of document.querySelectorAll("[data-kind]")) b.disabled = !!a;
    const input = document.querySelector("#inputAxis");
    if (input) input.disabled = a?.kind === "assembly";
  }
  attachAssembly() {
    const a = this.active,
      { parts: p, registry: r } = this.api.get();
    a.records = [];
    const add = (id, objects, offset) => {
      for (const object of objects || [])
        a.records.push({
          id,
          object,
          home: object.position.clone(),
          offset: new THREE.Vector3(...offset),
          current: a.installed.includes(id) ? 0 : 1,
        });
    };
    add(
      "bearing",
      [...(r["bearing-1"] || []), ...(r["bearing-2"] || [])],
      [0, 0.8, -0.1],
    );
    add("shaft", p.shafts, [0, 0, 1.25]);
    add("key", [...(r["key-1"] || []), ...(r["key-2"] || [])], [0, 0.65, 0]);
    add("gear", p.wheels, [0, 0, 2]);
    add(
      "collar",
      [...(r["collar-1"] || []), ...(r["collar-2"] || [])],
      [0, 0, 2.6],
    );
    this.applyAssembly(0);
  }
  applyAssembly(dt) {
    const a = this.active;
    if (a?.kind !== "assembly") return;
    for (const r of a.records) {
      const to = a.installed.includes(r.id) ? 0 : 1;
      r.current += (to - r.current) * (dt ? 1 - Math.exp(-dt * 10) : 1);
      r.object.position.copy(r.home).addScaledVector(r.offset, r.current);
    }
  }
  settled() {
    return (
      this.active?.kind !== "assembly" ||
      this.active.records.every((r) => r.current < 0.003)
    );
  }
  canPlay() {
    const a = this.active;
    if (!a) return true;
    if (a.kind === "assembly" && (a.installed.length < 5 || !this.settled())) {
      this.feedback("先完成支承、轴、键、齿轮和挡圈的装配，再进行低速检验。");
      return false;
    }
    if (a.kind === "hydraulic" && !a.connected) {
      this.feedback("先正确连接伸出与缩回的供回油通路。");
      return false;
    }
    return true;
  }
  assemble(id) {
    const a = this.active;
    if (a?.kind !== "assembly") return;
    const seq = ["bearing", "shaft", "key", "gear", "collar"],
      names = ["轴承座", "两根轴", "平键", "齿轮副", "轴端挡圈"],
      next = seq[a.installed.length];
    if (id !== next) {
      this.feedback(
        a.installed.includes(id)
          ? "这个组件已经安装。"
          : `当前应先安装${names[a.installed.length]}。`,
      );
      return;
    }
    if (
      id === "gear" &&
      (Number(a.answers.module) !== 2.5 || Number(a.answers.angle) !== 20)
    ) {
      this.feedback(
        "齿轮配对不合格：两轮必须具有相同模数 2.5 mm 和压力角 20°。已保留当前装配状态。",
      );
      return;
    }
    a.installed.push(id);
    this.feedback(
      a.installed.length === 5
        ? "装配完成。请手动盘车至少两次，再进行低速试运行。"
        : `${names[seq.indexOf(id)]}已就位。下一步：${names[a.installed.length]}。`,
      true,
    );
  }
  jog() {
    if (!this.canPlay()) return;
    this.api.jog();
    if (this.active) this.active.moves++;
    this.render();
  }
  action(action, id) {
    const a = this.active;
    if (action === "start") {
      this.start(id);
      return;
    }
    if (action === "export") {
      this.export();
      return;
    }
    if (action === "end") {
      this.stop();
      return;
    }
    if (!a) return;
    if (this.api.get().inspection) this.api.resumeWhole();
    if (action === "assemble") {
      this.assemble(id);
      return;
    }
    if (action === "jog") {
      this.jog();
      return;
    }
    if (action === "trial") {
      if (a.installed.length < 5) {
        this.feedback("请先完成五步装配。");
        return;
      }
      a.pendingTrial = true;
      this.feedback("准备低速试运行，装配件就位后自动开始。");
      return;
    }
    if (action === "connect") {
      const x = a.answers;
      if (
        x.extend === "A" &&
        x.extendReturn === "B" &&
        x.retract === "B" &&
        x.retractReturn === "A"
      ) {
        a.connected = true;
        this.feedback(
          "连接正确。工作油管已接入 A、B 口，可开始双向运动测试。",
          true,
        );
      } else
        this.feedback("接管检验未通过：伸出应 P→A、B→T；缩回应 P→B、A→T。");
      return;
    }
    if (action === "testhyd") {
      if (!a.connected) {
        this.feedback("请先通过接管检验。");
        return;
      }
      a.running = id;
      a.measureTime = 0;
      this.api.command(id === "extend" ? 1 : -1, true);
      this.feedback(
        "正在测量 " +
          (id === "extend" ? "伸出" : "缩回") +
          "速度，约 0.8 秒后自动暂停。",
      );
      return;
    }
    if (action === "airphase") {
      if (id === "load" && !a.evidence.normal) {
        this.feedback("请先完成正常负载起动。");
        return;
      }
      if (id === "unload" && !a.evidence.load) {
        this.feedback("请先完成加载停滞观察。");
        return;
      }
      a.phase = id;
      a.measureTime = 0;
      this.api.airLoad(id === "load" ? 1200 : 180, id === "normal");
      this.feedback(
        id === "normal"
          ? "以 180 N 负载起动，观察先建压再运动。"
          : id === "load"
            ? "已增至 1200 N，观察速度下降与充气建压。"
            : "已卸载至 180 N，观察气缸重新起动。",
      );
      return;
    }
    if (action === "submit") this.submit();
  }
  tick(dt, realDt = dt) {
    const a = this.active;
    if (!a) return;
    const { s, p, inspection } = this.api.get();
    if (inspection) return;
    this.applyAssembly(realDt);
    if (a.kind === "assembly") {
      if (a.pendingTrial && this.settled()) {
        a.pendingTrial = false;
        this.api.rpm(12);
        this.api.play(true);
      }
      if (dt > 0 && this.api.isPlaying()) {
        a.trial += dt;
        if (a.trial >= 1 && !a.evidence.trial) {
          a.evidence.trial = true;
          this.api.play(false);
          this.feedback(
            "低速运行检验已采样。请输入中心距、输出转速，并判断转向。",
            true,
          );
        }
      }
    } else if (a.kind === "axes" && dt > 0 && this.api.isPlaying()) {
      const axis = p.input || 1;
      a.samples[axis] = (a.samples[axis] || 0) + dt;
      if (a.samples[axis] >= 0.6 && !a.evidence[axis]) {
        const t = MechModel.transmission(p);
        a.evidence[axis] = { input: t.nin, output: t.nout };
        this.api.play(false);
        this.feedback(
          `${axis} 号轴输入的转速已采样。${axis === 1 ? "请把 2 号轴切换为输入，再运行一次。" : "两种输入工况均可在检验中比较。"}`,
          true,
        );
      }
    } else if (a.kind === "hydraulic") {
      for (const key of ["line-a", "line-b"])
        for (const o of this.api.get().registry[key] || []) {
          if (!a.connected) o.visible = false;
          else if (!o.userData.flowMarker) o.visible = true;
        }
      if (a.running && dt > 0 && this.api.isPlaying()) {
        a.measureTime += dt;
        if (Math.abs(s.v) > 0.001)
          a.evidence[a.running] = {
            speed: Math.abs(s.v) * 1000,
            flow: p.flow,
            bore: p.bore,
          };
        if (a.measureTime >= 0.8) {
          const run = a.running;
          a.running = null;
          this.api.play(false);
          this.feedback(
            a.evidence[run]
              ? `${run === "extend" ? "伸出" : "缩回"}测试完成，速度已记录。`
              : "未检测到运动，请检查压力与负载。",
            !!a.evidence[run],
          );
        }
      }
    } else if (
      a.kind === "airload" &&
      a.phase &&
      dt > 0 &&
      this.api.isPlaying()
    ) {
      a.measureTime += dt;
      const pass =
        a.phase === "load"
          ? Math.abs(s.v) < 0.001 &&
            s.x > 0.005 &&
            s.x < 0.19 &&
            s.pA > p.pressure * 1e6 * 0.88
          : Math.abs(s.v) > 0.005 && a.measureTime > 0.2;
      if (pass) {
        a.evidence[a.phase] = true;
        const phase = a.phase;
        a.phase = null;
        this.api.play(false);
        this.feedback(
          phase === "normal"
            ? "正常负载起动已观察。接着增加负载。"
            : phase === "load"
              ? "负载过大时已出现停滞。接着卸载。"
              : "卸载后已重新运动，可以提交检验。",
          true,
        );
      }
    }
  }
  submit() {
    const a = this.active,
      { p } = this.api.get(),
      x = a.answers,
      near = (v, t) =>
        Number.isFinite(Number(v)) &&
        String(v).trim() !== "" &&
        Math.abs(Number(v) - t) <= Math.max(0.15, Math.abs(t) * 0.04);
    let errors = [];
    if (a.kind === "assembly") {
      if (a.installed.length !== 5 || !this.settled())
        errors.push("完成所有装配");
      if (a.moves < 2) errors.push("手动盘车至少两次");
      if (!a.evidence.trial) errors.push("完成低速试运行");
      if (!near(x.center, (2.5 * (p.z1 + p.z2)) / 2))
        errors.push("中心距应由 m(z₁+z₂)/2 计算");
      if (!near(x.speed, Math.abs(MechModel.transmission(p).nout)))
        errors.push("输出转速与当前齿数比不符");
      if (x.direction !== "opposite") errors.push("外啮合两轮应反向");
    }
    if (a.kind === "axes") {
      if (!a.evidence[1] || !a.evidence[2])
        errors.push("分别运行两种输入工况至少 0.6 秒");
      if (a.evidence[1] && !near(x.n1, Math.abs(a.evidence[1].output)))
        errors.push("1 号轴输入的输出转速有误");
      if (a.evidence[2] && !near(x.n2, Math.abs(a.evidence[2].output)))
        errors.push("2 号轴输入的输出转速有误");
      if (x.change !== "up") errors.push("小齿轮改为输出时是增速工况");
    }
    if (a.kind === "hydraulic") {
      if (!a.connected) errors.push("正确接管");
      if (!a.evidence.extend || !a.evidence.retract)
        errors.push("完成伸出与缩回测试");
      if (a.evidence.extend && !near(x.speed, a.evidence.extend.speed))
        errors.push("伸出速度的计算或读数有误");
      if (x.faster !== "retract") errors.push("同一供油流量下，缩回更快");
    }
    if (a.kind === "airload") {
      if (!["normal", "load", "unload"].every((k) => a.evidence[k]))
        errors.push("依次完成起动、加载停滞和卸载恢复");
      if (x.compress !== "yes") errors.push("空气可压缩，所以存在充气建压过程");
      if (x.airlock !== "no") errors.push("封闭中位不能视为刚性机械锁");
    }
    if (errors.length) {
      this.feedback("检验待完善：" + errors.join("；") + "。");
      return;
    }
    this.records[a.kind] = {
      title: a.title,
      completed: new Date().toISOString(),
      answers: { ...x },
      evidence: JSON.parse(JSON.stringify(a.evidence)),
      moves: a.moves,
      elapsedSeconds: Math.round((Date.now() - a.started) / 1000),
    };
    try {
      localStorage.setItem(
        "mechanics-learning-v1",
        JSON.stringify(this.records),
      );
    } catch (e) {}
    this.feedback(
      "检验通过，实验记录已保存到本机。可以导出记录或开始下一项任务。",
      true,
    );
  }
  field(key, label, unit = "") {
    const v = this.active?.answers[key] || "";
    return `<label class="task-field">${label}<span><input type="number" step="any" data-answer="${key}" value="${this.esc(v)}">${unit}</span></label>`;
  }
  select(key, label, options) {
    const value = this.active?.answers[key] || "";
    return `<label class="task-field">${label}<select data-answer="${key}"><option value="">请选择</option>${options.map(([v, t]) => `<option value="${v}" ${value === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
  }
  render() {
    const E = (s) => this.esc(s),
      a = this.active,
      completed = Object.keys(this.records).length;
    let h = `<div class="learning-summary"><span>已完成 <strong>${completed} / 4</strong></span><button data-action="export">导出实验记录 ↓</button></div>`;
    if (!a) {
      const tasks = [
        [
          "assembly",
          "01",
          "齿轮轴系装配与检验",
          "安装支承、轴、键、齿轮和挡圈，盘车并核对中心距与速比。",
        ],
        [
          "axes",
          "02",
          "输入轴对换实验",
          "切换 1、2 号轴为输入，对比减速、增速和输出转矩。",
        ],
        [
          "hydraulic",
          "03",
          "液压接管与速度检验",
          "连接供回油通路，测试双向运动并比较速度。",
        ],
        [
          "airload",
          "04",
          "气缸加载与停滞观察",
          "观察建压、负载停滞和卸载后的重新起动。",
        ],
      ];
      for (const [id, n, title, text] of tasks)
        h += `<button class="task-card" data-action="start" data-id="${id}"><small>任务 ${n}${this.records[id] ? " · 已通过" : ""}</small><strong>${title}</strong><span>${text}</span></button>`;
      this.tasks.innerHTML = h;
      return;
    }
    h += `<div class="task-active-head"><small>操作任务</small><h2>${E(a.title)}</h2><button data-action="end">结束任务</button></div>`;
    if (a.kind === "assembly") {
      h +=
        '<p class="lesson-intro">底座已固定。依次安装支承、轴、键、齿轮与挡圈。点击组件卡或把卡片拖到三维视窗。</p><div class="assembly-inventory">';
      for (const [id, title] of [
        ["bearing", "轴承座"],
        ["shaft", "两根轴"],
        ["key", "平键"],
        ["gear", "齿轮副"],
        ["collar", "轴端挡圈"],
      ])
        h += `<button data-action="assemble" data-id="${id}" data-assemble="${id}" draggable="true" class="${a.installed.includes(id) ? "installed" : ""}">${a.installed.includes(id) ? "✓" : "＋"} ${title}</button>`;
      h +=
        "</div>" +
        this.select("module", "待装齿轮模数", [
          ["2", "2.0 mm"],
          ["2.5", "2.5 mm"],
          ["3", "3.0 mm"],
        ]) +
        this.select("angle", "待装齿轮压力角", [
          ["14.5", "14.5°"],
          ["20", "20°"],
          ["25", "25°"],
        ]) +
        `<div class="task-actions"><button data-action="jog">盘车 +15° (${a.moves})</button><button data-action="trial">低速试运行 ${a.evidence.trial ? "✓" : ""}</button></div>` +
        this.field("center", "标准中心距", "mm") +
        this.field("speed", "输出转速幅值", "rpm") +
        this.select("direction", "两轮的转向", [
          ["same", "相同"],
          ["opposite", "相反"],
        ]);
    }
    if (a.kind === "axes") {
      h +=
        '<p class="lesson-intro">本任务使用 20 / 40 齿，输入转速 12 rpm。到“实验控制”切换输入轴，分别运行后自动暂停采样。</p><div class="evidence-list">' +
        [1, 2]
          .map(
            (i) =>
              `<span>${a.evidence[i] ? "✓" : "○"} ${i} 号轴输入${a.evidence[i] ? ` · 输入 ${Math.abs(a.evidence[i].input)} rpm` : ""}</span>`,
          )
          .join("") +
        '</div><button class="task-primary" data-action="runaxes">运行当前工况</button>' +
        this.field("n1", "1 号轴输入时的输出转速", "rpm") +
        this.field("n2", "2 号轴输入时的输出转速", "rpm") +
        this.select("change", "2 号轴输入后属于", [
          ["down", "减速"],
          ["up", "增速"],
        ]);
    }
    if (a.kind === "hydraulic") {
      h +=
        '<p class="lesson-intro">P 为供油，T 为回油箱。先连接伸出、缩回的通路，再做双向速度测试。缸径固定 50 mm。</p>' +
        this.select("extend", "伸出：P 接", [
          ["A", "A 无杆腔"],
          ["B", "B 有杆腔"],
        ]) +
        this.select("extendReturn", "伸出：接 T 的腔", [
          ["A", "A 无杆腔"],
          ["B", "B 有杆腔"],
        ]) +
        this.select("retract", "缩回：P 接", [
          ["A", "A 无杆腔"],
          ["B", "B 有杆腔"],
        ]) +
        this.select("retractReturn", "缩回：接 T 的腔", [
          ["A", "A 无杆腔"],
          ["B", "B 有杆腔"],
        ]) +
        '<button class="task-primary" data-action="connect">接管与通路检验</button><div class="task-actions"><button data-action="testhyd" data-id="extend">伸出测试 ' +
        (a.evidence.extend ? "✓" : "") +
        '</button><button data-action="testhyd" data-id="retract">缩回测试 ' +
        (a.evidence.retract ? "✓" : "") +
        "</button></div>" +
        this.field("speed", "伸出速度", "mm/s") +
        this.select("faster", "同一流量下哪个方向更快", [
          ["extend", "伸出"],
          ["retract", "缩回"],
        ]);
    }
    if (a.kind === "airload") {
      h +=
        '<p class="lesson-intro">缸径 40 mm，气源 0.6 MPa。按顺序操作，每阶段观察到目标现象后自动暂停。</p><div class="air-task-steps">' +
        [
          ["normal", "1. 180 N 负载起动"],
          ["load", "2. 加载到 1200 N"],
          ["unload", "3. 卸载到 180 N"],
        ]
          .map(
            ([k, t]) =>
              `<button data-action="airphase" data-id="${k}">${a.evidence[k] ? "✓" : "○"} ${t}</button>`,
          )
          .join("") +
        "</div>" +
        this.select("compress", "起动前的建压是否与空气可压缩有关", [
          ["yes", "有关"],
          ["no", "无关"],
        ]) +
        this.select("airlock", "封闭中位能否作为刚性机械锁", [
          ["yes", "可以"],
          ["no", "不可以"],
        ]);
    }
    h += `<div class="task-feedback ${a.good ? "good" : ""}" role="status">${E(a.feedback)}</div><button class="task-primary" data-action="submit">提交检验</button><p class="lesson-footnote">结果基于本页教学模型与实际操作记录；不包含真实装配公差、强度或安全认证。</p>`;
    this.tasks.innerHTML = h;
    this.tasks
      .querySelector("[data-action=runaxes]")
      ?.addEventListener("click", () => this.api.play(true));
    this.lock();
  }
  export() {
    const current = this.api.get(),
      date = new Intl.DateTimeFormat("zh-CN", {
        timeZone: "Asia/Shanghai",
        dateStyle: "medium",
        timeStyle: "medium",
      }).format(new Date()),
      text =
        "动力传动实验记录\n时间：" +
        date +
        "（北京时间）\n\n" +
        Object.values(this.records)
          .map((r) => r.title + "：检验通过\n" + JSON.stringify(r, null, 2))
          .join("\n\n") +
        "\n\n当前参数：\n" +
        JSON.stringify(
          { mode: current.mode, params: current.p, state: current.s },
          null,
          2,
        ),
      blob = new Blob([text], { type: "text/plain;charset=utf-8" }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "动力传动实验记录.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
};
