# Hero 展厅浏览器输入

动作输入、QA 脚本保留在本目录与相邻的 `hero-gallery.mjs`，不放入被忽略的产物目录。所有截图写入 artifacts/screenshots/hero-gallery/；报告写入 artifacts/reports/hero-gallery/。

- run-ego.mjs：Ego 中对源码 HTTP、打包版 HTTP、打包版 file:// 的交互回归；完整回归 43 项，file:// 精简回归 29 项。Ego 的原生窗口在本机降帧，因此此脚本在减少动画模式下检查实际输入和状态；普通动画另由 motion.json 在独立 Chromium 中验证。
- machines-views.json、robots-views.json：各展品、展开与两种主题的截图。
- closeups.json：铲斗和驾驶室 4 倍局部截图，两个主题。
- mobile.json：390 像素布局、展开、部件聚焦；用 --reduced。
- fallback.json：禁用 WebGL 后的单步、展开和实体投影；用 --no-webgl --reduced。
- motion.json：普通动画的慢速连续帧。
- transitions.json：真实鼠标拖动、键盘滑杆、播放与展开互斥、WebGL 上下文丢失后的恢复。
- offscreen.json：手机页面滚离三维工位后停止推进，回到工位后继续。

本轮使用 anatomy 技能中的 capture.mjs、drive.mjs 执行上述 JSON；目标为本地 8873 端口的当前任务入口，select 为 .workshop 或 #scene。运行前启动仓库 HTTP 服务，并先执行 npm run verify 生成打包版。

这里采用 Three.js 深度缓冲网格；Anatomy 的 SVG line-end 和 turn 审计不适用于它，不能把这些截图或状态测试称为完整机械碰撞验算。
