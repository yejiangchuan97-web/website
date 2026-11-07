/* 8-1 三维施工现场：一块 40 m × 28 m 的楼面，按真实尺寸（米）布置。
 * 挖掘机、塔吊用课程已有网格（与 1-2 同款，shared/workshop/imported-machinery.js），其余设备在这里用实体零件搭建。
 * 场景只读 SafetyModel 的状态；交互（点选、视角）通过回调交给 app.js。
 */
(function (global) {
  'use strict';
  const T = THREE, V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), rad = d => d * Math.PI / 180;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  /* —— 布局（米）：x 向右，z 向镜头 —— */
  const L = {
    excavator: V(-7.5, 0, -4), mast: V(13.2, 0, -9), loadAt: V(2.5, 0, -2.8), hungY: 5.2,
    opening: {x: -.4, z: -8.2, w: 2.4, d: 1.8}, box: V(-4.2, 0, 5), puddle: V(-.2, 0, 5.6),
    bender: V(6.2, 0, 4.8), spray: V(-11, 0, 5.2), estop: V(5.2, 0, 10.1),
  };
  // 原有通道（穿过回转范围、吊物下方、洞口边）与改道后的通道
  const ROUTE_A = [V(10, 0, 8.6), V(10, 0, -2.8), V(2.5, 0, -2.8), V(-.2, 0, -6.6), V(-4.6, 0, -2), V(-4.6, 0, 2.6), V(-2.2, 0, 8.6)];
  const ROUTE_B = [V(10, 0, 8.6), V(10, 0, 1.2), V(-2.6, 0, 1.2), V(-2.6, 0, 8.6)];

  /* —— 贴图 —— */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  const noise = (x, w, h, n, base, spread, alpha) => {
    for (let i = 0; i < n; i++) {
      const v = base + Math.random() * spread | 0;
      x.fillStyle = `rgba(${v},${v - 3},${v - 9},${Math.random() * alpha})`;
      x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5);
    }
  };
  const concreteTex = () => canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#c8c4bb'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const g = x.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 60 + Math.random() * 120);
      const d = Math.random() < .5 ? '120,114,104' : '232,228,220';
      g.addColorStop(0, `rgba(${d},.10)`); g.addColorStop(1, `rgba(${d},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    }
    noise(x, w, h, 14000, 150, 90, .32);
    x.strokeStyle = 'rgba(95,88,80,.45)'; x.lineWidth = 2.5; x.strokeRect(1, 1, w - 2, h - 2);
  }, [1 / 6, 1 / 6]);
  const dirtTex = () => canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#d9d4ca'; x.fillRect(0, 0, w, h);
    noise(x, w, h, 22000, 165, 60, .4);
  }, [24, 24]);
  const stripeTex = (a, b, n = 6, vertical = false) => canvasTex(128, 128, (x, w, h) => {
    for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? b : a; vertical ? x.fillRect(0, i * h / n, w, h / n) : x.fillRect(i * w / n, 0, w / n, h); }
  });
  const hazardStripe = () => canvasTex(256, 64, (x, w, h) => {
    x.fillStyle = '#f2c230'; x.fillRect(0, 0, w, h); x.fillStyle = '#1d1d1f';
    for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 32, h); x.lineTo(i * 32 + 16, h); x.lineTo(i * 32 + 32 + 16, 0); x.lineTo(i * 32 + 32, 0); x.fill(); }
  }, [3, 1]);
  const textTex = (text, bg, fg, w = 256, h = 128, size = 64) => canvasTex(w, h, (x) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg;
    x.font = `700 ${size}px "PingFang SC","Microsoft YaHei",sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2);
  });
  const warnTex = () => canvasTex(128, 128, (x) => {
    x.fillStyle = '#f2c230'; x.strokeStyle = '#1d1d1f'; x.lineWidth = 9; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(64, 10); x.lineTo(120, 112); x.lineTo(8, 112); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#1d1d1f'; x.beginPath(); x.moveTo(70, 36); x.lineTo(48, 78); x.lineTo(64, 78); x.lineTo(56, 102); x.lineTo(82, 64); x.lineTo(66, 64); x.lineTo(76, 36); x.fill();
  });
  const gaugeTex = () => canvasTex(256, 256, (x) => {
    x.fillStyle = '#f7f7f3'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    x.lineWidth = 16; x.strokeStyle = '#39a96b'; x.beginPath(); x.arc(128, 128, 96, rad(135), rad(200)); x.stroke();
    x.strokeStyle = '#e7a325'; x.beginPath(); x.arc(128, 128, 96, rad(200), rad(330)); x.stroke();
    x.strokeStyle = '#cf3b30'; x.beginPath(); x.arc(128, 128, 96, rad(330), rad(405)); x.stroke();
    x.strokeStyle = '#222'; x.lineWidth = 4;
    for (let i = 0; i <= 10; i++) { const a = rad(135 + i * 27); x.beginPath(); x.moveTo(128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80); x.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); x.stroke(); }
    x.fillStyle = '#222'; x.font = '700 30px sans-serif'; x.textAlign = 'center'; x.fillText('0', 70, 200);
  });

  /* —— 材质 —— */
  function materials() {
    const S = (color, o = {}) => new T.MeshStandardMaterial({color, roughness: .6, metalness: .05, ...o});
    return {
      concrete: S(0xffffff, {map: concreteTex(), roughness: .93}),
      concreteCol: S(0xbdb8ae, {roughness: .9}),
      pit: S(0x4b4740, {roughness: 1}),
      dirt: S(0xffffff, {map: dirtTex(), roughness: 1}),
      steel: S(0x8e979e, {metalness: .75, roughness: .36}),
      darkSteel: S(0x41484f, {metalness: .6, roughness: .45}),
      galv: S(0xb9c0c5, {metalness: .65, roughness: .42}),
      rebar: S(0x7a5a45, {metalness: .55, roughness: .62}),
      yellow: S(0xe2a822, {roughness: .45, metalness: .15}),
      red: S(0xc5362c, {roughness: .4}),
      orange: S(0xe8661c, {roughness: .5}),
      white: S(0xf1f1ec, {roughness: .55}),
      rubber: S(0x23272b, {roughness: .82}),
      cableNew: S(0xe8721f, {roughness: .55}),
      copper: S(0xd17c3e, {metalness: .85, roughness: .3}),
      timber: S(0xa8774a, {roughness: .88}),
      plywood: S(0xd2ab72, {roughness: .8}),
      machine: S(0x2f6f8f, {roughness: .42, metalness: .2}),
      machine2: S(0x3c4c5a, {roughness: .5, metalness: .25}),
      hoarding: S(0x2f5f9a, {roughness: .6}),
      hoardingWhite: S(0xeef1f4, {roughness: .6}),
      water: new T.MeshStandardMaterial({map: canvasTex(256, 256, (x, w, h) => {
        const g = x.createRadialGradient(w * .45, h * .45, 8, w / 2, h / 2, w * .55); g.addColorStop(0, '#3f6683'); g.addColorStop(.75, '#6f93ad'); g.addColorStop(1, '#a9bccb');
        x.fillStyle = g; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3;
        for (let i = 0; i < 6; i++) { x.beginPath(); x.ellipse(w * (.3 + Math.random() * .4), h * (.3 + Math.random() * .4), 18 + i * 9, 8 + i * 4, 0, 0, Math.PI * 1.2); x.stroke(); }
      }), roughness: .04, metalness: .1, transparent: true, opacity: .78}),
      lane: new T.MeshStandardMaterial({color: 0x2f9e5b, roughness: .7}),
      laneFill: new T.MeshStandardMaterial({color: 0x52b77d, roughness: .8, transparent: true, opacity: .18, depthWrite: false}),
      hivis: S(0xd4ec2a, {roughness: .7, emissive: 0x2a3300}),
      reflect: S(0xdfe6ea, {roughness: .2, metalness: .6}),
      jeans: S(0x34475f, {roughness: .85}),
      skin: S(0xc99773, {roughness: .7}),
      helmet: S(0xf5f3ec, {roughness: .35}),
      boots: S(0x2b2622, {roughness: .8}),
      stripes: S(0xffffff, {map: stripeTex('#d23a2f', '#f4f4f0', 8, true), roughness: .5}),
      hazard: S(0xffffff, {map: hazardStripe(), roughness: .5}),
      beacon: new T.MeshStandardMaterial({color: 0xffa21a, emissive: 0xff8a00, emissiveIntensity: .2, transparent: true, opacity: .85, roughness: .2}),
      mushroom: new T.MeshStandardMaterial({color: 0xd12a22, emissive: 0x7a0000, emissiveIntensity: 0, roughness: .3}),
      lamp: new T.MeshStandardMaterial({color: 0x39c46e, emissive: 0x39c46e, emissiveIntensity: .8}),
      ring: new T.MeshBasicMaterial({color: 0xf0a020, transparent: true, opacity: .75, depthWrite: false, side: T.DoubleSide}),
      ringOk: new T.MeshBasicMaterial({color: 0x1f8a5b, transparent: true, opacity: .7, depthWrite: false, side: T.DoubleSide}),
      mist: new T.MeshBasicMaterial({color: 0xe8eef2, transparent: true, opacity: .55, depthWrite: false}),
    };
  }

  function create(host) {
    const api = {onPick: null, ready: null, webgl: true};
    let renderer;
    try {
      renderer = new T.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    } catch (e) { api.webgl = false; host.classList.add('no-webgl'); api.update = () => {}; api.view = () => {}; api.focus = () => {}; api.ready = Promise.resolve(); return api; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.append(renderer.domElement); renderer.domElement.setAttribute('aria-hidden', 'true');
    const overlay = document.createElement('div'); overlay.className = 'c8-labels'; host.append(overlay);

    const scene = new T.Scene(), M = materials();
    const camera = new T.PerspectiveCamera(36, 1, .2, 500);
    const hemi = new T.HemisphereLight(0xeaf3ff, 0x8a7f6c, 1.25); scene.add(hemi);
    const sun = new T.DirectionalLight(0xfff1dc, 2.6); sun.position.set(22, 38, 20); sun.castShadow = true;
    Object.assign(sun.shadow.camera, {left: -26, right: 26, top: 22, bottom: -22, near: 5, far: 100});
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; scene.add(sun, sun.target);
    const fill = new T.DirectionalLight(0xbcd6f0, .55); fill.position.set(-20, 14, -10); scene.add(fill);

    const mesh = (parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
      const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
    };
    const box = (p, w, h, d, mat, x, y, z, ry = 0) => mesh(p, new T.BoxGeometry(w, h, d), mat, x, y, z, 0, ry);
    const cyl = (p, r, h, mat, x, y, z, seg = 20, r2 = r) => mesh(p, new T.CylinderGeometry(r, r2, h, seg), mat, x, y, z);
    const rod = (p, a, b, r, mat, seg = 10) => {
      const d = b.clone().sub(a), m = mesh(p, new T.CylinderGeometry(r, r, d.length(), seg), mat);
      m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
    };
    const tube = (p, pts, r, mat, closed = false, seg = 80) => mesh(p, new T.TubeGeometry(new T.CatmullRomCurve3(pts, closed), seg, r, 10, closed), mat);
    const group = (parent = scene, pick) => { const g = new T.Group(); if (pick) g.userData.pick = pick; parent.add(g); return g; };

    /* —— 地面、楼板与洞口 —— */
    const ground = mesh(scene, new T.PlaneGeometry(220, 220), M.dirt, 0, -.32, 0, -Math.PI / 2); ground.castShadow = false;
    const o = L.opening, shape = new T.Shape();
    shape.moveTo(-15, -11); shape.lineTo(15, -11); shape.lineTo(15, 11); shape.lineTo(-15, 11); shape.closePath();
    const hole = new T.Path(); // 形状坐标 y 对应世界 -z
    hole.moveTo(o.x - o.w / 2, -o.z - o.d / 2); hole.lineTo(o.x - o.w / 2, -o.z + o.d / 2); hole.lineTo(o.x + o.w / 2, -o.z + o.d / 2); hole.lineTo(o.x + o.w / 2, -o.z - o.d / 2); hole.closePath();
    shape.holes.push(hole);
    const slabGeo = new T.ExtrudeGeometry(shape, {depth: .3, bevelEnabled: false}); slabGeo.rotateX(-Math.PI / 2); slabGeo.translate(0, -.3, 0);
    mesh(scene, slabGeo, M.concrete);
    const pitG = group(scene, 'opening');
    box(pitG, o.w, .1, o.d, M.pit, o.x, -3.2, o.z);
    for (const [w, d, x, z] of [[o.w, .1, 0, -o.d / 2], [o.w, .1, 0, o.d / 2], [.1, o.d, -o.w / 2, 0], [.1, o.d, o.w / 2, 0]]) box(pitG, w, 3, d, M.pit, o.x + x, -1.75, o.z + z);
    for (let i = 0; i < 7; i++) rod(pitG, V(o.x - o.w / 2 + .2 + i * .33, -.15, o.z - o.d / 2), V(o.x - o.w / 2 + .2 + i * .33, -.15, o.z - o.d / 2 + .16), .008, M.rebar);
    const pitHit = box(pitG, o.w, .02, o.d, new T.MeshBasicMaterial({visible: false}), o.x, -.05, o.z); pitHit.castShadow = false;

    /* —— 围挡、柱子、材料堆 —— */
    const hoard = group();
    const panel = (x, z, ry) => { box(hoard, 2.95, 2.2, .06, M.hoarding, x, 1.1 - .32, z, ry); box(hoard, 2.95, .25, .07, M.hoardingWhite, x, 1.95 - .32, z, ry); };
    for (let x = -16.5; x <= 16.5; x += 3) panel(x, -13.5, 0);
    for (let z = -12; z <= 9; z += 3) { panel(-18.5, z, Math.PI / 2); panel(18.5, z, Math.PI / 2); }
    for (const x of [-12, -4, 4]) {
      box(scene, .6, 3.6, .6, M.concreteCol, x, 1.8, -10.6);
      for (const [dx, dz] of [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]]) rod(scene, V(x + dx, 3.5, -10.6 + dz), V(x + dx, 4.4, -10.6 + dz), .014, M.rebar, 6);
    }
    const stackG = group();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 5; j++) box(stackG, 2.44, .018, 1.22, M.plywood, 12.6 + (i % 2) * .05, .1 + (i * 5 + j) * .02, 9.2 + i * .02);
    for (const dz of [-.4, 0, .4]) box(stackG, 2.6, .1, .1, M.timber, 12.6, .05, 9.2 + dz);
    // 钢筋原料架
    const rack = group();
    // 钢筋原料：几捆钢筋码在垫木上
    for (const x of [11, 12.8, 14.6]) box(rack, .14, .12, 1.6, M.timber, x, .06, 4.7);
    for (let k = 0; k < 3; k++) {
      const z0 = 4.2 + k * .45;
      for (let i = 0; i < 15; i++) { const y = .14 + (i / 5 | 0) * .034, z = z0 + (i % 5 - 2) * .036 + (i / 5 | 0) * .018; rod(rack, V(10.2, y, z), V(15.4, y, z), .016, M.rebar, 6); }
      for (const x of [11.4, 14.2]) { const w = mesh(rack, new T.TorusGeometry(.11, .008, 6, 16), M.darkSteel, x, .18, z0, 0, Math.PI / 2); w.scale.set(1, .7, 1); }
    }

    /* —— 人员通道 —— */
    const lanes = {A: group(), B: group()};
    for (const [key, route] of [['A', ROUTE_A], ['B', ROUTE_B]]) {
      for (let i = 0; i < route.length - 1; i++) {
        const a = route[i], b = route[i + 1], d = b.clone().sub(a), len = d.length(), ang = Math.atan2(d.x, d.z), mid = a.clone().addScaledVector(d, .5);
        const n = V(Math.cos(ang), 0, -Math.sin(ang)).multiplyScalar(.7);
        for (const s of [-1, 1]) { const e = box(lanes[key], .09, .006, len + .09, M.lane, mid.x + n.x * s, .004, mid.z + n.z * s, ang); e.castShadow = false; }
        const f = box(lanes[key], 1.4, .003, len, M.laneFill, mid.x, .003, mid.z, ang); f.castShadow = false;
      }
    }
    lanes.B.visible = false;

    /* —— 配电箱、电缆、积水 —— */
    const elec = group(scene, 'electric'), bx = L.box;
    for (const dx of [-.28, .28]) box(elec, .06, 1.9, .06, M.galv, bx.x + dx, .95, bx.z - .05);
    box(elec, .7, .06, .5, M.galv, bx.x, .06, bx.z);
    box(elec, .62, .82, .26, M.machine2, bx.x, 1.45, bx.z);
    const door = box(elec, .58, .78, .02, M.galv, bx.x, 1.45, bx.z + .14);
    const sign = mesh(elec, new T.PlaneGeometry(.2, .2), new T.MeshStandardMaterial({map: warnTex(), transparent: true}), bx.x, 1.62, bx.z + .152); sign.castShadow = false;
    box(elec, .7, .05, .34, M.galv, bx.x, 1.89, bx.z);
    const lamp = cyl(elec, .025, .03, M.lamp, bx.x + .2, 1.3, bx.z + .16, 12); lamp.rotation.x = Math.PI / 2;
    const handle = group(elec); handle.position.set(bx.x + .34, 1.45, bx.z);
    box(handle, .04, .04, .04, M.darkSteel, .02, 0, 0); box(handle, .03, .2, .03, M.red, .05, .09, 0);
    const lockout = group(elec); lockout.position.set(bx.x + .4, 1.36, bx.z + .02); lockout.visible = false;
    box(lockout, .07, .08, .03, M.red, 0, 0, 0); mesh(lockout, new T.TorusGeometry(.025, .006, 8, 16, Math.PI), M.steel, 0, .04, 0);
    const tag = mesh(lockout, new T.PlaneGeometry(.12, .2), new T.MeshStandardMaterial({map: textTex('禁止合闸', '#c5362c', '#fff', 128, 220, 26), side: T.DoubleSide}), 0, -.16, .02); tag.castShadow = false;
    const pd = L.puddle, pShape = new T.Shape();
    for (let i = 0; i <= 28; i++) { const a = i / 28 * Math.PI * 2, r = 1 + .22 * Math.sin(a * 3 + 1) + .12 * Math.sin(a * 5); i ? pShape.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r) : pShape.moveTo(Math.cos(a) * r * 1.6, Math.sin(a) * r); }
    const pGeo = new T.ShapeGeometry(pShape), pPos = pGeo.attributes.position, pUv = pGeo.attributes.uv;
    for (let i = 0; i < pPos.count; i++) pUv.setXY(i, (pPos.getX(i) + 2) / 4, (pPos.getY(i) + 1.4) / 2.8);
    const puddle = mesh(elec, pGeo, M.water, pd.x, .006, pd.z, -Math.PI / 2); puddle.castShadow = false;
    const oldCable = group(elec);
    const cPts = [V(bx.x + .1, 1.05, bx.z), V(bx.x + .1, .1, bx.z + .15), V(bx.x + .9, .03, bx.z + .6), V(pd.x - 1.2, .03, pd.z + .1), V(pd.x - .2, .03, pd.z - .05), V(pd.x + 1.4, .03, pd.z + .1), V(L.bender.x - 1.6, .03, L.bender.z + .4), V(L.bender.x - .62, .3, L.bender.z + .1)];
    tube(oldCable, cPts, .024, M.rubber);
    for (let i = 0; i < 5; i++) rod(oldCable, V(pd.x - .25 + i * .03, .035, pd.z - .05), V(pd.x - .19 + i * .035, .05 + i * .006, pd.z + .02), .004, M.copper, 5);
    const spark = mesh(oldCable, new T.SphereGeometry(.05, 10, 8), new T.MeshBasicMaterial({color: 0x9fd8ff, transparent: true, opacity: 0}), pd.x - .2, .08, pd.z); spark.castShadow = false;
    const newCable = group(elec); newCable.visible = false;
    const poleXs = [bx.x + 1.8, pd.x, pd.x + 3.2];
    for (const x of poleXs) { box(newCable, .1, 2.4, .1, M.timber, x, 1.2, bx.z + .7); mesh(newCable, new T.TorusGeometry(.05, .01, 8, 14), M.white, x, 2.3, bx.z + .78); }
    tube(newCable, [V(bx.x + .1, 1.05, bx.z + .1), V(bx.x + .4, 1.95, bx.z + .4), V(poleXs[0], 2.3, bx.z + .78), V((poleXs[0] + poleXs[1]) / 2, 2.0, bx.z + .78), V(poleXs[1], 2.3, bx.z + .78), V((poleXs[1] + poleXs[2]) / 2, 2.0, bx.z + .78), V(poleXs[2], 2.3, bx.z + .78), V(L.bender.x - .9, 1.6, L.bender.z + .4), V(L.bender.x - .62, .45, L.bender.z + .1)], .022, M.cableNew, false, 140);

    /* —— 钢筋加工机（皮带传动）—— */
    const ben = group(scene, 'belt'), bp = L.bender;
    box(ben, 1.3, .78, .9, M.machine, bp.x, .39 + .05, bp.z);
    box(ben, 1.42, .05, 1.02, M.darkSteel, bp.x, .86, bp.z);
    for (const [dx, dz] of [[-.55, -.38], [.55, -.38], [-.55, .38], [.55, .38]]) box(ben, .1, .05, .1, M.rubber, bp.x + dx, .025, bp.z + dz);
    const disk = group(ben); disk.position.set(bp.x + .15, .9, bp.z);
    cyl(disk, .26, .04, M.steel, 0, 0, 0, 32); cyl(disk, .045, .12, M.galv, 0, .07, 0); cyl(disk, .04, .12, M.galv, .17, .07, 0); cyl(disk, .04, .12, M.galv, -.17, .07, .08);
    box(ben, .5, .07, .06, M.galv, bp.x - .35, .92, bp.z - .2);
    const motor = group(ben); motor.position.set(bp.x - .2, .3, bp.z + .62);
    const mBody = cyl(motor, .16, .42, M.machine2, 0, 0, 0, 24); mBody.rotation.z = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const f = box(motor, .4, .015, .34, M.machine2, 0, 0, 0); f.rotation.x = i * Math.PI / 8; }
    box(motor, .38, .08, .36, M.darkSteel, 0, -.18, 0);
    // 两只带轮和 V 带：外露在机身侧面
    const pulleys = [];
    const pulley = (x, y, r) => {
      const p = group(ben); p.position.set(x, y, bp.z + .66);
      const rim = cyl(p, r, .06, M.galv, 0, 0, 0, 32); rim.rotation.x = Math.PI / 2;
      const grooveMat = M.darkSteel; const gr = mesh(p, new T.TorusGeometry(r - .01, .012, 8, 32), grooveMat); gr.position.z = 0;
      for (let i = 0; i < 4; i++) { const s = box(p, r * 1.7, .02, .02, M.darkSteel, 0, 0, .035); s.rotation.z = i * Math.PI / 4; }
      pulleys.push(p); return p;
    };
    pulley(bp.x + .02, .3, .09); pulley(bp.x + .25, .66, .17);
    const beltPts = [];
    for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, big = Math.sin(a) > -.1; beltPts.push(big ? V(bp.x + .25 + Math.cos(a) * .17, .66 + Math.sin(a) * .17, bp.z + .66) : V(bp.x + .02 + Math.cos(a) * .09, .3 + Math.sin(a) * .09, bp.z + .66)); }
    tube(ben, beltPts.slice(0, -1), .012, M.rubber, true, 120);
    const guard = group(ben);
    const guardMat = new T.MeshStandardMaterial({color: 0xf0b62c, roughness: .5, metalness: .2, transparent: true, opacity: .55});
    box(guard, .52, .74, .015, guardMat, 0, 0, .1); box(guard, .52, .015, .12, M.yellow, 0, .37, .05); box(guard, .52, .015, .12, M.yellow, 0, -.37, .05);
    box(guard, .015, .74, .12, M.yellow, -.26, 0, .05); box(guard, .015, .74, .12, M.yellow, .26, 0, .05);
    for (let i = 1; i < 6; i++) box(guard, .5, .008, .01, M.yellow, 0, -.37 + i * .123, .105);
    const guardOn = {p: V(bp.x + .14, .48, bp.z + .62), r: V(0, 0, 0)}, guardOff = {p: V(bp.x + 1.2, .07, bp.z + 1.1), r: V(-Math.PI / 2, 0, .4)};

    /* —— 喷涂机、压力表、管路 —— */
    const spr = group(scene, 'pressure'), sp = L.spray;
    box(spr, .9, .05, .55, M.darkSteel, sp.x, .42, sp.z);
    for (const s of [-1, 1]) { const w = cyl(spr, .19, .07, M.rubber, sp.x - .3, .19, sp.z + s * .32, 24); w.rotation.x = Math.PI / 2; const hb = cyl(spr, .07, .08, M.galv, sp.x - .3, .19, sp.z + s * .32, 16); hb.rotation.x = Math.PI / 2; }
    box(spr, .06, .4, .06, M.darkSteel, sp.x + .38, .22, sp.z);
    rod(spr, V(sp.x + .4, .45, sp.z - .22), V(sp.x + .55, 1.15, sp.z - .22), .018, M.darkSteel); rod(spr, V(sp.x + .4, .45, sp.z + .22), V(sp.x + .55, 1.15, sp.z + .22), .018, M.darkSteel);
    rod(spr, V(sp.x + .55, 1.15, sp.z - .24), V(sp.x + .55, 1.15, sp.z + .24), .018, M.rubber);
    const sm = cyl(spr, .17, .42, M.red, sp.x - .05, .66, sp.z, 24); sm.rotation.x = Math.PI / 2;
    box(spr, .26, .2, .3, M.darkSteel, sp.x + .22, .55, sp.z);
    const pumpCyl = cyl(spr, .06, .3, M.steel, sp.x + .22, .78, sp.z, 16);
    const gauge = group(spr); gauge.position.set(sp.x + .22, 1.0, sp.z + .12);
    const gFace = cyl(gauge, .085, .03, M.galv, 0, 0, 0, 28); gFace.rotation.x = Math.PI / 2;
    const dial = mesh(gauge, new T.CircleGeometry(.075, 32), new T.MeshStandardMaterial({map: gaugeTex(), roughness: .3}), 0, 0, .017); dial.castShadow = false;
    const needle = group(gauge); needle.position.z = .02; box(needle, .006, .062, .004, M.red, 0, .027, 0);
    rod(spr, V(sp.x + .22, .93, sp.z), V(sp.x + .22, .93, sp.z + .12), .01, M.galv);
    const valve = group(spr); valve.position.set(sp.x + .35, .55, sp.z + .16);
    cyl(valve, .02, .06, M.galv, 0, 0, 0); box(valve, .12, .015, .02, M.red, .04, .03, 0);
    // 喷涂工人站在墙前，喷枪握在右手，软管从手里垂到地面再接回喷涂机
    const sprayer = worker(); const sprayAt = V(sp.x - 2.5, 0, sp.z - 3.1);
    sprayer.position.copy(sprayAt); sprayer.rotation.y = -Math.PI / 2;
    const sArm = sprayer.userData.arms[1]; sArm.rotation.x = -1.15;
    const gun = group(sArm); gun.position.set(0, -.64, .03);
    box(gun, .045, .12, .05, M.darkSteel, 0, .02, -.05); box(gun, .035, .34, .035, M.galv, 0, -.16, 0); box(gun, .05, .04, .05, M.red, 0, -.34, 0);
    sprayer.updateMatrixWorld(true);
    const hoseEnd = gun.localToWorld(V(0, .05, -.06));
    const coupling = V(sp.x - 1.5, .06, sp.z - 1.6);
    tube(spr, [V(sp.x + .3, .5, sp.z + .2), V(sp.x + .1, .1, sp.z + .9), V(sp.x - 1.1, .04, sp.z + .3), coupling], .022, M.rubber);
    tube(spr, [coupling, V(sp.x - 2.1, .04, sp.z - 2.4), V(sprayAt.x + .25, .05, sprayAt.z + .3), V(sprayAt.x + .1, .5, sprayAt.z + .35), hoseEnd], .02, M.rubber, false, 120);
    const couplingMat = new T.MeshStandardMaterial({color: 0xb97d31, metalness: .7, roughness: .35});
    const cpl = cyl(spr, .04, .12, couplingMat, coupling.x, coupling.y, coupling.z, 14); cpl.rotation.z = Math.PI / 2; cpl.rotation.y = .7;
    const mist = group(spr); mist.position.copy(coupling);
    const drops = Array.from({length: 14}, () => { const d = mesh(mist, new T.SphereGeometry(.02 + Math.random() * .025, 8, 6), M.mist); d.castShadow = false; d.userData.seed = Math.random() * 10; return d; });
    const wet = mesh(spr, new T.CircleGeometry(.5, 24), M.water, coupling.x + .1, .005, coupling.z + .2, -Math.PI / 2); wet.castShadow = false;
    // 墙边待喷涂的砌块墙
    const wall = group();
    box(wall, .2, 2.6, 4.6, M.concreteCol, sp.x - 3.7, 1.3, sp.z - 3.6);

    /* —— 急停桩与警示灯 —— */
    const es = group(scene, 'estop'), ep = L.estop;
    box(es, .16, 1.0, .16, M.yellow, ep.x, .5, ep.z); box(es, .26, .22, .2, M.yellow, ep.x, 1.1, ep.z);
    const mushroom = group(es); mushroom.position.set(ep.x, 1.1, ep.z + .1);
    const mr = cyl(mushroom, .075, .05, M.mushroom, 0, 0, .04, 24); mr.rotation.x = Math.PI / 2;
    const mstem = cyl(mushroom, .03, .05, M.mushroom, 0, 0, 0, 12); mstem.rotation.x = Math.PI / 2;
    cyl(es, .05, 1.6, M.galv, ep.x + .5, .8, ep.z, 12);
    const beacon = group(es); beacon.position.set(ep.x + .5, 1.72, ep.z);
    cyl(beacon, .09, .06, M.darkSteel, 0, -.06, 0, 20); cyl(beacon, .085, .2, M.beacon, 0, .07, 0, 24);
    const reflector = box(beacon, .14, .1, .01, M.galv, 0, .07, 0);
    const horn = mesh(es, new T.RingGeometry(.2, .26, 40), new T.MeshBasicMaterial({color: 0xffb020, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false}), ep.x + .5, 1.8, ep.z); horn.castShadow = false;

    /* —— 处置后才出现的防护 —— */
    const swingFence = group(scene, 'swing'); swingFence.visible = false;
    const ringR = 6.2, ringN = 22, ringPts = [];
    for (let i = 0; i < ringN; i++) {
      const a = i / ringN * Math.PI * 2, x = L.excavator.x - 1.3 + Math.cos(a) * ringR, z = L.excavator.z + Math.sin(a) * ringR;
      if (z < -10.8) continue;
      cyl(swingFence, .05, 1.05, M.stripes, x, .52, z, 12); cyl(swingFence, .2, .06, M.rubber, x, .03, z, 16);
      ringPts.push(V(x, .92, z));
    }
    for (let i = 0; i < ringPts.length - 1; i++) if (ringPts[i].distanceTo(ringPts[i + 1]) < 2.5) rod(swingFence, ringPts[i], ringPts[i + 1], .014, M.stripes, 6);
    const loadCordon = group(scene, 'load'); loadCordon.visible = false;
    const la = L.loadAt, cps = [V(la.x - 3.6, 0, la.z - 2), V(la.x + 3.6, 0, la.z - 2), V(la.x + 3.6, 0, la.z + 2), V(la.x - 3.6, 0, la.z + 2)];
    for (const c of cps) { cyl(loadCordon, .03, .55, M.orange, c.x, .3, c.z, 14, .17); box(loadCordon, .36, .03, .36, M.rubber, c.x, .015, c.z); }
    for (let i = 0; i < 4; i++) { const a = cps[i].clone().setY(.55), b = cps[(i + 1) % 4].clone().setY(.55); rod(loadCordon, a, b, .012, M.stripes, 6); }
    const dunnage = group(scene, 'load');
    for (const dx of [-2.2, 0, 2.2]) box(dunnage, .15, .15, 1.4, M.timber, la.x + dx, .075, la.z);
    const openFix = group(scene, 'opening'); openFix.visible = false;
    box(openFix, o.w + .5, .04, o.d + .5, M.plywood, o.x, .02, o.z);
    const coverTxt = mesh(openFix, new T.PlaneGeometry(1.2, .6), new T.MeshStandardMaterial({map: textTex('洞口 · 勿移', '#d2ab72', '#b3261e', 256, 128, 40), transparent: true}), o.x, .042, o.z, -Math.PI / 2); coverTxt.castShadow = false;
    const gW = o.w + 1, gD = o.d + 1;
    for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(openFix, .06, 1.2, .06, M.yellow, o.x + x * gW / 2, .6, o.z + z * gD / 2);
    for (const [y, h] of [[1.17, .05], [.6, .04], [.1, .2]]) {
      box(openFix, gW, h, .03, M.hazard, o.x, y, o.z - gD / 2); box(openFix, gW, h, .03, M.hazard, o.x, y, o.z + gD / 2);
      box(openFix, .03, h, gD, M.hazard, o.x - gW / 2, y, o.z); box(openFix, .03, h, gD, M.hazard, o.x + gW / 2, y, o.z);
    }

    /* —— 吊物（塔吊的小车、钢丝绳、吊钩和钢筋捆在这里搭，可升降）—— */
    const loadG = group(scene, 'load');
    const hook = group(loadG);
    cyl(hook, .22, .32, M.yellow, 0, .5, 0, 20); box(hook, .5, .18, .14, M.yellow, 0, .75, 0);
    mesh(hook, new T.TorusGeometry(.13, .035, 10, 24, Math.PI * 1.4), M.darkSteel, 0, .18, 0, 0, 0, -Math.PI * .2);
    const bundle = group(loadG);
    for (let i = 0; i < 24; i++) { const r = .016, x = (i % 6 - 2.5) * .04, y = (i / 6 | 0) * .036; const b = cyl(bundle, r, 6, M.rebar, 0, y, x, 6); b.rotation.z = Math.PI / 2; }
    for (const dx of [-2, 0, 2]) { const w = mesh(bundle, new T.TorusGeometry(.14, .008, 6, 18), M.darkSteel, dx, .06, 0, 0, Math.PI / 2); w.scale.set(1, .75, 1); }
    const slingA = mesh(loadG, new T.CylinderGeometry(.012, .012, 1, 6), M.darkSteel), slingB = mesh(loadG, new T.CylinderGeometry(.012, .012, 1, 6), M.darkSteel);
    const rope = mesh(scene, new T.CylinderGeometry(.014, .014, 1, 6), M.darkSteel); rope.userData.pick = 'load';
    const trolley = group(scene, 'load');
    box(trolley, .9, .35, .7, M.yellow, 0, 0, 0); for (const s of [-1, 1]) cyl(trolley, .1, .06, M.darkSteel, s * .3, .2, 0, 14).rotation.x = Math.PI / 2;

    /* —— 工人 —— */
    function worker(vest = M.hivis) {
      const g = new T.Group(), legs = [];
      for (const s of [-1, 1]) {
        const leg = new T.Group(); leg.position.set(s * .11, .86, 0); g.add(leg);
        mesh(leg, new T.CapsuleGeometry(.075, .62, 4, 10), M.jeans, 0, -.4, 0); box(leg, .13, .1, .26, M.boots, 0, -.81, .05); legs.push(leg);
      }
      mesh(g, new T.CapsuleGeometry(.19, .36, 4, 12), M.jeans, 0, 1.12, 0).scale.set(1, 1, .7);
      mesh(g, new T.CapsuleGeometry(.205, .34, 4, 12), vest, 0, 1.24, 0).scale.set(1, 1, .72);
      for (const y of [1.12, 1.3]) mesh(g, new T.CylinderGeometry(.208, .208, .035, 18), M.reflect, 0, y, 0).scale.set(1, 1, .72);
      const arms = [];
      for (const s of [-1, 1]) { const arm = new T.Group(); arm.position.set(s * .26, 1.42, 0); g.add(arm); mesh(arm, new T.CapsuleGeometry(.06, .5, 4, 8), vest, 0, -.3, 0); mesh(arm, new T.SphereGeometry(.055, 10, 8), M.skin, 0, -.62, 0); arms.push(arm); }
      mesh(g, new T.CylinderGeometry(.06, .07, .08, 10), M.skin, 0, 1.55, 0);
      mesh(g, new T.SphereGeometry(.12, 18, 14), M.skin, 0, 1.68, 0);
      mesh(g, new T.SphereGeometry(.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.helmet, 0, 1.72, 0);
      mesh(g, new T.CylinderGeometry(.17, .17, .015, 24), M.helmet, 0, 1.72, .02);
      g.userData = {legs, arms}; g.traverse(x => { if (x.isMesh) x.castShadow = true; }); scene.add(g); return g;
    }
    const walker = worker(), operator = worker();
    operator.position.set(L.bender.x - .9, 0, L.bender.z - .1); operator.rotation.y = Math.PI / 2;

    /* —— 外部网格：挖掘机、塔吊 —— */
    const machines = {excavator: null, crane: null};
    const craneG = group(scene, null); craneG.position.copy(L.mast);
    const dir = L.loadAt.clone().sub(L.mast).setY(0), R = dir.length(), theta = Math.atan2(-dir.z, dir.x);
    craneG.rotation.y = theta;
    const local = (r, y) => V(Math.cos(theta) * r, y, -Math.sin(theta) * r).add(L.mast);
    let jibY = 23.9;
    // 挖掘机：第二章 2-1 的同一台（build.mjs 内联 createExcavator，回转平台以上归入 upper 组）。
    // 回转中心放在原布局的回转位置，整机约 8.5 m 长（工作装置抬起），朝 +x。
    const exG = group(scene, 'swing'); exG.position.set(L.excavator.x - 1.3, 0, L.excavator.z);
    let exc = null, exUpper = null;
    try {
      exc = global.createExcavator(T, scene, renderer);
      const rig = global.__excavatorRig;
      exc.update(0, {amount: 1, running: false, speed: 0, xray: false, tracks: false, smoke: false});
      scene.remove(rig.root); exG.add(rig.root); exUpper = rig.upper;
      rig.root.updateMatrixWorld(true);
      const eb = new T.Box3().setFromObject(rig.root);
      rig.root.position.y = -eb.min.y;
      exG.scale.setScalar(8.5 / Math.max(eb.max.x - eb.min.x, .1));
      machines.excavator = rig;
    } catch (err) { console.warn('8-1 挖掘机未能生成', err); }
    const loading = document.createElement('div'); loading.className = 'c8-loading'; loading.textContent = '正在载入塔吊模型…'; host.append(loading);
    const placeMachine = (m, at, ry) => {
      const s = m.root.scale.x, wrap = new T.Group(); wrap.scale.setScalar(1 / s); wrap.add(m.root); wrap.position.copy(at); wrap.rotation.y = ry; return wrap;
    };
    api.ready = (async () => {
      try {
        const cr = await CourseImportedMachinery.load('crane');
        const s = cr.root.scale.x, mastLocal = -1.44 / s;
        const cw = placeMachine(cr, V(-mastLocal, 0, 0), 0); craneG.add(cw); machines.crane = cr;
        scene.updateMatrixWorld(true);
        // 原模型的小车和吊钩位置固定：取它的顶部高度放自绘小车，再把原吊钩藏起来
        const hb = new T.Box3(); cr.root.traverse(n => { if (n.name === 'hook') { hb.union(new T.Box3().setFromObject(n)); n.visible = false; } });
        if (!hb.isEmpty()) jibY = hb.max.y - .35;
        cr.pose(0, {manual: {slew: 0}});
      } catch (err) { console.warn('8-1 外部模型未能载入', err); loading.textContent = '塔吊模型未能载入；其余现场照常可用。'; return; }
      loading.remove(); dirty = true;
    })();

    /* —— 危险定位：标签、地面光圈、近看位置 —— */
    const anchors = {
      electric: V(pd.x - .2, .9, pd.z), swing: L.excavator.clone().add(V(-1.2, 4.2, 0)), belt: V(bp.x, 1.5, bp.z + .3),
      load: V(la.x, 0, la.z), opening: V(o.x, .9, o.z), pressure: V(sp.x, 1.5, sp.z),
    };
    const focusAt = {electric: [V(pd.x - 1.5, .5, pd.z), 9], swing: [L.excavator.clone().add(V(0, 1.5, 0)), 20], belt: [V(bp.x, .6, bp.z + .3), 5.5],
      load: [V(la.x, 3, la.z), 17], opening: [V(o.x, 0, o.z), 9], pressure: [V(sp.x - 1.2, .4, sp.z - 1.2), 7.5]};
    const ringAt = {electric: [pd, 2.2], swing: [L.excavator.clone().add(V(-1.3, 0, 0)), 6.4], belt: [bp, 1.4], load: [la, 3.2], opening: [V(o.x, 0, o.z), 1.9], pressure: [V(sp.x - 1, 0, sp.z - 1), 2.4]};
    const rings = {}, labels = {};
    for (const id of Object.keys(anchors)) {
      const [c, r] = ringAt[id];
      const ring = mesh(scene, new T.RingGeometry(r - .12, r, 64), M.ring, c.x, .02, c.z, -Math.PI / 2); ring.castShadow = false; ring.receiveShadow = false; ring.visible = false; rings[id] = ring;
      const el = document.createElement('button'); el.type = 'button'; el.className = 'c8-pin'; el.hidden = true; el.dataset.id = id;
      el.addEventListener('click', e => { e.stopPropagation(); api.onPick?.(id, true); });
      overlay.append(el); labels[id] = el;
    }

    /* —— 相机：拖动旋转、滚轮缩放、平滑切换视角 —— */
    const cam = {target: V(-1, .5, .3), dist: 33, az: .5, el: .56};
    const want = {target: cam.target.clone(), dist: cam.dist, az: cam.az, el: cam.el};
    const VIEWS = {home: {target: V(-1, .5, .3), dist: 33, az: .5, el: .56}, top: {target: V(-.5, 0, 0), dist: 40, az: .02, el: 1.45}};
    api.view = name => { const v = VIEWS[name] || VIEWS.home; want.target.copy(v.target); want.dist = v.dist; want.az = v.az; want.el = v.el; dirty = true; };
    api.focus = id => { const f = focusAt[id]; if (!f) return; want.target.copy(f[0]); want.dist = f[1]; want.el = clamp(want.el, .35, .75); dirty = true; };
    const placeCam = () => {
      camera.position.set(cam.target.x + Math.sin(cam.az) * Math.cos(cam.el) * cam.dist, cam.target.y + Math.sin(cam.el) * cam.dist, cam.target.z + Math.cos(cam.az) * Math.cos(cam.el) * cam.dist);
      camera.lookAt(cam.target);
    };
    const el = renderer.domElement; let drag = null;
    host.addEventListener('pointerdown', e => { if (e.target !== el) return; drag = {x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY}; el.setPointerCapture?.(e.pointerId); });
    host.addEventListener('pointermove', e => {
      if (!drag) { hover(e); return; }
      want.az -= (e.clientX - drag.x) * .006; want.el = clamp(want.el + (e.clientY - drag.y) * .005, .08, 1.48);
      drag.x = e.clientX; drag.y = e.clientY; dirty = true;
    });
    host.addEventListener('pointerup', e => { if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) pick(e); drag = null; });
    host.addEventListener('pointercancel', () => { drag = null; });
    host.addEventListener('wheel', e => { e.preventDefault(); want.dist = clamp(want.dist * Math.exp(e.deltaY * .0012), 4, 80); dirty = true; }, {passive: false});
    host.tabIndex = 0;
    host.addEventListener('keydown', e => {
      const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 'Home'].includes(k)) return; e.preventDefault();
      if (k === 'Home') api.view('home'); if (k === 'ArrowLeft') want.az += .12; if (k === 'ArrowRight') want.az -= .12;
      if (k === 'ArrowUp') want.el = clamp(want.el + .1, .08, 1.48); if (k === 'ArrowDown') want.el = clamp(want.el - .1, .08, 1.48);
      if (k === '+' || k === '=') want.dist = clamp(want.dist * .88, 4, 80); if (k === '-') want.dist = clamp(want.dist * 1.12, 4, 80); dirty = true;
    });
    const ray = new T.Raycaster(), ptr = new T.Vector2();
    const hit = e => {
      const r = el.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(ptr, camera);
      for (const h of ray.intersectObjects(scene.children, true)) {
        if (!h.object.visible || h.object === ground) return {id: null};
        let n = h.object; while (n && !n.userData.pick) n = n.parent;
        let vis = true; for (let p = h.object; p; p = p.parent) if (!p.visible) vis = false;
        if (!vis) continue;
        return {id: n ? n.userData.pick : null};
      }
      return {id: null};
    };
    function pick(e) { api.onPick?.(hit(e).id, false); }
    let hoverT = 0;
    function hover(e) { const now = performance.now(); if (now - hoverT < 60) return; hoverT = now; el.style.cursor = hit(e).id ? 'pointer' : 'grab'; }

    /* —— 状态 → 画面 —— */
    let S = null, lastSeq = -1, hornT = 9, siteT = 0, dirty = true, walkT = 0, loadY = L.hungY, needleA = .62, valveA = 0, guardK = 0;
    api.update = state => {
      const prev = S; S = state; dirty = true;
      lockout.visible = S.power === 'locked';
      lamp.material.emissiveIntensity = S.power === 'on' ? .9 : 0; lamp.material.color.setHex(S.power === 'on' ? 0x39c46e : 0x55606a);
      oldCable.visible = !S.fixed.electric; newCable.visible = S.fixed.electric;
      swingFence.visible = S.fixed.swing; lanes.A.visible = !S.fixed.swing; lanes.B.visible = S.fixed.swing;
      loadCordon.visible = S.fixed.load; openFix.visible = S.fixed.opening; pitG.children.forEach(c => { if (c !== pitHit) c.visible = !S.fixed.opening; });
      couplingMat.color.setHex(S.fixed.pressure ? 0x7fae8f : 0xb97d31); wet.visible = !S.fixed.pressure;
      M.mushroom.emissiveIntensity = S.latched ? .9 : 0; mushroom.position.z = L.estop.z + (S.latched ? .07 : .1);
      if (prev && S.started && !prev.started) hornT = 0;
      lastSeq = S.seq;
      for (const id of Object.keys(rings)) {
        const f = S.found[id], v = S.verified[id];
        rings[id].visible = f; rings[id].material = v ? M.ringOk : M.ring;
        const lab = labels[id]; lab.hidden = !f;
        const h = SafetyModel.hazards.find(x => x.id === id);
        lab.className = 'c8-pin' + (v ? ' ok' : S.fixed[id] ? ' fixed' : '') + (S.selected === id ? ' on' : '');
        const txt = (v ? '✓ ' : h.icon + ' ') + h.label; if (lab.textContent !== txt) lab.textContent = txt;
      }
    };
    api.labelsVisible = on => { overlay.hidden = !on; };

    /* —— 渲染循环 —— */
    const routeLen = r => r.reduce((s, p, i) => i ? s + p.distanceTo(r[i - 1]) : 0, 0) + r[r.length - 1].distanceTo(r[0]);
    const along = (r, d) => {
      const n = r.length; let t = d % routeLen(r);
      for (let i = 0; i < n; i++) { const a = r[i], b = r[(i + 1) % n], l = a.distanceTo(b); if (t <= l) return {p: a.clone().lerp(b, t / l), dir: b.clone().sub(a).normalize()}; t -= l; }
      return {p: r[0].clone(), dir: V(1, 0, 0)};
    };
    function resize() {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false); el.style.width = '100%'; el.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true;
    }
    new ResizeObserver(resize).observe(host); resize();
    const tmp = V();
    function frame(dt) {
      const running = !!S?.running, motion = !(api.paused);
      if (running && motion) siteT += dt;
      // 相机缓动
      const k = 1 - Math.pow(.0015, dt);
      const before = cam.dist + cam.az + cam.el + cam.target.x + cam.target.y + cam.target.z;
      cam.target.lerp(want.target, k); cam.dist += (want.dist - cam.dist) * k; cam.az += (want.az - cam.az) * k; cam.el += (want.el - cam.el) * k;
      const moving = Math.abs(before - (cam.dist + cam.az + cam.el + cam.target.x + cam.target.y + cam.target.z)) > 1e-4;
      placeCam();
      // 机械动作
      if (exUpper) exUpper.rotation.y = rad(58 * Math.sin(siteT * .45));
      for (const [i, p] of pulleys.entries()) if (running && S.power === 'on' && motion) p.rotation.z -= dt * (i ? 9 : 17);
      if (running && motion) disk.rotation.y += dt * .8;
      // 吊物升降与摆动
      const targetY = S?.load === 'down' ? .22 : L.hungY; loadY += (targetY - loadY) * (1 - Math.pow(.25, dt));
      const sway = running ? Math.sin(siteT * 1.3) * .05 : 0;
      loadG.position.set(la.x, loadY, la.z); loadG.rotation.set(sway * .3, 0, sway);
      hook.position.set(0, 1.9, 0); bundle.position.set(0, -.05, 0);
      const hookTop = loadG.localToWorld(V(0, 2.75, 0));
      const tp = local(R, jibY); trolley.position.copy(tp).add(V(0, .1, 0)); trolley.rotation.y = theta;
      rope.position.copy(tp).add(hookTop).multiplyScalar(.5); rope.scale.y = tp.distanceTo(hookTop); rope.quaternion.setFromUnitVectors(V(0, 1, 0), tp.clone().sub(hookTop).normalize());
      for (const [sl, x] of [[slingA, -2.2], [slingB, 2.2]]) { const a = V(0, 2.05, 0), b = V(x, .1, 0); sl.position.copy(a).add(b).multiplyScalar(.5); sl.scale.y = a.distanceTo(b); sl.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); }
      // 压力表、泄压阀、渗漏
      const press = S?.pressure !== false;
      needleA += ((press ? .62 + (running ? Math.sin(siteT * 9) * .03 : 0) : -1.18) - needleA) * (1 - Math.pow(.05, dt));
      needle.rotation.z = -needleA - .58;
      valveA += ((press ? 0 : -Math.PI / 2) - valveA) * (1 - Math.pow(.05, dt)); valve.rotation.y = valveA;
      mist.visible = press && !S?.fixed.pressure;
      if (mist.visible) for (const d of drops) { const t = (performance.now() / 1000 * (running ? 1.4 : .6) + d.userData.seed) % 1; d.position.set(Math.sin(d.userData.seed * 7) * .12 * t, .05 + t * .5, Math.cos(d.userData.seed * 5) * .12 * t); d.scale.setScalar(.6 + t * 1.6); }
      M.mist.opacity = .45;
      pumpCyl.position.y = .78 + (running && press ? Math.sin(siteT * 14) * .02 : 0);
      // 防护罩：处置后从地上装回
      guardK += ((S?.fixed.belt ? 1 : 0) - guardK) * (1 - Math.pow(.02, dt));
      guard.position.lerpVectors(guardOff.p, guardOn.p, guardK); guard.rotation.set(guardOff.r.x * (1 - guardK), 0, guardOff.r.z * (1 - guardK));
      // 电缆火花
      spark.material.opacity = (!S?.fixed.electric && S?.power === 'on' && Math.random() < .08) ? .9 : 0;
      // 警示灯与鸣笛
      if (running && motion) reflector.rotation.y += dt * 6;
      M.beacon.emissiveIntensity = running ? 1.4 + Math.sin(performance.now() / 120) * .6 : .05;
      hornT += dt; horn.material.opacity = hornT < 1.6 ? (1 - hornT / 1.6) * .8 : 0; horn.scale.setScalar(1 + hornT * 3); horn.lookAt(camera.position);
      // 工人
      const route = S?.fixed.swing ? ROUTE_B : ROUTE_A;
      if (running && motion) walkT += dt * 1.25;
      const w = along(route, walkT); walker.position.copy(w.p); walker.rotation.y = Math.atan2(w.dir.x, w.dir.z);
      const step = running && motion ? Math.sin(walkT * 5.2) : 0;
      walker.userData.legs[0].rotation.x = step * .5; walker.userData.legs[1].rotation.x = -step * .5; walker.userData.arms[0].rotation.x = -step * .4; walker.userData.arms[1].rotation.x = step * .4;
      const work = running && motion ? Math.sin(siteT * 3) : 0;
      operator.userData.arms[0].rotation.x = -.9 + work * .2; operator.userData.arms[1].rotation.x = -.9 - work * .2;
      // 标签跟随
      const r = el.getBoundingClientRect();
      for (const id in labels) {
        const lab = labels[id]; if (lab.hidden) continue;
        tmp.copy(id === 'load' ? V(la.x, loadY + 2.9, la.z) : anchors[id]).project(camera);
        const behind = tmp.z > 1; lab.style.visibility = behind ? 'hidden' : '';
        lab.style.transform = `translate(${(tmp.x * .5 + .5) * r.width}px, ${(-tmp.y * .5 + .5) * r.height}px) translate(-50%, -120%)`;
      }
      for (const id in rings) if (rings[id].visible) rings[id].material.opacity = S?.verified[id] ? .6 : .45 + Math.sin(performance.now() / 260) * .3;
      return running || moving || hornT < 1.6 || Math.abs(loadY - targetY) > .005 || Math.abs(guardK - (S?.fixed.belt ? 1 : 0)) > .002;
    }
    let last = 0, lastRaf = 0;
    // 每次出图前核对画布尺寸：外壳搬动三维区、面板隐藏时 ResizeObserver 可能迟迟不回调，首屏会画在 1×1 的画布上
    const fit = () => { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return false; const c = renderer.getSize(new T.Vector2()); if (c.x !== w || c.y !== h) resize(); return true; };
    const draw = dt => { const active = frame(dt); if (fit()) renderer.render(scene, camera); api.frames = (api.frames || 0) + 1; dirty = active; };
    const loop = now => {
      requestAnimationFrame(loop); lastRaf = performance.now();
      const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
      if (document.hidden) return;
      draw(dt);
    };
    requestAnimationFrame(loop);
    // 面板被隐藏或后台节流时 requestAnimationFrame 会停：退回定时器，画面不至于空白
    setInterval(() => { if (performance.now() - lastRaf > 400) { last = 0; draw(.1); } }, 200);

    /* —— 深浅色 —— */
    api.theme = dark => {
      scene.fog = new T.Fog(0, 80, 190); StageTone.paint(scene, T); ground.material.color.setHex(dark ? 0x7d7a74 : 0xffffff);
      hemi.intensity = dark ? .8 : 1.25; sun.intensity = dark ? 1.8 : 2.6; renderer.toneMappingExposure = dark ? .9 : .98; dirty = true;
    };
    api.debug = {scene, camera, gun, sprayer};
    api.renderNow = (dt = 0) => { frame(dt); fit(); renderer.render(scene, camera); };
    api.stats = () => ({webgl: true, frames: api.frames || 0, machines: Object.keys(machines).filter(k => machines[k]).length});
    return api;
  }

  global.SiteScene = {create};
})(window);
