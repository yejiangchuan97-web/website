/* 任务 8-2 工位③ 喷涂管路清洗：三维场景。
 * 机器人本体是第六章 6-4 的喷涂机器人（createSprayRobot，构建时从 6-4/src/scene3d.js 截取内联，不改 6-4 文件）。
 * 本文件只在旁边加清洗用的东西：吸料管与吸料滤网、清洗桶、回收桶与样杯、泄压阀、喷枪锁、拆件托盘。
 * 颜色、液位与压力表读数都是课堂示意。
 */
(function () {
  'use strict';
  const reg = window.MaintFlush = window.MaintFlush || {};

  reg.spray = function (ctx) {
    const {T, mesh, cyl, box, tag, bayLines, M} = ctx;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t;
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const group = new T.Group();

    /* —— 6-4 喷涂机器人：升降架降到低位，喷枪对着回收桶 —— */
    const R = window.createSprayRobot(T);
    group.add(R.root);
    R.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const CARRIAGE_Y = .78;
    R.carriage.position.y = CARRIAGE_Y; R.gun.position.z = .309;
    R.arm.position.z = (.51 + .449) / 2; R.arm.scale.z = (.51 - .449) / .4;
    R.updateHose(CARRIAGE_Y, .309);
    const NOZZLE = new T.Vector3(0, CARRIAGE_Y - .24, .29);       // 机器人坐标：喷嘴口
    const robotAt = new T.Vector3(.1, 0, -.35);                   // 机器人整体位置
    R.root.position.copy(robotAt);
    const W = v => v.clone().add(robotAt);                          // 机器人坐标 → 场景坐标

    const mat = (c, o = {}) => new T.MeshStandardMaterial({color: c, roughness: .5, metalness: .05, ...o});
    const liquidMat = c => new T.MeshPhysicalMaterial({color: c, roughness: .08, transparent: true, opacity: .82, clearcoat: 1});
    const plastic = (c) => mat(c, {roughness: .42});

    /* —— 桶：开口塑料桶（外壁 + 底 + 液面） —— */
    function bucket(at, r, h, color, label) {
      const g = new T.Group(); g.position.copy(at); group.add(g);
      const wall = new T.Mesh(new T.CylinderGeometry(r, r * .9, h, 36, 1, true), plastic(color)); wall.position.y = h / 2; wall.material.side = T.DoubleSide; wall.castShadow = true; wall.receiveShadow = true; g.add(wall);
      cyl(g, r * .9, .012, [0, .006, 0], plastic(color), [0, 0, 0], 36);
      mesh(g, new T.TorusGeometry(r, .012, 8, 40), plastic(color), [0, h, 0], [Math.PI / 2, 0, 0]);
      const liquid = new T.Mesh(new T.CircleGeometry(r * .97, 36), liquidMat(0xcfe6f2)); liquid.rotation.x = -Math.PI / 2; liquid.position.y = h * .5; g.add(liquid);
      const body = new T.Mesh(new T.CylinderGeometry(r * .96, r * .87, 1, 32), liquidMat(0xcfe6f2)); body.material.opacity = .55; g.add(body);
      const setLevel = (k, color) => { const y = Math.max(.012, h * k); liquid.position.y = y; body.scale.y = y - .012; body.position.y = .012 + (y - .012) / 2; liquid.visible = body.visible = k > .02; if (color) { liquid.material.color.copy(color); body.material.color.copy(color); } };
      if (label) {
        const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 96); x.fillStyle = '#17324f'; x.font = 'bold 46px "PingFang SC","Microsoft YaHei",sans-serif'; x.textAlign = 'center'; x.fillText(label, 128, 64);
        const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
        const plate = new T.Mesh(new T.CylinderGeometry(r * 1.003, r * .93, h * .3, 32, 1, true, -.55, 1.1), new T.MeshStandardMaterial({map: t, roughness: .6, transparent: true}));
        plate.position.y = h * .55; plate.rotation.y = 0; g.add(plate);
      }
      return {g, setLevel, top: () => at.clone().add(new T.Vector3(0, h, 0))};
    }
    const recover = bucket(new T.Vector3(.1, 0, -.3), .17, .38, 0x6f7f8e, '回收桶');
    const cleanB = bucket(W(new T.Vector3(.68, 0, .5)), .15, .34, 0xf2f4f6, '清洗桶');

    /* 样杯：架在回收桶口上的透明量杯，接喷枪出液 */
    const cupAt = new T.Vector3(.1, .4, -.24);
    const cupG = new T.Group(); cupG.position.copy(cupAt); group.add(cupG);
    const glass = new T.MeshPhysicalMaterial({color: 0xffffff, roughness: .05, transmission: .6, transparent: true, opacity: .32, depthWrite: false, side: T.DoubleSide});
    const cupWall = new T.Mesh(new T.CylinderGeometry(.058, .05, .13, 28, 1, true), glass); cupWall.position.y = .065; cupWall.renderOrder = 3; cupG.add(cupWall);
    cyl(cupG, .05, .004, [0, .002, 0], glass, [0, 0, 0], 28);
    for (let i = 1; i <= 4; i++) box(cupG, .014, .002, .002, [.034, i * .025, .044], M.dark);
    const cupLiquid = new T.Mesh(new T.CylinderGeometry(.055, .049, .1, 28), liquidMat(0x3f8fd6)); cupLiquid.position.y = .053; cupG.add(cupLiquid);
    // 杯架：两根支杆搭在回收桶口上
    box(group, .36, .008, .02, [cupAt.x, .388, cupAt.z], M.steel);

    /* 出液：喷枪口到样杯的一股液流 */
    const nozzleW = W(NOZZLE);
    const streamCurve = new T.CatmullRomCurve3([nozzleW.clone(), nozzleW.clone().add(new T.Vector3(0, -.015, -.06)), cupAt.clone().add(new T.Vector3(0, .13, .05)), cupAt.clone().add(new T.Vector3(0, .07, 0))]);
    const streamMat = liquidMat(0x3f8fd6); streamMat.opacity = .9;
    const stream = new T.Mesh(new T.TubeGeometry(streamCurve, 24, .007, 8), streamMat); stream.visible = false; group.add(stream);

    /* —— 吸料管：泵进口 → 涂料桶（随车）或清洗桶（地上），末端是吸料滤网 —— */
    const inlet = new T.Vector3(.16, .6, 1.07);
    const ROUTE = {
      paint: [inlet, new T.Vector3(.09, .9, 1.1), new T.Vector3(-.06, .95, 1.07), new T.Vector3(-.1, .78, 1.07), new T.Vector3(-.1, .58, 1.07)].map(W),
      clean: [inlet, new T.Vector3(.38, .86, 1.0), new T.Vector3(.64, .78, .74), new T.Vector3(.68, .45, .55), new T.Vector3(.68, .07, .5)].map(W),
    };
    let pipe = null;
    const pipeMat = new T.MeshPhysicalMaterial({color: 0xd9e3ea, roughness: .25, transparent: true, opacity: .85, clearcoat: .6});
    const strainer = new T.Group(); group.add(strainer);
    function meshTexture(fine) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
      x.fillStyle = '#9aa7b3'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#3c4752'; x.lineWidth = fine ? 1 : 2;
      const n = fine ? 32 : 16; for (let i = 0; i <= n; i++) { const p = i * 128 / n; x.beginPath(); x.moveTo(p, 0); x.lineTo(p, 128); x.stroke(); x.beginPath(); x.moveTo(0, p); x.lineTo(128, p); x.stroke(); }
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(3, 2); t.colorSpace = T.SRGBColorSpace; return t;
    }
    const screenMat = new T.MeshStandardMaterial({map: meshTexture(false), metalness: .6, roughness: .4, transparent: true, opacity: .92});
    const fineMat = new T.MeshStandardMaterial({map: meshTexture(true), metalness: .6, roughness: .4});
    const residueMat = () => new T.MeshStandardMaterial({color: 0x3f8fd6, roughness: .75, transparent: true, opacity: .9});
    /* 三个拆洗件：每件一个组（可以从机器上移到托盘上），带一层“残漆”壳 */
    const parts = {};
    function part(id, build) { const g = new T.Group(); group.add(g); const res = []; build(g, res); parts[id] = {g, res, home: new T.Vector3(), homeQ: new T.Quaternion()}; return parts[id]; }
    part('suction', (g, res) => {
      mesh(g, new T.CylinderGeometry(.03, .03, .09, 24, 1, true), screenMat, [0, -.045, 0]).material.side = T.DoubleSide;
      cyl(g, .032, .008, [0, -.092, 0], M.steel, [0, 0, 0], 24); cyl(g, .018, .02, [0, .005, 0], M.brass, [0, 0, 0], 16);
      const r = new T.Mesh(new T.CylinderGeometry(.033, .034, .05, 24, 1, true), residueMat()); r.position.y = -.07; r.material.side = T.DoubleSide; g.add(r); res.push(r);
    });
    part('gunFilter', (g, res) => {
      mesh(g, new T.CylinderGeometry(.011, .011, .08, 18), fineMat, [0, 0, 0], [0, 0, Math.PI / 2]);
      cyl(g, .014, .012, [.045, 0, 0], M.brass, [0, 0, Math.PI / 2], 16); cyl(g, .008, .01, [-.045, 0, 0], M.steel, [0, 0, Math.PI / 2], 12);
      const r = new T.Mesh(new T.CylinderGeometry(.0125, .0125, .06, 18), residueMat()); r.rotation.z = Math.PI / 2; r.position.x = -.006; g.add(r); res.push(r);
    });
    part('nozzle', (g, res) => {
      cyl(g, .018, .02, [0, 0, 0], M.dark, [Math.PI / 2, 0, 0], 6);
      mesh(g, new T.CylinderGeometry(.008, .013, .022, 16), M.brass, [0, 0, -.02], [Math.PI / 2, 0, 0]);
      const r = new T.Mesh(new T.TorusGeometry(.011, .004, 8, 20), residueMat()); r.position.z = -.031; g.add(r); res.push(r);
    });
    // 机器上的位置：喷嘴在枪口，枪内滤网在枪身里（枪身侧面画一个检修口），吸料滤网在吸料管末端
    const gunBodyW = W(new T.Vector3(0, CARRIAGE_Y - .24, .1));
    parts.nozzle.home.copy(nozzleW).add(new T.Vector3(0, 0, .02));
    parts.gunFilter.home.copy(gunBodyW).add(new T.Vector3(.04, 0, 0)); parts.gunFilter.homeQ.setFromEuler(new T.Euler(0, Math.PI / 2, 0));
    parts.gunFilter.g.visible = false;                         // 装在枪身里面看不到
    const port = mesh(group, new T.CylinderGeometry(.02, .02, .012, 16), M.brass, gunBodyW.clone().add(new T.Vector3(.035, 0, 0)), [0, 0, Math.PI / 2]);
    // 拆件托盘：小推车，零件拆下后放大一倍摆在上面
    const trayAt = new T.Vector3(-.75, 0, .35);
    {
      const g = new T.Group(); g.position.copy(trayAt); group.add(g);
      box(g, .56, .03, .36, [0, .52, 0], M.steel); box(g, .52, .02, .32, [0, .545, 0], mat(0xe9edf1, {roughness: .8}));
      for (const x of [-.25, .25]) for (const z of [-.15, .15]) { box(g, .025, .5, .025, [x, .26, z], M.dark); cyl(g, .03, .025, [x, .03, z], M.rubber, [Math.PI / 2, 0, 0], 14); }
      box(g, .52, .02, .32, [0, .16, 0], M.steel);
    }
    const TRAY = {nozzle: new T.Vector3(-.17, .6, 0), gunFilter: new T.Vector3(0, .58, 0), suction: new T.Vector3(.17, .67, 0)};
    const anim = {};                                       // 零件移动动画
    // 泄压阀（泵出口旁，红色手柄）与喷枪锁
    const valve = new T.Group(); valve.position.copy(W(new T.Vector3(.24, .7, 1.0))); group.add(valve);
    cyl(valve, .016, .05, [0, 0, 0], M.brass, [0, 0, Math.PI / 2], 16); cyl(valve, .012, .03, [0, -.025, 0], M.brass, [0, 0, 0], 12);
    const lever = new T.Group(); lever.position.set(0, .02, 0); valve.add(lever); box(lever, .012, .012, .09, [0, .006, .04], M.red);
    const lock = new T.Group(); lock.position.copy(W(new T.Vector3(.04, CARRIAGE_Y - .24, .1)).add(new T.Vector3(.03, -.03, 0))); group.add(lock);
    box(lock, .03, .036, .018, [0, -.02, 0], M.red); mesh(lock, new T.TorusGeometry(.011, .003, 8, 18, Math.PI), M.steel, [0, 0, 0]);
    lock.visible = false;
    const sTag = tag('禁止合闸', .12); group.add(sTag); sTag.position.copy(W(new T.Vector3(.2, .5, 1.21))); sTag.visible = false;
    bayLines(group, 2.9, 2.5);

    /* —— 状态 → 画面 —— */
    const PAINT = {water: new T.Color(0x3f8fd6), oil: new T.Color(0xc4702a), clog: new T.Color(0x3f8fd6)};
    const CLEAR = {water: new T.Color(0xd3e8f3), solvent: new T.Color(0xf0e2b0), thinner: new T.Color(0xd9d2a6)};
    const look = {pressure: 8, lever: 0, rinse: 0, pipeK: 0, pipeFrom: 'paint', pipeTo: 'paint', pipeT: -1, recover: .15};
    function buildPipe(k) {
      const a = ROUTE[look.pipeFrom], b = ROUTE[look.pipeTo], lift = Math.sin(Math.PI * k) * .25;
      const pts = a.map((p, i) => p.clone().lerp(b[i], k).add(new T.Vector3(0, i ? lift : 0, 0)));
      if (pipe) { group.remove(pipe); pipe.geometry.dispose(); }
      pipe = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, .012, 10), pipeMat); pipe.castShadow = true; group.add(pipe);
      const end = pts.at(-1); parts.suction.home.copy(end).add(new T.Vector3(0, -.005, 0));
      return pts;
    }
    buildPipe(0);
    let W0 = null;
    function sync(w, state, ev) {
      const first = !W0; W0 = w;
      if (first || ev?.type === 'case') { look.pipeFrom = look.pipeTo = w.suction; look.pipeT = -1; buildPipe(0); look.rinse = w.rinse; look.pressure = w.pressure; for (const id in anim) delete anim[id]; for (const [id, p] of Object.entries(parts)) placePart(id, p, w.checked[id] && !w.done[id], 1); }
      if (w.suction !== look.pipeTo) { look.pipeFrom = look.pipeTo; look.pipeTo = w.suction; look.pipeT = 0; }
      for (const [id, p] of Object.entries(parts)) {
        const onTray = !!w.checked[id] && !w.done[id];
        if (p.onTray !== onTray && !first && ev?.type !== 'case') anim[id] = {t: 0, from: p.g.position.clone(), to: onTray}; else if (p.onTray === undefined) placePart(id, p, onTray, 1);
        p.onTray = onTray;
        const color = PAINT[w.scenario], heavy = id === 'gunFilter' && w.scenario === 'clog';
        p.res.forEach(r => { r.visible = !w.done[id]; r.material.color.copy(color).multiplyScalar(heavy ? .7 : 1); r.material.opacity = heavy ? .97 : .7; r.scale.setScalar(heavy ? 1.12 : 1); });
      }
      lock.visible = w.energy; sTag.visible = w.isolated;
      cupLiquid.visible = w.flushed || w.flushing;
      cleanB.setLevel(w.liquid ? .62 : 0, CLEAR[w.liquid || 'water']);
    }
    function placePart(id, p, onTray, k) {
      const tray = trayAt.clone().add(TRAY[id]);
      p.g.position.copy(onTray ? tray : p.home); p.g.scale.setScalar(onTray ? 2 : 1);
      p.g.quaternion.copy(onTray ? new T.Quaternion().setFromEuler(new T.Euler(0, id === 'nozzle' ? -.6 : .3, 0)) : p.homeQ);
      if (id === 'gunFilter') p.g.visible = onTray || k < 1;
    }
    function outletColor(w, out = new T.Color()) {
      const clear = CLEAR[w.liquid || 'water'];
      return out.copy(PAINT[w.scenario]).lerp(clear, Math.pow(clamp(look.rinse, 0, 1), .8));
    }
    const tmpC = new T.Color();
    function update(dt, now, w) {
      look.pressure = lerp(look.pressure, w.pressure + (w.flushing ? Math.sin(now * .006) * .15 : 0), 1 - Math.exp(-dt * 2.4));
      const a = (-140 + clamp(look.pressure, 0, 10) * 28) * Math.PI / 180;
      R.needle.rotation.z = -a; R.needle.position.set(.175 + Math.sin(a) * .012, .76 + Math.cos(a) * .012, 1.086);
      look.lever = lerp(look.lever, w.energy ? Math.PI / 2 : 0, 1 - Math.exp(-dt * 6)); lever.rotation.y = look.lever;
      look.rinse = lerp(look.rinse, w.rinse, 1 - Math.exp(-dt * 3));
      outletColor(w, tmpC); cupLiquid.material.color.copy(tmpC); streamMat.color.copy(tmpC);
      stream.visible = w.flushing; stream.material.opacity = .75 + Math.sin(now * .02) * .1;
      const rec = .15 + (w.energy || w.flushed ? .12 : 0) + clamp(w.rinse, 0, 1) * .35 + (w.waste ? .05 : 0);
      look.recover = lerp(look.recover, rec, 1 - Math.exp(-dt * 1.5)); recover.setLevel(look.recover, tmpC.clone().lerp(PAINT[w.scenario], .55));
      // 泵运转：喷涂中或冲洗中，泵体轻微抖动
      const running = !w.prepared || w.flushing;
      R.supply.position.x = running ? Math.sin(now * .08) * .0015 : 0;
      if (look.pipeT >= 0) { look.pipeT = Math.min(1, look.pipeT + dt / 1.3); buildPipe(ease(look.pipeT)); if (look.pipeT >= 1) look.pipeT = -1; }
      for (const [id, an] of Object.entries(anim)) {
        an.t = Math.min(1, an.t + dt / 1.1); const k = ease(an.t), p = parts[id];
        const tray = trayAt.clone().add(TRAY[id]), to = an.to ? tray : p.home;
        p.g.position.copy(an.from).lerp(to, k).add(new T.Vector3(0, Math.sin(Math.PI * k) * .25, 0));
        p.g.scale.setScalar(an.to ? lerp(1, 2, k) : lerp(2, 1, k));
        if (id === 'gunFilter') p.g.visible = true;
        if (an.t >= 1) { placePart(id, p, an.to, 1); delete anim[id]; }
      }
      if (!Object.keys(anim).length) for (const [id, p] of Object.entries(parts)) if (!p.onTray && look.pipeT >= 0 && id === 'suction') p.g.position.copy(p.home);
    }

    /* —— 检查点（HTML 标记）的位置、显隐与状态 —— */
    const spots = {
      relief: () => valve.position.clone().add(new T.Vector3(0, .05, 0)),
      pipe: () => (pipe ? new T.Vector3().copy(pipe.geometry.parameters.path.getPoint(.45)) : W(inlet)),
      nozzle: () => parts.nozzle.g.position.clone().add(new T.Vector3(0, .03, 0)),
      gunFilter: () => (parts.gunFilter.onTray ? parts.gunFilter.g.position.clone() : port.position.clone()).add(new T.Vector3(0, .02, 0)),
      suction: () => parts.suction.g.position.clone().add(new T.Vector3(0, .04, 0)),
    };
    function spotState(id, w) {
      if (id === 'relief') return w.energy ? 'ok' : 'todo';
      if (id === 'pipe') return w.suction === 'clean' ? 'ok' : 'todo';
      if (w.done[id]) return 'done';
      if (w.checked[id]) return window.MaintModel.finding('spray', w.scenario, id).abnormal ? 'bad' : 'ok';
      return 'todo';
    }
    const frame = () => ({az: 2.35, el: .3, dist: 2.8, target: new T.Vector3(.15, .5, .1)});
    /* 关键时刻把镜头拉近：开始冲洗看样杯；拆下零件看托盘 */
    function autoFocus(ev, w, state) {
      if (!ev || state.error) return null;
      if (ev.type === 'flush' && w.flushing) return {target: cupAt.clone().add(new T.Vector3(0, .08, 0)), dist: 1.15};
      if (ev.type === 'flush' && !w.flushing) return {frame: true};
      const p = ev.type === 'part' || ev.type === 'spot' ? ev.point : null;
      if (p && parts[p] && w.checked[p] && !w.done[p]) return {target: trayAt.clone().add(TRAY[p]), dist: 1.05};
      return null;
    }
    return {group, sync, update, spots, spotState, spotVisible: () => true, frame, autoFocus, readouts: () => ({pressure: Math.max(0, Math.round(look.pressure))})};
  };
})();
