/* Hero sanding robot. Metres, y-up; the abrasive face is the setPose target.
 * A two-link inverse-kinematic arm keeps every link joined as the head travels.
 * Geometry is illustrative: dimensions and amplified compliance are not machine settings.
 */
(function () {
  'use strict';
  window.createSandingRobot = function (T, supplied = {}) {
    const group = new T.Group(); group.name = 'sanding-robot';
    const parts = [], geometries = new Set(), ownedMaterials = new Set(), textures = new Set();
    const assemblies = {}, mats = {}, Y = new T.Vector3(0, 1, 0), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const palette = {
      blue: [0x2065c4, .32, .31], lightblue: [0x5d9ede, .24, .38], navy: [0x17354e, .36, .42],
      silver: [0xcbd9e3, .78, .27], steel: [0x718898, .73, .32], rubber: [0x263641, .01, .88],
      white: [0xf3f7f5, .16, .34], black: [0x20313b, .05, .63], orange: [0xef9c42, .12, .37],
      red: [0xe9564a, .12, .35], green: [0x3fc5ac, .15, .37], brass: [0xc3a96e, .72, .31]
    };
    for (const [name, [color, metalness, roughness]] of Object.entries(palette)) {
      mats[name] = supplied[name] || new T.MeshStandardMaterial({ color, metalness, roughness });
      if (!supplied[name]) ownedMaterials.add(mats[name]);
    }
    function material(options) { const m = new T.MeshStandardMaterial(options); ownedMaterials.add(m); return m; }
    const screenMat = material({ color: 0x0b354b, emissive: 0x135b70, emissiveIntensity: .35, roughness: .24 });
    const skirtMat = material({ color: 0xe8a64f, metalness: .03, roughness: .3, transparent: true, opacity: .36, side: T.DoubleSide, depthWrite: false });
    const bowlMat = material({ color: 0xc3dbe7, metalness: .08, roughness: .18, transparent: true, opacity: .26, side: T.DoubleSide, depthWrite: false });
    const filterMat = material({ color: 0xe9dfc5, roughness: .94 });
    function sub(name, parent = group) { const g = new T.Group(); g.name = name; parent.add(g); return g; }
    function put(name, geometry, mat, at, parent, assembly) {
      const mesh = new T.Mesh(geometry, typeof mat === 'string' ? mats[mat] : mat); mesh.name = name;
      mesh.position.set(...at); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      geometries.add(geometry); parts.push(mesh); const key = assembly || parent.name;
      assemblies[key] = (assemblies[key] || 0) + 1; mesh.userData.assembly = key; return mesh;
    }
    function box(n, w, h, d, x, y, z, m, p, a) { return put(n, new T.BoxGeometry(w, h, d), m, [x, y, z], p, a); }
    function rounded(n, w, h, d, x, y, z, m, p, radius = .025, a) {
      const r = Math.min(radius, w / 4, h / 4, d / 4), s = new T.Shape(), l = -w / 2, b = -h / 2;
      s.moveTo(l + r, b); s.lineTo(l + w - r, b); s.quadraticCurveTo(l + w, b, l + w, b + r);
      s.lineTo(l + w, b + h - r); s.quadraticCurveTo(l + w, b + h, l + w - r, b + h);
      s.lineTo(l + r, b + h); s.quadraticCurveTo(l, b + h, l, b + h - r);
      s.lineTo(l, b + r); s.quadraticCurveTo(l, b, l + r, b);
      const g = new T.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r, bevelThickness: r, bevelSegments: 6, curveSegments: 8, steps: 1 });
      g.translate(0, 0, -d / 2 + r); return put(n, g, m, [x, y, z], p, a);
    }
    function cyl(n, r, len, x, y, z, m, p, axis = 'y', rTop = r, a) {
      const mesh = put(n, new T.CylinderGeometry(rTop, r, len, 40), m, [x, y, z], p, a);
      if (axis === 'x') mesh.rotation.z = Math.PI / 2;
      if (axis === 'z') mesh.rotation.x = Math.PI / 2; return mesh;
    }
    function torus(n, r, thickness, x, y, z, m, p, axis = 'z', a) {
      const o = put(n, new T.TorusGeometry(r, thickness, 10, 48), m, [x, y, z], p, a);
      if (axis === 'x') o.rotation.y = Math.PI / 2; if (axis === 'y') o.rotation.x = Math.PI / 2; return o;
    }
    function bolt(n, x, y, z, p, axis = 'z', a) { return cyl(n, .012, .008, x, y, z, 'steel', p, axis, .012, a); }
    function pipe(n, points, r, m, p, a, count = 36) {
      const curve = new T.CatmullRomCurve3(points.map(v => Array.isArray(v) ? new T.Vector3(...v) : v.clone()));
      const mesh = put(n, new T.TubeGeometry(curve, count, r, 9, false), m, [0, 0, 0], p, a); return { mesh, curve };
    }

    // Low rounded mobile base, replaceable bumper, wheel bearings and bolted deck.
    const chassis = sub('chassis'), wheels = [];
    rounded('chassis-belly', .83, .13, .86, 0, .235, 1.08, 'navy', chassis, .035);
    rounded('lower-safety-bumper', .9, .075, .94, 0, .27, 1.08, 'rubber', chassis, .025);
    rounded('blue-drive-shell', .86, .24, .9, 0, .385, 1.08, 'blue', chassis, .06);
    rounded('porcelain-top-deck', .83, .045, .88, 0, .525, 1.08, 'white', chassis, .012);
    rounded('front-sensor-recess', .29, .055, .014, 0, .37, .622, 'navy', chassis, .01);
    rounded('front-distance-sensor', .115, .029, .007, 0, .37, .612, screenMat, chassis, .006);
    rounded('rear-service-seam', .54, .1, .007, 0, .38, 1.534, 'navy', chassis, .01);
    for (const x of [-.19, -.095, 0, .095, .19]) rounded('sealed-vent-' + x, .047, .012, .01, x, .38, 1.541, 'steel', chassis, .003);
    for (const x of [-.35, .35]) for (const z of [.75, 1.4]) bolt('deck-fastener-' + x + '-' + z, x, .551, z, chassis, 'y');
    for (const x of [-.448, .448]) for (const z of [.79, 1.37]) {
      const wheel = sub('wheel-' + x + '-' + z, chassis); wheel.position.set(x, .16, z); wheel.rotation.order = 'YXZ'; wheel.rotation.y = Math.PI / 2; wheels.push(wheel);
      cyl('sealed-wheel-axle', .047, .12, 0, 0, 0, 'steel', wheel, 'x');
      cyl('traction-tire', .155, .105, 0, 0, 0, 'rubber', wheel, 'x');
      cyl('wheel-hub', .095, .11, 0, 0, 0, 'silver', wheel, 'x');
      cyl('blue-hub-cap', .059, .117, 0, 0, 0, 'blue', wheel, 'x');
      bolt('wheel-hub-bolt', Math.sign(x) * .063, 0, 0, wheel, 'x');
    }

    // Shoulder turret is a rounded cast housing, rather than a rigid mast.
    const turret = sub('shoulder-turret', chassis);
    cyl('turret-foot-ring', .225, .035, -.09, .568, .98, 'silver', turret);
    cyl('turret-rotary-bearing', .19, .065, -.09, .615, .98, 'navy', turret);
    rounded('shoulder-pedestal', .36, .27, .34, -.09, .77, .98, 'white', turret, .06);
    rounded('shoulder-blue-cheek', .09, .27, .28, -.29, .79, .98, 'blue', turret, .023);
    rounded('shoulder-access-cover', .08, .18, .21, .113, .79, .98, 'silver', turret, .02);
    for (const z of [.89, 1.07]) bolt('pedestal-cover-bolt-' + z, .158, .79, z, turret, 'x');

    const controls = sub('controls', chassis); controls.position.set(-.23, .59, 1.365); controls.rotation.x = -.32;
    rounded('control-console', .3, .15, .065, 0, 0, 0, 'white', controls, .018);
    rounded('control-bezel', .17, .083, .008, -.037, .01, .038, 'navy', controls, .009);
    rounded('control-display', .145, .061, .004, -.037, .01, .044, screenMat, controls, .006);
    cyl('estop-seat', .031, .008, .102, .015, .038, 'orange', controls, 'z');
    cyl('estop-mushroom', .024, .027, .102, .015, .054, 'red', controls, 'z');
    const statusLed = cyl('status-led', .008, .005, -.104, -.051, .036, 'green', controls, 'z');
    cyl('power-key', .012, .006, .101, -.049, .038, 'navy', controls, 'z');
    // One tiny engraved identity is part of the machine; no floating diagram labels.
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 384; labelCanvas.height = 128;
    const labelCtx = labelCanvas.getContext('2d'); labelCtx.fillStyle = '#eef4f7'; labelCtx.fillRect(0, 0, 384, 128);
    labelCtx.fillStyle = '#1c5899'; labelCtx.font = '600 57px sans-serif'; labelCtx.fillText('SAND · 03', 24, 73);
    labelCtx.fillStyle = '#7896ac'; labelCtx.fillRect(25, 93, 255, 5); const labelTexture = new T.CanvasTexture(labelCanvas); labelTexture.colorSpace = T.SRGBColorSpace; textures.add(labelTexture);
    const label = material({ map: labelTexture, roughness: .72 });
    box('engraved-nameplate', .26, .08, .004, -.19, .421, .626, label, chassis);

    // Arm links use their local y axis. A finite IK solution positions both end joints.
    const arm = sub('articulated-arm'), upper = sub('upper-arm', arm), lower = sub('forearm', arm);
    const upperLength = .78, lowerLength = .78;
    function link(parent, length, wide, depth, prefix) {
      rounded(prefix + '-cast-shell', wide, length - .10, depth, 0, length / 2, 0, 'blue', parent, .045);
      rounded(prefix + '-ceramic-inlay', wide * .72, length - .22, .035, 0, length / 2, depth / 2 + .004, 'white', parent, .015);
      rounded(prefix + '-service-seam', wide * .73, .018, .008, 0, length * .7, depth / 2 + .024, 'lightblue', parent, .004);
      for (const y of [length * .22, length * .78]) bolt(prefix + '-inlay-bolt-' + y, 0, y, depth / 2 + .027, parent);
    }
    link(upper, upperLength, .22, .20, 'upper'); link(lower, lowerLength, .17, .16, 'lower');
    const shoulder = sub('shoulder-joint', arm), elbow = sub('elbow-joint', arm), wrist = sub('wrist-joint', arm);
    function joint(g, radius, width, prefix) {
      cyl(prefix + '-bearing-body', radius, width, 0, 0, 0, 'navy', g, 'x');
      cyl(prefix + '-outer-bearing', radius * .82, width + .01, 0, 0, 0, 'silver', g, 'x');
      cyl(prefix + '-cover', radius * .66, width + .018, 0, 0, 0, 'white', g, 'x');
      cyl(prefix + '-axle-cap', radius * .28, width + .025, 0, 0, 0, 'blue', g, 'x');
    }
    joint(shoulder, .135, .27, 'shoulder'); joint(elbow, .116, .235, 'elbow'); joint(wrist, .082, .18, 'wrist');

    // Head local z points out from the wall. Stack: abrasive / interface / pad /
    // extraction shroud / motor / force slide. Every movable layer is supported.
    const head = sub('compliant-sanding-head'), disc = sub('abrasive-disc', head);
    const gritCanvas = document.createElement('canvas'); gritCanvas.width = gritCanvas.height = 128;
    const gritCtx = gritCanvas.getContext('2d'), image = gritCtx.createImageData(128, 128); let seed = 713;
    for (let i = 0; i < image.data.length; i += 4) { seed = (seed * 1664525 + 1013904223) >>> 0; const v = 160 + seed % 76; image.data[i] = v; image.data[i + 1] = v; image.data[i + 2] = v; image.data[i + 3] = 255; }
    gritCtx.putImageData(image, 0, 0); const gritTexture = new T.CanvasTexture(gritCanvas); textures.add(gritTexture);
    const abrasiveMat = material({ color: 0xc4a46e, roughness: .95, bumpMap: gritTexture, bumpScale: .00065 });
    function perforatedCircle(radius) {
      const shape = new T.Shape(); shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
      for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4, hole = new T.Path(); hole.absarc(Math.cos(angle) * .105, Math.sin(angle) * .105, .012, 0, Math.PI * 2, true); shape.holes.push(hole); }
      return shape;
    }
    const abrasiveShape = perforatedCircle(.15);
    const abrasiveGeom = new T.ExtrudeGeometry(abrasiveShape, { depth: .004, bevelEnabled: false, curveSegments: 16 });
    put('perforated-abrasive-sheet', abrasiveGeom, abrasiveMat, [0, 0, 0], disc);
    const interfacePad = put('soft-interface-pad', new T.ExtrudeGeometry(perforatedCircle(.148), { depth: .012, bevelEnabled: false, curveSegments: 16 }), 'rubber', [0,0,.004], head);
    const backingPad = put('vented-backing-pad', new T.ExtrudeGeometry(perforatedCircle(.146), { depth: .019, bevelEnabled: false, curveSegments: 16 }), 'silver', [0,0,.016], head);
    const skirtGeo = new T.CylinderGeometry(.163, .163, .058, 64, 1, true);
    const skirt = put('transparent-dust-skirt', skirtGeo, skirtMat, [0, 0, .033], head); skirt.rotation.x = Math.PI / 2;
    torus('brush-contact-ring', .161, .006, 0, 0, .006, 'rubber', head);
    cyl('shroud-backplate', .162, .022, 0, 0, .073, 'white', head, 'z');
    cyl('sanding-motor', .073, .09, 0, 0, .126, 'blue', head, 'z');
    cyl('motor-rear-cap', .074, .018, 0, 0, .18, 'navy', head, 'z');
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const vent = rounded('radial-shroud-slot-' + i, .009, .035, .005, Math.cos(a) * .121, Math.sin(a) * .121, .087, 'navy', head, .002);
      vent.rotation.z = a - Math.PI / 2;
    }
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; bolt('shroud-screw-' + i, Math.cos(a) * .093, Math.sin(a) * .093, .089, head); }
    const slide = sub('force-slide', head);
    const rearYoke = rounded('compliance-rear-yoke', .20, .045, .036, 0, 0, .44, 'silver', slide, .009);
    rounded('compliance-front-yoke', .20, .04, .026, 0, 0, .205, 'white', slide, .007);
    const guideRods = [], guideBushings = [];
    for (const x of [-.078, .078]) {
      guideRods.push(cyl('force-guide-rod-' + x, .012, .282, x, 0, .331, 'silver', slide, 'z'));
      guideBushings.push(cyl('guide-bushing-' + x, .021, .029, x, 0, .425, 'brass', slide, 'z'));
    }
    const forceCell = cyl('force-sensor-cell', .035, .025, 0, 0, .422, 'steel', slide, 'z');
    const springPoints = [];
    for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 18; springPoints.push([Math.cos(a) * .025, Math.sin(a) * .025, .218 + i / 160 * .1915]); }
    const spring = pipe('compliant-helical-spring', springPoints, .0035, 'silver', slide, 'force-slide', 180).mesh;
    const gimbalForks = [];
    for (const x of [-.105, .105]) gimbalForks.push(rounded('gimbal-fork-' + x, .025, .07, .095, x, 0, .42, 'blue', head, .006));

    // Onboard extractor: clear collection cup reveals the filter, with real lid,
    // catch, hose union and pleats rather than a labelled box.
    const extractor = sub('dust-extractor', chassis); extractor.position.set(.235, 0, 1.245);
    cyl('extractor-mount', .157, .026, 0, .565, 0, 'navy', extractor);
    const cup = cyl('collection-cup', .145, .35, 0, .754, 0, bowlMat, extractor);
    cyl('cup-base-seal', .147, .024, 0, .591, 0, 'steel', extractor);
    cyl('extractor-upper-seal', .147, .022, 0, .93, 0, 'rubber', extractor);
    cyl('extractor-motor-lid', .153, .074, 0, .977, 0, 'blue', extractor);
    cyl('lid-top-inset', .119, .015, 0, 1.021, 0, 'white', extractor);
    const filter = sub('pleated-filter', extractor);
    cyl('filter-core', .073, .234, 0, .78, 0, filterMat, filter);
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; const pleat = box('filter-pleat-' + i, .014, .23, .035, Math.cos(a) * .074, .78, Math.sin(a) * .074, filterMat, filter); pleat.rotation.y = -a; }
    cyl('filter-top-gasket', .091, .019, 0, .906, 0, 'orange', filter);
    cyl('filter-bottom-cap', .091, .019, 0, .654, 0, 'white', filter);
    const bagMat = material({ color: 0xa4a596, roughness: 1, side: T.DoubleSide });
    const bag = put('sealed-collection-bag', new T.LatheGeometry([[.093,0],[.115,.007],[.125,.025],[.124,.105],[.112,.145],[.109,.16]].map(p => new T.Vector2(...p)), 40), bagMat, [0,.612,0], extractor);
    for (const x of [-.153, .153]) rounded('lid-latch-' + x, .024, .075, .042, x, .929, 0, 'silver', extractor, .006);
    pipe('extractor-carry-handle', [[-.065,1.028,0],[-.065,1.095,0],[.065,1.095,0],[.065,1.028,0]], .012, 'navy', extractor, 'dust-extractor', 18);
    cyl('extraction-inlet', .035, .065, .17, .91, 0, 'silver', extractor, 'x');
    cyl('hose-locking-collar', .041, .025, .203, .91, 0, 'navy', extractor, 'x');
    cyl('head-extraction-elbow', .029, .053, .182, .026, .08, 'white', head, 'x');
    cyl('head-hose-union', .033, .024, .22, .026, .08, 'navy', head, 'x');

    const hoseCanvas = document.createElement('canvas'); hoseCanvas.width = 128; hoseCanvas.height = 4;
    const hoseCtx = hoseCanvas.getContext('2d'), hoseImage = hoseCtx.createImageData(128, 4);
    for (let i = 0; i < hoseImage.data.length; i += 4) { const v = Math.round(128 + 100 * Math.cos(((i / 4) % 128) / 128 * Math.PI * 2)); hoseImage.data[i] = hoseImage.data[i + 1] = hoseImage.data[i + 2] = v; hoseImage.data[i + 3] = 255; }
    hoseCtx.putImageData(hoseImage, 0, 0); const hoseTexture = new T.CanvasTexture(hoseCanvas); hoseTexture.wrapS = T.RepeatWrapping; hoseTexture.repeat.set(88, 1); textures.add(hoseTexture);
    const hoseMat = material({ color: 0x293941, roughness: .82, bumpMap: hoseTexture, bumpScale: .003 });
    let hose = null, hoseCurve = null, hoseStamp = '', previousBaseX = 0, currentPose = {}, hoseAudit = {}, hoseEnds = null, hoseRebuilds = 0;
    const shoulderPoint = new T.Vector3(), elbowPoint = new T.Vector3(), wristPoint = new T.Vector3();
    function placeLink(linkObject, from, to, axis) {
      const along = to.clone().sub(from).normalize(), normal = axis.clone().cross(along).normalize();
      linkObject.position.copy(from); linkObject.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(axis, along, normal));
    }
    function setPose(p = {}) {
      const x = Number.isFinite(p.x) ? p.x : 0, y = clamp(Number.isFinite(p.y) ? p.y : 1.55, .65, 2.18), z = clamp(Number.isFinite(p.z) ? p.z : .035, .005, .75);
      const service = clamp(p.service || 0, 0, 1), baseX = x * .82, cutaway = clamp(p.cutaway || 0, 0, 1);
      const retreat = clamp(Number.isFinite(p.retreat) ? p.retreat : 0, -4, 4);
      const bump = Number.isFinite(p.bump) ? p.bump : 0, gap = Number.isFinite(p.gap) ? p.gap : 0;
      // Head follows the wall while the actuator follows retreat. Subtracting
      // wall offset and contact gap keeps a fixed actuator genuinely fixed.
      const slideStroke = clamp((retreat - bump - gap) * .008, -.08, .032);
      const dust = { connected: true, filterClean: true, bagReady: true, seal: true, power: true, ...(p.dust || {}) };
      bowlMat.opacity = .83 - .61 * cutaway; cup.material.color.setHex(cutaway > .05 ? 0xc3dbe7 : 0xe9f0f1);
      hoseMat.transparent=true;hoseMat.opacity=1-.7*cutaway;hoseMat.depthWrite=cutaway<.05;
      filterMat.color.setHex(dust.filterClean ? 0xe9dfc5 : 0x7e8178);
      bag.scale.set(dust.bagReady ? 1 : 1.055, dust.bagReady ? .64 : 1.47, dust.bagReady ? 1 : 1.055);
      bagMat.color.setHex(dust.bagReady ? 0xb4b3a5 : 0x8d8e83);
      statusLed.material = p.isolated || !dust.power ? mats.navy : mats.green;
      chassis.position.x = baseX; const travel = baseX - previousBaseX; previousBaseX = baseX;
      for (const wheel of wheels) wheel.rotation.x -= travel / .155;
      shoulderPoint.set(baseX - .09, .94, .98); wristPoint.set(x, y, z + .44 + slideStroke);
      const delta = wristPoint.clone().sub(shoulderPoint), d = clamp(delta.length(), .08, upperLength + lowerLength - .001), u = delta.normalize();
      // A back-and-up elbow preference avoids a sideways flip when the service
      // pose puts the wrist almost directly above the shoulder.
      const preferredBend = new T.Vector3(0, .75, 1);
      const bend = preferredBend.addScaledVector(u, -preferredBend.dot(u)).normalize();
      const a = (upperLength * upperLength - lowerLength * lowerLength + d * d) / (2 * d), h = Math.sqrt(Math.max(0, upperLength * upperLength - a * a));
      elbowPoint.copy(shoulderPoint).addScaledVector(u, a).addScaledVector(bend, h);
      const axis = new T.Vector3().crossVectors(u, bend).normalize();
      placeLink(upper, shoulderPoint, elbowPoint, axis); placeLink(lower, elbowPoint, wristPoint, axis);
      shoulder.position.copy(shoulderPoint); elbow.position.copy(elbowPoint); wrist.position.copy(wristPoint);
      // Joint shafts are normal to the plane of the two actual links.
      for (const j of [shoulder, elbow, wrist]) j.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), axis);
      head.position.set(x, y, z); disc.rotation.z = p.spin || 0; disc.position.z = -.15 * service; interfacePad.position.z = .004 - .065 * service;
      interfacePad.rotation.z = backingPad.rotation.z = p.spin || 0;
      const force = clamp(Number.isFinite(p.force) ? p.force : 20, 0, 60);
      rearYoke.position.z = .44 + slideStroke; forceCell.position.z = .422 + slideStroke;
      // Each guide remains one continuous fixed-length rod; its rear end slides
      // into the moving bushing and wrist housing instead of stretching a rod.
      for (const bushing of guideBushings) bushing.position.z = .425 + slideStroke;
      for (const fork of gimbalForks) fork.position.z = .42 + slideStroke;
      spring.scale.z = 1 + slideStroke / .1915; spring.position.z = .218 * (1 - spring.scale.z);
      // Rebuild only after 2 mm of travel. Between rebuilds the two terminal rings
      // follow their real unions exactly, so an optimization cannot open a gap.
      const stamp = [x, y, z, baseX, slideStroke].map(v => Math.round(v / .002)).join(':') + ':' + dust.connected;
      const extractorPort = new T.Vector3(baseX + .4505, .91, 1.245);
      const end = extractorPort.clone().add(new T.Vector3(dust.connected ? 0 : .15, 0, 0));
      const headPort = new T.Vector3(x + .232, y + .026, z + .08);
      if (stamp !== hoseStamp) {
        hoseStamp = stamp;
        const pts = [headPort, headPort.clone().add(new T.Vector3(.12, .02, .025)),
          new T.Vector3(Math.max(x + .3, elbowPoint.x + .28), y + .08, Math.max(z + .30, .48)),
          new T.Vector3(elbowPoint.x + .29, elbowPoint.y + .04, elbowPoint.z + .07),
          new T.Vector3(baseX + .53, Math.max(1.10, elbowPoint.y - .20), 1.23),
          new T.Vector3(Math.max(baseX + .61, end.x + .18), 1.05, 1.30), end.clone().add(new T.Vector3(.10, 0, 0)), end];
        const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
        if (!hose) { hose = put('continuous-flexible-extraction-hose', new T.TubeGeometry(curve, 72, .025, 10, false), hoseMat, [0,0,0], group, 'extraction-hose'); }
        else { geometries.delete(hose.geometry); hose.geometry.dispose(); hose.geometry = new T.TubeGeometry(curve, 72, .025, 10, false); geometries.add(hose.geometry); }
        hoseCurve = curve;
        hoseEnds = { start: headPort.clone(), end: end.clone() }; hoseRebuilds++;
      } else if (hoseEnds) {
        const attr = hose.geometry.attributes.position, ds = headPort.clone().sub(hoseEnds.start), de = end.clone().sub(hoseEnds.end);
        for (const [ring, delta, weight] of [[0,ds,1],[1,ds,.5],[71,de,.5],[72,de,1]]) {
          for (let j = 0; j <= 10; j++) { const i = ring * 11 + j; attr.setXYZ(i, attr.getX(i) + delta.x * weight, attr.getY(i) + delta.y * weight, attr.getZ(i) + delta.z * weight); }
        }
        attr.needsUpdate = true; hose.geometry.computeBoundingSphere(); hoseEnds.start.copy(headPort); hoseEnds.end.copy(end);
        hoseCurve.points[0].copy(headPort); hoseCurve.points[7].copy(end);
      }
      hoseAudit = { start: hoseCurve.getPoint(0).toArray(), end: hoseCurve.getPoint(1).toArray(), toolPort: headPort.toArray(), extractorPort: extractorPort.toArray(), connected: dust.connected, intendedServiceGap: dust.connected ? 0 : .15 };
      currentPose = { x, y, z, service, force, retreat, bump, gap, slideStroke, shoulder: shoulderPoint.toArray(), elbow: elbowPoint.toArray(), wrist: wristPoint.toArray(), upperLength: shoulderPoint.distanceTo(elbowPoint), lowerLength: elbowPoint.distanceTo(wristPoint) };
      group.updateMatrixWorld(true);
    }
    setPose();
    return {
      group, head, disc, shoulder, elbow, wrist, extractor, filter, parts,
      setPose,
      getHoseCurve: () => hoseCurve,
      getAnchors: () => ({ head: head.position.clone(), inlet: new T.Vector3(chassis.position.x + .4505, .91, 1.245), shoulder: shoulderPoint.clone(), elbow: elbowPoint.clone(), wrist: wristPoint.clone() }),
      getStats: () => ({ meshes: parts.length, assemblies: { ...assemblies }, pose: { ...currentPose }, hose: { ...hoseAudit, rebuilds: hoseRebuilds }, jointErrors: { upper: Math.abs(currentPose.upperLength - upperLength), lower: Math.abs(currentPose.lowerLength - lowerLength) }, dynamicHoseVertices: hose.geometry.attributes.position.count }),
      dispose() { for (const g of geometries) g.dispose(); for (const m of ownedMaterials) m.dispose(); for (const t of textures) t.dispose(); group.removeFromParent(); }
    };
  };
})();
