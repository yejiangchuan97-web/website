# 四关腻子打磨实训检查记录

日期：2026-10-22。对象：本次重构生成的 `index.html` 与深色主题；历史三实验的 `verify.mjs`、`final-check.mjs` 和截图未用作本次通过证据。

## 模型检查

执行 `node --test qa/game.test.mjs`：9 项通过，0 项失败。覆盖正常试磨、粗磨与细磨差异、重压／驻留不可逆损伤、磨损磨料、表面状态边界、全部控尘条件、正确养护链、错误顺序拦截和重复操作去重。

## 桌面交互

`qa/game-drive.json` 在 1440×810 下完成四关流程：

- 固定位置遇凸起增力，开启反馈退让后恢复目标附近，再记录对比。
- 粗砂留下明显砂痕，重压产生过磨损伤；未检查的原始试片提交被拦截，正常试磨与侧光检查后可以提交。驻留损伤及损伤不可逆另外由纯模型测试验证。
- 故障未排除不能恢复作业；未断电时拆检操作被拦截，隔离、处理并试运行后可恢复打磨。
- 错误的表面判读不会记为通过；未断电检查和跳过收余尘的收工操作被拦截。三个局部正确判读与七项养护操作完成后通过。
- 四关全部通过后打开总结；可切换深色主题。驱动结束 `console: clean`。

`qa/record-drive.json` 又核对了导出的 JSON：四关记录、完成状态和七项养护内容完整。键盘 Enter 可激活关卡页签，Escape 可关闭弹窗，最终重跑 `console: clean`。首次 Escape 驱动未关闭弹窗，补充显式键盘处理后通过；最终 `index.html` 与 `dark.html` 于本次 22:41 构建纳入该修复。

## 单屏布局与移动端

| 测试尺寸 | 动作与结果 |
| --- | --- |
| 1280×720 | `qa/layout-drive.json` 逐关检查四个控制面板，均为 `scrollHeight/clientHeight = 636/636`；页面无横向或纵向溢出，反馈区域未裁切 |
| 1920×1080 | 使用同一布局动作的临时副本逐关检查，四关面板均为 636/636；页面无溢出、反馈未裁切，控制台无错误 |
| 390×844 | `qa/mobile-drive.json` 在减少动态效果与禁用 WebGL 下通过前三关操作，完成两种粉尘故障恢复；控制面板为 646/646 |
| 390×844，第四关 | `qa/mobile-care-drive.json` 完成侧光、靠尺、三个局部判读、七步养护和提交；验收场景为 513/513，控制面板无溢出，控制台无错误 |

手机第四关初检发现样片区域网格错位，修复后重新执行完整第四关流程。最终场景、判读按钮、检查工具和收工操作均可到达。减少动态效果时恒力可单步观察，试磨直接显示结果；SVG 页面在禁用 WebGL 时仍可完成教学任务。

1920×1080 复核输出 `qa/layout-1920.png`。已打开读取该深色整页图：三个验收样片排列完整，全部判读按钮、侧光／靠尺、右侧七项养护动作、提交按钮和反馈框均在画幅内，页脚也完整可见。

## 动作与几何复核

本次代码复核发现并修正了两处运动问题：同点驻留现在同时固定磨盘的横向与纵向位置，仅保留旋转；法向退让到达限位且位置不再变化时停止请求动画帧，由下一次输入重新唤醒。

实体几何、七姿态、线端检查与 4×近景证据见 [Anatomy 几何与线端复核](audit-20261022.md)。最终模型为 64 个打磨台实体和 63 个集尘器实体；审计与线端检查均通过。集尘器为静态教学剖视，不表示设备允许敞盖运行，也不证明实际除尘性能。

## 复现方式

在本任务目录设置本地 Edge 路径，并用补丁保持 Anatomy 驱动的 CDP 连接：

```powershell
$env:CHROME_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:NODE_OPTIONS = '--require=./qa/windows-edge.cjs'
node 'C:\Users\Administrator\.codex\skills\anatomy\scripts\drive.mjs' index.html --actions qa/game-drive.json --width 1440 --height 810
node 'C:\Users\Administrator\.codex\skills\anatomy\scripts\drive.mjs' index.html --actions qa/layout-drive.json --width 1280 --height 720 --reduced
node 'C:\Users\Administrator\.codex\skills\anatomy\scripts\drive.mjs' index.html --actions qa/mobile-drive.json --width 390 --height 844 --reduced --no-webgl
node 'C:\Users\Administrator\.codex\skills\anatomy\scripts\drive.mjs' index.html --actions qa/mobile-care-drive.json --width 390 --height 844 --reduced --no-webgl
```

1920×1080 检查使用 `layout-drive.json` 内容，将截图路径改为 `qa/layout-1920.png` 后执行，避免覆盖 1280×720 的图。以上为教学网页功能与布局验证，不是实际打磨设备性能、粉尘浓度或工程质量验收。
