# 任务 2-1 · 动力装置的基本原理

入口 [index.html](index.html)，两个工位：

- `#motor` 直流电机：调电压、负载、接线方向；挑战“反着转 / 飙到 3000 转 / 把它憋停 / 亲手装一台”。“亲手装一台”在同一台电机上进入原版的组装与接线模式：装零件 → 接线 → 猜转向 → 通电。
- `#diesel` 柴油机：转曲轴、定位冲程、拆开、换四缸、装进挖掘机。

三维模型都是原版：`motor.html`（源：`src/motor.html` + `assets/`）、`diesel.html`（源：`diesel-source/`）。任务页只在 `src/stations.js` 里写右侧面板，通过 `shared/动力与工作机构/embed-bridge.js` 驱动原模型。

运行 `node scripts/build.mjs 2-1`：先用 `build.cjs` 生成两个原版实验页，再生成 `index.html`。
