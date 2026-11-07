/* 砂浆机械工位：在同一个三维教学台上加一台倾翻式滚筒砂浆搅拌机、一辆灰车和砌筑位的灰槽。
 * 沿用 MasonryScene 的材质、灯光、毫米尺度和取景方式；只在 mode === 'mortar' 时显示。
 * 机器外形是教学用的共性结构，不对应任何品牌型号。
 */
(() => {
  const P = MasonryScene.prototype;
  const MIXER = {x: -700, pivotZ: 780};          // 滚筒倾翻轴
  const CART_X = [-420, 520];                     // 灰车：出料口下 → 砌筑位
  const lerp = (a, b, t) => a + (b - a) * t;

  const baseSetMode = P.setMode, baseSetTheme = P.setTheme;
  P.setMode = function (mode) {
    if (mode !== 'mortar') { if (this.mortarRoot) this.mortarRoot.visible = false; return baseSetMode.call(this, mode); }
    this.ensureMortar();
    const changed = this.mode !== 'mortar';
    this.mode = 'mortar'; this.manualRoot.visible = false; this.robotRoot.visible = false; this.mortarRoot.visible = true;
    if (changed) this.resetView(); else this.draw();
  };
  P.setTheme = function (dark) { baseSetTheme.call(this, dark); if (this.mortarMat) { this.mortarColors(); this.draw(); } };

  P.mortarColors = function () {
    const d = this.dark, m = this.mortarMat;
    m.sand.color.setHex(d ? 0x8f8469 : 0xcbbd98);
    m.cement.color.setHex(d ? 0x6f777e : 0x9ba2a7);
    m.water.color.setHex(d ? 0x4f7fb8 : 0x7fa9da);
    m.drum.color.setHex(d ? 0x7d91a6 : 0x9fb1c3);
    this.mortarBase = {mix: new THREE.Color(d ? 0x5f6c78 : 0xa5adb3), sand: m.sand.color.clone(), cement: m.cement.color.clone(), water: m.water.color.clone()};
    if (this.mortarState) this.updateMortar(this.mortarState, true);
  };

  P.ensureMortar = function () {
    if (this.mortarRoot) return;
    const std = (o = {}) => new THREE.MeshStandardMaterial({roughness: .8, metalness: 0, ...o});
    this.mortarMat = {
      sand: std({roughness: .95}), cement: std({roughness: .9}), water: std({roughness: .2, transparent: true, opacity: .8}),
      drum: std({roughness: .45, metalness: .18, side: THREE.DoubleSide}),
      batch: std({roughness: .7}), cartLoad: std({roughness: .7}), trayLoad: std({roughness: .7}), stream: std({roughness: .6}),
      lamp: std({roughness: .4, emissive: 0x000000}),
    };
    // 新材质也登记到 this.mat，跟随 dispose
    for (const k of Object.keys(this.mortarMat)) this.mat['m_' + k] = this.mortarMat[k];
    const r = this.mortarRoot = this.group(this.scene, 'mortar-station');
    r.visible = false;
    const M = k => 'm_' + k;

    /* 教学台面（与机器人工作台同一做法） */
    // 不再画实验台底板：搅拌机、灰车和墙都放在现场地面上（地面由 MasonryScene 统一铺）

    /* 搅拌机：底架、轮子、支腿、拖杆 */
    const mx = MIXER.x;
    for (const y of [-400, 400]) this.box(900, 60, 70, mx, y, 330, 'mid', r, 'mixer-frame', 4);
    for (const x of [mx - 420, mx - 120]) this.box(60, 860, 60, x, 0, 335, 'lo', r, 'mixer-crossbar', 3);
    this.cyl(25, 1000, mx + 140, -500, 170, 'steel', r, 'axle', 'y');
    for (const y of [-470, 470]) {
      this.cyl(170, 70, mx + 140, y - 35, 170, 'rubber', r, 'mixer-wheel', 'y', 40);
      this.cyl(80, 80, mx + 140, y - 40, 170, 'mid', r, 'mixer-hub', 'y', 24);
      this.box(50, 50, 170, mx + 140, y > 0 ? 400 : -400, 170, 'lo', r, 'axle-bracket', 2);
    }
    for (const y of [-400, 400]) { this.box(60, 60, 330, mx - 400, y, 0, 'lo', r, 'stand-leg', 3); this.box(130, 110, 12, mx - 400, y, 0, 'mid', r, 'stand-foot', 3); }
    this.box(340, 50, 50, mx - 610, 0, 345, 'lo', r, 'tow-bar', 3); this.cyl(36, 50, mx - 790, -25, 370, 'steel', r, 'tow-eye', 'y', 20);
    /* 倾翻支架与手轮 */
    for (const y of [-400, 400]) { this.box(80, 70, 430, mx, y, 400, 'mid', r, 'yoke-post', 4); this.cyl(55, 40, mx, y > 0 ? 435 : -475, MIXER.pivotZ, 'steel', r, 'trunnion', 'y', 28); }
    this.handwheel = this.group(r, 'tilt-handwheel'); this.handwheel.position.set(mx, 520, MIXER.pivotZ);
    const ring = new THREE.Mesh(this.geo('m-handwheel', () => new THREE.TorusGeometry(120, 10, 10, 40).rotateX(Math.PI / 2)), this.mat.steel); ring.castShadow = true; this.handwheel.add(ring);
    for (let i = 0; i < 4; i++) { const s = this.box(8, 8, 240, 0, 0, -120, 'steel', this.handwheel, 'spoke', 0); s.rotation.y = i * Math.PI / 4; s.position.set(0, 0, 0); s.geometry = this.geo('m-spoke', () => new THREE.BoxGeometry(8, 8, 240)); }
    this.cyl(30, 60, 0, -30, 0, 'lo', this.handwheel, 'handwheel-hub', 'y', 20);
    this.cyl(9, 70, 0, 0, 120, 'lo', this.handwheel, 'handwheel-grip', 'y', 12);
    /* 电机箱与开关 */
    this.box(300, 240, 20, mx - 220, -530, 380, 'mid', r, 'motor-shelf', 3);
    this.box(260, 200, 220, mx - 220, -540, 400, 'lo', r, 'motor-housing', 6);
    for (let i = 0; i < 5; i++) this.box(200, 6, 4, mx - 220, -642, 450 + i * 32, 'mid', r, 'vent', 0);
    this.box(90, 60, 130, mx + 300, -440, 430, 'mid', r, 'switch-box', 4);
    this.lamp = this.cyl(16, 10, mx + 300, -475, 520, M('lamp'), r, 'run-lamp', 'y', 20);
    this.cyl(22, 12, mx + 300, -478, 470, 'lo', r, 'switch', 'y', 20);

    /* 倾翻组 → 旋转组（滚筒） */
    this.tiltGroup = this.group(r, 'drum-tilt'); this.tiltGroup.position.set(mx, 0, MIXER.pivotZ);
    this.box(80, 760, 70, 0, 0, -330, 'mid', this.tiltGroup, 'drum-cradle', 4);
    this.cyl(70, 140, 0, 0, -400, 'lo', this.tiltGroup, 'drum-bearing', 'z', 28);
    this.spinGroup = this.group(this.tiltGroup, 'drum-spin');
    const profile = [[0, -330], [250, -330], [320, -240], [342, -70], [342, 40], [300, 200], [205, 330], [190, 372], [176, 372]].map(([x, y]) => new THREE.Vector2(x, y));
    const drum = new THREE.Mesh(this.geo('m-drum', () => new THREE.LatheGeometry(profile, 48).rotateX(Math.PI / 2)), this.mortarMat.drum);
    drum.castShadow = true; drum.receiveShadow = true; drum.name = 'mixing-drum'; this.spinGroup.add(drum); this.partCount++;
    const gear = new THREE.Mesh(this.geo('m-gear', () => new THREE.TorusGeometry(350, 14, 8, 64)), this.mat.steel); gear.position.z = -20; gear.castShadow = true; this.spinGroup.add(gear);
    for (let i = 0; i < 40; i++) { const g = this.group(this.spinGroup); g.rotation.z = i / 40 * Math.PI * 2; this.box(12, 14, 26, 362, 0, -33, 'steel', g, 'gear-tooth', 0); }
    for (let i = 0; i < 6; i++) { const g = this.group(this.spinGroup); g.rotation.z = i / 6 * Math.PI * 2 + .2; this.box(14, 46, 150, 339, 0, 60, 'lo', g, 'drum-rib', 2); this.box(14, 46, 120, 332, 0, -220, 'lo', g, 'drum-rib', 2); }
    const lip = new THREE.Mesh(this.geo('m-lip', () => new THREE.TorusGeometry(186, 10, 8, 48)), this.mat.steel); lip.position.z = 372; this.spinGroup.add(lip);
    /* 滚筒里的料：砂、水泥、水分层，拌匀后变成同一种砂浆色 */
    this.batch = this.group(this.tiltGroup, 'drum-batch');
    this.batchLayers = ['sand', 'cement', 'water'].map(k => {
      const q = new THREE.Mesh(this.geo('m-layer', () => new THREE.CylinderGeometry(240, 240, 1, 40).rotateX(Math.PI / 2).translate(0, 0, .5)), this.mortarMat[k].clone());
      q.userData.kind = k; q.receiveShadow = true; this.batch.add(q); return q;
    });
    this.lumps = this.group(this.spinGroup, 'lumps');
    for (let i = 0; i < 7; i++) { const g = this.group(this.lumps); g.rotation.z = i / 7 * Math.PI * 2; const q = this.box(70 + (i % 3) * 20, 50, 34, 120 + (i % 2) * 90, 0, 0, M('sand'), g, 'lump', 8); q.userData.lump = true; }
    /* 出料流 */
    this.stream = new THREE.Mesh(this.geo('m-stream', () => new THREE.CylinderGeometry(30, 22, 1, 16).rotateX(Math.PI / 2).translate(0, 0, -.5)), this.mortarMat.stream);
    this.stream.visible = false; r.add(this.stream);

    /* 灰车 */
    this.cart = this.group(r, 'mortar-cart');
    const c = this.cart;
    this.box(460, 440, 20, 0, 0, 200, 'mid', c, 'cart-tub-floor', 3);
    for (const y of [-220, 220]) this.box(480, 18, 180, 0, y, 200, 'mid', c, 'cart-tub-side', 2);
    for (const x of [-235, 235]) this.box(18, 440, 180, x, 0, 200, 'mid', c, 'cart-tub-end', 2);
    for (const y of [-225, 225]) this.box(490, 26, 12, 0, y, 380, 'hi', c, 'cart-rim', 2);
    this.box(60, 560, 40, 30, 0, 160, 'lo', c, 'cart-axle-beam', 3);
    for (const y of [-290, 290]) { this.cyl(120, 50, 30, y - 25, 120, 'rubber', c, 'cart-wheel', 'y', 32); this.cyl(48, 56, 30, y - 28, 120, 'mid', c, 'cart-hub', 'y', 20); }
    for (const y of [-180, 180]) { this.box(30, 30, 200, -200, y, 0, 'lo', c, 'cart-leg', 2); this.box(330, 30, 30, 390, y, 330, 'lo', c, 'cart-handle', 2); }
    this.cyl(18, 420, 560, -210, 345, 'rubber', c, 'cart-grip', 'y', 16);
    this.cartLoad = this.box(440, 400, 1, 0, 0, 220, M('cartLoad'), c, 'cart-load', 0);

    /* 砌筑位：两皮墙、灰槽、备砖、铭牌 */
    const wy = 330, wall = [];
    for (const x of [760, 1010, 1260]) wall.push({x, z: 10, w: 240});
    for (const [x, w] of [[760, 115], [885, 240], [1135, 240], [1385, 115]]) wall.push({x, z: 73, w});
    for (const z of [0, 63]) this.box(740, 115, 10, 1130, wy, z, 'mortar', r, 'wall-bed', 0);
    for (const b of wall) this.box(b.w, 115, 53, b.x + b.w / 2, wy, b.z, 'brick', r, 'wall-brick', 1.1);
    const tx = 1060, ty = -110;
    this.box(440, 280, 8, tx, ty, 0, 'lo', r, 'mortar-trough');
    for (const y of [ty - 136, ty + 136]) this.box(440, 8, 120, tx, y, 8, 'mid', r, 'trough-side', 1);
    for (const x of [tx - 216, tx + 216]) this.box(8, 264, 120, x, ty, 8, 'mid', r, 'trough-end', 1);
    this.trayLoad = this.box(424, 264, 1, tx, ty, 8, M('trayLoad'), r, 'trough-load', 0);
    this.box(100, 55, 3, tx + 120, ty + 40, 132, 'steel', r, 'trowel'); this.box(14, 55, 17, tx + 182, ty + 40, 128, 'lo', r, 'trowel-handle', 3);
    for (let i = 0; i < 4; i++) this.box(240, 115, 53, 1340, -470 + (i % 2) * 125, Math.floor(i / 2) * 53, 'brick', r, 'spare-brick');
    const label = (text, x, y, w) => {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 104; const g = cv.getContext('2d');
      g.fillStyle = '#e2e7ed'; g.fillRect(0, 0, 640, 104); g.fillStyle = '#30475e'; g.font = '600 51px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 320, 52);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({map: tex, polygonOffset: true, polygonOffsetFactor: -1});
      (this.mortarLabels ||= []).push(mat);
      this.box(w + 4, 30, 1.5, x, y, 0, 'hi', r, 'label-plate', 1);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 104 / 640), mat); face.position.set(x, y, 1.6); r.add(face);
    };
    label('出料位', CART_X[0], -560, 160); label('砌筑位', CART_X[1] + 520, -560, 160);
    for (let i = 0; i <= 18; i++) this.box(i % 6 === 0 ? 3 : 1.5, i % 6 === 0 ? 16 : 9, .5, lerp(CART_X[0], CART_X[1] + 520, i / 18), -600, 0, 'lo', r, 'route-tick', 0);
    this.box(CART_X[1] + 520 - CART_X[0], 3, .5, (CART_X[0] + CART_X[1] + 520) / 2, -600, 0, 'lo', r, 'route-line', 0);

    this.mortarColors();
    // 取景：滚筒倾翻全程 + 灰车两个停位，事先算好，动画中不再改变取景
    const pts = new Map();
    for (const [tilt, pos] of [[0, 0], [1, 0], [0, 1], [.5, .5]]) {
      this.poseMortar({tilt: tilt * 90, cart: {pos}, spin: 0});
      for (const p of this.pointsOf(r, true)) pts.set(p.map(v => Math.round(v)).join(','), p);
    }
    this.mortarFramePoints = [...pts.values()];
    const box = new THREE.Box3(); for (const p of this.mortarFramePoints) box.expandByPoint(new THREE.Vector3(...p)); box.min.z = 0;
    this.mortarBounds = box;
    this.poseMortar({tilt: 0, cart: {pos: 0}, spin: 0});
  };

  /** 只改姿态：滚筒倾翻角、灰车位置、滚筒转角。tilt 为 0～90°（0 = 搅拌位，开口斜向上）。 */
  P.poseMortar = function ({tilt = 0, cart = {pos: 0}, spin = 0}) {
    const a = (35 + tilt) * Math.PI / 180;
    this.tiltGroup.rotation.y = a;
    this.handwheel.rotation.y = -tilt * Math.PI / 45;
    this.spinGroup.rotation.z = spin;
    this.cart.position.x = lerp(CART_X[0], CART_X[1], cart.pos);
  };

  /** 根据砂浆模型的状态更新画面。s 来自 MortarModel（另带 spin 转角）。 */
  P.updateMortar = function (s, quiet) {
    this.ensureMortar();
    this.mortarState = s;
    this.poseMortar(s);
    const B = this.mortarBase, u = s.uniformity, tot = s.sand + s.cement + s.water;
    // 滚筒内分层：每份料 22 mm 高；越拌越接近同一颜色
    let z = -325;
    const mixColor = B.mix.clone().offsetHSL(0, 0, s.consistency === 'wet' ? -.06 : s.consistency === 'dry' ? .06 : 0);
    const pouring = s.tilt > 25;
    for (const q of this.batchLayers) {
      const k = q.userData.kind, h = s[k] * 22;
      q.visible = h > .5 && !pouring; q.scale.z = Math.max(h, .01); q.position.z = z; z += h;
      q.material.color.copy(B[k]).lerp(mixColor, k === 'water' ? Math.min(1, u * 1.6) : u);
      q.material.opacity = k === 'water' ? lerp(.8, 1, u) : 1; q.material.transparent = k === 'water' && u < 1;
    }
    this.lumps.position.z = z + 4;
    this.lumps.visible = tot > 0 && !pouring && u < .95;
    this.lumps.children.forEach((g, i) => { const q = g.children[0]; q.scale.setScalar(Math.max(.05, 1 - u)); q.material = this.mortarMat[i % 3 ? 'cement' : 'sand']; });
    // 灰车与灰槽里的料
    const colorOf = qual => B.mix.clone().offsetHSL(0, 0, qual === 'wet' ? -.06 : qual === 'dry' ? .06 : 0).lerp(B.sand, qual === 'unmixed' ? .5 : 0).lerp(B.water, qual === 'water' ? .7 : 0);
    this.cartLoad.visible = s.cart.load > .02; this.cartLoad.scale.z = Math.max(1, s.cart.load * 26); this.mortarMat.cartLoad.color.copy(colorOf(s.cart.quality));
    this.trayLoad.visible = s.tray.load > .02; this.trayLoad.scale.z = Math.max(1, s.tray.load * 13); this.mortarMat.trayLoad.color.copy(colorOf(s.tray.quality));
    // 出料流：从开口落到灰车
    const flowing = s.pouring;
    this.stream.visible = flowing;
    if (flowing) {
      const a = (35 + s.tilt) * Math.PI / 180, mx = MIXER.x + Math.sin(a) * 372, mz = MIXER.pivotZ + Math.cos(a) * 372 - 40;
      const bottom = 220 + s.cart.load * 26;
      this.stream.position.set(mx, 0, mz); this.stream.scale.z = Math.max(10, mz - bottom);
      this.mortarMat.stream.color.copy(colorOf(s.pourQuality));
    }
    this.mortarMat.lamp.color.setHex(s.running ? 0x3ec27a : this.dark ? 0x3a4a5c : 0x8a98a8);
    this.mortarMat.lamp.emissive.setHex(s.running ? 0x1d7a44 : 0x000000);
    if (!quiet) this.draw();
  };
})();
