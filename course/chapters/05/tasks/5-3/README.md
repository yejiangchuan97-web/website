# 任务5-3 · 混凝土泵送、振捣与整平

[打开当前课堂](index.html) · [本章入口](../../overview/index.html) · [项目说明](../../../../../README.md)

在同一楼面推进泵送、振捣与整平。支持双缸剖面、分区布料、振捣插入与换点、基准偏移和反馈开关。正式入口为index.html，使用统一主题切换。

## 维护

- 当前配置：src/config.json；交互源码：任务 src/ 和 shared/workshop/。
- 统一任务页外壳：`src/stations.js`、`src/stations.css` 把原页面的三维区搬进 shared/lab-shell，三道工序成为三个工位（楼面分区图 + 动手控件 + 试一试），面板按钮转调原页面按钮；`python scripts/build-workshops.py 5-3` 构建时自动挂上外壳。
- 统一构建：`node scripts/build.mjs 5-3`；完整验证：`npm run verify`。
- 截图放 artifacts/screenshots/，报告放 artifacts/reports/，ZIP 放 artifacts/packages/。
- 原导读及旧方案保存在 archive/revision-20261026/lessons/，不作为当前功能说明。

## 模型与资料

内容来源与模型说明（保存在仓库外的 教材文档/）。三维动作与状态属于课堂模拟，不生成真实设备许可或工程验收结论。支持 HTTP、file://、键盘、小屏和无 WebGL 备用操作。
