(function(){
  'use strict';
  const T=THREE,M=RobotModel,TM=ToolModel,V=p=>new T.Vector3(...p);
  class WorkshopView extends ToolView{
    foundation(){
      const g=this.group(this.scene);this.bench=g;
      for(const x of [-225,795])for(const y of [-360,360]){this.cyl(g,22,12,[x,y,6],this.mat.rubber);this.cyl(g,23,5,[x,y,14],this.mat.steel);}
      this.box(g,1110,840,23,[285,0,28],this.mat.pale,6);
      this.box(g,1100,830,3,[285,0,41],this.mat.shell,1);
      for(const x of [-240,810])for(const y of [-385,385])this.bolt(g,[x,y,43]);
      for(const y of [-382,382]){this.box(g,950,10,1,[285,y,43.5],this.mat.pale,.2);for(let i=0;i<=47;i++)this.box(g,.8,i%5?4:9,.5,[-185+i*20,y+(i%5?2.5:0),44.2],this.mat.steel,.1);}
      const ground=new T.Mesh(new T.PlaneGeometry(7000,7000),new T.ShadowMaterial({opacity:.10}));ground.receiveShadow=true;this.scene.add(ground);
    }
    constructor(el){
      super(el);
      this.goal={az:-53,el:25,zoom:1};this.view={...this.goal};this.centre.set(285,-30,350);
      this.actual.children[0].material.color.setHex(0x26a58a);
      this.actual.children[0].material.depthWrite=false;
      this.actual.scale.setScalar(1.25);
      this.actual.traverse(o=>o.renderOrder=35);
      this.predicted.traverse(o=>{o.renderOrder=34;if(o.material)o.material.depthWrite=false;});
      this.flangeMarker=this.marker(0x8395a7,4);this.flangeMarker.traverse(o=>o.renderOrder=32);
      this.anchorMarker=this.marker(0x26a58a,12,true);this.anchorMarker.traverse(o=>{o.renderOrder=30;if(o.material){o.material.transparent=true;o.material.opacity=.35;o.material.depthWrite=false;}});
      this.pathsReal.material.color.setHex(0x279f88);this.pathsSet.material.color.setHex(0x8798a9);
      this.pathsReal.renderOrder=this.pathsSet.renderOrder=15;
      this.offsetLine=this.line([[0,0,0],[1,0,0]],0x52b397,.6);this.scene.add(this.offsetLine);
      this.toolAxes=this.group(this.scene);
      for(let i=0;i<3;i++){const a=new T.ArrowHelper(V([i===0?1:0,i===1?1:0,i===2?1:0]),V([0,0,0]),72,[0xd2817f,0x41a286,0x718fbd][i],9,4);a.line.material.depthTest=false;a.cone.material.depthTest=false;a.line.material.depthWrite=false;a.cone.material.depthWrite=false;a.line.renderOrder=a.cone.renderOrder=28;this.toolAxes.add(a);}
      this.actionAmount=0;this.lift=0;this.showAxes=false;this.traceKey='';
      // Two separate material bodies: unattached material never follows the tool.
      this.workpiece.visible=false;
      this.workpiece.geometry.dispose();
      this.workpiece.geometry=new T.BoxGeometry(27,27,27);
      this.suctionPanel=this.box(this.scene,145,76,8,[0,0,0],this.material(0x9eb7c2,.25,.6),2);
      this.suctionPanel.visible=false;
      this.rebar=this.group(this.scene);this.cyl(this.rebar,5,100,[20,0,160],this.mat.steel,'x');this.cyl(this.rebar,5,90,[20,0,170],this.mat.steel,'y');this.rebar.visible=false;
      for(const id of Object.keys(this.tools)){
        const o=this.tools[id];o.effect.visible=false;
        if(id==='drill'){
          // A continuous helix attached to the drill shaft, rather than isolated dots.
          const pts=[];for(let i=0;i<=240;i++){const a=i/240*Math.PI*10;pts.push(V([5.1*Math.cos(a),5.1*Math.sin(a),133+i/240*54]));}
          const spiral=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),200,.75,5,false),this.mat.dark);o.rotor.add(spiral);
        }
        if(id==='gripper')for(let i=0;i<o.fingers.length;i++){const f=o.fingers[i];this.bolt(f,[0,-17,91],'y',1.6);for(let k=0;k<4;k++)this.box(f,1,24,1,[(i? -1:1)*10,0,117+k*2],this.mat.steel,.1);}
      }
      if(this.renderer)this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    }
    events(){
      let drag=null;const el=this.container;
      el.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;this.onInput?.();el.focus({preventScroll:true});drag={x:e.clientX,y:e.clientY,a:this.goal.az,e:this.goal.el};el.setPointerCapture(e.pointerId);});
      el.addEventListener('pointermove',e=>{if(!drag)return;this.goal.az=drag.a-(e.clientX-drag.x)*.35;this.goal.el=Math.max(5,Math.min(89,drag.e+(e.clientY-drag.y)*.25));this.onChange?.();});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(name,()=>drag=null);
      el.addEventListener('wheel',e=>{if(e.target.closest('button'))return;e.preventDefault();this.onInput?.();this.goal.zoom=Math.max(.65,Math.min(2.8,this.goal.zoom*Math.exp(-e.deltaY*.001)));this.onChange?.();},{passive:false});
      el.addEventListener('dblclick',e=>{if(!e.target.closest('button'))this.setView('iso');});
      el.addEventListener('keydown',e=>{if(e.target!==el)return;const a={ArrowLeft:['az',8],ArrowRight:['az',-8],ArrowUp:['el',5],ArrowDown:['el',-5]}[e.key];if(a){e.preventDefault();this.goal[a[0]]+=a[1];this.goal.el=Math.max(5,Math.min(89,this.goal.el));this.onChange?.();}});
    }
    setView(name){const v={iso:[-53,25],front:[-90,8],top:[-90,88]}[name]||[-53,25];Object.assign(this.goal,{az:v[0],el:v[1],zoom:1});$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));this.onChange?.();}
    resizeCamera(dt=.016){
      if(!this.centre)return;const k=1-Math.exp(-12*dt);for(const n of ['az','el','zoom'])this.view[n]+=(this.goal[n]-this.view[n])*k;
      const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight),a=this.view.az*M.D,e=this.view.el*M.D;
      this.camera.position.set(this.centre.x+2400*Math.cos(e)*Math.cos(a),this.centre.y+2400*Math.cos(e)*Math.sin(a),this.centre.z+2400*Math.sin(e));this.camera.lookAt(this.centre);
      const width=(this.closeup?Math.max(355,300*w/h):Math.max(1120,850*w/h))/this.view.zoom;
      Object.assign(this.camera,{left:-width/2,right:width/2,top:width*h/w/2,bottom:-width*h/w/2});this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
    }
    updateLab(s,dt){
      const f=M.fk(s.q,s.tool),pred=TM.predicted(s.q,s.parameter),base=M.fk(M.home,s.tool);
      const focus=this.closeup?M.mul(M.add(f.flange,f.p),.5):[285,-30,350];
      this.centre.lerp(V(focus),s.reduced?1:1-Math.exp(-8*dt));
      this.model.update(s.q,125);this.currentTool=s.tool;
      this.actionAmount+=(Number(s.active)-this.actionAmount)*(s.reduced?1:1-Math.exp(-12*dt));
      for(const[id,o]of Object.entries(this.tools)){
        o.g.visible=id===s.tool;if(!o.g.visible)continue;
        const lift=s.reduced?0:Math.max(0,s.swapLift||0);
        o.g.position.set(...M.add(f.flange,M.mv(f.R,[0,0,lift])));o.g.quaternion.setFromRotationMatrix(this.matrix(f.R));
        o.fingers.forEach((g,i)=>g.position.x=(i?1:-1)*(39-15*this.actionAmount));
        if(o.rotor&&s.active&&!s.reduced)o.rotor.rotation.z+=dt*(id==='drill'?11:6);
        o.effect.visible=id==='nozzle'&&this.actionAmount>.01;
        if(o.effect.visible)o.effect.children.forEach((dot,i)=>{const z=170+((s.time*55+i*7)%70),a=i*2.4,r=(z-170)*.16;dot.position.set(45+r*Math.cos(a),r*Math.sin(a),z);dot.material.opacity=.55*this.actionAmount*Math.sin((z-170)/70*Math.PI);});
      }
      this.actual.position.set(...f.p);this.predicted.position.set(...pred);this.predicted.visible=M.norm(M.sub(f.p,pred))>.4;
      this.actual.visible=!(s.swapLift>1);this.flangeMarker.position.set(...f.flange);
      this.anchorMarker.position.set(...base.p);this.anchorMarker.visible=s.tab==='pivot';
      this.toolAxes.position.set(...f.p);this.toolAxes.quaternion.setFromRotationMatrix(this.matrix(f.R));this.toolAxes.visible=this.showAxes;
      this.axesReal.visible=this.axesSet.visible=false;
      this.pin.visible=s.tab==='calibrate';this.pin.position.set(...s.pin);this.fixtureBase.visible=this.fixturePole.visible=this.pin.visible;
      this.fixtureBase.position.set(s.pin[0],s.pin[1],47);const ph=Math.max(1,s.pin[2]-106-51);this.fixturePole.position.set(s.pin[0],s.pin[1],51+ph/2);this.fixturePole.scale.y=ph;
      const attached=s.contact&&s.active,contactPoint=attached?f.p:base.p,R=attached?f.R:base.R;
      this.workpiece.visible=s.contact&&s.tool==='gripper';this.suctionPanel.visible=s.contact&&s.tool==='vacuum';this.rebar.visible=s.contact&&s.tool==='tie';
      if(this.workpiece.visible){this.workpiece.position.set(...contactPoint);this.workpiece.quaternion.setFromRotationMatrix(this.matrix(R));}
      if(this.suctionPanel.visible){this.suctionPanel.position.set(...M.add(contactPoint,M.mv(R,[0,0,4])));this.suctionPanel.quaternion.setFromRotationMatrix(this.matrix(R));}
      if(this.rebar.visible){this.rebar.position.set(...f.flange);this.rebar.quaternion.setFromRotationMatrix(this.matrix(f.R));}
      this.pathsReal.visible=this.pathsSet.visible=s.tab==='pivot';
      if(s.tab==='pivot'){
        if(!this.traces[0].length||M.norm(M.sub(f.p,this.traces[0].at(-1)))>.5||M.norm(M.sub(f.flange,this.traces[1].at(-1)))>.5)this.setTrace(f.p,f.flange);
      }
      const pos=this.offsetLine.geometry.attributes.position;[f.flange,f.p].forEach((p,i)=>pos.setXYZ(i,...p));pos.needsUpdate=true;this.offsetLine.geometry.computeBoundingSphere();this.offsetLine.visible=this.closeup||s.tab==='pivot';
      this.resizeCamera(s.reduced?1:dt);this.scene.updateMatrixWorld(true);
      if(this.renderer)this.renderer.render(this.scene,this.camera);else{const signature=JSON.stringify([s.q,s.tool,s.tab,s.active,s.contact,this.view,this.closeup]);if(signature!==this.lastFallback){this.staticFallback();this.lastFallback=signature;}}
      this.overlayLab(f,pred,s);
      return f;
    }
    overlayLab(f,pred,s){
      const w=this.container.clientWidth,h=this.container.clientHeight;
      const tag=(p,label,color,dx=12,dy=-12)=>{const xy=this.project(p),width=Math.min(110,label.length*10);const x=Math.max(5,Math.min(w-width,xy[0]+dx)),y=Math.max(42,Math.min(h-65,xy[1]+dy));return `<text x="${x}" y="${y}" fill="${color}">${label}</text>`;};
      let content=tag(f.p,'TCP · 工作点','#279a82',12,-14);
      if(this.closeup||s.tab==='pivot')content+=tag(f.flange,'法兰原点','#8294a5',-57,-22);
      if(M.norm(M.sub(pred,f.p))>1)content+=tag(pred,'所选 TCP','#b8813f',12,21);
      if(this.pin.visible)content+=tag(s.pin,'同一固定点','#8294a5',12,34);
      if(this.showAxes)for(let i=0;i<3;i++)content+=tag(M.add(f.p,M.mv(f.R,M.mul([[1,0,0],[0,1,0],[0,0,1]][i],78))),['X','Y','Z'][i],['#c77e7d','#42a78b','#7897c3'][i],0,0);
      $('#overlay').innerHTML=content;
    }
    makeThumbnails(){
      const images={};const cam=new T.OrthographicCamera(-125,125,125,-125,1,1500);cam.up.set(0,0,1);cam.position.set(290,-440,115);cam.lookAt(0,0,-90);cam.updateMatrixWorld();
      for(const[id,o]of Object.entries(this.tools)){
        const scene=new T.Scene(),g=o.g.clone();g.visible=true;g.position.set(0,0,0);g.rotation.set(Math.PI,0,-.18);g.quaternion.setFromEuler(g.rotation);scene.add(g);
        scene.add(new T.HemisphereLight(0xffffff,0x4d6472,2.7));const lamp=new T.DirectionalLight(0xffffff,3.4);lamp.position.set(120,-300,400);scene.add(lamp);
        for(const f of g.children)if(f.type==='Group'&&f.children.length===40)f.visible=false;
        if(id==='gripper')g.children.filter(c=>c.type==='Group'&&c.children.length>1&&c.children.length<25).slice(0,2).forEach((f,i)=>f.position.x=(i?1:-1)*32);
        if(this.renderer){const r=this.renderer;r.setSize(220,220,false);r.render(scene,cam);images[id]=r.domElement.toDataURL('image/png');}
        else images[id]=this.cpuThumbnail(scene,cam);
      }
      this.resize();return images;
    }
    cpuThumbnail(scene,cam){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=180;const ctx=canvas.getContext('2d'),faces=[],light=V([-.3,-.6,1]).normalize();scene.updateMatrixWorld(true);
      scene.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry.attributes.position||mesh.material.transparent)return;for(let o=mesh;o;o=o.parent)if(!o.visible)return;const attr=mesh.geometry.attributes.position,ix=mesh.geometry.index;
        for(let i=0;i<(ix?ix.count:attr.count);i+=3){const p=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(attr,ix?ix.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));const normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).normalize(),c=p[0].clone().add(p[1]).add(p[2]).multiplyScalar(1/3);if(normal.dot(cam.position.clone().sub(c))<0)continue;const color=mesh.material.color.clone().multiplyScalar(.65+.35*Math.max(0,normal.dot(light))).getStyle();faces.push({z:c.clone().applyMatrix4(cam.matrixWorldInverse).z,points:p.map(v=>v.project(cam)),color});}
      });faces.sort((a,b)=>a.z-b.z);for(const f of faces){ctx.fillStyle=f.color;ctx.beginPath();f.points.forEach((p,i)=>ctx[i?'lineTo':'moveTo']((p.x+1)*90,(1-p.y)*90));ctx.closePath();ctx.fill();}return canvas.toDataURL();
    }
    settled(){return ['az','el','zoom'].every(k=>Math.abs(this.goal[k]-this.view[k])<.002);}
  }
  window.WorkshopView=WorkshopView;
})();
