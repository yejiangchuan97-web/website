/* The same model drives teaching marks, trajectories and readouts. */
(function(root){
  'use strict';
  const M=RobotModel,TM=ToolModel;
  const details={
    nozzle:{label:'偏置喷枪',en:'SPRAY GUN',task:'墙面喷涂',point:'喷嘴出口中心',hint:'喷嘴偏在连接轴的一侧。TCP 既有长度偏置，也有侧向偏置。',action:'开启喷射',off:'关闭喷射'},
    gripper:{label:'平行夹爪',en:'PARALLEL GRIPPER',task:'砖块夹取',point:'两指之间的夹持中心',hint:'TCP 可以在空气中：本练习取规定夹持状态下，两指之间的工作中心。',action:'闭合夹爪',off:'张开夹爪'},
    vacuum:{label:'双吸盘',en:'VACUUM GRIPPER',task:'板材搬运',point:'两吸盘接触面的中心',hint:'TCP 在两个吸盘之间的接触平面上，不在某一只吸盘的壳体中心。',action:'开启真空',off:'释放真空'},
    tie:{label:'钢筋绑扎头',en:'REBAR TYING HEAD',task:'钢筋绑扎',point:'扎丝出口 / 旋拧中心',hint:'要对准的是钢筋交叉处的绑扎工作中心，工具外壳的中心并不参与对点。',action:'启动绑扎',off:'停止绑扎'},
    grind:{label:'打磨盘',en:'SANDING TOOL',task:'墙面打磨',point:'指定打磨面的中心',hint:'本练习把 TCP 定义在磨盘接触面的中心。接触方向还要由工具坐标轴描述。',action:'启动磨盘',off:'停止磨盘'},
    drill:{label:'钻孔工具',en:'DRILLING TOOL',task:'定位开孔',point:'钻头尖端',hint:'钻头变长或更换后，需要核对尖端相对法兰的位置，原来的 TCP 不一定适用。',action:'启动钻头',off:'停止钻头'}
  };
  for(const [id,d] of Object.entries(details))Object.assign(TM.tools[id],d);
  function pivot(tool,angle,mode='tcp',parameter=TM.flangeOffset(tool),seed=M.home){
    // Tilt around the initial tool X axis. This plane stays inside the six-axis
    // model's reachable workspace across every tool and the full slider range.
    const base=M.fk(M.home,tool),R=M.mm(base.R,M.rot([1,0,0],angle*M.D));
    const flangeR=M.mm(R,M.rot([0,1,0],-Math.PI/2));
    // The selected controller point starts at its own world position. A wrong
    // parameter must not teleport the arm when the angle is zero.
    const controllerAnchor=M.add(base.flange,M.mv(base.flangeR,parameter));
    const flange=mode==='flange'?base.flange:M.sub(controllerAnchor,M.mv(flangeR,parameter));
    const target=M.add(flange,M.mv(R,TM.tools[tool].offset));
    const result=M.ik(target,R,seed,tool,180);
    const issue=result.ok?M.guard(result.q,tool):'当前姿态无法到达，请减小角度。';
    return {...result,ok:result.ok&&!issue,reason:issue,anchor:base.p,controllerAnchor,flangeAnchor:base.flange,target,R};
  }
  function stateMetrics(s){
    const f=M.fk(s.q,s.tool),pred=TM.predicted(s.q,s.parameter),base=M.fk(M.home,s.tool);
    return {f,pred,parameterError:M.norm(M.sub(f.p,pred)),tipTravel:M.norm(M.sub(f.p,base.p)),flangeTravel:M.norm(M.sub(f.flange,base.flange)),pinError:M.norm(M.sub(f.p,s.pin))};
  }
  root.WorkshopModel={pivot,stateMetrics};
  if(typeof module!=='undefined')module.exports=root.WorkshopModel;
})(typeof window==='undefined'?globalThis:window);
