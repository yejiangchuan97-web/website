/* Real perspective meshes. Wall coordinates are millimetres; scene units are metres. */
(function () {
  'use strict';
  const BASE = 0.12, WALL_W = 3.6, WALL_H = 2.4;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  window.createSprayScene = function (host, callbacks = {}) {
    let data = { params: { spacing: 200, distance: 300, speed: 300, guard: 'footprint', slow: true, compensate: false }, pose: { x: 100, z: 40, on: false }, progress: 0, coat: null, viewMode: 'plan', color: '#258ad4', running: false };
    let theme = 'light', pathVisible = true, destroyed = false, visible = true, dirty = true, raf = 0, lastPaint = 0, lastTime = 0, coatDirty = true, viewName = 'orbit';
    let renderer;
    try {
      const flags = new URLSearchParams(location.search);
      if (flags.has('no-webgl') || flags.get('noWebGL') === '1' || !window.THREE) throw new Error('WebGL disabled');
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (_) { return createFallback(host, callbacks, data); }
    const T = THREE, scene = new T.Scene(), camera = new T.PerspectiveCamera(39, 1, 0.03, 60);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.32;
    renderer.setClearColor(0xeaf3fb, 0);
    const canvas = renderer.domElement; canvas.className = 'spray-webgl'; canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;outline:none;';
    canvas.tabIndex = 0; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', '真实三维喷涂现场，可拖动旋转、滚轮缩放，方向键旋转，加减键缩放'); host.appendChild(canvas);
    const materials = {}, geometries = new Map(), physicalParts = [];
    function mat(name, color, metalness = 0, roughness = 0.62) { return materials[name] = new T.MeshStandardMaterial({ color, metalness, roughness }); }
    mat('wall', 0xf7eddc, 0, .87); mat('cut', 0xe3d9cb); mat('floor', 0xe5ddd2); mat('floorEdge', 0xc5ced7, .1); mat('seam', 0xc7bfb3);
    mat('blue', 0x1765c8, .28, .35); mat('lightblue', 0x52a4eb, .2, .38); mat('navy', 0x173b67, .35, .4); mat('orange', 0xf69a36, .08, .4);
    mat('silver', 0xcbd8e1, .72, .28); mat('steel', 0x71899e, .7, .34); mat('rubber', 0x253541, .02, .85); mat('brass', 0xe4b664, .65, .3);
    mat('white', 0xf3f7f7, .15, .4); mat('black', 0x253a4b, .05, .6); mat('red', 0xe8473d, .1, .38); mat('green', 0x35caaa, .12, .38);
    mat('cloth', 0xe9bd7e, 0, .98); mat('tape', 0xf3d353, 0, .75); mat('glass', 0xaad9e9, .14, .22); mat('film', 0xd9e9df, 0, .8);
    materials.screen = new T.MeshStandardMaterial({ color: 0x0a3855, emissive: 0x0b405a, emissiveIntensity: .3, roughness: .3 });
    const hemi = new T.HemisphereLight(0xecf8ff, 0xb0a28b, 2.25); scene.add(hemi);
    const sun = new T.DirectionalLight(0xffefda, 3.4); sun.position.set(-3.7, 7, 5.4); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -4, near: .2, far: 20 }); sun.shadow.bias = -.00035; sun.shadow.normalBias = .018; sun.shadow.radius = 4; scene.add(sun);
    const fill = new T.DirectionalLight(0xc9e5ff, 1.75); fill.position.set(5, 3, -1); scene.add(fill);
    function put(name, geometry, material, at, parent = scene) { const o = new T.Mesh(geometry, typeof material === 'string' ? materials[material] : material); o.position.set(...at); o.castShadow = true; o.receiveShadow = true; o.name = name; parent.add(o); physicalParts.push(o); return o; }
    function box(name, w, h, d, x, y, z, material, parent) { const key = `b:${w}:${h}:${d}`; if (!geometries.has(key)) geometries.set(key, new T.BoxGeometry(w, h, d)); return put(name, geometries.get(key), material, [x, y, z], parent); }
    function roundBox(name, w, h, d, x, y, z, material, parent, r = .035) {
      r = Math.min(r, w / 4, h / 4, d / 4); const shape = new T.Shape(), x0 = -w / 2, y0 = -h / 2;
      shape.moveTo(x0 + r, y0); shape.lineTo(x0 + w - r, y0); shape.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); shape.lineTo(x0 + w, y0 + h - r); shape.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); shape.lineTo(x0 + r, y0 + h); shape.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); shape.lineTo(x0, y0 + r); shape.quadraticCurveTo(x0, y0, x0 + r, y0);
      const g = new T.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 3 }); g.translate(0, 0, -d / 2 + r); return put(name, g, material, [x, y, z], parent);
    }
    function cyl(name, r, length, x, y, z, material, parent, axis = 'y', r2 = r) { const o = put(name, new T.CylinderGeometry(r2, r, length, 28), material, [x, y, z], parent); if (axis === 'x') o.rotation.z = Math.PI / 2; if (axis === 'z') o.rotation.x = Math.PI / 2; return o; }
    function tube(name, points, radius, material, parent = scene, segments = 40) { const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))); return put(name, new T.TubeGeometry(curve, segments, radius, 8, false), material, [0, 0, 0], parent); }
    function bolt(name, x, y, z, parent = scene, axis = 'y') { return cyl(name, .011, .008, x, y, z, 'steel', parent, axis); }
    function disposeObject(o) { if (o.geometry) o.geometry.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else if (o.material && !Object.values(materials).includes(o.material)) o.material.dispose(); }
    const room = new T.Group(); room.name = 'room'; scene.add(room);
    box('concrete-floor', 5.1, .16, 3.55, 0, -.07, .9, 'floorEdge', room);
    box('floor-finish', 5.08, .025, 3.53, 0, .0225, .9, 'floor', room);
    for (let x = -2.4; x <= 2.4; x += .6) box(`floor-seam-x-${x}`, .006, .002, 3.5, x, .036, .9, 'seam', room);
    for (let z = -.6; z <= 2.4; z += .6) box(`floor-seam-z-${z}`, 5, .002, .006, 0, .036, z, 'seam', room);
    box('drop-cloth', 4.15, .012, 2.05, 0, .044, 1.05, 'cloth', room);
    for (const x of [-2.04, 2.04]) box(`cloth-tape-side-${x}`, .035, .004, 2.07, x, .053, 1.05, 'tape', room);
    for (const z of [.04, 2.06]) box(`cloth-tape-end-${z}`, 4.12, .004, .035, 0, .053, z, 'tape', room);
    // Four solids enclose an actual opening. No wall polygon crosses the window.
    box('wall-left', 1.55, 2.4, .16, -1.025, BASE + 1.2, -.08, 'wall', room);
    box('wall-right', 1.25, 2.4, .16, 1.175, BASE + 1.2, -.08, 'wall', room);
    box('wall-below-window', .8, .8, .16, .15, BASE + .4, -.08, 'wall', room);
    box('wall-above-window', .8, .8, .16, .15, BASE + 2, -.08, 'wall', room);
    box('wall-top-cap', 3.66, .035, .2, 0, BASE + 2.4175, -.08, 'white', room);
    box('wall-plinth', 3.6, .08, .17, 0, BASE - .04, -.075, 'cut', room);
    box('side-wall-cutaway', .14, 1.55, 1.2, -2.18, .815, .43, 'wall', room);
    box('side-wall-cap', .16, .03, 1.22, -2.18, 1.605, .43, 'white', room);
    box('wall-return-left', .31, 1.55, .16, -1.955, .815, -.08, 'wall', room);
    box('back-skirt', 3.6, .07, .025, 0, BASE + .035, .014, 'white', room);
    for (const x of [-.265, .565]) box(`window-reveal-${x}`, .03, .84, .18, x, BASE + 1.2, -.06, 'white', room);
    for (const y of [BASE + .785, BASE + 1.615]) box(`window-reveal-${y}`, .86, .03, .18, .15, y, -.06, 'white', room);
    for (const x of [-.2325, .5325]) box(`window-jamb-${x}`, .035, .77, .045, x, BASE + 1.2, -.105, 'silver', room);
    for (const y of [BASE + .8325, BASE + 1.5675]) box(`window-frame-${y}`, .77, .035, .045, .15, y, -.105, 'silver', room);
    box('window-mullion', .025, .71, .045, .15, BASE + 1.2, -.105, 'silver', room);
    for (const x of [-.041, .341]) box(`window-glass-${x}`, .35, .7, .009, x, BASE + 1.2, -.128, 'glass', room);
    const film = box('window-protection-film', .73, .73, .003, .15, BASE + 1.2, -.076, 'film', room);
    film.material = materials.film.clone(); film.material.transparent = true; film.material.opacity = .34; film.castShadow = false;
    for (const x of [-.235, .535]) box(`window-mask-tape-${x}`, .025, .8, .004, x, BASE + 1.2, -.048, 'tape', room);
    for (const y of [BASE + .815, BASE + 1.585]) box(`window-mask-tape-${y}`, .8, .025, .004, .15, y, -.048, 'tape', room);
    box('window-handle-base', .035, .09, .015, .195, BASE + 1.17, -.067, 'white', room);
    box('window-handle', .016, .065, .035, .195, BASE + 1.17, -.047, 'white', room);
    // Attached furniture remains outside the moving machine's operating strip.
    box('boundary-bollard-foot', .25, .035, .25, 2.25, .055, 1.8, 'navy', room);
    cyl('boundary-bollard', .045, .55, 2.25, .345, 1.8, 'orange', room);
    cyl('boundary-reflector', .046, .075, 2.25, .52, 1.8, 'white', room);
    const robot = new T.Group(); robot.name = 'spray-robot'; scene.add(robot);
    box('chassis-underplate', .59, .06, .68, 0, .235, .94, 'navy', robot);
    roundBox('chassis-shell', .6, .23, .69, 0, .37, .94, 'blue', robot, .035);
    roundBox('chassis-top', .59, .035, .67, 0, .5, .94, 'lightblue', robot, .009);
    const wheelGroups = [];
    for (const x of [-.235, .235]) for (const z of [.5475, 1.3325]) {
      const front = z < .94, inward = front ? 1 : -1;
      box(`wheel-fork-${x}-${z}`, .10, .12, .035, x, .233, z + inward * .065, 'steel', robot);
      const wheel = new T.Group(); wheel.name=`wheel-assembly-${x}-${z}`;wheel.position.set(x,.183,z);robot.add(wheel);wheelGroups.push(wheel);
      cyl(`wheel-tire-${x}-${z}`, .13, .095, 0, 0, 0, 'rubber', wheel, 'z');
      cyl(`wheel-hub-${x}-${z}`, .083, .099, 0, 0, 0, 'silver', wheel, 'z');
      cyl(`wheel-cap-${x}-${z}`, .035, .105, 0, 0, 0, 'navy', wheel, 'z');
      for(let i=0;i<3;i++){const spoke=box(`wheel-spoke-${x}-${z}-${i}`,.115,.012,.003,0,0,-inward*.051,'steel',wheel);spoke.rotation.z=i*Math.PI/3;}
    }
    for (const x of [-.24, .24]) for (const z of [.66, .82, 1.04, 1.22]) bolt(`chassis-screw-${x}-${z}`, x, .523, z, robot);
    for (const x of [-.115, .115]) {
      cyl(`lift-rail-${x}`, .027, 2.6, x, 1.6, .53, 'silver', robot);
      box(`lift-rail-foot-${x}`, .095, .06, .095, x, .27, .5475, 'navy', robot);
      box(`lift-rail-cap-${x}`, .085, .07, .1, x, 2.9, .53, 'blue', robot);
    }
    cyl('lead-screw', .015, 2.58, 0, 1.59, .565, 'steel', robot);
    cyl('lead-screw-bearing', .033, .045, 0, 2.8875, .565, 'brass', robot);
    box('top-crosshead', .36, .08, .15, 0, 2.975, .53, 'blue', robot);
    cyl('lift-motor', .061, .16, 0, .6, .98, 'navy', robot);
    cyl('lift-motor-cap', .064, .023, 0, .69, .98, 'silver', robot);
    cyl('signal-lamp-base', .046, .035, 0, 3.0325, .53, 'navy', robot);
    cyl('signal-lamp', .038, .065, 0, 3.0825, .53, 'orange', robot);
    box('rail-ruler', .025, 2.08, .005, -.16, 1.65, .562, 'white', robot);
    for(const y of [.62,2.68])box(`ruler-mount-${y}`,.07,.02,.025,-.1375,y,.545,'steel',robot);
    for (let i = 0; i < 26; i++) box(`ruler-tick-${i}`, i % 5 === 0 ? .023 : .012, .003, .002, -.16, .63 + i * .08, .566, 'navy', robot);
    for (let i = 0; i < 6; i++) roundBox(`chassis-vent-${i}`, .025, .08, .006, -.18 + i * .072, .39, 1.29, 'navy', robot, .004);
    const panel = box('control-panel', .21, .12, .045, .13, .55, 1.16, 'white', robot); panel.rotation.x = -.35;
    box('control-screen', .115, .055, .005, .095, .559, 1.185, materials.screen, robot);
    cyl('estop-base', .029, .009, .22, .56, 1.19, 'tape', robot, 'z');
    cyl('estop-head', .022, .024, .22, .56, 1.204, 'red', robot, 'z');
    for (let i = 0; i < 2; i++) cyl(`control-led-${i}`, .006, .007, .06 + i * .025, .524, 1.19, i ? 'green' : 'orange', robot, 'z');
    const labelPlate = box('machine-label', .17, .055, .003, 0, .38, 1.301, 'white', robot);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width=256;labelCanvas.height=96;const labelCtx=labelCanvas.getContext('2d');labelCtx.fillStyle='#eaf2f7';labelCtx.fillRect(0,0,256,96);labelCtx.fillStyle='#174b83';labelCtx.font='bold 40px sans-serif';labelCtx.fillText('SPR–04',18,48);labelCtx.fillStyle='#7b99b1';labelCtx.fillRect(18,65,135,4);labelCtx.fillRect(18,76,96,3);const labelTexture=new T.CanvasTexture(labelCanvas);labelTexture.colorSpace=T.SRGBColorSpace;
    const labelFace=new T.Mesh(new T.PlaneGeometry(.155,.049),new T.MeshStandardMaterial({map:labelTexture,roughness:.7}));labelFace.position.set(0,.38,1.303);robot.add(labelFace);
    box('distance-sensor', .06, .05, .04, -.265, .54, .65, 'navy', robot);
    box('sensor-window', .03, .026, .003, -.265, .54, .628, materials.screen, robot);
    const carriage = new T.Group(); carriage.name = 'lift-carriage'; robot.add(carriage);
    box('carriage-body', .32, .17, .15, 0, 0, .51, 'blue', carriage);
    for (const x of [-.115, .115]) for (const y of [-.07, .07]) cyl(`carriage-bushing-${x}-${y}`, .037, .045, x, y, .53, 'brass', carriage);
    for (const x of [-.13, .13]) for (const y of [-.05, .05]) bolt(`carriage-screw-${x}-${y}`, x, y, .589, carriage, 'z');
    const arm = box('spray-extension', .055, .065, .4, 0, 0, .5, 'silver', carriage);
    const gun = new T.Group(); gun.name = 'spray-gun'; carriage.add(gun);
    box('nozzle-drop-bracket', .055, .23, .045, 0, -.12, .14, 'blue', gun);
    cyl('spray-gun-body', .032, .145, 0, -.24, .095, 'silver', gun, 'z');
    cyl('nozzle-seat', .026, .025, 0, -.24, .016, 'brass', gun, 'z');
    box('orange-nozzle-guard', .094, .05, .025, 0, -.24, .012, 'orange', gun);
    cyl('nozzle-outlet', .012, .008, 0, -.24, -.005, 'black', gun, 'z');
    cyl('spray-flow-valve', .018, .043, .04, -.24, .1, 'brass', gun, 'x');
    cyl('gun-hose-connector', .017, .025, .065, -.24, .1, 'navy', gun, 'x');
    const supply = new T.Group(); supply.name = 'onboard-supply'; robot.add(supply);
    cyl('paint-bucket', .125, .3, -.1, .67, 1.07, 'white', supply, 'y', .14);
    cyl('bucket-top-ring', .145, .024, -.1, .828, 1.07, 'silver', supply);
    cyl('bucket-lid', .137, .012, -.1, .846, 1.07, 'orange', supply);
    tube('bucket-handle', [[-.24,.73,1.07],[-.24,.96,1.07],[.04,.96,1.07],[.04,.73,1.07]], .008, 'steel', supply, 24);
    cyl('paint-pump', .052, .16, .175, .64, 1.01, 'navy', supply);
    cyl('pump-top', .058, .035, .175, .735, 1.01, 'silver', supply);
    cyl('base-hose-connector', .022, .055, .232, .65, 1.01, 'brass', supply, 'x');
    for (const x of [.13, .22]) for (const z of [.97, 1.05]) box(`pump-foot-${x}-${z}`, .02, .035, .03, x, .535, z, 'steel', supply);
    cyl('pressure-gauge-case', .045, .025, .175, .76, 1.07, 'steel', supply, 'z');
    cyl('pressure-gauge-face', .038, .002, .175, .76, 1.084, 'white', supply, 'z');
    for(let i=0;i<13;i++){const a=(-140+i*280/12)*Math.PI/180;const tick=box(`pressure-gauge-tick-${i}`,.0025,i%3===0?.008:.004,.001,.175+Math.sin(a)*.029,.76+Math.cos(a)*.029,1.0854,'navy',supply);tick.rotation.z=-a;}
    const needle = box('pressure-gauge-needle', .003, .03, .001, .182, .77, 1.086, 'red', supply); needle.rotation.z = -.6;
    let hose = null;
    function updateHose(y, distance) {
      if (hose) { robot.remove(hose); hose.geometry.dispose(); }
      hose = tube('flexible-supply-hose', [[.2595,.65,1.01],[.31,.65,1.01],[.39,.72,1.01],[.39,Math.max(.82,y-.36),.84],[.23,y-.22,distance+.24],[.115,y-.24,distance+.1],[.0775,y-.24,distance+.1]], .011, 'rubber', robot, 36);
      // The hose is a deformable display mesh, excluded from static part counting.
      physicalParts.pop();
    }
    const paintCanvas = document.createElement('canvas'); paintCanvas.width = 900; paintCanvas.height = 600; const ctx = paintCanvas.getContext('2d');
    const paintTexture = new T.CanvasTexture(paintCanvas); paintTexture.colorSpace = T.SRGBColorSpace;
    const paintMat = new T.MeshStandardMaterial({ map: paintTexture, transparent: true, depthWrite: false, roughness: .8, polygonOffset: true, polygonOffsetFactor: -1 });
    const wallPaint = put('live-painted-surface', new T.PlaneGeometry(3.6, 2.4), paintMat, [0, BASE + 1.2, .003]); wallPaint.castShadow = false;
    const windowCanvas=document.createElement('canvas');windowCanvas.width=windowCanvas.height=200;const windowCtx=windowCanvas.getContext('2d'),windowTexture=new T.CanvasTexture(windowCanvas);windowTexture.colorSpace=T.SRGBColorSpace;
    const windowPaint=put('window-film-pollution',new T.PlaneGeometry(.8,.8),new T.MeshStandardMaterial({map:windowTexture,transparent:true,depthWrite:false,roughness:.8}),[.15,BASE+1.2,-.073]);windowPaint.castShadow=false;
    const selectable = new T.Mesh(new T.PlaneGeometry(3.6, 2.4), new T.MeshBasicMaterial({ visible: false, side: T.DoubleSide })); selectable.position.set(0, BASE + 1.2, .04); scene.add(selectable);
    const routeGroup = new T.Group(); routeGroup.name = 'planned-route'; scene.add(routeGroup); let lastRoute = '';
    const routeMat = new T.LineDashedMaterial({ color: 0x347ccb, dashSize: .045, gapSize: .037, transparent: true, opacity: .55, depthWrite: false });
    const offMat = new T.LineDashedMaterial({ color: 0xe59342, dashSize: .025, gapSize: .035, transparent: true, opacity: .55, depthWrite: false });
    function buildRoute() {
      const key = JSON.stringify([data.params.spacing, data.params.distance, data.params.guard]); if (key === lastRoute) return; lastRoute = key;
      for (const o of [...routeGroup.children]) { routeGroup.remove(o); o.geometry.dispose(); }
      const p = data.params, xs = typeof M !== 'undefined' ? M.passes(p.spacing) : [100, 300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100, 2300, 2500, 2700, 2900, 3100, 3300, 3500];
      const onPoints = [], offPoints = [];
      function line(points, material) { const target = material === routeMat ? onPoints : offPoints; for (const v of points) target.push(new T.Vector3(...v)); }
      xs.forEach((x, i) => {
        for (let z = 40; z < 2360; z += 80) { const on = typeof M === 'undefined' || M.sprayAllowed(x, z + 40, p); line([[x / 1000 - 1.8, BASE + z / 1000, .012], [x / 1000 - 1.8, BASE + Math.min(z + 80, 2360) / 1000, .012]], on ? routeMat : offMat); }
        if (i < xs.length - 1) { const z = i % 2 ? 40 : 2360; line([[x / 1000 - 1.8, BASE + z / 1000, .012], [xs[i + 1] / 1000 - 1.8, BASE + z / 1000, .012]], offMat); }
      });
      for (const [points, material] of [[onPoints, routeMat], [offPoints, offMat]]) { if (!points.length) continue; const o = new T.LineSegments(new T.BufferGeometry().setFromPoints(points), material); o.computeLineDistances(); routeGroup.add(o); }
    }
    const marker = new T.Mesh(new T.TorusGeometry(.055, .004, 8, 40), new T.MeshBasicMaterial({ color: 0xf8b438, depthTest: false })); marker.position.z = .045; marker.visible = false; marker.renderOrder = 10; scene.add(marker);
    const footprintGeometry = new T.BufferGeometry(), footprintPositions = new Float32Array(12);
    footprintGeometry.setAttribute('position', new T.BufferAttribute(footprintPositions, 3));
    const footprint = new T.LineLoop(footprintGeometry, new T.LineBasicMaterial({ color: 0x13b6bd, transparent: true, opacity: .85 })); scene.add(footprint);
    const fanGeometry = new T.BufferGeometry(); const fanPositions = new Float32Array(18); fanGeometry.setAttribute('position', new T.BufferAttribute(fanPositions, 3));
    const fanMaterial = new T.MeshBasicMaterial({ color: 0x36a7df, transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide }); const fan = new T.Mesh(fanGeometry, fanMaterial); scene.add(fan);
    const dotCanvas = document.createElement('canvas'); dotCanvas.width = dotCanvas.height = 32; const dot = dotCanvas.getContext('2d'), grad = dot.createRadialGradient(16,16,0,16,16,16); grad.addColorStop(0,'rgba(255,255,255,.9)'); grad.addColorStop(.3,'rgba(255,255,255,.45)'); grad.addColorStop(1,'rgba(255,255,255,0)'); dot.fillStyle = grad; dot.fillRect(0,0,32,32);
    const dotTexture = new T.CanvasTexture(dotCanvas), particleCount = 150, particlePositions = new Float32Array(particleCount * 3), particlesG = new T.BufferGeometry(); particlesG.setAttribute('position', new T.BufferAttribute(particlePositions, 3));
    const particlesM = new T.PointsMaterial({ color: 0x70cdf2, size: .025, map: dotTexture, transparent: true, opacity: 0, depthWrite: false }); const particles = new T.Points(particlesG, particlesM); scene.add(particles);
    let sprayLevel = 0, hoseY = -9, hoseD = -9, frameCount = 0, lastPoseX = 0;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let orbit = { az: .48, el: .28, radius: 6.15, tx: 0, ty: 1.25, tz: .48 }, goal = { ...orbit };
    function applyCamera() { camera.position.set(orbit.tx + Math.sin(orbit.az) * Math.cos(orbit.el) * orbit.radius, orbit.ty + Math.sin(orbit.el) * orbit.radius, orbit.tz + Math.cos(orbit.az) * Math.cos(orbit.el) * orbit.radius); camera.lookAt(orbit.tx, orbit.ty, orbit.tz); }
    function setView(name) {
      viewName = name; const p = data.pose;
      if (name === 'front') goal = { az: 0, el: .03, radius: 5.8, tx: 0, ty: 1.38, tz: .03 };
      else if (name === 'top') goal = { az: .15, el: 1.05, radius: 5.6, tx: 0, ty: .95, tz: .55 };
      else if (name === 'nozzle') goal = { az: 1.35, el: .3, radius: .95, tx: p.x / 1000 - 1.8, ty: p.z / 1000 + BASE + .08, tz: data.params.distance / 1000 + .02 };
      else goal = { az: .48, el: .28, radius: 6.15, tx: 0, ty: 1.25, tz: .48 };
      if (reduced) orbit = { ...goal }; requestRender();
    }
    function paintWall() {
      ctx.clearRect(0, 0, 900, 600); windowCtx.clearRect(0,0,200,200); const coat = data.coat;
      if (coat && coat.cells) {
        const size = coat.cellSize || (coat.cols ? 3600 / coat.cols : 40), px = size / 4, color = new T.Color(data.color || '#258ad4');
        const c0 = '#' + color.getHexString();
        for (const c of coat.cells) {
          const x = (c.x - size / 2) / 4, y = (2400 - c.z - size / 2) / 4;
          if (c.hole) { if (c.n > 0) { windowCtx.fillStyle = data.viewMode === 'inspect' ? 'rgba(232,80,94,.8)' : c0; windowCtx.globalAlpha = .6; windowCtx.fillRect((c.x-size/2-1550)/4,(1600-c.z-size/2)/4,px+.3,px+.3); windowCtx.globalAlpha=1; } continue; }
          if (data.viewMode === 'inspect') { ctx.fillStyle = c.n === 0 ? '#efad57' : c.dose < .85 ? '#efbd6c' : (c.doseIssue || c.dose > 1.2) ? '#a17ac7' : c.repaired ? '#43b59c' : '#4fbaa9'; ctx.globalAlpha = .82; ctx.fillRect(x,y,px+.3,px+.3); ctx.globalAlpha=1; }
          else if (c.n > 0) { ctx.fillStyle = c0; ctx.globalAlpha = .68 + Math.min(.25, c.n * .1); ctx.fillRect(x,y,px+.3,px+.3); ctx.globalAlpha = 1; }
        }
      }
      paintTexture.needsUpdate = true; windowTexture.needsUpdate=true; coatDirty = false; lastPaint = performance.now();
    }
    function updateMachine(now) {
      const p = data.pose || { x: 100, z: 40, on: false }, distance = (data.params.distance || 300) / 1000, nozzleX = p.x / 1000 - 1.8, nozzleY = p.z / 1000 + BASE, carriageY = nozzleY + .24;
      robot.position.x = nozzleX; robot.position.z = distance - .3; carriage.position.y = carriageY; gun.position.z = .309;
      const armEnd = .449; arm.position.z = (.51 + armEnd) / 2; arm.scale.z = (.51 - armEnd) / .4;
      if (Math.abs(hoseY - carriageY) > .025 || hoseD !== .309) { updateHose(carriageY, .309); hoseY = carriageY; hoseD = .309; }
      if (Math.abs(nozzleX - lastPoseX) > .001) { for (const wheel of wheelGroups) wheel.rotation.z -= (nozzleX - lastPoseX) / .13; lastPoseX = nozzleX; }
      const width = (typeof M !== 'undefined' ? M.fanWidth(data.params.distance) : 400 * distance / .3) / 1000;
      footprintPositions.set([nozzleX-width/2,nozzleY-.04,.021,nozzleX+width/2,nozzleY-.04,.021,nozzleX+width/2,nozzleY+.04,.021,nozzleX-width/2,nozzleY+.04,.021]);
      footprintGeometry.attributes.position.needsUpdate = true; footprintGeometry.computeBoundingSphere(); footprint.visible = data.viewMode !== 'inspect';
      const vertex = [nozzleX,nozzleY,distance, nozzleX-width/2,nozzleY-.04,.018, nozzleX+width/2,nozzleY-.04,.018, nozzleX,nozzleY,distance, nozzleX+width/2,nozzleY+.04,.018, nozzleX-width/2,nozzleY+.04,.018]; fanPositions.set(vertex); fanGeometry.attributes.position.needsUpdate = true; fanGeometry.computeBoundingSphere();
      const target = data.running && p.on && !p.travel ? 1 : 0; sprayLevel += (target - sprayLevel) * (reduced ? 1 : .23); fanMaterial.opacity = sprayLevel * .12; particlesM.opacity = sprayLevel * .7;
      fan.visible = particles.visible = sprayLevel > .005;
      if (particles.visible) {
        for (let i=0;i<particleCount;i++) { const t = ((i*.6180339 + now*.0015) % 1); const side = Math.sin(i*14.71)*width*.5*t; particlePositions[i*3] = nozzleX+side; particlePositions[i*3+1]=nozzleY+Math.cos(i*7.27)*.04*t; particlePositions[i*3+2]=distance*(1-t)+.008; }
        particlesG.attributes.position.needsUpdate=true; particlesG.computeBoundingSphere();
      }
      marker.visible = !!data.selectedCell; if (data.selectedCell) marker.position.set(data.selectedCell.x/1000-1.8,data.selectedCell.z/1000+BASE,.05);
      routeGroup.visible = pathVisible && data.viewMode !== 'inspect';
      if (viewName === 'nozzle') { goal.tx = nozzleX; goal.ty = nozzleY+.08; goal.tz = distance+.02; }
    }
    function frame(now) {
      raf=0; if(destroyed || !visible || document.hidden)return;
      const dt=Math.min(.06,(now-lastTime)/1000 || .016); lastTime=now; let easing=false;
      for(const key of Object.keys(orbit)) { const d=goal[key]-orbit[key]; if(Math.abs(d)>.0001){orbit[key]+=d*(1-Math.exp(-dt*10));easing=true;}else orbit[key]=goal[key]; }
      if(dirty || easing || data.running || sprayLevel>.005) {
        applyCamera(); updateMachine(now); if(coatDirty && (now-lastPaint>65 || !data.running))paintWall(); renderer.render(scene,camera); frameCount++; dirty=false;
      }
      if(data.running || easing || sprayLevel>.005 || coatDirty) requestRender();
    }
    function requestRender(){dirty=true;if(!raf && !destroyed && visible && !document.hidden)raf=requestAnimationFrame(frame);}
    function update(next) { const old=data; data={...data,...next,params:{...data.params,...next.params},pose:{...data.pose,...next.pose}}; coatDirty=true; buildRoute(); if(old.color!==data.color){fanMaterial.color.set(data.color);particlesM.color.set(data.color);} requestRender(); }
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(39*Math.PI/360)*Math.max(1,1.45/camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();requestRender();}
    function setTheme(value) { theme=value; const dark=value==='dark'; hemi.intensity=dark?1.6:2.25;sun.intensity=dark?2.5:3.4;renderer.toneMappingExposure=dark?1.05:1.32;requestRender(); }
    const raycaster=new T.Raycaster(); function pick(e){const r=canvas.getBoundingClientRect();raycaster.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObject(selectable)[0];if(hit)callbacks.onWallPick?.({x:clamp((hit.point.x+1.8)*1000,0,3600),z:clamp((hit.point.y-BASE)*1000,0,2400)});}
    const pointers=new Map();let pointerStart=null,pinch=null;
    const down=e=>{canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)pointerStart={x:e.clientX,y:e.clientY,moved:false};if(pointers.size===2){const a=[...pointers.values()];pinch=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pointerStart)pointerStart.moved=true;}};
    const move=e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)pointerStart.moved=true;if(pointers.size===2){const a=[...pointers.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);if(pinch)goal.radius=clamp(goal.radius*pinch/d,.8,11);pinch=d;}else{goal.az-=(e.clientX-prev.x)*.006;goal.el=clamp(goal.el+(e.clientY-prev.y)*.004,.03,1.35);viewName='free';}requestRender();};
    const up=e=>{if(pointers.size===1&&pointerStart&&!pointerStart.moved)pick(e);pointers.delete(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(!pointers.size)pointerStart=null;pinch=null;};
    const wheel=e=>{e.preventDefault();goal.radius=clamp(goal.radius*Math.exp(e.deltaY*.0008),.8,11);requestRender();};
    const key=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')goal.az-=.12;if(e.key==='ArrowRight')goal.az+=.12;if(e.key==='ArrowUp')goal.el=clamp(goal.el+.08,.03,1.35);if(e.key==='ArrowDown')goal.el=clamp(goal.el-.08,.03,1.35);if(e.key==='+'||e.key==='=')goal.radius=clamp(goal.radius*.9,.8,11);if(e.key==='-')goal.radius=clamp(goal.radius/ .9,.8,11);if(e.key==='Home')setView('orbit');requestRender();};
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('keydown',key);
    const contextLost=e=>{e.preventDefault();data.running=false;callbacks.onContextLost?.();const note=document.createElement('div');note.className='webgl-context-notice';note.textContent='三维显示已暂停，请刷新页面恢复。';note.style.cssText='position:absolute;inset:auto 20px 20px;padding:14px;background:#fff5dc;color:#674918;border:1px solid #e8cb8c;border-radius:10px;';host.appendChild(note);};canvas.addEventListener('webglcontextlost',contextLost);
    const ro=new ResizeObserver(resize);ro.observe(host);const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)requestRender();else if(raf){cancelAnimationFrame(raf);raf=0;}},{threshold:.01});io.observe(host);
    const visibility=()=>{if(!document.hidden)requestRender();else if(raf){cancelAnimationFrame(raf);raf=0;}};document.addEventListener('visibilitychange',visibility);
    buildRoute();resize();updateMachine(0);paintWall();applyCamera();requestRender();callbacks.onReady?.({webgl:true});
    return {update,setView,setTheme,setPathVisible(v){pathVisible=!!v;requestRender();},resize,getStats(){return {webgl:true,meshCount:physicalParts.length,renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frameCount,view:viewName,camera:{...orbit,position:camera.position.toArray(),target:[orbit.tx,orbit.ty,orbit.tz]},wallBase:BASE,paintedCells:data.coat?.cells?.filter(c=>c.n>0&&!c.hole).length||0,robotX:robot.position.x,nozzle:{x:data.pose.x,z:data.pose.z,distance:data.params.distance},canvas:{width:canvas.width,height:canvas.height}};},destroy(){destroyed=true;cancelAnimationFrame(raf);ro.disconnect();io.disconnect();document.removeEventListener('visibilitychange',visibility);scene.traverse(disposeObject);Object.values(materials).forEach(m=>m.dispose());paintTexture.dispose();windowTexture.dispose();dotTexture.dispose();labelTexture.dispose();renderer.dispose();canvas.remove();}};
  };
  function createFallback(host,callbacks,initial){
    let data=initial;const wrapper=document.createElement('div');wrapper.className='spray-fallback';wrapper.style.cssText='height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;box-sizing:border-box;';
    const note=document.createElement('p');note.textContent='当前设备无法启用三维，已切换为二维备用视图。仍可规划、喷涂和点选墙面检查。';note.style.cssText='font-size:13px;color:#536b85;max-width:650px;text-align:center;';const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;canvas.style.cssText='display:block;width:min(100%,900px);height:auto;max-height:80%;object-fit:contain;';canvas.tabIndex=0;canvas.setAttribute('aria-label','二维备用墙面图，点击检查作业网格');wrapper.append(note,canvas);host.appendChild(wrapper);const c=canvas.getContext('2d');
    function draw(){c.clearRect(0,0,900,600);c.fillStyle='#f3e6d4';c.fillRect(0,0,900,600);c.fillStyle='#c5e3ec';c.fillRect(387.5,200,200,200);if(data.coat?.cells){const size=data.coat.cellSize||40;for(const cell of data.coat.cells){if(cell.hole&&!cell.n)continue;if(!cell.n&&data.viewMode!=='inspect')continue;c.fillStyle=data.viewMode==='inspect'?(cell.hole?'#e8505e':cell.n===0?'#efad57':cell.dose<.85?'#efbd6c':(cell.doseIssue||cell.dose>1.2)?'#a17ac7':'#4fbaa9'):(data.color||'#258ad4');c.globalAlpha=.8;c.fillRect((cell.x-size/2)/4,(2400-cell.z-size/2)/4,size/4+.2,size/4+.2);c.globalAlpha=1;}}c.strokeStyle='#dfbc4d';c.lineWidth=7;c.strokeRect(387.5,200,200,200);const p=data.pose;c.strokeStyle='#173b67';c.lineWidth=3;c.beginPath();c.arc(p.x/4,(2400-p.z)/4,8,0,Math.PI*2);c.stroke();if(data.selectedCell){c.strokeStyle='#ee813b';c.lineWidth=4;c.beginPath();c.arc(data.selectedCell.x/4,(2400-data.selectedCell.z)/4,15,0,Math.PI*2);c.stroke();}}
    canvas.onclick=e=>{const r=canvas.getBoundingClientRect();const scale=Math.min(r.width/900,r.height/600),w=900*scale,h=600*scale,x=(e.clientX-r.left-(r.width-w)/2)/w*3600,z=2400-(e.clientY-r.top-(r.height-h)/2)/h*2400;if(x>=0&&x<=3600&&z>=0&&z<=2400)callbacks.onWallPick?.({x,z});};draw();callbacks.onReady?.({webgl:false});
    return {update(next){data={...data,...next,params:{...data.params,...next.params},pose:{...data.pose,...next.pose}};draw();},setView(){},setTheme(){},setPathVisible(){},resize:draw,destroy(){wrapper.remove();},getStats(){return {webgl:false,meshCount:0,frameCount:0,paintedCells:data.coat?.cells?.filter(c=>c.n>0&&!c.hole).length||0};}};
  }
})();
