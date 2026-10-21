# 教学演示浏览器验收

最终验收记录见 [设计与验证](../设计与验证.md)。`*-final.json`、`4-1-live-depth.json`、`4-2-live-depth.json`、`4-3-independent-report.json`、`4-3-independent-camera-report.json`、`model-checks.json`、`import-stress.json` 和 `build-audit.txt` 是最终依据。早期失败截图与诊断报告保留作为修复记录。

本目录的 `verify.mjs` 使用已有 Playwright 驱动本机 Edge，无需安装依赖。Anatomy 原版 `capture.mjs` / `drive.mjs` 在此机通过 Edge 启动时，启动器提前退出，端口检测失败；本验证器使用 Playwright 管理浏览器，同时直接复用 Anatomy 原版 `LINE_ENDS` 算法。

已验证运行环境：

- Node：`C:\Users\maquefighting\AppData\Local\Programs\nodejs-v24.21.0\node-v24.21.0-win-x64\node.exe`
- Edge：`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`（155.0.4283.45）
- Playwright：`C:\Users\maquefighting\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright`
- Anatomy：`C:\Users\maquefighting\.agents\skills\anatomy`

在仓库根目录运行：

```powershell
node '04_感知与识别/教学演示/qa/verify.mjs' '04_感知与识别/教学演示/4-1.html' --out '04_感知与识别/教学演示/qa/4-1-desktop.png' --lines
node '04_感知与识别/教学演示/qa/verify.mjs' '04_感知与识别/教学演示/4-1.html' --out '04_感知与识别/教学演示/qa/4-1-phone.png' --width 390 --height 1000 --reduced --lines
```

截图默认截取 `.iso-plate`；使用 `--select body` 可截整页。`--scale 4` 用于 4 倍细节检查，`--no-webgl` 检查降级状态。每次运行会写同名 JSON，记录浏览器版本、读数、控制台、横向溢出、断言与线端检查；有错误时返回非零退出码。

交互序列用 `--actions actions.json`。支持：

```json
[
  ["click", "button"],
  ["range", "input[type=range]", 50],
  ["key", "ArrowRight", "[tabindex='0']"],
  ["move", ".iso-plate", 0.8, 0.5],
  ["drag", ".iso-plate", 0.3, 0.5, 0.8, 0.5, 20],
  ["wait", 500],
  ["eval", "document.querySelector('[data-readout]')?.textContent"],
  ["assert", "document.querySelectorAll('svg path').length > 40", "SVG 已生成"],
  ["until", "document.readyState === 'complete'", 10000],
  ["shot", "detail.png", ".iso-plate", [100, 100, 200, 200]],
  ["lines", "line-ends.png", ".iso-plate"]
]
```

环境自检已通过：Anatomy `dial-indicator-light.html` 在桌面与 390px 手机视口均无横向溢出、无控制台错误，原线端算法均返回 `line ends: 0 of 367 ends on 23 lines float`。键盘操作更新了表盘读数。`environment-*` 图片均已人工查看。
