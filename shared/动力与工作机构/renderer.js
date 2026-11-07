/* Optional Canvas 2D projection of the same articulated scene when WebGL is unavailable.
 * Component silhouettes preserve the original state/kinematics; no lighting or clipping.
 */
window.createChapterRenderer = options => {
  const T=window.THREE;
  const probe=document.createElement('canvas');
  let context=null;
  try{context=probe.getContext('webgl2')||probe.getContext('webgl');}catch{}
  if(context){context.getExtension('WEBGL_lose_context')?.loseContext();try{return new T.WebGLRenderer(options);}catch{}}
  const canvas=options?.canvas||document.createElement('canvas'),ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D is unavailable');
  const cache=new WeakMap();let width=1,height=1,viewport=null,scissor=false;
  function hull(points){
    points.sort((a,b)=>a.x-b.x||a.y-b.y);
    const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x),lo=[],hi=[];
    for(const p of points){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=0)lo.pop();lo.push(p);}
    for(const p of points.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=0)hi.pop();hi.push(p);}
    return lo.slice(0,-1).concat(hi.slice(0,-1));
  }
  const renderer={
    isFallback:true,domElement:canvas,shadowMap:{},info:{render:{calls:0,triangles:0}},
    setPixelRatio(){},getPixelRatio(){return 1},setClearColor(){},dispose(){},
    setSize(w,h,style=true){width=Math.max(1,w);height=Math.max(1,h);canvas.width=width;canvas.height=height;viewport=null;if(style){canvas.style.width=w+'px';canvas.style.height=h+'px';}},
    setViewport(x,y,w,h){viewport={x,y:height-y-h,w,h};},setScissor(){},setScissorTest(value){scissor=value;},
    clear(){ctx.clearRect(0,0,width,height);},
    render(scene,camera){
      if(!scissor)this.clear();
      const vp=viewport||{x:0,y:0,w:width,h:height},dark=document.documentElement.dataset.theme==='dark';
      ctx.save();ctx.beginPath();ctx.rect(vp.x,vp.y,vp.w,vp.h);ctx.clip();
      ctx.fillStyle=window.StageTone?.bg()||(dark?'#1a1f27':'#f5f6f8');ctx.fillRect(vp.x,vp.y,vp.w,vp.h);
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);const shapes=[];
      scene.traverseVisible(o=>{
        if(!o.isMesh||o.isInstancedMesh)return;
        const mat=Array.isArray(o.material)?o.material[0]:o.material;
        if(!mat||mat.isShadowMaterial||mat.visible===false||mat.opacity===0)return;
        const attr=o.geometry?.attributes?.position;if(!attr)return;
        let vertices=cache.get(o.geometry);
        if(!vertices){vertices=[];const step=Math.max(1,Math.floor(attr.count/96));for(let i=0;i<attr.count;i+=step)vertices.push(new T.Vector3().fromBufferAttribute(attr,i));cache.set(o.geometry,vertices);}
        const points=vertices.map(p=>p.clone().applyMatrix4(o.matrixWorld).project(camera)).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.z>=-1&&p.z<=1);
        if(points.length<3)return;
        const z=points.reduce((sum,p)=>sum+p.z,0)/points.length;
        shapes.push({points:hull(points.map(p=>({x:vp.x+(p.x+1)*vp.w/2,y:vp.y+(1-p.y)*vp.h/2}))),z,color:mat.color?'#'+mat.color.getHexString():'#78a4c8'});
      });
      shapes.sort((a,b)=>b.z-a.z);
      for(const shape of shapes){if(!shape.points.length)continue;ctx.beginPath();shape.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=shape.color;ctx.globalAlpha=.85;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=dark?'#b9d0e9':'#36516e';ctx.lineWidth=.6;ctx.stroke();}
      this.info.render.calls=shapes.length;this.info.render.triangles=0;ctx.restore();
      if(canvas.parentElement&&!canvas.parentElement.querySelector('.c2-render-fallback')){
        const note=document.createElement('div');note.className='c2-render-fallback';note.textContent='二维备用投影 · 参数与动作仍可操作，剖切与光照不显示';note.setAttribute('role','status');canvas.parentElement.append(note);
      }
    }
  };
  return renderer;
};
