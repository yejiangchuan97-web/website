/* Anatomy kit geometry fallback. Physical cuboids retain thickness, shading and model state. */
class AnatomyFallback {
 constructor(host,{onPick}={}){this.host=host;host.dataset.fallback='true';this.onPick=onPick;this.mode='manual';this.platform='fixed';this.view='iso';this.zoom=1;this.data={bricks:[],width:240};this.explode=0;this.dark=false;this.parts=0;this.host.addEventListener('click',e=>{const n=e.target.closest('[data-slot]');if(n)this.onPick?.(n.dataset.slot);});}
 setMode(v){this.mode=v;this.resetView();}
 setManual(v){this.data=v;this.draw();}
 updateRobot(v){this.robot=v;this.platform=v.platform;this.draw();}
 setPlatform(v){this.platform=v;this.draw();}
 setView(v){this.view=v;this.zoom=v==='detail'?1.4:1;this.draw();}
 setTheme(v){this.dark=v;this.draw();}
 setExplode(v){this.explode=v;this.draw();}
 zoomBy(f){this.zoom=Math.max(.65,Math.min(2.8,this.zoom*f));this.draw();}
 resetView(){this.view='iso';this.zoom=1;this.draw();}
 resize(){this.draw();}
 snapshot(){return {renderer:'anatomy-svg-fallback',mode:this.mode,platform:this.platform,view:this.view,zoom:this.zoom,parts:this.parts,units:'mm'};}
 draw(){const K=AnatomyKit,boxes=[];const put=(x,y,z,w,d,h,tone='mid',lit=false,id='',yaw=0)=>boxes.push({x,y,z,w,d,h,tone,lit,id,yaw});
  if(this.mode!=='robot'){
   const data=this.data,b=data.bricks||[],length=data.length||Math.max(240,...b.map(q=>q.x+q.w)),width=data.width||240;
   put(-35,-40,-26,length+70,width+80,26,'lo');for(const x of[-12,length-12])for(const y of[-17,width-17])put(x,y,-55,24,24,29,'lo');
   put(-20,-29,0,length+40,12,1,'lo');for(let x=0;x<=length;x+=25)put(x,-29,1,1,x%125===0?11:6,1,'hi');
   for(const q of b){const h=(q.course||0)*this.explode*40;put(q.x,q.y,q.z+h,q.w,q.d,q.h,q.selected?'hi':'mid',!!q.selected,q.id);if(q.z>0){const j=q.mortar||data.mortar||10;put(q.x,q.y,q.z-j+h,q.w,q.d,j,'lo');}}
   for(const q of data.slots||[])put(q.x,q.y,.1,q.w,q.d,1,'hi',q.selected,q.id);
   if(data.ghost){const q=data.ghost;put(q.x,q.y,q.z,q.w,q.d,2,'hi',true);}
   put(length+5,10,0,12,width-20,10,'hi');put(length-80,10,0,85,12,10,'hi');
  }else{
   const r=this.robot||RobotModel.robotAt(0),t=r.tool,b=r.brick;
   put(-810,-540,-40,1620,1080,40,'lo');for(const x of[-760,720])for(const y of[-480,420]){
    if(this.platform==='mobile'){put(x-5,y-5,-64,60,70,24,'lo');boxes.push({x:x-21,y:y+8,z:-130,w:92,d:44,h:92,tone:'lo',wheel:true});put(x+(x>0?85:-85),y,-130,45,60,90,'hi');}
    else{put(x,y,-130,50,60,90,'lo');put(x-8,y-8,-134,66,76,4,'hi');}
   }
   for(const x of[-735,735]){put(x-65,245,0,130,145,23,'lo');put(x-36,280,23,72,80,765,'mid');put(x-30,286,788,60,68,5,'hi');for(const dx of[-46,46])put(x+dx-4,280,23,8,8,5,'hi');}
   put(-790,270,793,1580,100,82,'mid');put(-765,261,804,1530,8,13,'hi');put(-765,261,852,1530,8,13,'hi');
   put(t.x-68,225,782,136,48,115,'hi');put(t.x-43,-523,750,86,830,60,'mid');for(const x of[-31,31])put(t.x+x-4,-498,810,8,785,9,'hi');
   put(t.x-62,t.y+105,819,124,120,17,'hi');put(t.x-38,t.y+146,145,76,38,655,'mid');
   put(t.x-55,t.y+113,t.z+70,110,28,96,'hi');put(t.x-44,t.y-10,t.z+87,88,150,20,'mid');
   put(t.x-34,t.y-34,t.z+87,68,68,31,'hi');put(t.x-81,t.y-78,t.z+63+this.explode*50,162,156,16,'hi',false,'',t.yaw);
   for(const side of[-1,1]){const cy=side*(67.5+t.open);const x=t.x-Math.sin(t.yaw)*cy,y=t.y+Math.cos(t.yaw)*cy;put(x-49.5,y-8,t.z+17,99,16,49,'mid',false,'',t.yaw);}
   for(const x of[-575,-285])for(const y of[-350,-170])put(x-12,y-12,0,24,24,47,'lo');put(-605,-380,47,350,240,16,'mid');for(const y of[-342,-260,-178])put(-595,y-24.5,63,330,49,11,'hi');
   for(const z of[0,63])put(-60,-10,z,740,240,10,'lo');for(const q of RobotModel.robotWall().bricks)put(q.x,q.y,q.z,q.w,q.d,q.h,'mid');
   put(245,-10,126,115,240,r.mortarHeight||10,'lo');put(b.x-120,b.y-57.5,b.z,240,115,53,'hi',true,'',b.yaw);
   put(-650,200,0,220,140,12,'lo');put(-642,208,12,204,124,8,'mid');for(let i=0;i<21;i++)put(-400+i*40,-500,0,2,i%5?8:15,1,'hi');
  }
  const points=boxes.flatMap(b=>K.boxCorners({x:b.x,y:b.y,w:b.w,d:b.d,r:0},b.z,b.z+b.h));
  const P=K.fitProjection(points,1000,500,{pad:this.mode==='robot'?50:70,azimuth:this.view==='front'||this.view==='top'?-90:-60,elevation:this.view==='top'?88:this.view==='front'?7:33});
  const wheel=b=>{const faces=[],r=b.w/2,cx=b.x+r,cz=b.z+r;const pt=(a,y)=>[cx+Math.cos(a)*r,y,cz+Math.sin(a)*r];for(let i=0;i<32;i++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16;faces.push({pts:[pt(a,b.y),pt(c,b.y),pt(c,b.y+b.d),pt(a,b.y+b.d)],tone:i%4});}for(const y of[b.y,b.y+b.d])faces.push({pts:Array.from({length:32},(_,i)=>pt(i*Math.PI/16,y)),tone:2});return faces.sort((a,c)=>K.depthOf(a.pts.reduce((v,p)=>v.map((n,i)=>n+p[i]/a.pts.length),[0,0,0]),P)-K.depthOf(c.pts.reduce((v,p)=>v.map((n,i)=>n+p[i]/c.pts.length),[0,0,0]),P)).map(f=>`<path d="${f.pts.map((p,i)=>(i?'L':'M')+K.iso(p,P).map(n=>n.toFixed(2)).join(' ')).join('')}Z" fill="var(--anatomy-shade-${f.tone})" stroke="var(--anatomy-mid)" stroke-width=".3"/>`).join('');};
  let body=boxes.sort((a,b)=>K.depthOf([a.x+a.w/2,a.y+a.d/2,a.z+a.h/2],P)-K.depthOf([b.x+b.w/2,b.y+b.d/2,b.z+b.h/2],P)).map(b=>{if(b.wheel)return wheel(b);let paths;if(b.yaw){const cx=b.x+b.w/2,cy=b.y+b.d/2,c=Math.cos(b.yaw),s=Math.sin(b.yaw);const ring=[[-b.w/2,-b.d/2],[b.w/2,-b.d/2],[b.w/2,b.d/2],[-b.w/2,b.d/2]].map(([x,y])=>[cx+x*c-y*s,cy+x*s+y*c]);paths=K.extrude(ring,b.z,b.h,P);}else paths=K.slabOf({x:b.x,y:b.y,w:b.w,d:b.d,r:Math.min(2,b.w/8,b.d/8)},b.z,b.h,P,3,.6);return `<g ${b.id?'data-slot="'+b.id+'"':''}>${K.solidSvg(paths,{tone:b.tone,lit:b.lit})}</g>`;}).join('');
  if(this.zoom!==1)body=`<g transform="translate(500 250) scale(${this.zoom}) translate(-500 -250)">${body}</g>`;
  this.parts=boxes.length;this.host.innerHTML=K.figureSvg({width:1000,height:500,label:'砌筑机构实体投影备用画面',body});
 }
}
