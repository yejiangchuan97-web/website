/* Inspection platforms: metres, Y up, local +X forward. No scene ownership. */
(function () {
  'use strict';
  window.createInspectionRobot = function createInspectionRobot(T, type) {
    if (!['wheel', 'dog', 'crawler'].includes(type)) throw new Error('Unknown inspection platform: ' + type);
    const group = new T.Group(); group.name = 'robot.' + type;
    const V = p => new T.Vector3(...p), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const cache = new Map(), parts = [], disposables = [], wheels = [], legs = [], explode = [], internals=[];
    const material = (name, color, roughness = .48, metalness = .12) => {
      const m = new T.MeshStandardMaterial({color, roughness, metalness}); m.name = type + '.' + name; disposables.push(m); return m;
    };
    const mat = {
      white: material('porcelain-shell', '#e9f2f8', .38, .10), light: material('edge-trim', '#c7d9e7', .39, .28),
      blue: material('blue-shell', '#367dbb', .38, .22), navy: material('navy-frame', '#243c51', .55, .22),
      metal: material('brushed-aluminium', '#8faabd', .36, .70), steel: material('machined-steel', '#5f788b', .34, .75),
      rubber: material('rubber', '#202c38', .9, .01), tread: material('tread', '#384957', .84, .02),
      black: material('optics-housing', '#152c40', .43, .16), glass: material('optical-glass', '#194d72', .14, .72),
      board: material('control-board', '#356d7d', .7, .06), copper: material('connector', '#a78a55', .39, .62),
      red: material('emergency-stop', '#c95a55', .56, .08), lamp: material('work-light', '#ecf8ff', .25, .05),
      led: material('status-led', '#67bad8', .3, .13)
    };
    mat.glass.envMapIntensity = 1.6; mat.lamp.emissive.set('#a1c9df'); mat.lamp.emissiveIntensity = .25;
    mat.led.emissive.set('#177fa7'); mat.led.emissiveIntensity = .5;
    function geo(key, make) { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); }
    function add(parent, geometry, material, p, name) {
      const mesh = new T.Mesh(geometry, material); mesh.position.set(...p); mesh.name = type + '.' + name;
      mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); parts.push(mesh); return mesh;
    }
    function assembly(parent, p, name) { const g = new T.Group(); g.position.set(...p); g.name = type + '.' + name; parent.add(g); return g; }
    function box(parent, w, h, d, p, m, name, bevel = .012) {
      const r = Math.max(0, Math.min(bevel, w * .2, h * .2, d * .2));
      const g = geo(['box', w, h, d, r].join('/'), () => {
        if (r < .001) return new T.BoxGeometry(w, h, d);
        const x = -w / 2 + r, y = -d / 2 + r, W = w - 2 * r, D = d - 2 * r, q = Math.min(r, W / 3, D / 3), s = new T.Shape();
        s.moveTo(x + q, y); s.lineTo(x + W - q, y); s.quadraticCurveTo(x + W, y, x + W, y + q);
        s.lineTo(x + W, y + D - q); s.quadraticCurveTo(x + W, y + D, x + W - q, y + D);
        s.lineTo(x + q, y + D); s.quadraticCurveTo(x, y + D, x, y + D - q);
        s.lineTo(x, y + q); s.quadraticCurveTo(x, y, x + q, y);
        const out = new T.ExtrudeGeometry(s, {depth: h - 2 * r, steps: 1, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 2, curveSegments: 4});
        out.translate(0, 0, -h / 2 + r); out.rotateX(-Math.PI / 2); return out;
      });
      return add(parent, g, m, p, name);
    }
    function cyl(parent, r, length, p, m, name, axis = 'y', segments = 24) {
      const mesh = add(parent, geo(['cylinder', r, length, segments].join('/'), () => new T.CylinderGeometry(r, r, length, segments)), m, p, name);
      if (axis === 'x') mesh.rotation.z = -Math.PI / 2; if (axis === 'z') mesh.rotation.x = Math.PI / 2; return mesh;
    }
    function ring(parent, r, tube, p, m, name, axis = 'y') {
      const mesh = add(parent, geo(['ring', r, tube].join('/'), () => new T.TorusGeometry(r, tube, 6, 32)), m, p, name);
      if (axis === 'x') mesh.rotation.y = Math.PI / 2; if (axis === 'y') mesh.rotation.x = Math.PI / 2; return mesh;
    }
    function sphere(parent, r, p, m, name) { return add(parent, geo('ball/' + r, () => new T.SphereGeometry(r, 16, 10)), m, p, name); }
    function beam(parent, a, b, radius, m, name) {
      const o = add(parent, geo('beam/' + radius, () => new T.CylinderGeometry(radius, radius, 1, 14)), m, [0, 0, 0], name); fit(o, a, b); return o;
    }
    function fit(o, a, b) { const av = V(a), bv = V(b), d = bv.clone().sub(av); o.position.copy(av.add(bv).multiplyScalar(.5)); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.clone().normalize()); o.scale.y = d.length(); }
    function bolt(parent, p, name, axis = 'y', radius = .009) {
      cyl(parent, radius * 1.28, radius * .35, p, mat.steel, name + '.washer', axis, 20);
      const off = p.slice(), k = {x: 0, y: 1, z: 2}[axis]; off[k] += radius * .35;
      cyl(parent, radius, radius * .55, off, mat.metal, name + '.head', axis, 6);
      off[k] += radius * .31; cyl(parent, radius * .43, radius * .10, off, mat.navy, name + '.socket', axis, 6);
    }
    function lens(parent, p, radius, name) {
      cyl(parent, radius * 1.27, radius * .7, p, mat.black, name + '.barrel', 'x');
      const x = p[0] + radius * .37;
      ring(parent, radius, radius * .09, [x, p[1], p[2]], mat.metal, name + '.retainer', 'x');
      cyl(parent, radius * .9, .006, [x + .003, p[1], p[2]], mat.glass, name + '.glass', 'x');
      const reflection = sphere(parent, radius * .17, [x + .009, p[1] + radius * .35, p[2] - radius * .25], mat.light, name + '.glass-reflection'); reflection.scale.x = .15;
      return [x + .009, p[1], p[2]];
    }
    function lamp(parent, p, name, radius = .027) {
      cyl(parent, radius * 1.2, .022, p, mat.black, name + '.bezel', 'x');
      cyl(parent, radius, .005, [p[0] + .013, p[1], p[2]], mat.lamp, name + '.diffuser', 'x');
    }
    function battery(parent, p, w, d, name) {
      const first=parts.length;
      box(parent, w, .095, d, p, mat.navy, name + '.battery', .01);
      for (const z of [-d * .30, d * .30]) box(parent, w + .008, .007, .024, [p[0], p[1] + .051, p[2] + z], mat.light, name + '.retaining-band', .002);
      box(parent, .065, .022, .04, [p[0] + w * .36, p[1] + .058, p[2]], mat.copper, name + '.connector', .003);
      internals.push(...parts.slice(first));
    }
    function controller(parent, p, w, d, name) {
      const first=parts.length;
      box(parent, w, .014, d, p, mat.board, name + '.pcb', .002);
      box(parent, w * .34, .025, d * .48, [p[0], p[1] + .021, p[2]], mat.black, name + '.processor', .002);
      for (let i = 0; i < 5; i++) box(parent, .014, .026, d * .46, [p[0] + (i - 2) * .018, p[1] + .044, p[2]], mat.metal, name + '.heat-sink-' + i, .002);
      for (const x of [-1, 1]) for (const z of [-1, 1]) cyl(parent, .008, .026, [p[0] + x * (w / 2 - .015), p[1] - .014, p[2] + z * (d / 2 - .015)], mat.metal, name + '.mount-' + x + '-' + z);
      internals.push(...parts.slice(first));
    }
    function lifting(g, baseY, lift) { explode.push({g, baseY, lift}); }
    function lidar(parent, p, name, r = .07) {
      cyl(parent, r * 1.13, .022, p, mat.navy, name + '.mount');
      cyl(parent, r, .045, [p[0], p[1] + .033, p[2]], mat.black, name + '.scan-window');
      cyl(parent, r * .96, .018, [p[0], p[1] + .064, p[2]], mat.light, name + '.cap');
      ring(parent, r * .96, .004, [p[0], p[1] + .054, p[2]], mat.blue, name + '.seam');
    }
    function cameraPod(parent, p, name, size = 1) {
      const g = assembly(parent, p, name); g.scale.setScalar(size);
      cyl(g, .083, .035, [0, .018, 0], mat.light, name + '.base');
      cyl(g, .056, .052, [0, .056, 0], mat.navy, name + '.yaw-drive');
      const yoke = assembly(g, [0, .085, 0], name + '.yoke');
      box(yoke, .14, .022, .25, [0, .006, 0], mat.blue, name + '.crossbar', .007);
      for (const z of [-.116, .116]) {
        box(yoke, .047, .13, .027, [0, .064, z], mat.light, name + '.fork-' + z, .009);
        cyl(yoke, .028, .033, [0, .11, z], mat.navy, name + '.pitch-bearing-' + z, 'z');
      }
      const head = assembly(yoke, [0, .11, 0], name + '.head');
      box(head, .18, .13, .18, [.025, 0, 0], mat.white, name + '.housing', .025);
      box(head, .018, .105, .17, [.116, 0, 0], mat.navy, name + '.front-plate', .006);
      const optical = lens(head, [.137, 0, 0], .044, name + '.optic');
      lamp(head, [.133, .023, -.063], name + '.left-light', .017); lamp(head, [.133, .023, .063], name + '.right-light', .017);
      for (const z of [-.063, .063]) bolt(head, [.025, .069, z], name + '.lid-bolt-' + z, 'y', .006);
      const opticalFrame = assembly(head, optical, name + '.optical-centre'); opticalFrame.userData.forward = [1, 0, 0];
      return {g, head, yaw: yoke, cameraMount: opticalFrame};
    }
    function makeWheel(parent, p, radius, width, name, magnetic = false) {
      const g = assembly(parent, p, name); wheels.push({g, radius});
      const treadHeight=magnetic?.007:.012,treadWidth=magnetic?.025:.032,treadRadius=radius-treadHeight/2-treadWidth*treadWidth/(8*radius);
      cyl(g, radius-treadHeight/2, width, [0, 0, 0], mat.rubber, name + '.tyre', 'z', 36);
      cyl(g, radius * .73, width + .008, [0, 0, 0], mat.light, name + '.hub', 'z', 28);
      for (const side of [-1, 1]) {
        const z = side * (width / 2 + .008);
        cyl(g, radius * .50, .012, [0, 0, z], magnetic ? mat.steel : mat.blue, name + '.drive-cover-' + side, 'z', 24);
        cyl(g, radius * .22, .024, [0, 0, z + side * .007], mat.metal, name + '.axle-cap-' + side, 'z');
        ring(g, radius * .68, .005, [0, 0, z], mat.steel, name + '.rim-' + side, 'z');
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3;
          cyl(g, radius * .035, .009, [Math.cos(a) * radius * .38, Math.sin(a) * radius * .38, z + side * .009], mat.metal, name + '.hub-bolt-' + side + '-' + i, 'z', 6);
        }
      }
      const n = magnetic ? 16 : 28;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const t = box(g,treadWidth,treadHeight,width*.92,[Math.sin(a)*treadRadius,Math.cos(a)*treadRadius,0],magnetic?mat.steel:mat.tread,name+'.traction-'+i,.002);t.rotation.z=-a;
      }
      if (magnetic) for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        for (const s of [-1, 1]) {
          const pole = box(g, .031, .027, .009, [Math.sin(a) * radius * .80, Math.cos(a) * radius * .80, s * (width / 2 + .003)], mat.metal, name + '.magnetic-pole-' + s + '-' + i, .002); pole.rotation.z = -a;
        }
      }
      return g;
    }

    let pod, body, adhesionLED, dimensions,tetherMount=null;
    if (type === 'wheel') {
      body = assembly(group, [0, 0, 0], 'body');
      box(body, .92, .095, .51, [0, .245, 0], mat.navy, 'load-bearing-chassis', .035);
      box(body, .91, .20, .52, [0, .365, 0], mat.white, 'sealed-body', .04);
      for (const z of [-.263, .263]) box(body, .79, .045, .022, [0, .315, z], mat.blue, 'side-rub-rail-' + z, .009);
      for (const x of [-.482, .482]) box(body, .065, .092, .51, [x, .285, 0], mat.rubber, 'bumper-' + x, .025);
      const hood = assembly(body, [0, .475, 0], 'removable-cover');
      box(hood, .84, .018, .47, [0, -.012, 0], mat.navy, 'lid-seal', .02);
      box(hood, .84, .046, .47, [0, .017, 0], mat.light, 'lid-edge', .025);
      box(hood, .76, .018, .40, [0, .046, 0], mat.white, 'lid-face', .012); lifting(hood, .475, .19);
      for (const x of [-.34, .34]) for (const z of [-.17, .17]) bolt(hood, [x, .058, z], 'lid-fastener-' + x + '-' + z);
      battery(body, [-.15, .442, 0], .32, .30, 'power'); controller(body, [.21, .43, 0], .21, .31, 'drive-control');
      for (const x of [-.34, .34]) for (const z of [-.32, .32]) {
        const s = Math.sign(z); beam(body, [x - .055, .255, s * .20], [x, .17, z], .024, mat.metal, 'suspension-arm-' + x + '-' + z);
        beam(body, [x + .075, .30, s * .215], [x + .02, .184, s * .282], .012, mat.steel, 'damper-rod-' + x + '-' + z);
        beam(body, [x + .075, .30, s * .215], [x + .043, .233, s * .25], .023, mat.light, 'damper-barrel-' + x + '-' + z);
        cyl(body, .031, .17, [x, .17, s * .25], mat.metal, 'drive-axle-' + x + '-' + z, 'z');
        makeWheel(body, [x, .17, z], .17, .106, 'wheel-' + x + '-' + z);
      }
      for (const z of [-.263, .263]) for (let i = 0; i < 6; i++) box(body, .032, .018, .006, [-.14 + i * .052, .397, z], mat.navy, 'sealed-cooling-fin-' + z + '-' + i, .003);
      box(body, .011, .11, .20, [-.459, .36, 0], mat.light, 'rear-service-cover', .009);
      cyl(body, .03, .014, [-.473, .36, .055], mat.navy, 'rear-charge-socket', 'x');
      cyl(body, .020, .016, [-.482, .36, .055], mat.black, 'charge-socket-cap', 'x');
      lamp(body, [.518, .30, -.17], 'front-left-light'); lamp(body, [.518, .30, .17], 'front-right-light');
      const mast = assembly(body, [.17, .50, 0], 'camera-mast');
      box(mast, .22, .035, .19, [0, .025, 0], mat.blue, 'mast-base', .012);
      for (const x of [-.07, .07]) for (const z of [-.055, .055]) bolt(mast, [x, .046, z], 'mast-mount-' + x + '-' + z, 'y', .007);
      cyl(mast, .041, .24, [0, .165, 0], mat.light, 'mast-outer');
      cyl(mast, .032, .22, [0, .31, 0], mat.metal, 'mast-inner');
      cyl(mast, .047, .028, [0, .285, 0], mat.navy, 'mast-lock-collar');
      box(mast, .031, .028, .065, [.032, .285, 0], mat.blue, 'mast-lock-clamp', .007);
      pod = cameraPod(mast, [0, .415, 0], 'inspection-camera', 1); lifting(mast, .50, .19);
      lidar(hood, [-.21, .077, 0], 'navigation-lidar', .078);
      cyl(hood, .028, .018, [-.30, .066, .125], mat.navy, 'emergency-stop-seat');
      cyl(hood, .023, .023, [-.30, .085, .125], mat.red, 'emergency-stop');
      dimensions = {length:1.03, width:.77, height:1.19, wheelRadius:.17, track:.64, wheelbase:.68};
    }

    if (type === 'dog') {
      body = assembly(group, [0, 0, 0], 'body');
      box(body, .80, .125, .38, [0, .565, 0], mat.navy, 'spine-frame', .045);
      box(body, .83, .125, .405, [0, .617, 0], mat.white, 'sealed-body', .048);
      const hood = assembly(body, [0, .686, 0], 'removable-cover');
      box(hood, .70, .014, .36, [0, -.009, 0], mat.navy, 'cover-seal', .018);
      box(hood, .70, .030, .36, [0, .012, 0], mat.light, 'top-cover', .020); lifting(hood, .686, .16);
      for (const x of [-.28, .28]) for (const z of [-.13, .13]) bolt(hood, [x, .03, z], 'cover-bolt-' + x + '-' + z, 'y', .007);
      for (const z of [-.209, .209]) {
        box(body, .52, .045, .025, [0, .60, z], mat.blue, 'side-protection-' + z, .009);
        for (let i = 0; i < 6; i++) box(body, .026, .025, .005, [-.13 + i * .049, .642, z], mat.navy, 'cooling-port-' + z + '-' + i, .003);
      }
      box(body, .025, .10, .29, [-.417, .60, 0], mat.light, 'battery-rear-hatch', .012);
      for (const z of [-.065, .065]) beam(body, [-.438, .59, z], [-.464, .59, z], .011, mat.steel, 'battery-handle-standoff-' + z);
      beam(body, [-.464, .59, -.065], [-.464, .59, .065], .013, mat.navy, 'battery-handle');
      box(body, .026, .10, .32, [.424, .61, 0], mat.navy, 'front-sensor-face', .015);
      lens(body, [.449, .625, -.085], .032, 'front-depth-left'); lens(body, [.449, .625, .085], .032, 'front-depth-right');
      lamp(body, [.448, .581, -.13], 'front-left-lamp', .015); lamp(body, [.448, .581, .13], 'front-right-lamp', .015);
      battery(body, [-.12, .655, 0], .29, .25, 'power'); controller(body, [.20, .65, 0], .19, .25, 'locomotion-control');
      pod = cameraPod(hood, [.20, .037, 0], 'inspection-camera', .78);
      lidar(hood, [-.18, .042, 0], 'navigation-lidar', .057);
      cyl(hood, .022, .018, [-.27, .044, .10], mat.navy, 'emergency-stop-seat'); cyl(hood, .018, .016, [-.27, .059, .10], mat.red, 'emergency-stop');
      const hips = [[.29, .535, -.245], [.29, .535, .245], [-.29, .535, -.245], [-.29, .535, .245]];
      hips.forEach((hip, i) => {
        const side = Math.sign(hip[2]), g = assembly(group, [0, 0, 0], 'leg-' + i), n = 'leg-' + i;
        cyl(body, .069, .10, [hip[0], hip[1], side * .20], mat.light, n + '.abduction-drive', 'z');
        cyl(body, .052, .017, [hip[0], hip[1], side * .258], mat.blue, n + '.abduction-cap', 'z');
        for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI * 2; cyl(body, .0045, .012, [hip[0] + .038 * Math.cos(a), hip[1] + .038 * Math.sin(a), side * .270], mat.metal, n + '.abduction-bolt-' + j, 'z', 6); }
        const upper = beam(g, hip, [hip[0], .30, hip[2]], .036, mat.white, n + '.upper-leg');
        const upperTrim = beam(g, hip, [hip[0], .30, hip[2]], .014, mat.blue, n + '.upper-reinforcement');
        const knee = assembly(g, [0, 0, 0], n + '.knee');
        cyl(knee, .052, .083, [0, 0, 0], mat.light, n + '.knee-drive', 'z');
        cyl(knee, .039, .012, [0, 0, side * .049], mat.navy, n + '.knee-cover', 'z');
        cyl(knee, .014, .016, [0, 0, side * .058], mat.blue, n + '.knee-axle', 'z');
        for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5; cyl(knee, .004, .008, [.028 * Math.cos(a), .028 * Math.sin(a), side * .058], mat.metal, n + '.knee-bolt-' + j, 'z', 6); }
        const lower = beam(g, [hip[0], .30, hip[2]], [hip[0], .04, hip[2]], .021, mat.navy, n + '.lower-leg');
        const lowerFairing = beam(g, [hip[0], .30, hip[2]], [hip[0], .15, hip[2]], .030, mat.light, n + '.shin-cover');
        const ankle = sphere(g, .026, [0, 0, 0], mat.metal, n + '.ankle');
        const foot = assembly(g, [0, 0, 0], n + '.foot');
        box(foot, .084, .048, .074, [0, .024, 0], mat.rubber, n + '.rubber-foot', .016);
        for (let j = 0; j < 3; j++) box(foot, .067, .004, .012, [0, .002, (j - 1) * .021], mat.tread, n + '.sole-grip-' + j, .001);
        legs.push({g, hip, upper, upperTrim, knee, lower, lowerFairing, ankle, foot, phase:[0,.5,.75,.25][i], bend:hip[0] > 0 ? -1 : 1, lastFoot:null, error:0});
      });
      dimensions = {length:1.02, width:.67, height:.91, upperLeg:.27, lowerLeg:.29, hipHeight:.535};
    }

    if (type === 'crawler') {
      body = assembly(group, [0, 0, 0], 'body');
      box(body, .65, .075, .37, [0, .125, 0], mat.navy, 'sealed-drive-frame', .025);
      box(body, .60, .10, .37, [0, .193, 0], mat.white, 'shell-side', .028);
      const hood = assembly(body, [0, .249, 0], 'removable-cover');
      box(hood, .54, .013, .335, [0, -.009, 0], mat.navy, 'lid-seal', .012);
      box(hood, .54, .025, .335, [0, .01, 0], mat.light, 'lid-face', .016); lifting(hood, .249, .14);
      for (const x of [-.21, .21]) for (const z of [-.12, .12]) bolt(hood, [x, .026, z], 'lid-bolt-' + x + '-' + z, 'y', .006);
      for (const z of [-.192, .192]) box(body, .51, .035, .018, [0, .185, z], mat.blue, 'side-rub-rail-' + z, .007);
      battery(body, [-.13, .219, 0], .21, .25, 'power'); controller(body, [.13, .21, 0], .18, .25, 'magnetic-drive-controller');
      for (const x of [-.235, .235]) for (const z of [-.255, .255]) {
        const s = Math.sign(z);
        box(body, .14, .065, .065, [x, .128, s * .195], mat.light, 'axle-mount-' + x + '-' + z, .012);
        cyl(body, .041, .10, [x, .105, s * .185], mat.navy, 'geared-motor-' + x + '-' + z, 'z');
        cyl(body, .021, .15, [x, .105, s * .22], mat.metal, 'wheel-axle-' + x + '-' + z, 'z');
        makeWheel(body, [x, .105, z], .105, .093, 'magnetic-wheel-' + x + '-' + z, true);
      }
      for (const x of [-.35, .35]) {
        for (const z of [-.13, .13]) beam(body, [x * .87, .14, z], [x, .14, z], .008, mat.steel, 'bumper-support-' + x + '-' + z);
        beam(body, [x, .14, -.17], [x, .14, .17], .017, mat.rubber, 'touch-bumper-' + x);
      }
      box(hood, .14, .018, .16, [-.175, .035, 0], mat.blue, 'tether-anchor-plate', .005);
      for (const x of [-.219, -.131]) for (const z of [-.052, .052]) bolt(hood, [x, .048, z], 'anchor-bolt-' + x + '-' + z, 'y', .006);
      ring(hood, .035, .009, [-.175, .076, 0], mat.metal, 'tether-eye', 'z');
      tetherMount=assembly(hood,[-.140,.076,0],'tether-attachment');
      pod = cameraPod(hood, [.17, .028, 0], 'inspection-camera', .62);
      cyl(body, .024, .013, [-.312, .195, -.09], mat.black, 'power-connector', 'x');
      cyl(body, .017, .015, [-.315, .195, .09], mat.metal, 'signal-connector', 'x');
      adhesionLED = cyl(hood, .011, .008, [-.03, .029, .12], mat.led, 'adhesion-status-light');
      dimensions = {length:.72, width:.62, height:.43, wheelRadius:.105, track:.51, wheelbase:.47};
    }

    const pose = {travel:0, time:0, moving:false, exploded:0, adhesion:true};
    let lastTime = null, motionBlend = 0, terrainAt = () => 0;
    const torso = {ready:false,worldY:0,pitch:0,lastTravel:0};
    function solveLeg(leg, foot) {
      body.updateMatrix();
      const hip = V(leg.hip).applyMatrix4(body.matrix).toArray(), ankle = [foot[0], foot[1] + .048, foot[2]];
      const dx = ankle[0] - hip[0], dy = ankle[1] - hip[1], dz = ankle[2] - hip[2];
      const rawDistance = Math.hypot(dx, dy, dz), d = clamp(rawDistance, .020001, .27 + .29 - .0001);
      const dir = V([dx, dy, dz]).normalize(), a = (.27 * .27 - .29 * .29 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, .27 * .27 - a * a));
      let perpendicular = new T.Vector3(-dir.y, dir.x, 0); if (perpendicular.lengthSq() < .0001) perpendicular.set(1, 0, 0); perpendicular.normalize().multiplyScalar(h * leg.bend);
      const k = V(hip).add(dir.clone().multiplyScalar(a)).add(perpendicular).toArray();
      fit(leg.upper, hip, k); const side = Math.sign(hip[2]); fit(leg.upperTrim, [hip[0], hip[1], hip[2] + side * .029], [k[0], k[1], k[2] + side * .029]);
      leg.knee.position.set(...k); fit(leg.lower, k, ankle);
      const end = k.map((v, i) => v + (ankle[i] - v) * .58); fit(leg.lowerFairing, k, end);
      leg.ankle.position.set(...ankle); leg.foot.position.set(...foot); leg.lastFoot = foot.slice();
      leg.error = Math.max(Math.abs(V(k).distanceTo(V(hip)) - .27), Math.abs(V(k).distanceTo(V(ankle)) - .29));
    }
    function setPose(next = {}) {
      for(const [key,value] of Object.entries(next))if(key!=='groundAt'&&key!=='feet')pose[key]=value;
      if(typeof next.groundAt==='function')terrainAt=next.groundAt;
      else if(next.groundAt===null)terrainAt=()=>0;
      pose.travel = Number.isFinite(+pose.travel) ? +pose.travel : 0; pose.time = Number.isFinite(+pose.time) ? +pose.time : 0;
      const e = clamp(+pose.exploded || 0, 0, 1), dt = lastTime === null ? 1 / 60 : clamp(pose.time - lastTime, 0, .1); lastTime = pose.time;
      motionBlend += ((pose.moving ? 1 : 0) - motionBlend) * (1 - Math.exp(-dt * 12));
      if (!pose.moving && (pose.reducedMotion || motionBlend < .003)) motionBlend = 0;
      for (const item of explode) item.g.position.y = item.baseY + e * item.lift;
      for(const part of internals)part.visible=e>.02;
      for (const wheel of wheels) wheel.g.rotation.z = -pose.travel / wheel.radius;
      if (type === 'dog') {
        const ground = terrainAt;
        const finiteGround = (x,z) => { const y = +ground(x,z); return Number.isFinite(y) ? y : 0; };
        const rearGround = finiteGround(-.33, 0), frontGround = finiteGround(.33, 0), terrain = Math.abs(frontGround - rearGround) > .025;
        const tilt = clamp(Math.atan2(frontGround - rearGround, .66), -.58, .58), centerGround = (frontGround + rearGround) / 2;
        const bob = .006 * Math.cos(pose.travel / (.32 / .72) * Math.PI * 4) * motionBlend;
        const discontinuous=!torso.ready||Math.abs(pose.travel-torso.lastTravel)>.20,settle=discontinuous||!pose.moving&&motionBlend<.03?1:1-Math.exp(-dt*11);
        torso.pitch+=(tilt-torso.pitch)*settle;
        const desiredWorldY=group.position.y+centerGround+(terrain?-.045:0)+bob+.535*(1-Math.cos(torso.pitch));
        const verticalDelta=(desiredWorldY-torso.worldY)*settle;
        torso.worldY+=settle===1?verticalDelta:clamp(verticalDelta,-dt*.65,dt*.65);
        torso.ready=true;torso.lastTravel=pose.travel;
        // The root may advance abruptly to the next tread height. Smooth the
        // torso in world Y, then subtract that root height so the visible body
        // stays continuous while each foot follows its own contact surface.
        body.rotation.z=torso.pitch;body.position.x=Math.sin(torso.pitch)*.535;body.position.y=torso.worldY-group.position.y;
        const targets = legs.map((leg, i) => {
          let foot;
          if (Array.isArray(next.feet) && next.feet[i]) {
            const f = next.feet[i]; foot = Array.isArray(f) ? f.slice(0, 3) : [f.x, f.y, f.z];
          } else {
            const q = ((pose.travel / (.32 / .72) + leg.phase) % 1 + 1) % 1;
            let x, lift;
            if (q < .72) { x = .16 - .32 * q / .72; lift = 0; }
            else {
              const s = (q - .72) / .28, h=clamp((s-.22)/.56,0,1), ease=h*h*(3-2*h);
              // Keep the foot still in world X while lifting, then move it to the
              // next contact and lower it. Subtract the root's continuing travel.
              x = -.16 - (.32/.72)*.28*s + (.32/.72)*ease; lift = 0;
            }
            const fx = leg.hip[0] + x * motionBlend;
            let floor = finiteGround(fx, leg.hip[2]);
            if (q >= .72 && motionBlend > .01) {
              // Raise a swinging foot before a riser, instead of snapping it upward
              // when its sample point first crosses the stair edge.
              const s = (q-.72)/.28, takeoffX=leg.hip[0]-.16-(q-.72)*(.32/.72), landingX=leg.hip[0]+.16+(1-q)*(.32/.72);
              const takeoff=finiteGround(takeoffX,leg.hip[2]),landing=finiteGround(landingX,leg.hip[2]);
              let clearance=Math.max(takeoff,landing)+.075;
              for(let j=1;j<8;j++)clearance=Math.max(clearance,finiteGround(takeoffX+(landingX-takeoffX)*j/8,leg.hip[2])+.065);
              const rise=clamp(s/.22,0,1),fall=clamp((s-.78)/.22,0,1),smooth=v=>v*v*(3-2*v);
              const swingY=s<.22?takeoff+(clearance-takeoff)*smooth(rise):s>.78?clearance+(landing-clearance)*smooth(fall):clearance;
              floor=Math.max(floor,swingY);
            }
            foot = [fx, floor + lift * motionBlend, leg.hip[2]];
          }
          return foot;
        });
        // A short-legged platform crouches until every planted leg is within reach.
        // Hip pitch follows the stair rise, so its front and rear mounts remain attached.
        body.updateMatrix(); let permittedDrop = 0;
        legs.forEach((leg, i) => { const h = V(leg.hip).applyMatrix4(body.matrix), f = targets[i], sideways = (f[0]-h.x)**2 + (f[2]-h.z)**2;
          const verticalReach = Math.sqrt(Math.max(.01, .553**2 - sideways));
          permittedDrop = Math.min(permittedDrop, f[1] + .048 + verticalReach - h.y);
        });
        body.position.y += permittedDrop;
        torso.worldY+=permittedDrop;
        legs.forEach((leg,i) => solveLeg(leg,targets[i]));
      }
      if (adhesionLED) { adhesionLED.material.color.set(pose.adhesion === false ? '#ca9b64' : '#67bad8'); adhesionLED.material.emissiveIntensity = pose.adhesion === false ? .08 : .5; }
      if (Number.isFinite(next.cameraPitch)) pod.head.rotation.z = next.cameraPitch;
      if (Number.isFinite(next.cameraYaw)) pod.yaw.rotation.y = next.cameraYaw;
    }
    function aimAt(worldTarget) {
      const target = worldTarget?.isVector3 ? worldTarget.clone() : V(worldTarget);
      group.updateMatrixWorld(true);
      // First rotate the physical fork about its vertical yaw bearing.
      const local = pod.g.worldToLocal(target.clone()), base = pod.yaw.position;
      pod.yaw.rotation.y = Math.atan2(-(local.z-base.z), local.x-base.x);
      group.updateMatrixWorld(true);
      const pitched = pod.yaw.worldToLocal(target.clone()), pivot = pod.head.position;
      pod.head.rotation.z = Math.atan2(pitched.y-pivot.y, pitched.x-pivot.x);
      group.updateMatrixWorld(true);
    }
    setPose({});
    function stats({precise=false}={}) {
      group.updateMatrixWorld(true); const box = new T.Box3().setFromObject(group,precise), size = box.getSize(new T.Vector3());
      return {type, meshCount:parts.length, geometryCount:cache.size, dimensions:{...dimensions}, worldBounds:{min:box.min.toArray(), max:box.max.toArray(), size:size.toArray()},
        cameraPosition:pod.cameraMount.getWorldPosition(new T.Vector3()).toArray(), bodyPosition:body.getWorldPosition(new T.Vector3()).toArray(),bodyPitch:body.rotation.z,wheelAngles:wheels.map(w => w.g.rotation.z),
        feet:legs.map(leg => ({local:leg.lastFoot.slice(),world:group.localToWorld(V(leg.lastFoot)).toArray(),ikError:leg.error})), maxIKError:Math.max(0,...legs.map(l => l.error)),
        unnamed:parts.filter(p => !p.name).length, finite:parts.every(p => p.matrixWorld.elements.every(Number.isFinite)), motionBlend, pose:{...pose}};
    }
    return {group, setPose, aimAt, cameraMount:pod.cameraMount,tetherMount, stats, dimensions:{...dimensions},
      needsSettle() { return !pose.moving && motionBlend > .003; },
      dispose() { for (const g of cache.values()) g.dispose(); for (const m of disposables) m.dispose(); }};
  };
})();
