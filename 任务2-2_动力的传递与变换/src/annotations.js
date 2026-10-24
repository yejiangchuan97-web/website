/* Persistent screen-space component names, anchored to actual 3D part positions. */
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
    this.items = [];
    this.size = "";
    this.selected = null;
  }
  reset() {
    this.layer.replaceChildren();
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
    this.items.forEach((item, i) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "component-label";
      el.dataset.component = item.key;
      el.setAttribute("aria-label", item.name);
      el.setAttribute("aria-pressed", "false");
      el.title = "点击放大查看" + item.name;
      el.addEventListener("click", () => this.onSelect?.(item));
      const index = document.createElement("span");
      index.className = "component-index";
      index.textContent = String(i + 1).padStart(2, "0");
      const name = document.createElement("span");
      name.className = "component-name";
      name.textContent = item.name;
      el.append(index, name);
      this.layer.append(el);
      const path = document.createElementNS(ns, "path");
      path.classList.add("component-leader");
      const pin = document.createElementNS(ns, "circle");
      pin.setAttribute("r", "2.4");
      pin.classList.add("component-pin");
      this.svg.append(path, pin);
      Object.assign(item, { el, path, pin });
    });
  }
  select(key) {
    this.selected = key;
    for (const item of this.items) {
      const active = item.key === key;
      item.el.classList.toggle("selected", active);
      item.el.setAttribute("aria-pressed", String(active));
      item.path.classList.toggle("selected", active);
      item.pin.classList.toggle("selected", active);
    }
  }
  update() {
    const w = this.wrap.clientWidth,
      h = this.wrap.clientHeight;
    if (this.layer.hidden || !w || !h || !this.items.length) return;
    const compact = w < 600,
      tight = h < 300,
      size =
        w +
        "x" +
        h +
        (document.body.classList.contains("component-closeup") ? "-focus" : "");
    if (size !== this.size) {
      this.size = size;
      this.svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const heading = document.querySelector(".scene-heading"),
        rect = heading.getBoundingClientRect(),
        origin = this.wrap.getBoundingClientRect();
      this.top = Math.min(
        h * 0.37,
        Math.max(
          tight ? 28 : compact ? 54 : 92,
          rect.bottom - origin.top + (tight ? 5 : compact ? 9 : 14),
        ),
      );
      this.bottom = h - (tight ? 12 : compact ? 22 : 44);
      const rows = Math.max(
          ...["left", "right"].map(
            (side) => this.items.filter((item) => item.side === side).length,
          ),
        ),
        labelH = Math.max(
          16,
          Math.min(
            compact ? 21 : 29,
            Math.floor((this.bottom - this.top) / rows),
          ),
        );
      this.items.forEach((item) => {
        item.el.style.height = labelH + "px";
        item.el.style.fontSize = (labelH < 20 ? 9 : compact ? 10 : 12) + "px";
        item.width = item.el.offsetWidth;
        item.height = item.el.offsetHeight;
      });
    }
    const gap = compact ? 2 : 6,
      margin = compact ? 7 : 17;
    for (const item of this.items) {
      const p = (this.getAnchor?.(item.key) || item.anchor()).project(
        this.camera,
      );
      item.ax = (p.x * 0.5 + 0.5) * w;
      item.ay = (-p.y * 0.5 + 0.5) * h;
      item.outside =
        item.ax < 0 ||
        item.ax > w ||
        item.ay < 0 ||
        item.ay > h ||
        p.z < -1 ||
        p.z > 1;
    }
    for (const side of ["left", "right"]) {
      const list = this.items
          .filter((item) => item.side === side)
          .sort((a, b) => a.ay - b.ay),
        sum = list.reduce((n, item) => n + item.height, 0),
        actualGap = Math.max(
          0,
          Math.min(
            gap,
            (this.bottom - this.top - sum) / Math.max(1, list.length - 1),
          ),
        );
      let cursor = this.top;
      for (const item of list) {
        item.y = Math.max(
          cursor,
          Math.min(this.bottom - item.height, item.ay - item.height / 2),
        );
        cursor = item.y + item.height + actualGap;
      }
      let end = this.bottom;
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        item.y = Math.min(item.y, end - item.height);
        end = item.y - actualGap;
      }
      for (const item of list) {
        const x = side === "left" ? margin : w - margin - item.width,
          y = item.y,
          sy = y + item.height / 2,
          sx = side === "left" ? x + item.width : x,
          ex = side === "left" ? sx + 12 : sx - 12,
          ax = Math.max(4, Math.min(w - 4, item.ax)),
          ay = Math.max(4, Math.min(h - 4, item.ay));
        item.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        item.el.classList.toggle("outside", item.outside);
        item.el.classList.toggle("inside", item.inside && !this.isCutaway());
        item.path.setAttribute(
          "d",
          `M${sx.toFixed(1)},${sy.toFixed(1)} H${ex.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`,
        );
        item.path.classList.toggle(
          "concealed",
          item.outside || (item.inside && !this.isCutaway()),
        );
        item.pin.setAttribute("cx", ax.toFixed(1));
        item.pin.setAttribute("cy", ay.toFixed(1));
      }
    }
  }
};
