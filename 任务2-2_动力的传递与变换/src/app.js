(function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    $$ = (s) => [...document.querySelectorAll(s)],
    M = MechModel,
    TAU = Math.PI * 2;
  const params = JSON.parse(JSON.stringify(M.defaults)),
    states = {
      gear: M.create("gear"),
      hyd: M.create("hyd"),
      air: M.create("air"),
    };
  let mode = "gear",
    playing = !matchMedia("(prefers-reduced-motion: reduce)").matches,
    speed = 1,
    cutaway = true,
    showContact = true,
    last = performance.now(),
    history = [],
    sample = 0;
  let scene,
    camera,
    renderer,
    rig,
    parts = {},
    ownMaterials = [],
    yaw = 0.48,
    pitch = 0.43,
    zoom = 1,
    panX = 0,
    panY = 0,
    panZ = 0,
    nameLabels,
    stage = {},
    dark = true,
    focusState = null,
    overviewView = null,
    cameraTween = null,
    restoringCutaway = null,
    registry = {},
    partKey = null,
    inspection = null,
    learning = null;
  const target = new THREE.Vector3(0, 1.5, 0),
    wrap = $("#canvasWrap"),
    canvas = $("#scene");
  const mat = (color, metal = 0.3, rough = 0.4) =>
    new THREE.MeshStandardMaterial({
      color,
      metalness: metal,
      roughness: rough,
    });
  const palette = {
    steel: mat("#889b9e", 0.65, 0.3),
    dark: mat("#405654", 0.4, 0.4),
    pale: mat("#d0d9d3", 0.32, 0.45),
    green: mat("#278673", 0.5, 0.35),
    greenDark: mat("#315d50", 0.4, 0.4),
    base: mat("#d7dfd7", 0.28, 0.5),
    black: mat("#2d3936", 0.1, 0.65),
    brass: mat("#c3a15f", 0.65, 0.3),
    chrome: mat("#d6e3e1", 0.9, 0.19),
    oil: mat("#e3b858", 0.1, 0.3),
    air: mat("#7cb5d1", 0.1, 0.5),
    white: mat("#f3f6ef", 0.05, 0.7),
  };
  const lightColors = Object.fromEntries(
    Object.entries(palette).map(([k, m]) => [k, "#" + m.color.getHexString()]),
  );
  function setTheme(value) {
    dark = value;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector("meta[name=color-scheme]").content = dark
      ? "dark"
      : "light";
    const btn = $("#themeBtn");
    btn.setAttribute("aria-pressed", String(dark));
    btn.setAttribute("aria-label", dark ? "切换到浅色背景" : "切换到深色背景");
    btn.title = dark ? "切换到浅色背景" : "切换到深色背景";
    btn.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
    btn.querySelector(".theme-text").textContent = dark ? "浅色" : "深色";
    try {
      localStorage.setItem("mechanics-theme", dark ? "dark" : "light");
    } catch (e) {}
    const colors = dark
      ? {
          ...lightColors,
          steel: "#9cabb3",
          dark: "#405e65",
          pale: "#9db1b8",
          green: "#319b85",
          greenDark: "#306b60",
          base: "#354b57",
        }
      : lightColors;
    for (const [k, c] of Object.entries(colors)) palette[k].color.set(c);
    if (renderer && stage.ground) {
      scene.background.set(dark ? "#101b25" : "#f3f6f0");
      stage.ground.material.color.set(dark ? "#111e29" : "#f3f6f0");
      stage.grid.material.color.set(dark ? "#678492" : "#ffffff");
      stage.grid.material.opacity = dark ? 0.23 : 0.5;
      stage.hemi.color.set(dark ? "#d6e7ff" : "#fcfff8");
      stage.hemi.groundColor.set(dark ? "#2c414e" : "#a4b6ad");
      stage.hemi.intensity = dark ? 2.8 : 2.5;
      stage.key.intensity = dark ? 3.8 : 3.4;
      stage.fill.intensity = dark ? 2 : 1.5;
      renderer.toneMappingExposure = dark ? 1.3 : 1.45;
    }
    chart();
  }
  const icons = {
    gear: "ROTARY TRANSMISSION",
    hyd: "HYDRAULIC ACTUATION",
    air: "PNEUMATIC ACTUATION",
  };
  function tag(key, fn) {
    const before = partKey;
    partKey = key;
    try {
      return fn();
    } finally {
      partKey = before;
    }
  }
  function mesh(g, m, parent = rig) {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    if (partKey) {
      o.userData.component = partKey;
      (registry[partKey] ??= []).push(o);
    }
    return o;
  }
  function box(w, h, d, x, y, z, m = palette.steel, parent = rig) {
    const o = mesh(new THREE.BoxGeometry(w, h, d), m, parent);
    o.position.set(x, y, z);
    return o;
  }
  function cyl(
    r,
    h,
    x,
    y,
    z,
    m = palette.steel,
    axis = "y",
    parent = rig,
    r2 = r,
  ) {
    const o = mesh(new THREE.CylinderGeometry(r, r2, h, 48), m, parent);
    if (axis === "x") o.rotation.z = -Math.PI / 2;
    if (axis === "z") o.rotation.x = Math.PI / 2;
    o.position.set(x, y, z);
    return o;
  }
  function ring(ro, ri, h, x, y, z, m, axis = "z", parent = rig) {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, ro, 0, TAU, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, ri, 0, TAU, true);
    sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: h,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      curveSegments: 64,
    });
    g.translate(0, 0, -h / 2);
    if (axis === "x") g.rotateY(Math.PI / 2);
    if (axis === "y") g.rotateX(-Math.PI / 2);
    const o = mesh(g, m, parent);
    o.position.set(x, y, z);
    return o;
  }
  function bolt(x, y, z, parent = rig, axis = "y", r = 0.055) {
    const o = mesh(
      new THREE.CylinderGeometry(r, r, r * 0.7, 6),
      palette.chrome,
      parent,
    );
    if (axis === "x") o.rotation.z = -Math.PI / 2;
    if (axis === "z") o.rotation.x = Math.PI / 2;
    o.position.set(x, y, z);
    return o;
  }
  function labelPlate(text, x, y, z, w = 1, parent = rig) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#304d43";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#7b9b89";
    ctx.lineWidth = 3;
    ctx.strokeRect(12, 12, 488, 104);
    ctx.font = "500 34px Segoe UI";
    ctx.fillStyle = "#ddebe0";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 78);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const mm = new THREE.MeshBasicMaterial({ map: t });
    ownMaterials.push(mm);
    const o = mesh(new THREE.PlaneGeometry(w, w / 4), mm, parent);
    o.position.set(x, y, z);
    o.rotation.x = -Math.PI / 2;
    return o;
  }
  function base() {
    box(12.4, 0.22, 5.6, 0, 0.15, 0, palette.base);
    box(12.15, 0.055, 5.35, 0, 0.288, 0, palette.pale);
    for (const x of [-5.65, 5.65])
      for (const z of [-2.25, 2.25]) {
        cyl(0.23, 0.17, x, -0.02, z, palette.black);
        bolt(x, 0.33, z);
      }
    for (const x of [-5.8, 5.8]) for (const z of [-1.4, 1.4]) bolt(x, 0.33, z);
    labelPlate("MECHANICS / LAB", -4.8, 0.323, 2.1, 1.6);
    for (let i = 0; i < 42; i++) {
      const x = -1.8 + i * 0.17;
      box(
        0.008,
        0.012,
        i % 5 === 0 ? 0.17 : 0.08,
        x,
        0.327,
        2.45,
        palette.dark,
      );
    }
  }
  function clearRig() {
    if (rig) {
      rig.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      scene.remove(rig);
    }
    for (const m of ownMaterials) {
      if (m.map) m.map.dispose();
      m.dispose();
    }
    ownMaterials = [];
    rig = new THREE.Group();
    scene.add(rig);
    parts = {};
    registry = {};
    tag("base", base);
  }
  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color("#f3f6f0");
    camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (e) {
      $("#webglError").hidden = false;
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    const hemi = new THREE.HemisphereLight("#fcfff8", "#a4b6ad", 2.5);
    scene.add(hemi);
    const light = new THREE.DirectionalLight("#fff8e8", 3.4);
    light.position.set(-3, 10, 8);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.left = -9;
    light.shadow.camera.right = 9;
    light.shadow.camera.top = 8;
    light.shadow.camera.bottom = -8;
    light.shadow.normalBias = 0.025;
    light.shadow.bias = -0.00015;
    scene.add(light);
    const fill = new THREE.DirectionalLight("#d8eefa", 1.5);
    fill.position.set(7, 4, -6);
    scene.add(fill);
    const ground = mesh(
      new THREE.PlaneGeometry(200, 200),
      mat("#f3f6f0", 0, 0.9),
      scene,
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.13;
    ground.receiveShadow = true;
    ground.castShadow = false;
    const grid = new THREE.GridHelper(40, 80, "#dce4dc", "#e8ede5");
    grid.position.y = -0.12;
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    scene.add(grid);
    stage = { ground, grid, hemi, key: light, fill };
    nameLabels = new ComponentNames({
      wrap,
      camera,
      getMode: () => mode,
      getParts: () => parts,
      getParams: () => params[mode],
      isCutaway: () => cutaway,
      onSelect: focusComponent,
      getAnchor: (key) => {
        if (
          learning?.active?.kind !== "assembly" ||
          !registry[key]?.length ||
          key === "mesh"
        )
          return null;
        const b = new THREE.Box3();
        for (const o of registry[key]) b.expandByObject(o);
        return b.getCenter(new THREE.Vector3());
      },
    });
    new ResizeObserver(resize).observe(wrap);
    orbitEvents();
    build();
    resize();
  }
  function projection() {
    const a = wrap.clientWidth / wrap.clientHeight,
      half = Math.max(3.8, 7.8 / a) / zoom;
    camera.left = -half * a;
    camera.right = half * a;
    camera.top = half;
    camera.bottom = -half;
    camera.updateProjectionMatrix();
  }
  function resize() {
    if (!renderer) return;
    renderer.setSize(wrap.clientWidth, wrap.clientHeight, false);
    projection();
    updateCamera();
  }
  function updateCamera() {
    target.set(panX, 1.4 + panY, panZ);
    const d = 18;
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * d,
      target.y + Math.sin(pitch) * d,
      target.z + Math.cos(yaw) * Math.cos(pitch) * d,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  function viewState() {
    return { yaw, pitch, zoom, panX, panY, panZ };
  }
  function focusZoom(frame) {
    const w = wrap.clientWidth,
      h = wrap.clientHeight,
      half = Math.max(3.8, 7.8 / (w / h)),
      right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0),
      up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1),
      size = frame.size,
      sw =
        Math.abs(right.x) * size.x +
        Math.abs(right.y) * size.y +
        Math.abs(right.z) * size.z,
      sh =
        Math.abs(up.x) * size.x +
        Math.abs(up.y) * size.y +
        Math.abs(up.z) * size.z,
      usableW = inspection
        ? w * 0.83
        : Math.max(w * 0.45, w - (w < 600 ? 160 : 300)),
      usableH = Math.max(h * 0.48, h - (w < 600 ? 104 : 150));
    return M.clamp(
      Math.min(
        (usableW * 2 * half) / (sw * h),
        (usableH * 2 * half) / (sh * h),
      ),
      inspection ? 0.55 : 1.25,
      inspection ? 24 : 8,
    );
  }
  function makeInspection(item) {
    const resume = inspection ? inspection.resumePlaying : playing;
    if (inspection) scene.remove(inspection.root);
    rig.updateMatrixWorld(true);
    const root = new THREE.Group(),
      content = new THREE.Group();
    root.add(content);
    const sources = [...new Set(registry[item.key] || [])];
    for (const source of sources) {
      if (source.userData.flowMarker) continue;
      const clone = source.clone(false);
      clone.matrix.copy(source.matrixWorld);
      clone.matrixAutoUpdate = false;
      clone.visible = true;
      content.add(clone);
    }
    if (!content.children.length) throw new Error("组件未注册：" + item.key);
    const bounds = new THREE.Box3().setFromObject(content),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3());
    content.position.copy(center).multiplyScalar(-1);
    root.position.y = size.y / 2 + 0.35;
    scene.add(root);
    inspection = {
      root,
      center: root.position.clone(),
      size,
      resumePlaying: resume,
      autoRotate: false,
      key: item.key,
      meshes: content.children.length,
    };
    rig.visible = false;
    stage.grid.visible = false;
    playing = false;
    nameLabels.layer.hidden = true;
    nameLabels.svg.hidden = true;
  }
  function spinInspection() {
    if (!inspection) return;
    inspection.autoRotate = !inspection.autoRotate;
    learning?.setRotate(inspection.autoRotate);
    updateReadout();
  }
  function focusComponent(item) {
    if (!renderer) return;
    if (focusState?.item.key === item.key) {
      leaveFocus();
      return;
    }
    if (!overviewView) overviewView = viewState();
    cameraTween = null;
    makeInspection(item);
    focusState = {
      item,
      offset: new THREE.Vector3(),
      manualZoom: null,
      reorient: true,
    };
    nameLabels.select(item.key);
    document.body.classList.add("component-closeup");
    $(".control-panel").classList.add("has-focus");
    $("#componentFocus").hidden = false;
    $("#focusName").textContent = item.name;
    $("#focusName").title = item.name;
    $("#eyebrow").textContent = "COMPONENT STUDY";
    $("#sceneTitle").textContent = item.name;
    $("#sceneSubtitle").textContent = "独立展示 · 拖动旋转查看细节，滚轮缩放";
    learning?.renderDetails(
      item,
      componentInfo(mode, item.key, params[mode]),
      nameLabels.items,
      (key) => {
        if (key !== focusState?.item.key)
          focusComponent(nameLabels.items.find((x) => x.key === key));
      },
      spinInspection,
    );
    updateReadout();
    $("#returnOverview").focus({ preventScroll: true });
  }
  function leaveFocus(restore = true, animate = true) {
    if (inspection) {
      const resume = inspection.resumePlaying;
      scene.remove(inspection.root);
      inspection = null;
      if (rig) rig.visible = true;
      stage.grid.visible = true;
      playing = resume;
      nameLabels.layer.hidden = false;
      nameLabels.svg.hidden = false;
      nameLabels.size = "";
    }
    focusState = null;
    nameLabels?.select(null);
    document.body.classList.remove("component-closeup");
    $(".control-panel").classList.remove("has-focus");
    $("#componentFocus").hidden = true;
    if (restoringCutaway !== null) {
      cutaway = restoringCutaway;
      restoringCutaway = null;
      if (parts.shell) {
        parts.shell.visible = cutaway;
        parts.full.visible = !cutaway;
      }
      if ($("#cut")) $("#cut").checked = cutaway;
    }
    if (restore && overviewView) {
      if (animate) cameraTween = { ...overviewView };
      else {
        ({ yaw, pitch, zoom, panX, panY, panZ } = overviewView);
        cameraTween = null;
        resize();
      }
    }
    overviewView = null;
    if (learning) {
      refreshText();
      learning.details.innerHTML =
        '<div class="lesson-empty">点击图中的组件名称，独立观察零件并了解它的作用与工作原理。</div>';
      learning.showPanel(learning.active ? "tasks" : "params");
    }
    updateReadout();
  }
  function moveCamera(dt) {
    if (!renderer || (!focusState && !cameraTween)) return;
    let next = cameraTween;
    if (focusState) {
      const frame = inspection
          ? { center: inspection.center.clone(), size: inspection.size }
          : componentFrame(mode, focusState.item.key, parts, params[mode]),
        c = frame.center.add(focusState.offset);
      next = {
        panX: c.x,
        panY: c.y - 1.4,
        panZ: c.z,
        zoom: focusState.manualZoom ?? focusZoom(frame),
        yaw: focusState.reorient ? 0.48 : yaw,
        pitch: focusState.reorient ? 0.42 : pitch,
      };
    }
    const t = 1 - Math.exp(-dt * 10),
      follow = (a, b) => a + (b - a) * t;
    panX = follow(panX, next.panX);
    panY = follow(panY, next.panY);
    panZ = follow(panZ, next.panZ);
    zoom = follow(zoom, next.zoom);
    yaw = follow(yaw, next.yaw);
    pitch = follow(pitch, next.pitch);
    if (
      !focusState &&
      Math.abs(panX - next.panX) +
        Math.abs(panY - next.panY) +
        Math.abs(panZ - next.panZ) +
        Math.abs(zoom - next.zoom) +
        Math.abs(yaw - next.yaw) +
        Math.abs(pitch - next.pitch) <
        0.001
    ) {
      ({ yaw, pitch, zoom, panX, panY, panZ } = next);
      cameraTween = null;
    }
    projection();
    updateCamera();
  }
  function orbitEvents() {
    const pointers = new Map();
    let oldDist = 0;
    canvas.addEventListener("pointerdown", (e) => {
      cameraTween = null;
      if (focusState) focusState.reorient = false;
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const a = [...pointers.values()];
        oldDist = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      const old = pointers.get(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const a = [...pointers.values()],
          dist = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        zoom = M.clamp(
          (zoom * dist) / Math.max(1, oldDist),
          0.65,
          inspection ? 24 : focusState ? 8 : 2.2,
        );
        if (focusState) focusState.manualZoom = zoom;
        oldDist = dist;
        resize();
        return;
      }
      if (e.shiftKey) {
        const dx = (-(e.clientX - old[0]) * 0.012) / zoom,
          dy = ((e.clientY - old[1]) * 0.012) / zoom;
        if (focusState) {
          focusState.offset.x += dx;
          focusState.offset.y += dy;
        } else {
          panX += dx;
          panY += dy;
        }
      } else {
        if (focusState) focusState.manualZoom = zoom;
        yaw -= (e.clientX - old[0]) * 0.006;
        pitch = M.clamp(
          pitch + (e.clientY - old[1]) * 0.005,
          inspection ? -1.45 : -0.15,
          1.45,
        );
      }
      updateCamera();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      canvas.addEventListener(type, (e) => pointers.delete(e.pointerId));
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        cameraTween = null;
        zoom = M.clamp(
          zoom * Math.exp(-e.deltaY * 0.001),
          0.65,
          inspection ? 24 : focusState ? 8 : 2.2,
        );
        if (focusState) focusState.manualZoom = zoom;
        resize();
      },
      { passive: false },
    );
  }
  function circleLine(r, x, y, z, color, parent = rig) {
    const pts = [];
    for (let i = 0; i <= 180; i++) {
      const a = (i / 180) * TAU;
      pts.push(new THREE.Vector3(x + Math.cos(a) * r, y + Math.sin(a) * r, z));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const o = new THREE.Line(
      g,
      new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity: 0.45,
        dashSize: 0.055,
        gapSize: 0.045,
      }),
    );
    o.computeLineDistances();
    parent.add(o);
    ownMaterials.push(o.material);
    return o;
  }
  function gearShape(z, m) {
    const rp = (z * m) / 2,
      ra = rp + m,
      rf = rp - 1.25 * m,
      rb = rp * Math.cos(Math.PI / 9),
      ia = Math.tan(Math.PI / 9) - Math.PI / 9;
    const half = (r) =>
      Math.PI / (2 * z) +
      ia -
      (Math.tan(Math.acos(Math.min(1, rb / r))) -
        Math.acos(Math.min(1, rb / r)));
    const b = Math.max(rf, rb),
      hb = half(b),
      ha = half(ra),
      pts = [];
    const push = (r, a) =>
      pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)));
    for (let i = 0; i < z; i++) {
      const a = (i * TAU) / z;
      for (let k = 0; k <= 3; k++)
        push(rf, a - Math.PI / z + ((Math.PI / z - hb) * k) / 3);
      if (rb > rf) push(rb, a - hb);
      for (let k = 0; k <= 10; k++) {
        const r = b + ((ra - b) * k) / 10;
        push(r, a - half(r));
      }
      for (let k = 1; k <= 4; k++) push(ra, a - ha + (2 * ha * k) / 4);
      for (let k = 10; k >= 0; k--) {
        const r = b + ((ra - b) * k) / 10;
        push(r, a + half(r));
      }
      if (rb > rf) push(rf, a + hb);
      for (let k = 1; k <= 3; k++)
        push(rf, a + hb + ((Math.PI / z - hb) * k) / 3);
    }
    const sh = new THREE.Shape(pts);
    sh.holes.push(keyBore());
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6,
        rr = rp * 0.56,
        hr = Math.min(0.19, rp * 0.12),
        h = new THREE.Path();
      h.absarc(rr * Math.cos(a), rr * Math.sin(a), hr, 0, TAU, true);
      sh.holes.push(h);
    }
    return sh;
  }
  function keyBore() {
    const r = 0.138,
      k = 0.04,
      y = Math.sqrt(r * r - k * k),
      h = new THREE.Path();
    h.moveTo(-k, y);
    h.lineTo(-k, y + 0.05);
    h.lineTo(k, y + 0.05);
    h.lineTo(k, y);
    h.absarc(0, 0, r, Math.atan2(y, k), Math.atan2(y, -k) - TAU, true);
    h.closePath();
    return h;
  }
  function wheelDetails(group, r, color) {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, r * 0.32, 0, TAU, false);
    sh.holes.push(keyBore());
    const g = new THREE.ExtrudeGeometry(sh, {
      depth: 0.18,
      bevelEnabled: false,
      curveSegments: 64,
    });
    g.translate(0, 0, 0.3);
    mesh(g, color, group);
    ring(0.225, 0.138, 0.12, 0, 0, 0.54, palette.chrome, "z", group);
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      bolt(
        r * 0.25 * Math.cos(a),
        r * 0.25 * Math.sin(a),
        0.49,
        group,
        "z",
        0.034,
      );
    }
    ring(r * 0.78, r * 0.75, 0.008, 0, 0, 0.48, palette.chrome, "z", group);
    box(0.16, 0.04, 0.025, r * 0.72, 0, 0.485, palette.white, group);
  }
  function bearing(x, y, index) {
    tag("bearing-" + index, () => {
      for (const z of [-0.95, -1.45]) {
        box(0.7, 0.13, 0.6, x, 0.39, z, palette.dark);
        for (const dx of [-0.24, 0.24]) bolt(x + dx, 0.48, z);
        box(
          0.32,
          y - 0.34 - 0.455,
          0.32,
          x,
          (y - 0.34 + 0.455) / 2,
          z,
          palette.pale,
        );
        ring(0.34, 0.14, 0.23, x, y, z, palette.dark);
        ring(0.195, 0.14, 0.26, x, y, z + 0.01, palette.chrome);
        ring(0.3, 0.24, 0.26, x, y, z + 0.01, palette.steel);
        for (let j = 0; j < 12; j++) {
          const a = (j * TAU) / 12,
            o = mesh(new THREE.SphereGeometry(0.0225, 10, 8), palette.chrome);
          o.position.set(
            x + 0.2175 * Math.cos(a),
            y + 0.2175 * Math.sin(a),
            z + 0.145,
          );
        }
      }
    });
    const shaft = new THREE.Group();
    shaft.position.set(x, y, 0);
    rig.add(shaft);
    (parts.shafts ??= []).push(shaft);
    tag("shaft-" + index, () => {
      cyl(0.135, 1.625, 0, 0, -0.7125, palette.chrome, "z", shaft);
      const r = 0.135,
        k = 0.04,
        yy = Math.sqrt(r * r - k * k),
        s = new THREE.Shape();
      s.moveTo(-k, yy);
      s.lineTo(-k, yy - 0.04);
      s.lineTo(k, yy - 0.04);
      s.lineTo(k, yy);
      s.absarc(0, 0, r, Math.atan2(yy, k), Math.atan2(yy, -k) - TAU, true);
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.4,
        bevelEnabled: false,
        curveSegments: 48,
      });
      g.translate(0, 0, 0.1);
      mesh(g, palette.chrome, shaft);
      cyl(0.135, 0.425, 0, 0, 0.7125, palette.chrome, "z", shaft);
    });
    tag("key-" + index, () =>
      box(0.074, 0.083, 0.36, 0, 0.132, 0.3, palette.brass, shaft),
    );
    tag("collar-" + index, () => {
      ring(0.2, 0.138, 0.11, 0, 0, 0.8, palette.dark, "z", shaft);
      bolt(0, 0.205, 0.8, shaft, "y", 0.035);
    });
  }
  function driveMotor(x, y) {
    cyl(0.42, 0.72, x, y, -2.03, palette.dark, "z");
    for (let i = 0; i < 8; i++)
      ring(0.45, 0.39, 0.025, x, y, -2.34 + i * 0.08, palette.steel);
    cyl(0.24, 0.16, x, y, -1.59, palette.dark, "z");
    box(
      0.7,
      y - 0.42 - 0.45,
      0.48,
      x,
      (y - 0.42 + 0.45) / 2,
      -2.05,
      palette.dark,
    );
    box(0.85, 0.135, 0.68, x, 0.3825, -2.05, palette.steel);
    for (const dx of [-0.3, 0.3]) bolt(x + dx, 0.47, -2.05);
  }
  function beltPath(r1, r2, c, x1, y) {
    const nx = (r1 - r2) / c,
      ny = Math.sqrt(1 - nx * nx),
      a = Math.atan2(ny, nx),
      line = Math.sqrt(c * c - (r2 - r1) ** 2),
      right = 2 * a * r2,
      left = (TAU - 2 * a) * r1,
      total = 2 * line + right + left;
    return {
      length: total,
      angle: a,
      line,
      right,
      at(s) {
        s = ((s % total) + total) % total;
        if (s < line) {
          const u = s / line;
          return {
            x: x1 + r1 * nx + u * (c + (r2 - r1) * nx),
            y: y + r1 * ny + u * (r2 - r1) * ny,
            tx: ny,
            ty: -nx,
          };
        }
        s -= line;
        if (s < right) {
          const q = a - s / r2;
          return {
            x: x1 + c + r2 * Math.cos(q),
            y: y + r2 * Math.sin(q),
            tx: Math.sin(q),
            ty: -Math.cos(q),
          };
        }
        s -= right;
        if (s < line) {
          const u = s / line;
          return {
            x: x1 + c + r2 * nx - u * (c + (r2 - r1) * nx),
            y: y - r2 * ny + u * (r2 - r1) * ny,
            tx: -ny,
            ty: -nx,
          };
        }
        s -= line;
        const q = -a - s / r1;
        return {
          x: x1 + r1 * Math.cos(q),
          y: y + r1 * Math.sin(q),
          tx: Math.sin(q),
          ty: -Math.cos(q),
        };
      },
    };
  }
  function beltMesh(path) {
    const pos = [],
      ids = [],
      N = 400;
    for (let i = 0; i <= N; i++) {
      const p = path.at((i / N) * path.length),
        nx = -p.ty,
        ny = p.tx;
      for (const [rad, z] of [
        [-0.035, 0.22],
        [-0.035, 0.53],
        [0.035, 0.22],
        [0.035, 0.53],
      ])
        pos.push(p.x + nx * rad, p.y + ny * rad, z);
    }
    for (let i = 0; i < N; i++)
      for (const [a, b] of [
        [0, 1],
        [1, 3],
        [3, 2],
        [2, 0],
      ]) {
        const j = i * 4;
        ids.push(j + a, j + b, j + 4 + b, j + a, j + 4 + b, j + 4 + a);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(ids);
    g.computeVertexNormals();
    return mesh(g, palette.black);
  }
  function sprocket(z, r) {
    const pts = [],
      pitch = TAU / z,
      rr = 0.092,
      seat = Math.asin(rr / r) * 0.77;
    for (let i = 0; i < z; i++)
      for (let k = 0; k < 32; k++) {
        const d = (k / 32 - 0.5) * pitch,
          ad = Math.abs(d);
        let rad;
        if (ad < seat)
          rad =
            r * Math.cos(d) -
            Math.sqrt(Math.max(0, rr * rr - (r * Math.sin(d)) ** 2));
        else
          rad =
            r * Math.cos(seat) -
            Math.sqrt(Math.max(0, rr * rr - (r * Math.sin(seat)) ** 2)) +
            (r +
              0.065 -
              (r * Math.cos(seat) -
                Math.sqrt(Math.max(0, rr * rr - (r * Math.sin(seat)) ** 2)))) *
              Math.min(1, (ad - seat) / Math.max(0.001, pitch * 0.43 - seat));
        const a = i * pitch + d;
        pts.push(new THREE.Vector2(rad * Math.cos(a), rad * Math.sin(a)));
      }
    const sh = new THREE.Shape(pts);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.16, 0, TAU, true);
    sh.holes.push(hole);
    return sh;
  }
  function buildTransmission() {
    const p = params.gear,
      isG = p.kind === "gear",
      isB = p.kind === "belt",
      r1 = isG ? (p.z1 * 0.085) / 2 : (p.z1 * 0.25) / TAU,
      r2 = isG ? (p.z2 * 0.085) / 2 : (p.z2 * 0.25) / TAU;
    let c = isG ? r1 + r2 : r1 + r2 + 2.1;
    if (!isG && !isB) {
      const total = Math.ceil(beltPath(r1, r2, c, 0, 0).length / 0.5) * 0.5;
      for (let i = 0; i < 8; i++)
        c -=
          (beltPath(r1, r2, c, 0, 0).length - total) /
          (2 * Math.sqrt(1 - ((r2 - r1) / c) ** 2));
    }
    const y = 3.05,
      x1 = -(c + r2 - r1) / 2,
      x2 = x1 + c;
    const groups = [];
    for (const [i, r, x, z] of [
      [0, r1, x1, p.z1],
      [1, r2, x2, p.z2],
    ]) {
      bearing(x, y, i + 1);
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      rig.add(g);
      groups.push(g);
      const color = i === (p.input || 1) - 1 ? palette.green : palette.steel;
      tag("wheel-" + (i + 1), () => {
        if (isG) {
          const geom = new THREE.ExtrudeGeometry(gearShape(z, 0.085), {
            depth: 0.35,
            steps: 1,
            bevelEnabled: true,
            bevelSize: 0.004,
            bevelOffset: -0.004,
            bevelThickness: 0.005,
            bevelSegments: 3,
            curveSegments: 64,
          });
          const o = mesh(geom, color, g);
          o.position.z = 0.12;
        } else if (isB) {
          ring(r - 0.035, 0.138, 0.35, 0, 0, 0.36, color, "z", g);
          ring(r + 0.028, r - 0.07, 0.035, 0, 0, 0.18, palette.chrome, "z", g);
          ring(r + 0.028, r - 0.07, 0.035, 0, 0, 0.56, palette.chrome, "z", g);
          for (let k = 0; k < 6; k++) {
            const a = (k * TAU) / 6;
            cyl(
              r * 0.065,
              0.015,
              Math.cos(a) * r * 0.63,
              Math.sin(a) * r * 0.63,
              0.55,
              palette.dark,
              "z",
              g,
            );
          }
        } else {
          const geom = new THREE.ExtrudeGeometry(sprocket(z, r), {
            depth: 0.15,
            bevelEnabled: false,
            curveSegments: 32,
          });
          const o = mesh(geom, color, g);
          o.position.z = 0.33;
          ring(r * 0.7, 0.2, 0.13, 0, 0, 0.33, color, "z", g);
        }
        wheelDetails(g, r, color);
      });
    }
    tag("motor", () => driveMotor(p.input === 2 ? x2 : x1, y));
    parts.wheels = groups;
    parts.r1 = r1;
    parts.r2 = r2;
    parts.x1 = x1;
    parts.x2 = x2;
    parts.y = y;
    parts.contacts = [];
    if (isG) {
      parts.contacts.push(
        circleLine(r1, x1, y, 0.5, "#29866a"),
        circleLine(r2, x2, y, 0.5, "#809b89"),
      );
      parts.contactBalls = [];
      for (let i = 0; i < 2; i++) {
        const glow = mesh(
          new THREE.SphereGeometry(0.039, 16, 12),
          palette.brass,
        );
        parts.contactBalls.push(glow);
      }
    } else {
      const path = beltPath(r1, r2, c, x1, y);
      parts.path = path;
      parts.markers = [];
      tag("flexible", () => {
        if (isB) {
          beltMesh(path);
          for (let i = 0; i < 18; i++) {
            const o = box(
              0.065,
              0.045,
              0.32,
              0,
              0,
              0.375,
              i === 0 ? palette.brass : palette.pale,
            );
            parts.markers.push(o);
          }
        } else {
          const count = Math.round(path.length / 0.25),
            links = [];
          for (let i = 0; i < count; i++) {
            const g = new THREE.Group();
            rig.add(g);
            const roller = cyl(0.083, 0.29, 0, 0, 0.4, palette.chrome, "z", g);
            cyl(0.035, 0.47, 0, 0, 0.4, palette.dark, "z", g);
            for (const zz of [0.16, 0.64]) {
              const l = box(
                0.23,
                0.108,
                0.034,
                0.11,
                0,
                zz,
                i % 2 ? palette.steel : palette.dark,
                g,
              );
              links.push(l);
            }
            parts.markers.push(g);
          }
          parts.chainCount = count;
        }
      });
      parts.contacts.push(
        circleLine(r1, x1, y, 0.73, "#44836d"),
        circleLine(r2, x2, y, 0.73, "#9aab9a"),
      );
    }
    const input = p.input || 1,
      output = 3 - input;
    registry.driver = registry["wheel-" + input];
    registry.driven = registry["wheel-" + output];
    registry["input-shaft"] = registry["shaft-" + input];
    registry["output-shaft"] = registry["shaft-" + output];
    registry.bearing = registry["bearing-" + output];
    registry.keys = registry["key-" + input];
    registry.collars = registry["collar-" + input];
    registry.mesh = [...registry["wheel-1"], ...registry["wheel-2"]];
    registry.contact = [
      ...registry["wheel-" + input],
      ...(registry.flexible || []),
    ];
  }
  function sectorGeometry(inner, outer, start, end) {
    const vs = [],
      ids = [],
      N = 72;
    for (let i = 0; i <= N; i++) {
      const a = start + ((end - start) * i) / N;
      for (const [x, r] of [
        [0, inner],
        [1, inner],
        [0, outer],
        [1, outer],
      ])
        vs.push(x, r * Math.cos(a), r * Math.sin(a));
    }
    for (let i = 0; i < N; i++) {
      const j = i * 4;
      for (const [a, b] of [
        [0, 1],
        [2, 0],
        [1, 3],
        [3, 2],
      ])
        ids.push(j + a, j + b, j + 4 + b, j + a, j + 4 + b, j + 4 + a);
    }
    for (const j of [0, N * 4]) ids.push(j, j + 2, j + 3, j, j + 3, j + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vs, 3));
    g.setIndex(ids);
    g.computeVertexNormals();
    return g;
  }
  function fluidMaterial(color, opacity) {
    const m = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.05,
      roughness: 0.25,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    ownMaterials.push(m);
    return m;
  }
  function tube(points, color, r = 0.05) {
    const v = points.map((p) => new THREE.Vector3(...p)),
      curve = new THREE.CatmullRomCurve3(v, false, "centripetal", 0.15),
      o = mesh(new THREE.TubeGeometry(curve, 80, r, 10, false), color);
    return { curve, mesh: o };
  }
  function flowLine(points, color) {
    const t = tube(points, palette.dark, 0.065);
    const markers = [];
    const m = mat(color, 0.15, 0.4);
    ownMaterials.push(m);
    for (let i = 0; i < 12; i++) {
      const o = mesh(new THREE.SphereGeometry(0.055, 10, 8), m);
      o.userData.flowMarker = true;
      markers.push(o);
    }
    return { ...t, markers, phase: 0 };
  }
  function pressureGauge(x, y, z) {
    cyl(0.24, 0.11, x, y, z, palette.dark, "z");
    cyl(0.202, 0.014, x, y, z + 0.064, palette.white, "z");
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * 0.8 - (i / 12) * Math.PI * 1.6,
        o = box(
          0.012,
          0.035,
          0.008,
          x + Math.cos(a) * 0.17,
          y + Math.sin(a) * 0.17,
          z + 0.079,
          palette.dark,
        );
      o.rotation.z = a - Math.PI / 2;
    }
    const needle = box(0.15, 0.015, 0.009, 0, 0, 0, palette.green);
    const pivot = new THREE.Group();
    rig.add(pivot);
    pivot.position.set(x, y, z + 0.09);
    needle.position.set(0.065, 0, 0);
    rig.remove(needle);
    pivot.add(needle);
    cyl(0.028, 0.018, x, y, z + 0.09, palette.dark, "z");
    return pivot;
  }
  function port(x, y, z, R) {
    ring(0.14, 0.07, 0.14, x, y, z, palette.brass, "z");
    cyl(0.075, 0.19, x, y, z + 0.13, palette.chrome, "z");
  }
  function buildActuator() {
    const p = params[mode],
      a = M.areas(mode, p),
      R = (p.bore / (mode === "hyd" ? 50 : 40)) * 0.64,
      Y = 2.15;
    parts.R = R;
    parts.Y = Y;
    partKey = "barrel";
    const start = Math.PI * 0.57,
      end = TAU + 0.08;
    const shell = mesh(sectorGeometry(R, R + 0.105, start, end), palette.steel);
    shell.position.set(-3.07, Y, 0);
    shell.scale.x = 4.395;
    const full = ring(R + 0.105, R, 4.395, -0.8725, Y, 0, palette.steel, "x");
    full.visible = !cutaway;
    shell.visible = cutaway;
    parts.shell = shell;
    parts.full = full;
    registry.barrel = [full];
    for (const x of [-3.23, 1.46]) {
      partKey = x < 0 ? "rearcap" : "frontcap";
      if (x < 0)
        box(0.27, (R + 0.25) * 2, (R + 0.25) * 2, x, Y, 0, palette.dark);
      else {
        const sh = new THREE.Shape();
        sh.moveTo(-R - 0.25, -R - 0.25);
        sh.lineTo(R + 0.25, -R - 0.25);
        sh.lineTo(R + 0.25, R + 0.25);
        sh.lineTo(-R - 0.25, R + 0.25);
        sh.closePath();
        const hole = new THREE.Path();
        hole.absarc(0, 0, (R * a.d) / a.D + 0.01, 0, TAU, true);
        sh.holes.push(hole);
        const g = new THREE.ExtrudeGeometry(sh, {
          depth: 0.27,
          bevelEnabled: false,
          curveSegments: 48,
        });
        g.translate(0, 0, -0.135);
        g.rotateY(Math.PI / 2);
        const cap = mesh(g, palette.dark);
        cap.position.set(x, Y, 0);
      }
      ring(R + 0.19, R * 0.5, 0.29, x, Y, 0, palette.steel, "x");
      for (const sy of [-1, 1])
        for (const sz of [-1, 1])
          bolt(x + 0.16, Y + sy * (R + 0.16), sz * (R + 0.16), rig, "x", 0.075);
    }
    // A bored front gland, no solid cap placed across the sliding rod.
    ring(R * 0.6, (R * a.d) / a.D, 0.32, 1.64, Y, 0, palette.chrome, "x");
    ring(R * 0.58, (R * a.d) / a.D, 0.06, 1.82, Y, 0, palette.black, "x");
    partKey = "tie-rods";
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        cyl(
          0.043,
          5,
          -0.88,
          Y + sy * (R + 0.16),
          sz * (R + 0.16),
          palette.chrome,
          "x",
        );
      }
    partKey = "mounts";
    for (const x of [-2.8, 0.99]) {
      box(0.57, Y - R - 0.4, 0.85, x, (Y - R + 0.3) / 2, 0, palette.dark);
      box(0.9, 0.12, 1.2, x, 0.4, 0, palette.steel);
      for (const z of [-0.48, 0.48])
        for (const xx of [-0.3, 0.3]) bolt(x + xx, 0.49, z);
    }
    partKey = "piston";
    const piston = new THREE.Group();
    rig.add(piston);
    for (const [length, xx, rr] of [
      [0.018, -0.086, 0.975],
      [0.026, -0.064, 0.9],
      [0.102, 0, 0.975],
      [0.026, 0.064, 0.9],
      [0.018, 0.086, 0.975],
    ])
      cyl(R * rr, length, xx, 0, 0, palette.pale, "x", piston);
    tag("seals", () => {
      for (const xx of [-0.064, 0.064])
        ring(R * 0.99, R * 0.9, 0.026, xx, 0, 0, palette.black, "x", piston);
    });
    tag("rod", () => {
      cyl((R * a.d) / a.D, 4.95, 2.565, 0, 0, palette.chrome, "x", piston);
      ring(0.25, 0.12, 0.22, 5.18, 0, 0, palette.steel, "z", piston);
    });
    parts.piston = piston;
    const oilA = fluidMaterial(
        mode === "hyd" ? "#e5b44c" : "#75b7d5",
        mode === "hyd" ? 0.69 : 0.28,
      ),
      oilB = fluidMaterial(
        mode === "hyd" ? "#adc4c1" : "#becbd2",
        mode === "hyd" ? 0.28 : 0.18,
      );
    parts.fluidA = tag("chamber-a", () =>
      mesh(sectorGeometry(0, R * 0.98, start, end), oilA),
    );
    parts.fluidB = tag("chamber-b", () =>
      mesh(sectorGeometry((R * a.d) / a.D, R * 0.98, start, end), oilB),
    );
    parts.fluidA.position.y = parts.fluidB.position.y = Y;
    parts.fluidA.castShadow = parts.fluidB.castShadow = false;
    // The source, directional valve and all working/return connections form a complete circuit.
    partKey = "valve";
    const V = { x: -0.35, y: 0.8, z: 1.98 };
    box(1.22, 0.37, 0.62, V.x, V.y, V.z, palette.pale);
    box(1.38, 0.1, 0.8, V.x, 0.56, V.z, palette.dark);
    for (const x of [-1.07, 0.37]) {
      box(0.23, 0.28, 0.48, x, 0.81, V.z, palette.dark);
      cyl(0.09, 0.26, x, 0.81, V.z + 0.36, palette.black, "z");
    }
    for (const x of [-0.85, 0.15]) bolt(x, 1.02, V.z);
    parts.spool = box(0.21, 0.037, 0.4, V.x, 1.003, V.z, palette.green);
    parts.gauge = tag("gauge", () => pressureGauge(-0.35, 1.35, 2.03));
    // Ports are in the heads and open into the dead-volume cavities, outside the swept piston faces.
    const portZ = R + 0.32;
    for (const x of [-3.23, 1.46])
      tag(x < 0 ? "port-a" : "port-b", () => port(x, Y, portZ, R));
    partKey = "line-a";
    const flowColor = mode === "hyd" ? "#dfb359" : "#70b8d6";
    parts.flowA = flowLine(
      [
        [-0.62, 0.97, 1.98],
        [-1.18, 1.13, 1.8],
        [-3.23, 1.24, 1.8],
        [-3.23, Y, portZ + 0.225],
      ],
      flowColor,
    );
    partKey = "line-b";
    parts.flowB = flowLine(
      [
        [-0.08, 0.97, 1.98],
        [1.46, 1.12, 1.98],
        [1.46, 1.46, 1.7],
        [1.46, Y, portZ + 0.225],
      ],
      flowColor,
    );
    partKey = "supply";
    parts.flowP = flowLine(
      [
        [-2.25, 0.78, 1.88],
        [-1.65, 0.72, 1.92],
        [-1.22, 0.7, 1.98],
        [-0.96, 0.8, 1.98],
      ],
      flowColor,
    );
    partKey = "return";
    parts.flowT = flowLine(
      [
        [0.1, 0.63, 2.22],
        [0.1, 0.43, 2.48],
        [-4.65, 0.43, 2.48],
        [-4.65, 1.15, 0.57],
      ],
      mode === "hyd" ? "#9fbdb8" : "#bac8cf",
    );
    if (mode === "hyd") {
      partKey = "tank";
      box(1.6, 0.88, 1.2, -4.65, 0.85, 0.07, palette.greenDark);
      box(1.68, 0.075, 1.27, -4.65, 1.33, 0.07, palette.steel);
      cyl(0.15, 0.15, -4.95, 1.45, 0.07, palette.dark);
      for (const x of [-5.26, -4.04])
        for (const z of [-0.38, 0.51]) bolt(x, 1.4, z);
      box(0.12, 0.48, 0.03, -4.65, 0.88, 0.69, palette.brass);
      box(0.045, 0.32, 0.035, -4.65, 0.9, 0.71, palette.oil);
      cyl(0.22, 0.36, -4.15, 1.56, 0.2, palette.pale);
      cyl(0.17, 0.1, -4.15, 1.78, 0.2, palette.dark);
      partKey = "pump";
      cyl(0.32, 0.55, -2.55, 0.77, 1.88, palette.green, "x");
      partKey = "pump-motor";
      cyl(0.38, 0.62, -3.1, 0.77, 1.88, palette.dark, "x");
      for (let i = 0; i < 8; i++)
        ring(
          0.4,
          0.34,
          0.026,
          -3.37 + i * 0.073,
          0.77,
          1.88,
          palette.steel,
          "x",
        );
      box(0.85, 0.13, 0.74, -3.1, 0.42, 1.88, palette.dark);
      partKey = null;
      tube(
        [
          [-4.05, 0.7, 0.3],
          [-3.82, 0.56, 0.65],
          [-3.6, 0.6, 1.88],
        ],
        palette.dark,
        0.09,
      );
      partKey = "relief";
      box(0.24, 0.28, 0.3, -1.3, 0.58, 2.39, palette.brass);
      cyl(0.065, 0.13, -1.3, 0.78, 2.39, palette.dark);
      partKey = "bypass";
      parts.relief = flowLine(
        [
          [-1.35, 0.72, 1.93],
          [-1.3, 0.72, 2.39],
          [-1.3, 0.43, 2.48],
          [-4.65, 0.43, 2.48],
          [-4.65, 1.15, 0.57],
        ],
        "#d6b16a",
      );
    } else {
      partKey = "receiver";
      cyl(0.51, 1.6, -4.62, 0.91, 0.05, palette.green, "x");
      for (const x of [-5.42, -3.82]) {
        const o = mesh(new THREE.SphereGeometry(0.51, 32, 16), palette.green);
        o.position.set(x, 0.91, 0.05);
        o.scale.x = 0.35;
      }
      for (const x of [-5.1, -4.1]) {
        box(0.17, 0.36, 0.2, x, 0.44, 0.05, palette.dark);
      }
      partKey = "compressor";
      box(0.8, 0.29, 0.7, -4.5, 1.53, 0.05, palette.dark);
      for (let i = 0; i < 6; i++)
        box(0.8, 0.027, 0.77, -4.5, 1.44 + i * 0.055, 0.05, palette.steel);
      cyl(0.16, 0.28, -5.02, 1.54, 0.03, palette.chrome);
      partKey = "regulator";
      box(0.43, 0.35, 0.5, -2.65, 0.89, 1.88, palette.pale);
      cyl(0.2, 0.4, -2.65, 0.54, 1.88, palette.chrome);
      cyl(0.13, 0.12, -2.65, 1.15, 1.88, palette.dark);
      partKey = "supply";
      tube(
        [
          [-3.82, 0.97, 0.05],
          [-3.3, 0.97, 0.6],
          [-3.28, 0.91, 1.88],
          [-2.9, 0.9, 1.88],
        ],
        palette.dark,
        0.065,
      );
      tube(
        [
          [-2.41, 0.89, 1.88],
          [-2.25, 0.78, 1.88],
        ],
        palette.dark,
        0.06,
      );
      // Two exhaust silencers connected to a shared visible exhaust path.
      partKey = "silencer";
      for (const x of [-4.74, -4.55]) {
        cyl(0.075, 0.31, x, 1.24, 0.57, palette.brass);
        for (let j = 0; j < 6; j++)
          ring(0.08, 0.07, 0.02, x, 1.12 + j * 0.043, 0.57, palette.dark, "y");
      }
    }
    partKey = null;
    const particleMat = fluidMaterial(
      mode === "hyd" ? "#f8dc8b" : "#3f92c0",
      0.7,
    );
    parts.interior = [];
    for (let i = 0; i < 52; i++) {
      const o = mesh(
        new THREE.SphereGeometry(mode === "hyd" ? 0.022 : 0.027, 6, 5),
        particleMat,
      );
      o.castShadow = false;
      parts.interior.push(o);
    }
    parts.labels = [
      new THREE.Vector3(-2.15, Y + R + 0.43, 0),
      new THREE.Vector3(0.58, Y + R + 0.43, 0),
      new THREE.Vector3(3.4, Y + 0.5, 0),
    ];
  }
  function build() {
    if (!renderer) return;
    if (focusState || overviewView) leaveFocus(true, false);
    clearRig();
    if (mode === "gear") buildTransmission();
    else buildActuator();
    nameLabels.reset();
    learning?.afterBuild();
    history = [];
    sample = 0;
    updateScene(0);
  }
  function range(id, label, value, min, max, step, unit) {
    return `<div class="field"><div class="field-top"><label for="${id}">${label}</label><output id="${id}Out">${value}<small>${unit}</small></output></div><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><div class="range-marks"><span>${min} ${unit}</span><span>${max} ${unit}</span></div></div>`;
  }
  function option(value, text, current) {
    return `<option value="${value}" ${String(value) === String(current) ? "selected" : ""}>${text}</option>`;
  }
  function controls() {
    const p = params[mode],
      s = states[mode];
    let html = "";
    if (mode === "gear") {
      html = `<div class="segmented" aria-label="传动方式">${[
        ["gear", "齿轮"],
        ["belt", "带传动"],
        ["chain", "链传动"],
      ]
        .map(
          ([k, t]) =>
            `<button data-kind="${k}" class="${p.kind === k ? "selected" : ""}">${t}</button>`,
        )
        .join("")}</div>`;
      html += `<div class="field"><div class="field-top"><label for="inputAxis">选择输入轴</label><output>${p.input || 1}<small>号轴</small></output></div><select id="inputAxis">${option(1, "1 号轴（左）输入 → 2 号轴输出", p.input || 1)}${option(2, "2 号轴（右）输入 → 1 号轴输出", p.input || 1)}</select></div>`;
      html += range("rpm", "输入轴转速", p.rpm, 0, 60, 1, "rpm");
      html += `<div class="field"><div class="field-top"><label for="ratio">${p.kind === "belt" ? "带轮直径组合" : "齿轮齿数组合"}</label><output>${M.transmission(p).ratio.toFixed(2)}<small>: 1</small></output></div><select id="ratio">${[20, 30, 40, 60].map((z) => option(z, p.kind === "belt" ? `1 号 / 2 号直径：1 : ${(z / 20).toFixed(1)}` : `1 号 ${p.z1} 齿 / 2 号 ${z} 齿`, p.z2)).join("")}</select></div>`;
      html += range("torque", "输入转矩", p.torque, 1, 30, 1, "N·m");
      html += `<div class="field-inline"><label><input type="checkbox" id="contact" ${showContact ? "checked" : ""}>显示${p.kind === "gear" ? "节圆与接触点" : "接触节线"}</label><button class="jog-btn" id="jogBtn">盘车 +15°</button></div><div class="segmented direction"><button data-rot="1" class="${p.direction === 1 ? "selected" : ""}">↶ 正向</button><button data-rot="-1" class="${p.direction === -1 ? "selected" : ""}">↷ 反向</button></div>`;
    } else {
      html = range(
        "flow",
        mode === "hyd" ? "泵供油流量" : "阀口额定供气能力",
        p.flow,
        mode === "hyd" ? 0.5 : 20,
        mode === "hyd" ? 8 : 300,
        mode === "hyd" ? 0.1 : 5,
        mode === "hyd" ? "L/min" : "NL/min",
      );
      html += range(
        "pressure",
        mode === "hyd" ? "溢流压力上限" : "气源表压",
        p.pressure,
        mode === "hyd" ? 0.5 : 0.1,
        mode === "hyd" ? 12 : 0.8,
        mode === "hyd" ? 0.1 : 0.01,
        "MPa",
      );
      html += range(
        "load",
        "双向阻力负载",
        p.load,
        0,
        mode === "hyd" ? 20000 : 1500,
        mode === "hyd" ? 100 : 10,
        "N",
      );
      html += `<div class="field"><div class="field-top"><label for="bore">缸径 / 活塞杆直径</label><output id="boreOut">${p.bore} / ${+(p.bore * (mode === "hyd" ? 0.5 : 0.4)).toFixed(1)}<small>mm</small></output></div><select id="bore">${(mode === "hyd" ? [40, 50, 63, 80] : [32, 40, 50, 63]).map((d) => option(d, `Ø${d} / Ø${+(d * (mode === "hyd" ? 0.5 : 0.4)).toFixed(1)} mm · 行程 200 mm`, p.bore)).join("")}</select></div>`;
      html += `<div class="segmented direction" aria-label="方向阀"><button data-command="1" class="${s.command === 1 ? "selected" : ""}">伸出 →</button><button data-command="0" class="${s.command === 0 ? "selected" : ""}">中位</button><button data-command="-1" class="${s.command === -1 ? "selected" : ""}">← 缩回</button></div><div class="field-inline"><label><input type="checkbox" id="auto" ${s.auto ? "checked" : ""}>自动往复</label><label><input type="checkbox" id="cut" ${cutaway ? "checked" : ""}>剖视</label></div>`;
    }
    $("#modeControls").innerHTML = html;
    for (const key of ["rpm", "torque", "flow", "pressure", "load"]) {
      const el = $("#" + key);
      if (el)
        el.addEventListener("input", () => {
          p[key] = Number(el.value);
          el.parentElement.querySelector("output").innerHTML =
            `${key === "pressure" ? p[key].toFixed(mode === "hyd" ? 1 : 2) : key === "flow" && mode === "hyd" ? p[key].toFixed(1) : p[key]}<small>${key === "rpm" ? "rpm" : key === "torque" ? "N·m" : key === "load" ? "N" : key === "pressure" ? "MPa" : mode === "hyd" ? "L/min" : "NL/min"}</small>`;
          refreshText();
        });
    }
    $$("[data-kind]").forEach(
      (el) =>
        (el.onclick = () => {
          p.kind = el.dataset.kind;
          reset();
          controls();
          build();
          refreshText();
        }),
    );
    $$("[data-rot]").forEach(
      (el) =>
        (el.onclick = () => {
          p.direction = Number(el.dataset.rot);
          controls();
        }),
    );
    if ($("#ratio"))
      $("#ratio").onchange = (e) => {
        p.z2 = Number(e.target.value);
        reset();
        controls();
        build();
        refreshText();
      };
    if ($("#inputAxis"))
      $("#inputAxis").onchange = (e) => {
        p.input = Number(e.target.value);
        build();
        controls();
        refreshText();
        updateReadout();
      };
    if ($("#jogBtn"))
      $("#jogBtn").onclick = () => (learning?.active ? learning.jog() : jog());
    if ($("#contact"))
      $("#contact").onchange = (e) => (showContact = e.target.checked);
    if ($("#bore"))
      $("#bore").onchange = (e) => {
        p.bore = Number(e.target.value);
        reset();
        controls();
        build();
        refreshText();
      };
    $$("[data-command]").forEach(
      (el) =>
        (el.onclick = () => {
          s.command = Number(el.dataset.command);
          s.auto = false;
          s.dwell = 0;
          controls();
        }),
    );
    if ($("#auto"))
      $("#auto").onchange = (e) => {
        s.auto = e.target.checked;
        if (s.auto && s.command === 0) s.command = s.x >= M.L ? -1 : 1;
        controls();
      };
    if ($("#cut"))
      $("#cut").onchange = (e) => {
        cutaway = e.target.checked;
        parts.shell.visible = cutaway;
        parts.full.visible = !cutaway;
      };
    learning?.lock();
  }
  function setMetrics(items) {
    $("#metrics").innerHTML = items
      .map(
        ([a, u, b]) =>
          `<div class="metric"><span class="caption">${a}</span><strong>—</strong><em>${u}</em><small>${b}</small></div>`,
      )
      .join("");
  }
  function refreshText() {
    const p = params[mode];
    $("#eyebrow").textContent = icons[mode];
    $("#modeCode").textContent =
      mode === "gear"
        ? "01 / TRANSMISSION"
        : mode === "hyd"
          ? "02 / HYDRAULIC"
          : "03 / PNEUMATIC";
    if (mode === "gear") {
      const k = p.kind;
      $("#sceneTitle").textContent =
        k === "gear"
          ? "让动力，传递起来。"
          : k === "belt"
            ? "以摩擦，连接两端。"
            : "环环相扣，同步传动。";
      $("#sceneSubtitle").textContent =
        k === "gear"
          ? "观察齿面啮合，理解转速与转矩的交换。"
          : k === "belt"
            ? "开式平带贴合带轮，接触弧上的摩擦传递动力。"
            : "滚子落入链齿齿槽，链节传递拉力。";
      $("#formula").textContent =
        k === "belt"
          ? "n入 d入 = n出 d出"
          : k === "gear"
            ? "n出 = −n入 × z入 / z出"
            : "n出 = n入 × z入 / z出";
      $("#principleText").textContent =
        k === "gear"
          ? "外啮合齿轮反向旋转。大齿轮转得更慢，输出转矩更大。"
          : k === "belt"
            ? "开式带传动同向旋转。此处采用无打滑模型，带速与两轮节线速度相同。"
            : "链轮与滚子啮合，同向旋转。节线近似展示平均速比，忽略多边形速度波动。";
      $("#legend").innerHTML =
        '<span><i style="background:#278673"></i>主动轮</span><span><i style="background:#899b9e"></i>从动轮</span><span><i style="background:#c4a15a"></i>接触 / 运动标记</span>';
      setMetrics([
        ["输入轴转速", "rpm", `${p.input || 1} 号轴 · 动力输入`],
        [
          "输出轴转速",
          "rpm",
          `${3 - (p.input || 1)} 号轴 · ${k === "gear" ? "外啮合反向" : "开式传动同向"}`,
        ],
        [
          "输出转矩",
          "N·m",
          `传动效率 ${k === "gear" ? 97 : k === "belt" ? 95 : 98}%`,
        ],
        [
          "传动比",
          " : 1",
          k === "belt" ? "输出 / 输入带轮直径" : "输出 / 输入齿数",
        ],
      ]);
      $("#chartTitle").textContent = "输入 / 输出转速幅值";
      $("#chartUnit").textContent = "rpm";
      $("#chartLegend").innerHTML =
        '<span><i style="background:#21846b"></i>主动轮</span><span><i style="background:#9cae99"></i>从动轮</span>';
    } else {
      const hyd = mode === "hyd";
      $("#sceneTitle").textContent = hyd
        ? "让油液，推动行程。"
        : "从压缩，到有力伸展。";
      $("#sceneSubtitle").textContent = hyd
        ? "流量决定速度；负载决定工作压力，溢流阀限制上限。"
        : "先充气建立压力，再以两腔压差推动活塞。";
      $("#formula").innerHTML = hyd
        ? "v = Q / A · F = p<sub>A</sub>A − p<sub>B</sub>B"
        : "p<sub>abs</sub>V = mRT · F = p<sub>A</sub>A − p<sub>B</sub>B";
      $("#principleText").textContent = hyd
        ? "伸出作用于整个活塞面积，缩回作用于环形面积；同一流量下，缩回更快、可用推力更小。"
        : "空气可以被压缩。阀口流量随压差变化，负载越大，起动所需压力越高。";
      $("#legend").innerHTML =
        `<span><i style="background:${hyd ? "#dcad51" : "#70accd"}"></i>${hyd ? "油液" : "压缩空气"}</span><span><i style="background:#b2c4c0"></i>${hyd ? "回油腔 / 回油管" : "排气侧"}</span><span><i style="background:#758e83"></i>双作用缸</span>`;
      setMetrics([
        ["活塞位移", "mm", "有效行程 200 mm"],
        [
          hyd ? "进入缸腔流量" : "实际进气流量",
          hyd ? "L/min" : "NL/min",
          hyd ? "受溢流与行程限制" : "折算至 20°C、1 atm",
        ],
        [
          hyd ? "累计进油量" : "累计进气量",
          hyd ? "mL" : "NL",
          hyd ? "进入 A/B 腔的总油量" : "含建压所需的空气量",
        ],
        ["活塞速度", "mm/s", "正：伸出 / 负：缩回"],
      ]);
      $("#chartTitle").textContent = "两腔压力";
      $("#chartUnit").textContent = "MPa · 表压";
      $("#chartLegend").innerHTML =
        `<span><i style="background:${hyd ? "#d8a63b" : "#4a9ac9"}"></i>A 无杆腔</span><span><i style="background:#9cae99"></i>B 有杆腔</span>`;
    }
    history = [];
  }
  function setMode(next) {
    learning?.onMode(next);
    mode = next;
    $$(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.mode === mode);
      el.setAttribute("aria-pressed", el.dataset.mode === mode);
    });
    controls();
    refreshText();
    build();
    updateReadout();
  }
  function reset() {
    states[mode] = M.create(mode, params[mode]);
    history = [];
    sample = 0;
    last = performance.now();
    controls();
    updateReadout();
  }
  function animateFlow(line, dir, rate, dt) {
    if (!line) return;
    const active = rate > 0.005;
    line.phase +=
      dt * dir * Math.min(3, 0.35 + Math.sqrt(Math.max(0, rate)) * 0.3);
    for (let i = 0; i < line.markers.length; i++) {
      const o = line.markers[i];
      o.visible = active;
      const t = (((i / line.markers.length + line.phase) % 1) + 1) % 1;
      o.position.copy(line.curve.getPointAt(t));
    }
  }
  function updateScene(dt, cameraDt = 0) {
    if (!renderer || !rig) return;
    const s = states[mode],
      p = params[mode];
    if (mode === "gear") {
      const direct = p.kind === "gear",
        chain = p.kind === "chain",
        th = s.theta;
      parts.wheels[0].rotation.z = th + (chain ? parts.path.angle : 0);
      parts.wheels[1].rotation.z =
        ((direct ? -1 : 1) * th * p.z1) / p.z2 +
        (direct
          ? Math.PI - Math.PI / p.z2
          : chain
            ? parts.path.angle + parts.path.line / parts.r2
            : 0);
      for (const o of parts.contacts) o.visible = showContact;
      if (parts.shafts)
        for (let i = 0; i < parts.shafts.length; i++)
          parts.shafts[i].rotation.z = parts.wheels[i].rotation.z;
      if (parts.contactBalls) {
        const pts = M.gearContacts(
          th,
          p.z1,
          p.z2,
          Math.sign(M.transmission(p).w1) || 1,
        );
        for (let i = 0; i < parts.contactBalls.length; i++) {
          const o = parts.contactBalls[i];
          o.visible = showContact && i < pts.length;
          if (pts[i])
            o.position.set(parts.x1 + pts[i].x, parts.y + pts[i].y, 0.51);
        }
      }
      if (parts.path) {
        const n = parts.markers.length;
        for (let i = 0; i < n; i++) {
          const at = parts.path.at((i / n) * parts.path.length - th * parts.r1),
            o = parts.markers[i];
          o.position.x = at.x;
          o.position.y = at.y;
          o.rotation.z = Math.atan2(at.ty, at.tx);
        }
      }
    } else {
      const hyd = mode === "hyd",
        a = M.areas(mode, p),
        px = -2.87 + (s.x / M.L) * 4,
        la = Math.max(0.001, px - 0.095 + 3.065),
        lb = Math.max(0.001, 1.325 - px - 0.095);
      parts.piston.position.set(px, parts.Y, 0);
      parts.fluidA.position.x = -3.065;
      parts.fluidA.scale.x = la;
      parts.fluidB.position.x = px + 0.095;
      parts.fluidB.scale.x = lb;
      parts.fluidA.visible = parts.fluidB.visible = cutaway;
      const active = s.command,
        ex = s.qout;
      if (active) {
        for (const [left, f] of [
          [true, parts.fluidA],
          [false, parts.fluidB],
        ]) {
          const supplied = left ? active > 0 : active < 0;
          f.material.color.set(
            supplied
              ? hyd
                ? "#e5b44c"
                : "#75b7d5"
              : hyd
                ? "#adc4c1"
                : "#becbd2",
          );
          f.material.opacity = supplied
            ? hyd
              ? 0.69
              : 0.28
            : hyd
              ? 0.28
              : 0.18;
        }
        parts.flowA.markers[0].material.color.set(
          active > 0 ? (hyd ? "#dfb359" : "#70b8d6") : "#a4bdb8",
        );
        parts.flowB.markers[0].material.color.set(
          active < 0 ? (hyd ? "#dfb359" : "#70b8d6") : "#a4bdb8",
        );
      }
      animateFlow(
        parts.flowA,
        active >= 0 ? 1 : -1,
        active === 0 ? 0 : active > 0 ? s.qin : ex,
        dt,
      );
      animateFlow(
        parts.flowB,
        active >= 0 ? -1 : 1,
        active === 0 ? 0 : active < 0 ? s.qin : ex,
        dt,
      );
      animateFlow(parts.flowP, 1, hyd ? p.flow : s.qin, dt);
      animateFlow(parts.flowT, 1, ex, dt);
      if (hyd) animateFlow(parts.relief, 1, Math.max(0, p.flow - s.qin), dt);
      parts.spool.position.x = -0.35 + active * 0.3;
      parts.gauge.rotation.z =
        Math.PI * 0.8 -
        M.clamp(Math.max(s.pA, s.pB) / (p.pressure * 1e6), 0, 1) *
          Math.PI *
          1.6;
      for (let i = 0; i < parts.interior.length; i++) {
        const o = parts.interior[i],
          left = i < 26,
          len = left ? la : lb,
          begin = left ? -3.065 : px + 0.095,
          seed = i % 26,
          angle = 2.0 + ((seed * 2.39996) % (TAU - 2.0)),
          rad =
            parts.R *
            ((left ? 0.2 : a.d / a.D + 0.08) +
              ((seed * 0.231) % (left ? 0.63 : 0.83 - a.d / a.D))),
          motion = hyd
            ? (s.x / M.L) * 2
            : s.t * (Math.abs(s.v) * 2 + 0.07) * (active >= 0 ? 1 : -1),
          phase = (((seed * 0.618 + motion) % 1) + 1) % 1;
        o.position.set(
          begin + phase * len,
          parts.Y + Math.cos(angle) * rad,
          Math.sin(angle) * rad,
        );
        o.visible = cutaway && len > 0.07;
      }
    }
    learning?.tick(dt, cameraDt);
    if (learning?.active?.kind === "assembly") rig.updateMatrixWorld(true);
    if (inspection && inspection.autoRotate)
      inspection.root.rotation.y += cameraDt * 0.5;
    moveCamera(cameraDt);
    nameLabels.update();
    renderer.render(scene, camera);
  }
  function updateReadout() {
    const s = states[mode],
      p = params[mode],
      els = $$(".metric strong");
    if (els.length !== 4) return;
    let values;
    if (mode === "gear") {
      const t = M.transmission(p),
        r = t.ratio,
        eta = t.eta;
      values = [
        String(t.nin),
        t.nout.toFixed(1),
        t.tout.toFixed(2),
        r.toFixed(2),
      ];
      $("#stateText").textContent =
        p.rpm === 0
          ? "输入轴停止"
          : p.kind === "gear"
            ? "外啮合 · 两轮反向"
            : p.kind === "belt"
              ? "开式带 · 两轮同向"
              : "链齿啮合 · 两轮同向";
      $("#stateDetail").textContent =
        `${t.input} 号轴输入 → ${t.output} 号轴输出 · 输入 ${t.pin.toFixed(1)} W / 输出 ${t.pout.toFixed(1)} W。${p.kind === "gear" ? `模数 2.5 mm，压力角 20°，中心距 ${((2.5 * (p.z1 + p.z2)) / 2).toFixed(1)} mm。` : p.kind === "belt" ? "采用无打滑的平带模型。" : "采用链传动平均速比。"}`;
    } else {
      values = [
        (s.x * 1000).toFixed(1),
        s.qin.toFixed(mode === "hyd" ? 2 : 1),
        (s.inlet * (mode === "hyd" ? 1000 : 1)).toFixed(mode === "hyd" ? 1 : 3),
        (s.v * 1000).toFixed(1),
      ];
      $("#stateText").textContent = s.status;
      const { A, B } = M.areas(mode, p);
      $("#stateDetail").textContent =
        `A ${(s.pA / 1e6).toFixed(2)} / B ${(s.pB / 1e6).toFixed(2)} MPa · 压差合力 ${s.force.toFixed(0)} N。${mode === "hyd" ? `回油 ${s.qout.toFixed(2)} L/min · 溢流 ${Math.max(0, p.flow - s.qin).toFixed(2)} L/min。` : `实际腔容积 A ${(A * (s.x + 0.005) * 1e6).toFixed(1)} / B ${(B * (M.L - s.x + 0.005) * 1e6).toFixed(1)} mL。`}`;
      $$("[data-command]").forEach((el) =>
        el.classList.toggle(
          "selected",
          Number(el.dataset.command) === s.command,
        ),
      );
    }
    values.forEach((v, i) => (els[i].textContent = v));
    const t = s.t;
    $("#clock").textContent = `${Math.floor(t / 60)
      .toString()
      .padStart(2, "0")}:${(t % 60).toFixed(1).padStart(4, "0")}`;
    document.body.classList.toggle("paused", !playing);
    $("#runningText").textContent = playing ? "模拟运行中" : "已暂停";
    $("#playBtn").innerHTML = playing
      ? "Ⅱ <span>暂停</span>"
      : "▶ <span>继续</span>";
    $("#stepBtn").disabled = !!inspection;
    if (inspection) {
      $("#runningText").textContent = "零件独立观察";
      $("#playBtn").innerHTML = inspection.autoRotate
        ? "Ⅱ <span>停止旋转</span>"
        : "▶ <span>自动旋转</span>";
    }
  }
  function chart() {
    const el = $("#chart"),
      ctx = el.getContext("2d"),
      w = el.clientWidth,
      h = el.clientHeight;
    if (!w || !h) return;
    const d = Math.min(devicePixelRatio, 2);
    if (el.width !== w * d || el.height !== h * d) {
      el.width = w * d;
      el.height = h * d;
    }
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = dark ? "#344a55" : "#edf1ea";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 5 + (i * (h - 10)) / 2);
      ctx.lineTo(w, 5 + (i * (h - 10)) / 2);
      ctx.stroke();
    }
    if (history.length < 2) return;
    const max =
      Math.max(
        mode === "gear" ? 10 : 0.05,
        ...history.flatMap((p) => p.map(Math.abs)),
      ) * 1.12;
    for (let j = 0; j < 2; j++) {
      ctx.strokeStyle =
        j === 1
          ? "#a3b59a"
          : mode === "air"
            ? dark
              ? "#83c4ef"
              : "#539fca"
            : mode === "hyd"
              ? dark
                ? "#efc46a"
                : "#d0a03e"
              : dark
                ? "#66d6b3"
                : "#21846b";
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      history.forEach((p, i) => {
        const x = (i / 149) * w,
          y = h - 6 - (p[j] / max) * (h - 12);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
  }
  function advance(dt) {
    if (inspection) return;
    M.step(states[mode], params[mode], dt);
    sample += dt;
    if (sample >= 0.05) {
      sample = 0;
      const s = states[mode],
        p = params[mode],
        t = mode === "gear" ? M.transmission(p) : null;
      history.push(
        mode === "gear"
          ? [Math.abs(t.nin), Math.abs(t.nout)]
          : [s.pA / 1e6, s.pB / 1e6],
      );
      if (history.length > 150) history.shift();
    }
  }
  let readoutTime = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const delta = playing && !document.hidden ? dt * speed : 0;
    if (delta) advance(delta);
    updateScene(delta, dt);
    readoutTime += dt;
    if (readoutTime > 0.07) {
      readoutTime = 0;
      updateReadout();
      chart();
    }
  }
  $$(".tab").forEach((el) => (el.onclick = () => setMode(el.dataset.mode)));
  function requestPlay(value) {
    if (value && inspection) leaveFocus(true, false);
    if (value && learning && !learning.canPlay()) return;
    playing = value;
    updateReadout();
  }
  function jog() {
    if (mode !== "gear" || inspection) return;
    playing = false;
    const p = params.gear;
    states.gear.theta +=
      ((p.input === 2 ? ((p.kind === "gear" ? -1 : 1) * p.z2) / p.z1 : 1) *
        Math.PI) /
      12;
    updateScene(0);
    updateReadout();
  }
  $("#playBtn").onclick = () =>
    inspection ? spinInspection() : requestPlay(!playing);
  $("#stepBtn").onclick = () => {
    if (inspection || (learning && !learning.canPlay())) return;
    playing = false;
    advance(0.1);
    updateScene(0.1);
    updateReadout();
    chart();
  };
  $("#resetBtn").onclick = () => (inspection ? home() : reset());
  $("#speed").oninput = (e) => {
    speed = Number(e.target.value);
    $("#speedOut").textContent = speed.toFixed(1) + "×";
  };
  $("#normalBtn").onclick = () => {
    speed = 1;
    $("#speed").value = 1;
    $("#speedOut").textContent = "1.0×";
  };
  function home() {
    if (inspection) {
      inspection.root.rotation.set(0, 0, 0);
      focusState.offset.set(0, 0, 0);
      focusState.manualZoom = null;
      focusState.reorient = true;
      return;
    }
    leaveFocus(false);
    cameraTween = null;
    yaw = 0.48;
    pitch = 0.43;
    zoom = 1;
    panX = panY = panZ = 0;
    resize();
  }
  $("#homeBtn").onclick = home;
  $("#isoBtn").onclick = home;
  $("#frontBtn").onclick = () => {
    cameraTween = null;
    yaw = 0;
    pitch = 0.025;
    if (focusState) focusState.reorient = false;
    else {
      panX = 0;
      panY = 0.35;
      panZ = 0;
      zoom = 1.08;
    }
    resize();
  };
  $("#fullBtn").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  $("#helpBtn").onclick = () => $("#helpDialog").showModal();
  $("#closeHelp").onclick = () => $("#helpDialog").close();
  $("#helpDialog").onclick = (e) => {
    if (e.target === $("#helpDialog")) {
      const r = e.target.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        e.target.close();
    }
  };
  document.addEventListener("keydown", (e) => {
    if (
      $("#helpDialog").open ||
      /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)
    )
      return;
    if (e.key === "Escape" && focusState) {
      leaveFocus();
      return;
    }
    if (
      document.activeElement.tagName === "BUTTON" &&
      (e.code === "Space" || e.key === "Enter")
    )
      return;
    if (e.code === "Space") {
      e.preventDefault();
      inspection ? spinInspection() : requestPlay(!playing);
    }
    if (e.key === "1" || e.key === "2" || e.key === "3")
      setMode(["gear", "hyd", "air"][Number(e.key) - 1]);
    if (e.key.toLowerCase() === "r") inspection ? home() : reset();
    if (e.key === "Home") {
      e.preventDefault();
      home();
    }
  });
  document.addEventListener(
    "visibilitychange",
    () => (last = performance.now()),
  );
  $("#themeBtn").onclick = () => setTheme(!dark);
  const focusBar = document.createElement("div");
  focusBar.id = "componentFocus";
  focusBar.className = "component-focus-bar";
  focusBar.hidden = true;
  focusBar.innerHTML =
    '<span><small>独立零件 · 可拖动旋转</small><strong id="focusName"></strong></span><button type="button" id="returnOverview" title="返回整体视图 (Esc)">↙ 返回整体</button>';
  $(".control-panel").insertBefore(focusBar, $(".panel-scroll"));
  $("#returnOverview").onclick = () => leaveFocus();
  $(".gesture").textContent = "点击名称独立查看 · 拖动旋转 · 滚轮缩放";
  learning = new LabLearning({
    get: () => ({
      mode,
      p: params[mode],
      s: states[mode],
      parts,
      registry,
      inspection,
    }),
    home,
    jog,
    sync: () => {
      controls();
      updateReadout();
    },
    isPlaying: () => playing,
    resumeWhole: () => leaveFocus(true, false),
    play: requestPlay,
    rpm: (value) => {
      params.gear.rpm = value;
      controls();
      updateReadout();
    },
    prepare: (device, id) => {
      if (inspection) leaveFocus(false);
      playing = false;
      Object.assign(params[device], M.defaults[device]);
      if (device === "gear") params.gear.rpm = 12;
      states[device] = M.create(device, params[device]);
      if (device === "hyd") {
        states.hyd.x = 0.1;
        states.hyd.auto = false;
        states.hyd.command = 0;
      }
      if (device === "air") states.air.auto = false;
      setMode(device);
      cameraTween = null;
      yaw = 0.48;
      pitch = 0.43;
      zoom = id === "assembly" ? 0.85 : 1;
      panX = panY = panZ = 0;
      resize();
    },
    command: (dir) => {
      if (inspection) leaveFocus(true, false);
      const s = states.hyd;
      s.command = dir;
      s.auto = false;
      s.dwell = 0;
      requestPlay(true);
      controls();
    },
    airLoad: (load, restart) => {
      if (inspection) leaveFocus(true, false);
      params.air.load = load;
      if (restart) {
        states.air = M.create("air", params.air);
        states.air.auto = false;
      }
      states.air.command = 1;
      requestPlay(true);
      controls();
    },
  });
  controls();
  refreshText();
  init();
  setTheme(dark);
  updateReadout();
  requestAnimationFrame(frame);
  window.MechanicsLab = {
    snapshot: () => ({
      mode,
      playing,
      speed,
      params: JSON.parse(JSON.stringify(params)),
      state: { ...states[mode] },
      transmission: mode === "gear" ? M.transmission(params.gear) : null,
      view: {
        zoom,
        center: target.toArray(),
        focused: focusState?.item.key ?? null,
        isolated: !!inspection,
        meshes: inspection?.meshes || 0,
        rigVisible: rig?.visible,
        autoRotate: inspection?.autoRotate || false,
      },
      components: Object.fromEntries(
        Object.entries(registry).map(([k, v]) => [k, v.length]),
      ),
      lesson: learning.active
        ? {
            kind: learning.active.kind,
            installed: [...learning.active.installed],
            evidence: JSON.parse(JSON.stringify(learning.active.evidence)),
            moves: learning.active.moves,
            connected: learning.active.connected,
          }
        : null,
      completed: Object.keys(learning.records),
      renderer: renderer?.info.render,
      history: history.length,
    }),
    switchMode: setMode,
    advance: (dt) => {
      advance(dt);
      updateScene(dt, dt);
      updateReadout();
    },
    pause: () => {
      playing = false;
      updateReadout();
    },
  };
})();
