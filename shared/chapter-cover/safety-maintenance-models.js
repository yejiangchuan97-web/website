/* Original safety exhibit for chapter navigation. No site clearance or safety distance is represented. */
(() => {
 'use strict';
 const T=THREE,B=CourseMachineModels.Builder;
 CourseMachineModels.register('safety-exhibit',()=>{
  const b=new B('safety-exhibit'),root=b.root;
  const plinth=b.group(root,-.35,0,.22);
  b.box(plinth,1.85,.38,1.65,'navy',0,.2,0,.08);
  b.box(plinth,1.68,.06,1.48,'blue',0,.42,0,.02);
  const helmet=b.group(plinth,0,.64,0);
  const shell=b.mesh(helmet,new T.SphereGeometry(.76,36,24,0,Math.PI*2,0,Math.PI/2),'yellow');
  shell.scale.set(1,1.08,.92);
  const brim=b.cyl(helmet,.94,.065,'yellow',0,0,.06);brim.scale.z=.88;
  b.box(helmet,.1,.13,1.03,'orange',0,.68,-.06,.045);
  for(const x of [-.49,.49])for(const z of [-.22,.03,.28])b.box(helmet,.08,.035,.12,'navy',x,.43,z,.008);
  b.part('helmet','安全帽概念展品',helmet,'安全用品只是本章主题标识；现场条件仍须进入案例逐项检查。');
  const barrier=b.group(root,0,0,-.83);
  for(const x of [-1.32,1.32]){b.box(barrier,.42,.12,.54,'navy',x,.06,0,.035);b.cyl(barrier,.06,1.38,'steel',x,.8,0);b.ball(barrier,.085,'orange',x,1.53,0);}
  b.box(barrier,2.74,.27,.11,'yellow',0,1.27,0,.02);
  for(let i=0;i<8;i++){const stripe=b.box(barrier,.15,.29,.12,'navy',-1.16+i*.33,1.27,0,.005);stripe.rotation.z=-.35;}
  b.part('barrier','警戒设施示意',barrier,'示意警戒设施与现场提示，不标注或推算通用安全距离。');
  const sign=b.group(root,1.12,0,.38);
  b.box(sign,.75,.14,.65,'blue',0,.08,0,.035);
  b.cyl(sign,.045,1.1,'steel',0,.7,0);
  b.plate(sign,[[-.43,1.1],[.43,1.1],[0,1.88]],.075,'orange',0);
  b.plate(sign,[[-.32,1.16],[.32,1.16],[0,1.76]],.015,'yellow',.05);
  b.box(sign,.07,.26,.025,'navy',0,1.46,.07,.012);
  b.ball(sign,.045,'navy',0,1.24,.085);
  b.part('warning','风险提示标识',sign,'提示先观察危险与设备状态，再依据案例条件选择处理动作。');
  const stop=b.group(root,-1.25,.28,.84);
  b.box(stop,.45,.24,.42,'white',0,0,0,.04);
  b.cyl(stop,.125,.12,'red',0,.18,0);
  b.part('stop','停止控制位置示意',stop,'停止、复位与重新启动是不同动作；封面不执行设备控制。');
  const model=b.finish();
  model.pose=()=>root.updateMatrixWorld(true);
  model.metadata={nature:'原创安全主题概念展品；静态陈列，不模拟设备放行'};
  model.pose(0);return model;
 });
})();
