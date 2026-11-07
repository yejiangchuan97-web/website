/* 课程首页三维舞台。八章主展品放在一个转台上，当前章转到正前方、放大并运行标志动作，其余缩小、褪色、静止。
 * 进入某章（#chapter-N）时镜头推近，主展品让到本章任务的位置，其余任务展品升起排成一排；返回时镜头拉远。
 * 本文件只管三维与拾取；文字、链接、路由在 app.js。 */
(() => {
  'use strict';
  const T = window.THREE, data = window.COURSE, E = window.HomeExhibits;
  const host = document.getElementById('scene');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer = null;
  try {
    if (T && E) {
      renderer = new T.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'});
      if (!renderer.getContext()) renderer = null;
    }
  } catch { renderer = null; }
  if (!renderer) { window.HomeStage = {webgl: false}; return; }

  const R = 6, COUNT = data.chapters.length, SLOT = 5.5, ARC = 26;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const inOut = x => { x = clamp(x, 0, 1); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const listeners = {};
  let dirty = true;
  const emit = (name, value) => (listeners[name] || []).forEach(fn => fn(value));

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);

  const scene = new T.Scene();
  scene.fog = new T.Fog(0xe9f1fa, 21, 44);
  const camera = new T.PerspectiveCamera(30, 1, .5, 900);
  const hemi = new T.HemisphereLight(0xffffff, 0x8aa2b8, 2.2); scene.add(hemi);
  const sun = new T.DirectionalLight(0xfff5e8, 2.7);
  sun.position.set(-9, 19, R + 11); sun.target.position.set(0, 0, R); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 4; sun.shadow.normalBias = .04; sun.shadow.bias = -.0003;
  Object.assign(sun.shadow.camera, {left: -16, right: 16, top: 12, bottom: -12, near: 4, far: 60});
  const fill = new T.DirectionalLight(0xc4ddff, .9); fill.position.set(12, 8, R - 8); scene.add(fill);

  /* 画布透明：背景（渐变、图纸网格、章节大数字）由页面绘制，三维里只留阴影、主展品脚下的光斑和转台上的刻度盘。 */
  const shadow = new T.Mesh(new T.PlaneGeometry(60, 40), new T.ShadowMaterial({opacity: .16}));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, -.005, R - 2); shadow.receiveShadow = true; shadow.renderOrder = 3; scene.add(shadow);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const glowTexture = new T.CanvasTexture(glowCanvas); glowTexture.colorSpace = T.SRGBColorSpace;
  const glow = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshBasicMaterial({map: glowTexture, transparent: true, depthWrite: false, toneMapped: false, fog: false}));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, -.01, R); glow.scale.setScalar(7.5); glow.renderOrder = 2; scene.add(glow);
  /* 刻度盘：画在转台地面上，跟着转台一起转。八个工位各有一道长刻度，展品就站在刻度圈上。 */
  const DIAL = R + 4.6, dialCanvas = document.createElement('canvas'); dialCanvas.width = dialCanvas.height = 2048;
  const dialTexture = new T.CanvasTexture(dialCanvas); dialTexture.colorSpace = T.SRGBColorSpace; dialTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const dial = new T.Mesh(new T.PlaneGeometry(DIAL * 2, DIAL * 2), new T.MeshBasicMaterial({map: dialTexture, transparent: true, depthWrite: false, toneMapped: false}));
  dial.rotation.x = -Math.PI / 2; dial.position.y = -.015; dial.renderOrder = 1;
  function paintDial() {
    const g = dialCanvas.getContext('2d'), size = dialCanvas.width, c = size / 2, k = c / DIAL, rgb = theme.dark ? '150,192,255' : '36,103,201';
    const ink = a => `rgba(${rgb},${a})`, circle = (r, a, w, dash) => { g.beginPath(); g.setLineDash(dash || []); g.arc(c, c, r * k, 0, Math.PI * 2); g.lineWidth = w; g.strokeStyle = ink(a); g.stroke(); g.setLineDash([]); };
    const tick = (angle, r0, r1, a, w) => { const sx = Math.sin(angle), cz = Math.cos(angle); g.beginPath(); g.moveTo(c + sx * r0 * k, c + cz * r0 * k); g.lineTo(c + sx * r1 * k, c + cz * r1 * k); g.lineWidth = w; g.strokeStyle = ink(a); g.stroke(); };
    g.clearRect(0, 0, size, size);
    const disc = g.createRadialGradient(c, c, (R - 3.4) * k, c, c, (R + 3.5) * k);
    disc.addColorStop(0, ink(0)); disc.addColorStop(.5, ink(theme.dark ? .07 : .045)); disc.addColorStop(1, ink(0));
    g.fillStyle = disc; g.beginPath(); g.arc(c, c, (R + 3.5) * k, 0, Math.PI * 2); g.fill();
    circle(R, .34, 3, [10, 14]); circle(R + 3.5, .3, 3); circle(R + 3.86, .14, 2); circle(R - 3.4, .2, 2.5); circle(1.1, .2, 2.5);
    for (let d = 0; d < 360; d += 3) { const major = d % 45 === 0, mid = d % 15 === 0; tick(d * Math.PI / 180, R + 3.5, R + 3.5 + (major ? .62 : mid ? .34 : .18), major ? .6 : mid ? .36 : .22, major ? 5 : 2.5); }
    for (let i = 0; i < COUNT; i++) { const a = i * Math.PI * 2 / COUNT; tick(a, 1.1, R - 3.4, .1, 2); tick(a, R - 3.4, R - 2.9, .5, 4); tick(a + Math.PI / COUNT, R - 3.4, R - 3.15, .26, 2.5); }
    tick(0, -.5, .5, .3, 2.5); tick(Math.PI / 2, -.5, .5, .3, 2.5);
    dialTexture.needsUpdate = true; dirty = true;
  }

  const theme = {dark: false, tint: '#6aa8e8', bg: new T.Color(), pedestal: new T.Color(), rim: new T.Color(), accent: new T.Color()};
  /* 主展品脚下的光斑带一点本章的颜色 */
  function paintGlow() {
    const dark = theme.dark, c = new T.Color(theme.tint), r = Math.round(c.r * 255), g0 = Math.round(c.g * 255), b = Math.round(c.b * 255);
    const g = glowCanvas.getContext('2d'), grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, dark ? `rgba(${r},${g0},${b},.36)` : 'rgba(255,255,255,.96)');
    grad.addColorStop(.42, dark ? `rgba(${r},${g0},${b},.16)` : `rgba(${r},${g0},${b},.20)`);
    grad.addColorStop(.75, dark ? `rgba(${r},${g0},${b},.05)` : `rgba(${r},${g0},${b},.07)`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.clearRect(0, 0, 256, 256); g.fillStyle = grad; g.fillRect(0, 0, 256, 256); glowTexture.needsUpdate = true; dirty = true;
  }
  function paintTheme(name) {
    const dark = name === 'dark'; theme.dark = dark;
    theme.bg.setHex(dark ? 0x0e1d30 : 0xe9f0f9);
    theme.pedestal.setHex(dark ? 0x2f4d6e : 0xffffff);
    theme.rim.setHex(dark ? 0x1d3651 : 0xd3e0ee);
    theme.accent.setHex(dark ? 0x8abaff : 0x2467c9);
    scene.fog.color.copy(theme.bg);
    hemi.intensity = dark ? 1.4 : 2.45; hemi.groundColor.setHex(dark ? 0x1b2c40 : 0x8aa2b8);
    sun.intensity = dark ? 2.1 : 2.7; fill.intensity = dark ? .6 : .9;
    renderer.toneMappingExposure = dark ? 1.02 : 1.2;
    shadow.material.opacity = dark ? .34 : .15;
    paintGlow(); paintDial();
    pedestals.forEach(p => { p.top.material.color.copy(theme.pedestal); p.side.material.color.copy(theme.rim); });
    islands.forEach(island => { island.applied = -1; });
    dirty = true;
  }

  /* 展台底座：两层圆台（下层灰蓝、上层白），上层边缘一圈本章颜色的细环，聚焦或悬停时变实。 */
  const pedestals = [];
  function pedestal(radius, tint) {
    const group = new T.Group();
    const side = new T.Mesh(new T.CylinderGeometry(radius, radius + .08, .24, 80), new T.MeshStandardMaterial({color: 0xcfdcea, roughness: .78}));
    side.position.y = -.12; side.receiveShadow = true; side.castShadow = false;
    const top = new T.Mesh(new T.CylinderGeometry(radius - .16, radius - .1, .08, 80), new T.MeshStandardMaterial({color: 0xfbfdff, roughness: .55}));
    top.position.y = .04; top.receiveShadow = true;
    const ring = new T.Mesh(new T.RingGeometry(radius - .1, radius - .02, 96), new T.MeshBasicMaterial({color: new T.Color(tint), transparent: true, opacity: .5, depthWrite: false}));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .004;
    group.add(side, top, ring);
    top.material.color.copy(theme.pedestal); side.material.color.copy(theme.rim);
    const p = {group, top, side, ring}; pedestals.push(p); return p;
  }

  /* 一件展品（主展品或任务展品）：先只放底座，模型排队、页面画出来以后再一件件建，建好时从台面上弹出。
   * 这样直接打开 #chapter-N（含从任务页返回）时，文字与任务卡片立刻可见，不等模型。 */
  const buildQueue = [], popping = [];
  let frames = 0;
  function exhibit(chapter, taskId, radius, urgent = false) {
    const base = pedestal(radius, E.chapters[chapter].tint), holder = new T.Group();
    holder.add(base.group);
    holder.userData.pick = {chapter, task: taskId};
    const item = {chapter, task: taskId, holder, base, step() {}, model: null, pop: 0, hover: 0, show: 0};
    if (urgent) buildQueue.unshift(item); else buildQueue.push(item);
    return item;
  }
  function load(item) {
    if (item.model) return item;
    const index = buildQueue.indexOf(item); if (index >= 0) buildQueue.splice(index, 1);
    const built = E.build(item.chapter, item.task);
    built.root.position.y = .08; built.root.scale.setScalar(reduce.matches ? 1 : .001);
    item.holder.add(built.root); item.model = built.root; item.step = built.step; item.pop = reduce.matches ? 1 : 0;
    if (!reduce.matches) popping.push(item);
    const island = islands[item.chapter - 1];
    if (island && item === island.hero) {
      built.root.traverse(o => { if (o.isMesh && o.material) [].concat(o.material).forEach(m => { if (m.color && !island.mats.some(x => x.m === m)) island.mats.push({m, base: m.color.clone()}); }); });
      island.applied = -1;
    }
    built.step(state.time); dirty = true;
    return item;
  }
  /* 需要的展品排到队首：当前章的主展品与任务展品优先 */
  function hurry(items) { for (const item of [...items].reverse()) { const i = buildQueue.indexOf(item); if (i > 0) { buildQueue.splice(i, 1); buildQueue.unshift(item); } } }

  const table = new T.Group(); scene.add(table); table.add(dial);
  const islands = data.chapters.map((chapter, i) => {
    const angle = i * Math.PI * 2 / COUNT, group = new T.Group();
    group.position.set(Math.sin(angle) * R, 0, Math.cos(angle) * R); group.rotation.y = angle;
    table.add(group);
    const spec = E.chapters[chapter.id];
    const hero = exhibit(chapter.id, spec.hero, 2.05);
    group.add(hero.holder);
    const mats = [];
    return {id: chapter.id, chapter, angle, group, hero, mats, w: chapter.id === 1 ? 1 : 0, applied: -1, away: 0, tasks: null, order: chapter.tasks.map(t => t.id)};
  });
  paintTheme(window.CourseTheme?.get?.() || 'light');
  window.CourseTheme?.register?.(paintTheme);

  /* 非聚焦展品褪色：颜色向灰度与背景色靠拢。 */
  const grey = new T.Color();
  function desaturate(island) {
    const k = (1 - island.w) * .34;
    if (Math.abs(k - island.applied) < .004) return;
    island.applied = k;
    for (const {m, base} of island.mats) {
      const l = base.r * .3 + base.g * .59 + base.b * .11;
      grey.setRGB(l, l, l).lerp(theme.bg, .3);
      m.color.copy(base).lerp(grey, k);
    }
  }

  /* 小图：离屏渲染器给展品拍一张透明底照片，供左侧目录与本章任务条使用；空闲时逐张拍，拍完缓存。 */
  let thumbRenderer = null;
  const thumbs = new Map(), queue = [], thumbScene = new T.Scene(), thumbCam = new T.PerspectiveCamera(24, 4 / 3, .1, 120);
  thumbScene.add(new T.HemisphereLight(0xffffff, 0x8aa2b8, 2.4));
  const thumbSun = new T.DirectionalLight(0xfff5e8, 2.5); thumbSun.position.set(-5, 9, 7); thumbScene.add(thumbSun);
  const thumbFill = new T.DirectionalLight(0xc4ddff, .9); thumbFill.position.set(7, 3, -4); thumbScene.add(thumbFill);
  function shoot(item, island) {
    if (!thumbRenderer) {
      try {
        thumbRenderer = new T.WebGLRenderer({antialias: true, alpha: true, preserveDrawingBuffer: true});
        thumbRenderer.setPixelRatio(1); thumbRenderer.setSize(320, 240, false); thumbRenderer.setClearColor(0, 0);
        thumbRenderer.outputColorSpace = T.SRGBColorSpace; thumbRenderer.toneMapping = T.ACESFilmicToneMapping; thumbRenderer.toneMappingExposure = 1.1;
      } catch { return null; }
    }
    load(item);
    const node = item.model, parent = node.parent, hero = item === island.hero, scale = node.scale.x;
    node.scale.setScalar(1);
    const saved = hero ? island.mats.map(x => x.m.color.clone()) : null;
    if (hero) island.mats.forEach(x => x.m.color.copy(x.base));
    thumbScene.add(node); node.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(node), center = bounds.getCenter(new T.Vector3()), size = bounds.getSize(new T.Vector3());
    const tanV = Math.tan(12 * Math.PI / 180), tanH = tanV * 4 / 3;
    const d = Math.max(size.y * 1.08 / 2 / tanV, Math.max(size.x, size.z) * .92 / 2 / tanH) + Math.max(size.x, size.z) / 2;
    thumbCam.position.set(center.x, center.y + d * Math.sin(.3), center.z + d * Math.cos(.3)); thumbCam.lookAt(center);
    thumbRenderer.render(thumbScene, thumbCam);
    const url = thumbRenderer.domElement.toDataURL('image/png');
    parent.add(node); node.scale.setScalar(scale);
    if (hero) island.mats.forEach((x, i) => x.m.color.copy(saved[i]));
    return url;
  }
  let pumping = false;
  function pump() {
    if (pumping) return; pumping = true;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 40));
    const run = () => { const job = queue.shift(); if (!job) { pumping = false; return; } job(); idle(run); };
    idle(run);
  }
  function thumb(chapter, task) {
    const island = islands[chapter - 1]; if (!island) return Promise.resolve(null);
    task = task || island.hero.task;
    const key = chapter + ':' + task;
    if (!thumbs.has(key)) thumbs.set(key, new Promise(resolve => {
      queue.push(() => { try { const item = task === island.hero.task ? island.hero : ensureTasks(island).find(i => i.task === task); resolve(item ? shoot(item, island) : null); } catch { resolve(null); } });
      pump();
    }));
    return thumbs.get(key);
  }

  /* 本章任务展品：第一次需要时再建（先建主展品，其余按需），按任务编号从左到右排成一道浅弧。 */
  function ensureTasks(island) {
    if (island.tasks) return island.tasks;
    island.tasks = island.order.map(id => {
      if (id === island.hero.task) return island.hero;
      const item = exhibit(island.id, id, 2.2); item.holder.visible = false; island.group.add(item.holder); return item;
    });
    arrange(island);
    return island.tasks;
  }

  /* 章节镜头里任务展品的摆法（只用左栏右侧的画幅）：主展品在前居中，其余沿身后一道弧排开；竖屏改为网格。 */
  function arrange(island) {
    const n = island.tasks.length, left = state?.layout.cover.left || 0, aspect = Math.max(200, width - left) / height;
    island.tasks.forEach(item => { item.slotScale = 1; item.slotYaw = 0; });
    if (aspect >= .9) {
      /* 和封面一样：主展品在前居中，其余沿身后一道弧排开（左右对称，整体居中） */
      island.mode = 'hero';
      const others = island.tasks.filter(item => item !== island.hero), k = others.length, span = k > 3 ? 1.35 : k === 3 ? 1.15 : .95;
      island.hero.slot = new T.Vector3(0, 0, 1.8); island.hero.slotScale = 1.2;
      others.forEach((item, j) => {
        const a = k === 1 ? .95 : -span + 2 * span * j / (k - 1);
        item.slot = new T.Vector3(6.3 * Math.sin(a), 0, -3.4 * Math.cos(a));
        item.slotYaw = -a * .35; item.slotScale = .82;
      });
      const xs = island.tasks.map(item => item.slot.x), mid = (Math.max(...xs) + Math.min(...xs)) / 2;
      island.tasks.forEach(item => { item.slot.x -= mid; });
      island.width = Math.max(...xs) - Math.min(...xs) + 5.2;
    } else {
      island.mode = 'grid';
      const cols = Math.min(n, aspect < .7 ? 2 : 3), rows = Math.ceil(n / cols);
      island.tasks.forEach((item, j) => {
        const row = Math.floor(j / cols), inRow = Math.min(cols, n - row * cols), x = (j % cols - (inRow - 1) / 2) * 4.8;
        item.slot = new T.Vector3(x, 0, -row * 5.4 + (rows - 1) * 2.7);
      });
      island.width = (cols - 1) * 4.8 + 5;
    }
    const zs = island.tasks.map(item => item.slot.z);
    island.zmid = (Math.max(...zs) + Math.min(...zs)) / 2;
  }

  /* 状态 */
  const state = {focus: 1, chapter: null, zoom: 0, zoomFrom: 0, zoomTo: 0, zoomStart: 0, zoomTime: 1150, arrive: 0, rot: 0, rotTarget: 0, hover: null, time: 1.4, paused: false, layout: {overview: {left: 0, top: 64, bottom: 220}, cover: {left: 0, top: 200, bottom: 130}}, viewW: 1};
  let resolveZoom = null, width = 1, height = 1;

  function focus(n, {instant = false} = {}) {
    const island = islands[n - 1]; if (!island) return;
    state.focus = n; theme.tint = E.chapters[n].tint; paintGlow(); hurry([island.hero]);
    state.rotTarget = state.rot + wrap(-island.angle - state.rot);
    if (instant || reduce.matches) state.rot = state.rotTarget;
    if (instant) islands.forEach(i => { i.w = i.id === n ? 1 : 0; });
    dirty = true; emit('focus', n);
  }
  function zoomTo(value, instant) {
    state.zoomFrom = state.zoom; state.zoomTo = value; state.zoomStart = performance.now();
    state.zoomTime = reduce.matches ? 1 : 1150;
    if (instant) { state.zoom = state.zoomFrom = value; }
    dirty = true;
    return new Promise(resolve => { if (instant || state.zoom === value) resolve(); else { resolveZoom?.(); resolveZoom = resolve; } });
  }
  function enter(n, {instant = false, arrive = false} = {}) {
    focus(n, {instant}); state.chapter = n; const tasks = ensureTasks(islands[n - 1]); hurry([islands[n - 1].hero, ...tasks]);
    state.arrive = arrive && !reduce.matches ? 1 : 0;
    return zoomTo(1, instant);
  }
  function leave({instant = false} = {}) { return zoomTo(0, instant).then(() => { if (state.zoomTo === 0) state.chapter = null; }); }

  /* 镜头：概览盯住主展品，进入后框住整排任务展品；画面避开上方标题与下方卡片区。 */
  const camOver = {pos: new T.Vector3(), target: new T.Vector3()}, camCover = {pos: new T.Vector3(), target: new T.Vector3()};
  const tmp = new T.Vector3();
  function frameCameras() {
    const vfov = camera.fov * Math.PI / 180, aspect = state.viewW / height, tanV = Math.tan(vfov / 2), tanH = tanV * aspect;
    const o = state.layout.overview, oz = Math.max(160, height - o.top - o.bottom);
    /* 概览：主展品在前、占画面主体，其余七章围在后面一圈，整圈都留在书名右侧的画幅里 */
    let d = Math.max(9.4 * height / (oz * 2 * tanV), (R + 1.6) / (1.0 * tanH) - R * .7);
    camOver.target.set(0, 1.7, R * .7);
    camOver.pos.set(0, 1.7 + Math.sin(.36) * d, R * .7 + Math.cos(.36) * d);
    const island = islands[(state.chapter || state.focus) - 1], c = state.layout.cover, cz = Math.max(160, height - c.top - c.bottom);
    const w = island.width || 10, zmid = island.zmid || 0, mode = island.mode || 'row';
    const tilt = {row: .36, hero: .46, grid: .62}[mode], tall = {row: 3.9, hero: 5.6, grid: 4.3}[mode];
    const dc = Math.max((w / 2) / tanH * 1.04 + 2.4, tall * height / (.9 * cz * 2 * tanV));
    camCover.target.set(0, mode === 'hero' ? 1.7 : 1.25, R + zmid);
    camCover.pos.set(0, camCover.target.y + Math.sin(tilt) * dc, R + zmid + Math.cos(tilt) * dc);
  }
  function resize() {
    width = host.clientWidth || innerWidth; height = host.clientHeight || innerHeight;
    renderer.setSize(width, height, false); camera.aspect = width / height; dirty = true;
    islands?.forEach(island => { if (island.tasks) arrange(island); });
  }
  new ResizeObserver(resize).observe(host); resize();

  /* 拾取：先打网格，再看展品在屏幕上的投影框（四周留 12px），整件展品都算可点区域。 */
  const ray = new T.Raycaster(), pointer = new T.Vector2(), box = new T.Box3();
  function candidates() {
    if (state.zoom > .5 && state.chapter) return ensureTasks(islands[state.chapter - 1]).filter(i => i.holder.visible);
    return islands.filter(i => i.group.visible && i.away < .5).map(i => i.hero);
  }
  function screenBox(item, modelOnly = false) {
    box.setFromObject(modelOnly && item.model ? item.model : item.holder);
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (let k = 0; k < 8; k++) {
      tmp.set(k & 1 ? box.max.x : box.min.x, k & 2 ? box.max.y : box.min.y, k & 4 ? box.max.z : box.min.z).project(camera);
      const x = (tmp.x + 1) / 2 * width, y = (1 - tmp.y) / 2 * height;
      l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y);
    }
    return {l, t, r, b};
  }
  function pick(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect(), x = clientX - rect.left, y = clientY - rect.top;
    pointer.set(x / rect.width * 2 - 1, -(y / rect.height) * 2 + 1); ray.setFromCamera(pointer, camera);
    const list = candidates();
    const hit = ray.intersectObjects(list.map(i => i.holder), true)[0];
    if (hit) { let o = hit.object; while (o && !o.userData.pick) o = o.parent; if (o) return list.find(i => i.holder === o) || null; }
    let best = null, bestD = Infinity;
    for (const item of list) {
      const s = screenBox(item);
      if (x < s.l - 12 || x > s.r + 12 || y < s.t - 12 || y > s.b + 12) continue;
      const dd = Math.hypot(x - (s.l + s.r) / 2, y - (s.t + s.b) / 2); if (dd < bestD) { bestD = dd; best = item; }
    }
    return best;
  }
  function setHover(item) {
    const key = item ? (state.zoom > .5 ? 'task:' + item.task : 'chapter:' + item.chapter) : null;
    if (key === state.hover) return;
    state.hover = key; renderer.domElement.style.cursor = item ? 'pointer' : '';
    emit('hover', item ? (state.zoom > .5 ? {task: item.task, chapter: item.chapter} : {chapter: item.chapter}) : null);
  }
  /* 概览：按住鼠标左右拖动转台，松手吸附到最近的一章；拖动中目录高亮跟着变。轻点仍是选择或进入。 */
  let down = null;
  const canvas = renderer.domElement, STEP = Math.PI * 2 / COUNT;
  const nearest = rot => ((Math.round(-rot / STEP) % COUNT) + COUNT) % COUNT + 1;
  canvas.addEventListener('pointerdown', e => {
    down = {x: e.clientX, y: e.clientY, rot: state.rot, drag: false, overview: state.zoom < .5};
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (down) {
      const dx = e.clientX - down.x;
      if (down.overview && (down.drag || Math.abs(dx) > 6)) {
        down.drag = true; canvas.style.cursor = 'grabbing'; setHover(null);
        state.rot = state.rotTarget = down.rot + dx * Math.PI * 2 / Math.max(600, state.viewW * 1.25);
        const n = nearest(state.rot);
        if (n !== state.focus) { state.focus = n; theme.tint = E.chapters[n].tint; paintGlow(); hurry([islands[n - 1].hero]); emit('focus', n); }
        dirty = true;
      }
      return;
    }
    const item = pick(e.clientX, e.clientY);
    setHover(item);
    if (!item) canvas.style.cursor = state.zoom < .5 ? 'grab' : '';
  });
  canvas.addEventListener('pointerleave', () => { if (!down) setHover(null); });
  canvas.addEventListener('pointerup', e => {
    if (!down) return;
    const {drag} = down, dx = e.clientX - down.x, dy = e.clientY - down.y; down = null;
    if (drag) { focus(nearest(state.rot)); canvas.style.cursor = 'grab'; return; }
    if (Math.hypot(dx, dy) > 8) return;
    const item = pick(e.clientX, e.clientY); if (!item) return;
    emit('pick', state.zoom > .5 ? {task: item.task, chapter: item.chapter} : {chapter: item.chapter});
  });
  canvas.addEventListener('pointercancel', () => { if (down?.drag) focus(nearest(state.rot)); down = null; });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); emit('lost'); });

  /* 每帧 */
  let last = performance.now(), frameId = 0;
  const ringFor = (item, value) => { item.base.ring.material.opacity = .45 + .55 * value; };
  function tick(now) {
    frameId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, .05); last = now;
    if (document.hidden) return;
    /* 前两帧只画文字与底座；之后每帧建模型，约 8 毫秒一批，至少一件；建好的模型 0.45 秒弹出 */
    if (++frames > 2 && buildQueue.length) { const t0 = performance.now(); do load(buildQueue[0]); while (buildQueue.length && performance.now() - t0 < 8); }
    for (let i = popping.length - 1; i >= 0; i--) {
      const item = popping[i]; item.pop = Math.min(1, item.pop + dt / .45);
      const u = item.pop - 1, back = 1 + 2.2 * u * u * u + 1.2 * u * u;
      item.model.scale.setScalar(Math.max(.001, back)); dirty = true;
      if (item.pop >= 1) { item.model.scale.setScalar(1); popping.splice(i, 1); }
    }
    const motion = !reduce.matches && !state.paused;
    if (motion) state.time += dt;

    /* 转台与聚焦权重 */
    const k = reduce.matches ? 1 : 1 - Math.exp(-dt * 4.2);
    if (Math.abs(state.rotTarget - state.rot) > 1e-4) { state.rot += (state.rotTarget - state.rot) * k; dirty = true; } else state.rot = state.rotTarget;
    table.rotation.y = state.rot;
    if (state.zoom !== state.zoomTo) {
      const u = clamp((now - state.zoomStart) / state.zoomTime, 0, 1);
      state.zoom = state.zoomFrom + (state.zoomTo - state.zoomFrom) * inOut(u);
      if (u >= 1) { state.zoom = state.zoomTo; resolveZoom?.(); resolveZoom = null; }
      dirty = true;
    }
    if (state.arrive > 0) { state.arrive = Math.max(0, state.arrive - dt / 1.1); dirty = true; }
    const z = state.zoom, ez = inOut(z), active = state.chapter || state.focus;
    const hoverChapter = state.hover?.startsWith('chapter:') ? Number(state.hover.slice(8)) : null;
    const hoverTask = state.hover?.startsWith('task:') ? state.hover.slice(5) : null;
    const fw = reduce.matches ? 1 : 1 - Math.exp(-dt * 5.5);
    for (const island of islands) {
      const target = island.id === state.focus ? 1 : island.id === hoverChapter ? .35 : 0;
      if (Math.abs(target - island.w) > 1e-3) { island.w += (target - island.w) * fw; dirty = true; } else island.w = target;
      island.away = island.id === active ? 0 : z;
      /* 概览时书名压在画面左侧：转到书名下面的展品淡出，不和文字叠在一起（用上一帧的镜头投影） */
      let page = 1;
      if (island.id !== state.focus && state.layout.overview.left > 0) {
        island.group.getWorldPosition(tmp).project(camera);
        page = smooth(((tmp.x + 1) / 2 * width - state.layout.overview.left * (1 - ez) + 10) / 150);
      }
      island.page = page;
      const s = (.58 + .82 * smooth(island.w) * (1 - .3 * ez)) * (1 - .9 * smooth(island.away)) * page;
      island.group.scale.setScalar(Math.max(.001, s));
      island.group.position.y = -2.4 * smooth(island.away);
      island.group.visible = island.away < .98;
      desaturate(island);
      const hero = island.hero, lift = island.id === hoverChapter && island.id === state.focus && z < .5 ? 1 : 0;
      hero.hover += (lift - hero.hover) * fw;
      ringFor(hero, Math.max(smooth(island.w) * (1 - ez) * .55, hero.hover * .9));
    }

    /* 进入本章：主展品移到自己的位置，其余任务展品升起 */
    const island = islands[active - 1];
    if (island.tasks) {
      for (const item of island.tasks) {
        const isHero = item === island.hero, show = isHero ? 1 : smooth((ez - .25) / .75);
        item.show = show;
        const hov = item.task === hoverTask ? 1 : 0;
        item.hover += (hov - item.hover) * fw;
        item.holder.visible = isHero || show > .001;
        item.holder.position.set(item.slot.x * ez, -1.6 * (1 - show) + .28 * item.hover, item.slot.z * ez);
        item.holder.rotation.y = item.slotYaw * ez;
        item.holder.scale.setScalar(Math.max(.001, (isHero ? 1 + (item.slotScale - 1) * ez : show * item.slotScale) * (1 + .1 * item.hover)));
        if (!isHero) ringFor(item, item.hover * .9);
        else if (ez > .5) ringFor(item, item.hover * .9);
      }
    }
    for (const other of islands) if (other !== island && other.tasks) for (const item of other.tasks) if (item !== other.hero) item.holder.visible = false;

    /* 动作：概览只动当前主展品；进入后本章展品一起动 */
    if (motion || dirty) {
      const t = state.time;
      if (z < .5 || !island.tasks) islands.forEach(i => { if (i.w > .6) i.hero.step(t); });
      if (island.tasks && ez > .02) island.tasks.forEach(item => item.step(t));
    }
    glow.scale.set(7.5 + 9 * ez, 7.5 + 2 * ez, 1);
    dial.material.opacity = 1 - .72 * ez;

    /* 镜头：概览只用书名右侧的区域（虚拟画幅），进入章节后铺满整屏 */
    const o = state.layout.overview, c = state.layout.cover;
    const viewLeft = o.left + (c.left - o.left) * ez;
    state.viewW = Math.max(200, width - viewLeft);
    const viewShift = ((o.top + (c.top - o.top) * ez) - (o.bottom + (c.bottom - o.bottom) * ez)) / 2;
    camera.aspect = state.viewW / height;
    frameCameras();
    camera.position.lerpVectors(camOver.pos, camCover.pos, ez);
    tmp.lerpVectors(camOver.target, camCover.target, ez);
    if (state.arrive > 0) camera.position.lerp(tmp, .2 * smooth(state.arrive));
    camera.lookAt(tmp);
    const reach = camera.position.distanceTo(tmp);
    scene.fog.near = reach + 4 - 2 * ez; scene.fog.far = reach + 40 - 14 * ez;
    camera.setViewOffset(state.viewW, height, -viewLeft, -viewShift, width, height);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    dirty = false;
    emit('frame', state);
  }
  frameId = requestAnimationFrame(tick);
  addEventListener('pagehide', () => cancelAnimationFrame(frameId));
  addEventListener('pageshow', e => { if (e.persisted) { last = performance.now(); frameId = requestAnimationFrame(tick); } });

  /* 屏幕坐标：任务展品底座前沿（放名称）与模型顶部 */
  function anchor(item) {
    tmp.set(0, 0, 2.35); item.holder.localToWorld(tmp); tmp.project(camera);
    return {x: (tmp.x + 1) / 2 * width, y: (1 - tmp.y) / 2 * height, visible: item.holder.visible && item.show > .6};
  }

  window.HomeStage = {
    webgl: true, focus, enter, leave, thumb,
    on(name, fn) { (listeners[name] ||= []).push(fn); },
    layout(value) { Object.assign(state.layout, value); islands.forEach(island => { if (island.tasks) arrange(island); }); dirty = true; },
    hover(target) {
      if (!target) return setHover(null);
      const island = islands[target.chapter - 1];
      if (target.task) { const item = ensureTasks(island).find(i => i.task === target.task); setHover(item || null); }
      else setHover(island.hero);
    },
    pause(value) { state.paused = Boolean(value); },
    prefetch(n) { const island = islands[n - 1]; if (island && !island.tasks) ensureTasks(island); },
    anchors() {
      const island = state.chapter && islands[state.chapter - 1];
      if (!island?.tasks) return [];
      return island.tasks.map(item => ({task: item.task, ...anchor(item)}));
    },
    /* 概览里每章展品的编号牌位置：底座朝镜头一侧的边缘 */
    marks() {
      const fade = 1 - smooth(state.zoom * 2.5), front = screenBox(islands[state.focus - 1].hero, true);
      return islands.map(island => {
        island.group.getWorldPosition(tmp);
        const s = island.group.scale.x, dx = camera.position.x - tmp.x, dz = camera.position.z - tmp.z, len = Math.hypot(dx, dz) || 1;
        tmp.x += dx / len * 2.2 * s; tmp.z += dz / len * 2.2 * s; tmp.project(camera);
        const x = (tmp.x + 1) / 2 * width, y = (1 - tmp.y) / 2 * height;
        /* 被当前主展品挡住的编号牌先收起来，不压在主展品身上 */
        const hidden = island.id !== state.focus && x > front.l - 30 && x < front.r + 30 && y > front.t - 16 && y < front.b + 16;
        island.mark = (island.mark ?? 1) + ((hidden ? 0 : 1) - (island.mark ?? 1)) * .18;
        return {chapter: island.id, x, y, alpha: fade * (island.page ?? 1) * island.mark, scale: s};
      });
    },
    state: () => ({focus: state.focus, chapter: state.chapter, zoom: Number(state.zoom.toFixed(3)), rotating: Math.abs(state.rotTarget - state.rot) > .01, camera: camera.position.toArray().map(v => Number(v.toFixed(2))), size: [width, height], calls: renderer.info.render.calls, time: state.time, built: islands.filter(i => i.tasks).map(i => i.id), reducedMotion: reduce.matches, pending: buildQueue.length}),
    /* 每件展品返回一个真正点得到它的屏幕点（被前面的展品挡住时，在它的投影框里找露出来的地方） */
    targets() {
      const rect = renderer.domElement.getBoundingClientRect();
      return candidates().map(item => {
        const s = screenBox(item); let x = (s.l + s.r) / 2, y = (s.t + s.b) / 2;
        if (pick(rect.left + x, rect.top + y) !== item) {
          search: for (let gy = .2; gy <= .85; gy += .13) for (let gx = .5, k = 0; k < 7; k++, gx = .5 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * .12) {
            const px = s.l + (s.r - s.l) * gx, py = s.t + (s.b - s.t) * gy;
            if (pick(rect.left + px, rect.top + py) === item) { x = px; y = py; break search; }
          }
        }
        return {chapter: item.chapter, task: item.task, x: rect.left + x, y: rect.top + y};
      });
    }
  };
})();
