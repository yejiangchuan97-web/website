/* 课程统一六轴机械臂（第三章 3-1/3-2 的教学六轴臂，抽成唯一实现）。
 * 教学自定义构型，不对应品牌型号；关节角只说明动作，不代表真实性能。
 *
 * 坐标：臂自身坐标系 Z 向上，长度单位 mm（与 3-2 的 RobotModel 相同）。
 *   J1 绕 Z，J2/J3 绕 Y，J4 绕 X，J5 绕 Y，J6 绕 X；法兰（工具）沿 J6 的 +X 方向。
 *   底座法兰从 z = MOUNT_Z 开始，安装面放在臂根节点下方 MOUNT_Z 处。
 * 用于 Y 向上、米制的场景时，把 root 放进外层组：rotation.x = -PI/2，scale = 每 mm 对应的米数。
 *
 * CourseSixAxisArm.build(THREE, options) → arm
 *   options.materials {white, shell, dark, steel, rubber, pale}  不给则自建
 *   options.accent    6 个关节标识色材质（数组）或单个材质
 *   options.base      是否画底座法兰（默认 true）
 *   options.upper     大臂长度 J2→J3（默认 360）
 *   options.fore      小臂长度 J3→J4（默认 310）
 *   options.offsets   直接给 6 个关节偏置（第三章用 RobotModel.offsets）
 * arm.root / arm.joints[6] / arm.flange
 * arm.setJoints(qDeg)            关节角（度）
 * arm.solve(p, d, roll)          臂坐标系内：法兰面中心 p、工具方向 d → 关节角（度）
 * arm.reach(p, d, roll)          求解并摆好姿态，返回 {q, reachable, error}
 * arm.reachWorld(p, d, roll)     同上，p、d 为世界坐标（THREE.Vector3）
 * arm.points()                   世界坐标：shoulder(J2)、elbow(J3)、wrist(J5)、flange(法兰面)
 */
(function (root) {
  'use strict';
  const D = Math.PI / 180;
  const AXES = [[0, 0, 1], [0, 1, 0], [0, 1, 0], [1, 0, 0], [0, 1, 0], [1, 0, 0]];
  const MOUNT_Z = 45, FACE = 10;
  const offsetsFor = (upper = 360, fore = 310) => [[0, 0, 100], [0, 0, 110], [0, 0, upper], [fore, 0, 0], [65, 0, 0], [75, 0, 0]];

  /* 纯几何求解，不依赖 THREE（便于测试）。p、d 为臂坐标系 mm。 */
  function solve(offsets, p, d, roll = 0) {
    const h = offsets[0][2] + offsets[1][2], L1 = offsets[2][2], L2 = offsets[3][0] + offsets[4][0], Lf = offsets[5][0] + FACE;
    const n = Math.hypot(d[0], d[1], d[2]) || 1, u = d.map(v => v / n);
    const w = [p[0] - u[0] * Lf, p[1] - u[1] * Lf, p[2] - u[2] * Lf];
    const q1 = Math.atan2(w[1], w[0]);
    const wr = Math.hypot(w[0], w[1]), wz = w[2] - h;
    const raw = Math.hypot(wr, wz), dist = Math.min(L1 + L2 - 1e-6, Math.max(Math.abs(L1 - L2) + 1e-6, raw));
    const ur = wr / (raw || 1), uz = wz / (raw || 1);
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), k = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    // 两个解里取肘部朝上的那个。
    let er = ur * a - uz * k, ez = uz * a + ur * k;
    const er2 = ur * a + uz * k, ez2 = uz * a - ur * k;
    if (ez2 > ez) { er = er2; ez = ez2; }
    const q2 = Math.atan2(er, ez);
    const fr = ur * dist - er, fz = uz * dist - ez, phi = Math.atan2(-fz, fr), q3 = phi - q2;
    // 腕部：让 J6 的 X 轴对准工具方向。
    const c1 = Math.cos(q1), s1 = Math.sin(q1), cp = Math.cos(phi), sp = Math.sin(phi);
    const x0 = u[0] * c1 + u[1] * s1, y0 = -u[0] * s1 + u[1] * c1, z0 = u[2];
    const vx = x0 * cp - z0 * sp, vy = y0, vz = x0 * sp + z0 * cp;
    const s5 = Math.hypot(vy, vz), q5 = Math.atan2(s5, vx), q4 = s5 > 1e-6 ? Math.atan2(vy, -vz) : 0;
    return { q: [q1, q2, q3, q4, q5, roll * D].map(v => v / D), reachable: raw <= L1 + L2 + 1e-3 && raw >= Math.abs(L1 - L2) - 1e-3, error: Math.abs(raw - dist) };
  }

  function build(T, options = {}) {
    const offsets = (options.offsets || offsetsFor(options.upper, options.fore)).map(o => o.slice());
    const U = offsets[2][2], F = offsets[3][0], ku = U / 360, kf = F / 310;
    const own = new Set(), geos = new Map();
    const mk = (color, metalness, roughness) => { const m = new T.MeshStandardMaterial({ color, metalness, roughness }); own.add(m); return m; };
    const given = options.materials || {};
    const M = {
      white: given.white || mk(0xcbd6e3, .45, .31), shell: given.shell || mk(0xdde5ee, .3, .4),
      dark: given.dark || mk(0x273c55, .55, .37), steel: given.steel || mk(0x9fb1c5, .75, .27),
      rubber: given.rubber || mk(0x26323d, .08, .88), pale: given.pale || mk(0x768ca6, .45, .5)
    };
    const accentIn = options.accent;
    const accent = Array.from({ length: 6 }, (_, i) => Array.isArray(accentIn) ? accentIn[i] : accentIn || (i === 0 ? mk(0x347cf2, .35, .32) : mk(0x66809e, .35, .32)));
    const meshes = [];
    function add(parent, geo, mat, p = [0, 0, 0], owner = null) {
      const mesh = new T.Mesh(geo, mat); mesh.position.set(...p); mesh.castShadow = true; mesh.receiveShadow = true;
      if (owner) mesh.userData.owner = owner; parent.add(mesh); meshes.push(mesh); return mesh;
    }
    function rounded(w, d, h, r) {
      const key = ['b', w, d, h, r].join(','); if (geos.has(key)) return geos.get(key);
      r = Math.min(r, w / 3, d / 3, h / 3); const x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, H = d - 2 * r, s = new T.Shape();
      s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r); s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
      s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const geo = new T.ExtrudeGeometry(s, { depth: h - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 2, curveSegments: 5 });
      geo.translate(0, 0, -h / 2 + r); geos.set(key, geo); return geo;
    }
    const box = (parent, w, d, h, p, mat = M.shell, r = 3, owner) => add(parent, rounded(w, d, h, r), mat, p, owner);
    function cyl(parent, r, len, p, mat = M.steel, axis = 'z', n = 40, owner) {
      const key = ['c', r, len, n].join(','); let geo = geos.get(key); if (!geo) { geo = new T.CylinderGeometry(r, r, len, n); geos.set(key, geo); }
      const mesh = add(parent, geo, mat, p, owner); if (axis === 'z') mesh.rotation.x = Math.PI / 2; if (axis === 'x') mesh.rotation.z = -Math.PI / 2; return mesh;
    }
    function torus(parent, r, t, p, mat, axis = 'z') {
      const key = ['t', r, t].join(','); let geo = geos.get(key); if (!geo) { geo = new T.TorusGeometry(r, t, 7, 56); geos.set(key, geo); }
      const mesh = add(parent, geo, mat, p); if (axis === 'y') mesh.rotation.x = Math.PI / 2; if (axis === 'x') mesh.rotation.y = Math.PI / 2; return mesh;
    }
    const plus = (a, b) => a.map((v, i) => v + b[i]);
    function bolt(parent, p, axis = 'z', size = 4) { cyl(parent, size * 1.5, 1.8, p, M.steel, axis, 16); cyl(parent, size, 3.1, plus(p, axis === 'z' ? [0, 0, 2] : axis === 'y' ? [0, -2, 0] : [2, 0, 0]), M.dark, axis, 6); }
    function ring(parent, c, axis, r, count = 8, size = 3) {
      for (let i = 0; i < count; i++) { const a = i * Math.PI * 2 / count, o = axis === 'z' ? [Math.cos(a) * r, Math.sin(a) * r, 0] : axis === 'y' ? [Math.cos(a) * r, 0, Math.sin(a) * r] : [0, Math.cos(a) * r, Math.sin(a) * r]; bolt(parent, plus(c, o), axis, size); }
    }

    const arm = new T.Group(); arm.name = 'course-six-axis-arm';
    if (options.base !== false) {
      const base = new T.Group(); base.name = 'arm-base-flange'; arm.add(base);
      cyl(base, 103, 12, [0, 0, 51], M.dark); cyl(base, 91, 33, [0, 0, 72], M.white); cyl(base, 106, 8, [0, 0, 91], M.steel); ring(base, [0, 0, 96], 'z', 92, 8, 4); cyl(base, 72, 11, [0, 0, 99], M.rubber);
    }
    const joints = []; let parent = arm;
    for (let i = 0; i < 6; i++) { const g = new T.Group(); g.name = 'J' + (i + 1); g.position.set(...offsets[i]); g.userData.joint = i; parent.add(g); joints.push(g); parent = g; }
    const [j1, j2, j3, j4, j5, j6] = joints;
    // J1 回转座与肩部支座
    cyl(j1, 69, 30, [0, 0, 12], M.white); torus(j1, 69, 1.5, [0, 0, 24], M.dark); cyl(j1, 65, 10, [0, 0, 31], accent[0]);
    for (const y of [-53, 53]) box(j1, 93, 23, 93, [0, y, 75], M.white, 7);
    box(j1, 80, 84, 15, [0, 0, 41], M.white, 5); for (const y of [-66, 66]) { cyl(j1, 45, 10, [0, y, 110], M.dark, 'y'); torus(j1, 38, 2, [0, y - 6, 110], M.steel, 'y'); }
    // J2 肩部轴承与大臂外壳（按大臂长度伸缩）
    cyl(j2, 47, 102, [0, 0, 0], M.steel, 'y'); cyl(j2, 53, 22, [0, -69, 0], M.white, 'y'); cyl(j2, 39, 5, [0, -82, 0], accent[1], 'y'); ring(j2, [0, -86, 0], 'y', 44, 8, 3); cyl(j2, 34, 7, [0, 61, 0], M.dark, 'y');
    box(j2, 89, 77, U - 79, [0, 0, U / 2 - 2], M.white, 13, 'upper'); box(j2, 60, 4, U - 127, [0, -40, U / 2 - 3], M.shell, 1); box(j2, 48, 4, U - 166, [0, 40, U / 2 - 3], M.shell, 1);
    box(j2, 33, 5, 137 * ku, [0, -44, U / 2 - 1], accent[1], 1.5); box(j2, 68, 69, 25, [0, 0, 33], M.steel, 5); box(j2, 66, 69, 25, [0, 0, U - 34], M.steel, 5);
    for (const z of [69, U - 74]) for (const x of [-24, 24]) bolt(j2, [x, -44, z], 'y', 2.6);
    // J3 肘部与小臂外壳（按小臂长度伸缩）
    cyl(j3, 44, 98, [0, 0, 0], M.steel, 'y'); cyl(j3, 49, 18, [0, -59, 0], M.white, 'y'); cyl(j3, 35, 4, [0, -70, 0], accent[2], 'y'); ring(j3, [0, -74, 0], 'y', 41, 8, 2.8); cyl(j3, 36, 7, [0, 53, 0], M.dark, 'y');
    box(j3, F - 57, 67, 70, [F / 2, 0, 0], M.white, 11, 'forearm'); box(j3, F - 103, 4, 43, [F / 2 + 3, -35, 0], M.shell, 1); box(j3, F - 140, 4, 35, [F / 2 + 5, 35, 0], M.shell, 1);
    box(j3, 160 * kf, 5, 18, [F / 2 + 5, -39, 0], accent[2], 1); box(j3, F - 100, 22, 6, [F / 2 + 6, 0, 37], M.pale, 1);
    for (const x of [65, F - 63]) for (const z of [-20, 20]) bolt(j3, [x, -38, z], 'y', 2.4);
    cyl(j3, 34, 17, [F - 16, 0, 0], M.steel, 'x');
    // 同轴腕 J4、垂直腕 J5、输出法兰 J6
    cyl(j4, 34, 47, [23.5, 0, 0], M.white, 'x', 40, 'wrist'); cyl(j4, 35, 6, [3, 0, 0], M.dark, 'x'); cyl(j4, 33, 5, [46, 0, 0], accent[3], 'x'); ring(j4, [3, 0, 0], 'x', 27, 6, 2.3); torus(j4, 34, 1, [36, 0, 0], M.steel, 'x');
    for (const y of [-29, 29]) box(j4, 30, 12, 55, [54, y, 0], M.white, 4, 'wrist');
    cyl(j5, 28, 66, [0, 0, 0], M.steel, 'y'); cyl(j5, 31, 7, [0, -36, 0], M.white, 'y'); cyl(j5, 22, 4, [0, -42, 0], accent[4], 'y'); ring(j5, [0, -45, 0], 'y', 25, 6, 2); cyl(j5, 26, 8, [0, 37, 0], M.dark, 'y');
    cyl(j5, 25, 49, [37, 0, 0], M.white, 'x', 40, 'wrist'); cyl(j5, 26, 6, [63, 0, 0], M.steel, 'x');
    cyl(j6, 28, 10, [-5, 0, 0], accent[5], 'x'); cyl(j6, 31, 5, [2, 0, 0], M.steel, 'x'); ring(j6, [5, 0, 0], 'x', 24, 6, 2); cyl(j6, 22, 6, [7, 0, 0], M.dark, 'x');
    // 工具安装点：法兰面中心，局部 +Z 指向工具（与 3-2 的 toolRoot 一致）。
    const mount = new T.Group(); mount.name = 'tool-mount'; mount.rotation.y = Math.PI / 2; j6.add(mount);

    const q = [0, 0, 0, 0, 0, 0], tmp = new T.Vector3(), axisV = AXES.map(a => new T.Vector3(...a));
    function setJoints(deg) { for (let i = 0; i < 6; i++) { q[i] = deg[i]; joints[i].quaternion.setFromAxisAngle(axisV[i], deg[i] * D); } arm.updateMatrixWorld(true); return api; }
    function reach(p, d, roll = 0) { const r = solve(offsets, p, d, roll); setJoints(r.q); return r; }
    const inv = new T.Matrix4();
    function reachWorld(p, d, roll = 0) {
      arm.updateWorldMatrix(true, false); inv.copy(arm.matrixWorld).invert();
      const lp = p.clone().applyMatrix4(inv), ld = d.clone().transformDirection(inv);
      return reach([lp.x, lp.y, lp.z], [ld.x, ld.y, ld.z], roll);
    }
    function points() {
      arm.updateMatrixWorld(true);
      return { shoulder: j2.getWorldPosition(new T.Vector3()), elbow: j3.getWorldPosition(new T.Vector3()), wrist: j5.getWorldPosition(new T.Vector3()), flange: j6.localToWorld(tmp.set(FACE, 0, 0)).clone() };
    }
    function dispose() { geos.forEach(g => g.dispose()); own.forEach(m => m.dispose()); }
    const api = { root: arm, joints, flange: j6, mount, meshes, accent, materials: M, offsets, axes: AXES, mountZ: MOUNT_Z, face: FACE, q, setJoints, solve: (p, d, roll) => solve(offsets, p, d, roll), reach, reachWorld, points, dispose };
    return api;
  }

  const CourseSixAxisArm = { build, solve, offsetsFor, AXES, MOUNT_Z, FACE };
  if (typeof module === 'object' && module.exports) module.exports = CourseSixAxisArm;
  root.CourseSixAxisArm = CourseSixAxisArm;
})(typeof window !== 'undefined' ? window : globalThis);
