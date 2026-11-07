/* Text labels sit beside the original component anchors, with short leaders. */
window.ComponentNames = class ComponentNames {
  constructor({
    wrap,
    camera,
    getMode,
    getParts,
    getParams,
    isCutaway,
    onSelect,
    getAnchor,
  }) {
    Object.assign(this, {
      wrap,
      camera,
      getMode,
      getParts,
      getParams,
      isCutaway,
      onSelect,
      getAnchor,
    });
    this.layer = document.querySelector("#componentLabels");
    this.svg = document.querySelector("#componentLeaders");
    this.index = document.querySelector("#componentIndex");
    this.showAll = document.querySelector("#allComponentLabels");
    this.items = [];
    this.size = "";
    this.selected = null;
  }
  reset() {
    this.layer.replaceChildren();
    this.index.replaceChildren();
    this.svg.replaceChildren();
    this.items = [];
    this.size = "";
    const p = this.getParts(),
      mode = this.getMode(),
      kind = this.getParams().kind,
      v = (x, y, z) => new THREE.Vector3(x, y, z),
      add = (key, name, side, anchor, inside = false) =>
        this.items.push({
          key,
          name,
          side,
          anchor: typeof anchor === "function" ? anchor : () => anchor.clone(),
          inside,
        });
    if (mode === "gear") {
      const type = kind === "gear" ? "齿轮" : kind === "belt" ? "带轮" : "链轮",
        input = this.getParams().input || 1,
        xin = input === 1 ? p.x1 : p.x2,
        xout = input === 1 ? p.x2 : p.x1,
        rin = input === 1 ? p.r1 : p.r2,
        rout = input === 1 ? p.r2 : p.r1,
        sin = input === 1 ? "left" : "right",
        sout = input === 1 ? "right" : "left";
      add(
        "driver",
        "主动" + type,
        sin,
        v(xin - rin * 0.42, p.y + rin * 0.35, 0.5),
      );
      add(
        "driven",
        "从动" + type,
        sout,
        v(xout + rout * 0.42, p.y + rout * 0.3, 0.5),
      );
      add("input-shaft", input + "号轴 · 输入", sin, v(xin, p.y, 0.88));
      add("output-shaft", 3 - input + "号轴 · 输出", sout, v(xout, p.y, 0.88));
      add("bearing", "轴承座", sout, v(xout, 1.7, -0.95));
      add("motor", "驱动电机", sin, v(xin, p.y, -2.03));
      add("keys", "平键", sin, v(xin, p.y + 0.16, 0.3));
      add("collars", "轴端挡圈", sout, v(xin, p.y, 0.8));
      add("base", "安装底座", "left", v(-4.5, 0.32, 1.9));
      if (kind === "gear")
        add("mesh", "齿面啮合区", "right", v(p.x1 + p.r1, p.y, 0.5));
      else {
        add("flexible", kind === "belt" ? "传动带" : "滚子链", "right", () => {
          const at = p.path.at(p.path.line * 0.55);
          return v(at.x, at.y, 0.53);
        });
        add(
          "contact",
          kind === "belt" ? "带轮摩擦接触弧" : "滚子与链齿啮合区",
          "left",
          v(p.x1 - p.r1 * 0.85, p.y + p.r1 * 0.5, 0.5),
        );
      }
    } else {
      const Y = p.Y,
        R = p.R,
        hyd = mode === "hyd",
        px = () => p.piston.position.x;
      add(
        "barrel",
        hyd ? "液压缸缸筒" : "气缸缸筒",
        "right",
        v(-0.9, Y - R * 0.7, -R * 0.7),
      );
      add(
        "piston",
        "活塞",
        "right",
        () => v(px(), Y + R * 0.58, R * 0.54),
        true,
      );
      add("rod", "活塞杆", "right", () => v(px() + 3.5, Y, R * 0.34));
      add(
        "chamber-a",
        "A 腔 · 无杆腔",
        "left",
        () => v((-3.065 + px() - 0.095) / 2, Y + R * 0.12, R * 0.5),
        true,
      );
      add(
        "chamber-b",
        "B 腔 · 有杆腔",
        "right",
        () => v((1.325 + px() + 0.095) / 2, Y + R * 0.12, R * 0.65),
        true,
      );
      add("port-a", hyd ? "A 油口" : "A 气口", "left", v(-3.23, Y, R + 0.42));
      add("port-b", hyd ? "B 油口" : "B 气口", "right", v(1.46, Y, R + 0.42));
      add("valve", "方向控制阀", "right", v(-0.35, 1.01, 1.98));
      add("gauge", "压力表", "right", v(-0.35, 1.35, 2.14));
      if (hyd) {
        add("tank", "油箱", "left", v(-4.65, 1.28, 0.58));
        add("pump", "液压泵", "left", v(-2.52, 0.87, 1.9));
        add("pump-motor", "泵驱动电机", "left", v(-3.17, 0.8, 2.16));
        add("relief", "溢流阀", "left", v(-1.3, 0.69, 2.39));
        add("return", "回油管", "right", v(-0.1, 0.43, 2.48));
      } else {
        add("receiver", "储气罐", "left", v(-4.8, 0.92, 0.5));
        add("compressor", "空气压缩机", "left", v(-4.5, 1.61, 0.05));
        add("regulator", "过滤减压组件", "left", v(-2.65, 0.92, 1.9));
        add("silencer", "排气消声器", "left", v(-4.64, 1.39, 0.57));
        add("supply", "供气管", "right", v(-1.65, 0.72, 1.92));
      }
      add("base", "安装底座", "left", v(-4.9, 0.32, 1.75));
      add("frontcap", "前端盖", "right", v(1.46, Y + R * 0.65, 0.3));
      add("rearcap", "后端盖", "left", v(-3.23, Y + R * 0.65, 0.3));
      add(
        "seals",
        "活塞密封圈",
        "right",
        () => v(px() - 0.064, Y + R * 0.72, R * 0.6),
        true,
      );
      add("tie-rods", "缸体拉杆", "left", v(-1, Y + R + 0.16, R + 0.16));
    }
    const ns = "http://www.w3.org/2000/svg";
    const main = new Set(mode === "gear"
      ? ["driver", "driven", "input-shaft", "output-shaft", "motor", kind === "gear" ? "bearing" : "flexible"]
      : ["barrel", "piston", "rod", "valve", ...(mode === "hyd" ? ["tank", "pump"] : ["receiver", "regulator"])]);
    this.items.forEach(item => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "component-label";
      el.dataset.component = item.key;
      el.setAttribute("aria-label", item.name);
      el.setAttribute("aria-pressed", "false");
      el.title = "点击放大查看" + item.name;
      el.addEventListener("click", () => this.onSelect?.(item));
      el.textContent = item.name;
      const entry = document.createElement("button");
      entry.type = "button";
      entry.textContent = item.name;
      entry.setAttribute("aria-pressed", "false");
      entry.addEventListener("click", () => this.onSelect?.(item));
      this.index.append(entry);
      this.layer.append(el);
      const path = document.createElementNS(ns, "path");
      path.classList.add("component-leader");
      const pin = document.createElementNS(ns, "circle");
      pin.setAttribute("r", "1.8");
      pin.classList.add("component-pin");
      this.svg.append(path, pin);
      Object.assign(item, { el, entry, path, pin, primary: main.has(item.key) });
    });
  }
  select(key) {
    this.selected = key;
    for (const item of this.items) {
      const active = item.key === key;
      item.el.classList.toggle("selected", active);
      item.entry.setAttribute("aria-pressed", String(active));
      item.el.setAttribute("aria-pressed", String(active));
      item.path.classList.toggle("selected", active);
      item.pin.classList.toggle("selected", active);
    }
  }
  update() {
    const width = this.wrap.clientWidth, height = this.wrap.clientHeight;
    if (this.layer.hidden || !width || !height) return;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const positions = [];
    for (const item of this.items) {
      const point = (this.getAnchor?.(item.key) || item.anchor()).project(this.camera);
      const ax = (point.x + 1) * width / 2, ay = (1 - point.y) * height / 2;
      const hidden = (!item.primary && !this.showAll.checked) || point.z < -1 || point.z > 1 || ax < 0 || ax > width || ay < 0 || ay > height || (item.inside && !this.isCutaway());
      item.el.hidden = item.path.hidden = item.pin.hidden = hidden;
      item.path.style.display = item.pin.style.display = hidden ? 'none' : '';
      if (hidden) continue;
      const w = item.el.offsetWidth, h = item.el.offsetHeight;
      let best;
      const side = item.side === 'left' ? -1 : 1;
      for (const direction of [side, -side]) {
        for (const dy of [0, -38, 38, -76, 76, -114, 114]) {
          const x = Math.max(8, Math.min(width - w - 8, ax + (direction > 0 ? 22 : -w - 22)));
          const y = Math.max(8, Math.min(height - h - 8, ay - h / 2 + dy));
          const edge = direction > 0 ? x : x + w;
          const overlaps = positions.filter(p => x < p.x + p.w + 8 && x + w + 8 > p.x && y < p.y + p.h + 8 && y + h + 8 > p.y).length;
          const score = overlaps * 10000 + Math.hypot(edge - ax, y + h / 2 - ay) + (direction === side ? 0 : 12);
          if (!best || score < best.score) best = {x, y, edge, score};
        }
      }
      const {x, y, edge} = best;
      positions.push({x, y, w, h});
      item.el.style.transform = `translate(${x}px,${y}px)`;
      item.path.setAttribute("d", `M${edge},${y + h / 2} L${ax},${ay}`);
      item.pin.setAttribute("cx", ax);
      item.pin.setAttribute("cy", ay);
    }
  }
};
