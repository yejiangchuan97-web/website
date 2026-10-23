# Hero 场景验证入口

构建完成后，在任务目录运行：

```powershell
node qa/hero-check.mjs
```

仅复查某一组：`node qa/hero-check.mjs --only=hero-interaction`。如当前环境无法自动使用图形加速，可显式设置 `HERO_SOFTWARE_GL=1` 使用浏览器软件 WebGL；结果仍须结合截图检查。

检查入口读取现有 `game-drive.json`、`layout-drive.json`、`mobile-drive.json`、`mobile-care-drive.json` 和 `record-drive.json`。这使升级后的视觉场景继续接受原四关规则、顺序约束、操作可达性和导出记录的检查。所有新截图写入 `hero-artifacts`，不覆盖旧截图。

新增 `hero-drive.json` 检查单个常驻渲染画布、相机拖动、键盘相机与关卡导航隔离、五个视角、工具分层、演示与试磨的实际姿态变化、暂停渲染、深色主题及软管连接。软管端点检查只在 `getStats().hose` 暴露四个世界坐标时执行，并在记录中明确覆盖状态。

输出 `hero-check-results.json` 和 `hero-check-record.md`。没有运行浏览器前，这两个文件不代表已完成验收。截图需要人工查看，自动检查不判定视觉风格是否合适。

实体检查入口：`node qa/hero-geometry.mjs`。扫描34个墙面偏移、退让、样片、拆解和软管状态；直接读取实际轮胎世界轴与TubeGeometry首尾环，检查轮轴水平、连接连续、连杆定长和10次换姿态的几何内存数量。随后生成8张双主题相机特写和4张最终整页图；明确记录为1×像素相机特写。

当前已完成的记录见 [完整8组浏览器回归](hero-check-record.md) 和 [最终实体、轮轴与特写记录](hero-geometry-record.md)。最终实体记录包含当前构建的SHA-256；数值结果保存于 `hero-geometry-results.json`。

最终气流新增的定向检查：`node qa/hero-flow-check.mjs`。实际修复并恢复作业后等待1.5秒，检查60个气流点移动、透明软管不遮挡气流，以及断电隔离后的淡出与停帧；结果见 `hero-flow-results.json`。统一浏览器记录明确区分最终定向重跑与保留的其余7组PASS。
