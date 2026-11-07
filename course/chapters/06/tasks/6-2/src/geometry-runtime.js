// Static solids and their drawing order are built and audited ahead of time.
// The XYZ overview intentionally leaves yaw to the enlarged plan inspection.
(()=>{
 let currentLayout='',parts=[],rod,bed,lastPose='';
 const normalize=value=>({1:'single',2:'dual',4:'quad',double:'dual',four:'quad'})[value]||value||'quad';
 window.setRigPose=(input={})=>{
  const layout=normalize(input.layout),p={x:25,y:30,top:40,bed:4,...input};
  p.tileX=input.tileX??p.x;p.tileY=input.tileY??p.y;p.tileTop=input.tileTop??p.top;
  if(!RIG_SCENES[layout])throw Error('Unknown cup layout: '+layout);
  const drawing=document.getElementById('drawing');if(!drawing)return;
  if(currentLayout!==layout){
   drawing.innerHTML=RIG_SCENES[layout].svg;currentLayout=layout;lastPose='';
   parts=[...drawing.querySelectorAll('[data-part]')];
   rod=parts.find(node=>node.dataset.group==='rod');
   bed=parts.find(node=>node.dataset.part==='adhesive');
   drawing.dataset.layout=layout;
  }
  const key=[layout,p.x,p.y,p.top,p.tileX,p.tileY,p.tileTop,p.bed,Boolean(p.leak)].join(',');
  if(key===lastPose)return;lastPose=key;
  const P=RIG_SCENES[layout].P;
  for(const part of parts){
   const group=part.dataset.group;let d=null;
   if(group==='cart')d=[p.x-25,0,0];
   if(group==='yslide')d=[p.x-25,p.y-30,0];
   if(group==='head')d=[p.x-25,p.y-30,p.top-40];
   if(group==='tile')d=[p.tileX-25,p.tileY-30,p.tileTop-40];
   if(d)part.setAttribute('transform',translateAlong(P,d));
  }
  const rodBottom=p.top+25;
  rod.innerHTML=solidSvg(slabOf({x:p.x-3,y:p.y,w:6,d:6,r:1},rodBottom,80-rodBottom,P,4,.55),{tone:'hi'});
  bed.innerHTML=solidSvg(slabOf({x:-10,y:-5,w:70,d:70,r:1},0,Math.max(.1,p.bed),P,4,.55),{tone:'lo'});
  const lips=parts.filter(node=>node.dataset.part.startsWith('cup.lip'));
  const failedName={single:'cup.lip0',dual:'cup.lip200',quad:'cup.lip2021'}[layout];
  lips.forEach(node=>{
   const failed=Boolean(p.leak)&&node.dataset.part===failedName;
   node.style.opacity=failed?'.45':'1';
   node.setAttribute('data-failed',String(failed));
  });
  drawing.setAttribute('aria-label',`${{single:'一个大',dual:'两个中',quad:'四个小'}[layout]}吸盘${p.leak?'，一只吸盘失效以变暗显示':''}；主台示意平移和升降，旋转角度见俯视检查窗`);
 };
})();
