# 任务 1-3 · 认识施工机器人

[打开任务页](index.html) · [第一章封面](../../overview/index.html)

统一任务页外壳（与第二～八章相同）：页头本章任务 → 工位条 → 三维区 + 操作面板 + 试一试。

| 工位 | 展品（三维区上方切换） | 试一试 |
| --- | --- | --- |
| ① 机械臂与机械手 | 机械臂、机械手（Sharpa Wave） | 看机械臂逐关节巡游、找到末端法兰、机械手握拳、只伸出食指 |
| ② 会走会飞 | 机器狗、人形机器人、无人机 | 机器狗踏步、人形机器人挥手、转螺旋桨、把无人机展开看 |

- 三维区左上角：全景、俯视、展开结构、环绕；底部：播放预制动作、单步、复位、快慢和读数。
- 面板：当前展品的部件按钮、预制动作选择、机构滑杆、试一试；最底下一行是模型来源和许可。
- 动作是预制教学演示，弯曲百分比是课堂动作量，不代表实机控制、抓握或飞行性能。

展品配置在 `src/config.json`；工位编排在 `src/stations.js`、`src/stations.css`；三维展品和模型仍由 `shared/workshop/hero-gallery.js` 等原展厅脚本提供。
`src/lesson-models.js` 是保留的历史模型，只被 `shared/workshop/learning.test.cjs` 使用，页面不加载。
构建：`python scripts/build-workshops.py 1-3`，再 `python scripts/finalize-pages.py`。
模型来源与许可见 [shared/models/robots/sharpa-LICENSE.html](../../../../../shared/models/robots/sharpa-LICENSE.html) 等各展品许可。
