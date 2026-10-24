// SI force / power calculations; geometric coordinates and velocity displays use mm.
const physicalDefaults={flow:.06,pressure:6,brake:2,load:100,torque:.5,friction:.12};
const phys={...physicalDefaults,hydV:0,screwRate:0,x:0,v:0,history:[],time:0,hydState:'待机',screwState:'待机'};
function hydraulicMetrics(theta=s.theta,dir=s.hydDir,m=s,config=phys){
 const g=solve(theta,m),Ap=PI*7.8**2,Arod=PI*3.7**2,Ann=Ap-Arod,Ain=dir>0?Ap:Ann,Aout=dir>0?Ann:Ap;
 const u={x:(g.q.x-g.p.x)/m.b,y:(g.q.y-g.p.y)/m.b},rA=g.p.x*u.y-g.p.y*u.x,rC=(g.q.x-D)*u.y-g.q.y*u.x;
 const singular=g.moment<1e-5||Math.abs(rC)<1e-5,linkForce=config.brake===0?0:config.brake/Math.max(Math.abs(rC)/1000,1e-12),loadForce=linkForce*Math.abs(rA)/Math.max(g.moment,1e-12),seal=15,back=.1;
 const required=(loadForce+seal+back*Aout)/Ain,capacity=Math.max(0,config.pressure*Ain-back*Aout-seal),blocked=singular||required>config.pressure+1e-9;
 return {Ap,Ann,Ain,Aout,required,capacity,loadForce,linkForce,seal,back,blocked,singular,ratio:rA/rC,rA,rC,velocity:config.flow*1e6/60/Ain,pressure:Math.min(config.pressure,required),cylinderForce:Math.min(loadForce,capacity),moment:g.moment/1000*Math.min(loadForce,capacity),outputTorque:config.brake};
}
function screwMetrics(dir=s.screwDir,m=s,config=phys){
 const dm=13.2/1000,lambda=Math.atan(m.lead/1000/(PI*dm)),rho=Math.atan(config.friction/Math.cos(rad(15))),raise=config.load*dm/2*Math.tan(lambda+rho),lower=config.load*dm/2*Math.tan(rho-lambda),required=dir>0?raise:lower,efficiency=Math.tan(lambda)/Math.tan(lambda+rho);
 return {lambda,rho,raise,lower,required,efficiency,selfLocking:rho>lambda,blocked:m.mode!=='sync'&&Math.abs(required)>config.torque+1e-9,axialSpeed:m.mode==='sync'?0:phys.screwRate*m.lead,idealPower:config.load*m.rpm*m.lead/60000,inputPower:raise*m.rpm*2*PI/60,torqueCapacity:config.torque};
}
function approach(value,target,step){return value<target?Math.min(target,value+step):Math.max(target,value-step)}
function hydraulicAdvance(dt,dir){
 const g=solve(s.theta),h=hydraulicMetrics(s.theta,dir),lo=range.lmin+.02,hi=range.lmax-.02,dist=dir>0?hi-g.len:g.len-lo,a=20;
 if(h.blocked){phys.hydV=0;phys.hydState=h.singular?'死点：不能自行越过':'供压不足 · 溢流停住';return dir}
 const target=dir*Math.min(h.velocity,.75*Math.sqrt(2*a*Math.max(0,dist)),4*Math.max(0,dist));phys.hydV=approach(phys.hydV,target,a*dt);
 const next=g.len+phys.hydV*dt;
 if((dir>0&&next>=hi-.0001)||(dir<0&&next<=lo+.0001)){s.theta=thetaFromLength(dir>0?hi:lo);phys.hydV=0;phys.hydState='限位减速 / 换向';return -dir}
 s.theta=clamp(thetaFromLength(clamp(next,lo,hi)),range.min,range.max);phys.hydState=dir>0?'无杆腔进油 · 伸出':'有杆腔进油 · 回收';return dir;
}
function screwAdvance(dt,dir,step=false){
 const q=screwMetrics(dir),max=100/s.lead,n=s.ns-s.nn,a=3,previous=phys.screwRate;
 if(q.blocked){phys.screwRate=0;phys.screwState='电机转矩不足 · 停住';return {dir,done:false}}
 const dist=step?Math.abs(s.step.remaining):s.mode==='sync'?Infinity:dir>0?max-n:n,target=dir*Math.min(s.rpm/60,.75*Math.sqrt(2*a*Math.max(0,dist)),4*Math.max(0,dist));
 phys.screwRate=approach(phys.screwRate,target,a*dt);let delta=(previous+phys.screwRate)/2*dt,done=false;
 if(step&&(Math.abs(delta)>=dist||dist<.0001)&&Math.sign(delta)===dir){delta=dir*dist;done=true;phys.screwRate=0}
 if(s.mode==='sync'){s.ns+=delta;s.nn+=delta}else{const next=n+delta;if(next>=max-.0001||next<=.0001){s.ns=s.nn+(next>=max-.0001?max:0);phys.screwRate=0;dir=next>=max-.0001?-1:1;done=step}else s.ns+=delta}
 if(step){s.step.remaining-=delta;if(Math.abs(s.step.remaining)<1e-8){done=true;phys.screwRate=0}}
 phys.screwState=s.mode==='sync'?'双驱动同步对照':q.required<0?'重载下行 · 伺服制动':dir>0?'驱动提升':'受控下降';return {dir,done};
}
function vibrationAdvance(dt,oldRate){
 // Whole lift is a rigid mass on lateral elastic supports. Integrate transients.
 const count=Math.max(1,Math.ceil(dt*480)),h=dt/count,rate=phys.screwRate,alpha=dt?(rate-oldRate)*2*PI/dt:0,e=s.vibration?s.ecc/1000:0,M=2+phys.load/9.81;
 for(let i=0;i<count;i++){const w=(oldRate+(rate-oldRate)*(i+.5)/count)*2*PI,phase=(s.ns-rate*(dt-(i+.5)*h))*2*PI,force=e*(w*w*Math.cos(phase)+alpha*Math.sin(phase)),acc=(x,v)=>(force-20*v-5000*x)/M;
  const x=phys.x,v=phys.v,k1x=v,k1v=acc(x,v),k2x=v+h*k1v/2,k2v=acc(x+h*k1x/2,v+h*k1v/2),k3x=v+h*k2v/2,k3v=acc(x+h*k2x/2,v+h*k2v/2),k4x=v+h*k3v,k4v=acc(x+h*k3x,v+h*k3v);
  phys.x+=h*(k1x+2*k2x+2*k3x+k4x)/6;phys.v+=h*(k1v+2*k2v+2*k3v+k4v)/6;phys.force=force;
 }
 phys.time+=dt;phys.history.push(phys.x*1000);if(phys.history.length>220)phys.history.shift();
}
function updatePhysicsUI(){
 const h=hydraulicMetrics(),q=screwMetrics(),active=s.play||s.step||(study.play&&study.type==='screw')||(modalDemo.play&&activeModal==='screw');
 $('force-readout').textContent=`负载 C：${f(phys.brake)} N·m；所需缸力 ${f(h.loadForce,0)} N；需压 ${h.singular?'∞':f(h.required,2)} / 上限 ${f(phys.pressure)} MPa${h.blocked?' · 停住':''}`;
 $('hyd-force-caption').textContent='准静态负载 / 力线方向';$('velocity-value').textContent=f(active?(s.mode==='sync'?0:phys.screwRate*s.lead):0);
 if(!s.hold){$('boom-status').textContent=h.blocked?h.singular?'死点 / 不能越过':'供压不足 / 停住':'可传力 / 供压充足';$('boom-status').classList.toggle('danger',h.blocked)}
 $('boom-explain').textContent=h.singular?'死点：力臂或输出传力臂为零，有限缸力不能维持指定输出负载。':h.blocked?'所需压力超过设定上限，自动演示停住；可减小制动负载、提高供压或反向退出。':`v = Q / A；相同流量回收较快、最大拉力较小。伸出 ${f(hydraulicMetrics(s.theta,1).velocity)} / 回收 ${f(hydraulicMetrics(s.theta,-1).velocity)} mm/s。`;
 $('rpm-out').textContent=s.rpm+' r/min 设定';$('screw-status').textContent=q.blocked?'电机转矩不足':s.mode==='sync'?'双驱动同步 / 无升降':q.selfLocking?'螺母止转 / 摩擦自锁':'螺母止转 / 需制动保持';$('screw-status').classList.toggle('danger',q.blocked);
 $('vib-top').textContent=s.vibration?'整机弹性支承响应放大 25×':'理想对中 · 无偏心激励';$('vibration-out').textContent=`x = ${f(phys.x*1e6)} μm / 稳态 A ${f(vibration().amplitude*1000)} μm`;
 if($('physics-dialog').open){for(const k of Object.keys(physicalDefaults)){$('physical-'+k).value=phys[k];$('physical-'+k+'-out').textContent=f(phys[k],k==='flow'?3:k==='friction'?2:1)}
  $('hyd-physics-readout').innerHTML=`缸径 15.6 / 杆径 7.4 mm<br>A无杆 = ${f(h.Ap,2)}；A有杆 = ${f(h.Ann,2)} mm²<br>需压 ${h.singular?'∞':f(h.required,3)} / 设定上限 ${f(phys.pressure,1)} MPa<br>当前速度 ${f(phys.hydV,2)} mm/s；${h.blocked?'供压不足或死点':phys.hydState}<br>v = Q / A，F净 = p进 A进 − p回 A回 − F密封`;
  $('screw-physics-readout').innerHTML=`螺旋升角 ${f(deg(q.lambda),2)}°；等效摩擦角 ${f(deg(q.rho),2)}°<br>提升需矩 ${f(q.raise,3)} / 电机上限 ${f(phys.torque,2)} N·m<br>下降需矩 ${f(q.lower,3)} N·m${q.lower<0?'（需制动）':''}<br>提升效率 ${f(q.efficiency*100,1)}%；${q.selfLocking?'摩擦自锁条件成立':'可反驱，需制动'}<br>实际转速 ${f(phys.screwRate*60,1)} r/min`;
 }
}
function physicalWave(){const ctx=$('wave').getContext('2d'),hist=phys.history,max=Math.max(.002,...hist.map(Math.abs));ctx.clearRect(0,0,220,44);ctx.strokeStyle='#9aacaa';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(0,22);ctx.lineTo(220,22);ctx.stroke();ctx.strokeStyle='#c38144';ctx.lineWidth=1.7;ctx.beginPath();hist.forEach((x,i)=>{const px=220-hist.length+i,py=22-x/max*18;if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py)});ctx.stroke()}
function initPhysics(){const b=document.createElement('button');b.id='physics-open';b.textContent='物理实验';document.querySelector('.mast>.toolbar').append(b);b.addEventListener('click',()=>{$('physics-dialog').showModal();updatePhysicsUI()});$('physics-close').addEventListener('click',()=>$('physics-dialog').close());for(const k of Object.keys(physicalDefaults))$('physical-'+k).addEventListener('input',e=>{pause();phys[k]=+e.target.value;draw();updatePhysicsUI()});$('physical-reset').addEventListener('click',()=>{pause();Object.assign(phys,physicalDefaults);draw();updatePhysicsUI()});}
