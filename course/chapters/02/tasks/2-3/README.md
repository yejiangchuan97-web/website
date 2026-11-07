# 任务 2-3 · 工作机构与施工动作

入口 [index.html](index.html)。本任务只管“运动**变成了什么样**”：伸缩变转动、转动变直线；快慢和力的换算在 2-2。

- `#boom` 液压缸 · 动臂：液压缸推着动臂、连杆、从动臂（一组四杆机构）转动；推液压缸、找最难推的姿势、改杆长看轨迹。
- `#screw` 丝杠 · 升降台：先猜“转 5 圈升多高”再验证；让螺母跟着转；加偏心块看振动。

三维模型是原版 `mechanisms.html`（源：`src/`，构建：`build.cjs`，离线单文件写入 `artifacts/builds/2-3/`）。右侧面板在 `src/stations.js`。原版的四杆扩展页 `fourbar.html` 仍会生成，可从 `mechanisms.html` 单独打开，不再作为工位。

运行 `node scripts/build.mjs 2-3` 更新。计算校验：`node tests/physics.cjs`、`node tests/fourbar-math.cjs`、`node tests/fourbar-mechanics.cjs`。

模型范围：四杆为刚体、理想销轴、准静态受力；液压速度按流量与有效面积计算；丝杠为梯形螺纹与等效摩擦模型。不求解接触应力、油液流场或完整碰撞。Three.js 版权见 `shared/vendor/THREE-LICENSE.txt`。
