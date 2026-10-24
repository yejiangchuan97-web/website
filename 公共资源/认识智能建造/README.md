# 认识智能建造 · 共用导读模板

[第一章总览](../../第一章_走进智能建造/index.html) · [返回公共资源](../README.md)

`guide.html`、`guide.css`、`guide.js` 提供第一章共用的响应式阅读界面。内容分别保存在任务1-1、1-2、1-3的 `src/guide.json`。各任务 `src/build.mjs` 调用 `build-guide.mjs`，内嵌内容、样式与脚本生成任务根目录的 `index.html`。

当前功能为主题阅读、要点比较、思考提示和同章导航。每次加载默认深色，可切换浅色；不恢复上次浅色选择。键盘方向键、Home 与 End 可切换阅读主题。

构建：`node scripts/build.mjs 1`。打包：`python scripts/package-chapter1.py --output <输出目录>`。浏览器检查：`node scripts/check-chapter1.cjs`；可设置 `CHAPTER1_BROWSER=msedge` 使用已安装的 Edge。

原方案中的施工阶段切换、作业模式对照、反馈断线及设备动作等交互仍待制作。阅读导读与未来交互分别说明。
