# 任务8-1 · 安全操作

[打开当前课堂](index.html) · [本章入口](../../overview/index.html) · [项目说明](../../../../../README.md)

一块正在作业的施工楼面：挖掘机在回转、塔吊吊着钢筋捆、钢筋加工机的皮带在转、喷涂工人在墙前作业。学生把现场“暂停”下来，分四个工位完成一次安全处置：

1. **巡查找危险**：危险不预先标注，在三维现场里点出六处（临时用电、回转碰撞、外露传动、悬吊物、楼面洞口、残余压力）。
2. **急停隔离**：急停后分别断电挂锁、泄压（压力表回零）、吊物落地；运行中直接上手会被拦下。
3. **处置复查**：逐项处置（换线架空、回转围挡并改道、装回皮带罩、吊物区警戒、洞口盖板和护栏、换管路接头），再逐项复查。
4. **复位重启**：撤锁送电、急停复位、鸣笛启动；复位不会自动开机，没送电也启动不了。

## 维护

- 独立页面：`src/page.html` + `src/style.css`，`src/model.js`（状态，纯函数）、`src/scene.js`（三维现场）、`src/app.js`（接线，对外 `window.SafetyLab`）。
- 统一任务页外壳：`src/stations.js`、`src/stations.css`，由 `src/build.mjs` 通过 `shared/lab-shell/native-layout.mjs` 的 `labShell(html, '8-1')` 内联。
- 构建：`node scripts/build.mjs 8-1`（或 `node course/chapters/08/tasks/8-1/src/build.mjs`），再运行 `python scripts/finalize-pages.py`。
- 模型测试：`qa/safety.test.cjs`（`node scripts/test.mjs` 会一起跑）。

## 模型与资料

挖掘机与第二章 2-1、本章 8-2 是同一台：`src/build.mjs` 从 `2-1/diesel-source/src/engine-lab.js` 截取 `createExcavator` 内联，构建时把回转平台以上的零件归入一组以便回转，并去掉车身型号字样（2-1 文件不改）。塔吊（Innerscene，CC0）沿用 1-2 的同款网格，经 `shared/workshop/imported-machinery.js` 载入，许可见 `shared/models/machinery/LICENSE.html`；塔吊原吊钩隐藏，改为页面自绘可升降的小车、钢丝绳、吊钩与钢筋捆。其余设备、人员与防护设施为课堂自建模型，按米制真实尺寸布置。

所有危险、处置与复查均为课堂案例，不给通用安全距离，不代表真实设备性能或作业放行。内容来源与模型说明（保存在仓库外的 教材文档/）。
