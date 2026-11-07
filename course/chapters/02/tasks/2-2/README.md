# 任务 2-2 · 动力的传递与变换

入口 [index.html](index.html)。本任务只管“传过去以后，**变了多少**”：快慢、方向、力的大小；运动形式怎样改变留给 2-3。

- `#gear` 齿轮 · 皮带 · 链条：换传法、换大小比、换主动轮；挑战“输出只剩 1/3 / 比输入快 / 两轴同向 / 输出转矩超过 60 N·m”。
- `#hyd` 液压缸：拨换向阀、调流量和最高压力、加负载、换缸径。
- `#air` 气缸：同样的操作，看空气可压缩带来的“先憋气，再动”。

三维模型是原版机械动力实验室 `transmission.html`（源：`src/`，构建：`scripts/build.js`，离线单文件写入 `artifacts/builds/2-2/`）。右侧面板在 `src/stations.js`。

运行 `node scripts/build.mjs 2-2` 更新。模型物理测试：`node tests/model.test.js`。第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
