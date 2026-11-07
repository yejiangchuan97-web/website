/* Original six-axis teaching arm. Joint angles illustrate motion, not robot performance. */
(() => {
 const T=THREE,B=CourseMachineModels.Builder;
 CourseMachineModels.register('six-axis',()=>{
  const b=new B('six-axis'),r=b.root,joints=[];
  b.cyl(r,.78,.18,'navy',0,.09);b.cyl(r,.58,.38,'white',0,.33);
  b.bolts(r,0,.2,0,.64,8,'y');
  function joint(parent,name,x,y,z,axis,radius){
   const g=b.group(parent,x,y,z);g.name=name;joints.push({node:g,axis});
   b.cyl(g,radius,.42,'blue',0,0,0,axis);b.cyl(g,radius*.65,.44,'steel',0,0,0,axis);
   b.part(name,name+' 旋转关节',g,'六轴机械臂的独立旋转关节；动作仅作结构示意。');return g;
  }
  const j1=joint(r,'J1',0,.6,0,'y',.4);
  const j2=joint(j1,'J2',0,.3,0,'z',.34);
  b.box(j2,.42,1.7,.4,'white',0,.85);b.box(j2,.1,1.38,.44,'blue',-.23,.85);
  const j3=joint(j2,'J3',0,1.7,0,'z',.3);
  b.box(j3,.35,1.45,.35,'white',0,.72);b.box(j3,.07,1.15,.39,'blue',.2,.72);
  const j4=joint(j3,'J4',0,1.45,0,'y',.23);
  b.cyl(j4,.2,.42,'white',0,.24);
  const j5=joint(j4,'J5',0,.5,0,'z',.21);
  b.cyl(j5,.15,.33,'white',0,.18);
  const j6=joint(j5,'J6',0,.4,0,'y',.16);
  b.box(j6,.5,.18,.3,'navy',0,.16);
  const fingers=[-1,1].map(s=>{const f=b.group(j6,s*.23,.26,0);b.box(f,.08,.4,.18,'steel',0,.2);b.box(f,.16,.07,.2,'dark',-s*.04,.41);return f;});
  const model=b.finish();
  model.pose=t=>{
   const angles=[.25*Math.sin(t*.8),-.4+.18*Math.sin(t),-1.1+.3*Math.sin(t+.7),t*.6,-.85+.22*Math.sin(t*1.1),.25*Math.sin(t)];
   joints.forEach((j,i)=>j.node.rotation[j.axis]=angles[i]);
   fingers.forEach((f,i)=>f.position.x=(i?1:-1)*(.18+.08*(1+Math.sin(t*1.2))));
   r.updateMatrixWorld(true);
  };
  model.joints=joints;model.pose(0);return model;
 });
})();
