/* 任务 8-2 三维场景：维修车间里的四个工位。
 * 发动机：第二章 2-1 的四缸柴油机（createMultiEngine，构建时从 2-1 源码内联），放在发动机支架上。
 * 挖掘机：第二章 2-1 的挖掘机（createExcavator），停在车间地坪上；动臂、斗杆、铲斗姿态由本页控制。
 * 喷涂管路清洗：第六章 6-4 的喷涂机器人（scene-spray.js）；砂浆管道清洗：本页新做的教学砂浆泵（scene-mortar.js）。
 * 本文件只管画面：读状态（MaintModel 的 state）摆出对应的样子，并把检查点点击交给 onPoint。
 */
(function () {
  'use strict';
  const T = window.THREE, TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function create(host, opts = {}) {
    const overlay = document.createElement('div'); overlay.className = 'm82-overlay';
    let renderer;
    try { renderer = window.createChapterRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'}); }
    catch (e) { host.classList.add('m82-no3d'); host.textContent = '三维视图暂不可用，请在启用硬件加速的浏览器中打开。'; return null; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    if (!renderer.isFallback) {
      renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    }
    host.append(renderer.domElement, overlay);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(34, 1, .05, 200);
    scene.fog = new T.Fog(StageTone.bg(), 26, 60);

    /* —— 灯光与环境反射（与 2-1 同一套布光思路） —— */
    const hemi = new T.HemisphereLight(0xf2f6ff, 0x6b7380, 1.6); scene.add(hemi);
    const key = new T.DirectionalLight(0xfff3dd, 3.6); key.position.set(-7, 12, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
    key.shadow.camera.near = 1; key.shadow.camera.far = 40; key.shadow.normalBias = .03; key.shadow.bias = -.0004;
    scene.add(key, key.target);
    const fill = new T.DirectionalLight(0xd5e6ff, 1.6); fill.position.set(7, 5, -5); scene.add(fill);
    const rim = new T.DirectionalLight(0xffffff, 1.4); rim.position.set(-3, 3, -8); scene.add(rim);
    if (!renderer.isFallback) {
      const studio = new T.Scene(); studio.background = new T.Color(0x5d6874);
      for (const [p, s, c] of [[[0, 8, 0], [14, .1, 9], 0xffffff], [[7, 3, 2], [.1, 6, 5], 0xdbe9ff], [[-7, 2, -2], [.1, 4, 8], 0xffe6c2], [[0, 2, -8], [10, 3, .1], 0xc9d8ea]]) {
        const m = new T.Mesh(new T.BoxGeometry(...s), new T.MeshBasicMaterial({color: c})); m.position.set(...p); studio.add(m);
      }
      const pm = new T.PMREMGenerator(renderer); scene.environment = pm.fromScene(studio, .04).texture; pm.dispose();
      studio.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }

    /* —— 车间地坪：磨光混凝土 + 黄色作业区标线 —— */
    function concreteTexture(dark) {
      const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
      x.fillStyle = dark ? '#2b3440' : '#c9ced3'; x.fillRect(0, 0, 512, 512);
      let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 9000; i++) { const v = r(); x.fillStyle = `rgba(${dark ? '255,255,255' : '40,46,54'},${v * .05})`; x.fillRect(r() * 512, r() * 512, 1 + r() * 2.5, 1 + r() * 2.5); }
      for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(r() * 512, r() * 512, 0, r() * 512, r() * 512, 40 + r() * 90); g.addColorStop(0, `rgba(${dark ? '0,0,0' : '255,255,255'},.06)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 512, 512); }
      x.strokeStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(70,78,88,.22)'; x.lineWidth = 2; x.strokeRect(1, 1, 510, 510);
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(10, 10); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
    }
    const floorMat = new T.MeshStandardMaterial({color: 0xffffff, roughness: .82, metalness: 0, map: concreteTexture(false)});
    const floor = new T.Mesh(new T.PlaneGeometry(60, 60), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const paint = new T.MeshStandardMaterial({color: 0xe7b521, roughness: .55});
    function bayLines(group, w, d) {
      const t = .09;
      for (const [x, z, sw, sd] of [[0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d]]) {
        const m = new T.Mesh(new T.PlaneGeometry(sw, sd), paint); m.rotation.x = -Math.PI / 2; m.position.set(x, .004, z); m.receiveShadow = true; group.add(m);
      }
      for (let i = 0; i < 8; i++) { const m = new T.Mesh(new T.PlaneGeometry(.5, t), paint); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 4; m.position.set(-w / 2 + .45 + i * .62, .005, d / 2 - .32); group.add(m); }
    }

    /* —— 通用小零件 —— */
    const M = {
      steel: new T.MeshStandardMaterial({color: 0x9aa6b2, metalness: .85, roughness: .32}),
      dark: new T.MeshStandardMaterial({color: 0x2a3138, metalness: .55, roughness: .45}),
      red: new T.MeshStandardMaterial({color: 0xc8322b, metalness: .2, roughness: .45}),
      yellow: new T.MeshStandardMaterial({color: 0xf0b323, metalness: .2, roughness: .45}),
      brass: new T.MeshStandardMaterial({color: 0xc9a15a, metalness: .85, roughness: .3}),
      rubber: new T.MeshStandardMaterial({color: 0x1d2024, roughness: .9}),
      grease: new T.MeshStandardMaterial({color: 0xb8892a, roughness: .35, metalness: .05}),
      oil: new T.MeshPhysicalMaterial({color: 0x1b140a, roughness: .06, metalness: .1, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .9}),
      coolant: new T.MeshPhysicalMaterial({color: 0x29c3a2, roughness: .1, transparent: true, opacity: .75}),
      tank: new T.MeshPhysicalMaterial({color: 0xf4f1e8, roughness: .25, transparent: true, opacity: .45, depthWrite: false}),
      ring: new T.MeshBasicMaterial({color: 0x3a82e4, transparent: true, opacity: .0, depthWrite: false}),
    };
    const mesh = (g, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new T.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); m.castShadow = !mat.transparent; m.receiveShadow = true; g.add(m); return m; };
    const cyl = (g, r, h, p, mat, rot, n = 24) => mesh(g, new T.CylinderGeometry(r, r, h, n), mat, p, rot);
    const box = (g, w, h, d, p, mat) => mesh(g, new T.BoxGeometry(w, h, d), mat, p);
    function tag(text, w = .34) {
      const c = document.createElement('canvas'); c.width = 256; c.height = 384; const x = c.getContext('2d');
      x.fillStyle = '#d92f27'; x.beginPath(); x.roundRect(8, 30, 240, 346, 24); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 70, 18, 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 64px "PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'center';
      [...text].forEach((ch, i) => x.fillText(ch, 128, 170 + i * 72));
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
      const m = new T.Mesh(new T.PlaneGeometry(w, w * 1.5), new T.MeshStandardMaterial({map: t, roughness: .6, side: T.DoubleSide, transparent: true}));
      m.castShadow = true; return m;
    }
    function puddle(g, x, z, s) {
      const p = new T.Group(); p.position.set(x, .006, z); g.add(p);
      for (const [dx, dz, rx, rz] of [[0, 0, 1, .72], [.42, .18, .46, .34], [-.36, -.2, .38, .3], [.1, -.42, .3, .22]]) {
        const m = new T.Mesh(new T.CircleGeometry(.5, 40), M.oil); m.rotation.x = -Math.PI / 2; m.scale.set(rx * s, rz * s, 1); m.position.set(dx * s, 0, dz * s); m.receiveShadow = true; p.add(m);
      }
      p.visible = false; return p;
    }
    function steam(g) {
      const puffs = [], grp = new T.Group(); g.add(grp);
      const mat = new T.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0, depthWrite: false});
      for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.SphereGeometry(.12, 12, 8), mat.clone()); grp.add(m); puffs.push({m, seed: i / 14}); }
      let t = -1;
      return {
        group: grp, fire() { t = 0; },
        update(dt) {
          if (t < 0) { grp.visible = false; return; } t += dt; grp.visible = true;
          for (const p of puffs) { const k = (t * .9 + p.seed) % 1, live = t < 2.4 ? 1 : Math.max(0, 1 - (t - 2.4) / .6); p.m.position.set(Math.sin(p.seed * 40) * .12 * k, k * 1.3, Math.cos(p.seed * 31) * .12 * k); p.m.scale.setScalar(.5 + k * 2.2); p.m.material.opacity = .45 * (1 - k) * live; }
          if (t > 3) t = -1;
        },
      };
    }

    /* ===================== 发动机工位 ===================== */
    const engineSet = new T.Group(); scene.add(engineSet);
    const multi = window.createMultiEngine(T, scene, new T.Plane(new T.Vector3(0, 0, -1), 0));
    multi.build(4); multi.clip(false); multi.root.visible = true;
    engineSet.add(multi.root);
    multi.root.updateMatrixWorld(true);
    const eb = new T.Box3().setFromObject(multi.root);
    const STAND = .62;   // 发动机支架高度
    multi.root.position.y = STAND - eb.min.y;
    multi.root.updateMatrixWorld(true);
    const ebox = new T.Box3().setFromObject(multi.root), esize = ebox.getSize(new T.Vector3()), ecenter = ebox.getCenter(new T.Vector3());
    // 柴油机的阴影：2-1 原模型的零件默认不投影，这里打开
    multi.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const part = id => { const b = multi.bounds('m_' + id); return {box: b, c: b.getCenter(new T.Vector3()), s: b.getSize(new T.Vector3())}; };
    // 支架：两根纵梁 + 四条腿 + 脚轮，稳稳托住油底壳两侧的悬置
    {
      const g = new T.Group(); engineSet.add(g);
      const L = esize.x * .78, W = Math.min(esize.z * .7, 2.1);
      for (const z of [-W / 2, W / 2]) box(g, L, .14, .14, [ecenter.x, STAND - .07, z], M.red);
      for (const x of [-L / 2 + .2, L / 2 - .2]) { box(g, .14, .14, W + .14, [ecenter.x + x, STAND - .07, 0], M.red); for (const z of [-W / 2, W / 2]) { box(g, .12, STAND - .2, .12, [ecenter.x + x, (STAND - .2) / 2 + .13, z], M.dark); cyl(g, .1, .08, [ecenter.x + x, .1, z], M.rubber, [Math.PI / 2, 0, 0], 18); cyl(g, .03, .18, [ecenter.x + x, .1, z], M.steel, [Math.PI / 2, 0, 0], 10); } }
    }
    bayLines(engineSet, esize.x + 3.4, esize.z + 3.2);
    // 机油尺：插在机体侧面，顶部黄色拉环
    const sump = part('sump'), block = part('block');
    const dip = new T.Group(); engineSet.add(dip);
    const dipBase = new T.Vector3(block.c.x - esize.x * .18, block.box.max.y - .25, block.box.max.z + .12);
    dip.position.copy(dipBase);
    cyl(dip, .035, 1.2, [0, -.45, 0], M.steel, [0, 0, 0], 12);
    const dipRod = new T.Group(); dip.add(dipRod);
    cyl(dipRod, .015, 1.6, [0, -.62, 0], M.steel, [0, 0, 0], 8);
    mesh(dipRod, new T.TorusGeometry(.085, .026, 10, 24), M.yellow, [0, .24, 0]);
    cyl(dipRod, .04, .1, [0, .12, 0], M.yellow, [0, 0, 0], 12);
    const dipOil = cyl(dipRod, .02, .2, [0, -1.25, 0], M.oil, [0, 0, 0], 8);
    // 冷却液副水箱：半透明壶，能看到液位
    const rad = part('radiator');
    const tankG = new T.Group(); engineSet.add(tankG);
    tankG.position.set(rad.c.x + .15, rad.box.max.y + .02, rad.c.z + rad.s.z * .25);
    const tank = mesh(tankG, new T.BoxGeometry(.52, .5, .34), M.tank, [0, .25, 0]);
    tank.renderOrder = 2;
    const liquid = mesh(tankG, new T.BoxGeometry(.48, .28, .3), M.coolant, [0, .16, 0]);
    const capG = new T.Group(); capG.position.set(.12, .5, 0); tankG.add(capG);
    cyl(capG, .075, .07, [0, .035, 0], M.dark, [0, 0, 0], 20);
    for (const y of [.18, .36]) box(tankG, .03, .006, .35, [-.262, y, 0], M.dark);
    const engSteam = steam(tankG); engSteam.group.position.set(.12, .58, 0);
    // 底部渗油：放油螺塞下方地面上的油迹，一滴一滴落下
    const leakX = sump.c.x + .35, leakZ = sump.box.max.z - .18;
    const ePuddle = puddle(engineSet, leakX + .1, leakZ + .45, 1.5);
    const drip = mesh(engineSet, new T.SphereGeometry(.035, 12, 10), M.oil, [leakX, sump.box.min.y, leakZ]); drip.visible = false;
    // 电源总开关与“禁止启动”牌
    const iso = new T.Group(); engineSet.add(iso); iso.position.set(ebox.max.x + .55, 0, ebox.max.z - .2);
    box(iso, .5, .9, .32, [0, .45, 0], M.dark);
    box(iso, .34, .3, .04, [0, .72, .17], new T.MeshStandardMaterial({color: 0xf4f1e8, roughness: .6}));
    const knob = new T.Group(); knob.position.set(0, .72, .2); iso.add(knob);
    cyl(knob, .08, .05, [0, 0, 0], M.red, [Math.PI / 2, 0, 0], 20); box(knob, .2, .05, .06, [0, 0, .04], M.red);
    const eTag = tag('禁止启动'); eTag.position.set(0, .42, .2); iso.add(eTag); eTag.visible = false;
    const ePoints = {
      dipstick: dipBase.clone().add(new T.Vector3(0, .32, 0)),
      coolant: tankG.position.clone().add(new T.Vector3(.12, .58, 0)),
      belt: part('alternator').c.clone().add(new T.Vector3(0, 0, .2)),
      under: new T.Vector3(leakX + .1, .12, leakZ + .75),
    };
    const exhaustMeshes = multi.meshes.filter(m => m.userData.part === 'm_exhaust' || m.userData.part === 'm_turbo');
    exhaustMeshes.forEach(m => { m.material = m.material.clone(); m.material.emissive = new T.Color(0xff5a1a); m.material.emissiveIntensity = 0; });

    /* ===================== 挖掘机工位 ===================== */
    const excSet = new T.Group(); scene.add(excSet);
    const exc = window.createExcavator(T, scene, renderer);
    const rig = globalThis.__excavatorRig;           // 构建时注入：{root, boom, stick, bucket, cylinders, BL, SL, pivot}
    excSet.add(rig.root); rig.root.visible = true;
    const pose = {boom: .9, stick: -1.75, psi: 1.15}, RAISED = {boom: .9, stick: -1.75, psi: 1.15}, LOWERED = {boom: .2, stick: -1, psi: .5};
    rig.root.userData.pose = pose;
    const xUpdate = () => exc.update(0, {amount: 1, running: false, speed: 0, xray: false, tracks: false, smoke: false});
    xUpdate(); rig.root.updateMatrixWorld(true);
    const xb0 = new T.Box3().setFromObject(rig.root);
    rig.root.position.y = -xb0.min.y;
    rig.root.updateMatrixWorld(true);
    const xbox = new T.Box3().setFromObject(rig.root), xsize = xbox.getSize(new T.Vector3()), xcenter = xbox.getCenter(new T.Vector3());
    bayLines(excSet, xsize.x + 3, xsize.z + 3);
    // 黄油嘴：每个铰点侧面一个，跟着动臂、斗杆一起动
    const nippleDefs = {
      boomFoot: [rig.boom, 0, 0, .44], boomRod: [rig.boom, 1.62, -.14, .52], boomTip: [rig.boom, rig.BL, 0, .4],
      stickRod: [rig.stick, .68, .26, .5], bucketPin: [rig.stick, rig.SL, 0, .39], linkPin: [rig.stick, rig.pivot.x, rig.pivot.y, .38],
    };
    const nipples = {}, beads = {};
    for (const [id, [parent, x, y, z]] of Object.entries(nippleDefs)) {
      const g = new T.Group(); g.position.set(x, y, z); parent.add(g);
      cyl(g, .035, .04, [0, 0, -.02], M.brass, [Math.PI / 2, 0, 0], 6);
      cyl(g, .016, .04, [0, 0, .015], M.brass, [Math.PI / 2, 0, 0], 10);
      mesh(g, new T.SphereGeometry(.022, 12, 10), M.brass, [0, 0, .042]);
      const bead = mesh(g, new T.TorusGeometry(.07, .03, 10, 24), M.grease, [0, 0, -.03]); bead.visible = false;
      nipples[id] = g; beads[id] = bead;
    }
    // 渗漏：动臂油缸活塞杆的油膜 + 下方地面油滴
    const boomRod = rig.cylinders[0].rod; boomRod.material = boomRod.material.clone();
    const rodColor = boomRod.material.color.clone();
    const xPuddle = puddle(excSet, 0, .3, .8);
    // 驾驶室门上的“禁止操作”牌
    const xTag = tag('禁止操作', .3); xTag.visible = false; excSet.add(xTag);
    // 黄油枪：放在机旁地上，加注时移到黄油嘴
    const gun = new T.Group(); excSet.add(gun);
    {
      cyl(gun, .075, .5, [0, 0, 0], M.red, [0, 0, Math.PI / 2], 24);
      cyl(gun, .085, .06, [.27, 0, 0], M.dark, [0, 0, Math.PI / 2], 24); cyl(gun, .085, .06, [-.27, 0, 0], M.dark, [0, 0, Math.PI / 2], 24);
      box(gun, .1, .1, .1, [.34, 0, 0], M.dark);
      mesh(gun, new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.38, 0, 0), new T.Vector3(.5, .03, 0), new T.Vector3(.62, -.02, 0)]), 12, .014, 8), M.steel);
      box(gun, .3, .03, .05, [.35, .09, 0], M.dark).rotation.z = -.3;
    }
    const gunRest = new T.Vector3(xbox.max.x - 1.2, .09, xbox.max.z + .7);
    gun.position.copy(gunRest);
    const gunAnim = {t: -1, from: new T.Vector3(), to: new T.Vector3(), id: null};

    /* ===================== 清洗工位（喷涂管路、砂浆管道） ===================== */
    const flush = {};
    for (const id of ['spray', 'mortar']) {
      flush[id] = window.MaintFlush[id]({T, mesh, cyl, box, tag, bayLines, M});
      scene.add(flush[id].group);
      flush[id].group.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = true; o.receiveShadow = true; } });
    }

    /* —— 检查点标记（HTML，跟随三维位置） —— */
    const POINTS = {engine: ePoints, excavator: null};
    const buttons = {engine: {}, excavator: {}, spray: {}, mortar: {}};
    let onPoint = () => {};
    function addButtons(station, list) {
      list.forEach(([id, name, no], i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'm82-pt'; b.dataset.station = station; b.dataset.point = id;
        b.innerHTML = `<i>${no ?? i + 1}</i><span>${name}</span>`; b.title = no ? name + no : name;
        b.addEventListener('click', e => { e.stopPropagation(); onPoint(id); });
        overlay.append(b); buttons[station][id] = b;
      });
    }
    addButtons('engine', window.MaintModel.STATIONS.engine.points);
    addButtons('excavator', window.MaintModel.STATIONS.excavator.points);
    addButtons('spray', window.MaintModel.STATIONS.spray.spots);
    addButtons('mortar', window.MaintModel.STATIONS.mortar.spots);
    const worldOf = (station, id) => flush[station] ? flush[station].spots[id]() : station === 'engine' ? POINTS.engine[id] : nipples[id].getWorldPosition(new T.Vector3());

    /* —— 相机：拖动旋转、滚轮缩放 —— */
    const view = {az: .7, el: .32, dist: 12, target: new T.Vector3(), goal: null};
    const FRAMES = {
      engine: () => ({az: .62, el: .3, dist: Math.max(esize.x, esize.y * 1.6) * 2.25, target: new T.Vector3(ecenter.x, ebox.max.y * .48, ecenter.z)}),
      excavator: () => ({az: .78, el: .26, dist: Math.max(xsize.x, xsize.y * 1.7) * 1.9, target: new T.Vector3(xcenter.x + .3, xsize.y * .38, xcenter.z)}),
      spray: () => flush.spray.frame(),
      mortar: () => flush.mortar.frame(),
    };
    let station = 'engine';
    function frame(st, instant) { const f = FRAMES[st](); if (instant) { Object.assign(view, f); view.target = f.target; view.goal = null; } else view.goal = f; }
    function placeCamera() {
      const t = view.target, ce = Math.cos(view.el);
      camera.position.set(t.x + view.dist * ce * Math.sin(view.az), t.y + view.dist * Math.sin(view.el), t.z + view.dist * ce * Math.cos(view.az));
      camera.lookAt(t);
    }
    let drag = null;
    host.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = {x: e.clientX, y: e.clientY}; host.setPointerCapture?.(e.pointerId); view.goal = null; });
    host.addEventListener('pointermove', e => { if (!drag) return; view.az -= (e.clientX - drag.x) * .006; view.el = clamp(view.el + (e.clientY - drag.y) * .004, .04, 1.25); drag.x = e.clientX; drag.y = e.clientY; });
    const up = () => { drag = null; }; host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
    host.addEventListener('wheel', e => { e.preventDefault(); view.goal = null; const base = FRAMES[station]().dist; view.dist = clamp(view.dist * Math.exp(e.deltaY * .001), base * .35, base * 1.8); }, {passive: false});

    /* —— 主题 —— */
    function theme() {
      const dark = document.documentElement.dataset.theme === 'dark';
      floorMat.map = concreteTexture(dark); floorMat.needsUpdate = true;
      scene.fog.color.set(StageTone.bg());
      hemi.intensity = dark ? 1.15 : 1.6; key.intensity = dark ? 3 : 3.6;
      multi.theme?.(dark);
    }
    window.addEventListener('course-theme-change', theme); theme();

    /* —— 按状态摆出场景 —— */
    let S = null, crank = 25, running = true, speed = 0;
    const anim = {dip: 0, dipT: -1, cap: 0, capOpen: false, isoKnob: 0, temp: 88, pressure: 35};
    function sync(state, ev) {
      const prev = S; S = state;
      if (!prev || prev.station !== state.station) {
        station = state.station; engineSet.visible = station === 'engine'; excSet.visible = station === 'excavator';
        for (const id in flush) flush[id].group.visible = station === id;
        frame(station, !prev);
      }
      for (const id in flush) flush[id].sync(state.work[id], state, ev && state.station === id ? ev : (prev ? null : ev));
      const af = flush[state.station]?.autoFocus(ev, state.work[state.station], state);
      if (af && prev) { if (af.frame) frame(station, false); else view.goal = {az: view.az, el: view.el, dist: af.dist, target: af.target}; }
      const we = state.work.engine, wx = state.work.excavator;
      running = !we.prepared;
      ePuddle.visible = we.scenario === 'leak'; drip.visible = we.scenario === 'leak';
      eTag.visible = we.isolated;
      xPuddle.visible = wx.scenario === 'seep';
      boomRod.material.color.copy(wx.scenario === 'seep' ? new T.Color(0x6a5530) : rodColor);
      xTag.visible = wx.isolated;
      for (const id of Object.keys(beads)) beads[id].visible = !!wx.done[id];
      const target = wx.prepared ? LOWERED : RAISED;
      if (!prev) { Object.assign(pose, target); anim.temp = we.temp; anim.pressure = wx.pressure; anim.poseT = -1; }
      else { anim.poseFrom = {...pose}; anim.poseTo = target; anim.poseT = (anim.poseTo.boom !== pose.boom) ? 0 : -1; }
      // 本次操作对应的小动画
      if (ev && !state.error) {
        if (ev.type === 'inspect' && ev.point === 'dipstick' && state.station === 'engine') anim.dipT = 0;
        if (ev.type === 'inspect' && ev.point === 'coolant' && state.station === 'engine') anim.capOpen = true;
        if (ev.type === 'service' && state.station === 'excavator') {
          const id = ev.point || Object.keys(wx.done).at(-1); if (id) { gunAnim.id = id; gunAnim.t = 0; gunAnim.from.copy(gun.position); gunAnim.to.copy(worldOf('excavator', id)).add(new T.Vector3(.68, -.02, .06)); beads[id].visible = false; }
        }
        if (ev.type === 'service' && state.station === 'engine') anim.dipT = 0;
        if (ev.type === 'case') { anim.capOpen = false; gunAnim.t = -1; gun.position.copy(gunRest); }
      }
      if (ev && state.error && ev.type === 'inspect' && ev.point === 'coolant' && state.station === 'engine' && !we.energy && we.prepared) engSteam.fire();
      // 检查点按钮状态
      for (const [st, map] of Object.entries(buttons)) {
        const w = state.work[st];
        if (flush[st]) { for (const [id, b] of Object.entries(map)) { b.hidden = st !== state.station || !flush[st].spotVisible(id, w); b.dataset.state = flush[st].spotState(id, w); } continue; }
        for (const [id, b] of Object.entries(map)) {
          b.hidden = st !== state.station;
          const f = window.MaintModel.finding(st, w.scenario, id);
          b.dataset.state = w.done[id] ? 'done' : w.checked[id] ? (f.abnormal ? 'bad' : 'ok') : 'todo';
        }
      }
    }
    function focus(id) {
      const p = worldOf(station, id); if (!p) return;
      const f = FRAMES[station](); view.goal = {az: view.az, el: view.el, dist: f.dist * .55, target: p.clone()};
    }

    /* —— 渲染循环 —— */
    let last = performance.now(), w = 0, h = 0;
    const ro = new ResizeObserver(() => { w = host.clientWidth; h = host.clientHeight; if (w && h) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); } });
    ro.observe(host);
    const tmp = new T.Vector3();
    // 后台或被隐藏时浏览器会停掉 requestAnimationFrame：用定时器兜底，状态动画照样走完
    let lastRaf = 0;
    function loop(now) { requestAnimationFrame(loop); lastRaf = performance.now(); tick(now); }
    setInterval(() => { if (performance.now() - lastRaf > 400) tick(performance.now()); }, 120);
    function tick(now) {
      const dt = Math.min(.05, Math.max(0, now - last) / 1000); last = now;
      if (!S) return;
      if (view.goal) {
        const k = 1 - Math.exp(-dt * 5), g = view.goal;
        view.az = lerp(view.az, g.az, k); view.el = lerp(view.el, g.el, k); view.dist = lerp(view.dist, g.dist, k); view.target.lerp(g.target, k);
        if (Math.abs(view.dist - g.dist) < .01 && view.target.distanceTo(g.target) < .01) view.goal = null;
      }
      placeCamera();
      key.target.position.copy(view.target); key.position.copy(view.target).add(tmp.set(-7, 12, 8));
      const we = S.work.engine, wx = S.work.excavator;
      if (flush[station]) {
        flush[station].update(dt, now, S.work[station]);
      } else if (station === 'engine') {
        // 曲轴：运转时匀速，熄火后慢慢停下
        speed = lerp(speed, running ? 1 : 0, 1 - Math.exp(-dt * (running ? 3 : 1.4)));
        crank = (crank + dt * 300 * speed) % 720;
        multi.update({angle: crank, explode: 0, effects: false, cut: false, labels: false, observed: 1, running}, camera, {w, h}, dt);
        multi.root.position.x = running ? Math.sin(now * .09) * .004 : 0;
        // 温度：读数跟着状态慢慢变化，排气歧管随温度发出暗红
        anim.temp = lerp(anim.temp, we.temp, 1 - Math.exp(-dt * 1.6));
        exhaustMeshes.forEach(m => { m.material.emissiveIntensity = clamp((anim.temp - 50) / 38, 0, 1) * .55; });
        anim.isoKnob = lerp(anim.isoKnob, we.isolated ? Math.PI / 2 : 0, 1 - Math.exp(-dt * 6)); knob.rotation.z = anim.isoKnob;
        if (anim.dipT >= 0) { anim.dipT += dt; const t = anim.dipT; dipRod.position.y = t < .8 ? ease(t / .8) * 1.0 : t < 2.2 ? 1.0 : t < 3 ? (1 - ease((t - 2.2) / .8)) * 1.0 : 0; if (t > 3) anim.dipT = -1; }
        dipOil.scale.y = we.done.oil ? 2.2 : 1; dipOil.position.y = we.done.oil ? -1.18 : -1.25;
        anim.cap = lerp(anim.cap, anim.capOpen ? 1 : 0, 1 - Math.exp(-dt * 5)); capG.position.y = .5 + anim.cap * .14; capG.rotation.z = anim.cap * .6;
        liquid.scale.y = 1; engSteam.update(dt);
        if (drip.visible) { const t = (now / 1000) % 1.4; drip.position.y = lerp(sump.box.min.y + multi.root.position.y * 0, .03, Math.min(1, t * t * 1.6)); drip.scale.setScalar(t > 1.2 ? .2 : 1); }
      } else {
        if (anim.poseT >= 0) { anim.poseT = Math.min(1, anim.poseT + dt / 2.2); const k = ease(anim.poseT); for (const j of ['boom', 'stick', 'psi']) pose[j] = lerp(anim.poseFrom[j], anim.poseTo[j], k); if (anim.poseT >= 1) anim.poseT = -1; }
        xUpdate();
        const doorAt = rig.root.localToWorld(new T.Vector3(.4, 1.55, .82)); xTag.position.copy(doorAt); xTag.rotation.set(0, 0, .06);
        const rodTip = rig.cylinders[0].rod.getWorldPosition(tmp); xPuddle.position.set(rodTip.x + .1, .006, rodTip.z + .05);
        anim.pressure = lerp(anim.pressure, wx.pressure, 1 - Math.exp(-dt * 2));
        if (gunAnim.t >= 0) {
          gunAnim.t += dt; const t = gunAnim.t;
          if (t < 1) gun.position.lerpVectors(gunAnim.from, gunAnim.to, ease(t));
          else if (t < 1.9) { gun.position.copy(gunAnim.to); const b = beads[gunAnim.id]; b.visible = t > 1.3; b.scale.setScalar(clamp((t - 1.3) / .5, .1, 1)); }
          else if (t < 2.9) gun.position.lerpVectors(gunAnim.to, gunRest, ease(t - 1.9));
          else { gun.position.copy(gunRest); gunAnim.t = -1; }
          gun.rotation.y = gunAnim.t >= 0 && t < 2.4 ? Math.PI : 0;
        }
      }
      if (!w || !h) return;   // 画布还没有尺寸（例如面板被隐藏）：状态动画照走，只是不画
      renderer.render(scene, camera);
      // 检查点标记跟随
      const placed = [];
      for (const [id, b] of Object.entries(buttons[station])) {
        if (b.hidden) continue;
        tmp.copy(worldOf(station, id)).project(camera);
        const x = (tmp.x * .5 + .5) * w; let y = (-tmp.y * .5 + .5) * h;
        // 标记互相挡住时往下错开一行
        for (let k = 0; k < 4; k++) { const hit = placed.find(p => Math.abs(p.x - x) < 118 && Math.abs(p.y - y) < 27); if (!hit) break; y = hit.y + 28; }
        placed.push({x, y});
        b.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
        b.style.opacity = tmp.z > 1 ? 0 : 1;
      }
    }
    requestAnimationFrame(loop);

    return {
      sync, focus, frame: () => frame(station, false),
      top() { const f = FRAMES[station](); view.goal = {az: view.az, el: 1.2, dist: f.dist * 1.05, target: f.target.clone()}; },
      set onPoint(fn) { onPoint = fn; },
      readouts: () => ({temp: Math.round(anim.temp), pressure: Math.round(anim.pressure), crank: Math.round(speed * 100),
        sprayPressure: flush.spray.readouts().pressure, mortarPressure: flush.mortar.readouts().pressure}),
      stats: () => ({webgl: !renderer.isFallback, calls: renderer.info?.render?.calls || 0, gun: +gunAnim.t.toFixed(2), boom: +pose.boom.toFixed(2), dip: +dipRod.position.y.toFixed(2), cap: +anim.cap.toFixed(2)}),
    };
  }

  window.MaintScene = {create};
})();
