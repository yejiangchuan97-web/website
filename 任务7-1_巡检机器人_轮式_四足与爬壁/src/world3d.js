/* Metre-scaled bridge landscape. Y is up. All textures are generated locally. */
(function () {
  'use strict';
  window.createBridgeWorld = function createBridgeWorld(THREE) {
    const group = new THREE.Group(); group.name = 'qingxi-bridge-world';
    const pickables = [], materialPool = {}, geometryPool = {};
    const state = { roadCleared: false, wallMaterial: 'steel', wet: true };
    let seed = 17631;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    function texture(size, painter, repeat) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
      painter(canvas.getContext('2d'), size);
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
      if (repeat) { map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(...repeat); }
      return map;
    }
    function grain(ctx, n, base, spread, count) {
      ctx.fillStyle = base; ctx.fillRect(0, 0, n, n);
      for (let i = 0; i < count; i++) {
        const tone = Math.floor(random() * spread);
        ctx.fillStyle = `rgba(${tone},${tone},${tone},${.018 + random() * .075})`;
        const s = .5 + random() * 2.2; ctx.fillRect(random() * n, random() * n, s, s);
      }
    }
    const concreteMap = texture(256, (ctx,n) => grain(ctx,n,'#d3d8d5',100,10500), [2,2]);
    const asphaltMap = texture(256, (ctx,n) => {
      grain(ctx,n,'#707b81',240,18000);
      for (let i=0;i<250;i++){ctx.fillStyle='rgba(232,239,241,.13)';ctx.fillRect(random()*n,random()*n,1.5,1.5);}
    }, [12,3]);
    const soilMap = texture(256, (ctx,n) => grain(ctx,n,'#c2b79b',130,9000), [4,4]);
    const steelMap = texture(256, (ctx,n) => {
      ctx.fillStyle='#95adb5';ctx.fillRect(0,0,n,n);
      for(let i=0;i<6500;i++){ctx.fillStyle=`rgba(80,108,116,${.012+random()*.024})`;ctx.fillRect(random()*n,random()*n,.5+random(),.5+random());}
      for(let i=0;i<60;i++){ctx.fillStyle='rgba(233,242,244,.012)';ctx.fillRect(0,random()*n,n,.5);}
    }, [8,1]);
    function mat(key, color, roughness=.75, metalness=0, extra={}) {
      if (!materialPool[key]) materialPool[key] = new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
      return materialPool[key];
    }
    const M = {
      concrete:mat('concrete',0xe3e7e3,.93,0,{map:concreteMap}),paleConcrete:mat('paleConcrete',0xd4ddd8,.95),darkConcrete:mat('darkConcrete',0xb4bfbd,.96),
      asphalt:mat('asphalt',0xe2e5e5,.96,0,{map:asphaltMap}),white:mat('white',0xf7f5e6,.9),
      steel:mat('steel',0xffffff,.56,.32,{map:steelMap}),steelEdge:mat('steelEdge',0x6e8e9c,.52,.4),steelLight:mat('steelLight',0xb4c6cc,.42,.48),bolt:mat('bolt',0x566d78,.47,.57),
      rubber:mat('rubber',0x38494b,.92),rail:mat('rail',0xe2e8e7,.38,.6),drain:mat('drain',0x4c6266,.72,.48),void:mat('void',0x243838,.99),
      soil:mat('soil',0xe7ddc3,.98,0,{map:soilMap}),soilSide:mat('soilSide',0xb9aa8b,.98),path:mat('path',0xd6cdb5,.98),grass:mat('grass',0xa6b495,.97),
      treeLeaf:mat('treeLeaf',0x9eb29a,.93),treeLeafLight:mat('treeLeafLight',0xb6c6a5,.93),trunk:mat('trunk',0x8d8c78,.95),stone:mat('stone',0xafae9e,.97),
      wet:mat('wet',0x627d7b,.2,.1,{transparent:true,opacity:.4,depthWrite:false}),water:mat('water',0x92bac5,.27,.2,{transparent:true,opacity:.83,depthWrite:false}),
      ripple:mat('ripple',0xc5dce1,.5,0,{transparent:true,opacity:.21,depthWrite:false}),debris:mat('debris',0x907b57,.97),leafDebris:mat('leafDebris',0xa59761,.96)
    };
    function add(geometry, material, position, name, parent=group) {
      const mesh = new THREE.Mesh(geometry,material); mesh.position.set(...position);
      mesh.castShadow = true; mesh.receiveShadow = true; if(name)mesh.name=name; parent.add(mesh); return mesh;
    }
    function box(w,h,d,x,y,z, material, name, parent=group) {
      const k=`b:${w}:${h}:${d}`;return add(geometryPool[k]||(geometryPool[k]=new THREE.BoxGeometry(w,h,d)),material,[x,y,z],name,parent);
    }
    function bevel(w,h,d,x,y,z, material, radius=.035, name, parent=group) {
      const k=`v:${w}:${h}:${d}:${radius}`;let geometry=geometryPool[k];
      if(!geometry){
        const r=Math.min(radius,w*.12,h*.12,d*.12), shape=new THREE.Shape();
        shape.moveTo(-w/2+r,-h/2+r);shape.lineTo(w/2-r,-h/2+r);shape.lineTo(w/2-r,h/2-r);shape.lineTo(-w/2+r,h/2-r);shape.closePath();
        geometry=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:1,steps:1,curveSegments:1});
        geometry.translate(0,0,-d/2+r);geometryPool[k]=geometry;
      }
      return add(geometry,material,[x,y,z],name,parent);
    }
    function cylinder(radius,height,x,y,z,material,name,parent=group,radial=12) {
      const k=`c:${radius}:${height}:${radial}`;return add(geometryPool[k]||(geometryPool[k]=new THREE.CylinderGeometry(radius,radius,height,radial)),material,[x,y,z],name,parent);
    }
    function rod(a,b,r,material,name,parent=group,radial=8) {
      const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
      const mesh=cylinder(r,v.length(),0,0,0,material,name,parent,radial);
      mesh.position.copy(p.add(q).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return mesh;
    }
    function surface(w,h,x,y,z,material,name,parent=group) {
      const m=add(new THREE.PlaneGeometry(w,h),material,[x,y,z],name,parent);m.castShadow=false;return m;
    }
    function bolt(x,y,z,face='z',radius=.041,parent=group) {
      const mesh=cylinder(radius,.026,x,y,z,M.bolt,'structural-bolt',parent,6);
      if(face==='z')mesh.rotation.x=Math.PI/2;if(face==='x')mesh.rotation.z=Math.PI/2;return mesh;
    }
    // The entire terrain is one connected site, not isolated task pedestals.
    for(const side of [-1,1]) {
      bevel(16.4,.85,25,side*16.2,-.275,0,M.soil,.32,'riverbank-ground');
      bevel(14.4,.012,23.5,side*16.8,.151,0,M.grass,.005,'grass-covered-bank');
      box(2.3,.055,23.4,side*9.25,.185,0,M.path,'riverside-access-path');
      const slope=box(2.2,.14,24,side*7.7,-.09,0,M.soilSide,'riverbank-slope');slope.rotation.z=-side*.26;
      for(let row=0;row<3;row++) for(let i=0;i<18;i++) {
        const x=side*(7.08+row*.48),z=-11.3+i*1.31+(row%2)*.42;
        const rock=bevel(.44+random()*.23,.19+random()*.1,.86+random()*.38,x,-.21+row*.1,z,M.stone,.07,'stone-bank-revetment');
        rock.rotation.y=(random()-.5)*.32;rock.rotation.z=-side*.2;
      }
      // The near bank has a retaining face so the stair foot at z=5.25 stays on open ground.
      const shape=new THREE.Shape();shape.moveTo(-3.5,4.45);shape.lineTo(3.5,4.45);shape.lineTo(6,.18);shape.lineTo(-3.85,.18);shape.closePath();
      const fill=new THREE.ExtrudeGeometry(shape,{depth:10,steps:1,bevelEnabled:false});fill.rotateY(Math.PI/2);fill.translate(side<0?-24:14,0,0);
      add(fill,M.soil,[0,0,0],'approach-embankment');
      bevel(10,4.2,.22,side*19,2.28,3.78,M.concrete,.04,'approach-retaining-wall');
      for(let i=0;i<4;i++){
        const x=side*(15.25+i*2.5);
        box(.014,4.1,.009,x,2.28,3.895,M.darkConcrete,'retaining-wall-construction-joint');
        const outlet=cylinder(.055,.022,x+.37,.68,3.91,M.void,'retaining-wall-weep-hole',group,12);outlet.rotation.x=Math.PI/2;
        for(const y of [1.45,2.9]){
          const tie=cylinder(.024,.009,x+.56,y,3.902,M.darkConcrete,'retaining-wall-form-tie',group,10);tie.rotation.x=Math.PI/2;
        }
      }
      box(10,.18,7,side*19,4.52,0,M.concrete,'approach-road-base');box(10,.09,6.06,side*19,4.655,0,M.asphalt,'approach-asphalt');
      for(const z of [-2.9,2.9])box(10,.009,.075,side*19,4.704,z,M.white,'approach-edge-line');
      for(let i=0;i<4;i++)box(1.2,.012,.095,side*(14.9+i*2.5),4.707,0,M.white,'approach-center-mark');
    }
    const river=surface(15,25,0,-.17,0,M.water,'river-water');river.rotation.x=-Math.PI/2;river.receiveShadow=false;
    const riverbed=box(15,.1,25,0,-.38,0,M.soilSide,'submerged-riverbed');riverbed.castShadow=false;
    for(let i=0;i<28;i++) {
      const ripple=surface(.2+random()*.85,.025+random()*.035,-6.4+random()*12.8,-.165,-11.9+random()*23.8,M.ripple,'water-ripple');ripple.rotation.x=-Math.PI/2;ripple.rotation.z=.1;
    }
    // The deck top is y=4.70: locomotion and rendering share the same datum.
    bevel(28,.27,7,0,4.475,0,M.concrete,.035,'reinforced-concrete-deck');box(28,.09,6.06,0,4.655,0,M.asphalt,'wearing-course');
    for(const side of [-1,1]) {
      bevel(28,.19,.38,0,4.74,side*3.28,M.paleConcrete,.025,'raised-edge-curb');box(28,.011,.075,0,4.708,side*2.92,M.white,'road-edge-marking');
      for(let i=0;i<=18;i++) {
        const x=-13.7+i*1.52,z=side*3.4;
        bevel(.22,.055,.2,x,4.86,z,M.steelLight,.009,'rail-post-base');box(.07,.96,.07,x,5.36,z,M.rail,'railing-upright');
        for(const dx of [-.068,.068])bolt(x+dx,4.895,z,'y',.025);
      }
      for(const y of [5.12,5.8])rod([-13.9,y,side*3.4],[13.9,y,side*3.4],.045,M.rail,'continuous-bridge-handrail',group,10);
      for(const x of [-10,-2,6]){
        box(.23,.09,.22,x,4.49,side*3.44,M.drain,'scupper-connection');
        rod([x,4.47,side*3.48],[x,3.88,side*3.48],.06,M.drain,'scupper-downpipe');rod([x,3.88,side*3.48],[x,3.67,side*3.67],.06,M.drain,'scupper-elbow');
        for(const y of [4.28,4]){cylinder(.069,.035,x,y,side*3.48,M.steelLight,'pipe-clamp');box(.13,.045,.1,x,y,side*3.39,M.steelLight,'pipe-clamp-anchor');}
      }
    }
    for(let x=-12.6;x<14;x+=2.8)box(1.35,.011,.11,x,4.708,0,M.white,'center-lane-dash');
    for(const x of [-13.87,13.87]){box(.09,.018,6.15,x,4.71,0,M.rubber,'deck-expansion-joint');for(const dx of [-.085,.085])box(.045,.021,6.12,x+dx,4.713,0,M.steelLight,'joint-edge-angle');}
    // Real web/flange/stiffener construction. The crawler's x=3 corridor is clear.
    for(const z of [-2.98,2.98]){
      box(27.6,2.24,.4,0,3.27,z,M.steel,'main-girder-web');
      bevel(27.75,.12,.61,0,4.42,z,M.steelEdge,.014,'top-girder-flange');bevel(27.75,.12,.64,0,2.1,z,M.steelEdge,.014,'bottom-girder-flange');
      for(const x of [-12.3,-9.9,-6.5,-4.4,-1.3,1.3,4.7,7.2,9.9,12.3])box(.075,2.18,.16,x,3.25,z+Math.sign(z)*.23,M.steelEdge,'vertical-web-stiffener');
      for(const x of [-4.8,7.7]){
        const faceZ=z+Math.sign(z)*.197;bevel(.64,1.93,.034,x,3.26,faceZ,M.steelLight,.012,'bolted-girder-splice');
        for(const dx of [-.235,0,.235])for(let k=0;k<7;k++)bolt(x+dx,2.48+k*.255,faceZ+Math.sign(z)*.026,'z',.043);
      }
      for(const x of [-13.2,13.2])box(.22,2.18,.37,x,3.26,z,M.steelEdge,'girder-end-diaphragm');
    }
    for(const x of [-12,-9,-5,0,5,9,12]){
      box(.17,.57,5.7,x,3.65,0,M.steelEdge,'transverse-floorbeam');box(.4,.065,5.72,x,3.98,0,M.steelLight,'crossbeam-top-flange');box(.4,.065,5.72,x,3.34,0,M.steelLight,'crossbeam-bottom-flange');
    }
    for(const x of [-9,9]){
      bevel(2.6,.4,6.8,x,.28,0,M.darkConcrete,.07,'pier-footing');for(const z of [-2.1,2.1])bevel(1.05,1.02,1.15,x,.98,z,M.concrete,.06,'pier-column');
      bevel(1.7,.42,7.15,x,1.64,0,M.concrete,.05,'pier-crosshead');
      for(const z of [-2.98,2.98]){
        bevel(.82,.065,.83,x,1.892,z,M.steelLight,.014,'bearing-bottom-steel-plate');for(let i=0;i<4;i++)box(.65,.026,.66,x,1.935+i*.034,z,i%2?M.steelEdge:M.rubber,'laminated-elastomeric-bearing');bevel(.79,.05,.81,x,2.06,z,M.steelLight,.014,'bearing-upper-steel-plate');
      }
    }
    // Twelve actual treads, sloping stringers and a supported inspection landing.
    for(let i=0;i<12;i++){
      const top=.15+(i+1)*.27,x=-15+(i+.5)*.5;
      bevel(.5,.15,1.9,x,top-.075,5.25,M.concrete,.012,'concrete-stair-tread');box(.035,.035,1.73,x-.215,top+.006,5.25,M.steelLight,'stair-nosing');
    }
    for(const z of [4.43,6.07]) {
      bevel(.38,.12,.3,-14.88,.21,z,M.concrete,.015,'stair-stringer-ground-footing');
      rod([-15,.075,z],[-9.05,3.288,z],.11,M.steelEdge,'stair-stringer',group,4);
      for(let i=0;i<7;i++){const x=-14.82+i*.92,y=.15+(i*.92+.18)/.5*.27;box(.055,.95,.055,x,y+.46,z,M.rail,'stair-railing-post');}
      rod([-15,1.08,z],[-9,4.32,z],.042,M.rail,'stair-sloping-handrail',group,10);rod([-15,.65,z],[-9,3.89,z],.026,M.rail,'stair-lower-rail',group,8);
    }
    bevel(2.05,.17,1.9,-7.975,3.305,5.25,M.concrete,.025,'stair-inspection-landing');
    for(const x of [-8.84,-7.12])for(const z of [4.48,6.02]){
      box(.13,3.08,.13,x,1.69,z,M.steelEdge,'landing-support');bevel(.42,.14,.43,x,.22,z,M.concrete,.025,'landing-post-footing');box(.055,.95,.055,x,3.86,z,M.rail,'landing-rail-post');
    }
    for(const z of [4.43,6.07]){rod([-9,4.32,z],[-7.02,4.32,z],.042,M.rail,'landing-handrail');rod([-9,3.88,z],[-7.02,3.88,z],.026,M.rail,'landing-midrail');}
    rod([-7.02,4.32,4.43],[-7.02,4.32,6.07],.042,M.rail,'landing-end-handrail');rod([-7.02,3.88,4.43],[-7.02,3.88,6.07],.026,M.rail,'landing-end-midrail');rod([-8.84,.4,6.02],[-7.12,3.18,6.02],.045,M.steelEdge,'landing-diagonal-brace');
    // Target B is a sidewall surface, never mislabelled as the lower girder bearing.
    bevel(2.25,4.12,.36,-8.35,2.21,3.34,M.concrete,.045,'inspection-abutment-sidewall');bevel(2.38,.17,.53,-8.35,4.32,3.38,M.paleConcrete,.025,'sidewall-coping');
    for(const y of [1.1,2.3,3.5])box(2.15,.008,.007,-8.35,y,3.525,M.darkConcrete,'concrete-formwork-joint');
    for(const x of [-9,-7.7])for(const y of [1.7,2.9,3.8]){const hole=cylinder(.025,.009,x,y,3.535,M.darkConcrete,'form-tie-mark',group,10);hole.rotation.x=Math.PI/2;}
    const stainMap=texture(512,(ctx,n)=>{
      ctx.clearRect(0,0,n,n);
      // Transparent radial clouds have soft edges at every scale. Overlapping
      // hard ellipses resemble leaves when the actual robot camera gets close.
      const clouds=[
        [.47,.19,.18,.14,.18],[.57,.27,.18,.2,.18],[.4,.31,.17,.22,.18],
        [.48,.46,.22,.25,.16],[.59,.48,.15,.25,.15],[.38,.54,.13,.22,.13],
        [.51,.66,.17,.23,.13],[.61,.65,.09,.18,.1],[.43,.77,.1,.15,.1]
      ];
      for(const [x,y,rx,ry,alpha]of clouds){
        ctx.save();ctx.translate(x*n,y*n);ctx.scale(rx*n,ry*n);
        const fade=ctx.createRadialGradient(0,0,.05,0,0,1);
        fade.addColorStop(0,`rgba(76,89,81,${alpha*1.8})`);fade.addColorStop(.5,`rgba(76,89,81,${alpha*1.17})`);fade.addColorStop(1,'rgba(76,89,81,0)');
        ctx.fillStyle=fade;ctx.fillRect(-1,-1,2,2);ctx.restore();
      }
      for(let i=0;i<5;i++){
        const x=n*(.38+i*.047),start=n*(.19+random()*.14),end=n*(.64+random()*.25);
        const fade=ctx.createLinearGradient(0,start,0,end);fade.addColorStop(0,'rgba(62,78,69,0)');fade.addColorStop(.23,'rgba(62,78,69,.13)');fade.addColorStop(.7,'rgba(62,78,69,.1)');fade.addColorStop(1,'rgba(62,78,69,0)');
        ctx.strokeStyle=fade;ctx.lineWidth=1.5+random()*3;ctx.lineCap='round';ctx.shadowColor='rgba(62,78,69,.08)';ctx.shadowBlur=5;
        ctx.beginPath();ctx.moveTo(x,start);ctx.bezierCurveTo(x+8,start+(end-start)*.3,x-5,start+(end-start)*.6,x-2,end);ctx.stroke();
      }
      ctx.shadowBlur=0;
    });
    const stainMat=mat('water-stain',0xffffff,.92,0,{map:stainMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const stain=surface(1.15,1.18,-8.3,3.65,3.531,stainMat,'visible-surface-water-stain');
    // Drain A contains open slots, a dark sump and actual debris resting on the bars.
    const drainGroup=new THREE.Group();drainGroup.name='A01-drain-assembly';group.add(drainGroup);
    const roadX=-2,roadZ=2.65;
    box(1.15,.018,.57,roadX,4.712,roadZ,M.void,'dark-drain-recess',drainGroup);
    for(const dx of [-.59,.59])box(.065,.052,.65,roadX+dx,4.728,roadZ,M.drain,'grate-end-frame',drainGroup);
    for(const dz of [-.3,.3])box(1.18,.052,.065,roadX,4.728,roadZ+dz,M.drain,'grate-side-frame',drainGroup);
    for(let i=0;i<12;i++)box(.043,.047,.55,roadX-.53+i*.096,4.737,roadZ,M.drain,'open-grate-bar',drainGroup);
    const debris=new THREE.Group();debris.name='removable-drain-debris';group.add(debris);
    for(let i=0;i<26;i++){
      const leaf=add(new THREE.SphereGeometry(.06+random()*.04,5,3),i%3?M.leafDebris:M.debris,[roadX-.55+random()*1.1,4.79+random()*.017,roadZ-.25+random()*.5],'leaf-on-drain',debris);leaf.scale.set(1.2,.1,.43);leaf.rotation.y=random()*Math.PI;
    }
    for(let i=0;i<7;i++)rod([roadX-.5+random()*.4,4.795,roadZ-.25+random()*.5],[roadX+.1+random()*.4,4.805,roadZ-.25+random()*.5],.013,M.debris,'twig-over-grate',debris,5);
    const mudMap=texture(256,(ctx,n)=>{
      ctx.clearRect(0,0,n,n);for(let i=0;i<1000;i++){
        const x=random()*n,y=random()*n,dx=(x-n*.5)/(n*.5),dy=(y-n*.5)/(n*.5);if(dx*dx+dy*dy>random()*.8+.25)continue;
        ctx.fillStyle=`rgba(104,89,61,${.04+random()*.22})`;ctx.fillRect(x,y,2+random()*12,1+random()*8);
      }
    });
    const mud=surface(1.29,.72,roadX,4.786,roadZ,mat('mud',0xffffff,.99,0,{map:mudMap,transparent:true,depthWrite:false}),'mud-around-grate',debris);mud.rotation.x=-Math.PI/2;
    const puddle=add(new THREE.CircleGeometry(1,48),M.wet,[roadX-.03,4.714,roadZ-.38],'shallow-water-around-drain');puddle.rotation.x=-Math.PI/2;puddle.scale.set(1.27,.62,1);puddle.castShadow=false;
    // The thin coating line is printed onto the physical web, not a detached picture.
    const coatingMap=texture(512,(ctx,n)=>{
      ctx.clearRect(0,0,n,n);
      const rust=ctx.createRadialGradient(n*.52,n*.42,2,n*.52,n*.42,n*.35);rust.addColorStop(0,'rgba(143,104,75,.2)');rust.addColorStop(.55,'rgba(147,108,75,.08)');rust.addColorStop(1,'rgba(147,108,75,0)');ctx.fillStyle=rust;ctx.fillRect(0,0,n,n);
      const points=[[.25,.24],[.39,.32],[.46,.37],[.5,.47],[.58,.53],[.6,.62],[.71,.71]];
      ctx.strokeStyle='rgba(119,83,57,.48)';ctx.lineWidth=7;ctx.lineJoin='round';ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*n,y*n):ctx.moveTo(x*n,y*n));ctx.stroke();
      ctx.strokeStyle='rgba(59,62,57,.9)';ctx.lineWidth=2.2;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*n,y*n):ctx.moveTo(x*n,y*n));ctx.stroke();
      ctx.strokeStyle='rgba(103,80,61,.45)';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(n*.5,n*.47);ctx.lineTo(n*.42,n*.51);ctx.lineTo(n*.38,n*.57);ctx.stroke();
    });
    const coatingMaterial=mat('coating-detail',0xffffff,.56,.32,{map:coatingMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
    const wallPatch=surface(.8,.8,3,3.9,3.181,coatingMaterial,'steel-coating-surface-detail');
    const concretePanelMap=texture(512,(ctx,n)=>{
      grain(ctx,n,'#c7ceca',130,14000);ctx.strokeStyle='rgba(73,80,76,.7)';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(n*.24,n*.22);ctx.lineTo(n*.41,n*.36);ctx.lineTo(n*.47,n*.48);ctx.lineTo(n*.57,n*.56);ctx.lineTo(n*.61,n*.69);ctx.stroke();
    });
    const concretePanelMaterial=mat('rough-concrete-panel',0xffffff,.99,0,{map:concretePanelMap});
    const wallTestPanel=box(1.38,2.15,.035,3,3.26,3.185,M.concrete,'alternate-concrete-contact-surface');wallTestPanel.visible=false;
    const leafGeometry=new THREE.IcosahedronGeometry(1,1), rockGeometry=new THREE.DodecahedronGeometry(1,0);
    for(const side of [-1,1])for(let i=0;i<11;i++){
      const x=side*(10.9+random()*11.9),z=(i<6?-1:1)*(7.1+random()*4.2),tall=.8+random()*1.25;
      cylinder(.075,tall,x,.2+tall*.5,z,M.trunk,'riverbank-tree-trunk',group,7);
      for(let j=0;j<3;j++){const crown=add(leafGeometry,j%2?M.treeLeafLight:M.treeLeaf,[x+(j-1)*.29,.28+tall+j*.23,z+(random()-.5)*.3],'riverbank-tree-crown');crown.scale.set(.53+random()*.3,.66+random()*.28,.5+random()*.25);crown.rotation.y=random()*Math.PI;}
    }
    for(let i=0;i<24;i++){
      const side=i%2?-1:1,x=side*(9.7+random()*12),z=(i%3?-1:1)*(7+random()*4.7),r=.12+random()*.2;
      const rock=add(rockGeometry,M.stone,[x,.2+r*.3,z],'small-bank-stone');rock.scale.set(r*1.7,r*.6,r);rock.rotation.set(random(),random(),random());
    }
    for(const [x,y,z,rotation] of [[-2.82,4.77,3.035,-Math.PI/2],[-9.13,3.8,3.537,0],[4.12,3.84,3.189,0]]){
      const plate=surface(.13,.13,x,y,z,M.white,'fixed-point-survey-plate');plate.rotation.x=rotation;
      const mark=surface(.07,.07,x,y+(rotation?.003:0),z+(rotation?0:.003),M.bolt,'survey-plate-center');mark.rotation.x=rotation;
    }
    const targets={
      road:{id:'road',position:[-2,4.80,2.65],normal:[0,1,0],wideCamera:[-5.4,8.4,7.3],detailCamera:[-2.65,6.2,3.5],mesh:drainGroup,radius:.78},
      stairs:{id:'stairs',position:[-8.3,3.85,3.52],normal:[0,0,1],wideCamera:[-11.8,8.4,10.2],detailCamera:[-8.3,4.05,5.6],mesh:stain,radius:.62},
      wall:{id:'wall',position:[3,3.9,3.21],normal:[0,0,1],wideCamera:[6,4.8,10],detailCamera:[3,3.9,5.1],mesh:wallPatch,radius:.48}
    };
    for(const target of Object.values(targets)){
      const hit=add(new THREE.SphereGeometry(target.radius,12,8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),target.position,`hit-${target.id}`);
      hit.castShadow=hit.receiveShadow=false;hit.userData.station=target.id;hit.userData.targetId=target.id;hit.userData.inspectionTarget=target.id;pickables.push(hit);target.hit=hit;
    }
    function setState(next={}){
      for(const key of Object.keys(state))if(next[key]!==undefined)state[key]=next[key];
      debris.visible=!state.roadCleared;puddle.visible=state.wet&&!state.roadCleared;stain.visible=state.wet;
      const concrete=!['steel','magnetic','ferromagnetic'].includes(state.wallMaterial);wallTestPanel.visible=concrete;wallPatch.material=concrete?concretePanelMaterial:coatingMaterial;wallPatch.position.z=concrete?3.207:3.181;
    }
    function stats(){let meshes=0,triangles=0;group.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return {meshes,triangles,materials:Object.keys(materialPool).length,units:'metres',deckTop:4.7,stairRisers:12,stairRise:.27,stairTread:.5};}
    setState();return {group,targets,pickables,setState,stats,materials:M};
  };
})();
