/* 机器人取放工位：移动底盘 + 机械臂的砌筑机器人（教学模型，不对应品牌型号）。
 * 外观和尺度参照第六章 6-2、6-3 的同系机器人：蓝色底盘、白色盖板、深蓝关节、银色轴承环。
 * 末端是夹砖夹具；取放流程、8 个阶段、18 mm 基准偏差都沿用 RobotModel.robotAt，不改数据模型。
 * 单位 mm，Z 向上。机械臂本体是全课程统一六轴臂（shared/robot-arm/six-axis-arm.js，第三章原尺寸），
 * 法兰竖直向下接住夹具的手腕段，由共享模型求六个关节角。
 */
(() => {
  const P = MasonryScene.prototype;
  const K = .72;                       // 底盘与臂截面按 6-2 同系机型的 0.72 倍画，和砖、墙的尺度相称
  const ARM_UPPER = 700, ARM_FORE = 635; // 统一六轴臂的大臂、小臂长度（小臂 + 腕部 = 700）
  const L1 = ARM_UPPER, L2 = ARM_FORE + 65;
  const WRIST = 237;                   // 夹具参考点（砖底）到手腕关节的高度
  // 两个站位：原站位、换站位（底盘中心）。回转台在底盘中心前方 230 mm（按比例）。
  const STATIONS = {fixed: {x: -1010, y: 0}, mobile: {x: -1080, y: 330}};
  const TURRET_DX = 230 * K;
  const PALETTE = {
    light: {rbBlue: 0x2f74c4, rbNavy: 0x1d3f5c, rbWhite: 0xf0f3f5, rbSilver: 0xc3cfd8, rbRed: 0xd9604f, rbAmber: 0xe0a14c, rbGreen: 0x34ad8f, rbScreen: 0x174257},
    dark: {rbBlue: 0x3b7fcf, rbNavy: 0x1a3550, rbWhite: 0xd9e1e8, rbSilver: 0x9fb0be, rbRed: 0xd9604f, rbAmber: 0xe0a14c, rbGreen: 0x3fbf9e, rbScreen: 0x1d5a72},
  };

  P.makeRobot = function () {
    const r = this.robotRoot;
    for (const k of Object.keys(PALETTE.light)) this.mat[k] = new THREE.MeshStandardMaterial({
      roughness: k === 'rbSilver' ? .3 : k === 'rbScreen' ? .25 : .4, metalness: k === 'rbSilver' ? .7 : .15});
    this.mat.rbScreen.emissive = new THREE.Color(0x1d7384); this.mat.rbScreen.emissiveIntensity = .25;

    /* —— 作业面：供料托盘、已砌的两皮墙、目标灰床（原样保留）—— */
    for (const x of [-575, -285]) for (const y of [-350, -170]) this.box(24, 24, 47, x, y, 0, 'lo', r, 'feed-leg', 2);
    this.box(350, 240, 16, -430, -260, 47, 'mid', r, 'feed-table', 3);
    for (const y of [-342, -260, -178]) this.box(330, 49, 11, -430, y, 63, 'hi', r, 'pallet-board', 1.2);
    for (const x of [-577, -283]) this.box(14, 220, 24, x, -260, 74, 'lo', r, 'feed-guide', 1);
    this.box(240, 115, 53, -430, 28, 0, 'brick', r, 'spare-brick-1'); this.box(240, 115, 53, -430, 28, 53, 'brick', r, 'spare-brick-2');
    for (const z of [0, 63]) this.box(740, 240, 10, 310, 110, z, 'mortar', r, `bed-${z}`, 0);
    for (const b of RobotModel.robotWall().bricks) this.box(b.w, b.d, b.h, b.x + b.w / 2, b.y + b.d / 2, b.z, 'brick', r, b.id);
    this.targetBed = this.box(115, 240, 10, 302.5, 110, 126, 'mortar', r, 'target-bed', 0);
    this.targetMarkers = this.group(r, 'target-witness');
    for (const x of [245, 360]) for (const y of [-10, 230]) this.cyl(3, 1, x, y, 137, 'lit', this.targetMarkers, 'target-corner', 'z', 16);
    // 灰槽挪到墙后侧，给底盘和机械臂让出位置
    const sx = -330, sy = 470;
    this.box(240, 160, 6, sx, sy, 0, 'lo', r, 'mortar-tray'); for (const y of [sy - 77, sy + 77]) this.box(240, 6, 27, sx, y, 6, 'mid', r);
    for (const x of [sx - 117, sx + 117]) this.box(6, 148, 27, x, sy, 6, 'mid', r);
    this.box(224, 144, 10, sx, sy, 6, 'mortar', r); this.box(95, 55, 3, sx + 20, sy, 16, 'steel', r, 'trowel'); this.box(13, 55, 17, sx + 20, sy, 19, 'lo', r, 'trowel-handle', 3);
    // 地面弹线：墙的基准线（机器人测量的就是它）
    this.box(1100, 4, .6, 310, -24, 0, 'chalk', r, 'datum-line', 0);
    for (const x of [-60, 680]) this.box(4, 330, .6, x, 110, 0, 'chalk', r, 'datum-end', 0);

    /* —— 换站位：地上留下原站位的轮廓和行驶方向 —— */
    this.stationTrace = this.group(r, 'station-trace');
    const f = STATIONS.fixed;
    for (const [w, d, x, y] of [[620, 6, 0, -317], [620, 6, 0, 317], [6, 640, -310, 0], [6, 640, 310, 0]]) this.box(w, d, .6, f.x + x, f.y + y, 0, 'chalk', this.stationTrace, 'old-footprint', 0);
    const arrow = this.group(this.stationTrace, 'move-arrow'); arrow.position.set(f.x - 20, 170, 0); arrow.rotation.z = Math.atan2(330, -70);
    this.box(260, 10, .8, 0, 0, 0, 'lit', arrow, 'arrow-shaft', 0);
    for (const s of [-1, 1]) { const h = this.box(70, 10, .8, 112, s * 22, 0, 'lit', arrow, 'arrow-head', 0); h.rotation.z = -s * .7; }

    /* —— 移动底盘（随站位整体平移）—— */
    const base = this.armBase = this.group(r, 'mobile-chassis'); base.scale.setScalar(K);
    this.box(760, 780, 100, 0, 0, 80, 'rbNavy', base, 'load-bearing-belly', 20);
    this.box(840, 860, 75, 0, 0, 200, 'rubber', base, 'bumper', 22);
    this.box(800, 820, 200, 0, 0, 255, 'rbBlue', base, 'drive-shell', 40);
    this.box(770, 790, 35, 0, 0, 455, 'rbWhite', base, 'service-deck', 10);
    for (const x of [-265, 265]) for (const y of [-414, 414]) {
      this.cyl(140, 90, x, y + (y > 0 ? -45 : 45) * 0, 0, 'rubber', base, 'tread', 'y', 36).position.set(x, y - 45, 140);
      const hub = this.cyl(92, 96, x, y - 48, 140, 'rbSilver', base, 'hub', 'y', 28); hub.position.set(x, y - 48, 140);
      const inset = this.cyl(63, 103, x, y - 51, 140, 'rbBlue', base, 'hub-inset', 'y', 24); inset.position.set(x, y - 51, 140);
    }
    // 支腿：停稳后放下，承担作业时的反力
    for (const x of [-430, 430]) for (const y of [-300, 300]) {
      this.box(70, 70, 200, x + Math.sign(x) * 20, y, 230, 'rbNavy', base, 'outrigger-housing', 8);
      this.cyl(16, 230, x + Math.sign(x) * 20, y, 6, 'rbSilver', base, 'outrigger-leg', 'z', 16);
      this.cyl(46, 12, x + Math.sign(x) * 20, y, 0, 'rubber', base, 'outrigger-pad', 'z', 24);
    }
    // 激光测距头、操作盒、急停
    this.cyl(64, 18, -270, -240, 490, 'steel', base, 'lidar-pedestal', 'z', 24); this.cyl(58, 38, -270, -240, 508, 'rbScreen', base, 'lidar-window', 'z', 24); this.cyl(61, 16, -270, -240, 546, 'rbWhite', base, 'lidar-cap', 'z', 24);
    const panel = this.box(250, 60, 120, -250, 250, 490, 'rbWhite', base, 'console', 14); panel.rotation.x = .35;
    this.box(150, 8, 70, -265, 222, 525, 'rbScreen', base, 'console-screen', 3).rotation.x = .35;
    this.cyl(23, 7, -160, 236, 560, 'rbAmber', base, 'estop-seat', 'z', 20); this.cyl(18, 20, -160, 236, 567, 'rbRed', base, 'emergency-stop', 'z', 20);
    this.cyl(6, 6, -330, 236, 556, 'rbGreen', base, 'ready-led', 'z', 12);

    /* —— 回转台与肩座 —— */
    const turret = this.armTurret = this.group(base, 'turret'); turret.position.set(TURRET_DX, 0, 490);
    this.cyl(170, 25, 0, 0, 0, 'rbSilver', turret, 'rotary-seat', 'z', 40);
    this.cyl(146, 50, 0, 0, 25, 'rbNavy', turret, 'rotary-bearing', 'z', 40);

    /* —— 机械臂本体：全课程统一六轴臂（shared/robot-arm/six-axis-arm.js），按第三章原尺寸坐在回转轴承上 —— */
    this.armHolder = this.group(r, 'six-axis-arm');
    this.sixArm = CourseSixAxisArm.build(THREE, {upper: ARM_UPPER, fore: ARM_FORE}); this.armHolder.add(this.sixArm.root);
    this.sixArm.meshes.forEach(m => { m.name = m.name || 'six-axis-arm'; });

    /* —— 手腕与夹砖夹具：始终竖直向下，绕竖轴转向 —— */
    this.zCarriage = this.group(r, 'tool');
    this.wristHousing = this.cyl(48, 1, 0, 0, 0, 'rbWhite', this.zCarriage, 'wrist-housing', 'z', 28);
    this.cyl(34, 31, 0, 0, 107, 'steel', this.zCarriage, 'rotation-motor'); this.cyl(42, 8, 0, 0, 79, 'lo', this.zCarriage, 'bearing-flange');
    this.wrist = this.group(this.zCarriage, 'rotating-gripper');
    this.box(139, 112, 16, 0, 0, 63, 'rbWhite', this.wrist, 'gripper-body', 2);
    this.jawCovers = [];
    for (const side of [-1, 1]) {
      const cover = this.group(this.wrist, `jaw-cover-${side}`); cover.userData.side = side;
      this.box(7, 156, 23, side * 76.5, 0, 63, 'rbBlue', cover, 'cover-side', 1); this.box(33, 156, 7, side * 59.5, 0, 79, 'rbWhite', cover, 'cover-top', 1);
      for (const y of [-53, 53]) this.bolt(side * 57, y, 86, cover, 3.6);
      this.jawCovers.push(cover);
    }
    for (const x of [-56, 56]) this.box(24, 16, 8, x, 0, 79, 'lo', this.wrist, 'jaw-guide-saddle');
    for (const x of [-56, 56]) this.cyl(4, 168, x, -84, 72, 'steel', this.wrist, 'jaw-guide', 'y', 16);
    this.jaws = [];
    for (const side of [-1, 1]) {
      const jaw = this.group(this.wrist, side < 0 ? 'jaw-left' : 'jaw-right'); jaw.userData.side = side;
      this.box(99, 16, 49, 0, 0, 17, 'rbNavy', jaw, 'jaw-finger', 2); this.box(90, 4, 31, 0, -side * 10, 21, 'rubber', jaw, 'jaw-pad', .7);
      this.jaws.push(jaw);
    }
    // 夹具上的测距传感器：落砖后复测
    this.box(38, 35, 20, 63, 0, 87, 'lo', this.zCarriage, 'sensor-mount'); this.box(36, 39, 31, 83, 0, 107, 'rbNavy', this.zCarriage, 'sensor-case', 2);
    this.box(25, 23, 1, 83, 0, 106, 'glass', this.zCarriage, 'sensor-window', .3);
    this.carriedBrick = this.box(240, 115, 53, 0, 0, 0, 'lit', r, 'active-brick', 1.2);

    this.mobileParts = this.stationTrace; this.fixedParts = this.group(r, 'none');
    this.armPose = {};
    this.robotParts = this.meshCount(r);
    this.robotBounds = this.boundsOf(r); this.cacheRobotFraming();
  };

  P.cacheRobotFraming = function () {
    const saved = this.robotState || RobotModel.robotAt(0), unique = new Map();
    for (const platform of ['fixed', 'mobile']) for (const t of [0, 1, 2, 3, 3.5, 4, 4.5, 5, 6, 7, 8]) {
      this.applyRobotPose(RobotModel.robotAt(t, {platform, fault: 'offset'}));
      for (const p of this.pointsOf(this.robotRoot)) { const key = p.map(v => Math.round(v / 5)).join(','); if (!unique.has(key)) unique.set(key, p); }
    }
    this.robotFramePoints = [...unique.values()];
    this.robotBounds = new THREE.Box3().setFromPoints(this.robotFramePoints.map(p => new THREE.Vector3(...p)));
    this.applyRobotPose(saved);
  };

  P.applyRobotPose = function (state) {
    if (!state) return; this.robotState = state; this.setPlatformQuiet(state.platform || this.platform);
    const st = STATIONS[this.platform], p = state.tool;
    this.armBase.position.set(st.x, st.y, 0);
    // 夹具：参考点在砖底，绕竖轴转到砖的朝向
    this.zCarriage.position.set(p.x, p.y, p.z); this.wrist.rotation.z = p.yaw;
    for (const jaw of this.jaws) jaw.position.y = jaw.userData.side * (69.5 + p.open);
    const b = state.brick; this.carriedBrick.position.set(b.x, b.y, b.z); this.carriedBrick.rotation.z = b.yaw;
    this.targetBed.scale.z = (state.mortarHeight || 10) / 10; this.targetMarkers.visible = !state.brick.placed;
    // 回转台随手腕方位转动；统一六轴臂的法兰从上方接住夹具顶部的手腕段，工具竖直向下
    const T = new THREE.Vector3(st.x + TURRET_DX, st.y, 0), W = new THREE.Vector3(p.x, p.y, p.z + WRIST);
    const heading = Math.atan2(W.y - T.y, W.x - T.x);
    this.armTurret.rotation.z = heading;
    this.robotRoot.updateMatrixWorld(true);
    const mount = this.robotRoot.worldToLocal(this.armTurret.localToWorld(new THREE.Vector3(0, 0, 75)));
    this.armHolder.position.set(mount.x, mount.y, mount.z - CourseSixAxisArm.MOUNT_Z);
    const solved = this.sixArm.reach([W.x - this.armHolder.position.x, W.y - this.armHolder.position.y, W.z - this.armHolder.position.z], [0, 0, -1], 0);
    const pts = this.sixArm.points(), local = v => this.robotRoot.worldToLocal(v.clone());
    const S = local(pts.shoulder), E = local(pts.elbow), C = local(pts.wrist);

    // 手腕竖直段：从夹具顶到手腕关节
    const top = 138, len = Math.max(10, WRIST - top);
    this.wristHousing.position.set(0, 0, top); this.wristHousing.scale.z = len;
    this.armPose = {shoulder: S.toArray(), elbow: E.toArray(), wrist: W.toArray(), reach: S.distanceTo(C), reachLimit: L1 + L2, reachable: solved.reachable, heading};
  };

  P.setPlatformQuiet = function (p) { this.platform = p === 'mobile' ? 'mobile' : 'fixed'; if (this.stationTrace) this.stationTrace.visible = this.platform === 'mobile'; };
  P.setPlatform = function (p) { this.setPlatformQuiet(p); if (this.robotState) this.applyRobotPose({...this.robotState, platform: this.platform}); this.draw(); };

  const setTheme = P.setTheme;
  P.setTheme = function (dark) {
    const pal = PALETTE[dark ? 'dark' : 'light'];
    for (const [k, v] of Object.entries(pal)) this.mat[k]?.color.setHex(v);
    setTheme.call(this, dark);
  };
})();
