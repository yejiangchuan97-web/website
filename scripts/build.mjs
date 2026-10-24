import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const builds={
  "1-entry": "第一章_走进智能建造/src/build.mjs",
  "1-1": "任务1-1_从建造施工到智能建造/src/build.mjs",
  "1-2": "任务1-2_认识施工机械/src/build.mjs",
  "1-3": "任务1-3_认识施工机器人/src/build.mjs",
  "2-entry": "第二章_动力与工作机构/src/build.mjs",
  "2-1": "任务2-1_动力装置的基本原理/build.cjs",
  "2-2": "任务2-2_动力的传递与变换/scripts/build.js",
  "2-3": "任务2-3_工作机构与施工动作/build.cjs",
  "3-entry": "第三章_机器人结构与运动/src/build.mjs",
  "3-1": "任务3-1_机器人构型与工作空间识读/src/build.mjs",
  "3-2": "任务3-2_六轴机械臂本体_关节轴与低速点动/src/build.mjs",
  "3-3": "任务3-3_关节驱动_减速器与传动机构/src/rebuild/build.mjs",
  "3-4": "任务3-4_末端执行器_TCP与工具控制/src/tools.build.mjs",
  "3-5": "任务3-5_移动底盘与行走机构/src/mobile.build.mjs",
  "4-entry": "第四章_感知与智能识别/src/build.mjs",
  "4-1": "任务4-1_机器人自身状态感知/src/build.mjs",
  "4-2": "任务4-2_机器人激光雷达感知/src/build.mjs",
  "4-3": "任务4-3_标注安全帽并应用YOLO模型/src/build.mjs",
  "5-entry": "第五章_主体结构施工/src/build.mjs",
  "5-1": "任务5-1_钢筋加工机械与绑扎作业面识读/src/build.mjs",
  "5-2": "任务5-2_钢筋绑扎机器人操作与人工复核/src/build.mjs",
  "5-3": "任务5-3_混凝土泵送布料与整平抹光机器人/src/build.mjs",
  "6-entry": "第六章_装饰装修施工/src/build.mjs",
  "6-1": "任务6-1_砌筑工程_人工工艺_砂浆机械与机器人进场/src/build.mjs",
  "6-2": "任务6-2_地砖铺贴_工艺准备与铺贴机器人作业/src/build.mjs",
  "6-3": "任务6-3_腻子打磨_作业面检查_恒力执行与质量验收/src/build.mjs",
  "6-4": "任务6-4_室内喷涂_路径规划_参数控制与缺陷诊断/src/build.mjs",
  "7-entry": "第七章_巡检与数据复核/src/build.mjs",
  "7-1": "任务7-1_巡检机器人_轮式_四足与爬壁/src/build.mjs",
  "7-2": "任务7-2_无人机巡检_病害检测与数据复核/src/build.mjs",
  "8-entry": "第八章_安全操作与维护/src/build.mjs",
  "8-1": "任务8-1_机械与机器人的安全操作规程/src/build.mjs",
  "8-2": "任务8-2_设备保养_故障排查与维护记录/src/build.mjs",
  "8-3": "任务8-3_爬壁与特种作业机器人安全检查/src/build.mjs",
  "8-4": "任务8-4_装修机器人职业健康与清洗维护/src/build.mjs"
};
const task=process.argv[2];
if(!task || (task!=='all'&&!['1','2','4','5','6','7','8'].includes(task)&&!builds[task])){console.log('用法: node scripts/build.mjs <任务编号|1|2|4|5|6|7|8|all>\n1 / 2 / 4 / 5 / 6 / 7 / 8: 构建对应章节入口和任务页面\n可构建任务: '+Object.keys(builds).join(', '));process.exit(task?1:0)}
for(const id of task==='all'?Object.keys(builds):['1','2','4','5','6','7','8'].includes(task)?Object.keys(builds).filter(id=>id.startsWith(task+'-')):[task]){console.log('Building '+id);const result=spawnSync(process.execPath,[fileURLToPath(new URL('../'+builds[id],import.meta.url)),...process.argv.slice(3)],{cwd:root,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1)}
