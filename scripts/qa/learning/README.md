> 历史学习流程 QA，保留原输入与动作脚本。当前两页已改为自由展厅，现行浏览器检查为 ../gallery-simple.cjs；本目录脚本不代表当前页面验收要求。

# 第一章任务学习 QA

学习主线的状态测试在 shared/workshop/learning.test.cjs。浏览器输入和动作脚本保留在本目录，不放入被忽略的产物目录。

- run-learning.mjs：真实浏览器控件流程。覆盖五项机械用途记录、缺少证据时拒绝保存、重新载入、本机记录、三种控制对照、恢复与确认不自动启动、形态迁移、主题与本地资源依赖。完整 27 项；精简 21 项。
- ego-regression.mjs：本轮 Ego 工作空间 3 的源码 HTTP、打包版 HTTP、打包版 file:// 回归入口。工具自动滚动不可见控件失败时，先通过 scrollIntoView 将控件带入视口，再执行真实点击和键盘。
- ego-export.mjs：真实下载课堂记录，并保存 QA 样例至 artifacts/reports/chapter1-learning/。
- feedback-flow.json、rebar-flow.json：三种控制方式与钢筋切断/弯曲的完整浏览器动作。
- feedback-mobile.json、rebar-mobile.json：390 像素、小屏滚动与键盘输入，配合 --reduced。
- feedback-no-webgl.json、rebar-no-webgl.json：禁用 WebGL 后保留相同教学流程，配合 --no-webgl --reduced。
- machinery-first.json：装置定位、实际动作、证据状态与页面全图。

JSON 由 anatomy 技能的 drive.mjs 在独立 Chromium 中运行，默认目标为本机 8873 端口下的任务入口。截图统一写 artifacts/screenshots/chapter1-learning/；报告写 artifacts/reports/chapter1-learning/。

Ego 的设备模拟和新文档监听在本机部分导航后会重置，不把它们作为跨页面手机证据。小屏、减少动画和无 WebGL 另由独立 Chromium 验证。capture.mjs 会聚焦场景并滚动长页面，因此本轮正式页面全图使用 drive.mjs 在 scrollTo(0,0) 后取得；保留 first 截图作为初次检查记录。

文字长度只用于阻止空白说明，不代表语义评价。浏览器测试确认记录标为待师生复核，不声明学生的文字解释自动正确。
