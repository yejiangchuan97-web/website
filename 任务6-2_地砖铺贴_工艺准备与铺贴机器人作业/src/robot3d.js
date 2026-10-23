/* Tiling Hero: metres, y-up. The suction lips share the tile's actual pose.
 * Illustrative generic mechanism; no product-specific machine settings. */
(() => {
  'use strict';
  window.createTilingRobot = function (T) {
    const group = new T.Group(); group.name = 'tiling-robot';
    const parts = [], geometries = new Set(), materials = new Set(), textures = new Set(), assemblies = {};
    const mats = {}, palette = {blue:[0x246fc5,.36,.32],lightblue:[0x70a9dc,.28,.38],navy:[0x193d59,.35,.43],white:[0xf1f5f4,.18,.37],silver:[0xc9d6df,.78,.28],steel:[0x7891a3,.72,.34],rubber:[0x273941,.02,.85],brass:[0xb5a276,.65,.4],red:[0xde6454,.08,.5],green:[0x32af93,.16,.4],amber:[0xe3a24e,.1,.48]};
    for(const [n,[color,metalness,roughness]] of Object.entries(palette)){mats[n]=new T.MeshStandardMaterial({color,metalness,roughness});materials.add(mats[n]);}
    const screenMat=new T.MeshStandardMaterial({color:0x133e54,emissive:0x1d7384,emissiveIntensity:.22,roughness:.25});materials.add(screenMat);
    const glassMat=new T.MeshStandardMaterial({color:0xc8e0e9,transparent:true,opacity:.42,roughness:.18,metalness:.05,depthWrite:false});materials.add(glassMat);
    const addGroup=(n,p=group)=>{const g=new T.Group();g.name=n;p.add(g);return g;};
    function mesh(n,geo,mat,p,at=[0,0,0]){const o=new T.Mesh(geo,typeof mat==='string'?mats[mat]:mat);o.name=n;o.position.set(...at);o.castShadow=o.receiveShadow=true;p.add(o);parts.push(o);geometries.add(geo);const a=p.name;assemblies[a]=(assemblies[a]||0)+1;o.userData.part=n;return o;}
    function box(n,w,h,d,x,y,z,mat,p){return mesh(n,new T.BoxGeometry(w,h,d),mat,p,[x,y,z]);}
    function rounded(n,w,h,d,x,y,z,mat,p,r=.016){r=Math.min(r,w/4,h/4,d/4);const s=new T.Shape(),l=-w/2,b=-h/2;s.moveTo(l+r,b);s.lineTo(l+w-r,b);s.quadraticCurveTo(l+w,b,l+w,b+r);s.lineTo(l+w,b+h-r);s.quadraticCurveTo(l+w,b+h,l+w-r,b+h);s.lineTo(l+r,b+h);s.quadraticCurveTo(l,b+h,l,b+h-r);s.lineTo(l,b+r);s.quadraticCurveTo(l,b,l+r,b);const geo=new T.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:4,curveSegments:7,steps:1});geo.translate(0,0,-d/2+r);return mesh(n,geo,mat,p,[x,y,z]);}
    function cyl(n,r,len,x,y,z,mat,p,axis='y',rt=r){const o=mesh(n,new T.CylinderGeometry(rt,r,len,32),mat,p,[x,y,z]);if(axis==='x')o.rotation.z=Math.PI/2;if(axis==='z')o.rotation.x=Math.PI/2;return o;}
    function ring(n,r,t,x,y,z,mat,p,axis='y'){const o=mesh(n,new T.TorusGeometry(r,t,8,40),mat,p,[x,y,z]);if(axis==='y')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.y=Math.PI/2;return o;}
    const bolt=(n,x,y,z,p,axis='y')=>cyl(n,.007,.005,x,y,z,'steel',p,axis);
    function pipe(n,points,r,mat,p,count=40){return mesh(n,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(v=>Array.isArray(v)?new T.Vector3(...v):v.clone()),false,'centripetal'),count,r,8,false),mat,p);}
    const base=addGroup('mobile-chassis');base.position.set(-1,0,.5);
    rounded('load-bearing-belly',.76,.10,.78,0,.18,0,'navy',base,.025);
    rounded('replaceable-bumper',.84,.075,.86,0,.24,0,'rubber',base,.025);
    rounded('drive-shell',.80,.20,.82,0,.355,0,'blue',base,.045);
    rounded('service-top-deck',.77,.035,.79,0,.472,0,'white',base,.010);
    for(const x of [-.414,.414])for(const z of [-.265,.265]){const w=addGroup('drive-wheel',base);w.position.set(x,.145,z);cyl('tread',.14,.09,0,0,0,'rubber',w,'x');cyl('alloy-hub',.092,.096,0,0,0,'silver',w,'x');cyl('hub-inset',.063,.103,0,0,0,'blue',w,'x');cyl('axle-cap',.028,.11,0,0,0,'steel',w,'x');}
    for(const x of [-.32,.32])for(const z of [-.31,.31])bolt('deck-fastener',x,.493,z,base);
    rounded('distance-sensor-recess',.26,.05,.012,0,.355,.415,'navy',base,.007);
    rounded('distance-sensor-window',.11,.028,.008,0,.355,.424,screenMat,base,.004);
    rounded('service-hatch',.42,.115,.012,0,.355,-.417,'navy',base,.01);
    for(let i=0;i<5;i++)rounded('cooling-slot',.044,.008,.006,-.13+i*.065,.354,-.426,'steel',base,.002);
    cyl('lidar-pedestal',.064,.018,.27,.509,.24,'steel',base);cyl('lidar-window',.058,.038,.27,.536,.24,screenMat,base);cyl('lidar-cap',.061,.016,.27,.563,.24,'white',base);
    const controls=addGroup('operator-console',base);controls.position.set(-.22,.525,.25);controls.rotation.x=-.4;
    rounded('console-shell',.25,.12,.06,0,0,0,'white',controls,.015);rounded('screen-bezel',.145,.07,.008,-.025,.008,.035,'navy',controls,.005);rounded('screen-glass',.124,.05,.004,-.025,.008,.041,screenMat,controls,.003);
    cyl('estop-yellow-seat',.023,.007,.091,.015,.035,'amber',controls,'z');cyl('emergency-stop',.018,.021,.091,.015,.049,'red',controls,'z');
    const led=cyl('vacuum-ready-led',.006,.005,-.075,-.039,.036,'green',controls,'z');cyl('key-switch',.009,.006,.084,-.035,.036,'steel',controls,'z');
    const labelC=document.createElement('canvas');labelC.width=320;labelC.height=80;const lc=labelC.getContext('2d');lc.fillStyle='#eef3f4';lc.fillRect(0,0,320,80);lc.fillStyle='#285c89';lc.font='600 37px sans-serif';lc.fillText('TILE · 06',23,53);const lt=new T.CanvasTexture(labelC);lt.colorSpace=T.SRGBColorSpace;textures.add(lt);const lm=new T.MeshStandardMaterial({map:lt,roughness:.6});materials.add(lm);box('machine-nameplate',.225,.056,.003,-.14,.36,.426,lm,base);
    const vac=addGroup('vacuum-source',base);vac.position.set(.22,0,-.20);
    rounded('pump-mount',.24,.028,.26,0,.508,0,'navy',vac,.007);cyl('vacuum-pump-body',.065,.18,0,.585,0,'silver',vac,'z');cyl('pump-motor-cap',.067,.04,0,.585,-.108,'blue',vac,'z');cyl('exhaust-silencer',.014,.067,.071,.595,-.08,'brass',vac,'x');
    cyl('reservoir-body',.054,.19,0,.735,0,'white',vac);cyl('reservoir-lower-seat',.058,.016,0,.633,0,'steel',vac);cyl('reservoir-upper-cap',.058,.018,0,.838,0,'blue',vac);
    for(const x of [-.047,.047])box('tank-support-leg',.014,.045,.022,x,.626,0,'steel',vac);
    cyl('filter-bowl',.033,.085,.09,.743,0,glassMat,vac);cyl('filter-element',.017,.06,.09,.744,0,'white',vac);cyl('filter-lid',.038,.024,.09,.798,0,'navy',vac);cyl('filter-hose-union',.011,.03,.108,.806,0,'brass',vac,'x');
    cyl('vacuum-gauge-body',.036,.023,0,.825,.055,'steel',vac,'z');cyl('vacuum-gauge-face',.031,.003,0,.825,.069,'white',vac,'z');
    const needle=box('vacuum-gauge-needle',.003,.025,.003,0,.836,.073,'navy',vac);needle.geometry.translate(0,-.011,0);needle.position.y=.825;
    for(let i=0;i<9;i++){const a=-Math.PI*.75+i*Math.PI*1.5/8;const tick=box('gauge-scale',.0015,.005,.002,Math.sin(a)*.024,.825+Math.cos(a)*.024,.072,'steel',vac);tick.rotation.z=-a;}
    pipe('pump-reservoir-pipe',[[.04,.61,.06],[.07,.63,.08],[.07,.68,.07],[.04,.7,.045]],.008,'rubber',vac,18);
    const turret=addGroup('shoulder-pedestal',base);cyl('rotary-seat',.17,.025,-.10,.512,-.02,'silver',turret);cyl('rotary-bearing',.146,.05,-.10,.55,-.02,'navy',turret);rounded('shoulder-cast-pedestal',.265,.20,.25,-.10,.663,-.02,'white',turret,.035);
    const arm=addGroup('articulated-arm'),upper=addGroup('upper-arm',arm),lower=addGroup('forearm',arm);
    const lengths=[.98,.92];
    function link(p,len,w,d){rounded('cast-link',w,len-.10,d,0,len/2,0,'blue',p,.036);rounded('white-link-cover',w*.69,len-.22,.022,0,len/2,d/2+.004,'white',p,.01);rounded('cover-seam',w*.7,.007,.004,0,len*.65,d/2+.017,'lightblue',p,.002);for(const y of [len*.21,len*.79])bolt('cover-bolt',0,y,d/2+.02,p,'z');}
    link(upper,lengths[0],.195,.18);link(lower,lengths[1],.15,.145);
    const shoulder=addGroup('shoulder-joint',arm),elbow=addGroup('elbow-joint',arm),wrist=addGroup('wrist-joint',arm);
    function joint(p,r,w){cyl('joint-bearing',r,w,0,0,0,'navy',p,'x');cyl('bearing-ring',r*.84,w+.008,0,0,0,'silver',p,'x');cyl('joint-cover',r*.67,w+.014,0,0,0,'white',p,'x');cyl('axis-cap',r*.28,w+.019,0,0,0,'blue',p,'x');}
    joint(shoulder,.12,.24);joint(elbow,.102,.21);joint(wrist,.073,.165);
    const head=addGroup('vacuum-head');head.rotation.order='YXZ';
    const slide=addGroup('force-compliance',head),plate=addGroup('cup-mounting-frame',head),sensor=addGroup('force-sensor',head),cups=addGroup('cup-layouts',head);
    rounded('load-spreader-plate',.27,.022,.23,0,.106,0,'white',plate,.007);
    const crossbars=[rounded('adjustable-crossbar-x-a',.51,.022,.043,0,.084,0,'silver',plate,.006),rounded('adjustable-crossbar-z',.043,.02,.51,0,.063,0,'silver',plate,.005),rounded('adjustable-crossbar-x-b',.51,.022,.043,0,.084,0,'silver',plate,.006)];
    cyl('central-frame-mount',.038,.022,0,.084,0,'steel',plate);
    cyl('quick-change-flange',.071,.022,0,.247,0,'silver',sensor);cyl('six-axis-force-cell',.061,.04,0,.216,0,'blue',sensor);cyl('force-cell-bottom-ring',.068,.012,0,.19,0,'steel',sensor);cyl('sensor-port',.008,.022,.069,.215,0,'brass',sensor,'x');
    for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;bolt('wrist-flange-fastener',Math.cos(a)*.052,.261,Math.sin(a)*.052,sensor);}
    const guides=[];for(const x of [-.089,.089]){guides.push(cyl('linear-guide-rod',.008,.11,x,.161,0,'silver',slide));cyl('guide-bushing',.014,.029,x,.184,0,'brass',sensor);}
    rounded('sensor-guide-yoke',.22,.018,.06,0,.188,0,'silver',sensor,.004);
    const springPts=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*16;springPts.push([Math.cos(a)*.027,.119+i/120*.06,Math.sin(a)*.027]);}const spring=pipe('compliant-helical-spring',springPts,.003,'steel',slide,144);
    rounded('vacuum-distribution-block',.135,.037,.05,0,.135,-.071,'navy',plate,.005);
    const valveLeds=[];for(let i=0;i<4;i++){const x=-.049+i*.0325;cyl('check-valve-body',.009,.025,x,.135,-.108,'brass',plate,'z');valveLeds.push(cyl('branch-status',.005,.003,x,.157,-.071,'green',plate));}
    const layouts={};const branchPipes=[];
    function cupSet(name,n,r){const g=addGroup('layout-'+name,cups),list=[];for(let i=0;i<n;i++){const c=addGroup(name+'-cup-'+i,g);c.userData.pick='cup';c.userData.index=i;
      // Closed annular profiles leave a real evacuated cavity underneath the
      // rubber cup. The seal is a thin lip, never a solid metal suction disc.
      const body=mesh('bellows-cup-body',new T.LatheGeometry([[r*.91,.006],[r*.68,.012],[r*.32,.030],[r*.18,.030],[r*.18,.026],[r*.52,.012],[r*.78,.006],[r*.91,.006]].map(v=>new T.Vector2(...v)),48),'rubber',c);
      const lip=mesh('sealing-lip',new T.LatheGeometry([[r*.85,0],[r,0],[r,.002],[r*.91,.006],[r*.78,.006],[r*.85,0]].map(v=>new T.Vector2(...v)),48),'rubber',c);
      ring('lip-reinforcement',r*.88,.0015,0,.006,0,'rubber',c);cyl('cup-piston-stem',.008,.036,0,.048,0,'silver',c);cyl('spring-compensation-collar',.014,.015,0,.055,0,'brass',c);cyl('cup-stem-nut',.016,.009,0,.07,0,'steel',c);cyl('vacuum-port-fitting',.007,.018,.014,.059,0,'brass',c,'x');list.push({g:c,body,lip,r});}layouts[name]={g,list};}
    cupSet('single',1,.08);cupSet('dual',2,.08/Math.sqrt(2));cupSet('quad',4,.04);
    rounded('camera-outrigger-bracket',.105,.016,.09,.166,.125,-.132,'silver',plate,.003);
    for(const [x,z] of [[.121,-.102],[.192,-.15]])bolt('camera-bracket-fastener',x,.136,z,plate);
    const camera=addGroup('vision-camera',plate);camera.position.set(.19,.19,-.16);camera.rotation.x=-.10;
    rounded('camera-support',.022,.075,.025,0,-.02,0,'silver',camera,.003);rounded('camera-housing',.064,.046,.065,0,0,0,'white',camera,.007);cyl('camera-lens-bezel',.023,.016,0,-.031,0,'navy',camera);cyl('camera-lens-glass',.017,.003,0,-.04,0,screenMat,camera);cyl('camera-led',.003,.002,.022,-.024,.02,'green',camera);
    const blocker=addGroup('camera-occluder',camera);rounded('opaque-occlusion-tab',.069,.006,.071,0,-.052,0,'amber',blocker,.002);box('occlusion-tab-handle',.012,.012,.055,0,-.052,.053,'steel',blocker);blocker.visible=false;
    const hoseClamp=ring('elbow-hose-retaining-clamp',.012,.003,0,0,0,'steel',arm,'z'),clampStand=cyl('hose-clamp-standoff',.006,.055,0,0,0,'silver',arm);
    let hose=null,hoseCurve=null,hoseStamp='',current={},lastLayout='',lastSpread=0,lastExplosion=-1,hoseAudit={},explosion=0;
    const shoulderP=new T.Vector3(),elbowP=new T.Vector3(),wristP=new T.Vector3();
    function placeLink(obj,a,b,axis){const y=b.clone().sub(a).normalize(),z=axis.clone().cross(y).normalize();obj.position.copy(a);obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(axis,y,z));}
    function update(p={}){
      const tile={x:.6,z:.35,y:.15,yaw:0,tilt:0,...p.tile},layout=layouts[p.layout]?p.layout:'quad',spread=Math.max(.15,Math.min(.9,p.spread??.6));
      const yaw=tile.yaw*Math.PI/180,tilt=(Number.isFinite(p.toolTilt)?p.toolTilt:tile.tilt||0)*Math.PI/180,offset=new T.Vector3((p.offsetX||0)/1000,0,(p.offsetY||0)/1000);
      const q=new T.Quaternion().setFromEuler(new T.Euler(0,yaw,tilt,'YXZ'));offset.applyQuaternion(q);
      const lift=Number.isFinite(p.toolLift)?Math.max(0,Math.min(.4,p.toolLift)):(p.attached===false?.18:0);
      head.position.set(tile.x+offset.x,tile.y+offset.y+lift,tile.z+offset.z);head.quaternion.copy(q);
      explosion=p.exploded?1:0;plate.position.y=explosion*.055; sensor.position.y=explosion*.14;
      const deflection=Math.max(0,Math.min(320,p.force||0))*.000035;sensor.position.y-=deflection;spring.scale.y=(.06-deflection+explosion*.14)/.06;spring.position.y=.119*(1-spring.scale.y);
      const positions=layout==='single'?[[0,0]]:layout==='dual'?[[-.3*spread,0],[.3*spread,0]]:[[-.3*spread,-.3*spread],[.3*spread,-.3*spread],[-.3*spread,.3*spread],[.3*spread,.3*spread]];
      for(const [key,l] of Object.entries(layouts))l.g.visible=key===layout;
      positions.forEach(([x,z],i)=>{const c=layouts[layout].list[i];c.g.position.set(x,0,z);const failed=!!p.failed&&i===positions.length-1;c.lip.material=failed?mats.red:mats.rubber;c.body.material=failed?mats.red:mats.rubber;});
      crossbars[0].scale.x=layout==='single'?.50:Math.max(.42,spread/.6);crossbars[0].position.z=layout==='quad'?-.3*spread:0;crossbars[1].scale.z=layout==='quad'?Math.max(.42,spread/.6):.44;crossbars[2].visible=layout==='quad';crossbars[2].scale.x=crossbars[0].scale.x;crossbars[2].position.z=.3*spread;
      valveLeds.forEach((l,i)=>{l.visible=i<positions.length;l.material=p.failed&&i===positions.length-1?mats.red:p.isolated?mats.green:mats.steel;});
      if(layout!==lastLayout||Math.abs(spread-lastSpread)>.0005||explosion!==lastExplosion){for(const b of branchPipes){const assembly=b.parent?.name;if(assembly&&assemblies[assembly]>0)assemblies[assembly]--;b.removeFromParent();geometries.delete(b.geometry);b.geometry.dispose();const ix=parts.indexOf(b);if(ix>=0)parts.splice(ix,1);}branchPipes.length=0;positions.forEach(([x,z],i)=>{const sx=-.049+i*.0325,raise=explosion*.055,safeZ=z>0?Math.max(z+.045,.145):Math.min(z-.045,-.145);branchPipes.push(pipe('cup-branch-hose',[[sx,.135+raise,-.121],[sx,.175+raise,-.15],[x+.036,.16+raise*.5,safeZ],[x+.036,.065,safeZ],[x+.034,.058,z+(safeZ>0?.035:-.035)],[x+.023,.059,z]],.0045,'rubber',head,32));});lastLayout=layout;lastSpread=spread;lastExplosion=explosion;}
      blocker.visible=p.visibility!=='clear';blocker.position.x=p.visibility==='partial'?.034:0;
      needle.rotation.z=(.75-(Math.max(0,p.pressure??p.vacuum??0)/80)*1.5)*Math.PI;
      led.material=p.gripReady?mats.green:mats.amber;
      for(const part of [upper,lower,shoulder,elbow])part.visible=!p.inspection;
      group.updateMatrixWorld(true);shoulderP.set(-1.10,.76,.48);wristP.copy(head.localToWorld(new T.Vector3(0,.268+sensor.position.y,0)));
      const delta=wristP.clone().sub(shoulderP),rawDistance=delta.length(),d=Math.max(.08,Math.min(lengths[0]+lengths[1]-.00001,rawDistance)),u=delta.normalize(),pref=new T.Vector3(-.10,1,0);const bend=pref.addScaledVector(u,-pref.dot(u)).normalize();const a=(lengths[0]**2-lengths[1]**2+d*d)/(2*d),h=Math.sqrt(Math.max(0,lengths[0]**2-a*a));elbowP.copy(shoulderP).addScaledVector(u,a).addScaledVector(bend,h);const axis=new T.Vector3().crossVectors(u,bend).normalize();
      placeLink(upper,shoulderP,elbowP,axis);placeLink(lower,elbowP,wristP,axis);for(const [obj,at] of [[shoulder,shoulderP],[elbow,elbowP],[wrist,wristP]]){obj.position.copy(at);obj.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),axis);}
      const start=new T.Vector3(-.657,.806,.30),end=head.localToWorld(new T.Vector3(-.066,.135+plate.position.y,-.071));
      const stamp=[...head.position.toArray(),yaw,tilt,explosion,deflection].map(v=>Math.round(v*1000)).join(',');
      if(stamp!==hoseStamp){hoseStamp=stamp;const pts=[start,start.clone().add(new T.Vector3(.09,.02,-.03)),shoulderP.clone().addScaledVector(axis,.20).add(new T.Vector3(0,.09,-.04)),elbowP.clone().addScaledVector(axis,.18),wristP.clone().addScaledVector(axis,.14).add(new T.Vector3(0,.08,0)),end.clone().add(new T.Vector3(-.10,.10,0)),end.clone().add(new T.Vector3(-.025,0,0)),end];const curve=new T.CatmullRomCurve3(pts,false,'centripetal');hoseCurve=curve;if(!hose)hose=mesh('continuous-vacuum-supply-hose',new T.TubeGeometry(curve,80,.009,9,false),'rubber',group);else{geometries.delete(hose.geometry);hose.geometry.dispose();hose.geometry=new T.TubeGeometry(curve,80,.009,9,false);geometries.add(hose.geometry);}hoseAudit={start:start.toArray(),end:end.toArray(),portEnd:head.localToWorld(new T.Vector3(-.066,.135+plate.position.y,-.071)).toArray(),rebuilds:(hoseAudit.rebuilds||0)+1};}
      hoseClamp.position.copy(elbowP).addScaledVector(axis,.18);hoseClamp.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),hoseCurve.getTangent(3/7));clampStand.position.copy(elbowP).addScaledVector(axis,.142);clampStand.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);hoseClamp.visible=clampStand.visible=!p.inspection;
      if(hose)hose.visible=!p.inspection;
      group.updateMatrixWorld(true);current={tile:{...tile},layout,spread,force:p.force||0,deflection,shoulder:shoulderP.toArray(),elbow:elbowP.toArray(),wrist:wristP.toArray(),reach:rawDistance,reachLimit:lengths[0]+lengths[1],upperLength:shoulderP.distanceTo(elbowP),lowerLength:elbowP.distanceTo(wristP),cupContacts:positions.map(([x,z])=>head.localToWorld(new T.Vector3(x,0,z)).toArray()),head:head.position.toArray(),exploded:!!p.exploded,inspection:!!p.inspection};
    }
    update({visibility:'clear'});
    return {group,head,parts,update,getStats:()=>({meshes:parts.length,assemblies:{...assemblies},pose:{...current},jointErrors:{upper:Math.abs(current.upperLength-lengths[0]),lower:Math.abs(current.lowerLength-lengths[1])},hose:{...hoseAudit}}),destroy(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}};
  };
})();
