/* 课程首页的三维展品：每章一件主展品（概览时居中放大并循环本章的标志动作），进入本章后与其余任务展品一起排开。
 * 模型全部复用课程已有模型：CourseMachines（第一章、第八章与机械臂）和 CoverModels（原第二～七章封面展品）。
 * 动作只为看清结构与用途，不代表真实设备的速度、精度或性能。 */
(() => {
  'use strict';
  const T = THREE;
  const machine = id => () => CourseMachines.make(id);
  const cover = (n, key) => () => CoverModels.make(n, key);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  /* 关键帧插值：frames = [[时刻, {名: 值}]...]，循环周期 = 最后一帧时刻。 */
  function keyframes(frames, t) {
    const period = frames[frames.length - 1][0], u = ((t % period) + period) % period;
    let i = 0; while (i < frames.length - 2 && u >= frames[i + 1][0]) i++;
    const [t0, a] = frames[i], [t1, b] = frames[i + 1], k = ease((u - t0) / (t1 - t0)), out = {};
    for (const key in a) out[key] = a[key] + (b[key] - a[key]) * k;
    return out;
  }

  /* 第一章 · 挖掘机挖一斗：转向料堆 → 落臂 → 收斗杆、铲斗装料 → 抬臂回转 → 卸料。 */
  const digFrames = [
    [0, {slew: 0, boom: 8, stick: -12, bucket: -18}],
    [1.3, {slew: -30, boom: 12, stick: 10, bucket: 22}],
    [2.5, {slew: -30, boom: -15, stick: 18, bucket: 26}],
    [3.9, {slew: -30, boom: -10, stick: -30, bucket: -58}],
    [5.0, {slew: -30, boom: 24, stick: -32, bucket: -62}],
    [6.5, {slew: 32, boom: 24, stick: -14, bucket: -62}],
    [7.5, {slew: 32, boom: 20, stick: 8, bucket: 32}],
    [8.4, {slew: 32, boom: 16, stick: -4, bucket: -8}],
    [9.8, {slew: 0, boom: 8, stick: -12, bucket: -18}]
  ];
  function dig(model) {
    return t => model.pose(t, {manual: keyframes(digFrames, t)});
  }

  /* 第三章 · 六轴机械臂取放：在两个料位之间来回搬一块料，夹爪张合、料块随末端移动。 */
  function pickPlace(model) {
    const joints = model.joints, j6 = joints[5].node;
    const fingers = j6.children.filter(c => c.type === 'Group');
    const tcp = new T.Object3D(); tcp.position.y = .78; j6.add(tcp);
    const root = model.root;
    const set = (a) => { joints.forEach((j, i) => { j.node.rotation[j.axis] = a[i]; }); root.updateMatrixWorld(true); };
    /* 末端朝下：J2 + J3 + J5 = -π。在 J1 = 0 的平面里搜一个够得着地面料位的姿态（取放）与抬高的姿态。 */
    function solve(height, reach) {
      let best = null;
      for (let a = -1.6; a <= .4; a += .02) for (let b = -2.6; b <= 0; b += .02) {
        set([0, a, b, 0, -Math.PI - a - b, 0]);
        const p = tcp.getWorldPosition(new T.Vector3()); root.worldToLocal(p);
        const e = Math.abs(Math.hypot(p.x, p.z) - reach) + Math.abs(p.y - height) + (p.x < 0 ? 9 : 0);
        if (!best || e < best.e) best = {e, a, b};
      }
      return [best.a, best.b, -Math.PI - best.a - best.b];
    }
    const down = solve(.42, 2.25), up = solve(1.35, 2.25), sides = [.95, -.95];
    const block = new T.Mesh(new T.BoxGeometry(.42, .34, .42), new T.MeshStandardMaterial({color: 0xe8aa55, roughness: .55}));
    block.castShadow = block.receiveShadow = true; root.add(block);
    const spots = sides.map(yaw => { set([yaw, ...down.slice(0, 2), 0, down[2], 0]); const p = tcp.getWorldPosition(new T.Vector3()); root.worldToLocal(p); p.y -= .02; return p; });
    for (const s of spots) { const pad = new T.Mesh(new T.CylinderGeometry(.42, .42, .04, 28), new T.MeshStandardMaterial({color: 0x9cb4c5, roughness: .6})); pad.position.set(s.x, .02, s.z); pad.receiveShadow = true; root.add(pad); }
    const period = 6.6;
    return t => {
      const cycle = Math.floor(t / period), u = t - cycle * period, from = cycle % 2, to = 1 - from;
      const lift = u < 1 ? 1 - ease(u) : u < 1.5 ? 0 : u < 2.5 ? ease(u - 1.5) : u < 4 ? 1 : u < 5 ? 1 - ease(u - 4) : u < 5.5 ? 0 : ease(u - 5.5);
      const yaw = sides[from] + (sides[to] - sides[from]) * ease((u - 2.5) / 1.5);
      const arm = down.map((d, i) => d + (up[i] - d) * lift);
      set([yaw, arm[0], arm[1], 0, arm[2], 0]);
      const open = u < 1 ? 1 : u < 1.5 ? 1 - ease((u - 1) / .5) : u < 5 ? 0 : u < 5.5 ? ease((u - 5) / .5) : 1;
      fingers.forEach((f, i) => { f.position.x = (i ? 1 : -1) * (.2 + .1 * open); });
      if (u >= 1.4 && u < 5.2) { const p = tcp.getWorldPosition(new T.Vector3()); root.worldToLocal(p); block.position.set(p.x, p.y - .02, p.z); }
      else block.position.copy(spots[u < 1.4 ? from : to]);
      block.rotation.y = yaw;
      root.updateMatrixWorld(true);
    };
  }

  /* 第四章 · 激光雷达扫描：扫描头连续旋转，带一片扫描扇面。 */
  function sweep(model) {
    const scan = model.rig.scan, n = 18, pos = [0, 0, 0];
    for (let i = 0; i <= n; i++) { const a = -1.1 * i / n; pos.push(1.4 * Math.cos(a), -.68, -1.4 * Math.sin(a) * -1); }
    const index = []; for (let i = 1; i <= n; i++) index.push(0, i, i + 1);
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geometry.setIndex(index);
    const fan = new T.Mesh(geometry, new T.MeshBasicMaterial({color: 0x46c39a, transparent: true, opacity: .26, side: T.DoubleSide, depthWrite: false}));
    scan.add(fan);
    return t => model.pose(t * 4.2);
  }

  /* 第五章 · 钢筋绑扎：机械臂在交叉点之间转动，停下时绑丝盘转动、绑扣闪现。 */
  function tie(model) {
    const {yaw, reel, wire} = model.rig, stops = [0, .34, .7, .34];
    wire.material = wire.material.clone(); wire.material.emissive = new T.Color(0xf0a020);
    return t => {
      model.pose(t);
      const period = 2.2, k = Math.floor(t / period), u = (t % period) / period;
      const a = stops[k % stops.length], b = stops[(k + 1) % stops.length];
      yaw.rotation.y = a + (b - a) * ease((u - .55) / .45);
      const working = u < .55;
      yaw.position.y = .35 - (working ? Math.sin(u / .55 * Math.PI) * .1 : 0);
      reel.rotation.y = working ? t * 9 : reel.rotation.y;
      wire.material.emissiveIntensity = working ? .6 + .4 * Math.sin(u * 30) : 0;
      wire.scale.setScalar(working ? 1 + .25 * Math.sin(u / .55 * Math.PI) : 1);
      model.root.updateMatrixWorld(true);
    };
  }

  /* 第六章 · 喷涂：喷枪沿墙上下往复，喷雾锥随之移动。 */
  function spray(model) {
    const nozzle = model.rig.nozzle;
    const mist = new T.Mesh(new T.ConeGeometry(.3, .55, 24, 1, true), new T.MeshBasicMaterial({color: 0x4f9be8, transparent: true, opacity: .5, side: T.DoubleSide, depthWrite: false}));
    mist.position.set(.98, 0, -.98); mist.rotation.x = -Math.PI / 2; mist.rotation.z = .7; nozzle.add(mist);
    return t => { model.pose(t * 2.4); mist.material.opacity = .42 + .14 * Math.sin(t * 13); };
  }

  /* 第七章 · 无人机巡检：沿立面逐行飞过，旋翼高速转动。 */
  function patrol(model) {
    const uav = model.rig.uav, rows = [2.65, 1.95, 1.25, 1.95];
    return t => {
      model.pose(t * 7);
      const period = 3.4, k = Math.floor(t / period) % rows.length, u = (t % period) / period, dir = k % 2 ? -1 : 1;
      const x0 = -1.45, x1 = .55, s = ease(u / .8);
      uav.position.x = dir > 0 ? x0 + (x1 - x0) * s : x1 - (x1 - x0) * s;
      uav.position.y = rows[k] + (rows[(k + 1) % rows.length] - rows[k]) * ease((u - .8) / .2) + Math.sin(t * 3) * .04;
      uav.position.z = .85;
      uav.rotation.z = -dir * .12 * Math.sin(Math.PI * clamp(u / .8, 0, 1));
      model.root.updateMatrixWorld(true);
    };
  }

  /* 第八章 · 安全与维护：警示灯交替闪烁，安全帽在展台上缓慢转动。 */
  function alert(model) {
    const helmet = model.parts.find(p => p.id === 'helmet')?.node, barrier = model.parts.find(p => p.id === 'barrier')?.node;
    const lamps = [];
    barrier?.traverse(o => { if (o.isMesh && o.geometry.type === 'SphereGeometry') { o.material = o.material.clone(); o.material.emissive = new T.Color(0xff8a1f); lamps.push(o); } });
    return t => {
      lamps.forEach((lamp, i) => { lamp.material.emissiveIntensity = Math.max(0, Math.sin(t * 5 + i * Math.PI)) * 1.4; });
      if (helmet) helmet.rotation.y = t * .55;
      model.root.updateMatrixWorld(true);
    };
  }

  /* 每章：识别色（小图底色、展台细环、脚下光斑）、主展品对应的任务、各任务的展品。yaw 让模型以四分之三侧面朝向镜头。 */
  const chapters = {
    1: {tint: '#f0b445', hero: '1-2', motion: '挖掘机转身挖一斗、回转卸料', tasks: {
      '1-2': {make: machine('excavator'), drive: dig, yaw: -1.3, size: 4.4},
      '1-3': {make: machine('six-axis'), yaw: -.5, size: 3.6}}},
    2: {tint: '#4f97e6', hero: '2-1', motion: '柴油机运转：活塞上下、曲轴转动', tasks: {
      '2-1': {make: cover(2, 'diesel'), drive: m => t => m.pose(t * 3), yaw: -.45},
      '2-2': {make: cover(2, 'transmission'), yaw: -.45},
      '2-3': {make: cover(2, 'mechanism'), yaw: -.45}}},
    3: {tint: '#7c83ec', hero: '3-2', motion: '六轴机械臂在两个料位之间取放料块', tasks: {
      '3-1': {make: cover(3, 'gantry'), yaw: -.45},
      '3-2': {make: machine('six-axis'), drive: pickPlace, yaw: -.2, size: 4.3},
      '3-3': {make: cover(3, 'reducer'), yaw: -.35},
      '3-4': {make: cover(3, 'tool'), yaw: -.45},
      '3-5': {make: cover(3, 'chassis'), yaw: -.6}}},
    4: {tint: '#33b39a', hero: '4-2', motion: '激光雷达扫描头旋转扫过四周', tasks: {
      '4-1': {make: cover(4, 'ownState'), yaw: -.45},
      '4-2': {make: cover(4, 'lidar'), drive: sweep, yaw: -.5},
      '4-3': {make: cover(4, 'vision'), yaw: -.35}}},
    5: {tint: '#6f93c4', hero: '5-2', motion: '绑扎机械臂在钢筋交叉点之间转动、打结', tasks: {
      '5-1': {make: cover(5, 'processing'), yaw: -.45},
      '5-2': {make: cover(5, 'tying'), drive: tie, yaw: -.4},
      '5-3': {make: cover(5, 'concrete'), yaw: -.45}}},
    6: {tint: '#ec8a62', hero: '6-4', motion: '喷涂机器人喷枪沿墙面上下往复喷涂', tasks: {
      '6-1': {make: cover(6, 'masonry'), yaw: -.4},
      '6-2': {make: cover(6, 'tiling'), yaw: -.45},
      '6-3': {make: cover(6, 'sanding'), yaw: -.4},
      '6-4': {make: cover(6, 'spray'), drive: spray, yaw: -.4}}},
    7: {tint: '#5fb86a', hero: '7-2', motion: '无人机沿建筑立面逐行巡检', tasks: {
      '7-1': {make: cover(7, 'bridge'), yaw: -.45},
      '7-2': {make: cover(7, 'facade'), drive: patrol, yaw: -.4}}},
    8: {tint: '#f08a3c', hero: '8-1', motion: '警示灯交替闪烁、安全帽在展台上转动', tasks: {
      '8-1': {make: machine('safety-exhibit'), drive: alert, yaw: -.4},
      '8-2': {make: machine('engine'), yaw: -.55}}}
  };

  /* 建一件展品：统一大小、居中放在原点，返回 {root, step(t)}。 */
  function build(chapter, taskId) {
    const spec = chapters[chapter].tasks[taskId], model = spec.make();
    model.pose?.(0);
    const holder = new T.Group(), turn = new T.Group(); holder.add(turn); turn.add(model.root);
    turn.rotation.y = spec.yaw ?? -.45;
    turn.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(model.root), size = box.getSize(new T.Vector3()), center = box.getCenter(new T.Vector3());
    const scale = (spec.size ?? 3.7) / Math.max(size.x, size.z, size.y * 1.05);
    turn.scale.setScalar(scale);
    turn.position.set(-center.x * scale, -box.min.y * scale + .02, -center.z * scale);
    model.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const drive = spec.drive ? spec.drive(model) : (t => model.pose?.(t));
    return {root: holder, model, step: drive, height: size.y * scale};
  }

  window.HomeExhibits = {chapters, build};
})();
