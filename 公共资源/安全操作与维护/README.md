# 安全操作与维护 · 共用导读模板

[第八章总览](../../第八章_安全操作与维护/index.html) · [返回公共资源](../README.md)

`guide.html`、`guide.css` 与 `guide.js` 提供四个任务共用的响应式阅读框架：主题选择、要点比较、思考提示、同章导航与主题切换。每个页面加载时以 HTML 的 `data-theme="dark"` 开始，不恢复上次浅色选择。

任务内容分别位于各任务的 `src/guide.json`。各任务 `src/build.mjs` 调用 `build-guide.mjs`，将内容、样式与脚本内嵌到任务根目录的 `index.html`，运行时不依赖本目录。原教学方案继续保留在各任务 README。

运行 `node scripts/build.mjs 8` 更新第八章入口与四份导读。运行 `python scripts/package-chapter8.py --output <输出目录>` 生成可离线使用的 `site` 文件夹与 ZIP。

浏览器检查：在安装 Playwright 的环境运行 `node scripts/check-chapter8.cjs`；离线包使用 `--site <site目录> --packaged`，可加 `--screenshots <目录>` 保存预览。可用 `CHAPTER8_BROWSER=msedge` 选择已安装的 Edge。

当前为阅读导读。新增内容时保留已实现的阅读功能与待制作的设备交互之间的明确区分。
