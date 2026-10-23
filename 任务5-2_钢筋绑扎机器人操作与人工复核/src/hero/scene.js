/*
 * Anatomy HERO / one articulated industrial tying arm, built as real Three.js solids.
 * Concept: guide one tool onto a steel crossing, watch its wire close around BOTH bars,
 * then inspect the actual knot. No floating principle boxes or exploded whole robot.
 * World: y up, metres; x/z bars at -.5, 0, +.5; lower/upper centres .680/.716,
 * radius .018 (tangent contact). Arm shoulder (-1.3,.95,-.6), links 1.25 + 1.20.
 * Parts list, grouped before geometry: base plate, levelling feet, anchors, rotary
 * bearing, seal, pedestal, motor, access cover, cover screws, four shoulder flange
 * layers; upper-arm shell, seam, inlay, elbow bearing, cover, ring fasteners,
 * forearm shell, service strip, cable clips, elbow caps, wrist bearing/flange;
 * tying head backplate, shell, hinged cover, hinge knuckles, spool axle, two spool
 * cheeks, wound wire, retaining nut, drive/pinch rollers, roller axles, feed guide,
 * cutter slide, cutter spring, jaw mounting block, two curved guide jaws and inner
 * channels, jaw pivots, return springs, twister spindle, collar, two gripping tips,
 * wire conduit, hose connectors, rubber strain reliefs, controller cable, ID plate.
 * Robot/tool fasteners and manufactured subassemblies are counted separately from
 * floor, rebar ribs, fixture and target markers. Mesh depth is native WebGL depth;
 * this is NOT an Anatomy kit SVG audit. IK diagnostic measures real joint positions.
 */
(function (global) {
  'use strict';
  const WORLD = Object.freeze({ baseX: -1.3, baseZ: -.6, shoulderY: .95, upper: 1.25, fore: 1.2, toolOffset: .38, tipY: .72, hoverY: 1.08 });
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  function phaseAt(value,jammed) {
    if(typeof HG!=='undefined'&&HG.cycleAt)return HG.cycleAt(value,jammed);
    const p=jammed?Math.min(value,.51):value;
    return{p,approach:smooth(0,.2,p),grip:smooth(.2,.4,p)*(1-smooth(.8,1,p)),feed:clamp((p-.4)/.2,0,1),cut:smooth(.6,.635,p),tight:smooth(.635,.705,p),twist:smooth(.705,.8,p),leave:smooth(.8,1,p),jammed:jammed&&p>=.51};
  }
  function solveArm(x, y, z) {
    const dx = x - WORLD.baseX, dz = z - WORLD.baseZ, r = Math.hypot(dx, dz), h = y - WORLD.shoulderY;
    const distance = Math.hypot(r, h), d = clamp(distance, .051, WORLD.upper + WORLD.fore - .001);
    const yaw = Math.atan2(dz, dx), a = Math.atan2(h, r) + Math.acos(clamp((WORLD.upper ** 2 + d ** 2 - WORLD.fore ** 2) / (2 * WORLD.upper * d), -1, 1));
    const b = -Math.acos(clamp((d * d - WORLD.upper ** 2 - WORLD.fore ** 2) / (2 * WORLD.upper * WORLD.fore), -1, 1));
    const endR = WORLD.upper * Math.cos(a) + WORLD.fore * Math.cos(a + b);
    const endY = WORLD.shoulderY + WORLD.upper * Math.sin(a) + WORLD.fore * Math.sin(a + b);
    const endpoint = { x: WORLD.baseX + endR * Math.cos(yaw), y: endY, z: WORLD.baseZ + endR * Math.sin(yaw) };
    return { yaw, shoulder: a, elbow: b, wrist: -a - b, endpoint, error: Math.hypot(endpoint.x - x, endpoint.y - y, endpoint.z - z), reachable: distance <= WORLD.upper + WORLD.fore - .001 };
  }
  function unavailable(reason) {
    return { available: false, reason: String(reason || 'WebGL unavailable'), update() {}, render() {}, resize() {}, setCamera() {}, setTheme() {}, setCutaway() {}, dispose() {}, projectPoint() { return null; }, getState() { return {}; }, getDiagnostics() { return { available: false, settled: true, aimError: 0, partCount: 0 }; } };
  }
  function create(host, callbacks = {}) {
    let renderer;
    try {
      if (!global.THREE || new URLSearchParams(global.location.search).has('no-webgl')) return unavailable('WebGL disabled');
      renderer = new global.THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (error) { return unavailable(error.message); }
    const T = global.THREE, scene = new T.Scene(), camera = new T.PerspectiveCamera(37, 1, .025, 45);
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.17;
    const canvas = renderer.domElement;
    canvas.className = 'tying-hero-canvas'; canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline-offset:-4px;';
    canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '钢筋绑扎机械臂三维实训场，可拖动旋转、滚轮或双指缩放；点击交点进行定位。');
    host.appendChild(canvas);
    const robotParts = [], fixtureParts = [], geometryCache = new Map(), disposable = new Set(), materials = {};
    function material(name, color, metalness = 0, roughness = .6) { const m = new T.MeshStandardMaterial({ color, metalness, roughness }); materials[name] = m; disposable.add(m); return m; }
    material('ivory', 0xf1eee4, .14, .33); material('ivoryEdge', 0xd4d3c9, .23, .4);
    material('graphite', 0x303732, .28, .45); material('rubber', 0x202522, .02, .82);
    material('silver', 0xc4c5c1, .58, .31); material('steel', 0x7c807e, .48, .45);
    material('orange', 0xdf7841, .2, .36); material('teal', 0x267e70, .15, .4);
    material('wire', 0xb7aaa0, .76, .3); material('brass', 0xad935c, .6, .35);
    material('floor', 0xe9e4d9, 0, .94); material('seam', 0xd7d2c8, 0, .96);
    material('concrete', 0xc7c5ba, .04, .92); material('wood', 0xc1a37a, 0, .85);
    material('mark', 0x668c73, .15, .62); material('warning', 0xd18a35, .1, .55);
    material('red', 0xc55b42, .1, .47); material('white', 0xfaf8ef, 0, .8);
    const hemi = new T.HemisphereLight(0xfffbf5, 0xaba8a0, 2.3); scene.add(hemi);
    const key = new T.DirectionalLight(0xfff3dc, 3.0); key.position.set(-3, 7, 4.2); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3, near: .5, far: 14 });
    key.shadow.bias = -.0002; key.shadow.normalBias = .014; key.shadow.radius = 5; scene.add(key);
    const fill = new T.DirectionalLight(0xf3f6ef, 1.5); fill.position.set(4, 2.6, -3); scene.add(fill);
    const back = new T.DirectionalLight(0xfff8e5, .8); back.position.set(-2, 4, -5); scene.add(back);
    const floorGroup = new T.Group(), robot = new T.Group(), workpiece = new T.Group(), annotations = new T.Group();
    floorGroup.name = 'workshop-floor'; robot.name = 'articulated-tying-robot'; workpiece.name = 'rebar-fixture'; annotations.name = 'workpoint-markers';
    scene.add(floorGroup, robot, workpiece, annotations);
    let inventory = fixtureParts;
    function put(name, geometry, mat, pos, parent = robot, count = true) {
      const mesh = new T.Mesh(geometry, typeof mat === 'string' ? materials[mat] : mat); mesh.name = name; mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
      if (count) inventory.push(mesh); disposable.add(geometry); return mesh;
    }
    function box(name, w, h, d, x, y, z, mat, parent = robot) {
      const id = ['box', w, h, d].join(':'); if (!geometryCache.has(id)) geometryCache.set(id, new T.BoxGeometry(w, h, d));
      return put(name, geometryCache.get(id), mat, [x, y, z], parent);
    }
    function rounded(name, w, h, d, x, y, z, mat, parent = robot, radius = .025) {
      const r = Math.min(radius, w / 4, h / 4, d / 4), id = ['round', w, h, d, r].join(':');
      if (!geometryCache.has(id)) {
        // Extrusion bevel expands the 2D outline: inset it so nominal dimensions
        // remain the real outer bounds, including thin plates carrying textures.
        const s = new T.Shape(),iw=w-2*r,ih=h-2*r,l=-iw/2,b=-ih/2;
        s.moveTo(l+r,b);s.lineTo(l+iw-r,b);s.quadraticCurveTo(l+iw,b,l+iw,b+r);s.lineTo(l+iw,b+ih-r);s.quadraticCurveTo(l+iw,b+ih,l+iw-r,b+ih);s.lineTo(l+r,b+ih);s.quadraticCurveTo(l,b+ih,l,b+ih-r);s.lineTo(l,b+r);s.quadraticCurveTo(l,b,l+r,b);
        const geo = new T.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 5 });
        geo.translate(0, 0, -d / 2 + r); geometryCache.set(id, geo);
      }
      return put(name, geometryCache.get(id), mat, [x, y, z], parent);
    }
    function cylinder(name, r, length, x, y, z, mat, parent = robot, axis = 'y', rTop = r, sides = 32) {
      const id = ['cyl', r, length, rTop, sides].join(':'); if (!geometryCache.has(id)) geometryCache.set(id, new T.CylinderGeometry(rTop, r, length, sides));
      const mesh = put(name, geometryCache.get(id), mat, [x, y, z], parent);
      if (axis === 'x') mesh.rotation.z = Math.PI / 2; if (axis === 'z') mesh.rotation.x = Math.PI / 2; return mesh;
    }
    function torus(name, r, tubeRadius, x, y, z, mat, parent = robot, axis = 'z', arc = Math.PI * 2) {
      const id=['torus',r,tubeRadius,arc].join(':');if(!geometryCache.has(id))geometryCache.set(id,new T.TorusGeometry(r,tubeRadius,8,48,arc));
      const mesh = put(name, geometryCache.get(id), mat, [x, y, z], parent);
      if (axis === 'y') mesh.rotation.x = Math.PI / 2; if (axis === 'x') mesh.rotation.y = Math.PI / 2; return mesh;
    }
    function tube(name, points, radius, mat, parent = robot, segments = 32) {
      const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, 'centripetal');
      return put(name, new T.TubeGeometry(curve, segments, radius, 8, false), mat, [0, 0, 0], parent);
    }
    function bolt(name, x, y, z, parent = robot, axis = 'z', r = .012) { return cylinder(name, r, .009, x, y, z, 'silver', parent, axis, r, 6); }
    function coil(name, origin, radius, length, turns, axis, parent = robot) {
      const p = []; for (let i = 0; i <= turns * 16; i++) { const t = i / (turns * 16), a = t * turns * Math.PI * 2; const q = axis === 'y' ? [radius * Math.cos(a), t * length, radius * Math.sin(a)] : [radius * Math.cos(a), radius * Math.sin(a), t * length]; p.push(q.map((v, k) => v + origin[k])); }
      return tube(name, p, .003, 'silver', parent, turns * 16);
    }
    // The warm open workshop has no wall to obstruct orbit or close inspection.
    rounded('concrete-plinth', 4.75, .08, 3.75, -.35, -.065, -.1, 'concrete', floorGroup, .025);
    box('warm-finished-floor', 4.7, .018, 3.7, -.35, -.016, -.1, 'floor', floorGroup);
    for (let x = -2.3; x <= 1.9; x += .7) box('floor-expansion-x', .004, .001, 3.69, x, -.006, -.1, 'seam', floorGroup);
    for (let z = -1.6; z <= 1.5; z += .7) box('floor-expansion-z', 4.69, .001, .004, -.35, -.005, z, 'seam', floorGroup);
    // Rebar holding fixture: raw alloy beams, open space beneath the intersections.
    for (const x of [-.79, .79]) for (const z of [-.79, .79]) {
      rounded('fixture-levelling-pad', .13, .025, .13, x, .013, z, 'rubber', workpiece, .01);
      cylinder('fixture-adjusting-foot', .021, .065, x, .058, z, 'silver', workpiece);
      box('fixture-square-leg', .052, .48, .052, x, .33, z, 'steel', workpiece);
      box('fixture-corner-gusset', .1, .085, .06, x, .56, z, 'silver', workpiece);
      bolt('fixture-gusset-bolt', x, .557, z + .035, workpiece);
    }
    for (const z of [-.79, .79]) box('fixture-long-rail', 1.64, .075, .062, 0, .603, z, 'silver', workpiece);
    for (const x of [-.79, .79]) box('fixture-cross-rail', .062, .075, 1.53, x, .603, 0, 'silver', workpiece);
    for (const z of [-.79, .79]) box('fixture-lower-brace', 1.58, .036, .036, 0, .22, z, 'steel', workpiece);
    for (const x of [-.79, .79]) box('fixture-lower-side-brace', .036, .036, 1.58, x, .22, 0, 'steel', workpiece);
    // Ribbed reinforcing bars are neutral steel, never blue. Ribs belong to the bars.
    for (const v of [-.5, 0, .5]) {
      cylinder('lower-rebar-x', .018, 1.68, 0, .68, v, 'steel', workpiece, 'x');
      cylinder('upper-rebar-z', .018, 1.68, v, .716, 0, 'steel', workpiece, 'z');
      for (let d = -.8; d <= .8; d += .045) {
        const ribX = torus('lower-bar-rib', .0183, .0016, d, .68, v, 'silver', workpiece, 'x'); ribX.rotation.y += .24;
        const ribZ = torus('upper-bar-rib', .0183, .0016, v, .716, d, 'silver', workpiece); ribZ.rotation.y += .24;
      }
      for (const end of [-.79, .79]) {
        box('rebar-lower-saddle', .028, .018, .07, end, .651, v, 'graphite', workpiece);
        box('rebar-upper-saddle', .07, .054, .028, v, .669, end, 'graphite', workpiece);
      }
    }
    // A narrow timber spacer and modest task tools ground the worksite in practice.
    rounded('timber-spacer', .54, .035, .13, 1.11, .016, -.47, 'wood', floorGroup, .006);
    rounded('inspection-tool-tray', .3, .035, .22, 1.14, .018, -.1, 'ivoryEdge', floorGroup, .018);
    tube('inspection-hook', [[1.03,.042,-.1],[1.16,.042,-.1],[1.21,.042,-.12],[1.21,.042,-.16],[1.18,.042,-.17]], .008, 'steel', floorGroup, 18);
    rounded('hook-grip', .12, .022, .026, 1.03, .046, -.1, 'orange', floorGroup, .008);
    inventory = robotParts;
    // Grounded robot pedestal and rotating shoulder assembly.
    const base = new T.Group(); base.position.set(WORLD.baseX, 0, WORLD.baseZ); robot.add(base);
    rounded('robot-anchor-plate', .55, .06, .5, 0, .055, 0, 'graphite', base, .035);
    for (const x of [-.2, .2]) for (const z of [-.175, .175]) {
      cylinder('foundation-washer', .026, .007, x, .088, z, 'steel', base);
      bolt('foundation-anchor', x, .096, z, base, 'y', .016);
    }
    cylinder('pedestal-lower-shell', .196, .46, 0, .316, 0, 'ivory', base, 'y', .162);
    cylinder('pedestal-seat', .201, .027, 0, .099, 0, 'ivoryEdge', base);
    cylinder('azimuth-bearing', .166, .055, 0, .573, 0, 'graphite', base);
    torus('azimuth-bearing-seal', .166, .006, 0, .596, 0, 'rubber', base, 'y');
    const yaw = new T.Group(); yaw.position.set(0, .95, 0); base.add(yaw);
    rounded('shoulder-neck', .23, .36, .21, 0, -.168, 0, 'ivory', yaw, .038);
    rounded('pedestal-service-cover', .13, .17, .012, 0, .315, .174, 'graphite', base, .018);
    for (const x of [-.047, .047]) for (const y of [.253, .377]) bolt('pedestal-cover-fastener', x, y, .184, base, 'z', .007);
    const upper = new T.Group(), fore = new T.Group(), wrist = new T.Group(); yaw.add(upper); upper.add(fore); fore.position.x = WORLD.upper; fore.add(wrist); wrist.position.x = WORLD.fore;
    function joint(name, parent, r, depth, shell = 'ivory') {
      cylinder(name + '-bearing', r, depth, 0, 0, 0, 'graphite', parent, 'z');
      for (const sign of [-1, 1]) {
        cylinder(name + '-flange', r * .91, .023, 0, 0, sign * (depth / 2 + .0115), 'silver', parent, 'z');
        cylinder(name + '-cap', r * .79, .035, 0, 0, sign * (depth / 2 + .0405), shell, parent, 'z');
      }
      torus(name + '-seal', r * .82, .005, 0, 0, depth / 2 + .026, 'rubber', parent);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; bolt(name + '-cap-fastener', Math.cos(a) * r * .60, Math.sin(a) * r * .60, depth / 2 + .061, parent, 'z', .008); }
    }
    joint('shoulder', yaw, .195, .30);
    function linkShell(name, parent, length, width, depth) {
      rounded(name + '-main-shell', length - .19, width, depth, length / 2, 0, 0, 'ivory', parent, .055);
      rounded(name + '-rear-seam', length - .29, width * .72, .012, length / 2, 0, -depth / 2 - .006, 'ivoryEdge', parent, .025);
      rounded(name + '-front-service-strip', length * .52, width * .40, .009, length * .53, 0, depth / 2 + .006, 'ivoryEdge', parent, .022);
      rounded(name + '-identification-inlay', .19, .047, .005, length * .56, 0, depth / 2 + .012, 'teal', parent, .008);
      for (const x of [length * .32, length * .75]) bolt(name + '-cover-fastener', x, 0, depth / 2 + .014, parent, 'z', .008);
      // The cable follows the service side with its ends seated in real collars.
      tube(name + '-service-harness', [[.16, -.04, -depth / 2 - .025],[.24,-.08,-depth/2-.05],[length-.24,-.08,-depth/2-.05],[length-.13,-.025,-depth/2-.035]], .012, 'rubber', parent, 24);
      for (const x of [.24, length - .24]) rounded(name + '-harness-clip', .038, .035, .06, x, -.08, -depth / 2 - .02, 'graphite', parent, .006);
      cylinder(name+'-harness-entry',.018,.04,.16,-.04,-depth/2-.018,'graphite',parent,'z');
      cylinder(name+'-harness-exit',.018,.04,length-.13,-.025,-depth/2-.018,'graphite',parent,'z');
    }
    linkShell('upper-arm', upper, WORLD.upper, .23, .22);
    joint('elbow', fore, .158, .255, 'orange');
    linkShell('forearm', fore, WORLD.fore, .17, .17);
    joint('wrist-pitch', wrist, .077, .155);
    cylinder('wrist-down-adapter', .057, .035, 0, -.047, 0, 'graphite', wrist);
    cylinder('tool-mount-flange', .073, .018, 0, -.0735, 0, 'silver', wrist);
    // Head is vertical at every articulated pose. This group is counter-rotated in yaw.
    const head = new T.Group(); head.position.y = -WORLD.toolOffset; wrist.add(head);
    rounded('head-backbone', .135, .225, .08, 0, .24, -.045, 'graphite', head, .018);
    rounded('head-upper-shell', .15, .033, .12, 0, .274, 0, 'ivory', head, .012);
    rounded('head-orange-crown', .152, .013, .122, 0, .291, 0, 'orange', head, .005);
    rounded('head-left-cheek', .022, .18, .105, -.073, .208, 0, 'ivory', head, .009);
    rounded('head-drive-mount', .09, .105, .025, .006, .171, -.037, 'silver', head, .007);
    const coverHinge = new T.Group(); coverHinge.position.set(-.083, .20, .065); head.add(coverHinge);
    rounded('hinged-service-cover', .175, .18, .022, .0875, 0, .002, 'ivory', coverHinge, .016);
    rounded('service-cover-inlay', .13, .035, .003, .091, .029, .015, 'teal', coverHinge, .006);
    for (const y of [-.063, .063]) { cylinder('service-cover-hinge', .009, .027, 0, y, 0, 'silver', coverHinge); bolt('service-cover-screw', .151, y, .017, coverHinge, 'z', .006); }
    const spool = new T.Group(); spool.position.set(.004, .218, .027); head.add(spool);
    cylinder('wire-reel-axle', .011, .088, 0, 0, 0, 'silver', spool, 'z');
    cylinder('wound-wire-reel', .043, .037, 0, 0, 0, 'wire', spool, 'z');
    cylinder('reel-back-cheek', .053, .008, 0, 0, -.025, 'graphite', spool, 'z');
    torus('reel-front-rim', .050, .004, 0, 0, .025, 'graphite', spool);
    for(let i=0;i<3;i++){const spoke=rounded('reel-front-spoke',.09,.007,.007,0,0,.025,'graphite',spool,.002);spoke.rotation.z=i*Math.PI/3;}
    for(const r of [.018,.024,.030,.036,.042])torus('wire-face-winding',r,.0012,0,0,.020,'silver',spool);
    cylinder('reel-retaining-nut', .016, .012, 0, 0, .035, 'brass', spool, 'z', .016, 6);
    // Wound wire is one continuous coil; it is not a stack of disconnected rings.
    const wind = []; for (let i = 0; i <= 240; i++) { const t = i / 240, a = t * 24 * Math.PI; wind.push([Math.cos(a) * .044, Math.sin(a) * .044, -.019 + t * .038]); }
    tube('reel-wire-winding', wind, .0018, 'silver', spool, 240);
    const feedWheels = [];
    for (const x of [-.021, .021]) {
      const wheel = new T.Group();wheel.position.set(x,.164,.013);head.add(wheel);feedWheels.push(wheel);
      cylinder('feed-roller', .020, .026, 0,0,0, 'steel', wheel, 'z');
      torus('feed-roller-face-groove',.0135,.002,0,0,.014,'graphite',wheel);
      cylinder('feed-roller-drive-pin',.0028,.003,.010,0,.016,'brass',wheel,'z');
      cylinder('feed-roller-axle', .006, .032, x, .164, .016, 'brass', head, 'z');
    }
    tube('wire-feed-path', [[.045,.218,.027],[.054,.192,.027],[.003,.185,.018],[0,.156,.018],[0,.112,.018]], .002, 'wire', head, 32);
    rounded('wire-entry-guide', .016, .026, .024, 0, .198, .018, 'brass', head, .004);
    rounded('wire-exit-guide', .019, .025, .025, 0, .121, .018, 'brass', head, .004);
    const cutter=rounded('cutter-slider', .045, .014, .025, .022, .101, .015, 'steel', head, .003);
    coil('cutter-return-spring', [.041,.112,-.005], .007, .04, 5, 'y', head);
    rounded('jaw-top-crosshead', .14, .042, .065, 0, .099, 0, 'graphite', head, .009);
    cylinder('twister-shaft', .014, .059, 0, .076, 0, 'silver', head);
    cylinder('twister-collet', .023, .025, 0, .044, 0, 'graphite', head);
    const twist = new T.Group(); twist.position.y = .028; head.add(twist);
    for (const x of [-.011, .011]) rounded('twister-grip', .01, .027, .013, x, 0, 0, 'steel', twist, .003);
    const jaws = [];
    for (const sign of [-1, 1]) {
      const jaw = new T.Group(); jaw.position.set(sign * .058, .085, 0); head.add(jaw); jaws.push(jaw);
      const path = [[0,0,0],[sign*.021,-.040,0],[sign*.028,-.107,0],[sign*.006,-.159,0],[-sign*.036,-.175,0]];
      tube('curved-guide-jaw', path, .014, 'silver', jaw, 28);
      tube('jaw-inner-wire-channel', path.map(p=>[p[0]-sign*.006,p[1],p[2]+.011]), .0038, 'graphite', jaw, 28);
      cylinder('jaw-pivot', .017, .040, 0, 0, 0, 'steel', jaw, 'z');
      bolt('jaw-pivot-bolt', 0, 0, .025, jaw, 'z', .008);
      coil('jaw-return-spring', [sign*.014,-.012,-.023], .008, .039, 5, 'y', jaw);
    }
    for (const x of [-.051, .051]) for (const y of [.116, .3]) bolt('head-chassis-fastener', x, y, -.09, head, 'z', .006);
    cylinder('head-cable-gland', .014, .024, -.037, .296, -.045, 'graphite', head);
    tube('head-strain-relief-cable', [[-.037,.308,-.045],[-.04,.39,-.06],[-.07,.401,-.07],[-.09,.37,-.09]], .008, 'rubber', head, 20);
    // The drawn electrical lead has its other end on the wrist connector.
    cylinder('wrist-cable-socket', .016, .023, -.09, .37, -.09, 'steel', head);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 256; labelCanvas.height = 64;
    const labelContext = labelCanvas.getContext('2d'); labelContext.fillStyle='#e9e6dc';labelContext.fillRect(0,0,256,64);labelContext.fillStyle='#4d5950';labelContext.font='600 30px sans-serif';labelContext.fillText('RB / 05',20,43);
    const labelTexture = new T.CanvasTexture(labelCanvas); labelTexture.colorSpace=T.SRGBColorSpace; disposable.add(labelTexture);
    const labelMat = new T.MeshStandardMaterial({map:labelTexture,roughness:.72});disposable.add(labelMat);
    put('engraved-robot-id', new T.PlaneGeometry(.13,.0325), labelMat, [0,.45,.166], base);
    // Loop plane follows a diagonal between bars; ellipse clears the full crossed pair.
    inventory = fixtureParts;
    const ties = new Map(), markerMeshes = [], pickable = [];
    function makeWireGeometry(progress = 1, looseness = 0, pulled = 0) {
      const p = [], total = Math.max(3, Math.ceil(progress * 90)), r=.052+.020*looseness,ry=.041+.020*looseness;
      for (let i = 0; i <= total; i++) { const t = i / total * progress, a = Math.PI / 2 + t * Math.PI * 2; p.push(new T.Vector3(Math.cos(a)*r, Math.sin(a)*ry - .022 + pulled * (.002+.073*looseness) * Math.max(0,Math.sin(a)), 0)); }
      // Closed loop and short twisted tails are separate geometries so no chord cuts through steel.
      return new T.TubeGeometry(new T.CatmullRomCurve3(p, false, 'centripetal'), Math.max(12,total), .0025, 6, false);
    }
    function makeTie(p) {
      const group = new T.Group(); group.position.set(p.x,.72,p.z);group.rotation.y=Math.PI/4;workpiece.add(group);
      const loop = new T.Mesh(makeWireGeometry(), materials.wire);loop.castShadow=true;group.add(loop);
      const tails=[];for(const phase of [0,Math.PI]){const p=[];for(let i=0;i<=24;i++){const t=i/24,a=t*Math.PI*5+phase;p.push([Math.cos(a)*.0035,.019+t*.029,Math.sin(a)*.0035]);}p.push([phase?-.011:.011,.054,0]);tails.push(tube('tie-twisted-tail',p,.0021,'wire',group,36));}const[tailA,tailB]=tails;
      const markMat = materials.mark.clone(); disposable.add(markMat);
      const marker = put('workpoint-'+p.id, new T.TorusGeometry(.074,.0022,8,48),markMat,[p.x,.742,p.z],annotations,false);marker.rotation.x=Math.PI/2;marker.userData.pointId=p.id;marker.castShadow=false;markerMeshes.push(marker);
      const hit = new T.Mesh(new T.SphereGeometry(.13,12,8),new T.MeshBasicMaterial({visible:false})); hit.position.set(p.x,.737,p.z);hit.userData.pointId=p.id;annotations.add(hit);pickable.push(hit);disposable.add(hit.geometry);disposable.add(hit.material);
      // Small identification tags clip to the lower bar, away from the tying jaw.
      const plate=rounded('workpoint-id-plate',.10,.005,.067,p.x+.135,.706,p.z,'ivory',workpiece,.005);plate.userData.pointId=p.id;pickable.push(plate);
      torus('workpoint-tag-clip',.021,.002,p.x+.135,.68,p.z,'steel',workpiece,'x');
      const face=document.createElement('canvas');face.width=128;face.height=96;const ctx=face.getContext('2d');ctx.fillStyle='#eeeade';ctx.fillRect(0,0,128,96);ctx.fillStyle='#506c59';ctx.font='700 67px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.id,64,50);
      const texture=new T.CanvasTexture(face);texture.colorSpace=T.SRGBColorSpace;disposable.add(texture);const faceMat=new T.MeshStandardMaterial({map:texture,roughness:.8});disposable.add(faceMat);
      const faceMesh=put('workpoint-id-face',new T.PlaneGeometry(.094,.061),faceMat,[p.x+.135,.709,p.z],workpiece);faceMesh.rotation.x=-Math.PI/2;faceMesh.castShadow=false;
      const record = {group,loop,tailA,tailB,marker,lastKey:'',point:p};ties.set(p.id,record);return record;
    }
    const inspectionHook=new T.Group();inspectionHook.visible=false;workpiece.add(inspectionHook);
    tube('live-inspection-hook',[[0,.015,0],[.013,.018,0],[.015,.04,0],[.025,.06,0],[.14,.11,0]],.0035,'steel',inspectionHook,24);
    const hookGrip=rounded('live-inspection-grip',.11,.025,.029,.18,.125,0,'orange',inspectionHook,.009);hookGrip.rotation.z=.35;
    let data = { aim:{x:0,z:0},points:[],selected:null,stage:'tying',busy:null,cycle:0,inspection:0,jammed:false };
    let actual = {x:0,y:WORLD.hoverY,z:0}, solution = solveArm(0,WORLD.hoverY+WORLD.toolOffset,0), clock=0,cutaway=false,cutawayAmount=0,destroyed=false,lastDt=1/60,view='overview';
    let needsPaint=true,lastPaintSignature='',renderedFrames=0,skippedFrames=0,lastRenderCall=0;
    const targetLook = new T.Vector3(-.36,.95,0), currentLook=targetLook.clone();
    let orbit = {theta:.77,phi:1.02,radius:5.65}, desiredOrbit={...orbit};
    const pointer = {down:false,startX:0,startY:0,lastX:0,lastY:0,moved:false}, touches=new Map();let pinchDistance=0;
    const raycaster=new T.Raycaster(),pointerNdc=new T.Vector2(),groundPlane=new T.Plane(new T.Vector3(0,1,0),-.72),hitPoint=new T.Vector3();
    function setCamera(name) {
      view=name;
      if(name==='top'){desiredOrbit={theta:.05,phi:.23,radius:4.6};targetLook.set(-.22,.64,0);}
      else if(name==='front'){desiredOrbit={theta:.06,phi:1.15,radius:5.1};targetLook.set(-.35,1.0,0);}
      else if(name==='tool'){const review=['review','done'].includes(data.stage)&&!['tie','repair','study'].includes(data.busy?.kind);desiredOrbit={theta:.72,phi:1.32,radius:review?.65:1.12};if(review){const p=ties.get(data.selected)?.point||data.aim;targetLook.set(p.x,.75,p.z);}else targetLook.set(actual.x,actual.y+.04,actual.z);}
      else {view='overview';desiredOrbit={theta:.77,phi:1.02,radius:5.65};targetLook.set(-.36,.95,0);}
      callbacks.onCameraChange?.(view);
    }
    function clickAt(event) {
      const r=canvas.getBoundingClientRect();pointerNdc.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointerNdc,camera);
      const hits=raycaster.intersectObjects(pickable);if(hits.length){const id=hits[0].object.userData.pointId;callbacks.onPoint?.(id);callbacks.onSelect?.(id);if(data.stage==='tying'){const p=ties.get(id).point;callbacks.onAim?.({x:p.x,z:p.z});}return;}
      if(data.stage==='tying'&&raycaster.ray.intersectPlane(groundPlane,hitPoint)&&Math.abs(hitPoint.x)<.9&&Math.abs(hitPoint.z)<.9)callbacks.onAim?.({x:clamp(hitPoint.x,-.78,.78),z:clamp(hitPoint.z,-.78,.78)});
    }
    function down(e){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);pointer.down=true;pointer.startX=pointer.lastX=e.clientX;pointer.startY=pointer.lastY=e.clientY;pointer.moved=false;if(touches.size===2){const p=[...touches.values()];pinchDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);pointer.moved=true;}callbacks.onInteraction?.();}
    function move(e){if(!touches.has(e.pointerId))return;touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size===2){const p=[...touches.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)desiredOrbit.radius=clamp(desiredOrbit.radius*pinchDistance/distance,.65,8);pinchDistance=distance;pointer.moved=true;return;}const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;if(Math.hypot(e.clientX-pointer.startX,e.clientY-pointer.startY)>5)pointer.moved=true;if(pointer.moved){desiredOrbit.theta-=dx*.006;desiredOrbit.phi=clamp(desiredOrbit.phi-dy*.0045,.17,1.45);view='orbit';}}
    function up(e){const tapped=pointer.down&&!pointer.moved&&touches.size===1;touches.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);pointer.down=touches.size>0;if(tapped)clickAt(e);if(touches.size){const p=[...touches.values()][0];pointer.lastX=p.x;pointer.lastY=p.y;pointer.moved=true;}else pinchDistance=0;}
    function cancel(e){touches.delete(e.pointerId);pointer.down=touches.size>0;pointer.moved=true;pinchDistance=0;}
    function wheel(e){e.preventDefault();desiredOrbit.radius=clamp(desiredOrbit.radius*Math.exp(e.deltaY*.001),.65,8);callbacks.onInteraction?.();}
    function keydown(e){let handled=true;if(e.altKey&&e.key==='ArrowLeft')desiredOrbit.theta+=.12;else if(e.altKey&&e.key==='ArrowRight')desiredOrbit.theta-=.12;else if(e.altKey&&e.key==='ArrowUp')desiredOrbit.phi=clamp(desiredOrbit.phi-.1,.17,1.45);else if(e.altKey&&e.key==='ArrowDown')desiredOrbit.phi=clamp(desiredOrbit.phi+.1,.17,1.45);else if(e.key==='+'||e.key==='=')desiredOrbit.radius*=.9;else if(e.key==='-')desiredOrbit.radius*=1.1;else if(e.key==='Home')setCamera('overview');else handled=false;if(handled){e.preventDefault();e.stopPropagation();callbacks.onInteraction?.();}}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',keydown);
    function update(next) { data={...data,...next};if(next.aim)data.aim={...next.aim};if(next.points)for(const p of next.points){const tie=ties.get(p.id)||makeTie(p);tie.point=p;} }
    function updateTie(record, dt) {
      const p=record.point,busy=data.busy&&data.busy.id===p.id&&data.busy.kind!=='pull',phase=phaseAt(clamp(data.cycle||0,0,1),data.jammed);
      const progress=busy?phase.feed:(p.tied?1:0),twistProgress=busy?phase.twist:1;
      const quality=p.quality||'normal',looseness=busy?1-phase.tight:quality==='loose'?1:0,pull=data.busy?.kind==='pull'&&data.busy.id===p.id?Math.sin(Math.PI*clamp(data.inspection||0,0,1)):0;
      record.group.visible=progress>.004;record.tailA.visible=record.tailB.visible=progress>.97;
      const k=[Math.round(progress*90),Math.round(looseness*30),Math.round(pull*24)].join(':');if(k!==record.lastKey){record.loop.geometry.dispose();record.loop.geometry=makeWireGeometry(progress,looseness,pull);record.lastKey=k;}
      const tailScale=.3+.7*twistProgress;record.tailA.scale.y=record.tailB.scale.y=tailScale;record.tailA.position.y=record.tailB.position.y=.019*(1-tailScale)+looseness*.02+pull*(.002+.073*looseness);
      record.marker.visible=data.stage!=='done'&&!busy;record.marker.material.color.copy(p.marked?materials.warning.color:p.checked?materials.teal.color:data.selected===p.id?materials.orange.color:materials.mark.color);
      const scale=data.selected===p.id?1.12:1;record.marker.scale.setScalar(scale);record.marker.material.transparent=true;record.marker.material.opacity=p.tied?.45:.85;
    }
    function render(dt=1/60) {
      if(destroyed)return;dt=clamp(Number(dt)||1/60,1/240,.05);lastDt+=(dt-lastDt)*.06;clock+=dt;
      const now=performance.now();if(now-lastRenderCall>250)needsPaint=true;lastRenderCall=now;
      const active=data.busy&&['tie','repair','study'].includes(data.busy.kind),c=clamp(data.cycle||0,0,1),phase=phaseAt(c,data.jammed);
      const lower=active?phase.approach*(1-phase.leave):0;
      const parked=['review','done'].includes(data.stage)&&!active;
      const targetY=parked?1.32:WORLD.hoverY+(WORLD.tipY-WORLD.hoverY)*lower;
      const targetAim=parked?{x:-.94,z:-.65}:data.aim;
      const blend=data.reduced?1:1-Math.exp(-dt/(active?.07:.18));actual.x+=(targetAim.x-actual.x)*blend;actual.z+=(targetAim.z-actual.z)*blend;actual.y+=(targetY-actual.y)*(data.reduced?1:1-Math.exp(-dt/.075));
      solution=solveArm(actual.x,actual.y+WORLD.toolOffset,actual.z);yaw.rotation.y=-solution.yaw;upper.rotation.z=solution.shoulder;fore.rotation.z=solution.elbow;wrist.rotation.z=solution.wrist;head.rotation.y=Math.PI/4+solution.yaw;
      cutawayAmount+=(Number(cutaway)-cutawayAmount)*(data.reduced?1:1-Math.exp(-dt/.2));coverHinge.rotation.y=cutawayAmount*1.85;
      const close=active?phase.grip:0;jaws[0].rotation.z=-(1-close)*.18;jaws[1].rotation.z=(1-close)*.18;
      spool.rotation.z=active?-phase.feed*Math.PI*3:0;feedWheels[0].rotation.z=active?phase.feed*Math.PI*11:0;feedWheels[1].rotation.z=active?-phase.feed*Math.PI*11:0;
      cutter.position.x=.022-(active?phase.cut:0)*.016;
      twist.rotation.y=active?phase.twist*Math.PI*7:0;
      for(const record of ties.values())updateTie(record,dt);
      inspectionHook.visible=data.busy?.kind==='pull';if(inspectionHook.visible){const p=ties.get(data.busy.id)?.point;if(p){const lift=Math.sin(Math.PI*clamp(data.inspection||0,0,1))*(p.quality==='loose'?.075:.002);inspectionHook.position.set(p.x,.72+(p.quality==='loose'?.02:0)+lift,p.z);inspectionHook.rotation.y=Math.PI/4;}}
      if(view==='tool'){if(parked){const p=ties.get(data.selected)?.point||data.aim;targetLook.set(p.x,.75,p.z);}else targetLook.set(actual.x,actual.y+.04,actual.z);}
      const ease=data.reduced?1:1-Math.exp(-dt/.23);orbit.theta+=(desiredOrbit.theta-orbit.theta)*ease;orbit.phi+=(desiredOrbit.phi-orbit.phi)*ease;orbit.radius+=(desiredOrbit.radius-orbit.radius)*ease;currentLook.lerp(targetLook,ease);
      const aspect=host.clientWidth/Math.max(1,host.clientHeight),fit=view==='tool'?1:Math.max(1,.95/Math.max(.4,aspect));
      camera.position.set(currentLook.x+Math.sin(orbit.theta)*Math.sin(orbit.phi)*orbit.radius*fit,currentLook.y+Math.cos(orbit.phi)*orbit.radius*fit,currentLook.z+Math.cos(orbit.theta)*Math.sin(orbit.phi)*orbit.radius*fit);camera.lookAt(currentLook);camera.updateMatrixWorld();
      scene.updateMatrixWorld(true);
      // Keep pointer/cycle updates alive, but settled scenes spend no GPU frames.
      // A tenth of a millimetre / 0.006 degree threshold is below a display pixel.
      const pose=[actual.x,actual.y,actual.z,orbit.theta,orbit.phi,orbit.radius,currentLook.x,currentLook.y,currentLook.z,cutawayAmount,phase.p,data.inspection||0].map(v=>Math.round(v*10000)).join(',');
      const pointState=data.points.map(p=>[p.id,p.tied,p.quality,p.checked,p.marked,p.x,p.z].join(':')).join('|');
      const signature=[pose,pointState,data.stage,data.selected,data.busy?.kind||'',data.busy?.id||'',data.jammed,view].join('/');
      if(needsPaint||signature!==lastPaintSignature){renderer.render(scene,camera);renderedFrames++;lastPaintSignature=signature;needsPaint=false;}else skippedFrames++;
    }
    function setTheme(dark){scene.background=new T.Color(dark?0x242c28:0xf3f0e8);scene.fog=new T.Fog(scene.background,8,18);materials.floor.color.set(dark?0x666c60:0xe9e4d9);materials.seam.color.set(dark?0x575e53:0xd7d2c8);renderer.toneMappingExposure=dark?1.05:1.17;needsPaint=true;}
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();needsPaint=true;}
    function projectPoint(x,z,y=.75){const v=new T.Vector3(x,y,z).project(camera);return{x:(v.x+1)*host.clientWidth/2,y:(1-v.y)*host.clientHeight/2,visible:v.z<1&&v.z>-1};}
    function geometryMeasurements(){
      const low=fixtureParts.find(m=>m.name==='lower-rebar-x'),high=fixtureParts.find(m=>m.name==='upper-rebar-z'),lr=low.geometry.parameters.radiusTop,hr=high.geometry.parameters.radiusTop;
      let min=Infinity;for(const record of ties.values()){if(!record.group.visible)continue;const a=record.loop.geometry.attributes.position.array;for(let i=0;i<a.length;i+=3){const dx=(a[i]+a[i+2])/Math.SQRT2,dz=(-a[i]+a[i+2])/Math.SQRT2,y=record.group.position.y+a[i+1];min=Math.min(min,Math.hypot(dz,y-low.position.y)-lr,Math.hypot(dx,y-high.position.y)-hr);}}
      return{barContactGap:Math.abs(high.position.y-low.position.y)-lr-hr,wireBarClearance:Number.isFinite(min)?min:null,barGeometry:{lowerCenterY:low.position.y,upperCenterY:high.position.y,lowerRadius:lr,upperRadius:hr}};
    }
    function getDiagnostics(){const error=Math.hypot(data.aim.x-actual.x,data.aim.z-actual.z),parked=['review','done'].includes(data.stage)&&!['tie','repair','study'].includes(data.busy?.kind),parkError=Math.hypot(-.94-actual.x,1.32-actual.y,-.65-actual.z);return{available:true,partCount:robotParts.length,fixturePartCount:fixtureParts.length,meshCount:renderer.info.render.calls,triangles:renderer.info.render.triangles,ikError:solution.error,aimError:error,actualAim:{x:actual.x,z:actual.z},settled:error<.014,parked,parkedSettled:parked&&parkError<.014,effectiveSettled:parked?parkError<.014:error<.014,reachable:solution.reachable,fps:Math.round(1/lastDt),renderedFrames,skippedFrames,...geometryMeasurements(),upperLength:WORLD.upper,forearmLength:WORLD.fore,view};}
    function getState(){const positions={};for(const [name,obj]of Object.entries({shoulder:upper,elbow:fore,wrist,head})){const v=obj.getWorldPosition(new T.Vector3());positions[name]={x:v.x,y:v.y,z:v.z};}return{actual:{...actual},aim:{...data.aim},solution:{...solution},positions,cutaway:cutawayAmount,view,camera:{...orbit,look:{x:currentLook.x,y:currentLook.y,z:currentLook.z}},mechanism:{phase:phaseAt(data.cycle||0,data.jammed),spoolAngle:spool.rotation.z,feedAngles:feedWheels.map(w=>w.rotation.z),twistAngle:twist.rotation.y,jawAngles:jaws.map(j=>j.rotation.z)},diagnostics:getDiagnostics()};}
    const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(host);
    const invalidate=()=>{needsPaint=true;};document.addEventListener('visibilitychange',invalidate);canvas.addEventListener('webglcontextrestored',invalidate);
    function dispose(){destroyed=true;observer?.disconnect();document.removeEventListener('visibilitychange',invalidate);canvas.removeEventListener('webglcontextrestored',invalidate);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('keydown',keydown);for(const r of ties.values())r.loop.geometry.dispose();for(const item of disposable)item.dispose?.();renderer.dispose();canvas.remove();}
    setTheme(false);resize();render(1/60);callbacks.onReady?.();
    return{available:true,canvas,update,render,resize,invalidate,setCamera,setTheme,setCutaway(value){cutaway=!!value;},getDiagnostics,getState,projectPoint,dispose};
  }
  global.TyingHeroScene={create,solveArm,WORLD};
})(window);
