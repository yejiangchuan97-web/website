/* 任务 8-2 工位④ 砂浆管道清洗：新做的教学用螺杆式砂浆泵（通用造型，不对应任何品牌机型）。
 * 尺寸按 mm 级比例建模（场景单位为 m）：机架与轮子、带格栅和搅拌轴的料斗、减速电机、螺杆泵（定子/转子，剖开一角）、
 * 出口压力表与泄压口、四段输浆管与管卡、喷枪与喷嘴、清水桶、沉淀桶、下水口、清洗球。
 * 管段颜色表示管内残浆的变硬程度（课堂示意）；输浆管画成半透明，便于看到管内。
 */
(function () {
  'use strict';
  const reg = window.MaintFlush = window.MaintFlush || {};

  reg.mortar = function (ctx) {
    const {T, mesh, cyl, box, tag, bayLines, M} = ctx;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const group = new T.Group();
    const std = (c, r = .5, m = .1, o = {}) => new T.MeshStandardMaterial({color: c, roughness: r, metalness: m, ...o});
    const MAT = {
      body: std(0x2f6aa8, .42, .25), bodyDark: std(0x1f4b7a, .5, .25), frame: std(0x3b4148, .5, .5),
      hopper: std(0xb8c1ca, .38, .75, {side: T.DoubleSide}), cut: std(0xf3d2b0, .7, 0),              // 剖切面：浅杏色
      statorRubber: std(0x22262b, .85, 0, {side: T.DoubleSide}), rotor: std(0xd8dee4, .18, .95),
      mortarWet: std(0x8b7f6c, .9, 0), mortarCrust: std(0xb3aa98, 1, 0), water: new T.MeshPhysicalMaterial({color: 0x9cc6da, roughness: .05, transparent: true, opacity: .7, clearcoat: 1}),
      hose: new T.MeshPhysicalMaterial({color: 0x23272c, roughness: .55, transparent: true, opacity: .3, depthWrite: false}),
      sponge: std(0xe5542e, .95, 0), bucket: std(0x2f7fc9, .45, 0, {side: T.DoubleSide}), tank: std(0x7b858e, .55, 0, {side: T.DoubleSide}),
      skin: std(0xe0b48f, .7, 0), vest: std(0xf08a1c, .7, 0), helmet: std(0xf4c21c, .35, .05), pants: std(0x30455e, .8, 0),
    };

    /* ===== 机架、轮子、支腿 ===== */
    const pump = new T.Group(); group.add(pump);
    const RAIL_Y = .4;
    for (const z of [-.26, .26]) box(pump, 1.3, .05, .05, [.05, RAIL_Y, z], MAT.frame);
    for (const x of [-.55, -.2, .3, .65]) box(pump, .05, .05, .57, [x, RAIL_Y, 0], MAT.frame);
    cyl(pump, .025, .9, [-.35, .2, 0], M.steel, [Math.PI / 2, 0, 0], 16);                        // 车轴
    for (const z of [-.42, .42]) {
      const wh = new T.Group(); wh.position.set(-.35, .2, z); pump.add(wh);
      mesh(wh, new T.TorusGeometry(.15, .055, 14, 36), M.rubber);
      cyl(wh, .11, .07, [0, 0, 0], std(0x8f99a3, .4, .7), [Math.PI / 2, 0, 0], 24);
      cyl(wh, .035, .09, [0, 0, 0], M.dark, [Math.PI / 2, 0, 0], 16);
      box(pump, .05, .22, .03, [-.35, .3, z - Math.sign(z) * .07], MAT.frame);
    }
    box(pump, .05, .38, .05, [.62, .2, 0], MAT.frame); cyl(pump, .07, .02, [.62, .01, 0], M.dark, [0, 0, 0], 20);   // 前支腿
    box(pump, .5, .04, .04, [.95, RAIL_Y - .05, 0], MAT.frame); mesh(pump, new T.TorusGeometry(.04, .012, 8, 20), M.steel, [1.22, RAIL_Y - .05, 0], [Math.PI / 2, 0, 0]);   // 牵引杆

    /* ===== 料斗（方锥形）+ 格栅 + 搅拌轴 ===== */
    const HX = -.05, HB = .62, HT = 1.0, RTOP = .32, RBOT = .15;
    const frustum = (rt, rb, h, open) => { const g = new T.CylinderGeometry(rt * Math.SQRT2, rb * Math.SQRT2, h, 4, 1, open); g.rotateY(Math.PI / 4); return g; };
    const hop = mesh(pump, frustum(RTOP, RBOT, HT - HB, true), MAT.hopper, [HX, (HB + HT) / 2, 0]);
    box(pump, RBOT * 2, .012, RBOT * 2, [HX, HB, 0], MAT.hopper);
    for (const [x, z, w, d] of [[0, -RTOP, RTOP * 2 + .04, .03], [0, RTOP, RTOP * 2 + .04, .03], [-RTOP, 0, .03, RTOP * 2], [RTOP, 0, .03, RTOP * 2]]) box(pump, w, .03, d, [HX + x, HT, z], MAT.body);
    const grille = new T.Group(); pump.add(grille);
    for (let i = -3; i <= 3; i++) { box(grille, RTOP * 2, .012, .012, [HX, HT + .012, i * .085], M.steel); box(grille, .012, .012, RTOP * 2, [HX + i * .085, HT + .024, 0], M.steel); }
    const shaft = new T.Group(); shaft.position.set(HX, .74, 0); pump.add(shaft);
    cyl(shaft, .02, .48, [0, 0, 0], M.steel, [0, 0, Math.PI / 2], 16);
    for (let i = 0; i < 4; i++) { const b = new T.Group(); b.position.x = -.16 + i * .105; b.rotation.x = i * Math.PI / 2; shaft.add(b); box(b, .014, .13, .05, [0, .07, 0], M.steel).rotation.y = .5; }
    // 料斗里的砂浆（液位可变）、午休结块、冲洗时的清水
    let fill = null; let fillLevel = -1;
    function setFill(k, mat) {
      k = clamp(k, 0, 1); if (fill && Math.abs(k - fillLevel) < .01 && fill.material === mat) return; fillLevel = k;
      if (fill) { pump.remove(fill); fill.geometry.dispose(); fill = null; }
      if (k < .02) return;
      const h = (HT - HB - .03) * k, rt = RBOT + (RTOP - RBOT) * (h / (HT - HB));
      fill = mesh(pump, frustum(rt - .006, RBOT - .006, h, false), mat, [HX, HB + h / 2, 0]);
    }
    const crust = new T.Group(); pump.add(crust);
    for (const [x, y, z, ry, s] of [[-.21, .85, .08, Math.PI / 2, 1], [.12, .8, -.12, -Math.PI / 2, .8], [-.05, .9, -.25, 0, 1.2], [.02, .7, .17, Math.PI, .7]]) {
      const g = new T.Mesh(new T.SphereGeometry(.07, 10, 6), MAT.mortarCrust); g.scale.set(s * 1.2, s * .6, .25); g.position.set(HX + x, y, z); g.rotation.y = ry; crust.add(g);
    }

    /* ===== 减速电机（料斗后面）+ 电控箱 ===== */
    box(pump, .14, .2, .2, [-.48, .74, 0], MAT.bodyDark);
    cyl(pump, .085, .26, [-.68, .74, 0], MAT.body, [0, 0, Math.PI / 2], 28);
    for (let i = 0; i < 10; i++) box(pump, .22, .01, .01, [-.68, .74 + Math.cos(i / 10 * Math.PI * 2) * .087, Math.sin(i / 10 * Math.PI * 2) * .087], MAT.bodyDark);
    cyl(pump, .07, .04, [-.83, .74, 0], M.dark, [0, 0, Math.PI / 2], 24);
    box(pump, .2, .06, .2, [-.62, .62, 0], MAT.frame);
    const ebox = new T.Group(); ebox.position.set(-.3, .52, .32); pump.add(ebox);
    box(ebox, .26, .2, .08, [0, 0, 0], std(0xe8ecef, .5, .1));
    const knob = new T.Group(); knob.position.set(-.06, .02, .045); ebox.add(knob);
    cyl(knob, .03, .02, [0, 0, 0], M.red, [Math.PI / 2, 0, 0], 18); box(knob, .07, .016, .02, [0, 0, .012], M.red);
    cyl(ebox, .018, .012, [.07, .04, .045], M.yellow, [Math.PI / 2, 0, 0], 16); cyl(ebox, .014, .02, [.07, .04, .05], M.red, [Math.PI / 2, 0, 0], 16);   // 急停
    const lamp = cyl(ebox, .01, .01, [.07, -.05, .045], std(0x35c46a, .3, 0, {emissive: 0x1d8c47, emissiveIntensity: .8}), [Math.PI / 2, 0, 0], 12);
    const mTag = tag('禁止合闸', .12); mTag.position.set(-.06, -.09, .05); ebox.add(mTag); mTag.visible = false;

    /* ===== 螺杆泵：吸入室（料斗下）→ 定子（剖开一角，见橡胶衬套与螺旋转子）→ 出料端 ===== */
    const PY = .5;
    box(pump, .2, .14, .16, [HX, .55, 0], MAT.body);                                                 // 吸入室
    const S0 = .1, S1 = .58;                                                                          // 定子两端 x
    const sLen = S1 - S0, sMid = (S0 + S1) / 2;
    const cutStart = Math.PI * .25, keep = Math.PI * 1.5;                                             // 剖开前上方一角（90°）
    const statorOuter = new T.Mesh(new T.CylinderGeometry(.065, .065, sLen, 36, 1, true, cutStart + Math.PI / 2, keep), std(0x2f6aa8, .4, .4, {side: T.DoubleSide}));
    statorOuter.rotation.z = Math.PI / 2; statorOuter.position.set(sMid, PY, 0); pump.add(statorOuter); statorOuter.castShadow = true;
    const statorIn = new T.Mesh(new T.CylinderGeometry(.052, .052, sLen, 36, 1, true, cutStart + Math.PI / 2, keep), MAT.statorRubber);
    statorIn.rotation.z = Math.PI / 2; statorIn.position.copy(statorOuter.position); pump.add(statorIn);
    for (const a of [cutStart, cutStart + keep]) {                                                    // 剖切面（浅杏色）
      const face = new T.Mesh(new T.PlaneGeometry(sLen, .013), MAT.cut); face.position.set(sMid, PY + Math.cos(a + Math.PI / 2) * 0, 0);
      const r = .0585; face.position.y = PY + Math.sin(a) * r; face.position.z = Math.cos(a) * r; face.rotation.x = -a; face.material.side = T.DoubleSide; pump.add(face);
    }
    for (const x of [S0, S1]) cyl(pump, .085, .03, [x, PY, 0], MAT.bodyDark, [0, 0, Math.PI / 2], 28);  // 端法兰
    for (const [y, z] of [[.075, .075], [.075, -.075], [-.075, .075], [-.075, -.075]]) cyl(pump, .007, sLen + .06, [sMid, PY + y, z], M.steel, [0, 0, Math.PI / 2], 8);   // 拉杆
    const rotor = new T.Group(); rotor.position.set(sMid, PY, 0); pump.add(rotor);
    {
      const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * Math.PI * 2 * 3; pts.push(new T.Vector3(-sLen / 2 + t * sLen, Math.cos(a) * .014, Math.sin(a) * .014)); }
      mesh(rotor, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, .026, 16), MAT.rotor);
    }
    // 出料端：弯头上接压力表，下接泄压口（红手柄球阀），再接第一道管卡
    const OUT = new T.Vector3(.72, PY, 0);
    cyl(pump, .045, .14, [.65, PY, 0], MAT.body, [0, 0, Math.PI / 2], 24);
    cyl(pump, .012, .06, [.66, PY + .07, 0], M.steel, [0, 0, 0], 12);
    const gauge = new T.Group(); gauge.position.set(.66, PY + .14, 0); pump.add(gauge);
    {
      cyl(gauge, .05, .03, [0, 0, 0], M.steel, [Math.PI / 2, 0, 0], 32);
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#f7f7f2'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
      x.lineWidth = 16; x.strokeStyle = '#2e9e6b'; x.beginPath(); x.arc(128, 128, 96, Math.PI * .75, Math.PI * (.75 + 1.5 * .5)); x.stroke();
      x.strokeStyle = '#e0a020'; x.beginPath(); x.arc(128, 128, 96, Math.PI * (.75 + 1.5 * .5), Math.PI * (.75 + 1.5 * .8)); x.stroke();
      x.strokeStyle = '#d6453b'; x.beginPath(); x.arc(128, 128, 96, Math.PI * (.75 + 1.5 * .8), Math.PI * 2.25); x.stroke();
      x.fillStyle = '#17324f'; x.font = 'bold 28px sans-serif'; x.textAlign = 'center';
      for (let i = 0; i <= 10; i += 2) { const a = Math.PI * (.75 + 1.5 * i / 10); x.fillText(String(i), 128 + Math.cos(a) * 66, 138 + Math.sin(a) * 66); }
      x.font = 'bold 22px "PingFang SC","Microsoft YaHei",sans-serif'; x.fillText('格（示意）', 128, 200);
      const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
      const face = new T.Mesh(new T.CircleGeometry(.044, 40), new T.MeshStandardMaterial({map: t, roughness: .4})); face.position.z = .016; gauge.add(face);
    }
    const needle = new T.Group(); needle.position.z = .018; gauge.add(needle);
    box(needle, .004, .036, .002, [0, .016, 0], M.red); cyl(needle, .005, .004, [0, 0, 0], M.dark, [Math.PI / 2, 0, 0], 12);
    const relief = new T.Group(); relief.position.set(.66, PY - .07, .03); pump.add(relief);
    cyl(relief, .016, .05, [0, 0, 0], M.brass, [0, 0, 0], 16); cyl(relief, .012, .04, [0, -.04, .01], M.brass, [Math.PI / 4, 0, 0], 12);
    const rLever = new T.Group(); rLever.position.set(0, .0, .02); relief.add(rLever); box(rLever, .09, .012, .012, [.04, 0, 0], M.red);
    const drainPlug = new T.Group(); drainPlug.position.set(.36, PY - .07, 0); pump.add(drainPlug);
    cyl(drainPlug, .014, .025, [0, 0, 0], M.brass, [0, 0, 0], 6);
    const drip = mesh(group, new T.SphereGeometry(.012, 10, 8), MAT.water, [.36, PY - .1, 0]); drip.visible = false;
    const reliefDrip = mesh(group, new T.SphereGeometry(.014, 10, 8), MAT.mortarWet, [.67, PY - .14, .05]); reliefDrip.visible = false;

    /* ===== 输浆管：四段，接头处是管卡 ===== */
    const Y = .04;
    const SEG_PTS = [
      [OUT, new T.Vector3(.86, PY - .05, .02), new T.Vector3(1.06, .14, .14), new T.Vector3(1.26, Y, .45), new T.Vector3(1.3, Y, .85)],
      [new T.Vector3(1.3, Y, .85), new T.Vector3(1.15, Y, 1.2), new T.Vector3(.75, Y, 1.4), new T.Vector3(.2, Y, 1.45)],
      [new T.Vector3(.2, Y, 1.45), new T.Vector3(-.35, Y, 1.42), new T.Vector3(-.8, Y, 1.3), new T.Vector3(-1.1, Y, 1.02)],
      [new T.Vector3(-1.1, Y, 1.02), new T.Vector3(-1.38, Y, .86), new T.Vector3(-1.52, Y, .62), new T.Vector3(-1.52, .22, .38)],
    ];
    const segs = SEG_PTS.map((pts, i) => {
      const curve = new T.CatmullRomCurve3(pts.map(p => p.clone()));
      const g = new T.Group(); group.add(g);
      const coreMat = MAT.mortarWet.clone();
      return {i, pts, curve, g, coreMat, outer: null, core: null, stiff: 0, built: -1, set: 0};
    });
    function straight(s, k) { const a = s.pts[0], b = s.pts.at(-1); return s.pts.map((p, j) => p.clone().lerp(a.clone().lerp(b, j / (s.pts.length - 1)), k * .55)); }
    function buildSeg(s, k) {
      if (Math.abs(s.built - k) < .02) return; s.built = k;
      s.curve = new T.CatmullRomCurve3(straight(s, k));
      for (const m of [s.outer, s.core]) if (m) { s.g.remove(m); m.geometry.dispose(); }
      const r = .027 * (1 + k * .12);
      s.outer = new T.Mesh(new T.TubeGeometry(s.curve, 48, r, 14), MAT.hose); s.outer.renderOrder = 2; s.g.add(s.outer);
      s.core = new T.Mesh(new T.TubeGeometry(s.curve, 48, .02, 10), s.coreMat); s.core.castShadow = true; s.g.add(s.core);
    }
    segs.forEach(s => buildSeg(s, 0));
    // 管卡：每段的两端各一个（带两只扳耳），打开时上半卡箍翻起
    const clamps = [];
    function clampAt(p, dir) {
      const g = new T.Group(); g.position.copy(p); g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir); group.add(g);
      const lower = new T.Mesh(new T.CylinderGeometry(.04, .04, .07, 24, 1, true, 0, Math.PI), M.steel); lower.material = M.steel; lower.material.side = T.DoubleSide; g.add(lower);
      const top = new T.Group(); g.add(top);
      mesh(top, new T.CylinderGeometry(.04, .04, .07, 24, 1, true, Math.PI, Math.PI), M.steel).material.side = T.DoubleSide;
      box(top, .02, .03, .03, [.045, 0, 0], M.steel); box(g, .02, .03, .03, [-.045, 0, 0], M.steel);
      const ring = new T.Mesh(new T.TorusGeometry(.03, .006, 8, 24), M.rubber); ring.rotation.x = Math.PI / 2; g.add(ring);
      clamps.push({g, top, ring}); return clamps.at(-1);
    }
    const segClamps = segs.map(s => { const c0 = s.curve.getPoint(.02), d0 = s.curve.getTangent(.02); const c1 = s.curve.getPoint(.98), d1 = s.curve.getTangent(.98); return [clampAt(c0, d0), clampAt(c1, d1)]; });

    /* ===== 喷枪 + 喷嘴（放在支架上，枪口朝向可选） ===== */
    const GUN_AT = new T.Vector3(-1.52, .3, .32);
    const gunG = new T.Group(); gunG.position.copy(GUN_AT); group.add(gunG);
    const gunBody = new T.Group(); gunG.add(gunBody);
    cyl(gunBody, .022, .42, [0, 0, -.21], M.steel, [Math.PI / 2, 0, 0], 18);
    mesh(gunBody, new T.CylinderGeometry(.012, .026, .05, 18), M.brass, [0, 0, -.445], [Math.PI / 2, 0, 0]);
    const gunNozzle = mesh(gunBody, new T.CylinderGeometry(.008, .012, .02, 14), M.dark, [0, 0, -.48], [Math.PI / 2, 0, 0]);
    box(gunBody, .03, .1, .03, [0, -.06, -.12], M.dark); cyl(gunBody, .01, .12, [0, .03, -.2], M.steel, [Math.PI / 2, 0, 0], 10); cyl(gunBody, .014, .03, [0, .03, -.27], M.brass, [0, Math.PI / 2, 0], 12);
    // 支架
    for (const s of [-1, 1]) mesh(group, new T.CylinderGeometry(.008, .008, .34, 8), M.dark, [GUN_AT.x + s * .08, .15, GUN_AT.z - .1], [0, 0, s * .4]);
    box(group, .04, .02, .04, [GUN_AT.x, .3, GUN_AT.z - .1], M.dark);

    /* ===== 清水桶、沉淀桶、下水口、旁边的人 ===== */
    function bucket(at, r, h, mat, label) {
      const g = new T.Group(); g.position.copy(at); group.add(g);
      mesh(g, new T.CylinderGeometry(r, r * .9, h, 36, 1, true), mat, [0, h / 2, 0]); cyl(g, r * .9, .012, [0, .006, 0], mat, [0, 0, 0], 36);
      mesh(g, new T.TorusGeometry(r, .014, 8, 40), mat, [0, h, 0], [Math.PI / 2, 0, 0]);
      const surf = new T.Mesh(new T.CircleGeometry(r * .97, 36), MAT.water.clone()); surf.rotation.x = -Math.PI / 2; g.add(surf);
      const layer = new T.Mesh(new T.CylinderGeometry(r * .88, r * .88, 1, 32), MAT.mortarWet.clone()); g.add(layer); layer.visible = false;
      if (label) {
        const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#17324f'; x.font = 'bold 46px "PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'center'; x.fillText(label, 128, 64);
        const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
        const plate = new T.Mesh(new T.CylinderGeometry(r * 1.004, r * .93, h * .26, 32, 1, true, -.5, 1), new T.MeshStandardMaterial({map: t, roughness: .6, transparent: true}));
        plate.position.y = h * .55; g.add(plate);
      }
      return {g, surf, layer, r, h, level(k, sed) {
        surf.position.y = Math.max(.014, h * k); surf.visible = k > .02;
        layer.visible = sed > .01; layer.scale.y = Math.max(.001, h * sed); layer.position.y = .012 + h * sed / 2;
      }};
    }
    const water = bucket(new T.Vector3(.3, 0, .74), .15, .34, MAT.bucket, '清水'); water.level(.75, 0);
    const tank = bucket(new T.Vector3(-1.52, 0, -.4), .27, .58, MAT.tank, '沉淀桶'); tank.level(.25, .06);
    const drainAt = new T.Vector3(-2.15, 0, .05);
    {
      const g = new T.Group(); g.position.copy(drainAt); group.add(g);
      box(g, .34, .012, .34, [0, .006, 0], M.dark);
      for (let i = -3; i <= 3; i++) box(g, .3, .016, .018, [0, .012, i * .045], M.steel);
    }
    const person = new T.Group(); person.position.set(-2.0, 0, 1.15); person.rotation.y = Math.PI * .8; group.add(person);
    {
      for (const s of [-1, 1]) { box(person, .12, .8, .14, [s * .1, .4, 0], MAT.pants); box(person, .13, .06, .22, [s * .1, .03, .04], M.dark); }
      mesh(person, new T.CapsuleGeometry(.17, .38, 6, 14), MAT.vest, [0, 1.1, 0]).scale.z = .65;
      for (const s of [-1, 1]) mesh(person, new T.CapsuleGeometry(.05, .5, 4, 10), MAT.vest, [s * .23, 1.05, 0], [0, 0, s * .1]);
      mesh(person, new T.SphereGeometry(.11, 18, 14), MAT.skin, [0, 1.52, 0]);
      mesh(person, new T.SphereGeometry(.125, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.helmet, [0, 1.56, 0]);
      cyl(person, .14, .012, [0, 1.565, .02], MAT.helmet, [0, 0, 0], 20);
    }

    /* ===== 清洗球（海绵球） ===== */
    const ball = mesh(group, new T.SphereGeometry(.036, 18, 14), MAT.sponge, [.3, .37, .74]);
    const BALL_REST = new T.Vector3(.3, .375, .74);
    // 出口流：喷枪口 → 目标（灰浆变清水）
    const flowMat = MAT.mortarWet.clone(); flowMat.transparent = true; flowMat.opacity = .9;
    let flow = null;
    bayLines(group, 4.6, 3.4);

    /* ===== 状态 → 画面 ===== */
    const AIM = {tank: tank.g.position.clone().add(new T.Vector3(0, .5, 0)), drain: drainAt.clone().add(new T.Vector3(0, .02, 0)), person: person.position.clone().add(new T.Vector3(0, 1.0, 0))};
    const COL = {wet: new T.Color(0x6c6152), hard: new T.Color(0xe6dfcf), water: new T.Color(0x9cc6da), jam: new T.Color(0xd6453b)};
    const look = {pressure: 6, relief: 0, knob: 0, aimQ: new T.Quaternion(), hopper: 1, ballT: -1, ballTo: 0, ballFrom: 0, flowT: -1, washT: -1, open: [0, 0, 0, 0]};
    const ballPath = (() => {                                                                       // 料斗口 → 泵内 → 四段管 → 枪口
      const pts = [new T.Vector3(HX, HT + .1, 0), new T.Vector3(HX, .62, 0), new T.Vector3(S0, PY, 0), new T.Vector3(S1, PY, 0)];
      segs.forEach(s => { for (let j = 0; j <= 12; j++) pts.push(s.curve.getPoint(j / 12)); });
      return pts;
    })();
    const ballLen = []; let total = 0; ballPath.forEach((p, i) => { if (i) total += p.distanceTo(ballPath[i - 1]); ballLen.push(total); });
    const segStart = i => ballLen[4 + i * 13 - 1] / total;
    function ballAt(u) { const d = u * total; let i = 1; while (i < ballLen.length - 1 && ballLen[i] < d) i++; const k = (d - ballLen[i - 1]) / Math.max(1e-6, ballLen[i] - ballLen[i - 1]); return ballPath[i - 1].clone().lerp(ballPath[i], clamp(k, 0, 1)); }
    let W0 = null;
    function aimQuat(w) {
      const target = AIM[w.aim] || GUN_AT.clone().add(new T.Vector3(-.2, -.1, -1));
      const dir = target.clone().sub(GUN_AT).normalize();
      return new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), dir);
    }
    function sync(w, state, ev) {
      const first = !W0; W0 = w;
      mTag.visible = w.isolated;
      crust.visible = w.scenario === 'lunch' && !w.hopper;
      if (first || ev?.type === 'case') {
        look.hopper = w.prepared ? (w.hopper ? 0 : .08) : .7; look.ballT = -1; look.flowT = -1; look.washT = -1; look.pressure = w.pressure;
        ball.position.copy(w.ball === 'out' ? tank.g.position.clone().add(new T.Vector3(.06, .2, .05)) : BALL_REST);
        look.aimQ.copy(aimQuat(w)); gunG.quaternion.copy(look.aimQ);
      }
      if (ev && !state.error && state.station === 'mortar') {
        if (ev.type === 'prepare') look.drain = 1;
        if (ev.type === 'hopper' || (ev.type === 'spot' && ev.point === 'hopper')) look.washT = 0;
        if (ev.type === 'ball' && w.ball === 'out') { look.ballFrom = 0; look.ballTo = 1; look.ballT = 0; look.flowT = 0; }
      }
      if (ev && state.station === 'mortar' && ev.type === 'ball' && w.ball === 'stuck') { look.ballFrom = 0; look.ballTo = Math.max(.08, segStart(w.ballAt) + .01); look.ballT = 0; }
      if (ev && state.station === 'mortar' && (ev.type === 'energy' || (ev.type === 'spot' && ev.point === 'relief')) && w.energy) look.reliefT = 0;
    }
    const tmp = new T.Color();
    function update(dt, now, w) {
      look.pressure = lerp(look.pressure, w.pressure + (w.ball === 'stuck' && w.pressure > 6 ? Math.sin(now * .03) * .25 : 0), 1 - Math.exp(-dt * 2.2));
      const a = (.75 + 1.5 * clamp(look.pressure, 0, 10) / 10) * Math.PI;           // 表盘：0 格在左下，10 格在右下
      needle.rotation.z = -(a - Math.PI * 1.5);
      look.relief = lerp(look.relief, w.energy ? Math.PI / 2 : 0, 1 - Math.exp(-dt * 6)); rLever.rotation.y = -look.relief;
      look.knob = lerp(look.knob, w.isolated ? Math.PI / 2 : 0, 1 - Math.exp(-dt * 6)); knob.rotation.z = look.knob;
      const running = !w.prepared || (look.ballT >= 0);
      lamp.material.emissiveIntensity = running ? .9 : 0; lamp.material.color.set(running ? 0x35c46a : 0x5b6570);
      if (running) { shaft.rotation.x += dt * 4; rotor.rotation.x += dt * 8; }
      // 料斗：运转中满料；停料后泵空；冲洗时短暂注水再放空
      const hopTarget = !w.prepared ? .7 : (w.hopper ? 0 : .08);
      look.hopper = lerp(look.hopper, hopTarget, 1 - Math.exp(-dt * 1.2));
      if (look.washT >= 0) { look.washT += dt; setFill(look.washT < 1.4 ? look.washT / 1.4 * .45 : Math.max(0, .45 - (look.washT - 1.4) * .3), MAT.water); if (look.washT > 3) look.washT = -1; }
      else setFill(look.hopper, w.scenario === 'lunch' && !w.hopper ? MAT.mortarCrust : MAT.mortarWet);
      // 管段：颜色 = 残浆变硬程度；推过球/敲通的段是清水；堵管且憋压时管子发硬变直
      const ballU = look.ballT >= 0 ? lerp(look.ballFrom, look.ballTo, ease(clamp(look.ballT, 0, 1))) : (w.ball === 'out' ? 1 : w.ball === 'stuck' ? segStart(w.ballAt) : 0);
      segs.forEach((s, i) => {
        const g = w.segs[i], jam = !g.clear && g.set >= 1, passed = ballU > (segStart(i) + (i < 3 ? segStart(i + 1) : 1)) / 2 && (w.ball === 'out' || look.ballT >= 0) && !(w.ball === 'stuck' && i >= w.ballAt);
        if (g.clear || passed) tmp.copy(COL.water); else tmp.copy(COL.wet).lerp(COL.hard, clamp(g.set, 0, 1));
        if (jam && w.ball === 'stuck' && w.pressure > 0) tmp.lerp(COL.jam, .45 + Math.sin(now * .008) * .2);
        s.coreMat.color.lerp(tmp, 1 - Math.exp(-dt * 4));
        s.coreMat.roughness = g.clear || passed ? .1 : .9;
        s.stiff = lerp(s.stiff, jam && w.pressure > 6 ? 1 : 0, 1 - Math.exp(-dt * 3)); buildSeg(s, s.stiff);
        look.open[i] = lerp(look.open[i], g.open ? 1 : 0, 1 - Math.exp(-dt * 6));
        for (const c of segClamps[i]) c.top.rotation.z = look.open[i] * 1.6;
        s.core.visible = !(g.open && g.clear);
      });
      // 清洗球动画
      if (look.ballT >= 0) { look.ballT += dt / 4.5; ball.position.copy(ballAt(lerp(look.ballFrom, look.ballTo, ease(clamp(look.ballT, 0, 1))))); if (look.ballT >= 1) { look.ballT = -1; if (w.ball === 'out') ball.position.copy(tank.g.position.clone().add(new T.Vector3(.06, .2, .05))); } }
      else if (w.ball === 'none') ball.position.lerp(BALL_REST, 1 - Math.exp(-dt * 4));
      // 喷枪朝向
      look.aimQ.slerp(aimQuat(w), 1 - Math.exp(-dt * 4)); gunG.quaternion.copy(look.aimQ);
      // 出口流：推球时先出灰浆、后出清水
      if (look.flowT >= 0) {
        look.flowT += dt; const k = clamp(look.flowT / 4.5, 0, 1);
        if (!flow || look.flowT < .05) {
          if (flow) { group.remove(flow); flow.geometry.dispose(); }
          const tip = gunNozzle.getWorldPosition(new T.Vector3()), dir = new T.Vector3(0, 0, -1).applyQuaternion(gunG.quaternion);
          const end = tank.g.position.clone().add(new T.Vector3(0, .32, 0));
          flow = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([tip, tip.clone().add(dir.multiplyScalar(.12)), end.clone().add(new T.Vector3(0, .12, 0)), end]), 20, .012, 8), flowMat); group.add(flow);
        }
        flowMat.color.copy(COL.wet).lerp(COL.water, k); flow.visible = look.flowT < 5.2;
        if (look.flowT > 5.4) look.flowT = -1;
      } else if (flow) flow.visible = false;
      const out = w.ball === 'out';
      tank.level(.25 + (out ? .35 : 0) + (w.hopper ? .05 : 0), .06 + (out ? .1 : 0));
      water.level(w.ball === 'out' ? .25 : w.hopper ? .5 : .75, 0);
      drip.visible = w.drained; if (drip.visible) { const t = (now / 900) % 1; drip.position.set(.36, PY - .09 - t * .35, 0); }
      if (look.reliefT >= 0) { look.reliefT += dt; reliefDrip.visible = look.reliefT < 1.6; reliefDrip.position.set(.67, PY - .14 - (look.reliefT % .8) * .3, .05); if (look.reliefT > 1.6) look.reliefT = -1; } else reliefDrip.visible = false;
    }
    look.reliefT = -1;

    /* —— 检查点 —— */
    const spots = {
      hopper: () => new T.Vector3(HX, HT + .12, -.18),
      relief: () => relief.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, -.04, .05)),
      gun: () => gunNozzle.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .06, 0)),
      tank: () => tank.g.position.clone().add(new T.Vector3(0, .68, 0)),
      drain: () => drainPlug.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, -.04, .08)),
      seg1: () => segs[0].curve.getPoint(.6), seg2: () => segs[1].curve.getPoint(.5), seg3: () => segs[2].curve.getPoint(.5), seg4: () => segs[3].curve.getPoint(.45),
    };
    const pipePhase = w => w.ball === 'stuck' || w.segs.some(g => g.open);
    function spotVisible(id, w) { const seg = id.startsWith('seg'); return pipePhase(w) ? (seg || id === 'relief') : !seg; }
    function spotState(id, w) {
      if (id.startsWith('seg')) { const g = w.segs[+id[3] - 1]; return g.clear ? 'ok' : (g.open && g.set >= 1) ? 'bad' : g.open ? 'done' : 'todo'; }
      return {hopper: w.hopper, relief: w.energy, gun: w.nozzle, tank: w.aim === 'tank', drain: w.drained}[id] ? 'ok' : 'todo';
    }
    const frame = () => ({az: .5, el: .52, dist: 5.6, target: new T.Vector3(-.4, .3, .35)});
    /* 堵管时把镜头拉到堵段；推出球后看沉淀桶 */
    function autoFocus(ev, w) {
      if (!ev) return null;
      if (ev.type === 'ball' && w.ball === 'stuck') return {target: segs[w.ballAt].curve.getPoint(.5), dist: 2.6};
      if (ev.type === 'ball' && w.ball === 'out') return {target: tank.g.position.clone().add(new T.Vector3(.4, .3, .4)), dist: 3};
      return null;
    }
    return {group, sync, update, spots, spotState, spotVisible, frame, autoFocus, readouts: () => ({pressure: Math.max(0, Math.round(look.pressure))})};
  };
})();
